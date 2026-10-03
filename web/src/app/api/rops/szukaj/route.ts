import { parseSearch } from '@/lib/rops';
import { clientIp, ropsError, search } from '@/lib/ropsApi';

export const dynamic = 'force-dynamic';

const STATUS = { unavailable: 503, rate_limited: 429, invalid: 400, failed: 502 } as const;

/** Advanced search (same params as /[lang]/rops/szukaj): ?q=&zrodla=a,b&kategorie=…&grupa=&offset= */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const params: Record<string, string[]> = {};
  for (const [k, v] of sp.entries()) (params[k] ??= []).push(v);
  const s = parseSearch(params);
  const r = await search(s, await clientIp(req));
  if (!r.ok) {
    const error = ropsError(r);
    return Response.json({ error }, { status: STATUS[error] });
  }
  return Response.json(r.data, { headers: { 'cache-control': 'no-store' } });
}
