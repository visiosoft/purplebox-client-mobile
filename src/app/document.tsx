import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Share2 } from 'lucide-react-native';
import { Button, IconButton, Screen, Text, TopBar } from '@/components/ui';
import { PdfViewer } from '@/components/PdfViewer';
import { fetchDocument, shareDocument } from '@/api/storage';
import { useTheme } from '@/theme/useTheme';

// Contracts, invoices and receipts open here, inside the app, so people can read them without leaving.
export default function DocumentScreen() {
  const { c } = useTheme();
  const { href, title } = useLocalSearchParams<{ href: string; title: string }>();
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    fetchDocument({ href, title }).then((u) => { if (live) { setUri(u); setError(null); } }).catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [href, title, attempt]);

  return (
    <Screen style={{ paddingBottom: 16 }}>
      <TopBar title={title} right={uri && Platform.OS !== 'web' ? <IconButton icon={Share2} label="Share or save" onPress={() => shareDocument(uri)} /> : undefined} />
      <View style={{ flex: 1 }}>
        {error ? (
          <View style={{ gap: 12, paddingTop: 12 }}>
            <Text style={{ color: c.err }}>{error}</Text>
            <Button title="Try again" variant="soft" onPress={() => { setError(null); setUri(null); setAttempt(attempt + 1); }} />
          </View>
        ) : uri ? (
          <PdfViewer uri={uri} onError={setError} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <ActivityIndicator color={c.ink} />
            <Text variant="meta">Opening document…</Text>
          </View>
        )}
      </View>
    </Screen>
  );
}
