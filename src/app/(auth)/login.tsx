import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { Button, Input, Screen, Text } from '@/components/ui';
import { StatusChip } from '@/components/bits';
import { ContactField, ContactKind, contactValid, contactValue } from '@/components/ContactField';
import { useAuth } from '@/store/auth';
import { useI18n } from '@/i18n';

const ltr = { textAlign: 'left', writingDirection: 'ltr' } as const; // digits always read left to right

// One screen for everyone. A mobile or email we already hold opens that
// customer's account with their units, contracts and invoices loaded — no
// linking step. A new mobile starts an account and asks for a name next
// (see profile.tsx); an email we don't hold is turned away by the server.
export default function Login() {
  const { t } = useI18n();
  const { requestOtp, verifyOtp } = useAuth();
  const [kind, setKind] = useState<ContactKind>('phone');
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
    const r = await requestOtp(id);
    if (r.code) setCode(r.code);
    setSentTo(r.sentTo ?? id);
    setWait(30);
  });

  return (
    <Screen keyboard style={{ justifyContent: 'center' }}>
      <View style={{ gap: 20 }}>
        <View style={{ gap: 8 }}>
          <StatusChip label="PurpleBox Storage" tone="brand" />
          <Text variant="display" style={{ marginTop: 10 }}>{sentTo ? t('Check your\nmessages') : t('Log in or\nsign up')}</Text>
          <Text color="ink2">
            {sentTo
              ? t('Enter the code we sent to {phone}.', { phone: sentTo })
              : t('Use the mobile or email you gave us. If you already rent with us, your units, contracts and invoices will be waiting.')}
          </Text>
        </View>
        {!sentTo ? (
          <>
            <ContactField kind={kind} onKind={setKind} value={contact} onChange={setContact} onSubmit={() => contactValid(kind, contact) && send()} />
            <Button title={t('Send code')} loading={busy} disabled={!contactValid(kind, contact)} onPress={send} />
          </>
        ) : (
          <>
            <Input label={t('Verification code')} icon={ShieldCheck} style={ltr} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" value={code} onChangeText={setCode} maxLength={6} />
            <Button title={t('Verify & continue')} loading={busy} disabled={code.length < 4} onPress={() => run(() => verifyOtp(id, code))} />
            <Button title={wait > 0 ? t('Resend code in {n}s', { n: wait }) : t('Resend code')} variant="soft" disabled={wait > 0 || busy} onPress={send} />
            <Button title={kind === 'phone' ? t('Use a different number') : t('Use a different email')} variant="ghost" onPress={() => { setSentTo(null); setCode(''); }} />
          </>
        )}
      </View>
    </Screen>
  );
}
