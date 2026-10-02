'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, ShieldAlert, Network, Clock, BarChart3, 
  Users, Smartphone, FileText, Shield, Radio, Sparkles, 
  Activity, ShieldCheck, QrCode, MapPin, Layers, FileSearch
} from 'lucide-react';

interface DreamsSidebarProps {
  isCollapsed?: boolean;
}

export const DreamsSidebar: React.FC<DreamsSidebarProps> = ({ isCollapsed = false }) => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <aside
      className={`bg-card border-r border-hairsoft flex flex-col justify-between select-none transition-all duration-300 ${
        isCollapsed ? 'w-[72px]' : 'w-[260px]'
      } min-h-[calc(100vh-64px)] shadow-[2px_0px_10px_0px_rgba(0,0,0,0.01)]`}
    >
      <div className="py-4 overflow-y-auto max-h-[calc(100vh-64px)]">
        
        {/* Section 1: CORE OPERATIONS & TRIAGE */}
        <div className="px-4 mb-2">
          {!isCollapsed && (
            <span className="text-[11px] font-display font-bold text-ink-dim uppercase tracking-wider block mb-2">
              Fraud Operations
            </span>
          )}

          <div className="space-y-1">
            {/* Executive Dashboard */}
            <Link
              href="/"
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-ui font-bold transition-colors ${
                isActive('/')
                  ? 'bg-flame-50 text-flame-500'
                  : 'text-ink-muted hover:bg-elev hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className={`w-4 h-4 ${isActive('/') ? 'text-flame-500' : 'text-ink-muted'}`} />
                {!isCollapsed && <span>Executive Overview</span>}
              </div>
              {!isCollapsed && isActive('/') && (
                <span className="w-1.5 h-1.5 rounded-full bg-flame-500"></span>
              )}
            </Link>

            {/* Analyst Triage Hub */}
            <Link
              href="/analyst"
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-ui font-bold transition-colors ${
                isActive('/analyst')
                  ? 'bg-flame-50 text-flame-500'
                  : 'text-ink-muted hover:bg-elev hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className={`w-4 h-4 ${isActive('/analyst') ? 'text-flame-500' : 'text-ink-muted'}`} />
                {!isCollapsed && <span>Analyst Triage Hub</span>}
              </div>
              {!isCollapsed && (
                <span className="px-1.5 py-0.5 rounded-lg bg-danger/10 text-danger text-[9px] font-num font-bold">
                  SLA 15m
                </span>
              )}
            </Link>

            {/* Complaint-to-Action Hub */}
            <Link
              href="/complaints"
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-ui font-bold transition-colors ${
                isActive('/complaints')
                  ? 'bg-flame-50 text-flame-500'
                  : 'text-ink-muted hover:bg-elev hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className={`w-4 h-4 ${isActive('/complaints') ? 'text-flame-500' : 'text-ink-muted'}`} />
                {!isCollapsed && <span>Complaint Intelligence</span>}
              </div>
              {!isCollapsed && (
                <span className="px-1.5 py-0.5 rounded-lg bg-danger/10 text-danger text-[9px] font-num font-bold">
                  P1 ACTIVE
                </span>
              )}
            </Link>


            {/* Evidence-Driven Incident Investigation */}
            <Link
              href="/investigations"
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-ui font-bold transition-colors ${
                isActive('/investigations')
                  ? 'bg-flame-50 text-flame-500'
                  : 'text-ink-muted hover:bg-elev hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileSearch className={`w-4 h-4 ${isActive('/investigations') ? 'text-flame-500' : 'text-ink-muted'}`} />
                {!isCollapsed && <span>Incident Investigation</span>}
              </div>
              {!isCollapsed && (
                <span className="px-1.5 py-0.5 rounded-lg bg-iris/10 text-iris text-[9px] font-num font-bold">
                  EVIDENCE
                </span>
              )}
            </Link>

            {/* Ring-12 Mule Explorer */}
            <Link
              href="/rings"
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-ui font-bold transition-colors ${
                isActive('/rings')
                  ? 'bg-flame-50 text-flame-500'
                  : 'text-ink-muted hover:bg-elev hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Network className={`w-4 h-4 ${isActive('/rings') ? 'text-flame-500' : 'text-ink-muted'}`} />
                {!isCollapsed && <span>Ring-12 Mule Explorer</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[10px] text-ink-dim">Graph</span>
              )}
            </Link>

            {/* Bangladesh Scam Knowledge Graph */}
            <Link
              href="/knowledge-graph"
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-ui font-bold transition-colors ${
                isActive('/knowledge-graph')
                  ? 'bg-flame-50 text-flame-500'
                  : 'text-ink-muted hover:bg-elev hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className={`w-4 h-4 ${isActive('/knowledge-graph') ? 'text-iris' : 'text-ink-muted'}`} />
                {!isCollapsed && <span>Intelligence Graph</span>}
              </div>
              {!isCollapsed && (
                <span className="px-1.5 py-0.5 rounded-lg bg-iris/15 text-iris text-[9px] font-num font-bold">
                  NEW
                </span>
              )}
            </Link>

            {/* Scam Campaign Intelligence */}
            <Link
              href="/campaigns"
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-ui font-bold transition-colors ${
                isActive('/campaigns')
                  ? 'bg-flame-50 text-flame-500'
                  : 'text-ink-muted hover:bg-elev hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className={`w-4 h-4 ${isActive('/campaigns') ? 'text-flame-500' : 'text-ink-muted'}`} />
                {!isCollapsed && <span>Scam Campaigns</span>}
              </div>
              {!isCollapsed && (
                <span className="px-1.5 py-0.5 rounded-lg bg-flame-500/15 text-flame-500 text-[9px] font-num font-bold">
                  HOT
                </span>
              )}
            </Link>

            {/* Community Scam Spread Map */}
            <Link
              href="/propagation"
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-ui font-bold transition-colors ${
                isActive('/propagation')
                  ? 'bg-flame-50 text-flame-500'
                  : 'text-ink-muted hover:bg-elev hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MapPin className={`w-4 h-4 ${isActive('/propagation') ? 'text-flame-500' : 'text-ink-muted'}`} />
                {!isCollapsed && <span>Scam Spread Map</span>}
              </div>
              {!isCollapsed && (
                <span className="px-1.5 py-0.5 rounded-lg bg-danger/10 text-danger text-[9px] font-num font-bold">
                  LIVE
                </span>
              )}
            </Link>

            {/* Golden-Hour Recovery Trace */}
            <Link
              href="/recovery"
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-ui font-bold transition-colors ${
                isActive('/recovery')
                  ? 'bg-flame-50 text-flame-500'
                  : 'text-ink-muted hover:bg-elev hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className={`w-4 h-4 ${isActive('/recovery') ? 'text-flame-500' : 'text-ink-muted'}`} />
                {!isCollapsed && <span>Golden-Hour Trace</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[10px] text-success font-bold">Auto-Hold</span>
              )}
            </Link>
          </div>
        </div>

        {/* Section 2: CHANNELS & SCAM INTERCEPTION */}
        <div className="px-4 my-3 pt-3 border-t border-hairsoft">
          {!isCollapsed && (
            <span className="text-[11px] font-display font-bold text-ink-dim uppercase tracking-wider block mb-2">
              Protection Channels
            </span>
          )}

          <div className="space-y-1">
            {/* Customer Mobile Demo */}
            <Link
              href="/customer"
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-ui font-bold transition-colors ${
                isActive('/customer')
                  ? 'bg-flame-50 text-flame-500'
                  : 'text-ink-muted hover:bg-elev hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Smartphone className={`w-4 h-4 ${isActive('/customer') ? 'text-flame-500' : 'text-ink-muted'}`} />
                {!isCollapsed && <span>Customer Mobile App</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-inverse/10 text-ink font-num">
                  Voice AI
                </span>
              )}
            </Link>

            {/* USSD (*268#) Simulator */}
            <Link
              href="/ussd"
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-ui font-bold transition-colors ${
                isActive('/ussd')
                  ? 'bg-flame-50 text-flame-500'
                  : 'text-ink-muted hover:bg-elev hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Radio className={`w-4 h-4 ${isActive('/ussd') ? 'text-flame-500' : 'text-ink-muted'}`} />
                {!isCollapsed && <span>USSD (*268#) Simulator</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-flame-500 text-white font-num font-bold">
                  GSM
                </span>
              )}
            </Link>

            {/* Merchant / QR Scam Shield */}
            <Link
              href="/merchants"
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-ui font-bold transition-colors ${
                isActive('/merchants')
                  ? 'bg-flame-50 text-flame-500'
                  : 'text-ink-muted hover:bg-elev hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <QrCode className={`w-4 h-4 ${isActive('/merchants') ? 'text-flame-500' : 'text-ink-muted'}`} />
                {!isCollapsed && <span>Merchant QR Shield</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-success/10 text-success font-num font-bold">
                  QR M3
                </span>
              )}
            </Link>

            {/* Agent Guard Portal */}
            <Link
              href="/agent"
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-ui font-bold transition-colors ${
                isActive('/agent')
                  ? 'bg-flame-50 text-flame-500'
                  : 'text-ink-muted hover:bg-elev hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Shield className={`w-4 h-4 ${isActive('/agent') ? 'text-flame-500' : 'text-ink-muted'}`} />
                {!isCollapsed && <span>Agent Guard Portal</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[10px] text-ink-dim">POS QR</span>
              )}
            </Link>
          </div>
        </div>

        {/* Section 3: FAIRNESS, AUDIT & SIMULATOR */}
        <div className="px-4 my-3 pt-3 border-t border-hairsoft">
          {!isCollapsed && (
            <span className="text-[11px] font-display font-bold text-ink-dim uppercase tracking-wider block mb-2">
              Intelligence &amp; Governance
            </span>
          )}

          <div className="space-y-1">
            {/* Fairness & Seasonal Drift */}
            <Link
              href="/fairness"
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-ui font-bold transition-colors ${
                isActive('/fairness')
                  ? 'bg-flame-50 text-flame-500'
                  : 'text-ink-muted hover:bg-elev hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className={`w-4 h-4 ${isActive('/fairness') ? 'text-flame-500' : 'text-ink-muted'}`} />
                {!isCollapsed && <span>Fairness &amp; Seasonal Drift</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[10px] text-success font-num font-bold">
                  91.8% FPR↓
                </span>
              )}
            </Link>

            {/* Cryptographic Audit Ledger */}
            <Link
              href="/audit"
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-ui font-bold transition-colors ${
                isActive('/audit')
                  ? 'bg-flame-50 text-flame-500'
                  : 'text-ink-muted hover:bg-elev hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className={`w-4 h-4 ${isActive('/audit') ? 'text-flame-500' : 'text-ink-muted'}`} />
                {!isCollapsed && <span>Audit Ledger</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-inverse text-white font-num">
                  SHA-256
                </span>
              )}
            </Link>

            {/* ROI & Business Impact Simulator */}
            <Link
              href="/simulator"
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-ui font-bold transition-colors ${
                isActive('/simulator')
                  ? 'bg-flame-50 text-flame-500'
                  : 'text-ink-muted hover:bg-elev hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className={`w-4 h-4 ${isActive('/simulator') ? 'text-flame-500' : 'text-ink-muted'}`} />
                {!isCollapsed && <span>ROI &amp; Impact Simulator</span>}
              </div>
            </Link>
          </div>
        </div>

      </div>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="p-3 border-t border-hairsoft bg-elev text-[11px] font-ui text-ink-muted flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
            <span>Ensemble Active</span>
          </div>
          <span className="text-flame-500 font-bold font-num">upay Shield</span>
        </div>
      )}
    </aside>
  );
};
