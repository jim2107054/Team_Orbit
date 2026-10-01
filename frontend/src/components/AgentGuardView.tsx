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
      <div className="dream-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-poppins font-bold text-lg text-[#000000]">
              🏪 Agent Guard &amp; Ecosystem Protection (M8)
            </span>
            <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-nunito font-bold bg-[#FF9F43]/15 text-[#FF9F43] border border-[#FF9F43]/30">
              Agent: Rahman Telecom (AGT-DH-8821)
            </span>
          </div>
          <p className="text-xs font-nunito text-[#646B72] mt-0.5">
            TI Bangladesh reports 17% of agents are victimized or exploited by mule rings. Agent Guard gives frontline cash-out protection.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-[4px] bg-[#FF0000]/10 border border-[#FF0000]/30 text-[#FF0000] text-xs font-nunito font-bold">
          Status: High Alert (Watchlist)
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Peer Benchmark (6 Cols) */}
        <div className="lg:col-span-6 dream-card p-5 space-y-4 shadow-sm">
          <h3 className="text-xs font-poppins font-bold text-[#092C4C] flex items-center gap-1.5 pb-2 border-b border-[#DADFE5]">
            <Users className="w-4 h-4 text-[#FF9F43]" />
            <span>REGIONAL PEER GROUP BENCHMARKING</span>
          </h3>

          <div className="space-y-3 text-xs font-nunito">
            <div className="p-3.5 bg-[#F7F7F7] border border-[#DADFE5]">
              <div className="flex justify-between mb-1.5">
                <span className="text-[#646B72]">Cash-Out to Deposit Ratio</span>
                <span className="text-[#FF0000] font-poppins font-bold">0.88 (Agent) vs 0.42 (Peers)</span>
              </div>
              <div className="w-full h-2 bg-[#DADFE5] rounded-full overflow-hidden">
                <div className="h-full bg-[#FF0000] rounded-full" style={{ width: '88%' }}></div>
              </div>
            </div>

            <div className="p-3.5 bg-[#F7F7F7] border border-[#DADFE5]">
              <div className="flex justify-between mb-1">
                <span className="text-[#646B72]">Structured Transaction Volume</span>
                <span className="text-[#FF9F43] font-poppins font-bold">12 txns &lt; ৳5,000 threshold</span>
              </div>
              <p className="text-[11px] text-[#646B72] mt-1">
                Matches structuring pattern designed to evade single-transaction monitoring limits.
              </p>
            </div>
          </div>
        </div>

        {/* Live Coached Victim Alert (6 Cols) */}
        <div className="lg:col-span-6 dream-card p-5 space-y-4 shadow-sm">
          <h3 className="text-xs font-poppins font-bold text-[#FF0000] flex items-center gap-1.5 pb-2 border-b border-[#DADFE5]">
            <AlertTriangle className="w-4 h-4" />
            <span>AGENT APP LIVE CASH-OUT WARNING (COACHED VICTIM)</span>
          </h3>

          <div className="p-4 bg-[#FF0000]/5 border border-[#FF0000]/20 space-y-3 text-xs font-nunito">
            <div className="flex items-center gap-2 text-[#FF0000] font-bold">
              <MessageSquare className="w-4 h-4" />
              <span>এজেন্টকে সতর্কতা ও নির্দেশিকা:</span>
            </div>

            <div className="space-y-2 text-[#212529] font-bangla">
              {profile?.coached_victim_prompts_bn?.map((prompt: string, idx: number) => (
                <div key={idx} className="p-2.5 bg-[#FFFFFF] border border-[#DADFE5] flex items-start gap-2 shadow-sm">
                  <span className="text-[#FF9F43] font-bold">•</span>
                  <span>{prompt}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-[#646B72]">
              💡 ক্যাশ-আউট সম্পন্ন করার আগে গ্রাহককে এক মিনিট অপেক্ষা করিয়ে কলটি কেটে দেখতে বলুন।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
