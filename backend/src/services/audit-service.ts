import crypto from 'crypto';
import { repository } from '../db/repository.js';
import { AuditLogEntry } from '../core/types.js';

export class AuditService {
  async logAction(actor: string, action: string, targetId: string, payload: any): Promise<void> {
    const latest = await repository.getLatestAuditEntry();
    const prevHash = latest ? latest.payload_hash : 'GENESIS_HASH_UPAY_SHIELD_2026';
    
    const payloadStr = JSON.stringify(payload);
    const hash = crypto.createHash('sha256')
      .update(prevHash + actor + action + targetId + payloadStr)
      .digest('hex');

    await repository.appendAuditLog(actor, action, targetId, payload, prevHash, hash);
  }

  async verifyAuditChainIntegrity(): Promise<{ valid: boolean; totalEntries: number; brokenSequence?: number }> {
    const logs = await repository.getAuditLogs(500);
    const ordered = [...logs].reverse(); // from earliest to latest

    let lastHash = 'GENESIS_HASH_UPAY_SHIELD_2026';
    for (let i = 0; i < ordered.length; i++) {
      const entry = ordered[i];
      if (entry.prev_hash !== lastHash && i !== 0) {
        return { valid: false, totalEntries: ordered.length, brokenSequence: entry.seq };
      }
      
      const payloadStr = typeof entry.payload_json === 'string' ? entry.payload_json : JSON.stringify(entry.payload_json);
      const expectedHash = crypto.createHash('sha256')
        .update(entry.prev_hash + entry.actor + entry.action + entry.target_id + payloadStr)
        .digest('hex');

      if (expectedHash !== entry.payload_hash) {
        return { valid: false, totalEntries: ordered.length, brokenSequence: entry.seq };
      }
      lastHash = entry.payload_hash;
    }

    return { valid: true, totalEntries: ordered.length };
  }
}

export const auditService = new AuditService();
