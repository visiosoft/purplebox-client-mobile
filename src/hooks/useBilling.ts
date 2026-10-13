import { useQuery, useQueryClient } from '@tanstack/react-query';
import { storageApi } from '@/api/storage';
import { shortDate } from '@/lib/format';

export type Inv = { id: string; number: string; dueDate: string; total: number; balance: number; status: string; pdf: string; payUrl?: string; localId?: string };
export type Pay = { id: string; amount: number; date: string; sub: string; right: string; receipt?: string };

const MODE: Record<string, string> = { banktransfer: 'Bank transfer', creditcard: 'Card', cash: 'Cash', check: 'Cheque', cheque: 'Cheque' };
const modeLabel = (m: string) => MODE[m.replace(/[\s_-]/g, '').toLowerCase()] ?? m;

/**
 * Invoices and payments, as Home and Payments show them. The books are kept in
 * Zoho Books; the app's own invoices (online bookings) are the fallback when
 * Zoho can't be read, and what the Stripe "Pay" button settles.
 */
export function useBilling() {
  const qc = useQueryClient();
  const billing = useQuery({ queryKey: ['billing'], queryFn: storageApi.billing });
  const invoices = useQuery({ queryKey: ['invoices'], queryFn: storageApi.invoices });
  const payments = useQuery({ queryKey: ['payments'], queryFn: storageApi.payments });
  const zoho = billing.data?.configured ? billing.data : null;

  const refresh = () => Promise.all(['home', 'billing', 'invoices', 'payments', 'documents'].map((k) => qc.invalidateQueries({ queryKey: [k] })));

  const local = invoices.data ?? [];
  const localByNo = new Map(local.map((i) => [i.invoiceNo, i]));
  const list: Inv[] = zoho
    ? zoho.invoices.map((i) => {
      const mine = localByNo.get(i.number);
      return {
        id: i.id, number: i.number, dueDate: i.dueDate, total: i.total, balance: i.balance, status: i.status,
        pdf: `/customer-portal/storage/billing/invoices/${i.id}/pdf`, payUrl: i.url || undefined,
        localId: mine && mine.balanceDue > 0 ? mine.id : undefined,
      };
    })
    : local.map((i) => ({
      id: i.id, number: i.invoiceNo, dueDate: i.dueDate, total: i.total, balance: i.balanceDue, status: i.status,
      pdf: `/customer-portal/storage/invoices/${i.id}/pdf`, localId: i.balanceDue > 0 ? i.id : undefined,
    }));
  const paid: Pay[] = zoho
    ? zoho.payments.map((p) => ({
      id: p.id, amount: p.amount, date: p.date,
      sub: [shortDate(p.date), modeLabel(p.mode), p.invoiceNumbers].filter(Boolean).join(' · '), right: p.number,
    }))
    : (payments.data ?? []).map((p) => ({
      id: p.id, amount: p.amount, date: p.paidDate, sub: `${shortDate(p.paidDate)} · ${p.contractNo}`, right: p.method || 'Receipt',
      receipt: `/customer-portal/storage/payments/${p.id}/receipt`,
    }));

  const open = list.filter((i) => i.balance > 0);
  return {
    zoho, list, paid, open, refresh,
    due: zoho ? zoho.totals.outstanding : open.reduce((s, i) => s + i.balance, 0),
    totalPaid: zoho ? zoho.totals.paid : paid.reduce((s, p) => s + p.amount, 0),
    loading: billing.isLoading && invoices.isLoading,
    error: billing.error && invoices.error ? invoices.error.message : null,
    refreshing: billing.isRefetching || invoices.isRefetching,
  };
}
