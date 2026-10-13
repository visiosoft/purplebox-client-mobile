import { create } from 'zustand';
import { secure } from '@/lib/secure';

export type ThemeMode = 'system' | 'light' | 'dark';

type Saved = { theme: ThemeMode; biometrics: boolean; introSeen: boolean; profilePromptSeen: boolean; reminders: boolean };

type PrefsState = Saved & {
  hydrated: boolean;
  setTheme: (t: ThemeMode) => void;
  setBiometrics: (v: boolean) => void;
  setReminders: (v: boolean) => void;
  markIntroSeen: () => void;
  /** The one-time "complete your profile" welcome has been shown (or skipped). */
  markProfilePromptSeen: () => void;
  hydrate: () => Promise<void>;
};

const KEY = 'pb_prefs';

const save = (s: Saved) =>
  secure.set(KEY, JSON.stringify({ theme: s.theme, biometrics: s.biometrics, introSeen: s.introSeen, profilePromptSeen: s.profilePromptSeen, reminders: s.reminders })).catch(() => {});

export const usePrefs = create<PrefsState>((set, get) => ({
  theme: 'system',
  biometrics: false,
  introSeen: false,
  profilePromptSeen: false,
  reminders: true,
  hydrated: false,
  setTheme: (theme) => { set({ theme }); save(get()); },
  setBiometrics: (biometrics) => { set({ biometrics }); save(get()); },
  setReminders: (reminders) => { set({ reminders }); save(get()); },
  markIntroSeen: () => { set({ introSeen: true }); save(get()); },
  markProfilePromptSeen: () => { set({ profilePromptSeen: true }); save(get()); },
  hydrate: async () => {
    try {
      const raw = await secure.get(KEY);
      if (raw) set({ ...JSON.parse(raw) });
    } catch {}
    set({ hydrated: true });
  },
}));
