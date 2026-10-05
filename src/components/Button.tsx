import { useState } from 'react';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { Press } from './Press';
import { Icon, type IconType } from './Icon';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius, space } from '@/theme/tokens';

export type ButtonVariant =
  | 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'whatsapp'
  /** White fill on brand purple (welcome screen only). */
  | 'inverse'
  /** Transparent with a light ring on brand purple (welcome screen only). */
  | 'inverseOutline';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  /** 44px tall instead of 52. */
  sm?: boolean;
  /** Full width. */
  block?: boolean;
  loading?: boolean;
  /** Keep the verb while loading: "Paying…", "Sending code". */
  loadingTitle?: string;
  disabled?: boolean;
  icon?: IconType;
  /** Second line, used on the big WhatsApp button. */
  subtitle?: string;
  /** Override the label colour (e.g. danger-coloured ghost "Log out"). */
  color?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** Pill button with a spring press. One primary per screen; labels say exactly what happens. */
export function Button({
  title, onPress, variant = 'primary', sm, block, loading, loadingTitle, disabled, icon, subtitle, color, style, accessibilityLabel,
}: Props) {
  const { c } = useTheme();
  const [pressed, setPressed] = useState(false);
  const off = disabled || loading;

  const look: Record<ButtonVariant, { bg: string; fg: string; ring?: string }> = {
    primary: { bg: pressed ? c.brand600 : c.brand500, fg: c.onBrand },
    secondary: { bg: c.brand100, fg: c.brand500 },
    outline: { bg: c.surfaceCard, fg: c.ink, ring: c.lineStrong },
    ghost: { bg: 'transparent', fg: c.brand500 },
    danger: { bg: c.danger, fg: '#FFFFFF' },
    whatsapp: { bg: c.whatsapp, fg: '#FFFFFF' },
    inverse: { bg: c.onBrand, fg: c.brand500 },
    inverseOutline: { bg: 'transparent', fg: c.onBrand, ring: 'rgba(255,255,255,0.55)' },
  };
  const { bg, fg, ring } = look[variant];
  const fgColor = color ?? fg;
  const wa = variant === 'whatsapp';
  const minHeight = wa ? (subtitle ? 76 : 60) : sm ? 44 : 52;
  const fontSize = wa ? 17 : sm ? 15 : 16;

  return (
    <Press
      onPress={onPress}
      disabled={off}
      haptic
      onPressedChange={setPressed}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={[
        {
          minHeight,
          paddingHorizontal: sm ? space[4] : space[6],
          borderRadius: radius.pill,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: block ? 'stretch' : 'flex-start',
          opacity: disabled && !loading ? 0.45 : 1,
        },
        ring ? { borderWidth: 1.5, borderColor: ring } : null,
        variant === 'primary' && !pressed && !off && c.shadowButton ? { boxShadow: c.shadowButton } : null,
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        {loading ? <ActivityIndicator size="small" color={fgColor} /> : icon ? <Icon as={icon} size={wa ? 24 : 20} color={fgColor} /> : null}
        <Text style={{ fontFamily: fonts.bold, fontSize, lineHeight: 20, color: fgColor, textAlign: 'center' }}>
          {loading && loadingTitle ? loadingTitle : title}
        </Text>
      </View>
      {subtitle ? (
        <Text style={{ fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: fgColor, opacity: 0.9 }}>{subtitle}</Text>
      ) : null}
    </Press>
  );
}

/** 44×44 round icon button for top bars. Every one needs an accessibility label. */
export function IconButton({ icon, onPress, label, tint, color, flip, disabled }: {
  icon: IconType; onPress: () => void; label: string; tint?: boolean; color?: string; flip?: boolean; disabled?: boolean;
}) {
  const { c } = useTheme();
  const [pressed, setPressed] = useState(false);
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.92}
      onPressedChange={setPressed}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={[
        { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : 1 },
        tint ? { backgroundColor: c.surfaceCard, borderWidth: 1, borderColor: c.line } : null,
        pressed ? { backgroundColor: c.brand100 } : null,
      ]}
    >
      <Icon as={icon} color={color ?? c.ink} flip={flip} />
    </Press>
  );
}

/** Text-only inline link in brand purple ("Change", "Clear", "See all"). */
export function TextLink({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" hitSlop={10} style={{ minHeight: 24, justifyContent: 'center' }}>
      <Text variant="label" tone="brand" style={{ fontFamily: fonts.bold, fontSize: 15 }}>{title}</Text>
    </Press>
  );
}
