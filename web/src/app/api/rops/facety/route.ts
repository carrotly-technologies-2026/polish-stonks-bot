import { clientIp, facety, ropsError } from '@/lib/ropsApi';

export const dynamic = 'force-dynamic';

/** Sources and categories with counts (for filters). */
export async function GET(req: Request) {
  const r = await facety(await clientIp(req));
  if (!r.ok) return Response.json({ error: ropsError(r) }, { status: r.status === 429 ? 429 : 503 });
  return Response.json(r.data, { headers: { 'cache-control': 'public, max-age=300' } });
}
