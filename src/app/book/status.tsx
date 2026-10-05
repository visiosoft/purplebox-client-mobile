import { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Info, MessageCircle } from 'lucide-react-native';
import {
  Button, EmptyState, ErrorState, Heading, Screen, ScrollBody, SectionHead, Skel, StickyFooter, SuccessCheck, Text,
} from '@/components';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius, space } from '@/theme/tokens';
import { bookingApi } from '@/api/booking';
import { useBookingDraft } from '@/store/booking';
import { shortDate } from '@/lib/format';
import { openWhatsApp } from '@/lib/contact';

function Step({ n, children }: { n: number; children: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'flex-start' }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.brand100, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.extrabold, color: c.brand500 }}>{n}</Text>
      </View>
      <Text style={{ flex: 1, paddingTop: 3 }}>{children}</Text>
    </View>
  );
}

/**
 * Where a paid booking has got to. Stripe tells the server, which then makes the agreement,
 * so this polls until it's ready to sign — and becomes Step 5, "You're booked", once signed.
 */
export default function BookingStatus() {
  const router = useRouter();
  const qc = useQueryClient();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingApi.get(id),
    refetchInterval: (query) => (query.state.data?.state === 'confirming' ? 2000 : false),
  });
  const b = q.data;
  const state = b?.state;

  useEffect(() => {
    if (state === 'ready_to_sign') router.replace({ pathname: '/book/sign', params: { id } });
    if (state === 'active') { qc.invalidateQueries(); useBookingDraft.getState().reset(); }
  }, [state, id, router, qc]);

  const home = () => router.replace('/(tabs)');

  if (state === 'active' && b) {
    return (
      <Screen>
        <ScrollBody contentStyle={{ paddingTop: space[10] }}>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <SuccessCheck />
            <Text variant="display" accessibilityRole="header" style={{ marginTop: 8, textAlign: 'center' }}>You're booked!</Text>
            <Text variant="bodyLg" tone="muted" style={{ textAlign: 'center' }}>Your agreement is signed and your unit is ready.</Text>
          </View>
          <View style={{
            marginTop: 14 + space[2], borderRadius: radius.card, backgroundColor: c.brand500, padding: space[5],
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[3],
          }}>
            <View>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: c.onBrand, opacity: 0.85 }}>Your unit</Text>
              <Text style={{ fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6, color: c.onBrand, direction: 'ltr' }}>{b.unit.unitNumber}</Text>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: c.onBrand, opacity: 0.85, marginTop: 4 }}>
                {b.unit.sizeSqf} sqft{b.unit.floor ? ` · ${/floor/i.test(b.unit.floor) ? b.unit.floor : `floor ${b.unit.floor}`}` : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: c.onBrand, opacity: 0.85 }}>Move-in</Text>
              <Text style={{ fontFamily: fonts.extrabold, fontSize: 20, lineHeight: 26, color: c.onBrand }}>{shortDate(b.unit.startDate)}</Text>
              {b.contractNo ? <Text style={{ fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: c.onBrand, opacity: 0.85, marginTop: 4 }}>{b.contractNo}</Text> : null}
            </View>
          </View>
          <SectionHead title="What happens next" />
          <View style={{ gap: 14 }}>
            <Step n={1}>Your signed agreement and receipt are in Documents.</Step>
            <Step n={2}>Bring your Emirates ID on move-in day.</Step>
            <Step n={3}>Need a hand moving in? Message us on WhatsApp and we'll arrange it.</Step>
          </View>
        </ScrollBody>
        <StickyFooter>
          <Button block title="Go to my unit" onPress={() => {
            router.replace('/(tabs)/units');
            if (b.contractId) router.push({ pathname: '/unit/[id]', params: { id: b.contractId } });
          }} />
        </StickyFooter>
      </Screen>
    );
  }

  if (state === 'needs_review') {
    return (
      <Screen>
        <ScrollBody contentStyle={{ paddingTop: space[10] }}>
          <EmptyState
            icon={Info}
            title="We received your payment"
            body="One detail needs a quick check on our side. Our team will contact you shortly — you won't be charged twice."
            primary={{ label: 'Back to home', onPress: home }}
            secondary={{ label: 'Chat on WhatsApp', icon: MessageCircle, onPress: () => openWhatsApp(`Hi PurpleBox, a question about my booking ${b?.quoteNo ?? ''}.`) }}
          />
        </ScrollBody>
      </Screen>
    );
  }

  if (state === 'expired') {
    return (
      <Screen>
        <ScrollBody contentStyle={{ paddingTop: space[10] }}>
          <EmptyState
            icon={Clock}
            title="Payment not completed"
            body="Your hold ended and the unit was released. No money was taken."
            primary={{ label: 'Choose a unit again', onPress: () => { useBookingDraft.getState().set({ bookingId: null }); router.replace('/book'); } }}
            secondary={{ label: 'Chat on WhatsApp', icon: MessageCircle, onPress: () => openWhatsApp() }}
          />
        </ScrollBody>
      </Screen>
    );
  }

  if (state === 'held') {
    return (
      <Screen>
        <ScrollBody contentStyle={{ paddingTop: space[10] }}>
          <EmptyState
            icon={Clock}
            title="Waiting for your payment"
            body={`Unit ${b?.unit.unitNumber} is still held for you. If you closed the payment page, no money was taken.`}
            primary={{ label: 'Back to payment', onPress: () => router.replace({ pathname: '/book/review', params: { id } }) }}
            secondary={{ label: 'Check again', onPress: () => q.refetch() }}
          />
        </ScrollBody>
      </Screen>
    );
  }

  if (!b && q.isError) {
    return (
      <Screen>
        <ScrollBody contentStyle={{ paddingTop: space[10] }}>
          <ErrorState title="Couldn't load your booking" body="If you paid, your payment is safe. Try again in a moment." onRetry={() => q.refetch()} error={q.error} />
        </ScrollBody>
      </Screen>
    );
  }

  // Confirming (or first load): payment in, agreement being prepared.
  return (
    <Screen>
      <ScrollBody contentStyle={{ paddingTop: space[10] }}>
        <Heading title="Confirming your payment…" lead="Preparing your agreement. This takes a few seconds." />
        <Skel h={240} r={18} />
      </ScrollBody>
    </Screen>
  );
}
