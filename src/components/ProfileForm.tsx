import { useState } from 'react';
import { View } from 'react-native';
import { Input } from './Input';
import { Banner, BannerText } from './Banner';
import { space } from '@/theme/tokens';
import { bookingApi } from '@/api/booking';
import { useAuth } from '@/store/auth';
import { hasRealName } from '@/lib/format';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Name and email, saved to the customer profile. `strict` (booking) needs a full name and an
 * email because the agreement and receipt use them; otherwise email is optional.
 * Returns the fields to render and a `submit` for whichever button the screen puts them with.
 */
export function useProfileForm({ strict, onSaved }: { strict?: boolean; onSaved: () => void }) {
  const customer = useAuth((s) => s.customer);
  const [name, setName] = useState(hasRealName(customer?.fullName) ? customer!.fullName : '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const n = name.trim().replace(/\s+/g, ' ');
    const e = email.trim();
    const next: typeof errors = {};
    if (!n) next.name = 'Please add your name.';
    else if (!hasRealName(n)) next.name = 'Please use letters for your name.';
    else if (strict && n.split(' ').length < 2) next.name = 'Please add your full name, as on your Emirates ID.';
    if (strict && !e) next.email = 'Please add your email — your receipt and agreement go there.';
    else if (e && !EMAIL.test(e)) next.email = "That email doesn't look right. It should be like name@example.com.";
    setErrors(next);
    if (next.name || next.email) return;
    setBusy(true);
    setFailed(false);
    try {
      const r = await bookingApi.updateProfile({ fullName: n, email: e });
      useAuth.setState({ customer: r.customer });
      onSaved();
    } catch {
      setFailed(true);
    } finally { setBusy(false); }
  };

  const fields = (
    <View style={{ gap: space[4] }}>
      {failed ? <Banner tone="error"><BannerText bold="Couldn't save your details.">Check your connection and try again.</BannerText></Banner> : null}
      <Input
        label="Full name"
        value={name}
        onChangeText={(t) => { setName(t); if (errors.name) setErrors((x) => ({ ...x, name: undefined })); }}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        placeholder="e.g. Sara Ahmed"
        error={errors.name}
        help="As on your Emirates ID — it goes on your agreement and invoices."
      />
      <Input
        label={strict ? 'Email' : 'Email (optional)'}
        value={email}
        onChangeText={(t) => { setEmail(t); if (errors.email) setErrors((x) => ({ ...x, email: undefined })); }}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        placeholder="name@example.com"
        error={errors.email}
        help="For receipts and your signed agreement."
        returnKeyType="done"
        onSubmitEditing={submit}
      />
    </View>
  );

  return { fields, submit, busy };
}
