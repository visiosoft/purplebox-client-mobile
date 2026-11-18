import { api } from './client';

export const accountApi = {
  requestDeletionCode: () => api<{ sentTo: string; code?: string }>('/customer-auth/account/deletion-code', { body: {} }),
  delete: (code: string) => api<{ status: 'requested'; requestId: string }>('/customer-auth/account', { method: 'DELETE', body: { code } }),
};
