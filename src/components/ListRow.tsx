import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Text } from './Text';
import { Press } from './Press';
import { Icon, type IconType } from './Icon';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius, space } from '@/theme/tokens';

export type TileTone = 'brand' | 'ok' | 'due' | 'bad';

/** Icon tile: brand-100 with brand-500 ink, or a status tint. */
export function Tile({ icon, tone = 'brand', size = 44, iconSize, bg }: { icon: IconType; tone?: TileTone; size?: number; iconSize?: number; bg?: string }) {
  const { c } = useTheme();
  const [b, f] = { brand: [c.brand100, c.brand500], ok: [c.successTint, c.success], due: [c.warningTint, c.warning], bad: [c.dangerTint, c.danger] }[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: bg ?? b, alignItems: 'center', justifyContent: 'center' }}>
      <Icon as={icon} size={iconSize ?? (size >= 44 ? 22 : 20)} color={f} />
    </View>
  );
}

/** The workhorse row: tile, title, subline and an end slot. At least 64px tall. */
export function ListRow({ icon, tone, title, sub, end, chevron, onPress, divider, accessibilityLabel }: {
  icon?: IconType; tone?: TileTone; title: string; sub?: string; end?: ReactNode; chevron?: boolean;
  onPress?: () => void; divider?: boolean; accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const body = (
    <>
      {icon ? <Tile icon={icon} tone={tone} size={40} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 }}>{title}</Text>
        {sub ? <Text variant="caption" tone="muted" style={{ fontFamily: fonts.regular }}>{sub}</Text> : null}
      </View>
      {end || chevron ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
          {end}
          {chevron ? <Icon as={ChevronRight} color={c.inkSubtle} flip /> : null}
        </View>
      ) : null}
    </>
  );
  const style: ViewStyle = {
    flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 64, paddingVertical: space[3],
    ...(divider ? { borderTopWidth: 1, borderTopColor: c.line } : {}),
  };
  if (onPress) {
    return (
      <Press onPress={onPress} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} style={style}>
        {body}
      </Press>
    );
  }
  return <View style={style}>{body}</View>;
}

/** Rows stacked inside a card (padding 4 / 20); consecutive rows get a hairline automatically. */
export function RowCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[{
      backgroundColor: c.surfaceCard, borderRadius: radius.card, borderWidth: 1, borderColor: c.line,
      paddingHorizontal: space[5], paddingVertical: 4,
    }, c.shadowCard ? { boxShadow: c.shadowCard } : null, style]}>
      {rows.map((row, i) => (
        <Fragment key={row.key ?? i}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: c.line }} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

/** Label / value line for summaries and invoices. `total` adds the ink rule and 18px weight. */
export function KVRow({ label, value, total, divider, valueTone, labelExtra }: {
  label: string; value: string; total?: boolean; divider?: boolean; valueTone?: 'danger' | 'muted'; labelExtra?: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View style={[
      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[3], paddingVertical: 10 },
      divider && !total ? { borderTopWidth: 1, borderTopColor: c.line } : null,
      total ? { borderTopWidth: 1.5, borderTopColor: c.ink, marginTop: 4 } : null,
    ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], flexShrink: 1 }}>
        <Text style={total ? { fontFamily: fonts.extrabold, fontSize: 18, lineHeight: 24 } : { color: c.inkMuted, flexShrink: 1 }}>{label}</Text>
        {labelExtra}
      </View>
      <Text style={[
        { fontFamily: fonts.bold, textAlign: 'right' },
        total ? { fontFamily: fonts.extrabold, fontSize: 18, lineHeight: 24 } : null,
        valueTone === 'danger' ? { color: c.danger } : valueTone === 'muted' ? { color: c.inkMuted } : null,
      ]}>{value}</Text>
    </View>
  );
}

/** A card of KV rows (padding 8 / 20) with hairlines between them. */
export function KVCard({ rows, style }: {
  rows: (false | null | undefined | { label: string; value: string; total?: boolean; valueTone?: 'danger' | 'muted'; labelExtra?: ReactNode })[];
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const list = rows.filter(Boolean) as Exclude<(typeof rows)[number], false | null | undefined>[];
  return (
    <View style={[{
      backgroundColor: c.surfaceCard, borderRadius: radius.card, borderWidth: 1, borderColor: c.line,
      paddingHorizontal: space[5], paddingVertical: space[2],
    }, c.shadowCard ? { boxShadow: c.shadowCard } : null, style]}>
      {list.map((r, i) => <KVRow key={`${r.label}-${i}`} {...r} divider={i > 0} />)}
    </View>
  );
}
