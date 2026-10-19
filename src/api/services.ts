import { api, API_BASE, getToken } from './client';
import { dateLocale, tr } from '@/i18n';
import { aed } from '@/lib/format';

const BASE = '/customer-portal/storage';

/** supplies = empty boxes and labels brought to the customer, before a pickup. disposal = the dump truck. */
export type ServiceType = 'supplies' | 'pickup' | 'dropoff' | 'both' | 'worker' | 'disposal';
export type DisposalLoad = 'small' | 'large';
export type ServiceStatus = 'awaiting_payment' | 'requested' | 'confirmed' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type ItemStatus = 'expected' | 'stored' | 'scheduled' | 'transit' | 'out';

export type Prices = {
  pickup: number; dropoff: number; both: number; box: number; bulky: number; deliveredItem: number; eveningSlot: number;
  workerHourly: number; workerMinHours: number; workerMaxHours: number; supplyBox: number; supplyDelivery: number;
  disposalSmall: number; disposalLarge: number;
};
export type Slot = { id: string; label: string; evening: boolean; full?: boolean };
export type Catalog = {
  services: { type: ServiceType; title: string; sub: string; from: number }[];
  prices: Prices;
  slots: Slot[];
  worker: {
    firstStart: string; lastEnd: string; stepMinutes: number; closedWeekdays: number[];
    minHours: number; maxHours: number; stepHours: number; maxWorkers: number;
  };
  disposal: { id: DisposalLoad; label: string; sub: string; price: number }[];
  facility: { label: string; line: string };
  /** Valet = we hold labelled items for them. Only then are the Items tab and deliveries offered. */
  valet?: { active: boolean; itemCount: number };
};
export type Availability =
  | { date: string; closed: boolean; slots: Slot[]; starts?: undefined }
  | { date: string; closed: boolean; starts: { time: string; available: boolean }[]; slots?: undefined };

export type Address = { id: string; label: string; line: string };

export type Item = {
  id: string; label: string; name: string; category: string; status: ItemStatus; condition?: string; storedAt?: string | null;
  hasPhoto: boolean; dims: { length: number | null; width: number | null; height: number | null } | null; weight?: number | null; contents?: string;
};
export type ItemDetail = Item & { history: { at: string; text: string }[] };

export type Estimate = { lines: { label: string; amount: number }[]; total: number };
/** Deliveries are paid when booked; the request waits in awaiting_payment until Stripe confirms it to the server. */
export type RequestPayment = {
  state: 'pending' | 'paid' | 'refunded' | 'expired'; amount: number; cardFee: number; totalCharged?: number | null;
  expiresAt?: string | null; paidAt?: string | null;
};
export type ServiceRequest = {
  id: string; ref: string; type: ServiceType; status: ServiceStatus; date: string;
  slot?: string | null; slotLabel?: string | null; startTime?: string | null; hours?: number | null; endTime?: string | null;
  workers?: number | null; disposal?: { load: DisposalLoad; description: string } | null;
  address: { label: string; line: string };
  pickup?: { boxes: number; bulky: number; description?: string } | null;
  supplies?: { boxes: number; extraLabels: number } | null;
  items: { id: string; label: string; name: string; status?: ItemStatus }[];
  job?: string | null; notes?: string | null;
  estimate: Estimate; charged: number | null; payment?: RequestPayment | null;
  statusLog: { status: ServiceStatus; at: string }[];
  driver: { name: string; phone?: string } | null;
  createdAt: string;
};

export type NewRequest = {
  type: ServiceType; date: string; slot?: string; startTime?: string; hours?: number; workers?: number;
  addressId?: string; address?: { label: string; line: string }; fromUnit?: boolean;
  disposal?: { load: DisposalLoad; description: string };
  pickup?: { boxes: number; bulky: number; description?: string };
  supplies?: { boxes: number; extraLabels: number };
  items?: string[]; job?: string; notes?: string;
};

export const servicesApi = {
  catalog: () => api<Catalog>(`${BASE}/services/catalog`),
  availability: (type: ServiceType, date: string, worker?: { hours: number; workers: number }) =>
    api<Availability>(`${BASE}/services/availability?type=${type}&date=${date}${worker ? `&hours=${worker.hours}&workers=${worker.workers}` : ''}`),
  addresses: () => api<Address[]>(`${BASE}/addresses`),
  list: () => api<ServiceRequest[]>(`${BASE}/services`),
  get: (id: string) => api<ServiceRequest>(`${BASE}/services/${id}`),
  create: (body: NewRequest) => api<{ request: ServiceRequest }>(`${BASE}/services`, { body }),
  cancel: (id: string) => api<{ request: ServiceRequest }>(`${BASE}/services/${id}/cancel`, { method: 'POST', body: {} }),
  /** Delivered items have left storage for good, so they're only listed when asked for. */
  items: (opts?: { delivered?: boolean }) => api<Item[]>(`${BASE}/items${opts?.delivered ? '?include=delivered' : ''}`),
  item: (id: string) => api<ItemDetail>(`${BASE}/items/${id}`),
  itemPhotos: (id: string) => api<{ id: string; at: string }[]>(`${BASE}/items/${id}/photos`),
};

/** Only deliveries are paid at booking; everything else is still charged after the job. */
export const PAID_AT_BOOKING: ServiceType[] = ['dropoff', 'both'];

/** An item photo needs the login token, so it's loaded with the header rather than a bare URL. */
export const itemPhoto = (id: string, photoId?: string) => ({
  uri: `${API_BASE}${BASE}/items/${id}/${photoId ? `photos/${photoId}` : 'photo'}`, headers: { Authorization: `Bearer ${getToken()}` },
});

// ── Labels and estimates, shared by the wizard, lists and tracking ──────────
// The maps hold the English (which is the i18n key); read them through serviceLabel() etc. so Arabic is picked up.

export const SERVICE_LABEL: Record<ServiceType, string> = {
  supplies: 'Boxes & labels', pickup: 'Pickup to storage', dropoff: 'Drop-off to you', both: 'Pickup & drop-off', worker: 'Rent a worker',
  disposal: 'Dump truck',
};
export const STATUS_LABEL: Record<ServiceStatus, string> = {
  awaiting_payment: 'Awaiting payment', requested: 'Requested', confirmed: 'Confirmed', scheduled: 'Scheduled', in_progress: 'In progress', completed: 'Completed', cancelled: 'Cancelled',
};
export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  expected: 'Awaiting pickup', stored: 'In storage', scheduled: 'Scheduled', transit: 'Out for delivery', out: 'With you',
};
export const serviceLabel = (t: ServiceType) => tr(SERVICE_LABEL[t]);
export const statusLabel = (s: ServiceStatus) => tr(STATUS_LABEL[s]);
export const itemStatusLabel = (s: ItemStatus) => tr(ITEM_STATUS_LABEL[s]);
/** The server's worker line has its prices baked in, so it can't be looked up for Arabic; build it here instead. */
export const workerSub = (p: Prices) => tr('Help at your unit · {price} per hour per worker, up to {n} hours', { price: aed(p.workerHourly), n: p.workerMaxHours });
export const isOpen = (s: ServiceStatus) => s !== 'completed' && s !== 'cancelled';

/** The same sums the server does, so the wizard can show a running estimate. The server's figure is the one that counts. */
export function estimate(p: Prices, d: {
  type: ServiceType; boxes: number; bulky: number; items: number; supplyBoxes: number; evening: boolean;
  hours: number; workers: number; load: DisposalLoad | null;
}): Estimate {
  const lines: Estimate['lines'] = [];
  const add = (label: string, amount: number) => { if (amount > 0) lines.push({ label, amount }); };
  if (d.type === 'worker') {
    add(tr(d.workers > 1 ? '{n} workers · {h} h × {rate}' : 'Worker · {h} h × {rate}', { n: d.workers, h: d.hours, rate: aed(p.workerHourly) }), d.hours * d.workers * p.workerHourly);
  } else if (d.type === 'disposal') {
    if (d.load) add(tr(d.load === 'large' ? 'Dump truck · Full truck' : 'Dump truck · Small load'), d.load === 'large' ? p.disposalLarge : p.disposalSmall);
  } else if (d.type === 'supplies') {
    add(tr('Boxes & labels × {n}', { n: d.supplyBoxes }), d.supplyBoxes * p.supplyBox);
    add(tr('Delivery'), p.supplyDelivery);
  } else {
    add(tr('Service fee'), d.type === 'both' ? p.both : d.type === 'pickup' ? p.pickup : p.dropoff);
    if (d.type !== 'dropoff') {
      add(tr('Boxes × {n}', { n: d.boxes }), d.boxes * p.box);
      add(tr('Furniture & bulky × {n}', { n: d.bulky }), d.bulky * p.bulky);
    }
    if (d.type !== 'pickup') add(tr('Delivered items × {n}', { n: d.items }), d.items * p.deliveredItem);
  }
  if (d.type !== 'worker' && d.evening) add(tr('Evening slot'), p.eveningSlot);
  return { lines, total: lines.reduce((s, l) => s + l.amount, 0) };
}

/** 0.5 → "30 min", 1.5 → "1.5 hours". */
export const durationLabel = (h: number) => (h < 1 ? tr('{n} min', { n: h * 60 }) : tr(h === 1 ? '1 hour' : '{n} hours', { n: h }));

/** "Thu 24 Sep" from "2026-09-24", read as a local calendar day. */
export const dayLabel = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(dateLocale(), { weekday: 'short', day: 'numeric', month: 'short' });
};
export const whenLabel = (r: Pick<ServiceRequest, 'date' | 'slotLabel' | 'startTime' | 'endTime'>) =>
  `${dayLabel(r.date)} · ${r.startTime ? `${r.startTime} – ${r.endTime}` : r.slotLabel ?? ''}`;
