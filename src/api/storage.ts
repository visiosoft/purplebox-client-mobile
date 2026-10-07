import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { api, API_BASE, getToken } from './client';

const BASE = '/customer-portal/storage';

export type Unit = { id: string; unitNumber: string; floor?: string; sizeSqf?: number | null; lengthFt?: number | null; widthFt?: number | null; shared: boolean };
export type Contract = {
  id: string; contractNo: string; status: 'active' | 'pending_signature' | 'ended';
  billingPeriod: 'weekly' | 'monthly'; rate: number; leasedPrice: number | null; deposit: number;
  startDate: string; endDate: string; nextPaymentDate: string | null; renewalIntent: string;
  signed: boolean; units: Unit[]; authorizedPersons: { name: string; phone?: string; relation?: string }[];
};
export type Invoice = {
  id: string; invoiceNo: string; invoiceDate: string; dueDate: string; subject?: string;
  total: number; paymentMade: number; balanceDue: number; status: 'sent' | 'partial' | 'overdue' | 'paid';
  subTotal?: number; cardFeePct?: number;
  items?: { itemDetails: string; quantity: number; rate: number; amount: number }[];
  payments?: { date: string; amount: number; method: string }[];
};
export type Home = {
  customer: { id: string; fullName: string; phone: string; email?: string } | null;
  primaryContract: Contract | null; contracts: Contract[];
  outstanding: { total: number; invoices: Invoice[] };
};
export type DocItem = { id: string; kind: 'agreement' | 'invoice' | 'receipt'; title: string; status?: string; date?: string; amount?: number; href: string };
export type Documents = { agreements: DocItem[]; invoices: DocItem[]; receipts: DocItem[] };
export type PaymentRow = { id: string; amount: number; paidDate: string; method: string; contractNo: string };

export const storageApi = {
  home: () => api<Home>(`${BASE}/home`),
  contracts: () => api<Contract[]>(`${BASE}/contracts`),
  invoices: () => api<Invoice[]>(`${BASE}/invoices`),
  invoice: (id: string) => api<Invoice>(`${BASE}/invoices/${id}`),
  payments: () => api<PaymentRow[]>(`${BASE}/payments`),
  documents: () => api<Documents>(`${BASE}/documents`),
  pay: (id: string) => api<{ url: string; balanceDue: number }>(`${BASE}/invoices/${id}/pay`, { method: 'POST', body: {} }),
  checkoutChange: (id: string, body: { action: 'extend'; months: 6 | 12 } | { action: 'move_out_early'; date: string }) =>
    api(`${BASE}/contracts/${id}/checkout-change`, { body }),
  // Refund of the deposit after check-out. Needs the matching server route; the screen falls back to WhatsApp if it is missing.
  refundRequest: (id: string, body: { note?: string }) => api<{ ok: boolean }>(`${BASE}/contracts/${id}/refund-request`, { body }),
  linkRequest: (contractNo: string) => api<{ maskedPhone: string; code?: string }>(`${BASE}/link-unit/request`, { body: { contractNo } }),
  linkConfirm: (contractNo: string, code: string) =>
    api<{ token: string; customer: { id: string; fullName: string; phone: string; email?: string } }>(`${BASE}/link-unit/confirm`, { body: { contractNo, code } }),
};

/** Opens a document inside the app (see app/document.tsx) rather than downloading it to the phone. */
export async function openDocument(doc: Pick<DocItem, 'href' | 'title'>) {
  router.push({ pathname: '/document', params: { href: doc.href, title: doc.title } });
}

/**
 * PDFs sit behind the Bearer token, so they are fetched with it. On phones the file goes to the cache folder
 * (so the viewer can read it); in a browser it becomes a blob: URL. Either way the result is something a viewer can show.
 */
export async function fetchDocument(doc: Pick<DocItem, 'href' | 'title'>): Promise<string> {
  const url = `${API_BASE}${doc.href}`;
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (Platform.OS === 'web') {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error('Could not load this document');
    return URL.createObjectURL(await res.blob());
  }
  const target = `${FileSystem.cacheDirectory}${doc.title.replace(/[^\w.-]/g, '_')}.pdf`;
  const res = await FileSystem.downloadAsync(url, target, { headers });
  if (res.status !== 200) throw new Error('Could not load this document');
  return res.uri;
}

/** Optional: hand the file to the share sheet (save, print, send). */
export async function shareDocument(uri: string) {
  if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}
