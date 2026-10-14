import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { usePrefs } from '@/store/prefs';
import { useLock } from '@/store/lock';

const AWAY_MS = 60_000; // locked again after a minute away from the app

/**
 * Keeps the app locked behind Face ID / fingerprint, when the customer has turned that on: at launch, and after the app has
 * been in the background for a minute. The check is on the phone only. It protects whoever is holding the phone; the login
 * itself is unchanged.
 */
export function useAppLock(signedIn: boolean) {
  const enabled = usePrefs((s) => s.biometrics);
  const startedEnabled = useRef(usePrefs.getState().biometrics); // what was true when the app opened
  const coldDone = useRef(false);

  // At launch: lock once, if it was already switched on. (Turning it on later must not lock you straight away.)
  useEffect(() => {
    if (coldDone.current || !signedIn) return;
    coldDone.current = true;
    if (startedEnabled.current) useLock.getState().lock();
  }, [signedIn]);

  // Back from the background after a while: lock again.
  useEffect(() => {
    let leftAt = 0;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') leftAt = Date.now();
      else if (state === 'active' && leftAt) {
        const away = Date.now() - leftAt;
        leftAt = 0;
        if (enabled && signedIn && away > AWAY_MS && !useLock.getState().busy) useLock.getState().lock();
      }
    });
    return () => sub.remove();
  }, [enabled, signedIn]);
}
