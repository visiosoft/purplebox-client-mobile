import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { accountApi } from '@/api/account';
import { Button, Card, Input, Screen, Text, TopBar } from '@/components/ui';
import { LegalLinks } from '@/components/LegalLinks';
import { useAuth } from '@/store/auth';
import { useI18n } from '@/i18n';

export default function DeleteAccount() {
  const { t } = useI18n();
  const router = useRouter();
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const [requested, setRequested] = useState(false);
  useEffect(() => {
    if (!wait) return;
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const send = async () => {
    setBusy(true);
    try {
      const result = await accountApi.requestDeletionCode();
      setSentTo(result.sentTo);
      setCode(__DEV__ ? result.code ?? '' : '');
      setWait(30);
    } catch (e) { Alert.alert(t('Could not send code'), (e as Error).message); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await accountApi.delete(code);
      setRequested(true);
    } catch (e) { Alert.alert(t('Could not request deletion'), (e as Error).message); }
    finally { setBusy(false); }
  };
  const confirm = () => Alert.alert(t('Request account deletion?'), t('Your account access will be closed and our team will process your data deletion request.'), [
    { text: t('Cancel'), style: 'cancel' },
    { text: t('Request deletion'), style: 'destructive', onPress: remove },
  ]);

  return (
    <Screen keyboard>
      <TopBar title={t('Delete account')} />
      <View style={{ gap: 18, paddingVertical: 20 }}>
        {requested ? <>
          <Text variant="h2">{t('Deletion requested')}</Text>
          <Text>{t('Your account access is closed. Our team will review the records that must be retained and confirm when deletion is complete.')}</Text>
          <Button title={t('Sign out')} loading={busy} onPress={async () => {
            setBusy(true);
            await useAuth.getState().logout();
          }} />
        </> : <>
          <Text variant="h2">{t('Request account deletion')}</Text>
          <Card style={{ gap: 12 }}>
            <Text>{t('We will close your app access and ask our team to delete your personal data. Contracts, invoices and other records may need to be retained as described in the privacy policy.')}</Text>
            <Text color="ink2">{t('Deleting your account does not cancel storage contracts, scheduled services or outstanding payments. Contact us to arrange check-out first.')}</Text>
          </Card>
          {sentTo ? <>
            <Text>{t('Enter the code we sent to {phone}.', { phone: sentTo })}</Text>
            <Input label={t('Verification code')} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, ''))} maxLength={6} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" editable={!busy} style={{ writingDirection: 'ltr', textAlign: 'left' }} />
            <Button title={t('Request deletion')} loading={busy} disabled={!/^\d{6}$/.test(code)} onPress={confirm} />
            <Button title={wait ? t('Resend code in {n}s', { n: wait }) : t('Resend code')} variant="soft" disabled={busy || wait > 0} onPress={send} />
          </> : <Button title={t('Send verification code')} loading={busy} onPress={send} />}
          <Button title={t('Keep my account')} variant="soft" disabled={busy} onPress={() => router.back()} />
        </>}
        <LegalLinks />
      </View>
    </Screen>
  );
}
