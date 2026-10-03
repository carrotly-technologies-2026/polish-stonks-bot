'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTranslations } from 'next-intl';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Download, Loader2, SendHorizontal, Sparkles } from 'lucide-react';
import {
  CATEGORY_KEYS, EMPTY_IDEA, IDEA_LIMITS, IDEA_STAGES, IDEA_TYPES, ROPS_LINKS, isEmail,
  type IdeaHintStep, type PodpowiedzKreatora, type PomyslZgloszony, type RopsError, type SzkicPomyslu,
} from '@/lib/rops';
import { SourceCard, useCategoryLabel } from './SourceCard';

const KEY = 'rops-idea-v1';
const STEPS = ['opis', 'istota', 'dla_kogo', 'etap', 'podglad'] as const;
const CATEGORIES = Object.keys(CATEGORY_KEYS);
type Hint = { step: IdeaHintStep; loading: boolean; data?: PodpowiedzKreatora; failed?: boolean };

function load(): { step: number; szkic: SzkicPomyslu } {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) || 'null') as { step?: number; szkic?: Partial<SzkicPomyslu> } | null;
    if (!v?.szkic) return { step: 0, szkic: EMPTY_IDEA };
    const szkic = { ...EMPTY_IDEA, ...v.szkic, odbiorcy: Array.isArray(v.szkic.odbiorcy) ? v.szkic.odbiorcy : [] };
    return { step: Math.min(Math.max(Number(v.step) || 0, 0), STEPS.length - 1), szkic };
  } catch { return { step: 0, szkic: EMPTY_IDEA }; }
}

function Field({ id, label, children, count }: { id: string; label: string; children: ReactNode; count?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[0.875rem] font-medium">{label}</label>
        {count && <span className="small tnum !text-[0.75rem]">{count}</span>}
      </div>
      {children}
    </div>
  );
}

function Choice({ name, value, checked, onChange, title, desc, type = 'radio' }: {
  name: string; value: string; checked: boolean; onChange: () => void; title: string; desc?: string; type?: 'radio' | 'checkbox';
}) {
  return (
    <label className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2 text-[0.875rem] leading-[1.25rem] ${checked ? 'border-[var(--primary)] bg-primary-container' : 'border-[var(--outline-variant)]'}`}>
      <input type={type} name={name} value={value} checked={checked} onChange={onChange} className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" />
      <span className="min-w-0">
        <span className="font-medium">{title}</span>
        {desc && <span className="small block !text-[0.8125rem]">{desc}</span>}
      </span>
    </label>
  );
}

/**
 * Idea creator ("Kreator pomysłów") inside the chat widget: a five-step idea card (description, essence, audience,
 * stage, preview) with an assistant that hints at each text field and shows similar innovations from the ROPS library.
 * The draft lives in sessionStorage; contact data is optional and never stored in the browser.
 */
export function IdeaWizard({ lang, onClose }: { lang: string; onClose: () => void }) {
  const t = useTranslations('rops.idea');
  const cat = useCategoryLabel();
  const [step, setStep] = useState(0);
  const [szkic, setSzkic] = useState<SzkicPomyslu>(EMPTY_IDEA);
  const [restored, setRestored] = useState(false);
  const [kontakt, setKontakt] = useState({ nazwa: '', email: '' });
  const [zgoda, setZgoda] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<PomyslZgloszony | null>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const hintReq = useRef<AbortController | null>(null);

  useEffect(() => { const v = load(); setStep(v.step); setSzkic(v.szkic); setRestored(true); }, []);
  useEffect(() => {
    if (!restored || done) return;
    try { sessionStorage.setItem(KEY, JSON.stringify({ step, szkic })); } catch {}
  }, [restored, done, step, szkic]);
  useEffect(() => () => hintReq.current?.abort(), []);

  const set = <K extends keyof SzkicPomyslu>(k: K, v: SzkicPomyslu[K]) => { setSzkic((s) => ({ ...s, [k]: v })); setError(null); };
  const go = useCallback((n: number) => {
    hintReq.current?.abort();
    setStep(n); setError(null); setHint(null);
    requestAnimationFrame(() => headRef.current?.focus({ preventScroll: true }));
  }, []);

  const name = STEPS[step];
  const hasContact = Boolean(kontakt.nazwa.trim() || kontakt.email.trim());
  const problem = (): string | null => {
    if (name === 'opis') return szkic.tytul.trim().length < 3 ? 'errTitle' : szkic.opis.trim().length < 10 ? 'errDesc' : null;
    if (name === 'istota') return szkic.istota.trim().length < 10 ? 'errEssence' : null;
    if (name === 'dla_kogo') return !szkic.odbiorcy.length && !szkic.dla_kogo.trim() ? 'errAudience' : null;
    if (name === 'etap') return szkic.etap ? null : 'errStage';
    return hasContact && !isEmail(kontakt.email) ? 'errEmail' : hasContact && !zgoda ? 'errConsent' : null;
  };

  const askHint = async (krok: IdeaHintStep) => {
    hintReq.current?.abort();
    const ctl = new AbortController();
    hintReq.current = ctl;
    setHint({ step: krok, loading: true });
    try {
      const res = await fetch('/api/rops/kreator', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ krok, szkic, jezyk: lang }),
        signal: ctl.signal,
      });
      const data = (await res.json().catch(() => null)) as PodpowiedzKreatora | null;
      if (hintReq.current !== ctl) return;
      setHint(res.ok && data && Array.isArray(data.podobne) ? { step: krok, loading: false, data } : { step: krok, loading: false, failed: true });
    } catch {
      if (hintReq.current === ctl) setHint({ step: krok, loading: false, failed: true });
    }
  };

  const submit = async () => {
    setSending(true);
    let err: RopsError | null = null;
    try {
      const res = await fetch('/api/rops/pomysl', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...szkic, jezyk: lang, ...(hasContact ? { kontakt, zgoda } : {}) }),
      });
      const data = (await res.json().catch(() => null)) as (PomyslZgloszony & { error?: RopsError }) | null;
      if (res.ok && data?.numer) {
        try { sessionStorage.removeItem(KEY); } catch {}
        setDone(data);
        requestAnimationFrame(() => headRef.current?.focus({ preventScroll: true }));
      } else err = data?.error ?? (res.status === 429 ? 'rate_limited' : res.status === 400 ? 'invalid' : 'failed');
    } catch { err = 'failed'; }
    setSending(false);
    if (err) setError(`sendErr_${err}`);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const p = problem();
    if (p) { setError(p); return; }
    if (step < STEPS.length - 1) go(step + 1); else void submit();
  };
  const restart = () => { setSzkic(EMPTY_IDEA); setKontakt({ nazwa: '', email: '' }); setZgoda(false); setDone(null); go(0); };

  const canvas = (
    <div className="flex flex-col gap-1.5 rounded-xl border border-[var(--outline-variant)] p-3">
      <p className="text-[0.875rem] font-medium">{t('canvasTitle')}</p>
      <p className="small !text-[0.8125rem]">{t('canvasDesc')}</p>
      <a href={ROPS_LINKS.canvas} target="_blank" rel="noopener noreferrer" className="btn btn-tonal self-start !min-h-9 !px-3">
        <Download size={16} aria-hidden />{t('canvasBtn')}
      </a>
    </div>
  );

  if (done) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto px-4 py-6 text-center">
        <CheckCircle2 size={40} className="text-[var(--primary)]" aria-hidden />
        <h3 ref={headRef} tabIndex={-1} className="title outline-none">{t('doneTitle')}</h3>
        <p className="tnum text-[0.9375rem] font-medium">{t('doneNumber', { numer: done.numer })}</p>
        <p className="small">{t('doneNote')}</p>
        <div className="w-full text-left">{canvas}</div>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn btn-outline !min-h-10" onClick={restart}>{t('another')}</button>
          <button type="button" className="btn !min-h-10" onClick={onClose}>{t('backToChat')}</button>
        </div>
      </div>
    );
  }

  const hintBox = (krok: IdeaHintStep, apply: (v: string) => void) => (
    <div className="flex flex-col gap-2">
      <button type="button" className="btn btn-outline self-start !min-h-9 !px-3" onClick={() => void askHint(krok)} disabled={hint?.loading}>
        {hint?.loading ? <Loader2 size={16} className="spin" aria-hidden /> : <Sparkles size={16} aria-hidden />}{t('hint')}
      </button>
      <div aria-live="polite">
        {hint?.step === krok && hint.loading && <p className="muted text-[0.875rem]">{t('hintLoading')}</p>}
        {hint?.step === krok && hint.failed && <p role="alert" className="text-[0.875rem] text-[var(--error)]">{t('hintErr')}</p>}
        {hint?.step === krok && hint.data && (
          <div className="flex flex-col gap-2 rounded-xl bg-[var(--surface-2)] p-3 text-[0.875rem] leading-[1.375rem]">
            <h4 className="label uppercase">{t('hintTitle')}</h4>
            <div className="rw-answer"><div className="prose-report break-words"><ReactMarkdown skipHtml>{hint.data.wskazowka ?? t(`tip_${krok}`)}</ReactMarkdown></div></div>
            {hint.data.propozycja && (
              <div className="flex flex-col gap-1.5 border-l-4 border-[var(--primary)] pl-3">
                <p className="label uppercase">{t('proposal')}</p>
                <p className="break-words whitespace-pre-wrap">{hint.data.propozycja}</p>
                <button type="button" className="btn btn-tonal self-start !min-h-8 !px-3" onClick={() => apply(hint.data!.propozycja!)}>{t('insert')}</button>
              </div>
            )}
            {hint.data.podobne.length > 0 && (
              <>
                <h4 className="label uppercase">{t('similar')}</h4>
                <ol className="grid gap-1.5">
                  {hint.data.podobne.map((w) => <li key={w.id}><SourceCard w={w} headingLevel={4} compact /></li>)}
                </ol>
              </>
            )}
            {hint.data.model && <p className="small !text-[0.75rem]">{t('hintAi')}</p>}
          </div>
        )}
      </div>
    </div>
  );

  const area = (k: 'opis' | 'istota' | 'dla_kogo', rows: number) => (
    <Field id={`ik-${k}`} label={t(`f_${k}`)} count={t('chars', { n: szkic[k].length, max: IDEA_LIMITS[k] })}>
      <textarea id={`ik-${k}`} rows={rows} maxLength={IDEA_LIMITS[k]} value={szkic[k]} placeholder={t(`f_${k}_ph`)}
        onChange={(e) => set(k, e.target.value)} className="field resize-y !rounded-xl !py-2 !text-[0.9375rem] leading-[1.375rem]" />
    </Field>
  );
  const audience = [...szkic.odbiorcy.map(cat), szkic.dla_kogo.trim()].filter(Boolean).join(', ');

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-1.5 border-b border-[var(--outline-variant)] px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 ref={headRef} tabIndex={-1} className="text-[0.9375rem] font-medium outline-none">{t('title')} · {t(`s_${name}`)}</h3>
          <p className="small tnum shrink-0 !text-[0.75rem]">{t('stepOf', { n: step + 1, total: STEPS.length })}</p>
        </div>
        <div className="flex gap-1" aria-hidden>
          {STEPS.map((s, i) => <span key={s} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-[var(--primary)]' : 'bg-[var(--outline-variant)]'}`} />)}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 py-3">
        {name === 'opis' && (
          <>
            <p className="muted text-[0.875rem]">{t('intro')}</p>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-[0.875rem] font-medium">{t('typeLegend')}</legend>
              {IDEA_TYPES.map((v) => (
                <Choice key={v} name="ik-typ" value={v} checked={szkic.typ === v} onChange={() => set('typ', v)} title={t(`type_${v}`)} desc={t(`type_${v}_desc`)} />
              ))}
            </fieldset>
            <Field id="ik-tytul" label={t('f_tytul')}>
              <input id="ik-tytul" type="text" maxLength={IDEA_LIMITS.tytul} value={szkic.tytul} placeholder={t('f_tytul_ph')}
                onChange={(e) => set('tytul', e.target.value)} className="field !rounded-xl !text-[0.9375rem]" />
            </Field>
            {area('opis', 4)}
            {hintBox('opis', (v) => set('opis', v.slice(0, IDEA_LIMITS.opis)))}
            {canvas}
          </>
        )}
        {name === 'istota' && (
          <>
            {area('istota', 5)}
            {hintBox('istota', (v) => set('istota', v.slice(0, IDEA_LIMITS.istota)))}
          </>
        )}
        {name === 'dla_kogo' && (
          <>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-[0.875rem] font-medium">{t('audienceLegend')}</legend>
              {CATEGORIES.map((c) => (
                <Choice key={c} type="checkbox" name="ik-odbiorcy" value={c} checked={szkic.odbiorcy.includes(c)} title={cat(c)}
                  onChange={() => set('odbiorcy', szkic.odbiorcy.includes(c) ? szkic.odbiorcy.filter((x) => x !== c) : [...szkic.odbiorcy, c])} />
              ))}
            </fieldset>
            {area('dla_kogo', 3)}
            {hintBox('dla_kogo', (v) => set('dla_kogo', v.slice(0, IDEA_LIMITS.dla_kogo)))}
          </>
        )}
        {name === 'etap' && (
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-[0.875rem] font-medium">{t('stageLegend')}</legend>
            {IDEA_STAGES.map((v) => (
              <Choice key={v} name="ik-etap" value={v} checked={szkic.etap === v} onChange={() => set('etap', v)} title={t(`stage_${v}`)} desc={t(`stage_${v}_desc`)} />
            ))}
          </fieldset>
        )}
        {name === 'podglad' && (
          <>
            <section aria-label={t('summaryTitle')} className="flex flex-col gap-2 rounded-xl border border-[var(--outline-variant)] p-3">
              <p className="label uppercase">{t('summaryTitle')} · {t(`type_${szkic.typ}`)}</p>
              <p className="text-[1rem] leading-[1.375rem] font-medium break-words">{szkic.tytul}</p>
              <dl className="flex flex-col gap-2 text-[0.875rem] leading-[1.375rem]">
                {([['f_opis', szkic.opis], ['f_istota', szkic.istota], ['f_odbiorcy', audience], ['f_etap', szkic.etap ? t(`stage_${szkic.etap}`) : '']] as const).map(([k, v]) => (
                  <div key={k}>
                    <dt className="small !text-[0.75rem]">{t(k)}</dt>
                    <dd className="break-words whitespace-pre-wrap">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-[0.875rem] font-medium">{t('contactLegend')}</legend>
              <Field id="ik-nazwa" label={t('f_nazwa')}>
                <input id="ik-nazwa" type="text" maxLength={120} autoComplete="name" value={kontakt.nazwa}
                  onChange={(e) => { setKontakt((k) => ({ ...k, nazwa: e.target.value })); setError(null); }} className="field !rounded-xl !text-[0.9375rem]" />
              </Field>
              <Field id="ik-email" label={t('f_email')}>
                <input id="ik-email" type="email" maxLength={200} autoComplete="email" value={kontakt.email}
                  onChange={(e) => { setKontakt((k) => ({ ...k, email: e.target.value })); setError(null); }} className="field !rounded-xl !text-[0.9375rem]" />
              </Field>
              {hasContact && (
                <label className="flex cursor-pointer items-start gap-2.5 text-[0.8125rem] leading-[1.25rem]">
                  <input type="checkbox" checked={zgoda} onChange={(e) => { setZgoda(e.target.checked); setError(null); }} className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" />
                  <span>{t('consent')}</span>
                </label>
              )}
            </fieldset>
            <p className="small !text-[0.75rem]">{t('publicNote')}</p>
          </>
        )}
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-[var(--warning-container)] px-3 py-2 text-[0.875rem]">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--warning)]" aria-hidden />{t(error)}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[var(--outline-variant)] px-3 py-2.5">
        <button type="button" className="btn btn-outline !min-h-10 !px-3" onClick={() => (step === 0 ? onClose() : go(step - 1))} disabled={sending}>
          <ArrowLeft size={16} aria-hidden />{step === 0 ? t('backToChat') : t('back')}
        </button>
        <button type="submit" className="btn !min-h-10 !px-4" disabled={sending}>
          {name === 'podglad'
            ? <>{sending ? <Loader2 size={16} className="spin" aria-hidden /> : <SendHorizontal size={16} aria-hidden />}{sending ? t('sending') : t('submit')}</>
            : <>{t('next')}<ArrowRight size={16} aria-hidden /></>}
        </button>
      </div>
    </form>
  );
}
