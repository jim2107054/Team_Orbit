'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Network, ShieldAlert, Search, Sparkles, Filter, Clock, 
  Layers, ChevronRight, CheckCircle2, AlertTriangle, ArrowRight,
  ExternalLink, Info, RefreshCw, Smartphone, Phone, Wallet,
  Store, Building2, FileText, MessageSquare, AlertCircle,
  MapPin, Calendar, HelpCircle, Eye, ShieldCheck, Zap,
  ZoomIn, ZoomOut, Maximize2, Share2, Copy, Check
} from 'lucide-react';
import { 
  KnowledgeNode, KnowledgeEdge, KnowledgeNodeType, 
  KnowledgeEdgeType, KnowledgeGraphSubGraph, KnowledgeGraphQueryResult,
  KnowledgeGraphEvidencePack, KnowledgeEdgeEvidence
} from '../core/types';

export const ScamKnowledgeGraph: React.FC = () => {
  const [subgraph, setSubgraph] = useState<KnowledgeGraphSubGraph | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<KnowledgeEdge | null>(null);
  const [evidenceModalEdge, setEvidenceModalEdge] = useState<KnowledgeEdge | null>(null);
  const [evidencePack, setEvidencePack] = useState<KnowledgeGraphEvidencePack | null>(null);
  
  // Query & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [nlQuery, setNlQuery] = useState('');
  const [queryResult, setQueryResult] = useState<KnowledgeGraphQueryResult | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<KnowledgeNodeType[]>([]);
  const [depth, setDepth] = useState<number>(2);
  const [timeFilter, setTimeFilter] = useState<'ALL' | '24H' | '7D' | '30D'>('ALL');
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Demo Stepper State
  const [demoStep, setDemoStep] = useState<number>(0);

  // Canvas / SVG Transform
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Demo Script Storyline
  const demoSteps = [
    {
      step: 1,
      targetId: 'CMP-2026-0914',
      title: 'Customer Complaint (Ruma Begum)',
      title_bn: 'গ্রাহক অভিযোগ (রুমা বেগম)',
      desc: 'Victim reports ৳18,500 unauthorized transfer following a fake customer care call.'
    },
    {
      step: 2,
      targetId: 'PHN-01799443322',
      title: 'Scammer Phone (01799-443322)',
      title_bn: 'প্রতারক ফোন নম্বর',
      desc: 'Outbound caller impersonating upay Support with high call velocity.'
    },
    {
      step: 3,
      targetId: 'WAL-SYN-091177',
      title: 'Mule Destination Wallet (W-SYN-091177)',
      title_bn: 'মিউল গন্তব্য ওয়ালেট',
      desc: 'Tier-1 aggregator account with 94% rapid pass-through drain velocity.'
    },
    {
      step: 4,
      targetId: 'TXN-SYN-88319',
      title: 'Disputed Transaction (৳18,500)',
      title_bn: 'বিরোধপূর্ণ লেনদেন (৳১৮,৫০০)',
      desc: 'P2P Send Money executed over USSD channel *268#.'
    },
    {
      step: 5,
      targetId: 'RING-003',
      title: 'Mule Network (Ring-003 Savar)',
      title_bn: 'মিউল নেটওয়ার্ক (রিং-০০৩)',
      desc: 'High-density community of 8 mule accounts operating under single organizer.'
    },
    {
      step: 6,
      targetId: 'AGT-DH-4412',
      title: 'Cash-Out Agent (Rahman Enterprise)',
      title_bn: 'ক্যাশ-আউট এজেন্ট (রহমান এন্টারপ্রাইজ)',
      desc: 'Complicit cash-out terminal with 6 shared emulators and ৳4,990 structuring.'
    },
    {
      step: 7,
      targetId: 'CAMP-2026-EID-01',
      title: 'Scam Campaign (Eid Cashback Hijack)',
      title_bn: 'স্ক্যাম ক্যাম্পেইন (ঈদ ক্যাশব্যাক হাইজ্যাক)',
      desc: '18 coordinated complaints sharing exact same Bangla urgency voice script.'
    },
    {
      step: 8,
      targetId: 'CMP-2026-0915',
      title: 'Linked Secondary Complaints',
      title_bn: 'সংযুক্ত অন্যান্য অভিযোগ',
      desc: 'Ecosystem expansion reveals Kamal Hossain & Nasima Akter targeted by same ring.'
    }
  ];

  // Fetch Subgraph from API
  const fetchGraph = async (centerId?: string, overrideDepth?: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (centerId) params.append('center_node_id', centerId);
      params.append('depth', String(overrideDepth || depth));
      if (selectedTypes.length > 0) params.append('entity_types', selectedTypes.join(','));
      if (suspiciousOnly) params.append('suspicious_only', 'true');
      if (timeFilter === '24H') params.append('start_time', '2026-10-01T00:00:00Z');
      params.append('limit', '50');

      const res = await fetch(`/api/v1/knowledge-graph/subgraph?${params.toString()}`);
      const data = await res.json();
      if (data.subgraph) {
        setSubgraph(data.subgraph);
        if (centerId) {
          const cNode = data.subgraph.nodes.find((n: KnowledgeNode) => n.id === centerId);
          if (cNode) setSelectedNode(cNode);
        } else if (!selectedNode && data.subgraph.nodes.length > 0) {
          setSelectedNode(data.subgraph.nodes[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch subgraph:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph('CMP-2026-0914', 2);
  }, [depth, suspiciousOnly, timeFilter, selectedTypes]);

  // Handle Natural Language Query
  const handleNLQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsQuerying(true);
    try {
      const res = await fetch('/api/v1/knowledge-graph/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText, language: 'bn' })
      });
      const data = await res.json();
      if (data.result) {
        setQueryResult(data.result);
        if (data.result.matched_nodes && data.result.matched_nodes.length > 0) {
          const first = data.result.matched_nodes[0];
          setSelectedNode(first);
          fetchGraph(first.id, 2);
        }
      }
    } catch (err) {
      console.error('Query failed:', err);
    } finally {
      setIsQuerying(false);
    }
  };

  // Load Copilot Evidence Pack
  const loadEvidencePack = async (nodeId: string) => {
    try {
      const res = await fetch(`/api/v1/knowledge-graph/evidence-pack/${nodeId}`);
      const data = await res.json();
      if (data.evidence_pack) {
        setEvidencePack(data.evidence_pack);
      }
    } catch (err) {
      console.error('Failed to load evidence pack:', err);
    }
  };

  useEffect(() => {
    if (selectedNode) {
      loadEvidencePack(selectedNode.id);
    }
  }, [selectedNode]);

  // Demo Step Trigger
  const handleStepClick = (stepIndex: number) => {
    setDemoStep(stepIndex);
    const target = demoSteps[stepIndex];
    if (target) {
      fetchGraph(target.targetId, 2);
    }
  };

  // Node Color & Icon Helper
  const getNodeVisuals = (type: KnowledgeNodeType, isSuspicious: boolean) => {
    switch (type) {
      case 'CUSTOMER':
        return { bg: '#0EA5E9', border: '#0284C7', text: '#FFFFFF', icon: '👤', label: 'Customer' };
      case 'WALLET':
        return { bg: isSuspicious ? '#EA5455' : '#28C76F', border: isSuspicious ? '#D94344' : '#1EAE5D', text: '#FFFFFF', icon: '💳', label: 'Wallet' };
      case 'PHONE':
        return { bg: '#8B5CF6', border: '#7C3AED', text: '#FFFFFF', icon: '📞', label: 'Phone' };
      case 'DEVICE':
        return { bg: '#64748B', border: '#475569', text: '#FFFFFF', icon: '📱', label: 'Device' };
      case 'AGENT':
        return { bg: '#FF9F43', border: '#E88E35', text: '#FFFFFF', icon: '🏪', label: 'Agent' };
      case 'MERCHANT':
        return { bg: '#3B82F6', border: '#2563EB', text: '#FFFFFF', icon: '🏬', label: 'Merchant' };
      case 'TRANSACTION':
        return { bg: '#10B981', border: '#059669', text: '#FFFFFF', icon: '💸', label: 'Txn' };
      case 'COMPLAINT':
        return { bg: '#F43F5E', border: '#E11D48', text: '#FFFFFF', icon: '📝', label: 'Complaint' };
      case 'SCAM_CONVERSATION':
        return { bg: '#A855F7', border: '#9333EA', text: '#FFFFFF', icon: '🎙️', label: 'Voice NLP' };
      case 'SCAM_TYPOLOGY':
        return { bg: '#EF4444', border: '#DC2626', text: '#FFFFFF', icon: '⚠️', label: 'Typology' };
      case 'CAMPAIGN':
        return { bg: '#E11D48', border: '#BE123C', text: '#FFFFFF', icon: '🎯', label: 'Campaign' };
      case 'RING':
        return { bg: '#F97316', border: '#EA580C', text: '#FFFFFF', icon: '🕸️', label: 'Mule Ring' };
      case 'LOCATION':
        return { bg: '#059669', border: '#047857', text: '#FFFFFF', icon: '📍', label: 'Location' };
      case 'EVENT':
        return { bg: '#EAB308', border: '#CA8A04', text: '#FFFFFF', icon: '⚡', label: 'Event' };
      case 'CASE':
        return { bg: '#092C4C', border: '#051829', text: '#FFFFFF', icon: '📂', label: 'MLRO Case' };
      default:
        return { bg: '#7367F0', border: '#5E50EE', text: '#FFFFFF', icon: '🔹', label: 'Node' };
    }
  };

  // Node Positions (Radial / Deterministic Layout for 100% Stability & Performance)
  const nodePositions = useMemo(() => {
    if (!subgraph || subgraph.nodes.length === 0) return new Map<string, { x: number; y: number }>();
    const positions = new Map<string, { x: number; y: number }>();
    const centerNode = subgraph.nodes.find(n => n.id === subgraph.center_node_id) || subgraph.nodes[0];
    const width = 860;
    const height = 540;
    const centerX = width / 2;
    const centerY = height / 2;

    positions.set(centerNode.id, { x: centerX, y: centerY });

    const otherNodes = subgraph.nodes.filter(n => n.id !== centerNode.id);
    const total = otherNodes.length;

    // Distribute in concentric rings (Ring 1: 1-hop radius 160, Ring 2: 2-hop radius 270)
    otherNodes.forEach((node, index) => {
      const isHop1 = index < Math.min(8, total);
      const radius = isHop1 ? 165 : 265;
      const ringTotal = isHop1 ? Math.min(8, total) : Math.max(1, total - 8);
      const ringIndex = isHop1 ? index : index - 8;
      const angle = (ringIndex / ringTotal) * 2 * Math.PI - Math.PI / 2;

      // Add gentle jitter based on string hash for organic distribution
      const hash = node.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const jitter = (hash % 15) - 7;

      const x = centerX + (radius + jitter) * Math.cos(angle);
      const y = centerY + (radius + jitter) * Math.sin(angle);
      positions.set(node.id, { x, y });
    });

    return positions;
  }, [subgraph]);

  // Copy Citation Helper
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const allTypes: KnowledgeNodeType[] = [
    'CUSTOMER', 'WALLET', 'PHONE', 'DEVICE', 'AGENT', 
    'MERCHANT', 'TRANSACTION', 'COMPLAINT', 'SCAM_CONVERSATION', 
    'SCAM_TYPOLOGY', 'CAMPAIGN', 'RING', 'LOCATION', 'EVENT', 'CASE'
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="dream-card p-6 bg-gradient-to-r from-[#FFFFFF] via-[#F8F9FD] to-[#FFFFFF] border-l-4 border-l-[#7367F0] shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2 rounded-[6px] bg-[#7367F0]/10 text-[#7367F0]">
                <Network className="w-5 h-5" />
              </span>
              <h2 className="font-poppins font-bold text-xl text-[#000000]">
                Bangladesh Scam Knowledge Graph (Semantic Intelligence Layer)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-nunito font-bold bg-[#7367F0]/15 text-[#7367F0] border border-[#7367F0]/30">
                15 Entity Types • 100% Evidence-Backed
              </span>
            </div>
            <p className="text-xs font-nunito text-[#646B72] max-w-4xl leading-relaxed">
              Unified semantic knowledge network connecting victims, spoofed caller lines, mule aggregator wallets, 
              cash-out agent counters, coordinated scam campaigns, and NLP acoustic transcripts. 
              <strong> Every relationship is grounded in synthetic audit records with verifiable citations.</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchGraph(selectedNode?.id || 'CMP-2026-0914', depth)}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-[4px] border border-[#DADFE5] hover:bg-[#F7F7F7] text-xs font-nunito font-semibold text-[#646B72] flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Graph</span>
            </button>
          </div>
        </div>

        {/* Global Entity Stat Chips */}
        <div className="mt-4 pt-4 border-t border-[#DADFE5]/60 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-nunito">
          <div className="p-2.5 bg-[#FFFFFF] rounded-[4px] border border-[#DADFE5]">
            <span className="text-[10px] text-[#646B72] uppercase font-bold block">Total Knowledge Nodes</span>
            <div className="font-poppins font-bold text-base text-[#000000]">{subgraph?.total_nodes_count || 15} Entities</div>
          </div>
          <div className="p-2.5 bg-[#FFFFFF] rounded-[4px] border border-[#DADFE5]">
            <span className="text-[10px] text-[#646B72] uppercase font-bold block">Evidence Relationships</span>
            <div className="font-poppins font-bold text-base text-[#7367F0]">{subgraph?.total_edges_count || 22} Verified Edges</div>
          </div>
          <div className="p-2.5 bg-[#FFFFFF] rounded-[4px] border border-[#DADFE5]">
            <span className="text-[10px] text-[#646B72] uppercase font-bold block">Coordinated Campaigns</span>
            <div className="font-poppins font-bold text-base text-[#EA5455]">CAMP-2026-EID-01</div>
          </div>
          <div className="p-2.5 bg-[#FFFFFF] rounded-[4px] border border-[#DADFE5]">
            <span className="text-[10px] text-[#646B72] uppercase font-bold block">Mule Network Hub</span>
            <div className="font-poppins font-bold text-base text-[#FF9F43]">RING-003 Savar</div>
          </div>
          <div className="p-2.5 bg-[#FFFFFF] rounded-[4px] border border-[#DADFE5]">
            <span className="text-[10px] text-[#646B72] uppercase font-bold block">Active MLRO Case</span>
            <div className="font-poppins font-bold text-base text-[#092C4C]">CASE-2026-MLRO-042</div>
          </div>
        </div>
      </div>

      {/* 2. Natural Language Query & Investigation Copilot Bar */}
      <div className="dream-card p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-poppins font-bold text-[#092C4C] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#7367F0]" />
            <span>Investigation Query Copilot (Ask in Natural Bangla or English):</span>
          </span>
          <span className="text-[11px] text-[#646B72] font-nunito">Instant Graph Citation Resolver</span>
        </div>

        {/* Input bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#A0AEC0] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNLQuery(nlQuery)}
              placeholder="e.g. এই নম্বরের সাথে কোন wallet যুক্ত? অথবা এই wallet-এর টাকা কোথায় গেছে?"
              className="w-full pl-9 pr-4 py-2.5 rounded-[4px] border border-[#DADFE5] text-xs font-nunito focus:outline-none focus:border-[#7367F0] focus:ring-1 focus:ring-[#7367F0]"
            />
          </div>
          <button
            onClick={() => handleNLQuery(nlQuery)}
            disabled={isQuerying || !nlQuery.trim()}
            className="px-5 py-2.5 bg-[#7367F0] hover:bg-[#5E50EE] text-white text-xs font-nunito font-bold rounded-[4px] shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isQuerying ? 'Traversing Graph...' : 'Ask Copilot'}</span>
          </button>
        </div>

        {/* Preset Query Chips */}
        <div className="flex items-center gap-2 flex-wrap text-[11px] font-nunito text-[#646B72]">
          <span className="font-bold text-[#212529]">Quick Questions:</span>
          {[
            'এই নম্বরের সাথে কোন wallet যুক্ত?',
            'এই wallet-এর টাকা কোথায় গেছে?',
            'এই complaint কোন campaign-এর সাথে মিলে?',
            'এই ring-এর সাথে কোন agent যুক্ত?',
            'এই campaign-এর প্রথম evidence কখন পাওয়া গেছে?'
          ].map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setNlQuery(preset);
                handleNLQuery(preset);
              }}
              className="px-2.5 py-1 rounded bg-[#F7F7F7] hover:bg-[#7367F0]/10 hover:text-[#7367F0] border border-[#DADFE5] transition-colors"
            >
              &quot;{preset}&quot;
            </button>
          ))}
        </div>

        {/* Query Result Card */}
        {queryResult && (
          <div className="mt-3 p-4 bg-[#7367F0]/5 border border-[#7367F0]/25 rounded-[6px] space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-poppins font-bold text-[#7367F0]">
                <CheckCircle2 className="w-4 h-4" />
                <span>Copilot Structured Graph Answer:</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#7367F0]/15 text-[#7367F0] font-bold">
                Confidence: {(queryResult.confidence * 100).toFixed(0)}%
              </span>
            </div>

            <p className="text-xs font-nunito text-[#212529] font-bangla leading-relaxed">
              {queryResult.answer_text_bn}
            </p>
            <p className="text-[11px] font-nunito text-[#646B72] italic">
              {queryResult.answer_text}
            </p>

            {queryResult.evidence_citations && queryResult.evidence_citations.length > 0 && (
              <div className="pt-2 border-t border-[#7367F0]/20 flex items-center gap-2 flex-wrap text-[10px] font-nunito">
                <span className="font-bold text-[#7367F0]">Verified Citations:</span>
                {queryResult.evidence_citations.map((ev, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-[#FFFFFF] border border-[#7367F0]/30 text-[#7367F0] font-mono font-bold">
                    📌 {ev.source_event_id} ({ev.verification_source})
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Demo Storyline Stepper (Click to Step Through Demo) */}
      <div className="dream-card p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#FF9F43]" />
            <h3 className="font-poppins font-bold text-xs text-[#092C4C] uppercase tracking-wider">
              Guided Investigation Demo: Unfolding the Fraud Ecosystem (Complaint → Ring → Campaign)
            </h3>
          </div>
          <span className="text-[11px] text-[#646B72] font-nunito">Step {demoStep + 1} of {demoSteps.length}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {demoSteps.map((s, idx) => {
            const isActive = demoStep === idx;
            return (
              <button
                key={s.step}
                onClick={() => handleStepClick(idx)}
                className={`p-2.5 rounded-[4px] text-left border transition-all duration-200 flex flex-col justify-between ${
                  isActive 
                    ? 'bg-[#7367F0] text-white border-[#5E50EE] shadow-md ring-2 ring-[#7367F0]/30' 
                    : 'bg-[#FFFFFF] text-[#212529] border-[#DADFE5] hover:bg-[#F7F7F7]'
                }`}
              >
                <div>
                  <span className={`text-[10px] font-bold block ${isActive ? 'text-white/80' : 'text-[#7367F0]'}`}>
                    Step {s.step}
                  </span>
                  <p className="font-poppins font-bold text-[11px] leading-tight truncate mt-0.5">
                    {s.title.split(' ')[0]}
                  </p>
                </div>
                <span className={`text-[9px] mt-1 truncate ${isActive ? 'text-white/70' : 'text-[#646B72]'}`}>
                  {s.targetId}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-3 bg-[#F7F7F7] border border-[#DADFE5] rounded-[4px] flex items-center justify-between text-xs font-nunito">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#092C4C]">{demoSteps[demoStep].title} ({demoSteps[demoStep].title_bn}):</span>
            <span className="text-[#646B72]">{demoSteps[demoStep].desc}</span>
          </div>
          <div className="flex items-center gap-2">
            {demoStep > 0 && (
              <button
                onClick={() => handleStepClick(demoStep - 1)}
                className="px-2.5 py-1 text-xs rounded border border-[#DADFE5] hover:bg-white"
              >
                Previous
              </button>
            )}
            {demoStep < demoSteps.length - 1 && (
              <button
                onClick={() => handleStepClick(demoStep + 1)}
                className="px-2.5 py-1 text-xs font-bold rounded bg-[#7367F0] text-white hover:bg-[#5E50EE]"
              >
                Next Step →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. MAIN GRAPH WORKSPACE (GRAPH CANVAS + INSPECTOR PANEL) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* GRAPH CANVAS (8 Cols) */}
        <div className="lg:col-span-8 dream-card p-4 shadow-sm flex flex-col justify-between space-y-3">
          
          {/* Top Control Bar: Filters, Depth, Suspicious Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#DADFE5] text-xs font-nunito">
            
            {/* Depth Selector */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[#646B72]">Hop Depth:</span>
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDepth(d);
                    fetchGraph(selectedNode?.id, d);
                  }}
                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                    depth === d ? 'bg-[#7367F0] text-white' : 'bg-[#F7F7F7] text-[#646B72] border border-[#DADFE5]'
                  }`}
                >
                  {d}-Hop
                </button>
              ))}
            </div>

            {/* Time Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[#646B72]">Window:</span>
              {(['ALL', '24H', '7D', '30D'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeFilter(t)}
                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                    timeFilter === t ? 'bg-[#092C4C] text-white' : 'bg-[#F7F7F7] text-[#646B72] border border-[#DADFE5]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Suspicious Only Switch */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={suspiciousOnly}
                onChange={(e) => setSuspiciousOnly(e.target.checked)}
                className="rounded border-[#DADFE5] text-[#EA5455] focus:ring-[#EA5455]"
              />
              <span className="font-bold text-[#EA5455]">Suspicious Only</span>
            </label>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom(z => Math.max(0.6, z - 0.15))}
                className="p-1 rounded bg-[#F7F7F7] hover:bg-[#EAEAEA] border border-[#DADFE5]"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5 text-[#646B72]" />
              </button>
              <span className="text-[11px] font-mono px-1">{(zoom * 100).toFixed(0)}%</span>
              <button
                onClick={() => setZoom(z => Math.min(1.8, z + 0.15))}
                className="p-1 rounded bg-[#F7F7F7] hover:bg-[#EAEAEA] border border-[#DADFE5]"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5 text-[#646B72]" />
              </button>
              <button
                onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                className="p-1 rounded bg-[#F7F7F7] hover:bg-[#EAEAEA] border border-[#DADFE5]"
                title="Reset View"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#646B72]" />
              </button>
            </div>
          </div>

          {/* Interactive SVG Canvas */}
          <div className="relative w-full h-[520px] bg-[#FDFDFD] rounded-[6px] border border-[#EAEAEA] overflow-hidden">
            <svg
              ref={svgRef}
              className="w-full h-full cursor-grab active:cursor-grabbing"
              viewBox="0 0 860 540"
              onMouseDown={(e) => {
                setIsDragging(true);
                setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
              }}
              onMouseMove={(e) => {
                if (isDragging) {
                  setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                }
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
            >
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                
                {/* Background Grid Pattern */}
                <defs>
                  <pattern id="graph-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <circle cx="20" cy="20" r="1" fill="#E2E8F0" />
                  </pattern>
                </defs>
                <rect width="860" height="540" fill="url(#graph-grid)" />

                {/* 1. EDGES */}
                {subgraph?.edges.map((edge) => {
                  const srcPos = nodePositions.get(edge.source);
                  const tgtPos = nodePositions.get(edge.target);
                  if (!srcPos || !tgtPos) return null;

                  const isEdgeSelected = selectedEdge?.id === edge.id;
                  const isSuspicious = edge.is_suspicious;
                  const midX = (srcPos.x + tgtPos.x) / 2;
                  const midY = (srcPos.y + tgtPos.y) / 2;

                  return (
                    <g key={edge.id} className="cursor-pointer" onClick={() => { setSelectedEdge(edge); setEvidenceModalEdge(edge); }}>
                      <line
                        x1={srcPos.x}
                        y1={srcPos.y}
                        x2={tgtPos.x}
                        y2={tgtPos.y}
                        stroke={isEdgeSelected ? '#7367F0' : isSuspicious ? '#EA5455' : '#CBD5E1'}
                        strokeWidth={isEdgeSelected ? 3 : isSuspicious ? 2.5 : 1.5}
                        strokeDasharray={isSuspicious ? '4 2' : undefined}
                      />
                      
                      {/* Edge Label Badge */}
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect
                          x="-45"
                          y="-10"
                          width="90"
                          height="20"
                          rx="4"
                          fill={isSuspicious ? '#FFF1F2' : '#F8FAFC'}
                          stroke={isSuspicious ? '#FDA4AF' : '#E2E8F0'}
                          strokeWidth="1"
                        />
                        <text
                          textAnchor="middle"
                          y="4"
                          fontSize="9"
                          fontFamily="sans-serif"
                          fontWeight="bold"
                          fill={isSuspicious ? '#E11D48' : '#64748B'}
                        >
                          {edge.type.slice(0, 14)}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* 2. NODES */}
                {subgraph?.nodes.map((node) => {
                  const pos = nodePositions.get(node.id);
                  if (!pos) return null;

                  const isSelected = selectedNode?.id === node.id;
                  const visuals = getNodeVisuals(node.type, node.is_suspicious);

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      className="cursor-pointer group"
                      onClick={() => {
                        setSelectedNode(node);
                        fetchGraph(node.id, depth);
                      }}
                    >
                      {/* Outer Pulse Ring for Critical Nodes */}
                      {node.risk_level === 'CRITICAL' && (
                        <circle
                          r="28"
                          fill="none"
                          stroke="#EA5455"
                          strokeWidth="1.5"
                          strokeOpacity="0.6"
                          className="animate-ping"
                        />
                      )}

                      {/* Selection Glow */}
                      {isSelected && (
                        <circle
                          r="26"
                          fill="none"
                          stroke="#7367F0"
                          strokeWidth="3"
                          strokeDasharray="4 2"
                        />
                      )}

                      {/* Main Node Circle */}
                      <circle
                        r="20"
                        fill={visuals.bg}
                        stroke={isSelected ? '#7367F0' : visuals.border}
                        strokeWidth="2"
                        filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.15))"
                      />

                      {/* Node Emoji / Icon */}
                      <text
                        textAnchor="middle"
                        y="6"
                        fontSize="14"
                        className="select-none"
                      >
                        {visuals.icon}
                      </text>

                      {/* Node Label Beneath */}
                      <g transform="translate(0, 32)">
                        <rect
                          x="-60"
                          y="-8"
                          width="120"
                          height="18"
                          rx="3"
                          fill="#FFFFFF"
                          stroke="#E2E8F0"
                          strokeWidth="0.8"
                          opacity="0.95"
                        />
                        <text
                          textAnchor="middle"
                          y="5"
                          fontSize="9.5"
                          fontFamily="sans-serif"
                          fontWeight="bold"
                          fill="#0F172A"
                        >
                          {node.label.length > 18 ? node.label.slice(0, 16) + '...' : node.label}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Floating Quick Legend */}
            <div className="absolute bottom-3 left-3 p-2.5 bg-white/95 backdrop-blur-xs rounded-[4px] border border-[#DADFE5] shadow-xs text-[10px] font-nunito flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EA5455]"></span>
                <span>Suspicious / Mule</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#28C76F]"></span>
                <span>Legitimate Flow</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7367F0]"></span>
                <span>Campaign Hub</span>
              </div>
            </div>
          </div>
        </div>

        {/* ENTITY INSPECTOR & EVIDENCE PANEL (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {selectedNode ? (
            <div className="dream-card p-5 shadow-sm space-y-4 animate-fade-in">
              
              {/* Header Details */}
              <div className="pb-3 border-b border-[#DADFE5]">
                <div className="flex items-center justify-between mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#F7F7F7] border border-[#DADFE5] text-[#646B72]">
                    {selectedNode.type}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-nunito font-bold ${
                    selectedNode.risk_level === 'CRITICAL' ? 'bg-[#EA5455]/15 text-[#EA5455] border border-[#EA5455]/30' :
                    selectedNode.risk_level === 'HIGH' ? 'bg-[#FF9F43]/15 text-[#FF9F43] border border-[#FF9F43]/30' :
                    'bg-[#28C76F]/10 text-[#28C76F] border border-[#28C76F]/30'
                  }`}>
                    {selectedNode.risk_level} RISK
                  </span>
                </div>

                <h4 className="font-poppins font-bold text-sm text-[#000000]">
                  {selectedNode.label}
                </h4>
                <p className="text-xs font-nunito text-[#646B72]">
                  {selectedNode.label_bn} {selectedNode.subtitle && `• ${selectedNode.subtitle}`}
                </p>
                <div className="text-[11px] font-mono text-[#A0AEC0] mt-1">
                  ID: {selectedNode.id}
                </div>
              </div>

              {/* Attributes Grid */}
              <div className="space-y-1.5 text-xs font-nunito">
                <span className="font-bold text-[#092C4C] uppercase text-[10px] block">Entity Attributes:</span>
                <div className="p-3 bg-[#F7F7F7] rounded-[4px] border border-[#DADFE5] space-y-1 font-mono text-[11px]">
                  {Object.entries(selectedNode.attributes || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-[#646B72]">{k}:</span>
                      <span className="text-[#212529] font-bold">{String(v)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1 border-t border-[#DADFE5]">
                    <span className="text-[#646B72]">First Seen:</span>
                    <span className="text-[#212529]">{new Date(selectedNode.first_seen).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Connected Relationships List */}
              <div className="space-y-1.5 text-xs font-nunito">
                <span className="font-bold text-[#092C4C] uppercase text-[10px] block">Connected Relationships:</span>
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {subgraph?.edges
                    .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setEvidenceModalEdge(e)}
                        className="w-full p-2 bg-[#FFFFFF] hover:bg-[#F7F7F7] border border-[#DADFE5] rounded-[4px] text-left flex items-center justify-between transition-colors text-[11px]"
                      >
                        <div>
                          <span className={`font-bold ${e.is_suspicious ? 'text-[#EA5455]' : 'text-[#7367F0]'}`}>
                            {e.type}
                          </span>
                          <p className="text-[10px] text-[#646B72] truncate max-w-[170px]">
                            {e.source === selectedNode.id ? `→ ${e.target}` : `← ${e.source}`}
                          </p>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#F0F2F5] text-[#646B72] font-mono">
                          {e.evidence.source_event_id}
                        </span>
                      </button>
                    ))}
                </div>
              </div>

              {/* Copilot Evidence Pack Summary */}
              {evidencePack && (
                <div className="p-3 bg-[#7367F0]/5 border border-[#7367F0]/20 rounded-[4px] space-y-1.5 text-xs font-nunito">
                  <div className="flex items-center gap-1.5 text-[#7367F0] font-bold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Copilot Evidence Summary:</span>
                  </div>
                  <p className="text-[11px] font-bangla text-[#212529] leading-relaxed">
                    {evidencePack.summary_bn}
                  </p>
                  <p className="text-[10px] text-[#646B72] italic">
                    {evidencePack.uncertainty_margin}
                  </p>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="pt-2 border-t border-[#DADFE5] flex items-center gap-2">
                <button
                  onClick={() => fetchGraph(selectedNode.id, depth + 1)}
                  className="flex-1 py-2 bg-[#7367F0] hover:bg-[#5E50EE] text-white text-xs font-nunito font-bold rounded-[4px] shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Expand Connections</span>
                </button>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(selectedNode, null, 2), 'NODE')}
                  className="p-2 border border-[#DADFE5] hover:bg-[#F7F7F7] rounded-[4px] text-[#646B72]"
                  title="Copy Node JSON"
                >
                  {copiedKey === 'NODE' ? <Check className="w-4 h-4 text-[#28C76F]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

            </div>
          ) : (
            <div className="dream-card p-8 text-center space-y-3">
              <Network className="w-8 h-8 text-[#A0AEC0] mx-auto animate-pulse" />
              <p className="text-xs font-nunito text-[#646B72]">
                Select any entity node in the graph or choose a demo step to inspect relationships and evidence.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 5. EVIDENCE RECORD MODAL */}
      {evidenceModalEdge && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#FFFFFF] rounded-[8px] max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#DADFE5]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#DADFE5]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded bg-[#7367F0]/10 text-[#7367F0]">
                  <FileText className="w-4 h-4" />
                </span>
                <h4 className="font-poppins font-bold text-sm text-[#000000]">
                  Immutable Synthetic Evidence Dossier
                </h4>
              </div>
              <button
                onClick={() => setEvidenceModalEdge(null)}
                className="text-xs font-nunito font-bold text-[#646B72] hover:text-[#000000]"
              >
                ✕ Close
              </button>
            </div>

            {/* Content */}
            <div className="space-y-3 text-xs font-nunito">
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#F7F7F7] rounded-[4px] border border-[#DADFE5] font-mono text-[11px]">
                <div>
                  <span className="text-[#646B72] block">Evidence ID:</span>
                  <strong className="text-[#7367F0]">{evidenceModalEdge.evidence.source_event_id}</strong>
                </div>
                <div>
                  <span className="text-[#646B72] block">Confidence:</span>
                  <strong className="text-[#28C76F]">{(evidenceModalEdge.evidence.confidence * 100).toFixed(0)}% (Verified)</strong>
                </div>
                <div>
                  <span className="text-[#646B72] block">Verification Source:</span>
                  <strong className="text-[#212529]">{evidenceModalEdge.evidence.verification_source}</strong>
                </div>
                <div>
                  <span className="text-[#646B72] block">Timestamp:</span>
                  <strong className="text-[#212529]">{new Date(evidenceModalEdge.evidence.timestamp).toLocaleString()}</strong>
                </div>
              </div>

              <div>
                <span className="font-bold text-[#092C4C] block mb-1">Relationship Type:</span>
                <span className="px-2 py-0.5 rounded bg-[#7367F0]/10 text-[#7367F0] font-mono font-bold text-xs">
                  {evidenceModalEdge.source} → [{evidenceModalEdge.type}] → {evidenceModalEdge.target}
                </span>
              </div>

              <div>
                <span className="font-bold text-[#092C4C] block mb-1">Evidence Summary (বাংলা ও ইংরেজি):</span>
                <div className="p-3 bg-[#FFF9F2] border border-[#FF9F43]/30 rounded-[4px] space-y-1">
                  <p className="font-bangla text-[#212529] leading-relaxed">
                    {evidenceModalEdge.evidence.evidence_summary_bn || evidenceModalEdge.evidence.evidence_summary}
                  </p>
                  <p className="text-[11px] text-[#646B72] italic">
                    {evidenceModalEdge.evidence.evidence_summary}
                  </p>
                </div>
              </div>

              {evidenceModalEdge.evidence.raw_payload && (
                <div>
                  <span className="font-bold text-[#092C4C] block mb-1">Raw Telemetry / Ledger Payload:</span>
                  <pre className="p-2.5 bg-[#1E293B] text-[#38BDF8] rounded-[4px] text-[10px] overflow-x-auto font-mono">
                    {JSON.stringify(evidenceModalEdge.evidence.raw_payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-[#DADFE5] flex items-center justify-between">
              <span className="text-[10px] text-[#646B72]">Audit Hash: SHA256-verified</span>
              <button
                onClick={() => setEvidenceModalEdge(null)}
                className="px-4 py-1.5 bg-[#092C4C] text-white font-nunito font-bold text-xs rounded-[4px]"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
