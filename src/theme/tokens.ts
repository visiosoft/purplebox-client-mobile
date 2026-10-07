// Soft cream canvas, warm-white cards, charcoal for dark panels and primary
// actions, sunflower yellow as the one accent. Type is Outfit, mostly light.
export type Palette = {
  bg: string; bg2: string; sf: string; sf2: string; sf3: string;
  ink: string; ink2: string; ink3: string;
  /** primary action / dark panel */ br: string; onBr: string;
  /** sunflower accent */ ac: string; acSoft: string; acInk: string;
  dk: string; dk2: string; onDk: string; onDk2: string; onDk3: string;
  ok: string; okBg: string; warn: string; warnBg: string; err: string; errBg: string;
  ln: string; ln2: string;
};

export const light: Palette = {
  bg: '#F6F3E7', bg2: '#F3ECCB', sf: '#FDFCF7', sf2: '#EFEBDA', sf3: '#E4DEC6',
  ink: '#262626', ink2: '#5C5A53', ink3: '#9B988D',
  br: '#2B2B2B', onBr: '#FFFFFF',
  ac: '#F8D45C', acSoft: '#FBEDB9', acInk: '#262626',
  dk: '#2E2E2E', dk2: '#3A3A3A', onDk: '#FFFFFF', onDk2: 'rgba(255,255,255,0.62)', onDk3: 'rgba(255,255,255,0.38)',
  ok: '#73AD3B', okBg: '#E6F1D6', warn: '#F28E2B', warnBg: '#FCE7D1', err: '#D9534A', errBg: '#F9DEDB',
  ln: 'rgba(38,38,38,0.07)', ln2: 'rgba(38,38,38,0.14)',
};

export const dark: Palette = {
  bg: '#1B1B1B', bg2: '#22201A', sf: '#262626', sf2: '#303030', sf3: '#3B3B3B',
  ink: '#F5F3EC', ink2: '#C9C6BC', ink3: '#8D8A81',
  br: '#F8D45C', onBr: '#262626',
  ac: '#F8D45C', acSoft: 'rgba(248,212,92,0.16)', acInk: '#262626',
  dk: '#111111', dk2: '#1F1F1F', onDk: '#FFFFFF', onDk2: 'rgba(255,255,255,0.62)', onDk3: 'rgba(255,255,255,0.38)',
  ok: '#8CC756', okBg: 'rgba(140,199,86,0.15)', warn: '#F5A04B', warnBg: 'rgba(245,160,75,0.15)',
  err: '#F07B71', errBg: 'rgba(240,123,113,0.15)',
  ln: 'rgba(255,255,255,0.08)', ln2: 'rgba(255,255,255,0.16)',
};

export const radius = { chip: 999, input: 22, card: 28, hero: 32, tile: 16, sheet: 32 } as const;
export const space = { gutter: 16 } as const;

export const fonts = {
  light: 'Outfit_300Light',
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
} as const;
