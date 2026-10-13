import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';
import { User } from 'lucide-react-native';
import { Button, Input, Screen, Text } from '@/components/ui';
import { StatusChip } from '@/components/bits';
import { bookingApi } from '@/api/booking';
import { useAuth } from '@/store/auth';

// Step 2 for a new customer. The root layout keeps them here until the account has a real name.
export default function CreateProfile() {
  const { customer, logout } = useAuth();
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = fullName.trim().length >= 2;

  const save = async () => {
    setBusy(true);
    try {
      const r = await bookingApi.updateProfile({ fullName: fullName.trim() });
      useAuth.setState({ customer: r.customer }); // the root layout then moves on to the app
    } catch (e: any) {
      Alert.alert('Could not save', e.message);
    } finally { setBusy(false); }
  };

  return (
    <Screen style={{ justifyContent: 'center' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ gap: 20 }}>
        <View style={{ gap: 8 }}>
          <StatusChip label="Almost there" tone="brand" />
          <Text variant="display" style={{ marginTop: 10 }}>Tell us{'\n'}about you</Text>
          <Text color="ink2">Your storage contract is made out in this name. You can add your email and more next.</Text>
        </View>
        <Input label="Full name" icon={User} autoCapitalize="words" autoComplete="name" value={fullName} onChangeText={setFullName} />
                <Button title="Create account" loading={busy} disabled={!valid} onPress={save} />
        <Button title={`Not ${customer?.phone ?? 'you'}? Sign out`} variant="ghost" onPress={logout} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
