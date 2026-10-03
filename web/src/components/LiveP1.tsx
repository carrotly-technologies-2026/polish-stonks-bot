'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { TopicRow } from './TopicRow';
import type { Temat } from '@/lib/types';

/** Polls /api/panel/p1 every 10 s; new topics are announced via aria-live="polite". */
export function LiveP1({ initial, jezyk, lang }: { initial: Temat[]; jezyk?: string; lang: string }) {
  const t = useTranslations('panel');
  const tc = useTranslations('common');
  const f = useFormatter();
  const [topics, setTopics] = useState(initial);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [failed, setFailed] = useState(false);
  const [announce, setAnnounce] = useState('');
  const known = useRef(new Set(initial.map((x) => x.id)));

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/panel/p1${jezyk ? `?jezyk=${jezyk}` : ''}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const data: Temat[] = await res.json();
        if (!alive) return;
        const fresh = data.filter((x) => !known.current.has(x.id));
        fresh.forEach((x) => known.current.add(x.id));
        if (fresh.length) setAnnounce(fresh.map((x) => t('liveNew', { title: x.tytul })).join('. '));
        setTopics(data);
        setUpdated(new Date());
        setFailed(false);
      } catch {
        if (alive) setFailed(true);
      }
    };
    const id = setInterval(tick, 10_000);
    return () => { alive = false; clearInterval(id); };
  }, [jezyk, t]);

  return (
    <div>
      <p className="sr-only" aria-live="polite" role="status">{announce}</p>
      {topics.length === 0 ? (
        <p className="muted panel-pad">{t('liveP1Empty')}</p>
      ) : (
        <ul className="divide-y divide-[var(--outline-variant)]">
          {topics.map((x) => (
            <li key={x.id} className="fade-in">
              <TopicRow compact topic={x} href={`/${lang}/panel/priorytety?temat=${x.id}${jezyk ? `&jezyk=${jezyk}` : ''}`} />
            </li>
          ))}
        </ul>
      )}
      <p className="small border-t border-[var(--outline-variant)] px-5 py-2" aria-live="polite">
        {failed ? t('liveError') : updated ? tc('updated', { time: f.dateTime(updated, { timeStyle: 'medium' }) }) : t('liveP1Lead')}
      </p>
    </div>
  );
}
