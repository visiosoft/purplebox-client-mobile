import { useEffect, type ReactNode } from 'react';
import { I18nManager, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import { useTheme } from '@/theme/useTheme';
import { duration, fonts, radius, space } from '@/theme/tokens';
import { easeSpring } from '@/theme/motion';

/** Pill track with the selected segment raised — for 2–3 mutually exclusive modes. */
export function Segmented<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[];
}) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', padding: 4, gap: 4, borderRadius: radius.pill, backgroundColor: c.surfaceSunken }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[
              { flex: 1, minHeight: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[2] },
              on ? { backgroundColor: c.surfaceCard, boxShadow: '0px 1px 3px rgba(26,11,51,0.12)' } : null,
            ]}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: on ? c.ink : c.inkMuted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 52×32 switch; the knob slides with ease-spring and mirrors in RTL. */
export function Switch({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const x = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    x.set(withTiming(value ? 1 : 0, { duration: reduced ? duration.reduced : 260, easing: easeSpring }));
  }, [value, reduced, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: (I18nManager.isRTL ? -20 : 20) * x.value }] }));
  return (
    <Pressable
      onPress={() => onChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      hitSlop={6}
      style={{ width: 52, height: 32, borderRadius: radius.pill, backgroundColor: value ? c.brand500 : c.lineStrong, justifyContent: 'center', opacity: disabled ? 0.45 : 1 }}
    >
      <Animated.View style={[{
        pointerEvents: 'none', position: 'absolute', start: 3, width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF',
        boxShadow: '0px 1px 3px rgba(0,0,0,0.2)',
      }, knob]} />
    </Pressable>
  );
}

/** 26px tick box with its label; tapping anywhere on the row toggles it. */
export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={{ flexDirection: 'row', gap: space[3], alignItems: 'flex-start', paddingVertical: space[2] }}
    >
      <View style={{
        width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
        backgroundColor: checked ? c.brand500 : c.surfaceCard, borderWidth: checked ? 0 : 2, borderColor: c.lineStrong,
      }}>
        {checked ? <Icon as={Check} size={18} color={c.onBrand} /> : null}
      </View>
      <View style={{ flex: 1 }}>{typeof children === 'string' ? <Text>{children}</Text> : children}</View>
    </Pressable>
  );
}

/** Thin progress track across the booking steps. */
export function Progress({ value }: { value: number }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={{ height: 6, borderRadius: 3, backgroundColor: c.brand200, overflow: 'hidden', marginTop: 4, marginBottom: space[3] }}>
      <View style={{ width: `${Math.round(value * 100)}%`, height: '100%', borderRadius: 3, backgroundColor: c.brand500 }} />
    </View>
  );
}
