import { ReasonCodeDetail, TypologyId } from './types.js';

export const REASON_CODES: Record<string, ReasonCodeDetail> = {
  RC01: {
    code: 'RC01',
    label_en: 'Large first-time send to a new recipient',
    label_bn: 'নতুন প্রাপকের কাছে প্রথমবার বড় অঙ্কের টাকা',
    weight: 0.32,
    description: 'Amount is >= 3x personal baseline and recipient wallet has no prior transaction history with sender.'
  },
  RC02: {
    code: 'RC02',
    label_en: 'Unusual hour for this user (off-hours pattern)',
    label_bn: 'এই ব্যবহারকারীর জন্য অস্বাভাবিক সময় (গভীর রাত/ভোর)',
    weight: 0.18,
    description: 'Transaction performed outside user normal 90-day activity window.'
  },
  RC03: {
    code: 'RC03',
    label_en: 'New device login with recent PIN/SIM change',
    label_bn: 'নতুন ডিভাইসে লগইন ও সাম্প্রতিক পিন/সিম পরিবর্তন',
    weight: 0.40,
    description: 'ATO signature: device changed < 24h and PIN reset < 48h prior to send.'
  },
  RC04: {
    code: 'RC04',
    label_en: 'Recipient is closely linked to a flagged mule/gambling ring',
    label_bn: 'প্রাপক সন্দেহজনক মানি লন্ডারিং বা গ্যাম্বলিং চক্রের সাথে যুক্ত',
    weight: 0.35,
    description: 'Recipient wallet is within 1-2 hops of a known mule collector or gambling cluster.'
  },
  RC05: {
    code: 'RC05',
    label_en: 'Rapid pass-through / fan-out velocity detected',
    label_bn: 'টাকা ঢোকার সাথে সাথে দ্রুত অন্যত্র সরিয়ে নেওয়ার প্রবণতা',
    weight: 0.28,
    description: 'Recipient account forwards >= 80% of inbound balance within 10 minutes.'
  },
  RC06: {
    code: 'RC06',
    label_en: 'Abnormal fan-in pattern (many senders to one wallet)',
    label_bn: 'বহু ব্যক্তির কাছ থেকে একটি ওয়ালেটে টাকা জমার অস্বাভাবিক গতি',
    weight: 0.25,
    description: 'Recipient received payments from >= 8 distinct senders within past 1 hour.'
  },
  RC07: {
    code: 'RC07',
    label_en: 'Message matches known fraud/scam script',
    label_bn: 'বার্তা বা অনুরোধটি পরিচিত প্রতারণার ধরনের সাথে মিলে গেছে',
    weight: 0.30,
    description: 'Scam Check analysis identified impersonation, prize lottery, or fake refund script.'
  },
  RC08: {
    code: 'RC08',
    label_en: 'Agent cash-out pattern deviates from regional peer benchmark',
    label_bn: 'এজেন্টের ক্যাশ-আউট লেনদেন সমগোত্রীয়দের চেয়ে অস্বাভাবিক',
    weight: 0.22,
    description: 'Agent exhibits burst cash-outs with structured amounts and repetitive counterparties.'
  },
  RC09: {
    code: 'RC09',
    label_en: 'High balance-drain ratio in single transaction',
    label_bn: 'ওয়ালেটের সিংহভাগ ব্যালেন্স একবারে তুলে নেওয়ার চেষ্টা',
    weight: 0.20,
    description: 'Transaction requests >= 90% of total available account balance.'
  },
  RC10: {
    code: 'RC10',
    label_en: 'Negative community reports logged against recipient',
    label_bn: 'অন্যান্য গ্রাহকদের কাছ থেকে এই নম্বরের বিরুদ্ধে অভিযোগ রয়েছে',
    weight: 0.26,
    description: 'Recipient number reported >= 2 times by verified accounts in past 30 days.'
  },
  RC11: {
    code: 'RC11',
    label_en: 'Transaction burst synchronized with live gambling/event window',
    label_bn: 'নির্দিষ্ট লাইভ ইভেন্ট/খেলার সময়ে অস্বাভাবিক লেনদেন বৃদ্ধি',
    weight: 0.24,
    description: 'Spike in micro-transactions aligned with synthetic sports tournament schedule.'
  }
};

export const BANGLA_TEMPLATES = {
  PV_01_NEW_RECIPIENT: {
    id: 'PV-01',
    headline_bn: 'থামুন! প্রাপকের নম্বরটি আপনার জন্য নতুন',
    headline_en: 'Pause! This recipient is new to you',
    body_bn: 'আপনি আগে কখনো এই নম্বরে টাকা পাঠাননি। নিশ্চিত না হয়ে কাউকে টাকা পাঠাবেন না।',
    body_en: 'You have never sent money to this number before. Please confirm carefully before sending.'
  },
  PV_02_REPORTED: {
    id: 'PV-02',
    headline_bn: 'সতর্কতা! এই নম্বরের বিরুদ্ধে পূর্বে প্রতারণার অভিযোগ আছে',
    headline_en: 'Warning! Past fraud complaints exist against this number',
    body_bn: 'অন্যান্য গ্রাহকরা এই নম্বরের বিরুদ্ধে প্রতারণার অভিযোগ করেছেন। লেনদেন বাতিল করার পরামর্শ দেওয়া হচ্ছে।',
    body_en: 'Other customers have reported this number for suspicious activity. We advise canceling.'
  },
  PV_03_EMERGENCY: {
    id: 'PV-03',
    headline_bn: 'জরুরি বিপদের কথা বলে টাকা চাওয়া হচ্ছে কি?',
    headline_en: 'Is someone claiming an urgent emergency?',
    body_bn: 'কেউ কি আত্মীয় বা পুলিশ সেজে জরুরি বিপদের কথা বলেছে? আগে পরিচিত অন্য নম্বরে ফোন করে নিশ্চিত হোন।',
    body_en: 'Did someone claim to be a relative or official in distress? Call their trusted number first.'
  },
  PV_04_PIN_OTP: {
    id: 'PV-04',
    headline_bn: 'গোপন পিন বা ওটিপি কখনোই কাউকে দেবেন না',
    headline_en: 'Never share your secret PIN or OTP with anyone',
    body_bn: 'উপায় বা কোনো ব্যাংক কখনো আপনার পিন অথবা ওটিপি চায় না।',
    body_en: 'upay or banks will NEVER ask for your PIN or OTP.'
  },
  PV_05_HOLD: {
    id: 'PV-05',
    headline_bn: 'নিরাপত্তার স্বার্থে লেনদেনটি সাময়িক অপেক্ষমাণ রাখা হয়েছে',
    headline_en: 'For your security, this transaction is on temporary hold',
    body_bn: 'আপনার অ্যাকাউন্ট সুরক্ষিত রাখতে আমাদের সিকিউরিটি টিম লেনদেনটি যাচাই করছে। সহায়তার জন্য সাপোর্ট বাটনে চাপুন।',
    body_en: 'Our security team is verifying this transaction to protect your funds. Tap Support for help.'
  },
  PV_06_PROTECTED: {
    id: 'PV-06',
    headline_bn: 'চমৎকার সিদ্ধান্ত! আপনি সম্ভাব্য প্রতারণা থেকে সুরক্ষিত রইলেন',
    headline_en: 'Great decision! You protected yourself from potential fraud',
    body_bn: 'লেনদেনটি বাতিল করে আপনি সঠিক সিদ্ধান্ত নিয়েছেন। মনে রাখবেন: উপায় কখনোই লটারি বা পুরস্কারের জন্য টাকা চায় না।',
    body_en: 'By canceling this send, you kept your money safe. Tip: Always verify caller identities.'
  }
};

export const TYPOLOGY_META: Record<TypologyId, { name: string; description: string; signature: string }> = {
  T1_EMERGENCY_IMPERSONATION: {
    name: 'Emergency-Relative Impersonation',
    description: 'Fraudster calls victim posing as family/hospital official requesting immediate medical/bail funds.',
    signature: 'Off-hours, new recipient, amount >= 3x user baseline, rapid cash-out within 15 min.'
  },
  T2_ATO_DRAIN: {
    name: 'Account Takeover (ATO) & Balance Drain',
    description: 'Victim PIN compromised via phishing/SIM swap; attacker logs in from new device and drains wallet.',
    signature: 'New device ID + PIN reset flag < 24h + 90%+ balance transfer to unknown wallet.'
  },
  T3_REFUND_MISTAKE: {
    name: 'Sent-by-Mistake Fake Refund Scam',
    description: 'Scammer sends fake SMS claiming accidental transfer, then calls victim to return "refund" money.',
    signature: 'Small unsolicited deposit followed by rapid outgoing send to a different third wallet.'
  },
  T4_PRIZE_LOTTERY: {
    name: 'Lottery / Prize / Ancient Treasure Scam',
    description: 'Victims promised lottery winnings or prize processing fee, sending money to centralized collector.',
    signature: 'Multiple rural senders transferring uniform amounts (e.g. ৳2,000-৳5,000) to single collector.'
  },
  T5_MULE_COLLECTOR: {
    name: 'Mule Collector Layering Ring',
    description: 'Coordinated network where funds from 10+ victims flow into a staging wallet and fan out to agents.',
    signature: 'High in-degree fan-in within 1 hour followed by layered 2-3 hop transfers and agent cash-out.'
  },
  T6_STAGED_INVESTMENT: {
    name: 'Staged Task/Investment Scam (Held-out Test Typology)',
    description: 'Victim lured with small initial returns, then coerced into escalating large investments.',
    signature: 'Periodic micro-returns followed by sharp escalating transfers (> ৳25,000).'
  },
  T7_GAMBLING_HUB: {
    name: 'Online Illegal Gambling Settlement Hub',
    description: 'Illegal betting operations taking micro-deposits synchronized with live sports match windows.',
    signature: 'Hundreds of micro-payments (৳200-৳1,000) during match hours + immediate high-velocity cash-outs.'
  },
  T8_AGENT_CASH_OUT_MULE: {
    name: 'Complicit / Abused Agent Cash-Out Mule',
    description: 'Corrupt or unvigilant agent cashing out illicit ring funds with structured amounts below monitoring limits.',
    signature: 'Agent cash-out volume > 5x peer group, repetitive shared device fingerprints, off-hours cash-outs.'
  },
  T9_GHOST_WALLET: {
    name: 'Synthetic Identity / Ghost Wallets',
    description: 'Wallets created with rented/fake NID with minimal legitimate organic transactions used only as conduits.',
    signature: 'Account age < 14 days, shared device with multiple wallets, 0 utility/merchant payments, 100% pass-through.'
  },
  T10_PHISHING_APK: {
    name: 'Malicious APK / Session Hijacking',
    description: 'Victim tricked into installing malicious helper app which intercepts OTP and executes remote transfer.',
    signature: 'Session event APP_INSTALL followed by automated API calls and sudden device credential update.'
  },

  // Conversational Scam Typologies
  SCAM_CALL_CUSTOMER_CARE: {
    name: 'Fake Customer Care / Helpline Impersonation',
    description: 'Caller falsely claims to be upay/bank official, demands PIN/OTP or money transfer for system update.',
    signature: 'Authority claim + account block threat + OTP/PIN request + urgent transfer request.'
  },
  SCAM_CALL_SIM_BLOCK: {
    name: 'SIM Deactivation / Biometric Re-registration Scam',
    description: 'Scammer poses as BTRC/Telecom operator threatening instant SIM block unless secret code is provided.',
    signature: 'BTRC/SIM block threat + urgency + OTP verification claim.'
  },
  SCAM_CALL_ACCOUNT_VERIFY: {
    name: 'Fake KYC / Account Verification Fraud',
    description: 'Caller demands personal credentials, OTP, or test transfer to "verify" or "reactivate" wallet.',
    signature: 'Verification narrative + secrecy request + credential harvesting.'
  },
  SCAM_CALL_RELATIVE_EMERGENCY: {
    name: 'Relative Distress / Emergency Call Scam',
    description: 'Caller pretends to be victim’s relative, police officer, or doctor claiming urgent accident or arrest.',
    signature: 'Emotional distress + secrecy + urgent payment request to third-party number.'
  },
  SCAM_CALL_REFUND: {
    name: 'Accidental Money Sent / Fake Refund Call',
    description: 'Scammer calls claiming money was sent by mistake to customer wallet, demanding immediate return.',
    signature: 'Fake accidental transfer story + time pressure + recipient payment destination.'
  },
  SCAM_CALL_PRIZE: {
    name: 'Prize / Lottery / Gift Winning Scam Call',
    description: 'Victim told they won a car/lottery and must pay processing/registration fee immediately.',
    signature: 'High-value prize claim + upfront registration fee + urgency.'
  },
  SCAM_CALL_INVESTMENT: {
    name: 'High-Yield Investment / Crypto / Forex Scam Call',
    description: 'Caller promises guaranteed daily/monthly returns with zero risk upon sending initial capital.',
    signature: 'Guaranteed profit promises + urgency + external group/channel link.'
  },
  SCAM_CALL_TASK: {
    name: 'Online Task / Part-time Job Commission Scam',
    description: 'Victim lured into social media liking/reviewing tasks, required to deposit funds to unlock earnings.',
    signature: 'Work-from-home task story + small initial payout + deposit unlock requirement.'
  },
  SCAM_CALL_LEGAL_THREAT: {
    name: 'Law Enforcement / Arrest Warrant Threat Scam',
    description: 'Caller impersonates DB police, CID, or court official claiming legal cases and demands settlement fee.',
    signature: 'Arrest warrant/legal case threat + secrecy + payment settlement destination.'
  }
};

export const BANGLISH_NORMALIZATION_MAP: Record<string, string> = {
  // Verbs & Pronouns
  'bolchi': 'বলছি',
  'boltesi': 'বলছি',
  'bolsen': 'বলেছেন',
  'den': 'দিন',
  'dien': 'দিন',
  'diben': 'দেবেন',
  'bolen': 'বলুন',
  'pathan': 'পাঠান',
  'pathaben': 'পাঠাবেন',
  'korben': 'করবেন',
  'koren': 'করুন',
  'korun': 'করুন',
  'lagbe': 'লাগবে',
  'achen': 'আছেন',
  'ase': 'আছে',
  'hoise': 'হয়েছে',
  'hoyeche': 'হয়েছে',
  'hoyegese': 'হয়ে গেছে',
  'jabe': 'যাবে',
  'gele': 'গেলে',
  'amar': 'আমার',
  'apnar': 'আপনার',
  'apnake': 'আপনাকে',
  'tumi': 'তুমি',
  'apni': 'আপনি',
  // Common keywords
  'taka': 'টাকা',
  'ekhon': 'এখন',
  'ekhoni': 'এখনই',
  'druto': 'দ্রুত',
  'taratari': 'তাড়াতাড়ি',
  'bipod': 'বিপদ',
  'bipode': 'বিপদে',
  'rokto': 'রক্ত',
  'ashpatal': 'হাসপাতাল',
  'hospital': 'হাসপাতাল',
  'daktar': 'ডাক্তার',
  'police': 'পুলিশ',
  'thana': 'থানা',
  'mamla': 'মামলা',
  'atock': 'আটক',
  'gopon': 'গোপন',
  'karoko': 'কাউকে',
  'bolben na': 'বলবেন না',
  'janaben na': 'জানাবেন না',
  'bhul': 'ভুল',
  'lottery': 'লটারি',
  'puroshkar': 'পুরস্কার',
  'upohar': 'উপহার',
  'jitechen': 'জিতেছেন',
  'lav': 'লাভ',
  'binayog': 'বিনিয়োগ',
  'fee': 'ফি',
  'charge': 'চার্জ',
  'acc': 'অ্যাকাউন্ট',
  'account': 'অ্যাকাউন্ট',
  'bondho': 'বন্ধ',
  'block': 'ব্লক',
  'suspend': 'স্থগিত'
};

