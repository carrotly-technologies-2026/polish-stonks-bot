'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy } from 'lucide-react';

/** Copies an absolute URL (relative paths are resolved against the current origin). */
export function CopyButton({ path }: { path: string }) {
  const t = useTranslations('openData');
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn btn-outline" onClick={async () => {
      try {
        await navigator.clipboard.writeText(new URL(path, window.location.origin).toString());
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      } catch {}
    }}>
      {done ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
      <span aria-live="polite">{done ? t('copied') : t('copyUrl')}</span>
    </button>
  );
}
