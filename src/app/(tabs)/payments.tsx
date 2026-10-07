import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, FileText } from 'lucide-react-native';
import { Button, Card, Screen, TabHeader, Text } from '@/components/ui';
import { LineChart, MetricPills, Page, Row, RowIcon, Segmented, StatusChip, invoiceTone } from '@/components/bits';
import { PaymentRow, openDocument, storageApi } from '@/api/storage';
import { aed, shortDate } from '@/lib/format';

/** Totals paid in each of the last six calendar months, oldest first. */
function byMonth(payments: PaymentRow[]) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
  return {
    labels: months.map((m) => m.toLocaleDateString('en-GB', { month: 'short' })),
    points: months.map((m) => payments
      .filter((p) => { const d = new Date(p.paidDate); return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth(); })
      .reduce((s, p) => s + p.amount, 0)),
  };
}

export default function PaymentsTab() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'due' | 'history'>('due');
  const invoices = useQuery({ queryKey: ['invoices'], queryFn: storageApi.invoices });
  const payments = useQuery({ queryKey: ['payments'], queryFn: storageApi.payments });

  const refresh = () => Promise.all(['home', 'invoices', 'payments', 'documents'].map((k) => qc.invalidateQueries({ queryKey: [k] })));

  // Stripe confirms payment to the server by webhook; the app only opens the page, then re-reads.
  const pay = useMutation({
    mutationFn: async (id: string) => {
      const { url } = await storageApi.pay(id);
      await WebBrowser.openBrowserAsync(url);
    },
    onSettled: () => { refresh(); },
    onError: (e: Error) => Alert.alert('Payment', e.message),
  });

  const all = invoices.data ?? [];
  const open = all.filter((i) => i.balanceDue > 0);
  const total = open.reduce((s, i) => s + i.balanceDue, 0);
  const paid = payments.data ?? [];
  const chart = useMemo(() => byMonth(payments.data ?? []), [payments.data]);

  return (
    <Screen>
      <TabHeader title="Payments" />
      <Page loading={invoices.isLoading} error={invoices.error?.message} refreshing={invoices.isRefetching} onRefresh={refresh}>
        <Card style={{ gap: 18 }}>
          <View style={{ gap: 2 }}>
            <Text variant="meta">Balance due</Text>
            <Text variant="display">{aed(total)}</Text>
          </View>
          <MetricPills items={[
            { label: 'Open', value: `${open.length} invoice${open.length === 1 ? '' : 's'}`, tone: open.length ? 'accent' : 'light' },
            { label: 'Overdue', value: String(all.filter((i) => i.status === 'overdue').length), tone: 'dark' },
            { label: 'Paid', value: String(all.filter((i) => i.status === 'paid').length), tone: 'hatch' },
          ]} />
        </Card>

        <Segmented value={tab} onChange={setTab} options={[{ value: 'due', label: 'Invoices' }, { value: 'history', label: 'History' }]} />

        {tab === 'due' ? (
          <Card style={{ paddingVertical: 10 }}>
            {all.length === 0 ? <Text color="ink2" style={{ paddingVertical: 10 }}>No invoices yet.</Text> : null}
            {all.map((i) => (
              <View key={i.id}>
                <Row leading={<RowIcon icon={FileText} />} title={i.invoiceNo} sub={`Due ${shortDate(i.dueDate)} · ${aed(i.total)}`}
                  onPress={() => openDocument({ href: `/customer-portal/storage/invoices/${i.id}/pdf`, title: i.invoiceNo }).catch((e) => Alert.alert('Invoice', e.message))}
                  right={<StatusChip label={i.status} tone={invoiceTone(i.status)} />} />
                {i.balanceDue > 0 ? (
                  <Button title={`Pay ${aed(i.balanceDue)}`} variant={i.status === 'overdue' ? 'primary' : 'accent'} icon={CreditCard}
                    loading={pay.isPending && pay.variables === i.id} onPress={() => pay.mutate(i.id)} style={{ height: 46, marginBottom: 8 }} />
                ) : null}
              </View>
            ))}
          </Card>
        ) : (
          <Card variant="dark" style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text variant="title" color="onDk">Payment history</Text>
              <Text variant="h1" color="onDk">{paid.length}</Text>
            </View>
            {paid.length ? <LineChart points={chart.points} labels={chart.labels} format={aed} /> : null}
            <View>
              {paid.length === 0 ? <Text color="onDk2">No payments yet.</Text> : null}
              {paid.map((p) => (
                <Row key={p.id} dark leading={<RowIcon icon={CreditCard} dark />} title={aed(p.amount)} sub={`${shortDate(p.paidDate)} · ${p.contractNo}`}
                  onPress={() => openDocument({ href: `/customer-portal/storage/payments/${p.id}/receipt`, title: `receipt-${p.id}` }).catch((e) => Alert.alert('Receipt', e.message))}
                  right={<Text variant="meta" color="onDk3" style={{ textTransform: 'capitalize' }}>{p.method || 'Receipt'}</Text>} />
              ))}
            </View>
          </Card>
        )}
      </Page>
    </Screen>
  );
}
