import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, RefreshControl, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius } from '@/theme/tokens';
import { Text } from './ui';

type Tone = 'ok' | 'warn' | 'err' | 'brand' | 'neutral';

export function StatusChip({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { c } = useTheme();
  const map = {
    ok: [c.okBg, c.ok], warn: [c.warnBg, c.warn], err: [c.errBg, c.err], brand: [c.bsoft, c.brt], neutral: [c.sf2, c.ink2],
  }[tone];
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: map[0], borderRadius: radius.chip, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: map[1], fontFamily: fonts.bold, fontSize: 11.5 }}>{label}</Text>
    </View>
  );
}

export const invoiceTone = (s: string): Tone => (s === 'paid' ? 'ok' : s === 'overdue' ? 'err' : 'warn');

export function Segmented<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[];
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.sf2, borderRadius: radius.chip, padding: 3 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)}
            style={{ flex: 1, height: 34, borderRadius: radius.chip, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.sf : 'transparent' }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: on ? c.ink : c.ink3 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({ title, sub, right, onPress }: { title: string; sub?: string; right?: ReactNode; onPress?: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, opacity: pressed ? 0.7 : 1, borderBottomWidth: 1, borderBottomColor: c.ln })}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bold }}>{title}</Text>
        {sub ? <Text variant="meta">{sub}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

/** A scrolling tab page with pull-to-refresh and loading/error states, so each screen only renders its data. */
export function Page({ children, loading, error, refreshing, onRefresh }: {
  children: ReactNode; loading?: boolean; error?: string | null; refreshing?: boolean; onRefresh?: () => void;
}) {
  const { c } = useTheme();
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={c.br} /></View>;
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 120, gap: 16 }} showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.br} /> : undefined}>
      {error ? <Text style={{ color: c.err }}>{error}</Text> : null}
      {children}
    </ScrollView>
  );
}
