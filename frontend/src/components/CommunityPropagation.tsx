'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  MapPin, Play, Pause, RotateCcw, AlertTriangle, ShieldAlert, 
  TrendingUp, Users, Wallet, Radio, Layers, Sparkles, CheckCircle2, 
  XCircle, Send, ArrowRight, Clock, RefreshCw, ExternalLink, ShieldCheck,
  Filter, Eye, FileText, X
} from 'lucide-react';
import { 
  DayPropagationSnapshot, RegionalSpreadData, ScamSpreadAlert, 
  ClusterStatus, PropagationAnalystActionRecord 
} from '../core/types';

export const CommunityPropagation: React.FC = () => {
  const [timeline, setTimeline] = useState<DayPropagationSnapshot[]>([]);
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(5);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<ScamSpreadAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<ScamSpreadAlert | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionalSpreadData | null>(null);
  const [activeTab, setActiveTab] = useState<'spread_map' | 'alerts' | 'evidence_timeline'>('spread_map');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState<boolean>(false);
  const [customWarningBn, setCustomWarningBn] = useState<string>('');
  const [customWarningEn, setCustomWarningEn] = useState<string>('');
  const [analystNotes, setAnalystNotes] = useState<string>('');

  // Fetch Timeline Snapshots and Active Alerts
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tlRes, alRes] = await Promise.all([
        fetch('/api/v1/propagation/timeline'),
        fetch('/api/v1/propagation/alerts')
      ]);

      const tlData = await tlRes.json();
      const alData = await alRes.json();

      if (tlData.timeline) {
        setTimeline(tlData.timeline);
      }
      if (alData.alerts) {
        setAlerts(alData.alerts);
        if (alData.alerts.length > 0 && !selectedAlert) {
          setSelectedAlert(alData.alerts[0]);
          setCustomWarningBn(alData.alerts[0].customer_warning_draft_bn);
          setCustomWarningEn(alData.alerts[0].customer_warning_draft_en);
        }
      }
    } catch (e) {
      console.error('Error fetching propagation data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Animation player loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentDayIndex(prev => {
          if (prev >= 5) {
            setIsPlaying(false);
            return 5;
          }
          return prev + 1;
        });
      }, 2000);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const currentSnapshot = timeline.find(s => s.day_index === currentDayIndex) || timeline[timeline.length - 1];

  // Execute Analyst Action on Alert
  const handleAnalystAction = async (
    actionType: 'REVIEW' | 'CREATE_CAMPAIGN_CASE' | 'DRAFT_CUSTOMER_WARNING' | 'LINK_TO_SCAM_RADAR' | 'MARK_FALSE_CLUSTER'
  ) => {
    if (!selectedAlert) return;

    try {
      const res = await fetch(`/api/v1/propagation/alerts/${selectedAlert.alert_id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: actionType,
          analyst_id: 'ANALYST-OPS-01',
          notes: analystNotes || undefined,
          warning_payload: actionType === 'DRAFT_CUSTOMER_WARNING' ? {
            text_bn: customWarningBn,
            text_en: customWarningEn,
            target_regions: selectedAlert.affected_regions
          } : undefined
        })
      });

      const data = await res.json();
      if (data.success && data.alert) {
        setSelectedAlert(data.alert);
        setAlerts(prev => prev.map(a => a.alert_id === data.alert.alert_id ? data.alert : a));
        setActionSuccess(`Successfully executed ${actionType} on ${selectedAlert.alert_id}`);
        if (actionType === 'DRAFT_CUSTOMER_WARNING') {
          setIsWarningModalOpen(false);
        }
        setTimeout(() => setActionSuccess(null), 5000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger Outbreak Demo
  const handleRunDemo = async () => {
    try {
      const res = await fetch('/api/v1/propagation/simulate-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_region: 'Sylhet', target_region: 'Dhaka North' })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentDayIndex(1);
        setIsPlaying(true);
        setActionSuccess('Started 5-Day Synthetic Outbreak Simulation (Sylhet -> Dhaka North)');
        setTimeout(() => setActionSuccess(null), 5000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusBadge = (status: ClusterStatus) => {
    switch (status) {
      case 'EMERGING_CLUSTER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-flame-500/15 text-flame-500 border border-flame-500/30">EMERGING</span>;
      case 'RISING_CLUSTER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-danger/15 text-danger border border-danger/30 animate-pulse">RISING SURGE</span>;
      case 'STABLE_CLUSTER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-inverse/10 text-ink border border-hairbold/20">STABLE</span>;
      case 'DECLINING_CLUSTER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-success/15 text-success border border-success/30">DECLINING</span>;
      case 'FALSE_CLUSTER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-ink-muted/15 text-ink-muted border border-hair/30">FALSE CLUSTER</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionSuccess && (
        <div className="bg-success text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between text-xs font-bold animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Overview */}
      <div className="bg-card border border-hairsoft rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="p-2 rounded-xl bg-flame-500/15 text-flame-500">
                <MapPin className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-display font-bold text-ink">
                Community Scam Propagation Intelligence
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-num font-bold bg-danger/10 text-danger border border-danger/20">
                Outbreak Radar
              </span>
            </div>
            <p className="text-xs text-ink-muted font-ui max-w-3xl">
              Real-time detection of coordinated scam patterns spreading across geographic, social, and behavioral clusters.
              Time-based diffusion modeling with coarse spatial units protects customer privacy while preventing fraud contagion.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunDemo}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-inverse text-white text-xs font-bold font-ui hover:bg-inverse/90 transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-flame-500" />
              Run 5-Day Outbreak Demo
            </button>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 rounded-xl border border-hairsoft hover:bg-elev text-ink-muted transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Coarse Spatial Disclaimer Banner */}
        <div className="mt-4 p-3 rounded-xl bg-elev border border-hairsoft flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
          <p className="text-[11px] font-ui text-ink-muted">
            <strong className="text-ink">Non-Discriminatory Spatial Context:</strong> Location data is strictly coarse (division &amp; coarse synthetic cells) and contextual. Astha never infers individual guilt or increases risk based on geographic origin alone.
          </p>
        </div>
      </div>

      {/* Time Animation & Playback Controller */}
      <div className="bg-card border border-hairsoft rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-ui transition-colors shadow-sm ${
                isPlaying ? 'bg-flame-500 text-white' : 'bg-inverse text-white hover:bg-inverse/90'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause Timeline' : 'Play Spread Animation'}</span>
            </button>

            <button
              onClick={() => { setIsPlaying(false); setCurrentDayIndex(1); }}
              className="p-2 rounded-xl border border-hairsoft text-ink-muted hover:bg-elev text-xs font-bold"
              title="Reset to Day 1"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Day Selector Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[1, 2, 3, 4, 5].map(day => (
              <button
                key={day}
                onClick={() => { setIsPlaying(false); setCurrentDayIndex(day); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-num font-bold transition-colors ${
                  currentDayIndex === day
                    ? 'bg-flame-500 text-white shadow-sm'
                    : 'bg-elev text-ink-muted hover:bg-elev'
                }`}
              >
                Day {day} {day === 5 ? '(Now)' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Metrics Bar */}
        {currentSnapshot && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-hairsoft">
            <div className="p-3 bg-elev rounded-xl">
              <span className="text-[10px] text-ink-dim uppercase font-bold block">Current Snapshot</span>
              <span className="text-base font-bold font-num text-ink">{currentSnapshot.day_label}</span>
              <span className="text-[10px] text-ink-muted block">{currentSnapshot.date_str}</span>
            </div>
            <div className="p-3 bg-elev rounded-xl">
              <span className="text-[10px] text-ink-dim uppercase font-bold block">Total Outbreak Cases</span>
              <span className="text-base font-bold font-num text-flame-500">{currentSnapshot.total_cases}</span>
              <span className="text-[10px] text-ink-muted block">{currentSnapshot.active_clusters_count} active regions</span>
            </div>
            <div className="p-3 bg-elev rounded-xl">
              <span className="text-[10px] text-ink-dim uppercase font-bold block">Unique Victims</span>
              <span className="text-base font-bold font-num text-danger">{currentSnapshot.total_victims}</span>
              <span className="text-[10px] text-ink-muted block">{currentSnapshot.growth_rate}x velocity</span>
            </div>
            <div className="p-3 bg-elev rounded-xl">
              <span className="text-[10px] text-ink-dim uppercase font-bold block">Potential Exposure</span>
              <span className="text-base font-bold font-num text-ink">৳{currentSnapshot.total_exposure_bdt.toLocaleString()}</span>
              <span className="text-[10px] text-success font-bold block">Pre-emptive Guard</span>
            </div>
          </div>
        )}

        {/* Key Events for the Day */}
        {currentSnapshot && currentSnapshot.key_events.length > 0 && (
          <div className="p-3 rounded-xl bg-flame-50/60 border border-flame-500/20 space-y-1">
            <span className="text-[11px] font-bold text-flame-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Timeline Events ({currentSnapshot.day_label}):
            </span>
            <ul className="text-xs font-ui text-ink space-y-0.5 list-disc list-inside">
              {currentSnapshot.key_events.map((evt, idx) => (
                <li key={idx}>{evt}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Active Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-hairsoft pb-2">
        <button
          onClick={() => setActiveTab('spread_map')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-ui transition-colors ${
            activeTab === 'spread_map'
              ? 'bg-flame-500 text-white shadow-sm'
              : 'text-ink-muted hover:bg-elev'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Scam Spread Map ({currentSnapshot?.regions.length || 0} Clusters)</span>
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-ui transition-colors ${
            activeTab === 'alerts'
              ? 'bg-flame-500 text-white shadow-sm'
              : 'text-ink-muted hover:bg-elev'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Active Spread Alerts ({alerts.length})</span>
        </button>
      </div>

      {/* Tab 1: Scam Spread Map & Coarse Regional Cards */}
      {activeTab === 'spread_map' && currentSnapshot && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Regional Cards Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentSnapshot.regions.map(region => (
                <div
                  key={region.region_id}
                  onClick={() => setSelectedRegion(region)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer bg-card ${
                    selectedRegion?.region_id === region.region_id
                      ? 'border-flame-500 ring-2 ring-flame-500/20 shadow-md'
                      : 'border-hairsoft hover:border-hair shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-ink">{region.division}</span>
                        <span className="px-1.5 py-0.5 rounded bg-inverse/10 text-ink text-[9px] font-num font-bold">
                          {region.coarse_geo_cell}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted">{region.district_name}</p>
                    </div>
                    {getStatusBadge(region.cluster_status)}
                  </div>

                  <div className="grid grid-cols-3 gap-2 my-3 p-2 rounded-xl bg-elev">
                    <div>
                      <span className="text-[9px] text-ink-dim uppercase font-bold block">Cases</span>
                      <span className="text-sm font-bold font-num text-ink">{region.cases}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-ink-dim uppercase font-bold block">Growth</span>
                      <span className={`text-sm font-bold font-num ${region.growth_pct > 0 ? 'text-danger' : 'text-success'}`}>
                        {region.growth_pct > 0 ? `+${region.growth_pct}%` : '0%'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-ink-dim uppercase font-bold block">Victims</span>
                      <span className="text-sm font-bold font-num text-flame-500">{region.affected_customer_count}</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-ink-muted">
                      <span>Top Typology:</span>
                      <span className="font-bold text-ink truncate max-w-[160px]">{region.top_typology_name}</span>
                    </div>
                    {region.linked_campaign_name && (
                      <div className="flex items-center justify-between text-ink-muted">
                        <span>Campaign:</span>
                        <span className="font-num text-flame-500 font-bold truncate max-w-[160px]">{region.linked_campaign_name}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-ink-muted">
                      <span>Exposure:</span>
                      <span className="font-num font-bold text-ink">৳{region.total_exposure_bdt.toLocaleString()}</span>
                    </div>
                  </div>

                  {region.linked_wallets.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-hairsoft flex items-center gap-1.5 overflow-x-auto">
                      <span className="text-[10px] text-ink-dim font-bold">Wallets:</span>
                      {region.linked_wallets.map(w => (
                        <span key={w} className="px-1.5 py-0.5 rounded bg-inverse/5 text-ink text-[9px] font-num">
                          {w}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Region Detail / Selected Cluster Panel */}
          <div className="bg-card border border-hairsoft rounded-2xl p-5 shadow-sm space-y-4 h-fit">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-hairsoft pb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-flame-500" />
              {selectedRegion ? `Cluster Inspection: ${selectedRegion.division}` : 'Select a Cluster to Inspect'}
            </h3>

            {selectedRegion ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-ink">{selectedRegion.district_name}</h4>
                    <span className="text-xs text-ink-muted font-num">{selectedRegion.coarse_geo_cell}</span>
                  </div>
                  {getStatusBadge(selectedRegion.cluster_status)}
                </div>

                <div className="p-3 rounded-xl bg-elev space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Cluster Status:</span>
                    <span className="font-num font-bold text-ink">{selectedRegion.cluster_status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Total Incidents:</span>
                    <span className="font-num font-bold text-ink">{selectedRegion.cases}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Unique Victims:</span>
                    <span className="font-num font-bold text-flame-500">{selectedRegion.affected_customer_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Estimated Exposure:</span>
                    <span className="font-num font-bold text-ink">৳{selectedRegion.total_exposure_bdt.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-ink block">Linked Wallets ({selectedRegion.linked_wallets.length})</span>
                  <div className="space-y-1">
                    {selectedRegion.linked_wallets.map(w => (
                      <div key={w} className="flex items-center justify-between p-2 rounded bg-elev text-xs font-num">
                        <span>{w}</span>
                        <span className="text-[10px] text-danger font-bold">Ring-12 Link</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedRegion.linked_campaign_id && (
                  <Link
                    href="/campaigns"
                    className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl bg-flame-50 text-flame-500 text-xs font-bold hover:bg-flame-500 hover:text-white transition-colors"
                  >
                    <span>View Campaign in Intelligence Hub</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-ink-dim">
                Click on any regional cluster card to view granular diffusion metrics, linked destination wallets, and campaign ties.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Active Spread Alerts & Analyst Triage Actions */}
      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
              High-Velocity Outbreak Alerts ({alerts.length})
            </h3>
            {alerts.map(alert => (
              <div
                key={alert.alert_id}
                onClick={() => {
                  setSelectedAlert(alert);
                  setCustomWarningBn(alert.customer_warning_draft_bn);
                  setCustomWarningEn(alert.customer_warning_draft_en);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer bg-card ${
                  selectedAlert?.alert_id === alert.alert_id
                    ? 'border-flame-500 ring-2 ring-flame-500/20 shadow-md'
                    : 'border-hairsoft hover:border-hair shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-bold font-num text-ink block">{alert.alert_id}</span>
                    <span className="text-[11px] font-bold text-flame-500">{alert.campaign_name}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-danger/15 text-danger animate-pulse">
                    {alert.growth_label}
                  </span>
                </div>

                <div className="text-[11px] text-ink-muted space-y-1">
                  <div>Typology: <strong className="text-ink">{alert.top_typology_name}</strong></div>
                  <div>Status: <strong className="text-ink">{alert.status}</strong></div>
                  <div>Affected: {alert.affected_regions.join(', ')}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Alert Triage & Action Console */}
          {selectedAlert && (
            <div className="lg:col-span-2 bg-card border border-hairsoft rounded-2xl p-5 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-hairsoft">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-danger" />
                    <h3 className="text-base font-bold text-ink font-display">{selectedAlert.alert_id}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-danger/10 text-danger">
                      {selectedAlert.growth_label}
                    </span>
                  </div>
                  <span className="text-xs text-ink-muted">{selectedAlert.campaign_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-muted">Status:</span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold font-num bg-inverse/10 text-ink">
                    {selectedAlert.status}
                  </span>
                </div>
              </div>

              {/* Propagation Features Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-elev rounded-xl">
                  <span className="text-[10px] text-ink-dim uppercase font-bold block">New Cases / Day</span>
                  <span className="text-sm font-bold font-num text-ink">{selectedAlert.features.new_cases_per_day}</span>
                </div>
                <div className="p-3 bg-elev rounded-xl">
                  <span className="text-[10px] text-ink-dim uppercase font-bold block">Common Phrase Rate</span>
                  <span className="text-sm font-bold font-num text-success">{(selectedAlert.features.common_phrase_rate * 100).toFixed(0)}%</span>
                </div>
                <div className="p-3 bg-elev rounded-xl">
                  <span className="text-[10px] text-ink-dim uppercase font-bold block">Recipient Overlap</span>
                  <span className="text-sm font-bold font-num text-flame-500">{(selectedAlert.features.common_recipient_rate * 100).toFixed(0)}%</span>
                </div>
                <div className="p-3 bg-elev rounded-xl">
                  <span className="text-[10px] text-ink-dim uppercase font-bold block">Campaign Link</span>
                  <span className="text-sm font-bold font-num text-ink">{(selectedAlert.features.campaign_overlap * 100).toFixed(0)}% Match</span>
                </div>
              </div>

              {/* Evidence Bundle */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Multi-Modal Evidence Bundle</h4>
                
                {/* Phrases */}
                <div className="p-3 rounded-xl bg-elev space-y-1.5">
                  <span className="text-[11px] font-bold text-ink-muted block">Shared Scam Script Tokens (Phonetic &amp; Normalized):</span>
                  {selectedAlert.evidence.common_phrases.map((phrase, idx) => (
                    <div key={idx} className="p-2 bg-white rounded border border-hairsoft text-xs font-num text-ink">
                      &quot;{phrase}&quot;
                    </div>
                  ))}
                </div>

                {/* Wallets and Numbers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-elev space-y-1">
                    <span className="text-[11px] font-bold text-ink-muted block">Shared Destination Wallets:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAlert.evidence.shared_destination_wallets.map(w => (
                        <span key={w} className="px-2 py-0.5 rounded bg-white border border-hairsoft text-xs font-num font-bold text-danger">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-elev space-y-1">
                    <span className="text-[11px] font-bold text-ink-muted block">Reported Originating Numbers:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAlert.evidence.reported_caller_numbers.map(n => (
                        <span key={n} className="px-2 py-0.5 rounded bg-white border border-hairsoft text-xs font-num text-ink">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pre-Drafted Customer Advisory Banner */}
              <div className="p-4 rounded-xl bg-flame-50 border border-flame-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-flame-500 flex items-center gap-1.5">
                    <Radio className="w-4 h-4" /> Targeted Customer Safety Warning Draft
                  </span>
                  <button
                    onClick={() => setIsWarningModalOpen(true)}
                    className="text-[11px] font-bold text-ink hover:underline"
                  >
                    Customize Broadcast
                  </button>
                </div>
                <p className="text-xs font-bengali text-ink">{selectedAlert.customer_warning_draft_bn}</p>
                <p className="text-[11px] font-ui text-ink-muted">{selectedAlert.customer_warning_draft_en}</p>
              </div>

              {/* Analyst Action Buttons */}
              <div className="pt-3 border-t border-hairsoft space-y-3">
                <span className="text-xs font-bold text-ink uppercase tracking-wider block">Execute Analyst Mitigation Action:</span>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleAnalystAction('REVIEW')}
                    className="px-3.5 py-2 rounded-xl bg-inverse text-white text-xs font-bold hover:bg-inverse/90 transition-colors"
                  >
                    Acknowledge &amp; Review
                  </button>

                  <button
                    onClick={() => setIsWarningModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-flame-500 text-white text-xs font-bold hover:bg-flame-500/90 transition-colors shadow-sm"
                  >
                    Broadcast Customer Warning
                  </button>

                  <button
                    onClick={() => handleAnalystAction('LINK_TO_SCAM_RADAR')}
                    className="px-3.5 py-2 rounded-xl bg-success text-white text-xs font-bold hover:bg-success/90 transition-colors"
                  >
                    Push to Scam Radar (M6)
                  </button>

                  <Link
                    href="/campaigns"
                    className="px-3.5 py-2 rounded-xl border border-hairsoft text-ink-muted hover:bg-elev text-xs font-bold flex items-center gap-1"
                  >
                    <span>View Campaign Hub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => handleAnalystAction('MARK_FALSE_CLUSTER')}
                    className="px-3.5 py-2 rounded-xl bg-white border border-danger/30 text-danger text-xs font-bold hover:bg-danger/5 transition-colors"
                  >
                    Mark False Cluster (Dismiss)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Broadcast Customer Warning Modal */}
      {isWarningModalOpen && selectedAlert && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-hairsoft pb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-flame-500" />
                <h3 className="text-base font-bold font-display text-ink">
                  Draft Targeted Customer Warning Broadcast
                </h3>
              </div>
              <button onClick={() => setIsWarningModalOpen(false)} className="text-ink-muted hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-ui">
              <div>
                <label className="font-bold text-ink block mb-1">Target Geographic Coarse Regions:</label>
                <div className="p-2 rounded bg-elev font-num text-ink">
                  {selectedAlert.affected_regions.join(' • ')}
                </div>
              </div>

              <div>
                <label className="font-bold text-ink block mb-1">Bangla SMS / Push Warning Text:</label>
                <textarea
                  rows={3}
                  value={customWarningBn}
                  onChange={(e) => setCustomWarningBn(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-hairsoft text-xs font-bengali focus:outline-none focus:border-flame-500"
                />
              </div>

              <div>
                <label className="font-bold text-ink block mb-1">English SMS / Push Warning Text:</label>
                <textarea
                  rows={3}
                  value={customWarningEn}
                  onChange={(e) => setCustomWarningEn(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-hairsoft text-xs focus:outline-none focus:border-flame-500"
                />
              </div>

              <div>
                <label className="font-bold text-ink block mb-1">Analyst Audit Notes:</label>
                <input
                  type="text"
                  placeholder="e.g. Dispatched targeted advisory across high-risk telecom cells"
                  value={analystNotes}
                  onChange={(e) => setAnalystNotes(e.target.value)}
                  className="w-full p-2 rounded-xl border border-hairsoft text-xs focus:outline-none focus:border-flame-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairsoft">
              <button
                onClick={() => setIsWarningModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-hairsoft text-xs font-bold text-ink-muted hover:bg-elev"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAnalystAction('DRAFT_CUSTOMER_WARNING')}
                className="px-4 py-2 rounded-xl bg-flame-500 text-white text-xs font-bold hover:bg-flame-500/90 transition-colors shadow-sm"
              >
                Broadcast Safety Warning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
