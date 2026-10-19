import { router } from 'expo-router';

/** What app/pay.tsx shows: Stripe's embedded form (clientSecret + key) or the hosted checkout page (url). */
export type PaySession = { url?: string; clientSecret?: string; publishableKey?: string };
type Kind = 'invoice' | 'booking' | 'service' | 'card';

// The session is handed to the pay screen in memory, never through route params: the app answers purplebox:// links,
// so anything in the params could come from a link someone else sent, and would load their page as our "Secure payment".
let pending: { token: string; session: PaySession } | null = null;

export function openPay(session: PaySession, kind: Kind, id: string) {
  const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  pending = { token, session };
  router.push({ pathname: '/pay', params: { s: token, kind, id } });
}

/** The session the app opened the pay screen with, or null when the screen was reached any other way. */
export const paySession = (token?: string): PaySession | null => (token && pending?.token === token ? pending.session : null);
