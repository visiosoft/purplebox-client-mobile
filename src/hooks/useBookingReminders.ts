import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useQuery } from '@tanstack/react-query';
import { bookingApi } from '@/api/booking';
import { configureNotifications, registerPushToken, syncBookingReminders } from '@/lib/reminders';
import { usePrefs } from '@/store/prefs';

configureNotifications();

/** Mount once while signed in: keeps reminders in step with the pending booking and opens it when one is tapped. */
export function useBookingReminders(signedIn: boolean) {
  const router = useRouter();
  const enabled = usePrefs((s) => s.reminders);
  const pending = useQuery({ queryKey: ['booking-current'], queryFn: bookingApi.current, enabled: signedIn });
  const loaded = pending.isSuccess;
  const b = pending.data;

  useEffect(() => {
    if (!signedIn || !loaded) return;
    syncBookingReminders(
      b ? { bookingId: b.bookingId, quoteNo: b.quoteNo, state: b.state, unitNumber: b.unit.unitNumber, sizeSqf: b.unit.sizeSqf } : null,
      { enabled },
    );
  }, [signedIn, loaded, b, enabled]);

  useEffect(() => { if (signedIn) registerPushToken(); }, [signedIn]);

  // Tapping a reminder (or a push from the server carrying a bookingId) opens that booking, whatever state it is now in.
  const last = Notifications.useLastNotificationResponse();
  const tappedId = last?.notification.request.identifier;
  const bookingId = last?.notification.request.content.data?.bookingId;
  useEffect(() => {
    if (signedIn && tappedId && typeof bookingId === 'string') router.push({ pathname: '/book/status', params: { id: bookingId } });
  }, [signedIn, tappedId, bookingId, router]);
}
