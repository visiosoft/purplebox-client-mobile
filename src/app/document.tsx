import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Share2 } from 'lucide-react-native';
import { Button, IconButton, Screen, Text, TopBar } from '@/components/ui';
import { PdfViewer } from '@/components/PdfViewer';
import { fetchDocument, shareDocument } from '@/api/storage';
import { useTheme } from '@/theme/useTheme';
import { useI18n } from '@/i18n';

// Contracts, invoices and receipts open here, inside the app, so people can read them without leaving.
export default function DocumentScreen() {
  const { t } = useI18n();
  const { c } = useTheme();
  const { href, title, mime, ext } = useLocalSearchParams<{ href: string; title: string; mime?: string; ext?: string }>();
  const isImage = !!mime?.startsWith('image/');
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    fetchDocument({ href, title, ext }).then((u) => { if (live) { setUri(u); setError(null); } }).catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [href, title, ext, attempt]);

  return (
    <Screen style={{ paddingBottom: 16 }}>
      <TopBar title={title} right={uri && Platform.OS !== 'web' ? <IconButton icon={Share2} label={t('Share or save')} onPress={() => shareDocument(uri)} /> : undefined} />
      <View style={{ flex: 1 }}>
        {error ? (
          <View style={{ gap: 12, paddingTop: 12 }}>
            <Text style={{ color: c.err }}>{error}</Text>
            <Button title={t('Try again')} variant="soft" onPress={() => { setError(null); setUri(null); setAttempt(attempt + 1); }} />
          </View>
        ) : uri && isImage ? (
          <Image source={uri} style={{ flex: 1, borderRadius: 24 }} contentFit="contain" onError={() => setError(t('Could not open this image'))} />
        ) : uri ? (
          <PdfViewer uri={uri} onError={setError} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <ActivityIndicator color={c.ink} />
            <Text variant="meta">{t('Opening document…')}</Text>
          </View>
        )}
      </View>
    </Screen>
  );
}
