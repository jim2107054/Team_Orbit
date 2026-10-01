'use client';

import React, { useState, useEffect } from 'react';
import { 
  Send, AlertTriangle, ShieldCheck, Volume2, 
  Search, Flag, ArrowRight, RotateCcw, Lock, CheckCircle2,
  PhoneCall, MessageSquareWarning, Sparkles
} from 'lucide-react';

export const CustomerApp: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<'send' | 'pause_verify' | 'hold_assist' | 'protected' | 'scam_check'>('send');
  const [senderWallet] = useState('W-SYN-004512');
  const [recipientNumber, setRecipientNumber] = useState('01399-991823');
  const [amount, setAmount] = useState('18500');
  const [isLoading, setIsLoading] = useState(false);
  const [coolingTimer, setCoolingTimer] = useState(25);
  const [coolingActive, setCoolingActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [language, setLanguage] = useState<'bn' | 'en'>('bn');

  // Risk Score response state
  const [evaluationResult, setEvaluationResult] = useState<any>(null);

  // Scam check state
  const [scamText, setScamText] = useState(
    'জরুরি বিপদ! আপনার চাচাতো ভাই লন্ডনে অসুস্থ হয়ে হাসপাতালে আছেন। জরুরি চিকিৎসার জন্য এখনি ১৮,৫০০ টাকা ০১৩৯৯-৯৯১৮২৩ নম্বরে পাঠান!'
  );
  const [scamAnalysis, setScamAnalysis] = useState<any>(null);
  const [isAnalyzingScam, setIsAnalyzingScam] = useState(false);

  // Countdown timer for Pause & Verify
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (coolingActive && coolingTimer > 0) {
      timer = setTimeout(() => {
        setCoolingTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [coolingActive, coolingTimer]);

  const handleSendMoney = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/score/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txn: {
            type: 'P2P_SEND',
            sender_wallet: senderWallet,
            receiver_wallet: 'W-SYN-091177',
            amount_bdt: parseFloat(amount) || 18500,
            channel: 'APP',
            device_id: 'D-SYN-33210'
          },
          context: {
            scamcheck_session_flag: false
          }
        })
      });

      const data = await res.json();
      setEvaluationResult(data);

      if (data.action === 'PAUSE_VERIFY') {
        setCoolingTimer(25);
        setCoolingActive(true);
        setActiveScreen('pause_verify');
      } else if (data.action === 'HOLD_ASSIST') {
        setActiveScreen('hold_assist');
      } else {
        alert('Transaction Allowed Successfully!');
      }
    } catch (err) {
      console.error(err);
      // Fallback
      setActiveScreen('pause_verify');
      setCoolingTimer(25);
      setCoolingActive(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSend = () => {
    setActiveScreen('protected');
  };

  const handleSpeech = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'bn' ? 'bn-BD' : 'en-US';
      utterance.rate = 0.9;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAnalyzeScam = async () => {
    setIsAnalyzingScam(true);
    try {
      const res = await fetch('/api/v1/scamcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: scamText })
      });
      const data = await res.json();
      setScamAnalysis(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzingScam(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row items-start justify-center gap-8 py-4">
      {/* Mobile Simulator Frame (360px width standard) */}
      <div className="w-full max-w-[380px] bg-slate-950 rounded-[40px] p-3 shadow-2xl border-4 border-slate-800 relative">
        {/* Mobile Notch / Speaker */}
        <div className="w-36 h-5 bg-slate-900 rounded-full mx-auto mb-3 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-slate-950 mr-2"></div>
          <div className="w-10 h-1 bg-slate-800 rounded-full"></div>
        </div>

        {/* Screen Content */}
        <div className="bg-[#0b132b] rounded-[30px] min-h-[640px] p-4 flex flex-col justify-between overflow-hidden relative">
          
          {/* Top Bar inside App */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-cyan-400">upay</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold">
                🛡️ Shield Active
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-medium"
              >
                {language === 'bn' ? 'English' : 'বাংলা'}
              </button>
            </div>
          </div>

          {/* SCREEN 1: SEND MONEY (MAIN) */}
          {activeScreen === 'send' && (
            <div className="flex-1 py-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-white">
                    {language === 'bn' ? 'টাকা পাঠান (Send Money)' : 'Send Money'}
                  </h2>
                  <button
                    onClick={() => setActiveScreen('scam_check')}
                    className="text-xs text-cyan-400 flex items-center gap-1 font-semibold hover:underline"
                  >
                    <MessageSquareWarning className="w-3.5 h-3.5" />
                    {language === 'bn' ? 'মেসেজ যাচাই' : 'Scam Check'}
                  </button>
                </div>

                {/* Account Balance Card */}
                <div className="bg-gradient-to-r from-blue-900/60 to-cyan-900/40 p-3.5 rounded-2xl border border-cyan-500/20 mb-4">
                  <span className="text-[11px] text-slate-300">
                    {language === 'bn' ? 'উপলব্ধ ব্যালেন্স' : 'Available Balance'}
                  </span>
                  <div className="text-xl font-extrabold text-white mt-0.5">৳ ২৪,৫০০.০০</div>
                  <div className="text-[10px] text-cyan-300 mt-1">
                    {language === 'bn' ? 'অ্যাকাউন্ট: রহিমা বেগম (W-004512)' : 'Account: Rahima Begum (W-004512)'}
                  </div>
                </div>

                {/* Recipient Input */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">
                      {language === 'bn' ? 'প্রাপকের নম্বর (Recipient Number)' : 'Recipient Phone Number'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={recipientNumber}
                        onChange={(e) => setRecipientNumber(e.target.value)}
                        className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                        placeholder="01399-XXXXXX"
                      />
                      <span className="absolute right-3 top-2.5 text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                        {language === 'bn' ? 'নতুন নম্বর' : 'New'}
                      </span>
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">
                      {language === 'bn' ? 'টাকার পরিমাণ (Amount BDT)' : 'Amount (BDT)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-bold">৳</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-cyan-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="text-[10px] text-amber-400/90 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {language === 'bn' ? 'স্বাভাবিক গড় লেনদেনের চেয়ে ৭ গুণ বেশি' : '7x higher than usual baseline'}
                    </div>
                  </div>

                  {/* Quick Shortcut Pills */}
                  <div className="flex gap-2 pt-1">
                    {['1000', '5000', '18500'].map((val) => (
                      <button
                        key={val}
                        onClick={() => setAmount(val)}
                        className={`text-xs px-2.5 py-1 rounded-lg border ${
                          amount === val
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        ৳{parseInt(val).toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleSendMoney}
                disabled={isLoading}
                className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <span>যাচাই হচ্ছে...</span>
                ) : (
                  <>
                    <span>{language === 'bn' ? 'টাকা পাঠান' : 'Proceed to Send'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* SCREEN 2: PAUSE & VERIFY (M5 MODAL - SRS §10.3) */}
          {activeScreen === 'pause_verify' && (
            <div className="flex-1 flex flex-col justify-between py-2 animate-fadeIn">
              <div>
                {/* Warning Header */}
                <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 text-center mb-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center mb-1.5 animate-bounce">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-sm text-red-200 font-bangla">
                    {language === 'bn' ? '⚠ থামুন! একটু যাচাই করে নিন' : '⚠ Pause! Please Verify First'}
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-1">
                    {language === 'bn'
                      ? 'টাকা পাঠানোর আগে নিচের সতর্কতাগুলো মনোযোগ দিয়ে পড়ুন।'
                      : 'Review the security signals below before sending money.'}
                  </p>
                </div>

                {/* Reason Bullets (Reason-Aware & Plain-Language) */}
                <div className="space-y-2 text-xs text-slate-200 font-bangla bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">•</span>
                    <span>
                      {language === 'bn'
                        ? 'প্রাপকের নম্বরটি আপনার জন্য একদম নতুন এবং পূর্বে এ বিষয়ে অভিযোগ এসেছে।'
                        : 'This recipient is new to you and negative reports exist.'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>
                      {language === 'bn'
                        ? 'কেউ জরুরি বিপদের কথা বলে টাকা চাইলে আগে অন্য পরিচিত নম্বরে ফোন করে নিশ্চিত হোন।'
                        : 'If someone claims an urgent emergency, call their verified number first.'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span>
                      {language === 'bn'
                        ? 'আপনার পিন বা ওটিপি কাউকে দেবেন না — উপায় কখনো তা চায় না।'
                        : 'Never share your PIN/OTP — upay will never ask for it.'}
                    </span>
                  </div>
                </div>

                {/* Voice Read-out & Countdown Timer */}
                <div className="flex items-center justify-between mt-4 px-1">
                  <button
                    onClick={() =>
                      handleSpeech(
                        language === 'bn'
                          ? 'থামুন! প্রাপকের নম্বরটি নতুন। জরুরি বিপদের কথা বলে টাকা চাইলে আগে অন্য নম্বরে ফোন করে নিশ্চিত হোন। আপনার গোপন পিন কাউকে বলবেন না।'
                          : 'Stop and verify. This recipient is new. Never share your PIN or OTP.'
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-semibold hover:bg-cyan-900/60"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isSpeaking ? 'শুনছেন...' : '🔊 শুনুন (Voice)'}</span>
                  </button>

                  <div className="text-xs font-bold text-amber-400 bg-amber-950/50 border border-amber-500/30 px-3 py-1.5 rounded-lg">
                    ⏱ {coolingTimer > 0 ? `${coolingTimer} সেকেন্ড` : 'সময় শেষ'}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Safe Cancel vs Continue */}
              <div className="space-y-2 mt-4">
                <button
                  onClick={handleCancelSend}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{language === 'bn' ? 'বাতিল করুন (নিরাপদ)' : 'Cancel Transfer (Safe)'}</span>
                </button>

                <button
                  disabled={coolingTimer > 0}
                  onClick={() => alert('Proceeded after cooling-off period.')}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {language === 'bn'
                    ? coolingTimer > 0
                      ? `অপেক্ষা করুন (${coolingTimer}s)`
                      : 'আমি নিশ্চিত, টাকা পাঠান'
                    : coolingTimer > 0
                    ? `Wait (${coolingTimer}s)`
                    : 'I am certain, Send Money'}
                </button>

                <button
                  onClick={() => {
                    alert('Community report submitted to security analysts.');
                  }}
                  className="w-full text-center text-[11px] text-red-400 hover:underline pt-1 font-medium flex items-center justify-center gap-1"
                >
                  <Flag className="w-3 h-3" />
                  <span>{language === 'bn' ? '⚑ সন্দেহজনক নম্বর হিসেবে রিপোর্ট করুন' : 'Report this number'}</span>
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 3: HOLD & ASSIST (M5 HIGH RISK T3) */}
          {activeScreen === 'hold_assist' && (
            <div className="flex-1 flex flex-col justify-between py-2 animate-fadeIn">
              <div>
                <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-2">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-sm text-amber-200 font-bangla">
                    {language === 'bn'
                      ? 'লেনদেনটি সাময়িক অপেক্ষমাণ রাখা হয়েছে'
                      : 'Transaction Temporarily on Hold'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-2 font-bangla">
                    {language === 'bn'
                      ? 'আপনার অ্যাকাউন্ট ও জমানো টাকার সুরক্ষার জন্য লেনদেনটি অতিরিক্ত যাচাইয়ের জন্য পাঠানো হয়েছে। এটি আপনার আর্থিক সুরক্ষার অংশ।'
                      : 'For your protection, this transaction has been queued for security verification.'}
                  </p>
                </div>

                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">কেস রেফারেন্স:</span>
                    <span className="font-mono text-cyan-400 font-bold">CASE-2026-00417</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">রিভিউ সময়:</span>
                    <span className="text-white">৮-১০ মিনিট</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <button
                  onClick={() => alert('Connecting to 24/7 Security Helpline 16268...')}
                  className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>{language === 'bn' ? 'সাপোর্টে কথা বলুন (১৬২৬৮)' : 'Call Support (16268)'}</span>
                </button>
                <button
                  onClick={() => setActiveScreen('send')}
                  className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  {language === 'bn' ? 'মূল স্ক্রিনে ফিরে যান' : 'Back to Home'}
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 4: PROTECTED RECEIPT (PV-06) */}
          {activeScreen === 'protected' && (
            <div className="flex-1 flex flex-col justify-between py-2 animate-fadeIn">
              <div>
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="font-extrabold text-sm text-emerald-200 font-bangla">
                    {language === 'bn' ? 'ভালো সিদ্ধান্ত! আপনি সুরক্ষিত রইলেন' : 'Great Decision! You are Protected'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-2 font-bangla">
                    {language === 'bn'
                      ? 'টাকা পাঠানোর অনুরোধ বাতিল করে আপনি সম্ভাব্য প্রতারণা থেকে ৳১৮,৫০০ টাকা রক্ষা করেছেন।'
                      : 'By canceling this transaction, you prevented a potential loss of ৳18,500.'}
                  </p>
                </div>

                {/* Financial Literacy Tip */}
                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-cyan-500/20 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>{language === 'bn' ? 'নিরাপত্তা টিপস (Tip)' : 'Safety Tip'}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {language === 'bn'
                      ? 'প্রতারকরা সবসময় মানুষের আবেগ ও ভীতি কাজে লাগায়। যেকোনো বড় অঙ্কের টাকা পাঠানোর আগে পরিবারের অন্তত একজন সদস্যকে জানান।'
                      : 'Fraudsters rely on urgent pressure. Always verify emergency calls with family before sending money.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveScreen('send')}
                className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{language === 'bn' ? 'নতুন লেনদেন করুন' : 'Make Another Transfer'}</span>
              </button>
            </div>
          )}

          {/* SCREEN 5: SCAM CHECK TOOL (M6 NLP Analyzer) */}
          {activeScreen === 'scam_check' && (
            <div className="flex-1 flex flex-col justify-between py-2 animate-fadeIn">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MessageSquareWarning className="w-4 h-4 text-cyan-400" />
                    <span>{language === 'bn' ? 'সন্দেহজনক মেসেজ স্ক্যানার' : 'Scam Check Scanner'}</span>
                  </h3>
                  <button
                    onClick={() => setActiveScreen('send')}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    বন্ধ করুন
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 mb-2">
                  {language === 'bn'
                    ? 'আপনার কাছে আসা এসএমএস বা হোয়াটসঅ্যাপ মেসেজ এখানে পেস্ট করুন:'
                    : 'Paste suspicious SMS, note, or WhatsApp text below:'}
                </p>

                <textarea
                  rows={4}
                  value={scamText}
                  onChange={(e) => setScamText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-bangla"
                  placeholder="মেসেজ পেস্ট করুন..."
                />

                <button
                  onClick={handleAnalyzeScam}
                  disabled={isAnalyzingScam}
                  className="w-full mt-2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isAnalyzingScam ? 'যাচাই হচ্ছে...' : 'স্ক্যান করুন (Analyze)'}</span>
                </button>

                {/* Analysis Result Card */}
                {scamAnalysis && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs animate-fadeIn">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-slate-400">ফলাফল:</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          scamAnalysis.verdict === 'LIKELY_SCAM'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {scamAnalysis.verdict === 'LIKELY_SCAM' ? '🚨 প্রতারণার বার্তা (Likely Scam)' : 'স্বাভাবিক'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-200 font-bangla mt-1">
                      {language === 'bn' ? scamAnalysis.advice_bn : scamAnalysis.advice_en}
                    </p>

                    {scamAnalysis.highlighted_phrases?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {scamAnalysis.highlighted_phrases.map((ph: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded bg-red-950/60 text-red-300 text-[10px] border border-red-500/20"
                          >
                            ⚠️ {ph}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 text-center text-[10px] text-slate-500">
                🔒 উপায় কখনোই আপনার গোপন পিন বা ওটিপি জানতে চায় না।
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Side Context Card explaining the Architecture to Judges */}
      <div className="flex-1 max-w-xl glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-cyan-400">
          <ShieldCheck className="w-5 h-5" />
          <h3 className="font-bold text-base text-white">Why This Customer Experience Wins (D1 & D11)</h3>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Traditional fraud systems only block cards after the money is gone. 
          <strong className="text-cyan-300"> upay Shield intervenes right at the confirmation screen</strong> before 
          the customer taps confirm — directly addressing the 89.3% unrecovered social-engineering fraud problem in Bangladesh.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="font-bold text-slate-200 block mb-1">🇧🇩 Authentic Bangla Copy</span>
            <p className="text-slate-400 text-[11px]">
              Simple, jargon-free copy with voice TTS read-out designed for rural and low-literacy users.
            </p>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="font-bold text-slate-200 block mb-1">⏱ Reversible Friction</span>
            <p className="text-slate-400 text-[11px]">
              Customers are never permanently locked out by an ML algorithm. Cooling-off timer allows safe reconsideration.
            </p>
          </div>
        </div>

        {evaluationResult && (
          <div className="mt-4 p-4 bg-slate-900 rounded-2xl border border-cyan-500/20 text-xs">
            <span className="font-mono text-cyan-400 text-[11px] block mb-2">
              ⚡ LIVE BACKEND TELEMETRY ({evaluationResult.latency_ms}ms)
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>Risk Tier: <strong className="text-red-400">{evaluationResult.risk_tier}</strong></div>
              <div>Calibrated Score: <strong>{(evaluationResult.risk_score * 100).toFixed(0)}%</strong></div>
              <div>Action: <strong className="text-amber-300">{evaluationResult.action}</strong></div>
              <div>Model Version: <span className="font-mono text-slate-400">{evaluationResult.versions.model}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
