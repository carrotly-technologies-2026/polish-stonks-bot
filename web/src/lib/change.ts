import type { Change } from '@/components/MetricTile';

type T = (key: string, values?: Record<string, string>) => string;
const tag = (l: string) => (l === 'uk' ? 'uk-UA' : l === 'en' ? 'en-GB' : 'pl-PL');

/** "+12% vs poprzedni okres" (kind 'rel', counts) or "+3,5 p.p. vs …" (kind 'pp', shares 0–1). */
export function change(t: T, locale: string, cur: number | null, prev: number | null | undefined, kind: 'rel' | 'pp'): Change {
  if (cur === null || prev === null || prev === undefined || (kind === 'rel' && prev === 0)) {
    return { text: t('noPrev'), dir: null };
  }
  const delta = kind === 'rel' ? (cur - prev) / prev : (cur - prev) * 100;
  const dir = Math.abs(delta) < 1e-9 ? 'same' : delta > 0 ? 'up' : 'down';
  const value = kind === 'rel'
    ? new Intl.NumberFormat(tag(locale), { style: 'percent', maximumFractionDigits: 0, signDisplay: 'exceptZero' }).format(delta)
    : t('pp', { value: new Intl.NumberFormat(tag(locale), { maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(delta) });
  return { text: t('vsPrev', { value }), dir, dirLabel: t(dir) };
}
