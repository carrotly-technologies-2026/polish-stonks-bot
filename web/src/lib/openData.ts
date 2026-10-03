/** Public open-data files proxied at /api/open-data/<file>. */
export const OPEN_FILES = [
  ['metryki.csv', 'metricsCsv'], ['metryki.json', 'metricsJson'],
  ['tematy.csv', 'topicsCsv'], ['tematy.json', 'topicsJson'],
] as const;

export type SchemaField = { name: string; type: string; example: string };

/** Minimal CSV line splitter (handles quoted fields with commas and doubled quotes). */
function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out;
}

const guess = (v: string) =>
  v === '' ? 'string' : /^-?\d+(\.\d+)?$/.test(v) ? 'number' : /^\d{4}-\d{2}-\d{2}T/.test(v) ? 'datetime' : 'string';

export function csvSchema(text: string): { fields: SchemaField[]; rows: number } {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { fields: [], rows: 0 };
  const head = splitCsv(lines[0]);
  const first = lines[1] ? splitCsv(lines[1]) : [];
  return {
    rows: lines.length - 1,
    fields: head.map((name, i) => ({ name, type: guess(first[i] ?? ''), example: (first[i] ?? '').slice(0, 60) })),
  };
}

const jsonType = (v: unknown) =>
  v === null ? 'null' : Array.isArray(v) ? `array[${v.length}]` : typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) ? 'datetime' : typeof v;

export function jsonSchema(data: unknown): { fields: SchemaField[]; meta: Record<string, unknown> } {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { fields: [], meta: {} };
  const obj = data as Record<string, unknown>;
  const fields = Object.entries(obj).map(([name, v]) => ({
    name,
    type: jsonType(v),
    example: v !== null && typeof v === 'object' ? (Array.isArray(v) ? `[${Object.keys((v[0] as object) ?? {}).slice(0, 6).join(', ')}…]` : `{${Object.keys(v).slice(0, 6).join(', ')}…}`) : String(v).slice(0, 60),
  }));
  return { fields, meta: obj };
}
