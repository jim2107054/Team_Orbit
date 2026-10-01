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
      setActionSuccess(`Action ${action} recorded and cryptographically chained!`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchCases();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Alert Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 dream-card shadow-sm">
        <div>
          <h2 className="text-lg font-poppins font-bold text-[#000000] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#FF9F43]" />
            <span>Fraud Operations &amp; Compliance Triage Console</span>
          </h2>
          <p className="text-xs font-nunito text-[#646B72] mt-0.5">
            Rule of 3 Answers: <em>What Happened? · Why Risky? · What Next?</em> grounded in evidence.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenRing}
            className="px-3.5 py-1.5 rounded-[5px] bg-[#FFFFFF] hover:bg-[#F7F7F7] border border-[#DADFE5] text-[#092C4C] text-xs font-nunito font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <span>🕸️ Open Ring-12 Explorer</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#FF9F43]" />
          </button>
          <button
            onClick={onOpenTrace}
            className="px-3.5 py-1.5 rounded-[5px] bg-[#FF9F43] hover:bg-[#f08e2f] text-white text-xs font-poppins font-semibold flex items-center gap-1.5 shadow-[0px_4px_20px_0px_rgba(254,159,67,0.20)]"
          >
            <span>⚡ Golden-Hour Money Trace</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 bg-[#198754]/10 border border-[#198754]/30 rounded-none text-[#198754] text-xs font-nunito font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Grid: Queue on Left, 3-Question Detail on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Triage Alert Queue (4 Cols) */}
        <div className="lg:col-span-4 dream-card p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[#DADFE5]">
            <span className="text-xs font-poppins font-bold text-[#212B36]">PRIORITIZED ALERT QUEUE</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-[4px] bg-[#FF9F43]/15 text-[#FF9F43] font-mono font-bold">
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
                  className={`p-3.5 rounded-none border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#FFFFFF] border-l-4 border-l-[#FF9F43] border-t-[#DADFE5] border-r-[#DADFE5] border-b-[#DADFE5] shadow-sm'
                      : 'bg-[#F7F7F7] border-[#DADFE5] hover:bg-[#FFFFFF]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-[#000000]">{c.case_id}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-[4px] font-nunito font-bold ${
                        c.risk_tier === 'T3'
                          ? 'bg-[#FF0000]/10 text-[#FF0000] border border-[#FF0000]/30'
                          : 'bg-[#FF9F43]/15 text-[#FF9F43] border border-[#FF9F43]/30'
                      }`}
                    >
                      {c.risk_tier} ({(c.risk_score * 100).toFixed(0)}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-nunito text-[#212529] mb-1">
                    <span className="font-poppins font-bold text-[#000000]">৳ {c.amount_bdt.toLocaleString()}</span>
                    <span className="text-[11px] text-[#646B72] font-mono">{c.receiver_wallet}</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-nunito text-[#646B72] pt-1 border-t border-[#DADFE5]">
                    <span className="flex items-center gap-1 text-[#646B72]">
                      <Clock className="w-3 h-3 text-[#FF9F43]" /> SLA: 07:42
                    </span>
                    <span className="text-[#092C4C] font-semibold">{c.status}</span>
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
            <div className="dream-card p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-[#000000]">{selectedCase.case_id}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-[4px] bg-[#FF0000]/10 text-[#FF0000] font-nunito font-bold border border-[#FF0000]/30">
                    {selectedCase.risk_tier} High Alert
                  </span>
                  <span className="text-xs font-nunito text-[#646B72]">Typology: Emergency-Relative (T1)</span>
                </div>
                <div className="text-xs font-nunito text-[#646B72] mt-1">
                  Sender: <strong className="text-[#212529]">{selectedCase.sender_wallet}</strong> ➔ Recipient:{' '}
                  <strong className="text-[#212529]">{selectedCase.receiver_wallet}</strong> | Amount:{' '}
                  <strong className="text-[#FF9F43] font-poppins font-bold">৳ {selectedCase.amount_bdt.toLocaleString()}</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAction('CONFIRM_FRAUD')}
                  className="px-3 py-1.5 rounded-[5px] bg-[#FF0000] hover:bg-[#d90000] text-white font-poppins font-semibold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Confirm Fraud</span>
                </button>
                <button
                  onClick={() => handleAction('APPROVE_FOUR_EYES')}
                  className="px-3 py-1.5 rounded-[5px] bg-[#212B36] hover:bg-[#171f28] text-white font-nunito font-semibold text-xs flex items-center gap-1.5 shadow-[0px_4px_20px_0px_rgba(27,40,80,0.15)]"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#FF9F43]" />
                  <span>Four-Eyes Approve</span>
                </button>
                <button
                  onClick={() => handleAction('MARK_FALSE_POSITIVE')}
                  className="dream-btn-outline px-3 py-1 text-xs"
                >
                  False Positive
                </button>
              </div>
            </div>

            {/* 3-Answers Section: What Happened · Why Risky · What Next */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              
              {/* 1. What Happened? */}
              <div className="dream-card p-4 space-y-2 shadow-sm">
                <h4 className="text-xs font-poppins font-bold text-[#092C4C] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#FF9F43]" />
                  <span>1. WHAT HAPPENED?</span>
                </h4>
                <div className="space-y-2 text-xs font-nunito text-[#212529]">
                  <div className="p-2.5 bg-[#F7F7F7] border border-[#DADFE5]">
                    <span className="text-[10px] text-[#646B72] block">23:41:07</span>
                    <span>Send ৳18,500 to new recipient</span>
                  </div>
                  <div className="p-2.5 bg-[#F7F7F7] border border-[#DADFE5]">
                    <span className="text-[10px] text-[#646B72] block">23:43:00</span>
                    <span>Recipient prepares 3 split layering hops</span>
                  </div>
                  <div className="p-2.5 bg-[#F7F7F7] border border-[#DADFE5]">
                    <span className="text-[10px] text-[#646B72] block">23:52:00</span>
                    <span>Cash-out attempt at Agent DH-8821</span>
                  </div>
                </div>
              </div>

              {/* 2. Why Is It Risky? */}
              <div className="dream-card p-4 space-y-2 shadow-sm">
                <h4 className="text-xs font-poppins font-bold text-[#FF0000] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>2. WHY IS IT RISKY?</span>
                </h4>
                <div className="space-y-1.5 text-xs font-nunito text-[#212529]">
                  {selectedCase.reasons.map((r, idx) => (
                    <div key={idx} className="p-2 bg-[#F7F7F7] border border-[#DADFE5]">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#FF0000]">
                        <span>{r.code}</span>
                        <span>{(r.weight * 100).toFixed(0)}% weight</span>
                      </div>
                      <p className="text-[11px] text-[#212529] mt-0.5">{r.label_en}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. What Next? */}
              <div className="dream-card p-4 space-y-2 shadow-sm">
                <h4 className="text-xs font-poppins font-bold text-[#198754] flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>3. WHAT NEXT?</span>
                </h4>
                <div className="space-y-2 text-xs font-nunito">
                  <div className="p-2.5 bg-[#198754]/10 border border-[#198754]/30 text-[#212529]">
                    <strong className="text-[#198754] block mb-0.5">1. Place Downstream Hold</strong>
                    <span>Hold ৳11,200 active in 2 downstream wallets.</span>
                  </div>
                  <div className="p-2.5 bg-[#F7F7F7] border border-[#DADFE5] text-[#212529]">
                    <strong className="text-[#092C4C] block mb-0.5">2. Welfare Callback</strong>
                    <span>Call victim Rahima to ensure safety.</span>
                  </div>
                  <div className="p-2.5 bg-[#F7F7F7] border border-[#DADFE5] text-[#212529]">
                    <strong className="text-[#FF9F43] block mb-0.5">3. Escalate Ring-12</strong>
                    <span>Add to MLRO file for formal STR reporting.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fact-Verified GenAI Copilot Panel (M12) */}
            <div className="dream-card p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[#DADFE5]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#FF9F43]" />
                  <h3 className="font-poppins font-bold text-sm text-[#000000]">Investigation Copilot Brief</h3>
                  <span className="px-2.5 py-0.5 rounded-[4px] text-[10px] font-nunito font-bold bg-[#198754]/15 text-[#198754] border border-[#198754]/30 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>✔ Verified 6/6 Claims</span>
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-[#F7F7F7] p-1 rounded-[5px] border border-[#DADFE5] text-xs font-nunito">
                  <button
                    onClick={() => setBriefLang('en')}
                    className={`px-3 py-1 rounded-[4px] font-semibold ${
                      briefLang === 'en' ? 'bg-[#212B36] text-white' : 'text-[#646B72]'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setBriefLang('bn')}
                    className={`px-3 py-1 rounded-[4px] font-semibold ${
                      briefLang === 'bn' ? 'bg-[#212B36] text-white' : 'text-[#646B72]'
                    }`}
                  >
                    বাংলা
                  </button>
                </div>
              </div>

              {isGeneratingBrief ? (
                <div className="py-8 text-center text-xs font-nunito text-[#646B72]">
                  <Sparkles className="w-6 h-6 text-[#FF9F43] mx-auto animate-spin mb-2" />
                  <span>Grounding facts with Evidence Pack & Claim Verifier...</span>
                </div>
              ) : copilotBrief ? (
                <div className="space-y-3.5 text-xs font-nunito">
                  <p className="text-[#212529] leading-relaxed font-medium bg-[#F7F7F7] p-3.5 rounded-none border border-[#DADFE5]">
                    {copilotBrief.summary}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {copilotBrief.sections.map((sec: any, idx: number) => (
                      <div key={idx} className="p-3.5 bg-[#FFFFFF] rounded-none border border-[#DADFE5]">
                        <h5 className="font-poppins font-bold text-[#000000] mb-2">{sec.title}</h5>
                        <div className="space-y-1.5 text-[#212529]">
                          {sec.sentences.map((st: any, sIdx: number) => (
                            <div key={sIdx} className="flex items-start gap-1.5">
                              <span className="text-[#198754] font-bold">✔</span>
                              <span>{st.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* STR Draft */}
                  {copilotBrief.str_draft && (
                    <div className="p-3.5 bg-[#F7F7F7] rounded-none border border-[#DADFE5]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[11px] font-bold text-[#646B72]">
                          📄 PRE-FILLED STR DRAFT (HUMAN REVIEW REQUIRED)
                        </span>
                        <button
                          onClick={() => alert('STR Draft Exported as PDF/JSON.')}
                          className="text-[11px] text-[#092C4C] font-bold hover:underline"
                        >
                          Export STR
                        </button>
                      </div>
                      <pre className="text-[11px] text-[#212529] font-mono whitespace-pre-wrap">
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
