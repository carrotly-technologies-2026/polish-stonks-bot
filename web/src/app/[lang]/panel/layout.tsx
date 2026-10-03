import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PanelShell } from '@/components/PanelShell';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: 'meta' });
  return { title: t('panelTitle'), robots: { index: false, follow: false } };
}

export default async function PanelLayout({ children, params }: {
  children: ReactNode; params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  return <PanelShell>{children}</PanelShell>;
}
