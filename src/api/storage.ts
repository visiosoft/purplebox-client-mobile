import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
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

/** Accounts from Zoho Books, where PurpleBox keeps its books. `configured: false` means none could be read. */
export type Billing = {
  configured: boolean;
  invoices: { id: string; number: string; date: string; dueDate: string; total: number; balance: number; status: string; url?: string }[];
  payments: { id: string; number: string; date: string; amount: number; mode: string; reference: string; invoiceNumbers: string }[];
  totals: { invoiced: number; paid: number; outstanding: number };
};

export const storageApi = {
  billing: () => api<Billing>(`${BASE}/billing`),
  home: () => api<Home>(`${BASE}/home`),
  contracts: () => api<Contract[]>(`${BASE}/contracts`),
  invoices: () => api<Invoice[]>(`${BASE}/invoices`),
  invoice: (id: string) => api<Invoice>(`${BASE}/invoices/${id}`),
  payments: () => api<PaymentRow[]>(`${BASE}/payments`),
  documents: () => api<Documents>(`${BASE}/documents`),
  pay: (id: string) => api<{ url: string; balanceDue: number }>(`${BASE}/invoices/${id}/pay`, { method: 'POST', body: {} }),
  checkoutChange: (id: string, body: { action: 'extend'; months: 6 | 12 } | { action: 'move_out_early'; date: string }) =>
    api(`${BASE}/contracts/${id}/checkout-change`, { body }),
  // Refund of the deposit after check-out. The screen falls back to WhatsApp if the server doesn't have the route yet.
  refundRequest: (id: string, body: { note?: string }) => api<{ ok: boolean }>(`${BASE}/contracts/${id}/refund-request`, { body }),
};

/**
 * Opens a PDF to read: a new tab on web, the in-app browser on iOS. Those can't
 * send our Bearer header, so the server hands out a link good for this one
 * document for a few minutes. Android's in-app browser downloads PDFs rather
 * than showing them, so there it goes to the share sheet, which offers the
 * phone's PDF viewer.
 */
export async function openDocument(doc: Pick<DocItem, 'href' | 'title'>) {
  if (Platform.OS === 'android') return shareDocument(doc);
  // Opened before any await, or the browser counts it as a pop-up and blocks it.
  const tab = Platform.OS === 'web' ? window.open('', '_blank') : null;
  try {
    const { token } = await api<{ token: string }>('/customer-auth/document-link', { body: { href: doc.href } });
    const url = `${API_BASE}${doc.href}?dt=${encodeURIComponent(token)}`;
    if (Platform.OS !== 'web') {
      await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN });
    } else if (tab) {
      tab.location.href = url;
    } else {
      window.open(url, '_blank');
    }
  } catch (e) {
    tab?.close();
    throw e;
  }
}

async function shareDocument(doc: Pick<DocItem, 'href' | 'title'>) {
  const target = `${FileSystem.cacheDirectory}${doc.title.replace(/[^\w.-]/g, '_')}.pdf`;
  const res = await FileSystem.downloadAsync(`${API_BASE}${doc.href}`, target, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (res.status !== 200) throw new Error('Could not download this document');
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}
