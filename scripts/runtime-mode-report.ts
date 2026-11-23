// L2.7 (loading speed): which installed apps run in the browser frame, which stay on server mode and why.
// Usage (owner, read-only): npm run apps:runtime-report
import {Postgres} from '../src/db/database.js';
import {runtimeModeReport} from '../src/workspace/runtime-mode-report.js';
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required');
const db=new Postgres(process.env.DATABASE_URL);
try{
 const report=await db.transaction(async tx=>{await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');return runtimeModeReport(tx);});
 console.log(JSON.stringify(report,null,2));
}finally{await db.close();}
