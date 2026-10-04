'use client';

import React from 'react';
import { Shield, ShieldAlert, Network, Clock, BarChart3, Users, Smartphone, FileText, CheckCircle2, Radio } from 'lucide-react';

export type TabType = 
  | 'customer'
  | 'ussd'
  | 'analyst'
  | 'rings'
  | 'recovery'
  | 'simulator'
  | 'fairness'
  | 'agent'
  | 'audit';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onSelectScenario: (scenario: 'A' | 'B' | 'C') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onSelectScenario }) => {
  const tabs = [
    { id: 'customer', label: 'Customer Demo', icon: Smartphone },
    { id: 'ussd', label: 'USSD (*268#)', icon: Radio },
    { id: 'analyst', label: 'Analyst Triage', icon: ShieldAlert },
    { id: 'rings', label: 'Ring Explorer', icon: Network },
    { id: 'recovery', label: 'Golden-Hour Trace', icon: Clock },
    { id: 'simulator', label: 'ROI Simulator', icon: BarChart3 },
    { id: 'fairness', label: 'Fairness & Drift', icon: Users },
    { id: 'agent', label: 'Agent Guard', icon: Shield },
    { id: 'audit', label: 'Audit Ledger', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 bg-card/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white">
                  Astha
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  AI TRUST ENGINE
                </span>
              </div>
              <p className="text-xs text-slate-400">Track 01 — Trust & Risk Intelligence (DevFest 2026)</p>
            </div>
          </div>

          {/* Quick Demo Scenario Switcher */}
          <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 px-2 font-medium">Quick Demo:</span>
            <button
              onClick={() => onSelectScenario('A')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-600/30 text-cyan-300 transition-colors font-medium"
            >
              Scenario A (Midnight Intercept)
            </button>
            <button
              onClick={() => onSelectScenario('B')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-purple-600/30 text-purple-300 transition-colors font-medium"
            >
              Scenario B (Ring-12 Hub)
            </button>
            <button
              onClick={() => onSelectScenario('C')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-amber-600/30 text-amber-300 transition-colors font-medium"
            >
              Scenario C (Golden-Hour Trace)
            </button>
          </div>

          {/* Service Status Indicator */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>API & ML Ensemble: Active (p95 &lt; 5ms)</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto mt-3 pt-2 border-t border-slate-800/60 no-scrollbar">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as TabType)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
