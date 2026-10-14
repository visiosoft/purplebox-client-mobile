import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, ChevronRight } from 'lucide-react-native';
import { Card, Screen, TabHeader, Text } from '@/components/ui';
import { Page, Segmented } from '@/components/bits';
import { IconTile, RequestRow, SERVICE_ICON, knownService } from '@/components/service';
import { isOpen, servicesApi } from '@/api/services';
import { aed } from '@/lib/format';
import { useTheme } from '@/theme/useTheme';

export default function ServicesTab() {
  const router = useRouter();
  const { c } = useTheme();
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const catalog = useQuery({ queryKey: ['service-catalog'], queryFn: servicesApi.catalog, staleTime: 10 * 60_000 });
  const q = useQuery({ queryKey: ['services'], queryFn: servicesApi.list });
  const all = q.data ?? [];
  const active = all.filter((r) => isOpen(r.status));
  const shown = tab === 'active' ? active : all.filter((r) => !isOpen(r.status));

  return (
    <Screen>
      <TabHeader title="Services" />
      <Page loading={catalog.isLoading} error={catalog.error?.message ?? q.error?.message}
        refreshing={q.isRefetching} onRefresh={() => { q.refetch(); catalog.refetch(); }}>
        <Card style={{ paddingVertical: 10 }}>
          <Text variant="title" style={{ paddingTop: 6, paddingBottom: 4 }}>Book a service</Text>
          {(catalog.data?.services ?? []).filter((s) => knownService(s.type)).map((s, i) => (
            <Pressable key={s.type} onPress={() => router.push({ pathname: '/service/new', params: { type: s.type } })} accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, opacity: pressed ? 0.7 : 1, borderTopWidth: i ? 1 : 0, borderTopColor: c.ln })}>
              <IconTile icon={SERVICE_ICON[s.type]} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="title" style={{ fontSize: 15 }}>{s.title}</Text>
                <Text variant="meta">{s.type === 'worker' ? s.sub : `${s.sub} · from ${aed(s.from)}`}</Text>
              </View>
              <ChevronRight color={c.ink3} size={18} strokeWidth={1.6} />
            </Pressable>
          ))}
        </Card>

        <Segmented value={tab} onChange={setTab} options={[{ value: 'active', label: `Active (${active.length})` }, { value: 'history', label: 'History' }]} />

        {shown.length ? (
          <Card style={{ paddingVertical: 4 }}>
            {shown.map((r) => <RequestRow key={r.id} r={r} onPress={() => router.push({ pathname: '/service/[id]', params: { id: r.id } })} />)}
          </Card>
        ) : !q.isLoading ? (
          <View style={{ alignItems: 'center', gap: 8, padding: 28, borderRadius: 28, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.ln2 }}>
            <CalendarCheck color={c.ink3} size={28} strokeWidth={1.4} />
            <Text variant="title">{tab === 'active' ? 'Nothing scheduled' : 'No past requests'}</Text>
            <Text variant="meta" style={{ textAlign: 'center' }}>{tab === 'active' ? 'Book a pickup, a delivery or a helping hand above.' : 'Completed and cancelled requests show up here.'}</Text>
          </View>
        ) : null}
      </Page>
    </Screen>
  );
}
