// ───────────────────────────────────────────────────────────────────────────
// build.js — Astha deck, restyled onto the reference design system.
//
//   node build.js [out.pptx]
//
// Design system, decorative graphics and embedded fonts all come from
// Untitled_design.pptx (see kit.js and embed_fonts.py). Every figure in the
// copy was measured against the running system during end-to-end verification.
// ───────────────────────────────────────────────────────────────────────────
const pptxgen = require('pptxgenjs');
const K = require('./kit.js');
const D = require('./diagram.js');
const { C, F, T, L, ART } = K;

const OUT = process.argv[2] || 'out.pptx';

(async () => {
  const pres = new pptxgen();
  pres.defineLayout({ name: 'CANVA20', width: K.W, height: K.H });
  pres.layout = 'CANVA20';
  pres.author = 'Team Orbit';
  pres.company = 'Team Orbit';
  pres.title = 'Astha — Autonomous MFS Scam &amp; Fraud Defense Platform';
  pres.subject = 'UCB Fintech Hackathon';

  const H = (s, dark = true) => K.header(pres, s, { dark });

  // ═════════════════════════════ 1 — TITLE ═════════════════════════════
  pres.addSection({ title: 'Opening' });
  {
    const s = pres.addSlide({ sectionTitle: 'Opening' });
    s.background = { color: C.black };
    s.addImage({ path: ART.glowTitle, x: -7.63, y: -2.01, w: 15.27, h: 15.27, objectName: 'glow' });
    s.addImage({ path: ART.heroAsterisk, x: 10.11, y: 0.68, w: 9.89, h: 9.89, objectName: 'hero-asterisk' });
    H(s);

    // The brand mark, then the wordmark. One word, so a single hero line —
    // the reference's two-line stack was "Creative / Solutions".
    s.addImage({ path: ART.brandMark, x: 1.12, y: 1.95, w: 2.3, h: 2.3, objectName: 'astha-mark' });
    s.addText('Astha', {
      x: 1.07, y: 4.60, w: 13.39, h: 2.91,
      fontFace: F.head, fontSize: T.hero, color: C.light,
      align: 'left', valign: 'middle', margin: 0, isTextBox: true, objectName: 'hero',
    });
    s.addText('AUTONOMOUS MFS\nSCAM & FRAUD\nDEFENSE PLATFORM', {
      x: 1.24, y: 7.72, w: 5.35, h: 2.0,
      fontFace: F.display, fontSize: 33, color: C.light,
      align: 'left', valign: 'top', margin: 0, isTextBox: true,
      lineSpacingMultiple: 1.06, objectName: 'hero-sub',
    });
    s.addShape(pres.ShapeType.line, {
      x: -0.48, y: 9.75, w: 20.95, h: 0,
      line: { color: C.light, width: 0.75, transparency: 55 }, objectName: 'rule',
    });
    s.addText('Bangla scam interception  ·  mule-ring intelligence  ·  golden-hour recovery', {
      x: 1.12, y: 10.26, w: 11.5, h: 0.32,
      fontFace: F.display, fontSize: T.foot, color: C.light,
      align: 'left', valign: 'middle', margin: 0, isTextBox: true,
    });
    s.addText('Team Orbit  ·  UCB Fintech Hackathon', {
      x: 12.5, y: 10.26, w: 6.38, h: 0.32,
      fontFace: F.display, fontSize: T.foot, color: C.light,
      align: 'right', valign: 'middle', margin: 0, isTextBox: true,
    });
    s.addNotes('Astha is a working, end-to-end fraud and scam defence platform for mobile financial services in Bangladesh. Everything in this deck runs against a live Neon PostgreSQL database and was verified end to end.');
  }

  // ═════════════════════════════ 2 — AGENDA ═════════════════════════════
  {
    const s = K.lightSlide(pres, pres, { sectionTitle: 'Opening' });
    s.addImage({ path: ART.circles, x: 6.35, y: 0.95, w: 12.5, h: 16.49, objectName: 'circles' });
    H(s, false);
    s.addText('Agenda', {
      x: L.margin, y: 1.70, w: 12, h: 2.0,
      fontFace: F.head, fontSize: 135, color: C.ink,
      align: 'left', valign: 'middle', margin: 0, isTextBox: true, objectName: 'title',
    });

    const rows = [
      ['The problem we attack', 'Five roles, one system'],
      ['What the platform does', 'System architecture'],
      ['Decision engines', 'Scale and results'],
    ];
    const ys = [5.59, 7.18, 8.78];
    rows.forEach((pair, i) => {
      K.pillRow(pres, s, { x: 1.12, y: ys[i], text: pair[0], size: 36 });
      K.pillRow(pres, s, { x: 10.59, y: ys[i], text: pair[1], size: 36 });
    });
    [6.86, 8.45, 10.05].forEach((y) =>
      s.addShape(pres.ShapeType.line, {
        x: 1.12, y, w: 17.75, h: 0,
        line: { color: '9C9C9C', width: 0.75 }, objectName: 'sep',
      })
    );
  }

  // ═════════════════════════════ 3 — THE PROBLEM ═════════════════════════════
  pres.addSection({ title: 'The problem' });
  {
    const s = K.darkSlide(pres, pres, { glows: 'both', sectionTitle: 'The problem' });
    H(s);
    K.sectionTitle(s, 'The Problem', { y: 2.15, w: 9.0, size: 104 });
    K.asteriskBadge(pres, s, { x: 1.24, y: 8.30, d: 1.57 });

    s.addText(
      'In Bangladesh, mobile money is how tens of millions of people hold and move money. ' +
      'It is also where they get robbed — not by someone breaking encryption, but by someone ' +
      'calling them and talking them into sending the money themselves.',
      {
        x: 1.12, y: 4.15, w: 8.3, h: 2.9,
        fontFace: F.body, fontSize: 25, color: C.light,
        align: 'left', valign: 'top', margin: 0, isTextBox: true, lineSpacingMultiple: 1.24,
      }
    );

    const steps = [
      ['01   The call', '"I am from upay head office — your account will be blocked." The victim panics.'],
      ['02   The handover', 'An OTP is read out, or money is sent to "verify" the account.'],
      ['03   The layering', 'Funds land in a mule wallet and hop two or three more within minutes.'],
      ['04   The cash-out', 'Collected at an agent counter. After about an hour, it is gone.'],
    ];
    let cy = 2.15;
    steps.forEach((st, i) => {
      const r = K.card(pres, s, {
        x: 10.75, y: cy, w: 8.13, h: 1.72,
        head: st[0], body: st[1], name: `step-${i}`, headSize: 25, bodySize: 17,
      });
      cy = r.y + r.h + 0.32;
    });
    s.addNotes('The attack is social, not technical. The transaction is authorised by the genuine account holder, so classic fraud rules see nothing wrong.');
  }

  // ═════════════════════════════ 4 — WHY RULES MISS IT ═════════════════════════════
  {
    const s = K.darkSlide(pres, pres, { glows: 'bottom', sectionTitle: 'The problem' });
    H(s);
    s.addText('Why ordinary fraud rules miss it', {
      x: L.margin, y: 1.80, w: 17.75, h: 1.5,
      fontFace: F.display, fontSize: 84, color: C.orange,
      align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'title',
    });
    const stats = [
      ['60', 'MINUTES OF GOLDEN HOUR\nBEFORE CASH-OUT'],
      ['3', 'SCRIPTS ONE COMPLAINT\nARRIVES IN'],
      ['0', 'PAYMENT ANOMALIES WHEN\nTHE VICTIM AUTHORISES'],
    ];
    const cxs = [4.3, 10.0, 15.7];
    stats.forEach((st, i) => {
      K.statCircle(pres, s, { cx: cxs[i], y: 3.95, d: 3.3, value: st[0], label: '' });
      s.addText(st[1], {
        x: cxs[i] - 2.5, y: 7.62, w: 5.0, h: 1.3,
        fontFace: F.display, fontSize: 25, color: C.light,
        align: 'center', valign: 'top', margin: 0, isTextBox: true, lineSpacingMultiple: 1.06,
      });
    });
    s.addText(
      'The money leaves a real account, from a real device, with the real PIN. ' +
      'Nothing in the payment itself is anomalous — the anomaly is in the phone call that preceded it.',
      {
        x: 2.6, y: 9.45, w: 14.8, h: 0.9,
        fontFace: F.body, fontSize: 20, color: 'B9B9B9',
        align: 'center', valign: 'top', margin: 0, isTextBox: true, lineSpacingMultiple: 1.18,
      }
    );
  }

  // ═════════════════════════════ 5 — STATEMENT ═════════════════════════════
  {
    const s = pres.addSlide({ sectionTitle: 'The problem' });
    s.background = { color: C.black };
    s.addImage({ path: ART.heroAsterisk, x: 10.11, y: 0.68, w: 9.89, h: 9.89, objectName: 'hero-asterisk' });
    H(s);
    const lines = [
      ['We don’t just block', C.orange],
      ['transactions. We interrupt', C.light],
      ['the conversation that', C.orange],
      ['steals the money.', C.light],
    ];
    lines.forEach((ln, i) =>
      s.addText(ln[0], {
        x: 1.12, y: 5.56 + i * 1.13, w: 11.61, h: 1.17,
        fontFace: F.display, fontSize: T.statement, color: ln[1],
        align: 'left', valign: 'middle', margin: 0, isTextBox: true,
      })
    );
  }

  // ═════════════════════════════ 6 — FIVE ROLES ═════════════════════════════
  pres.addSection({ title: 'The platform' });
  {
    const s = K.lightSlide(pres, pres, { sectionTitle: 'The platform' });
    s.addImage({ path: ART.circles, x: 6.6, y: 1.9, w: 11.2, h: 14.78, objectName: 'circles' });
    H(s, false);
    s.addText('Five roles,\none system', {
      x: L.margin, y: 1.55, w: 9, h: 2.5,
      fontFace: F.head, fontSize: 96, color: C.ink,
      align: 'left', valign: 'middle', margin: 0, isTextBox: true,
      lineSpacingMultiple: 0.92, objectName: 'title',
    });
    const roles = [
      'The Listener  —  reads the conversation',
      'The Judge  —  scores the transaction',
      'The Coach  —  asks the customer, in Bangla',
      'The Investigator  —  checks claim vs records',
      'The Tracer  —  follows the money, against the clock',
    ];
    roles.forEach((r, i) =>
      K.pillRow(pres, s, { x: 8.3, y: 4.25 + i * 1.28, w: 10.57, h: 1.02, text: r, size: 26 })
    );
    s.addText(
      'Each role is a separate engine with its own tests and its own failure mode. ' +
      'The deterministic engines are the floor; the language model is an addition, never a dependency.',
      {
        x: L.margin, y: 8.25, w: 6.1, h: 2.0,
        fontFace: F.body, fontSize: 19, color: '434343',
        align: 'left', valign: 'top', margin: 0, isTextBox: true, lineSpacingMultiple: 1.2,
      }
    );
  }

  // ═════════════════════════════ 7 — WHAT IT DOES ═════════════════════════════
  {
    const s = K.darkSlide(pres, pres, { glows: 'bottom', sectionTitle: 'The platform' });
    H(s);
    K.asteriskBadge(pres, s, { x: 1.24, y: 1.55, d: 1.5 });
    K.sectionTitle(s, 'What It Does', { y: 4.95, w: 11.45, size: 104 });

    const cards = [
      ['BANGLA SCAM INTELLIGENCE', 'Detects authority impersonation, fake customer care, lottery and distress scripts across Bangla, Banglish and mixed text — rules first, model second.'],
      ['REAL-TIME RISK DECISIONING', 'Velocity, account-takeover, behavioural, temporal and mule-proximity signals resolve to one of five actions with a full rule trace.'],
      ['EVIDENCE-DRIVEN INVESTIGATION', 'Turns a free-form complaint into a structured claim, matches it to the ledger, and returns a three-state verdict — never a forced guess.'],
      ['GOLDEN-HOUR RECOVERY', 'Traverses downstream mule hops and ranks freeze actions against a live time-decay curve before cash-out completes.'],
    ];
    const pos = [[7.14, 1.45], [13.14, 1.45], [7.14, 6.75], [13.14, 6.75]];
    cards.forEach((c, i) =>
      K.card(pres, s, {
        x: pos[i][0], y: pos[i][1], w: 5.73, h: 3.3,
        head: c[0], body: c[1], name: `cap-${i}`, headSize: 25, bodySize: 18,
      })
    );
  }

  // ═════════════════════════════ 8 — DIVIDER ═════════════════════════════
  pres.addSection({ title: 'Architecture' });
  {
    const s = pres.addSlide({ sectionTitle: 'Architecture' });
    s.background = { color: C.black };
    s.addImage({ path: ART.glowDark, x: 12.37, y: -2.01, w: 15.27, h: 15.27, objectName: 'glow' });
    s.addImage({ path: ART.heroAsterisk, x: 12.6, y: 2.4, w: 7.0, h: 7.0, transparency: 25, objectName: 'hero' });
    H(s);
    s.addText('02', {
      x: L.margin, y: 3.5, w: 4, h: 1.2,
      fontFace: F.display, fontSize: 60, color: C.orange,
      align: 'left', valign: 'middle', margin: 0, isTextBox: true,
    });
    s.addText('System\nArchitecture', {
      x: L.margin, y: 4.8, w: 11.5, h: 3.4,
      fontFace: F.head, fontSize: 112, color: C.light,
      align: 'left', valign: 'middle', margin: 0, isTextBox: true,
      lineSpacingMultiple: 0.94, objectName: 'title',
    });
    s.addText('How the layers, the data flow and the decision engines fit together', {
      x: L.margin, y: 8.5, w: 11, h: 0.5,
      fontFace: F.body, fontSize: 24, color: 'A8A8A8',
      align: 'left', valign: 'middle', margin: 0, isTextBox: true,
    });
  }

  // ═════════════════════════════ 9 — D1 FOUR-LAYER ARCHITECTURE ═════════════
  {
    const s = K.lightSlide(pres, pres, { sectionTitle: 'Architecture' });
    H(s, false);
    D.title(s, 'Four-Layer Platform Architecture',
      'Channels feed one API surface; domain engines own the logic; intelligence and storage sit underneath.');

    const BX = 1.12, BW = 17.75, NX = 3.75;
    const COLW = 3.30, GAP = 0.26;
    const colX = (i) => NX + i * (COLW + GAP);           // 3.75 · 7.31 · 10.87 · 14.43 (ends 17.73)

    const bands = [
      { y: 3.00, h: 1.52, label: 'Layer 1', sub: 'Channels & interfaces' },
      { y: 4.72, h: 1.42, label: 'Layer 2', sub: 'Delivery & API surface' },
      { y: 6.34, h: 1.52, label: 'Layer 3', sub: 'Domain engines' },
      { y: 8.06, h: 2.00, label: 'Layer 4', sub: 'Intelligence & data' },
    ];
    bands.forEach((b) => D.band(pres, s, { x: BX, y: b.y, w: BW, h: b.h, label: b.label, sublabel: b.sub, labelW: 2.2 }));

    // L1 — channels
    const chans = [
      ['Customer App', 'React Native / web', 'smartphone'],
      ['USSD *268#', 'feature phone', 'phone'],
      ['Merchant QR', 'scan to pay', 'grid'],
      ['Agent Counter', 'cash in / out', 'store'],
    ];
    const ch = [];
    for (let i = 0; i < chans.length; i++) {
      ch.push(await D.node(pres, s, {
        x: colX(i), y: 3.26, w: COLW, h: 1.0,
        label: chans[i][0], sub: chans[i][1], ic: chans[i][2], fontSize: 15, name: `chan-${i}`,
      }));
    }

    // L2 — delivery
    const fe = await D.node(pres, s, {
      x: colX(0), y: 5.00, w: COLW * 2 + GAP, h: 0.9,
      label: 'Next.js 15 frontend', sub: '18 views  ·  /api/v1/* rewrite proxy', ic: 'monitor', fontSize: 16, name: 'fe',
    });
    const api = await D.node(pres, s, {
      x: colX(2), y: 5.00, w: COLW * 2 + GAP, h: 0.9, tone: 'accent',
      label: 'Express API — 21 routers, 97 endpoints',
      sub: 'security headers · CORS · rate limit · cache · persistence flush', ic: 'server', fontSize: 16, name: 'api',
    });

    // L3 — engines
    const engines = [
      ['Risk Engine', '5 signal families', 'sliders'],
      ['Bangla Scam NLP', 'rules + model', 'message'],
      ['Mule Graph', 'rings & corridors', 'share'],
      ['Investigation', '9-stage pipeline', 'search'],
    ];
    const en = [];
    for (let i = 0; i < engines.length; i++) {
      en.push(await D.node(pres, s, {
        x: colX(i), y: 6.60, w: COLW, h: 1.0, tone: 'dark',
        label: engines[i][0], sub: engines[i][1], ic: engines[i][2], fontSize: 15, name: `eng-${i}`,
      }));
    }

    // L4 — intelligence & data
    const llm = await D.node(pres, s, {
      x: colX(0), y: 8.52, w: 4.30, h: 1.15,
      label: 'Provider chain', sub: 'Gemini → OpenAI → Anthropic → rules', ic: 'cpu', fontSize: 15, name: 'llm',
    });
    const rag = await D.node(pres, s, {
      x: colX(0) + 4.56, y: 8.52, w: 4.30, h: 1.15,
      label: 'Retrieval corpus', sub: '33 docs · 80 chunks · cosine in-process', ic: 'layers', fontSize: 15, name: 'rag',
    });
    const db = await D.store(pres, s, {
      x: 13.35, y: 8.30, w: 2.05, h: 1.60, label: 'Neon Postgres', sub: 'pooled · 20 conns', name: 'db',
    });
    const aud = await D.store(pres, s, {
      x: 15.68, y: 8.30, w: 2.05, h: 1.60, label: 'Audit ledger', sub: 'SHA-256, append-only', ic: 'lock', name: 'audit',
    });

    // wiring — short, orthogonal, no long crossings
    ch.forEach((c, i) => D.edge(pres, s, c.b, { x: c.b.x, y: (i < 2 ? fe : api).y }, {}));
    D.edge(pres, s, fe.r, api.l, {});
    en.forEach((e, i) => D.edge(pres, s, { x: e.t.x, y: (i < 2 ? fe : api).y + fe.h }, e.t, {}));
    D.elbow(pres, s, en[1].b, llm.t, { axis: 'v', mid: 8.00, dash: 'dash', color: C.orange });
    D.elbow(pres, s, en[3].b, rag.t, { axis: 'v', mid: 7.92, dash: 'dash', color: C.orange });
    D.elbow(pres, s, en[0].b, db.t, { axis: 'v', mid: 8.00 });
    D.elbow(pres, s, en[2].b, aud.t, { axis: 'v', mid: 8.00 });

    D.legend(pres, s, 1.12, 10.42, [
      { color: C.orange, text: 'Accent = request entry point', w: 3.0 },
      { color: C.ink, text: 'Dark = domain engine', w: 2.4 },
      { color: D.EDGE, text: 'Solid = request path', w: 2.3 },
      { color: C.orange, text: 'Dashed = optional intelligence call', w: 3.6 },
    ]);
  }

  // ═════════════════════════════ 10 — D2 TRANSACTION FLOW ═════════════════════
  {
    const s = K.lightSlide(pres, pres, { sectionTitle: 'Architecture' });
    H(s, false);
    D.title(s, 'Transaction Risk Data Flow',
      'What happens between the customer tapping Send and the screen changing — the blocking path.');

    // Four wide columns with 1.4"+ gutters, so a connector label never has to
    // sit on top of a node.
    const X1 = 1.12, W1 = 3.40;   // ends  4.52
    const X2 = 5.95, W2 = 3.65;   // ends  9.60
    const X3 = 11.00, W3 = 3.25;  // ends 14.25
    const X4 = 15.62, W4 = 3.26;  // ends 18.88

    const head = (x, w, t) =>
      s.addText(t, {
        x, y: 2.95, w, h: 0.38, fontFace: F.display, fontSize: 15.5, color: C.orange,
        align: 'left', valign: 'middle', margin: 0, isTextBox: true,
      });
    head(X1, W1, 'INGESTION');
    head(X2, W2, 'FEATURE STORE');
    head(X3, W3, 'RISK ENGINE');
    head(X4, W4, 'ACTION & COACH');

    const ing = [
      ['Transaction', 'type · amount · channel', 'send'],
      ['Conversation', 'bn / banglish / en', 'message'],
      ['Device & session', 'device id · ATO signals', 'smartphone'],
      ['Recipient', 'wallet · trust history', 'userCheck'],
    ];
    const iN = [];
    for (let i = 0; i < ing.length; i++) {
      iN.push(await D.node(pres, s, {
        x: X1, y: 3.45 + i * 1.18, w: W1, h: 1.0,
        label: ing[i][0], sub: ing[i][1], ic: ing[i][2], fontSize: 14.5, name: `ing-${i}`,
      }));
    }

    const fs = await D.panel(pres, s, {
      x: X2, y: 3.45, w: W2, h: 3.25, tone: 'dark', label: 'Feature Store', ic: 'activity',
      labelSize: 19, bodySize: 13,
      body: 'velocity_count_1h / 24h\namount_zscore_user\nato_signal — SIM swap, new device\ntemporal — night / Eid / salary\nrecipient_newness',
      name: 'fs',
    });
    const graph = await D.node(pres, s, {
      x: X2, y: 7.00, w: W2, h: 1.05,
      label: 'Mule Graph', sub: 'ring proximity of the receiver', ic: 'share', fontSize: 15, name: 'graph',
    });

    const re = await D.node(pres, s, {
      x: X3, y: 3.45, w: W3, h: 1.95, tone: 'accent',
      label: 'Multi-Factor\nRisk Engine', sub: 'score · tier · rule trace', ic: 'sliders', fontSize: 19, name: 're',
    });
    const ladder = await D.node(pres, s, {
      x: X3, y: 5.90, w: W3, h: 2.15,
      label: 'Decision ladder', ic: 'target', fontSize: 15.5,
      body: 'ALLOW\nWARN\nPAUSE & VERIFY\nHOLD & ASSIST\nBLOCK',
      name: 'ladder',
    });

    const coach = await D.node(pres, s, {
      x: X4, y: 3.45, w: W4, h: 1.5, tone: 'dark',
      label: 'Human Scam Coach', sub: '1–4 Bangla questions, non-punitive', ic: 'users', fontSize: 15, name: 'coach',
    });
    const ans = await D.node(pres, s, {
      x: X4, y: 5.30, w: W4, h: 1.3,
      label: 'Customer answers', sub: 'become structured signals', ic: 'helpCircle', fontSize: 14.5, name: 'ans',
    });
    const safety = await D.node(pres, s, {
      x: X4, y: 6.95, w: W4, h: 1.3,
      label: 'Safety Mode', sub: 'tighter thresholds, reversible', ic: 'shield', fontSize: 14.5, name: 'safety',
    });

    // Durable writes sit along the bottom, under the engines they serve.
    const db = await D.store(pres, s, {
      x: 11.00, y: 8.75, w: 2.55, h: 1.55, label: 'Neon Postgres', sub: 'write-through commit', name: 'db2',
    });
    const au = await D.store(pres, s, {
      x: 15.62, y: 8.75, w: 2.55, h: 1.55, label: 'Audit ledger', sub: 'hash-chained', ic: 'lock', name: 'au2',
    });

    iN.forEach((n) => D.edge(pres, s, n.r, { x: X2, y: n.r.y }, {}));
    D.edge(pres, s, fs.r, re.l, { label: 'feature vector', labelW: 1.34, at: 0.5 });
    D.elbow(pres, s, graph.r, ladder.lAt(0.5), { axis: 'h', mid: (X2 + W2 + X3) / 2, label: 'ring risk', labelW: 1.3, labelDy: -0.3 });
    D.edge(pres, s, re.b, ladder.t, { color: C.orange });
    D.edge(pres, s, re.r, coach.l, { label: 'if risky', labelW: 1.0, at: 0.5 });
    D.edge(pres, s, coach.b, ans.t, {});
    D.edge(pres, s, ans.b, safety.t, {});
    D.elbow(pres, s, ans.l, re.rAt(0.75), { axis: 'h', mid: (X3 + W3 + X4) / 2, dash: 'dash', color: C.orange, label: 're-score', labelW: 1.4, labelDy: -0.3 });
    D.edge(pres, s, ladder.b, db.t, {});
    D.edge(pres, s, safety.b, au.t, {});

    D.note(s,
      'The response is not returned until the write has committed, and the read cache is dropped on commit — a client cannot read back a pre-write snapshot.',
      { y: 10.52 });
  }
  // ═════════════════════════════ 11 — D3 RISK SCORING ═════════════════════════
  {
    const s = K.lightSlide(pres, pres, { sectionTitle: 'Architecture' });
    H(s, false);
    D.title(s, 'Multi-Factor Risk Scoring Engine',
      'Five weighted signal families and a channel multiplier, every term traceable to a reason code.');

    const sigs = [
      ['Velocity', 'w1', 'count_1h · count_24h · burst', 'zap'],
      ['Account takeover', 'w2', 'SIM swap · new device · session age', 'key'],
      ['Behavioural anomaly', 'w3', 'amount z-score vs own history', 'trending'],
      ['Temporal context', 'w4', 'night hours · Eid / salary cycle', 'clock'],
      ['Mule-ring proximity', 'w5', 'graph distance to a known ring', 'share'],
    ];
    const sn = [];
    for (let i = 0; i < sigs.length; i++) {
      const y = 3.25 + i * 1.22;
      sn.push(await D.node(pres, s, {
        x: 1.12, y, w: 4.75, h: 1.0,
        label: sigs[i][0], sub: sigs[i][2], ic: sigs[i][3], fontSize: 15, name: `sig-${i}`,
      }));
      s.addText(sigs[i][1], {
        x: 5.95, y: y + 0.08, w: 0.62, h: 0.42,
        fontFace: F.display, fontSize: 16, color: C.orange,
        align: 'center', valign: 'middle', margin: 0, isTextBox: true,
      });
    }

    const eng = await D.panel(pres, s, {
      x: 7.30, y: 3.25, w: 5.30, h: 4.30, tone: 'dark',
      label: 'Risk Engine', ic: 'sliders', labelSize: 22,
      mono: 'risk = ( w1·V + w2·A + w3·B\n         + w4·T + w5·R ) × M',
      body: 'M = channel multiplier\n     APP 1.00 · USSD 1.15 · AGENT 1.20\n\nSafety Mode tightens the thresholds:\n     PAUSE_VERIFY   0.60 → 0.40\n     HOLD_ASSIST    0.85 → 0.65',
      bodySize: 12.5, name: 'engine',
    });

    const tiers = [
      ['ALLOW', '< 0.30', '1F8A4C'],
      ['WARN', '0.30 – 0.60', 'B98A00'],
      ['PAUSE & VERIFY', '0.60 – 0.85', C.orange],
      ['HOLD & ASSIST', '0.85 – 0.95', 'D2561E'],
      ['BLOCK', '≥ 0.95', 'B3261E'],
    ];
    const TX = 13.95;
    for (let i = 0; i < tiers.length; i++) {
      const y = 3.25 + i * 0.86;
      s.addShape(pres.ShapeType.roundRect, {
        x: TX, y, w: 4.93, h: 0.72, rectRadius: 0.07,
        fill: { color: 'FFFFFF' }, line: { color: tiers[i][2], width: 1.5 }, objectName: `tier-${i}`,
      });
      s.addShape(pres.ShapeType.ellipse, {
        x: TX + 0.22, y: y + 0.26, w: 0.2, h: 0.2,
        fill: { color: tiers[i][2] }, line: { color: tiers[i][2], width: 0 }, objectName: `tier-dot-${i}`,
      });
      s.addText(tiers[i][0], {
        x: TX + 0.58, y, w: 2.9, h: 0.72,
        fontFace: F.display, fontSize: 15.5, color: C.ink,
        align: 'left', valign: 'middle', margin: 0, isTextBox: true,
      });
      s.addText(tiers[i][1], {
        x: TX + 3.2, y, w: 1.5, h: 0.72,
        fontFace: F.body, fontSize: 12.5, color: '5F5F5F',
        align: 'right', valign: 'middle', margin: 0, isTextBox: true,
      });
    }

    sn.forEach((n) => D.edge(pres, s, n.r, { x: eng.x, y: n.r.y }, {}));
    D.edge(pres, s, { x: eng.x + eng.w, y: 5.05 }, { x: TX, y: 5.05 },
      { color: C.orange, width: 1.6, label: 'score + tier', labelW: 1.45, at: 0.5, labelDy: -0.3 });

    const trace = await D.node(pres, s, {
      x: 7.30, y: 7.95, w: 5.30, h: 1.15,
      label: 'Rule trace + Bangla / English reasons', sub: 'every term that fired, with its reason code', ic: 'fileText', fontSize: 14, name: 'trace',
    });
    D.edge(pres, s, eng.b, trace.t, { color: C.orange });

    D.note(s, 'Every decision is explainable: the trace names which terms fired, and the customer sees the reason in Bangla.');
  }

  // ═════════════════════════════ 12 — D4 EVIDENCE VERDICT ═════════════════════
  {
    const s = K.lightSlide(pres, pres, { sectionTitle: 'Architecture' });
    H(s, false);
    D.title(s, 'Evidence Verdict Decision Engine',
      'The verdict is decided by deterministic policy. A generative model never picks it.');

    // Column 1 — intake
    const CX1 = 1.12, CW1 = 3.55;
    const inp = await D.node(pres, s, {
      x: CX1, y: 3.15, w: CW1, h: 1.1, tone: 'accent',
      label: 'Customer complaint', sub: 'untrusted free text', ic: 'message', fontSize: 15, name: 'inp',
    });
    const guard = await D.node(pres, s, {
      x: CX1, y: 4.65, w: CW1, h: 1.2,
      label: 'Untrusted input guard', sub: '25 injection patterns · EN / BN / Banglish', ic: 'shield', fontSize: 14, name: 'guard',
    });
    const red = await D.node(pres, s, {
      x: CX1, y: 6.25, w: CW1, h: 1.2,
      label: 'Credential redaction', sub: 'PIN / OTP removed before storage', ic: 'key', fontSize: 14, name: 'red',
    });
    const claim = await D.node(pres, s, {
      x: CX1, y: 7.85, w: CW1, h: 1.2, tone: 'dark',
      label: 'Claim extraction', sub: 'amount · window · counterparty · denial', ic: 'search', fontSize: 14, name: 'claim',
    });

    // Column 2 — the policy decision
    const CX2 = 5.30, CW2 = 3.45;
    const dec1 = await D.decision(pres, s, {
      x: CX2, y: 3.35, w: CW2, h: 1.85, label: 'Falsifiable\ndiscriminator?', name: 'dec1', fontSize: 15,
    });
    const match = await D.node(pres, s, {
      x: CX2, y: 5.70, w: CW2, h: 1.35, tone: 'dark',
      label: 'Transaction matcher', sub: '7 weighted signals, normalised', ic: 'gitBranch', fontSize: 15, name: 'match',
    });
    const dec2 = await D.decision(pres, s, {
      x: CX2, y: 7.45, w: CW2, h: 1.85, label: 'Records\ncontradict?', name: 'dec2', fontSize: 15,
    });

    // Column 3 — the three verdicts
    const CX3 = 9.45, CW3 = 3.65;
    const vCon = await D.node(pres, s, {
      x: CX3, y: 3.35, w: CW3, h: 1.2,
      label: 'CONSISTENT', sub: 'records support the claim', ic: 'checkCircle', fontSize: 16, name: 'v1',
    });
    const vInc = await D.node(pres, s, {
      x: CX3, y: 5.65, w: CW3, h: 1.2,
      label: 'INCONSISTENT', sub: 'a checkable detail did not line up', ic: 'xCircle', fontSize: 16, name: 'v2',
    });
    const vIns = await D.node(pres, s, {
      x: CX3, y: 7.95, w: CW3, h: 1.2,
      label: 'INSUFFICIENT_DATA', sub: 'not enough evidence either way', ic: 'helpCircle', fontSize: 15, name: 'v3',
    });

    // Column 4 — what happens next
    const CX4 = 13.85, CW4 = 5.03;
    const hr = await D.node(pres, s, {
      x: CX4, y: 3.35, w: CW4, h: 1.5, tone: 'accent',
      label: 'Human-review policy', sub: '13 named triggers — campaign, graph, evidence conflict, golden hour, credential exposure, injection', ic: 'userCheck', fontSize: 16, name: 'hr',
    });
    const resp = await D.node(pres, s, {
      x: CX4, y: 5.40, w: CW4, h: 1.25,
      label: 'Safe response builder', sub: 'vetted deterministic templates only', ic: 'fileText', fontSize: 15, name: 'resp',
    });
    const val = await D.node(pres, s, {
      x: CX4, y: 7.05, w: CW4, h: 1.35, tone: 'dark',
      label: 'Response safety validator', sub: 'blocks PIN / OTP / card asks and refund, reversal or unblock promises', ic: 'lock', fontSize: 15, name: 'val',
    });
    const aud = await D.store(pres, s, {
      x: 15.35, y: 8.75, w: 2.0, h: 1.5, label: 'Audit', sub: 'decision provenance', ic: 'lock', name: 'aud3',
    });

    D.edge(pres, s, inp.b, guard.t, {});
    D.edge(pres, s, guard.b, red.t, {});
    D.edge(pres, s, red.b, claim.t, {});
    D.elbow(pres, s, claim.r, dec1.l, { axis: 'h', mid: CX2 - 0.32 });
    D.edge(pres, s, dec1.b, match.t, { arrow: 'none' });
    D.edge(pres, s, match.b, dec2.t, {});
    D.edge(pres, s, dec1.r, vCon.l, { color: '1F8A4C', label: 'yes', labelW: 0.7 });
    D.edge(pres, s, dec2.r, vInc.lAt(0.78), { color: 'B3261E', label: 'yes', labelW: 0.7, at: 0.42 });
    D.elbow(pres, s, dec2.b, vIns.l, { axis: 'v', mid: 9.05, color: 'B98A00', dash: 'dash', label: 'no', labelW: 0.7, labelDy: 0.35 });
    [vCon, vInc, vIns].forEach((v) => D.elbow(pres, s, v.r, hr.lAt(0.5), { axis: 'h', mid: 13.45 }));
    D.edge(pres, s, hr.b, resp.t, { color: C.orange });
    D.edge(pres, s, resp.b, val.t, { color: C.orange });
    D.edge(pres, s, val.b, aud.t, {});

    D.note(s,
      'A denial of authorisation against an existing transaction resolves to INSUFFICIENT_DATA plus mandatory human review — never to "customer fraud".',
      { y: 10.52, w: 13.0 });
  }

  // ═════════════════════════════ 13 — D5 MODEL CHAIN ═════════════════════════
  {
    const s = K.lightSlide(pres, pres, { sectionTitle: 'Architecture' });
    H(s, false);
    D.title(s, 'Language Model Chain & Failover',
      'The rule engine is the floor and always answers. The model is an addition, never a dependency.');

    const req = await D.node(pres, s, {
      x: 1.12, y: 3.30, w: 3.30, h: 1.1, tone: 'accent',
      label: 'Analysis request', sub: 'conversation or complaint', ic: 'send', fontSize: 15, name: 'req',
    });
    const rules = await D.node(pres, s, {
      x: 1.12, y: 4.95, w: 3.30, h: 1.5, tone: 'dark',
      label: 'Deterministic\nrule engine', sub: 'offline · auditable · test-covered', ic: 'lock', fontSize: 16, name: 'rules',
    });
    s.addText('ALWAYS RUNS FIRST', {
      x: 1.12, y: 6.58, w: 3.30, h: 0.34,
      fontFace: F.display, fontSize: 12.5, color: C.orange,
      align: 'center', valign: 'middle', margin: 0, isTextBox: true,
    });

    const PX = 5.10, PW = 7.10;
    D.band(pres, s, { x: PX - 0.28, y: 3.05, w: PW + 0.56, h: 4.55, label: 'Provider chain', sublabel: 'ordered · fixed time budget', labelW: 2.4 });
    const provs = [
      ['Gemini', 'gemini-3.5-flash  —  primary'],
      ['OpenAI', 'gpt-5.6-luna  —  failover'],
      ['Anthropic', 'failover'],
    ];
    const pn = [];
    for (let i = 0; i < provs.length; i++) {
      pn.push(await D.node(pres, s, {
        x: PX, y: 4.35 + i * 1.08, w: PW, h: 0.88,
        label: provs[i][0], sub: provs[i][1], ic: 'cpu', fontSize: 15, name: `prov-${i}`,
      }));
    }
    for (let i = 0; i < pn.length - 1; i++) {
      D.edge(pres, s, { x: PX + 1.1, y: pn[i].y + pn[i].h }, { x: PX + 1.1, y: pn[i + 1].y }, { color: 'B3261E' });
      s.addText('429 quota  ·  timeout  ·  503  ·  unusable JSON', {
        x: PX + 1.35, y: pn[i].y + pn[i].h - 0.02, w: 4.6, h: 0.24,
        fontFace: F.body, fontSize: 11, color: 'B3261E',
        align: 'left', valign: 'middle', margin: 0, isTextBox: true,
      });
    }

    const merge = await D.decision(pres, s, {
      x: 13.60, y: 3.20, w: 3.20, h: 1.75, label: 'Merge\ndirection?', name: 'merge', fontSize: 16,
    });
    const up = await D.node(pres, s, {
      x: 13.10, y: 5.25, w: 5.78, h: 1.0,
      label: 'Raises risk → accepted', sub: 'catches paraphrased, code-switched scripts', ic: 'trending', fontSize: 15, name: 'up',
    });
    const down = await D.node(pres, s, {
      x: 13.10, y: 6.50, w: 5.78, h: 1.0,
      label: 'Lowers risk → rejected', sub: 'a successful injection cannot talk the system down', ic: 'xCircle', fontSize: 15, name: 'down',
    });
    const only = await D.node(pres, s, {
      x: PX - 0.28, y: 7.95, w: PW + 0.56, h: 1.1,
      label: 'All providers failed → rules-only result', sub: 'the request still succeeds, and the response says why the model did not contribute', ic: 'checkCircle', fontSize: 15, name: 'only',
    });
    const log = await D.store(pres, s, {
      x: 15.60, y: 7.85, w: 2.3, h: 1.65, label: 'llm_invocations', sub: 'provider · latency · reason', ic: 'fileText', name: 'log',
    });

    D.edge(pres, s, req.b, rules.t, {});
    D.edge(pres, s, rules.r, { x: PX - 0.28, y: rules.c.y }, {});
    D.edge(pres, s, pn[0].r, merge.l, { color: '1F8A4C' });
    D.edge(pres, s, merge.b, { x: merge.b.x, y: up.y }, { color: '1F8A4C' });
    D.elbow(pres, s, merge.l, down.lAt(0.5), { axis: 'h', mid: 12.80, color: 'B3261E' });
    D.elbow(pres, s, { x: PX + 1.1, y: pn[2].y + pn[2].h }, only.t, { axis: 'v', mid: 7.70, color: 'B3261E', dash: 'dash' });
    D.elbow(pres, s, down.b, log.t, { axis: 'v', mid: 7.70 });

    D.note(s,
      'Observed live on a free-tier key: 22 requests served by the failover after Gemini returned 429 / 503 / timeout, 9 served by the primary, and the rest answered by the rule engine — every one a successful response.',
      { y: 10.35 });
  }

  // ═════════════════════════════ 14 — D6 SHARDED SCALE ═══════════════════════
  {
    const s = K.lightSlide(pres, pres, { sectionTitle: 'Architecture' });
    H(s, false);
    D.title(s, 'Division-Sharded Scale Model',
      'Risk scoring stays local to a division; only mule rings that genuinely cross divisions go national.');

    const nat = await D.node(pres, s, {
      x: 6.30, y: 3.05, w: 7.40, h: 1.25, tone: 'accent',
      label: 'National Mule-Ring Coordinator', sub: 'cross-division ring merge  ·  campaign federation', ic: 'globe', fontSize: 17, name: 'nat',
    });

    const shards = [
      ['Dhaka', 'highest volume · urban + peri-urban'],
      ['Chattogram', 'port corridor · agent-heavy'],
      ['Sylhet', 'remittance inflow · rural USSD'],
    ];
    const SX = [1.12, 7.44, 13.76];
    const SW = 5.12;
    for (let i = 0; i < shards.length; i++) {
      D.band(pres, s, { x: SX[i], y: 4.95, w: SW, h: 3.95, label: `Shard ${String.fromCharCode(65 + i)}`, sublabel: shards[i][0], labelW: 2.2 });
      const reg = await D.node(pres, s, {
        x: SX[i] + 0.22, y: 5.78, w: SW - 0.44, h: 1.0, tone: 'dark',
        label: `${shards[i][0]} Risk Engine`, sub: shards[i][1], ic: 'sliders', fontSize: 14.5, name: `sh-${i}`,
      });
      const camp = await D.node(pres, s, {
        x: SX[i] + 0.22, y: 6.92, w: SW - 0.44, h: 0.88,
        label: 'Campaign discovery', sub: 'division-local complaint clustering', ic: 'radio', fontSize: 13.5, name: `camp-${i}`,
      });
      await D.node(pres, s, {
        x: SX[i] + 0.22, y: 7.94, w: SW - 0.44, h: 0.82,
        label: 'Hot feature cache', sub: 'velocity + recipient trust, in region', ic: 'zap', fontSize: 13.5, name: `cache-${i}`,
      });
      D.edge(pres, s, reg.b, camp.t, {});
      D.elbow(pres, s, { x: SX[i] + SW / 2, y: 4.95 }, { x: nat.x + nat.w * (0.2 + i * 0.3), y: nat.y + nat.h },
        { axis: 'v', mid: 4.62, dash: 'dash', color: C.orange });
      D.elbow(pres, s, { x: SX[i] + SW / 2, y: 8.90 }, { x: 10.0 + (i - 1) * 0.85, y: 9.45 },
        { axis: 'v', mid: 9.15 });
    }

    await D.store(pres, s, {
      x: 8.70, y: 9.45, w: 2.60, h: 1.45, label: 'Neon PostgreSQL', sub: 'national master · durable writes', name: 'master',
    });

    s.addText(
      'Dashed = ring evidence promoted nationally when a wallet, device or agent links two divisions.\nEverything else stays in-region, so a Dhaka spike does not slow Sylhet.',
      {
        x: 1.12, y: 3.05, w: 4.9, h: 1.4,
        fontFace: F.body, fontSize: 14, color: '434343',
        align: 'left', valign: 'top', margin: 0, isTextBox: true, lineSpacingMultiple: 1.18,
      }
    );
  }

  // ═════════════════════════════ 15 — D7 OBSERVABILITY ═══════════════════════
  {
    const s = K.lightSlide(pres, pres, { sectionTitle: 'Architecture' });
    H(s, false);
    D.title(s, 'Observability & Evidence Trail',
      'Every engine reports what served a request, how long it took, and what it could not see.');

    const srcs = [
      ['Risk Engine', 'sliders'], ['Scam NLP', 'message'], ['Investigation', 'search'],
      ['Recovery', 'clock'], ['Campaigns', 'radio'],
    ];
    const SW2 = 3.35, GP = 0.25;
    const sn = [];
    for (let i = 0; i < srcs.length; i++) {
      sn.push(await D.node(pres, s, {
        x: 1.12 + i * (SW2 + GP), y: 3.10, w: SW2, h: 0.85, tone: 'dark',
        label: srcs[i][0], ic: srcs[i][1], fontSize: 15, name: `src-${i}`,
      }));
    }

    const cols = [
      {
        x: 1.12, w: 5.60, title: 'METRICS', sub: 'counters & latency',
        items: [
          ['/v1/metrics/summary', 'volume · alerts · rings · prevented loss', 'barChart'],
          ['/v1/investigations/metrics', 'verdict split · p50 / p95 · match rate', 'activity'],
          ['/v1/metrics/fairness · /drift', 'per-segment FPR · PSI drift per feature', 'users'],
        ],
      },
      {
        x: 7.20, w: 5.60, title: 'PROVENANCE', sub: 'what served this answer',
        items: [
          ['analysis_provenance', 'rules score and model score, side by side', 'eye'],
          ['/v1/intelligence/llm/invocations', 'provider · model · latency · fallback reason', 'cpu'],
          ['source availability', 'AVAILABLE / EMPTY / UNAVAILABLE', 'helpCircle'],
        ],
      },
      {
        x: 13.28, w: 5.60, title: 'EVIDENCE', sub: 'what was decided, and why',
        items: [
          ['/v1/audit/logs', 'append-only SHA-256 ledger of every action', 'lock'],
          ['reasoning chain', 'CLAIM → EVIDENCE → REASON → CONCLUSION', 'gitBranch'],
          ['/health/persistence', 'commit counters · durable row counts', 'database'],
        ],
      },
    ];

    for (const col of cols) {
      D.band(pres, s, { x: col.x, y: 4.55, w: col.w, h: 5.05 });
      s.addText(col.title, {
        x: col.x + 0.26, y: 4.75, w: col.w - 0.5, h: 0.38,
        fontFace: F.display, fontSize: 18, color: C.orange,
        align: 'left', valign: 'middle', margin: 0, isTextBox: true,
      });
      s.addText(col.sub, {
        x: col.x + 0.26, y: 5.12, w: col.w - 0.5, h: 0.3,
        fontFace: F.body, fontSize: 13, color: '636363',
        align: 'left', valign: 'middle', margin: 0, isTextBox: true,
      });
      for (let i = 0; i < col.items.length; i++) {
        await D.node(pres, s, {
          x: col.x + 0.26, y: 5.60 + i * 1.28, w: col.w - 0.52, h: 1.1,
          label: col.items[i][0], sub: col.items[i][1], ic: col.items[i][2], fontSize: 13.5,
          name: `obs-${col.title}-${i}`,
        });
      }
    }

    sn.forEach((n, i) => {
      const t = i < 2 ? cols[0] : i < 4 ? cols[1] : cols[2];
      D.elbow(pres, s, n.b, { x: t.x + t.w / 2, y: 4.55 }, { axis: 'v', mid: 4.25, dash: 'dash' });
    });

    D.note(s, '"Lookup failed" and "nothing found" are never the same value — the UI shows which one happened, and no evidence is invented to fill a gap.');
  }

  // ═════════════════════════════ 16 — D8 TWO LANES ═══════════════════════════
  {
    const s = K.lightSlide(pres, pres, { sectionTitle: 'Architecture' });
    H(s, false);
    D.title(s, 'Two Lanes: Hot Path and Deliberate Path',
      'Blocking a transfer and investigating a complaint have different deadlines, so they do not share a lane.');

    const LW = 3.18, LG = 0.26, LX = 5.30;

    s.addShape(pres.ShapeType.roundRect, {
      x: 1.12, y: 3.15, w: 17.75, h: 2.70, rectRadius: 0.04,
      fill: { color: 'FFF0E6' }, line: { color: C.orange, width: 1.5 }, objectName: 'lane1',
    });
    s.addText('LANE 1 — HOT PATH', {
      x: 1.42, y: 3.38, w: 3.7, h: 0.42,
      fontFace: F.display, fontSize: 18, color: C.orange,
      align: 'left', valign: 'middle', margin: 0, isTextBox: true,
    });
    s.addText('the customer is waiting', {
      x: 1.42, y: 3.80, w: 3.7, h: 0.32,
      fontFace: F.body, fontSize: 13, color: '8A4E28',
      align: 'left', valign: 'middle', margin: 0, isTextBox: true,
    });
    const hot = [
      ['Deterministic only', 'no network call on the blocking path', 'lock'],
      ['Feature store', 'indexed reads · composite + covering', 'zap'],
      ['Risk + ring lookup', 'in-process graph traversal', 'share'],
      ['Decision returned', 'before the model is ever consulted', 'target'],
    ];
    const hn = [];
    for (let i = 0; i < hot.length; i++) {
      hn.push(await D.node(pres, s, {
        x: LX + i * (LW + LG), y: 3.95, w: LW, h: 1.25,
        label: hot[i][0], sub: hot[i][1], ic: hot[i][2], fontSize: 14, name: `hot-${i}`,
      }));
    }
    for (let i = 0; i < hn.length - 1; i++) D.edge(pres, s, hn[i].r, hn[i + 1].l, { color: C.orange });

    s.addShape(pres.ShapeType.roundRect, {
      x: 1.12, y: 6.15, w: 17.75, h: 2.70, rectRadius: 0.04,
      fill: { color: 'FFFFFF', transparency: 38 }, line: { color: '6B6B6B', width: 1.25, dashType: 'dash' }, objectName: 'lane2',
    });
    s.addText('LANE 2 — DELIBERATE PATH', {
      x: 1.42, y: 6.38, w: 3.7, h: 0.42,
      fontFace: F.display, fontSize: 18, color: C.ink,
      align: 'left', valign: 'middle', margin: 0, isTextBox: true,
    });
    s.addText('an analyst is waiting, not a customer', {
      x: 1.42, y: 6.80, w: 3.7, h: 0.5,
      fontFace: F.body, fontSize: 13, color: '636363',
      align: 'left', valign: 'top', margin: 0, isTextBox: true, lineSpacingMultiple: 1.05,
    });
    const cold = [
      ['Model chain', 'fixed budget, then rules', 'cpu'],
      ['Retrieval', 'cosine over the embedded corpus', 'layers'],
      ['Investigation', 'claim · match · verdict · review', 'search'],
      ['Write-through commit', 'acknowledged only after commit', 'database'],
    ];
    const cn = [];
    for (let i = 0; i < cold.length; i++) {
      cn.push(await D.node(pres, s, {
        x: LX + i * (LW + LG), y: 6.95, w: LW, h: 1.25, tone: 'dark',
        label: cold[i][0], sub: cold[i][1], ic: cold[i][2], fontSize: 14, name: `cold-${i}`,
      }));
    }
    for (let i = 0; i < cn.length - 1; i++) D.edge(pres, s, cn[i].r, cn[i + 1].l, {});

    const measured = [
      ['p50', '402 ms', 'investigation, end to end'],
      ['p95', '8.4 s', 'when the model chain is used'],
      ['RAG', '< 1 ms', 'cosine, in-process at this corpus size'],
    ];
    measured.forEach((m, i) => {
      const x = 1.12 + i * 6.05;
      s.addShape(pres.ShapeType.roundRect, {
        x, y: 9.20, w: 5.65, h: 1.05, rectRadius: 0.06,
        fill: { color: 'FFFFFF' }, line: { color: C.ink, width: 1 }, objectName: `m-${i}`,
      });
      s.addText(m[0], {
        x: x + 0.28, y: 9.20, w: 1.0, h: 1.05,
        fontFace: F.display, fontSize: 15, color: '6B6B6B',
        align: 'left', valign: 'middle', margin: 0, isTextBox: true,
      });
      s.addText(m[1], {
        x: x + 1.22, y: 9.30, w: 2.0, h: 0.5,
        fontFace: F.head, fontSize: 23, color: C.orange,
        align: 'left', valign: 'middle', margin: 0, isTextBox: true,
      });
      s.addText(m[2], {
        x: x + 1.22, y: 9.76, w: 4.2, h: 0.36,
        fontFace: F.body, fontSize: 12, color: '5F5F5F',
        align: 'left', valign: 'middle', margin: 0, isTextBox: true,
      });
    });
  }

  // ═════════════════════════════ 17 — VERIFIED RESULTS ═══════════════════════
  pres.addSection({ title: 'Evidence' });
  {
    const s = K.darkSlide(pres, pres, { glows: 'bottom', sectionTitle: 'Evidence' });
    H(s);
    s.addText('Verified end to end', {
      x: L.margin, y: 1.70, w: 17.75, h: 1.35,
      fontFace: F.display, fontSize: 88, color: C.orange,
      align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'title',
    });
    s.addText('Against a live database with the model providers enabled — not a mocked run', {
      x: L.margin, y: 3.02, w: 17.75, h: 0.45,
      fontFace: F.body, fontSize: 21, color: 'A8A8A8',
      align: 'center', valign: 'middle', margin: 0, isTextBox: true,
    });

    const stats = [
      ['151', 'UNIT TESTS PASSING\nACROSS 14 SUITES'],
      ['97', 'API ENDPOINTS RETURNING\n200 + SUCCESS'],
      ['18', 'UI PAGES WITH ZERO\nCONSOLE ERRORS'],
    ];
    const cxs = [4.3, 10.0, 15.7];
    stats.forEach((st, i) => {
      K.statCircle(pres, s, { cx: cxs[i], y: 3.80, d: 2.80, value: st[0], label: '', valueSize: 80 });
      s.addText(st[1], {
        x: cxs[i] - 2.5, y: 6.90, w: 5.0, h: 1.1,
        fontFace: F.display, fontSize: 22, color: C.light,
        align: 'center', valign: 'top', margin: 0, isTextBox: true, lineSpacingMultiple: 1.06,
      });
    });

    const proofs = [
      'Bangla numerals parsed — ১৮,৫০০ → 18500, and দুপুর ২টায় → the correct afternoon window',
      'Prompt injection in English and Bangla detected, neutralised, escalated — and not obeyed',
      'A pasted PIN and OTP redacted, with the amount still read correctly as ৳9,500',
      'Cross-language retrieval — one incident in bn / banglish / en returns the same typology',
    ];
    proofs.forEach((p, i) =>
      s.addText(`—   ${p}`, {
        x: 2.4, y: 8.60 + i * 0.47, w: 15.5, h: 0.45,
        fontFace: F.body, fontSize: 17.5, color: C.light,
        align: 'left', valign: 'middle', margin: 0, isTextBox: true,
      })
    );
  }

  // ═════════════════════════════ 18 — RESPONSIBLE AI ═════════════════════════
  {
    const s = K.darkSlide(pres, pres, { glows: 'both', sectionTitle: 'Evidence' });
    H(s);
    K.asteriskBadge(pres, s, { x: 1.24, y: 1.55, d: 1.5 });
    K.sectionTitle(s, 'Built To Be Trusted', { y: 4.95, w: 17.0, size: 86 });

    const cards = [
      ['THE MACHINE NEVER DECIDES ALONE', 'A model can raise a risk score but never lower one. "Insufficient evidence" is a legitimate outcome, and the verdict itself is deterministic policy.'],
      ['UNTRUSTED INPUT STAYS DATA', 'Complaint text is never an instruction. Injection attempts in three languages are neutralised, recorded and escalated — they cannot move a verdict.'],
      ['NOTHING IRREVERSIBLE', 'Safety Mode, Pause & Verify and holds are all reversible. There are no permanent lockouts, and no customer is stranded by a false positive.'],
      ['FAIRNESS IS MEASURED', 'False-positive rates are tracked per segment — student, farmer, gig, salaried — and per district type, with PSI drift per feature.'],
    ];
    const pos = [[7.14, 1.45], [13.14, 1.45], [7.14, 6.75], [13.14, 6.75]];
    cards.forEach((c, i) =>
      K.card(pres, s, {
        x: pos[i][0], y: pos[i][1], w: 5.73, h: 3.3,
        head: c[0], body: c[1], name: `rai-${i}`, headSize: 25, bodySize: 18,
      })
    );
  }

  // ═════════════════════════════ 19 — CLOSE ══════════════════════════════════
  pres.addSection({ title: 'Close' });
  {
    const s = pres.addSlide({ sectionTitle: 'Close' });
    s.background = { color: C.black };
    s.addImage({ path: ART.glowDark, x: 12.37, y: -2.01, w: 15.27, h: 15.27, objectName: 'glow-r' });
    s.addImage({ path: ART.glowDark, x: -7.63, y: 3.62, w: 15.27, h: 15.27, objectName: 'glow-bl' });
    s.addImage({ path: ART.heroAsterisk, x: 0.5, y: 2.5, w: 7.8, h: 7.8, objectName: 'hero' });
    H(s);

    const lines = [
      ['Stop the transfer.', C.orange],
      ['Explain the scam.', C.light],
      ['Trace the money.', C.orange],
    ];
    lines.forEach((ln, i) =>
      s.addText(ln[0], {
        x: 9.0, y: 2.45 + i * 1.30, w: 9.88, h: 1.30,
        fontFace: F.display, fontSize: 72, color: ln[1],
        align: 'right', valign: 'middle', margin: 0, isTextBox: true,
      })
    );

    const rows = [
      ['Bangla-first by design', 'Detection, coaching and advisories in the language customers actually report in'],
      ['Degrades, never fails', 'No key, a bad key or a dead provider — every endpoint still answers on the rule engine'],
    ];
    rows.forEach((r, i) => {
      const y = 6.95 + i * 1.62;
      s.addShape(pres.ShapeType.roundRect, {
        x: 9.3, y, w: 9.58, h: 1.38, rectRadius: 0.1,
        fill: { color: C.white }, line: { color: C.white, width: 0 }, objectName: `cta-${i}`,
      });
      const bd = 0.9;
      s.addShape(pres.ShapeType.ellipse, {
        x: 8.92, y: y + (1.38 - bd) / 2, w: bd, h: bd,
        fill: { color: C.ink }, line: { color: C.ink, width: 0 }, objectName: `cta-disc-${i}`,
      });
      s.addImage({
        path: ART.asteriskOrange,
        x: 8.92 + 0.16, y: y + (1.38 - bd) / 2 + 0.16, w: bd - 0.32, h: bd - 0.32,
        objectName: `cta-ast-${i}`,
      });
      s.addText(r[0], {
        x: 10.15, y: y + 0.16, w: 8.4, h: 0.44,
        fontFace: F.display, fontSize: 23, color: C.ink,
        align: 'left', valign: 'middle', margin: 0, isTextBox: true,
      });
      s.addText(r[1], {
        x: 10.15, y: y + 0.63, w: 8.4, h: 0.6,
        fontFace: F.body, fontSize: 14.5, color: '4A4A4A',
        align: 'left', valign: 'top', margin: 0, isTextBox: true, lineSpacingMultiple: 1.08,
      });
    });

    s.addShape(pres.ShapeType.line, {
      x: -0.48, y: 10.0, w: 20.95, h: 0,
      line: { color: C.light, width: 0.75, transparency: 60 }, objectName: 'rule',
    });
    s.addText('Team Orbit', {
      x: 1.12, y: 10.42, w: 8, h: 0.34,
      fontFace: F.display, fontSize: T.foot, color: C.light,
      align: 'left', valign: 'middle', margin: 0, isTextBox: true,
    });
    s.addText('Astha  ·  UCB Fintech Hackathon', {
      x: 11.0, y: 10.42, w: 7.88, h: 0.34,
      fontFace: F.display, fontSize: T.foot, color: C.light,
      align: 'right', valign: 'middle', margin: 0, isTextBox: true,
    });
  }

  await pres.writeFile({ fileName: OUT });
  console.log('wrote', OUT);
})().catch((e) => {
  console.error('BUILD FAILED:', e);
  process.exit(1);
});
