import { useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ImageIcon, Info, Truck } from 'lucide-react-native';
import { Button, Card, Screen, Text, TopBar } from '@/components/ui';
import { Page } from '@/components/bits';
import { Code, ItemStatusChip, categoryLabel } from '@/components/service';
import { itemPhoto, servicesApi } from '@/api/services';
import { shortDate } from '@/lib/format';
import { tr, useI18n } from '@/i18n';
import { useTheme } from '@/theme/useTheme';
import { radius } from '@/theme/tokens';

const CONDITION: Record<string, string> = { GOOD: 'Good', WORN: 'Worn', DAMAGED: 'Damaged' };
const PHOTO_H = 260;

export default function ItemDetail() {
  const router = useRouter();
  const { c } = useTheme();
  const { t } = useI18n();
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
            <Photos id={it.id} hasPhoto={it.hasPhoto} />
            <View style={{ gap: 8 }}>
              <ItemStatusChip status={it.status} />
              <Text variant="h2">{it.name}</Text>
              {it.contents ? <Text color="ink2">{it.contents}</Text> : null}
            </View>
            <Card style={{ gap: 12 }}>
              <Spec k={t('Label')} v={<Code>{it.label}</Code>} />
              <Spec k={t('Type')} v={categoryLabel(it.category)} />
              {dims ? <Spec k={t('Dimensions')} v={dims} /> : null}
              {it.weight ? <Spec k={t('Weight')} v={t('{n} kg', { n: it.weight })} /> : null}
              {it.condition ? <Spec k={t('Condition')} v={CONDITION[it.condition] ? t(CONDITION[it.condition]) : it.condition} /> : null}
              <Spec k={t('Stored since')} v={it.storedAt ? shortDate(it.storedAt) : '—'} />
            </Card>

            {it.history.length ? (
              <Card style={{ gap: 0 }}>
                <Text variant="title" style={{ marginBottom: 10 }}>{t('History')}</Text>
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
              <Button title={t('Request delivery')} icon={Truck} onPress={() => router.push({ pathname: '/service/new', params: { type: 'dropoff', items: it.id } })} />
            ) : (
              <View style={{ flexDirection: 'row', gap: 10, backgroundColor: c.sf2, borderRadius: radius.tile, padding: 12 }}>
                <Info color={c.ink2} size={18} strokeWidth={1.6} />
                <Text variant="meta" color="ink2" style={{ flex: 1 }}>{note(it.status)}</Text>
              </View>
            )}
          </>
        ) : null}
      </Page>
    </Screen>
  );
}

const note = (s: string) => {
  if (s === 'expected') return tr('This label hasn’t been checked in yet. It appears as in storage once we collect it.');
  if (s === 'out') return tr('This item was delivered to you and has left our storage.');
  return tr('This item is already booked for delivery.');
};

/** Every photo staff took at intake, swiped through. Falls back to the newest one on a server without the photo list. */
function Photos({ id, hasPhoto }: { id: string; hasPhoto: boolean }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const w = width - 32;
  const list = useQuery({ queryKey: ['item-photos', id], queryFn: () => servicesApi.itemPhotos(id), enabled: hasPhoto, retry: false });
  const [page, setPage] = useState(0);
  const photos = list.data?.length ? list.data : null;

  const frame = { height: PHOTO_H, borderRadius: radius.card, overflow: 'hidden' as const, backgroundColor: c.sf2, alignItems: 'center' as const, justifyContent: 'center' as const };
  if (!hasPhoto) return <View style={frame}><ImageIcon color={c.ink3} size={48} strokeWidth={1.2} /></View>;
  if (!photos || photos.length === 1) {
    return <View style={frame}><Image source={itemPhoto(id, photos?.[0].id)} style={{ width: '100%', height: PHOTO_H }} contentFit="cover" transition={200} /></View>;
  }
  return (
    <View style={{ gap: 8 }}>
      <View style={frame}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / w))}>
          {photos.map((p) => (
            <Image key={p.id} source={itemPhoto(id, p.id)} style={{ width: w, height: PHOTO_H }} contentFit="cover" transition={200}
              accessibilityLabel={tr('Photo from {date}', { date: shortDate(p.at) })} />
          ))}
        </ScrollView>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        {photos.map((p, i) => <View key={p.id} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i === page ? c.ink : c.ln2 }} />)}
      </View>
    </View>
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
