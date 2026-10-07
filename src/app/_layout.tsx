import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Outfit_300Light, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '@/store/auth';
import { usePrefs } from '@/store/prefs';
import { useTheme } from '@/theme/useTheme';

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();

function Gate() {
  const { ready, customer } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { c, isDark } = useTheme();

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === '(auth)';
    if (!customer && !inAuth) router.replace('/(auth)/login');
    else if (customer && inAuth) router.replace('/(tabs)');
  }, [ready, customer, segments, router]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_300Light, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold,
  });
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
