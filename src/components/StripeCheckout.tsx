import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/theme/useTheme';

// The release of Stripe.js @stripe/stripe-js loads on web, so both builds show the same form.
const STRIPE_JS = 'https://js.stripe.com/dahlia/stripe.js';

const page = (publishableKey: string, clientSecret: string) => `<!doctype html>
<html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>html,body{margin:0;padding:0;background:transparent}#checkout{min-height:100vh}</style>
<script src="${STRIPE_JS}"></script>
</head><body><div id="checkout"></div>
<script>
  const post = (m) => window.ReactNativeWebView.postMessage(JSON.stringify(m));
  const height = () => post({ type: 'height', value: document.documentElement.scrollHeight });
  new ResizeObserver(height).observe(document.body);
  (async () => {
    try {
      const stripe = Stripe(${JSON.stringify(publishableKey)});
      const opts = { clientSecret: ${JSON.stringify(clientSecret)}, onComplete: () => post({ type: 'complete' }) };
      const checkout = stripe.createEmbeddedCheckoutPage ? await stripe.createEmbeddedCheckoutPage(opts) : await stripe.initEmbeddedCheckout(opts);
      checkout.mount('#checkout');
      post({ type: 'ready' });
    } catch (e) { post({ type: 'error', message: String(e && e.message || e) }); }
  })();
</script></body></html>`;

/**
 * Stripe's card form inside our own page. Phones have no Stripe.js, so it runs
 * in a web view sized to its content; the page around it is ours.
 */
export function StripeCheckout({ clientSecret, publishableKey, onComplete, onError }: {
  clientSecret: string; publishableKey: string; onComplete: () => void; onError?: (message: string) => void;
}) {
  const { c } = useTheme();
  const [height, setHeight] = useState(520);
  const [ready, setReady] = useState(false);
  return (
    <View style={{ height, overflow: 'hidden' }}>
      <WebView
        originWhitelist={['*']}
        source={{ html: page(publishableKey, clientSecret), baseUrl: 'https://purplebox.ae' }}
        style={{ backgroundColor: 'transparent' }}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        onMessage={(e) => {
          const m = JSON.parse(e.nativeEvent.data || '{}');
          if (m.type === 'height' && m.value > 0) setHeight(Math.max(420, Math.ceil(m.value)));
          if (m.type === 'ready') setReady(true);
          if (m.type === 'complete') onComplete();
          if (m.type === 'error') onError?.(m.message);
        }}
      />
      {!ready ? (
        <View style={{ position: 'absolute', top: 40, left: 0, right: 0, alignItems: 'center' }}>
          <ActivityIndicator color={c.ink} />
        </View>
      ) : null}
    </View>
  );
}
