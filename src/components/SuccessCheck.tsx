import { useEffect } from 'react';
import { Platform } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme/useTheme';
import { duration } from '@/theme/tokens';
import { easeOut, easeSpring } from '@/theme/motion';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const LENGTH = 40;

/** Success: the tile pops in (ease-spring) and the check's stroke draws over dur-check. */
export function SuccessCheck({ size = 96 }: { size?: number }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  // In a browser the stroke is drawn statically: animated SVG props are native-only, and a
  // check stuck at its starting dash offset would be invisible.
  const drawn = reduced || Platform.OS === 'web';
  const pop = useSharedValue(reduced ? 1 : 0);
  const draw = useSharedValue(drawn ? 0 : LENGTH);

  useEffect(() => {
    if (reduced) return;
    pop.set(withTiming(1, { duration: 500, easing: easeSpring }));
    if (!drawn) draw.set(withDelay(200, withTiming(0, { duration: duration.check, easing: easeOut })));
  }, [reduced, drawn, pop, draw]);

  const tile = useAnimatedStyle(() => ({ opacity: pop.value, transform: [{ scale: 0.4 + 0.6 * pop.value }] }));
  const stroke = useAnimatedProps(() => ({ strokeDashoffset: draw.value }));
  const icon = Math.round(size * 0.54);

  return (
    <Animated.View
      accessibilityRole="image"
      accessibilityLabel="Done"
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.successTint, alignItems: 'center', justifyContent: 'center' }, tile]}
    >
      <Svg width={icon} height={icon} viewBox="0 0 24 24" fill="none">
        <AnimatedPath
          d="M5 12.5l4.5 4.5L19 7"
          stroke={c.success}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={drawn ? undefined : LENGTH}
          animatedProps={drawn ? undefined : stroke}
        />
      </Svg>
    </Animated.View>
  );
}
