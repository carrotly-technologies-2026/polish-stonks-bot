'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type Series = { key: string; name: string; color: string };
export type Point = { label: string } & Record<string, number | string>;

/**
 * Monitoring-style chart: area (time series) or bars (categories), crosshair tooltip,
 * legend chips that toggle series, and a "show data" table alternative.
 */
export function TimeSeries({ title, sub, data, series, kind = 'area', firstCol }: {
  title: string; sub?: string; data: Point[]; series: Series[]; kind?: 'area' | 'bar'; firstCol?: string;
}) {
  const t = useTranslations('common');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const visible = series.filter((s) => !hidden.has(s.key));
  const toggle = (k: string) => setHidden((h) => {
    const n = new Set(h);
    if (n.has(k)) n.delete(k); else if (n.size < series.length - 1) n.add(k);
    return n;
  });
  const axis = { tickLine: false, axisLine: false, tick: { fill: 'var(--on-surface-variant)', fontSize: 11 } };
  const tooltip = (
    <Tooltip
      cursor={kind === 'area' ? { stroke: 'var(--outline)', strokeWidth: 1, strokeDasharray: '3 3' } : { fill: 'var(--hover)' }}
      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: 8,
        boxShadow: 'var(--shadow)', color: 'var(--on-surface)', fontSize: 12 }}
      labelStyle={{ color: 'var(--on-surface-variant)', marginBottom: 4 }}
    />
  );

  return (
    <figure className="panel m-0">
      <div className="panel-head flex-wrap">
        <figcaption>
          <span className="title block">{title}</span>
          {sub && <span className="small">{sub}</span>}
        </figcaption>
        {series.length > 1 && (
          <div className="flex flex-wrap gap-1" role="group" aria-label={t('legend')}>
            {series.map((s) => (
              <button key={s.key} type="button" onClick={() => toggle(s.key)} aria-pressed={!hidden.has(s.key)}
                className={`chip min-h-8 cursor-pointer border border-[var(--outline-variant)] ${hidden.has(s.key) ? 'opacity-60' : ''}`}>
                <span aria-hidden className="inline-block size-2.5 rounded-sm" style={{ background: s.color }} />
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="px-2 pt-3" aria-hidden>
        <ResponsiveContainer width="100%" height={240}>
          {kind === 'area' ? (
            <AreaChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke="var(--outline-variant)" />
              <XAxis dataKey="label" {...axis} minTickGap={16} />
              <YAxis allowDecimals={false} width={44} {...axis} />
              {tooltip}
              {visible.map((s) => (
                <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2}
                  fill={s.color} fillOpacity={0.12} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke="var(--outline-variant)" />
              <XAxis dataKey="label" {...axis} interval={0} />
              <YAxis allowDecimals={false} width={44} {...axis} />
              {tooltip}
              {visible.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <details className="px-5 pb-3">
        <summary className="inline-flex min-h-10 cursor-pointer items-center text-[var(--primary)]">{t('showData')}</summary>
        <div className="max-h-72 overflow-auto">
          <table className="dt">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th scope="col">{firstCol ?? t('day')}</th>
                {series.map((s) => <th key={s.key} scope="col" className="num">{s.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.label}>
                  <th scope="row" className="font-normal">{r.label}</th>
                  {series.map((s) => <td key={s.key} className="num">{String(r[s.key] ?? 0)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
