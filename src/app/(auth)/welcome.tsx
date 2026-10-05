import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from 'lucide-react-native';
import { Button, Icon, Text } from '@/components';
import { useTheme } from '@/theme/useTheme';
import { fonts, space } from '@/theme/tokens';
import { useOnboarding } from '@/store/onboarding';

/** Brand moment plus the two real ways in: new customer, or already renting. */
export default function Welcome() {
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const go = (intent: 'new' | 'existing') => {
    useOnboarding.getState().set({ intent });
    router.push('/(auth)/phone');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.brand500, paddingTop: insets.top, paddingBottom: insets.bottom + space[6], paddingHorizontal: 28 }}>
      <StatusBar style="light" />
      {/* Decorative boxes. They paint above nothing interactive, but never take taps. */}
      <View style={{ pointerEvents: 'none', height: 230, marginTop: space[6], marginHorizontal: -28, overflow: 'hidden' }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <View style={{ pointerEvents: 'none', position: 'absolute', start: 28, top: 20, width: 150, height: 150, borderRadius: 28, backgroundColor: c.brand600 }} />
        <View style={{ pointerEvents: 'none', position: 'absolute', start: 190, top: 0, width: 180, height: 110, borderRadius: 28, backgroundColor: c.brand100, opacity: 0.95 }} />
        <View style={{ pointerEvents: 'none', position: 'absolute', start: 190, top: 122, width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFFFFF', opacity: 0.14 }} />
        <View style={{ pointerEvents: 'none', position: 'absolute', start: 292, top: 122, width: 90, height: 170, borderRadius: 28, backgroundColor: c.brand200, opacity: 0.5 }} />
        <View style={{ pointerEvents: 'none', position: 'absolute', start: 28, top: 182, width: 150, height: 110, borderRadius: 28, backgroundColor: c.brand600, opacity: 0.55 }} />
      </View>
      <View style={{ flex: 1 }} />
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel="PurpleBox"
        style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: c.onBrand, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon as={Box} size={38} color={c.brand500} />
      </View>
      <Text style={{ fontFamily: fonts.extrabold, fontSize: 44, lineHeight: 50, letterSpacing: -1.32, color: c.onBrand, marginTop: 22 }}>PurpleBox</Text>
      <Text style={{ fontFamily: fonts.medium, fontSize: 19, lineHeight: 28, color: c.onBrand, opacity: 0.88, marginTop: 10, maxWidth: 300 }}>
        Your things, safe in Dubai. Book, pay and sign — all from your phone.
      </Text>
      <View style={{ gap: 10, marginTop: 28 }}>
        <Button block variant="inverse" title="Get started" onPress={() => go('new')} />
        <Button block variant="inverseOutline" title="I already rent with you" onPress={() => go('existing')} />
      </View>
    </View>
  );
}
