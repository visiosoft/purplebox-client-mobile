import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { IdCard } from 'lucide-react-native';
import { Button, Card, Screen, Text, TopBar } from '@/components/ui';
import { HScroll, Page, Steps, StatusChip } from '@/components/bits';
import { TERM_WEEKS, bookingApi } from '@/api/booking';
import { ApiError } from '@/api/client';
import { identityApi, isComplete, slotKey } from '@/api/identity';
import { aed, shortDate } from '@/lib/format';
import { useTheme } from '@/theme/useTheme';
import { fonts } from '@/theme/tokens';

class NeedsId extends Error {}
const DAY = 86_400_000;
const isoDay = (offset: number) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);

export default function ChooseUnit() {
  const router = useRouter();
  const { c } = useTheme();
  const { size } = useLocalSearchParams<{ size?: string }>();
  const [offset, setOffset] = useState(0);
  const [weeks, setWeeks] = useState(4);
  const start = isoDay(offset);

  const sizes = useQuery({ queryKey: ['sizes', start, weeks], queryFn: () => bookingApi.sizes(start, weeks) });

  const reserve = useMutation({
    mutationFn: async (sizeSqf: number) => {
      // The contract needs an ID on file. If the server can't tell us, don't block the booking.
      const ids = await identityApi.status().catch(() => null);
      if (ids && !isComplete(new Set(ids.documents.map(slotKey)))) throw new NeedsId();
      return bookingApi.reserve({ sizeSqf, startDate: start, weeks });
    },
    onSuccess: (b) => router.push({ pathname: '/book/review', params: { id: b.bookingId } }),
    onError: (e, sizeSqf) => {
      if (e instanceof NeedsId) { router.push({ pathname: '/id-upload', params: { flow: 'book' } }); return; }
      if (e instanceof ApiError && e.data?.code === 'profile_incomplete') {
        router.push({ pathname: '/book/details', params: { sizeSqf: String(sizeSqf), start, weeks: String(weeks) } });
      } else {
        Alert.alert('Could not reserve', e.message);
        sizes.refetch();
      }
    },
  });

  return (
    <Screen>
      <TopBar title="Book a unit" />
      <Page loading={false} error={sizes.error?.message} refreshing={sizes.isRefetching} onRefresh={() => sizes.refetch()}>
        <Steps current={0} />
        <Card variant="accent" style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16 }}>
          <IdCard color="#262626" size={22} strokeWidth={1.6} />
          <Text style={{ flex: 1 }}>About 5 minutes. Have your Emirates ID or passport and a card ready. We hold your unit while you pay.</Text>
        </Card>

        <Card style={{ gap: 14 }}>
          <Text variant="overline">Move-in date</Text>
          <HScroll itemWidth={58} selected={offset}>
            {Array.from({ length: 30 }, (_, i) => {
              const d = new Date(`${isoDay(i)}T12:00:00`);
              const on = i === offset;
              return (
                <Pressable key={i} onPress={() => setOffset(i)} accessibilityRole="button" accessibilityState={{ selected: on }}
                  accessibilityLabel={shortDate(isoDay(i))}
                  style={{ width: 58, height: 72, borderRadius: 20, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', gap: 2,
                    backgroundColor: on ? c.br : c.sf2 }}>
                  <Text variant="meta" style={{ color: on ? c.onBr : c.ink2 }}>{i === 0 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' })}</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 22, color: on ? c.onBr : c.ink }}>{d.getDate()}</Text>
                  <Text variant="meta" style={{ color: on ? c.onBr : c.ink3, fontSize: 11 }}>{d.toLocaleDateString('en-GB', { month: 'short' })}</Text>
                </Pressable>
              );
            })}
          </HScroll>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text variant="overline">Term</Text>
            <Text variant="meta">Until {shortDate(isoDay(offset + weeks * 7))}</Text>
          </View>
          <HScroll itemWidth={58} selected={TERM_WEEKS.indexOf(weeks)}>
            {TERM_WEEKS.map((w) => {
              const on = w === weeks;
              return (
                <Pressable key={w} onPress={() => setWeeks(w)} accessibilityRole="button" accessibilityState={{ selected: on }}
                  accessibilityLabel={`${w} weeks`}
                  style={{ width: 58, height: 58, borderRadius: 20, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: on ? c.br : c.sf2 }}>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 20, color: on ? c.onBr : c.ink }}>{w}</Text>
                  <Text variant="meta" style={{ color: on ? c.onBr : c.ink3, fontSize: 11 }}>weeks</Text>
                </Pressable>
              );
            })}
          </HScroll>
        </Card>

        {sizes.isLoading ? <Text color="ink2">Checking availability…</Text> : null}
        {sizes.data && sizes.data.length === 0 ? <Text color="ink2">No units are free for those dates. Try another date.</Text> : null}

        {(sizes.data ?? []).map((s) => (
          <Card key={s.sizeSqf} style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ gap: 2 }}>
                {String(s.sizeSqf) === size ? <StatusChip tone="brand" label="Recommended for you" /> : null}
                <Text variant="h2">{s.sizeSqf} sq ft</Text>
                <Text variant="meta">{aed(s.monthlyRate)}/month{s.discountPct ? ` · ${s.discountPct}% off first month` : ''}</Text>
              </View>
              <StatusChip tone={s.available <= 2 ? 'warn' : 'ok'} label={s.available <= 2 ? `Only ${s.available} left` : `${s.available} free`} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text variant="meta">Pay today</Text>
                <Text variant="h3">{aed(s.payToday)}</Text>
              </View>
              <Button title="Reserve" variant="accent" style={{ height: 46 }}
                loading={reserve.isPending && reserve.variables === s.sizeSqf} disabled={reserve.isPending}
                onPress={() => reserve.mutate(s.sizeSqf)} />
            </View>
          </Card>
        ))}
      </Page>
    </Screen>
  );
}
