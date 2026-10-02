import { useState } from 'react';
import { Alert, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Screen, Text } from '@/components/ui';
import { Page, Row, Segmented, StatusChip, invoiceTone } from '@/components/bits';
import { openDocument, storageApi } from '@/api/storage';
import { aed, shortDate } from '@/lib/format';

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

  const open = (invoices.data ?? []).filter((i) => i.balanceDue > 0);
  const total = open.reduce((s, i) => s + i.balanceDue, 0);

  return (
    <Screen style={{ paddingTop: 56 }}>
      <Page loading={invoices.isLoading} error={invoices.error?.message} refreshing={invoices.isRefetching} onRefresh={refresh}>
        <Text variant="h1">Payments</Text>
        <Card style={{ gap: 4 }}>
          <Text variant="meta">Balance due</Text>
          <Text variant="h2">{aed(total)}</Text>
        </Card>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'due', label: 'Invoices' }, { value: 'history', label: 'History' }]} />

        {tab === 'due' ? (
          <View>
            {(invoices.data ?? []).length === 0 ? <Text color="ink2">No invoices yet.</Text> : null}
            {(invoices.data ?? []).map((i) => (
              <View key={i.id}>
                <Row title={i.invoiceNo} sub={`Due ${shortDate(i.dueDate)}`}
                  onPress={() => openDocument({ href: `/customer-portal/storage/invoices/${i.id}/pdf`, title: i.invoiceNo }).catch((e) => Alert.alert('Invoice', e.message))}
                  right={<View style={{ alignItems: 'flex-end', gap: 4 }}><Text style={{ fontWeight: '700' }}>{aed(i.total)}</Text><StatusChip label={i.status} tone={invoiceTone(i.status)} /></View>} />
                {i.balanceDue > 0 ? (
                  <Button title={`Pay ${aed(i.balanceDue)}`} variant="soft" loading={pay.isPending && pay.variables === i.id} onPress={() => pay.mutate(i.id)} style={{ marginVertical: 8 }} />
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <View>
            {(payments.data ?? []).length === 0 ? <Text color="ink2">No payments yet.</Text> : null}
            {(payments.data ?? []).map((p) => (
              <Row key={p.id} title={aed(p.amount)} sub={`${shortDate(p.paidDate)} · ${p.contractNo}`}
                onPress={() => openDocument({ href: `/customer-portal/storage/payments/${p.id}/receipt`, title: `receipt-${p.id}` }).catch((e) => Alert.alert('Receipt', e.message))}
                right={<StatusChip label="Receipt" tone="ok" />} />
            ))}
          </View>
        )}
      </Page>
    </Screen>
  );
}
