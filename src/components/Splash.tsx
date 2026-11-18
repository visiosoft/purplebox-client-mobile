import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Ellipse, Path, Polygon } from 'react-native-svg';
import Animated, {
  Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { fonts } from '@/theme/tokens';
import { usePrefs } from '@/store/prefs';

const BRAND = '#5B2BC9'; // same as the native splash in app.json, so the hand-off is seamless
const SKY = 'rgba(255,255,255,0.15)';
const HOLD_MS = 3200; // when the fade-out starts (first launch)
const REPEAT = 0.4; // later launches, and reduced motion, play the same intro at 40% of the length

/** Dubai silhouette: Burj Al Arab, Burj Khalifa, the Dubai Frame and a row of towers. Baseline at y=160. */
function Skyline({ width }: { width: number }) {
  return (
    <Svg width={width} height={(width * 160) / 360} viewBox="0 0 360 160">
      <Path fill={SKY} d="M0 160V118h18v-14h16v22h14v-30h20v40h12V160z" />
      {/* Dubai Frame: two legs and a bar across the top */}
      <Path fill={SKY} fillRule="evenodd" d="M100 160V96h32v64zM108 160v-56h16v56z" />
      {/* Burj Khalifa: stepped, tapering to a spire */}
      <Path fill={SKY} d="M174 160V96h5V74h5V54h4V26h3L192 0l2 26h3v28h4v20h5v22h5v64z" />
      <Path fill={SKY} d="M214 160v-46h16v-22h14v34h10v34z" />
      {/* Burj Al Arab: the sail */}
      <Path fill={SKY} d="M268 160C270 112 290 76 306 52v-14l1 14c-2 30 2 72 2 108z" />
      <Path fill={SKY} d="M312 160v-38h16v-18h14v30h18v26z" />
    </Svg>
  );
}

/** Lilac cube in two pieces (body and lid) so the lid can pop open once it lands. */
function Cube() {
  return (
    <View style={{ width: 120, height: 120 }}>
      <Svg width={120} height={120} viewBox="0 0 120 120" style={StyleSheet.absoluteFill}>
        <Polygon points="10,35 60,60 60,115 10,90" fill="#C9B2FA" />
        <Polygon points="110,35 60,60 60,115 110,90" fill="#9F7FEF" />
        <Polygon points="20,52 48,66 48,86 20,72" fill="#F8D45C" />
      </Svg>
    </View>
  );
}
function Lid({ lift }: { lift: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={120} height={120} viewBox="0 0 120 120">
        <Polygon points="60,10 110,35 60,60 10,35" fill="#F3ECFF" />
      </Svg>
    </Animated.View>
  );
}

/** Branded intro over the first screen: the skyline rises, a box drops in and opens, the name appears, then it fades away. */
export function Splash() {
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [k] = useState(() => (usePrefs.getState().introSeen || reduced ? REPEAT : 1)); // time scale
  const [visible, setVisible] = useState(true);
  const fade = useSharedValue(1);
  const sky = useSharedValue(0);
  const drop = useSharedValue(-420);
  const shadow = useSharedValue(0);
  const lift = useSharedValue(0);
  const name = useSharedValue(0);
  const tag = useSharedValue(0);
  const line = useSharedValue(0);

  const hide = () => setVisible(false);
  useEffect(() => {
    usePrefs.getState().markIntroSeen();
    sky.set(withTiming(1, { duration: 900 * k, easing: Easing.out(Easing.cubic) }));
    drop.set(withDelay(500 * k, withTiming(0, { duration: 900 * k, easing: Easing.out(Easing.bounce) })));
    shadow.set(withDelay(500 * k, withTiming(1, { duration: 900 * k, easing: Easing.in(Easing.quad) })));
    lift.set(withDelay(1550 * k, withSequence(withTiming(-16, { duration: 220 * k, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 380 * k, easing: Easing.out(Easing.bounce) }))));
    name.set(withDelay(1700 * k, withTiming(1, { duration: 600 * k, easing: Easing.out(Easing.cubic) })));
    tag.set(withDelay(2000 * k, withTiming(1, { duration: 600 * k, easing: Easing.out(Easing.cubic) })));
    line.set(withDelay(2200 * k, withTiming(1, { duration: 600 * k, easing: Easing.out(Easing.cubic) })));
    fade.set(withDelay(HOLD_MS * k, withTiming(0, { duration: 450 * Math.max(k, 0.6) }, (done) => { if (done) runOnJS(hide)(); })));
  }, [fade, sky, drop, shadow, lift, name, tag, line, k]);

  // Tap anywhere to skip.
  const skip = () => fade.set(withTiming(0, { duration: 250 }, (done) => { if (done) runOnJS(hide)(); }));

  const wrap = useAnimatedStyle(() => ({ opacity: fade.value }));
  const skyStyle = useAnimatedStyle(() => ({ opacity: sky.value, transform: [{ translateY: (1 - sky.value) * 60 }] }));
  const boxStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drop.value }] }));
  const shadowStyle = useAnimatedStyle(() => ({ opacity: 0.28 * shadow.value, transform: [{ scaleX: 0.4 + 0.6 * shadow.value }] }));
  const nameStyle = useAnimatedStyle(() => ({ opacity: name.value, transform: [{ translateY: (1 - name.value) * 14 }] }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tag.value, transform: [{ translateY: (1 - tag.value) * 10 }] }));
  const lineStyle = useAnimatedStyle(() => ({ opacity: line.value, transform: [{ scaleX: line.value }] }));

  if (!visible) return null;
  return (
    <Animated.View pointerEvents="auto" style={[StyleSheet.absoluteFill, styles.wrap, wrap]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={skip} accessibilityLabel="Skip intro" accessibilityRole="button" />
      <Animated.View style={[styles.sky, skyStyle]}>
        <Skyline width={width} />
      </Animated.View>

      <View style={styles.center} pointerEvents="none">
        <View style={{ width: 120, height: 130 }}>
          <Animated.View style={[styles.shadow, shadowStyle]}>
            <Svg width={90} height={14}><Ellipse cx={45} cy={7} rx={45} ry={7} fill="#1B0B4D" /></Svg>
          </Animated.View>
          <Animated.View style={[{ width: 120, height: 120 }, boxStyle]}>
            <Cube />
            <Lid lift={lift} />
          </Animated.View>
        </View>
        <Animated.Text style={[styles.word, nameStyle]}>PurpleBox</Animated.Text>
        <Animated.Text style={[styles.tag, tagStyle]}>STORAGE IN DUBAI</Animated.Text>
        <Animated.View style={[styles.line, lineStyle]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: BRAND, zIndex: 100 },
  sky: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 60 },
  shadow: { position: 'absolute', bottom: 0, alignSelf: 'center' },
  word: { fontFamily: fonts.light, fontSize: 42, color: '#FFFFFF', letterSpacing: -1.2, marginTop: 10 },
  tag: { fontFamily: fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.8)', letterSpacing: 4 },
  line: { width: 56, height: 3, borderRadius: 2, backgroundColor: '#F8D45C', marginTop: 10 },
});
