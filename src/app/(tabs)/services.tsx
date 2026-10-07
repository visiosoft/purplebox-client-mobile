import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Calculator, ChevronRight, LogOut, MessageCircle, Package, PlusCircle, Undo2, Link2 } from 'lucide-react-native';
import { Card, Screen, Text } from '@/components/ui';
import { Page, Row, RowIcon } from '@/components/bits';
import { WHATSAPP } from '@/lib/contact';
import { useTheme } from '@/theme/useTheme';

export default function ServicesTab() {
  const router = useRouter();
  const { c } = useTheme();
  const go = (path: string) => () => router.push(path as never);
  const item = (icon: typeof Package, title: string, sub: string, onPress: () => void) => (
    <Row leading={<RowIcon icon={icon} />} title={title} sub={sub} onPress={onPress} right={<ChevronRight color={c.ink3} size={18} strokeWidth={1.6} />} />
  );

  return (
    <Screen>
      <Text variant="h1" style={{ marginTop: 8, marginBottom: 14 }}>Services</Text>
      <Page>
        <Card style={{ paddingVertical: 8 }}>
          <Text variant="overline" color="ink3" style={{ marginTop: 10 }}>Get storage</Text>
          {item(Calculator, 'Space estimator', 'Work out which size you need', go('/estimator'))}
          {item(PlusCircle, 'Book a unit', 'Pick a size, pay online, sign', go('/book'))}
          {item(Link2, 'Link an existing unit', "Already stored with us? Add it to this account", go('/link-unit'))}
        </Card>
        <Card style={{ paddingVertical: 8 }}>
          <Text variant="overline" color="ink3" style={{ marginTop: 10 }}>Moving out</Text>
          {item(LogOut, 'Request check-out', 'Move out early or extend your stay', go('/checkout'))}
          {item(Undo2, 'Request a refund', 'Get your deposit back after check-out', go('/refund'))}
        </Card>
        <Card style={{ paddingVertical: 8 }}>
          <Text variant="overline" color="ink3" style={{ marginTop: 10 }}>Help</Text>
          {item(MessageCircle, 'Chat with us', 'WhatsApp, 7 days a week', () => Linking.openURL(WHATSAPP))}
        </Card>
        <View style={{ height: 4 }} />
      </Page>
    </Screen>
  );
}
