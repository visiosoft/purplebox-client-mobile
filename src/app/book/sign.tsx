import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Input, Screen, Text } from '@/components/ui';
import { Page } from '@/components/bits';
import { bookingApi } from '@/api/booking';
import { openDocument } from '@/api/storage';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/theme/useTheme';
import { fonts } from '@/theme/tokens';
import { shortDate } from '@/lib/format';

export default function Sign() {
  const router = useRouter();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const customer = useAuth((s) => s.customer);
  const q = useQuery({ queryKey: ['booking', id], queryFn: () => bookingApi.get(id) });
  const [name, setName] = useState(customer?.fullName ?? '');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const b = q.data;

  const sign = async () => {
    setBusy(true);
    try {
      await bookingApi.sign(id, name.trim());
      router.replace({ pathname: '/book/status', params: { id } });
    } catch (e: any) {
      Alert.alert('Could not sign', e.message);
    } finally { setBusy(false); }
  };

  return (
    <Screen style={{ paddingTop: 56 }}>
      <Page loading={q.isLoading} error={q.error?.message}>
        <View style={{ gap: 6 }}>
          <Text variant="h1">Sign your agreement</Text>
          <Text color="ink2">Payment received. One last step and the unit is yours.</Text>
        </View>
        {b ? (
          <Card style={{ gap: 4 }}>
            <Text variant="h3">Unit {b.unit.unitNumber} · {b.unit.sizeSqf} sq ft</Text>
            <Text variant="meta">{b.contractNo ? `${b.contractNo} · ` : ''}{shortDate(b.unit.startDate)} → {shortDate(b.unit.endDate)}</Text>
          </Card>
        ) : null}
        <Button title="Read the agreement (PDF)" variant="soft"
          onPress={() => openDocument({ href: bookingApi.contractHref(id), title: b?.contractNo ?? 'Agreement' }).catch((e) => Alert.alert('Agreement', e.message))} />

        <Input label="Type your full name to sign" autoCapitalize="words" value={name} onChangeText={setName} />
        {name.trim() ? (
          <View style={{ borderBottomWidth: 1, borderBottomColor: c.ln2, paddingVertical: 8 }}>
            <Text style={{ fontSize: 30, fontStyle: 'italic', fontFamily: fonts.display }}>{name}</Text>
          </View>
        ) : null}

        <Pressable onPress={() => setAgree(!agree)} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: c.br, backgroundColor: agree ? c.br : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            {agree ? <Text style={{ color: '#fff', fontFamily: fonts.bold }}>✓</Text> : null}
          </View>
          <Text style={{ flex: 1 }} color="ink2">I have read the storage agreement and agree to its terms. Typing my name is my electronic signature.</Text>
        </Pressable>

        <Button title="Sign & activate" loading={busy} disabled={!agree || name.trim().split(/\s+/).length < 2} onPress={sign} />
      </Page>
    </Screen>
  );
}
