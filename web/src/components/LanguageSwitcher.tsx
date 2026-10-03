'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

/** Segmented PL / EN / UK switcher; keeps the current path and query. Choice is stored in a cookie by next-intl. */
export function LanguageSwitcher() {
  const t = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams();
  const query = Object.fromEntries(search.entries());
  return (
    <nav aria-label={t('language')} className="seg">
      {routing.locales.map((l) => (
        <Link key={l} href={{ pathname, query }} locale={l} hrefLang={l} lang={l}
          aria-current={l === locale ? 'page' : undefined} scroll={false}>
          {l.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
