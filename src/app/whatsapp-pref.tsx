import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Phone, ShieldCheck } from 'lucide-react-native';
import { Button, Card, Input, Screen, Text, TopBar } from '@/components/ui';
import { profileApi } from '@/api/profile';
import { useProfile } from '@/hooks/useProfile';
import { useI18n } from '@/i18n';
import { toE164 } from '@/lib/format';
import { useTheme } from '@/theme/useTheme';
import { fonts } from '@/theme/tokens';

// Where should invoices and updates reach you on WhatsApp? Your login number, or another one we check with a code.
export default function WhatsappPref() {
  const router = useRouter();
  const { t } = useI18n();
  const qc = useQueryClient();
  const { c } = useTheme();
  const { customer } = useProfile();
  const [choice, setChoice] = useState<'same' | 'other'>(customer && !customer.whatsapp.sameAsPhone ? 'other' : 'same');
  const [phone, setPhone] = useState(customer?.whatsapp.phone || '+971 ');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e: any) { Alert.alert(t('WhatsApp'), e.message); } finally { setBusy(false); }
  };
  const finish = async () => { await qc.invalidateQueries({ queryKey: ['profile'] }); router.back(); };
  const e164 = toE164(phone);

  const option = (key: 'same' | 'other', title: string, sub: string) => {
    const on = choice === key;
    return (
      <Pressable onPress={() => { setChoice(key); setSent(false); setCode(''); }} accessibilityRole="radio" accessibilityState={{ selected: on }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 2, borderColor: on ? c.ac : 'transparent', paddingVertical: 16 }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? c.ink : c.ln2, alignItems: 'center', justifyContent: 'center' }}>
            {on ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.ink }} /> : null}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 17, color: c.ink }}>{title}</Text>
            <Text variant="meta">{sub}</Text>
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <Screen style={{ gap: 16 }}>
      <TopBar title={t('WhatsApp')} />
      <View style={{ marginTop: -8 }}>
        <Text color="ink2">{t('Choose where we send invoices, reminders and updates on WhatsApp. We only message you about your storage.')}</Text>
      </View>

      {option('same', customer?.phone ? t('Use {phone}', { phone: customer.phone }) : t('Use my login number'), t('The number you signed in with'))}
      {option('other', t('Use a different number'), t('We will send it a code to confirm'))}

      {choice === 'other' ? (
        sent ? (
          <>
            <Input label={t('Code sent to WhatsApp')} icon={ShieldCheck} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6} value={code} onChangeText={setCode} style={{ textAlign: 'left', writingDirection: 'ltr' }} />
            <Button title={t('Confirm number')} loading={busy} disabled={code.length < 4} onPress={() => run(async () => { await profileApi.whatsappVerify(e164, code); await finish(); })} />
          </>
        ) : (
          <>
            <Input label={t('WhatsApp number')} icon={Phone} keyboardType="phone-pad" placeholder="+971 50 123 4567" value={phone} onChangeText={setPhone} style={{ textAlign: 'left', writingDirection: 'ltr' }} />
            <Button title={t('Send code')} loading={busy} disabled={e164.replace(/\D/g, '').length < 11}
              onPress={() => run(async () => { const r = await profileApi.whatsappRequest(e164); if (r.code) setCode(r.code); setSent(true); })} />
          </>
        )
      ) : (
        <Button title={t('Save')} icon={MessageCircle} loading={busy} onPress={() => run(async () => { await profileApi.whatsappSame(); await finish(); })} />
      )}
    </Screen>
  );
}
