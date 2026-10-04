'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, Plus, Shield, Bell, Mail, Maximize, 
  Settings, ChevronDown, ChevronLeft, ChevronRight, Radio, PhoneCall
} from 'lucide-react';

interface DreamsNavbarProps {
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export const DreamsNavbar: React.FC<DreamsNavbarProps> = ({
  onToggleSidebar,
  isSidebarCollapsed = false,
}) => {
  const router = useRouter();
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
    <header className="sticky top-0 z-40 bg-card border-b border-hairsoft h-[64px] flex items-center justify-between px-4 lg:px-6 select-none shadow-[0px_2px_8px_0px_rgba(0,0,0,0.02)]">
      
      {/* Left: Logo & Sidebar Toggle & Search */}
      <div className="flex items-center gap-4">
        {/* Brand Logo - Astha */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative flex items-center justify-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-flame-500 to-ember-300 flex items-center justify-center shadow-md shadow-flame-500/20">
              <Shield className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
          </div>
          <div className="flex flex-col leading-none">
            <div className="flex items-baseline">
              <span className="font-display font-extrabold text-[19px] text-ink tracking-tight">Astha</span>
            </div>
            <span className="text-[9px] font-ui font-bold text-ink-muted tracking-tight">AI Trust &amp; Anti-Fraud</span>
          </div>
        </Link>

        {/* Sidebar Collapse Button */}
        <button
          onClick={onToggleSidebar}
          className="w-6 h-6 rounded-full bg-flame-500 hover:bg-ember-500 text-white flex items-center justify-center transition-transform shadow-sm ml-1 cursor-pointer"
          title="Toggle Navigation"
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
          )}
        </button>

        {/* Global Search Bar (Wallet, Phone, Txn ID ... ⌘K) */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center relative ml-2">
          <Search className="w-4 h-4 text-ink-dim absolute left-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Wallet, Phone (013...), Txn ID..."
            className="pl-9 pr-10 py-1.5 w-[240px] lg:w-[300px] bg-elev border border-hairsoft rounded-xl text-xs font-ui text-ink placeholder-ink-dim focus:outline-none focus:border-flame-500 focus:bg-card transition-all"
          />
          <button type="submit" className="absolute right-2 px-1.5 py-0.5 rounded-lg bg-raise hover:bg-hairbold text-[10px] font-num text-ink-muted font-semibold cursor-pointer">
            ↵
          </button>
        </form>
      </div>

      {/* Right: Actions, Hub Selector, Alerts & User Profile */}
      <div className="flex items-center gap-2.5 lg:gap-3">
        
        {/* Hub Selector Dropdown */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => setHubOpen(!hubOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-hairsoft rounded-xl text-xs font-ui font-semibold text-ink hover:bg-elev transition-colors shadow-sm cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
            <span>{activeHub}</span>
            <ChevronDown className="w-3.5 h-3.5 text-ink-muted" />
          </button>

          {hubOpen && (
            <div className="absolute right-0 mt-1 w-52 bg-card border border-hairsoft rounded-xl shadow-lg py-1 z-50 animate-fadeIn text-xs font-ui">
              {['Dhaka Central Hub', 'Chittagong Region', 'Sylhet Zone', 'Khulna MFS Division', 'Rajshahi Rural Hub'].map((hub) => (
                <button
                  key={hub}
                  onClick={() => {
                    setActiveHub(hub);
                    setHubOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-elev flex items-center justify-between cursor-pointer ${
                    activeHub === hub ? 'text-flame-500 font-bold bg-flame-50' : 'text-ink'
                  }`}
                >
                  <span>{hub}</span>
                  {activeHub === hub && <span className="text-[10px]">●</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action: Test Scenario / Check Scam */}
        <Link
          href="/customer"
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-flame-500 hover:bg-ember-500 text-white rounded-xl text-xs font-display font-semibold shadow-[0px_4px_12px_0px_rgba(255,159,67,0.30)] transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Test Transaction</span>
        </Link>

        {/* Action: USSD Dial (*268#) */}
        <Link
          href="/ussd"
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-inverse hover:bg-inverse-hi text-white rounded-xl text-xs font-display font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Radio className="w-3.5 h-3.5 text-flame-500" />
          <span>USSD (*268#)</span>
        </Link>

        {/* Language Selector (Bangla / English) */}
        <button
          onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
          className="px-2 py-1 rounded-xl hover:bg-elev flex items-center justify-center text-xs font-num font-bold text-ink-muted border border-transparent hover:border-hairsoft transition-colors cursor-pointer"
          title={`Language: ${lang === 'bn' ? 'Bangla' : 'English'}`}
        >
          {lang === 'bn' ? 'BN' : 'EN'}
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="hidden md:flex w-8 h-8 rounded-xl text-ink-muted hover:text-ink hover:bg-elev items-center justify-center transition-colors cursor-pointer"
          title="Toggle Fullscreen"
        >
          <Maximize className="w-4 h-4" />
        </button>

        {/* Live Ring-12 Alert Badge */}
        <Link href="/analyst" className="relative cursor-pointer" title="Active Triage Alerts">
          <button className="w-8 h-8 rounded-xl text-ink-muted hover:text-ink hover:bg-elev flex items-center justify-center transition-colors cursor-pointer">
            <Bell className="w-4 h-4" />
          </button>
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-danger rounded-full ring-2 ring-white animate-ping"></span>
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-danger rounded-full ring-2 ring-white"></span>
        </Link>

        {/* Settings Gear -> Model & System Settings */}
        <Link
          href="/fairness"
          className="hidden sm:flex w-8 h-8 rounded-xl text-ink-muted hover:text-ink hover:bg-elev items-center justify-center transition-colors cursor-pointer"
          title="Model Fairness & Drift Telemetry"
        >
          <Settings className="w-4 h-4" />
        </Link>

        {/* User Profile Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-hairsoft">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-inverse text-flame-500 font-display font-bold text-xs flex items-center justify-center border border-hairsoft">
              OP
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-success rounded-full ring-2 ring-white"></span>
          </div>
          <div className="hidden lg:block leading-none text-left">
            <span className="text-xs font-display font-bold text-ink block">Ops Analyst</span>
            <span className="text-[10px] font-ui text-ink-muted">Level 2 Fraud Officer</span>
          </div>
        </div>

      </div>
    </header>
  );
};
