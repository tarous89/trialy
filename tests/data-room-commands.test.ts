import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {entry,render,fresh,approve,text,cfgFor,fullMap,fullBindings,demo} from './fixtures/data-room.js';
import {readAppCommands,validateAppCommands} from '../src/workspace/app-commands.js';
import {readRecipes,validateRecipeDeclarations} from '../src/automations/recipes-schema.js';
import {validateAppFunctions} from '../src/workspace/app-functions-schema.js';

/* Data Room 1.1.0: app commands through the same handler as clicks, customization without code (custom fields, form layout),
 * Notify parties instead of an automatic digest, the access-ending switch, and the weekly room summary helper. Fictional data. */
const ROOM1=(demo.records as any[]).find(r=>r.role==='dataroom.rooms'&&r.data.status==='live').id;
const ROOM2=(demo.records as any[]).find(r=>r.role==='dataroom.rooms'&&r.data.purpose==='licensing').id;
const rowsOf=(role:string,rows:any[]=demo.records)=>(rows as any[]).filter(r=>r.role===role);
const cmd=(rows:any[],id:string,input:any={},opts:any={},state:any={})=>render(rows,state,{kind:'command',action:id,value:JSON.stringify(input)},opts);
const result=(o:any)=>{assert.equal(o.state.command.ok,true,o.state.command.error);return o.state.command.result;};

test('declarations: 32 commands read as data, valid; one weekly summary email with a read-only helper; no party digest or drafting automation',async()=>{
 validateAppCommands(entry.source);const list=readAppCommands(entry.source);assert.equal(list.length,32);
 assert.deepEqual(list.filter(c=>c.mode==='read').map(c=>c.id),['schema.describe','rooms.read','waiting.read','index.read','readiness.read','parties.read','activity.read','changes.read','brief.read','questions.read','notify.read','settings.read']);
 assert.deepEqual(list.filter(c=>c.mode==='layout').map(c=>c.id),['layout.save']);
 const raw=JSON.parse(await readFile('templates/apps/life.data-room-1.1.1.json','utf8'));validateRecipeDeclarations(raw);
 const recs=readRecipes(raw).recommended;assert.deepEqual(recs.map((r:any)=>r.key),['weekly_room_summary']);
 assert.equal(recs[0].research,undefined);assert.equal(recs[0].email!.summaryBinding,'room_summary');assert.deepEqual((recs[0].trigger as any).weekdays,[1]);
 validateAppFunctions(raw,Object.keys(JSON.parse(await readFile('templates/source/data-room/schema.example.json','utf8'))));
 assert.deepEqual(raw.functions.map((f:any)=>[f.name,f.scope.capabilities,f.scope.documents]),[['room_summary',['records.read'],false]]);
 assert.doesNotMatch(entry.source!,/approveDigest/,'no automatic digest to parties');
});

test('read commands return the app\'s own results, the same as the screens',async()=>{
 const rows=fresh();
 const rooms=result(await cmd(rows,'rooms.read'));const r1=rooms.rooms.find((r:any)=>r.room_id===ROOM1);
 const ov=text((await render(rows,{section:'overview'})).html);assert.match(ov,new RegExp('Series B data room Financing Live '+r1.readiness.pct+'%'));
 assert.equal(r1.live,true);assert.equal(r1.access_ending_reminder,true);
 const rd=result(await cmd(rows,'readiness.read',{room_id:ROOM1}));assert.equal(rd.pct,r1.readiness.pct);assert.equal(rd.sections.length,rowsOf('dataroom.sections').filter((s:any)=>s.data.room_id===ROOM1).length);
 const parties=result(await cmd(rows,'parties.read',{room_id:ROOM1}));assert.equal(parties.parties.length,rowsOf('dataroom.access_grants',rows).filter((g:any)=>g.data.room_id===ROOM1).length);
 assert.ok(parties.parties.every((p:any)=>typeof p.hot==='boolean'&&typeof p.quiet==='boolean'&&Array.isArray(p.levels)));
 assert.ok(!JSON.stringify(parties).match(/https?:\/\//),'no links');
 // The call brief is the same text the Activity panel shows.
 const g=parties.parties[0].grant_id,brief=result(await cmd(rows,'brief.read',{grant_id:g})).text;
 const panel=await render(rows,{section:'activity',roomId:ROOM1},{kind:'click',action:'panel:brief:'+g});
 assert.ok(panel.html.includes(brief.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')),'brief text matches the panel');
 const q=result(await cmd(rows,'questions.read',{room_id:ROOM1,status:'all'}));assert.ok(Array.isArray(q.log)&&Array.isArray(q.new_from_room));
 const n=result(await cmd(rows,'notify.read',{room_id:ROOM1}));assert.equal(n.live,true);assert.ok(n.documents.some((d:any)=>d.kind==='updated'&&d.title==='Cash forecast and runway'));
 const desc=result(await cmd(rows,'schema.describe'));assert.ok(desc.forms.items.fields.some((f:any)=>f.key==='title'&&f.required));assert.equal(desc.commands.length,32);assert.match(desc.not_by_command,/person's clicks/);
 const nf=await cmd(rows,'readiness.read',{room_id:'00000000-0000-4000-8000-00000000ffff'});assert.equal(nf.state.command.ok,false);assert.match(nf.state.command.error,/Room not found/);
 const changes=(await cmd(rows,'rooms.read')).changes;assert.equal(changes.length,0,'read commands propose nothing');
});

test('propose commands give the click path\'s exact records; nothing is shared, sent or changed in a live room by a command',async()=>{
 const rows=fresh();
 const form={name:'Series A extension',purpose:'partnering',template_id:'builtin:partnering',cda_option:'send_pdf',round_id:'',opportunity_ref:'Cedarline collaboration'};
 const click=await render(rows,{section:'rooms'},{kind:'submit',action:'create-room',form});
 const viaCmd=await cmd(rows,'room.create',{name:form.name,purpose:'partnering',template_id:'builtin:partnering',cda_option:'send_pdf',opportunity_ref:'Cedarline collaboration'});
 result(viaCmd);assert.deepEqual(viaCmd.changes,click.changes);assert.equal(viaCmd.changes.length,1);
 // Generic form: edit an index item exactly as the editor does.
 const item=rowsOf('dataroom.items',rows).find((i:any)=>i.data.room_id===ROOM1)!;
 const ed=await render(rows,{section:'index',roomId:ROOM1},{kind:'click',action:'edit:items:'+item.id});const saved=await render(rows,ed.state,{kind:'submit',action:'save-record',form:{owner:'CFO',due:'2026-11-20'}});
 const c2=await cmd(rows,'record.save',{role:'items',id:item.id,values:{owner:'CFO',due:'2026-11-20'}});result(c2);assert.deepEqual(c2.changes,saved.changes);
 const bad=await cmd(rows,'record.save',{role:'items',id:item.id,values:{colour:'red'}});assert.equal(bad.state.command.ok,false);assert.match(bad.state.command.error,/not a field you can set/);
 // Party, question and settings commands.
 const lv=rowsOf('dataroom.levels',rows).filter((l:any)=>l.data.room_id===ROOM2).map((l:any)=>l.id);
 const pa=await cmd(rows,'party.add',{room_id:ROOM2,email:'new.party@example.invalid',level_ids:[lv[0]]});result(pa);assert.equal(pa.changes[0].data.recipient_email,'new.party@example.invalid');
 const q=rowsOf('dataroom.questions',rows)[0]!;const qs=await cmd(rows,'question.save',{question_id:q.id,step:'save',answer:'Draft answer with references (fictional).'});result(qs);
 assert.equal(qs.changes[0].data.answer,'Draft answer with references (fictional).');assert.equal(qs.changes[0].data.status,'drafting');
 const st=await cmd(rows,'settings.save',{quiet_days:14});result(st);assert.equal(st.changes[0].data.quiet_days,14);assert.equal(st.changes[0].data.default_access_days,180,'other settings kept');
 // Exchange actions refuse: archiving a live room is a person's click.
 const ar=await cmd(rows,'record.archive',{role:'rooms',id:ROOM1});assert.equal(ar.state.command.ok,false);assert.match(ar.state.command.error,/person does it with a click/);
 assert.equal(ar.xwrites.length,0);assert.equal(ar.changes.length,0,'no partial review');
 const ut=await cmd(rows,'no.such');assert.equal(ut.state.command.ok,false);
});

test('custom fields: registered by command with the schema change still needed; once bound they appear in the form and are saved',async()=>{
 const rows=fresh();
 const add=await cmd(rows,'custom_field.save',{role:'rooms',key:'deal_code',label:'Deal code',kind:'text'});const r=result(add);
 assert.equal(r.schema_change.required,true);assert.match(r.schema_change.message,/prepare_change update_type/);assert.equal(r.schema_change.field.key,'deal_code');
 approve(rows,add.changes);assert.deepEqual(JSON.parse(rowsOf('dataroom.settings',rows)[0].data.custom_fields),[{role:'rooms',key:'deal_code',label:'Deal code',kind:'text'}]);
 // Not bound yet: Settings says so; nothing breaks.
 assert.match(text((await render(rows,{section:'settings'})).html),/Deal code deal_code · not in this app yet/);
 // Bound (schema change + binding-only revision): the form shows it and it is saved like any field.
 const map=structuredClone(fullMap);const b=structuredClone(fullBindings);b.find((x:any)=>x.typeId==='dataroom.rooms')!.fields.push('deal_code');
 const opts={config:cfgFor(map),bindings:b};
 const ed=await render(rows,{section:'rooms',roomId:ROOM1},{kind:'click',action:'edit:rooms:'+ROOM1},opts);assert.match(ed.html,/Deal code/);
 const sv=await cmd(rows,'record.save',{role:'rooms',id:ROOM1,values:{deal_code:'NW-B-2026'}},opts);result(sv);assert.deepEqual(sv.changes[0].data,{deal_code:'NW-B-2026'});
 approve(rows,sv.changes);assert.match(text((await render(rows,{section:'rooms',roomId:ROOM1},undefined,opts)).html),/Deal code NW-B-2026/);
 assert.equal(result(await cmd(rows,'rooms.read',{},opts)).rooms.find((x:any)=>x.room_id===ROOM1).custom.deal_code,'NW-B-2026');
 const rm=await cmd(rows,'custom_field.remove',{role:'rooms',key:'deal_code'});result(rm);assert.equal(JSON.parse(rm.changes[0].data.custom_fields).length,0);
});

test('form layout: hidden optional fields, labels and defaults apply in the form; layout.save proposes a presentation-only change',async()=>{
 const rows=fresh();const sec=rowsOf('dataroom.sections',rows).find((s:any)=>s.data.room_id===ROOM1)!;
 const profile={heading:'Data Room',visible:{'item_form:owner':false},labels:{'item_form:due':'Target date'},defaults:{'item_form:notes':'Prepared by finance'}};
 const o=await render(rows,{section:'index',roomId:ROOM1},{kind:'click',action:'add:items:'+sec.id},{config:cfgFor(fullMap,{layoutProfile:JSON.stringify(profile)})});
 assert.doesNotMatch(o.html,/for="dr-e-owner"/);assert.match(o.html,/Target date/);assert.match(o.html,/Prepared by finance/);
 const ls=await cmd(rows,'layout.save',{hide:['item_form:owner','parties:cda'],labels:{'item_form:due':'Target date'}});result(ls);
 assert.equal(ls.layouts.length,1);assert.equal(ls.layouts[0].visible['item_form:owner'],false);assert.equal(ls.layouts[0].labels['item_form:due'],'Target date');assert.equal(ls.changes.length,0);
 const req=await cmd(rows,'layout.save',{hide:['item_form:title']});assert.equal(req.state.command.ok,false);assert.match(req.state.command.error,/required/);
 // Hidden columns from the layout gear (group:field keys) now apply; 1.0.0 read the wrong separator.
 const p=await render(rows,{section:'parties',roomId:ROOM1},undefined,{config:cfgFor(fullMap,{layoutProfile:JSON.stringify({heading:'Data Room',visible:{'parties:cda':false}})})});
 assert.doesNotMatch(p.html,/<th scope="col">CDA<\/th>/);
});

test('Notify parties: chosen documents to all or chosen parties, one confirmed send; no automatic digest',async()=>{
 const rows=fresh();const o=await render(rows,{section:'rooms',roomId:ROOM1});assert.match(text(o.html),/Notify parties/);assert.doesNotMatch(text(o.html),/Updates digest|daily digest/i);
 const pn=await render(rows,o.state,{kind:'click',action:'panel:notify'});assert.match(pn.html,/aria-label="Notify parties"/);
 const g=demo.exchange.groups[0],cash=g.documents.find((d:any)=>d.title==='Cash forecast and runway');
 assert.match(pn.html,new RegExp('name="d_'+cash.versionId+'"[^>]* checked'),'recently updated documents are ticked');
 let prepared:any=null;
 const nx=await render(rows,pn.state,{kind:'submit',action:'notify-prepare',form:{['d_'+cash.versionId]:'on',who:'all'}});
 assert.equal(nx.state.panel.type,'send');assert.equal(nx.state.panel.emailType,'documents_updated');assert.deepEqual(nx.state.panel.versionIds,[cash.versionId]);
 const canOpen=g.exchanges.filter((e:any)=>e.status.openLevels.includes(cash.level)).map((e:any)=>e.id);assert.deepEqual(nx.state.panel.ids.sort(),canOpen.sort(),'only people who can open it');
 const ps=await render(rows,nx.state,{kind:'submit',action:'prepare-send',form:{}},{prepare:(v:any)=>{prepared=v;return {batchId:'00000000-0000-4000-8000-0000000000aa',digest:'d'.repeat(64),from:'x',replyTo:'y',emailType:v.emailType,recipients:[]};}});
 assert.deepEqual(prepared.versionIds,[cash.versionId]);assert.equal(prepared.emailType,'documents_updated');assert.ok(ps.state.batch);
 const none=await render(rows,pn.state,{kind:'submit',action:'notify-prepare',form:{}});assert.match(none.state.notice,/Choose at least one document/);
});

test('access-ending reminder: a room switch; on a live room it is one review with the record',async()=>{
 const rows=fresh();
 const pre=await render(rows,{section:'rooms',roomId:ROOM2},{kind:'click',action:'access-reminder:'+ROOM2+':off'});assert.deepEqual(pre.changes.map((c:any)=>c.data),[{access_ending_reminder:false}]);assert.equal(pre.xwrites.length,0);
 const X=structuredClone(demo.exchange);X.groups[0].notifyAccessEnding=true;
 const live=await render(rows,{section:'rooms',roomId:ROOM1},{kind:'click',action:'access-reminder:'+ROOM1+':off'},{exchange:X});
 assert.deepEqual(live.xwrites.map((x:any)=>[x.name,x.value.notifyAccessEnding]),[['exchange.setRoomNotices',false]]);assert.deepEqual(live.changes.map((c:any)=>c.data),[{access_ending_reminder:false}]);
 // Going live carries the room's switch.
 const r2=rowsOf('dataroom.rooms',rows).find((r:any)=>r.id===ROOM2)!;r2.data.access_ending_reminder=false;
 const lv=await render(rows,{section:'rooms',roomId:ROOM2},{kind:'click',action:'panel:live'});const go=await render(rows,lv.state,{kind:'submit',action:'go-live',form:{cda_doc:demo.documents[0].versionId}});
 const create=go.xwrites.find((x:any)=>x.name==='exchange.createGroup');assert.ok(create,go.state.notice);assert.equal(create.value.notifyAccessEnding,false);
});

test('weekly room summary helper: the app\'s rules from records only; nothing when no room is live',async()=>{
 const raw=JSON.parse(await readFile('templates/apps/life.data-room-1.1.1.json','utf8')),src=raw.functions[0].source as string;
 const today=new Date().toISOString().slice(0,10),ago=(n:number)=>new Date(Date.now()-n*86400000).toISOString().slice(0,10);
 const run=(rows:any[])=>{const roles=['dataroom.rooms','dataroom.access_grants','dataroom.engagement','dataroom.questions','dataroom.items','dataroom.settings','organizations','people'];const appRoles=Object.fromEntries(roles.map(r=>[r,r]));
  const tools={call:(name:string,v:any)=>{assert.equal(name,'records.read');const all=rows.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset,v.offset+v.limit).map(r=>({id:r.id,data:r.data})),total:all.length};}};
  return new Function('tools','appRoles',src)(tools,appRoles);};
 assert.equal(run([{role:'dataroom.rooms',id:'r',data:{name:'Closed room',status:'closed'}}]).nonEmpty,false);
 const rows=[{role:'dataroom.rooms',id:'r1',data:{name:'Series B (fictional)',status:'live'}},{role:'dataroom.settings',id:'s',data:{quiet_days:10}},
  {role:'people',id:'p1',data:{name:'Ana (fictional)'}},{role:'people',id:'p2',data:{name:'Ben (fictional)'}},{role:'organizations',id:'o1',data:{name:'Alder Peak (fictional)'}},
  {role:'dataroom.access_grants',id:'g1',data:{room_id:'r1',person_id:'p1',organization_id:'o1',status:'active',granted_on:ago(20),last_seen_on:ago(1)}},
  {role:'dataroom.access_grants',id:'g2',data:{room_id:'r1',person_id:'p2',status:'invited',granted_on:ago(15)}},
  {role:'dataroom.engagement',id:'e1',data:{grant_id:'g1',first_viewed_on:ago(3),last_viewed_on:ago(1),view_count:6}},
  {role:'dataroom.questions',id:'q1',data:{room_id:'r1',question:'What is the cash runway?',status:'assigned',due:ago(2),asked_on:ago(4)}},
  {role:'dataroom.items',id:'i1',data:{room_id:'r1',title:'Cap table',status:'missing',due:today,owner:'CFO'}}];
 const out=run(rows);assert.equal(out.nonEmpty,true);assert.match(out.subject,/^Data Room · week of /);
 assert.match(out.text,/Series B \(fictional\): 2 parties with access/);assert.match(out.text,/New viewers this week \(1\): Ana \(fictional\) \(Alder Peak \(fictional\)\)/);
 assert.match(out.text,/Active this week \(1\):\n· Ana \(fictional\) \(Alder Peak \(fictional\)\): 6 opens/);assert.match(out.text,/Quiet, nothing opened for 10 days or more \(1\):\n· Ben \(fictional\), never opened/);
 assert.match(out.text,/Questions: 1 open, 1 overdue, 1 new this week/);assert.match(out.text,/Checklist items due \(1\):\n· \d+ \w{3} Cap table \(CFO\)/);
});
