'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Monitor, Moon, Sun } from 'lucide-react';

type Mode = 'system' | 'light' | 'dark';
const NEXT: Record<Mode, Mode> = { system: 'light', light: 'dark', dark: 'system' };

function apply(mode: Mode) {
  const root = document.documentElement;
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
  try {
    if (mode === 'system') localStorage.removeItem('theme');
    else localStorage.setItem('theme', mode);
  } catch {}
}

/** Cycles system → light → dark. The initial value is applied pre-paint by the inline script in the layout. */
export function ThemeToggle() {
  const t = useTranslations('theme');
  const [mode, setMode] = useState<Mode>('system');
  useEffect(() => {
    const v = document.documentElement.getAttribute('data-theme');
    if (v === 'light' || v === 'dark') setMode(v);
  }, []);
  const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;
  return (
    <button type="button" className="icon-btn" title={`${t('toggle')}: ${t(mode)}`}
      onClick={() => { const m = NEXT[mode]; apply(m); setMode(m); }}>
      <Icon size={20} strokeWidth={2} aria-hidden />
      <span className="sr-only">{t('toggle')}: {t(mode)}</span>
    </button>
  );
}

export const themeScript = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;
