import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ArrowUpRight, FileSignature, FileText, Package, Plus, Receipt } from 'lucide-react-native';
import { Button, Card, IconButton, Screen, TabHeader, Text } from '@/components/ui';
import { Meter, Page, Row, RowIcon, Segmented, StatusChip } from '@/components/bits';
import { bookingApi } from '@/api/booking';
import { DocItem, openDocument, storageApi } from '@/api/storage';
import { useTheme } from '@/theme/useTheme';
import { aed, daysUntil, monthlyRate, shortDate, termProgress } from '@/lib/format';

const DOC_ICON = { agreement: FileSignature, invoice: FileText, receipt: Receipt } as const;

function Documents() {
  const q = useQuery({ queryKey: ['documents'], queryFn: storageApi.documents });
  const groups: [string, DocItem[]][] = [
    ['Agreements', q.data?.agreements ?? []], ['Invoices', q.data?.invoices ?? []], ['Receipts', q.data?.receipts ?? []],
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

// An agreement waiting for a signature is finished through its booking; if there isn't one, the team can help.
async function signPending(router: ReturnType<typeof useRouter>) {
  try {
    const b = await bookingApi.current();
    if (b && b.state === 'ready_to_sign') router.push({ pathname: '/book/sign', params: { id: b.bookingId } });
    else Alert.alert('Sign agreement', 'We could not find an agreement ready to sign. Please message us and we will sort it out.');
  } catch (e: any) { Alert.alert('Sign agreement', e.message); }
}

export default function StorageTab() {
  const router = useRouter();
  const { c } = useTheme();
  const [tab, setTab] = useState<'unit' | 'documents'>('unit');
  const q = useQuery({ queryKey: ['contracts'], queryFn: storageApi.contracts });

  return (
    <Screen>
      <TabHeader title="Storage" right={<IconButton icon={Plus} label="Book a unit" onPress={() => router.push('/book')} />} />
      <Page loading={q.isLoading} error={q.error?.message} refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'unit', label: 'Units' }, { value: 'documents', label: 'Documents' }]} />
        {tab === 'documents' ? <Documents /> : (
          <>
            {(q.data ?? []).length === 0 ? <Text color="ink2">No storage agreements on your account yet.</Text> : null}
            {(q.data ?? []).map((k) => {
              const left = daysUntil(k.endDate);
              const p = termProgress(k);
              const color = k.status === 'active' ? (p > 0.85 ? c.warn : c.ok) : k.status === 'ended' ? c.ink3 : c.warn;
              return (
                <Card key={k.id} style={{ gap: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <RowIcon icon={Package} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="title">{k.units.map((u) => u.unitNumber).join(', ')}</Text>
                      <Text variant="meta">{k.contractNo} · {aed(monthlyRate(k))}/month</Text>
                    </View>
                    <IconButton icon={ArrowUpRight} label="Documents" size={40} onPress={() => setTab('documents')} />
                  </View>
                  <View style={{ gap: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text variant="meta" color="ink">
                        {k.status === 'active' && left !== null && left > 0 ? `${left} days left` : k.status.replace('_', ' ')}
                      </Text>
                      <StatusChip label={k.status.replace('_', ' ')} tone={k.status === 'active' ? 'ok' : k.status === 'ended' ? 'neutral' : 'warn'} />
                    </View>
                    <Meter value={p} color={color} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="meta">In {shortDate(k.startDate)}</Text>
                      <Text variant="meta">Out {shortDate(k.endDate)}</Text>
                    </View>
                    {k.status === 'pending_signature' ? (
                      <Button title="Sign agreement" variant="accent" style={{ height: 46 }} onPress={() => signPending(router)} />
                    ) : k.status === 'active' ? (
                      <Button title="Request check-out" variant="soft" style={{ height: 46 }}
                        onPress={() => router.push({ pathname: '/checkout', params: { contractId: k.id } })} />
                    ) : k.status === 'ended' ? (
                      <Button title="Request refund" variant="soft" style={{ height: 46 }}
                        onPress={() => router.push({ pathname: '/refund', params: { contractId: k.id } })} />
                    ) : null}
                  </View>
                </Card>
              );
            })}
            <Button title={(q.data ?? []).length ? 'Book another unit' : 'Book a unit'} variant="soft" icon={Plus} onPress={() => router.push('/book')} />
          </>
        )}
      </Page>
    </Screen>
  );
}
