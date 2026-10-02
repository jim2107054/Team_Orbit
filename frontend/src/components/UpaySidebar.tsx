'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, ShieldAlert, Network, Clock, BarChart3, 
  Users, Smartphone, FileText, Shield, Radio, Sparkles, 
  ShieldCheck, QrCode, MapPin, Layers, FileSearch, X, Cpu
} from 'lucide-react';

interface UpaySidebarProps {
  isCollapsed?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const UpaySidebar: React.FC<UpaySidebarProps> = ({
  isCollapsed = false,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname?.startsWith(path)) return true;
    return false;
  };

  const navItemClass = (path: string) => `
    w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[13px] font-jakarta transition-all duration-150 group select-none
    ${isActive(path)
      ? 'bg-amber-500/10 dark:glass-active-item text-amber-600 dark:text-amber-400 font-bold border-l-2 border-amber-500 shadow-md shadow-amber-500/10'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
    }
  `;

  const sidebarContent = (
    <div className="py-4 overflow-y-auto h-full flex flex-col justify-between">
      <div className="space-y-4">
        
        {/* Section 1: FRAUD OPERATIONS */}
        <div className="px-3">
          {!isCollapsed && (
            <span className="text-[10px] font-outfit font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 px-2">
              Fraud Operations
            </span>
          )}

          <div className="space-y-0.5">
            {/* Platform Intro & Overview */}
            <Link
              href="/"
              onClick={onCloseMobile}
              className={navItemClass('/')}
              title="Platform Intro & Overview"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Sparkles className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive('/') ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
                {!isCollapsed && <span className="font-medium">Platform Intro</span>}
              </div>
            </Link>

            {/* Executive Overview */}
            <Link
              href="/dashboard"
              onClick={onCloseMobile}
              className={navItemClass('/dashboard')}
              title="Executive Overview"
            >
              <div className="flex items-center gap-3 min-w-0">
                <LayoutDashboard className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive('/dashboard') ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
                {!isCollapsed && <span className="font-medium">Executive Overview</span>}
              </div>
              {!isCollapsed && isActive('/dashboard') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500 shrink-0"></span>
              )}
            </Link>

            {/* Analyst Triage Hub */}
            <Link
              href="/analyst"
              onClick={onCloseMobile}
              className={navItemClass('/analyst')}
              title="Analyst Triage Hub"
            >
              <div className="flex items-center gap-3 min-w-0">
                <ShieldAlert className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive('/analyst') ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
                {!isCollapsed && <span className="font-medium">Analyst Triage Hub</span>}
              </div>
              {!isCollapsed && isActive('/analyst') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500 shrink-0"></span>
              )}
            </Link>

            {/* Complaint Intelligence */}
            <Link
              href="/complaints"
              onClick={onCloseMobile}
              className={navItemClass('/complaints')}
              title="Complaint Intelligence"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive('/complaints') ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
                {!isCollapsed && <span className="font-medium">Complaint Intelligence</span>}
              </div>
              {!isCollapsed && isActive('/complaints') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500 shrink-0"></span>
              )}
            </Link>

            {/* Incident Investigation */}
            <Link
              href="/investigations"
              onClick={onCloseMobile}
              className={navItemClass('/investigations')}
              title="Incident Investigation"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileSearch className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive('/investigations') ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
                {!isCollapsed && <span className="font-medium">Incident Investigation</span>}
              </div>
              {!isCollapsed && isActive('/investigations') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500 shrink-0"></span>
              )}
            </Link>
          </div>
        </div>

        {/* Section 2: THREAT INTELLIGENCE */}
        <div className="px-3 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
          {!isCollapsed && (
            <span className="text-[10px] font-outfit font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 px-2">
              Threat Intelligence
            </span>
          )}

          <div className="space-y-0.5">
            {/* Ring-12 Mule Explorer */}
            <Link
              href="/rings"
              onClick={onCloseMobile}
              className={navItemClass('/rings')}
              title="Mule Ring Explorer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Network className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive('/rings') ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
                {!isCollapsed && <span className="font-medium">Mule Ring Explorer</span>}
              </div>
              {!isCollapsed && isActive('/rings') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500 shrink-0"></span>
              )}
            </Link>

            {/* Knowledge Graph */}
            <Link
              href="/knowledge-graph"
              onClick={onCloseMobile}
              className={navItemClass('/knowledge-graph')}
              title="Intelligence Graph"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Layers className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive('/knowledge-graph') ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
                {!isCollapsed && <span className="font-medium">Intelligence Graph</span>}
              </div>
              {!isCollapsed && isActive('/knowledge-graph') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500 shrink-0"></span>
              )}
            </Link>

            {/* Scam Campaigns */}
            <Link
              href="/campaigns"
              onClick={onCloseMobile}
              className={navItemClass('/campaigns')}
              title="Scam Campaigns"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Sparkles className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive('/campaigns') ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
                {!isCollapsed && <span className="font-medium">Scam Campaigns</span>}
              </div>
              {!isCollapsed && isActive('/campaigns') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500 shrink-0"></span>
              )}
            </Link>

            {/* District Spread Map */}
            <Link
              href="/propagation"
              onClick={onCloseMobile}
              className={navItemClass('/propagation')}
              title="District Spread Map"
            >
              <div className="flex items-center gap-3 min-w-0">
                <MapPin className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive('/propagation') ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
                {!isCollapsed && <span className="font-medium">District Spread Map</span>}
              </div>
              {!isCollapsed && isActive('/propagation') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500 shrink-0"></span>
              )}
            </Link>

            {/* Golden-Hour Recovery */}
            <Link
              href="/recovery"
              onClick={onCloseMobile}
              className={navItemClass('/recovery')}
              title="Golden-Hour Trace"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Clock className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive('/recovery') ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
                {!isCollapsed && <span className="font-medium">Golden-Hour Trace</span>}
              </div>
              {!isCollapsed && isActive('/recovery') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500 shrink-0"></span>
              )}
            </Link>
          </div>
        </div>

        {/* Section 3: CHANNELS */}
        <div className="px-3 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
          {!isCollapsed && (
            <span className="text-[10px] font-outfit font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 px-2">
              Channels &amp; Protection
            </span>
          )}

          <div className="space-y-0.5">
            {/* Customer Mobile App */}
            <Link
              href="/customer"
              onClick={onCloseMobile}
              className={navItemClass('/customer')}
              title="Customer Mobile App"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Smartphone className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive('/customer') ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
                {!isCollapsed && <span className="font-medium">Customer Mobile App</span>}
              </div>
              {!isCollapsed && isActive('/customer') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500 shrink-0"></span>
              )}
            </Link>

            {/* USSD Simulator */}
            <Link
              href="/ussd"
              onClick={onCloseMobile}
              className={navItemClass('/ussd')}
              title="USSD (*268#) Engine"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Radio className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive('/ussd') ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
                {!isCollapsed && <span className="font-medium">USSD (*268#) Engine</span>}
              </div>
              {!isCollapsed && isActive('/ussd') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500 shrink-0"></span>
              )}
            </Link>

            {/* Merchant QR Shield */}
            <Link
              href="/merchants"
              onClick={onCloseMobile}
              className={navItemClass('/merchants')}
              title="Merchant QR Shield"
            >
              <div className="flex items-center gap-3 min-w-0">
                <QrCode className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive('/merchants') ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
                {!isCollapsed && <span className="font-medium">Merchant QR Shield</span>}
              </div>
              {!isCollapsed && isActive('/merchants') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500 shrink-0"></span>
              )}
            </Link>

            {/* Agent Guard Portal */}
            <Link
              href="/agent"
              onClick={onCloseMobile}
              className={navItemClass('/agent')}
              title="Agent Guard Portal"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Shield className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive('/agent') ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
                {!isCollapsed && <span className="font-medium">Agent Guard Portal</span>}
              </div>
              {!isCollapsed && isActive('/agent') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500 shrink-0"></span>
              )}
            </Link>
          </div>
        </div>

        {/* Section 4: GOVERNANCE & AUDIT */}
        <div className="px-3 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
          {!isCollapsed && (
            <span className="text-[10px] font-outfit font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 px-2">
              Governance &amp; Audit
            </span>
          )}

          <div className="space-y-0.5">
            {/* Fairness & Drift */}
            <Link
              href="/fairness"
              onClick={onCloseMobile}
              className={navItemClass('/fairness')}
              title="Fairness & Bias Monitor"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Users className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive('/fairness') ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
                {!isCollapsed && <span className="font-medium">Fairness &amp; Bias Monitor</span>}
              </div>
              {!isCollapsed && isActive('/fairness') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500 shrink-0"></span>
              )}
            </Link>

            {/* Cryptographic Audit Ledger */}
            <Link
              href="/audit"
              onClick={onCloseMobile}
              className={navItemClass('/audit')}
              title="SHA-256 Audit Trail"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive('/audit') ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
                {!isCollapsed && <span className="font-medium">SHA-256 Audit Trail</span>}
              </div>
              {!isCollapsed && isActive('/audit') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500 shrink-0"></span>
              )}
            </Link>

            {/* ROI Simulator */}
            <Link
              href="/simulator"
              onClick={onCloseMobile}
              className={navItemClass('/simulator')}
              title="ROI & Impact Simulator"
            >
              <div className="flex items-center gap-3 min-w-0">
                <BarChart3 className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive('/simulator') ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
                {!isCollapsed && <span className="font-medium">ROI &amp; Impact Simulator</span>}
              </div>
              {!isCollapsed && isActive('/simulator') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500 shrink-0"></span>
              )}
            </Link>
          </div>
        </div>

      </div>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="mx-3 mt-4 mb-2 p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/25 relative overflow-hidden text-left shadow-lg shadow-black/20">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/30 flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <strong className="text-xs font-outfit font-bold text-slate-900 dark:text-white block leading-tight">
                SOC Sentinel 2.4
              </strong>
              <span className="text-[10px] text-amber-500 font-mono font-bold">Autonomous Defense</span>
            </div>
          </div>
          <p className="text-[11px] font-jakarta text-slate-600 dark:text-slate-400 leading-snug mb-3">
            Multi-turn Bangla interception &amp; Golden-Hour money trace engaged.
          </p>
          <div className="flex items-center gap-1.5">
            <Link
              href="/recovery"
              className="flex-1 py-1.5 px-2 rounded-lg btn-flame text-[10.5px] font-outfit font-bold text-center shadow-sm"
            >
              Trace Money
            </Link>
            <Link
              href="/simulator"
              className="py-1.5 px-2.5 rounded-lg bg-slate-200 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 text-[10.5px] font-jakarta font-semibold text-center hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              ROI Sim
            </Link>
          </div>
        </div>
      )}

      {/* System Status Pill */}
      {!isCollapsed && (
        <div className="mt-1 p-2.5 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/60 text-[11px] font-jakarta text-slate-500 dark:text-slate-400 flex items-center justify-between mx-2 rounded-xl">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Ensemble Active</span>
          </div>
          <span className="text-amber-600 dark:text-amber-400 font-bold font-mono text-[10px]">
            v2.4 UCB
          </span>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col justify-between bg-white dark:bg-[#0D0F16] border-r border-slate-200 dark:border-slate-800/80 select-none transition-all duration-300 ${
          isCollapsed ? 'w-[72px]' : 'w-[280px]'
        } min-h-[calc(100vh-64px)] shadow-xs shrink-0`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Responsive slide-in) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            onClick={onCloseMobile} 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative w-[280px] max-w-[85vw] bg-white dark:bg-[#070D18] h-full shadow-2xl z-10 flex flex-col border-r border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black font-outfit text-xs">
                  U
                </div>
                <span className="font-outfit font-black text-sm text-slate-900 dark:text-white">
                  upay Shield Navigation
                </span>
              </div>
              <button 
                onClick={onCloseMobile}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
