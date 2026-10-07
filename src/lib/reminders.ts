import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api } from '@/api/client';
import { secure } from '@/lib/secure';
import { REMINDER_COUNT, ReminderBooking, planReminders, reminderCopy } from '@/lib/reminderPlan';

const CHANNEL = 'booking';
const PLAN_KEY = 'pb_reminder_plan';
const idFor = (bookingId: string, n: number) => `pb-booking-${bookingId}-${n}`;
const supported = Platform.OS !== 'web';

type Plan = { bookingId: string; times: number[] };

/** Show reminders as a banner even while the app is open. */
export function configureNotifications() {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Booking reminders', importance: Notifications.AndroidImportance.DEFAULT, lightColor: '#5B2BC9',
    }).catch(() => {});
  }
}

async function ensurePermission(ask: boolean) {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!ask || !cur.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

const readPlan = async (): Promise<Plan | null> => {
  try { const raw = await secure.get(PLAN_KEY); return raw ? (JSON.parse(raw) as Plan) : null; } catch { return null; }
};

async function cancelPlan(plan: Plan | null) {
  if (!plan) return;
  await Promise.all(plan.times.map((_, n) => Notifications.cancelScheduledNotificationAsync(idFor(plan.bookingId, n)).catch(() => {})));
}

/**
 * Keeps at most three reminders scheduled for the customer's unfinished booking, and none once it is done.
 * The three times are fixed the first time we see a booking, so the number never grows when its state changes.
 * Pass null when there is nothing pending. `ask` lets this show the system permission prompt.
 */
export async function syncBookingReminders(booking: (ReminderBooking & { quoteNo: string }) | null, opts: { enabled: boolean; ask?: boolean }) {
  if (!supported) return;
  try {
    let plan = await readPlan();
    const pending = booking && ['held', 'ready_to_sign', 'expired'].includes(booking.state) ? booking : null;
    if (!pending || !opts.enabled) {
      await cancelPlan(plan);
      await secure.remove(PLAN_KEY);
      return;
    }
    if (!(await ensurePermission(!!opts.ask))) return;
    if (plan && plan.bookingId !== pending.bookingId) { await cancelPlan(plan); plan = null; }
    if (!plan) {
      plan = { bookingId: pending.bookingId, times: planReminders(new Date()).slice(0, REMINDER_COUNT).map((d) => d.getTime()) };
      await secure.set(PLAN_KEY, JSON.stringify(plan));
    }
    // (Re)schedule the ones still in the future with the booking's current wording. Same ids replace, never add.
    await Promise.all(plan.times.map(async (t, n) => {
      const id = idFor(plan!.bookingId, n);
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      if (t <= Date.now() + 30_000) return;
      const { title, body } = reminderCopy(pending, n);
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: { title, body, data: { bookingId: pending.bookingId, kind: 'booking-reminder' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(t), channelId: CHANNEL },
      });
    }));
  } catch {
    // reminders are a nicety; never break the app over them
  }
}

/** Sends this phone's push token to the server so it can also push (needs the server route and an EAS project id). */
export async function registerPushToken() {
  if (!supported || !Device.isDevice) return;
  try {
    if (!(await ensurePermission(false))) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api('/customer-auth/push-token', { body: { token: data, platform: Platform.OS } });
  } catch {
    // optional until the server supports it
  }
}
