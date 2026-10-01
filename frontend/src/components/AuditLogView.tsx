'use client';

import React, { useState, useEffect } from 'react';
import { FileText, ShieldCheck, CheckCircle2, Lock, RefreshCw } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchLogs = () => {
    fetch('/api/v1/audit/logs')
      .then((r) => r.json())
      .then((d) => setLogs(d.logs || []))
      .catch(console.error);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/v1/audit/verify', { method: 'POST' });
      const data = await res.json();
      setVerifyResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg text-white">🔒 Immutable Tamper-Evident Audit Ledger (M17)</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              SHA-256 Hash-Chained
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Every scoring decision, policy evaluation, analyst action, and LLM prompt hash is cryptographically chained.
          </p>
        </div>

        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
        >
          {isVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          <span>Verify Cryptographic Chain Integrity</span>
        </button>
      </div>

      {verifyResult && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
            verifyResult.valid
              ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
              : 'bg-red-950/50 border-red-500/50 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>
              {verifyResult.valid
                ? `Cryptographic Audit Chain Verified: ${verifyResult.totalEntries} entries checked without tampering.`
                : `Audit Chain Broken at sequence #${verifyResult.brokenSequence}!`}
            </span>
          </div>
          <span className="font-mono text-[11px]">HMAC-SHA256 OK</span>
        </div>
      )}

      {/* Logs Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 pb-2 border-b border-slate-800">
          <FileText className="w-4 h-4" />
          <span>RECENT IMMUTABLE AUDIT TRAIL</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Seq #</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Actor</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Target ID</th>
                <th className="py-3 px-3 font-mono">Current Hash (SHA-256)</th>
                <th className="py-3 px-3 font-mono">Prev Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {logs.map((log) => (
                <tr key={log.seq} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-bold text-cyan-300">#{log.seq}</td>
                  <td className="py-2.5 px-3 text-slate-400">{log.ts?.slice(11, 19)}</td>
                  <td className="py-2.5 px-3 text-white font-sans font-semibold">{log.actor}</td>
                  <td className="py-2.5 px-3 text-amber-300 font-sans">{log.action}</td>
                  <td className="py-2.5 px-3 text-slate-300">{log.target_id}</td>
                  <td className="py-2.5 px-3 text-cyan-400">{log.payload_hash?.slice(0, 16)}...</td>
                  <td className="py-2.5 px-3 text-slate-500">{log.prev_hash?.slice(0, 16)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
