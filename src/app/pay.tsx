import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react-native';
import { Button, IconButton, Screen, Text } from '@/components/ui';
import { CheckoutWebView } from '@/components/CheckoutWebView';
import { useTheme } from '@/theme/useTheme';
import { useI18n } from '@/i18n';

// Stripe's secure payment form, shown inside the app. Stripe tells our server when a payment clears (the server then
// updates the invoice and Zoho Books), so when the form finishes or is closed we just go and look at where things stand.
export default function PayScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const qc = useQueryClient();
  const { c } = useTheme();
  const { url, clientSecret, publishableKey, kind, id } = useLocalSearchParams<{ url?: string; clientSecret?: string; publishableKey?: string; kind: 'invoice' | 'booking' | 'card'; id: string }>();
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSoon = () => {
    const go = () => ['billing', 'home', 'invoices', 'payments', 'documents', 'autopay'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    go(); setTimeout(go, 4000);
  };
  const leave = () => {
    if (kind === 'booking') router.replace({ pathname: '/book/status', params: { id } });
    else { refreshSoon(); router.back(); }
  };
  const done = () => { setPaid(true); refreshSoon(); };

  return (
    <Screen style={{ paddingBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 }}>
        <Text variant="h3">{kind === 'card' ? t('Save a card') : t('Secure payment')}</Text>
        <IconButton icon={X} label={t('Close payment')} onPress={leave} />
      </View>
      {paid ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: c.ac, alignItems: 'center', justifyContent: 'center' }}>
            <Check color={c.acInk} size={40} strokeWidth={1.8} />
          </View>
          <Text variant="h1">{kind === 'card' ? t('Card saved') : t('Payment received')}</Text>
          <Text color="ink2" style={{ textAlign: 'center' }}>{kind === 'card' ? t('Thank you! It can take a moment to show on the Auto-pay screen.') : t('Thank you! It can take a moment to show on your invoices.')}</Text>
          <Button title={t('Done')} onPress={leave} style={{ alignSelf: 'stretch' }} />
        </View>
      ) : error ? (
        <View style={{ gap: 12 }}>
          <Text style={{ color: c.err }}>{error}</Text>
          <Button title={t('Close')} variant="soft" onPress={leave} />
        </View>
      ) : clientSecret && publishableKey ? (
        <CheckoutWebView clientSecret={clientSecret} publishableKey={publishableKey} onDone={done} onError={setError} />
      ) : (
        <CheckoutWebView url={url!} onDone={leave} />
      )}
    </Screen>
  );
}
