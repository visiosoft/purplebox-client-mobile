import { api } from './client';

/** "Keep my card for next time", and separately "charge it automatically" (only ever on the customer's explicit choice). */
export type SaveCard = { saveCard?: boolean; autopayConsent?: boolean };

/** What is being paid: an invoice (Payments tab), a booking that has been reserved (Review & pay), or a delivery request. */
export type PayTarget = { kind: 'invoice' | 'booking' | 'service'; id: string };

const BASES: Record<PayTarget['kind'], string> = {
  invoice: '/customer-portal/storage/invoices', booking: '/customer-portal/booking', service: '/customer-portal/storage/services',
};
const base = (t: PayTarget) => `${BASES[t.kind]}/${t.id}`;

/** Everything Stripe's in-app payment sheet needs. The server creates the PaymentIntent. */
export type SheetParams = {
  paymentIntentClientSecret: string;
  publishableKey: string;
  merchantDisplayName?: string;
  customerId?: string;
  customerEphemeralKeySecret?: string;
  /** Newer way to let the sheet show saved cards; preferred when present. */
  customerSessionClientSecret?: string;
};

export const payApi = {
  // Needs a server route that creates a PaymentIntent (see the note in payInApp).
  sheet: (t: PayTarget, save?: SaveCard) => api<SheetParams>(`${base(t)}/pay-sheet`, { method: 'POST', body: save?.saveCard ? { saveCard: true, autopayConsent: !!save.autopayConsent } : {} }),
  // Stripe's card form shown inside the app: the server's `embedded` mode returns a clientSecret + publishable key
  // (or, if embedded isn't configured there, the hosted `url` instead).
  embedded: (t: PayTarget, save?: SaveCard) => api<{ clientSecret?: string; publishableKey?: string; url?: string }>(`${base(t)}/pay`, { method: 'POST', body: { embedded: true, ...(save?.saveCard ? { saveCard: true, autopayConsent: !!save.autopayConsent } : {}) } }),
  // The hosted Stripe Checkout page the server already supports.
  hostedUrl: (t: PayTarget) => api<{ url: string }>(`${base(t)}/pay`, { method: 'POST', body: {} }).then((r) => r.url),
};
