import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricInfo = { available: boolean; label: string };

/** Whether this phone can check Face ID / fingerprint right now, and what to call it. Never throws. */
export async function biometricInfo(): Promise<BiometricInfo> {
  const none = { available: false, label: 'biometrics' };
  if (Platform.OS === 'web') return none;
  try {
    const [hardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync(), LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const T = LocalAuthentication.AuthenticationType;
    const face = types.includes(T.FACIAL_RECOGNITION);
    const finger = types.includes(T.FINGERPRINT);
    const label = Platform.OS === 'ios'
      ? (face ? 'Face ID' : finger ? 'Touch ID' : 'biometrics')
      : (finger ? 'fingerprint' : face ? 'face unlock' : 'biometrics');
    return { available: hardware && enrolled, label };
  } catch {
    return none;
  }
}

/**
 * Ask the phone to confirm it is the owner. The phone's own passcode is accepted if Face ID or the fingerprint fails, so
 * nobody is locked out of their account by a wet finger or a mask.
 */
export async function confirmIdentity(reason: string): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: 'Cancel', fallbackLabel: 'Use passcode' });
    return r.success;
  } catch {
    return false;
  }
}
