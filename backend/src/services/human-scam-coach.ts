import {
  HumanCoachQuestionId,
  HumanCoachAnswerValue,
  HumanCoachQuestion,
  HumanCoachSignals,
  HumanCoachSession,
  HumanCoachEvaluationResult,
  HumanCoachSafetyExplanation,
  HumanCoachCustomerChoice
} from '../core/types.js';
import { coachSessionStore } from '../db/stores.js';
import { auditService } from './audit-service.js';

export const CONTROLLED_QUESTION_LIBRARY: Record<HumanCoachQuestionId, HumanCoachQuestion> = {
  Q1_RECENT_CONTACT: {
    id: 'Q1_RECENT_CONTACT',
    question_en: 'Did someone recently contact you and ask you to send this money?',
    question_bn: 'কেউ কি সম্প্রতি আপনাকে এই টাকা পাঠাতে বলেছেন?',
    simple_mode_bn: 'ফোন করে বা মেসেজে কেউ কি এই টাকা পাঠাতে বলেছে?',
    signal_key: 'recent_social_contact',
    category: 'SOCIAL_CONTACT',
    options: [
      { value: 'YES', label_en: 'Yes', label_bn: 'হ্যাঁ' },
      { value: 'NO', label_en: 'No', label_bn: 'না' },
      { value: 'NOT_SURE', label_en: "I'm not sure", label_bn: 'নিশ্চিত নই' }
    ],
    why_we_ask_en: 'Many scam incidents begin with an unexpected call, WhatsApp, or SMS instructing the customer to send money.',
    why_we_ask_bn: 'অধিকাংশ প্রতারণার ঘটনা ঘটে যখন অপরিচিত কেউ ফোন বা মেসেজে টাকা পাঠাতে নির্দেশ দেয়।'
  },
  Q2_CREDENTIAL_REQUEST: {
    id: 'Q2_CREDENTIAL_REQUEST',
    question_en: 'Did anyone ask you for your PIN, OTP, password, or verification code?',
    question_bn: 'কেউ কি আপনার PIN, OTP বা verification code চেয়েছে?',
    simple_mode_bn: 'আপনার গোপন পিন বা ওটিপি কি কেউ চেয়েছে?',
    signal_key: 'credential_request',
    category: 'CREDENTIAL',
    options: [
      { value: 'YES', label_en: 'Yes', label_bn: 'হ্যাঁ' },
      { value: 'NO', label_en: 'No', label_bn: 'না' },
      { value: 'NOT_SURE', label_en: "I'm not sure", label_bn: 'নিশ্চিত নই' }
    ],
    why_we_ask_en: 'upay or legitimate bank staff will NEVER ask for your PIN, OTP, or SMS verification code.',
    why_we_ask_bn: 'উপায় বা ব্যাংক কর্তৃপক্ষ কখনো গ্রাহকের গোপন পিন বা ওটিপি কোড জানতে চায় না।'
  },
  Q3_AUTHORITY_IMPERSONATION: {
    id: 'Q3_AUTHORITY_IMPERSONATION',
    question_en: 'Did the person claim to be from customer care, your bank, MFS, or another official service?',
    question_bn: 'যিনি যোগাযোগ করেছেন তিনি কি কাস্টমার কেয়ার, ব্যাংক বা অফিশিয়াল সার্ভিসের পরিচয় দিয়েছেন?',
    simple_mode_bn: 'ফোনকারী কি কাস্টমার কেয়ার বা উপায় কর্মকর্তা সেজেছেন?',
    signal_key: 'authority_impersonation',
    category: 'AUTHORITY',
    options: [
      { value: 'YES', label_en: 'Yes', label_bn: 'হ্যাঁ' },
      { value: 'NO', label_en: 'No', label_bn: 'না' },
      { value: 'NOT_SURE', label_en: "I'm not sure", label_bn: 'নিশ্চিত নই' }
    ],
    why_we_ask_en: 'Scammers frequently impersonate official customer care to build false trust and demand verification payments.',
    why_we_ask_bn: 'প্রতারকরা বিশ্বাস অর্জনের জন্য ভুয়া কাস্টমার কেয়ার বা সরকারি কর্মকর্তা সেজে টাকা পাঠাতে বলে।'
  },
  Q4_URGENCY_PRESSURE: {
    id: 'Q4_URGENCY_PRESSURE',
    question_en: 'Did they tell you that you must send the money immediately?',
    question_bn: 'তারা কি আপনাকে অবিলম্বে এই টাকা পাঠানোর জন্য চাপ দিচ্ছেন?',
    simple_mode_bn: 'দেরি না করে এখনই টাকা পাঠাতে বলছে কি?',
    signal_key: 'urgency_pressure',
    category: 'PRESSURE',
    options: [
      { value: 'YES', label_en: 'Yes', label_bn: 'হ্যাঁ' },
      { value: 'NO', label_en: 'No', label_bn: 'না' },
      { value: 'NOT_SURE', label_en: "I'm not sure", label_bn: 'নিশ্চিত নই' }
    ],
    why_we_ask_en: 'Artificial urgency is used by fraudsters to prevent you from taking time to independently verify.',
    why_we_ask_bn: 'চিন্তা করার সুযোগ না দিতে প্রতারকরা দ্রুত টাকা পাঠানোর অতিরিক্ত চাপ দেয়।'
  },
  Q5_SECRECY_PRESSURE: {
    id: 'Q5_SECRECY_PRESSURE',
    question_en: 'Did they ask you not to tell anyone about the payment?',
    question_bn: 'লেনদেনের বিষয়টি অন্য কাউকে জানাতে নিষেধ করা হয়েছে কি?',
    simple_mode_bn: 'কাউকে বলতে নিষেধ করা হয়েছে কি?',
    signal_key: 'secrecy_pressure',
    category: 'PRESSURE',
    options: [
      { value: 'YES', label_en: 'Yes', label_bn: 'হ্যাঁ' },
      { value: 'NO', label_en: 'No', label_bn: 'না' },
      { value: 'NOT_SURE', label_en: "I'm not sure", label_bn: 'নিশ্চিত নই' }
    ],
    why_we_ask_en: 'Coercing victims into secrecy isolates them from family or friends who might spot the scam.',
    why_we_ask_bn: 'পরিবার বা শুভাকাঙ্ক্ষীরা যাতে প্রতারণা ধরে ফেলতে না পারে, সেজন্য বিষয়টি গোপন রাখতে বলা হয়।'
  },
  Q6_EMERGENCY_IMPERSONATION: {
    id: 'Q6_EMERGENCY_IMPERSONATION',
    question_en: 'Did someone contact you claiming that a family member or friend urgently needs money?',
    question_bn: 'পরিবারের কেউ বা কোনো বন্ধু বিপদে পড়েছেন দাবি করে কি টাকা চাওয়া হয়েছে?',
    simple_mode_bn: 'আত্মীয় বিপদে পড়েছে বলে কি টাকা পাঠাতে বলা হয়েছে?',
    signal_key: 'emergency_impersonation',
    category: 'TYPOLOGY',
    options: [
      { value: 'YES', label_en: 'Yes', label_bn: 'হ্যাঁ' },
      { value: 'NO', label_en: 'No', label_bn: 'না' },
      { value: 'NOT_SURE', label_en: "I'm not sure", label_bn: 'নিশ্চিত নই' }
    ],
    why_we_ask_en: 'Accident or medical emergency impersonation exploits panic before you can reach your relative.',
    why_we_ask_bn: 'হাসপাতাল বা বিপদের মিথ্যা গল্প বলে আতঙ্ক তৈরি করে টাকা হাতিয়ে নেওয়া হয়।'
  },
  Q7_ADVANCE_PAYMENT_SCAM: {
    id: 'Q7_ADVANCE_PAYMENT_SCAM',
    question_en: 'Did they say you need to send money first to receive a refund, prize, reward, or benefit?',
    question_bn: 'কোনো পুরস্কার, রিফান্ড বা উপহার পাওয়ার জন্য কি আগে এই টাকা পাঠাতে বলা হয়েছে?',
    simple_mode_bn: 'পুরস্কার বা লটারির টাকা পাওয়ার জন্য কি আগে টাকা দিতে বলছে?',
    signal_key: 'advance_payment_scam',
    category: 'TYPOLOGY',
    options: [
      { value: 'YES', label_en: 'Yes', label_bn: 'হ্যাঁ' },
      { value: 'NO', label_en: 'No', label_bn: 'না' },
      { value: 'NOT_SURE', label_en: "I'm not sure", label_bn: 'নিশ্চিত নই' }
    ],
    why_we_ask_en: 'Legitimate prizes or government stipends NEVER require an upfront fee or advance processing payment.',
    why_we_ask_bn: 'লটারি বা পুরস্কার পাওয়ার জন্য আগে কোনো প্রসেসিং ফি বা টাকা দেওয়ার প্রয়োজন হয় না।'
  },
  Q8_INVESTMENT_TASK_SCAM: {
    id: 'Q8_INVESTMENT_TASK_SCAM',
    question_en: 'Did someone promise profit, commission, or earnings if you send money first?',
    question_bn: 'টাকা পাঠালে বেশি লাভ, কমিশন বা আয়ের প্রতিশ্রুতি দেওয়া হয়েছে কি?',
    simple_mode_bn: 'অনলাইনে কাজ বা বেশি লাভের লোভ দেখিয়ে কি টাকা দিতে বলছে?',
    signal_key: 'investment_or_task_scam',
    category: 'TYPOLOGY',
    options: [
      { value: 'YES', label_en: 'Yes', label_bn: 'হ্যাঁ' },
      { value: 'NO', label_en: 'No', label_bn: 'না' },
      { value: 'NOT_SURE', label_en: "I'm not sure", label_bn: 'নিশ্চিত নই' }
    ],
    why_we_ask_en: 'Fake Telegram/WhatsApp task groups promise high daily returns to trick customers into sending funds.',
    why_we_ask_bn: 'অনলাইন টাস্ক বা ভুয়া ইনভেস্টমেন্টে উচ্চ মুনাফার লোভ দেখিয়ে ফাঁদে ফেলা হয়।'
  }
};

export class HumanScamCoachService {
  private activeSessions: Map<string, HumanCoachSession> = new Map();

  /**
   * Coaching sessions are created live, so there is no seed baseline to publish.
   * Hydrating them back means an in-flight intervention survives a restart
   * instead of the customer losing their place mid-dialog.
   */
  async hydrate(): Promise<void> {
    const sessions = await coachSessionStore.loadAll(500);
    for (const session of sessions) {
      if (!this.activeSessions.has(session.session_id)) {
        this.activeSessions.set(session.session_id, session);
      }
    }
  }

  private saveSession(session: HumanCoachSession): HumanCoachSession {
    this.activeSessions.set(session.session_id, session);
    coachSessionStore.enqueueUpsert(session);
    return session;
  }

  /**
   * Evaluate whether to trigger Human Scam Coach and select 1–4 contextual questions
   */
  public evaluateIntervention(context: {
    customer_wallet: string;
    recipient_wallet: string;
    amount_bdt: number;
    risk_score?: number;
    risk_tier?: string;
    reasons?: string[];
    is_new_recipient?: boolean;
    scam_conversation_typology?: string;
    scam_conversation_score?: number;
    safety_mode_active?: boolean;
    channel?: string;
    transaction_id?: string;
  }): HumanCoachEvaluationResult {
    const riskScore = context.risk_score !== undefined ? context.risk_score : 0.65;
    const isNewRecipient = context.is_new_recipient !== undefined ? context.is_new_recipient : true;
    const reasons = context.reasons || ['RC01'];
    const typology = context.scam_conversation_typology || '';
    const isSafetyMode = Boolean(context.safety_mode_active);
    const amount = context.amount_bdt || 18500;
    const sessionId = `COACH-SESS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const txnId = context.transaction_id || `TXN-SYN-${Date.now()}`;

    // Low Risk: 0 Questions (No unnecessary friction)
    if (!isSafetyMode && riskScore < 0.35 && !isNewRecipient && amount < 5000) {
      return {
        should_intervene: false,
        intervention_reason: 'Low risk transaction with known counterparty and standard amount baseline.',
        intervention_reason_bn: 'পরিচিত প্রাপক ও স্বাভাবিক লেনদেনের কারণে কোনো অতিরিক্ত ভেরিফিকেশন প্রযোজ্য নয়।',
        session_id: sessionId,
        total_questions_count: 0,
        questions: []
      };
    }

    // Context-Aware Question Selection (Max 2-4 questions)
    const selectedQuestions: HumanCoachQuestion[] = [];

    // Always start with Q1 Recent Contact for social engineering detection
    selectedQuestions.push(CONTROLLED_QUESTION_LIBRARY.Q1_RECENT_CONTACT);

    // Typology & Reason-driven selection
    if (typology === 'FAKE_CUSTOMER_CARE' || reasons.includes('RC07') || reasons.includes('CUSTOMER_CARE_IMPERSONATION')) {
      selectedQuestions.push(CONTROLLED_QUESTION_LIBRARY.Q3_AUTHORITY_IMPERSONATION);
      selectedQuestions.push(CONTROLLED_QUESTION_LIBRARY.Q2_CREDENTIAL_REQUEST);
      selectedQuestions.push(CONTROLLED_QUESTION_LIBRARY.Q4_URGENCY_PRESSURE);
    } else if (typology === 'LOTTERY_PRIZE' || typology === 'ADVANCE_FEE' || reasons.includes('PRIZE_OR_REFUND_SCAM')) {
      selectedQuestions.push(CONTROLLED_QUESTION_LIBRARY.Q7_ADVANCE_PAYMENT_SCAM);
      selectedQuestions.push(CONTROLLED_QUESTION_LIBRARY.Q2_CREDENTIAL_REQUEST);
    } else if (typology === 'INVESTMENT_FRAUD' || typology === 'TASK_SCAM') {
      selectedQuestions.push(CONTROLLED_QUESTION_LIBRARY.Q8_INVESTMENT_TASK_SCAM);
      selectedQuestions.push(CONTROLLED_QUESTION_LIBRARY.Q5_SECRECY_PRESSURE);
    } else if (typology === 'EMERGENCY_IMPERSONATION' || reasons.includes('RC03')) {
      selectedQuestions.push(CONTROLLED_QUESTION_LIBRARY.Q6_EMERGENCY_IMPERSONATION);
      selectedQuestions.push(CONTROLLED_QUESTION_LIBRARY.Q4_URGENCY_PRESSURE);
    } else {
      // Default Elevated Social Engineering Risk (New recipient + high amount / night-time)
      selectedQuestions.push(CONTROLLED_QUESTION_LIBRARY.Q2_CREDENTIAL_REQUEST);
      selectedQuestions.push(CONTROLLED_QUESTION_LIBRARY.Q4_URGENCY_PRESSURE);
      if (isSafetyMode || amount >= 20000) {
        selectedQuestions.push(CONTROLLED_QUESTION_LIBRARY.Q5_SECRECY_PRESSURE);
      }
    }

    // Cap strictly at 4 questions max (UX Principle)
    const finalQuestions = selectedQuestions.slice(0, 4);

    const initialSignals: HumanCoachSignals = {
      recent_social_contact: false,
      credential_request: false,
      authority_impersonation: false,
      urgency_pressure: false,
      secrecy_pressure: false,
      emergency_impersonation: false,
      advance_payment_scam: false,
      investment_or_task_scam: false,
      uncertainty_signal: false,
      total_positive_signals: 0
    };

    const session: HumanCoachSession = {
      session_id: sessionId,
      transaction_id: txnId,
      customer_wallet: context.customer_wallet,
      recipient_wallet: context.recipient_wallet,
      amount_bdt: amount,
      status: 'ACTIVE',
      selected_questions: finalQuestions,
      current_question_index: 0,
      answers: [],
      signals: initialSignals,
      created_at: new Date().toISOString()
    };

    this.saveSession(session);

    return {
      should_intervene: true,
      intervention_reason: `Elevated social-engineering risk detected (Score: ${(riskScore * 100).toFixed(0)}%, New Recipient: ${isNewRecipient}).`,
      intervention_reason_bn: `লেনদেনে সম্ভাব্য সামাজিক ইঞ্জিনিয়ারিং বা প্রতারণার ঝুঁকি শনাক্ত হয়েছে (স্কোর: ${(riskScore * 100).toFixed(0)}%)।`,
      session_id: sessionId,
      total_questions_count: finalQuestions.length,
      first_question: finalQuestions[0],
      questions: finalQuestions,
      initial_signals: initialSignals
    };
  }

  /**
   * Record Customer Answer and dynamically fetch next question or final explanation
   */
  public recordAnswer(
    sessionId: string,
    questionId: HumanCoachQuestionId,
    answer: HumanCoachAnswerValue
  ): {
    session: HumanCoachSession;
    is_completed: boolean;
    next_question?: HumanCoachQuestion;
    safety_explanation?: HumanCoachSafetyExplanation;
    generated_signals: HumanCoachSignals;
  } {
    let session = this.activeSessions.get(sessionId);
    if (!session) {
      // Re-create synthetic session if not found in memory
      session = {
        session_id: sessionId,
        transaction_id: `TXN-SYN-${Date.now()}`,
        customer_wallet: 'W-SYN-004512',
        recipient_wallet: 'W-SYN-091177',
        amount_bdt: 18500,
        status: 'ACTIVE',
        selected_questions: [
          CONTROLLED_QUESTION_LIBRARY.Q1_RECENT_CONTACT,
          CONTROLLED_QUESTION_LIBRARY.Q2_CREDENTIAL_REQUEST,
          CONTROLLED_QUESTION_LIBRARY.Q4_URGENCY_PRESSURE
        ],
        current_question_index: 0,
        answers: [],
        signals: {
          recent_social_contact: false,
          credential_request: false,
          authority_impersonation: false,
          urgency_pressure: false,
          secrecy_pressure: false,
          emergency_impersonation: false,
          advance_payment_scam: false,
          investment_or_task_scam: false,
          uncertainty_signal: false,
          total_positive_signals: 0
        },
        created_at: new Date().toISOString()
      };
      this.saveSession(session);
    }

    // Record the answer
    const answerRecord = {
      question_id: questionId,
      answer,
      timestamp: new Date().toISOString(),
      signal_generated: answer === 'YES' ? CONTROLLED_QUESTION_LIBRARY[questionId]?.signal_key : undefined
    };
    session.answers.push(answerRecord);

    // Update structured signals
    if (answer === 'YES') {
      if (questionId === 'Q1_RECENT_CONTACT') session.signals.recent_social_contact = true;
      if (questionId === 'Q2_CREDENTIAL_REQUEST') session.signals.credential_request = true;
      if (questionId === 'Q3_AUTHORITY_IMPERSONATION') session.signals.authority_impersonation = true;
      if (questionId === 'Q4_URGENCY_PRESSURE') session.signals.urgency_pressure = true;
      if (questionId === 'Q5_SECRECY_PRESSURE') session.signals.secrecy_pressure = true;
      if (questionId === 'Q6_EMERGENCY_IMPERSONATION') session.signals.emergency_impersonation = true;
      if (questionId === 'Q7_ADVANCE_PAYMENT_SCAM') session.signals.advance_payment_scam = true;
      if (questionId === 'Q8_INVESTMENT_TASK_SCAM') session.signals.investment_or_task_scam = true;
    } else if (answer === 'NOT_SURE') {
      session.signals.uncertainty_signal = true;
    }

    // Calculate total positive signals
    session.signals.total_positive_signals = Object.entries(session.signals)
      .filter(([k, v]) => k !== 'total_positive_signals' && v === true)
      .length;

    // Adaptive Branching: If customer explicitly answered NO to Q1 (No recent contact),
    // and no other red flag was selected, we can prune remaining questions to avoid annoying the user
    if (questionId === 'Q1_RECENT_CONTACT' && answer === 'NO' && session.selected_questions.length > 2) {
      session.selected_questions = [
        CONTROLLED_QUESTION_LIBRARY.Q1_RECENT_CONTACT,
        CONTROLLED_QUESTION_LIBRARY.Q2_CREDENTIAL_REQUEST
      ];
    }

    session.current_question_index += 1;
    const isCompleted = session.current_question_index >= session.selected_questions.length;

    let nextQuestion: HumanCoachQuestion | undefined;
    let safetyExplanation: HumanCoachSafetyExplanation | undefined;

    if (isCompleted) {
      session.status = 'COMPLETED';
      session.completed_at = new Date().toISOString();
      safetyExplanation = this.buildSafetyExplanation(session.signals);
      session.safety_explanation = safetyExplanation;
    } else {
      nextQuestion = session.selected_questions[session.current_question_index];
    }

    this.saveSession(session);

    return {
      session,
      is_completed: isCompleted,
      next_question: nextQuestion,
      safety_explanation: safetyExplanation,
      generated_signals: session.signals
    };
  }

  /**
   * Record customer's final safety decision (Cancel, Review, Continue)
   */
  public recordCustomerChoice(
    sessionId: string,
    choice: HumanCoachCustomerChoice
  ): { success: boolean; session: HumanCoachSession } {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Human Scam Coach session ${sessionId} not found`);
    }

    session.customer_final_choice = choice;
    if (choice === 'CANCEL_PAYMENT') {
      session.status = 'CANCELLED';
    } else {
      session.status = 'COMPLETED';
    }

    this.saveSession(session);

    // Audit log
    auditService.logAction(
      session.customer_wallet,
      `HUMAN_COACH_CHOICE_${choice}`,
      session.transaction_id,
      {
        session_id: sessionId,
        choice,
        signals: session.signals,
        positive_count: session.signals.total_positive_signals
      }
    );

    return { success: true, session };
  }

  /**
   * Get active or stored session
   */
  public getSession(sessionId: string): HumanCoachSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Build customer-facing explanation and warning sign breakdown
   */
  public buildSafetyExplanation(signals: HumanCoachSignals): HumanCoachSafetyExplanation {
    const warningSignsEn: string[] = [];
    const warningSignsBn: string[] = [];

    if (signals.recent_social_contact) {
      warningSignsEn.push('Someone recently contacted you instructing you to make this payment');
      warningSignsBn.push('কেউ সম্প্রতি আপনাকে ফোন বা মেসেজে এই টাকা পাঠানোর নির্দেশ দিয়েছেন');
    }
    if (signals.credential_request) {
      warningSignsEn.push('Someone asked for your confidential PIN, OTP, or verification code');
      warningSignsBn.push('অনুরোধকারী আপনার গোপন পিন, ওটিপি বা ভেরিফিকেশন কোড জানতে চেয়েছেন');
    }
    if (signals.authority_impersonation) {
      warningSignsEn.push('The caller claimed to be from customer care, MFS, or an official agency');
      warningSignsBn.push('যোগাযোগকারী ব্যক্তি কাস্টমার কেয়ার বা অফিসিয়াল সংস্থার মিথ্যা পরিচয় দিয়েছেন');
    }
    if (signals.urgency_pressure) {
      warningSignsEn.push('You were pressured to complete the payment immediately');
      warningSignsBn.push('বিলম্ব না করে দ্রুত টাকা পাঠানোর জন্য অতিরিক্ত মানসিক চাপ দেওয়া হয়েছে');
    }
    if (signals.secrecy_pressure) {
      warningSignsEn.push('You were instructed not to disclose this transaction to anyone');
      warningSignsBn.push('লেনদেনের বিষয়টি পরিবার বা অন্য কাউকে জানাতে নিষেধ করা হয়েছে');
    }
    if (signals.emergency_impersonation) {
      warningSignsEn.push('The payment was requested under an urgent hospital or relative emergency claim');
      warningSignsBn.push('হাসপাতাল বা আত্মীয়ের জরুরি বিপদের কথা বলে টাকা চাওয়া হয়েছে');
    }
    if (signals.advance_payment_scam) {
      warningSignsEn.push('You were asked to pay money upfront to receive a prize, lottery, or refund');
      warningSignsBn.push('লটারি বা পুরস্কারের অর্থ পাওয়ার জন্য অগ্রিম ফি দাবি করা হয়েছে');
    }
    if (signals.investment_or_task_scam) {
      warningSignsEn.push('High daily returns or task earnings were promised for sending funds');
      warningSignsBn.push('অনলাইন টাস্ক বা বিনিয়োগে অস্বাভাবিক উচ্চ মুনাফার প্রতিশ্রুতি দেওয়া হয়েছে');
    }
    if (signals.uncertainty_signal) {
      warningSignsEn.push('You indicated uncertainty regarding the identity or purpose of the transfer');
      warningSignsBn.push('প্রাপকের পরিচয় বা উদ্দেশ্য সম্পর্কে আপনার মধ্যে কিছুটা অনিশ্চয়তা রয়েছে');
    }

    let elevation: 'HIGH_RISK_SCAM_CONFIRMED' | 'ELEVATED_CAUTION' | 'LOW_FRICTION_CLEARED' = 'LOW_FRICTION_CLEARED';
    let headlineEn = 'Payment Verification Completed';
    let headlineBn = 'লেনদেন যাচাইকরণ সম্পন্ন হয়েছে';
    let guidanceEn = 'You may proceed with your transaction safely.';
    let guidanceBn = 'আপনি সতর্কতার সাথে আপনার লেনদেন সম্পন্ন করতে পারেন।';

    if (signals.credential_request || (signals.authority_impersonation && signals.recent_social_contact) || signals.advance_payment_scam) {
      elevation = 'HIGH_RISK_SCAM_CONFIRMED';
      headlineEn = '⚠️ Warning: Common Scam Warning Signs Detected!';
      headlineBn = '⚠️ সাবধান: আপনার লেনদেনে প্রতারণার স্পষ্ট লক্ষণ পাওয়া গেছে!';
      guidanceEn = 'Never share your PIN/OTP. upay will never ask for credentials. We strongly advise cancelling this transfer and verifying via official hotline 16268.';
      guidanceBn = 'কখনো কারো সাথে পিন বা ওটিপি শেয়ার করবেন না। উপায় কোনো ফি চায় না। টাকা পাঠানো বাতিল করে ১৬২৬৮ নম্বরে কল করে নিশ্চিত হোন।';
    } else if (signals.total_positive_signals > 0 || signals.uncertainty_signal) {
      elevation = 'ELEVATED_CAUTION';
      headlineEn = '⚠️ Caution: Please Verify Recipient Independently';
      headlineBn = '⚠️ সতর্কতা: প্রাপকের পরিচয় পুনরায় যাচাই করুন';
      guidanceEn = 'Before sending, call your acquaintance on a previously known trusted number to confirm.';
      guidanceBn = 'টাকা পাঠানোর আগে পরিচিত মানুষটির পূর্বের আসল নম্বরে ফোন করে নিশ্চিত হোন।';
    }

    return {
      headline_en: headlineEn,
      headline_bn: headlineBn,
      matched_warning_signs_en: warningSignsEn.length > 0 ? warningSignsEn : ['No critical social engineering indicators reported by customer.'],
      matched_warning_signs_bn: warningSignsBn.length > 0 ? warningSignsBn : ['গ্রাহক দ্বারা কোনো গুরুতর সামাজিক ইঞ্জিনিয়ারিং লক্ষণ রিপোর্ট করা হয়নি।'],
      recommended_guidance_en: guidanceEn,
      recommended_guidance_bn: guidanceBn,
      risk_elevation: elevation
    };
  }
}

export const humanScamCoach = new HumanScamCoachService();
