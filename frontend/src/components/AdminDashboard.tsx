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

interface DbStats {
  totalTxns: number;
  totalVolume: number;
  totalAlerts: number;
  totalRings: number;
  falsePositivesCount: number;
  falsePositivesRate: number;
  goldenHourRecovered: number;
  cleanVolume: number;
  cleanUssdVolume: number;
  cleanAppVolume: number;
  preventedLoss: number;
  activeHolds: number;
  scamInterceptions: number;
  muleWalletsCount: number;
  totalCustomers: number;
  totalOutlets: number;
  chartData: Array<{ month: string; clean: number; intercepted: number }>;
}

export const AdminDashboard: React.FC = () => {
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [activeChartRange, setActiveChartRange] = useState<'1D' | '1W' | '1M' | '3M' | '6M' | '1Y'>('1Y');
  const [dbStats, setDbStats] = useState<DbStats | null>(null);

  const fetchDashboardStats = (range: string = activeChartRange) => {
    fetch(`/api/v1/metrics/summary?range=${range}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDbStats(data);
        }
      })
      .catch((err) => console.error('Error loading dashboard summary stats from DB:', err));
  };

  useEffect(() => {
    fetchDashboardStats(activeChartRange);
  }, [activeChartRange]);

  const [dateRangeDropdown, setDateRangeDropdown] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState('26/09/2026 - 02/10/2026');

  // Dynamic Volume multiplier based on activeChartRange and DB
  const currentVolume = dbStats !== null
    ? `৳${Math.round(
        activeChartRange === '1D' ? (dbStats.totalVolume || 0) * 0.05
        : activeChartRange === '1W' ? (dbStats.totalVolume || 0) * 0.28
        : activeChartRange === '1M' ? (dbStats.totalVolume || 0) * 0.75
        : activeChartRange === '3M' ? (dbStats.totalVolume || 0) * 1.8
        : activeChartRange === '6M' ? (dbStats.totalVolume || 0) * 2.9
        : (dbStats.totalVolume || 0)
      ).toLocaleString()}`
    : '...';

  const displayTxns = dbStats !== null ? (dbStats.totalTxns || 0).toLocaleString() : '...';
  const displayAlerts = dbStats !== null ? (dbStats.totalAlerts || 0).toString() : '...';
  const displayRings = dbStats !== null ? (dbStats.totalRings || 0).toString() : '...';
  const displayFP = dbStats !== null 
    ? `${(dbStats.falsePositivesCount || 0).toLocaleString()} (${dbStats.falsePositivesRate || 0}%)` 
    : '...';
  const displayGoldenHour = dbStats !== null ? `৳${(dbStats.goldenHourRecovered || 0).toLocaleString()}` : '...';
  const displayCleanUssd = dbStats !== null ? `৳${(dbStats.cleanUssdVolume || 0).toLocaleString()}` : '...';
  const displayPreventedLoss = dbStats !== null ? `৳${(dbStats.preventedLoss || 0).toLocaleString()}` : '...';
  const displayActiveHolds = dbStats !== null ? `${dbStats.activeHolds || 0} Active Holds` : '...';
  const displayInterceptions = dbStats !== null ? `${(dbStats.scamInterceptions || 0).toLocaleString()} Logged` : '...';
  const displayMuleWallets = dbStats !== null ? `${dbStats.muleWalletsCount || 0} Mule Wallets` : '...';
  const displayCustomers = dbStats !== null ? (dbStats.totalCustomers || 0).toLocaleString() : '...';
  const displayOutlets = dbStats !== null ? (dbStats.totalOutlets || 0).toLocaleString() : '...';
  const displayCleanM = dbStats !== null ? `৳${((dbStats.cleanVolume || 0) / 1000000).toFixed(2)}M` : '৳0.00M';
  const displayInterceptedM = dbStats !== null ? `৳${((dbStats.preventedLoss || 0) / 1000000).toFixed(2)}M` : '৳0.00M';

  const chartData = dbStats?.chartData || [];

  return (
    <div className="space-y-6 pb-12 animate-fadeIn relative">
      
      {/* Top Welcome Title & FinTech Quick Action Controls (Sample 3) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Live Gateway SOC Telemetry
            </span>
            <span className="text-[11px] font-mono text-slate-500">Autonomous 2.4 Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-outfit font-black text-slate-900 dark:text-white tracking-tight mt-1.5">
            Executive Risk Operations Hub
          </h1>
          <p className="text-xs font-jakarta text-slate-600 dark:text-slate-400 mt-1">
            Real-time multi-tier defense: <span className="text-rose-500 font-mono font-bold">{displayAlerts}</span> active triage alerts &amp; <span className="text-emerald-500 font-mono font-bold">{displayTxns}</span> verified transactions under protection.
          </p>
        </div>

        {/* Quick Action Buttons (Sample 3 Style) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Interactive Date Filter Button */}
          <div className="relative">
            <button
              onClick={() => setDateRangeDropdown(!dateRangeDropdown)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-jakarta font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-sm transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-mono text-[11px]">{selectedDateRange}</span>
              <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dateRangeDropdown ? 'rotate-90' : ''}`} />
            </button>

            {dateRangeDropdown && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-1 z-50 animate-fadeIn text-xs font-jakarta backdrop-blur-xl">
                {[
                  { label: 'Today (Live Feed)', range: '02/10/2026 (Today)' },
                  { label: 'Last 7 Days (Active Cycle)', range: '26/09/2026 - 02/10/2026' },
                  { label: 'Last 30 Days (Monthly)', range: '02/09/2026 - 02/10/2026' },
                  { label: 'Current Quarter (Q3 2026)', range: '01/07/2026 - 02/10/2026' },
                  { label: 'Year to Date (2026 Full)', range: '01/01/2026 - 02/10/2026' }
                ].map((opt) => (
                  <button
                    key={opt.range}
                    onClick={() => {
                      setSelectedDateRange(opt.range);
                      setDateRangeDropdown(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center justify-between cursor-pointer ${
                      selectedDateRange === opt.range ? 'text-amber-500 font-bold bg-amber-500/10' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selectedDateRange === opt.range && <span className="text-[10px] text-amber-500 font-bold">●</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/audit"
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs font-jakarta font-semibold text-slate-700 dark:text-slate-300 hover:text-amber-500 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Export Audit</span>
          </Link>

          <Link
            href="/analyst"
            className="px-4 py-2 rounded-xl btn-flame text-xs font-outfit font-bold flex items-center gap-1.5 shadow-lg shadow-orange-500/25"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>+ Triage Alert</span>
          </Link>
        </div>
      </div>

      {/* Dismissable Warning Banner */}
      {!alertDismissed && (dbStats?.activeHolds ? dbStats.activeHolds > 0 : true) && (
        <div className="p-3.5 bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/30 rounded-xl text-xs font-jakarta flex items-center justify-between gap-3 shadow-sm animate-fadeIn backdrop-blur-md">
          <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>
              <strong className="font-outfit font-bold uppercase tracking-wide">Live Threat Advisory:</strong> {dbStats?.activeHolds || 0} active hold cases requiring compliance review (৳{((dbStats?.preventedLoss || 0)).toLocaleString()} prevented).{' '}
              <Link href="/analyst" className="underline font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500">
                Review Alert in Triage Queue →
              </Link>
            </span>
          </div>
          <button
            onClick={() => setAlertDismissed(true)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-amber-500/20 transition-colors cursor-pointer"
            title="Dismiss Advisory"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ROW 1: 4 Executive KPI Cards (Sample 3 FinTech Aesthetic) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Protected Volume */}
        <div className="upay-card p-5 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-jakarta font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Total Protected Volume
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              +22%
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <strong className="text-2xl lg:text-3xl font-mono font-black text-slate-900 dark:text-white tracking-tight">
              {currentVolume}
            </strong>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-jakarta flex items-center gap-1">
            <span className="text-emerald-500 font-bold">↑ ৳280k</span> vs previous cycle
          </div>
        </div>

        {/* Card 2: False Positives Avoided */}
        <div className="upay-card p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-jakarta font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              False Positives Avoided
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              -91.8%
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <strong className="text-2xl lg:text-3xl font-mono font-black text-slate-900 dark:text-white tracking-tight">
              {displayFP}
            </strong>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-jakarta flex items-center gap-1">
            <span className="text-emerald-500 font-bold">Zero</span> legitimate friction
          </div>
        </div>

        {/* Card 3: Golden-Hour Recovered */}
        <div className="upay-card p-5 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-jakarta font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Golden-Hour Recovered
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              +18%
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <strong className="text-2xl lg:text-3xl font-mono font-black text-slate-900 dark:text-white tracking-tight">
              {displayGoldenHour}
            </strong>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-jakarta flex items-center gap-1">
            <span className="text-emerald-500 font-bold">14m</span> avg freeze SLA
          </div>
        </div>

        {/* Card 4: Clean USSD & App Volume */}
        <div className="upay-card p-5 relative overflow-hidden group hover:border-sky-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-jakarta font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Clean USSD &amp; App Volume
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              +25%
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <strong className="text-2xl lg:text-3xl font-mono font-black text-slate-900 dark:text-white tracking-tight">
              {displayCleanUssd}
            </strong>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center border border-sky-500/20 group-hover:scale-110 transition-transform">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-jakarta flex items-center gap-1">
            <span className="text-sky-500 font-bold">99.8%</span> legitimate flow
          </div>
        </div>

      </div>

      {/* ROW 2: Main FinTech Split: Analytics Chart & Recent Activity (8 Cols) vs Executive Shield Card & Quota (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Volume & Interception Analytics Chart (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Main Chart Card (Sample 3 Style) */}
          <div className="upay-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-jakarta text-slate-500">Transaction Velocity &amp; Defense</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-mono font-bold border border-emerald-500/20">
                    Live Feed
                  </span>
                </div>
                <h3 className="font-outfit font-black text-xl text-slate-900 dark:text-white mt-0.5">
                  {currentVolume}
                </h3>
              </div>

              {/* Time Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono">
                {(['1D', '1W', '1M', '3M', '6M', '1Y'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setActiveChartRange(range)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      activeChartRange === range
                        ? 'bg-gradient-to-r from-amber-500 to-[#FF5E00] text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-Legend Stats */}
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-jakarta">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-700"></span>
                  <span className="text-slate-500 dark:text-slate-400">Normal Flow:</span>
                  <strong className="text-slate-900 dark:text-white font-bold font-mono">{displayCleanM}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="text-slate-500 dark:text-slate-400">Peak Threat Intercepted:</span>
                  <strong className="text-amber-500 font-bold font-mono">{displayInterceptedM}</strong>
                </div>
              </div>

              <span className="text-[11px] font-mono text-slate-400">Unit: Millions BDT (৳)</span>
            </div>

            {/* High-End Sleek Bar Chart (Matching Sample 3 with Glowing Apex Peak) */}
            <div className="pt-6 h-[240px] flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-slate-200/80 dark:border-slate-800 relative">
              {chartData.map((d, index) => {
                // Determine peak bar (e.g. index 3 or highest intercepted)
                const isPeak = index === 3;
                return (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                    
                    {/* Floating Value Tooltip Pill on Active / Peak Bar (Sample 3) */}
                    {isPeak && (
                      <div className="absolute -top-1 px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-black border border-amber-500/40 text-white font-mono text-[10px] font-bold shadow-xl shadow-orange-500/20 flex items-center gap-1 z-10 animate-bounce">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        <span>৳16,251</span>
                      </div>
                    )}

                    <div className="w-full max-w-[32px] sm:max-w-[40px] flex items-end justify-center h-[180px] relative">
                      {isPeak ? (
                        /* Glowing Active Bar with Flame Gradient and White Apex Dot */
                        <div
                          style={{ height: '82%' }}
                          className="w-full bg-gradient-to-t from-orange-600 via-amber-500 to-amber-300 rounded-t-xl transition-all shadow-[0_0_24px_rgba(255,94,0,0.55)] relative flex justify-center"
                        >
                          {/* Glowing White Dot at Apex */}
                          <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff] absolute top-1"></div>
                        </div>
                      ) : (
                        /* Normal Sleek Dark Bar */
                        <div
                          style={{ height: `${Math.min(90, Math.max(20, d.clean))}%` }}
                          className="w-full bg-slate-200 dark:bg-slate-800/80 rounded-t-xl group-hover:bg-slate-300 dark:group-hover:bg-slate-700/80 transition-all"
                        ></div>
                      )}
                    </div>

                    <span className={`text-[10px] sm:text-[11px] font-mono font-semibold transition-colors ${
                      isPeak ? 'text-amber-500 font-bold' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {d.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Incident Telemetry Table (Sample 3 Bottom Section) */}
          <div className="upay-card p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <h4 className="font-outfit font-bold text-sm text-slate-900 dark:text-white">
                  Real-time Interception Feed
                </h4>
              </div>
              <Link href="/analyst" className="text-xs font-jakarta font-semibold text-amber-500 hover:text-amber-400 flex items-center gap-1">
                <span>View All Cases</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-jakarta">
                <thead>
                  <tr className="text-slate-400 font-mono text-[10px] uppercase border-b border-slate-200/60 dark:border-slate-800">
                    <th className="pb-2 font-semibold">Incident ID</th>
                    <th className="pb-2 font-semibold">Target Account</th>
                    <th className="pb-2 font-semibold">Amount</th>
                    <th className="pb-2 font-semibold">Vector</th>
                    <th className="pb-2 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/60 font-mono text-[11px]">
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 font-bold text-slate-900 dark:text-white">TXN-98765A9</td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300">01712 •••• 891</td>
                    <td className="py-2.5 font-bold text-amber-500">৳25,000</td>
                    <td className="py-2.5 text-slate-400">USSD OTP Phish</td>
                    <td className="py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                        Intercepted
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 font-bold text-slate-900 dark:text-white">INV-56789LMN</td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300">01823 •••• 412</td>
                    <td className="py-2.5 font-bold text-slate-900 dark:text-white">৳12,450</td>
                    <td className="py-2.5 text-slate-400">Rapid Velocity</td>
                    <td className="py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        Under Hold
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 font-bold text-slate-900 dark:text-white">PAY-12345XYZ</td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300">01991 •••• 773</td>
                    <td className="py-2.5 font-bold text-emerald-500">৳1,500</td>
                    <td className="py-2.5 text-slate-400">Clean App P2P</td>
                    <td className="py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Verified Clean
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right: Executive MFS Card & Daily Quota Sentinel (4 Cols, Sample 1 & Sample 3) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Luxury Executive MFS Card Mockup (Sample 1 & Sample 3) */}
          <div className="relative rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-[#131722] to-[#0A0D15] border border-white/10 shadow-2xl shadow-black/60 text-white overflow-hidden group">
            {/* Ambient Warm Underglow */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-amber-500/20 to-orange-600/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-center justify-between relative z-10">
              {/* Contactless waves */}
              <div className="flex items-center gap-1 text-slate-400">
                <Radio className="w-5 h-5 text-amber-400" />
                <span className="text-[10px] font-mono tracking-widest uppercase">NFC / USSD</span>
              </div>
              <div className="text-right font-mono text-[11px] text-slate-400">
                <span>•••• 6541</span>
                <span className="block text-[9px] text-slate-500">12/28</span>
              </div>
            </div>

            {/* Chip & Masked Wallet */}
            <div className="my-6 flex items-center justify-between relative z-10">
              {/* Gold Chip */}
              <div className="w-10 h-8 rounded-md bg-gradient-to-br from-amber-300 via-amber-500 to-amber-600 p-1 flex items-center justify-center shadow-md">
                <div className="w-full h-full border border-amber-800/40 rounded-sm grid grid-cols-2 gap-0.5 opacity-80">
                  <div className="border-r border-b border-amber-800/40"></div>
                  <div className="border-b border-amber-800/40"></div>
                  <div className="border-r border-amber-800/40"></div>
                  <div></div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-jakarta text-slate-400 block uppercase">Shield Balance</span>
                <strong className="text-xl font-mono font-bold text-white tracking-tight">৳ 12,680.42</strong>
              </div>
            </div>

            {/* Card Holder & upay Brand */}
            <div className="flex items-end justify-between relative z-10 pt-2 border-t border-white/5">
              <div>
                <span className="text-[9px] font-jakarta text-slate-400 uppercase tracking-widest block">Card Holder Name</span>
                <strong className="text-xs font-outfit font-bold tracking-wider text-slate-200 uppercase">
                  upay Shield SOC Executive
                </strong>
              </div>
              <div className="text-right">
                <span className="font-outfit font-black text-lg text-amber-500 tracking-tighter">upay</span>
              </div>
            </div>
          </div>

          {/* Quick Action Pill Controls (Sample 3) */}
          <div className="upay-card p-4 space-y-3">
            <span className="text-[10px] font-outfit font-extrabold text-slate-400 uppercase tracking-widest block px-1">
              Rapid SOC Actions
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs font-jakarta font-semibold">
              <Link
                href="/analyst"
                className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-between hover:bg-amber-500/20 transition-all"
              >
                <span>+ Emergency Hold</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/rings"
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
              >
                <span>↗ Ring Freeze</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Daily Quota / Spending Limits (Sample 3) */}
          <div className="upay-card p-5 space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs font-jakarta text-slate-500 uppercase tracking-wider block">Protection Quota</span>
                <strong className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                  ৳1,200k used <span className="text-xs font-normal text-slate-500">from ৳2,000k limit</span>
                </strong>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-500">60%</span>
            </div>

            {/* Segmented Progress Bar (Sample 3) */}
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-0.5 p-0.5">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '27%' }}></div>
              <div className="h-full bg-orange-500 rounded-full" style={{ width: '35%' }}></div>
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '18%' }}></div>
              <div className="h-full bg-slate-600 rounded-full" style={{ width: '20%' }}></div>
            </div>

            {/* Category breakdown (Sample 3) */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-jakarta text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>P2P Wallets (27%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                <span>Agent Cashout (35%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Merchant QR (18%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                <span>Other USSD (20%)</span>
              </div>
            </div>
          </div>

          {/* Quick Launchpad to Modules */}
          <div className="upay-card p-5 space-y-3">
            <span className="text-[10px] font-outfit font-extrabold text-slate-400 uppercase tracking-widest block">
              Module Launchpad
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs font-jakarta font-semibold">
              <Link
                href="/customer"
                className="p-2.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center justify-between hover:bg-amber-500/20 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Customer App</span>
                </div>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <Link
                href="/ussd"
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-amber-500" />
                  <span>*268# USSD</span>
                </div>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
