import type { TextStyle } from 'react-native';

/**
 * PurpleBox design tokens, copied value-for-value from the design system's tokens.json.
 * Light ships first; the dark values are kept ready but not switched on.
 */
export type Palette = {
  brand500: string; brand600: string; brand200: string; brand100: string; onBrand: string;
  ink: string; inkMuted: string; inkSubtle: string;
  surface: string; surfaceCard: string; surfaceSunken: string;
  line: string; lineStrong: string; scrim: string;
  success: string; successTint: string; warning: string; warningTint: string; danger: string; dangerTint: string;
  whatsapp: string; focus: string;
  /** CSS box-shadow strings (React Native `boxShadow`); undefined where the theme has none. */
  shadowCard?: string; shadowSheet?: string; shadowButton?: string;
};

export const light: Palette = {
  brand500: '#5B2BC9', brand600: '#4A1FAE', brand200: '#E3D7FF', brand100: '#F1EBFF', onBrand: '#FFFFFF',
  ink: '#1A0B33', inkMuted: '#5E5470', inkSubtle: '#6B6280',
  surface: '#F8F5EE', surfaceCard: '#FFFFFF', surfaceSunken: '#F1EDE3',
  line: '#E7E1D6', lineStrong: '#8E8573', scrim: 'rgba(26, 11, 51, 0.40)',
  success: '#1E7A4C', successTint: '#E3F4EA', warning: '#9A5200', warningTint: '#FDF0DC', danger: '#B42A25', dangerTint: '#FCE6E4',
  whatsapp: '#13804A', focus: '#5B2BC9',
  shadowCard: '0px 1px 2px rgba(26,11,51,0.04), 0px 6px 20px rgba(26,11,51,0.05)',
  shadowSheet: '0px -8px 40px rgba(26,11,51,0.14)',
  shadowButton: '0px 6px 16px rgba(91,43,201,0.22)',
};

export const dark: Palette = {
  brand500: '#A88BFF', brand600: '#BBA3FF', brand200: '#3A2A63', brand100: '#2A1F45', onBrand: '#1A0B33',
  ink: '#F4EFFF', inkMuted: '#B3A8C7', inkSubtle: '#9C91B1',
  surface: '#120A22', surfaceCard: '#1C1330', surfaceSunken: '#170F29',
  line: '#2E2447', lineStrong: '#7A6E91', scrim: 'rgba(0, 0, 0, 0.60)',
  success: '#6FD49A', successTint: '#13291E', warning: '#F2B45A', warningTint: '#2E2210', danger: '#FF8A80', dangerTint: '#33161A',
  whatsapp: '#13804A', focus: '#A88BFF',
  shadowCard: undefined,
  shadowSheet: '0px -8px 40px rgba(0,0,0,0.5)',
  shadowButton: undefined,
};

export const palettes = { light, dark } as const;

/** space-1 … space-10 */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 } as const;
export const tapMin = 44;
export const gutter = space[5];

export const radius = { sm: 10, md: 14, card: 22, sheet: 28, pill: 999 } as const;

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

const em = (size: number, value: number) => Math.round(size * value * 100) / 100;

/** Text styles from tokens.json. Each Manrope weight is its own font file, so no fontWeight is set. */
export const textStyles = {
  display: { fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 40, letterSpacing: em(34, -0.02) },
  amount: { fontFamily: fonts.extrabold, fontSize: 40, lineHeight: 44, letterSpacing: em(40, -0.02) },
  title1: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: em(28, -0.01) },
  title2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
  title3: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  bodyLg: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20 },
  caption: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  overline: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: em(12, 0.06), textTransform: 'uppercase' },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textStyles;

export const duration = { press: 220, sheet: 380, sheetExit: 260, screen: 320, check: 600, reduced: 120 } as const;

/** cubic-bezier control points */
export const easing = {
  spring: [0.34, 1.56, 0.64, 1] as const,
  out: [0.22, 1, 0.36, 1] as const,
};
