'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert, ShieldCheck, RotateCcw, Clock,
  Calendar, X, AlertCircle, ChevronRight, ChevronDown,
  Sparkles, ArrowRight, Smartphone, Radio, MoreHorizontal,
  Activity, FileText, Network, Users, QrCode, Store,
  Search, SlidersHorizontal, TrendingUp,
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

type ChartRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y';

const RANGE_WEIGHT: Record<ChartRange, number> = {
  '1D': 0.05,
  '1W': 0.28,
  '1M': 0.75,
  '3M': 1.8,
  '6M': 2.9,
  '1Y': 1,
};

const DATE_PRESETS = [
  { label: 'Today (live feed)', range: '02/10/2026 (Today)' },
  { label: 'Last 7 days (active cycle)', range: '26/09/2026 - 02/10/2026' },
  { label: 'Last 30 days (monthly)', range: '02/09/2026 - 02/10/2026' },
  { label: 'Current quarter (Q3 2026)', range: '01/07/2026 - 02/10/2026' },
  { label: 'Year to date (2026 full)', range: '01/01/2026 - 02/10/2026' },
];

const FEED_ROWS = [
  {
    id: 'TXN-98765A9',
    account: '01712 •••• 891',
    amount: '৳25,000',
    amountTone: 'text-flame-500',
    vector: 'USSD OTP Phish',
    date: '02 Oct, 2026',
    time: '03:45 PM',
    status: 'Intercepted',
    tone: 'bg-danger/12 text-danger border-danger/25',
    dot: 'bg-danger',
  },
  {
    id: 'INV-56789LMN',
    account: '01823 •••• 412',
    amount: '৳12,450',
    amountTone: 'text-ink',
    vector: 'Rapid Velocity',
    date: '02 Oct, 2026',
    time: '02:18 PM',
    status: 'Under Hold',
    tone: 'bg-flame-500/12 text-flame-500 border-flame-500/25',
    dot: 'bg-flame-500',
  },
  {
    id: 'PAY-12345XYZ',
    account: '01991 •••• 773',
    amount: '৳1,500',
    amountTone: 'text-success',
    vector: 'Clean App P2P',
    date: '02 Oct, 2026',
    time: '01:02 PM',
    status: 'Verified Clean',
    tone: 'bg-success/12 text-success border-success/25',
    dot: 'bg-success',
  },
  {
    id: 'AGT-44120QRS',
    account: '01554 •••• 108',
    amount: '৳48,900',
    amountTone: 'text-flame-500',
    vector: 'Agent Cash-out Ring',
    date: '01 Oct, 2026',
    time: '11:36 AM',
    status: 'Frozen',
    tone: 'bg-iris/12 text-iris border-iris/25',
    dot: 'bg-iris',
  },
];

export const AdminDashboard: React.FC = () => {
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [activeChartRange, setActiveChartRange] = useState<ChartRange>('1Y');
  const [chartMode, setChartMode] = useState<'monthly' | 'yearly'>('yearly');
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [dateRangeDropdown, setDateRangeDropdown] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState('26/09/2026 - 02/10/2026');
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [feedQuery, setFeedQuery] = useState('');

  const fetchDashboardStats = (range: string = activeChartRange) => {
    fetch(`/api/v1/metrics/summary?range=${range}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setDbStats(data);
      })
      .catch((err) => console.error('Error loading dashboard summary stats from DB:', err));
  };

  useEffect(() => {
    fetchDashboardStats(activeChartRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChartRange]);

  /* ── Derived display values (unchanged contract with the backend) ── */

  const currentVolume = dbStats !== null
    ? `৳${Math.round((dbStats.totalVolume || 0) * RANGE_WEIGHT[activeChartRange]).toLocaleString()}`
    : '—';

  const displayTxns = dbStats !== null ? (dbStats.totalTxns || 0).toLocaleString() : '—';
  const displayAlerts = dbStats !== null ? (dbStats.totalAlerts || 0).toString() : '—';
  const displayFP = dbStats !== null
    ? `${(dbStats.falsePositivesCount || 0).toLocaleString()}`
    : '—';
  const displayFPRate = dbStats !== null ? `${dbStats.falsePositivesRate || 0}%` : '—';
  const displayGoldenHour = dbStats !== null ? `৳${(dbStats.goldenHourRecovered || 0).toLocaleString()}` : '—';
  const displayCleanUssd = dbStats !== null ? `৳${(dbStats.cleanUssdVolume || 0).toLocaleString()}` : '—';
  const displayCleanApp = dbStats !== null ? `৳${(dbStats.cleanAppVolume || 0).toLocaleString()}` : '—';
  const displayPreventedLoss = dbStats !== null ? `৳${(dbStats.preventedLoss || 0).toLocaleString()}` : '—';
  const displayInterceptions = dbStats !== null ? (dbStats.scamInterceptions || 0).toLocaleString() : '—';
  const displayCustomers = dbStats !== null ? (dbStats.totalCustomers || 0).toLocaleString() : '—';
  const displayOutlets = dbStats !== null ? (dbStats.totalOutlets || 0).toLocaleString() : '—';
  const displayCleanM = dbStats !== null ? `৳${((dbStats.cleanVolume || 0) / 1_000_000).toFixed(2)}M` : '৳0.00M';
  const displayInterceptedM = dbStats !== null ? `৳${((dbStats.preventedLoss || 0) / 1_000_000).toFixed(2)}M` : '৳0.00M';

  const chartData = dbStats?.chartData || [];

  /* Scale bars against the real maximum and focus the worst month */
  const chart = useMemo(() => {
    if (chartData.length === 0) return { bars: [], peakIndex: -1, axis: [] as number[] };

    const totals = chartData.map((d) => (d.clean || 0) + (d.intercepted || 0));
    const max = Math.max(...totals, 1);
    const peakIndex = chartData.reduce(
      (best, d, i) => ((d.intercepted || 0) > (chartData[best]?.intercepted || 0) ? i : best),
      0,
    );

    const bars = chartData.map((d, i) => ({
      month: d.month,
      clean: d.clean || 0,
      intercepted: d.intercepted || 0,
      total: totals[i],
      pct: Math.max(8, Math.round((totals[i] / max) * 100)),
    }));

    const step = max / 5;
    const axis = [5, 4, 3, 2, 1, 0].map((n) => Math.round(step * n));

    return { bars, peakIndex, axis };
  }, [chartData]);

  const focusIndex = hoveredBar ?? chart.peakIndex;

  const filteredFeed = useMemo(() => {
    const q = feedQuery.trim().toLowerCase();
    if (!q) return FEED_ROWS;
    return FEED_ROWS.filter((r) =>
      [r.id, r.account, r.vector, r.status].some((v) => v.toLowerCase().includes(q)),
    );
  }, [feedQuery]);

  const compact = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}k` : `${n}`;

  /** "1 ring" / "4 rings" — the raw counts are often 0 or 1 in a fresh seed */
  const plural = (count: number | undefined, one: string, many: string) =>
    `${(count ?? 0).toLocaleString()} ${count === 1 ? one : many}`;

  return (
    <div className="space-y-5 pb-4">

      {/* ── Overview header ──────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] sm:text-[31px] font-bold text-ink tracking-tight">
            Overview
          </h1>
          <p className="text-[13px] font-ui text-ink-muted mt-1">
            Real-time multi-tier defense ·{' '}
            <span className="font-num font-bold text-danger">{displayAlerts}</span> active triage alerts across{' '}
            <span className="font-num font-bold text-success">{displayTxns}</span> protected transactions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setDateRangeDropdown(!dateRangeDropdown)}
              className="fx-btn-ghost px-3.5 py-2 text-[12px]"
            >
              <Calendar className="w-3.5 h-3.5 text-flame-500" />
              <span className="font-num">{selectedDateRange}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-ink-dim transition-transform ${dateRangeDropdown ? 'rotate-180' : ''}`} />
            </button>

            {dateRangeDropdown && (
              <div className="absolute right-0 mt-2 w-64 fx-tooltip py-1.5 z-40 animate-fadeIn">
                {DATE_PRESETS.map((opt) => (
                  <button
                    key={opt.range}
                    onClick={() => { setSelectedDateRange(opt.range); setDateRangeDropdown(false); }}
                    className={`w-full text-left px-3.5 py-2 text-[12.5px] font-ui flex items-center justify-between hover:bg-elev transition-colors ${
                      selectedDateRange === opt.range ? 'text-flame-500 font-bold' : 'text-ink-body'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selectedDateRange === opt.range && <span className="text-flame-500 text-[10px]">●</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => fetchDashboardStats(activeChartRange)}
            className="fx-btn-ghost px-3.5 py-2 text-[12px]"
            title="Re-pull metrics from the risk engine"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Data</span>
          </button>

          <Link href="/audit" className="fx-btn-ghost px-3.5 py-2 text-[12px]">
            <FileText className="w-3.5 h-3.5" />
            <span>Export Audit</span>
          </Link>

          <Link href="/analyst" className="fx-btn-primary px-4 py-2 text-[12px]">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Triage Alert</span>
          </Link>
        </div>
      </div>

      {/* ── Threat advisory ──────────────────────────────────────────── */}
      {!alertDismissed && (dbStats?.activeHolds ? dbStats.activeHolds > 0 : true) && (
        <div className="flex items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-flame-500/[0.07] border border-flame-500/25 animate-fadeIn">
          <div className="flex items-start sm:items-center gap-2.5 text-[12.5px] font-ui text-ink-body min-w-0">
            <AlertCircle className="w-4 h-4 text-flame-500 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong className="font-display font-bold text-ink">Live threat advisory — </strong>
              <span className="font-num font-bold text-flame-500">{dbStats?.activeHolds ?? 0}</span> hold cases
              await compliance review, <span className="font-num font-bold">{displayPreventedLoss}</span> in loss
              already prevented.{' '}
              <Link href="/analyst" className="font-semibold text-flame-500 hover:text-flame-400 underline decoration-flame-500/40">
                Review the triage queue →
              </Link>
            </span>
          </div>
          <button
            onClick={() => setAlertDismissed(true)}
            className="fx-icon-btn !w-7 !h-7 shrink-0"
            title="Dismiss advisory"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Row 1: hero card + peer metric cards ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Hero: the single vivid card, as in the reference */}
        <div className="fx-card-hero flex flex-col">
          <div className="p-5 pb-4 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="fx-icon-tile">
                  <ShieldCheck className="w-[18px] h-[18px]" strokeWidth={2.2} />
                </span>
                <span className="flex flex-col leading-tight min-w-0">
                  <strong className="font-display font-bold text-[15px] text-white truncate">
                    Protected Volume
                  </strong>
                  <span className="text-[11.5px] font-ui text-white/80 truncate">
                    All channels · {activeChartRange}
                  </span>
                </span>
              </div>
              <MoreHorizontal className="w-4 h-4 text-white/70 shrink-0" />
            </div>

            <div className="mt-5 flex items-end gap-2.5 flex-wrap">
              <span className="fx-figure text-[26px] lg:text-[30px]">{currentVolume}</span>
              <span className="fx-delta mb-1">+22.0% ↑</span>
            </div>
          </div>

          <Link href="/simulator" className="fx-card-hero-foot">
            <span>See details</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Peer card: false positives */}
        <div className="fx-card flex flex-col">
          <div className="p-5 pb-4 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="fx-icon-tile"><RotateCcw className="w-[18px] h-[18px]" /></span>
                <span className="flex flex-col leading-tight min-w-0">
                  <strong className="font-display font-bold text-[15px] text-ink truncate">
                    False Positives
                  </strong>
                  <span className="text-[11.5px] font-ui text-ink-muted truncate">
                    Avoided friction · {displayFPRate}
                  </span>
                </span>
              </div>
              <MoreHorizontal className="w-4 h-4 text-ink-dim shrink-0" />
            </div>

            <div className="mt-5 flex items-end gap-2.5 flex-wrap">
              <span className="fx-figure text-[26px] lg:text-[30px]">{displayFP}</span>
              <span className="fx-delta mb-1 !text-success">−91.8% ↓</span>
            </div>
          </div>

          <Link href="/fairness" className="fx-card-foot">
            <span>View summary</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Peer card: golden-hour recovery */}
        <div className="fx-card flex flex-col">
          <div className="p-5 pb-4 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="fx-icon-tile"><Clock className="w-[18px] h-[18px]" /></span>
                <span className="flex flex-col leading-tight min-w-0">
                  <strong className="font-display font-bold text-[15px] text-ink truncate">
                    Golden-Hour Recovery
                  </strong>
                  <span className="text-[11.5px] font-ui text-ink-muted truncate">
                    14m average freeze SLA
                  </span>
                </span>
              </div>
              <MoreHorizontal className="w-4 h-4 text-ink-dim shrink-0" />
            </div>

            <div className="mt-5 flex items-end gap-2.5 flex-wrap">
              <span className="fx-figure text-[26px] lg:text-[30px]">{displayGoldenHour}</span>
              <span className="fx-delta mb-1 !text-success">+18.0% ↑</span>
            </div>
          </div>

          <Link href="/recovery" className="fx-card-foot">
            <span>Trace the money</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Peer card: interceptions */}
        <div className="fx-card flex flex-col">
          <div className="p-5 pb-4 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="fx-icon-tile"><ShieldAlert className="w-[18px] h-[18px]" /></span>
                <span className="flex flex-col leading-tight min-w-0">
                  <strong className="font-display font-bold text-[15px] text-ink truncate">
                    Scam Interceptions
                  </strong>
                  <span className="text-[11.5px] font-ui text-ink-muted truncate">
                    {plural(dbStats?.muleWalletsCount, 'mule wallet', 'mule wallets')} ·{' '}
                    {plural(dbStats?.totalRings, 'ring', 'rings')}
                  </span>
                </span>
              </div>
              <MoreHorizontal className="w-4 h-4 text-ink-dim shrink-0" />
            </div>

            <div className="mt-5 flex items-end gap-2.5 flex-wrap">
              <span className="fx-figure text-[26px] lg:text-[30px]">{displayInterceptions}</span>
              <span className="fx-delta mb-1">+25.0% ↑</span>
            </div>
          </div>

          <Link href="/analyst" className="fx-card-foot">
            <span>Analyze performance</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ── Row 2: channel wallet grid + cash-flow chart ─────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

        {/* Channel breakdown — the reference's "My Wallet" block */}
        <div className="xl:col-span-5 fx-card p-5">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="min-w-0">
              <h3 className="font-display font-bold text-[17px] text-ink">Channel Coverage</h3>
              <p className="text-[11.5px] font-ui text-ink-muted mt-0.5">
                Live exchange · 1 USD = <span className="font-num">122.20 BDT</span>
              </p>
            </div>
            <Link href="/merchants" className="fx-btn-primary px-3 py-1.5 text-[11.5px] shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Add New</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {[
              { icon: Smartphone, label: 'App P2P', value: displayCleanApp, limit: 'Clean app settlement', state: 'Active', tone: 'text-success' },
              { icon: Radio, label: 'USSD *268#', value: displayCleanUssd, limit: 'Feature-phone shield', state: 'Active', tone: 'text-success' },
              { icon: Store, label: 'Agent Outlets', value: displayOutlets, limit: 'Guarded cash-out points', state: 'Active', tone: 'text-success' },
              { icon: Users, label: 'Customers', value: displayCustomers, limit: 'Under active protection', state: 'Monitored', tone: 'text-flame-500' },
            ].map((ch) => (
              <div key={ch.label} className="p-4 rounded-2xl bg-elev border border-hair hover:border-flame-500/30 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-card border border-hair flex items-center justify-center shrink-0">
                      <ch.icon className="w-3.5 h-3.5 text-flame-500" />
                    </span>
                    <strong className="font-ui font-semibold text-[12.5px] text-ink truncate">{ch.label}</strong>
                  </span>
                  <MoreHorizontal className="w-3.5 h-3.5 text-ink-dim shrink-0" />
                </div>
                <strong className="block mt-3 font-display font-bold text-[19px] text-ink tracking-tight tabular-nums">
                  {ch.value}
                </strong>
                <span className="block mt-1 text-[10.5px] font-ui text-ink-dim">{ch.limit}</span>
                <span className={`block mt-1.5 text-[10.5px] font-ui font-bold ${ch.tone}`}>{ch.state}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cash-flow chart — reference bar chart with the flame focus column */}
        <div className="xl:col-span-7 fx-card p-5 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[12px] font-ui text-ink-muted">Transaction Velocity &amp; Defense</span>
              <h3 className="fx-figure text-[25px] lg:text-[29px] mt-0.5">{currentVolume}</h3>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-[11.5px] font-ui">
                <span className="flex items-center gap-1.5 text-ink-muted">
                  <span className="w-2 h-2 rounded-full bg-raise" />
                  Normal flow <strong className="font-num text-ink">{displayCleanM}</strong>
                </span>
                <span className="flex items-center gap-1.5 text-ink-muted">
                  <span className="w-2 h-2 rounded-full bg-flame-500" />
                  Intercepted <strong className="font-num text-flame-500">{displayInterceptedM}</strong>
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="fx-seg">
                <button
                  className="fx-seg-item"
                  data-active={chartMode === 'monthly'}
                  onClick={() => setChartMode('monthly')}
                >
                  Monthly
                </button>
                <button
                  className="fx-seg-item"
                  data-accent="true"
                  data-active={chartMode === 'yearly'}
                  onClick={() => setChartMode('yearly')}
                >
                  Yearly
                </button>
              </div>

              <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-elev border border-hair">
                {(['1D', '1W', '1M', '3M', '6M', '1Y'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setActiveChartRange(range)}
                    className={`px-2 py-1 rounded-full font-num text-[10.5px] font-bold transition-colors ${
                      activeChartRange === range
                        ? 'bg-flame-500 text-white'
                        : 'text-ink-dim hover:text-ink'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Plot */}
          <div className="mt-6 flex-1 flex gap-3 min-h-[250px]">
            {/* Y axis */}
            <div className="w-10 shrink-0 flex flex-col justify-between py-0.5 text-right">
              {chart.axis.map((v, i) => (
                <span key={i} className="font-num text-[10px] text-ink-dim leading-none">
                  {compact(v)}
                </span>
              ))}
            </div>

            {/* Bars */}
            <div className="relative flex-1 fx-grid-lines">
              <div className="absolute inset-0 flex items-end justify-between gap-1.5 sm:gap-2.5">
                {chart.bars.map((bar, i) => {
                  const isFocus = i === focusIndex;
                  return (
                    <div
                      key={bar.month}
                      className="group relative flex-1 h-full flex flex-col justify-end items-center"
                      onMouseEnter={() => setHoveredBar(i)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {/* Tooltip on the focused column — anchored beside the bar,
                          and clamped so a tall column can't push it into the controls */}
                      {isFocus && (
                        <div
                          className={`fx-tooltip absolute z-20 px-3 py-2 w-[158px] pointer-events-none ${
                            i > chart.bars.length - 3 ? 'right-full mr-2' : 'left-full ml-2'
                          }`}
                          style={{ bottom: `${Math.min(bar.pct, 64)}%` }}
                        >
                          <span className="block font-num text-[10px] text-ink-dim mb-1">
                            {bar.month} 2026
                          </span>
                          <span className="flex items-center justify-between gap-4 text-[11px]">
                            <span className="text-ink-muted">Clean</span>
                            <strong className="font-num text-ink">{compact(bar.clean)}</strong>
                          </span>
                          <span className="flex items-center justify-between gap-4 text-[11px] mt-0.5">
                            <span className="text-ink-muted">Intercepted</span>
                            <strong className="font-num text-flame-500">−{compact(bar.intercepted)}</strong>
                          </span>
                        </div>
                      )}

                      <div className="relative w-full max-w-[46px] flex justify-center" style={{ height: `${bar.pct}%` }}>
                        {isFocus && (
                          <span className="fx-bar-knob absolute -top-2 z-10" />
                        )}
                        <span className={`w-full h-full ${isFocus ? 'fx-bar-active' : 'fx-bar'}`} />
                      </div>
                    </div>
                  );
                })}

                {chart.bars.length === 0 && (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[12px] font-ui text-ink-dim">
                      Awaiting telemetry from the risk engine…
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* X axis */}
          <div className="flex gap-3 mt-2.5">
            <span className="w-10 shrink-0" />
            <div className="flex-1 flex items-center justify-between gap-1.5 sm:gap-2.5">
              {chart.bars.map((bar, i) => (
                <span
                  key={bar.month}
                  className={`flex-1 text-center font-num text-[10.5px] font-semibold transition-colors ${
                    i === focusIndex ? 'text-flame-500' : 'text-ink-dim'
                  }`}
                >
                  {bar.month}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: activity table + side rail ───────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

        <div className="xl:col-span-8 fx-card p-5 self-start">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="font-display font-bold text-[17px] text-ink">Recent Activities</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-[14px] h-[14px] text-ink-dim absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  value={feedQuery}
                  onChange={(e) => setFeedQuery(e.target.value)}
                  placeholder="Search"
                  aria-label="Search interception feed"
                  className="fx-search pl-9 pr-3 py-2 w-[150px] sm:w-[190px] !text-[12px]"
                />
              </div>
              <Link href="/analyst" className="fx-btn-ghost px-3 py-2 text-[12px]">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filter</span>
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="fx-table min-w-[600px]">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Incident ID</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th aria-label="Row actions" />
                </tr>
              </thead>
              <tbody>
                {filteredFeed.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-elev border border-hair flex items-center justify-center shrink-0">
                          <Activity className="w-3.5 h-3.5 text-flame-500" />
                        </span>
                        <span className="flex flex-col leading-tight min-w-0">
                          <strong className="font-ui font-semibold text-ink truncate">{row.vector}</strong>
                          <span className="font-num text-[10.5px] text-ink-dim">{row.account}</span>
                        </span>
                      </span>
                    </td>
                    <td className="font-num text-ink-muted whitespace-nowrap">{row.id}</td>
                    <td className="font-num text-ink-muted whitespace-nowrap">{row.date}</td>
                    <td className="font-num text-ink-muted whitespace-nowrap">{row.time}</td>
                    <td className={`font-num font-bold whitespace-nowrap ${row.amountTone}`}>{row.amount}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10.5px] font-ui font-bold whitespace-nowrap ${row.tone}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${row.dot}`} />
                        {row.status}
                      </span>
                    </td>
                    <td className="!text-right">
                      <Link href="/analyst" className="inline-flex text-ink-dim hover:text-flame-500 transition-colors" aria-label={`Open ${row.id}`}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}

                {filteredFeed.length === 0 && (
                  <tr>
                    <td colSpan={7} className="!py-10 text-center text-ink-dim">
                      No incident matches “{feedQuery}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side rail */}
        <div className="xl:col-span-4 space-y-4">

          {/* Protection quota */}
          <div className="fx-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="fx-eyebrow block">Protection Quota</span>
                <strong className="block mt-1.5 font-display font-bold text-[18px] text-ink">
                  ৳1,200k <span className="text-[12px] font-ui font-normal text-ink-muted">of ৳2,000k</span>
                </strong>
              </div>
              <span className="font-num text-[13px] font-bold text-success">60%</span>
            </div>

            <div className="mt-4 h-2 w-full rounded-full bg-elev overflow-hidden flex gap-0.5">
              <span className="h-full bg-flame-500" style={{ width: '27%' }} />
              <span className="h-full bg-ember-400" style={{ width: '35%' }} />
              <span className="h-full bg-success" style={{ width: '18%' }} />
              <span className="h-full bg-raise" style={{ width: '20%' }} />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] font-ui text-ink-muted">
              {[
                { c: 'bg-flame-500', l: 'P2P wallets (27%)' },
                { c: 'bg-ember-400', l: 'Agent cash-out (35%)' },
                { c: 'bg-success', l: 'Merchant QR (18%)' },
                { c: 'bg-raise', l: 'Other USSD (20%)' },
              ].map((s) => (
                <span key={s.l} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${s.c}`} />
                  {s.l}
                </span>
              ))}
            </div>
          </div>

          {/* Executive shield card mockup */}
          <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-white/10 text-white shadow-glass">
            <span className="absolute -top-14 -right-14 w-44 h-44 rounded-full bg-flame-500/20 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Radio className="w-[18px] h-[18px] text-flame-400" />
                <span className="font-num text-[9.5px] tracking-[0.18em] uppercase text-slate-400">
                  NFC / USSD
                </span>
              </span>
              <span className="text-right font-num text-[11px] text-slate-400 leading-tight">
                •••• 6541
                <span className="block text-[9px] text-slate-500">12/28</span>
              </span>
            </div>

            <div className="relative z-10 my-6 flex items-end justify-between gap-3">
              <span className="w-10 h-7 rounded-md bg-gradient-to-br from-ember-300 via-ember-400 to-ember-600 p-1 shadow-md">
                <span className="grid w-full h-full rounded-sm border border-ember-800/40 grid-cols-2 gap-0.5 opacity-80">
                  <span className="border-r border-b border-ember-800/40" />
                  <span className="border-b border-ember-800/40" />
                  <span className="border-r border-ember-800/40" />
                  <span />
                </span>
              </span>
              <span className="text-right">
                <span className="block text-[9.5px] font-ui uppercase tracking-wider text-slate-400">
                  Shield Balance
                </span>
                <strong className="font-display font-bold text-[20px] text-white tracking-tight tabular-nums">
                  ৳12,680.42
                </strong>
              </span>
            </div>

            <div className="relative z-10 pt-3 border-t border-white/10 flex items-end justify-between gap-3">
              <span>
                <span className="block text-[9px] font-ui uppercase tracking-[0.16em] text-slate-400">
                  Card Holder
                </span>
                <strong className="font-display text-[11.5px] font-bold uppercase tracking-wide text-slate-200">
                  Astha SOC Executive
                </strong>
              </span>
              <span className="font-display font-bold text-[17px] text-flame-500 tracking-tight">upay</span>
            </div>
          </div>

          {/* Module launchpad */}
          <div className="fx-card p-5">
            <span className="fx-eyebrow block mb-3">Module Launchpad</span>
            <div className="grid grid-cols-1 gap-2">
              {[
                { href: '/customer', label: 'Customer Safety App', icon: Smartphone },
                { href: '/ussd', label: 'USSD *268# Engine', icon: Radio },
                { href: '/rings', label: 'Mule Ring Topology', icon: Network },
                { href: '/merchants', label: 'Merchant QR Shield', icon: QrCode },
                { href: '/simulator', label: 'ROI & Impact Simulator', icon: TrendingUp },
              ].map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className="group flex items-center justify-between gap-2 p-2.5 rounded-xl bg-elev border border-hair text-[12.5px] font-ui font-semibold text-ink-body hover:border-flame-500/40 hover:text-flame-500 transition-colors"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <m.icon className="w-3.5 h-3.5 text-flame-500 shrink-0" />
                    <span className="truncate">{m.label}</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
