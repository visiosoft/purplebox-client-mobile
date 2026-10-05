import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MessageCircle, RefreshCw } from 'lucide-react-native';
import { Heading, OTPInput, Screen, ScrollBody, SuggestionChip, Text, TextLink, TopBar, toast } from '@/components';
import { useTheme } from '@/theme/useTheme';
import { fonts, space } from '@/theme/tokens';
import { formatUaeMobile } from '@/lib/format';
import { openWhatsApp } from '@/lib/contact';
import { ApiError } from '@/api/client';
import { useAuth } from '@/store/auth';
import { useOnboarding } from '@/store/onboarding';

const MAX_TRIES = 5;

/** Six boxes, verifies on the sixth digit. Resend after 30s, with WhatsApp as a fallback. */
export default function Code() {
  const router = useRouter();
  const { c } = useTheme();
  const { dev } = useLocalSearchParams<{ dev?: string }>();
  const phone = useOnboarding((s) => s.phone);
  const { verifyOtp, requestOtp } = useAuth();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const [shake, setShake] = useState(0);
  const [timer, setTimer] = useState(30);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const verify = async (value: string) => {
    setChecking(true);
    setError(null);
    try {
      await verifyOtp(`+971${phone}`, value);
      // The root gate takes it from here.
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      const msg = e instanceof Error ? e.message : '';
      const left = MAX_TRIES - (misses + 1);
      if (status === 401 && /expired/i.test(msg)) setError('That code has expired. Tap Resend code for a new one.');
      else if (status === 429) setError('Too many wrong tries. Get a new code, or ask us for one on WhatsApp.');
      else if (status === 401) setError(left > 0 ? `That code didn't match — ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'That code didn\'t match. Get a new code to try again.');
      else setError("We couldn't check the code. Check your connection and try again.");
      if (status === 401 && !/expired/i.test(msg)) setMisses((m) => m + 1);
      setShake((n) => n + 1);
      setCode('');
    } finally { setChecking(false); }
  };

  const onChange = (v: string) => {
    setCode(v);
    if (error) setError(null);
    if (v.length === 6 && !checking) verify(v);
  };

  // A non-production server hands back the code so a test build can sign in.
  useEffect(() => {
    if (dev && /^\d{6}$/.test(dev)) onChange(dev);
    // Run once for the code we arrived with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dev]);

  const resend = async () => {
    try {
      const again = await requestOtp(`+971${phone}`);
      setTimer(30);
      setMisses(0);
      setError(null);
      setCode('');
      if (again) onChange(again);
      toast('New code sent');
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't send a new code — try again");
    }
  };

  return (
    <Screen keyboard>
      <TopBar />
      <ScrollBody>
        <Heading
          title="Enter the code"
          lead={(
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              <Text variant="bodyLg" tone="muted">Sent to</Text>
              <Text variant="bodyLg" style={{ fontFamily: fonts.bold, direction: 'ltr' }}>+971 {formatUaeMobile(phone)}</Text>
              <TextLink title="Change" onPress={() => router.back()} />
            </View>
          )}
        />
        <OTPInput value={code} onChange={onChange} error={!!error} disabled={checking} shakeKey={shake} />
        <View style={{ marginTop: space[4], minHeight: 44 }}>
          {checking ? (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={c.brand500} />
              <Text style={{ fontFamily: fonts.bold, color: c.brand500 }}>Checking…</Text>
            </View>
          ) : error ? (
            <Text accessibilityRole="alert" style={{ fontFamily: fonts.semibold, color: c.danger }}>{error}</Text>
          ) : null}
          {!checking ? (
            timer > 0 ? (
              <Text variant="caption" tone="muted" style={{ marginTop: error ? space[3] : 0 }}>
                Resend code in <Text variant="caption" style={{ fontFamily: fonts.bold }}>0:{String(timer).padStart(2, '0')}</Text>
              </Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: error ? space[3] : 0 }}>
                <SuggestionChip icon={RefreshCw} label="Resend code" onPress={resend} />
                <SuggestionChip icon={MessageCircle} label="Get it on WhatsApp" onPress={() => openWhatsApp(`Hi, I need my PurpleBox login code for +971 ${formatUaeMobile(phone)}`)} />
              </View>
            )
          ) : null}
        </View>
      </ScrollBody>
    </Screen>
  );
}
