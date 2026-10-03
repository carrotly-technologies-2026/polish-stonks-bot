import Link from 'next/link';
import { ExternalLink, Plus } from 'lucide-react';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { panelApi } from '@/lib/api';
import { param, type SearchParams } from '@/lib/filters';
import { fmtDate } from '@/lib/format';
import { demoAction, jobAction } from '@/app/actions';
import { ActionButton } from '@/components/ActionButton';
import { DataTable, type Row } from '@/components/DataTable';
import { PublicReport } from '@/components/PublicReport';
import { PublishBar } from '@/components/PublishBar';
import { RefreshButton } from '@/components/RefreshButton';
import { ErrorCard, Muted, PageHeader, Panel } from '@/components/ui';

export default async function Publikacje({ params, searchParams }: {
  params: Promise<{ lang: string }>; searchParams: Promise<SearchParams>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  const sp = await searchParams;
  const l = await getLocale();
  const [t, tc, tn] = await Promise.all([getTranslations('publications'), getTranslations('common'), getTranslations('nav')]);
  const drafts = await panelApi.drafts();
  const selectedId = param(sp, 'id') ?? (drafts.ok ? drafts.data[0]?.id : undefined);
  const preview = selectedId ? await panelApi.publication(selectedId, lang) : null;
  const isDraft = preview?.ok && preview.data.status === 'szkic';

  return (
    <>
      <PageHeader title={t('title')} lead={t('lead')}
        crumbs={[{ label: tn('section_publishing') }, { label: t('title') }]}
        actions={<>
          <ActionButton action={jobAction} fields={{ job: 'raport-dzienny' }} variant="primary">
            <Plus size={18} aria-hidden />{t('generateDraft')}
          </ActionButton>
          <ActionButton action={jobAction} fields={{ job: 'tematy' }}>{t('recalcTopics')}</ActionButton>
          <ActionButton action={demoAction} fields={{ op: 'seed' }}>{t('seedDemo')}</ActionButton>
          <ActionButton action={demoAction} fields={{ op: 'delete' }} variant="danger" confirm={t('deleteDemoConfirm')}>{t('deleteDemo')}</ActionButton>
          <Link href={`/${lang}/raport`} className="btn btn-text">{t('viewPublic')} <ExternalLink size={16} aria-hidden /></Link>
          <RefreshButton />
        </>} />

      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-2">
          <h2 className="title">{t('drafts')}</h2>
          {!drafts.ok ? <ErrorCard error={drafts.error} /> : drafts.data.length === 0 ? <Muted>{t('noDrafts')}</Muted> : (
            <DataTable caption={t('drafts')} toolbar={false} pageSize={10} selectedId={selectedId}
              initialSort={{ key: 'utworzono', dir: 'desc' }}
              columns={[
                { key: 'okres', label: t('colPeriod') }, { key: 'utworzono', label: t('colCreated') },
                { key: 'tematy', label: t('colTopics'), num: true }, { key: 'demo', label: tc('demoCol') },
              ]}
              rows={drafts.data.map((d): Row => ({
                id: d.id,
                href: `/${lang}/panel/publikacje?id=${d.id}`,
                cells: {
                  okres: { v: d.okres_od, text: `${fmtDate(l, d.okres_od)} – ${fmtDate(l, d.okres_do)}` },
                  utworzono: { v: d.utworzono, text: fmtDate(l, d.utworzono, true) },
                  tematy: { v: d.liczba_tematow },
                  demo: { v: String(d.demo), chip: d.demo ? { tone: 'demo', label: tc('demo') } : { tone: 'neutral', label: tc('no') } },
                },
              }))} />
          )}
        </section>

        {preview && (
          <Panel title={t('preview')} sub={t('previewLead')} id="podglad">
            {preview.ok ? <PublicReport pub={preview.data} /> : <ErrorCard error={preview.error} />}
          </Panel>
        )}
      </div>

      {isDraft && preview.ok && (
        <PublishBar key={preview.data.id} id={preview.data.id}
          text={t('publishBarText', { date: fmtDate(l, preview.data.utworzono, true) })} />
      )}
    </>
  );
}
