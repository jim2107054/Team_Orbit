'use client';

import React, { useState } from 'react';
import { Header, TabType } from '../components/Header';
import { CustomerApp } from '../components/CustomerApp';
import { UssdSimulator } from '../components/UssdSimulator';
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
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F7F7] text-[#212529]">
      {/* Top App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSelectScenario={handleSelectScenario}
      />

      {/* Main Content Area (Max width 1440px with generous spacing) */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 lg:px-6 py-6">
        {activeTab === 'customer' && <CustomerApp />}
        {activeTab === 'ussd' && <UssdSimulator />}
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

      {/* Footer (Dreams POS Style: 56px height, Nunito typography) */}
      <footer className="bg-[#FFFFFF] border-t border-[#DADFE5] py-4 mt-8">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs font-nunito text-[#646B72]">
          <div>
            <strong className="text-[#212B36] font-poppins">upay Shield</strong> — AI Hackathon 2026 (DIU CPC × upay).
            Hosted on Neon PostgreSQL.
          </div>
          <div className="flex items-center gap-4 text-[#212529]">
            <span>IEEE 29148 / 830 Specification</span>
            <span className="text-[#FF9F43] font-bold">Dreams POS Design System Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
