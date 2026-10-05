import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Check, Receipt } from 'lucide-react-native';
import {
  Banner, BannerText, Button, Card, EmptyState, ErrorState, Heading, InvoicePaySheet, ListRow, ListSkeleton, RowCard,
  Screen, ScrollBody, SectionHead, StatusChip, Text, invoiceChip, toast,
} from '@/components';
import { useTheme } from '@/theme/useTheme';
import { fonts, space } from '@/theme/tokens';
import { docHref, openDocument, storageApi, type Invoice } from '@/api/storage';
import { aed2, monthYear, shortDate } from '@/lib/format';

const tileTone = (s: Invoice['status']) => (s === 'paid' ? 'ok' : s === 'overdue' ? 'bad' : 'due') as 'ok' | 'bad' | 'due';
const title = (i: Invoice) => i.subject || `Invoice ${i.invoiceNo}`;

function InvoiceRow({ i, onPress }: { i: Invoice; onPress: () => void }) {
  const { c } = useTheme();
  const chip = invoiceChip(i.status);
  const unpaid = i.balanceDue > 0;
  return (
    <ListRow
      icon={Receipt}
      tone={tileTone(i.status)}
      title={title(i)}
      sub={unpaid ? `Due ${shortDate(i.dueDate)} · ${i.invoiceNo}` : `Issued ${shortDate(i.invoiceDate)} · ${i.invoiceNo}`}
      onPress={onPress}
      end={(
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ fontFamily: fonts.bold, color: c.ink }}>{aed2(unpaid ? i.balanceDue : i.total)}</Text>
          <StatusChip kind={chip.kind} label={chip.label} small />
        </View>
      )}
    />
  );
}

/** Unpaid pinned at the top with one Pay button; history grouped by month; receipts below. */
export default function BillingTab() {
  const router = useRouter();
  const { c } = useTheme();
  const invoices = useQuery({ queryKey: ['invoices'], queryFn: storageApi.invoices });
  const payments = useQuery({ queryKey: ['payments'], queryFn: storageApi.payments });
  const [payId, setPayId] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const refresh = () => { invoices.refetch(); payments.refetch(); };
  const all = invoices.data ?? [];
  const unpaid = all.filter((i) => i.balanceDue > 0).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const paid = all.filter((i) => i.balanceDue <= 0);
  const toPay = unpaid.reduce((s, i) => s + i.balanceDue, 0);
  const first = unpaid[0];
  const months = paid.reduce<[string, Invoice[]][]>((acc, i) => {
    const m = monthYear(i.invoiceDate);
    const g = acc.find(([k]) => k === m);
    if (g) g[1].push(i); else acc.push([m, [i]]);
    return acc;
  }, []);
  const open = (id: string) => router.push({ pathname: '/invoice/[id]', params: { id } });

  const receipt = async (id: string, contractNo: string) => {
    setOpening(id);
    try { await openDocument({ href: docHref.receipt(id), title: `receipt-${contractNo}-${id.slice(-4)}` }); }
    catch { toast("Couldn't download — try again"); }
    finally { setOpening(null); }
  };

  return (
    <Screen>
      <ScrollBody refreshing={invoices.isRefetching} onRefresh={refresh} contentStyle={{ paddingTop: 14 }}>
        {invoices.isLoading ? <ListSkeleton /> : !invoices.data ? (
          <>
            <Heading title="Billing" />
            <ErrorState title="Couldn't load your bills" body="Nothing is lost. Try again in a moment." onRetry={refresh} error={invoices.error} />
          </>
        ) : !all.length ? (
          <>
            <Heading title="Billing" />
            <EmptyState
              icon={Receipt}
              title="No bills yet"
              body="Your first invoice shows up here after you book."
              primary={{ label: 'Find your perfect size', onPress: () => router.push('/book') }}
            />
          </>
        ) : (
          <>
            <Heading title="Billing" style={{ marginBottom: space[3] }} />
            {first ? (
              <Card>
                <Text variant="caption" tone="muted" style={{ fontFamily: fonts.semibold }}>To pay</Text>
                <Text variant="amount" style={{ marginTop: 4, marginBottom: space[3] }}>{aed2(toPay)}</Text>
                {unpaid.map((i, n) => (
                  <View key={i.id} style={n > 0 ? { borderTopWidth: 1, borderTopColor: c.line } : null}>
                    <InvoiceRow i={i} onPress={() => open(i.id)} />
                  </View>
                ))}
                <Button
                  block
                  variant={first.status === 'overdue' ? 'danger' : 'primary'}
                  title={unpaid.length > 1 ? `Pay ${first.invoiceNo} · ${aed2(first.balanceDue)}` : `Pay ${aed2(first.balanceDue)}`}
                  onPress={() => setPayId(first.id)}
                  style={{ marginTop: space[2] }}
                />
                {unpaid.length > 1 ? (
                  <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: space[2] }}>Oldest first. Tap any invoice to pay it on its own.</Text>
                ) : null}
              </Card>
            ) : (
              <Banner tone="ok" icon={Check}><BannerText bold="All paid.">Nothing to pay right now.</BannerText></Banner>
            )}

            {months.map(([m, list]) => (
              <View key={m}>
                <SectionHead title={m} />
                <RowCard>{list.map((i) => <InvoiceRow key={i.id} i={i} onPress={() => open(i.id)} />)}</RowCard>
              </View>
            ))}

            {(payments.data ?? []).length ? (
              <>
                <SectionHead title="Receipts" />
                <RowCard>
                  {(payments.data ?? []).map((p) => (
                    <ListRow
                      key={p.id}
                      icon={Check}
                      tone="ok"
                      title={`Payment · ${p.contractNo}`}
                      sub={`Paid ${shortDate(p.paidDate)}${opening === p.id ? ' · opening…' : ''}`}
                      end={<Text style={{ fontFamily: fonts.bold }}>{aed2(p.amount)}</Text>}
                      chevron
                      onPress={() => receipt(p.id, p.contractNo)}
                      accessibilityLabel={`Receipt for ${aed2(p.amount)}, paid ${shortDate(p.paidDate)}`}
                    />
                  ))}
                </RowCard>
              </>
            ) : null}
          </>
        )}
      </ScrollBody>
      <InvoicePaySheet invoiceId={payId} visible={!!payId} onClose={() => setPayId(null)} onPaid={refresh} />
    </Screen>
  );
}
