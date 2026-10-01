'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Network, ShieldAlert, Sparkles, Activity, Clock, CheckCircle2, 
  AlertTriangle, Filter, Layers, ExternalLink, ArrowRight, 
  FileText, User, Radio, Smartphone, Plus, RefreshCw, Send, Check
} from 'lucide-react';
import { ScamCampaign, CampaignLifecycle, ScamComplaintRecord } from '../core/types';

export const CampaignIntelligence: React.FC = () => {
  const [campaigns, setCampaigns] = useState<ScamCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<ScamCampaign | null>(null);
  const [complaints, setComplaints] = useState<ScamComplaintRecord[]>([]);
  const [activeLifecycleFilter, setActiveLifecycleFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [newAnalystNote, setNewAnalystNote] = useState('');
  const [selectedTab, setSelectedTab] = useState<'graph' | 'evidence' | 'complaints' | 'actions'>('graph');

  // Fetch all campaigns
  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/campaigns');
      const data = await res.json();
      if (data.campaigns) {
        setCampaigns(data.campaigns);
        if (data.campaigns.length > 0 && !selectedCampaign) {
          setSelectedCampaign(data.campaigns[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch campaign details and complaints
  const fetchCampaignDetails = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/v1/campaigns/${campaignId}`);
      const data = await res.json();
      if (data.campaign) {
        setSelectedCampaign(data.campaign);
        setComplaints(data.complaints || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      fetchCampaignDetails(selectedCampaign.campaign_id);
    }
  }, [selectedCampaign?.campaign_id]);

  // Trigger 50-complaint discovery demo
  const handleRun50ComplaintDemo = async () => {
    setIsGeneratingDemo(true);
    try {
      const res = await fetch('/api/v1/campaigns/demo/generate-50', { method: 'POST' });
      const data = await res.json();
      setActionSuccess('Demo Successful: Discovered 50 coordinated complaints funneled into 8 wallets and Ring-12!');
      setTimeout(() => setActionSuccess(null), 5000);
      await fetchCampaigns();
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  // Handle Analyst Action
  const handleAnalystAction = async (
    actionType: 'ADD_NOTE' | 'LINK_RING' | 'UPDATE_LIFECYCLE' | 'MARK_UNRELATED',
    details: Record<string, any>
  ) => {
    if (!selectedCampaign) return;
    try {
      const res = await fetch(`/api/v1/campaigns/${selectedCampaign.campaign_id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: actionType,
          analyst_id: 'ANALYST-101',
          details
        })
      });
      const data = await res.json();
      if (data.campaign) {
        setSelectedCampaign(data.campaign);
        setActionSuccess(`Analyst Action [${actionType}] executed & cryptographically logged!`);
        setTimeout(() => setActionSuccess(null), 4000);
        if (actionType === 'ADD_NOTE') setNewAnalystNote('');
        fetchCampaignDetails(selectedCampaign.campaign_id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (activeLifecycleFilter === 'ALL') return true;
    return c.lifecycle_status === activeLifecycleFilter;
  });

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      
      {/* Top Banner & Demo Trigger Header */}
      <div className="dream-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border-t-2 border-t-[#FF9F43]">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-[#FF9F43]" />
            <h1 className="text-xl font-poppins font-bold text-[#1B2850]">
              Scam Campaign Intelligence &amp; Second-Layer Graph
            </h1>
            <span className="px-2.5 py-0.5 rounded-[4px] text-[10px] font-nunito font-bold bg-[#FF9F43]/15 text-[#FF9F43] border border-[#FF9F43]/30">
              M14 / Cross-Incident Clustering
            </span>
          </div>
          <p className="text-xs font-nunito text-[#646B72] mt-1">
            Detects coordinated scam campaigns across disparate wallets, caller numbers, and agents sharing linguistic and behavioral fingerprints.
          </p>
        </div>

        {/* 50-Complaint Demo Trigger Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun50ComplaintDemo}
            disabled={isGeneratingDemo}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF9F43] hover:bg-[#f08e2f] text-white rounded-[6px] text-xs font-poppins font-semibold shadow-[0px_4px_15px_0px_rgba(255,159,67,0.30)] transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingDemo ? 'animate-spin' : ''}`} />
            <span>{isGeneratingDemo ? 'Clustering 50 Incidents...' : '🚀 Discover 50-Complaint Campaign'}</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 bg-[#05A677]/10 border border-[#05A677]/30 rounded-[6px] text-[#05A677] text-xs font-nunito font-bold flex items-center gap-2 animate-fadeIn shadow-sm">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* KPI Overview Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="dream-card p-4 space-y-1 shadow-sm">
          <span className="text-[11px] font-nunito text-[#646B72] block">Active Discovered Campaigns</span>
          <strong className="text-xl font-poppins font-bold text-[#1B2850]">
            {campaigns.filter(c => c.lifecycle_status === 'ACTIVE' || c.lifecycle_status === 'GROWING').length} Campaigns
          </strong>
          <span className="text-[10px] text-[#FF9F43] font-bold block">Across 6 Typologies</span>
        </div>

        <div className="dream-card p-4 space-y-1 shadow-sm">
          <span className="text-[11px] font-nunito text-[#646B72] block">Total Affected Mule Wallets</span>
          <strong className="text-xl font-poppins font-bold text-[#1B2850]">
            {campaigns.reduce((acc, c) => acc + c.affected_wallets.length, 0)} Wallets
          </strong>
          <span className="text-[10px] text-[#05A677] font-bold block">Funneled to Ring-12 Hub</span>
        </div>

        <div className="dream-card p-4 space-y-1 shadow-sm">
          <span className="text-[11px] font-nunito text-[#646B72] block">Total Estimated Exposure</span>
          <strong className="text-xl font-poppins font-bold text-[#FF9F43]">
            ৳{campaigns.reduce((acc, c) => acc + c.estimated_exposure_bdt, 0).toLocaleString()}
          </strong>
          <span className="text-[10px] text-[#646B72] font-bold block">Across 80+ Complaints</span>
        </div>

        <div className="dream-card p-4 space-y-1 shadow-sm">
          <span className="text-[11px] font-nunito text-[#646B72] block">Multi-Factor Fingerprint Match</span>
          <strong className="text-xl font-poppins font-bold text-[#05A677]">
            94.2% Confidence
          </strong>
          <span className="text-[10px] text-[#05A677] font-bold block">Linguistic + Graph Blend</span>
        </div>
      </div>

      {/* Main Grid: Left Campaign Queue (4 Cols) + Right Detailed Campaign & Graph (8 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Discovered Campaigns List (4 Cols) */}
        <div className="lg:col-span-4 dream-card p-4 space-y-3 shadow-sm flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8EBED]">
              <span className="text-xs font-poppins font-bold text-[#1B2850]">DISCOVERED CAMPAIGNS</span>
              <span className="text-[11px] font-mono text-[#FF9F43] font-bold">
                {filteredCampaigns.length} Total
              </span>
            </div>

            {/* Lifecycle Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-nunito no-scrollbar">
              {['ALL', 'ACTIVE', 'GROWING', 'EMERGING', 'RESOLVED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setActiveLifecycleFilter(status)}
                  className={`px-2 py-0.5 rounded-[4px] font-bold whitespace-nowrap transition-colors ${
                    activeLifecycleFilter === status
                      ? 'bg-[#FF9F43] text-white shadow-sm'
                      : 'bg-[#F7F7F7] text-[#646B72] hover:bg-[#E8EBED]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Campaign Cards List */}
            <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
              {filteredCampaigns.map((c) => {
                const isSelected = selectedCampaign?.campaign_id === c.campaign_id;
                return (
                  <div
                    key={c.campaign_id}
                    onClick={() => setSelectedCampaign(c)}
                    className={`p-3.5 rounded-[6px] border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#FFFFFF] border-l-4 border-l-[#FF9F43] border-t-[#E8EBED] border-r-[#E8EBED] border-b-[#E8EBED] shadow-md'
                        : 'bg-[#F7F7F7] border-[#E8EBED] hover:bg-[#FFFFFF]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-[#1B2850]">{c.campaign_id}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-[4px] font-nunito font-bold ${
                          c.lifecycle_status === 'ACTIVE'
                            ? 'bg-[#FF0000]/10 text-[#FF0000] border border-[#FF0000]/30 animate-pulse'
                            : c.lifecycle_status === 'GROWING'
                            ? 'bg-[#FF9F43]/15 text-[#FF9F43] border border-[#FF9F43]/30'
                            : 'bg-[#05A677]/10 text-[#05A677]'
                        }`}
                      >
                        {c.lifecycle_status}
                      </span>
                    </div>

                    <h4 className="font-poppins font-bold text-xs text-[#212B36] line-clamp-1 mb-1">
                      {c.campaign_name}
                    </h4>

                    <div className="text-[11px] font-bangla text-[#646B72] line-clamp-1 mb-2">
                      {c.typology_label_bn}
                    </div>

                    <div className="flex items-center justify-between text-xs font-nunito pt-2 border-t border-[#E8EBED]">
                      <span className="text-[#646B72]">
                        Exposure: <strong className="text-[#FF9F43]">৳{c.estimated_exposure_bdt.toLocaleString()}</strong>
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#1B2850] text-white font-bold">
                        Score: {(c.campaign_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Campaign Detail, Multi-Factor Radar & Graph (8 Cols) */}
        {selectedCampaign ? (
          <div className="lg:col-span-8 space-y-4">
            
            {/* Campaign Header Card */}
            <div className="dream-card p-5 space-y-3 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#E8EBED]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-[#1B2850]">{selectedCampaign.campaign_id}</span>
                    <span className="px-2.5 py-0.5 rounded-[4px] bg-[#FF0000]/10 text-[#FF0000] font-nunito font-bold text-xs border border-[#FF0000]/30">
                      Lifecycle: {selectedCampaign.lifecycle_status}
                    </span>
                    <span className="text-xs font-nunito text-[#646B72]">
                      Complaints: <strong className="text-[#1B2850]">{selectedCampaign.complaint_count} Reports</strong>
                    </span>
                  </div>
                  <h3 className="text-base font-poppins font-bold text-[#1B2850] mt-1">
                    {selectedCampaign.campaign_name}
                  </h3>
                  <p className="text-xs font-bangla text-[#646B72] mt-0.5">
                    {selectedCampaign.typology_label_bn}
                  </p>
                </div>

                {/* Direct Action: Link to Ring-12 */}
                <div className="flex items-center gap-2">
                  <Link
                    href="/rings"
                    className="px-3 py-1.5 rounded-[5px] bg-[#FFFFFF] hover:bg-[#F7F7F7] border border-[#DADFE5] text-[#1B2850] text-xs font-nunito font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <span>🕸️ View Ring-12</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#FF9F43]" />
                  </Link>
                  <button
                    onClick={() => handleAnalystAction('UPDATE_LIFECYCLE', { lifecycle: 'RESOLVED' })}
                    className="px-3 py-1.5 rounded-[5px] bg-[#05A677] hover:bg-[#048861] text-white text-xs font-poppins font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark Resolved</span>
                  </button>
                </div>
              </div>

              {/* Multi-Factor Campaign Score Breakdown Bar */}
              <div className="p-3 bg-[#F7F7F7] rounded-[6px] border border-[#E8EBED] space-y-2 text-xs font-nunito">
                <div className="flex items-center justify-between">
                  <span className="font-poppins font-bold text-[#1B2850]">
                    Composite Campaign Intelligence Score:
                  </span>
                  <span className="font-mono text-sm font-bold text-[#FF0000]">
                    {(selectedCampaign.campaign_score * 100).toFixed(0)}% (Multi-Factor Synthesized)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                  <div className="p-2 bg-white rounded border border-[#E8EBED]">
                    <span className="text-[#646B72] block">Linguistic Sim</span>
                    <strong className="text-[#FF9F43] font-mono">
                      {(selectedCampaign.score_breakdown.linguistic_similarity * 100).toFixed(0)}%
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-[#E8EBED]">
                    <span className="text-[#646B72] block">Temporal Sync</span>
                    <strong className="text-[#05A677] font-mono">
                      {(selectedCampaign.score_breakdown.temporal_synchrony * 100).toFixed(0)}%
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-[#E8EBED]">
                    <span className="text-[#646B72] block">Entity Overlap</span>
                    <strong className="text-[#1B2850] font-mono">
                      {(selectedCampaign.score_breakdown.entity_overlap * 100).toFixed(0)}%
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-[#E8EBED]">
                    <span className="text-[#646B72] block">Txn Pattern</span>
                    <strong className="text-[#1B75D0] font-mono">
                      {(selectedCampaign.score_breakdown.transaction_pattern_similarity * 100).toFixed(0)}%
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-[#E8EBED]">
                    <span className="text-[#646B72] block">Graph Overlap</span>
                    <strong className="text-[#6C5CE7] font-mono">
                      {(selectedCampaign.score_breakdown.graph_overlap * 100).toFixed(0)}%
                    </strong>
                  </div>
                </div>
              </div>

              {/* View Tabs */}
              <div className="flex items-center gap-2 pt-2 border-b border-[#E8EBED] text-xs font-nunito">
                <button
                  onClick={() => setSelectedTab('graph')}
                  className={`pb-2 px-3 font-bold border-b-2 transition-colors ${
                    selectedTab === 'graph'
                      ? 'border-[#FF9F43] text-[#FF9F43]'
                      : 'border-transparent text-[#646B72] hover:text-[#212B36]'
                  }`}
                >
                  🕸️ Campaign Graph Layer
                </button>
                <button
                  onClick={() => setSelectedTab('evidence')}
                  className={`pb-2 px-3 font-bold border-b-2 transition-colors ${
                    selectedTab === 'evidence'
                      ? 'border-[#FF9F43] text-[#FF9F43]'
                      : 'border-transparent text-[#646B72] hover:text-[#212B36]'
                  }`}
                >
                  🎙️ Linguistic &amp; Phrase Fingerprints
                </button>
                <button
                  onClick={() => setSelectedTab('complaints')}
                  className={`pb-2 px-3 font-bold border-b-2 transition-colors ${
                    selectedTab === 'complaints'
                      ? 'border-[#FF9F43] text-[#FF9F43]'
                      : 'border-transparent text-[#646B72] hover:text-[#212B36]'
                  }`}
                >
                  📋 Correlated Complaints ({complaints.length})
                </button>
                <button
                  onClick={() => setSelectedTab('actions')}
                  className={`pb-2 px-3 font-bold border-b-2 transition-colors ${
                    selectedTab === 'actions'
                      ? 'border-[#FF9F43] text-[#FF9F43]'
                      : 'border-transparent text-[#646B72] hover:text-[#212B36]'
                  }`}
                >
                  ✍️ Analyst Notes &amp; Chained Ledger
                </button>
              </div>
            </div>

            {/* TAB 1: Second-Layer Campaign Graph (Complaint → Phrase → Number → Wallet → Ring → Agent → Location) */}
            {selectedTab === 'graph' && (
              <div className="dream-card p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8EBED]">
                  <div>
                    <h4 className="font-poppins font-bold text-sm text-[#1B2850]">
                      Second Graph Layer: Multi-Incident Correlation Network
                    </h4>
                    <span className="text-[11px] text-[#646B72]">
                      Complaint ➔ Script Phrase ➔ Scammer Number ➔ Target Wallet ➔ Ring Hub ➔ Cash-Out Agent
                    </span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1B2850] text-white">
                    {selectedCampaign.graph_nodes.length} Nodes · {selectedCampaign.graph_edges.length} Edges
                  </span>
                </div>

                {/* Graph Visual Canvas Representation */}
                <div className="bg-[#1B2850] p-4 rounded-[8px] min-h-[340px] flex flex-col justify-between text-white relative overflow-hidden select-none">
                  
                  {/* Top Graph Legend */}
                  <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono pb-2 border-b border-white/10 z-10">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#FF0000]"></span> Ring Hub (Ring-12)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#FF9F43]"></span> Target Wallets (8)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#6C5CE7]"></span> Script Phrases</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#05A677]"></span> Cash-Out Agents</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#1B75D0]"></span> Customer Reports (50)</span>
                  </div>

                  {/* Nodes Simulation Grid */}
                  <div className="py-6 grid grid-cols-4 gap-4 items-center justify-items-center text-xs font-mono">
                    
                    {/* Layer 1: Complaints & Numbers */}
                    <div className="space-y-2 text-center">
                      <span className="text-[10px] text-white/60 uppercase font-bold block mb-1">Reports (50)</span>
                      <div className="p-2 bg-blue-600/30 border border-blue-400 rounded text-[11px]">
                        50 Incoming Reports
                      </div>
                      <div className="text-[10px] text-white/60">50 Distinct Callers</div>
                    </div>

                    {/* Layer 2: Phrases & Script */}
                    <div className="space-y-2 text-center">
                      <span className="text-[10px] text-white/60 uppercase font-bold block mb-1">Linguistic Match</span>
                      <div className="p-2 bg-purple-600/40 border border-purple-400 rounded text-[11px] font-bangla">
                        "উপায় কাস্টমার কেয়ার... ওটিপি দিন"
                      </div>
                      <span className="text-[10px] text-emerald-400">94% Semantic Match</span>
                    </div>

                    {/* Layer 3: Wallets */}
                    <div className="space-y-2 text-center">
                      <span className="text-[10px] text-white/60 uppercase font-bold block mb-1">8 Target Wallets</span>
                      <div className="p-2 bg-orange-600/40 border border-orange-400 rounded text-[11px]">
                        W-SYN-091177..091184
                      </div>
                      <span className="text-[10px] text-orange-300">2 Shared Devices</span>
                    </div>

                    {/* Layer 4: Ring Hub & Cash Out */}
                    <div className="space-y-2 text-center">
                      <span className="text-[10px] text-white/60 uppercase font-bold block mb-1">Ring Hub &amp; Agents</span>
                      <div className="p-2 bg-red-600/40 border border-red-400 rounded text-[11px] font-bold">
                        RING-2026-0012
                      </div>
                      <span className="text-[10px] text-emerald-300">3 Agents (Mirpur-10)</span>
                    </div>

                  </div>

                  {/* Bottom Connection Status */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-nunito text-white/80 z-10">
                    <span>Campaign Discovery: <strong>50 distinct reports converge into single coordinated infrastructure.</strong></span>
                    <span className="text-[#FF9F43] font-bold font-mono">Status: ACTIVE ESCALATION</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Linguistic Evidence & Top Phrases */}
            {selectedTab === 'evidence' && (
              <div className="dream-card p-5 space-y-4 shadow-sm">
                <div className="pb-2 border-b border-[#E8EBED]">
                  <h4 className="font-poppins font-bold text-sm text-[#1B2850]">
                    Linguistic &amp; Conversational Fingerprints
                  </h4>
                  <span className="text-xs text-[#646B72]">
                    High-frequency repeated n-grams and social engineering tokens across all 50 complaint dialogues.
                  </span>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-poppins font-bold text-[#1B2850] block">
                    Top Recurring Bangla &amp; Banglish Phrases:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedCampaign.common_phrases.map((phrase, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-[#FFF4E8] border border-[#FFD8BF] rounded-[6px] text-xs font-bangla text-[#D46B08] font-bold flex items-center gap-2"
                      >
                        <span className="w-2 h-2 rounded-full bg-[#FF9F43]"></span>
                        <span>"{phrase}"</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Geographic Hotspot Breakdown */}
                <div className="pt-3 border-t border-[#E8EBED] space-y-2 text-xs font-nunito">
                  <span className="font-poppins font-bold text-[#1B2850] block">
                    Geographic Distribution:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(selectedCampaign.geographic_distribution).map(([geo, count]) => (
                      <div key={geo} className="p-2.5 bg-[#F7F7F7] border border-[#E8EBED] rounded-[6px]">
                        <span className="text-[11px] text-[#646B72] block">{geo}</span>
                        <strong className="text-sm font-poppins text-[#1B2850]">{count} Reports</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Correlated Complaints Table */}
            {selectedTab === 'complaints' && (
              <div className="dream-card p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8EBED]">
                  <h4 className="font-poppins font-bold text-sm text-[#1B2850]">
                    Correlated Complaint Incidents ({complaints.length})
                  </h4>
                  <span className="text-[11px] text-[#646B72]">
                    All funneled to 8 target wallets
                  </span>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {complaints.map((cmp) => (
                    <div
                      key={cmp.complaint_id}
                      className="p-3 bg-[#F7F7F7] border border-[#E8EBED] rounded-[6px] text-xs font-nunito space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#1B2850]">{cmp.complaint_id}</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#1B2850] text-white font-mono text-[10px]">
                            {cmp.source_channel}
                          </span>
                          <span className="text-[#646B72] font-mono">Caller: {cmp.sender_number}</span>
                        </div>
                        <span className="text-[#FF9F43] font-bold">Target: {cmp.target_wallet}</span>
                      </div>
                      <p className="text-[#212B36] font-bangla text-[12px]">{cmp.complaint_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: Analyst Notes & Chained Audit Ledger */}
            {selectedTab === 'actions' && (
              <div className="dream-card p-5 space-y-4 shadow-sm">
                <div className="pb-2 border-b border-[#E8EBED]">
                  <h4 className="font-poppins font-bold text-sm text-[#1B2850]">
                    Analyst Investigation Journal &amp; Chained Audit Trail
                  </h4>
                  <span className="text-xs text-[#646B72]">
                    All notes, correlations, and decisions are cryptographically chained to SHA-256 ledger.
                  </span>
                </div>

                {/* Add Note Input */}
                <div className="space-y-2">
                  <textarea
                    value={newAnalystNote}
                    onChange={(e) => setNewAnalystNote(e.target.value)}
                    placeholder="Enter case note, ring correlation, or MLRO escalation details..."
                    className="w-full p-3 bg-[#F7F7F7] border border-[#E8EBED] rounded-[6px] text-xs font-nunito focus:outline-none focus:border-[#FF9F43] focus:bg-white"
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleAnalystAction('ADD_NOTE', { note: newAnalystNote })}
                      disabled={!newAnalystNote.trim()}
                      className="px-4 py-1.5 bg-[#1B2850] hover:bg-[#131E3D] text-white rounded-[6px] text-xs font-poppins font-semibold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post Chained Note</span>
                    </button>
                  </div>
                </div>

                {/* Existing Notes */}
                <div className="space-y-2 pt-2 border-t border-[#E8EBED]">
                  <span className="text-xs font-poppins font-bold text-[#1B2850] block">Chained Notes:</span>
                  {selectedCampaign.analyst_notes.length === 0 ? (
                    <div className="text-xs text-[#646B72] italic">No analyst notes recorded yet.</div>
                  ) : (
                    selectedCampaign.analyst_notes.map((n) => (
                      <div key={n.note_id} className="p-3 bg-[#F7F7F7] border border-[#E8EBED] rounded-[6px] text-xs font-nunito space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-[#646B72]">
                          <span className="font-bold text-[#1B2850]">{n.analyst_id}</span>
                          <span>{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-[#212B36]">{n.note}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="lg:col-span-8 dream-card p-12 text-center text-xs text-[#646B72]">
            Select a campaign from the queue to view its second-layer graph and linguistic evidence.
          </div>
        )}

      </div>
    </div>
  );
};
