'use client';

import React, { useState } from 'react';
import { Header, TabType } from '../components/Header';
import { CustomerApp } from '../components/CustomerApp';
import { AnalystConsole } from '../components/AnalystConsole';
import { RingExplorer } from '../components/RingExplorer';
import { RecoveryTracer } from '../components/RecoveryTracer';
import { Simulator } from '../components/Simulator';
import { FairnessDrift } from '../components/FairnessDrift';
import { AgentGuardView } from '../components/AgentGuardView';
import { AuditLogView } from '../components/AuditLogView';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('customer');

  const handleSelectScenario = (scenario: 'A' | 'B' | 'C') => {
    if (scenario === 'A') {
      setActiveTab('customer');
    } else if (scenario === 'B') {
      setActiveTab('rings');
    } else if (scenario === 'C') {
      setActiveTab('recovery');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#060d1f]">
      {/* Top App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSelectScenario={handleSelectScenario}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeTab === 'customer' && <CustomerApp />}
        {activeTab === 'analyst' && (
          <AnalystConsole
            onOpenRing={() => setActiveTab('rings')}
            onOpenTrace={() => setActiveTab('recovery')}
          />
        )}
        {activeTab === 'rings' && <RingExplorer />}
        {activeTab === 'recovery' && <RecoveryTracer />}
        {activeTab === 'simulator' && <Simulator />}
        {activeTab === 'fairness' && <FairnessDrift />}
        {activeTab === 'agent' && <AgentGuardView />}
        {activeTab === 'audit' && <AuditLogView />}
      </main>

      {/* Footer */}
      <footer className="glass-panel border-t border-slate-800/80 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            <span className="font-bold text-slate-300">upay Shield</span> — AI Hackathon 2026 (DIU CPC × upay).
            100% Synthetic Data. No production data used.
          </div>
          <div className="flex items-center gap-4">
            <span>IEEE 29148 / 830 Compliant SRS</span>
            <span>Grounded GenAI &amp; Louvain Graph Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
