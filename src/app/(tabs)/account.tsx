import { useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Bell, ScanFace, CreditCard, Gift, Languages, FileText, FolderOpen, IdCard, UserCheck, Users, MessageCircle, MoreHorizontal, Package, Pencil, Receipt } from 'lucide-react-native';
import { Backdrop, Button, IconButton, MenuButton, Text } from '@/components/ui';
import { MetricPills, Row, RowIcon, Segmented, StatusChip } from '@/components/bits';
import { openDocument, storageApi } from '@/api/storage';
import { notificationsApi } from '@/api/notifications';
import { useBilling } from '@/hooks/useBilling';
import { useProfile } from '@/hooks/useProfile';
import { useBiometricInfo } from '@/hooks/useBiometricInfo';
import { confirmIdentity } from '@/lib/biometrics';
import { useAuth } from '@/store/auth';
import { usePrefs } from '@/store/prefs';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius, space } from '@/theme/tokens';
import { dateLocale, useI18n } from '@/i18n';
import { useDir } from '@/i18n/useDir';
import { aed, shortDate } from '@/lib/format';
import { WHATSAPP } from '@/lib/contact';


type TabKey = 'paid' | 'invoices' | 'saved';

const KIND_LABEL = { agreement: 'Agreement', invoice: 'Invoice', receipt: 'Receipt' } as const;

const initials = (name?: string) =>
  (name && !/^[+\d\s()-]+$/.test(name) ? name : 'PB').split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

export default function ProfileTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { t, language } = useI18n();
  const { ChevronForward } = useDir();
  const { customer, logout } = useAuth();
  const { theme, setTheme, reminders, setReminders, biometrics, setBiometrics } = usePrefs();
  const [tab, setTab] = useState<TabKey>('paid');
  const [now] = useState(Date.now);

  const contracts = useQuery({ queryKey: ['contracts'], queryFn: storageApi.contracts });
  const documents = useQuery({ queryKey: ['documents'], queryFn: storageApi.documents });
  const billing = useBilling();
  const profile = useProfile();
  const bio = useBiometricInfo();
  const paidTotal = billing.totalPaid;
  const paidInvoices = billing.paid;
  const openInvoices = [...billing.overdue, ...billing.upcoming];
  const qc = useQueryClient();
  const prefs = useQuery({ queryKey: ['notification-prefs'], queryFn: notificationsApi.prefs });
  const setPromotions = useMutation({
    mutationFn: notificationsApi.setPrefs,
    onSuccess: (p) => qc.setQueryData(['notification-prefs'], p),
    onError: (e: Error) => Alert.alert(t('Could not save'), e.message),
  });
  const promotions = setPromotions.isPending ? !!setPromotions.variables : prefs.data?.promotions ?? true;

  const units = (contracts.data ?? []).filter((k) => k.status !== 'ended');
  const docs = useMemo(() => {
    const d = documents.data;
    return d ? [...d.agreements, ...d.invoices, ...d.receipts] : [];
  }, [documents.data]);
  const since = (contracts.data ?? []).map((k) => new Date(k.startDate).getTime()).sort((a, b) => a - b)[0];
  const months = since ? Math.max(1, Math.round((now - since) / (28 * 86_400_000))) : 0;
  const realName = customer?.fullName && !/^[+\d\s()-]+$/.test(customer.fullName) ? customer.fullName : t('PurpleBox member');

  const settings = () => Alert.alert(t('Settings'), t('Theme: {theme}', { theme: t(theme) }), [
    { text: t('Light'), onPress: () => setTheme('light') },
    { text: t('Dark'), onPress: () => setTheme('dark') },
    { text: t('Match system'), onPress: () => setTheme('system') },
    { text: t('Sign out'), style: 'destructive', onPress: logout },
    { text: t('Close'), style: 'cancel' },
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: space.gutter, paddingBottom: 130, gap: 14 }} showsVerticalScrollIndicator={false}>
        {/* hero: warm tan card, like a portrait fading into the page */}
        <View style={{ borderRadius: radius.hero, overflow: 'hidden', padding: 16, paddingBottom: 22 }}>
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="pb-hero" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#E9D8C4" />
                <Stop offset="0.55" stopColor="#CDAE93" />
                <Stop offset="1" stopColor="#B98F73" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#pb-hero)" />
          </Svg>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <MenuButton tone="glass" />
              <IconButton icon={Pencil} label={t('Edit profile')} tone="glass" onPress={() => router.push('/profile-edit')} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <IconButton icon={MessageCircle} label={t('Message us on WhatsApp')} tone="glass" onPress={() => Linking.openURL(WHATSAPP)} />
              <IconButton icon={MoreHorizontal} label={t('Settings')} tone="glass" onPress={settings} />
            </View>
          </View>

          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <View style={{ width: 128, height: 128, borderRadius: 64, backgroundColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.light, fontSize: 52, color: '#FFFFFF', letterSpacing: -1 }}>{initials(customer?.fullName)}</Text>
            </View>
            <Text variant="h1" style={{ color: '#FFFFFF', marginTop: 18, textAlign: 'center' }}>{realName}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{customer?.phone ?? ''}</Text>
          </View>

          {units.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 16 }}>
              {units.flatMap((u) => u.units).map((x) => (
                <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.32)', borderRadius: radius.chip, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Package color="#FFFFFF" size={13} strokeWidth={1.8} />
                  <Text style={{ color: '#FFFFFF', fontFamily: fonts.regular, fontSize: 13 }}>{x.unitNumber}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={{ color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 14, lineHeight: 21 }}>
            {units.length
              ? t('Storing with PurpleBox since {date} · Al Quoz, Dubai', { date: new Date(since!).toLocaleDateString(dateLocale(), { month: 'short', year: 'numeric' }) })
              : t('New to PurpleBox. Ready to free up some space at home?')}
          </Text>

          <View style={{ marginTop: 18 }}>
            <MetricPills dark items={[
              { label: t('Units'), value: String(units.length), tone: 'accent' },
              { label: t('Documents'), value: String(docs.length), tone: 'dark' },
              { label: months === 1 ? t('Month') : t('Months'), value: String(months), tone: 'light' },
            ]} />
          </View>
        </View>

        <Button title={units.length ? t('Book another unit') : t('Book a unit')} onPress={() => router.push('/book')} />

        <Segmented value={tab} onChange={setTab}
          options={[{ value: 'paid', label: t('Payments') }, { value: 'invoices', label: t('Invoices') }, { value: 'saved', label: t('Documents') }]} />

        {tab === 'paid' ? (
          <>
            <View style={{ backgroundColor: c.dk, borderRadius: radius.hero, padding: 20, gap: 4 }}>
              <Text variant="meta" color="onDk2">{t('Total paid')}</Text>
              <Text variant="h1" color="onDk">{aed(paidTotal)}</Text>
              <Text variant="meta" color="onDk3">
                {billing.payments.length === 1 ? t('1 payment') : t('{n} payments', { n: billing.payments.length })} · {paidInvoices.length === 1 ? t('1 invoice settled') : t('{n} invoices settled', { n: paidInvoices.length })}
              </Text>
            </View>
            <View style={{ backgroundColor: c.sf, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 6 }}>
              {billing.loading ? <Text color="ink2" style={{ paddingVertical: 14, textAlign: 'center' }}>{t('Loading…')}</Text> : null}
              {!billing.loading && billing.payments.length === 0 ? <Text color="ink2" style={{ paddingVertical: 14, textAlign: 'center' }}>{t('No payments yet.')}</Text> : null}
              {billing.payments.map((p) => (
                <Row key={p.id} leading={<RowIcon icon={Receipt} />} title={aed(p.amount)}
                  sub={`${shortDate(p.date)}${p.invoiceNumbers ? ` · ${p.invoiceNumbers}` : ''}${p.method ? ` · ${p.method}` : ''}`}
                  onPress={p.href ? () => openDocument({ href: p.href!, title: t('Receipt') }).catch((e) => Alert.alert(t('Receipt'), e.message)) : undefined}
                  right={<StatusChip label={t('Paid')} tone="ok" />} />
              ))}
            </View>
          </>
        ) : tab === 'invoices' ? (
          <>
            {([['Paid', paidInvoices], ['Open', openInvoices]] as const).map(([label, list]) => list.length ? (
              <View key={label} style={{ backgroundColor: c.sf, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 6 }}>
                <Text variant="overline" color="ink3" style={{ marginTop: 10 }}>{label === 'Paid' ? t('PAID · {n}', { n: list.length }) : t('OPEN · {n}', { n: list.length })}</Text>
                {list.map((i) => (
                  <Row key={i.id} leading={<RowIcon icon={FileText} />} title={i.number}
                    sub={i.state === 'paid' ? t('{amount} · issued {date}', { amount: aed(i.total), date: shortDate(i.date) }) : t('{amount} · due {date}', { amount: aed(i.total), date: shortDate(i.dueDate) })}
                    onPress={() => openDocument({ href: i.pdfHref, title: i.number }).catch((e) => Alert.alert(t('Invoice'), e.message))}
                    right={<StatusChip label={i.state === 'paid' ? t('Paid') : i.state === 'overdue' ? t('Overdue') : t('Upcoming')} tone={i.state === 'paid' ? 'ok' : i.state === 'overdue' ? 'err' : 'warn'} />} />
                ))}
              </View>
            ) : null)}
            {!billing.loading && paidInvoices.length + openInvoices.length === 0 ? <Text color="ink2" style={{ textAlign: 'center' }}>{t('No invoices yet.')}</Text> : null}
            {openInvoices.length ? <Button title={t('Go to Payments to pay')} variant="soft" onPress={() => router.navigate('/(tabs)/payments')} /> : null}
          </>
        ) : (
          <View style={{ backgroundColor: c.sf, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 6 }}>
            {docs.length === 0 ? <Text color="ink2" style={{ paddingVertical: 14, textAlign: 'center' }}>{t('No documents yet.')}</Text> : null}
            {docs.map((d) => (
              <Row key={`${d.kind}-${d.id}`} leading={<RowIcon icon={d.kind === 'receipt' ? Receipt : FileText} />} title={d.title}
                sub={`${t(KIND_LABEL[d.kind])} · ${shortDate(d.date)}`}
                onPress={() => openDocument(d).catch((e) => Alert.alert(t('Document'), e.message))}
                right={d.amount !== undefined ? <Text variant="meta" color="ink">{aed(d.amount)}</Text> : undefined} />
            ))}
          </View>
        )}

        <View style={{ backgroundColor: c.sf, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 6 }}>
          <Row leading={<RowIcon icon={UserCheck} />} title={t('Complete your profile')} sub={profile.percent !== null ? t('{percent}% done', { percent: profile.percent }) : t('Email, WhatsApp, ID and more')} onPress={() => router.push('/profile-complete')} right={<ChevronForward color={c.ink3} size={18} strokeWidth={1.6} />} />
          <Row leading={<RowIcon icon={FolderOpen} />} title={t('My files')} sub={t('ID and documents on file')} onPress={() => router.push('/my-files')} right={<ChevronForward color={c.ink3} size={18} strokeWidth={1.6} />} />
          {units.length ? <Row leading={<RowIcon icon={Users} />} title={t('Who can enter my unit')} sub={t('Add family, staff or a driver')} onPress={() => router.push('/access')} right={<ChevronForward color={c.ink3} size={18} strokeWidth={1.6} />} /> : null}
          <Row leading={<RowIcon icon={CreditCard} />} title={t('Auto-pay and saved card')} sub={t('Pay invoices automatically')} onPress={() => router.push('/autopay')} right={<ChevronForward color={c.ink3} size={18} strokeWidth={1.6} />} />
          <Row leading={<RowIcon icon={IdCard} />} title={t('ID verification')} sub={t('Emirates ID or passport')} onPress={() => router.push('/id-upload')} right={<ChevronForward color={c.ink3} size={18} strokeWidth={1.6} />} />
          {bio.available ? (
            <Row leading={<RowIcon icon={ScanFace} />} title={t('Unlock with {label}', { label: bio.label })} sub={t('Asked when you open the app, and before your ID and card')}
              right={<Switch value={biometrics} onValueChange={async (on) => {
                // Changing it either way needs a successful check, so a borrowed phone cannot switch the lock off (or on for another face).
                if (await confirmIdentity(t(on ? 'Turn on {label} for PurpleBox' : 'Turn off {label} for PurpleBox', { label: bio.label }))) setBiometrics(on);
              }} trackColor={{ true: c.br }} />} />
          ) : null}
          <Row leading={<RowIcon icon={Languages} />} title={t('Language')} sub={language === 'ar' ? 'العربية' : 'English'} onPress={() => router.push('/language')} right={<ChevronForward color={c.ink3} size={18} strokeWidth={1.6} />} />
          <Row leading={<RowIcon icon={Bell} />} title={t('Booking reminders')} sub={t('Up to 3 nudges if a booking isn’t finished')}
            right={<Switch value={reminders} onValueChange={setReminders} trackColor={{ true: c.br }} />} />
          <Row leading={<RowIcon icon={Gift} />} title={t('Offers & promotions')} sub={t('Payment, renewal and inspection updates always come through')}
            right={<Switch value={promotions} disabled={!prefs.data} onValueChange={(v) => setPromotions.mutate(v)} trackColor={{ true: c.br }} />} />
          <Row leading={<RowIcon icon={MessageCircle} />} title={t('Chat with us')} sub={t('WhatsApp, 7 days a week')} onPress={() => Linking.openURL(WHATSAPP)} right={<ChevronForward color={c.ink3} size={18} strokeWidth={1.6} />} />
        </View>
      </ScrollView>
    </View>
  );
}
