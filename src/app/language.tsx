import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Check, Globe } from 'lucide-react-native';
import { Button, Screen, Text, TopBar } from '@/components/ui';
import { applyDirection, restartApp } from '@/i18n/rtl';
import { usePrefs, type Language } from '@/store/prefs';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius, setFontLanguage } from '@/theme/tokens';

const OPTIONS: { lang: Language; name: string; sub: string; font: string }[] = [
  { lang: 'en', name: 'English', sub: 'Continue in English', font: 'Outfit_400Regular' },
  { lang: 'ar', name: 'العربية', sub: 'المتابعة باللغة العربية', font: 'Cairo_600SemiBold' },
];

/**
 * Shown once at first launch, before login, and again from Account → Language. The whole screen is bilingual on
 * purpose: someone who can't read English still has to understand it. Switching direction needs an app reload on phones.
 */
export default function LanguageScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const current = usePrefs((s) => s.language);
  const setLanguage = usePrefs((s) => s.setLanguage);
  const [picked, setPicked] = useState<Language>(current ?? 'en');
  const [reopen, setReopen] = useState(false);
  const [busy, setBusy] = useState(false);
  const changing = current !== null;

  const confirm = async () => {
    if (picked === current) { router.back(); return; }
    setBusy(true);
    setFontLanguage(picked);
    await setLanguage(picked);
    if (applyDirection(picked)) {
      if (!(await restartApp())) { setReopen(true); setBusy(false); }
      return;
    }
    setBusy(false);
    // no restart needed (web, or same direction): the root layout re-mounts and routes on
    if (changing && router.canGoBack()) router.back();
  };

  if (reopen) {
    return (
      <Screen style={{ justifyContent: 'center', gap: 12 }}>
        <Globe color={c.ink} size={36} strokeWidth={1.4} />
        <Text variant="h2">Almost done</Text>
        <Text color="ink2">Close PurpleBox completely and open it again to finish switching the language.</Text>
        <Text variant="h2" style={{ fontFamily: 'Cairo_500Medium', marginTop: 16, textAlign: 'right', writingDirection: 'rtl' }}>شارف على الانتهاء</Text>
        <Text color="ink2" style={{ fontFamily: 'Cairo_400Regular', textAlign: 'right', writingDirection: 'rtl' }}>أغلق التطبيق تمامًا ثم افتحه من جديد لإكمال تغيير اللغة.</Text>
      </Screen>
    );
  }

  return (
    <Screen style={{ justifyContent: changing ? 'flex-start' : 'center' }}>
      {changing ? <TopBar /> : null}
      <View style={{ gap: 22, marginTop: changing ? 8 : 0 }}>
        <View style={{ gap: 8 }}>
          <Globe color={c.ink} size={34} strokeWidth={1.4} />
          <Text variant="h1" style={{ marginTop: 8 }}>Choose your language</Text>
          <Text variant="h2" style={{ fontFamily: 'Cairo_400Regular', textAlign: 'right', writingDirection: 'rtl', alignSelf: 'stretch' }}>اختر لغتك</Text>
        </View>
        <View style={{ gap: 12 }}>
          {OPTIONS.map((o, i) => {
            const on = picked === o.lang;
            return (
              <Animated.View key={o.lang} entering={FadeInDown.delay(120 + i * 90).springify().damping(18)}>
                <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); setPicked(o.lang); }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, borderRadius: radius.card, borderCurve: 'continuous',
                    backgroundColor: c.sf, borderWidth: 2, borderColor: on ? c.ac : c.ln,
                  }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: o.font, fontSize: 26, color: c.ink, textAlign: 'left', writingDirection: o.lang === 'ar' ? 'rtl' : 'ltr' }}>{o.name}</Text>
                    <Text variant="meta" style={{ textAlign: 'left', fontFamily: o.lang === 'ar' ? 'Cairo_400Regular' : fonts.regular, writingDirection: o.lang === 'ar' ? 'rtl' : 'ltr' }}>{o.sub}</Text>
                  </View>
                  <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.ac : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: c.ln2 }}>
                    {on ? <Check color={c.acInk} size={16} strokeWidth={2.2} /> : null}
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
        <Button title={picked === 'ar' ? 'متابعة' : 'Continue'} loading={busy} onPress={confirm} />
        <Text variant="meta" style={{ textAlign: 'center' }}>You can change this later in Account · يمكنك تغييرها لاحقًا من الحساب</Text>
      </View>
    </Screen>
  );
}
