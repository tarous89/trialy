import {Postgres} from '../src/db/database.js';
import {syncTemplateCatalog} from '../src/workspace/template-catalog.js';
const url=process.env.MIGRATION_DATABASE_URL;
if(!url)throw Error('MIGRATION_DATABASE_URL is required; catalog publishing uses the operator connection');
const db=new Postgres(url);
try{
 const [action,id,version]=process.argv.slice(2);
 if(action==='sync')await syncTemplateCatalog(db);
 else if(action==='list')console.log(JSON.stringify((await db.query('SELECT template_id,version,status,digest FROM app_template_catalog ORDER BY template_id,version')).rows,null,2));
 else if(['approved','draft'].includes(action)&&id&&version){
  const r=await db.query('UPDATE app_template_catalog SET status=$3,updated_at=now() WHERE template_id=$1 AND version=$2 RETURNING template_id,version,status',[id,version,action]);
  if(!r.rows.length)throw Error('Template version not found');console.log(r.rows[0]);
 }else throw Error('Usage: template-catalog.ts sync | list | approved|draft TEMPLATE_ID VERSION');
}finally{await db.close();}
