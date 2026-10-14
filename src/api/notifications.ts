import { api } from './client';

export type NotificationKind = 'payment' | 'renewal' | 'promotion' | 'inspection' | 'service';
/** `route` is an expo-router path in this app, opened when the notification is tapped. */
export type NotificationData = { route?: string; params?: Record<string, string> };
export type AppNotification = {
  id: string; kind: NotificationKind; title: string; body: string; data: NotificationData; read: boolean; createdAt: string;
};

const BASE = '/customer-portal/storage';

export const notificationsApi = {
  list: () => api<{ items: AppNotification[]; unread: number }>(`${BASE}/notifications`),
  read: (ids: string[]) => api<{ unread: number }>(`${BASE}/notifications/read`, { body: { ids } }),
  readAll: () => api<{ unread: number }>(`${BASE}/notifications/read`, { body: { all: true } }),
  prefs: () => api<{ promotions: boolean }>(`${BASE}/notification-prefs`),
  setPrefs: (promotions: boolean) => api<{ promotions: boolean }>(`${BASE}/notification-prefs`, { method: 'PATCH', body: { promotions } }),
  forgetDevice: (token: string) => api('/customer-auth/push-token', { method: 'DELETE', body: { token } }),
};
