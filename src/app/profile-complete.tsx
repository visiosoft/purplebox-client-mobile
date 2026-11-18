import { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { Button, Card, Screen, Text, TopBar } from '@/components/ui';
import { Meter, Page, Row } from '@/components/bits';
import { ChecklistRoute } from '@/api/profile';
import { useDir } from '@/i18n/useDir';
import { useI18n } from '@/i18n';
import { useProfile } from '@/hooks/useProfile';
import { usePrefs } from '@/store/prefs';
import { useTheme } from '@/theme/useTheme';

const PATH: Record<ChecklistRoute, string | null> = {
  phone: null, whatsapp: '/whatsapp-pref', email: '/email-verify', identity: '/id-upload', access: '/access', details: '/profile-details',
};

/** A circle that fills in with a tick once a step is done. */
function Tick({ done }: { done: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? c.ac : 'transparent', borderWidth: done ? 0 : 1.5, borderColor: c.ln2 }}>
      {done ? <Check color={c.acInk} size={16} strokeWidth={2.2} /> : null}
    </View>
  );
}

// "Complete your profile": every step is optional, each one makes things smoother (and more of it is on file for us).
export default function ProfileComplete() {
  const router = useRouter();
  const { c } = useTheme();
  const { t } = useI18n();
  const { ChevronForward } = useDir();
  const { welcome } = useLocalSearchParams<{ welcome?: string }>();
  const p = useProfile();
  const mark = usePrefs((s) => s.markProfilePromptSeen);
  useEffect(() => { mark(); }, [mark]); // the one-time welcome has now been shown

  const done = p.items.filter((i) => i.done);
  const todo = p.items.filter((i) => !i.done);
  const open = (route: ChecklistRoute) => { const to = PATH[route]; if (to) router.push(to as never); };
  const next = todo[0];

  return (
    <Screen>
      <TopBar title={welcome ? t('Welcome to PurpleBox') : t('Complete your profile')} onBack={welcome ? () => router.replace('/(tabs)') : undefined} />
      <Page loading={p.isLoading} error={p.isError ? t('We could not load your profile. Pull down to try again.') : undefined} onRefresh={() => p.refetch()} refreshing={p.isRefetching}>
        <Text color="ink2">
          {welcome ? t('A few quick steps help us serve you better. None of them are required, and you can finish them any time.') : t('Each step makes booking, payments and updates smoother.')}
        </Text>

        <Card variant="dark" style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text variant="title" color="onDk">{t('Profile strength')}</Text>
            <Text variant="h1" color="onDk">{p.percent ?? 0}%</Text>
          </View>
          <Meter value={(p.percent ?? 0) / 100} color={c.ac} height={10} />
          <Text variant="meta" color="onDk2">{t('{done} of {total} steps done', { done: done.length, total: p.items.length })}{next ? ` · ${t('next: {title}', { title: next.title })}` : ` · ${t('all done, thank you!')}`}</Text>
        </Card>

        {todo.length ? (
          <Card style={{ paddingVertical: 8 }}>
            <Text variant="overline" color="ink3" style={{ marginTop: 10 }}>{t('TO DO')}</Text>
            {todo.map((i) => (
              <Row key={i.key} leading={<Tick done={false} />} title={i.title} sub={i.hint} onPress={PATH[i.route] ? () => open(i.route) : undefined}
                right={PATH[i.route] ? <ChevronForward color={c.ink3} size={18} strokeWidth={1.6} /> : undefined} />
            ))}
          </Card>
        ) : null}

        {done.length ? (
          <Card style={{ paddingVertical: 8 }}>
            <Text variant="overline" color="ink3" style={{ marginTop: 10 }}>{t('DONE')}</Text>
            {done.map((i) => (
              <Row key={i.key} leading={<Tick done />} title={i.title} onPress={PATH[i.route] ? () => open(i.route) : undefined} />
            ))}
          </Card>
        ) : null}

        <Button title={welcome ? (todo.length ? t('Skip for now') : t('Continue')) : t('Done')} variant={welcome && todo.length ? 'soft' : 'primary'}
          onPress={() => (welcome ? router.replace('/(tabs)') : router.back())} />
      </Page>
    </Screen>
  );
}
