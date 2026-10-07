import { useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Package } from 'lucide-react-native';
import { Button, Card, Input, Screen, Text, TopBar } from '@/components/ui';
import { Page, RowIcon, StatusChip } from '@/components/bits';
import { storageApi } from '@/api/storage';
import { ApiError } from '@/api/client';
import { aed, shortDate } from '@/lib/format';
import { WHATSAPP } from '@/lib/contact';
import { useTheme } from '@/theme/useTheme';

// Refunds apply once the unit has been handed back (contract ended).
export default function Refund() {
  const router = useRouter();
  const { c } = useTheme();
  const { contractId } = useLocalSearchParams<{ contractId?: string }>();
  const q = useQuery({ queryKey: ['contracts'], queryFn: storageApi.contracts });
  const ended = (q.data ?? []).filter((k) => k.status === 'ended');
  const [picked, setPicked] = useState<string | undefined>(contractId);
  const [note, setNote] = useState('');
  const contract = ended.find((k) => k.id === picked) ?? (ended.length === 1 ? ended[0] : undefined);

  const done = () => Alert.alert('Request sent', "Thanks — we'll review your refund and update you shortly.", [{ text: 'OK', onPress: () => router.back() }]);
  const send = useMutation({
    mutationFn: () => storageApi.refundRequest(contract!.id, { note: note.trim() || undefined }),
    onSuccess: done,
    onError: (e: Error) => {
      // The refund route may not be live on the server yet; hand the request to the team on WhatsApp instead.
      if (e instanceof ApiError && (e.status === 404 || e.status === 405)) {
        const text = `Hi PurpleBox, I'd like to request my deposit refund for agreement ${contract!.contractNo}.${note.trim() ? ` ${note.trim()}` : ''}`;
        Linking.openURL(`${WHATSAPP}?text=${encodeURIComponent(text)}`);
      } else Alert.alert('Could not send request', e.message);
    },
  });

  return (
    <Screen>
      <TopBar title="Refund request" />
      <Page loading={q.isLoading} error={q.error?.message}>
        {ended.length === 0 ? (
          <Card style={{ gap: 12 }}>
            <Text variant="h3">Available after check-out</Text>
            <Text color="ink2">Once you’ve checked out and the unit is handed back, you can request your refundable deposit here.</Text>
            <Button title="Request check-out" variant="soft" onPress={() => router.replace('/checkout')} />
          </Card>
        ) : (
          <>
            <Text color="ink2">Choose the agreement you’d like a refund for.</Text>
            {ended.map((k) => (
              <Pressable key={k.id} onPress={() => setPicked(k.id)}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: contract?.id === k.id ? c.ac : 'transparent' }}>
                  <RowIcon icon={Package} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text variant="title">{k.units.map((u) => u.unitNumber).join(', ')}</Text>
                    <Text variant="meta">{k.contractNo} · ended {shortDate(k.endDate)}</Text>
                    <StatusChip tone="brand" label={`Deposit ${aed(k.deposit)}`} />
                  </View>
                  {contract?.id === k.id ? <Check color={c.ink} size={20} strokeWidth={1.8} /> : null}
                </Card>
              </Pressable>
            ))}
            {contract ? (
              <>
                <Input label="Note for our team (optional)" placeholder="e.g. bank details or anything we should know" value={note} onChangeText={setNote} />
                <Button title="Request refund" loading={send.isPending} onPress={() => send.mutate()} />
              </>
            ) : null}
          </>
        )}
      </Page>
    </Screen>
  );
}
