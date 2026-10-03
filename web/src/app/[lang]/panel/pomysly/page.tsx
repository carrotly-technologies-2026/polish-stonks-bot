import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { panelApi } from '@/lib/api';
import { fmtDate, fmtNumber } from '@/lib/format';
import { CATEGORY_KEYS } from '@/lib/rops';
import { DataTable, type Column, type Row } from '@/components/DataTable';
import { MetricTile } from '@/components/MetricTile';
import { RefreshButton } from '@/components/RefreshButton';
import { EmptyState, ErrorCard, PageHeader } from '@/components/ui';

/** Idea cards sent from the idea creator in the ROPS chat widget. Contact data is not shown: the panel is public. */
export default async function Pomysly({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const l = await getLocale();
  const [t, tc, tn, ti, tcat] = await Promise.all([
    getTranslations('ideas'), getTranslations('common'), getTranslations('nav'), getTranslations('rops.idea'),
    getTranslations('rops.cat'),
  ]);
  const res = await panelApi.ideas();
  const list = res.ok ? res.data : [];
  const audience = (odbiorcy: string[], dlaKogo: string) =>
    [...odbiorcy.map((c) => { const k = CATEGORY_KEYS[c]; return k && tcat.has(k) ? tcat(k) : c; }), dlaKogo].filter(Boolean);
  const stage = (e: string) => (ti.has(`stage_${e}`) ? ti(`stage_${e}`) : e);
  const type = (v: string) => (ti.has(`type_${v}`) ? ti(`type_${v}`) : v);

  const columns: Column[] = [
    { key: 'utworzono', label: t('colTime') },
    { key: 'numer', label: t('colNumber') },
    { key: 'tytul', label: t('colTitle') },
    { key: 'typ', label: t('colType'), filter: true },
    { key: 'etap', label: t('colStage'), filter: true },
    { key: 'dla_kogo', label: t('colAudience') },
    { key: 'kontakt', label: t('colContact'), filter: true },
  ];
  const rows: Row[] = list.map((p) => ({
    id: p.id,
    cells: {
      utworzono: { v: p.utworzono, text: fmtDate(l, p.utworzono, true) },
      numer: { v: p.numer, mono: true },
      tytul: { v: p.tytul },
      typ: { v: p.typ, text: type(p.typ) },
      etap: { v: p.etap, text: stage(p.etap) },
      dla_kogo: { v: audience(p.odbiorcy, p.dla_kogo).join(', ') || null },
      kontakt: {
        v: p.ma_kontakt ? 'tak' : 'nie',
        chip: p.ma_kontakt ? { tone: 'success', label: tc('yes') } : { tone: 'neutral', label: tc('no') },
      },
    },
    details: {
      title: p.tytul,
      items: [
        { label: t('colNumber'), value: p.numer },
        { label: t('colType'), value: type(p.typ) },
        { label: ti('f_opis'), value: p.opis },
        { label: ti('f_istota'), value: p.istota },
        { label: t('colStage'), value: stage(p.etap) },
        { label: t('colTime'), value: fmtDate(l, p.utworzono, true) },
      ],
      list: { label: t('colAudience'), items: audience(p.odbiorcy, p.dla_kogo) },
    },
  }));

  return (
    <>
      <PageHeader title={t('title')} lead={t('lead')}
        crumbs={[{ label: tn('section_data') }, { label: t('title') }]} actions={<RefreshButton />} />
      {!res.ok ? <ErrorCard error={res.error} /> : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricTile label={t('total')} value={fmtNumber(l, list.length)} />
            <MetricTile label={ti('type_pomysl')} value={fmtNumber(l, list.filter((p) => p.typ === 'pomysl').length)} />
            <MetricTile label={ti('type_dobra_praktyka')} value={fmtNumber(l, list.filter((p) => p.typ === 'dobra_praktyka').length)} />
            <MetricTile label={t('withContact')} value={fmtNumber(l, list.filter((p) => p.ma_kontakt).length)} caption={t('contactNote')} />
          </div>
          {list.length === 0
            ? <EmptyState title={t('emptyTitle')} desc={t('emptyDesc')} />
            : <DataTable columns={columns} rows={rows} caption={t('title')} initialSort={{ key: 'utworzono', dir: 'desc' }} />}
        </div>
      )}
    </>
  );
}
