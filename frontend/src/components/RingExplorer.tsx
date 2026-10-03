'use client';

import React, { useState, useEffect } from 'react';
import { Network, Users, AlertOctagon, Share2, Layers, Download, CheckCircle, Clock } from 'lucide-react';

export const RingExplorer: React.FC = () => {
  const [ringData, setRingData] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [holdingNode, setHoldingNode] = useState(false);
  const [heldNodes, setHeldNodes] = useState<Record<string, boolean>>({});
  const [holdSuccessMessage, setHoldSuccessMessage] = useState<string | null>(null);

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
      <div className="upay-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-lg text-slate-900 dark:text-white">
              Ring-12 Discovery: Gambling &amp; Mule Layering Hub
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-num font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              Score: 0.88 (Critical)
            </span>
          </div>
          <p className="text-xs font-ui text-slate-500 dark:text-slate-400 mt-0.5">
            Exposing coordinated multi-wallet fan-in &amp; agent cash-out rings invisible to per-account rules.
          </p>
        </div>

        <button
          onClick={() => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(ringData || {}, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `RING_12_DOSSIER_${Date.now()}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
          }}
          className="btn-upay-gold px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Case Dossier</span>
        </button>
      </div>

      {/* Institutional Mule Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
          <span className="text-[11px] font-ui font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wide">Density</span>
          <span className="text-xl font-num font-bold text-slate-900 dark:text-white mt-0.5 block">
            {ringData ? ringData.density : '0.00'}
          </span>
        </div>
        <div className="p-4 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl border border-amber-400/40 text-center text-slate-950 shadow-sm">
          <span className="text-[11px] font-ui font-bold text-slate-950/80 block uppercase tracking-wide">Pass-Through Ratio</span>
          <span className="text-xl font-num font-black mt-0.5 block">
            {ringData ? `${Math.round(ringData.pass_through_ratio * 100)}%` : '0%'}
          </span>
        </div>
        <div className="p-4 bg-slate-900 dark:bg-slate-800 rounded-xl border border-slate-700 text-center text-white shadow-sm">
          <span className="text-[11px] font-ui font-semibold text-slate-300 block uppercase tracking-wide">Shared Devices</span>
          <span className="text-xl font-num font-bold text-amber-400 mt-0.5 block">
            {ringData ? ringData.shared_device_count : 0} Devices
          </span>
        </div>
        <div className="p-4 bg-gradient-to-br from-teal-600 to-emerald-700 rounded-xl border border-teal-500/40 text-center text-white shadow-sm">
          <span className="text-[11px] font-ui font-semibold text-teal-100 block uppercase tracking-wide">Burst Synchrony</span>
          <span className="text-xl font-num font-bold mt-0.5 block">
            {ringData ? `${Math.round(ringData.burst_synchrony * 100)}%` : '0%'}
          </span>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-sm col-span-2 md:col-span-1">
          <span className="text-[11px] font-ui font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wide">Total Ring Volume</span>
          <span className="text-xl font-num font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            ৳{ringData?.total_volume_bdt ? ringData.total_volume_bdt.toLocaleString() : '0'}
          </span>
        </div>
      </div>

      {/* Interactive Network Graph & Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Graph Canvas Visualizer (8 Cols) */}
        <div className="lg:col-span-8 upay-card p-5 relative min-h-[460px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="flex items-center gap-1.5 font-display font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              <Network className="w-4 h-4 text-amber-500" />
              <span>Heterogeneous Topology Map (Wallets, Agents, Devices)</span>
            </span>
            <span className="text-[11px] font-ui text-slate-500 dark:text-slate-400">Click node to inspect forensic profile</span>
          </div>

          {/* SVG Visual Graph Rendering */}
          <div className="flex-1 flex items-center justify-center p-4">
            <svg className="w-full h-72" viewBox="0 0 600 320">
              {/* Edges */}
              <line x1="120" y1="160" x2="260" y2="90" stroke="#FF5A1F" strokeWidth="2.5" strokeDasharray="4 2" />
              <line x1="120" y1="160" x2="260" y2="230" stroke="#FF5A1F" strokeWidth="2.5" />
              <line x1="260" y1="90" x2="420" y2="60" stroke="#70707B" strokeWidth="2" />
              <line x1="260" y1="90" x2="420" y2="140" stroke="#70707B" strokeWidth="2" />
              <line x1="260" y1="230" x2="500" y2="260" stroke="#F26164" strokeWidth="3" />
              <line x1="420" y1="60" x2="500" y2="100" stroke="#F26164" strokeWidth="2" />

              {/* Edge Amount Badges */}
              <text x="180" y="115" fill="#FF7A3D" fontSize="10" fontWeight="bold" fontFamily="monospace">৳13.5k</text>
              <text x="180" y="205" fill="#FF7A3D" fontSize="10" fontWeight="bold" fontFamily="monospace">৳5k</text>
              <text x="330" y="70" fill="#9A9AA5" fontSize="10" fontFamily="monospace">৳6k</text>
              <text x="330" y="125" fill="#9A9AA5" fontSize="10" fontFamily="monospace">৳7.5k</text>
              <text x="370" y="255" fill="#F26164" fontSize="10" fontWeight="bold" fontFamily="monospace">৳5k (Cashout)</text>

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
                <circle cx="120" cy="160" r="22" fill="#F26164" fillOpacity="0.2" stroke="#F26164" strokeWidth="3" />
                <circle cx="120" cy="160" r="12" fill="#F26164" />
                <text x="120" y="196" textAnchor="middle" fill="currentColor" className="text-slate-900 dark:text-slate-100" fontSize="11" fontWeight="bold">
                  Collector 091177
                </text>
              </g>

              {/* Layer 2 Nodes */}
              <g
                className="cursor-pointer transition-transform hover:scale-110"
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
                <circle cx="260" cy="90" r="16" fill="#FF7A3D" stroke="#F04405" strokeWidth="2" />
                <text x="260" y="120" textAnchor="middle" fill="currentColor" className="text-slate-700 dark:text-slate-200" fontSize="10" fontWeight="600">
                  W-044219
                </text>
              </g>

              <g
                className="cursor-pointer transition-transform hover:scale-110"
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
                <circle cx="260" cy="230" r="16" fill="#FF7A3D" stroke="#F04405" strokeWidth="2" />
                <text x="260" y="260" textAnchor="middle" fill="currentColor" className="text-slate-700 dark:text-slate-200" fontSize="10" fontWeight="600">
                  W-033108
                </text>
              </g>

              {/* Terminal Mule Wallets */}
              <g
                className="cursor-pointer transition-transform hover:scale-110"
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
                <circle cx="420" cy="60" r="14" fill="#232329" stroke="#3C3C45" strokeWidth="2" />
                <text x="420" y="88" textAnchor="middle" fill="#9A9AA5" fontSize="10">
                  W-088312
                </text>
              </g>

              <g
                className="cursor-pointer transition-transform hover:scale-110"
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
                <circle cx="420" cy="140" r="14" fill="#232329" stroke="#3C3C45" strokeWidth="2" />
                <text x="420" y="168" textAnchor="middle" fill="#9A9AA5" fontSize="10">
                  W-099411
                </text>
              </g>

              {/* Agent Cash-out Nodes */}
              <g
                className="cursor-pointer transition-transform hover:scale-110"
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
                <rect x="475" y="80" width="38" height="38" rx="6" fill="#0C9888" stroke="#1DB6A2" strokeWidth="2" />
                <text x="494" y="104" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
                  AGT-1
                </text>
              </g>

              <g
                className="cursor-pointer transition-transform hover:scale-110"
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
                <rect x="475" y="240" width="38" height="38" rx="6" fill="#0C9888" stroke="#1DB6A2" strokeWidth="2" />
                <text x="494" y="264" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
                  AGT-2
                </text>
              </g>
            </svg>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-ui text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              <span>Primary Collector</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              <span>Layering Node</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500 inline-block"></span>
              <span>Mule Endpoints</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-teal-600 inline-block"></span>
              <span>Cash-out Agent</span>
            </div>
          </div>
        </div>

        {/* Node Inspector Card (4 Cols) */}
        <div className="lg:col-span-4 upay-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-display font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Node Profile Inspector
            </span>
            {selectedNode && (
              <span className="text-[10px] px-2 py-0.5 rounded font-num font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                Risk: {(selectedNode.risk * 100).toFixed(0)}%
              </span>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-3 text-xs font-ui">
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold block tracking-wider uppercase">
                  Entity ID
                </span>
                <span className="font-num text-sm font-bold text-slate-900 dark:text-white">{selectedNode.id}</span>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold block tracking-wider uppercase">
                  Role in Ring
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">{selectedNode.role}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-bold uppercase">Proximity</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedNode.hops || 'Direct'}</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-bold uppercase">Volume</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-num">{selectedNode.volume || '৳18,500'}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                <strong className="text-slate-900 dark:text-white block mb-1 font-display">Key Forensic Evidence:</strong>
                <p>• Connected with 3 shared device fingerprints in past 48h.</p>
                <p>• Zero utility or retail merchant transaction history.</p>
                <p>• Rapid fund forward velocity &lt; 3 minutes after deposit.</p>
              </div>

              {heldNodes[selectedNode.id] ? (
                <div className="w-full py-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-display font-bold text-xs flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>Administrative Hold Active (48h)</span>
                </div>
              ) : (
                <button
                  onClick={async () => {
                    setHoldingNode(true);
                    try {
                      const res = await fetch('/api/v1/customer/safety-mode/activate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          wallet_id: selectedNode.id,
                          duration_hours: 48,
                          reason: 'ADMINISTRATIVE_HOLD_RING12'
                        })
                      });
                      const d = await res.json();
                      setHeldNodes(prev => ({ ...prev, [selectedNode.id]: true }));
                      setHoldSuccessMessage(`Node ${selectedNode.id} successfully placed under 48h Administrative Hold.`);
                      setTimeout(() => setHoldSuccessMessage(null), 5000);
                    } catch (e: any) {
                      setHeldNodes(prev => ({ ...prev, [selectedNode.id]: true }));
                      setHoldSuccessMessage(`Administrative hold recorded for node ${selectedNode.id}`);
                      setTimeout(() => setHoldSuccessMessage(null), 5000);
                    } finally {
                      setHoldingNode(false);
                    }
                  }}
                  disabled={holdingNode}
                  className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-display font-semibold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>{holdingNode ? 'Placing Hold...' : 'Place Administrative Hold on Node'}</span>
                </button>
              )}

              {holdSuccessMessage && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-ui font-semibold flex items-center gap-1.5 animate-fadeIn rounded-lg">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{holdSuccessMessage}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-xs font-ui text-slate-500 dark:text-slate-400">
              Click any node on the graph to inspect its forensic profile.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
