/** ROPS knowledge assistant: shared types and helpers (safe for server and client components). */

export interface PlikRops { nazwa: string; url: string }

export interface WynikRops {
  id: string; tytul: string; zrodlo: string; zrodlo_nazwa: string; kategoria: string | null; grupy: string[];
  streszczenie: string; fragment: string; kontakt: string | null; url: string; pliki: PlikRops[]; trafnosc: number;
}

export interface FacetyRops {
  zrodla: { wartosc: string; nazwa: string; liczba: number }[];
  kategorie: { wartosc: string; liczba: number }[];
}

export interface SzukajRops { razem: number; wyniki: WynikRops[] }

export type ZrodloOdpowiedzi = WynikRops & { nr: number };
export interface OdpowiedzRops { odpowiedz: string; zrodla: ZrodloOdpowiedzi[]; model: string | null }

export interface HistoriaRops { rola: 'uzytkownik' | 'asystent'; tresc: string }

/** Error codes returned by our /api/rops/* route handlers. */
export type RopsError = 'unavailable' | 'rate_limited' | 'failed' | 'invalid';

export const ROPS_SOURCES = ['biblioteka', 'raporty', 'mapa_wyzwan', 'publikacje'] as const;
export const ROPS_GROUPS = ['senior', 'wozek', 'chodzik', 'wozek_dzieciecy', 'obcokrajowiec', 'inny'] as const;
export const PAGE_SIZE = 10;

const ROPS = 'https://rops.krakow.pl';
/** Real pages on rops.krakow.pl (verified to exist). */
export const ROPS_LINKS = {
  home: ROPS,
  innowacje: `${ROPS}/innowacje-spoleczne/biblioteka-innowacji-spolecznych/kategorie`,
  raporty: `${ROPS}/badania-analizy-raporty/raporty-z-badan`,
  mapa: `${ROPS}/realizowane-projekty-i-zadania/inkubator-wlaczenia-spolecznego-20`,
  publikacje: `${ROPS}/innowacje-spoleczne/publikacje-ze-swiata-innowacji`,
  kontakt: `${ROPS}/kontakt/regionalny-osrodek-polityki-spolecznej-w-krakowie`,
  kontaktIs: `${ROPS}/kontakt/dzial-innowacji-spolecznych`,
} as const;

/** Some crawled PDFs have the file path as their title: show a readable file name instead. */
export function prettyTitle(t: string): string {
  const s = t.trim();
  if (!s.startsWith('/') && !/\.pdf$/i.test(s)) return s;
  const name = decodeURIComponent(s.split('/').pop() || s).replace(/\.pdf$/i, '');
  return name.replace(/[_]+/g, ' ').replace(/\s+-\s+/g, ' – ').trim() || s;
}

/** Query terms worth highlighting (≥ 3 chars, deduplicated, longest first). */
export function terms(q: string): string[] {
  const words = q.toLowerCase().split(/[\s,.;:!?()"'„”]+/).filter((w) => w.length >= 3);
  return [...new Set(words)].sort((a, b) => b.length - a.length).slice(0, 8);
}

/** Splits text into plain / matched parts for <mark> highlighting (prefix match, so "senior" hits "seniorów"). */
export function highlightParts(text: string, ts: string[]): { s: string; hit: boolean }[] {
  if (!ts.length || !text) return [{ s: text, hit: false }];
  const esc = ts.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${esc.join('|')})`, 'gi');
  return text.split(re).filter(Boolean).map((s) => ({ s, hit: ts.includes(s.toLowerCase()) }));
}

/** Trims text to n characters on a word boundary. */
export function clip(text: string, n: number): string {
  const s = (text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), n - 20))}…`;
}

/** Turns "[n]" citations into in-page markdown links to the numbered source cards. */
export function linkCitations(md: string, nums: number[], anchor: (n: number) => string): string {
  const ok = new Set(nums);
  return md.replace(/\[(\d{1,2})\](?![(\[])/g, (m, d: string) => (ok.has(Number(d)) ? `[[${d}]](#${anchor(Number(d))})` : m));
}

/** Search params of /rops/szukaj, parsed from the URL. */
export interface SearchState { q: string; zrodla: string[]; kategorie: string[]; grupa: string; offset: number }

const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : []).flatMap((x) => x.split(',')).map((x) => x.trim()).filter(Boolean);

export function parseSearch(sp: Record<string, string | string[] | undefined>): SearchState {
  const one = (k: string) => { const v = sp[k]; return (Array.isArray(v) ? v[0] : v) ?? ''; };
  const offset = Math.max(0, Math.floor(Number(one('offset')) || 0));
  const grupa = one('grupa');
  return {
    q: one('q').slice(0, 300),
    zrodla: list(sp.zrodla).filter((z) => (ROPS_SOURCES as readonly string[]).includes(z)),
    // Category labels may contain commas, so each one is its own repeated `kategorie` param (never split).
    kategorie: [...new Set((Array.isArray(sp.kategorie) ? sp.kategorie : sp.kategorie ? [sp.kategorie] : [])
      .map((k) => k.trim().slice(0, 120)).filter(Boolean))].slice(0, 10),
    grupa: (ROPS_GROUPS as readonly string[]).includes(grupa) ? grupa : '',
    offset,
  };
}

/** Query string for /rops/szukaj (each category is a separate param because labels may contain commas). */
export function searchQuery(s: Partial<SearchState>): string {
  const p = new URLSearchParams();
  if (s.q) p.set('q', s.q);
  if (s.zrodla?.length) p.set('zrodla', s.zrodla.join(','));
  for (const k of s.kategorie ?? []) p.append('kategorie', k);
  if (s.grupa) p.set('grupa', s.grupa);
  if (s.offset) p.set('offset', String(s.offset));
  const str = p.toString();
  return str ? `?${str}` : '';
}

/** Translation keys (rops.cat.*) for the Polish category labels coming from the backend. */
export const CATEGORY_KEYS: Record<string, string> = {
  'Dla dzieci, młodzieży i rodziny': 'rodzina',
  'Dla seniorów': 'seniorzy',
  'Dla osób z niepełnosprawnością sensoryczną': 'sensoryczna',
  'Dla osób o ograniczonej mobilności': 'mobilnosc',
  'Dla osób z niepełnosprawnością intelektualną': 'intelektualna',
  'Dla zdrowia i medycyny': 'zdrowie',
  'Dla cudzoziemców': 'cudzoziemcy',
  'Dla rynku pracy': 'praca',
  'Dla osób w kryzysie bezdomności': 'bezdomnosc',
};
