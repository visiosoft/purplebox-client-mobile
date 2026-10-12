import { api } from './client';

/** What is being paid: an invoice (Payments tab) or a booking that has been reserved (Review & pay). */
export type PayTarget = { kind: 'invoice' | 'booking'; id: string };

const base = (t: PayTarget) => (t.kind === 'invoice' ? `/customer-portal/storage/invoices/${t.id}` : `/customer-portal/booking/${t.id}`);

/** Everything Stripe's in-app payment sheet needs. The server creates the PaymentIntent. */
export type SheetParams = {
  paymentIntentClientSecret: string;
  publishableKey: string;
  merchantDisplayName?: string;
  customerId?: string;
  customerEphemeralKeySecret?: string;
};

export const payApi = {
  // Needs a server route that creates a PaymentIntent (see the note in payInApp).
  sheet: (t: PayTarget) => api<SheetParams>(`${base(t)}/pay-sheet`, { method: 'POST', body: {} }),
  // Stripe's card form shown inside the app: the server's `embedded` mode returns a clientSecret + publishable key
  // (or, if embedded isn't configured there, the hosted `url` instead).
  embedded: (t: PayTarget) => api<{ clientSecret?: string; publishableKey?: string; url?: string }>(`${base(t)}/pay`, { method: 'POST', body: { embedded: true } }),
  // The hosted Stripe Checkout page the server already supports.
  hostedUrl: (t: PayTarget) => api<{ url: string }>(`${base(t)}/pay`, { method: 'POST', body: {} }).then((r) => r.url),
};
