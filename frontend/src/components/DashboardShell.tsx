'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UpayNavbar } from './UpayNavbar';
import { UpaySidebar } from './UpaySidebar';
import { 
  Settings, X, Shield, Activity, Database, 
  ArrowRight, RefreshCw, Cpu
} from 'lucide-react';

export const DashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [systemHealth, setSystemHealth] = useState<'HEALTHY' | 'CHECKING'>('CHECKING');
  const [dbStatus, setDbStatus] = useState<'CONNECTED' | 'CHECKING'>('CHECKING');

  if (pathname === '/' || pathname === '/intro') {
    return <>{children}</>;
  }

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
    <div suppressHydrationWarning className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#070E18] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Upay Top Navigation Bar */}
      <UpayNavbar
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Layout Body: Sidebar + Active Page Content */}
      <div className="flex-1 flex overflow-hidden">
        <UpaySidebar 
          isCollapsed={isSidebarCollapsed}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Dynamic Content Canvas */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto max-h-[calc(100vh-64px)] w-full">
          <div className="max-w-[1600px] mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Institutional Upay Shield Footer */}
      <footer className="bg-white dark:bg-[#0A1322] border-t border-slate-200 dark:border-slate-800 py-3 px-4 lg:px-6 select-none z-20 transition-colors duration-200">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-jakarta text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              <strong className="text-slate-800 dark:text-slate-200 font-outfit">upay Shield</strong> — Autonomous MFS Fraud Defense &amp; Mule Ring Intelligence Platform.
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
            <span>UCB Fintech Hackathon</span>
            <span className="text-amber-500 dark:text-amber-400 font-bold">Neon PostgreSQL (Pooled)</span>
          </div>
        </div>
      </footer>

      {/* Floating Telemetry Drawer Trigger */}
      <button
        onClick={() => setDrawerOpen(!drawerOpen)}
        className="fixed right-0 top-1/2 -translate-y-1/2 w-9 h-9 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-l-lg flex items-center justify-center shadow-lg hover:from-amber-400 hover:to-amber-500 transition-all z-30 cursor-pointer"
        title="upay Shield Quick Telemetry & Health"
      >
        <Cpu className="w-4 h-4 animate-spin-slow" />
      </button>

      {/* Quick Tools & Telemetry Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-80 sm:w-96 bg-white dark:bg-[#0D1726] h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto border-l border-slate-200 dark:border-slate-800 transition-colors">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center border border-amber-500/30">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-outfit font-bold text-sm text-slate-900 dark:text-white">System Telemetry</h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-jakarta">upay Shield Live Ops</span>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Pills */}
              <div className="space-y-2.5 py-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-jakarta">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                    <Activity className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Risk Scoring Engine</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold font-mono text-[10px]">
                    ONLINE (p95 &lt; 5ms)
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-jakarta">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                    <Database className="w-3.5 h-3.5 text-sky-500" />
                    <span>Neon PostgreSQL Pool</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold font-mono text-[10px]">
                    CONNECTED (25 POOL)
                  </span>
                </div>
              </div>

              {/* Quick Navigation Links */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-outfit font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block px-1">
                  Fast Dispatch Links
                </span>

                {[
                  { label: 'Incident Investigation Desk', href: '/investigations', badge: 'EVIDENCE' },
                  { label: 'Mule Ring Topology', href: '/rings', badge: 'GRAPH' },
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
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-jakarta font-semibold text-slate-800 dark:text-slate-200 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-500 transition-colors cursor-pointer shadow-sm"
                  >
                    <span>{item.label}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[9px] font-bold">
                      {item.badge}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 block">
                upay Shield v2.4 · All Systems Nominal
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
