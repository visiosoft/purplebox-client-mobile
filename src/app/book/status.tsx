import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react-native';
import { Button, Screen, Text } from '@/components/ui';
import { bookingApi } from '@/api/booking';
import { useTheme } from '@/theme/useTheme';

// Stripe tells the server a payment cleared, and the server then makes the
// agreement. That takes a moment, so after paying we poll until it is ready.
export default function BookingStatus() {
  const router = useRouter();
  const qc = useQueryClient();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({
    queryKey: ['booking', id], queryFn: () => bookingApi.get(id),
    refetchInterval: (query) => (['confirming', 'held'].includes(query.state.data?.state ?? '') ? 2000 : false),
  });
  const state = q.data?.state;

  useEffect(() => {
    if (state === 'ready_to_sign') router.replace({ pathname: '/book/sign', params: { id } });
    if (state === 'active') qc.invalidateQueries();
  }, [state, id, router, qc]);

  return (
    <Screen style={{ justifyContent: 'center', alignItems: 'center', gap: 16 }}>
      {state === 'active' ? (
        <>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: c.ac, alignItems: 'center', justifyContent: 'center' }}>
            <Check color={c.acInk} size={40} strokeWidth={1.8} />
          </View>
          <Text variant="h1">You're all set</Text>
          <Text color="ink2" style={{ textAlign: 'center' }}>Unit {q.data?.unit.unitNumber} is yours. Your agreement and receipt are in Storage.</Text>
          <Button title="Go to my unit" onPress={() => router.replace('/(tabs)/storage')} style={{ alignSelf: 'stretch' }} />
        </>
      ) : state === 'needs_review' ? (
        <>
          <Text variant="h2" style={{ textAlign: 'center' }}>We received your payment</Text>
          <Text color="ink2" style={{ textAlign: 'center' }}>Something needs a quick check on our side. Our team will contact you shortly — you have not been charged twice.</Text>
          <Button title="Back to home" onPress={() => router.replace('/(tabs)')} style={{ alignSelf: 'stretch' }} />
        </>
      ) : state === 'expired' ? (
        <>
          <Text variant="h2">Payment not completed</Text>
          <Text color="ink2" style={{ textAlign: 'center' }}>Your reservation has expired and the unit was released.</Text>
          <Button title="Choose a unit again" onPress={() => router.replace('/book')} style={{ alignSelf: 'stretch' }} />
        </>
      ) : state === 'held' ? (
        <>
          <Text variant="h2">Waiting for payment</Text>
          <Text color="ink2" style={{ textAlign: 'center' }}>If you finished paying, this will update in a moment.</Text>
          <ActivityIndicator color={c.ink} />
          <Button title="Back to payment" variant="soft" onPress={() => router.replace({ pathname: '/book/review', params: { id } })} style={{ alignSelf: 'stretch' }} />
        </>
      ) : (
        <>
          <ActivityIndicator color={c.ink} size="large" />
          <View style={{ gap: 6 }}>
            <Text variant="h2" style={{ textAlign: 'center' }}>Confirming your payment…</Text>
            <Text color="ink2" style={{ textAlign: 'center' }}>Preparing your agreement.</Text>
          </View>
        </>
      )}
    </Screen>
  );
}
