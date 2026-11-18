import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, CircleX, CreditCard, MessageCircle, Phone } from 'lucide-react-native';
import { Avatar, Button, Card, IconButton, Screen, Text, TopBar } from '@/components/ui';
import { Page } from '@/components/bits';
import { Code, IconTile, ItemRow, RequestStatus, SERVICE_ICON, knownService } from '@/components/service';
import { serviceLabel, servicesApi, statusLabel, whenLabel, type ServiceStatus } from '@/api/services';
import { payInApp } from '@/lib/payInApp';
import { aed } from '@/lib/format';
import { WHATSAPP } from '@/lib/contact';
import { dateLocale, useI18n } from '@/i18n';
import { useTheme } from '@/theme/useTheme';

const FLOW: ServiceStatus[] = ['requested', 'confirmed', 'scheduled', 'in_progress', 'completed'];
const stamp = (iso: string) => new Date(iso).toLocaleString(dateLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const clock = (iso: string) => new Date(iso).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });
// Right after paying, Stripe's webhook has to reach the server before the request moves on; look often, but not forever.
const PAYING_POLL_MS = 3 * 60 * 1000;

export default function TrackRequest() {
  const router = useRouter();
  const qc = useQueryClient();
  const { c } = useTheme();
  const { t } = useI18n();
  // ?pay=1: just booked from the wizard, so open the payment straight away.
  const { id, pay: payParam } = useLocalSearchParams<{ id: string; pay?: string }>();
  const [watching, setWatching] = useState(false);
  useEffect(() => {
    if (!watching) return;
    const timer = setTimeout(() => setWatching(false), PAYING_POLL_MS);
    return () => clearTimeout(timer);
  }, [watching]);

  // While a job is moving, keep the status fresh without the customer pulling.
  const q = useQuery({
    queryKey: ['service', id], queryFn: () => servicesApi.get(id),
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      if (s === 'awaiting_payment' && watching) return 2000;
      return s === 'in_progress' ? 30_000 : false;
    },
  });
  const r = q.data;
  const pay = r?.payment;
  const awaiting = r?.status === 'awaiting_payment';

  const refresh = () => ['services', 'items'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const bill = r?.invoice;
  const owed = !!bill && bill.balanceDue > 0;

  // The job's invoice is an ordinary invoice, paid the same way as rent; the webhook settles it on the server.
  const payBill = useMutation({
    mutationFn: () => payInApp({ kind: 'invoice', id: bill!.payId ?? bill!.id, label: t('Pay {amount}', { amount: aed(bill!.balanceDue) }) }),
    onSuccess: () => ['service', 'billing', 'invoices', 'payments', 'home'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
    onError: (e: Error) => Alert.alert(t('Payment'), e.message),
  });

  const payNow = useMutation({
    mutationFn: () => payInApp({ kind: 'service', id, label: pay ? t('Pay {amount}', { amount: aed(pay.amount) }) : undefined }),
    // Whichever way it went (sheet paid, or Stripe's page opened), look often for the webhook's result for a while.
    onSuccess: (res) => { if (res !== 'canceled') { setWatching(true); q.refetch(); } },
    onError: (e: Error) => Alert.alert(t('Payment'), e.message),
  });

  const cancel = useMutation({
    mutationFn: () => servicesApi.cancel(id),
    onSuccess: ({ request }) => { qc.setQueryData(['service', id], request); refresh(); },
    onError: (e: Error) => Alert.alert(t('Could not cancel'), e.message),
  });
  const confirmCancel = () => Alert.alert(
    t('Cancel this request?'),
    pay?.state === 'paid'
      ? t('You’ll be refunded {amount} to the card you paid with.', { amount: aed(pay.totalCharged ?? pay.amount + pay.cardFee) })
      : awaiting ? t('Nothing has been charged.') : t('There’s no charge if you cancel more than 12 hours before the booked time.'),
    [{ text: t('Keep it'), style: 'cancel' }, { text: t('Cancel request'), style: 'destructive', onPress: () => cancel.mutate() }],
  );

  const started = useRef(false);
  useEffect(() => {
    if (payParam === '1' && !started.current) { started.current = true; payNow.mutate(); }
  }, [payParam, payNow]);

  const at = (s: ServiceStatus) => r?.statusLog.find((l) => l.status === s)?.at;
  const reached = r ? FLOW.indexOf(r.status) : -1;
  const cancellable = r && ['awaiting_payment', 'requested', 'confirmed', 'scheduled'].includes(r.status);

  return (
    <Screen>
      <TopBar title={r ? (knownService(r.type) ? serviceLabel(r.type) : t('Service')) : t('Request')} />
      <Page loading={q.isLoading} error={q.error?.message} refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
        {r ? (
          <>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <IconTile icon={SERVICE_ICON[r.type]} />
              <View style={{ flex: 1, gap: 3 }}>
                <Code>{r.ref}</Code>
                <Text variant="title" style={{ fontSize: 15 }}>{whenLabel(r)}</Text>
              </View>
              <RequestStatus status={r.status} />
            </Card>

            {awaiting && pay ? (
              <Card style={{ gap: 12 }}>
                <Text variant="h3">{t('Pay to book this delivery')}</Text>
                <Text color="ink2">
                  {pay.expiresAt
                    ? t('We’re holding your time slot until {time}. If it isn’t paid by then, the request is cancelled.', { time: clock(pay.expiresAt) })
                    : t('Your time slot is held while you pay.')}
                </Text>
                {watching ? <Text variant="meta">{t('If you’ve just paid, this updates in a moment.')}</Text> : null}
                <Button title={t('Pay {amount}', { amount: aed(pay.amount) })} icon={CreditCard} loading={payNow.isPending} onPress={() => payNow.mutate()} />
              </Card>
            ) : null}

            {pay?.state === 'paid' ? (
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: c.okBg, borderRadius: 18, padding: 14 }}>
                <CircleCheck color={c.ok} size={20} strokeWidth={1.8} />
                <Text style={{ flex: 1 }}>{t('Paid {amount}', { amount: aed(pay.totalCharged ?? pay.amount + pay.cardFee) })}{pay.paidAt ? ` · ${stamp(pay.paidAt)}` : ''}</Text>
              </View>
            ) : null}

            {bill ? (
              <Card style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <View style={{ gap: 2, flex: 1 }}>
                    <Text variant="meta">{t('Invoice')}</Text>
                    <Code>{bill.invoiceNo}</Code>
                  </View>
                  <Text variant="h3">{aed(owed ? bill.balanceDue : bill.total)}</Text>
                </View>
                {owed ? (
                  <Button title={t('Pay {amount}', { amount: aed(bill.balanceDue) })} icon={CreditCard} loading={payBill.isPending} onPress={() => payBill.mutate()} />
                ) : (
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <CircleCheck color={c.ok} size={18} strokeWidth={1.8} />
                    <Text color="ink2">{t('Paid — thank you.')}</Text>
                  </View>
                )}
              </Card>
            ) : null}

            {r.status === 'cancelled' ? (
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: c.errBg, borderRadius: 18, padding: 14 }}>
                <CircleX color={c.err} size={20} strokeWidth={1.8} />
                <Text style={{ color: c.err, flex: 1 }}>
                  {pay?.state === 'expired'
                    ? t('This request was cancelled because it wasn’t paid in time.')
                    : at('cancelled') ? t('This request was cancelled on {date}.', { date: stamp(at('cancelled')!) }) : t('This request was cancelled.')}
                  {pay?.state === 'refunded' ? ` ${t('Your payment has been refunded.')}` : ''}
                </Text>
              </View>
            ) : null}

            {r.driver && r.status === 'in_progress' ? (
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={r.driver.name} size={44} />
                <View style={{ flex: 1 }}>
                  <Text variant="title" style={{ fontSize: 15 }}>{r.driver.name}</Text>
                  <Text variant="meta">{t('On the way')}</Text>
                </View>
                {r.driver.phone ? (
                  <>
                    <IconButton icon={MessageCircle} label={t('Message driver')} onPress={() => Linking.openURL(`https://wa.me/${r.driver!.phone!.replace(/\D/g, '')}`)} />
                    <IconButton icon={Phone} label={t('Call driver')} tone="accent" onPress={() => Linking.openURL(`tel:${r.driver!.phone}`)} />
                  </>
                ) : null}
              </Card>
            ) : null}

            {r.status !== 'cancelled' && !awaiting ? (
              <Card style={{ gap: 0 }}>
                {FLOW.map((s, i) => {
                  const done = i < reached || r.status === 'completed';
                  const current = i === reached && r.status !== 'completed';
                  return (
                    <View key={s} style={{ flexDirection: 'row', gap: 14 }}>
                      <View style={{ alignItems: 'center', width: 22 }}>
                        <View style={{
                          width: 14, height: 14, borderRadius: 7, marginTop: 4,
                          backgroundColor: current ? c.warn : done ? c.ok : 'transparent',
                          borderWidth: done || current ? 0 : 1.5, borderColor: c.ln2,
                          ...(current ? { shadowColor: c.warn, shadowOpacity: 0.5, shadowRadius: 5, elevation: 3 } : {}),
                        }} />
                        {i < FLOW.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 26, backgroundColor: done ? c.ok : c.ln }} /> : null}
                      </View>
                      <View style={{ flex: 1, paddingBottom: 16, gap: 2 }}>
                        <Text variant="title" style={{ fontSize: 15, opacity: done || current ? 1 : 0.5 }}>{statusLabel(s)}</Text>
                        {at(s) ? <Text variant="meta">{stamp(at(s)!)}</Text> : null}
                      </View>
                    </View>
                  );
                })}
              </Card>
            ) : null}

            <Card style={{ gap: 12 }}>
              <Detail k={r.type === 'worker' ? t('Where') : t('Address')} v={`${r.address.label} · ${r.address.line}`} />
              {r.supplies ? <Detail k={t('Boxes & labels')} v={r.supplies.extraLabels ? t('{boxes} boxes, {labels} extra labels', { boxes: r.supplies.boxes, labels: r.supplies.extraLabels }) : t('{boxes} boxes', { boxes: r.supplies.boxes })} /> : null}
              {r.pickup ? <Detail k={t('Collecting')} v={`${t('{boxes} boxes, {bulky} bulky', { boxes: r.pickup.boxes, bulky: r.pickup.bulky })}${r.pickup.description ? ` · ${r.pickup.description}` : ''}`} /> : null}
              {r.type === 'worker' && r.workers ? <Detail k={t('Workers')} v={t('{n} · {h} h', { n: r.workers, h: r.hours ?? 0 })} /> : null}
              {r.job ? <Detail k={t('Job')} v={r.job} /> : null}
              {r.disposal ? <Detail k={t('Taking away')} v={`${r.disposal.load === 'large' ? t('Full truck') : t('Small load')} · ${r.disposal.description}`} /> : null}
              {r.notes ? <Detail k={t('Instructions')} v={r.notes} /> : null}
              {pay ? (
                <Detail k={pay.state === 'paid' || pay.state === 'refunded' ? t('Price') : t('To pay')} v={aed(pay.amount)} />
              ) : (
                <Detail k={r.charged != null ? t('Charged') : t('Estimate')} v={aed(r.charged ?? r.estimate.total)} />
              )}
            </Card>

            {r.items.length ? (
              <Card style={{ paddingVertical: 8 }}>
                <Text variant="title" style={{ paddingTop: 6 }}>{t('Items ({n})', { n: r.items.length })}</Text>
                {r.items.map((i) => (
                  <ItemRow key={i.id} selectable={false} onPress={() => router.push({ pathname: '/item/[id]', params: { id: i.id } })}
                    item={{ id: i.id, label: i.label, name: i.name, category: '', status: i.status ?? 'scheduled', hasPhoto: false, dims: null }} />
                ))}
              </Card>
            ) : null}

            {cancellable ? <Button title={t('Cancel request')} variant="soft" loading={cancel.isPending} onPress={confirmCancel} /> : null}
            <Button title={t('Contact support')} variant="ghost" icon={MessageCircle}
              onPress={() => Linking.openURL(`${WHATSAPP}?text=${encodeURIComponent(`Hi PurpleBox, about my request ${r.ref}: `)}`)} />
          </>
        ) : null}
      </Page>
    </Screen>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="meta">{k}</Text>
      <Text>{v}</Text>
    </View>
  );
}
