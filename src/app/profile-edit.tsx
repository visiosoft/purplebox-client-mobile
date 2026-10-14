import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, User } from 'lucide-react-native';
import { Button, Input, Screen, Text, TopBar } from '@/components/ui';
import { bookingApi } from '@/api/booking';
import { useI18n } from '@/i18n';
import { useAuth } from '@/store/auth';

export default function ProfileEdit() {
  const router = useRouter();
  const { t } = useI18n();
  const customer = useAuth((s) => s.customer);
  const [fullName, setFullName] = useState(/^[+\d\s()-]+$/.test(customer?.fullName ?? '') ? '' : customer?.fullName ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [busy, setBusy] = useState(false);
  const valid = fullName.trim().length >= 2 && (!email.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()));

  const save = async () => {
    setBusy(true);
    try {
      const r = await bookingApi.updateProfile({ fullName: fullName.trim(), email: email.trim() });
      useAuth.setState({ customer: r.customer });
      router.back();
    } catch (e: any) {
      Alert.alert(t('Could not save'), e.message);
    } finally { setBusy(false); }
  };

  return (
    <Screen keyboard style={{ gap: 18 }}>
      <TopBar title={t('Edit profile')} />
      <Text color="ink2" style={{ marginTop: -8 }}>{t('Your contracts are made out in this name.')}</Text>
      <Input label={t('Full name')} icon={User} autoCapitalize="words" value={fullName} onChangeText={setFullName} />
      <Input label={t('Email')} icon={Mail} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} style={{ textAlign: 'left', writingDirection: 'ltr' }} />
      <Button title={t('Save')} loading={busy} disabled={!valid} onPress={save} />
    </Screen>
  );
}
