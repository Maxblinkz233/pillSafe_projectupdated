import {Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getApiConfig} from './config';
import {api} from './api';

const SEEN_KEY = 'pillsafe_seen_reminder_ids';
const POLL_MS = 15000;

async function loadSeenIds() {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

async function saveSeenIds(ids) {
  const list = Array.from(ids).slice(-200);
  await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(list));
}

/**
 * Poll hub notifications for REMINDER events and surface an Alert on the phone
 * when medication time is up. Returns a stop() function.
 */
export function startReminderPoller({onReminder, navigationRef} = {}) {
  let stopped = false;
  let timer = null;
  let alerting = false;

  const tick = async () => {
    if (stopped || alerting) return;
    try {
      const cfg = await getApiConfig();
      if (!cfg?.userId || !cfg?.baseUrl) return;

      const notifications = await api.getNotifications(cfg.userId, true);
      const reminders = (notifications || []).filter(n => n.type === 'REMINDER');
      if (!reminders.length) return;

      const seen = await loadSeenIds();
      const fresh = reminders.filter(
        n => !seen.has(String(n.notification_id)),
      );
      if (!fresh.length) return;

      const newest = fresh[0];
      seen.add(String(newest.notification_id));
      await saveSeenIds(seen);

      alerting = true;
      const message =
        newest.message || 'It is time to take your medication.';
      if (typeof onReminder === 'function') {
        onReminder(newest);
      }
      Alert.alert(
        'Medication Reminder',
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
                navigationRef?.current?.navigate?.('Verify');
              } catch {
                // Navigation may not be ready
              }
            },
          },
        ],
        {cancelable: true, onDismiss: () => { alerting = false; }},
      );
    } catch {
      // Hub offline — ignore until next poll
    }
  };

  tick();
  timer = setInterval(tick, POLL_MS);

  return () => {
    stopped = true;
    if (timer) clearInterval(timer);
  };
}
