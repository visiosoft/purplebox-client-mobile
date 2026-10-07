import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { FileText, MessageCircle, MoreHorizontal, Package, Pencil, Receipt } from 'lucide-react-native';
import { Backdrop, Button, IconButton, MenuButton, Text } from '@/components/ui';
import { MetricPills, Row, RowIcon, Segmented, StatusChip, invoiceTone } from '@/components/bits';
import { openDocument, storageApi } from '@/api/storage';
import { useAuth } from '@/store/auth';
import { usePrefs } from '@/store/prefs';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius, space } from '@/theme/tokens';
import { aed, shortDate } from '@/lib/format';
import { WHATSAPP } from '@/lib/contact';

// Interior shots for the gallery grid ("ideas for your space").
const PHOTOS = [
  '1586023492125-27b2c045efd7', '1616486338812-3dadae4b4ace', '1618221195710-dd6b41faaea6',
  '1600210492486-724fe5c67fb0', '1600585154340-be6161a56a0c', '1615874959474-d609969a20ed',
  '1617806118233-18e1de247200', '1556228453-efd6c1ff04f6', '1505693416388-ac5ce068fe85',
].map((id) => `https://images.unsplash.com/photo-${id}?w=500&q=70&fit=crop`);

type TabKey = 'grid' | 'saved' | 'tagged';

const initials = (name?: string) =>
  (name && !/^[+\d\s()-]+$/.test(name) ? name : 'PB').split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

export default function ProfileTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { c } = useTheme();
  const { customer, logout } = useAuth();
  const { theme, setTheme } = usePrefs();
  const [tab, setTab] = useState<TabKey>('grid');
  const [now] = useState(Date.now);

  const contracts = useQuery({ queryKey: ['contracts'], queryFn: storageApi.contracts });
  const documents = useQuery({ queryKey: ['documents'], queryFn: storageApi.documents });
  const invoices = useQuery({ queryKey: ['invoices'], queryFn: storageApi.invoices });

  const units = (contracts.data ?? []).filter((k) => k.status !== 'ended');
  const docs = useMemo(() => {
    const d = documents.data;
    return d ? [...d.agreements, ...d.invoices, ...d.receipts] : [];
  }, [documents.data]);
  const since = (contracts.data ?? []).map((k) => new Date(k.startDate).getTime()).sort((a, b) => a - b)[0];
  const months = since ? Math.max(1, Math.round((now - since) / (28 * 86_400_000))) : 0;
  const realName = customer?.fullName && !/^[+\d\s()-]+$/.test(customer.fullName) ? customer.fullName : 'PurpleBox member';

  const gap = 6;
  const tile = Math.floor((width - space.gutter * 2 - gap * 2) / 3);

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
          <Svg style={StyleSheet.absoluteFill}>
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
          options={[{ value: 'grid', label: 'Gallery' }, { value: 'saved', label: 'Documents' }, { value: 'tagged', label: 'Invoices' }]} />

        {tab === 'grid' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
            {units.map((u, i) => (
              <Pressable key={u.id} onPress={() => router.push('/(tabs)/storage')} style={{ width: tile, height: tile }}>
                <Image source={PHOTOS[i % PHOTOS.length]} style={{ flex: 1, borderRadius: radius.tile }} contentFit="cover" transition={200} />
                <View style={{ position: 'absolute', left: 6, bottom: 6, backgroundColor: c.ac, borderRadius: radius.chip, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: c.acInk }}>{u.units[0]?.unitNumber}</Text>
                </View>
              </Pressable>
            ))}
            {PHOTOS.slice(units.length % PHOTOS.length).concat(PHOTOS).slice(0, Math.max(9 - units.length, 3)).map((uri, i) => (
              <Image key={`p${i}`} source={uri} style={{ width: tile, height: tile, borderRadius: radius.tile }} contentFit="cover" transition={200} />
            ))}
          </View>
        ) : tab === 'saved' ? (
          <View style={{ backgroundColor: c.sf, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 6 }}>
            {docs.length === 0 ? <Text color="ink2" style={{ paddingVertical: 14, textAlign: 'center' }}>No documents yet.</Text> : null}
            {docs.map((d) => (
              <Row key={`${d.kind}-${d.id}`} leading={<RowIcon icon={d.kind === 'receipt' ? Receipt : FileText} />} title={d.title}
                sub={`${d.kind[0].toUpperCase()}${d.kind.slice(1)} · ${shortDate(d.date)}`}
                onPress={() => openDocument(d).catch((e) => Alert.alert('Document', e.message))}
                right={d.amount !== undefined ? <Text variant="meta" color="ink">{aed(d.amount)}</Text> : undefined} />
            ))}
          </View>
        ) : (
          <View style={{ backgroundColor: c.dk, borderRadius: radius.hero, paddingHorizontal: 18, paddingVertical: 8 }}>
            {(invoices.data ?? []).length === 0 ? <Text color="onDk2" style={{ paddingVertical: 14, textAlign: 'center' }}>No invoices yet.</Text> : null}
            {(invoices.data ?? []).map((i) => (
              <Row key={i.id} dark leading={<RowIcon icon={FileText} dark />} title={i.invoiceNo} sub={`${aed(i.total)} · due ${shortDate(i.dueDate)}`}
                onPress={() => router.push('/(tabs)/payments')}
                right={<StatusChip label={i.status} tone={invoiceTone(i.status)} />} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
