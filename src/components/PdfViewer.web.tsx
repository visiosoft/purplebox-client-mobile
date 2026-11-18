import { createElement } from 'react';
import { View } from 'react-native';

/** Browser build: the PDF is shown in an embedded frame (the page passes a blob: URL). */
export function PdfViewer({ uri }: { uri: string; onError?: (message: string) => void }) {
  return (
    <View style={{ flex: 1, borderRadius: 24, overflow: 'hidden' }}>
      {createElement('iframe', { src: uri, style: { border: 0, width: '100%', height: '100%' }, title: 'Document' })}
    </View>
  );
}
