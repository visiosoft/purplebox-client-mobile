import { create } from 'zustand';

/**
 * Where the welcome screen's choice leads after sign-in: "Get started" goes to Home,
 * "I already rent with you" goes on to link the unit.
 */
export const useOnboarding = create<{
  intent: 'new' | 'existing';
  /** UAE mobile digits after +971. */
  phone: string;
  set: (p: Partial<{ intent: 'new' | 'existing'; phone: string }>) => void;
}>((set) => ({
  intent: 'new',
  phone: '',
  set: (p) => set(p),
}));
