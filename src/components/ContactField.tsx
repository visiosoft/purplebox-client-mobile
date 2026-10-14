import { View } from 'react-native';
import { AtSign, Phone } from 'lucide-react-native';
import { Input } from './ui';
import { Segmented } from './bits';
import { toE164 } from '@/lib/format';
import { useI18n } from '@/i18n';

const ltr = { textAlign: 'left', writingDirection: 'ltr' } as const; // numbers and emails read left to right

export type ContactKind = 'phone' | 'email';

/** What to send the server: a mobile in E.164, or the email as typed. */
export const contactValue = (kind: ContactKind, raw: string) => (kind === 'phone' ? toE164(raw) : raw.trim());

// A UAE number is exactly 971 + 9 digits; anything else needs at least 11 digits.
const phoneValid = (raw: string) => {
  const d = toE164(raw).slice(1);
  return d.startsWith('971') ? d.length === 12 : d.length >= 11;
};

export const contactValid = (kind: ContactKind, raw: string) =>
  kind === 'phone' ? phoneValid(raw) : /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw.trim());

/** Mobile / Email switch over one input: the customer gives whichever we have on file for them. */
export function ContactField({ kind, onKind, value, onChange, onSubmit }: {
  kind: ContactKind; onKind: (k: ContactKind) => void; value: string; onChange: (v: string) => void; onSubmit?: () => void;
}) {
  const { t } = useI18n();
  return (
    <View style={{ gap: 12 }}>
      <Segmented value={kind} onChange={(k) => { onKind(k); onChange(''); }}
        options={[{ value: 'phone', label: t('Mobile') }, { value: 'email', label: t('Email') }]} />
      {kind === 'phone' ? (
        <Input key="phone" label={t('Mobile number')} icon={Phone} placeholder="+971 50 123 4567" keyboardType="phone-pad" autoComplete="tel"
          value={value} onChangeText={onChange} returnKeyType="done" onSubmitEditing={onSubmit} style={ltr} />
      ) : (
        <Input key="email" label={t('Email address')} icon={AtSign} placeholder="you@example.com" keyboardType="email-address" autoComplete="email"
          autoCapitalize="none" autoCorrect={false} value={value} onChangeText={onChange} returnKeyType="done" onSubmitEditing={onSubmit} style={ltr} />
      )}
    </View>
  );
}
