import { type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { duration } from '@/theme/tokens';
import { easeSpring } from '@/theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const tapHaptic = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Press scale: 0.97 for buttons, 0.985 for cards, 0.92 for icon buttons. */
  scaleTo?: number;
  haptic?: boolean;
  /** Called on press-in/out so a parent can drop the button shadow while pressed. */
  onPressedChange?: (pressed: boolean) => void;
};

/**
 * Pressable with the design system's press: scale with ease-spring over dur-press.
 * With reduced motion the spring becomes a short fade.
 */
export function Press({ scaleTo = 0.97, haptic, style, children, onPressIn, onPressOut, onPress, onPressedChange, ...rest }: Props) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  // Multiply rather than replace, so a disabled button keeps its 0.45 opacity.
  const base = (StyleSheet.flatten(style)?.opacity as number | undefined) ?? 1;
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: base * opacity.value }));

  const down = (e: GestureResponderEvent) => {
    if (reduced) opacity.set(withTiming(0.7, { duration: duration.reduced }));
    else scale.set(withTiming(scaleTo, { duration: duration.press, easing: easeSpring }));
    onPressedChange?.(true);
    onPressIn?.(e);
  };
  const up = (e: GestureResponderEvent) => {
    if (reduced) opacity.set(withTiming(1, { duration: duration.reduced }));
    else scale.set(withTiming(1, { duration: duration.press, easing: easeSpring }));
    onPressedChange?.(false);
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={down}
      onPressOut={up}
      onPress={onPress ? (e) => { if (haptic) tapHaptic(); onPress(e); } : undefined}
      style={[style, anim]}
    >
      {children}
    </AnimatedPressable>
  );
}
