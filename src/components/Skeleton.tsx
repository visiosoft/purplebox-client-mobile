import { useEffect, useState } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/theme/useTheme';
import { radius, space } from '@/theme/tokens';

/**
 * Shimmering placeholder shaped like the content it stands in for. The shimmer is a
 * sunken → line → sunken band sweeping across (1.4s); it stops with reduced motion.
 */
export function Skel({ w = '100%', h, r = radius.sm, style }: { w?: DimensionValue; h: number; r?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduced || !width) return;
    t.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }), -1, false));
    return () => cancelAnimation(t);
  }, [reduced, width, t]);

  const band = useAnimatedStyle(() => ({ transform: [{ translateX: -width + t.value * width * 2 }] }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: w, height: h, borderRadius: r, backgroundColor: c.surfaceSunken, overflow: 'hidden' }, style]}
    >
      {!reduced && width ? (
        <Animated.View style={[{ pointerEvents: 'none', position: 'absolute', top: 0, bottom: 0, width }, band]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="pbShimmer" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={c.surfaceSunken} />
                <Stop offset="0.5" stopColor={c.line} />
                <Stop offset="1" stopColor={c.surfaceSunken} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#pbShimmer)" />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

function SkelCard() {
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: c.surfaceCard, borderRadius: radius.card, borderWidth: 1, borderColor: c.line, padding: space[5], gap: 10 }}>
      <Skel w="40%" h={18} />
      <Skel w="70%" h={14} />
      <Skel w="55%" h={14} />
    </View>
  );
}

/** Greeting, Needs-you block, unit card and quick-action tiles — same geometry as Home. */
export function HomeSkeleton() {
  return (
    <View style={{ gap: space[5] }}>
      <View style={{ gap: 8, marginTop: space[2] }}>
        <Skel w="30%" h={14} />
        <Skel w="60%" h={30} />
      </View>
      <Skel h={150} r={radius.card} />
      <View style={{ flexDirection: 'row', gap: space[3] }}>
        {[0, 1, 2, 3].map((i) => <View key={i} style={{ flex: 1, alignItems: 'center' }}><Skel w={60} h={60} r={20} /></View>)}
      </View>
      <SkelCard />
    </View>
  );
}

export function ListSkeleton({ cards = 4, title = true }: { cards?: number; title?: boolean }) {
  return (
    <View style={{ gap: space[3] }}>
      {title ? <Skel w="50%" h={28} style={{ marginVertical: space[2] }} /> : null}
      {Array.from({ length: cards }, (_, i) => <SkelCard key={i} />)}
    </View>
  );
}

export function GridSkeleton() {
  return (
    <View style={{ gap: space[3] }}>
      {[0, 1].map((row) => (
        <View key={row} style={{ flexDirection: 'row', gap: space[3] }}>
          <Skel w={undefined} h={200} r={radius.card} style={{ flex: 1 }} />
          <Skel w={undefined} h={200} r={radius.card} style={{ flex: 1 }} />
        </View>
      ))}
    </View>
  );
}

export function DetailSkeleton() {
  return (
    <View style={{ gap: space[3] }}>
      <Skel w="45%" h={36} style={{ marginTop: space[3] }} />
      <Skel w="70%" h={16} />
      <Skel h={180} r={radius.card} style={{ marginVertical: space[3] }} />
      <SkelCard />
      <SkelCard />
    </View>
  );
}
