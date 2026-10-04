'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import gsap from 'gsap';
import { 
  Shield, Sparkles, ArrowRight, Activity, Zap, CheckCircle2, 
  Lock, Network, Clock, Smartphone,
  ChevronRight, Database, Cpu, ShieldCheck, 
  BarChart3, Users, Play, Pause, Check, 
  RefreshCw, Terminal, Waves,
  Search, Bell, Share2, CreditCard, DollarSign
} from 'lucide-react';

export default function IntroPage() {

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

  // GSAP Cinematic Entrance Timeline + Animated Light Beam Drop & Spread on Refresh
  useEffect(() => {
    const SELECTORS = '.gsap-hero-badge, .gsap-hero-title, .gsap-hero-desc, .gsap-hero-cta';

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      // 1. First the Vertical Flame Beam drops down from the heavens
      tl.fromTo('.gsap-beam-drop',
        { scaleY: 0, opacity: 0, transformOrigin: 'top center' },
        { scaleY: 1, opacity: 1, duration: 0.85, ease: 'power3.inOut' }
      )
      // 2. Right as the beam strikes the contact point, the horizontal flare spreads out!
      .fromTo('.gsap-beam-spread',
        { scaleX: 0, opacity: 0, transformOrigin: 'center center' },
        { scaleX: 1, opacity: 1, duration: 0.8, ease: 'power4.out' },
        '-=0.18'
      )
      // 3. Radiant impact bloom shockwave expands
      .fromTo('.gsap-beam-bloom',
        { scale: 0.25, opacity: 0, transformOrigin: 'center center' },
        { scale: 1, opacity: 1, duration: 1.0, ease: 'power3.out' },
        '-=0.7'
      )
      // 4. Hero text & CTAs cascade in
      .fromTo('.gsap-hero-badge',
        { y: -25, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, clearProps: 'all' }, '-=0.75')
      .fromTo('.gsap-hero-title',
        { y: 35, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.1, stagger: 0.1, clearProps: 'all' }, '-=0.55')
      .fromTo('.gsap-hero-desc',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, clearProps: 'all' }, '-=0.7')
      .fromTo('.gsap-hero-cta',
        { scale: 0.94, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, stagger: 0.12, ease: 'back.out(1.4)', clearProps: 'all' }, '-=0.5');

      // Continuous subtle breathing pulse for the beam glow and permanent spreading flare
      gsap.to('.gsap-beam-pulse', {
        opacity: 0.75,
        scale: 1.05,
        duration: 2.4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      // Keep the spreading flare active and shimmering along the dashboard edge
      gsap.to('.gsap-beam-spread', {
        opacity: 0.9,
        scaleX: 1.04,
        duration: 2.0,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 1.5
      });
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

  // GSAP Automated AI Engine Scroll Entrance & Circuit Connection Animation
  useEffect(() => {
    const engineEl = document.getElementById('engine');
    if (!engineEl) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

          // 1. Cards fade & lift into position with glassmorphic reveal
          tl.fromTo('.gsap-engine-card',
            { y: 35, opacity: 0, scale: 0.96 },
            { y: 0, opacity: 1, scale: 1, duration: 0.75, stagger: 0.12, clearProps: 'transform,opacity' }
          )
          // 2. Neon circuit lines automatically draw down from cards to connect to AI portal
          .fromTo('.gsap-circuit-path',
            { strokeDashoffset: 1200, opacity: 0 },
            { strokeDashoffset: 0, opacity: 1, duration: 1.1, stagger: 0.08, ease: 'power2.inOut' },
            '-=0.35'
          )
          // 3. Glowing isometric portal halo & core badge power up and bloom
          .fromTo('.gsap-engine-portal',
            { scale: 0.8, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.85, ease: 'back.out(1.4)', clearProps: 'transform,opacity' },
            '-=0.45'
          );

          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    observer.observe(engineEl);

    return () => observer.disconnect();
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
      className="min-h-screen bg-[#08090C] text-slate-200 font-ui selection:bg-[#FF5C00]/30 selection:text-orange-200 relative overflow-x-hidden"
    >
      {/* Dynamic Cursor Spotlight Following Mouse */}
      <div 
        ref={cursorFollowerRef}
        className="fixed w-[600px] h-[600px] -left-[300px] -top-[300px] bg-gradient-to-r from-[#FF5C00]/[0.08] via-amber-500/[0.04] to-transparent rounded-full blur-[120px] pointer-events-none z-0"
      />

      {/* Ambient background glow orbs */}
      <div className="fixed top-[-120px] left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-gradient-to-b from-[#FF5C00]/15 via-amber-500/5 to-transparent rounded-full blur-[150px] pointer-events-none z-0"></div>
      <div className="fixed bottom-0 right-[-100px] w-[550px] h-[550px] bg-gradient-to-tl from-[#FF5C00]/12 to-transparent rounded-full blur-[150px] pointer-events-none z-0"></div>

      {/* Grid Canvas Texture */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#131620_1px,transparent_1px),linear-gradient(to_bottom,#131620_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0 opacity-80"></div>

      {/* ======================================================== */}
      {/* 1. SEAMLESS GLASS NAVBAR (Theme-Matched, No Heavy Black Bar) */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-50 bg-transparent transition-all">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between gap-6">
          
          {/* Brand */}
          <Link href="/dashboard" className="flex items-center gap-2.5 group shrink-0">
            <Image
              src="/brand/astha-mark.png"
              alt="Astha"
              width={32}
              height={32}
              priority
              className="w-8 h-8 object-contain group-hover:scale-105 transition-transform duration-200"
            />
            <span className="font-display font-medium text-[18px] text-white tracking-[-0.03em]">
              Astha
            </span>
          </Link>

          {/* Center nav - Floating Glass Pill */}
          <nav className="hidden lg:flex items-center gap-1 p-1.5 bg-white/[0.04] border border-white/[0.08] rounded-2xl backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]">
            {[
              { href: '#hero', label: 'Home', active: true },
              { href: '#interactive-engine', label: 'Simulator' },
              { href: '#showcase', label: 'Dashboard' },
              { href: '#features', label: 'Features' },
              { href: '#engine', label: 'AI Engine' },
              { href: '#roi-calculator', label: 'ROI' },
              { href: '#pricing', label: 'Pricing' },
            ].map(item => (
              <a key={item.href} href={item.href}
                className={`px-4 py-1.5 rounded-xl text-[13px] font-ui font-medium transition-all ${
                  item.active
                    ? 'bg-[#FF5C00] text-white shadow-[0_0_16px_rgba(255,92,0,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}>
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white font-ui font-medium text-[13px] backdrop-blur-xl transition-all shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
              Sign in
            </Link>
            <Link href="/dashboard"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#FF5C00] hover:bg-[#FF7324] text-white font-ui font-semibold text-[13px] shadow-[0_0_20px_rgba(255,92,0,0.35)] hover:shadow-[0_0_28px_rgba(255,92,0,0.5)] transition-all hover:scale-[1.02] active:scale-95">
              <span>Launch SOC</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. HERO SECTION */}
      {/* ======================================================== */}
      <section id="hero" className="relative z-10 pt-14 sm:pt-20 pb-16 px-5 sm:px-8 max-w-[1400px] mx-auto">
        
        {/* Eye-catching Glassmorphic Live Threat News Capsule (In place of badge) */}
        <div className="gsap-hero-badge inline-flex items-center max-w-[680px] w-full sm:w-auto rounded-xl bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-white/[0.01] backdrop-blur-xl border border-white/[0.1] shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)] px-3.5 py-2 mb-8 gap-3 overflow-hidden">
          <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-white/[0.08]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[#FF5C00] font-num font-semibold uppercase tracking-wider text-[10px]">Live SOC</span>
          </div>
          <div className="flex-1 overflow-hidden whitespace-nowrap">
            <div className="inline-flex gap-8 animate-marquee">
              {tickerItems.concat(tickerItems).map((item, idx) => (
                <div key={idx} className="inline-flex items-center gap-2 text-[11px] font-num">
                  <span className="text-slate-200 font-medium">[{item.loc}]</span>
                  <span className="text-slate-400">{item.alert}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#FF5C00]/20 text-[#FF7324] border border-[#FF5C00]/30 shadow-[0_0_8px_rgba(255,92,0,0.25)]">{item.type}</span>
                  <span className="text-slate-500">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Master Headline — Inter Light (300): the defining "thin" SaaS look */}
        <h1 
          ref={headlineRef}
          className="gsap-hero-title text-[40px] sm:text-5xl lg:text-[66px] xl:text-[76px] font-display font-light tracking-[-0.04em] text-white max-w-[14ch] sm:max-w-[18ch] leading-[1.05] mb-6"
        >
          Unlock The Power <br />
          <span className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Of Finance Analytics
          </span>
        </h1>

        <p className="gsap-hero-desc font-ui font-normal text-[16px] sm:text-[17px] text-slate-400 max-w-[540px] leading-[1.75] tracking-[0.01em] mb-10">
          Gain deep insights into your financial telemetry and intercept illicit transactions in real-time. Protect 40M+ MFS users with AI-native fraud intelligence.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-4 mb-12">
          <Link href="/dashboard"
            className="gsap-hero-cta group inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-[#FF5C00] hover:bg-[#FF7324] text-white font-ui font-semibold text-[14px] shadow-[0_0_28px_rgba(255,92,0,0.4)] hover:shadow-[0_0_40px_rgba(255,92,0,0.55)] transition-all hover:scale-[1.02]">
            <span>Get Started Free</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a href="#interactive-engine"
            className="gsap-hero-cta group inline-flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white font-ui font-medium text-[14px] transition-all">
            <div className="w-5 h-5 rounded-full bg-[#FF5C00]/20 flex items-center justify-center">
              <Play className="w-2.5 h-2.5 text-[#FF5C00] fill-[#FF5C00]" />
            </div>
            <span>Test Live Interception Engine</span>
          </a>
        </div>

        {/* Trust signals */}
        <div className="flex flex-wrap items-center gap-6 mb-12">
          {[
            { label: '40M+ Users Protected', icon: Shield },
            { label: '99.4% Detection Rate', icon: Zap },
            { label: 'Sub-15min SLA', icon: Clock },
            { label: 'ISO 27001 Certified', icon: Lock },
          ].map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2 text-[12px] font-ui font-medium text-slate-500">
              <Icon className="w-3.5 h-3.5 text-[#FF5C00]" />
              {label}
            </div>
          ))}
        </div>

        {/* Dashboard Preview & Integrated Precision Flame Beam Landing */}
        <div className="relative">
          {/* ======================================================== */}
          {/* SIGNATURE FLAME BEAM — Drops directly onto Dashboard Top */}
          {/* ======================================================== */}
          <div className="pointer-events-none absolute right-[12%] sm:right-[16%] lg:right-[18%] bottom-full translate-x-1/2 w-[700px] h-[950px] z-0 hidden sm:block overflow-visible">
            
            {/* 1. Ambient wide orange volumetric haze background (Breathing pulse) */}
            <div
              className="gsap-beam-pulse absolute left-1/2 bottom-0 h-full w-[650px] -translate-x-1/2 blur-[80px]"
              style={{
                background:
                  'radial-gradient(ellipse 35% 85% at 50% 92%, rgba(255,92,0,0.65) 0%, rgba(255,120,30,0.42) 35%, rgba(255,60,0,0.2) 65%, transparent 85%)',
              }}
            />

            {/* 2. THE DROPPING VERTICAL LASER BEAM — Anchored directly to bottom-0 (exact top border of dashboard) */}
            <div className="gsap-beam-drop absolute inset-x-0 bottom-0 h-full origin-top">
              {/* Volumetric outer fiery aura */}
              <div
                className="absolute left-1/2 top-0 bottom-0 w-[130px] -translate-x-1/2 blur-[36px]"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,100,0,0.15) 0%, rgba(255,92,0,0.65) 35%, rgba(255,70,0,0.95) 75%, rgba(255,50,0,1) 100%)',
                }}
              />
              {/* Mid fiery beam column */}
              <div
                className="absolute left-1/2 top-0 bottom-0 w-[48px] -translate-x-1/2 blur-[14px]"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,180,90,0.4) 0%, rgba(255,130,40,0.9) 35%, rgba(255,80,0,1) 75%, rgba(255,50,0,1) 100%)',
                }}
              />
              {/* Bright hot amber core */}
              <div
                className="absolute left-1/2 top-0 bottom-0 w-[18px] -translate-x-1/2 blur-[4px]"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,250,220,0.6) 0%, rgba(255,225,140,0.95) 35%, rgba(255,180,60,1) 75%, rgba(255,255,255,1) 100%)',
                }}
              />
              {/* Ultra incandescent pure white filament */}
              <div
                className="absolute left-1/2 top-0 bottom-0 w-[6px] -translate-x-1/2 blur-[1px]"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,1) 25%, rgba(255,255,255,1) 85%, rgba(255,255,255,1) 100%)',
                  boxShadow: '0 0 12px #FFFFFF, 0 0 24px #FF5C00, 0 0 40px #FF3B00',
                }}
              />
            </div>
          </div>

          {/* 3. EXPANDING RADIANT IMPACT BLOOM SHOCKWAVE (Sitting behind the dashboard card) */}
          <div
            className="gsap-beam-bloom absolute -top-[180px] right-[12%] sm:right-[16%] lg:right-[18%] translate-x-1/2 h-[420px] w-[850px] blur-[42px] origin-center pointer-events-none z-0"
            style={{
              background:
                'radial-gradient(ellipse 55% 45% at 50% 55%, rgba(255,255,255,0.95) 0%, rgba(255,200,100,0.85) 20%, rgba(255,92,0,0.65) 45%, rgba(255,50,0,0.2) 70%, transparent 85%)',
            }}
          />

          {/* Dashboard Preview — Brought to Front (Crisp, High Contrast, Layered) */}
          <div id="showcase" className="relative z-10 rounded-2xl border border-white/[0.1] bg-[#0c0d10] shadow-[0_20px_90px_rgba(0,0,0,0.9)] overflow-hidden">
            
            {/* Unified Precision Top Border Laser & Trumpet Contact Flare */}
            <div className="gsap-beam-spread absolute top-0 inset-x-0 h-[3px] pointer-events-none z-30">
              {/* White-hot laser stroke across the top border */}
              <div
                className="absolute top-0 left-[10%] sm:left-[25%] right-0 h-[2px] blur-[0.5px]"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255,92,0,0.4) 15%, rgba(255,160,50,0.9) 55%, #FFFFFF 82%, rgba(255,140,40,0.9) 95%, transparent 100%)',
                  boxShadow: '0 0 16px #FFFFFF, 0 0 35px #FF5C00, 0 0 70px #FF3B00',
                }}
              />
              {/* Trumpet impact flare right at the laser contact point */}
              <div
                className="absolute -top-[50px] right-[12%] sm:right-[16%] lg:right-[18%] translate-x-1/2 w-[280px] h-[60px] blur-[8px]"
                style={{
                  background:
                    'radial-gradient(ellipse 65% 85% at 50% 100%, rgba(255,255,255,0.98) 0%, rgba(255,160,50,0.85) 40%, rgba(255,80,0,0.45) 70%, transparent 95%)',
                }}
              />
            </div>

            {/* Subtle top ambient glow inside the dashboard */}
            <div className="absolute top-0 right-0 w-[600px] h-[100px] bg-gradient-to-b from-[#FF5C00]/25 via-amber-500/8 to-transparent blur-2xl z-0 pointer-events-none" />
          {/* Browser chrome top bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/60" />
                <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
              </div>
              <div className="hidden sm:flex items-center gap-2 ml-3 px-3 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-[11px] font-num text-slate-500">
                shield.upay.com.bd
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] font-num text-slate-500">
                <Search className="w-3 h-3" />
                <span>Filter alerts...</span>
                <span className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[9px]">⌘K</span>
              </div>
              <button className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <Bell className="w-3.5 h-3.5" />
              </button>
              <Link href="/dashboard" className="px-3 py-1.5 rounded-lg bg-[#FF5C00] hover:bg-[#FF7324] text-white text-[11px] font-ui font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(255,92,0,0.25)]">
                <Share2 className="w-3 h-3" />
                <span>Open Desk</span>
              </Link>
            </div>
          </div>

          {/* Metrics row — divide-based, no gap */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
            {/* Card A: Orange hero */}
            <div className="p-6 bg-gradient-to-br from-[#FF5C00] via-[#F04405] to-[#C73504] relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_80%_110%,rgba(255,255,255,0.12)_0%,transparent_60%)] pointer-events-none" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-ui font-semibold uppercase tracking-widest text-white/80">Protected Capital</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-num text-[10px] font-bold">+15.4%↑</span>
                </div>
                <div className="text-[30px] font-display font-light tracking-[-0.04em] text-white mb-1">৳28,520,300</div>
                <Link href="/recovery" className="flex items-center gap-1 text-[11px] font-ui font-medium text-white/70 hover:text-white transition-colors mt-3 pt-3 border-t border-white/20">
                  View recovery audit <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Card B */}
            <div className="p-6 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-ui font-medium uppercase tracking-widest text-slate-500">Suspicious Escrow Hold</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-num text-[10px] font-bold">+3.2%</span>
              </div>
              <div className="text-[30px] font-display font-light tracking-[-0.04em] text-white mb-1">৳24,800.45</div>
              <Link href="/investigations" className="flex items-center gap-1 text-[11px] font-ui text-slate-500 hover:text-white transition-colors mt-3 pt-3 border-t border-white/[0.06]">
                FastTree sub-15m hold <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Card C */}
            <div className="p-6 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-ui font-medium uppercase tracking-widest text-slate-500">Prevented Fraud Exposure</span>
                <span className="px-2 py-0.5 rounded-full bg-[#FF5C00]/15 text-[#FF5C00] font-num text-[10px] font-bold">99.4%</span>
              </div>
              <div className="text-[30px] font-display font-light tracking-[-0.04em] text-white mb-1">৳70,120.78</div>
              <Link href="/analyst" className="flex items-center gap-1 text-[11px] font-ui text-slate-500 hover:text-white transition-colors mt-3 pt-3 border-t border-white/[0.06]">
                Analyze performance <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Bottom: channels + chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.06]">
            <div className="lg:col-span-5 p-6">
              <div className="flex items-center justify-between mb-5">
                <span className="text-[13px] font-ui font-semibold text-white">Active Defense Channels</span>
                <span className="flex items-center gap-1.5 text-[11px] font-ui text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />All Nominal
                </span>
              </div>
              <div className="space-y-2.5">
                {[
                  { code: 'APP', label: 'Customer App Transactions', sub: 'Whisper NLP Active', val: '৳24,678,00', badge: '0.04% FP', bc: 'text-emerald-400', bg: 'bg-[#FF5C00]/10 text-[#FF5C00]' },
                  { code: 'USSD', label: 'Feature Phone (*268#)', sub: 'SIM-Swap Guard', val: '৳28,345,00', badge: '28ms Latency', bc: 'text-emerald-400', bg: 'bg-amber-500/10 text-amber-400' },
                  { code: 'AGT', label: 'Agent Outlets (Float Guard)', sub: 'Cash-out Limits', val: '৳1,52,675,00', badge: 'Monitored', bc: 'text-amber-400', bg: 'bg-rose-500/10 text-rose-400' },
                ].map(ch => (
                  <div key={ch.code} className="flex items-center justify-between p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:border-white/10 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-md ${ch.bg} flex items-center justify-center text-[10px] font-num font-bold`}>{ch.code}</div>
                      <div>
                        <div className="text-[12px] font-ui font-medium text-white">{ch.label}</div>
                        <div className="text-[10px] font-ui text-slate-500">{ch.sub}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[12px] font-num font-semibold text-white">{ch.val}</div>
                      <div className={`text-[10px] font-num ${ch.bc}`}>{ch.badge}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <span className="text-[11px] font-ui text-slate-500 block">Total Intercepted Flow</span>
                  <span className="text-[22px] font-display font-light tracking-[-0.04em] text-white">৳540,323.45</span>
                </div>
                <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[10px] font-ui">
                  <button className="px-2.5 py-1 rounded-md bg-white/10 text-white font-semibold">Monthly</button>
                  <button className="px-2.5 py-1 text-slate-500 hover:text-slate-300 transition-colors">Yearly</button>
                </div>
              </div>
              <div className="h-40 flex items-end justify-between gap-2 pt-4">
                {[{ m: 'Jan', v: 40 }, { m: 'Feb', v: 55 }, { m: 'Mar', v: 35 }, { m: 'Apr', v: 65 }, { m: 'May', v: 95, hi: true }, { m: 'Jun', v: 50 }, { m: 'Jul', v: 70 }, { m: 'Aug', v: 45 }, { m: 'Sep', v: 60 }, { m: 'Oct', v: 80 }].map((bar, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div className="w-full flex items-end justify-center h-32">
                      <div style={{ height: `${bar.v}%` }} className={`w-full max-w-[28px] transition-all duration-300 relative ${
                        (bar as any).hi ? 'bg-gradient-to-t from-[#FF4500] via-[#FF5C00] to-[#FFB23D] shadow-[0_0_18px_rgba(255,92,0,0.5)] rounded-t-sm' : 'bg-white/[0.06] group-hover:bg-white/10 rounded-t-sm'
                      }`}>
                        {(bar as any).hi && <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#FF5C00] text-white font-num font-bold text-[9px] whitespace-nowrap">৳95k</div>}
                      </div>
                    </div>
                    <span className={`text-[9px] font-num ${(bar as any).hi ? 'text-[#FF5C00] font-bold' : 'text-slate-600'}`}>{bar.m}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Full-width AI Copilot Command Hub — Glassmorphism with Lucide Icons */}
        <div className="relative rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.09] shadow-[0_16px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] p-4 sm:p-5 mt-6 overflow-hidden">
          {/* Subtle top-right ambient glow */}
          <div className="absolute -top-12 -right-12 w-56 h-56 bg-[#FF5C00]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 text-[13px] font-ui text-slate-400">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#FF5C00]/10 border border-[#FF5C00]/25 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(255,92,0,0.2)]">
                <Terminal className="w-4 h-4 text-[#FF5C00]" />
              </div>
              <span className="truncate text-slate-300 font-medium text-[13px] sm:text-[14px]">
                Ask Astha AI — trace transactions, freeze wallets, analyze voice calls...
              </span>
            </div>
            <Link 
              href="/dashboard" 
              className="shrink-0 px-5 py-2.5 rounded-xl bg-[#FF5C00] hover:bg-[#FF7324] text-white font-ui font-semibold text-[13px] transition-all shadow-[0_0_20px_rgba(255,92,0,0.35)] hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Launch Analysis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          
          <div className="relative z-10 flex flex-wrap items-center gap-2 mt-4 pt-3.5 border-t border-white/[0.06]">
            <span className="text-[10px] sm:text-[11px] font-ui font-semibold uppercase tracking-wider text-slate-500 mr-1">
              Quick Test In Simulator:
            </span>
            {[
              { tab: 'nlp', label: 'Bangla Voice Scam', icon: Waves },
              { tab: 'graph', label: 'Mule Ring-12', icon: Network },
              { tab: 'goldenHour', label: 'Golden-Hour Trace', icon: Clock },
              { tab: 'ussd', label: 'USSD SIM-Swap', icon: Smartphone },
            ].map(({ tab, label, icon: Icon }) => (
              <a
                key={tab}
                href="#interactive-engine"
                onClick={() => setActiveTab(tab as any)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-ui transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-[#FF5C00] to-[#FF7324] text-white shadow-[0_0_16px_rgba(255,92,0,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] font-semibold'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white shadow-sm font-medium'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${activeTab === tab ? 'text-white' : 'text-[#FF5C00]'}`} />
                <span>{label}</span>
              </a>
            ))}
          </div>
        </div>

      </section>

      {/* ======================================================== */}
      {/* TRUST STRIP */}
      {/* ======================================================== */}
      <section className="relative z-10 py-14 border-y border-white/[0.05]">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <p className="text-center text-[11px] font-ui font-medium uppercase tracking-widest text-slate-600 mb-10">
            Trusted by financial institutions protecting 40,000+ businesses
          </p>
          <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-16">
            {[
              { icon: Shield, label: 'UCB FinTech', color: 'text-[#FF5C00]' },
              { icon: Activity, label: 'upay Core', color: 'text-amber-400' },
              { icon: Database, label: 'Bangladesh Bank NPSB', color: 'text-sky-400' },
              { icon: Cpu, label: 'FastTree AI Labs', color: 'text-emerald-400' },
              { icon: Lock, label: 'GSMA Mobile Shield', color: 'text-violet-400' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-2.5 group cursor-default">
                <Icon className={`w-4 h-4 ${color} opacity-40 group-hover:opacity-100 transition-opacity`} />
                <span className="text-[13px] font-ui font-medium text-slate-600 group-hover:text-slate-400 transition-colors tracking-[-0.01em]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* INTERACTIVE SIMULATOR */}
      {/* ======================================================== */}
      <section id="interactive-engine" className="relative z-10 py-24 px-5 sm:px-8 max-w-[1400px] mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#FF5C00]/10 border border-[#FF5C00]/25 text-[#FF5C00] text-[11px] font-ui font-medium uppercase tracking-widest mb-5">
            <Cpu className="w-3.5 h-3.5" />
            <span>Interactive Simulator</span>
          </div>
          <h2 className="font-display font-light text-[36px] sm:text-[48px] tracking-[-0.035em] text-white mb-4 leading-[1.1]">
            Experience Live Attack Interception
          </h2>
          <p className="font-ui font-normal text-[15px] text-slate-400 leading-[1.75]">
            Click across the 4 core detection pipelines to test how the engine parses speech, clusters laundering graphs, freezes accounts, and halts USSD tampering.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-2 rounded-2xl bg-[#0c0d10]/90 border border-white/[0.08] backdrop-blur-2xl max-w-4xl mx-auto mb-10 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]">
          {[
            { key: 'nlp', label: 'Bangla Voice NLP', icon: Waves },
            { key: 'graph', label: 'Mule Ring-12', icon: Network },
            { key: 'goldenHour', label: 'Golden-Hour Recovery', icon: Clock },
            { key: 'ussd', label: 'USSD *268# Guard', icon: Smartphone },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-[12px] sm:text-[13px] font-ui font-medium transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#FF5C00] to-[#FF7324] text-white shadow-[0_0_24px_rgba(255,92,0,0.4),inset_0_1px_0_rgba(255,255,255,0.25)] font-semibold' 
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#FF5C00]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Bangla Voice NLP Simulator */}
        {activeTab === 'nlp' && (
          <div className="relative rounded-3xl bg-[#0c0d10]/95 border border-white/[0.08] backdrop-blur-2xl w-full shadow-[0_16px_48px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden p-6 sm:p-10">
            {/* Top ambient glow halo */}
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#FF5C00]/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-white/[0.08]">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[11px] font-num uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                  Live Voice Interception Engine
                </div>
                <h3 className="text-2xl sm:text-3xl font-display font-light tracking-[-0.02em] text-white mt-3">
                  Multi-Turn Bangla Speech Scam Classifier
                </h3>
                <p className="text-sm font-ui text-slate-400 mt-1">
                  Processes real-time audio streams via Whisper-FinTech & custom Bengali acoustic tokenizers.
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
                className={`px-5 py-3 rounded-xl font-ui font-semibold text-[13px] flex items-center gap-2.5 transition-all cursor-pointer shadow-lg shrink-0 ${
                  isPlayingVoice 
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30 animate-pulse' 
                    : 'bg-[#FF5C00] hover:bg-[#FF7324] text-white shadow-[0_0_20px_rgba(255,92,0,0.35)] hover:scale-[1.02]'
                }`}
              >
                {isPlayingVoice ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                <span>{isPlayingVoice ? 'Pause Audio Feed' : 'Simulate Scam Audio Call'}</span>
              </button>
            </div>

            {/* Audio Waveform Animation Grid */}
            <div className="relative z-10 p-6 rounded-2xl bg-[#07080b]/90 border border-white/[0.06] mb-6 shadow-inner">
              <div className="flex items-center justify-between text-xs font-num text-slate-400 mb-5">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${isPlayingVoice ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
                  <span className="text-slate-300 font-medium">Channel: GP-VoLTE-Stream-Dhaka-01788</span>
                </div>
                <span className="text-[#FF5C00] font-bold font-num bg-[#FF5C00]/10 px-2.5 py-1 rounded-md border border-[#FF5C00]/20">
                  {voiceProgress}% Processed
                </span>
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
                          ? 'bg-gradient-to-t from-rose-600 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]' 
                          : isPlayingVoice 
                            ? 'bg-gradient-to-t from-[#FF5C00] to-amber-400 shadow-[0_0_6px_rgba(255,92,0,0.3)]' 
                            : 'bg-white/[0.08]'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Real-time Transcription Stream */}
              <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-sm sm:text-base leading-relaxed text-slate-200">
                <div className="text-[11px] font-num text-[#FF5C00] font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Real-Time Acoustic Parser [BN-BD]</span>
                </div>
                <div className="text-slate-300 font-normal">
                  "হ্যালো স্যার, আমি উপায় প্রধান কার্যালয় থেকে বলছি। আপনার অ্যাকাউন্টে{' '}
                  <span className={`px-2 py-0.5 rounded transition-all ${voiceProgress > 25 ? 'bg-rose-500/25 text-rose-300 font-semibold border border-rose-500/30' : 'text-slate-400'}`}>
                    ৫০,০০০ টাকার লটারি বোনাস
                  </span>{' '}
                  জমা হয়েছে। টাকাটি ছাড় করাতে আপনার মোবাইলে পাঠানো{' '}
                  <span className={`px-2 py-0.5 rounded transition-all ${voiceProgress > 60 ? 'bg-rose-500/35 text-rose-200 font-semibold border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'text-slate-400'}`}>
                    ৪ ডিজিটের গোপনীয় পিন বা ওটিপি নম্বরটি
                  </span>{' '}
                  দ্রুত বলুন..."
                </div>
              </div>
            </div>

            {/* AI Decision Pill Ribbon */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl">
                <div className="text-[11px] font-ui font-semibold uppercase tracking-wider text-slate-400">Social Engineering Trigger</div>
                <div className="text-lg sm:text-xl font-display font-light text-rose-400 mt-2 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${voiceProgress > 25 ? 'bg-rose-400 animate-ping' : 'bg-slate-600'}`} />
                  {voiceProgress > 25 ? '99.4% (Confirmed)' : 'Awaiting Stream'}
                </div>
              </div>
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl">
                <div className="text-[11px] font-ui font-semibold uppercase tracking-wider text-slate-400">Phishing Attack Vector</div>
                <div className="text-lg sm:text-xl font-display font-light text-[#FF5C00] mt-2 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${voiceProgress > 60 ? 'bg-[#FF5C00] animate-ping' : 'bg-slate-600'}`} />
                  {voiceProgress > 60 ? 'PIN Extraction Detected' : 'Analyzing Intent'}
                </div>
              </div>
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl">
                <div className="text-[11px] font-ui font-semibold uppercase tracking-wider text-slate-400">Automated Defense Action</div>
                <div className="text-lg sm:text-xl font-display font-light text-emerald-400 mt-2 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${voiceProgress > 60 ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                  {voiceProgress > 60 ? 'Escrow Freeze Command Dispatched' : 'Active Monitoring'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Mule Ring-12 Graph Visualizer */}
        {activeTab === 'graph' && (
          <div className="relative rounded-3xl bg-[#0c0d10]/95 border border-white/[0.08] backdrop-blur-2xl w-full shadow-[0_16px_48px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden p-6 sm:p-10">
            {/* Top ambient glow halo */}
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#FF5C00]/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8 pb-6 border-b border-white/[0.08]">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[11px] font-num uppercase tracking-wider bg-[#FF5C00]/10 text-[#FF5C00] border border-[#FF5C00]/25">
                  <Network className="w-3.5 h-3.5" />
                  Graph Neural Network
                </div>
                <h3 className="text-2xl sm:text-3xl font-display font-light tracking-[-0.02em] text-white mt-3">
                  Syndicate Ring-12 Topology Explorer
                </h3>
                <p className="text-sm font-ui text-slate-400 mt-1">
                  Multi-hop transactional clustering across 14 connected dormant accounts in Rajshahi.
                </p>
              </div>

              <button
                onClick={() => setMuleRingFrozen(!muleRingFrozen)}
                className={`px-5 py-3 rounded-xl font-ui font-semibold text-[13px] flex items-center gap-2.5 transition-all cursor-pointer shadow-lg shrink-0 ${
                  muleRingFrozen
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-emerald-500/25'
                    : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{muleRingFrozen ? 'Mule Ring Frozen (14 Nodes Locked)' : 'Trigger Immediate Multi-Node Freeze'}</span>
              </button>
            </div>

            {/* Interactive Graph Canvas Simulation */}
            <div className="relative h-[360px] rounded-2xl bg-[#07080b]/90 border border-white/[0.06] overflow-hidden flex items-center justify-center p-6 shadow-inner">
              {/* Radial Center Ring Pulses */}
              <div className="absolute w-[260px] h-[260px] rounded-full border border-[#FF5C00]/20 animate-ping pointer-events-none" />
              <div className="absolute w-[400px] h-[400px] rounded-full border border-dashed border-white/[0.08] pointer-events-none" />

              {/* Center Syndicate Node */}
              <div className="relative z-10 text-center">
                <div className={`w-20 h-20 rounded-2xl mx-auto flex flex-col items-center justify-center border transition-all duration-300 ${
                  muleRingFrozen 
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.3)] scale-105' 
                    : 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-pulse'
                }`}>
                  <Network className="w-6 h-6 mb-1" />
                  <span className="font-display font-bold text-xs tracking-wider">
                    {muleRingFrozen ? 'LOCKED' : 'RING-12'}
                  </span>
                </div>
                <span className="text-[12px] font-ui text-slate-300 block mt-2 font-semibold">Syndicate Master</span>
                <span className="text-[11px] font-num text-[#FF5C00]">৳380,000 Aggregated</span>
              </div>

              {/* Orbiting Satellite Mule Nodes */}
              {[
                { label: 'Mule #01', pos: 'top-6 left-6 sm:left-12', bdt: '৳45k', role: 'Dormant Student' },
                { label: 'Mule #02', pos: 'top-6 right-6 sm:right-12', bdt: '৳60k', role: 'Fake NID Entity' },
                { label: 'Agent Out', pos: 'bottom-6 left-6 sm:left-16', bdt: '৳120k', role: 'Cash-out Agent' },
                { label: 'Mule #03', pos: 'bottom-6 right-6 sm:right-16', bdt: '৳35k', role: 'SIM Swap Acct' },
              ].map((node, idx) => (
                <div 
                  key={idx} 
                  className={`absolute ${node.pos} p-3.5 rounded-xl border backdrop-blur-xl transition-all duration-300 ${
                    muleRingFrozen
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.2)]'
                      : 'bg-white/[0.04] border-white/[0.1] text-slate-200 hover:border-[#FF5C00]/40'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-ui font-semibold">
                    <span className={`w-2 h-2 rounded-full ${muleRingFrozen ? 'bg-emerald-400' : 'bg-[#FF5C00] animate-ping'}`} />
                    <span>{node.label}</span>
                  </div>
                  <div className="text-[10px] font-ui text-slate-400 mt-0.5">{node.role}</div>
                  <div className="text-xs font-num font-bold text-[#FF5C00] mt-1">{node.bdt}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 text-xs font-num text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">FastTree Graph Risk Score:</span>
                <strong className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">0.968 (Critical)</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Central Bank STR/SAR Auto-Docket:</span>
                <strong className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Ready & Sealed</strong>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Golden-Hour Recovery Timeline Scrubber */}
        {activeTab === 'goldenHour' && (
          <div className="relative rounded-3xl bg-[#0c0d10]/95 border border-white/[0.08] backdrop-blur-2xl w-full shadow-[0_16px_48px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden p-6 sm:p-10">
            {/* Top ambient glow halo */}
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#FF5C00]/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8 pb-6 border-b border-white/[0.08]">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[11px] font-num uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  <Clock className="w-3.5 h-3.5" />
                  Sub-15m Recovery Protocol
                </div>
                <h3 className="text-2xl sm:text-3xl font-display font-light tracking-[-0.02em] text-white mt-3">
                  Automated Golden-Hour SLA Timeline
                </h3>
                <p className="text-sm font-ui text-slate-400 mt-1">
                  Drag the scrubber to inspect automated escalation checkpoints from scam execution to full recovery.
                </p>
              </div>

              <button
                onClick={() => {
                  setGoldenHourMinute(0);
                  setIsScrubbingGoldenHour(true);
                }}
                className="px-5 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] font-ui font-semibold text-[13px] flex items-center gap-2.5 text-white transition-all cursor-pointer shadow-lg shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#FF5C00] ${isScrubbingGoldenHour ? 'animate-spin' : ''}`} />
                <span>Auto-Replay 15-Min Run</span>
              </button>
            </div>

            {/* Interactive Timeline Scrubbing Bar */}
            <div className="relative z-10 p-6 rounded-2xl bg-[#07080b]/90 border border-white/[0.06] mb-8 shadow-inner">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-num text-slate-400">Timeline Elapsed:</span>
                <span className="text-2xl sm:text-3xl font-display font-light text-[#FF5C00]">
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
                className="w-full accent-[#FF5C00] cursor-pointer h-2.5 bg-white/[0.08] rounded-lg"
              />

              <div className="flex justify-between text-[11px] font-num text-slate-400 mt-3">
                <span>T+0m (Initiated)</span>
                <span>T+5m (FastTree Flag)</span>
                <span>T+10m (Escrow Hold)</span>
                <span className="text-emerald-400 font-bold">T+15m (100% Secured)</span>
              </div>
            </div>

            {/* Checkpoint Status Cards */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { min: 2, title: 'T+2m: Victim Report', desc: 'Complaint logged via IVR / App / USSD hotline' },
                { min: 5, title: 'T+5m: Graph AI Hop Trace', desc: 'Identified 3 outbound splitting hops' },
                { min: 10, title: 'T+10m: Multi-MFS Hold', desc: 'Escrow lock sent to partner wallets' },
                { min: 14, title: 'T+14m: 100% Funds Secured', desc: '৳85,000 preserved before ATM cash-out' },
              ].map((phase, idx) => {
                const isPassed = goldenHourMinute >= phase.min;
                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-2xl border transition-all duration-300 ${
                      isPassed 
                        ? 'bg-[#FF5C00]/10 border-[#FF5C00]/30 text-white shadow-[0_0_20px_rgba(255,92,0,0.15)]' 
                        : 'bg-white/[0.02] border-white/[0.06] text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-num uppercase font-semibold text-slate-400">Phase 0{idx+1}</span>
                      <CheckCircle2 className={`w-4 h-4 ${isPassed ? 'text-[#FF5C00]' : 'text-slate-700'}`} />
                    </div>
                    <div className="text-[14px] font-ui font-semibold text-white">{phase.title}</div>
                    <div className="text-[12px] font-ui text-slate-400 mt-1 leading-relaxed">{phase.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: USSD *268# Guard */}
        {activeTab === 'ussd' && (
          <div className="relative rounded-3xl bg-[#0c0d10]/95 border border-white/[0.08] backdrop-blur-2xl w-full shadow-[0_16px_48px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden p-6 sm:p-10">
            {/* Top ambient glow halo */}
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#FF5C00]/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8 pb-6 border-b border-white/[0.08]">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[11px] font-num uppercase tracking-wider bg-[#FF5C00]/10 text-[#FF5C00] border border-[#FF5C00]/25">
                  <Smartphone className="w-3.5 h-3.5" />
                  Feature-Phone Perimeter
                </div>
                <h3 className="text-2xl sm:text-3xl font-display font-light tracking-[-0.02em] text-white mt-3">
                  USSD Session & Cell Tower Tamper Guard (*268#)
                </h3>
                <p className="text-sm font-ui text-slate-400 mt-1">
                  Protects 60%+ of offline rural transactions from SIM swaps, cell tower IMSI catchers, and rapid PIN brute force.
                </p>
              </div>

              <div className="flex gap-2 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <button
                  onClick={() => setUssdSimState('normal')}
                  className={`px-4 py-2 rounded-lg text-xs font-ui font-medium cursor-pointer transition-all ${
                    ussdSimState === 'normal' 
                      ? 'bg-white/[0.1] text-white font-semibold' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Normal Session
                </button>
                <button
                  onClick={() => setUssdSimState('intercepted')}
                  className={`px-4 py-2 rounded-lg text-xs font-ui font-semibold cursor-pointer transition-all ${
                    ussdSimState === 'intercepted' 
                      ? 'bg-[#FF5C00] text-white shadow-[0_0_14px_rgba(255,92,0,0.35)]' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SIM-Swap Attack
                </button>
              </div>
            </div>

            {/* USSD Mobile Feature Phone Mock */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="p-6 rounded-2xl bg-[#07080b]/95 border border-white/[0.08] font-num text-center shadow-inner">
                <div className="text-[11px] text-slate-400 uppercase tracking-widest mb-3">TELCO USSD GATEWAY (*268#)</div>
                <div className="p-5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-left space-y-2">
                  <div className="text-xs font-bold border-b border-emerald-500/20 pb-1.5 flex items-center justify-between">
                    <span>upay Main Menu</span>
                    <span className="text-[10px] text-emerald-500">SESSION ID: #9941</span>
                  </div>
                  <div className="text-xs">1. Send Money</div>
                  <div className="text-xs">2. Cash Out</div>
                  <div className="text-xs">3. Mobile Recharge</div>
                  <div className="text-xs">4. Pay Bill</div>
                  <div className="text-xs">5. My Account</div>
                  {ussdSimState === 'intercepted' && (
                    <div className="mt-3 p-3 rounded-lg bg-rose-500/20 text-rose-300 text-[11px] border border-rose-500/40 font-semibold shadow-[0_0_12px_rgba(244,63,94,0.2)]">
                      [ALERT] IMSI change detected 14 mins ago. Additional OTP challenge dispatched to fallback agent.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl">
                  <div className="text-[11px] font-ui font-semibold uppercase tracking-wider text-slate-400">IMSI / IMEI Telemetry Binding</div>
                  <div className="text-sm sm:text-base font-ui font-medium text-white mt-2">
                    {ussdSimState === 'intercepted' ? '⚠️ Mismatch: IMSI changed without KYC window' : '✓ Clean: Handshake Verified'}
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl">
                  <div className="text-[11px] font-ui font-semibold uppercase tracking-wider text-slate-400">FastTree Latency on Telco Gateway</div>
                  <div className="text-sm sm:text-base font-ui font-medium text-[#FF5C00] mt-2">
                    28ms (Zero impact on USSD session timeout)
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl">
                  <div className="text-[11px] font-ui font-semibold uppercase tracking-wider text-slate-400">Zero-Balance USSD Hotkey (*268*99#)</div>
                  <div className="text-sm sm:text-base font-ui font-medium text-emerald-400 mt-2">
                    Allows any citizen to freeze wallet instantly without airtime
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* PROBLEM STATS SECTION (Full Width matching Reference)     */}
      {/* ======================================================== */}
      <section className="relative z-10 py-24 px-5 sm:px-8 max-w-[1400px] mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[11px] font-ui font-medium uppercase tracking-widest mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            The Problem
          </div>
          <h2 className="font-display font-light text-[36px] sm:text-[50px] tracking-[-0.04em] text-white mb-4 leading-[1.1]">
            Legacy Fraud Operations<br />Are Broken
          </h2>
          <p className="font-ui font-normal text-[15px] text-slate-400 leading-[1.75]">
            Manual customer queues and 72-hour inter-bank bureaucracy cost MFS users millions while scammers cash out in under 15 minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Clock, stat: '72+ Hours', label: 'Legacy Dispute TAT', desc: 'Average time to freeze mule accounts manually through traditional inter-bank request chains', color: 'text-rose-400', glow: 'from-rose-500/10' },
            { icon: DollarSign, stat: '৳50K–500K', label: 'Typical Loss Per Campaign', desc: 'Average capital permanently lost before manual syndicate detection across district operations', color: 'text-[#FF5C00]', glow: 'from-[#FF5C00]/10' },
            { icon: Users, stat: '15+ Analysts', label: 'Manual Review Bottleneck', desc: 'Staff required to review 100k daily transactions, creating unsustainable scaling costs', color: 'text-amber-400', glow: 'from-amber-500/10' },
          ].map(({ icon: Icon, stat, label, desc, color, glow }) => (
            <div key={stat} className="group relative p-8 sm:p-9 rounded-2xl bg-[#0c0d10]/95 border border-white/[0.08] hover:border-white/[0.18] transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/5 overflow-hidden flex flex-col justify-between">
              <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />
              <div>
                <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className={`text-[42px] sm:text-[46px] font-display font-light tracking-[-0.04em] ${color} mb-2 leading-none`}>{stat}</div>
                <div className="text-[15px] font-ui font-semibold text-white mb-2">{label}</div>
              </div>
              <div className="text-[13px] font-ui text-slate-400 leading-relaxed mt-2">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* MARKET OPPORTUNITY & SCALE (Exact Reference Image 2 Style) */}
      {/* ======================================================== */}
      <section className="relative z-10 py-24 px-5 sm:px-8 max-w-[1400px] mx-auto border-t border-white/[0.05]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          
          {/* Left: 3 Alternating Medallion Stat Cards (Glassmorphic + Gradient Glow) */}
          <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
            
            {/* Box 1: Text Left + Medallion Right */}
            <div className="relative p-7 sm:p-8 rounded-2xl bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-white/[0.01] border border-white/[0.12] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.15)] hover:border-[#FF5C00]/60 hover:shadow-[0_8px_32px_0_rgba(255,92,0,0.22),inset_0_1px_0_0_rgba(255,255,255,0.25)] transition-all duration-300 flex items-center justify-between gap-6 group overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#FF5C00]/[0.08] via-transparent to-[#FF5C00]/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="relative z-10 flex-1">
                <div className="text-[34px] sm:text-[38px] font-display font-light tracking-[-0.035em] text-white">40,000+</div>
                <div className="text-[13px] font-ui text-slate-300 mt-1 font-normal">Active agent outlets monitored per year</div>
              </div>
              <div className="relative z-10 shrink-0">
                <div className="absolute inset-[-4px] rounded-full bg-gradient-to-tr from-[#FF5C00]/40 to-transparent blur-sm -z-10 group-hover:scale-110 transition-transform" />
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2e1507] via-[#160b03] to-[#080402] border-2 border-[#FF5C00]/60 shadow-[0_0_28px_rgba(255,92,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.2)] flex items-center justify-center group-hover:scale-105 group-hover:border-[#FF8C33] group-hover:shadow-[0_0_36px_rgba(255,92,0,0.7)] transition-all duration-300">
                  <ShieldCheck className="w-7 h-7 text-[#FFB23D]" />
                </div>
              </div>
            </div>

            {/* Box 2: Medallion Left + Text Right (Alternating) */}
            <div className="relative p-7 sm:p-8 rounded-2xl bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-white/[0.01] border border-white/[0.12] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.15)] hover:border-[#FF5C00]/60 hover:shadow-[0_8px_32px_0_rgba(255,92,0,0.22),inset_0_1px_0_0_rgba(255,255,255,0.25)] transition-all duration-300 flex items-center justify-between gap-6 group overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#FF5C00]/[0.08] via-transparent to-[#FF5C00]/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="relative z-10 shrink-0">
                <div className="absolute inset-[-4px] rounded-full bg-gradient-to-tr from-[#FF5C00]/40 to-transparent blur-sm -z-10 group-hover:scale-110 transition-transform" />
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2e1507] via-[#160b03] to-[#080402] border-2 border-[#FF5C00]/60 shadow-[0_0_28px_rgba(255,92,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.2)] flex items-center justify-center group-hover:scale-105 group-hover:border-[#FF8C33] group-hover:shadow-[0_0_36px_rgba(255,92,0,0.7)] transition-all duration-300">
                  <BarChart3 className="w-7 h-7 text-[#FFB23D]" />
                </div>
              </div>
              <div className="relative z-10 flex-1 text-left sm:text-right">
                <div className="text-[34px] sm:text-[38px] font-display font-light tracking-[-0.035em] text-white">৳120B+</div>
                <div className="text-[13px] font-ui text-slate-300 mt-1 font-normal">Monthly transaction telemetry analyzed</div>
              </div>
            </div>

            {/* Box 3: Text Left + Medallion Right */}
            <div className="relative p-7 sm:p-8 rounded-2xl bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-white/[0.01] border border-white/[0.12] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.15)] hover:border-[#FF5C00]/60 hover:shadow-[0_8px_32px_0_rgba(255,92,0,0.22),inset_0_1px_0_0_rgba(255,255,255,0.25)] transition-all duration-300 flex items-center justify-between gap-6 group overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#FF5C00]/[0.08] via-transparent to-[#FF5C00]/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="relative z-10 flex-1">
                <div className="text-[34px] sm:text-[38px] font-display font-light tracking-[-0.035em] text-white">99.4%</div>
                <div className="text-[13px] font-ui text-slate-300 mt-1 font-normal">Autonomous interception precision rate</div>
              </div>
              <div className="relative z-10 shrink-0">
                <div className="absolute inset-[-4px] rounded-full bg-gradient-to-tr from-[#FF5C00]/40 to-transparent blur-sm -z-10 group-hover:scale-110 transition-transform" />
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2e1507] via-[#160b03] to-[#080402] border-2 border-[#FF5C00]/60 shadow-[0_0_28px_rgba(255,92,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.2)] flex items-center justify-center group-hover:scale-105 group-hover:border-[#FF8C33] group-hover:shadow-[0_0_36px_rgba(255,92,0,0.7)] transition-all duration-300">
                  <Zap className="w-7 h-7 text-[#FFB23D]" />
                </div>
              </div>
            </div>

          </div>

          {/* Right: Pitch & CTA (Height Matched with Left Cards) */}
          <div className="lg:col-span-6 lg:pl-6 flex flex-col justify-between py-1">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#FF5C00]/10 border border-[#FF5C00]/25 text-[#FF5C00] text-[11px] font-ui font-medium uppercase tracking-widest mb-4">
                <Activity className="w-3 h-3" />
                <span>Institutional Scale</span>
              </div>
              <h2 className="font-display font-light text-[36px] sm:text-[46px] lg:text-[50px] tracking-[-0.035em] text-white mb-5 leading-[1.1]">
                The Mobile Finance Defense<br />Landscape is Evolving
              </h2>
              <p className="font-ui font-normal text-[15px] sm:text-[16px] text-slate-400 leading-[1.8] mb-6">
                AI-native syndicates now launch synchronized multi-hop mule splits in seconds. Legacy fraud scoring cannot cope with the sheer volume and velocity. Astha delivers continuous autonomous protection at enterprise scale.
              </p>

              {/* Added Key Enterprise Trust Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-8 pt-2">
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md">
                  <div className="text-[11px] text-slate-400 font-ui">Escrow Lock Latency</div>
                  <div className="text-[18px] font-display font-light text-white mt-0.5">&lt; 15 Minutes</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md">
                  <div className="text-[11px] text-slate-400 font-ui">Central Bank Compliance</div>
                  <div className="text-[18px] font-display font-light text-[#FF5C00] mt-0.5">Automated STR/SAR</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="/dashboard"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-[#FF5C00] hover:bg-[#FF7324] text-white font-ui font-semibold text-[14px] shadow-[0_0_28px_rgba(255,92,0,0.35)] hover:shadow-[0_0_40px_rgba(255,92,0,0.5)] transition-all hover:scale-[1.02]">
                <span>Launch Enterprise Console</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/analyst"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white font-ui font-medium text-[14px] transition-all">
                <span>View Live Threat Telemetry</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* FEATURES BENTO GRID (Elevated Dark Boxes) */}
      {/* ======================================================== */}
      <section id="features" className="relative z-10 py-24 px-5 sm:px-8 max-w-[1400px] mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-slate-400 text-[11px] font-ui font-medium uppercase tracking-widest mb-5">
            <Sparkles className="w-3 h-3 text-[#FF5C00]" />
            Platform Features
          </div>
          <h2 className="font-display font-light text-[36px] sm:text-[48px] tracking-[-0.035em] text-white mb-4 leading-[1.1]">
            Everything you need to defend<br />modern mobile finance
          </h2>
          <p className="font-ui font-normal text-[15px] text-slate-400 leading-[1.75]">
            A unified intelligence layer built on FastTree ML — covering voice, graph, escrow, and USSD perimeters.
          </p>
        </div>

        {/* 6 Bento Grid Cards with Enhanced Glassmorphism Aesthetics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Bento Card 1: Smart Asset Tracking */}
          <div className="relative p-7 sm:p-8 rounded-2xl bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-white/[0.01] border border-white/[0.12] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.15)] hover:border-[#FF5C00]/60 hover:shadow-[0_8px_32px_0_rgba(255,92,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.25)] transition-all duration-300 flex flex-col justify-between overflow-hidden group">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#FF5C00]/10 via-[#FF5C00]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-ui uppercase tracking-wider text-slate-400 font-medium">Live Asset Monitor</span>
                <span className="flex items-center gap-1.5 text-[10px] font-num text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] backdrop-blur-xl mb-5 shadow-inner">
                <div className="flex items-center justify-between text-[11px] font-num text-slate-400 mb-1">
                  <span>FastTree AI Stream</span>
                  <span className="text-[#FF5C00] font-semibold">99.4% precision</span>
                </div>
                <div className="text-[26px] font-display font-light tracking-tight text-white mb-3">0.073658 ML</div>
                <Link 
                  href="/analyst"
                  className="w-full py-2.5 rounded-lg bg-[#FF5C00] hover:bg-[#FF7324] text-white font-ui font-semibold text-[12px] shadow-[0_0_16px_rgba(255,92,0,0.35)] block text-center transition-all hover:scale-[1.01]"
                >
                  Analyze Triage Stream →
                </Link>
              </div>
            </div>
            <div>
              <h4 className="text-[16px] font-ui font-semibold text-white mb-1.5 group-hover:text-orange-100 transition-colors">Smart Telemetry &amp; Stream Classifier</h4>
              <p className="text-[13px] font-ui text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                Empower your security operations with autonomous real-time transaction scoring and triage escalation.
              </p>
            </div>
          </div>

          {/* Bento Card 2: Unified Wallet Dashboard */}
          <div className="relative p-7 sm:p-8 rounded-2xl bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-white/[0.01] border border-white/[0.12] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.15)] hover:border-[#FF5C00]/60 hover:shadow-[0_8px_32px_0_rgba(255,92,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.25)] transition-all duration-300 flex flex-col justify-between overflow-hidden group">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#FF5C00]/10 via-[#FF5C00]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-ui uppercase tracking-wider text-slate-400 font-medium">Omnichannel Perimeter</span>
                <span className="text-[10px] font-num text-[#FF5C00] font-bold bg-[#FF5C00]/10 px-2 py-0.5 rounded-full border border-[#FF5C00]/20">3 Nodes</span>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] backdrop-blur-xl mb-5 grid grid-cols-2 gap-3 shadow-inner">
                <div className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                  <div className="text-[10px] text-slate-400 font-ui">MFS Smartphone App</div>
                  <div className="text-[14px] font-bold text-white font-num mt-1">৳24,678.00</div>
                  <div className="text-[9px] text-emerald-400 font-num mt-0.5">Whisper NLP Active</div>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                  <div className="text-[10px] text-slate-400 font-ui">Feature Phone (*268#)</div>
                  <div className="text-[14px] font-bold text-white font-num mt-1">৳22,345.00</div>
                  <div className="text-[9px] text-[#FF5C00] font-num mt-0.5">IMSI Guard On</div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-[16px] font-ui font-semibold text-white mb-1.5 group-hover:text-orange-100 transition-colors">Unified Omnichannel Defense</h4>
              <p className="text-[13px] font-ui text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                Manage smartphone apps, offline USSD feature phones, and agent float desks in a synchronized security hub.
              </p>
            </div>
          </div>

          {/* Bento Card 3: Spending & Protected Volume Velocity */}
          <div className="relative p-7 sm:p-8 rounded-2xl bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-white/[0.01] border border-white/[0.12] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.15)] hover:border-[#FF5C00]/60 hover:shadow-[0_8px_32px_0_rgba(255,92,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.25)] transition-all duration-300 flex flex-col justify-between overflow-hidden group">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#FF5C00]/10 via-[#FF5C00]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-ui uppercase tracking-wider text-slate-400 font-medium">Protected Velocity</span>
                <span className="text-[12px] font-num font-bold text-white">৳112,340,00</span>
              </div>
              <div className="h-28 flex items-end justify-center gap-1.5 py-2 mb-4 bg-black/40 rounded-xl p-3 border border-white/[0.08] backdrop-blur-xl shadow-inner">
                {[30, 45, 25, 60, 95, 40, 75].map((h, i) => (
                  <div 
                    key={i} 
                    style={{ height: `${h}%` }}
                    className={`flex-1 max-w-[24px] rounded-t-sm transition-all duration-300 ${i === 4 ? 'bg-gradient-to-t from-[#FF4500] via-[#FF5C00] to-[#FFB23D] shadow-[0_0_16px_rgba(255,92,0,0.6)]' : 'bg-white/10 hover:bg-white/20'}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-[16px] font-ui font-semibold text-white mb-1.5 group-hover:text-orange-100 transition-colors">Protected Volume Velocity</h4>
              <p className="text-[13px] font-ui text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                Track protected capital and threat velocity in real-time to monitor institutional resilience.
              </p>
            </div>
          </div>

          {/* Bento Card 4: ROC-AUC Precision Analytics */}
          <div className="relative p-7 sm:p-8 rounded-2xl bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-white/[0.01] border border-white/[0.12] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.15)] hover:border-[#FF5C00]/60 hover:shadow-[0_8px_32px_0_rgba(255,92,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.25)] transition-all duration-300 flex flex-col justify-between overflow-hidden group">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#FF5C00]/10 via-[#FF5C00]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-ui uppercase tracking-wider text-slate-400 font-medium">ROC-AUC Curve</span>
                <span className="text-[11px] font-num text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">+12.4% ROC</span>
              </div>
              <div className="h-28 relative my-2 flex items-center bg-black/40 rounded-xl p-3 border border-white/[0.08] backdrop-blur-xl shadow-inner">
                <svg className="w-full h-20 overflow-visible" viewBox="0 0 100 40">
                  <defs>
                    <linearGradient id="curveGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#FF4500" />
                      <stop offset="100%" stopColor="#FFB23D" />
                    </linearGradient>
                  </defs>
                  <path 
                    d="M0,35 Q25,28 50,18 T80,10 T100,4" 
                    fill="none" 
                    stroke="url(#curveGlow)" 
                    strokeWidth="3" 
                    className="drop-shadow-[0_0_10px_rgba(255,92,0,0.7)]"
                  />
                  <circle cx="100" cy="4" r="3.5" fill="#FFF" stroke="#FF5C00" strokeWidth="2" className="animate-ping" />
                </svg>
              </div>
            </div>
            <div>
              <h4 className="text-[16px] font-ui font-semibold text-white mb-1.5 group-hover:text-orange-100 transition-colors">ROC-AUC Precision Analytics</h4>
              <p className="text-[13px] font-ui text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                Visualize model precision trends and false-positive suppression across district operations.
              </p>
            </div>
          </div>

          {/* Bento Card 5: Sub-15m Recovery SLA */}
          <div className="relative p-7 sm:p-8 rounded-2xl bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-white/[0.01] border border-white/[0.12] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.15)] hover:border-[#FF5C00]/60 hover:shadow-[0_8px_32px_0_rgba(255,92,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.25)] transition-all duration-300 flex flex-col justify-between overflow-hidden group">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#FF5C00]/10 via-[#FF5C00]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-ui uppercase tracking-wider text-slate-400 font-medium">Golden-Hour SLA</span>
                <span className="text-[11px] font-bold text-[#FF5C00] font-num bg-[#FF5C00]/10 px-2 py-0.5 rounded border border-[#FF5C00]/20">8.4m Avg</span>
              </div>
              
              <div className="relative h-28 flex items-center justify-center my-2 bg-black/40 rounded-xl p-3 border border-white/[0.08] backdrop-blur-xl shadow-inner">
                <div className="w-32 h-16 border-t-8 border-l-8 border-r-8 border-[#FF5C00] rounded-t-full relative flex items-end justify-center shadow-[0_0_24px_rgba(255,92,0,0.5)]">
                  <span className="text-[20px] font-display font-light text-white mb-1 tracking-tight">75.5%</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-[16px] font-ui font-semibold text-white mb-1.5 group-hover:text-orange-100 transition-colors">Sub-15m Asset Recovery SLA</h4>
              <p className="text-[13px] font-ui text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                Automated inter-MFS escrow holds lock illicit funds before fraudsters can cash out at agent points.
              </p>
            </div>
          </div>

          {/* Bento Card 6: Ring-12 Mule Topology */}
          <div className="relative p-7 sm:p-8 rounded-2xl bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-white/[0.01] border border-white/[0.12] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.15)] hover:border-[#FF5C00]/60 hover:shadow-[0_8px_32px_0_rgba(255,92,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.25)] transition-all duration-300 flex flex-col justify-between overflow-hidden group">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#FF5C00]/10 via-[#FF5C00]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-ui uppercase tracking-wider text-slate-400 font-medium">Syndicate Topology</span>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30">14 Nodes</span>
              </div>
              <div className="h-28 flex items-center justify-center my-2 bg-black/40 rounded-xl p-3 border border-white/[0.08] backdrop-blur-xl relative shadow-inner">
                <div className="w-20 h-20 rounded-full border border-dashed border-[#FF5C00]/30 flex items-center justify-center relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF4500] to-amber-400 flex items-center justify-center shadow-[0_0_20px_rgba(255,92,0,0.5)]">
                    <span className="text-[9px] font-bold text-slate-950 font-num">CORE</span>
                  </div>
                  <div className="absolute -top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping" />
                  <div className="absolute -bottom-1 left-1 w-2 h-2 rounded-full bg-amber-400" />
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-[16px] font-ui font-semibold text-white mb-1.5 group-hover:text-orange-100 transition-colors">Ring-12 Graph Discovery</h4>
              <p className="text-[13px] font-ui text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                Autonomous graph neural networks unmask multi-hop laundering syndicates across districts in milliseconds.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 9. THE AI ENGINE BUILT FOR MODERN MFS (Connected Circuits) */}
      {/* ======================================================== */}
      <section id="engine" className="relative z-10 py-24 px-5 sm:px-8 max-w-[1400px] mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#FF5C00]/10 border border-[#FF5C00]/25 text-[#FF5C00] text-[11px] font-ui font-medium uppercase tracking-widest mb-5">
          <Cpu className="w-3.5 h-3.5" />
          <span>Core Intelligence Architecture</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-display font-light tracking-[-0.04em] text-white mb-4 leading-[1.1]">
          The AI Engine Built for Modern MFS
        </h2>
        <p className="text-sm sm:text-base text-slate-400 font-ui max-w-2xl mx-auto mb-20 leading-relaxed">
          Trained on millions of mobile financial transactions, telco signal patterns, and multi-dialect Bangla speech transcripts.
        </p>

        {/* 3D Glowing Portal Architecture with Visible Glowing Circuit Lines */}
        <div className="relative w-full p-6 sm:p-12 rounded-3xl bg-[#08090c]/85 border border-white/[0.12] backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.1)] overflow-hidden min-h-[620px] flex flex-col justify-between">
          
          {/* Subtle background radial ambient glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_75%,rgba(255,92,0,0.18)_0%,transparent_75%)] pointer-events-none" />

          {/* Dedicated SVG Circuit Connection Layer (Desktop Gutter Route) */}
          <svg className="hidden md:block absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 1000 600" preserveAspectRatio="none">
            <defs>
              <linearGradient id="circuitBeamA" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FF8C1A" stopOpacity="0.95" />
                <stop offset="60%" stopColor="#FF5C00" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#FF3A00" stopOpacity="0.7" />
              </linearGradient>
              <filter id="circuitGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            
            {/* Path 1: Top-Left Card (460, 95) -> Channel (482) -> Portal Inner Top (442, 445) */}
            <path 
              d="M 460,95 H 482 V 360 C 482 405, 465 430, 442 445" 
              stroke="url(#circuitBeamA)" 
              strokeWidth="2.5" 
              fill="none" 
              filter="url(#circuitGlow)"
              className="gsap-circuit-path"
            />
            {/* Animated data pulses along Path 1 */}
            <path 
              d="M 460,95 H 482 V 360 C 482 405, 465 430, 442 445" 
              stroke="#FFF" 
              strokeWidth="1.5" 
              fill="none" 
              strokeDasharray="8,16"
              className="opacity-60"
            />
            
            {/* Path 2: Bottom-Left Card (460, 275) -> Channel (472) -> Portal Inner Center (454, 445) */}
            <path 
              d="M 460,275 H 472 V 375 C 472 410, 462 430, 454 445" 
              stroke="url(#circuitBeamA)" 
              strokeWidth="2" 
              fill="none" 
              strokeDasharray="4,4"
              className="gsap-circuit-path"
            />
            
            {/* Path 3: Top-Right Card (540, 95) -> Channel (518) -> Portal Inner Top (558, 445) */}
            <path 
              d="M 540,95 H 518 V 360 C 518 405, 535 430, 558 445" 
              stroke="url(#circuitBeamA)" 
              strokeWidth="2.5" 
              fill="none" 
              filter="url(#circuitGlow)"
              className="gsap-circuit-path"
            />
            {/* Animated data pulses along Path 3 */}
            <path 
              d="M 540,95 H 518 V 360 C 518 405, 535 430, 558 445" 
              stroke="#FFF" 
              strokeWidth="1.5" 
              fill="none" 
              strokeDasharray="8,16"
              className="opacity-60"
            />
            
            {/* Path 4: Bottom-Right Card (540, 275) -> Channel (528) -> Portal Inner Center (546, 445) */}
            <path 
              d="M 540,275 H 528 V 375 C 528 410, 538 430, 546 445" 
              stroke="url(#circuitBeamA)" 
              strokeWidth="2" 
              fill="none" 
              strokeDasharray="4,4"
              className="gsap-circuit-path"
            />

            {/* Glowing terminal impact nodes positioned right inside the portal aperture */}
            <circle cx="442" cy="445" r="4.5" fill="#FFE0A0" className="animate-ping" />
            <circle cx="558" cy="445" r="4.5" fill="#FFE0A0" className="animate-ping" />
          </svg>

          {/* Floating Architecture Node Cards with Premium Glassmorphism */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-14 sm:gap-x-20 gap-y-7 relative z-10 mb-8">
            
            {/* Node 1: Top-Left (Glassmorphic) */}
            <div className="gsap-engine-card relative p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.01] border border-white/[0.12] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:border-[#FF5C00]/60 hover:shadow-[0_8px_32px_0_rgba(255,92,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.2)] transition-all duration-300 text-left group">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              <span className="text-[10px] font-ui uppercase font-semibold tracking-wider text-[#FF5C00] block mb-1">
                Structural Design
              </span>
              <strong className="text-[17px] font-display font-light text-white block mb-1">
                Bangla Voice NLP (Whisper Core)
              </strong>
              <p className="text-[12px] font-ui text-slate-400 leading-relaxed">
                Trained on 14+ district Bengali dialects, detecting high-urgency lottery and PIN extraction keywords in real-time.
              </p>
              {/* Circuit connector anchor dot on right edge */}
              <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0c0d12] border-2 border-[#FF5C00] shadow-[0_0_16px_#FF5C00] items-center justify-center z-20">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFA040] animate-pulse" />
              </div>
            </div>

            {/* Node 2: Top-Right (Glassmorphic) */}
            <div className="gsap-engine-card relative p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.01] border border-white/[0.12] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:border-[#FF5C00]/60 hover:shadow-[0_8px_32px_0_rgba(255,92,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.2)] transition-all duration-300 text-left group">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              <span className="text-[10px] font-ui uppercase font-semibold tracking-wider text-[#FF5C00] block mb-1">
                Ecosystem Connectivity
              </span>
              <strong className="text-[17px] font-display font-light text-white block mb-1">
                Cross-Chain Escrow Bridges
              </strong>
              <p className="text-[12px] font-ui text-slate-400 leading-relaxed">
                Cross-wallet automated asset freeze protocol preserving illicit cashouts across partner MFS networks in under 15 minutes.
              </p>
              {/* Circuit connector anchor dot on left edge */}
              <div className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0c0d12] border-2 border-[#FF5C00] shadow-[0_0_16px_#FF5C00] items-center justify-center z-20">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFA040] animate-pulse" />
              </div>
            </div>

            {/* Node 3: Bottom-Left (Glassmorphic) */}
            <div className="gsap-engine-card relative p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.01] border border-white/[0.12] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:border-[#FF5C00]/60 hover:shadow-[0_8px_32px_0_rgba(255,92,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.2)] transition-all duration-300 text-left group">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              <span className="text-[10px] font-ui uppercase font-semibold tracking-wider text-[#FF5C00] block mb-1">
                Code Logic
              </span>
              <strong className="text-[17px] font-display font-light text-white block mb-1">
                FastTree Syndicate GNN
              </strong>
              <p className="text-[12px] font-ui text-slate-400 leading-relaxed">
                Graph neural networks unmasking multi-hop dormant mule rings, transaction splitting hubs, and cashout agent rings.
              </p>
              {/* Circuit connector anchor dot on right edge */}
              <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0c0d12] border-2 border-[#FF5C00] shadow-[0_0_16px_#FF5C00] items-center justify-center z-20">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFA040] animate-pulse" />
              </div>
            </div>

            {/* Node 4: Bottom-Right (Glassmorphic) */}
            <div className="gsap-engine-card relative p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.01] border border-white/[0.12] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:border-[#FF5C00]/60 hover:shadow-[0_8px_32px_0_rgba(255,92,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.2)] transition-all duration-300 text-left group">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              <span className="text-[10px] font-ui uppercase font-semibold tracking-wider text-[#FF5C00] block mb-1">
                Economic Design
              </span>
              <strong className="text-[17px] font-display font-light text-white block mb-1">
                USSD *268# Tamper Guard
              </strong>
              <p className="text-[12px] font-ui text-slate-400 leading-relaxed">
                Cell tower IMSI/IMEI binding and 28ms low-latency protection for rural feature phone transactions.
              </p>
              {/* Circuit connector anchor dot on left edge */}
              <div className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0c0d12] border-2 border-[#FF5C00] shadow-[0_0_16px_#FF5C00] items-center justify-center z-20">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFA040] animate-pulse" />
              </div>
            </div>
          </div>

          {/* Glowing 3D Isometric Halo Portal — UPAY CORE ENGINE text placed UNDER the rings */}
          <div className="gsap-engine-portal relative pt-6 pb-2 flex flex-col items-center justify-center z-10">
            {/* 1. Isometric Rings Stack (Clear & Fully Visible) */}
            <div className="relative w-72 sm:w-[460px] h-28 flex items-center justify-center">
              {/* Bottom wider glowing shadow ring */}
              <div 
                className="absolute inset-x-0 bottom-0 h-28 rounded-[100%] border border-[#FF5C00]/30 shadow-[0_0_70px_rgba(255,92,0,0.6)]"
                style={{ transform: 'rotateX(60deg)' }}
              />
              {/* Middle intense neon orange ring */}
              <div 
                className="absolute inset-x-4 bottom-2 h-24 rounded-[100%] border-2 border-[#FF5C00] shadow-[0_0_50px_rgba(255,92,0,0.85)] bg-gradient-to-t from-[#FF5C00]/30 to-transparent"
                style={{ transform: 'rotateX(60deg)' }}
              />
              {/* Inner hot white/amber core ring */}
              <div 
                className="absolute inset-x-12 bottom-4 h-16 rounded-[100%] border border-[#FFE0A0] shadow-[0_0_25px_#FFF] bg-[#FF5C00]/50"
                style={{ transform: 'rotateX(60deg)' }}
              />
              {/* Vertical ascending light column from portal core */}
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-40 bg-gradient-to-t from-[#FF5C00]/40 via-[#FF5C00]/15 to-transparent blur-xl pointer-events-none" />
            </div>

            {/* 2. Upay Core Engine Badge Placed UNDER the Rounded Rings */}
            <div className="mt-4 z-10 px-7 py-2.5 rounded-full bg-gradient-to-r from-black/95 via-[#180a02] to-black/95 border border-[#FF5C00]/70 shadow-[0_0_30px_rgba(255,92,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.15)] backdrop-blur-2xl hover:scale-105 transition-transform cursor-default">
              <span className="text-[13px] font-display font-bold text-white tracking-widest uppercase flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5C00] animate-ping" />
                upay Core Engine
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 10. INTERACTIVE ROI & RISK IMPACT CALCULATOR (Glassmorphic) */}
      {/* ======================================================== */}
      <section id="roi-calculator" className="relative z-10 py-24 px-5 sm:px-8 max-w-[1400px] mx-auto">
        <div className="relative p-8 sm:p-14 rounded-3xl bg-gradient-to-br from-[#12141c]/80 via-[#0c0d12]/90 to-[#08090c]/95 border border-white/[0.12] backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.1)] overflow-hidden">
          
          {/* Subtle warm glassmorphism ambient background glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(255,92,0,0.12)_0%,transparent_70%)] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(255,140,40,0.06)_0%,transparent_70%)] pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
            
            {/* Left Controls */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#FF5C00]/10 border border-[#FF5C00]/25 text-[#FF5C00] text-[11px] font-ui font-medium uppercase tracking-widest mb-4">
                  <Activity className="w-3 h-3" />
                  <span>Institutional Economics</span>
                </div>
                <h3 className="text-3xl sm:text-[42px] font-display font-light tracking-[-0.035em] text-white leading-[1.15]">
                  Calculate Your Protected Capital
                </h3>
                <p className="text-[14px] text-slate-400 mt-3 leading-relaxed font-ui">
                  Adjust your MFS daily transaction volume and typical fraud attack velocity to estimate quarterly savings with Astha.
                </p>
              </div>

              {/* Slider 1: Monthly Volume (Glass Card) */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl hover:border-white/[0.16] transition-all space-y-3">
                <div className="flex items-center justify-between text-[13px] font-ui">
                  <span className="text-slate-300 font-medium">Monthly Transaction Volume:</span>
                  <span className="px-3 py-1 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white font-num font-bold text-[12px] shadow-inner">
                    {monthlyVolume} Crore BDT (৳{monthlyVolume * 10}M)
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="50"
                  value={monthlyVolume}
                  onChange={(e) => setMonthlyVolume(Number(e.target.value))}
                  className="w-full accent-[#FF5C00] h-2 bg-white/10 rounded-lg cursor-pointer transition-all"
                />
                <div className="flex justify-between text-[10px] font-num text-slate-500">
                  <span>৳20M (Small Operator)</span>
                  <span>৳500M (National Network)</span>
                </div>
              </div>

              {/* Slider 2: Incident Rate (Glass Card) */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl hover:border-white/[0.16] transition-all space-y-3">
                <div className="flex items-center justify-between text-[13px] font-ui">
                  <span className="text-slate-300 font-medium">Scam Attack Velocity:</span>
                  <span className="px-3 py-1 rounded-lg bg-[#FF5C00]/15 border border-[#FF5C00]/30 text-[#FF8C38] font-num font-bold text-[12px] shadow-inner">
                    {riskIncidentRate}% of txns
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.05"
                  value={riskIncidentRate}
                  onChange={(e) => setRiskIncidentRate(Number(e.target.value))}
                  className="w-full accent-[#FF5C00] h-2 bg-white/10 rounded-lg cursor-pointer transition-all"
                />
                <div className="flex justify-between text-[10px] font-num text-slate-500">
                  <span>0.10% (Low Traffic)</span>
                  <span>1.50% (High Attack Wave)</span>
                </div>
              </div>
            </div>

            {/* Right Projected Metrics (4 Frosted Glassmorphism Cards) */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Card 1: Estimated Monthly Savings (Hero Glass Card) */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-[#FF5C00]/15 via-white/[0.04] to-white/[0.01] border border-[#FF5C00]/30 backdrop-blur-2xl shadow-[0_0_30px_rgba(255,92,0,0.12),inset_0_1px_0_0_rgba(255,255,255,0.15)] hover:border-[#FF5C00]/60 transition-all flex flex-col justify-between">
                <span className="text-[11px] font-ui uppercase font-semibold tracking-wider text-slate-400">
                  Estimated Monthly Savings
                </span>
                <div className="text-[36px] sm:text-[42px] font-display font-light text-[#FF7A1A] my-2 tracking-[-0.03em] drop-shadow-[0_0_14px_rgba(255,92,0,0.4)]">
                  ৳{calculatedSavings.toFixed(2)} Cr
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-num text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  92% Average Asset Recovery
                </span>
              </div>

              {/* Card 2: Analyst Time Saved */}
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:border-white/[0.2] transition-all flex flex-col justify-between">
                <span className="text-[11px] font-ui uppercase font-semibold tracking-wider text-slate-400">
                  Analyst Time Saved
                </span>
                <div className="text-[36px] sm:text-[42px] font-display font-light text-white my-2 tracking-[-0.03em]">
                  {timeSavedHrs} hrs
                </div>
                <span className="text-[11px] font-ui text-slate-500">
                  Automated Triage Escalation
                </span>
              </div>

              {/* Card 3: SLA Benchmark */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-white/[0.03] to-transparent border border-emerald-500/25 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:border-emerald-500/50 transition-all flex flex-col justify-between">
                <span className="text-[11px] font-ui uppercase font-semibold tracking-wider text-slate-400">
                  SLA Benchmark
                </span>
                <div className="text-[36px] sm:text-[42px] font-display font-light text-emerald-400 my-2 tracking-[-0.03em] drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  8.4 mins
                </div>
                <span className="text-[11px] font-ui text-slate-500">
                  Down from legacy 72 hours
                </span>
              </div>

              {/* Card 4: Audit Trail */}
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:border-white/[0.2] transition-all flex flex-col justify-between">
                <span className="text-[11px] font-ui uppercase font-semibold tracking-wider text-slate-400">
                  Audit Trail
                </span>
                <div className="text-[30px] sm:text-[34px] font-display font-light text-white my-2 tracking-wider">
                  SHA-256
                </div>
                <span className="text-[11px] font-ui text-slate-500">
                  Immutable Court Evidence
                </span>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* PRICING */}
      {/* ======================================================== */}
      <section id="pricing" className="relative z-10 py-24 px-5 sm:px-8 max-w-[1400px] mx-auto">
        <div className="text-center max-w-xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-slate-400 text-[11px] font-ui font-medium uppercase tracking-widest mb-5">
            <CreditCard className="w-3 h-3 text-[#FF5C00]" />
            Simple Pricing
          </div>
          <h2 className="font-display font-light text-[36px] sm:text-[48px] tracking-[-0.035em] text-white mb-4 leading-[1.1]">
            Find the plan that works<br />for your institution
          </h2>
          <p className="font-ui font-normal text-[15px] text-slate-400 leading-[1.75]">
            Crafted to support every step of your institution's financial defense growth.
          </p>
        </div>

        <div className="flex items-center justify-center mb-12">
          <div className="inline-flex items-center p-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[13px] font-ui">
            <button onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-md transition-all cursor-pointer ${billingCycle === 'monthly' ? 'bg-[#FF5C00] text-white font-semibold shadow-[0_0_14px_rgba(255,92,0,0.3)]' : 'text-slate-500 hover:text-white'}`}>
              Monthly
            </button>
            <button onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${billingCycle === 'yearly' ? 'bg-[#FF5C00] text-white font-semibold shadow-[0_0_14px_rgba(255,92,0,0.3)]' : 'text-slate-500 hover:text-white'}`}>
              Yearly
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {[
            {
              name: 'Starter', price: 'Free', period: '', popular: false, accent: false,
              desc: 'For sandbox validators and startups exploring fraud intelligence.',
              features: ['Up to 10k txns/day', 'Basic NLP classification', 'Dashboard access', 'Email alerts', 'API sandbox access'],
            },
            {
              name: 'Enterprise', price: billingCycle === 'monthly' ? '৳120K' : '৳96K', period: '/month', popular: true, accent: true,
              desc: 'For commercial MFS scaling up with real-time threat defense.',
              features: ['Unlimited transactions', 'Full FastTree GNN access', 'Golden-Hour SLA engine', 'USSD *268# guard', 'Multi-MFS escrow API', 'Priority analyst support', 'STR/SAR auto-docket'],
            },
            {
              name: 'Institutional', price: billingCycle === 'monthly' ? '৳450K' : '৳360K', period: '/month', popular: false, accent: false,
              desc: 'Custom-built for central banks, telcos, and major financial operators.',
              features: ['All Enterprise features', 'Dedicated AI model training', 'On-premise deployment', 'SLA guarantee contract', 'Bangladesh Bank compliance', 'Custom USSD integration', '24/7 SOC support'],
            },
          ].map(plan => (
            <div key={plan.name} className={`relative p-7 rounded-xl flex flex-col ${
              plan.accent ? 'bg-gradient-to-b from-[#FF5C00]/10 to-transparent border border-[#FF5C00]/30 shadow-[0_0_40px_rgba(255,92,0,0.08)]' : 'bg-white/[0.02] border border-white/[0.07]'
            }`}>
              {plan.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#FF5C00] text-white text-[10px] font-ui font-semibold uppercase tracking-wider shadow-[0_0_14px_rgba(255,92,0,0.4)]">
                  Most Popular
                </span>
              )}
              <div className="mb-6">
                <div className="text-[13px] font-ui font-semibold text-white mb-1">{plan.name}</div>
                <p className="text-[12px] font-ui text-slate-500 mb-5 leading-relaxed">{plan.desc}</p>
                <div className="flex items-end gap-1">
                  <span className={`text-[38px] font-display font-light tracking-[-0.04em] ${plan.accent ? 'text-[#FF5C00]' : 'text-white'}`}>{plan.price}</span>
                  {plan.period && <span className="text-[13px] font-ui text-slate-500 mb-2">{plan.period}</span>}
                </div>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-[13px] font-ui text-slate-400">
                    <Check className={`w-3.5 h-3.5 shrink-0 ${plan.accent ? 'text-[#FF5C00]' : 'text-emerald-500'}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/dashboard"
                className={`w-full py-3 rounded-lg font-ui font-semibold text-[13px] text-center block transition-all ${
                  plan.accent
                    ? 'bg-[#FF5C00] hover:bg-[#FF7324] text-white shadow-[0_0_20px_rgba(255,92,0,0.3)] hover:shadow-[0_0_30px_rgba(255,92,0,0.45)]'
                    : 'bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-white'
                }`}>
                Get Started
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-[12px] font-ui text-slate-600 mt-8">
          All plans include a 14-day free trial · No credit card required · Cancel anytime
        </p>
      </section>

      {/* ======================================================== */}
      {/* CTA SECTION */}
      {/* ======================================================== */}
      <section className="relative z-10 py-24 px-5 sm:px-8 max-w-[1400px] mx-auto">
        <div className="relative p-12 sm:p-20 rounded-2xl border border-[#FF5C00]/20 overflow-hidden text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(255,92,0,0.1)_0%,rgba(255,92,0,0.03)_50%,transparent_100%)] pointer-events-none" />
          <div className="absolute inset-0 bg-white/[0.01]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FF5C00]/60 to-transparent" />

          <div className="relative max-w-2xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#FF5C00]/10 border border-[#FF5C00]/25 text-[#FF5C00] text-[11px] font-ui font-medium uppercase tracking-widest mb-2">
              <Sparkles className="w-3 h-3" />
              Ready to deploy
            </div>
            <h2 className="font-display font-light text-[36px] sm:text-[52px] tracking-[-0.04em] text-white leading-[1.08]">
              Ready to Explore The<br />Unified SOC Console?
            </h2>
            <p className="font-ui font-normal text-[15px] text-slate-400 leading-[1.75] max-w-lg mx-auto">
              Log into the analyst triage command center, trace active mule syndicates across Bangladesh, and run live transaction simulations.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/dashboard"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-[#FF5C00] hover:bg-[#FF7324] text-white font-ui font-semibold text-[15px] shadow-[0_0_36px_rgba(255,92,0,0.4)] hover:shadow-[0_0_50px_rgba(255,92,0,0.6)] transition-all hover:scale-[1.02]">
                Enter SOC Dashboard
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link href="/rings"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white font-ui font-medium text-[15px] transition-all hover:scale-[1.02]">
                <Network className="w-4 h-4 text-[#FF5C00]" />
                Open Ring-12 Hub
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* FOOTER */}
      {/* ======================================================== */}
      <footer className="relative z-10 border-t border-white/[0.05] pt-16 pb-10 px-5 sm:px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-14">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <Image
                  src="/brand/astha-mark.png"
                  alt="Astha"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain"
                />
                <span className="font-display font-semibold text-[16px] text-white tracking-[-0.03em]">
                  Astha
                </span>
              </div>
              <p className="text-[12px] font-ui text-slate-500 leading-relaxed mb-4">
                Autonomous financial intelligence &amp; fraud interception for the modern MFS ecosystem.
              </p>
              <div className="text-[11px] font-num text-slate-600">ISO 27001 · GDPR Compliant · SOC 2 Type II</div>
            </div>
            {[
              { title: 'Platform', links: [{ label: 'Executive Hub', href: '/dashboard' }, { label: 'Analyst Console', href: '/analyst' }, { label: 'Ring-12 Explorer', href: '/rings' }, { label: 'Golden-Hour Trace', href: '/recovery' }] },
              { title: 'Intelligence', links: [{ label: 'ROI Simulator', href: '/simulator' }, { label: 'SHA-256 Ledger', href: '/audit' }, { label: 'Threat Feed', href: '/dashboard' }, { label: 'USSD Guard', href: '/dashboard' }] },
              { title: 'Resources', links: [{ label: 'Documentation', href: '#' }, { label: 'API Reference', href: '#' }, { label: 'Privacy Policy', href: '#' }, { label: 'Bangladesh Bank', href: '#' }] },
            ].map(col => (
              <div key={col.title}>
                <div className="text-[11px] font-ui font-semibold uppercase tracking-widest text-slate-500 mb-4">{col.title}</div>
                <ul className="space-y-3">
                  {col.links.map(({ label, href }) => (
                    <li key={label}>
                      <Link href={href} className="text-[13px] font-ui text-slate-500 hover:text-white transition-colors">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/[0.05]">
            <div className="text-[11px] font-num text-slate-600">
              © 2025 Astha Platform · Next.js 15 · FastTree ML Engine
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-ui text-slate-600">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>
      </footer>


    </div>
  );
}
