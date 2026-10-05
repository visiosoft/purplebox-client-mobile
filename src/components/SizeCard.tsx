import { View } from 'react-native';
import { Box, Check } from 'lucide-react-native';
import { Text } from './Text';
import { Press } from './Press';
import { Icon } from './Icon';
import { StatusChip } from './Chips';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius, space } from '@/theme/tokens';
import { aed } from '@/lib/format';

/** What fits, in plain words, for a size. */
export const sizeFits = (sqft: number) =>
  sqft <= 15 ? 'Boxes, suitcases, a bike'
    : sqft <= 30 ? 'A studio flat or small office'
      : sqft <= 40 ? 'A 1-bedroom flat'
        : sqft <= 75 ? '2-bedroom flat or shop stock'
          : 'A family home or business stock';

/** The box glyph grows with the unit, 18–38px. */
const glyph = (sqft: number) => Math.round(Math.max(18, Math.min(38, 14 + sqft * 0.5)));

/**
 * Selectable size card in a two-column grid. Behaves as a radio: a 2.5px brand ring and a
 * check badge when selected. "N left" turns amber at 3 or fewer.
 */
export function SizeCard({ sqft, monthly, left, selected, onPress, note }: {
  sqft: number; monthly: number; left: number; selected: boolean; onPress: () => void; note?: string;
}) {
  const { c } = useTheme();
  const ring = selected ? 2.5 : 1.5;
  return (
    <Press
      onPress={onPress}
      scaleTo={0.98}
      haptic
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${sqft} square feet, ${aed(monthly)} a month, ${left} left`}
      style={{
        flex: 1, borderRadius: radius.card, backgroundColor: c.surfaceCard, borderWidth: ring,
        borderColor: selected ? c.brand500 : c.line, padding: space[4] - (ring - 1.5), gap: space[2],
      }}
    >
      <View style={{ height: 72, borderRadius: radius.md, backgroundColor: c.brand100, alignItems: 'center', justifyContent: 'center' }}>
        <Icon as={Box} size={glyph(sqft)} color={c.brand500} />
      </View>
      <Text style={{ fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 26 }}>{sqft} sqft</Text>
      <Text style={{ fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: c.brand500 }}>
        {aed(monthly)}
        <Text style={{ fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: c.inkMuted }}>/month</Text>
      </Text>
      <Text style={{ fontSize: 13, lineHeight: 18, color: c.inkMuted }}>{sizeFits(sqft)}</Text>
      {note ? <Text style={{ fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: c.brand500 }}>{note}</Text> : null}
      <StatusChip kind={left <= 3 ? 'due' : 'info'} label={`${left} left`} />
      {selected ? (
        <View style={{
          pointerEvents: 'none', position: 'absolute', top: 12, end: 12, width: 26, height: 26, borderRadius: 13, backgroundColor: c.brand500,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon as={Check} size={16} color={c.onBrand} />
        </View>
      ) : null}
    </Press>
  );
}
