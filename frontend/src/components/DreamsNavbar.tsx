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
    <header className="sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#E8EBED] h-[64px] flex items-center justify-between px-4 lg:px-6 select-none shadow-[0px_2px_8px_0px_rgba(0,0,0,0.02)]">
      
      {/* Left: Logo & Sidebar Toggle & Search */}
      <div className="flex items-center gap-4">
        {/* Brand Logo - upay Shield */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative flex items-center justify-center">
            <div className="w-9 h-9 rounded-[8px] bg-gradient-to-tr from-[#FF9F43] to-[#FFB765] flex items-center justify-center shadow-md shadow-[#FF9F43]/20">
              <Shield className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
          </div>
          <div className="flex flex-col leading-none">
            <div className="flex items-baseline">
              <span className="font-poppins font-extrabold text-[19px] text-[#1B2850] tracking-tight">upay</span>
              <span className="text-[12px] font-poppins font-bold text-[#FF9F43] uppercase ml-1 tracking-wider">Shield</span>
            </div>
            <span className="text-[9px] font-nunito font-bold text-[#646B72] tracking-tight">AI Trust &amp; Anti-Fraud</span>
          </div>
        </Link>

        {/* Sidebar Collapse Button */}
        <button
          onClick={onToggleSidebar}
          className="w-6 h-6 rounded-full bg-[#FF9F43] hover:bg-[#f08e2f] text-white flex items-center justify-center transition-transform shadow-sm ml-1 cursor-pointer"
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
          <Search className="w-4 h-4 text-[#A0AEC0] absolute left-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Wallet, Phone (013...), Txn ID..."
            className="pl-9 pr-10 py-1.5 w-[240px] lg:w-[300px] bg-[#F7F7F7] border border-[#E8EBED] rounded-[6px] text-xs font-nunito text-[#212B36] placeholder-[#A0AEC0] focus:outline-none focus:border-[#FF9F43] focus:bg-[#FFFFFF] transition-all"
          />
          <button type="submit" className="absolute right-2 px-1.5 py-0.5 rounded-[4px] bg-[#E2E8F0] hover:bg-[#CBD5E1] text-[10px] font-mono text-[#646B72] font-semibold cursor-pointer">
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFFFF] border border-[#E8EBED] rounded-[6px] text-xs font-nunito font-semibold text-[#212B36] hover:bg-[#F7F7F7] transition-colors shadow-sm cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-[#05A677] animate-pulse"></span>
            <span>{activeHub}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#646B72]" />
          </button>

          {hubOpen && (
            <div className="absolute right-0 mt-1 w-52 bg-[#FFFFFF] border border-[#E8EBED] rounded-[6px] shadow-lg py-1 z-50 animate-fadeIn text-xs font-nunito">
              {['Dhaka Central Hub', 'Chittagong Region', 'Sylhet Zone', 'Khulna MFS Division', 'Rajshahi Rural Hub'].map((hub) => (
                <button
                  key={hub}
                  onClick={() => {
                    setActiveHub(hub);
                    setHubOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-[#F7F7F7] flex items-center justify-between cursor-pointer ${
                    activeHub === hub ? 'text-[#FF9F43] font-bold bg-[#FFF4E8]' : 'text-[#212B36]'
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
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FF9F43] hover:bg-[#f08e2f] text-white rounded-[6px] text-xs font-poppins font-semibold shadow-[0px_4px_12px_0px_rgba(255,159,67,0.30)] transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Test Transaction</span>
        </Link>

        {/* Action: USSD Dial (*268#) */}
        <Link
          href="/ussd"
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1B2850] hover:bg-[#131E3D] text-white rounded-[6px] text-xs font-poppins font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Radio className="w-3.5 h-3.5 text-[#FF9F43]" />
          <span>USSD (*268#)</span>
        </Link>

        {/* Language Flag Selector (🇧🇩 Bangla / 🇺🇸 English) */}
        <button
          onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
          className="w-8 h-8 rounded-[6px] hover:bg-[#F7F7F7] flex items-center justify-center text-sm border border-transparent hover:border-[#E8EBED] transition-colors cursor-pointer"
          title={`Language: ${lang === 'bn' ? 'বাংলা (Bangla)' : 'English'}`}
        >
          {lang === 'bn' ? '🇧🇩' : '🇺🇸'}
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="hidden md:flex w-8 h-8 rounded-[6px] text-[#646B72] hover:text-[#212B36] hover:bg-[#F7F7F7] items-center justify-center transition-colors cursor-pointer"
          title="Toggle Fullscreen"
        >
          <Maximize className="w-4 h-4" />
        </button>

        {/* Live Ring-12 Alert Badge */}
        <Link href="/analyst" className="relative cursor-pointer" title="Active Triage Alerts">
          <button className="w-8 h-8 rounded-[6px] text-[#646B72] hover:text-[#212B36] hover:bg-[#F7F7F7] flex items-center justify-center transition-colors cursor-pointer">
            <Bell className="w-4 h-4" />
          </button>
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FF0000] rounded-full ring-2 ring-white animate-ping"></span>
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FF0000] rounded-full ring-2 ring-white"></span>
        </Link>

        {/* Settings Gear -> Model & System Settings */}
        <Link
          href="/fairness"
          className="hidden sm:flex w-8 h-8 rounded-[6px] text-[#646B72] hover:text-[#212B36] hover:bg-[#F7F7F7] items-center justify-center transition-colors cursor-pointer"
          title="Model Fairness & Drift Telemetry"
        >
          <Settings className="w-4 h-4" />
        </Link>

        {/* User Profile Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#E8EBED]">
          <div className="relative">
            <div className="w-8 h-8 rounded-[6px] bg-[#1B2850] text-[#FF9F43] font-poppins font-bold text-xs flex items-center justify-center border border-[#E8EBED]">
              OP
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-[#05A677] rounded-full ring-2 ring-white"></span>
          </div>
          <div className="hidden lg:block leading-none text-left">
            <span className="text-xs font-poppins font-bold text-[#1B2850] block">Ops Analyst</span>
            <span className="text-[10px] font-nunito text-[#646B72]">Level 2 Fraud Officer</span>
          </div>
        </div>

      </div>
    </header>
  );
};
