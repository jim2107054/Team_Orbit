'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, Plus, Shield, Bell, Maximize, 
  Settings, ChevronDown, ChevronLeft, ChevronRight, 
  Radio, Sun, Moon, Globe, Menu, X, Check, Sparkles,
  Zap, Activity, Sliders
} from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface UpayNavbarProps {
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const UpayNavbar: React.FC<UpayNavbarProps> = ({
  onToggleSidebar,
  isSidebarCollapsed = false,
  onToggleMobileMenu,
  isMobileMenuOpen = false,
}) => {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);
  const [activeHub, setActiveHub] = useState('Dhaka Central Hub');
  const [lang, setLang] = useState<'bn' | 'en'>('bn');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/investigations`);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <header 
      suppressHydrationWarning 
      className="sticky top-0 z-40 bg-white/85 dark:bg-[#07090E]/90 backdrop-blur-2xl border-b border-slate-200/80 dark:border-white/[0.08] h-[64px] flex items-center justify-between px-3 sm:px-4 lg:px-6 select-none transition-all duration-200 shadow-sm"
    >
      {/* Left: Mobile Menu + Logo & Sidebar Toggle & Global Search */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          title="Toggle Navigation Menu"
          aria-label="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5 text-slate-800 dark:text-slate-100" />
          ) : (
            <Menu className="w-5 h-5 text-slate-800 dark:text-slate-100" />
          )}
        </button>

        {/* Brand Logo - upay Shield */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="relative flex items-center justify-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF5500] via-[#FF7700] to-[#FFAA00] flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform duration-200">
              <Shield className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#07090E] animate-pulse"></span>
          </div>
          <div className="flex flex-col leading-none">
            <div className="flex items-baseline gap-1.5">
              <span className="font-outfit font-black text-[20px] text-slate-900 dark:text-white tracking-tight">
                upay
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-outfit font-black tracking-wider uppercase bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                Shield
              </span>
            </div>
            <span className="text-[9px] font-jakarta font-semibold text-slate-500 dark:text-slate-400 tracking-tight hidden sm:block">
              AI Trust &amp; Anti-Fraud Intelligence
            </span>
          </div>
        </Link>

        {/* Desktop Sidebar Collapse Button */}
        <button
          onClick={onToggleSidebar}
          className="hidden lg:flex w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/[0.05] hover:bg-orange-500 hover:text-slate-950 text-slate-600 dark:text-slate-300 border border-transparent dark:border-white/[0.06] items-center justify-center transition-all shadow-sm ml-1.5 cursor-pointer"
          title="Toggle Sidebar"
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 stroke-[2.2]" />
          ) : (
            <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
          )}
        </button>

        {/* Global Search Bar (Wallet, Phone, Txn ID ... ⌘K) */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center relative ml-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Wallet, Phone, Txn ID..."
            className="pl-8 pr-12 py-1.5 w-[220px] lg:w-[280px] bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs font-jakarta text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
          />
          <kbd className="absolute right-2.5 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-[9px] font-mono text-slate-500 dark:text-slate-400 font-semibold pointer-events-none">
            ⌘K
          </kbd>
        </form>
      </div>

      {/* Right: Actions, Hub Selector, Dark Mode Toggle, Alerts & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        
        {/* Hub Selector Dropdown */}
        <div className="relative hidden xl:block">
          <button
            onClick={() => setHubOpen(!hubOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs font-jakarta font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-colors shadow-sm cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{activeHub}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {hubOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-[#0E1119] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl py-1 z-50 animate-fadeIn text-xs font-jakarta backdrop-blur-2xl">
              {['Dhaka Central Hub', 'Chittagong Region', 'Sylhet Zone', 'Khulna MFS Division', 'Rajshahi Rural Hub'].map((hub) => (
                <button
                  key={hub}
                  onClick={() => {
                    setActiveHub(hub);
                    setHubOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-white/[0.06] flex items-center justify-between cursor-pointer ${
                    activeHub === hub ? 'text-orange-500 font-bold bg-orange-500/10' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{hub}</span>
                  {activeHub === hub && <Check className="w-3.5 h-3.5 text-orange-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Intro Tour Button */}
        <Link
          href="/"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/15 border border-orange-500/30 text-orange-500 dark:text-orange-400 font-outfit font-bold text-xs hover:bg-orange-500/20 transition-all cursor-pointer shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Platform Intro</span>
        </Link>

        {/* Action: Test Transaction */}
        <Link
          href="/customer"
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-[#E85D04] hover:bg-[#FF6600] text-white font-outfit font-bold rounded-full text-xs shadow-md shadow-orange-500/25 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Simulate Txn</span>
        </Link>

        {/* Action: USSD Dial (*268#) */}
        <Link
          href="/ussd"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-white/[0.05] hover:bg-slate-800 dark:hover:bg-white/[0.1] text-slate-100 rounded-full text-xs font-outfit font-semibold border border-slate-800 dark:border-white/[0.08] shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Radio className="w-3.5 h-3.5 text-orange-400" />
          <span>*268# USSD</span>
        </Link>

        {/* Language Selector */}
        <button
          onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08] hover:border-orange-500/50 transition-colors text-xs font-mono font-bold cursor-pointer"
          title={`Switch Language (Current: ${lang === 'bn' ? 'Bangla' : 'English'})`}
        >
          <Globe className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-[11px]">{lang.toUpperCase()}</span>
        </button>

        {/* Dark / Light Mode Switcher */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-white/[0.1] flex items-center justify-center border border-slate-200 dark:border-white/[0.08] transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="hidden lg:flex w-8 h-8 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/[0.05] items-center justify-center transition-colors cursor-pointer border border-transparent dark:border-white/[0.04]"
          title="Toggle Fullscreen"
        >
          <Maximize className="w-4 h-4" />
        </button>

        {/* Live Ring Alert Bell */}
        <Link href="/analyst" className="relative cursor-pointer" title="Active Triage Alerts">
          <div className="w-8 h-8 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] flex items-center justify-center transition-colors border border-transparent dark:border-white/[0.04]">
            <Bell className="w-4 h-4" />
          </div>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
        </Link>

        {/* Settings -> Telemetry */}
        <Link
          href="/fairness"
          className="hidden sm:flex w-8 h-8 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/[0.08] items-center justify-center transition-colors cursor-pointer border border-transparent dark:border-white/[0.04]"
          title="Model Fairness & Drift Telemetry"
        >
          <Settings className="w-4 h-4" />
        </Link>

        {/* User Profile Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/[0.1]">
          <div className="relative">
            <div suppressHydrationWarning className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-black/60 text-orange-400 font-outfit font-black text-xs flex items-center justify-center border border-orange-500/30 shadow-inner">
              OP
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-[#07090E]"></span>
          </div>
          <div className="hidden 2xl:block leading-none text-left">
            <span className="text-xs font-outfit font-bold text-slate-900 dark:text-slate-100 block">
              Ops Analyst
            </span>
            <span className="text-[10px] font-jakarta font-medium text-slate-500 dark:text-slate-400">
              L2 Fraud Officer
            </span>
          </div>
        </div>

      </div>
    </header>
  );
};
