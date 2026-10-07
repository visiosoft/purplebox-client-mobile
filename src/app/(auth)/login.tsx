import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Phone, ShieldCheck } from 'lucide-react-native';
import { Button, Input, Screen, Text } from '@/components/ui';
import { StatusChip } from '@/components/bits';
import { useAuth } from '@/store/auth';
import { toE164 } from '@/lib/format';

// One screen for everyone: existing customers land on their units, new ones are
// asked for their name next (see profile.tsx).
export default function Login() {
  const { requestOtp, verifyOtp } = useAuth();
  const [phone, setPhone] = useState('+971 ');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); } catch (e: any) { Alert.alert('Something went wrong', e.message); } finally { setBusy(false); }
  };
  const send = () => run(async () => { const dev = await requestOtp(toE164(phone)); if (dev) setCode(dev); setSent(true); setWait(30); });

  return (
    <Screen style={{ justifyContent: 'center' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ gap: 20 }}>
        <View style={{ gap: 8 }}>
          <StatusChip label="PurpleBox Storage" tone="brand" />
          <Text variant="display" style={{ marginTop: 10 }}>{sent ? 'Check your\nmessages' : 'Log in or\nsign up'}</Text>
          <Text color="ink2">{sent ? `Enter the code we sent to ${toE164(phone)}.` : "Enter your mobile number. We'll send a code — new here? We'll set up your account."}</Text>
        </View>
        {!sent ? (
          <>
            <Input label="Mobile number" icon={Phone} placeholder="+971 50 123 4567" keyboardType="phone-pad" autoComplete="tel" value={phone} onChangeText={setPhone} />
            <Button title="Send code" loading={busy} disabled={toE164(phone).replace(/\D/g, '').length < 11} onPress={send} />
          </>
        ) : (
          <>
            <Input label="Verification code" icon={ShieldCheck} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" value={code} onChangeText={setCode} maxLength={6} />
            <Button title="Verify & continue" loading={busy} disabled={code.length < 4} onPress={() => run(() => verifyOtp(toE164(phone), code))} />
            <Button title={wait > 0 ? `Resend code in ${wait}s` : 'Resend code'} variant="soft" disabled={wait > 0 || busy} onPress={send} />
            <Button title="Use a different number" variant="ghost" onPress={() => { setSent(false); setCode(''); }} />
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
