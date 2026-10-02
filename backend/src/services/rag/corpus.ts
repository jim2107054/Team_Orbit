import { RagCollection } from './retrieval-service.js';

export interface CorpusDocument {
  doc_id: string;
  collection: RagCollection;
  title: string;
  source: string;
  language: 'en' | 'bn' | 'mixed';
  typology?: string;
  content: string;
  /**
   * A dense list of the phrases a victim actually uses when reporting this
   * scam, in Bangla, Banglish and English, indexed as its own chunk.
   *
   * This is multi-representation indexing, and here it is load-bearing rather
   * than an optimisation. A customer reporting in Bangla script shares almost
   * no surface form with an explanatory paragraph written in English, so
   * without a chunk that is itself Bangla, a Bangla-script query cannot match
   * the right typology — measurably so on the local embedder, which compares
   * character n-grams rather than meaning. Giving each typology one chunk per
   * language surface makes retrieval work in the language customers report in.
   */
  query_surface?: string;
}

/**
 * The seed knowledge base for retrieval.
 *
 * This is what grounds the model's typology choice and customer advice. Each
 * typology document carries the local script in Bangla and Banglish as well as
 * English, because customers report scams in all three and the embedding has to
 * match against whichever they used. Advisory documents hold pre-vetted wording
 * so generated customer replies can be anchored to text that has already passed
 * the response-safety rules.
 */
export const SCAM_CORPUS: CorpusDocument[] = [
  {
    doc_id: 'TYP-CUSTOMER-CARE',
    collection: 'scam_typology',
    title: 'Fake customer care / head office impersonation',
    source: 'upay Shield typology catalogue',
    language: 'mixed',
    typology: 'SCAM_CALL_CUSTOMER_CARE',
    content: `A caller claims to be from upay head office, upay customer care, or a partner bank's fraud desk. They assert the customer's account has a problem — suspicious activity, a pending block, a failed KYC check — and that it can only be fixed immediately over the phone.

Typical script elements: "আমি উপায় হেড অফিস থেকে বলছি", "ami upay head office theke bolchi", "your account will be closed within one hour", "verification er jonno taka pathate hobe", "send a security deposit and it will be refunded automatically".

The decisive indicator is a request to move money or disclose a PIN or OTP in order to "verify", "secure", "unlock" or "activate" the account. No genuine upay or bank process ever requires that. A second indicator is pressure to stay on the call and not consult anyone, often framed as a confidentiality requirement.

Customer guidance: end the call, do not transfer anything, and call the official helpline printed inside the app. If money has already been sent, report it within the first hour, when recovery is most likely.`,
    query_surface: `উপায় হেড অফিস থেকে ফোন করে বলেছে অ্যাকাউন্ট বন্ধ হয়ে যাবে। কাস্টমার কেয়ার সেজে ফোন। ভেরিফিকেশনের জন্য টাকা পাঠাতে বলেছে। অ্যাকাউন্ট বন্ধের ভয় দেখিয়ে টাকা নিয়েছে। হেড অফিসের ম্যানেজার বলে পরিচয় দিয়েছে। পিন ওটিপি চেয়েছে।
upay head office theke call korechilo. customer care sheje phone diyeche. account bondho hoye jabe bollo. verification er jonno taka pathate bollo. manager bole porichoy dilo. pin otp cheyeche. bikash upay office theke bolchi.
fake customer care call, head office impersonation, account will be closed, verification deposit demanded, asked for PIN and OTP, pretended to be upay staff.`
  },
  {
    doc_id: 'TYP-SIM-BLOCK',
    collection: 'scam_typology',
    title: 'SIM block and SIM replacement threat',
    source: 'upay Shield typology catalogue',
    language: 'mixed',
    typology: 'SCAM_CALL_SIM_BLOCK',
    content: `The caller says the customer's SIM or NID registration is invalid and the number will be disconnected today unless it is "re-verified". They ask for the OTP that arrives on the handset, which is in fact the code authorising a SIM swap or a wallet login from the attacker's device.

Typical script elements: "আপনার সিম বন্ধ হয়ে যাবে", "apnar sim bondho hoye jabe", "NID verification update", "read me the code you just received", "bio-metric re-registration".

This typology is dangerous because the customer loses the phone number itself, which is the recovery channel for the wallet. Once the SIM is swapped, the attacker can reset the wallet PIN. An OTP request from an inbound caller is always hostile: OTPs exist to authorise actions the customer started, never to confirm identity to someone who rang them.

Customer guidance: never read out a received code. Visit an official operator service centre for any genuine SIM or NID issue.`,
    query_surface: `আপনার সিম বন্ধ হয়ে যাবে বলে ফোন করেছে। এনআইডি ভেরিফিকেশন আপডেট করতে বলেছে। ফোনে আসা কোড বা ওটিপি চেয়েছে। সিম রিপ্লেসমেন্ট করে টাকা তুলে নিয়েছে। বায়োমেট্রিক পুনঃনিবন্ধনের কথা বলেছে।
apnar sim bondho hoye jabe bollo. nid verification update korte bollo. phone e asha code otp cheyeche. sim replacement kore taka tule niyeche. biometric re-registration.
SIM will be blocked, NID re-verification, asked me to read out the OTP code, SIM swap, number disconnected today.`
  },
  {
    doc_id: 'TYP-ACCOUNT-VERIFY',
    collection: 'scam_typology',
    title: 'Account verification deposit',
    source: 'upay Shield typology catalogue',
    language: 'mixed',
    typology: 'SCAM_CALL_ACCOUNT_VERIFY',
    content: `The customer is told that to lift a limit, complete KYC, or prove the account is active, they must send a "verification amount" to a specified wallet, which will be returned immediately. The amount is often oddly precise to appear procedural, and the destination is a personal wallet rather than any official channel.

Typical script elements: "verification er jonno 5000 taka pathan", "ভেরিফিকেশন ডিপোজিট", "the amount will bounce back automatically within 5 minutes", "this is a refundable security check".

A genuine limit increase or KYC upgrade never requires an outbound transfer. The destination being a customer wallet (W-…) rather than a named merchant or biller is itself strong evidence.

Customer guidance: no deposit is ever needed to verify an account. Treat any such request as a scam regardless of how official the caller sounds.`,
    query_surface: `ভেরিফিকেশনের জন্য টাকা জমা দিতে বলেছে। ভেরিফিকেশন ডিপোজিট চেয়েছে। লিমিট বাড়াতে টাকা পাঠাতে বলেছে। কেওয়াইসি আপডেটের জন্য টাকা চেয়েছে। টাকা সাথে সাথে ফেরত আসবে বলেছে।
verification er jonno taka pathate bollo. verification deposit chailo. limit barate taka lagbe bollo. kyc update er jonno taka. taka sathe sathe ferot ashbe bollo.
verification deposit, refundable security check, send money to verify account, KYC upgrade fee, amount will bounce back.`
  },
  {
    doc_id: 'TYP-RELATIVE-EMERGENCY',
    collection: 'scam_typology',
    title: 'Relative emergency impersonation',
    source: 'upay Shield typology catalogue',
    language: 'mixed',
    typology: 'SCAM_CALL_RELATIVE_EMERGENCY',
    content: `The caller impersonates a family member or a hospital, police station, or employer acting on their behalf, and describes an emergency requiring money at once — an accident, an arrest, a medical admission, a detained traveller.

Typical script elements: "আপনার ছেলে দুর্ঘটনায় পড়েছে", "apnar chele accident koreche", "hospital e vorti korate hobe", "ami tomar mama bolchi, notun number", "do not tell anyone, send it quickly".

Distinguishing features: the caller uses a new or unknown number and explains it away; they create extreme time pressure; and they discourage the customer from calling the relative back on the known number. Emotional distress is the mechanism — it suppresses the habit of verifying.

Customer guidance: hang up and call the relative directly on the number already saved in the phone. A real emergency survives a two-minute verification call.`,
    query_surface: `আপনার ছেলে দুর্ঘটনায় পড়েছে বলে ফোন করেছে। হাসপাতালে ভর্তি করাতে টাকা পাঠাতে বলেছে। আত্মীয় সেজে নতুন নম্বর থেকে ফোন। মামা চাচা সেজে টাকা চেয়েছে। কাউকে বলতে নিষেধ করেছে। পুলিশ ধরেছে বলে টাকা চেয়েছে।
apnar chele accident koreche bollo. hospital e vorti korate taka lagbe. attiyo sheje notun number theke phone. mama chacha sheje taka chailo. karake bolte nishedh korlo.
relative emergency, son had an accident, hospital admission money, calling from a new number, do not tell anyone, urgent family crisis.`
  },
  {
    doc_id: 'TYP-REFUND-MISTAKE',
    collection: 'scam_typology',
    title: 'Wrong-number refund and reversal trick',
    source: 'upay Shield typology catalogue',
    language: 'mixed',
    typology: 'SCAM_CALL_REFUND',
    content: `The customer is told money was sent to them by mistake and is asked to send it back. Either no money actually arrived and the customer is looking at a forged SMS, or the incoming funds were themselves stolen and the customer is being used to launder them, which can leave their own wallet implicated.

Typical script elements: "vul kore apnar number e taka chole gese", "ভুল করে টাকা চলে গেছে, ফেরত দিন", a screenshot of a transfer confirmation, "please send it back to this other number instead".

A redirect is the key signal: a genuine mistaken transfer is reversed through the provider, and the funds go back to the original sender's wallet, never onward to a third number the caller nominates.

Customer guidance: do not send anything back directly. Report the incoming transaction to the provider and let the reversal run through official channels.`,
    query_surface: `ভুল করে আপনার নম্বরে টাকা চলে গেছে বলে ফেরত চেয়েছে। ভুল নম্বরে টাকা পাঠিয়েছে বলে দাবি করেছে। অন্য নম্বরে টাকা ফেরত পাঠাতে বলেছে। টাকা ফেরত দিতে চাপ দিয়েছে। স্ক্রিনশট পাঠিয়ে টাকা দাবি করেছে।
vul kore apnar number e taka chole gese bollo. vul number e taka pathiyechi bole ferot chailo. onno number e ferot pathate bollo. screenshot pathiye taka dabi korlo.
wrong number transfer, sent by mistake please return it, asked me to send it back to a different number, forged transfer screenshot.`
  },
  {
    doc_id: 'TYP-PRIZE-LOTTERY',
    collection: 'scam_typology',
    title: 'Prize, lottery and giveaway advance fee',
    source: 'upay Shield typology catalogue',
    language: 'mixed',
    typology: 'SCAM_CALL_PRIZE',
    content: `The customer is told they have won a lottery, a mobile operator draw, a brand giveaway or a government grant, and that a processing fee, tax, or courier charge must be paid before the prize is released.

Typical script elements: "আপনি ১০ লক্ষ টাকা জিতেছেন", "apni lottery jitechen", "প্রসেসিং ফি পাঠান", "registration fee 2500 taka", "the prize is reserved for the next 30 minutes only".

The structure is an advance fee: a small certain payment against a large uncertain reward. Follow-up demands escalate after the first payment succeeds. Customers who entered no draw are frequently told their number was selected automatically, which removes the need for the story to be plausible.

Customer guidance: a genuine prize never requires an upfront payment. Stop responding and block the number.`,
    query_surface: `আমি লটারি জিতেছি বলে ফোন করেছে। ১০ লক্ষ টাকা জিতেছেন বলেছে। পুরস্কার পেতে প্রসেসিং ফি পাঠাতে বলেছে। লটারি জিতেছি প্রসেসিং ফি চেয়েছে। রেজিস্ট্রেশন ফি দিতে বলেছে। গিফট বা পুরস্কারের কথা বলে টাকা চেয়েছে।
ami lottery jitechi bollo. dosh lokkho taka jitechen bollo. puroshkar pete processing fee pathate bollo. registration fee dite bollo. gift puroshkar er kotha bole taka chailo.
won a lottery, prize money, processing fee to release the prize, registration fee, advance fee for a giveaway, operator draw winner.`
  },
  {
    doc_id: 'TYP-INVESTMENT',
    collection: 'scam_typology',
    title: 'Fake investment and guaranteed-return schemes',
    source: 'upay Shield typology catalogue',
    language: 'mixed',
    typology: 'SCAM_CALL_INVESTMENT',
    content: `The customer is offered an investment with guaranteed daily or weekly returns, often via a Telegram or WhatsApp group, a referral from an acquaintance, or an app with a convincing dashboard showing fictitious profits.

Typical script elements: "প্রতিদিন ১০% লাভ", "daily 10% profit guaranteed", "crypto trading signal group", "deposit 5000 and withdraw 7000 in one week", "add two friends to unlock withdrawal".

Early small withdrawals are honoured to build confidence, then larger balances are frozen behind a new fee or a tax. The visible dashboard balance is not money; it is a display. Requiring referrals before withdrawal is a reliable marker.

Customer guidance: guaranteed returns do not exist. Treat an unwithdrawable balance plus a new fee demand as a confirmed loss and stop depositing.`,
    query_surface: `প্রতিদিন লাভের কথা বলে বিনিয়োগ করতে বলেছে। গ্যারান্টিযুক্ত লাভের প্রতিশ্রুতি দিয়েছে। টেলিগ্রাম গ্রুপে ইনভেস্টমেন্টের কথা বলেছে। টাকা জমা দিলে দ্বিগুণ হবে বলেছে। উইথড্র করতে দিচ্ছে না।
protidin profit er kotha bole invest korte bollo. guaranteed lav er proti shruti. telegram group e investment. taka deposit korle dignun hobe bollo. withdraw korte dicche na.
guaranteed daily profit, crypto trading signal group, deposit and double your money, cannot withdraw balance, fake investment app dashboard.`
  },
  {
    doc_id: 'TYP-TASK-SCAM',
    collection: 'scam_typology',
    title: 'Online task and commission earning scam',
    source: 'upay Shield typology catalogue',
    language: 'mixed',
    typology: 'SCAM_CALL_TASK',
    content: `The customer is recruited for simple paid tasks — liking videos, writing reviews, completing app installs — and is paid small amounts initially. They are then moved onto "prepaid" task sets requiring the customer to deposit their own money to unlock a higher commission tier.

Typical script elements: "ঘরে বসে দিনে ৫০০ টাকা আয়", "ghore boshe income korun", "YouTube like kore taka", "deposit 3000 to unlock VIP tasks", "complete the merchant order and get 30% commission".

The deposit stage is where the loss happens; everything before it is a trust-building cost paid by the fraudster. Targets are often students and first-time earners, which matters for how the warning should be worded — non-judgemental, because shame suppresses reporting.

Customer guidance: legitimate work never requires the worker to pay to receive tasks. Stop depositing and report the group.`,
    query_surface: `ঘরে বসে আয়ের কাজ দিয়েছে। ইউটিউব ভিডিও লাইক করে টাকা আয়ের কথা বলেছে। টাস্ক আনলক করতে টাকা জমা দিতে বলেছে। কমিশনের লোভ দেখিয়ে টাকা নিয়েছে। ভিআইপি টাস্কের জন্য ডিপোজিট চেয়েছে।
ghore boshe income korun bollo. youtube like kore taka income. task unlock korte deposit korte bollo. commission er lobh dekhiye taka nilo. vip task er jonno deposit chailo.
work from home earning, like videos for money, deposit to unlock VIP tasks, commission scheme, prepaid task set, merchant order commission.`
  },
  {
    doc_id: 'TYP-LEGAL-THREAT',
    collection: 'scam_typology',
    title: 'Police, court and legal coercion',
    source: 'upay Shield typology catalogue',
    language: 'mixed',
    typology: 'SCAM_CALL_LEGAL_THREAT',
    content: `The caller claims to be police, CID, a court official, a customs officer or a regulator, and alleges the customer is implicated in money laundering, a drug parcel, or an arrest warrant. Payment of a "fine", "bail" or "clearance fee" is demanded to avoid immediate arrest.

Typical script elements: "আপনার নামে মামলা হয়েছে", "apnar name e warrant ache", "CID theke bolchi", "pay the fine now or we will arrest you tonight", "do not discuss this, it is a confidential investigation".

Fear plus enforced secrecy is the mechanism. No law-enforcement body in Bangladesh collects fines or bail through a mobile wallet transfer, and none requires a citizen to keep an investigation secret from their own family.

Customer guidance: end the call. Verify any genuine legal matter in person at the local station. Never pay a fine by wallet transfer.`,
    query_surface: `আপনার নামে মামলা হয়েছে বলে ফোন করেছে। সিআইডি থেকে বলছি বলে ভয় দেখিয়েছে। জরিমানা না দিলে গ্রেফতার করবে বলেছে। পুলিশ সেজে টাকা চেয়েছে। ওয়ারেন্ট আছে বলে টাকা দাবি করেছে। কাউকে না বলার শর্ত দিয়েছে।
apnar name e mamla hoyeche bollo. cid theke bolchi bole voy dekhalo. jorimana na dile greftar korbe. police sheje taka chailo. warrant ache bole taka dabi korlo.
police called about a case, CID officer, pay the fine or be arrested, arrest warrant, customs parcel, confidential investigation, bail payment demanded.`
  },
  {
    doc_id: 'ADV-NEVER-SHARE',
    collection: 'customer_advisory',
    title: 'Approved wording: credentials are never requested',
    source: 'upay Shield approved customer communications',
    language: 'mixed',
    typology: undefined,
    content: `Approved advisory wording, safe to reuse in customer replies.

English: upay will never ask you for your PIN, your OTP or your password — not by phone, not by SMS, and not in any chat. Anyone who asks for them is not from upay. If you have already shared a code, change your PIN from inside the app straight away and contact the official helpline.

Bangla: উপায় কখনোই আপনার পিন, ওটিপি বা পাসওয়ার্ড জানতে চাইবে না — ফোনে নয়, এসএমএসে নয়, কোনো চ্যাটেও নয়। যে কেউ এগুলো চাইলে সে উপায়ের কেউ নয়। যদি আপনি ইতিমধ্যে কোড শেয়ার করে ফেলেন, সাথে সাথে অ্যাপ থেকে পিন পরিবর্তন করুন এবং অফিসিয়াল হেল্পলাইনে যোগাযোগ করুন।

Note for generated replies: stating that upay will never ask for a PIN or OTP is a warning and is permitted. Asking the customer to provide one is prohibited.`
  },
  {
    doc_id: 'ADV-GOLDEN-HOUR',
    collection: 'customer_advisory',
    title: 'Approved wording: act within the first hour',
    source: 'upay Shield approved customer communications',
    language: 'mixed',
    content: `Approved advisory wording for a customer who has already sent money.

English: Report it now. Recovery is most likely in the first hour, before the money is moved on or cashed out. Keep the transaction reference, the number that contacted you, and any SMS or screenshots — those are what the investigation works from. We cannot promise the funds will be recovered, but reporting immediately gives the best chance.

Bangla: এখনই রিপোর্ট করুন। প্রথম এক ঘণ্টার মধ্যে টাকা উদ্ধারের সম্ভাবনা সবচেয়ে বেশি, কারণ এরপর টাকা হাতবদল হয়ে ক্যাশ-আউট হয়ে যায়। লেনদেনের রেফারেন্স, যে নম্বর থেকে যোগাযোগ করা হয়েছে, এবং এসএমএস বা স্ক্রিনশট সংরক্ষণ করুন — তদন্ত এগুলোর উপর ভিত্তি করেই হয়। টাকা ফেরত পাওয়ার নিশ্চয়তা আমরা দিতে পারি না, তবে সাথে সাথে রিপোর্ট করলে সম্ভাবনা সবচেয়ে ভালো থাকে।

Note for generated replies: never state or imply that a refund, reversal or recovery is guaranteed.`
  },
  {
    doc_id: 'POL-RESPONSE-SAFETY',
    collection: 'policy',
    title: 'Customer response safety rules',
    source: 'upay Shield response policy',
    language: 'en',
    content: `Rules every customer-facing message must satisfy, enforced by the response safety validator.

Prohibited: requesting a PIN, OTP, password or full card number; directing the customer to an unverified third-party phone number, link or app; promising a refund, reversal, unblock or recovery; stating a case outcome before a human review has been recorded; blaming the customer for being deceived.

Required: explain what will happen next; state that evidence is being examined rather than asserting a conclusion; give at least one concrete action the customer can take; keep the tone non-judgemental, because customers who feel blamed stop reporting and the loss window closes.

Permitted and encouraged: the warning that upay will never ask for a PIN or OTP. A naive keyword filter rejects this sentence because it contains "PIN" and "OTP"; the validator distinguishes a warning about credentials from a request for them.`
  },
  {
    doc_id: 'POL-EVIDENCE-VERDICT',
    collection: 'policy',
    title: 'Evidence verdict policy and its limits',
    source: 'upay Shield investigation policy',
    language: 'en',
    content: `An investigation returns one of three evidence verdicts and nothing stronger.

CONSISTENT: the records located support the customer's account of events. INCONSISTENT: a falsifiable discriminator exists and the records contradict the claim. This is not a finding that the customer is lying. INSUFFICIENT_DATA: the evidence does not settle the question, which is the correct answer whenever a source is unavailable rather than empty.

The verdict is decided by deterministic policy, never by a generative model. A language model may summarise and explain evidence, draft a customer reply, or extract structure from free text, but it may not set the verdict, the fraud risk score, or the human-review decision.

A denial of authorisation against a transaction that does exist resolves to INSUFFICIENT_DATA plus mandatory human review. It never resolves to customer fraud.

"Lookup failed" and "nothing found" must stay distinct. Reporting an unavailable source as empty would silently convert missing evidence into exculpatory evidence.`
  },
  {
    doc_id: 'POL-GOLDEN-HOUR-OPS',
    collection: 'policy',
    title: 'Golden-hour recovery operations',
    source: 'upay Shield recovery policy',
    language: 'en',
    content: `Recoverability decays sharply with elapsed time because funds move through mule layers and are cashed out at agent points.

Within 60 minutes, the money is usually still sitting in the first recipient wallet and a hold has a realistic chance of preserving it. Between one and six hours, it has typically been layered across several wallets, and recovery depends on reaching the hop that still holds a balance. Beyond that, cash-out at an agent counter is normally complete and recovery becomes an investigative matter rather than an operational one.

Prioritisation therefore follows observable balance and hop position, not the disputed amount. A hold on a wallet that no longer holds funds recovers nothing regardless of how large the original loss was.

Recommendations must be traceable to observed transactions. Where downstream flow cannot be observed, the assessment says so instead of assuming the funds are still reachable.`
  }
];
