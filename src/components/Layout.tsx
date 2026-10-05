import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Lock } from 'lucide-react-native';
import { Text } from './Text';
import { IconButton, TextLink } from './Button';
import { Icon } from './Icon';
import { useTheme } from '@/theme/useTheme';
import { fonts, gutter, space } from '@/theme/tokens';

/**
 * Screen shell: cream background, top safe area. `keyboard` keeps the sticky footer above
 * the keyboard. `bg` overrides the background (welcome screen).
 */
export function Screen({ children, keyboard, bg, style }: { children: ReactNode; keyboard?: boolean; bg?: string; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const body = <View style={[{ flex: 1, paddingTop: insets.top }, style]}>{children}</View>;
  return (
    <View style={{ flex: 1, backgroundColor: bg ?? c.surface }}>
      {keyboard && Platform.OS !== 'web' ? (
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>{body}</KeyboardAvoidingView>
      ) : body}
    </View>
  );
}

/** 52px top bar: back, centred title, optional end slot. */
export function TopBar({ title, onBack, right, noBack }: { title?: string; onBack?: () => void; right?: ReactNode; noBack?: boolean }) {
  const router = useRouter();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 52, paddingHorizontal: space[3] }}>
      {noBack ? <View style={{ width: 44 }} /> : <IconButton icon={ChevronLeft} label="Back" onPress={back} flip />}
      <Text numberOfLines={1} accessibilityRole="header" style={{ flex: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 }}>
        {title ?? ''}
      </Text>
      {right ?? <View style={{ width: 44 }} />}
    </View>
  );
}

/** Scrolling body with the 20px gutter and optional pull-to-refresh. */
export function ScrollBody({ children, refreshing, onRefresh, scrollEnabled = true, contentStyle }: {
  children: ReactNode; refreshing?: boolean; onRefresh?: () => void; scrollEnabled?: boolean; contentStyle?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1 }}
      scrollEnabled={scrollEnabled}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[{ paddingHorizontal: gutter, paddingTop: 4, paddingBottom: space[6] }, contentStyle]}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.brand500} colors={[c.brand500]} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

/**
 * The one primary action, pinned to the bottom (and above the keyboard inside a
 * `keyboard` Screen). `hint` is the small line under it ("Secure payment · …").
 */
export function StickyFooter({ children, hint, lockHint }: { children: ReactNode; hint?: string; lockHint?: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      paddingHorizontal: gutter, paddingTop: space[3], paddingBottom: Math.max(insets.bottom, space[3]) + space[3],
      gap: space[2], backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line,
    }}>
      {children}
      {hint ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          {lockHint ? <Icon as={Lock} size={14} color={c.inkMuted} /> : null}
          <Text style={{ fontSize: 13, lineHeight: 18, color: c.inkMuted, textAlign: 'center' }}>{hint}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Screen title (title-1) with an optional lead line under it. */
export function Heading({ title, lead, style }: { title: string; lead?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginTop: space[2], marginBottom: space[5], gap: 4 }, style]}>
      <Text variant="title1" accessibilityRole="header">{title}</Text>
      {lead ? (typeof lead === 'string' ? <Text variant="bodyLg" tone="muted">{lead}</Text> : lead) : null}
    </View>
  );
}

/** Section head between blocks (space-6 above), with an optional end link. */
export function SectionHead({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: space[6], marginBottom: space[3] }}>
      <Text variant="title3" accessibilityRole="header">{title}</Text>
      {action ? <TextLink title={action.label} onPress={action.onPress} /> : null}
    </View>
  );
}

/** Vertical stack with the 12px gap between cards. */
export function Stack({ children, gap = space[3], style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}
