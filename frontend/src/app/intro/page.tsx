'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { 
  Shield, Sparkles, ArrowRight, Activity, Zap, CheckCircle2, 
  Lock, Network, Clock, Radio, Smartphone, AlertTriangle, 
  ChevronRight, Database, Cpu, FileText, Layers, ShieldCheck, 
  ExternalLink, BarChart3, Users, Play, Pause, Check, Moon, Sun, 
  ArrowUpRight, RefreshCw, Eye, Flame, Terminal, Waves, Sliders,
  Search, Bell, Share2, Wallet, ArrowDownRight, TrendingUp,
  CreditCard, PieChart, Info, DollarSign, ArrowDown, ChevronDown
} from 'lucide-react';
import { useTheme } from '../../components/ThemeProvider';

export default function IntroPage() {
  const { theme, toggleTheme } = useTheme();

  // Animation refs
  const heroRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const cursorFollowerRef = useRef<HTMLDivElement>(null);

  // Interactive Live Demo states
  const [activeTab, setActiveTab] = useState<'nlp' | 'graph' | 'goldenHour' | 'ussd'>('nlp');
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [voiceProgress, setVoiceProgress] = useState(0);
  const [voiceDetectedKeywords, setVoiceDetectedKeywords] = useState<string[]>([]);
  const [muleRingFrozen, setMuleRingFrozen] = useState(false);
  const [goldenHourMinute, setGoldenHourMinute] = useState(12);
  const [isScrubbingGoldenHour, setIsScrubbingGoldenHour] = useState(false);
  const [ussdSimState, setUssdSimState] = useState<'normal' | 'swap_detected' | 'intercepted'>('intercepted');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // ROI Calculator states
  const [monthlyVolume, setMonthlyVolume] = useState<number>(12); // in Crores BDT
  const [riskIncidentRate, setRiskIncidentRate] = useState<number>(0.42); // percent

  // Live Threat Ticker Items
  const tickerItems = [
    { id: 1, loc: 'DHAKA CENTRAL', alert: 'FastTree 2.4 halted ৳65,000 multi-hop mule split', time: '2s ago', type: 'BLOCKED' },
    { id: 2, loc: 'CHITTAGONG GRID', alert: 'USSD PIN harvest pattern intercepted on *268#', time: '14s ago', type: 'DEFENDED' },
    { id: 3, loc: 'SYLHET BORDER', alert: 'Golden-Hour escrow triggered: ৳120k preserved in 4.2m', time: '29s ago', type: 'RECOVERED' },
    { id: 4, loc: 'RAJSHAHI HUB', alert: 'Ring-12 dormant mule node clustered via graph AI', time: '51s ago', type: 'CLASSIFIED' },
    { id: 5, loc: 'KHULNA WEST', alert: 'Agent #AG-9912 suspicious cash-out volume frozen', time: '1m ago', type: 'INTERCEPTED' },
  ];

  // Mouse Spotlight Tracking Effect (Awwwards Style from references)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (cursorFollowerRef.current) {
        gsap.to(cursorFollowerRef.current, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.5,
          ease: 'power2.out',
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // GSAP Cinematic Entrance Timeline.
  // `fromTo` + `clearProps` is deliberate: the hero is visible by default in
  // CSS and GSAP only drives the entrance, so an interrupted timeline can
  // never leave an element stranded at opacity 0.
  useEffect(() => {
    const SELECTORS = '.gsap-hero-badge, .gsap-hero-title, .gsap-hero-desc, .gsap-hero-cta';

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      tl.fromTo('.gsap-hero-badge',
        { y: -25, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, clearProps: 'all' })
        .fromTo('.gsap-hero-title',
          { y: 35, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.1, stagger: 0.1, clearProps: 'all' }, '-=0.4')
        .fromTo('.gsap-hero-desc',
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, clearProps: 'all' }, '-=0.7')
        .fromTo('.gsap-hero-cta',
          { scale: 0.94, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, stagger: 0.12, ease: 'back.out(1.4)', clearProps: 'all' }, '-=0.5');
    }, heroRef);

    // Failsafe: if the timeline is torn down mid-flight the hero still shows.
    const failsafe = window.setTimeout(() => {
      heroRef.current?.querySelectorAll<HTMLElement>(SELECTORS).forEach((el) => {
        el.style.removeProperty('opacity');
        el.style.removeProperty('transform');
        el.style.removeProperty('scale');
        el.style.removeProperty('translate');
        el.style.removeProperty('rotate');
      });
    }, 2200);

    return () => {
      window.clearTimeout(failsafe);
      ctx.revert();
    };
  }, []);

  // Bangla Voice Simulator Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlayingVoice) {
      interval = setInterval(() => {
        setVoiceProgress((prev) => {
          if (prev >= 100) {
            setIsPlayingVoice(false);
            return 100;
          }
          const next = prev + 5;
          if (next > 25 && !voiceDetectedKeywords.includes('lottery')) {
            setVoiceDetectedKeywords((curr) => [...curr, 'lottery', '৫০,০০০ টাকা']);
          }
          if (next > 60 && !voiceDetectedKeywords.includes('pin')) {
            setVoiceDetectedKeywords((curr) => [...curr, 'pin', 'গোপন ওটিপি']);
          }
          return next;
        });
      }, 180);
    }
    return () => clearInterval(interval);
  }, [isPlayingVoice, voiceDetectedKeywords]);

  // Golden Hour Interactive Auto-Playback
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isScrubbingGoldenHour) {
      timer = setInterval(() => {
        setGoldenHourMinute((prev) => {
          if (prev >= 15) {
            setIsScrubbingGoldenHour(false);
            return 15;
          }
          return prev + 1;
        });
      }, 600);
    }
    return () => clearInterval(timer);
  }, [isScrubbingGoldenHour]);

  // Dynamic ROI calculations
  const calculatedSavings = ((monthlyVolume * 10000000) * (riskIncidentRate / 100) * 0.92) / 10000000;
  const timeSavedHrs = Math.round(monthlyVolume * 24.5);

  return (
    <div 
      ref={heroRef}
      className="min-h-screen bg-canvas text-slate-100 font-ui selection:bg-orange-500/30 selection:text-orange-200 relative overflow-x-hidden"
    >
      {/* Dynamic Cursor Spotlight Following Mouse */}
      <div 
        ref={cursorFollowerRef}
        className="fixed w-[600px] h-[600px] -left-[300px] -top-[300px] bg-gradient-to-r from-orange-600/[0.08] via-amber-500/[0.04] to-transparent rounded-full blur-[120px] pointer-events-none z-0"
      />

      {/* ======================================================== */}
      {/* SIGNATURE FLAME BEAM — a white-hot filament that widens  */}
      {/* as it falls and blooms where it meets the product card.  */}
      {/* ======================================================== */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1000px] z-0 hidden sm:block overflow-hidden">
        <div className="absolute left-[62%] lg:left-[64%] top-0 h-[900px] w-[760px] -translate-x-1/2">
          {/* Outer haze — a soft halo, no hard edges */}
          <div
            className="absolute left-1/2 top-0 h-full w-[620px] -translate-x-1/2 blur-[90px]"
            style={{
              background:
                'radial-gradient(ellipse 16% 94% at 50% 86%, rgba(255,74,0,0.46) 0%, rgba(255,74,0,0.14) 42%, transparent 76%)',
            }}
          />
          {/* Mid glow — narrow, blurred away at both ends */}
          <div
            className="absolute left-1/2 top-0 h-[81%] w-[74px] -translate-x-1/2 blur-[22px]"
            style={{
              background:
                'linear-gradient(180deg, transparent 0%, rgba(255,150,80,0.22) 26%, rgba(255,90,31,0.6) 72%, rgba(255,74,0,0.72) 100%)',
              maskImage:
                'linear-gradient(90deg, transparent 0%, #000 42%, #000 58%, transparent 100%), linear-gradient(180deg, #000 0%, #000 88%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(90deg, transparent 0%, #000 42%, #000 58%, transparent 100%), linear-gradient(180deg, #000 0%, #000 88%, transparent 100%)',
              maskComposite: 'intersect',
              WebkitMaskComposite: 'source-in',
            }}
          />
          {/* Bright core — stays slim, like the reference filament */}
          <div
            className="absolute left-1/2 top-0 h-[80%] w-[22px] -translate-x-1/2 blur-[6px]"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,236,208,0.75) 26%, rgba(255,160,90,0.92) 66%, rgba(255,86,16,1) 100%)',
              maskImage: 'linear-gradient(180deg, #000 0%, #000 86%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 86%, transparent 100%)',
            }}
          />
          {/* Hairline filament */}
          <div
            className="absolute left-1/2 top-0 h-[79%] w-[1.5px] -translate-x-1/2"
            style={{
              background:
                'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.5) 24%, rgba(255,255,255,0.95) 76%, rgba(255,214,168,0) 100%)',
            }}
          />
          {/* Bloom where the beam lands on the product preview */}
          <div
            className="absolute left-1/2 top-[66%] h-[360px] w-[880px] -translate-x-1/2 blur-[54px]"
            style={{
              background:
                'radial-gradient(ellipse 40% 46% at 50% 30%, rgba(255,255,255,0.78) 0%, rgba(255,176,88,0.42) 18%, rgba(255,74,0,0.22) 42%, transparent 72%)',
            }}
          />
        </div>
      </div>

      {/* Ambient background glow orbs */}
      <div className="fixed top-[-120px] left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-gradient-to-b from-orange-600/12 via-amber-500/5 to-transparent rounded-full blur-[150px] pointer-events-none z-0"></div>
      <div className="fixed bottom-0 right-[-100px] w-[550px] h-[550px] bg-gradient-to-tl from-orange-600/10 to-transparent rounded-full blur-[150px] pointer-events-none z-0"></div>

      {/* Grid Canvas Texture (From Reference Image 1) */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#131620_1px,transparent_1px),linear-gradient(to_bottom,#131620_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0 opacity-80"></div>

      {/* ======================================================== */}
      {/* 1. FLOATING PILL NAVIGATION BAR (Reference Image 1) */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-canvas/80 border-b border-white/[0.06] transition-all">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-flame-500 via-flame-500 to-ember-400 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform duration-200">
              <Shield className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <span className="font-display font-black text-2xl text-white tracking-[-0.03em]">
              upay <span className="text-flame-500">Shield</span>
            </span>
          </Link>

          {/* Center Floating Pill Menu (Exact style from Reference 1) */}
          <nav className="hidden lg:flex items-center p-1 bg-canvas/90 border border-white/10 rounded-full shadow-xl backdrop-blur-md text-xs font-ui">
            <a 
              href="#hero" 
              className="px-4 py-1.5 rounded-full bg-flame-600 text-white font-bold shadow-[0_0_15px_rgba(232,93,4,0.4)] transition-all"
            >
              Home
            </a>
            <a 
              href="#interactive-engine" 
              className="px-4 py-1.5 text-slate-400 hover:text-white transition-colors"
            >
              Live Simulator
            </a>
            <a 
              href="#showcase" 
              className="px-4 py-1.5 text-slate-400 hover:text-white transition-colors"
            >
              Dashboard
            </a>
            <a 
              href="#features" 
              className="px-4 py-1.5 text-slate-400 hover:text-white transition-colors"
            >
              Features
            </a>
            <a 
              href="#engine" 
              className="px-4 py-1.5 text-slate-400 hover:text-white transition-colors"
            >
              AI Engine
            </a>
            <a 
              href="#roi-calculator" 
              className="px-4 py-1.5 text-slate-400 hover:text-white transition-colors"
            >
              ROI Impact
            </a>
            <a 
              href="#pricing" 
              className="px-4 py-1.5 text-slate-400 hover:text-white transition-colors"
            >
              Pricing
            </a>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link
              href="/dashboard"
              className="px-5 py-2 rounded-full bg-flame-600 hover:bg-flame-500 text-white font-display font-bold text-xs shadow-[0_0_20px_rgba(232,93,4,0.35)] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>Launch SOC</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. REAL-TIME THREAT RADAR TICKER */}
      {/* ======================================================== */}
      <div className="relative z-20 bg-black/85 border-b border-white/[0.06] backdrop-blur-md overflow-hidden py-2 text-xs font-num">
        <div className="max-w-[1400px] mx-auto px-4 flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0 pr-4 border-r border-white/10 text-flame-500 font-bold uppercase tracking-wider text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Live Stream</span>
          </div>

          <div className="flex-1 overflow-x-hidden whitespace-nowrap">
            <div className="inline-flex gap-8 animate-marquee">
              {tickerItems.concat(tickerItems).map((item, idx) => (
                <div key={idx} className="inline-flex items-center gap-2 text-slate-400 text-[11px]">
                  <span className="text-slate-200 font-semibold">[{item.loc}]</span>
                  <span>{item.alert}</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/25">
                    {item.type}
                  </span>
                  <span className="text-slate-500">· {item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. HERO SECTION WITH PROMPT & LASER ACCENT (Image 1 & 2) */}
      {/* ======================================================== */}
      <section id="hero" className="relative z-10 pt-16 sm:pt-24 pb-14 px-4 sm:px-6 max-w-[1400px] mx-auto">
        
        {/* Pill Tag (Exact layout from Reference 1) */}
        <div className="gsap-hero-badge inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-ui mb-6 backdrop-blur-md">
          <span>Finance Solution in One Platform</span>
          <ArrowRight className="w-3 h-3 text-flame-500" />
        </div>

        {/* Master Headline (Exact 2-line structure from Reference 1) */}
        <h1 
          ref={headlineRef}
          className="gsap-hero-title text-[34px] sm:text-5xl lg:text-[56px] xl:text-[66px] font-display font-black tracking-[-0.035em] text-white max-w-[13ch] sm:max-w-[16ch] leading-[1.08] mb-6"
        >
          Unlock The Power <br />
          <span className="bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
            Of Finance Analytics
          </span>
        </h1>

        {/* Subtext */}
        <p className="gsap-hero-desc text-sm sm:text-base lg:text-lg text-slate-400 max-w-2xl font-ui leading-relaxed mb-8">
          Gain deep insights into your financial telemetry and intercept illicit transactions in real-time. Turn fraud signals into automated strategies that protect 40M+ MFS users.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center gap-4 mb-12">
          <Link
            href="/dashboard"
            className="gsap-hero-cta px-7 py-3 rounded-full bg-flame-600 hover:bg-flame-500 text-white font-display font-bold text-sm shadow-[0_0_25px_rgba(232,93,4,0.4)] hover:scale-[1.02] transition-all cursor-pointer flex items-center gap-2"
          >
            <span>Let's Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <a
            href="#interactive-engine"
            className="gsap-hero-cta px-6 py-3 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white font-display font-medium text-sm transition-all flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5 text-flame-500 fill-flame-500" />
            <span>Test Live Interception Engine</span>
          </a>
        </div>

        {/* Interactive AI Prompt Box (From Reference Image 2: Creator-AI style) */}
        <div className="max-w-3xl p-3 sm:p-4 rounded-2xl bg-canvas/90 border border-flame-500/30 backdrop-blur-xl shadow-2xl shadow-orange-500/10 mb-16 relative">
          <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/[0.06] text-xs font-num text-slate-400">
            <Terminal className="w-4 h-4 text-flame-500" />
            <span className="flex-1 text-slate-300">
              Ask upay Shield AI to trace transaction, freeze mule wallet, or analyze voice call...
            </span>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-lg bg-flame-500/20 text-flame-500 hover:bg-flame-500/30 font-bold text-[11px] transition-colors"
            >
              Analyze
            </Link>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mt-3 px-1 text-[11px] text-slate-400">
            <span className="text-slate-500 font-num">Quick Scenarios:</span>
            <button 
              onClick={() => setActiveTab('nlp')} 
              className={`px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                activeTab === 'nlp' ? 'bg-flame-500/20 border-flame-500 text-orange-300 font-semibold' : 'bg-white/[0.04] border-white/10 text-slate-300'
              }`}
            >
              Bangla Voice Scam (৳50k)
            </button>
            <button 
              onClick={() => setActiveTab('graph')} 
              className={`px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                activeTab === 'graph' ? 'bg-flame-500/20 border-flame-500 text-orange-300 font-semibold' : 'bg-white/[0.04] border-white/10 text-slate-300'
              }`}
            >
              Mule Ring-12 (Rajshahi)
            </button>
            <button 
              onClick={() => setActiveTab('goldenHour')} 
              className={`px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                activeTab === 'goldenHour' ? 'bg-flame-500/20 border-flame-500 text-orange-300 font-semibold' : 'bg-white/[0.04] border-white/10 text-slate-300'
              }`}
            >
              Sub-15m Golden-Hour Trace
            </button>
            <button 
              onClick={() => setActiveTab('ussd')} 
              className={`px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                activeTab === 'ussd' ? 'bg-flame-500/20 border-flame-500 text-orange-300 font-semibold' : 'bg-white/[0.04] border-white/10 text-slate-300'
              }`}
            >
              USSD *268# SIM-Swap
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. ICONIC FLOATING DASHBOARD SHOWCASE (Reference Image 1) */}
        {/* ======================================================== */}
        <div id="showcase" className="relative mt-8 rounded-3xl p-4 sm:p-7 bg-canvas/90 border border-white/10 shadow-2xl backdrop-blur-2xl">
          
          {/* Top Bar with Brand, Search, and Status */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-flame-500 via-flame-500 to-ember-400 flex items-center justify-center font-bold text-slate-950 text-xs font-display">
                U
              </div>
              <span className="text-xs font-num text-slate-400">
                upay-shield-v2.4 &gt; <strong className="text-white">Fraud Operations Desk</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-num text-slate-400">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span>Filter alerts...</span>
                <span className="px-1.5 py-0.2 rounded bg-white/10 text-[9px]">⌘K</span>
              </div>
              <button className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-300">
                <Bell className="w-3.5 h-3.5" />
              </button>
              <Link 
                href="/dashboard"
                className="px-3.5 py-1.5 rounded-lg bg-flame-600 hover:bg-flame-500 text-white text-xs font-display font-bold flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(232,93,4,0.3)]"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Open Full Desk</span>
              </Link>
            </div>
          </div>

          {/* Row 1: Metrics Cards (Exact 3-Card Split from Reference 1) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            
            {/* Card 1: Vibrant Orange Card (Exact from Reference 1) */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-flame-600 via-flame-500 to-ember-500 text-white shadow-xl shadow-orange-500/25 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-display font-bold uppercase tracking-wider text-white/90">
                  Protected Capital
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-num text-[10px] font-bold">
                  +15.4%
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-display font-black tracking-[-0.03em]">
                ৳28,520,300
              </div>
              <Link href="/recovery" className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-semibold hover:text-white/80 transition-colors">
                <span>View recovery audit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Card 2: Dark Glass Card - Suspicious Holds */}
            <div className="p-6 rounded-2xl bg-card/80 border border-white/[0.08] hover:border-white/20 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-num text-slate-400 uppercase tracking-wider">
                  Suspicious Escrow Hold
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-num text-[10px] font-bold">
                  +3.2%
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-display font-black text-white tracking-[-0.03em]">
                ৳24,800.45
              </div>
              <Link href="/investigations" className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-num text-slate-400 hover:text-white transition-colors">
                <span>FastTree sub-15m hold</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Card 3: Dark Glass Card - Prevented Fraud Exposure */}
            <div className="p-6 rounded-2xl bg-card/80 border border-white/[0.08] hover:border-white/20 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-num text-slate-400 uppercase tracking-wider">
                  Prevented Fraud Exposure
                </span>
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-num text-[10px] font-bold">
                  99.4%
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-display font-black text-white tracking-[-0.03em]">
                ৳70,120.78
              </div>
              <Link href="/analyst" className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-num text-slate-400 hover:text-white transition-colors">
                <span>Analyze performance</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

          </div>

          {/* Row 2: Wallet Overview + Cash Flow Bar Chart (From Reference 1) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Left: Interception Channels (Reference 1 "My Wallet" component) */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-card/80 border border-white/[0.08]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-display font-bold text-white">Active Defense Channels</span>
                <span className="text-[10px] font-num text-emerald-400">All Nominal</span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-flame-500/15 text-flame-500 flex items-center justify-center font-bold text-xs font-display">
                      APP
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Customer App Transactions</div>
                      <div className="text-[10px] font-num text-slate-400">Whisper NLP Active</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-num font-bold text-white">৳24,678,00</div>
                    <span className="text-[9px] font-num text-emerald-400">0.04% FP</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold text-xs font-display">
                      USSD
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Feature Phone (*268#)</div>
                      <div className="text-[10px] font-num text-slate-400">SIM-Swap Guard</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-num font-bold text-white">৳28,345,00</div>
                    <span className="text-[9px] font-num text-emerald-400">28ms Latency</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center font-bold text-xs font-display">
                      AGT
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Agent Outlets (Float Guard)</div>
                      <div className="text-[10px] font-num text-slate-400">Cash-out Limits</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-num font-bold text-white">৳1,52,675,00</div>
                    <span className="text-[9px] font-num text-amber-400">Monitored</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Cash Flow Bar Chart (Reference 1 "Cash Flow" chart with orange bar) */}
            <div className="lg:col-span-7 p-6 rounded-2xl bg-card/80 border border-white/[0.08] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-num text-slate-400 block">Total Intercepted Flow</span>
                  <span className="text-2xl font-display font-black text-white tracking-[-0.03em]">৳540,323.45</span>
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-black/40 border border-white/10 text-[10px] font-num">
                  <button className="px-2 py-0.5 rounded bg-white/10 text-white font-bold">Monthly</button>
                  <button className="px-2 py-0.5 text-slate-400">Yearly</button>
                </div>
              </div>

              {/* Bar Chart Representation with Signature Highlighted Orange Pillar */}
              <div className="h-44 flex items-end justify-between gap-2 pt-6 px-2">
                {[
                  { month: 'Jan', val: 40 },
                  { month: 'Feb', val: 55 },
                  { month: 'Mar', val: 35 },
                  { month: 'Apr', val: 65 },
                  { month: 'May', val: 95, highlight: true }, // The orange highlighted pillar from Reference 1
                  { month: 'Jun', val: 50 },
                  { month: 'Jul', val: 70 },
                  { month: 'Aug', val: 45 },
                  { month: 'Sep', val: 60 },
                  { month: 'Oct', val: 80 },
                ].map((bar, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full flex items-end justify-center h-32">
                      <div 
                        style={{ height: `${bar.val}%` }}
                        className={`w-full max-w-[32px] rounded-t-lg transition-all duration-300 ${
                          bar.highlight 
                            ? 'bg-gradient-to-t from-flame-600 via-flame-500 to-ember-400 shadow-[0_0_20px_rgba(232,93,4,0.5)] relative' 
                            : 'bg-white/[0.06] group-hover:bg-white/[0.12]'
                        }`}
                      >
                        {bar.highlight && (
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-flame-600 text-white font-bold text-[9px] font-num whitespace-nowrap shadow-md">
                            ৳95k
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] font-num ${bar.highlight ? 'text-flame-500 font-bold' : 'text-slate-500'}`}>
                      {bar.month}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </section>

      {/* ======================================================== */}
      {/* 5. INTERACTIVE THREAT DEFENSE ENGINE (LIVE SANDBOX) */}
      {/* ======================================================== */}
      <section id="interactive-engine" className="relative z-10 py-20 px-4 sm:px-6 max-w-[1400px] mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-card border border-white/10 text-flame-500 text-xs font-num uppercase mb-4 shadow-sm">
            <Cpu className="w-3.5 h-3.5" />
            <span>Interactive Simulator</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-display font-black tracking-[-0.03em] text-white mb-4">
            Experience Live Attack Interception
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed font-ui">
            Click across the 4 core detection pipelines to test how the engine parses speech, clusters money laundering graphs, freezes accounts, and halts USSD tampering.
          </p>
        </div>

        {/* Interactive Tab Switcher */}
        <div className="flex items-center justify-center gap-2 p-1.5 rounded-full bg-canvas/90 border border-white/10 max-w-2xl mx-auto mb-8 backdrop-blur-xl shadow-lg">
          {[
            { key: 'nlp', label: '1. Bangla Voice NLP', icon: Waves },
            { key: 'graph', label: '2. Mule Ring-12', icon: Network },
            { key: 'goldenHour', label: '3. Golden-Hour Recovery', icon: Clock },
            { key: 'ussd', label: '4. USSD *268# Guard', icon: Smartphone },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-full text-xs font-display font-bold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-flame-600 text-white shadow-[0_0_15px_rgba(232,93,4,0.4)] scale-[1.02]' 
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split('.')[1]}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Bangla Voice NLP Simulator */}
        {activeTab === 'nlp' && (
          <div className="p-6 sm:p-10 rounded-3xl bg-canvas/95 border border-white/[0.08] backdrop-blur-2xl max-w-5xl mx-auto shadow-2xl">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-white/[0.08]">
              <div>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-num uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Live Voice Interception
                </span>
                <h3 className="text-2xl font-display font-black tracking-tight text-white mt-2">
                  Multi-Turn Bangla Speech Scam Classifier
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Processes live call streams via Whisper-FinTech & custom Bengali acoustic tokenizers.
                </p>
              </div>

              <button
                onClick={() => {
                  if (isPlayingVoice) {
                    setIsPlayingVoice(false);
                  } else {
                    setVoiceProgress(0);
                    setVoiceDetectedKeywords([]);
                    setIsPlayingVoice(true);
                  }
                }}
                className={`px-5 py-2.5 rounded-full font-display font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  isPlayingVoice 
                    ? 'bg-rose-500 text-white animate-pulse' 
                    : 'bg-flame-600 hover:bg-flame-500 text-white shadow-[0_0_15px_rgba(232,93,4,0.4)]'
                }`}
              >
                {isPlayingVoice ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                <span>{isPlayingVoice ? 'Pause Audio Feed' : 'Simulate Scam Audio Call'}</span>
              </button>
            </div>

            {/* Audio Waveform Animation Grid */}
            <div className="p-6 rounded-2xl bg-black/60 border border-white/[0.06] mb-6">
              <div className="flex items-center justify-between text-xs font-num text-slate-400 mb-4">
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isPlayingVoice ? 'bg-rose-500 animate-ping' : 'bg-slate-600'}`}></span>
                  Audio Stream: GP-VoLTE-Stream-Dhaka-01788
                </span>
                <span className="text-flame-500 font-bold">{voiceProgress}% Processed</span>
              </div>

              {/* Dynamic Soundwave Bars */}
              <div className="h-16 flex items-end gap-1 sm:gap-1.5 overflow-hidden px-2">
                {Array.from({ length: 48 }).map((_, idx) => {
                  const barHeight = isPlayingVoice
                    ? Math.sin(idx * 0.4 + voiceProgress * 0.2) * 40 + 45
                    : 15;
                  const isHighAlert = isPlayingVoice && idx > 20 && idx < 35;
                  return (
                    <div
                      key={idx}
                      style={{ height: `${barHeight}%` }}
                      className={`flex-1 rounded-full transition-all duration-150 ${
                        isHighAlert 
                          ? 'bg-rose-500 shadow-sm shadow-rose-500' 
                          : isPlayingVoice 
                            ? 'bg-gradient-to-t from-flame-600 to-ember-400' 
                            : 'bg-slate-800'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Real-time Transcription Stream */}
              <div className="mt-6 p-4 rounded-xl bg-black/50 border border-white/[0.06] font-bangla text-sm sm:text-base leading-relaxed text-slate-200">
                <span className="text-xs font-num text-flame-500 block mb-1">LIVE TRANSCRIPT (Bengali Real-Time Stream):</span>
                <span>"হ্যালো স্যার, আমি উপায় প্রধান কার্যালয় থেকে বলছি। আপনার অ্যাকাউন্টে </span>
                <span className={`px-1.5 py-0.5 rounded transition-all ${voiceProgress > 25 ? 'bg-rose-500/30 text-rose-300 font-bold' : ''}`}>
                  ৫০,০০০ টাকার লটারি বোনাস
                </span>
                <span> জমা হয়েছে। টাকাটি ছাড় করাতে আপনার মোবাইলে পাঠানো </span>
                <span className={`px-1.5 py-0.5 rounded transition-all ${voiceProgress > 60 ? 'bg-rose-500/40 text-rose-200 font-bold ring-1 ring-rose-500' : ''}`}>
                  ৪ ডিজিটের গোপনীয় পিন বা ওটিপি নম্বরটি
                </span>
                <span> দ্রুত বলুন..."</span>
              </div>
            </div>

            {/* AI Decision Pill Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="text-[11px] font-num text-slate-400 uppercase">Emergency Urgency Trigger</div>
                <div className="text-xl font-display font-black text-rose-400 mt-1">
                  {voiceProgress > 25 ? '99.4% (Confirmed)' : 'Awaiting stream'}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="text-[11px] font-num text-slate-400 uppercase">Credential Phishing Vector</div>
                <div className="text-xl font-display font-black text-flame-500 mt-1">
                  {voiceProgress > 60 ? 'PIN Extraction Detected' : 'Analyzing intent'}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="text-[11px] font-num text-slate-400 uppercase">Automated Action</div>
                <div className="text-xl font-display font-black text-emerald-400 mt-1">
                  {voiceProgress > 60 ? 'Instant Freeze Command Dispatched' : 'Active Monitoring'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Mule Ring-12 Graph Visualizer */}
        {activeTab === 'graph' && (
          <div className="p-6 sm:p-10 rounded-3xl bg-canvas/95 border border-white/[0.08] backdrop-blur-2xl max-w-5xl mx-auto shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/[0.08]">
              <div>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-num uppercase bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  Graph Neural Network
                </span>
                <h3 className="text-2xl font-display font-black tracking-tight text-white mt-2">
                  Syndicate Ring-12 Topology Explorer
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Multi-hop transactional clustering across 14 connected dormant accounts in Rajshahi.
                </p>
              </div>

              <button
                onClick={() => setMuleRingFrozen(!muleRingFrozen)}
                className={`px-5 py-2.5 rounded-full font-display font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  muleRingFrozen
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{muleRingFrozen ? 'Mule Ring Frozen (14 Nodes Locked)' : 'Trigger Immediate Multi-Node Freeze'}</span>
              </button>
            </div>

            {/* Interactive Graph Canvas Simulation */}
            <div className="relative h-[340px] rounded-2xl bg-canvas border border-white/[0.06] overflow-hidden flex items-center justify-center p-4">
              {/* Radial Center Ring Pulse */}
              <div className="absolute w-[240px] h-[240px] rounded-full border border-flame-500/20 animate-ping pointer-events-none"></div>
              <div className="absolute w-[360px] h-[360px] rounded-full border border-dashed border-white/10 pointer-events-none"></div>

              {/* Center Syndicate Node */}
              <div className="relative z-10 text-center">
                <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center font-display font-black text-sm border transition-all duration-300 ${
                  muleRingFrozen 
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-xl shadow-emerald-500/20 scale-105' 
                    : 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-xl shadow-rose-500/20 animate-pulse'
                }`}>
                  {muleRingFrozen ? 'LOCKED' : 'RING-12'}
                </div>
                <span className="text-[11px] font-num text-slate-300 block mt-2 font-bold">Syndicate Master</span>
                <span className="text-[10px] font-num text-slate-500">৳380,000 Aggregated</span>
              </div>

              {/* Orbiting Satellite Mule Nodes */}
              {[
                { label: 'Mule #01', pos: 'top-8 left-12', bdt: '৳45k', role: 'Dormant Student' },
                { label: 'Mule #02', pos: 'top-8 right-12', bdt: '৳60k', role: 'Fake NID' },
                { label: 'Agent Out', pos: 'bottom-8 left-16', bdt: '৳120k', role: 'Cash-out Agent' },
                { label: 'Mule #03', pos: 'bottom-8 right-16', bdt: '৳35k', role: 'SIM Swap Acct' },
              ].map((node, idx) => (
                <div 
                  key={idx} 
                  className={`absolute ${node.pos} p-3 rounded-xl border backdrop-blur-xl transition-all duration-300 ${
                    muleRingFrozen
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900/80 border-white/10 text-slate-200 hover:border-orange-500/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-display font-bold">
                    <span className={`w-2 h-2 rounded-full ${muleRingFrozen ? 'bg-emerald-400' : 'bg-flame-500 animate-ping'}`}></span>
                    <span>{node.label}</span>
                  </div>
                  <div className="text-[10px] font-num text-slate-400">{node.role}</div>
                  <div className="text-xs font-num font-bold text-flame-500 mt-1">{node.bdt}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs font-num text-slate-400">
              <span>FastTree Graph Risk Score: <strong className="text-rose-400">0.968 (Critical)</strong></span>
              <span>Central Bank STR/SAR Auto-Docket: <strong className="text-emerald-400">Ready</strong></span>
            </div>
          </div>
        )}

        {/* Tab 3: Golden-Hour Recovery Timeline Scrubber */}
        {activeTab === 'goldenHour' && (
          <div className="p-6 sm:p-10 rounded-3xl bg-canvas/95 border border-white/[0.08] backdrop-blur-2xl max-w-5xl mx-auto shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/[0.08]">
              <div>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-num uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Sub-15m Recovery Protocol
                </span>
                <h3 className="text-2xl font-display font-black tracking-tight text-white mt-2">
                  Automated Golden-Hour SLA Timeline
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Drag the scrubber to inspect automated escalation checkpoints from scam execution to full recovery.
                </p>
              </div>

              <button
                onClick={() => {
                  setGoldenHourMinute(0);
                  setIsScrubbingGoldenHour(true);
                }}
                className="px-5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 font-display font-bold text-xs flex items-center gap-2 text-white transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-flame-500 ${isScrubbingGoldenHour ? 'animate-spin' : ''}`} />
                <span>Auto-Replay 15-Min Run</span>
              </button>
            </div>

            {/* Interactive Timeline Scrubbing Bar */}
            <div className="p-6 rounded-2xl bg-black/60 border border-white/[0.06] mb-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-num text-slate-400">Timeline Elapsed:</span>
                <span className="text-2xl font-display font-black text-flame-500">
                  T+{goldenHourMinute} mins
                </span>
              </div>

              {/* Slider Input */}
              <input 
                type="range" 
                min="0" 
                max="15" 
                value={goldenHourMinute}
                onChange={(e) => setGoldenHourMinute(Number(e.target.value))}
                className="w-full accent-flame-600 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />

              <div className="flex justify-between text-[10px] font-num text-slate-500 mt-2">
                <span>T+0m (Scam Initiated)</span>
                <span>T+5m (FastTree Flag)</span>
                <span>T+10m (Escrow Hold)</span>
                <span>T+15m (100% Secured)</span>
              </div>
            </div>

            {/* Checkpoint Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[
                { min: 2, title: 'T+2m: Victim Report', desc: 'Complaint logged via IVR/App or USSD hotkey' },
                { min: 5, title: 'T+5m: Graph AI Hop Trace', desc: 'Identified 3 outbound splitting hops' },
                { min: 10, title: 'T+10m: Multi-MFS Hold', desc: 'Escrow lock sent to partner wallets' },
                { min: 14, title: 'T+14m: 100% Funds Secured', desc: '৳85,000 preserved before ATM cash-out' },
              ].map((phase, idx) => {
                const isPassed = goldenHourMinute >= phase.min;
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all duration-300 ${
                      isPassed 
                        ? 'bg-orange-500/10 border-orange-500/30 text-white' 
                        : 'bg-white/[0.02] border-white/[0.05] text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-num uppercase font-bold">Phase 0{idx+1}</span>
                      <CheckCircle2 className={`w-4 h-4 ${isPassed ? 'text-flame-500' : 'text-slate-700'}`} />
                    </div>
                    <div className="text-xs font-display font-bold">{phase.title}</div>
                    <div className="text-[11px] font-ui text-slate-400 mt-1 leading-snug">{phase.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: USSD *268# Guard */}
        {activeTab === 'ussd' && (
          <div className="p-6 sm:p-10 rounded-3xl bg-canvas/95 border border-white/[0.08] backdrop-blur-2xl max-w-5xl mx-auto shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/[0.08]">
              <div>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-num uppercase bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  Feature-Phone Perimeter
                </span>
                <h3 className="text-2xl font-display font-black tracking-tight text-white mt-2">
                  USSD Session & Cell Tower Tamper Guard (*268#)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Protects 60%+ of offline rural transactions from SIM swaps, cell tower IMSI catchers, and rapid PIN brute force.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setUssdSimState('normal')}
                  className={`px-4 py-1.5 rounded-full text-xs font-display font-bold cursor-pointer transition-all ${
                    ussdSimState === 'normal' ? 'bg-slate-700 text-white' : 'bg-white/[0.04] text-slate-400'
                  }`}
                >
                  Normal Session
                </button>
                <button
                  onClick={() => setUssdSimState('intercepted')}
                  className={`px-4 py-1.5 rounded-full text-xs font-display font-bold cursor-pointer transition-all ${
                    ussdSimState === 'intercepted' ? 'bg-flame-600 text-white font-black shadow-[0_0_15px_rgba(232,93,4,0.4)]' : 'bg-white/[0.04] text-slate-400'
                  }`}
                >
                  SIM-Swap Attack
                </button>
              </div>
            </div>

            {/* USSD Mobile Feature Phone Mock */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="p-6 rounded-2xl bg-black border border-white/10 font-num text-center">
                <div className="text-[10px] text-slate-500 mb-2">TELCO USSD GATEWAY (*268#)</div>
                <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-left space-y-2">
                  <div className="text-xs font-bold border-b border-emerald-500/20 pb-1">upay Main Menu</div>
                  <div className="text-xs">1. Send Money</div>
                  <div className="text-xs">2. Cash Out</div>
                  <div className="text-xs">3. Mobile Recharge</div>
                  <div className="text-xs">4. Pay Bill</div>
                  <div className="text-xs">5. My Account</div>
                  {ussdSimState === 'intercepted' && (
                    <div className="mt-3 p-2 rounded bg-rose-500/20 text-rose-300 text-[11px] border border-rose-500/30 font-bold">
                      [ALERT] IMSI change detected 14 mins ago. Additional OTP challenge dispatched to fallback agent.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="text-[11px] font-num text-slate-400">IMSI / IMEI Telemetry Binding</div>
                  <div className="text-base font-display font-bold text-white mt-1">
                    {ussdSimState === 'intercepted' ? '⚠️ Mismatch: IMSI changed without KYC window' : '✓ Clean: Handshake Verified'}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="text-[11px] font-num text-slate-400">FastTree Latency on Telco Gateway</div>
                  <div className="text-base font-display font-bold text-flame-500 mt-1">
                    28ms (Zero impact on USSD timeout)
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="text-[11px] font-num text-slate-400">Zero-Balance USSD Hotkey (*268*99#)</div>
                  <div className="text-base font-display font-bold text-emerald-400 mt-1">
                    Allows any citizen to freeze wallet instantly without airtime
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 6. TRUSTED BY SECTION (From Reference Image 1) */}
      {/* ======================================================== */}
      <section className="relative z-10 py-12 border-y border-white/[0.06] bg-canvas/60 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 text-center">
          <p className="text-xs font-num uppercase tracking-widest text-slate-500 mb-8">
            Trusted by 40,000+ businesses and financial operations to scale outbound trust
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-60 grayscale hover:grayscale-0 transition-all">
            <div className="flex items-center gap-2 text-base font-display font-black tracking-tight text-white">
              <Shield className="w-5 h-5 text-flame-500" />
              <span>UCB FinTech</span>
            </div>
            <div className="flex items-center gap-2 text-base font-display font-black tracking-tight text-white">
              <Activity className="w-5 h-5 text-amber-500" />
              <span>upay Core</span>
            </div>
            <div className="flex items-center gap-2 text-base font-display font-black tracking-tight text-white">
              <Database className="w-5 h-5 text-sky-500" />
              <span>Bangladesh Bank NPSB</span>
            </div>
            <div className="flex items-center gap-2 text-base font-display font-black tracking-tight text-white">
              <Cpu className="w-5 h-5 text-emerald-500" />
              <span>FastTree AI Labs</span>
            </div>
            <div className="flex items-center gap-2 text-base font-display font-black tracking-tight text-white">
              <Lock className="w-5 h-5 text-purple-500" />
              <span>GSMA Mobile Shield</span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 7. PROBLEM VS SOLUTION BENTO (From Reference Image 2) */}
      {/* ======================================================== */}
      <section className="relative z-10 py-20 px-4 sm:px-6 max-w-[1400px] mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-card border border-white/10 text-rose-400 text-xs font-num uppercase mb-4 shadow-sm">
            <span>• THE PROBLEM</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-display font-black tracking-[-0.03em] text-white mb-4">
            Legacy Fraud Operations Are Broken
          </h2>
          <p className="text-sm sm:text-base text-slate-400 font-ui leading-relaxed">
            Manual customer queues and 72-hour inter-bank bureaucracy cost MFS users millions while scammers cash out in under 15 minutes.
          </p>
        </div>

        {/* 3 Problem Cards (Exact layout from Reference 2) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="p-7 rounded-2xl bg-canvas/90 border border-white/[0.08] text-center hover:border-rose-500/30 transition-all shadow-xl">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-3xl sm:text-4xl font-display font-black text-white mb-2 tracking-[-0.03em]">
              72+ Hours
            </div>
            <div className="text-xs font-semibold text-slate-300">Legacy Dispute TAT</div>
            <div className="text-[11px] font-num text-slate-500 mt-1">Average time to freeze mule accounts manually</div>
          </div>

          <div className="p-7 rounded-2xl bg-canvas/90 border border-white/[0.08] text-center hover:border-flame-500/30 transition-all shadow-xl">
            <div className="w-10 h-10 rounded-xl bg-flame-500/10 text-flame-500 flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="text-3xl sm:text-4xl font-display font-black text-white mb-2 tracking-[-0.03em]">
              ৳50K - ৳500K
            </div>
            <div className="text-xs font-semibold text-slate-300">Typical Loss Per Campaign</div>
            <div className="text-[11px] font-num text-slate-500 mt-1">Average capital lost before manual syndicate detection</div>
          </div>

          <div className="p-7 rounded-2xl bg-canvas/90 border border-white/[0.08] text-center hover:border-amber-500/30 transition-all shadow-xl">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-3xl sm:text-4xl font-display font-black text-white mb-2 tracking-[-0.03em]">
              15+ Analysts
            </div>
            <div className="text-xs font-semibold text-slate-300">Manual Review Bottleneck</div>
            <div className="text-[11px] font-num text-slate-500 mt-1">Staff required per 100k daily transactions</div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 8. FEATURES 6-CARD BENTO GRID (Reference Image 1) */}
      {/* ======================================================== */}
      <section id="features" className="relative z-10 py-20 px-4 sm:px-6 max-w-[1400px] mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-card border border-white/10 text-slate-300 text-xs font-ui mb-4 shadow-sm">
            <span>Some of features</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-display font-black tracking-[-0.03em] text-white mb-4">
            Transforming your financial <br />operations effortlessly.
          </h2>
          <p className="text-sm sm:text-base text-slate-400 font-ui leading-relaxed">
            Streamline and master your fraud defense with upay Shield, the leading platform built to make financial management effortless.
          </p>
        </div>

        {/* 6 Bento Grid Cards (Exact from Reference 1) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Bento Card 1: Keep Smart Asset Tracking (Reference 1) */}
          <div className="p-6 rounded-2xl bg-canvas border border-white/[0.08] hover:border-flame-500/30 transition-all flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-num text-slate-400">Live Asset Monitor</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              </div>
              <div className="p-4 rounded-xl bg-black/50 border border-white/[0.06] mb-4">
                <div className="text-xs font-num text-slate-400">FastTree AI Ticker</div>
                <div className="text-2xl font-display font-black text-white mt-1 tracking-tight">0.073658 ML</div>
                <Link 
                  href="/analyst"
                  className="w-full mt-3 py-2 rounded-full bg-flame-600 hover:bg-flame-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(232,93,4,0.3)] block text-center"
                >
                  Analyze Triage Stream
                </Link>
              </div>
            </div>
            <div>
              <h4 className="text-base font-display font-bold text-white mb-1">Keep Smart Asset Tracking</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Empower your portfolio insights with automated balance updates in real-time.
              </p>
            </div>
          </div>

          {/* Bento Card 2: Unified Wallet Dashboard (Reference 1) */}
          <div className="p-6 rounded-2xl bg-canvas border border-white/[0.08] hover:border-flame-500/30 transition-all flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-num text-slate-400">My Channels</span>
                <span className="text-[10px] font-num text-flame-500 font-bold">Active</span>
              </div>
              <div className="p-4 rounded-xl bg-black/50 border border-white/[0.06] mb-4 grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-white/[0.03]">
                  <div className="text-[10px] text-slate-500">MFS App</div>
                  <div className="text-sm font-bold text-white font-num">৳24,678.00</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.03]">
                  <div className="text-[10px] text-slate-500">USSD *268#</div>
                  <div className="text-sm font-bold text-white font-num">৳22,345.00</div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-base font-display font-bold text-white mb-1">Unified Wallet Dashboard</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Manage multiple channels effortlessly while keeping full control over your transactions.
              </p>
            </div>
          </div>

          {/* Bento Card 3: Spending Performance View (Reference 1) */}
          <div className="p-6 rounded-2xl bg-canvas border border-white/[0.08] hover:border-flame-500/30 transition-all flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-num text-slate-400">Yearly Protected Volume</span>
                <span className="text-xs font-num font-bold text-white">৳112,340,00</span>
              </div>
              <div className="h-28 flex items-end justify-center gap-1.5 py-2 mb-4">
                {[30, 45, 25, 60, 95, 40, 75].map((h, i) => (
                  <div 
                    key={i} 
                    style={{ height: `${h}%` }}
                    className={`w-4 rounded-t-sm ${i === 4 ? 'bg-flame-600 shadow-[0_0_12px_rgba(232,93,4,0.5)]' : 'bg-white/10'}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-base font-display font-bold text-white mb-1">Spending Performance View</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Track your revenue and cost ratio visually to understand your growth.
              </p>
            </div>
          </div>

          {/* Bento Card 4: Market Growth Insights (Reference 1 - Line Sparkline) */}
          <div className="p-6 rounded-2xl bg-canvas border border-white/[0.08] hover:border-flame-500/30 transition-all flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-num text-slate-400">Model Precision</span>
                <span className="text-[10px] font-num text-emerald-400">+1.2%</span>
              </div>
              <div className="h-28 relative my-2 flex items-center">
                {/* SVG Glowing Line Graph */}
                <svg className="w-full h-24 overflow-visible" viewBox="0 0 100 40">
                  <path 
                    d="M0,35 Q20,30 40,25 T70,15 T100,5" 
                    fill="none" 
                    stroke="#FF5A1F" 
                    strokeWidth="2.5" 
                    className="drop-shadow-[0_0_8px_rgba(255,85,0,0.6)]"
                  />
                  <circle cx="100" cy="5" r="3" fill="#FFB23D" className="animate-ping" />
                </svg>
              </div>
            </div>
            <div>
              <h4 className="text-base font-display font-bold text-white mb-1">Market Growth Insights</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Visualize performance trends over time to make smarter investment and business decisions faster.
              </p>
            </div>
          </div>

          {/* Bento Card 5: Client Funnel Analytics (Reference 1 - Gauge Speedometer) */}
          <div className="p-6 rounded-2xl bg-canvas border border-white/[0.08] hover:border-flame-500/30 transition-all flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-num text-slate-400">Golden-Hour SLA</span>
                <span className="text-xs font-bold text-flame-500">75.5%</span>
              </div>
              
              {/* Semi-circular Speedometer Gauge from Reference 1 */}
              <div className="relative h-28 flex items-center justify-center my-2">
                <div className="w-32 h-16 border-t-8 border-l-8 border-r-8 border-flame-500 rounded-t-full relative flex items-end justify-center shadow-[0_0_20px_rgba(255,85,0,0.4)]">
                  <span className="text-lg font-display font-black text-white mb-1 tracking-tight">75.5%</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-base font-display font-bold text-white mb-1">Client Funnel Analytics</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Compare conversions across multiple platforms and uncover where your audience drives the most value.
              </p>
            </div>
          </div>

          {/* Bento Card 6: Ring-12 Mule Topology */}
          <div className="p-6 rounded-2xl bg-canvas border border-white/[0.08] hover:border-flame-500/30 transition-all flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-num text-slate-400">Syndicate Topology</span>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">14 Mules</span>
              </div>
              <div className="h-28 flex items-center justify-center my-2">
                <div className="w-16 h-16 rounded-full border border-flame-500/40 flex items-center justify-center relative animate-pulse shadow-[0_0_20px_rgba(255,85,0,0.3)]">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-flame-500 to-amber-500"></div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-base font-display font-bold text-white mb-1">Ring-12 Graph Discovery</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Autonomous graph clustering unmasks multi-hop laundering syndicates across districts in sub-second time.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 9. ARCHITECTURE NODE HUB (From Reference Image 2) */}
      {/* ======================================================== */}
      <section id="engine" className="relative z-10 py-20 px-4 sm:px-6 max-w-[1400px] mx-auto text-center">
        <h2 className="text-3xl sm:text-5xl font-display font-black tracking-[-0.03em] text-white mb-4">
          The AI Engine Built for Modern MFS
        </h2>
        <p className="text-sm sm:text-base text-slate-400 font-ui max-w-2xl mx-auto mb-16">
          Trained on millions of mobile financial transactions, telco signal patterns, and multi-dialect Bangla speech transcripts.
        </p>

        {/* Illuminated Pedestal Architecture (Reference 2 Architecture Diagram) */}
        <div className="relative max-w-4xl mx-auto p-10 rounded-3xl bg-canvas/90 border border-white/10 shadow-2xl overflow-hidden">
          
          {/* Top Nodes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10 mb-16">
            <div className="p-4 rounded-xl bg-black/60 border border-flame-500/30 text-left shadow-lg">
              <span className="text-[10px] font-num text-flame-500 block uppercase">Speech Layer</span>
              <strong className="text-xs font-display text-white">Bangla Voice NLP</strong>
            </div>

            <div className="p-4 rounded-xl bg-black/60 border border-flame-500/30 text-left shadow-lg">
              <span className="text-[10px] font-num text-flame-500 block uppercase">Clustering Layer</span>
              <strong className="text-xs font-display text-white">FastTree Mule GNN</strong>
            </div>

            <div className="p-4 rounded-xl bg-black/60 border border-flame-500/30 text-left shadow-lg">
              <span className="text-[10px] font-num text-flame-500 block uppercase">Settlement Layer</span>
              <strong className="text-xs font-display text-white">Golden-Hour Escrow</strong>
            </div>

            <div className="p-4 rounded-xl bg-black/60 border border-flame-500/30 text-left shadow-lg">
              <span className="text-[10px] font-num text-flame-500 block uppercase">Hardware Layer</span>
              <strong className="text-xs font-display text-white">USSD *268# Guard</strong>
            </div>
          </div>

          {/* Glowing Radial Core Pedestal */}
          <div className="relative w-48 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-flame-500/80 shadow-[0_0_50px_rgba(255,85,0,0.8)]"></div>
            <div className="absolute inset-2 rounded-full border border-orange-400/50"></div>
            <span className="relative z-10 flex items-center justify-center h-full text-xs font-num font-bold text-white tracking-widest uppercase">
              upay Core Engine
            </span>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 10. INTERACTIVE ROI & RISK IMPACT CALCULATOR */}
      {/* ======================================================== */}
      <section id="roi-calculator" className="relative z-10 py-20 px-4 sm:px-6 max-w-[1400px] mx-auto">
        <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent border border-white/[0.08] backdrop-blur-2xl shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Controls */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-num uppercase bg-flame-500/10 text-flame-500 border border-flame-500/20">
                  Institutional Economics
                </span>
                <h3 className="text-3xl sm:text-4xl font-display font-black tracking-[-0.03em] text-white mt-3">
                  Calculate Your Protected Capital
                </h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed font-ui">
                  Adjust your MFS daily transaction volume and typical fraud attack velocity to estimate quarterly savings with upay Shield.
                </p>
              </div>

              {/* Slider 1: Monthly Volume */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-num">
                  <span className="text-slate-400">Monthly Transaction Volume:</span>
                  <span className="text-white font-bold">{monthlyVolume} Crore BDT (৳{monthlyVolume * 10}M)</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="50"
                  value={monthlyVolume}
                  onChange={(e) => setMonthlyVolume(Number(e.target.value))}
                  className="w-full accent-flame-600 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider 2: Incident Rate */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-num">
                  <span className="text-slate-400">Scam Attack Attempt Rate:</span>
                  <span className="text-white font-bold">{riskIncidentRate}% of txns</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.05"
                  value={riskIncidentRate}
                  onChange={(e) => setRiskIncidentRate(Number(e.target.value))}
                  className="w-full accent-flame-600 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Right Projected Metrics */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-black/70 border border-flame-500/20 backdrop-blur-xl shadow-xl">
                <span className="text-[11px] font-num text-slate-400 uppercase">Estimated Monthly Savings</span>
                <div className="text-3xl sm:text-4xl font-display font-black text-flame-500 mt-2 tracking-[-0.03em]">
                  ৳{calculatedSavings.toFixed(2)} Cr
                </div>
                <span className="text-[10px] font-num text-emerald-400 block mt-1">92% Average Asset Recovery</span>
              </div>

              <div className="p-6 rounded-2xl bg-black/70 border border-white/[0.08] backdrop-blur-xl shadow-xl">
                <span className="text-[11px] font-num text-slate-400 uppercase">Analyst Time Saved</span>
                <div className="text-3xl sm:text-4xl font-display font-black text-white mt-2 tracking-[-0.03em]">
                  {timeSavedHrs} hrs
                </div>
                <span className="text-[10px] font-num text-slate-400 block mt-1">Automated Triage Escalation</span>
              </div>

              <div className="p-6 rounded-2xl bg-black/70 border border-white/[0.08] backdrop-blur-xl shadow-xl">
                <span className="text-[11px] font-num text-slate-400 uppercase">SLA Benchmark</span>
                <div className="text-3xl sm:text-4xl font-display font-black text-emerald-400 mt-2 tracking-[-0.03em]">
                  8.4 mins
                </div>
                <span className="text-[10px] font-num text-slate-400 block mt-1">Down from legacy 72 hours</span>
              </div>

              <div className="p-6 rounded-2xl bg-black/70 border border-white/[0.08] backdrop-blur-xl shadow-xl">
                <span className="text-[11px] font-num text-slate-400 uppercase">Audit Trail</span>
                <div className="text-3xl sm:text-4xl font-display font-black text-white mt-2 tracking-[-0.03em]">
                  SHA-256
                </div>
                <span className="text-[10px] font-num text-slate-400 block mt-1">Immutable Court Evidence</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 11. PRICING & TIERED PLANS (From Reference Image 1 & 2) */}
      {/* ======================================================== */}
      <section id="pricing" className="relative z-10 py-20 px-4 sm:px-6 max-w-[1400px] mx-auto text-center">
        <h2 className="text-3xl sm:text-5xl font-display font-black tracking-[-0.03em] text-white mb-4">
          Find the Plan That Works for You
        </h2>
        <p className="text-sm sm:text-base text-slate-400 font-ui max-w-xl mx-auto mb-8">
          Explore our adaptable plans, crafted to support every step of your institution's financial defense growth.
        </p>

        {/* Toggle Pill (Reference 1) */}
        <div className="inline-flex items-center p-1 rounded-full bg-canvas border border-white/10 mb-14 text-xs font-ui shadow-lg">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
              billingCycle === 'monthly' ? 'bg-flame-600 text-white font-bold shadow-md' : 'text-slate-400'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
              billingCycle === 'yearly' ? 'bg-flame-600 text-white font-bold shadow-md' : 'text-slate-400'
            }`}
          >
            <span>Yearly Billing</span>
            <span className="px-1.5 py-0.2 rounded bg-orange-400/20 text-orange-300 text-[10px] font-bold">-20%</span>
          </button>
        </div>

        {/* 3 Tier Cards (Exact layout from Reference 1) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto text-left">
          
          {/* Card 1: Starter Plan (Free) */}
          <div className="p-7 rounded-2xl bg-canvas border border-white/[0.08] flex flex-col justify-between shadow-xl">
            <div>
              <div className="text-sm font-display font-bold text-white">Starter Plan</div>
              <p className="text-xs text-slate-400 mt-1 mb-6">
                Tailored for sandbox validators and startups ready to streamline finances.
              </p>
              <div className="text-3xl font-display font-black text-white mb-6 tracking-[-0.03em]">Free</div>
            </div>
            <Link
              href="/dashboard"
              className="w-full py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white font-bold text-xs text-center block transition-all"
            >
              Start a Project
            </Link>
          </div>

          {/* Card 2: Basic Plan ($120/mo with Orange Highlight CTA) */}
          <div className="p-7 rounded-2xl bg-canvas border border-flame-500/40 relative shadow-2xl shadow-orange-500/15 flex flex-col justify-between">
            <span className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full bg-flame-600 text-white font-bold text-[10px] tracking-wider uppercase shadow-md">
              Popular
            </span>
            <div>
              <div className="text-sm font-display font-bold text-white">Basic Enterprise</div>
              <p className="text-xs text-slate-400 mt-1 mb-6">
                Designed for commercial MFS scaling up, with the tools to stay agile.
              </p>
              <div className="text-3xl font-display font-black text-white mb-6 tracking-[-0.03em]">
                ৳120K <span className="text-xs font-normal text-slate-400">/Month</span>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="w-full py-2.5 rounded-full bg-flame-600 hover:bg-flame-500 text-white font-bold text-xs text-center block shadow-[0_0_20px_rgba(232,93,4,0.35)] transition-all"
            >
              Start a Project
            </Link>
          </div>

          {/* Card 3: Launch Plan ($450/mo) */}
          <div className="p-7 rounded-2xl bg-canvas border border-white/[0.08] flex flex-col justify-between shadow-xl">
            <div>
              <div className="text-sm font-display font-bold text-white">Launch Institutional</div>
              <p className="text-xs text-slate-400 mt-1 mb-6">
                Custom-built to meet the needs of central banks and major telcos.
              </p>
              <div className="text-3xl font-display font-black text-white mb-6 tracking-[-0.03em]">
                ৳450K <span className="text-xs font-normal text-slate-400">/Month</span>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="w-full py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white font-bold text-xs text-center block transition-all"
            >
              Start a Project
            </Link>
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 12. CALL TO ACTION SECTION */}
      {/* ======================================================== */}
      <section className="relative z-10 py-20 px-4 sm:px-6 max-w-[1200px] mx-auto text-center">
        <div className="p-10 sm:p-16 rounded-3xl bg-gradient-to-tr from-orange-500/15 via-amber-500/10 to-transparent border border-flame-500/30 backdrop-blur-2xl relative overflow-hidden shadow-2xl">
          
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-5xl font-display font-black tracking-[-0.03em] text-white">
              Ready to Explore The Unified SOC Console?
            </h2>
            <p className="text-sm sm:text-base text-slate-300 font-ui leading-relaxed">
              Log into the analyst triage command center, trace active mule syndicates across Bangladesh, and run live transaction simulations.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-flame-600 hover:bg-flame-500 text-white font-display font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(232,93,4,0.45)] hover:scale-[1.02] transition-transform cursor-pointer"
              >
                <span>Enter SOC Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/rings"
                className="w-full sm:w-auto px-7 py-4 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white font-display font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Network className="w-4 h-4 text-flame-500" />
                <span>Open Ring-12 Hub</span>
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 13. FOOTER */}
      {/* ======================================================== */}
      <footer className="relative z-10 border-t border-white/[0.08] py-12 px-4 sm:px-6 bg-canvas/95">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-flame-500 via-flame-500 to-ember-400 flex items-center justify-center text-slate-950 font-black font-display">
              U
            </div>
            <div>
              <strong className="text-white font-display block text-sm">upay Shield Platform</strong>
              <span className="text-[11px] text-slate-500">Autonomous Financial Intelligence & Fraud Interception</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-num text-[11px]">
            <Link href="/dashboard" className="hover:text-flame-500 transition-colors">Executive Hub</Link>
            <Link href="/analyst" className="hover:text-flame-500 transition-colors">Analyst Console</Link>
            <Link href="/rings" className="hover:text-flame-500 transition-colors">Ring-12 Explorer</Link>
            <Link href="/recovery" className="hover:text-flame-500 transition-colors">Golden-Hour Trace</Link>
            <Link href="/simulator" className="hover:text-flame-500 transition-colors">ROI Simulator</Link>
            <Link href="/audit" className="hover:text-flame-500 transition-colors">SHA-256 Ledger</Link>
          </div>

          <div className="text-[11px] font-num text-slate-500">
            <span>Next.js 15 · FastTree ML · Fintrixity Dark-Glass Theme</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
