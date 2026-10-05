import { light, type Palette } from './tokens';

/**
 * The app ships in light mode first (dark tokens exist in ./tokens but are not
 * switched on yet). Every component reads colours through this hook so turning
 * dark on later is a one-line change here.
 */
export function useTheme(): { c: Palette; isDark: boolean } {
  return { c: light, isDark: false };
}
