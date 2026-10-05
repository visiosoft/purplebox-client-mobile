import { Tabs } from 'expo-router';
import { TabBar } from '@/components';
import { useTheme } from '@/theme/useTheme';

/** Four tabs: Home, My units, Billing, Help. Account opens from the avatar on Home. */
export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.surface } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="units" options={{ title: 'My units' }} />
      <Tabs.Screen name="billing" options={{ title: 'Billing' }} />
      <Tabs.Screen name="help" options={{ title: 'Help' }} />
    </Tabs>
  );
}
