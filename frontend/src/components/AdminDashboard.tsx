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

        {/* Interactive Date Filter Button */}
        <div className="relative">
          <button
            onClick={() => setDateRangeDropdown(!dateRangeDropdown)}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#FFFFFF] border border-[#E8EBED] rounded-[6px] text-xs font-nunito font-semibold text-[#212B36] hover:bg-[#F7F7F7] shadow-sm transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-[#FF9F43]" />
            <span>{selectedDateRange}</span>
            <ChevronRight className={`w-3.5 h-3.5 text-[#646B72] transition-transform ${dateRangeDropdown ? 'rotate-90' : ''}`} />
          </button>

          {dateRangeDropdown && (
            <div className="absolute right-0 mt-1.5 w-56 bg-[#FFFFFF] border border-[#E8EBED] rounded-[6px] shadow-lg py-1 z-50 animate-fadeIn text-xs font-nunito">
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
                  className={`w-full text-left px-3.5 py-2 hover:bg-[#F7F7F7] flex items-center justify-between cursor-pointer ${
                    selectedDateRange === opt.range ? 'text-[#FF9F43] font-bold bg-[#FFF4E8]' : 'text-[#212B36]'
                  }`}
                >
                  <span>{opt.label}</span>
                  {selectedDateRange === opt.range && <span className="text-[10px]">●</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dismissable Warning Banner (Dynamic DB Alert Notification) */}
      {!alertDismissed && (dbStats?.activeHolds ? dbStats.activeHolds > 0 : true) && (
        <div className="p-3.5 bg-[#FFF2E8] border border-[#FFD8BF] rounded-[6px] text-xs font-nunito flex items-center justify-between gap-3 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2 text-[#D46B08]">
            <AlertCircle className="w-4 h-4 text-[#FF9F43] flex-shrink-0" />
            <span>
              <strong className="text-[#FF9F43] font-bold">Live Threat Alert:</strong> {dbStats?.activeHolds || 0} active hold cases requiring compliance review (৳{((dbStats?.preventedLoss || 0)).toLocaleString()} prevented).{' '}
              <Link href="/analyst" className="underline font-bold hover:text-[#D46B08]">Review Alert in Triage</Link>
            </span>
          </div>
          <button
            onClick={() => setAlertDismissed(true)}
            className="text-[#646B72] hover:text-[#212B36] p-1 rounded hover:bg-[#FFE7BA] transition-colors cursor-pointer"
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
                {currentVolume}
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
                {displayFP}
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
                {displayGoldenHour}
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
                {displayCleanUssd}
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
                {displayPreventedLoss}
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
                {displayActiveHolds}
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
                {displayInterceptions}
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
                {displayMuleWallets}
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
                  className={`px-2.5 py-1 rounded-[4px] font-bold transition-colors cursor-pointer ${
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
              <strong className="text-[#1B2850] font-bold font-poppins">{displayCleanM}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF9F43]"></span>
              <span className="text-[#646B72]">Interceptions &amp; Holds</span>
              <strong className="text-[#1B2850] font-bold font-poppins">{displayInterceptedM}</strong>
            </div>
          </div>

          {/* High-Fidelity Chart Representation from DB */}
          <div className="pt-4 h-[220px] flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-[#E8EBED]">
            {chartData.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                <div className="w-full max-w-[28px] flex items-end justify-center gap-1 h-[170px]">
                  {/* Clean Volume Bar (Teal) */}
                  <div
                    style={{ height: `${Math.min(100, Math.max(10, d.clean))}%` }}
                    className="w-1/2 bg-[#05A677] rounded-t-[3px] group-hover:brightness-110 transition-all"
                    title={`${d.month} Clean: ৳${d.clean}M`}
                  ></div>
                  {/* Intercepted Bar (Orange) */}
                  <div
                    style={{ height: `${Math.min(100, Math.max(5, d.intercepted * 2.2))}%` }}
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
                <strong className="text-base font-poppins font-bold text-[#1B2850] block">{displayRings}</strong>
              </div>

              {/* Protected Customers */}
              <div className="p-3 bg-[#F7F7F7] border border-[#E8EBED] rounded-[6px] text-center space-y-1.5 hover:bg-[#FFFFFF] transition-colors">
                <div className="w-9 h-9 mx-auto rounded-full bg-[#FFF0E5] text-[#FF9F43] flex items-center justify-center shadow-sm">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-nunito text-[#646B72] block">Customers</span>
                <strong className="text-base font-poppins font-bold text-[#1B2850] block">{displayCustomers}</strong>
              </div>

              {/* Verified MFS Agents & Outlets */}
              <div className="p-3 bg-[#F7F7F7] border border-[#E8EBED] rounded-[6px] text-center space-y-1.5 hover:bg-[#FFFFFF] transition-colors">
                <div className="w-9 h-9 mx-auto rounded-full bg-[#E8F8F0] text-[#05A677] flex items-center justify-center shadow-sm">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-nunito text-[#646B72] block">MFS Outlets</span>
                <strong className="text-base font-poppins font-bold text-[#1B2850] block">{displayOutlets}</strong>
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
