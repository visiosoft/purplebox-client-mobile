import { DevSettings, I18nManager } from 'react-native';

/** Makes the next launch use the right layout direction. Returns true when the app must restart to apply it. */
export function applyDirection(lang: 'en' | 'ar'): boolean {
  const rtl = lang === 'ar';
  I18nManager.allowRTL(rtl);
  I18nManager.swapLeftAndRightInRTL(true);
  if (I18nManager.isRTL === rtl) return false;
  I18nManager.forceRTL(rtl);
  return true;
}

/** Reloads the app. Resolves false when the platform can't, so the screen can ask the customer to reopen it. */
export async function restartApp(): Promise<boolean> {
  try {
    const Updates = await import('expo-updates');
    await Updates.reloadAsync();
    return true;
  } catch {}
  try {
    if (__DEV__) { DevSettings.reload(); return true; }
  } catch {}
  return false;
}
