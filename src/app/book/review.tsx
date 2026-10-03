import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Card, Screen, Text } from '@/components/ui';
import { Page } from '@/components/bits';
import { bookingApi } from '@/api/booking';
import { aed, shortDate } from '@/lib/format';
import { fonts } from '@/theme/tokens';

function useCountdown(iso?: string) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!iso) return;
    const tick = () => setLeft(Math.max(0, new Date(iso).getTime() - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [iso]);
  return left;
}

export default function Review() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['booking', id], queryFn: () => bookingApi.get(id) });
  const b = q.data;
  const left = useCountdown(b?.holdExpiresAt);
  const mins = Math.floor(left / 60000);
  const secs = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');

  // Payment is confirmed to the server by Stripe, not by this app, so after the
  // browser closes we just go and look at where the booking has got to.
  const pay = useMutation({
    mutationFn: async () => {
      const { url } = await bookingApi.pay(id);
      await WebBrowser.openBrowserAsync(url);
    },
    onSuccess: () => router.replace({ pathname: '/book/status', params: { id } }),
    onError: (e) => Alert.alert('Payment', e.message),
  });

  if (b && b.state !== 'held') {
    return (
      <Screen style={{ justifyContent: 'center', gap: 16 }}>
        <Text variant="h2">{b.state === 'expired' ? 'Your reservation has expired' : 'Booking in progress'}</Text>
        <Button title={b.state === 'expired' ? 'Choose a unit again' : 'Continue'}
          onPress={() => (b.state === 'expired' ? router.replace('/book') : router.replace({ pathname: '/book/status', params: { id } }))} />
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingTop: 56 }}>
      <Page loading={q.isLoading} error={q.error?.message}>
        {b ? (
          <>
            <View style={{ gap: 6 }}>
              <Text variant="h1">Review & pay</Text>
              <Text color="ink2">Unit {b.unit.unitNumber} is held for you for {mins}:{secs}.</Text>
            </View>
            <Card style={{ gap: 6 }}>
              <Text variant="h3">{b.unit.sizeSqf} sq ft · Unit {b.unit.unitNumber}</Text>
              <Text variant="meta">{shortDate(b.unit.startDate)} → {shortDate(b.unit.endDate)}</Text>
            </Card>
            <Card style={{ gap: 10 }}>
              {b.pricing.lines.map((l, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Text variant="meta" style={{ flex: 1 }}>{l.label}</Text>
                  <Text style={{ fontFamily: fonts.semibold }}>{aed(l.amount)}</Text>
                </View>
              ))}
              <View style={{ height: 1, backgroundColor: '#8884' }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: fonts.bold }}>Total</Text>
                <Text style={{ fontFamily: fonts.bold }}>{aed(b.pricing.total)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="meta">Card fee (3%)</Text>
                <Text variant="meta">{aed(b.pricing.cardFee)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="h3">You pay</Text>
                <Text variant="h3">{aed(b.pricing.totalWithFee)}</Text>
              </View>
              <Text variant="meta">The refundable advance is returned at the end of your rental.</Text>
            </Card>
            <Button title={`Pay ${aed(b.pricing.totalWithFee)}`} loading={pay.isPending} disabled={left === 0} onPress={() => pay.mutate()} />
            <Button title="Cancel" variant="ghost" onPress={() => router.replace('/(tabs)')} />
          </>
        ) : null}
      </Page>
    </Screen>
  );
}
