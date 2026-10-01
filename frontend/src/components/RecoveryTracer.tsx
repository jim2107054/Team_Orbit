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
      <div className="dream-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-poppins font-bold text-lg text-[#000000]">
              ⚡ Golden-Hour Money-Flow Recovery Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-nunito font-bold bg-[#FF9F43]/15 text-[#FF9F43] border border-[#FF9F43]/30">
              M13 Activated
            </span>
          </div>
          <p className="text-xs font-nunito text-[#646B72] mt-0.5">
            Attacking the 89.3% unrecovered fraud gap: Tracing stolen funds across hops to freeze balances before cash-out.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#F7F7F7] p-2 rounded-[5px] border border-[#DADFE5] text-xs font-nunito">
          <Clock className="w-4 h-4 text-[#FF9F43] animate-spin" />
          <span className="text-[#212529]">Time Since Incident: <strong className="text-[#000000]">22 mins</strong></span>
        </div>
      </div>

      {/* Metric Cards (Color-Blocked, Sharp 0px corners) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#FFFFFF] rounded-none border border-[#DADFE5] text-center shadow-sm">
          <span className="text-xs font-nunito text-[#646B72] block mb-1">Total Stolen Funds</span>
          <span className="text-xl font-poppins font-extrabold text-[#000000]">৳ 18,500</span>
        </div>

        <div className="p-4 bg-[#198754]/10 rounded-none border border-[#198754]/30 text-center shadow-sm">
          <span className="text-xs font-nunito font-semibold text-[#198754] block mb-1">Active Recoverable Balance</span>
          <span className="text-xl font-poppins font-extrabold text-[#198754]">৳ 11,200 (60.5%)</span>
        </div>

        <div className="p-4 bg-[#FF0000]/10 rounded-none border border-[#FF0000]/30 text-center shadow-sm">
          <span className="text-xs font-nunito font-semibold text-[#FF0000] block mb-1">Cashed Out at Agents</span>
          <span className="text-xl font-poppins font-extrabold text-[#FF0000]">৳ 7,300 (39.5%)</span>
        </div>

        <div className="p-4 bg-[#FF9F43]/15 rounded-none border border-[#FF9F43]/40 text-center shadow-sm">
          <span className="text-xs font-nunito font-semibold text-[#FF9F43] block mb-1">Recovery Lift vs Baseline</span>
          <span className="text-xl font-poppins font-extrabold text-[#FF9F43]">3.8x Higher</span>
        </div>
      </div>

      {/* Downstream Flow Tree & Ranked Hold Candidates */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Downstream Flow Tree (7 Cols) */}
        <div className="lg:col-span-7 dream-card p-5 space-y-4 shadow-sm">
          <h3 className="text-xs font-poppins font-bold text-[#092C4C] flex items-center gap-1.5 pb-2 border-b border-[#DADFE5]">
            <ArrowDownRight className="w-4 h-4 text-[#FF9F43]" />
            <span>DOWNSTREAM MONEY FLOW TREE (HOPS &amp; CASH-OUTS)</span>
          </h3>

          <div className="space-y-3 text-xs font-nunito">
            {/* Hop 1: Victim to Primary Collector */}
            <div className="p-3.5 bg-[#F7F7F7] border border-[#DADFE5]">
              <div className="flex items-center justify-between text-[#000000] font-bold mb-1">
                <span>Hop 1: Victim ➔ Primary Collector</span>
                <span className="text-[#FF9F43] font-poppins font-bold">৳ 18,500</span>
              </div>
              <p className="text-[#646B72] text-[11px]">
                W-SYN-004512 (Rahima) ➔ W-SYN-091177 (Tanvir Hossain) @ 23:41:07
              </p>
            </div>

            {/* Hop 2: Layering Forwarding */}
            <div className="pl-4 space-y-2 border-l-2 border-[#FF9F43] ml-3">
              <div className="p-3 bg-[#F7F7F7] border border-[#DADFE5]">
                <div className="flex items-center justify-between text-[#212529] font-semibold mb-1">
                  <span>Hop 2A: Split to Layering Node A</span>
                  <span className="text-[#092C4C] font-poppins font-bold">৳ 13,500</span>
                </div>
                <p className="text-[#646B72] text-[11px]">
                  Forwarded within 2 minutes to W-SYN-044219.
                </p>
              </div>

              {/* Hop 3: Terminal Wallets */}
              <div className="pl-4 space-y-2 border-l-2 border-[#198754] ml-3">
                <div className="p-3 bg-[#198754]/10 border border-[#198754]/30">
                  <div className="flex items-center justify-between font-bold text-[#198754] mb-1">
                    <span>Hop 3A: Mule Wallet 1 (ACTIVE BALANCE)</span>
                    <span className="font-poppins font-extrabold">৳ 6,200</span>
                  </div>
                  <p className="text-[#212529] text-[11px]">
                    W-SYN-091177 (Tanvir Hossain) | ৳1,300 cashed out at Agent DH-8821.
                  </p>
                </div>

                <div className="p-3 bg-[#198754]/10 border border-[#198754]/30">
                  <div className="flex items-center justify-between font-bold text-[#198754] mb-1">
                    <span>Hop 3B: Mule Wallet 2 (ACTIVE BALANCE)</span>
                    <span className="font-poppins font-extrabold">৳ 5,000</span>
                  </div>
                  <p className="text-[#212529] text-[11px]">
                    W-SYN-088312 (Rashedul Islam) | ৳1,000 cashed out at Agent DH-8821.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-[#FF0000]/10 border border-[#FF0000]/30">
                <div className="flex items-center justify-between text-[#FF0000] font-semibold mb-1">
                  <span>Hop 2B: Full Cash-out at Agent</span>
                  <span className="font-poppins font-bold">৳ 5,000 (Cashed Out)</span>
                </div>
                <p className="text-[#646B72] text-[11px]">
                  W-SYN-033108 ➔ AGT-CTG-1044 @ 23:50:00 (Terminal).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Ranked Hold Candidates (5 Cols) */}
        <div className="lg:col-span-5 dream-card p-5 space-y-4 shadow-sm">
          <h3 className="text-xs font-poppins font-bold text-[#198754] flex items-center gap-1.5 pb-2 border-b border-[#DADFE5]">
            <Lock className="w-4 h-4" />
            <span>RANKED HOLD CANDIDATES (HUMAN APPROVAL)</span>
          </h3>

          <div className="space-y-3">
            {traceData?.hold_candidates?.map((h: any, idx: number) => {
              const isApproved = approvedHolds[h.wallet_id];
              return (
                <div
                  key={idx}
                  className="p-4 bg-[#F7F7F7] border border-[#DADFE5] space-y-3 font-nunito"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#000000]">{h.wallet_id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-[4px] bg-[#198754]/15 text-[#198754] border border-[#198754]/30 font-bold">
                      Confidence: {(h.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="text-xs text-[#212529]">
                    <div>Owner: <strong className="text-[#000000]">{h.customer_name}</strong></div>
                    <div>Phone: <span className="font-mono text-[#646B72]">{h.phone}</span></div>
                    <div>Recoverable Balance: <strong className="text-[#198754] font-poppins text-sm">৳ {h.estimated_recoverable_bdt.toLocaleString()}</strong></div>
                    <div>Collateral Risk: <span className="text-[#198754] font-bold">{h.collateral_risk}</span></div>
                  </div>

                  <button
                    disabled={isApproved}
                    onClick={() => handleApproveHold(h.wallet_id)}
                    className={`w-full py-2 rounded-[5px] text-xs font-poppins font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      isApproved
                        ? 'bg-[#FFFFFF] text-[#198754] border border-[#198754]/40 shadow-sm'
                        : 'bg-[#198754] hover:bg-[#157347] text-white shadow-md'
                    }`}
                  >
                    {isApproved ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Hold Placed &amp; Logged in Audit</span>
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

          <div className="p-3 bg-[#F7F7F7] border border-[#DADFE5] text-[11px] font-nunito text-[#646B72]">
            ⚖️ <strong>Governance &amp; Safeguard (RAI-05):</strong> Holds require human analyst approval. 
            No autonomous denial or irreversible freezing is conducted by the AI engine.
          </div>
        </div>
      </div>
    </div>
  );
};
