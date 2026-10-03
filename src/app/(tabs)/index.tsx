import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Screen, Text } from '@/components/ui';
import { Page, StatusChip, invoiceTone } from '@/components/bits';
import { storageApi } from '@/api/storage';
import { bookingApi } from '@/api/booking';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/theme/useTheme';
import { aed, daysUntil, monthlyRate, shortDate } from '@/lib/format';

export default function HomeTab() {
  const router = useRouter();
  const { c } = useTheme();
  const name = useAuth((s) => s.customer?.fullName?.split(' ')[0]);
  const q = useQuery({ queryKey: ['home'], queryFn: storageApi.home });
  const pending = useQuery({ queryKey: ['booking-current'], queryFn: bookingApi.current });
  const home = q.data;
  const contract = home?.primaryContract;
  const unit = contract?.units[0];
  const due = daysUntil(contract?.nextPaymentDate);
  const owing = home?.outstanding.total ?? 0;

  return (
    <Screen style={{ paddingTop: 56 }}>
      <Page loading={q.isLoading} error={q.error?.message} refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
        <Text variant="h1">Hi{name && name !== '+' ? `, ${name}` : ''}</Text>

        {pending.data ? (
          <Card style={{ gap: 10, borderWidth: 1, borderColor: c.br }}>
            <Text variant="h3">Finish your booking</Text>
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
          <View style={{ backgroundColor: c.br, borderRadius: 24, padding: 20, gap: 14 }}>
            <Text variant="overline" style={{ color: '#D9CBFF' }}>Your unit</Text>
            <Text variant="h2" style={{ color: '#fff' }}>{unit.unitNumber}{unit.sizeSqf ? ` · ${unit.sizeSqf} sqft` : ''}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text variant="meta" style={{ color: '#D9CBFF' }}>Monthly</Text>
                <Text variant="h3" style={{ color: '#fff' }}>{aed(monthlyRate(contract))}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="meta" style={{ color: '#D9CBFF' }}>Next payment</Text>
                <Text variant="h3" style={{ color: '#fff' }}>{shortDate(contract.nextPaymentDate)}</Text>
              </View>
            </View>
            {due !== null && due <= 7 && due >= 0 ? <StatusChip tone="warn" label={due === 0 ? 'Due today' : `Due in ${due} day${due === 1 ? '' : 's'}`} /> : null}
          </View>
        ) : !q.isLoading ? (
          <Card style={{ gap: 10 }}>
            <Text variant="h3">No storage unit yet</Text>
            <Text color="ink2">Book a unit in a few minutes, or link an agreement you already have with us.</Text>
            <Button title="Book a unit" onPress={() => router.push('/book')} />
            <Button title="Link my existing unit" variant="soft" onPress={() => router.push('/link-unit')} />
          </Card>
        ) : null}

        {owing > 0 ? (
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="h3">Balance due</Text>
              <Text variant="h3">{aed(owing)}</Text>
            </View>
            {home!.outstanding.invoices.slice(0, 2).map((i) => (
              <View key={i.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="meta">{i.invoiceNo} · due {shortDate(i.dueDate)}</Text>
                <StatusChip label={i.status} tone={invoiceTone(i.status)} />
              </View>
            ))}
            <Button title="Pay now" onPress={() => router.push('/(tabs)/payments')} />
          </Card>
        ) : null}
      </Page>
    </Screen>
  );
}
