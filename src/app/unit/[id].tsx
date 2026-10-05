import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, FileText, IdCard, MessageCircle, Receipt, Truck } from 'lucide-react-native';
import {
  Banner, BannerText, Card, DetailSkeleton, ErrorState, IconButton, KVCard, ListRow, RowCard, Screen, ScrollBody,
  SectionHead, StatusChip, Text, Tile, TopBar, contractChip, toast, unitMeta, unitNumbers,
} from '@/components';
import { useTheme } from '@/theme/useTheme';
import { fonts, space } from '@/theme/tokens';
import { docHref, openDocument, storageApi, type Contract } from '@/api/storage';
import { aed, aed2, monthlyRate, plural, shortDate, weeklyRate } from '@/lib/format';
import { openWhatsApp } from '@/lib/contact';

/** Everything about one unit: hero, the rental in plain terms, contract / invoices / documents, then change or end. */
export default function UnitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { c } = useTheme();
  const q = useQuery({
    queryKey: ['contract', id],
    queryFn: () => storageApi.contract(id),
    initialData: () => qc.getQueryData<Contract[]>(['contracts'])?.find((x) => x.id === id),
  });
  const home = useQuery({ queryKey: ['home'], queryFn: storageApi.home });
  const [opening, setOpening] = useState(false);
  const k = q.data;

  const contractPdf = async () => {
    if (!k) return;
    setOpening(true);
    try { await openDocument({ href: docHref.contract(k.id), title: k.contractNo }); }
    catch { toast("Couldn't open the agreement — try again"); }
    finally { setOpening(false); }
  };

  const label = k ? unitNumbers(k) : '';
  // Invoices aren't tied to a unit in the app's data, so only say "N to pay" when there is one unit.
  const single = (home.data?.contracts.length ?? 0) === 1;
  const owing = home.data?.outstanding.invoices.filter((i) => i.balanceDue > 0).length ?? 0;
  const chip = k ? contractChip(k.status) : null;

  return (
    <Screen>
      <TopBar right={k ? <IconButton icon={MessageCircle} label="Chat about this unit" onPress={() => openWhatsApp(`Hi PurpleBox, a question about unit ${label}.`)} /> : undefined} />
      <ScrollBody refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
        {q.isLoading ? <DetailSkeleton /> : !k ? (
          <ErrorState title="Couldn't open this unit" body="Try again, or message us and we'll sort it out." onRetry={() => q.refetch()} error={q.error} />
        ) : (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space[3], marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Text variant="caption" tone="muted" style={{ fontFamily: fonts.semibold }}>Your unit</Text>
                <Text style={{ fontFamily: fonts.extrabold, fontSize: 44, lineHeight: 50, letterSpacing: -0.88, direction: 'ltr' }} accessibilityRole="header">{label}</Text>
                <Text tone="muted">{[unitMeta(k), 'Al Quoz'].filter(Boolean).join(' · ')}</Text>
              </View>
              {chip ? <StatusChip kind={chip.kind} label={chip.label} /> : null}
            </View>

            {k.status === 'pending_signature' ? (
              <Banner tone="warn" style={{ marginTop: 18 }} action={{ label: 'Ask for the signing link', onPress: () => openWhatsApp(`Hi PurpleBox, please send me the signing link for agreement ${k.contractNo}.`) }}>
                <BannerText bold="Your agreement isn't signed yet.">We'll send you a link to sign it on WhatsApp.</BannerText>
              </Banner>
            ) : null}

            <SectionHead title="Your rental" />
            <KVCard rows={[
              { label: 'Started', value: shortDate(k.startDate) },
              { label: 'Ends', value: shortDate(k.endDate) },
              { label: 'Monthly', value: `${aed(monthlyRate(k))} + VAT` },
              k.billingPeriod === 'weekly' ? { label: 'Paid weekly', value: `${aed2(weeklyRate(k))} + VAT` } : null,
              k.nextPaymentDate ? { label: 'Next payment', value: shortDate(k.nextPaymentDate) } : null,
              k.deposit > 0 ? { label: 'Advance held', value: aed2(k.deposit) } : null,
              { label: 'Agreement no.', value: k.contractNo },
            ]} />

            <RowCard style={{ marginTop: space[3] }}>
              <ListRow
                icon={FileText}
                title="Contract"
                sub={k.signed ? 'Signed · PDF' : 'Not signed yet · PDF'}
                onPress={contractPdf}
                chevron={!opening}
                end={opening ? <ActivityIndicator size="small" color={c.brand500} /> : undefined}
              />
              <ListRow icon={Receipt} title="Invoices" sub={single ? (owing ? `${plural(owing, 'invoice')} to pay` : 'All paid') : 'See your bills'} chevron onPress={() => router.navigate('/(tabs)/billing')} />
              <ListRow icon={IdCard} title="Documents" sub="Agreements, invoices and receipts" chevron onPress={() => router.push('/documents')} />
            </RowCard>

            <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[3] }}>
              <Card
                onPress={() => openWhatsApp(`Hi PurpleBox, I'd like to arrange a move for unit ${label}.`)}
                style={{ flex: 1, gap: 10 }}
                accessibilityLabel="Request a move on WhatsApp"
              >
                <Tile icon={Truck} />
                <Text style={{ fontFamily: fonts.bold }}>Request a move</Text>
                <Text variant="caption" tone="muted">On WhatsApp</Text>
              </Card>
              {k.status === 'active' ? (
                <Card onPress={() => router.push({ pathname: '/change/[id]', params: { id: k.id } })} style={{ flex: 1, gap: 10 }}>
                  <Tile icon={ArrowLeftRight} />
                  <Text style={{ fontFamily: fonts.bold }}>Change or end rental</Text>
                </Card>
              ) : <View style={{ flex: 1 }} />}
            </View>
          </>
        )}
      </ScrollBody>
    </Screen>
  );
}
