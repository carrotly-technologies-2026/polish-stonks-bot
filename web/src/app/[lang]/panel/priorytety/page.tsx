import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { ExternalLink } from 'lucide-react';
import { panelApi } from '@/lib/api';
import { param, readFilters, tableFilters, withParams, type SearchParams } from '@/lib/filters';
import { fmtDate, fmtNumber } from '@/lib/format';
import { label } from '@/lib/labels';
import type { TematSzczegoly } from '@/lib/types';
import { jobAction } from '@/app/actions';
import { ActionButton } from '@/components/ActionButton';
import { PRIORITY_TONE, TOPIC_STATUS_TONE } from '@/components/Chip';
import { DataTable, type Column, type Row } from '@/components/DataTable';
import { RefreshButton } from '@/components/RefreshButton';
import { UrlSidePanel } from '@/components/SidePanel';
import { TopicStatusForm } from '@/components/TopicStatusForm';
import { ErrorCard, PageHeader, PriorityBadge } from '@/components/ui';

export default async function Priorytety({ params, searchParams }: {
  params: Promise<{ lang: string }>; searchParams: Promise<SearchParams>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  const sp = await searchParams;
  const { jezyk } = readFilters(sp);
  const temat = param(sp, 'temat');
  const l = await getLocale();
  const [t, tc, tn, ts, tcat, tpub] = await Promise.all([
    getTranslations('priorities'), getTranslations('common'), getTranslations('nav'), getTranslations('statuses'),
    getTranslations('categories'), getTranslations('publications'),
  ]);
  const [list, detail] = await Promise.all([
    panelApi.topics({ jezyk, limit: 200 }),
    temat ? panelApi.topic(temat) : Promise.resolve(null),
  ]);
  const path = `/${lang}/panel/priorytety`;

  const columns: Column[] = [
    { key: 'tytul', label: t('colTitle') },
    { key: 'priorytet', label: t('priority'), filter: true },
    { key: 'wynik', label: t('sortScore'), num: true },
    { key: 'status', label: t('status'), filter: true },
    { key: 'kategoria', label: t('category'), filter: true },
    { key: 'dzielnica', label: t('district'), filter: true },
    { key: 'zgloszenia', label: t('colReports'), num: true },
    { key: 'osoby', label: t('colPeople'), num: true, hidden: true },
    { key: 'powaga', label: t('colSeverity'), num: true, hidden: true },
    { key: 'trend', label: t('sortTrend'), num: true },
    { key: 'jezyki', label: t('languages') },
    { key: 'ostatnie', label: t('lastReport') },
    { key: 'demo', label: tc('demoCol'), filter: true, hidden: true },
  ];
  const rows: Row[] = list.ok ? list.data.map((x) => ({
    id: x.id,
    linkParam: ['temat', x.id],
    cells: {
      tytul: { v: x.tytul },
      priorytet: { v: x.priorytet, chip: { tone: PRIORITY_TONE[x.priorytet], label: x.priorytet } },
      wynik: { v: x.wynik, text: fmtNumber(l, x.wynik, 1) },
      status: { v: x.status, chip: { tone: TOPIC_STATUS_TONE[x.status] ?? 'neutral', label: label(ts, x.status) } },
      kategoria: { v: x.kategoria, text: label(tcat, x.kategoria) },
      dzielnica: { v: x.dzielnica ?? 'nieznany', text: x.dzielnica ?? tc('unknown') },
      zgloszenia: { v: x.liczba_zgloszen },
      osoby: { v: x.liczba_osob },
      powaga: { v: x.sr_powaga, text: fmtNumber(l, x.sr_powaga, 1) },
      trend: { v: x.trend_7d, text: `×${fmtNumber(l, x.trend_7d, 2)}` },
      jezyki: { v: x.jezyki.join(','), text: x.jezyki.map((j) => j.toUpperCase()).join(' · ') || '–' },
      ostatnie: { v: x.ostatnie_zgloszenie, text: fmtDate(l, x.ostatnie_zgloszenie, true) },
      demo: { v: x.demo ? 'tak' : 'nie', text: x.demo ? tc('yes') : tc('no') },
    },
  })) : [];

  return (
    <>
      <PageHeader title={t('title')} lead={t('lead')}
        crumbs={[{ label: tn('section_data') }, { label: t('title') }]}
        actions={<>
          <ActionButton action={jobAction} fields={{ job: 'tematy' }} variant="tonal">{tpub('recalcTopics')}</ActionButton>
          <RefreshButton />
        </>} />
      {!list.ok ? <ErrorCard error={list.error} /> : (
        <DataTable caption={t('title')} columns={columns} rows={rows} syncUrl selectedId={temat}
          initialSort={{ key: 'wynik', dir: 'desc' }} initialFilters={tableFilters(sp)} />
      )}

      {temat && detail && (
        <UrlSidePanel title={detail.ok ? detail.data.tytul : tc('unknown')} closeHref={path + withParams(sp, { temat: undefined })}>
          {detail.ok ? <TopicDetails d={detail.data} /> : <ErrorCard error={detail.error} />}
        </UrlSidePanel>
      )}
    </>
  );
}

async function TopicDetails({ d }: { d: TematSzczegoly }) {
  const l = await getLocale();
  const [t, tcat, tu, ts, tsev] = await Promise.all([
    getTranslations('priorities'), getTranslations('categories'), getTranslations('userTypes'),
    getTranslations('statuses'), getTranslations('severity'),
  ]);
  const H = ({ children }: { children: string }) => <h3 className="title mt-6 mb-2">{children}</h3>;
  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge p={d.priorytet} long />
        <span className="chip chip-neutral tnum">{t('score', { value: fmtNumber(l, d.wynik, 1) })}</span>
      </div>
      <dl className="mt-4 grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-4 gap-y-2">
        <dt className="muted">{t('place')}</dt><dd>{d.miejsce}{d.dzielnica ? `, ${d.dzielnica}` : ''}</dd>
        <dt className="muted">{t('category')}</dt><dd>{label(tcat, d.kategoria)}</dd>
        <dt className="muted">{t('barriers')}</dt><dd>{t('reports', { count: d.liczba_zgloszen })}, {t('people', { count: d.liczba_osob })}</dd>
        <dt className="muted">{t('groups')}</dt><dd>{d.grupy.map((g) => label(tu, g)).join(', ') || '–'}</dd>
        <dt className="muted">{t('languages')}</dt><dd>{d.jezyki.map((j) => j.toUpperCase()).join(' · ') || '–'}</dd>
        <dt className="muted">{t('firstReport')}</dt><dd>{fmtDate(l, d.pierwsze_zgloszenie)}</dd>
        <dt className="muted">{t('lastReport')}</dt><dd>{fmtDate(l, d.ostatnie_zgloszenie)}</dd>
      </dl>

      <H>{t('breakdown')}</H>
      <p className="rounded-md bg-surface-2 p-3 font-mono text-[0.8125rem]">{d.rozbicie}</p>
      <p className="small mt-1">{t('trend', { value: fmtNumber(l, d.trend_7d, 2) })}{d.trend_7d > 2 && ` ${t('trendCapped')}`}</p>

      <H>{t('changeStatus')}</H>
      <TopicStatusForm key={d.zaktualizowano} id={d.id} status={d.status} note={d.notatka} />
      {d.historia.length > 0 && (
        <>
          <p className="label mt-4">{t('history')}</p>
          <ol className="small mt-1 space-y-0.5">
            {d.historia.map((h, i) => <li key={i}>{fmtDate(l, h.kiedy, true)} – {label(ts, h.status)}</li>)}
          </ol>
        </>
      )}

      <H>{t('innovations')}</H>
      <p className="small -mt-1 mb-2">{t('innovationsLead')}</p>
      {d.innowacje.length === 0 ? <p className="muted">{t('noInnovations')}</p> : (
        <ul className="flex flex-col gap-2">
          {d.innowacje.map((x) => (
            <li key={x.url} className="panel panel-pad">
              <a href={x.url} target="_blank" rel="noopener noreferrer" className="font-medium">
                {x.tytul} <ExternalLink size={14} className="inline" aria-hidden />
              </a>
              {x.glos_streszczenie && <p className="mt-1">{x.glos_streszczenie}</p>}
              {x.kontakt && <p className="small mt-1">{t('contact', { contact: x.kontakt })}</p>}
              <p className="small">{t('source', { source: x.zrodlo })}</p>
            </li>
          ))}
        </ul>
      )}

      <H>{t('barriers')}</H>
      {d.bariery.length === 0 ? <p className="muted">{t('noBarriers')}</p> : (
        <ul className="divide-y divide-[var(--outline-variant)] rounded-md border border-[var(--outline-variant)]">
          {d.bariery.map((b) => (
            <li key={b.id} className="flex items-start gap-2 px-3 py-2">
              <div className="flex-1">
                <p>{b.opis}</p>
                <p className="small mt-0.5">
                  {t('severity', { value: b.powaga })} ({label(tsev, String(b.powaga))}) · {label(tu, b.typ_uzytkownika)}
                  {b.jezyk ? ` · ${b.jezyk.toUpperCase()}` : ''} · {fmtDate(l, b.utworzono)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
