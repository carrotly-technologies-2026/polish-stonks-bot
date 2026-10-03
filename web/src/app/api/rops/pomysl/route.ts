import { clientIp, ropsError, submitIdea } from '@/lib/ropsApi';

export const dynamic = 'force-dynamic';

const STATUS = { unavailable: 503, rate_limited: 429, invalid: 400, failed: 502 } as const;

/** Idea creator: proxies an idea card (fiszka) to the backend, which validates and stores it. */
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: 'invalid' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({ error: 'invalid' }, { status: 400 });
  const r = await submitIdea(body as Record<string, unknown>, await clientIp(req));
  if (!r.ok) {
    const error = ropsError(r);
    return Response.json({ error }, { status: STATUS[error], headers: { 'cache-control': 'no-store' } });
  }
  return Response.json(r.data, { status: 201, headers: { 'cache-control': 'no-store' } });
}
