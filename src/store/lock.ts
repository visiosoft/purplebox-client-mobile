import { create } from 'zustand';

// Whether the app is covered by the lock screen, when the owner last proved it was them, and whether a Face ID / fingerprint
// prompt is open right now (the system prompt can briefly background the app; that must not count as "left the app").
type LockState = {
  locked: boolean;
  busy: boolean;
  lastAuthAt: number;
  lock: () => void;
  unlock: () => void;
  setBusy: (v: boolean) => void;
};

export const useLock = create<LockState>((set) => ({
  locked: false,
  busy: false,
  lastAuthAt: 0,
  lock: () => set({ locked: true }),
  unlock: () => set({ locked: false, lastAuthAt: Date.now() }),
  setBusy: (busy) => set({ busy }),
}));
