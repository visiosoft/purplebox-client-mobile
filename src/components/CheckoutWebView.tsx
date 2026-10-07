import { ActivityIndicator, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useState } from 'react';
import { useTheme } from '@/theme/useTheme';

// Anything on Stripe's own domains (and the wallets / bank pages it hands off to) is still "paying".
// The first page outside them is the server's success or cancel address, which means we're done.
const STILL_PAYING = /(^|\.)(stripe\.com|stripe\.network|google\.com|gstatic\.com|apple\.com|3dsecure\.io|cardinalcommerce\.com)$/i;

export function CheckoutWebView({ url, onDone }: { url: string; onDone: () => void }) {
  const { c } = useTheme();
  const [loading, setLoading] = useState(true);
  return (
    <View style={{ flex: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: c.sf }}>
      <WebView
        source={{ uri: url }}
        onLoadEnd={() => setLoading(false)}
        onShouldStartLoadWithRequest={(req) => {
          try {
            const { protocol, hostname } = new URL(req.url);
            if (protocol === 'about:' || protocol === 'blob:' || protocol === 'data:') return true;
            if (protocol.startsWith('http') && !STILL_PAYING.test(hostname)) { onDone(); return false; }
          } catch { /* not a normal URL; let it load */ }
          return true;
        }}
        startInLoadingState={false}
        allowsInlineMediaPlayback
        setSupportMultipleWindows={false}
      />
      {loading ? <View style={{ ...{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={c.ink} /></View> : null}
    </View>
  );
}
