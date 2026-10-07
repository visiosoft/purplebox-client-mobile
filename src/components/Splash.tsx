import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { fonts } from '@/theme/tokens';

const BRAND = '#5B2BC9'; // matches the native splash in app.json, so the hand-off is seamless
const SHOW_MS = 1500;

/** Branded intro that sits over the first screen for a moment, then fades away. */
export function Splash() {
  const [visible, setVisible] = useState(true);
  const fade = useSharedValue(1);
  const pop = useSharedValue(0);

  useEffect(() => {
    pop.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    fade.value = withDelay(SHOW_MS, withTiming(0, { duration: 450 }, (done) => { if (done) runOnJS(setVisible)(false); }));
  }, [fade, pop]);

  const wrap = useAnimatedStyle(() => ({ opacity: fade.value }));
  const logo = useAnimatedStyle(() => ({ opacity: pop.value, transform: [{ scale: 0.8 + 0.2 * pop.value }] }));

  if (!visible) return null;
  return (
    <Animated.View pointerEvents="auto" style={[StyleSheet.absoluteFill, styles.wrap, wrap]}>
      <Animated.View style={[styles.center, logo]}>
        <Image source={require('../../assets/images/splash-icon.png')} style={{ width: 96, height: 96 }} contentFit="contain" />
        <Animated.Text style={styles.word}>PurpleBox</Animated.Text>
        <Animated.Text style={styles.tag}>Self-storage, made simple</Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  center: { alignItems: 'center', gap: 10 },
  word: { fontFamily: fonts.light, fontSize: 38, color: '#FFFFFF', letterSpacing: -1 },
  tag: { fontFamily: fonts.light, fontSize: 15, color: 'rgba(255,255,255,0.75)' },
});
