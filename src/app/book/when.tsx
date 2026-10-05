import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Banner, BannerText, Button, Calendar, Card, Heading, Progress, Screen, ScrollBody, SectionHead, StickyFooter, SuggestionChip, Text, TopBar,
} from '@/components';
import { space } from '@/theme/tokens';
import { TERMS, bookingApi } from '@/api/booking';
import { useBookingDraft } from '@/store/booking';
import { addDays, bookingEnd, fromIsoDay, plural, shortDate, startOfToday } from '@/lib/format';

/** Latest move-in the server accepts: 30 days after today in UTC (it counts days in UTC). */
const lastStart = () => {
  const now = new Date();
  const utcToday = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const local = addDays(startOfToday(), 30);
  const utc = addDays(utcToday, 30);
  return local < utc ? local : utc;
};

/** Step 2 · Move-in day and how long, with the end date in plain words. */
export default function When() {
  const router = useRouter();
  const { sizeSqf, startDate, months, set } = useBookingDraft();
  const q = useQuery({ queryKey: ['sizes', startDate, months], queryFn: () => bookingApi.sizes(startDate, months) });
  const start = fromIsoDay(startDate);
  const end = bookingEnd(start, months);
  // The chosen size may be taken for this particular day or length.
  const gone = !!q.data && !!sizeSqf && !q.data.some((s) => s.sizeSqf === sizeSqf);

  return (
    <Screen>
      <TopBar title="Book a unit" />
      <ScrollBody>
        <Progress value={0.5} />
        <Heading title="When do you move in?" style={{ marginBottom: space[3] }} />
        {gone ? (
          <Banner tone="warn" style={{ marginBottom: space[3] }} action={{ label: 'Choose another size', onPress: () => router.back() }}>
            <BannerText bold={`${sizeSqf} sqft is full for ${shortDate(start)}.`}>Pick another day or length, or go back and choose a size.</BannerText>
          </Banner>
        ) : null}
        <Card style={{ padding: space[4] }}>
          <Calendar value={startDate} onChange={(d) => set({ startDate: d })} min={startOfToday()} max={lastStart()} />
        </Card>
        <SectionHead title="How long?" />
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          {TERMS.map((m) => (
            <SuggestionChip key={m} radio label={plural(m, 'month')} selected={months === m} onPress={() => set({ months: m })} />
          ))}
        </View>
        <Text variant="caption" tone="muted" style={{ marginTop: 14 }}>
          {shortDate(start)} to {shortDate(end)}. We bill every 4 weeks, so a month here is 28 days.
        </Text>
      </ScrollBody>
      <StickyFooter>
        <Button block title="Continue" disabled={gone || q.isLoading} onPress={() => router.push('/book/review')} />
      </StickyFooter>
    </Screen>
  );
}
