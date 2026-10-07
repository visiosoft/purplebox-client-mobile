import { useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Bell, ChevronRight, FileText, IdCard, Link2, MessageCircle, MoreHorizontal, Package, Pencil, Receipt } from 'lucide-react-native';
import { Backdrop, Button, IconButton, MenuButton, Text } from '@/components/ui';
import { MetricPills, Row, RowIcon, Segmented, StatusChip, invoiceTone } from '@/components/bits';
import { openDocument, storageApi } from '@/api/storage';
import { useAuth } from '@/store/auth';
import { usePrefs } from '@/store/prefs';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius, space } from '@/theme/tokens';
import { aed, shortDate } from '@/lib/format';
import { WHATSAPP } from '@/lib/contact';


type TabKey = 'paid' | 'invoices' | 'saved';

const initials = (name?: string) =>
  (name && !/^[+\d\s()-]+$/.test(name) ? name : 'PB').split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

export default function ProfileTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { customer, logout } = useAuth();
  const { theme, setTheme, reminders, setReminders } = usePrefs();
  const [tab, setTab] = useState<TabKey>('paid');
  const [now] = useState(Date.now);

  const contracts = useQuery({ queryKey: ['contracts'], queryFn: storageApi.contracts });
  const documents = useQuery({ queryKey: ['documents'], queryFn: storageApi.documents });
  const invoices = useQuery({ queryKey: ['invoices'], queryFn: storageApi.invoices });
  const payments = useQuery({ queryKey: ['payments'], queryFn: storageApi.payments });
  const paidTotal = (payments.data ?? []).reduce((sum, p) => sum + p.amount, 0);
  const paidInvoices = (invoices.data ?? []).filter((i) => i.status === 'paid');
  const openInvoices = (invoices.data ?? []).filter((i) => i.status !== 'paid');

  const units = (contracts.data ?? []).filter((k) => k.status !== 'ended');
  const docs = useMemo(() => {
    const d = documents.data;
    return d ? [...d.agreements, ...d.invoices, ...d.receipts] : [];
  }, [documents.data]);
  const since = (contracts.data ?? []).map((k) => new Date(k.startDate).getTime()).sort((a, b) => a - b)[0];
  const months = since ? Math.max(1, Math.round((now - since) / (28 * 86_400_000))) : 0;
  const realName = customer?.fullName && !/^[+\d\s()-]+$/.test(customer.fullName) ? customer.fullName : 'PurpleBox member';

  const settings = () => Alert.alert('Settings', `Theme: ${theme}`, [
    { text: 'Light', onPress: () => setTheme('light') },
    { text: 'Dark', onPress: () => setTheme('dark') },
    { text: 'Match system', onPress: () => setTheme('system') },
    { text: 'Sign out', style: 'destructive', onPress: logout },
    { text: 'Close', style: 'cancel' },
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
              <IconButton icon={Pencil} label="Edit profile" tone="glass" onPress={() => router.push('/profile-edit')} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <IconButton icon={MessageCircle} label="Message us on WhatsApp" tone="glass" onPress={() => Linking.openURL(WHATSAPP)} />
              <IconButton icon={MoreHorizontal} label="Settings" tone="glass" onPress={settings} />
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
              ? `Storing with PurpleBox since ${new Date(since!).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} · Al Quoz, Dubai`
              : 'New to PurpleBox. Ready to free up some space at home?'}
          </Text>

          <View style={{ marginTop: 18 }}>
            <MetricPills dark items={[
              { label: 'Units', value: String(units.length), tone: 'accent' },
              { label: 'Documents', value: String(docs.length), tone: 'dark' },
              { label: months === 1 ? 'Month' : 'Months', value: String(months), tone: 'light' },
            ]} />
          </View>
        </View>

        <Button title={units.length ? 'Book another unit' : 'Book a unit'} onPress={() => router.push('/book')} />

        <Segmented value={tab} onChange={setTab}
          options={[{ value: 'paid', label: 'Payments' }, { value: 'invoices', label: 'Invoices' }, { value: 'saved', label: 'Documents' }]} />

        {tab === 'paid' ? (
          <>
            <View style={{ backgroundColor: c.dk, borderRadius: radius.hero, padding: 20, gap: 4 }}>
              <Text variant="meta" color="onDk2">Total paid</Text>
              <Text variant="h1" color="onDk">{aed(paidTotal)}</Text>
              <Text variant="meta" color="onDk3">{(payments.data ?? []).length} payment{(payments.data ?? []).length === 1 ? '' : 's'} · {paidInvoices.length} invoice{paidInvoices.length === 1 ? '' : 's'} settled</Text>
            </View>
            <View style={{ backgroundColor: c.sf, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 6 }}>
              {payments.isLoading ? <Text color="ink2" style={{ paddingVertical: 14, textAlign: 'center' }}>Loading…</Text> : null}
              {!payments.isLoading && (payments.data ?? []).length === 0 ? <Text color="ink2" style={{ paddingVertical: 14, textAlign: 'center' }}>No payments yet.</Text> : null}
              {(payments.data ?? []).map((p) => (
                <Row key={p.id} leading={<RowIcon icon={Receipt} />} title={aed(p.amount)}
                  sub={`${shortDate(p.paidDate)} · ${p.contractNo}${p.method ? ` · ${p.method}` : ''}`}
                  onPress={() => openDocument({ href: `/customer-portal/storage/payments/${p.id}/receipt`, title: 'Receipt' }).catch((e) => Alert.alert('Receipt', e.message))}
                  right={<StatusChip label="Paid" tone="ok" />} />
              ))}
            </View>
          </>
        ) : tab === 'invoices' ? (
          <>
            {([['Paid', paidInvoices], ['Open', openInvoices]] as const).map(([label, list]) => list.length ? (
              <View key={label} style={{ backgroundColor: c.sf, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 6 }}>
                <Text variant="overline" color="ink3" style={{ marginTop: 10 }}>{label.toUpperCase()} · {list.length}</Text>
                {list.map((i) => (
                  <Row key={i.id} leading={<RowIcon icon={FileText} />} title={i.invoiceNo}
                    sub={`${aed(i.total)} · ${i.status === 'paid' ? `issued ${shortDate(i.invoiceDate)}` : `due ${shortDate(i.dueDate)}`}`}
                    onPress={() => openDocument({ href: `/customer-portal/storage/invoices/${i.id}/pdf`, title: i.invoiceNo }).catch((e) => Alert.alert('Invoice', e.message))}
                    right={<StatusChip label={i.status} tone={invoiceTone(i.status)} />} />
                ))}
              </View>
            ) : null)}
            {!invoices.isLoading && (invoices.data ?? []).length === 0 ? <Text color="ink2" style={{ textAlign: 'center' }}>No invoices yet.</Text> : null}
            {openInvoices.length ? <Button title="Go to Payments to pay" variant="soft" onPress={() => router.navigate('/(tabs)/payments')} /> : null}
          </>
        ) : (
          <View style={{ backgroundColor: c.sf, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 6 }}>
            {docs.length === 0 ? <Text color="ink2" style={{ paddingVertical: 14, textAlign: 'center' }}>No documents yet.</Text> : null}
            {docs.map((d) => (
              <Row key={`${d.kind}-${d.id}`} leading={<RowIcon icon={d.kind === 'receipt' ? Receipt : FileText} />} title={d.title}
                sub={`${d.kind[0].toUpperCase()}${d.kind.slice(1)} · ${shortDate(d.date)}`}
                onPress={() => openDocument(d).catch((e) => Alert.alert('Document', e.message))}
                right={d.amount !== undefined ? <Text variant="meta" color="ink">{aed(d.amount)}</Text> : undefined} />
            ))}
          </View>
        )}

        <View style={{ backgroundColor: c.sf, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 6 }}>
          <Row leading={<RowIcon icon={IdCard} />} title="ID verification" sub="Emirates ID or passport" onPress={() => router.push('/id-upload')} right={<ChevronRight color={c.ink3} size={18} strokeWidth={1.6} />} />
          <Row leading={<RowIcon icon={Link2} />} title="I already rent with PurpleBox" sub="Add an existing unit to this account" onPress={() => router.push('/link-unit')} right={<ChevronRight color={c.ink3} size={18} strokeWidth={1.6} />} />
          <Row leading={<RowIcon icon={Bell} />} title="Booking reminders" sub="Up to 3 nudges if a booking isn’t finished"
            right={<Switch value={reminders} onValueChange={setReminders} trackColor={{ true: c.br }} />} />
          <Row leading={<RowIcon icon={MessageCircle} />} title="Chat with us" sub="WhatsApp, 7 days a week" onPress={() => Linking.openURL(WHATSAPP)} right={<ChevronRight color={c.ink3} size={18} strokeWidth={1.6} />} />
        </View>
      </ScrollView>
    </View>
  );
}
