'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { CalendarRange } from 'lucide-react';
import { CONVERSATION_LANGS, RANGES } from '@/lib/filters';

const RANGE_KEY = { '24h': 'r24h', '7d': 'r7d', '30d': 'r30d' } as const;

/** Global time-range picker (24 h / 7 d / 30 d / custom) and conversation-language filter, kept in the URL. */
export function GlobalFilters() {
  const t = useTranslations('filters');
  const pathname = usePathname();
  const sp = useSearchParams();
  const router = useRouter();
  const zakres = sp.get('zakres') ?? '7d';
  const jezyk = sp.get('jezyk') ?? '';
  const [od, setOd] = useState(sp.get('od') ?? '');
  const [d, setD] = useState(sp.get('do') ?? '');

  const href = (patch: Record<string, string | null>) => {
    const s = new URLSearchParams(sp.toString());
    s.delete('temat');
    for (const [k, v] of Object.entries(patch)) if (v === null) s.delete(k); else s.set(k, v);
    const q = s.toString();
    return q ? `${pathname}?${q}` : pathname;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <nav aria-label={t('range')} className="seg">
        {RANGES.map((r) => (
          <Link key={r} href={href({ zakres: r === '7d' ? null : r, od: null, do: null })} scroll={false}
            aria-current={zakres === r ? 'page' : undefined}>{t(RANGE_KEY[r])}</Link>
        ))}
        <details className="relative">
          <summary className={`flex min-h-9 cursor-pointer list-none items-center gap-1 px-3 text-[0.8125rem] font-medium ${zakres === 'custom' ? 'bg-selected' : ''}`}
            aria-current={zakres === 'custom' ? 'page' : undefined}>
            <CalendarRange size={16} aria-hidden />
            {zakres === 'custom' && sp.get('od') ? `${sp.get('od')} – ${sp.get('do')}` : t('custom')}
          </summary>
          <form className="panel absolute right-0 z-40 mt-1 flex w-64 flex-col gap-2 p-3 shadow-[var(--shadow)]"
            onSubmit={(e) => { e.preventDefault(); if (od && d) router.push(href({ zakres: 'custom', od, do: d }), { scroll: false }); }}>
            <label className="flex flex-col gap-1"><span className="label">{t('from')}</span>
              <input type="date" className="field" value={od} max={d || undefined} onChange={(e) => setOd(e.target.value)} required />
            </label>
            <label className="flex flex-col gap-1"><span className="label">{t('to')}</span>
              <input type="date" className="field" value={d} min={od || undefined} onChange={(e) => setD(e.target.value)} required />
            </label>
            <button type="submit" className="btn">{t('apply')}</button>
          </form>
        </details>
      </nav>
      <label className="flex items-center gap-2">
        <span className="label">{t('language')}</span>
        <select className="field !min-h-9 !w-auto !rounded-full !py-0" value={jezyk}
          onChange={(e) => router.push(href({ jezyk: e.target.value || null }), { scroll: false })}>
          <option value="">{t('allLanguages')}</option>
          {CONVERSATION_LANGS.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
      </label>
    </div>
  );
}
