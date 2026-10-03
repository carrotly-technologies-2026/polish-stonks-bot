'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { HistoriaRops, OdpowiedzRops, RopsError, ZrodloOdpowiedzi } from '@/lib/rops';

export type Msg = {
  id: string; rola: 'uzytkownik' | 'asystent'; tresc: string;
  zrodla?: ZrodloOdpowiedzi[]; model?: string | null; error?: RopsError;
};

const KEY = 'rops-chat-v1';
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

/**
 * Conversation state of the ROPS knowledge assistant: POST /api/rops/zapytaj with the last few turns as history,
 * errors mapped to RopsError (rate limit, unavailable, …), conversation kept in sessionStorage.
 */
export function useRopsChat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [restored, setRestored] = useState(false);
  const msgsRef = useRef<Msg[]>([]);
  const busyRef = useRef(false);

  const update = useCallback((next: Msg[]) => { msgsRef.current = next; setMsgs(next); save(next); }, []);

  useEffect(() => {
    const r = load();
    msgsRef.current = r;
    setMsgs(r);
    setRestored(true);
  }, []);

  const send = useCallback(async (text: string) => {
    const pytanie = text.trim().slice(0, 1000);
    if (!pytanie || busyRef.current) return;
    const prior = msgsRef.current.filter((m) => !m.error);
    const historia: HistoriaRops[] = prior.slice(-8).map((m) => ({ rola: m.rola, tresc: m.tresc }));
    const withQ = [...prior, { id: uid(), rola: 'uzytkownik' as const, tresc: pytanie }];
    update(withQ);
    busyRef.current = true;
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
    busyRef.current = false;
    setBusy(false);
  }, [update]);

  const lastQuestion = [...msgs].reverse().find((m) => m.rola === 'uzytkownik')?.tresc;
  const retry = useCallback(() => {
    const cur = msgsRef.current;
    const q = [...cur].reverse().find((m) => m.rola === 'uzytkownik')?.tresc;
    if (!q) return;
    msgsRef.current = cur.slice(0, cur.map((m) => m.tresc).lastIndexOf(q));
    void send(q);
  }, [send]);
  const clear = useCallback(() => update([]), [update]);

  return { msgs, busy, restored, send, retry, clear, lastQuestion };
}
