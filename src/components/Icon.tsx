import { I18nManager } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

export type IconType = LucideIcon;

/**
 * Lucide line icon at the design system's 1.8 stroke, round caps and joins.
 * Sizes: 22 default, 20 in 40px tiles and buttons, 26 in quick actions, 52 in empty states.
 * `flip` mirrors directional icons (chevrons, back, log out) in RTL.
 */
export function Icon({ as: C, size = 22, color, flip }: { as: IconType; size?: number; color: string; flip?: boolean }) {
  return (
    <C
      size={size}
      color={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={flip && I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
    />
  );
}
