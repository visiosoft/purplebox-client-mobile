import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import { IconButton, Screen, Text } from '@/components/ui';
import { CheckoutWebView } from '@/components/CheckoutWebView';

// Stripe's secure payment page, shown inside the app. Stripe tells the server when a payment clears, so when the
// page finishes (or is closed) we just go and look at where things stand.
export default function PayScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { url, kind, id } = useLocalSearchParams<{ url: string; kind: 'invoice' | 'booking'; id: string }>();

  const done = () => {
    if (kind === 'booking') router.replace({ pathname: '/book/status', params: { id } });
    else {
      ['home', 'invoices', 'payments', 'documents'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      setTimeout(() => ['home', 'invoices', 'payments'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })), 3000);
      router.back();
    }
  };

  return (
    <Screen style={{ paddingBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 }}>
        <Text variant="h3">Secure payment</Text>
        <IconButton icon={X} label="Close payment" onPress={done} />
      </View>
      <CheckoutWebView url={url} onDone={done} />
    </Screen>
  );
}
