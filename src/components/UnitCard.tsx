import { View } from 'react-native';
import { Card } from './Card';
import { Text } from './Text';
import { StatusChip } from './Chips';
import { useTheme } from '@/theme/useTheme';
import { fonts, space } from '@/theme/tokens';
import { aed, monthlyRate, shortDate } from '@/lib/format';
import type { Contract } from '@/api/storage';

export const contractChip = (status: Contract['status']) =>
  status === 'active' ? { kind: 'info' as const, label: 'Active' }
    : status === 'pending_signature' ? { kind: 'due' as const, label: 'To sign' }
      : { kind: 'neutral' as const, label: 'Ended' };

export const unitNumbers = (c: Contract) => c.units.map((u) => u.unitNumber).join(', ') || c.contractNo;

export const unitMeta = (c: Contract) => {
  const u = c.units[0];
  const size = c.units.reduce((s, x) => s + (x.sizeSqf ?? 0), 0);
  return [size ? `${size} sqft` : null, u?.floor ? (/floor/i.test(u.floor) ? u.floor : `Floor ${u.floor}`) : null].filter(Boolean).join(' · ');
};

/**
 * Unit card pattern: size and floor in muted caption, the unit number large, a status chip
 * top-end, then Monthly · Next payment · Ends above a hairline.
 */
export function UnitCard({ contract, onPress }: { contract: Contract; onPress: () => void }) {
  const { c } = useTheme();
  const chip = contractChip(contract.status);
  const meta = [
    ['Monthly', aed(monthlyRate(contract))],
    ['Next payment', contract.nextPaymentDate ? shortDate(contract.nextPaymentDate) : '—'],
    ['Ends', shortDate(contract.endDate)],
  ];
  return (
    <Card onPress={onPress} accessibilityLabel={`Unit ${unitNumbers(contract)}`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space[3] }}>
        <View style={{ flex: 1 }}>
          {unitMeta(contract) ? <Text variant="caption" tone="muted">{unitMeta(contract)}</Text> : null}
          <Text style={{ fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 40, letterSpacing: -0.68, direction: 'ltr' }}>{unitNumbers(contract)}</Text>
        </View>
        <StatusChip kind={chip.kind} label={chip.label} />
      </View>
      <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[4], paddingTop: 14, borderTopWidth: 1, borderTopColor: c.line }}>
        {meta.map(([k, v]) => (
          <View key={k} style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: c.inkMuted }}>{k}</Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 }}>{v}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
