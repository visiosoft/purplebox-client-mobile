import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Download, Share } from 'lucide-react-native';
import {
  Button, DetailSkeleton, ErrorState, IconButton, InvoicePaySheet, KVCard, Screen, ScrollBody, SectionHead, StatusChip,
  StickyFooter, Text, TopBar, invoiceChip, toast,
} from '@/components';
import { space } from '@/theme/tokens';
import { docHref, openDocument, storageApi } from '@/api/storage';
import { aed2, round2, shortDate } from '@/lib/format';

/** The amount is the hero; line items in plain words with VAT on its own line. */
export default function InvoiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['invoice', id], queryFn: () => storageApi.invoice(id) });
  const [paying, setPaying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const inv = q.data;

  const pdf = async () => {
    if (!inv) return;
    setDownloading(true);
    try { await openDocument({ href: docHref.invoice(inv.id), title: inv.invoiceNo }); }
    catch { toast("Couldn't download — try again"); }
    finally { setDownloading(false); }
  };

  const unpaid = !!inv && inv.balanceDue > 0;
  const chip = inv ? invoiceChip(inv.status) : null;
  const items = inv?.items ?? [];
  const sub = inv?.subTotal ?? items.reduce((s, i) => s + i.amount, 0);
  const vat = inv && sub ? round2(inv.total - sub) : 0;
  const lastPaid = inv?.payments?.length ? inv.payments[inv.payments.length - 1] : null;

  return (
    <Screen>
      <TopBar title="Invoice" right={inv ? <IconButton icon={Share} label="Share invoice" onPress={pdf} /> : undefined} />
      <ScrollBody refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
        {q.isLoading ? <DetailSkeleton /> : !inv ? (
          <ErrorState title="Couldn't open this invoice" body="Try again, or ask us on WhatsApp for a copy." onRetry={() => q.refetch()} error={q.error} />
        ) : (
          <>
            <View style={{ marginTop: 6 }}>{chip ? <StatusChip kind={chip.kind} label={chip.label} /> : null}</View>
            <Text variant="amount" style={{ marginTop: 10, marginBottom: 2 }}>{aed2(unpaid ? inv.balanceDue : inv.total)}</Text>
            <Text tone="muted">{inv.subject || `Invoice ${inv.invoiceNo}`}{unpaid && inv.paymentMade > 0 ? ` · ${aed2(inv.balanceDue)} left of ${aed2(inv.total)}` : ''}</Text>

            <KVCard style={{ marginTop: 18 }} rows={[
              unpaid
                ? { label: 'Due', value: shortDate(inv.dueDate), valueTone: inv.status === 'overdue' ? 'danger' : undefined }
                : { label: 'Paid on', value: lastPaid ? shortDate(lastPaid.date) : 'Paid' },
              { label: 'Issued', value: shortDate(inv.invoiceDate) },
              { label: 'Invoice no.', value: inv.invoiceNo },
              !unpaid && lastPaid?.method ? { label: 'Paid with', value: lastPaid.method.replace(/_/g, ' ') } : null,
            ]} />

            <SectionHead title="What it's for" />
            <KVCard rows={[
              ...items.map((it) => ({ label: it.quantity > 1 ? `${it.itemDetails} × ${it.quantity}` : it.itemDetails, value: aed2(it.amount) })),
              vat > 0.004 ? { label: 'VAT 5%', value: aed2(vat) } : null,
              { label: 'Total', value: aed2(inv.total), total: true },
              inv.paymentMade > 0 && unpaid ? { label: 'Paid so far', value: aed2(inv.paymentMade), valueTone: 'muted' as const } : null,
              inv.paymentMade > 0 && unpaid ? { label: 'Left to pay', value: aed2(inv.balanceDue) } : null,
            ]} />
            {unpaid && inv.cardFeePct ? (
              <Text variant="caption" tone="muted" style={{ marginTop: space[3] }}>A {inv.cardFeePct}% card fee is added when you pay by card.</Text>
            ) : null}
          </>
        )}
      </ScrollBody>
      {inv ? (
        <StickyFooter>
          {unpaid ? (
            <Button block variant={inv.status === 'overdue' ? 'danger' : 'primary'} title={`Pay ${aed2(inv.balanceDue)}`} onPress={() => setPaying(true)} />
          ) : (
            <View style={{ flexDirection: 'row', gap: space[3] }}>
              <Button variant="secondary" icon={Download} title="Download" loading={downloading} onPress={pdf} style={{ flex: 1, paddingHorizontal: space[4] }} />
              <Button icon={Share} title="Share" onPress={pdf} disabled={downloading} style={{ flex: 1, paddingHorizontal: space[4] }} />
            </View>
          )}
        </StickyFooter>
      ) : null}
      <InvoicePaySheet invoiceId={id} visible={paying} onClose={() => setPaying(false)} onPaid={() => q.refetch()} />
    </Screen>
  );
}
