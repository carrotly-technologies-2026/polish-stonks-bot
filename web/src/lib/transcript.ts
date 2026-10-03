/** Normalises a stored transcript (our shape or raw ElevenLabs `transcript`) into display turns. */
export type Tool = { nazwa: string; parametry: string | null; wynik: string | null; blad: boolean };
export type Turn = { rola: 'agent' | 'uzytkownik'; tekst: string | null; czas_s: number | null; narzedzia: Tool[] };

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const short = (v: unknown, max = 400) => {
  if (v === null || v === undefined) return null;
  const text = typeof v === 'string' ? v : JSON.stringify(v);
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

export function normaliseTranscript(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item): Turn => {
    const r = rec(item);
    const role = s(r.rola) ?? s(r.role);
    const calls = Array.isArray(r.tool_calls) ? r.tool_calls.map(rec) : [];
    const results = Array.isArray(r.tool_results) ? r.tool_results.map(rec) : [];
    const own = Array.isArray(r.narzedzia) ? r.narzedzia.map(rec) : [];
    const narzedzia: Tool[] = own.length
      ? own.map((x) => ({ nazwa: s(x.nazwa) ?? '?', parametry: short(x.parametry), wynik: short(x.wynik), blad: x.blad === true }))
      : [
          ...calls.map((c) => ({ nazwa: s(c.tool_name) ?? '?', parametry: short(c.params_as_json ?? c.parameters), wynik: null, blad: false })),
          ...results.map((c) => ({ nazwa: s(c.tool_name) ?? '?', parametry: null, wynik: short(c.result_value ?? c.result), blad: c.is_error === true })),
        ];
    return {
      rola: role === 'user' || role === 'uzytkownik' ? 'uzytkownik' : 'agent',
      tekst: s(r.tekst) ?? s(r.message),
      czas_s: n(r.czas_s) ?? n(r.time_in_call_secs),
      narzedzia,
    };
  }).filter((t) => t.tekst || t.narzedzia.length);
}
