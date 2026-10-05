import { useRouter } from 'expo-router';
import { Button, Heading, Screen, ScrollBody, StickyFooter, TopBar, useProfileForm } from '@/components';

// The agreement is made out to this name and the receipt goes to this email, so
// both are needed before a unit is held. (Review asks for them inline; this route
// stays for links that still point here.)
export default function Details() {
  const router = useRouter();
  const form = useProfileForm({ strict: true, onSaved: () => router.replace('/book/review') });
  return (
    <Screen keyboard>
      <TopBar title="Book a unit" />
      <ScrollBody>
        <Heading title="Your details" lead="Your agreement is made out in this name, and your receipt goes to this email." />
        {form.fields}
      </ScrollBody>
      <StickyFooter>
        <Button block title="Continue" loading={form.busy} loadingTitle="Saving" onPress={form.submit} />
      </StickyFooter>
    </Screen>
  );
}
