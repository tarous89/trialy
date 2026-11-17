import {requestMetrics,measureDatabaseQuery} from './metrics.js';
import {databaseContext,databaseContextValues,setDatabaseContext} from './context.js';
import pg from 'pg';
import {AsyncLocalStorage} from 'node:async_hooks';
import { readFile, readdir } from 'node:fs/promises';
export interface Connection { query<T = any>(sql: string, values?: any[]): Promise<{ rows: T[]; rowCount?: number | null }> }
export interface Database extends Connection { transaction<T>(fn: (tx: Connection) => Promise<T>): Promise<T>; close(): Promise<void> }
type Session={measured:Connection;driver:Connection;settle:()=>Promise<void>;release:(error?:unknown)=>void};
/** Per-request batching of consecutive standalone reads (N1). */
type ReadBatch={open?:Session;opening?:boolean;tail:Promise<unknown>;pending:number};
const readBatches=new AsyncLocalStorage<Map<Postgres,ReadBatch>>();
export const readBatchingEnabled=(env:NodeJS.ProcessEnv=process.env)=>env.DB_READ_BATCHING!=='false';
/**
 * Consecutive standalone queries made inside `fn` share one transaction instead of one each
 * (BEGIN, context and COMMIT once per burst rather than once per query).
 * - The transaction ends as soon as the request stops querying for one event-loop turn, so it is
 *   never held while app code, a connector, a file read or any other non-database work runs.
 * - Anything other than a plain SELECT is committed before its caller continues, exactly as before.
 * - A failed statement rolls back only itself; earlier reads were already returned.
 * - Explicit transactions are unchanged and never share the batch connection.
 * READ COMMITTED still gives every statement its own snapshot, and the security context is set
 * per transaction and re-set whenever the calling actor scope changes.
 */
export const withReadBatch=<T>(fn:()=>T):T=>readBatchingEnabled()&&!readBatches.getStore()?readBatches.run(new Map(),fn):fn();
const plainRead=(sql:string)=>/^\s*SELECT\b/i.test(sql)&&!/\bFOR\s+(NO\s+KEY\s+UPDATE|KEY\s+SHARE|UPDATE|SHARE)\b/i.test(sql)&&!/\b(pg_advisory\w*|nextval|setval|set_config|trialy_security\.\w+)\s*\(/i.test(sql);
export class Postgres implements Database {
  pool: pg.Pool;
  constructor(url: string, max=10, statementTimeout=0) { this.pool = new pg.Pool({ connectionString: url, max, connectionTimeoutMillis: 10000,statement_timeout:statementTimeout,lock_timeout:statementTimeout?Math.min(statementTimeout,1000):0 }); }
  async query<T = any>(sql: string, values: any[] = []) {
    const batch=this.batch();if(batch)return this.batched<T>(batch,sql,values);
    return this.transaction(async tx=>{const r=await tx.query<T>(sql,values);return {rows:r.rows,rowCount:r.rowCount};});
  }
  private batch(){const scope=readBatches.getStore();if(!scope)return undefined;let batch=scope.get(this);if(!batch){batch={tail:Promise.resolve(),pending:0};scope.set(this,batch);}return batch;}
  /** One pooled connection with BEGIN sent; callers finish it with COMMIT or ROLLBACK and release. */
  private async session():Promise<Session>{
    const metrics=requestMetrics(),waiting=performance.now();
    const c = await this.pool.connect();if(metrics)metrics.poolWaitMs+=performance.now()-waiting;
    const driver:Connection={query:async<T=any>(sql:string,values?:any[])=>{const r=await measureDatabaseQuery(metrics,()=>c.query(sql,values));return {rows:r.rows as T[],rowCount:r.rowCount};}};
    // Capture each caller's scope before queueing. Context switches and their query must
    // stay together even when different actor scopes share a transaction concurrently.
    let tail:Promise<unknown>=Promise.resolve(),contextKey:string|undefined;
    const measured:Connection={query:<T=any>(sql:string,values?:any[])=>{
      const context=databaseContextValues(databaseContext()),key=JSON.stringify(context),rollback=/^\s*ROLLBACK\b/i.test(sql);
      const result=tail.then(async()=>{const started=performance.now();if(metrics)metrics.queryCount++;try{
        // An aborted transaction accepts only rollback, which also restores SET LOCAL values.
        if(!rollback&&key!==contextKey){if(metrics)metrics.contextSets++;await setDatabaseContext(driver,context);contextKey=key;}
        const r=await driver.query(sql,values);if(rollback)contextKey=undefined;return r as unknown as {rows:T[];rowCount:number|null};
      }catch(e){contextKey=undefined;throw e;}finally{if(metrics)metrics.databaseMs+=performance.now()-started;}});
      tail=result.catch(()=>{});return result;
    }};
    let released=false;const release=(error?:unknown)=>{if(released)return;released=true;error?c.release(error as Error):c.release();};
    try { if(metrics)metrics.transactions++;await driver.query('BEGIN'); } catch (e) { release(e); throw e; }
    return {measured,driver,settle:async()=>{await tail;},release};
  }
  async transaction<T>(fn: (tx: Connection) => Promise<T>): Promise<T> {
    // Never hold the batch connection while waiting for another one.
    const batch=this.batch();if(batch){batch.pending++;try{await this.afterBatch(batch,()=>this.finish(batch));}finally{this.idle(batch);}}
    const s=await this.session();
    try { const result = await fn(s.measured); await s.settle(); await s.driver.query('COMMIT'); return result; }
    catch (e) { await s.settle(); await s.driver.query('ROLLBACK'); throw e; } finally { s.release(); }
  }
  private afterBatch<T>(batch:ReadBatch,step:()=>Promise<T>):Promise<T>{const result=batch.tail.then(step);batch.tail=result.catch(()=>{});return result;}
  private async finish(batch:ReadBatch,failed=false){
    const s=batch.open;if(!s)return;batch.open=undefined;
    try{await s.driver.query(failed?'ROLLBACK':'COMMIT');s.release();}catch(e){s.release(e);if(!failed)throw e;}
  }
  private idle(batch:ReadBatch){
    if(--batch.pending>0)return;
    // Wait one turn: a request reading in sequence issues its next query from the previous result.
    setImmediate(()=>{if(batch.pending===0&&batch.open)void this.afterBatch(batch,async()=>{if(batch.pending===0)await this.finish(batch);}).catch(()=>{console.error(JSON.stringify({event:'read_batch_commit_failed'}));});});
  }
  private batched<T>(batch:ReadBatch,sql:string,values:any[]){
    batch.pending++;
    const result=this.afterBatch(batch,async()=>{
      if(!batch.open)batch.open=await this.session();
      let r;try{r=await batch.open.measured.query<T>(sql,values);}catch(e){await this.finish(batch,true);throw e;}
      // Writes, locks and functions with effects are durable before the caller continues.
      if(!plainRead(sql))await this.finish(batch);
      return {rows:r.rows,rowCount:r.rowCount};
    });
    void result.then(()=>this.idle(batch),()=>this.idle(batch));
    return result;
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
