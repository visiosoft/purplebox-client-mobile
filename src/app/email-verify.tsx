import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Mail, ShieldCheck } from 'lucide-react-native';
import { Button, Input, Screen, Text, TopBar } from '@/components/ui';
import { profileApi } from '@/api/profile';
import { useProfile } from '@/hooks/useProfile';

// Type your email, get a code at that address, enter it. A verified email also brings your invoices from our accounts system.
export default function EmailVerify() {
  const router = useRouter();
  const qc = useQueryClient();
  const { customer } = useProfile();
  const [email, setEmail] = useState(customer?.email ?? '');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e: any) { Alert.alert('Email', e.message); } finally { setBusy(false); }
  };
  const send = () => run(async () => { const r = await profileApi.emailRequest(email.trim()); if (r.code) setCode(r.code); setSent(true); });
  const verify = () => run(async () => {
    await profileApi.emailVerify(email.trim(), code);
    await qc.invalidateQueries({ queryKey: ['profile'] });
    qc.invalidateQueries({ queryKey: ['billing'] });
    Alert.alert('Email verified', 'Thank you. We will use it for receipts and to bring in your invoices.', [{ text: 'OK', onPress: () => router.back() }]);
  });

  return (
    <Screen style={{ gap: 18 }}>
      <TopBar title="Your email" onBack={sent ? () => { setSent(false); setCode(''); } : undefined} />
      <View style={{ marginTop: -8 }}>
        <Text color="ink2">{sent ? `Enter the code we sent to ${email.trim()}.` : 'We will send a code to this address to make sure it is yours.'}</Text>
      </View>
      {!sent ? (
        <>
          <Input label="Email" icon={Mail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} onChangeText={setEmail} />
          <Button title="Send code" loading={busy} disabled={!valid} onPress={send} />
        </>
      ) : (
        <>
          <Input label="Verification code" icon={ShieldCheck} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6} value={code} onChangeText={setCode} />
          <Button title="Verify email" loading={busy} disabled={code.length < 4} onPress={verify} />
          <Button title="Send a new code" variant="ghost" disabled={busy} onPress={send} />
        </>
      )}
    </Screen>
  );
}
