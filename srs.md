# Software Requirements Specification (SRS)

## Astha — AI Trust, Scam-Interception & Mule-Network Intelligence for Mobile Financial Services

| Field | Value |
|---|---|
| Event | AI Hackathon 2026 — DIU CPC × upay (AI DevFest 2026) |
| Track | **01 — Trust & Risk Intelligence** (with deliberate extensions into Tracks 05, 06 and 03-style customer protection) |
| Document type | SRS (structured after IEEE 29148 / 830) |
| Version | 1.0 (hackathon baseline) |
| Status | Approved for build |
| Data policy | **100% synthetic / public / self-generated data. No production upay data. No real PII.** |

> **One-line pitch:** *Astha stops a scam before the money leaves, uncovers the mule and gambling rings behind it, and hands analysts a verified, plain-language case file — so that upay can protect customers, recover more money, and earn the trust that growth depends on.*

---

## Table of Contents

1. Introduction
2. Evidence & Business Case
3. Overall Description
4. Product Differentiators ("Why this wins")
5. System Architecture
6. Functional Requirements (Modules M1–M17)
7. Data Requirements & Synthetic Data Specification
8. AI/ML Specification
9. External Interfaces & API Specification
10. UI/UX Requirements
11. Non-Functional Requirements
12. Responsible AI, Safety & Security Requirements
13. Evaluation Plan & KPIs
14. Verification & Test Plan
15. Scalability, Integration & Post-Hackathon Path
16. Impact & Economics Model
17. Project Plan, Team & Risk Register
18. Demo, Pitch & Judge Q&A Playbook
19. Traceability Matrix (Requirements → Judging Rubric)
20. Appendices

---

# 1. Introduction

## 1.1 Purpose
This SRS defines the complete functional, data, AI, interface, quality and governance requirements for **Astha**, a working prototype for the AI Hackathon 2026 (DIU CPC × upay). It is the single source of truth for the team and a reference for judges reviewing technical depth, product thinking and responsible-AI practice.

## 1.2 Scope
Astha is a layered "Input → Intelligence → Action" system (the guideline's reference architecture) covering three protection layers plus supporting capabilities:

1. **Customer layer — Scam Interception:** real-time risk scoring at the moment of a send-money / cash-out request, with Bangla-first plain-language warnings and a "Scam Check" tool.
2. **Network layer — Mule & Gambling-Ring Discovery:** graph analytics that expose coordinated wallet, agent and merchant rings that account-by-account rules cannot see.
3. **Analyst layer — Investigation Copilot & Golden-Hour Recovery:** grounded, fact-verified case narratives, money-flow tracing and human-approved response actions.
4. **Supporting capabilities:** agent risk intelligence, emerging-scam radar, friction optimizer (uplift), impact simulator, fairness/drift monitoring, audit trail.

**In scope:** synthetic data generation; feature/graph pipelines; ML models; decision policy engine; REST API; customer demo app; analyst console; monitoring dashboards; documentation and evaluation.

**Out of scope:** production integration; real customer data; autonomous freezing/blocking of accounts; legal determinations; real money movement; real KYC/NID checks.

## 1.3 Definitions, Acronyms, Abbreviations

| Term | Meaning |
|---|---|
| MFS | Mobile Financial Services (mobile wallet) |
| Mule account | Wallet used (knowingly or not) to receive, layer and cash out illicit funds |
| Ghost wallet | Weakly verified / fake / rented wallet used as a temporary receiving point |
| ATO | Account Takeover |
| OTC | Over-the-counter (agent-assisted, non-wallet-holder) transaction |
| STR | Suspicious Transaction Report (to the national financial intelligence unit) |
| Typology | A named, repeatable fraud/laundering pattern (e.g. "emergency-relative scam") |
| Golden hour | The short window after a fraudulent transfer when funds may still be traceable and holdable |
| Friction | Any deliberate delay/confirmation step shown to a customer |
| Alert budget | Max number/percent of transactions analysts or customers can be interrupted on |
| PR-AUC | Area under precision–recall curve (preferred over accuracy for rare events) |
| SHAP | SHapley Additive exPlanations (feature attribution) |
| RAG | Retrieval-Augmented Generation |
| PSI | Population Stability Index (drift measure) |
| FR / NFR | Functional / Non-Functional Requirement |
| MoSCoW | MUST / SHOULD / COULD / WON'T priority scheme |

## 1.4 References
- *AI Hackathon 2026 — Project Guideline & Innovation Playbook* (DIU CPC × upay). Sections 1–15 (tracks, framework, data strategy, architecture expectations, responsible-AI table, evaluation weights).
- Evidence sources listed in **Appendix F** (Bangladesh Bank data via press, PRI survey, TI Bangladesh, Bangladesh Bank directives, press investigations).
- Optional public benchmarks for sanity checks only: PaySim (mobile-money simulator), AMLSim (graph AML simulator). Domain mismatch must be disclosed if used.

## 1.5 Document Conventions
- Requirement IDs: `FR-<module>-<nn>`, `NFR-<area>-<nn>`, `DR-<nn>` (data), `ML-<nn>`, `API-<nn>`, `UI-<nn>`, `RAI-<nn>`.
- Priority: **M** = MUST (needed for demo), **S** = SHOULD (strongly improves score), **C** = COULD (stretch).
- Every requirement is testable; verification method (Test/Demo/Inspection/Analysis) is given in Section 14.

---

# 2. Evidence & Business Case

## 2.1 The Real-World Problem
Bangladesh's MFS market is huge and growing, and **fraud is the main trust and growth brake**. Findings from the pre-build research (sources and caveats in Appendix F):

| # | Finding | Why it matters to Astha |
|---|---|---|
| E1 | Bangladesh Bank recorded **81,423 reported fraud cases** across MFS, cheques and cards in 2025, with about **Tk 926 million** in losses and only **~10.7% recovered**. Reported cases are a floor. | Detection *and recovery* both matter; recovery is almost non-existent today. |
| E2 | A PRI survey found roughly **1 in 10 MFS users** had been a fraud victim; about **30% of victims never had the complaint resolved**; losses were more common among less-educated users and untrained agents. | Customer-facing, plain-language, Bangla-first protection and agent-side tooling are needed. |
| E3 | The same survey found about **45% of people are not MFS users, and 32% of those cite fear of fraud**. | Fraud protection is a *growth* lever, not only a cost center. |
| E4 | TI Bangladesh reports **6.3% of individual users and 17% of agents** victimized; abuse for laundering, bribery, gambling and illegal crypto transfers; a large laundering estimate for 2022. | Agents are high-risk nodes; network-level analytics needed. |
| E5 | Most reported cases are **social engineering** (impersonation, PIN/OTP compromise, emotional "emergency" scripts), not technical hacks. | The best intervention point is *before the customer confirms the transfer*. |
| E6 | Press investigations describe a **"ghost wallet network"** of weakly verified accounts used as temporary receiving points before money is dispersed in layers; AI voice/face mimicry is emerging. | Graph + behavioral analytics; AI-assisted scams will increase. |
| E7 | **Regulatory pull:** In Nov 2025 Bangladesh Bank directed all 13 MFS providers to form task forces and deploy **AI-based real-time monitoring** (initially for online gambling), and later directed banks/MFS/PSOs to use AI for gambling detection. The **Gambling Prevention Act 2026** (in force 1 July 2026) explicitly covers fake MFS accounts and ghost SIMs. | A product aligned with a live regulatory mandate has a believable path to adoption. |
| E8 | A staged investment-scam pattern was documented: small initial MFS deposits, then escalation to larger bank transfers. | Multi-step, cross-channel scam typology to simulate and detect. |
| E9 | Regional precedent: India's authorities are formalizing AI-based **mule-account detection** with shared intelligence. | Mule detection is a recognized institutional priority. |
| E10 | Scale: press reports cite 239.3M registered accounts (other BB-based reports cite ~146M; counting methods differ) and monthly volumes well above Tk 1.5 trillion. | Manual review is impossible; automation with human oversight is required. |

## 2.2 Problem Statement (guideline template)

> **For** upay customers, agents and the fraud-operations team, **scams and mule-network cash-outs** cause **irreversible customer losses (≈90% unrecovered nationally), eroded trust and suppressed adoption**. **We will build** *Astha*, an AI-powered protection platform **that uses** synthetic transaction, device, agent, complaint and network data **to** warn customers before they send money, discover mule/gambling rings, and give analysts verified case files and recovery actions, **with success measured by** (a) fraud value caught at a fixed alert budget, (b) customer friction on legitimate transactions, (c) ring-level detection quality, (d) analyst minutes per case, and (e) simulated recoverable share of stolen funds versus a no-trace baseline.

## 2.3 Student Idea Development Framework (Guideline §10 — completed)

| Step | Answer |
|---|---|
| 1. User | Customer (esp. first-time/low-literacy), agent, fraud analyst, compliance officer |
| 2. Problem | Scams succeed at the confirm screen; mule rings evade per-account rules; recovery is ~10%; complaints often unresolved |
| 3. Why now | Regulator mandate for AI monitoring; Gambling Prevention Act 2026; rising AI-assisted impersonation; LLMs make grounded investigation assistants feasible |
| 4. Solution | Three-layer Shield: interception, ring discovery, copilot + recovery; plus agent guard, scam radar, simulator |
| 5. AI role | Prediction (risk), anomaly detection, graph analytics, text classification, clustering, uplift, grounded generation |
| 6. Impact | Higher recall at fixed alert budget; lower friction; faster investigations; higher simulated recovery; targets in §13 |
| 7. Data | Fully synthetic generator with injected, documented typologies; optional public benchmarks |
| 8. Validation | Time-split + ring-group-split + **held-out-typology** tests; ablations; simulated A/B of warnings; fairness slices |
| 9. Scale | Stateless scoring API, feature-store pattern, controlled validation with governed upay data, STR integration — §15 |

## 2.4 Product Readiness Checklist (Guideline §13)

| Checklist item | Status |
|---|---|
| User problem frequent / economically meaningful | Yes (E1–E5) |
| AI adds value beyond a deterministic rule | Yes — rules cannot see rings, novelty or scam language (Section 8 ablation proves it) |
| Clear action after prediction | Yes — policy engine maps scores to warn / friction / hold / analyst queue |
| Business benefit measurable | Yes — Section 16 |
| Validatable with future real data | Yes — shadow-mode plan, §15 |
| Privacy, fairness, explainability, security addressed | Yes — Section 12 |
| Integrates into real workflow | Yes — API-first, §9 and §15 |

---

# 3. Overall Description

## 3.1 Product Perspective
Astha is a stand-alone prototype designed as a **sidecar risk service** that could sit beside a real MFS core: the wallet backend calls the scoring API at decision points and receives a score, reason codes and a recommended action. Rules, ML and LLM components are separated (Guideline §12: *business rules distinct from ML; no sensitive decision logic only in an LLM prompt*).

```
 Customer App / Agent App / Core Wallet (simulated)
            │  txn event / session event / report
            ▼
   ┌──────────────────────────┐
   │  Risk API (FastAPI)      │◄── Policy Engine (YAML rules, versioned)
   └────────────┬─────────────┘
                ▼
   Feature & Context Layer ──► ML/AI Engine ──► Explanation Layer
   (velocity, device, graph)   (GBM, anomaly,    (SHAP, reason codes,
                                graph, text)      rule trace)
                ▼                                    ▼
        Action: allow/warn/friction/hold/queue ──► Analyst Console + Copilot
                ▼                                    ▼
        Outcome logging & feedback loop  ◄── Monitoring (drift, fairness, KPIs)
```

## 3.2 Product Functions (summary)
M1 Synthetic world generator · M2 Feature & context layer · M3 Real-time transaction risk scoring · M4 Behavioral baseline & ATO signals · M5 Scam interception & customer warnings · M6 Scam Check (text analyzer) · M7 Network/mule/gambling-ring discovery · M8 Agent Guard & agent risk · M9 Explainability engine · M10 Decision & policy engine · M11 Analyst console & case management · M12 Investigation Copilot (grounded + fact-verified) · M13 Golden-hour recovery & money-flow tracing · M14 Scam Radar (emerging-typology detection) · M15 Friction optimizer & Impact simulator · M16 Monitoring, drift & fairness · M17 Admin, audit, security & compliance drafts.

## 3.3 User Classes and Characteristics

| User | Description | Key needs | Primary interface |
|---|---|---|---|
| **Customer** (e.g. rural, first-time, low digital literacy) | Sends money, cash-out, pays bills | Clear Bangla warnings, simple choices, no jargon, voice-readable text | Customer demo app (mobile web) |
| **Agent** | Cash-in/out point; high exposure to fraud | Alerts on risky cash-outs, simple guidance | Agent Guard view |
| **Fraud Analyst** | Triages alerts and cases | Prioritized queue, evidence, why-flagged, next step | Analyst console |
| **Compliance Officer / MLRO** | Reviews rings, drafts STR | Ring maps, audit trail, STR draft | Analyst console (compliance role) |
| **Product / Risk Manager** | Tunes thresholds, tracks KPIs | Simulator, fairness, drift, ROI | Dashboard & Simulator |
| **Admin / ML Engineer** | Operates system | Config, model registry, logs | Admin panel |
| **Judge / Evaluator** | Reviews | Clear story, working E2E, evidence, rigor | Demo + docs |

## 3.4 Operating Environment
- Runs on a single laptop via Docker Compose (target ≥ 8 GB RAM, 4 cores; GPU optional, not required).
- Browser: current Chrome/Edge/Firefox/Safari on desktop and mobile (customer app must be mobile-first, 360 px wide).
- Offline-capable demo mode: all LLM features must have a deterministic template fallback if the LLM API is unreachable.

## 3.5 Design and Implementation Constraints
1. Only synthetic, public or self-generated data (Guideline §11, §14).
2. No real PII; synthetic Bangla names/numbers must use obviously fake number ranges.
3. No autonomous consequential decisions: freezes/blocks require human approval; customer warnings are reversible friction only (§12).
4. Business rules, ML scores and LLM text are separate, individually versioned components.
5. A clean, never-trained-on test set must be kept (Guideline §11).
6. LLM must never receive secrets and must treat all free text as untrusted input (prompt-injection defense).
7. Any technology stack is allowed; the reference stack is in §5.3.

## 3.6 Assumptions and Dependencies
- A1: Synthetic parameters (fraud rate, rings, behavior) are plausible but **not real**; all are logged in the *Assumption Register* (DR-06) and disclosed in the pitch.
- A2: A multilingual embedding model (Bangla-capable) can be downloaded or accessed via API.
- A3: An LLM API or a local open model is available; otherwise the template fallback is used.
- A4: Judges value a working end-to-end demo over model complexity; scope is protected accordingly (MoSCoW).
- A5: Metrics on synthetic data are *engineering evidence*, not real-world performance claims; the plan for real validation is part of the deliverable.

---

# 4. Product Differentiators ("Why This Wins")

Most teams in Track 01 will submit a transaction classifier with an accuracy score — which the guideline explicitly says it does **not** want. Astha is built to be recognizably different on every judging axis.

| # | Differentiator | Why judges care | Rubric criterion |
|---|---|---|---|
| D1 | **Intervene before money leaves** — Bangla "Pause & Verify" warning at the confirm screen, triggered by risk + scam-script context | Targets the real loss moment (E5); measurable behavior change | Relevance, Impact, Innovation |
| D2 | **Network-first ring discovery** (mules, gambling hubs, fan-in/fan-out, pass-through) | Matches the ghost-wallet and gambling-crackdown reality (E6, E7); few teams attempt graphs | AI depth, Innovation |
| D3 | **Fact-verified Investigation Copilot** — every sentence cites evidence IDs; an automated claim-checker verifies numbers against the evidence JSON before display | Directly answers "explainable, secure, human oversight"; avoids hallucination | AI depth, Responsible AI |
| D4 | **Golden-hour recovery** — downstream money-flow tracing + ranked hold requests + pre-filled STR draft | Attacks the 10.7% recovery gap (E1) — a metric most teams ignore | Impact, Relevance |
| D5 | **Generalization proof** — held-out *typology* test + ring-group split + ablation vs rules-only baseline | Shows the AI is genuinely better than rules, not memorizing synthetic patterns | AI depth, Scalability |
| D6 | **Friction optimizer (uplift)** — learns *which* customers need which warning, minimizing needless friction | Distinguishes correlation from incremental impact (Track 04 "Advanced Idea") | AI depth, Innovation |
| D7 | **Impact Simulator** — sliders for alert budget/threshold → loss prevented, friction, analyst workload, ROI | Makes business value tangible in the pitch | Impact |
| D8 | **Scam Radar** — clusters new complaint/scam texts to flag *emerging* typologies | Future-ready, Track 06 crossover | Innovation |
| D9 | **Agent Guard** — protects the highest-risk node (17% victimized) with alerts + peer benchmarking | Ecosystem value (Track 05) | Relevance, Innovation |
| D10 | **Fairness & drift built in** — slice dashboards, reason-code audit, adversarial tests | Easy points on Responsible AI and credibility | Responsible AI |
| D11 | **Bangla-first, accessible UX** — plain language, optional voice read-out, low-literacy design | Society benefit, inclusion | Relevance, Innovation |
| D12 | **Production-shaped** — stateless API, versioned rules, model registry, shadow-mode plan | Believable path to real systems | Scalability |

> **Scope discipline:** the MUST set (M-priority) alone is a complete, winning demo. SHOULD/COULD items are added in priority order only after the MUST set passes acceptance tests (see §17.2).

---

# 5. System Architecture

## 5.1 Logical Layers (maps to Guideline §12)

| Layer | Components | Purpose |
|---|---|---|
| Data | Synthetic generator, PostgreSQL (or DuckDB for lite mode), Parquet snapshots | Create, store, version data |
| Feature & Context | Batch feature pipeline + online feature cache (Redis or in-process) | Velocity, device, baseline, graph features |
| ML/AI Engine | LightGBM, Isolation Forest, autoencoder, graph algorithms, text classifier, clustering, uplift | Predict, detect, cluster |
| Policy | YAML rules + policy engine | Business logic kept outside ML |
| Explanation | SHAP, reason-code mapper, rule trace, Bangla templates | Traceable, explainable output |
| GenAI | Grounded narrative generator + claim verifier | Analyst copilot, plain-language summaries |
| API | FastAPI (REST, OpenAPI) | Expose capabilities as services |
| Frontend | React/Next.js: Customer app, Analyst console, Simulator, Monitoring | Experience layer |
| Monitoring | MLflow (registry), drift (PSI/Evidently-style), fairness slices, logs | Observe and audit |

## 5.2 Reference Data Flow (INPUT → INTELLIGENCE → ACTION)
1. **Input:** synthetic stream emits `txn_requested`, `login`, `device_change`, `pin_reset`, `report_number`, `complaint` events.
2. **Context:** features are fetched/computed (<20 ms from cache) and graph features are looked up from the latest nightly graph snapshot (plus a streaming "recent edges" patch).
3. **Intelligence:** supervised + anomaly + graph + text scores are combined into a calibrated **risk score** with reason codes.
4. **Policy:** the rule engine maps the score + context to an **action band** and customer/analyst message templates.
5. **Action:** customer sees a warning; or an alert/case is created in the analyst queue; the copilot drafts the narrative; recovery tracing is offered.
6. **Outcome & feedback:** customer response (proceeded/cancelled/reported), analyst disposition, and later confirmed labels flow back to evaluation, drift and retraining.

## 5.3 Reference Technology Stack (changeable)

| Concern | Choice | Notes |
|---|---|---|
| Language | Python 3.11, TypeScript | |
| Data | pandas, NumPy, PyArrow; PostgreSQL 15 (DuckDB lite mode) | |
| Synthetic data | Custom generator + Faker-style Bangla name lists + `numpy.random.Generator` with seeds | Deterministic, reproducible |
| ML | scikit-learn, LightGBM (XGBoost alt.), PyTorch (autoencoder), SHAP | |
| Graph | NetworkX / igraph, Leiden/Louvain, personalized PageRank; PyTorch Geometric (stretch) | |
| NLP | Multilingual sentence embeddings (Bangla-capable) + logistic regression; HDBSCAN/BERTopic for clustering | LLM few-shot fallback |
| GenAI | Any LLM API or local model behind an adapter; RAG over playbooks via FAISS/pgvector | Template fallback mandatory |
| API | FastAPI + Pydantic, OpenAPI docs, Uvicorn | |
| Frontend | React/Next.js, Tailwind, Recharts, Cytoscape.js or react-force-graph for graph | Mobile-first customer app |
| MLOps | MLflow (experiments + registry), DVC or Parquet versioning, GitHub Actions CI | |
| Quality | pytest, Great-Expectations-style data checks, Locust for load | |
| Packaging | Docker Compose (api, db, ui, mlflow) | One-command run |

## 5.4 Component Boundaries (Architecture Expectations)

| Expectation (Guideline §12) | How satisfied |
|---|---|
| Separate data preparation from model inference | Offline `pipelines/` vs online `serving/`; shared feature definitions in one module |
| Keep business rules distinct from ML predictions | `policy/rules.yaml` evaluated by `policy_engine`; ML never decides actions |
| Make model outputs traceable and explainable | Every response includes `model_version`, `rules_version`, `reason_codes[]`, `shap_top_k`, `rule_trace[]`, `request_id` |
| APIs connectable to a real backend | Stateless REST + idempotency keys + OpenAPI contract (§9) |
| No sensitive decision logic only in free-form LLM prompt | LLM only writes text from structured evidence; decisions come from policy engine |

---

# 6. Functional Requirements

Priority key: **M** MUST · **S** SHOULD · **C** COULD.

## M1 — Synthetic World Generator

Goal: create a believable, clearly synthetic, fully documented financial world with injected, labeled fraud typologies so every claim can be tested against known ground truth.

| ID | Requirement | Pri |
|---|---|---|
| FR-M1-01 | Generate customers, wallets, devices, agents, merchants, locations (division/district level only), and event calendars with a configurable random seed; same seed ⇒ identical dataset. | M |
| FR-M1-02 | Generate ≥ 9 labeled typologies (T1–T9, Appendix B) with configurable prevalence and difficulty (easy/medium/hard "camouflage" levels). | M |
| FR-M1-03 | Produce transaction types: P2P send, cash-in, cash-out (agent), merchant payment, bill pay, mobile recharge, remittance-in, bank-to-wallet. | M |
| FR-M1-04 | Model normal behavior diversity: salary earners, students, small merchants, remittance receivers, farmers, gig workers, with weekly/monthly/festival seasonality. | M |
| FR-M1-05 | Produce session/device events: login, device change, SIM-swap flag, PIN reset, app install, failed PIN attempts. | M |
| FR-M1-06 | Produce complaint/report events (customer reports, number reports, free-text complaints in Bangla and English). | S |
| FR-M1-07 | Produce a synthetic **sports/event calendar** to inject gambling-style bursts that correlate with event times. | S |
| FR-M1-08 | Produce **treatment/control labels** for warnings (randomized in simulation) with a documented synthetic response model, for uplift evaluation. | S |
| FR-M1-09 | Emit an **Assumption Register** (machine- and human-readable) listing every distribution, parameter and its rationale. | M |
| FR-M1-10 | Provide dataset tiers: **Lite** (≈20k customers, ≈1M txns), **Full** (≈100k customers, ≈5M txns). Lite must generate in < 3 min on a laptop. | M |
| FR-M1-11 | Enforce **no real PII**: names/numbers drawn from synthetic lists; phone numbers from a reserved fake range; automated check rejects any pattern matching real number formats. | M |
| FR-M1-12 | Provide strict splits: (a) time split, (b) ring/group split, (c) **held-out typology** split; the test set is written once and locked (hash recorded). | M |
| FR-M1-13 | Provide an "adversary mode" that regenerates fraud with evasion tactics (structuring below limits, slower velocity, camouflage transactions) for robustness tests. | S |

## M2 — Feature & Context Layer

| ID | Requirement | Pri |
|---|---|---|
| FR-M2-01 | Compute point-in-time-correct features (no leakage: only data available *before* the decision timestamp). | M |
| FR-M2-02 | Velocity features per sender/recipient/device/agent over 1 min, 10 min, 1 h, 24 h, 7 d: counts, sums, distinct counterparties. | M |
| FR-M2-03 | Behavioral features: amount z-score vs. personal history, hour-of-day deviation, recipient novelty, recipient-set entropy, balance-drain ratio (amount ÷ balance). | M |
| FR-M2-04 | Identity/device features: new device, device shared by N wallets, time since PIN reset/SIM change, account age, KYC level (synthetic). | M |
| FR-M2-05 | Pass-through features: share of inflow forwarded/cashed-out within 10 min / 1 h; round-trip indicators. | M |
| FR-M2-06 | Graph features (from M7): degree, weighted degree, PageRank, community size/risk, hops to known-bad seed, fan-in/fan-out ratio. | M |
| FR-M2-07 | Community-report features: number/weight of reports against a recipient (trust-weighted, rate-limited). | S |
| FR-M2-08 | Feature definitions live in one shared module used by both training and serving (training/serving parity test). | M |
| FR-M2-09 | Online feature retrieval p95 ≤ 20 ms (cache hit) for single-transaction scoring. | S |
| FR-M2-10 | Feature registry document auto-generated (name, definition, window, leakage note, owner). | S |

## M3 — Real-Time Transaction Risk Scoring

| ID | Requirement | Pri |
|---|---|---|
| FR-M3-01 | Return a calibrated **risk probability (0–1)** and **risk tier** for each scored event within the latency target (NFR-PERF-01). | M |
| FR-M3-02 | Ensemble: supervised gradient-boosted model + anomaly score + graph/ring score + (optional) scam-context score, combined by a documented, versioned blend (ML-05). | M |
| FR-M3-03 | Output **top-k reason codes** (Appendix C) and SHAP attributions for each score. | M |
| FR-M3-04 | Support cost-sensitive thresholds using an explicit loss matrix (missed-fraud cost vs. friction cost) configurable in the Simulator. | S |
| FR-M3-05 | Handle missing/cold-start users via a "new-customer" model branch with conservative priors and clear labeling. | S |
| FR-M3-06 | Return `model_version`, `feature_set_version`, `rules_version`, `request_id`. | M |
| FR-M3-07 | Provide batch scoring (CSV/Parquet) for evaluation and the Simulator. | M |

## M4 — Behavioral Baseline & Account-Takeover (ATO) Signals

| ID | Requirement | Pri |
|---|---|---|
| FR-M4-01 | Maintain a per-user baseline (robust statistics/EWMA) for amount, hour, recipient set, device, geo. | M |
| FR-M4-02 | Compute ATO composite: new device + recent PIN reset/SIM change + unusual recipient + abnormal velocity/amount + off-hours. | M |
| FR-M4-03 | Flag "silent salary wallet turning midnight-active" and similar slow-drift behavior via drift-aware baselines. | S |
| FR-M4-04 | Show the baseline-vs-today comparison in the analyst console and, simplified, in customer warnings ("This is much larger than you usually send"). | S |

## M5 — Scam Interception & Customer Warnings (Customer Layer)

| ID | Requirement | Pri |
|---|---|---|
| FR-M5-01 | On a send-money/cash-out request, call the scoring API before confirmation and render a tiered response: **Allow**, **Soft nudge**, **Pause & Verify**, **Hold & Assist**. | M |
| FR-M5-02 | **Pause & Verify** screen in **Bangla (default) and English**: ≤ 3 short sentences, one primary safe action (Cancel), one secondary action (Continue), and a "Report this number" action. | M |
| FR-M5-03 | Warnings are **reason-aware** and non-technical (e.g. "This number is new and was reported by others" / "Someone asking urgently for money is a common scam sign"). Never display raw scores or model internals to customers. | M |
| FR-M5-04 | **Cooling-off timer** (e.g. 30 s) for Pause & Verify that the customer can read through; Continue is enabled after the timer. Customer is never permanently blocked by the ML layer. | M |
| FR-M5-05 | **Verify-the-story prompt:** interactive checklist ("Did someone call you claiming to be a relative/officer/customer-care? Did they ask for your PIN/OTP? Were you promised a prize/return?") — answers raise/lower the contextual risk and are logged. | S |
| FR-M5-06 | **Trusted-person confirmation (opt-in):** customer may pre-register a trusted contact (synthetic) who receives a "please confirm" prompt for high-risk sends; time-boxed. | C |
| FR-M5-07 | **Safe Recipient Check:** before sending, the customer can see a coarse recipient trust badge (New / Normal / Reported) — no names, no raw reports, abuse-resistant (FR-M5-08). | S |
| FR-M5-08 | **Community reporting:** one-tap "Report this number" with category; reports are rate-limited, trust-weighted (account age, past report accuracy) and require analyst confirmation before affecting formal status; protects against malicious/bulk reporting. | S |
| FR-M5-09 | **Voice read-out:** optional text-to-speech of the Bangla warning for low-literacy users. | C |
| FR-M5-10 | Log every intervention with treatment variant, customer decision (cancel/continue/report) and outcome for M15 uplift analysis. | M |
| FR-M5-11 | **Hold & Assist (high risk):** transaction is *delayed* (reversible) and the customer is offered step-up verification (synthetic OTP/PIN re-entry/verification question) and a "talk to support" action; analyst review is queued. This is friction, not denial. | M |
| FR-M5-12 | Post-event **"Protected" receipt:** when a customer cancels after a warning, show a positive confirmation and a short safety tip personalized to the scam type (financial-literacy micro-lesson). | S |

## M6 — Scam Check (Text/Message Analyzer)

| ID | Requirement | Pri |
|---|---|---|
| FR-M6-01 | Customer can paste (or type) a suspicious SMS/message/call-note in Bangla, English or Banglish and receive a verdict: **Likely scam / Suspicious / Looks OK** with a one-line reason and what to do. | M |
| FR-M6-02 | Classify scam typology (OTP/PIN theft, fake customer-care, "sent by mistake" refund request, prize/lottery, emergency-relative, investment/task scam, malicious link/APK, gambling payment request). | M |
| FR-M6-03 | Hybrid detector: embedding classifier + keyword/pattern signals + LLM few-shot fallback; output includes calibrated confidence. | S |
| FR-M6-04 | Detect and highlight risky phrases (urgency, secrecy, PIN/OTP request, unknown link) in the displayed message. | S |
| FR-M6-05 | If a Scam Check result is "Likely scam" for text referencing a number, add that number to the **context risk** for subsequent sends in the same session. | S |
| FR-M6-06 | Treat all pasted text as untrusted (prompt-injection safe, §12); never execute instructions found in text. | M |
| FR-M6-07 | Show a standard reminder: *upay never asks for your PIN or OTP* (synthetic brand message). | M |

## M7 — Network, Mule & Gambling-Ring Discovery

| ID | Requirement | Pri |
|---|---|---|
| FR-M7-01 | Build a **heterogeneous transaction graph** (wallets, agents, merchants, devices) with weighted, time-stamped edges from the dataset. | M |
| FR-M7-02 | Compute graph features/metrics (degree, in/out strength, PageRank, flow-through ratio, clustering, k-core). | M |
| FR-M7-03 | **Community detection** (Leiden/Louvain) and **ring scoring**: composite of density, pass-through ratio, shared devices, account-age homogeneity, burst synchrony, proximity to seeds. | M |
| FR-M7-04 | **Seed propagation:** personalized PageRank / label propagation from confirmed-bad seeds to rank exposure of other wallets. | M |
| FR-M7-05 | **Motif detectors:** fan-in → pass-through → fan-out (collector), cycles/round-trips, star-with-cash-out-agent, layering chains within a time window. | M |
| FR-M7-06 | **Shared-device/shared-attribute links** (same device, same synthetic address cluster) added as non-monetary edges. | S |
| FR-M7-07 | **Gambling-hub heuristic features:** many small inbound payments from unrelated wallets, synchronized to event-calendar bursts, followed by rapid cash-out/crypto-converter-like hops (synthetic). | S |
| FR-M7-08 | Interactive **graph explorer** in analyst console: zoom, filter by time/amount, highlight shortest path to seed, node cards with reason codes. | M |
| FR-M7-09 | Optional **GNN** (GraphSAGE or similar) as a comparison model, evaluated against feature-based graph methods. | C |
| FR-M7-10 | **Temporal view:** animate/slider to show how a ring formed and how cash moved. | S |
| FR-M7-11 | Rings are exported as **case objects** with members, edges, timeline, total value, suggested actions (human-approved). | M |

## M8 — Agent Guard & Agent Risk Intelligence

| ID | Requirement | Pri |
|---|---|---|
| FR-M8-01 | Compute agent behavior profile vs. **peer group** (region, size, tenure): cash-out ratio, repeat counterparties, structured amounts, burst cash-outs, many wallets sharing a device. | M |
| FR-M8-02 | Score agents and flag abnormal patterns with reason codes; separate "fraud-risk" from "liquidity-pressure" flags. | S |
| FR-M8-03 | **Agent Guard** real-time alert in a simulated agent view when a cash-out request matches a mule/coached-customer pattern (e.g. customer on phone, rapid in→out, linked to flagged ring) with a plain-language prompt: "Ask the customer: who asked you to send this money?" | S |
| FR-M8-04 | Agent training micro-tips triggered by repeated alert types (reflects finding that untrained agents are more exposed). | C |
| FR-M8-05 | Distinguish *possibly complicit* vs *possibly victimized* agent patterns, always routed to human review (no automated sanction). | S |

## M9 — Explainability Engine

| ID | Requirement | Pri |
|---|---|---|
| FR-M9-01 | Provide **three explanation levels:** Customer (plain Bangla/English), Analyst (SHAP + features + baseline deltas), Auditor (full rule trace + versions + data lineage). | M |
| FR-M9-02 | Map model/rule outcomes to a controlled **reason-code catalogue** (Appendix C) with bilingual text templates. | M |
| FR-M9-03 | **Counterfactual hints** for analysts ("risk would drop below tier 2 if recipient were not new and amount < baseline × 2"). | S |
| FR-M9-04 | Clearly **label** each statement as *Prediction*, *Assumption* or *Generated explanation* (Guideline §14 transparency). | M |
| FR-M9-05 | Explanations are reproducible from logged inputs and versions (deterministic replay). | S |

## M10 — Decision & Policy Engine

| ID | Requirement | Pri |
|---|---|---|
| FR-M10-01 | Policy rules defined in **versioned YAML**, hot-reloadable, with unit tests; separate from model code. | M |
| FR-M10-02 | Map (score, tier, context, rules) → action: `ALLOW`, `NUDGE`, `PAUSE_VERIFY`, `HOLD_ASSIST`, `QUEUE_ANALYST`, `ESCALATE_RING`. | M |
| FR-M10-03 | **Hard rules** (e.g., recipient confirmed-bad, structuring signature) coexist with ML; show which fired in the rule trace. | M |
| FR-M10-04 | **Human-in-the-loop gates:** account freeze/limit changes and ring-level actions require analyst approval; high-value ring actions require **four-eyes** (second approver). | M |
| FR-M10-05 | **Safe fail:** if the ML service is down, fall back to rule-only policy with a visible "degraded mode" flag. | S |
| FR-M10-06 | **Override logging:** analyst overrides require a reason code; overrides feed monitoring and retraining labels. | M |
| FR-M10-07 | **Policy simulation:** replay a historical window under a candidate policy and report effects (links to M15). | S |

### Default Action Bands (configurable)

| Risk tier | Score band (illustrative) | Customer experience | Backend action |
|---|---|---|---|
| T0 Low | < 0.30 | Normal flow | Allow, log |
| T1 Mild | 0.30 – 0.60 | Soft info banner (1 line) | Log, sample for review |
| T2 Elevated | 0.60 – 0.85 | **Pause & Verify** with cooling-off | Create low-priority alert |
| T3 High | ≥ 0.85 or hard rule | **Hold & Assist** (delay + step-up + support) | High-priority case, copilot brief |
| Ring flag | Ring score ≥ θ | Affected sends get T2/T3 treatment | Ring case to compliance; freeze recommendation (human approval) |

## M11 — Analyst Console & Case Management

| ID | Requirement | Pri |
|---|---|---|
| FR-M11-01 | **Prioritized alert queue** ranked by expected loss × confidence ÷ effort, with SLA timers and filters (typology, region, amount, agent). | M |
| FR-M11-02 | **Case view** answering the guideline's three questions on one screen: *What happened?* (timeline) · *Why is it risky?* (reasons, baseline, graph) · *What should upay do next?* (recommended, human-approved actions). | M |
| FR-M11-03 | Case actions: confirm fraud, mark false positive, request customer contact, hold downstream wallets (request), escalate to compliance, close; all audit-logged. | M |
| FR-M11-04 | Bulk triage for ring cases (accept/reject member-level suggestions). | S |
| FR-M11-05 | **Analyst feedback capture** (labels + free text) stored for retraining and for measuring analyst–model agreement. | M |
| FR-M11-06 | Role-based views: Analyst, Compliance, Manager, Admin (RBAC, §12). | M |
| FR-M11-07 | Case templates and **playbook search** (RAG over synthetic SOP documents). | S |
| FR-M11-08 | Analyst productivity metrics (alerts/hour, time-to-decision, precision of own confirmations). | S |

## M12 — Investigation Copilot (Grounded & Fact-Verified)

| ID | Requirement | Pri |
|---|---|---|
| FR-M12-01 | Generate a case narrative in **English and Bangla** with sections: **What happened · Why it is risky · Suggested next step · Confidence & open questions**. | M |
| FR-M12-02 | **Grounding:** the LLM receives only a structured *Evidence Pack* (JSON) + sanitized text fields tagged `UNTRUSTED`; no browsing, no tools, no decision authority. | M |
| FR-M12-03 | **Citation rule:** every factual sentence carries ≥ 1 `evidence_id`; sentences without evidence are rejected or removed. | M |
| FR-M12-04 | **Claim verifier:** automatically extract numbers, dates, counts, amounts and entity IDs from the narrative and check them against the Evidence Pack; show a **✔ Verified / ⚠ Unverified** badge; failures trigger regeneration or fallback template. | M |
| FR-M12-05 | **Template fallback:** deterministic template narrative if the LLM is unavailable or verification fails twice. | M |
| FR-M12-06 | **Q&A over the case:** analyst may ask follow-ups ("Which wallets received the money next?") answered only from evidence; refuses if evidence is missing. | S |
| FR-M12-07 | **Suggested next steps** drawn from a controlled action catalogue and playbook snippets (RAG), clearly marked as suggestions. | M |
| FR-M12-08 | **STR draft generator:** pre-filled, editable draft summarizing parties, timeline, amounts and red flags; marked **DRAFT — requires human review**. | S |
| FR-M12-09 | **Customer-facing explainer** in simple Bangla for support agents to read to the victim (no sensitive internal logic). | S |
| FR-M12-10 | PII masking before any text leaves the system boundary; prompts/outputs logged with hashes for audit. | M |
| FR-M12-11 | Prompt-injection regression suite (≥ 25 adversarial cases) must pass (Section 14). | M |

## M13 — Golden-Hour Recovery & Money-Flow Tracing

| ID | Requirement | Pri |
|---|---|---|
| FR-M13-01 | Given a victim transaction, build the **downstream flow tree** (hops, amounts, timestamps) within a configurable window (e.g. 6 h, ≤ 6 hops). | M |
| FR-M13-02 | Show **where the money probably is now**: remaining balance per wallet, cash-outs completed, cash-out points (agents) with timestamps. | M |
| FR-M13-03 | Rank **hold candidates** by estimated recoverable amount × confidence ÷ collateral risk (impact on likely-innocent wallets). | M |
| FR-M13-04 | Generate **pre-filled hold/freeze requests** (human-approved) and a victim-case summary. | S |
| FR-M13-05 | Collateral-risk guardrail: flag wallets with strong legitimate-behavior evidence to avoid unfair holds. | S |
| FR-M13-06 | Compute **simulated recovery uplift** versus a "no-trace" baseline in the Simulator. | M |
| FR-M13-07 | "Time-since-theft" countdown showing how recoverable share decays (illustrates why speed matters). | C |

## M14 — Scam Radar (Emerging-Typology Detection)

| ID | Requirement | Pri |
|---|---|---|
| FR-M14-01 | Embed incoming complaints/Scam Check texts and **cluster** them (HDBSCAN/BERTopic); label clusters with representative phrases. | S |
| FR-M14-02 | Flag **new/rising clusters** versus the known typology catalogue and show growth over time and geography. | S |
| FR-M14-03 | Auto-draft a **scam alert bulletin** (Bangla/English) for human approval to broadcast to customers/agents. | C |
| FR-M14-04 | Link clusters to transactions/rings to estimate exposure. | C |

## M15 — Friction Optimizer & Impact Simulator

| ID | Requirement | Pri |
|---|---|---|
| FR-M15-01 | **Impact Simulator:** interactive thresholds/alert-budget sliders showing fraud value caught, false-positive friction rate, analyst workload (cases/day), loss prevented, and net benefit. | M |
| FR-M15-02 | **Cost model** with editable parameters (fraud loss, per-alert analyst cost, per-friction customer cost, intervention success rate). | M |
| FR-M15-03 | **Friction optimizer:** uplift model estimates which customer segments benefit from which warning variant (none / nudge / pause); chooses minimum friction achieving target protection. | S |
| FR-M15-04 | **Simulated A/B:** compare warning variants (text, timer length, language) using synthetic treatment/control with documented response assumptions; report uplift with confidence intervals. | S |
| FR-M15-05 | **What-if replay** of a past window under alternative policy/model versions. | S |
| FR-M15-06 | Export a one-page "Impact Brief" (PNG/PDF/MD) for the pitch. | C |

## M16 — Monitoring, Drift & Fairness

| ID | Requirement | Pri |
|---|---|---|
| FR-M16-01 | Dashboard: volume, score distribution, alert rate, precision (labelled), latency, error rate, action-band mix. | M |
| FR-M16-02 | **Drift monitors** (PSI/KS) on key features and score distribution; simulated drift scenarios demonstrate alerts. | S |
| FR-M16-03 | **Fairness slices:** alert rate, FPR and TPR by gender, urban/rural, age band, new vs established, onboarding channel; disparity ratios and flags. Protected attributes are **not model inputs**; used for audit only. | M |
| FR-M16-04 | **Champion/challenger** comparison of two model versions on the same replay. | C |
| FR-M16-05 | **Feedback loop report:** analyst labels, overrides and retraining triggers. | S |
| FR-M16-06 | Model card and data card pages (purpose, data, metrics, limits, ethical notes). | M |

## M17 — Admin, Audit, Security & Compliance Drafts

| ID | Requirement | Pri |
|---|---|---|
| FR-M17-01 | Immutable-style **audit log** (append-only, hash-chained) of scores, policy decisions, analyst actions, LLM prompts/outputs (hashed), config changes. | M |
| FR-M17-02 | RBAC with least privilege; separate roles for analyst, compliance, manager, admin. | M |
| FR-M17-03 | Config UI/API for thresholds, rules version, feature flags (e.g., enable copilot). | S |
| FR-M17-04 | **Data minimization & masking** in UI (masked wallet numbers, role-based reveal with justification). | M |
| FR-M17-05 | Export audit pack for a case (timeline, evidence, versions, actions) as a single file. | S |
| FR-M17-06 | Rate limiting and API key auth for external callers. | S |

---

# 7. Data Requirements & Synthetic Data Specification

## 7.1 Data Principles (Guideline §11)
- **DR-01 (M):** All data is synthetic, public or self-generated; production upay data is never used.
- **DR-02 (M):** Data is realistic enough to reproduce meaningful patterns but **clearly synthetic** (dataset header/watermark and fake number range).
- **DR-03 (M):** Known patterns are injected for testing: normal behavior, anomalies, seasonality, campaign/warning response, churn-like inactivity, and the typologies in Appendix B.
- **DR-04 (M):** Every synthetic assumption is documented in the Assumption Register.
- **DR-05 (M):** Never use real PII to improve realism; automated PII lint runs in CI.
- **DR-06 (M):** A clean test set is generated once, locked by hash, and never used for training or tuning.
- **DR-07 (S):** Public datasets (e.g., PaySim, AMLSim) may be used for *sanity benchmarks only*, with domain mismatch disclosed.

## 7.2 Logical Data Model

| Entity | Key fields (synthetic) |
|---|---|
| `customers` | customer_id, segment (student/salaried/farmer/gig/merchant-owner/remittance-recipient), division, district_type (urban/rural), age_band, gender, onboarding_channel (app/agent), kyc_level, created_at |
| `wallets` | wallet_id, customer_id, status, balance_snapshot, created_at, daily/monthly limits |
| `devices` | device_id, first_seen, os_family, linked_wallet_count |
| `agents` | agent_id, division, district_type, tenure_days, size_tier, trained_flag |
| `merchants` | merchant_id, category, division, created_at |
| `transactions` | txn_id, ts, sender_wallet, receiver_wallet/agent/merchant, type, amount, channel, device_id, geo_cell, fee, status, **label_fraud**, **typology_id**, **ring_id** (ground truth, hidden from model) |
| `events` | event_id, ts, wallet_id, type (login/device_change/sim_swap/pin_reset/failed_pin/app_install), device_id |
| `reports` | report_id, ts, reporter_wallet, reported_number/wallet, category, text, language |
| `complaints` | complaint_id, ts, wallet_id, text, language, resolved_flag |
| `event_calendar` | event_id, ts_start, ts_end, category (synthetic sports/event) |
| `interventions` | intervention_id, txn_id, variant, shown_ts, customer_action, treatment_flag |
| `alerts` / `cases` | alert_id, score, tier, reasons, status, analyst_id, disposition, timestamps |
| `ring_cases` | ring_case_id, members, edges, total_value, ring_score, status |
| `analyst_actions` | action_id, case_id, action_type, reason_code, approver_id(s) |
| `model_registry` / `rules_registry` | version, metrics, data hash, created_at |
| `audit_log` | seq, ts, actor, action, payload_hash, prev_hash |

## 7.3 Dataset Tiers & Target Statistics (all configurable; all logged)

| Parameter | Lite | Full | Notes |
|---|---|---|---|
| Customers | 20,000 | 100,000 | Mix of segments with different base rates |
| Agents / Merchants | 600 / 1,000 | 3,000 / 5,000 | |
| Time span | 90 days | 180 days | Includes salary-week and festival effects |
| Transactions | ~1M | ~5M | Heavy-tailed amounts; many small P2P/cash-out |
| Fraud transaction prevalence | 0.3–0.8% | 0.3–0.8% | Realistically imbalanced |
| Mule/ring wallets | ~0.5% of wallets | ~0.5% | In 40–120 rings of 5–60 members |
| Complaint/report texts | ~3k | ~15k | Bangla/English/Banglish |
| Fraud label delay | 1–14 days (random) | same | Simulates delayed labels |

> **Honesty rule for the pitch:** present these as *assumptions informed by public reporting*, not as upay's real fraud rate.

## 7.4 Typology Injection Requirements

| ID | Requirement | Pri |
|---|---|---|
| DR-10 | Each typology (Appendix B) has: generator function, parameters, ground-truth labels, difficulty levels, and a unit test confirming it appears in data. | M |
| DR-11 | Camouflage: fraudulent wallets also perform normal-looking transactions at tunable ratios so detection is not trivial. | M |
| DR-12 | Label noise & delay: a configurable % of fraud is unlabeled at training time (unreported) to reflect reality. | S |
| DR-13 | Concept drift: a later period introduces a changed tactic (e.g., slower velocity, new scam script) to test robustness. | S |
| DR-14 | Held-out typology: at least one typology (e.g., T6 staged investment/task scam) is excluded from training for generalization testing. | M |

## 7.5 Data Quality & Governance Requirements

| ID | Requirement | Pri |
|---|---|---|
| DR-20 | Schema validation and referential integrity checks on generation; failures block the pipeline. | M |
| DR-21 | Data cards documenting provenance, assumptions, known gaps. | M |
| DR-22 | Dataset version IDs and content hashes recorded in model metadata. | M |
| DR-23 | Synthetic data must not include real phone-number formats, real NID formats, or real names + numbers combos (lint test). | M |

---

# 8. AI/ML Specification

## 8.1 Model Portfolio

| ID | Model | Purpose | Method | Pri |
|---|---|---|---|---|
| ML-01 | **Transaction risk (supervised)** | Probability a txn is fraudulent/mule-related | LightGBM on tabular + graph features; class weights/focal-like weighting; isotonic calibration | M |
| ML-02 | **Behavioral anomaly (unsupervised)** | Novel deviations with no labels | Isolation Forest + autoencoder on per-user-normalized features; rank-averaged | M |
| ML-03 | **Per-user baseline** | Personal "normal" | Robust z-scores/EWMA on amount, hour, recipients | M |
| ML-04 | **Graph ring detector** | Mule/gambling rings | Leiden communities + ring score; personalized PageRank from seeds; motif detectors; (stretch) GraphSAGE | M |
| ML-05 | **Score blender** | Combine scores | Logistic stacking on validation fold OR documented weighted rank-blend; calibrated | M |
| ML-06 | **Scam text classifier** | Typology + scam likelihood | Multilingual sentence embeddings + logistic regression; keyword/pattern features; LLM few-shot fallback | M |
| ML-07 | **Emerging-scam clustering** | Detect new typologies | Embeddings + HDBSCAN/BERTopic | S |
| ML-08 | **Agent risk** | Peer-relative anomalies | Peer-group z-scores + Isolation Forest | S |
| ML-09 | **Uplift / friction optimizer** | Who needs which warning | T-learner / causal-forest-style uplift on randomized synthetic treatment | S |
| ML-10 | **Recovery ranking** | Prioritize holds | Rule-based expected-recoverable-value score with collateral penalty (not black-box) | M |
| ML-11 | **Grounded narrative generator** | Case brief text | LLM with structured evidence + claim verifier + template fallback | M |

## 8.2 Feature Catalogue (excerpt; full registry auto-generated)

| Family | Examples |
|---|---|
| Velocity | txn_count_1m/10m/1h/24h/7d; amount_sum_*; distinct_recipients_*; failed_pin_count_1h |
| Behavioral | amount_zscore_user; hour_deviation; recipient_entropy_30d; new_recipient_flag; first_time_large_send_flag; balance_drain_ratio |
| Identity/Device | device_new_flag; device_shared_wallet_count; mins_since_pin_reset; mins_since_sim_swap; account_age_days; kyc_level |
| Pass-through | inflow_forwarded_10m_ratio; cashin_to_cashout_minutes; round_trip_flag |
| Graph | degree_in/out; strength_in/out; pagerank; community_id/size/risk; hops_to_seed; fan_in_out_ratio; kcore |
| Social/context | recipient_report_weight; scam_check_context_flag; event_window_flag |
| Agent | cashout_ratio; repeat_counterparty_share; structured_amount_share; peer_zscore_* |

## 8.3 Training & Validation Protocol

| ID | Requirement | Pri |
|---|---|---|
| ML-20 | **Time-based split** (train earlier, validate later, test latest) — never random-only. | M |
| ML-21 | **Group split** by ring_id/customer clusters so ring members never straddle train/test. | M |
| ML-22 | **Held-out typology test:** train without typology T6 (and optionally another); report performance on it. | M |
| ML-23 | **Leakage checks:** features computed point-in-time; label-delay respected; automated test fails if a feature uses future data. | M |
| ML-24 | **Baselines:** (a) rules-only (thresholds + blacklist), (b) single logistic regression, (c) LightGBM without graph features, (d) full model — ablation table in the deliverable. | M |
| ML-25 | Metrics: PR-AUC, ROC-AUC (secondary), recall@alert-budget (0.1%, 0.5%, 1%), precision@k, FPR on legitimate users, calibration (ECE/Brier), ring-level precision/recall/F1, time-to-detect. | M |
| ML-26 | **Confidence intervals** via bootstrap or repeated seeds (≥ 5 seeds on Lite). | S |
| ML-27 | **Robustness:** evaluate on adversary-mode data (structuring, slow velocity); report degradation and mitigations. | S |
| ML-28 | **Calibration** reported and plotted; thresholds chosen on validation, frozen before test. | M |
| ML-29 | **Reproducibility:** seeds, versions, data hash and metrics logged to MLflow; `make reproduce` regenerates headline numbers. | M |

## 8.4 Ring Score (illustrative definition)

`ring_score = w1·density + w2·pass_through_share + w3·shared_device_share + w4·burst_synchrony + w5·account_age_homogeneity + w6·seed_proximity − w7·legit_signal`

- Weights set on validation data; documented; displayed as a radar chart per ring for explainability.
- `legit_signal` (e.g., diverse long-term counterparties, stable merchant behavior) reduces false positives such as family remittance hubs or genuine busy merchants.

## 8.5 GenAI Specification

| Aspect | Requirement |
|---|---|
| Input | Evidence Pack JSON: case facts, transaction list, graph summary, reason codes, baselines, versions, plus `UNTRUSTED` text fields |
| Output schema | `{sections:[{title, sentences:[{text, evidence_ids[]}]}], confidence, open_questions[]}` validated by JSON schema |
| Prompting | System prompt forbids using facts outside the pack, forbids decisions, requires citations, requires "insufficient evidence" statements |
| Verification | Regex/AST extraction of numbers, IDs, dates; each must exist in pack; unit/currency checks; failure ⇒ one regeneration ⇒ fallback template |
| Injection defense | Untrusted text wrapped and labeled; instructions inside it ignored; output never executed; allow-list of action phrases |
| Languages | English + Bangla; Bangla via LLM with template fallback; glossary of financial terms for consistency |
| Evaluation | Faithfulness (claim-verifier pass rate), coverage (all key reason codes mentioned), readability (analyst rating), latency |
| Safety | No instructions that help evade detection are ever generated; refusal tests included |

## 8.6 Rules (Policy) Specification
- Rules are declarative YAML (condition → action/priority), unit-tested, versioned, and diff-able.
- Example rules: `recipient.status == CONFIRMED_BAD → HOLD_ASSIST`; `amount > 5×baseline AND new_recipient AND hour in [0,5] → PAUSE_VERIFY`; `ring_score ≥ θ AND member → QUEUE_ANALYST (ring case)`.
- Rule outcomes appear in the rule trace beside ML reasons so judges and analysts see which logic acted.

---

# 9. External Interfaces & API Specification

## 9.1 Principles
REST + JSON, OpenAPI 3 documented, stateless scoring, idempotency keys, versioned (`/v1`), pagination for lists, consistent error schema, request IDs on every response.

## 9.2 Endpoints

| ID | Method & Path | Purpose | Pri |
|---|---|---|---|
| API-01 | `POST /v1/score/transaction` | Real-time risk score + action + reasons | M |
| API-02 | `POST /v1/score/batch` | Batch scoring for evaluation/simulation | M |
| API-03 | `POST /v1/scamcheck` | Analyze pasted text → verdict, typology, highlights | M |
| API-04 | `POST /v1/reports/number` | Community report of a number | S |
| API-05 | `GET /v1/recipients/{id}/trust` | Coarse trust badge | S |
| API-06 | `GET /v1/alerts` · `GET /v1/alerts/{id}` | Alert queue/detail | M |
| API-07 | `GET /v1/cases/{id}` · `POST /v1/cases/{id}/actions` | Case detail and analyst actions (RBAC) | M |
| API-08 | `GET /v1/rings` · `GET /v1/rings/{id}` | Ring cases and graph payload | M |
| API-09 | `POST /v1/cases/{id}/copilot` | Generate narrative (EN/BN) with verification status | M |
| API-10 | `POST /v1/cases/{id}/trace` | Golden-hour money-flow trace + hold candidates | M |
| API-11 | `POST /v1/simulate` | Policy/threshold simulation → impact metrics | M |
| API-12 | `GET /v1/metrics/*` | Monitoring, drift, fairness | M |
| API-13 | `GET /v1/radar/clusters` | Emerging-scam clusters | S |
| API-14 | `GET /v1/agents/{id}/risk` | Agent risk profile | S |
| API-15 | `POST /v1/admin/config` | Thresholds/flags (admin role) | S |
| API-16 | `GET /healthz` · `GET /readyz` | Liveness/readiness, degraded-mode flag | M |

## 9.3 Example: Score a Transaction

Request:
```json
{
  "request_id": "req-8f21",
  "idempotency_key": "txn-20261002-000123",
  "timestamp": "2026-10-02T23:41:07+06:00",
  "txn": {
    "type": "P2P_SEND",
    "sender_wallet": "W-SYN-004512",
    "receiver_wallet": "W-SYN-091177",
    "amount_bdt": 18500,
    "channel": "APP",
    "device_id": "D-SYN-33210"
  },
  "context": {
    "scamcheck_session_flag": false,
    "customer_answers": null
  }
}
```

Response:
```json
{
  "request_id": "req-8f21",
  "risk_score": 0.91,
  "risk_tier": "T3",
  "action": "HOLD_ASSIST",
  "reasons": [
    {"code": "RC01", "label_en": "Large first-time send to a new recipient", "label_bn": "নতুন প্রাপকের কাছে প্রথমবার বড় অঙ্কের টাকা", "weight": 0.31},
    {"code": "RC04", "label_en": "Recipient is 2 hops from a flagged ring", "label_bn": "প্রাপক সন্দেহজনক চক্রের কাছাকাছি", "weight": 0.27},
    {"code": "RC02", "label_en": "Unusual hour for this user", "label_bn": "এই ব্যবহারকারীর জন্য অস্বাভাবিক সময়", "weight": 0.12}
  ],
  "rule_trace": [{"rule": "NEW_RCPT_5X_BASELINE_NIGHT", "fired": true}],
  "customer_message": {"lang": "bn", "template_id": "PV-03"},
  "analyst_case_id": "CASE-2026-00417",
  "versions": {"model": "risk-1.4.2", "features": "fs-1.2", "rules": "pol-0.9.1"},
  "label_types": {"score": "prediction", "reasons": "model_attribution", "message": "template"}
}
```

## 9.4 Error & Security Conventions
- Errors: `{ "error": {"code", "message", "request_id"} }`; no stack traces or internals in responses.
- Auth: API keys + role claims for console; per-key rate limits; input size limits; schema validation on every payload.

---

# 10. UI/UX Requirements

## 10.1 UX Principles
1. **Calm clarity over alarm:** warnings should help, not panic.
2. **Bangla first,** English toggle; short sentences; no jargon; large tap targets; high contrast; optional voice.
3. **Never trap the customer:** friction is time-bound and reversible; support path always visible.
4. **Show reasons, not math:** customers see reasons; analysts see attributions; auditors see traces.
5. **One screen, three answers** for analysts: what happened · why risky · what next.

## 10.2 Screens

| ID | Screen | Key elements | Pri |
|---|---|---|---|
| UI-01 | **Customer Home / Send Money** (mobile web, 360 px) | Recipient entry, amount, Safe Recipient badge, "Scam Check" shortcut | M |
| UI-02 | **Pause & Verify** modal | Bangla headline, ≤3 sentences, reason chips, cooling-off timer, Cancel (primary), Continue (secondary), Report number, listen button | M |
| UI-03 | **Hold & Assist** screen | Explanation, step-up verification, talk-to-support, expected review time | M |
| UI-04 | **Scam Check** | Paste box, verdict card, highlighted phrases, what-to-do steps | M |
| UI-05 | **"You were protected" receipt** | Positive confirmation + tip | S |
| UI-06 | **Agent Guard** view | Incoming cash-out request, alert banner, suggested question to customer | S |
| UI-07 | **Analyst Queue** | Ranked alerts, filters, SLA timers, typology chips | M |
| UI-08 | **Case Detail** | Timeline, reasons, baseline compare, mini-graph, copilot panel with ✔ Verified badge, action buttons | M |
| UI-09 | **Ring Explorer** | Force-directed graph, time slider, node cards, ring radar chart, export to case | M |
| UI-10 | **Recovery Trace** | Money-flow tree/Sankey, current location of funds, hold candidates with recoverable estimates | M |
| UI-11 | **Impact Simulator** | Threshold and alert-budget sliders, KPI tiles, cost parameters, before/after bars | M |
| UI-12 | **Monitoring & Fairness** | Drift charts, slice tables, disparity flags, model card | M |
| UI-13 | **Scam Radar** | Cluster map/timeline, new-typology callouts, draft bulletin | S |
| UI-14 | **Admin/Audit** | Config, versions, audit-log viewer, role management | S |

## 10.3 Sample Wireframe — Pause & Verify (Customer)

```
┌───────────────────────────────────┐
│  ⚠  থামুন! একটু যাচাই করে নিন       │
│                                   │
│  • প্রাপকের নম্বরটি নতুন এবং অন্যরা   │
│    এ বিষয়ে অভিযোগ করেছেন।          │
│  • কেউ জরুরি ভিত্তিতে টাকা চাইলে     │
│    আগে অন্য নম্বরে ফোন করে নিশ্চিত হোন। │
│  • আপনার পিন/ওটিপি কাউকে দেবেন না।   │
│                                   │
│  [ 🔊 শুনুন ]      ⏱ ২৫ সেকেন্ড      │
│                                   │
│  [   বাতিল করুন (নিরাপদ)   ]         │
│  [ আমি নিশ্চিত, পাঠান ] (টাইমার শেষে) │
│  ⚑ সন্দেহজনক নম্বর জানান             │
└───────────────────────────────────┘
```

English equivalent: *Stop — please verify. This number is new and others have reported it. If someone urgently asks for money, call them on a different number first. Never share your PIN/OTP.*

## 10.4 Sample Wireframe — Analyst Case Detail

```
┌ CASE-2026-00417 ─ Tier T3 ─ Typology: Emergency-relative scam ─ SLA 07:42 ───┐
│ WHAT HAPPENED            │ WHY IT IS RISKY            │ WHAT NEXT (suggested) │
│ 23:41 Send ৳18,500       │ ● New recipient (RC01)     │ 1 Contact customer    │
│ 23:43 Recipient forwards │ ● 2 hops from Ring-12(RC04)│ 2 Request hold on W-… │
│   to 3 wallets           │ ● Night + 7× baseline      │ 3 Add Ring-12 review  │
│ 23:52 Cash-out @Agent-88 │ SHAP bars · baseline chart │ [Approve] [Override]  │
├──────────────────────────┴────────────────────────────┴───────────────────────┤
│ COPILOT (EN/বাংলা)  ✔ Verified 14/14 claims   [Ask a question about this case] │
│ Mini-graph ◉──◉──◉ ring highlighted     [Open Ring Explorer] [Trace money]     │
└────────────────────────────────────────────────────────────────────────────────┘
```

## 10.5 Accessibility & Localization

| ID | Requirement | Pri |
|---|---|---|
| UI-20 | WCAG 2.1 AA contrast; text scalable to 200%; no color-only meaning | M |
| UI-21 | Full Bangla localization of customer screens, with a vetted glossary; English toggle | M |
| UI-22 | Numerals: support both Bangla and Latin digits (setting) | S |
| UI-23 | Optional audio read-out (Bangla TTS) of warnings | C |
| UI-24 | Works on low-end phones (page weight budget ≤ 1.5 MB, no heavy animation on customer app) | S |

## 10.6 Bangla Copy Bank (examples; reviewed by a native speaker before demo)

| Template | বাংলা | English |
|---|---|---|
| PV-01 New recipient | প্রাপকের নম্বরটি আপনার জন্য নতুন। টাকা পাঠানোর আগে নিশ্চিত হয়ে নিন। | This recipient is new to you. Please confirm before sending. |
| PV-02 Reported | এই নম্বরের বিরুদ্ধে আগে অভিযোগ এসেছে। | Reports have been made against this number. |
| PV-03 Urgency | কেউ জরুরি ভিত্তিতে টাকা চাইলে আগে অন্য নম্বরে ফোন করে নিশ্চিত হোন। | If someone urgently asks for money, call them on a different number first. |
| PV-04 PIN/OTP | আপনার পিন বা ওটিপি কাউকে বলবেন না — উপায় কখনো তা চায় না। | Never share your PIN or OTP — upay never asks for it. |
| PV-05 Hold | নিরাপত্তার জন্য লেনদেনটি অল্প সময় অপেক্ষায় রাখা হয়েছে। আমরা আপনাকে সাহায্য করব। | For your safety this transaction is briefly on hold. We will help you. |
| PV-06 Protected | ভালো সিদ্ধান্ত! আপনি নিজেকে সুরক্ষিত রেখেছেন। | Good decision! You protected yourself. |

---

# 11. Non-Functional Requirements

| ID | Category | Requirement | Pri |
|---|---|---|---|
| NFR-PERF-01 | Performance | Single-transaction scoring p95 ≤ 150 ms, p99 ≤ 300 ms on a laptop (features cached) | M |
| NFR-PERF-02 | Performance | Batch scoring ≥ 20,000 txns/min on Lite hardware | S |
| NFR-PERF-03 | Performance | Graph snapshot build for ≥ 1M edges ≤ 5 min; ring explorer renders ≤ 2,000 nodes smoothly | S |
| NFR-PERF-04 | Performance | Copilot narrative p95 ≤ 8 s including verification (fallback ≤ 1 s) | S |
| NFR-REL-01 | Reliability | Graceful degradation: ML down → rules-only; LLM down → templates; no hard failures in customer flow | M |
| NFR-REL-02 | Reliability | Idempotent scoring by `idempotency_key` | S |
| NFR-SEC-01 | Security | RBAC, API-key auth, input validation, rate limiting, secrets in env/secret store | M |
| NFR-SEC-02 | Security | Append-only, hash-chained audit log; tamper detection test | M |
| NFR-PRIV-01 | Privacy | Synthetic data only; PII lint; masking by default in UI; LLM payloads minimized | M |
| NFR-EXP-01 | Explainability | 100% of scored events carry reason codes and versions | M |
| NFR-USE-01 | Usability | A first-time user completes Pause & Verify flow without instructions in ≤ 30 s (guerrilla test with ≥ 5 people) | S |
| NFR-USE-02 | Usability | Analyst reaches a decision on a standard case ≤ 90 s with copilot (measured in demo) | S |
| NFR-MNT-01 | Maintainability | ≥ 70% unit-test coverage on core libs; CI runs lint + tests + leakage + PII checks | M |
| NFR-MNT-02 | Maintainability | One-command setup (`docker compose up`) and `make reproduce` | M |
| NFR-POR-01 | Portability | Runs on Linux/macOS/Windows via Docker; no GPU required | M |
| NFR-OBS-01 | Observability | Structured logs, request IDs, latency/error metrics, model & rule versions on every log line | M |
| NFR-DOC-01 | Documentation | README, architecture diagram, data card, model card, API docs, runbook, assumption register | M |

---

# 12. Responsible AI, Safety & Security Requirements

## 12.1 Responsible-AI Matrix (extends Guideline §14)

| Principle | Minimum expectation (guideline) | Astha commitments | ID |
|---|---|---|---|
| Privacy | Synthetic/public/self-generated data only | PII lint in CI; masked UI; no production data; LLM payload minimization | RAI-01 |
| Explainability | Show main reasons | Three-level explanations; reason-code catalogue; SHAP; rule trace; counterfactual hints | RAI-02 |
| Fairness | Check behavior across groups | Slice dashboards (gender, urban/rural, age, tenure, channel); protected attributes excluded from inputs; disparity flags with documented review process | RAI-03 |
| Security | Adversarial manipulation, prompt injection, leakage, access control | Threat model (§12.2); injection suite; adversary-mode data; RBAC; audit log | RAI-04 |
| Human oversight | High-impact actions reviewable | Freezes need analyst approval; ring actions need four-eyes; overrides logged | RAI-05 |
| Transparency | Separate predictions, assumptions, generated explanations | Output labeling (prediction / assumption / generated); model & data cards | RAI-06 |
| No harmful automation | No autonomous approve/deny of consequential decisions | ML only recommends; customer friction is reversible and time-bound; no auto-freeze; no auto-reporting to authorities (draft only) | RAI-07 |

## 12.2 Threat Model & Mitigations

| Threat | Example | Mitigation |
|---|---|---|
| Evasion / structuring | Fraudsters keep amounts under thresholds or slow velocity | Behavioral baselines, network features, adversary-mode testing, drift monitors |
| Data poisoning | Malicious mass-reporting to push innocents into "Reported" | Rate limits, reporter-trust weighting, analyst confirmation before formal status |
| Prompt injection | Complaint/scam text contains "ignore previous instructions" | Untrusted tagging, no tools for LLM, output schema validation, claim verifier, 25+ injection tests |
| Model/info leakage | Customer UI reveals thresholds enabling evasion | Customers see reasons not scores; analysts see more; auditors see all (role-based) |
| Insider misuse | Analyst reveals identities or overrides unfairly | RBAC, masked data with justified reveal, audit log, override review |
| API abuse | Enumeration of risky wallets via Safe Recipient Check | Coarse badges, rate limits, no per-reporter detail, anomaly alerts on lookups |
| Collateral harm | Freezing innocent wallets in a ring neighborhood | Legit-signal penalty, collateral-risk flag, human approval, member-level review |
| Availability | ML/LLM outage | Degraded mode, template fallback |

## 12.3 Fairness Procedure
1. Compute alert rate, FPR and TPR per slice at the operating threshold.
2. Flag disparity if any slice's FPR exceeds **1.25×** the overall (configurable) or alert-rate ratio exceeds **1.5×** without a legitimate behavioral explanation.
3. Investigate: features driving the disparity (e.g. rural cash-out heavy behavior), whether the difference reflects true prevalence or proxy bias.
4. Mitigate via feature review, threshold calibration per segment *where policy allows*, or additional human review for the affected slice; document in the model card.
5. Acknowledge limits: synthetic data cannot prove real-world fairness; real validation requires governed data (§15).

---

# 13. Evaluation Plan & KPIs

## 13.1 KPI Targets (hypotheses on the **synthetic** benchmark — not claims about real upay performance)

| Area | KPI | Target |
|---|---|---|
| Detection | PR-AUC (time split, Lite) | ≥ 0.85 |
| Detection | PR-AUC on **held-out typology** | ≥ 0.70 |
| Detection | Recall @ 1% alert rate | ≥ 80% |
| Detection | Lift vs. rules-only baseline (recall @ same alert rate) | ≥ +25 pts |
| Customer friction | FPR on legitimate users at operating point | ≤ 0.5% |
| Customer friction | Share of legit txns shown Pause & Verify | ≤ 1.5% |
| Rings | Ring-member precision / recall | ≥ 85% / ≥ 75% (F1 ≥ 0.8) |
| Rings | Rings with ≥ 50% members found | ≥ 90% |
| Calibration | ECE | ≤ 0.05 |
| Scam Check | Macro-F1 on held-out scripts | ≥ 0.85 |
| Copilot | Claim-verification pass rate | ≥ 98% (fallback if fail) |
| Copilot | Analyst brief time vs. manual baseline (demo timing) | ≥ 5× faster |
| Recovery | Simulated recoverable share vs. no-trace baseline | ≥ 3× |
| Performance | Scoring p95 latency | ≤ 150 ms |
| Fairness | Max slice FPR ratio | ≤ 1.25 (or documented) |
| Behavior (simulated) | Cancellation uplift of best warning vs. no warning | Reported with 95% CI |

## 13.2 Evaluation Protocols
1. **Ablation table:** Rules-only → +ML tabular → +anomaly → +graph → +scam context → full. Shows the marginal value of each layer (proves AI > deterministic rules, a Guideline §13 checklist item).
2. **Generalization:** held-out typology + concept-drift period + adversary mode.
3. **Operational:** alert-budget curves; analyst workload simulation; cost-benefit at multiple thresholds.
4. **Business:** loss prevented, net benefit, recovery uplift (Section 16 formulas).
5. **Human factors:** ≥ 5 quick usability tests on the customer warning (comprehension and time), ≥ 2 mock-analyst runs on the console; record results honestly.
6. **Responsibility:** fairness slices, injection suite pass rate, audit-log tamper test.

## 13.3 Reporting Rules
- Always report time-split and group-split results, never random-split alone.
- Report uncertainty (CIs) and failure cases (a "where it fails" slide builds credibility).
- Keep a locked test set; report test only once at the end.
- Label synthetic assumptions on every chart footer.

---

# 14. Verification & Test Plan

| Level | What | Examples | Tool |
|---|---|---|---|
| Unit | Feature functions, rules, reason mapper, claim verifier | Velocity windows; rule precedence; number-extraction | pytest |
| Data | Schema, referential integrity, typology presence, PII lint, determinism by seed | Same seed ⇒ same hash; no real-format numbers | pytest + data checks |
| ML | Leakage, calibration, baseline comparisons, split integrity | Fails if feature uses future data; no ring_id overlap across splits | pytest |
| Integration | API contract, end-to-end flows | Send → score → warning → response log → case | pytest + Schemathesis-style |
| Performance | Latency and throughput | 1k concurrent score calls | Locust |
| Security | RBAC, rate limit, injection, audit tamper | Analyst cannot access admin; modified log detected | pytest / manual |
| Adversarial | Evasion, mass-report poisoning, injection | Adversary-mode dataset; 25 injection prompts | scripts |
| UX | Comprehension and timing | 5-user hallway test of Pause & Verify | manual |
| Demo | Full scripted run, 3 scenarios, offline mode | Rehearsed twice with network disabled | manual |

## 14.1 Acceptance Criteria (Definition of Done for the MUST set)

| # | Acceptance criterion | Linked FRs |
|---|---|---|
| AC-01 | `docker compose up` brings up API, DB, UI, MLflow; `make reproduce` regenerates headline metrics | NFR-MNT-02, ML-29 |
| AC-02 | A customer send triggers the correct tier of Pause & Verify in Bangla and English, within latency target | FR-M3-01, FR-M5-01..04 |
| AC-03 | Every score has reason codes, versions, and rule trace | FR-M3-03/06, FR-M9-02 |
| AC-04 | Ring Explorer displays ≥ 1 injected ring with correct members; ring becomes a case | FR-M7-03..11 |
| AC-05 | Copilot output passes the claim verifier; fallback works when LLM disabled | FR-M12-03..05 |
| AC-06 | Recovery trace shows downstream tree, current fund location and ranked holds | FR-M13-01..03 |
| AC-07 | Simulator sliders change KPIs consistently with offline evaluation | FR-M15-01/02 |
| AC-08 | Ablation, held-out typology and fairness results are produced and displayed | ML-22, ML-24, FR-M16-03 |
| AC-09 | Freeze/hold cannot occur without human approval; ring actions require four-eyes | FR-M10-04 |
| AC-10 | Injection suite and PII lint pass in CI | FR-M12-11, DR-05 |

---

# 15. Scalability, Integration & Post-Hackathon Path

## 15.1 Path from Prototype to Production (Guideline "Scale" step)

| Prototype element | Production evolution |
|---|---|
| Synthetic generator | Replace with governed, anonymized/aggregated upay data under data-sharing agreement; keep generator for testing/simulation |
| Feature cache | Real-time feature store (e.g., stream processor + low-latency store) |
| Nightly graph snapshot | Incremental/streaming graph updates; graph database or distributed graph processing |
| FastAPI sidecar | Horizontally scaled service behind gateway; async queue for case creation |
| Model registry | Formal MLOps: approvals, shadow/canary rollout, rollback |
| Rules YAML | Governed rules management with maker-checker workflow |
| Copilot | Private/approved LLM deployment, data-residency compliant, red-teamed |
| Audit log | Immutable storage integrated with compliance archives |

## 15.2 Integration Plan
1. **Shadow mode** (no customer impact): score live events, compare with analyst/fraud outcomes.
2. **Analyst-assist mode:** alerts and copilot briefs for the fraud team only.
3. **Soft customer friction** on a small, consented segment with A/B measurement.
4. **Broader rollout** with fairness and drift gates.
5. **Cross-institution intelligence** (privacy-preserving sharing of mule indicators) as a longer-term option.

## 15.3 Alignment with the Guideline's Post-Hackathon Pathway

| Stage | Astha deliverable |
|---|---|
| 1 Competition | Working prototype + pitch + evidence pack (ablation, simulator, fairness) |
| 2 Technical review | Architecture doc, model & data cards, security/threat model, reproducibility |
| 3 Business review | Impact model, ROI formulas, adoption path, regulatory alignment |
| 4 Controlled validation | Shadow-mode protocol, data requirements list, governance checklist |
| 5 POC | Analyst-assist deployment plan and success criteria |
| 6 Pilot assessment | KPI set: loss prevented, friction, recovery, fairness, adoption |
| 7 Next decision | Integrate / incubate / partner / close criteria |

## 15.4 Data Governance for Future Real Data
Minimum fields list; anonymization/pseudonymization approach; aggregation options for graph features; retention limits; access controls; fairness evaluation plan; label-quality audit; legal/regulatory review checkpoints.

---

# 16. Impact & Economics Model

## 16.1 Parametric Model (editable in the Simulator)

```
Fraud value at risk (V)         = Σ fraud txn amounts in period
Detection rate at threshold (d) = recall at chosen operating point
Intervention success (s)        = P(customer cancels | warned & fraud)     [from simulated A/B, documented]
Loss prevented (LP)             = V × d × s
Recovery gain (RG)              = Σ(stolen amount traced) × P(hold succeeds | time-to-action) × (1 − collateral penalty)
Friction cost (FC)              = N_legit_warned × c_friction
Analyst cost (AC)               = N_alerts × t_per_alert × c_analyst_minute
Net benefit                     = LP + RG − FC − AC − platform_cost
```

## 16.2 Illustrative Example (synthetic, per 1,000,000 transactions)
Assume fraud prevalence 0.5% (5,000 fraud txns), mean fraud amount ৳9,000 ⇒ V = ৳45M. At recall 80% and intervention success 60%: LP = 45M × 0.8 × 0.6 = ৳21.6M. If 1.2% of legit txns see Pause & Verify at a friction cost of ৳2 each ⇒ FC ≈ ৳23.7k. Analyst load at 0.5% alert rate = 5,000 alerts × 3 min × ৳4/min = ৳60k. Net benefit ≈ **৳21.5M** per million transactions *under these assumptions*. (Replace with simulator output in the pitch and state clearly that inputs are assumptions.)

## 16.3 Strategic Value for upay (non-financial)
- **Trust:** fraud fear is the top reason non-users stay away (E3); visible protection supports acquisition.
- **Regulatory readiness:** aligns with AI-monitoring directives and gambling-prevention obligations (E7).
- **Operational efficiency:** analysts focus on ranked, explained cases with verified briefs.
- **Ecosystem health:** agent protection and recovery improve merchant/agent confidence.
- **Differentiation:** a customer-visible safety brand beyond "payments".

---

# 17. Project Plan, Team & Risk Register

## 17.1 Suggested Roles (4–5 members; adapt)

| Role | Responsibilities |
|---|---|
| **Data & Simulation Lead** | Generator (M1), typologies, assumption register, splits, data cards |
| **ML Lead** | M2–M4, ML-01/02/05, evaluation, ablation, calibration |
| **Graph & GenAI Lead** | M7, M13, M12 (copilot + verifier), scam text (M6), radar (M14) |
| **Full-stack Engineer** | API, policy engine (M10), console (M11), customer app, Docker, CI |
| **Product/UX & Pitch Lead** | Bangla copy, UX tests, simulator UI, demo script, pitch deck, Q&A prep |

## 17.2 Scope Cut-Lines (protect the demo)

| Tier | Contents | Rule |
|---|---|---|
| **Tier 1 (MUST)** | M1 (core typologies), M2, M3, M4, M5 (Pause & Verify/Hold), M6 (basic), M7 (rings + explorer), M9, M10, M11, M12 (verified + fallback), M13 (trace), M15 (simulator), M16 (monitoring + fairness), M17 (audit/RBAC) | Must pass AC-01…AC-10 first |
| **Tier 2 (SHOULD)** | Agent Guard, community reports, verify-the-story prompt, friction optimizer, drift demo, counterfactuals, STR draft, Scam Radar | Add in the listed order by score gain per hour |
| **Tier 3 (COULD)** | GNN comparison, trusted-person confirm, TTS, champion/challenger, bulletin generator | Only if time remains; never at the expense of Tier 1 polish |

## 17.3 Phase Plan (percent of available time; scale to your actual hackathon length)

| Phase | % time | Outputs |
|---|---|---|
| P0 Frame & design | 8% | Logic chain, SRS freeze, repo + CI skeleton, task board |
| P1 Data world | 17% | Generator, typologies, splits, assumption register, data card |
| P2 Intelligence | 25% | Features, models, graph, ablation v1, reason codes |
| P3 Product | 28% | API, policy engine, customer app, console, copilot, recovery, simulator |
| P4 Hardening | 12% | Tests, fairness, injection suite, performance, offline mode |
| P5 Story | 10% | Pitch deck, demo rehearsals (×3), Q&A drills, README, video backup |

> *If you only have ~48 hours:* compress Tier 1 (Lite data, 6 typologies, ring explorer, copilot with verifier, simulator) and keep Tier 2 to Agent Guard + friction optimizer.

## 17.4 Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Synthetic data too easy/clean → inflated metrics, judges skeptical | M | H | Camouflage, label delay, drift, held-out typology, disclose assumptions |
| R2 | Scope creep | H | H | Cut-lines (§17.2), daily integration builds, feature freeze before P5 |
| R3 | LLM/API outage or latency on demo day | M | H | Template fallback, cached narratives, offline mode rehearsed |
| R4 | Bangla copy errors or unnatural phrasing | M | M | Native-speaker review, glossary, user test |
| R5 | Leakage bug inflates results | M | H | Point-in-time feature tests, group/time splits, locked test hash |
| R6 | Graph UI too slow/cluttered | M | M | Cap nodes, aggregate, precomputed layouts |
| R7 | Overclaiming (e.g., "stops fraud") | M | H | Wording discipline: "in simulation", CIs, honest limitations slide |
| R8 | Team bottleneck on one person | M | M | Pair on critical paths, shared module ownership |
| R9 | Fairness findings awkward | L | M | Present as a feature: detection + mitigation process |
| R10 | Judges see it as "just another fraud model" | M | H | Lead the demo with the Bangla intercept, ring reveal, verified copilot, recovery — not metrics first |

---

# 18. Demo, Pitch & Judge Q&A Playbook

## 18.1 Five-Minute Pitch Structure

| Time | Segment | Content |
|---|---|---|
| 0:00–0:30 | **Hook** | A midnight call: "your cousin in London lost his wife — send money now." Real pattern from Bangladeshi press. Only ~10.7% of reported fraud losses were recovered in 2025. |
| 0:30–1:00 | **Problem & stakes** | 1 in 10 users victimized (PRI), 32% of non-users cite fear, regulator now mandates AI monitoring. Fraud is both a harm and a growth brake. |
| 1:00–2:15 | **Live demo A — Intercept** | Customer app: send ৳18,500 to a new number at 11:41 pm → Bangla Pause & Verify with reasons → customer cancels → "You were protected." Show Scam Check on the scam text. |
| 2:15–3:15 | **Live demo B — Ring reveal & copilot** | Analyst console: the same recipient is 2 hops from Ring-12 → graph explorer reveals a gambling-style collector hub → Copilot brief (✔ 14/14 claims verified) → what / why / next. |
| 3:15–3:50 | **Live demo C — Golden hour** | Trace the money: where it is now, ranked hold candidates, simulated recovery vs. no-trace. Four-eyes approval required. |
| 3:50–4:30 | **Evidence** | Ablation (rules → full), held-out typology result, fairness slices, simulator showing loss prevented vs friction. "Where it fails" in one line. |
| 4:30–5:00 | **Path & ask** | Shadow mode → analyst-assist → controlled validation with governed upay data; human oversight throughout. |

## 18.2 Demo Safety Net
- Pre-recorded 90-second backup video.
- All demo scenarios seeded to deterministic cases (`demo_seed=42`).
- Offline mode tested; LLM responses cached.
- Two laptops with identical builds.

## 18.3 Anticipated Judge Questions

| Question | Strong answer (summary) |
|---|---|
| "Isn't this just synthetic data — how do we trust the numbers?" | We say so up front. We built harder-than-trivial data (camouflage, label delay, drift), test on a **held-out typology** and ring-group splits, show ablations versus rules, and provide a shadow-mode plan for real validation. We claim engineering evidence, not real-world performance. |
| "Why AI instead of rules?" | The ablation shows rules miss rings, novel patterns and scam language; AI adds measurable recall at the same alert budget. Rules still exist for hard policies — they are separate by design. |
| "What stops the LLM from hallucinating?" | It only sees structured evidence, must cite evidence IDs, and a claim-verifier checks every number/ID; failures regenerate or fall back to a template. LLM has no decision authority. |
| "What about false positives and customer friction?" | We measure FPR and the share of legit users warned; friction is reversible, time-boxed, and optimized by an uplift model. The Simulator shows the trade-off explicitly. |
| "Is it fair to rural or first-time users?" | Protected attributes aren't inputs; we audit slices, flag disparities, and document mitigation. We acknowledge real fairness needs governed data. |
| "Can fraudsters game it?" | Adversary-mode tests, behavioral and network features that are harder to fake, customer UI that hides scores, and drift monitoring. No system is perfect; we show the degradation numbers. |
| "Can it be abused (mass-reporting, enumeration)?" | Rate limits, trust-weighted reports, analyst confirmation, coarse badges. |
| "Would it integrate with a real MFS backend?" | Stateless REST sidecar, versioned contracts, idempotency, degraded mode; staged rollout from shadow mode. |
| "What is the business case?" | Loss prevention + recovery + analyst efficiency + trust/growth; parametric model with editable assumptions in the Simulator. |
| "Why Bangla-first?" | Reported victims skew toward users with less education; plain-language Bangla is the intervention. |
| "Does it make autonomous financial decisions?" | No. Customers can always proceed after a cooling-off; freezes/holds need analyst approval, ring actions need four-eyes. |
| "What is genuinely new?" | Intercept + ring discovery + verified copilot + recovery in one loop, with simulated-A/B friction optimization and a held-out-typology proof. |
| "Which Track?" | Track 01, extended into Tracks 05 (agents) and 06 (operations copilot) because the problem crosses them. |

## 18.4 Pitch Wording Discipline
Say "in simulation" and "under these assumptions"; never "eliminates fraud." Use ranges and confidence intervals. State one honest limitation proudly — it signals rigor.

---

# 19. Traceability Matrix (Requirements → Judging Rubric)

| Rubric criterion (weight) | What "good" looks like (guideline) | Our evidence | Key requirements |
|---|---|---|---|
| **Problem relevance (20%)** | Real, meaningful customer/business problem | Evidence table E1–E10, problem statement, Bangla-first, agent protection | §2, FR-M5, FR-M8 |
| **AI/ML depth (20%)** | AI is material and technically credible | Ensemble of supervised + anomaly + graph + text + uplift + grounded GenAI; ablation; held-out typology; calibration | §8, ML-20…29 |
| **Business/customer impact (20%)** | Clear, measurable value, plausible economics | KPI targets, simulator, recovery model, parametric ROI | §13, §16, FR-M13, FR-M15 |
| **Prototype quality (15%)** | Working end-to-end, not only slides | Customer app + analyst console + ring explorer + simulator, one-command run, offline mode | §6, §10, AC-01…10 |
| **Innovation (10%)** | Distinctive insight/differentiated idea | Intercept-before-loss, ring discovery, verified copilot, golden-hour recovery, friction optimizer, scam radar | §4 (D1–D12) |
| **Scalability & integration (10%)** | Believable path to real systems and data | Sidecar API, feature-store pattern, shadow mode, governance plan | §5, §9, §15 |
| **Responsible AI & security (5%)** | Privacy, explainability, fairness, safety | Responsible-AI matrix, threat model, fairness procedure, human oversight, audit log | §12, FR-M16/M17 |

---

# 20. Appendices

## Appendix A — Glossary of Reason-Code Families
Velocity · Novelty · Identity/Device · Network · Scam context · Agent · Behavioral drift · Policy/hard rule.

## Appendix B — Typology Catalogue (synthetic, injected and labeled)

| ID | Typology | Pattern signature in data | Difficulty levers |
|---|---|---|---|
| T1 | **Emergency-relative impersonation** | Late-hour call context → first-time large send to new wallet → rapid forward/cash-out | Amount near baseline; daytime variants |
| T2 | **OTP/PIN theft & account takeover** | New device + PIN reset/SIM-change + drain to new recipients | Slow drain; camouflage txns |
| T3 | **"Sent by mistake" refund scam** | Small unsolicited inbound, then request to send back; recipient chain | Amount thresholds; staging |
| T4 | **Prize/lottery & "ancient treasure" scam** | Many victims → one collector; small-to-mid amounts; rural skew | Victim count; amount spread |
| T5 | **Mule collector ring** | Fan-in from many wallets → short hold → fan-out to cash-out agents | Ring size; hop count; timing jitter |
| T6 | **Staged investment/task scam** *(held-out for testing)* | Small initial MFS deposits → escalation to larger transfers; periodic fake "returns" | Escalation speed; cross-channel flags |
| T7 | **Gambling hub** | Many small inbound payments from unrelated wallets, bursts aligned with event calendar, rapid onward cash-out | Synchrony strength; merchant disguise |
| T8 | **Agent-facilitated mule cash-out** | Agent with repeated cash-outs for ring-linked wallets; structured amounts; shared devices | Mix with legitimate traffic |
| T9 | **Synthetic-identity/ghost wallets** | Young accounts, shared devices, minimal normal behavior, immediate pass-through | Aging strategy; light camouflage |
| T10 *(optional)* | **Social-engineered APK/phishing link** | Session anomalies after app install; sudden device-bound drains | Stealth level |

## Appendix C — Reason-Code Catalogue (excerpt)

| Code | English | বাংলা (customer-safe) |
|---|---|---|
| RC01 | Large first-time send to a new recipient | নতুন প্রাপকের কাছে প্রথমবার বড় অঙ্কের টাকা |
| RC02 | Unusual hour for this user | এই ব্যবহারকারীর জন্য অস্বাভাবিক সময় |
| RC03 | New device + recent PIN reset | নতুন ডিভাইস ও সাম্প্রতিক পিন পরিবর্তন |
| RC04 | Recipient close to a flagged ring | প্রাপক সন্দেহজনক চক্রের কাছাকাছি |
| RC05 | Rapid pass-through of funds | টাকা দ্রুত অন্যত্র সরিয়ে নেওয়ার ধরন |
| RC06 | Many senders to one wallet (collector) | বহু ব্যক্তির কাছ থেকে একটি ওয়ালেটে টাকা জমা |
| RC07 | Message matches known scam script | বার্তাটি পরিচিত প্রতারণার ধরনের সঙ্গে মিলছে |
| RC08 | Agent behavior deviates from peers | এজেন্টের লেনদেন সমগোত্রীয়দের থেকে ভিন্ন |
| RC09 | Large share of balance being drained | ব্যালেন্সের বড় অংশ একসঙ্গে সরানো হচ্ছে |
| RC10 | Reports from other users | অন্য ব্যবহারকারীদের অভিযোগ আছে |
| RC11 | Burst aligned with event schedule (gambling proxy) | নির্দিষ্ট ইভেন্টের সময়ে হঠাৎ লেনদেন বৃদ্ধি |

> Customer-facing text never exposes internal thresholds, raw scores, or exact detection logic.

## Appendix D — Repository Structure (suggested)

```
astha/
├─ README.md  SRS.md  docs/ (architecture, model_card, data_card, runbook)
├─ data_gen/        # M1 generator, typologies, assumption register, splits
├─ features/        # shared feature definitions (train + serve parity)
├─ models/          # ml01..ml10, training, calibration, evaluation
├─ graph/           # graph build, communities, motifs, ring score, tracing
├─ genai/           # evidence pack, prompts, verifier, templates, injection tests
├─ policy/          # rules.yaml, policy_engine, tests
├─ api/             # FastAPI app, schemas, auth, audit
├─ ui/              # customer app, analyst console, simulator, monitoring
├─ eval/            # ablation, held-out typology, fairness, drift, reports
├─ tests/           # unit, integration, adversarial, performance
├─ infra/           # docker-compose, CI, Makefile
└─ demo/            # seeds, scripted scenarios, backup video, cached outputs
```

## Appendix E — Demo Scenarios (deterministic seeds)

| Scenario | Characters (fictional) | What the judges see |
|---|---|---|
| **A: Midnight emergency** | Customer *Rahima*, new recipient *W-SYN-091177* | Bangla Pause & Verify triggered by new recipient + 7× baseline + ring proximity; customer cancels; Scam Check flags the call-note text |
| **B: The collector hub** | *Ring-12*: 31 wallets, 3 agents, shared devices, burst synchrony with synthetic match schedule | Ring Explorer reveals structure invisible to per-account rules; ring becomes a compliance case |
| **C: Golden hour** | Victim transfer traced through 4 hops, ৳11,200 still in two wallets | Ranked hold candidates; four-eyes approval; simulated recovery uplift |
| **D: Evasion attempt** *(bonus)* | Adversary mode: slower, smaller transfers | Show degradation and how network features + baselines recover recall |
| **E: Injection attempt** *(bonus)* | Complaint text with "ignore previous instructions" | Copilot ignores, verifier passes, injection logged |

## Appendix F — Evidence Sources & Caveats

| Source (outlet / publisher) | Used for | Caveat |
|---|---|---|
| Bangladesh Bank data as reported by *The Financial Express* ("Fraudsters gobble up Tk 926m in 2025") | E1: 81,423 cases, ~Tk 926M losses, ~10.7% recovery | Reported cases only; true losses likely higher |
| PRI survey as reported by *The Daily Star* ("One in 10 MFS users victims of fraud") | E2, E3: 1 in 10 victims; ~30% unresolved; 32% of non-users cite fraud fear | Survey fielded in 2021; dated |
| TI Bangladesh, MFS governance study (executive summary) | E4: 6.3% users / 17% agents victimized; misuse for illicit flows | Survey-based; study period applies |
| TI Bangladesh figure on laundering via MFS in 2022 (as summarized in a Research Square preprint and press) | E4 context | Secondary reporting; treat as an estimate |
| Bangladesh Bank directives (Nov 2025) reported by *Daily Observer*, *UNB*, and others; and the notice on AI for gambling detection reported by *The Daily Star* | E7: AI-based monitoring mandate | Directive text not independently reviewed |
| *Gambling Prevention Act, 2026* (summary on public encyclopedia) | E7: law in force 1 July 2026; fake MFS/SIM coverage | Verify against the official gazette before quoting penalties |
| *Daily Observer* feature "Tk 21,000cr vanishes in MFS fraud" | E6: ghost-wallet networks, AI-assisted impersonation, emergency-relative scam example | Headline figure is an unnamed-analyst estimate — **do not use as a hard statistic** |
| Research preprint on investment-scam ecosystem in Bangladesh | E8: staged scam lifecycle | Preprint; not peer-reviewed |
| ACM paper on MFS users' adaptive behavior | E5 context: impersonation/PIN compromise share; unresolved complaints | Academic survey subset |
| Press on India's I4C–RBIH mule-detection MoU | E9 regional precedent | Different jurisdiction |
| Bangladesh Bank / press on MFS volumes and accounts | E10 scale | Account counts differ across reports (~146M vs ~239M); cite carefully |
| LinkedIn commentary on gambling flows and frozen accounts | Background only | **Unverified — excluded from pitch statistics** |

## Appendix G — Pre-Submission Checklist
- [ ] SRS frozen; scope cut-lines agreed
- [ ] Locked test set hash recorded; test touched once
- [ ] Ablation, held-out typology, adversary-mode, fairness, drift results exported
- [ ] Copilot verifier pass rate and injection suite results recorded
- [ ] Offline demo rehearsed ×3; backup video recorded
- [ ] Bangla copy reviewed by a native speaker
- [ ] README with 3-command quickstart; model card; data card; assumption register
- [ ] Pitch slides: ≤ 8, evidence-first footers ("synthetic data, assumptions in register")
- [ ] One honest "limitations & next steps" slide ready
- [ ] Every claim in the pitch traceable to Appendix F or to our own experiments

---

*End of SRS v1.0 — Astha (AI Hackathon 2026, Track 01 extended).*