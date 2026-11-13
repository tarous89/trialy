import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {appTemplateEntry} from '../src/workspace/app-templates.js';
import {entry,schema,demo,fullMap,fullBindings,cfgFor,fresh,freshExchange,render,approve,text} from './fixtures/data-room.js';

/* DATA_ROOM.md §13 package checklist and app behaviour on the fictional demo set (production QuickJS, mocked platform responses). */
const ROOM1=(demo.records as any[]).find(r=>r.role==='dataroom.rooms'&&r.data.purpose==='financing').id;
const ROOM2=(demo.records as any[]).find(r=>r.role==='dataroom.rooms'&&r.data.purpose==='licensing').id;
const rowsOf=(role:string)=>(demo.records as any[]).filter(r=>r.role===role);

test('package: catalog entry, seven screens, limits, build --check, installer and registry (dataroom.v1 writer, partnering)',async()=>{
 assert.equal(entry.id,'life.data-room');assert.equal(entry.version,'1.0.0');assert.equal(entry.name,'Data Room');assert.ok(appTemplateEntry.safeParse(JSON.parse(await readFile('templates/apps/life.data-room-1.0.0.json','utf8'))).success);
 const layout=JSON.parse(/^const templateLayoutSchema=(.+);$/m.exec(await readFile('templates/source/data-room/data-room.source.js','utf8'))![1]);
 assert.deepEqual(layout.screens.map((s:any)=>s.id),['overview','rooms','index','parties','activity','qa','settings']);
 assert.ok(entry.source!.length<=180000,"source "+entry.source!.length);assert.ok(Buffer.byteLength(JSON.stringify(entry))<=300000);
 assert.match(execFileSync('node',['scripts/build-data-room-template.mjs','--check'],{encoding:'utf8'}),/verified/);
 assert.equal(JSON.parse(await readFile('templates/catalog-installers.json','utf8'))['life.data-room@1.0.0'],'templates/source/data-room/schema.example.json');
 assert.ok(!JSON.stringify(JSON.parse(await readFile('templates/catalog-seed.json','utf8'))).includes('life.data-room'),'a draft until the owner approves it');
 const reg=JSON.parse(await readFile('templates/contracts/outputs.json','utf8'));
 for(const role of ['dataroom.access_grants','dataroom.engagement']){
  assert.equal(reg.roles[role].writer,'life.data-room');
  const contract=reg.roles[role].versions['dataroom.v1'].fields,mine=schema[role].fields;
  for(const f of contract){const m=mine.find((x:any)=>x.key===f.key);assert.ok(m,role+'.'+f.key);assert.equal(m.kind,f.kind);assert.deepEqual(m.options??null,f.options??null);}
  assert.equal(schema[role].contract,'dataroom.v1');
 }
 assert.deepEqual(reg.roles['dataroom.access_grants'].versions['dataroom.v1'].fields.find((f:any)=>f.key==='room_purpose').options,['financing','licensing','partnering','m_and_a','other']);
 assert.deepEqual(Object.keys(schema).sort(),['agreements','dataroom.access_grants','dataroom.engagement','dataroom.items','dataroom.levels','dataroom.questions','dataroom.rooms','dataroom.sections','dataroom.settings','dataroom.templates','organizations','people','programs'].sort());
 for(const [role,def] of Object.entries(schema) as any)if(role.startsWith('dataroom.'))assert.equal(def.contract,'dataroom.v1');
 assert.deepEqual(['people','programs','agreements'].map(r=>!!schema[r].optional),[true,true,true]);
 const m=JSON.parse(await readFile('templates/source/data-room/catalog.metadata.json','utf8'));
 assert.match(m.documentation.dataContract,/dataroom\.access_grants[\s\S]*dataroom\.engagement/);assert.equal(m.documentation.tasks.mode,'optional');
 for(const r of demo.records as any[])for(const v of Object.values(r.data))if(typeof v==='string'&&v.includes('@'))assert.match(v,/\.invalid$/,'fictional emails only');
});

test('built-in index templates: four purposes, the standard 9-section index, required items weighted by purpose',async()=>{
 const out=await render(fresh(),{section:'settings'});const t=text(out.html);
 for(const p of ['Financing','Licensing','Partnering','M&A'])assert.match(t,new RegExp(p+' room \\(standard 9-section index\\) Built in '+p));
 // Required counts differ by purpose: financing weights financials and cap table, licensing clinical/regulatory/CMC, M&A also corporate and insurance.
 const req=(p:string)=>Number(new RegExp(p+' room \\(standard 9-section index\\) Built in '+p+' (\\d+) (\\d+)').exec(t)![2]);
 assert.ok(req('Financing')>=15&&req('Licensing')>=14&&req('M&A')>req('Licensing'),[req('Financing'),req('Licensing'),req('M&A')].join());
 const rows=fresh(),open=await render(rows,{section:'rooms',roomId:ROOM2});
 // The licensing room has a single section so far; adding the template items proposes only the missing ones, at the template's levels.
 const add=await render(rows,open.state,{kind:'click',action:'setup-items:'+ROOM2});
 const items=add.changes.filter((c:any)=>c.typeId==='dataroom.items');assert.equal(items.length,1);
 assert.ok(items.every((c:any)=>c.data.room_id===ROOM2&&c.data.status==='missing'&&c.data.level_id));
 assert.ok(items.some((c:any)=>c.data.title==='Investigator brochure'&&c.data.required===true),'licensing requires the IB');
 assert.ok(!items.some((c:any)=>c.data.title==='Development plan'),'existing items are not duplicated');
});

test('new room → structure (levels follow the CDA option) → items; readiness counts required minus not applicable',async()=>{
 const rows=fresh(),o=await render(rows,{section:'rooms'},{kind:'click',action:'panel:newroom'});assert.match(o.html,/role="dialog" aria-modal="true" aria-label="New room"/);
 const c=await render(rows,o.state,{kind:'submit',action:'create-room',form:{name:'Series A extension',purpose:'partnering',template_id:'builtin:partnering',cda_option:'send_pdf',round_id:'',opportunity_ref:'Cedarline collaboration'}});
 assert.equal(c.changes.length,1);assert.deepEqual({...c.changes[0].data,program_ids:undefined},{name:'Series A extension',purpose:'partnering',status:'preparing',program_ids:undefined,round_id:null,opportunity_ref:'Cedarline collaboration',template_id:'builtin:partnering',cda_option:'send_pdf',welcome_note:null,contact_person_id:null,notify_updates:false,owner:null});
 approve(rows,c.changes);const id=rows[rows.length-1].id;
 const s=await render(rows,{section:'rooms',roomId:id},{kind:'click',action:'setup-structure:'+id});
 const lv=s.changes.filter((x:any)=>x.typeId==='dataroom.levels');assert.deepEqual(lv.map((x:any)=>[x.data.name,x.data.entry]),[['Non-confidential','none'],['Confidential','signed_cda']]);
 assert.equal(s.changes.filter((x:any)=>x.typeId==='dataroom.sections').length,9);approve(rows,s.changes);
 const it=await render(rows,s.state,{kind:'click',action:'setup-items:'+id});assert.ok(it.changes.length>20&&it.changes.length<=50);approve(rows,it.changes);
 const idx=text((await render(rows,{section:'index',roomId:id})).html);assert.match(idx,/Readiness 0%/);assert.match(idx,/Missing required items: /);
 // Readiness of the demo financing room: required ready ÷ (required − not applicable), never counting optional items.
 const items=rowsOf('dataroom.items').filter((r:any)=>r.data.room_id===ROOM1),req=items.filter((r:any)=>r.data.required&&r.data.status!=='not_applicable');
 assert.match(text((await render(fresh(),{section:'index',roomId:ROOM1})).html),new RegExp('Readiness '+Math.round(req.filter((r:any)=>r.data.status==='ready').length/req.length*100)+'%'));
});

test('go live: one room group with levels, entry steps, placed documents, tracked tables and email defaults per type and purpose',async()=>{
 const rows=fresh();for(const r of rows)if(r.role==='dataroom.rooms'&&r.id===ROOM2)r.data.status='preparing';
 const X=freshExchange();const o=await render(rows,{section:'rooms',roomId:ROOM2},{kind:'click',action:'panel:live'},{exchange:X});assert.match(o.html,/CDA document parties sign/);
 const docs=demo.documents as any[],cda=docs.find(d=>d.filename==='Mutual CDA template.pdf').versionId;
 const refused=await render(rows,o.state,{kind:'submit',action:'go-live',form:{}},{exchange:X});assert.match(refused.state.notice,/Choose the CDA document/);
 const g=await render(rows,o.state,{kind:'submit',action:'go-live',form:{cda_doc:cda}},{exchange:X});
 assert.equal(g.xwrites.length,1);assert.equal(g.xwrites[0].name,'exchange.createGroup');const conf=g.xwrites[0].value;
 assert.equal(conf.kind,'room');assert.equal(conf.appRef,'room:'+ROOM2);assert.equal(conf.verifyEmail,true);
 assert.deepEqual(conf.levels.map((l:any)=>[l.name,l.entry]),[['Non-confidential','none'],['Confidential','signed_document']]);
 assert.ok(conf.levels.every((l:any)=>/^l[0-9a-f]{32}$/.test(l.key)));
 assert.deepEqual(conf.tracking,{accessTypeId:'dataroom.access_grants',engagementTypeId:'dataroom.engagement'});assert.deepEqual([conf.notifyEngagement,conf.quietDays],[true,10]);
 const toSign=conf.documents.find((p:any)=>p.toSign);assert.equal(toSign.versionId,cda);assert.equal(toSign.level,conf.levels[0].key);
 const plan=conf.documents.find((p:any)=>p.title==='Development plan');assert.deepEqual(plan.section,{number:'6',title:'Clinical'});assert.equal(plan.level,conf.levels[1].key);
 assert.deepEqual(Object.keys(conf.emailDefaults).sort(),['access_changed','access_ending','access_granted','access_revoked','answer_published','documents_updated','question_answered']);
 assert.match(conf.emailDefaults.access_granted.body,/a potential licence/);assert.ok(Object.values(conf.emailDefaults).every((t:any)=>t.subject&&t.body&&!t.subject.includes('"')));
 assert.deepEqual(g.changes.map((c:any)=>[c.recordId,c.data]),[[ROOM2,{status:'live'}]],'the room status joins the same action');
 // Email texts per type and purpose: a saved financing invitation replaces the built-in one for financing rooms only.
 const s=await render(rows,{section:'settings'},{kind:'submit',action:'save-email',form:{type:'access_granted',purpose:'financing',subject:'{sender_company}: our Series B room',body:'Dear {recipient_name}, here is the room: {link}'}});
 approve(rows,s.changes);const after=await render(rows,{section:'rooms',roomId:ROOM2},{kind:'click',action:'panel:live'},{exchange:X});
 const g2=await render(rows,after.state,{kind:'submit',action:'go-live',form:{cda_doc:cda}},{exchange:X});assert.match(g2.xwrites[0].value.emailDefaults.access_granted.body,/a potential licence/,'licensing keeps the built-in text');
});

test('screens: all seven render from the demo; Activity, Parties, Q&A and the disclosure record use room status; tracked fields are never proposed',async()=>{
 const rows=fresh();for(const s of ['overview','rooms','index','parties','activity','qa','settings']){const o=await render(rows,{section:s,roomId:ROOM1});assert.doesNotMatch(o.html,/could not be shown|dr-banner bad/,s);assert.match(o.html,new RegExp('Data Room / '));}
 const ov=text((await render(rows,{section:'overview'})).html);assert.match(ov,/Hot Ana Fictus, Alder Peak Capital/);assert.match(ov,/Quiet Ben Example: nothing opened for 16 days/);assert.match(ov,/1 new question from parties to log/);
 const act=text((await render(rows,{section:'activity',roomId:ROOM1})).html);assert.match(act,/Ana Fictus Alder Peak Capital 4 3 · · 2 · · 2 12 Nov 2026 15:30/);assert.match(act,/Ben Example 28 Oct 2026 15:30 Nothing new/,'the updated cash forecast is Confidential, which Ben does not hold');assert.match(act,/Dev Placeholder Never Company teaser or one-pager; Presentation deck; Market and competitive analysis Call brief/);
 const p=await render(rows,{section:'parties',roomId:ROOM1},{kind:'click',action:'panel:party:'+rowsOf('dataroom.access_grants')[0].id});const d=text(p.html);
 assert.match(d,/Disclosure record · Alder Peak Capital/);assert.match(d,/Levels changed to Non-confidential, Confidential/);assert.match(d,/Accepted the confidentiality notice for Confidential/);assert.match(d,/Presentation deck 4 21 min 0/);
 const all:any[]=[];for(const action of ['panel:levels:'+rowsOf('dataroom.access_grants')[1].id])all.push(...(await render(rows,{section:'parties',roomId:ROOM1},{kind:'click',action})).changes);
 const lv=await render(rows,{section:'parties',roomId:ROOM1,panel:{type:'levels',id:rowsOf('dataroom.access_grants')[1].id}},{kind:'submit',action:'save-levels',form:{['l_'+rowsOf('dataroom.levels')[0].id]:'on',['l_'+rowsOf('dataroom.levels')[1].id]:'on',notify:'on'}});
 // Confidential is click-through in the financing room: no CDA step, so the level change goes to review with its email; the grant's status is not touched.
 assert.equal(lv.xwrites[0].name,'exchange.setLevels');assert.equal(lv.xwrites[0].value.notify,true);assert.equal(lv.xwrites[0].value.levels.length,2);
 for(const c of lv.changes.concat(all))for(const k of ['status','last_seen_on','agreement_accepted_on','source'])assert.ok(!(k in c.data),'tracked '+k);
});

test('CDA options: in place elsewhere records the entry step; Contracts reuses a signed CDA; send PDF needs the accepted upload',async()=>{
 const rows=fresh(),grant=rowsOf('dataroom.access_grants').find((g:any)=>g.data.room_id===ROOM2),lv=rowsOf('dataroom.levels').filter((l:any)=>l.data.room_id===ROOM2);
 const X=freshExchange(),g=X.groups[0];const room2={...g,id:'00000000-0000-4000-7000-00000000ffff',appRef:'room:'+ROOM2,levels:lv.map((l:any)=>({key:'l'+l.id.replace(/-/g,''),name:l.data.name,entry:l.data.entry==='signed_cda'?'signed_document':'none'})),documents:[],exchanges:[{id:'00000000-0000-4000-7100-00000000ffff',groupId:'x',recordId:grant.id,recipientName:'Chloe Sample',recipientEmails:['chloe@cedar.invalid'],expiresAt:null,levels:['l'+lv[0].id.replace(/-/g,'')],createdAt:'2026-11-12',status:{room:{state:'invited',levels:['l'+lv[0].id.replace(/-/g,'')],openLevels:['l'+lv[0].id.replace(/-/g,'')],documents:[],history:[],lastSeen:null},documentsBack:[]}}]};X.groups.push(room2);
 const base={section:'parties',roomId:ROOM2,panel:{type:'levels',id:grant.id}},both={['l_'+lv[0].id]:'on',['l_'+lv[1].id]:'on'};
 const upload=await render(rows,base,{kind:'submit',action:'save-levels',form:{...both,cda_mode:'upload'}},{exchange:X});assert.match(upload.state.notice,/opens when the signed CDA is accepted/);assert.equal(upload.xwrites.length,0);
 const inPlace=await render(rows,base,{kind:'submit',action:'save-levels',form:{...both,cda_mode:'in_place',cda_date:'2026-10-02'}},{exchange:X});
 assert.deepEqual(inPlace.xwrites[0].value.entered,['l'+lv[1].id.replace(/-/g,'')]);assert.equal(inPlace.xwrites[0].value.enteredNote,'CDA in place elsewhere, signed 2026-10-02');assert.equal(inPlace.changes[0].data.cda_status,'in_place_elsewhere');
 const ag=rowsOf('agreements')[0];const viaContracts=await render(rows,base,{kind:'submit',action:'save-levels',form:{...both,cda_mode:'contracts',agreement_id:ag.id}},{exchange:X});
 assert.match(viaContracts.xwrites[0].value.enteredNote,/Signed CDA on file: CDA: Cedarline Pharma/);assert.deepEqual([viaContracts.changes[0].data.cda_status,viaContracts.changes[0].data.cda_agreement_id],['signed',ag.id]);
 // Accepting an uploaded CDA in a "Use Contracts" room files it as a core agreement (cda_nda) in the same review and emails the party.
 room2.exchanges[0].status.documentsBack=[{slot:'signed_x',status:'received',fileId:'00000000-0000-4000-7400-000000000001'}];
 const acc=await render(rows,{section:'parties',roomId:ROOM2},{kind:'click',action:'accept-cda:'+grant.id+':00000000-0000-4000-7400-000000000001'},{exchange:X});
 assert.deepEqual(acc.xwrites[0],{name:'exchange.acceptFile',value:{fileId:'00000000-0000-4000-7400-000000000001',notify:true}});
 assert.deepEqual(acc.changes.map((c:any)=>c.typeId??c.recordId),[grant.id,'agreements']);assert.equal(acc.changes[1].data.agreement_type,'cda_nda');
});

test('Q&A: log, draft, approval required before sending, private answer or publication without the asker; emails come from the platform',async()=>{
 const rows=fresh(),X=freshExchange(),fresh_=X.questions.find((m:any)=>!rowsOf('dataroom.questions').some((q:any)=>q.data.message_id===m.id));
 const log=await render(rows,{section:'qa',roomId:ROOM1},{kind:'submit',action:'log-questions',form:{['m_'+fresh_.id]:'on'}},{exchange:X});
 assert.equal(log.changes[0].data.message_id,fresh_.id);assert.equal(log.changes[0].data.status,'new');assert.ok(log.changes[0].data.grant_id);assert.equal(log.changes[0].data.document_ids,fresh_.documentId);
 const q=rowsOf('dataroom.questions').find((x:any)=>x.data.status==='drafting');const st={section:'qa',roomId:ROOM1,panel:{type:'answer',id:q.id}};
 const early=await render(rows,st,{kind:'submit',action:'save-answer',value:'private',form:{answer:q.data.answer}},{exchange:X});assert.match(early.state.notice,/need approval/);assert.equal(early.xwrites.length,0);
 const ok=await render(rows,st,{kind:'submit',action:'save-answer',value:'approve',form:{answer:q.data.answer,approver:'Robin Lead'}},{exchange:X});assert.deepEqual([ok.changes[0].data.status,ok.changes[0].data.approved_by],['in_review','Robin Lead']);approve(rows,ok.changes);
 const priv=await render(rows,st,{kind:'submit',action:'save-answer',value:'private',form:{answer:q.data.answer}},{exchange:X});
 assert.deepEqual(priv.xwrites[0],{name:'exchange.answer',value:{questionId:q.data.message_id,body:q.data.answer,notify:true}});assert.equal(priv.changes[0].data.status,'answered');
 const changed=await render(rows,st,{kind:'submit',action:'save-answer',value:'publish',form:{answer:q.data.answer+' Edited.',public_question:'Does the forecast include Phase 2?',publish_to:'room'}},{exchange:X});assert.match(changed.state.notice,/Approve this exact text/);
 const pub=await render(rows,st,{kind:'submit',action:'save-answer',value:'publish',form:{answer:q.data.answer,public_question:'Does the forecast include Phase 2?',publish_to:rowsOf('dataroom.levels')[1].id}},{exchange:X});
 assert.equal(pub.xwrites[0].name,'exchange.publishAnswer');assert.equal(pub.xwrites[0].value.scope,'level');assert.equal(pub.xwrites[0].value.level,'l'+rowsOf('dataroom.levels')[1].id.replace(/-/g,''));assert.equal(pub.xwrites[0].value.question,'Does the forecast include Phase 2?');assert.doesNotMatch(JSON.stringify(pub.xwrites[0].value),/Ana|Alder/);
 // Repeated questions: an approved answer to a similar question is suggested for reuse.
 const sim=await render(rows,{section:'qa',roomId:ROOM1},{kind:'click',action:'panel:answer:'+q.id},{exchange:X});assert.doesNotMatch(sim.html,/Similar questions were answered before/);
});

test('preview never contacts anyone or writes; partial reads disable changes; index sync proposes in-place versions and placement',async()=>{
 const p=await render(fresh(),{section:'parties',roomId:ROOM1},{kind:'click',action:'panel:grant'},{saved:false});
 assert.ok(!p.calls.some((c:string)=>c.startsWith('exchange.')||c==='documents.list'));assert.match(p.html,/Preview: save the app/);
 const partial=await render(fresh(),{section:'rooms'},{kind:'click',action:'setup-items:'+ROOM2},{read:(v:any,rows:any[])=>{const all=rows.filter(r=>r.role===v.typeId);return {rows:all.slice(0,1),total:all.length+5};}});
 assert.match(partial.state.notice,/could not be read completely/);assert.equal(partial.changes.length,0);
 // The deck has version 2 in the document store: the index offers it; using it replaces the version in place in the room, with the item, in one review.
 const rows=fresh(),deck=rowsOf('dataroom.items').find((i:any)=>i.data.title==='Presentation deck');const idx=await render(rows,{section:'index',roomId:ROOM1});assert.match(idx.html,/Use version 2/);
 const use=await render(rows,idx.state,{kind:'click',action:'use-version:'+deck.id});assert.equal(use.xwrites[0].name,'exchange.replaceDocument');assert.equal(use.xwrites[0].value.versionId,deck.data.version_id);assert.equal(use.changes[0].data.updated_on,'2026-11-13');
 // An item marked not applicable leaves the room; a moved level is placed again: one shareDocuments review.
 const fin=rows.find(r=>r.role==='dataroom.items'&&r.data.title==='Financial statements')!;fin.data.status='not_applicable';const cap=rows.find(r=>r.role==='dataroom.items'&&r.data.title==='Cap table')!;cap.data.view_only=true;
 const plan=await render(rows,{section:'index',roomId:ROOM1});assert.match(text(plan.html),/1 document to add, 1 document to remove, 1 document moved or changed/);
 const sync=await render(rows,plan.state,{kind:'click',action:'sync-room'});assert.equal(sync.xwrites[0].name,'exchange.shareDocuments');assert.deepEqual(sync.xwrites[0].value.remove,[fin.data.version_id]);assert.equal(sync.xwrites[0].value.update.find((x:any)=>x.versionId===cap.data.version_id).viewOnly,true);assert.equal(sync.xwrites[0].value.add.length,1);
});
