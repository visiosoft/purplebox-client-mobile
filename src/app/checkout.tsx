import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, Package } from 'lucide-react-native';
import { Button, Card, IconButton, Screen, Text, TopBar } from '@/components/ui';
import { Page, RowIcon, Segmented } from '@/components/bits';
import { storageApi } from '@/api/storage';
import { useRequests } from '@/store/requests';
import { aed, daysUntil, monthlyRate, shortDate } from '@/lib/format';
import { useTheme } from '@/theme/useTheme';

const DAY = 86_400_000;
const isoDay = (offset: number) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);

// A request, not an instant change: the team confirms it, then the unit is handed back.
export default function Checkout() {
  const router = useRouter();
  const qc = useQueryClient();
  const { c } = useTheme();
  const { contractId } = useLocalSearchParams<{ contractId?: string }>();
  const q = useQuery({ queryKey: ['contracts'], queryFn: storageApi.contracts });
  const active = (q.data ?? []).filter((k) => k.status === 'active');
  const [picked, setPicked] = useState<string | undefined>(contractId);
  const contract = active.find((k) => k.id === picked) ?? (active.length === 1 ? active[0] : undefined);

  const maxOffset = Math.max(1, daysUntil(contract?.endDate) ?? 1);
  const [offset, setOffset] = useState(7);
  const day = Math.min(Math.max(offset, 1), maxOffset);

  const send = useMutation({
    mutationFn: (body: Parameters<typeof storageApi.checkoutChange>[1]) => storageApi.checkoutChange(contract!.id, body),
    onSuccess: (_r, body) => {
      useRequests.getState().add({
        kind: body.action === 'extend' ? 'extend' : 'checkout', contractId: contract!.id,
        unit: contract!.units.map((u) => u.unitNumber).join(', '), detail: body.action === 'extend' ? `${body.months} months` : shortDate(body.date),
      });
      qc.invalidateQueries();
      Alert.alert('Request sent', 'Thanks — our team will confirm shortly. You can follow it on Home and My Units.', [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: (e: Error) => Alert.alert('Could not send request', e.message),
  });
  const confirmMoveOut = () => Alert.alert('Request check-out?', `Move out of ${contract!.units.map((u) => u.unitNumber).join(', ')} on ${shortDate(isoDay(day))}.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Send request', onPress: () => send.mutate({ action: 'move_out_early', date: isoDay(day) }) },
  ]);

  return (
    <Screen>
      <TopBar title="Check-out" />
      <Page loading={q.isLoading} error={q.error?.message}>
        {active.length === 0 ? <Text color="ink2">You have no active unit to check out of.</Text> : null}

        {active.length > 1 ? active.map((k) => (
          <Pressable key={k.id} onPress={() => setPicked(k.id)}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: contract?.id === k.id ? c.ac : 'transparent' }}>
              <RowIcon icon={Package} />
              <View style={{ flex: 1 }}>
                <Text variant="title">{k.units.map((u) => u.unitNumber).join(', ')}</Text>
                <Text variant="meta">{k.contractNo} · ends {shortDate(k.endDate)}</Text>
              </View>
              {contract?.id === k.id ? <Check color={c.ink} size={20} strokeWidth={1.8} /> : null}
            </Card>
          </Pressable>
        )) : null}

        {contract ? (
          <>
            <Card style={{ gap: 14 }}>
              <Text variant="h3">Move out early</Text>
              <Text variant="meta">Your contract runs to {shortDate(contract.endDate)}. Choose the day you’ll empty the unit.</Text>
              <Segmented value="" onChange={(v) => setOffset(Number(v))}
                options={[{ value: '7', label: '1 wk' }, { value: '14', label: '2 wks' }, { value: '30', label: '1 mo' }, { value: String(maxOffset), label: 'End' }]} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ opacity: day <= 1 ? 0.3 : 1 }} pointerEvents={day <= 1 ? 'none' : 'auto'}>
                  <IconButton icon={ChevronLeft} label="Earlier" size={40} onPress={() => setOffset(day - 1)} />
                </View>
                <Text variant="h3">{shortDate(isoDay(day))}</Text>
                <View style={{ opacity: day >= maxOffset ? 0.3 : 1 }} pointerEvents={day >= maxOffset ? 'none' : 'auto'}>
                  <IconButton icon={ChevronRight} label="Later" size={40} onPress={() => setOffset(day + 1)} />
                </View>
              </View>
              <Button title="Request check-out" loading={send.isPending} onPress={confirmMoveOut} />
            </Card>

            <Card style={{ gap: 12 }}>
              <Text variant="h3">Staying longer?</Text>
              <Text variant="meta">Extend instead at {aed(monthlyRate(contract))}/month.</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button title="+ 6 months" variant="soft" style={{ flex: 1 }} disabled={send.isPending} onPress={() => send.mutate({ action: 'extend', months: 6 })} />
                <Button title="+ 12 months" variant="soft" style={{ flex: 1 }} disabled={send.isPending} onPress={() => send.mutate({ action: 'extend', months: 12 })} />
              </View>
            </Card>
            <Text variant="meta" style={{ textAlign: 'center' }}>After check-out you can request your deposit refund from Services.</Text>
          </>
        ) : null}
      </Page>
    </Screen>
  );
}
