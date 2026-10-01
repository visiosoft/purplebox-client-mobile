import { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { CreditCard, Home, Package, Truck, User } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { fonts } from '@/theme/tokens';

const tab = (title: string, Icon: typeof Home) => ({
  title,
  tabBarIcon: ({ color, size }: { color: ColorValue; size: number }) => <Icon color={color as string} size={size} strokeWidth={2} />,
});

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: c.br,
      tabBarInactiveTintColor: c.ink3,
      tabBarStyle: { backgroundColor: c.sf, borderTopColor: c.ln },
      tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
    }}>
      <Tabs.Screen name="index" options={tab('Home', Home)} />
      <Tabs.Screen name="storage" options={tab('Storage', Package)} />
      <Tabs.Screen name="services" options={tab('Services', Truck)} />
      <Tabs.Screen name="payments" options={tab('Payments', CreditCard)} />
      <Tabs.Screen name="account" options={tab('Account', User)} />
    </Tabs>
  );
}
