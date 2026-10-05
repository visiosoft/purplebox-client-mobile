import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Clock } from 'lucide-react-native';
import {
  Banner, BannerText, BottomSheet, Button, Card, DetailSkeleton, EmptyState, ErrorState, Heading, KVCard, PaySheet, Progress,
  Screen, ScrollBody, SectionHead, StatusChip, StickyFooter, Text, Tile, TopBar, pollUntil, sizeFits, useProfileForm,
} from '@/components';
import { useTheme } from '@/theme/useTheme';
import { fonts, space } from '@/theme/tokens';
import { bookingApi, type Booking } from '@/api/booking';
import { ApiError } from '@/api/client';
import { useBookingDraft } from '@/store/booking';
import { aed, aed2, bookingEnd, fromIsoDay, plural, round2, shortDate } from '@/lib/format';

const PAID_STATES: Booking['state'][] = ['confirming', 'ready_to_sign', 'active', 'needs_review'];

function useCountdown(iso?: string) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!iso) return;
    const tick = () => setLeft(Math.max(0, new Date(iso).getTime() - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [iso]);
  return left;
}

const isRefundable = (label: string) => /advance|deposit|refundable/i.test(label);

/**
 * Step 3 · Summary and total in plain words. "Pay" holds the unit (if it isn't held yet)
 * and opens the pay sheet, which hands over to Stripe Checkout.
 */
export default function Review() {
  const router = useRouter();
  const qc = useQueryClient();
  const { c } = useTheme();
  const { id: paramId } = useLocalSearchParams<{ id?: string }>();
  const draft = useBookingDraft();
  const bookingId = paramId ?? draft.bookingId;

  const bq = useQuery({ queryKey: ['booking', bookingId], queryFn: () => bookingApi.get(bookingId!), enabled: !!bookingId });
  const sizes = useQuery({
    queryKey: ['sizes', draft.startDate, draft.months],
    queryFn: () => bookingApi.sizes(draft.startDate, draft.months),
    enabled: !bookingId && !!draft.sizeSqf,
  });
  const b = bookingId ? bq.data : undefined;
  const size = sizes.data?.find((s) => s.sizeSqf === draft.sizeSqf);

  const [paySheet, setPaySheet] = useState(false);
  const [profileSheet, setProfileSheet] = useState(false);
  const [priceChanged, setPriceChanged] = useState(false);
  const [problem, setProblem] = useState<null | 'taken' | string>(null);
  const left = useCountdown(b?.state === 'held' ? b.holdExpiresAt : undefined);

  // Paid already (e.g. resumed from Home): the status screen takes over.
  useEffect(() => {
    if (b && PAID_STATES.includes(b.state) && !paySheet) router.replace({ pathname: '/book/status', params: { id: b.bookingId } });
  }, [b, paySheet, router]);
  const refetchBooking = bq.refetch;
  useEffect(() => { if (left === 0) refetchBooking(); }, [left, refetchBooking]);

  const sqft = b?.unit.sizeSqf ?? draft.sizeSqf ?? 0;
  const start = b ? new Date(b.unit.startDate) : fromIsoDay(draft.startDate);
  const end = b ? new Date(b.unit.endDate) : bookingEnd(start, draft.months);
  const months = b ? Math.max(1, Math.round((end.getTime() - start.getTime()) / (28 * 86_400_000))) : draft.months;
  const monthly = b?.unit.monthlyRate ?? size?.monthlyRate ?? 0;
  const total = b?.pricing.total ?? size?.payToday ?? 0;
  const fee = b?.pricing.cardFee ?? round2(Math.round(total * 3) / 100);
  const toPay = b?.pricing.totalWithFee ?? round2(total + fee);

  const reserve = useMutation({
    mutationFn: () => bookingApi.reserve({ sizeSqf: draft.sizeSqf!, startDate: draft.startDate, months: draft.months }),
    onSuccess: (nb) => {
      qc.setQueryData(['booking', nb.bookingId], nb);
      draft.set({ bookingId: nb.bookingId });
      setPriceChanged(Math.abs(nb.pricing.totalWithFee - toPay) > 0.009);
      setProblem(null);
      setPaySheet(true);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.data?.code === 'profile_incomplete') setProfileSheet(true);
      else if (e instanceof ApiError && e.status === 409) { setProblem('taken'); qc.invalidateQueries({ queryKey: ['sizes'] }); }
      else setProblem(e.message);
    },
  });

  const profile = useProfileForm({ strict: true, onSaved: () => { setProfileSheet(false); reserve.mutate(); } });

  const pay = () => {
    setProblem(null);
    if (b?.state === 'held') { setPriceChanged(false); setPaySheet(true); } else reserve.mutate();
  };

  const startOver = () => { draft.set({ bookingId: null }); router.replace('/book'); };

  // Nothing chosen and nothing to resume.
  if (!bookingId && !draft.sizeSqf) {
    return (
      <Screen>
        <TopBar title="Book a unit" />
        <ScrollBody>
          <EmptyState icon={Box} title="Pick a size first" body="Choose a size and a move-in day, then you'll see the total here." primary={{ label: 'Find your size', onPress: () => router.replace('/book') }} />
        </ScrollBody>
      </Screen>
    );
  }

  const loading = bookingId ? bq.isLoading : sizes.isLoading;
  const failed = bookingId ? !bq.data && bq.isError : !sizes.data && sizes.isError;

  if (b?.state === 'expired') {
    return (
      <Screen>
        <TopBar title="Book a unit" />
        <ScrollBody>
          <EmptyState icon={Clock} title="Your hold has ended" body="The unit was released and nothing was charged. Pick a size again — it only takes a minute." primary={{ label: 'Start again', onPress: startOver }} />
        </ScrollBody>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title="Book a unit" />
      <ScrollBody>
        <Progress value={0.75} />
        <Heading title="Check and pay" style={{ marginBottom: space[3] }} />
        {loading ? <DetailSkeleton /> : failed ? (
          <ErrorState title="Couldn't load your booking" body="Nothing has been charged. Try again, or ask us on WhatsApp." onRetry={() => (bookingId ? bq.refetch() : sizes.refetch())} error={bq.error ?? sizes.error} />
        ) : (
          <>
            {problem === 'taken' ? (
              <Banner tone="error" style={{ marginBottom: space[3] }} action={{ label: 'Choose another size', onPress: () => router.navigate('/book') }}>
                <BannerText bold="Sorry, that size was just taken.">Nothing was charged. Pick another size or day.</BannerText>
              </Banner>
            ) : problem ? (
              <Banner tone="error" style={{ marginBottom: space[3] }}>
                <BannerText bold="We couldn't hold your unit.">{problem}. Nothing was charged — try again.</BannerText>
              </Banner>
            ) : null}
            {b?.state === 'held' && left ? (
              <Banner tone="info" icon={Clock} style={{ marginBottom: space[3] }}>
                <BannerText bold={`Unit ${b.unit.unitNumber} is held for you`}>
                  for {Math.floor(left / 60000)}:{String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}.
                </BannerText>
              </Banner>
            ) : null}

            <Card>
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <Tile icon={Box} size={56} iconSize={28} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.extrabold, fontSize: 20, lineHeight: 26 }}>{sqft} sqft unit</Text>
                  <Text variant="caption" tone="muted">PurpleBox Al Quoz · {sizeFits(sqft)}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[4], paddingTop: 14, borderTopWidth: 1, borderTopColor: c.line }}>
                {[['Move-in', shortDate(start)], ['For', plural(months, 'month')], ['Until', shortDate(end)]].map(([k, v]) => (
                  <View key={k} style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: c.inkMuted }}>{k}</Text>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 }}>{v}</Text>
                  </View>
                ))}
              </View>
              {!paramId ? (
                <Button sm variant="ghost" title="Change" onPress={() => router.navigate('/book')} style={{ paddingHorizontal: 0, marginTop: 6 }} />
              ) : null}
            </Card>

            <SectionHead title="Pay today" />
            {b ? (
              <KVCard rows={[
                ...b.pricing.lines.map((l) => ({
                  label: l.label,
                  value: aed2(l.amount),
                  labelExtra: isRefundable(l.label) ? <StatusChip kind="info" plain small label="Refundable" /> : undefined,
                })),
                { label: 'Total today', value: aed2(b.pricing.total), total: true },
                { label: 'Card fee (3%)', value: aed2(b.pricing.cardFee), valueTone: 'muted' as const },
              ]} />
            ) : (
              <KVCard rows={[
                { label: 'First payment, incl. 5% VAT', value: aed2(total) },
                { label: 'Card fee (3%)', value: aed2(fee), valueTone: 'muted' as const },
                { label: 'You pay', value: aed2(toPay), total: true },
              ]} />
            )}
            <Text variant="caption" tone="muted" style={{ marginTop: space[3] }}>
              {b ? '' : 'Includes your first rent, a refundable advance and 5% VAT. '}
              Then {aed(monthly)} a month + VAT, billed every 4 weeks.
            </Text>
          </>
        )}
      </ScrollBody>
      {!loading && !failed ? (
        <StickyFooter hint="Secure payment · you sign the agreement next" lockHint>
          <Button block title={`Pay ${aed2(toPay)}`} loading={reserve.isPending} loadingTitle="Holding your unit" onPress={pay} />
        </StickyFooter>
      ) : null}

      <BottomSheet visible={profileSheet} onClose={() => setProfileSheet(false)} locked={profile.busy || reserve.isPending} title="Your details">
        <Text tone="muted" style={{ marginTop: 6, marginBottom: space[4] }}>Your agreement is made out in this name, and your receipt goes to this email.</Text>
        {profile.fields}
        <Button block title="Save and continue" loading={profile.busy || reserve.isPending} loadingTitle="Saving" onPress={profile.submit} style={{ marginTop: space[5] }} />
      </BottomSheet>

      {b ? (
        <PaySheet
          visible={paySheet}
          onClose={() => { setPaySheet(false); bq.refetch(); }}
          caption={`${sqft} sqft unit ${b.unit.unitNumber} · first payment`}
          amount={b.pricing.totalWithFee}
          feeNote={`Includes a 3% card fee (${aed2(b.pricing.cardFee)})`}
          notice={priceChanged ? (
            <Banner tone="warn"><BannerText bold="Prices were updated.">Your total is below — nothing has been charged.</BannerText></Banner>
          ) : undefined}
          start={async () => (await bookingApi.pay(b.bookingId)).url}
          describeError={(e) => (e instanceof ApiError
            ? e.status === 410 ? 'Your hold ran out and the unit was released. No money was taken.'
              : e.status === 409 ? 'This booking is already paid. You won\'t be charged again.'
                : e.status === 503 ? 'Card payment isn\'t available right now. No money was taken — try again soon or message us.'
                  : `${e.message}. No money was taken.`
            : null)}
          confirm={async () => {
            const v = await pollUntil(() => bookingApi.get(b.bookingId), (x) => PAID_STATES.includes(x.state) || x.state === 'expired', 10);
            if (v) qc.setQueryData(['booking', b.bookingId], v);
            return v && PAID_STATES.includes(v.state) ? 'paid' : 'pending';
          }}
          doneLabel="Next: sign your agreement"
          onDone={() => {
            setPaySheet(false);
            qc.invalidateQueries({ queryKey: ['booking-current'] });
            router.replace({ pathname: '/book/status', params: { id: b.bookingId } });
          }}
        />
      ) : null}
    </Screen>
  );
}
