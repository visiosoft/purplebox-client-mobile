import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleCheck, Info, MapPin, Plus, Warehouse } from 'lucide-react-native';
import { Button, Card, Input, Screen, Text, TopBar } from '@/components/ui';
import { Skeleton } from '@/components/bits';
import { Calendar } from '@/components/Calendar';
import { ChoiceCard, Chip, Code, ItemRow, SERVICE_ICON, Stepper } from '@/components/service';
import {
  PAID_AT_BOOKING, dayLabel, workerSub, durationLabel, estimate, serviceLabel, servicesApi, statusLabel,
  type DisposalLoad, type NewRequest, type ServiceRequest, type ServiceType,
} from '@/api/services';
import { ApiError } from '@/api/client';
import { aed } from '@/lib/format';
import { useTheme } from '@/theme/useTheme';
import { tr, useI18n } from '@/i18n';
import { radius } from '@/theme/tokens';

const STEP_NAMES = ['Service', 'Details', 'When & where', 'Review'];
const TYPES: ServiceType[] = ['supplies', 'pickup', 'dropoff', 'both', 'worker', 'disposal'];
const DAY = 86_400_000;
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const toTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/**
 * Booking a service in four steps: what, which items, when and where, review.
 * Deliveries are paid on the spot (the request opens on its tracking screen, which starts the payment); everything
 * else is charged after the job.
 * Opening with ?type=dropoff&items=a,b (from Storage › Items) starts on step 2
 * with those items ticked.
 */
export default function NewServiceRequest() {
  const router = useRouter();
  const qc = useQueryClient();
  const { c } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type?: string; items?: string }>();
  const preset = TYPES.includes(params.type as ServiceType) ? (params.type as ServiceType) : null;

  const [step, setStep] = useState(preset ? 1 : 0);
  const [type, setType] = useState<ServiceType | null>(preset);
  const [boxes, setBoxes] = useState(0);
  const [bulky, setBulky] = useState(0);
  const [description, setDescription] = useState('');
  const [supplyBoxes, setSupplyBoxes] = useState(10);
  const [extraLabels, setExtraLabels] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(params.items ? params.items.split(',') : []));
  const [job, setJob] = useState('');
  const [addressId, setAddressId] = useState<string | 'new' | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newLine, setNewLine] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [hours, setHours] = useState(1);
  const [workers, setWorkers] = useState(1);
  const [load, setLoad] = useState<DisposalLoad | null>(null);
  const [rubbish, setRubbish] = useState('');
  const [start, setStart] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState<ServiceRequest | null>(null);
  // Bookable from tomorrow, up to 60 days out — fixed when the screen opens.
  const [range] = useState(() => ({ min: new Date(Date.now() + DAY), max: new Date(Date.now() + 60 * DAY) }));

  const catalog = useQuery({ queryKey: ['service-catalog'], queryFn: servicesApi.catalog, staleTime: 10 * 60_000 });
  const addresses = useQuery({ queryKey: ['addresses'], queryFn: servicesApi.addresses });
  const needsItems = type === 'dropoff' || type === 'both';
  const items = useQuery({ queryKey: ['items'], queryFn: () => servicesApi.items(), enabled: needsItems });
  const worker = type === 'worker';
  const disposal = type === 'disposal';
  const avail = useQuery({
    queryKey: ['availability', type, date, worker ? hours : 0, worker ? workers : 0],
    queryFn: () => servicesApi.availability(type!, date!, worker ? { hours, workers } : undefined),
    enabled: !!type && !!date,
  });

  const cat = catalog.data;
  // Deliveries are for valet customers (we hold their labelled items). An older server sends no flag: offer as before.
  const valet = cat?.valet?.active ?? true;
  const payNow = !!type && PAID_AT_BOOKING.includes(type);
  const stored = (items.data ?? []).filter((i) => i.status === 'stored');
  const chosenSlot = cat?.slots.find((s) => s.id === slot);
  const est = cat && type ? estimate(cat.prices, {
    type, boxes, bulky, items: picked.size, supplyBoxes, evening: !!chosenSlot?.evening, hours, workers, load,
  }) : null;
  const endTime = start ? toTime(toMin(start) + hours * 60) : null;
  const savedAddress = addresses.data?.find((a) => a.id === addressId);
  // A dump truck can clear the customer's own unit — offered when they have one.
  const hasUnit = !!cat?.facility.line.startsWith('Unit ');
  const address = worker || addressId === 'unit' ? cat?.facility : addressId === 'new' ? { label: newLabel.trim(), line: newLine.trim() } : savedAddress;

  // What's missing on each step, in the customer's words. The button stays live and says it.
  const problem = (() => {
    if (step === 0) return type ? null : t('Choose a service');
    if (step === 1) {
      if (type === 'supplies' && supplyBoxes < 1) return t('Add at least one box');
      if ((type === 'pickup' || type === 'both') && boxes + bulky < 1) return t('Tell us how many things to collect');
      if (needsItems && picked.size < 1) return t('Pick the items to deliver');
      if (worker && job.trim().length < 3) return t('Describe what you need help with');
      if (disposal && !load) return t('Choose how big the load is');
      if (disposal && rubbish.trim().length < 3) return t('Tell us what we’re taking away');
      return null;
    }
    if (step === 2) {
      if (!worker && !address) return t('Choose an address');
      if (!worker && addressId === 'new' && (newLabel.trim().length < 1 || newLine.trim().length < 5)) return t('Enter a name and the full address');
      if (!date) return t('Pick a date');
      if (worker ? !start : !slot) return worker ? t('Pick a start time') : t('Pick an arrival window');
      return null;
    }
    return null;
  })();

  const submit = useMutation({
    mutationFn: () => {
      const body: NewRequest = { type: type!, date: date!, notes: notes.trim() || undefined };
      if (worker) Object.assign(body, { startTime: start!, hours, workers, job: job.trim() });
      else {
        body.slot = slot!;
        if (addressId === 'unit') body.fromUnit = true;
        else if (addressId === 'new') body.address = { label: newLabel.trim(), line: newLine.trim() };
        else body.addressId = addressId!;
      }
      if (disposal) body.disposal = { load: load!, description: rubbish.trim() };
      if (type === 'pickup' || type === 'both') body.pickup = { boxes, bulky, description: description.trim() || undefined };
      if (needsItems) body.items = [...picked];
      if (type === 'supplies') body.supplies = { boxes: supplyBoxes, extraLabels };
      return servicesApi.create(body);
    },
    onSuccess: ({ request }) => {
      ['services', 'items', 'addresses'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      // A delivery isn't booked until it's paid: its tracking screen opens the payment and follows it from there.
      if (request.status === 'awaiting_payment') router.replace({ pathname: '/service/[id]', params: { id: request.id, pay: '1' } });
      else setDone(request);
    },
    onError: (e: Error) => {
      // A slot can fill while someone is on the review step; send them back to pick another.
      if (e instanceof ApiError && /full|available|booked/i.test(e.message)) {
        qc.invalidateQueries({ queryKey: ['availability'] });
        setSlot(null); setStart(null); setStep(2);
      }
      Alert.alert(t('Could not send request'), e.message);
    },
  });

  const next = () => {
    if (problem) return Alert.alert(problem);
    if (step < 3) setStep(step + 1);
    else submit.mutate();
  };
  const back = () => (step > (preset ? 1 : 0) ? setStep(step - 1) : router.back());
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  if (done) return <Success r={done} onTrack={() => router.replace({ pathname: '/service/[id]', params: { id: done.id } })} onHome={() => router.dismissTo('/(tabs)')} />;

  return (
    <Screen>
      <TopBar onBack={back} />
      <View style={{ gap: 8, marginBottom: 6 }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: c.sf3, overflow: 'hidden' }}>
          <View style={{ width: `${((step + 1) / 4) * 100}%`, height: 6, borderRadius: 3, backgroundColor: c.br }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="meta">{t('Step {n} of 4', { n: step + 1 })}</Text>
          <Text variant="meta">{t(STEP_NAMES[step])}</Text>
        </View>
      </View>

      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 14, paddingTop: 8, paddingBottom: 24 }}>
        {catalog.error ? (
          <Card style={{ gap: 12 }}>
            <Text variant="h3">{t('Booking isn’t available right now')}</Text>
            <Text color="ink2">{catalog.error.message}</Text>
            <Button title={t('Try again')} variant="soft" loading={catalog.isFetching} onPress={() => catalog.refetch()} />
          </Card>
        ) : !cat ? <Skeleton height={300} /> : step === 0 ? (
          <>
            <Text variant="h2">{t('What do you need?')}</Text>
            {cat.services.filter((s) => TYPES.includes(s.type) && (valet || !PAID_AT_BOOKING.includes(s.type))).map((s) => (
              <ChoiceCard key={s.type} icon={SERVICE_ICON[s.type]} title={tr(s.title)}
                sub={s.type === 'worker' ? workerSub(cat.prices) : t('{sub} · from {price}', { sub: tr(s.sub), price: aed(s.from) })} on={type === s.type} onPress={() => setType(s.type)} />
            ))}
          </>
        ) : step === 1 ? (
          <>
            {type === 'supplies' ? (
              <>
                <Text variant="h2">{t('Boxes & labels')}</Text>
                <Text color="ink2">{t('We bring flat-packed boxes and a label for each. Pack, stick a label on every box or item, and book a pickup when you’re ready.')}</Text>
                <Card style={{ gap: 4, paddingVertical: 8 }}>
                  <CountRow title={t('Packing boxes')} sub={t('{price} each · label included', { price: aed(cat.prices.supplyBox) })} value={supplyBoxes} onChange={setSupplyBoxes} min={1} />
                  <View style={{ height: 1, backgroundColor: c.ln }} />
                  <CountRow title={t('Extra labels')} sub={t('For furniture, bags and loose items · free')} value={extraLabels} onChange={setExtraLabels} />
                </Card>
              </>
            ) : null}
            {type === 'pickup' || type === 'both' ? (
              <>
                <Text variant="h2">{t('What should we collect?')}</Text>
                <Card style={{ gap: 4, paddingVertical: 8 }}>
                  <CountRow title={t('Boxes & cartons')} sub={t('{price} each', { price: aed(cat.prices.box) })} value={boxes} onChange={setBoxes} />
                  <View style={{ height: 1, backgroundColor: c.ln }} />
                  <CountRow title={t('Furniture & bulky')} sub={t('{price} each', { price: aed(cat.prices.bulky) })} value={bulky} onChange={setBulky} />
                </Card>
                <Input placeholder={t('Short description, e.g. 15 cartons of stock')} value={description} onChangeText={setDescription} maxLength={300} />
                <Note text={t('Every box and item needs one of our labels — order Boxes & labels first if you don’t have them.')} />
              </>
            ) : null}
            {needsItems ? (
              <>
                <Text variant="h2" style={{ marginTop: type === 'both' ? 10 : 0 }}>{t('Which items should we deliver?')}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="meta" color="ink">{t('{n} selected', { n: picked.size })}</Text>
                  {stored.length ? (
                    <Text variant="meta" color="ink" style={{ textDecorationLine: 'underline' }} onPress={() => setPicked(picked.size === stored.length ? new Set() : new Set(stored.map((i) => i.id)))}>
                      {picked.size === stored.length ? t('Clear') : t('Select all')}
                    </Text>
                  ) : null}
                </View>
                {items.isLoading ? <Skeleton height={200} /> : stored.length === 0 ? (
                  <Card><Text color="ink2">{t('Nothing in storage yet. Items appear here once we’ve collected and checked them in.')}</Text></Card>
                ) : (
                  <Card style={{ paddingVertical: 4 }}>
                    {stored.map((i) => <ItemRow key={i.id} item={i} selected={picked.has(i.id)} onToggle={() => toggle(i.id)} onPress={() => toggle(i.id)} />)}
                  </Card>
                )}
              </>
            ) : null}
            {disposal ? (
              <>
                <Text variant="h2">{t('What should we take away?')}</Text>
                {cat.disposal.map((l) => (
                  <ChoiceCard key={l.id} title={tr(l.label)} sub={`${tr(l.sub)} · ${aed(l.price)}`} on={load === l.id} onPress={() => setLoad(l.id)} />
                ))}
                <Input label={t('What is it?')} multiline placeholder={t('e.g. An old sofa, a broken fridge and 10 bags')} value={rubbish} onChangeText={setRubbish} maxLength={1000} />
                <Note text={t('We take it to an approved disposal site. Not for hazardous waste, paint or chemicals.')} />
              </>
            ) : null}
            {worker ? (
              <>
                <Text variant="h2">{t('What do you need help with?')}</Text>
                <View style={{ alignSelf: 'flex-start', backgroundColor: c.acSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text variant="meta" color="ink">{t('{price} per hour per worker · up to {n} hours', { price: aed(cat.prices.workerHourly), n: cat.worker.maxHours })}</Text>
                </View>
                <Input label={t('Describe the job')} multiline placeholder={t('e.g. Load 20 boxes from my car into the unit')} value={job} onChangeText={setJob} maxLength={1000} />
              </>
            ) : null}
          </>
        ) : step === 2 ? (
          <>
            <Text variant="h2">{worker ? t('Date & time') : t('Address & time')}</Text>
            {worker ? (
              <>
                <ChoiceCard icon={MapPin} title={cat.facility.label} sub={cat.facility.line} on onPress={() => {}} />
                <Note text={t('Workers help at our facility only — loading, unloading and organising your unit.')} />
              </>
            ) : (
              <>
                {disposal && hasUnit ? (
                  <ChoiceCard icon={Warehouse} title={t('Clear my unit')} sub={cat.facility.line} on={addressId === 'unit'} onPress={() => setAddressId('unit')} />
                ) : null}
                {(addresses.data ?? []).map((a) => (
                  <ChoiceCard key={a.id} icon={MapPin} title={a.label} sub={a.line} on={addressId === a.id} onPress={() => setAddressId(a.id)} />
                ))}
                <ChoiceCard icon={Plus} title={t('Add a new address')} on={addressId === 'new'} onPress={() => setAddressId('new')} />
                {addressId === 'new' ? (
                  <View style={{ gap: 10 }}>
                    <Input label={t('Name')} placeholder={t('Home, Office…')} value={newLabel} onChangeText={setNewLabel} maxLength={40} />
                    <Input label={t('Address')} icon={MapPin} placeholder={t('Building, flat, street, area')} autoComplete="street-address" value={newLine} onChangeText={setNewLine} maxLength={300} />
                  </View>
                ) : null}
              </>
            )}

            <Card style={{ gap: 6 }}>
              <Calendar value={date} onChange={(d) => { setDate(d); setSlot(null); setStart(null); }} min={range.min} max={range.max}
                closedWeekdays={worker ? cat.worker.closedWeekdays : []} />
            </Card>

            {worker ? (
              <>
                <Card style={{ gap: 14 }}>
                  <View style={{ gap: 8 }}>
                    <Text variant="title">{t('How long?')}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {durations(cat.worker).map((h) => (
                        <View key={h} style={{ flex: 1 }}>
                          <Chip label={h < 1 ? t('{n} min', { n: 30 }) : t('{h} h', { h })} on={hours === h} onPress={() => { setHours(h); setStart(null); }} />
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ gap: 2, flex: 1 }}>
                      <Text variant="title">{t('Workers')}</Text>
                      <Text variant="meta">{t('We have {n} — book both for heavy jobs', { n: cat.worker.maxWorkers })}</Text>
                    </View>
                    <Stepper label={t('workers')} value={workers} onChange={(n) => { setWorkers(n); setStart(null); }} min={1} max={cat.worker.maxWorkers} />
                  </View>
                </Card>
                {date ? <StartTimes starts={avail.data?.starts} loading={avail.isLoading} value={start} onChange={setStart} /> : null}
                {date && start ? (
                  <Card variant="dark" style={{ gap: 6 }}>
                    <Text variant="h3" color="onDk">{dayLabel(date)} · {start} – {endTime}</Text>
                    <Text color="onDk2">{t('{workers} · {duration} at {place}', { workers: workers > 1 ? t('{n} workers', { n: workers }) : t('1 worker'), duration: durationLabel(hours), place: cat.facility.line })}</Text>
                    <Text variant="title" color="onDk">{aed(est?.total ?? 0)}</Text>
                  </Card>
                ) : null}
              </>
            ) : date ? (
              <View style={{ gap: 10 }}>
                <Text variant="title">{t('Arrival window')}</Text>
                {avail.isLoading ? <Skeleton height={100} /> : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {(avail.data?.slots ?? cat.slots).map((s) => (
                      <View key={s.id} style={{ width: '48%' }}>
                        <Chip label={s.full ? `${s.label} · ${t('Full')}` : s.evening ? `${s.label} · +${cat.prices.eveningSlot}` : s.label}
                          on={slot === s.id} disabled={!!s.full} strike={!!s.full} onPress={() => setSlot(s.id)} />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : null}

            <Input label={worker ? t('Notes for our team') : t('Instructions for the driver')} multiline
              placeholder={worker ? t('Anything we should know') : t('Parking, building access, which floor…')} value={notes} onChangeText={setNotes} maxLength={1000} />
          </>
        ) : (
          <>
            <Text variant="h2">{t('Review')}</Text>
            <Card style={{ gap: 12 }}>
              <ReviewRow k={t('Service')} v={serviceLabel(type!)} />
              <ReviewRow k={t('When')} v={worker ? `${dayLabel(date!)} · ${start} – ${endTime}` : `${dayLabel(date!)} · ${chosenSlot?.label ?? ''}`} />
              <ReviewRow k={worker ? t('Where') : t('Address')} v={address ? `${address.label} · ${address.line}` : '—'} />
              {type === 'supplies' ? <ReviewRow k={t('Boxes & labels')} v={extraLabels ? t('{boxes} boxes, {labels} extra labels', { boxes: supplyBoxes, labels: extraLabels }) : t('{boxes} boxes', { boxes: supplyBoxes })} /> : null}
              {type === 'pickup' || type === 'both' ? <ReviewRow k={t('Collecting')} v={`${t('{boxes} boxes, {bulky} bulky', { boxes, bulky })}${description.trim() ? ` · ${description.trim()}` : ''}`} /> : null}
              {needsItems ? <ReviewRow k={t('Delivering')} v={picked.size === 1 ? t('1 item') : t('{n} items', { n: picked.size })} /> : null}
              {worker ? <ReviewRow k={t('Workers')} v={`${workers} · ${durationLabel(hours)}`} /> : null}
              {worker ? <ReviewRow k={t('Job')} v={job.trim()} /> : null}
              {disposal ? <ReviewRow k={t('Taking away')} v={`${load === 'large' ? t('Full truck') : t('Small load')} · ${rubbish.trim()}`} /> : null}
              {notes.trim() ? <ReviewRow k={t('Notes')} v={notes.trim()} /> : null}
            </Card>
            {est ? (
              <Card style={{ gap: 10 }}>
                {est.lines.map((l) => <ReviewRow key={l.label} k={l.label} v={aed(l.amount)} />)}
                <View style={{ height: 1, backgroundColor: c.ln }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="title">{payNow ? t('Total to pay') : t('Estimated total')}</Text>
                  <Text variant="title">{aed(est.total)}</Text>
                </View>
              </Card>
            ) : null}
            <Note text={payNow
              ? t('You pay now to book this delivery; your time slot is held while you pay. Cancel before we set off and you get a full refund.')
              : t('Nothing is charged now. We confirm the booking, and charge after the job is done.')} />
          </>
        )}
      </KeyboardAwareScrollView>

      {/* Sticky footer: running estimate and the next step. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), borderTopWidth: 1, borderTopColor: c.ln, marginHorizontal: -16, paddingHorizontal: 16, backgroundColor: c.bg }}>
        <View style={{ flex: 1 }}>
          <Text variant="meta">{step === 3 ? (payNow ? t('Total to pay') : t('Estimated total')) : t('Estimate')}</Text>
          <Text variant="h3">{est && type ? aed(est.total) : '—'}</Text>
        </View>
        <Button title={step === 3 ? (payNow ? t('Book & pay') : t('Submit request')) : t('Continue')} loading={submit.isPending} onPress={next}
          style={{ flex: 1.3, opacity: problem ? 0.45 : 1 }} />
      </View>
    </Screen>
  );
}

/** 0.5, 1, 1.5, 2 — every booking length from the server's rules. */
const durations = (w: { minHours: number; maxHours: number; stepHours: number }) =>
  Array.from({ length: Math.round((w.maxHours - w.minHours) / w.stepHours) + 1 }, (_, i) => w.minHours + i * w.stepHours);

function CountRow({ title, sub, value, onChange, min = 0 }: { title: string; sub: string; value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="title" style={{ fontSize: 15 }}>{title}</Text>
        <Text variant="meta">{sub}</Text>
      </View>
      <Stepper label={title} value={value} onChange={onChange} min={min} />
    </View>
  );
}

function ReviewRow({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
      <Text variant="meta">{k}</Text>
      <Text style={{ flex: 1, textAlign: 'right' }}>{v}</Text>
    </View>
  );
}

function Note({ text }: { text: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 10, backgroundColor: c.sf2, borderRadius: radius.tile, padding: 12 }}>
      <Info color={c.ink2} size={18} strokeWidth={1.6} />
      <Text variant="meta" color="ink2" style={{ flex: 1 }}>{text}</Text>
    </View>
  );
}

/** Start times in Morning / Afternoon / Evening groups; unavailable ones are struck through. */
function StartTimes({ starts, loading, value, onChange }: {
  starts?: { time: string; available: boolean }[]; loading: boolean; value: string | null; onChange: (t: string) => void;
}) {
  if (loading || !starts) return <Skeleton height={140} />;
  const groups: [string, typeof starts][] = [
    [tr('Morning'), starts.filter((s) => toMin(s.time) < 12 * 60)],
    [tr('Afternoon'), starts.filter((s) => toMin(s.time) >= 12 * 60 && toMin(s.time) < 16 * 60)],
    [tr('Evening'), starts.filter((s) => toMin(s.time) >= 16 * 60)],
  ];
  return (
    <View style={{ gap: 12 }}>
      <Text variant="title">{tr('Start time')}</Text>
      {groups.map(([name, list]) => list.length ? (
        <View key={name} style={{ gap: 8 }}>
          <Text variant="overline" color="ink2">{name}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {list.map((s) => (
              <View key={s.time} style={{ width: '23%' }}>
                <Chip label={s.time} on={value === s.time} disabled={!s.available} strike={!s.available} onPress={() => onChange(s.time)} />
              </View>
            ))}
          </View>
        </View>
      ) : null)}
      {starts.every((s) => !s.available) ? <Text color="ink2">{tr('No start time fits on this day — try fewer hours or another date.')}</Text> : null}
    </View>
  );
}

function Success({ r, onTrack, onHome }: { r: ServiceRequest; onTrack: () => void; onHome: () => void }) {
  const { c } = useTheme();
  return (
    <Screen style={{ justifyContent: 'center', gap: 18 }}>
      <View style={{ alignItems: 'center', gap: 14 }}>
        <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: c.okBg, alignItems: 'center', justifyContent: 'center' }}>
          <CircleCheck color={c.ok} size={52} strokeWidth={1.6} />
        </View>
        <Text variant="h1" style={{ textAlign: 'center' }}>{tr('Request received')}</Text>
        <Text color="ink2" style={{ textAlign: 'center' }}>{tr('We’ll confirm the time shortly. You can follow it in Services.')}</Text>
      </View>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="meta">{tr('Reference')}</Text>
          <Code>{r.ref}</Code>
        </View>
        <ReviewRow k={tr('Status')} v={statusLabel(r.status)} />
        <ReviewRow k={tr('When')} v={`${dayLabel(r.date)} · ${r.startTime ? `${r.startTime} – ${r.endTime}` : r.slotLabel ?? ''}`} />
        <ReviewRow k={tr('Estimate')} v={aed(r.estimate.total)} />
      </Card>
      <Button title={tr('Track request')} onPress={onTrack} />
      <Button title={tr('Back to home')} variant="soft" onPress={onHome} />
    </Screen>
  );
}
