import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleProp, Text as RNText, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius } from '@/theme/tokens';

export function Text({ style, variant = 'body', color, ...p }: React.ComponentProps<typeof RNText> & {
  variant?: 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'meta' | 'overline';
  color?: 'ink' | 'ink2' | 'ink3' | 'br';
}) {
  const { c } = useTheme();
  const base: Record<string, TextStyle> = {
    display: { fontFamily: fonts.displayHeavy, fontSize: 52, letterSpacing: -1.5 },
    h1: { fontFamily: fonts.display, fontSize: 32, letterSpacing: -0.9 },
    h2: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.6 },
    h3: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.3 },
    body: { fontFamily: fonts.medium, fontSize: 15 },
    meta: { fontFamily: fonts.medium, fontSize: 13 },
    overline: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  };
  return <RNText {...p} style={[base[variant], { color: c[color ?? (variant === 'meta' ? 'ink3' : 'ink')] }, style]} />;
}

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return <View style={[{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingHorizontal: 20 }, style]}>{children}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c, isDark } = useTheme();
  return (
    <View style={[{
      backgroundColor: c.sf, borderRadius: radius.card, padding: 16,
      ...(isDark ? {} : { shadowColor: '#14081F', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 }),
    }, style]}>{children}</View>
  );
}

export function Button({ title, onPress, loading, disabled, variant = 'primary', style }: {
  title: string; onPress: () => void; loading?: boolean; disabled?: boolean;
  variant?: 'primary' | 'soft' | 'ghost'; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const bg = variant === 'primary' ? c.br : variant === 'soft' ? c.bsoft : 'transparent';
  const fg = variant === 'primary' ? '#fff' : c.br;
  const off = disabled || loading;
  return (
    <Pressable
      disabled={off}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onPress(); }}
      style={({ pressed }) => [{
        height: 52, borderRadius: radius.chip, backgroundColor: bg, alignItems: 'center', justifyContent: 'center',
        opacity: off ? 0.45 : pressed ? 0.85 : 1,
      }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <RNText style={{ color: fg, fontFamily: fonts.bold, fontSize: 16 }}>{title}</RNText>}
    </Pressable>
  );
}

export function Input({ label, style, ...p }: TextInputProps & { label?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text variant="meta" color="ink2" style={{ fontFamily: fonts.semibold }}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={c.ink3}
        {...p}
        style={[{
          height: 52, borderRadius: radius.input, borderWidth: 1, borderColor: c.ln2, backgroundColor: c.sf,
          paddingHorizontal: 16, fontFamily: fonts.medium, fontSize: 16, color: c.ink,
        }, style]}
      />
    </View>
  );
}
