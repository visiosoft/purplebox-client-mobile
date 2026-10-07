import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { CreditCard, Home, Package, Truck, User } from 'lucide-react-native';

const ICONS = { index: Home, storage: Package, services: Truck, payments: CreditCard, account: User } as const;

/**
 * Floating "liquid glass" pill: dark charcoal, semi-transparent, blurred over
 * the content, white icons; the current tab sits in a sunflower-yellow circle. It overlays the screens, so scrolling pages leave
 * room for it at the bottom (see Page in components/bits.tsx).
 */
function GlassTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const [w, setW] = useState(0);
  const itemW = w > 0 ? (w - 16) / state.routes.length : 0;
  const x = useSharedValue(0);
  useEffect(() => { x.set(withSpring(8 + state.index * itemW + (itemW - 48) / 2, { damping: 17, stiffness: 220, mass: 0.8 })); }, [x, state.index, itemW]);
  const dot = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 12) + 4, alignItems: 'center' }}>
      <View style={styles.pill} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <BlurView intensity={40} tint="dark" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(43,43,43,0.82)' }]} />
        {/* a hairline of light along the top edge sells the glass */}
        <View pointerEvents="none" style={styles.sheen} />
        {itemW > 0 ? <Animated.View pointerEvents="none" style={[styles.iconActive, { position: 'absolute', left: 0, top: 8, width: 48, height: 48, borderRadius: 24 }, dot]} /> : null}
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const { options } = descriptors[route.key];
          const Icon = ICONS[route.name as keyof typeof ICONS] ?? Home;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              Haptics.selectionAsync().catch(() => {});
              navigation.navigate(route.name, route.params);
            }
          };
          return (
            <Pressable key={route.key} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }}
              accessibilityLabel={typeof options.title === 'string' ? options.title : route.name}
              style={({ pressed }) => [styles.item, { opacity: pressed ? 0.6 : 1 }]}>
              <View style={styles.iconWrap}>
                <Icon color={focused ? '#262626' : '#FFFFFF'} size={21} strokeWidth={focused ? 1.9 : 1.6} style={{ opacity: focused ? 1 : 0.66 }} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', height: 64, borderRadius: 32, overflow: 'hidden', paddingHorizontal: 8,
    width: '86%', maxWidth: 380,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
      default: { elevation: 12 },
    }),
  },
  sheen: { position: 'absolute', top: 0, left: 24, right: 24, height: 1, backgroundColor: 'rgba(255,255,255,0.22)' },
  item: { flex: 1, height: 64, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: '#F8D45C' },
});

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <GlassTabBar {...props} />} screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="storage" options={{ title: 'Storage' }} />
      <Tabs.Screen name="services" options={{ title: 'Services' }} />
      <Tabs.Screen name="payments" options={{ title: 'Payments' }} />
      <Tabs.Screen name="account" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
