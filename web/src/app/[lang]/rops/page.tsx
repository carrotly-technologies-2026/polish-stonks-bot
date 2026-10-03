import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  BookOpen, Building2, ChartColumn, ChevronRight, Database, ExternalLink, FileSearch, HandHeart, Map as MapIcon,
  MessageSquareQuote, Search, Sparkles, Users, Waypoints,
} from 'lucide-react';
import { publicApi } from '@/lib/api';
import { facety } from '@/lib/ropsApi';
import { ROPS_LINKS, searchQuery } from '@/lib/rops';
import { alternates } from '@/lib/seo';
import { RopsChat } from '@/components/rops/RopsChat';
import { VoiceCard } from '@/components/rops/VoiceCard';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: 'rops' });
  return { title: t('metaTitle'), description: t('metaDesc'), alternates: alternates(lang, '/rops') };
}

const TILES = [
  { k: 'biblioteka', Icon: BookOpen },
  { k: 'raporty', Icon: ChartColumn },
  { k: 'mapa_wyzwan', Icon: MapIcon },
] as const;

const AUDIENCES = [
  { k: 'residents', Icon: Users },
  { k: 'workers', Icon: HandHeart },
  { k: 'ngo', Icon: Waypoints },
  { k: 'jst', Icon: Building2 },
] as const;

const HOW = [
  { k: 'how1', Icon: FileSearch }, { k: 'how2', Icon: Database }, { k: 'how3', Icon: Search },
  { k: 'how4', Icon: MessageSquareQuote },
] as const;

const ON_ROPS = [
  { k: 'innowacje', href: ROPS_LINKS.innowacje, Icon: Sparkles },
  { k: 'raporty', href: ROPS_LINKS.raporty, Icon: ChartColumn },
  { k: 'mapa', href: ROPS_LINKS.mapa, Icon: MapIcon },
  { k: 'publikacje', href: ROPS_LINKS.publikacje, Icon: BookOpen },
] as const;

export default async function RopsHome({ params, searchParams }: {
  params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  const sp = await searchParams;
  const pytanie = typeof sp.pytanie === 'string' ? sp.pytanie.slice(0, 500) : undefined;
  const [t, info, fac] = await Promise.all([getTranslations('rops'), publicApi.info(), facety()]);
  const count = (z: string) => (fac.ok ? fac.data.zrodla.find((s) => s.wartosc === z)?.liczba : undefined);
  const base = `/${lang}/rops`;

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="hero" className="flex flex-col gap-5">
        <div className="flex max-w-3xl flex-col gap-2">
          <p className="label uppercase">{t('eyebrow')}</p>
          <h1 id="hero" className="text-[1.75rem] leading-[2.25rem] font-normal break-words md:text-[2.5rem] md:leading-[3rem]">{t('heroTitle')}</h1>
          <p className="muted text-[1rem] leading-[1.5rem]">{t('heroLead')}</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
          <RopsChat key={pytanie ?? 'chat'} initialQuestion={pytanie} />
          <div className="flex min-w-0 flex-col gap-4">
            <form action={`${base}/szukaj`} method="get" role="search" className="panel flex flex-col gap-2 p-5">
              <label htmlFor="home-q" className="title">{t('searchBoxTitle')}</label>
              <p className="small">{t('searchBoxDesc')}</p>
              <div className="flex gap-2">
                <input id="home-q" name="q" type="search" className="field !rounded-full !px-4" placeholder={t('searchPlaceholder')} />
                <button type="submit" className="btn !size-10 shrink-0 !p-0" aria-label={t('searchBtn')}><Search size={18} aria-hidden /></button>
              </div>
            </form>
            <VoiceCard info={info.ok ? info.data : null} lang={lang} />
          </div>
        </div>
      </section>

      <section aria-labelledby="tiles-h" className="flex flex-col gap-3">
        <h2 id="tiles-h" className="headline">{t('tilesTitle')}</h2>
        <ul className="grid gap-3 md:grid-cols-3">
          {TILES.map(({ k, Icon }) => {
            const n = count(k);
            return (
              <li key={k}>
                <Link href={`${base}/szukaj${searchQuery({ zrodla: [k] })}`}
                  className="panel group flex h-full gap-3 p-5 text-[var(--on-surface)] no-underline transition-colors hover:bg-[var(--hover)]">
                  <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-container text-on-primary-container"><Icon size={22} /></span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="title flex items-center gap-1 text-[var(--primary)] group-hover:underline">{t(`tile.${k}`)} <ChevronRight size={16} aria-hidden /></span>
                    <span className="muted">{t(`tile.${k}Desc`)}</span>
                    {n !== undefined && <span className="small tnum">{t('docs', { n })}</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="who-h" className="flex flex-col gap-3">
        <div>
          <h2 id="who-h" className="headline">{t('whoTitle')}</h2>
          <p className="muted mt-1">{t('whoLead')}</p>
        </div>
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {AUDIENCES.map(({ k, Icon }) => (
            <li key={k} className="panel flex flex-col gap-3 p-5">
              <div className="flex items-center gap-3">
                <Icon size={22} className="shrink-0 text-[var(--primary)]" aria-hidden />
                <h3 className="title">{t(`who.${k}`)}</h3>
              </div>
              <p className="muted">{t(`who.${k}Desc`)}</p>
              <ul className="mt-auto flex flex-col gap-2">
                {(['q1', 'q2'] as const).map((q) => (
                  <li key={q}>
                    <Link href={`${base}?pytanie=${encodeURIComponent(t(`who.${k}_${q}`))}#czat`}
                      className="btn btn-outline !min-h-9 w-full !justify-start !px-3 !whitespace-normal text-left">
                      <MessageSquareQuote size={16} className="shrink-0" aria-hidden />{t(`who.${k}_${q}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how-h" className="flex flex-col gap-3">
        <div>
          <h2 id="how-h" className="headline">{t('howTitle')}</h2>
          <p className="muted mt-1">{t('howLead')}</p>
        </div>
        <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {HOW.map(({ k, Icon }, i) => (
            <li key={k} className="panel flex gap-3 p-5 lg:flex-col">
              <span aria-hidden className="relative grid size-11 shrink-0 place-items-center rounded-full bg-primary-container text-on-primary-container">
                <Icon size={22} />
                <span className="tnum absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-[var(--primary)] text-[0.6875rem] font-medium text-[var(--on-primary)]">{i + 1}</span>
              </span>
              <div className="min-w-0">
                <h3 className="title">{t(`${k}t`)}</h3>
                <p className="muted mt-1">{t(k)}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="small max-w-3xl">{t('howNote')}</p>
      </section>

      <section aria-labelledby="rops-h" className="flex flex-col gap-3">
        <div>
          <h2 id="rops-h" className="headline">{t('onRopsTitle')}</h2>
          <p className="muted mt-1">{t('onRopsLead')}</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ON_ROPS.map(({ k, href, Icon }) => (
            <li key={k}>
              <a href={href} target="_blank" rel="noopener noreferrer"
                className="panel group flex h-full flex-col gap-2 p-5 text-[var(--on-surface)] no-underline transition-colors hover:bg-[var(--hover)]">
                <Icon size={22} className="text-[var(--primary)]" aria-hidden />
                <span className="title flex items-center gap-1 text-[var(--primary)] group-hover:underline">
                  {t(`sec.${k}`)} <ExternalLink size={14} aria-hidden /><span className="sr-only"> ({t('external')})</span>
                </span>
                <span className="muted">{t(`secDesc.${k}`)}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
