import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { ArrowLeftRight, Check, HardHat, ImageIcon, Minus, Package, PackagePlus, Plus, Tags, Trash2, Truck, type LucideIcon } from 'lucide-react-native';
import { Text } from './ui';
import { StatusChip } from './bits';
import {
  ITEM_STATUS_LABEL, STATUS_LABEL, SERVICE_LABEL, itemPhoto, whenLabel,
  type Item, type ItemStatus, type ServiceRequest, type ServiceStatus, type ServiceType,
} from '@/api/services';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius } from '@/theme/tokens';

const ICONS: Record<ServiceType, LucideIcon> = {
  supplies: Tags, pickup: PackagePlus, dropoff: Truck, both: ArrowLeftRight, worker: HardHat, disposal: Trash2,
};
/** The server can add a service before this build knows it; that one gets a plain box instead of crashing the list. */
export const SERVICE_ICON = new Proxy(ICONS, { get: (t, k: string) => t[k as ServiceType] ?? Package }) as Record<ServiceType, LucideIcon>;
export const knownService = (t: string): t is ServiceType => t in ICONS;

type Tone = 'ok' | 'warn' | 'err' | 'brand' | 'neutral';
const STATUS_TONE: Record<ServiceStatus, Tone> = {
  requested: 'neutral', confirmed: 'brand', scheduled: 'brand', in_progress: 'warn', completed: 'ok', cancelled: 'err',
};
const ITEM_TONE: Record<ItemStatus, Tone> = { expected: 'neutral', stored: 'ok', scheduled: 'brand', transit: 'warn', out: 'neutral' };

export const RequestStatus = ({ status }: { status: ServiceStatus }) => <StatusChip label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />;
export const ItemStatusChip = ({ status }: { status: ItemStatus }) => <StatusChip label={ITEM_STATUS_LABEL[status]} tone={ITEM_TONE[status]} />;

/** The rounded tinted square an icon sits in, as on the Home tiles. */
export function IconTile({ icon: Icon, size = 44 }: { icon: LucideIcon; size?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: radius.tile, borderCurve: 'continuous', backgroundColor: c.acSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Icon color={c.ink} size={size * 0.45} strokeWidth={1.6} />
    </View>
  );
}

/** Mono text for labels and references (PBX-…, SR-…), so they read as codes. */
export function Code({ children }: { children: string }) {
  const { c } = useTheme();
  return <Text style={{ fontFamily: 'monospace', fontSize: 12, color: c.ink3, letterSpacing: 0.3 }}>{children}</Text>;
}

export function RequestRow({ r, onPress }: { r: ServiceRequest; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
      <IconTile icon={SERVICE_ICON[r.type]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="title" style={{ fontSize: 15 }}>{SERVICE_LABEL[r.type] ?? 'Service'}</Text>
        <Code>{r.ref}</Code>
        <Text variant="meta">{whenLabel(r)}</Text>
      </View>
      <RequestStatus status={r.status} />
    </Pressable>
  );
}

/** − n + with the minus greyed at the floor. */
export function Stepper({ value, onChange, min = 0, max = 200, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  const { c } = useTheme();
  const btn = (Icon: LucideIcon, next: number, off: boolean, primary: boolean, a11y: string) => (
    <Pressable disabled={off} onPress={() => onChange(next)} accessibilityRole="button" accessibilityLabel={`${a11y} ${label}`} hitSlop={6}
      style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: primary ? c.br : c.sf2, opacity: off ? 0.35 : pressed ? 0.7 : 1 })}>
      <Icon color={primary ? c.onBr : c.ink} size={18} strokeWidth={2} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {btn(Minus, value - 1, value <= min, false, 'Fewer')}
      <Text variant="title" style={{ minWidth: 26, textAlign: 'center' }} accessibilityLabel={`${value} ${label}`}>{String(value)}</Text>
      {btn(Plus, value + 1, value >= max, true, 'More')}
    </View>
  );
}

/** 26px round tick inside a 44px target. */
export function Checkbox({ on, onPress, label, disabled }: { on: boolean; onPress: () => void; label: string; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled }} accessibilityLabel={label}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: on ? 0 : 1.5, borderColor: c.ln2, backgroundColor: on ? c.br : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {on ? <Check color={c.onBr} size={15} strokeWidth={2.4} /> : null}
      </View>
    </Pressable>
  );
}

export function ItemThumb({ item, size = 56 }: { item: Pick<Item, 'id' | 'hasPhoto'>; size?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: 14, overflow: 'hidden', backgroundColor: c.sf2, alignItems: 'center', justifyContent: 'center' }}>
      {item.hasPhoto
        ? <Image source={itemPhoto(item.id)} style={{ width: size, height: size }} contentFit="cover" transition={150} />
        : <ImageIcon color={c.ink3} size={size * 0.36} strokeWidth={1.4} />}
    </View>
  );
}

/** One stored item: photo, name, label · category, status, and a tick when it can be picked. */
export function ItemRow({ item, selected, onToggle, onPress, selectable = true }: {
  item: Item; selected?: boolean; onToggle?: () => void; onPress?: () => void; selectable?: boolean;
}) {
  const canPick = selectable && item.status === 'stored';
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, opacity: pressed ? 0.75 : 1 })}>
      <View style={{ opacity: canPick || !selectable ? 1 : 0.45 }}><ItemThumb item={item} /></View>
      <View style={{ flex: 1, gap: 3, opacity: canPick || !selectable ? 1 : 0.6 }}>
        <Text variant="title" style={{ fontSize: 15 }} numberOfLines={1}>{item.name}</Text>
        <Code>{item.category ? `${item.label} · ${categoryLabel(item.category)}` : item.label}</Code>
        <ItemStatusChip status={item.status} />
      </View>
      {onToggle ? <Checkbox on={!!selected} onPress={onToggle} disabled={!canPick} label={`Select ${item.name}`} /> : null}
    </Pressable>
  );
}

const CATEGORY: Record<string, string> = {
  BOX: 'Box', SUITCASE: 'Suitcase', BAG: 'Bag', FURNITURE: 'Furniture', LOOSE_ITEM: 'Loose item', PALLET: 'Pallet',
  TOTE: 'Tote', DOCUMENT_BOX: 'Documents', OTHER: 'Other',
};
export const categoryLabel = (c: string) => CATEGORY[c] ?? c.charAt(0) + c.slice(1).toLowerCase().replace(/_/g, ' ');

/** "Pickup" style big radio card used in the wizard. */
export function ChoiceCard({ icon, title, sub, on, onPress, right }: { icon?: LucideIcon; title: string; sub?: string; on: boolean; onPress: () => void; right?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.card, borderCurve: 'continuous',
        backgroundColor: on ? c.acSoft : c.sf, borderWidth: 2, borderColor: on ? c.ac : c.ln, opacity: pressed ? 0.8 : 1,
      })}>
      {icon ? <IconTile icon={icon} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="title" style={{ fontSize: 16 }}>{title}</Text>
        {sub ? <Text variant="meta">{sub}</Text> : null}
      </View>
      {right ?? (
        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: on ? 7 : 1.5, borderColor: on ? c.br : c.ln2, backgroundColor: c.sf }} />
      )}
    </Pressable>
  );
}

/** Small pill used for filters and time choices. */
export function Chip({ label, on, onPress, disabled, strike }: { label: string; on: boolean; onPress: () => void; disabled?: boolean; strike?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected: on, disabled }}
      style={({ pressed }) => ({
        minHeight: 42, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
        backgroundColor: on ? c.br : c.sf, borderWidth: 1, borderColor: on ? c.br : c.ln, opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
      })}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: on ? c.onBr : c.ink, textDecorationLine: strike ? 'line-through' : 'none' }}>{label}</Text>
    </Pressable>
  );
}
