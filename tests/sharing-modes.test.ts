import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {exchangeMode} from '../src/domain/external-exchange.js';
import {sharingConfig} from '../src/app-services/sharing.js';

// Session 6, package 6.8 (X1, D7, D32): Publish, Collect and Disclose, one per workflow.
test('each exchange has one mode, derived from what it does; a public app link only publishes',()=>{
 assert.equal(exchangeMode({kind:'room'}),'disclose');
 assert.equal(exchangeMode({kind:'request',typeId:randomUUID(),fields:['price']}),'collect');
 assert.equal(exchangeMode({kind:'request',slots:[{key:'cda'}]}),'collect','requested files are a collection');
 assert.equal(exchangeMode({kind:'request'}),'disclose','documents only, no response: a disclosure');
 const base={appId:randomUUID(),appVersion:0,kind:'public',reviewedSource:true};
 assert.equal(sharingConfig.safeParse({...base,mode:'edit'}).success,false,'editing through a public link is removed');
 assert.equal(sharingConfig.safeParse({...base,mode:'view'}).success,true);
});

test('the migration gives every existing link, exchange and share one mode, makes public edit links read-only and refuses mixed configurations',async()=>{
 const pg=new PGlite();
 try{
  const files=(await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort(),at=files.indexOf('096_sharing_modes.sql');
  for(const file of files.slice(0,at))await pg.exec(await readFile('migrations/'+file,'utf8'));
  const user=randomUUID(),tenant=randomUUID(),w=randomUUID(),app=randomUUID(),principal=randomUUID(),project=randomUUID();
  await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[user,user,'o@example.invalid','Owner']);
  await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[principal,'public-app|x','p@public.invalid','Public']);
  await pg.query("INSERT INTO tenants(id,name) VALUES($1,'Org')",[tenant]);
  await pg.query("INSERT INTO workspaces(id,tenant_id,name,permission_rules) VALUES($1,$2,'Main',$3)",[w,tenant,JSON.stringify([{subject:principal,kind:'tool',resourceId:app,read:'allow',write:'allow'}])]);
  await pg.query("INSERT INTO workspace_nodes(id,workspace_id,kind,name) VALUES($1,$2,'project','P')",[project,w]).catch(()=>{});
  const comp=await pg.query("INSERT INTO workspace_components(id,workspace_id,project_id,name,format,source,created_by) VALUES($1,$2,$3,'App','text','x',$4) RETURNING id",[app,w,project,user]).then(()=>true).catch(()=>false);
  assert.ok(comp,'test app created');
  if(comp){
   await pg.query("INSERT INTO app_shares(id,workspace_id,app_id,app_version,owner_id,kind,token_hash,principal_id,config,expires_at) VALUES($1,$2,$3,0,$4,'public','t1',$5,$6,now()+interval '1 day')",[randomUUID(),w,app,user,principal,JSON.stringify({mode:'edit',bindings:[{typeId:randomUUID(),fields:['a'],writable:['a']}]})]);
  }
  await pg.exec(await readFile('migrations/'+files[at],'utf8'));
  for(const file of files.slice(at+1))await pg.exec(await readFile('migrations/'+file,'utf8'));
  if(comp){
   const share=(await pg.query<any>('SELECT mode,config FROM app_shares')).rows[0];
   assert.equal(share.mode,'publish');assert.equal(share.config.mode,'view');assert.deepEqual(share.config.bindings[0].writable,[]);
   const rules=(await pg.query<any>('SELECT permission_rules FROM workspaces WHERE id=$1',[w])).rows[0].permission_rules;
   assert.equal(rules[0].write,'deny','the public link can no longer write');
   await assert.rejects(pg.query("INSERT INTO app_shares(id,workspace_id,app_id,app_version,owner_id,kind,token_hash,principal_id,config,expires_at) VALUES($1,$2,$3,0,$4,'public','t2',$5,'{\"mode\":\"edit\"}',now()+interval '1 day')",[randomUUID(),w,app,user,principal]),/app_shares_one_mode/);
  }
  // The database refuses an exchange that mixes Collect and Disclose.
  await assert.rejects(pg.query("INSERT INTO exchange_groups(id,workspace_id,owner_id,title,sender_name,sender_company,gate,kind,mode,slots) VALUES($1,$2,$3,'Mixed','A','B','none','request','disclose','[{\"key\":\"x\",\"label\":\"X\"}]')",[randomUUID(),w,user]),/exchange_groups_one_mode/);
  const room=randomUUID();
  await pg.query("INSERT INTO exchange_groups(id,workspace_id,owner_id,title,sender_name,sender_company,gate,kind,documents,verify_email) VALUES($1,$2,$3,'Room','A','B','acknowledgement','room','[{\"versionId\":\"x\"}]',false)",[room,w,user]);
  const g=(await pg.query<any>('SELECT mode,verify_email FROM exchange_groups WHERE id=$1',[room])).rows[0];
  assert.deepEqual([g.mode,g.verify_email],['disclose',true],'confidential documents always ask for email verification');
 }finally{await pg.close();}
});
