import { fetchPublicFile } from '@/lib/api';

const FILES = new Set(['metryki.json', 'metryki.csv', 'tematy.json', 'tematy.csv']);

/** Proxies the backend's open-data files so the public site needs only one URL. */
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!FILES.has(file)) return new Response('Not found\n', { status: 404 });
  try {
    const res = await fetchPublicFile(file);
    const type = res.headers.get('content-type') ??
      (file.endsWith('.csv') ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8');
    return new Response(res.body, {
      status: res.status,
      headers: {
        'content-type': type,
        'content-disposition': `${file.endsWith('.csv') ? 'attachment' : 'inline'}; filename="halohub-${file}"`,
        'cache-control': 'public, max-age=60',
        'access-control-allow-origin': '*',
      },
    });
  } catch {
    return new Response('Backend unavailable\n', { status: 502 });
  }
}
