import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Sparkline } from './Sparkline';

export type Change = { text: string; dir: 'up' | 'down' | 'same'; dirLabel: string } | { text: string; dir: null };

/** Scorecard: label, value, delta vs previous period, optional sparkline. */
export function MetricTile({ label, value, change, caption, spark }: {
  label: string; value: string; change?: Change; caption?: string; spark?: number[];
}) {
  const Icon = change?.dir === 'up' ? ArrowUpRight : change?.dir === 'down' ? ArrowDownRight : Minus;
  return (
    <div className="panel panel-pad flex min-h-32 flex-col gap-1">
      <h3 className="label">{label}</h3>
      <p className="tnum text-[2rem] leading-[2.5rem] font-normal">{value}</p>
      {change && (
        <p className="small flex items-center gap-1">
          {change.dir && <Icon size={14} strokeWidth={2} aria-hidden />}
          {change.dir && <span className="sr-only">{change.dirLabel}: </span>}
          {change.text}
        </p>
      )}
      {caption && <p className="small">{caption}</p>}
      {spark && <div className="mt-auto pt-1"><Sparkline values={spark} /></div>}
    </div>
  );
}
