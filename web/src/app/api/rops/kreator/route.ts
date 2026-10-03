import { IDEA_HINT_STEPS, type IdeaHintStep } from '@/lib/rops';
import { clientIp, ideaHint, ropsError } from '@/lib/ropsApi';

export const dynamic = 'force-dynamic';

const STATUS = { unavailable: 503, rate_limited: 429, invalid: 400, failed: 502 } as const;

/** Idea creator assistant: hint for one field of the idea card plus similar innovations from the ROPS library. */
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: 'invalid' }, { status: 400 }); }
  const b = (body ?? {}) as { krok?: unknown; szkic?: unknown; jezyk?: unknown };
  if (!(IDEA_HINT_STEPS as readonly unknown[]).includes(b.krok)) return Response.json({ error: 'invalid' }, { status: 400 });
  const szkic = b.szkic && typeof b.szkic === 'object' && !Array.isArray(b.szkic) ? (b.szkic as Record<string, unknown>) : {};
  const r = await ideaHint(
    { krok: b.krok as IdeaHintStep, szkic, jezyk: typeof b.jezyk === 'string' ? b.jezyk.slice(0, 5) : undefined },
    await clientIp(req),
  );
  if (!r.ok) {
    const error = ropsError(r);
    return Response.json({ error }, { status: STATUS[error], headers: { 'cache-control': 'no-store' } });
  }
  return Response.json(r.data, { headers: { 'cache-control': 'no-store' } });
}
