import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { panelApi } from '@/lib/api';
import { readFilters, type SearchParams } from '@/lib/filters';
import { fmtDate, fmtDuration, fmtNumber, fmtPercent, langName, sortedEntries } from '@/lib/format';
import { label } from '@/lib/labels';
import { PRIORITY_TONE, TOPIC_STATUS_TONE } from '@/components/Chip';
import { DataTable, type Row } from '@/components/DataTable';
import { MetricTile } from '@/components/MetricTile';
import { TimeSeries } from '@/components/charts/TimeSeries';
import { RefreshButton } from '@/components/RefreshButton';
import { ErrorCard, PageHeader } from '@/components/ui';

export default async function Jezyki({ params, searchParams }: {
  params: Promise<{ lang: string }>; searchParams: Promise<SearchParams>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  const sp = await searchParams;
  const f = readFilters(sp);
  const l = await getLocale();
  const [t, tm, tc, tn, ts, tcat] = await Promise.all([
    getTranslations('languages'), getTranslations('metrics'), getTranslations('common'), getTranslations('nav'),
    getTranslations('statuses'), getTranslations('categories'),
  ]);
  const [res, topics] = await Promise.all([panelApi.metrics(f.current.od, f.current.do), panelApi.topics({ kategoria: 'JEZYK' })]);
  const name = (c: string) => langName(l, c, tc('unknown'));
  const pp = (v: number | null) => v === null ? '–'
    : tm('pp', { value: new Intl.NumberFormat(l, { maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(v) });

  return (
    <>
      <PageHeader title={t('title')} lead={t('lead')}
        crumbs={[{ label: tn('section_monitoring') }, { label: t('title') }]} actions={<RefreshButton />} />
      {!res.ok ? <ErrorCard error={res.error} /> : (() => {
        const m = res.data;
        const codes = sortedEntries(m.rozmowy.wg_jezyka).map(([k]) => k);
        return (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="small">{tc('period', { from: fmtDate(l, m.okres_od, true), to: fmtDate(l, m.okres_do, true) })}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricTile label={t('gap')} value={pp(m.luka_jezykowa_dotarcia)} caption={t('gapDesc')} />
              <MetricTile label={tm('bariery_jezykowe')} value={fmtNumber(l, m.bariery_jezykowe.razem)}
                caption={sortedEntries(m.bariery_jezykowe.wg_jezyka).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(' · ') || undefined} />
              <MetricTile label={t('foreignShare')}
                value={fmtPercent(l, m.rozmowy.razem ? (m.rozmowy.razem - (m.rozmowy.wg_jezyka.pl ?? 0)) / m.rozmowy.razem : null)} />
            </div>
            <TimeSeries kind="bar" title={t('conversationsByLanguage')} firstCol={t('colLanguage')}
              series={[
                { key: 'rozmowy', name: t('colConversations'), color: 'var(--chart-1)' },
                { key: 'bariery', name: t('colBarriers'), color: 'var(--chart-2)' },
              ]}
              data={codes.map((c) => ({ label: name(c), rozmowy: m.rozmowy.wg_jezyka[c] ?? 0, bariery: m.bariery.wg_jezyka[c] ?? 0 }))} />
            <section className="flex flex-col gap-2">
              <h2 className="title">{t('perLanguage')}</h2>
              <DataTable caption={t('perLanguage')} toolbar={false} initialSort={{ key: 'rozmowy', dir: 'desc' }}
                columns={[
                  { key: 'jezyk', label: t('colLanguage') }, { key: 'rozmowy', label: t('colConversations'), num: true },
                  { key: 'dotarlo', label: t('colReached'), num: true }, { key: 'mediana', label: t('colMedian'), num: true },
                  { key: 'powrot', label: t('colReturn'), num: true }, { key: 'bariery', label: t('colBarriers'), num: true },
                  { key: 'jezykowe', label: tm('bariery_jezykowe'), num: true }, { key: 'pytania', label: t('colQuestions'), num: true },
                ]}
                rows={codes.map((c): Row => ({
                  id: c,
                  cells: {
                    jezyk: { v: name(c), text: `${name(c)}${c !== 'nieznany' ? ` (${c.toUpperCase()})` : ''}` },
                    rozmowy: { v: m.rozmowy.wg_jezyka[c] ?? 0 },
                    dotarlo: { v: m.odsetek_dotarlo.wg_jezyka[c] ?? null, text: fmtPercent(l, m.odsetek_dotarlo.wg_jezyka[c]) },
                    mediana: { v: m.mediana_czasu_s.wg_jezyka[c] ?? null, text: fmtDuration(l, m.mediana_czasu_s.wg_jezyka[c]) },
                    powrot: { v: m.ponowne_telefony.wg_jezyka[c] ?? null, text: fmtPercent(l, m.ponowne_telefony.wg_jezyka[c]) },
                    bariery: { v: m.bariery.wg_jezyka[c] ?? 0 },
                    jezykowe: { v: m.bariery_jezykowe.wg_jezyka[c] ?? 0 },
                    pytania: { v: m.pytania_rag.wg_jezyka[c] ?? 0 },
                  },
                }))} />
            </section>
          </div>
        );
      })()}

      <section className="mt-4 flex flex-col gap-2">
        <h2 className="title">{t('langTopics')}</h2>
        {!topics.ok ? <ErrorCard error={topics.error} /> : (
          <DataTable caption={t('langTopics')} initialSort={{ key: 'wynik', dir: 'desc' }} pageSize={10}
            columns={[
              { key: 'tytul', label: t('colTopic') }, { key: 'priorytet', label: tn('priorities'), filter: true },
              { key: 'wynik', label: t('colScore'), num: true }, { key: 'status', label: t('colStatus'), filter: true },
              { key: 'jezyki', label: t('colLanguage') }, { key: 'zgloszenia', label: t('colBarriers'), num: true },
            ]}
            rows={topics.data.map((x): Row => ({
              id: x.id,
              href: `/${lang}/panel/priorytety?temat=${x.id}`,
              cells: {
                tytul: { v: x.tytul },
                priorytet: { v: x.priorytet, chip: { tone: PRIORITY_TONE[x.priorytet], label: x.priorytet } },
                wynik: { v: x.wynik, text: fmtNumber(l, x.wynik, 1) },
                status: { v: x.status, chip: { tone: TOPIC_STATUS_TONE[x.status] ?? 'neutral', label: label(ts, x.status) } },
                jezyki: { v: x.jezyki.join(' · ').toUpperCase() },
                zgloszenia: { v: x.liczba_zgloszen },
              },
            }))} />
        )}
        <p className="small">{label(tcat, 'JEZYK')} · {t('langBarriersLead')}</p>
      </section>
    </>
  );
}
