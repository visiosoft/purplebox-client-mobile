import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/theme/useTheme';
import { tr } from '@/i18n';

// Hosted-page mode: anything on Stripe's own domains (and the wallets / bank pages it hands off to) is still "paying".
// The first page outside them is the server's success or cancel address, which means we're done.
const STILL_PAYING = /(^|\.)(stripe\.com|stripe\.network|google\.com|gstatic\.com|apple\.com|3dsecure\.io|cardinalcommerce\.com)$/i;

type Props = { onDone: () => void } & ({ url: string; clientSecret?: undefined; publishableKey?: undefined } | { url?: undefined; clientSecret: string; publishableKey: string });

// JSON.stringify leaves "</script>" intact, which would end the script tag early; < keeps the value inside it.
const js = (v: string) => JSON.stringify(v).replace(/</g, '\\u003c');

/** Stripe's embedded card form, loaded from Stripe.js in a small page of our own. Tells the app when payment completes. */
const embeddedHtml = (publishableKey: string, clientSecret: string) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>html,body{margin:0;background:#FDFCF7}#c{padding:4px 0 32px}</style></head>
<body><div id="c"></div><script src="https://js.stripe.com/v3/"></script><script>
(async function(){
  try {
    var stripe = Stripe(${js(publishableKey)});
    var checkout = await stripe.initEmbeddedCheckout({ clientSecret: ${js(clientSecret)}, onComplete: function(){ window.ReactNativeWebView.postMessage('complete'); } });
    checkout.mount('#c');
  } catch (e) { window.ReactNativeWebView.postMessage('error:' + (e && e.message ? e.message : ${js(tr('Could not start payment'))})); }
})();
</script></body></html>`;

export function CheckoutWebView({ url, clientSecret, publishableKey, onDone, onError }: Props & { onError?: (m: string) => void }) {
  const { c } = useTheme();
  const [loading, setLoading] = useState(true);
  const html = useMemo(() => (clientSecret ? embeddedHtml(publishableKey!, clientSecret) : null), [clientSecret, publishableKey]);
  return (
    <View style={{ flex: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: c.sf }}>
      <WebView
        source={html ? { html, baseUrl: 'https://purplebox.ae' } : { uri: url! }}
        originWhitelist={['*']}
        javaScriptEnabled
        onLoadEnd={() => setLoading(false)}
        onMessage={(e) => {
          const m = e.nativeEvent.data;
          if (m === 'complete') onDone();
          else if (m.startsWith('error:')) onError?.(m.slice(6));
        }}
        onShouldStartLoadWithRequest={(req) => {
          if (html) return true; // embedded form: it stays on the page we gave it
          // iOS asks about frames too; a bank's 3-D Secure check loads in one from the bank's own domain mid-payment.
          if (req.isTopFrame === false) return true;
          try {
            const { protocol, hostname } = new URL(req.url);
            if (protocol === 'about:' || protocol === 'blob:' || protocol === 'data:') return true;
            if (protocol.startsWith('http') && !STILL_PAYING.test(hostname)) { onDone(); return false; }
          } catch { /* not a normal URL; let it load */ }
          return true;
        }}
        allowsInlineMediaPlayback
        setSupportMultipleWindows={false}
      />
      {loading ? <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={c.ink} /></View> : null}
    </View>
  );
}
