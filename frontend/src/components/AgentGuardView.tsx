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
          bg: 'bg-[#7367F0]/10',
          border: 'border-[#7367F0]/30',
          text: 'text-[#7367F0]',
          label: 'HIGH_ACTIVITY',
          sub: 'উচ্চ লেনদেন কেন্দ্র (High Activity Hub)'
        };
      case 'LIQUIDITY_PRESSURE':
        return {
          bg: 'bg-[#FF9F43]/15',
          border: 'border-[#FF9F43]/30',
          text: 'text-[#FF9F43]',
          label: 'LIQUIDITY_PRESSURE',
          sub: 'তারল্য সংকট (Liquidity Pressure)'
        };
      case 'FRAUD_REVIEW':
        return {
          bg: 'bg-[#EA5455]/15',
          border: 'border-[#EA5455]/30',
          text: 'text-[#EA5455]',
          label: 'FRAUD_REVIEW',
          sub: 'তদন্তাধীন (Fraud Review Required)'
        };
      case 'NORMAL':
      default:
        return {
          bg: 'bg-[#28C76F]/10',
          border: 'border-[#28C76F]/30',
          text: 'text-[#28C76F]',
          label: 'NORMAL',
          sub: 'স্বাভাবিক (Normal Flow)'
        };
    }
  };

  if (!selectedAgent && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <RefreshCw className="w-8 h-8 text-[#FF9F43] animate-spin" />
        <p className="text-sm font-nunito text-[#646B72]">Loading Agent Guard intelligence profiles...</p>
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
      <div className="dream-card p-6 bg-gradient-to-r from-[#FFFFFF] via-[#FFF9F2] to-[#FFFFFF] border-l-4 border-l-[#FF9F43] shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2 rounded-[6px] bg-[#FF9F43]/10 text-[#FF9F43]">
                <Scale className="w-5 h-5" />
              </span>
              <h2 className="font-poppins font-bold text-xl text-[#000000]">
                Agent Liquidity vs Fraud Risk Separation (M8 Guard)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-nunito font-bold bg-[#FF9F43]/15 text-[#FF9F43] border border-[#FF9F43]/30">
                Dual Independent Scores
              </span>
            </div>
            <p className="text-xs font-nunito text-[#646B72] max-w-4xl leading-relaxed">
              <strong>Zero-False-Positive Principle:</strong> High transaction volume is evaluated against regional peer baselines. 
              Operational float pressure is mathematically separated from fraud complicity, preventing legitimate wholesale hubs 
              and salary distribution points from false friction or account freezing.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchAgents}
              disabled={isLoading}
              className="px-3 py-2 rounded-[4px] border border-[#DADFE5] hover:bg-[#F7F7F7] text-xs font-nunito font-semibold text-[#646B72] flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Profiles</span>
            </button>
          </div>
        </div>

        {/* Core Principles Callout */}
        <div className="mt-4 pt-4 border-t border-[#DADFE5]/60 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-nunito">
          <div className="flex items-start gap-2 p-2.5 bg-[#FFFFFF] rounded-[4px] border border-[#DADFE5]">
            <CheckCircle2 className="w-4 h-4 text-[#28C76F] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#212529]">Score Independence</span>
              <p className="text-[11px] text-[#646B72]">Operational Pressure &amp; Fraud Risk are never merged into an opaque score.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2.5 bg-[#FFFFFF] rounded-[4px] border border-[#DADFE5]">
            <Users className="w-4 h-4 text-[#7367F0] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#212529]">Peer Benchmarking</span>
              <p className="text-[11px] text-[#646B72]">Wholesale hubs are compared against Tier-1 commercial peers, not national retail avg.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2.5 bg-[#FFFFFF] rounded-[4px] border border-[#DADFE5]">
            <ShieldAlert className="w-4 h-4 text-[#EA5455] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#212529]">No &quot;Fraudulent&quot; Label</span>
              <p className="text-[11px] text-[#646B72]">Uses <code>FRAUD_REVIEW</code> and <code>LIQUIDITY_PRESSURE</code> for human analyst inspection.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Toast */}
      {actionSuccess && (
        <div className="p-4 rounded-[4px] bg-[#28C76F]/10 border border-[#28C76F]/30 text-[#28C76F] text-xs font-nunito flex items-center justify-between shadow-sm animate-fade-in">
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
          <span className="text-xs font-poppins font-bold text-[#092C4C] uppercase tracking-wider flex items-center gap-1.5">
            <Store className="w-4 h-4 text-[#FF9F43]" />
            <span>Select Agent Demo Profile (Demonstrating Why Threshold Systems Fail):</span>
          </span>
          <span className="text-[11px] text-[#646B72] font-nunito">4 Live Simulated Outlets</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {agents.map((ag) => {
            const isSelected = selectedAgent?.agent_id === ag.agent_id;
            const agBadge = getClassificationBadge(ag.classification);
            return (
              <button
                key={ag.agent_id}
                onClick={() => setSelectedAgent(ag)}
                className={`p-3.5 text-left rounded-[6px] border transition-all duration-200 flex flex-col justify-between space-y-2 ${
                  isSelected 
                    ? 'bg-[#FFFFFF] border-[#FF9F43] shadow-md ring-2 ring-[#FF9F43]/20' 
                    : 'bg-[#FFFFFF] border-[#DADFE5] hover:border-[#FF9F43]/50 hover:bg-[#FDFDFD]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-poppins font-bold text-xs text-[#000000] truncate">
                      {ag.agent_id === 'AGT-DH-8821' ? 'Agent A: Wholesale Hub' :
                       ag.agent_id === 'AGT-DH-4412' ? 'Agent B: Mule Exit Point' :
                       ag.agent_id === 'AGT-GZ-1092' ? 'Agent C: Salary Point' :
                       'Agent D: Retail Store'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-nunito font-bold ${agBadge.bg} ${agBadge.text} border ${agBadge.border}`}>
                      {ag.classification}
                    </span>
                  </div>
                  <p className="text-[11px] font-nunito text-[#646B72] truncate">{ag.name}</p>
                </div>

                <div className="pt-2 border-t border-[#DADFE5]/50 flex items-center justify-between text-[11px] font-nunito">
                  <div className="flex items-center gap-1 text-[#646B72]">
                    <span>Op:</span>
                    <span className="font-bold text-[#000000]">{(ag.operational_pressure_score * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#646B72]">
                    <span>Fraud:</span>
                    <span className={`font-bold ${ag.fraud_risk_score >= 0.60 ? 'text-[#EA5455]' : 'text-[#28C76F]'}`}>
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
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#DADFE5]">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-lg font-poppins font-bold text-[#000000]">
                    {selectedAgent.name}
                  </h3>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#F7F7F7] text-[#646B72] border border-[#DADFE5]">
                    {selectedAgent.agent_id}
                  </span>
                  <span className={`px-3 py-1 rounded-[4px] text-xs font-nunito font-bold ${badge.bg} ${badge.text} border ${badge.border}`}>
                    Status: {badge.label} ({selectedAgent.classification_label_bn})
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-xs font-nunito text-[#646B72] flex-wrap">
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
                    className="px-3 py-1.5 bg-[#FF9F43] hover:bg-[#E88E35] text-white rounded-[4px] text-xs font-nunito font-bold flex items-center gap-1.5 shadow-sm transition-colors"
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
                      className="px-3 py-1.5 bg-[#EA5455] hover:bg-[#D94344] text-white rounded-[4px] text-xs font-nunito font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Place on Watchlist</span>
                    </button>
                    <button
                      onClick={() => handleAction('TRIGGER_COACHED_ALERT')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-[#092C4C] hover:bg-[#143D66] text-white rounded-[4px] text-xs font-nunito font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Dispatch Coached Warning</span>
                    </button>
                  </>
                )}

                {selectedAgent.classification === 'HIGH_ACTIVITY' && (
                  <div className="px-3 py-1.5 bg-[#28C76F]/10 border border-[#28C76F]/30 text-[#28C76F] rounded-[4px] text-xs font-nunito font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified High-Volume Commercial Flow</span>
                  </div>
                )}
              </div>
            </div>

            {/* Classification Reason Alert Banner */}
            <div className={`p-4 rounded-[4px] ${badge.bg} border ${badge.border} flex items-start gap-3`}>
              <Info className={`w-5 h-5 ${badge.text} shrink-0 mt-0.5`} />
              <div className="space-y-1">
                <span className={`text-xs font-poppins font-bold ${badge.text}`}>
                  Intelligence Classification Diagnosis:
                </span>
                <p className="text-xs font-nunito text-[#212529] leading-relaxed">
                  {selectedAgent.classification_reason}
                </p>
              </div>
            </div>
          </div>

          {/* DUAL SEPARATE SCORE CHARTS (TWO INDEPENDENT PANELS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* PANEL 1: OPERATIONAL PRESSURE & LIQUIDITY SIGNALS (6 Cols) */}
            <div className="lg:col-span-6 dream-card p-5 space-y-4 shadow-sm border-t-4 border-t-[#7367F0]">
              <div className="flex items-center justify-between pb-3 border-b border-[#DADFE5]">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#7367F0]" />
                  <h4 className="font-poppins font-bold text-sm text-[#092C4C]">
                    1. OPERATIONAL PRESSURE SCORE
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-xl font-poppins font-bold text-[#7367F0]">
                    {(selectedAgent.operational_pressure_score * 100).toFixed(0)}
                  </span>
                  <span className="text-xs text-[#646B72]"> / 100</span>
                </div>
              </div>

              <p className="text-xs font-nunito text-[#646B72]">
                Measures transactional load, cash float depletion, peak throughput, and seasonal volatility. 
                <span className="text-[#092C4C] font-bold"> Does NOT increase fraud suspicion.</span>
              </p>

              {/* Progress Gauge */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-nunito">
                  <span className="text-[#646B72]">Operational Load Intensity</span>
                  <span className="font-bold text-[#7367F0]">
                    {selectedAgent.operational_pressure_score >= 0.80 ? 'CRITICAL FLOAT PRESSURE' :
                     selectedAgent.operational_pressure_score >= 0.60 ? 'HIGH COMMERCIAL ACTIVITY' :
                     selectedAgent.operational_pressure_score >= 0.35 ? 'MODERATE THROUGHPUT' : 'BALANCED BASELINE'}
                  </span>
                </div>
                <div className="w-full h-3 bg-[#EAEAEA] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#7367F0] to-[#9E95F5] rounded-full transition-all duration-500"
                    style={{ width: `${selectedAgent.operational_pressure_score * 100}%` }}
                  />
                </div>
              </div>

              {/* Liquidity Features Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-[#F7F7F7] border border-[#DADFE5] rounded-[4px] space-y-1">
                  <span className="text-[11px] font-nunito text-[#646B72]">Total Daily Volume</span>
                  <div className="font-poppins font-bold text-sm text-[#000000]">
                    ৳{liq?.total_volume_bdt.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-[#7367F0] font-bold">
                    {liq?.regional_peer_deviation}x vs Peer Avg
                  </span>
                </div>

                <div className="p-3 bg-[#F7F7F7] border border-[#DADFE5] rounded-[4px] space-y-1">
                  <span className="text-[11px] font-nunito text-[#646B72]">Cash-In vs Cash-Out</span>
                  <div className="font-poppins font-bold text-xs text-[#000000]">
                    In: ৳{liq?.cash_in_volume_bdt.toLocaleString()}
                  </div>
                  <div className="font-poppins font-bold text-xs text-[#EA5455]">
                    Out: ৳{liq?.cash_out_volume_bdt.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 bg-[#F7F7F7] border border-[#DADFE5] rounded-[4px] space-y-1">
                  <span className="text-[11px] font-nunito text-[#646B72]">Float / Balance Strain</span>
                  <div className="flex items-center justify-between">
                    <span className="font-poppins font-bold text-sm text-[#000000]">
                      {((liq?.inventory_balance_pressure || 0) * 100).toFixed(0)}%
                    </span>
                    {(liq?.inventory_balance_pressure || 0) >= 0.75 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#FF9F43]/15 text-[#FF9F43] font-bold">
                        Float Depleted
                      </span>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-[#DADFE5] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        (liq?.inventory_balance_pressure || 0) >= 0.75 ? 'bg-[#FF9F43]' : 'bg-[#28C76F]'
                      }`}
                      style={{ width: `${(liq?.inventory_balance_pressure || 0) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-[#F7F7F7] border border-[#DADFE5] rounded-[4px] space-y-1">
                  <span className="text-[11px] font-nunito text-[#646B72]">Customer Repeat Rate</span>
                  <div className="font-poppins font-bold text-sm text-[#000000]">
                    {((liq?.repeat_customer_rate || 0) * 100).toFixed(0)}%
                  </div>
                  <span className="text-[10px] text-[#646B72]">
                    {liq?.customer_count} Unique Customers
                  </span>
                </div>

                <div className="p-3 bg-[#F7F7F7] border border-[#DADFE5] rounded-[4px] space-y-1">
                  <span className="text-[11px] font-nunito text-[#646B72]">Peak Hourly Transactions</span>
                  <div className="font-poppins font-bold text-sm text-[#000000]">
                    {liq?.hourly_volume_peak} txns/hr
                  </div>
                  <span className="text-[10px] text-[#646B72]">
                    Business Hrs: {((liq?.business_hours_ratio || 0) * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="p-3 bg-[#F7F7F7] border border-[#DADFE5] rounded-[4px] space-y-1">
                  <span className="text-[11px] font-nunito text-[#646B72]">Seasonal Window Surge</span>
                  <div className="font-poppins font-bold text-sm text-[#000000]">
                    {liq?.seasonal_volume_change}x Normal
                  </div>
                  <span className="text-[10px] text-[#646B72]">
                    Wholesale / Salary Window
                  </span>
                </div>
              </div>
            </div>

            {/* PANEL 2: FRAUD RISK SCORE & COMPLICITY INDICATORS (6 Cols) */}
            <div className="lg:col-span-6 dream-card p-5 space-y-4 shadow-sm border-t-4 border-t-[#EA5455]">
              <div className="flex items-center justify-between pb-3 border-b border-[#DADFE5]">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-[#EA5455]" />
                  <h4 className="font-poppins font-bold text-sm text-[#092C4C]">
                    2. FRAUD &amp; COMPLICITY RISK SCORE
                  </h4>
                </div>
                <div className="text-right">
                  <span className={`text-xl font-poppins font-bold ${selectedAgent.fraud_risk_score >= 0.60 ? 'text-[#EA5455]' : 'text-[#28C76F]'}`}>
                    {(selectedAgent.fraud_risk_score * 100).toFixed(0)}
                  </span>
                  <span className="text-xs text-[#646B72]"> / 100</span>
                </div>
              </div>

              <p className="text-xs font-nunito text-[#646B72]">
                Evaluates adversarial patterns (mule ring links, device spoofing, sub-threshold smurfing, and rapid pass-through). 
                <span className="text-[#092C4C] font-bold"> Completely independent of raw volume.</span>
              </p>

              {/* Progress Gauge */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-nunito">
                  <span className="text-[#646B72]">Fraud Indicator Density</span>
                  <span className={`font-bold ${selectedAgent.fraud_risk_score >= 0.60 ? 'text-[#EA5455]' : 'text-[#28C76F]'}`}>
                    {selectedAgent.fraud_risk_score >= 0.60 ? 'CRITICAL ADVERSARIAL PATTERN' :
                     selectedAgent.fraud_risk_score >= 0.35 ? 'ELEVATED SUSPICION' : 'CLEAN FRAUD PROFILE'}
                  </span>
                </div>
                <div className="w-full h-3 bg-[#EAEAEA] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      selectedAgent.fraud_risk_score >= 0.60 ? 'bg-gradient-to-r from-[#EA5455] to-[#FF7588]' : 'bg-gradient-to-r from-[#28C76F] to-[#48DA89]'
                    }`}
                    style={{ width: `${Math.max(4, selectedAgent.fraud_risk_score * 100)}%` }}
                  />
                </div>
              </div>

              {/* Fraud Features Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-[#F7F7F7] border border-[#DADFE5] rounded-[4px] space-y-1">
                  <span className="text-[11px] font-nunito text-[#646B72]">Shared Device / Emulators</span>
                  <div className={`font-poppins font-bold text-sm ${fraud?.shared_device_count ? 'text-[#EA5455]' : 'text-[#212529]'}`}>
                    {fraud?.shared_device_count} Cloned Devices
                  </div>
                  <span className="text-[10px] text-[#646B72]">
                    Peer Baseline: {peer?.peer_avg_shared_devices} device
                  </span>
                </div>

                <div className="p-3 bg-[#F7F7F7] border border-[#DADFE5] rounded-[4px] space-y-1">
                  <span className="text-[11px] font-nunito text-[#646B72]">Rapid Pass-Through Velocity</span>
                  <div className={`font-poppins font-bold text-sm ${(fraud?.rapid_in_out_ratio || 0) >= 0.50 ? 'text-[#EA5455]' : 'text-[#212529]'}`}>
                    {((fraud?.rapid_in_out_ratio || 0) * 100).toFixed(0)}% within 10 mins
                  </div>
                  <span className="text-[10px] text-[#646B72]">
                    Victim send → immediate cashout
                  </span>
                </div>

                <div className="p-3 bg-[#F7F7F7] border border-[#DADFE5] rounded-[4px] space-y-1">
                  <span className="text-[11px] font-nunito text-[#646B72]">Mule Ring Nexus</span>
                  <div className="font-poppins font-bold text-sm">
                    {fraud?.ring_membership && fraud.ring_membership.length > 0 ? (
                      <span className="text-[#EA5455] flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {fraud.ring_membership.join(', ')}
                      </span>
                    ) : (
                      <span className="text-[#28C76F] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        No Ring Link
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#646B72]">
                    Scam Radar Graph Cluster
                  </span>
                </div>

                <div className="p-3 bg-[#F7F7F7] border border-[#DADFE5] rounded-[4px] space-y-1">
                  <span className="text-[11px] font-nunito text-[#646B72]">Structured Smurfing Count</span>
                  <div className={`font-poppins font-bold text-sm ${(fraud?.structured_amounts_count || 0) >= 5 ? 'text-[#EA5455]' : 'text-[#212529]'}`}>
                    {fraud?.structured_amounts_count} txns &lt; ৳5k
                  </div>
                  <span className="text-[10px] text-[#646B72]">
                    Evading reporting threshold
                  </span>
                </div>

                <div className="p-3 bg-[#F7F7F7] border border-[#DADFE5] rounded-[4px] space-y-1">
                  <span className="text-[11px] font-nunito text-[#646B72]">Suspicious Wallet Conns</span>
                  <div className="font-poppins font-bold text-sm text-[#000000]">
                    {fraud?.suspicious_wallet_connections} Wallets
                  </div>
                  <span className="text-[10px] text-[#646B72]">
                    Counterparties: {((fraud?.unusual_counterparties_rate || 0) * 100).toFixed(0)}% unknown
                  </span>
                </div>

                <div className="p-3 bg-[#F7F7F7] border border-[#DADFE5] rounded-[4px] space-y-1">
                  <span className="text-[11px] font-nunito text-[#646B72]">Scam Check / Complaints</span>
                  <div className={`font-poppins font-bold text-sm ${(fraud?.complaint_rate || 0) > 0 ? 'text-[#EA5455]' : 'text-[#28C76F]'}`}>
                    {fraud?.complaint_rate} Reported Cases
                  </div>
                  <span className="text-[10px] text-[#646B72]">
                    M14 Complaint Engine Link
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PEER BENCHMARK COMPARISON MATRIX */}
          <div className="dream-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DADFE5]">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#FF9F43]" />
                <h4 className="font-poppins font-bold text-sm text-[#092C4C]">
                  REGIONAL PEER GROUP BENCHMARK COMPARISON MATRIX
                </h4>
              </div>
              <div className="text-xs font-nunito text-[#646B72]">
                Cohort: <strong>{peer?.region} ({peer?.size_tier.toUpperCase()}) — {peer?.business_profile}</strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-nunito">
                <thead>
                  <tr className="bg-[#F7F7F7] text-[#646B72] border-b border-[#DADFE5]">
                    <th className="p-3 font-poppins font-semibold">Evaluation Metric</th>
                    <th className="p-3 font-poppins font-semibold">Current Agent Value</th>
                    <th className="p-3 font-poppins font-semibold">Peer Baseline (Same Region/Tier)</th>
                    <th className="p-3 font-poppins font-semibold">Deviation / Status</th>
                    <th className="p-3 font-poppins font-semibold">Risk Engine Interpretation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DADFE5]">
                  <tr>
                    <td className="p-3 font-bold text-[#212529]">Daily Transaction Volume</td>
                    <td className="p-3 font-bold text-[#000000]">৳{liq?.total_volume_bdt.toLocaleString()}</td>
                    <td className="p-3 text-[#646B72]">৳{peer?.peer_avg_daily_volume_bdt.toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                        (liq?.regional_peer_deviation || 1) >= 3 ? 'bg-[#7367F0]/10 text-[#7367F0]' : 'bg-[#28C76F]/10 text-[#28C76F]'
                      }`}>
                        {liq?.regional_peer_deviation}x Peer Avg
                      </span>
                    </td>
                    <td className="p-3 text-[#646B72]">
                      {(liq?.regional_peer_deviation || 1) >= 3 
                        ? 'High commercial volume benchmarked to wholesale peer cohort (No fraud penalty)' 
                        : 'Within normal regional baseline'}
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3 font-bold text-[#212529]">Customer Diversity</td>
                    <td className="p-3 font-bold text-[#000000]">{liq?.customer_count} unique users</td>
                    <td className="p-3 text-[#646B72]">{peer?.peer_avg_customer_count} users</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-[#28C76F]/10 text-[#28C76F] font-bold text-[11px]">
                        {(((liq?.customer_count || 1) / (peer?.peer_avg_customer_count || 1)) * 100).toFixed(0)}% of Baseline
                      </span>
                    </td>
                    <td className="p-3 text-[#646B72]">
                      Broad customer base confirms natural public utility, not sybil account churning.
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3 font-bold text-[#212529]">Shared Cloned Devices</td>
                    <td className="p-3 font-bold text-[#EA5455]">{fraud?.shared_device_count} devices</td>
                    <td className="p-3 text-[#646B72]">{peer?.peer_avg_shared_devices} device avg</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                        (fraud?.shared_device_count || 0) > 2 ? 'bg-[#EA5455]/15 text-[#EA5455]' : 'bg-[#28C76F]/10 text-[#28C76F]'
                      }`}>
                        {(fraud?.shared_device_count || 0) > 2 ? 'ABNORMAL (+5x)' : 'CLEAN'}
                      </span>
                    </td>
                    <td className="p-3 text-[#646B72]">
                      {(fraud?.shared_device_count || 0) > 2 
                        ? 'Multiple emulators operating behind single counter (Indicates mule nexus)' 
                        : 'Authentic mobile hardware verified'}
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3 font-bold text-[#212529]">Sub-Threshold Structuring</td>
                    <td className="p-3 font-bold text-[#EA5455]">{fraud?.structured_amounts_count} txns</td>
                    <td className="p-3 text-[#646B72]">{peer?.peer_avg_structured_count} txns</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                        (fraud?.structured_amounts_count || 0) > 5 ? 'bg-[#EA5455]/15 text-[#EA5455]' : 'bg-[#28C76F]/10 text-[#28C76F]'
                      }`}>
                        {(fraud?.structured_amounts_count || 0) > 5 ? 'CRITICAL EVASION' : 'NORMAL'}
                      </span>
                    </td>
                    <td className="p-3 text-[#646B72]">
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
              <div className="flex items-center justify-between pb-3 border-b border-[#DADFE5]">
                <h4 className="font-poppins font-bold text-sm text-[#092C4C] flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#FF9F43]" />
                  <span>AGENT APP LIVE CASH-OUT PROMPTS (M8)</span>
                </h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF9F43]/15 text-[#FF9F43]">
                  Frontline Cashier Screen
                </span>
              </div>

              <div className="p-4 bg-gradient-to-br from-[#FFF9F2] to-[#FFFFFF] border border-[#FF9F43]/30 rounded-[6px] space-y-3">
                <div className="flex items-center gap-2 text-[#FF9F43] font-poppins font-bold text-xs">
                  <MessageSquare className="w-4 h-4" />
                  <span>এজেন্ট ক্যাশিয়ারের জন্য লাইভ স্ক্রিন সতর্কতা:</span>
                </div>

                <div className="space-y-2 font-bangla text-xs text-[#212529]">
                  {selectedAgent.coached_victim_prompts_bn?.map((prompt: string, idx: number) => (
                    <div key={idx} className="p-3 bg-[#FFFFFF] border border-[#DADFE5] rounded-[4px] flex items-start gap-2 shadow-xs">
                      <HelpCircle className="w-4 h-4 text-[#FF9F43] shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{prompt}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#FF9F43]/20 text-[11px] text-[#646B72] font-nunito flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#FF9F43] shrink-0" />
                  <span>
                    ক্যাশ-আউট সম্পন্ন করার আগে গ্রাহককে এক মিনিট অপেক্ষা করিয়ে ফোনে কথা বলা থেকে বিরত থাকতে বলুন।
                  </span>
                </div>
              </div>
            </div>

            {/* Active Warnings & Analyst Recommendation (6 Cols) */}
            <div className="lg:col-span-6 dream-card p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[#DADFE5]">
                <h4 className="font-poppins font-bold text-sm text-[#092C4C] flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-[#28C76F]" />
                  <span>ACTIVE WARNINGS &amp; ACTIONS</span>
                </h4>
                <span className="text-xs text-[#646B72] font-nunito">
                  Updated: {new Date(selectedAgent.last_evaluated_at).toLocaleTimeString()}
                </span>
              </div>

              <div className="space-y-3 text-xs font-nunito">
                <div>
                  <span className="font-bold text-[#092C4C] uppercase text-[11px] block mb-1.5">
                    Active System Warnings:
                  </span>
                  {selectedAgent.active_warnings && selectedAgent.active_warnings.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedAgent.active_warnings.map((warn, i) => (
                        <div key={i} className="p-2.5 bg-[#EA5455]/5 border border-[#EA5455]/20 rounded-[4px] text-[#212529] flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#EA5455] shrink-0 mt-0.5" />
                          <span>{warn}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 bg-[#28C76F]/5 border border-[#28C76F]/20 rounded-[4px] text-[#28C76F] flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>No active warnings. Operational indicators are clean.</span>
                    </div>
                  )}
                </div>

                <div>
                  <span className="font-bold text-[#092C4C] uppercase text-[11px] block mb-1.5">
                    Recommended Analyst Actions:
                  </span>
                  <div className="space-y-1.5">
                    {selectedAgent.recommended_actions?.map((act, i) => (
                      <div key={i} className="p-2 bg-[#F7F7F7] border border-[#DADFE5] rounded-[4px] text-[#646B72] flex items-start gap-2">
                        <span className="text-[#7367F0] font-bold">•</span>
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
