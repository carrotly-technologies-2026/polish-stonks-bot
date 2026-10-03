'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  BookOpen, Database, ExternalLink, FileSpreadsheet, FileText, Gauge, Info, Languages, ListOrdered,
  Megaphone, Menu, Phone, Workflow,
} from 'lucide-react';
import { globalQuery } from '@/lib/filters';
import { GlobalFilters } from './GlobalFilters';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';

const SECTIONS = [
  { key: 'monitoring', items: [{ seg: '', key: 'overview', Icon: Gauge }, { seg: '/jezyki', key: 'languages', Icon: Languages }] },
  { key: 'data', items: [{ seg: '/priorytety', key: 'priorities', Icon: ListOrdered }, { seg: '/rozmowy', key: 'conversations', Icon: Phone }] },
  { key: 'pipeline', items: [{ seg: '/pipeline', key: 'pipeline', Icon: Workflow }, { seg: '/wiedza', key: 'knowledge', Icon: BookOpen }] },
  { key: 'publishing', items: [{ seg: '/publikacje', key: 'publications', Icon: Megaphone }, { seg: '/otwarte-dane', key: 'openData', Icon: Database }] },
] as const;

function SideNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const sp = useSearchParams();
  const base = `/${locale}/panel`;
  const q = globalQuery(sp);
  return (
    <nav aria-label={t('main')} className="flex flex-col gap-4 p-3">
      {SECTIONS.map((s) => (
        <div key={s.key}>
          {!collapsed && <p className="label px-4 pb-1 uppercase">{t(`section_${s.key}`)}</p>}
          <ul className="flex flex-col gap-0.5">
            {s.items.map(({ seg, key, Icon }) => (
              <li key={key}>
                <Link href={base + seg + q} onClick={onNavigate} aria-current={pathname === base + seg ? 'page' : undefined}
                  className={`nav-item ${collapsed ? 'justify-center !px-0' : ''}`} title={collapsed ? t(key) : undefined}>
                  <Icon size={20} strokeWidth={2} aria-hidden />
                  <span className={collapsed ? 'sr-only' : ''}>{t(key)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div>
        {!collapsed && <p className="label px-4 pb-1 uppercase">{t('section_links')}</p>}
        <ul className="flex flex-col gap-0.5">
          {[
            { href: `/${locale}/raport`, key: 'publicReport', Icon: FileText },
            { href: `/${locale}/info`, key: 'citizenPage', Icon: Info },
            { href: '/api/open-data/metryki.csv', key: 'csvMetrics', Icon: FileSpreadsheet },
            { href: '/api/open-data/tematy.csv', key: 'csvTopics', Icon: FileSpreadsheet },
          ].map(({ href, key, Icon }) => (
            <li key={key}>
              <a href={href} className={`nav-item ${collapsed ? 'justify-center !px-0' : ''}`} title={collapsed ? t(key) : undefined}>
                <Icon size={20} strokeWidth={2} aria-hidden />
                <span className={collapsed ? 'sr-only' : ''}>{t(key)}</span>
                {!collapsed && <ExternalLink size={14} className="ml-auto opacity-60" aria-hidden />}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

/** Cloud-console app shell: top app bar with global filters + collapsible, grouped left navigation. */
export function PanelShell({ children }: { children: ReactNode }) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  useEffect(() => {
    try { setCollapsed(localStorage.getItem('nav-collapsed') === '1'); } catch {}
  }, []);
  const toggle = () => {
    if (window.matchMedia('(min-width: 64rem)').matches) {
      setCollapsed((c) => { try { localStorage.setItem('nav-collapsed', c ? '0' : '1'); } catch {} return !c; });
    } else setDrawer((d) => !d);
  };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-[var(--outline-variant)] bg-surface">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-2 py-2 md:px-3">
          <button type="button" className="icon-btn" onClick={toggle} aria-label={t('toggleNav')} aria-expanded={drawer || !collapsed}>
            <Menu size={22} aria-hidden />
          </button>
          <Link href={`/${locale}/panel`} className="mr-auto flex min-h-10 items-center gap-2 text-[1.125rem] !text-[var(--on-surface)] no-underline">
            <span aria-hidden className="grid size-7 place-items-center rounded-md bg-[var(--primary)] text-sm font-bold text-[var(--on-primary)]">H</span>
            <span>{tc('appName')} <span className="muted">· {t('analytics')}</span></span>
          </Link>
          <Suspense fallback={null}><GlobalFilters /></Suspense>
          <Suspense fallback={null}><LanguageSwitcher /></Suspense>
          <ThemeToggle />
        </div>
      </header>
      <div className="flex">
        <aside className={`sticky top-[3.5rem] hidden h-[calc(100dvh-3.5rem)] shrink-0 overflow-y-auto border-r border-[var(--outline-variant)] bg-surface lg:block ${collapsed ? 'w-[4.5rem]' : 'w-64'}`}>
          <Suspense fallback={null}><SideNav collapsed={collapsed} /></Suspense>
        </aside>
        {drawer && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button type="button" className="absolute inset-0 bg-[var(--scrim)]" aria-label={tc('close')} onClick={() => setDrawer(false)} />
            <aside className="slide-in absolute inset-y-0 left-0 w-72 overflow-y-auto bg-surface shadow-[var(--shadow)]">
              <Suspense fallback={null}><SideNav collapsed={false} onNavigate={() => setDrawer(false)} /></Suspense>
            </aside>
          </div>
        )}
        <main id="main" className="min-w-0 flex-1 px-4 pt-4 pb-16 md:px-6">{children}</main>
      </div>
    </div>
  );
}
