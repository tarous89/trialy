import {runtimeConnection} from '../src/db/runtime-connection.js';
import {Postgres} from '../src/db/database.js';
import {runtimeRoleAudit} from '../src/db/runtime-policy.js';
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required');
const db=new Postgres(runtimeConnection(process.env,process.env.TRIALY_RUNTIME_KIND==='worker'?'worker':'web'));
try{const result=await runtimeRoleAudit(db);console.log(JSON.stringify(result,null,2));if(!result.restricted)process.exitCode=1;}finally{await db.close();}
