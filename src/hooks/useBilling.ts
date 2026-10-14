import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { storageApi } from '@/api/storage';

/** One shape for an invoice, whether it came from Zoho Books or (if Zoho isn't connected) our own records. */
export type BillInvoice = {
  id: string; number: string; date: string; dueDate: string; total: number; balance: number;
  state: 'paid' | 'overdue' | 'upcoming'; partial: boolean;
  pdfHref: string;
  /** The id our own server pays by (Zoho invoices are matched to it by invoice number). */
  payId?: string;
};
export type BillPayment = { id: string; date: string; amount: number; method: string; invoiceNumbers: string; href?: string };

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const ZOHO_PDF = (id: string) => `/customer-portal/storage/billing/invoices/${id}/pdf`;

/**
 * The customer's invoices and payments, from Zoho Books via our API. Falls back to our own records when Zoho isn't
 * connected (or can't be reached), so the screens never go empty because of a sync problem.
 */
export function useBilling() {
  const qc = useQueryClient();
  const zoho = useQuery({ queryKey: ['billing'], queryFn: storageApi.billing });
  const localInvoices = useQuery({ queryKey: ['invoices'], queryFn: storageApi.invoices });
  const localPayments = useQuery({ queryKey: ['payments'], queryFn: storageApi.payments });

  const fromZoho = !!zoho.data?.configured && !zoho.isError;

  const data = useMemo(() => {
    const today = startOfToday();
    const classify = (balance: number, due: string): BillInvoice['state'] =>
      balance <= 0 ? 'paid' : new Date(due).getTime() < today ? 'overdue' : 'upcoming';

    let invoices: BillInvoice[]; let payments: BillPayment[];
    if (fromZoho) {
      const local = new Map((localInvoices.data ?? []).map((i) => [i.invoiceNo, i.id]));
      invoices = zoho.data!.invoices.map((i) => ({
        id: i.id, number: i.number, date: i.date, dueDate: i.dueDate, total: i.total, balance: i.balance,
        state: classify(i.balance, i.dueDate), partial: i.balance > 0 && i.balance < i.total,
        pdfHref: ZOHO_PDF(i.id), payId: local.get(i.number),
      }));
      const byNumber = new Map(invoices.map((i) => [i.number, i]));
      payments = zoho.data!.payments.map((p) => {
        const first = p.invoiceNumbers.split(',').map((n) => n.trim()).find((n) => byNumber.has(n));
        return { id: p.id, date: p.date, amount: p.amount, method: p.mode, invoiceNumbers: p.invoiceNumbers, href: first ? byNumber.get(first)!.pdfHref : undefined };
      });
    } else {
      invoices = (localInvoices.data ?? []).map((i) => ({
        id: i.id, number: i.invoiceNo, date: i.invoiceDate, dueDate: i.dueDate, total: i.total, balance: i.balanceDue,
        state: classify(i.balanceDue, i.dueDate), partial: i.balanceDue > 0 && i.balanceDue < i.total,
        pdfHref: `/customer-portal/storage/invoices/${i.id}/pdf`, payId: i.id,
      }));
      payments = (localPayments.data ?? []).map((p) => ({
        id: p.id, date: p.paidDate, amount: p.amount, method: p.method, invoiceNumbers: p.contractNo ?? '',
        href: `/customer-portal/storage/payments/${p.id}/receipt`,
      }));
    }
    const byDue = (a: BillInvoice, b: BillInvoice) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    const overdue = invoices.filter((i) => i.state === 'overdue').sort(byDue);
    const upcoming = invoices.filter((i) => i.state === 'upcoming').sort(byDue);
    const paid = invoices.filter((i) => i.state === 'paid').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const sum = (l: BillInvoice[]) => l.reduce((s, i) => s + i.balance, 0);
    return {
      overdue, upcoming, paid, payments,
      outstanding: sum(overdue) + sum(upcoming),
      totalPaid: payments.reduce((s, p) => s + p.amount, 0),
    };
  }, [fromZoho, zoho.data, localInvoices.data, localPayments.data]);

  const loading = zoho.isLoading || (!fromZoho && (localInvoices.isLoading || localPayments.isLoading));
  const refetch = () => Promise.all(['billing', 'invoices', 'payments', 'home', 'documents'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
  return { ...data, fromZoho, loading, refreshing: zoho.isRefetching, error: !fromZoho ? (localInvoices.error ?? localPayments.error)?.message : undefined, refetch };
}
