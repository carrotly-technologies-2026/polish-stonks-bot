'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ExternalLink, FlaskConical, X } from 'lucide-react';

export const ROPS_SITE = 'https://rops.krakow.pl/';
const RIBBON_KEY = 'rops-ribbon-hidden';
const LOAD_TIMEOUT_MS = 12000;

/**
 * Full-viewport preview of rops.krakow.pl. The neutral fallback (with a direct link) sits underneath and is
 * shown on top when the frame errors or does not load in time (e.g. the site starts refusing to be framed).
 */
export function RopsFrame() {
  const t = useTranslations('rops.embed');
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading');

  useEffect(() => {
    if (state !== 'loading') return;
    const id = window.setTimeout(() => setState('failed'), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [state]);

  return (
    <main id="main" className="fixed inset-0 overflow-hidden bg-[var(--surface-2)]">
      <div className={`absolute inset-0 grid place-items-center p-6 text-center ${state === 'failed' ? 'z-10 bg-[var(--surface-2)]' : ''}`}>
        <div className="flex max-w-md flex-col items-center gap-3">
          {state === 'failed' ? (
            <>
              <p className="title">{t('fallbackTitle')}</p>
              <p className="muted">{t('fallbackDesc')}</p>
              <a href={ROPS_SITE} target="_blank" rel="noopener noreferrer" className="btn">
                <ExternalLink size={16} aria-hidden />{t('fallbackOpen')}
              </a>
            </>
          ) : (
            <p className="muted" role="status">{t('loading')}</p>
          )}
        </div>
      </div>
      <iframe
        src={ROPS_SITE} title={t('iframeTitle')} referrerPolicy="no-referrer-when-downgrade"
        onLoad={() => setState((s) => (s === 'failed' ? s : 'loaded'))} onError={() => setState('failed')}
        className="absolute inset-0 size-full border-0"
      />
    </main>
  );
}

/** Small dismissible pill (bottom-left): this is a HackYeah demo, not an official ROPS service. */
export function DemoRibbon({ lang }: { lang: string }) {
  const t = useTranslations('rops.embed');
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    let h = false;
    try { h = sessionStorage.getItem(RIBBON_KEY) === '1'; } catch {}
    setHidden(h);
  }, []);
  if (hidden) return null;
  const hide = () => { setHidden(true); try { sessionStorage.setItem(RIBBON_KEY, '1'); } catch {} };
  return (
    <aside role="note" aria-label={t('ribbonLabel')}
      className="rops-light fixed bottom-4 left-4 z-[55] flex max-w-[min(44rem,calc(100vw-6.5rem))] items-center gap-2 rounded-full border border-[var(--outline-variant)] bg-surface py-1 pr-1 pl-3 text-[0.75rem] leading-[1rem] text-[var(--on-surface)] shadow-[0_2px_10px_rgba(0,0,0,0.2)] max-sm:rounded-2xl">
      <FlaskConical size={14} className="shrink-0 text-[var(--warning)]" aria-hidden />
      <p className="min-w-0">
        {t('ribbon')}{' · '}
        <Link href={`/${lang}/rops/szukaj`} className="font-medium whitespace-nowrap">{t('ribbonSearch')}</Link>{' · '}
        <Link href={`/${lang}/info`} className="font-medium whitespace-nowrap">{t('ribbonInfo')}</Link>
      </p>
      <button type="button" onClick={hide} aria-label={t('ribbonHide')} title={t('ribbonHide')}
        className="grid size-7 shrink-0 place-items-center rounded-full text-[var(--on-surface-variant)] hover:bg-[var(--hover)]">
        <X size={14} aria-hidden />
      </button>
    </aside>
  );
}
