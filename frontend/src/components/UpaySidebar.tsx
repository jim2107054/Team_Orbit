'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShieldAlert, Network, Clock, BarChart3,
  Users, Smartphone, FileText, Shield, Radio, Sparkles,
  QrCode, MapPin, Layers, FileSearch, X, Search, Crown,
  LifeBuoy, LogOut, Settings, ArrowRight,
} from 'lucide-react';

interface UpaySidebarProps {
  isCollapsed?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Small count chip, as on the reference rail's "Analytics 20" */
  badge?: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Main Menu',
    items: [
      { href: '/dashboard', label: 'Executive Overview', icon: LayoutDashboard },
      { href: '/analyst', label: 'Analyst Triage', icon: ShieldAlert, badge: 'LIVE' },
      { href: '/complaints', label: 'Complaint Intel', icon: FileText },
      { href: '/investigations', label: 'Investigation Desk', icon: FileSearch },
    ],
  },
  {
    title: 'Threat Intelligence',
    items: [
      { href: '/rings', label: 'Mule Ring Explorer', icon: Network },
      { href: '/knowledge-graph', label: 'Intelligence Graph', icon: Layers },
      { href: '/campaigns', label: 'Scam Campaigns', icon: Sparkles },
      { href: '/propagation', label: 'District Spread', icon: MapPin },
      { href: '/recovery', label: 'Golden-Hour Trace', icon: Clock, badge: '60m' },
    ],
  },
  {
    title: 'Channels',
    items: [
      { href: '/customer', label: 'Customer App', icon: Smartphone },
      { href: '/ussd', label: 'USSD Engine', icon: Radio, badge: '*268#' },
      { href: '/merchants', label: 'Merchant QR Shield', icon: QrCode },
      { href: '/agent', label: 'Agent Guard', icon: Shield },
    ],
  },
  {
    title: 'Governance',
    items: [
      { href: '/fairness', label: 'Fairness & Drift', icon: Users },
      { href: '/audit', label: 'Audit Ledger', icon: FileText },
      { href: '/simulator', label: 'ROI Simulator', icon: BarChart3 },
    ],
  },
];

const QUIET_LINKS: NavItem[] = [
  { href: '/fairness', label: 'Settings', icon: Settings },
  { href: '/intro', label: 'Help Desk', icon: LifeBuoy },
  { href: '/', label: 'Platform Intro', icon: LogOut },
];

export const UpaySidebar: React.FC<UpaySidebarProps> = ({
  isCollapsed = false,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();
  const [filter, setFilter] = useState('');

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path) ?? false;
  };

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return NAV_GROUPS;
    return NAV_GROUPS
      .map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [filter]);

  const renderItem = (item: NavItem) => {
    const active = isActive(item.href);
    const Icon = item.icon;

    return (
      <Link
        key={`${item.href}-${item.label}`}
        href={item.href}
        onClick={onCloseMobile}
        title={item.label}
        data-active={active}
        className={`fx-nav-item overflow-hidden ${isCollapsed ? 'justify-center px-0' : ''}`}
      >
        <Icon
          className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-flame-500' : 'text-ink-dim'}`}
          strokeWidth={active ? 2.2 : 1.8}
        />
        {!isCollapsed && (
          <>
            <span className="truncate flex-1">{item.label}</span>
            {item.badge && (
              <span
                className={`shrink-0 px-1.5 py-0.5 rounded-full font-num text-[9.5px] font-bold tracking-tight ${
                  active
                    ? 'bg-flame-500 text-white'
                    : 'bg-elev text-ink-dim border border-hair'
                }`}
              >
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  const railBody = (
    <div className="h-full flex flex-col">
      {/* Rail search — the reference's pill field directly under the wordmark */}
      {!isCollapsed && (
        <div className="px-4 pt-4 pb-3">
          <div className="relative">
            <Search className="w-[15px] h-[15px] text-ink-dim absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search"
              aria-label="Filter navigation"
              className="fx-search pl-10 pr-11 py-2.5"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 font-num text-[9.5px] font-bold text-ink-dim pointer-events-none">
              ⌘ K
            </kbd>
          </div>
        </div>
      )}

      {/* Grouped navigation */}
      <nav className={`flex-1 overflow-y-auto pb-2 ${isCollapsed ? 'px-2 pt-4' : 'px-3'}`}>
        {groups.map((group, gi) => (
          <div key={group.title} className={gi === 0 ? '' : 'mt-5'}>
            {!isCollapsed && (
              <span className="fx-eyebrow block px-3 mb-1.5">{group.title}</span>
            )}
            {isCollapsed && gi > 0 && (
              <div className="mx-2 my-3 h-px bg-hairsoft" aria-hidden="true" />
            )}
            <div className="space-y-0.5">{group.items.map(renderItem)}</div>
          </div>
        ))}

        {groups.length === 0 && (
          <p className="px-3 py-6 text-center text-xs font-ui text-ink-dim">
            No module matches “{filter}”.
          </p>
        )}

        {/* Dimmed utility block, as at the foot of the reference rail */}
        {!isCollapsed && groups.length > 0 && (
          <div className="mt-5">
            <span className="fx-eyebrow block px-3 mb-1.5">General</span>
            <div className="space-y-0.5 opacity-55">
              {QUIET_LINKS.map(renderItem)}
            </div>
          </div>
        )}
      </nav>

      {/* Upgrade card — the reference's bottom promo block */}
      {!isCollapsed ? (
        <div className="m-3 p-4 rounded-2xl bg-elev border border-hair">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-4 h-4 text-ember-400" />
            <strong className="font-display text-[13px] font-bold text-ink">
              SOC Sentinel 2.4
            </strong>
          </div>
          <p className="text-[11.5px] font-ui text-ink-muted leading-snug mb-3">
            Multi-turn Bangla interception and Golden-Hour money tracing are live.
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/recovery"
              onClick={onCloseMobile}
              className="fx-btn-primary flex-1 px-2.5 py-1.5 text-[11px]"
            >
              Trace Money
            </Link>
            <Link
              href="/simulator"
              onClick={onCloseMobile}
              className="fx-btn-ghost px-3 py-1.5 text-[11px]"
            >
              ROI
            </Link>
          </div>
        </div>
      ) : (
        <div className="m-2 mb-3 flex justify-center">
          <Link
            href="/recovery"
            title="Golden-Hour Trace"
            className="fx-btn-primary w-10 h-10 !rounded-2xl"
          >
            <Crown className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop rail — sits flush on the near-black canvas */}
      <aside
        className={`hidden lg:flex flex-col select-none shrink-0 transition-[width] duration-300 ease-out ${
          isCollapsed ? 'w-[76px]' : 'w-[268px]'
        } max-h-[calc(100vh-72px)]`}
      >
        {railBody}
      </aside>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-canvas/80 backdrop-blur-sm"
            aria-hidden="true"
          />
          <div className="relative w-[280px] max-w-[86vw] h-full z-10 flex flex-col bg-canvas border-r border-hair shadow-glass">
            <div className="px-4 py-4 flex items-center justify-between border-b border-hairsoft">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/brand/astha-mark.png"
                  alt="Astha"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain shrink-0"
                />
                <span className="font-display font-bold text-[15px] text-ink tracking-tight">
                  Astha
                </span>
              </div>
              <button
                onClick={onCloseMobile}
                className="fx-icon-btn !w-8 !h-8"
                aria-label="Close navigation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{railBody}</div>
          </div>
        </div>
      )}
    </>
  );
};
