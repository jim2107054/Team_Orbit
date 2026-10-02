/**
 * Types Barrel — Re-exports all domain types from modular files.
 * 
 * Consumers can import from either:
 *   import { Transaction } from '../core/types.js'       (legacy path, still works)
 *   import { Transaction } from '../core/types/index.js'  (new explicit path)
 */

// Common base types (enums, aliases)
export * from './common.js';

// Core entity types (Customer, Wallet, Device, Agent, Merchant, Transaction, etc.)
export * from './entity.js';

// Risk assessment & temporal intelligence
export * from './risk.js';

// Alert cases, ring cases, audit logs, money flow
export * from './case.js';

// Scam campaign intelligence
export * from './campaign.js';

// Complaint-to-action intelligence
export * from './complaint.js';

// Agent guard / liquidity & merchant trust
export * from './agent-merchant.js';

// Propagation intelligence & customer safety mode
export * from './protection.js';

// Bangladesh scam knowledge graph (semantic layer)
export * from './knowledge-graph.js';

// Recovery route optimizer
export * from './recovery.js';

// Human scam coach
export * from './coach.js';

// Evidence-driven scam incident investigation (UNDERSTAND / INVESTIGATE / EXPLAIN)
export * from './investigation.js';
