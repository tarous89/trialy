import {runFoundation,dispatchSchedules,foundationMaintenance} from '../foundation/worker.js';
import {maintenance} from './maintenance.js';
import { Postgres } from '../db/database.js';
import { isolatedExtract } from './isolated.js';
import { runAutomation } from './automations.js';
import { runOne } from './processor.js';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required');
const db=new Postgres(process.env.DATABASE_URL);let stopping=false,lastMaintenance=0;
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{stopping=true;});
while(!stopping){try{if(Date.now()-lastMaintenance>3600000){await maintenance(db);await foundationMaintenance(db);lastMaintenance=Date.now();}const processed=await runOne(db,isolatedExtract);const scheduled=await runAutomation(db);const dispatched=await dispatchSchedules(db);const executed=await runFoundation(db);if(!processed&&!scheduled&&!dispatched&&!executed)await new Promise(r=>setTimeout(r,2000));}catch{console.error(JSON.stringify({event:'worker_failed',time:new Date().toISOString()}));await new Promise(r=>setTimeout(r,5000));}}
await db.close();
