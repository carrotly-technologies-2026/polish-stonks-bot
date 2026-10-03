'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Chip } from './Chip';

/** Re-fetches server data every `seconds` while `active` (e.g. a pipeline stage is running). */
export function AutoRefresh({ active, seconds = 10 }: { active: boolean; seconds?: number }) {
  const t = useTranslations('pipeline');
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [active, seconds, router]);
  return active ? <Chip tone="running" label={t('autoRefresh', { seconds })} /> : null;
}
