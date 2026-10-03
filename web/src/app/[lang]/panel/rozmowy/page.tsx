import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { panelApi } from '@/lib/api';
import { readFilters, tableFilters, type SearchParams } from '@/lib/filters';
import { fmtDate, fmtDay, fmtDuration, fmtNumber, fmtPercent, sortedEntries } from '@/lib/format';
import { globalQuery } from '@/lib/filters';
import { label } from '@/lib/labels';
import { median } from '@/lib/stats';
import { DataTable, type Column, type Row } from '@/components/DataTable';
import { MetricTile } from '@/components/MetricTile';
import { TimeSeries } from '@/components/charts/TimeSeries';
import { BarList } from '@/components/charts/BarList';
import { RefreshButton } from '@/components/RefreshButton';
import { ErrorCard, PageHeader } from '@/components/ui';

export default async function Rozmowy({ params, searchParams }: {
  params: Promise<{ lang: string }>; searchParams: Promise<SearchParams>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  const sp = await searchParams;
  const f = readFilters(sp);
  const l = await getLocale();
  const [t, tc, tn, tu, tm] = await Promise.all([
    getTranslations('conversations'), getTranslations('common'), getTranslations('nav'),
    getTranslations('userTypes'), getTranslations('metrics'),
  ]);
  const [res, met] = await Promise.all([panelApi.conversations(200), panelApi.metrics(f.chart.od, f.chart.do, f.jezyk)]);
  const list = res.ok
    ? res.data.filter((r) => r.utworzono >= f.current.od && r.utworzono < f.current.do && (!f.jezyk || r.jezyk === f.jezyk))
    : [];
  const yesNo = (v: boolean | null) => (v === null ? tc('unknown') : v ? tc('yes') : tc('no'));
  const withGoal = list.filter((r) => r.czy_dotarl !== null);

  const columns: Column[] = [
    { key: 'utworzono', label: t('colTime') },
    { key: 'id', label: t('colId'), hidden: true },
    { key: 'jezyk', label: t('colLanguage'), filter: true },
    { key: 'typ', label: t('colUserType'), filter: true },
    { key: 'cel', label: t('colGoal') },
    { key: 'dotarl', label: t('colReached'), filter: true },
    { key: 'czas', label: t('colDuration'), num: true },
    { key: 'powrot', label: t('colReturn'), filter: true },
    { key: 'bariery', label: t('colBarriers'), num: true },
    { key: 'demo', label: tc('demoCol'), filter: true },
  ];
  const rows: Row[] = list.map((r) => {
    return {
      id: r.id,
      href: `/${lang}/panel/rozmowy/${r.id}${globalQuery(sp)}`,
      cells: {
        utworzono: { v: r.utworzono, text: fmtDate(l, r.utworzono, true) },
        id: { v: r.conversation_id, mono: true },
        jezyk: { v: r.jezyk ?? 'nieznany', text: r.jezyk ? r.jezyk.toUpperCase() : '–' },
        typ: { v: r.typ_uzytkownika ?? 'nieznany', text: label(tu, r.typ_uzytkownika) },
        cel: { v: r.cel_podrozy, text: r.cel_podrozy ?? '–' },
        dotarl: {
          v: r.czy_dotarl === null ? 'brak' : String(r.czy_dotarl),
          chip: r.czy_dotarl === null ? { tone: 'neutral', label: tc('unknown') }
            : r.czy_dotarl ? { tone: 'success', label: tc('yes') } : { tone: 'error', label: tc('no') },
        },
        czas: { v: r.czas_trwania_s, text: fmtDuration(l, r.czas_trwania_s) },
        powrot: { v: String(r.czy_powrot), text: yesNo(r.czy_powrot) },
        bariery: { v: r.liczba_barier },
        demo: { v: r.demo ? 'tak' : 'nie', chip: r.demo ? { tone: 'demo', label: tc('demo') } : { tone: 'neutral', label: tc('no') } },
      },
    };
  });

  return (
    <>
      <PageHeader title={t('title')} lead={t('lead')}
        crumbs={[{ label: tn('section_data') }, { label: t('title') }]} actions={<RefreshButton />} />
      {!res.ok ? <ErrorCard error={res.error} /> : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricTile label={tm('rozmowy')} value={fmtNumber(l, list.length)} caption={t('sampleNote', { count: res.data.length })} />
            <MetricTile label={tm('odsetek_dotarlo')} value={fmtPercent(l, withGoal.length ? withGoal.filter((r) => r.czy_dotarl).length / withGoal.length : null)} />
            <MetricTile label={tm('mediana_czasu_s')} value={fmtDuration(l, median(list.map((r) => r.czas_trwania_s)))} />
            <MetricTile label={tm('ponowne_telefony')} value={fmtPercent(l, list.length ? list.filter((r) => r.czy_powrot).length / list.length : null)} />
          </div>
          <div className="mb-4 grid gap-4 xl:grid-cols-[3fr_2fr]">
            {met.ok ? (
              <TimeSeries title={t('perDay')} sub={tc('period', { from: fmtDate(l, met.data.okres_od), to: fmtDate(l, met.data.okres_do) })}
                series={[{ key: 'rozmowy', name: tm('rozmowy'), color: 'var(--chart-1)' }]}
                data={met.data.rozmowy.wg_dnia.map((d) => ({ label: fmtDay(l, d.dzien), rozmowy: d.liczba }))} />
            ) : <ErrorCard error={met.error} />}
            <TimeSeries kind="bar" title={t('durationHist')} firstCol={t('colDuration')}
              series={[{ key: 'n', name: tm('rozmowy'), color: 'var(--chart-1)' }]}
              data={buckets(list.map((r) => r.czas_trwania_s)).map(([k, v]) => ({ label: k, n: v }))} />
          </div>
          {met.ok && (
            <div className="mb-4 grid gap-4 lg:grid-cols-3">
              <BarList title={t('reachedByType')} emptyText={tc('none')} format={(v) => fmtPercent(l, v)}
                rows={Object.entries(met.data.odsetek_dotarlo.wg_typu).filter(([, v]) => v !== null)
                  .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).map(([k, v]) => ({ label: label(tu, k), value: v ?? 0 }))} />
              <BarList title={t('reachedByLang')} emptyText={tc('none')} format={(v) => fmtPercent(l, v)}
                rows={Object.entries(met.data.odsetek_dotarlo.wg_jezyka).filter(([, v]) => v !== null)
                  .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).map(([k, v]) => ({ label: k.toUpperCase(), value: v ?? 0 }))} />
              <BarList title={t('byType')} emptyText={tc('none')} format={(v) => fmtNumber(l, v)}
                rows={sortedEntries(met.data.rozmowy.wg_typu).map(([k, v]) => ({ label: label(tu, k), value: v }))} />
            </div>
          )}
          <h2 className="title mb-2">{t('list')}</h2>
          <DataTable caption={t('title')} columns={columns} rows={rows} syncUrl
            initialSort={{ key: 'utworzono', dir: 'desc' }} initialFilters={tableFilters(sp)} />
        </>
      )}
    </>
  );
}

const BUCKETS: [string, number][] = [['< 1 min', 60], ['1–3 min', 180], ['3–5 min', 300], ['5–10 min', 600], ['> 10 min', Infinity]];
function buckets(xs: (number | null)[]): [string, number][] {
  const out = BUCKETS.map(([k]) => [k, 0] as [string, number]);
  for (const x of xs) if (x !== null) out[BUCKETS.findIndex(([, max]) => x < max)][1]++;
  return out;
}
