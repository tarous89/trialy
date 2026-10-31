import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {withActor,setDatabaseContext} from '../src/db/context.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {Connectors,filterResponse} from '../src/connectors/service.js';
import {connectorConfig,connectorOperation} from '../src/connectors/schema.js';
import {connectorVault} from '../src/connectors/secrets.js';
import {publicAddress,resolveDestination,createHttpsTransport,type OutboundRequest,type ConnectorTransport} from '../src/connectors/transport.js';
import type {Actor} from '../src/shared/schema.js';

test('connector destinations reject private/reserved IPs, DNS mixtures, credentials and ports',async()=>{
 for(const address of ['127.0.0.1','0.0.0.0','10.1.2.3','100.64.1.2','169.254.169.254','172.31.1.1','192.168.1.2','192.0.2.1','198.18.0.1','224.1.2.3','255.255.255.255','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2001:db8::1','2002:7f00:1::1','64:ff9b::7f00:1','3fff::1'])assert.equal(publicAddress(address),false,address);
 for(const address of ['8.8.8.8','1.1.1.1','2606:4700::1111'])assert.equal(publicAddress(address),true,address);
 const dns=(async()=>[{address:'8.8.8.8',family:4}]) as any;
 assert.equal((await resolveDestination('https://example.invalid/path',dns)).address.address,'8.8.8.8');
 for(const url of ['http://example.invalid','https://me:password@example.invalid','https://example.invalid:444','https://127.1','https://0x7f000001','https://[::1]','https://localhost','https://example.local'])await assert.rejects(resolveDestination(url,dns));
 await assert.rejects(resolveDestination('https://example.invalid',(async()=>[{address:'8.8.8.8',family:4},{address:'10.0.0.1',family:4}]) as any));
});
test('connector credentials are encrypted, bound to the connection and rotatable',()=>{
 const key=randomBytes(32).toString('base64'),vault=connectorVault(key),sealed=vault.seal('synthetic-secret','workspace:connection');assert.ok(!sealed.includes('synthetic-secret'));assert.equal(vault.open(sealed,'workspace:connection'),'synthetic-secret');assert.throws(()=>vault.open(sealed,'workspace:other'));
 const rotated=connectorVault(randomBytes(32).toString('base64'),key);assert.equal(rotated.open(sealed,'workspace:connection'),'synthetic-secret');assert.throws(()=>connectorVault(undefined).seal('x','x'));assert.throws(()=>connectorVault('short'));
});
test('HTTPS broker pins DNS, refuses redirects/oversize data and rechecks authorization before opening a socket',async()=>{
 let sockets=0,resolutions=0,status=200,payload='{"value":"ok"}';
 const transport=createHttpsTransport({lookup:(async()=>{resolutions++;return [{address:'8.8.8.8',family:4}];}) as any,request:((_url:any,options:any,callback:any)=>{
  sockets++;assert.equal(options.agent,false);options.lookup('example.invalid',{all:true},(error:any,addresses:any)=>{assert.equal(error,null);assert.deepEqual(addresses,[{address:'8.8.8.8',family:4}]);});
  const req=new EventEmitter() as any;req.write=()=>{};req.destroy=(error:any)=>{req.emit('error',error);req.emit('close');};
  req.end=()=>queueMicrotask(()=>{const res=new EventEmitter() as any;res.statusCode=status;res.headers=status===302?{location:'https://127.0.0.1'}:{};res.destroy=()=>req.emit('close');callback(res);res.emit('data',Buffer.from(payload));res.emit('end');req.emit('close');});return req;
 }) as any});
 const input={url:'https://example.invalid/',method:'GET',headers:{authorization:'Bearer synthetic-secret'}};
 assert.equal((await transport(input)).status,200);assert.equal(resolutions,1);assert.equal(sockets,1);
 status=302;await assert.rejects(transport(input),/redirect/);assert.equal(sockets,2); // Never followed.
 status=200;payload='x'.repeat(65537);await assert.rejects(transport(input),/64 KiB/);
 const before=sockets;await assert.rejects(transport({...input,authorize:async()=>{throw Error('revoked');}}),/revoked/);assert.equal(sockets,before);
});
test('connector response filtering excludes undeclared fields and reflected credentials',()=>{
 const operation=connectorOperation.parse({id:'get',name:'Get',method:'GET',path:'/',effect:'read',response:{fields:['value']},users:[],apps:[]});
 assert.deepEqual(filterResponse('{"value":"synthetic-secret","private":"omit"}',operation,'synthetic-secret'),{value:'[redacted]'});
 assert.throws(()=>filterResponse('"scalar"',operation,''));assert.throws(()=>filterResponse('x'.repeat(65537),operation,''));
});
test('connector policy, exact reviews, idempotency, data writes, quotas and revocation',async t=>{
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(s,v)=>pg.query(s,v) as any,transaction:f=>pg.transaction(tx=>f(tx as Connection)),close:()=>pg.close()};
 try{
  const a:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...a,origin:'ai'},other:Actor={userId:randomUUID(),origin:'human'},s=new Service(db),f=new WorkspaceFoundation(db);
  for(const actor of [a,other])await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'synthetic@example.invalid','Synthetic']);
  const w=await s.createWorkspace(a,'Connector tests');await s.setAi(a,w.id,true);await s.share(a,w.id,other.userId,'editor',[],null,true);
  const save=async(op:any)=>{const p=await s.preview(a,w.id,op);return s.commit(a,p.id,p.digest);};
  const table=(await save({kind:'create_type',name:'Companies',fields:[{key:'name',name:'Name',kind:'text'},{key:'private',name:'Private',kind:'text',ai:false}]})).objects[0].id;
  const record=(await save({kind:'create_record',typeId:table,data:{name:'Acme',private:'Restricted'}})).objects[0].id;
  const appDraft=await f.preview(a,w.id,{kind:'save_component',content:{name:'Company app',format:'frontend-js',sourceAccess:'bindings',source:"return {html:'<p>Company</p>'};",bindings:[{typeId:table,fields:['name']}]}}),app=await f.confirm(a,w.id,appDraft.id,appDraft.digest);
  const sent:OutboundRequest[]=[];let response='{"value":"Verified","private":"Not returned"}',reject=false;
  const transport:ConnectorTransport=async input=>{sent.push(input);if(reject)throw Error('Provider failed with sensitive detail');return {status:200,body:response,bytes:Buffer.byteLength(response),durationMs:5};};
  const c=new Connectors(db,(tx,actor,workspace,appId)=>f.component(tx,actor,workspace,appId),{transport,vault:connectorVault(randomBytes(32).toString('base64'))});
  const operation={id:'lookup',name:'Lookup',method:'GET',path:'/lookup',effect:'read',parameters:[{name:'company',kind:'text',required:true}],mappings:[{parameter:'company',typeId:table,field:'name',recordIds:[record]}],response:{format:'json',fields:['value']},users:[a.userId],apps:[app.id],aiEnabled:true,destinations:[{typeId:table,fields:['name']}]};
  const config=connectorConfig.parse({name:'Synthetic provider',baseUrl:'https://example.invalid',auth:{kind:'bearer'},operations:[operation]});
  const prepared=await c.prepare(ai,w.id,{config});await assert.rejects(c.confirmConfig(ai,w.id,prepared.reviewId,prepared.digest),/ChatGPT cannot approve/);
  const connection=await c.confirmConfig(a,w.id,prepared.reviewId,prepared.digest);assert.deepEqual(await c.confirmConfig(a,w.id,prepared.reviewId,prepared.digest),connection);
  const call=()=>({connectionId:connection.id,operation:'lookup',appId:app.id,appVersion:0,requestKey:randomUUID(),records:{company:record}});
  await t.test('credential entry is human-only and never appears in configuration',async()=>{
   await assert.rejects(c.replaceSecret(ai,w.id,connection.id,{expectedVersion:0,secret:'synthetic-secret'}));
   await assert.rejects(c.call(a,w.id,call()),/credential/);
   await c.replaceSecret(a,w.id,connection.id,{expectedVersion:0,secret:'synthetic-secret'});
   const metadata=await c.read(ai,w.id,connection.id);assert.equal(metadata.credentialStatus,'configured');assert.ok(!JSON.stringify(metadata).includes('synthetic-secret'));
   assert.ok(!(await db.query('SELECT sealed FROM connector_credentials')).rows[0].sealed.includes('synthetic-secret'));
  });
  let first:any;
  await t.test('mapped reads disclose only declared fields and reuse completed receipts',async()=>{
   const input=call();first=await c.call(ai,w.id,input);assert.equal(first.status,'succeeded');assert.deepEqual(first.result,{value:'Verified'});
   assert.equal(sent.length,1);assert.equal(sent[0].url,'https://example.invalid/lookup?company=Acme');assert.equal(sent[0].headers.authorization,'Bearer synthetic-secret');
   assert.equal((await c.call(ai,w.id,input) as any).replayed,true);assert.equal(sent.length,1);
   await assert.rejects(c.call(a,w.id,{...call(),parameters:{company:'Spoofed'}}),/overridden/);
   await assert.rejects(c.call(other,w.id,call()),/cannot use/);
   await assert.rejects(c.call(a,w.id,{...call(),records:{company:randomUUID()}}),/scope/);
   await assert.rejects(c.call(a,w.id,{...call(),appId:randomUUID()}));
  });
  await t.test('saving returned data goes through the existing record preview and approval',async()=>{
   const change=await c.responseChange(a,w.id,first.id,{typeId:table,recordId:record,expectedVersion:0,mapping:{name:'value'}});
   const preview=await f.preview(a,w.id,change);assert.equal((await f.record(db,a,w.id,record)).data.name,'Acme');await f.confirm(a,w.id,preview.id,preview.digest);assert.equal((await f.record(db,a,w.id,record)).data.name,'Verified');
   await assert.rejects(c.responseChange(a,w.id,first.id,{typeId:table,recordId:record,expectedVersion:1,mapping:{private:'value'}}),/fields/);
  });
  await t.test('unmapped GET data and writes require exact human review',async()=>{
   const config2=connectorConfig.parse({...config,operations:[{...operation,parameters:[{name:'company',kind:'text',required:true},{name:'note',kind:'text'}]}, {...operation,id:'send',method:'POST',effect:'write'}]});
   const p=await c.prepare(a,w.id,{connectionId:connection.id,expectedVersion:1,config:config2});await c.confirmConfig(a,w.id,p.reviewId,p.digest);
   const before=sent.length,read=await c.call(ai,w.id,{...call(),parameters:{note:'Review this exact text'}});assert.equal(read.status,'review_required');assert.equal(sent.length,before);
   assert.ok(JSON.stringify(await c.readReview(a,w.id,(read as any).reviewId)).includes('Review+this+exact+text'));
   await assert.rejects(c.confirmInvocation(ai,w.id,(read as any).reviewId,(read as any).digest));
   assert.equal((await c.confirmInvocation(a,w.id,(read as any).reviewId,(read as any).digest)).status,'succeeded');
   const input={...call(),operation:'send'},write:any=await c.call(ai,w.id,input);assert.equal(write.status,'review_required');assert.equal(sent.length,before+1);
   const result=await c.confirmInvocation(a,w.id,write.reviewId,write.digest);assert.equal(result.status,'succeeded');await c.confirmInvocation(a,w.id,write.reviewId,write.digest);assert.equal(sent.length,before+2);
   reject=true;const uncertain:any=await c.call(a,w.id,{...call(),operation:'send'});assert.equal((await c.confirmInvocation(a,w.id,uncertain.reviewId,uncertain.digest)).status,'unknown');await c.confirmInvocation(a,w.id,uncertain.reviewId,uncertain.digest);assert.equal(sent.length,before+3);reject=false;
  });
  await t.test('changed records invalidate pending reviews and disabled connectors block use',async()=>{
   const pending:any=await c.call(a,w.id,{...call(),operation:'send'});
   await save({kind:'update_record',recordId:record,expectedVersion:1,data:{name:'Changed'}});
   const before=sent.length;await assert.rejects(c.confirmInvocation(a,w.id,pending.reviewId,pending.digest),/changed/);assert.equal(sent.length,before);
   const activity=await c.activity(a,w.id,connection.id);assert.equal(Number(activity.totals.calls),sent.length);assert.ok(!JSON.stringify(activity).includes('synthetic-secret'));
   await c.disable(a,w.id,connection.id,2);await assert.rejects(c.call(a,w.id,call()),/disabled/);assert.equal(sent.length,before);
  });
  await t.test('connection quotas and permissions apply even to owner-managed credentials',async()=>{
   const p=await c.prepare(a,w.id,{config:{...config,auth:{kind:'none'},requestsPerMinute:1,requestsPerAppPerMinute:1}}),second=await c.confirmConfig(a,w.id,p.reviewId,p.digest);
   await c.call(a,w.id,{...call(),connectionId:second.id});const before=sent.length;await assert.rejects(c.call(a,w.id,{...call(),connectionId:second.id}),/limit/);assert.equal(sent.length,before);
   const crashedInput={...call(),connectionId:second.id},crashReview=await c.prepareCall(a,w.id,crashedInput),exact=await c.readReview(a,w.id,crashReview.reviewId),crashedId=randomUUID();
   await db.query("INSERT INTO connector_invocations(id,workspace_id,connection_id,user_id,app_id,operation,request_key,digest,status,effect,created_at,deadline_at) VALUES($1,$2,$3,$4,$5,'lookup',$6,$7,'running','read',now()-interval '1 minute',now()-interval '30 seconds')",[crashedId,w.id,second.id,a.userId,app.id,crashedInput.requestKey,exact.body.digest]);
   assert.equal((await c.activity(a,w.id,second.id)).rows.find(r=>r.id===crashedId)?.status,'unknown');
   assert.equal((await c.call(a,w.id,crashedInput)).status,'unknown');assert.equal(sent.length,before);
   const privateConfig={...config,auth:{kind:'none'},operations:[{...operation,mappings:[{parameter:'company',typeId:table,field:'private'}]}]};
   const q=await c.prepare(a,w.id,{config:privateConfig}),third=await c.confirmConfig(a,w.id,q.reviewId,q.digest);await assert.rejects(c.call(a,w.id,{...call(),connectionId:third.id}),/not bound/);assert.equal(sent.length,before);
   const budget=(await save({kind:'create_type',name:'Budget',fields:[{key:'hours',name:'Hours',kind:'number'},{key:'rate',name:'Rate',kind:'number'},{key:'cost',name:'Cost',kind:'number',formula:{operator:'product',fields:['hours','rate']}}]})).objects[0].id;
   const budgetRecord=(await save({kind:'create_record',typeId:budget,data:{hours:2,rate:50}})).objects[0].id;
   const appReview=await f.preview(a,w.id,{kind:'save_component',content:{name:'Budget app',format:'frontend-js',sourceAccess:'bindings',source:"return {html:'<p>Budget</p>'};",bindings:[{typeId:budget,fields:['hours','rate','cost']}]}}),budgetApp=await f.confirm(a,w.id,appReview.id,appReview.digest);
   const derivedConfig={...config,auth:{kind:'none'},operations:[{...operation,apps:[budgetApp.id],parameters:[{name:'company',kind:'number',required:true}],mappings:[{parameter:'company',typeId:budget,field:'cost'}]}]};
   const derivedReview=await c.prepare(a,w.id,{config:derivedConfig}),derivedConnection=await c.confirmConfig(a,w.id,derivedReview.reviewId,derivedReview.digest);
   await assert.rejects(c.call(a,w.id,{...call(),appId:budgetApp.id,connectionId:derivedConnection.id,records:{company:budgetRecord}}),/Derived inputs/);assert.equal(sent.length,before);
   await assert.rejects(db.query("UPDATE connector_invocations SET result='{}' WHERE id=$1",[first.id]),/immutable/);
   await assert.rejects(db.query("UPDATE connector_reviews SET body='{}' WHERE id=$1",[prepared.reviewId]),/immutable/);
  });
  await t.test('restricted database role preserves tenant and review-owner isolation',async()=>{
   const stranger:Actor={userId:randomUUID(),origin:'human'};
   await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[stranger.userId,stranger.userId,'stranger@example.invalid','Stranger']);
   const otherWorkspace=await s.createWorkspace(stranger,'Separate tenant'),p=await c.prepare(stranger,otherWorkspace.id,{config:{...config,auth:{kind:'none'}}});await c.confirmConfig(stranger,otherWorkspace.id,p.reviewId,p.digest);
   await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
   const runtime:Database={query:(sql,v)=>runtime.transaction(tx=>tx.query(sql,v)),transaction:fn=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return fn(tx as Connection);}),close:async()=>{}};
   assert.equal((await runtime.query('SELECT id FROM connectors')).rows.length,0);
   await withActor(a,async()=>{
    assert.ok((await runtime.query('SELECT workspace_id FROM connectors')).rows.every(r=>r.workspace_id===w.id));
    const secure=new Connectors(runtime,(tx,actor,workspace,appId)=>f.component(tx,actor,workspace,appId));assert.equal((await secure.read(a,w.id,connection.id)).id,connection.id);
    await assert.rejects(secure.list(a,otherWorkspace.id));
   });
   await withActor(other,async()=>assert.equal((await runtime.query('SELECT id FROM connector_reviews')).rows.length,0));
   await withActor(stranger,async()=>assert.equal((await runtime.query('SELECT connection_id FROM connector_credentials')).rows.length,0));
  });
 }finally{await pg.close();}
});
