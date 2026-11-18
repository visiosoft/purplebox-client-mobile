import { create } from 'zustand';
import { secure } from '@/lib/secure';

export type ThemeMode = 'system' | 'light' | 'dark';

export type Language = 'en' | 'ar';

type Saved = { language: Language | null; theme: ThemeMode; biometrics: boolean; biometricsAsked: boolean; introSeen: boolean; profilePromptSeen: boolean; reminders: boolean };

type PrefsState = Saved & {
  hydrated: boolean;
  /** null until the customer has chosen at first launch. */
  setLanguage: (l: Language) => Promise<void>;
  setTheme: (t: ThemeMode) => void;
  setBiometrics: (v: boolean) => void;
  setReminders: (v: boolean) => void;
  markIntroSeen: () => void;
  /** The one-time "complete your profile" welcome has been shown (or skipped). */
  markProfilePromptSeen: () => void;
  /** The one-time "turn on Face ID?" question has been asked. */
  markBiometricsAsked: () => void;
  hydrate: () => Promise<void>;
};

const KEY = 'pb_prefs';

const save = (s: Saved) =>
  secure.set(KEY, JSON.stringify({ language: s.language, theme: s.theme, biometrics: s.biometrics, biometricsAsked: s.biometricsAsked, introSeen: s.introSeen, profilePromptSeen: s.profilePromptSeen, reminders: s.reminders })).catch(() => {});

export const usePrefs = create<PrefsState>((set, get) => ({
  language: null,
  theme: 'system',
  biometrics: false,
  biometricsAsked: false,
  introSeen: false,
  profilePromptSeen: false,
  reminders: true,
  hydrated: false,
  setLanguage: async (language) => { set({ language }); await save(get()); },
  setTheme: (theme) => { set({ theme }); save(get()); },
  setBiometrics: (biometrics) => { set({ biometrics }); save(get()); },
  setReminders: (reminders) => { set({ reminders }); save(get()); },
  markIntroSeen: () => { set({ introSeen: true }); save(get()); },
  markProfilePromptSeen: () => { set({ profilePromptSeen: true }); save(get()); },
  markBiometricsAsked: () => { set({ biometricsAsked: true }); save(get()); },
  hydrate: async () => {
    try {
      const raw = await secure.get(KEY);
      if (raw) set({ ...JSON.parse(raw) });
    } catch {}
    set({ hydrated: true });
  },
}));
