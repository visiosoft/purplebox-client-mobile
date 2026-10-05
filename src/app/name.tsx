import { useRouter } from 'expo-router';
import { Button, Heading, Screen, ScrollBody, StickyFooter, useProfileForm } from '@/components';
import { useOnboarding } from '@/store/onboarding';

/** Only shown after sign-in when the account has no real name yet. Email is optional here. */
export default function Name() {
  const router = useRouter();
  const form = useProfileForm({
    onSaved: () => router.replace(useOnboarding.getState().intent === 'existing' ? '/link-unit' : '/(tabs)'),
  });
  return (
    <Screen keyboard>
      <ScrollBody contentStyle={{ paddingTop: 52 }}>
        <Heading title="What should we call you?" lead="This is how we'll greet you and address your agreement and invoices." />
        {form.fields}
      </ScrollBody>
      <StickyFooter>
        <Button block title="Continue" loading={form.busy} loadingTitle="Saving" onPress={form.submit} />
      </StickyFooter>
    </Screen>
  );
}
