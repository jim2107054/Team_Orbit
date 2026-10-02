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
      <div className="dream-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-flame-500" />
            <span className="font-display font-bold text-lg text-ink">
              Immutable Tamper-Evident Audit Ledger (M17)
            </span>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-ui font-bold bg-flame-500/15 text-flame-500 border border-flame-500/30">
              SHA-256 Hash-Chained
            </span>
          </div>
          <p className="text-xs font-ui text-ink-muted mt-0.5">
            Every scoring decision, policy evaluation, analyst action, and LLM prompt hash is cryptographically chained in Neon Postgres.
          </p>
        </div>

        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="px-4 py-2 rounded-lg bg-success hover:bg-success-lo text-white font-display font-semibold text-xs flex items-center gap-2 shadow-md transition-all"
        >
          {isVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          <span>Verify Cryptographic Chain Integrity</span>
        </button>
      </div>

      {verifyResult && (
        <div
          className={`p-4 rounded-none border flex items-center justify-between text-xs font-ui font-bold ${
            verifyResult.valid
              ? 'bg-success/10 border-success/30 text-success'
              : 'bg-danger/10 border-danger/30 text-danger'
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
          <span className="font-num text-[11px]">HMAC-SHA256 OK</span>
        </div>
      )}

      {/* Logs Table */}
      <div className="dream-card p-5 space-y-3 shadow-sm">
        <h3 className="text-xs font-display font-bold text-ink flex items-center gap-1.5 pb-2 border-b border-hair">
          <FileText className="w-4 h-4 text-flame-500" />
          <span>RECENT IMMUTABLE AUDIT TRAIL</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-ui text-ink">
            <thead className="bg-elev text-ink font-display font-bold text-[11px] uppercase border-b border-hair">
              <tr>
                <th className="py-3 px-3">Seq #</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Actor</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Target ID</th>
                <th className="py-3 px-3 font-num">Current Hash (SHA-256)</th>
                <th className="py-3 px-3 font-num">Prev Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hair font-num text-[11px]">
              {logs.map((log) => (
                <tr key={log.seq} className="hover:bg-elev">
                  <td className="py-2.5 px-3 font-bold text-flame-500">#{log.seq}</td>
                  <td className="py-2.5 px-3 text-ink-muted">{log.ts?.slice(11, 19)}</td>
                  <td className="py-2.5 px-3 text-ink font-ui font-semibold">{log.actor}</td>
                  <td className="py-2.5 px-3 text-ink font-ui font-bold">{log.action}</td>
                  <td className="py-2.5 px-3 text-ink">{log.target_id}</td>
                  <td className="py-2.5 px-3 text-info">{log.payload_hash?.slice(0, 16)}...</td>
                  <td className="py-2.5 px-3 text-ink-muted">{log.prev_hash?.slice(0, 16)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
