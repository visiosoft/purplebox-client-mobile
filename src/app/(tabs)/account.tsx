import { View } from 'react-native';
import { Button, Card, Screen, Text } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { usePrefs } from '@/store/prefs';

export default function AccountTab() {
  const { customer, logout } = useAuth();
  const { theme, setTheme } = usePrefs();
  return (
    <Screen style={{ paddingTop: 64, gap: 16 }}>
      <Text variant="h1">Account</Text>
      <Card style={{ gap: 4 }}>
        <Text variant="h3">{customer?.fullName || 'Customer'}</Text>
        <Text variant="meta">{customer?.phone}</Text>
      </Card>
      <View style={{ gap: 10 }}>
        <Button variant="soft" title={`Theme: ${theme}`}
          onPress={() => setTheme(theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system')} />
        <Button variant="ghost" title="Sign out" onPress={logout} />
      </View>
    </Screen>
  );
}
