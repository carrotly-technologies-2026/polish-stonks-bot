'use client';

import { useEffect, useRef } from 'react';

/** Progressive enhancement for the GET filter form: submits when a checkbox / radio changes. */
export function AutoSubmit() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const form = ref.current?.closest('form');
    if (!form) return;
    // Long filter groups start collapsed on phones (results stay near the top) and expanded on desktop.
    if (window.matchMedia('(min-width: 64rem)').matches) {
      form.querySelectorAll<HTMLDetailsElement>('details[data-desktop-open]').forEach((d) => { d.open = true; });
    }
    const onChange = (e: Event) => {
      const el = e.target as HTMLInputElement;
      if (el.type === 'checkbox' || el.type === 'radio') form.requestSubmit();
    };
    form.addEventListener('change', onChange);
    return () => form.removeEventListener('change', onChange);
  }, []);
  return <span ref={ref} hidden />;
}
