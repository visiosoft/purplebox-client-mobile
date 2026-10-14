import { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeInLeft, FadeInRight, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Calculator, CreditCard, FileText, FolderOpen, IdCard, Link2, LogOut, MessageCircle, PlusCircle, Undo2, UserCheck, Users, type LucideIcon,
} from 'lucide-react-native';
import { Avatar, Text } from '@/components/ui';
import { Segmented } from '@/components/bits';
import { useAuth } from '@/store/auth';
import { useDrawer } from '@/store/drawer';
import { usePrefs } from '@/store/prefs';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius } from '@/theme/tokens';
import { WHATSAPP } from '@/lib/contact';
import { useI18n } from '@/i18n';

const unmount = () => useDrawer.setState({ mounted: false });
const SPRING = { damping: 24, stiffness: 240, mass: 0.9 };

type Item = { icon: LucideIcon; label: string; path?: string; action?: () => void };

/** Side menu (left in English, right in Arabic): slides in over the app, drag it back to close, or swipe in from the left edge of a tab screen. */
export function Drawer() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c } = useTheme();
  const { t, isRTL } = useI18n();
  const FadeIn = isRTL ? FadeInRight : FadeInLeft;
  const { customer, logout } = useAuth();
  const { theme, setTheme } = usePrefs();
  const open = useDrawer((s) => s.open);
  const setOpen = useDrawer((s) => s.setOpen);
  const mounted = useDrawer((s) => s.mounted);
  const panelW = Math.min(320, Math.round(width * 0.82));
  const p = useSharedValue(0); // 0 closed, 1 open

  useEffect(() => {
    if (open) p.set(withSpring(1, SPRING));
    else p.set(withSpring(0, SPRING, (done) => { if (done) runOnJS(unmount)(); }));
  }, [open, p]);

  const close = () => setOpen(false);
  const dir = isRTL ? -1 : 1; // +1: panel sits on the left, -1: on the right
  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate((e) => { p.set(Math.min(1, Math.max(0, 1 + (dir * e.translationX) / panelW))); })
    .onEnd((e) => {
      if (dir * e.velocityX < -400 || p.get() < 0.6) runOnJS(close)();
      else p.set(withSpring(1, SPRING));
    });

  const scrim = useAnimatedStyle(() => ({ opacity: p.value * 0.45 }));
  const panel = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(p.value, [0, 1], [-dir * panelW, 0]) }] }));

  if (!mounted && !open) return null;

  const go = (item: Item) => () => {
    Haptics.selectionAsync().catch(() => {});
    close();
    if (item.action) return item.action();
    if (item.path) setTimeout(() => router.navigate(item.path as never), 120);
  };
  const sections: { title: string; items: Item[] }[] = [
    { title: t('Do more'), items: [
      { icon: PlusCircle, label: t('Book a unit'), path: '/book' }, { icon: Calculator, label: t('Space estimator'), path: '/estimator' },
      { icon: FileText, label: t('Request check-out'), path: '/checkout' }, { icon: Undo2, label: t('Request refund'), path: '/refund' },
      { icon: UserCheck, label: t('Complete your profile'), path: '/profile-complete' }, { icon: FolderOpen, label: t('My files'), path: '/my-files' },
      { icon: Users, label: t('Who can enter my unit'), path: '/access' }, { icon: CreditCard, label: t('Auto-pay and saved card'), path: '/autopay' },
      { icon: IdCard, label: t('ID verification'), path: '/id-upload' }, { icon: Link2, label: t('I already rent with us'), path: '/link-unit' },
    ] },
  ];
  const realName = customer?.fullName && !/^[+\d\s()-]+$/.test(customer.fullName) ? customer.fullName : t('PurpleBox member');
  let n = 0;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, scrim]}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel={t('Close menu')} />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[{
          position: 'absolute', top: 0, bottom: 0, start: 0, width: panelW, backgroundColor: c.bg,
          borderTopEndRadius: radius.hero, borderBottomEndRadius: radius.hero, borderCurve: 'continuous',
          paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16), paddingHorizontal: 16,
          shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 30, shadowOffset: { width: 8 * dir, height: 0 }, elevation: 24,
        }, panel]}>
          <Animated.View entering={FadeIn.delay(60).springify()} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18, paddingHorizontal: 4 }}>
            <Avatar name={customer?.fullName} size={52} />
            <View style={{ flex: 1 }}>
              <Text variant="title" numberOfLines={1}>{realName}</Text>
              <Text variant="meta" numberOfLines={1}>{customer?.phone}</Text>
            </View>
          </Animated.View>

          <Animated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 4, paddingBottom: 12 }}>
            {sections.map((s) => (
              <View key={s.title} style={{ gap: 2 }}>
                <Text variant="overline" color="ink3" style={{ marginTop: 10, marginBottom: 4, marginStart: 8 }}>{isRTL ? s.title : s.title.toUpperCase()}</Text>
                {s.items.map((item) => {
                  const active = false;
                  return (
                    <Animated.View key={item.path ?? item.label} entering={FadeIn.delay(100 + 35 * n++).springify().damping(18)}>
                      <Pressable onPress={go(item)} accessibilityRole="button" style={({ pressed }) => ({
                        flexDirection: 'row', alignItems: 'center', gap: 14, height: 48, paddingHorizontal: 12, borderRadius: radius.chip,
                        backgroundColor: active ? c.ac : pressed ? c.sf2 : 'transparent',
                      })}>
                        <item.icon color={active ? c.acInk : c.ink2} size={20} strokeWidth={1.6} />
                        <Text style={{ fontFamily: fonts.regular, fontSize: 16, color: active ? c.acInk : c.ink }}>{item.label}</Text>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            ))}
          </Animated.ScrollView>

          <View style={{ gap: 10, paddingTop: 8 }}>
            <Segmented value={theme} onChange={setTheme} options={[{ value: 'light', label: t('Light') }, { value: 'dark', label: t('Dark') }, { value: 'system', label: t('Auto') }]} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => Linking.openURL(WHATSAPP)} style={[styles.foot, { backgroundColor: c.sf, borderColor: c.ln }]}>
                <MessageCircle color={c.ink} size={18} strokeWidth={1.6} /><Text style={{ fontFamily: fonts.regular, color: c.ink }}>{t('Support')}</Text>
              </Pressable>
              <Pressable onPress={() => { close(); logout(); }} style={[styles.foot, { backgroundColor: c.sf, borderColor: c.ln }]}>
                <LogOut color={c.err} size={18} strokeWidth={1.6} /><Text style={{ fontFamily: fonts.regular, color: c.err }}>{t('Sign out')}</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/** A thin strip along the leading edge (right in Arabic): swipe inwards from it to open the menu. Only mounted on the main tabs. */
export function EdgeSwipe() {
  const setOpen = useDrawer((s) => s.setOpen);
  const { isRTL } = useI18n();
  const dir = isRTL ? -1 : 1;
  const open = () => { Haptics.selectionAsync().catch(() => {}); setOpen(true); };
  const pan = Gesture.Pan().activeOffsetX([-10, 10]).failOffsetY([-14, 14]).onEnd((e) => { if (dir * e.translationX > 40 || dir * e.velocityX > 500) runOnJS(open)(); });
  return (
    <GestureDetector gesture={pan}>
      <View style={{ position: 'absolute', start: 0, top: 0, bottom: 0, width: 14, zIndex: 40 }} />
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  foot: { flex: 1, height: 46, borderRadius: 999, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
