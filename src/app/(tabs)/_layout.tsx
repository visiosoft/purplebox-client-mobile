import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { CreditCard, Home, Package, Truck, User } from 'lucide-react-native';

const ICONS = { index: Home, storage: Package, services: Truck, payments: CreditCard, account: User } as const;

/**
 * Floating "liquid glass" pill: dark charcoal, semi-transparent, blurred over
 * the content, white icons. It overlays the screens, so scrolling pages leave
 * room for it at the bottom (see Page in components/bits.tsx).
 */
function GlassTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 12) + 4, alignItems: 'center' }}>
      <View style={styles.pill}>
        <BlurView intensity={40} tint="dark" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(22,22,24,0.72)' }]} />
        {/* a hairline of light along the top edge sells the glass */}
        <View pointerEvents="none" style={styles.sheen} />
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
              <View style={[styles.iconWrap, focused && styles.iconActive]}>
                <Icon color="#FFFFFF" size={22} strokeWidth={focused ? 2.4 : 1.9} style={{ opacity: focused ? 1 : 0.62 }} />
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
  iconWrap: { width: 46, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: 'rgba(255,255,255,0.16)' },
});

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <GlassTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="storage" options={{ title: 'Storage' }} />
      <Tabs.Screen name="services" options={{ title: 'Services' }} />
      <Tabs.Screen name="payments" options={{ title: 'Payments' }} />
      <Tabs.Screen name="account" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
