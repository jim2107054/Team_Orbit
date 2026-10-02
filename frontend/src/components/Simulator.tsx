'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Sliders, TrendingUp, DollarSign, Users, AlertTriangle } from 'lucide-react';

export const Simulator: React.FC = () => {
  const [totalTxns] = useState(1000000);
  const [threshold, setThreshold] = useState(0.60);
  const [fraudRate, setFraudRate] = useState(0.5);
  const [meanAmount, setMeanAmount] = useState(9000);
  const [cancelRate, setCancelRate] = useState(60);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const runSimulation = async () => {
    try {
      const res = await fetch('/api/v1/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_txns: totalTxns,
          fraud_prevalence_pct: fraudRate,
          mean_fraud_amount_bdt: meanAmount,
          operating_threshold: threshold,
          intervention_cancel_rate_pct: cancelRate,
          friction_cost_per_legit_bdt: 2.0,
          analyst_cost_per_minute_bdt: 4.0,
          analyst_time_per_alert_mins: 3.0,
          golden_hour_recovery_rate_pct: 25.0
        })
      });
      const data = await res.json();
      setSimulationResult(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [threshold, fraudRate, meanAmount, cancelRate]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="dream-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#FF9F43]" />
            <span className="font-poppins font-bold text-lg text-[#000000]">
              Parametric Business Impact &amp; ROI Simulator
            </span>
            <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-nunito font-bold bg-[#FF9F43]/15 text-[#FF9F43] border border-[#FF9F43]/30">
              SRS §16 Model
            </span>
          </div>
          <p className="text-xs font-nunito text-[#646B72] mt-0.5">
            Tune operating thresholds and loss parameters to see instant loss prevented, customer friction, and net ROI.
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs font-nunito text-[#646B72] block">Baseline Transaction Pool</span>
          <span className="text-sm font-poppins font-bold text-[#092C4C]">1,000,000 Transactions</span>
        </div>
      </div>

      {/* Main Grid: Sliders on Left, KPI Outputs on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Interactive Controls (5 Cols) */}
        <div className="lg:col-span-5 dream-card p-5 space-y-4 shadow-sm">
          <h3 className="text-xs font-poppins font-bold text-[#092C4C] flex items-center gap-1.5 pb-2 border-b border-[#DADFE5]">
            <Sliders className="w-4 h-4 text-[#FF9F43]" />
            <span>OPERATING THRESHOLD &amp; PARAMETER CONTROLS</span>
          </h3>

          <div className="space-y-3.5 text-xs font-nunito">
            {/* 1. Operating Threshold */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[#212529] font-semibold">Risk Decision Threshold (θ)</span>
                <span className="font-mono text-[#FF9F43] font-bold">{threshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.20"
                max="0.90"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full accent-[#FF9F43] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#646B72] mt-0.5">
                <span>Aggressive (0.20)</span>
                <span>Balanced (0.60)</span>
                <span>Conservative (0.90)</span>
              </div>
            </div>

            {/* 2. Fraud Prevalence */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[#212529] font-semibold">Fraud Prevalence (%)</span>
                <span className="font-mono text-[#FF9F43] font-bold">{fraudRate}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={fraudRate}
                onChange={(e) => setFraudRate(parseFloat(e.target.value))}
                className="w-full accent-[#FF9F43] cursor-pointer"
              />
            </div>

            {/* 3. Mean Fraud Amount */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[#212529] font-semibold">Mean Fraud Amount (BDT)</span>
                <span className="font-mono text-[#FF9F43] font-bold">৳{meanAmount.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="3000"
                max="25000"
                step="1000"
                value={meanAmount}
                onChange={(e) => setMeanAmount(parseInt(e.target.value))}
                className="w-full accent-[#FF9F43] cursor-pointer"
              />
            </div>

            {/* 4. Customer Intervention Cancellation Rate */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[#212529] font-semibold">Customer Cancellation Rate after Warning (%)</span>
                <span className="font-mono text-[#198754] font-bold">{cancelRate}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="90"
                step="5"
                value={cancelRate}
                onChange={(e) => setCancelRate(parseInt(e.target.value))}
                className="w-full accent-[#198754] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right: Outputs (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Net Benefit Hero Card */}
          <div className="p-6 bg-[#212B36] rounded-none border border-[#212B36] text-white flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs font-nunito font-semibold text-[#FF9F43] uppercase tracking-wider block">
                Estimated Net Economic Benefit
              </span>
              <div className="text-3xl font-poppins font-black text-white mt-1">
                ৳ {simulationResult ? simulationResult.net_benefit_bdt.toLocaleString() : '21,500,000'}
              </div>
              <p className="text-[11px] font-nunito text-slate-300 mt-1">
                Loss Prevented + Golden-Hour Recovery − Friction &amp; Ops Costs
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-nunito text-slate-400 block">ROI Multiple</span>
              <span className="text-2xl font-poppins font-extrabold text-[#FF9F43]">
                {simulationResult ? `${simulationResult.roi_multiple}x` : '18.4x'}
              </span>
            </div>
          </div>

          {/* KPI Output Grid (Color-Blocked cards) */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-4 bg-[#FFFFFF] rounded-none border border-[#DADFE5] shadow-sm">
              <span className="text-[11px] font-nunito text-[#646B72] block mb-1">Loss Prevented</span>
              <span className="text-lg font-poppins font-bold text-[#198754]">
                ৳ {simulationResult ? simulationResult.loss_prevented_bdt.toLocaleString() : '...'}
              </span>
            </div>

            <div className="p-4 bg-[#FFFFFF] rounded-none border border-[#DADFE5] shadow-sm">
              <span className="text-[11px] font-nunito text-[#646B72] block mb-1">Golden-Hour Recovery</span>
              <span className="text-lg font-poppins font-bold text-[#092C4C]">
                ৳ {simulationResult ? simulationResult.recovery_gain_bdt.toLocaleString() : '...'}
              </span>
            </div>

            <div className="p-4 bg-[#FFFFFF] rounded-none border border-[#DADFE5] shadow-sm">
              <span className="text-[11px] font-nunito text-[#646B72] block mb-1">Fraud Recall Rate</span>
              <span className="text-lg font-poppins font-bold text-[#000000]">
                {simulationResult ? `${simulationResult.recall_pct}%` : '...'}
              </span>
            </div>

            <div className="p-4 bg-[#FFFFFF] rounded-none border border-[#DADFE5] shadow-sm">
              <span className="text-[11px] font-nunito text-[#646B72] block mb-1">Legitimate FPR Friction</span>
              <span className="text-lg font-poppins font-bold text-[#FF9F43]">
                {simulationResult ? `${simulationResult.false_positive_friction_rate_pct}%` : '...'}
              </span>
            </div>

            <div className="p-4 bg-[#FFFFFF] rounded-none border border-[#DADFE5] shadow-sm">
              <span className="text-[11px] font-nunito text-[#646B72] block mb-1">Analyst Alert Volume</span>
              <span className="text-lg font-poppins font-bold text-[#212B36]">
                {simulationResult ? simulationResult.analyst_alerts_count.toLocaleString() : '...'}
              </span>
            </div>

            <div className="p-4 bg-[#FFFFFF] rounded-none border border-[#DADFE5] shadow-sm">
              <span className="text-[11px] font-nunito text-[#646B72] block mb-1">Friction &amp; Ops Cost</span>
              <span className="text-lg font-poppins font-bold text-[#FF0000]">
                ৳ {simulationResult ? (simulationResult.friction_cost_bdt + simulationResult.analyst_cost_bdt).toLocaleString() : '...'}
              </span>
            </div>
          </div>

          {/* Operating Curve Table */}
          {simulationResult?.operating_curve && (
            <div className="dream-card p-4 shadow-sm">
              <span className="text-xs font-poppins font-bold text-[#212B36] block mb-2">
                THRESHOLD OPERATING CURVE
              </span>
              <div className="grid grid-cols-4 text-center text-xs gap-2">
                {simulationResult.operating_curve.map((p: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-none border ${
                      p.threshold === threshold
                        ? 'bg-[#FF9F43]/15 border-[#FF9F43] text-[#FF9F43] font-bold'
                        : 'bg-[#F7F7F7] border-[#DADFE5] text-[#212529]'
                    }`}
                  >
                    <span className="font-mono font-bold block">θ = {p.threshold}</span>
                    <span className="text-[11px] block mt-0.5">Recall: {p.recall_pct}%</span>
                    <span className="text-[10px] text-[#198754] font-semibold block mt-0.5">
                      ৳{(p.net_benefit_bdt / 1000000).toFixed(1)}M Net
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
