import { useState } from 'react';
import { Alert, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useMutation } from '@tanstack/react-query';
import { CreditCard, FileText, Receipt } from 'lucide-react-native';
import { Button, Card, Screen, TabHeader, Text } from '@/components/ui';
import { LineChart, MetricPills, Page, Row, RowIcon, Segmented, StatusChip, invoiceTone } from '@/components/bits';
import { openDocument, storageApi } from '@/api/storage';
import { Inv, Pay, useBilling } from '@/hooks/useBilling';
import { aed, shortDate } from '@/lib/format';

/** Totals paid in each of the last six calendar months, oldest first. */
function byMonth(payments: Pay[]) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
  return {
    labels: months.map((m) => m.toLocaleDateString('en-GB', { month: 'short' })),
    points: months.map((m) => payments
      .filter((p) => { const d = new Date(p.date); return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth(); })
      .reduce((s, p) => s + p.amount, 0)),
  };
}

export default function PaymentsTab() {
  const [tab, setTab] = useState<'due' | 'history'>('due');
  const { zoho, list, paid, open, due, totalPaid, loading, error, refreshing, refresh } = useBilling();

  // Stripe confirms payment to the server by webhook; the app only opens the page, then re-reads.
  const pay = useMutation({
    mutationFn: async (inv: Inv) => {
      const url = inv.localId ? (await storageApi.pay(inv.localId)).url : inv.payUrl;
      if (!url) throw new Error('This invoice can’t be paid in the app yet. Message us and we’ll send a payment link.');
      await WebBrowser.openBrowserAsync(url);
    },
    onSettled: () => { refresh(); },
    onError: (e: Error) => Alert.alert('Payment', e.message),
  });

  const chart = byMonth(paid);

  return (
    <Screen>
      <TabHeader title="Payments" />
      <Page loading={loading} error={error} refreshing={refreshing} onRefresh={refresh}>
        <Card style={{ gap: 18 }}>
          <View style={{ gap: 2 }}>
            <Text variant="meta">Paid so far</Text>
            <Text variant="display">{aed(totalPaid)}</Text>
            <Text variant="meta">{paid.length ? `Across ${paid.length} payment${paid.length === 1 ? '' : 's'}` : 'No payments yet'}</Text>
          </View>
          <MetricPills items={[
            { label: 'Balance due', value: aed(due), tone: due > 0 ? 'accent' : 'light' },
            { label: 'Open', value: `${open.length} invoice${open.length === 1 ? '' : 's'}`, tone: 'dark' },
            { label: 'Overdue', value: String(list.filter((i) => i.status === 'overdue').length), tone: 'hatch' },
          ]} />
        </Card>

        <Segmented value={tab} onChange={setTab} options={[{ value: 'due', label: 'Invoices' }, { value: 'history', label: 'Payments' }]} />

        {tab === 'due' ? (
          <Card style={{ paddingVertical: 10 }}>
            {list.length === 0 ? <Text color="ink2" style={{ paddingVertical: 10 }}>No invoices yet.</Text> : null}
            {list.map((i) => (
              <View key={i.id}>
                <Row leading={<RowIcon icon={FileText} />} title={i.number} sub={`Due ${shortDate(i.dueDate)} · ${aed(i.total)}`}
                  onPress={() => openDocument({ href: i.pdf, title: i.number }).catch((e) => Alert.alert('Invoice', e.message))}
                  right={<StatusChip label={i.status.replace(/_/g, ' ')} tone={invoiceTone(i.status)} />} />
                {i.balance > 0 && (i.localId || i.payUrl) ? (
                  <Button title={`Pay ${aed(i.balance)}`} variant={i.status === 'overdue' ? 'primary' : 'accent'} icon={CreditCard}
                    loading={pay.isPending && pay.variables?.id === i.id} onPress={() => pay.mutate(i)} style={{ height: 46, marginBottom: 8 }} />
                ) : null}
              </View>
            ))}
          </Card>
        ) : (
          <Card variant="dark" style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text variant="title" color="onDk">Payment history</Text>
              <Text variant="h2" color="onDk">{aed(totalPaid)}</Text>
            </View>
            {paid.length ? <LineChart points={chart.points} labels={chart.labels} format={aed} /> : null}
            <View>
              {paid.length === 0 ? <Text color="onDk2">No payments yet.</Text> : null}
              {paid.map((p) => (
                <Row key={p.id} dark leading={<RowIcon icon={p.receipt ? Receipt : CreditCard} dark />} title={aed(p.amount)} sub={p.sub}
                  onPress={p.receipt ? () => openDocument({ href: p.receipt!, title: `receipt-${p.id}` }).catch((e) => Alert.alert('Receipt', e.message)) : undefined}
                  right={<Text variant="meta" color="onDk3" style={{ textTransform: 'capitalize' }}>{p.right}</Text>} />
              ))}
            </View>
          </Card>
        )}
        {zoho ? <Text variant="meta" style={{ textAlign: 'center' }}>From our accounts in Zoho Books</Text> : null}
      </Page>
    </Screen>
  );
}
