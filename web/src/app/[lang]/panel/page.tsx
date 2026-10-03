import Link from 'next/link';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { panelApi } from '@/lib/api';
import { globalQuery, readFilters, type SearchParams } from '@/lib/filters';
import { change } from '@/lib/change';
import { fmtDate, fmtDay, fmtDuration, fmtNumber, fmtPercent, sortedEntries } from '@/lib/format';
import { label } from '@/lib/labels';
import { MetricTile } from '@/components/MetricTile';
import { TimeSeries } from '@/components/charts/TimeSeries';
import { BarList } from '@/components/charts/BarList';
import { LiveP1 } from '@/components/LiveP1';
import { RefreshButton } from '@/components/RefreshButton';
import { ErrorCard, PageHeader, Panel } from '@/components/ui';

export default async function Overview({ params, searchParams }: {
  params: Promise<{ lang: string }>; searchParams: Promise<SearchParams>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  const sp = await searchParams;
  const f = readFilters(sp);
  const l = await getLocale();
  const [t, tm, tc, tn, tcat, tu, tsev] = await Promise.all([
    getTranslations('panel'), getTranslations('metrics'), getTranslations('common'), getTranslations('nav'),
    getTranslations('categories'), getTranslations('userTypes'), getTranslations('severity'),
  ]);
  const [cur, prev, chart, p1] = await Promise.all([
    panelApi.metrics(f.current.od, f.current.do, f.jezyk),
    panelApi.metrics(f.previous.od, f.previous.do, f.jezyk),
    panelApi.metrics(f.chart.od, f.chart.do, f.jezyk),
    panelApi.topics({ priorytet: 'P1', status: 'nowy', jezyk: f.jezyk, limit: 20 }),
  ]);
  const n = (v: number | null) => fmtNumber(l, v);

  return (
    <>
      <PageHeader title={t('overviewTitle')} lead={t('overviewLead')}
        crumbs={[{ label: tn('section_monitoring') }, { label: t('overviewTitle') }]}
        actions={<RefreshButton />} />

      {!cur.ok ? <ErrorCard error={cur.error} /> : (() => {
        const m = cur.data;
        const p = prev.ok ? prev.data : null;
        return (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <p className="small">{tc('period', { from: fmtDate(l, m.okres_od, true), to: fmtDate(l, m.okres_do, true) })}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricTile label={tm('rozmowy')} value={n(m.rozmowy.razem)}
                change={change(tm, l, m.rozmowy.razem, p?.rozmowy.razem, 'rel')} spark={m.rozmowy.wg_dnia.map((d) => d.liczba)} />
              <MetricTile label={tm('bariery')} value={n(m.bariery.razem)}
                change={change(tm, l, m.bariery.razem, p?.bariery.razem, 'rel')} spark={m.bariery.wg_dnia.map((d) => d.liczba)} />
              <MetricTile label={tm('odsetek_dotarlo')} value={fmtPercent(l, m.odsetek_dotarlo.razem)}
                change={change(tm, l, m.odsetek_dotarlo.razem, p?.odsetek_dotarlo.razem, 'pp')} />
              <MetricTile label={tm('tematy_p1')} value={n(m.tematy_p1.razem)} caption={tm('openNow')} />
              <MetricTile label={tm('mediana_czasu_s')} value={fmtDuration(l, m.mediana_czasu_s.razem)}
                change={change(tm, l, m.mediana_czasu_s.razem, p?.mediana_czasu_s.razem, 'rel')} />
              <MetricTile label={tm('ponowne_telefony')} value={fmtPercent(l, m.ponowne_telefony.razem)}
                change={change(tm, l, m.ponowne_telefony.razem, p?.ponowne_telefony.razem, 'pp')} />
              <MetricTile label={tm('udzial_grup_wrazliwych')} value={fmtPercent(l, m.udzial_grup_wrazliwych)}
                change={change(tm, l, m.udzial_grup_wrazliwych, p?.udzial_grup_wrazliwych, 'pp')} />
              <MetricTile label={tm('pytania_rag')} value={n(m.pytania_rag.razem)}
                change={change(tm, l, m.pytania_rag.razem, p?.pytania_rag.razem, 'rel')} />
            </div>
          </>
        );
      })()}

      <div className="mt-4 grid gap-4 xl:grid-cols-[3fr_2fr]">
        {chart.ok ? (
          <TimeSeries
            title={t('trend')}
            sub={tc('period', { from: fmtDate(l, chart.data.okres_od), to: fmtDate(l, chart.data.okres_do) })}
            series={[
              { key: 'rozmowy', name: t('trendConversations'), color: 'var(--chart-1)' },
              { key: 'bariery', name: t('trendBarriers'), color: 'var(--chart-2)' },
            ]}
            data={chart.data.rozmowy.wg_dnia.map((d) => ({
              label: fmtDay(l, d.dzien),
              rozmowy: d.liczba,
              bariery: chart.data.bariery.wg_dnia.find((b) => b.dzien === d.dzien)?.liczba ?? 0,
            }))}
          />
        ) : <ErrorCard error={chart.error} />}

        <Panel title={t('liveP1')} sub={t('liveP1Lead')} pad={false} id="p1"
          action={<Link href={`/${lang}/panel/priorytety${globalQuery(sp) ? `${globalQuery(sp)}&` : '?'}f_priorytet=P1`} className="btn btn-text">{t('viewAll')}</Link>}>
          {p1.ok ? <LiveP1 key={f.jezyk ?? 'all'} initial={p1.data} jezyk={f.jezyk} lang={lang} /> : <div className="panel-pad"><ErrorCard error={p1.error} /></div>}
        </Panel>
      </div>

      {cur.ok && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          <BarList title={t('barriersByCategory')} emptyText={tc('none')} format={n}
            rows={sortedEntries(cur.data.bariery.wg_kategorii).map(([k, v]) => ({ label: label(tcat, k), value: v }))} />
          <BarList title={t('barriersByDistrict')} emptyText={tc('none')} format={n}
            rows={sortedEntries(cur.data.bariery.wg_dzielnicy).slice(0, 10).map(([k, v]) => ({ label: k === 'nieznany' ? tc('unknown') : k, value: v }))} />
          <BarList title={t('conversationsByType')} emptyText={tc('none')} format={n}
            rows={sortedEntries(cur.data.rozmowy.wg_typu).map(([k, v]) => ({ label: label(tu, k), value: v }))} />
          <BarList title={t('barriersBySeverity')} emptyText={tc('none')} format={n}
            rows={['3', '2', '1'].map((k) => ({ label: `${k} – ${label(tsev, k)}`, value: cur.data.bariery.wg_powagi[k] ?? 0 }))} />
        </div>
      )}
    </>
  );
}
