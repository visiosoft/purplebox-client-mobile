import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck } from 'lucide-react-native';
import { Card, Screen, TabHeader, Text } from '@/components/ui';
import { Page, Segmented } from '@/components/bits';
import { IconTile, RequestRow, SERVICE_ICON, knownService } from '@/components/service';
import { PAID_AT_BOOKING, isOpen, servicesApi, workerSub } from '@/api/services';
import { aed } from '@/lib/format';
import { useI18n } from '@/i18n';
import { useDir } from '@/i18n/useDir';
import { useTheme } from '@/theme/useTheme';

export default function ServicesTab() {
  const router = useRouter();
  const { c } = useTheme();
  const { t } = useI18n();
  const { ChevronForward } = useDir();
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const catalog = useQuery({ queryKey: ['service-catalog'], queryFn: servicesApi.catalog, staleTime: 10 * 60_000 });
  const q = useQuery({ queryKey: ['services'], queryFn: servicesApi.list });
  const all = q.data ?? [];
  const active = all.filter((r) => isOpen(r.status));
  const shown = tab === 'active' ? active : all.filter((r) => !isOpen(r.status));
  // Deliveries need items in our storage; an older server sends no flag, so offer everything as before.
  const valet = catalog.data?.valet?.active ?? true;
  const offered = (catalog.data?.services ?? []).filter((s) => knownService(s.type) && (valet || !PAID_AT_BOOKING.includes(s.type)));

  return (
    <Screen>
      <TabHeader title={t('Services')} />
      <Page loading={catalog.isLoading} error={catalog.error?.message ?? q.error?.message}
        refreshing={q.isRefetching} onRefresh={() => { q.refetch(); catalog.refetch(); }}>
        <Card style={{ paddingVertical: 10 }}>
          <Text variant="title" style={{ paddingTop: 6, paddingBottom: 4 }}>{t('Book a service')}</Text>
          {offered.map((s, i) => (
            <Pressable key={s.type} onPress={() => router.push({ pathname: '/service/new', params: { type: s.type } })} accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, opacity: pressed ? 0.7 : 1, borderTopWidth: i ? 1 : 0, borderTopColor: c.ln })}>
              <IconTile icon={SERVICE_ICON[s.type]} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="title" style={{ fontSize: 15 }}>{t(s.title)}</Text>
                <Text variant="meta">{s.type === 'worker' && catalog.data ? workerSub(catalog.data.prices) : t('{sub} · from {price}', { sub: t(s.sub), price: aed(s.from) })}</Text>
              </View>
              <ChevronForward color={c.ink3} size={18} strokeWidth={1.6} />
            </Pressable>
          ))}
        </Card>

        <Segmented value={tab} onChange={setTab} options={[{ value: 'active', label: t('Active ({n})', { n: active.length }) }, { value: 'history', label: t('History') }]} />

        {shown.length ? (
          <Card style={{ paddingVertical: 4 }}>
            {shown.map((r) => <RequestRow key={r.id} r={r} onPress={() => router.push({ pathname: '/service/[id]', params: { id: r.id } })} />)}
          </Card>
        ) : !q.isLoading ? (
          <View style={{ alignItems: 'center', gap: 8, padding: 28, borderRadius: 28, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.ln2 }}>
            <CalendarCheck color={c.ink3} size={28} strokeWidth={1.4} />
            <Text variant="title">{tab === 'active' ? t('Nothing scheduled') : t('No past requests')}</Text>
            <Text variant="meta" style={{ textAlign: 'center' }}>{tab === 'active' ? t('Book a pickup, a delivery or a helping hand above.') : t('Completed and cancelled requests show up here.')}</Text>
          </View>
        ) : null}
      </Page>
    </Screen>
  );
}
