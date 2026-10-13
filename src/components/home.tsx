import { ReactNode, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Polygon } from 'react-native-svg';
import { ExternalLink, MapPin, Package, Zap, type LucideIcon } from 'lucide-react-native';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius } from '@/theme/tokens';

/** A small isometric box: the PurpleBox mark, and the picture used when a unit photo can't load. */
export function BoxArt({ size = 64, top = '#FFF6D1', left = '#262626', right = '#454545', label = '#F8D45C' }: { size?: number; top?: string; left?: string; right?: string; label?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Polygon points="10,35 60,60 60,115 10,90" fill={left} />
      <Polygon points="110,35 60,60 60,115 110,90" fill={right} />
      <Polygon points="60,10 110,35 60,60 10,35" fill={top} />
      <Polygon points="20,52 48,66 48,86 20,72" fill={label} />
    </Svg>
  );
}

export function SectionTitle({ title, sub, chip }: { title: string; sub?: string; chip?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 4, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Text style={{ fontFamily: fonts.medium, fontSize: 22, letterSpacing: -0.5, color: c.ink }}>{title}</Text>
        {chip ? (
          <View style={{ backgroundColor: c.ac, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: c.acInk }}>{chip}</Text>
          </View>
        ) : null}
      </View>
      {sub ? <Text color="ink2">{sub}</Text> : null}
    </View>
  );
}

/** Big rounded tile with the title top-left and a soft circle + glyph in the bottom-right corner. */
export function Tile({ title, bg, ink, tint, icon: Icon, art, onPress, height = 96, big }: {
  title: string; bg: string; ink: string; tint: string; icon?: LucideIcon; art?: ReactNode; onPress: () => void; height?: number; big?: boolean;
}) {
  const circle = big ? 150 : 104;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title}
      style={({ pressed }) => ({ flex: 1, height, borderRadius: radius.card, borderCurve: 'continuous', backgroundColor: bg, overflow: 'hidden', padding: 16, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <View style={{ position: 'absolute', right: -circle * 0.22, bottom: -circle * 0.32, width: circle, height: circle, borderRadius: circle / 2, backgroundColor: tint }} />
      <View style={{ position: 'absolute', right: big ? 22 : 14, bottom: big ? 14 : 10 }}>
        {art ?? (Icon ? <Icon color={ink} size={big ? 54 : 38} strokeWidth={1.3} style={{ opacity: 0.85 }} /> : null)}
      </View>
      <Text style={{ fontFamily: fonts.medium, fontSize: big ? 22 : 17, letterSpacing: -0.4, color: ink, lineHeight: big ? 26 : 22 }}>{title}</Text>
    </Pressable>
  );
}

/** A card of round icons with labels that scrolls sideways, the last one peeking in to show there are more. */
export function ServiceStrip({ items }: { items: { icon: LucideIcon; label: string; onPress: () => void }[] }) {
  const { c, isDark } = useTheme();
  return (
    <View style={{ backgroundColor: c.sf, borderRadius: radius.card, borderCurve: 'continuous', borderWidth: 1, borderColor: c.ln, paddingVertical: 14,
      ...(isDark ? {} : { shadowColor: '#8A7B3C', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 2 }) }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10 }}>
        {items.map((it) => (
          <Pressable key={it.label} onPress={it.onPress} accessibilityRole="button" accessibilityLabel={it.label}
            style={({ pressed }) => ({ width: 78, alignItems: 'center', gap: 8, opacity: pressed ? 0.6 : 1 })}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.acSoft, alignItems: 'center', justifyContent: 'center' }}>
              <it.icon color={c.ink} size={22} strokeWidth={1.6} />
            </View>
            <Text variant="meta" color="ink" style={{ textAlign: 'center', fontSize: 12.5, lineHeight: 16 }}>{it.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/** Outlined card with an illustration, a title, a line of copy and a small footer with an "opens" arrow. */
export function PlanCard({ art, title, sub, footer, onPress }: { art: ReactNode; title: string; sub: string; footer: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title}
      style={({ pressed }) => ({ flex: 1, minHeight: 206, borderRadius: radius.card, borderCurve: 'continuous', borderWidth: 1.5, borderColor: c.ln2, backgroundColor: c.sf, padding: 16, gap: 6, justifyContent: 'space-between', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <View style={{ height: 64, justifyContent: 'center' }}>{art}</View>
      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: fonts.medium, fontSize: 17, letterSpacing: -0.3, color: c.ink, lineHeight: 22 }}>{title}</Text>
        <Text variant="meta">{sub}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text variant="meta">{footer}</Text>
        <ExternalLink color={c.ink} size={15} strokeWidth={1.7} />
      </View>
    </Pressable>
  );
}

export type UnitCardData = { sizeSqf: number; img?: string; home?: string; fits?: string; popular?: boolean; price: number; available?: number; discountPct?: number };

/** One available unit: photo with a badge, what it is, where, and the monthly price. Tap to reserve. */
export function UnitCard({ u, onPress, priceText }: { u: UnitCardData; onPress: () => void; priceText: string }) {
  const { c } = useTheme();
  const [failed, setFailed] = useState(false);
  const scarce = u.available !== undefined && u.available <= 2;
  const badge = u.available === undefined ? (u.popular ? 'Popular' : null) : scarce ? `Only ${u.available} left` : u.popular ? 'Popular' : `${u.available} available`;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${u.sizeSqf} square foot unit, ${priceText} per month`}
      style={({ pressed }) => ({ width: 176, borderRadius: radius.card, borderCurve: 'continuous', borderWidth: 1.5, borderColor: c.ln2, backgroundColor: c.sf, overflow: 'hidden', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <View style={{ height: 118, backgroundColor: c.sf2, alignItems: 'center', justifyContent: 'center' }}>
        {u.img && !failed ? <Image source={u.img} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" transition={250} onError={() => setFailed(true)} /> : <BoxArt size={64} />}
        {badge ? (
          <View style={{ position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: scarce ? c.warn : c.dk, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 }}>
            <Zap color="#FFFFFF" size={12} strokeWidth={2} fill="#FFFFFF" />
            <Text numberOfLines={1} style={{ color: '#FFFFFF', fontFamily: fonts.medium, fontSize: 12, flexShrink: 1 }}>{badge}</Text>
          </View>
        ) : null}
        {u.discountPct ? (
          <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: c.ac, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: c.acInk }}>{u.discountPct}% off</Text>
          </View>
        ) : null}
      </View>
      <View style={{ padding: 12, gap: 6, flex: 1, justifyContent: 'space-between' }}>
        <View style={{ gap: 5 }}>
          <Text numberOfLines={1} style={{ fontFamily: fonts.medium, fontSize: 17, letterSpacing: -0.3, color: c.ink }}>{u.sizeSqf} sq ft unit</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Package color={c.warn} size={14} strokeWidth={1.7} />
            <Text variant="meta" color="ink2" numberOfLines={1} style={{ flex: 1 }}>{u.home ?? 'Private unit'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <MapPin color={c.ink3} size={14} strokeWidth={1.7} />
            <Text variant="meta" numberOfLines={1}>Al Quoz, Dubai</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', marginTop: 4 }}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 20, letterSpacing: -0.4, color: c.ink }}>{priceText}</Text>
          <Text variant="meta">per month</Text>
        </View>
      </View>
    </Pressable>
  );
}

/** A "deal" card with a leading glyph, headline, small print and a call-to-action link. */
export function DealCard({ icon: Icon, title, sub, cta, onPress }: { icon: LucideIcon; title: string; sub: string; cta: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${cta}`}
      style={({ pressed }) => ({ width: 236, minHeight: 132, borderRadius: radius.card, borderCurve: 'continuous', borderWidth: 1.5, borderColor: c.ln2, backgroundColor: c.sf, padding: 16, justifyContent: 'space-between', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.acSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon color={c.ink} size={22} strokeWidth={1.6} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 17, letterSpacing: -0.3, color: c.ink }}>{title}</Text>
          <Text variant="meta" color="ink2">{sub}</Text>
        </View>
      </View>
      <Text style={{ alignSelf: 'flex-end', fontFamily: fonts.medium, fontSize: 15, color: c.ink, textDecorationLine: 'underline' }}>{cta}</Text>
    </Pressable>
  );
}

/** A wide photo banner with a headline on top: used for the "special deals" built from live discounts. */
export function PhotoBanner({ img, title, sub, onPress }: { img?: string; title: string; sub: string; onPress: () => void }) {
  const { c } = useTheme();
  const [failed, setFailed] = useState(false);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`}
      style={({ pressed }) => ({ width: 276, height: 176, borderRadius: radius.card, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: c.dk, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      {img && !failed ? <Image source={img} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" transition={250} onError={() => setFailed(true)} /> : null}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,20,20,0.52)' }} />
      <View style={{ flex: 1, padding: 18, justifyContent: 'flex-end', gap: 4 }}>
        <View style={{ alignSelf: 'flex-start', backgroundColor: c.ac, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: c.acInk }}>Limited offer</Text>
        </View>
        <Text style={{ fontFamily: fonts.medium, fontSize: 24, letterSpacing: -0.5, color: '#FFFFFF', lineHeight: 28 }}>{title}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: fonts.regular, fontSize: 13 }}>{sub}</Text>
      </View>
    </Pressable>
  );
}

/** Edge-to-edge sideways scroller that lines up with the page gutter. */
export function Carousel({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 4 }}>
      {children}
    </ScrollView>
  );
}
