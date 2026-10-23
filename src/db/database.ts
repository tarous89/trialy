import {setDatabaseContext} from './context.js';
import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
export interface Connection { query<T = any>(sql: string, values?: any[]): Promise<{ rows: T[]; rowCount?: number | null }> }
export interface Database extends Connection { transaction<T>(fn: (tx: Connection) => Promise<T>): Promise<T>; close(): Promise<void> }
export class Postgres implements Database {
  pool: pg.Pool;
  constructor(url: string) { this.pool = new pg.Pool({ connectionString: url, max: 10, connectionTimeoutMillis: 10000 }); }
  async query<T = any>(sql: string, values: any[] = []) { return this.transaction(async tx=>{const r=await tx.query<T>(sql,values);return {rows:r.rows,rowCount:r.rowCount};}); }
  async transaction<T>(fn: (tx: Connection) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try { await c.query('BEGIN'); await setDatabaseContext(c); const result = await fn(c); await c.query('COMMIT'); return result; }
    catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  }
  async close() { await this.pool.end(); }
}
export async function migrate(db: Database) {
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  for (const name of (await readdir('migrations')).filter(n => n.endsWith('.sql')).sort()) {
    await db.transaction(async tx => {
      await tx.query("SELECT pg_advisory_xact_lock(873467)");
      if ((await tx.query('SELECT name FROM schema_migrations WHERE name=$1', [name])).rows.length) return;
      await tx.query(await readFile(`migrations/${name}`, 'utf8'));
      await tx.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
    });
  }
}
