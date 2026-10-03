import 'server-only';
import type {
  Info, Luki, Metryki, Pipeline, Publikacja, PublikacjaSkrot, RozmowaSkrot, RozmowaSzczegoly, Temat, TematSzczegoly,
} from './types';

/** Result of a backend call: never throws, so pages can render friendly error states. */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; status: number | null; error: string };

const base = () => (process.env.HALOHUB_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

type Opts = { admin?: boolean; method?: string; body?: unknown; revalidate?: number };

export async function call<T>(path: string, opts: Opts = {}): Promise<Result<T>> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (opts.admin) {
    const token = process.env.HALOHUB_ADMIN_TOKEN;
    if (!token) return { ok: false, status: null, error: 'HALOHUB_ADMIN_TOKEN is not set' };
    headers.authorization = `Bearer ${token}`;
  }
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  try {
    const res = await fetch(`${base()}/halohub${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: AbortSignal.timeout(10_000),
      ...(opts.revalidate ? { next: { revalidate: opts.revalidate } } : { cache: 'no-store' }),
    });
    if (!res.ok) return { ok: false, status: res.status, error: `${res.status} ${res.statusText}` };
    const text = await res.text();
    return { ok: true, data: (text ? JSON.parse(text) : null) as T };
  } catch (e) {
    return { ok: false, status: null, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Raw passthrough for open-data files (CSV / JSON). */
export function fetchPublicFile(file: string, revalidate = 60) {
  return fetch(`${base()}/halohub/public/${file}`, {
    next: { revalidate },
    signal: AbortSignal.timeout(10_000),
  });
}

const qs = (p: Record<string, string | number | boolean | null | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : '';
};

const PUBLIC = { revalidate: 60 };
const ADMIN = { admin: true };

export const publicApi = {
  info: () => call<Info>('/public/info', PUBLIC),
  latest: (lang: string) => call<Publikacja>(`/public/publikacja${qs({ lang })}`, PUBLIC),
  archive: () => call<PublikacjaSkrot[]>('/public/publikacje', PUBLIC),
  byId: (id: string, lang: string) =>
    call<Publikacja>(`/public/publikacje/${encodeURIComponent(id)}${qs({ lang })}`, PUBLIC),
};

export type TopicFilters = {
  priorytet?: string; status?: string; kategoria?: string; dzielnica?: string; jezyk?: string; limit?: number;
};

export const panelApi = {
  metrics: (od: string, d: string, jezyk?: string) =>
    call<Metryki>(`/api/metryki${qs({ od, do: d, jezyk })}`, ADMIN),
  topics: (f: TopicFilters = {}) =>
    call<Temat[]>(`/api/tematy${qs({ aktywne: true, limit: 100, ...f })}`, ADMIN),
  topic: (id: string) => call<TematSzczegoly>(`/api/tematy/${encodeURIComponent(id)}`, ADMIN),
  updateTopic: (id: string, body: { status?: string; notatka?: string }) =>
    call<Temat>(`/api/tematy/${encodeURIComponent(id)}`, { ...ADMIN, method: 'PATCH', body }),
  conversations: (limit = 200) => call<RozmowaSkrot[]>(`/api/rozmowy${qs({ limit })}`, ADMIN),
  conversation: (id: string) => call<RozmowaSzczegoly>(`/api/rozmowy/${encodeURIComponent(id)}`, ADMIN),
  pipeline: () => call<Pipeline>('/api/pipeline', ADMIN),
  gaps: (od: string, d: string) => call<Luki>(`/api/wiedza/luki${qs({ od, do: d })}`, ADMIN),
  drafts: () => call<PublikacjaSkrot[]>('/api/publikacje?status=szkic', ADMIN),
  publication: (id: string, lang: string) =>
    call<Publikacja>(`/api/publikacje/${encodeURIComponent(id)}${qs({ lang })}`, ADMIN),
  publish: (id: string) =>
    call<Publikacja>(`/api/publikacje/${encodeURIComponent(id)}/opublikuj`, { ...ADMIN, method: 'POST' }),
  seedDemo: () => call<{ rozmowy: number; bariery: number; zapytania: number }>('/api/demo/seed', {
    ...ADMIN, method: 'POST', body: { dni: 14, rozmow: 120 },
  }),
  deleteDemo: () => call<unknown>('/api/demo', { ...ADMIN, method: 'DELETE' }),
  job: (name: 'tematy' | 'raport-dzienny' | 'ingest') =>
    call<unknown>(`/jobs/${name}`, { ...ADMIN, method: 'POST', body: {} }),
};
