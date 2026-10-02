'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldAlert, ShieldCheck, Shield, RotateCcw, Clock, 
  Target, Hash, Calendar, X, AlertCircle, ShoppingCart, 
  Users, User, ChevronRight, ArrowUpRight, ArrowDownRight, 
  Settings, Sparkles, ExternalLink, ArrowRight, Smartphone, Radio,
  Activity, Layers, FileText, Network
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [activeChartRange, setActiveChartRange] = useState<'1D' | '1W' | '1M' | '3M' | '6M' | '1Y'>('1Y');
  const [dbStats, setDbStats] = useState<{ totalTxns: number; totalVolume: number; totalAlerts: number; totalRings: number } | null>(null);

  useEffect(() => {
    fetch('/api/v1/metrics/summary')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDbStats({
            totalTxns: data.totalTxns || 0,
            totalVolume: data.totalVolume || 0,
            totalAlerts: data.totalAlerts || 0,
            totalRings: data.totalRings || 0
          });
        }
      })
      .catch((err) => console.error('Error loading dashboard summary stats:', err));
  }, []);

  const displayVolume = dbStats?.totalVolume ? `৳${dbStats.totalVolume.toLocaleString()}` : '৳48,988,078';
  const displayTxns = dbStats?.totalTxns ? dbStats.totalTxns.toLocaleString() : '14,200+';
  const displayAlerts = dbStats?.totalAlerts ? dbStats.totalAlerts.toString() : '142';
  const displayRings = dbStats?.totalRings ? dbStats.totalRings.toString() : '12';

  return (
    <div className="space-y-6 pb-12 animate-fadeIn relative">
      
      {/* Top Welcome Title & Date Range Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-poppins font-bold text-[#1B2850] tracking-tight">
            Welcome, Risk Operations Officer
          </h1>
          <p className="text-xs font-nunito text-[#646B72] mt-0.5">
            You have <span className="text-[#FF9F43] font-bold">{displayAlerts}</span> Active Alerts &amp; <span className="text-[#05A677] font-bold">{displayTxns}</span> Protected Transactions Today
          </p>
        </div>

        {/* Date Filter Button (26/09/2026 - 02/10/2026) */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3.5 py-2 bg-[#FFFFFF] border border-[#E8EBED] rounded-[6px] text-xs font-nunito font-semibold text-[#212B36] hover:bg-[#F7F7F7] shadow-sm transition-colors">
            <Calendar className="w-3.5 h-3.5 text-[#646B72]" />
            <span>26/09/2026 - 02/10/2026</span>
          </button>
        </div>
      </div>

      {/* Dismissable Warning Banner (Ring-12 Mule Network Incident Notification) */}
      {!alertDismissed && (
        <div className="p-3.5 bg-[#FFF2E8] border border-[#FFD8BF] rounded-[6px] text-xs font-nunito flex items-center justify-between gap-3 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2 text-[#D46B08]">
            <AlertCircle className="w-4 h-4 text-[#FF9F43] flex-shrink-0" />
            <span>
              <strong className="text-[#FF9F43] font-bold">Live Threat Alert:</strong> 3 split mule hops detected in Mirpur Hub (৳18,500). Golden-Hour Auto-Hold recommended.{' '}
              <Link href="/analyst" className="underline font-bold hover:text-[#D46B08]">Review Alert in Triage</Link>
            </span>
          </div>
          <button
            onClick={() => setAlertDismissed(true)}
            className="text-[#646B72] hover:text-[#212B36] p-1 rounded hover:bg-[#FFE7BA] transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ROW 1: 4 Solid Color Large KPI Cards (upay Shield Intelligence) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Solid Orange (#FF9F43) - Total Protected Volume */}
        <div className="bg-[#FF9F43] text-white p-5 rounded-[8px] shadow-[0px_4px_20px_0px_rgba(255,159,67,0.25)] flex items-center justify-between relative overflow-hidden transition-transform hover:-translate-y-0.5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[8px] bg-white flex items-center justify-center text-[#FF9F43] shadow-sm flex-shrink-0">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-nunito font-medium text-white/90 block">Total Protected Volume</span>
              <strong className="text-lg lg:text-xl font-poppins font-bold block leading-tight mt-0.5">
                {displayVolume}
              </strong>
            </div>
          </div>
          <div className="px-2 py-1 bg-white/90 rounded-[4px] text-[11px] font-bold text-[#FF9F43] flex items-center gap-0.5 shadow-sm">
            <span>↑</span>
            <span>+22%</span>
          </div>
        </div>

        {/* Card 2: Solid Navy (#1B2850) - False Positives Avoided */}
        <div className="bg-[#1B2850] text-white p-5 rounded-[8px] shadow-[0px_4px_20px_0px_rgba(27,40,80,0.20)] flex items-center justify-between relative overflow-hidden transition-transform hover:-translate-y-0.5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[8px] bg-white flex items-center justify-center text-[#1B2850] shadow-sm flex-shrink-0">
              <RotateCcw className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-nunito font-medium text-white/90 block">False Positives Avoided</span>
              <strong className="text-lg lg:text-xl font-poppins font-bold block leading-tight mt-0.5">
                16,478 (91.8%)
              </strong>
            </div>
          </div>
          <div className="px-2 py-1 bg-white/90 rounded-[4px] text-[11px] font-bold text-[#05A677] flex items-center gap-0.5 shadow-sm">
            <span>↓</span>
            <span>-91.8%</span>
          </div>
        </div>

        {/* Card 3: Solid Teal / Emerald (#05A677) - Golden-Hour Recovered */}
        <div className="bg-[#05A677] text-white p-5 rounded-[8px] shadow-[0px_4px_20px_0px_rgba(5,166,119,0.25)] flex items-center justify-between relative overflow-hidden transition-transform hover:-translate-y-0.5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[8px] bg-white flex items-center justify-center text-[#05A677] shadow-sm flex-shrink-0">
              <Clock className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-nunito font-medium text-white/90 block">Golden-Hour Recovered</span>
              <strong className="text-lg lg:text-xl font-poppins font-bold block leading-tight mt-0.5">
                ৳24,145,789
              </strong>
            </div>
          </div>
          <div className="px-2 py-1 bg-white/90 rounded-[4px] text-[11px] font-bold text-[#05A677] flex items-center gap-0.5 shadow-sm">
            <span>↑</span>
            <span>+22%</span>
          </div>
        </div>

        {/* Card 4: Solid Blue (#1B75D0) - Clean USSD & App Volume */}
        <div className="bg-[#1B75D0] text-white p-5 rounded-[8px] shadow-[0px_4px_20px_0px_rgba(27,117,208,0.25)] flex items-center justify-between relative overflow-hidden transition-transform hover:-translate-y-0.5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[8px] bg-white flex items-center justify-center text-[#1B75D0] shadow-sm flex-shrink-0">
              <Radio className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-nunito font-medium text-white/90 block">Clean USSD &amp; App Volume</span>
              <strong className="text-lg lg:text-xl font-poppins font-bold block leading-tight mt-0.5">
                ৳18,458,747
              </strong>
            </div>
          </div>
          <div className="px-2 py-1 bg-white/90 rounded-[4px] text-[11px] font-bold text-[#1B75D0] flex items-center gap-0.5 shadow-sm">
            <span>↑</span>
            <span>+22%</span>
          </div>
        </div>

      </div>

      {/* ROW 2: 4 White KPI Cards with Pastel Icon Pills & Bottom Trend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Prevented Scam Loss */}
        <div className="dream-card p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <strong className="text-xl font-poppins font-bold text-[#1B2850] block">
                ৳8,458,798
              </strong>
              <span className="text-xs font-nunito text-[#646B72]">Prevented Scam Loss</span>
            </div>
            <div className="w-10 h-10 rounded-[8px] bg-[#E0F7F6] text-[#00A896] flex items-center justify-center">
              <Layers className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#E8EBED] text-xs font-nunito">
            <span className="text-[#05A677] font-bold">+35% vs Last Month</span>
            <Link href="/analyst" className="text-[#1B2850] hover:text-[#FF9F43] font-semibold underline text-[11px]">
              View All Cases
            </Link>
          </div>
        </div>

        {/* Card 2: Active Interventions / Holds Pending */}
        <div className="dream-card p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <strong className="text-xl font-poppins font-bold text-[#1B2850] block">
                48 Active Holds
              </strong>
              <span className="text-xs font-nunito text-[#646B72]">Pending Review</span>
            </div>
            <div className="w-10 h-10 rounded-[8px] bg-[#E8F8F0] text-[#198754] flex items-center justify-center">
              <Clock className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#E8EBED] text-xs font-nunito">
            <span className="text-[#05A677] font-bold">+35% vs Last Month</span>
            <Link href="/recovery" className="text-[#1B2850] hover:text-[#FF9F43] font-semibold underline text-[11px]">
              View Queue
            </Link>
          </div>
        </div>

        {/* Card 3: Scam Interceptions Logged */}
        <div className="dream-card p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <strong className="text-xl font-poppins font-bold text-[#1B2850] block">
                8,980 Logged
              </strong>
              <span className="text-xs font-nunito text-[#646B72]">Scam Interceptions</span>
            </div>
            <div className="w-10 h-10 rounded-[8px] bg-[#FFF4E8] text-[#FF9F43] flex items-center justify-center">
              <Target className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#E8EBED] text-xs font-nunito">
            <span className="text-[#05A677] font-bold">+41% vs Last Month</span>
            <Link href="/audit" className="text-[#1B2850] hover:text-[#FF9F43] font-semibold underline text-[11px]">
              View Ledger
            </Link>
          </div>
        </div>

        {/* Card 4: Frozen Mule Accounts */}
        <div className="dream-card p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <strong className="text-xl font-poppins font-bold text-[#1B2850] block">
                78 Mule Wallets
              </strong>
              <span className="text-xs font-nunito text-[#646B72]">Frozen in Ring-12</span>
            </div>
            <div className="w-10 h-10 rounded-[8px] bg-[#F0EEFF] text-[#6C5CE7] flex items-center justify-center">
              <Hash className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#E8EBED] text-xs font-nunito">
            <span className="text-[#FF0000] font-bold">-20% Mule Velocity</span>
            <Link href="/rings" className="text-[#1B2850] hover:text-[#FF9F43] font-semibold underline text-[11px]">
              View Ring-12
            </Link>
          </div>
        </div>

      </div>

      {/* ROW 3: Transaction Volume & Interceptions Chart (8 Cols) + Overall Operations Snapshot (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Monthly Protection Analytics (8 Cols) */}
        <div className="lg:col-span-8 dream-card p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8EBED]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[6px] bg-[#FFF4E8] text-[#FF9F43] flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-poppins font-bold text-base text-[#1B2850]">
                  Transaction Volume &amp; Interception Analytics
                </h3>
                <span className="text-[11px] text-[#646B72]">Festival Season Multiplier vs Baseline</span>
              </div>
            </div>

            {/* Time Filter Buttons (1D, 1W, 1M, 3M, 6M, 1Y) */}
            <div className="flex items-center gap-1 bg-[#F7F7F7] p-1 rounded-[6px] border border-[#E8EBED] text-xs font-nunito">
              {(['1D', '1W', '1M', '3M', '6M', '1Y'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setActiveChartRange(range)}
                  className={`px-2.5 py-1 rounded-[4px] font-bold transition-colors ${
                    activeChartRange === range
                      ? 'bg-[#FF9F43] text-white shadow-sm'
                      : 'text-[#646B72] hover:text-[#212B36]'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-Legend Stats */}
          <div className="flex items-center gap-6 text-xs font-nunito">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#05A677]"></span>
              <span className="text-[#646B72]">Clean Protected Volume</span>
              <strong className="text-[#1B2850] font-bold font-poppins">৳48.9M</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF9F43]"></span>
              <span className="text-[#646B72]">Interceptions &amp; Holds</span>
              <strong className="text-[#1B2850] font-bold font-poppins">৳8.4M</strong>
            </div>
          </div>

          {/* High-Fidelity Chart Representation (Jan - Dec) */}
          <div className="pt-4 h-[220px] flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-[#E8EBED]">
            {[
              { month: 'Jan', clean: 65, intercepted: 15 },
              { month: 'Feb', clean: 50, intercepted: 12 },
              { month: 'Mar', clean: 80, intercepted: 25 },
              { month: 'Apr (Eid)', clean: 95, intercepted: 32 },
              { month: 'May', clean: 70, intercepted: 18 },
              { month: 'Jun (Puja)', clean: 88, intercepted: 28 },
              { month: 'Jul', clean: 75, intercepted: 20 },
              { month: 'Aug', clean: 85, intercepted: 22 },
              { month: 'Sep', clean: 95, intercepted: 30 },
              { month: 'Oct', clean: 88, intercepted: 24 },
              { month: 'Nov', clean: 92, intercepted: 26 },
              { month: 'Dec', clean: 98, intercepted: 35 },
            ].map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                <div className="w-full max-w-[28px] flex items-end justify-center gap-1 h-[170px]">
                  {/* Clean Volume Bar (Teal) */}
                  <div
                    style={{ height: `${d.clean}%` }}
                    className="w-1/2 bg-[#05A677] rounded-t-[3px] group-hover:brightness-110 transition-all"
                    title={`${d.month} Clean: ৳${d.clean}M`}
                  ></div>
                  {/* Intercepted Bar (Orange) */}
                  <div
                    style={{ height: `${d.intercepted * 2.5}%` }}
                    className="w-1/2 bg-[#FF9F43] rounded-t-[3px] group-hover:brightness-110 transition-all"
                    title={`${d.month} Intercepted: ৳${d.intercepted}M`}
                  ></div>
                </div>
                <span className="text-[10px] sm:text-[11px] font-nunito text-[#646B72] font-semibold mt-1">
                  {d.month}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Overall Operations Snapshot (4 Cols) */}
        <div className="lg:col-span-4 dream-card p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-[#E8EBED]">
              <div className="w-2 h-2 rounded-full bg-[#1B75D0]"></div>
              <h3 className="font-poppins font-bold text-base text-[#1B2850]">
                Overall Operations Snapshot
              </h3>
            </div>

            {/* 3 Mini Stats Cards */}
            <div className="grid grid-cols-3 gap-2.5 pt-4">
              
              {/* Mule Rings */}
              <div className="p-3 bg-[#F7F7F7] border border-[#E8EBED] rounded-[6px] text-center space-y-1.5 hover:bg-[#FFFFFF] transition-colors">
                <div className="w-9 h-9 mx-auto rounded-full bg-[#FFEAE6] text-[#FF0000] flex items-center justify-center shadow-sm">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-nunito text-[#646B72] block">Mule Rings</span>
                <strong className="text-base font-poppins font-bold text-[#1B2850] block">12</strong>
              </div>

              {/* Protected Customers */}
              <div className="p-3 bg-[#F7F7F7] border border-[#E8EBED] rounded-[6px] text-center space-y-1.5 hover:bg-[#FFFFFF] transition-colors">
                <div className="w-9 h-9 mx-auto rounded-full bg-[#FFF0E5] text-[#FF9F43] flex items-center justify-center shadow-sm">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-nunito text-[#646B72] block">Customers</span>
                <strong className="text-base font-poppins font-bold text-[#1B2850] block">49.8K</strong>
              </div>

              {/* Verified MFS Agents */}
              <div className="p-3 bg-[#F7F7F7] border border-[#E8EBED] rounded-[6px] text-center space-y-1.5 hover:bg-[#FFFFFF] transition-colors">
                <div className="w-9 h-9 mx-auto rounded-full bg-[#E8F8F0] text-[#05A677] flex items-center justify-center shadow-sm">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-nunito text-[#646B72] block">MFS Outlets</span>
                <strong className="text-base font-poppins font-bold text-[#1B2850] block">6,987</strong>
              </div>

            </div>
          </div>

          {/* Quick Launchpad to upay Shield Modules */}
          <div className="pt-4 border-t border-[#E8EBED] space-y-2">
            <span className="text-[11px] font-poppins font-bold text-[#A0AEC0] uppercase tracking-wider block">
              Direct Module Launchpad
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs font-nunito">
              <Link
                href="/customer"
                className="p-2.5 rounded-[6px] bg-[#FFF4E8] text-[#FF9F43] font-bold border border-[#FFD8BF] flex items-center justify-between hover:bg-[#FFE7BA] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Customer Demo</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                href="/ussd"
                className="p-2.5 rounded-[6px] bg-[#1B2850]/5 text-[#1B2850] font-bold border border-[#E8EBED] flex items-center justify-between hover:bg-[#1B2850]/10 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  <span>USSD (*268#)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                href="/analyst"
                className="p-2.5 rounded-[6px] bg-[#FF0000]/5 text-[#FF0000] font-bold border border-[#FF0000]/20 flex items-center justify-between hover:bg-[#FF0000]/10 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Analyst Triage</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                href="/rings"
                className="p-2.5 rounded-[6px] bg-[#05A677]/5 text-[#05A677] font-bold border border-[#05A677]/20 flex items-center justify-between hover:bg-[#05A677]/10 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5" />
                  <span>Ring-12 Hub</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
