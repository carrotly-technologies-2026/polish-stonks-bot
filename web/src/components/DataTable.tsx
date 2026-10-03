'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Columns3, Filter, Plus, X } from 'lucide-react';
import { Chip, type Tone } from './Chip';
import { SidePanel } from './SidePanel';

export type Cell = {
  /** Raw value used for sorting and filtering. */
  v: string | number | null;
  /** Display text (defaults to v). */
  text?: string;
  chip?: { tone: Tone; label: string };
  mono?: boolean;
  /** External link (opens in a new tab). */
  href?: string;
};
export type Column = { key: string; label: string; num?: boolean; filter?: boolean; hidden?: boolean };
export type Row = {
  id: string;
  cells: Record<string, Cell>;
  /** Navigate on click: sets this query param on the current URL (server-rendered side panel). */
  linkParam?: [string, string];
  /** Or navigate to this in-app URL. */
  href?: string;
  /** Or show these details in a client-side side panel. */
  details?: { title: string; items: { label: string; value: string }[]; list?: { label: string; items: string[] } };
};

const shown = (c: Cell | undefined) => (c ? c.text ?? (c.v === null ? '–' : String(c.v)) : '–');

/** Dense, sortable, filterable, paginated table with a filter chip bar and column chooser. */
export function DataTable({ columns, rows, caption, initialSort, initialFilters = {}, syncUrl = false, pageSize = 25, selectedId, toolbar = true }: {
  columns: Column[]; rows: Row[]; caption: string; initialSort?: { key: string; dir: 'asc' | 'desc' };
  initialFilters?: Record<string, string[]>; syncUrl?: boolean; pageSize?: number; selectedId?: string; toolbar?: boolean;
}) {
  const t = useTranslations('table');
  const router = useRouter();
  const [sort, setSort] = useState(initialSort ?? null);
  const [filters, setFilters] = useState<Record<string, string[]>>(initialFilters);
  const [text, setText] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(pageSize);
  const [hiddenCols, setHiddenCols] = useState(new Set(columns.filter((c) => c.hidden).map((c) => c.key)));
  const [detail, setDetail] = useState<Row | null>(null);
  const cols = columns.filter((c) => !hiddenCols.has(c.key));

  useEffect(() => {
    if (!syncUrl) return;
    const url = new URL(window.location.href);
    for (const k of [...url.searchParams.keys()]) if (k.startsWith('f_')) url.searchParams.delete(k);
    for (const [k, v] of Object.entries(filters)) if (v.length) url.searchParams.set(`f_${k}`, v.join(','));
    window.history.replaceState(window.history.state, '', url);
  }, [filters, syncUrl]);

  const options = useMemo(() => {
    const o: Record<string, Map<string, string>> = {};
    for (const c of columns.filter((x) => x.filter)) {
      o[c.key] = new Map();
      for (const r of rows) {
        const cell = r.cells[c.key];
        if (cell && cell.v !== null) o[c.key].set(String(cell.v), cell.chip?.label ?? shown(cell));
      }
    }
    return o;
  }, [columns, rows]);

  const result = useMemo(() => {
    const q = text.trim().toLowerCase();
    let out = rows.filter((r) =>
      Object.entries(filters).every(([k, vals]) => !vals.length || vals.includes(String(r.cells[k]?.v ?? ''))) &&
      (!q || Object.values(r.cells).some((c) => shown(c).toLowerCase().includes(q))));
    if (sort) {
      const m = sort.dir === 'asc' ? 1 : -1;
      out = [...out].sort((a, b) => {
        const x = a.cells[sort.key]?.v ?? null;
        const y = b.cells[sort.key]?.v ?? null;
        if (x === y) return 0;
        if (x === null) return 1;
        if (y === null) return -1;
        return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * m;
      });
    }
    return out;
  }, [rows, filters, text, sort]);

  const pages = Math.max(1, Math.ceil(result.length / size));
  const p = Math.min(page, pages - 1);
  const slice = result.slice(p * size, p * size + size);
  const label = (k: string) => columns.find((c) => c.key === k)?.label ?? k;
  const setFilter = (k: string, vals: string[]) => { setFilters((f) => ({ ...f, [k]: vals })); setPage(0); };
  const active = Object.entries(filters).flatMap(([k, vals]) => vals.map((v) => [k, v] as const));

  const open = (r: Row) => {
    if (r.href) router.push(r.href);
    else if (r.linkParam) {
      const url = new URL(window.location.href);
      url.searchParams.set(r.linkParam[0], r.linkParam[1]);
      router.push(url.pathname + url.search, { scroll: false });
    } else if (r.details) setDetail(r);
  };
  const clickable = (r: Row) => !!(r.href || r.linkParam || r.details);

  return (
    <div className="panel overflow-hidden">
      {toolbar && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--outline-variant)] px-3 py-2">
          <Filter size={18} className="muted shrink-0" aria-hidden />
          <span className="small font-medium">{t('filter')}</span>
          {active.map(([k, v]) => (
            <span key={`${k}=${v}`} className="filter-chip">
              {label(k)} = {options[k]?.get(v) ?? v}
              <button type="button" className="icon-btn !size-7" aria-label={t('removeFilter', { name: `${label(k)} = ${options[k]?.get(v) ?? v}` })}
                onClick={() => setFilter(k, filters[k].filter((x) => x !== v))}>
                <X size={14} aria-hidden />
              </button>
            </span>
          ))}
          {Object.keys(options).length > 0 && (
            <details className="relative">
              <summary className="btn btn-text !min-h-8 list-none"><Plus size={16} aria-hidden />{t('addFilter')}</summary>
              <div className="panel absolute left-0 z-20 mt-1 max-h-80 w-72 overflow-auto p-2 shadow-[var(--shadow)]">
                {Object.entries(options).map(([k, vals]) => (
                  <fieldset key={k} className="mb-2">
                    <legend className="label px-2 py-1">{label(k)}</legend>
                    {[...vals].map(([v, l]) => (
                      <label key={v} className="flex min-h-9 cursor-pointer items-center gap-2 rounded px-2 hover:bg-[var(--hover)]">
                        <input type="checkbox" checked={filters[k]?.includes(v) ?? false}
                          onChange={(e) => setFilter(k, e.target.checked ? [...(filters[k] ?? []), v] : (filters[k] ?? []).filter((x) => x !== v))} />
                        {l}
                      </label>
                    ))}
                  </fieldset>
                ))}
              </div>
            </details>
          )}
          <input type="search" value={text} onChange={(e) => { setText(e.target.value); setPage(0); }}
            placeholder={t('search')} aria-label={t('search')} className="field !min-h-8 ml-auto !w-48 !py-1" />
          <details className="relative">
            <summary className="icon-btn list-none" title={t('columns')}><Columns3 size={18} aria-hidden /><span className="sr-only">{t('columns')}</span></summary>
            <div className="panel absolute right-0 z-20 mt-1 w-56 p-2 shadow-[var(--shadow)]">
              {columns.map((c) => (
                <label key={c.key} className="flex min-h-9 cursor-pointer items-center gap-2 rounded px-2 hover:bg-[var(--hover)]">
                  <input type="checkbox" checked={!hiddenCols.has(c.key)}
                    onChange={() => setHiddenCols((h) => { const n = new Set(h); if (n.has(c.key)) n.delete(c.key); else n.add(c.key); return n; })} />
                  {c.label}
                </label>
              ))}
            </div>
          </details>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="dt">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {cols.map((c) => {
                const dir = sort?.key === c.key ? sort.dir : null;
                return (
                  <th key={c.key} scope="col" className={c.num ? 'num' : ''}
                    aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}>
                    <button type="button" className="inline-flex min-h-8 cursor-pointer items-center gap-1 font-medium"
                      onClick={() => setSort({ key: c.key, dir: dir === 'desc' ? 'asc' : 'desc' })}>
                      {c.label}
                      {dir === 'asc' ? <ArrowUp size={14} aria-hidden /> : dir === 'desc' ? <ArrowDown size={14} aria-hidden /> : null}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 && (
              <tr><td colSpan={cols.length} className="muted py-6 text-center">{t('noRows')}</td></tr>
            )}
            {slice.map((r) => (
              <tr key={r.id} className={clickable(r) ? 'clickable' : ''} aria-selected={r.id === selectedId || r.id === detail?.id}
                onClick={clickable(r) ? () => open(r) : undefined}>
                {cols.map((c, i) => {
                  const cell = r.cells[c.key];
                  const body = cell?.chip ? <Chip tone={cell.chip.tone} label={cell.chip.label} />
                    : cell?.href ? <a href={cell.href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{shown(cell)}</a>
                    : shown(cell);
                  return (
                    <td key={c.key} className={`${c.num ? 'num' : ''} ${cell?.mono ? 'font-mono' : ''}`}>
                      {i === 0 && clickable(r) ? (
                        <button type="button" className="cursor-pointer text-left font-medium text-[var(--primary)] hover:underline"
                          onClick={(e) => { e.stopPropagation(); open(r); }}>
                          {body}
                        </button>
                      ) : body}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="small flex flex-wrap items-center justify-end gap-3 border-t border-[var(--outline-variant)] px-3 py-1.5">
        <label className="flex items-center gap-2">
          {t('rowsPerPage')}
          <select className="field !min-h-8 !w-auto !py-0" value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}>
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <span className="tnum" aria-live="polite">
          {t('range', { from: result.length ? p * size + 1 : 0, to: Math.min(result.length, p * size + size), total: result.length })}
        </span>
        <button type="button" className="icon-btn" disabled={p === 0} onClick={() => setPage(p - 1)} aria-label={t('prev')}>
          <ChevronLeft size={18} aria-hidden />
        </button>
        <button type="button" className="icon-btn" disabled={p >= pages - 1} onClick={() => setPage(p + 1)} aria-label={t('next')}>
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>
      {detail?.details && (
        <SidePanel open title={detail.details.title} onOpenChange={(o) => { if (!o) setDetail(null); }}>
          <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-4 gap-y-2">
            {detail.details.items.map((it) => (
              <div key={it.label} className="contents">
                <dt className="muted">{it.label}</dt><dd className="break-words">{it.value}</dd>
              </div>
            ))}
          </dl>
          {detail.details.list && detail.details.list.items.length > 0 && (
            <>
              <h3 className="title mt-5 mb-2">{detail.details.list.label}</h3>
              <ul className="small list-disc space-y-1 pl-5 font-mono">
                {detail.details.list.items.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </>
          )}
        </SidePanel>
      )}
    </div>
  );
}
