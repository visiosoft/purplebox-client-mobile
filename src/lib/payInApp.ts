import Constants from 'expo-constants';
import { initPaymentSheet, initStripe, presentPaymentSheet } from '@stripe/stripe-react-native';
import { ApiError } from '@/api/client';
import { PayTarget, SaveCard, payApi } from '@/api/pay';
import { openPay } from '@/lib/paySession';

/** paid: the sheet confirmed it. canceled: they closed it. handed-off: Stripe's page is open in the app and finishes the flow itself. */
export type PayResult = 'paid' | 'canceled' | 'handed-off';

// Apple Pay turns on only when the build was made with APPLE_MERCHANT_ID (see app.config.js) and set up in Stripe.
const MERCHANT_ID = ((Constants.expoConfig?.extra as { stripeMerchantId?: string } | undefined)?.stripeMerchantId || process.env.EXPO_PUBLIC_STRIPE_MERCHANT_ID) || undefined;

/**
 * Stripe's checkout, shown inside the app (app/pay.tsx) instead of sending people out to a browser. Prefers Stripe's
 * embedded card form (server `embedded` mode); if the server answers with a hosted URL instead, shows that page.
 */
async function inAppCheckoutPage(t: PayTarget, save?: SaveCard): Promise<PayResult> {
  const r = await payApi.embedded(t, save);
  if (r.clientSecret && r.publishableKey) openPay({ clientSecret: r.clientSecret, publishableKey: r.publishableKey }, t.kind, t.id);
  else openPay({ url: r.url ?? (await payApi.hostedUrl(t)) }, t.kind, t.id);
  return 'handed-off';
}

/**
 * Pay without leaving the app. The preferred way is Stripe's payment sheet (cards, Apple Pay, Google Pay), which needs
 * the server to answer `POST …/pay-sheet` with a PaymentIntent client secret. Until it does (404/405), this falls back to
 * Stripe's embedded card form inside the app (already supported by the server). The server still confirms payment itself by webhook.
 */
export async function payInApp(t: PayTarget & SaveCard & { label?: string }): Promise<PayResult> {
  let s;
  try {
    s = await payApi.sheet(t, t);
  } catch (e) {
    if (e instanceof ApiError && [404, 405, 501].includes(e.status)) return inAppCheckoutPage(t, t);
    throw e;
  }

  await initStripe({ publishableKey: s.publishableKey, urlScheme: 'purplebox', merchantIdentifier: MERCHANT_ID });
  // Saved cards in the sheet: a CustomerSession when the server sent one, the older ephemeral key otherwise.
  const customer = s.customerId && s.customerSessionClientSecret ? { customerId: s.customerId, customerSessionClientSecret: s.customerSessionClientSecret }
    : s.customerId && s.customerEphemeralKeySecret ? { customerId: s.customerId, customerEphemeralKeySecret: s.customerEphemeralKeySecret } : {};
  const init = await initPaymentSheet({
    merchantDisplayName: s.merchantDisplayName ?? 'PurpleBox Storage',
    paymentIntentClientSecret: s.paymentIntentClientSecret,
    ...customer,
    returnURL: 'purplebox://stripe-redirect',
    primaryButtonLabel: t.label,
    ...(MERCHANT_ID ? { applePay: { merchantCountryCode: 'AE' } } : {}),
    googlePay: { merchantCountryCode: 'AE', currencyCode: 'AED', testEnv: __DEV__ },
    appearance: {
      colors: { primary: '#2B2B2B', background: '#FDFCF7', componentBackground: '#F6F3E7', componentText: '#262626', primaryText: '#262626', secondaryText: '#5C5A53', placeholderText: '#6E6B61' },
      shapes: { borderRadius: 18 },
    },
  });
  if (init.error) throw new Error(init.error.message);

  const res = await presentPaymentSheet();
  if (res.error) {
    if (res.error.code === 'Canceled') return 'canceled';
    throw new Error(res.error.message);
  }
  return 'paid';
}
