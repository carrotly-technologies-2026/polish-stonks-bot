'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Send } from 'lucide-react';
import { publishAction } from '@/app/actions';

/** Sticky bar under a draft preview: "Opublikuj dla mieszkańców". Sticks to the bottom of the content area. */
export function PublishBar({ id, text }: { id: string; text: string }) {
  const t = useTranslations('publications');
  const [state, run, pending] = useActionState(publishAction, null);
  return (
    <form action={run}
      className="sticky bottom-0 z-20 -mx-4 border-t border-[var(--outline-variant)] bg-surface shadow-[var(--shadow)] md:-mx-6">
      <input type="hidden" name="id" value={id} />
      <div className="mx-auto flex flex-wrap items-center gap-3 px-4 py-3 md:px-6">
        <div className="mr-auto">
          <p className="font-medium">{text}</p>
          <p role="status" aria-live="polite" className="small">
            {state?.ok ? t('published') : state ? t('failed', { error: state.message }) : ''}
          </p>
        </div>
        <button type="submit" className="btn" disabled={pending} aria-busy={pending}>
          <Send size={18} strokeWidth={1.75} aria-hidden />
          {pending ? t('publishing') : t('publish')}
        </button>
      </div>
    </form>
  );
}
