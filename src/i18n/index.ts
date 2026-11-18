import { I18nManager } from 'react-native';
import { usePrefs } from '@/store/prefs';
import { ar } from './ar';

export type Lang = 'en' | 'ar';

/**
 * English text IS the key. `t('Pay now')` returns the English as-is, or its Arabic from `./ar` when the app is in
 * Arabic. `{name}` placeholders are filled from `vars`. A missing Arabic entry falls back to English (and warns in dev).
 */
const warned = new Set<string>();

export const currentLang = (): Lang => usePrefs.getState().language ?? 'en';

export function tr(text: string, vars?: Record<string, string | number>): string {
  let out = text;
  if (currentLang() === 'ar') {
    const hit = ar[text];
    if (hit !== undefined) out = hit;
    else if (__DEV__ && !warned.has(text)) { warned.add(text); console.warn(`[i18n] no Arabic for: ${text}`); }
  }
  return vars ? out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : out;
}

/** Subscribes the component to the language, so it re-renders when it changes. */
export function useI18n() {
  const language = usePrefs((s) => s.language) ?? 'en';
  return { t: tr, language, isRTL: language === 'ar' };
}

/** `en-GB` / `ar-AE` with Western digits (0-9), which is how prices and dates are read in the UAE. */
export const numberLocale = () => (currentLang() === 'ar' ? 'ar-AE-u-nu-latn' : 'en-AE');
export const dateLocale = () => (currentLang() === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB');

/** True when the native layout direction already matches the language (it needs a restart to change). */
export const directionMatches = (lang: Lang) => I18nManager.isRTL === (lang === 'ar');
