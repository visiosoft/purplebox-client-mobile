import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react-native';
import { Button, Screen, Text } from '@/components/ui';
import { bookingApi } from '@/api/booking';
import { useTheme } from '@/theme/useTheme';
import { useI18n } from '@/i18n';

// Stripe tells the server a payment cleared, and the server then makes the
// contract. That takes a moment, so after paying we poll until it is ready — but not forever: if the server hasn't
// heard from Stripe after a few minutes, say so and let them leave (the push notification tells them when it lands).
const POLL_FOR_MS = 3 * 60 * 1000;

export default function BookingStatus() {
  const router = useRouter();
  const { t } = useI18n();
  const qc = useQueryClient();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [slow, setSlow] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setSlow(true), POLL_FOR_MS); return () => clearTimeout(timer); }, []);
  const q = useQuery({
    queryKey: ['booking', id], queryFn: () => bookingApi.get(id),
    refetchInterval: (query) => (!slow && ['confirming', 'held'].includes(query.state.data?.state ?? '') ? 2000 : false),
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
          <Text variant="h1">{t('You’re all set')}</Text>
          <Text color="ink2" style={{ textAlign: 'center' }}>{t('Unit {no} is yours. Your contract and receipt are in Storage.', { no: q.data?.unit.unitNumber ?? '' })}</Text>
          <Button title={t('Go to my unit')} onPress={() => router.replace('/(tabs)/storage')} style={{ alignSelf: 'stretch' }} />
        </>
      ) : state === 'needs_review' ? (
        <>
          <Text variant="h2" style={{ textAlign: 'center' }}>{t('We received your payment')}</Text>
          <Text color="ink2" style={{ textAlign: 'center' }}>{t('Something needs a quick check on our side. Our team will contact you shortly — you have not been charged twice.')}</Text>
          <Button title={t('Back to home')} onPress={() => router.replace('/(tabs)')} style={{ alignSelf: 'stretch' }} />
        </>
      ) : state === 'expired' ? (
        <>
          <Text variant="h2">{t('Payment not completed')}</Text>
          <Text color="ink2" style={{ textAlign: 'center' }}>{t('Your reservation has expired and the unit was released.')}</Text>
          <Button title={t('Choose a unit again')} onPress={() => router.replace('/book')} style={{ alignSelf: 'stretch' }} />
        </>
      ) : state === 'held' ? (
        <>
          <Text variant="h2">{t('Waiting for payment')}</Text>
          <Text color="ink2" style={{ textAlign: 'center' }}>{t('If you finished paying, this will update in a moment.')}</Text>
          <ActivityIndicator color={c.ink} />
          <Button title={t('Back to payment')} variant="soft" onPress={() => router.replace({ pathname: '/book/review', params: { id } })} style={{ alignSelf: 'stretch' }} />
        </>
      ) : q.isError && !q.data ? (
        <>
          <Text variant="h2" style={{ textAlign: 'center' }}>{t('Could not check your booking')}</Text>
          <Text color="ink2" style={{ textAlign: 'center' }}>{t('Check your connection and try again.')}</Text>
          <Button title={t('Try again')} onPress={() => q.refetch()} style={{ alignSelf: 'stretch' }} />
          <Button title={t('Back to home')} variant="soft" onPress={() => router.replace('/(tabs)')} style={{ alignSelf: 'stretch' }} />
        </>
      ) : slow ? (
        <>
          <Text variant="h2" style={{ textAlign: 'center' }}>{t('This is taking longer than usual')}</Text>
          <Text color="ink2" style={{ textAlign: 'center' }}>{t('Your payment may still be processing. We’ll notify you as soon as your contract is ready.')}</Text>
          <Button title={t('Check again')} loading={q.isFetching} onPress={() => q.refetch()} style={{ alignSelf: 'stretch' }} />
          <Button title={t('Back to home')} variant="soft" onPress={() => router.replace('/(tabs)')} style={{ alignSelf: 'stretch' }} />
        </>
      ) : (
        <>
          <ActivityIndicator color={c.ink} size="large" />
          <View style={{ gap: 6 }}>
            <Text variant="h2" style={{ textAlign: 'center' }}>{t('Confirming your payment…')}</Text>
            <Text color="ink2" style={{ textAlign: 'center' }}>{t('Preparing your contract.')}</Text>
          </View>
        </>
      )}
    </Screen>
  );
}
