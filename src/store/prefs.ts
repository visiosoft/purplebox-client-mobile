import { create } from 'zustand';
import { secure } from '@/lib/secure';

export type ThemeMode = 'system' | 'light' | 'dark';

type PrefsState = {
  theme: ThemeMode;
  biometrics: boolean;
  introSeen: boolean;
  reminders: boolean;
  hydrated: boolean;
  setTheme: (t: ThemeMode) => void;
  setBiometrics: (v: boolean) => void;
  markIntroSeen: () => void;
  setReminders: (v: boolean) => void;
  hydrate: () => Promise<void>;
};

const KEY = 'pb_prefs';

const persist = (s: Pick<PrefsState, 'theme' | 'biometrics' | 'introSeen' | 'reminders'>) =>
  secure.set(KEY, JSON.stringify(s)).catch(() => {});

export const usePrefs = create<PrefsState>((set, get) => ({
  theme: 'system',
  biometrics: false,
  introSeen: false,
  reminders: true,
  hydrated: false,
  setTheme: (theme) => { set({ theme }); persist({ theme, biometrics: get().biometrics, introSeen: get().introSeen, reminders: get().reminders }); },
  setBiometrics: (biometrics) => { set({ biometrics }); persist({ theme: get().theme, biometrics, introSeen: get().introSeen, reminders: get().reminders }); },
  markIntroSeen: () => { set({ introSeen: true }); persist({ theme: get().theme, biometrics: get().biometrics, introSeen: true, reminders: get().reminders }); },
  setReminders: (reminders) => { set({ reminders }); persist({ theme: get().theme, biometrics: get().biometrics, introSeen: get().introSeen, reminders }); },
  hydrate: async () => {
    try {
      const raw = await secure.get(KEY);
      if (raw) set({ ...JSON.parse(raw) });
    } catch {}
    set({ hydrated: true });
  },
}));
