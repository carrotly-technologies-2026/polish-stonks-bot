import Link from 'next/link';
import { Bot, CircleCheck, CircleX, Flag, MapPin, Phone, Search, User, Wrench } from 'lucide-react';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { panelApi } from '@/lib/api';
import { globalQuery, type SearchParams } from '@/lib/filters';
import { fmtDate, fmtDuration, langName } from '@/lib/format';
import { label } from '@/lib/labels';
import { normaliseTranscript } from '@/lib/transcript';
import type { RozmowaSkrot, RozmowaSzczegoly } from '@/lib/types';
import { Chip } from '@/components/Chip';
import { RefreshButton } from '@/components/RefreshButton';
import { DemoLabel, ErrorCard, PageHeader, Panel } from '@/components/ui';

const clock = (s: number | null) => (s === null ? '' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);

export default async function Conversation({ params, searchParams }: {
  params: Promise<{ lang: string; id: string }>; searchParams: Promise<SearchParams>;
}) {
  const { lang, id } = await params;
  setRequestLocale(lang);
  const sp = await searchParams;
  const l = await getLocale();
  const [t, tc, tn, tu, tcat, tsev] = await Promise.all([
    getTranslations('conversations'), getTranslations('common'), getTranslations('nav'),
    getTranslations('userTypes'), getTranslations('categories'), getTranslations('severity'),
  ]);
  const detail = await panelApi.conversation(id);
  // Fallback while the detail endpoint is missing: the summary row from the list.
  let r: RozmowaSzczegoly | null = detail.ok ? detail.data : null;
  if (!r) {
    const list = await panelApi.conversations(200);
    r = list.ok ? list.data.find((x) => x.id === id || x.conversation_id === id) ?? null : null;
  }
  const back = `/${lang}/panel/rozmowy${globalQuery(sp)}`;
  const crumbs = [{ label: tn('section_data') }, { label: t('title'), href: back }, { label: r?.conversation_id ?? id }];
  if (!r) {
    return (<><PageHeader title={t('conversation')} crumbs={crumbs} /><ErrorCard error={detail.ok ? undefined : detail.error} /></>);
  }

  const turns = normaliseTranscript(r.transkrypcja);
  const bariery = r.bariery ?? [];
  const pytania = r.zapytania_rag ?? [];
  const yesNo = (v: boolean | null) => (v === null ? tc('unknown') : v ? tc('yes') : tc('no'));
  const reached = r.czy_dotarl === null ? <Chip tone="neutral" label={t('reachedUnknown')} />
    : r.czy_dotarl ? <Chip tone="success" label={t('reachedYes')} /> : <Chip tone="error" label={t('reachedNo')} />;

  return (
    <>
      <PageHeader title={`${t('conversation')} ${r.conversation_id}`} crumbs={crumbs} actions={<RefreshButton />}
        lead={<span className="flex flex-wrap items-center gap-2">{reached}{r.czy_powrot && <Chip tone="info" label={t('returnCall')} />}<DemoLabel show={r.demo} /></span>} />

      {!detail.ok && (
        <div role="status" className="panel panel-pad mb-4 !border-[var(--warning)]">
          <p className="title">{t('detailMissingTitle')}</p>
          <p className="muted mt-1">{t('detailMissing')}</p>
          <p className="small mt-1 font-mono">GET /halohub/api/rozmowy/:id → {detail.error}</p>
        </div>
      )}

      <Panel title={t('summary')} id="podsumowanie">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr_auto_1fr] lg:grid-cols-[auto_1fr_auto_1fr_auto_1fr]">
          <dt className="muted">{t('colTime')}</dt><dd>{fmtDate(l, r.utworzono, true)}</dd>
          <dt className="muted">{t('colDuration')}</dt><dd className="tnum">{fmtDuration(l, r.czas_trwania_s)}</dd>
          <dt className="muted">{t('colLanguage')}</dt><dd>{r.jezyk ? langName(l, r.jezyk, tc('unknown')) : tc('unknown')}</dd>
          <dt className="muted">{t('colUserType')}</dt><dd>{label(tu, r.typ_uzytkownika)}</dd>
          <dt className="muted">{t('colGoal')}</dt><dd>{r.cel_podrozy ?? '–'}</dd>
          <dt className="muted">{t('colReached')}</dt><dd>{yesNo(r.czy_dotarl)}</dd>
          <dt className="muted">{t('colReturn')}</dt><dd>{yesNo(r.czy_powrot)}</dd>
          <dt className="muted">{t('colBarriers')}</dt><dd className="tnum">{r.liczba_barier}</dd>
          <dt className="muted">{t('colId')}</dt><dd className="font-mono break-all">{r.conversation_id}</dd>
        </dl>
      </Panel>

      <div className="mt-4 grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Panel title={t('transcript')} sub={turns.length ? t('turns', { count: turns.length }) : undefined} id="transkrypcja">
          {turns.length === 0 ? <p className="muted">{t('noTranscript')}</p> : (
            <ol className="flex flex-col gap-3">
              {turns.map((turn, i) => {
                const agent = turn.rola === 'agent';
                return (
                  <li key={i} className={`flex gap-2 ${agent ? '' : 'flex-row-reverse'}`}>
                    <span aria-hidden className={`grid size-8 shrink-0 place-items-center rounded-full ${agent ? 'bg-primary-container text-on-primary-container' : 'bg-surface-2'}`}>
                      {agent ? <Bot size={16} /> : <User size={16} />}
                    </span>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 ${agent ? 'bg-surface-2' : 'bg-selected'}`}>
                      <p className="small mb-0.5">
                        {agent ? t('agent') : t('caller')}{turn.czas_s !== null && <> · <span className="tnum">{clock(turn.czas_s)}</span></>}
                      </p>
                      {turn.tekst && <p className="whitespace-pre-wrap">{turn.tekst}</p>}
                      {turn.narzedzia.map((x, j) => (
                        <div key={j} className="mt-1.5 rounded-md border border-[var(--outline-variant)] bg-surface px-2 py-1.5 text-[0.8125rem]">
                          <p className="flex items-center gap-1 font-medium"><Wrench size={14} aria-hidden />{x.nazwa}{x.blad && <Chip tone="error" label={t('toolError')} />}</p>
                          {x.parametry && <p className="small font-mono break-all">→ {x.parametry}</p>}
                          {x.wynik && <p className="small font-mono break-all">← {x.wynik}</p>}
                        </div>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title={t('flow')} id="przebieg">
            <ol className="relative flex flex-col gap-4 border-l border-[var(--outline)] pl-5">
              <Step icon={<Phone size={14} />} title={t('flowStart')}
                text={[fmtDate(l, r.utworzono, true), r.jezyk?.toUpperCase(), label(tu, r.typ_uzytkownika)].filter(Boolean).join(' · ')} />
              {r.cel_podrozy && <Step icon={<Flag size={14} />} title={t('colGoal')} text={r.cel_podrozy} />}
              {pytania.map((q, i) => (
                <Step key={`q${i}`} icon={<Search size={14} />} title={t('flowQuestion')}
                  text={`„${q.pytanie}” – ${t('results', { count: q.liczba_wynikow })}`} />
              ))}
              {bariery.map((b) => (
                <Step key={b.id} icon={<MapPin size={14} />} title={`${t('flowBarrier')}: ${label(tcat, b.kategoria)}`}
                  text={`${b.miejsce}${b.dzielnica ? `, ${b.dzielnica}` : ''} · ${label(tsev, String(b.powaga))}`} />
              ))}
              <Step icon={r.czy_dotarl ? <CircleCheck size={14} /> : <CircleX size={14} />} title={t('flowEnd')}
                text={`${fmtDuration(l, r.czas_trwania_s)} · ${r.czy_dotarl === null ? t('reachedUnknown') : r.czy_dotarl ? t('reachedYes') : t('reachedNo')}`} />
            </ol>
          </Panel>

          {bariery.length > 0 && (
            <Panel title={t('barriers')} pad={false} id="bariery">
              <ul className="divide-y divide-[var(--outline-variant)]">
                {bariery.map((b) => (
                  <li key={b.id} className="px-5 py-2.5">
                    <p className="font-medium">{label(tcat, b.kategoria)} · {b.miejsce}{b.dzielnica ? `, ${b.dzielnica}` : ''}</p>
                    <p>{b.opis}</p>
                    <p className="small">{label(tsev, String(b.powaga))}{b.dotyczy.length ? ` · ${b.dotyczy.map((d) => label(tu, d)).join(', ')}` : ''}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {(r.potrzeby?.length ?? 0) > 0 && (
            <Panel title={t('needs')} pad={false} id="potrzeby">
              <ul className="divide-y divide-[var(--outline-variant)]">
                {r.potrzeby!.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 px-5 py-2.5">
                    <span className="flex-1">{p.temat}{p.grupa ? <span className="small"> · {label(tu, p.grupa)}</span> : null}</span>
                    <Chip tone={p.czy_znaleziono ? 'success' : 'warning'} label={p.czy_znaleziono ? t('found') : t('notFound')} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title={t('previous')} pad={false} id="poprzednie">
            {(r.poprzednie?.length ?? 0) === 0 ? <p className="muted panel-pad">{t('noPrevious')}</p> : (
              <ul className="divide-y divide-[var(--outline-variant)]">
                {r.poprzednie!.map((p: RozmowaSkrot) => (
                  <li key={p.id}>
                    <Link href={`/${lang}/panel/rozmowy/${p.id}${globalQuery(sp)}`} className="flex items-center gap-2 px-5 py-2.5 !text-[var(--on-surface)] no-underline hover:bg-[var(--hover)]">
                      <span className="flex-1">{fmtDate(l, p.utworzono, true)} · {p.cel_podrozy ?? '–'}</span>
                      <span className="small tnum">{fmtDuration(l, p.czas_trwania_s)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function Step({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="relative">
      <span aria-hidden className="absolute top-0 -left-[1.95rem] grid size-6 place-items-center rounded-full border border-[var(--outline)] bg-surface text-[var(--primary)]">{icon}</span>
      <p className="font-medium">{title}</p>
      <p className="small">{text}</p>
    </li>
  );
}
