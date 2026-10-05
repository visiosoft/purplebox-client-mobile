import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Box, MessageCircle } from 'lucide-react-native';
import {
  Button, EmptyState, ErrorState, GridSkeleton, Heading, Progress, Screen, ScrollBody, SizeCard, StickyFooter, Text, TopBar,
} from '@/components';
import { space } from '@/theme/tokens';
import { bookingApi } from '@/api/booking';
import { useBookingDraft } from '@/store/booking';
import { isoDay } from '@/lib/format';
import { openWhatsApp } from '@/lib/contact';

/** Step 1 · Pick a size: visual cards in a 2-column grid; the sticky button repeats the choice. */
export default function PickSize() {
  const router = useRouter();
  const { sizeSqf, startDate, months, set } = useBookingDraft();

  // A draft left open overnight must not ask for a day in the past.
  useEffect(() => { const t = isoDay(new Date()); if (startDate < t) set({ startDate: t }); }, [startDate, set]);

  const q = useQuery({ queryKey: ['sizes', startDate, months], queryFn: () => bookingApi.sizes(startDate, months) });
  const sizes = q.data ?? [];
  const selected = sizes.find((s) => s.sizeSqf === sizeSqf);

  const rows: (typeof sizes)[] = [];
  for (let i = 0; i < sizes.length; i += 2) rows.push(sizes.slice(i, i + 2));

  const full = q.data && !sizes.length;
  return (
    <Screen>
      <TopBar title="Book a unit" />
      <ScrollBody refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
        <Progress value={0.25} />
        <Heading title="Find your size" lead="PurpleBox Al Quoz, Dubai" style={{ marginBottom: space[4] }} />
        {q.isLoading ? <GridSkeleton /> : !q.data ? (
          <ErrorState title="Couldn't load prices" body="Nothing has been booked. Try again in a moment, or ask us on WhatsApp." onRetry={() => q.refetch()} error={q.error} />
        ) : full ? (
          <EmptyState
            icon={Box}
            title="We're full right now"
            body="Every size is taken for these dates. Message us and we'll tell you the moment one frees up."
            primary={{ label: 'Chat on WhatsApp', icon: MessageCircle, onPress: () => openWhatsApp("Hi PurpleBox, I'd like a storage unit — please tell me when one frees up.") }}
          />
        ) : (
          <>
            <View accessibilityRole="radiogroup" style={{ gap: space[3] }}>
              {rows.map((row) => (
                <View key={row[0].sizeSqf} style={{ flexDirection: 'row', gap: space[3] }}>
                  {row.map((s) => (
                    <SizeCard
                      key={s.sizeSqf}
                      sqft={s.sizeSqf}
                      monthly={s.monthlyRate}
                      left={s.available}
                      selected={s.sizeSqf === sizeSqf}
                      note={s.discountPct ? `${s.discountPct}% off your first month` : undefined}
                      onPress={() => set({ sizeSqf: s.sizeSqf })}
                    />
                  ))}
                  {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
                </View>
              ))}
            </View>
            <Text variant="caption" tone="muted" style={{ marginTop: space[3] }}>Monthly prices before 5% VAT.</Text>
            <Button block variant="ghost" icon={MessageCircle} title="Not sure? Ask us on WhatsApp" style={{ marginTop: space[3] }}
              onPress={() => openWhatsApp("Hi PurpleBox, I'm not sure which storage size I need.")} />
          </>
        )}
      </ScrollBody>
      {q.data && !full ? (
        <StickyFooter>
          <Button
            block
            title={selected ? `Continue with ${selected.sizeSqf} sqft` : 'Choose a size'}
            disabled={!selected}
            onPress={() => router.push('/book/when')}
          />
        </StickyFooter>
      ) : null}
    </Screen>
  );
}
