export const aed = (n: number) =>
  `AED ${Number(n || 0).toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const shortDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const daysUntil = (iso?: string | null) =>
  iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null;

/** `rate` is always the monthly figure; a weekly contract bills rate ÷ 4 each week. */
export const monthlyRate = (c: { rate: number; leasedPrice: number | null }) => c.leasedPrice ?? c.rate;
export const weeklyRate = (c: { rate: number; leasedPrice: number | null }) => monthlyRate(c) / 4;

/** How far through its term an agreement is, 0–1. */
export const termProgress = (c: { startDate: string; endDate: string }) => {
  const start = new Date(c.startDate).getTime();
  const span = new Date(c.endDate).getTime() - start;
  return span > 0 ? Math.min(1, Math.max(0, (Date.now() - start) / span)) : 0;
};

/** Turns what someone types into +<country><number>. UAE numbers can be typed as 05x…, 5x… or with +971. */
export const toE164 = (raw: string) => {
  let d = raw.replace(/\D/g, '');
  if (raw.trim().startsWith('+') || d.startsWith('00')) d = d.replace(/^00/, '');
  else if (d.startsWith('0')) d = `971${d.slice(1)}`;
  else if (!d.startsWith('971') && d.length <= 9) d = `971${d}`;
  return `+${d.replace(/^9710/, '971')}`;
};
