'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  MapPin, Play, Pause, RotateCcw, AlertTriangle, ShieldAlert, 
  TrendingUp, Users, Wallet, Radio, Layers, Sparkles, CheckCircle2, 
  XCircle, Send, ArrowRight, Clock, RefreshCw, ExternalLink, ShieldCheck,
  Filter, Eye, FileText
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
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF9F43]/15 text-[#FF9F43] border border-[#FF9F43]/30">EMERGING</span>;
      case 'RISING_CLUSTER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF0000]/15 text-[#FF0000] border border-[#FF0000]/30 animate-pulse">RISING SURGE</span>;
      case 'STABLE_CLUSTER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1B2850]/10 text-[#1B2850] border border-[#1B2850]/20">STABLE</span>;
      case 'DECLINING_CLUSTER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#05A677]/15 text-[#05A677] border border-[#05A677]/30">DECLINING</span>;
      case 'FALSE_CLUSTER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#646B72]/15 text-[#646B72] border border-[#646B72]/30">FALSE CLUSTER</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionSuccess && (
        <div className="bg-[#05A677] text-white px-4 py-3 rounded-[8px] shadow-lg flex items-center justify-between text-xs font-bold animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-white/80 hover:text-white">✕</button>
        </div>
      )}

      {/* Header & Overview */}
      <div className="bg-[#FFFFFF] border border-[#E8EBED] rounded-[10px] p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="p-2 rounded-[6px] bg-[#FF9F43]/15 text-[#FF9F43]">
                <MapPin className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-poppins font-bold text-[#212B36]">
                Community Scam Propagation Intelligence
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FF0000]/10 text-[#FF0000] border border-[#FF0000]/20">
                Outbreak Radar
              </span>
            </div>
            <p className="text-xs text-[#646B72] font-nunito max-w-3xl">
              Real-time detection of coordinated scam patterns spreading across geographic, social, and behavioral clusters.
              Time-based diffusion modeling with coarse spatial units protects customer privacy while preventing fraud contagion.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunDemo}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#1B2850] text-white text-xs font-bold font-nunito hover:bg-[#1B2850]/90 transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FF9F43]" />
              Run 5-Day Outbreak Demo
            </button>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 rounded-[6px] border border-[#E8EBED] hover:bg-[#F7F7F7] text-[#646B72] transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Coarse Spatial Disclaimer Banner */}
        <div className="mt-4 p-3 rounded-[8px] bg-[#F7F7F7] border border-[#E8EBED] flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#05A677] shrink-0 mt-0.5" />
          <p className="text-[11px] font-nunito text-[#646B72]">
            <strong className="text-[#212B36]">Non-Discriminatory Spatial Context:</strong> Location data is strictly coarse (division &amp; coarse synthetic cells) and contextual. Upay Shield never infers individual guilt or increases risk based on geographic origin alone.
          </p>
        </div>
      </div>

      {/* Time Animation & Playback Controller */}
      <div className="bg-[#FFFFFF] border border-[#E8EBED] rounded-[10px] p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-4 py-2 rounded-[6px] text-xs font-bold font-nunito transition-colors shadow-sm ${
                isPlaying ? 'bg-[#FF9F43] text-white' : 'bg-[#1B2850] text-white hover:bg-[#1B2850]/90'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause Timeline' : 'Play Spread Animation'}</span>
            </button>

            <button
              onClick={() => { setIsPlaying(false); setCurrentDayIndex(1); }}
              className="p-2 rounded-[6px] border border-[#E8EBED] text-[#646B72] hover:bg-[#F7F7F7] text-xs font-bold"
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
                className={`px-3 py-1.5 rounded-[6px] text-xs font-mono font-bold transition-colors ${
                  currentDayIndex === day
                    ? 'bg-[#FF9F43] text-white shadow-sm'
                    : 'bg-[#F7F7F7] text-[#646B72] hover:bg-[#E8EBED]'
                }`}
              >
                Day {day} {day === 5 ? '(Now)' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Metrics Bar */}
        {currentSnapshot && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#E8EBED]">
            <div className="p-3 bg-[#F7F7F7] rounded-[6px]">
              <span className="text-[10px] text-[#A0AEC0] uppercase font-bold block">Current Snapshot</span>
              <span className="text-base font-bold font-mono text-[#212B36]">{currentSnapshot.day_label}</span>
              <span className="text-[10px] text-[#646B72] block">{currentSnapshot.date_str}</span>
            </div>
            <div className="p-3 bg-[#F7F7F7] rounded-[6px]">
              <span className="text-[10px] text-[#A0AEC0] uppercase font-bold block">Total Outbreak Cases</span>
              <span className="text-base font-bold font-mono text-[#FF9F43]">{currentSnapshot.total_cases}</span>
              <span className="text-[10px] text-[#646B72] block">{currentSnapshot.active_clusters_count} active regions</span>
            </div>
            <div className="p-3 bg-[#F7F7F7] rounded-[6px]">
              <span className="text-[10px] text-[#A0AEC0] uppercase font-bold block">Unique Victims</span>
              <span className="text-base font-bold font-mono text-[#FF0000]">{currentSnapshot.total_victims}</span>
              <span className="text-[10px] text-[#646B72] block">{currentSnapshot.growth_rate}x velocity</span>
            </div>
            <div className="p-3 bg-[#F7F7F7] rounded-[6px]">
              <span className="text-[10px] text-[#A0AEC0] uppercase font-bold block">Potential Exposure</span>
              <span className="text-base font-bold font-mono text-[#1B2850]">৳{currentSnapshot.total_exposure_bdt.toLocaleString()}</span>
              <span className="text-[10px] text-[#05A677] font-bold block">Pre-emptive Guard</span>
            </div>
          </div>
        )}

        {/* Key Events for the Day */}
        {currentSnapshot && currentSnapshot.key_events.length > 0 && (
          <div className="p-3 rounded-[6px] bg-[#FFF4E8]/60 border border-[#FF9F43]/20 space-y-1">
            <span className="text-[11px] font-bold text-[#FF9F43] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Timeline Events ({currentSnapshot.day_label}):
            </span>
            <ul className="text-xs font-nunito text-[#212B36] space-y-0.5 list-disc list-inside">
              {currentSnapshot.key_events.map((evt, idx) => (
                <li key={idx}>{evt}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Active Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8EBED] pb-2">
        <button
          onClick={() => setActiveTab('spread_map')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[6px] text-xs font-bold font-nunito transition-colors ${
            activeTab === 'spread_map'
              ? 'bg-[#FF9F43] text-white shadow-sm'
              : 'text-[#646B72] hover:bg-[#F7F7F7]'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Scam Spread Map ({currentSnapshot?.regions.length || 0} Clusters)</span>
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[6px] text-xs font-bold font-nunito transition-colors ${
            activeTab === 'alerts'
              ? 'bg-[#FF9F43] text-white shadow-sm'
              : 'text-[#646B72] hover:bg-[#F7F7F7]'
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
                  className={`p-4 rounded-[10px] border transition-all cursor-pointer bg-[#FFFFFF] ${
                    selectedRegion?.region_id === region.region_id
                      ? 'border-[#FF9F43] ring-2 ring-[#FF9F43]/20 shadow-md'
                      : 'border-[#E8EBED] hover:border-[#A0AEC0] shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-[#212B36]">{region.division}</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#1B2850]/10 text-[#1B2850] text-[9px] font-mono font-bold">
                          {region.coarse_geo_cell}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#646B72]">{region.district_name}</p>
                    </div>
                    {getStatusBadge(region.cluster_status)}
                  </div>

                  <div className="grid grid-cols-3 gap-2 my-3 p-2 rounded-[6px] bg-[#F7F7F7]">
                    <div>
                      <span className="text-[9px] text-[#A0AEC0] uppercase font-bold block">Cases</span>
                      <span className="text-sm font-bold font-mono text-[#212B36]">{region.cases}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#A0AEC0] uppercase font-bold block">Growth</span>
                      <span className={`text-sm font-bold font-mono ${region.growth_pct > 0 ? 'text-[#FF0000]' : 'text-[#05A677]'}`}>
                        {region.growth_pct > 0 ? `+${region.growth_pct}%` : '0%'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#A0AEC0] uppercase font-bold block">Victims</span>
                      <span className="text-sm font-bold font-mono text-[#FF9F43]">{region.affected_customer_count}</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-[#646B72]">
                      <span>Top Typology:</span>
                      <span className="font-bold text-[#212B36] truncate max-w-[160px]">{region.top_typology_name}</span>
                    </div>
                    {region.linked_campaign_name && (
                      <div className="flex items-center justify-between text-[#646B72]">
                        <span>Campaign:</span>
                        <span className="font-mono text-[#FF9F43] font-bold truncate max-w-[160px]">{region.linked_campaign_name}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[#646B72]">
                      <span>Exposure:</span>
                      <span className="font-mono font-bold text-[#1B2850]">৳{region.total_exposure_bdt.toLocaleString()}</span>
                    </div>
                  </div>

                  {region.linked_wallets.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-[#E8EBED] flex items-center gap-1.5 overflow-x-auto">
                      <span className="text-[10px] text-[#A0AEC0] font-bold">Wallets:</span>
                      {region.linked_wallets.map(w => (
                        <span key={w} className="px-1.5 py-0.5 rounded bg-[#1B2850]/5 text-[#1B2850] text-[9px] font-mono">
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
          <div className="bg-[#FFFFFF] border border-[#E8EBED] rounded-[10px] p-5 shadow-sm space-y-4 h-fit">
            <h3 className="text-xs font-bold text-[#212B36] uppercase tracking-wider border-b border-[#E8EBED] pb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#FF9F43]" />
              {selectedRegion ? `Cluster Inspection: ${selectedRegion.division}` : 'Select a Cluster to Inspect'}
            </h3>

            {selectedRegion ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#212B36]">{selectedRegion.district_name}</h4>
                    <span className="text-xs text-[#646B72] font-mono">{selectedRegion.coarse_geo_cell}</span>
                  </div>
                  {getStatusBadge(selectedRegion.cluster_status)}
                </div>

                <div className="p-3 rounded-[6px] bg-[#F7F7F7] space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#646B72]">Cluster Status:</span>
                    <span className="font-mono font-bold text-[#212B36]">{selectedRegion.cluster_status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#646B72]">Total Incidents:</span>
                    <span className="font-mono font-bold text-[#212B36]">{selectedRegion.cases}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#646B72]">Unique Victims:</span>
                    <span className="font-mono font-bold text-[#FF9F43]">{selectedRegion.affected_customer_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#646B72]">Estimated Exposure:</span>
                    <span className="font-mono font-bold text-[#1B2850]">৳{selectedRegion.total_exposure_bdt.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-[#212B36] block">Linked Wallets ({selectedRegion.linked_wallets.length})</span>
                  <div className="space-y-1">
                    {selectedRegion.linked_wallets.map(w => (
                      <div key={w} className="flex items-center justify-between p-2 rounded bg-[#F7F7F7] text-xs font-mono">
                        <span>{w}</span>
                        <span className="text-[10px] text-[#FF0000] font-bold">Ring-12 Link</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedRegion.linked_campaign_id && (
                  <Link
                    href="/campaigns"
                    className="w-full flex items-center justify-center gap-1.5 p-2 rounded-[6px] bg-[#FFF4E8] text-[#FF9F43] text-xs font-bold hover:bg-[#FF9F43] hover:text-white transition-colors"
                  >
                    <span>View Campaign in Intelligence Hub</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#A0AEC0]">
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
            <h3 className="text-xs font-bold text-[#212B36] uppercase tracking-wider">
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
                className={`p-4 rounded-[10px] border transition-all cursor-pointer bg-[#FFFFFF] ${
                  selectedAlert?.alert_id === alert.alert_id
                    ? 'border-[#FF9F43] ring-2 ring-[#FF9F43]/20 shadow-md'
                    : 'border-[#E8EBED] hover:border-[#A0AEC0] shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-bold font-mono text-[#212B36] block">{alert.alert_id}</span>
                    <span className="text-[11px] font-bold text-[#FF9F43]">{alert.campaign_name}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF0000]/15 text-[#FF0000] animate-pulse">
                    {alert.growth_label}
                  </span>
                </div>

                <div className="text-[11px] text-[#646B72] space-y-1">
                  <div>Typology: <strong className="text-[#212B36]">{alert.top_typology_name}</strong></div>
                  <div>Status: <strong className="text-[#1B2850]">{alert.status}</strong></div>
                  <div>Affected: {alert.affected_regions.join(', ')}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Alert Triage & Action Console */}
          {selectedAlert && (
            <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E8EBED] rounded-[10px] p-5 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E8EBED]">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-[#FF0000]" />
                    <h3 className="text-base font-bold text-[#212B36] font-poppins">{selectedAlert.alert_id}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF0000]/10 text-[#FF0000]">
                      {selectedAlert.growth_label}
                    </span>
                  </div>
                  <span className="text-xs text-[#646B72]">{selectedAlert.campaign_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#646B72]">Status:</span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-[#1B2850]/10 text-[#1B2850]">
                    {selectedAlert.status}
                  </span>
                </div>
              </div>

              {/* Propagation Features Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#F7F7F7] rounded-[6px]">
                  <span className="text-[10px] text-[#A0AEC0] uppercase font-bold block">New Cases / Day</span>
                  <span className="text-sm font-bold font-mono text-[#212B36]">{selectedAlert.features.new_cases_per_day}</span>
                </div>
                <div className="p-3 bg-[#F7F7F7] rounded-[6px]">
                  <span className="text-[10px] text-[#A0AEC0] uppercase font-bold block">Common Phrase Rate</span>
                  <span className="text-sm font-bold font-mono text-[#05A677]">{(selectedAlert.features.common_phrase_rate * 100).toFixed(0)}%</span>
                </div>
                <div className="p-3 bg-[#F7F7F7] rounded-[6px]">
                  <span className="text-[10px] text-[#A0AEC0] uppercase font-bold block">Recipient Overlap</span>
                  <span className="text-sm font-bold font-mono text-[#FF9F43]">{(selectedAlert.features.common_recipient_rate * 100).toFixed(0)}%</span>
                </div>
                <div className="p-3 bg-[#F7F7F7] rounded-[6px]">
                  <span className="text-[10px] text-[#A0AEC0] uppercase font-bold block">Campaign Link</span>
                  <span className="text-sm font-bold font-mono text-[#1B2850]">{(selectedAlert.features.campaign_overlap * 100).toFixed(0)}% Match</span>
                </div>
              </div>

              {/* Evidence Bundle */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#212B36] uppercase tracking-wider">Multi-Modal Evidence Bundle</h4>
                
                {/* Phrases */}
                <div className="p-3 rounded-[6px] bg-[#F7F7F7] space-y-1.5">
                  <span className="text-[11px] font-bold text-[#646B72] block">Shared Scam Script Tokens (Phonetic &amp; Normalized):</span>
                  {selectedAlert.evidence.common_phrases.map((phrase, idx) => (
                    <div key={idx} className="p-2 bg-white rounded border border-[#E8EBED] text-xs font-mono text-[#212B36]">
                      &quot;{phrase}&quot;
                    </div>
                  ))}
                </div>

                {/* Wallets and Numbers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-[6px] bg-[#F7F7F7] space-y-1">
                    <span className="text-[11px] font-bold text-[#646B72] block">Shared Destination Wallets:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAlert.evidence.shared_destination_wallets.map(w => (
                        <span key={w} className="px-2 py-0.5 rounded bg-white border border-[#E8EBED] text-xs font-mono font-bold text-[#FF0000]">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-[6px] bg-[#F7F7F7] space-y-1">
                    <span className="text-[11px] font-bold text-[#646B72] block">Reported Originating Numbers:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAlert.evidence.reported_caller_numbers.map(n => (
                        <span key={n} className="px-2 py-0.5 rounded bg-white border border-[#E8EBED] text-xs font-mono text-[#1B2850]">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pre-Drafted Customer Advisory Banner */}
              <div className="p-4 rounded-[8px] bg-[#FFF4E8] border border-[#FF9F43]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#FF9F43] flex items-center gap-1.5">
                    <Radio className="w-4 h-4" /> Targeted Customer Safety Warning Draft
                  </span>
                  <button
                    onClick={() => setIsWarningModalOpen(true)}
                    className="text-[11px] font-bold text-[#1B2850] hover:underline"
                  >
                    Customize Broadcast
                  </button>
                </div>
                <p className="text-xs font-bengali text-[#212B36]">{selectedAlert.customer_warning_draft_bn}</p>
                <p className="text-[11px] font-nunito text-[#646B72]">{selectedAlert.customer_warning_draft_en}</p>
              </div>

              {/* Analyst Action Buttons */}
              <div className="pt-3 border-t border-[#E8EBED] space-y-3">
                <span className="text-xs font-bold text-[#212B36] uppercase tracking-wider block">Execute Analyst Mitigation Action:</span>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleAnalystAction('REVIEW')}
                    className="px-3.5 py-2 rounded-[6px] bg-[#1B2850] text-white text-xs font-bold hover:bg-[#1B2850]/90 transition-colors"
                  >
                    Acknowledge &amp; Review
                  </button>

                  <button
                    onClick={() => setIsWarningModalOpen(true)}
                    className="px-3.5 py-2 rounded-[6px] bg-[#FF9F43] text-white text-xs font-bold hover:bg-[#FF9F43]/90 transition-colors shadow-sm"
                  >
                    Broadcast Customer Warning
                  </button>

                  <button
                    onClick={() => handleAnalystAction('LINK_TO_SCAM_RADAR')}
                    className="px-3.5 py-2 rounded-[6px] bg-[#05A677] text-white text-xs font-bold hover:bg-[#05A677]/90 transition-colors"
                  >
                    Push to Scam Radar (M6)
                  </button>

                  <Link
                    href="/campaigns"
                    className="px-3.5 py-2 rounded-[6px] border border-[#E8EBED] text-[#646B72] hover:bg-[#F7F7F7] text-xs font-bold flex items-center gap-1"
                  >
                    <span>View Campaign Hub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => handleAnalystAction('MARK_FALSE_CLUSTER')}
                    className="px-3.5 py-2 rounded-[6px] bg-white border border-[#FF0000]/30 text-[#FF0000] text-xs font-bold hover:bg-[#FF0000]/5 transition-colors"
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
          <div className="bg-[#FFFFFF] rounded-[10px] max-w-xl w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-[#E8EBED] pb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#FF9F43]" />
                <h3 className="text-base font-bold font-poppins text-[#212B36]">
                  Draft Targeted Customer Warning Broadcast
                </h3>
              </div>
              <button onClick={() => setIsWarningModalOpen(false)} className="text-[#646B72] hover:text-[#212B36]">✕</button>
            </div>

            <div className="space-y-3 text-xs font-nunito">
              <div>
                <label className="font-bold text-[#212B36] block mb-1">Target Geographic Coarse Regions:</label>
                <div className="p-2 rounded bg-[#F7F7F7] font-mono text-[#1B2850]">
                  {selectedAlert.affected_regions.join(' • ')}
                </div>
              </div>

              <div>
                <label className="font-bold text-[#212B36] block mb-1">Bangla SMS / Push Warning Text:</label>
                <textarea
                  rows={3}
                  value={customWarningBn}
                  onChange={(e) => setCustomWarningBn(e.target.value)}
                  className="w-full p-2.5 rounded-[6px] border border-[#E8EBED] text-xs font-bengali focus:outline-none focus:border-[#FF9F43]"
                />
              </div>

              <div>
                <label className="font-bold text-[#212B36] block mb-1">English SMS / Push Warning Text:</label>
                <textarea
                  rows={3}
                  value={customWarningEn}
                  onChange={(e) => setCustomWarningEn(e.target.value)}
                  className="w-full p-2.5 rounded-[6px] border border-[#E8EBED] text-xs focus:outline-none focus:border-[#FF9F43]"
                />
              </div>

              <div>
                <label className="font-bold text-[#212B36] block mb-1">Analyst Audit Notes:</label>
                <input
                  type="text"
                  placeholder="e.g. Dispatched targeted advisory across high-risk telecom cells"
                  value={analystNotes}
                  onChange={(e) => setAnalystNotes(e.target.value)}
                  className="w-full p-2 rounded-[6px] border border-[#E8EBED] text-xs focus:outline-none focus:border-[#FF9F43]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8EBED]">
              <button
                onClick={() => setIsWarningModalOpen(false)}
                className="px-4 py-2 rounded-[6px] border border-[#E8EBED] text-xs font-bold text-[#646B72] hover:bg-[#F7F7F7]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAnalystAction('DRAFT_CUSTOMER_WARNING')}
                className="px-4 py-2 rounded-[6px] bg-[#FF9F43] text-white text-xs font-bold hover:bg-[#FF9F43]/90 transition-colors shadow-sm"
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
