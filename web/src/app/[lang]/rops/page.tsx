import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { publicApi } from '@/lib/api';
import { alternates } from '@/lib/seo';
import { DemoRibbon, RopsFrame } from '@/components/rops/RopsFrame';
import { RopsWidget } from '@/components/rops/RopsWidget';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: 'rops' });
  return { title: t('metaTitle'), description: t('metaDesc'), alternates: alternates(lang, '/rops') };
}

/**
 * HackYeah demo: the assistant as it would look embedded on rops.krakow.pl – the real site in a full-viewport
 * frame, our chat widget bottom-right and a small "this is a demo" pill. The ROPS content itself is untouched.
 */
export default async function RopsEmbedDemo({ params, searchParams }: {
  params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  const sp = await searchParams;
  const pytanie = typeof sp.pytanie === 'string' ? sp.pytanie.slice(0, 500) : undefined;
  const info = await publicApi.info();
  const i = info.ok ? info.data : null;
  return (
    <>
      <RopsFrame />
      <DemoRibbon lang={lang} />
      <RopsWidget key={pytanie ?? 'w'} lang={lang} initialQuestion={pytanie}
        phone={i?.numer ?? null} phoneTel={i?.numer_tel ?? null} />
    </>
  );
}
