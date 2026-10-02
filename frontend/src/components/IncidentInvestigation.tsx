'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, ShieldAlert, CheckCircle2, XCircle, HelpCircle, Clock, Database,
  Network, Megaphone, GitBranch, UserCheck, MessageSquare, Sparkles, Play,
  AlertTriangle, FileSearch, Languages, Scale, ArrowRight, RefreshCw,
  ShieldCheck, Ban, Eye, EyeOff, ChevronDown, ChevronRight, Lock, Lightbulb
} from 'lucide-react';
import {
  IncidentInvestigation as Investigation,
  EvidenceVerdict,
  EvidenceItem,
  IncidentTimelineEvent,
  TransactionMatchCandidate,
  MatchSignalResult
} from '../core/types';
import { formatBDT, formatPercentage } from '../lib/formatters';

/**
 * Incident Investigation console.
 *
 * Deliberate design rule: EVIDENCE and AI-GENERATED EXPLANATION are visually
 * distinct. Anything drawn from a stored record carries a "LEDGER / ENGINE" provenance
 * chip on a white evidence surface; anything composed by the narrator sits on a tinted
 * panel labelled as a generated explanation. The UI never states that AI "knows" a case
 * is fraud — it reports what the evidence supports.
 */

interface DemoScenario {
  id: string;
  title: string;
  reporter_wallet: string;
  description: string;
  suggested_reported_at?: string;
}

interface SampleComplaint {
  scenario_id: string;
  language: string;
  reporter_wallet: string;
  complaint: string;
}

const VERDICT_STYLE: Record<EvidenceVerdict, {
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  border: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}> = {
  CONSISTENT: {
    label: 'CONSISTENT',
    sublabel: 'Available evidence is consistent with the reported incident',
    color: '#28C76F',
    bg: 'rgba(40, 199, 111, 0.10)',
    border: 'rgba(40, 199, 111, 0.30)',
    Icon: CheckCircle2
  },
  INCONSISTENT: {
    label: 'INCONSISTENT',
    sublabel: 'Available evidence does not support the reported claim',
    color: '#EA5455',
    bg: 'rgba(234, 84, 85, 0.10)',
    border: 'rgba(234, 84, 85, 0.30)',
    Icon: XCircle
  },
  INSUFFICIENT_DATA: {
    label: 'INSUFFICIENT DATA',
    sublabel: 'Available evidence is insufficient to determine the incident',
    color: '#FF9F43',
    bg: 'rgba(255, 159, 67, 0.10)',
    border: 'rgba(255, 159, 67, 0.30)',
    Icon: HelpCircle
  }
};

const RISK_COLOR: Record<string, string> = {
  LOW: '#28C76F',
  MEDIUM: '#FF9F43',
  HIGH: '#FF6B35',
  CRITICAL: '#EA5455'
};

const SOURCE_STATE_COLOR: Record<string, string> = {
  AVAILABLE: '#28C76F',
  EMPTY: '#A0AEC0',
  UNAVAILABLE: '#EA5455',
  NOT_APPLICABLE: '#A0AEC0'
};

/** Small provenance chip that marks where a fact came from. */
const ProvenanceChip: React.FC<{ kind: 'EVIDENCE' | 'GENERATED'; label: string }> = ({ kind, label }) => (
  <span
    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] text-[9px] font-mono font-bold uppercase tracking-wide shrink-0"
    style={
      kind === 'EVIDENCE'
        ? { background: 'rgba(27, 40, 80, 0.08)', color: '#1B2850' }
        : { background: 'rgba(115, 103, 240, 0.12)', color: '#7367F0' }
    }
  >
    {kind === 'EVIDENCE' ? <Database className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />}
    {label}
  </span>
);

const SectionCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  provenance?: 'EVIDENCE' | 'GENERATED';
  provenanceLabel?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, provenance, provenanceLabel, right, children }) => (
  <div className="upay-card p-5 bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 shadow-xs">
    <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-slate-200 dark:border-white/10">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-amber-500 shrink-0">{icon}</span>
        <h3 className="text-sm font-outfit font-extrabold text-slate-900 dark:text-slate-100 truncate">{title}</h3>
        {provenance && <ProvenanceChip kind={provenance} label={provenanceLabel || provenance} />}
      </div>
      {right}
    </div>
    {children}
  </div>
);

const EvidenceRow: React.FC<{ item: EvidenceItem }> = ({ item }) => {
  const dirColor =
    item.direction === 'supports' ? '#28C76F' : item.direction === 'contradicts' ? '#EA5455' : '#646B72';
  const DirIcon = item.direction === 'supports' ? CheckCircle2 : item.direction === 'contradicts' ? XCircle : HelpCircle;

  return (
    <li className="flex items-start gap-2.5 p-2.5 rounded-[8px] bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 shadow-xs">
      <DirIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: dirColor }} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-nunito text-slate-800 dark:text-slate-200 leading-relaxed">{item.claim}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          <span className="px-1.5 py-0.5 rounded-[4px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-mono uppercase">
            {item.source}
          </span>
          {item.reference_id && (
            <span className="px-1.5 py-0.5 rounded-[4px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-mono">
              {item.reference_id}
            </span>
          )}
          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">{item.evidence_id}</span>
          {item.reason_codes.map(code => (
            <span
              key={code}
              className="px-1.5 py-0.5 rounded-[4px] bg-amber-500/10 text-amber-500 font-mono font-bold text-[9px]"
            >
              {code}
            </span>
          ))}
        </div>
      </div>
    </li>
  );
};

const SignalPill: React.FC<{ signal: MatchSignalResult }> = ({ signal }) => {
  const matched = signal.strength >= 0.9;
  const partial = signal.strength > 0 && signal.strength < 0.9;
  const color = matched ? '#28C76F' : partial ? '#FF9F43' : '#EA5455';
  const Icon = matched ? CheckCircle2 : partial ? HelpCircle : XCircle;
  return (
    <div className="flex items-start gap-2 p-2 rounded-[5px] bg-white border border-[#E8EBED]" title={signal.explanation}>
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color }} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold text-[#1B2850]">{signal.signal}</span>
          <span className="text-[9px] font-mono" style={{ color }}>
            {matched ? 'YES' : partial ? 'PARTIAL' : 'NO'}
          </span>
          <span className="text-[9px] font-mono text-[#A0AEC0]">w={signal.weight.toFixed(2)}</span>
        </div>
        <p className="text-[10px] text-[#646B72] mt-0.5 leading-snug">{signal.explanation}</p>
      </div>
    </div>
  );
};

export const IncidentInvestigation: React.FC = () => {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selected, setSelected] = useState<Investigation | null>(null);
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [samples, setSamples] = useState<SampleComplaint[]>([]);
  const [metrics, setMetrics] = useState<any>(null);

  const [complaintText, setComplaintText] = useState('');
  const [reporterWallet, setReporterWallet] = useState('W-SYN-004512');
  const [reportedAt, setReportedAt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [briefLang, setBriefLang] = useState<'en' | 'bn'>('en');
  const [brief, setBrief] = useState<any>(null);
  const [showRawClaim, setShowRawClaim] = useState(false);
  const [showChain, setShowChain] = useState(true);
  const [showCandidates, setShowCandidates] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      const [resList, resMetrics] = await Promise.all([
        fetch('/api/v1/investigations?limit=25'),
        fetch('/api/v1/investigations/metrics')
      ]);
      const listData = await resList.json();
      const metricsData = await resMetrics.json();
      if (listData.investigations) {
        setInvestigations(listData.investigations);
        if (!selected && listData.investigations.length > 0) setSelected(listData.investigations[0]);
      }
      if (metricsData.process_metrics) {
        setMetrics({ ...metricsData.process_metrics, persisted: metricsData.persisted_metrics });
      }
    } catch (err) {
      console.error('Failed to load investigations', err);
    }
  }, [selected]);

  const fetchScenarios = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/demo/investigation-scenarios');
      const data = await res.json();
      if (data.scenarios) setScenarios(data.scenarios);
      if (data.sample_complaints) setSamples(data.sample_complaints);
    } catch (err) {
      console.error('Failed to load demo scenarios', err);
    }
  }, []);

  useEffect(() => {
    fetchScenarios();
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalyze = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!complaintText.trim()) return;
    setIsAnalyzing(true);
    setBrief(null);
    try {
      const res = await fetch('/api/v1/investigations/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint: complaintText,
          reporter_wallet: reporterWallet || undefined,
          reported_at: reportedAt || undefined,
          analyst_id: 'ANALYST-101'
        })
      });
      const data = await res.json();
      if (data.success && data.investigation) {
        setSelected(data.investigation);
        setNotice({ kind: 'ok', text: data.message });
        await fetchList();
      } else {
        setNotice({ kind: 'err', text: data.message || 'Investigation failed' });
      }
    } catch (err: any) {
      setNotice({ kind: 'err', text: err?.message || 'Investigation request failed' });
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setNotice(null), 6000);
    }
  };

  const handleRunScenario = async (sample: SampleComplaint) => {
    const sc = scenarios.find(s => s.id === sample.scenario_id);
    setComplaintText(sample.complaint);
    setReporterWallet(sample.reporter_wallet);
    setReportedAt(sc?.suggested_reported_at || '');
    setIsAnalyzing(true);
    setBrief(null);
    try {
      const res = await fetch('/api/v1/investigations/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint: sample.complaint,
          reporter_wallet: sample.reporter_wallet,
          reported_at: sc?.suggested_reported_at,
          analyst_id: 'ANALYST-101'
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelected(data.investigation);
        setNotice({ kind: 'ok', text: data.message });
        await fetchList();
      }
    } catch (err: any) {
      setNotice({ kind: 'err', text: err?.message || 'Scenario run failed' });
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setNotice(null), 6000);
    }
  };

  const handleReseedLedger = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/demo/investigation-ledger/seed', { method: 'POST' });
      const data = await res.json();
      setNotice({ kind: data.success ? 'ok' : 'err', text: data.message });
      await fetchScenarios();
    } catch (err: any) {
      setNotice({ kind: 'err', text: err?.message || 'Ledger refresh failed' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotice(null), 6000);
    }
  };

  const handleBrief = async (lang: 'en' | 'bn') => {
    if (!selected) return;
    setBriefLang(lang);
    try {
      const res = await fetch(`/api/v1/investigations/${selected.investigation_id}/copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang })
      });
      const data = await res.json();
      if (data.brief) setBrief(data.brief);
      else setNotice({ kind: 'err', text: data.message || 'Copilot brief unavailable (investigation not persisted)' });
    } catch (err: any) {
      setNotice({ kind: 'err', text: err?.message || 'Copilot brief failed' });
    }
  };

  const handleReview = async (decision: 'APPROVE' | 'REJECT' | 'START_REVIEW') => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/v1/investigations/${selected.investigation_id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          reviewed_by: 'ANALYST-101',
          notes: `Reviewed from the Incident Investigation console (${decision}).`
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelected(data.investigation);
        setNotice({ kind: 'ok', text: data.message });
        await fetchList();
      } else {
        setNotice({ kind: 'err', text: data.message });
      }
    } catch (err: any) {
      setNotice({ kind: 'err', text: err?.message || 'Review decision failed' });
    } finally {
      setTimeout(() => setNotice(null), 6000);
    }
  };

  const inv = selected;
  const verdictStyle = inv ? VERDICT_STYLE[inv.evidence.verdict] : null;
  const matched: TransactionMatchCandidate | undefined = inv?.transaction_match.best_candidate;

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <div className="upay-card p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-[10px] bg-amber-500/10 text-amber-500">
            <FileSearch className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-outfit font-extrabold text-slate-900 dark:text-slate-100">
                Evidence-Driven Incident Investigation
              </h1>
              <span className="px-2 py-0.5 rounded-[6px] bg-amber-500/15 text-amber-500 dark:text-amber-400 text-[10px] font-mono font-bold">
                UNDERSTAND · INVESTIGATE · EXPLAIN
              </span>
            </div>
            <p className="text-xs font-nunito text-slate-600 dark:text-slate-400 mt-0.5 max-w-3xl">
              Compares a customer&apos;s account of an incident against transaction, risk, graph and campaign
              evidence. It does not assume the customer is right, and it does not assume a model is right —
              it reports what the available evidence supports.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleReseedLedger}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-[8px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-nunito font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-60 transition-colors"
            title="Refresh the synthetic evidence ledger so the golden-hour scenario is live again"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Demo Ledger</span>
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`p-4 rounded-[8px] text-xs font-nunito font-bold flex items-start justify-between gap-3 animate-fadeIn ${
            notice.kind === 'ok'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
          }`}
        >
          <div className="flex items-start gap-2">
            {notice.kind === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)} className="hover:underline shrink-0">Dismiss</button>
        </div>
      )}

      {/* ─── Metrics ──────────────────────────────────────────────────── */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Investigations', value: metrics.persisted?.total ?? metrics.investigations_total, hint: 'persisted total', color: 'text-slate-900 dark:text-slate-100', border: 'border-l-slate-400 dark:border-l-slate-500' },
            { label: 'Consistent', value: metrics.persisted?.consistent ?? metrics.evidence_consistent_total, hint: 'evidence supports claim', color: 'text-emerald-500 dark:text-emerald-400', border: 'border-l-emerald-500' },
            { label: 'Inconsistent', value: metrics.persisted?.inconsistent ?? metrics.evidence_inconsistent_total, hint: 'contradictory records', color: 'text-rose-500 dark:text-rose-400', border: 'border-l-rose-500' },
            { label: 'Insufficient', value: metrics.persisted?.insufficient ?? metrics.evidence_insufficient_total, hint: 'no answer forced', color: 'text-amber-500 dark:text-amber-400', border: 'border-l-amber-500' },
            { label: 'Human Review Rate', value: formatPercentage(metrics.human_review_rate || 0), hint: `p95 latency ${Math.round(metrics.investigation_latency_ms?.p95 || 0)}ms`, color: 'text-amber-500 dark:text-amber-400', border: 'border-l-amber-500' }
          ].map(card => (
            <div key={card.label} className={`upay-card p-4 border-l-4 ${card.border} bg-white/80 dark:bg-slate-900/60 shadow-xs`}>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{card.label}</div>
              <div className={`text-2xl font-extrabold font-mono mt-1 ${card.color}`}>{card.value}</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{card.hint}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Intake ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <SectionCard
            title="Customer Complaint"
            icon={<MessageSquare className="w-4 h-4" />}
            provenance="EVIDENCE"
            provenanceLabel="Untrusted input"
          >
            <form onSubmit={handleAnalyze} className="space-y-3">
              <textarea
                value={complaintText}
                onChange={e => setComplaintText(e.target.value)}
                rows={4}
                placeholder="বাংলা, Banglish or English — e.g. vai amar 5k taka vul number e chole gese ajke 2tar dike"
                className="w-full p-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-nunito text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 resize-y"
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Reporter wallet
                  </label>
                  <input
                    value={reporterWallet}
                    onChange={e => setReporterWallet(e.target.value)}
                    placeholder="W-SYN-004512"
                    className="w-full px-3 py-2 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Reported at (optional ISO)
                  </label>
                  <input
                    value={reportedAt}
                    onChange={e => setReportedAt(e.target.value)}
                    placeholder="defaults to now"
                    className="w-full px-3 py-2 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isAnalyzing || !complaintText.trim()}
                    className="flex items-center gap-2 px-5 py-2 rounded-[8px] btn-flame text-white text-xs font-nunito font-bold shadow-sm hover:opacity-95 disabled:opacity-50 transition-all"
                  >
                    {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span>{isAnalyzing ? 'Investigating…' : 'Investigate'}</span>
                  </button>
                </div>
              </div>
            </form>
          </SectionCard>
        </div>

        <SectionCard title="Demo Scenarios" icon={<Play className="w-4 h-4" />}>
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {samples.length === 0 && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-nunito">
                Scenario list unavailable — check that the backend is running.
              </p>
            )}
            {samples.map(sample => {
              const sc = scenarios.find(s => s.id === sample.scenario_id);
              return (
                <button
                  key={sample.scenario_id}
                  onClick={() => handleRunScenario(sample)}
                  disabled={isAnalyzing}
                  className="w-full text-left p-2.5 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/60 hover:border-amber-500 hover:bg-amber-500/5 transition-colors disabled:opacity-60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-nunito font-bold text-slate-900 dark:text-slate-100 truncate">
                      {sc?.title || sample.scenario_id}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-[4px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-mono uppercase shrink-0">
                      {sample.language}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{sample.complaint}</p>
                </button>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {!inv && (
        <div className="upay-card p-10 text-center bg-white/80 dark:bg-slate-900/60">
          <FileSearch className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-sm font-nunito font-bold text-slate-700 dark:text-slate-300 mt-3">No investigation selected</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Submit a complaint above or run a demo scenario to see the full evidence chain.
          </p>
        </div>
      )}

      {inv && verdictStyle && (
        <>
          {/* ─── Verdict banner ─────────────────────────────────────────── */}
          <div
            className="dream-card p-5 border-l-4"
            style={{ borderLeftColor: verdictStyle.color, background: verdictStyle.bg }}
          >
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <verdictStyle.Icon className="w-8 h-8 shrink-0" style={{ color: verdictStyle.color }} />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-nunito font-extrabold" style={{ color: verdictStyle.color }}>
                      {verdictStyle.label}
                    </span>
                    <ProvenanceChip kind="EVIDENCE" label="Deterministic policy" />
                    <span className="text-[10px] font-mono text-[#646B72]">
                      verdict confidence {formatPercentage(inv.evidence.verdict_confidence)}
                    </span>
                  </div>
                  <p className="text-xs font-nunito text-[#212B36] mt-0.5">{verdictStyle.sublabel}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-[6px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-[10px] font-mono font-bold text-slate-800 dark:text-slate-200">
                  {inv.classification.case_type}
                </span>
                <span
                  className="px-2.5 py-1 rounded-[6px] text-[10px] font-mono font-bold text-white shadow-xs"
                  style={{ background: inv.risk_context.fraud_risk ? RISK_COLOR[inv.risk_context.fraud_risk] : '#A0AEC0' }}
                >
                  FRAUD RISK {inv.risk_context.fraud_risk || 'UNAVAILABLE'}
                </span>
                <span className="px-2.5 py-1 rounded-[6px] bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-mono font-bold">
                  {inv.classification.routing_department}
                </span>
                <span className="px-2.5 py-1 rounded-[6px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-[10px] font-mono font-bold text-slate-800 dark:text-slate-200">
                  {inv.classification.priority}
                </span>
                {inv.classification.is_golden_hour && (
                  <span className="px-2.5 py-1 rounded-[6px] bg-rose-500 text-white text-[10px] font-mono font-bold flex items-center gap-1 shadow-xs">
                    <Clock className="w-3 h-3" />
                    GOLDEN HOUR {inv.classification.golden_hour_remaining_mins}m
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-500 dark:text-slate-400">
              <span>{inv.investigation_id}</span>
              <span>·</span>
              <span>claim language {inv.claim.language}</span>
              <span>·</span>
              <span>{inv.total_latency_ms.toFixed(0)}ms</span>
              <span>·</span>
              <span>weights {inv.weights_version}</span>
              <span>·</span>
              <span>policy {inv.policy_version}</span>
            </div>
          </div>

          {/* ─── Complaint as recorded + claim extraction ───────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SectionCard
              title="Complaint as recorded"
              icon={<MessageSquare className="w-4 h-4" />}
              provenance="EVIDENCE"
              provenanceLabel="Customer statement"
              right={
                <button
                  onClick={() => setShowRawClaim(!showRawClaim)}
                  className="flex items-center gap-1 text-[10px] font-nunito font-bold text-slate-500 hover:text-amber-500 transition-colors"
                >
                  {showRawClaim ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showRawClaim ? 'Hide stored text' : 'Show stored text'}
                </button>
              }
            >
              {showRawClaim && (
                <div className="p-3 rounded-[8px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 mb-3 shadow-inner">
                  <p className="text-[11px] font-nunito text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
                    {inv.claim.raw_complaint}
                  </p>
                </div>
              )}

              {(inv.claim.injection_attempt_detected || inv.claim.credential_digits_redacted) && (
                <div className="mb-3 space-y-2">
                  {inv.claim.injection_attempt_detected && (
                    <div className="p-2.5 rounded-[5px] bg-[#EA5455]/10 border border-[#EA5455]/20 flex items-start gap-2">
                      <Ban className="w-3.5 h-3.5 text-[#EA5455] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-nunito font-bold text-[#EA5455]">
                          Embedded instructions detected and neutralised
                        </p>
                        <p className="text-[10px] text-[#646B72] mt-0.5">
                          The complaint text was processed strictly as data. Patterns:{' '}
                          <span className="font-mono">{inv.claim.injection_patterns_matched.join(', ')}</span>
                        </p>
                      </div>
                    </div>
                  )}
                  {inv.claim.credential_digits_redacted && (
                    <div className="p-2.5 rounded-[5px] bg-[#FF9F43]/10 border border-[#FF9F43]/20 flex items-start gap-2">
                      <Lock className="w-3.5 h-3.5 text-[#FF9F43] mt-0.5 shrink-0" />
                      <p className="text-[11px] font-nunito text-[#212B36]">
                        The customer pasted a PIN/OTP into the complaint. Those digits were redacted before
                        storage and were not treated as an amount.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <dl className="grid grid-cols-2 gap-2 text-[11px] font-nunito">
                {[
                  ['Claim type', `${inv.claim.claim_type} (${formatPercentage(inv.claim.claim_type_confidence)})`],
                  ['Claimed amount', inv.claim.amount_bdt ? formatBDT(inv.claim.amount_bdt) : 'not stated'],
                  ['Claimed time', inv.claim.time_window ? `${inv.claim.time_window.precision} — "${inv.claim.time_window.evidence_span}"` : 'not stated'],
                  ['Counterparty', inv.claim.counterparty_wallet || inv.claim.counterparty_phone || inv.claim.merchant_id || inv.claim.agent_id || 'not stated'],
                  ['Reference', inv.claim.transaction_reference || 'not supplied'],
                  ['Denies authorisation', inv.claim.denies_authorisation ? 'YES' : 'no']
                ].map(([k, v]) => (
                  <div key={k as string} className="p-2 rounded-[5px] bg-white border border-[#E8EBED]">
                    <dt className="text-[9px] font-bold text-[#646B72] uppercase tracking-wider">{k}</dt>
                    <dd className="text-[11px] font-mono text-[#1B2850] mt-0.5 break-words">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] font-bold text-[#646B72] uppercase tracking-wider">
                  Verifiable discriminators:
                </span>
                {inv.claim.discriminators_present.length === 0 ? (
                  <span className="text-[10px] font-mono text-[#EA5455]">none — claim is not testable</span>
                ) : (
                  inv.claim.discriminators_present.map(d => (
                    <span key={d} className="px-1.5 py-0.5 rounded-[3px] bg-[#28C76F]/10 text-[#28C76F] text-[9px] font-mono font-bold">
                      {d}
                    </span>
                  ))
                )}
              </div>
            </SectionCard>

            {/* ─── Matched transaction ─────────────────────────────────── */}
            <SectionCard
              title="Matched Transaction"
              icon={<Database className="w-4 h-4" />}
              provenance="EVIDENCE"
              provenanceLabel="Transaction ledger"
              right={
                inv.transaction_match.candidates.length > 1 ? (
                  <button
                    onClick={() => setShowCandidates(!showCandidates)}
                    className="flex items-center gap-1 text-[10px] font-nunito font-bold text-[#646B72] hover:text-[#1B2850]"
                  >
                    {showCandidates ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    {inv.transaction_match.candidates.length} candidates
                  </button>
                ) : undefined
              }
            >
              {!inv.transaction_match.ledger_available ? (
                <div className="p-3 rounded-[5px] bg-[#EA5455]/10 border border-[#EA5455]/20">
                  <p className="text-[11px] font-nunito font-bold text-[#EA5455]">Transaction ledger unavailable</p>
                  <p className="text-[10px] text-[#646B72] mt-1">
                    {inv.transaction_match.ledger_error}. No transaction evidence was inferred to fill the gap.
                  </p>
                </div>
              ) : !matched ? (
                <div className="p-3 rounded-[5px] bg-[#FF9F43]/10 border border-[#FF9F43]/20">
                  <p className="text-[11px] font-nunito font-bold text-[#FF9F43]">No transaction identified</p>
                  <p className="text-[10px] text-[#646B72] mt-1">
                    {inv.transaction_match.candidates_considered} transaction(s) searched between{' '}
                    <span className="font-mono">{new Date(inv.transaction_match.search_window_start).toISOString().slice(0, 16)}</span> and{' '}
                    <span className="font-mono">{new Date(inv.transaction_match.search_window_end).toISOString().slice(0, 16)}</span>.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-[6px] bg-white border-2 border-[#28C76F]/40">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-mono font-extrabold text-[#1B2850]">{matched.txn_id}</div>
                        <div className="text-xl font-extrabold text-[#1B2850] font-mono mt-1">
                          {formatBDT(matched.amount_bdt)}
                        </div>
                        <div className="text-[10px] font-mono text-[#646B72] mt-1 space-y-0.5">
                          <div>{new Date(matched.ts).toISOString().replace('T', ' ').slice(0, 19)} UTC</div>
                          <div>{matched.sender_wallet} → {matched.receiver_wallet}</div>
                          <div>{matched.type} · {matched.channel} · {matched.status}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[9px] font-bold text-[#646B72] uppercase tracking-wider">Match</div>
                        <div className="text-2xl font-extrabold font-mono text-[#28C76F]">
                          {formatPercentage(matched.match_score)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {inv.transaction_match.ambiguous && (
                    <div className="mt-2 p-2.5 rounded-[5px] bg-[#FF9F43]/10 border border-[#FF9F43]/20 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#FF9F43] mt-0.5 shrink-0" />
                      <p className="text-[10px] font-nunito text-[#212B36]">
                        More than one transaction matches this claim near-equally. The specific transaction is{' '}
                        <strong>not asserted with certainty</strong> and the case is escalated for human confirmation.
                      </p>
                    </div>
                  )}

                  <div className="mt-3 space-y-1.5">
                    <div className="text-[9px] font-bold text-[#646B72] uppercase tracking-wider">
                      Matching signals (weights {inv.transaction_match.weights_version})
                    </div>
                    {matched.signals.filter(s => s.evaluable).map(s => (
                      <SignalPill key={s.signal} signal={s} />
                    ))}
                  </div>

                  {showCandidates && (
                    <div className="mt-3 pt-3 border-t border-[#E8EBED] space-y-1.5">
                      <div className="text-[9px] font-bold text-[#646B72] uppercase tracking-wider">
                        Other candidates considered
                      </div>
                      {inv.transaction_match.candidates
                        .filter(c => c.txn_id !== matched.txn_id)
                        .map(c => (
                          <div key={c.txn_id} className="flex items-center justify-between p-2 rounded-[5px] bg-[#F7F8FA] text-[10px] font-mono">
                            <span className="text-[#1B2850]">{c.txn_id}</span>
                            <span className="text-[#646B72]">{formatBDT(c.amount_bdt)}</span>
                            <span className="text-[#646B72]">{new Date(c.ts).toISOString().slice(11, 16)}</span>
                            <span className="text-[#A0AEC0]">{formatPercentage(c.match_score)}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </SectionCard>
          </div>

          {/* ─── Evidence buckets ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SectionCard
              title={`Supporting Evidence (${inv.evidence.supporting_evidence.length})`}
              icon={<CheckCircle2 className="w-4 h-4" />}
              provenance="EVIDENCE"
              provenanceLabel="Stored records"
            >
              {inv.evidence.supporting_evidence.length === 0 ? (
                <p className="text-[11px] text-[#A0AEC0] font-nunito">No evidence supports the claim.</p>
              ) : (
                <ul className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                  {inv.evidence.supporting_evidence.map(e => <EvidenceRow key={e.evidence_id} item={e} />)}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              title={`Conflicting Evidence (${inv.evidence.conflicting_evidence.length})`}
              icon={<XCircle className="w-4 h-4" />}
              provenance="EVIDENCE"
              provenanceLabel="Stored records"
            >
              {inv.evidence.conflicting_evidence.length === 0 ? (
                <p className="text-[11px] text-[#A0AEC0] font-nunito">No evidence contradicts the claim.</p>
              ) : (
                <ul className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                  {inv.evidence.conflicting_evidence.map(e => <EvidenceRow key={e.evidence_id} item={e} />)}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              title={`Missing Evidence (${inv.evidence.missing_evidence.length})`}
              icon={<HelpCircle className="w-4 h-4" />}
              provenance="EVIDENCE"
              provenanceLabel="Gap analysis"
            >
              {inv.evidence.missing_evidence.length === 0 ? (
                <p className="text-[11px] text-[#A0AEC0] font-nunito">Nothing material is missing.</p>
              ) : (
                <ul className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                  {inv.evidence.missing_evidence.map(e => <EvidenceRow key={e.evidence_id} item={e} />)}
                </ul>
              )}
            </SectionCard>
          </div>

          {/* ─── Conflicts ─────────────────────────────────────────────── */}
          {inv.evidence.conflicts.length > 0 && (
            <SectionCard
              title={`Evidence Conflicts (${inv.evidence.conflicts.length})`}
              icon={<Scale className="w-4 h-4" />}
              provenance="EVIDENCE"
              provenanceLabel="Cross-source comparison"
            >
              <div className="space-y-2.5">
                {inv.evidence.conflicts.map(c => (
                  <div key={c.conflict_id} className="p-3 rounded-[5px] bg-white border border-[#EA5455]/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="px-1.5 py-0.5 rounded-[3px] text-[9px] font-mono font-bold text-white"
                        style={{ background: c.severity === 'HIGH' ? '#EA5455' : c.severity === 'MEDIUM' ? '#FF9F43' : '#A0AEC0' }}
                      >
                        {c.severity}
                      </span>
                      <span className="text-[9px] font-mono text-[#A0AEC0]">{c.conflict_id}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="p-2 rounded-[4px] bg-[#F7F8FA]">
                        <div className="text-[9px] font-bold text-[#646B72] uppercase tracking-wider">Customer claim</div>
                        <p className="text-[11px] font-nunito text-[#212B36] mt-0.5">{c.customer_claim}</p>
                      </div>
                      <div className="p-2 rounded-[4px] bg-[#F7F8FA]">
                        <div className="text-[9px] font-bold text-[#646B72] uppercase tracking-wider">Observed evidence</div>
                        <p className="text-[11px] font-nunito text-[#212B36] mt-0.5">{c.observed_evidence}</p>
                      </div>
                    </div>
                    {c.additional_context && (
                      <p className="text-[10px] text-[#646B72] mt-2 italic">{c.additional_context}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2.5 rounded-[5px] bg-[#7367F0]/8 border border-[#7367F0]/20 flex items-start gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-[#7367F0] mt-0.5 shrink-0" />
                <p className="text-[10px] font-nunito text-[#212B36]">
                  A conflict is not a finding that the customer is being untruthful. It records that two
                  accounts of the same event cannot both be verified from the records available now.
                </p>
              </div>
            </SectionCard>
          )}

          {/* ─── Risk / Graph / Campaign context ───────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SectionCard
              title="Risk Context"
              icon={<ShieldAlert className="w-4 h-4" />}
              provenance="EVIDENCE"
              provenanceLabel="Existing risk engine"
            >
              {!inv.risk_context.available ? (
                <p className="text-[11px] font-nunito text-[#646B72]">{inv.risk_context.unavailable_reason}</p>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div
                      className="px-3 py-2 rounded-[6px] text-white text-center"
                      style={{ background: RISK_COLOR[inv.risk_context.fraud_risk || 'LOW'] }}
                    >
                      <div className="text-[9px] font-bold uppercase tracking-wider opacity-90">Fraud risk</div>
                      <div className="text-lg font-extrabold font-mono">{inv.risk_context.fraud_risk}</div>
                    </div>
                    <div className="text-[10px] font-mono text-[#646B72] space-y-0.5">
                      <div>score {formatPercentage(inv.risk_context.fraud_risk_score || 0)}</div>
                      <div>tier {inv.risk_context.risk_tier}</div>
                      <div>action {inv.risk_context.action_recommended}</div>
                      <div className="text-[#A0AEC0]">{inv.risk_context.model_version}</div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {inv.risk_context.reasons.map(r => (
                      <div key={r.code} className="p-2 rounded-[5px] bg-white border border-[#E8EBED]">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded-[3px] bg-[#1B2850]/5 text-[#1B2850] text-[9px] font-mono font-bold">
                            {r.code}
                          </span>
                          <span className="text-[9px] font-mono text-[#A0AEC0]">w={r.weight}</span>
                        </div>
                        <p className="text-[10px] font-nunito text-[#212B36] mt-1">{r.label_en}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#A0AEC0] mt-3 italic">
                    Fraud risk and the evidence verdict answer different questions and are reported separately.
                  </p>
                </>
              )}
            </SectionCard>

            <SectionCard
              title="Graph Intelligence"
              icon={<Network className="w-4 h-4" />}
              provenance="EVIDENCE"
              provenanceLabel="Ring & report stores"
            >
              {!inv.graph_context.available ? (
                <div className="p-2.5 rounded-[5px] bg-[#EA5455]/10 border border-[#EA5455]/20">
                  <p className="text-[11px] font-nunito font-bold text-[#EA5455]">Graph evidence unavailable</p>
                  <p className="text-[10px] text-[#646B72] mt-1">{inv.graph_context.unavailable_reason}</p>
                </div>
              ) : (
                <>
                  <p className="text-[11px] font-nunito text-[#212B36]">{inv.graph_context.summary_en}</p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {[
                      ['Ring links', inv.graph_context.linked_ring_ids.length],
                      ['Community reports', inv.graph_context.community_report_count],
                      ['Linked complaints', inv.graph_context.associated_complaint_count],
                      ['Fund-flow hops', inv.graph_context.downstream_hop_count]
                    ].map(([k, v]) => (
                      <div key={k as string} className="p-2 rounded-[5px] bg-white border border-[#E8EBED]">
                        <div className="text-[9px] font-bold text-[#646B72] uppercase tracking-wider">{k}</div>
                        <div className="text-base font-extrabold font-mono text-[#1B2850]">{v}</div>
                      </div>
                    ))}
                  </div>
                  {inv.graph_context.linked_ring_names.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {inv.graph_context.linked_ring_names.map(n => (
                        <span key={n} className="px-1.5 py-0.5 rounded-[3px] bg-[#EA5455]/10 text-[#EA5455] text-[9px] font-mono font-bold">
                          {n}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </SectionCard>

            <SectionCard
              title="Campaign Context"
              icon={<Megaphone className="w-4 h-4" />}
              provenance="EVIDENCE"
              provenanceLabel="Campaign intelligence"
            >
              {!inv.campaign_context.available ? (
                <p className="text-[11px] font-nunito text-[#646B72]">{inv.campaign_context.unavailable_reason}</p>
              ) : !inv.campaign_context.matched_campaign_id ? (
                <p className="text-[11px] font-nunito text-[#646B72]">No active campaign matches this incident.</p>
              ) : (
                <>
                  <div className="p-2.5 rounded-[5px] bg-white border border-[#FF9F43]/40">
                    <div className="text-[11px] font-nunito font-extrabold text-[#1B2850]">
                      {inv.campaign_context.matched_campaign_name}
                    </div>
                    <div className="text-[9px] font-mono text-[#646B72] mt-1">
                      {inv.campaign_context.matched_campaign_id} · {inv.campaign_context.matched_campaign_typology}
                      {inv.campaign_context.campaign_score !== undefined && ` · score ${inv.campaign_context.campaign_score}`}
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <div className="text-[9px] font-bold text-[#646B72] uppercase tracking-wider mb-1">
                      Why it matched
                    </div>
                    <ul className="space-y-1">
                      {inv.campaign_context.match_basis.map((b, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[10px] font-nunito text-[#212B36]">
                          <ArrowRight className="w-3 h-3 text-[#FF9F43] mt-0.5 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </SectionCard>
          </div>

          {/* ─── Timeline ──────────────────────────────────────────────── */}
          <SectionCard
            title="Incident Timeline"
            icon={<GitBranch className="w-4 h-4" />}
            provenance="EVIDENCE"
            provenanceLabel="Reconstructed from records"
          >
            <ol className="space-y-2">
              {inv.timeline.map((ev: IncidentTimelineEvent) => (
                <li key={ev.event_id} className="flex items-start gap-3 p-2.5 rounded-[5px] bg-white border border-[#E8EBED]">
                  <div className="w-[108px] shrink-0 text-right">
                    <div className="text-[11px] font-mono font-bold text-[#1B2850]">
                      {ev.timestamp ? new Date(ev.timestamp).toISOString().slice(11, 16) : '—:—'}
                    </div>
                    <div className="text-[9px] font-mono text-[#A0AEC0]">
                      {ev.timestamp ? new Date(ev.timestamp).toISOString().slice(0, 10) : 'time unknown'}
                    </div>
                  </div>
                  <div
                    className="w-1.5 shrink-0 rounded-full self-stretch"
                    style={{ background: ev.timestamp ? '#FF9F43' : '#DADFE5' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-nunito font-bold text-[#1B2850]">{ev.title_en}</span>
                      <span className="px-1.5 py-0.5 rounded-[3px] bg-[#F7F8FA] text-[#646B72] text-[9px] font-mono">
                        {ev.source}
                      </span>
                      <span className="text-[9px] font-mono text-[#A0AEC0]">
                        confidence {formatPercentage(ev.confidence)} · {ev.timestamp_precision}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#646B72] mt-0.5 break-words">{ev.description_en}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-[10px] text-[#A0AEC0] mt-3 italic">
              Events whose time the complaint did not state are shown without a timestamp rather than being
              given an estimated one.
            </p>
          </SectionCard>

          {/* ─── Reasoning chain + narrative (generated) ───────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SectionCard
              title="Reasoning Chain"
              icon={<Scale className="w-4 h-4" />}
              provenance="EVIDENCE"
              provenanceLabel="Claim → Evidence → Reason"
              right={
                <button
                  onClick={() => setShowChain(!showChain)}
                  className="flex items-center gap-1 text-[10px] font-nunito font-bold text-[#646B72] hover:text-[#1B2850]"
                >
                  {showChain ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {inv.evidence.reasoning_chain.length} steps
                </button>
              }
            >
              {showChain && (
                <ol className="space-y-2.5">
                  {inv.evidence.reasoning_chain.map(step => (
                    <li key={step.step_id} className="p-2.5 rounded-[5px] bg-white border border-[#E8EBED]">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[9px] font-mono text-[#A0AEC0]">{step.step_id}</span>
                        <span
                          className="px-1.5 py-0.5 rounded-[3px] text-[9px] font-mono font-bold"
                          style={
                            step.verified
                              ? { background: 'rgba(40,199,111,0.12)', color: '#28C76F' }
                              : { background: 'rgba(255,159,67,0.12)', color: '#FF9F43' }
                          }
                        >
                          {step.verified ? 'RECORD-VERIFIED' : 'HEURISTIC'}
                        </span>
                      </div>
                      <div className="space-y-1 text-[10px] font-nunito">
                        <div><span className="font-bold text-[#646B72]">CLAIM:</span> <span className="text-[#212B36]">{step.claim}</span></div>
                        {step.evidence_statements.map((s, i) => (
                          <div key={i}><span className="font-bold text-[#646B72]">EVIDENCE:</span> <span className="text-[#212B36]">{s}</span></div>
                        ))}
                        <div><span className="font-bold text-[#646B72]">REASON:</span> <span className="text-[#212B36]">{step.reason}</span></div>
                        <div><span className="font-bold text-[#646B72]">CONCLUSION:</span> <span className="text-[#1B2850] font-bold">{step.conclusion}</span></div>
                      </div>
                      {step.evidence_ids.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {step.evidence_ids.slice(0, 8).map(id => (
                            <span key={id} className="text-[9px] font-mono text-[#A0AEC0]">{id}</span>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </SectionCard>

            <div className="space-y-6">
              <SectionCard
                title="Investigation Summary"
                icon={<Sparkles className="w-4 h-4" />}
                provenance="GENERATED"
                provenanceLabel={`${inv.explanation_engine.kind} ${inv.explanation_engine.version}`}
              >
                <div className="p-3 rounded-[5px] bg-[#7367F0]/6 border border-[#7367F0]/20">
                  <p className="text-[11px] font-nunito text-[#212B36] leading-relaxed">
                    {briefLang === 'bn' ? inv.investigation_summary_bn : inv.investigation_summary_en}
                  </p>
                </div>
                <div className="mt-2.5 space-y-1">
                  <div className="text-[9px] font-bold text-[#646B72] uppercase tracking-wider">
                    Evidence sources consulted
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {inv.evidence.source_status.map(s => (
                      <span
                        key={s.source}
                        title={`${s.detail} (${s.latency_ms}ms)`}
                        className="px-1.5 py-0.5 rounded-[3px] text-[9px] font-mono font-bold"
                        style={{ background: `${SOURCE_STATE_COLOR[s.state]}1A`, color: SOURCE_STATE_COLOR[s.state] }}
                      >
                        {s.source}={s.state}
                      </span>
                    ))}
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Reason Codes"
                icon={<FileSearch className="w-4 h-4" />}
                provenance="EVIDENCE"
                provenanceLabel="Investigator / audit only"
              >
                <div className="flex flex-wrap gap-1.5">
                  {inv.reason_codes.map(r => (
                    <span
                      key={r.code}
                      title={r.label_en}
                      className="px-2 py-1 rounded-[4px] bg-[#1B2850]/5 text-[#1B2850] text-[10px] font-mono font-bold"
                    >
                      {r.code}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-[#A0AEC0] mt-2.5 italic">
                  Reason codes are for investigators, audit and model evaluation. They are never shown to customers.
                </p>
              </SectionCard>
            </div>
          </div>

          {/* ─── Recommended actions + human review ───────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SectionCard title="Recommended Next Actions" icon={<ArrowRight className="w-4 h-4" />} provenance="EVIDENCE" provenanceLabel="Policy + evidence">
              <ol className="space-y-2">
                {inv.recommended_actions.map(a => (
                  <li key={a.action_id} className="p-2.5 rounded-[5px] bg-white border border-[#E8EBED]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="px-1.5 py-0.5 rounded-[3px] text-[9px] font-mono font-bold text-white"
                        style={{
                          background:
                            a.priority === 'URGENT' ? '#EA5455' :
                            a.priority === 'HIGH' ? '#FF6B35' :
                            a.priority === 'MEDIUM' ? '#FF9F43' : '#A0AEC0'
                        }}
                      >
                        {a.priority}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-[3px] bg-[#1B2850] text-white text-[9px] font-mono font-bold">
                        {a.owner}
                      </span>
                      {a.evidence_ids.length > 0 && (
                        <span className="text-[9px] font-mono text-[#28C76F]">
                          {a.evidence_ids.length} evidence citation(s)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-nunito font-bold text-[#1B2850] mt-1.5">{a.action}</p>
                    <p className="text-[10px] text-[#646B72] mt-0.5">{a.reason}</p>
                  </li>
                ))}
              </ol>

              {inv.recovery.applicable && (
                <div className="mt-3 p-3 rounded-[5px] bg-[#FF9F43]/8 border border-[#FF9F43]/25">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#FF9F43]" />
                    <span className="text-[11px] font-nunito font-extrabold text-[#1B2850]">
                      Golden Hour / Recovery
                    </span>
                    {inv.recovery.golden_hour_eligible && (
                      <span className="px-1.5 py-0.5 rounded-[3px] bg-[#EA5455] text-white text-[9px] font-mono font-bold">
                        WINDOW OPEN
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-nunito text-[#212B36]">{inv.recovery.reason}</p>
                  <div className="mt-1.5 text-[9px] font-mono text-[#646B72] space-y-0.5">
                    {inv.recovery.recovery_case_id && <div>case {inv.recovery.recovery_case_id}</div>}
                    {inv.recovery.recoverability_level && <div>recoverability {inv.recovery.recoverability_level}</div>}
                    {inv.recovery.recommended_entry_point && <div>entry point {inv.recovery.recommended_entry_point}</div>}
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Human Review"
              icon={<UserCheck className="w-4 h-4" />}
              provenance="EVIDENCE"
              provenanceLabel={inv.human_review.policy_version}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="px-3 py-1.5 rounded-[5px] text-xs font-nunito font-extrabold text-white"
                  style={{ background: inv.human_review.required ? '#EA5455' : '#28C76F' }}
                >
                  {inv.human_review.required ? 'REQUIRED' : 'NOT REQUIRED'}
                </span>
                {inv.human_review.required && (
                  <span className="px-2 py-1 rounded-[5px] bg-[#1B2850] text-white text-[10px] font-mono font-bold">
                    {inv.human_review.escalation_level}
                  </span>
                )}
                {inv.human_review.four_eyes_required && (
                  <span className="px-2 py-1 rounded-[5px] bg-[#7367F0] text-white text-[10px] font-mono font-bold">
                    FOUR-EYES
                  </span>
                )}
                <span className="px-2 py-1 rounded-[5px] bg-white border border-[#E8EBED] text-[10px] font-mono font-bold text-[#1B2850]">
                  {inv.review_status}
                </span>
              </div>

              {inv.human_review.triggers.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {inv.human_review.triggers.map(t => (
                    <li key={t.rule} className="p-2 rounded-[5px] bg-white border border-[#E8EBED]">
                      <div className="text-[10px] font-mono font-bold text-[#1B2850]">{t.rule}</div>
                      <p className="text-[10px] text-[#646B72] mt-0.5">{t.detail}</p>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => handleReview('START_REVIEW')}
                  className="px-3 py-1.5 rounded-[5px] bg-white border border-[#DADFE5] text-[#092C4C] text-[11px] font-nunito font-bold hover:bg-[#F7F7F7]"
                >
                  Start review
                </button>
                <button
                  onClick={() => handleReview('APPROVE')}
                  className="px-3 py-1.5 rounded-[5px] bg-[#28C76F] text-white text-[11px] font-nunito font-bold hover:opacity-90"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReview('REJECT')}
                  className="px-3 py-1.5 rounded-[5px] bg-[#EA5455] text-white text-[11px] font-nunito font-bold hover:opacity-90"
                >
                  Reject
                </button>
              </div>
              {inv.reviewed_by && (
                <p className="text-[10px] font-mono text-[#646B72] mt-2">
                  {inv.review_status} by {inv.reviewed_by}
                  {inv.reviewed_at ? ` at ${new Date(inv.reviewed_at).toISOString().slice(0, 19)}Z` : ''}
                </p>
              )}
            </SectionCard>
          </div>

          {/* ─── Safe customer reply ───────────────────────────────────── */}
          <SectionCard
            title="Safe Customer Reply"
            icon={<ShieldCheck className="w-4 h-4" />}
            provenance="GENERATED"
            provenanceLabel={`template ${inv.customer_response.template_id}`}
            right={
              <div className="flex items-center gap-1.5">
                <span
                  className="px-2 py-0.5 rounded-[4px] text-[9px] font-mono font-bold"
                  style={
                    inv.customer_response.safety_report.passed
                      ? { background: 'rgba(40,199,111,0.12)', color: '#28C76F' }
                      : { background: 'rgba(234,84,85,0.12)', color: '#EA5455' }
                  }
                >
                  {inv.customer_response.safety_report.passed ? 'SAFETY VALIDATED' : 'SAFETY FAILED'}
                </span>
                {inv.customer_response.fallback_used && (
                  <span className="px-2 py-0.5 rounded-[4px] bg-[#FF9F43]/15 text-[#FF9F43] text-[9px] font-mono font-bold">
                    FALLBACK TEMPLATE
                  </span>
                )}
              </div>
            }
          >
            {inv.customer_response.fallback_used && (
              <div className="mb-3 p-2.5 rounded-[5px] bg-[#FF9F43]/10 border border-[#FF9F43]/20 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[#FF9F43] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-nunito font-bold text-[#212B36]">
                    The generated draft was rejected by the safety validator and replaced with a vetted template.
                  </p>
                  <p className="text-[10px] text-[#646B72] mt-0.5 font-mono">
                    {inv.customer_response.safety_report.violations.map(v => v.code).join(', ')}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mb-3">
              {(['en', 'bn'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setBriefLang(lang)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-[5px] text-[10px] font-nunito font-bold border ${
                    briefLang === lang
                      ? 'bg-[#1B2850] text-white border-[#1B2850]'
                      : 'bg-white text-[#646B72] border-[#E2E8F0] hover:bg-[#F8F9FA]'
                  }`}
                >
                  <Languages className="w-3 h-3" />
                  {lang === 'en' ? 'English' : 'বাংলা'}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-[6px] bg-[#7367F0]/6 border border-[#7367F0]/20">
              <h4 className={`text-sm font-extrabold text-[#1B2850] ${briefLang === 'bn' ? 'font-bangla' : 'font-nunito'}`}>
                {briefLang === 'bn' ? inv.customer_response.headline_bn : inv.customer_response.headline_en}
              </h4>
              <p className={`text-[11px] text-[#212B36] mt-2 leading-relaxed ${briefLang === 'bn' ? 'font-bangla' : 'font-nunito'}`}>
                {briefLang === 'bn' ? inv.customer_response.body_bn : inv.customer_response.body_en}
              </p>
              <ul className="mt-3 space-y-1">
                {(briefLang === 'bn' ? inv.customer_response.next_steps_bn : inv.customer_response.next_steps_en).map((s, i) => (
                  <li key={i} className={`flex items-start gap-1.5 text-[11px] text-[#212B36] ${briefLang === 'bn' ? 'font-bangla' : 'font-nunito'}`}>
                    <ArrowRight className="w-3 h-3 text-[#7367F0] mt-0.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-mono text-[#646B72]">
              <span>validator {inv.customer_response.safety_report.validator_version}</span>
              <span>·</span>
              <span>{inv.customer_response.safety_report.checks_run.length} checks run</span>
              {inv.customer_response.requires_agent_approval && (
                <>
                  <span>·</span>
                  <span className="text-[#EA5455] font-bold">agent approval required before sending</span>
                </>
              )}
            </div>
          </SectionCard>

          {/* ─── Copilot brief ─────────────────────────────────────────── */}
          <SectionCard
            title="Investigator Copilot Brief"
            icon={<Sparkles className="w-4 h-4" />}
            provenance="GENERATED"
            provenanceLabel="Evidence-cited narrative"
            right={
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleBrief('en')}
                  className="px-2.5 py-1 rounded-[5px] bg-white border border-[#DADFE5] text-[#092C4C] text-[10px] font-nunito font-bold hover:bg-[#F7F7F7]"
                >
                  Generate (EN)
                </button>
                <button
                  onClick={() => handleBrief('bn')}
                  className="px-2.5 py-1 rounded-[5px] bg-white border border-[#DADFE5] text-[#092C4C] text-[10px] font-nunito font-bold hover:bg-[#F7F7F7]"
                >
                  Generate (বাংলা)
                </button>
              </div>
            }
          >
            {!brief ? (
              <p className="text-[11px] text-[#A0AEC0] font-nunito">
                Generate a brief to see every statement paired with the evidence ids it rests on.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded-[4px] bg-[#28C76F]/12 text-[#28C76F] font-bold">
                    {brief.verified_claims}/{brief.total_claims} statements evidence-verified
                  </span>
                  <span className="text-[#646B72]">confidence {formatPercentage(brief.confidence)}</span>
                </div>
                <div className="space-y-3">
                  {brief.sections.map((section: any, si: number) => (
                    <div key={si} className="p-3 rounded-[5px] bg-white border border-[#E8EBED]">
                      <div className="text-[11px] font-nunito font-extrabold text-[#1B2850] mb-1.5">
                        {section.title}
                      </div>
                      <ul className="space-y-1.5">
                        {section.sentences.map((s: any, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span
                              className="px-1 py-0.5 rounded-[3px] text-[8px] font-mono font-bold shrink-0 mt-0.5"
                              style={
                                s.verified
                                  ? { background: 'rgba(40,199,111,0.12)', color: '#28C76F' }
                                  : { background: 'rgba(160,174,192,0.15)', color: '#646B72' }
                              }
                            >
                              {s.verified ? 'CITED' : 'NARRATIVE'}
                            </span>
                            <div className="min-w-0">
                              <p className={`text-[11px] text-[#212B36] ${brief.language === 'bn' ? 'font-bangla' : 'font-nunito'}`}>
                                {s.text}
                              </p>
                              {s.evidence_ids.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {s.evidence_ids.slice(0, 6).map((id: string) => (
                                    <span key={id} className="text-[9px] font-mono text-[#A0AEC0]">{id}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {brief.open_questions?.length > 0 && (
                  <div className="mt-3 p-3 rounded-[5px] bg-[#FF9F43]/8 border border-[#FF9F43]/20">
                    <div className="text-[10px] font-bold text-[#646B72] uppercase tracking-wider mb-1">
                      Open questions / evidence gaps
                    </div>
                    <ul className="space-y-1">
                      {brief.open_questions.map((q: string, i: number) => (
                        <li key={i} className="text-[10px] font-nunito text-[#212B36]">· {q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </SectionCard>

          {/* ─── Recent investigations ─────────────────────────────────── */}
          {investigations.length > 0 && (
            <SectionCard title="Recent Investigations" icon={<Clock className="w-4 h-4" />}>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] font-mono">
                  <thead>
                    <tr className="text-left text-[#646B72] border-b border-[#E8EBED]">
                      <th className="py-2 pr-3 font-bold uppercase tracking-wider">Investigation</th>
                      <th className="py-2 pr-3 font-bold uppercase tracking-wider">Verdict</th>
                      <th className="py-2 pr-3 font-bold uppercase tracking-wider">Txn</th>
                      <th className="py-2 pr-3 font-bold uppercase tracking-wider">Risk</th>
                      <th className="py-2 pr-3 font-bold uppercase tracking-wider">Dept</th>
                      <th className="py-2 pr-3 font-bold uppercase tracking-wider">Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investigations.map(row => (
                      <tr
                        key={row.investigation_id}
                        onClick={() => { setSelected(row); setBrief(null); }}
                        className={`border-b border-[#F2F4F6] cursor-pointer hover:bg-[#FFF9F3] ${
                          row.investigation_id === inv.investigation_id ? 'bg-[#FFF4E8]' : ''
                        }`}
                      >
                        <td className="py-2 pr-3 text-[#1B2850]">{row.investigation_id}</td>
                        <td className="py-2 pr-3 font-bold" style={{ color: VERDICT_STYLE[row.evidence.verdict].color }}>
                          {row.evidence.verdict}
                        </td>
                        <td className="py-2 pr-3 text-[#646B72]">{row.evidence.relevant_transaction_id || '—'}</td>
                        <td className="py-2 pr-3 font-bold" style={{ color: row.risk_context.fraud_risk ? RISK_COLOR[row.risk_context.fraud_risk] : '#A0AEC0' }}>
                          {row.risk_context.fraud_risk || 'N/A'}
                        </td>
                        <td className="py-2 pr-3 text-[#646B72]">{row.classification.routing_department}</td>
                        <td className="py-2 pr-3 text-[#646B72]">{row.review_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
};
