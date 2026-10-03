# Halo, Hub! – integracja agenta AI z backendem

Jak podpiąć agenta głosowego (ElevenLabs albo dowolnego innego) do produkcyjnego backendu:
co, kiedy i z jakim payloadem wysyłać. Plan produktu: [PLAN.md](PLAN.md). Pełny kontrakt API:
`universal-backend/docs/halohub-api.md`.

## Adresy (produkcja)

| Co | URL |
|---|---|
| Backend API | `https://hy26-api.rabbithole.carrotly.tech` |
| Panel analityczny (podgląd dla wszystkich) | `https://hy26.rabbithole.carrotly.tech/pl/panel` |
| Stan pipeline'u (ingest, RAG, embeddingi) | `https://hy26.rabbithole.carrotly.tech/pl/panel/pipeline` |
| Strona dla mieszkańców | `https://hy26.rabbithole.carrotly.tech/pl/info` |
| Healthcheck | `GET https://hy26-api.rabbithole.carrotly.tech/halohub/public/info` |

## Sekrety

Wartości są w Coolify → hackyeah-2026 → universal-backend → Environment Variables (nie trzymamy ich w gicie).

| Zmienna backendu | Gdzie wpisać po stronie agenta |
|---|---|
| `HALOHUB_TOOL_SECRET` | nagłówek `x-tool-secret` narzędzia `szukaj_wiedzy` |
| `HALOHUB_INIT_SECRET` | nagłówek `x-init-secret` webhooka inicjacji (albo `?key=` w URL) |
| `ELEVENLABS_WEBHOOK_SECRET` | opcjonalnie: sekret HMAC webhooka po rozmowie (ElevenLabs generuje go sam). Nieustawiony = webhook przyjmuje niepodpisane żądania (tak jest teraz na produkcji) |
| `HALOHUB_ADMIN_TOKEN` | `Authorization: Bearer …` – tylko do odczytu panelu / jobów, agent go nie potrzebuje |

## Kiedy agent co wysyła

```
dzwoni ktoś ──► 1. POST /halohub/webhooks/elevenlabs/init   (start połączenia, przed pierwszą wypowiedzią)
                    ◄── dynamic_variables: czy_powrot, poprzedni_kontekst (ostatnie 6 h z tego numeru), powitanie
w rozmowie  ──► 2c. POST /halohub/tools/zapisz_postep         (po cichu: cel i ostatni krok – wznowienie po zerwanym połączeniu)
w rozmowie  ──► 2a. POST /halohub/tools/kontekst_rozmowy     (gdy agent oceni, że to NOWA sprawa → kontekst usunięty)
            ──► 2b. POST /halohub/tools/znajdz_polaczenie    (jazda tramwajem/autobusem → linie i odjazdy z rozkładu ZTP)
            ──► 2c. POST /halohub/tools/szukaj_wiedzy        (pytanie o pomoc / rozwiązanie → do 3 wyników)
koniec      ──► 3. POST /halohub/webhooks/elevenlabs         (raz, po rozłączeniu, z transkrypcją i polami analizy)
                    ◄── 200 { ok: true, bariery: N }
```

Po (3) backend sam: zapisuje rozmowę i bariery, zapamiętuje kontekst dzwoniącego na 1 h (do kroku 1
przy kolejnym telefonie), co godzinę przelicza tematy i priorytety, raz dziennie robi raport i szkic
publikacji. Agent nie musi wołać jobów.

### 1. Start połączenia – kontekst z ostatniej godziny

`POST https://hy26-api.rabbithole.carrotly.tech/halohub/webhooks/elevenlabs/init`
Nagłówek: `x-init-secret: <HALOHUB_INIT_SECRET>`

```json
{ "caller_id": "+48600100200", "agent_id": "agent_…", "called_number": "+420910923449", "call_sid": "CA…" }
```

Odpowiedź (ElevenLabs wstawia to do zmiennych dynamicznych agenta):

```json
{
  "type": "conversation_initiation_client_data",
  "dynamic_variables": {
    "czy_powrot": "tak",
    "poprzedni_kontekst": "Rozmowa sprzed 3 min. Cel: HackYeah. Rozmówca: duży bagaż. Język poprzedniej rozmowy: pl. Jedzie z Dworca na HackYeah z walizką. Ostatni krok: przystanek Rondo Mogilskie.",
    "powitanie": "Dzień dobry, tu znowu MayAI z Halo, Hub!. Słucham, w czym mogę pomóc?"
  }
}
```

Brak kontekstu → `czy_powrot: "nie"`, `poprzedni_kontekst: ""`, `powitanie` = pełne przedstawienie projektu.
Pierwsza wiadomość agenta to `{{powitanie}}` (powracający słyszą krótkie powitanie w języku poprzedniej rozmowy).
Odczyt ma limit 1,5 s (`CONTEXT_TIMEOUT_MS`), więc nigdy nie blokuje rozmowy.

W ElevenLabs: Settings → *Conversation initiation client data webhook* = powyższy URL + nagłówek;
w agencie: Security → włącz *Fetch conversation initiation data*; zmienne dynamiczne agenta
`czy_powrot` (domyślnie `nie`), `poprzedni_kontekst` (domyślnie pusty) i `powitanie` (domyślnie pełne przedstawienie –
dla widżetu, który nie woła webhooka).

### 2. W trakcie rozmowy – narzędzie `szukaj_wiedzy` (RAG)

Kiedy: rozmówca pyta o pomoc, sprzęt, usługi lub programy (seniorzy, wózek, cudzoziemcy, rodziny)
albo zgłoszona bariera może mieć znane rozwiązanie. Agent mówi „Chwileczkę, sprawdzam” i woła:

`POST https://hy26-api.rabbithole.carrotly.tech/halohub/tools/szukaj_wiedzy`
Nagłówki: `x-tool-secret: <HALOHUB_TOOL_SECRET>`, `content-type: application/json`

```json
{
  "pytanie": "sprzęt ułatwiający poruszanie się na wózku",
  "grupa": "wozek",
  "jezyk": "pl",
  "conversation_id": "conv_123"
}
```

| Pole | Wymagane | Opis |
|---|---|---|
| `pytanie` | tak | krótkie pytanie po polsku (źródła są po polsku; odpowiedź agent tłumaczy na język rozmowy) |
| `grupa` | nie | `senior`, `wozek`, `chodzik`, `wozek_dzieciecy`, `bagaz`, `obcokrajowiec`, `nowy_w_miescie`, `inny` |
| `jezyk` | nie | kod języka rozmowy (`pl`, `uk`, `en`) – do statystyk |
| `conversation_id` | nie | w ElevenLabs: zmienna dynamiczna `system__conversation_id` – łączy pytanie z rozmową w panelu |

Odpowiedź (≈1 s, wyniki z Biblioteki Innowacji Społecznych ROPS):

```json
{
  "wyniki": [
    {
      "tytul": "Organizator kompleksowej opieki w miejscu zamieszkania",
      "glos_streszczenie": "Dwa proste zdania do przeczytania przez telefon.",
      "kontakt": "Autorzy: …",
      "url": "https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/dla-seniorow,…",
      "zrodlo": "Biblioteka Innowacji Społecznych ROPS w Krakowie"
    }
  ],
  "komunikat": null
}
```

Zasady dla agenta: mówi tylko to, co zwróciło narzędzie; jedno rozwiązanie naraz (`glos_streszczenie`),
potem źródło (`zrodlo`) i kontakt. Pusta lista → `komunikat` zawiera gotową odpowiedź z kontaktem do ROPS
(12 422 06 36). Błąd wyszukiwarki też zwraca 200 z pustą listą – narzędzie nigdy nie zwraca 500.

Konfiguracja narzędzia w ElevenLabs (Agent → Tools → Add tool → Webhook): name `szukaj_wiedzy`,
method POST, URL jak wyżej, header `x-tool-secret` jako secret, body: `pytanie` (string, required),
`grupa` (string, enum jak wyżej), `jezyk` (string), `conversation_id` (dynamic variable
`system__conversation_id`). Opis narzędzia: PLAN.md sekcja 7.3.

### 2b. Połączenie tramwajem / autobusem – `znajdz_polaczenie`

`POST https://hy26-api.rabbithole.carrotly.tech/halohub/tools/znajdz_polaczenie`, nagłówek `x-tool-secret`.

```json
{ "skad": "Dworzec Główny", "dokad": "TAURON Arena", "kiedy": "15:30" }
```

`kiedy` opcjonalne (GG:MM, domyślnie teraz). Odpowiedź – do 3 połączeń z rozkładu ZTP Kraków (GTFS, odświeżany
co 12 h), bez lub z jedną przesiadką, odjazdy w ciągu 90 min:

```json
{
  "skad": ["Dworzec Główny Tunel", "Dworzec Główny Zachód", "Dworzec Główny Wschód"],
  "dokad": ["TAURON Arena Kraków", "TAURON Arena Kraków Al. Pokoju", "TAURON Arena Kraków Wieczysta"],
  "polaczenia": [{
    "odjazd": "17:57", "przyjazd": "18:04", "za_min": 6, "czas_min": 7, "przesiadki": 0,
    "odcinki": [{ "linia": "15", "rodzaj": "tramwaj", "kierunek": "Os.Piastów", "z": "Dworzec Główny Tunel",
                  "z_slupek": "01", "odjazd": "17:57", "do": "TAURON Arena Kraków Wieczysta", "przyjazd": "18:04", "przystankow": 4 }],
    "opis": "Z przystanku Dworzec Główny Tunel tramwaj linii 15 w kierunku Os.Piastów, odjazd o 17:57. Jedzie się 4 przystanki, …"
  }],
  "nastepne_odjazdy": ["18:17", "18:37"],
  "komunikat": null,
  "zrodlo": "rozkład jazdy ZTP Kraków"
}
```

Nieznany przystanek → `polaczenia: []`, `komunikat` + `podpowiedzi` (nazwy do dopytania). Publicznie to samo:
`GET /transit/plan?skad=…&dokad=…`, wyszukiwarka przystanków `GET /transit/stops?q=…`, stan `GET /transit`.

### 2a. Kontynuacja czy nowa sprawa – `kontekst_rozmowy`

Agent nie pyta – ocenia z wypowiedzi i `poprzedni_kontekst`. Gdy to nowa sprawa, woła w tle:

```json
{ "decyzja": "nowa_sprawa", "caller_id": "{{system__caller_id}}", "conversation_id": "{{system__conversation_id}}" }
```

→ `{ "ok": true, "decyzja": "nowa_sprawa", "kontekst_usuniety": true }`. Pole analizy `kontynuacja` (boolean)
mówi backendowi po rozmowie, czy liczyć ją jako ponowny telefon (`czy_powrot`).

### 2c. Zapis postępu w trakcie rozmowy – `zapisz_postep`

Webhook po rozmowie przychodzi z opóźnieniem (po analizie), a rozmówca po zerwanym połączeniu oddzwania od razu.
Dlatego agent po cichu zapisuje postęp w trakcie rozmowy:

```json
{ "cel": "TAURON Arena", "ostatni_krok": "wsiadł do tramwaju 50 na Dworcu Głównym", "podsumowanie": "porusza się na wózku",
  "caller_id": "{{system__caller_id}}", "conversation_id": "{{system__conversation_id}}" }
```

→ `{ "ok": true }`. `znajdz_polaczenie` (z `caller_id`) zapisuje zaplanowany przejazd sam. Backend scala dane z kontekstem:
puste pola nic nie kasują; webhook po rozmowie przy kontynuacji uzupełnia kontekst, przy nowej sprawie go zastępuje,
a spóźniony webhook starszej rozmowy tylko uzupełnia braki nowszej.

### 3. Po rozmowie – webhook z wynikami

ElevenLabs wysyła go sam (Settings → Webhooks → Post-call, typ *transcription*,
URL `https://hy26-api.rabbithole.carrotly.tech/halohub/webhooks/elevenlabs`). Podpis jest sprawdzany
tylko wtedy, gdy w backendzie ustawiono `ELEVENLABS_WEBHOOK_SECRET` (teraz nie jest – wystarczy sam payload):

```
ElevenLabs-Signature: t=<unix_ts>,v0=<hex(HMAC-SHA256(ELEVENLABS_WEBHOOK_SECRET, "<unix_ts>.<surowe body>"))>
```

Podpis starszy niż 30 min jest odrzucany (401). Payload – backend czyta te pola:

```json
{
  "type": "post_call_transcription",
  "data": {
    "conversation_id": "conv_123",
    "transcript": [{ "role": "agent", "message": "Cześć, tu Halo, Hub!…" }, { "role": "user", "message": "…" }],
    "metadata": { "call_duration_secs": 245, "start_time_unix_secs": 1790000000 },
    "conversation_initiation_client_data": {
      "dynamic_variables": { "system__caller_id": "+48600100200", "czy_powrot": "nie" }
    },
    "analysis": {
      "data_collection_results": {
        "problemy_json": { "value": "[{\"kategoria\":\"AWARIA\",\"opis\":\"Nie działała winda\",\"miejsce\":\"Dworzec Główny, hala\",\"dzielnica\":\"Stare Miasto\",\"powaga\":3,\"dotyczy\":[\"wozek\"]}]" },
        "typ_uzytkownika": { "value": "wozek" },
        "jezyk_rozmowy": { "value": "pl" },
        "cel_podrozy": { "value": "HackYeah" },
        "czy_dotarl": { "value": true },
        "kontekst_podsumowanie": { "value": "Jedzie z Dworca na HackYeah na wózku, omija schody." },
        "ostatni_krok": { "value": "przystanek Rondo Mogilskie" },
        "kontynuacja": { "value": true },
        "potrzeby_json": { "value": "[{\"temat\":\"wypożyczalnia wózków\",\"grupa\":\"wozek\",\"czy_znaleziono\":false}]" }
      }
    }
  }
}
```

Pola analizy (Agent → Analysis → Data collection) muszą się nazywać **dokładnie** jak wyżej – opisy dla
LLM są w `agent/sync.mjs` (PLAN.md sekcja 5 + `kontynuacja`).

## Agent jako kod

`agent/prompt.md` (prompt systemowy) i `agent/sync.mjs` (narzędzia, pola analizy, webhooki, ustawienia głosu)
to źródło prawdy. Zmiana → `ELEVENLABS_API_KEY=… HALOHUB_TOOL_SECRET=… HALOHUB_INIT_SECRET=… node agent/sync.mjs`
(tworzy albo aktualizuje agenta, niczego nie dubluje). Podgląd bez wysyłania: `node agent/sync.mjs --dry-run`. Kategorie barier spoza listy trafiają do `INNE`, `powaga` spoza 1–3 → 1.
Numer telefonu zapisujemy tylko jako solony hash. Ponowne wysłanie tego samego `conversation_id`
nadpisuje rozmowę (bez duplikatów), więc retry są bezpieczne. Inne typy zdarzeń (np. audio) dostają
`200 { ignored: true }`.

#### Agent spoza ElevenLabs

Wysyła ten sam payload (`POST` z `content-type: application/json`). Jeśli backend ma ustawiony
`ELEVENLABS_WEBHOOK_SECRET`, trzeba dodać podpis, np. w Node:

```js
import { createHmac } from 'node:crypto';
const body = JSON.stringify(payload);
const t = Math.floor(Date.now() / 1000);
const v0 = createHmac('sha256', process.env.ELEVENLABS_WEBHOOK_SECRET).update(`${t}.${body}`).digest('hex');
await fetch('https://hy26-api.rabbithole.carrotly.tech/halohub/webhooks/elevenlabs', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'ElevenLabs-Signature': `t=${t},v0=${v0}` },
  body,
});
```

## Szybki test z terminala

```bash
API=https://hy26-api.rabbithole.carrotly.tech
curl -s $API/halohub/public/info
curl -s -X POST $API/halohub/tools/szukaj_wiedzy -H "x-tool-secret: $HALOHUB_TOOL_SECRET" \
  -H 'content-type: application/json' \
  -d '{"pytanie":"pomoc dla seniora z demencją, który się gubi","grupa":"senior"}'
curl -s -X POST $API/halohub/webhooks/elevenlabs/init -H "x-init-secret: $HALOHUB_INIT_SECRET" \
  -H 'content-type: application/json' -d '{"caller_id":"+48600100200"}'
```

## Baza wiedzy (RAG) – skąd są wyniki

- Ingest z rops.krakow.pl (Biblioteka Innowacji z PDF-ami modeli, raporty, Mapa Wyzwań, publikacje)
  uruchamia się sam po starcie backendu i co tydzień; przerwany deployem wznawia się po ok. 10 min.
  Postęp: panel → Pipeline (etapy *Ingest* i *Embedding*).
- Wyszukiwanie jest hybrydowe: pełnotekstowe działa od razu, wektorowe (Gemini embeddings) dochodzi,
  gdy etap *Embedding* zbliża się do 100%.
- Narzędzie przeszukuje tylko Bibliotekę Innowacji (konkretne rozwiązania); raporty służą raportowi dziennemu.
- Generyczne API `POST /rag/halohub/search` (`x-api-key`) jest wyłączone, dopóki w backendzie nie ma
  `RAG_API_KEY` – agentowi wystarcza `szukaj_wiedzy`.

## Checklista przed demo

- [ ] `GET /halohub/public/info` odpowiada
- [ ] Pipeline: ingest *zakończony*, embedding blisko 100%
- [ ] ElevenLabs: webhook inicjacji (+ `x-init-secret`), narzędzie `szukaj_wiedzy` (+ `x-tool-secret`),
      post-call webhook, 8 pól analizy, zmienne `czy_powrot` / `poprzedni_kontekst`
- [ ] `ELEVENLABS_AGENT_ID` wpisane w Coolify + redeploy backendu (widget na stronie); `ELEVENLABS_WEBHOOK_SECRET` opcjonalnie
- [ ] Testowy telefon → rozmowa widoczna w panelu → Rozmowy; po godzinie (lub „Przelicz tematy”) temat w Priorytetach
