import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Box, Plus } from 'lucide-react-native';
import { Button, EmptyState, ErrorState, Heading, ListSkeleton, Screen, ScrollBody, Stack, UnitCard } from '@/components';
import { space } from '@/theme/tokens';
import { storageApi } from '@/api/storage';
import { plural } from '@/lib/format';

/** One card per unit, then book another or link one you already rent. */
export default function UnitsTab() {
  const router = useRouter();
  const q = useQuery({ queryKey: ['contracts'], queryFn: storageApi.contracts });
  const list = q.data ?? [];
  const unitCount = list.reduce((n, c) => n + Math.max(1, c.units.length), 0);

  return (
    <Screen>
      <ScrollBody refreshing={q.isRefetching} onRefresh={() => q.refetch()} contentStyle={{ paddingTop: 14 }}>
        {q.isLoading ? <ListSkeleton cards={2} /> : !q.data ? (
          <>
            <Heading title="My units" />
            <ErrorState title="Couldn't load your units" body="This is on us. Try again in a moment, or message us on WhatsApp." onRetry={() => q.refetch()} error={q.error} />
          </>
        ) : !list.length ? (
          <>
            <Heading title="My units" />
            <EmptyState
              icon={Box}
              title="No units yet"
              body="Pick a size, choose a date and you're in — about two minutes."
              primary={{ label: 'Find your perfect size', onPress: () => router.push('/book') }}
              secondary={{ label: 'Link a unit I already rent', onPress: () => router.push('/link-unit') }}
            />
          </>
        ) : (
          <>
            <Heading title="My units" lead={`${plural(unitCount, 'unit')} at PurpleBox Al Quoz`} />
            <Stack>
              {list.map((c) => (
                <UnitCard key={c.id} contract={c} onPress={() => router.push({ pathname: '/unit/[id]', params: { id: c.id } })} />
              ))}
            </Stack>
            <View style={{ gap: space[2], marginTop: 18 }}>
              <Button block variant="secondary" icon={Plus} title="Book another unit" onPress={() => router.push('/book')} />
              <Button block variant="ghost" title="Link a unit I already rent" onPress={() => router.push('/link-unit')} />
            </View>
          </>
        )}
      </ScrollBody>
    </Screen>
  );
}
