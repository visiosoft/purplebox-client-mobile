import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Pdf from 'react-native-pdf';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme/useTheme';

/** Renders a PDF already saved on the phone (phones: react-native-pdf). Pinch to zoom, scroll to read. */
export function PdfViewer({ uri, onError }: { uri: string; onError?: (message: string) => void }) {
  const { c } = useTheme();
  const [page, setPage] = useState<[number, number]>([1, 1]);
  return (
    <View style={{ flex: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: c.sf2 }}>
      <Pdf
        source={{ uri }}
        style={{ flex: 1, backgroundColor: c.sf2 }}
        trustAllCerts={false}
        enablePaging={false}
        fitPolicy={0}
        spacing={8}
        renderActivityIndicator={() => <ActivityIndicator color={c.ink} />}
        onLoadComplete={(n) => setPage([1, n])}
        onPageChanged={(p, n) => setPage([p, n])}
        onError={(e) => onError?.(e instanceof Error ? e.message : 'Could not open this document')}
      />
      {page[1] > 1 ? (
        <View style={{ position: 'absolute', bottom: 14, alignSelf: 'center', backgroundColor: 'rgba(38,38,38,0.8)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
          <Text variant="meta" style={{ color: '#FFFFFF' }}>{page[0]} / {page[1]}</Text>
        </View>
      ) : null}
    </View>
  );
}
