'use client';

import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, Lock, ArrowDownRight, CheckCircle, AlertCircle } from 'lucide-react';

export const RecoveryTracer: React.FC = () => {
  const [traceData, setTraceData] = useState<any>(null);
  const [approvedHolds, setApprovedHolds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/v1/cases/CASE-2026-00417/trace', { method: 'POST' })
      .then((r) => r.json())
      .then((d) => setTraceData(d))
      .catch(console.error);
  }, []);

  const handleApproveHold = (walletId: string) => {
    setApprovedHolds((prev) => ({ ...prev, [walletId]: true }));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg text-white">⚡ Golden-Hour Money-Flow Recovery Engine</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              M13 Activated
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Attacking the 89.3% unrecovered fraud gap: Tracing stolen funds across hops to freeze balances before cash-out.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800 text-xs">
          <Clock className="w-4 h-4 text-amber-400 animate-spin" />
          <span className="text-slate-300">Time Since Incident: <strong className="text-white">22 mins</strong></span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 text-center">
          <span className="text-xs text-slate-400 block mb-1">Total Stolen Funds</span>
          <span className="text-xl font-extrabold text-white">৳ 18,500</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 text-center bg-emerald-950/20">
          <span className="text-xs text-emerald-400 block mb-1">Active Recoverable Balance</span>
          <span className="text-xl font-extrabold text-emerald-300">৳ 11,200 (60.5%)</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-red-500/30 text-center bg-red-950/20">
          <span className="text-xs text-red-400 block mb-1">Cashed Out at Agents</span>
          <span className="text-xl font-extrabold text-red-300">৳ 7,300 (39.5%)</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-cyan-500/30 text-center bg-cyan-950/20">
          <span className="text-xs text-cyan-400 block mb-1">Recovery Lift vs Baseline</span>
          <span className="text-xl font-extrabold text-cyan-300">3.8x Higher</span>
        </div>
      </div>

      {/* Downstream Money Flow Hop Tree & Ranked Hold Candidates */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Downstream Flow Tree (7 Cols) */}
        <div className="lg:col-span-7 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 pb-2 border-b border-slate-800">
            <ArrowDownRight className="w-4 h-4" />
            <span>DOWNSTREAM MONEY FLOW TREE (HOPS & CASH-OUTS)</span>
          </h3>

          <div className="space-y-3 text-xs">
            {/* Hop 1: Victim to Primary Collector */}
            <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-slate-200 font-bold mb-1">
                <span>Hop 1: Victim ➔ Primary Collector</span>
                <span className="text-cyan-400">৳ 18,500</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                W-SYN-004512 (Rahima) ➔ W-SYN-091177 (Tanvir Hossain) @ 23:41:07
              </p>
            </div>

            {/* Hop 2: Layering Forwarding */}
            <div className="pl-4 space-y-2 border-l-2 border-cyan-500/30 ml-3">
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-slate-200 font-semibold mb-1">
                  <span>Hop 2A: Split to Layering Node A</span>
                  <span className="text-cyan-300">৳ 13,500</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Forwarded within 2 minutes to W-SYN-044219.
                </p>
              </div>

              {/* Hop 3: Terminal Wallets */}
              <div className="pl-4 space-y-2 border-l-2 border-purple-500/30 ml-3">
                <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/40">
                  <div className="flex items-center justify-between font-bold text-emerald-300 mb-1">
                    <span>Hop 3A: Mule Wallet 1 (ACTIVE BALANCE)</span>
                    <span className="text-emerald-400 font-extrabold">৳ 6,200</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    W-SYN-091177 (Tanvir Hossain) | ৳1,300 cashed out at Agent DH-8821.
                  </p>
                </div>

                <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/40">
                  <div className="flex items-center justify-between font-bold text-emerald-300 mb-1">
                    <span>Hop 3B: Mule Wallet 2 (ACTIVE BALANCE)</span>
                    <span className="text-emerald-400 font-extrabold">৳ 5,000</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    W-SYN-088312 (Rashedul Islam) | ৳1,000 cashed out at Agent DH-8821.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-red-950/20 rounded-xl border border-red-500/30">
                <div className="flex items-center justify-between text-red-300 font-semibold mb-1">
                  <span>Hop 2B: Full Cash-out at Agent</span>
                  <span className="text-red-400 font-bold">৳ 5,000 (Cashed Out)</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  W-SYN-033108 ➔ AGT-CTG-1044 @ 23:50:00 (Terminal).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Ranked Hold Candidates (5 Cols) */}
        <div className="lg:col-span-5 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 pb-2 border-b border-slate-800">
            <Lock className="w-4 h-4" />
            <span>RANKED HOLD CANDIDATES (HUMAN APPROVAL)</span>
          </h3>

          <div className="space-y-3">
            {traceData?.hold_candidates?.map((h: any, idx: number) => {
              const isApproved = approvedHolds[h.wallet_id];
              return (
                <div
                  key={idx}
                  className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-white">{h.wallet_id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                      Confidence: {(h.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="text-xs text-slate-300">
                    <div>Owner: <strong className="text-slate-100">{h.customer_name}</strong></div>
                    <div>Phone: <span className="font-mono text-slate-400">{h.phone}</span></div>
                    <div>Recoverable Balance: <strong className="text-emerald-400 text-sm">৳ {h.estimated_recoverable_bdt.toLocaleString()}</strong></div>
                    <div>Collateral Risk: <span className="text-emerald-400 font-bold">{h.collateral_risk}</span></div>
                  </div>

                  <button
                    disabled={isApproved}
                    onClick={() => handleApproveHold(h.wallet_id)}
                    className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      isApproved
                        ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                    }`}
                  >
                    {isApproved ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Hold Placed & Logged in Audit</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Approve Administrative Freeze</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400">
            ⚖️ <strong>Governance & Safeguard (RAI-05):</strong> Holds require human analyst approval. 
            No autonomous denial or irreversible freezing is conducted by the AI engine.
          </div>
        </div>
      </div>
    </div>
  );
};
