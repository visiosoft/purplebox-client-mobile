import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calculator, FileSignature, FileText, LogOut, Package, Plus, Receipt, Undo2, CreditCard } from 'lucide-react-native';
import { Button, Card, IconButton, Screen, TabHeader, Text } from '@/components/ui';
import { useRequests, REQUEST_LABEL } from '@/store/requests';
import { Meter, Page, Row, RowIcon, Segmented, StatusChip } from '@/components/bits';
import { bookingApi } from '@/api/booking';
import { DocItem, openDocument, storageApi } from '@/api/storage';
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

export default function StorageTab() {
  const router = useRouter();
  const { c } = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [picked, setTab] = useState<'unit' | 'documents' | null>(null);
  const tab = picked ?? (params.tab === 'documents' ? 'documents' : 'unit'); // a shortcut can open straight to Documents
  const q = useQuery({ queryKey: ['contracts'], queryFn: storageApi.contracts });
  const invoices = useQuery({ queryKey: ['invoices'], queryFn: storageApi.invoices });
  const requests = useRequests((s) => s.items);
  const owing = (invoices.data ?? []).some((i) => i.balanceDue > 0);

  return (
    <Screen>
      <TabHeader title="My Units" right={<IconButton icon={Plus} label="Book a unit" tone="accent" onPress={() => router.push('/book')} />} />
      <Page loading={q.isLoading} error={q.error?.message} refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'unit', label: 'Units' }, { value: 'documents', label: 'Documents' }]} />
        {tab === 'documents' ? <Documents /> : (
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
          </>
        )}
      </Page>
    </Screen>
  );
}
