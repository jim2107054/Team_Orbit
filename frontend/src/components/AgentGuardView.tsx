'use client';

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Users, MessageSquare } from 'lucide-react';

export const AgentGuardView: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetch('/api/v1/agents/AGT-DH-8821/risk')
      .then((r) => r.json())
      .then((d) => setProfile(d))
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg text-white">🏪 Agent Guard &amp; Ecosystem Protection (M8)</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Agent: Rahman Telecom (AGT-DH-8821)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            TI Bangladesh reports 17% of agents are victimized or exploited by mule rings. Agent Guard gives frontline cash-out protection.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-bold">
          Status: High Alert (Watchlist)
        </div>
      </div>

      {/* Grid: Peer Benchmark on Left, Live Prompt on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Peer Benchmark (6 Cols) */}
        <div className="lg:col-span-6 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 pb-2 border-b border-slate-800">
            <Users className="w-4 h-4" />
            <span>REGIONAL PEER GROUP BENCHMARKING</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800">
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Cash-Out to Deposit Ratio</span>
                <span className="text-red-400 font-bold">0.88 (Agent) vs 0.42 (Peers)</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: '88%' }}></div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800">
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Structured Transaction Volume</span>
                <span className="text-amber-400 font-bold">12 txns &lt; ৳5,000 threshold</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Matches structuring pattern designed to evade single-transaction monitoring limits.
              </p>
            </div>
          </div>
        </div>

        {/* Live Coached Victim Alert (6 Cols) */}
        <div className="lg:col-span-6 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-red-400 flex items-center gap-1.5 pb-2 border-b border-slate-800">
            <AlertTriangle className="w-4 h-4" />
            <span>AGENT APP LIVE CASH-OUT WARNING (COACHED VICTIM)</span>
          </h3>

          <div className="p-4 bg-red-950/30 border border-red-500/40 rounded-2xl space-y-3 text-xs">
            <div className="flex items-center gap-2 text-red-300 font-bold">
              <MessageSquare className="w-4 h-4" />
              <span>এজেন্টকে সতর্কতা ও নির্দেশিকা:</span>
            </div>

            <div className="space-y-2 text-slate-200 font-bangla">
              {profile?.coached_victim_prompts_bn?.map((prompt: string, idx: number) => (
                <div key={idx} className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>{prompt}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400">
              💡 ক্যাশ-আউট সম্পন্ন করার আগে গ্রাহককে এক মিনিট অপেক্ষা করিয়ে কলটি কেটে দেখতে বলুন।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
