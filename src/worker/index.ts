import { Postgres } from '../db/database.js';
import { isolatedExtract } from './isolated.js';
import { runAutomation } from './automations.js';
import { runOne } from './processor.js';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required');
const db=new Postgres(process.env.DATABASE_URL);let stopping=false;
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{stopping=true;});
while(!stopping){try{const processed=await runOne(db,isolatedExtract);const scheduled=await runAutomation(db);if(!processed&&!scheduled)await new Promise(r=>setTimeout(r,2000));}catch{console.error(JSON.stringify({event:'worker_failed',time:new Date().toISOString()}));await new Promise(r=>setTimeout(r,5000));}}
await db.close();
