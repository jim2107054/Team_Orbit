'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, ShieldAlert, Network, Clock, BarChart3, 
  Users, Smartphone, FileText, Shield, Radio, ChevronDown, 
  ChevronRight, Sparkles, Activity, AlertTriangle
} from 'lucide-react';

interface DreamsSidebarProps {
  isCollapsed?: boolean;
}

export const DreamsSidebar: React.FC<DreamsSidebarProps> = ({ isCollapsed = false }) => {
  const pathname = usePathname();
  const [dashboardOpen, setDashboardOpen] = useState(true);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [governanceOpen, setGovernanceOpen] = useState(true);

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <aside
      className={`bg-[#FFFFFF] border-r border-[#E8EBED] flex flex-col justify-between select-none transition-all duration-300 ${
        isCollapsed ? 'w-[72px]' : 'w-[255px]'
      } min-h-[calc(100vh-64px)] shadow-[2px_0px_10px_0px_rgba(0,0,0,0.01)]`}
    >
      <div className="py-4 overflow-y-auto max-h-[calc(100vh-64px)]">
        
        {/* Section 1: CORE OPERATIONS & TRIAGE */}
        <div className="px-4 mb-2">
          {!isCollapsed && (
            <span className="text-[11px] font-poppins font-bold text-[#A0AEC0] uppercase tracking-wider block mb-2">
              Fraud Operations
            </span>
          )}

          {/* Executive Dashboard Group */}
          <div>
            <Link
              href="/"
              className={`w-full flex items-center justify-between p-2.5 rounded-[6px] text-xs font-nunito font-bold transition-colors ${
                isActive('/')
                  ? 'bg-[#FFF4E8] text-[#FF9F43]'
                  : 'text-[#646B72] hover:bg-[#F7F7F7] hover:text-[#212B36]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className={`w-4 h-4 ${isActive('/') ? 'text-[#FF9F43]' : 'text-[#646B72]'}`} />
                {!isCollapsed && <span>Executive Dashboard</span>}
              </div>
              {!isCollapsed && isActive('/') && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF9F43]"></span>
              )}
            </Link>
          </div>

          {/* Analyst Triage Hub */}
          <div className="mt-1">
            <Link
              href="/analyst"
              className={`w-full flex items-center justify-between p-2.5 rounded-[6px] text-xs font-nunito font-bold transition-colors ${
                isActive('/analyst')
                  ? 'bg-[#FFF4E8] text-[#FF9F43]'
                  : 'text-[#646B72] hover:bg-[#F7F7F7] hover:text-[#212B36]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className={`w-4 h-4 ${isActive('/analyst') ? 'text-[#FF9F43]' : 'text-[#646B72]'}`} />
                {!isCollapsed && <span>Analyst Triage Hub</span>}
              </div>
              {!isCollapsed && (
                <span className="px-1.5 py-0.5 rounded-[4px] bg-[#FF0000]/10 text-[#FF0000] text-[9px] font-mono font-bold">
                  SLA 15m
                </span>
              )}
            </Link>
          </div>

          {/* Ring-12 Mule Network Explorer */}
          <div className="mt-1">
            <Link
              href="/rings"
              className={`w-full flex items-center justify-between p-2.5 rounded-[6px] text-xs font-nunito font-bold transition-colors ${
                isActive('/rings')
                  ? 'bg-[#FFF4E8] text-[#FF9F43]'
                  : 'text-[#646B72] hover:bg-[#F7F7F7] hover:text-[#212B36]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Network className={`w-4 h-4 ${isActive('/rings') ? 'text-[#FF9F43]' : 'text-[#646B72]'}`} />
                {!isCollapsed && <span>Ring-12 Explorer</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[10px] text-[#A0AEC0]">Graph</span>
              )}
            </Link>
          </div>

          {/* Golden-Hour Recovery Trace */}
          <div className="mt-1">
            <Link
              href="/recovery"
              className={`w-full flex items-center justify-between p-2.5 rounded-[6px] text-xs font-nunito font-bold transition-colors ${
                isActive('/recovery')
                  ? 'bg-[#FFF4E8] text-[#FF9F43]'
                  : 'text-[#646B72] hover:bg-[#F7F7F7] hover:text-[#212B36]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className={`w-4 h-4 ${isActive('/recovery') ? 'text-[#FF9F43]' : 'text-[#646B72]'}`} />
                {!isCollapsed && <span>Golden-Hour Trace</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[10px] text-[#05A677] font-bold">Auto-Hold</span>
              )}
            </Link>
          </div>
        </div>

        {/* Section 2: TRANSACTION & INTERCEPTION CHANNELS */}
        <div className="px-4 my-3 pt-3 border-t border-[#E8EBED]">
          {!isCollapsed && (
            <span className="text-[11px] font-poppins font-bold text-[#A0AEC0] uppercase tracking-wider block mb-2">
              Protection Channels
            </span>
          )}

          <div className="space-y-1">
            {/* Customer Mobile Demo */}
            <Link
              href="/customer"
              className={`w-full flex items-center justify-between p-2.5 rounded-[6px] text-xs font-nunito font-bold transition-colors ${
                isActive('/customer')
                  ? 'bg-[#FFF4E8] text-[#FF9F43]'
                  : 'text-[#646B72] hover:bg-[#F7F7F7] hover:text-[#212B36]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Smartphone className={`w-4 h-4 ${isActive('/customer') ? 'text-[#FF9F43]' : 'text-[#646B72]'}`} />
                {!isCollapsed && <span>Customer App Demo</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-[3px] bg-[#1B2850]/10 text-[#1B2850] font-mono">
                  Bangla AI
                </span>
              )}
            </Link>

            {/* USSD Simulator */}
            <Link
              href="/ussd"
              className={`w-full flex items-center justify-between p-2.5 rounded-[6px] text-xs font-nunito font-bold transition-colors ${
                isActive('/ussd')
                  ? 'bg-[#FFF4E8] text-[#FF9F43]'
                  : 'text-[#646B72] hover:bg-[#F7F7F7] hover:text-[#212B36]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Radio className={`w-4 h-4 ${isActive('/ussd') ? 'text-[#FF9F43]' : 'text-[#646B72]'}`} />
                {!isCollapsed && <span>USSD (*268#) Simulator</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-[3px] bg-[#FF9F43] text-white font-mono font-bold">
                  GSM
                </span>
              )}
            </Link>

            {/* Agent Guard */}
            <Link
              href="/agent"
              className={`w-full flex items-center justify-between p-2.5 rounded-[6px] text-xs font-nunito font-bold transition-colors ${
                isActive('/agent')
                  ? 'bg-[#FFF4E8] text-[#FF9F43]'
                  : 'text-[#646B72] hover:bg-[#F7F7F7] hover:text-[#212B36]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Shield className={`w-4 h-4 ${isActive('/agent') ? 'text-[#FF9F43]' : 'text-[#646B72]'}`} />
                {!isCollapsed && <span>Agent Guard Portal</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[10px] text-[#A0AEC0]">POS QR</span>
              )}
            </Link>
          </div>
        </div>

        {/* Section 3: GOVERNANCE, FAIRNESS & ROI */}
        <div className="px-4 my-3 pt-3 border-t border-[#E8EBED]">
          {!isCollapsed && (
            <span className="text-[11px] font-poppins font-bold text-[#A0AEC0] uppercase tracking-wider block mb-2">
              Intelligence &amp; Governance
            </span>
          )}

          <div className="space-y-1">
            {/* Fairness & Seasonal Drift */}
            <Link
              href="/fairness"
              className={`w-full flex items-center justify-between p-2.5 rounded-[6px] text-xs font-nunito font-bold transition-colors ${
                isActive('/fairness')
                  ? 'bg-[#FFF4E8] text-[#FF9F43]'
                  : 'text-[#646B72] hover:bg-[#F7F7F7] hover:text-[#212B36]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className={`w-4 h-4 ${isActive('/fairness') ? 'text-[#FF9F43]' : 'text-[#646B72]'}`} />
                {!isCollapsed && <span>Fairness &amp; Drift</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[10px] text-[#05A677] font-mono font-bold">
                  91.8% FPR↓
                </span>
              )}
            </Link>

            {/* Audit Ledger */}
            <Link
              href="/audit"
              className={`w-full flex items-center justify-between p-2.5 rounded-[6px] text-xs font-nunito font-bold transition-colors ${
                isActive('/audit')
                  ? 'bg-[#FFF4E8] text-[#FF9F43]'
                  : 'text-[#646B72] hover:bg-[#F7F7F7] hover:text-[#212B36]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className={`w-4 h-4 ${isActive('/audit') ? 'text-[#FF9F43]' : 'text-[#646B72]'}`} />
                {!isCollapsed && <span>Audit Ledger</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-[3px] bg-[#212B36] text-white font-mono">
                  SHA-256
                </span>
              )}
            </Link>

            {/* ROI Simulator */}
            <Link
              href="/simulator"
              className={`w-full flex items-center justify-between p-2.5 rounded-[6px] text-xs font-nunito font-bold transition-colors ${
                isActive('/simulator')
                  ? 'bg-[#FFF4E8] text-[#FF9F43]'
                  : 'text-[#646B72] hover:bg-[#F7F7F7] hover:text-[#212B36]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className={`w-4 h-4 ${isActive('/simulator') ? 'text-[#FF9F43]' : 'text-[#646B72]'}`} />
                {!isCollapsed && <span>ROI Simulator</span>}
              </div>
            </Link>
          </div>
        </div>

      </div>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[#E8EBED] bg-[#FAFAFA] text-[11px] font-nunito text-[#646B72] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#05A677] animate-pulse"></span>
            <span>Ensemble v3.2</span>
          </div>
          <span className="text-[#FF9F43] font-bold font-mono">upay Shield</span>
        </div>
      )}
    </aside>
  );
};
