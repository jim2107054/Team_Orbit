import { z } from 'zod';
import { text, list } from './schema-helpers.js';
import { llmService, LlmCallMeta } from './llm-service.js';
import { RetrievedChunk } from '../rag/retrieval-service.js';
import { AlertCase } from '../../core/types.js';

/**
 * Model-written investigation narrative for an analyst, grounded in the case
 * record and in retrieved precedent.
 *
 * The template brief this sits beside is accurate but fixed: it restates the
 * same sentences for every case. This produces a reading of the specific case,
 * cites the evidence ids it relies on, and is explicitly not allowed to assert
 * a conclusion — the verdict stays with the deterministic policy and the human
 * reviewer, per the evidence-verdict policy in the corpus.
 */

const narrativeSchema = z.object({
  summary: text(900),
  key_observations: list(
    z.object({
      text: text(400),
      evidence_ids: list(z.string(), 6),
      confidence: z.enum(['HIGH', 'MEDIUM', 'LOW'])
    }),
    6
  ),
  likely_typology: text(80).nullable(),
  open_questions: list(text(240), 5),
  suggested_actions: list(text(240), 5),
  precedent_notes: text(600).nullable()
});

export type LlmCopilotNarrative = z.infer<typeof narrativeSchema>;

const SYSTEM_PROMPT = `You write short investigation briefs for fraud analysts at upay, a mobile financial services provider in Bangladesh. An analyst reads your brief before deciding what to do with a flagged transaction.

What a good brief does:
- States what the records actually show, in the order that matters for a decision.
- Attaches the evidence ids that support each observation. Only use ids present in the evidence pack you are given.
- Separates what is established from what is still unknown, and says plainly what would resolve each unknown.
- Suggests next actions that are proportionate to the evidence.

Hard limits:
- You do not decide the case. Never state that fraud is confirmed, that the customer is lying, or that funds will be recovered. The verdict is set by deterministic policy and a human reviewer.
- Never invent an evidence id, an amount, a wallet, a timestamp or a ring name. If something is not in the evidence pack, treat it as unknown.
- Mark an observation LOW confidence when it rests on a single weak signal, and say so rather than overstating it.
- Reference material is precedent for context. It describes patterns, not this case. Never present it as a finding about this customer.
- Be brief: summary at most three sentences, at most 4 observations, and every other free-text field one short sentence. Short answers are faster.
- Reply with a single JSON object and nothing else.`;

function buildUserPrompt(
  alertCase: AlertCase,
  evidenceIds: Record<string, unknown>,
  retrieved: RetrievedChunk[]
): string {
  const sections: string[] = [];

  sections.push(
    'Evidence pack for this case. These are the only ids you may cite:\n\n' +
    JSON.stringify(
      {
        case_id: alertCase.case_id,
        txn_id: alertCase.txn_id,
        amount_bdt: alertCase.amount_bdt,
        risk_score: alertCase.risk_score,
        risk_tier: alertCase.risk_tier,
        action_recommended: alertCase.action_recommended,
        status: alertCase.status,
        reason_codes: alertCase.reasons?.map(r => ({ code: r.code, label: r.label_en })) ?? [],
        rules_fired: alertCase.rule_trace?.filter(r => r.fired).map(r => r.rule) ?? [],
        evidence_items: evidenceIds
      },
      null,
      1
    )
  );

  if (retrieved.length) {
    sections.push(
      'Reference material — scam typologies, policy and comparable past reports. Context only, not findings about this case:\n\n' +
      retrieved.map((c, i) => `[${i + 1}] (${c.title}, relevance ${c.score}) ${c.content}`).join('\n\n')
    );
  }

  sections.push(
    'Return JSON with exactly these keys: summary (string), key_observations (array of ' +
    '{text, evidence_ids, confidence: HIGH|MEDIUM|LOW}), likely_typology (string or null), ' +
    'open_questions (array of strings), suggested_actions (array of strings), precedent_notes (string or null).'
  );

  return sections.join('\n\n');
}

export interface CopilotNarrativeOutcome {
  narrative: LlmCopilotNarrative | null;
  used: boolean;
  reason?: string;
  meta?: Partial<LlmCallMeta>;
  /** Evidence ids the model cited that were not in the pack. */
  rejected_evidence_ids: string[];
}

export async function generateCopilotNarrative(
  alertCase: AlertCase,
  evidenceIds: Record<string, unknown>,
  retrieved: RetrievedChunk[] = []
): Promise<CopilotNarrativeOutcome> {
  const outcome = await llmService.completeJson({
    task: 'copilot-narrative',
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(alertCase, evidenceIds, retrieved),
    schema: narrativeSchema,
    targetId: alertCase.case_id,
    ragChunkCount: retrieved.length,
    maxOutputTokens: 1600
  });

  if (!outcome.ok) {
    return { narrative: null, used: false, reason: outcome.reason, meta: outcome.meta, rejected_evidence_ids: [] };
  }

  // Drop citations to ids that do not exist. A brief whose footnotes do not
  // resolve is worse than one with fewer footnotes, because an analyst cannot
  // tell which claims are actually grounded.
  const valid = new Set(Object.keys(evidenceIds));
  const rejected: string[] = [];

  const narrative: LlmCopilotNarrative = {
    ...outcome.value,
    key_observations: outcome.value.key_observations.map(obs => {
      const kept = obs.evidence_ids.filter(id => {
        if (valid.has(id)) return true;
        rejected.push(id);
        return false;
      });
      return { ...obs, evidence_ids: kept };
    })
  };

  return {
    narrative,
    used: true,
    meta: outcome.meta,
    rejected_evidence_ids: Array.from(new Set(rejected))
  };
}
