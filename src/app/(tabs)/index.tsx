import { useEffect } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight, Bell, Calculator, Clock, CreditCard, FileText, IdCard, Link2, LogOut, MapPin, MessageCircle, Package, Star, Undo2,
} from 'lucide-react-native';
import { Button, Card, IconButton, MenuButton, Screen, Text } from '@/components/ui';
import { Gauge, Meter, MetricPills, Page, Row, RowIcon, StatusChip } from '@/components/bits';
import { BoxArt, Carousel, DealCard, PhotoBanner, PlanCard, SectionTitle, ServiceStrip, Tile, UnitCard, type UnitCardData } from '@/components/home';
import { storageApi } from '@/api/storage';
import { useProfile } from '@/hooks/useProfile';
import { useBiometricInfo } from '@/hooks/useBiometricInfo';
import { confirmIdentity } from '@/lib/biometrics';
import { usePrefs } from '@/store/prefs';
import { bookingApi } from '@/api/booking';
import { useAuth } from '@/store/auth';
import { REQUEST_LABEL, useRequests } from '@/store/requests';
import { UNIT_CATALOG, catalogFor } from '@/lib/unitCatalog';
import { aed, daysUntil, monthlyRate, shortDate, termProgress } from '@/lib/format';
import { WHATSAPP } from '@/lib/contact';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius } from '@/theme/tokens';

const today = () => new Date().toISOString().slice(0, 10);

export default function HomeTab() {
  const router = useRouter();
  const { c } = useTheme();
  const customer = useAuth((s) => s.customer);
  const name = customer?.fullName?.split(' ')[0];
  const hasName = !!name && !/^[+\d]/.test(name);

  const q = useQuery({ queryKey: ['home'], queryFn: storageApi.home });
  const pending = useQuery({ queryKey: ['booking-current'], queryFn: bookingApi.current });
  // Live availability and prices; the photos and "what fits" text come from our catalogue.
  const sizes = useQuery({ queryKey: ['sizes-home'], queryFn: () => bookingApi.sizes(today(), 1), staleTime: 5 * 60_000 });
  const requests = useRequests((s) => s.items);
  const profile = useProfile();
  // Once, after the welcome checklist: offer Face ID / fingerprint, if this phone has it set up.
  const bio = useBiometricInfo();
  const { biometrics, biometricsAsked, profilePromptSeen, setBiometrics, markBiometricsAsked } = usePrefs();
  useEffect(() => {
    if (!bio.available || biometrics || biometricsAsked || !profilePromptSeen) return;
    markBiometricsAsked();
    Alert.alert(`Unlock with ${bio.label}?`, 'A quick check keeps your account, ID and payments private if someone else picks up your phone. You can change this in Account.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Turn on', onPress: async () => { if (await confirmIdentity(`Turn on ${bio.label} for PurpleBox`)) setBiometrics(true); } },
    ]);
  }, [bio.available, bio.label, biometrics, biometricsAsked, profilePromptSeen, markBiometricsAsked, setBiometrics]);
  const nextStep = profile.items.find((i) => !i.done);

  const home = q.data;
  const contract = home?.primaryContract;
  const unit = contract?.units[0];
  const due = daysUntil(contract?.nextPaymentDate);
  const left = daysUntil(contract?.endDate);
  const owing = home?.outstanding.total ?? 0;
  const progress = contract ? termProgress(contract) : 0;

  // Units to show: what the server says is free right now; if it can't say, the catalogue with "from" prices.
  const units: UnitCardData[] = sizes.data?.length
    ? sizes.data.map((s) => { const k = catalogFor(s.sizeSqf); return { sizeSqf: s.sizeSqf, img: k?.img, home: k?.home, fits: k?.fits, popular: k?.popular, price: s.monthlyRate, available: s.available, discountPct: s.discountPct }; })
    : sizes.isError ? UNIT_CATALOG.map((k) => ({ sizeSqf: k.sizeSqf, img: k.img, home: k.home, fits: k.fits, popular: k.popular, price: k.from })) : [];
  const discounted = units.filter((u) => (u.discountPct ?? 0) > 0);
  const bestDiscount = discounted.reduce((m, u) => Math.max(m, u.discountPct ?? 0), 0);
  const cheapest = units.reduce((m, u) => Math.min(m, u.price), Infinity);
  const reserve = (sizeSqf?: number) => router.push(sizeSqf ? { pathname: '/book', params: { size: String(sizeSqf) } } : '/book');

  return (
    <Screen>
      {/* brand row, like a logo with a status chip beside it */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 14 }}>
        <MenuButton />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <BoxArt size={30} />
          <Text style={{ fontFamily: fonts.light, fontSize: 24, letterSpacing: -0.8, color: c.ink }}>purplebox</Text>
        </View>
        <Pressable onPress={() => router.navigate('/(tabs)/storage')} accessibilityRole="button" accessibilityLabel="Your unit"
          style={{ backgroundColor: c.dk, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 }}>
          <Star color={c.ac} size={12} strokeWidth={0} fill={c.ac} />
          <Text numberOfLines={1} style={{ fontFamily: fonts.medium, fontSize: 12.5, color: '#FFFFFF', flexShrink: 1 }}>
            {unit ? unit.unitNumber : hasName ? `Hi, ${name}` : 'Welcome'}
          </Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <IconButton icon={Bell} label="Payments" badge={owing > 0} onPress={() => router.navigate('/(tabs)/payments')} />
      </View>

      <Page loading={q.isLoading && !home} error={q.error?.message} refreshing={q.isRefetching} onRefresh={() => { q.refetch(); sizes.refetch(); }}>
        {pending.data ? (
          <Card variant="accent" style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="h3">Finish your booking</Text>
              <ArrowUpRight color="#262626" size={20} strokeWidth={1.6} />
            </View>
            <Text color="ink2">
              {pending.data.state === 'ready_to_sign' ? `Unit ${pending.data.unit.unitNumber} is paid — sign your contract to activate it.`
                : pending.data.state === 'held' ? `Unit ${pending.data.unit.unitNumber} is held for you. Complete payment to keep it.`
                : `We’re finishing up unit ${pending.data.unit.unitNumber}.`}
            </Text>
            <Button title={pending.data.state === 'held' ? 'Continue to payment' : 'Continue'}
              onPress={() => router.push({ pathname: pending.data!.state === 'held' ? '/book/review' : '/book/status', params: { id: pending.data!.bookingId } })} />
          </Card>
        ) : null}

        {owing > 0 ? (
          <Pressable onPress={() => router.navigate('/(tabs)/payments')} accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.dk, borderRadius: radius.card, borderCurve: 'continuous', padding: 16 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.ac, alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard color={c.acInk} size={20} strokeWidth={1.6} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="title" color="onDk">{aed(owing)} due</Text>
              <Text variant="meta" color="onDk2">{due !== null && due >= 0 && due <= 14 ? `Next payment in ${due} day${due === 1 ? '' : 's'}` : 'See your invoices'}</Text>
            </View>
            <Text style={{ fontFamily: fonts.medium, color: c.ac }}>Pay now</Text>
          </Pressable>
        ) : null}

        {profile.percent !== null && profile.percent < 100 ? (
          <Pressable onPress={() => router.push('/profile-complete')} accessibilityRole="button" accessibilityLabel={`Complete your profile, ${profile.percent} percent done`}
            style={({ pressed }) => ({ backgroundColor: c.acSoft, borderRadius: radius.card, borderCurve: 'continuous', padding: 16, gap: 10, opacity: pressed ? 0.85 : 1 })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: fonts.medium, fontSize: 17, color: c.ink }}>Complete your profile</Text>
              <Text style={{ fontFamily: fonts.medium, fontSize: 17, color: c.ink }}>{profile.percent}%</Text>
            </View>
            <Meter value={profile.percent / 100} color={c.br} height={8} />
            {nextStep ? <Text variant="meta" color="ink2">Next: {nextStep.title}</Text> : null}
          </Pressable>
        ) : null}

        {/* the big tile and three smaller ones */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row' }}>
            <Tile big height={118} title={contract ? 'Book another unit' : 'Book a unit'} bg={c.ac} ink={c.acInk} tint="rgba(255,255,255,0.45)"
              art={<BoxArt size={84} />} onPress={() => reserve()} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Tile title="Estimator" bg={c.dk} ink="#FFFFFF" tint="rgba(255,255,255,0.10)" icon={Calculator} onPress={() => router.push('/estimator')} />
            <Tile title="Payments" bg={c.acSoft} ink={c.ink} tint="rgba(248,212,92,0.55)" icon={CreditCard} onPress={() => router.navigate('/(tabs)/payments')} />
            <Tile title="My units" bg={c.sf2} ink={c.ink} tint="rgba(38,38,38,0.08)" icon={Package} onPress={() => router.navigate('/(tabs)/storage')} />
          </View>
        </View>

        <ServiceStrip items={[
          { icon: LogOut, label: 'Check-out', onPress: () => router.push('/checkout') },
          { icon: Undo2, label: 'Refund', onPress: () => router.push('/refund') },
          { icon: IdCard, label: 'ID verify', onPress: () => router.push('/id-upload') },
          { icon: FileText, label: 'Documents', onPress: () => router.navigate({ pathname: '/(tabs)/storage', params: { tab: 'documents' } }) },
          { icon: Link2, label: 'I rent here', onPress: () => router.push('/link-unit') },
          { icon: MessageCircle, label: 'Support', onPress: () => Linking.openURL(WHATSAPP) },
        ]} />

        <View style={{ height: 1, backgroundColor: c.ln2, marginHorizontal: -16, marginVertical: 6 }} />

        <View>
          <SectionTitle title="Plan your move" sub="Get ready before move-in day" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <PlanCard art={<BoxArt size={60} />} title="Estimate your space" sub="Add your items and we’ll suggest a size" footer="Takes 1 minute" onPress={() => router.push('/estimator')} />
            {contract ? (
              <PlanCard art={<LogOut color={c.ink} size={52} strokeWidth={1.2} />} title="Moving out?" sub="Request check-out or extend your stay" footer="Request" onPress={() => router.push('/checkout')} />
            ) : (
              <PlanCard art={<IdCard color={c.ink} size={52} strokeWidth={1.2} />} title="Get your ID ready" sub="Upload your Emirates ID or passport to book faster" footer="Takes 2 minutes" onPress={() => router.push('/id-upload')} />
            )}
          </View>
        </View>

        {units.length ? (
          <View>
            <SectionTitle title="Available units" chip={bestDiscount > 0 ? `Up to ${bestDiscount}% off` : Number.isFinite(cheapest) ? `From ${aed(cheapest)}` : undefined} sub="Al Quoz, Dubai · move in from today" />
            <Carousel>
              {units.map((u) => <UnitCard key={u.sizeSqf} u={u} priceText={aed(u.price)} onPress={() => reserve(u.sizeSqf)} />)}
            </Carousel>
          </View>
        ) : sizes.isLoading ? <Text color="ink2">Checking available units…</Text> : null}

        <View>
          <SectionTitle title="See today’s deals" />
          <Pressable onPress={() => reserve()} accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.card, borderCurve: 'continuous', borderWidth: 1.5, borderColor: c.ln2, backgroundColor: c.sf, padding: 14, opacity: pressed ? 0.8 : 1 })}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: c.acSoft, alignItems: 'center', justifyContent: 'center' }}>
              <MapPin color={c.ink} size={22} strokeWidth={1.6} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.regular, fontSize: 18, letterSpacing: -0.3, color: c.ink }}>Near you (Al Quoz)</Text>
              <Text variant="meta">{shortDate(new Date().toISOString())} · 1 month · private unit</Text>
            </View>
            <Text variant="h3" color="ink3">›</Text>
          </Pressable>
        </View>

        {discounted.length ? (
          <View>
            <SectionTitle title="Deals for you" />
            <Carousel>
              <DealCard icon={Star} title="First-month discount" sub={`Up to ${bestDiscount}% off`} cta="Claim" onPress={() => reserve(discounted[0].sizeSqf)} />
              <DealCard icon={MessageCircle} title="Need several units?" sub="Ask us for a custom quote" cta="Chat" onPress={() => Linking.openURL(WHATSAPP)} />
            </Carousel>
          </View>
        ) : null}

        {discounted.length ? (
          <View>
            <SectionTitle title="Special deals" />
            <Carousel>
              {discounted.slice(0, 4).map((u) => (
                <PhotoBanner key={u.sizeSqf} img={u.img} title={`${u.discountPct}% off your first month`} sub={`${u.sizeSqf} sq ft unit · ${u.home ?? 'private unit'}`} onPress={() => reserve(u.sizeSqf)} />
              ))}
            </Carousel>
          </View>
        ) : null}

        {contract && unit ? (
          <View>
            <SectionTitle title="Your unit" />
            <Card style={{ gap: 18, paddingTop: 24 }}>
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Text variant="h2">Unit {unit.unitNumber}</Text>
                <Text variant="meta">{unit.sizeSqf ? `${unit.sizeSqf} sq ft · ` : ''}{contract.contractNo}</Text>
              </View>
              <Gauge value={progress} label={`${Math.round(progress * 100)}%`}
                caption={left !== null && left > 0 ? `of your term · ${left} days left` : 'of your term'} />
              <MetricPills items={[
                { label: 'Monthly', value: aed(monthlyRate(contract)), tone: 'accent' },
                { label: 'Next payment', value: shortDate(contract.nextPaymentDate), tone: 'dark' },
                { label: 'Check-out', value: shortDate(contract.endDate), tone: 'hatch' },
              ]} />
              {due !== null && due <= 7 && due >= 0 ? <StatusChip tone="warn" label={due === 0 ? 'Due today' : `Due in ${due} day${due === 1 ? '' : 's'}`} /> : null}
            </Card>
          </View>
        ) : null}

        {requests.length ? (
          <Card style={{ gap: 4, paddingVertical: 14 }}>
            <Text variant="title">Your requests</Text>
            {requests.map((r) => (
              <Row key={r.id} leading={<RowIcon icon={Clock} />} title={REQUEST_LABEL[r.kind]}
                sub={`Unit ${r.unit}${r.detail ? ` · ${r.detail}` : ''} · sent ${shortDate(new Date(r.at).toISOString())}`}
                right={<StatusChip label="Pending" tone="warn" />} />
            ))}
          </Card>
        ) : null}
      </Page>
    </Screen>
  );
}
