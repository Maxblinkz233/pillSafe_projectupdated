import {Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getApiConfig} from './config';
import {api} from './api';

const SEEN_KEY = 'pillsafe_seen_reminder_ids';
const POLL_MS = 2500;

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
 * Poll hub notifications for REMINDER events and alert the phone when
 * medication time is up. Returns a stop() function.
 *
 * Uses local "seen" ids (not is_read) so Alerts "mark all read" cannot
 * hide a dose-due popup before it is shown.
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

      // Fetch recent notifications (read or unread) and filter locally.
      const notifications = await api.getNotifications(cfg.userId, false);
      const reminders = (notifications || []).filter(
        n => String(n.type || '').toUpperCase() === 'REMINDER',
      );
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
                // Verify lives in the MainApp tab navigator (nested under the root stack).
                navigationRef?.current?.navigate?.('MainApp', {screen: 'Verify'});
              } catch {
                // Navigation may not be ready
              }
            },
          },
        ],
        {cancelable: true, onDismiss: () => { alerting = false; }},
      );
    } catch (err) {
      // Keep quiet in production UI, but leave a console trail for debugging.
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
