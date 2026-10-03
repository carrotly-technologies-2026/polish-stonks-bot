import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';

/** hreflang alternates for a public path (path without locale, e.g. "/raport"). */
export function alternates(lang: string, path: string): Metadata['alternates'] {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = `/${l}${path}`;
  languages['x-default'] = `/${routing.defaultLocale}${path}`;
  return { canonical: `/${lang}${path}`, languages };
}
