import { AlertTriangle, CheckCircle2, CircleDot, FlaskConical, Loader2, MinusCircle, XCircle } from 'lucide-react';
import type { ComponentType } from 'react';

export type Tone = 'success' | 'error' | 'warning' | 'running' | 'info' | 'neutral' | 'demo';

const ICON: Record<Tone, ComponentType<{ size?: number; strokeWidth?: number; className?: string; 'aria-hidden'?: boolean }>> = {
  success: CheckCircle2, error: XCircle, warning: AlertTriangle, running: Loader2, info: CircleDot,
  neutral: MinusCircle, demo: FlaskConical,
};

/** Status chip: icon + text, never colour alone. Usable from server and client components. */
export function Chip({ tone, label, title }: { tone: Tone; label: string; title?: string }) {
  const Icon = ICON[tone];
  return (
    <span className={`chip chip-${tone === 'demo' ? 'warning' : tone}`} title={title}>
      <Icon size={14} strokeWidth={2} className={tone === 'running' ? 'spin' : undefined} aria-hidden />
      {label}
    </span>
  );
}

export const PRIORITY_TONE = { P1: 'error', P2: 'warning', P3: 'neutral' } as const;
export const TOPIC_STATUS_TONE: Record<string, Tone> = {
  nowy: 'info', w_analizie: 'running', zaplanowany: 'warning', naprawiony: 'success', odrzucony: 'neutral',
};
export const RUN_TONE: Record<string, Tone> = {
  ok: 'success', blad: 'error', trwa: 'running', brak: 'neutral', ostrzezenie: 'warning',
};
