import type { ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, ChevronRight, Inbox } from 'lucide-react';
import type { Priorytet } from '@/lib/types';
import { Chip, PRIORITY_TONE, TOPIC_STATUS_TONE } from './Chip';

export type Crumb = { label: string; href?: string };

/** Breadcrumbs + page title + action buttons row (cloud-console style). */
export function PageHeader({ title, lead, crumbs, actions }: {
  title: string; lead?: ReactNode; crumbs?: Crumb[]; actions?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col gap-2">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="small flex flex-wrap items-center gap-1">
            {crumbs.map((c, i) => (
              <li key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={14} aria-hidden />}
                {c.href ? <Link href={c.href} className="hover:underline">{c.label}</Link> : <span aria-current="page">{c.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="headline mr-auto">{title}</h1>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {lead && <p className="muted max-w-3xl">{lead}</p>}
    </header>
  );
}

/** Surface with optional header row (title, subtitle, trailing actions). */
export function Panel({ title, sub, action, children, className = '', pad = true, id }: {
  title?: string; sub?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean; id?: string;
}) {
  const hid = id ? `${id}-h` : undefined;
  return (
    <section className={`panel ${className}`} aria-labelledby={hid}>
      {title && (
        <div className="panel-head">
          <div>
            <h2 id={hid} className="title">{title}</h2>
            {sub && <p className="small mt-0.5">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={pad ? 'panel-pad' : ''}>{children}</div>
    </section>
  );
}

export function DemoLabel({ show = true }: { show?: boolean }) {
  const t = useTranslations('common');
  if (!show) return null;
  return <Chip tone="demo" label={t('demo')} title={t('demoHint')} />;
}

export function PriorityBadge({ p, long = false }: { p: Priorytet; long?: boolean }) {
  const t = useTranslations('priority');
  return <Chip tone={PRIORITY_TONE[p]} label={long ? t(p) : p} />;
}

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('statuses');
  return <Chip tone={TOPIC_STATUS_TONE[status] ?? 'neutral'} label={t.has(status) ? t(status) : status} />;
}

export function ErrorCard({ error }: { error?: string }) {
  const t = useTranslations('errors');
  return (
    <div role="alert" className="panel panel-pad flex items-start gap-3 !border-[var(--error)]">
      <AlertTriangle className="mt-0.5 shrink-0 text-[var(--error)]" size={22} strokeWidth={2} aria-hidden />
      <div className="flex flex-col gap-1">
        <h2 className="title">{t('backendTitle')}</h2>
        <p className="muted">{t('backendDesc')}</p>
        {error && <p className="small font-mono">{t('details', { error })}</p>}
      </div>
    </div>
  );
}

export function EmptyState({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="panel flex flex-col items-center gap-2 px-6 py-10 text-center">
      <Inbox size={32} strokeWidth={1.5} className="muted" aria-hidden />
      <p className="title">{title}</p>
      {desc && <p className="small max-w-md">{desc}</p>}
    </div>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <p className="panel panel-pad muted">{children}</p>;
}
