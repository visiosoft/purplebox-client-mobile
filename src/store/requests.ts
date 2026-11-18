import { create } from 'zustand';
import { secure } from '@/lib/secure';

// Check-out / extend / refund requests the customer has sent from this device, so Home and My Units can show
// "requested" instead of leaving them guessing. Kept locally until the server reports request status.
export type RequestKind = 'checkout' | 'extend' | 'refund';
export type SentRequest = { id: string; kind: RequestKind; contractId: string; unit: string; detail?: string; at: number };

const KEY = 'pb_requests';
const MAX_AGE = 30 * 86_400_000;

type State = {
  items: SentRequest[];
  add: (r: Omit<SentRequest, 'id' | 'at'>) => void;
  clear: () => void;
  hydrate: () => Promise<void>;
};

const save = (items: SentRequest[]) => secure.set(KEY, JSON.stringify(items)).catch(() => {});

export const useRequests = create<State>((set, get) => ({
  items: [],
  add: (r) => {
    // a newer request of the same kind for the same contract replaces the old one
    const items = [{ ...r, id: `${Date.now()}`, at: Date.now() }, ...get().items.filter((x) => !(x.kind === r.kind && x.contractId === r.contractId))];
    set({ items }); save(items);
  },
  clear: () => { set({ items: [] }); secure.remove(KEY); },
  hydrate: async () => {
    try {
      const raw = await secure.get(KEY);
      if (raw) set({ items: (JSON.parse(raw) as SentRequest[]).filter((x) => Date.now() - x.at < MAX_AGE) });
    } catch {}
  },
}));

export const REQUEST_LABEL: Record<RequestKind, string> = { checkout: 'Check-out requested', extend: 'Extension requested', refund: 'Refund requested' };
