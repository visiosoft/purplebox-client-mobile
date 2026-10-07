import { ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, StyleProp, StyleSheet, Text as RNText, TextInput, TextInputProps, TextStyle, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { ArrowLeft, Menu, type LucideIcon } from 'lucide-react-native';
import { useDrawer } from '@/store/drawer';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius, space } from '@/theme/tokens';

const APressable = Animated.createAnimatedComponent(Pressable);

type Ink = 'ink' | 'ink2' | 'ink3' | 'onDk' | 'onDk2' | 'onDk3';

export function Text({ style, variant = 'body', color, ...p }: React.ComponentProps<typeof RNText> & {
  variant?: 'display' | 'h1' | 'h2' | 'h3' | 'title' | 'body' | 'meta' | 'overline';
  color?: Ink;
}) {
  const { c } = useTheme();
  const base: Record<string, TextStyle> = {
    display: { fontFamily: fonts.light, fontSize: 52, letterSpacing: -1.6, lineHeight: 58 },
    h1: { fontFamily: fonts.light, fontSize: 36, letterSpacing: -0.9, lineHeight: 42 },
    h2: { fontFamily: fonts.light, fontSize: 28, letterSpacing: -0.6, lineHeight: 34 },
    h3: { fontFamily: fonts.regular, fontSize: 20, letterSpacing: -0.3, lineHeight: 26 },
    title: { fontFamily: fonts.regular, fontSize: 17, letterSpacing: -0.1, lineHeight: 22 },
    body: { fontFamily: fonts.light, fontSize: 15, lineHeight: 21 },
    meta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
    overline: { fontFamily: fonts.regular, fontSize: 13, letterSpacing: 0.1 },
  };
  const fallback: Ink = variant === 'meta' || variant === 'overline' ? 'ink3' : 'ink';
  return <RNText {...p} style={[base[variant], { color: c[color ?? fallback] }, style]} />;
}

/** The cream canvas, warming to a pale butter yellow towards the bottom. */
export function Backdrop() {
  const { c } = useTheme();
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="pb-bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.bg} />
          <Stop offset="0.55" stopColor={c.bg} />
          <Stop offset="1" stopColor={c.bg2} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#pb-bg)" />
    </Svg>
  );
}

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Backdrop />
      <View style={[{ flex: 1, paddingTop: insets.top, paddingHorizontal: space.gutter }, style]}>{children}</View>
    </View>
  );
}

export function Card({ children, style, variant = 'light' }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; variant?: 'light' | 'dark' | 'accent';
}) {
  const { c, isDark } = useTheme();
  const bg = variant === 'dark' ? c.dk : variant === 'accent' ? c.ac : c.sf;
  return (
    <View style={[{
      backgroundColor: bg, borderRadius: variant === 'dark' ? radius.hero : radius.card, borderCurve: 'continuous', padding: 20,
      ...(variant === 'light' && !isDark ? {
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
        shadowColor: '#8A7B3C', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 2,
      } : {}),
    }, style]}>{children}</View>
  );
}

export function Button({ title, onPress, loading, disabled, variant = 'primary', icon: Icon, style }: {
  title: string; onPress: () => void; loading?: boolean; disabled?: boolean;
  variant?: 'primary' | 'accent' | 'soft' | 'ghost'; icon?: LucideIcon; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const bg = { primary: c.br, accent: c.ac, soft: c.sf, ghost: 'transparent' }[variant];
  const fg = { primary: c.onBr, accent: c.acInk, soft: c.ink, ghost: c.ink2 }[variant];
  const off = disabled || loading;
  const scale = useSharedValue(1);
  const spring = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <APressable
      disabled={off}
      accessibilityRole="button"
      onPressIn={() => { scale.set(withSpring(0.96, { damping: 18, stiffness: 400 })); }}
      onPressOut={() => { scale.set(withSpring(1, { damping: 12, stiffness: 300 })); }}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onPress(); }}
      style={[{
        height: 54, borderRadius: radius.chip, borderCurve: 'continuous', backgroundColor: bg, alignItems: 'center', justifyContent: 'center',
        flexDirection: 'row', gap: 8, paddingHorizontal: 22,
        borderWidth: variant === 'soft' ? 1 : 0, borderColor: c.ln, opacity: off ? 0.4 : 1,
      }, style, spring]}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {Icon ? <Icon color={fg} size={18} strokeWidth={1.7} /> : null}
          <RNText style={{ color: fg, fontFamily: fonts.regular, fontSize: 16, letterSpacing: -0.1 }}>{title}</RNText>
        </>
      )}
    </APressable>
  );
}

/** The round white action button used for back, filters, call, chat… */
export function IconButton({ icon: Icon, onPress, label, size = 44, tone = 'light', badge }: {
  icon: LucideIcon; onPress?: () => void; label: string; size?: number; tone?: 'light' | 'dark' | 'accent' | 'glass'; badge?: boolean;
}) {
  const { c } = useTheme();
  const bg = { light: c.sf, dark: c.dk2, accent: c.ac, glass: 'rgba(255,255,255,0.55)' }[tone];
  const fg = tone === 'dark' ? c.onDk : tone === 'accent' ? c.acInk : c.ink;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      style={({ pressed }) => ({
        width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center',
        borderWidth: tone === 'light' ? 1 : 0, borderColor: c.ln, opacity: pressed ? 0.7 : 1,
      })}>
      <Icon color={fg} size={Math.round(size * 0.42)} strokeWidth={1.6} />
      {badge ? <View style={{ position: 'absolute', top: size * 0.24, right: size * 0.26, width: 7, height: 7, borderRadius: 4, backgroundColor: c.ac }} /> : null}
    </Pressable>
  );
}

/** Back circle on the left, optional actions on the right, and the page title underneath in light display type. */
export function TopBar({ title, onBack, right, back = true }: { title?: string; onBack?: () => void; right?: ReactNode; back?: boolean }) {
  const router = useRouter();
  return (
    <View style={{ gap: 18, marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginTop: 8 }}>
        {back ? <IconButton icon={ArrowLeft} label="Back" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')))} /> : <View />}
        <View style={{ flexDirection: 'row', gap: 8 }}>{right}</View>
      </View>
      {title ? <Text variant="h1">{title}</Text> : null}
    </View>
  );
}

export function Input({ label, style, icon: Icon, ...p }: TextInputProps & { label?: string; icon?: LucideIcon }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {label ? <Text variant="overline" color="ink2" style={{ marginLeft: 4 }}>{label}</Text> : null}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10, height: 58, borderRadius: radius.input, borderCurve: 'continuous',
        backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln, paddingHorizontal: 18,
      }}>
        {Icon ? <Icon color={c.ink3} size={18} strokeWidth={1.6} /> : null}
        <TextInput
          placeholderTextColor={c.ink3}
          {...p}
          style={[{ flex: 1, height: '100%', fontFamily: fonts.regular, fontSize: 17, color: c.ink }, style]}
        />
      </View>
    </View>
  );
}

const initialsOf = (name?: string) =>
  (name && !/^[+\d\s()-]+$/.test(name) ? name : 'PB').split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

/** Round initials badge standing in for a portrait. */
export function Avatar({ name, size = 46, tone = 'accent' }: { name?: string; size?: number; tone?: 'accent' | 'light' | 'dark' }) {
  const { c } = useTheme();
  const bg = { accent: c.acSoft, light: c.sf2, dark: c.dk2 }[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <RNText style={{ fontFamily: fonts.regular, fontSize: size * 0.36, color: tone === 'dark' ? c.onDk : c.ink }}>{initialsOf(name)}</RNText>
    </View>
  );
}

/** Opens the left-hand menu. */
export function MenuButton({ tone = 'light' }: { tone?: 'light' | 'glass' }) {
  const setOpen = useDrawer((s) => s.setOpen);
  return <IconButton icon={Menu} label="Open menu" tone={tone} onPress={() => setOpen(true)} />;
}

/** Header for the main tabs: menu button on the left, optional actions on the right, large title beneath. */
export function TabHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={{ gap: 14, marginTop: 8, marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <MenuButton />
        <View style={{ flexDirection: 'row', gap: 8 }}>{right}</View>
      </View>
      <Text variant="h1">{title}</Text>
    </View>
  );
}
