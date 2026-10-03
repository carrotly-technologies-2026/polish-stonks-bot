/** Global panel filters in the URL: ?zakres=24h|7d|30d|custom[&od=YYYY-MM-DD&do=YYYY-MM-DD]&jezyk=pl|en|uk */
export const RANGES = ['24h', '7d', '30d'] as const;
export type Range = (typeof RANGES)[number] | 'custom';
export const CONVERSATION_LANGS = ['pl', 'en', 'uk'] as const;
/** Query params that every panel link keeps. */
export const GLOBAL_PARAMS = ['zakres', 'od', 'do', 'jezyk'] as const;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const SPAN: Record<(typeof RANGES)[number], number> = { '24h': DAY, '7d': 7 * DAY, '30d': 30 * DAY };

export type SearchParams = Record<string, string | string[] | undefined>;

export const param = (sp: SearchParams, key: string) => {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
};

const isDay = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

export function readFilters(sp: SearchParams) {
  const r = param(sp, 'zakres');
  const j = param(sp, 'jezyk');
  const jezyk = (CONVERSATION_LANGS as readonly string[]).includes(j ?? '') ? j : undefined;
  const iso = (t: number) => new Date(t).toISOString();
  // Round "now" to the minute so the current and previous windows line up exactly.
  const now = Math.floor(Date.now() / 60_000) * 60_000;

  let range: Range = (RANGES as readonly string[]).includes(r ?? '') ? (r as Range) : '7d';
  let from = now - SPAN[range === 'custom' ? '7d' : range];
  let to = now;
  const od = param(sp, 'od');
  const d = param(sp, 'do');
  if (r === 'custom' && isDay(od) && isDay(d) && od <= d) {
    range = 'custom';
    from = Date.parse(`${od}T00:00:00Z`);
    to = Math.min(Date.parse(`${d}T00:00:00Z`) + DAY, now);
    from = Math.max(from, to - 92 * DAY);
  }
  const span = to - from;
  const chartFrom = span < 7 * DAY ? to - 7 * DAY : from;
  return {
    range,
    jezyk,
    custom: range === 'custom' ? { od: od!, do: d! } : null,
    current: { od: iso(from), do: iso(to) },
    previous: { od: iso(from - span), do: iso(from) },
    chart: { od: iso(chartFrom), do: iso(to) },
  };
}

/** Builds "?a=b" keeping existing params, overriding with `patch` (undefined removes). */
export function withParams(sp: SearchParams, patch: Record<string, string | undefined>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val !== undefined && !(k in patch)) s.set(k, val);
  }
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) s.set(k, v);
  const str = s.toString();
  return str ? `?${str}` : '';
}

/** Only the global params (range / language), for links between panel pages. */
export function globalQuery(sp: SearchParams | URLSearchParams) {
  const s = new URLSearchParams();
  for (const k of GLOBAL_PARAMS) {
    const v = sp instanceof URLSearchParams ? sp.get(k) : param(sp, k);
    if (v) s.set(k, v);
  }
  const str = s.toString();
  return str ? `?${str}` : '';
}

/** Initial DataTable filters from ?f_<column>=a,b */
export function tableFilters(sp: SearchParams) {
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(sp)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (k.startsWith('f_') && val) out[k.slice(2)] = val.split(',');
  }
  return out;
}
