import {runFoundation,dispatchSchedules,foundationMaintenance} from '../foundation/worker.js';
import {maintenance} from './maintenance.js';
import { Postgres } from '../db/database.js';
import { isolatedExtract } from './isolated.js';
import { runAutomation } from './automations.js';
import { runOne } from './processor.js';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required');
const db=new Postgres(process.env.DATABASE_URL);let stopping=false,lastMaintenance=0;
const workerId=(process.env.RENDER_INSTANCE_ID??'worker-'+process.pid).slice(0,200);
const beat=async(success=false,error=false)=>{await db.query('INSERT INTO worker_health(id,heartbeat_at,last_success_at,last_error_at) VALUES($1,now(),CASE WHEN $2 THEN now() END,CASE WHEN $3 THEN now() END) ON CONFLICT(id) DO UPDATE SET heartbeat_at=now(),last_success_at=CASE WHEN $2 THEN now() ELSE worker_health.last_success_at END,last_error_at=CASE WHEN $3 THEN now() ELSE worker_health.last_error_at END',[workerId,success,error]);};
let beating=false;const heartbeat=setInterval(()=>{if(beating)return;beating=true;void beat().catch(()=>console.error(JSON.stringify({event:'worker_heartbeat_failed'}))).finally(()=>{beating=false;});},15000);heartbeat.unref();
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{stopping=true;});
while(!stopping){try{if(Date.now()-lastMaintenance>3600000){await maintenance(db);await foundationMaintenance(db);lastMaintenance=Date.now();await db.query("DELETE FROM worker_health WHERE heartbeat_at<now()-interval '7 days'");}const processed=await runOne(db,isolatedExtract);const scheduled=await runAutomation(db);const dispatched=await dispatchSchedules(db);const executed=await runFoundation(db);await beat(true);if(!processed&&!scheduled&&!dispatched&&!executed)await new Promise(r=>setTimeout(r,2000));}catch{await beat(false,true).catch(()=>{});console.error(JSON.stringify({event:'worker_failed',time:new Date().toISOString()}));await new Promise(r=>setTimeout(r,5000));}}
clearInterval(heartbeat);await db.close();
