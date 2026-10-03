'use client';

import { useActionState, useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import type { ActionState } from '@/app/actions';

type Action = (s: ActionState, f: FormData) => Promise<ActionState>;

/** One-button form running a Server Action; the result appears in a snackbar (aria-live). */
export function ActionButton({ action, fields, children, variant = 'outline', confirm, successText }: {
  action: Action; fields: Record<string, string>; children: ReactNode;
  variant?: 'primary' | 'tonal' | 'outline' | 'text' | 'danger'; confirm?: string; successText?: string;
}) {
  const t = useTranslations('publications');
  const [state, run, pending] = useActionState(action, null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!state) return;
    setVisible(true);
    const id = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(id);
  }, [state]);
  const cls = variant === 'primary' ? 'btn' : `btn btn-${variant}`;
  const msg = state?.ok
    ? state.data && 'rozmowy' in state.data
      ? t('seeded', { rozmowy: state.data.rozmowy, bariery: state.data.bariery, zapytania: state.data.zapytania })
      : successText ?? t('done')
    : state?.message === 'unauthorized' ? t('loginRequired')
    : state ? t('failed', { error: state.message }) : '';
  return (
    <form action={run} onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit" className={cls} disabled={pending} aria-busy={pending}>
        {pending && <Loader2 size={16} className="spin" aria-hidden />}
        {children}
      </button>
      <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-4 left-4 z-50">
        {visible && msg && (
          <p className={`fade-in rounded-md px-4 py-3 shadow-[var(--shadow)] ${state?.ok ? 'bg-[var(--on-surface)] text-[var(--surface)]' : 'bg-[var(--error-container)] text-[var(--on-surface)]'}`}>
            {msg}
          </p>
        )}
      </div>
    </form>
  );
}
