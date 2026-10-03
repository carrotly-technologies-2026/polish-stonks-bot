import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Clock, Info as InfoIcon, Mic, Phone } from 'lucide-react';
import type { Info } from '@/lib/types';
import { ElevenLabsWidget } from '@/components/ElevenLabsWidget';

/**
 * Voice line: the same MayAI agent (and phone number) as the city guide on /info – one agent searches both
 * the city knowledge and the ROPS materials. Disabled with an explanation until the agent id is configured.
 */
export function VoiceCard({ info, lang }: { info: Info | null; lang: string }) {
  const t = useTranslations('rops.voice');
  const agentId = info?.elevenlabs_agent_id;
  return (
    <section className="panel flex flex-col gap-3 p-5" aria-labelledby="glos-h">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-container text-on-primary-container"><Mic size={22} /></span>
        <div className="min-w-0">
          <h2 id="glos-h" className="title">{t('title')}</h2>
          {!agentId && <span className="chip chip-neutral mt-1"><Clock size={14} aria-hidden />{t('soon')}</span>}
        </div>
      </div>
      <p>{t('desc')}</p>
      {agentId ? (
        <>
          <p className="small">{t('howTo')}</p>
          <ElevenLabsWidget agentId={agentId} />
        </>
      ) : (
        <p className="small" role="note">{t('disabled')}</p>
      )}
      {info && (
        <div className="flex flex-col gap-2 rounded-xl bg-[var(--surface-2)] p-4">
          <p className="label uppercase">{t('phoneLabel')}</p>
          <a href={`tel:${info.numer_tel}`} className="btn tnum self-start !min-h-12 !px-5 !text-[1.125rem] ![color:var(--on-primary)]">
            <Phone size={20} aria-hidden /><span className="sr-only">{t('call')}: </span>{info.numer}
          </a>
          <p className="small">{t('phoneNote')}</p>
          <Link href={`/${lang}/info`} className="flex items-center gap-1 self-start text-[0.875rem]">
            <InfoIcon size={16} aria-hidden />{t('more')}
          </Link>
        </div>
      )}
    </section>
  );
}
