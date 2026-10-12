import { useMemo, useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { CreditCard, FileText } from 'lucide-react-native';
import { Button, Card, Screen, TabHeader, Text } from '@/components/ui';
import { LineChart, MetricPills, Page, Row, RowIcon, Segmented, StatusChip } from '@/components/bits';
import { openDocument } from '@/api/storage';
import { BillInvoice, BillPayment, useBilling } from '@/hooks/useBilling';
import { payInApp } from '@/lib/payInApp';
import { aed, daysUntil, shortDate } from '@/lib/format';
import { WHATSAPP } from '@/lib/contact';

/** Totals paid in each of the last six calendar months, oldest first. */
function byMonth(payments: BillPayment[]) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
  return {
    labels: months.map((m) => m.toLocaleDateString('en-GB', { month: 'short' })),
    points: months.map((m) => payments
      .filter((p) => { const d = new Date(p.date); return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth(); })
      .reduce((s, p) => s + p.amount, 0)),
  };
}

const dueText = (i: BillInvoice) => {
  const d = daysUntil(i.dueDate);
  if (i.state === 'overdue') return `Overdue since ${shortDate(i.dueDate)}`;
  if (d === 0) return 'Due today';
  return d !== null && d <= 14 ? `Due in ${d} day${d === 1 ? '' : 's'} · ${shortDate(i.dueDate)}` : `Due ${shortDate(i.dueDate)}`;
};

export default function PaymentsTab() {
  const [tab, setTab] = useState<'due' | 'history'>('due');
  const b = useBilling();

  // Stripe confirms payment to the server by webhook, which then updates Zoho Books; so look again shortly after.
  const pay = useMutation({
    mutationFn: (inv: BillInvoice) => {
      if (!inv.payId) throw new Error('Online payment is not set up for this invoice yet. Please message us and we will send you a payment link.');
      return payInApp({ kind: 'invoice', id: inv.payId, label: `Pay ${aed(inv.balance)}` });
    },
    onSuccess: (r) => { if (r === 'paid') Alert.alert('Payment received', 'Thank you! It will show under History in a moment.'); },
    onSettled: () => { b.refetch(); setTimeout(b.refetch, 4000); },
    onError: (e: Error) => Alert.alert('Payment', e.message, e.message.includes('message us') ? [{ text: 'WhatsApp', onPress: () => Linking.openURL(WHATSAPP) }, { text: 'OK' }] : undefined),
  });

  const open = [...b.overdue, ...b.upcoming];
  const chart = useMemo(() => byMonth(b.payments), [b.payments]);
  const view = (i: BillInvoice) => openDocument({ href: i.pdfHref, title: i.number }).catch((e) => Alert.alert('Invoice', e.message));

  const invoiceRow = (i: BillInvoice) => (
    <View key={i.id}>
      <Row leading={<RowIcon icon={FileText} />} title={`${i.number} · ${aed(i.balance)}`} sub={dueText(i)} onPress={() => view(i)}
        right={<StatusChip label={i.state === 'overdue' ? 'Overdue' : i.partial ? 'Part paid' : 'Upcoming'} tone={i.state === 'overdue' ? 'err' : 'warn'} />} />
      <Button title={`Pay ${aed(i.balance)}`} variant={i.state === 'overdue' ? 'primary' : 'accent'} icon={CreditCard}
        loading={pay.isPending && pay.variables?.id === i.id} disabled={pay.isPending} onPress={() => pay.mutate(i)} style={{ height: 46, marginBottom: 8 }} />
    </View>
  );

  return (
    <Screen>
      <TabHeader title="Payments" />
      <Page loading={b.loading} error={b.error} refreshing={b.refreshing} onRefresh={b.refetch}>
        <Card style={{ gap: 18 }}>
          <View style={{ gap: 2 }}>
            <Text variant="meta">Balance due</Text>
            <Text variant="display">{aed(b.outstanding)}</Text>
            {b.upcoming.length ? <Text variant="meta">Next: {aed(b.upcoming[0].balance)} on {shortDate(b.upcoming[0].dueDate)}</Text> : null}
          </View>
          <MetricPills items={[
            { label: 'Upcoming', value: String(b.upcoming.length), tone: b.upcoming.length ? 'accent' : 'light' },
            { label: 'Overdue', value: String(b.overdue.length), tone: 'dark' },
            { label: 'Paid', value: String(b.paid.length), tone: 'hatch' },
          ]} />
        </Card>

        <Segmented value={tab} onChange={setTab} options={[{ value: 'due', label: 'To pay' }, { value: 'history', label: 'History' }]} />

        {tab === 'due' ? (
          <>
            {b.overdue.length ? (
              <Card style={{ paddingVertical: 10 }}>
                <Text variant="overline" color="ink3" style={{ marginTop: 6 }}>OVERDUE · {b.overdue.length}</Text>
                {b.overdue.map(invoiceRow)}
              </Card>
            ) : null}
            {b.upcoming.length ? (
              <Card style={{ paddingVertical: 10 }}>
                <Text variant="overline" color="ink3" style={{ marginTop: 6 }}>UPCOMING · {b.upcoming.length}</Text>
                {b.upcoming.map(invoiceRow)}
              </Card>
            ) : null}
            {open.length === 0 ? (
              <Card style={{ gap: 6 }}>
                <Text variant="h3">You’re all paid up</Text>
                <Text color="ink2">New invoices appear here as soon as we issue them.</Text>
              </Card>
            ) : null}
          </>
        ) : (
          <>
            <Card variant="dark" style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text variant="title" color="onDk">Total paid</Text>
                <Text variant="h1" color="onDk">{aed(b.totalPaid)}</Text>
              </View>
              {b.payments.length ? <LineChart points={chart.points} labels={chart.labels} format={aed} /> : null}
              {b.payments.length === 0 ? <Text color="onDk2">No payments yet.</Text> : null}
              {b.payments.map((p) => (
                <Row key={p.id} dark leading={<RowIcon icon={CreditCard} dark />} title={aed(p.amount)}
                  sub={`${shortDate(p.date)}${p.invoiceNumbers ? ` · ${p.invoiceNumbers}` : ''}`}
                  onPress={p.href ? () => openDocument({ href: p.href!, title: 'Receipt' }).catch((e) => Alert.alert('Receipt', e.message)) : undefined}
                  right={<Text variant="meta" color="onDk3" style={{ textTransform: 'capitalize' }}>{p.method || 'Paid'}</Text>} />
              ))}
            </Card>
            {b.paid.length ? (
              <Card style={{ paddingVertical: 10 }}>
                <Text variant="overline" color="ink3" style={{ marginTop: 6 }}>PAID INVOICES · {b.paid.length}</Text>
                {b.paid.map((i) => (
                  <Row key={i.id} leading={<RowIcon icon={FileText} />} title={`${i.number} · ${aed(i.total)}`} sub={`Issued ${shortDate(i.date)}`} onPress={() => view(i)}
                    right={<StatusChip label="Paid" tone="ok" />} />
                ))}
              </Card>
            ) : null}
          </>
        )}
      </Page>
    </Screen>
  );
}
