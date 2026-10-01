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
    <div className="flex flex-col lg:flex-row items-start justify-center gap-8 py-2">
      {/* Mobile Simulator Frame */}
      <div className="w-full max-w-[380px] bg-[#FFFFFF] rounded-[24px] p-3 shadow-xl border border-[#DADFE5] relative">
        {/* Notch / Speaker */}
        <div className="w-32 h-4 bg-[#F7F7F7] rounded-full mx-auto mb-3 flex items-center justify-center border border-[#DADFE5]">
          <div className="w-2.5 h-2.5 rounded-full bg-[#DADFE5] mr-2"></div>
          <div className="w-8 h-1 bg-[#DADFE5] rounded-full"></div>
        </div>

        {/* Screen Content */}
        <div className="bg-[#FFFFFF] border border-[#DADFE5] rounded-[16px] min-h-[620px] p-4 flex flex-col justify-between overflow-hidden relative">
          
          {/* Top Bar inside App */}
          <div className="flex items-center justify-between pb-3 border-b border-[#DADFE5]">
            <div className="flex items-center gap-1.5">
              <span className="font-poppins font-extrabold text-sm text-[#FF9F43]">upay</span>
              <span className="text-[10px] px-2 py-0.5 rounded-[4px] bg-[#FF9F43]/15 text-[#FF9F43] font-nunito font-bold">
                🛡️ Shield Active
              </span>
            </div>
            <button
              onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
              className="text-[11px] px-2.5 py-0.5 rounded-[5px] bg-[#F7F7F7] text-[#212B36] hover:bg-[#FF9F43]/10 border border-[#DADFE5] font-nunito font-semibold transition-colors"
            >
              {language === 'bn' ? 'English' : 'বাংলা'}
            </button>
          </div>

          {/* SCREEN 1: SEND MONEY (MAIN) */}
          {activeScreen === 'send' && (
            <div className="flex-1 py-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-poppins font-bold text-[#000000]">
                    {language === 'bn' ? 'টাকা পাঠান (Send Money)' : 'Send Money'}
                  </h2>
                  <button
                    onClick={() => setActiveScreen('scam_check')}
                    className="text-xs font-nunito text-[#FF9F43] flex items-center gap-1 font-bold hover:underline"
                  >
                    <MessageSquareWarning className="w-3.5 h-3.5" />
                    {language === 'bn' ? 'মেসেজ স্ক্যান' : 'Scam Check'}
                  </button>
                </div>

                {/* Account Balance Card */}
                <div className="bg-[#212B36] p-3.5 rounded-none border border-[#212B36] text-white mb-4 shadow-sm">
                  <span className="text-[11px] font-nunito text-slate-300">
                    {language === 'bn' ? 'উপলব্ধ ব্যালেন্স' : 'Available Balance'}
                  </span>
                  <div className="text-xl font-poppins font-extrabold mt-0.5">৳ ২৪,৫০০.০০</div>
                  <div className="text-[10px] font-nunito text-[#FF9F43] mt-1">
                    {language === 'bn' ? 'অ্যাকাউন্ট: রহিমা বেগম (W-004512)' : 'Account: Rahima Begum (W-004512)'}
                  </div>
                </div>

                {/* Recipient Input */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-nunito font-semibold text-[#212529] block mb-1">
                      {language === 'bn' ? 'প্রাপকের নম্বর (Recipient Number)' : 'Recipient Phone Number'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={recipientNumber}
                        onChange={(e) => setRecipientNumber(e.target.value)}
                        className="w-full dream-input px-3 py-2 text-sm text-[#212529] focus:outline-none"
                        placeholder="01399-XXXXXX"
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] bg-[#FF0000]/10 text-[#FF0000] border border-[#FF0000]/30 px-2 py-0.5 rounded-[4px] font-nunito font-bold">
                        {language === 'bn' ? 'নতুন নম্বর' : 'New'}
                      </span>
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="text-xs font-nunito font-semibold text-[#212529] block mb-1">
                      {language === 'bn' ? 'টাকার পরিমাণ (Amount BDT)' : 'Amount (BDT)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-[#646B72] text-sm font-bold">৳</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full dream-input pl-7 pr-3 py-2 text-sm font-poppins font-bold text-[#000000] focus:outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="text-[10px] font-nunito text-[#FF9F43] mt-1 flex items-center gap-1 font-semibold">
                      <AlertTriangle className="w-3 h-3 text-[#FF9F43]" />
                      {language === 'bn' ? 'স্বাভাবিক গড় লেনদেনের চেয়ে ৭ গুণ বেশি' : '7x higher than usual baseline'}
                    </div>
                  </div>

                  {/* Quick Shortcut Pills */}
                  <div className="flex gap-2 pt-1">
                    {['1000', '5000', '18500'].map((val) => (
                      <button
                        key={val}
                        onClick={() => setAmount(val)}
                        className={`text-xs font-nunito px-3 py-1 rounded-[5px] border transition-colors ${
                          amount === val
                            ? 'bg-[#FF9F43] border-[#FF9F43] text-white font-bold'
                            : 'bg-[#F7F7F7] border-[#DADFE5] text-[#212529] hover:bg-[#FFFFFF]'
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
                className="w-full mt-5 dream-btn-primary py-2.5 text-sm flex items-center justify-center gap-2 font-poppins"
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
            <div className="flex-1 flex flex-col justify-between py-1 animate-fadeIn">
              <div>
                {/* Warning Header */}
                <div className="p-3.5 rounded-none bg-[#FF0000]/10 border border-[#FF0000]/30 text-center mb-3">
                  <div className="w-9 h-9 rounded-full bg-[#FF0000]/15 text-[#FF0000] mx-auto flex items-center justify-center mb-1 animate-bounce">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="font-poppins font-bold text-sm text-[#FF0000] font-bangla">
                    {language === 'bn' ? '⚠ থামুন! একটু যাচাই করে নিন' : '⚠ Pause! Please Verify First'}
                  </h3>
                  <p className="text-[11px] font-nunito text-[#646B72] mt-0.5">
                    {language === 'bn'
                      ? 'টাকা পাঠানোর আগে নিচের সতর্কতাগুলো মনোযোগ দিয়ে পড়ুন।'
                      : 'Review the security signals below before sending money.'}
                  </p>
                </div>

                {/* Reason Bullets */}
                <div className="space-y-2 text-xs font-bangla text-[#212529] bg-[#F7F7F7] p-3 rounded-none border border-[#DADFE5]">
                  <div className="flex items-start gap-2">
                    <span className="text-[#FF0000] font-bold">•</span>
                    <span>
                      {language === 'bn'
                        ? 'প্রাপকের নম্বরটি আপনার জন্য একদম নতুন এবং পূর্বে এ বিষয়ে অভিযোগ এসেছে।'
                        : 'This recipient is new to you and negative reports exist.'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#FF9F43] font-bold">•</span>
                    <span>
                      {language === 'bn'
                        ? 'কেউ জরুরি বিপদের কথা বলে টাকা চাইলে আগে অন্য পরিচিত নম্বরে ফোন করে নিশ্চিত হোন।'
                        : 'If someone claims an urgent emergency, call their verified number first.'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#155EEF] font-bold">•</span>
                    <span>
                      {language === 'bn'
                        ? 'আপনার পিন বা ওটিপি কাউকে দেবেন না — উপায় কখনো তা চায় না।'
                        : 'Never share your PIN/OTP — upay will never ask for it.'}
                    </span>
                  </div>
                </div>

                {/* Voice Read-out & Countdown Timer */}
                <div className="flex items-center justify-between mt-3 px-1">
                  <button
                    onClick={() =>
                      handleSpeech(
                        language === 'bn'
                          ? 'থামুন! প্রাপকের নম্বরটি নতুন। জরুরি বিপদের কথা বলে টাকা চাইলে আগে অন্য নম্বরে ফোন করে নিশ্চিত হোন। আপনার গোপন পিন কাউকে বলবেন না।'
                          : 'Stop and verify. This recipient is new. Never share your PIN or OTP.'
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1 rounded-[5px] bg-[#FFFFFF] border border-[#DADFE5] text-[#092C4C] text-xs font-nunito font-semibold hover:bg-[#F7F7F7] shadow-sm"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-[#FF9F43]" />
                    <span>{isSpeaking ? 'শুনছেন...' : '🔊 শুনুন (Voice)'}</span>
                  </button>

                  <div className="text-xs font-poppins font-bold text-[#FF9F43] bg-[#FF9F43]/10 border border-[#FF9F43]/30 px-3 py-1 rounded-[5px]">
                    ⏱ {coolingTimer > 0 ? `${coolingTimer}s` : 'Done'}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Safe Cancel vs Continue */}
              <div className="space-y-2 mt-3">
                <button
                  onClick={handleCancelSend}
                  className="w-full py-2.5 rounded-[6px] bg-[#198754] hover:bg-[#157347] text-white font-poppins font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{language === 'bn' ? 'বাতিল করুন (নিরাপদ)' : 'Cancel Transfer (Safe)'}</span>
                </button>

                <button
                  disabled={coolingTimer > 0}
                  onClick={() => alert('Proceeded after cooling-off period.')}
                  className="w-full py-2 rounded-[5px] bg-[#212B36] text-white font-nunito font-semibold text-xs border border-[#1B2850] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0px_4px_20px_0px_rgba(27,40,80,0.15)]"
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
                  onClick={() => alert('Community report submitted to security analysts.')}
                  className="w-full text-center text-[11px] text-[#FF0000] hover:underline pt-0.5 font-nunito font-semibold flex items-center justify-center gap-1"
                >
                  <Flag className="w-3 h-3" />
                  <span>{language === 'bn' ? '⚑ সন্দেহজনক নম্বর হিসেবে রিপোর্ট করুন' : 'Report this number'}</span>
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 3: HOLD & ASSIST */}
          {activeScreen === 'hold_assist' && (
            <div className="flex-1 flex flex-col justify-between py-2 animate-fadeIn">
              <div>
                <div className="p-4 rounded-none bg-[#FF9F43]/15 border border-[#FF9F43]/40 text-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#FF9F43]/25 text-[#FF9F43] mx-auto flex items-center justify-center mb-2">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="font-poppins font-bold text-sm text-[#212B36] font-bangla">
                    {language === 'bn' ? 'লেনদেনটি সাময়িক অপেক্ষমাণ রাখা হয়েছে' : 'Transaction on Temporary Hold'}
                  </h3>
                  <p className="text-xs font-nunito text-[#646B72] mt-1.5 font-bangla">
                    {language === 'bn'
                      ? 'আপনার অ্যাকাউন্ট ও জমানো টাকার সুরক্ষার জন্য লেনদেনটি অতিরিক্ত যাচাইয়ের জন্য পাঠানো হয়েছে।'
                      : 'For your protection, this transaction has been queued for security verification.'}
                  </p>
                </div>

                <div className="bg-[#F7F7F7] p-3 rounded-none border border-[#DADFE5] text-xs font-nunito text-[#212529] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#646B72]">কেস রেফারেন্স:</span>
                    <span className="font-mono text-[#092C4C] font-bold">CASE-2026-00417</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#646B72]">রিভিউ সময়:</span>
                    <span className="text-[#212529] font-bold">৮-১০ মিনিট</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <button
                  onClick={() => alert('Connecting to 24/7 Security Helpline 16268...')}
                  className="w-full dream-btn-primary py-2.5 text-xs flex items-center justify-center gap-2"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>{language === 'bn' ? 'সাপোর্টে কথা বলুন (১৬২৬৮)' : 'Call Support (16268)'}</span>
                </button>
                <button
                  onClick={() => setActiveScreen('send')}
                  className="w-full dream-btn-outline py-2 text-xs font-nunito font-semibold"
                >
                  {language === 'bn' ? 'মূল স্ক্রিনে ফিরে যান' : 'Back to Home'}
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 4: PROTECTED RECEIPT */}
          {activeScreen === 'protected' && (
            <div className="flex-1 flex flex-col justify-between py-2 animate-fadeIn">
              <div>
                <div className="p-4 rounded-none bg-[#198754]/10 border border-[#198754]/30 text-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#198754]/20 text-[#198754] mx-auto flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-poppins font-bold text-sm text-[#198754] font-bangla">
                    {language === 'bn' ? 'ভালো সিদ্ধান্ত! আপনি সুরক্ষিত রইলেন' : 'Great Decision! You are Protected'}
                  </h3>
                  <p className="text-xs font-nunito text-[#646B72] mt-1.5 font-bangla">
                    {language === 'bn'
                      ? 'টাকা পাঠানোর অনুরোধ বাতিল করে আপনি সম্ভাব্য প্রতারণা থেকে ৳১৮,৫০০ টাকা রক্ষা করেছেন।'
                      : 'By canceling this transaction, you prevented a potential loss of ৳18,500.'}
                  </p>
                </div>

                {/* Safety Tip */}
                <div className="bg-[#F7F7F7] p-3 rounded-none border border-[#DADFE5] text-xs font-nunito text-[#212529]">
                  <div className="flex items-center gap-1.5 text-[#FF9F43] font-bold mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>{language === 'bn' ? 'নিরাপত্তা টিপস (Tip)' : 'Safety Tip'}</span>
                  </div>
                  <p className="text-[#646B72] text-[11px] leading-relaxed font-bangla">
                    {language === 'bn'
                      ? 'প্রতারকরা সবসময় মানুষের আবেগ ও ভীতি কাজে লাগায়। যেকোনো বড় অঙ্কের টাকা পাঠানোর আগে পরিবারের অন্তত একজন সদস্যকে জানান।'
                      : 'Fraudsters rely on urgent pressure. Always verify emergency calls with family before sending money.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveScreen('send')}
                className="w-full dream-btn-primary py-2.5 text-xs flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{language === 'bn' ? 'নতুন লেনদেন করুন' : 'Make Another Transfer'}</span>
              </button>
            </div>
          )}

          {/* SCREEN 5: CALL / MESSAGE SCAM CHECK TOOL (M6 SRS & BANGLA CONVERSATIONAL INTELLIGENCE) */}
          {activeScreen === 'scam_check' && (
            <div className="flex-1 flex flex-col justify-between py-1 animate-fadeIn overflow-y-auto max-h-[580px] pr-1">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-poppins font-bold text-[#000000] flex items-center gap-1.5">
                    <PhoneCall className="w-4 h-4 text-[#FF9F43]" />
                    <span>{language === 'bn' ? 'কল ও বার্তা যাচাই (Call Check)' : 'Call / Message Check'}</span>
                  </h3>
                  <button
                    onClick={() => setActiveScreen('send')}
                    className="text-[11px] font-nunito font-semibold text-[#646B72] hover:text-[#000000]"
                  >
                    বন্ধ করুন
                  </button>
                </div>

                {/* Preset Fast Demo Scenarios */}
                <div className="flex items-center gap-1 mb-2 overflow-x-auto pb-1 text-[10px] font-nunito">
                  <button
                    onClick={() => {
                      setScamText(
                        'Caller: আসসালামু আলাইকুম, আমি উপায় কাস্টমার কেয়ার ঢাকা হেড অফিস থেকে বলছি। আপনার অ্যাকাউন্ট এখনই বন্ধ হয়ে যাবে।\nCustomer: কেন বন্ধ হবে ভাই?\nCaller: জরুরি সিকিউরিটি আপডেট প্রয়োজন। আপনার ফোনে আসা ওটিপি বলুন এবং অ্যাকাউন্ট চালু রাখতে ১৮,৫০০ টাকা ০১৩৯৯-৯৯১৮২৩ নম্বরে পাঠান।'
                      );
                    }}
                    className="px-2 py-1 bg-[#FF9F43]/10 text-[#FF9F43] hover:bg-[#FF9F43]/20 border border-[#FF9F43]/30 whitespace-nowrap font-bold rounded-none"
                  >
                    📞 কাস্টমার কেয়ার কল (Demo)
                  </button>
                  <button
                    onClick={() => {
                      setScamText(
                        'Caller: Mama ami hospital theke boltesi, amar severe accident hoise.\nCustomer: Kothay mama?\nCaller: Hospital e achi, ekhon emergency 15000 taka lagbe. Kaoke bolben na, druto taka pathan 01799200004 number e.'
                      );
                    }}
                    className="px-2 py-1 bg-[#F7F7F7] text-[#212B36] hover:bg-[#DADFE5] border border-[#DADFE5] whitespace-nowrap font-semibold rounded-none"
                  >
                    🚑 Banglish Emergency
                  </button>
                </div>

                {/* Language Mode Selector */}
                <div className="flex items-center justify-between mb-1.5 text-[10px] font-nunito text-[#646B72]">
                  <span>কথোপকথন বা মেসেজ পেস্ট করুন:</span>
                  <span className="text-[#FF9F43] font-bold">Bangla · Banglish · English</span>
                </div>

                <textarea
                  rows={4}
                  value={scamText}
                  onChange={(e) => setScamText(e.target.value)}
                  className="w-full dream-input p-2.5 text-xs text-[#212529] focus:outline-none font-bangla border border-[#DADFE5]"
                  placeholder="কথোপকথনের ডায়ালগ বা এসএমএস এখানে পেস্ট করুন..."
                />

                <button
                  onClick={handleAnalyzeScam}
                  disabled={isAnalyzingScam}
                  className="w-full mt-2 dream-btn-primary py-2 text-xs flex items-center justify-center gap-1.5 font-bold shadow-sm"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isAnalyzingScam ? 'যাচাই হচ্ছে...' : '🔍 কথোপকথন যাচাই করুন (Analyze Dialogue)'}</span>
                </button>

                {/* Plain-Language Customer Result */}
                {scamAnalysis && (
                  <div className="mt-3 p-3.5 rounded-none bg-[#F7F7F7] border border-[#DADFE5] text-xs font-nunito animate-fadeIn space-y-2.5">
                    {/* Customer Headline */}
                    <div className="flex items-center gap-2 p-2 bg-[#FFFFFF] border border-[#DADFE5]">
                      <AlertTriangle
                        className={`w-4 h-4 shrink-0 ${
                          scamAnalysis.verdict === 'LIKELY_SCAM' ? 'text-[#FF0000]' : 'text-[#198754]'
                        }`}
                      />
                      <span className="font-poppins font-bold text-xs text-[#000000] font-bangla">
                        {scamAnalysis.conversation_risk_profile?.recommended_action?.customer_heading_bn ||
                          (scamAnalysis.verdict === 'LIKELY_SCAM'
                            ? '⚠️ এই কথোপকথনে প্রতারণার কিছু লক্ষণ পাওয়া গেছে'
                            : '✅ কথোপকথনে বড় কোনো ঝুঁকি পাওয়া যায়নি')}
                      </span>
                    </div>

                    {/* Max 3 Simple Reasons (Customer Friendly) */}
                    {scamAnalysis.matched_reasons_bn && scamAnalysis.matched_reasons_bn.length > 0 && (
                      <div className="space-y-1.5 bg-[#FFFFFF] p-2.5 border border-[#DADFE5]">
                        <span className="text-[10px] font-bold text-[#646B72] block">সনাক্তকৃত কারণসমূহ:</span>
                        {scamAnalysis.matched_reasons_bn.slice(0, 3).map((reason: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[11px] text-[#212529] font-bangla">
                            <span className="text-[#FF0000] font-bold">•</span>
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* "কী করবেন?" (What to Do) Actionable Advice */}
                    <div className="p-2.5 bg-[#FF9F43]/10 border border-[#FF9F43]/30 text-xs font-bangla space-y-1">
                      <strong className="text-[#092C4C] block font-bold">কী করবেন?</strong>
                      <div className="text-[11px] text-[#212529] space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#FF0000] font-bold">✕</span>
                          <span>টাকা পাঠাবেন না</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#FF0000] font-bold">✕</span>
                          <span>PIN / OTP কাউকে দেবেন না</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#198754] font-bold">✓</span>
                          <span>কথোপকথন ও নম্বরটি রিপোর্ট করুন</span>
                        </div>
                      </div>
                    </div>

                    {/* Extracted Entities & Transfer Test Trigger */}
                    {scamAnalysis.extracted_numbers && scamAnalysis.extracted_numbers.length > 0 && (
                      <div className="p-2.5 bg-[#FFFFFF] border border-[#DADFE5] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-[#646B72] block font-semibold">চিহ্নিত নম্বর:</span>
                          <span className="font-mono text-xs font-bold text-[#092C4C]">
                            {scamAnalysis.extracted_numbers[0]}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setRecipientNumber(scamAnalysis.extracted_numbers[0]);
                            setActiveScreen('send');
                          }}
                          className="px-2.5 py-1 bg-[#212B36] text-white text-[10px] font-bold hover:bg-[#1B2850] flex items-center gap-1"
                        >
                          <span>লেনদেন পরীক্ষা</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 text-center text-[10px] font-nunito text-[#646B72]">
                🔒 উপায় কখনোই আপনার গোপন পিন বা ওটিপি জানতে চায় না।
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Side Context Card */}
      <div className="flex-1 max-w-xl dream-card p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-[#FF9F43]">
          <ShieldCheck className="w-5 h-5 text-[#FF9F43]" />
          <h3 className="font-poppins font-bold text-base text-[#000000]">
            Bangla Scam Call Intelligence &amp; M3 Interception
          </h3>
        </div>

        <p className="text-xs font-nunito text-[#212529] leading-relaxed">
          Fraudsters use conversational social engineering to bypass traditional keywords. 
          <strong className="text-[#FF9F43]"> upay Shield extracts 20+ multi-turn behavioral signals</strong> (urgency escalation, authority spoofing, PIN/OTP harvesting, fake refund stories) across Bangla, English, and Banglish.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs font-nunito">
          <div className="p-3.5 bg-[#F7F7F7] rounded-none border border-[#DADFE5]">
            <span className="font-poppins font-bold text-[#212B36] block mb-1">📞 Conversational Timeline</span>
            <p className="text-[#646B72] text-[11px]">
              Extracts escalation from initial small-talk to urgent credential and payment demands.
            </p>
          </div>

          <div className="p-3.5 bg-[#F7F7F7] rounded-none border border-[#DADFE5]">
            <span className="font-poppins font-bold text-[#212B36] block mb-1">🕸️ Campaign Graph Linking</span>
            <p className="text-[#646B72] text-[11px]">
              Links extracted phone numbers and wallets into known mule rings and prior complaints.
            </p>
          </div>
        </div>

        {/* Live Telemetry Card */}
        {evaluationResult && (
          <div className="mt-4 p-4 bg-[#F7F7F7] rounded-none border border-[#FF9F43]/40 text-xs font-nunito">
            <span className="font-mono text-[#FF9F43] text-[11px] font-bold block mb-2">
              ⚡ LIVE M3 TELEMETRY: {evaluationResult.latency_ms}ms
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>Risk Tier: <strong className="text-[#FF0000]">{evaluationResult.risk_tier}</strong></div>
              <div>Calibrated Score: <strong className="text-[#212B36]">{(evaluationResult.risk_score * 100).toFixed(0)}%</strong></div>
              <div>Action: <strong className="text-[#FF9F43]">{evaluationResult.action}</strong></div>
              <div>Model Version: <span className="font-mono text-[#646B72]">{evaluationResult.versions.model}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
