import type { TypologyId } from '../types.js';

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
    description: 'Caller pretends to be victim\'s relative, police officer, or doctor claiming urgent accident or arrest.',
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
  'hoise': 'হয়েছে',
  'hoyeche': 'হয়েছে',
  'hoyegese': 'হয়ে গেছে',
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
  'taratari': 'তাড়াতাড়ি',
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
  // Common Banglish spellings of "wrong" and "I have sent". These were absent, so a
  // short Banglish complaint such as "vai 5k taka vul number e pathaisi" scored only
  // one dictionary hit and was mis-detected as English.
  'vul': 'ভুল',
  'vhul': 'ভুল',
  'pathaisi': 'পাঠিয়েছি',
  'pathaichi': 'পাঠিয়েছি',
  'pathiyechi': 'পাঠিয়েছি',
  'pathailam': 'পাঠিয়েছি',
  'gese': 'গেছে',
  'geche': 'গেছে',
  'lottery': 'লটারি',
  'puroshkar': 'পুরস্কার',
  'upohar': 'উপহার',
  'jitechen': 'জিতেছেন',
  'lav': 'লাভ',
  'binayog': 'বিনিয়োগ',
  'fee': 'ফি',
  'charge': 'চার্জ',
  'acc': 'অ্যাকাউন্ট',
  'account': 'অ্যাকাউন্ট',
  'bondho': 'বন্ধ',
  'block': 'ব্লক',
  'suspend': 'স্থগিত'
};
