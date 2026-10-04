'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search, Shield, Bell, ChevronDown, ChevronLeft, ChevronRight,
  Radio, Sun, Moon, Globe, Menu, X, Check, Sparkles,
  LifeBuoy, Mail, Plus, Settings, User, LogOut,
  Command, SlidersHorizontal,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface UpayNavbarProps {
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

/** Breadcrumb labels for every route in the shell */
const ROUTE_LABELS: Record<string, { label: string; group: string }> = {
  '/dashboard': { label: 'Executive Overview', group: 'Dashboard' },
  '/analyst': { label: 'Analyst Triage Desk', group: 'Threat Intel' },
  '/complaints': { label: 'Complaint Intelligence', group: 'Threat Intel' },
  '/investigations': { label: 'Incident Investigation', group: 'Threat Intel' },
  '/rings': { label: 'Mule Ring Topology', group: 'Graph & Rings' },
  '/knowledge-graph': { label: 'Intelligence Graph', group: 'Graph & Rings' },
  '/campaigns': { label: 'Scam Campaigns', group: 'Threat Intel' },
  '/propagation': { label: 'District Spread', group: 'Geospatial' },
  '/recovery': { label: 'Golden-Hour Trace', group: 'Rapid Action' },
  '/customer': { label: 'Customer App Guard', group: 'Channels' },
  '/ussd': { label: 'USSD Feature-Phone Engine', group: 'Channels' },
  '/merchants': { label: 'Merchant QR Shield', group: 'Channels' },
  '/agent': { label: 'Agent Guard Network', group: 'Channels' },
  '/fairness': { label: 'Fairness & Drift Monitor', group: 'Governance' },
  '/audit': { label: 'Immutable Audit Ledger', group: 'Governance' },
  '/simulator': { label: 'Attack & ROI Simulator', group: 'Simulation' },
};

const HUBS = [
  { id: 'dhaka', name: 'Dhaka Central Hub', short: 'Dhaka Hub', status: 'Optimal (12ms)' },
  { id: 'ctg', name: 'Chittagong Port Region', short: 'Chittagong', status: 'Optimal (18ms)' },
  { id: 'sylhet', name: 'Sylhet Remittance Zone', short: 'Sylhet', status: 'Optimal (22ms)' },
  { id: 'khulna', name: 'Khulna MFS Division', short: 'Khulna', status: 'Optimal (25ms)' },
  { id: 'rajshahi', name: 'Rajshahi Rural Gateway', short: 'Rajshahi', status: 'Optimal (29ms)' },
];

export const UpayNavbar: React.FC<UpayNavbarProps> = ({
  onToggleSidebar,
  isSidebarCollapsed = false,
  onToggleMobileMenu,
  isMobileMenuOpen = false,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const [hubOpen, setHubOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeHub, setActiveHub] = useState(HUBS[0]);
  const [lang, setLang] = useState<'bn' | 'en'>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const hubRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (hubRef.current && !hubRef.current.contains(e.target as Node)) {
        setHubOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const routeInfo = useMemo(() => {
    const key = Object.keys(ROUTE_LABELS).find((k) => pathname?.startsWith(k));
    return key ? ROUTE_LABELS[key] : { label: 'Overview', group: 'Console' };
  }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/investigations?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header
      suppressHydrationWarning
      className="h-[68px] shrink-0 border-b border-hair/80 bg-canvas/90 backdrop-blur-md flex items-center justify-between px-3 sm:px-6 select-none z-30 transition-colors"
    >
      {/* ── Left: Brand + Sidebar Toggle + Breadcrumb ───────────────── */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {/* Mobile menu trigger */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden fx-icon-btn !w-9 !h-9"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        {/* Brand identity */}
        <div
          className={`flex items-center gap-3 transition-[width] duration-300 shrink-0 ${
            isSidebarCollapsed ? 'lg:w-[52px]' : 'lg:w-[240px]'
          }`}
        >
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <Image
              src="/brand/astha-mark.png"
              alt="Astha"
              width={36}
              height={36}
              priority
              className="w-9 h-9 object-contain group-hover:scale-105 transition-transform shrink-0"
            />
            {!isSidebarCollapsed && (
              <div className="hidden lg:flex flex-col min-w-0 leading-tight">
                <span className="font-display font-bold text-[16px] text-ink tracking-tight truncate">
                  Astha
                </span>
                <span className="text-[10px] font-ui font-medium text-ink-dim tracking-wider uppercase truncate">
                  Anti-Fraud Intelligence
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Sidebar Collapse Button (Desktop) */}
        <button
          onClick={onToggleSidebar}
          className="hidden lg:flex fx-icon-btn !w-8 !h-8 text-ink-dim hover:text-ink shrink-0"
          title={isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-label="Toggle sidebar"
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Clean, subtle divider */}
        <div className="hidden md:block w-px h-5 bg-hair shrink-0" />

        {/* Breadcrumb Hierarchy */}
        <div className="hidden md:flex items-center gap-2 min-w-0 text-[13px] font-ui">
          <span className="text-ink-dim hover:text-ink transition-colors shrink-0">
            {routeInfo.group}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-ink-dim/60 shrink-0" />
          <span className="font-semibold text-ink truncate max-w-[200px] lg:max-w-[280px]">
            {routeInfo.label}
          </span>
          <span className="hidden xl:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 border border-success/20 text-[10.5px] font-ui font-semibold text-success shrink-0 ml-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Live Feed
          </span>
        </div>
      </div>

      {/* ── Center / Right: Global Search ────────────────────────────── */}
      <div className="hidden lg:flex items-center flex-1 max-w-[360px] xl:max-w-[420px] mx-4">
        <form onSubmit={handleSearch} className="w-full relative">
          <Search className="w-4 h-4 text-ink-dim absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search wallet, txn ID, phone or alert..."
            className="w-full bg-card/70 hover:bg-card focus:bg-card border border-hair hover:border-hairbold focus:border-flame-500/60 text-ink text-[12.5px] font-ui rounded-xl pl-9 pr-14 py-2 outline-none transition-all placeholder:text-ink-dim/70 shadow-sm focus:ring-2 focus:ring-flame-500/15"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-num font-semibold text-ink-dim bg-elev border border-hair rounded">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </form>
      </div>

      {/* ── Right: Structured Action Hub & User Profile ───────────────── */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Hub Selector */}
        <div ref={hubRef} className="relative hidden sm:block">
          <button
            onClick={() => setHubOpen(!hubOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-hair hover:border-hairbold text-ink text-[12px] font-ui font-medium transition-all shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
            <span className="font-semibold truncate max-w-[130px]">{activeHub.short}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-ink-dim transition-transform ${hubOpen ? 'rotate-180' : ''}`} />
          </button>

          {hubOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-panel border border-hair shadow-glass py-2 z-50 animate-fadeIn">
              <div className="px-3.5 py-1.5 border-b border-hairsoft text-[10.5px] font-ui font-semibold text-ink-dim uppercase tracking-wider">
                Select MFS Processing Node
              </div>
              <div className="p-1 space-y-0.5">
                {HUBS.map((hub) => (
                  <button
                    key={hub.id}
                    onClick={() => { setActiveHub(hub); setHubOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-[12.5px] font-ui flex items-center justify-between hover:bg-elev transition-colors ${
                      activeHub.id === hub.id ? 'bg-flame-500/10 text-flame-500 font-bold' : 'text-ink-body'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span>{hub.name}</span>
                      <span className="text-[10.5px] text-ink-dim font-normal">{hub.status}</span>
                    </div>
                    {activeHub.id === hub.id && <Check className="w-4 h-4 text-flame-500 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* USSD *268# Quick Access */}
        <Link
          href="/ussd"
          className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-elev border border-hair hover:border-hairbold text-[12px] font-ui font-semibold text-ink transition-all shadow-sm group"
          title="Open USSD Feature-Phone Shield"
        >
          <Radio className="w-3.5 h-3.5 text-flame-500 group-hover:scale-110 transition-transform" />
          <span className="font-num text-flame-500">*268#</span>
          <span className="text-ink-dim text-[11px] font-normal">Engine</span>
        </Link>

        {/* Primary CTA: Simulate Txn */}
        <Link
          href="/customer"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-flame-gradient hover:opacity-95 active:scale-95 text-white font-ui font-bold text-[12.5px] shadow-flame transition-all"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.6} />
          <span className="hidden sm:inline">Simulate Txn</span>
        </Link>

        {/* Utility Separator */}
        <div className="w-px h-5 bg-hair mx-0.5 hidden sm:block shrink-0" />

        {/* Quick Toggles: Alerts & Theme */}
        <div className="flex items-center gap-1">
          <Link
            href="/analyst"
            className="fx-icon-btn relative !w-8 !h-8"
            title="4 Unresolved High-Risk Alerts"
            aria-label="Alerts"
          >
            <Bell className="w-4 h-4 text-ink-muted" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger ring-2 ring-canvas animate-ping" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger ring-2 ring-canvas" />
          </Link>

          <button
            onClick={toggleTheme}
            className="fx-icon-btn !w-8 !h-8"
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-ink-muted" />
            )}
          </button>
        </div>

        {/* User Profile Avatar with Popover */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-elev border border-transparent hover:border-hair transition-all"
            aria-label="User profile menu"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-elev border border-hair flex items-center justify-center font-display font-bold text-[11.5px] text-flame-500 shadow-sm">
                OP
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success ring-2 ring-canvas" />
            </div>
            <ChevronDown className="w-3 h-3 text-ink-dim hidden md:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-panel border border-hair shadow-glass py-2 z-50 animate-fadeIn">
              {/* Profile Card Header */}
              <div className="px-4 py-2.5 border-b border-hairsoft flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-flame-500/10 border border-flame-500/30 flex items-center justify-center font-display font-bold text-[13px] text-flame-500">
                  OP
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-ui font-bold text-[13px] text-ink leading-tight truncate">
                    Lead Fraud Analyst
                  </p>
                  <p className="text-[11px] font-ui text-success font-medium flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    Duty: Level-3 SOC
                  </p>
                </div>
              </div>

              {/* Navigation & Utilities */}
              <div className="p-1.5 space-y-0.5 text-[12.5px] font-ui">
                <Link
                  href="/intro"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-ink-body hover:text-ink hover:bg-elev transition-colors"
                >
                  <LifeBuoy className="w-4 h-4 text-ink-dim" />
                  <span>Platform Walkthrough</span>
                </Link>

                <Link
                  href="/complaints"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-ink-body hover:text-ink hover:bg-elev transition-colors"
                >
                  <Mail className="w-4 h-4 text-ink-dim" />
                  <span>Complaint Intelligence</span>
                </Link>

                <Link
                  href="/fairness"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-ink-body hover:text-ink hover:bg-elev transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4 text-ink-dim" />
                  <span>Model Governance</span>
                </Link>

                {/* Language Switch */}
                <button
                  onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-ink-body hover:text-ink hover:bg-elev transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-4 h-4 text-ink-dim" />
                    <span>Language</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-elev border border-hair text-flame-500 uppercase font-num">
                    {lang === 'bn' ? 'বাংলা' : 'English'}
                  </span>
                </button>
              </div>

              {/* Sign out / Landing page */}
              <div className="pt-1 mt-1 border-t border-hairsoft px-1.5">
                <Link
                  href="/"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-danger hover:bg-danger/10 transition-colors text-[12.5px] font-ui font-medium"
                >
                  <LogOut className="w-4 h-4 text-danger" />
                  <span>Exit to Public Showcase</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

