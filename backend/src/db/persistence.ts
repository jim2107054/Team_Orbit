import { getDbPool } from './client.js';

/**
 * Durable persistence layer for the domain services.
 *
 * Why this exists: the domain services keep their working set in memory because
 * most of their public methods are synchronous and are called synchronously from
 * both the route layer and the test suite. Making every mutation `async` would
 * ripple through hundreds of call sites. Instead, each mutation updates memory
 * synchronously and enqueues a durable write here, which the request pipeline
 * flushes before the HTTP response is sent (see `persistenceFlush` middleware).
 * At boot every service hydrates from these tables, so process restarts no
 * longer revert to the hardcoded seed objects.
 */

// ─── Write coordinator ────────────────────────────────────────────────────────

interface WriteOp {
  label: string;
  run: () => Promise<void>;
}

export interface PersistenceStats {
  enabled: boolean;
  queued: number;
  enqueued_total: number;
  committed_total: number;
  failed_total: number;
  recent_failures: Array<{ label: string; error: string; at: string }>;
}

class PersistenceCoordinator {
  private queue: WriteOp[] = [];
  private enqueuedTotal = 0;
  private committedTotal = 0;
  private failedTotal = 0;
  private recentFailures: Array<{ label: string; error: string; at: string }> = [];

  /**
   * Persistence is disabled under NODE_ENV=test so the existing suites keep
   * exercising pure in-memory behaviour and never write fixture rows into the
   * shared Neon database. `PERSISTENCE_ENABLED` can override either way.
   */
  private enabled: boolean =
    process.env.PERSISTENCE_ENABLED === 'true'
      ? true
      : process.env.PERSISTENCE_ENABLED === 'false'
        ? false
        : process.env.NODE_ENV !== 'test';

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
  }

  /** Queue a durable write. No-op when persistence is disabled. */
  enqueue(label: string, run: () => Promise<void>): void {
    if (!this.enabled) return;
    this.queue.push({ label, run });
    this.enqueuedTotal++;
  }

  /**
   * Drain the queue. Writes run in enqueue order because later writes may
   * reference rows created by earlier ones. A failing write is recorded and
   * surfaced on /health/persistence rather than silently dropped.
   */
  async flush(): Promise<{ committed: number; failed: number }> {
    if (!this.queue.length) return { committed: 0, failed: 0 };

    const batch = this.queue.splice(0, this.queue.length);
    let committed = 0;
    let failed = 0;

    for (const op of batch) {
      try {
        await op.run();
        committed++;
        this.committedTotal++;
      } catch (err: any) {
        failed++;
        this.failedTotal++;
        const entry = {
          label: op.label,
          error: String(err?.message || err),
          at: new Date().toISOString()
        };
        this.recentFailures.unshift(entry);
        this.recentFailures = this.recentFailures.slice(0, 20);
        console.error(`[Persistence] write failed for "${op.label}": ${entry.error}`);
      }
    }

    return { committed, failed };
  }

  getStats(): PersistenceStats {
    return {
      enabled: this.enabled,
      queued: this.queue.length,
      enqueued_total: this.enqueuedTotal,
      committed_total: this.committedTotal,
      failed_total: this.failedTotal,
      recent_failures: this.recentFailures.slice(0, 5)
    };
  }
}

export const persistence = new PersistenceCoordinator();

// ─── Generic JSONB-backed store ───────────────────────────────────────────────

export interface StoreColumn<T> {
  name: string;
  value: (obj: T) => unknown;
}

export interface JsonStoreConfig<T> {
  table: string;
  pk: string;
  id: (obj: T) => string;
  /** Indexed scalar columns mirrored out of the payload for filtering/sorting. */
  columns?: Array<StoreColumn<T>>;
  /** Set when the table carries an `updated_at` column to bump on conflict. */
  hasUpdatedAt?: boolean;
  /** Column used to order `loadAll` results. */
  orderBy?: string;
}

/**
 * Table-backed store that keeps the whole domain object in `payload_json` and
 * mirrors a handful of scalar columns for indexed queries.
 *
 * All SQL identifiers here come from the store's own configuration, never from
 * request data, so the interpolation below cannot carry untrusted input. Every
 * value is passed as a bound parameter.
 */
export class JsonStore<T> {
  private readonly insertSql: string;
  private readonly columns: Array<StoreColumn<T>>;

  constructor(private readonly cfg: JsonStoreConfig<T>) {
    this.columns = cfg.columns ?? [];

    const colNames = [cfg.pk, ...this.columns.map(c => c.name), 'payload_json'];
    const placeholders = colNames.map((_, i) => `$${i + 1}`);
    const updates = colNames
      .filter(name => name !== cfg.pk)
      .map(name => `${name} = EXCLUDED.${name}`);

    if (cfg.hasUpdatedAt) {
      updates.push('updated_at = NOW()');
    }

    this.insertSql =
      `INSERT INTO ${cfg.table} (${colNames.join(', ')}) ` +
      `VALUES (${placeholders.join(', ')}) ` +
      `ON CONFLICT (${cfg.pk}) DO UPDATE SET ${updates.join(', ')}`;
  }

  private params(obj: T): unknown[] {
    return [
      this.cfg.id(obj),
      ...this.columns.map(c => {
        const v = c.value(obj);
        return v === undefined ? null : v;
      }),
      JSON.stringify(obj)
    ];
  }

  /** Insert-or-update one row immediately. */
  async upsert(obj: T): Promise<void> {
    await getDbPool().query(this.insertSql, this.params(obj));
  }

  /** Insert-or-update many rows inside a single transaction. */
  async upsertMany(objs: T[]): Promise<void> {
    if (!objs.length) return;
    const client = await getDbPool().connect();
    try {
      await client.query('BEGIN');
      for (const obj of objs) {
        await client.query(this.insertSql, this.params(obj));
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  /** Queue an upsert to be committed on the next flush. */
  enqueueUpsert(obj: T): void {
    persistence.enqueue(`${this.cfg.table}:upsert:${this.cfg.id(obj)}`, () => this.upsert(obj));
  }

  /** Queue a batch upsert to be committed on the next flush. */
  enqueueUpsertMany(objs: T[]): void {
    if (!objs.length) return;
    persistence.enqueue(`${this.cfg.table}:upsertMany:${objs.length}`, () => this.upsertMany(objs));
  }

  /** Read every stored payload back as a domain object. */
  async loadAll(limit?: number): Promise<T[]> {
    const order = this.cfg.orderBy ? ` ORDER BY ${this.cfg.orderBy}` : '';
    const cap = limit ? ` LIMIT ${Math.floor(limit)}` : '';
    const res = await getDbPool().query(
      `SELECT payload_json FROM ${this.cfg.table}${order}${cap}`
    );
    return res.rows.map(r => this.parse(r.payload_json)).filter((v): v is T => v !== null);
  }

  async findById(id: string): Promise<T | null> {
    const res = await getDbPool().query(
      `SELECT payload_json FROM ${this.cfg.table} WHERE ${this.cfg.pk} = $1`,
      [id]
    );
    if (!res.rows.length) return null;
    return this.parse(res.rows[0].payload_json);
  }

  async deleteById(id: string): Promise<void> {
    await getDbPool().query(`DELETE FROM ${this.cfg.table} WHERE ${this.cfg.pk} = $1`, [id]);
  }

  enqueueDelete(id: string): void {
    persistence.enqueue(`${this.cfg.table}:delete:${id}`, () => this.deleteById(id));
  }

  async deleteAll(): Promise<void> {
    await getDbPool().query(`DELETE FROM ${this.cfg.table}`);
  }

  async count(): Promise<number> {
    const res = await getDbPool().query(`SELECT COUNT(*)::int AS n FROM ${this.cfg.table}`);
    return res.rows[0]?.n ?? 0;
  }

  /** True when the table has no rows — used to gate first-boot seeding. */
  async isEmpty(): Promise<boolean> {
    const res = await getDbPool().query(`SELECT 1 FROM ${this.cfg.table} LIMIT 1`);
    return res.rows.length === 0;
  }

  private parse(payload: unknown): T | null {
    if (payload === null || payload === undefined) return null;
    // jsonb comes back already parsed; tolerate text columns too.
    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload) as T;
      } catch {
        return null;
      }
    }
    return payload as T;
  }
}
