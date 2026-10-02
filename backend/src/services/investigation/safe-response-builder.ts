import {
  EvidenceAssessment,
  IncidentClaim,
  IncidentClassification,
  SafeCustomerResponse,
  HumanReviewDecision,
  TransactionMatchCandidate
} from '../../core/types.js';
import { responseSafetyValidator } from './response-safety-validator.js';

/**
 * Safe Customer Response Builder.
 *
 * Flow (per the required architecture):
 *
 *   Investigation Result -> Recommended Action -> Response Generator
 *     -> Safety Validator -> Final Customer Reply
 *
 * The generator is template-driven and grounded only in facts the investigation
 * verified. If the generated draft fails validation for any reason, it is
 * DISCARDED and a minimal vetted fallback is used instead — the returned response
 * always passes the validator.
 *
 * Wording rules that follow from responsible-AI requirements:
 *   - never say "AI knows this is fraud"; say what the evidence indicates
 *   - never promise a refund, reversal or unblock
 *   - never reveal internal intelligence (ring ids, campaign ids, risk scores)
 *   - always include the "we will never ask for your PIN/OTP" warning, phrased so
 *     the safety validator recognises it as a warning rather than a request
 */

const PIN_OTP_WARNING_EN =
  'upay staff will never ask you for your PIN, OTP or password. Never share them with anyone, including anyone claiming to be from upay.';
const PIN_OTP_WARNING_BN =
  'উপায়ের কোনো কর্মী কখনো আপনার পিন, ওটিপি বা পাসওয়ার্ড চাইবে না। এগুলো কাউকে কখনো শেয়ার করবেন না, এমনকি কেউ উপায়ের পরিচয় দিলেও নয়।';

const OFFICIAL_CHANNEL_EN = 'If you need to reach us, use the upay app or the official helpline 16268 only.';
const OFFICIAL_CHANNEL_BN = 'প্রয়োজনে শুধু উপায় অ্যাপ অথবা অফিসিয়াল হেল্পলাইন ১৬২৬৮ ব্যবহার করুন।';

/** Last-resort response. Deliberately minimal and already validator-clean. */
const FALLBACK_TEMPLATE = {
  template_id: 'ICR-FALLBACK-SAFE',
  headline_en: 'Your report has been received and is under review',
  headline_bn: 'আপনার অভিযোগ গ্রহণ করা হয়েছে এবং পর্যালোচনা করা হচ্ছে',
  body_en:
    'Thank you for reporting this. Our team is reviewing your account records and will follow up through the upay app. ' +
    'We cannot confirm an outcome yet. ' +
    PIN_OTP_WARNING_EN,
  body_bn:
    'অভিযোগ জানানোর জন্য ধন্যবাদ। আমাদের দল আপনার অ্যাকাউন্টের রেকর্ড পর্যালোচনা করছে এবং উপায় অ্যাপের মাধ্যমে আপনাকে জানাবে। ' +
    'এখনই কোনো ফলাফল নিশ্চিত করা যাচ্ছে না। ' +
    PIN_OTP_WARNING_BN,
  next_steps_en: [OFFICIAL_CHANNEL_EN],
  next_steps_bn: [OFFICIAL_CHANNEL_BN]
};

export class SafeResponseBuilder {
  build(args: {
    claim: IncidentClaim;
    evidence: EvidenceAssessment;
    classification: IncidentClassification;
    humanReview: HumanReviewDecision;
    matched?: TransactionMatchCandidate;
  }): SafeCustomerResponse {
    const draft = this.generateDraft(args);

    // 1. Validate the generated draft.
    const report = responseSafetyValidator.validate([
      draft.headline_en,
      draft.headline_bn,
      draft.body_en,
      draft.body_bn,
      ...draft.next_steps_en,
      ...draft.next_steps_bn
    ]);

    if (report.passed) {
      return {
        ...draft,
        fallback_used: false,
        safety_report: report,
        requires_agent_approval: args.humanReview.required
      };
    }

    // 2. Draft rejected — regenerate from the vetted fallback and re-validate.
    console.warn(
      '[safe-response-builder] generated response rejected by safety validator:',
      report.violations.map(v => v.code).join(', ')
    );

    const fallbackReport = responseSafetyValidator.validate([
      FALLBACK_TEMPLATE.headline_en,
      FALLBACK_TEMPLATE.headline_bn,
      FALLBACK_TEMPLATE.body_en,
      FALLBACK_TEMPLATE.body_bn,
      ...FALLBACK_TEMPLATE.next_steps_en,
      ...FALLBACK_TEMPLATE.next_steps_bn
    ]);

    return {
      ...FALLBACK_TEMPLATE,
      fallback_used: true,
      // Record BOTH outcomes: what the rejected draft tripped, and that the
      // delivered fallback is clean. `passed` reflects what is actually sent.
      safety_report: {
        passed: fallbackReport.passed,
        violations: report.violations,
        checks_run: fallbackReport.checks_run,
        validator_version: fallbackReport.validator_version
      },
      requires_agent_approval: true
    };
  }

  /**
   * Template selection is driven by the evidence verdict first, then by case type.
   * Nothing here states a conclusion the investigation did not reach.
   */
  private generateDraft(args: {
    claim: IncidentClaim;
    evidence: EvidenceAssessment;
    classification: IncidentClassification;
    humanReview: HumanReviewDecision;
    matched?: TransactionMatchCandidate;
  }): Omit<SafeCustomerResponse, 'fallback_used' | 'safety_report' | 'requires_agent_approval'> {
    const { evidence, classification, matched, claim } = args;
    const amount = matched ? `BDT ${matched.amount_bdt.toLocaleString()}` : undefined;
    const amountBn = matched ? `৳${matched.amount_bdt.toLocaleString()}` : undefined;
    const timeLabel = matched ? new Date(matched.ts).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : undefined;

    if (evidence.verdict === 'CONSISTENT' && matched) {
      const isScamShaped =
        classification.case_type === 'phishing_or_social_engineering' ||
        claim.credential_request_claimed ||
        claim.authority_impersonation_claimed;

      const nextStepsEn = [
        'Keep this report open in the upay app so you receive updates.',
        'Do not send any further money to the same number, even if you are contacted again.',
        OFFICIAL_CHANNEL_EN
      ];
      const nextStepsBn = [
        'আপডেট পাওয়ার জন্য উপায় অ্যাপে এই অভিযোগটি খোলা রাখুন।',
        'একই নম্বরে আর কোনো টাকা পাঠাবেন না, আবার যোগাযোগ করা হলেও নয়।',
        OFFICIAL_CHANNEL_BN
      ];

      if (claim.credential_request_claimed) {
        nextStepsEn.unshift('Change your upay PIN from inside the upay app as a precaution.');
        nextStepsBn.unshift('সতর্কতা হিসেবে উপায় অ্যাপ থেকে আপনার পিন পরিবর্তন করে নিন।');
      }

      return {
        template_id: isScamShaped ? 'ICR-CONSISTENT-SCAM' : 'ICR-CONSISTENT-TRANSFER',
        headline_en: 'We found the transaction you reported',
        headline_bn: 'আপনি যে লেনদেনের কথা জানিয়েছেন তা আমরা খুঁজে পেয়েছি',
        body_en:
          `Our records show a ${amount} ${String(matched.type).replace(/_/g, ' ').toLowerCase()} on ${timeLabel}, which matches your report. ` +
          `Your case has been passed to our ${this.departmentLabelEn(classification.routing_department)} team for review. ` +
          'We cannot promise an outcome, and whether funds can be recovered depends on what the review finds. ' +
          PIN_OTP_WARNING_EN,
        body_bn:
          `আমাদের রেকর্ডে ${timeLabel} সময়ে ${amountBn} এর একটি লেনদেন রয়েছে, যা আপনার অভিযোগের সাথে মিলে যায়। ` +
          'আপনার অভিযোগটি পর্যালোচনার জন্য সংশ্লিষ্ট দলের কাছে পাঠানো হয়েছে। ' +
          'ফলাফল সম্পর্কে এখনই কোনো প্রতিশ্রুতি দেওয়া সম্ভব নয়; টাকা উদ্ধার করা যাবে কিনা তা পর্যালোচনার ওপর নির্ভর করছে। ' +
          PIN_OTP_WARNING_BN,
        next_steps_en: nextStepsEn,
        next_steps_bn: nextStepsBn
      };
    }

    if (evidence.verdict === 'INCONSISTENT') {
      return {
        template_id: 'ICR-INCONSISTENT',
        headline_en: 'We could not find a matching transaction yet',
        headline_bn: 'এখনো মিলে যাওয়া কোনো লেনদেন খুঁজে পাওয়া যায়নি',
        body_en:
          'We checked your recent transaction history and could not find a transaction matching the details you gave us. ' +
          'This often happens when the amount or time is slightly different from what was remembered, when the transaction was made from another account or number, or when it sits outside the period we searched. ' +
          'Please check your transaction history in the upay app and send us the transaction reference if you can find it — that will let us locate it immediately. ' +
          PIN_OTP_WARNING_EN,
        body_bn:
          'আপনার সাম্প্রতিক লেনদেনের রেকর্ড পরীক্ষা করে আপনার দেওয়া তথ্যের সাথে মিলে যাওয়া কোনো লেনদেন পাওয়া যায়নি। ' +
          'পরিমাণ বা সময় কিছুটা আলাদা হলে, অন্য অ্যাকাউন্ট থেকে লেনদেন হলে, বা আমাদের অনুসন্ধানের সময়সীমার বাইরে হলে এমন হতে পারে। ' +
          'অনুগ্রহ করে উপায় অ্যাপে লেনদেনের তালিকা দেখে রেফারেন্স নম্বরটি আমাদের জানান, তাহলে আমরা সঙ্গে সঙ্গে খুঁজে বের করতে পারব। ' +
          PIN_OTP_WARNING_BN,
        next_steps_en: [
          'Open the upay app and check your transaction history for the entry in question.',
          'Share the transaction reference with us through the app if you find it.',
          OFFICIAL_CHANNEL_EN
        ],
        next_steps_bn: [
          'উপায় অ্যাপ খুলে আপনার লেনদেনের তালিকা দেখুন।',
          'লেনদেনটি পেলে রেফারেন্স নম্বরটি অ্যাপের মাধ্যমে আমাদের জানান।',
          OFFICIAL_CHANNEL_BN
        ]
      };
    }

    // INSUFFICIENT_DATA — including the authorisation-denial conflict case.
    const hasAuthorisationConflict = evidence.conflicts.some(c =>
      c.reason_codes.includes('AUTHORISATION_DENIED_BY_CUSTOMER')
    );

    if (hasAuthorisationConflict) {
      return {
        template_id: 'ICR-INSUFFICIENT-DISPUTED-AUTH',
        headline_en: 'Your disputed transaction is under investigation',
        headline_bn: 'আপনার আপত্তি জানানো লেনদেনটি তদন্তাধীন',
        body_en:
          'You have told us you did not authorise this transaction. Our records do show a transaction on your account, and establishing who authorised it requires a review of device and login records by our investigation team. ' +
          'That review is now underway and we cannot confirm an outcome yet. ' +
          PIN_OTP_WARNING_EN,
        body_bn:
          'আপনি জানিয়েছেন এই লেনদেনটি আপনি অনুমোদন করেননি। আমাদের রেকর্ডে আপনার অ্যাকাউন্টে একটি লেনদেন রয়েছে, এবং কে এটি অনুমোদন করেছে তা নির্ধারণে ডিভাইস ও লগইন রেকর্ড পর্যালোচনা প্রয়োজন। ' +
          'সেই পর্যালোচনা শুরু হয়েছে; এখনই কোনো ফলাফল নিশ্চিত করা যাচ্ছে না। ' +
          PIN_OTP_WARNING_BN,
        next_steps_en: [
          'Change your upay PIN from inside the upay app now.',
          'If you think your account is still at risk, turn on Customer Safety Mode in the app.',
          OFFICIAL_CHANNEL_EN
        ],
        next_steps_bn: [
          'এখনই উপায় অ্যাপ থেকে আপনার পিন পরিবর্তন করুন।',
          'অ্যাকাউন্ট এখনো ঝুঁকিতে মনে হলে অ্যাপে গ্রাহক সুরক্ষা মোড চালু করুন।',
          OFFICIAL_CHANNEL_BN
        ]
      };
    }

    return {
      template_id: 'ICR-INSUFFICIENT-NEED-DETAIL',
      headline_en: 'We need a little more detail to investigate',
      headline_bn: 'তদন্তের জন্য আমাদের আরও কিছু তথ্য প্রয়োজন',
      body_en:
        'Thank you for reporting this. With the details we have so far, we could not determine what happened from your account records. ' +
        'If you can tell us the amount, the approximate date and time, and the number or reference involved, we can look it up straight away. ' +
        PIN_OTP_WARNING_EN,
      body_bn:
        'অভিযোগ জানানোর জন্য ধন্যবাদ। এখন পর্যন্ত পাওয়া তথ্য দিয়ে আপনার অ্যাকাউন্টের রেকর্ড থেকে কী ঘটেছে তা নির্ধারণ করা যায়নি। ' +
        'আপনি যদি পরিমাণ, আনুমানিক তারিখ ও সময়, এবং সংশ্লিষ্ট নম্বর বা রেফারেন্স জানান, তাহলে আমরা সঙ্গে সঙ্গে খুঁজে দেখতে পারব। ' +
        PIN_OTP_WARNING_BN,
      next_steps_en: [
        'Reply through the upay app with the amount and approximate time of the transaction.',
        'Include the transaction reference from your upay transaction history if available.',
        OFFICIAL_CHANNEL_EN
      ],
      next_steps_bn: [
        'উপায় অ্যাপের মাধ্যমে লেনদেনের পরিমাণ ও আনুমানিক সময় জানান।',
        'সম্ভব হলে উপায় লেনদেনের তালিকা থেকে রেফারেন্স নম্বরটি দিন।',
        OFFICIAL_CHANNEL_BN
      ]
    };
  }

  private departmentLabelEn(dept: IncidentClassification['routing_department']): string {
    switch (dept) {
      case 'DISPUTE_RESOLUTION': return 'dispute resolution';
      case 'PAYMENTS_OPS': return 'payment operations';
      case 'MERCHANT_OPERATIONS': return 'merchant operations';
      case 'AGENT_OPERATIONS': return 'agent operations';
      case 'FRAUD_RISK': return 'fraud and risk';
      default: return 'customer support';
    }
  }
}

export const safeResponseBuilder = new SafeResponseBuilder();
