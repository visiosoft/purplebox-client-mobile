import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, Screen, Text } from '@/components/ui';
import { Page, Row, Segmented, StatusChip } from '@/components/bits';
import { DocItem, openDocument, storageApi } from '@/api/storage';
import { aed, daysUntil, monthlyRate, shortDate } from '@/lib/format';

function Documents() {
  const q = useQuery({ queryKey: ['documents'], queryFn: storageApi.documents });
  const groups: [string, DocItem[]][] = [
    ['Agreements', q.data?.agreements ?? []], ['Invoices', q.data?.invoices ?? []], ['Receipts', q.data?.receipts ?? []],
  ];
  if (q.isLoading) return <Text color="ink2">Loading…</Text>;
  return (
    <View style={{ gap: 18 }}>
      {groups.map(([title, items]) => items.length ? (
        <View key={title}>
          <Text variant="overline" color="ink3">{title}</Text>
          {items.map((d) => (
            <Row key={d.id} title={d.title} sub={shortDate(d.date)}
              onPress={() => openDocument(d).catch((e) => Alert.alert('Document', e.message))}
              right={d.amount !== undefined ? <Text style={{ fontWeight: '700' }}>{aed(d.amount)}</Text> : d.status ? <StatusChip label={d.status.replace('_', ' ')} /> : undefined} />
          ))}
        </View>
      ) : null)}
    </View>
  );
}

export default function StorageTab() {
  const [tab, setTab] = useState<'unit' | 'documents'>('unit');
  const q = useQuery({ queryKey: ['contracts'], queryFn: storageApi.contracts });

  return (
    <Screen style={{ paddingTop: 56 }}>
      <Page loading={q.isLoading} error={q.error?.message} refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
        <Text variant="h1">Storage</Text>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'unit', label: 'Unit' }, { value: 'documents', label: 'Documents' }]} />
        {tab === 'documents' ? <Documents /> : (
          <>
            {(q.data ?? []).length === 0 ? <Text color="ink2">No storage agreements on your account yet.</Text> : null}
            {(q.data ?? []).map((c) => {
              const left = daysUntil(c.endDate);
              return (
                <Card key={c.id} style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="h3">{c.units.map((u) => u.unitNumber).join(', ')}</Text>
                    <StatusChip label={c.status.replace('_', ' ')} tone={c.status === 'active' ? 'ok' : c.status === 'ended' ? 'neutral' : 'warn'} />
                  </View>
                  <Text variant="meta">{c.contractNo} · {aed(monthlyRate(c))}/month</Text>
                  <Text variant="meta">Check-in {shortDate(c.startDate)} · Check-out {shortDate(c.endDate)}{left !== null && left > 0 && c.status === 'active' ? ` (${left} days left)` : ''}</Text>
                </Card>
              );
            })}
          </>
        )}
      </Page>
    </Screen>
  );
}
