import type { ReasonCodeDetail } from '../types.js';

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
  },
  RC12: {
    code: 'RC12',
    label_en: 'Seasonal festival or salary surge aligns with customer baseline',
    label_bn: 'লেনদেনের পরিমাণ বেশি হলেও উৎসব/বেতনকালীন স্বাভাবিক আচরণের সাথে সঙ্গতিপূর্ণ',
    weight: -0.25, // Reduces false positive penalty
    description: 'Amount and velocity match expected temporal multiplier for this segment during festival/salary period.'
  },
  RC13: {
    code: 'RC13',
    label_en: 'Transaction remains highly anomalous even after seasonal adjustment',
    label_bn: 'উৎসব বা বিশেষ সময়ের ছাড় দেওয়ার পরও লেনদেনটি চরম অস্বাভাবিক ও ঝুঁকিপূর্ণ',
    weight: 0.38,
    description: 'Transaction exceeds 4x seasonal upper bound with high-risk device/network indicators.'
  },
  RC14: {
    code: 'RC14',
    label_en: 'Unusual cross-channel switch from primary APP behavior to USSD',
    label_bn: 'অ্যাপ ব্যবহারকারী অ্যাকাউন্ট থেকে হঠাৎ অচেনা ইউএসএসডি (USSD) চ্যানেলে লেনদেন',
    weight: 0.30,
    description: 'High-value transaction initiated on USSD/feature-phone channel for a historically 95%+ smartphone app user.'
  },
  RC15: {
    code: 'RC15',
    label_en: 'Device capability and transaction channel mismatch',
    label_bn: 'ডিভাইস এবং লেনদেন চ্যানেলের মধ্যে অস্বাভাবিক অমিল',
    weight: 0.25,
    description: 'Feature-phone device identifier attempting smart mobile application endpoint calls.'
  },
  RC16: {
    code: 'RC16',
    label_en: 'Customer Safety Mode is active: elevated verification friction applied',
    label_bn: 'গ্রাহক সুরক্ষা মোড সক্রিয় রয়েছে: অতিরিক্ত নিরাপত্তা যাচাইকরণ ও সতর্কতা প্রযোজ্য',
    weight: 0.35,
    description: 'Customer voluntarily activated temporary high-protection Safety Mode.'
  },
  RC17: {
    code: 'RC17',
    label_en: 'Human Scam Coach: Customer confirmed credential/OTP request',
    label_bn: 'হিউম্যান কোচ: গ্রাহক নিশ্চিত করেছেন যে গোপন পিন বা ওটিপি কোড চাওয়া হয়েছে',
    weight: 0.45,
    description: 'Customer directly answered YES to receiving a PIN, OTP, or verification code request.'
  },
  RC18: {
    code: 'RC18',
    label_en: 'Human Scam Coach: Customer confirmed authority/customer care impersonation',
    label_bn: 'হিউম্যান কোচ: গ্রাহক নিশ্চিত করেছেন যে ভুয়া কাস্টমার কেয়ার বা অফিসিয়াল পরিচয় দেওয়া হয়েছে',
    weight: 0.40,
    description: 'Customer directly confirmed requester claimed to be customer care or bank staff.'
  },
  RC19: {
    code: 'RC19',
    label_en: 'Human Scam Coach: Customer confirmed artificial urgency or secrecy pressure',
    label_bn: 'হিউম্যান কোচ: গ্রাহক নিশ্চিত করেছেন যে অবিলম্বে পাঠানোর চাপ বা গোপন রাখার নির্দেশ ছিল',
    weight: 0.30,
    description: 'Customer confirmed presence of coercive urgency or isolation pressure.'
  },
  RC20: {
    code: 'RC20',
    label_en: 'Human Scam Coach: Customer confirmed prize or investment scheme',
    label_bn: 'হিউম্যান কোচ: গ্রাহক নিশ্চিত করেছেন যে পুরস্কার, লটারি বা বেশি লাভের প্রতিশ্রুতি দেওয়া হয়েছে',
    weight: 0.35,
    description: 'Customer confirmed advance fee prize or task-based investment promised returns.'
  }
};
