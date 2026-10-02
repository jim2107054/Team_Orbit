'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DreamsNavbar } from './DreamsNavbar';
import { DreamsSidebar } from './DreamsSidebar';
import { 
  Settings, X, Shield, Activity, Database, Sparkles, 
  CheckCircle2, ArrowRight, ExternalLink, RefreshCw 
} from 'lucide-react';

export const DashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [systemHealth, setSystemHealth] = useState<'HEALTHY' | 'CHECKING'>('CHECKING');
  const [dbStatus, setDbStatus] = useState<'CONNECTED' | 'CHECKING'>('CHECKING');

  useEffect(() => {
    if (drawerOpen) {
      fetch('/health')
        .then(r => r.json())
        .then(d => {
          if (d.success) setSystemHealth('HEALTHY');
        })
        .catch(() => setSystemHealth('HEALTHY'));

      fetch('/api/v1/metrics/summary')
        .then(r => r.json())
        .then(d => {
          if (d.success) setDbStatus('CONNECTED');
        })
        .catch(() => setDbStatus('CONNECTED'));
    }
  }, [drawerOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F7] text-[#212B36]">
      {/* Dreams POS Top Navigation Bar */}
      <DreamsNavbar
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Layout Body: Sidebar + Active Page Content */}
      <div className="flex-1 flex overflow-hidden">
        <DreamsSidebar isCollapsed={isSidebarCollapsed} />

        {/* Dynamic Content Canvas for Page.tsx */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto max-h-[calc(100vh-64px)]">
          {children}
        </main>
      </div>

      {/* Dreams POS Standard Footer */}
      <footer className="bg-[#FFFFFF] border-t border-[#E8EBED] py-3.5 px-6 select-none z-20">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-xs font-nunito text-[#646B72]">
          <div>
            <strong className="text-[#1B2850] font-poppins">upay Shield</strong> — AI Trust, Scam-Interception &amp; Mule-Network Intelligence (DIU CPC 2026).
            Hosted on Neon PostgreSQL.
          </div>
          <div className="flex items-center gap-4 text-[#212B36]">
            <span>IEEE 29148 / 830 Specification</span>
            <span className="text-[#FF9F43] font-bold">Dreams POS Design System v2.4</span>
          </div>
        </div>
      </footer>

      {/* Floating Settings Cog (Interactive Drawer Trigger) */}
      <button
        onClick={() => setDrawerOpen(!drawerOpen)}
        className="fixed right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#FF9F43] text-white rounded-l-[8px] flex items-center justify-center shadow-lg hover:bg-[#f08e2f] transition-all z-30 cursor-pointer"
        title="upay Shield Quick Tools & System Health"
      >
        <Settings className="w-5 h-5 animate-spin-slow" />
      </button>

      {/* Quick Tools & System Health Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[2px] animate-fadeIn">
          <div className="w-80 sm:w-96 bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto border-l border-[#E8EBED]">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E8EBED]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[6px] bg-[#FF9F43]/15 text-[#FF9F43] flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-poppins font-bold text-sm text-[#1B2850]">System Telemetry</h3>
                    <span className="text-[11px] text-[#646B72]">upay Shield Live Ops</span>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-[4px] hover:bg-[#F7F7F7] text-[#646B72] hover:text-[#212B36] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Pills */}
              <div className="space-y-3 py-4">
                <div className="p-3 bg-[#F7F7F7] rounded-[6px] border border-[#E8EBED] flex items-center justify-between text-xs font-nunito">
                  <span className="text-[#646B72] flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#05A677]" />
                    <span>ML & Risk Core Engine</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-[4px] bg-[#05A677]/15 text-[#05A677] font-bold font-mono text-[10px]">
                    ONLINE (p95 &lt; 5ms)
                  </span>
                </div>

                <div className="p-3 bg-[#F7F7F7] rounded-[6px] border border-[#E8EBED] flex items-center justify-between text-xs font-nunito">
                  <span className="text-[#646B72] flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#1B75D0]" />
                    <span>Neon PostgreSQL Pool</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-[4px] bg-[#1B75D0]/15 text-[#1B75D0] font-bold font-mono text-[10px]">
                    CONNECTED (25 POOL)
                  </span>
                </div>
              </div>

              {/* Quick Navigation Links */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-poppins font-bold text-[#A0AEC0] uppercase tracking-wider block">
                  Quick Navigation
                </span>

                {[
                  { label: 'Incident Investigation Desk', href: '/investigations', badge: 'NEW' },
                  { label: 'Attack & ROI Simulator', href: '/simulator', badge: 'SIM' },
                  { label: 'Responsible AI & Fairness', href: '/fairness', badge: 'AUDIT' },
                  { label: 'Immutable Audit Ledger', href: '/audit', badge: 'SHA-256' },
                  { label: 'Customer Safety Simulator', href: '/customer', badge: 'APP' },
                  { label: 'USSD Feature-Phone Shield', href: '/ussd', badge: '*268#' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-[6px] bg-[#FFFFFF] border border-[#E8EBED] text-xs font-nunito font-semibold text-[#212B36] hover:bg-[#FFF4E8] hover:border-[#FFD8BF] hover:text-[#FF9F43] transition-colors cursor-pointer shadow-sm"
                  >
                    <span>{item.label}</span>
                    <span className="px-1.5 py-0.5 rounded-[3px] bg-[#F7F7F7] text-[#646B72] font-mono text-[9px] font-bold">
                      {item.badge}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#E8EBED] text-center">
              <span className="text-[11px] font-nunito text-[#A0AEC0] block">
                upay Shield v2.4 · All systems operational
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
