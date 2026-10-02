# 🛡️ upay Shield — Autonomous MFS Scam & Fraud Defense Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.1-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-Neon_PostgreSQL-00E599.svg)](https://neon.tech/)
[![Tests](https://img.shields.io/badge/Tests-151%2F151_Passing-emerald.svg)]()
[![License](https://img.shields.io/badge/License-MIT-green.svg)]()

> **upay Shield** is an end-to-end, real-time fraud and scam prevention platform tailored specifically for Mobile Financial Services (MFS) in Bangladesh. It unifies conversational scam intelligence, contextual transaction risk scoring, graph-based mule ring detection, golden-hour recovery route optimization, and human-centric intervention into a production-ready ecosystem.

---

## 📑 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [Core Features & Modules](#-core-features--modules)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Quick Start Guide](#-quick-start-guide)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#1-backend-setup)
  - [Frontend Setup](#2-frontend-setup)
- [API Reference](#-api-reference)
- [Responsible AI, Security & Fairness](#-responsible-ai-security--fairness)
- [Testing & Quality Assurance](#-testing--quality-assurance)

---

## 🏛️ Architectural Overview

```mermaid
graph TD
    subgraph Channels ["Channels & Interfaces"]
        APP["📱 Customer Mobile App"]
        USSD["📞 USSD / Feature Phone (*268#)"]
        QR["🏪 Merchant QR Points"]
        AGENT["🏬 Agent Counters"]
    end

    subgraph Defense ["upay Shield Real-Time Engine"]
        NLP["🗣️ Bangla Scam NLP & Conversation Intel"]
        FEAT["⚡ Real-Time Feature Store (Velocity/ATO/Temporal)"]
        RISK["🎯 Multi-Factor Risk Engine"]
        COACH["🛡️ Human Scam Coach & Safety Mode"]
        GRAPH["🕸️ Mule Ring & Knowledge Graph"]
    end

    subgraph Operations ["Investigator & Ops Hub"]
        ANALYST["🔍 Case Analyst Console & AI Copilot"]
        RECOVERY["⏳ Golden-Hour Recovery Optimizer"]
        CAMPAIGN["📢 Scam Campaign Discovery"]
        AGENT_GUARD["🏬 Dual-Score Agent Guard"]
        AUDIT["🔒 Hash-Chained Tamper-Evident Audit"]
    end

    subgraph Storage ["Persistent Data Layer"]
        NEON["🐘 Neon PostgreSQL (Connection Pooled)"]
    end

    Channels --> NLP
    Channels --> FEAT
    NLP --> RISK
    FEAT --> RISK
    RISK --> COACH
    RISK --> GRAPH
    RISK --> Operations
    Operations --> NEON
    Defense --> NEON
```

---

## 🚀 Core Features & Modules

### 1. Real-Time Multi-Factor Risk Decisioning
- Sub-millisecond evaluation across **Velocity, Account Takeover (ATO), Behavioral Anomalies, Temporal Signals, and Channel Multipliers**.
- **Action Policies**: `ALLOW`, `WARN`, `PAUSE_VERIFY` (with cooling-off window), `HOLD_ASSIST`, and `BLOCK`.
- Native **Bangla & English explanation generation** for both customer-facing banners and analyst consoles.

### 2. Bangla Conversational Scam Intelligence (NLP)
- Real-time linguistic analysis detecting **authority impersonation, fake customer care, lottery/prize scams, emergency distress calls, and legal coercion**.
- Named Entity Recognition (NER) for extracting suspicious mobile numbers, transaction references, and OTP requests.

### 3. Human Scam Coach & Customer Safety Mode
- **Interactive, non-punitive intervention dialogs** explaining social engineering patterns in clear Bangla/English before funds leave the wallet.
- **Voluntary Customer Safety Mode**: Instant account protection with lower friction thresholds, PIN step-up verification, and zero permanent lockouts.

### 4. Coordinated Scam Campaign & Complaint Intelligence
- Semantic correlation engine grouping high-volume customer complaints into active **Scam Campaigns** with lifecycle tracking (`EMERGING` → `ACTIVE` → `RESOLVED`).
- Automated triage, priority escalation, and instant 1-click defensive advisories.

### 5. Dual-Score Agent Guard & Liquidity Separation
- Eliminates false positives by calculating **two distinct scores**:
  1. `Operational Pressure Score` (Normal liquidity demand during Eid/Salary cycles).
  2. `Fraud Risk Score` (Complicity with mule rings, rapid passthroughs, and shared devices).

### 6. Golden-Hour Recovery Route Optimizer
- Algorithmic graph traversal identifying downstream money flow hops after a fraudulent transfer.
- Real-time time-decay calculation recommending prioritized recovery actions before cash-out completion.

### 7. Mule Ring Graph Explorer & Semantic Knowledge Graph
- Interactive visual topology mapping syndicates, shared hardware fingerprints, burner SIM clusters, and cashout corridors.

### 8. USSD & Feature-Phone Protection Layer
- Anomaly detection protecting non-smartphone customers from remote SIM swap ATO and rapid USSD transfer hijacking.

### 9. Tamper-Evident Hash-Chained Audit Trail
- Cryptographically chained SHA-256 audit ledger ensuring investigator actions, overrides, and threshold changes cannot be altered.

### 10. Evidence-Driven Scam Incident Investigation
Owns the **UNDERSTAND → INVESTIGATE → EXPLAIN** stage of the platform, on top of the existing detection, risk, graph and recovery engines. It answers one question: *what does the available evidence actually support?* — without assuming the customer is right and without assuming a model is right.

- **Claim extraction** from Bangla, Banglish, English and mixed text into one structured representation (amount, resolved time window, counterparty, reference, scam indicators, authorisation denial). Values the complaint does not contain stay `undefined` — nothing is inferred.
- **Complaint → transaction matching** with a transparent, normalised evidence score over seven documented signals (reference, amount, counterparty, time, type, status, context). Weights are configurable (`INVESTIGATION_MATCHING_WEIGHTS`), versioned, and asserted by tests; they are heuristic priors, not calibrated values.
- **Three-state evidence verdict** — `CONSISTENT` / `INCONSISTENT` / `INSUFFICIENT_DATA` — decided by deterministic policy, never by a generative model. `INCONSISTENT` requires a falsifiable discriminator plus contradictory records, and is explicitly *not* a finding that the customer is being untruthful.
- **Evidence conflict detection** across customer statement, ledger, risk, graph and campaign evidence. A denial of authorisation against an existing transaction resolves to `INSUFFICIENT_DATA` plus mandatory human review, never to "customer fraud".
- **Traceable reasoning** — every conclusion carries a `CLAIM → EVIDENCE → REASON → CONCLUSION` chain whose evidence ids resolve to real evidence items, each marked record-verified or heuristic.
- **Intelligence reuse, not duplication** — fraud risk comes from the existing risk engine (with point-in-time feature correction for retrospective scoring), ring and community-report evidence from the existing stores, campaign correlation from the existing Scam Campaign Intelligence, and recovery from the existing Golden-Hour Route Optimizer.
- **Four separate dimensions** kept separate throughout: evidence verdict, fraud risk, case type, and operational routing department.
- **Human-review policy** driven by a combination of thirteen named triggers (campaign involvement, graph relationships, evidence conflict, ambiguous match, golden-hour sensitivity, credential exposure, injection attempt, …) rather than a bare `risk > X`.
- **Safe customer response** generated from vetted templates, then scanned by a **response safety validator** that blocks PIN/OTP/password/card requests, unverified third-party contact, and unauthorised refund / reversal / unblock promises — while still permitting the *warning* "we will never ask for your PIN or OTP", which a naive keyword block would wrongly reject. A rejected draft is discarded and replaced; the delivered reply always passes.
- **Prompt-injection defense** — complaint text is untrusted data. An input guard detects and neutralises instruction-injection in English, Bangla and Banglish (25 patterns), records the attempt, escalates for review, and continues the investigation on the victim's actual account of events.
- **Credential hygiene** — a PIN or OTP a victim pastes into their own complaint is redacted before storage and is never mistaken for a transaction amount.
- **Graceful degradation** — every evidence source reports `AVAILABLE` / `EMPTY` / `UNAVAILABLE` / `NOT_APPLICABLE`. "Lookup failed" and "nothing found" are never collapsed, and no evidence is fabricated to make the UI look complete.

---

## 💻 Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | [Next.js 15 (App Router)](https://nextjs.org/), [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/) |
| **Backend** | [Node.js](https://nodejs.org/), [Express](https://expressjs.com/), [TypeScript](https://www.typescriptlang.org/), [dotenv](https://github.com/motdotla/dotenv), [CORS](https://github.com/expressjs/cors) |
| **Database** | [Neon Serverless PostgreSQL](https://neon.tech/) with pooled connections and composite/covering indexes |
| **Testing** | [Vitest](https://vitest.dev/) (Unit, Integration, and Scenario Suites) |

---

## 📂 Project Structure

```text
Team_Orbit/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── middleware/          # Request logging, global error formatting
│   │   │   └── routes/              # 19 modular domain API routes (/v1/*)
│   │   ├── core/
│   │   │   ├── constants/           # Reason codes, Bangla templates, typologies
│   │   │   ├── types/               # 12 domain-specific TypeScript type modules
│   │   │   ├── types.ts             # Backward-compatible barrel shim
│   │   │   └── env.ts               # Strict environment variable validation
│   │   ├── db/
│   │   │   ├── client.ts            # PostgreSQL pool configuration
│   │   │   ├── repository.ts        # Data access layer
│   │   │   └── schema.ts            # DDL & high-performance composite indexes
│   │   ├── generator/               # Synthetic MFS transaction, complaint & evidence-ledger generators
│   │   ├── services/                # 22 domain engines (Risk, NLP, Graph, Protection, etc.)
│   │   │   └── investigation/       # Evidence-driven incident investigation pipeline
│   │   └── server.ts                # Application entry point
│   └── tests/                       # 14 Vitest suites covering all modules
└── frontend/
    ├── src/
    │   ├── app/                     # 18 Next.js App Router views
    │   │   ├── agent/               # Agent Guard & Liquidity Console
    │   │   ├── analyst/             # Security Analyst Investigation Console
    │   │   ├── audit/               # Immutable Audit Log Viewer
    │   │   ├── campaigns/           # Coordinated Scam Campaigns Hub
    │   │   ├── complaints/          # Complaint-to-Action Triage
    │   │   ├── customer/            # Customer App & Scam Coach Dialogs
    │   │   ├── fairness/            # Algorithmic Fairness & Bias Monitor
    │   │   ├── investigations/      # Evidence-Driven Incident Investigation Console
    │   │   ├── knowledge-graph/     # Semantic Knowledge Graph Explorer
    │   │   ├── merchants/           # Merchant QR Scam Shield
    │   │   ├── propagation/         # Community Spread Defense Console
    │   │   ├── recovery/            # Golden-Hour Recovery Route Optimizer
    │   │   ├── rings/               # Mule Ring Graph Visualizer
    │   │   ├── simulator/           # Live Attack & Friction Simulator
    │   │   └── ussd/                # USSD / Feature-Phone Simulator
    │   ├── components/              # 19 modular React components + barrel index
    │   ├── lib/                     # API client, BDT formatters, UI constants
    │   └── core/                    # Frontend shared domain types
```

---

## ⚡ Quick Start Guide

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **PostgreSQL Database**: A Neon PostgreSQL connection string (or standard PostgreSQL instance)

---

### 1. Backend Setup

1. **Navigate to the backend folder**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the `backend/` directory:
   ```env
   PORT=4000
   NODE_ENV=development
   DATABASE_URL=postgresql://neondb_owner:npg_gY5y3QpTevUa@ep-frosty-moon-a110a1p4-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   FRONTEND_URL=http://localhost:3000
   ```

4. **Build and test the backend**:
   ```bash
   npm run build
   npm test
   ```

5. **Start the server**:
   ```bash
   npm run dev
   ```
   *Backend will run at:* `http://localhost:4000`  
   *Health Check:* `http://localhost:4000/health`  
   *Database Health:* `http://localhost:4000/health/db`

---

### 2. Frontend Setup

1. **Navigate to the frontend folder**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env.local` file in the `frontend/` directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000/v1
   PORT=3000
   ```

4. **Build the production bundle**:
   ```bash
   npm run build
   ```

5. **Start the frontend application**:
   ```bash
   npm run dev
   ```
   *Frontend will run at:* `http://localhost:3000`

---

## 🔌 API Reference

All API responses follow a standardized JSON envelope:

```json
{
  "success": true,
  "message": "Human-readable status summary",
  "data": { ... }
}
```

### Key Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | System liveness and environment check |
| `GET` | `/health/db` | Database connection status and pool latency measurement |
| `POST` | `/v1/score/transaction` | Score contextual transaction risk with rule traces |
| `POST` | `/v1/scamcheck` | Analyze voice/text conversations in Bangla/Banglish |
| `GET` | `/v1/cases` | Retrieve analyst alert cases with risk tiers |
| `POST` | `/v1/cases/:id/copilot` | Generate bilingual AI investigation brief |
| `GET` | `/v1/cases/:id/recovery-route` | Generate optimized golden-hour fund recovery plan |
| `GET` | `/v1/campaigns` | List discovered coordinated scam campaigns |
| `POST` | `/v1/complaints/process` | Triage and classify incoming customer complaints |
| `GET` | `/v1/agents/:id/dual-profile` | Get dual-score liquidity vs fraud risk profile |
| `POST` | `/v1/merchants/evaluate` | Evaluate contextual merchant QR transaction risk |
| `POST` | `/v1/customer/safety-mode/activate` | Activate voluntary customer safety mode |
| `GET` | `/v1/audit/logs` | Query tamper-evident hash-chained audit ledger |
| `POST` | `/v1/investigations/analyze` | Run an evidence-driven incident investigation on a complaint |
| `POST` | `/v1/complaints/:id/investigate` | Investigate a complaint already in the triage queue |
| `POST` | `/v1/investigations/extract-claim` | Claim extraction only (dry run, no persistence) |
| `GET` | `/v1/investigations` | List persisted investigations (filter by verdict, review state, case) |
| `GET` | `/v1/investigations/:id` | Retrieve one investigation with its full evidence chain |
| `POST` | `/v1/investigations/:id/copilot` | Investigator Copilot brief with per-statement evidence citations |
| `POST` | `/v1/investigations/:id/review` | Record a human review decision into the audit chain |
| `GET` | `/v1/investigations/metrics` | Investigation observability counters and latency distribution |
| `POST` | `/v1/investigations/validate-response` | Run the response safety validator against a draft reply |
| `GET` | `/v1/demo/investigation-scenarios` | Five demo scenarios with matching sample complaints |
| `POST` | `/v1/demo/investigation-ledger/seed` | Refresh the synthetic evidence ledger (keeps golden hour live) |

---

## 🛡️ Responsible AI, Security & Fairness

- **PII & Privacy Protection**: Zero plain-text customer phone numbers or sensitive identifiers are stored or exposed. Real-time masking (`01711-***822`) is enforced across UI and logs.
- **Explainability**: Every flagged risk decision outputs a machine-readable rule trace alongside clear, human-understandable Bangla (`কেন সতর্কতা?`, `করণীয় কি?`) explanations.
- **Fairness & Bias Prevention**: Dedicated Fairness & Drift monitor tracking False Positive Rates (FPR) across user segments (`student`, `farmer`, `gig`, `salaried`) and regional district types (`rural` vs `urban`).
- **Reversibility & Graceful Recovery**: Customer Safety Mode and Pause & Verify mechanisms are completely reversible with zero permanent user lockouts.
- **No Over-Claimed AI**: The investigation layer never states that AI "knows" a case is fraud. It reports what the evidence supports — consistent, inconsistent, or insufficient — and refuses to force a confident answer when evidence is missing. Explanations are deterministic templates grounded in evidence ids, and their provenance is visually separated from stored evidence in the UI.
- **Untrusted Input Isolation**: Customer complaint text is treated strictly as data. Instruction-injection attempts in English, Bangla and Banglish are neutralised, recorded and escalated — they cannot change a verdict, a risk score, or a human-review decision.
- **Credential Non-Retention**: PIN/OTP values a victim pastes into a complaint are redacted before persistence; audit payloads carry decision provenance only, never raw complaint text or credentials.

---

## 🧪 Testing & Quality Assurance

The test suite runs with [Vitest](https://vitest.dev/) covering unit logic, graph algorithms, edge cases, and end-to-end integration:

```bash
cd backend
npm test
```

### Test Coverage Summary:
- ✅ **Temporal Intelligence**: Ramadan/Eid seasonal volume adaptations.
- ✅ **Scam Knowledge Graph**: Natural language query resolution & evidence packs.
- ✅ **Agent Guard**: Separation of float liquidity pressure from syndicate complicity.
- ✅ **Recovery Route Optimizer**: Golden-hour recovery decay calculation.
- ✅ **Complaint Action Intelligence**: Automated triage, clustering & emergency holds.
- ✅ **Human Scam Coach**: Interactive multi-turn coaching sessions & reversibility.
- ✅ **Merchant Scam Shield**: Entropy evaluation for QR transfers.
- ✅ **Scam Campaign Intelligence**: 50-complaint synthetic batch discovery.
- ✅ **Community Propagation**: Multi-district alert dispatch & false cluster neutralization.
- ✅ **USSD Protection**: Cross-channel ATO detection and USSD intervention auditing.
- ✅ **Customer Safety Mode**: Activation, extension, PIN step-up, and auto-expiry.
- ✅ **Bangla Scam NLP**: Live Bangla/Banglish dialect impersonation detection.
- ✅ **Incident Investigation**: Claim extraction, matching signals, three-state verdict, conflict detection, timeline, persistence, review workflow and graceful degradation (40 tests).
- ✅ **Investigation Adversarial**: 25 injection patterns across English/Bangla/Banglish, policy-boundary enforcement, and response safety under hostile input (37 tests).

---

## 👥 Team Orbit

Built with ❤️ for the Hackathon by **Team Orbit**.
