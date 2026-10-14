import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Calculator, CalendarClock, FileSignature, FileText, LogIn, LogOut, Package, Plus, Receipt, Undo2, CreditCard, Truck, X, type LucideIcon,
} from 'lucide-react-native';
import { Button, Card, IconButton, Screen, TabHeader, Text } from '@/components/ui';
import { useRequests, REQUEST_LABEL } from '@/store/requests';
import { Meter, Page, Row, RowIcon, Segmented, StatusChip } from '@/components/bits';
import { bookingApi } from '@/api/booking';
import { Contract, DocItem, openDocument, storageApi } from '@/api/storage';
import { SERVICE_LABEL, STATUS_LABEL, servicesApi, whenLabel } from '@/api/services';
import { ItemsPanel } from '@/components/ItemsPanel';
import { SERVICE_ICON } from '@/components/service';
import { useTheme } from '@/theme/useTheme';
import { aed, daysUntil, monthlyRate, shortDate, termProgress } from '@/lib/format';

const DOC_ICON = { agreement: FileSignature, invoice: FileText, receipt: Receipt } as const;

function Documents() {
  const q = useQuery({ queryKey: ['documents'], queryFn: storageApi.documents });
  const groups: [string, DocItem[]][] = [
    ['Contracts', q.data?.agreements ?? []], ['Invoices', q.data?.invoices ?? []], ['Receipts', q.data?.receipts ?? []],
  ];
  if (q.isLoading) return <Text color="ink2">Loading…</Text>;
  if (groups.every(([, items]) => !items.length)) return <Text color="ink2">No documents yet.</Text>;
  return (
    <View style={{ gap: 14 }}>
      {groups.map(([title, items]) => items.length ? (
        <Card key={title} style={{ paddingVertical: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
            <Text variant="title">{title}</Text>
            <Text variant="h3" color="ink3">{items.length}</Text>
          </View>
          {items.map((d) => (
            <Row key={d.id} leading={<RowIcon icon={DOC_ICON[d.kind]} />} title={d.title} sub={shortDate(d.date)}
              onPress={() => openDocument(d).catch((e) => Alert.alert('Document', e.message))}
              right={d.amount !== undefined ? <Text variant="meta" color="ink">{aed(d.amount)}</Text> : d.status ? <StatusChip label={d.status.replace('_', ' ')} /> : undefined} />
          ))}
        </Card>
      ) : null)}
    </View>
  );
}

// A contract waiting for a signature is finished through its booking; if there isn't one, the team can help.
async function signPending(router: ReturnType<typeof useRouter>) {
  try {
    const b = await bookingApi.current();
    if (b && b.state === 'ready_to_sign') router.push({ pathname: '/book/sign', params: { id: b.bookingId } });
    else Alert.alert('Sign contract', 'We could not find a contract ready to sign. Please message us and we will sort it out.');
  } catch (e: any) { Alert.alert('Sign contract', e.message); }
}

/** Small labelled action under a unit. */
function UnitAction({ icon: Icon, label, onPress, primary }: { icon: typeof Package; label: string; onPress: () => void; primary?: boolean }) {
  return <Button title={label} icon={Icon} variant={primary ? 'accent' : 'soft'} onPress={onPress} style={{ flex: 1, height: 44, paddingHorizontal: 10 }} />;
}

type Event = { icon: LucideIcon; title: string; sub: string; at: string; state: 'done' | 'current' | 'future'; onPress?: () => void };

/** What has happened with the storage, newest last: agreements, services, and the check-out still to come. */
function Activity({ contracts }: { contracts: Contract[] }) {
  const router = useRouter();
  const { c } = useTheme();
  const services = useQuery({ queryKey: ['services'], queryFn: servicesApi.list });
  const [now] = useState(() => Date.now());
  const events: Event[] = [
    ...contracts.flatMap((k): Event[] => [
      { icon: LogIn, title: 'Moved in', sub: `${k.units.map((u) => u.unitNumber).join(', ')} · ${k.contractNo}`, at: k.startDate, state: new Date(k.startDate).getTime() <= now ? 'done' : 'future' },
      ...(k.status === 'active' ? [{ icon: CalendarClock, title: 'Scheduled check-out', sub: 'End of current agreement term', at: k.endDate, state: 'future' as const }] : []),
    ]),
    ...(services.data ?? []).filter((r) => r.status !== 'cancelled').map((r): Event => ({
      icon: SERVICE_ICON[r.type], title: r.status === 'completed' ? SERVICE_LABEL[r.type] ?? 'Service' : `${SERVICE_LABEL[r.type] ?? 'Service'} · ${STATUS_LABEL[r.status].toLowerCase()}`,
      sub: `${r.ref} · ${whenLabel(r)}`, at: r.date, state: r.status === 'completed' ? 'done' : 'current',
      onPress: () => router.push({ pathname: '/service/[id]', params: { id: r.id } }),
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  if (!events.length) return null;
  return (
    <Card style={{ gap: 0 }}>
      <Text variant="title" style={{ marginBottom: 12 }}>Activity</Text>
      {events.map((e, i) => (
        <Pressable key={`${e.title}-${i}`} onPress={e.onPress} disabled={!e.onPress} style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ alignItems: 'center' }}>
            <View style={{
              width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
              backgroundColor: e.state === 'done' ? c.acSoft : e.state === 'current' ? c.warnBg : 'transparent',
              borderWidth: e.state === 'future' ? 1.5 : 0, borderStyle: 'dashed', borderColor: c.ln2,
            }}>
              <e.icon color={e.state === 'current' ? c.warn : c.ink2} size={17} strokeWidth={1.6} />
            </View>
            {i < events.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 12, backgroundColor: c.ln }} /> : null}
          </View>
          <View style={{ flex: 1, paddingBottom: 14, gap: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text variant="title" style={{ fontSize: 15, flex: 1 }}>{e.title}</Text>
              <Text variant="meta">{shortDate(e.at)}</Text>
            </View>
            <Text variant="meta">{e.sub}</Text>
          </View>
        </Pressable>
      ))}
    </Card>
  );
}

export default function StorageTab() {
  const router = useRouter();
  const { c } = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();
  const insets = useSafeAreaInsets();
  const [picked, setTab] = useState<'unit' | 'items' | 'documents' | null>(null);
  // a shortcut can open straight to Items or Documents
  const tab = picked ?? (params.tab === 'documents' || params.tab === 'items' ? params.tab : 'unit');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const q = useQuery({ queryKey: ['contracts'], queryFn: storageApi.contracts });
  const invoices = useQuery({ queryKey: ['invoices'], queryFn: storageApi.invoices });
  const requests = useRequests((s) => s.items);
  const owing = (invoices.data ?? []).some((i) => i.balanceDue > 0);

  return (
    <Screen>
      <TabHeader title="My storage" right={<IconButton icon={Plus} label="Book a unit" tone="accent" onPress={() => router.push('/book')} />} />
      <Page loading={q.isLoading} error={q.error?.message} refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'unit', label: 'Unit' }, { value: 'items', label: 'Items' }, { value: 'documents', label: 'Documents' }]} />
        {tab === 'documents' ? <Documents /> : tab === 'items' ? (
          <ItemsPanel selected={selected} onToggle={toggle} onSelectAll={(ids) => setSelected(new Set(ids))} />
        ) : (
          <>
            {(q.data ?? []).length === 0 ? <Text color="ink2">No storage contracts on your account yet.</Text> : null}
            {(q.data ?? []).map((k) => {
              const left = daysUntil(k.endDate);
              const p = termProgress(k);
              const color = k.status === 'active' ? (p > 0.85 ? c.warn : c.ok) : k.status === 'ended' ? c.ink3 : c.warn;
              const sent = requests.filter((r) => r.contractId === k.id);
              return (
                <Card key={k.id} style={{ gap: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <RowIcon icon={Package} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="title">{k.units.map((u) => u.unitNumber).join(', ')}</Text>
                      <Text variant="meta">{k.contractNo}</Text>
                      <Text variant="meta" color="ink">{aed(monthlyRate(k))} / month</Text>
                    </View>
                    <StatusChip label={k.status.replace('_', ' ')} tone={k.status === 'active' ? 'ok' : k.status === 'ended' ? 'neutral' : 'warn'} />
                  </View>
                  <View style={{ gap: 10 }}>
                    <Text variant="meta" color="ink">
                      {k.status === 'active' && left !== null && left > 0 ? `${left} days left` : k.status.replace('_', ' ')}
                    </Text>
                    <Meter value={p} color={color} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="meta">In {shortDate(k.startDate)}</Text>
                      <Text variant="meta">Out {shortDate(k.endDate)}</Text>
                    </View>
                  </View>
                  {sent.map((r) => (
                    <StatusChip key={r.id} tone="brand" label={`${REQUEST_LABEL[r.kind]} · ${shortDate(new Date(r.at).toISOString())}`} />
                  ))}
                  {k.status === 'pending_signature' ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <UnitAction primary icon={FileSignature} label="Sign contract" onPress={() => signPending(router)} />
                    </View>
                  ) : k.status === 'active' ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {owing ? <UnitAction primary icon={CreditCard} label="Pay" onPress={() => router.navigate('/(tabs)/payments')} /> : null}
                      <UnitAction icon={FileText} label="Documents" onPress={() => setTab('documents')} />
                      <UnitAction icon={LogOut} label="Move out" onPress={() => router.push({ pathname: '/checkout', params: { contractId: k.id } })} />
                    </View>
                  ) : k.status === 'ended' ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <UnitAction primary icon={Undo2} label="Request refund" onPress={() => router.push({ pathname: '/refund', params: { contractId: k.id } })} />
                      <UnitAction icon={FileText} label="Documents" onPress={() => setTab('documents')} />
                    </View>
                  ) : null}
                </Card>
              );
            })}
            <Button title={(q.data ?? []).length ? 'Book another unit' : 'Book a unit'} icon={Plus} onPress={() => router.push('/book')} />
            <Button title="Estimate the space I need" variant="soft" icon={Calculator} onPress={() => router.push('/estimator')} />
            <Activity contracts={q.data ?? []} />
          </>
        )}
      </Page>
      {/* Picking items raises a footer above the tab bar to send them home. */}
      {tab === 'items' && selected.size ? (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom, 12) + 88, flexDirection: 'row', gap: 10 }}>
          <IconButton icon={X} label="Clear selection" size={52} onPress={() => setSelected(new Set())} />
          <Button title={`Request delivery for ${selected.size} item${selected.size === 1 ? '' : 's'}`} icon={Truck} style={{ flex: 1 }}
            onPress={() => { router.push({ pathname: '/service/new', params: { type: 'dropoff', items: [...selected].join(',') } }); setSelected(new Set()); }} />
        </View>
      ) : null}
    </Screen>
  );
}
