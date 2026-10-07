import { router } from 'expo-router';
import { initPaymentSheet, initStripe, presentPaymentSheet } from '@stripe/stripe-react-native';
import { ApiError } from '@/api/client';
import { PayTarget, payApi } from '@/api/pay';

/** paid: the sheet confirmed it. canceled: they closed it. handed-off: Stripe's page is open in the app and finishes the flow itself. */
export type PayResult = 'paid' | 'canceled' | 'handed-off';

const MERCHANT_ID = process.env.EXPO_PUBLIC_STRIPE_MERCHANT_ID; // Apple Pay, once set up in Stripe + the Apple developer account

/** Stripe's page, shown inside the app (app/pay.tsx) instead of sending people out to a browser. */
async function inAppCheckoutPage(t: PayTarget): Promise<PayResult> {
  const url = await payApi.hostedUrl(t);
  router.push({ pathname: '/pay', params: { url, kind: t.kind, id: t.id } });
  return 'handed-off';
}

/**
 * Pay without leaving the app. The preferred way is Stripe's payment sheet (cards, Apple Pay, Google Pay), which needs
 * the server to answer `POST …/pay-sheet` with a PaymentIntent client secret. Until it does (404/405), this falls back to
 * showing Stripe's hosted Checkout page inside the app. The server still confirms payment itself by webhook.
 */
export async function payInApp(t: PayTarget & { label?: string }): Promise<PayResult> {
  let s;
  try {
    s = await payApi.sheet(t);
  } catch (e) {
    if (e instanceof ApiError && [404, 405, 501].includes(e.status)) return inAppCheckoutPage(t);
    throw e;
  }

  await initStripe({ publishableKey: s.publishableKey, urlScheme: 'purplebox', merchantIdentifier: MERCHANT_ID });
  const customer = s.customerId && s.customerEphemeralKeySecret ? { customerId: s.customerId, customerEphemeralKeySecret: s.customerEphemeralKeySecret } : {};
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
