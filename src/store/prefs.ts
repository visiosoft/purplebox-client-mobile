import { create } from 'zustand';
import { secure } from '@/lib/secure';

export type ThemeMode = 'system' | 'light' | 'dark';

type PrefsState = {
  theme: ThemeMode;
  biometrics: boolean;
  introSeen: boolean;
  hydrated: boolean;
  setTheme: (t: ThemeMode) => void;
  setBiometrics: (v: boolean) => void;
  markIntroSeen: () => void;
  hydrate: () => Promise<void>;
};

const KEY = 'pb_prefs';

const persist = (s: Pick<PrefsState, 'theme' | 'biometrics' | 'introSeen'>) =>
  secure.set(KEY, JSON.stringify(s)).catch(() => {});

export const usePrefs = create<PrefsState>((set, get) => ({
  theme: 'system',
  biometrics: false,
  introSeen: false,
  hydrated: false,
  setTheme: (theme) => { set({ theme }); persist({ theme, biometrics: get().biometrics, introSeen: get().introSeen }); },
  setBiometrics: (biometrics) => { set({ biometrics }); persist({ theme: get().theme, biometrics, introSeen: get().introSeen }); },
  markIntroSeen: () => { set({ introSeen: true }); persist({ theme: get().theme, biometrics: get().biometrics, introSeen: true }); },
  hydrate: async () => {
    try {
      const raw = await secure.get(KEY);
      if (raw) set({ ...JSON.parse(raw) });
    } catch {}
    set({ hydrated: true });
  },
}));
