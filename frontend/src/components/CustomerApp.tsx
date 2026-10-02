'use client';

import React, { useState, useEffect } from 'react';
import { 
  Send, AlertTriangle, ShieldCheck, Volume2, 
  Search, Flag, ArrowRight, RotateCcw, Lock, CheckCircle2,
  PhoneCall, MessageSquareWarning, Sparkles, Shield, Clock,
  KeyRound, Plus, PhoneForwarded, X, RefreshCw, AlertCircle,
  HelpCircle, Check, UserCheck, MessageSquare, ChevronRight,
  Eye, FileText, Bot
} from 'lucide-react';
import {
  CustomerSafetyModeRecord,
  SafetyModeReason,
  HumanCoachQuestion,
  HumanCoachSession,
  HumanCoachEvaluationResult,
  HumanCoachSafetyExplanation
} from '../core/types';

export const CustomerApp: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<
    'send' | 'pause_verify' | 'scam_coach' | 'coach_summary' | 'hold_assist' | 'protected' | 'scam_check' | 'safety_mode'
  >('send');

  const [senderWallet] = useState('W-SYN-004512');
  const [recipientNumber, setRecipientNumber] = useState('01399-991823');
  const [amount, setAmount] = useState('12000');
  const [isLoading, setIsLoading] = useState(false);
  const [coolingTimer, setCoolingTimer] = useState(25);
  const [coolingActive, setCoolingActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [language, setLanguage] = useState<'bn' | 'en'>('bn');
  const [simpleMode, setSimpleMode] = useState<boolean>(false);

  // Customer Safety Mode State
  const [safetyMode, setSafetyMode] = useState<CustomerSafetyModeRecord | null>(null);
  const [isStepUpModalOpen, setIsStepUpModalOpen] = useState(false);
  const [stepUpPin, setStepUpPin] = useState('');
  const [stepUpError, setStepUpError] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<SafetyModeReason>('SUSPICIOUS_CALL');
  const [selectedDuration, setSelectedDuration] = useState<number>(120);
  const [safetyToast, setSafetyToast] = useState<string | null>(null);

  // Risk Score response state
  const [evaluationResult, setEvaluationResult] = useState<any>(null);

  // Human Scam Coach State (Prompt 12)
  const [coachSession, setCoachSession] = useState<HumanCoachSession | null>(null);
  const [currentCoachQuestion, setCurrentCoachQuestion] = useState<HumanCoachQuestion | null>(null);
  const [coachSummary, setCoachSummary] = useState<HumanCoachSafetyExplanation | null>(null);
  const [selectedDemoScenario, setSelectedDemoScenario] = useState<'CUSTOMER_CARE' | 'LOTTERY_PRIZE' | 'NORMAL'>('CUSTOMER_CARE');
  const [copilotQuestion, setCopilotQuestion] = useState<string>('Why did this transaction receive elevated risk?');
  const [copilotAnswer, setCopilotAnswer] = useState<any>(null);
  const [copilotLoading, setCopilotLoading] = useState<boolean>(false);

  // Scam check state
  const [scamText, setScamText] = useState(
    'জরুরি বিপদ! আপনার অ্যাকাউন্ট ভেরিফাই করতে ১৮,৫০০ টাকা ০১৩৯৯-৯৯১৮২৩ নম্বরে পাঠান এবং ফোনে আসা ওটিপি বলুন।'
  );
  const [scamAnalysis, setScamAnalysis] = useState<any>(null);
  const [isAnalyzingScam, setIsAnalyzingScam] = useState(false);

  // Fetch Safety Mode state
  const fetchSafetyMode = async () => {
    try {
      const res = await fetch(`/api/v1/customer/safety-mode/${senderWallet}`);
      const data = await res.json();
      if (data.safety_mode) {
        setSafetyMode(data.safety_mode);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSafetyMode();
  }, []);

  // Live timer tick for Safety Mode countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (safetyMode && safetyMode.state === 'PROTECTED' && safetyMode.remaining_seconds > 0) {
      timer = setInterval(() => {
        setSafetyMode((prev) => {
          if (!prev || prev.remaining_seconds <= 1) {
            return prev ? { ...prev, state: 'NORMAL', is_expired: true, remaining_seconds: 0 } : null;
          }
          return { ...prev, remaining_seconds: prev.remaining_seconds - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [safetyMode?.state, safetyMode?.remaining_seconds]);

  // Activate Safety Mode
  const handleActivateSafetyMode = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/customer/safety-mode/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_id: senderWallet,
          reason: selectedReason,
          duration_minutes: selectedDuration,
          source: 'CUSTOMER_APP'
        })
      });
      const data = await res.json();
      if (data.record) {
        setSafetyMode(data.record);
        setSafetyToast('সুরক্ষা মোড সফলভাবে সক্রিয় হয়েছে (Safety Mode Activated)');
        setTimeout(() => setSafetyToast(null), 4000);
        setActiveScreen('send');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Extend Safety Mode
  const handleExtendSafetyMode = async (mins: number = 120) => {
    try {
      const res = await fetch('/api/v1/customer/safety-mode/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_id: senderWallet,
          additional_minutes: mins
        })
      });
      const data = await res.json();
      if (data.record) {
        setSafetyMode(data.record);
        setSafetyToast(`সুরক্ষা মোড আরও ${mins} মিনিট বাড়ানো হয়েছে`);
        setTimeout(() => setSafetyToast(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Disable Safety Mode with Step-Up PIN
  const handleDisableSafetyMode = async () => {
    setStepUpError(null);
    try {
      const res = await fetch('/api/v1/customer/safety-mode/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_id: senderWallet,
          step_up_pin: stepUpPin
        })
      });
      const data = await res.json();
      if (data.success && data.record) {
        setSafetyMode(data.record);
        setIsStepUpModalOpen(false);
        setStepUpPin('');
        setSafetyToast('সুরক্ষা মোড বন্ধ করা হয়েছে (Safety Mode Disabled)');
        setTimeout(() => setSafetyToast(null), 4000);
      } else {
        setStepUpError(data.error?.message || 'স্টেপ-আপ পিন ভুল হয়েছে (Invalid PIN: Use 1234)');
      }
    } catch (e) {
      setStepUpError('ভেরিফিকেশন ব্যর্থ হয়েছে');
    }
  };

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

  // Main Send Money Action
  const handleSendMoney = async () => {
    setIsLoading(true);
    try {
      const isNew = recipientNumber.includes('091177') || recipientNumber.includes('991823');
      const res = await fetch('/api/v1/score/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txn: {
            type: 'P2P_SEND',
            sender_wallet: senderWallet,
            receiver_wallet: recipientNumber.includes('001122') ? 'W-SYN-001122' : 'W-SYN-091177',
            amount_bdt: parseFloat(amount) || 12000,
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

      // Check if Human Scam Coach should intervene
      if (data.coach_evaluation && data.coach_evaluation.should_intervene) {
        setCoachSession({
          session_id: data.coach_evaluation.session_id,
          transaction_id: data.request_id || `TXN-${Date.now()}`,
          customer_wallet: senderWallet,
          recipient_wallet: 'W-SYN-091177',
          amount_bdt: parseFloat(amount) || 12000,
          status: 'ACTIVE',
          selected_questions: data.coach_evaluation.questions,
          current_question_index: 0,
          answers: [],
          signals: data.coach_evaluation.initial_signals || {
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
        });
        setCurrentCoachQuestion(data.coach_evaluation.first_question);
        setActiveScreen('scam_coach');
      } else if (data.action === 'PAUSE_VERIFY') {
        setCoolingTimer(25);
        setCoolingActive(true);
        setActiveScreen('pause_verify');
      } else if (data.action === 'HOLD_ASSIST') {
        setActiveScreen('hold_assist');
      } else {
        alert('Transaction Allowed Successfully! (No Scam Signals Detected)');
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

  // Customer answers a Human Scam Coach question
  const handleCoachAnswer = async (answerVal: 'YES' | 'NO' | 'NOT_SURE') => {
    if (!coachSession || !currentCoachQuestion) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/coach/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: coachSession.session_id,
          question_id: currentCoachQuestion.id,
          answer: answerVal
        })
      });
      const data = await res.json();
      if (data.success) {
        setCoachSession(data.session);
        if (data.is_completed) {
          setCoachSummary(data.safety_explanation);
          setActiveScreen('coach_summary');
        } else {
          setCurrentCoachQuestion(data.next_question);
        }
      }
    } catch (err) {
      console.error('Failed to submit coach answer:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Customer chooses final safety action
  const handleCoachChoice = async (choice: 'CANCEL_PAYMENT' | 'REVIEW_RECIPIENT' | 'CONTINUE_ANYWAY') => {
    if (!coachSession) return;
    try {
      await fetch('/api/v1/coach/choice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: coachSession.session_id,
          choice
        })
      });

      if (choice === 'CANCEL_PAYMENT') {
        setActiveScreen('protected');
      } else if (choice === 'REVIEW_RECIPIENT') {
        setActiveScreen('scam_check');
      } else {
        setCoolingTimer(15);
        setCoolingActive(true);
        setActiveScreen('pause_verify');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Ask Copilot regarding human coach evidence
  const handleAskCopilot = async (customQ?: string) => {
    const q = customQ || copilotQuestion;
    const sessId = coachSession?.session_id || 'COACH-SESS-DEMO-01';
    setCopilotLoading(true);
    try {
      const res = await fetch('/api/v1/copilot/coach-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessId,
          question: q,
          language
        })
      });
      const data = await res.json();
      if (data.success) {
        setCopilotAnswer(data);
      }
    } catch (err) {
      console.error('Failed to query coach copilot:', err);
    } finally {
      setCopilotLoading(false);
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

  const formatSeconds = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isProtected = safetyMode?.state === 'PROTECTED' && !safetyMode.is_expired;

  // Switch demo preset
  const handleApplyDemoPreset = (preset: 'CUSTOMER_CARE' | 'LOTTERY_PRIZE' | 'NORMAL') => {
    setSelectedDemoScenario(preset);
    if (preset === 'CUSTOMER_CARE') {
      setRecipientNumber('01399-991823');
      setAmount('12000');
    } else if (preset === 'LOTTERY_PRIZE') {
      setRecipientNumber('01399-991823');
      setAmount('8500');
    } else {
      setRecipientNumber('01711-001122');
      setAmount('1500');
    }
    setActiveScreen('send');
  };

  return (
    <div className="flex flex-col lg:flex-row items-start justify-center gap-8 py-2">
      {/* Mobile Simulator Frame */}
      <div className="w-full max-w-[390px] bg-[#FFFFFF] rounded-[24px] p-3 shadow-xl border-2 border-[#DADFE5] relative">
        {/* Notch / Speaker */}
        <div className="w-32 h-4 bg-[#F7F7F7] rounded-full mx-auto mb-3 flex items-center justify-center border border-[#DADFE5]">
          <div className="w-2.5 h-2.5 rounded-full bg-[#DADFE5] mr-2"></div>
          <div className="w-8 h-1 bg-[#DADFE5] rounded-full"></div>
        </div>

        {/* Screen Content */}
        <div className="bg-[#FFFFFF] border border-[#DADFE5] rounded-[16px] min-h-[640px] p-4 flex flex-col justify-between overflow-hidden relative">
          
          {/* Top Bar inside App */}
          <div className="flex items-center justify-between pb-3 border-b border-[#DADFE5]">
            <div className="flex items-center gap-1.5">
              <span className="font-poppins font-extrabold text-base text-[#FF9F43]">upay</span>
              <button
                onClick={() => setActiveScreen('safety_mode')}
                className={`text-[10px] px-2 py-0.5 rounded-[4px] font-nunito font-bold flex items-center gap-1 transition-colors ${
                  isProtected 
                    ? 'bg-[#05A677]/15 text-[#05A677] border border-[#05A677]/30 animate-pulse' 
                    : 'bg-[#F7F7F7] text-[#646B72] hover:bg-[#FF9F43]/15 hover:text-[#FF9F43]'
                }`}
              >
                {isProtected ? <Lock className="w-3 h-3 text-[#05A677]" /> : <Shield className="w-3 h-3" />}
                <span>{isProtected ? 'সুরক্ষা মোড ON' : 'Safety Mode'}</span>
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSimpleMode(!simpleMode)}
                className={`text-[10px] px-2 py-0.5 rounded-[4px] font-nunito font-bold border transition-all ${
                  simpleMode ? 'bg-[#092C4C] text-white border-[#092C4C]' : 'bg-[#F7F7F7] text-[#646B72] border-[#DADFE5]'
                }`}
                title="Toggle Simple / Low-Literacy Language Mode"
              >
                {simpleMode ? '🟢 সাধারণ ভাষা' : 'সাধারণ ভাষা'}
              </button>
              <button
                onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
                className="text-[11px] px-2.5 py-0.5 rounded-[4px] bg-[#F7F7F7] text-[#212B36] hover:bg-[#FF9F43]/10 border border-[#DADFE5] font-nunito font-semibold transition-colors"
              >
                {language === 'bn' ? 'English' : 'বাংলা'}
              </button>
            </div>
          </div>

          {/* Toast Message */}
          {safetyToast && (
            <div className="my-2 p-2 bg-[#05A677] text-white text-[11px] font-bold rounded-[6px] text-center shadow-md animate-fade-in">
              {safetyToast}
            </div>
          )}

          {/* SCREEN 1: SEND MONEY (MAIN) */}
          {activeScreen === 'send' && (
            <div className="flex-1 py-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-poppins font-bold text-[#000000]">
                    {language === 'bn' ? 'টাকা পাঠান (Send Money)' : 'Send Money'}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveScreen('safety_mode')}
                      className="text-xs font-nunito text-[#05A677] flex items-center gap-1 font-bold hover:underline"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>সুরক্ষা মোড</span>
                    </button>
                    <button
                      onClick={() => setActiveScreen('scam_check')}
                      className="text-xs font-nunito text-[#FF9F43] flex items-center gap-1 font-bold hover:underline"
                    >
                      <MessageSquareWarning className="w-3.5 h-3.5" />
                      <span>স্ক্যান</span>
                    </button>
                  </div>
                </div>

                {/* Account Balance Card */}
                <div className="bg-[#212B36] p-3.5 rounded-none border border-[#212B36] text-white mb-3 shadow-sm">
                  <span className="text-[11px] font-nunito text-slate-300">
                    {language === 'bn' ? 'উপলব্ধ ব্যালেন্স' : 'Available Balance'}
                  </span>
                  <div className="text-xl font-poppins font-extrabold mt-0.5">৳ ২৪,৫০০.০০</div>
                  <div className="text-[10px] font-nunito text-[#FF9F43] mt-1">
                    {language === 'bn' ? 'অ্যাকাউন্ট: রহিমা বেগম (W-004512)' : 'Account: Rahima Begum (W-004512)'}
                  </div>
                </div>

                {/* Safety Mode Banner under Balance */}
                {isProtected ? (
                  <div 
                    onClick={() => setActiveScreen('safety_mode')}
                    className="p-2 mb-3 bg-[#05A677]/10 border border-[#05A677]/30 rounded-[6px] flex items-center justify-between cursor-pointer hover:bg-[#05A677]/20"
                  >
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#05A677]" />
                      <span className="text-[11px] font-bold text-[#05A677] font-bangla">
                        সুরক্ষা মোড সক্রিয় (বাকি: {formatSeconds(safetyMode.remaining_seconds)})
                      </span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-[#05A677]" />
                  </div>
                ) : (
                  <div 
                    onClick={() => setActiveScreen('safety_mode')}
                    className="p-2 mb-3 bg-[#F7F7F7] border border-[#DADFE5] rounded-[6px] flex items-center justify-between cursor-pointer hover:bg-[#FF9F43]/10"
                  >
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#646B72]" />
                      <span className="text-[11px] font-bold text-[#646B72] font-bangla">
                        সুরক্ষা মোড বন্ধ (প্রয়োজনে চালু করুন)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-[#FF9F43] uppercase">Turn ON</span>
                  </div>
                )}

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
                      <span className={`absolute right-2.5 top-2 text-[10px] px-2 py-0.5 rounded-[4px] font-nunito font-bold ${
                        recipientNumber.includes('001122') 
                          ? 'bg-[#198754]/15 text-[#198754] border border-[#198754]/30' 
                          : 'bg-[#FF0000]/10 text-[#FF0000] border border-[#FF0000]/30'
                      }`}>
                        {recipientNumber.includes('001122') ? 'Known' : (language === 'bn' ? 'নতুন নম্বর' : 'New')}
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
                    {parseFloat(amount) >= 5000 && (
                      <div className="text-[10px] font-nunito text-[#FF9F43] mt-1 flex items-center gap-1 font-semibold">
                        <AlertTriangle className="w-3 h-3 text-[#FF9F43]" />
                        {language === 'bn' ? 'স্বাভাবিক গড় লেনদেনের চেয়ে বেশি' : 'Higher than usual baseline'}
                      </div>
                    )}
                  </div>

                  {/* Quick Shortcut Pills */}
                  <div className="flex gap-2 pt-1">
                    {['1500', '8500', '12000'].map((val) => (
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
                className="w-full mt-4 dream-btn-primary py-2.5 text-sm flex items-center justify-center gap-2 font-poppins"
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

          {/* SCREEN: HUMAN SCAM COACH (PROMPT 12 INTERACTIVE QUESTIONS) */}
          {activeScreen === 'scam_coach' && currentCoachQuestion && (
            <div className="flex-1 flex flex-col justify-between py-1 animate-fadeIn space-y-3">
              <div>
                {/* Header Banner */}
                <div className="p-3 bg-[#FF9F43]/15 border-2 border-[#FF9F43]/40 rounded-[6px] space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-poppins font-bold text-[#092C4C]">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#FF9F43]" />
                      <span>{language === 'bn' ? 'টাকা পাঠানোর আগে একটু যাচাই' : 'Human Scam Coach'}</span>
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded text-[10px] font-mono border border-[#FF9F43]/30">
                      প্রশ্ন {(coachSession?.current_question_index || 0) + 1} / {coachSession?.selected_questions.length || 3}
                    </span>
                  </div>
                  <p className="text-[11px] font-nunito text-[#646B72]">
                    {language === 'bn'
                      ? 'টাকা পাঠানোর আগে আমরা নিশ্চিত হতে চাই যে লেনদেনটি আপনার সম্পূর্ণ ইচ্ছায় হচ্ছে।'
                      : 'We want to make sure this payment is genuinely intended and not coerced.'}
                  </p>
                </div>

                {/* Question Card */}
                <div className="mt-3 p-4 bg-[#FFFFFF] border-2 border-[#092C4C] rounded-[6px] space-y-3 shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-poppins font-bold text-sm text-[#000000] leading-snug">
                      {simpleMode && currentCoachQuestion.simple_mode_bn
                        ? currentCoachQuestion.simple_mode_bn
                        : language === 'bn'
                        ? currentCoachQuestion.question_bn
                        : currentCoachQuestion.question_en}
                    </h3>
                    <button
                      onClick={() =>
                        handleSpeech(
                          simpleMode && currentCoachQuestion.simple_mode_bn
                            ? currentCoachQuestion.simple_mode_bn
                            : language === 'bn'
                            ? currentCoachQuestion.question_bn
                            : currentCoachQuestion.question_en
                        )
                      }
                      className="p-1.5 rounded bg-[#F7F7F7] border border-[#DADFE5] text-[#092C4C] hover:bg-[#EAEAEA]"
                      title="Listen in voice"
                    >
                      <Volume2 className="w-4 h-4 text-[#FF9F43]" />
                    </button>
                  </div>

                  {/* Why We Ask Accordion */}
                  <div className="p-2.5 bg-[#F7F7F7] border border-[#DADFE5] rounded-[4px] text-[11px] font-nunito text-[#646B72]">
                    <strong className="text-[#092C4C]">কেন জানতে চাইছি: </strong>
                    {language === 'bn' ? currentCoachQuestion.why_we_ask_bn : currentCoachQuestion.why_we_ask_en}
                  </div>

                  {/* 3 Selectable Options */}
                  <div className="space-y-2 pt-1">
                    <button
                      disabled={isLoading}
                      onClick={() => handleCoachAnswer('YES')}
                      className="w-full py-2.5 px-3 rounded-[6px] bg-[#FFFFFF] hover:bg-[#FF0000]/10 border-2 border-[#DADFE5] hover:border-[#FF0000] text-xs font-poppins font-bold text-[#000000] flex items-center justify-between transition-all shadow-sm group"
                    >
                      <span className="group-hover:text-[#FF0000]">{language === 'bn' ? 'হ্যাঁ (Yes)' : 'Yes'}</span>
                      <ChevronRight className="w-4 h-4 text-[#646B72] group-hover:text-[#FF0000]" />
                    </button>

                    <button
                      disabled={isLoading}
                      onClick={() => handleCoachAnswer('NO')}
                      className="w-full py-2.5 px-3 rounded-[6px] bg-[#FFFFFF] hover:bg-[#198754]/10 border-2 border-[#DADFE5] hover:border-[#198754] text-xs font-poppins font-bold text-[#000000] flex items-center justify-between transition-all shadow-sm group"
                    >
                      <span className="group-hover:text-[#198754]">{language === 'bn' ? 'না (No)' : 'No'}</span>
                      <ChevronRight className="w-4 h-4 text-[#646B72] group-hover:text-[#198754]" />
                    </button>

                    <button
                      disabled={isLoading}
                      onClick={() => handleCoachAnswer('NOT_SURE')}
                      className="w-full py-2 px-3 rounded-[6px] bg-[#F7F7F7] hover:bg-[#DADFE5] border border-[#DADFE5] text-xs font-nunito font-semibold text-[#646B72] flex items-center justify-between transition-all"
                    >
                      <span>{language === 'bn' ? 'নিশ্চিত নই (I\'m not sure)' : 'I\'m not sure'}</span>
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-center text-[#646B72] font-nunito">
                🔒 আপনার উত্তরগুলো সরাসরি নিরাপত্তা অডিটের জন্য সংরক্ষিত হয়।
              </div>
            </div>
          )}

          {/* SCREEN: COACH SAFETY SUMMARY & EXPLANATION */}
          {activeScreen === 'coach_summary' && coachSummary && (
            <div className="flex-1 flex flex-col justify-between py-1 animate-fadeIn space-y-3">
              <div>
                {/* Warning Header */}
                <div className={`p-3.5 rounded-[6px] text-center space-y-1 ${
                  coachSummary.risk_elevation === 'HIGH_RISK_SCAM_CONFIRMED'
                    ? 'bg-[#FF0000]/15 border-2 border-[#FF0000]'
                    : 'bg-[#FF9F43]/15 border-2 border-[#FF9F43]'
                }`}>
                  <div className="w-9 h-9 rounded-full bg-white text-[#FF0000] mx-auto flex items-center justify-center shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-[#FF0000]" />
                  </div>
                  <h3 className="font-poppins font-bold text-xs text-[#000000]">
                    {language === 'bn' ? coachSummary.headline_bn : coachSummary.headline_en}
                  </h3>
                  <p className="text-[11px] font-nunito text-[#212529]">
                    {language === 'bn' ? coachSummary.recommended_guidance_bn : coachSummary.recommended_guidance_en}
                  </p>
                </div>

                {/* Confirmed Warning Signs */}
                <div className="mt-3 p-3 bg-[#F7F7F7] border border-[#DADFE5] rounded-[6px] space-y-2 text-xs font-nunito">
                  <span className="font-poppins font-bold text-[#092C4C] block text-[11px]">
                    {language === 'bn' ? 'শনাক্তকৃত সতর্কবার্তা (Warning Signs):' : 'Identified Warning Signs:'}
                  </span>
                  <div className="space-y-1.5">
                    {(language === 'bn' ? coachSummary.matched_warning_signs_bn : coachSummary.matched_warning_signs_en).map((sign, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[#212529] text-[11px]">
                        <Check className="w-3.5 h-3.5 text-[#FF0000] shrink-0 mt-0.5" />
                        <span>{sign}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Safety Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleCoachChoice('CANCEL_PAYMENT')}
                  className="w-full py-2.5 rounded-[6px] bg-[#198754] hover:bg-[#157347] text-white font-poppins font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{language === 'bn' ? 'টাকা পাঠানো বাতিল করুন (নিরাপদ)' : 'Cancel Transfer (Safe)'}</span>
                </button>

                <button
                  onClick={() => handleCoachChoice('REVIEW_RECIPIENT')}
                  className="w-full py-2 rounded-[5px] bg-[#FFFFFF] border-2 border-[#092C4C] text-[#092C4C] font-poppins font-bold text-xs hover:bg-[#F7F7F7] transition-all flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'আবার যাচাই করুন (Scam Check)' : 'Review Recipient'}</span>
                </button>

                <button
                  onClick={() => handleCoachChoice('CONTINUE_ANYWAY')}
                  className="w-full py-1.5 text-center text-[11px] font-nunito text-[#646B72] hover:text-[#000000] hover:underline"
                >
                  {language === 'bn' ? 'সব ঝুঁকি বুঝে তারপরও চালিয়ে যান' : 'I accept risks, Continue Anyway'}
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 2: PAUSE & VERIFY */}
          {activeScreen === 'pause_verify' && (
            <div className="flex-1 flex flex-col justify-between py-1 animate-fadeIn">
              <div>
                <div className="p-3.5 rounded-none text-center mb-3 bg-[#FF0000]/10 border border-[#FF0000]/30">
                  <div className="w-9 h-9 rounded-full bg-[#FF0000]/15 text-[#FF0000] mx-auto flex items-center justify-center mb-1 animate-bounce">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="font-poppins font-bold text-sm text-[#FF0000] font-bangla">
                    {language === 'bn' ? '⚠ থামুন! একটু যাচাই করে নিন' : '⚠ Pause! Please Verify First'}
                  </h3>
                  <p className="text-[11px] font-nunito text-[#646B72] mt-0.5 font-bangla">
                    {language === 'bn'
                      ? 'টাকা পাঠানোর আগে নিচের সতর্কতাগুলো মনোযোগ দিয়ে পড়ুন।'
                      : 'Review the security signals below before sending money.'}
                  </p>
                </div>

                <div className="space-y-2 text-xs font-bangla text-[#212529] bg-[#F7F7F7] p-3 rounded-none border border-[#DADFE5]">
                  <div className="flex items-start gap-2">
                    <span className="text-[#FF0000] font-bold">•</span>
                    <span>
                      {language === 'bn'
                        ? 'প্রাপকের নম্বরটি আপনার জন্য নতুন এবং স্বাভাবিকের চেয়ে বড় অঙ্কের লেনদেন।'
                        : 'This recipient is new to you and ticket size is high.'}
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
                </div>

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
                  className="w-full py-2 rounded-[5px] bg-[#212B36] text-white font-nunito font-semibold text-xs border border-[#1B2850] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {language === 'bn'
                    ? coolingTimer > 0
                      ? `অপেক্ষা করুন (${coolingTimer}s)`
                      : 'আমি নিশ্চিত, টাকা পাঠান'
                    : coolingTimer > 0
                    ? `Wait (${coolingTimer}s)`
                    : 'I am certain, Send Money'}
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
                      ? `টাকা পাঠানোর অনুরোধ বাতিল করে আপনি সম্ভাব্য প্রতারণা থেকে ৳${parseFloat(amount).toLocaleString()} টাকা রক্ষা করেছেন।`
                      : `By canceling this transaction, you prevented a potential loss of ৳${parseFloat(amount).toLocaleString()}.`}
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

          {/* SCREEN 5: CALL / MESSAGE SCAM CHECK TOOL */}
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
                  <span>{isAnalyzingScam ? 'বিশ্লেষণ চলছে...' : 'যাচাই করুন (Analyze)'}</span>
                </button>

                {scamAnalysis && (
                  <div className="mt-2 p-2 bg-[#F7F7F7] border border-[#DADFE5] rounded text-[11px]">
                    <div className="font-bold text-[#FF0000]">Verdict: {scamAnalysis.verdict}</div>
                    <div className="text-[#646B72]">{scamAnalysis.advice_bn}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SCREEN 6: SAFETY MODE SETTINGS */}
          {activeScreen === 'safety_mode' && (
            <div className="flex-1 flex flex-col justify-between py-1 animate-fadeIn overflow-y-auto max-h-[580px] pr-1">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-poppins font-bold text-[#000000] flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-[#05A677]" />
                    <span>{language === 'bn' ? 'গ্রাহক সুরক্ষা মোড (Safety Mode)' : 'Customer Safety Mode'}</span>
                  </h3>
                  <button
                    onClick={() => setActiveScreen('send')}
                    className="text-[11px] font-nunito font-semibold text-[#646B72] hover:text-[#000000]"
                  >
                    বন্ধ করুন
                  </button>
                </div>

                {isProtected ? (
                  <div className="p-3 bg-[#05A677]/10 border border-[#05A677]/30 rounded-[6px] space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#05A677]">
                      <Lock className="w-3.5 h-3.5" />
                      <span>সুরক্ষা মোড সক্রিয়</span>
                    </div>
                    <button
                      onClick={() => setIsStepUpModalOpen(true)}
                      className="w-full py-2 bg-[#212B36] text-white text-xs font-bold rounded"
                    >
                      সুরক্ষা মোড বন্ধ করুন (Step-Up)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-[#646B72]">
                      সন্দেহজনক ফোন কল বা হারিয়ে যাওয়া ফোনের ক্ষেত্রে সাময়িক উচ্চ-সুরক্ষা মোড চালু করুন।
                    </p>
                    <button
                      onClick={handleActivateSafetyMode}
                      className="w-full py-2 bg-[#05A677] text-white text-xs font-bold rounded"
                    >
                      সুরক্ষা মোড চালু করুন (Turn ON)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Step-Up PIN Modal */}
      {isStepUpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-[12px] max-w-sm w-full p-5 shadow-2xl space-y-4 animate-scale-up border border-[#DADFE5]">
            <div className="flex items-center justify-between border-b border-[#DADFE5] pb-2">
              <div className="flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-[#FF9F43]" />
                <h3 className="font-bold text-sm text-[#212B36] font-poppins">
                  স্টেপ-আপ ভেরিফিকেশন (Step-Up)
                </h3>
              </div>
              <button onClick={() => setIsStepUpModalOpen(false)} className="text-[#646B72]">✕</button>
            </div>

            <p className="text-xs font-bangla text-[#646B72]">
              সুরক্ষা মোড বন্ধ করতে আপনার ৪-সংখ্যার গোপনীয় পিন বা ওটিপি প্রদান করুন। (ডেমো পিন: <strong>1234</strong>)
            </p>

            <input
              type="password"
              maxLength={4}
              value={stepUpPin}
              onChange={(e) => setStepUpPin(e.target.value)}
              placeholder="••••"
              className="w-full text-center tracking-[10px] text-lg font-mono p-2.5 rounded-[6px] border border-[#DADFE5] focus:outline-none focus:border-[#FF9F43]"
            />

            {stepUpError && (
              <div className="p-2 rounded bg-[#FF0000]/10 text-[#FF0000] text-xs font-bold text-center">
                {stepUpError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DADFE5]">
              <button
                onClick={() => setIsStepUpModalOpen(false)}
                className="px-3 py-1.5 rounded-[5px] border border-[#DADFE5] text-xs font-bold text-[#646B72]"
              >
                বাতিল
              </button>
              <button
                onClick={handleDisableSafetyMode}
                className="px-4 py-1.5 rounded-[5px] bg-[#05A677] text-white text-xs font-bold hover:bg-[#05A677]/90"
              >
                নিশ্চিত করুন (Turn Off)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right Column: Human Scam Coach Architecture, Demo Presets & Investigator Copilot */}
      <div className="flex-1 max-w-xl space-y-4">
        
        {/* Header Card with Demo Preset Switcher */}
        <div className="dream-card p-5 space-y-3 shadow-sm border border-[#DADFE5]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#FF9F43]" />
              <h3 className="font-poppins font-bold text-base text-[#000000]">
                Human Scam Coach (Contextual Verification Layer)
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-[#FF9F43]/15 text-[#FF9F43] border border-[#FF9F43]/30 text-[10px] font-bold">
              PROMPT 12
            </span>
          </div>

          <p className="text-xs font-nunito text-[#646B72]">
            Adds a short 1–4 question human-in-the-loop safety verification layer immediately before risky transfers. Converts customer answers into structured signals for the Risk Engine.
          </p>

          {/* Quick Demo Scenario Switcher */}
          <div className="pt-2 border-t border-[#DADFE5] space-y-1.5">
            <span className="text-[11px] font-nunito font-bold text-[#092C4C] block">
              Try Live Demo Scenarios:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'CUSTOMER_CARE', label: '1. Fake Care & OTP', desc: '৳12,000 + Impersonation' },
                { id: 'LOTTERY_PRIZE', label: '2. Prize / Advance Fee', desc: '৳8,500 + Lottery Script' },
                { id: 'NORMAL', label: '3. Safe Transfer', desc: '৳1,500 + Known Recipient' }
              ].map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => handleApplyDemoPreset(sc.id as any)}
                  className={`p-2 rounded-[4px] border text-left transition-all ${
                    selectedDemoScenario === sc.id
                      ? 'bg-[#092C4C] text-white border-[#092C4C] shadow-sm'
                      : 'bg-[#F7F7F7] text-[#212529] border-[#DADFE5] hover:border-[#092C4C]/40'
                  }`}
                >
                  <div className="text-[11px] font-poppins font-bold">{sc.label}</div>
                  <div className={`text-[9px] ${selectedDemoScenario === sc.id ? 'text-slate-300' : 'text-[#646B72]'}`}>
                    {sc.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Structured Evidence Panel (Investigator View) */}
        <div className="dream-card p-5 space-y-3 shadow-sm border border-[#DADFE5]">
          <div className="flex items-center justify-between pb-2 border-b border-[#DADFE5]">
            <div className="flex items-center gap-1.5 text-xs font-poppins font-bold text-[#092C4C]">
              <FileText className="w-4 h-4 text-[#FF9F43]" />
              <span>INVESTIGATOR EVIDENCE DOSSIER (HUMAN SIGNALS)</span>
            </div>
            <span className="text-[10px] font-mono text-[#198754] font-bold bg-[#198754]/10 px-2 py-0.5 rounded">
              Immutable Ledger
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-nunito">
            <div className="p-2.5 bg-[#F7F7F7] border border-[#DADFE5] rounded space-y-1">
              <span className="text-[#646B72] text-[10px] block">Customer Social Contact:</span>
              <div className="font-bold text-[#212529]">
                {coachSession?.signals.recent_social_contact ? '⚠️ YES (Reported by Customer)' : 'NO / None'}
              </div>
            </div>

            <div className="p-2.5 bg-[#F7F7F7] border border-[#DADFE5] rounded space-y-1">
              <span className="text-[#646B72] text-[10px] block">Credential / OTP Request:</span>
              <div className={`font-bold ${coachSession?.signals.credential_request ? 'text-[#FF0000]' : 'text-[#212529]'}`}>
                {coachSession?.signals.credential_request ? '🚨 YES (PIN/OTP Requested)' : 'NO'}
              </div>
            </div>

            <div className="p-2.5 bg-[#F7F7F7] border border-[#DADFE5] rounded space-y-1">
              <span className="text-[#646B72] text-[10px] block">Authority Impersonation:</span>
              <div className="font-bold text-[#212529]">
                {coachSession?.signals.authority_impersonation ? '⚠️ YES (Claimed Customer Care)' : 'NO'}
              </div>
            </div>

            <div className="p-2.5 bg-[#F7F7F7] border border-[#DADFE5] rounded space-y-1">
              <span className="text-[#646B72] text-[10px] block">Urgency / Secrecy Pressure:</span>
              <div className="font-bold text-[#212529]">
                {coachSession?.signals.urgency_pressure || coachSession?.signals.secrecy_pressure ? '⚠️ YES (Pressure Exerted)' : 'NO'}
              </div>
            </div>
          </div>

          {coachSession?.answers && coachSession.answers.length > 0 && (
            <div className="p-2.5 bg-white border border-[#DADFE5] rounded text-[11px] font-nunito space-y-1">
              <span className="font-bold text-[#092C4C] block">Recorded Answers:</span>
              {coachSession.answers.map((ans, idx) => (
                <div key={idx} className="flex justify-between text-[#646B72]">
                  <span>{ans.question_id}:</span>
                  <strong className={ans.answer === 'YES' ? 'text-[#FF0000]' : 'text-[#198754]'}>
                    {ans.answer}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Investigation Copilot Integration */}
        <div className="dream-card p-5 space-y-3 shadow-sm border border-[#DADFE5] bg-gradient-to-br from-white to-[#F7F7F7]">
          <div className="flex items-center justify-between pb-2 border-b border-[#DADFE5]">
            <div className="flex items-center gap-1.5 text-xs font-poppins font-bold text-[#092C4C]">
              <Sparkles className="w-4 h-4 text-[#FF9F43]" />
              <span>INVESTIGATION COPILOT (HUMAN COACH EVIDENCE)</span>
            </div>
            <span className="text-[10px] font-mono text-[#092C4C] font-bold">
              Grounded Q&amp;A
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={copilotQuestion}
              onChange={(e) => setCopilotQuestion(e.target.value)}
              placeholder="Ask Copilot about human verification evidence..."
              className="flex-1 px-3 py-2 text-xs font-nunito rounded border border-[#DADFE5] focus:outline-none focus:border-[#092C4C]"
            />
            <button
              disabled={copilotLoading}
              onClick={() => handleAskCopilot()}
              className="px-3 py-2 bg-[#092C4C] text-white rounded text-xs font-poppins font-semibold hover:bg-[#0c3b66] transition-all flex items-center gap-1"
            >
              {copilotLoading ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Ask</span>
            </button>
          </div>

          {copilotAnswer && (
            <div className="p-3 bg-[#FFFFFF] border-2 border-[#FF9F43]/40 rounded space-y-2 shadow-sm text-xs font-nunito">
              <div className="flex items-center justify-between text-[#092C4C] font-bold">
                <span>Copilot Brief</span>
                <span className="text-[10px] text-[#198754] font-mono">
                  Confidence: {((copilotAnswer.confidence || 0.98) * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-[#212529] leading-relaxed bg-[#F7F7F7] p-2.5 rounded border border-[#DADFE5]">
                {copilotAnswer.answer}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
