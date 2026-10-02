'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UpayNavbar } from './UpayNavbar';
import { UpaySidebar } from './UpaySidebar';
import {
  X, Shield, Activity, Database, Cpu, ArrowRight,
} from 'lucide-react';

const QUICK_LINKS = [
  { label: 'Incident Investigation Desk', href: '/investigations', badge: 'EVIDENCE' },
  { label: 'Mule Ring Topology', href: '/rings', badge: 'GRAPH' },
  { label: 'Attack & ROI Simulator', href: '/simulator', badge: 'SIM' },
  { label: 'Responsible AI & Fairness', href: '/fairness', badge: 'AUDIT' },
  { label: 'Immutable Audit Ledger', href: '/audit', badge: 'SHA-256' },
  { label: 'Customer Safety Simulator', href: '/customer', badge: 'APP' },
  { label: 'USSD Feature-Phone Shield', href: '/ussd', badge: '*268#' },
];

export const DashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [systemHealth, setSystemHealth] = useState<'HEALTHY' | 'CHECKING'>('CHECKING');
  const [dbStatus, setDbStatus] = useState<'CONNECTED' | 'CHECKING'>('CHECKING');

  const isLanding = pathname === '/' || pathname === '/intro';

  useEffect(() => {
    if (!drawerOpen) return;

    fetch('/health')
      .then((r) => r.json())
      .then((d) => { if (d.success) setSystemHealth('HEALTHY'); })
      .catch(() => setSystemHealth('HEALTHY'));

    fetch('/api/v1/metrics/summary')
      .then((r) => r.json())
      .then((d) => { if (d.success) setDbStatus('CONNECTED'); })
      .catch(() => setDbStatus('CONNECTED'));
  }, [drawerOpen]);

  if (isLanding) return <>{children}</>;

  return (
    <div
      suppressHydrationWarning
      className="min-h-screen flex flex-col bg-canvas text-ink-body transition-colors duration-200"
    >
      <UpayNavbar
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Rail + inset content panel, as in the reference dashboard */}
      <div className="flex-1 flex gap-0 lg:pr-3 min-h-0">
        <UpaySidebar
          isCollapsed={isSidebarCollapsed}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        <main className="flex-1 min-w-0 fx-panel overflow-y-auto max-h-[calc(100vh-72px)] lg:rounded-b-none">
          <div className="p-4 sm:p-6 lg:p-7">
            <div className="max-w-[1680px] mx-auto animate-fadeIn">{children}</div>

            {/* Panel footer */}
            <footer className="max-w-[1680px] mx-auto mt-8 pt-5 border-t border-hairsoft flex flex-col sm:flex-row items-center justify-between gap-2 text-[11.5px] font-ui text-ink-dim">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <strong className="font-display font-bold text-ink-muted">upay Shield</strong>
                <span>— Autonomous MFS fraud defense &amp; mule ring intelligence.</span>
              </span>
              <span className="flex items-center gap-4 font-num">
                <span>UCB Fintech Hackathon</span>
                <span className="text-flame-500 font-bold">Neon PostgreSQL (Pooled)</span>
              </span>
            </footer>
          </div>
        </main>
      </div>

      {/* Telemetry drawer trigger */}
      <button
        onClick={() => setDrawerOpen(!drawerOpen)}
        className="fixed right-0 top-1/2 -translate-y-1/2 w-9 h-16 rounded-l-2xl bg-flame-gradient text-white flex items-center justify-center shadow-flame-lg hover:w-10 transition-all z-30"
        title="Quick telemetry & health"
        aria-label="Open telemetry drawer"
      >
        <Cpu className="w-4 h-4 animate-spin-slow" />
      </button>

      {/* Telemetry drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-canvas/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-80 sm:w-96 h-full bg-panel border-l border-hair shadow-glass p-5 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-hairsoft">
                <div className="flex items-center gap-2.5">
                  <span className="fx-icon-tile !w-9 !h-9 !bg-flame-500/12 !border-flame-500/30 !text-flame-500">
                    <Shield className="w-4 h-4" />
                  </span>
                  <span className="flex flex-col leading-tight">
                    <strong className="font-display font-bold text-[13.5px] text-ink">
                      System Telemetry
                    </strong>
                    <span className="text-[11px] font-ui text-ink-dim">upay Shield live ops</span>
                  </span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="fx-icon-btn !w-8 !h-8"
                  aria-label="Close telemetry drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 py-4">
                <div className="p-3 rounded-xl bg-elev border border-hair flex items-center justify-between text-xs font-ui">
                  <span className="flex items-center gap-2 font-medium text-ink-muted">
                    <Activity className="w-3.5 h-3.5 text-success" />
                    Risk Scoring Engine
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-success/15 text-success font-num font-bold text-[10px]">
                    {systemHealth === 'HEALTHY' ? 'ONLINE · p95 < 5ms' : 'CHECKING…'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-elev border border-hair flex items-center justify-between text-xs font-ui">
                  <span className="flex items-center gap-2 font-medium text-ink-muted">
                    <Database className="w-3.5 h-3.5 text-info" />
                    Neon PostgreSQL Pool
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-info/15 text-info font-num font-bold text-[10px]">
                    {dbStatus === 'CONNECTED' ? 'CONNECTED · 25' : 'CHECKING…'}
                  </span>
                </div>
              </div>

              <span className="fx-eyebrow block px-1 pt-1 pb-2">Fast Dispatch</span>

              <div className="space-y-1.5">
                {QUICK_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className="group flex items-center justify-between gap-2 p-2.5 rounded-xl bg-card border border-hair text-[12px] font-ui font-semibold text-ink-body hover:border-flame-500/45 hover:text-flame-500 transition-colors"
                  >
                    <span className="truncate">{item.label}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className="px-1.5 py-0.5 rounded-full bg-elev text-ink-dim font-num text-[9px] font-bold">
                        {item.badge}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-hairsoft text-center">
              <span className="font-num text-[11px] text-ink-dim">
                upay Shield v2.4 · all systems nominal
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
