import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, CreditCard, FileText } from 'lucide-react-native';
import { Button, Card, Screen, TabHeader, Text } from '@/components/ui';
import { LineChart, MetricPills, Page, Row, RowIcon, Segmented, StatusChip } from '@/components/bits';
import { openDocument } from '@/api/storage';
import { autopayApi } from '@/api/profile';
import { BillInvoice, BillPayment, useBilling } from '@/hooks/useBilling';
import { payInApp } from '@/lib/payInApp';
import { aed, daysUntil, shortDate } from '@/lib/format';
import { WHATSAPP } from '@/lib/contact';
import { dateLocale, tr, useI18n } from '@/i18n';
import { useTheme } from '@/theme/useTheme';
import { useRouter } from 'expo-router';

/** Totals paid in each of the last six calendar months, oldest first. */
function byMonth(payments: BillPayment[]) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
  return {
    labels: months.map((m) => m.toLocaleDateString(dateLocale(), { month: 'short' })),
    points: months.map((m) => payments
      .filter((p) => { const d = new Date(p.date); return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth(); })
      .reduce((s, p) => s + p.amount, 0)),
  };
}

const dueText = (i: BillInvoice) => {
  const d = daysUntil(i.dueDate);
  const date = shortDate(i.dueDate);
  if (i.state === 'overdue') return tr('Overdue since {date}', { date });
  if (d === 0) return tr('Due today');
  if (d !== null && d <= 14) return d === 1 ? tr('Due in 1 day · {date}', { date }) : tr('Due in {n} days · {date}', { n: d, date });
  return tr('Due {date}', { date });
};

export default function PaymentsTab() {
  const [tab, setTab] = useState<'due' | 'history'>('due');
  const b = useBilling();
  const router = useRouter();
  const { c } = useTheme();
  const { t } = useI18n();
  // "Save my card" is the customer's explicit choice; it is only offered while auto-pay is not already set up.
  const autopay = useQuery({ queryKey: ['autopay'], queryFn: autopayApi.get, retry: false });
  const [autoSave, setAutoSave] = useState(false);
  const offerAutopay = !!autopay.data?.available && !autopay.data.enabled;

  // Stripe confirms payment to the server by webhook, which then updates Zoho Books; so look again shortly after.
  const pay = useMutation({
    mutationFn: (inv: BillInvoice) => {
      if (!inv.payId) throw Object.assign(new Error(t('Online payment is not set up for this invoice yet. Please message us and we will send you a payment link.')), { noLink: true });
      return payInApp({ kind: 'invoice', id: inv.payId, label: t('Pay {amount}', { amount: aed(inv.balance) }), saveCard: offerAutopay && autoSave, autopayConsent: offerAutopay && autoSave });
    },
    onSuccess: (r) => { if (r === 'paid') Alert.alert(t('Payment received'), t('Thank you! It will show under History in a moment.')); },
    onSettled: () => { b.refetch(); setTimeout(b.refetch, 4000); },
    onError: (e: Error & { noLink?: boolean }) => Alert.alert(t('Payment'), e.message, e.noLink || e.message.includes('message us') ? [{ text: 'WhatsApp', onPress: () => Linking.openURL(WHATSAPP) }, { text: t('OK') }] : undefined),
  });

  const open = [...b.overdue, ...b.upcoming];
  const chart = useMemo(() => byMonth(b.payments), [b.payments]);
  const view = (i: BillInvoice) => openDocument({ href: i.pdfHref, title: i.number }).catch((e) => Alert.alert(t('Invoice'), e.message));

  const invoiceRow = (i: BillInvoice) => (
    <View key={i.id}>
      <Row leading={<RowIcon icon={FileText} />} title={`${i.number} · ${aed(i.balance)}`} sub={dueText(i)} onPress={() => view(i)}
        right={<StatusChip label={i.state === 'overdue' ? t('Overdue') : i.partial ? t('Part paid') : t('Upcoming')} tone={i.state === 'overdue' ? 'err' : 'warn'} />} />
      <Button title={t('Pay {amount}', { amount: aed(i.balance) })} variant={i.state === 'overdue' ? 'primary' : 'accent'} icon={CreditCard}
        loading={pay.isPending && pay.variables?.id === i.id} disabled={pay.isPending} onPress={() => pay.mutate(i)} style={{ height: 46, marginBottom: 8 }} />
    </View>
  );

  return (
    <Screen>
      <TabHeader title={t('Payments')} />
      <Page loading={b.loading} error={b.error} refreshing={b.refreshing} onRefresh={b.refetch}>
        <Card style={{ gap: 18 }}>
          <View style={{ gap: 2 }}>
            <Text variant="meta">{t('Balance due')}</Text>
            <Text variant="display">{aed(b.outstanding)}</Text>
            {b.upcoming.length ? <Text variant="meta">{t('Next: {amount} on {date}', { amount: aed(b.upcoming[0].balance), date: shortDate(b.upcoming[0].dueDate) })}</Text> : null}
          </View>
          <MetricPills items={[
            { label: t('Upcoming'), value: String(b.upcoming.length), tone: b.upcoming.length ? 'accent' : 'light' },
            { label: t('Overdue'), value: String(b.overdue.length), tone: 'dark' },
            { label: t('Paid'), value: String(b.paid.length), tone: 'hatch' },
          ]} />
        </Card>

        <Segmented value={tab} onChange={setTab} options={[{ value: 'due', label: t('To pay') }, { value: 'history', label: t('History') }]} />

        {tab === 'due' && open.length && offerAutopay ? (
          <Pressable onPress={() => setAutoSave(!autoSave)} accessibilityRole="checkbox" accessibilityState={{ checked: autoSave }}
            style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: c.acSoft, borderRadius: 22, padding: 14 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: autoSave ? 0 : 1.5, borderColor: c.ln2, backgroundColor: autoSave ? c.ac : c.sf, alignItems: 'center', justifyContent: 'center' }}>
              {autoSave ? <Check color={c.acInk} size={15} strokeWidth={2.2} /> : null}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="title" style={{ fontSize: 15 }}>{t('Save my card and pay future invoices automatically')}</Text>
              <Text variant="meta" color="ink2">{autopay.data?.consentText}</Text>
            </View>
          </Pressable>
        ) : null}

        {tab === 'due' ? (
          <>
            {b.overdue.length ? (
              <Card style={{ paddingVertical: 10 }}>
                <Text variant="overline" color="ink3" style={{ marginTop: 6 }}>{t('OVERDUE · {n}', { n: b.overdue.length })}</Text>
                {b.overdue.map(invoiceRow)}
              </Card>
            ) : null}
            {b.upcoming.length ? (
              <Card style={{ paddingVertical: 10 }}>
                <Text variant="overline" color="ink3" style={{ marginTop: 6 }}>{t('UPCOMING · {n}', { n: b.upcoming.length })}</Text>
                {b.upcoming.map(invoiceRow)}
              </Card>
            ) : null}
            {open.length === 0 ? (
              <Card style={{ gap: 6 }}>
                <Text variant="h3">{t('You’re all paid up')}</Text>
                <Text color="ink2">{t('New invoices appear here as soon as we issue them.')}</Text>
              </Card>
            ) : null}
            <Button title={autopay.data?.card ? t('Auto-pay · {state} · card ••{last4}', { state: autopay.data.enabled ? t('on') : t('off'), last4: autopay.data.card.last4 }) : t('Set up auto-pay')} variant="soft" icon={CreditCard} onPress={() => router.push('/autopay')} />
          </>
        ) : (
          <>
            <Card variant="dark" style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text variant="title" color="onDk">{t('Total paid')}</Text>
                <Text variant="h1" color="onDk">{aed(b.totalPaid)}</Text>
              </View>
              {b.payments.length ? <LineChart points={chart.points} labels={chart.labels} format={aed} /> : null}
              {b.payments.length === 0 ? <Text color="onDk2">{t('No payments yet.')}</Text> : null}
              {b.payments.map((p) => (
                <Row key={p.id} dark leading={<RowIcon icon={CreditCard} dark />} title={aed(p.amount)}
                  sub={`${shortDate(p.date)}${p.invoiceNumbers ? ` · ${p.invoiceNumbers}` : ''}`}
                  onPress={p.href ? () => openDocument({ href: p.href!, title: t('Receipt') }).catch((e) => Alert.alert(t('Receipt'), e.message)) : undefined}
                  right={<Text variant="meta" color="onDk3" style={{ textTransform: 'capitalize' }}>{p.method || t('Paid')}</Text>} />
              ))}
            </Card>
            {b.paid.length ? (
              <Card style={{ paddingVertical: 10 }}>
                <Text variant="overline" color="ink3" style={{ marginTop: 6 }}>{t('PAID INVOICES · {n}', { n: b.paid.length })}</Text>
                {b.paid.map((i) => (
                  <Row key={i.id} leading={<RowIcon icon={FileText} />} title={`${i.number} · ${aed(i.total)}`} sub={t('Issued {date}', { date: shortDate(i.date) })} onPress={() => view(i)}
                    right={<StatusChip label={t('Paid')} tone="ok" />} />
                ))}
              </Card>
            ) : null}
          </>
        )}
      </Page>
    </Screen>
  );
}
