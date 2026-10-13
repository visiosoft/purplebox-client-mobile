import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { IconButton, Text } from './ui';
import { useTheme } from '@/theme/useTheme';
import { fonts } from '@/theme/tokens';

const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Month grid, Monday first. Days before `min`, after `max` or on a closed
 * weekday can't be picked; closed weekdays are struck through so it's clear
 * why (workers don't work Sundays).
 */
export function Calendar({ value, onChange, min, max, closedWeekdays = [] }: {
  value: string | null; onChange: (ymd: string) => void; min: Date; max: Date; closedWeekdays?: number[];
}) {
  const { c } = useTheme();
  const [month, setMonth] = useState(() => {
    const d = value ? new Date(`${value}T00:00:00`) : min;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const today = ymd(new Date());
  const lead = (month.getDay() + 6) % 7; // Monday-first offset
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  while (cells.length % 7) cells.push(null);
  const canPrev = month > new Date(min.getFullYear(), min.getMonth(), 1);
  const canNext = new Date(month.getFullYear(), month.getMonth() + 1, 1) <= max;
  const minKey = ymd(min);
  const maxKey = ymd(max);

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ opacity: canPrev ? 1 : 0.3 }} pointerEvents={canPrev ? 'auto' : 'none'}>
          <IconButton icon={ChevronLeft} label="Previous month" size={40} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} />
        </View>
        <Text variant="title">{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Text>
        <View style={{ opacity: canNext ? 1 : 0.3 }} pointerEvents={canNext ? 'auto' : 'none'}>
          <IconButton icon={ChevronRight} label="Next month" size={40} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} />
        </View>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {WEEK.map((w, i) => <Text key={i} variant="meta" style={{ flex: 1, textAlign: 'center' }}>{w}</Text>)}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
            if (!d) return <View key={i} style={{ flex: 1, height: 42 }} />;
            const key = ymd(d);
            const closed = closedWeekdays.includes(d.getDay());
            const off = key < minKey || key > maxKey || closed;
            const on = key === value;
            return (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <Pressable disabled={off} onPress={() => onChange(key)} accessibilityRole="button" accessibilityState={{ selected: on, disabled: off }}
                  accessibilityLabel={d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                  style={{
                    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: on ? c.br : 'transparent', borderWidth: key === today && !on ? 1.5 : 0, borderColor: c.ink3,
                  }}>
                  <Text style={{
                    fontFamily: on ? fonts.medium : fonts.regular, fontSize: 15, color: on ? c.onBr : c.ink, opacity: off ? 0.3 : 1,
                    textDecorationLine: closed && key >= minKey && key <= maxKey ? 'line-through' : 'none',
                  }}>{d.getDate()}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
