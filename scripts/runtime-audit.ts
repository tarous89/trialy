import {Postgres} from '../src/db/database.js';
import {runtimeRoleAudit} from '../src/db/runtime-policy.js';
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required');
const db=new Postgres(process.env.DATABASE_URL);
try{const result=await runtimeRoleAudit(db);console.log(JSON.stringify(result,null,2));if(!result.restricted)process.exitCode=1;}finally{await db.close();}
