import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PriorityBadge, StatusBadge } from './ui';
import { label } from '@/lib/labels';
import type { Priorytet } from '@/lib/types';

export type TopicRowData = {
  tytul: string; kategoria: string; miejsce: string; dzielnica: string | null; liczba_zgloszen: number;
  priorytet: Priorytet; status: string; wynik: number; jezyki: string[]; demo?: boolean;
};

/** List row: priority chip (with text), title, place, languages "PL · UK", reports, status. */
export function TopicRow({ topic, href, compact = false }: { topic: TopicRowData; href?: string; compact?: boolean }) {
  const tc = useTranslations('categories');
  const tp = useTranslations('priorities');
  const body = (
    <>
      <PriorityBadge p={topic.priorytet} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{topic.tytul}</p>
        <p className="small mt-0.5">
          {label(tc, topic.kategoria)} · {topic.miejsce}{topic.dzielnica ? `, ${topic.dzielnica}` : ''}
          {topic.jezyki.length > 0 && <> · {topic.jezyki.map((j) => j.toUpperCase()).join(' · ')}</>}
          {' · '}{tp('reports', { count: topic.liczba_zgloszen })}
        </p>
      </div>
      {!compact && <StatusBadge status={topic.status} />}
      {href && <ChevronRight size={18} className="muted shrink-0" aria-hidden />}
    </>
  );
  const cls = 'flex min-h-12 items-center gap-3 px-5 py-2.5';
  return href ? (
    <Link href={href} scroll={false} className={`${cls} !text-[var(--on-surface)] no-underline hover:bg-[var(--hover)]`}>{body}</Link>
  ) : <div className={cls}>{body}</div>;
}
