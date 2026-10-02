'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, ShieldAlert, AlertTriangle, Clock, CheckCircle2, 
  ExternalLink, Sparkles, Filter, Search, Phone, 
  Wallet, Building2, Store, ArrowRight, RefreshCw, Send,
  Lock, Eye, EyeOff, ShieldCheck, Link2, Unlink, Layers, Copy, Check, Zap, Play, Plus, X
} from 'lucide-react';
import { 
  StructuredComplaint, ComplaintPriority, ComplaintCategory, 
  ComplaintStatus, ComplaintDuplicateGroup, ExtractedComplaintEntities 
} from '../core/types';

export const ComplaintIntelligence: React.FC = () => {
  const [complaints, setComplaints] = useState<StructuredComplaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<StructuredComplaint | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<ComplaintDuplicateGroup[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filter States
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [unmaskSensitive, setUnmaskSensitive] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // New Complaint Modal States
  const [showNewModal, setShowNewModal] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customReporterName, setCustomReporterName] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [customElapsed, setCustomElapsed] = useState('15');

  // Override Link Modal States
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideType, setOverrideType] = useState<'RING' | 'CAMPAIGN' | 'RECIPIENT' | 'AGENT' | 'MERCHANT'>('RING');
  const [overrideTargetId, setOverrideTargetId] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');

  // Fetch Complaints & Stats
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resComplaints, resStats, resGroups] = await Promise.all([
        fetch('/api/v1/complaints'),
        fetch('/api/v1/complaints/stats'),
        fetch('/api/v1/complaints/duplicate-groups')
      ]);

      const dataC = await resComplaints.json();
      const dataS = await resStats.json();
      const dataG = await resGroups.json();

      if (dataC.complaints) {
        setComplaints(dataC.complaints);
        if (!selectedComplaint && dataC.complaints.length > 0) {
          setSelectedComplaint(dataC.complaints[0]);
        } else if (selectedComplaint) {
          const updated = dataC.complaints.find((c: StructuredComplaint) => c.complaint_id === selectedComplaint.complaint_id);
          if (updated) setSelectedComplaint(updated);
        }
      }
      if (dataS.stats) setStats(dataS.stats);
      if (dataG.groups) setDuplicateGroups(dataG.groups);
    } catch (err) {
      console.error('Error fetching complaint data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Run 5-Complaint Coordinated Scam Demo
  const handleRunDemo = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/complaints/demo-5-scams', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionSuccess('Coordinated 5-Complaint Scam Demo Loaded: Clustered under DUP-GRP-CARE-88 and linked to Ring-003!');
        setTimeout(() => setActionSuccess(null), 5000);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit New Custom Complaint
  const handleProcessCustomComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    try {
      const res = await fetch('/api/v1/complaints/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_text: customText,
          reporter_name: customReporterName || 'Customer Report',
          reporter_phone: customPhone || '01711-002233',
          elapsed_minutes: parseInt(customElapsed) || 15
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowNewModal(false);
        setCustomText('');
        setActionSuccess(`Complaint ${data.complaint.complaint_id} processed through AI pipeline (${data.complaint.priority})!`);
        setTimeout(() => setActionSuccess(null), 5000);
        await fetchData();
        setSelectedComplaint(data.complaint);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger Emergency Hold on Wallet
  const handleEmergencyHold = async () => {
    if (!selectedComplaint || !selectedComplaint.linked_recipient_wallet) return;
    try {
      const res = await fetch(`/api/v1/complaints/${selectedComplaint.complaint_id}/emergency-hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_id: selectedComplaint.linked_recipient_wallet,
          analyst_id: 'ANALYST-101'
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccess(data.message);
        setTimeout(() => setActionSuccess(null), 5000);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Dispatch Customer Advisory SMS
  const handleDispatchAdvisory = async () => {
    if (!selectedComplaint) return;
    try {
      const res = await fetch(`/api/v1/complaints/${selectedComplaint.complaint_id}/dispatch-advisory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedComplaint.reporter_phone || '01711-998822',
          advisory_text: 'উপায় নিরাপত্তা সতর্কতা: আপনার অভিযোগটি নথিভুক্ত করা হয়েছে। কারো প্ররোচনায় ওটিপি বা পিন শেয়ার করবেন না। হেল্পলাইন ১৬২৬৮।',
          analyst_id: 'ANALYST-101'
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccess(data.message);
        setTimeout(() => setActionSuccess(null), 5000);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Override Link
  const handleOverrideLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !overrideTargetId.trim()) return;

    try {
      const res = await fetch(`/api/v1/complaints/${selectedComplaint.complaint_id}/override-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: overrideType,
          target_id: overrideTargetId,
          analyst_id: 'ANALYST-101',
          notes: overrideNotes || 'Analyst verified connection'
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowOverrideModal(false);
        setOverrideTargetId('');
        setOverrideNotes('');
        setActionSuccess(`Link successfully overridden by Analyst to ${overrideTargetId}!`);
        setTimeout(() => setActionSuccess(null), 5000);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper mask function
  const maskSensitive = (val: string) => {
    if (unmaskSensitive || !val) return val;
    if (val.length <= 4) return '***';
    return `${val.slice(0, 4)}***${val.slice(-3)}`;
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filter complaints list
  const filteredComplaints = complaints.filter(c => {
    if (priorityFilter !== 'ALL' && c.priority !== priorityFilter) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = c.raw_text.toLowerCase().includes(q) ||
        (c.reporter_phone && c.reporter_phone.toLowerCase().includes(q)) ||
        (c.linked_recipient_wallet && c.linked_recipient_wallet.toLowerCase().includes(q)) ||
        (c.duplicate_group_id && c.duplicate_group_id.toLowerCase().includes(q)) ||
        c.complaint_id.toLowerCase().includes(q);
      if (!matchText) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="dream-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-[8px] bg-[#FF9F43]/10 text-[#FF9F43]">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-nunito font-extrabold text-[#1B2850]">
                  Complaint-to-Action Intelligence Hub
                </h1>
                <span className="px-2 py-0.5 rounded-[4px] bg-[#28C76F]/15 text-[#28C76F] text-[10px] font-mono font-bold">
                  ACTIVE AI PIPELINE
                </span>
              </div>
              <p className="text-xs text-[#646B72] mt-0.5">
                Transforms customer complaint statements into structured investigation evidence, duplicate clusters, and golden-hour recovery actions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Unmask toggle */}
          <button
            onClick={() => setUnmaskSensitive(!unmaskSensitive)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-xs font-nunito font-bold border transition-colors ${
              unmaskSensitive
                ? 'bg-[#1B2850] text-white border-[#1B2850]'
                : 'bg-white text-[#646B72] border-[#E2E8F0] hover:bg-[#F8F9FA]'
            }`}
            title="Toggle sensitive value masking (phones, wallets)"
          >
            {unmaskSensitive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{unmaskSensitive ? 'Mask Data' : 'Unmask PII'}</span>
          </button>

          {/* Run 5-Complaint Demo */}
          <button
            onClick={handleRunDemo}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-[6px] bg-gradient-to-r from-[#FF9F43] to-[#FF8510] text-white text-xs font-nunito font-bold shadow-sm hover:opacity-95 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Run 5-Complaint Scam Demo</span>
          </button>

          {/* Process New Complaint */}
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-[6px] bg-[#1B2850] text-white text-xs font-nunito font-bold shadow-sm hover:bg-[#121B38] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Complaint</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccess && (
        <div className="p-4 rounded-[6px] bg-[#28C76F]/10 border border-[#28C76F]/20 text-[#28C76F] text-xs font-nunito font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* P1 Active Loss */}
        <div className="dream-card p-4 flex items-center justify-between border-l-4 border-l-[#FF0000]">
          <div>
            <div className="text-[11px] font-bold text-[#646B72] uppercase tracking-wider">P1 Golden-Hour Active</div>
            <div className="text-2xl font-extrabold text-[#FF0000] font-mono mt-1">
              {stats?.p1_active_loss_count ?? 3} Incidents
            </div>
            <div className="text-[10px] text-[#FF0000] mt-0.5 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#FF0000] animate-ping" />
              <span>≤ 120m Recovery Window</span>
            </div>
          </div>
          <div className="p-3 rounded-[8px] bg-[#FF0000]/10 text-[#FF0000]">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Potential Loss Exposure */}
        <div className="dream-card p-4 flex items-center justify-between border-l-4 border-l-[#FF9F43]">
          <div>
            <div className="text-[11px] font-bold text-[#646B72] uppercase tracking-wider">Potential Recoverable Loss</div>
            <div className="text-2xl font-extrabold text-[#1B2850] font-mono mt-1">
              ৳{(stats?.total_potential_exposure_bdt ?? 90500).toLocaleString()}
            </div>
            <div className="text-[10px] text-[#646B72] mt-0.5">Across active complaint queue</div>
          </div>
          <div className="p-3 rounded-[8px] bg-[#FF9F43]/10 text-[#FF9F43]">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Duplicate Clusters */}
        <div className="dream-card p-4 flex items-center justify-between border-l-4 border-l-[#7367F0]">
          <div>
            <div className="text-[11px] font-bold text-[#646B72] uppercase tracking-wider">Duplicate Fraud Clusters</div>
            <div className="text-2xl font-extrabold text-[#7367F0] font-mono mt-1">
              {stats?.duplicate_groups_count ?? 1} Groups
            </div>
            <div className="text-[10px] text-[#7367F0] mt-0.5 font-bold">5 Linked Coordinated Reports</div>
          </div>
          <div className="p-3 rounded-[8px] bg-[#7367F0]/10 text-[#7367F0]">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Auto-Enriched Cases & Rings */}
        <div className="dream-card p-4 flex items-center justify-between border-l-4 border-l-[#28C76F]">
          <div>
            <div className="text-[11px] font-bold text-[#646B72] uppercase tracking-wider">Enriched Rings & Cases</div>
            <div className="text-2xl font-extrabold text-[#28C76F] font-mono mt-1">
              Ring-003 & CAMP-01
            </div>
            <div className="text-[10px] text-[#28C76F] mt-0.5 font-bold">100% Attached Evidence</div>
          </div>
          <div className="p-3 rounded-[8px] bg-[#28C76F]/10 text-[#28C76F]">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Complaints Queue List (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="dream-card p-4 space-y-3">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-[#646B72] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search phone, wallet, text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-[6px] border border-[#E2E8F0] text-xs font-nunito focus:outline-none focus:border-[#FF9F43]"
                />
              </div>

              {/* Priority Select */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full sm:w-auto px-2.5 py-1.5 rounded-[6px] border border-[#E2E8F0] text-xs font-nunito font-bold text-[#1B2850] focus:outline-none focus:border-[#FF9F43]"
              >
                <option value="ALL">All Priorities</option>
                <option value="P1">P1 — Golden Hour</option>
                <option value="P2">P2 — Attempted</option>
                <option value="P3">P3 — Historical</option>
                <option value="P4">P4 — Informational</option>
              </select>
            </div>

            {/* Queue Counter Header */}
            <div className="flex items-center justify-between text-[11px] text-[#646B72] font-bold px-1">
              <span>Showing {filteredComplaints.length} of {complaints.length} Reports</span>
              <button 
                onClick={fetchData}
                className="flex items-center gap-1 text-[#FF9F43] hover:underline"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {/* Complaints Feed List */}
            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {filteredComplaints.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#646B72]">
                  No complaints match the selected filter.
                </div>
              ) : (
                filteredComplaints.map((c) => {
                  const isSelected = selectedComplaint?.complaint_id === c.complaint_id;
                  
                  // Priority Badge Color
                  let pBg = 'bg-[#FF0000]/10 text-[#FF0000] border-[#FF0000]/20';
                  if (c.priority === 'P2') pBg = 'bg-[#FF9F43]/15 text-[#FF9F43] border-[#FF9F43]/30';
                  if (c.priority === 'P3') pBg = 'bg-[#7367F0]/15 text-[#7367F0] border-[#7367F0]/30';
                  if (c.priority === 'P4') pBg = 'bg-[#646B72]/15 text-[#646B72] border-[#646B72]/30';

                  return (
                    <div
                      key={c.complaint_id}
                      onClick={() => setSelectedComplaint(c)}
                      className={`p-3.5 rounded-[8px] border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#FFF8F0] border-[#FF9F43] shadow-sm ring-1 ring-[#FF9F43]/50'
                          : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8F9FA]'
                      }`}
                    >
                      {/* Card Header Row */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold border ${pBg}`}>
                            {c.priority}
                          </span>
                          <span className="font-mono text-xs font-bold text-[#1B2850]">
                            {c.complaint_id}
                          </span>
                        </div>

                        {c.is_golden_hour ? (
                          <span className="px-1.5 py-0.5 rounded-[4px] bg-[#FF0000]/10 text-[#FF0000] text-[10px] font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 animate-spin" />
                            <span>{c.golden_hour_remaining_mins}m left</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#646B72]">
                            {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {/* Complaint Preview Text */}
                      <p className="text-xs text-[#212B36] line-clamp-2 mb-2 font-bangla">
                        {c.raw_text}
                      </p>

                      {/* Bottom Entity Chips Row */}
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] pt-2 border-t border-[#E2E8F0]/60">
                        <div className="flex items-center gap-2">
                          {c.potential_loss_bdt > 0 && (
                            <span className="font-mono font-bold text-[#FF0000]">
                              ৳{c.potential_loss_bdt.toLocaleString()}
                            </span>
                          )}
                          <span className="text-[10px] text-[#646B72] px-1.5 py-0.5 bg-[#F1F5F9] rounded-[4px]">
                            {c.category_label_bn.split(' ')[0]}
                          </span>
                        </div>

                        {c.duplicate_group_id && (
                          <span className="px-1.5 py-0.5 rounded-[4px] bg-[#7367F0]/10 text-[#7367F0] text-[9px] font-mono font-bold flex items-center gap-1">
                            <Layers className="w-2.5 h-2.5" />
                            <span>{c.duplicate_count} Grouped</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Investigation File (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedComplaint ? (
            <div className="space-y-4 animate-fadeIn">
              {/* Main Detail Card */}
              <div className="dream-card p-5 space-y-4">
                {/* Header Information */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg font-nunito font-extrabold text-[#1B2850]">
                        {selectedComplaint.complaint_id}
                      </h2>
                      <span className={`px-2 py-0.5 rounded-[4px] text-xs font-mono font-bold ${
                        selectedComplaint.priority === 'P1'
                          ? 'bg-[#FF0000]/10 text-[#FF0000]'
                          : selectedComplaint.priority === 'P2'
                          ? 'bg-[#FF9F43]/15 text-[#FF9F43]'
                          : 'bg-[#646B72]/15 text-[#646B72]'
                      }`}>
                        Priority {selectedComplaint.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded-[4px] bg-[#28C76F]/10 text-[#28C76F] text-[10px] font-bold">
                        {selectedComplaint.status}
                      </span>
                    </div>

                    <div className="text-xs text-[#646B72] mt-1 flex flex-wrap items-center gap-3">
                      <span>Reporter: <strong className="text-[#1B2850]">{selectedComplaint.reporter_name}</strong></span>
                      <span>Phone: <strong className="font-mono text-[#1B2850]">{maskSensitive(selectedComplaint.reporter_phone || '')}</strong></span>
                      <span>Wallet: <strong className="font-mono text-[#1B2850]">{maskSensitive(selectedComplaint.reporter_wallet || '')}</strong></span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-[#646B72]">Potential Loss</div>
                    <div className="text-xl font-mono font-extrabold text-[#FF0000]">
                      ৳{selectedComplaint.potential_loss_bdt.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Golden-Hour Window Countdown Alert */}
                {selectedComplaint.is_golden_hour && (
                  <div className="p-3.5 rounded-[8px] bg-[#FF0000]/10 border border-[#FF0000]/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-5 h-5 text-[#FF0000] animate-spin" />
                      <div>
                        <div className="text-xs font-nunito font-bold text-[#FF0000]">
                          Golden-Hour Recovery Protocol Active ({selectedComplaint.golden_hour_remaining_mins} minutes remaining)
                        </div>
                        <div className="text-[11px] text-[#646B72]">
                          Stolen funds are currently transiting through mule collector wallet. High probability of full trace & freeze.
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleEmergencyHold}
                      className="px-3 py-1.5 rounded-[6px] bg-[#FF0000] text-white text-xs font-nunito font-bold shadow-sm hover:bg-[#D90000] transition-colors whitespace-nowrap flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Emergency Freeze</span>
                    </button>
                  </div>
                )}

                {/* Priority Reason Explanation */}
                <div className="p-3 rounded-[6px] bg-[#F8F9FA] border border-[#E2E8F0] text-xs">
                  <div className="text-[10px] font-bold text-[#646B72] uppercase tracking-wider mb-0.5">Priority Policy Decision</div>
                  <p className="text-[#212B36] font-medium">{selectedComplaint.priority_reason}</p>
                </div>

                {/* Full Statement & NLP Transcript */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-[#646B72] uppercase tracking-wider">
                    Customer Complaint Statement (Bangla / English)
                  </div>
                  <div className="p-4 rounded-[8px] bg-[#FDFBF7] border border-[#F0E6D2] text-xs font-bangla text-[#1B2850] leading-relaxed">
                    {selectedComplaint.raw_text}
                  </div>
                </div>

                {/* Extracted Structured Entities Grid */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-[#646B72] uppercase tracking-wider">
                    Extracted Synthetic Entities (Click to Copy)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {/* Phone */}
                    <div className="p-2.5 rounded-[6px] bg-[#F8F9FA] border border-[#E2E8F0]">
                      <div className="text-[10px] text-[#646B72] flex items-center gap-1 mb-0.5">
                        <Phone className="w-3 h-3 text-[#FF9F43]" />
                        <span>Scammer Phone</span>
                      </div>
                      <div className="font-mono text-xs font-bold text-[#1B2850] flex items-center justify-between">
                        <span>{maskSensitive(selectedComplaint.extracted_entities.phone_numbers[0] || 'N/A')}</span>
                        {selectedComplaint.extracted_entities.phone_numbers[0] && (
                          <button onClick={() => copyToClipboard(selectedComplaint.extracted_entities.phone_numbers[0], 'phone')} className="text-[#646B72] hover:text-[#1B2850]">
                            {copiedKey === 'phone' ? <Check className="w-3 h-3 text-[#28C76F]" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Destination Wallet */}
                    <div className="p-2.5 rounded-[6px] bg-[#F8F9FA] border border-[#E2E8F0]">
                      <div className="text-[10px] text-[#646B72] flex items-center gap-1 mb-0.5">
                        <Wallet className="w-3 h-3 text-[#7367F0]" />
                        <span>Target Wallet</span>
                      </div>
                      <div className="font-mono text-xs font-bold text-[#1B2850] flex items-center justify-between">
                        <span>{maskSensitive(selectedComplaint.extracted_entities.wallets[0] || selectedComplaint.linked_recipient_wallet || 'N/A')}</span>
                        {selectedComplaint.linked_recipient_wallet && (
                          <button onClick={() => copyToClipboard(selectedComplaint.linked_recipient_wallet!, 'wallet')} className="text-[#646B72] hover:text-[#1B2850]">
                            {copiedKey === 'wallet' ? <Check className="w-3 h-3 text-[#28C76F]" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Agent Outlet */}
                    <div className="p-2.5 rounded-[6px] bg-[#F8F9FA] border border-[#E2E8F0]">
                      <div className="text-[10px] text-[#646B72] flex items-center gap-1 mb-0.5">
                        <Building2 className="w-3 h-3 text-[#28C76F]" />
                        <span>Cash-Out Agent</span>
                      </div>
                      <div className="font-mono text-xs font-bold text-[#1B2850]">
                        {selectedComplaint.extracted_entities.agent_ids[0] || selectedComplaint.linked_agent_id || 'None identified'}
                      </div>
                    </div>

                    {/* Classification */}
                    <div className="p-2.5 rounded-[6px] bg-[#F8F9FA] border border-[#E2E8F0]">
                      <div className="text-[10px] text-[#646B72] mb-0.5">Classification</div>
                      <div className="text-xs font-bold text-[#1B2850] truncate">
                        {selectedComplaint.category_label_en}
                      </div>
                    </div>

                    {/* Typology */}
                    <div className="p-2.5 rounded-[6px] bg-[#F8F9FA] border border-[#E2E8F0]">
                      <div className="text-[10px] text-[#646B72] mb-0.5">Scam Typology</div>
                      <div className="text-xs font-bold text-[#1B2850] truncate">
                        {selectedComplaint.typology_label_bn}
                      </div>
                    </div>

                    {/* Duplicate Cluster */}
                    <div className="p-2.5 rounded-[6px] bg-[#F8F9FA] border border-[#E2E8F0]">
                      <div className="text-[10px] text-[#646B72] mb-0.5">Duplicate Nexus</div>
                      <div className="font-mono text-xs font-bold text-[#7367F0] truncate">
                        {selectedComplaint.duplicate_group_id || 'Unique Incident'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evidence & Case Auto-Enrichment Card */}
                <div className="p-4 rounded-[8px] bg-[#F8F9FA] border border-[#E2E8F0] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-[#FF9F43]" />
                      <span className="text-xs font-nunito font-extrabold text-[#1B2850]">
                        Auto-Enriched Case Evidence & Network Graph Links
                      </span>
                    </div>

                    <button
                      onClick={() => setShowOverrideModal(true)}
                      className="text-[11px] font-nunito font-bold text-[#FF9F43] hover:underline flex items-center gap-1"
                    >
                      <span>Override Links</span>
                    </button>
                  </div>

                  {/* Evidence List */}
                  <div className="space-y-2">
                    {selectedComplaint.evidence_links.length === 0 ? (
                      <div className="text-xs text-[#646B72]">No graph links discovered yet.</div>
                    ) : (
                      selectedComplaint.evidence_links.map((link, idx) => (
                        <div key={idx} className="p-2.5 rounded-[6px] bg-white border border-[#E2E8F0] text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded-[4px] bg-[#1B2850]/10 text-[#1B2850] text-[9px] font-mono font-bold">
                                {link.target_type}
                              </span>
                              <strong className="text-[#1B2850]">{link.target_label}</strong>
                              {link.is_analyst_override && (
                                <span className="px-1.5 py-0.5 rounded-[4px] bg-[#7367F0]/15 text-[#7367F0] text-[9px] font-bold">
                                  Analyst Overridden
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] font-bold text-[#28C76F]">
                              {Math.round(link.confidence * 100)}% Match
                            </span>
                          </div>
                          <p className="text-[#646B72] text-[11px] leading-relaxed">
                            {link.evidence_text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Action Buttons Toolbar */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E2E8F0]">
                  <button
                    onClick={handleEmergencyHold}
                    className="px-3 py-1.5 rounded-[6px] bg-[#FF0000] text-white text-xs font-nunito font-bold shadow-sm hover:bg-[#D90000] transition-colors flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Freeze Destination Wallet</span>
                  </button>

                  <button
                    onClick={handleDispatchAdvisory}
                    className="px-3 py-1.5 rounded-[6px] bg-[#FF9F43] text-white text-xs font-nunito font-bold shadow-sm hover:bg-[#E68A30] transition-colors flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch SMS Advisory</span>
                  </button>

                  <button
                    onClick={() => setShowOverrideModal(true)}
                    className="px-3 py-1.5 rounded-[6px] bg-[#1B2850] text-white text-xs font-nunito font-bold shadow-sm hover:bg-[#121B38] transition-colors flex items-center gap-1.5"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Re-assign / Override Case</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="dream-card p-12 text-center text-xs text-[#646B72]">
              Select a complaint from the queue on the left to view evidence and triage actions.
            </div>
          )}
        </div>
      </div>

      {/* New Complaint Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="dream-card w-full max-w-lg p-6 space-y-4 bg-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-base font-nunito font-extrabold text-[#1B2850]">
                Process New Customer Complaint
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-[#646B72] hover:text-[#1B2850]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProcessCustomComplaint} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1B2850] mb-1">
                  Customer Statement (Bangla / English / Banglish) *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="যেমন: আমাকে ০১৭১১-৯৯৮৮২২ থেকে কল করে বললো উপায় হেড অফিস থেকে। ভেরিফিকেশনের জন্য ৳২৫,০০০ W-SYN-৮৮১৯২০ তে পাঠাতে বলে..."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="w-full p-2.5 rounded-[6px] border border-[#E2E8F0] text-xs font-bangla focus:outline-none focus:border-[#FF9F43]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#1B2850] mb-1">Customer Name</label>
                  <input
                    type="text"
                    placeholder="আব্দুল করিম"
                    value={customReporterName}
                    onChange={(e) => setCustomReporterName(e.target.value)}
                    className="w-full p-2 rounded-[6px] border border-[#E2E8F0] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#1B2850] mb-1">Customer Phone</label>
                  <input
                    type="text"
                    placeholder="01812-445566"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    className="w-full p-2 rounded-[6px] border border-[#E2E8F0] text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1B2850] mb-1">Elapsed Time (Minutes ago)</label>
                <select
                  value={customElapsed}
                  onChange={(e) => setCustomElapsed(e.target.value)}
                  className="w-full p-2 rounded-[6px] border border-[#E2E8F0] text-xs font-bold text-[#1B2850]"
                >
                  <option value="10">10 mins ago (P1 Golden-Hour)</option>
                  <option value="35">35 mins ago (P1 Golden-Hour)</option>
                  <option value="90">90 mins ago (P1 Golden-Hour)</option>
                  <option value="180">3 hours ago (Post Golden-Hour)</option>
                  <option value="2160">36 hours ago (P3 Historical)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-[6px] border border-[#E2E8F0] text-xs font-bold text-[#646B72]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[6px] bg-[#FF9F43] text-white text-xs font-bold shadow-sm hover:bg-[#E68A30] flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Execute AI Pipeline</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Override Link Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="dream-card w-full max-w-md p-6 space-y-4 bg-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-base font-nunito font-extrabold text-[#1B2850]">
                Analyst Override Case Link
              </h3>
              <button onClick={() => setShowOverrideModal(false)} className="text-[#646B72] hover:text-[#1B2850]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOverrideLink} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1B2850] mb-1">Target Entity Type</label>
                <select
                  value={overrideType}
                  onChange={(e: any) => setOverrideType(e.target.value)}
                  className="w-full p-2 rounded-[6px] border border-[#E2E8F0] text-xs font-bold text-[#1B2850]"
                >
                  <option value="RING">Mule Ring (e.g. RING-003, RING-012)</option>
                  <option value="CAMPAIGN">Scam Campaign (e.g. CAMP-FAKE-CARE)</option>
                  <option value="RECIPIENT">Destination Mule Wallet</option>
                  <option value="AGENT">Cash-Out Agent Outlet</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B2850] mb-1">Target Identifier *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RING-012 or W-SYN-881920"
                  value={overrideTargetId}
                  onChange={(e) => setOverrideTargetId(e.target.value)}
                  className="w-full p-2 rounded-[6px] border border-[#E2E8F0] text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B2850] mb-1">Analyst Notes</label>
                <textarea
                  rows={2}
                  placeholder="Reason for manual override..."
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  className="w-full p-2 rounded-[6px] border border-[#E2E8F0] text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 rounded-[6px] border border-[#E2E8F0] text-xs font-bold text-[#646B72]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[6px] bg-[#1B2850] text-white text-xs font-bold shadow-sm hover:bg-[#121B38]"
                >
                  Confirm Override & Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
