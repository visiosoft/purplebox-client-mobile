import { create } from 'zustand';
import type { Term } from '@/api/booking';
import { isoDay } from '@/lib/format';

/** The booking being put together across the size, date and summary steps. */
type Draft = {
  sizeSqf: number | null;
  /** Move-in day, YYYY-MM-DD local. */
  startDate: string;
  months: Term;
  /** Set once the unit is held on the server. */
  bookingId: string | null;
  set: (p: Partial<Omit<Draft, 'set' | 'reset'>>) => void;
  reset: () => void;
};

const fresh = () => ({ sizeSqf: null, startDate: isoDay(new Date()), months: 1 as Term, bookingId: null });

export const useBookingDraft = create<Draft>((set) => ({
  ...fresh(),
  // Any change to what is being booked lets go of the old hold reference.
  set: (p) => set((s) => ({ ...p, bookingId: 'bookingId' in p ? p.bookingId ?? null : (p.sizeSqf !== undefined || p.startDate !== undefined || p.months !== undefined) ? null : s.bookingId })),
  reset: () => set(fresh()),
}));
