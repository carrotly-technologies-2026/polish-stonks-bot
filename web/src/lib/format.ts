/** Locale-aware formatting helpers (pure, usable on server and client). */
const tag = (locale: string) => (locale === 'uk' ? 'uk-UA' : locale === 'en' ? 'en-GB' : 'pl-PL');

export const fmtNumber = (locale: string, n: number | null | undefined, digits = 0) =>
  n === null || n === undefined ? '–' : new Intl.NumberFormat(tag(locale), { maximumFractionDigits: digits }).format(n);

export const fmtPercent = (locale: string, share: number | null | undefined) =>
  share === null || share === undefined
    ? '–'
    : new Intl.NumberFormat(tag(locale), { style: 'percent', maximumFractionDigits: 0 }).format(share);

export const fmtDate = (locale: string, iso: string | null | undefined, withTime = false) =>
  !iso
    ? '–'
    : new Intl.DateTimeFormat(tag(locale), {
        dateStyle: 'medium',
        ...(withTime ? { timeStyle: 'short' } : {}),
        timeZone: 'Europe/Warsaw',
      }).format(new Date(iso));

export const fmtDay = (locale: string, day: string) =>
  new Intl.DateTimeFormat(tag(locale), { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${day}T00:00:00Z`),
  );

export function fmtDuration(locale: string, seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return '–';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  const unit = locale === 'uk' ? ['хв', 'с'] : locale === 'en' ? ['min', 's'] : ['min', 's'];
  return m > 0 ? `${m} ${unit[0]} ${s} ${unit[1]}` : `${s} ${unit[1]}`;
}

/** Human name of a conversation language code, e.g. "uk" → "ukraiński". */
export function langName(locale: string, code: string, unknown: string) {
  if (!code || code === 'nieznany') return unknown;
  try {
    return new Intl.DisplayNames([tag(locale)], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Relative change (counts) as a fraction, or null when not computable. */
export const relChange = (cur: number | null, prev: number | null) =>
  cur === null || prev === null || prev === 0 ? null : (cur - prev) / prev;

export const sortedEntries = (p: Record<string, number> | undefined) =>
  Object.entries(p ?? {}).sort((a, b) => b[1] - a[1]);
