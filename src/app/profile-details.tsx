import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Globe, MapPin, PhoneCall } from 'lucide-react-native';
import { Button, Input, Screen, Text, TopBar } from '@/components/ui';
import { profileApi } from '@/api/profile';
import { useProfile } from '@/hooks/useProfile';
import { useI18n } from '@/i18n';
import { toE164 } from '@/lib/format';

// The small details on a contract: who to call in an emergency, nationality, address.
export default function ProfileDetails() {
  const router = useRouter();
  const { t } = useI18n();
  const qc = useQueryClient();
  const { customer } = useProfile();
  const [emergency, setEmergency] = useState(customer?.emergencyNumber || '');
  const [nationality, setNationality] = useState(customer?.nationality || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await profileApi.details({ emergencyNumber: emergency.trim() ? toE164(emergency) : '', nationality: nationality.trim(), address: address.trim() });
      await qc.invalidateQueries({ queryKey: ['profile'] });
      router.back();
    } catch (e: any) { Alert.alert(t('Could not save'), e.message); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <TopBar title={t('Your details')} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text color="ink2">{t('These appear on your storage contract. All optional.')}</Text>
          <Input label={t('Emergency contact number')} icon={PhoneCall} keyboardType="phone-pad" placeholder="+971 50 123 4567" value={emergency} onChangeText={setEmergency} style={{ textAlign: 'left', writingDirection: 'ltr' }} />
          <Input label={t('Nationality')} icon={Globe} autoCapitalize="words" value={nationality} onChangeText={setNationality} />
          <Input label={t('Address')} icon={MapPin} autoCapitalize="words" value={address} onChangeText={setAddress} />
          <View style={{ height: 4 }} />
          <Button title={t('Save')} loading={busy} onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
