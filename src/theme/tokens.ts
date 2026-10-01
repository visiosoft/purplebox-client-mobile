export type Palette = {
  bg: string; sf: string; sf2: string; sf3: string;
  ink: string; ink2: string; ink3: string;
  br: string; brt: string; bsoft: string; bsoft2: string;
  ok: string; okBg: string; warn: string; warnBg: string; err: string; errBg: string;
  ln: string; ln2: string; page: string;
};

export const light: Palette = {
  bg: '#FBF8F2', sf: '#FFFFFF', sf2: '#F6F0E4', sf3: '#EDE3CF',
  ink: '#14081F', ink2: '#4A4357', ink3: '#716A7C',
  br: '#5B2BC9', brt: '#4A1FA0', bsoft: '#EDE5FF', bsoft2: '#F7F3FF',
  ok: '#15803D', okBg: '#DCF5E3', warn: '#9A5406', warnBg: '#FDF0D5', err: '#B42318', errBg: '#FDE4E1',
  ln: 'rgba(20,8,31,0.09)', ln2: 'rgba(20,8,31,0.18)', page: '#EDE7DC',
};

export const dark: Palette = {
  bg: '#130A22', sf: '#1D1231', sf2: '#271A3E', sf3: '#33244F',
  ink: '#F5F1FB', ink2: '#D2C9E0', ink3: '#A89EB9',
  br: '#7C4DFF', brt: '#C9B6FF', bsoft: '#2A1B4D', bsoft2: '#221640',
  ok: '#62E394', okBg: 'rgba(98,227,148,0.14)', warn: '#F6BD57', warnBg: 'rgba(246,189,87,0.14)',
  err: '#FF8F80', errBg: 'rgba(255,143,128,0.14)',
  ln: 'rgba(255,255,255,0.09)', ln2: 'rgba(255,255,255,0.18)', page: '#0B0614',
};

export const radius = { chip: 999, input: 14, card: 20, hero: 24, tile: 12, sheet: 28 } as const;
export const space = { gutter: 20 } as const;

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayHeavy: 'BricolageGrotesque_800ExtraBold',
  body: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;
