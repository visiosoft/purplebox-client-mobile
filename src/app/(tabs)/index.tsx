import { Alert, Linking, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight, Bell, Boxes, Calculator, CalendarCheck, CalendarClock, CheckCircle2, Clock, CreditCard, FileText, MessageCircle, PackagePlus, Receipt, Truck,
  type LucideIcon,
} from 'lucide-react-native';
import { Button, Card, IconButton, MenuButton, Screen, Text } from '@/components/ui';
import { Gauge, MetricPills, Page, Row, RowIcon, StatusChip, invoiceTone } from '@/components/bits';
import { Contract, openDocument, storageApi } from '@/api/storage';
import { bookingApi } from '@/api/booking';
import { isOpen, servicesApi } from '@/api/services';
import { notificationsApi } from '@/api/notifications';
import { RequestRow } from '@/components/service';
import { useBilling } from '@/hooks/useBilling';
import { useAuth } from '@/store/auth';
import { REQUEST_LABEL, useRequests } from '@/store/requests';
import { aed, daysUntil, monthlyRate, shortDate, termProgress } from '@/lib/format';
import { WHATSAPP } from '@/lib/contact';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius } from '@/theme/tokens';

/** "My contract Â·Â·Â· All documents" */
function SectionHead({ title, link, onPress }: { title: string; link?: string; onPress?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
      <Text variant="h3">{title}</Text>
      {link ? (
        <Pressable onPress={onPress} hitSlop={10} accessibilityRole="link">
          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: c.ink, textDecorationLine: 'underline' }}>{link}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type Tile = { icon: LucideIcon; title: string; sub: string; onPress: () => void };

/** Two-by-two grid of the things people come to the app to do. */
function ActionTiles({ items }: { items: Tile[] }) {
  const { c } = useTheme();
  const rows = [items.slice(0, 2), items.slice(2, 4)];
  return (
    <View style={{ gap: 12 }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 12 }}>
          {row.map((t) => (
            <Pressable key={t.title} onPress={t.onPress} accessibilityRole="button" accessibilityLabel={t.title}
              style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}>
              <Card style={{ flex: 1, gap: 14, padding: 16 }}>
                <View style={{ width: 44, height: 44, borderRadius: radius.tile, borderCurve: 'continuous', backgroundColor: c.acSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <t.icon color={c.ink} size={20} strokeWidth={1.6} />
                </View>
                <View style={{ gap: 2 }}>
                  <Text variant="title" style={{ fontSize: 15 }}>{t.title}</Text>
                  <Text variant="meta">{t.sub}</Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

/** The agreement as a card: a little page thumbnail, its status, dates and a way to read it. */
function ContractCard({ contract, onView, onSign }: { contract: Contract; onView: () => void; onSign: () => void }) {
  const { c } = useTheme();
  return (
    <Card style={{ flexDirection: 'row', gap: 14, padding: 16 }}>
      <View style={{ width: 64, height: 84, borderRadius: 10, backgroundColor: c.sf2, padding: 9, gap: 5, borderWidth: 1, borderColor: c.ln }}>
        <View style={{ width: 14, height: 6, borderRadius: 2, backgroundColor: c.ac }} />
        {[1, 0.8, 1, 0.6].map((w, i) => <View key={i} style={{ width: `${w * 100}%`, height: 3, borderRadius: 2, backgroundColor: c.ln2 }} />)}
        {contract.signed ? <View style={{ marginTop: 'auto', width: '70%', height: 1, backgroundColor: c.ink3 }} /> : null}
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {contract.signed
            ? <StatusChip tone="ok" icon={CheckCircle2} label="Signed" />
            : <StatusChip tone="warn" label="Awaiting signature" />}
          <Text variant="meta">{contract.contractNo}</Text>
        </View>
        <Text variant="title">Self-storage agreement</Text>
        <Text variant="meta">From {shortDate(contract.startDate)} Â· {contract.status === 'ended' ? 'Ended' : 'Ends'} {shortDate(contract.endDate)}</Text>
        <Pressable onPress={contract.signed ? onView : onSign} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <FileText color={c.ink} size={16} strokeWidth={1.6} />
          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: c.ink }}>{contract.signed ? 'View contract' : 'Sign contract'}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

export default function HomeTab() {
  const router = useRouter();
  const { c } = useTheme();
  const customer = useAuth((s) => s.customer);
  const name = customer?.fullName?.split(' ')[0];
  const q = useQuery({ queryKey: ['home'], queryFn: storageApi.home });
  const pending = useQuery({ queryKey: ['booking-current'], queryFn: bookingApi.current });
  const docs = useQuery({ queryKey: ['documents'], queryFn: storageApi.documents });
  const bill = useBilling();
  const services = useQuery({ queryKey: ['services'], queryFn: servicesApi.list });
  const inbox = useQuery({ queryKey: ['notifications'], queryFn: notificationsApi.list });
  const items = useQuery({ queryKey: ['items'], queryFn: servicesApi.items });
  const activeRequests = (services.data ?? []).filter((r) => isOpen(r.status)).slice(0, 2);
  const storedCount = (items.data ?? []).filter((i) => i.status === 'stored').length;
  const requests = useRequests((s) => s.items);
  const home = q.data;
  const contract = home?.primaryContract;
  const unit = contract?.units[0];
  const due = daysUntil(contract?.nextPaymentDate);
  const left = daysUntil(contract?.endDate);
  const progress = contract ? termProgress(contract) : 0;
  // Before move-in the term hasn't begun, so count down to it instead of showing 0%.
  const toStart = daysUntil(contract?.startDate);
  const upcoming = toStart !== null && toStart > 0;

  const upcomingInvoices = [...bill.open].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 3);
  const recentPaid = [...bill.paid].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const toPayments = () => router.navigate('/(tabs)/payments');
  const toDocuments = () => router.navigate({ pathname: '/(tabs)/storage', params: { tab: 'documents' } });
  const viewContract = () => {
    const agreements = docs.data?.agreements ?? [];
    const doc = agreements.find((d) => contract && d.title.includes(contract.contractNo)) ?? agreements[0];
    if (doc) openDocument(doc).catch((e) => Alert.alert('Contract', e.message));
    else toDocuments();
  };
  const signContract = async () => {
    try {
      const b = await bookingApi.current();
      if (b && b.state === 'ready_to_sign') router.push({ pathname: '/book/sign', params: { id: b.bookingId } });
      else router.navigate('/(tabs)/storage');
    } catch (e: any) { Alert.alert('Sign contract', e.message); }
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 18 }}>
        <MenuButton />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton icon={MessageCircle} label="Message us on WhatsApp" onPress={() => Linking.openURL(WHATSAPP)} />
          <IconButton icon={Bell} label={inbox.data?.unread ? `Notifications, ${inbox.data.unread} unread` : 'Notifications'}
            badge={!!inbox.data?.unread} onPress={() => router.push('/notifications')} />
        </View>
      </View>
      <Page loading={q.isLoading} error={q.error?.message} refreshing={q.isRefetching || bill.refreshing}
        onRefresh={() => { bill.refresh(); pending.refetch(); services.refetch(); items.refetch(); inbox.refetch(); }}>
        <Text variant="h1" style={{ marginBottom: 4 }}>Hi{name && !/^[+\d]/.test(name) ? `, ${name}` : ''}</Text>

        {pending.data ? (
          <Card variant="accent" style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="h3">Finish your booking</Text>
              <ArrowUpRight color="#262626" size={20} strokeWidth={1.6} />
            </View>
            <Text color="ink2">
              {pending.data.state === 'ready_to_sign' ? `Unit ${pending.data.unit.unitNumber} is paid â€” sign your contract to activate it.`
                : pending.data.state === 'held' ? `Unit ${pending.data.unit.unitNumber} is held for you. Complete payment to keep it.`
                : `We're finishing up unit ${pending.data.unit.unitNumber}.`}
            </Text>
            <Button title={pending.data.state === 'held' ? 'Continue to payment' : 'Continue'}
              onPress={() => router.push({ pathname: pending.data!.state === 'held' ? '/book/review' : '/book/status', params: { id: pending.data!.bookingId } })} />
          </Card>
        ) : null}

        {contract && unit ? (
          <Card style={{ gap: 18, paddingTop: 24 }}>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text variant="h2">Unit {unit.unitNumber}</Text>
              <Text variant="meta">{unit.sizeSqf ? `${unit.sizeSqf} sq ft Â· ` : ''}{contract.contractNo}</Text>
            </View>
            {upcoming ? (
              <Gauge value={0} label={String(toStart)}
                caption={`day${toStart === 1 ? '' : 's'} until move-in Â· ${shortDate(contract.startDate)}`} />
            ) : (
              <Gauge value={progress} label={`${Math.round(progress * 100)}%`}
                caption={left !== null && left > 0 ? `of your term used Â· ${left} days left` : 'of your term used'} />
            )}
            <MetricPills items={[
              { label: 'Monthly', value: aed(monthlyRate(contract)), tone: 'accent' },
              { label: 'Next payment', value: shortDate(contract.nextPaymentDate), tone: 'dark' },
              { label: 'Check-out', value: shortDate(contract.endDate), tone: 'hatch' },
            ]} />
            {due !== null && due <= 7 && due >= 0 ? <StatusChip tone="warn" label={due === 0 ? 'Due today' : `Due in ${due} day${due === 1 ? '' : 's'}`} /> : null}
          </Card>
        ) : !q.isLoading ? (
          <Card style={{ gap: 12 }}>
            <Text variant="h2">No storage unit yet</Text>
            <Text color="ink2">Book a unit in a few minutes. Already renting with us? Log in with the mobile or email on your contract.</Text>
            <Button title="Book a unit" onPress={() => router.push('/book')} style={{ marginTop: 6 }} />
          </Card>
        ) : null}

        <ActionTiles items={[
          { icon: PackagePlus, title: 'Request pickup', sub: 'We collect to storage', onPress: () => router.push({ pathname: '/service/new', params: { type: 'pickup' } }) },
          { icon: Truck, title: 'Request drop-off', sub: 'Deliver to your door', onPress: () => router.push({ pathname: '/service/new', params: { type: 'dropoff' } }) },
          { icon: Boxes, title: 'View stored items', sub: storedCount ? `${storedCount} labelled item${storedCount === 1 ? '' : 's'}` : 'Your labelled items', onPress: () => router.navigate({ pathname: '/(tabs)/storage', params: { tab: 'items' } }) },
          { icon: Calculator, title: 'Storage estimator', sub: 'Find the right size', onPress: () => router.push('/estimator') },
        ]} />

        <View style={{ gap: 12 }}>
          <SectionHead title="Active requests" link="All services" onPress={() => router.navigate('/(tabs)/services')} />
          {activeRequests.length ? (
            <Card style={{ paddingVertical: 4 }}>
              {activeRequests.map((r) => <RequestRow key={r.id} r={r} onPress={() => router.push({ pathname: '/service/[id]', params: { id: r.id } })} />)}
            </Card>
          ) : (
            <Pressable onPress={() => router.navigate('/(tabs)/services')} accessibilityRole="button"
              style={{ alignItems: 'center', gap: 6, padding: 22, borderRadius: 28, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.ln2 }}>
              <CalendarCheck color={c.ink3} size={24} strokeWidth={1.4} />
              <Text variant="title">Nothing scheduled</Text>
              <Text variant="meta" style={{ textAlign: 'center' }}>Order boxes & labels, book a pickup or have items delivered.</Text>
            </Pressable>
          )}
        </View>

        {contract ? (
          <View style={{ gap: 12 }}>
            <SectionHead title="My contract" link="All documents" onPress={toDocuments} />
            <ContractCard contract={contract} onView={viewContract} onSign={signContract} />
          </View>
        ) : null}

        {contract || bill.list.length || bill.paid.length ? (
          <View style={{ gap: 12 }}>
            <SectionHead title="Payments" link="See all" onPress={toPayments} />
            <Card style={{ gap: 4, paddingVertical: 14 }}>
              <Text variant="overline">Upcoming</Text>
              {upcomingInvoices.map((i) => (
                <Row key={i.id} leading={<RowIcon icon={FileText} />} title={aed(i.balance)} sub={`${i.number} Â· Due ${shortDate(i.dueDate)}`}
                  onPress={toPayments} right={<StatusChip label={i.status.replace(/_/g, ' ')} tone={invoiceTone(i.status)} />} />
              ))}
              {!upcomingInvoices.length && contract?.nextPaymentDate ? (
                <Row leading={<RowIcon icon={CalendarClock} />} title={aed(monthlyRate(contract))} sub={`Next payment Â· ${shortDate(contract.nextPaymentDate)}`}
                  right={<StatusChip label="Scheduled" />} />
              ) : null}
              {!upcomingInvoices.length && !contract?.nextPaymentDate ? <Text color="ink2" style={{ paddingVertical: 8 }}>Nothing due â€” youâ€™re all paid up.</Text> : null}
              {bill.due > 0 ? <Button title={`Pay ${aed(bill.due)}`} variant="accent" icon={CreditCard} onPress={toPayments} style={{ height: 46, marginTop: 4, marginBottom: 6 }} /> : null}

              <View style={{ height: 1, backgroundColor: c.ln, marginVertical: 8 }} />
              <Text variant="overline">Paid</Text>
              {recentPaid.map((p) => (
                <Row key={p.id} leading={<RowIcon icon={Receipt} />} title={aed(p.amount)} sub={p.sub}
                  onPress={toPayments} right={<StatusChip tone="ok" label="Paid" />} />
              ))}
              {!recentPaid.length ? <Text color="ink2" style={{ paddingVertical: 8 }}>No payments yet.</Text> : null}
            </Card>
          </View>
        ) : null}

        {requests.length ? (
          <Card style={{ gap: 4, paddingVertical: 14 }}>
            <Text variant="title">Your requests</Text>
            {requests.map((r) => (
              <Row key={r.id} leading={<RowIcon icon={Clock} />} title={REQUEST_LABEL[r.kind]}
                sub={`Unit ${r.unit}${r.detail ? ` Â· ${r.detail}` : ''} Â· sent ${shortDate(new Date(r.at).toISOString())}`}
                right={<StatusChip label="Pending" tone="warn" />} />
            ))}
          </Card>
        ) : null}
      </Page>
    </Screen>
  );
}
