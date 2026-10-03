import { api } from './client';

const BASE = '/customer-portal/booking';

export type Size = { sizeSqf: number; available: number; monthlyRate: number; discountPct: number; payToday: number };
export type Pricing = { lines: { label: string; amount: number }[]; total: number; cardFee: number; totalWithFee: number; dueDate: string };
export type BookingState = 'held' | 'confirming' | 'ready_to_sign' | 'active' | 'needs_review' | 'expired';
export type Booking = {
  bookingId: string; quoteNo: string; state: BookingState; holdExpiresAt: string;
  contractId?: string; contractNo?: string; message?: string;
  unit: { unitNumber: string; sizeSqf: number; floor?: string; startDate: string; endDate: string; monthlyRate: number; discountPct: number };
  pricing: Pricing;
};

export const TERMS = [1, 3, 6, 12] as const;
export type Term = (typeof TERMS)[number];

export const bookingApi = {
  sizes: (startDate: string, months: Term) => api<Size[]>(`${BASE}/sizes?startDate=${startDate}&months=${months}`),
  reserve: (body: { sizeSqf: number; startDate: string; months: Term }) => api<Booking>(`${BASE}/reserve`, { body }),
  get: (id: string) => api<Booking>(`${BASE}/${id}`),
  current: () => api<Booking | null>(`${BASE}/current`),
  pay: (id: string) => api<{ url: string }>(`${BASE}/${id}/pay`, { method: 'POST', body: {} }),
  sign: (id: string, signerName: string) => api<{ ok: boolean; contractNo: string }>(`${BASE}/${id}/sign`, { body: { signerName, signMode: 'typed' } }),
  contractHref: (id: string) => `${BASE}/${id}/contract.pdf`,
  updateProfile: (body: { fullName: string; email: string }) =>
    api<{ customer: { id: string; fullName: string; phone: string; email?: string } }>('/customer-auth/profile', { method: 'PATCH', body }),
};
