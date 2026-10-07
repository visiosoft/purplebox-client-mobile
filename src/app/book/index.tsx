import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Button, Card, IconButton, Screen, Text, TopBar } from '@/components/ui';
import { Page, Segmented, StatusChip } from '@/components/bits';
import { Term, bookingApi } from '@/api/booking';
import { ApiError } from '@/api/client';
import { aed, shortDate } from '@/lib/format';

const DAY = 86_400_000;
const isoDay = (offset: number) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);

export default function ChooseUnit() {
  const router = useRouter();
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
    <Screen>
      <TopBar title="Book a unit" />
      <Page loading={false} error={sizes.error?.message} refreshing={sizes.isRefetching} onRefresh={() => sizes.refetch()}>
        <Text color="ink2">Pick your dates and a size. We hold it for you while you pay.</Text>

        <Card style={{ gap: 14 }}>
          <Text variant="overline">Move-in date</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ opacity: offset <= 0 ? 0.3 : 1 }} pointerEvents={offset <= 0 ? 'none' : 'auto'}>
              <IconButton icon={ChevronLeft} label="Earlier" size={40} onPress={() => setOffset(offset - 1)} />
            </View>
            <Text variant="h3">{offset === 0 ? 'Today · ' : ''}{shortDate(start)}</Text>
            <View style={{ opacity: offset >= 30 ? 0.3 : 1 }} pointerEvents={offset >= 30 ? 'none' : 'auto'}>
              <IconButton icon={ChevronRight} label="Later" size={40} onPress={() => setOffset(offset + 1)} />
            </View>
          </View>
          <Text variant="overline">Term</Text>
          <Segmented value={String(months)} onChange={(v) => setMonths(Number(v) as Term)}
            options={[{ value: '1', label: '1 mo' }, { value: '3', label: '3 mo' }, { value: '6', label: '6 mo' }, { value: '12', label: '12 mo' }]} />
        </Card>

        {sizes.isLoading ? <Text color="ink2">Checking availability…</Text> : null}
        {sizes.data && sizes.data.length === 0 ? <Text color="ink2">No units are free for those dates. Try another date.</Text> : null}

        {(sizes.data ?? []).map((s) => (
          <Card key={s.sizeSqf} style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ gap: 2 }}>
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
