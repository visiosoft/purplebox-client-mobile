/** On the web the browser handles direction: set it on the page and no restart is needed. */
export function applyDirection(lang: 'en' | 'ar'): boolean {
  if (typeof document !== 'undefined') {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }
  return false;
}
export async function restartApp(): Promise<boolean> { return true; }
