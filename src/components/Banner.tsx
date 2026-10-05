import { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Check, CircleAlert, Info, TriangleAlert } from 'lucide-react-native';
import { Text } from './Text';
import { Icon, type IconType } from './Icon';
import { TextLink } from './Button';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius, space } from '@/theme/tokens';

export type BannerTone = 'info' | 'ok' | 'warn' | 'error';

/**
 * Inline message inside a screen. Icon first, then one or two sentences with the key
 * fact in bold (pass a nested <Text> with bold font). Errors say whether money moved.
 */
export function Banner({ tone = 'info', icon, children, action, style }: {
  tone?: BannerTone; icon?: IconType; children: ReactNode; action?: { label: string; onPress: () => void }; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const bg = { info: c.brand100, ok: c.successTint, warn: c.warningTint, error: c.dangerTint }[tone];
  const fg = { info: c.brand500, ok: c.success, warn: c.warning, error: c.danger }[tone];
  const I = icon ?? { info: Info, ok: Check, warn: TriangleAlert, error: CircleAlert }[tone];
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      style={[{ flexDirection: 'row', gap: space[3], alignItems: 'flex-start', borderRadius: radius.md, padding: space[4], backgroundColor: bg }, style]}
    >
      <Icon as={I} color={fg} />
      <View style={{ flex: 1, gap: space[2] }}>
        {typeof children === 'string' ? <Text style={{ fontSize: 15, lineHeight: 22 }}>{children}</Text> : children}
        {action ? <TextLink title={action.label} onPress={action.onPress} /> : null}
      </View>
    </View>
  );
}

/** Banner body text helper: plain text with an optional bold lead ("You're all set." Nothing needs you). */
export function BannerText({ bold, children }: { bold?: string; children?: ReactNode }) {
  return (
    <Text style={{ fontSize: 15, lineHeight: 22 }}>
      {bold ? <Text style={{ fontSize: 15, lineHeight: 22, fontFamily: fonts.bold }}>{bold} </Text> : null}
      {children}
    </Text>
  );
}
