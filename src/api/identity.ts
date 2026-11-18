import { api, upload } from './client';

// Server routes assumed: GET returns what is on file, POST takes one photo per side/page.
const BASE = '/customer-portal/storage/identity';

export type IdType = 'emirates_id' | 'passport';
export type Slot = { type: IdType; side: 'front' | 'back' | 'page'; label: string };
export const SLOTS: Record<IdType, Slot[]> = {
  emirates_id: [
    { type: 'emirates_id', side: 'front', label: 'Front of Emirates ID' },
    { type: 'emirates_id', side: 'back', label: 'Back of Emirates ID' },
  ],
  passport: [{ type: 'passport', side: 'page', label: 'Passport photo page' }],
};
export const slotKey = (s: Pick<Slot, 'type' | 'side'>) => `${s.type}:${s.side}`;

export type IdentityStatus = { documents: { type: IdType; side: Slot['side']; status?: 'pending' | 'approved' | 'rejected' }[] };

/** Complete = both sides of an Emirates ID, or the passport page. */
export const isComplete = (keys: Set<string>) => SLOTS.emirates_id.every((s) => keys.has(slotKey(s))) || SLOTS.passport.every((s) => keys.has(slotKey(s)));

export const identityApi = {
  status: () => api<IdentityStatus>(BASE),
  send: (slot: Slot, file: { uri: string; mimeType?: string }) =>
    upload(BASE, { type: slot.type, side: slot.side }, { uri: file.uri, name: `${slot.type}-${slot.side}.jpg`, type: file.mimeType ?? 'image/jpeg' }),
};
