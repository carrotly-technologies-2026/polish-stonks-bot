import { useTranslations } from 'next-intl';
import { BookOpen, ChartColumn, Download, ExternalLink, FileText, Map as MapIcon, Tag } from 'lucide-react';
import type { ComponentType } from 'react';
import { CATEGORY_KEYS, clip, highlightParts, prettyTitle, type WynikRops } from '@/lib/rops';

type Icon = ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
export const SOURCE_ICON: Record<string, Icon> = {
  biblioteka: BookOpen, raporty: ChartColumn, mapa_wyzwan: MapIcon, publikacje: FileText,
};

/** Text with query terms wrapped in <mark>. */
export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  return <>{highlightParts(text, terms).map((p, i) => (p.hit ? <mark key={i} className="hl">{p.s}</mark> : p.s))}</>;
}

/** Translated label for a backend category (falls back to the Polish label). */
export function useCategoryLabel() {
  const t = useTranslations('rops.cat');
  return (c: string) => { const k = CATEGORY_KEYS[c]; return k && t.has(k) ? t(k) : c; };
}

/** One ROPS source: title, source / category badges, summary, open + download buttons. */
export function SourceCard({ w, nr, anchorId, terms = [], showFragment = false, headingLevel = 3 }: {
  w: WynikRops; nr?: number; anchorId?: string; terms?: string[]; showFragment?: boolean; headingLevel?: 3 | 4;
}) {
  const t = useTranslations('rops');
  const cat = useCategoryLabel();
  const Icon = SOURCE_ICON[w.zrodlo] ?? FileText;
  const title = prettyTitle(w.tytul);
  const H = headingLevel === 3 ? 'h3' : 'h4';
  const src = t.has(`src.${w.zrodlo}`) ? t(`src.${w.zrodlo}`) : w.zrodlo_nazwa;
  const summary = clip(w.streszczenie, 320);
  const fragment = showFragment && w.fragment && w.fragment !== w.streszczenie ? clip(w.fragment, 360) : '';
  return (
    <article id={anchorId} className="source-card panel flex min-w-0 flex-col gap-2 p-4" aria-label={nr ? t('sourceN', { n: nr, title }) : title}>
      <div className="flex flex-wrap items-center gap-2">
        {nr !== undefined && (
          <span className="tnum grid size-6 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-[0.75rem] font-medium text-[var(--on-primary)]" aria-hidden>{nr}</span>
        )}
        <span className="chip chip-info"><Icon size={14} aria-hidden />{src}</span>
        {w.kategoria && <span className="chip chip-neutral"><Tag size={14} aria-hidden />{cat(w.kategoria)}</span>}
      </div>
      <H className="title break-words"><Highlight text={title} terms={terms} /></H>
      {summary && <p className="muted break-words"><Highlight text={summary} terms={terms} /></p>}
      {fragment && (
        <blockquote className="small break-words border-l-4 border-[var(--outline)] pl-3 !text-[0.8125rem] !leading-[1.25rem]">
          <span className="sr-only">{t('fragment')}: </span>…<Highlight text={fragment} terms={terms} />
        </blockquote>
      )}
      {w.kontakt && <p className="small break-words">{clip(w.kontakt, 200)}</p>}
      <div className="mt-1 flex flex-wrap gap-2">
        <a href={w.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline !min-h-9 !px-3">
          <ExternalLink size={16} aria-hidden />{t('openSource')}<span className="sr-only"> – {title} ({t('newTab')})</span>
        </a>
        {w.pliki.map((f) => (
          <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer" download
            className="btn btn-tonal !min-h-9 !max-w-full !px-3" title={f.nazwa}>
            <Download size={16} aria-hidden className="shrink-0" />
            <span className="truncate">{t('download')}<span className="sr-only">: {f.nazwa}</span>
              <span aria-hidden className="font-normal"> · {/\.pdf$/i.test(f.nazwa) || /\.pdf$/i.test(f.url) ? 'PDF' : clip(f.nazwa, 24)}</span>
            </span>
          </a>
        ))}
      </div>
    </article>
  );
}
