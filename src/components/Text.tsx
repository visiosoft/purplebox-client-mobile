import { Text as RNText, type TextProps } from 'react-native';
import { textStyles, type Palette, type TextVariant } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type TextTone = 'ink' | 'muted' | 'subtle' | 'brand' | 'onBrand' | 'success' | 'warning' | 'danger';

const toneKey: Record<TextTone, keyof Palette> = {
  ink: 'ink', muted: 'inkMuted', subtle: 'inkSubtle', brand: 'brand500', onBrand: 'onBrand',
  success: 'success', warning: 'warning', danger: 'danger',
};

/** Manrope text in one of the token styles: display, amount, title1–3, bodyLg, body, label, caption, overline. */
export function Text({ variant = 'body', tone = 'ink', style, ...p }: TextProps & { variant?: TextVariant; tone?: TextTone }) {
  const { c } = useTheme();
  return <RNText {...p} style={[textStyles[variant], { color: c[toneKey[tone]] as string }, style]} />;
}
