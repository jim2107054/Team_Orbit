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
            <span className="font-poppins font-bold text-lg text-[#000000]">
              🔒 Immutable Tamper-Evident Audit Ledger (M17)
            </span>
            <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-nunito font-bold bg-[#FF9F43]/15 text-[#FF9F43] border border-[#FF9F43]/30">
              SHA-256 Hash-Chained
            </span>
          </div>
          <p className="text-xs font-nunito text-[#646B72] mt-0.5">
            Every scoring decision, policy evaluation, analyst action, and LLM prompt hash is cryptographically chained in Neon Postgres.
          </p>
        </div>

        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="px-4 py-2 rounded-[5px] bg-[#198754] hover:bg-[#157347] text-white font-poppins font-semibold text-xs flex items-center gap-2 shadow-md transition-all"
        >
          {isVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          <span>Verify Cryptographic Chain Integrity</span>
        </button>
      </div>

      {verifyResult && (
        <div
          className={`p-4 rounded-none border flex items-center justify-between text-xs font-nunito font-bold ${
            verifyResult.valid
              ? 'bg-[#198754]/10 border-[#198754]/30 text-[#198754]'
              : 'bg-[#FF0000]/10 border-[#FF0000]/30 text-[#FF0000]'
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
      <div className="dream-card p-5 space-y-3 shadow-sm">
        <h3 className="text-xs font-poppins font-bold text-[#092C4C] flex items-center gap-1.5 pb-2 border-b border-[#DADFE5]">
          <FileText className="w-4 h-4 text-[#FF9F43]" />
          <span>RECENT IMMUTABLE AUDIT TRAIL</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-nunito text-[#212529]">
            <thead className="bg-[#F7F7F7] text-[#000000] font-poppins font-bold text-[11px] uppercase border-b border-[#DADFE5]">
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
            <tbody className="divide-y divide-[#DADFE5] font-mono text-[11px]">
              {logs.map((log) => (
                <tr key={log.seq} className="hover:bg-[#F7F7F7]">
                  <td className="py-2.5 px-3 font-bold text-[#FF9F43]">#{log.seq}</td>
                  <td className="py-2.5 px-3 text-[#646B72]">{log.ts?.slice(11, 19)}</td>
                  <td className="py-2.5 px-3 text-[#212B36] font-nunito font-semibold">{log.actor}</td>
                  <td className="py-2.5 px-3 text-[#092C4C] font-nunito font-bold">{log.action}</td>
                  <td className="py-2.5 px-3 text-[#212529]">{log.target_id}</td>
                  <td className="py-2.5 px-3 text-[#155EEF]">{log.payload_hash?.slice(0, 16)}...</td>
                  <td className="py-2.5 px-3 text-[#646B72]">{log.prev_hash?.slice(0, 16)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
