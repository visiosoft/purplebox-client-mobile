import { create } from 'zustand';
import { secure } from '@/lib/secure';

export type ThemeMode = 'system' | 'light' | 'dark';

type PrefsState = {
  theme: ThemeMode;
  biometrics: boolean;
  hydrated: boolean;
  setTheme: (t: ThemeMode) => void;
  setBiometrics: (v: boolean) => void;
  hydrate: () => Promise<void>;
};

const KEY = 'pb_prefs';

const persist = (s: Pick<PrefsState, 'theme' | 'biometrics'>) =>
  secure.set(KEY, JSON.stringify(s)).catch(() => {});

export const usePrefs = create<PrefsState>((set, get) => ({
  theme: 'system',
  biometrics: false,
  hydrated: false,
  setTheme: (theme) => { set({ theme }); persist({ theme, biometrics: get().biometrics }); },
  setBiometrics: (biometrics) => { set({ biometrics }); persist({ theme: get().theme, biometrics }); },
  hydrate: async () => {
    try {
      const raw = await secure.get(KEY);
      if (raw) set({ ...JSON.parse(raw) });
    } catch {}
    set({ hydrated: true });
  },
}));
