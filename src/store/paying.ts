import { create } from 'zustand';

// After Stripe takes a payment, the invoice only clears once the webhook reaches the server and Zoho syncs, which can
// take longer than our refetch. Until then the invoice still looks unpaid, so remember it here and don't offer Pay again.
const HOLD_MS = 10 * 60 * 1000;

type Paying = { paid: Record<string, true>; markPaid: (payId: string) => void };

export const usePaying = create<Paying>((set) => ({
  paid: {},
  markPaid: (payId) => {
    set((s) => ({ paid: { ...s.paid, [payId]: true } }));
    setTimeout(() => set((s) => { const { [payId]: _, ...rest } = s.paid; return { paid: rest }; }), HOLD_MS);
  },
}));
