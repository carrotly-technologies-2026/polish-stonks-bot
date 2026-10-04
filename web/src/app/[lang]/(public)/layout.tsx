import type { ReactNode } from 'react';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { TopBar } from '@/components/TopBar';

export default async function PublicLayout({ children, params }: {
  children: ReactNode; params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  const t = await getTranslations('nav');
  return (
    <>
      <TopBar homeHref={`/${lang}/panel`}>
        <nav aria-label={t('main')} className="flex flex-wrap gap-1">
          <Link href={`/${lang}/panel`} className="btn btn-text">{t('panel')}</Link>
          <Link href={`/${lang}/info`} className="btn btn-text">{t('citizenPage')}</Link>
          <Link href={`/${lang}/raport`} className="btn btn-text">{t('report')}</Link>
          <Link href={`/${lang}/rops`} className="btn btn-text">{t('rops')}</Link>
        </nav>
      </TopBar>
      <main id="main" className="mx-auto max-w-[72rem] px-4 pt-6 pb-16 md:px-6">{children}</main>
    </>
  );
}
