import { api } from './client';

const PROFILE = '/customer-portal/profile';
const STORAGE = '/customer-portal/storage';
const AUTOPAY = '/customer-portal/autopay';

// ── Complete your profile ───────────────────────────────────────────────────
export type ChecklistRoute = 'phone' | 'whatsapp' | 'email' | 'identity' | 'access' | 'details';
export type ChecklistItem = { key: string; title: string; hint: string; done: boolean; route: ChecklistRoute };
export type ProfileSnapshot = {
  customer: {
    id: string; fullName: string; phone: string; email: string; emailVerified: boolean; phoneVerified: boolean;
    whatsapp: { sameAsPhone: boolean; phone: string; optedIn: boolean };
    emergencyNumber: string; nationality: string; address: string;
  };
  checklist: { items: ChecklistItem[]; done: number; total: number; percent: number };
};

export const profileApi = {
  get: () => api<ProfileSnapshot>(PROFILE),
  emailRequest: (email: string) => api<{ ok: boolean; code?: string }>(`${PROFILE}/email/request`, { body: { email } }),
  emailVerify: (email: string, code: string) => api<ProfileSnapshot>(`${PROFILE}/email/verify`, { body: { email, code } }),
  whatsappSame: () => api<ProfileSnapshot>(`${PROFILE}/whatsapp/same`, { body: {} }),
  whatsappRequest: (phone: string) => api<{ ok: boolean; code?: string }>(`${PROFILE}/whatsapp/request`, { body: { phone } }),
  whatsappVerify: (phone: string, code: string) => api<ProfileSnapshot>(`${PROFILE}/whatsapp/verify`, { body: { phone, code } }),
  details: (body: { emergencyNumber?: string; nationality?: string; address?: string }) => api<ProfileSnapshot>(`${PROFILE}/details`, { method: 'PATCH', body }),
};

// ── People who can access a unit ────────────────────────────────────────────
export type AccessPerson = { index: number; name: string; phone: string; relation: string; idType: string; idNumber: string };
export type AccessList = { contractNo: string; max: number; people: AccessPerson[] };

export const accessApi = {
  list: (contractId: string) => api<AccessList>(`${STORAGE}/contracts/${contractId}/access`),
  add: (contractId: string, body: { name: string; phone: string; relation?: string }) => api<AccessList>(`${STORAGE}/contracts/${contractId}/access`, { body }),
  remove: (contractId: string, index: number) => api<AccessList>(`${STORAGE}/contracts/${contractId}/access/${index}`, { method: 'DELETE' }),
};

// ── Files (ID documents and what the office filed) ──────────────────────────
export type FileItem = { id: string; type: string; side: string; name: string; createdAt: string; source: 'you' | 'office'; mime: string; contractNo?: string; href: string };
export type FilesList = { complete: boolean; storedIn: string; documents: FileItem[] };
export const filesApi = { list: () => api<FilesList>(`${STORAGE}/identity`) };

// ── Saved card and auto-pay ─────────────────────────────────────────────────
export type AutopayState = {
  available: boolean; card: { brand: string; last4: string; expMonth: number | null; expYear: number | null } | null;
  enabled: boolean; consentText: string; consentAt: string | null; failureCount: number; stopped: boolean; lastFailureReason: string;
};
export const autopayApi = {
  get: () => api<AutopayState>(AUTOPAY),
  setup: (enable: boolean) => api<{ clientSecret?: string; publishableKey?: string; url?: string }>(`${AUTOPAY}/setup`, { body: { embedded: true, enable } }),
  set: (enabled: boolean, consent = false) => api<AutopayState>(AUTOPAY, { method: 'PATCH', body: { enabled, consent } }),
  removeCard: () => api<AutopayState>(`${AUTOPAY}/card`, { method: 'DELETE' }),
};
