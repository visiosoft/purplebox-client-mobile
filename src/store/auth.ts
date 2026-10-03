import { create } from 'zustand';
import { api, loadToken, saveToken, setUnauthorizedHandler } from '@/api/client';

export type Customer = { id: string; fullName: string; phone: string; email?: string };

type AuthState = {
  customer: Customer | null;
  ready: boolean;
  bootstrap: () => Promise<void>;
  requestOtp: (phone: string) => Promise<string | undefined>;
  verifyOtp: (phone: string, code: string, fullName?: string) => Promise<{ isNew: boolean }>;
  logout: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  customer: null,
  ready: false,
  bootstrap: async () => {
    setUnauthorizedHandler(() => { saveToken(null); set({ customer: null }); });
    const t = await loadToken();
    if (t) {
      try {
        const { customer } = await api('/customer-auth/me');
        set({ customer });
      } catch { await saveToken(null); }
    }
    set({ ready: true });
  },
  // Only a non-production server returns `code`; it lets a test build log in without a WhatsApp template.
  requestOtp: async (phone) => (await api<{ code?: string }>('/customer-auth/request-otp', { body: { phone } })).code,
  verifyOtp: async (phone, code, fullName) => {
    const r = await api('/customer-auth/verify-otp', { body: { phone, code, fullName } });
    await saveToken(r.token);
    set({ customer: r.customer });
    return { isNew: !!r.isNew };
  },
  logout: async () => { await saveToken(null); set({ customer: null }); },
}));
