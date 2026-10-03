import type { HistoriaRops } from '@/lib/rops';
import { ask, clientIp, ropsError } from '@/lib/ropsApi';

export const dynamic = 'force-dynamic';

const STATUS = { unavailable: 503, rate_limited: 429, invalid: 400, failed: 502 } as const;

/** Chat line: proxies a question (with the last messages as context) to the backend RAG. */
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: 'invalid' }, { status: 400 }); }
  const b = (body ?? {}) as { pytanie?: unknown; historia?: unknown };
  const pytanie = typeof b.pytanie === 'string' ? b.pytanie.trim().slice(0, 1000) : '';
  if (!pytanie) return Response.json({ error: 'invalid' }, { status: 400 });
  const historia: HistoriaRops[] = Array.isArray(b.historia)
    ? b.historia
        .filter((m): m is HistoriaRops => !!m && typeof m === 'object' && typeof (m as HistoriaRops).tresc === 'string')
        .map((m) => ({ rola: m.rola === 'asystent' ? 'asystent' : 'uzytkownik', tresc: m.tresc.slice(0, 4000) }) as HistoriaRops)
        .slice(-8)
    : [];
  const r = await ask(pytanie, historia, await clientIp(req));
  if (!r.ok) {
    const error = ropsError(r);
    return Response.json({ error }, { status: STATUS[error], headers: { 'cache-control': 'no-store' } });
  }
  return Response.json(r.data, { headers: { 'cache-control': 'no-store' } });
}
