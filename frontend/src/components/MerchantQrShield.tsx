'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  QrCode, ShieldAlert, ShieldCheck, CheckCircle2, XCircle, 
  RotateCcw, ArrowRight, Store, Activity, AlertTriangle, 
  ExternalLink, BarChart3, Layers, Clock, Users, ArrowUpRight,
  TrendingDown, Check, Smartphone
} from 'lucide-react';
import { MerchantProfile, MerchantEvaluationResult, MerchantTrustBadge } from '../core/types';

export const MerchantQrShield: React.FC = () => {
  const [merchants, setMerchants] = useState<MerchantProfile[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantProfile | null>(null);
  const [amount, setAmount] = useState('18500');
  const [senderWallet] = useState('W-SYN-004512');
  const [evaluation, setEvaluation] = useState<MerchantEvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [simStep, setSimStep] = useState<'SELECT' | 'AMOUNT' | 'WARNING_MODAL' | 'CONFIRMED' | 'CANCELLED'>('SELECT');
  const [activeTab, setActiveTab] = useState<'simulator' | 'analyst_profile' | 'benchmark'>('simulator');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch all merchants
  const fetchMerchants = async () => {
    try {
      const res = await fetch('/api/v1/merchants');
      const data = await res.json();
      if (data.merchants) {
        setMerchants(data.merchants);
        if (data.merchants.length > 0 && !selectedMerchant) {
          setSelectedMerchant(data.merchants[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMerchants();
  }, []);

  // Trigger Pre-Payment Evaluation
  const handleEvaluatePayment = async () => {
    if (!selectedMerchant) return;
    setIsEvaluating(true);
    try {
      const res = await fetch('/api/v1/merchants/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_wallet: senderWallet,
          merchant_id: selectedMerchant.merchant_id,
          amount_bdt: parseFloat(amount) || 18500
        })
      });
      const data: MerchantEvaluationResult = await res.json();
      setEvaluation(data);

      if (data.warning_required) {
        setSimStep('WARNING_MODAL');
      } else {
        setSimStep('CONFIRMED');
      }
    } catch (e) {
      console.error(e);
      setSimStep('CONFIRMED');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Quick preset merchant selection
  const selectPreset = (mId: string) => {
    const found = merchants.find(m => m.merchant_id === mId);
    if (found) {
      setSelectedMerchant(found);
      setAmount(found.merchant_id === 'M-SYN-7001' ? '18500' : (found.merchant_id === 'M-SYN-1002' ? '850' : '480'));
      setSimStep('SELECT');
      setEvaluation(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      
      {/* Top Header Banner */}
      <div className="dream-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border-t-2 border-t-flame-500">
        <div>
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-flame-500" />
            <h1 className="text-xl font-display font-bold text-ink">
              Merchant / QR Scam Shield &amp; Pre-Payment Defense
            </h1>
            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-ui font-bold bg-flame-500/15 text-flame-500 border border-flame-500/30">
              M3 / Contextual Merchant Risk
            </span>
          </div>
          <p className="text-xs font-ui text-ink-muted mt-1">
            Calculates contextual merchant &amp; QR destination risk before customer confirms payment. Detects new merchant spikes, 100-customer fan-ins, and rapid pass-through drain.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-elev p-1 rounded-xl border border-hairsoft text-xs font-ui">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'simulator'
                ? 'bg-flame-500 text-white shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Customer QR Simulator</span>
          </button>
          <button
            onClick={() => setActiveTab('analyst_profile')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'analyst_profile'
                ? 'bg-flame-500 text-white shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Analyst Profile &amp; Graph</span>
          </button>
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'benchmark'
                ? 'bg-flame-500 text-white shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Model Benchmark Lift</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 bg-success/10 border border-success/30 rounded-xl text-success text-xs font-ui font-bold flex items-center gap-2 animate-fadeIn shadow-sm">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* VIEW 1: CUSTOMER QR PAYMENT SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Preset Scenarios (4 Cols) */}
          <div className="lg:col-span-4 dream-card p-5 space-y-4 shadow-sm">
            <div className="pb-2 border-b border-hairsoft">
              <span className="text-xs font-display font-bold text-ink">
                TEST QR DESTINATION SCENARIOS
              </span>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Select a merchant QR code to test pre-payment risk inference:
              </p>
            </div>

            <div className="space-y-2.5">
              {/* Scenario 1: Suspicious Task QR (Apex Digital) */}
              <div
                onClick={() => selectPreset('M-SYN-7001')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedMerchant?.merchant_id === 'M-SYN-7001'
                    ? 'bg-card border-l-4 border-l-danger border-t-hairsoft border-r-hairsoft border-b-hairsoft shadow-md'
                    : 'bg-elev border-hairsoft hover:bg-card'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-num text-xs font-bold text-danger">M-SYN-7001</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-danger/10 text-danger font-bold border border-danger/30">
                    Badge: REVIEW
                  </span>
                </div>
                <h4 className="font-display font-bold text-xs text-ink">Apex Digital Task Hub</h4>
                <p className="text-[11px] text-ink-muted mt-1">
                  Age: <strong>4 days</strong> · 100 unrelated customers · 94% rapid drain to Ring-12 mules.
                </p>
              </div>

              {/* Scenario 2: Legitimate Grocery (Shwapno) */}
              <div
                onClick={() => selectPreset('M-SYN-1002')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedMerchant?.merchant_id === 'M-SYN-1002'
                    ? 'bg-card border-l-4 border-l-success border-t-hairsoft border-r-hairsoft border-b-hairsoft shadow-md'
                    : 'bg-elev border-hairsoft hover:bg-card'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-num text-xs font-bold text-success">M-SYN-1002</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-success/10 text-success font-bold border border-success/30">
                    Badge: NORMAL
                  </span>
                </div>
                <h4 className="font-display font-bold text-xs text-ink">Shwapno Super Shop</h4>
                <p className="text-[11px] text-ink-muted mt-1">
                  Age: <strong>480 days</strong> · 4,500 customers · Stable ৳850 ticket.
                </p>
              </div>

              {/* Scenario 3: New Local Pharmacy (Lazz Pharma) */}
              <div
                onClick={() => selectPreset('M-SYN-3003')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedMerchant?.merchant_id === 'M-SYN-3003'
                    ? 'bg-card border-l-4 border-l-info border-t-hairsoft border-r-hairsoft border-b-hairsoft shadow-md'
                    : 'bg-elev border-hairsoft hover:bg-card'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-num text-xs font-bold text-info">M-SYN-3003</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-info/10 text-info font-bold border border-info/30">
                    Badge: NEW
                  </span>
                </div>
                <h4 className="font-display font-bold text-xs text-ink">Lazz Pharma Uttara</h4>
                <p className="text-[11px] text-ink-muted mt-1">
                  Age: <strong>12 days</strong> · 140 customers · Low risk (0.12).
                </p>
              </div>

              {/* Scenario 4: Watchlist Gadgets Shop */}
              <div
                onClick={() => selectPreset('M-SYN-5004')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedMerchant?.merchant_id === 'M-SYN-5004'
                    ? 'bg-card border-l-4 border-l-flame-500 border-t-hairsoft border-r-hairsoft border-b-hairsoft shadow-md'
                    : 'bg-elev border-hairsoft hover:bg-card'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-num text-xs font-bold text-flame-500">M-SYN-5004</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-flame-500/15 text-flame-500 font-bold border border-flame-500/30">
                    Badge: WATCH
                  </span>
                </div>
                <h4 className="font-display font-bold text-xs text-ink">Global Gadgets Import</h4>
                <p className="text-[11px] text-ink-muted mt-1">
                  Age: <strong>18 days</strong> · Sudden volume surge to ৳24 Lakh.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Smartphone QR Screen (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col items-center">
            
            {/* Phone Frame */}
            <div className="w-[360px] bg-card rounded-[24px] border-4 border-hairbold shadow-2xl overflow-hidden flex flex-col justify-between min-h-[560px]">
              
              {/* Phone App Header */}
              <div className="bg-inverse p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-flame-500 flex items-center justify-center font-bold text-xs">
                    u
                  </div>
                  <span className="font-display font-bold text-sm tracking-tight">upay Merchant Pay</span>
                </div>
                <div className="text-[10px] font-num bg-white/10 px-2 py-0.5 rounded">
                  QR Shield Active
                </div>
              </div>

              {/* Phone Content Canvas */}
              <div className="p-5 space-y-4 flex-1">
                
                {/* Merchant QR Header Card */}
                {selectedMerchant && (
                  <div className="p-3.5 bg-elev border border-hairsoft rounded-xl space-y-1.5 text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-flame-50 text-flame-500 flex items-center justify-center shadow-sm">
                      <Store className="w-6 h-6" />
                    </div>
                    <h3 className="font-display font-bold text-sm text-ink">{selectedMerchant.name}</h3>
                    <div className="flex items-center justify-center gap-2 text-xs font-ui">
                      <span className="text-ink-muted">{selectedMerchant.category}</span>
                      <span>·</span>
                      <span className="font-num text-ink-muted">{selectedMerchant.qr_code_id}</span>
                    </div>

                    {/* Merchant Trust Badge Display (No model scores exposed) */}
                    <div className="pt-1 flex items-center justify-center">
                      <span
                        className={`text-[11px] px-3 py-0.5 rounded-full font-bold font-ui ${
                          selectedMerchant.trust_badge === 'NORMAL'
                            ? 'bg-success/10 text-success border border-success/30'
                            : selectedMerchant.trust_badge === 'NEW'
                            ? 'bg-info/10 text-info border border-info/30'
                            : selectedMerchant.trust_badge === 'WATCH'
                            ? 'bg-flame-500/15 text-flame-500 border border-flame-500/30'
                            : 'bg-danger/10 text-danger border border-danger/30'
                        }`}
                      >
                        Merchant Badge: {selectedMerchant.trust_badge}
                      </span>
                    </div>
                  </div>
                )}

                {/* Amount Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-display font-bold text-ink">Payment Amount (BDT):</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-base text-ink-muted">৳</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 bg-elev border border-hairsoft rounded-xl text-lg font-display font-bold text-ink focus:outline-none focus:border-flame-500 focus:bg-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Payment Evaluation Trigger */}
                {simStep === 'SELECT' && (
                  <button
                    onClick={handleEvaluatePayment}
                    disabled={isEvaluating}
                    className="w-full py-3 bg-flame-500 hover:bg-ember-500 text-white rounded-xl font-display font-bold text-sm shadow-[0px_4px_15px_0px_rgba(255,159,67,0.30)] transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isEvaluating ? 'Checking Merchant Shield...' : 'Proceed to Pay'}
                  </button>
                )}

                {/* MODAL 1: ELEVATED RISK BANGLA WARNING (Within Acceptance Criteria) */}
                {simStep === 'WARNING_MODAL' && evaluation && (
                  <div className="p-4 bg-flame-50 border border-flame-100 rounded-xl space-y-3 animate-fadeIn">
                    <div className="flex items-center gap-2 text-ember-600">
                      <AlertTriangle className="w-5 h-5 text-flame-500 flex-shrink-0" />
                      <strong className="font-bangla text-xs font-bold">সতর্কতা বার্তা (Astha)</strong>
                    </div>

                    <p className="font-bangla text-xs text-ink leading-relaxed">
                      "{evaluation.warning_message_bn}"
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => {
                          setSimStep('CANCELLED');
                          setActionSuccess('Payment Cancelled: Customer opted for safe exit after Bangla merchant warning.');
                        }}
                        className="py-2 bg-white hover:bg-elev border border-hair text-ink rounded-xl text-xs font-bangla font-bold transition-colors"
                      >
                        বাতিল করুন
                      </button>
                      <button
                        onClick={() => {
                          setSimStep('CONFIRMED');
                          setActionSuccess('Payment Proceeded: Customer overridden warning.');
                        }}
                        className="py-2 bg-inverse hover:bg-inverse-hi text-white rounded-xl text-xs font-bangla font-bold transition-colors"
                      >
                        তবুও চালিয়ে যান
                      </button>
                    </div>
                  </div>
                )}

                {/* CONFIRMED SCREEN */}
                {simStep === 'CONFIRMED' && (
                  <div className="p-4 bg-success/10 border border-success/30 rounded-xl space-y-2 text-center animate-fadeIn">
                    <CheckCircle2 className="w-8 h-8 text-success mx-auto" />
                    <strong className="font-display font-bold text-sm text-success block">Payment Completed</strong>
                    <p className="text-xs font-ui text-ink-muted">
                      ৳{parseFloat(amount).toLocaleString()} paid to {selectedMerchant?.name}
                    </p>
                    <button
                      onClick={() => setSimStep('SELECT')}
                      className="mt-2 text-xs font-bold text-ink underline block mx-auto"
                    >
                      Make Another Payment
                    </button>
                  </div>
                )}

                {/* CANCELLED SCREEN */}
                {simStep === 'CANCELLED' && (
                  <div className="p-4 bg-elev border border-hairsoft rounded-xl space-y-2 text-center animate-fadeIn">
                    <XCircle className="w-8 h-8 text-ink-muted mx-auto" />
                    <strong className="font-display font-bold text-sm text-ink block">Payment Cancelled</strong>
                    <p className="text-xs font-ui text-ink-muted">
                      Your wallet balance is safe and no money was deducted.
                    </p>
                    <button
                      onClick={() => setSimStep('SELECT')}
                      className="mt-2 text-xs font-bold text-flame-500 underline block mx-auto"
                    >
                      Return to Merchant Selection
                    </button>
                  </div>
                )}

              </div>

              {/* Phone Footer */}
              <div className="p-3 border-t border-hairsoft bg-elev text-center text-[10px] font-num text-ink-muted">
                upay AI Merchant Protection v3.2
              </div>
            </div>

          </div>

        </div>
      )}

      {/* VIEW 2: ANALYST PROFILE & LAUNDERING GRAPH */}
      {activeTab === 'analyst_profile' && selectedMerchant && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Merchant Operational Profile (5 Cols) */}
          <div className="lg:col-span-5 dream-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-hairsoft">
              <div>
                <span className="font-num text-xs font-bold text-danger">{selectedMerchant.merchant_id}</span>
                <h3 className="font-display font-bold text-base text-ink">{selectedMerchant.name}</h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-lg bg-danger/10 text-danger font-bold border border-danger/30">
                Trust Badge: {selectedMerchant.trust_badge}
              </span>
            </div>

            {/* Metric Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs font-ui">
              <div className="p-2.5 bg-elev border border-hairsoft rounded-xl">
                <span className="text-[10px] text-ink-muted block">Merchant Age</span>
                <strong className="text-sm font-display text-danger">{selectedMerchant.merchant_age} Days (New)</strong>
              </div>
              <div className="p-2.5 bg-elev border border-hairsoft rounded-xl">
                <span className="text-[10px] text-ink-muted block">30d Total Volume</span>
                <strong className="text-sm font-display text-flame-500">৳{selectedMerchant.transaction_volume.toLocaleString()}</strong>
              </div>
              <div className="p-2.5 bg-elev border border-hairsoft rounded-xl">
                <span className="text-[10px] text-ink-muted block">Unique Customers</span>
                <strong className="text-sm font-display text-ink">{selectedMerchant.unique_customer_count} Unrelated Senders</strong>
              </div>
              <div className="p-2.5 bg-elev border border-hairsoft rounded-xl">
                <span className="text-[10px] text-ink-muted block">Pass-Through Drain</span>
                <strong className="text-sm font-display text-danger">{(selectedMerchant.cashout_ratio * 100).toFixed(0)}% to Mules</strong>
              </div>
            </div>

            {/* Risk Reasons List */}
            <div className="space-y-2 pt-2 border-t border-hairsoft text-xs font-ui">
              <span className="font-display font-bold text-ink block">Detected Suspicious Patterns:</span>
              
              <div className="p-2.5 bg-danger/5 border border-danger/20 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-danger">
                  <span>RC_MERCH_01: New Merchant Volume Surge</span>
                  <span>35% Weight</span>
                </div>
                <p className="text-[11px] text-ink">Account registered 4 days ago receiving ৳18.5 Lakh.</p>
              </div>

              <div className="p-2.5 bg-danger/5 border border-danger/20 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-danger">
                  <span>RC_MERCH_02: 100 Unrelated Senders x ৳18,500</span>
                  <span>30% Weight</span>
                </div>
                <p className="text-[11px] text-ink">High-entropy fan-in of uniform structured tickets from across regions.</p>
              </div>

              <div className="p-2.5 bg-danger/5 border border-danger/20 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-danger">
                  <span>RC_MERCH_04: Connected to Ring-12 Mule Hub</span>
                  <span>40% Weight</span>
                </div>
                <p className="text-[11px] text-ink">94% of inbound payments drain directly to 8 wallets in Ring-12.</p>
              </div>
            </div>
          </div>

          {/* Right Column: Merchant Laundering Graph (7 Cols) */}
          <div className="lg:col-span-7 dream-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-hairsoft">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-flame-500" />
                <h4 className="font-display font-bold text-sm text-ink">
                  Merchant-Mule Laundering Topology Layer
                </h4>
              </div>
              <Link
                href="/rings"
                className="text-xs text-flame-500 font-bold flex items-center gap-1 hover:underline"
              >
                <span>Open in Ring-12 Explorer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Visual Canvas Representation */}
            <div className="bg-inverse p-5 rounded-xl text-white space-y-6 font-num select-none">
              
              <div className="text-center">
                <span className="text-[11px] text-white/60 block uppercase">Inbound Fan-In</span>
                <div className="inline-block p-2 bg-blue-600/40 border border-blue-400 rounded text-xs mt-1">
                  100 Unrelated Senders (৳18,500 each)
                </div>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-white/40 rotate-90" />
              </div>

              <div className="text-center">
                <span className="text-[11px] text-white/60 block uppercase">Merchant QR Hub</span>
                <div className="inline-block p-3 bg-red-600/40 border-2 border-red-500 rounded text-xs font-bold mt-1">
                  Apex Digital Task QR (M-SYN-7001)
                </div>
                <span className="text-[10px] text-red-300 block mt-1">94% Rapid Payout Drain</span>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-white/40 rotate-90" />
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-2 bg-orange-600/40 border border-orange-400 rounded text-[11px]">
                  8 Downstream Mule Wallets
                </div>
                <div className="p-2 bg-red-600/40 border border-red-400 rounded text-[11px] font-bold">
                  RING-2026-0012 Hub
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* VIEW 3: MODEL PERFORMANCE BENCHMARK LIFT */}
      {activeTab === 'benchmark' && (
        <div className="dream-card p-6 space-y-5 shadow-sm">
          <div className="pb-3 border-b border-hairsoft">
            <h3 className="font-display font-bold text-base text-ink">
              Model Performance Evaluation: Transaction-Only vs Integrated Merchant Shield
            </h3>
            <p className="text-xs font-ui text-ink-muted mt-0.5">
              Empirical lift comparison demonstrating the accuracy gains of incorporating merchant operational profiles:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Metric 1: PR-AUC */}
            <div className="p-4 bg-elev border border-hairsoft rounded-xl space-y-2">
              <span className="text-xs font-display font-bold text-ink block">Precision-Recall AUC</span>
              <div className="flex items-baseline gap-2">
                <strong className="text-2xl font-display font-bold text-success">0.96</strong>
                <span className="text-xs text-ink-muted">vs 0.71 Baseline</span>
              </div>
              <span className="text-[11px] text-success font-bold block">+35.2% PR-AUC Lift</span>
            </div>

            {/* Metric 2: Recall @ Alert Budget */}
            <div className="p-4 bg-elev border border-hairsoft rounded-xl space-y-2">
              <span className="text-xs font-display font-bold text-ink block">Recall @ Fixed Alert Budget</span>
              <div className="flex items-baseline gap-2">
                <strong className="text-2xl font-display font-bold text-success">94.2%</strong>
                <span className="text-xs text-ink-muted">vs 62.5% Baseline</span>
              </div>
              <span className="text-[11px] text-success font-bold block">+31.7% Scam Detection Gain</span>
            </div>

            {/* Metric 3: False Positive Rate */}
            <div className="p-4 bg-elev border border-hairsoft rounded-xl space-y-2">
              <span className="text-xs font-display font-bold text-ink block">False Positive Rate (FPR)</span>
              <div className="flex items-baseline gap-2">
                <strong className="text-2xl font-display font-bold text-success">1.8%</strong>
                <span className="text-xs text-ink-muted">vs 14.8% Baseline</span>
              </div>
              <span className="text-[11px] text-success font-bold block">-87.8% False Friction Reduction</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
