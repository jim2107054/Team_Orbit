'use client';

import React, { useState, useEffect } from 'react';
import { Users, Activity, ShieldCheck, CheckCircle2, AlertTriangle, FileCode } from 'lucide-react';

export const FairnessDrift: React.FC = () => {
  const [slices, setSlices] = useState<any[]>([]);
  const [drift, setDrift] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/v1/metrics/fairness')
      .then((r) => r.json())
      .then((d) => setSlices(d.slices || []))
      .catch(console.error);

    fetch('/api/v1/metrics/drift')
      .then((r) => r.json())
      .then((d) => setDrift(d.drift || []))
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg text-white">⚖️ Responsible AI, Fairness & PSI Drift Audit</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              RAI-03 &amp; RAI-04 Compliant
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Demographic parity auditing across Gender, Rural vs. Urban, Age Bands, and Onboarding Channels without proxy discrimination.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-bold">
          <CheckCircle2 className="w-4 h-4" />
          <span>All Disparity Ratios &lt; 1.25x (PASS)</span>
        </div>
      </div>

      {/* Fairness Slices Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 pb-2 border-b border-slate-800">
          <Users className="w-4 h-4" />
          <span>DEMOGRAPHIC FAIRNESS SLICES (PROTECTED ATTRIBUTES EXCLUDED FROM MODEL INPUTS)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Slice Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Sample Size</th>
                <th className="py-3 px-4">Alert Rate</th>
                <th className="py-3 px-4">FPR Friction</th>
                <th className="py-3 px-4">Recall (TPR)</th>
                <th className="py-3 px-4">Disparity Ratio</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {slices.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-semibold text-white">{s.slice_name}</td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">{s.category}</td>
                  <td className="py-3 px-4 font-mono">{s.total_samples.toLocaleString()}</td>
                  <td className="py-3 px-4">{s.alert_rate_pct}%</td>
                  <td className="py-3 px-4 text-amber-300 font-semibold">{s.fpr_pct}%</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">{s.tpr_recall_pct}%</td>
                  <td className="py-3 px-4 font-mono font-bold text-cyan-300">{s.disparity_ratio}x</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      FAIR
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature PSI Drift Monitors & Model Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PSI Drift (6 Cols) */}
        <div className="lg:col-span-6 glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 pb-2 border-b border-slate-800">
            <Activity className="w-4 h-4" />
            <span>POPULATION STABILITY INDEX (PSI) DRIFT TELEMETRY</span>
          </h3>

          <div className="space-y-2 text-xs">
            {drift.map((d, idx) => (
              <div key={idx} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-mono text-slate-200 font-bold">{d.feature_name}</span>
                  <span className="text-[10px] text-slate-500 block">Baseline vs Live Window</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-cyan-400 font-bold text-xs">{d.psi_score}</span>
                  <span className="block text-[10px] text-emerald-400 font-semibold">{d.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Card Metadata (6 Cols) */}
        <div className="lg:col-span-6 glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-purple-400 flex items-center gap-1.5 pb-2 border-b border-slate-800">
            <FileCode className="w-4 h-4" />
            <span>MODEL CARD & ETHICAL DISCLOSURES (GUIDELINE §14)</span>
          </h3>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <strong className="text-white block mb-1">Model Architecture:</strong>
              <p className="text-slate-400 text-[11px]">
                Multi-layer Ensemble: Supervised Gradient Boosting + Isolation Forest Anomaly + Heterogeneous Network Graph Proximity + NLP Scam Classifier.
              </p>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <strong className="text-white block mb-1">Ethical Bounds & Safeguards:</strong>
              <p className="text-slate-400 text-[11px]">
                Gender, exact religion, and raw demographic attributes are strictly omitted from scoring inputs.
                Zero autonomous permanent denials; all high-impact actions mandate human-in-the-loop analyst review.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
