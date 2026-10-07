import * as WebBrowser from 'expo-web-browser';
import { PayTarget, payApi } from '@/api/pay';

export type PayResult = 'paid' | 'canceled' | 'handed-off';

/** Browser build: Stripe's payment sheet is phone-only, so open the hosted page. */
export async function payInApp(t: PayTarget & { label?: string }): Promise<PayResult> {
  await WebBrowser.openBrowserAsync(await payApi.hostedUrl(t));
  return 'handed-off';
}
