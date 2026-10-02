export const aed = (n: number) =>
  `AED ${Number(n || 0).toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const shortDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const daysUntil = (iso?: string | null) =>
  iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null;

/** `rate` is always the monthly figure; a weekly contract bills rate ÷ 4 each week. */
export const monthlyRate = (c: { rate: number; leasedPrice: number | null }) => c.leasedPrice ?? c.rate;
export const weeklyRate = (c: { rate: number; leasedPrice: number | null }) => monthlyRate(c) / 4;
