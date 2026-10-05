import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronRight, CreditCard, FileText, KeyRound, MessageCircle, PenLine, Receipt, Truck, WifiOff } from 'lucide-react-native';
import {
  Banner, BannerText, Button, Card, ErrorState, HomeSkeleton, Icon, InvoicePaySheet, ListRow, NeedsYouCard, Press, QuickActions,
  RowCard, Screen, ScrollBody, SectionHead, Text, Tile, UnitCard, unitNumbers,
} from '@/components';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius, space } from '@/theme/tokens';
import { storageApi, type Home, type Invoice } from '@/api/storage';
import { bookingApi, type Booking } from '@/api/booking';
import { useAuth } from '@/store/auth';
import { aed2, clockTime, daysUntil, firstName, greeting, initial, shortDate, todayLine } from '@/lib/format';
import { openWhatsApp } from '@/lib/contact';

function Greeting() {
  const router = useRouter();
  const { c } = useTheme();
  const name = useAuth((s) => s.customer?.fullName);
  const first = firstName(name);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3], marginTop: 6, marginBottom: 18 }}>
      <View style={{ flex: 1 }}>
        <Text variant="caption" tone="muted" style={{ fontFamily: fonts.semibold }}>{todayLine()}</Text>
        <Text variant="title1" accessibilityRole="header">{greeting()}{first ? `, ${first}` : ''}</Text>
      </View>
      <Press
        onPress={() => router.push('/account')}
        scaleTo={0.92}
        accessibilityRole="button"
        accessibilityLabel="Account"
        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.brand500, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontFamily: fonts.extrabold, fontSize: 16, lineHeight: 20, color: c.onBrand }}>{initial(name)}</Text>
      </Press>
    </View>
  );
}

type Needs =
  | { kind: 'invoice'; tone: 'due' | 'overdue'; invoice: Invoice }
  | { kind: 'booking'; booking: Booking }
  | null;

/** Exactly one thing: overdue invoice → due invoice → booking to sign → booking to pay. */
function pickNeeds(home: Home | undefined, booking: Booking | null | undefined): Needs {
  const open = [...(home?.outstanding.invoices ?? [])].filter((i) => i.balanceDue > 0)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const overdue = open.find((i) => i.status === 'overdue');
  if (overdue) return { kind: 'invoice', tone: 'overdue', invoice: overdue };
  if (open[0]) return { kind: 'invoice', tone: 'due', invoice: open[0] };
  if (booking && booking.state !== 'expired' && booking.state !== 'active') return { kind: 'booking', booking };
  return null;
}

const dueLine = (iso: string) => {
  const d = daysUntil(iso) ?? 0;
  return d <= 0 ? 'Due today' : d === 1 ? 'Due tomorrow' : `Due in ${d} days`;
};

function NeedsBlock({ needs, unitLabel, onPay }: { needs: Needs; unitLabel?: string; onPay: (id: string) => void }) {
  const router = useRouter();
  if (!needs) {
    return (
      <Banner tone="ok" icon={Check}>
        <BannerText bold="You're all set.">Nothing needs you right now.</BannerText>
      </Banner>
    );
  }
  if (needs.kind === 'invoice') {
    const i = needs.invoice;
    const what = i.subject || `Invoice ${i.invoiceNo}`;
    if (needs.tone === 'overdue') {
      const late = -(daysUntil(i.dueDate) ?? 0);
      return (
        <NeedsYouCard
          tone="overdue"
          overline="Overdue"
          title={late > 0 ? `Your payment is ${late} ${late === 1 ? 'day' : 'days'} late` : 'Your payment is overdue'}
          body={`${aed2(i.balanceDue)} for ${what} was due ${shortDate(i.dueDate)}. Pay today, or message us if you need a hand.`}
          action={`Pay ${aed2(i.balanceDue)} now`}
          onAction={() => onPay(i.id)}
        />
      );
    }
    return (
      <NeedsYouCard
        tone="due"
        icon={Receipt}
        overline={dueLine(i.dueDate)}
        title={`${what} is ready`}
        body={[aed2(i.balanceDue), unitLabel ? `Unit ${unitLabel}` : null, `due ${shortDate(i.dueDate)}`].filter(Boolean).join(' · ')}
        action={`Pay ${aed2(i.balanceDue)}`}
        onAction={() => onPay(i.id)}
      />
    );
  }
  const b = needs.booking;
  const go = (pathname: '/book/sign' | '/book/review' | '/book/status') => router.push({ pathname, params: { id: b.bookingId } });
  if (b.state === 'ready_to_sign') {
    return (
      <NeedsYouCard icon={PenLine} overline="Ready to sign" title="Your agreement is ready"
        body={`Unit ${b.unit.unitNumber} · ${shortDate(b.unit.startDate)} to ${shortDate(b.unit.endDate)}. Takes about a minute.`}
        action="Review and sign" onAction={() => go('/book/sign')} />
    );
  }
  if (b.state === 'held') {
    return (
      <NeedsYouCard icon={KeyRound} overline="Held for you" title={`Unit ${b.unit.unitNumber} is waiting`}
        body={`Pay to keep it — the hold ends at ${clockTime(b.holdExpiresAt)}. ${aed2(b.pricing.totalWithFee)} today.`}
        action="Continue to payment" onAction={() => go('/book/review')} />
    );
  }
  return (
    <NeedsYouCard icon={FileText} overline="Almost there" title={`We're setting up unit ${b.unit.unitNumber}`}
      body={b.state === 'needs_review' ? "We received your payment and we're checking one detail. We'll WhatsApp you." : 'Your payment is in. Your agreement will be ready in a moment.'}
      action="See where it's at" onAction={() => go('/book/status')} />
  );
}

export default function HomeTab() {
  const router = useRouter();
  const { c } = useTheme();
  const q = useQuery({ queryKey: ['home'], queryFn: storageApi.home });
  const booking = useQuery({ queryKey: ['booking-current'], queryFn: bookingApi.current });
  const payments = useQuery({ queryKey: ['payments'], queryFn: storageApi.payments, enabled: !!q.data?.contracts.length });
  const [payId, setPayId] = useState<string | null>(null);

  const refresh = () => { q.refetch(); booking.refetch(); payments.refetch(); };
  const home = q.data;

  if (q.isLoading) return <Screen><ScrollBody><HomeSkeleton /></ScrollBody></Screen>;
  if (!home) {
    return (
      <Screen>
        <ScrollBody><Greeting /><ErrorState title="Couldn't load your home" body="This is on us. Try again in a moment, or message us on WhatsApp." onRetry={refresh} error={q.error} /></ScrollBody>
      </Screen>
    );
  }

  const contracts = home.contracts;
  const primary = home.primaryContract ?? contracts[0];
  const needs = pickNeeds(home, booking.data);
  const unitLabel = contracts.length === 1 && primary ? unitNumbers(primary) : undefined;
  const urgent = needs?.kind === 'invoice' ? needs.invoice.id : home.outstanding.invoices.find((i) => i.balanceDue > 0)?.id;

  const stale = q.isError ? (
    <Banner tone="warn" icon={WifiOff} style={{ marginBottom: space[3] }}>
      <BannerText>Showing info from {clockTime(new Date(q.dataUpdatedAt))}. Pull down to refresh.</BannerText>
    </Banner>
  ) : null;

  // New customer: nothing rented yet. The whole screen invites them to book.
  if (!contracts.length) {
    return (
      <Screen>
        <ScrollBody refreshing={q.isRefetching} onRefresh={refresh}>
          <Greeting />
          {stale}
          {needs ? <View style={{ marginBottom: space[3] }}><NeedsBlock needs={needs} onPay={setPayId} /></View> : null}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <View style={{ pointerEvents: 'none', height: 170, backgroundColor: c.brand100, overflow: 'hidden' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View style={{ pointerEvents: 'none', position: 'absolute', start: 24, bottom: -20, width: 110, height: 110, borderRadius: 22, backgroundColor: c.brand500 }} />
              <View style={{ pointerEvents: 'none', position: 'absolute', start: 146, bottom: -20, width: 80, height: 150, borderRadius: 22, backgroundColor: c.brand200 }} />
              <View style={{ pointerEvents: 'none', position: 'absolute', start: 238, bottom: -20, width: 110, height: 70, borderRadius: 22, backgroundColor: c.brand500, opacity: 0.6 }} />
              <View style={{ pointerEvents: 'none', position: 'absolute', start: 250, top: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: c.surfaceCard }} />
            </View>
            <View style={{ padding: space[5] }}>
              <Text style={{ fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 30 }}>Find your perfect size</Text>
              <Text tone="muted" style={{ marginTop: 6, marginBottom: space[4] }}>
                Storage in Al Quoz. Book in a few minutes, pay by card and sign on your phone.
              </Text>
              <Button block title="Find my size" onPress={() => router.push('/book')} />
            </View>
          </Card>
          <Card onPress={() => router.push('/link-unit')} style={{ marginTop: space[3], paddingVertical: 6 }} accessibilityLabel="Link a unit I already rent">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 64 }}>
              <Tile icon={KeyRound} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 }}>Already renting with us?</Text>
                <Text variant="caption" tone="muted" style={{ fontFamily: fonts.regular }}>Link a unit I already rent, to pay and see bills</Text>
              </View>
              <Icon as={ChevronRight} color={c.inkSubtle} flip />
            </View>
          </Card>
        </ScrollBody>
        <InvoicePaySheet invoiceId={payId} visible={!!payId} onClose={() => setPayId(null)} />
      </Screen>
    );
  }

  const recent = (payments.data ?? []).slice(0, 3);

  return (
    <Screen>
      <ScrollBody refreshing={q.isRefetching} onRefresh={refresh}>
        <Greeting />
        {stale}
        <NeedsBlock needs={needs} unitLabel={unitLabel} onPay={setPayId} />

        <View style={{ marginTop: 22, marginBottom: 4 }}>
          <QuickActions items={[
            { icon: CreditCard, label: 'Pay', onPress: () => (urgent ? setPayId(urgent) : router.navigate('/(tabs)/billing')) },
            { icon: FileText, label: 'Contract', onPress: () => router.push('/documents') },
            { icon: Truck, label: 'Move', onPress: () => openWhatsApp(`Hi PurpleBox, I'd like to arrange a move${unitLabel ? ` for unit ${unitLabel}` : ''}.`) },
            { icon: MessageCircle, label: 'Chat', onPress: () => router.navigate('/(tabs)/help') },
          ]} />
        </View>

        {primary ? (
          <>
            <SectionHead title={contracts.length > 1 ? 'Your units' : 'Your unit'} action={contracts.length > 1 ? { label: 'See all', onPress: () => router.navigate('/(tabs)/units') } : undefined} />
            <UnitCard contract={primary} onPress={() => router.push({ pathname: '/unit/[id]', params: { id: primary.id } })} />
          </>
        ) : null}

        {recent.length ? (
          <>
            <SectionHead title="Recent activity" />
            <RowCard>
              {recent.map((p) => (
                <ListRow key={p.id} icon={Check} tone="ok" title="Payment received" sub={`${aed2(p.amount)} · ${p.contractNo} · ${shortDate(p.paidDate)}`} />
              ))}
            </RowCard>
          </>
        ) : null}
        <View style={{ height: radius.sm }} />
      </ScrollBody>
      <InvoicePaySheet invoiceId={payId} visible={!!payId} onClose={() => setPayId(null)} onPaid={refresh} />
    </Screen>
  );
}
