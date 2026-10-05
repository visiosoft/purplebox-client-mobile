import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { useTheme } from '@/theme/useTheme';
import { duration, fonts, radius, space } from '@/theme/tokens';
import { easeOut } from '@/theme/motion';

/**
 * Slides up over a scrim for payment, confirmations and small forms. Enter 380ms ease-out,
 * exit 260ms. Tap the scrim, press back or drag the grabber down to close — unless `locked`
 * (a payment is processing). Reduced motion: a short fade instead of the slide.
 */
export function BottomSheet({ visible, onClose, locked, title, children }: {
  visible: boolean; onClose: () => void; locked?: boolean; title?: string; children: ReactNode;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const p = useSharedValue(0);
  const h = useSharedValue(900);
  const drag = useSharedValue(0);

  // Keep the Modal mounted through the exit animation, then let it go.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      drag.set(0);
      p.set(withTiming(1, { duration: reduced ? duration.reduced : duration.sheet, easing: easeOut }));
      return;
    }
    p.set(withTiming(0, { duration: reduced ? duration.reduced : duration.sheetExit, easing: easeOut }));
    const t = setTimeout(() => setMounted(false), reduced ? duration.reduced : duration.sheetExit);
    return () => clearTimeout(t);
  }, [visible, reduced, p, drag]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: p.value }));
  const sheetStyle = useAnimatedStyle(() => (reduced
    ? { opacity: p.value }
    : { transform: [{ translateY: (1 - p.value) * h.value + drag.value }] }));

  const close = () => { if (!locked) onClose(); };

  const pan = Gesture.Pan()
    .enabled(!locked)
    .runOnJS(true)
    .onUpdate((e) => { drag.set(Math.max(0, e.translationY)); })
    .onEnd((e) => {
      if (e.translationY > 90 || e.velocityY > 800) onClose();
      else drag.set(withTiming(0, { duration: 200, easing: easeOut }));
    });

  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, backgroundColor: c.scrim }, scrimStyle]}>
          <Pressable style={{ flex: 1 }} onPress={close} accessibilityRole="button" accessibilityLabel="Close" disabled={locked} />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={{ flex: 1, justifyContent: 'flex-end', pointerEvents: 'box-none' }}>
          <Animated.View
            accessibilityViewIsModal
            onLayout={(e) => h.set(e.nativeEvent.layout.height)}
            style={[{
              maxHeight: '88%', backgroundColor: c.surfaceCard,
              borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
              boxShadow: c.shadowSheet,
            }, sheetStyle]}
          >
            <GestureDetector gesture={pan}>
              <View style={{ paddingTop: 10, paddingBottom: space[4], alignItems: 'center' }}>
                <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: c.line }} />
              </View>
            </GestureDetector>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: Math.max(insets.bottom, space[4]) + space[4] }}
            >
              {title ? <Text variant="title2" accessibilityRole="header" style={{ fontFamily: fonts.extrabold }}>{title}</Text> : null}
              {children}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
