import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Input, Screen, Text } from '@/components/ui';
import { Term, bookingApi } from '@/api/booking';
import { useAuth } from '@/store/auth';

// The agreement is made out to this name and the receipt goes to this email, so
// both are needed before a unit is held.
export default function Details() {
  const router = useRouter();
  const { sizeSqf, start, months } = useLocalSearchParams<{ sizeSqf: string; start: string; months: string }>();
  const customer = useAuth((s) => s.customer);
  const [fullName, setFullName] = useState(/^[+\d\s()-]+$/.test(customer?.fullName ?? '') ? '' : customer?.fullName ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [busy, setBusy] = useState(false);
  const valid = fullName.trim().split(/\s+/).length >= 2 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  const go = async () => {
    setBusy(true);
    try {
      const r = await bookingApi.updateProfile({ fullName: fullName.trim(), email: email.trim() });
      useAuth.setState({ customer: r.customer });
      const b = await bookingApi.reserve({ sizeSqf: Number(sizeSqf), startDate: start, months: Number(months) as Term });
      router.replace({ pathname: '/book/review', params: { id: b.bookingId } });
    } catch (e: any) {
      Alert.alert('Could not continue', e.message);
    } finally { setBusy(false); }
  };

  return (
    <Screen style={{ justifyContent: 'center', gap: 18 }}>
      <View style={{ gap: 8 }}>
        <Text variant="h1">Your details</Text>
        <Text color="ink2">Your storage agreement will be made out in this name, and your receipt sent to this email.</Text>
      </View>
      <Input label="Full name (as on your Emirates ID)" autoCapitalize="words" value={fullName} onChangeText={setFullName} />
      <Input label="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <Button title="Continue" loading={busy} disabled={!valid} onPress={go} />
      <Button title="Back" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
