import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Clock, Lock } from 'lucide-react-native';
import { Button, Card, Screen, Text, TopBar } from '@/components/ui';
import { Page, Steps, StatusChip } from '@/components/bits';
import { StripeCheckout } from '@/components/StripeCheckout';
import { bookingApi } from '@/api/booking';
import { useTheme } from '@/theme/useTheme';
import { aed } from '@/lib/format';

type Session = Awaited<ReturnType<typeof bookingApi.payEmbedded>>;

// Our own checkout page with Stripe's card form inside it. Card details go
// from the form to Stripe and never touch PurpleBox; Stripe tells the server
// the payment cleared (webhook), and the status screen picks it up from there.
export default function PayBooking() {
  const router = useRouter();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['booking', id], queryFn: () => bookingApi.get(id) });
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const started = useRef(false);
  const toStatus = () => router.replace({ pathname: '/book/status', params: { id } });

  // Each request cancels the previous Stripe session, so ask exactly once.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    bookingApi.payEmbedded(id).then(async (s) => {
      if (s.clientSecret && s.publishableKey) return setSession(s);
      // The server has no publishable key yet: fall back to Stripe's own page.
      if (s.url) { await WebBrowser.openBrowserAsync(s.url); toStatus(); }
    }).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const left = q.data?.holdExpiresAt ? Math.max(0, new Date(q.data.holdExpiresAt).getTime() - now) : null;
  const b = q.data;

  return (
    <Screen>
      <TopBar title="Pay securely" />
      <Page loading={false}>
        <Steps current={2} />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {left !== null ? <StatusChip tone="brand" icon={Clock} label={`Held for ${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`} /> : null}
          <StatusChip tone="neutral" icon={Lock} label="Encrypted by Stripe" />
        </View>

        <Card variant="dark" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 2, flex: 1 }}>
            <Text variant="title" color="onDk">{b ? `Unit ${b.unit.unitNumber}` : 'Your booking'}</Text>
            <Text variant="meta" color="onDk3">{b ? `${b.unit.sizeSqf} sq ft · incl. 3% card fee` : ' '}</Text>
          </View>
          <Text variant="h2" color="onDk">{aed(session?.totalCharged ?? b?.pricing.totalWithFee ?? 0)}</Text>
        </Card>

        {error ? (
          <Card style={{ gap: 12 }}>
            <Text variant="h3">We couldn’t open the payment form</Text>
            <Text color="ink2">{error}</Text>
            <Button title="Back to review" variant="soft" onPress={() => router.replace({ pathname: '/book/review', params: { id } })} />
          </Card>
        ) : session?.clientSecret && session.publishableKey ? (
          <Card style={{ padding: 0, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
            <StripeCheckout clientSecret={session.clientSecret} publishableKey={session.publishableKey}
              onComplete={toStatus} onError={setError} />
          </Card>
        ) : (
          <Card style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
            <ActivityIndicator color={c.ink} />
            <Text variant="meta">Preparing secure payment…</Text>
          </Card>
        )}

        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 4 }}>
          <Lock color={c.ink3} size={14} strokeWidth={1.6} />
          <Text variant="meta" style={{ flex: 1 }}>Your card details go straight to Stripe. PurpleBox never sees or stores them.</Text>
        </View>
      </Page>
    </Screen>
  );
}
