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
      <div className="dream-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-poppins font-bold text-lg text-[#000000]">
              Ring-12 Discovery: Gambling &amp; Mule Layering Hub
            </span>
            <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-nunito font-bold bg-[#FF9F43]/15 text-[#FF9F43] border border-[#FF9F43]/30">
              Score: 0.88 (Critical)
            </span>
          </div>
          <p className="text-xs font-nunito text-[#646B72] mt-0.5">
            Exposing coordinated multi-wallet fan-in &amp; agent cash-out rings invisible to per-account rules.
          </p>
        </div>

        <button
          onClick={() => alert('Exporting Ring-12 Case Dossier for Bangladesh Bank MLRO Review...')}
          className="dream-btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" />
          <span>Export Case Dossier</span>
        </button>
      </div>

      {/* Dreams POS Color-Blocked Metric Cards (Sharp 0px corners) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 bg-[#FFFFFF] rounded-none border border-[#DADFE5] text-center shadow-sm">
          <span className="text-[11px] font-nunito font-semibold text-[#646B72] block">Density</span>
          <span className="text-lg font-poppins font-bold text-[#092C4C]">
            {ringData ? ringData.density : '0.45'}
          </span>
        </div>
        <div className="p-4 bg-[#FF9F43] rounded-none border border-[#FF9F43] text-center text-white shadow-sm">
          <span className="text-[11px] font-nunito font-semibold text-white/90 block">Pass-Through Ratio</span>
          <span className="text-lg font-poppins font-bold">
            {ringData ? `${(ringData.pass_through_ratio * 100).toFixed(0)}%` : '88%'}
          </span>
        </div>
        <div className="p-4 bg-[#212B36] rounded-none border border-[#212B36] text-center text-white shadow-sm">
          <span className="text-[11px] font-nunito font-semibold text-white/90 block">Shared Devices</span>
          <span className="text-lg font-poppins font-bold">
            {ringData ? ringData.shared_device_count : '4'} Devices
          </span>
        </div>
        <div className="p-4 bg-[#0E9384] rounded-none border border-[#0E9384] text-center text-white shadow-sm">
          <span className="text-[11px] font-nunito font-semibold text-white/90 block">Burst Synchrony</span>
          <span className="text-lg font-poppins font-bold">
            {ringData ? `${(ringData.burst_synchrony * 100).toFixed(0)}%` : '84%'}
          </span>
        </div>
        <div className="p-4 bg-[#FFFFFF] rounded-none border border-[#DADFE5] text-center shadow-sm col-span-2 md:col-span-1">
          <span className="text-[11px] font-nunito font-semibold text-[#646B72] block">Total Ring Volume</span>
          <span className="text-lg font-poppins font-bold text-[#198754]">৳ 38,000</span>
        </div>
      </div>

      {/* Interactive Network Graph & Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Graph Canvas Visualizer (8 Cols) */}
        <div className="lg:col-span-8 dream-card p-5 relative min-h-[460px] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#646B72] pb-2 border-b border-[#DADFE5]">
            <span className="flex items-center gap-1.5 font-poppins font-bold text-[#212B36]">
              <Network className="w-4 h-4 text-[#FF9F43]" />
              <span>HETEROGENEOUS TOPOLOGY MAP (WALLETS, AGENTS, DEVICES)</span>
            </span>
            <span className="text-[11px] font-nunito text-[#646B72]">Click node to inspect forensic profile</span>
          </div>

          {/* SVG Visual Graph Rendering */}
          <div className="flex-1 flex items-center justify-center p-4">
            <svg className="w-full h-72" viewBox="0 0 600 320">
              {/* Edges */}
              <line x1="120" y1="160" x2="260" y2="90" stroke="#FF9F43" strokeWidth="2.5" strokeDasharray="4 2" />
              <line x1="120" y1="160" x2="260" y2="230" stroke="#FF9F43" strokeWidth="2.5" />
              <line x1="260" y1="90" x2="420" y2="60" stroke="#212B36" strokeWidth="2" />
              <line x1="260" y1="90" x2="420" y2="140" stroke="#212B36" strokeWidth="2" />
              <line x1="260" y1="230" x2="500" y2="260" stroke="#FF0000" strokeWidth="3" />
              <line x1="420" y1="60" x2="500" y2="100" stroke="#FF0000" strokeWidth="2" />

              {/* Edge Amount Badges */}
              <text x="180" y="115" fill="#212B36" fontSize="10" fontWeight="bold">৳13.5k</text>
              <text x="180" y="205" fill="#212B36" fontSize="10" fontWeight="bold">৳5k</text>
              <text x="330" y="70" fill="#646B72" fontSize="10">৳6k</text>
              <text x="330" y="125" fill="#646B72" fontSize="10">৳7.5k</text>
              <text x="370" y="255" fill="#FF0000" fontSize="10" fontWeight="bold">৳5k (Cashout)</text>

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
                <circle cx="120" cy="160" r="22" fill="#FF0000" fillOpacity="0.15" stroke="#FF0000" strokeWidth="3" />
                <circle cx="120" cy="160" r="12" fill="#FF0000" />
                <text x="120" y="196" textAnchor="middle" fill="#000000" fontSize="11" fontWeight="bold">
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
                <circle cx="260" cy="90" r="16" fill="#FF9F43" stroke="#DC6C00" strokeWidth="2" />
                <text x="260" y="120" textAnchor="middle" fill="#212529" fontSize="10" fontWeight="600">
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
                <circle cx="260" cy="230" r="16" fill="#FF9F43" stroke="#DC6C00" strokeWidth="2" />
                <text x="260" y="260" textAnchor="middle" fill="#212529" fontSize="10" fontWeight="600">
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
                <circle cx="420" cy="60" r="14" fill="#212B36" stroke="#092C4C" strokeWidth="2" />
                <text x="420" y="88" textAnchor="middle" fill="#646B72" fontSize="10">
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
                <circle cx="420" cy="140" r="14" fill="#212B36" stroke="#092C4C" strokeWidth="2" />
                <text x="420" y="168" textAnchor="middle" fill="#646B72" fontSize="10">
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
                <rect x="475" y="80" width="38" height="38" rx="4" fill="#0E9384" stroke="#0b7a6d" strokeWidth="2" />
                <text x="494" y="104" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
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
                <rect x="475" y="240" width="38" height="38" rx="4" fill="#0E9384" stroke="#0b7a6d" strokeWidth="2" />
                <text x="494" y="264" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
                  🏪 Agt2
                </text>
              </g>
            </svg>
          </div>

          <div className="flex items-center gap-4 text-xs font-nunito text-[#646B72] pt-2 border-t border-[#DADFE5]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#FF0000] inline-block"></span>
              <span>Primary Collector</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#FF9F43] inline-block"></span>
              <span>Layering Node</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#212B36] inline-block"></span>
              <span>Mule Endpoints</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[3px] bg-[#0E9384] inline-block"></span>
              <span>Cash-out Agent</span>
            </div>
          </div>
        </div>

        {/* Node Inspector Card (4 Cols) */}
        <div className="lg:col-span-4 dream-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[#DADFE5]">
            <span className="text-xs font-poppins font-bold text-[#212B36]">NODE PROFILE INSPECTOR</span>
            {selectedNode && (
              <span className="text-[10px] px-2 py-0.5 rounded-[4px] bg-[#FF0000]/10 text-[#FF0000] font-nunito font-bold border border-[#FF0000]/30">
                Risk: {(selectedNode.risk * 100).toFixed(0)}%
              </span>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-3 text-xs font-nunito">
              <div>
                <span className="text-[#646B72] text-[10px] block">ENTITY ID</span>
                <span className="font-mono text-sm font-bold text-[#000000]">{selectedNode.id}</span>
              </div>

              <div>
                <span className="text-[#646B72] text-[10px] block">ROLE IN RING</span>
                <span className="text-[#FF9F43] font-bold">{selectedNode.role}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 bg-[#F7F7F7] border border-[#DADFE5]">
                  <span className="text-[#646B72] text-[10px] block">PROXIMITY</span>
                  <span className="font-semibold text-[#212B36]">{selectedNode.hops || 'Direct'}</span>
                </div>
                <div className="p-2.5 bg-[#F7F7F7] border border-[#DADFE5]">
                  <span className="text-[#646B72] text-[10px] block">VOLUME</span>
                  <span className="font-semibold text-[#198754]">{selectedNode.volume || '৳18,500'}</span>
                </div>
              </div>

              <div className="p-3 bg-[#F7F7F7] border border-[#DADFE5] text-[11px] text-[#212529] space-y-1">
                <strong className="text-[#000000] block mb-1 font-poppins">Key Forensic Evidence:</strong>
                <p>• Connected with 3 shared device fingerprints in past 48h.</p>
                <p>• Zero utility or retail merchant transaction history.</p>
                <p>• Rapid fund forward velocity &lt; 3 minutes after deposit.</p>
              </div>

              <button
                onClick={() => alert(`Applied temporary hold on ${selectedNode.id}`)}
                className="w-full py-2.5 rounded-[5px] bg-[#FF0000] hover:bg-[#d90000] text-white font-poppins font-semibold text-xs shadow-sm transition-all"
              >
                Place Administrative Hold on Node
              </button>
            </div>
          ) : (
            <div className="py-12 text-center text-xs font-nunito text-[#646B72]">
              Click any node on the graph to inspect its forensic profile.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
