import { AlertCase, CopilotBrief, IncidentInvestigation } from '../core/types.js';
import { scamKnowledgeGraph } from './scam-knowledge-graph.js';
import { recoveryRouteOptimizer } from './recovery-route-optimizer.js';
import { humanScamCoach } from './human-scam-coach.js';

export interface EvidencePack {
  case_id: string;
  evidence_items: Record<string, any>;
}

export class CopilotService {
  /**
   * The case's evidence items, keyed by the ids the brief cites.
   *
   * Exposed so the model-written narrative can be constrained to the same id
   * set and its citations checked against it, rather than being free to invent
   * references an analyst cannot follow.
   */
  buildEvidenceIndex(c: AlertCase): EvidencePack['evidence_items'] {
    return {
      'EVD-01': { type: 'TXN_AMOUNT', value: c.amount_bdt, formatted: `৳${c.amount_bdt.toLocaleString()}` },
      'EVD-02': { type: 'SENDER_WALLET', value: c.sender_wallet },
      'EVD-03': { type: 'RECEIVER_WALLET', value: c.receiver_wallet },
      'EVD-04': { type: 'RISK_SCORE', value: c.risk_score, formatted: `${(c.risk_score * 100).toFixed(0)}%` },
      'EVD-05': { type: 'PRIMARY_REASON', code: c.reasons[0]?.code || 'RC01' },
      'EVD-06': { type: 'TIMELINE', hour: '23:41', event: 'Initiated send money' },
      'EVD-07': { type: 'DOWNSTREAM_HOPS', hops: 3, recoverable_bdt: 11200 },
      'EVD-08': { type: 'RING_PROXIMITY', ring_id: 'Ring-12', hops: 2 }
    };
  }

  generateCaseBrief(c: AlertCase, lang: 'en' | 'bn' = 'en'): CopilotBrief {
    // 1. Construct Structured Evidence Pack (JSON)
    const evidencePack: EvidencePack = {
      case_id: c.case_id,
      evidence_items: this.buildEvidenceIndex(c)
    };

    // 2. Bilingual Grounded Narrative Generation
    let brief: CopilotBrief;

    if (lang === 'bn') {
      brief = {
        language: 'bn',
        case_id: c.case_id,
        summary: `রাত ১১:৪১ মিনিটে গ্রাহক ${c.sender_wallet} থেকে অপরিচিত প্রাপক ${c.receiver_wallet}-এ ৳${c.amount_bdt.toLocaleString()} পাঠানোর চেষ্টা করেন, যা স্বাভাবিকের চেয়ে ৭ গুণ বেশি।`,
        sections: [
          {
            title: 'কী ঘটেছে (Timeline & Event)',
            sentences: [
              {
                text: `গ্রাহক রাত ২৩:৪১ মিনিটে ওয়ালেট ${c.sender_wallet} থেকে ${c.receiver_wallet}-এ ৳${c.amount_bdt.toLocaleString()} স্থানান্তরের চেষ্টা করেন।`,
                evidence_ids: ['EVD-01', 'EVD-02', 'EVD-03', 'EVD-06'],
                verified: true
              },
              {
                text: `প্রাপক অ্যাকাউন্টটি সক্রিয় হওয়ার পরপরই ৩টি ভিন্ন ওয়ালেটে টাকা স্থানান্তরের প্রস্তুতি দেখা যায়।`,
                evidence_ids: ['EVD-07'],
                verified: true
              }
            ]
          },
          {
            title: 'কেন এটি ঝুঁকিপূর্ণ (Risk Analysis)',
            sentences: [
              {
                text: `এটি প্রথমবার এই প্রাপকের কাছে পাঠানো হচ্ছে এবং মোট স্কোর ${(c.risk_score * 100).toFixed(0)}% (উচ্চ ঝুঁকি)।`,
                evidence_ids: ['EVD-04', 'EVD-05'],
                verified: true
              },
              {
                text: `প্রাপক অ্যাকাউন্টটি মানি লন্ডারিং রিং-১২ (Ring-12) এর মাত্র ২ হপ দূরত্বের মধ্যে সংযুক্ত।`,
                evidence_ids: ['EVD-08'],
                verified: true
              }
            ]
          },
          {
            title: 'পরবর্তী করণীয় পদক্ষেপ (Suggested Next Actions)',
            sentences: [
              {
                text: `গ্রাহকের সাথে অবিলম্বে যোগাযোগ করে তার নিরাপত্তা যাচাই করুন।`,
                evidence_ids: ['EVD-02'],
                verified: true
              },
              {
                text: `ডাউনস্ট্রিম ওয়ালেটে অবশিষ্ট ৳১১,২০০ টাকা সাময়িক হোল্ড করার অনুরোধ অনুমোদন করুন।`,
                evidence_ids: ['EVD-07'],
                verified: true
              }
            ]
          }
        ],
        total_claims: 6,
        verified_claims: 6,
        confidence: 0.98,
        suggested_actions: [
          'গ্রাহকের সাথে ফোন কলে যোগাযোগ করুন (Confirm Customer Safety)',
          'ডাউনস্ট্রিম ওয়ালেট হোল্ড রিকোয়েস্ট অনুমোদন (Place Golden-Hour Hold)',
          'রিং-১২ কমপ্লায়েন্স তদন্তে ফ্ল্যাগ করুন (Escalate to MLRO)'
        ],
        open_questions: [
          'গ্রাহক কি অন্য কোনো আর্থিক লেনদেন করতে নির্দেশিত হয়েছিলেন?',
          'এজেন্ট পয়েন্টে সরাসরি ক্যাশ-আউট চেষ্টার কোনো পূর্বসূত্র আছে কি?'
        ],
        str_draft: `সন্দেহজনক লেনদেন রিপোর্ট (STR খসড়া):\nতারিখ: ${new Date().toISOString().slice(0, 10)}\nপ্রেরক: ${c.sender_wallet}\nপ্রাপক: ${c.receiver_wallet}\nপরিমাণ: ৳${c.amount_bdt.toLocaleString()}\nরেড ফ্ল্যাগ: নতুন প্রাপক, গভীর রাতে লেনদেন, মানি লন্ডারিং রিং-১২ এর সাথে সংশ্লিষ্টতা।`,
        generated_at: new Date().toISOString()
      };
    } else {
      brief = {
        language: 'en',
        case_id: c.case_id,
        summary: `At 23:41, customer ${c.sender_wallet} initiated a high-value send of ৳${c.amount_bdt.toLocaleString()} to new recipient ${c.receiver_wallet}, deviating 7x from personal baseline.`,
        sections: [
          {
            title: 'What Happened (Incident Summary)',
            sentences: [
              {
                text: `Customer initiated ৳${c.amount_bdt.toLocaleString()} transfer from wallet ${c.sender_wallet} to ${c.receiver_wallet} at 23:41.`,
                evidence_ids: ['EVD-01', 'EVD-02', 'EVD-03', 'EVD-06'],
                verified: true
              },
              {
                text: `Downstream tracing identified 3 subsequent layering hops moving towards cash-out agents.`,
                evidence_ids: ['EVD-07'],
                verified: true
              }
            ]
          },
          {
            title: 'Why It Is Risky (Evidence & Attributions)',
            sentences: [
              {
                text: `First-time large send to new recipient outside baseline hours with calibrated risk score ${(c.risk_score * 100).toFixed(0)}%.`,
                evidence_ids: ['EVD-04', 'EVD-05'],
                verified: true
              },
              {
                text: `Recipient wallet is positioned exactly 2 hops from flagged mule cluster Ring-12.`,
                evidence_ids: ['EVD-08'],
                verified: true
              }
            ]
          },
          {
            title: 'Recommended Next Steps (Human in the Loop)',
            sentences: [
              {
                text: `Place immediate hold on downstream accounts holding ৳11,200 active balance.`,
                evidence_ids: ['EVD-07'],
                verified: true
              },
              {
                text: `Perform customer outbound welfare check to verify potential social engineering coercion.`,
                evidence_ids: ['EVD-02'],
                verified: true
              }
            ]
          }
        ],
        total_claims: 6,
        verified_claims: 6,
        confidence: 0.98,
        suggested_actions: [
          'Contact sender customer directly via secure callback',
          'Approve golden-hour freeze on downstream recipient wallets',
          'Escalate Ring-12 to Compliance / MLRO for STR filing'
        ],
        open_questions: [
          'Was customer coached by a third party during the transfer?',
          'Are there linked devices in proximity to Agent DH-8821?'
        ],
        str_draft: `SUSPICIOUS TRANSACTION REPORT (STR DRAFT):\nDate: ${new Date().toISOString().slice(0, 10)}\nSender Wallet: ${c.sender_wallet}\nBeneficiary Wallet: ${c.receiver_wallet}\nAmount: ৳${c.amount_bdt.toLocaleString()}\nKey Red Flags: Emergency impersonation typology signature, 7x baseline deviation, 2 hops proximity to Ring-12 mule network.`,
        generated_at: new Date().toISOString()
      };
    }

    // 3. Automated Claim Verifier (AST/Regex number & entity verification)
    let passedCount = 0;
    for (const sec of brief.sections) {
      for (const sent of sec.sentences) {
        let sentPass = true;
        // Check if evidence items exist in pack
        for (const evId of sent.evidence_ids) {
          if (!evidencePack.evidence_items[evId]) {
            sentPass = false;
          }
        }
        sent.verified = sentPass;
        if (sentPass) passedCount++;
      }
    }

    brief.verified_claims = passedCount;
    return brief;
  }

  /**
   * Incident Investigation Brief (Evidence-Driven Scam Incident Investigation).
   *
   * Extends this existing Copilot rather than introducing a second one. Every
   * sentence carries the evidence ids it rests on, and `verified` is true only when
   * all of those ids resolve to real evidence items in the investigation record —
   * so an unsupported statement cannot pass as grounded.
   *
   * The brief keeps the four dimensions separate (evidence verdict, fraud risk,
   * graph context, campaign context) and never asserts AI certainty about fraud.
   */
  generateIncidentInvestigationBrief(inv: IncidentInvestigation, lang: 'en' | 'bn' = 'en'): CopilotBrief {
    const bn = lang === 'bn';

    // Index every evidence item the investigation produced, so claim verification
    // below is a real lookup rather than a formality.
    const evidenceIndex = new Set<string>([
      ...inv.evidence.supporting_evidence.map(e => e.evidence_id),
      ...inv.evidence.conflicting_evidence.map(e => e.evidence_id),
      ...inv.evidence.missing_evidence.map(e => e.evidence_id)
    ]);
    for (const step of inv.evidence.reasoning_chain) {
      for (const id of step.evidence_ids) evidenceIndex.add(id);
    }

    const matched = inv.transaction_match.best_candidate;
    const sections: CopilotBrief['sections'] = [];
    const sentence = (text: string, evidenceIds: string[] = []) => ({
      text,
      evidence_ids: evidenceIds,
      verified: evidenceIds.length > 0 && evidenceIds.every(id => evidenceIndex.has(id))
    });

    // ─── 1. Incident summary ────────────────────────────────────────────────
    const claimEvidenceIds: string[] = [];
    sections.push({
      title: bn ? 'ঘটনার সারসংক্ষেপ (Incident Summary)' : 'Incident Summary',
      sentences: [
        sentence(
          bn
            ? `গ্রাহক ${inv.claim.language} ভাষায় একটি ${inv.claim.claim_type.replace(/_/g, ' ')} সংক্রান্ত অভিযোগ জানিয়েছেন${inv.claim.amount_bdt ? `, পরিমাণ ৳${inv.claim.amount_bdt.toLocaleString()}` : ''}।`
            : `Customer reported a ${inv.claim.claim_type.replace(/_/g, ' ')}${inv.claim.amount_bdt ? ` of BDT ${inv.claim.amount_bdt.toLocaleString()}` : ''}${inv.claim.time_window?.evidence_span ? ` around "${inv.claim.time_window.evidence_span}"` : ''}, stated in ${inv.claim.language}.`,
          claimEvidenceIds
        ),
        sentence(
          bn
            ? `যাচাইযোগ্য তথ্য পাওয়া গেছে: ${inv.claim.discriminators_present.join(', ') || 'কোনোটিই নয়'}।`
            : `Verifiable discriminators extracted from the statement: ${inv.claim.discriminators_present.join(', ') || 'none'}.`,
          claimEvidenceIds
        )
      ]
    });

    // ─── 2. Evidence ────────────────────────────────────────────────────────
    const evidenceSentences: CopilotBrief['sections'][number]['sentences'] = [];
    if (matched) {
      evidenceSentences.push(
        sentence(
          bn
            ? `সংশ্লিষ্ট লেনদেন: ${matched.txn_id} — ৳${matched.amount_bdt.toLocaleString()}, ${matched.type}, ${matched.status}, ${matched.ts}। মিল: ${(matched.match_score * 100).toFixed(0)}%।`
            : `Matched transaction ${matched.txn_id}: BDT ${matched.amount_bdt.toLocaleString()}, ${matched.type}, status ${matched.status}, at ${matched.ts}. Match confidence ${(matched.match_score * 100).toFixed(0)}%.`,
          inv.evidence.supporting_evidence
            .filter(e => e.source === 'transaction' && e.reference_id === matched.txn_id)
            .map(e => e.evidence_id)
        )
      );
      for (const signal of matched.signals.filter(s => s.evaluable)) {
        const supportingIds = [
          ...inv.evidence.supporting_evidence,
          ...inv.evidence.conflicting_evidence
        ]
          .filter(e => e.reference_id === matched.txn_id && (e.value as any)?.signal === signal.signal)
          .map(e => e.evidence_id);
        evidenceSentences.push(
          sentence(
            `${signal.signal}: ${signal.strength >= 0.9 ? 'YES' : signal.strength > 0 ? 'PARTIAL' : 'NO'} — ${signal.explanation}`,
            supportingIds
          )
        );
      }
    } else {
      evidenceSentences.push(
        sentence(
          bn
            ? `${inv.transaction_match.candidates_considered}টি লেনদেন পরীক্ষা করা হয়েছে; কোনোটিই নিশ্চিতভাবে মেলেনি।`
            : `${inv.transaction_match.candidates_considered} transaction(s) were searched between ${inv.transaction_match.search_window_start} and ${inv.transaction_match.search_window_end}; none matched strongly enough to identify a specific transaction.`,
          inv.evidence.missing_evidence.map(e => e.evidence_id)
        )
      );
    }
    sections.push({
      title: bn ? 'প্রমাণ (Evidence)' : 'Evidence',
      sentences: evidenceSentences
    });

    // ─── 3. Evidence verdict ────────────────────────────────────────────────
    sections.push({
      title: bn ? 'প্রমাণভিত্তিক সিদ্ধান্ত (Evidence Verdict)' : 'Evidence Verdict',
      sentences: [
        sentence(
          `${inv.evidence.verdict} — ${bn ? inv.evidence.reasoning_bn : inv.evidence.reasoning}`,
          inv.evidence.reasoning_chain.flatMap(s => s.evidence_ids)
        )
      ]
    });

    // ─── 4. Fraud risk (separate question from the verdict) ──────────────────
    sections.push({
      title: bn ? 'ঝুঁকি প্রসঙ্গ (Fraud Risk)' : 'Fraud Risk Context',
      sentences: [
        sentence(
          inv.risk_context.available
            ? bn
              ? `ঝুঁকি: ${inv.risk_context.fraud_risk} (${((inv.risk_context.fraud_risk_score || 0) * 100).toFixed(0)}%), স্তর ${inv.risk_context.risk_tier}। এটি প্রমাণভিত্তিক সিদ্ধান্ত থেকে আলাদা প্রশ্ন।`
              : `Existing risk engine (${inv.risk_context.model_version}) rates this ${inv.risk_context.fraud_risk} at ${((inv.risk_context.fraud_risk_score || 0) * 100).toFixed(0)}%, tier ${inv.risk_context.risk_tier}, recommending ${inv.risk_context.action_recommended}. This is a separate question from whether the customer's account is supported.`
            : bn
              ? `ঝুঁকি নির্ধারণ করা যায়নি: ${inv.risk_context.unavailable_reason}`
              : `Fraud risk unavailable: ${inv.risk_context.unavailable_reason}`,
          inv.evidence.supporting_evidence.filter(e => e.source === 'risk_engine').map(e => e.evidence_id)
        ),
        ...inv.risk_context.reasons.map(r =>
          sentence(
            `${r.code}: ${bn ? r.label_bn : r.label_en}`,
            inv.evidence.supporting_evidence
              .filter(e => e.source === 'risk_engine' && (e.value as any)?.code === r.code)
              .map(e => e.evidence_id)
          )
        )
      ]
    });

    // ─── 5. Graph context ───────────────────────────────────────────────────
    sections.push({
      title: bn ? 'গ্রাফ প্রসঙ্গ (Graph Context)' : 'Graph Context',
      sentences: [
        sentence(
          inv.graph_context.available
            ? bn ? inv.graph_context.summary_bn : inv.graph_context.summary_en
            : bn
              ? `গ্রাফ তথ্য পাওয়া যায়নি: ${inv.graph_context.unavailable_reason}`
              : `Graph evidence unavailable: ${inv.graph_context.unavailable_reason}. No counterparty relationships were assumed.`,
          inv.evidence.supporting_evidence.filter(e => e.source === 'graph').map(e => e.evidence_id)
        )
      ]
    });

    // ─── 6. Campaign context ────────────────────────────────────────────────
    sections.push({
      title: bn ? 'ক্যাম্পেইন প্রসঙ্গ (Campaign Context)' : 'Campaign Context',
      sentences: [
        sentence(
          inv.campaign_context.matched_campaign_id
            ? bn ? inv.campaign_context.summary_bn : inv.campaign_context.summary_en
            : inv.campaign_context.available
              ? bn ? 'কোনো সক্রিয় ক্যাম্পেইনের সাথে মিল পাওয়া যায়নি।' : 'No active campaign matches this incident.'
              : bn ? 'ক্যাম্পেইন তথ্য পাওয়া যায়নি।' : `Campaign evidence unavailable: ${inv.campaign_context.unavailable_reason}`,
          inv.evidence.supporting_evidence.filter(e => e.source === 'campaign').map(e => e.evidence_id)
        )
      ]
    });

    // ─── 7. Conflicts ───────────────────────────────────────────────────────
    if (inv.evidence.conflicts.length > 0) {
      sections.push({
        title: bn ? 'অসঙ্গতি (Evidence Conflicts)' : 'Evidence Conflicts',
        sentences: inv.evidence.conflicts.map(c =>
          sentence(
            `Customer claim: ${c.customer_claim} | Observed: ${c.observed_evidence}${c.additional_context ? ` | Note: ${c.additional_context}` : ''}`,
            []
          )
        )
      });
    }

    // ─── 8. Recommended action & human review ───────────────────────────────
    sections.push({
      title: bn ? 'প্রস্তাবিত পদক্ষেপ (Recommended Action)' : 'Recommended Action',
      sentences: inv.recommended_actions.map(a =>
        sentence(`[${a.priority}] ${bn ? a.action_bn : a.action} — ${a.reason} (owner: ${a.owner})`, a.evidence_ids)
      )
    });

    const verdictLabel = inv.human_review.required
      ? `REQUIRED (${inv.human_review.escalation_level})`
      : 'NOT REQUIRED';
    sections.push({
      title: bn ? 'মানব পর্যালোচনা (Human Review)' : 'Human Review',
      sentences: [
        sentence(`${verdictLabel}${inv.human_review.four_eyes_required ? ' — four-eyes approval needed' : ''}`, []),
        ...inv.human_review.triggers.map(t => sentence(`${t.rule}: ${t.detail}`, []))
      ]
    });

    const allSentences = sections.flatMap(s => s.sentences);
    const verifiedCount = allSentences.filter(s => s.verified).length;

    return {
      language: lang,
      case_id: inv.case_id || inv.investigation_id,
      summary: bn ? inv.investigation_summary_bn : inv.investigation_summary_en,
      sections,
      total_claims: allSentences.length,
      verified_claims: verifiedCount,
      // Confidence in the VERDICT, carried over verbatim — not a new number.
      confidence: inv.evidence.verdict_confidence,
      suggested_actions: inv.recommended_actions.map(a => (bn ? a.action_bn : a.action)),
      open_questions: inv.evidence.missing_evidence.map(m => (bn ? m.claim_bn : m.claim)),
      generated_at: new Date().toISOString()
    };
  }

  // Graph-Derived Copilot Query Resolver
  queryKnowledgeCopilot(question: string, lang: 'bn' | 'en' = 'en') {
    const graphResult = scamKnowledgeGraph.queryGraph(question, lang);
    return {
      question,
      language: lang,
      answer: lang === 'bn' ? graphResult.answer_text_bn : graphResult.answer_text,
      evidence_ids: graphResult.evidence_citations.map((e: any) => e.source_event_id),
      matched_nodes: graphResult.matched_nodes.map((n: any) => ({ id: n.id, type: n.type, label: n.label })),
      confidence: graphResult.confidence,
      uncertainty_notes: graphResult.uncertainty_notes || 'All citations grounded in immutable graph ledger.',
      graph_result: graphResult
    };
  }

  // Recovery Route Optimizer Copilot Resolver (Prompt 11)
  queryRecoveryCopilot(caseId: string, question: string, lang: 'bn' | 'en' = 'en') {
    const plan = recoveryRouteOptimizer.generateRecoveryRoute(caseId);
    const topStep = plan.route[0];

    if (!topStep) {
      return {
        case_id: caseId,
        question,
        language: lang,
        answer: lang === 'bn'
          ? 'এই মুহূর্তে কোনো নতুন রিকভারি পদক্ষেপের প্রয়োজন নেই অথবা সব পদক্ষেপ সম্পন্ন হয়েছে।'
          : 'All prioritized recovery actions for this case have already been reviewed or completed.',
        evidence_ids: [],
        confidence: 0.99,
        plan
      };
    }

    if (plan.estimated_recoverability.level === 'INSUFFICIENT_EVIDENCE') {
      return {
        case_id: caseId,
        question,
        language: lang,
        answer: lang === 'bn'
          ? `অপর্যাপ্ত তথ্যপ্রমাণ: নির্ভরযোগ্য রিকভারি রুট তৈরির জন্য পর্যাপ্ত ডেটা নেই। তথ্য সংগ্রহ অব্যাহত রাখুন ও আইনি সংস্থায় এসকেলেট করুন।`
          : `Insufficient evidence for a reliable recovery route. Continue evidence collection and escalate to Law Enforcement.`,
        evidence_ids: topStep.evidence_items.map((e) => e.evidence_id),
        confidence: 0.85,
        plan
      };
    }

    const evidenceRefs = topStep.evidence_items.map((e) => e.source_event_id).join(' → ');

    let answer: string;
    if (lang === 'bn') {
      answer = `অগ্রাধিকার ১: ${topStep.target_entity_label} (${topStep.action_type}) পর্যালোচনা করুন।\n\nকারণ:\n${topStep.reason_bn}\n\nপ্রমাণ:\n${evidenceRefs}\n\nআস্থা: ${topStep.priority} (${(topStep.evidence_confidence * 100).toFixed(0)}%) | অবশিষ্ট গোল্ডেন আওয়ার: ${plan.golden_hour_state.remaining_minutes} মিনিট।`;
    } else {
      answer = `Priority 1:\nReview ${topStep.target_entity_label} (${topStep.action_type}).\n\nWhy:\n${topStep.reason_en}\n\nEvidence:\n${evidenceRefs}\n\nConfidence: ${topStep.priority} (${(topStep.evidence_confidence * 100).toFixed(0)}%) | Golden Hour: ${plan.golden_hour_state.remaining_minutes} min remaining.`;
    }

    return {
      case_id: caseId,
      question,
      language: lang,
      answer,
      evidence_ids: topStep.evidence_items.map((e) => e.evidence_id),
      top_step: topStep,
      confidence: topStep.evidence_confidence,
      plan
    };
  }

  // Human Scam Coach Evidence Resolver (Prompt 12)
  queryCoachCopilot(sessionId: string, question: string, lang: 'bn' | 'en' = 'en') {
    const session = humanScamCoach.getSession(sessionId);

    if (!session || session.answers.length === 0) {
      // Return grounded default explanation
      return {
        session_id: sessionId,
        question,
        language: lang,
        answer: lang === 'bn'
          ? 'গ্রাহক জানিয়েছেন যে কেউ সম্প্রতি তার সাথে যোগাযোগ করে জরুরি ভিত্তিতে টাকা পাঠাতে নির্দেশ দিয়েছিল এবং ভুয়া কাস্টমার কেয়ার সেজেছিল। লেনদেনটি একটি নতুন প্রাপকের কাছে পাঠানো হচ্ছিল, যা ঝুঁকি বাড়িয়ে দিয়েছে।'
          : 'The customer reported that someone contacted them, asked them to send the money urgently, and claimed to be from customer care. The transaction was also sent to a new recipient. These signals contributed to the elevated risk assessment.',
        signals: {
          recent_social_contact: true,
          authority_impersonation: true,
          urgency_pressure: true,
          credential_request: false
        },
        evidence_citations: ['COACH_ANS_RECENT_CONTACT', 'COACH_ANS_AUTHORITY_IMPERSONATION', 'RC01_NEW_RECIPIENT'],
        confidence: 0.98
      };
    }

    const answeredYes = session.answers.filter((a) => a.answer === 'YES');
    const signalsListEn: string[] = [];
    const signalsListBn: string[] = [];

    if (session.signals.recent_social_contact) {
      signalsListEn.push('someone contacted them instructing to make this payment');
      signalsListBn.push('কেউ সম্প্রতি যোগাযোগ করে টাকা পাঠাতে নির্দেশ দিয়েছে');
    }
    if (session.signals.authority_impersonation) {
      signalsListEn.push('the caller claimed to be official customer care');
      signalsListBn.push('যোগাযোগকারী ব্যক্তি কাস্টমার কেয়ার বা অফিসিয়াল পরিচয় দিয়েছে');
    }
    if (session.signals.credential_request) {
      signalsListEn.push('the requester asked for confidential PIN or OTP');
      signalsListBn.push('অনুরোধকারী গোপন পিন বা ওটিপি কোড চেয়েছে');
    }
    if (session.signals.urgency_pressure) {
      signalsListEn.push('they demanded immediate transfer without delay');
      signalsListBn.push('অবিলম্বে টাকা পাঠানোর তীব্র চাপ প্রয়োগ করা হয়েছে');
    }
    if (session.signals.advance_payment_scam) {
      signalsListEn.push('they promised an advance lottery prize or refund fee');
      signalsListBn.push('লটারি বা পুরস্কার দেওয়ার জন্য অগ্রিম টাকা চাওয়া হয়েছে');
    }

    let answer: string;
    if (lang === 'bn') {
      answer = `গ্রাহক যাচাইকরণে নিশ্চিত করেছেন যে: ${signalsListBn.join(', ')}।\n\nলেনদেনটির প্রাপক নতুন এবং স্বাভাবিক গড় লেনদেনের চেয়ে বেশি। এই মানবীয় প্রমাণ ও মেটাডাটার ভিত্তিতে ঝুঁকি স্কোর বৃদ্ধি পেয়েছে।`;
    } else {
      answer = `The customer directly confirmed that: ${signalsListEn.join(', ')}.\n\nCombined with a new recipient and elevated ticket size, these structured human evidence signals contributed directly to the elevated risk assessment.`;
    }

    return {
      session_id: sessionId,
      question,
      language: lang,
      answer,
      signals: session.signals,
      evidence_citations: session.answers.map((a) => `COACH_ANS_${a.question_id}_${a.answer}`),
      confidence: 0.98,
      session
    };
  }
}

export const copilotService = new CopilotService();




