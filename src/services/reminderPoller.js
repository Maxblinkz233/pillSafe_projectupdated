import {Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getApiConfig} from './config';
import {api} from './api';
import {sendAfricasTalkingSms} from './africasTalkingSms';
import {
  AFRICAS_TALKING,
  isAfricasTalkingConfigured,
} from '../config/africasTalking';

const SEEN_REMINDER_KEY = 'pillsafe_seen_reminder_ids';
const SEEN_PHONE_SMS_KEY = 'pillsafe_seen_phone_sms_ids';
const POLL_MS = 2500;
const PENDING_PHONE_SMS = 'PENDING_PHONE_SMS';

async function loadIdSet(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

async function saveIdSet(key, ids) {
  const list = Array.from(ids).slice(-200);
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

function parsePendingPayload(message) {
  try {
    const data = JSON.parse(message);
    if (data && typeof data === 'object' && data.to && data.body) {
      return data;
    }
  } catch {
    // ignore non-JSON
  }
  return null;
}

async function processPendingPhoneSms(notifications) {
  const pending = (notifications || []).filter(
    n =>
      String(n.type || '').toUpperCase() === PENDING_PHONE_SMS &&
      !Number(n.is_read),
  );
  if (!pending.length) return;

  const seen = await loadIdSet(SEEN_PHONE_SMS_KEY);
  for (const n of pending) {
    const id = String(n.notification_id);
    if (seen.has(id)) continue;

    const payload = parsePendingPayload(n.message);
    if (!payload) {
      seen.add(id);
      await saveIdSet(SEEN_PHONE_SMS_KEY, seen);
      continue;
    }

    if (!isAfricasTalkingConfigured()) {
      console.warn(
        '[PillSafe] PENDING_PHONE_SMS skipped — set AFRICAS_TALKING in src/config/africasTalking.js',
      );
      return;
    }

    const result = await sendAfricasTalkingSms({
      username: AFRICAS_TALKING.username,
      apiKey: AFRICAS_TALKING.apiKey,
      to: payload.to,
      message: payload.body,
      senderId: AFRICAS_TALKING.senderId || undefined,
      sandbox: AFRICAS_TALKING.sandbox !== false,
    });

    seen.add(id);
    await saveIdSet(SEEN_PHONE_SMS_KEY, seen);

    if (result.ok) {
      try {
        await api.markNotificationRead(n.notification_id);
      } catch (err) {
        console.warn('[PillSafe] markNotificationRead failed:', err?.message);
      }
      console.info('[PillSafe] Caregiver SMS sent via Africa’s Talking to', payload.to);
    } else {
      // Silent for end users — service-side failure; log for developers
      console.warn(
        '[PillSafe] Africa’s Talking SMS failed:',
        result.error || 'unknown',
      );
    }
  }
}

/**
 * Poll hub notifications for REMINDER events and PENDING_PHONE_SMS
 * (hub AT+GSM failed → Africa’s Talking from this phone).
 */
export function startReminderPoller({onReminder, navigationRef} = {}) {
  let stopped = false;
  let timer = null;
  let alerting = false;

  const tick = async () => {
    if (stopped || alerting) return;
    try {
      const cfg = await getApiConfig();
      if (!cfg?.userId || !cfg?.baseUrl) {
        return;
      }

      const notifications = await api.getNotifications(cfg.userId, false);

      // GSM-failed SMS → send from phone via baked-in Africa's Talking service
      await processPendingPhoneSms(notifications);

      const reminders = (notifications || []).filter(
        n => String(n.type || '').toUpperCase() === 'REMINDER',
      );
      if (!reminders.length) return;

      const seen = await loadIdSet(SEEN_REMINDER_KEY);
      const fresh = reminders.filter(
        n => !seen.has(String(n.notification_id)),
      );
      if (!fresh.length) return;

      const newest = fresh[0];
      seen.add(String(newest.notification_id));
      await saveIdSet(SEEN_REMINDER_KEY, seen);

      alerting = true;
      const message =
        newest.message ||
        'Time is up to take your medicine. Open Verify Now when you are ready.';
      if (typeof onReminder === 'function') {
        onReminder(newest);
      }
      Alert.alert(
        'Time Is Up',
        message,
        [
          {
            text: 'Later',
            style: 'cancel',
            onPress: () => {
              alerting = false;
            },
          },
          {
            text: 'Verify Now',
            onPress: () => {
              alerting = false;
              try {
                navigationRef?.current?.navigate?.('MainApp', {
                  screen: 'Verify',
                });
              } catch {
                // Navigation may not be ready
              }
            },
          },
        ],
        {cancelable: true, onDismiss: () => { alerting = false; }},
      );
    } catch (err) {
      console.warn(
        '[PillSafe] Reminder poll failed:',
        err?.message || String(err),
      );
    }
  };

  tick();
  timer = setInterval(tick, POLL_MS);

  return () => {
    stopped = true;
    if (timer) clearInterval(timer);
  };
}
