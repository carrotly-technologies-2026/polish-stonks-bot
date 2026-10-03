import 'server-only';
import { headers } from 'next/headers';
import { call, type Result } from './api';
import {
  PAGE_SIZE, type FacetyRops, type HistoriaRops, type IdeaHintStep, type OdpowiedzRops, type PodpowiedzKreatora,
  type PomyslZgloszony, type RopsError, type SearchState, type SzukajRops, type WynikRops,
} from './rops';

/** End-user IP, forwarded so the backend rate-limits per resident instead of per frontend server. */
export async function clientIp(req?: Request): Promise<string | undefined> {
  const h = req ? req.headers : await headers();
  const xff = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  return xff || h.get('x-real-ip') || undefined;
}

const fwd = (ip?: string) => (ip ? { 'x-forwarded-for': ip } : undefined);

/** Maps a failed backend call to a stable error code for the UI. */
export function ropsError(r: { status: number | null }): RopsError {
  if (r.status === 429) return 'rate_limited';
  if (r.status === 400) return 'invalid';
  if (r.status === 404 || r.status === 405 || r.status === 501 || r.status === 502 || r.status === 503 || r.status === null) return 'unavailable';
  return 'failed';
}

export function facety(ip?: string) {
  return call<FacetyRops>('/public/rops/facety', { revalidate: 300, headers: fwd(ip) });
}

function qs(s: SearchState, limit: number, offset: number, withCategories: boolean) {
  const p = new URLSearchParams();
  if (s.q) p.set('q', s.q);
  if (s.zrodla.length) p.set('zrodla', s.zrodla.join(','));
  if (withCategories && s.kategorie.length) p.set('kategorie', s.kategorie.join(','));
  if (s.grupa) p.set('grupa', s.grupa);
  p.set('limit', String(limit));
  p.set('offset', String(offset));
  return `?${p}`;
}

export interface SearchPage {
  wyniki: WynikRops[];
  /** Exact total when known (browse mode or an exhausted result list). */
  razem: number | null;
  hasMore: boolean;
}

const MAX_OFFSET = 300;
const BATCH = 30;

/**
 * One page of results. Asks for one extra hit to know whether a next page exists (with a query the backend's
 * `razem` only counts the hits it retrieved). Category labels containing commas ("Dla dzieci, młodzieży i rodziny")
 * cannot be sent in the comma-separated `kategorie` parameter, so those are filtered here over the full list.
 */
export async function search(s: SearchState, ip?: string, pageSize = PAGE_SIZE): Promise<Result<SearchPage>> {
  const offset = Math.min(s.offset, MAX_OFFSET);
  if (!s.kategorie.some((k) => k.includes(','))) {
    const r = await call<SzukajRops>(`/public/rops/szukaj${qs(s, pageSize + 1, offset, true)}`, { headers: fwd(ip) });
    if (!r.ok) return r;
    const all = r.data.wyniki ?? [];
    const hasMore = all.length > pageSize && offset + pageSize <= MAX_OFFSET;
    const exhausted = !hasMore;
    return {
      ok: true,
      data: {
        wyniki: all.slice(0, pageSize),
        razem: !s.q ? r.data.razem : exhausted ? offset + all.length : null,
        hasMore,
      },
    };
  }
  const wanted = new Set(s.kategorie);
  const hits: WynikRops[] = [];
  for (let off = 0; off <= MAX_OFFSET; off += BATCH) {
    const r = await call<SzukajRops>(`/public/rops/szukaj${qs(s, BATCH, off, false)}`, { headers: fwd(ip) });
    if (!r.ok) return r;
    const page = r.data.wyniki ?? [];
    hits.push(...page.filter((w) => w.kategoria && wanted.has(w.kategoria)));
    if (page.length < BATCH) break;
  }
  return {
    ok: true,
    data: { wyniki: hits.slice(offset, offset + pageSize), razem: hits.length, hasMore: offset + pageSize < hits.length },
  };
}

export function ask(pytanie: string, historia: HistoriaRops[], ip?: string) {
  return call<OdpowiedzRops>('/public/rops/zapytaj', {
    method: 'POST', body: { pytanie, historia }, headers: fwd(ip), timeoutMs: 30_000,
  });
}

/** Idea creator: stores an idea card; the backend validates it (400) and rate-limits per IP (429). */
export function submitIdea(body: Record<string, unknown>, ip?: string) {
  return call<PomyslZgloszony>('/public/rops/pomysly', { method: 'POST', body, headers: fwd(ip), timeoutMs: 15_000 });
}

/** Idea creator assistant: hint, proposed text and similar innovations for one field of the card. */
export function ideaHint(body: { krok: IdeaHintStep; szkic: Record<string, unknown>; pytanie?: string; jezyk?: string }, ip?: string) {
  return call<PodpowiedzKreatora>('/public/rops/kreator/asystent', { method: 'POST', body, headers: fwd(ip), timeoutMs: 50_000 });
}
