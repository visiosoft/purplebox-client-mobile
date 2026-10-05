import { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { CircleAlert, FileText, Receipt, type LucideIcon } from 'lucide-react-native';
import { Text } from './Text';
import { Press } from './Press';
import { Button } from './Button';
import { Icon } from './Icon';
import { useTheme } from '@/theme/useTheme';
import { radius, space } from '@/theme/tokens';

type CardVariant = 'default' | 'lav' | 'flat';

/**
 * White surface, 22px radius, hairline and a whisper of shadow — one card per thing.
 * `lav` is the brand-100 tint for help entry points; `flat` is hairline only.
 * Pass `onPress` for a whole-card link (adds the press spring).
 */
export function Card({ children, variant = 'default', onPress, style, accessibilityLabel }: {
  children: ReactNode; variant?: CardVariant; onPress?: () => void; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const base: ViewStyle = {
    borderRadius: radius.card,
    padding: space[5],
    backgroundColor: variant === 'lav' ? c.brand100 : c.surfaceCard,
    ...(variant === 'lav' ? {} : { borderWidth: 1, borderColor: c.line }),
    ...(variant === 'default' && c.shadowCard ? { boxShadow: c.shadowCard } : {}),
  };
  if (onPress) {
    return (
      <Press onPress={onPress} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={[base, style]}>
        {children}
      </Press>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export type NeedsTone = 'default' | 'due' | 'overdue';

/**
 * The single card at the top of Home that says the one thing to do, with one button.
 * Tones: default (brand-100: sign, finish booking), due (amber), overdue (red; danger button).
 */
export function NeedsYouCard({ tone = 'default', icon, overline, title, body, action, onAction, loading }: {
  tone?: NeedsTone; icon?: LucideIcon; overline: string; title: string; body: string;
  action: string; onAction: () => void; loading?: boolean;
}) {
  const { c } = useTheme();
  const bg = tone === 'due' ? c.warningTint : tone === 'overdue' ? c.dangerTint : c.brand100;
  const accent = tone === 'due' ? c.warning : tone === 'overdue' ? c.danger : c.brand500;
  const I = icon ?? (tone === 'overdue' ? CircleAlert : tone === 'due' ? Receipt : FileText);
  return (
    <View accessibilityLabel="Needs you" style={{ borderRadius: radius.card, padding: space[5], gap: space[4], backgroundColor: bg }}>
      <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'flex-start' }}>
        <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: c.surfaceCard, alignItems: 'center', justifyContent: 'center' }}>
          <Icon as={I} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="overline" style={{ color: accent }}>{overline}</Text>
          <Text variant="title3" style={{ marginTop: 2 }}>{title}</Text>
          <Text tone="muted" style={{ fontSize: 15, lineHeight: 22, marginTop: 2 }}>{body}</Text>
        </View>
      </View>
      <Button title={action} onPress={onAction} block loading={loading} variant={tone === 'overdue' ? 'danger' : 'primary'} />
    </View>
  );
}
