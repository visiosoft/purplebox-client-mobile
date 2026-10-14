import { ReactNode, useEffect, useState } from 'react';
import { ScanFace } from 'lucide-react-native';
import { Button, Card, Screen, Text, TopBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import { confirmIdentity } from '@/lib/biometrics';
import { useLock } from '@/store/lock';
import { usePrefs } from '@/store/prefs';

const FRESH_MS = 5 * 60_000; // a recent check counts for five minutes

/** For sensitive screens (ID documents, saved card): asks for Face ID / fingerprint first, if the customer turned that on. */
export function BiometricGate({ reason, title, children }: { reason: string; title: string; children: ReactNode }) {
  const { t } = useI18n();
  const enabled = usePrefs((s) => s.biometrics);
  const [ok, setOk] = useState(() => !enabled || Date.now() - useLock.getState().lastAuthAt < FRESH_MS);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    useLock.getState().setBusy(true);
    const yes = await confirmIdentity(reason);
    useLock.getState().setBusy(false);
    setBusy(false);
    if (yes) { useLock.getState().unlock(); setOk(true); }
  };
  useEffect(() => { if (!ok) { const t = setTimeout(run, 250); return () => clearTimeout(t); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (ok) return <>{children}</>;
  return (
    <Screen>
      <TopBar title={title} />
      <Card style={{ gap: 14, alignItems: 'center', paddingVertical: 32 }}>
        <ScanFace color="#262626" size={44} strokeWidth={1.3} />
        <Text variant="h3">{t('Locked')}</Text>
        <Text color="ink2" style={{ textAlign: 'center' }}>{reason}</Text>
        <Button title={t('Unlock')} variant="accent" loading={busy} onPress={run} style={{ alignSelf: 'stretch' }} />
      </Card>
    </Screen>
  );
}
