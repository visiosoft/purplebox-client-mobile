import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ImageIcon, Info, Truck } from 'lucide-react-native';
import { Button, Card, Screen, Text, TopBar } from '@/components/ui';
import { Page } from '@/components/bits';
import { Code, ItemStatusChip, categoryLabel } from '@/components/service';
import { ITEM_STATUS_LABEL, itemPhoto, servicesApi } from '@/api/services';
import { shortDate } from '@/lib/format';
import { useTheme } from '@/theme/useTheme';
import { radius } from '@/theme/tokens';

const CONDITION: Record<string, string> = { GOOD: 'Good', WORN: 'Worn', DAMAGED: 'Damaged' };

export default function ItemDetail() {
  const router = useRouter();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['item', id], queryFn: () => servicesApi.item(id) });
  const it = q.data;
  const dims = it?.dims && [it.dims.length, it.dims.width, it.dims.height].every((n) => n != null)
    ? `${it.dims.length} × ${it.dims.width} × ${it.dims.height} cm` : null;

  return (
    <Screen>
      <TopBar />
      <Page loading={q.isLoading} error={q.error?.message} refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
        {it ? (
          <>
            <View style={{ height: 240, borderRadius: radius.card, overflow: 'hidden', backgroundColor: c.sf2, alignItems: 'center', justifyContent: 'center' }}>
              {it.hasPhoto
                ? <Image source={itemPhoto(it.id)} style={{ width: '100%', height: 240 }} contentFit="cover" transition={200} />
                : <ImageIcon color={c.ink3} size={48} strokeWidth={1.2} />}
            </View>
            <View style={{ gap: 8 }}>
              <ItemStatusChip status={it.status} />
              <Text variant="h2">{it.name}</Text>
              {it.contents ? <Text color="ink2">{it.contents}</Text> : null}
            </View>
            <Card style={{ gap: 12 }}>
              <Spec k="Label" v={<Code>{it.label}</Code>} />
              <Spec k="Type" v={categoryLabel(it.category)} />
              {dims ? <Spec k="Dimensions" v={dims} /> : null}
              {it.weight ? <Spec k="Weight" v={`${it.weight} kg`} /> : null}
              {it.condition ? <Spec k="Condition" v={CONDITION[it.condition] ?? it.condition} /> : null}
              <Spec k="Stored since" v={it.storedAt ? shortDate(it.storedAt) : '—'} />
            </Card>

            {it.history.length ? (
              <Card style={{ gap: 0 }}>
                <Text variant="title" style={{ marginBottom: 10 }}>History</Text>
                {it.history.map((h, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ alignItems: 'center', width: 14 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 5, backgroundColor: i === 0 ? c.ac : c.ln2 }} />
                      {i < it.history.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 18, backgroundColor: c.ln }} /> : null}
                    </View>
                    <View style={{ flex: 1, paddingBottom: 12 }}>
                      <Text>{h.text}</Text>
                      <Text variant="meta">{shortDate(h.at)}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            ) : null}

            {it.status === 'stored' ? (
              <Button title="Request delivery" icon={Truck} onPress={() => router.push({ pathname: '/service/new', params: { type: 'dropoff', items: it.id } })} />
            ) : (
              <View style={{ flexDirection: 'row', gap: 10, backgroundColor: c.sf2, borderRadius: radius.tile, padding: 12 }}>
                <Info color={c.ink2} size={18} strokeWidth={1.6} />
                <Text variant="meta" color="ink2" style={{ flex: 1 }}>
                  {it.status === 'expected' ? 'This label hasn’t been checked in yet. It appears as in storage once we collect it.'
                    : `${ITEM_STATUS_LABEL[it.status]} — it can be delivered again once it’s back in storage.`}
                </Text>
              </View>
            )}
          </>
        ) : null}
      </Page>
    </Screen>
  );
}

function Spec({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <Text variant="meta">{k}</Text>
      {typeof v === 'string' ? <Text>{v}</Text> : v}
    </View>
  );
}
