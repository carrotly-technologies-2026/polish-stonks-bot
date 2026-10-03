# Halo, Hub! – web (panel miasta + strona publiczna)

Next.js 15 (App Router, Server Components) + Tailwind 4 + next-intl (pl / en / uk) + Radix + Recharts.
All data comes from the universal-backend Halo, Hub! API (`docs/halohub-api.md`); the browser never talks to the
backend directly and never sees the admin token.

## Run locally

```bash
cp .env.example .env.local   # adjust values
npm install
npm run dev                  # http://localhost:3100/pl  (panel: /pl/panel, open to everyone)
```

Production build: `npm run build && npm start` (port 3100 locally; Docker uses `PORT`, default 3000).

## Environment

| Variable | Purpose |
|---|---|
| `HALOHUB_API_URL` | Backend base URL, e.g. `http://localhost:3000` (default). Server-side only. |
| `HALOHUB_ADMIN_TOKEN` | Bearer for `/halohub/api/*` and `/halohub/jobs/*` (panel data, publish, jobs, demo data). |

## Routes

- Public: `/[lang]` (hero, `tel:` number, ElevenLabs widget when `elevenlabs_agent_id` is set, key numbers),
  `/[lang]/raport` (latest publication, `?id=` for archive), `/api/open-data/{metryki,tematy}.{csv,json}` (proxy).
- ROPS knowledge assistant (prototype): `/[lang]/rops` (chat line with cited answers + MayAI phone number),
  `/[lang]/rops/szukaj` (advanced search, state in the URL). Proxies: `/api/rops/{zapytaj,szukaj,facety}` →
  `/halohub/public/rops/*` (client IP forwarded; 404 from the backend shows "asystent jest aktualizowany").
- Panel: `/[lang]/panel` (overview), `/priorytety`, `/jezyki`, `/wiedza`, `/publikacje`.
  Filters live in the URL: `?zakres=24h|7d|30d&jezyk=pl|en|uk`.

## Deploy (Coolify)

Build with the included `Dockerfile` (multi-stage, `node:24-alpine`, Next standalone output, runs `node server.js`
on port 3000). Set the three env vars above in Coolify and expose port 3000.

## Conversation history (needs a backend endpoint)

`/[lang]/panel/rozmowy/[id]` shows the full call: transcript (agent / caller turns with time offsets and tool calls),
call flow (start → knowledge questions → reported barriers → outcome), barriers, needs and earlier calls from the same
caller. The backend already stores `transkrypcja`, but does not expose it yet. Expected endpoint (Bearer as the panel):

```
GET /halohub/api/rozmowy/:id            # id = Mongo id (or conversation_id)
→ RozmowaSkrot & {
    potrzeby: { temat, grupa, czy_znaleziono }[],
    transkrypcja: ElevenLabs `transcript` array as stored ({ role, message, time_in_call_secs, tool_calls, tool_results })
                  or normalised { rola: 'agent'|'uzytkownik', tekst, czas_s, narzedzia: { nazwa, parametry, wynik, blad }[] }[],
    bariery: Bariera[],                     // rozmowa_id = this call
    zapytania_rag: { pytanie, grupa, jezyk, liczba_wynikow, utworzono }[],   // wiedza_zapytania by conversation_id
    poprzednie: RozmowaSkrot[]              // same telefon_hash, newest first (never return the hash itself)
  }
```

Until it exists the page shows the summary from `GET /api/rozmowy` and a notice.
