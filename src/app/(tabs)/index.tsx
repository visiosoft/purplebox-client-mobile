import { Screen, Text } from '@/components/ui';
import { useAuth } from '@/store/auth';

export default function HomeTab() {
  const name = useAuth((s) => s.customer?.fullName?.split(' ')[0]);
  return (
    <Screen style={{ gap: 8, paddingTop: 64 }}>
      <Text variant="h1">Hi{name ? `, ${name}` : ''}</Text>
      <Text color="ink2">Your unit and next payment will appear here.</Text>
    </Screen>
  );
}
