import type { Metadata } from 'next';
import type { ComponentType } from 'react';
import Link from 'next/link';
import {
  AudioLines, BookOpen, ChevronRight, ClipboardCheck, Construction, Database, FileText, Gauge, HandHeart,
  Landmark, Languages, LibraryBig, Lightbulb, ListOrdered, MapPinned, Megaphone, MessageSquareText, Mic, Phone,
  RotateCcw, Route, Search, Server, ShieldAlert, Sparkles, Webhook, Workflow,
} from 'lucide-react';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { publicApi } from '@/lib/api';
import { alternates } from '@/lib/seo';
import { fmtDate } from '@/lib/format';
import { KeyNumbers } from '@/components/PublicReport';
import { ElevenLabsWidget } from '@/components/ElevenLabsWidget';
import { EmptyState, ErrorCard } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return { alternates: alternates(lang, '/info') };
}

type Icon = ComponentType<{ size?: number; strokeWidth?: number; className?: string; 'aria-hidden'?: boolean }>;

/** Panel destinations: path relative to /{lang}, nav label key, description key. */
type Dest =
  | 'rozmowy' | 'priorytety' | 'pomysly' | 'przeglad' | 'jezyki' | 'pipeline' | 'wiedza' | 'publikacje' | 'otwarte'
  | 'raport' | 'rops' | 'ropsSzukaj';
const DEST: Record<Dest, { path: string; nav: string; desc: string; Icon: Icon }> = {
  rozmowy: { path: '/panel/rozmowy', nav: 'conversations', desc: 'p_rozmowy', Icon: Phone },
  priorytety: { path: '/panel/priorytety', nav: 'priorities', desc: 'p_priorytety', Icon: ListOrdered },
  pomysly: { path: '/panel/pomysly', nav: 'ideas', desc: 'p_pomysly', Icon: Lightbulb },
  przeglad: { path: '/panel', nav: 'overview', desc: 'p_przeglad', Icon: Gauge },
  jezyki: { path: '/panel/jezyki', nav: 'languages', desc: 'p_jezyki', Icon: Languages },
  pipeline: { path: '/panel/pipeline', nav: 'pipeline', desc: 'p_pipeline', Icon: Workflow },
  wiedza: { path: '/panel/wiedza', nav: 'knowledge', desc: 'p_wiedza', Icon: BookOpen },
  publikacje: { path: '/panel/publikacje', nav: 'publications', desc: 'p_publikacje', Icon: Megaphone },
  otwarte: { path: '/panel/otwarte-dane', nav: 'openData', desc: 'p_otwarte', Icon: Database },
  raport: { path: '/raport', nav: 'publicReport', desc: 'p_raport', Icon: FileText },
  rops: { path: '/rops', nav: 'rops', desc: 'p_rops', Icon: LibraryBig },
  ropsSzukaj: { path: '/rops/szukaj', nav: 'ropsSearch', desc: 'p_ropsSzukaj', Icon: Search },
};

const PLAN: { key: string; dest?: Dest }[] = [
  { key: 'plan1' }, { key: 'plan2' }, { key: 'plan3', dest: 'rozmowy' }, { key: 'plan4', dest: 'priorytety' },
  { key: 'plan5', dest: 'pipeline' },
];

const SCENARIOS: { id: string; Icon: Icon; second?: boolean; action?: boolean; check: Dest[] }[] = [
  { id: 's1', Icon: Route, check: ['rozmowy'] },
  { id: 's2', Icon: HandHeart, check: ['rozmowy', 'wiedza'] },
  { id: 's3', Icon: MapPinned, second: true, check: ['rozmowy'] },
  { id: 's4', Icon: Construction, check: ['rozmowy', 'priorytety'] },
  { id: 's5', Icon: RotateCcw, action: true, check: ['rozmowy'] },
  { id: 's6', Icon: Languages, second: true, check: ['rozmowy', 'jezyki'] },
  { id: 's7', Icon: ShieldAlert, second: true, check: ['rozmowy'] },
  { id: 's8', Icon: Landmark, second: true, check: ['rozmowy'] },
  { id: 's9', Icon: Sparkles, check: ['rozmowy'] },
];

const PANEL_ORDER: Dest[] = ['rozmowy', 'priorytety', 'pomysly', 'przeglad', 'jezyki', 'pipeline', 'wiedza', 'publikacje', 'otwarte', 'raport'];

/** ROPS knowledge assistant: steps with the page to open. */
const ROPS_STEPS: { key: string; Icon: Icon; dest: Dest }[] = [
  { key: 'r1', Icon: MessageSquareText, dest: 'rops' },
  { key: 'r2', Icon: Lightbulb, dest: 'rops' },
  { key: 'r3', Icon: ClipboardCheck, dest: 'pomysly' },
  { key: 'r4', Icon: Search, dest: 'ropsSzukaj' },
];

const HOW: { k: string; Icon: Icon }[] = [
  { k: 'how1', Icon: Phone }, { k: 'how2', Icon: AudioLines }, { k: 'how3', Icon: Server },
  { k: 'how4', Icon: Webhook }, { k: 'how5', Icon: Gauge },
];

const pill = 'btn btn-outline !min-h-9 !px-3 !whitespace-normal text-left';

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const [t, tj, tn, tr, tc, locale] = await Promise.all([
    getTranslations('home'), getTranslations('jury'), getTranslations('nav'), getTranslations('report'),
    getTranslations('common'), getLocale(),
  ]);
  const [info, pub] = await Promise.all([publicApi.info(), publicApi.latest(lang)]);
  const href = (d: Dest) => `/${lang}${DEST[d].path}`;
  const agentId = info.ok ? info.data.elevenlabs_agent_id : undefined;

  return (
    <div className="flex flex-col gap-8">
      {/* Hero: phone number first, browser widget as the second option. */}
      <section className="panel grid gap-6 px-5 py-8 md:px-10 md:py-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-center" aria-labelledby="hero">
        <div className="flex min-w-0 flex-col gap-4">
          <p className="label uppercase">{t('eyebrow')}</p>
          <h1 id="hero" className="text-[2rem] leading-[2.5rem] font-normal break-words md:text-[3rem] md:leading-[3.5rem]">{t('heroTitle')}</h1>
          <p className="muted max-w-2xl text-[1.0625rem] leading-[1.625rem]">{t('heroLead')}</p>
          {info.ok ? (
            <div className="flex flex-col gap-2">
              <a href={`tel:${info.data.numer_tel}`} className="btn tnum self-start ![color:var(--on-primary)] !min-h-16 !px-6 !text-[1.5rem] sm:!px-8 sm:!text-[1.75rem]">
                <Phone size={28} aria-hidden />
                <span className="sr-only">{t('callLabel')}: </span>
                {info.data.numer}
              </a>
              <p className="small max-w-xl">{t('callNote')}</p>
            </div>
          ) : <ErrorCard error={info.error} />}
          <p className="flex items-start gap-2 text-[0.9375rem]">
            <Languages size={20} className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden />
            <span>{t('langs')}</span>
          </p>
        </div>
        {agentId && (
          <div className="flex flex-col gap-2 rounded-xl bg-[var(--surface-2)] p-5" aria-labelledby="widget">
            <div className="flex items-center gap-3">
              <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-container text-on-primary-container">
                <Mic size={22} />
              </span>
              <h2 id="widget" className="title">{t('widgetTitle')}</h2>
            </div>
            <p className="muted">{t('widgetDesc')}</p>
            <p className="small">{t('widgetNote')}</p>
            <ElevenLabsWidget agentId={agentId} />
          </div>
        )}
      </section>

      {/* Jury: 3-minute test plan. */}
      <section className="panel" aria-labelledby="plan">
        <div className="panel-head">
          <div className="flex items-center gap-3">
            <ClipboardCheck size={22} className="shrink-0 text-[var(--primary)]" aria-hidden />
            <div>
              <h2 id="plan" className="title">{tj('planTitle')}</h2>
              <p className="small mt-0.5">{tj('planLead')}</p>
            </div>
          </div>
        </div>
        <ol className="flex flex-col">
          {PLAN.map(({ key, dest }, i) => (
            <li key={key} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3 last:border-b-0">
              <span aria-hidden className="tnum grid size-8 shrink-0 place-items-center rounded-full bg-primary-container font-medium text-on-primary-container">{i + 1}</span>
              <p className="min-w-0 flex-1 basis-56">{tj(key)}</p>
              {dest && (
                <Link href={href(dest)} className={pill}>
                  {tj('open')}: {tn(DEST[dest].nav)} <ChevronRight size={16} aria-hidden />
                </Link>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Scenarios. */}
      <section aria-labelledby="scen" className="flex flex-col gap-3">
        <div>
          <h2 id="scen" className="headline">{tj('scenariosTitle')}</h2>
          <p className="muted mt-1">{tj('scenariosLead')}</p>
        </div>
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SCENARIOS.map(({ id, Icon, second, action, check }, i) => (
            <li key={id} className="panel panel-pad flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-container text-on-primary-container">
                  <Icon size={20} />
                </span>
                <h3 className="title"><span className="tnum muted">{i + 1}. </span>{tj(`${id}t`)}</h3>
              </div>
              <div>
                <p className="label uppercase">{action ? tj('do') : tj('say')}</p>
                <blockquote className="mt-1 border-l-4 border-[var(--primary)] pl-3 text-[1rem] leading-[1.5rem]">
                  {action ? tj(`${id}say`) : <q>{tj(`${id}say`)}</q>}
                </blockquote>
                {second && (
                  <blockquote className="mt-2 border-l-4 border-[var(--outline)] pl-3 text-[1rem] leading-[1.5rem]">
                    <q>{tj(`${id}say2`)}</q>
                  </blockquote>
                )}
              </div>
              <div>
                <p className="label uppercase">{tj('get')}</p>
                <p className="mt-1">{tj(`${id}get`)}</p>
              </div>
              <div className="mt-auto">
                <p className="label uppercase">{tj('check')}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {check.map((d) => (
                    <Link key={d} href={href(d)} className={pill}>
                      {tn(DEST[d].nav)} <ChevronRight size={16} aria-hidden />
                    </Link>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ROPS knowledge assistant (web chat, idea creator, search). */}
      <section className="panel" aria-labelledby="rops">
        <div className="panel-head">
          <div className="flex items-center gap-3">
            <LibraryBig size={22} className="shrink-0 text-[var(--primary)]" aria-hidden />
            <div>
              <h2 id="rops" className="title">{tj('ropsTitle')}</h2>
              <p className="small mt-0.5">{tj('ropsLead')}</p>
            </div>
          </div>
        </div>
        <ol className="flex flex-col">
          {ROPS_STEPS.map(({ key, Icon, dest }) => (
            <li key={key} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3 last:border-b-0">
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-container text-on-primary-container">
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1 basis-56">
                <p className="font-medium">{tj(`${key}t`)}</p>
                <p className="muted">{tj(key)}</p>
              </div>
              <Link href={href(dest)} className={pill}>
                {tj('open')}: {tn(DEST[dest].nav)} <ChevronRight size={16} aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* Where to check in the panel. */}
      <section aria-labelledby="panelmap" className="flex flex-col gap-3">
        <div>
          <h2 id="panelmap" className="headline">{tj('panelTitle')}</h2>
          <p className="muted mt-1 break-words">{tj('panelLead', { base: `/${lang}/panel` })}</p>
        </div>
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {PANEL_ORDER.map((d) => {
            const { Icon } = DEST[d];
            return (
              <li key={d}>
                <Link href={href(d)} className="panel panel-pad group flex h-full gap-3 text-[var(--on-surface)] no-underline transition-colors hover:bg-[var(--hover)]">
                  <Icon size={22} className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="title flex items-center gap-1 text-[var(--primary)] group-hover:underline">
                      {tn(DEST[d].nav)} <ChevronRight size={16} aria-hidden />
                    </span>
                    <span className="small font-mono break-all">/{lang}{DEST[d].path}</span>
                    <span className="muted">{tj(DEST[d].desc)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <aside className="flex items-start gap-3 rounded-xl bg-[var(--warning-container)] px-5 py-4 text-[var(--on-surface)]" aria-labelledby="tip">
          <Lightbulb size={22} className="mt-0.5 shrink-0" aria-hidden />
          <div className="flex min-w-0 flex-col gap-2">
            <h3 id="tip" className="title">{tj('tipTitle')}</h3>
            <p>{tj('tip')}</p>
            <Link href={href('priorytety')} className="btn btn-outline self-start !whitespace-normal">
              {tn('priorities')} <ChevronRight size={16} aria-hidden />
            </Link>
          </div>
        </aside>
      </section>

      {/* How it works: 5-step flow. */}
      <section aria-labelledby="jak" className="flex flex-col gap-3">
        <div>
          <h2 id="jak" className="headline">{t('howTitle')}</h2>
          <p className="muted mt-1">{t('howLead')}</p>
        </div>
        <ol className="grid gap-3 lg:grid-cols-5">
          {HOW.map(({ k, Icon }, i) => (
            <li key={k} className="panel panel-pad relative flex gap-3 lg:flex-col">
              <span aria-hidden className="relative grid size-11 shrink-0 place-items-center rounded-full bg-primary-container text-on-primary-container">
                <Icon size={22} />
                <span className="tnum absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-[var(--primary)] text-[0.6875rem] font-medium text-[var(--on-primary)]">{i + 1}</span>
              </span>
              <div className="min-w-0">
                <h3 className="title">{t(`${k}t`)}</h3>
                <p className="muted mt-1">{t(k)}</p>
              </div>
              {i < HOW.length - 1 && (
                <ChevronRight aria-hidden size={20}
                  className="absolute top-1/2 -right-[0.9rem] z-10 hidden -translate-y-1/2 rounded-full bg-[var(--bg)] text-[var(--primary)] lg:block" />
              )}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="liczby" className="flex flex-col gap-3">
        <h2 id="liczby" className="headline">{t('keyNumbers')}</h2>
        {pub.ok ? (
          <>
            <p className="small">{t('keyNumbersLead')} {tc('period', { from: fmtDate(locale, pub.data.okres_od), to: fmtDate(locale, pub.data.okres_do) })}</p>
            <KeyNumbers m={pub.data.metryki} />
            <Link href={`/${lang}/raport`} className="btn btn-tonal self-start">
              {t('seeReport')} <ChevronRight size={18} aria-hidden />
            </Link>
          </>
        ) : pub.status === 404 ? <EmptyState title={tr('noData')} desc={tr('noDataDesc')} /> : <ErrorCard error={pub.error} />}
      </section>
    </div>
  );
}
