import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

/** Tapping a reminder (or a push from the server carrying a bookingId) opens that booking, whatever state it is now in. */
export function useNotificationTap(signedIn: boolean) {
  const router = useRouter();
  const last = Notifications.useLastNotificationResponse();
  const tappedId = last?.notification.request.identifier;
  const bookingId = last?.notification.request.content.data?.bookingId;
  useEffect(() => {
    if (signedIn && tappedId && typeof bookingId === 'string') router.push({ pathname: '/book/status', params: { id: bookingId } });
  }, [signedIn, tappedId, bookingId, router]);
}
