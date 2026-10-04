# Environment Configuration & Integration Guide: Astha

This document is the single source of truth for all environment variables across the **Astha** platform.

---

## 1. Frontend Environment Variables (`frontend/.env.local`)

All frontend variables exposed to the browser MUST be prefixed with `NEXT_PUBLIC_`.

| Variable | Required / Optional | Public / Secret | Default / Example Value | Where Used | Description |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | **REQUIRED** | Public | `http://localhost:4000/v1` | `next.config.ts`, API Client | Base URL for backend REST API endpoints |
| `NEXT_PUBLIC_APP_NAME` | Optional | Public | `Astha` | Navigation & Header components | Application display title |
| `PORT` | Optional | Server-only | `3000` | Next.js server configuration | Local port for Next.js web application |
| `NODE_ENV` | Optional | Public | `development` | Next.js environment mode | `development` or `production` |

---

## 2. Backend Environment Variables (`backend/.env`)

All backend variables remain strictly on the server and are NEVER exposed to client browsers.

| Variable | Required / Optional | Public / Secret | Default / Example Value | Where Used | Description |
|---|---|---|---|---|---|
| `DATABASE_URL` | **REQUIRED** | **SECRET** | `postgresql://user:password@host/neondb?sslmode=require` | `backend/src/db/client.ts` | Hosted Neon PostgreSQL connection string with SSL |
| `PORT` | Optional | Public | `4000` | `backend/src/server.ts` | Port on which the Express REST API listens |
| `NODE_ENV` | Optional | Public | `development` | `backend/src/core/env.ts` | `development`, `production`, or `test` |
| `FRONTEND_URL` | Optional | Public | `http://localhost:3000` | `backend/src/server.ts` (CORS) | Client origin allowed for cross-origin requests |
| `INVESTIGATION_MATCHING_WEIGHTS` | Optional | Public | `{"AMOUNT_MATCH":0.30,"TIME_MATCH":0.12}` | `backend/src/core/constants/investigation-policy.ts` | JSON override for complaint-to-transaction matching weights. Unknown keys and non-numeric values are ignored; invalid JSON falls back to the documented defaults without failing boot. Lets calibrated weights replace the heuristic priors without a code change. |
| `PERSISTENCE_ENABLED` | Optional | Public | `true` | `backend/src/db/persistence.ts` | Write-through persistence for the domain services. Defaults to on everywhere except `NODE_ENV=test`, where it is off so the suites stay in-memory and never write fixtures into the shared database. |

---

## 2a. Language Model Variables (`backend/.env`)

The platform runs **without any of these**. With no key the deterministic rule
engines serve every endpoint on their own, and each response reports which path
produced it. Setting a key turns on the model layer.

**Provider chain.** Every provider that has a key joins a chain: `LLM_PROVIDER`
is tried first, the others follow in order. A call that errors, hits quota (429),
is overloaded (503), times out, or returns unusable JSON moves to the next
provider *before* the request falls back to rules. A provider that just returned
429/503 is skipped for a short cooldown (60s / 15s) so it does not cost every
request a doomed attempt. All of it is bounded by `LLM_TOTAL_BUDGET_MS`.

| Variable | Required / Optional | Public / Secret | Default | Description |
|---|---|---|---|---|
| `LLM_PROVIDER` | Optional | Public | *(first key found)* | The **primary** provider: `anthropic`, `gemini` or `openai`. Other providers with keys become failovers. If the named provider has no key, the loader warns and uses one that does. |
| `ANTHROPIC_API_KEY` | Optional | **SECRET** | — | Enables Claude. Anthropic has no embeddings endpoint. |
| `GEMINI_API_KEY` | Optional | **SECRET** | — | Enables Gemini for chat and embeddings. |
| `OPENAI_API_KEY` | Optional | **SECRET** | — | Enables OpenAI for chat (and embeddings, though see the note below). |
| `GEMINI_MODEL` | Optional | Public | `gemini-3.5-flash` | Newest Flash model that answered reliably on a free-tier key when probed; `gemini-3.7/3.8-flash` returned 503 or hung, and the Pro models are not free-tier. |
| `OPENAI_MODEL` | Optional | Public | `gpt-4o-mini` | Set to `gpt-5.6-luna` in the sample `.env`. GPT-5/6 and o-series are reasoning models; the adapter sends `max_completion_tokens` and `reasoning_effort: low` and omits `temperature`, which they reject. |
| `ANTHROPIC_MODEL` | Optional | Public | `claude-sonnet-5` | |
| `LLM_MODEL` | Optional | Public | — | Overrides the model of the **primary** provider only. Per-provider variables above win. |
| `LLM_TIMEOUT_MS` | Optional | Public | `9000` | Per-attempt deadline. |
| `LLM_TOTAL_BUDGET_MS` | Optional | Public | `11000` | Ceiling on the whole chain for one call. The web client gives up at 15s; embedding and database writes share that window. |
| `LLM_MAX_RETRIES` | Optional | Public | `1` | Retries on timeout / 429 / 5xx, applied to the last provider in the chain only (earlier providers fail over instead). A malformed or schema-violating reply is never retried. |
| `LLM_MAX_OUTPUT_TOKENS` | Optional | Public | `1600` | Output cap per call. Gemini and OpenAI reasoning models get extra headroom on top, because hidden "thinking" tokens are billed against the same cap. |
| `LLM_ENABLED` | Optional | Public | `true` (`false` under `NODE_ENV=test`) | Master switch. Under Vitest it defaults off so the suites never make paid, networked calls even though `.env` keys are visible. |

### Retrieval / RAG variables

| Variable | Required / Optional | Public / Secret | Default | Description |
|---|---|---|---|---|
| `EMBEDDING_PROVIDER` | Optional | Public | *(auto)* | `gemini`, `openai` or `local`. **Use `gemini` for Bangla** — see the measurements below. A hosted provider named without a key downgrades to `local` with a warning. Changing it re-embeds the corpus and indexed complaints automatically at the next boot. |
| `EMBEDDING_MODEL` | Optional | Public | per provider | Defaults: `gemini-embedding-001`, `text-embedding-3-small`, `local-hashing-v1`. |
| `RAG_ENABLED` | Optional | Public | `true` (`false` under `NODE_ENV=test`) | Off means no retrieved context is attached to any prompt. |
| `RAG_TOP_K` | Optional | Public | `5` | Chunks returned per query. |
| `RAG_MIN_SCORE` | Optional | Public | `0.69` gemini / `0.25` others | Cosine floor below which a chunk is discarded. Per-provider because score distributions differ. |
| `RAG_DUPLICATE_THRESHOLD` | Optional | Public | `0.82` gemini / `0.65` openai / `0.40` local | Near-duplicate cutoff for complaint clustering. |

> **Which embedder, and why it matters.** Measured on the same incident reported
> in Bangla, Banglish and English versus different incidents:
>
> | Embedder | Same incident (lowest) | Different incident (highest) | Cross-language duplicates |
> |---|---|---|---|
> | `gemini-embedding-001` | 0.894 | 0.738 | **Separable** (cutoff 0.82) |
> | OpenAI `text-embedding-3-small` | 0.295 | 0.534 | Not separable |
> | OpenAI `text-embedding-3-large` | 0.469 | 0.584 | Not separable |
> | built-in `local` | ~0.19 | — | Not separable (lexical, one script only) |
>
> OpenAI's embedders place a Bangla report *below* an unrelated English complaint
> that merely shares words like "sent taka", so no threshold recovers
> cross-language matching. Chat and embeddings are configured independently:
> OpenAI can serve chat while Gemini serves embeddings.
> `cross_language_matching` in the complaint response reports which mode is live.
>
> The 0.69 retrieval floor was calibrated on a small sample (8 clear scam
> queries, 1 subtle scam, 4 negatives). Re-measure if the corpus grows.

---

## 3. Database Architecture & Hosted Neon PostgreSQL

Astha connects directly to **Neon Serverless PostgreSQL** with connection pooling enabled.

- **Connection Driver:** Native `pg` Pool with SSL `rejectUnauthorized: false`.
- **Connection Pool Capacity:** 20 concurrent connections with 30-second idle timeout.
- **Auto-Schema Initialization:** Upon backend startup, `initDatabase()` executes all DDL statements in `schema.ts` to ensure tables and composite velocity indexes exist.
- **Auto-Seeding:** If the database is empty, the synthetic world generator (`generateSyntheticWorld()`) automatically seeds initial customers, wallets, agents, merchants, and transactions.
- **Investigation Evidence Ledger:** On every startup, `seedInvestigationEvidenceLedger()` upserts 14 synthetic `TXN-INV-*` transactions plus two community reports across five investigation scenarios. It is idempotent, never deletes or overwrites unrelated rows, and refreshes timestamps so the golden-hour demo scenario stays live after a restart. A failure here is logged and skipped — it never prevents the server from starting. Re-run it on demand with `POST /v1/demo/investigation-ledger/seed`.
- **Investigation Table:** `incident_investigations` stores one row per investigation with its full payload plus indexed columns for verdict, review state, matched transaction, case and complaint linkage.

---

## 4. One-Command Setup & Verification

```bash
# 1. Clone & Install Dependencies
npm install --prefix backend
npm install --prefix frontend

# 2. Configure Environment Files
# backend/.env
PORT=4000
DATABASE_URL=postgresql://neondb_owner:npg_XUa1tC9yqmiS@ep-nameless-shape-b57loji7-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000/v1
NEXT_PUBLIC_APP_NAME="Astha"
PORT=3000

# 3. Start Application
npm run dev --prefix backend
npm run dev --prefix frontend

# 4. Verify Live Health
curl http://localhost:4000/health/db
# Output: {"status":"ok","database":"connected","provider":"Neon PostgreSQL (Pooled)"}

# 5. Verify the Incident Investigation pipeline end-to-end
curl -s http://localhost:4000/v1/demo/investigation-scenarios
curl -s -X POST http://localhost:4000/v1/investigations/analyze -H "Content-Type: application/json" -d '{"complaint":"vai amar 5k taka vul number e chole gese","reporter_wallet":"W-SYN-001001"}'
# Returns the evidence verdict, matched transaction, risk/graph/campaign context,
# timeline, human-review decision and the safety-validated customer reply.
```
