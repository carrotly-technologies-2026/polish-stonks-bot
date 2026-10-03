import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { panelApi } from '@/lib/api';
import { readFilters, type SearchParams } from '@/lib/filters';
import { fmtDate, fmtNumber, fmtPercent } from '@/lib/format';
import { label } from '@/lib/labels';
import { Chip, RUN_TONE } from '@/components/Chip';
import { DataTable, type Row } from '@/components/DataTable';
import { MetricTile } from '@/components/MetricTile';
import { RefreshButton } from '@/components/RefreshButton';
import { ErrorCard, PageHeader, Panel } from '@/components/ui';

const STATUS_KEY = { trwa: 'statusTrwa', ok: 'statusOk', blad: 'statusBlad' } as const;

export default async function Wiedza({ params, searchParams }: {
  params: Promise<{ lang: string }>; searchParams: Promise<SearchParams>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  const sp = await searchParams;
  const f = readFilters(sp);
  const l = await getLocale();
  const [t, tu, tn] = await Promise.all([getTranslations('knowledge'), getTranslations('userTypes'), getTranslations('nav')]);
  const res = await panelApi.gaps(f.current.od, f.current.do);
  const groups = (g: string[]) => g.map((x) => label(tu, x)).join(', ') || '–';

  return (
    <>
      <PageHeader title={t('title')} lead={t('lead')}
        crumbs={[{ label: tn('section_pipeline') }, { label: t('title') }]}
        actions={<>
          <RefreshButton />
        </>} />
      {!res.ok ? <ErrorCard error={res.error} /> : (() => {
        const d = res.data;
        const run = d.ingest.ostatni;
        const k = d.ingest.korpus;
        return (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricTile label={t('documents')} value={fmtNumber(l, k.documents)} />
              <MetricTile label={t('chunks')} value={fmtNumber(l, k.chunks)} />
              <MetricTile label={t('embedded')} value={fmtNumber(l, k.embeddedChunks)}
                caption={k.chunks ? fmtPercent(l, k.embeddedChunks / k.chunks) : undefined} />
              <MetricTile label={t('lastFetched')} value={k.lastFetchedAt ? fmtDate(l, k.lastFetchedAt) : '–'} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title={t('lastRun')} id="ingest">
                {!run ? <p className="muted">{t('noRun')}</p> : (
                  <div className="flex flex-col gap-2">
                    <Chip tone={RUN_TONE[run.status] ?? 'neutral'} label={t(STATUS_KEY[run.status])} />
                    <p className="small">{t('started', { date: fmtDate(l, run.start, true) })}{run.koniec ? ` · ${t('finished', { date: fmtDate(l, run.koniec, true) })}` : ''}</p>
                    {Object.keys(run.statystyki).length > 0 && (
                      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5">
                        {Object.entries(run.statystyki).map(([key, v]) => (
                          <div key={key} className="contents"><dt className="muted">{key}</dt><dd className="tnum text-right">{fmtNumber(l, v)}</dd></div>
                        ))}
                      </dl>
                    )}
                    {run.bledy.length > 0 && (
                      <details>
                        <summary className="inline-flex min-h-10 cursor-pointer items-center text-[var(--error)]">{t('errors')} ({run.bledy.length})</summary>
                        <ul className="small list-disc pl-5 font-mono">{run.bledy.map((e, i) => <li key={i}>{e}</li>)}</ul>
                      </details>
                    )}
                  </div>
                )}
              </Panel>
              <Panel title={t('sources')} pad={false} id="zrodla">
                <DataTable caption={t('sources')} toolbar={false} pageSize={10}
                  columns={[{ key: 'source', label: t('sources') }, { key: 'active', label: t('active'), num: true }, { key: 'inactive', label: t('inactive'), num: true }]}
                  rows={k.sources.map((s): Row => ({ id: s.source, cells: { source: { v: s.source, mono: true }, active: { v: s.active }, inactive: { v: s.inactive } } }))} />
              </Panel>
            </div>

            <Section title={t('unanswered')}>
              <DataTable caption={t('unanswered')} initialSort={{ key: 'liczba', dir: 'desc' }} pageSize={10}
                columns={[
                  { key: 'pytanie', label: t('colQuestion') }, { key: 'liczba', label: t('colCount'), num: true },
                  { key: 'grupy', label: t('colGroups') }, { key: 'jezyki', label: t('colLanguages') }, { key: 'ostatnio', label: t('colLast') },
                ]}
                rows={d.pytania_bez_wynikow.map((q, i): Row => ({
                  id: String(i),
                  cells: {
                    pytanie: { v: q.pytanie }, liczba: { v: q.liczba }, grupy: { v: groups(q.grupy) },
                    jezyki: { v: q.jezyki.map((j) => j.toUpperCase()).join(' · ') }, ostatnio: { v: q.ostatnio, text: fmtDate(l, q.ostatnio) },
                  },
                }))} />
            </Section>

            <div className="grid gap-4 lg:grid-cols-2">
              <Section title={t('unmet')}>
                <DataTable caption={t('unmet')} initialSort={{ key: 'liczba', dir: 'desc' }} pageSize={10}
                  columns={[{ key: 'temat', label: t('colTopic') }, { key: 'liczba', label: t('colCount'), num: true }, { key: 'grupy', label: t('colGroups') }]}
                  rows={d.potrzeby_nieznalezione.map((p, i): Row => ({ id: String(i), cells: { temat: { v: p.temat }, liczba: { v: p.liczba }, grupy: { v: groups(p.grupy) } } }))} />
              </Section>
              <Section title={t('recommended')}>
                <DataTable caption={t('recommended')} initialSort={{ key: 'liczba', dir: 'desc' }} pageSize={10}
                  columns={[{ key: 'tytul', label: t('colTitle') }, { key: 'liczba', label: t('colCount'), num: true }, { key: 'url', label: 'URL', hidden: true }]}
                  rows={d.polecane.map((p): Row => ({ id: p.url, cells: { tytul: { v: p.tytul ?? p.url, href: p.url }, liczba: { v: p.liczba }, url: { v: p.url, mono: true } } }))} />
              </Section>
            </div>
          </div>
        );
      })()}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="flex flex-col gap-2"><h2 className="title">{title}</h2>{children}</section>;
}
