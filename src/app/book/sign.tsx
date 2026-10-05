import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Calendar as CalendarIcon, FileText, KeyRound, Receipt } from 'lucide-react-native';
import {
  Banner, BannerText, Button, Card, Checkbox, ErrorState, Heading, Input, Progress, Screen, ScrollBody, SectionHead,
  SignaturePad, Skel, StickyFooter, Text, Tile, TopBar, toast, type IconType, type SignaturePadHandle,
} from '@/components';
import { fonts, radius, space } from '@/theme/tokens';
import { bookingApi } from '@/api/booking';
import { ApiError } from '@/api/client';
import { openDocument } from '@/api/storage';
import { useAuth } from '@/store/auth';
import { aed, aed2, hasRealName, shortDate } from '@/lib/format';

/**
 * Step 4 · Plain-language key terms, the full PDF one tap away, a finger signature, a tick,
 * Confirm. The drawn signature is sent as a PNG (signMode 'draw') with the typed full name;
 * if the drawing can't be captured on this device, the typed name alone is sent.
 */
export default function Sign() {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const customer = useAuth((s) => s.customer);
  const q = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingApi.get(id),
    refetchInterval: (query) => (query.state.data?.state === 'confirming' ? 2000 : false),
  });
  const b = q.data;
  const pad = useRef<SignaturePadHandle>(null);
  const [ink, setInk] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [agree, setAgree] = useState(false);
  const [name, setName] = useState(hasRealName(customer?.fullName) ? customer!.fullName : '');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (b && b.state !== 'ready_to_sign' && b.state !== 'confirming') router.replace({ pathname: '/book/status', params: { id } });
  }, [b, id, router]);

  const fullName = name.trim().replace(/\s+/g, ' ');
  const nameOk = hasRealName(fullName) && fullName.split(' ').length >= 2;

  const readAgreement = async () => {
    setOpening(true);
    try { await openDocument({ href: bookingApi.contractHref(id), title: b?.contractNo ?? 'Agreement' }); }
    catch { toast("Couldn't open the agreement — try again"); }
    finally { setOpening(false); }
  };

  const confirm = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const png = await pad.current?.toPng();
      try {
        if (png) await bookingApi.signDrawn(id, fullName, png);
        else await bookingApi.sign(id, fullName);
      } catch (e) {
        // A drawing the server won't take (too large) still lets the typed name sign.
        if (png && e instanceof ApiError && e.status === 413) await bookingApi.sign(id, fullName);
        else throw e;
      }
      await qc.invalidateQueries();
      router.replace({ pathname: '/book/status', params: { id } });
    } catch {
      setFailed(true);
    } finally { setBusy(false); }
  };

  const preparing = q.isLoading || b?.state === 'confirming';
  const advance = b?.pricing.lines.find((l) => /advance|deposit|refundable/i.test(l.label));
  const terms: [IconType, string][] = b ? [
    [Box, `Unit ${b.unit.unitNumber} · ${b.unit.sizeSqf} sqft${b.unit.floor ? ` · ${/floor/i.test(b.unit.floor) ? b.unit.floor : `floor ${b.unit.floor}`}` : ''}`],
    [CalendarIcon, `${shortDate(b.unit.startDate)} to ${shortDate(b.unit.endDate)}`],
    [Receipt, `${aed(b.unit.monthlyRate)} a month + VAT, billed every 4 weeks`],
    ...(advance ? [[KeyRound, `${aed2(advance.amount)} refundable advance, back after you move out`] as [IconType, string]] : []),
  ] : [];

  return (
    <Screen keyboard>
      <TopBar title="Sign agreement" />
      <ScrollBody scrollEnabled={!drawing}>
        <Progress value={1} />
        {preparing ? (
          <>
            <Heading title="Preparing your agreement…" lead="Your payment is in. This takes a few seconds." />
            <Skel h={240} r={18} />
          </>
        ) : !b ? (
          <ErrorState title="Couldn't load your agreement" body="Your payment is safe. Try again, or ask us on WhatsApp." onRetry={() => q.refetch()} error={q.error} />
        ) : (
          <>
            <Heading title="Sign your rental agreement" lead="The important bits, in plain words:" style={{ marginBottom: 14 }} />
            {failed ? (
              <Banner tone="error" style={{ marginBottom: space[3] }}>
                <BannerText bold="We couldn't save your signature.">It's still here — tap Confirm to try again. Your payment is safe.</BannerText>
              </Banner>
            ) : null}
            <Card style={{ gap: 10 }}>
              {terms.map(([I, t]) => (
                <View key={t} style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
                  <Tile icon={I} size={36} iconSize={18} />
                  <Text style={{ flex: 1 }}>{t}</Text>
                </View>
              ))}
              <Button block sm variant="secondary" icon={FileText} title="Read the full agreement" loading={opening} loadingTitle="Opening agreement…" onPress={readAgreement} style={{ marginTop: 6 }} />
            </Card>

            <SectionHead title="Your signature" action={ink ? { label: 'Clear', onPress: () => pad.current?.clear() } : undefined} />
            <SignaturePad ref={pad} onChange={setInk} onDrawingChange={setDrawing} />
            {!ink ? <Text variant="caption" tone="muted" style={{ marginTop: space[2] }}>Sign inside the box.</Text> : null}

            <Input
              label="Your full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              style={{ marginTop: space[5] }}
              help="As on your Emirates ID. It's printed under your signature."
              error={name && !nameOk ? 'Please add your first and last name.' : null}
            />
            <View style={{ marginTop: space[3], borderRadius: radius.md }}>
              <Checkbox checked={agree} onChange={setAgree}>
                <Text>
                  I've read and agree to the rental agreement{nameOk ? ', signed as ' : '.'}
                  {nameOk ? <Text style={{ fontFamily: fonts.bold }}>{fullName}.</Text> : null}
                </Text>
              </Checkbox>
            </View>
          </>
        )}
      </ScrollBody>
      {b && !preparing ? (
        <StickyFooter hint={!ink ? 'Sign inside the box to continue' : !agree ? 'Tick the box to agree' : undefined}>
          <Button block title="Confirm and sign" loading={busy} loadingTitle="Signing…" disabled={!ink || !agree || !nameOk} onPress={confirm} />
        </StickyFooter>
      ) : null}
    </Screen>
  );
}
