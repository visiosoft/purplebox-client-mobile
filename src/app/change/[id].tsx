import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar as CalendarIcon, Clock, CreditCard, DoorOpen, KeyRound, Receipt } from 'lucide-react-native';
import {
  Banner, BannerText, BottomSheet, Button, Calendar, Card, DetailSkeleton, ErrorState, Heading, KVCard, Screen, ScrollBody,
  SectionHead, Segmented, StickyFooter, SuccessCheck, SuggestionChip, Text, Tile, TopBar, unitNumbers,
} from '@/components';
import type { IconType } from '@/components';
import { useTheme } from '@/theme/useTheme';
import { fonts, space } from '@/theme/tokens';
import { storageApi, type Contract } from '@/api/storage';
import { ApiError } from '@/api/client';
import { aed, aed2, addDays, daysUntil, fromIsoDay, isoDay, monthlyRate, shortDate, startOfToday } from '@/lib/format';

type Mode = 'extend' | 'end';

function RadioRow({ on, onPress, icon, title, sub }: { on: boolean; onPress: () => void; icon: IconType; title: string; sub: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: 14, paddingHorizontal: space[4], minHeight: 60,
        borderRadius: 18, borderWidth: on ? 2 : 1.5, borderColor: on ? c.brand500 : c.line, backgroundColor: on ? c.brand100 : c.surfaceCard,
      }}
    >
      <Tile icon={icon} size={40} bg={on ? c.surfaceCard : undefined} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 }}>{title}</Text>
        <Text variant="caption" tone="muted" style={{ fontFamily: fonts.regular }}>{sub}</Text>
      </View>
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: on ? 7 : 2, borderColor: on ? c.brand500 : c.lineStrong }} />
    </Pressable>
  );
}

function Step({ n, children }: { n: number; children: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'flex-start' }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.brand100, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.extrabold, color: c.brand500 }}>{n}</Text>
      </View>
      <Text style={{ flex: 1, paddingTop: 3 }}>{children}</Text>
    </View>
  );
}

const extendedEnd = (k: Contract, months: number) => { const d = new Date(k.endDate); d.setMonth(d.getMonth() + months); return d; };

/** Plain summary before anything is committed: extend 6 or 12 months, or move out early. */
export default function ChangeOrEnd() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { c } = useTheme();
  const q = useQuery({
    queryKey: ['contract', id],
    queryFn: () => storageApi.contract(id),
    initialData: () => qc.getQueryData<Contract[]>(['contracts'])?.find((x) => x.id === id),
  });
  const k = q.data;
  const [mode, setMode] = useState<Mode>('end');
  const [months, setMonths] = useState<6 | 12>(6);
  const [when, setWhen] = useState<'term' | 'early'>('term');
  const [day, setDay] = useState(isoDay(addDays(startOfToday(), 30)));
  const [confirming, setConfirming] = useState(false);

  const endDay = k ? fromIsoDay(isoDay(new Date(k.endDate))) : startOfToday();
  const today = startOfToday();
  const earlyMax = endDay < today ? today : endDay;
  const lastDay = when === 'term' ? endDay : fromIsoDay(day > isoDay(earlyMax) ? isoDay(earlyMax) : day);
  const notice = daysUntil(isoDay(lastDay)) ?? 0;

  const change = useMutation({
    mutationFn: () => (mode === 'extend'
      ? storageApi.checkoutChange(id, { action: 'extend', months })
      : storageApi.checkoutChange(id, { action: 'move_out_early', date: isoDay(lastDay) })),
    onSuccess: () => { setConfirming(false); qc.invalidateQueries({ queryKey: ['contract', id] }); },
    onError: () => setConfirming(false),
  });

  const errorBanner = change.error ? (
    change.error instanceof ApiError && change.error.status === 409 ? (
      <Banner tone="warn" style={{ marginBottom: space[4] }}>
        <BannerText bold="You already have a request waiting.">We'll confirm it on WhatsApp. Nothing new was sent.</BannerText>
      </Banner>
    ) : (
      <Banner tone="error" style={{ marginBottom: space[4] }}>
        <BannerText bold="We couldn't send your request.">{change.error.message}. Nothing has changed — try again.</BannerText>
      </Banner>
    )
  ) : null;

  if (change.isSuccess && k) {
    const ended = mode === 'end';
    return (
      <Screen>
        <ScrollBody contentStyle={{ paddingTop: space[10] }}>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <SuccessCheck />
            <Text variant="title1" accessibilityRole="header" style={{ marginTop: 10, textAlign: 'center' }}>{ended ? 'Move-out requested' : 'Extension requested'}</Text>
            <Text variant="bodyLg" tone="muted" style={{ textAlign: 'center' }}>We'll confirm on WhatsApp today.</Text>
          </View>
          <KVCard style={{ marginTop: 18 }} rows={ended ? [
            { label: 'Unit', value: unitNumbers(k) },
            { label: 'Last day', value: shortDate(lastDay) },
            k.deposit > 0 ? { label: 'Advance back', value: aed2(k.deposit) } : null,
          ] : [
            { label: 'Unit', value: unitNumbers(k) },
            { label: 'New end date', value: shortDate(extendedEnd(k, months)) },
            { label: 'Monthly', value: `${aed(monthlyRate(k))} + VAT` },
          ]} />
          <SectionHead title="Next" />
          <View style={{ gap: 14 }}>
            {ended ? (
              <>
                <Step n={1}>We check your request and confirm your last day on WhatsApp.</Step>
                <Step n={2}>Empty the unit and hand your lock back at reception.</Step>
                <Step n={3}>We check the unit, then return your advance.</Step>
              </>
            ) : (
              <>
                <Step n={1}>We check your request and confirm on WhatsApp.</Step>
                <Step n={2}>Your new end date shows here once it's approved.</Step>
                <Step n={3}>Rent carries on as usual — nothing to do in between.</Step>
              </>
            )}
          </View>
        </ScrollBody>
        <StickyFooter>
          <Button block title="Done" onPress={() => router.replace('/(tabs)')} />
        </StickyFooter>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title={k ? `Unit ${unitNumbers(k)}` : ''} />
      <ScrollBody>
        {q.isLoading ? <DetailSkeleton /> : !k ? (
          <ErrorState title="Couldn't open this unit" body="Try again, or message us and we'll sort it out." onRetry={() => q.refetch()} error={q.error} />
        ) : (
          <>
            <View style={{ marginTop: 6, marginBottom: 20 }}>
              <Segmented<Mode> value={mode} onChange={(m) => { setMode(m); change.reset(); }} options={[{ value: 'end', label: 'End rental' }, { value: 'extend', label: 'Extend' }]} />
            </View>
            {errorBanner}
            {mode === 'extend' ? (
              <>
                <Heading title="Extend your rental" lead="Same unit, same monthly price." />
                <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: space[2] }}>
                  {([6, 12] as const).map((m) => (
                    <SuggestionChip key={m} radio label={`+${m} months`} selected={months === m} onPress={() => setMonths(m)} />
                  ))}
                </View>
                <KVCard style={{ marginTop: space[4] }} rows={[
                  { label: 'Ends now', value: shortDate(k.endDate) },
                  { label: 'New end date', value: shortDate(extendedEnd(k, months)) },
                  { label: 'Monthly', value: `${aed(monthlyRate(k))} + VAT` },
                ]} />
              </>
            ) : (
              <>
                <Heading title="When are you leaving?" />
                <View accessibilityRole="radiogroup" style={{ gap: space[3] }}>
                  <RadioRow on={when === 'term'} onPress={() => setWhen('term')} icon={CalendarIcon} title="End of term" sub={`${shortDate(endDay)} · when your agreement ends`} />
                  <RadioRow on={when === 'early'} onPress={() => setWhen('early')} icon={Clock} title="Earlier" sub="Pick a day before your agreement ends" />
                </View>
                {when === 'early' ? (
                  <Card style={{ marginTop: space[3], padding: space[4] }}>
                    <Calendar value={isoDay(lastDay)} onChange={setDay} min={today} max={earlyMax} />
                  </Card>
                ) : null}
                {notice < 30 ? (
                  <Banner tone="warn" style={{ marginTop: space[3] }}>
                    <BannerText bold="That's less than 30 days away.">Leaving at short notice can cost extra. We'll tell you the exact amount on WhatsApp before anything is charged.</BannerText>
                  </Banner>
                ) : null}
                <SectionHead title="Here's what happens" />
                <Card style={{ gap: space[4] }}>
                  {[
                    [DoorOpen, 'Your last day', shortDate(lastDay)],
                    [Receipt, 'Final payment', 'We confirm any final amount on WhatsApp before charging'],
                    [CreditCard, 'Advance back', k.deposit > 0 ? `${aed2(k.deposit)}, after we check the unit` : 'After we check the unit'],
                    [KeyRound, 'Before you go', 'Empty the unit and hand your lock back at reception'],
                  ].map(([I, t, v]) => (
                    <View key={t as string} style={{ flexDirection: 'row', gap: space[3] }}>
                      <Tile icon={I as IconType} size={40} />
                      <View style={{ flex: 1 }}>
                        <Text variant="caption" tone="muted" style={{ fontFamily: fonts.semibold }}>{t as string}</Text>
                        <Text style={{ fontFamily: fonts.bold, color: c.ink }}>{v as string}</Text>
                      </View>
                    </View>
                  ))}
                </Card>
              </>
            )}
          </>
        )}
      </ScrollBody>
      {k ? (
        <StickyFooter>
          {mode === 'extend' ? (
            <Button block title={`Extend to ${shortDate(extendedEnd(k, months))}`} loading={change.isPending} loadingTitle="Sending request" onPress={() => change.mutate()} />
          ) : (
            <Button block title="Request move-out" onPress={() => { change.reset(); setConfirming(true); }} />
          )}
        </StickyFooter>
      ) : null}

      <BottomSheet visible={confirming} onClose={() => setConfirming(false)} locked={change.isPending} title="End your rental?">
        <Text tone="muted" style={{ marginTop: 6, marginBottom: space[4] }}>
          Your last day will be <Text style={{ fontFamily: fonts.bold }}>{shortDate(lastDay)}</Text>. We'll confirm everything on WhatsApp.
        </Text>
        <View style={{ gap: space[2] }}>
          <Button block variant="danger" title="Yes, end my rental" loading={change.isPending} loadingTitle="Sending request" onPress={() => change.mutate()} />
          <Button block variant="ghost" title="Keep my unit" onPress={() => setConfirming(false)} disabled={change.isPending} />
        </View>
      </BottomSheet>
    </Screen>
  );
}
