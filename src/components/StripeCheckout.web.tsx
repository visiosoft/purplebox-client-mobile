import { useMemo } from 'react';
import { View } from 'react-native';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';

/** Stripe's card form, rendered inside our own page. Calls onComplete once Stripe has taken the payment. */
export function StripeCheckout({ clientSecret, publishableKey, onComplete }: {
  clientSecret: string; publishableKey: string; onComplete: () => void; onError?: (message: string) => void;
}) {
  const stripe = useMemo(() => loadStripe(publishableKey), [publishableKey]);
  return (
    <View style={{ minHeight: 480 }}>
      <EmbeddedCheckoutProvider stripe={stripe} options={{ clientSecret, onComplete }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </View>
  );
}
