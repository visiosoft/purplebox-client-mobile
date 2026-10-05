import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Platform, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { Text } from './Text';
import { useTheme } from '@/theme/useTheme';

export type SignaturePadHandle = {
  clear: () => void;
  /** The drawn strokes as a `data:image/png;base64,…` URL, or null if it could not be captured. */
  toPng: () => Promise<string | null>;
};

const INK = '#1A0B33';

/**
 * Finger signature pad drawn with react-native-svg and a gesture-handler pan. The guide
 * line and hint sit behind the strokes with pointerEvents none, so the exported PNG holds
 * only the signature on a transparent background.
 */
export function SignaturePad({ ref, onChange, onDrawingChange, height = 170 }: {
  ref?: Ref<SignaturePadHandle>;
  onChange?: (hasInk: boolean) => void;
  /** True while a finger is down — lets the parent pause scrolling. */
  onDrawingChange?: (drawing: boolean) => void;
  height?: number;
}) {
  const { c } = useTheme();
  const svg = useRef<Svg>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [current, setCurrent] = useState('');

  useImperativeHandle(ref, () => ({
    clear: () => { live.current = ''; setPaths([]); setCurrent(''); onChange?.(false); },
    toPng: () => new Promise<string | null>((resolve) => {
      const node = svg.current as unknown as { toDataURL?: (cb: (b64: string) => void) => void } | null;
      if (!node?.toDataURL) return resolve(null);
      const timer = setTimeout(() => resolve(null), 4000);
      try {
        node.toDataURL((b64) => {
          clearTimeout(timer);
          resolve(b64 ? `data:image/png;base64,${b64.replace(/^data:image\/png;base64,/, '')}` : null);
        });
      } catch { clearTimeout(timer); resolve(null); }
    }),
  }));

  const live = useRef('');
  const pt = (x: number, y: number) => `${x.toFixed(1)} ${y.toFixed(1)}`;
  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => {
      onDrawingChange?.(true);
      live.current = `M${pt(e.x, e.y)}`;
      setCurrent(live.current);
    })
    .onUpdate((e) => {
      live.current = live.current ? `${live.current} L${pt(e.x, e.y)}` : `M${pt(e.x, e.y)}`;
      setCurrent(live.current);
    })
    .onFinalize(() => {
      onDrawingChange?.(false);
      const d = live.current;
      live.current = '';
      setCurrent('');
      if (!d) return;
      // A tap with no movement still leaves a dot.
      const stroke = d.includes('L') ? d : `${d} l0.1 0.1`;
      setPaths((p) => [...p, stroke]);
      onChange?.(true);
    });

  const empty = !paths.length && !current;
  return (
    <View
      accessibilityLabel="Signature pad. Sign inside the box."
      style={[
        { height, borderRadius: 18, backgroundColor: c.surfaceCard, borderWidth: 1.5, borderColor: c.lineStrong, overflow: 'hidden' },
        Platform.OS === 'web' ? ({ touchAction: 'none', cursor: 'crosshair' } as object) : null,
      ]}
    >
      <View style={{ pointerEvents: 'none', position: 'absolute', start: 22, end: 22, bottom: 44, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: c.brand200 }} />
      {empty ? (
        <Text variant="caption" style={{ pointerEvents: 'none', position: 'absolute', start: 22, bottom: 16, color: c.inkSubtle }}>
          Sign here with your finger
        </Text>
      ) : null}
      <GestureDetector gesture={pan}>
        <View style={{ flex: 1 }} collapsable={false}>
          <Svg ref={svg} width="100%" height="100%">
            {paths.map((d, i) => (
              <Path key={i} d={d} stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            ))}
            {current ? <Path d={current} stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
          </Svg>
        </View>
      </GestureDetector>
    </View>
  );
}
