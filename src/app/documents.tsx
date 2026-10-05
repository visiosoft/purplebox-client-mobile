import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { FileText, IdCard, MessageCircle, Receipt } from 'lucide-react-native';
import {
  Button, Card, EmptyState, ErrorState, ListRow, ListSkeleton, RowCard, Screen, ScrollBody, SectionHead, Text, TopBar, Tile, toast,
} from '@/components';
import { useTheme } from '@/theme/useTheme';
import { fonts, space } from '@/theme/tokens';
import { openDocument, storageApi, type DocItem } from '@/api/storage';
import { aed2, shortDate } from '@/lib/format';
import { openWhatsApp } from '@/lib/contact';

const ID_MESSAGE = 'Hi PurpleBox, here is my Emirates ID for my storage account.';

/** No upload API yet, so IDs go to us on WhatsApp. */
function SendIdCard() {
  const { c } = useTheme();
  return (
    <Card variant="lav" style={{ gap: space[3] }}>
      <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
        <Tile icon={IdCard} bg={c.surfaceCard} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 }}>Emirates ID</Text>
          <Text variant="caption" tone="muted" style={{ fontFamily: fonts.regular }}>We need a copy before move-in.</Text>
        </View>
      </View>
      <Button block variant="secondary" sm icon={MessageCircle} title="Send your Emirates ID on WhatsApp" onPress={() => openWhatsApp(ID_MESSAGE)} />
    </Card>
  );
}

/** Agreements, invoices and receipts we generated, each opened as a PDF. */
export default function Documents() {
  const { c } = useTheme();
  const q = useQuery({ queryKey: ['documents'], queryFn: storageApi.documents });
  const [opening, setOpening] = useState<string | null>(null);

  const open = async (d: DocItem) => {
    setOpening(d.id);
    try { await openDocument(d); } catch { toast("Couldn't download — try again"); } finally { setOpening(null); }
  };

  const groups: [string, DocItem[], typeof FileText][] = q.data ? [
    ['Agreements', q.data.agreements, FileText],
    ['Invoices', q.data.invoices, Receipt],
    ['Receipts', q.data.receipts, Receipt],
  ] : [];
  const empty = q.data && groups.every(([, items]) => !items.length);

  const sub = (d: DocItem) => [
    d.kind === 'agreement' ? (d.status === 'signed' ? 'Signed' : d.status === 'pending_signature' ? 'Not signed yet' : null) : null,
    d.date ? shortDate(d.date) : null,
    d.amount !== undefined ? aed2(d.amount) : null,
    'PDF',
  ].filter(Boolean).join(' · ');

  return (
    <Screen>
      <TopBar title="Documents" />
      <ScrollBody refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
        {q.isLoading ? <ListSkeleton title={false} /> : !q.data ? (
          <ErrorState title="Couldn't load your documents" body="Try again in a moment." onRetry={() => q.refetch()} error={q.error} />
        ) : empty ? (
          <EmptyState
            icon={IdCard}
            title="Keep your papers in one place"
            body="Your agreement, invoices and receipts appear here after you book. We need a copy of your Emirates ID before move-in — send it to us on WhatsApp."
            primary={{ label: 'Send your Emirates ID on WhatsApp', icon: MessageCircle, onPress: () => openWhatsApp(ID_MESSAGE) }}
          />
        ) : (
          <>
            <SendIdCard />
            {groups.map(([title, items, icon]) => (items.length ? (
              <View key={title}>
                <SectionHead title={title} />
                <RowCard>
                  {items.map((d) => (
                    <ListRow
                      key={d.id}
                      icon={icon}
                      tone={d.kind === 'receipt' ? 'ok' : 'brand'}
                      title={d.title}
                      sub={sub(d)}
                      onPress={() => open(d)}
                      accessibilityLabel={`Open ${d.title}`}
                      end={opening === d.id ? <ActivityIndicator size="small" color={c.brand500} /> : <Text style={{ fontFamily: fonts.bold, color: c.brand500 }}>Open</Text>}
                    />
                  ))}
                </RowCard>
              </View>
            ) : null))}
          </>
        )}
      </ScrollBody>
    </Screen>
  );
}
