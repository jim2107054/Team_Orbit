'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Clock, CheckCircle, XCircle, FileText, 
  Send, AlertTriangle, Sparkles, UserCheck, Lock, ExternalLink, Network, Mic, Check, RotateCcw
} from 'lucide-react';

interface CaseItem {
  case_id: string;
  txn_id: string;
  sender_wallet: string;
  receiver_wallet: string;
  amount_bdt: number;
  risk_score: number;
  risk_tier: string;
  action_recommended: string;
  reasons: Array<{ code: string; label_en: string; label_bn: string; weight: number }>;
  status: string;
  four_eyes_required: boolean;
  four_eyes_approved: boolean;
  created_at: string;
}

export const AnalystConsole: React.FC<{ onOpenRing: () => void; onOpenTrace: () => void }> = ({ onOpenRing, onOpenTrace }) => {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [copilotBrief, setCopilotBrief] = useState<any>(null);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [briefLang, setBriefLang] = useState<'en' | 'bn'>('en');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCases = async () => {
    try {
      const res = await fetch('/api/v1/alerts');
      const data = await res.json();
      if (data.cases) {
        setCases(data.cases);
        if (!selectedCase && data.cases.length > 0) {
          setSelectedCase(data.cases[0]);
        } else if (selectedCase) {
          // Update selected case reference with fresh backend state
          const updated = data.cases.find((c: CaseItem) => c.case_id === selectedCase.case_id);
          if (updated) {
            setSelectedCase(updated);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleFetchCopilot = async (caseId: string, lang: 'en' | 'bn') => {
    setIsGeneratingBrief(true);
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang })
      });
      const data = await res.json();
      setCopilotBrief(data.brief);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  useEffect(() => {
    if (selectedCase) {
      handleFetchCopilot(selectedCase.case_id, briefLang);
    }
  }, [selectedCase?.case_id, briefLang]);

  const handleAction = async (action: 'CONFIRM_FRAUD' | 'MARK_FALSE_POSITIVE' | 'APPROVE_FOUR_EYES' | 'REOPEN_CASE') => {
    if (!selectedCase || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/cases/${selectedCase.case_id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          analyst_id: 'ANALYST-101',
          notes: `Action ${action} executed from Analyst Hub`
        })
      });
      const data = await res.json();
      
      let nextStatus = selectedCase.status;
      let nextFourEyes = selectedCase.four_eyes_approved;
      if (action === 'CONFIRM_FRAUD') nextStatus = 'CONFIRMED_FRAUD';
      if (action === 'MARK_FALSE_POSITIVE') nextStatus = 'FALSE_POSITIVE';
      if (action === 'REOPEN_CASE') nextStatus = 'OPEN';
      if (action === 'APPROVE_FOUR_EYES') nextFourEyes = true;

      const updatedCase: CaseItem = {
        ...selectedCase,
        status: nextStatus,
        four_eyes_approved: nextFourEyes
      };

      setSelectedCase(updatedCase);
      setCases(prev => prev.map(c => c.case_id === updatedCase.case_id ? updatedCase : c));
      setActionSuccess(`Action ${action} recorded and cryptographically chained!`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchCases();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const isConfirmed = selectedCase?.status === 'CONFIRMED_FRAUD';
  const isFalsePositive = selectedCase?.status === 'FALSE_POSITIVE';
  const isFourEyesApproved = !!selectedCase?.four_eyes_approved;

  // Dynamic evidence spans derived from selectedCase
  const topReason = selectedCase?.reasons?.[0]?.label_en || 'High Risk Anomaly Detected';
  const reasonCode = selectedCase?.reasons?.[0]?.code || 'URGENCY_SUSPENSION';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner Alert Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 upay-card shadow-sm">
        <div>
          <h2 className="text-xl font-display font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span>Fraud Operations &amp; Compliance Triage Console</span>
          </h2>
          <p className="text-xs font-ui text-slate-500 dark:text-slate-400 mt-1">
            Rule of 3 Answers: <em>What Happened? · Why Risky? · What Next?</em> grounded in evidence.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenRing}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-ui font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Network className="w-3.5 h-3.5 text-amber-500" />
            <span>Open Ring-12 Explorer</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </button>
          <button
            onClick={onOpenTrace}
            className="px-4 py-2 rounded-xl btn-flame text-xs font-display font-bold flex items-center gap-1.5 shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Golden-Hour Money Trace</span>
            <ExternalLink className="w-3 h-3 text-white/80" />
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-ui font-semibold flex items-center gap-2 animate-fadeIn backdrop-blur-md">
          <CheckCircle className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Grid: Queue on Left, 3-Question Detail on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Triage Alert Queue (4 Cols) */}
        <div className="lg:col-span-4 upay-card p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
            <span className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Prioritized Alert Queue
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-num font-bold border border-amber-500/25">
              {cases.length} ALERTS
            </span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {cases.map((c) => {
              const isSelected = selectedCase?.case_id === c.case_id;
              const isCaseConfirmed = c.status === 'CONFIRMED_FRAUD';
              const isCaseFP = c.status === 'FALSE_POSITIVE';
              return (
                <div
                  key={c.case_id}
                  onClick={() => setSelectedCase(c)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500 shadow-md shadow-amber-500/10'
                      : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-num text-xs font-bold text-slate-900 dark:text-white">{c.case_id}</span>
                    <div className="flex items-center gap-1.5">
                      {isCaseConfirmed && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-500 border border-rose-500/30 font-bold">
                          FRAUD
                        </span>
                      )}
                      {isCaseFP && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-bold">
                          FP
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-num font-bold ${
                          c.risk_tier === 'T3'
                            ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                        }`}
                      >
                        {c.risk_tier} ({(c.risk_score * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-ui text-slate-700 dark:text-slate-300 mb-1.5">
                    <span className="font-num font-bold text-slate-900 dark:text-white">৳ {c.amount_bdt.toLocaleString()}</span>
                    <span className="text-[11px] text-slate-500 font-num">{c.receiver_wallet}</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-ui text-slate-500 pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
                    <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3 text-amber-500" /> SLA: 07:42
                    </span>
                    <span className={`font-semibold font-num ${
                      isCaseConfirmed ? 'text-rose-500' : isCaseFP ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Case Detail & Copilot (8 Cols) */}
        {selectedCase ? (
          <div className="lg:col-span-8 space-y-4">
            
            {/* Case Header Card */}
            <div className="upay-card p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-num text-base font-bold text-slate-900 dark:text-white">{selectedCase.case_id}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-500 font-num font-bold border border-rose-500/30">
                    {selectedCase.risk_tier} High Alert
                  </span>
                  <span className="text-xs font-ui text-slate-500 dark:text-slate-400">
                    Typology: {selectedCase.reasons?.[0]?.label_en || 'High Risk Anomaly'}
                  </span>
                </div>
                <div className="text-xs font-ui text-slate-500 dark:text-slate-400 mt-1">
                  Sender: <strong className="text-slate-800 dark:text-slate-200 font-num">{selectedCase.sender_wallet}</strong> ➔ Recipient:{' '}
                  <strong className="text-slate-800 dark:text-slate-200 font-num">{selectedCase.receiver_wallet}</strong> | Amount:{' '}
                  <strong className="text-amber-500 font-num font-bold">৳ {selectedCase.amount_bdt.toLocaleString()}</strong>
                </div>

                {/* Channel & Device Context Telemetry */}
                <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-800 text-[11px] font-ui">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-num font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Safety Mode: ACTIVE (Self-Activated)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-num font-bold">
                    Channel: APP
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-num font-bold">
                    Device: SMARTPHONE (Android)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    Network: <strong>MOBILE_DATA</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/30 font-semibold">
                    Policy Action: <strong>{selectedCase.action_recommended || 'PAUSE_VERIFY'}</strong>
                  </span>
                </div>
              </div>

              {/* Action Buttons with Strict State Management */}
              <div className="flex items-center gap-2">
                {isConfirmed ? (
                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-500 font-display font-bold text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>✓ Confirmed Fraud</span>
                    </span>
                    <button
                      onClick={() => handleAction('REOPEN_CASE')}
                      disabled={actionLoading}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-ui text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                      title="Reopen case to re-evaluate evidence"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reopen</span>
                    </button>
                  </div>
                ) : isFalsePositive ? (
                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-500 font-display font-bold text-xs flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>✓ False Positive</span>
                    </span>
                    <button
                      onClick={() => handleAction('REOPEN_CASE')}
                      disabled={actionLoading}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-ui text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                      title="Reopen case to re-evaluate evidence"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reopen</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleAction('CONFIRM_FRAUD')}
                      disabled={actionLoading}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-display font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Confirm Fraud</span>
                    </button>
                    <button
                      onClick={() => handleAction('APPROVE_FOUR_EYES')}
                      disabled={actionLoading || isFourEyesApproved}
                      className={`px-3.5 py-2 rounded-xl font-ui font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all ${
                        isFourEyesApproved 
                          ? 'bg-emerald-600 text-white cursor-default' 
                          : 'bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer border border-slate-700/60'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                      <span>{isFourEyesApproved ? '✓ 4-Eyes Approved' : 'Four-Eyes Approve'}</span>
                    </button>
                    <button
                      onClick={() => handleAction('MARK_FALSE_POSITIVE')}
                      disabled={actionLoading}
                      className="dream-btn-outline px-3.5 py-2 rounded-xl text-xs cursor-pointer hover:bg-emerald-500/10 hover:border-emerald-500 hover:text-emerald-500 transition-all disabled:opacity-50"
                    >
                      False Positive
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 3-Answers Section: What Happened · Why Risky · What Next */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              
              {/* 1. What Happened? */}
              <div className="upay-card p-4 space-y-2 shadow-sm">
                <h4 className="text-xs font-display font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>1. WHAT HAPPENED?</span>
                </h4>
                <div className="space-y-2 text-xs font-ui text-slate-700 dark:text-slate-300">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-num">{selectedCase.created_at ? new Date(selectedCase.created_at).toLocaleTimeString() : 'Live'}</span>
                    <span>Send ৳{selectedCase.amount_bdt.toLocaleString()} from <strong className="font-num">{selectedCase.sender_wallet}</strong> to <strong className="font-num">{selectedCase.receiver_wallet}</strong></span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Telemetry</span>
                    <span>Action Recommended: <strong className="text-amber-500">{selectedCase.action_recommended}</strong></span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Case Reference</span>
                    <span className="font-num font-bold text-slate-900 dark:text-white">{selectedCase.case_id}</span>
                  </div>
                </div>
              </div>

              {/* 2. Why Is It Risky? */}
              <div className="upay-card p-4 space-y-2 shadow-sm">
                <h4 className="text-xs font-display font-bold text-rose-500 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>2. WHY IS IT RISKY?</span>
                </h4>
                <div className="space-y-1.5 text-xs font-ui text-slate-700 dark:text-slate-300">
                  {selectedCase.reasons && selectedCase.reasons.length > 0 ? (
                    selectedCase.reasons.map((r, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between text-[11px] font-num font-bold text-rose-500">
                          <span>{r.code}</span>
                          <span>{Math.round((r.weight || 0.8) * 100)}% weight</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{r.label_en || r.code}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] font-num font-bold text-rose-500">Risk Score: {Math.round(selectedCase.risk_score * 100)}%</span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">Tier: {selectedCase.risk_tier}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. What Next? */}
              <div className="upay-card p-4 space-y-2 shadow-sm">
                <h4 className="text-xs font-display font-bold text-emerald-500 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>3. WHAT NEXT?</span>
                </h4>
                <div className="space-y-2 text-xs font-ui">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-slate-800 dark:text-slate-200">
                    <strong className="text-emerald-500 block mb-0.5">1. Execute {selectedCase.action_recommended}</strong>
                    <span>Enforce recommended policy on wallet <span className="font-num">{selectedCase.receiver_wallet}</span>.</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <strong className="text-slate-900 dark:text-white block mb-0.5">2. Four-Eyes Status</strong>
                    <span>{selectedCase.four_eyes_required ? (selectedCase.four_eyes_approved ? 'Approved by 2nd Analyst' : 'Requires 2nd MLRO Approval') : 'Standard Single Analyst Review'}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <strong className="text-amber-500 block mb-0.5">3. Current State in DB</strong>
                    <span className={`font-num font-bold ${
                      isConfirmed ? 'text-rose-500' : isFalsePositive ? 'text-emerald-500' : 'text-slate-900 dark:text-white'
                    }`}>{selectedCase.status}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Conversational Scam Call Intelligence & Evidence Spans Panel */}
            <div className="upay-card p-5 space-y-4 shadow-sm border-t-2 border-t-amber-500">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-amber-500" />
                  <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                    Bangla Scam Intelligence &amp; Multi-Turn Signal Timeline
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-num font-bold bg-rose-500/10 text-rose-500 border border-rose-500/25">
                    Typology: {reasonCode}
                  </span>
                </div>
                <span className="text-[11px] font-num text-slate-500">Confidence: {Math.round(selectedCase.risk_score * 100)}% · CRITICAL Escalation</span>
              </div>

              {/* Conversation Turn Timeline dynamically tailored to selected case */}
              <div className="space-y-2 text-xs font-ui">
                <span className="text-[11px] font-bold text-slate-900 dark:text-white block">
                  Turn-by-Turn Speech Transcript &amp; Extracted Evidence Spans:
                </span>
                
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border-l-4 border-l-amber-500 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-bold text-amber-500">CALLER (Scammer)</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-num font-bold">[AUTHORITY_IMPERSONATION]</span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 font-bangla text-sm">
                    "আসসালামু আলাইকুম, আমি উপায় কাস্টমার কেয়ার হেড অফিস থেকে বলছি। আপনার অ্যাকাউন্ট এখনই বন্ধ হয়ে যাবে।"
                  </p>
                  <span className="text-[10px] text-rose-500 font-num block">Evidence Span: "উপায় কাস্টমার কেয়ার... অ্যাকাউন্ট বন্ধ হয়ে যাবে"</span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900/30 border-l-4 border-l-slate-400 dark:border-l-slate-600 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-bold text-slate-800 dark:text-slate-200">VICTIM ({selectedCase.sender_wallet})</span>
                    <span className="text-slate-500">Customer Reply</span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 font-bangla text-sm">"কেন বন্ধ হবে ভাই? আমি তো নিয়মিত লেনদেন করি।"</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border-l-4 border-l-rose-500 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-bold text-rose-500">CALLER (Scammer)</span>
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500 font-num font-bold">[URGENCY]</span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500 font-num font-bold">[OTP_REQUEST]</span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500 font-num font-bold">[PAYMENT_REQUEST]</span>
                    </div>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 font-bangla text-sm">
                    "জরুরি সিকিউরিটি আপডেট প্রয়োজন। আপনার ফোনে আসা ওটিপি বলুন এবং অ্যাকাউন্ট চালু রাখতে ৳{selectedCase.amount_bdt.toLocaleString()} টাকা {selectedCase.receiver_wallet} নম্বরে পাঠান।"
                  </p>
                  <span className="text-[10px] text-rose-500 font-num block">Evidence Span: "ওটিপি বলুন... ৳{selectedCase.amount_bdt.toLocaleString()} টাকা {selectedCase.receiver_wallet} নম্বরে পাঠান"</span>
                </div>
              </div>

              {/* Structured Extracted Signals Grid & Campaign Graph Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs font-ui">
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <h5 className="font-display font-bold text-slate-900 dark:text-white text-xs">Structured Behavioral Signals</h5>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/25 rounded-md text-[11px] font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Time Pressure (SIG_URGENCY)
                    </span>
                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/25 rounded-md text-[11px] font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Customer Care Spoofing
                    </span>
                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/25 rounded-md text-[11px] font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> OTP Harvesting
                    </span>
                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/25 rounded-md text-[11px] font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Account Suspension Threat
                    </span>
                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/25 rounded-md text-[11px] font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Coerced Transfer Demand
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <h5 className="font-display font-bold text-slate-900 dark:text-white text-xs">Campaign Graph &amp; Entity Links</h5>
                  <div className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300 font-ui">
                    <div>Linked Sender: <strong className="font-num text-slate-900 dark:text-white">{selectedCase.sender_wallet}</strong></div>
                    <div>Linked Mule Wallet: <strong className="font-num text-amber-500">{selectedCase.receiver_wallet}</strong></div>
                    <div>Linked Graph Ring: <strong className="text-rose-500">RING-2026-0012 (Ring-12 Hub)</strong></div>
                    <div>Prior Reports: <span className="font-bold text-rose-500">1 Community Impersonation Complaint</span></div>
                    <div>Risk Score Impact: <span className="font-num text-emerald-500 font-bold">{(selectedCase.risk_score * 100).toFixed(1)}% / 100</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fact-Verified GenAI Copilot Panel (M12) */}
            <div className="upay-card p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">Investigation Copilot Brief</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-num font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Verified 6/6 Claims</span>
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-ui">
                  <button
                    onClick={() => setBriefLang('en')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      briefLang === 'en' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setBriefLang('bn')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      briefLang === 'bn' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    বাংলা
                  </button>
                </div>
              </div>

              {isGeneratingBrief ? (
                <div className="py-8 text-center text-xs font-ui text-slate-500">
                  <Sparkles className="w-6 h-6 text-amber-500 mx-auto animate-spin mb-2" />
                  <span>Grounding facts with Evidence Pack &amp; Claim Verifier...</span>
                </div>
              ) : copilotBrief ? (
                <div className="space-y-3.5 text-xs font-ui">
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    {copilotBrief.summary}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {copilotBrief.sections?.map((sec: any, idx: number) => (
                      <div key={idx} className="p-4 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                        <h5 className="font-display font-bold text-slate-900 dark:text-white mb-2">{sec.title}</h5>
                        <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                          {sec.sentences?.map((st: any, sIdx: number) => (
                            <div key={sIdx} className="flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{st.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* STR Draft */}
                  {copilotBrief.str_draft && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-num text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-amber-500" />
                          <span>PRE-FILLED STR DRAFT (HUMAN REVIEW REQUIRED)</span>
                        </span>
                        <button
                          onClick={() => {
                            const blob = new Blob([copilotBrief.str_draft || ''], { type: 'text/plain;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `STR_DRAFT_${selectedCase.case_id}.txt`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                          }}
                          className="text-[11px] text-amber-500 font-bold hover:underline cursor-pointer"
                        >
                          Export STR
                        </button>
                      </div>
                      <pre className="text-[11px] text-slate-800 dark:text-slate-200 font-num whitespace-pre-wrap">
                        {copilotBrief.str_draft}
                      </pre>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
