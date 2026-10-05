import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { Text } from './Text';
import { useTheme } from '@/theme/useTheme';
import { fonts, space } from '@/theme/tokens';
import { easeOut } from '@/theme/motion';

const useToastStore = create<{ message: string | null; n: number }>(() => ({ message: null, n: 0 }));

/** Short confirmation or failure line ("Couldn't download — try again"). */
export const toast = (message: string) => useToastStore.setState((s) => ({ message, n: s.n + 1 }));

/** Rendered once at the root. Decorative layer: never takes taps. */
export function ToastHost() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { message, n } = useToastStore();
  const v = useSharedValue(0);

  useEffect(() => {
    if (!n) return;
    v.set(withTiming(1, { duration: reduced ? 120 : 260, easing: easeOut }));
    const t = setTimeout(() => v.set(withTiming(0, { duration: reduced ? 120 : 260, easing: easeOut })), 2600);
    return () => clearTimeout(t);
  }, [n, reduced, v]);

  const style = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: reduced ? 0 : (1 - v.value) * 10 }] }));
  if (!message) return null;
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[{
        pointerEvents: 'none', position: 'absolute', start: space[5], end: space[5], bottom: insets.bottom + 96,
        backgroundColor: c.ink, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18,
      }, style]}
    >
      <Text style={{ color: c.surface, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 }}>{message}</Text>
    </Animated.View>
  );
}
