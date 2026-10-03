import { useLocale, useTranslations } from 'next-intl';
import { BarList } from './charts/BarList';
import { Markdown } from './Markdown';
import { MetricTile } from './MetricTile';
import { TopicRow } from './TopicRow';
import { DemoLabel, Muted, Panel } from './ui';
import { fmtDate, fmtDuration, fmtNumber, fmtPercent, sortedEntries } from '@/lib/format';
import { label } from '@/lib/labels';
import type { Metryki, Publikacja } from '@/lib/types';

/** The 4 headline numbers shown on the home page. */
export function KeyNumbers({ m }: { m: Metryki }) {
  const t = useTranslations('metrics');
  const l = useLocale();
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricTile label={t('rozmowy')} value={fmtNumber(l, m.rozmowy.razem)} />
      <MetricTile label={t('odsetek_dotarlo')} value={fmtPercent(l, m.odsetek_dotarlo.razem)} />
      <MetricTile label={t('bariery')} value={fmtNumber(l, m.bariery.razem)} />
      <MetricTile label={t('naprawione')} value={fmtNumber(l, m.naprawione.razem)} />
    </div>
  );
}

/** A publication exactly as residents see it (used on /raport and in the panel preview). */
export function PublicReport({ pub }: { pub: Publikacja }) {
  const t = useTranslations('report');
  const tm = useTranslations('metrics');
  const tc = useTranslations('common');
  const tcat = useTranslations('categories');
  const l = useLocale();
  const m = pub.metryki;
  const fallback = !!pub.raport_md && l !== 'pl' && !pub.jezyki_raportu.includes(l);
  const days = (v: number | null) => (v === null ? '–' : tm('days', { value: fmtNumber(l, v, 1) }));
  const topics = [...pub.tematy].sort((a, b) => a.priorytet.localeCompare(b.priorytet) || b.wynik - a.wynik);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="title">{tc('period', { from: fmtDate(l, pub.okres_od), to: fmtDate(l, pub.okres_do) })}</p>
        <DemoLabel show={pub.demo || m.demo} />
        <p className="small w-full">
          {pub.opublikowano ? t('publishedAt', { date: fmtDate(l, pub.opublikowano, true) }) : t('notPublished')}
          {' · '}{t('definitions', { version: pub.wersja_definicji })}
        </p>
      </div>

      <h2 className="title">{t('metrics')}</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label={tm('rozmowy')} value={fmtNumber(l, m.rozmowy.razem)} />
        <MetricTile label={tm('odsetek_dotarlo')} value={fmtPercent(l, m.odsetek_dotarlo.razem)} />
        <MetricTile label={tm('mediana_czasu_s')} value={fmtDuration(l, m.mediana_czasu_s.razem)} />
        <MetricTile label={tm('bariery')} value={fmtNumber(l, m.bariery.razem)} />
        <MetricTile label={tm('tematy_p1')} value={fmtNumber(l, m.tematy_p1.razem)} />
        <MetricTile label={tm('naprawione')} value={fmtNumber(l, m.naprawione.razem)} />
        <MetricTile label={tm('udzial_grup_wrazliwych')} value={fmtPercent(l, m.udzial_grup_wrazliwych)} />
        <MetricTile label={tm('czas_reakcji_dni')} value={days(m.czas_reakcji_dni.razem)} />
      </div>
      <BarList title={t('barriersByCategory')} emptyText={tc('none')}
        rows={sortedEntries(m.bariery.wg_kategorii).map(([k, v]) => ({ label: label(tcat, k), value: v }))}
        format={(n) => fmtNumber(l, n)} />

      <Panel title={t('topics')} sub={t('topicsLead')} pad={false} id="tematy">
        {topics.length === 0 ? <p className="muted panel-pad">{t('noTopics')}</p> : (
          <ul className="divide-y divide-[var(--outline-variant)]">
            {topics.map((topic, i) => <li key={i}><TopicRow topic={topic} /></li>)}
          </ul>
        )}
      </Panel>

      <Panel title={t('dailyReport')} id="raport-dnia">
        {fallback && <p className="small mb-3">{t('reportLangFallback')}</p>}
        {pub.raport_md ? <Markdown>{pub.raport_md}</Markdown> : <Muted>{t('noDailyReport')}</Muted>}
      </Panel>
    </div>
  );
}
