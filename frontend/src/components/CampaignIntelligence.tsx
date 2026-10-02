'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Network, ShieldAlert, Sparkles, Activity, Clock, CheckCircle2, 
  AlertTriangle, Filter, Layers, ExternalLink, ArrowRight, 
  FileText, User, Radio, Smartphone, Plus, RefreshCw, Send, Check, Mic, Edit3
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
      <div className="dream-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border-t-2 border-t-flame-500">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-flame-500" />
            <h1 className="text-xl font-display font-bold text-ink">
              Scam Campaign Intelligence &amp; Second-Layer Graph
            </h1>
            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-ui font-bold bg-flame-500/15 text-flame-500 border border-flame-500/30">
              M14 / Cross-Incident Clustering
            </span>
          </div>
          <p className="text-xs font-ui text-ink-muted mt-1">
            Detects coordinated scam campaigns across disparate wallets, caller numbers, and agents sharing linguistic and behavioral fingerprints.
          </p>
        </div>

        {/* 50-Complaint Demo Trigger Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun50ComplaintDemo}
            disabled={isGeneratingDemo}
            className="flex items-center gap-2 px-4 py-2 bg-flame-500 hover:bg-ember-500 text-white rounded-xl text-xs font-display font-semibold shadow-[0px_4px_15px_0px_rgba(255,159,67,0.30)] transition-all active:scale-95 disabled:opacity-50"
          >
            {isGeneratingDemo ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-white" />
            )}
            <span>{isGeneratingDemo ? 'Clustering 50 Incidents...' : 'Discover 50-Complaint Campaign'}</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 bg-success/10 border border-success/30 rounded-xl text-success text-xs font-ui font-bold flex items-center gap-2 animate-fadeIn shadow-sm">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* KPI Overview Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="dream-card p-4 space-y-1 shadow-sm">
          <span className="text-[11px] font-ui text-ink-muted block">Active Discovered Campaigns</span>
          <strong className="text-xl font-display font-bold text-ink">
            {campaigns.filter(c => c.lifecycle_status === 'ACTIVE' || c.lifecycle_status === 'GROWING').length} Campaigns
          </strong>
          <span className="text-[10px] text-flame-500 font-bold block">Across 6 Typologies</span>
        </div>

        <div className="dream-card p-4 space-y-1 shadow-sm">
          <span className="text-[11px] font-ui text-ink-muted block">Total Affected Mule Wallets</span>
          <strong className="text-xl font-display font-bold text-ink">
            {campaigns.reduce((acc, c) => acc + c.affected_wallets.length, 0)} Wallets
          </strong>
          <span className="text-[10px] text-success font-bold block">Funneled to Ring-12 Hub</span>
        </div>

        <div className="dream-card p-4 space-y-1 shadow-sm">
          <span className="text-[11px] font-ui text-ink-muted block">Total Estimated Exposure</span>
          <strong className="text-xl font-display font-bold text-flame-500">
            ৳{campaigns.reduce((acc, c) => acc + c.estimated_exposure_bdt, 0).toLocaleString()}
          </strong>
          <span className="text-[10px] text-ink-muted font-bold block">Across 80+ Complaints</span>
        </div>

        <div className="dream-card p-4 space-y-1 shadow-sm">
          <span className="text-[11px] font-ui text-ink-muted block">Multi-Factor Fingerprint Match</span>
          <strong className="text-xl font-display font-bold text-success">
            94.2% Confidence
          </strong>
          <span className="text-[10px] text-success font-bold block">Linguistic + Graph Blend</span>
        </div>
      </div>

      {/* Main Grid: Left Campaign Queue (4 Cols) + Right Detailed Campaign & Graph (8 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Discovered Campaigns List (4 Cols) */}
        <div className="lg:col-span-4 dream-card p-4 space-y-3 shadow-sm flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-hairsoft">
              <span className="text-xs font-display font-bold text-ink">DISCOVERED CAMPAIGNS</span>
              <span className="text-[11px] font-num text-flame-500 font-bold">
                {filteredCampaigns.length} Total
              </span>
            </div>

            {/* Lifecycle Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-ui no-scrollbar">
              {['ALL', 'ACTIVE', 'GROWING', 'EMERGING', 'RESOLVED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setActiveLifecycleFilter(status)}
                  className={`px-2 py-0.5 rounded-lg font-bold whitespace-nowrap transition-colors ${
                    activeLifecycleFilter === status
                      ? 'bg-flame-500 text-white shadow-sm'
                      : 'bg-elev text-ink-muted hover:bg-elev'
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
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-card border-l-4 border-l-flame-500 border-t-hairsoft border-r-hairsoft border-b-hairsoft shadow-md'
                        : 'bg-elev border-hairsoft hover:bg-card'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-num text-xs font-bold text-ink">{c.campaign_id}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-lg font-ui font-bold ${
                          c.lifecycle_status === 'ACTIVE'
                            ? 'bg-danger/10 text-danger border border-danger/30 animate-pulse'
                            : c.lifecycle_status === 'GROWING'
                            ? 'bg-flame-500/15 text-flame-500 border border-flame-500/30'
                            : 'bg-success/10 text-success'
                        }`}
                      >
                        {c.lifecycle_status}
                      </span>
                    </div>

                    <h4 className="font-display font-bold text-xs text-ink line-clamp-1 mb-1">
                      {c.campaign_name}
                    </h4>

                    <div className="text-[11px] font-bangla text-ink-muted line-clamp-1 mb-2">
                      {c.typology_label_bn}
                    </div>

                    <div className="flex items-center justify-between text-xs font-ui pt-2 border-t border-hairsoft">
                      <span className="text-ink-muted">
                        Exposure: <strong className="text-flame-500">৳{c.estimated_exposure_bdt.toLocaleString()}</strong>
                      </span>
                      <span className="font-num text-[10px] px-1.5 py-0.5 rounded bg-inverse text-white font-bold">
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
              <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-hairsoft">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-num text-base font-bold text-ink">{selectedCampaign.campaign_id}</span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-danger/10 text-danger font-ui font-bold text-xs border border-danger/30">
                      Lifecycle: {selectedCampaign.lifecycle_status}
                    </span>
                    <span className="text-xs font-ui text-ink-muted">
                      Complaints: <strong className="text-ink">{selectedCampaign.complaint_count} Reports</strong>
                    </span>
                  </div>
                  <h3 className="text-base font-display font-bold text-ink mt-1">
                    {selectedCampaign.campaign_name}
                  </h3>
                  <p className="text-xs font-bangla text-ink-muted mt-0.5">
                    {selectedCampaign.typology_label_bn}
                  </p>
                </div>

                {/* Direct Action: Link to Ring-12 */}
                <div className="flex items-center gap-2">
                  <Link
                    href="/rings"
                    className="px-3 py-1.5 rounded-lg bg-card hover:bg-elev border border-hair text-ink text-xs font-ui font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Network className="w-3.5 h-3.5 text-flame-500" />
                    <span>View Ring-12</span>
                    <ExternalLink className="w-3.5 h-3.5 text-flame-500" />
                  </Link>
                  <button
                    onClick={() => handleAnalystAction('UPDATE_LIFECYCLE', { lifecycle: 'RESOLVED' })}
                    className="px-3 py-1.5 rounded-lg bg-success hover:bg-success-lo text-white text-xs font-display font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark Resolved</span>
                  </button>
                </div>
              </div>

              {/* Multi-Factor Campaign Score Breakdown Bar */}
              <div className="p-3 bg-elev rounded-xl border border-hairsoft space-y-2 text-xs font-ui">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-ink">
                    Composite Campaign Intelligence Score:
                  </span>
                  <span className="font-num text-sm font-bold text-danger">
                    {(selectedCampaign.campaign_score * 100).toFixed(0)}% (Multi-Factor Synthesized)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                  <div className="p-2 bg-white rounded border border-hairsoft">
                    <span className="text-ink-muted block">Linguistic Sim</span>
                    <strong className="text-flame-500 font-num">
                       {(selectedCampaign.score_breakdown.linguistic_similarity * 100).toFixed(0)}%
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-hairsoft">
                    <span className="text-ink-muted block">Temporal Sync</span>
                    <strong className="text-success font-num">
                      {(selectedCampaign.score_breakdown.temporal_synchrony * 100).toFixed(0)}%
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-hairsoft">
                    <span className="text-ink-muted block">Entity Overlap</span>
                    <strong className="text-ink font-num">
                      {(selectedCampaign.score_breakdown.entity_overlap * 100).toFixed(0)}%
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-hairsoft">
                    <span className="text-ink-muted block">Txn Pattern</span>
                    <strong className="text-info font-num">
                      {(selectedCampaign.score_breakdown.transaction_pattern_similarity * 100).toFixed(0)}%
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-hairsoft">
                    <span className="text-ink-muted block">Graph Overlap</span>
                    <strong className="text-iris-lo font-num">
                      {(selectedCampaign.score_breakdown.graph_overlap * 100).toFixed(0)}%
                    </strong>
                  </div>
                </div>
              </div>

              {/* View Tabs */}
              <div className="flex items-center gap-2 pt-2 border-b border-hairsoft text-xs font-ui">
                <button
                  onClick={() => setSelectedTab('graph')}
                  className={`pb-2 px-3 font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                    selectedTab === 'graph'
                      ? 'border-flame-500 text-flame-500'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Campaign Graph Layer</span>
                </button>
                <button
                  onClick={() => setSelectedTab('evidence')}
                  className={`pb-2 px-3 font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                    selectedTab === 'evidence'
                      ? 'border-flame-500 text-flame-500'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Linguistic &amp; Phrase Fingerprints</span>
                </button>
                <button
                  onClick={() => setSelectedTab('complaints')}
                  className={`pb-2 px-3 font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                    selectedTab === 'complaints'
                      ? 'border-flame-500 text-flame-500'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Correlated Complaints ({complaints.length})</span>
                </button>
                <button
                  onClick={() => setSelectedTab('actions')}
                  className={`pb-2 px-3 font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                    selectedTab === 'actions'
                      ? 'border-flame-500 text-flame-500'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Analyst Notes &amp; Chained Ledger</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Second-Layer Campaign Graph (Complaint → Phrase → Number → Wallet → Ring → Agent → Location) */}
            {selectedTab === 'graph' && (
              <div className="dream-card p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-hairsoft">
                  <div>
                    <h4 className="font-display font-bold text-sm text-ink">
                      Second Graph Layer: Multi-Incident Correlation Network
                    </h4>
                    <span className="text-[11px] text-ink-muted">
                      Complaint ➔ Script Phrase ➔ Scammer Number ➔ Target Wallet ➔ Ring Hub ➔ Cash-Out Agent
                    </span>
                  </div>
                  <span className="text-[11px] font-num px-2 py-0.5 rounded bg-inverse text-white">
                    {selectedCampaign.graph_nodes.length} Nodes · {selectedCampaign.graph_edges.length} Edges
                  </span>
                </div>

                {/* Graph Visual Canvas Representation */}
                <div className="bg-inverse p-4 rounded-xl min-h-[340px] flex flex-col justify-between text-white relative overflow-hidden select-none">
                  
                  {/* Top Graph Legend */}
                  <div className="flex flex-wrap items-center gap-3 text-[10px] font-num pb-2 border-b border-white/10 z-10">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-danger"></span> Ring Hub (Ring-12)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-flame-500"></span> Target Wallets (8)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-iris-lo"></span> Script Phrases</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-success"></span> Cash-Out Agents</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-info"></span> Customer Reports (50)</span>
                  </div>

                  {/* Nodes Simulation Grid */}
                  <div className="py-6 grid grid-cols-4 gap-4 items-center justify-items-center text-xs font-num">
                    
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
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-ui text-white/80 z-10">
                    <span>Campaign Discovery: <strong>50 distinct reports converge into single coordinated infrastructure.</strong></span>
                    <span className="text-flame-500 font-bold font-num">Status: ACTIVE ESCALATION</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Linguistic Evidence & Top Phrases */}
            {selectedTab === 'evidence' && (
              <div className="dream-card p-5 space-y-4 shadow-sm">
                <div className="pb-2 border-b border-hairsoft">
                  <h4 className="font-display font-bold text-sm text-ink">
                    Linguistic &amp; Conversational Fingerprints
                  </h4>
                  <span className="text-xs text-ink-muted">
                    High-frequency repeated n-grams and social engineering tokens across all 50 complaint dialogues.
                  </span>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-display font-bold text-ink block">
                    Top Recurring Bangla &amp; Banglish Phrases:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedCampaign.common_phrases.map((phrase, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-flame-50 border border-flame-100 rounded-xl text-xs font-bangla text-ember-600 font-bold flex items-center gap-2"
                      >
                        <span className="w-2 h-2 rounded-full bg-flame-500"></span>
                        <span>"{phrase}"</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Geographic Hotspot Breakdown */}
                <div className="pt-3 border-t border-hairsoft space-y-2 text-xs font-ui">
                  <span className="font-display font-bold text-ink block">
                    Geographic Distribution:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(selectedCampaign.geographic_distribution).map(([geo, count]) => (
                      <div key={geo} className="p-2.5 bg-elev border border-hairsoft rounded-xl">
                        <span className="text-[11px] text-ink-muted block">{geo}</span>
                        <strong className="text-sm font-display text-ink">{count} Reports</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Correlated Complaints Table */}
            {selectedTab === 'complaints' && (
              <div className="dream-card p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-hairsoft">
                  <h4 className="font-display font-bold text-sm text-ink">
                    Correlated Complaint Incidents ({complaints.length})
                  </h4>
                  <span className="text-[11px] text-ink-muted">
                    All funneled to 8 target wallets
                  </span>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {complaints.map((cmp) => (
                    <div
                      key={cmp.complaint_id}
                      className="p-3 bg-elev border border-hairsoft rounded-xl text-xs font-ui space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-num font-bold text-ink">{cmp.complaint_id}</span>
                          <span className="px-1.5 py-0.5 rounded bg-inverse text-white font-num text-[10px]">
                            {cmp.source_channel}
                          </span>
                          <span className="text-ink-muted font-num">Caller: {cmp.sender_number}</span>
                        </div>
                        <span className="text-flame-500 font-bold">Target: {cmp.target_wallet}</span>
                      </div>
                      <p className="text-ink font-bangla text-[12px]">{cmp.complaint_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: Analyst Notes & Chained Audit Ledger */}
            {selectedTab === 'actions' && (
              <div className="dream-card p-5 space-y-4 shadow-sm">
                <div className="pb-2 border-b border-hairsoft">
                  <h4 className="font-display font-bold text-sm text-ink">
                    Analyst Investigation Journal &amp; Chained Audit Trail
                  </h4>
                  <span className="text-xs text-ink-muted">
                    All notes, correlations, and decisions are cryptographically chained to SHA-256 ledger.
                  </span>
                </div>

                {/* Add Note Input */}
                <div className="space-y-2">
                  <textarea
                    value={newAnalystNote}
                    onChange={(e) => setNewAnalystNote(e.target.value)}
                    placeholder="Enter case note, ring correlation, or MLRO escalation details..."
                    className="w-full p-3 bg-elev border border-hairsoft rounded-xl text-xs font-ui focus:outline-none focus:border-flame-500 focus:bg-white"
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleAnalystAction('ADD_NOTE', { note: newAnalystNote })}
                      disabled={!newAnalystNote.trim()}
                      className="px-4 py-1.5 bg-inverse hover:bg-inverse-hi text-white rounded-xl text-xs font-display font-semibold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post Chained Note</span>
                    </button>
                  </div>
                </div>

                {/* Existing Notes */}
                <div className="space-y-2 pt-2 border-t border-hairsoft">
                  <span className="text-xs font-display font-bold text-ink block">Chained Notes:</span>
                  {selectedCampaign.analyst_notes.length === 0 ? (
                    <div className="text-xs text-ink-muted italic">No analyst notes recorded yet.</div>
                  ) : (
                    selectedCampaign.analyst_notes.map((n) => (
                      <div key={n.note_id} className="p-3 bg-elev border border-hairsoft rounded-xl text-xs font-ui space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-ink-muted">
                          <span className="font-bold text-ink">{n.analyst_id}</span>
                          <span>{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-ink">{n.note}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="lg:col-span-8 dream-card p-12 text-center text-xs text-ink-muted">
            Select a campaign from the queue to view its second-layer graph and linguistic evidence.
          </div>
        )}

      </div>
    </div>
  );
};
