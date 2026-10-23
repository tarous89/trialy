import type {Connection} from '../db/database.js';
import {access} from './permissions.js';
import {fail,type Actor} from '../shared/schema.js';
export async function activeProject(db:Connection,a:Actor,w:string,projectId:string){
 const policy=await access(db,a,w);let current:string|null=projectId;const seen=new Set<string>();
 while(current){if(seen.has(current))fail(409,'project_cycle','Invalid project hierarchy');seen.add(current);
  const node:any=(await db.query('SELECT * FROM workspace_nodes WHERE id=$1 AND workspace_id=$2',[current,w])).rows[0];
  if(!node||(current===projectId&&node.kind!=='project')||(policy.role!=='owner'&&node.allowed_users!==null&&!node.allowed_users.includes(a.userId))||(a.origin==='ai'&&!node.ai_enabled))fail(404,'not_found','Project unavailable');
  if(node.archived)fail(409,'project_archived','Project is archived');current=node.parent_id;
 }
}
