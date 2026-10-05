import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Key-value storage for the login token and preferences: the device keychain on
 * a phone, localStorage in a web browser (expo-secure-store has no web version).
 */
export const secure = {
  get: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') { try { return localStorage.getItem(key); } catch { return null; } }
    return SecureStore.getItemAsync(key).catch(() => null);
  },
  set: async (key: string, value: string) => {
    if (Platform.OS === 'web') { try { localStorage.setItem(key, value); } catch {} return; }
    await SecureStore.setItemAsync(key, value);
  },
  remove: async (key: string) => {
    if (Platform.OS === 'web') { try { localStorage.removeItem(key); } catch {} return; }
    await SecureStore.deleteItemAsync(key).catch(() => {});
  },
};
