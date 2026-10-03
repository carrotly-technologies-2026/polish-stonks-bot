// Mirrors universal-backend docs/halohub-api.md (authoritative contract).
export const KATEGORIE = [
  'BARIERA_FIZYCZNA', 'AWARIA', 'OZNAKOWANIE', 'KOMUNIKACJA_MIEJSKA', 'JEZYK',
  'INFORMACJA', 'ODPOCZYNEK_I_TOALETY', 'BEZPIECZENSTWO', 'ORIENTACJA', 'INNE',
] as const;
export const STATUSY = ['nowy', 'w_analizie', 'zaplanowany', 'naprawiony', 'odrzucony'] as const;
export const PRIORYTETY = ['P1', 'P2', 'P3'] as const;

export type Kategoria = (typeof KATEGORIE)[number];
export type Status = (typeof STATUSY)[number];
export type Priorytet = (typeof PRIORYTETY)[number];
export type Podzial = Record<string, number>;
export type Udzial = number | null;
export type Dzien = { dzien: string; liczba: number };

export interface Metryki {
  okres_od: string; okres_do: string; jezyk: string | null; wersja_definicji: string; demo: boolean;
  rozmowy: { razem: number; wg_jezyka: Podzial; wg_typu: Podzial; wg_dnia: Dzien[] };
  mediana_czasu_s: { razem: number | null; wg_jezyka: Record<string, number | null> };
  odsetek_dotarlo: { razem: Udzial; wg_jezyka: Record<string, Udzial>; wg_typu: Record<string, Udzial> };
  ponowne_telefony: { razem: Udzial; wg_jezyka: Record<string, Udzial> };
  bariery: {
    razem: number; wg_kategorii: Podzial; wg_dzielnicy: Podzial; wg_powagi: Podzial;
    wg_jezyka: Podzial; wg_dnia: Dzien[];
  };
  udzial_grup_wrazliwych: Udzial;
  tematy_p1: { razem: number; wg_kategorii: Podzial; wg_dzielnicy: Podzial };
  tematy_p2: { razem: number; wg_kategorii: Podzial; wg_dzielnicy: Podzial };
  czas_reakcji_dni: { razem: number | null; wg_priorytetu: Record<Priorytet, number | null> };
  naprawione: { razem: number; wg_kategorii: Podzial };
  bariery_jezykowe: { razem: number; wg_jezyka: Podzial };
  luka_jezykowa_dotarcia: number | null;
  pytania_rag: { razem: number; wg_grupy: Podzial; wg_jezyka: Podzial };
  odsetek_bez_wynikow: { razem: Udzial; wg_grupy: Record<string, Udzial> };
}

export interface Innowacja {
  tytul: string; url: string; glos_streszczenie: string | null; kontakt: string | null; zrodlo: string;
}

export interface Temat {
  id: string; klucz: string; tytul: string; kategoria: Kategoria; miejsce: string; dzielnica: string | null;
  liczba_zgloszen: number; liczba_osob: number; sr_powaga: number; grupy: string[]; jezyki: string[];
  trend_7d: number; wynik: number; priorytet: Priorytet; rozbicie: string;
  status: Status; notatka: string | null; historia: { status: Status; kiedy: string }[];
  innowacje: Innowacja[];
  pierwsze_zgloszenie: string; ostatnie_zgloszenie: string; aktywny: boolean; demo: boolean; zaktualizowano: string;
}

export interface Bariera {
  id: string; kategoria: Kategoria; opis: string; miejsce: string; dzielnica: string | null;
  powaga: 1 | 2 | 3; dotyczy: string[]; jezyk: string | null; typ_uzytkownika: string | null;
  demo: boolean; utworzono: string;
}

export type TematSzczegoly = Temat & { bariery: Bariera[] };

export interface Luki {
  pytania_bez_wynikow: { pytanie: string; liczba: number; grupy: string[]; jezyki: string[]; ostatnio: string }[];
  potrzeby_nieznalezione: { temat: string; liczba: number; grupy: string[] }[];
  polecane: { url: string; tytul: string | null; liczba: number }[];
  ingest: {
    ostatni: {
      id: string; start: string; koniec: string | null; status: 'trwa' | 'ok' | 'blad';
      statystyki: Record<string, number>; bledy: string[];
    } | null;
    korpus: {
      documents: number; chunks: number; embeddedChunks: number;
      sources: { source: string; active: number; inactive: number }[]; lastFetchedAt: string | null;
    };
  };
}

export interface TematPubliczny {
  tytul: string; kategoria: Kategoria; miejsce: string; dzielnica: string | null; liczba_zgloszen: number;
  priorytet: Priorytet; status: Status; wynik: number; grupy: string[]; jezyki: string[];
}

export interface PublikacjaSkrot {
  id: string; okres_od: string; okres_do: string; status: 'szkic' | 'opublikowana';
  opublikowano: string | null; utworzono: string; demo: boolean; liczba_tematow: number;
}

export interface Publikacja extends PublikacjaSkrot {
  wersja_definicji: string; metryki: Metryki; tematy: TematPubliczny[];
  raport_md: string | null; jezyki_raportu: string[];
}

/** `elevenlabs_agent_id` is MayAI: one voice agent (and one phone number) for the city guide and the ROPS assistant. */
export interface Info { numer: string; numer_tel: string; elevenlabs_agent_id: string | null }

export interface RozmowaSkrot {
  id: string; conversation_id: string; typ_uzytkownika: string | null; jezyk: string | null;
  cel_podrozy: string | null; czy_dotarl: boolean | null; czas_trwania_s: number | null;
  czy_powrot: boolean; liczba_barier: number; demo: boolean; utworzono: string;
}

export const ETAPY = ['ingest', 'embedding', 'rozmowy', 'tematy', 'raport', 'publikacja'] as const;
export type EtapId = (typeof ETAPY)[number];
export type EtapStatus = 'ok' | 'blad' | 'trwa' | 'brak' | 'ostrzezenie';

export interface IngestRun {
  id: string; start: string; koniec: string | null; status: 'trwa' | 'ok' | 'blad';
  statystyki: Record<string, number>; bledy: string[];
}

export interface Pipeline {
  scheduler: { enabled: boolean; report_hour: number; auto_ingest: boolean };
  etapy: {
    id: EtapId; status: EtapStatus; ostatnio: string | null; nastepny: string | null;
    metryki: Record<string, number | string | null>;
  }[];
  ingest_historia: IngestRun[];
}

/** GET /halohub/api/rozmowy/:id (proposed; see README). */
export interface RozmowaSzczegoly extends RozmowaSkrot {
  potrzeby?: { temat: string; grupa: string | null; czy_znaleziono: boolean }[];
  /** Normalised turns, or the raw ElevenLabs `transcript` array – both are accepted. */
  transkrypcja?: unknown;
  bariery?: Bariera[];
  zapytania_rag?: { pytanie: string; grupa: string | null; jezyk: string | null; liczba_wynikow: number; utworzono: string }[];
  /** Earlier calls from the same caller (matched by phone hash on the backend), newest first. */
  poprzednie?: RozmowaSkrot[];
}
