import { panelApi } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** New P1 topics for the live list on the overview. Protected by HTTP Basic auth in middleware. */
export async function GET(req: Request) {
  const jezyk = new URL(req.url).searchParams.get('jezyk') || undefined;
  const r = await panelApi.topics({ priorytet: 'P1', status: 'nowy', jezyk, limit: 20 });
  if (!r.ok) return Response.json({ error: r.error }, { status: 502 });
  return Response.json(r.data, { headers: { 'cache-control': 'no-store' } });
}
