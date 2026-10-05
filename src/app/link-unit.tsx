import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, MessageCircle, RefreshCw, Shield } from 'lucide-react-native';
import {
  BottomSheet, Button, Card, Heading, Icon, Input, OTPInput, Screen, ScrollBody, StickyFooter, SuccessCheck, SuggestionChip,
  Text, TopBar,
} from '@/components';
import { useTheme } from '@/theme/useTheme';
import { fonts, space } from '@/theme/tokens';
import { storageApi } from '@/api/storage';
import { ApiError, saveToken } from '@/api/client';
import { useAuth } from '@/store/auth';
import { openWhatsApp } from '@/lib/contact';

// The code is sent to the phone number on the agreement, so this proves the
// person linking it holds that number — not just that they know the agreement no.
export default function LinkUnit() {
  const router = useRouter();
  const qc = useQueryClient();
  const { c } = useTheme();
  const [contractNo, setContractNo] = useState('');
  const [masked, setMasked] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [busy, setBusy] = useState(false);
  const [linked, setLinked] = useState(false);
  const no = contractNo.trim().toUpperCase();

  const lookup = async () => {
    setBusy(true);
    setLookupError(null);
    try {
      const r = await storageApi.linkRequest(no);
      setMasked(r.maskedPhone);
      setCode('');
      if (r.code) onCode(r.code);
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      setLookupError(
        status === 404 ? `We couldn't find ${no}. Check the number on your agreement, or message us and we'll link it for you.`
          : status === 409 ? 'That agreement is already in your app.'
            : status === 429 ? 'Too many tries. Please wait a minute and try again.'
              : "We couldn't look that up. Check your connection and try again.",
      );
    } finally { setBusy(false); }
  };

  const confirm = async (value: string) => {
    setBusy(true);
    setCodeError(null);
    try {
      const r = await storageApi.linkConfirm(no, value);
      await saveToken(r.token);
      useAuth.setState({ customer: r.customer });
      await qc.invalidateQueries();
      setLinked(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setCodeError(/expired/i.test(msg) ? 'That code has expired. Send a new one.' : /too many/i.test(msg) ? 'Too many wrong tries. Send a new code.' : "That code didn't match.");
      setShake((n) => n + 1);
      setCode('');
    } finally { setBusy(false); }
  };

  function onCode(v: string) {
    setCode(v);
    if (codeError) setCodeError(null);
    if (v.length === 6) confirm(v);
  }

  return (
    <Screen keyboard>
      <TopBar title="Link a unit" onBack={masked ? () => { setMasked(null); setCodeError(null); } : undefined} />
      <ScrollBody>
        {!masked ? (
          <>
            <Heading
              title="Which unit is yours?"
              lead="Enter the agreement number from the top of your contract, like PB-2026-0042."
            />
            <Input
              label="Agreement number"
              icon={FileText}
              ltr
              value={contractNo}
              onChangeText={(t) => { setContractNo(t); setLookupError(null); }}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              placeholder="PB-2026-0042"
              returnKeyType="done"
              onSubmitEditing={() => no && lookup()}
              inputStyle={{ fontFamily: fonts.bold, fontSize: 20 }}
              error={lookupError}
              help="We'll send a code to the mobile on that agreement."
            />
            {lookupError ? (
              <Button block variant="ghost" icon={MessageCircle} title="Chat on WhatsApp" style={{ marginTop: space[3] }}
                onPress={() => openWhatsApp(`Hi PurpleBox, please link my agreement ${no} to the app.`)} />
            ) : null}
            <Card variant="lav" style={{ marginTop: 22, flexDirection: 'row', gap: space[3] }}>
              <Icon as={Shield} color={c.brand500} />
              <Text variant="caption" style={{ flex: 1, fontFamily: fonts.regular }}>
                Only the person on the agreement can link a unit. If your mobile changed, we'll verify you on WhatsApp instead.
              </Text>
            </Card>
          </>
        ) : (
          <>
            <Heading
              title="Confirm it's you"
              lead={(
                <Text variant="bodyLg" tone="muted">
                  Sent to <Text variant="bodyLg" style={{ fontFamily: fonts.bold, direction: 'ltr' }}>{masked}</Text> — the mobile on agreement {no}.
                </Text>
              )}
            />
            <OTPInput value={code} onChange={onCode} error={!!codeError} disabled={busy} shakeKey={shake} />
            <View style={{ marginTop: space[4], minHeight: 44, gap: space[3] }}>
              {busy ? (
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={c.brand500} />
                  <Text style={{ fontFamily: fonts.bold, color: c.brand500 }}>Checking…</Text>
                </View>
              ) : codeError ? <Text accessibilityRole="alert" style={{ fontFamily: fonts.semibold, color: c.danger }}>{codeError}</Text> : null}
              {!busy ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
                  <SuggestionChip icon={RefreshCw} label="Send a new code" onPress={lookup} />
                  <SuggestionChip icon={MessageCircle} label="Verify on WhatsApp" onPress={() => openWhatsApp(`Hi PurpleBox, please help me link agreement ${no}.`)} />
                </View>
              ) : null}
            </View>
          </>
        )}
      </ScrollBody>
      {!masked ? (
        <StickyFooter>
          <Button block title="Continue" loading={busy} loadingTitle="Looking it up" disabled={!no} onPress={lookup} />
        </StickyFooter>
      ) : null}

      <BottomSheet visible={linked} onClose={() => router.replace('/(tabs)/units')}>
        <View style={{ alignItems: 'center', gap: space[2] }}>
          <SuccessCheck />
          <Text variant="title2" style={{ fontFamily: fonts.extrabold, marginTop: 6, textAlign: 'center' }}>{no} is linked</Text>
          <Text tone="muted" style={{ textAlign: 'center', marginBottom: space[3] }}>You can now pay, see invoices and manage this unit here.</Text>
          <Button block title="See my units" onPress={() => router.replace('/(tabs)/units')} />
        </View>
      </BottomSheet>
    </Screen>
  );
}
