import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Banner, BannerText, Button, Heading, Input, Screen, ScrollBody, StickyFooter, TopBar } from '@/components';
import { space } from '@/theme/tokens';
import { formatUaeMobile } from '@/lib/format';
import { ApiError } from '@/api/client';
import { useAuth } from '@/store/auth';
import { useOnboarding } from '@/store/onboarding';

/** Keep only the 9 digits after +971, whether typed, pasted with +971 / 00971, or with a leading 0. */
const cleanMobile = (raw: string) => {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('00971')) d = d.slice(5);
  else if (d.startsWith('971') && d.length > 9) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 9);
};

/** Phone first: +971 preset, formats as typed, Continue above the keyboard. */
export default function Phone() {
  const router = useRouter();
  const requestOtp = useAuth((s) => s.requestOtp);
  const [digits, setDigits] = useState(useOnboarding.getState().phone);
  const [invalid, setInvalid] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!/^5\d{8}$/.test(digits)) { setInvalid(true); return; }
    setBusy(true);
    setFailed(null);
    try {
      const devCode = await requestOtp(`+971${digits}`);
      useOnboarding.getState().set({ phone: digits });
      router.push({ pathname: '/(auth)/code', params: devCode ? { dev: devCode } : {} });
    } catch (e) {
      setFailed(e instanceof ApiError && e.status === 429 ? e.message : e instanceof ApiError && e.status && e.status < 500
        ? e.message : "We couldn't send the code. Check your connection and try again — what you typed is still here.");
    } finally { setBusy(false); }
  };

  return (
    <Screen keyboard>
      <TopBar />
      <ScrollBody>
        <Heading title="Enter your phone" lead="We'll send a 6-digit code to your WhatsApp. No passwords to remember." />
        {failed ? (
          <Banner tone="error" style={{ marginBottom: space[4] }} action={{ label: 'Try again', onPress: send }}>
            <BannerText>{failed}</BannerText>
          </Banner>
        ) : null}
        <Input
          label="Mobile number"
          prefix="+971"
          ltr
          value={formatUaeMobile(digits)}
          onChangeText={(t) => { setDigits(cleanMobile(t)); setInvalid(false); }}
          placeholder="50 123 4567"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={send}
          inputStyle={{ fontSize: 20 }}
          error={invalid ? "That doesn't look like a UAE mobile. It should start with 5 and have 9 digits." : null}
          help="UAE mobiles only for now. We use it for your login and payment reminders."
        />
      </ScrollBody>
      <StickyFooter>
        <Button block title="Continue" loading={busy} loadingTitle="Sending code" disabled={digits.length !== 9} onPress={send} />
      </StickyFooter>
    </Screen>
  );
}
