// P10: print the experienced-speed summary for the last days (default 7). Usage: npm run ux:report -- 14
import {runtimeConnection} from '../src/db/runtime-connection.js';
import {Postgres} from '../src/db/database.js';
import {uxTimingSummary} from '../src/server/ux-timing.js';
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required');
const db=new Postgres(runtimeConnection(process.env,'web'));
try{console.table(await uxTimingSummary(db,Number(process.argv[2]??7)));}finally{await db.close();}
