import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Phone, ShieldCheck } from 'lucide-react-native';
import { Button, Input, Screen, Text } from '@/components/ui';
import { StatusChip } from '@/components/bits';
import { useAuth } from '@/store/auth';
import { toE164 } from '@/lib/format';
import { useI18n } from '@/i18n';

const ltr = { textAlign: 'left', writingDirection: 'ltr' } as const; // digits always read left to right

// One screen for everyone: existing customers land on their units, new ones are
// asked for their name next (see profile.tsx).
export default function Login() {
  const { t } = useI18n();
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
    try { await fn(); } catch (e: any) { Alert.alert(t('Something went wrong'), e.message); } finally { setBusy(false); }
  };
  const send = () => run(async () => { const dev = await requestOtp(toE164(phone)); if (dev) setCode(dev); setSent(true); setWait(30); });

  return (
    <Screen style={{ justifyContent: 'center' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ gap: 20 }}>
        <View style={{ gap: 8 }}>
          <StatusChip label="PurpleBox Storage" tone="brand" />
          <Text variant="display" style={{ marginTop: 10 }}>{sent ? t('Check your\nmessages') : t('Log in or\nsign up')}</Text>
          <Text color="ink2">{sent ? t('Enter the code we sent to {phone}.', { phone: toE164(phone) }) : t("Enter your mobile number. We'll send a code — new here? We'll set up your account.")}</Text>
        </View>
        {!sent ? (
          <>
            <Input label={t('Mobile number')} icon={Phone} placeholder="+971 50 123 4567" keyboardType="phone-pad" autoComplete="tel" value={phone} onChangeText={setPhone} style={ltr} />
            <Button title={t('Send code')} loading={busy} disabled={toE164(phone).replace(/\D/g, '').length < 11} onPress={send} />
          </>
        ) : (
          <>
            <Input label={t('Verification code')} icon={ShieldCheck} style={ltr} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" value={code} onChangeText={setCode} maxLength={6} />
            <Button title={t('Verify & continue')} loading={busy} disabled={code.length < 4} onPress={() => run(() => verifyOtp(toE164(phone), code))} />
            <Button title={wait > 0 ? t('Resend code in {n}s', { n: wait }) : t('Resend code')} variant="soft" disabled={wait > 0 || busy} onPress={send} />
            <Button title={t('Use a different number')} variant="ghost" onPress={() => { setSent(false); setCode(''); }} />
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
