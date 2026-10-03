import Link from 'next/link';
import { ArrowRight, Binary, CloudDownload, FileText, ListOrdered, Megaphone, Phone, type LucideIcon } from 'lucide-react';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { panelApi } from '@/lib/api';
import { globalQuery, type SearchParams } from '@/lib/filters';
import { fmtDate, fmtDuration, fmtNumber, fmtPercent } from '@/lib/format';
import type { EtapId, Pipeline } from '@/lib/types';
import { jobAction } from '@/app/actions';
import { ActionButton } from '@/components/ActionButton';
import { AutoRefresh } from '@/components/AutoRefresh';
import { Chip, RUN_TONE } from '@/components/Chip';
import { DataTable, type Column, type Row } from '@/components/DataTable';
import { RefreshButton } from '@/components/RefreshButton';
import { ErrorCard, PageHeader, Panel } from '@/components/ui';

const ICONS: Record<EtapId, LucideIcon> = {
  ingest: CloudDownload, embedding: Binary, rozmowy: Phone, tematy: ListOrdered, raport: FileText, publikacja: Megaphone,
};
// The RAG ingest is not started from the (public) panel: it restarts work that
// takes a long time and is scheduled on the backend.
const JOB: Partial<Record<EtapId, 'tematy' | 'raport-dzienny'>> = { tematy: 'tematy', raport: 'raport-dzienny' };
const LINK: Partial<Record<EtapId, string>> = { embedding: '/wiedza', rozmowy: '/rozmowy', publikacja: '/publikacje' };
const durationS = (a: string, b: string | null) => (b ? (Date.parse(b) - Date.parse(a)) / 1000 : null);

export default async function PipelinePage({ params, searchParams }: {
  params: Promise<{ lang: string }>; searchParams: Promise<SearchParams>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  const sp = await searchParams;
  const l = await getLocale();
  const [t, tn, tc] = await Promise.all([getTranslations('pipeline'), getTranslations('nav'), getTranslations('common')]);
  const res = await panelApi.pipeline();

  const fmtMetric = (key: string, v: number | string | null) => {
    if (v === null || v === undefined) return '–';
    if (typeof v === 'string') return key === 'zrodlo' && t.has(`source_${v}`) ? t(`source_${v}`) : v;
    if (key === 'procent') return fmtPercent(l, v);
    if (key === 'czas_s') return fmtDuration(l, v);
    return fmtNumber(l, v, 1);
  };
  const metricLabel = (k: string) => (t.has(`m_${k}`) ? t(`m_${k}`) : k);
  const statusLabel = (s: string) => (t.has(`status_${s}`) ? t(`status_${s}`) : s);

  return (
    <>
      <PageHeader title={t('title')} lead={t('lead')}
        crumbs={[{ label: tn('section_pipeline') }, { label: t('title') }]}
        actions={<>{res.ok && <AutoRefresh active={hasRunning(res.data)} />}<RefreshButton /></>} />
      {!res.ok ? <ErrorCard error={res.error} /> : (
        <div className="flex flex-col gap-4">
          <Panel title={t('scheduler')} id="scheduler">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Chip tone={res.data.scheduler.enabled ? 'success' : 'neutral'}
                label={res.data.scheduler.enabled ? t('schedulerOn') : t('schedulerOff')} />
              <span>{t('reportHour', { hour: String(res.data.scheduler.report_hour).padStart(2, '0') })}</span>
              <span>{t('autoIngest')}: {res.data.scheduler.auto_ingest ? tc('yes') : tc('no')}</span>
            </div>
          </Panel>

          <section aria-labelledby="dag-h" className="panel">
            <div className="panel-head"><h2 id="dag-h" className="title">{t('graph')}</h2></div>
            <ol className="flex gap-0 overflow-x-auto p-4">
              {res.data.etapy.map((e, i) => {
                const Icon = ICONS[e.id] ?? FileText;
                const job = JOB[e.id];
                const link = LINK[e.id];
                return (
                  <li key={e.id} className="flex shrink-0 items-stretch">
                    {i > 0 && <ArrowRight size={22} className="muted mx-1 self-center" aria-hidden />}
                    <article className={`flex w-64 flex-col gap-2 rounded-lg border bg-surface p-3 ${e.status === 'blad' ? 'border-[var(--error)]' : 'border-[var(--outline)]'}`}
                      aria-label={`${i + 1}. ${t(`stage_${e.id}`)}`}>
                      <div className="flex items-center gap-2">
                        <span className="grid size-8 place-items-center rounded-md bg-primary-container text-on-primary-container">
                          <Icon size={18} aria-hidden />
                        </span>
                        <h3 className="title flex-1 !text-[0.9375rem]">{t(`stage_${e.id}`)}</h3>
                      </div>
                      <Chip tone={RUN_TONE[e.status] ?? 'neutral'} label={statusLabel(e.status)} />
                      <dl className="small grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
                        <dt>{t('lastRun')}</dt><dd className="text-right text-[var(--on-surface)]">{fmtDate(l, e.ostatnio, true)}</dd>
                        <dt>{t('nextRun')}</dt><dd className="text-right text-[var(--on-surface)]">{e.nastepny ? fmtDate(l, e.nastepny, true) : t('notScheduled')}</dd>
                      </dl>
                      <dl className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-0.5 border-t border-[var(--outline-variant)] pt-2 text-[0.8125rem]">
                        {Object.entries(e.metryki).map(([k, v]) => (
                          <div key={k} className="contents">
                            <dt className="muted">{metricLabel(k)}</dt><dd className="tnum text-right">{fmtMetric(k, v)}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className="mt-auto pt-1">
                        {job ? (
                          <ActionButton action={jobAction} fields={{ job }} variant="tonal"
                            successText={t('jobDone')}>{t('runNow')}</ActionButton>
                        ) : link ? (
                          <Link href={`/${lang}/panel${link}${globalQuery(sp)}`} className="btn btn-text !px-2">{t('open')}</Link>
                        ) : null}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-labelledby="hist-h" className="flex flex-col gap-2">
            <h2 id="hist-h" className="title">{t('history')}</h2>
            <DataTable caption={t('history')} initialSort={{ key: 'start', dir: 'desc' }} pageSize={10}
              columns={[
                { key: 'status', label: t('colStatus'), filter: true },
                { key: 'start', label: t('colStart') },
                { key: 'koniec', label: t('colEnd') },
                { key: 'czas', label: t('colDuration'), num: true },
                { key: 'stats', label: t('colStats') },
                { key: 'bledy', label: t('colErrors'), num: true },
                { key: 'id', label: 'ID', hidden: true },
              ] satisfies Column[]}
              rows={res.data.ingest_historia.map((r): Row => {
                const d = durationS(r.start, r.koniec);
                const stats = Object.entries(r.statystyki).map(([k, v]) => `${metricLabel(k)}: ${fmtNumber(l, v)}`);
                return {
                  id: r.id,
                  cells: {
                    status: { v: r.status, chip: { tone: RUN_TONE[r.status] ?? 'neutral', label: statusLabel(r.status) } },
                    start: { v: r.start, text: fmtDate(l, r.start, true) },
                    koniec: { v: r.koniec, text: fmtDate(l, r.koniec, true) },
                    czas: { v: d, text: fmtDuration(l, d) },
                    stats: { v: stats.join(', '), text: stats.slice(0, 3).join(', ') || '–' },
                    bledy: { v: r.bledy.length },
                    id: { v: r.id, mono: true },
                  },
                  details: {
                    title: `${t('stage_ingest')} · ${fmtDate(l, r.start, true)}`,
                    items: [
                      { label: t('colStatus'), value: statusLabel(r.status) },
                      { label: t('colStart'), value: fmtDate(l, r.start, true) },
                      { label: t('colEnd'), value: fmtDate(l, r.koniec, true) },
                      { label: t('colDuration'), value: fmtDuration(l, d) },
                      ...Object.entries(r.statystyki).map(([k, v]) => ({ label: metricLabel(k), value: fmtNumber(l, v) })),
                      { label: 'ID', value: r.id },
                    ],
                    list: { label: t('colErrors'), items: r.bledy },
                  },
                };
              })} />
          </section>
        </div>
      )}
    </>
  );
}

function hasRunning(p: Pipeline) {
  return p.etapy.some((e) => e.status === 'trwa') || p.ingest_historia.some((r) => r.status === 'trwa');
}
