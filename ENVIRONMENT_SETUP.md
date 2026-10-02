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

---

## 3. Database Architecture & Hosted Neon PostgreSQL

upay Shield connects directly to **Neon Serverless PostgreSQL** with connection pooling enabled.

- **Connection Driver:** Native `pg` Pool with SSL `rejectUnauthorized: false`.
- **Connection Pool Capacity:** 20 concurrent connections with 30-second idle timeout.
- **Auto-Schema Initialization:** Upon backend startup, `initDatabase()` executes all DDL statements in `schema.ts` to ensure tables and composite velocity indexes exist.
- **Auto-Seeding:** If the database is empty, the synthetic world generator (`generateSyntheticWorld()`) automatically seeds initial customers, wallets, agents, merchants, and transactions.

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
```
