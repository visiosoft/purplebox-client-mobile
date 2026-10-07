import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bookingApi } from '@/api/booking';
import { configureNotifications, registerPushToken, syncBookingReminders } from '@/lib/reminders';
import { usePrefs } from '@/store/prefs';
import { useNotificationTap } from '@/hooks/useNotificationTap';

configureNotifications();

/** Mount once while signed in: keeps reminders in step with the pending booking (a tapped reminder is handled by useNotificationTap). */
export function useBookingReminders(signedIn: boolean) {
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

  useNotificationTap(signedIn);
}
