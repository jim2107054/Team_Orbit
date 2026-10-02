/**
 * Frontend UI Constants & Color Definitions
 */

export const RISK_TIER_COLORS = {
  CRITICAL: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  },
  HIGH: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  MEDIUM: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  },
  LOW: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  }
} as const;

export const NAVIGATION_ITEMS = [
  { href: '/', label: 'Overview', icon: 'LayoutDashboard' },
  { href: '/customer', label: 'Customer App', icon: 'Smartphone' },
  { href: '/analyst', label: 'Analyst Console', icon: 'ShieldCheck' },
  { href: '/campaigns', label: 'Campaigns', icon: 'Layers' },
  { href: '/complaints', label: 'Complaints', icon: 'MessageSquare' },
  { href: '/knowledge-graph', label: 'Knowledge Graph', icon: 'Network' },
  { href: '/recovery', label: 'Recovery Optimizer', icon: 'Compass' },
  { href: '/propagation', label: 'Spread Defense', icon: 'Activity' },
  { href: '/agent', label: 'Agent Guard', icon: 'Store' },
  { href: '/merchants', label: 'Merchant Shield', icon: 'QrCode' },
  { href: '/rings', label: 'Mule Rings', icon: 'Users' },
  { href: '/ussd', label: 'USSD Engine', icon: 'Phone' },
  { href: '/simulator', label: 'Simulator', icon: 'Play' },
  { href: '/fairness', label: 'Fairness & Drift', icon: 'Scale' },
  { href: '/audit', label: 'Audit Log', icon: 'FileText' }
] as const;
