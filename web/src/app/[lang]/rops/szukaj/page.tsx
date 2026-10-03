import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AlertTriangle, ChevronLeft, ChevronRight, Filter, MessageSquareQuote, Search, SearchX, X } from 'lucide-react';
import { clientIp, facety, ropsError, search } from '@/lib/ropsApi';
import {
  CATEGORY_KEYS, PAGE_SIZE, ROPS_GROUPS, ROPS_SOURCES, parseSearch, searchQuery, terms, type RopsError, type SearchState,
} from '@/lib/rops';
import { alternates } from '@/lib/seo';
import { SourceCard } from '@/components/rops/SourceCard';
import { AutoSubmit } from '@/components/rops/AutoSubmit';

export async function generateMetadata({ params, searchParams }: {
  params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const [{ lang }, sp] = await Promise.all([params, searchParams]);
  const t = await getTranslations({ locale: lang, namespace: 'rops' });
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  return {
    title: q ? `${q} – ${t('searchMetaTitle')}` : t('searchMetaTitle'),
    description: t('searchLead'),
    alternates: alternates(lang, '/rops/szukaj'),
  };
}

function Notice({ code, t }: { code: RopsError; t: (k: string) => string }) {
  return (
    <div role="alert" className="panel flex items-start gap-3 p-5">
      <AlertTriangle size={22} className="mt-0.5 shrink-0 text-[var(--warning)]" aria-hidden />
      <div className="flex flex-col gap-1">
        <h2 className="title">{t(`chat.err_${code}_t`)}</h2>
        <p className="muted">{t(`chat.err_${code}`)}</p>
      </div>
    </div>
  );
}

export default async function RopsSearch({ params, searchParams }: {
  params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ lang }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(lang);
  const s = parseSearch(sp);
  const ip = await clientIp();
  const [t, tg, fac, res] = await Promise.all([
    getTranslations('rops'), getTranslations('userTypes'), facety(ip), search(s, ip),
  ]);
  const base = `/${lang}/rops`;
  const href = (p: Partial<SearchState>) => `${base}/szukaj${searchQuery({ ...s, offset: 0, ...p })}`;
  const ts = terms(s.q);
  const cat = (c: string) => { const k = CATEGORY_KEYS[c]; return k && t.has(`cat.${k}`) ? t(`cat.${k}`) : c; };
  const src = (z: string) => (t.has(`src.${z}`) ? t(`src.${z}`) : z);
  const sources = fac.ok ? fac.data.zrodla : ROPS_SOURCES.map((z) => ({ wartosc: z, nazwa: z, liczba: undefined as number | undefined }));
  const categories = fac.ok ? fac.data.kategorie : s.kategorie.map((k) => ({ wartosc: k, liczba: undefined as number | undefined }));
  const filters = s.zrodla.length + s.kategorie.length + (s.grupa ? 1 : 0);
  const active = [
    ...s.zrodla.map((z) => ({ key: `z-${z}`, label: src(z), href: href({ zrodla: s.zrodla.filter((x) => x !== z) }) })),
    ...s.kategorie.map((k) => ({ key: `k-${k}`, label: cat(k), href: href({ kategorie: s.kategorie.filter((x) => x !== k) }) })),
    ...(s.grupa ? [{ key: 'g', label: tg(s.grupa), href: href({ grupa: '' }) }] : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <nav aria-label={t('breadcrumb')}>
          <ol className="small flex flex-wrap items-center gap-1">
            <li><Link href={base} className="hover:underline">{t('navHome')}</Link></li>
            <li className="flex items-center gap-1"><ChevronRight size={14} aria-hidden /><span aria-current="page">{t('navSearch')}</span></li>
          </ol>
        </nav>
        <h1 className="headline !text-[1.75rem] !leading-[2.25rem]">{t('searchTitle')}</h1>
        <p className="muted max-w-3xl">{t('searchLead')}</p>
      </header>

      <form action={`${base}/szukaj`} method="get" className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
        <AutoSubmit />
        <div role="search" className="flex gap-2 lg:col-span-2">
          <label htmlFor="q" className="sr-only">{t('searchLabel')}</label>
          <input id="q" name="q" type="search" defaultValue={s.q} maxLength={300} placeholder={t('searchPlaceholder')}
            className="field !min-h-12 !rounded-full !px-5 !text-[1rem]" />
          <button type="submit" className="btn !min-h-12 shrink-0"><Search size={18} aria-hidden /><span className="hidden sm:inline">{t('searchBtn')}</span><span className="sr-only sm:hidden">{t('searchBtn')}</span></button>
        </div>

        <aside className="panel flex min-w-0 flex-col" aria-labelledby="filters-h">
          <div className="panel-head">
            <h2 id="filters-h" className="title flex items-center gap-2"><Filter size={18} aria-hidden />{t('filters')}{filters > 0 && <span className="tnum muted">({filters})</span>}</h2>
            {filters > 0 && <Link href={href({ zrodla: [], kategorie: [], grupa: '' })} className="small !text-[var(--primary)]">{t('clearFilters')}</Link>}
          </div>
          <fieldset className="flex flex-col gap-1 border-b border-[var(--outline-variant)] px-5 py-3">
            <legend className="label float-left w-full pb-1 uppercase">{t('fSource')}</legend>
            {sources.map((z) => (
              <label key={z.wartosc} className="flex min-h-9 cursor-pointer items-center gap-3">
                <input type="checkbox" name="zrodla" value={z.wartosc} defaultChecked={s.zrodla.includes(z.wartosc)} className="size-4 shrink-0 accent-[var(--primary)]" />
                <span className="min-w-0 flex-1">{src(z.wartosc)}</span>
                {z.liczba !== undefined && <span className="small tnum">{z.liczba}</span>}
              </label>
            ))}
          </fieldset>
          <details open={s.kategorie.length > 0} data-desktop-open className="border-b border-[var(--outline-variant)] px-5 py-3">
            <summary className="label cursor-pointer uppercase">{t('fCategory')}</summary>
            <fieldset className="mt-1 flex flex-col gap-1">
              <legend className="sr-only">{t('fCategory')}</legend>
              {categories.map((c) => (
                <label key={c.wartosc} className="flex min-h-9 cursor-pointer items-center gap-3">
                  <input type="checkbox" name="kategorie" value={c.wartosc} defaultChecked={s.kategorie.includes(c.wartosc)} className="size-4 shrink-0 accent-[var(--primary)]" />
                  <span className="min-w-0 flex-1">{cat(c.wartosc)}</span>
                  {c.liczba !== undefined && <span className="small tnum">{c.liczba}</span>}
                </label>
              ))}
            </fieldset>
          </details>
          <details open={!!s.grupa} className="px-5 py-3">
            <summary className="label cursor-pointer uppercase">{t('fGroup')}</summary>
            <fieldset className="mt-1 flex flex-col gap-1">
              <legend className="sr-only">{t('fGroup')}</legend>
              {['', ...ROPS_GROUPS].map((g) => (
                <label key={g || 'all'} className="flex min-h-9 cursor-pointer items-center gap-3">
                  <input type="radio" name="grupa" value={g} defaultChecked={s.grupa === g} className="size-4 shrink-0 accent-[var(--primary)]" />
                  <span>{g ? tg(g) : t('fGroupAll')}</span>
                </label>
              ))}
            </fieldset>
          </details>
          <div className="border-t border-[var(--outline-variant)] px-5 py-3">
            <button type="submit" className="btn btn-tonal w-full">{t('applyFilters')}</button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col gap-3" aria-labelledby="results-h" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="results-h" className="title mr-auto">
              {res.ok
                ? res.data.wyniki.length === 0
                  ? t('noResultsTitle')
                  : res.data.razem !== null
                    ? t('resultsCount', { n: res.data.razem, from: s.offset + 1, to: s.offset + res.data.wyniki.length })
                    : t('resultsRange', { from: s.offset + 1, to: s.offset + res.data.wyniki.length })
                : t('resultsTitle')}
            </h2>
            {s.q && <Link href={`${base}?pytanie=${encodeURIComponent(s.q)}#czat`} className="btn btn-outline !min-h-9 !px-3"><MessageSquareQuote size={16} aria-hidden />{t('askAssistant')}</Link>}
          </div>
          {active.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label={t('activeFilters')}>
              {active.map((a) => (
                <li key={a.key}>
                  <Link href={a.href} className="filter-chip !pr-2 no-underline" aria-label={t('removeFilter', { label: a.label })}>
                    {a.label}<X size={14} aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {!res.ok ? (
            <Notice code={ropsError(res)} t={t} />
          ) : res.data.wyniki.length === 0 ? (
            <div className="panel flex flex-col items-center gap-3 px-6 py-10 text-center">
              <SearchX size={32} strokeWidth={1.5} className="muted" aria-hidden />
              <p className="muted max-w-md">{t('noResultsDesc')}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {filters > 0 && <Link href={href({ zrodla: [], kategorie: [], grupa: '' })} className="btn btn-outline">{t('clearFilters')}</Link>}
                <Link href={s.q ? `${base}?pytanie=${encodeURIComponent(s.q)}#czat` : `${base}#czat`} className="btn btn-tonal">{t('askAssistant')}</Link>
              </div>
            </div>
          ) : (
            <>
              <ol className="flex flex-col gap-3" start={s.offset + 1}>
                {res.data.wyniki.map((w) => (
                  <li key={w.id}><SourceCard w={w} terms={ts} showFragment={!!s.q} /></li>
                ))}
              </ol>
              {(s.offset > 0 || res.data.hasMore) && (
                <nav aria-label={t('pagination')} className="flex flex-wrap items-center justify-between gap-2">
                  {s.offset > 0
                    ? <Link href={href({ offset: Math.max(0, s.offset - PAGE_SIZE) })} rel="prev" className="btn btn-outline"><ChevronLeft size={18} aria-hidden />{t('prev')}</Link>
                    : <span />}
                  <span className="small tnum">{t('page', { n: Math.floor(s.offset / PAGE_SIZE) + 1 })}</span>
                  {res.data.hasMore
                    ? <Link href={href({ offset: s.offset + PAGE_SIZE })} rel="next" className="btn btn-outline">{t('next')}<ChevronRight size={18} aria-hidden /></Link>
                    : <span />}
                </nav>
              )}
            </>
          )}
        </section>
      </form>
    </div>
  );
}
