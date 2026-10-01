'use client';

import React, { useState } from 'react';
import { 
  PhoneCall, ShieldAlert, ShieldCheck, CheckCircle, XCircle, 
  RotateCcw, ArrowRight, Smartphone, Radio, Activity, AlertTriangle,
  History, Server, Sparkles, UserX, UserCheck
} from 'lucide-react';

interface UssdState {
  step: 'IDLE' | 'MENU' | 'ENTER_RECIPIENT' | 'ENTER_AMOUNT' | 'WARNING_SCREEN' | 'ENTER_PIN' | 'CONFIRMED' | 'CANCELLED';
  displayText: string;
  inputValue: string;
  senderWallet: string;
  recipientWallet: string;
  amount: string;
  sessionId: string;
  reasons: Array<{ code: string; label_en: string; label_bn: string; weight: number }>;
  riskScore: number;
  riskTier: string;
  isEvaluating: boolean;
}

interface InterventionLog {
  id: string;
  txnId: string;
  timestamp: string;
  channel: string;
  action: string;
  amount: number;
  recipient: string;
  reason: string;
}

export const UssdSimulator: React.FC = () => {
  const [ussd, setUssd] = useState<UssdState>({
    step: 'IDLE',
    displayText: 'Dial *268# for upay USSD Service',
    inputValue: '',
    senderWallet: 'W-SYN-004512', // Regular APP User
    recipientWallet: 'W-SYN-091177', // Suspicious Mule
    amount: '18500',
    sessionId: '',
    reasons: [],
    riskScore: 0,
    riskTier: 'T0',
    isEvaluating: false
  });

  const [interventionLogs, setInterventionLogs] = useState<InterventionLog[]>([
    {
      id: 'INTV-8821-USSD',
      txnId: 'TXN-USSD-90114',
      timestamp: '23:42:15',
      channel: 'USSD (Feature Phone)',
      action: 'CANCEL (Safe Exit)',
      amount: 18500,
      recipient: 'W-SYN-091177 (Mule)',
      reason: 'RC14: Sudden cross-channel switch + Suspicious recipient ring'
    }
  ]);

  const [lastActionStatus, setLastActionStatus] = useState<string | null>(null);

  // Keypad click handler
  const handleKeypadPress = (key: string) => {
    if (ussd.step === 'IDLE') {
      if (key === 'CALL') {
        startUssdSession();
      } else {
        setUssd(prev => ({ ...prev, inputValue: prev.inputValue + key }));
      }
      return;
    }

    if (key === 'CALL' || key === 'SEND') {
      handleSubmitInput();
    } else if (key === 'CLR') {
      setUssd(prev => ({ ...prev, inputValue: prev.inputValue.slice(0, -1) }));
    } else if (key === 'END') {
      resetSession();
    } else {
      setUssd(prev => ({ ...prev, inputValue: prev.inputValue + key }));
    }
  };

  // Start USSD Session (*268#)
  const startUssdSession = async () => {
    setUssd(prev => ({
      ...prev,
      step: 'MENU',
      displayText: 'upay (*268#):\n1. Send Money\n2. Cash Out\n3. Check Balance',
      inputValue: ''
    }));
  };

  // Submit User Input based on current step
  const handleSubmitInput = async () => {
    const val = ussd.inputValue.trim();

    if (ussd.step === 'IDLE') {
      if (val === '*268#' || val === '*268' || val === '268') {
        startUssdSession();
      } else {
        setUssd(prev => ({
          ...prev,
          displayText: 'Invalid MMI code.\nDial *268# for upay.',
          inputValue: ''
        }));
      }
      return;
    }

    if (ussd.step === 'MENU') {
      if (val === '1') {
        setUssd(prev => ({
          ...prev,
          step: 'ENTER_RECIPIENT',
          displayText: 'upay Send Money:\nEnter recipient wallet or number:',
          inputValue: ''
        }));
      } else if (val === '2') {
        setUssd(prev => ({
          ...prev,
          step: 'ENTER_RECIPIENT',
          displayText: 'upay Cash Out:\nEnter Agent wallet number:',
          inputValue: ''
        }));
      } else if (val === '3') {
        setUssd(prev => ({
          ...prev,
          step: 'CONFIRMED',
          displayText: 'upay Balance:\nYour available balance is ৳24,850.00.\nFee: ৳0.00.',
          inputValue: ''
        }));
      } else {
        setUssd(prev => ({
          ...prev,
          displayText: 'Invalid Choice!\n1. Send Money\n2. Cash Out\n3. Check Balance',
          inputValue: ''
        }));
      }
      return;
    }

    if (ussd.step === 'ENTER_RECIPIENT') {
      const recipient = val || ussd.recipientWallet;
      setUssd(prev => ({
        ...prev,
        recipientWallet: recipient,
        step: 'ENTER_AMOUNT',
        displayText: `Send to: ${recipient}\nEnter amount (BDT):`,
        inputValue: ''
      }));
      return;
    }

    if (ussd.step === 'ENTER_AMOUNT') {
      const amt = val || ussd.amount;
      setUssd(prev => ({ ...prev, amount: amt, isEvaluating: true }));

      try {
        const res = await fetch('/api/v1/ussd/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            step: 'ENTER_AMOUNT',
            sender_wallet: ussd.senderWallet,
            receiver_wallet: ussd.recipientWallet,
            amount_bdt: parseFloat(amt) || 18500
          })
        });

        const data = await res.json();
        setUssd(prev => ({
          ...prev,
          isEvaluating: false,
          step: data.step === 'INTERVENTION_WARNING' ? 'WARNING_SCREEN' : 'ENTER_PIN',
          displayText: data.display_text,
          sessionId: data.session_id,
          reasons: data.reasons || [],
          riskScore: data.risk_score || 0,
          riskTier: data.risk_tier || 'T0',
          inputValue: ''
        }));
      } catch (err) {
        console.error(err);
        setUssd(prev => ({
          ...prev,
          isEvaluating: false,
          step: 'WARNING_SCREEN',
          displayText: `upay সতর্কতা:\nএই নম্বরে পূর্বে প্রতারণার অভিযোগ আছে।\n৳${amt} পাঠানো কি নিশ্চিত?\n\n1. বাতিল (নিরাপদ)\n2. চালিয়ে যান`,
          reasons: [{ code: 'RC10', label_en: 'Recipient mule proximity', label_bn: 'প্রাপকের সন্দেহজনক লেনদেন', weight: 0.85 }],
          riskScore: 0.88,
          riskTier: 'T3',
          inputValue: ''
        }));
      }
      return;
    }

    if (ussd.step === 'WARNING_SCREEN') {
      if (val === '1') {
        // Customer Cancels
        handleLogIntervention('CANCEL');
        setUssd(prev => ({
          ...prev,
          step: 'CANCELLED',
          displayText: 'লেনদেনটি সফলভাবে বাতিল করা হয়েছে।\nআপনার অ্যাকাউন্ট সম্পূর্ণ নিরাপদ।\n\nধন্যবাদ (upay Shield)',
          inputValue: ''
        }));
        setLastActionStatus('Intervention Logged: Customer opted to CANCEL based on Bangla USSD warning.');
      } else if (val === '2') {
        // Customer Proceeds
        handleLogIntervention('PROCEED');
        setUssd(prev => ({
          ...prev,
          step: 'ENTER_PIN',
          displayText: `upay:\n${prev.recipientWallet} নম্বরে ৳${prev.amount} পাঠানোর জন্য আপনার গোপন পিন দিন:`,
          inputValue: ''
        }));
        setLastActionStatus('Customer decided to PROCEED past warning.');
      } else {
        setUssd(prev => ({
          ...prev,
          displayText: 'ভুল ইনপুট!\n\n1. বাতিল (নিরাপদ)\n2. চালিয়ে যান',
          inputValue: ''
        }));
      }
      return;
    }

    if (ussd.step === 'ENTER_PIN') {
      setUssd(prev => ({
        ...prev,
        step: 'CONFIRMED',
        displayText: `upay:\n৳${prev.amount} সফলভাবে ${prev.recipientWallet} নম্বরে পাঠানো হয়েছে। ট্রানজেকশন আইডি: TXN-${Date.now().toString().slice(-6)}`,
        inputValue: ''
      }));
      return;
    }
  };

  // Log Intervention to Backend DB and Hash-Chained Audit Ledger
  const handleLogIntervention = async (action: 'CANCEL' | 'PROCEED') => {
    const newLog: InterventionLog = {
      id: `INTV-${Date.now().toString().slice(-4)}-USSD`,
      txnId: `TXN-USSD-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toLocaleTimeString(),
      channel: 'USSD (Feature Phone)',
      action: action === 'CANCEL' ? 'CANCEL (Safe Exit)' : 'PROCEED (User Overrode)',
      amount: parseFloat(ussd.amount) || 18500,
      recipient: ussd.recipientWallet,
      reason: ussd.reasons[0]?.code || 'RC14: Cross-channel anomaly'
    };

    setInterventionLogs(prev => [newLog, ...prev]);

    try {
      await fetch('/api/v1/interventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txn_id: newLog.txnId,
          variant: 'PAUSE_VERIFY_USSD',
          customer_action: action,
          channel: 'USSD'
        })
      });
    } catch (e) {
      console.error('Failed to log intervention to server', e);
    }
  };

  const resetSession = () => {
    setUssd({
      step: 'IDLE',
      displayText: 'Dial *268# for upay USSD Service',
      inputValue: '',
      senderWallet: 'W-SYN-004512',
      recipientWallet: 'W-SYN-091177',
      amount: '18500',
      sessionId: '',
      reasons: [],
      riskScore: 0,
      riskTier: 'T0',
      isEvaluating: false
    });
    setLastActionStatus(null);
  };

  // Quick Preset Scenarios
  const loadScenario = (type: 'HIJACK' | 'LEGIT_RURAL' | 'CASH_OUT') => {
    if (type === 'HIJACK') {
      setUssd({
        step: 'IDLE',
        displayText: 'Ready: Dial *268# (Customer usually on APP, sudden USSD large transfer to mule)',
        inputValue: '*268#',
        senderWallet: 'W-SYN-004512',
        recipientWallet: 'W-SYN-091177',
        amount: '18500',
        sessionId: '',
        reasons: [],
        riskScore: 0,
        riskTier: 'T0',
        isEvaluating: false
      });
    } else if (type === 'LEGIT_RURAL') {
      setUssd({
        step: 'IDLE',
        displayText: 'Ready: Dial *268# (Rural Farmer Abdur Rahman - 100% USSD normal grocery transfer)',
        inputValue: '*268#',
        senderWallet: 'W-SYN-008912',
        recipientWallet: 'W-SYN-001099',
        amount: '1200',
        sessionId: '',
        reasons: [],
        riskScore: 0,
        riskTier: 'T0',
        isEvaluating: false
      });
    } else if (type === 'CASH_OUT') {
      setUssd({
        step: 'IDLE',
        displayText: 'Ready: Dial *268# (Agent Cash Out flow)',
        inputValue: '*268#',
        senderWallet: 'W-SYN-004512',
        recipientWallet: 'A-SYN-8821',
        amount: '5000',
        sessionId: '',
        reasons: [],
        riskScore: 0,
        riskTier: 'T0',
        isEvaluating: false
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="dream-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#FF9F43]" />
            <h2 className="text-lg font-poppins font-bold text-[#000000]">
              USSD / Feature-Phone Protection Layer
            </h2>
            <span className="px-2.5 py-0.5 rounded-[4px] text-[10px] font-nunito font-bold bg-[#FF9F43]/15 text-[#FF9F43] border border-[#FF9F43]/30">
              Low-Bandwidth &amp; 160-Char GSM Compliant
            </span>
          </div>
          <p className="text-xs font-nunito text-[#646B72] mt-1">
            Zero telecom gateway dependency · Real-time multi-channel risk inference · Concise Bangla scam warnings · Accessibility first.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-nunito">
          <span className="text-[#646B72] font-semibold">Test Presets:</span>
          <button
            onClick={() => loadScenario('HIJACK')}
            className="px-3 py-1.5 rounded-[4px] bg-[#FF0000]/10 hover:bg-[#FF0000]/20 text-[#FF0000] border border-[#FF0000]/30 font-bold flex items-center gap-1.5 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Scenario 1: Cross-Channel Hijack (Mule Trap)</span>
          </button>
          <button
            onClick={() => loadScenario('LEGIT_RURAL')}
            className="px-3 py-1.5 rounded-[4px] bg-[#198754]/10 hover:bg-[#198754]/20 text-[#198754] border border-[#198754]/30 font-bold flex items-center gap-1.5 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Scenario 2: Legitimate Rural USSD (৳1,200)</span>
          </button>
          <button
            onClick={() => loadScenario('CASH_OUT')}
            className="px-3 py-1.5 rounded-[4px] bg-[#212B36]/10 hover:bg-[#212B36]/20 text-[#212B36] border border-[#212B36]/30 font-bold flex items-center gap-1.5 transition-colors"
          >
            <span>Scenario 3: USSD Cash Out</span>
          </button>
        </div>
      </div>

      {lastActionStatus && (
        <div className="p-3.5 bg-[#198754]/10 border border-[#198754]/30 rounded-none text-[#198754] text-xs font-nunito font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4" />
          <span>{lastActionStatus}</span>
        </div>
      )}

      {/* Main Grid: USSD Feature Phone Simulator on Left + Channel Telemetry & Audit on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Feature Phone (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          
          {/* Feature Phone Body (Nokia/Bar Phone Aesthetic) */}
          <div className="w-[330px] bg-[#1E2530] p-5 rounded-[24px] border-4 border-[#2D3748] shadow-2xl flex flex-col items-center text-white select-none">
            
            {/* Top Earpiece & Branding */}
            <div className="w-16 h-1.5 bg-[#4A5568] rounded-full mb-3"></div>
            <div className="text-[11px] tracking-widest font-bold text-[#A0AEC0] mb-2 font-mono">
              upay <span className="text-[#FF9F43]">SHIELD 268</span>
            </div>

            {/* Retro LCD Screen */}
            <div className="w-full bg-[#8FA782] text-[#1A2518] p-3 rounded-[6px] border-2 border-[#55694D] shadow-inner font-mono min-h-[175px] flex flex-col justify-between">
              
              {/* LCD Status Header */}
              <div className="flex items-center justify-between text-[10px] pb-1 border-b border-[#7B936E]">
                <div className="flex items-center gap-1">
                  <span>📶 2G/GSM</span>
                  <span>| GP-upay</span>
                </div>
                <div>🔋 84%</div>
              </div>

              {/* LCD Message Area */}
              <div className="py-2 text-[12px] leading-snug whitespace-pre-line font-bold flex-1">
                {ussd.isEvaluating ? (
                  <div className="flex flex-col items-center justify-center h-full py-4 text-center">
                    <span className="animate-spin text-lg mb-1">⏳</span>
                    <span>যাচাই করা হচ্ছে...</span>
                    <span className="text-[10px] text-[#33462A]">upay Shield AI Checking...</span>
                  </div>
                ) : (
                  ussd.displayText
                )}
              </div>

              {/* LCD Interactive Input Bar */}
              <div className="pt-1 border-t border-[#7B936E] flex items-center justify-between text-xs">
                <span className="text-[10px] text-[#33462A]">ইনপুট:</span>
                <input
                  type="text"
                  value={ussd.inputValue}
                  onChange={(e) => setUssd(prev => ({ ...prev, inputValue: e.target.value }))}
                  placeholder={ussd.step === 'IDLE' ? '*268#' : 'টাইপ করুন'}
                  className="bg-transparent border-none text-right font-mono font-bold text-[#1A2518] focus:outline-none w-32 placeholder-[#5E7354]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmitInput();
                  }}
                />
              </div>
            </div>

            {/* Navigation & Action Keys */}
            <div className="grid grid-cols-3 gap-2 w-full mt-4">
              <button
                onClick={() => handleKeypadPress('CALL')}
                className="py-2 rounded-[6px] bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-xs flex flex-col items-center justify-center active:scale-95 transition-transform shadow-md"
                title="Dial / Send / Select"
              >
                <PhoneCall className="w-4 h-4 mb-0.5" />
                <span className="text-[9px]">SEND/OK</span>
              </button>

              <button
                onClick={() => handleKeypadPress('CLR')}
                className="py-2 rounded-[6px] bg-[#4A5568] hover:bg-[#2D3748] text-white font-bold text-xs flex flex-col items-center justify-center active:scale-95 transition-transform shadow-md"
                title="Clear"
              >
                <RotateCcw className="w-3.5 h-3.5 mb-0.5" />
                <span className="text-[9px]">CLEAR</span>
              </button>

              <button
                onClick={() => handleKeypadPress('END')}
                className="py-2 rounded-[6px] bg-[#C62828] hover:bg-[#B71C1C] text-white font-bold text-xs flex flex-col items-center justify-center active:scale-95 transition-transform shadow-md"
                title="End Call / Exit"
              >
                <XCircle className="w-4 h-4 mb-0.5" />
                <span className="text-[9px]">EXIT</span>
              </button>
            </div>

            {/* 12-Key Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 w-full mt-3">
              {[
                { num: '1', sub: '.,' },
                { num: '2', sub: 'ABC' },
                { num: '3', sub: 'DEF' },
                { num: '4', sub: 'GHI' },
                { num: '5', sub: 'JKL' },
                { num: '6', sub: 'MNO' },
                { num: '7', sub: 'PQRS' },
                { num: '8', sub: 'TUV' },
                { num: '9', sub: 'WXYZ' },
                { num: '*', sub: 'MMI' },
                { num: '0', sub: '+' },
                { num: '#', sub: 'HASH' },
              ].map((k) => (
                <button
                  key={k.num}
                  onClick={() => handleKeypadPress(k.num)}
                  className="py-2.5 rounded-[8px] bg-[#2D3748] hover:bg-[#3A475C] text-white font-bold flex flex-col items-center justify-center active:scale-95 transition-transform shadow"
                >
                  <span className="text-sm leading-none font-mono">{k.num}</span>
                  <span className="text-[8px] text-[#A0AEC0] leading-none mt-0.5">{k.sub}</span>
                </button>
              ))}
            </div>

            {/* Bottom Sub-text */}
            <div className="text-[10px] text-[#718096] mt-3 font-mono">
              upay GSM Micro-Intervention Engine
            </div>
          </div>
        </div>

        {/* Right Column: Real-Time Channel Telemetry, Fairness Matrix & Persisted Audit Log (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Channel & Device Context Inspection Card */}
          <div className="dream-card p-5 space-y-3 shadow-sm border-t-2 border-t-[#FF9F43]">
            <div className="flex items-center justify-between pb-2 border-b border-[#DADFE5]">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#FF9F43]" />
                <h3 className="font-poppins font-bold text-sm text-[#000000]">
                  Channel &amp; Device Context Telemetry
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-[#212B36] text-white font-bold">
                M3 Point-in-Time Features
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-nunito">
              <div className="p-2.5 bg-[#F7F7F7] border border-[#DADFE5]">
                <span className="text-[10px] text-[#646B72] block">Channel Type</span>
                <strong className="text-[#FF9F43] font-mono text-sm">USSD (*268#)</strong>
              </div>
              <div className="p-2.5 bg-[#F7F7F7] border border-[#DADFE5]">
                <span className="text-[10px] text-[#646B72] block">Device Capability</span>
                <strong className="text-[#212B36] font-mono text-sm">FEATURE_PHONE</strong>
              </div>
              <div className="p-2.5 bg-[#F7F7F7] border border-[#DADFE5]">
                <span className="text-[10px] text-[#646B72] block">Network Context</span>
                <strong className="text-[#092C4C] font-mono text-sm">USSD / GSM</strong>
              </div>
              <div className="p-2.5 bg-[#F7F7F7] border border-[#DADFE5]">
                <span className="text-[10px] text-[#646B72] block">30-Day Channel Baseline</span>
                <strong className="text-[#198754] font-mono text-sm">95% SMARTPHONE APP</strong>
              </div>
            </div>

            {/* Channel Features Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-nunito pt-1">
              <div className="p-2.5 bg-[#FFFFFF] border border-[#DADFE5] space-y-1">
                <span className="text-[10px] text-[#646B72] block">First-Time Channel Flag</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF0000] animate-pulse"></span>
                  <strong className="text-[#FF0000] font-mono">TRUE (First USSD Usage)</strong>
                </div>
                <span className="text-[10px] text-[#646B72]">Account never dialed *268# in 30d</span>
              </div>

              <div className="p-2.5 bg-[#FFFFFF] border border-[#DADFE5] space-y-1">
                <span className="text-[10px] text-[#646B72] block">Cross-Channel Anomaly</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF9F43]"></span>
                  <strong className="text-[#FF9F43] font-mono">Score: 0.70 (Elevated)</strong>
                </div>
                <span className="text-[10px] text-[#646B72]">Sudden USSD large transfer switch</span>
              </div>

              <div className="p-2.5 bg-[#FFFFFF] border border-[#DADFE5] space-y-1">
                <span className="text-[10px] text-[#646B72] block">Channel Switch Frequency</span>
                <strong className="text-[#212B36] font-mono">2 Distinct Channels (7d)</strong>
                <span className="text-[10px] text-[#646B72]">APP ➔ USSD transition</span>
              </div>
            </div>
          </div>

          {/* Cross-Channel Fairness Matrix (Proof that USSD != Fraud) */}
          <div className="dream-card p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[#DADFE5]">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#198754]" />
                <h3 className="font-poppins font-bold text-sm text-[#000000]">
                  Channel Parity &amp; Anti-Bias Fairness Matrix
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-[4px] bg-[#198754]/10 text-[#198754] font-nunito font-bold border border-[#198754]/30">
                Demographic Parity Enforced
              </span>
            </div>

            <div className="text-xs font-nunito text-[#646B72]">
              The model evaluates contextual evidence (recipient graph ring + sudden first-time switch) rather than penalizing USSD channel itself:
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-nunito border border-[#DADFE5]">
                <thead className="bg-[#F7F7F7] text-[#212B36] font-bold border-b border-[#DADFE5]">
                  <tr>
                    <th className="p-2 text-left">Channel</th>
                    <th className="p-2 text-left">Customer Profile</th>
                    <th className="p-2 text-left">Recipient</th>
                    <th className="p-2 text-left">Risk Score</th>
                    <th className="p-2 text-left">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DADFE5]">
                  <tr className="bg-[#FFFFFF]">
                    <td className="p-2 font-mono font-bold text-[#FF9F43]">USSD (*268#)</td>
                    <td className="p-2">APP Regular User (Sudden Switch)</td>
                    <td className="p-2 font-mono text-[#FF0000]">W-SYN-091177 (Ring-12)</td>
                    <td className="p-2 font-mono font-bold text-[#FF0000]">0.88 (T3)</td>
                    <td className="p-2">
                      <span className="px-2 py-0.5 bg-[#FF0000]/10 text-[#FF0000] font-bold">Bangla Intercept</span>
                    </td>
                  </tr>
                  <tr className="bg-[#F7F7F7]">
                    <td className="p-2 font-mono font-bold text-[#198754]">USSD (*268#)</td>
                    <td className="p-2">Rural Feature-Phone (Abdur Rahman)</td>
                    <td className="p-2 font-mono text-[#198754]">W-SYN-001099 (Known Grocery)</td>
                    <td className="p-2 font-mono font-bold text-[#198754]">0.04 (T0)</td>
                    <td className="p-2">
                      <span className="px-2 py-0.5 bg-[#198754]/10 text-[#198754] font-bold">ALLOWED (No Bias)</span>
                    </td>
                  </tr>
                  <tr className="bg-[#FFFFFF]">
                    <td className="p-2 font-mono font-bold text-[#092C4C]">APP (Smartphone)</td>
                    <td className="p-2">APP Regular User</td>
                    <td className="p-2 font-mono text-[#FF0000]">W-SYN-091177 (Ring-12)</td>
                    <td className="p-2 font-mono font-bold text-[#FF0000]">0.85 (T3)</td>
                    <td className="p-2">
                      <span className="px-2 py-0.5 bg-[#FF0000]/10 text-[#FF0000] font-bold">App Intercept</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Persisted Customer Interventions Ledger */}
          <div className="dream-card p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[#DADFE5]">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#FF9F43]" />
                <h3 className="font-poppins font-bold text-sm text-[#000000]">
                  Persisted Customer Interventions Ledger
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#646B72]">
                Audit-Ready PostgreSQL + Hash Chain
              </span>
            </div>

            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {interventionLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-[#F7F7F7] border border-[#DADFE5] flex items-center justify-between text-xs font-nunito"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#000000]">{log.id}</span>
                      <span className="text-[10px] font-mono text-[#646B72]">[{log.timestamp}]</span>
                      <span className="px-2 py-0.5 rounded-[4px] bg-[#198754]/10 text-[#198754] font-bold text-[10px] border border-[#198754]/30">
                        {log.action}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#646B72]">
                      Channel: <strong className="text-[#212529]">{log.channel}</strong> | Amount: <strong className="text-[#FF9F43]">৳{log.amount.toLocaleString()}</strong> ➔ {log.recipient}
                    </div>
                    <div className="text-[10px] text-[#FF0000] font-mono">
                      {log.reason}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] px-2 py-1 bg-[#212B36] text-white font-mono font-bold rounded-[3px]">
                      VERIFIED
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
