'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** Right-hand details panel (full-width sheet on phones). */
export function SidePanel({ open, onOpenChange, title, children }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode;
}) {
  const t = useTranslations('common');
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fade-in fixed inset-0 z-40 bg-[var(--scrim)]" />
        <Dialog.Content className="slide-in fixed inset-y-0 right-0 z-50 flex w-full max-w-[34rem] flex-col border-l border-[var(--outline-variant)] bg-surface shadow-[var(--shadow)] outline-none">
          <div className="panel-head">
            <Dialog.Title className="title">{title}</Dialog.Title>
            <Dialog.Close className="icon-btn" aria-label={t('close')}>
              <X size={20} aria-hidden />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">{title}</Dialog.Description>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Side panel whose open state lives in the URL (server-rendered content); closing navigates to closeHref. */
export function UrlSidePanel({ title, closeHref, children }: { title: string; closeHref: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <SidePanel open title={title} onOpenChange={(o) => { if (!o) router.push(closeHref, { scroll: false }); }}>
      {children}
    </SidePanel>
  );
}
