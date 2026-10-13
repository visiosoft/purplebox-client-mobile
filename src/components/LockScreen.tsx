import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { ScanFace } from 'lucide-react-native';
import { Button, Text } from '@/components/ui';
import { BoxArt } from '@/components/home';
import { biometricInfo, confirmIdentity } from '@/lib/biometrics';
import { useAuth } from '@/store/auth';
import { useLock } from '@/store/lock';
import { usePrefs } from '@/store/prefs';
import { fonts } from '@/theme/tokens';


/** Covers the app until the owner proves it is them with Face ID or fingerprint (or the phone passcode). */
export function LockScreen() {
  const locked = useLock((s) => s.locked);
  const signedIn = !!useAuth((s) => s.customer);
  const logout = useAuth((s) => s.logout);
  const asked = useRef(false);

  const unlock = useCallback(async () => {
    const info = await biometricInfo();
    if (!info.available) { // the phone no longer has Face ID / fingerprint set up: never lock someone out of their account
      usePrefs.getState().setBiometrics(false);
      useLock.getState().unlock();
      return;
    }
    useLock.getState().setBusy(true);
    const ok = await confirmIdentity('Unlock PurpleBox');
    useLock.getState().setBusy(false);
    if (ok) useLock.getState().unlock();
  }, []);

  // Ask straight away, once per time the lock appears.
  useEffect(() => {
    if (locked && signedIn && !asked.current) { asked.current = true; const t = setTimeout(unlock, 350); return () => clearTimeout(t); }
    if (!locked) asked.current = false;
  }, [locked, signedIn, unlock]);

  if (!locked || !signedIn) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.wrap]} accessibilityViewIsModal>
      <View style={styles.center}>
        <BoxArt size={84} />
        <Text style={styles.title}>PurpleBox is locked</Text>
        <Text style={styles.sub}>Confirm it is you to continue.</Text>
      </View>
      <View style={styles.actions}>
        <Button title="Unlock" variant="accent" icon={ScanFace} onPress={unlock} />
        <Button title="Sign out" variant="ghost" onPress={() => { useLock.getState().unlock(); logout(); }} style={{ opacity: 0.9 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#5B2BC9', zIndex: 300, justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 140, paddingBottom: 56 },
  center: { alignItems: 'center', gap: 12 },
  title: { fontFamily: fonts.light, fontSize: 32, color: '#FFFFFF', letterSpacing: -0.8, marginTop: 10 },
  sub: { fontFamily: fonts.regular, fontSize: 15, color: 'rgba(255,255,255,0.8)' },
  actions: { gap: 6 },
});
