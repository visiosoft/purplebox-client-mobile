import { useColorScheme } from 'react-native';
import { usePrefs } from '@/store/prefs';
import { dark, light, type Palette } from './tokens';

export function useTheme(): { c: Palette; isDark: boolean } {
  const system = useColorScheme();
  const mode = usePrefs((s) => s.theme);
  const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';
  return { c: isDark ? dark : light, isDark };
}
