import {requestMetrics} from './metrics.js';
import {databaseContext,databaseContextValues,setDatabaseContext} from './context.js';
import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
export interface Connection { query<T = any>(sql: string, values?: any[]): Promise<{ rows: T[]; rowCount?: number | null }> }
export interface Database extends Connection { transaction<T>(fn: (tx: Connection) => Promise<T>): Promise<T>; close(): Promise<void> }
export class Postgres implements Database {
  pool: pg.Pool;
  constructor(url: string, max=10, statementTimeout=0) { this.pool = new pg.Pool({ connectionString: url, max, connectionTimeoutMillis: 10000,statement_timeout:statementTimeout,lock_timeout:statementTimeout?Math.min(statementTimeout,1000):0 }); }
  async query<T = any>(sql: string, values: any[] = []) { return this.transaction(async tx=>{const r=await tx.query<T>(sql,values);return {rows:r.rows,rowCount:r.rowCount};}); }
  async transaction<T>(fn: (tx: Connection) => Promise<T>): Promise<T> {
    const metrics=requestMetrics(),waiting=performance.now();
    const c = await this.pool.connect();if(metrics)metrics.poolWaitMs+=performance.now()-waiting;
    // Capture each caller's scope before queueing. Context switches and their query must
    // stay together even when different actor scopes share a transaction concurrently.
    let tail:Promise<unknown>=Promise.resolve(),contextKey:string|undefined;
    const measured:Connection={query:<T=any>(sql:string,values?:any[])=>{
      const context=databaseContextValues(databaseContext()),key=JSON.stringify(context),rollback=/^\s*ROLLBACK\b/i.test(sql);
      const result=tail.then(async()=>{const started=performance.now();if(metrics)metrics.queryCount++;try{
        // An aborted transaction accepts only rollback, which also restores SET LOCAL values.
        if(!rollback&&key!==contextKey){await setDatabaseContext(c,context);contextKey=key;}
        const r=await c.query(sql,values);if(rollback)contextKey=undefined;return r as unknown as {rows:T[];rowCount:number|null};
      }catch(e){contextKey=undefined;throw e;}finally{if(metrics)metrics.databaseMs+=performance.now()-started;}});
      tail=result.catch(()=>{});return result;
    }};
    try { await c.query('BEGIN'); const result = await fn(measured); await tail; await c.query('COMMIT'); return result; }
    catch (e) { await tail; await c.query('ROLLBACK'); throw e; } finally { c.release(); }
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
