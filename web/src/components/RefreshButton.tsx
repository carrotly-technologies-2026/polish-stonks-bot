'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RefreshCw } from 'lucide-react';

export function RefreshButton() {
  const t = useTranslations('common');
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn btn-text" onClick={() => start(() => router.refresh())} aria-busy={pending}>
      <RefreshCw size={18} className={pending ? 'spin' : undefined} aria-hidden />
      {t('refresh')}
    </button>
  );
}
