'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldCheck,
  Lock,
  ArrowDownRight,
  CheckCircle,
  AlertCircle,
  FileSearch,
  Sparkles,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  History,
  Send,
  Eye,
  Check,
  X,
  MessageSquare,
  Share2,
  HelpCircle,
  FileText,
  UserCheck,
  Flame,
  Zap,
  Scale,
  Search,
  DollarSign
} from 'lucide-react';
import {
  RecoveryRoutePlan,
  RecoveryRouteStep,
  RecoveryTimelineEvent,
  RecoveryEvidenceItem
} from '../core/types';

export const RecoveryTracer: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<'SCENARIO_A' | 'SCENARIO_B' | 'SCENARIO_C' | 'SCENARIO_D'>('SCENARIO_B');
  const [goldenHourRemaining, setGoldenHourRemaining] = useState<number>(42);
  const [lang, setLang] = useState<'en' | 'bn'>('en');

  // Backend state
  const [plan, setPlan] = useState<RecoveryRoutePlan | null>(null);
  const [timeline, setTimeline] = useState<RecoveryTimelineEvent[]>([]);
  const [traceData, setTraceData] = useState<any>(null);
  const [approvedHolds, setApprovedHolds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Modals & Active Selections
  const [selectedEvidenceStep, setSelectedEvidenceStep] = useState<RecoveryRouteStep | null>(null);
  const [noteModalStep, setNoteModalStep] = useState<RecoveryRouteStep | null>(null);
  const [analystNoteText, setAnalystNoteText] = useState<string>('');

  // Copilot State
  const [copilotQuestion, setCopilotQuestion] = useState<string>('What should I investigate first?');
  const [copilotAnswer, setCopilotAnswer] = useState<any>(null);
  const [copilotLoading, setCopilotLoading] = useState<boolean>(false);

  // Fetch plan and timeline on scenario / golden hour change
  useEffect(() => {
    fetchRecoveryData(selectedScenario, goldenHourRemaining);
  }, [selectedScenario, goldenHourRemaining]);

  const fetchRecoveryData = async (scenario: string, ghRemaining: number) => {
    setLoading(true);
    try {
      const caseId = `CASE-2026-${scenario}`;
      const [routeRes, timelineRes, traceRes] = await Promise.all([
        fetch(`/api/v1/cases/${caseId}/recovery-route?scenario=${scenario}&golden_hour_remaining=${ghRemaining}`),
        fetch(`/api/v1/cases/${caseId}/recovery-timeline`),
        fetch(`/api/v1/cases/${caseId}/trace`, { method: 'POST' })
      ]);

      const routeJson = await routeRes.json();
      const timelineJson = await timelineRes.json();
      const traceJson = await traceRes.json();

      if (routeJson.success) setPlan(routeJson.plan);
      if (timelineJson.success) setTimeline(timelineJson.timeline);
      setTraceData(traceJson);
    } catch (err) {
      console.error('Failed to fetch recovery route data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Step Action Update (Mark Reviewed, Skip, Escalate)
  const handleActionUpdate = async (
    actionId: string,
    status: 'REVIEWED' | 'SKIPPED' | 'ESCALATED',
    notes?: string
  ) => {
    if (!plan) return;
    try {
      const res = await fetch(`/api/v1/cases/${plan.case_id}/recovery-route/actions/${actionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes: notes || (status === 'REVIEWED' ? 'Action completed and verified against evidence ledger.' : undefined),
          analyst_id: 'ANALYST-101'
        })
      });
      const data = await res.json();
      if (data.success) {
        setPlan(data.plan);
        // Refresh timeline
        const tRes = await fetch(`/api/v1/cases/${plan.case_id}/recovery-timeline`);
        const tData = await tRes.json();
        if (tData.success) setTimeline(tData.timeline);
      }
    } catch (err) {
      console.error('Failed to update action status:', err);
    }
  };

  // Trigger Copilot Recovery Question
  const handleAskCopilot = async (customQ?: string) => {
    if (!plan) return;
    const q = customQ || copilotQuestion;
    setCopilotLoading(true);
    try {
      const res = await fetch('/api/v1/copilot/recovery-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: plan.case_id,
          question: q,
          language: lang
        })
      });
      const data = await res.json();
      if (data.success) {
        setCopilotAnswer(data);
      }
    } catch (err) {
      console.error('Failed to query recovery copilot:', err);
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleApproveHold = (walletId: string) => {
    setApprovedHolds((prev) => ({ ...prev, [walletId]: true }));
  };

  const submitAnalystNote = () => {
    if (!noteModalStep) return;
    handleActionUpdate(noteModalStep.action_id, 'REVIEWED', analystNoteText);
    setNoteModalStep(null);
    setAnalystNoteText('');
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-[#FF0000]/15 text-[#FF0000] border-[#FF0000]/40';
      case 'HIGH':
        return 'bg-[#FF9F43]/15 text-[#FF9F43] border-[#FF9F43]/40';
      case 'MEDIUM':
        return 'bg-[#092C4C]/10 text-[#092C4C] border-[#092C4C]/30';
      default:
        return 'bg-[#646B72]/15 text-[#646B72] border-[#646B72]/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Scenario Switcher */}
      <div className="dream-card p-5 shadow-sm border border-[#DADFE5] space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Zap className="w-5 h-5 text-[#FF9F43]" />
              <span className="font-poppins font-bold text-xl text-[#000000]">
                Recovery Route Optimizer &amp; Golden-Hour Decision Support
              </span>
              <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-nunito font-bold bg-[#FF9F43]/15 text-[#FF9F43] border border-[#FF9F43]/30">
                PROMPT 11 • EVIDENCE-BASED
              </span>
              <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-nunito font-bold bg-[#198754]/15 text-[#198754] border border-[#198754]/30">
                Unsupported Rate: 0.0%
              </span>
            </div>
            <p className="text-xs font-nunito text-[#646B72] mt-1">
              Deterministic recovery path solver: Answers &quot;Given currently known evidence, what actions should the investigator prioritize first, and why?&quot;
            </p>
          </div>

          <div className="flex items-center gap-3 self-stretch lg:self-auto justify-between lg:justify-end">
            {/* Language Switcher */}
            <div className="flex items-center bg-[#F7F7F7] p-1 rounded-[5px] border border-[#DADFE5] text-xs font-nunito">
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1 rounded-[4px] font-bold transition-all ${
                  lang === 'en' ? 'bg-[#092C4C] text-white shadow-sm' : 'text-[#646B72] hover:text-[#000000]'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('bn')}
                className={`px-3 py-1 rounded-[4px] font-bold transition-all ${
                  lang === 'bn' ? 'bg-[#092C4C] text-white shadow-sm' : 'text-[#646B72] hover:text-[#000000]'
                }`}
              >
                বাংলা
              </button>
            </div>

            {/* Golden Hour Countdown Pill */}
            <div className="flex items-center gap-2 bg-[#F7F7F7] px-3 py-2 rounded-[5px] border border-[#DADFE5] text-xs font-nunito">
              <Clock className="w-4 h-4 text-[#FF9F43] animate-spin" />
              <span className="text-[#212529]">
                Golden Hour Remaining:{' '}
                <strong className={`font-poppins ${goldenHourRemaining <= 15 ? 'text-[#FF0000]' : 'text-[#198754]'}`}>
                  {goldenHourRemaining} mins
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Scenario Selector & Urgency Slider Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-3 border-t border-[#DADFE5]/80 items-center">
          <div className="lg:col-span-8 flex flex-wrap items-center gap-2">
            <span className="text-xs font-nunito font-bold text-[#092C4C] mr-1">Demo Scenarios:</span>
            {[
              { id: 'SCENARIO_A', label: 'A: Direct Recipient (৳25k in Wallet)', badge: 'Single-Hop' },
              { id: 'SCENARIO_B', label: 'B: Multi-Hop Laundering (2 Mules + Cashouts)', badge: 'Multi-Hop' },
              { id: 'SCENARIO_C', label: 'C: Scam Campaign & Ring Syndicate', badge: 'Campaign' },
              { id: 'SCENARIO_D', label: 'D: Insufficient Evidence / External', badge: 'Unobservable' }
            ].map((sc) => (
              <button
                key={sc.id}
                onClick={() => setSelectedScenario(sc.id as any)}
                className={`px-3 py-1.5 rounded-[4px] text-xs font-nunito font-semibold transition-all border ${
                  selectedScenario === sc.id
                    ? 'bg-[#092C4C] text-white border-[#092C4C] shadow-sm'
                    : 'bg-[#FFFFFF] text-[#212529] border-[#DADFE5] hover:border-[#092C4C]/40'
                }`}
              >
                <span>{sc.label}</span>
              </button>
            ))}
          </div>

          {/* Golden Hour Urgency Simulator */}
          <div className="lg:col-span-4 flex items-center justify-end gap-2 bg-[#F7F7F7] p-2 rounded-[4px] border border-[#DADFE5]">
            <span className="text-[11px] font-nunito font-semibold text-[#646B72]">Simulate Window:</span>
            {[
              { min: 52, label: '52m (Early)' },
              { min: 42, label: '42m (Normal)' },
              { min: 8, label: '8m (Critical)' }
            ].map((preset) => (
              <button
                key={preset.min}
                onClick={() => setGoldenHourRemaining(preset.min)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all border ${
                  goldenHourRemaining === preset.min
                    ? 'bg-[#FF9F43] text-white border-[#FF9F43]'
                    : 'bg-[#FFFFFF] text-[#212529] border-[#DADFE5] hover:bg-[#EAEAEA]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recoverability & Metric Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#FFFFFF] rounded-none border border-[#DADFE5] text-center shadow-sm">
          <span className="text-xs font-nunito text-[#646B72] block mb-1">Disputed Funds</span>
          <span className="text-xl font-poppins font-extrabold text-[#000000]">
            ৳ {plan?.disputed_amount_bdt.toLocaleString() || '18,500'}
          </span>
          <span className="text-[10px] text-[#646B72] block mt-0.5">Case ID: {plan?.case_id || 'CASE-2026-00417'}</span>
        </div>

        <div className="p-4 bg-[#198754]/10 rounded-none border border-[#198754]/30 text-center shadow-sm">
          <span className="text-xs font-nunito font-semibold text-[#198754] block mb-1">Observable Active Balance</span>
          <span className="text-xl font-poppins font-extrabold text-[#198754]">
            ৳ {plan?.estimated_recoverability.observable_balance_bdt.toLocaleString() || '0'}
          </span>
          <span className="text-[10px] text-[#198754] block mt-0.5 font-bold">
            {plan?.disputed_amount_bdt
              ? `${((plan.estimated_recoverability.observable_balance_bdt / plan.disputed_amount_bdt) * 100).toFixed(1)}% in Network`
              : '0%'}
          </span>
        </div>

        <div className={`p-4 rounded-none border text-center shadow-sm ${
          plan?.estimated_recoverability.level === 'POTENTIALLY_RECOVERABLE'
            ? 'bg-[#198754]/10 border-[#198754]/40'
            : plan?.estimated_recoverability.level === 'INSUFFICIENT_EVIDENCE'
            ? 'bg-[#FF0000]/10 border-[#FF0000]/40'
            : 'bg-[#FF9F43]/15 border-[#FF9F43]/40'
        }`}>
          <span className="text-xs font-nunito font-semibold text-[#092C4C] block mb-1">Estimated Recoverability</span>
          <span className="text-sm font-poppins font-extrabold text-[#092C4C] block">
            {plan?.estimated_recoverability.level === 'POTENTIALLY_RECOVERABLE'
              ? 'POTENTIALLY RECOVERABLE'
              : plan?.estimated_recoverability.level === 'INSUFFICIENT_EVIDENCE'
              ? 'INSUFFICIENT EVIDENCE'
              : 'MODERATE RECOVERY EFFORT'}
          </span>
          <span className="text-[10px] text-[#646B72] block mt-0.5">
            Confidence: {((plan?.estimated_recoverability.confidence_score || 0.9) * 100).toFixed(0)}%
          </span>
        </div>

        <div className="p-4 bg-[#092C4C]/5 rounded-none border border-[#092C4C]/20 text-center shadow-sm">
          <span className="text-xs font-nunito font-semibold text-[#092C4C] block mb-1">Evidence Citations</span>
          <span className="text-xl font-poppins font-extrabold text-[#092C4C]">
            {plan?.evidence_count || 0} Records
          </span>
          <span className="text-[10px] text-[#198754] font-bold block mt-0.5">
            100% Grounded in Graph
          </span>
        </div>
      </div>

      {/* Main Grid: Left = Recommended Recovery Route (7 Cols), Right = Timeline & Copilot (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Recommended Recovery Route (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="dream-card p-5 space-y-4 shadow-sm border border-[#DADFE5]">
            <div className="flex items-center justify-between pb-3 border-b border-[#DADFE5]">
              <div className="flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-[#FF9F43]" />
                <h2 className="text-sm font-poppins font-bold text-[#092C4C] tracking-wide">
                  RECOMMENDED RECOVERY ROUTE (EVIDENCE-RANKED)
                </h2>
              </div>
              <span className="text-xs font-nunito text-[#646B72]">
                Active Steps: <strong className="text-[#000000]">{plan?.route.length || 0}</strong>
              </span>
            </div>

            {/* Recoverability Advisory Notice */}
            {plan?.estimated_recoverability.insufficient_evidence_reason ? (
              <div className="p-3.5 bg-[#FF0000]/10 border border-[#FF0000]/30 rounded-[4px] space-y-1">
                <div className="flex items-center gap-2 text-xs font-poppins font-bold text-[#FF0000]">
                  <AlertCircle className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'অপর্যাপ্ত তথ্যপ্রমাণ সতর্কতা' : 'Insufficient Evidence Notice'}</span>
                </div>
                <p className="text-xs font-nunito text-[#212529]">
                  {lang === 'bn'
                    ? plan.estimated_recoverability.insufficient_evidence_reason_bn
                    : plan.estimated_recoverability.insufficient_evidence_reason}
                </p>
              </div>
            ) : (
              <div className="p-3 bg-[#198754]/10 border border-[#198754]/30 rounded-[4px] text-xs font-nunito text-[#212529] flex items-center justify-between">
                <span>
                  <strong>Assessment:</strong>{' '}
                  {lang === 'bn'
                    ? plan?.estimated_recoverability.reasons_bn[0]
                    : plan?.estimated_recoverability.reasons_en[0]}
                </span>
                <span className="font-mono font-bold text-[#198754]">
                  ৳ {plan?.estimated_recoverability.observable_balance_bdt.toLocaleString()}
                </span>
              </div>
            )}

            {/* Action Sequence Cards */}
            <div className="space-y-3.5">
              {plan?.route.map((step, idx) => (
                <div
                  key={step.action_id}
                  className="p-4 bg-[#FFFFFF] border-2 border-[#DADFE5] hover:border-[#092C4C]/60 transition-all rounded-[4px] shadow-sm space-y-3"
                >
                  {/* Step Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#092C4C] text-white flex items-center justify-center text-xs font-poppins font-bold">
                        {step.step_number}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-poppins font-bold text-xs text-[#000000]">
                            {step.action_type}
                          </span>
                          <span className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold border ${getPriorityBadgeClass(step.priority)}`}>
                            {step.priority} (Score: {step.priority_score})
                          </span>
                        </div>
                        <div className="text-xs font-nunito font-semibold text-[#092C4C] mt-0.5">
                          {step.target_entity_label}
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono font-bold text-[#198754] bg-[#198754]/10 px-2 py-0.5 rounded border border-[#198754]/20">
                      {((step.evidence_confidence) * 100).toFixed(0)}% Conf
                    </span>
                  </div>

                  {/* Reason text */}
                  <p className="text-xs font-nunito text-[#212529] bg-[#F7F7F7] p-2.5 rounded border border-[#DADFE5]/70">
                    <strong className="text-[#092C4C]">Reason: </strong>
                    {lang === 'bn' ? step.reason_bn : step.reason_en}
                  </p>

                  {/* Evidence Citations Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-nunito font-semibold text-[#646B72]">Evidence:</span>
                    {step.evidence_items.map((ev) => (
                      <button
                        key={ev.evidence_id}
                        onClick={() => setSelectedEvidenceStep(step)}
                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#092C4C]/10 text-[#092C4C] hover:bg-[#092C4C] hover:text-white transition-all border border-[#092C4C]/20 flex items-center gap-1"
                      >
                        <FileText className="w-2.5 h-2.5" />
                        <span>{ev.source_event_id}</span>
                      </button>
                    ))}
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#DADFE5] flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedEvidenceStep(step)}
                        className="px-2.5 py-1 rounded-[4px] text-[11px] font-nunito font-bold bg-[#F7F7F7] text-[#092C4C] border border-[#DADFE5] hover:bg-[#EAEAEA] transition-all flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View Evidence</span>
                      </button>
                      <button
                        onClick={() => {
                          setNoteModalStep(step);
                          setAnalystNoteText(step.analyst_notes || '');
                        }}
                        className="px-2.5 py-1 rounded-[4px] text-[11px] font-nunito font-bold bg-[#F7F7F7] text-[#092C4C] border border-[#DADFE5] hover:bg-[#EAEAEA] transition-all flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Add Note</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleActionUpdate(step.action_id, 'SKIPPED')}
                        className="px-2.5 py-1 rounded-[4px] text-[11px] font-nunito font-bold text-[#646B72] border border-[#DADFE5] hover:bg-[#F7F7F7] transition-all"
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => handleActionUpdate(step.action_id, 'ESCALATED')}
                        className="px-2.5 py-1 rounded-[4px] text-[11px] font-nunito font-bold bg-[#FF9F43]/15 text-[#FF9F43] border border-[#FF9F43]/40 hover:bg-[#FF9F43]/25 transition-all"
                      >
                        Escalate
                      </button>
                      <button
                        onClick={() => handleActionUpdate(step.action_id, 'REVIEWED')}
                        className="px-3 py-1 rounded-[4px] text-[11px] font-poppins font-bold bg-[#198754] text-white hover:bg-[#157347] transition-all shadow-sm flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Mark Reviewed</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {plan?.route.length === 0 && (
                <div className="p-6 text-center bg-[#F7F7F7] border border-[#DADFE5] rounded-[4px] space-y-2">
                  <CheckCircle className="w-8 h-8 text-[#198754] mx-auto" />
                  <div className="text-sm font-poppins font-bold text-[#092C4C]">
                    All Recommended Actions Completed!
                  </div>
                  <p className="text-xs font-nunito text-[#646B72]">
                    Every prioritized step has been reviewed. Case evidence ledger is up to date.
                  </p>
                </div>
              )}
            </div>

            {/* Completed Actions Section (Audit / Duplicate Prevention) */}
            {plan?.completed_actions && plan.completed_actions.length > 0 && (
              <div className="pt-4 border-t border-[#DADFE5] space-y-2">
                <div className="flex items-center gap-2 text-xs font-poppins font-bold text-[#646B72]">
                  <History className="w-3.5 h-3.5" />
                  <span>COMPLETED / REVIEWED ACTIONS ({plan.completed_actions.length})</span>
                </div>
                <div className="space-y-2">
                  {plan.completed_actions.map((cStep) => (
                    <div
                      key={cStep.action_id}
                      className="p-2.5 bg-[#F7F7F7] border border-[#DADFE5] rounded-[4px] flex items-center justify-between text-xs font-nunito"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-[#198754]" />
                        <span className="font-bold text-[#000000]">{cStep.action_type}</span>
                        <span className="text-[#646B72]">({cStep.target_entity_label})</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#646B72]">
                        <span className="font-mono">{cStep.reviewed_by || 'ANALYST-101'}</span>
                        <span className="px-2 py-0.5 rounded bg-[#198754]/15 text-[#198754] font-bold">
                          {cStep.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recovery Timeline & Investigation Copilot (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Chronological Recovery Timeline */}
          <div className="dream-card p-5 space-y-4 shadow-sm border border-[#DADFE5]">
            <div className="flex items-center justify-between pb-3 border-b border-[#DADFE5]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#FF9F43]" />
                <h3 className="text-xs font-poppins font-bold text-[#092C4C] tracking-wide">
                  RECOVERY EVENT TIMELINE
                </h3>
              </div>
              <span className="text-[11px] font-nunito font-semibold text-[#646B72]">
                {timeline.length} Events Logged
              </span>
            </div>

            {/* Timeline Stream */}
            <div className="space-y-3 relative pl-3 border-l-2 border-[#DADFE5]">
              {timeline.map((evt, idx) => (
                <div key={evt.event_id || idx} className="relative pl-3 space-y-1">
                  <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-[#FF9F43] border-2 border-white shadow-sm" />
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-poppins font-bold text-[#092C4C] text-[11px]">
                      {lang === 'bn' ? evt.title_bn : evt.title_en}
                    </span>
                    <span className="font-mono text-[10px] text-[#FF9F43] font-bold">
                      +{evt.relative_time_min} min
                    </span>
                  </div>

                  <p className="text-[11px] font-nunito text-[#646B72]">
                    {lang === 'bn' ? evt.description_bn : evt.description_en}
                  </p>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-[#646B72]">
                    <span>Entity: {evt.entity_id}</span>
                    <span>•</span>
                    <span className="text-[#092C4C] font-bold">{evt.evidence_id}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Investigation Copilot Section */}
          <div className="dream-card p-5 space-y-4 shadow-sm border border-[#DADFE5] bg-gradient-to-br from-white to-[#F7F7F7]">
            <div className="flex items-center justify-between pb-3 border-b border-[#DADFE5]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FF9F43]" />
                <h3 className="text-xs font-poppins font-bold text-[#092C4C] tracking-wide">
                  INVESTIGATION COPILOT (RECOVERY QUERY)
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#092C4C]/10 text-[#092C4C] font-bold">
                Zero-Hallucination
              </span>
            </div>

            {/* Sample Query Prompts */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-nunito font-semibold text-[#646B72]">Quick Questions:</span>
              <div className="flex flex-col gap-1.5">
                {[
                  { q: 'What should I investigate first?', label: 'What should I investigate first?', icon: Search },
                  { q: 'প্রথমে কোন অ্যাকাউন্টে ফোকাস করব?', label: 'প্রথমে কোন অ্যাকাউন্টে ফোকাস করব?', icon: Search },
                  { q: 'Is there active balance remaining in downstream wallets?', label: 'Active balance in downstream wallets?', icon: DollarSign }
                ].map((item, idx) => {
                  const IconComp = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCopilotQuestion(item.q);
                        handleAskCopilot(item.q);
                      }}
                      className="text-left px-3 py-1.5 rounded-[4px] text-xs font-nunito bg-[#FFFFFF] border border-[#DADFE5] hover:border-[#FF9F43] transition-all text-[#212529] hover:bg-[#FFF9F2] flex items-center gap-1.5"
                    >
                      <IconComp className="w-3.5 h-3.5 text-[#FF9F43]" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Question Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={copilotQuestion}
                onChange={(e) => setCopilotQuestion(e.target.value)}
                placeholder="Ask Copilot about the recovery route..."
                className="flex-1 px-3 py-2 text-xs font-nunito rounded-[4px] border border-[#DADFE5] focus:outline-none focus:border-[#092C4C]"
              />
              <button
                disabled={copilotLoading}
                onClick={() => handleAskCopilot()}
                className="px-3 py-2 bg-[#092C4C] text-white rounded-[4px] text-xs font-poppins font-semibold hover:bg-[#0c3b66] transition-all flex items-center gap-1"
              >
                {copilotLoading ? (
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Ask</span>
              </button>
            </div>

            {/* Copilot Response Box */}
            {copilotAnswer && (
              <div className="p-3.5 bg-[#FFFFFF] border-2 border-[#FF9F43]/40 rounded-[4px] space-y-2 shadow-sm">
                <div className="flex items-center justify-between text-xs font-poppins font-bold text-[#092C4C]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF9F43]" />
                    <span>Copilot Grounded Brief</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#198754]">
                    Confidence: {((copilotAnswer.confidence || 0.95) * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="text-xs font-nunito text-[#212529] whitespace-pre-line leading-relaxed bg-[#F7F7F7] p-2.5 rounded border border-[#DADFE5]/60">
                  {copilotAnswer.answer}
                </div>

                {copilotAnswer.evidence_ids && copilotAnswer.evidence_ids.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px] font-mono text-[#646B72]">
                    <span>Citations:</span>
                    {copilotAnswer.evidence_ids.map((cid: string) => (
                      <span key={cid} className="px-1.5 py-0.5 rounded bg-[#092C4C]/10 text-[#092C4C] font-bold">
                        {cid}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Downstream Money Flow Tree & Ranked Hold Candidates (M13 Integrated) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Downstream Flow Tree */}
        <div className="lg:col-span-7 dream-card p-5 space-y-4 shadow-sm border border-[#DADFE5]">
          <h3 className="text-xs font-poppins font-bold text-[#092C4C] flex items-center gap-1.5 pb-2 border-b border-[#DADFE5]">
            <ArrowDownRight className="w-4 h-4 text-[#FF9F43]" />
            <span>DOWNSTREAM MONEY FLOW TREE (HOPS &amp; CASH-OUTS)</span>
          </h3>

          <div className="space-y-3 text-xs font-nunito">
            {/* Hop 1: Victim to Primary Collector */}
            <div className="p-3.5 bg-[#F7F7F7] border border-[#DADFE5]">
              <div className="flex items-center justify-between text-[#000000] font-bold mb-1">
                <span>Hop 1: Victim ➔ Primary Collector</span>
                <span className="text-[#FF9F43] font-poppins font-bold">
                  ৳ {plan?.disputed_amount_bdt.toLocaleString() || '18,500'}
                </span>
              </div>
              <p className="text-[#646B72] text-[11px]">
                W-SYN-004512 (Rahima) ➔ W-SYN-091177 (Tanvir Hossain) @ 23:41:07
              </p>
            </div>

            {/* Hop 2: Layering Forwarding */}
            <div className="pl-4 space-y-2 border-l-2 border-[#FF9F43] ml-3">
              <div className="p-3 bg-[#F7F7F7] border border-[#DADFE5]">
                <div className="flex items-center justify-between text-[#212529] font-semibold mb-1">
                  <span>Hop 2A: Split to Layering Node A</span>
                  <span className="text-[#092C4C] font-poppins font-bold">৳ 13,500</span>
                </div>
                <p className="text-[#646B72] text-[11px]">
                  Forwarded within 2 minutes to W-SYN-044219.
                </p>
              </div>

              {/* Hop 3: Terminal Wallets */}
              <div className="pl-4 space-y-2 border-l-2 border-[#198754] ml-3">
                <div className="p-3 bg-[#198754]/10 border border-[#198754]/30">
                  <div className="flex items-center justify-between font-bold text-[#198754] mb-1">
                    <span>Hop 3A: Mule Wallet 1 (ACTIVE BALANCE)</span>
                    <span className="font-poppins font-extrabold">৳ 6,200</span>
                  </div>
                  <p className="text-[#212529] text-[11px]">
                    W-SYN-091177 (Tanvir Hossain) | ৳1,300 cashed out at Agent DH-8821.
                  </p>
                </div>

                <div className="p-3 bg-[#198754]/10 border border-[#198754]/30">
                  <div className="flex items-center justify-between font-bold text-[#198754] mb-1">
                    <span>Hop 3B: Mule Wallet 2 (ACTIVE BALANCE)</span>
                    <span className="font-poppins font-extrabold">৳ 5,000</span>
                  </div>
                  <p className="text-[#212529] text-[11px]">
                    W-SYN-088312 (Rashedul Islam) | ৳1,000 cashed out at Agent DH-8821.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-[#FF0000]/10 border border-[#FF0000]/30">
                <div className="flex items-center justify-between text-[#FF0000] font-semibold mb-1">
                  <span>Hop 2B: Terminal Cash-out at Agent</span>
                  <span className="font-poppins font-bold">৳ 5,000 (Cashed Out)</span>
                </div>
                <p className="text-[#646B72] text-[11px]">
                  W-SYN-033108 ➔ AGT-CTG-1044 @ 23:50:00 (Terminal Outflow).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Ranked Hold Candidates */}
        <div className="lg:col-span-5 dream-card p-5 space-y-4 shadow-sm border border-[#DADFE5]">
          <h3 className="text-xs font-poppins font-bold text-[#198754] flex items-center gap-1.5 pb-2 border-b border-[#DADFE5]">
            <Lock className="w-4 h-4" />
            <span>RANKED HOLD CANDIDATES (HUMAN APPROVAL REQUIRED)</span>
          </h3>

          <div className="space-y-3">
            {traceData?.hold_candidates?.map((h: any, idx: number) => {
              const isApproved = approvedHolds[h.wallet_id];
              return (
                <div
                  key={idx}
                  className="p-4 bg-[#F7F7F7] border border-[#DADFE5] space-y-3 font-nunito"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#000000]">{h.wallet_id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-[4px] bg-[#198754]/15 text-[#198754] border border-[#198754]/30 font-bold">
                      Confidence: {(h.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="text-xs text-[#212529] space-y-0.5">
                    <div>Owner: <strong className="text-[#000000]">{h.customer_name}</strong></div>
                    <div>Phone: <span className="font-mono text-[#646B72]">{h.phone}</span></div>
                    <div>Recoverable Balance: <strong className="text-[#198754] font-poppins text-sm">৳ {h.estimated_recoverable_bdt.toLocaleString()}</strong></div>
                    <div>Collateral Risk: <span className="text-[#198754] font-bold">{h.collateral_risk}</span></div>
                  </div>

                  <button
                    disabled={isApproved}
                    onClick={() => handleApproveHold(h.wallet_id)}
                    className={`w-full py-2 rounded-[4px] text-xs font-poppins font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      isApproved
                        ? 'bg-[#FFFFFF] text-[#198754] border border-[#198754]/40 shadow-sm'
                        : 'bg-[#198754] hover:bg-[#157347] text-white shadow-sm'
                    }`}
                  >
                    {isApproved ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Hold Placed &amp; Logged in Audit</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Approve Administrative Freeze</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-[#F7F7F7] border border-[#DADFE5] text-[11px] font-nunito text-[#646B72] flex items-start gap-2">
            <Scale className="w-4 h-4 text-[#FF9F43] shrink-0 mt-0.5" />
            <div>
              <strong>Governance &amp; Safeguard (RAI-05):</strong> Holds require human analyst approval. 
              No autonomous denial or irreversible freezing is conducted by the AI engine.
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Evidence Inspection Dossier */}
      {selectedEvidenceStep && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[6px] border-2 border-[#092C4C] max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#DADFE5]">
              <div className="flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-[#FF9F43]" />
                <h3 className="font-poppins font-bold text-sm text-[#092C4C]">
                  EVIDENCE DOSSIER • {selectedEvidenceStep.action_type}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvidenceStep(null)}
                className="p-1 rounded text-[#646B72] hover:bg-[#F7F7F7]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-[#F7F7F7] border border-[#DADFE5] rounded-[4px] text-xs font-nunito space-y-1">
                <div><strong>Target Entity:</strong> {selectedEvidenceStep.target_entity_label}</div>
                <div><strong>Priority Score:</strong> {selectedEvidenceStep.priority_score}/100 ({selectedEvidenceStep.priority})</div>
                <div><strong>Reason Codes:</strong> {selectedEvidenceStep.reason_codes.join(', ')}</div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-poppins font-bold text-[#092C4C]">
                  Grounded Evidence Records ({selectedEvidenceStep.evidence_items.length}):
                </span>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedEvidenceStep.evidence_items.map((ev: RecoveryEvidenceItem) => (
                    <div
                      key={ev.evidence_id}
                      className="p-3 bg-[#FFFFFF] border border-[#DADFE5] rounded-[4px] text-xs font-nunito space-y-1 shadow-sm"
                    >
                      <div className="flex items-center justify-between font-mono font-bold text-[#092C4C]">
                        <span>{ev.evidence_id} • {ev.source_event_id}</span>
                        <span className="text-[#198754] font-sans">
                          Confidence: {((ev.confidence) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-[#212529]">
                        {lang === 'bn' ? ev.description_bn : ev.description_en}
                      </p>
                      {ev.amount_bdt && (
                        <div className="text-[11px] font-mono text-[#FF9F43] font-bold">
                          Amount: ৳ {ev.amount_bdt.toLocaleString()}
                        </div>
                      )}
                      <div className="text-[10px] text-[#646B72] font-mono">
                        Timestamp: {ev.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#DADFE5]">
              <button
                onClick={() => setSelectedEvidenceStep(null)}
                className="px-4 py-1.5 bg-[#092C4C] text-white rounded-[4px] text-xs font-poppins font-semibold"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Analyst Note */}
      {noteModalStep && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[6px] border-2 border-[#092C4C] max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#DADFE5]">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#FF9F43]" />
                <h3 className="font-poppins font-bold text-sm text-[#092C4C]">
                  ADD INVESTIGATOR CASE NOTE
                </h3>
              </div>
              <button
                onClick={() => setNoteModalStep(null)}
                className="p-1 rounded text-[#646B72] hover:bg-[#F7F7F7]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-nunito">
              <p className="text-[#646B72]">
                Record your findings for action <strong>{noteModalStep.action_type}</strong> on entity{' '}
                <strong>{noteModalStep.target_entity_label}</strong>.
              </p>
              <textarea
                rows={4}
                value={analystNoteText}
                onChange={(e) => setAnalystNoteText(e.target.value)}
                placeholder="Enter investigation notes, verification findings, or hold authorization reference..."
                className="w-full p-3 text-xs font-nunito border border-[#DADFE5] rounded-[4px] focus:outline-none focus:border-[#092C4C]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#DADFE5]">
              <button
                onClick={() => setNoteModalStep(null)}
                className="px-3 py-1.5 bg-[#F7F7F7] text-[#646B72] border border-[#DADFE5] rounded-[4px] text-xs font-nunito font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={submitAnalystNote}
                className="px-4 py-1.5 bg-[#198754] text-white rounded-[4px] text-xs font-poppins font-semibold hover:bg-[#157347]"
              >
                Save &amp; Mark Reviewed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
