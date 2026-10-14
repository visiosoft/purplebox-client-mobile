import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, ShieldCheck } from 'lucide-react-native';
import { Button, Card, Input, Screen, Text, TopBar } from '@/components/ui';
import { storageApi } from '@/api/storage';
import { saveToken } from '@/api/client';
import { useI18n } from '@/i18n';
import { useAuth } from '@/store/auth';

// The code is sent to the phone number on the contract, so this proves the
// person linking it holds that number — not just that they know the contract no.
export default function LinkUnit() {
  const router = useRouter();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [contractNo, setContractNo] = useState('');
  const [code, setCode] = useState('');
  const [masked, setMasked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e: any) { Alert.alert(t('Link unit'), e.message); } finally { setBusy(false); }
  };

  return (
    <Screen style={{ gap: 18 }}>
      <TopBar title={t('Link your unit')} onBack={masked ? () => { setMasked(null); setCode(''); } : undefined} />
      <View style={{ gap: 8, marginTop: -8 }}>
        <Text color="ink2">{masked ? t('We sent a code to the number on your contract ({masked}).', { masked }) : t('Enter the number printed on your storage contract.')}</Text>
      </View>
      {!masked ? (
        <>
          <Input label={t('Contract number')} icon={FileText} placeholder="PB-2026-0042" autoCapitalize="characters" value={contractNo} onChangeText={setContractNo} style={{ textAlign: 'left', writingDirection: 'ltr' }} />
          <Button title={t('Send code')} loading={busy} disabled={!contractNo.trim()}
            onPress={() => run(async () => { const r = await storageApi.linkRequest(contractNo.trim()); setMasked(r.maskedPhone); if (r.code) setCode(r.code); })} />
        </>
      ) : (
        <>
          <Input label={t('Verification code')} icon={ShieldCheck} keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} style={{ textAlign: 'left', writingDirection: 'ltr' }} />
          <Button title={t('Link unit')} loading={busy} disabled={code.length < 6}
            onPress={() => run(async () => {
              const r = await storageApi.linkConfirm(contractNo.trim(), code);
              await saveToken(r.token);
              useAuth.setState({ customer: r.customer });
              await qc.invalidateQueries();
              router.replace('/(tabs)');
            })} />
        </>
      )}
      <Card variant="dark" style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 18 }}>
        <ShieldCheck color="#F8D45C" size={20} strokeWidth={1.6} />
        <Text variant="meta" color="onDk2" style={{ flex: 1 }}>{t('The code goes to the mobile on the contract, so only the person on it can link the unit.')}</Text>
      </Card>
    </Screen>
  );
}
