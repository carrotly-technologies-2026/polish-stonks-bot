'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { updateTopicAction } from '@/app/actions';
import { STATUSY, type Status } from '@/lib/types';

export function TopicStatusForm({ id, status, note }: { id: string; status: Status; note: string | null }) {
  const t = useTranslations('priorities');
  const ts = useTranslations('statuses');
  const [state, run, pending] = useActionState(updateTopicAction, null);
  return (
    <form action={run} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-1">
        <span className="label">{t('changeStatus')}</span>
        <select name="status" defaultValue={status} className="field">
          {STATUSY.map((s) => <option key={s} value={s}>{ts(s)}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="label">{t('note')}</span>
        <textarea name="notatka" defaultValue={note ?? ''} rows={3} className="field" placeholder={t('notePlaceholder')} />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn" disabled={pending} aria-busy={pending}>{t('save')}</button>
        <p role="status" aria-live="polite" className="small">
          {state?.ok ? t('saved') : state ? t('saveError', { error: state.message }) : ''}
        </p>
      </div>
    </form>
  );
}
