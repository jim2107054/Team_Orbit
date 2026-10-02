# Environment Configuration & Integration Guide: upay Shield

This document is the single source of truth for all environment variables across the **upay Shield** platform.

---

## 1. Frontend Environment Variables (`frontend/.env.local`)

All frontend variables exposed to the browser MUST be prefixed with `NEXT_PUBLIC_`.

| Variable | Required / Optional | Public / Secret | Default / Example Value | Where Used | Description |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | **REQUIRED** | Public | `http://localhost:4000/v1` | `next.config.ts`, API Client | Base URL for backend REST API endpoints |
| `NEXT_PUBLIC_APP_NAME` | Optional | Public | `upay Shield` | Navigation & Header components | Application display title |
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

---

## 3. Database Architecture & Hosted Neon PostgreSQL

upay Shield connects directly to **Neon Serverless PostgreSQL** with connection pooling enabled.

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
NEXT_PUBLIC_APP_NAME="upay Shield"
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
