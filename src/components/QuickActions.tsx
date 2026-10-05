import { View } from 'react-native';
import { Text } from './Text';
import { Press } from './Press';
import { Icon, type IconType } from './Icon';
import { useTheme } from '@/theme/useTheme';
import { fonts, space } from '@/theme/tokens';

export type QuickAction = { icon: IconType; label: string; onPress: () => void };

function Item({ icon, label, onPress }: QuickAction) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Press onPress={onPress} scaleTo={0.92} haptic accessibilityRole="button" accessibilityLabel={label}
        style={{ alignItems: 'center', gap: space[2] }}>
        <View style={{
          width: 60, height: 60, borderRadius: 20, backgroundColor: c.surfaceCard, borderWidth: 1, borderColor: c.line,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon as={icon} size={26} color={c.brand500} />
        </View>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18 }}>{label}</Text>
      </Press>
    </View>
  );
}

/** Exactly four round-square shortcuts on Home: Pay, Contract, Move, Chat. */
export function QuickActions({ items }: { items: [QuickAction, QuickAction, QuickAction, QuickAction] }) {
  return (
    <View style={{ flexDirection: 'row', gap: space[3] }}>
      {items.map((q) => <Item key={q.label} {...q} />)}
    </View>
  );
}
