import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Text } from './Text';
import { IconButton } from './Button';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius, space } from '@/theme/tokens';
import { isoDay, monthName } from '@/lib/format';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Month grid (Monday first). Days outside min…max are disabled; today has a ring. */
export function Calendar({ value, onChange, min, max }: { value: string; onChange: (iso: string) => void; min: Date; max: Date }) {
  const { c } = useTheme();
  const selected = value;
  const start = new Date(value ? Number(value.slice(0, 4)) : min.getFullYear(), value ? Number(value.slice(5, 7)) - 1 : min.getMonth(), 1);
  const [month, setMonth] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const first = new Date(month.y, month.m, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(month.y, month.m + 1, 0).getDate();
  const today = isoDay(new Date());
  const minIso = isoDay(min);
  const maxIso = isoDay(max);
  const canPrev = new Date(month.y, month.m, 1) > new Date(min.getFullYear(), min.getMonth(), 1);
  const canNext = new Date(month.y, month.m, 1) < new Date(max.getFullYear(), max.getMonth(), 1);
  const shift = (n: number) => setMonth(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <IconButton icon={ChevronLeft} label="Previous month" onPress={() => shift(-1)} disabled={!canPrev} flip />
        <Text style={{ fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 }}>{monthName(month.m)} {month.y}</Text>
        <IconButton icon={ChevronRight} label="Next month" onPress={() => shift(1)} disabled={!canNext} flip />
      </View>
      <View style={{ flexDirection: 'row' }}>
        {DOW.map((d, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: c.inkMuted, paddingVertical: 6 }}>{d}</Text>
        ))}
      </View>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={{ width: `${100 / 7}%`, height: 48 }} />;
          const iso = isoDay(new Date(month.y, month.m, d));
          const disabled = iso < minIso || iso > maxIso;
          const on = iso === selected;
          return (
            <View key={i} style={{ width: `${100 / 7}%`, height: 48, padding: 2 }}>
              <Pressable
                disabled={disabled}
                onPress={() => onChange(iso)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on, disabled }}
                accessibilityLabel={`${d} ${monthName(month.m)}`}
                style={[
                  { flex: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
                  on ? { backgroundColor: c.brand500 } : iso === today ? { borderWidth: 1.5, borderColor: c.lineStrong } : null,
                ]}
              >
                <Text style={{
                  fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20,
                  color: on ? c.onBrand : disabled ? c.lineStrong : c.ink, opacity: disabled ? 0.6 : 1,
                }}>{d}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      <View style={{ height: space[1] }} />
    </View>
  );
}
