import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {AsyncLocalStorage} from 'node:async_hooks';
import {PGlite} from '@electric-sql/pglite';
import request from 'supertest';
import {withActor,setDatabaseContext} from '../src/db/context.js';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {baseApp,errors} from '../src/server/app.js';
import {addExternalExchange} from '../src/server/external-exchange.js';
import {addWorkspaceMcp} from '../src/server/workspace-foundation.js';
import {checksum} from '../src/domain/evidence.js';
import {listExchanges,prepareExchangeEmailBatch,dispatchExchangeNotifications,listExchangeNotifications,sweepExchangeDeadlines} from '../src/domain/external-exchange.js';
import {listExchangeQuestions,syncExchangeTracking,runExchangeDigests,sweepExchangeRooms} from '../src/domain/exchange-rooms.js';
import {deliverExchangeEmails,FROM_ADDRESS} from '../src/app-services/exchange-email.js';
import type {Actor} from '../src/shared/schema.js';

// docs/product/EXTERNAL_EXCHANGE.md §5 (room extension) acceptance criteria 1–8, under the runtime role and row security.
process.env.EXCHANGE_EXPOSE_CODES='true';
test('Exchange rooms: no deadline, levels never leak, signed CDA per level, views, versions in place, tracked tables, Q&A and room emails',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());for(const n of (await readdir('migrations')).filter(x=>x.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+n,'utf8'));await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();
 const db:Database={query:async(q,v)=>storage.getStore()?.query(q,v)??db.transaction(tx=>tx.query(q,v)),transaction:async fn=>{const current=storage.getStore();if(current)return fn(current);return pg.transaction(async raw=>{await raw.exec('SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(q,v)=>{await setDatabaseContext(raw as any);return raw.query(q,v) as any;}};return storage.run(tx,()=>fn(tx));});},close:async()=>{}};
 const bypass:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:async()=>{}};
 const owner:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...owner,origin:'ai'},aiConfirm:Actor={...ai,actionConfirmed:true};
 await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$3)',[owner.userId,'owner@sponsor.invalid','Alex Owner']);
 const s=new Service(db),f=new WorkspaceFoundation(db),run=<T>(a:Actor,fn:()=>Promise<T>)=>withActor(a,fn);
 const w=await run(owner,()=>s.createWorkspace(owner,'Business development'));await pg.query("UPDATE tenants SET name='Acme Bio' WHERE id=(SELECT tenant_id FROM workspaces WHERE id=$1)",[w.id]);
 const project=randomUUID();await pg.query("INSERT INTO workspace_nodes(id,workspace_id,name,kind) VALUES($1,$2,'Apps','project')",[project,w.id]);
 const save=(a:Actor,op:any)=>run(a,async()=>{const p=await s.preview(a,w.id,op);return s.commit(a,p.id,p.digest);});
 const prepare=(a:Actor,op:any):Promise<any>=>run(a,()=>f.preview(a,w.id,op));
 const confirm=(a:Actor,p:any):Promise<any>=>run(a,()=>f.confirm(a,w.id,p.id,p.digest));
 const change=async(a:Actor,op:any):Promise<any>=>confirm(a,await prepare(a,op));
 const humanOnly=async(op:any)=>{const p=await prepare(ai,op);await assert.rejects(confirm(aiConfirm,p),/cannot approve/);return p;};
 const document=async(filename:string,mime:string,text:string,more:any={})=>run(owner,async()=>{const p=await s.previewFile(owner,w.id,{filename,mime,bytes:Buffer.from(text),ai:true,...more});const o=(await s.commit(owner,p.id,p.digest)).objects[0] as any;return {...o,documentId:o.id};});
 const sel=(key:string,name:string,options:string[])=>({key,name,kind:'select',options,ai:true});
 const accessType=(await save(owner,{kind:'create_type',name:'Room access',fields:[{key:'recipient_email',name:'Email',kind:'text',required:true,ai:true},{key:'organization_id',name:'Organization',kind:'text',ai:true},{key:'person_id',name:'Person',kind:'text',ai:true},sel('status','Status',['invited','active','revoked','expired']),{key:'last_seen_on',name:'Last seen',kind:'date',ai:true},sel('source','Source',['manual','tracked']),{key:'notes',name:'Notes',kind:'text',ai:true}]})).objects[0].id as string;
 const engagementType=(await save(owner,{kind:'create_type',name:'Room engagement',fields:[...['grant_id','organization_id','person_id','document_ref','document_title','section_id'].map(k=>({key:k,name:k,kind:'text',ai:true})),...['first_viewed_on','last_viewed_on','as_of'].map(k=>({key:k,name:k,kind:'date',ai:true})),...['view_count','seconds_viewed','downloads'].map(k=>({key:k,name:k,kind:'number',ai:true})),sel('source','Source',['manual','docsend','sharevault','tracked'])]})).objects[0].id as string;
 const teaser=await document('Teaser.pdf','application/pdf','%PDF-1.4 non-confidential teaser'),cda=await document('CDA.pdf','application/pdf','%PDF-1.4 CDA to sign');
 const clinical=await document('Clinical data.pdf','application/pdf','%PDF-1.4 clinical data v1'),cmc=await document('CMC plan.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','cmc plan'),board=await document('Board minutes.pdf','application/pdf','%PDF-1.4 board minutes');
 const appId=randomUUID();await pg.query("INSERT INTO workspace_components(id,workspace_id,project_id,name,format,source,bindings,source_access,created_by) VALUES($1,$2,$3,'Data Room','frontend-js',$4,$5,'bindings',$6)",[appId,w.id,project,"const r=tools.call('exchange.list',{});return {html:'<p>'+r.groups.length+' rooms</p>'};",JSON.stringify([{typeId:accessType,fields:['recipient_email','status']}]),owner.userId]);
 const app=baseApp();addExternalExchange(app,new Service(db));app.use(errors);
 const api=(token:string)=>({get:(path='')=>request(app).get('/external-exchange'+path).set('x-trialy-exchange',token),post:(path:string,body:any)=>request(app).post('/external-exchange'+path).set('x-trialy-exchange',token).send(body),bytes:(path:string)=>request(app).get('/external-exchange'+path).set('x-trialy-exchange',token).buffer(true).parse((res,cb)=>{const c:Buffer[]=[];res.on('data',x=>c.push(x));res.on('end',()=>cb(null,Buffer.concat(c)));})});
 const asRecipient=(token:string,sql:string,params:any[]=[])=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await tx.query("SELECT set_config('trialy.exchange_link',$1,true)",[checksum(token)]);return (await tx.query<any>(sql,params)).rows;});
 const sent:any[]=[];const deliverAll=async()=>{sent.length=0;while(await deliverExchangeEmails(bypass,async(m:any,key:string)=>{sent.push(m);return {id:'p-'+key.slice(0,8)};}));};
 const audits=async(action:string):Promise<any[]>=>(await pg.query('SELECT * FROM audit_events WHERE workspace_id=$1 AND action=$2',[w.id,action])).rows;
 const words=(x:any)=>JSON.stringify(x);

 // 1. A room has no form or deadline; access ends only on revoke or the end date.
 const levels=[{key:'public',name:'Non-confidential',entry:'none'},{key:'confidential',name:'Confidential',entry:'signed_document',slot:'signed_cda'},{key:'board',name:'Board materials',entry:'click_through',text:'Board materials are strictly confidential.'}];
 const roomConfig={appId,kind:'room',title:'Project Atlas data room',summary:'Welcome to the Atlas licensing room.',levels,slots:[{key:'signed_cda',label:'Signed CDA',required:true}],verifyEmail:false,notifyEngagement:true,tracking:{accessTypeId:accessType,engagementTypeId:engagementType},
  documents:[{versionId:teaser.versionId,section:{number:'1',title:'Overview'},order:1,level:'public'},{versionId:cda.versionId,title:'CDA to sign',section:{number:'1',title:'Overview'},order:2,level:'confidential',toSign:true},{versionId:clinical.versionId,section:{number:'4.2',title:'Clinical'},level:'confidential',viewOnly:true},{versionId:cmc.versionId,section:{number:'5',title:'CMC'},level:'confidential'},{versionId:board.versionId,section:{number:'10',title:'Board'},level:'board'}]};
 await assert.rejects(prepare(owner,{kind:'create_exchange_group',config:{...roomConfig,typeId:accessType,fields:['recipient_email']}}),/no response form/);
 await assert.rejects(prepare(owner,{kind:'create_exchange_group',config:{...roomConfig,documents:[teaser.versionId]}}),/one of the room levels/);
 await assert.rejects(prepare(owner,{kind:'create_exchange_group',config:{title:'Request',levels}}),/room settings/);
 const roomPreview=await prepare(ai,{kind:'create_exchange_group',config:roomConfig});assert.equal(roomPreview.exchangeReview.group.gate,'none');assert.match(roomPreview.exchangeReview.effect,/source "tracked"/);
 const room=(await confirm(owner,roomPreview)).group;assert.equal(room.kind,'room');assert.equal(room.maxFiles,0);
 const grant=async(email:string,org:string)=>(await save(owner,{kind:'create_record',typeId:accessType,data:{recipient_email:email,organization_id:org,person_id:'person-'+org}})).objects[0].id as string;
 await assert.rejects(save(owner,{kind:'create_record',typeId:accessType,data:{recipient_email:'x@y.invalid',status:'active'}}),/recorded by TrialAgents/);
 const [gA,gB,gC,gD]=[await grant('anna@alpha.invalid','org-alpha'),await grant('ben@beta.invalid','org-beta'),await grant('cara@gamma.invalid','org-gamma'),await grant('dan@delta.invalid','org-delta')];
 await assert.rejects(prepare(owner,{kind:'invite_exchange',groupId:room.id,recipients:[{emails:['x@y.invalid']}]}),/access table/);
 const invite=await humanOnly({kind:'invite_exchange',groupId:room.id,recipients:[{emails:['anna@alpha.invalid'],name:'Anna',company:'Alpha Pharma',recordId:gA},{emails:['ben@beta.invalid'],name:'Ben',company:'Beta Pharma',recordId:gB}]});
 assert.deepEqual(invite.exchangeReview.levels,['public']);assert.equal(invite.exchangeReview.ends,'until revoked');
 const [exA,exB]=(await confirm(owner,invite)).exchanges;assert.equal(exA.expiresAt,null);
 await change(owner,{kind:'set_exchange_levels',exchangeId:exB.id,levels:['public','confidential'],notify:false});
 const exC=(await change(owner,{kind:'invite_exchange',groupId:room.id,recipients:[{emails:['cara@gamma.invalid'],name:'Cara',company:'Gamma Bio',recordId:gC}],levels:['public','confidential','board'],days:400})).exchanges[0];assert.ok(exC.expiresAt);
 await assert.rejects(prepare(owner,{kind:'invite_exchange',groupId:room.id,recipients:[{emails:['x@y.invalid'],recordId:gD}],days:731}));
 const tok=(e:any)=>e.url.split('#')[1],a=api(tok(exA)),b=api(tok(exB)),c=api(tok(exC));
 const pageA=(await a.get()).body;assert.equal(pageA.mode,'room');assert.equal(pageA.endsAt,null);assert.equal(pageA.form,undefined);assert.equal(pageA.deadline,undefined);assert.equal(pageA.submissions,undefined);
 assert.equal((await a.post('/submit',{nonce:randomUUID(),confirmed:true,data:{}})).status,400);assert.equal((await a.post('/draft',{data:{}})).status,400);assert.equal((await a.post('/messages',{body:'hi'})).status,400);
 assert.equal(await sweepExchangeDeadlines(bypass),0,'rooms have no deadline');

 // 2. Levels are enforced on the page, in search, in "what changed", in published answers and in the digest (and by row security).
 const leaks=/Clinical|CMC|Board|CDA/;
 assert.deepEqual(pageA.index.map((s:any)=>[s.number,s.documents.map((d:any)=>d.title)]),[['1',['Teaser.pdf']]]);assert.ok(!leaks.test(words(pageA)),'Anna never sees confidential or board names');assert.deepEqual(pageA.lockedLevels,[]);
 for(const v of [clinical.versionId,cmc.versionId,board.versionId,cda.versionId]){const r1=await a.get('/documents/'+v),r2=await a.get('/view/'+v),r3=await a.post('/views',{versionId:v});assert.deepEqual([r1.status,r2.status,r3.status],[404,404,404],v+' '+r1.text+r2.text+r3.text);}
 assert.equal((await asRecipient(tok(exA),'SELECT id FROM document_versions WHERE id=ANY($1::uuid[])',[[clinical.versionId,cda.versionId,board.versionId,teaser.versionId]])).length,1,'row security returns only the teaser');
 assert.deepEqual((await a.get('/search?q=clinical')).body,{documents:[],answers:[]});assert.equal((await a.get('/search?q=teaser')).body.documents.length,1);assert.deepEqual((await a.get('/search?q=pdf')).body.documents.map((d:any)=>d.title),['Teaser.pdf']);
 {const r=await a.post('/questions',{body:'Clinical?',documentId:clinical.documentId});assert.equal(r.status,404,r.text);}assert.equal((await a.post('/files',{filename:'cda.pdf',mime:'application/pdf',base64:Buffer.from('x').toString('base64'),slot:'signed_cda'})).status,404);
 const pageB=(await b.get()).body;assert.deepEqual(pageB.index.map((s:any)=>s.documents.map((d:any)=>d.title)),[['Teaser.pdf','CDA to sign']]);assert.deepEqual(pageB.lockedLevels,[{key:'confidential',name:'Confidential',documents:2}]);
 assert.ok(!/Clinical data|CMC plan|Board/.test(words(pageB)),'locked level documents are counted, not named');assert.equal((await b.get('/documents/'+clinical.versionId)).status,404);assert.equal((await b.get('/documents/'+cda.versionId)).status,200,'the document to sign is open');

 // 3. A signed CDA unlocks only its level.
 const signed=await b.post('/files',{filename:'CDA signed.pdf',mime:'application/pdf',base64:Buffer.from('%PDF signed by Ben').toString('base64'),slot:'signed_cda'});assert.equal(signed.status,200,signed.text);
 assert.equal((await b.get('/documents/'+cmc.versionId)).status,404,'received is not accepted');await change(owner,{kind:'accept_exchange_file',fileId:signed.body.id,ai:false});
 const openB=(await b.get()).body;assert.deepEqual(openB.index.map((s:any)=>s.number),['1','4.2','5']);assert.ok(!/Board/.test(words(openB)));assert.equal((await b.get('/documents/'+cmc.versionId)).status,200);
 assert.equal((await asRecipient(tok(exB),'SELECT id FROM document_versions WHERE id=$1',[board.versionId])).length,0);
 const signedC=await c.post('/files',{filename:'CDA signed.pdf',mime:'application/pdf',base64:Buffer.from('%PDF signed by Cara').toString('base64'),slot:'signed_cda'});await change(owner,{kind:'accept_exchange_file',fileId:signedC.body.id,ai:false});
 const pageC=(await c.get()).body;assert.deepEqual(pageC.lockedLevels,[{key:'board',name:'Board materials',documents:1}],'the CDA opened Confidential, not Board');assert.equal((await c.get('/documents/'+board.versionId)).status,404);
 assert.equal((await c.post('/acknowledge',{name:'Cara Example',email:'cara@gamma.invalid',level:'board'})).status,200);assert.ok((await c.get()).body.index.some((s:any)=>s.number==='10'));assert.equal((await c.get('/documents/'+board.versionId)).status,200);
 assert.equal((await a.post('/acknowledge',{name:'Anna',email:'anna@alpha.invalid',level:'board'})).status,404,'a level the person does not hold');

 // 4. Each view and download is recorded per version with an approximate duration; view-only hides the download.
 assert.equal((await b.get('/documents/'+clinical.versionId)).status,403,'view-only');const inline=await b.bytes('/view/'+clinical.versionId);assert.equal(inline.status,200);assert.match(inline.headers['content-disposition'],/^inline/);assert.equal(inline.body.toString(),'%PDF-1.4 clinical data v1');
 assert.equal(openB.index.find((s:any)=>s.number==='4.2').documents[0].viewOnly,true);
 const view=await b.post('/views',{versionId:clinical.versionId});assert.equal(view.status,200);assert.equal(view.body.continued,false);
 await new Promise(r=>setTimeout(r,1100));const beat=await b.post('/views/'+view.body.viewId,{seconds:15});assert.equal(beat.status,200);assert.ok(beat.body.seconds>0&&beat.body.seconds<=15,'approximate, bounded by elapsed time');
 assert.equal((await b.post('/views/'+view.body.viewId,{seconds:500})).status,400);assert.equal((await b.post('/views',{versionId:clinical.versionId})).body.continued,true,'repeat opens within 30 minutes count once');
 assert.equal((await b.post('/views',{versionId:cmc.versionId})).status,400,'spreadsheets download instead');assert.equal((await b.get('/documents/'+cmc.versionId)).status,200);
 assert.equal((await a.post('/views/'+view.body.viewId,{seconds:5})).status,404,'another person\'s viewer session');
 const statusB=((await run(owner,()=>listExchanges(db,owner,w.id,{groupId:room.id}))).groups[0]!.exchanges.find((e:any)=>e.id===exB.id)!.status as any);
 const clinicalStatus=statusB.documents.find((d:any)=>d.documentId===clinical.documentId);assert.equal(clinicalStatus.views,1);assert.ok(clinicalStatus.seconds>0);assert.equal(clinicalStatus.downloads,0);assert.ok(clinicalStatus.lastSeen);
 assert.equal(statusB.documents.find((d:any)=>d.documentId===cmc.documentId).downloads,2);assert.equal(statusB.state,'active');assert.equal((await audits('exchange.viewed')).length,1);

 // 5. A replaced document keeps its place and shows as Updated; only the latest version is shown, earlier views stay.
 // The room was prepared three hours ago and both people last visited two hours ago.
 await pg.query("UPDATE exchange_groups SET documents=(SELECT jsonb_agg(d||jsonb_build_object('addedAt',to_char((now()-interval '3 hours') AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"'))) FROM jsonb_array_elements(documents) d) WHERE id=$1",[room.id]);
 await pg.query("UPDATE exchange_visits SET last_seen_at=now()-interval '2 hours' WHERE exchange_id=ANY($1::uuid[])",[[exA.id,exB.id]]);
 const clinical2=await document('Clinical data v2.pdf','application/pdf','%PDF-1.4 clinical data v2',{documentId:clinical.documentId,expectedVersion:clinical.version});
 const replace=await humanOnly({kind:'replace_exchange_document',groupId:room.id,expectedVersion:(await run(owner,()=>listExchanges(db,owner,w.id,{groupId:room.id}))).groups[0].version,versionId:clinical.versionId,newVersionId:clinical2.versionId});
 assert.deepEqual([replace.exchangeReview.section.number,replace.exchangeReview.level],['4.2','confidential']);await confirm(owner,replace);
 await assert.rejects(prepare(owner,{kind:'replace_exchange_document',groupId:room.id,expectedVersion:99,versionId:teaser.versionId,newVersionId:clinical2.versionId}));
 const press=await document('Press release.pdf','application/pdf','%PDF-1.4 press');
 let version=(await pg.query<any>('SELECT version FROM exchange_groups WHERE id=$1',[room.id])).rows[0].version;
 await change(owner,{kind:'share_exchange_documents',groupId:room.id,expectedVersion:version,add:[{versionId:press.versionId,section:{number:'2',title:'News'},level:'public'}]});
 const updatedB=(await b.get()).body,section42=updatedB.index.find((s:any)=>s.number==='4.2');assert.deepEqual(section42.documents.map((d:any)=>[d.versionId,d.badge,d.viewOnly]),[[clinical2.versionId,'updated',true]]);
 assert.deepEqual(updatedB.changes.map((d:any)=>[d.title,d.badge]).sort(),[['Clinical data v2.pdf','updated'],['Press release.pdf','new']]);
 const updatedA=(await a.get()).body;assert.deepEqual(updatedA.changes.map((d:any)=>d.title),['Press release.pdf'],'what changed lists only the person\'s levels');assert.ok(!leaks.test(words(updatedA)));
 assert.equal((await b.get('/view/'+clinical.versionId)).status,404,'earlier version no longer shown');assert.equal((await asRecipient(tok(exB),'SELECT id FROM document_versions WHERE id=$1',[clinical.versionId])).length,0);
 await b.post('/views',{versionId:clinical2.versionId});
 const versions=((await run(owner,()=>listExchanges(db,owner,w.id,{groupId:room.id}))).groups[0]!.exchanges.find((e:any)=>e.id===exB.id)!.status as any).documents.find((d:any)=>d.documentId===clinical.documentId);
 assert.equal(versions.views,2);assert.deepEqual(versions.versions.map((v:any)=>[v.current,v.views]),[[true,1],[false,1]]);

 // 6. Bound tables update without review and cannot be edited by people or assistants.
 const previewsBefore=Number((await pg.query<any>('SELECT count(*) AS n FROM workspace_previews')).rows[0].n);
 assert.ok(await syncExchangeTracking(bypass)>=3);assert.equal(await syncExchangeTracking(bypass),0,'up to date');
 assert.equal(Number((await pg.query<any>('SELECT count(*) AS n FROM workspace_previews')).rows[0].n),previewsBefore,'no review');
 const rec=async(id:string)=>(await pg.query<any>('SELECT * FROM records WHERE id=$1',[id])).rows[0];
 const grantB=await rec(gB);assert.equal(grantB.data.status,'active');assert.equal(grantB.data.last_seen_on,new Date().toISOString().slice(0,10));assert.equal(grantB.data.source,'tracked');assert.equal((await rec(gD)).data.status,undefined,'not invited yet');
 const engagement=(await pg.query<any>('SELECT r.* FROM records r JOIN exchange_tracked_records t ON t.record_id=r.id WHERE t.exchange_id=$1 AND t.role=$2',[exB.id,'engagement'])).rows;
 const clinicalRow=engagement.find(r=>r.data.document_ref===clinical.documentId)!.data;assert.equal(clinicalRow.view_count,2);assert.ok(clinicalRow.seconds_viewed>0);assert.equal(clinicalRow.grant_id,gB);assert.equal(clinicalRow.organization_id,'org-beta');assert.equal(clinicalRow.source,'tracked');assert.equal(clinicalRow.section_id,'4.2');
 assert.equal(engagement.find(r=>r.data.document_ref===cmc.documentId)!.data.downloads,2);
 assert.ok((await pg.query<any>("SELECT 1 FROM record_field_changes WHERE record_id=$1 AND origin='tracked'",[gB])).rows.length);
 const engagementId=engagement[0].id;
 await assert.rejects(save(owner,{kind:'update_record',recordId:engagementId,expectedVersion:engagement[0].version,data:{view_count:99}}),/cannot edit/);
 await assert.rejects(save(ai,{kind:'create_record',typeId:engagementType,data:{document_ref:'x'}}),/cannot edit/);
 await assert.rejects(save(owner,{kind:'update_record',recordId:gB,expectedVersion:grantB.version,data:{status:'revoked'}}),/recorded by TrialAgents/);
 await save(owner,{kind:'update_record',recordId:gB,expectedVersion:grantB.version,data:{notes:'Met at BIO'}});assert.equal((await rec(gB)).data.notes,'Met at BIO','other fields stay editable');
 await assert.rejects(run(owner,()=>db.transaction(async tx=>{await tx.query("SELECT set_config('trialy.tracked_write','on',true)");await tx.query(`UPDATE records SET data=data||'{"view_count":99}' WHERE id=$1`,[engagementId]);})),/recorded by TrialAgents/,'the database refuses people even when they claim a tracked write');
 await assert.rejects(run(owner,()=>db.transaction(tx=>tx.query("UPDATE records SET state='archived' WHERE id=$1",[engagementId]))),/recorded by TrialAgents/);

 // 7. Q&A: a private answer reaches only the asker; a published answer reaches the room or level without naming the asker; each triggers its email.
 const qA=await a.post('/questions',{body:'When is the next teaser update?',section:'1'});assert.equal(qA.status,200);
 const qB=await b.post('/questions',{body:'What was the primary endpoint result?',documentId:clinical.documentId});assert.equal(qB.status,200);
 const questions=await run(ai,()=>listExchangeQuestions(db,ai,w.id,{groupId:room.id}));assert.equal(questions.questions.length,2);assert.equal(questions.questions.find((q:any)=>q.id===qB.body.id)!.documentLevel,'confidential');
 const answerA=await humanOnly({kind:'answer_exchange_question',questionId:qA.body.id,body:'In January.'});assert.deepEqual(answerA.exchangeReview.email.emails.map((m:any)=>m.to),['anna@alpha.invalid']);await confirm(owner,answerA);
 assert.deepEqual((await a.get()).body.questions[0].answers.map((x:any)=>x.body),['In January.']);assert.ok(!words((await b.get()).body).includes('In January'));
 await deliverAll();assert.equal(sent.length,1);assert.equal(sent[0].text,answerA.exchangeReview.email.emails[0].text,'sent exactly as reviewed');assert.equal(sent[0].subject,answerA.exchangeReview.email.emails[0].subject);assert.ok(sent[0].from.endsWith(`at TrialAgents <${FROM_ADDRESS}>`));
 await assert.rejects(prepare(owner,{kind:'publish_exchange_answer',groupId:room.id,questionId:qB.body.id,body:'Met with p<0.01.',scope:'room'}),/publish it to that level/);
 const publish=await humanOnly({kind:'publish_exchange_answer',groupId:room.id,questionId:qB.body.id,body:'The primary endpoint was met (p<0.01).',scope:'level',level:'confidential'});
 assert.equal(publish.exchangeReview.recipients,2);assert.deepEqual(publish.exchangeReview.email.emails.map((m:any)=>m.to).sort(),['ben@beta.invalid','cara@gamma.invalid']);assert.ok(publish.exchangeReview.email.emails.every((m:any)=>m.text.includes('A participant asked')));assert.ok(!/Ben|beta/i.test(publish.exchangeReview.email.emails.find((m:any)=>m.to==='cara@gamma.invalid').text),'the asker is never named');
 await confirm(owner,publish);await deliverAll();assert.deepEqual(sent.map(m=>m.to[0]).sort(),['ben@beta.invalid','cara@gamma.invalid']);assert.deepEqual(sent.map(m=>m.text).sort(),publish.exchangeReview.email.emails.map((m:any)=>m.text).sort());
 for(const page of [b,c])assert.ok((await page.get()).body.published.some((x:any)=>x.body.includes('primary endpoint')&&x.question==='A participant asked: What was the primary endpoint result?'));
 assert.ok(!words((await a.get()).body).includes('primary endpoint'));assert.deepEqual((await a.get('/search?q=endpoint')).body.answers,[]);assert.equal((await b.get('/search?q=endpoint')).body.answers.length,1);
 assert.equal((await asRecipient(tok(exA),'SELECT id FROM exchange_answers')).length,1,'row security: only Anna\'s private answer');
 const general=await change(owner,{kind:'publish_exchange_answer',groupId:room.id,body:'Management presentations are on 5 December.',scope:'room',notify:false});
 await change(owner,{kind:'publish_exchange_answer',groupId:room.id,body:'Management presentations are on 6 December.',scope:'room',notify:false,supersedes:general.answerId});
 const roomWide=(await a.get()).body.published;assert.deepEqual(roomWide.map((x:any)=>[x.body,x.edited]),[['Management presentations are on 6 December.',true]]);
 await assert.rejects(pg.query('UPDATE exchange_answers SET body=$1',['changed']));

 // 8. Room emails are shown exactly as sent and confirmed by a person, or pre-approved for the digest; assistants can draft but not send.
 await assert.rejects(run(owner,()=>prepareExchangeEmailBatch(db,owner,w.id,{groupId:room.id,emailType:'invitation'})),/not used for rooms/);
 const granted=await run(ai,()=>prepareExchangeEmailBatch(db,ai,w.id,{groupId:room.id,emailType:'access_granted',overrides:{[exC.id]:{body:'Dear Cara,\n\nWelcome back to Atlas ({levels}).\n{link}'}}}));
 const mailA:any=granted.recipients.find((r:any)=>r.exchangeId===exA.id);assert.match(mailA.text,/\(Non-confidential\)/);assert.match(mailA.text,/until access is revoked/);assert.ok((granted.recipients.find((r:any)=>r.exchangeId===exC.id) as any).text.includes('Welcome back to Atlas (Non-confidential, Confidential, Board materials)'));
 const send=await humanOnly({kind:'send_exchange_email',batchId:granted.batchId,digest:granted.digest});await confirm(owner,send);await deliverAll();assert.deepEqual(sent.map(m=>m.text).sort(),granted.recipients.map((r:any)=>r.text).sort());
 const levelChange=await humanOnly({kind:'set_exchange_levels',exchangeId:exA.id,levels:['public','confidential']});assert.match(levelChange.exchangeReview.email.emails[0].text,/Non-confidential, Confidential/);await confirm(owner,levelChange);
 await deliverAll();assert.equal(sent[0].text,levelChange.exchangeReview.email.emails[0].text);assert.deepEqual((await a.get()).body.lockedLevels,[{key:'confidential',name:'Confidential',documents:2}]);
 assert.equal(await runExchangeDigests(bypass),0,'no digest without approval');
 version=(await pg.query<any>('SELECT version FROM exchange_groups WHERE id=$1',[room.id])).rows[0].version;
 const digestText={subject:'Atlas: new documents',body:'Dear {recipient_name},\n\nNew in {title}:\n{documents}\n\n{link}'};
 const approval=await humanOnly({kind:'approve_exchange_digest',groupId:room.id,expectedVersion:version,text:digestText});assert.equal(approval.exchangeReview.today.length,3);await confirm(owner,approval);
 assert.equal(await runExchangeDigests(bypass),0,'nothing new since approval');
 const csr=await document('Clinical study report.pdf','application/pdf','%PDF csr'),news=await document('Partnering update.pdf','application/pdf','%PDF news');
 version=(await pg.query<any>('SELECT version FROM exchange_groups WHERE id=$1',[room.id])).rows[0].version;
 await change(owner,{kind:'share_exchange_documents',groupId:room.id,expectedVersion:version,add:[{versionId:csr.versionId,section:{number:'4.3',title:'Clinical study'},level:'confidential'},{versionId:news.versionId,section:{number:'2',title:'News'},level:'public'}]});
 assert.equal(await runExchangeDigests(bypass),3);assert.equal(await runExchangeDigests(bypass),0,'once a day');await deliverAll();
 const digestA=sent.find(m=>m.to[0]==='anna@alpha.invalid'),digestB=sent.find(m=>m.to[0]==='ben@beta.invalid');
 assert.ok(digestA.text.includes('2 Partnering update.pdf (new)')&&!/Clinical study/.test(digestA.text),'Anna holds Confidential but has not signed: her digest lists only what she can open');
 assert.ok(digestB.text.includes('4.3 Clinical study report.pdf (new)')&&digestB.text.includes('Partnering update.pdf'));assert.equal(digestB.subject,'Atlas: new documents');assert.equal(digestB.from,approval.exchangeReview.from);
 const revoke=await humanOnly({kind:'revoke_exchange',exchangeId:exA.id,reason:'Declined',notify:true});assert.equal(revoke.exchangeReview.email.emailType,'access_revoked');await confirm(owner,revoke);
 assert.equal((await a.get()).status,404);await deliverAll();assert.equal(sent[0].text,revoke.exchangeReview.email.emails[0].text);assert.ok(!sent[0].text.includes('/exchange#'),'no link after access ends');

 // Workspace notifications: first open, question asked, access ending, hot and quiet parties; end date stops access; tracked status follows.
 const [exD,exE]=(await change(owner,{kind:'invite_exchange',groupId:room.id,recipients:[{emails:['dan@delta.invalid'],name:'Dan',recordId:gD}],days:30})).exchanges.concat((await change(owner,{kind:'invite_exchange',groupId:room.id,recipients:[{emails:['eve@eps.invalid'],name:'Eve',recordId:gD}],days:5})).exchanges);
 await pg.query("INSERT INTO exchange_events(id,workspace_id,exchange_id,kind,detail,created_at) VALUES($1,$2,$3,'opened','{}',now()-interval '12 days')",[randomUUID(),w.id,exD.id]);
 for(let i=0;i<5;i++)await pg.query('INSERT INTO exchange_views(id,workspace_id,exchange_id,document_id,version_id) VALUES($1,$2,$3,$4,$5)',[randomUUID(),w.id,exB.id,cmc.documentId,cmc.versionId]);
 assert.ok(await sweepExchangeRooms(bypass)>=3);const kinds=new Set((await pg.query<any>('SELECT kind FROM exchange_events WHERE exchange_id=ANY($1::uuid[])',[[exB.id,exD.id,exE.id]])).rows.map(r=>r.kind));for(const k of ['hot','quiet','access_ending'])assert.ok(kinds.has(k),k);
 await dispatchExchangeNotifications(bypass);const notes=(await run(owner,()=>listExchangeNotifications(db,owner,w.id))).notifications.map((n:any)=>n.kind);for(const k of ['first_open','question','access_ending','hot','quiet'])assert.ok(notes.includes(k),k);
 const ending=await run(owner,()=>prepareExchangeEmailBatch(db,owner,w.id,{groupId:room.id,emailType:'access_ending',exchangeIds:[exE.id]}));assert.match(ending.recipients[0].text,/ends on/);
 await pg.query("UPDATE exchanges SET expires_at=now()-interval '1 minute' WHERE id=$1",[exD.id]);assert.equal((await api(tok(exD)).get()).status,404,'access ends at the end date');
 await sweepExchangeRooms(bypass);await syncExchangeTracking(bypass);assert.equal((await rec(gA)).data.status,'revoked');assert.equal((await rec(gD)).data.status,'expired');

 // Archiving the group stops links and tracked updates; restoring resumes them.
 await humanOnly({kind:'archive_exchange_group',groupId:room.id,archived:true});await change(owner,{kind:'archive_exchange_group',groupId:room.id,archived:true});assert.equal((await b.get()).status,404);
 await pg.query("INSERT INTO exchange_events(id,workspace_id,exchange_id,kind,detail) VALUES($1,$2,$3,'opened','{}')",[randomUUID(),w.id,exC.id]);assert.equal(await syncExchangeTracking(bypass),0);
 await change(owner,{kind:'archive_exchange_group',groupId:room.id,archived:false});assert.equal((await b.get()).status,200);assert.ok(await syncExchangeTracking(bypass)>=1);

 // App runtime and MCP interface.
 const rendered:any=await run(owner,()=>f.runFrontend(owner,w.id,{componentId:appId,expectedVersion:0}));assert.ok(rendered.html.includes('1 rooms'),rendered.html);
 await pg.query('UPDATE workspace_components SET source=$2,version=version+1 WHERE id=$1',[appId,`const q=tools.call('exchange.listQuestions',{groupId:'${room.id}'});if(input.event.kind==='click')tools.call('exchange.setLevels',{exchangeId:'${exB.id}',levels:['public'],notify:false});return {html:'<p>'+q.questions.length+' questions</p><button data-action="x">Narrow</button>'};`]);
 const staged:any=await run(owner,()=>f.runFrontend(owner,w.id,{componentId:appId,expectedVersion:1,event:{kind:'click',action:'x',value:null,form:{}}}));assert.ok(staged.html.includes('2 questions'));assert.equal(staged.proposal.body.kind,'set_exchange_levels');assert.deepEqual(staged.proposal.exchangeReview.removed,['confidential']);
 const tools=new Map<string,any>();addWorkspaceMcp({registerTool:(name:string,config:any,handler:any)=>tools.set(name,{config,handler})} as any,f,ai,(fn:any)=>fn,{});assert.ok(tools.has('list_exchange_questions'));
 const mcp:any=await run(ai,()=>tools.get('list_exchanges').handler({workspaceId:w.id,groupId:room.id}));assert.ok(!words(mcp).includes(tok(exB)),'assistants never see links');assert.ok(mcp.groups[0].exchanges[0].status.documents);
 const exported:any=await run(owner,()=>s.exportWorkspace(owner,w.id));assert.ok(exported.exchange_answers.length>=4&&exported.exchange_views.length>=1&&exported.exchange_questions.length===2);
 for(const action of ['exchange.levels_changed','exchange.document_replaced','exchange.answer_published','exchange.digest_approved','exchange.digest_sent','exchange.answered','exchange.question','exchange.level_acknowledged','exchange.group_archived'])assert.ok((await audits(action)).length,action);
});
