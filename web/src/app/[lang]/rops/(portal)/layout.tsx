import { Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowLeft, ExternalLink, FlaskConical, LibraryBig, Search } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ROPS_LINKS } from '@/lib/rops';

const SECTIONS = [
  { k: 'innowacje', href: ROPS_LINKS.innowacje },
  { k: 'raporty', href: ROPS_LINKS.raporty },
  { k: 'mapa', href: ROPS_LINKS.mapa },
  { k: 'publikacje', href: ROPS_LINKS.publikacje },
  { k: 'kontakt', href: ROPS_LINKS.kontakt },
] as const;

/** Demo portal shell: ROPS palette via `.rops-theme` (no ROPS logo or graphics) and a disclaimer on every page. */
export default async function RopsLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const t = await getTranslations('rops');
  const base = `/${lang}/rops`;
  return (
    <div className="rops-theme contents">
      <p role="note" className="flex items-start justify-center gap-2 bg-[var(--warning-container)] px-4 py-2 text-center text-[0.8125rem] leading-[1.25rem] text-[var(--on-surface)]">
        <FlaskConical size={16} className="mt-0.5 shrink-0 text-[var(--warning)]" aria-hidden />
        <span>{t('disclaimer')}</span>
      </p>
      <header className="sticky top-0 z-30 border-b border-[var(--outline-variant)] bg-surface">
        <div className="mx-auto flex max-w-[72rem] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 md:px-6">
          <Link href={base} className="mr-auto flex min-h-10 min-w-0 items-center gap-2 !text-[var(--on-surface)] no-underline">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--primary)] text-[var(--on-primary)]"><LibraryBig size={20} /></span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="text-[1rem] font-medium sm:text-[1.0625rem]">{t('brand')}</span>
              <span className="small">{t('brandSub')}</span>
            </span>
          </Link>
          <nav aria-label={t('navLabel')} className="flex flex-wrap gap-1">
            <Link href={base} className="btn btn-text"><ArrowLeft size={16} aria-hidden />{t('embed.backToDemo')}</Link>
            <Link href={`${base}/szukaj`} className="btn btn-text"><Search size={16} aria-hidden />{t('navSearch')}</Link>
          </nav>
          <Suspense fallback={null}><LanguageSwitcher /></Suspense>
          <ThemeToggle />
        </div>
        <nav aria-label={t('sectionsLabel')} className="border-t border-[var(--outline-variant)]">
          <ul className="relative mx-auto flex max-w-[72rem] gap-1 overflow-x-auto px-2 py-1 md:px-4">
            {SECTIONS.map(({ k, href }) => (
              <li key={k} className="relative shrink-0">
                <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-text !min-h-9 !px-3 !text-[0.8125rem] !text-[var(--on-surface)]">
                  {t(`sec.${k}`)}<ExternalLink size={12} className="opacity-60" aria-hidden /><span className="sr-only"> ({t('external')})</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-[72rem] px-4 pt-6 pb-16 md:px-6">{children}</main>
      <footer className="border-t border-[var(--outline-variant)] bg-surface">
        <div className="mx-auto flex max-w-[72rem] flex-col gap-4 px-4 py-8 md:px-6">
          <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-2">
              <p className="title">{t('brand')}</p>
              <p className="muted">{t('footerAbout')}</p>
            </div>
            <div>
              <p className="label pb-2 uppercase">{t('footerRops')}</p>
              <ul className="flex flex-col gap-1">
                {SECTIONS.map(({ k, href }) => (
                  <li key={k}><a href={href} target="_blank" rel="noopener noreferrer">{t(`sec.${k}`)}<span className="sr-only"> ({t('external')})</span></a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label pb-2 uppercase">{t('footerProject')}</p>
              <ul className="flex flex-col gap-1">
                <li><Link href={base}>{t('embed.backToDemo')}</Link></li>
                <li><Link href={`${base}/szukaj`}>{t('navSearch')}</Link></li>
                <li><Link href={`/${lang}/info`}>{t('footerMayai')}</Link></li>
                <li><Link href={`/${lang}/panel`}>{t('footerPanel')}</Link></li>
              </ul>
            </div>
          </div>
          <p role="note" className="small border-t border-[var(--outline-variant)] pt-4">{t('disclaimer')}</p>
        </div>
      </footer>
    </div>
  );
}
