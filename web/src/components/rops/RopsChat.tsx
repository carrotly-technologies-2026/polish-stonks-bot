'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Bot, Loader2, RotateCcw, SendHorizontal, Sparkles, Trash2, User } from 'lucide-react';
import { linkCitations, type HistoriaRops, type OdpowiedzRops, type RopsError, type ZrodloOdpowiedzi } from '@/lib/rops';
import { SourceCard } from './SourceCard';

type Msg = {
  id: string; rola: 'uzytkownik' | 'asystent'; tresc: string;
  zrodla?: ZrodloOdpowiedzi[]; model?: string | null; error?: RopsError;
};

const KEY = 'rops-chat-v1';
const EXAMPLES = ['ex1', 'ex2', 'ex3', 'ex4'] as const;
const uid = () => Math.random().toString(36).slice(2, 10);

function load(): Msg[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? (v as Msg[]).filter((m) => m && typeof m.tresc === 'string').slice(-40) : [];
  } catch { return []; }
}
function save(msgs: Msg[]) {
  try { sessionStorage.setItem(KEY, JSON.stringify(msgs.filter((m) => !m.error).slice(-40))); } catch {}
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
              return <a href={href} className="cite" aria-label={t('citation', { n: n ?? '' })}>{n}</a>;
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

/** Chat line of the ROPS knowledge assistant (text chat with cited answers and file downloads). */
export function RopsChat({ initialQuestion }: { initialQuestion?: string }) {
  const t = useTranslations('rops.chat');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const started = useRef(false);
  const msgsRef = useRef<Msg[]>([]);

  const update = useCallback((next: Msg[]) => { msgsRef.current = next; setMsgs(next); save(next); }, []);

  const send = useCallback(async (text: string) => {
    const pytanie = text.trim().slice(0, 1000);
    if (!pytanie || busy) return;
    const prior = msgsRef.current.filter((m) => !m.error);
    const historia: HistoriaRops[] = prior.slice(-8).map((m) => ({ rola: m.rola, tresc: m.tresc }));
    const withQ = [...prior, { id: uid(), rola: 'uzytkownik' as const, tresc: pytanie }];
    update(withQ);
    setInput('');
    setBusy(true);
    let reply: Msg;
    try {
      const res = await fetch('/api/rops/zapytaj', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pytanie, historia }),
      });
      const data = (await res.json().catch(() => null)) as (OdpowiedzRops & { error?: RopsError }) | null;
      if (!res.ok || !data || typeof data.odpowiedz !== 'string') {
        const error: RopsError = data?.error ?? (res.status === 429 ? 'rate_limited' : res.status === 404 ? 'unavailable' : 'failed');
        reply = { id: uid(), rola: 'asystent', tresc: '', error };
      } else {
        reply = { id: uid(), rola: 'asystent', tresc: data.odpowiedz, zrodla: data.zrodla ?? [], model: data.model };
      }
    } catch {
      reply = { id: uid(), rola: 'asystent', tresc: '', error: 'failed' };
    }
    update([...withQ, reply]);
    setBusy(false);
  }, [busy, update]);

  // Restore the conversation, then ask a question passed in the URL (?pytanie=) once.
  useEffect(() => {
    const restored = load();
    msgsRef.current = restored;
    setMsgs(restored);
    if (initialQuestion && !started.current) {
      started.current = true;
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete('pytanie');
        window.history.replaceState(null, '', u.pathname + u.search + '#czat');
      } catch {}
      void send(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    const last = el.querySelector<HTMLElement>('[data-last="true"]');
    if (last) el.scrollTop = Math.max(0, last.offsetTop - 8);
  }, [msgs, busy]);

  const onSubmit = (e: FormEvent) => { e.preventDefault(); void send(input); };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(input); }
  };
  const lastQuestion = [...msgs].reverse().find((m) => m.rola === 'uzytkownik')?.tresc;
  const retry = () => {
    if (!lastQuestion) return;
    const idx = msgs.map((m) => m.tresc).lastIndexOf(lastQuestion);
    msgsRef.current = msgs.slice(0, idx);
    void send(lastQuestion);
  };
  const clear = () => { update([]); inputRef.current?.focus(); };

  return (
    <section id="czat" className="panel flex min-w-0 scroll-mt-24 flex-col overflow-hidden" aria-labelledby="czat-h">
      <div className="panel-head">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-container text-on-primary-container"><Bot size={20} /></span>
          <div className="min-w-0">
            <h2 id="czat-h" className="title">{t('title')}</h2>
            <p className="small">{t('sub')}</p>
          </div>
        </div>
        {msgs.length > 0 && (
          <button type="button" className="btn btn-text !px-2" onClick={clear} disabled={busy}>
            <Trash2 size={16} aria-hidden />{t('clear')}
          </button>
        )}
      </div>

      <div ref={logRef} role="log" aria-live="polite" aria-relevant="additions" aria-label={t('log')}
        className="relative flex max-h-[min(70dvh,44rem)] min-h-[16rem] flex-col gap-4 overflow-y-auto px-4 py-4 md:px-5">
        {msgs.length === 0 && !busy && (
          <div className="flex flex-col gap-3">
            <p className="muted">{t('empty')}</p>
            <p className="label uppercase">{t('examples')}</p>
            <ul className="flex flex-wrap gap-2">
              {EXAMPLES.map((k) => (
                <li key={k}>
                  <button type="button" className="btn btn-outline !min-h-9 !px-3 !whitespace-normal text-left" onClick={() => void send(t(k))}>
                    <Sparkles size={16} aria-hidden className="shrink-0" />{t(k)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {msgs.map((m, i) => {
          const last = i === msgs.length - 1 ? 'true' : undefined;
          if (m.rola === 'uzytkownik') {
            return (
              <div key={m.id} data-last={last} className="flex justify-end gap-2">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary-container px-4 py-2 break-words whitespace-pre-wrap text-on-primary-container">
                  <span className="sr-only">{t('you')}: </span>{m.tresc}
                </p>
                <span aria-hidden className="mt-1 hidden size-7 shrink-0 place-items-center rounded-full bg-[var(--surface-2)] sm:grid"><User size={16} /></span>
              </div>
            );
          }
          if (m.error) {
            return (
              <div key={m.id} data-last={last} role="alert" className="flex items-start gap-3 rounded-xl bg-[var(--warning-container)] px-4 py-3">
                <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[var(--warning)]" aria-hidden />
                <div className="flex min-w-0 flex-col gap-2">
                  <p className="font-medium">{t(`err_${m.error}_t`)}</p>
                  <p>{t(`err_${m.error}`)}</p>
                  {i === msgs.length - 1 && lastQuestion && m.error !== 'invalid' && (
                    <button type="button" className="btn btn-outline self-start !min-h-9" onClick={retry} disabled={busy}>
                      <RotateCcw size={16} aria-hidden />{t('retry')}
                    </button>
                  )}
                </div>
              </div>
            );
          }
          const n = m.zrodla?.length ?? 0;
          return (
            <div key={m.id} data-last={last} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <span aria-hidden className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-primary-container text-on-primary-container"><Bot size={16} /></span>
                <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-[var(--surface-2)] px-4 py-2">
                  <span className="sr-only">{t('assistant')}: </span>
                  <Answer m={m} />
                </div>
              </div>
              {n > 0 && (
                <div className="flex flex-col gap-2 sm:pl-9">
                  <h3 className="label uppercase">{t('sources', { n })}</h3>
                  <ol className="grid gap-2">
                    {m.zrodla!.map((z) => (
                      <li key={`${m.id}-${z.nr}`}><SourceCard w={z} nr={z.nr} anchorId={`c-${m.id}-${z.nr}`} headingLevel={4} /></li>
                    ))}
                  </ol>
                </div>
              )}
              <p className="small sm:pl-9">{t('aiNote')}{m.model ? ` (${m.model})` : ''}</p>
            </div>
          );
        })}
        {busy && (
          <p role="status" className="flex items-center gap-2 muted" data-last="true">
            <Loader2 size={18} className="spin" aria-hidden />{t('loading')}
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-[var(--outline-variant)] p-3 md:px-5">
        <label htmlFor="rops-q" className="sr-only">{t('label')}</label>
        <textarea ref={inputRef} id="rops-q" rows={2} maxLength={1000} value={input}
          onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
          placeholder={t('placeholder')} aria-describedby="rops-q-hint"
          className="field min-h-[3rem] flex-1 resize-y !rounded-xl !text-[1rem] leading-[1.5rem]" />
        <button type="submit" className="btn !size-12 shrink-0 !rounded-full !p-0" disabled={busy || !input.trim()} aria-label={t('send')}>
          {busy ? <Loader2 size={20} className="spin" aria-hidden /> : <SendHorizontal size={20} aria-hidden />}
        </button>
      </form>
      <p id="rops-q-hint" className="small px-4 pb-3 md:px-5">{t('hint')}</p>
    </section>
  );
}
