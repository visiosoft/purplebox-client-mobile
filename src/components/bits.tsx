import { ReactNode, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, RefreshControl, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius } from '@/theme/tokens';
import { Text } from './ui';

type Tone = 'ok' | 'warn' | 'err' | 'brand' | 'neutral';

export function StatusChip({ label, tone = 'neutral', icon: Icon }: { label: string; tone?: Tone; icon?: LucideIcon }) {
  const { c } = useTheme();
  const [bg, fg] = {
    ok: [c.okBg, c.ok], warn: [c.warnBg, c.warn], err: [c.errBg, c.err], brand: [c.acSoft, c.ink], neutral: [c.sf2, c.ink2],
  }[tone];
  return (
    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: bg, borderRadius: radius.chip, paddingHorizontal: 12, paddingVertical: 6 }}>
      {Icon ? <Icon color={fg} size={13} strokeWidth={1.8} /> : <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} />}
      <Text style={{ color: tone === 'brand' ? c.ink : c.ink2, fontFamily: fonts.regular, fontSize: 13, textTransform: 'capitalize' }}>{label}</Text>
    </View>
  );
}

export const invoiceTone = (s: string): Tone => (s === 'paid' ? 'ok' : s === 'overdue' ? 'err' : 'warn');

/** Separate pills, like "Directory · Org Chat": the chosen one goes charcoal. */
export function Segmented<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[];
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={({ pressed }) => ({
              flex: 1, height: 44, borderRadius: radius.chip, alignItems: 'center', justifyContent: 'center',
              backgroundColor: on ? c.br : c.sf, borderWidth: on ? 0 : 1, borderColor: c.ln, opacity: pressed ? 0.8 : 1,
            })}>
            <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: on ? c.onBr : c.ink }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({ title, sub, right, onPress, leading, dark }: {
  title: string; sub?: string; right?: ReactNode; onPress?: () => void; leading?: ReactNode; dark?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="title" color={dark ? 'onDk' : 'ink'} style={{ fontSize: 15 }}>{title}</Text>
        {sub ? <Text variant="meta" color={dark ? 'onDk3' : 'ink3'}>{sub}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

/** A small round glyph that sits in front of a row, like the device icons in Session History. */
export function RowIcon({ icon: Icon, dark }: { icon: LucideIcon; dark?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: dark ? c.sf : c.sf2, alignItems: 'center', justifyContent: 'center' }}>
      <Icon color={dark ? c.ink : c.ink2} size={18} strokeWidth={1.5} />
    </View>
  );
}

/** A scrolling tab page with pull-to-refresh and loading/error states, so each screen only renders its data. */
export function Page({ children, loading, error, refreshing, onRefresh }: {
  children: ReactNode; loading?: boolean; error?: string | null; refreshing?: boolean; onRefresh?: () => void;
}) {
  const { c } = useTheme();
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={c.ink} /></View>;
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 130, gap: 14 }} showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.ink} /> : undefined}>
      {error ? <Text style={{ color: c.err }}>{error}</Text> : null}
      {children}
    </ScrollView>
  );
}

/** Solid bar for the filled part, then a hatched track for the rest — as on the match-rate cards. */
export function Meter({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const { c } = useTheme();
  const v = Math.min(1, Math.max(0, value));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height }}>
      {v > 0 ? <View style={{ flex: v, height, borderRadius: height / 2, backgroundColor: color ?? c.ok }} /> : null}
      {v < 1 ? (
        <View style={{ flex: 1 - v, height, borderRadius: height / 2, overflow: 'hidden' }}>
          <Svg width="100%" height={height}>
            {Array.from({ length: 160 }, (_, i) => (
              <Line key={i} x1={i * 4 - height} y1={height} x2={i * 4} y2={0} stroke={c.ink3} strokeOpacity={0.45} strokeWidth={1} />
            ))}
          </Svg>
        </View>
      ) : null}
    </View>
  );
}

const arcPoint = (cx: number, cy: number, r: number, t: number) => {
  const a = Math.PI - t * Math.PI;
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)] as const;
};
const arc = (cx: number, cy: number, r: number, t0: number, t1: number) => {
  const [x0, y0] = arcPoint(cx, cy, r, t0);
  const [x1, y1] = arcPoint(cx, cy, r, t1);
  return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
};

/** The half-moon gauge from "Security status": a yellow arc for the value, a charcoal one for the rest. */
export function Gauge({ value, label, caption, size = 240 }: { value: number; label: string; caption?: string; size?: number }) {
  const { c, isDark } = useTheme();
  const v = Math.min(1, Math.max(0, value));
  const stroke = size * 0.13;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = r + stroke / 2;
  const h = cy + stroke / 2;
  const gap = 0.07;
  return (
    <View style={{ width: size, height: h, alignSelf: 'center' }}>
      <Svg width={size} height={h}>
        {v > 0.01 ? <Path d={arc(cx, cy, r, 0, Math.max(0.001, v - (v < 1 ? gap / 2 : 0)))} stroke={c.ac} strokeWidth={stroke} strokeLinecap="round" fill="none" /> : null}
        {v < 0.99 ? <Path d={arc(cx, cy, r, Math.min(0.999, v + (v > 0 ? gap / 2 : 0)), 1)} stroke={isDark ? c.sf3 : c.dk} strokeWidth={stroke} strokeLinecap="round" fill="none" /> : null}
      </Svg>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' }}>
        <Text variant="display" style={{ fontSize: size * 0.2, lineHeight: size * 0.23 }}>{label}</Text>
        {caption ? <Text variant="meta" color="ink2">{caption}</Text> : null}
      </View>
    </View>
  );
}

/** Rounded "metric" pills in a row, like Experience · Skills · Testing · Interview. */
export function MetricPills({ items, dark }: { items: { label: string; value: string; tone?: 'accent' | 'dark' | 'hatch' | 'light' }[]; dark?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {items.map((m) => {
        const tone = m.tone ?? 'light';
        const bg = { accent: c.ac, dark: c.dk, hatch: 'transparent', light: dark ? c.dk2 : c.sf2 }[tone];
        const fg = tone === 'accent' ? c.acInk : tone === 'dark' || dark ? c.onDk : c.ink;
        return (
          <View key={m.label} style={{ flex: 1, gap: 6 }}>
            <Text variant="meta" color={dark ? 'onDk2' : 'ink2'} numberOfLines={1}>{m.label}</Text>
            <View style={{ height: 36, borderRadius: radius.chip, backgroundColor: bg, justifyContent: 'center', paddingHorizontal: 12, overflow: 'hidden', borderWidth: tone === 'hatch' ? 1 : 0, borderColor: c.ln2 }}>
              {tone === 'hatch' ? (
                <Svg width="100%" height={36} style={{ position: 'absolute', left: 0, top: 0 }}>
                  {Array.from({ length: 60 }, (_, i) => (
                    <Line key={i} x1={i * 6 - 36} y1={36} x2={i * 6} y2={0} stroke={c.ink3} strokeOpacity={0.35} strokeWidth={1} />
                  ))}
                </Svg>
              ) : null}
              <Text numberOfLines={1} style={{ fontFamily: fonts.regular, fontSize: 12, color: fg }}>{m.value}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Smooth yellow line on a charcoal card with a tooltip pill on the selected point, as in "Test Statistics". */
export function LineChart({ points, labels, format, height = 120 }: {
  points: number[]; labels: string[]; format: (n: number) => string; height?: number;
}) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const [sel, setSel] = useState(points.length - 1);
  const max = Math.max(1, ...points);
  const pad = 10;
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const xy = points.map((p, i) => [pad + i * step, height - 12 - (p / max) * (height - 44)] as const);
  const d = xy.reduce((acc, [x, y], i) => {
    if (i === 0) return `M ${x} ${y}`;
    const [px, py] = xy[i - 1];
    const mx = (px + x) / 2;
    return `${acc} C ${mx} ${py} ${mx} ${y} ${x} ${y}`;
  }, '');
  const s = Math.min(sel, points.length - 1);
  const [sx, sy] = xy[s] ?? [0, 0];
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && points.length ? (
        <View style={{ height }}>
          <Svg width={w} height={height}>
            <Line x1={0} x2={w} y1={height - 12} y2={height - 12} stroke={c.onDk3} strokeDasharray="3 5" strokeWidth={1} />
            <Line x1={sx} x2={sx} y1={sy} y2={height} stroke={c.onDk3} strokeDasharray="2 4" strokeWidth={1} />
            <Path d={d} stroke={c.ac} strokeWidth={2} fill="none" />
            <Circle cx={sx} cy={sy} r={6} fill={c.dk} stroke={c.onDk} strokeWidth={2} />
            <Circle cx={sx} cy={sy} r={2} fill={c.onDk} />
          </Svg>
          <View style={{
            position: 'absolute', top: Math.max(0, sy - 44), left: Math.min(Math.max(0, sx - 55), w - 110), width: 110,
            height: 30, borderRadius: radius.chip, backgroundColor: c.sf, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.ac }} />
            <Text style={{ fontFamily: fonts.regular, fontSize: 12 }}>{format(points[s])}</Text>
          </View>
        </View>
      ) : <View style={{ height }} />}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        {labels.map((l, i) => (
          <Pressable key={`${l}${i}`} onPress={() => setSel(i)} hitSlop={8}
            style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.chip, backgroundColor: i === s ? c.dk2 : 'transparent' }}>
            <Text variant="meta" color={i === s ? 'onDk' : 'onDk3'}>{l}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
