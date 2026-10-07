import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Check, FileText, PenLine } from 'lucide-react-native';
import { Button, Card, Input, Screen, Text, TopBar } from '@/components/ui';
import { Page, Steps } from '@/components/bits';
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
    <Screen>
      <TopBar title="Sign your contract" />
      <Page loading={q.isLoading} error={q.error?.message}>
        <Steps current={3} />
        <Text color="ink2">Payment received. One last step and the unit is yours.</Text>
        {b ? (
          <Card style={{ gap: 4 }}>
            <Text variant="h2">Unit {b.unit.unitNumber} · {b.unit.sizeSqf} sq ft</Text>
            <Text variant="meta">{b.contractNo ? `${b.contractNo} · ` : ''}{shortDate(b.unit.startDate)} → {shortDate(b.unit.endDate)}</Text>
          </Card>
        ) : null}
        <Button title="Read the contract (PDF)" variant="soft" icon={FileText}
          onPress={() => openDocument({ href: bookingApi.contractHref(id), title: b?.contractNo ?? 'Contract' }).catch((e) => Alert.alert('Contract', e.message))} />

        <Input label="Type your full name to sign" icon={PenLine} autoCapitalize="words" value={name} onChangeText={setName} />
        {name.trim() ? (
          <View style={{ borderBottomWidth: 1, borderBottomColor: c.ln2, borderStyle: 'dashed', paddingVertical: 8 }}>
            <Text style={{ fontSize: 34, fontStyle: 'italic', fontFamily: fonts.light, letterSpacing: -0.8 }}>{name}</Text>
          </View>
        ) : null}

        <Pressable onPress={() => setAgree(!agree)} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: agree ? 0 : 1.5, borderColor: c.ln2, backgroundColor: agree ? c.ac : c.sf, alignItems: 'center', justifyContent: 'center' }}>
            {agree ? <Check color={c.acInk} size={15} strokeWidth={2.2} /> : null}
          </View>
          <Text style={{ flex: 1 }} color="ink2">I have read the storage contract and agree to its terms. Typing my name is my electronic signature.</Text>
        </Pressable>

        <Button title="Sign & activate" variant="accent" loading={busy} disabled={!agree || name.trim().split(/\s+/).length < 2} onPress={sign} />
      </Page>
    </Screen>
  );
}
