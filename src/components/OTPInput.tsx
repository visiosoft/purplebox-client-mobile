import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Text } from './Text';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius, space } from '@/theme/tokens';

/**
 * Six boxes built as ONE hidden input, so iOS one-time-code / Android SMS autofill and
 * paste both work. Always left-to-right. Bump `shakeKey` after a wrong code to shake once.
 */
export function OTPInput({ value, onChange, length = 6, error, disabled, autoFocus = true, shakeKey = 0 }: {
  value: string; onChange: (v: string) => void; length?: number; error?: boolean; disabled?: boolean; autoFocus?: boolean; shakeKey?: number;
}) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const x = useSharedValue(0);
  const shake = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  useEffect(() => {
    if (!shakeKey || reduced) return;
    x.set(withSequence(
      withTiming(-4, { duration: 60 }), withTiming(4, { duration: 90 }),
      withTiming(-4, { duration: 90 }), withTiming(0, { duration: 60 }),
    ));
  }, [shakeKey, reduced, x]);

  const digits = value.split('');
  return (
    <Pressable onPress={() => input.current?.focus()} accessible={false} style={{ direction: 'ltr' }}>
      <Animated.View style={[{ flexDirection: 'row', gap: space[2] }, shake]}>
        {Array.from({ length }, (_, i) => {
          const filled = !!digits[i];
          const active = focused && !disabled && i === Math.min(value.length, length - 1) && !filled;
          const border = error ? c.danger : filled || active ? c.brand500 : c.lineStrong;
          return (
            <View
              key={i}
              style={[
                {
                  flex: 1, height: 60, borderRadius: radius.md, borderWidth: 1.5, borderColor: border,
                  backgroundColor: c.surfaceCard, alignItems: 'center', justifyContent: 'center',
                },
                active && !error ? { boxShadow: `0px 0px 0px 3px ${c.brand200}` } : null,
              ]}
            >
              <Text style={{ fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32 }}>{digits[i] ?? ''}</Text>
            </View>
          );
        })}
      </Animated.View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={!disabled}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        maxLength={length}
        caretHidden
        contextMenuHidden={false}
        accessibilityLabel={`${length}-digit code`}
        style={[
          { position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, opacity: 0, color: 'transparent', fontSize: 1 },
          Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
        ]}
      />
    </Pressable>
  );
}
