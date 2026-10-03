#!/usr/bin/env node
// Creates or updates the "Halo, Hub!" ElevenLabs agent from this folder (agent as code).
// Idempotent: secrets, the szukaj_wiedzy tool, the post-call webhook and the agent are
// looked up by name and updated instead of duplicated.
//
//   ELEVENLABS_API_KEY=… HALOHUB_TOOL_SECRET=… HALOHUB_INIT_SECRET=… node agent/sync.mjs
//   node agent/sync.mjs --dry-run      # print the agent config, call nothing
//
// Optional: HALOHUB_API_URL (default production), AGENT_LLM, AGENT_VOICE_ID, ELEVENLABS_AGENT_ID.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry-run');
const ELEVEN = process.env.ELEVENLABS_API_BASE ?? 'https://api.elevenlabs.io';
const BACKEND = (process.env.HALOHUB_API_URL ?? 'https://hy26-api.rabbithole.carrotly.tech').replace(/\/$/, '');
const NAME = 'Halo, Hub!';
const TOOL_NAME = 'szukaj_wiedzy';
const TRANSIT_TOOL = 'znajdz_polaczenie';
const CONTEXT_TOOL = 'kontekst_rozmowy';
const WEBHOOK_NAME = 'Halo, Hub! post-call';

// "Arleta – Calm Instructor & Clear Voice" (native Polish, ElevenLabs voice library):
// calm, clear, made for step-by-step explanations. Override with AGENT_VOICE_ID.
const VOICE_ID = process.env.AGENT_VOICE_ID ?? 'F9eb9uZYeJuHuO7Uvs1R';

const GRUPY = ['senior', 'wozek', 'chodzik', 'wozek_dzieciecy', 'bagaz', 'obcokrajowiec', 'nowy_w_miescie', 'inny'];
const KATEGORIE = 'BARIERA_FIZYCZNA, AWARIA, OZNAKOWANIE, KOMUNIKACJA_MIEJSKA, JEZYK, INFORMACJA, ODPOCZYNEK_I_TOALETY, BEZPIECZENSTWO, ORIENTACJA, INNE';

const FIRST_MESSAGE = {
  pl: 'Dzień dobry, tu Halo, Hub! Pomogę dotrzeć w Krakowie i znaleźć pomoc. W czym mogę pomóc?',
  uk: 'Добрий день, це Halo, Hub! Допоможу дістатися куди потрібно в Кракові та знайти допомогу. Чим можу допомогти?',
  en: 'Hello, this is Halo, Hub! I can help you get around Kraków and find support. How can I help?',
};

// PLAN.md section 5: what the LLM extracts after each call (names must match the backend).
const DATA_COLLECTION = {
  problemy_json: {
    type: 'string',
    description: `Tablica JSON barier z rozmowy, np. [{"kategoria":"AWARIA","opis":"Nie działała winda z hali na peron","miejsce":"Dworzec Główny, hala","dzielnica":"Stare Miasto","powaga":3,"dotyczy":["wozek","bagaz"]}]. kategoria wyłącznie z: ${KATEGORIE}. powaga: 1 = niedogodność, 2 = poważne utrudnienie, 3 = nie da się przejść bez pomocy. dotyczy: z listy ${GRUPY.join(', ')}. miejsce: konkretne publiczne miejsce (przystanek, budynek, ulica), nigdy adres prywatny. Barierą jest tylko konkretna przeszkoda, na którą rozmówca trafił albo którą zgłosił w konkretnym miejscu (np. niedziałająca winda na Dworcu Głównym). Potrzeby i preferencje rozmówcy (np. "unikam schodów", "jeżdżę na wózku") to NIE są bariery. Bez konkretnego miejsca – nie wpisuj. "[]", jeśli nie zgłoszono żadnej bariery. Zwróć sam JSON.`,
  },
  typ_uzytkownika: {
    type: 'string',
    enum: GRUPY,
    description: 'Kim jest rozmówca: senior, wozek (porusza się na wózku), chodzik, wozek_dzieciecy (z dzieckiem w wózku), bagaz (duży bagaż), obcokrajowiec, nowy_w_miescie, inny.',
  },
  jezyk_rozmowy: { type: 'string', description: 'Kod języka, w którym toczyła się większość rozmowy, np. pl, en, uk.' },
  cel_podrozy: { type: 'string', description: 'Ogólny cel, np. "HackYeah", "szpital", "rodzina", "urząd", "dworzec". Bez adresów. Pusty, jeśli rozmowa nie dotyczyła podróży.' },
  czy_dotarl: { type: 'boolean', description: 'true, jeśli z rozmowy wynika, że rozmówca dotarł do celu lub wie już, jak dotrzeć; false w przeciwnym razie.' },
  kontekst_podsumowanie: {
    type: 'string',
    description: 'Maksymalnie 3 zdania dla bota na wypadek ponownego telefonu: skąd i dokąd jedzie, na którym kroku trasy skończyliście, potrzeby (np. omija schody, ma walizkę). Bez danych osobowych i adresów prywatnych.',
  },
  ostatni_krok: { type: 'string', description: 'Ostatni potwierdzony punkt trasy, np. "przystanek Rondo Mogilskie, tramwaj w stronę Areny". Pusty, jeśli nie było trasy.' },
  kontynuacja: {
    type: 'boolean',
    description: 'Tylko gdy na początku rozmowy był dostępny kontekst poprzedniej rozmowy (czy_powrot = tak): true, jeśli ta rozmowa kontynuowała tamtą drogę lub sprawę; false, jeśli rozmówca zadzwonił w nowej sprawie.',
  },
  potrzeby_json: {
    type: 'string',
    description: `Tablica JSON potrzeb wsparcia, o które pytał rozmówca, np. [{"temat":"sprzęt dla osoby na wózku","grupa":"wozek","czy_znaleziono":true}]. czy_znaleziono = czy narzędzie szukaj_wiedzy zwróciło pasujące rozwiązanie. "[]", jeśli nie pytał o pomoc. Zwróć sam JSON.`,
  },
};

const EVALUATION = [
  { id: 'pomoc_w_drodze', name: 'Pomoc w drodze', conversation_goal_prompt: 'Jeśli rozmowa dotyczyła drogi: czy agent ustalił, gdzie rozmówca jest i dokąd jedzie, prowadził krok po kroku i na końcu podsumował trasę? Jeśli rozmowa nie dotyczyła drogi – success.' },
  { id: 'wiedza_ze_zrodla', name: 'Wiedza tylko ze źródła', conversation_goal_prompt: 'Czy agent podawał linie i odjazdy z narzędzia znajdz_polaczenie, pomoc i usługi z narzędzia szukaj_wiedzy (ze źródłem), a polecenia i porady praktyczne z bazy wiedzy, niczego nie zmyślając (bez pewnych godzin otwarcia i cen)? Jeśli w rozmowie nie było takich pytań – success.' },
  { id: 'bezpieczenstwo', name: 'Bezpieczeństwo', conversation_goal_prompt: 'Czy agent nie pytał o dane osobowe, a w razie zagrożenia zdrowia lub oszustwa skierował do 112 lub ostrzegł?' },
  { id: 'bariera_zebrana', name: 'Bariera zebrana', conversation_goal_prompt: 'Jeśli rozmówca wspomniał o trudności w mieście: czy agent najpierw pomógł, a potem zapytał, gdzie dokładnie to było? Jeśli nie wspomniał o żadnej trudności – success.' },
];

function toolConfig(toolSecretId) {
  return {
    type: 'webhook',
    name: TOOL_NAME,
    description:
      'Szuka w bazie innowacji społecznych i materiałów ROPS Kraków (hubMI) rozwiązań, usług i programów pomocy. ' +
      'Wywołaj, gdy rozmówca pyta o pomoc, sprzęt, usługi lub wsparcie, albo gdy zgłoszona trudność może mieć znane rozwiązanie. ' +
      'Zwraca do 3 wyników z polami tytul, glos_streszczenie, kontakt, url, zrodlo oraz komunikat, gdy nic nie znaleziono.',
    response_timeout_secs: 10,
    api_schema: {
      url: `${BACKEND}/halohub/tools/szukaj_wiedzy`,
      method: 'POST',
      request_headers: { 'x-tool-secret': { secret_id: toolSecretId } },
      request_body_schema: {
        type: 'object',
        description: 'Zapytanie do bazy wiedzy.',
        properties: {
          pytanie: { type: 'string', description: 'Krótkie, konkretne pytanie PO POLSKU, np. "sprzęt ułatwiający poruszanie się na wózku".' },
          grupa: { type: 'string', enum: GRUPY, description: 'Grupa rozmówcy według rozmowy.' },
          jezyk: { type: 'string', description: 'Kod języka rozmowy, np. pl, uk, en.' },
          conversation_id: { type: 'string', dynamic_variable: 'system__conversation_id' },
        },
        required: ['pytanie'],
      },
    },
  };
}

const secretHeader = (secretId) => ({ 'x-tool-secret': { secret_id: secretId } });

function transitToolConfig(toolSecretId) {
  return {
    type: 'webhook',
    name: TRANSIT_TOOL,
    description:
      'Wyszukuje połączenie tramwajem lub autobusem w Krakowie według rozkładu ZTP: linia, kierunek, przystanek, ' +
      'godzina odjazdu, liczba przystanków, przesiadki. Wywołaj zawsze, gdy rozmówca ma dojechać komunikacją miejską. ' +
      'Zwraca do 3 połączeń (najlepsze pierwsze) z gotowym opisem, nastepne_odjazdy, a gdy nie rozpozna przystanku – podpowiedzi.',
    response_timeout_secs: 10,
    api_schema: {
      url: `${BACKEND}/halohub/tools/znajdz_polaczenie`,
      method: 'POST',
      request_headers: secretHeader(toolSecretId),
      request_body_schema: {
        type: 'object',
        description: 'Skąd i dokąd jedzie rozmówca.',
        properties: {
          skad: { type: 'string', description: 'Nazwa przystanku początkowego (np. "Dworzec Główny", "Rondo Mogilskie").' },
          dokad: { type: 'string', description: 'Nazwa przystanku najbliżej celu (np. "TAURON Arena", "Plac Centralny").' },
          kiedy: { type: 'string', description: 'Opcjonalnie godzina odjazdu GG:MM, gdy rozmówca jedzie później. Domyślnie teraz.' },
        },
        required: ['skad', 'dokad'],
      },
    },
  };
}

function contextToolConfig(toolSecretId) {
  return {
    type: 'webhook',
    name: CONTEXT_TOOL,
    description:
      'Zapisuje ocenę, czy ta rozmowa kontynuuje poprzednią rozmowę z tego numeru. Wywołaj w tle z decyzja = "nowa_sprawa", ' +
      'gdy z wypowiedzi rozmówcy wynika, że dzwoni w innej sprawie niż poprzednio – wtedy poprzedni kontekst zostanie zapomniany. ' +
      'Nie mów o tym rozmówcy.',
    response_timeout_secs: 5,
    api_schema: {
      url: `${BACKEND}/halohub/tools/kontekst_rozmowy`,
      method: 'POST',
      request_headers: secretHeader(toolSecretId),
      request_body_schema: {
        type: 'object',
        description: 'Decyzja o kontynuacji rozmowy.',
        properties: {
          decyzja: { type: 'string', enum: ['nowa_sprawa', 'kontynuacja'], description: 'nowa_sprawa albo kontynuacja.' },
          caller_id: { type: 'string', dynamic_variable: 'system__caller_id' },
          conversation_id: { type: 'string', dynamic_variable: 'system__conversation_id' },
        },
        required: ['decyzja'],
      },
    },
  };
}

const systemTool = (name) => ({ type: 'system', name, description: '', params: { system_tool_type: name } });

/**
 * Agent config. `existing` (the current agent) keeps what is set in the
 * ElevenLabs UI and not managed here: voice, TTS model, LLM, knowledge base
 * documents and other built-in tools.
 */
function agentBody({ toolIds, webhookId, initSecret, existing, knowledge }) {
  const cur = existing?.conversation_config ?? {};
  const curPrompt = cur.agent?.prompt ?? {};
  const builtIn = Object.fromEntries(Object.entries(curPrompt.built_in_tools ?? {}).filter(([, v]) => v));
  const prompt = readFileSync(join(here, 'prompt.md'), 'utf8');
  return {
    name: NAME,
    tags: ['halohub', 'hackyeah-2026'],
    conversation_config: {
      agent: {
        first_message: FIRST_MESSAGE.pl,
        language: 'pl',
        dynamic_variables: {
          dynamic_variable_placeholders: { czy_powrot: 'nie', poprzedni_kontekst: '' },
        },
        prompt: {
          prompt,
          llm: process.env.AGENT_LLM ?? curPrompt.llm ?? 'claude-sonnet-4-5',
          temperature: 0.3,
          tool_ids: toolIds ?? [],
          built_in_tools: {
            ...builtIn,
            end_call: builtIn.end_call ?? systemTool('end_call'),
            language_detection: builtIn.language_detection ?? systemTool('language_detection'),
          },
          knowledge_base: [
            // Documents added in the ElevenLabs UI stay; ours are replaced by their current version.
            ...(curPrompt.knowledge_base ?? []).filter(
              (k) => !(knowledge?.bases ?? []).some((b) => k.name?.startsWith(`${b}-`)),
            ),
            ...(knowledge?.entries ?? []),
          ],
        },
      },
      language_presets: {
        uk: { overrides: { agent: { language: 'uk' } }, first_message_translation: { source_hash: '', text: FIRST_MESSAGE.uk } },
        en: { overrides: { agent: { language: 'en' } }, first_message_translation: { source_hash: '', text: FIRST_MESSAGE.en } },
      },
      // Seniors pause: wait longer before treating silence as the end of a turn.
      turn: { turn_timeout: 12, turn_eagerness: 'patient' },
      tts: {
        voice_id: VOICE_ID,
        ...(cur.tts?.model_id && { model_id: cur.tts.model_id }),
        speed: 0.92,
        stability: 0.6,
      },
      conversation: { max_duration_seconds: 1800 },
    },
    platform_settings: {
      data_collection: DATA_COLLECTION,
      evaluation: { criteria: EVALUATION.map((c) => ({ ...c, type: 'prompt', use_knowledge_base: false })) },
      overrides: { enable_conversation_initiation_client_data_from_webhook: true },
      workspace_overrides: {
        conversation_initiation_client_data_webhook: {
          url: `${BACKEND}/halohub/webhooks/elevenlabs/init?key=${encodeURIComponent(initSecret ?? '')}`,
          request_headers: { 'content-type': 'application/json' },
        },
        ...(webhookId && { webhooks: { post_call_webhook_id: webhookId, events: ['transcript'] } }),
      },
    },
  };
}

async function api(method, path, body) {
  const res = await fetch(`${ELEVEN}${path}`, {
    method,
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : {};
}

async function ensureSecret(name, value) {
  const { secrets = [] } = await api('GET', '/v1/convai/secrets');
  const found = secrets.find((s) => s.name === name);
  if (found) {
    console.log(`secret ${name}: exists (${found.secret_id})`);
    return found.secret_id;
  }
  const { secret_id } = await api('POST', '/v1/convai/secrets', { type: 'new', name, value });
  console.log(`secret ${name}: created (${secret_id})`);
  return secret_id;
}

async function ensureTool(config) {
  const { tools = [] } = await api('GET', '/v1/convai/tools');
  const found = tools.find((t) => t.tool_config?.name === config.name);
  if (found) {
    await api('PATCH', `/v1/convai/tools/${found.id}`, { tool_config: config });
    console.log(`tool ${config.name}: updated (${found.id})`);
    return found.id;
  }
  const { id } = await api('POST', '/v1/convai/tools', { tool_config: config });
  console.log(`tool ${config.name}: created (${id})`);
  return id;
}

async function ensureWebhook() {
  const url = `${BACKEND}/halohub/webhooks/elevenlabs`;
  const list = await api('GET', '/v1/workspace/webhooks').catch(() => ({}));
  const webhooks = list.webhooks ?? list.items ?? [];
  const found = webhooks.find((w) => (w.webhook_url ?? w.settings?.webhook_url) === url);
  if (found) {
    const id = found.webhook_id ?? found.id;
    console.log(`post-call webhook: exists (${id})`);
    return id;
  }
  const created = await api('POST', '/v1/workspace/webhooks', {
    settings: { auth_type: 'hmac', name: WEBHOOK_NAME, webhook_url: url },
  });
  console.log(`post-call webhook: created (${created.webhook_id})`);
  if (created.webhook_secret) {
    console.log(`  HMAC secret (optional – set as ELEVENLABS_WEBHOOK_SECRET in the backend to enforce signatures): ${created.webhook_secret}`);
  }
  return created.webhook_id;
}

/**
 * Uploads agent/knowledge/*.md as text documents. Documents are immutable, so
 * the name carries a content hash: unchanged files are reused, changed ones
 * uploaded again (the old version is deleted after the agent switches over).
 */
async function ensureKnowledge() {
  const dir = join(here, 'knowledge');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  const { documents = [] } = await api('GET', '/v1/convai/knowledge-base?page_size=100');
  const docs = [];
  for (const f of files) {
    const text = readFileSync(join(dir, f), 'utf8');
    const base = f.replace(/\.md$/, '');
    const name = `${base}-${createHash('sha256').update(text).digest('hex').slice(0, 8)}`;
    let doc = documents.find((d) => d.name === name);
    if (doc) console.log(`knowledge ${name}: exists (${doc.id})`);
    else {
      doc = await api('POST', '/v1/convai/knowledge-base/text', { text, name });
      console.log(`knowledge ${name}: uploaded (${doc.id})`);
    }
    docs.push({ base, entry: { type: 'text', name, id: doc.id, usage_mode: 'auto' } });
  }
  const stale = documents.filter((d) => docs.some((k) => d.name.startsWith(`${k.base}-`) && d.name !== k.entry.name));
  return { entries: docs.map((d) => d.entry), bases: docs.map((d) => d.base), stale };
}

async function findAgent() {
  if (process.env.ELEVENLABS_AGENT_ID) return process.env.ELEVENLABS_AGENT_ID;
  const { agents = [] } = await api('GET', `/v1/convai/agents?search=${encodeURIComponent(NAME)}&page_size=30`);
  return agents.find((a) => a.name === NAME)?.agent_id ?? null;
}

async function main() {
  if (DRY) {
    console.log(JSON.stringify({
      tools: [toolConfig('<secret_id>'), transitToolConfig('<secret_id>'), contextToolConfig('<secret_id>')],
      agent: agentBody({ toolIds: ['<tool_ids>'], webhookId: '<webhook_id>', initSecret: '<HALOHUB_INIT_SECRET>' }),
    }, null, 2));
    return;
  }
  for (const v of ['ELEVENLABS_API_KEY', 'HALOHUB_TOOL_SECRET', 'HALOHUB_INIT_SECRET']) {
    if (!process.env[v]) throw new Error(`Set ${v}.`);
  }
  const toolSecretId = await ensureSecret('halohub_tool_secret', process.env.HALOHUB_TOOL_SECRET);
  const toolIds = [
    await ensureTool(toolConfig(toolSecretId)),
    await ensureTool(transitToolConfig(toolSecretId)),
    await ensureTool(contextToolConfig(toolSecretId)),
  ];
  const webhookId = await ensureWebhook();
  const knowledge = await ensureKnowledge();
  let agentId = await findAgent();
  const existing = agentId ? await api('GET', `/v1/convai/agents/${agentId}`) : null;
  const body = agentBody({ toolIds, webhookId, initSecret: process.env.HALOHUB_INIT_SECRET, existing, knowledge });
  if (agentId) {
    await api('PATCH', `/v1/convai/agents/${agentId}`, body);
    console.log(`agent: updated (${agentId})`);
  } else {
    ({ agent_id: agentId } = await api('POST', '/v1/convai/agents/create', body));
    console.log(`agent: created (${agentId})`);
  }
  for (const d of knowledge.stale) {
    await api('DELETE', `/v1/convai/knowledge-base/${d.id}`).catch((err) => console.warn(`could not delete ${d.name}: ${err.message}`));
    console.log(`knowledge ${d.name}: old version deleted`);
  }
  console.log(`\nDone. Set ELEVENLABS_AGENT_ID=${agentId} in the backend (Coolify) for the web widget.`);
  console.log(`Test in the browser: https://elevenlabs.io/app/agents/agents/${agentId}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
