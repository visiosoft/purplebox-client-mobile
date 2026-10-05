import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bookmark, LayoutGrid, MessageCircle, Pencil, Settings, Tag } from 'lucide-react-native';
import { Text } from '@/components/ui';
import { Row, StatusChip, invoiceTone } from '@/components/bits';
import { openDocument, storageApi } from '@/api/storage';
import { useAuth } from '@/store/auth';
import { usePrefs } from '@/store/prefs';
import { useTheme } from '@/theme/useTheme';
import { fonts } from '@/theme/tokens';
import { aed, shortDate } from '@/lib/format';

const WHATSAPP = 'https://wa.me/971542249946';
const CHARCOAL = '#1C1C1E';

// Interior shots for the gallery grid ("ideas for your space").
const PHOTOS = [
  '1586023492125-27b2c045efd7', '1616486338812-3dadae4b4ace', '1618221195710-dd6b41faaea6',
  '1600210492486-724fe5c67fb0', '1600585154340-be6161a56a0c', '1615874959474-d609969a20ed',
  '1617806118233-18e1de247200', '1556228453-efd6c1ff04f6', '1505693416388-ac5ce068fe85',
].map((id) => `https://images.unsplash.com/photo-${id}?w=500&q=70&fit=crop`);

type TabKey = 'grid' | 'saved' | 'tagged';

const initials = (name?: string) =>
  (name && !/^[+\d\s()-]+$/.test(name) ? name : 'PB').split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 20 }}>{value}</Text>
      <Text variant="meta">{label}</Text>
    </View>
  );
}

export default function ProfileTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { c } = useTheme();
  const { customer, logout } = useAuth();
  const { theme, setTheme } = usePrefs();
  const [tab, setTab] = useState<TabKey>('grid');

  const contracts = useQuery({ queryKey: ['contracts'], queryFn: storageApi.contracts });
  const documents = useQuery({ queryKey: ['documents'], queryFn: storageApi.documents });
  const invoices = useQuery({ queryKey: ['invoices'], queryFn: storageApi.invoices });

  const units = (contracts.data ?? []).filter((k) => k.status !== 'ended');
  const docs = useMemo(() => {
    const d = documents.data;
    return d ? [...d.agreements, ...d.invoices, ...d.receipts] : [];
  }, [documents.data]);
  const since = (contracts.data ?? []).map((k) => new Date(k.startDate).getTime()).sort((a, b) => a - b)[0];
  const months = since ? Math.max(1, Math.round((Date.now() - since) / (28 * 86_400_000))) : 0;
  const realName = customer?.fullName && !/^[+\d\s()-]+$/.test(customer.fullName) ? customer.fullName : 'PurpleBox member';

  const gap = 3;
  const tile = Math.floor((width - 40 - gap * 2) / 3);

  const settings = () => Alert.alert('Settings', `Theme: ${theme}`, [
    { text: 'Light', onPress: () => setTheme('light') },
    { text: 'Dark', onPress: () => setTheme('dark') },
    { text: 'Match system', onPress: () => setTheme('system') },
    { text: 'Sign out', style: 'destructive', onPress: logout },
    { text: 'Close', style: 'cancel' },
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* top bar: handle + settings */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
          <View style={{ width: 40 }} />
          <Text style={{ fontFamily: fonts.bold, fontSize: 15 }}>{customer?.phone ?? ''}</Text>
          <Pressable onPress={settings} hitSlop={10} accessibilityLabel="Settings" style={{ width: 40, alignItems: 'flex-end' }}>
            <Settings color={c.ink} size={22} strokeWidth={1.9} />
          </Pressable>
        </View>

        {/* avatar with edit badge */}
        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <View>
            <View style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: c.bsoft, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.sf }}>
              <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 38, color: c.br }}>{initials(customer?.fullName)}</Text>
            </View>
            <Pressable onPress={() => router.push('/profile-edit')} accessibilityLabel="Edit profile" hitSlop={8}
              style={{ position: 'absolute', right: 0, bottom: 2, width: 32, height: 32, borderRadius: 16, backgroundColor: CHARCOAL, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.bg }}>
              <Pencil color="#FFFFFF" size={14} strokeWidth={2.4} />
            </Pressable>
          </View>
          <Text style={{ fontFamily: fonts.display, fontSize: 24, marginTop: 14, letterSpacing: -0.4 }}>{realName}</Text>
          <Text color="ink2" style={{ textAlign: 'center', marginTop: 6, lineHeight: 21 }}>
            {units.length
              ? `Storing with PurpleBox since ${new Date(since!).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} 📦✨\n${units.map((u) => u.units.map((x) => x.unitNumber).join(', ')).join(' · ')} · Al Quoz, Dubai`
              : 'New to PurpleBox 👋\nReady to free up some space at home? 🛋️'}
          </Text>
        </View>

        {/* counts */}
        <View style={{ flexDirection: 'row', marginTop: 22 }}>
          <Stat value={units.length} label="Units" />
          <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: c.ln2 }} />
          <Stat value={docs.length} label="Documents" />
          <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: c.ln2 }} />
          <Stat value={months} label={months === 1 ? 'Month' : 'Months'} />
        </View>

        {/* primary action + message */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
          <Pressable onPress={() => router.push('/book')} accessibilityRole="button"
            style={({ pressed }) => ({ flex: 1, height: 46, borderRadius: 23, backgroundColor: CHARCOAL, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
            <Text style={{ color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 15 }}>{units.length ? 'Book another unit' : 'Book a unit'}</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(WHATSAPP)} accessibilityLabel="Message us on WhatsApp"
            style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: c.ln2, backgroundColor: c.sf, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
            <MessageCircle color={c.ink} size={20} strokeWidth={2} />
          </Pressable>
        </View>

        {/* tabs */}
        <View style={{ flexDirection: 'row', marginTop: 26, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.ln2 }}>
          {([['grid', LayoutGrid, 'Gallery'], ['saved', Bookmark, 'Documents'], ['tagged', Tag, 'Invoices']] as const).map(([key, Icon, label]) => {
            const on = tab === key;
            return (
              <Pressable key={key} onPress={() => setTab(key)} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: on }}
                style={{ flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: on ? c.ink : 'transparent', marginBottom: -StyleSheet.hairlineWidth }}>
                <Icon color={on ? c.ink : c.ink3} size={21} strokeWidth={on ? 2.2 : 1.8} />
              </Pressable>
            );
          })}
        </View>

        {tab === 'grid' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, marginTop: gap }}>
            {units.map((u, i) => (
              <Pressable key={u.id} onPress={() => router.push('/(tabs)/storage')} style={{ width: tile, height: tile }}>
                <Image source={PHOTOS[i % PHOTOS.length]} style={{ flex: 1, borderRadius: 4 }} contentFit="cover" transition={200} />
                <View style={{ position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: CHARCOAL }}>{u.units[0]?.unitNumber}</Text>
                </View>
              </Pressable>
            ))}
            {PHOTOS.slice(units.length % PHOTOS.length).concat(PHOTOS).slice(0, Math.max(9 - units.length, 3)).map((uri, i) => (
              <Image key={`p${i}`} source={uri} style={{ width: tile, height: tile, borderRadius: 4 }} contentFit="cover" transition={200} />
            ))}
          </View>
        ) : tab === 'saved' ? (
          <View style={{ marginTop: 6 }}>
            {docs.length === 0 ? <Text color="ink2" style={{ marginTop: 16, textAlign: 'center' }}>No documents yet.</Text> : null}
            {docs.map((d) => (
              <Row key={`${d.kind}-${d.id}`} title={d.title} sub={`${d.kind[0].toUpperCase()}${d.kind.slice(1)} · ${shortDate(d.date)}`}
                onPress={() => openDocument(d).catch((e) => Alert.alert('Document', e.message))}
                right={d.amount !== undefined ? <Text style={{ fontFamily: fonts.semibold }}>{aed(d.amount)}</Text> : undefined} />
            ))}
          </View>
        ) : (
          <View style={{ marginTop: 6 }}>
            {(invoices.data ?? []).length === 0 ? <Text color="ink2" style={{ marginTop: 16, textAlign: 'center' }}>No invoices yet.</Text> : null}
            {(invoices.data ?? []).map((i) => (
              <Row key={i.id} title={i.invoiceNo} sub={`Due ${shortDate(i.dueDate)}`} onPress={() => router.push('/(tabs)/payments')}
                right={<View style={{ alignItems: 'flex-end', gap: 4 }}><Text style={{ fontFamily: fonts.semibold }}>{aed(i.total)}</Text><StatusChip label={i.status} tone={invoiceTone(i.status)} /></View>} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
