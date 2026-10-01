'use client';

import React, { useState } from 'react';
import { DreamsNavbar } from './DreamsNavbar';
import { DreamsSidebar } from './DreamsSidebar';
import { Settings } from 'lucide-react';

export const DashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

      {/* Floating Settings Cog (From Dreams POS UI) */}
      <button
        className="fixed right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#FF9F43] text-white rounded-l-[8px] flex items-center justify-center shadow-lg hover:bg-[#f08e2f] transition-all z-30"
        title="upay Shield Customizer &amp; Mode Switcher"
      >
        <Settings className="w-5 h-5 animate-spin-slow" />
      </button>
    </div>
  );
};
