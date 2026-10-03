'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle, Bot, Loader2, Maximize2, MessageCircle, Mic, MicOff, Minus, Phone, RotateCcw, SendHorizontal,
  Sparkles, Trash2,
} from 'lucide-react';
import { linkCitations } from '@/lib/rops';
import { ElevenLabsWidget } from '@/components/ElevenLabsWidget';
import { SourceCard } from './SourceCard';
import { useRopsChat, type Msg } from './useRopsChat';

const STATE_KEY = 'rops-widget-v1';
const CHIPS = ['c1', 'c2', 'c3', 'c4'] as const;
const AUTO_OPEN_MS = 1500;

function readState(): 'open' | 'closed' | null {
  try { const v = sessionStorage.getItem(STATE_KEY); return v === 'open' || v === 'closed' ? v : null; } catch { return null; }
}
function writeState(v: 'open' | 'closed') {
  try { sessionStorage.setItem(STATE_KEY, v); } catch {}
}

/** Assistant answer: safe markdown (no raw HTML) with [n] turned into links to the source cards below. */
function Answer({ m }: { m: Msg }) {
  const t = useTranslations('rops.chat');
  const nums = (m.zrodla ?? []).map((z) => z.nr);
  const md = linkCitations(m.tresc, nums, (n) => `c-${m.id}-${n}`);
  return (
    <div className="prose-report break-words">
      <ReactMarkdown
        skipHtml
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith('#c-')) {
              const n = href.split('-').pop();
              const onClick = (e: MouseEvent) => {
                // Scroll inside the panel only; do not touch the page hash.
                e.preventDefault();
                const card = document.getElementById(href.slice(1));
                if (!card) return;
                card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                card.classList.add('cite-flash');
                window.setTimeout(() => card.classList.remove('cite-flash'), 1600);
              };
              return <a href={href} onClick={onClick} className="cite" aria-label={t('citation', { n: n ?? '' })}>{n}</a>;
            }
            return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
          },
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Intercom-style chat widget of the ROPS knowledge assistant: launcher bubble bottom-right that opens
 * (once per session) into a panel with cited answers, compact source cards and file downloads.
 */
export function RopsWidget({ lang, agentId, phone, phoneTel, initialQuestion }: {
  lang: string; agentId: string | null; phone: string | null; phoneTel: string | null; initialQuestion?: string;
}) {
  const t = useTranslations('rops.widget');
  const tc = useTranslations('rops.chat');
  const { msgs, busy, restored, send, retry, clear, lastQuestion } = useRopsChat();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(true);
  const [voice, setVoice] = useState(false);
  const [input, setInput] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const asked = useRef(false);
  const seen = useRef(0);

  const show = useCallback((focus = true) => {
    setOpen(true); setUnread(false); writeState('open');
    if (focus) requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }, []);
  const minimize = useCallback(() => {
    setOpen(false); writeState('closed');
    requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  // Auto-open: immediately with a question from the URL (?pytanie=), otherwise after 1.5 s unless closed this session.
  useEffect(() => {
    if (!restored) return;
    if (initialQuestion && !asked.current) {
      asked.current = true;
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete('pytanie');
        window.history.replaceState(null, '', u.pathname + u.search);
      } catch {}
      show(false);
      void send(initialQuestion);
      return;
    }
    const st = readState();
    if (st === 'open' || window.location.hash === '#czat') { show(false); return; }
    if (st === 'closed') return;
    const id = window.setTimeout(() => show(false), AUTO_OPEN_MS);
    return () => window.clearTimeout(id);
  }, [restored, initialQuestion, send, show]);

  // New answer while minimized -> unread dot.
  useEffect(() => {
    const answers = msgs.filter((m) => m.rola === 'asystent').length;
    if (answers > seen.current && !open) setUnread(true);
    seen.current = answers;
  }, [msgs, open]);

  useEffect(() => {
    const el = logRef.current;
    if (!el || !open) return;
    const id = requestAnimationFrame(() => {
      const last = el.querySelector<HTMLElement>('[data-last="true"]');
      if (last) el.scrollTop = Math.max(0, last.offsetTop - 8);
    });
    return () => cancelAnimationFrame(id);
  }, [msgs, busy, open]);

  const submit = (text: string) => { if (!text.trim() || busy) return; setInput(''); void send(text); };
  const onSubmit = (e: FormEvent) => { e.preventDefault(); submit(input); };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(input); }
  };
  const onPanelKey = (e: KeyboardEvent<HTMLElement>) => { if (e.key === 'Escape') { e.stopPropagation(); minimize(); } };
  const doClear = () => { clear(); inputRef.current?.focus(); };

  return (
    <>
      {voice && agentId && <ElevenLabsWidget agentId={agentId} />}

      <section
        id="czat" role="dialog" aria-modal="false" aria-labelledby="rw-title" onKeyDown={onPanelKey}
        className={`rops-widget fixed inset-x-0 bottom-0 z-[60] ${open ? 'flex' : 'hidden'} h-[85dvh] max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl border border-[var(--outline-variant)] bg-surface text-[var(--on-surface)] shadow-[0_8px_32px_rgba(0,0,0,0.28)] sm:inset-x-auto sm:right-5 sm:bottom-[6.25rem] sm:h-[min(600px,calc(100dvh-8rem))] sm:w-[380px] sm:rounded-2xl`}
      >
        <header className="flex items-center gap-2 bg-[var(--primary)] py-2.5 pr-1.5 pl-3 text-[var(--on-primary)]">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--on-primary)] text-[var(--primary)]"><Bot size={20} /></span>
          <div className="mr-auto min-w-0">
            <h2 id="rw-title" className="truncate text-[0.9375rem] leading-[1.25rem] font-medium">{t('title')}</h2>
            <p className="truncate text-[0.75rem] leading-[1rem] opacity-90">{t('sub')}</p>
          </div>
          {agentId && (
            <button type="button" onClick={() => setVoice((v) => !v)} aria-pressed={voice}
              className="rw-icon" title={voice ? t('voiceOff') : t('voice')} aria-label={voice ? t('voiceOff') : t('voice')}>
              {voice ? <MicOff size={18} aria-hidden /> : <Mic size={18} aria-hidden />}
            </button>
          )}
          {msgs.length > 0 && (
            <button type="button" onClick={doClear} disabled={busy} className="rw-icon" title={tc('clear')} aria-label={tc('clear')}>
              <Trash2 size={18} aria-hidden />
            </button>
          )}
          <Link href={`/${lang}/rops/szukaj`} className="rw-icon" title={t('full')} aria-label={t('full')}>
            <Maximize2 size={18} aria-hidden />
          </Link>
          <button type="button" onClick={minimize} className="rw-icon" title={t('minimize')} aria-label={t('minimize')}>
            <Minus size={20} aria-hidden />
          </button>
        </header>

        {voice && <p role="status" className="small bg-[var(--surface-2)] px-4 py-2">{t('voiceHint')}</p>}

        <div ref={logRef} role="log" aria-live="polite" aria-relevant="additions" aria-label={tc('log')}
          className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain [overflow-anchor:none] px-3 py-3">
          <div className="flex gap-2">
            <span aria-hidden className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-primary-container text-on-primary-container"><Bot size={16} /></span>
            <p className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-[var(--surface-2)] px-3 py-2 text-[0.875rem] leading-[1.375rem]">
              <span className="sr-only">{tc('assistant')}: </span>{t('greeting')}
            </p>
          </div>
          {msgs.length === 0 && !busy && (
            <ul className="flex flex-wrap gap-2 pl-9" aria-label={tc('examples')}>
              {CHIPS.map((k) => (
                <li key={k}>
                  <button type="button" onClick={() => submit(t(k))}
                    className="btn btn-outline !min-h-8 !px-3 !text-[0.8125rem] !whitespace-normal text-left">
                    <Sparkles size={14} aria-hidden className="shrink-0" />{t(k)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {msgs.map((m, i) => {
            const last = i === msgs.length - 1 ? 'true' : undefined;
            if (m.rola === 'uzytkownik') {
              return (
                <div key={m.id} data-last={last} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--primary)] px-3 py-2 text-[0.875rem] leading-[1.375rem] break-words whitespace-pre-wrap text-[var(--on-primary)]">
                    <span className="sr-only">{tc('you')}: </span>{m.tresc}
                  </p>
                </div>
              );
            }
            if (m.error) {
              return (
                <div key={m.id} data-last={last} role="alert" className="flex items-start gap-2 rounded-xl bg-[var(--warning-container)] px-3 py-2.5 text-[0.875rem]">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--warning)]" aria-hidden />
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="font-medium">{tc(`err_${m.error}_t`)}</p>
                    <p>{tc(`err_${m.error}`)}</p>
                    {i === msgs.length - 1 && lastQuestion && m.error !== 'invalid' && (
                      <button type="button" className="btn btn-outline self-start !min-h-8 !px-3" onClick={retry} disabled={busy}>
                        <RotateCcw size={14} aria-hidden />{tc('retry')}
                      </button>
                    )}
                  </div>
                </div>
              );
            }
            const n = m.zrodla?.length ?? 0;
            return (
              <div key={m.id} data-last={last} className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <span aria-hidden className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-primary-container text-on-primary-container"><Bot size={16} /></span>
                  <div className="rw-answer min-w-0 flex-1 rounded-2xl rounded-tl-md bg-[var(--surface-2)] px-3 py-2">
                    <span className="sr-only">{tc('assistant')}: </span>
                    <Answer m={m} />
                  </div>
                </div>
                {n > 0 && (
                  <div className="flex flex-col gap-1.5 pl-9">
                    <h3 className="label uppercase">{tc('sources', { n })}</h3>
                    <ol className="grid gap-1.5">
                      {m.zrodla!.map((z) => (
                        <li key={`${m.id}-${z.nr}`}><SourceCard w={z} nr={z.nr} anchorId={`c-${m.id}-${z.nr}`} headingLevel={4} compact /></li>
                      ))}
                    </ol>
                  </div>
                )}
                <p className="small pl-9 !text-[0.75rem]">{tc('aiNote')}</p>
              </div>
            );
          })}
          {busy && (
            <p role="status" className="muted flex items-center gap-2 pl-9 text-[0.875rem]" data-last="true">
              <Loader2 size={16} className="spin" aria-hidden />{tc('loading')}
            </p>
          )}
        </div>

        <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-[var(--outline-variant)] px-3 pt-2.5 pb-2">
          <label htmlFor="rw-q" className="sr-only">{tc('label')}</label>
          <textarea ref={inputRef} id="rw-q" rows={1} maxLength={1000} value={input}
            onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
            placeholder={t('placeholder')} aria-describedby="rw-hint"
            className="field max-h-32 min-h-[2.75rem] flex-1 resize-none !rounded-xl !py-2.5 !text-[0.9375rem] leading-[1.375rem]" />
          <button type="submit" className="btn !size-11 shrink-0 !rounded-full !p-0" disabled={busy || !input.trim()} aria-label={tc('send')}>
            {busy ? <Loader2 size={18} className="spin" aria-hidden /> : <SendHorizontal size={18} aria-hidden />}
          </button>
        </form>
        <div className="flex flex-col gap-0.5 px-3 pb-2.5 text-[0.75rem] leading-[1rem] text-[var(--on-surface-variant)]">
          <p id="rw-hint">{t('hint')}</p>
          {phone && phoneTel && (
            <p className="flex items-center gap-1">
              <Phone size={12} aria-hidden />{t('phone')}{' '}
              <a href={`tel:${phoneTel}`} className="tnum font-medium">{phone}</a>
            </p>
          )}
        </div>
      </section>

      <button
        ref={launcherRef} type="button" onClick={() => (open ? minimize() : show())}
        aria-expanded={open} aria-controls="czat" aria-label={open ? t('minimize') : unread ? t('openUnread') : t('open')}
        className={`fixed right-5 bottom-5 z-[61] size-[60px] place-items-center rounded-full bg-[var(--primary)] text-[var(--on-primary)] shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-transform hover:scale-105 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${open ? 'hidden sm:grid' : 'grid'}`}
      >
        {open ? <Minus size={28} aria-hidden /> : <MessageCircle size={28} aria-hidden />}
        {unread && !open && (
          <span aria-hidden className="absolute top-0.5 right-0.5 size-3.5 rounded-full border-2 border-[var(--surface)] bg-[#d93025]" />
        )}
      </button>
    </>
  );
}
