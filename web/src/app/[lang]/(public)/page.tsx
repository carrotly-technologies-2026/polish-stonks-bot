import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Mic, Phone } from 'lucide-react';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { publicApi } from '@/lib/api';
import { alternates } from '@/lib/seo';
import { fmtDate } from '@/lib/format';
import { KeyNumbers } from '@/components/PublicReport';
import { ElevenLabsWidget } from '@/components/ElevenLabsWidget';
import { DemoLabel, EmptyState, ErrorCard } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return { alternates: alternates(lang, '') };
}

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const [t, tr, tc, locale] = await Promise.all([
    getTranslations('home'), getTranslations('report'), getTranslations('common'), getLocale(),
  ]);
  const [info, pub] = await Promise.all([publicApi.info(), publicApi.latest(lang)]);

  return (
    <div className="flex flex-col gap-6">
      <section className="panel flex flex-col gap-5 px-6 py-10 md:px-12 md:py-14" aria-labelledby="hero">
        <p className="label uppercase">{t('eyebrow')}</p>
        <h1 id="hero" className="text-[2.5rem] leading-[3rem] font-normal md:text-[3.5rem] md:leading-[4rem]">{t('heroTitle')}</h1>
        <p className="muted max-w-2xl text-[1.125rem] leading-[1.75rem]">{t('heroLead')}</p>
        {info.ok ? (
          <div className="flex flex-col gap-2">
            <a href={`tel:${info.data.numer_tel}`} className="btn tnum self-start !min-h-16 !px-8 !text-[1.75rem]">
              <Phone size={28} aria-hidden />
              <span className="sr-only">{t('callLabel')}: </span>
              {info.data.numer}
            </a>
            <p className="small max-w-xl">{t('callNote')}</p>
          </div>
        ) : <ErrorCard error={info.error} />}
      </section>

      {info.ok && info.data.elevenlabs_agent_id && (
        <section className="panel panel-pad flex items-start gap-4" aria-labelledby="widget">
          <Mic size={24} className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden />
          <div>
            <h2 id="widget" className="title">{t('widgetTitle')}</h2>
            <p className="muted">{t('widgetDesc')}</p>
          </div>
          <ElevenLabsWidget agentId={info.data.elevenlabs_agent_id} />
        </section>
      )}

      <section aria-labelledby="liczby" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="liczby" className="headline mr-auto">{t('keyNumbers')}</h2>
          {pub.ok && <DemoLabel show={pub.data.demo || pub.data.metryki.demo} />}
        </div>
        {pub.ok ? (
          <>
            <p className="small">{t('keyNumbersLead')} {tc('period', { from: fmtDate(locale, pub.data.okres_od), to: fmtDate(locale, pub.data.okres_do) })}</p>
            <KeyNumbers m={pub.data.metryki} />
            <Link href={`/${lang}/raport`} className="btn btn-tonal self-start">
              {t('seeReport')} <ChevronRight size={18} aria-hidden />
            </Link>
          </>
        ) : pub.status === 404 ? <EmptyState title={tr('noData')} desc={tr('noDataDesc')} /> : <ErrorCard error={pub.error} />}
      </section>

      <section aria-labelledby="jak" className="flex flex-col gap-3">
        <h2 id="jak" className="headline">{t('howTitle')}</h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {(['how1', 'how2', 'how3'] as const).map((k, i) => (
            <li key={k} className="panel panel-pad flex gap-3">
              <span aria-hidden className="tnum grid size-8 shrink-0 place-items-center rounded-full bg-primary-container font-medium text-on-primary-container">{i + 1}</span>
              <p>{t(k)}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
