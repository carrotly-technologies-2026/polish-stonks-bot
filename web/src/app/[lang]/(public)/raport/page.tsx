import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Download } from 'lucide-react';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { publicApi } from '@/lib/api';
import { alternates } from '@/lib/seo';
import { fmtDate } from '@/lib/format';
import { param, type SearchParams } from '@/lib/filters';
import { OPEN_FILES } from '@/lib/openData';
import { PublicReport } from '@/components/PublicReport';
import { Chip } from '@/components/Chip';
import { EmptyState, ErrorCard, Muted, PageHeader, Panel } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: 'meta' });
  return { title: t('reportTitle'), alternates: alternates(lang, '/raport') };
}

export default async function Raport({ params, searchParams }: {
  params: Promise<{ lang: string }>; searchParams: Promise<SearchParams>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  const id = param(await searchParams, 'id');
  const [t, tn, locale] = await Promise.all([getTranslations('report'), getTranslations('nav'), getLocale()]);
  const [pub, archive] = await Promise.all([id ? publicApi.byId(id, lang) : publicApi.latest(lang), publicApi.archive()]);
  const currentId = pub.ok ? pub.data.id : null;
  const latestId = archive.ok ? archive.data[0]?.id : null;

  return (
    <>
      <PageHeader title={t('title')} lead={t('lead')} crumbs={[{ label: tn('home'), href: `/${lang}` }, { label: t('title') }]} />
      <div className="flex flex-col gap-4">
        {pub.ok ? <PublicReport pub={pub.data} /> : pub.status === 404 ? (
          <EmptyState title={t('noData')} desc={t('noDataDesc')} />
        ) : <ErrorCard error={pub.error} />}

        {pub.ok && (
          <Panel title={t('downloads')} sub={t('downloadsLead')} id="dane">
            <ul className="flex flex-wrap gap-2">
              {OPEN_FILES.map(([file, key]) => (
                <li key={file}>
                  <a href={`/api/open-data/${file}`} className="btn btn-outline" download={`halohub-${file}`}>
                    <Download size={18} aria-hidden /> {t(key)}
                  </a>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel title={t('archive')} pad={false} id="archiwum">
          {!archive.ok ? <div className="panel-pad"><ErrorCard error={archive.error} /></div> : archive.data.length === 0 ? (
            <Muted>{t('archiveEmpty')}</Muted>
          ) : (
            <ul className="divide-y divide-[var(--outline-variant)]">
              {archive.data.map((a) => (
                <li key={a.id}>
                  <Link href={a.id === latestId ? `/${lang}/raport` : `/${lang}/raport?id=${a.id}`}
                    aria-current={a.id === currentId ? 'page' : undefined}
                    className={`flex min-h-12 items-center gap-3 px-5 py-2.5 !text-[var(--on-surface)] no-underline hover:bg-[var(--hover)] ${a.id === currentId ? 'bg-selected' : ''}`}>
                    <div className="flex-1">
                      <p className="font-medium">{fmtDate(locale, a.okres_od)} – {fmtDate(locale, a.okres_do)}</p>
                      <p className="small">{t('publishedAt', { date: fmtDate(locale, a.opublikowano, true) })} · {t('topicsCount', { count: a.liczba_tematow })}</p>
                    </div>
                    {a.id === latestId && <Chip tone="success" label={t('current')} />}
                    <ChevronRight size={18} className="muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
