import { create } from 'zustand';
import { useRequests } from '@/store/requests';
import { forgetPushToken, syncBookingReminders } from '@/lib/reminders';
import { useLock } from '@/store/lock';
import { api, loadToken, saveToken, setUnauthorizedHandler } from '@/api/client';

export type Customer = { id: string; fullName: string; phone: string; email?: string };

/** A brand-new account has no real name yet (the server stores the phone number in its place). */
export const needsProfile = (c: Customer | null) => !!c && (!c.fullName?.trim() || /^[+\d\s()-]+$/.test(c.fullName));

// Servers before email login read only `phone`; newer ones read `identifier` first.
const contactBody = (identifier: string) => (identifier.includes('@') ? { identifier } : { identifier, phone: identifier });

export type OtpSent = { channel: 'phone' | 'email'; sentTo?: string; code?: string };

type AuthState = {
  customer: Customer | null;
  ready: boolean;
  bootstrap: () => Promise<void>;
  /** `identifier` is a mobile in E.164 or an email; the server finds the account on either. */
  requestOtp: (identifier: string) => Promise<OtpSent>;
  verifyOtp: (identifier: string, code: string, fullName?: string) => Promise<{ isNew: boolean }>;
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
        // A login that landed on an empty record comes back moved onto the
        // customer renting on that number, with a token for it.
        const { customer, token } = await api('/customer-auth/me');
        if (token) await saveToken(token);
        set({ customer });
      } catch { await saveToken(null); }
    }
    set({ ready: true });
  },
  // Only a non-production server returns `code`; it lets a test build log in without a WhatsApp template.
  requestOtp: (identifier) => api<OtpSent>('/customer-auth/request-otp', { body: contactBody(identifier) }),
  verifyOtp: async (identifier, code, fullName) => {
    const r = await api('/customer-auth/verify-otp', { body: { ...contactBody(identifier), code, fullName } });
    await saveToken(r.token);
    set({ customer: r.customer });
    return { isNew: !!r.isNew };
  },
  logout: async () => { await forgetPushToken(); await saveToken(null); useRequests.getState().clear(); syncBookingReminders(null, { enabled: false }); useLock.getState().unlock(); set({ customer: null }); },
}));
