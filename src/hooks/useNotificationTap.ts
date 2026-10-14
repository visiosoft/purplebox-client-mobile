import { useEffect } from 'react';
import { useRouter, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notifications';

/**
 * Tapping a notification opens what it is about. Booking reminders carry a
 * bookingId; what the server pushes carries a route in this app (and its
 * inbox id, so the tap also marks it read).
 */
export function useNotificationTap(signedIn: boolean) {
  const router = useRouter();
  const qc = useQueryClient();
  const last = Notifications.useLastNotificationResponse();
  const tappedId = last?.notification.request.identifier;
  const data = last?.notification.request.content.data as
    { bookingId?: unknown; route?: unknown; params?: unknown; notificationId?: unknown } | undefined;
  useEffect(() => {
    if (!signedIn || !tappedId || !data) return;
    if (typeof data.bookingId === 'string') {
      router.push({ pathname: '/book/status', params: { id: data.bookingId } });
      return;
    }
    if (typeof data.notificationId === 'string') {
      notificationsApi.read([data.notificationId]).then(() => qc.invalidateQueries({ queryKey: ['notifications'] })).catch(() => {});
    }
    if (typeof data.route === 'string') {
      const params = data.params && typeof data.params === 'object' ? (data.params as Record<string, string>) : undefined;
      router.push((params ? { pathname: data.route, params } : data.route) as Href);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- act once per tapped notification, not on every data object
  }, [signedIn, tappedId]);
}
