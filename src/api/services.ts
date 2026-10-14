import { api, API_BASE, getToken } from './client';

const BASE = '/customer-portal/storage';

/** supplies = empty boxes and labels brought to the customer, before a pickup. disposal = the dump truck. */
export type ServiceType = 'supplies' | 'pickup' | 'dropoff' | 'both' | 'worker' | 'disposal';
export type DisposalLoad = 'small' | 'large';
export type ServiceStatus = 'requested' | 'confirmed' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
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
export type ServiceRequest = {
  id: string; ref: string; type: ServiceType; status: ServiceStatus; date: string;
  slot?: string | null; slotLabel?: string | null; startTime?: string | null; hours?: number | null; endTime?: string | null;
  workers?: number | null; disposal?: { load: DisposalLoad; description: string } | null;
  address: { label: string; line: string };
  pickup?: { boxes: number; bulky: number; description?: string } | null;
  supplies?: { boxes: number; extraLabels: number } | null;
  items: { id: string; label: string; name: string; status?: ItemStatus }[];
  job?: string | null; notes?: string | null;
  estimate: Estimate; charged: number | null;
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
  items: () => api<Item[]>(`${BASE}/items`),
  item: (id: string) => api<ItemDetail>(`${BASE}/items/${id}`),
};

/** An item photo needs the login token, so it's loaded with the header rather than a bare URL. */
export const itemPhoto = (id: string) => ({ uri: `${API_BASE}${BASE}/items/${id}/photo`, headers: { Authorization: `Bearer ${getToken()}` } });

// ── Labels and estimates, shared by the wizard, lists and tracking ──────────

export const SERVICE_LABEL: Record<ServiceType, string> = {
  supplies: 'Boxes & labels', pickup: 'Pickup to storage', dropoff: 'Drop-off to you', both: 'Pickup & drop-off', worker: 'Rent a worker',
  disposal: 'Dump truck',
};
export const STATUS_LABEL: Record<ServiceStatus, string> = {
  requested: 'Requested', confirmed: 'Confirmed', scheduled: 'Scheduled', in_progress: 'In progress', completed: 'Completed', cancelled: 'Cancelled',
};
export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  expected: 'Awaiting pickup', stored: 'In storage', scheduled: 'Scheduled', transit: 'Out for delivery', out: 'With you',
};
export const isOpen = (s: ServiceStatus) => s !== 'completed' && s !== 'cancelled';

/** The same sums the server does, so the wizard can show a running estimate. The server's figure is the one that counts. */
export function estimate(p: Prices, d: {
  type: ServiceType; boxes: number; bulky: number; items: number; supplyBoxes: number; evening: boolean;
  hours: number; workers: number; load: DisposalLoad | null;
}): Estimate {
  const lines: Estimate['lines'] = [];
  const add = (label: string, amount: number) => { if (amount > 0) lines.push({ label, amount }); };
  if (d.type === 'worker') {
    add(`${d.workers > 1 ? `${d.workers} workers` : 'Worker'} · ${d.hours} h × AED ${p.workerHourly}`, d.hours * d.workers * p.workerHourly);
  } else if (d.type === 'disposal') {
    if (d.load) add(`Dump truck · ${d.load === 'large' ? 'Full truck' : 'Small load'}`, d.load === 'large' ? p.disposalLarge : p.disposalSmall);
  } else if (d.type === 'supplies') {
    add(`Boxes & labels × ${d.supplyBoxes}`, d.supplyBoxes * p.supplyBox);
    add('Delivery', p.supplyDelivery);
  } else {
    add('Service fee', d.type === 'both' ? p.both : d.type === 'pickup' ? p.pickup : p.dropoff);
    if (d.type !== 'dropoff') {
      add(`Boxes × ${d.boxes}`, d.boxes * p.box);
      add(`Furniture & bulky × ${d.bulky}`, d.bulky * p.bulky);
    }
    if (d.type !== 'pickup') add(`Delivered items × ${d.items}`, d.items * p.deliveredItem);
  }
  if (d.type !== 'worker' && d.evening) add('Evening slot', p.eveningSlot);
  return { lines, total: lines.reduce((s, l) => s + l.amount, 0) };
}

/** 0.5 → "30 min", 1.5 → "1.5 hours". */
export const durationLabel = (h: number) => (h < 1 ? `${h * 60} min` : `${h} hour${h === 1 ? '' : 's'}`);

/** "Thu 24 Sep" from "2026-09-24", read as a local calendar day. */
export const dayLabel = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};
export const whenLabel = (r: Pick<ServiceRequest, 'date' | 'slotLabel' | 'startTime' | 'endTime'>) =>
  `${dayLabel(r.date)} · ${r.startTime ? `${r.startTime} – ${r.endTime}` : r.slotLabel ?? ''}`;
