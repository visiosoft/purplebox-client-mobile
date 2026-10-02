import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Input, Screen, Text } from '@/components/ui';
import { storageApi } from '@/api/storage';
import { saveToken } from '@/api/client';
import { useAuth } from '@/store/auth';

// The code is sent to the phone number on the agreement, so this proves the
// person linking it holds that number — not just that they know the agreement no.
export default function LinkUnit() {
  const router = useRouter();
  const qc = useQueryClient();
  const [contractNo, setContractNo] = useState('');
  const [code, setCode] = useState('');
  const [masked, setMasked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e: any) { Alert.alert('Link unit', e.message); } finally { setBusy(false); }
  };

  return (
    <Screen style={{ justifyContent: 'center', gap: 18 }}>
      <View style={{ gap: 8 }}>
        <Text variant="h1">Link your unit</Text>
        <Text color="ink2">{masked ? `We sent a code to the number on your agreement (${masked}).` : 'Enter the agreement number from your storage contract.'}</Text>
      </View>
      {!masked ? (
        <>
          <Input label="Agreement number" autoCapitalize="characters" value={contractNo} onChangeText={setContractNo} />
          <Button title="Send code" loading={busy} disabled={!contractNo.trim()}
            onPress={() => run(async () => { const r = await storageApi.linkRequest(contractNo.trim()); setMasked(r.maskedPhone); })} />
        </>
      ) : (
        <>
          <Input label="Verification code" keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} />
          <Button title="Link unit" loading={busy} disabled={code.length < 6}
            onPress={() => run(async () => {
              const r = await storageApi.linkConfirm(contractNo.trim(), code);
              await saveToken(r.token);
              useAuth.setState({ customer: r.customer });
              await qc.invalidateQueries();
              router.replace('/(tabs)');
            })} />
        </>
      )}
      <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
