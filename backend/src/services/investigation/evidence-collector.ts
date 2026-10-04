import {
  IncidentClaim,
  TransactionMatchResult,
  TransactionMatchCandidate,
  EvidenceItem,
  EvidenceSourceStatus,
  IncidentRiskContext,
  IncidentGraphContext,
  IncidentCampaignContext,
  IncidentTemporalContext,
  IncidentFraudRisk,
  Transaction
} from '../../core/types.js';
import { repository } from '../../db/repository.js';
import { featureStore } from '../feature-store.js';
import { riskEngine } from '../risk-engine.js';
import { scamKnowledgeGraph } from '../scam-knowledge-graph.js';
import { scamCampaignService } from '../scam-campaign-service.js';
import { temporalRiskIntelligence } from '../temporal-risk-intelligence.js';
import { complaintActionIntelligenceService } from '../complaint-action-intelligence.js';

/**
 * Evidence Collection.
 *
 * Pulls evidence from the EXISTING Astha intelligence services. It never
 * recomputes risk, never rebuilds the graph and never re-detects campaigns —
 * it queries them and records what came back, including what did NOT.
 *
 * Failure handling is the point of this module: every source reports an explicit
 * state (AVAILABLE / EMPTY / UNAVAILABLE / NOT_APPLICABLE). "Unavailable" and
 * "nothing found" are different facts and are never collapsed, so the UI can say
 * "graph evidence unavailable" instead of implying a clean counterparty.
 */

export interface CollectedEvidence {
  items: EvidenceItem[];
  source_status: EvidenceSourceStatus[];
  risk_context: IncidentRiskContext;
  graph_context: IncidentGraphContext;
  campaign_context: IncidentCampaignContext;
  temporal_context: IncidentTemporalContext;
  /** Downstream outbound hops from the counterparty, for the timeline. */
  downstream_transactions: Transaction[];
  /** True when sender and receiver had no prior transfer history. */
  counterparty_is_new: boolean;
}

let evidenceSeq = 0;
function nextEvidenceId(prefix: string): string {
  evidenceSeq = (evidenceSeq + 1) % 1_000_000;
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${String(evidenceSeq).padStart(4, '0')}`;
}

export class EvidenceCollector {
  async collect(
    claim: IncidentClaim,
    matchResult: TransactionMatchResult,
    context: {
      reporterWallet?: string;
      reportedAt?: string;
      /** Only the confidently matched transaction is used for risk scoring. */
      matchedTransaction?: TransactionMatchCandidate;
    }
  ): Promise<CollectedEvidence> {
    const items: EvidenceItem[] = [];
    const sourceStatus: EvidenceSourceStatus[] = [];
    const matched = context.matchedTransaction;
    const reportedAt = context.reportedAt || new Date().toISOString();

    // ─── 1. Transaction evidence ────────────────────────────────────────────
    const txnStart = performance.now();
    if (!matchResult.ledger_available) {
      sourceStatus.push({
        source: 'transaction',
        state: 'UNAVAILABLE',
        detail: matchResult.ledger_error || 'Transaction ledger could not be queried.',
        latency_ms: Number((performance.now() - txnStart).toFixed(1))
      });
      items.push({
        evidence_id: nextEvidenceId('EVD-TXN'),
        source: 'transaction',
        claim: 'Transaction ledger is unavailable, so no transaction evidence could be gathered.',
        claim_bn: 'লেনদেনের ডেটাবেস পাওয়া যায়নি, তাই লেনদেনভিত্তিক কোনো তথ্য সংগ্রহ করা যায়নি।',
        relevance: 'high',
        direction: 'neutral',
        confidence: 1,
        reason_codes: ['LEDGER_UNAVAILABLE', 'INSUFFICIENT_TRANSACTION_DATA']
      });
    } else if (matchResult.candidates_considered === 0) {
      sourceStatus.push({
        source: 'transaction',
        state: 'EMPTY',
        detail: `No transactions found between ${matchResult.search_window_start} and ${matchResult.search_window_end}.`,
        latency_ms: Number((performance.now() - txnStart).toFixed(1))
      });
      items.push({
        evidence_id: nextEvidenceId('EVD-TXN'),
        source: 'transaction',
        claim: 'No transactions exist for this account inside the searched window.',
        claim_bn: 'অনুসন্ধানের সময়সীমার মধ্যে এই অ্যাকাউন্টের কোনো লেনদেন পাওয়া যায়নি।',
        value: { window_start: matchResult.search_window_start, window_end: matchResult.search_window_end },
        relevance: 'high',
        direction: 'neutral',
        confidence: 1,
        reason_codes: ['INSUFFICIENT_TRANSACTION_DATA']
      });
    } else {
      sourceStatus.push({
        source: 'transaction',
        state: 'AVAILABLE',
        detail: `${matchResult.candidates_considered} transaction(s) searched; ${matchResult.candidates.length} scored above the weak-match threshold.`,
        latency_ms: Number((performance.now() - txnStart).toFixed(1))
      });

      if (matched) {
        // One evidence item per evaluable matching signal: this is the audit trail
        // behind the match, not a restatement of the conclusion.
        for (const signal of matched.signals) {
          if (!signal.evaluable) continue;
          items.push({
            evidence_id: nextEvidenceId('EVD-TXN'),
            source: 'transaction',
            reference_id: matched.txn_id,
            claim: signal.explanation,
            claim_bn: this.banglaForSignal(signal.signal, signal.strength, matched),
            value: { signal: signal.signal, strength: signal.strength, weight: signal.weight },
            relevance: signal.weight >= 0.2 ? 'high' : signal.weight >= 0.08 ? 'medium' : 'low',
            direction: signal.strength >= 0.9 ? 'supports' : signal.strength === 0 ? 'contradicts' : 'neutral',
            confidence: 1,
            observed_at: matched.ts,
            reason_codes: this.reasonCodesForSignal(signal.signal, signal.strength)
          });
        }
      } else {
        items.push({
          evidence_id: nextEvidenceId('EVD-TXN'),
          source: 'transaction',
          claim: `${matchResult.candidates_considered} transaction(s) were searched, but none matched the complaint strongly enough to identify a specific transaction.`,
          claim_bn: `${matchResult.candidates_considered}টি লেনদেন পরীক্ষা করা হয়েছে, কিন্তু কোনোটিই অভিযোগের সাথে নিশ্চিতভাবে মেলেনি।`,
          value: { candidates_considered: matchResult.candidates_considered },
          relevance: 'high',
          direction: 'neutral',
          confidence: 1,
          // Transactions DID exist; the gap is identification, not absence of data,
          // so INSUFFICIENT_TRANSACTION_DATA would misreport the situation.
          reason_codes: []
        });
      }
    }

    // Resolve the counterparty once. Both the risk read (ring proximity) and the
    // graph read need it, and both need the same ring/report lookups, so those are
    // fetched exactly once here and shared — previously each block queried them.
    const counterpartyId = matched
      ? (matched.sender_wallet === context.reporterWallet ? matched.receiver_wallet : matched.sender_wallet)
      : claim.counterparty_wallet;

    type SharedEntityIntel = {
      rings: Awaited<ReturnType<typeof repository.getRingsContainingEntity>>;
      reports: Awaited<ReturnType<typeof repository.getReportsForNumber>>;
      error?: string;
    };

    const sharedIntelPromise: Promise<SharedEntityIntel> = counterpartyId
      ? Promise.all([
          repository.getRingsContainingEntity(counterpartyId),
          repository.getReportsForNumber(counterpartyId)
        ])
          .then(([rings, reports]) => ({ rings, reports }))
          .catch((err: any) => ({ rings: [], reports: [], error: err?.message || 'unknown error' }))
      : Promise.resolve({ rings: [], reports: [] });

    // Downstream money-flow hops are only needed for the timeline, so the query is
    // started here and awaited at the very end — it overlaps the risk and graph reads
    // instead of adding a round trip after them.
    const downstreamPromise: Promise<Transaction[]> = matched && counterpartyId
      ? repository.getOutboundTransactionsAfter(counterpartyId, matched.ts, 20).catch((err: any) => {
          console.error('[evidence-collector] downstream hop lookup failed:', err?.message);
          return [] as Transaction[];
        })
      : Promise.resolve([]);

    // ─── 2. Risk evidence (EXISTING risk engine, never a second scorer) ─────
    const riskStart = performance.now();
    let riskContext: IncidentRiskContext = {
      available: false,
      unavailable_reason: 'No transaction was matched, so the risk engine had nothing concrete to score.',
      fraud_risk: null,
      fraud_risk_score: null,
      risk_tier: null,
      action_recommended: null,
      reasons: [],
      rule_trace: []
    };
    let counterpartyIsNew = false;

    if (matched && context.reporterWallet) {
      try {
        const senderWallet = matched.sender_wallet;
        const receiverWallet = matched.receiver_wallet;
        const msTsForLookups = new Date(matched.ts).getTime();

        // Everything the risk read needs, in one parallel batch rather than a chain
        // of awaits: the ledger row (for the device id), the feature store, and the
        // two point-in-time corrections below.
        const [ledgerTxn, hadPriorTransfer, counterpartyFlow] = await Promise.all([
          repository.getTransactionById(matched.txn_id),
          repository.hasPriorTransferBetweenBefore(senderWallet, receiverWallet, matched.ts),
          repository.getCounterpartyFlowWindow(
            receiverWallet,
            new Date(msTsForLookups - 3_600_000).toISOString(),
            new Date(msTsForLookups + 3_600_000).toISOString()
          )
        ]);

        const deviceId = ledgerTxn?.device_id || 'UNKNOWN_DEVICE';

        const features = await featureStore.extractFeatures(
          senderWallet,
          receiverWallet,
          matched.amount_bdt,
          deviceId,
          matched.ts,
          claim.scam_indicators.length > 0,
          (matched.channel as any) || 'APP'
        );

        // POINT-IN-TIME CORRECTION for retrospective scoring.
        //
        // The feature store is built for live scoring, where the transaction being
        // scored is not yet in the ledger. An investigation scores a transaction that
        // IS already recorded, so two features need correcting before the existing
        // risk engine sees them — otherwise the disputed transaction masks its own
        // signals. The risk engine itself is unchanged; only its inputs are made
        // as-of-the-event.
        features.is_new_recipient = !hadPriorTransfer;
        if (counterpartyFlow.inflowBdt > 0) {
          features.recipient_pass_through_ratio = Number(
            Math.min(1, counterpartyFlow.outflowBdt / counterpartyFlow.inflowBdt).toFixed(3)
          );
        }
        features.recipient_fan_in_1h = counterpartyFlow.distinctSenders;
        counterpartyIsNew = features.is_new_recipient;

        // Ring proximity is read from the shared ring lookup, not invented here.
        const sharedIntel = await sharedIntelPromise;
        const ringProximityRisk = sharedIntel.rings.length > 0
          ? Math.min(0.95, Math.max(...sharedIntel.rings.map(r => r.ring_score)))
          : 0;

        const evaluation = riskEngine.evaluateRisk(features, ringProximityRisk, false, undefined);

        riskContext = {
          available: true,
          fraud_risk: this.tierToFraudRisk(evaluation.risk_score, evaluation.risk_tier),
          fraud_risk_score: evaluation.risk_score,
          risk_tier: evaluation.risk_tier,
          action_recommended: evaluation.action_recommended,
          reasons: evaluation.reasons,
          rule_trace: evaluation.rule_trace,
          model_version: evaluation.model_version,
          rules_version: evaluation.rules_version
        };

        sourceStatus.push({
          source: 'risk_engine',
          state: 'AVAILABLE',
          detail: `Existing risk engine ${evaluation.model_version} scored the matched transaction.`,
          latency_ms: Number((performance.now() - riskStart).toFixed(1))
        });

        items.push({
          evidence_id: nextEvidenceId('EVD-RISK'),
          source: 'risk_engine',
          reference_id: matched.txn_id,
          claim: `Existing risk engine scored this transaction ${(evaluation.risk_score * 100).toFixed(0)}% (${evaluation.risk_tier}), recommending ${evaluation.action_recommended}.`,
          claim_bn: `বর্তমান ঝুঁকি ইঞ্জিন এই লেনদেনে ${(evaluation.risk_score * 100).toFixed(0)}% ঝুঁকি (${evaluation.risk_tier}) নির্ধারণ করেছে।`,
          value: { risk_score: evaluation.risk_score, tier: evaluation.risk_tier, model_scores: evaluation.model_scores },
          relevance: 'high',
          direction: 'neutral',
          confidence: 0.9,
          observed_at: matched.ts,
          reason_codes: evaluation.risk_score >= 0.6 ? ['HIGH_RISK_COUNTERPARTY'] : []
        });

        for (const reason of evaluation.reasons) {
          items.push({
            evidence_id: nextEvidenceId('EVD-RISK'),
            source: 'risk_engine',
            reference_id: matched.txn_id,
            claim: reason.label_en,
            claim_bn: reason.label_bn,
            value: { code: reason.code, weight: reason.weight },
            relevance: Math.abs(reason.weight) >= 0.3 ? 'high' : 'medium',
            direction: 'neutral',
            confidence: 0.85,
            observed_at: matched.ts,
            reason_codes: ['BEHAVIOR_ANOMALY']
          });
        }

        if (counterpartyIsNew) {
          items.push({
            evidence_id: nextEvidenceId('EVD-ACCT'),
            source: 'account',
            reference_id: receiverWallet,
            claim: `This is the first recorded transfer between ${senderWallet} and ${receiverWallet}.`,
            claim_bn: `${senderWallet} ও ${receiverWallet} এর মধ্যে এটিই প্রথম রেকর্ডকৃত লেনদেন।`,
            relevance: 'medium',
            direction: 'neutral',
            confidence: 1,
            reason_codes: ['NEW_COUNTERPARTY']
          });
        }
      } catch (err: any) {
        console.error('[evidence-collector] risk engine evidence failed:', err?.message);
        riskContext = {
          available: false,
          unavailable_reason: `Risk engine lookup failed: ${err?.message || 'unknown error'}`,
          fraud_risk: null,
          fraud_risk_score: null,
          risk_tier: null,
          action_recommended: null,
          reasons: [],
          rule_trace: []
        };
        sourceStatus.push({
          source: 'risk_engine',
          state: 'UNAVAILABLE',
          detail: riskContext.unavailable_reason!,
          latency_ms: Number((performance.now() - riskStart).toFixed(1))
        });
      }
    } else {
      sourceStatus.push({
        source: 'risk_engine',
        state: 'NOT_APPLICABLE',
        detail: riskContext.unavailable_reason!,
        latency_ms: Number((performance.now() - riskStart).toFixed(1))
      });
      items.push({
        evidence_id: nextEvidenceId('EVD-RISK'),
        source: 'risk_engine',
        claim: 'Risk context is unavailable because no specific transaction could be identified.',
        claim_bn: 'নির্দিষ্ট কোনো লেনদেন শনাক্ত না হওয়ায় ঝুঁকি প্রসঙ্গ পাওয়া যায়নি।',
        relevance: 'medium',
        direction: 'neutral',
        confidence: 1,
        reason_codes: ['RISK_CONTEXT_UNAVAILABLE']
      });
    }

    // ─── 3. Graph evidence ──────────────────────────────────────────────────
    const graphStart = performance.now();
    const graphContext = await this.collectGraphEvidence(counterpartyId, await sharedIntelPromise, items);
    sourceStatus.push({
      source: 'graph',
      state: graphContext.available
        ? (graphContext.linked_ring_ids.length > 0 || graphContext.community_report_count > 0 ? 'AVAILABLE' : 'EMPTY')
        : counterpartyId ? 'UNAVAILABLE' : 'NOT_APPLICABLE',
      detail: graphContext.available
        ? graphContext.summary_en
        : graphContext.unavailable_reason || 'No counterparty to look up.',
      latency_ms: Number((performance.now() - graphStart).toFixed(1))
    });

    // ─── 4. Campaign evidence ───────────────────────────────────────────────
    const campaignStart = performance.now();
    const campaignContext = this.collectCampaignEvidence(claim, counterpartyId, matched, items);
    sourceStatus.push({
      source: 'campaign',
      state: campaignContext.available
        ? (campaignContext.matched_campaign_id ? 'AVAILABLE' : 'EMPTY')
        : 'UNAVAILABLE',
      detail: campaignContext.available
        ? campaignContext.summary_en
        : campaignContext.unavailable_reason || 'Campaign intelligence unavailable.',
      latency_ms: Number((performance.now() - campaignStart).toFixed(1))
    });

    // ─── 5. Complaint evidence (prior reports of the same counterparty) ─────
    const complaintStart = performance.now();
    let complaintState: EvidenceSourceStatus['state'] = 'EMPTY';
    let complaintDetail = 'No prior complaints referenced this counterparty.';
    try {
      const priorComplaints = complaintActionIntelligenceService.getAllComplaints().filter(c => {
        if (!counterpartyId) return false;
        return (
          c.linked_recipient_wallet === counterpartyId ||
          c.extracted_entities.wallets.includes(counterpartyId) ||
          (claim.counterparty_phone ? c.extracted_entities.phone_numbers.includes(claim.counterparty_phone) : false)
        );
      });

      if (priorComplaints.length > 0) {
        complaintState = 'AVAILABLE';
        complaintDetail = `${priorComplaints.length} prior complaint(s) reference this counterparty.`;
        items.push({
          evidence_id: nextEvidenceId('EVD-CMP'),
          source: 'complaint',
          reference_id: counterpartyId,
          claim: `${priorComplaints.length} earlier complaint(s) in the system reference the same counterparty (${priorComplaints.slice(0, 3).map(c => c.complaint_id).join(', ')}).`,
          claim_bn: `সিস্টেমে আগের ${priorComplaints.length}টি অভিযোগে একই প্রাপকের উল্লেখ রয়েছে।`,
          value: { complaint_ids: priorComplaints.map(c => c.complaint_id) },
          relevance: 'high',
          direction: 'neutral',
          confidence: 0.85,
          reason_codes: ['KNOWN_SCAM_RECIPIENT']
        });
      }
    } catch (err: any) {
      complaintState = 'UNAVAILABLE';
      complaintDetail = `Complaint store lookup failed: ${err?.message || 'unknown error'}`;
    }
    sourceStatus.push({
      source: 'complaint',
      state: counterpartyId ? complaintState : 'NOT_APPLICABLE',
      detail: counterpartyId ? complaintDetail : 'No counterparty identified to cross-reference.',
      latency_ms: Number((performance.now() - complaintStart).toFixed(1))
    });

    // ─── 6. Temporal evidence ───────────────────────────────────────────────
    const temporalStart = performance.now();
    let temporalContext: IncidentTemporalContext = {
      available: false,
      summary_en: 'Temporal context unavailable.'
    };
    try {
      const anchorTs = matched?.ts || claim.time_window?.start_ts || reportedAt;
      const tc = temporalRiskIntelligence.getTemporalContext(anchorTs, 'salaried');
      temporalContext = {
        available: true,
        period_type: tc.period_type,
        period_name: tc.period_name,
        is_festival: tc.is_festival,
        is_salary_window: tc.is_salary_window,
        summary_en: `Incident falls in ${tc.period_name} (${tc.period_type}).`
      };
      if (tc.is_festival || tc.is_salary_window) {
        items.push({
          evidence_id: nextEvidenceId('EVD-TIME'),
          source: 'temporal',
          claim: `Incident occurred during ${tc.period_name}, a period with elevated legitimate transaction volume.`,
          claim_bn: `ঘটনাটি ${tc.period_name} সময়ে ঘটেছে, যখন স্বাভাবিক লেনদেনের পরিমাণ বেশি থাকে।`,
          value: { period_type: tc.period_type },
          relevance: 'low',
          direction: 'neutral',
          confidence: tc.confidence,
          observed_at: anchorTs,
          reason_codes: []
        });
      }
      sourceStatus.push({
        source: 'temporal',
        state: 'AVAILABLE',
        detail: temporalContext.summary_en,
        latency_ms: Number((performance.now() - temporalStart).toFixed(1))
      });
    } catch (err: any) {
      sourceStatus.push({
        source: 'temporal',
        state: 'UNAVAILABLE',
        detail: `Temporal intelligence lookup failed: ${err?.message || 'unknown error'}`,
        latency_ms: Number((performance.now() - temporalStart).toFixed(1))
      });
    }

    // ─── 7. Downstream money flow, for the incident timeline ────────────────
    const downstream = await downstreamPromise;

    return {
      items,
      source_status: sourceStatus,
      risk_context: riskContext,
      graph_context: graphContext,
      campaign_context: campaignContext,
      temporal_context: temporalContext,
      downstream_transactions: downstream,
      counterparty_is_new: counterpartyIsNew
    };
  }

  // ─── Graph ────────────────────────────────────────────────────────────────
  private async collectGraphEvidence(
    counterpartyId: string | undefined,
    sharedIntel: {
      rings: Array<{ ring_id: string; ring_name: string; ring_score: number; status: string }>;
      reports: Array<{ report_id: string; analyst_verified: boolean }>;
      error?: string;
    },
    items: EvidenceItem[]
  ): Promise<IncidentGraphContext> {
    if (!counterpartyId) {
      return {
        available: false,
        unavailable_reason: 'No counterparty was identified, so no graph lookup was possible.',
        linked_ring_ids: [],
        linked_ring_names: [],
        community_report_count: 0,
        connected_campaign_ids: [],
        associated_complaint_count: 0,
        suspicious_device_count: 0,
        downstream_hop_count: 0,
        summary_en: 'Graph evidence not applicable: no counterparty identified.',
        summary_bn: 'কোনো প্রাপক শনাক্ত না হওয়ায় গ্রাফ তথ্য প্রযোজ্য নয়।'
      };
    }

    try {
      // A failure in the shared ring/report lookup is an outage, not an empty result,
      // and is surfaced through this method's own degradation path below.
      if (sharedIntel.error) {
        throw new Error(sharedIntel.error);
      }
      const { rings, reports } = sharedIntel;

      // Knowledge-graph evidence pack is best-effort: the graph is seeded with a
      // subset of entities, so a miss is "nothing recorded", not a failure.
      let pack: ReturnType<typeof scamKnowledgeGraph.generateCopilotEvidencePack> | null = null;
      try {
        pack = scamKnowledgeGraph.generateCopilotEvidencePack(counterpartyId);
      } catch {
        pack = null;
      }

      const ringIds = rings.map(r => r.ring_id);
      const ringNames = rings.map(r => r.ring_name);
      const campaignIds = (pack?.connected_campaigns || []).map(c => c.campaign_id);
      const complaintCount = pack?.associated_complaints?.length || 0;
      const deviceCount = pack?.suspicious_devices?.length || 0;
      const hopCount = pack?.fund_flow_trail?.length || 0;

      if (rings.length > 0) {
        items.push({
          evidence_id: nextEvidenceId('EVD-GRAPH'),
          source: 'graph',
          reference_id: counterpartyId,
          claim: `Counterparty ${counterpartyId} appears in ring case(s) ${ringNames.join(', ')}.`,
          claim_bn: `প্রাপক ${counterpartyId} চিহ্নিত চক্রের (${ringNames.join(', ')}) সদস্য হিসেবে পাওয়া গেছে।`,
          value: { ring_ids: ringIds, ring_scores: rings.map(r => r.ring_score) },
          relevance: 'high',
          direction: 'neutral',
          confidence: 0.9,
          reason_codes: ['GRAPH_CLUSTER_MATCH']
        });
      }

      if (reports.length > 0) {
        items.push({
          evidence_id: nextEvidenceId('EVD-GRAPH'),
          source: 'graph',
          reference_id: counterpartyId,
          claim: `${reports.length} community report(s) were previously filed against ${counterpartyId}.`,
          claim_bn: `${counterpartyId} এর বিরুদ্ধে আগে ${reports.length}টি কমিউনিটি অভিযোগ জমা পড়েছে।`,
          value: { report_ids: reports.map(r => r.report_id), verified: reports.filter(r => r.analyst_verified).length },
          relevance: 'high',
          direction: 'neutral',
          confidence: 0.9,
          reason_codes: ['KNOWN_SCAM_RECIPIENT']
        });
      }

      const summaryParts: string[] = [];
      if (rings.length > 0) summaryParts.push(`${rings.length} ring link(s)`);
      if (reports.length > 0) summaryParts.push(`${reports.length} community report(s)`);
      if (campaignIds.length > 0) summaryParts.push(`${campaignIds.length} campaign link(s)`);
      if (hopCount > 0) summaryParts.push(`${hopCount} recorded fund-flow hop(s)`);

      return {
        available: true,
        counterparty_id: counterpartyId,
        linked_ring_ids: ringIds,
        linked_ring_names: ringNames,
        community_report_count: reports.length,
        connected_campaign_ids: campaignIds,
        associated_complaint_count: complaintCount,
        suspicious_device_count: deviceCount,
        downstream_hop_count: hopCount,
        summary_en: summaryParts.length > 0
          ? `Counterparty ${counterpartyId}: ${summaryParts.join(', ')}.`
          : `No graph relationships are recorded for ${counterpartyId}.`,
        summary_bn: summaryParts.length > 0
          ? `প্রাপক ${counterpartyId} এর গ্রাফ সংযোগ পাওয়া গেছে।`
          : `${counterpartyId} এর কোনো গ্রাফ সম্পর্ক রেকর্ডে নেই।`
      };
    } catch (err: any) {
      console.error('[evidence-collector] graph evidence failed:', err?.message);
      items.push({
        evidence_id: nextEvidenceId('EVD-GRAPH'),
        source: 'graph',
        reference_id: counterpartyId,
        claim: 'Graph intelligence is unavailable for this incident. No graph relationships were assumed.',
        claim_bn: 'এই ঘটনার জন্য গ্রাফ ইন্টেলিজেন্স পাওয়া যায়নি। কোনো সম্পর্ক অনুমান করা হয়নি।',
        relevance: 'medium',
        direction: 'neutral',
        confidence: 1,
        reason_codes: ['GRAPH_UNAVAILABLE']
      });
      return {
        available: false,
        unavailable_reason: `Graph lookup failed: ${err?.message || 'unknown error'}`,
        counterparty_id: counterpartyId,
        linked_ring_ids: [],
        linked_ring_names: [],
        community_report_count: 0,
        connected_campaign_ids: [],
        associated_complaint_count: 0,
        suspicious_device_count: 0,
        downstream_hop_count: 0,
        summary_en: 'Graph evidence unavailable.',
        summary_bn: 'গ্রাফ তথ্য পাওয়া যায়নি।'
      };
    }
  }

  // ─── Campaign ─────────────────────────────────────────────────────────────
  /**
   * Reuses the EXISTING Scam Campaign Intelligence service. Matching is on real
   * campaign records — entity overlap first (strongest), then narrative concept
   * overlap scored by the campaign service's own similarity function.
   */
  private collectCampaignEvidence(
    claim: IncidentClaim,
    counterpartyId: string | undefined,
    matched: TransactionMatchCandidate | undefined,
    items: EvidenceItem[]
  ): IncidentCampaignContext {
    const base: IncidentCampaignContext = {
      available: true,
      match_basis: [],
      within_campaign_window: false,
      summary_en: 'No active campaign matches this incident.',
      summary_bn: 'এই ঘটনার সাথে মিলে যাওয়া কোনো সক্রিয় ক্যাম্পেইন নেই।'
    };

    try {
      const campaigns = scamCampaignService.getAllCampaigns();
      if (campaigns.length === 0) return base;

      const anchorTs = matched?.ts || claim.time_window?.start_ts;
      let best: { campaign: typeof campaigns[number]; score: number; basis: string[] } | null = null;

      for (const campaign of campaigns) {
        if (campaign.status === 'CLOSED' || campaign.lifecycle_status === 'RESOLVED') continue;

        const basis: string[] = [];
        let score = 0;

        // (a) Entity overlap — the strongest, fully verifiable basis.
        if (counterpartyId && campaign.affected_wallets.includes(counterpartyId)) {
          basis.push(`counterparty ${counterpartyId} is an affected wallet in this campaign`);
          score += 0.5;
        }
        if (claim.counterparty_phone) {
          const claimDigits = claim.counterparty_phone.replace(/[^\d]/g, '');
          const numberHit = campaign.reported_numbers.some(n => n.replace(/[^\d]/g, '') === claimDigits);
          if (numberHit) {
            basis.push(`reported number ${claim.counterparty_phone} already appears in this campaign`);
            score += 0.45;
          }
        }
        if (claim.agent_id && campaign.linked_agents.includes(claim.agent_id)) {
          basis.push(`agent ${claim.agent_id} is linked to this campaign`);
          score += 0.2;
        }

        // (b) Narrative overlap, via the campaign service's own similarity function.
        if (claim.sanitized_complaint && campaign.common_phrases.length > 0) {
          const phraseBlob = campaign.common_phrases.join(' ');
          const similarity = scamCampaignService.computeSemanticSimilarity(
            claim.sanitized_complaint,
            phraseBlob
          );
          if (similarity >= 0.45) {
            basis.push(`complaint narrative overlaps the campaign script (semantic similarity ${(similarity * 100).toFixed(0)}%)`);
            score += similarity * 0.4;
          }
        }

        // (c) Typology alignment with the social-engineering indicators extracted.
        const typologyAligned = this.campaignTypologyAligns(campaign.typology, claim);
        if (typologyAligned) {
          basis.push(`incident indicators match the campaign typology ${campaign.typology}`);
          score += 0.15;
        }

        // (d) Time window.
        let inWindow = false;
        if (anchorTs) {
          const t = new Date(anchorTs).getTime();
          const first = new Date(campaign.first_seen_ts).getTime();
          const last = new Date(campaign.latest_seen_ts).getTime();
          // Campaigns stay operationally relevant for a while after the last report.
          inWindow = t >= first - 86_400_000 && t <= last + 7 * 86_400_000;
          if (inWindow) {
            basis.push('incident time falls inside the campaign activity window');
            score += 0.1;
          }
        }

        // A campaign link requires at least one verifiable basis, not typology alone.
        const hasHardBasis = basis.some(b => b.includes('affected wallet') || b.includes('reported number') || b.includes('semantic similarity') || b.includes('linked to this campaign'));
        if (hasHardBasis && (!best || score > best.score)) {
          best = { campaign, score, basis };
          base.within_campaign_window = inWindow;
        }
      }

      if (!best) return base;

      items.push({
        evidence_id: nextEvidenceId('EVD-CAMP'),
        source: 'campaign',
        reference_id: best.campaign.campaign_id,
        claim: `Incident aligns with active campaign "${best.campaign.campaign_name}" because ${best.basis.join('; ')}.`,
        claim_bn: `ঘটনাটি সক্রিয় ক্যাম্পেইন "${best.campaign.campaign_name}" এর সাথে মিলেছে।`,
        value: {
          campaign_id: best.campaign.campaign_id,
          campaign_score: best.campaign.campaign_score,
          lifecycle: best.campaign.lifecycle_status,
          complaint_count: best.campaign.complaint_count
        },
        relevance: 'high',
        direction: 'neutral',
        confidence: Math.min(0.95, 0.5 + best.score / 2),
        reason_codes: ['CAMPAIGN_MATCH']
      });

      return {
        ...base,
        matched_campaign_id: best.campaign.campaign_id,
        matched_campaign_name: best.campaign.campaign_name,
        matched_campaign_typology: String(best.campaign.typology),
        campaign_score: best.campaign.campaign_score,
        match_basis: best.basis,
        summary_en: `Matches active campaign "${best.campaign.campaign_name}" (${best.campaign.complaint_count} linked complaints).`,
        summary_bn: `সক্রিয় ক্যাম্পেইন "${best.campaign.campaign_name}" এর সাথে মিলেছে।`
      };
    } catch (err: any) {
      console.error('[evidence-collector] campaign evidence failed:', err?.message);
      items.push({
        evidence_id: nextEvidenceId('EVD-CAMP'),
        source: 'campaign',
        claim: 'Campaign intelligence is unavailable for this incident. No campaign link was assumed.',
        claim_bn: 'ক্যাম্পেইন ইন্টেলিজেন্স পাওয়া যায়নি। কোনো ক্যাম্পেইন সংযোগ অনুমান করা হয়নি।',
        relevance: 'medium',
        direction: 'neutral',
        confidence: 1,
        reason_codes: ['CAMPAIGN_UNAVAILABLE']
      });
      return {
        ...base,
        available: false,
        unavailable_reason: `Campaign lookup failed: ${err?.message || 'unknown error'}`,
        summary_en: 'Campaign evidence unavailable.',
        summary_bn: 'ক্যাম্পেইন তথ্য পাওয়া যায়নি।'
      };
    }
  }

  private campaignTypologyAligns(typology: string, claim: IncidentClaim): boolean {
    const t = String(typology).toUpperCase();
    const ind = claim.scam_indicators;
    if (t.includes('CUSTOMER_CARE') || t.includes('VERIFICATION')) {
      return ind.includes('AUTHORITY_IMPERSONATION') || ind.includes('CREDENTIAL_REQUEST');
    }
    if (t.includes('PRIZE') || t.includes('LOTTERY') || t.includes('REFUND')) {
      return ind.includes('REWARD_PROMISE');
    }
    if (t.includes('INVESTMENT') || t.includes('TASK')) {
      return ind.includes('INVESTMENT_PROMISE');
    }
    if (t.includes('EMERGENCY') || t.includes('RELATIVE')) {
      return ind.includes('EMERGENCY_STORY');
    }
    return false;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  /**
   * Map the risk engine's own verdict onto the investigation's four-level scale.
   *
   * The TIER leads, not a re-threshold of the score. The tier is the engine's
   * policy-grade judgement: it escalates on rules (new high-value recipient,
   * repeated community reports, ATO signature) that the calibrated score alone can
   * understate. Re-deriving a level purely from the score would quietly second-guess
   * the engine, which is what this feature must not do.
   *
   * The calibrated score moderates one case only: a T2 escalation driven by a single
   * friction rule while the blended score stays low means "add verification", not
   * "high fraud risk", so that reports as MEDIUM. Without this, a routine first
   * transfer to a new recipient would be labelled HIGH on a 7% score.
   */
  private tierToFraudRisk(score: number, tier: string): IncidentFraudRisk {
    if (tier === 'T3' || score >= 0.85) return 'CRITICAL';
    if (score >= 0.60) return 'HIGH';
    if (tier === 'T2') return score >= 0.30 ? 'HIGH' : 'MEDIUM';
    if (tier === 'T1' || score >= 0.30) return 'MEDIUM';
    return 'LOW';
  }

  private reasonCodesForSignal(signal: string, strength: number): string[] {
    const matchedStrongly = strength >= 0.9;
    switch (signal) {
      case 'AMOUNT_MATCH':
        return matchedStrongly ? ['AMOUNT_MATCH'] : strength > 0 ? ['AMOUNT_APPROXIMATE_MATCH'] : ['AMOUNT_MISMATCH'];
      case 'TIME_MATCH':
        return matchedStrongly ? ['TIME_MATCH'] : strength > 0 ? [] : ['TIME_MISMATCH'];
      case 'TYPE_MATCH':
        return matchedStrongly ? ['TYPE_MATCH'] : [];
      case 'COUNTERPARTY_MATCH':
        return matchedStrongly ? ['COUNTERPARTY_MATCH'] : [];
      case 'REFERENCE_MATCH':
        return matchedStrongly ? ['REFERENCE_MATCH'] : ['REFERENCE_NOT_FOUND'];
      case 'STATUS_CONSISTENCY':
        return [];
      default:
        return [];
    }
  }

  private banglaForSignal(signal: string, strength: number, candidate: TransactionMatchCandidate): string {
    const ok = strength >= 0.9;
    const amount = `৳${candidate.amount_bdt.toLocaleString()}`;
    switch (signal) {
      case 'AMOUNT_MATCH':
        return ok
          ? `লেনদেনের পরিমাণ ${amount} গ্রাহকের বলা পরিমাণের সাথে মিলেছে।`
          : strength > 0
            ? `লেনদেনের পরিমাণ ${amount} গ্রাহকের বলা পরিমাণের কাছাকাছি।`
            : `লেনদেনের পরিমাণ ${amount} গ্রাহকের বলা পরিমাণের সাথে মেলেনি।`;
      case 'TIME_MATCH':
        return ok
          ? 'লেনদেনের সময় গ্রাহকের বলা সময়ের মধ্যে পড়েছে।'
          : 'লেনদেনের সময় গ্রাহকের বলা সময়ের বাইরে।';
      case 'TYPE_MATCH':
        return ok
          ? `লেনদেনের ধরন (${candidate.type}) গ্রাহকের বর্ণনার সাথে মিলেছে।`
          : `লেনদেনের ধরন (${candidate.type}) গ্রাহকের বর্ণনার সাথে মেলেনি।`;
      case 'COUNTERPARTY_MATCH':
        return ok
          ? 'অভিযোগে উল্লেখ করা প্রাপক লেনদেনের রেকর্ডের সাথে মিলেছে।'
          : 'অভিযোগে উল্লেখ করা প্রাপক লেনদেনের রেকর্ডের সাথে মেলেনি।';
      case 'REFERENCE_MATCH':
        return ok
          ? `গ্রাহকের দেওয়া রেফারেন্স ${candidate.txn_id} রেকর্ডে পাওয়া গেছে।`
          : 'গ্রাহকের দেওয়া রেফারেন্স এই লেনদেনের সাথে মেলেনি।';
      case 'STATUS_CONSISTENCY':
        return `লেনদেনের অবস্থা: ${candidate.status}.`;
      case 'CONTEXT_MATCH':
        return 'টাকার প্রবাহের দিক অভিযোগের ধরনের সাথে সঙ্গতিপূর্ণ।';
      default:
        return '';
    }
  }
}

export const evidenceCollector = new EvidenceCollector();
