'use client';

import React, { useState, useEffect } from 'react';
import { Network, Users, AlertOctagon, Share2, Layers, Download } from 'lucide-react';

export const RingExplorer: React.FC = () => {
  const [ringData, setRingData] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => {
    fetch('/api/v1/rings/RING-2026-0012')
      .then((r) => r.json())
      .then((d) => {
        if (d.ring) {
          setRingData(d.ring);
          if (d.ring.nodes?.length > 0) {
            setSelectedNode(d.ring.nodes[0]);
          }
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg text-white">Ring-12 Discovery: Gambling & Mule Layering Hub</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Score: 0.88 (Critical)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Exposing coordinated multi-wallet fan-in & agent cash-out rings invisible to account-by-account rules.
          </p>
        </div>

        <button
          onClick={() => alert('Exporting Ring-12 Case Dossier for Bangladesh Bank MLRO Review...')}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/20"
        >
          <Download className="w-4 h-4" />
          <span>Export Case Dossier</span>
        </button>
      </div>

      {/* Ring Score Radar & Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3.5 glass-panel rounded-xl border border-slate-800 text-center">
          <span className="text-[11px] text-slate-400 block">Density</span>
          <span className="text-base font-extrabold text-cyan-400">
            {ringData ? ringData.density : '0.45'}
          </span>
        </div>
        <div className="p-3.5 glass-panel rounded-xl border border-slate-800 text-center">
          <span className="text-[11px] text-slate-400 block">Pass-Through Ratio</span>
          <span className="text-base font-extrabold text-amber-400">
            {ringData ? `${(ringData.pass_through_ratio * 100).toFixed(0)}%` : '88%'}
          </span>
        </div>
        <div className="p-3.5 glass-panel rounded-xl border border-slate-800 text-center">
          <span className="text-[11px] text-slate-400 block">Shared Devices</span>
          <span className="text-base font-extrabold text-purple-400">
            {ringData ? ringData.shared_device_count : '4'} Devices
          </span>
        </div>
        <div className="p-3.5 glass-panel rounded-xl border border-slate-800 text-center">
          <span className="text-[11px] text-slate-400 block">Burst Synchrony</span>
          <span className="text-base font-extrabold text-red-400">
            {ringData ? `${(ringData.burst_synchrony * 100).toFixed(0)}%` : '84%'}
          </span>
        </div>
        <div className="p-3.5 glass-panel rounded-xl border border-slate-800 text-center col-span-2 md:col-span-1">
          <span className="text-[11px] text-slate-400 block">Total Ring Volume</span>
          <span className="text-base font-extrabold text-emerald-400">৳ 38,000</span>
        </div>
      </div>

      {/* Interactive Network Graph & Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Graph Canvas Visualizer (8 Cols) */}
        <div className="lg:col-span-8 glass-panel p-4 rounded-2xl border border-slate-800 relative min-h-[480px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
            <span className="flex items-center gap-1.5 font-bold text-slate-200">
              <Network className="w-4 h-4 text-cyan-400" />
              <span>HETEROGENEOUS TOPOLOGY MAP (WALLETS, AGENTS, DEVICES)</span>
            </span>
            <span className="text-[11px] text-slate-500">Interactive Click-to-Inspect</span>
          </div>

          {/* SVG Visual Graph Rendering */}
          <div className="flex-1 flex items-center justify-center p-4">
            <svg className="w-full h-80" viewBox="0 0 600 320">
              <defs>
                <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#d90429" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Edges */}
              <line x1="120" y1="160" x2="260" y2="90" stroke="#00f0ff" strokeWidth="2.5" strokeDasharray="4 2" />
              <line x1="120" y1="160" x2="260" y2="230" stroke="#00f0ff" strokeWidth="2.5" />
              <line x1="260" y1="90" x2="420" y2="60" stroke="#a855f7" strokeWidth="2" />
              <line x1="260" y1="90" x2="420" y2="140" stroke="#a855f7" strokeWidth="2" />
              <line x1="260" y1="230" x2="500" y2="260" stroke="#ef4444" strokeWidth="3" />
              <line x1="420" y1="60" x2="500" y2="100" stroke="#ef4444" strokeWidth="2" />

              {/* Edge Amount Badges */}
              <text x="180" y="115" fill="#38bdf8" fontSize="10" fontWeight="bold">৳13.5k</text>
              <text x="180" y="205" fill="#38bdf8" fontSize="10" fontWeight="bold">৳5k</text>
              <text x="330" y="70" fill="#c084fc" fontSize="10">৳6k</text>
              <text x="330" y="125" fill="#c084fc" fontSize="10">৳7.5k</text>
              <text x="370" y="255" fill="#f87171" fontSize="10" fontWeight="bold">৳5k (Cashout)</text>

              {/* Seed Node: W-SYN-091177 */}
              <g
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() =>
                  setSelectedNode({
                    id: 'W-SYN-091177',
                    label: 'Tanvir Hossain (Mule 1)',
                    role: 'Primary Mule Collector',
                    risk: 0.95,
                    volume: '৳18,500',
                    hops: '0 Hops (Focal)'
                  })
                }
              >
                <circle cx="120" cy="160" r="24" fill="#d90429" fillOpacity="0.2" stroke="#d90429" strokeWidth="3" />
                <circle cx="120" cy="160" r="14" fill="#d90429" />
                <text x="120" y="196" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">
                  Collector 091177
                </text>
              </g>

              {/* Layer 2 Nodes */}
              <g
                className="cursor-pointer"
                onClick={() =>
                  setSelectedNode({
                    id: 'W-SYN-044219',
                    label: 'Layering Node A',
                    role: 'Pass-Through Transit',
                    risk: 0.84,
                    volume: '৳13,500',
                    hops: '1 Hop'
                  })
                }
              >
                <circle cx="260" cy="90" r="18" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
                <text x="260" y="122" textAnchor="middle" fill="#94a3b8" fontSize="10">
                  W-044219
                </text>
              </g>

              <g
                className="cursor-pointer"
                onClick={() =>
                  setSelectedNode({
                    id: 'W-SYN-033108',
                    label: 'Layering Node B',
                    role: 'Pass-Through Transit',
                    risk: 0.81,
                    volume: '৳5,000',
                    hops: '1 Hop'
                  })
                }
              >
                <circle cx="260" cy="230" r="18" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
                <text x="260" y="262" textAnchor="middle" fill="#94a3b8" fontSize="10">
                  W-033108
                </text>
              </g>

              {/* Terminal Mule Wallets */}
              <g
                className="cursor-pointer"
                onClick={() =>
                  setSelectedNode({
                    id: 'W-SYN-088312',
                    label: 'Mule Terminal 2',
                    role: 'Active Balance Holder (৳5,000)',
                    risk: 0.91,
                    volume: '৳6,000',
                    hops: '2 Hops'
                  })
                }
              >
                <circle cx="420" cy="60" r="16" fill="#a855f7" stroke="#d8b4fe" strokeWidth="2" />
                <text x="420" y="90" textAnchor="middle" fill="#94a3b8" fontSize="10">
                  W-088312
                </text>
              </g>

              <g
                className="cursor-pointer"
                onClick={() =>
                  setSelectedNode({
                    id: 'W-SYN-099411',
                    label: 'Mule Terminal 3',
                    role: 'Active Balance Holder (৳6,200)',
                    risk: 0.94,
                    volume: '৳7,500',
                    hops: '2 Hops'
                  })
                }
              >
                <circle cx="420" cy="140" r="16" fill="#a855f7" stroke="#d8b4fe" strokeWidth="2" />
                <text x="420" y="170" textAnchor="middle" fill="#94a3b8" fontSize="10">
                  W-099411
                </text>
              </g>

              {/* Agent Cash-out Nodes */}
              <g
                className="cursor-pointer"
                onClick={() =>
                  setSelectedNode({
                    id: 'AGT-DH-8821',
                    label: 'Rahman Telecom (Agent)',
                    role: 'Complicit/Vulnerable Cash-out Agent',
                    risk: 0.88,
                    volume: '৳1,000 Cashout',
                    hops: '3 Hops (Agent)'
                  })
                }
              >
                <rect x="475" y="80" width="40" height="40" rx="8" fill="#e11d48" stroke="#f43f5e" strokeWidth="2" />
                <text x="495" y="105" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
                  🏪 Agt1
                </text>
              </g>

              <g
                className="cursor-pointer"
                onClick={() =>
                  setSelectedNode({
                    id: 'AGT-CTG-1044',
                    label: 'Chittagong Digital (Agent)',
                    role: 'High-Volume Cash-out Point',
                    risk: 0.82,
                    volume: '৳5,000 Cashout',
                    hops: '2 Hops (Agent)'
                  })
                }
              >
                <rect x="475" y="240" width="40" height="40" rx="8" fill="#e11d48" stroke="#f43f5e" strokeWidth="2" />
                <text x="495" y="265" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
                  🏪 Agt2
                </text>
              </g>
            </svg>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
              <span>Primary Collector</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-sky-500 inline-block"></span>
              <span>Layering Node</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-500 inline-block"></span>
              <span>Mule Endpoints</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-600 inline-block"></span>
              <span>Cash-out Agent</span>
            </div>
          </div>
        </div>

        {/* Node Inspector Card (4 Cols) */}
        <div className="lg:col-span-4 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300">NODE PROFILE INSPECTOR</span>
            {selectedNode && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30">
                Risk: {(selectedNode.risk * 100).toFixed(0)}%
              </span>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 text-[10px] block">ENTITY ID</span>
                <span className="font-mono text-sm font-bold text-white">{selectedNode.id}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] block">ROLE IN RING</span>
                <span className="text-cyan-300 font-bold">{selectedNode.role}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">PROXIMITY</span>
                  <span className="font-semibold text-slate-200">{selectedNode.hops || 'Direct'}</span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">VOLUME</span>
                  <span className="font-semibold text-emerald-300">{selectedNode.volume || '৳18,500'}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <strong className="text-white block mb-1">Key Forensic Evidence:</strong>
                <p>• Connected with 3 shared device fingerprints in past 48h.</p>
                <p>• Zero utility or retail merchant transaction history.</p>
                <p>• Rapid fund forward velocity &lt; 3 minutes after deposit.</p>
              </div>

              <button
                onClick={() => alert(`Applied temporary hold on ${selectedNode.id}`)}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/20 transition-all"
              >
                Place Administrative Hold on Node
              </button>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              Click any node on the graph to inspect its forensic profile.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
