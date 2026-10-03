import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Card, Screen, Text } from '@/components/ui';
import { Page, Segmented, StatusChip } from '@/components/bits';
import { Term, bookingApi } from '@/api/booking';
import { ApiError } from '@/api/client';
import { aed, shortDate } from '@/lib/format';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const DAY = 86_400_000;
const isoDay = (offset: number) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);

export default function ChooseUnit() {
  const router = useRouter();
  const { c } = useTheme();
  const [offset, setOffset] = useState(0);
  const [months, setMonths] = useState<Term>(1);
  const start = isoDay(offset);

  const sizes = useQuery({ queryKey: ['sizes', start, months], queryFn: () => bookingApi.sizes(start, months) });

  const reserve = useMutation({
    mutationFn: (sizeSqf: number) => bookingApi.reserve({ sizeSqf, startDate: start, months }),
    onSuccess: (b) => router.push({ pathname: '/book/review', params: { id: b.bookingId } }),
    onError: (e, sizeSqf) => {
      if (e instanceof ApiError && e.data?.code === 'profile_incomplete') {
        router.push({ pathname: '/book/details', params: { sizeSqf: String(sizeSqf), start, months: String(months) } });
      } else {
        Alert.alert('Could not reserve', e.message);
        sizes.refetch();
      }
    },
  });

  return (
    <Screen style={{ paddingTop: 56 }}>
      <Page loading={false} error={sizes.error?.message} refreshing={sizes.isRefetching} onRefresh={() => sizes.refetch()}>
        <View style={{ gap: 6 }}>
          <Text variant="h1">Book a unit</Text>
          <Text color="ink2">Pick your dates and a size. We hold it for you while you pay.</Text>
        </View>

        <Card style={{ gap: 14 }}>
          <Text variant="overline" color="ink3">Move-in date</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable disabled={offset <= 0} onPress={() => setOffset(offset - 1)} hitSlop={12}>
              <Text variant="h2" style={{ opacity: offset <= 0 ? 0.25 : 1 }}>‹</Text>
            </Pressable>
            <Text variant="h3">{offset === 0 ? 'Today · ' : ''}{shortDate(start)}</Text>
            <Pressable disabled={offset >= 30} onPress={() => setOffset(offset + 1)} hitSlop={12}>
              <Text variant="h2" style={{ opacity: offset >= 30 ? 0.25 : 1 }}>›</Text>
            </Pressable>
          </View>
          <Text variant="overline" color="ink3">Term</Text>
          <Segmented value={String(months)} onChange={(v) => setMonths(Number(v) as Term)}
            options={[{ value: '1', label: '1 mo' }, { value: '3', label: '3 mo' }, { value: '6', label: '6 mo' }, { value: '12', label: '12 mo' }]} />
        </Card>

        {sizes.isLoading ? <Text color="ink2">Checking availability…</Text> : null}
        {sizes.data && sizes.data.length === 0 ? <Text color="ink2">No units are free for those dates. Try another date.</Text> : null}

        {(sizes.data ?? []).map((s) => (
          <Card key={s.sizeSqf} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="h3">{s.sizeSqf} sq ft</Text>
              <StatusChip tone={s.available <= 2 ? 'warn' : 'ok'} label={s.available <= 2 ? `Only ${s.available} left` : `${s.available} available`} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="meta">{aed(s.monthlyRate)}/month{s.discountPct ? ` · ${s.discountPct}% off first month` : ''}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text variant="meta">Pay today</Text>
                <Text style={{ fontFamily: fonts.bold, color: c.ink }}>{aed(s.payToday)}</Text>
              </View>
              <Button title="Reserve" style={{ paddingHorizontal: 28, height: 44 }}
                loading={reserve.isPending && reserve.variables === s.sizeSqf} disabled={reserve.isPending}
                onPress={() => reserve.mutate(s.sizeSqf)} />
            </View>
          </Card>
        ))}
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
      </Page>
    </Screen>
  );
}
