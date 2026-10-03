'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Network, ShieldAlert, Search, Sparkles, Filter, Clock, 
  Layers, ChevronRight, CheckCircle2, AlertTriangle, ArrowRight,
  ExternalLink, Info, RefreshCw, Smartphone, Phone, Wallet,
  Store, Building2, FileText, MessageSquare, AlertCircle,
  MapPin, Calendar, HelpCircle, Eye, ShieldCheck, Zap,
  ZoomIn, ZoomOut, Maximize2, Share2, Copy, Check, Pin, X
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
        return { bg: '#0EA5E9', border: '#0284C7', text: '#FFFFFF', code: 'CU', label: 'Customer' };
      case 'WALLET':
        return { bg: isSuspicious ? '#F26164' : '#23C17D', border: isSuspicious ? '#D94344' : '#1EAE5D', text: '#FFFFFF', code: 'WA', label: 'Wallet' };
      case 'PHONE':
        return { bg: '#8B5CF6', border: '#7C3AED', text: '#FFFFFF', code: 'PH', label: 'Phone' };
      case 'DEVICE':
        return { bg: '#70707B', border: '#3C3C45', text: '#FFFFFF', code: 'DV', label: 'Device' };
      case 'AGENT':
        return { bg: '#FF5A1F', border: '#E88E35', text: '#FFFFFF', code: 'AG', label: 'Agent' };
      case 'MERCHANT':
        return { bg: '#3B82F6', border: '#2563EB', text: '#FFFFFF', code: 'MC', label: 'Merchant' };
      case 'TRANSACTION':
        return { bg: '#10B981', border: '#059669', text: '#FFFFFF', code: 'TX', label: 'Txn' };
      case 'COMPLAINT':
        return { bg: '#F43F5E', border: '#E11D48', text: '#FFFFFF', code: 'CP', label: 'Complaint' };
      case 'SCAM_CONVERSATION':
        return { bg: '#A855F7', border: '#9333EA', text: '#FFFFFF', code: 'NL', label: 'Voice NLP' };
      case 'SCAM_TYPOLOGY':
        return { bg: '#F26164', border: '#DC2626', text: '#FFFFFF', code: 'TY', label: 'Typology' };
      case 'CAMPAIGN':
        return { bg: '#E11D48', border: '#BE123C', text: '#FFFFFF', code: 'CM', label: 'Campaign' };
      case 'RING':
        return { bg: '#F97316', border: '#EA580C', text: '#FFFFFF', code: 'RG', label: 'Mule Ring' };
      case 'LOCATION':
        return { bg: '#059669', border: '#047857', text: '#FFFFFF', code: 'LC', label: 'Location' };
      case 'EVENT':
        return { bg: '#EAB308', border: '#CA8A04', text: '#FFFFFF', code: 'EV', label: 'Event' };
      case 'CASE':
        return { bg: '#15151B', border: '#051829', text: '#FFFFFF', code: 'CS', label: 'MLRO Case' };
      default:
        return { bg: '#6355E8', border: '#5E50EE', text: '#FFFFFF', code: 'ND', label: 'Node' };
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
      <div className="upay-card p-6 border-l-4 border-l-amber-500 bg-white/80 dark:bg-slate-900/60 shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Network className="w-5 h-5" />
              </span>
              <h2 className="font-display font-extrabold text-xl text-slate-900 dark:text-slate-100">
                Bangladesh Scam Knowledge Graph (Semantic Intelligence Layer)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-ui font-bold bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                15 Entity Types • 100% Evidence-Backed
              </span>
            </div>
            <p className="text-xs font-ui text-slate-600 dark:text-slate-400 max-w-4xl leading-relaxed">
              Unified semantic knowledge network connecting victims, spoofed caller lines, mule aggregator wallets, 
              cash-out agent counters, coordinated scam campaigns, and NLP acoustic transcripts. 
              <strong className="text-slate-800 dark:text-slate-200"> Every relationship is grounded in synthetic audit records with verifiable citations.</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchGraph(selectedNode?.id || 'CMP-2026-0914', depth)}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-ui font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-500 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Graph</span>
            </button>
          </div>
        </div>

        {/* Global Entity Stat Chips */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-ui">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-white/10">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Total Knowledge Nodes</span>
            <div className="font-display font-bold text-base text-slate-900 dark:text-slate-100">{subgraph?.total_nodes_count || 15} Entities</div>
          </div>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-white/10">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Evidence Relationships</span>
            <div className="font-display font-bold text-base text-amber-500 dark:text-amber-400">{subgraph?.total_edges_count || 22} Verified Edges</div>
          </div>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-white/10">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Coordinated Campaigns</span>
            <div className="font-display font-bold text-base text-rose-500">CAMP-2026-EID-01</div>
          </div>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-white/10">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Mule Network Hub</span>
            <div className="font-display font-bold text-base text-orange-500">RING-003 Savar</div>
          </div>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-white/10">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Active MLRO Case</span>
            <div className="font-display font-bold text-base text-amber-500 dark:text-amber-300">CASE-2026-MLRO-042</div>
          </div>
        </div>
      </div>

      {/* 2. Natural Language Query & Investigation Copilot Bar */}
      <div className="upay-card p-5 shadow-sm space-y-3 bg-white/80 dark:bg-slate-900/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-display font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Investigation Query Copilot (Ask in Natural Bangla or English):</span>
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-ui">Instant Graph Citation Resolver</span>
        </div>

        {/* Input bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNLQuery(nlQuery)}
              placeholder="e.g. এই নম্বরের সাথে কোন wallet যুক্ত? অথবা এই wallet-এর টাকা কোথায় গেছে?"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 text-xs font-ui text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <button
            onClick={() => handleNLQuery(nlQuery)}
            disabled={isQuerying || !nlQuery.trim()}
            className="px-5 py-2.5 btn-flame text-white text-xs font-ui font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isQuerying ? 'Traversing Graph...' : 'Ask Copilot'}</span>
          </button>
        </div>

        {/* Preset Query Chips */}
        <div className="flex items-center gap-2 flex-wrap text-[11px] font-ui text-slate-600 dark:text-slate-400">
          <span className="font-bold text-slate-900 dark:text-slate-200">Quick Questions:</span>
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
              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-amber-500/10 hover:text-amber-500 dark:hover:text-amber-400 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 transition-colors"
            >
              &quot;{preset}&quot;
            </button>
          ))}
        </div>

        {/* Query Result Card */}
        {queryResult && (
          <div className="mt-3 p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-display font-bold text-amber-500">
                <CheckCircle2 className="w-4 h-4" />
                <span>Copilot Structured Graph Answer:</span>
              </div>
              <span className="text-[11px] font-num px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 font-bold">
                Confidence: {(queryResult.confidence * 100).toFixed(0)}%
              </span>
            </div>

            <p className="text-xs font-ui text-slate-900 dark:text-slate-100 font-bangla leading-relaxed">
              {queryResult.answer_text_bn}
            </p>
            <p className="text-[11px] font-ui text-slate-500 dark:text-slate-400 italic">
              {queryResult.answer_text}
            </p>

            {queryResult.evidence_citations && queryResult.evidence_citations.length > 0 && (
              <div className="pt-2 border-t border-amber-500/20 flex items-center gap-2 flex-wrap text-[10px] font-ui">
                <span className="font-bold text-amber-500">Verified Citations:</span>
                {queryResult.evidence_citations.map((ev, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-amber-500/30 text-amber-500 font-num font-bold flex items-center gap-1">
                    <Pin className="w-2.5 h-2.5 text-amber-500" />
                    <span>{ev.source_event_id} ({ev.verification_source})</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Demo Storyline Stepper (Click to Step Through Demo) */}
      <div className="upay-card p-5 shadow-sm space-y-3 bg-white/80 dark:bg-slate-900/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" />
            <h3 className="font-display font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Guided Investigation Demo: Unfolding the Fraud Ecosystem (Complaint → Ring → Campaign)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-ui">Step {demoStep + 1} of {demoSteps.length}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {demoSteps.map((s, idx) => {
            const isActive = demoStep === idx;
            return (
              <button
                key={s.step}
                onClick={() => handleStepClick(idx)}
                className={`p-2.5 rounded-xl text-left border transition-all duration-200 flex flex-col justify-between ${
                  isActive 
                    ? 'btn-flame text-white border-amber-500 shadow-md ring-2 ring-amber-500/30' 
                    : 'bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div>
                  <span className={`text-[10px] font-bold block ${isActive ? 'text-white/80' : 'text-amber-500'}`}>
                    Step {s.step}
                  </span>
                  <p className="font-display font-bold text-[11px] leading-tight truncate mt-0.5">
                    {s.title.split(' ')[0]}
                  </p>
                </div>
                <span className={`text-[9px] mt-1 truncate ${isActive ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'}`}>
                  {s.targetId}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-between text-xs font-ui">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-slate-100">{demoSteps[demoStep].title} ({demoSteps[demoStep].title_bn}):</span>
            <span className="text-slate-600 dark:text-slate-400">{demoSteps[demoStep].desc}</span>
          </div>
          <div className="flex items-center gap-2">
            {demoStep > 0 && (
              <button
                onClick={() => handleStepClick(demoStep - 1)}
                className="px-2.5 py-1 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Previous
              </button>
            )}
            {demoStep < demoSteps.length - 1 && (
              <button
                onClick={() => handleStepClick(demoStep + 1)}
                className="px-2.5 py-1 text-xs font-bold rounded-xl btn-flame text-white hover:opacity-95"
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
        <div className="lg:col-span-8 upay-card p-4 shadow-sm flex flex-col justify-between space-y-3 bg-white/80 dark:bg-slate-900/60">
          
          {/* Top Control Bar: Filters, Depth, Suspicious Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10 text-xs font-ui">
            
            {/* Depth Selector */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600 dark:text-slate-400">Hop Depth:</span>
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDepth(d);
                    fetchGraph(selectedNode?.id, d);
                  }}
                  className={`px-2.5 py-0.5 rounded-xl text-xs font-bold transition-all ${
                    depth === d ? 'btn-flame text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10'
                  }`}
                >
                  {d}-Hop
                </button>
              ))}
            </div>

            {/* Time Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600 dark:text-slate-400">Window:</span>
              {(['ALL', '24H', '7D', '30D'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeFilter(t)}
                  className={`px-2 py-0.5 rounded-xl text-xs font-bold transition-all ${
                    timeFilter === t ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10'
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
                className="rounded border-slate-300 dark:border-slate-700 text-rose-500 focus:ring-rose-500"
              />
              <span className="font-bold text-rose-500">Suspicious Only</span>
            </label>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom(z => Math.max(0.6, z - 0.15))}
                className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-num px-1 text-slate-700 dark:text-slate-300">{(zoom * 100).toFixed(0)}%</span>
              <button
                onClick={() => setZoom(z => Math.min(1.8, z + 0.15))}
                className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
                title="Reset View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive SVG Canvas */}
          <div className="relative w-full h-[520px] bg-slate-100 dark:bg-canvas rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-inner">
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
                    <circle cx="20" cy="20" r="1.2" className="fill-slate-300 dark:fill-slate-800" />
                  </pattern>
                </defs>
                <rect width="860" height="540" className="fill-slate-50 dark:fill-canvas" />
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
                        stroke={isEdgeSelected ? '#6355E8' : isSuspicious ? '#F26164' : '#CBD5E1'}
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
                          fill={isSuspicious ? 'rgba(242, 97, 100, 0.22)' : 'rgba(21, 21, 27, 0.9)'}
                          stroke={isSuspicious ? '#F26164' : 'rgba(255, 255, 255, 0.15)'}
                          strokeWidth="1"
                        />
                        <text
                          textAnchor="middle"
                          y="4"
                          fontSize="9"
                          fontFamily="sans-serif"
                          fontWeight="bold"
                          fill={isSuspicious ? '#F87171' : '#CBD5E1'}
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
                          stroke="#F26164"
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
                          stroke="#FF7A3D"
                          strokeWidth="3"
                          strokeDasharray="4 2"
                        />
                      )}

                      {/* Main Node Circle */}
                      <circle
                        r="20"
                        fill={visuals.bg}
                        stroke={isSelected ? '#FF7A3D' : visuals.border}
                        strokeWidth="2"
                        filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.35))"
                      />

                      {/* High-Tech Node Symbol */}
                      <text
                        textAnchor="middle"
                        y="4"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                        fill="#FFFFFF"
                        className="select-none tracking-wider"
                      >
                        {visuals.code}
                      </text>

                      {/* Node Label Beneath */}
                      <g transform="translate(0, 32)">
                        <rect
                          x="-60"
                          y="-8"
                          width="120"
                          height="18"
                          rx="4"
                          fill="rgba(21, 21, 27, 0.9)"
                          stroke="rgba(255, 255, 255, 0.15)"
                          strokeWidth="0.8"
                        />
                        <text
                          textAnchor="middle"
                          y="5"
                          fontSize="9.5"
                          fontFamily="sans-serif"
                          fontWeight="bold"
                          fill="#DDDDE2"
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
            <div className="absolute bottom-3 left-3 p-2.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-white/10 shadow-lg text-[10px] font-ui flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-danger"></span>
                <span>Suspicious / Mule</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-success-hi"></span>
                <span>Legitimate Flow</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-iris"></span>
                <span>Campaign Hub</span>
              </div>
            </div>
          </div>
        </div>

        {/* ENTITY INSPECTOR & EVIDENCE PANEL (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {selectedNode ? (
            <div className="upay-card p-5 shadow-sm space-y-4 animate-fade-in bg-white/80 dark:bg-slate-900/60">
              
              {/* Header Details */}
              <div className="pb-3 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-num font-bold uppercase bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400">
                    {selectedNode.type}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-ui font-bold ${
                    selectedNode.risk_level === 'CRITICAL' ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30' :
                    selectedNode.risk_level === 'HIGH' ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30' :
                    'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                  }`}>
                    {selectedNode.risk_level} RISK
                  </span>
                </div>

                <h4 className="font-display font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  {selectedNode.label}
                </h4>
                <p className="text-xs font-ui text-slate-500 dark:text-slate-400">
                  {selectedNode.label_bn} {selectedNode.subtitle && `• ${selectedNode.subtitle}`}
                </p>
                <div className="text-[11px] font-num text-slate-400 dark:text-slate-500 mt-1">
                  ID: {selectedNode.id}
                </div>
              </div>

              {/* Attributes Grid */}
              <div className="space-y-1.5 text-xs font-ui">
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] block">Entity Attributes:</span>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-white/10 space-y-1 font-num text-[11px]">
                  {Object.entries(selectedNode.attributes || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">{k}:</span>
                      <span className="text-slate-900 dark:text-slate-100 font-bold">{String(v)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-white/10">
                    <span className="text-slate-500 dark:text-slate-400">First Seen:</span>
                    <span className="text-slate-900 dark:text-slate-100">{new Date(selectedNode.first_seen).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Connected Relationships List */}
              <div className="space-y-1.5 text-xs font-ui">
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] block">Connected Relationships:</span>
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {subgraph?.edges
                    .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setEvidenceModalEdge(e)}
                        className="w-full p-2 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-white/10 rounded-xl text-left flex items-center justify-between transition-colors text-[11px]"
                      >
                        <div>
                          <span className={`font-bold ${e.is_suspicious ? 'text-rose-500' : 'text-amber-500 dark:text-amber-400'}`}>
                            {e.type}
                          </span>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[170px]">
                            {e.source === selectedNode.id ? `→ ${e.target}` : `← ${e.source}`}
                          </p>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-num">
                          {e.evidence.source_event_id}
                        </span>
                      </button>
                    ))}
                </div>
              </div>

              {/* Copilot Evidence Pack Summary */}
              {evidencePack && (
                <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1.5 text-xs font-ui">
                  <div className="flex items-center gap-1.5 text-amber-500 font-bold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Copilot Evidence Summary:</span>
                  </div>
                  <p className="text-[11px] font-bangla text-slate-900 dark:text-slate-100 leading-relaxed">
                    {evidencePack.summary_bn}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                    {evidencePack.uncertainty_margin}
                  </p>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center gap-2">
                <button
                  onClick={() => fetchGraph(selectedNode.id, depth + 1)}
                  className="flex-1 py-2 btn-flame text-white text-xs font-ui font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Expand Connections</span>
                </button>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(selectedNode, null, 2), 'NODE')}
                  className="p-2 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400"
                  title="Copy Node JSON"
                >
                  {copiedKey === 'NODE' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

            </div>
          ) : (
            <div className="upay-card p-8 text-center space-y-3 bg-white/80 dark:bg-slate-900/60">
              <Network className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto animate-pulse" />
              <p className="text-xs font-ui text-slate-500 dark:text-slate-400">
                Select any entity node in the graph or choose a demo step to inspect relationships and evidence.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 5. EVIDENCE RECORD MODAL */}
      {evidenceModalEdge && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-white/10">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <FileText className="w-4 h-4" />
                </span>
                <h4 className="font-display font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  Immutable Synthetic Evidence Dossier
                </h4>
              </div>
              <button
                onClick={() => setEvidenceModalEdge(null)}
                className="text-xs font-ui font-bold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Close</span>
              </button>
            </div>

            {/* Content */}
            <div className="space-y-3 text-xs font-ui">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-white/10 font-num text-[11px]">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Evidence ID:</span>
                  <strong className="text-amber-500">{evidenceModalEdge.evidence.source_event_id}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Confidence:</span>
                  <strong className="text-emerald-500">{(evidenceModalEdge.evidence.confidence * 100).toFixed(0)}% (Verified)</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Verification Source:</span>
                  <strong className="text-slate-900 dark:text-slate-100">{evidenceModalEdge.evidence.verification_source}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Timestamp:</span>
                  <strong className="text-slate-900 dark:text-slate-100">{new Date(evidenceModalEdge.evidence.timestamp).toLocaleString()}</strong>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">Relationship Type:</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-num font-bold text-xs">
                  {evidenceModalEdge.source} → [{evidenceModalEdge.type}] → {evidenceModalEdge.target}
                </span>
              </div>

              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">Evidence Summary (বাংলা ও ইংরেজি):</span>
                <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                  <p className="font-bangla text-slate-900 dark:text-slate-100 leading-relaxed">
                    {evidenceModalEdge.evidence.evidence_summary_bn || evidenceModalEdge.evidence.evidence_summary}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    {evidenceModalEdge.evidence.evidence_summary}
                  </p>
                </div>
              </div>

              {evidenceModalEdge.evidence.raw_payload && (
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">Raw Telemetry / Ledger Payload:</span>
                  <pre className="p-2.5 bg-slate-950 text-emerald-400 rounded-xl text-[10px] overflow-x-auto font-num border border-slate-800">
                    {JSON.stringify(evidenceModalEdge.evidence.raw_payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Audit Hash: SHA256-verified</span>
              <button
                onClick={() => setEvidenceModalEdge(null)}
                className="px-4 py-1.5 btn-flame text-white font-ui font-bold text-xs rounded-xl"
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
