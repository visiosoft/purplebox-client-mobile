import { useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, ShieldCheck, Trash2 } from 'lucide-react-native';
import { BiometricGate } from '@/components/BiometricGate';
import { Button, Card, Screen, Text, TopBar } from '@/components/ui';
import { Page, StatusChip } from '@/components/bits';
import { autopayApi } from '@/api/profile';
import { useTheme } from '@/theme/useTheme';
import { dateLocale, useI18n } from '@/i18n';
import { fonts } from '@/theme/tokens';

const BRAND: Record<string, string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', discover: 'Discover', diners: 'Diners Club', jcb: 'JCB', unionpay: 'UnionPay' };

// A saved card and the auto-pay switch. The card number is only ever typed into Stripe's own form; we keep the last four.
function AutopayScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const qc = useQueryClient();
  const { c } = useTheme();
  const q = useQuery({ queryKey: ['autopay'], queryFn: autopayApi.get });
  const s = q.data;
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ['autopay'] });
  const toggle = useMutation({
    mutationFn: ({ on }: { on: boolean }) => autopayApi.set(on, on),
    onSuccess: (d) => qc.setQueryData(['autopay'], d),
    onError: (e: Error) => Alert.alert(t('Auto-pay'), e.message),
  });
  const removeCard = useMutation({
    mutationFn: autopayApi.removeCard,
    onSuccess: (d) => qc.setQueryData(['autopay'], d),
    onError: (e: Error) => Alert.alert(t('Could not remove'), e.message),
  });

  // Saving a card opens Stripe's secure form inside the app (app/pay.tsx); the server stores the card when Stripe reports it.
  const openCardForm = async (enable: boolean) => {
    setBusy(true);
    try {
      const r = await autopayApi.setup(enable);
      if (r.clientSecret && r.publishableKey) router.push({ pathname: '/pay', params: { clientSecret: r.clientSecret, publishableKey: r.publishableKey, kind: 'card', id: 'card' } });
      else if (r.url) router.push({ pathname: '/pay', params: { url: r.url, kind: 'card', id: 'card' } });
    } catch (e: any) { Alert.alert(t('Card'), e.message); } finally { setBusy(false); }
  };

  // Turning auto-pay on is a decision about their money, so say exactly what it means and ask.
  const confirm = (then: () => void) => Alert.alert(t('Pay automatically?'), s?.consentText ?? '', [{ text: t('Not now'), style: 'cancel' }, { text: t('I agree'), onPress: then }]);
  const confirmRemove = () => Alert.alert(t('Remove this card?'), t('Auto-pay will be switched off. You can add a card again any time.'), [{ text: t('Cancel'), style: 'cancel' }, { text: t('Remove'), style: 'destructive', onPress: () => removeCard.mutate() }]);

  const card = s?.card;
  return (
    <Screen>
      <TopBar title={t('Auto-pay')} />
      <Page loading={q.isLoading} error={q.error?.message} refreshing={q.isRefetching} onRefresh={refresh}>
        <Text color="ink2">{t('Save a card and we will pay your storage invoices for you on the due date. You can switch it off or remove the card at any time.')}</Text>

        {card ? (
          <Card variant="dark" style={{ gap: 18, padding: 22 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <CreditCard color={c.ac} size={28} strokeWidth={1.4} />
              {s?.enabled ? <StatusChip label={t('Auto-pay on')} tone="ok" /> : <StatusChip label={t('Auto-pay off')} tone="neutral" />}
            </View>
            <Text style={{ fontFamily: fonts.light, fontSize: 26, letterSpacing: 2, color: '#FFFFFF', writingDirection: 'ltr' }}>••••  ••••  ••••  {card.last4}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="meta" color="onDk2">{BRAND[card.brand] ?? (card.brand ? card.brand : t('Card'))}</Text>
              {card.expMonth && card.expYear ? <Text variant="meta" color="onDk2">{t('Expires {date}', { date: `${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}` })}</Text> : null}
            </View>
          </Card>
        ) : (
          <Card style={{ gap: 8, alignItems: 'center', paddingVertical: 28 }}>
            <CreditCard color={c.ink3} size={34} strokeWidth={1.3} />
            <Text variant="h3">{t('No card saved')}</Text>
            <Text color="ink2" style={{ textAlign: 'center' }}>{t('Add a card to pay invoices in one tap, or let us pay them automatically.')}</Text>
          </Card>
        )}

        {s?.stopped ? (
          <Card style={{ backgroundColor: c.errBg, gap: 4 }}>
            <Text style={{ color: c.err, fontFamily: fonts.medium }}>{t('Auto-pay was switched off')}</Text>
            <Text color="ink2">{t('We could not take payment {n} times in a row', { n: s.failureCount })}{s.lastFailureReason ? ` (${s.lastFailureReason})` : ''}. {t('Update your card and switch it on again.')}</Text>
          </Card>
        ) : null}

        {card ? (
          <Card style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="title">{t('Pay my invoices automatically')}</Text>
                <Text variant="meta">{t('Charged to this card on the due date')}</Text>
              </View>
              <Switch value={!!s?.enabled} disabled={toggle.isPending}
                onValueChange={(on) => (on ? confirm(() => toggle.mutate({ on: true })) : toggle.mutate({ on: false }))} trackColor={{ true: c.br }} />
            </View>
            {s?.enabled && s.consentAt ? <Text variant="meta">{t('You agreed on {date}.', { date: new Date(s.consentAt).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' }) })}</Text> : null}
          </Card>
        ) : null}

        {card ? (
          <>
            <Button title={t('Change card')} variant="soft" icon={CreditCard} loading={busy} onPress={() => openCardForm(!!s?.enabled)} />
            <Button title={t('Remove card')} variant="ghost" icon={Trash2} loading={removeCard.isPending} onPress={confirmRemove} />
          </>
        ) : (
          <Button title={t('Add a card and turn on auto-pay')} variant="accent" icon={CreditCard} loading={busy} disabled={!s?.available}
            onPress={() => confirm(() => openCardForm(true))} />
        )}
        {!card ? <Button title={t('Add a card without auto-pay')} variant="ghost" loading={busy} disabled={!s?.available} onPress={() => openCardForm(false)} /> : null}

        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <ShieldCheck color={c.ink3} size={18} strokeWidth={1.6} />
          <Text variant="meta" style={{ flex: 1 }}>{t('Card details go straight to Stripe and are never stored by PurpleBox. If a payment fails we email you and try again the next day; after three failures auto-pay switches itself off.')}</Text>
        </View>
      </Page>
    </Screen>
  );
}

export default function Autopay() {
  const { t } = useI18n();
  return (
    <BiometricGate title={t('Auto-pay')} reason={t('Unlock to manage your saved card.')}>
      <AutopayScreen />
    </BiometricGate>
  );
}
