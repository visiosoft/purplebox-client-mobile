import { secure } from '@/lib/secure';

// Local dev: set EXPO_PUBLIC_API_URL=http://<LAN-IP>:5010/api in .env
export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.purplebox.ae/api';
const TOKEN_KEY = 'pb_customer_token';

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };
export const getToken = () => token;

export async function loadToken() {
  token = await secure.get(TOKEN_KEY);
  return token;
}

export async function saveToken(t: string | null) {
  token = t;
  if (t) await secure.set(TOKEN_KEY, t);
  else await secure.remove(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public data: any = {}) { super(message); }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? (opts.body ? 'POST' : 'GET'),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && token) onUnauthorized?.();
    if (!res.ok) throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`, data);
    return data as T;
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new ApiError(0, 'Request timed out');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
