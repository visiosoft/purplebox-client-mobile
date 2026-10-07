import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Bell, FileText, MessageCircle } from 'lucide-react-native';
import { Button, Card, IconButton, MenuButton, Screen, Text } from '@/components/ui';
import { Gauge, MetricPills, Page, Row, RowIcon, StatusChip, invoiceTone } from '@/components/bits';
import { storageApi } from '@/api/storage';
import { bookingApi } from '@/api/booking';
import { useAuth } from '@/store/auth';
import { aed, daysUntil, monthlyRate, shortDate, termProgress } from '@/lib/format';
import { WHATSAPP } from '@/lib/contact';

export default function HomeTab() {
  const router = useRouter();
  const customer = useAuth((s) => s.customer);
  const name = customer?.fullName?.split(' ')[0];
  const q = useQuery({ queryKey: ['home'], queryFn: storageApi.home });
  const pending = useQuery({ queryKey: ['booking-current'], queryFn: bookingApi.current });
  const home = q.data;
  const contract = home?.primaryContract;
  const unit = contract?.units[0];
  const due = daysUntil(contract?.nextPaymentDate);
  const left = daysUntil(contract?.endDate);
  const owing = home?.outstanding.total ?? 0;
  const progress = contract ? termProgress(contract) : 0;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 18 }}>
        <MenuButton />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton icon={MessageCircle} label="Message us on WhatsApp" onPress={() => Linking.openURL(WHATSAPP)} />
          <IconButton icon={Bell} label="Payments" badge={owing > 0} onPress={() => router.push('/(tabs)/payments')} />
        </View>
      </View>
      <Page loading={q.isLoading} error={q.error?.message} refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
        <Text variant="h1" style={{ marginBottom: 4 }}>Hi{name && !/^[+\d]/.test(name) ? `, ${name}` : ''}</Text>

        {pending.data ? (
          <Card variant="accent" style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="h3">Finish your booking</Text>
              <ArrowUpRight color="#262626" size={20} strokeWidth={1.6} />
            </View>
            <Text color="ink2">
              {pending.data.state === 'ready_to_sign' ? `Unit ${pending.data.unit.unitNumber} is paid — sign your agreement to activate it.`
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
              <Text variant="meta">{unit.sizeSqf ? `${unit.sizeSqf} sq ft · ` : ''}{contract.contractNo}</Text>
            </View>
            <Gauge value={progress} label={`${Math.round(progress * 100)}%`}
              caption={left !== null && left > 0 ? `of your term · ${left} days left` : 'of your term'} />
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
            <Text color="ink2">Book a unit in a few minutes, or link an agreement you already have with us.</Text>
            <Button title="Book a unit" onPress={() => router.push('/book')} style={{ marginTop: 6 }} />
            <Button title="Estimate the space I need" variant="soft" onPress={() => router.push('/estimator')} />
            <Button title="Link my existing unit" variant="ghost" onPress={() => router.push('/link-unit')} />
          </Card>
        ) : null}

        {owing > 0 ? (
          <Card variant="dark" style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text variant="title" color="onDk">Balance due</Text>
              <Text variant="h2" color="onDk">{aed(owing)}</Text>
            </View>
            {home!.outstanding.invoices.slice(0, 3).map((i) => (
              <Row key={i.id} dark leading={<RowIcon icon={FileText} dark />} title={i.invoiceNo} sub={`Due ${shortDate(i.dueDate)}`}
                onPress={() => router.push('/(tabs)/payments')}
                right={<StatusChip label={i.status} tone={invoiceTone(i.status)} />} />
            ))}
            <Button title="Pay now" variant="accent" onPress={() => router.push('/(tabs)/payments')} style={{ marginTop: 8 }} />
          </Card>
        ) : null}
      </Page>
    </Screen>
  );
}
