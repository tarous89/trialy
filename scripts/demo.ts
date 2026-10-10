// Synthetic-only local harness. Production uses PostgreSQL and real OIDC in src/server/index.ts.
import express from 'express';
import { mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import type { Database, Connection } from '../src/db/database.js';
import { migrate } from '../src/db/database.js';
import { Service } from '../src/domain/service.js';
import { baseApp, addApi, errors } from '../src/server/app.js';
import { runOne } from '../src/worker/processor.js';
import { isolatedExtract } from '../src/worker/isolated.js';
import { runAutomation } from '../src/worker/automations.js';
if(process.env.NODE_ENV==='production')throw new Error('Local demo is disabled in production');
process.env.LOCAL_DEMO='false';
await mkdir('.data',{recursive:true});
const pg=new PGlite('.data/demo');
const db:Database={query:(sql,v)=>pg.query(sql,v) as any,transaction:fn=>pg.transaction(tx=>fn({query:async(sql:string,v?:any[])=>{if(!v){const results=await tx.exec(sql);return results.at(-1)??{rows:[]};}return tx.query(sql,v);}} as Connection)),close:()=>pg.close()};
await migrate(db);const s=new Service(db);const actor={userId:'00000000-0000-4000-8000-000000000001',origin:'human' as const};
await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[actor.userId,'local-demo','demo@example.invalid','Local demo']);
if(!(await s.workspaces(actor)).length){const w=await s.createWorkspace(actor,'Demo · Phase II oncology');const p=await s.preview(actor,w.id,{kind:'install_template',template:'rfp-oversight'});await s.commit(actor,p.id,p.digest);
 const types=await s.types(actor,w.id),cro=types.find(t=>t.name==='CROs');for(const name of ['Example Research Partners','Sample Clinical Group']){const p=await s.preview(actor,w.id,{kind:'create_record',typeId:cro.id,data:{name,services:'Full-service clinical operations',experience:'Synthetic oncology example',contact:'demo@example.invalid'}});await s.commit(actor,p.id,p.digest);}
}
const csrf=randomBytes(32).toString('hex');const app=baseApp();
addApi(app,s,(req,res,next)=>{if(!['GET','HEAD'].includes(req.method)&&req.get('x-csrf-token')!==csrf){res.status(403).json({message:'Refresh this local demo before saving'});return;}req.actor=actor;req.session={csrf} as any;next();});
app.use(express.static('dist/web'));app.get('/{*path}',(_req,res)=>res.sendFile('index.html',{root:'dist/web'}));app.use(errors);
let running=false;const tick=setInterval(()=>{if(running)return;running=true;void (async()=>{try{await runOne(db,isolatedExtract);await runAutomation(db);}catch{console.error('Local worker run failed');}finally{running=false;}})();},1500);
const server=app.listen(4317,'127.0.0.1',()=>console.log('Synthetic local demo: http://127.0.0.1:4317 (no real customer data)'));
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>{clearInterval(tick);server.close(()=>{void db.close().then(()=>process.exit(0));});});
