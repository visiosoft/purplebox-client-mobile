import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Outfit_300Light, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { Cairo_300Light, Cairo_400Regular, Cairo_500Medium, Cairo_600SemiBold } from '@expo-google-fonts/cairo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth, needsProfile } from '@/store/auth';
import { Splash } from '@/components/Splash';
import { Drawer, EdgeSwipe } from '@/components/Drawer';
import { useBookingReminders } from '@/hooks/useBookingReminders';
import { useAppLock } from '@/hooks/useAppLock';
import { LockScreen } from '@/components/LockScreen';
import { usePrefs } from '@/store/prefs';
import { useRequests } from '@/store/requests';
import { useTheme } from '@/theme/useTheme';
import { setFontLanguage } from '@/theme/tokens';
import { directionMatches } from '@/i18n';
import { applyDirection, restartApp } from '@/i18n/rtl';

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();

function Gate() {
  const { ready, customer } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { c, isDark } = useTheme();
  const promptSeen = usePrefs((s) => s.profilePromptSeen);
  const language = usePrefs((s) => s.language);
  useBookingReminders(!!customer && !needsProfile(customer));
  useAppLock(!!customer);

  useEffect(() => {
    if (!ready) return;
    // First launch: the very first thing is choosing English or Arabic.
    if (language === null) { if (segments[0] !== 'language') router.replace('/language' as never); return; }
    const inAuth = segments[0] === '(auth)';
    const onProfile = inAuth && (segments as string[])[1] === 'profile';
    if (!customer && !inAuth) router.replace('/(auth)/login');
    else if (customer && needsProfile(customer) && !onProfile) router.replace('/(auth)/profile');
    // Signed in with a real name: show "complete your profile" once, then the app. It is optional and skippable.
    else if (customer && !needsProfile(customer) && inAuth) router.replace(promptSeen ? '/(tabs)' : '/profile-complete?welcome=1');
    else if (customer && !needsProfile(customer) && !promptSeen && segments[0] === '(tabs)') router.replace('/profile-complete?welcome=1');
  }, [ready, customer, segments, router, promptSeen, language]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="language" options={{ animation: 'fade' }} />
        <Stack.Screen name="estimator" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="id-upload" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
      {customer && !needsProfile(customer) ? (
        <>
          {segments[0] === '(tabs)' ? <EdgeSwipe /> : null}
          <Drawer />
        </>
      ) : null}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_300Light, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold,
    Cairo_300Light, Cairo_400Regular, Cairo_500Medium, Cairo_600SemiBold,
  });
  const ready = useAuth((s) => s.ready);
  const hydrated = usePrefs((s) => s.hydrated);
  const language = usePrefs((s) => s.language);
  setFontLanguage(language ?? 'en'); // idempotent: picks Cairo for Arabic before anything renders
  // The layout direction is fixed per launch on phones: if it doesn't match the chosen language, fix it and reload.
  const wrongDirection = hydrated && language !== null && !directionMatches(language);
  useEffect(() => {
    if (!hydrated || language === null) return;
    if (applyDirection(language)) restartApp();
  }, [hydrated, language]);

  useEffect(() => { usePrefs.getState().hydrate(); useRequests.getState().hydrate(); useAuth.getState().bootstrap(); }, []);
  useEffect(() => { if (fontsLoaded && ready && hydrated) SplashScreen.hideAsync(); }, [fontsLoaded, ready, hydrated]);

  if (!fontsLoaded || !ready || !hydrated || (wrongDirection && Platform.OS !== 'web')) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <QueryClientProvider client={queryClient}>
            <Gate key={language ?? 'none'} />
            <LockScreen />
            <Splash />
          </QueryClientProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
