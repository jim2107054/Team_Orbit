'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Clock, CheckCircle, XCircle, FileText, 
  Send, AlertTriangle, Sparkles, UserCheck, Lock, ExternalLink
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

  const fetchCases = async () => {
    try {
      const res = await fetch('/api/v1/alerts');
      const data = await res.json();
      if (data.cases) {
        setCases(data.cases);
        if (data.cases.length > 0 && !selectedCase) {
          setSelectedCase(data.cases[0]);
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
  }, [selectedCase, briefLang]);

  const handleAction = async (action: 'CONFIRM_FRAUD' | 'MARK_FALSE_POSITIVE' | 'APPROVE_FOUR_EYES') => {
    if (!selectedCase) return;
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
      setActionSuccess(`Action ${action} recorded with SHA-256 Audit Log!`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchCases();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Alert Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 glass-panel rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <span>Fraud Operations & Compliance Triage Console</span>
          </h2>
          <p className="text-xs text-slate-400">
            Rule of 3 Answers: <em>What Happened? · Why Risky? · What Next?</em> backed by Fact-Verified Copilot.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenRing}
            className="px-3 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/40 text-purple-300 text-xs font-semibold flex items-center gap-1.5"
          >
            <span>🕸️ Open Ring-12 Explorer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenTrace}
            className="px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5"
          >
            <span>⚡ Golden-Hour Money Trace</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Grid: Queue on Left, 3-Question Detail on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Triage Alert Queue (4 Cols) */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-4 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300">PRIORITIZED ALERT QUEUE</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
              {cases.length} ALERTS
            </span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {cases.map((c) => {
              const isSelected = selectedCase?.case_id === c.case_id;
              return (
                <div
                  key={c.case_id}
                  onClick={() => setSelectedCase(c)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-white">{c.case_id}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                        c.risk_tier === 'T3'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {c.risk_tier} ({(c.risk_score * 100).toFixed(0)}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                    <span>৳ {c.amount_bdt.toLocaleString()}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{c.receiver_wallet}</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" /> SLA: 07:42
                    </span>
                    <span className="text-cyan-400 font-semibold">{c.status}</span>
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
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-extrabold text-white">{selectedCase.case_id}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold border border-red-500/30">
                    {selectedCase.risk_tier} High Alert
                  </span>
                  <span className="text-xs text-slate-400">Typology: Emergency-Relative Scam (T1)</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Sender: <strong className="text-slate-200">{selectedCase.sender_wallet}</strong> ➔ Recipient:{' '}
                  <strong className="text-slate-200">{selectedCase.receiver_wallet}</strong> | Amount:{' '}
                  <strong className="text-cyan-300">৳ {selectedCase.amount_bdt.toLocaleString()}</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAction('CONFIRM_FRAUD')}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Confirm Fraud</span>
                </button>
                <button
                  onClick={() => handleAction('APPROVE_FOUR_EYES')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Four-Eyes Approve</span>
                </button>
                <button
                  onClick={() => handleAction('MARK_FALSE_POSITIVE')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700"
                >
                  False Positive
                </button>
              </div>
            </div>

            {/* 3-Answers Section: What Happened · Why Risky · What Next */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* 1. What Happened? */}
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>1. WHAT HAPPENED?</span>
                </h4>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-2 bg-slate-900 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">23:41:07</span>
                    <span>Send ৳18,500 to new recipient</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">23:43:00</span>
                    <span>Recipient prepares 3 split layering hops</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">23:52:00</span>
                    <span>Cash-out attempt at Agent DH-8821</span>
                  </div>
                </div>
              </div>

              {/* 2. Why Is It Risky? */}
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>2. WHY IS IT RISKY?</span>
                </h4>
                <div className="space-y-1.5 text-xs text-slate-300">
                  {selectedCase.reasons.map((r, idx) => (
                    <div key={idx} className="p-2 bg-slate-900 rounded-lg border border-red-500/10">
                      <div className="flex items-center justify-between text-[11px] font-bold text-red-300">
                        <span>{r.code}</span>
                        <span>{(r.weight * 100).toFixed(0)}% weight</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">{r.label_en}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. What Next (Suggested Actions)? */}
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>3. WHAT NEXT?</span>
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-2 bg-emerald-950/30 border border-emerald-500/20 rounded-lg text-slate-200">
                    <strong className="text-emerald-300 block mb-0.5">1. Place Downstream Hold</strong>
                    <span>Hold ৳11,200 active in 2 downstream wallets.</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg text-slate-300">
                    <strong className="text-cyan-300 block mb-0.5">2. Welfare Callback</strong>
                    <span>Call victim Rahima to ensure physical safety.</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg text-slate-300">
                    <strong className="text-purple-300 block mb-0.5">3. Escalate Ring-12</strong>
                    <span>Add to MLRO file for formal STR reporting.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fact-Verified GenAI Copilot Panel (M12) */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-extrabold text-sm text-white">Investigation Copilot Brief</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>✔ Verified 6/6 Claims</span>
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setBriefLang('en')}
                    className={`px-2.5 py-1 rounded font-semibold ${
                      briefLang === 'en' ? 'bg-cyan-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setBriefLang('bn')}
                    className={`px-2.5 py-1 rounded font-semibold ${
                      briefLang === 'bn' ? 'bg-cyan-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    বাংলা
                  </button>
                </div>
              </div>

              {isGeneratingBrief ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Sparkles className="w-6 h-6 text-cyan-400 mx-auto animate-spin mb-2" />
                  <span>Grounding facts with Evidence Pack & Claim Verifier...</span>
                </div>
              ) : copilotBrief ? (
                <div className="space-y-4 text-xs">
                  <p className="text-slate-300 leading-relaxed font-medium bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    {copilotBrief.summary}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {copilotBrief.sections.map((sec: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                        <h5 className="font-bold text-slate-200 mb-2">{sec.title}</h5>
                        <div className="space-y-1.5 text-slate-300">
                          {sec.sentences.map((st: any, sIdx: number) => (
                            <div key={sIdx} className="flex items-start gap-1.5">
                              <span className="text-emerald-400 font-bold">✔</span>
                              <span>{st.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pre-filled STR Draft */}
                  {copilotBrief.str_draft && (
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[11px] text-slate-400">📄 PRE-FILLED STR DRAFT (HUMAN REVIEW REQUIRED)</span>
                        <button
                          onClick={() => alert('STR Draft Exported as PDF/JSON.')}
                          className="text-[11px] text-cyan-400 font-bold hover:underline"
                        >
                          Export STR
                        </button>
                      </div>
                      <pre className="text-[11px] text-slate-300 font-mono whitespace-pre-wrap">
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
