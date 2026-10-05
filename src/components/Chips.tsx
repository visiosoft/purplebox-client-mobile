import { View } from 'react-native';
import { Text } from './Text';
import { Press } from './Press';
import { Icon, type IconType } from './Icon';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius } from '@/theme/tokens';

export type ChipKind = 'due' | 'paid' | 'overdue' | 'info' | 'neutral';

/** Dot + word. Never colour alone; red only means overdue. */
export function StatusChip({ kind = 'neutral', label, plain, small }: { kind?: ChipKind; label: string; plain?: boolean; small?: boolean }) {
  const { c } = useTheme();
  const [bg, fg] = {
    due: [c.warningTint, c.warning], paid: [c.successTint, c.success], overdue: [c.dangerTint, c.danger],
    info: [c.brand100, c.brand500], neutral: [c.surfaceSunken, c.inkMuted],
  }[kind];
  return (
    <View style={{
      alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
      height: small ? 22 : 28, paddingHorizontal: small ? 8 : 12, borderRadius: radius.pill, backgroundColor: bg,
    }}>
      {plain ? null : <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: fg }} />}
      <Text numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: small ? 12 : 13, lineHeight: 16, color: fg }}>{label}</Text>
    </View>
  );
}

/** Invoice status → chip. */
export const invoiceChip = (status: string): { kind: ChipKind; label: string } =>
  status === 'paid' ? { kind: 'paid', label: 'Paid' }
    : status === 'overdue' ? { kind: 'overdue', label: 'Overdue' }
      : status === 'partial' ? { kind: 'due', label: 'Part paid' }
        : { kind: 'due', label: 'Due' };

/** Outline pill for duration choices and quick filters; `selected` fills it brand-500. */
export function SuggestionChip({ label, selected, onPress, icon, radio }: {
  label: string; selected?: boolean; onPress: () => void; icon?: IconType; radio?: boolean;
}) {
  const { c } = useTheme();
  const fg = selected ? c.onBrand : c.brand500;
  return (
    <Press
      onPress={onPress}
      scaleTo={0.96}
      accessibilityRole={radio ? 'radio' : 'button'}
      accessibilityState={radio ? { checked: !!selected } : undefined}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 16,
        borderRadius: radius.pill, borderWidth: 1.5,
        borderColor: selected ? c.brand500 : c.brand200,
        backgroundColor: selected ? c.brand500 : c.surfaceCard,
      }}
    >
      {icon ? <Icon as={icon} size={18} color={fg} /> : null}
      <Text style={{ fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: fg }}>{label}</Text>
    </Press>
  );
}
