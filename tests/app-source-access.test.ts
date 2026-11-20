import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {Service} from '../src/domain/service.js';
import {catalogBody} from '../src/workspace/catalog-source.js';
import type {Database,Connection} from '../src/db/database.js';
import type {Actor} from '../src/shared/schema.js';

/* App source access (owner decision, 15 November 2026):
 * - the workspace owner and the owner's own assistant have full access;
 * - unchanged approved catalog code can be opened and run by anyone allowed to use the app, and saving it
 *   (install, layout) is not a code change;
 * - changing code needs full access, so members with hidden documents or fields (or their assistants) cannot.
 * Reads made by running the app stay checked per request against the caller's own permissions. */
async function setup(){
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const owner:Actor={userId:randomUUID(),origin:'human'},member:Actor={userId:randomUUID(),origin:'human'};
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$3)',[owner.userId,'owner@example.invalid','Owner']);
 await db.query('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$3)',[member.userId,'member@example.invalid','Member']);
 const f=new WorkspaceFoundation(db),s=new Service(db),w=(await s.createWorkspace(owner,'Source access')).id;
 const tenant=(await db.query('SELECT tenant_id FROM workspaces WHERE id=$1',[w])).rows[0].tenant_id;
 await db.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'editor')",[tenant,member.userId]);
 await db.query("INSERT INTO workspace_access(workspace_id,user_id,role,ai_enabled) VALUES($1,$2,'editor',true)",[w,member.userId]);
 const p=await s.preview(owner,w,{kind:'create_type',name:'Deals',fields:[{key:'name',name:'Name',kind:'text',required:true,ai:true},{key:'secret',name:'Secret',kind:'text',ai:false}]});
 const typeId=(await s.commit(owner,p.id,p.digest)).objects[0].id as string;
 const r=await s.preview(owner,w,{kind:'create_record',typeId,data:{name:'Alpha',secret:'S3CRET-VALUE'}});await s.commit(owner,r.id,r.digest);
 const change=async(a:Actor,op:any)=>{let pv=await f.preview(a,w,op);if(pv.reviewState==='draft')pv=(await f.finalizeAppPreview(a,w,pv.id,pv.digest)).preview;return f.confirm({...a,origin:'human'},w,pv.id,pv.digest);};
 return {pg,db,f,s,w,owner,member,typeId,change};
}
const body=(typeId:string,label='Deals')=>`const T=${JSON.stringify(typeId)};
const rows=tools.call('records.read',{typeId:T,limit:50,offset:0}).rows;
return {html:'<h1>${label}</h1><ul>'+rows.map(r=>'<li>'+Object.values(r.data).join(' | ')+'</li>').join('')+'</ul>',state:input.state};`;
const wrap=(code:string,heading='Deals',typeId='')=>`const templateConfiguration=${JSON.stringify({heading})};\nconst templateBindings=${JSON.stringify([{typeId,fields:['name']}])};\n${code}`;
const content=(source:string,typeId:string)=>({name:'Deals app',format:'frontend-js',source,sourceAccess:'workspace',manifest:{version:1,scope:'workspace',fields:[{id:'name',typeId,field:'name',schemaVersion:0,kind:'text',mode:'read'}]},bindings:[{typeId,fields:['name']}]});
const run=(x:any,a:Actor,appId:string,version:number)=>x.f.runFrontend(a,x.w,{componentId:appId,expectedVersion:version,state:null,event:{kind:'open'}});

test('the owner and the owner\'s assistant can run custom code; reads stay checked per request',async()=>{
 const x=await setup();
 try{
  const saved=await x.change(x.owner,{kind:'save_component',projectId:null,content:content(body(x.typeId),x.typeId)});
  const version=(await x.f.component(x.db,x.owner,x.w,saved.id)).version;
  const ownerAi:Actor={...x.owner,origin:'ai'};
  const out=await run(x,ownerAi,saved.id,version);
  assert.match(out.html,/Alpha/);assert.doesNotMatch(out.html,/S3CRET/,'a field hidden from assistants is never read by running the app');
  // The owner's assistant may also change code (the owner has full access).
  await x.change(ownerAi,{kind:'save_component',componentId:saved.id,expectedVersion:version,projectId:null,content:content(body(x.typeId,'Deals v2'),x.typeId)});
  // A member's assistant without full access (a field elsewhere is hidden from assistants) cannot open custom code.
  const memberAi:Actor={...x.member,origin:'ai'};
  await assert.rejects(()=>x.f.component(x.db,memberAi,x.w,saved.id),/requires access to every workspace field/);
 }finally{await x.pg.close();}
});

test('unchanged catalog code runs for anyone allowed to use the app; changing it needs full access',async()=>{
 const x=await setup();
 try{
  const code=body(x.typeId);
  await x.db.query("INSERT INTO app_template_catalog(template_id,version,status,digest,payload) VALUES('test.deals','1.0.0','approved',$1,$2)",['0'.repeat(64),JSON.stringify({id:'test.deals',version:'1.0.0',source:code})]);
  assert.equal(catalogBody(wrap(code,'Deals',x.typeId)),code);
  const saved=await x.change(x.owner,{kind:'save_component',projectId:null,content:content(wrap(code,'Deals',x.typeId),x.typeId)});
  const version=(await x.f.component(x.db,x.owner,x.w,saved.id)).version;
  const memberAi:Actor={...x.member,origin:'ai'};
  const out=await run(x,memberAi,saved.id,version);
  assert.match(out.html,/Alpha/);assert.doesNotMatch(out.html,/S3CRET/);
  // Saving the same catalog code with only its configuration changed (as a layout review does) is not a code change,
  // but it is a settings change: only an owner of the app may make it (A3, R4).
  const relabel={kind:'save_component',componentId:saved.id,expectedVersion:version,projectId:null,content:content(wrap(code,'Pipeline',x.typeId),x.typeId)};
  await assert.rejects(()=>x.change(memberAi,relabel),/owner of this app/);
  const relabelled=await x.change(x.owner,relabel);
  const v2=(await x.f.component(x.db,x.owner,x.w,relabelled.id)).version;
  // Changing the code itself is refused for a member's assistant without full access.
  await assert.rejects(()=>x.f.preview(memberAi,x.w,{kind:'save_component',componentId:saved.id,expectedVersion:v2,projectId:null,content:content(wrap(code+'\n// changed','Pipeline',x.typeId),x.typeId)}),/Changing an app's code needs full access/);
  // The member themself sees every field, but changing an app's code is for its owners (A3).
  const recode={kind:'save_component',componentId:saved.id,expectedVersion:v2,projectId:null,content:content(wrap(code+'\n// changed','Pipeline',x.typeId),x.typeId)};
  await assert.rejects(()=>x.change(x.member,recode),/owner of this app/);
  await x.change(x.owner,recode);
  // Once changed, it is custom code: the member's assistant can no longer open it.
  await assert.rejects(()=>x.f.component(x.db,memberAi,x.w,saved.id),/requires access to every workspace field/);
 }finally{await x.pg.close();}
});
