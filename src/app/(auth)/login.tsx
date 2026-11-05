import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Phone, ShieldCheck } from 'lucide-react-native';
import { Button, Input, Screen, Text } from '@/components/ui';
import { StatusChip } from '@/components/bits';
import { contactValid, contactValue } from '@/components/ContactField';
import { LegalLinks } from '@/components/LegalLinks';
import { useAuth } from '@/store/auth';
import { useI18n } from '@/i18n';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

const ltr = { textAlign: 'left', writingDirection: 'ltr' } as const; // digits always read left to right

// Follow the authentication mode advertised by the server.
export default function Login() {
  const { t } = useI18n();
  const { requestOtp, verifyOtp, loginWithPhone } = useAuth();
  const options = useQuery({ queryKey: ['login-options'], queryFn: () => api<{ phoneOnly: boolean }>('/customer-auth/login-options'), retry: false, staleTime: 0 });
  const phoneOnly = options.data?.phoneOnly === true;
  const kind = 'phone' as const;
  const [contact, setContact] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const id = contactValue(kind, contact);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); } catch (e: any) { Alert.alert(t('Something went wrong'), e.message); } finally { setBusy(false); }
  };
  const send = () => run(async () => {
    if (phoneOnly) { await loginWithPhone(id); return; }
    const r = await requestOtp(id);
    setCode(__DEV__ ? r.code ?? '' : '');
    setSentTo(r.sentTo ?? id);
    setWait(30);
  });

  return (
    <Screen keyboard style={{ justifyContent: 'center' }}>
      <View style={{ gap: 20 }}>
        <View style={{ gap: 8 }}>
          <StatusChip label="PurpleBox Storage" tone="brand" />
          <Text variant="display" style={{ marginTop: 10 }}>{sentTo ? t('Check your\nmessages') : t(phoneOnly ? 'Log in' : 'Log in or\nsign up')}</Text>
          <Text color="ink2">
            {sentTo
              ? t('Enter the code we sent on WhatsApp to {phone}.', { phone: sentTo })
              : phoneOnly ? t('Use the mobile number on your storage account to continue.')
              : t('Use your WhatsApp mobile number. If you already rent with us, use the number on your storage account.')}
          </Text>
        </View>
        {!sentTo ? (
          <>
            <Input label={t(phoneOnly ? 'Mobile number' : 'WhatsApp mobile number')} icon={Phone} placeholder="+971 50 123 4567" keyboardType="phone-pad" autoComplete="tel" style={ltr}
              value={contact} onChangeText={setContact} editable={!busy} onSubmitEditing={() => !busy && !options.isPending && contactValid(kind, contact) && send()} />
            <Button title={t(phoneOnly ? 'Continue' : 'Send code on WhatsApp')} loading={busy || options.isPending} disabled={!contactValid(kind, contact)} onPress={send} />
          </>
        ) : (
          <>
            <Input label={t('Verification code')} icon={ShieldCheck} style={ltr} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" value={code} onChangeText={setCode} maxLength={6} />
            <Button title={t('Verify & continue')} loading={busy} disabled={!/^\d{6}$/.test(code)} onPress={() => run(() => verifyOtp(id, code))} />
            <Button title={wait > 0 ? t('Resend code in {n}s', { n: wait }) : t('Resend code')} variant="soft" disabled={wait > 0 || busy} onPress={send} />
            <Button title={t('Use a different number')} variant="ghost" disabled={busy} onPress={() => { setSentTo(null); setCode(''); }} />
          </>
        )}
        <LegalLinks />
      </View>
    </Screen>
  );
}
