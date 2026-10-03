import { Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';

/** Top app bar for the public pages (same design system as the panel, no side navigation). */
export function TopBar({ homeHref, children }: { homeHref: string; children?: ReactNode }) {
  const t = useTranslations('common');
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--outline-variant)] bg-surface">
      <div className="mx-auto flex max-w-[72rem] flex-wrap items-center gap-3 px-4 py-2 md:px-6">
        <Link href={homeHref} className="mr-auto flex min-h-10 items-center gap-2 text-[1.125rem] !text-[var(--on-surface)] no-underline">
          <span aria-hidden className="grid size-7 place-items-center rounded-md bg-[var(--primary)] text-sm font-bold text-[var(--on-primary)]">M</span>
          {t('appName')}
        </Link>
        {children}
        <Suspense fallback={null}><LanguageSwitcher /></Suspense>
        <ThemeToggle />
      </div>
    </header>
  );
}
