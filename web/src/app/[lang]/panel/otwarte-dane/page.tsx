import { Download } from 'lucide-react';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { fetchPublicFile } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { csvSchema, jsonSchema, OPEN_FILES, type SchemaField } from '@/lib/openData';
import { Chip } from '@/components/Chip';
import { CopyButton } from '@/components/CopyButton';
import { RefreshButton } from '@/components/RefreshButton';
import { PageHeader } from '@/components/ui';

type Dataset = { file: string; ok: boolean; status: number | null; fields: SchemaField[]; rows?: number; published?: string; licence?: string };

async function inspect(file: string): Promise<Dataset> {
  try {
    const res = await fetchPublicFile(file, 0);
    if (!res.ok) return { file, ok: false, status: res.status, fields: [] };
    const text = await res.text();
    if (file.endsWith('.csv')) {
      const s = csvSchema(text);
      const pubIdx = s.fields.findIndex((f) => f.name === 'opublikowano');
      return { file, ok: true, status: 200, fields: s.fields, rows: s.rows, published: pubIdx >= 0 ? s.fields[pubIdx].example : undefined };
    }
    const s = jsonSchema(JSON.parse(text));
    return {
      file, ok: true, status: 200, fields: s.fields,
      published: typeof s.meta.opublikowano === 'string' ? s.meta.opublikowano : undefined,
      licence: typeof s.meta.licencja === 'string' ? s.meta.licencja : undefined,
    };
  } catch {
    return { file, ok: false, status: null, fields: [] };
  }
}

export default async function OpenData({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const l = await getLocale();
  const [t, tn, tr] = await Promise.all([getTranslations('openData'), getTranslations('nav'), getTranslations('report')]);
  const sets = await Promise.all(OPEN_FILES.map(([file]) => inspect(file)));

  return (
    <>
      <PageHeader title={t('title')} lead={t('lead')}
        crumbs={[{ label: tn('section_publishing') }, { label: t('title') }]} actions={<RefreshButton />} />
      <ul className="flex flex-col gap-4">
        {sets.map((d, i) => {
          const path = `/api/open-data/${d.file}`;
          const [name, fmt] = d.file.split('.');
          return (
            <li key={d.file} className="panel">
              <div className="panel-head flex-wrap">
                <div>
                  <h2 className="title flex items-center gap-2">
                    <span className="font-mono">{d.file}</span>
                    <Chip tone="info" label={fmt.toUpperCase()} />
                  </h2>
                  <p className="small mt-0.5">{t(`desc_${name}`)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CopyButton path={path} />
                  <a href={path} download={`halohub-${d.file}`} className="btn btn-tonal"><Download size={16} aria-hidden />{tr(OPEN_FILES[i][1])}</a>
                </div>
              </div>
              <div className="panel-pad flex flex-col gap-3">
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr_auto_1fr]">
                  <dt className="muted">{t('licence')}</dt><dd>{d.licence ?? 'CC BY 4.0'}</dd>
                  <dt className="muted">{t('lastPublished')}</dt><dd>{d.published ? fmtDate(l, d.published, true) : '–'}</dd>
                  <dt className="muted">URL</dt><dd className="font-mono break-all">{path}</dd>
                  {d.rows !== undefined && <><dt className="muted">{t('rows')}</dt><dd className="tnum">{d.rows}</dd></>}
                </dl>
                {!d.ok ? (
                  <Chip tone={d.status === 404 ? 'neutral' : 'error'} label={d.status === 404 ? tr('noData') : t('unavailable')} />
                ) : (
                  <details open={i === 0}>
                    <summary className="inline-flex min-h-10 cursor-pointer items-center font-medium text-[var(--primary)]">
                      {t('schema')} ({d.fields.length})
                    </summary>
                    <div className="overflow-x-auto rounded-md border border-[var(--outline-variant)]">
                      <table className="dt">
                        <caption className="sr-only">{t('schema')} {d.file}</caption>
                        <thead><tr><th scope="col">{t('field')}</th><th scope="col">{t('type')}</th><th scope="col">{t('example')}</th></tr></thead>
                        <tbody>
                          {d.fields.map((f) => (
                            <tr key={f.name}>
                              <th scope="row" className="font-mono font-normal">{f.name}</th>
                              <td><Chip tone="neutral" label={f.type} /></td>
                              <td className="small font-mono break-all">{f.example || '–'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
