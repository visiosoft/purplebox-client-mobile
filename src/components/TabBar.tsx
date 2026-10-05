import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box, CircleHelp, House, Receipt } from 'lucide-react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Text } from './Text';
import { Icon, type IconType } from './Icon';
import { tapHaptic } from './Press';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius } from '@/theme/tokens';

export const TABS: Record<string, { label: string; icon: IconType }> = {
  index: { label: 'Home', icon: House },
  units: { label: 'My units', icon: Box },
  billing: { label: 'Billing', icon: Receipt },
  help: { label: 'Help', icon: CircleHelp },
};

/**
 * Four tabs on a white bar. The active tab gets a brand-500 label and a brand-100 pill
 * behind its icon; labels always show. Bottom padding follows the safe area.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row', backgroundColor: c.surfaceCard, borderTopWidth: 1, borderTopColor: c.line,
        paddingTop: 8, paddingHorizontal: 8, paddingBottom: Math.max(insets.bottom, 8) + 4,
      }}
    >
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const active = state.index === index;
        const color = active ? c.brand500 : c.inkSubtle;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!active && !event.defaultPrevented) { tapHaptic(); navigation.navigate(route.name, route.params); }
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 6, minHeight: 52 }}
          >
            <View style={{ width: 56, height: 30, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? c.brand100 : 'transparent' }}>
              <Icon as={tab.icon} color={color} />
            </View>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
