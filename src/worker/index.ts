import {dispatchAppActions,processAppAction} from '../app-services/service.js';
import {automationTick,isolatedAutomationStep} from '../automations/worker.js';
import {deliverAutomationEvent} from '../automations/events.js';
import {automationsEnabled} from '../automations/service.js';
import {processServiceJob,applyDeliveryEvents} from '../app-services/jobs.js';
import {runtimeConnection} from '../db/runtime-connection.js';
import {withDatabaseContext} from '../db/context.js';
import {enforceRuntimeRole} from '../db/runtime-policy.js';
import {runFoundation,dispatchSchedules,foundationMaintenance} from '../foundation/worker.js';
import {maintenance} from './maintenance.js';
import { Postgres } from '../db/database.js';
import { isolatedExtract } from './isolated.js';
import { runAutomation } from './automations.js';
import { runOne } from './processor.js';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required');
const db=new Postgres(runtimeConnection(process.env,'worker'));let stopping=false,lastMaintenance=0;
// Optional automations have their own bounded pool and loop. They never occupy
// app request connections or stop the existing action/email workers on failure.
const automationDb=new Postgres(runtimeConnection(process.env,'worker'),2,5000);
await enforceRuntimeRole(db);
console.log(JSON.stringify({event:'app_services_ready',emailConfigured:!!(process.env.APP_NOTIFICATION_RESEND_API_KEY??process.env.RESEND_API_KEY),maxConnectorSeconds:1800,automationsEnabled:automationsEnabled(),automationSigningStorageConfigured:!!process.env.CONNECTOR_ENCRYPTION_KEY}));
const workerId=(process.env.RENDER_INSTANCE_ID??'worker-'+process.pid).slice(0,200);
const beat=async(success=false,error=false)=>{await db.query('INSERT INTO worker_health(id,heartbeat_at,last_success_at,last_error_at) VALUES($1,now(),CASE WHEN $2 THEN now() END,CASE WHEN $3 THEN now() END) ON CONFLICT(id) DO UPDATE SET heartbeat_at=now(),last_success_at=CASE WHEN $2 THEN now() ELSE worker_health.last_success_at END,last_error_at=CASE WHEN $3 THEN now() ELSE worker_health.last_error_at END',[workerId,success,error]);};
let beating=false;const heartbeat=setInterval(()=>{if(beating)return;beating=true;void beat().catch(()=>console.error(JSON.stringify({event:'worker_heartbeat_failed'}))).finally(()=>{beating=false;});},15000);heartbeat.unref();
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{stopping=true;});
const externalController=new AbortController();
const externalWorkers=Array.from({length:3},(_,index)=>withDatabaseContext({service:'worker'},async()=>{while(!stopping){try{if(!await processServiceJob(db,{signal:externalController.signal,...(index===0?{kind:'email' as const}:{})}))await new Promise(r=>setTimeout(r,1000));}catch{console.error(JSON.stringify({event:'app_service_worker_failed'}));await new Promise(r=>setTimeout(r,2000));}}}));
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>externalController.abort());
const automationWorker=withDatabaseContext({service:'worker'},async()=>{while(!stopping){if(automationsEnabled()){const report=(event:string)=>console.error(JSON.stringify({event}));await isolatedAutomationStep(()=>automationTick(automationDb,report),report);await isolatedAutomationStep(()=>deliverAutomationEvent(automationDb),report);}await new Promise(r=>setTimeout(r,2000));}});
await withDatabaseContext({service:'worker'},async()=>{while(!stopping){try{if(Date.now()-lastMaintenance>3600000){await maintenance(db);await foundationMaintenance(db);lastMaintenance=Date.now();await db.query("DELETE FROM worker_health WHERE heartbeat_at<now()-interval '7 days'");}const appScheduled=await dispatchAppActions(db);const appExecuted=await processAppAction(db);await applyDeliveryEvents(db);const processed=await runOne(db,isolatedExtract);const scheduled=await runAutomation(db);const dispatched=await dispatchSchedules(db);const executed=await runFoundation(db);await beat(true);if(!processed&&!scheduled&&!dispatched&&!executed&&!appScheduled&&!appExecuted)await new Promise(r=>setTimeout(r,2000));}catch{await beat(false,true).catch(()=>{});console.error(JSON.stringify({event:'worker_failed',time:new Date().toISOString()}));await new Promise(r=>setTimeout(r,5000));}}
});
await Promise.allSettled([...externalWorkers,automationWorker]);clearInterval(heartbeat);await Promise.all([db.close(),automationDb.close()]);
