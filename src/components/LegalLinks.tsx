import { Alert, Linking, View } from 'react-native';
import { Button } from '@/components/ui';
import { PRIVACY_URL, TERMS_URL } from '@/lib/legal';
import { useI18n } from '@/i18n';

export function LegalLinks() {
  const { t } = useI18n();
  const open = (url: string) => Linking.openURL(url).catch(() => Alert.alert(t('Could not open link'), t('Please try again.')));
  return (
    <View style={{ gap: 4 }}>
      <Button title={t('Privacy policy')} variant="ghost" onPress={() => open(PRIVACY_URL)} />
      <Button title={t('Terms of service')} variant="ghost" onPress={() => open(TERMS_URL)} />
    </View>
  );
}
