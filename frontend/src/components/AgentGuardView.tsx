'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, AlertTriangle, Users, MessageSquare, Activity, 
  TrendingUp, ArrowDownRight, ArrowUpRight, Scale, CheckCircle2, 
  AlertCircle, RefreshCw, Smartphone, Layers, Zap, Info, ShieldAlert,
  Clock, DollarSign, BarChart3, Building2, Store, HelpCircle, FileCheck, MapPin
} from 'lucide-react';
import { 
  AgentDualRiskProfile, AgentClassification, 
  AgentLiquiditySignals, AgentFraudSignals, AgentPeerBenchmark 
} from '../core/types';

export const AgentGuardView: React.FC = () => {
  const [agents, setAgents] = useState<AgentDualRiskProfile[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentDualRiskProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch all agents
  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/agents');
      const data = await res.json();
      if (data.agents && data.agents.length > 0) {
        setAgents(data.agents);
        if (!selectedAgent) {
          setSelectedAgent(data.agents[0]);
        } else {
          const updated = data.agents.find((a: AgentDualRiskProfile) => a.agent_id === selectedAgent.agent_id);
          if (updated) setSelectedAgent(updated);
        }
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  // Execute Analyst Action
  const handleAction = async (actionType: 'REQUEST_FLOAT_REBALANCE' | 'WATCHLIST_AGENT' | 'TRIGGER_COACHED_ALERT' | 'ESCALATE_RING') => {
    if (!selectedAgent) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/agents/${selectedAgent.agent_id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          analyst_id: 'ANALYST-101',
          notes: `Analyst action ${actionType} triggered via Agent Guard Console`
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccess(data.message);
        if (data.profile) {
          setSelectedAgent(data.profile);
          setAgents(prev => prev.map(a => a.agent_id === data.profile.agent_id ? data.profile : a));
        }
        setTimeout(() => setActionSuccess(null), 5000);
      }
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper for Classification Badge
  const getClassificationBadge = (cls: AgentClassification) => {
    switch (cls) {
      case 'HIGH_ACTIVITY':
        return {
          bg: 'bg-iris/10',
          border: 'border-iris/30',
          text: 'text-iris',
          label: 'HIGH_ACTIVITY',
          sub: 'উচ্চ লেনদেন কেন্দ্র (High Activity Hub)'
        };
      case 'LIQUIDITY_PRESSURE':
        return {
          bg: 'bg-flame-500/15',
          border: 'border-flame-500/30',
          text: 'text-flame-500',
          label: 'LIQUIDITY_PRESSURE',
          sub: 'তারল্য সংকট (Liquidity Pressure)'
        };
      case 'FRAUD_REVIEW':
        return {
          bg: 'bg-danger/15',
          border: 'border-danger/30',
          text: 'text-danger',
          label: 'FRAUD_REVIEW',
          sub: 'তদন্তাধীন (Fraud Review Required)'
        };
      case 'NORMAL':
      default:
        return {
          bg: 'bg-success-hi/10',
          border: 'border-success-hi/30',
          text: 'text-success-hi',
          label: 'NORMAL',
          sub: 'স্বাভাবিক (Normal Flow)'
        };
    }
  };

  if (!selectedAgent && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <RefreshCw className="w-8 h-8 text-flame-500 animate-spin" />
        <p className="text-sm font-ui text-ink-muted">Loading Agent Guard intelligence profiles...</p>
      </div>
    );
  }

  const badge = selectedAgent ? getClassificationBadge(selectedAgent.classification) : getClassificationBadge('NORMAL');
  const liq = selectedAgent?.liquidity_signals;
  const fraud = selectedAgent?.fraud_signals;
  const peer = selectedAgent?.peer_benchmark;

  return (
    <div className="space-y-6">
      {/* Top Banner: M8 Overview & Architectural Philosophy */}
      <div className="dream-card p-6 bg-gradient-to-r from-card via-flame-50 to-card border-l-4 border-l-flame-500 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2 rounded-xl bg-flame-500/10 text-flame-500">
                <Scale className="w-5 h-5" />
              </span>
              <h2 className="font-display font-bold text-xl text-ink">
                Agent Liquidity vs Fraud Risk Separation (M8 Guard)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-ui font-bold bg-flame-500/15 text-flame-500 border border-flame-500/30">
                Dual Independent Scores
              </span>
            </div>
            <p className="text-xs font-ui text-ink-muted max-w-4xl leading-relaxed">
              <strong>Zero-False-Positive Principle:</strong> High transaction volume is evaluated against regional peer baselines. 
              Operational float pressure is mathematically separated from fraud complicity, preventing legitimate wholesale hubs 
              and salary distribution points from false friction or account freezing.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchAgents}
              disabled={isLoading}
              className="px-3 py-2 rounded-lg border border-hair hover:bg-elev text-xs font-ui font-semibold text-ink-muted flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Profiles</span>
            </button>
          </div>
        </div>

        {/* Core Principles Callout */}
        <div className="mt-4 pt-4 border-t border-hair/60 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-ui">
          <div className="flex items-start gap-2 p-2.5 bg-card rounded-lg border border-hair">
            <CheckCircle2 className="w-4 h-4 text-success-hi shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-ink">Score Independence</span>
              <p className="text-[11px] text-ink-muted">Operational Pressure &amp; Fraud Risk are never merged into an opaque score.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2.5 bg-card rounded-lg border border-hair">
            <Users className="w-4 h-4 text-iris shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-ink">Peer Benchmarking</span>
              <p className="text-[11px] text-ink-muted">Wholesale hubs are compared against Tier-1 commercial peers, not national retail avg.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2.5 bg-card rounded-lg border border-hair">
            <ShieldAlert className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-ink">No &quot;Fraudulent&quot; Label</span>
              <p className="text-[11px] text-ink-muted">Uses <code>FRAUD_REVIEW</code> and <code>LIQUIDITY_PRESSURE</code> for human analyst inspection.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Toast */}
      {actionSuccess && (
        <div className="p-4 rounded-lg bg-success-hi/10 border border-success-hi/30 text-success-hi text-xs font-ui flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-bold">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-xs hover:underline">Dismiss</button>
        </div>
      )}

      {/* Demo Profile Selector (Agent A, B, C, D) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-display font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
            <Store className="w-4 h-4 text-flame-500" />
            <span>Select Agent Demo Profile (Demonstrating Why Threshold Systems Fail):</span>
          </span>
          <span className="text-[11px] text-ink-muted font-ui">4 Live Simulated Outlets</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {agents.map((ag) => {
            const isSelected = selectedAgent?.agent_id === ag.agent_id;
            const agBadge = getClassificationBadge(ag.classification);
            return (
              <button
                key={ag.agent_id}
                onClick={() => setSelectedAgent(ag)}
                className={`p-3.5 text-left rounded-xl border transition-all duration-200 flex flex-col justify-between space-y-2 ${
                  isSelected 
                    ? 'bg-card border-flame-500 shadow-md ring-2 ring-flame-500/20' 
                    : 'bg-card border-hair hover:border-flame-500/50 hover:bg-card'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display font-bold text-xs text-ink truncate">
                      {ag.agent_id === 'AGT-DH-8821' ? 'Agent A: Wholesale Hub' :
                       ag.agent_id === 'AGT-DH-4412' ? 'Agent B: Mule Exit Point' :
                       ag.agent_id === 'AGT-GZ-1092' ? 'Agent C: Salary Point' :
                       'Agent D: Retail Store'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-ui font-bold ${agBadge.bg} ${agBadge.text} border ${agBadge.border}`}>
                      {ag.classification}
                    </span>
                  </div>
                  <p className="text-[11px] font-ui text-ink-muted truncate">{ag.name}</p>
                </div>

                <div className="pt-2 border-t border-hair/50 flex items-center justify-between text-[11px] font-ui">
                  <div className="flex items-center gap-1 text-ink-muted">
                    <span>Op:</span>
                    <span className="font-bold text-ink">{(ag.operational_pressure_score * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-1 text-ink-muted">
                    <span>Fraud:</span>
                    <span className={`font-bold ${ag.fraud_risk_score >= 0.60 ? 'text-danger' : 'text-success-hi'}`}>
                      {(ag.fraud_risk_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedAgent && (
        <>
          {/* Main Selected Agent Summary Card */}
          <div className="dream-card p-6 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-hair">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-lg font-display font-bold text-ink">
                    {selectedAgent.name}
                  </h3>
                  <span className="text-xs font-num font-bold px-2 py-0.5 rounded bg-elev text-ink-muted border border-hair">
                    {selectedAgent.agent_id}
                  </span>
                  <span className={`px-3 py-1 rounded-lg text-xs font-ui font-bold ${badge.bg} ${badge.text} border ${badge.border}`}>
                    Status: {badge.label} ({selectedAgent.classification_label_bn})
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-xs font-ui text-ink-muted flex-wrap">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> Division: <strong>{selectedAgent.division} ({selectedAgent.district_type})</strong></span>
                  <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-slate-400" /> Profile: <strong>{selectedAgent.business_profile}</strong></span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> Tenure: <strong>{selectedAgent.tenure_days} days</strong></span>
                  <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-slate-400" /> Tier: <strong className="uppercase">{selectedAgent.size_tier}</strong></span>
                </div>
              </div>

              {/* Analyst Quick Action Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                {selectedAgent.classification === 'LIQUIDITY_PRESSURE' && (
                  <button
                    onClick={() => handleAction('REQUEST_FLOAT_REBALANCE')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-flame-500 hover:bg-ember-500 text-white rounded-lg text-xs font-ui font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Request Float Rebalance</span>
                  </button>
                )}

                {selectedAgent.classification === 'FRAUD_REVIEW' && (
                  <>
                    <button
                      onClick={() => handleAction('WATCHLIST_AGENT')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-danger hover:bg-danger text-white rounded-lg text-xs font-ui font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Place on Watchlist</span>
                    </button>
                    <button
                      onClick={() => handleAction('TRIGGER_COACHED_ALERT')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-inverse hover:bg-inverse-hi text-white rounded-lg text-xs font-ui font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Dispatch Coached Warning</span>
                    </button>
                  </>
                )}

                {selectedAgent.classification === 'HIGH_ACTIVITY' && (
                  <div className="px-3 py-1.5 bg-success-hi/10 border border-success-hi/30 text-success-hi rounded-lg text-xs font-ui font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified High-Volume Commercial Flow</span>
                  </div>
                )}
              </div>
            </div>

            {/* Classification Reason Alert Banner */}
            <div className={`p-4 rounded-lg ${badge.bg} border ${badge.border} flex items-start gap-3`}>
              <Info className={`w-5 h-5 ${badge.text} shrink-0 mt-0.5`} />
              <div className="space-y-1">
                <span className={`text-xs font-display font-bold ${badge.text}`}>
                  Intelligence Classification Diagnosis:
                </span>
                <p className="text-xs font-ui text-ink leading-relaxed">
                  {selectedAgent.classification_reason}
                </p>
              </div>
            </div>
          </div>

          {/* DUAL SEPARATE SCORE CHARTS (TWO INDEPENDENT PANELS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* PANEL 1: OPERATIONAL PRESSURE & LIQUIDITY SIGNALS (6 Cols) */}
            <div className="lg:col-span-6 dream-card p-5 space-y-4 shadow-sm border-t-4 border-t-iris">
              <div className="flex items-center justify-between pb-3 border-b border-hair">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-iris" />
                  <h4 className="font-display font-bold text-sm text-ink">
                    1. OPERATIONAL PRESSURE SCORE
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-xl font-display font-bold text-iris">
                    {(selectedAgent.operational_pressure_score * 100).toFixed(0)}
                  </span>
                  <span className="text-xs text-ink-muted"> / 100</span>
                </div>
              </div>

              <p className="text-xs font-ui text-ink-muted">
                Measures transactional load, cash float depletion, peak throughput, and seasonal volatility. 
                <span className="text-ink font-bold"> Does NOT increase fraud suspicion.</span>
              </p>

              {/* Progress Gauge */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-ui">
                  <span className="text-ink-muted">Operational Load Intensity</span>
                  <span className="font-bold text-iris">
                    {selectedAgent.operational_pressure_score >= 0.80 ? 'CRITICAL FLOAT PRESSURE' :
                     selectedAgent.operational_pressure_score >= 0.60 ? 'HIGH COMMERCIAL ACTIVITY' :
                     selectedAgent.operational_pressure_score >= 0.35 ? 'MODERATE THROUGHPUT' : 'BALANCED BASELINE'}
                  </span>
                </div>
                <div className="w-full h-3 bg-raise rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-iris to-iris-hi rounded-full transition-all duration-500"
                    style={{ width: `${selectedAgent.operational_pressure_score * 100}%` }}
                  />
                </div>
              </div>

              {/* Liquidity Features Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-elev border border-hair rounded-lg space-y-1">
                  <span className="text-[11px] font-ui text-ink-muted">Total Daily Volume</span>
                  <div className="font-display font-bold text-sm text-ink">
                    ৳{liq?.total_volume_bdt.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-iris font-bold">
                    {liq?.regional_peer_deviation}x vs Peer Avg
                  </span>
                </div>

                <div className="p-3 bg-elev border border-hair rounded-lg space-y-1">
                  <span className="text-[11px] font-ui text-ink-muted">Cash-In vs Cash-Out</span>
                  <div className="font-display font-bold text-xs text-ink">
                    In: ৳{liq?.cash_in_volume_bdt.toLocaleString()}
                  </div>
                  <div className="font-display font-bold text-xs text-danger">
                    Out: ৳{liq?.cash_out_volume_bdt.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 bg-elev border border-hair rounded-lg space-y-1">
                  <span className="text-[11px] font-ui text-ink-muted">Float / Balance Strain</span>
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-sm text-ink">
                      {((liq?.inventory_balance_pressure || 0) * 100).toFixed(0)}%
                    </span>
                    {(liq?.inventory_balance_pressure || 0) >= 0.75 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-flame-500/15 text-flame-500 font-bold">
                        Float Depleted
                      </span>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-raise rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        (liq?.inventory_balance_pressure || 0) >= 0.75 ? 'bg-flame-500' : 'bg-success-hi'
                      }`}
                      style={{ width: `${(liq?.inventory_balance_pressure || 0) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-elev border border-hair rounded-lg space-y-1">
                  <span className="text-[11px] font-ui text-ink-muted">Customer Repeat Rate</span>
                  <div className="font-display font-bold text-sm text-ink">
                    {((liq?.repeat_customer_rate || 0) * 100).toFixed(0)}%
                  </div>
                  <span className="text-[10px] text-ink-muted">
                    {liq?.customer_count} Unique Customers
                  </span>
                </div>

                <div className="p-3 bg-elev border border-hair rounded-lg space-y-1">
                  <span className="text-[11px] font-ui text-ink-muted">Peak Hourly Transactions</span>
                  <div className="font-display font-bold text-sm text-ink">
                    {liq?.hourly_volume_peak} txns/hr
                  </div>
                  <span className="text-[10px] text-ink-muted">
                    Business Hrs: {((liq?.business_hours_ratio || 0) * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="p-3 bg-elev border border-hair rounded-lg space-y-1">
                  <span className="text-[11px] font-ui text-ink-muted">Seasonal Window Surge</span>
                  <div className="font-display font-bold text-sm text-ink">
                    {liq?.seasonal_volume_change}x Normal
                  </div>
                  <span className="text-[10px] text-ink-muted">
                    Wholesale / Salary Window
                  </span>
                </div>
              </div>
            </div>

            {/* PANEL 2: FRAUD RISK SCORE & COMPLICITY INDICATORS (6 Cols) */}
            <div className="lg:col-span-6 dream-card p-5 space-y-4 shadow-sm border-t-4 border-t-danger">
              <div className="flex items-center justify-between pb-3 border-b border-hair">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-danger" />
                  <h4 className="font-display font-bold text-sm text-ink">
                    2. FRAUD &amp; COMPLICITY RISK SCORE
                  </h4>
                </div>
                <div className="text-right">
                  <span className={`text-xl font-display font-bold ${selectedAgent.fraud_risk_score >= 0.60 ? 'text-danger' : 'text-success-hi'}`}>
                    {(selectedAgent.fraud_risk_score * 100).toFixed(0)}
                  </span>
                  <span className="text-xs text-ink-muted"> / 100</span>
                </div>
              </div>

              <p className="text-xs font-ui text-ink-muted">
                Evaluates adversarial patterns (mule ring links, device spoofing, sub-threshold smurfing, and rapid pass-through). 
                <span className="text-ink font-bold"> Completely independent of raw volume.</span>
              </p>

              {/* Progress Gauge */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-ui">
                  <span className="text-ink-muted">Fraud Indicator Density</span>
                  <span className={`font-bold ${selectedAgent.fraud_risk_score >= 0.60 ? 'text-danger' : 'text-success-hi'}`}>
                    {selectedAgent.fraud_risk_score >= 0.60 ? 'CRITICAL ADVERSARIAL PATTERN' :
                     selectedAgent.fraud_risk_score >= 0.35 ? 'ELEVATED SUSPICION' : 'CLEAN FRAUD PROFILE'}
                  </span>
                </div>
                <div className="w-full h-3 bg-raise rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      selectedAgent.fraud_risk_score >= 0.60 ? 'bg-gradient-to-r from-danger to-danger-hi' : 'bg-gradient-to-r from-success-hi to-success-hi'
                    }`}
                    style={{ width: `${Math.max(4, selectedAgent.fraud_risk_score * 100)}%` }}
                  />
                </div>
              </div>

              {/* Fraud Features Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-elev border border-hair rounded-lg space-y-1">
                  <span className="text-[11px] font-ui text-ink-muted">Shared Device / Emulators</span>
                  <div className={`font-display font-bold text-sm ${fraud?.shared_device_count ? 'text-danger' : 'text-ink'}`}>
                    {fraud?.shared_device_count} Cloned Devices
                  </div>
                  <span className="text-[10px] text-ink-muted">
                    Peer Baseline: {peer?.peer_avg_shared_devices} device
                  </span>
                </div>

                <div className="p-3 bg-elev border border-hair rounded-lg space-y-1">
                  <span className="text-[11px] font-ui text-ink-muted">Rapid Pass-Through Velocity</span>
                  <div className={`font-display font-bold text-sm ${(fraud?.rapid_in_out_ratio || 0) >= 0.50 ? 'text-danger' : 'text-ink'}`}>
                    {((fraud?.rapid_in_out_ratio || 0) * 100).toFixed(0)}% within 10 mins
                  </div>
                  <span className="text-[10px] text-ink-muted">
                    Victim send → immediate cashout
                  </span>
                </div>

                <div className="p-3 bg-elev border border-hair rounded-lg space-y-1">
                  <span className="text-[11px] font-ui text-ink-muted">Mule Ring Nexus</span>
                  <div className="font-display font-bold text-sm">
                    {fraud?.ring_membership && fraud.ring_membership.length > 0 ? (
                      <span className="text-danger flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {fraud.ring_membership.join(', ')}
                      </span>
                    ) : (
                      <span className="text-success-hi flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        No Ring Link
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-ink-muted">
                    Scam Radar Graph Cluster
                  </span>
                </div>

                <div className="p-3 bg-elev border border-hair rounded-lg space-y-1">
                  <span className="text-[11px] font-ui text-ink-muted">Structured Smurfing Count</span>
                  <div className={`font-display font-bold text-sm ${(fraud?.structured_amounts_count || 0) >= 5 ? 'text-danger' : 'text-ink'}`}>
                    {fraud?.structured_amounts_count} txns &lt; ৳5k
                  </div>
                  <span className="text-[10px] text-ink-muted">
                    Evading reporting threshold
                  </span>
                </div>

                <div className="p-3 bg-elev border border-hair rounded-lg space-y-1">
                  <span className="text-[11px] font-ui text-ink-muted">Suspicious Wallet Conns</span>
                  <div className="font-display font-bold text-sm text-ink">
                    {fraud?.suspicious_wallet_connections} Wallets
                  </div>
                  <span className="text-[10px] text-ink-muted">
                    Counterparties: {((fraud?.unusual_counterparties_rate || 0) * 100).toFixed(0)}% unknown
                  </span>
                </div>

                <div className="p-3 bg-elev border border-hair rounded-lg space-y-1">
                  <span className="text-[11px] font-ui text-ink-muted">Scam Check / Complaints</span>
                  <div className={`font-display font-bold text-sm ${(fraud?.complaint_rate || 0) > 0 ? 'text-danger' : 'text-success-hi'}`}>
                    {fraud?.complaint_rate} Reported Cases
                  </div>
                  <span className="text-[10px] text-ink-muted">
                    M14 Complaint Engine Link
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PEER BENCHMARK COMPARISON MATRIX */}
          <div className="dream-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-hair">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-flame-500" />
                <h4 className="font-display font-bold text-sm text-ink">
                  REGIONAL PEER GROUP BENCHMARK COMPARISON MATRIX
                </h4>
              </div>
              <div className="text-xs font-ui text-ink-muted">
                Cohort: <strong>{peer?.region} ({peer?.size_tier.toUpperCase()}) — {peer?.business_profile}</strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-ui">
                <thead>
                  <tr className="bg-elev text-ink-muted border-b border-hair">
                    <th className="p-3 font-display font-semibold">Evaluation Metric</th>
                    <th className="p-3 font-display font-semibold">Current Agent Value</th>
                    <th className="p-3 font-display font-semibold">Peer Baseline (Same Region/Tier)</th>
                    <th className="p-3 font-display font-semibold">Deviation / Status</th>
                    <th className="p-3 font-display font-semibold">Risk Engine Interpretation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hair">
                  <tr>
                    <td className="p-3 font-bold text-ink">Daily Transaction Volume</td>
                    <td className="p-3 font-bold text-ink">৳{liq?.total_volume_bdt.toLocaleString()}</td>
                    <td className="p-3 text-ink-muted">৳{peer?.peer_avg_daily_volume_bdt.toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                        (liq?.regional_peer_deviation || 1) >= 3 ? 'bg-iris/10 text-iris' : 'bg-success-hi/10 text-success-hi'
                      }`}>
                        {liq?.regional_peer_deviation}x Peer Avg
                      </span>
                    </td>
                    <td className="p-3 text-ink-muted">
                      {(liq?.regional_peer_deviation || 1) >= 3 
                        ? 'High commercial volume benchmarked to wholesale peer cohort (No fraud penalty)' 
                        : 'Within normal regional baseline'}
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3 font-bold text-ink">Customer Diversity</td>
                    <td className="p-3 font-bold text-ink">{liq?.customer_count} unique users</td>
                    <td className="p-3 text-ink-muted">{peer?.peer_avg_customer_count} users</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-success-hi/10 text-success-hi font-bold text-[11px]">
                        {(((liq?.customer_count || 1) / (peer?.peer_avg_customer_count || 1)) * 100).toFixed(0)}% of Baseline
                      </span>
                    </td>
                    <td className="p-3 text-ink-muted">
                      Broad customer base confirms natural public utility, not sybil account churning.
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3 font-bold text-ink">Shared Cloned Devices</td>
                    <td className="p-3 font-bold text-danger">{fraud?.shared_device_count} devices</td>
                    <td className="p-3 text-ink-muted">{peer?.peer_avg_shared_devices} device avg</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                        (fraud?.shared_device_count || 0) > 2 ? 'bg-danger/15 text-danger' : 'bg-success-hi/10 text-success-hi'
                      }`}>
                        {(fraud?.shared_device_count || 0) > 2 ? 'ABNORMAL (+5x)' : 'CLEAN'}
                      </span>
                    </td>
                    <td className="p-3 text-ink-muted">
                      {(fraud?.shared_device_count || 0) > 2 
                        ? 'Multiple emulators operating behind single counter (Indicates mule nexus)' 
                        : 'Authentic mobile hardware verified'}
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3 font-bold text-ink">Sub-Threshold Structuring</td>
                    <td className="p-3 font-bold text-danger">{fraud?.structured_amounts_count} txns</td>
                    <td className="p-3 text-ink-muted">{peer?.peer_avg_structured_count} txns</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                        (fraud?.structured_amounts_count || 0) > 5 ? 'bg-danger/15 text-danger' : 'bg-success-hi/10 text-success-hi'
                      }`}>
                        {(fraud?.structured_amounts_count || 0) > 5 ? 'CRITICAL EVASION' : 'NORMAL'}
                      </span>
                    </td>
                    <td className="p-3 text-ink-muted">
                      {(fraud?.structured_amounts_count || 0) > 5 
                        ? 'Repeated ৳4,990 cash-outs intentionally smurfing below AML monitoring triggers' 
                        : 'Organic transaction distribution'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* LOWER TWO COLUMNS: LIVE COACHED VICTIM WARNING (M8) & ACTIVE INVESTIGATION EVIDENCE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Live Frontline Coached Victim Guidance (6 Cols) */}
            <div className="lg:col-span-6 dream-card p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-hair">
                <h4 className="font-display font-bold text-sm text-ink flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-flame-500" />
                  <span>AGENT APP LIVE CASH-OUT PROMPTS (M8)</span>
                </h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-flame-500/15 text-flame-500">
                  Frontline Cashier Screen
                </span>
              </div>

              <div className="p-4 bg-gradient-to-br from-flame-50 to-card border border-flame-500/30 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-flame-500 font-display font-bold text-xs">
                  <MessageSquare className="w-4 h-4" />
                  <span>এজেন্ট ক্যাশিয়ারের জন্য লাইভ স্ক্রিন সতর্কতা:</span>
                </div>

                <div className="space-y-2 font-bangla text-xs text-ink">
                  {selectedAgent.coached_victim_prompts_bn?.map((prompt: string, idx: number) => (
                    <div key={idx} className="p-3 bg-card border border-hair rounded-lg flex items-start gap-2 shadow-xs">
                      <HelpCircle className="w-4 h-4 text-flame-500 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{prompt}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-flame-500/20 text-[11px] text-ink-muted font-ui flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-flame-500 shrink-0" />
                  <span>
                    ক্যাশ-আউট সম্পন্ন করার আগে গ্রাহককে এক মিনিট অপেক্ষা করিয়ে ফোনে কথা বলা থেকে বিরত থাকতে বলুন।
                  </span>
                </div>
              </div>
            </div>

            {/* Active Warnings & Analyst Recommendation (6 Cols) */}
            <div className="lg:col-span-6 dream-card p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-hair">
                <h4 className="font-display font-bold text-sm text-ink flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-success-hi" />
                  <span>ACTIVE WARNINGS &amp; ACTIONS</span>
                </h4>
                <span className="text-xs text-ink-muted font-ui">
                  Updated: {new Date(selectedAgent.last_evaluated_at).toLocaleTimeString()}
                </span>
              </div>

              <div className="space-y-3 text-xs font-ui">
                <div>
                  <span className="font-bold text-ink uppercase text-[11px] block mb-1.5">
                    Active System Warnings:
                  </span>
                  {selectedAgent.active_warnings && selectedAgent.active_warnings.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedAgent.active_warnings.map((warn, i) => (
                        <div key={i} className="p-2.5 bg-danger/5 border border-danger/20 rounded-lg text-ink flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" />
                          <span>{warn}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 bg-success-hi/5 border border-success-hi/20 rounded-lg text-success-hi flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>No active warnings. Operational indicators are clean.</span>
                    </div>
                  )}
                </div>

                <div>
                  <span className="font-bold text-ink uppercase text-[11px] block mb-1.5">
                    Recommended Analyst Actions:
                  </span>
                  <div className="space-y-1.5">
                    {selectedAgent.recommended_actions?.map((act, i) => (
                      <div key={i} className="p-2 bg-elev border border-hair rounded-lg text-ink-muted flex items-start gap-2">
                        <span className="text-iris font-bold">•</span>
                        <span>{act}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
