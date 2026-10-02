'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search, Shield, Bell, ChevronDown, ChevronLeft, ChevronRight,
  Radio, Sun, Moon, Globe, Menu, X, Check, Share2, HelpCircle,
  Mail, ArrowLeft, ArrowRight, Plus,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface UpayNavbarProps {
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

/** Breadcrumb labels for every route in the shell */
const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/analyst': 'Analyst Triage',
  '/complaints': 'Complaint Intelligence',
  '/investigations': 'Investigation Desk',
  '/rings': 'Mule Ring Explorer',
  '/knowledge-graph': 'Intelligence Graph',
  '/campaigns': 'Scam Campaigns',
  '/propagation': 'District Spread',
  '/recovery': 'Golden-Hour Trace',
  '/customer': 'Customer App',
  '/ussd': 'USSD Engine',
  '/merchants': 'Merchant QR Shield',
  '/agent': 'Agent Guard',
  '/fairness': 'Fairness & Drift',
  '/audit': 'Audit Ledger',
  '/simulator': 'ROI Simulator',
};

const HUBS = [
  'Dhaka Central Hub',
  'Chittagong Region',
  'Sylhet Zone',
  'Khulna MFS Division',
  'Rajshahi Rural Hub',
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
  const [activeHub, setActiveHub] = useState(HUBS[0]);
  const [lang, setLang] = useState<'bn' | 'en'>('bn');
  const [searchQuery, setSearchQuery] = useState('');

  const crumb = useMemo(() => {
    const key = Object.keys(ROUTE_LABELS).find((k) => pathname?.startsWith(k));
    return key ? ROUTE_LABELS[key] : 'Overview';
  }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) router.push('/investigations');
  };

  return (
    <header
      suppressHydrationWarning
      className="h-[72px] shrink-0 flex items-center gap-3 px-3 sm:px-5 select-none"
    >
      {/* ── Brand block: aligns with the rail width ─────────────────── */}
      <div
        className={`flex items-center gap-2.5 shrink-0 transition-[width] duration-300 ${
          isSidebarCollapsed ? 'lg:w-[76px] lg:justify-center' : 'lg:w-[268px]'
        }`}
      >
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden fx-icon-btn"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        <Link href="/dashboard" className="flex items-center gap-2.5 group min-w-0">
          <span className="relative w-9 h-9 rounded-xl bg-flame-gradient flex items-center justify-center shadow-flame group-hover:scale-[1.04] transition-transform">
            <Shield className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
          </span>
          {!isSidebarCollapsed && (
            <span className="hidden lg:flex flex-col gap-0.5 min-w-0">
              <span className="font-display font-bold text-[17px] leading-none text-ink tracking-tight truncate">
                upay <span className="text-flame-500">Shield</span>
              </span>
              <span className="text-[10px] font-ui font-medium leading-none text-ink-dim truncate">
                AI Trust &amp; Anti-Fraud Intelligence
              </span>
            </span>
          )}
        </Link>
      </div>

      {/* ── History + breadcrumb ───────────────────────────────────── */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="hidden lg:flex fx-icon-btn"
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label="Toggle sidebar"
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className="hidden xl:flex items-center gap-1.5">
          <button onClick={() => router.back()} className="fx-icon-btn !w-8 !h-8" aria-label="Back">
            <ArrowLeft className="w-[15px] h-[15px]" />
          </button>
          <button onClick={() => router.forward()} className="fx-icon-btn !w-8 !h-8" aria-label="Forward">
            <ArrowRight className="w-[15px] h-[15px]" />
          </button>
        </div>

        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 ml-1 min-w-0">
          <Link
            href="/dashboard"
            className="text-[13px] font-ui text-ink-dim hover:text-ink transition-colors whitespace-nowrap shrink-0"
          >
            upay Shield
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-ink-dim shrink-0" />
          <span className="text-[13px] font-ui font-semibold text-ink truncate max-w-[26ch]">{crumb}</span>
        </nav>
      </div>

      <div className="flex-1" />

      {/* ── Right-hand controls ────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <form onSubmit={handleSearch} className="hidden 2xl:flex items-center relative">
          <Search className="w-[15px] h-[15px] text-ink-dim absolute left-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Wallet, phone or txn ID"
            className="fx-search pl-10 pr-4 py-2 w-[240px]"
          />
        </form>

        {/* Hub selector */}
        <div className="relative hidden xl:block">
          <button
            onClick={() => setHubOpen(!hubOpen)}
            className="fx-btn-ghost px-3 py-2 text-[12px]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="font-ui font-semibold">{activeHub}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-ink-dim transition-transform ${hubOpen ? 'rotate-180' : ''}`} />
          </button>

          {hubOpen && (
            <div className="absolute right-0 mt-2 w-56 fx-tooltip py-1.5 z-50 animate-fadeIn">
              {HUBS.map((hub) => (
                <button
                  key={hub}
                  onClick={() => { setActiveHub(hub); setHubOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 text-[12.5px] font-ui flex items-center justify-between hover:bg-elev transition-colors ${
                    activeHub === hub ? 'text-flame-500 font-bold' : 'text-ink-body'
                  }`}
                >
                  <span>{hub}</span>
                  {activeHub === hub && <Check className="w-3.5 h-3.5 text-flame-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <Link href="/ussd" className="hidden lg:flex fx-btn-ghost px-3 py-2 text-[12px]" title="USSD feature-phone shield">
          <Radio className="w-3.5 h-3.5 text-flame-500" />
          <span className="font-num font-semibold">*268#</span>
        </Link>

        <button
          onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
          className="fx-icon-btn"
          title={`Language: ${lang === 'bn' ? 'Bangla' : 'English'}`}
          aria-label="Switch language"
        >
          <span className="relative flex items-center justify-center">
            <Globe className="w-4 h-4" />
            <span className="absolute -bottom-2 font-num text-[7.5px] font-bold text-flame-500">
              {lang.toUpperCase()}
            </span>
          </span>
        </button>

        <Link href="/intro" className="hidden md:flex fx-icon-btn" title="Platform walkthrough">
          <HelpCircle className="w-4 h-4" />
        </Link>

        <Link href="/complaints" className="hidden md:flex fx-icon-btn" title="Complaint inbox">
          <Mail className="w-4 h-4" />
        </Link>

        <Link href="/analyst" className="fx-icon-btn relative" title="Active triage alerts">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger ring-2 ring-canvas" />
        </Link>

        <button
          onClick={toggleTheme}
          className="fx-icon-btn"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-ember-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Operator avatar */}
        <div className="flex items-center gap-2 pl-1.5">
          <span className="relative">
            <span
              suppressHydrationWarning
              className="w-9 h-9 rounded-full bg-elev border border-hair flex items-center justify-center font-display font-bold text-[12px] text-flame-500"
            >
              OP
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success ring-2 ring-canvas" />
          </span>
        </div>

        {/* Primary flame CTA */}
        <Link href="/customer" className="fx-btn-primary px-4 py-2 text-[12.5px] ml-0.5">
          <Plus className="w-3.5 h-3.5 hidden sm:block" strokeWidth={2.6} />
          <span className="hidden sm:inline">Simulate Txn</span>
          <Share2 className="w-3.5 h-3.5 sm:hidden" />
        </Link>
      </div>
    </header>
  );
};
