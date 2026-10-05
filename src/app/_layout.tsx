import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import {
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { ToastHost } from '@/components';
import { useAuth } from '@/store/auth';
import { usePrefs } from '@/store/prefs';
import { useOnboarding } from '@/store/onboarding';
import { useTheme } from '@/theme/useTheme';
import { hasRealName } from '@/lib/format';

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

function Gate() {
  const { ready, customer } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { c } = useTheme();
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === '(auth)';
    if (!customer && !inAuth) router.replace('/(auth)/welcome');
    else if (customer && inAuth) {
      // Just signed in: ask for a name if we only have the phone number, then carry on
      // to wherever the welcome screen pointed.
      if (!hasRealName(customer.fullName)) router.replace('/name');
      else if (useOnboarding.getState().intent === 'existing') router.replace('/link-unit');
      else router.replace('/(tabs)');
    }
  }, [ready, customer, segments, router]);

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.surface },
        animation: reduced ? 'fade' : 'slide_from_right',
        animationDuration: 320,
      }} />
      <ToastHost />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  const ready = useAuth((s) => s.ready);
  const hydrated = usePrefs((s) => s.hydrated);

  useEffect(() => { usePrefs.getState().hydrate(); useAuth.getState().bootstrap(); }, []);
  useEffect(() => { if (fontsLoaded && ready && hydrated) SplashScreen.hideAsync(); }, [fontsLoaded, ready, hydrated]);

  if (!fontsLoaded || !ready || !hydrated) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Gate />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
