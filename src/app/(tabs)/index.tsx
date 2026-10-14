import { useEffect } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpLeft, ArrowUpRight, Bell, Calculator, Clock, CreditCard, FileText, IdCard, Link2, LogOut, MapPin, MessageCircle, Package, Star, Undo2,
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
import { tr, useI18n } from '@/i18n';
import { useDir } from '@/i18n/useDir';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius } from '@/theme/tokens';

const today = () => new Date().toISOString().slice(0, 10);

export default function HomeTab() {
  const router = useRouter();
  const { c } = useTheme();
  const { t } = useI18n();
  const { isRTL } = useDir();
  const OpenIcon = isRTL ? ArrowUpLeft : ArrowUpRight;
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
    Alert.alert(tr('Unlock with {label}?', { label: bio.label }), tr('A quick check keeps your account, ID and payments private if someone else picks up your phone. You can change this in Account.'), [
      { text: tr('Not now'), style: 'cancel' },
      { text: tr('Turn on'), onPress: async () => { if (await confirmIdentity(tr('Turn on {label} for PurpleBox', { label: bio.label }))) setBiometrics(true); } },
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
        <Pressable onPress={() => router.navigate('/(tabs)/storage')} accessibilityRole="button" accessibilityLabel={t('Your unit')}
          style={{ backgroundColor: c.dk, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 }}>
          <Star color={c.ac} size={12} strokeWidth={0} fill={c.ac} />
          <Text numberOfLines={1} style={{ fontFamily: fonts.medium, fontSize: 12.5, color: '#FFFFFF', flexShrink: 1 }}>
            {unit ? unit.unitNumber : hasName ? t('Hi, {name}', { name }) : t('Welcome')}
          </Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <IconButton icon={Bell} label={t('Payments')} badge={owing > 0} onPress={() => router.navigate('/(tabs)/payments')} />
      </View>

      <Page loading={q.isLoading && !home} error={q.error?.message} refreshing={q.isRefetching} onRefresh={() => { q.refetch(); sizes.refetch(); }}>
        {pending.data ? (
          <Card variant="accent" style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="h3">{t('Finish your booking')}</Text>
              <OpenIcon color="#262626" size={20} strokeWidth={1.6} />
            </View>
            <Text color="ink2">
              {pending.data.state === 'ready_to_sign' ? t('Unit {unit} is paid — sign your contract to activate it.', { unit: pending.data.unit.unitNumber })
                : pending.data.state === 'held' ? t('Unit {unit} is held for you. Complete payment to keep it.', { unit: pending.data.unit.unitNumber })
                : t('We’re finishing up unit {unit}.', { unit: pending.data.unit.unitNumber })}
            </Text>
            <Button title={pending.data.state === 'held' ? t('Continue to payment') : t('Continue')}
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
              <Text variant="title" color="onDk">{t('{amount} due', { amount: aed(owing) })}</Text>
              <Text variant="meta" color="onDk2">{due !== null && due >= 0 && due <= 14 ? (due === 1 ? t('Next payment in 1 day') : t('Next payment in {n} days', { n: due })) : t('See your invoices')}</Text>
            </View>
            <Text style={{ fontFamily: fonts.medium, color: c.ac }}>{t('Pay now')}</Text>
          </Pressable>
        ) : null}

        {profile.percent !== null && profile.percent < 100 ? (
          <Pressable onPress={() => router.push('/profile-complete')} accessibilityRole="button" accessibilityLabel={t('Complete your profile, {percent} percent done', { percent: profile.percent })}
            style={({ pressed }) => ({ backgroundColor: c.acSoft, borderRadius: radius.card, borderCurve: 'continuous', padding: 16, gap: 10, opacity: pressed ? 0.85 : 1 })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: fonts.medium, fontSize: 17, color: c.ink }}>{t('Complete your profile')}</Text>
              <Text style={{ fontFamily: fonts.medium, fontSize: 17, color: c.ink }}>{profile.percent}%</Text>
            </View>
            <Meter value={profile.percent / 100} color={c.br} height={8} />
            {nextStep ? <Text variant="meta" color="ink2">{t('Next: {title}', { title: nextStep.title })}</Text> : null}
          </Pressable>
        ) : null}

        {/* the big tile and three smaller ones */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row' }}>
            <Tile big height={118} title={contract ? t('Book another unit') : t('Book a unit')} bg={c.ac} ink={c.acInk} tint="rgba(255,255,255,0.45)"
              art={<BoxArt size={84} />} onPress={() => reserve()} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Tile title={t('Estimator')} bg={c.dk} ink="#FFFFFF" tint="rgba(255,255,255,0.10)" icon={Calculator} onPress={() => router.push('/estimator')} />
            <Tile title={t('Payments')} bg={c.acSoft} ink={c.ink} tint="rgba(248,212,92,0.55)" icon={CreditCard} onPress={() => router.navigate('/(tabs)/payments')} />
            <Tile title={t('My units')} bg={c.sf2} ink={c.ink} tint="rgba(38,38,38,0.08)" icon={Package} onPress={() => router.navigate('/(tabs)/storage')} />
          </View>
        </View>

        <ServiceStrip items={[
          { icon: LogOut, label: t('Check-out'), onPress: () => router.push('/checkout') },
          { icon: Undo2, label: t('Refund'), onPress: () => router.push('/refund') },
          { icon: IdCard, label: t('ID verify'), onPress: () => router.push('/id-upload') },
          { icon: FileText, label: t('Documents'), onPress: () => router.navigate({ pathname: '/(tabs)/storage', params: { tab: 'documents' } }) },
          { icon: Link2, label: t('I rent here'), onPress: () => router.push('/link-unit') },
          { icon: MessageCircle, label: t('Support'), onPress: () => Linking.openURL(WHATSAPP) },
        ]} />

        <View style={{ height: 1, backgroundColor: c.ln2, marginHorizontal: -16, marginVertical: 6 }} />

        <View>
          <SectionTitle title={t('Plan your move')} sub={t('Get ready before move-in day')} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <PlanCard art={<BoxArt size={60} />} title={t('Estimate your space')} sub={t('Add your items and we’ll suggest a size')} footer={t('Takes 1 minute')} onPress={() => router.push('/estimator')} />
            {contract ? (
              <PlanCard art={<LogOut color={c.ink} size={52} strokeWidth={1.2} />} title={t('Moving out?')} sub={t('Request check-out or extend your stay')} footer={t('Request')} onPress={() => router.push('/checkout')} />
            ) : (
              <PlanCard art={<IdCard color={c.ink} size={52} strokeWidth={1.2} />} title={t('Get your ID ready')} sub={t('Upload your Emirates ID or passport to book faster')} footer={t('Takes 2 minutes')} onPress={() => router.push('/id-upload')} />
            )}
          </View>
        </View>

        {units.length ? (
          <View>
            <SectionTitle title={t('Available units')} chip={bestDiscount > 0 ? t('Up to {pct}% off', { pct: bestDiscount }) : Number.isFinite(cheapest) ? t('From {amount}', { amount: aed(cheapest) }) : undefined} sub={t('Al Quoz, Dubai · move in from today')} />
            <Carousel>
              {units.map((u) => <UnitCard key={u.sizeSqf} u={u} priceText={aed(u.price)} onPress={() => reserve(u.sizeSqf)} />)}
            </Carousel>
          </View>
        ) : sizes.isLoading ? <Text color="ink2">{t('Checking available units…')}</Text> : null}

        <View>
          <SectionTitle title={t('See today’s deals')} />
          <Pressable onPress={() => reserve()} accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.card, borderCurve: 'continuous', borderWidth: 1.5, borderColor: c.ln2, backgroundColor: c.sf, padding: 14, opacity: pressed ? 0.8 : 1 })}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: c.acSoft, alignItems: 'center', justifyContent: 'center' }}>
              <MapPin color={c.ink} size={22} strokeWidth={1.6} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.regular, fontSize: 18, letterSpacing: -0.3, color: c.ink }}>{t('Near you (Al Quoz)')}</Text>
              <Text variant="meta">{t('{date} · 1 month · private unit', { date: shortDate(new Date().toISOString()) })}</Text>
            </View>
            <Text variant="h3" color="ink3">{isRTL ? '‹' : '›'}</Text>
          </Pressable>
        </View>

        {discounted.length ? (
          <View>
            <SectionTitle title={t('Deals for you')} />
            <Carousel>
              <DealCard icon={Star} title={t('First-month discount')} sub={t('Up to {pct}% off', { pct: bestDiscount })} cta={t('Claim')} onPress={() => reserve(discounted[0].sizeSqf)} />
              <DealCard icon={MessageCircle} title={t('Need several units?')} sub={t('Ask us for a custom quote')} cta={t('Chat')} onPress={() => Linking.openURL(WHATSAPP)} />
            </Carousel>
          </View>
        ) : null}

        {discounted.length ? (
          <View>
            <SectionTitle title={t('Special deals')} />
            <Carousel>
              {discounted.slice(0, 4).map((u) => (
                <PhotoBanner key={u.sizeSqf} img={u.img} title={t('{pct}% off your first month', { pct: u.discountPct ?? 0 })} sub={t('{size} sq ft unit · {home}', { size: u.sizeSqf, home: u.home ? t(u.home) : t('private unit') })} onPress={() => reserve(u.sizeSqf)} />
              ))}
            </Carousel>
          </View>
        ) : null}

        {contract && unit ? (
          <View>
            <SectionTitle title={t('Your unit')} />
            <Card style={{ gap: 18, paddingTop: 24 }}>
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Text variant="h2">{t('Unit {unit}', { unit: unit.unitNumber })}</Text>
                <Text variant="meta">{unit.sizeSqf ? `${t('{size} sq ft', { size: unit.sizeSqf })} · ` : ''}{contract.contractNo}</Text>
              </View>
              <Gauge value={progress} label={`${Math.round(progress * 100)}%`}
                caption={left !== null && left > 0 ? t('of your term · {n} days left', { n: left }) : t('of your term')} />
              <MetricPills items={[
                { label: t('Monthly'), value: aed(monthlyRate(contract)), tone: 'accent' },
                { label: t('Next payment'), value: shortDate(contract.nextPaymentDate), tone: 'dark' },
                { label: t('Check-out'), value: shortDate(contract.endDate), tone: 'hatch' },
              ]} />
              {due !== null && due <= 7 && due >= 0 ? <StatusChip tone="warn" label={due === 0 ? t('Due today') : due === 1 ? t('Due in 1 day') : t('Due in {n} days', { n: due })} /> : null}
            </Card>
          </View>
        ) : null}

        {requests.length ? (
          <Card style={{ gap: 4, paddingVertical: 14 }}>
            <Text variant="title">{t('Your requests')}</Text>
            {requests.map((r) => (
              <Row key={r.id} leading={<RowIcon icon={Clock} />} title={t(REQUEST_LABEL[r.kind])}
                sub={[t('Unit {unit}', { unit: r.unit }), r.detail, t('sent {date}', { date: shortDate(new Date(r.at).toISOString()) })].filter(Boolean).join(' · ')}
                right={<StatusChip label={t('Pending')} tone="warn" />} />
            ))}
          </Card>
        ) : null}
      </Page>
    </Screen>
  );
}
