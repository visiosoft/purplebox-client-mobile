const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** `AED 1,207.50` — always two decimals. Use on invoices, pay sheets and pay buttons. */
export const aed2 = (n: number | null | undefined) => {
  const v = Math.round(Number(n || 0) * 100) / 100;
  const [i, d] = Math.abs(v).toFixed(2).split('.');
  return `${v < 0 ? '-' : ''}AED ${group(i)}.${d}`;
};

/** `AED 550` for whole amounts, `AED 603.75` otherwise. Fine in size cards and summaries. */
export const aed = (n: number | null | undefined) => {
  const v = Math.round(Number(n || 0) * 100) / 100;
  return Number.isInteger(v) ? `${v < 0 ? '-' : ''}AED ${group(String(Math.abs(v)))}` : aed2(v);
};

export const round2 = (n: number) => Math.round(n * 100) / 100;

const toDate = (d: string | Date) => (d instanceof Date ? d : new Date(d));

/** `12 Oct 2026` */
export const shortDate = (iso?: string | Date | null) => {
  if (!iso) return '—';
  const d = toDate(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
};

/** `Sun 18 Oct` */
export const dayDate = (iso?: string | Date | null) => {
  if (!iso) return '—';
  const d = toDate(iso);
  return `${DAY[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
};

/** `Mon, 5 Oct` for the Home greeting line */
export const todayLine = (d = new Date()) => `${DAY[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`;

/** `October 2026` */
export const monthYear = (iso?: string | Date | null) => {
  if (!iso) return '';
  const d = toDate(iso);
  return `${MONTH[d.getMonth()]} ${d.getFullYear()}`;
};

export const monthName = (m: number) => MONTH[m];

/** `9:40` */
export const clockTime = (iso?: string | Date | null) => {
  if (!iso) return '';
  const d = toDate(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const daysUntil = (iso?: string | null) => {
  if (!iso) return null;
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(iso); b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
};

/** A local calendar day as `YYYY-MM-DD` (never via toISOString, which is UTC). */
export const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Parse `YYYY-MM-DD` as a local date. */
export const fromIsoDay = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

/** Billing treats one month as 28 days, so a booking of N months ends N × 28 days after move-in. */
export const bookingEnd = (start: Date, months: number) => addDays(start, months * 28);

/** `rate` is always the monthly figure; a weekly contract bills rate ÷ 4 each week. */
export const monthlyRate = (c: { rate: number; leasedPrice: number | null }) => c.leasedPrice ?? c.rate;
export const weeklyRate = (c: { rate: number; leasedPrice: number | null }) => monthlyRate(c) / 4;

/** A customer created from a phone login has the phone number as their name until they add one. */
export const hasRealName = (name?: string | null) => !!name && !!name.trim() && !/^[+\d\s()-]+$/.test(name);
export const firstName = (name?: string | null) => (hasRealName(name) ? name!.trim().split(/\s+/)[0] : '');
export const initial = (name?: string | null) => (firstName(name).charAt(0) || '?').toUpperCase();

export const greeting = (d = new Date()) => {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

/** UAE mobile digits after +971, formatted as typed: `50 123 4567` */
export const formatUaeMobile = (digits: string) =>
  [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 9)].filter(Boolean).join(' ');

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
