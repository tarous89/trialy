import { Postgres } from '../src/db/database.js';
import { upsertIdentity } from '../src/server/identity.js';
import { Service } from '../src/domain/service.js';
if(process.env.NODE_ENV==='production')throw new Error('Synthetic seeding disabled in production');
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required');
const db=new Postgres(process.env.DATABASE_URL);try{
 const userId=await upsertIdentity(db,'local','demo','demo@example.invalid','Demo user');const s=new Service(db);const a={userId,origin:'human' as const};
 if(!(await s.workspaces(a)).length){const w=await s.createWorkspace(a,'Synthetic study');const p=await s.preview(a,w.id,{kind:'install_template',template:'rfp-oversight'});await s.commit(a,p.id,p.digest);}
 console.log('Synthetic workspace ready; no external messages sent');
}finally{await db.close();}
