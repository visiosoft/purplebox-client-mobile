import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Phone, ShieldCheck } from 'lucide-react-native';
import { Button, Input, Screen, Text } from '@/components/ui';
import { StatusChip } from '@/components/bits';
import { useAuth } from '@/store/auth';

export default function Login() {
  const { requestOtp, verifyOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); } catch (e: any) { Alert.alert('Something went wrong', e.message); } finally { setBusy(false); }
  };

  return (
    <Screen style={{ justifyContent: 'center' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ gap: 20 }}>
        <View style={{ gap: 8 }}>
          <StatusChip label="PurpleBox Storage" tone="brand" />
          <Text variant="display" style={{ marginTop: 10 }}>Welcome{'\n'}back</Text>
          <Text color="ink2">{sent ? `Enter the code sent to ${phone}` : 'Log in with your mobile number.'}</Text>
        </View>
        {!sent ? (
          <>
            <Input label="Mobile number" icon={Phone} placeholder="+971 5X XXX XXXX" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            <Button title="Send code" loading={busy} disabled={phone.replace(/\D/g, '').length < 9}
              onPress={() => run(async () => { const dev = await requestOtp(phone.trim()); if (dev) setCode(dev); setSent(true); })} />
          </>
        ) : (
          <>
            <Input label="Verification code" icon={ShieldCheck} keyboardType="number-pad" value={code} onChangeText={setCode} maxLength={6} />
            <Button title="Verify & continue" loading={busy} disabled={code.length < 4}
              onPress={() => run(() => verifyOtp(phone.trim(), code))} />
            <Button title="Use a different number" variant="ghost" onPress={() => { setSent(false); setCode(''); }} />
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
