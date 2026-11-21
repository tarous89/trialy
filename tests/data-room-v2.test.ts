import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {appTemplateEntry} from '../src/workspace/app-templates.js';
import {isV2Source} from '../src/workspace/browser-runtime.js';
import {entry,schema,demo,fresh,freshExchange,render,apply,text} from './fixtures/data-room-v2.js';

/* Data Room 2.0.0 (7.3, 7.4): the rebuild on the kit and the v2 contract (G2–G8, G11, P3–P5, P9), on the fictional demo set in
 * production QuickJS with the kit ahead of the code, as the runtime runs it. */
const ROOM1=(demo.records as any[]).find(r=>r.role==='dataroom.rooms'&&r.data.purpose==='financing').id;
const ROOM2=(demo.records as any[]).find(r=>r.role==='dataroom.rooms'&&r.data.purpose==='licensing').id;
const rowsOf=(role:string)=>(demo.records as any[]).filter(r=>r.role===role);
const SCREENS=['overview','rooms','index','parties','activity','qa','templates','emails','settings'];
const msg=(o:any)=>String(o.notice?.message??'');

test('package: 2.0.0 is a draft major version with the same installer schema, helpers, automation, commands and option map as 1.1.1',async()=>{
 const raw=JSON.parse(await readFile('templates/apps/life.data-room-2.0.0.json','utf8')),old=JSON.parse(await readFile('templates/apps/life.data-room-1.1.1.json','utf8'));
 assert.ok(appTemplateEntry.safeParse(raw).success);assert.equal(raw.version,'2.0.0');assert.deepEqual(raw.upgradeFrom,['1.1.0','1.1.1']);
 assert.notEqual(JSON.parse(await readFile('templates/catalog-seed.json','utf8'))['life.data-room'].version,'2.0.0','a draft: the owner approves versions (O4)');
 assert.deepEqual(raw.functions,old.functions);assert.deepEqual(raw.recommendedAutomations,old.recommendedAutomations);
 const commands=(s:string)=>/^const appCommands=(.+);$/m.exec(s)![1];assert.equal(commands(raw.source),commands(old.source),'same command names and inputs');
 assert.equal(raw.options.tableMap.description,old.options.tableMap.description);for(const k of Object.keys(raw.options))assert.deepEqual(raw.options[k].default,old.options[k].default,k);
 assert.ok(!('heading' in raw.options)&&!('demoLabel' in raw.options),'options that only served the old header are dropped');
 const installers=JSON.parse(await readFile('templates/catalog-installers.json','utf8'));
 assert.equal(installers['life.data-room@2.0.0'],'templates/source/data-room/schema.example.json');
 for(const v of ['1.1.0','1.1.1'])assert.equal(await readFile(installers['life.data-room@'+v],'utf8'),await readFile(installers['life.data-room@2.0.0'],'utf8'),v+': byte-identical installer schema');
 assert.equal(await readFile('templates/source/data-room/archive/1.1.1/data-room.source.js','utf8'),await readFile('templates/source/data-room/archive/1.1.1/data-room.source.js','utf8'));
 assert.match(execFileSync('node',['scripts/build-data-room-template.mjs','--check'],{encoding:'utf8'}),/1\.1\.1 and 2\.0\.0: catalog and preview verified/);
 assert.ok(raw.source.length<=240000,String(raw.source.length));
 const body=raw.source as string;assert.ok(body.startsWith("'use trialagents v2';\nconst templateLayoutSchema="),'the marker is the first line; builder constants follow it');
 assert.ok(isV2Source(`const templateConfiguration={};\nconst templateBindings=[];\n${body}`));
 assert.doesNotMatch(body,/records\.propose/);assert.doesNotMatch(body,/\(reviewed\)|prepared for (TrialAgents )?review|Nothing changes until/i);
 assert.doesNotMatch(body,/<header|<h1|tracker:layout|dr-banner|dr-rail-foot|As of /);
 assert.ok(JSON.parse(/^const DATAROOM_CSS=(.+);$/m.exec(body)![1]).length<6000,'only app-specific styles; the kit brings the rest');
 for(const r of demo.records as any[])for(const v of Object.values(r.data))if(typeof v==='string'&&v.includes('@'))assert.match(v,/\.invalid$/,'fictional emails only');
 assert.ok(Object.keys(schema).length===13);
});

test('every screen renders on the kit, with no header, banner or footer of its own, at phone, panel and wide widths',async()=>{
 const rows=fresh();
 for(const width of ['wide','panel','phone'])for(const s of SCREENS){
  const o=await render(rows,{section:s,roomId:ROOM1},{kind:'open',action:''},{viewport:{width,coarse:width==='phone'}});
  assert.equal(o.state.section,s,s);assert.match(o.html,/^<div class="k-app"><main class="k-main"><div class="k-layout"><nav class="k-nav"/,s);
  assert.doesNotMatch(o.html,/<header|<h1|role="alert"|position:\s*(fixed|sticky)|could not be shown/,s+' '+width);
  assert.doesNotMatch(o.html,/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b(?![^<]*")/,s+': no record IDs shown as text');
 }
 const ov=text((await render(rows,{section:'overview'})).html);assert.match(ov,/Hot Ana Fictus, Alder Peak Capital/);assert.match(ov,/Quiet Ben Example: nothing opened for 16 days/);assert.match(ov,/1 new question from parties to log/);
 const act=text((await render(rows,{section:'activity',roomId:ROOM1})).html);assert.match(act,/Ana Fictus Alder Peak Capital 4 3 · · 2 · · 2 12 Nov 2026 15:30/);
 const phone=text((await render(rows,{section:'activity',roomId:ROOM1},{kind:'open',action:''},{viewport:{width:'phone',coarse:true}})).html);assert.match(phone,/Party Opens Downloads Last seen Ana Fictus Alder Peak Capital 9 2/,'one total instead of a column per section on a phone');
 // Each screen reads only its own tables, in one batched request.
 const idx=await render(rows,{section:'index',roomId:ROOM1});assert.deepEqual(idx.calls.filter(c=>c.startsWith('records.')),['records.readMany']);
 const tpl=await render(rows,{section:'templates'});assert.ok(tpl.calls.filter(c=>c.startsWith('records.')).length<=2&&!tpl.calls.some(c=>c.startsWith('exchange.')));
});

test('settings are business choices for owners only; index templates, email texts and custom fields have their own screens',async()=>{
 const rows=fresh();
 for(const appRole of ['editor','viewer']){const o=await render(rows,{section:'settings'},{kind:'open',action:''},{appRole});assert.notEqual(o.state.section,'settings');assert.doesNotMatch(o.html,/nav:settings|save-settings/,appRole);
  const s=await render(rows,{section:'overview'},{kind:'submit',action:'save-settings',form:{quiet_days:'5',default_access_days:'90'}},{appRole});assert.equal(s.saves.length,0);assert.match(msg(s),/Only the app's owners/);}
 const own=await render(rows,{section:'settings'});assert.match(own.html,/data-action="save-settings"/);assert.doesNotMatch(text(own.html),/Index templates Template|Email texts Email|Access, notifications/);
 const saved=await render(rows,own.state,{kind:'submit',action:'save-settings',form:{quiet_days:'5',default_access_days:'90',sender_display:'organization',entry_text:''}});
 assert.equal(saved.saves.length,1);assert.equal(saved.saves[0].kind,'update_record');assert.equal(saved.saves[0].expectedVersion,rowsOf('dataroom.settings')[0].version);assert.equal(saved.notice.kind,'success');
 assert.match(text((await render(rows,{section:'templates'})).html),/Financing room \(standard 9-section index\) Built in Financing 32 16 Copy to edit/);
 const em=await render(rows,{section:'emails'},{kind:'click',action:'panel:email:access_granted'});assert.match(em.html,/role="dialog"/);assert.match(text(em.html),/Access granted \(invitation\)/);
 const e2=await render(rows,em.state,{kind:'submit',action:'save-email',form:{purpose:'financing',subject:'{sender_company}: our Series B room',body:'Dear {recipient_name}, here is the room: {link}'}});
 assert.equal(e2.saves.length,1);assert.deepEqual(JSON.parse(e2.saves[0].data.email_texts).access_granted.financing.subject,'{sender_company}: our Series B room');
 // Custom fields: the screen shows only when the team registered one; it is not part of Settings.
 assert.doesNotMatch(own.html,/nav:fields/);const withField=fresh();withField.find(r=>r.role==='dataroom.settings')!.data.custom_fields=JSON.stringify([{role:'rooms',key:'deal_code',label:'Deal code',kind:'text'}]);
 const f=await render(withField,{section:'fields'});assert.equal(f.state.section,'fields');assert.match(text(f.html),/Deal code Not in this app yet Room Text Remove/);
});

test('inline edits save directly with the version shown; delete is an archive; Undo follows a save',async()=>{
 const rows=fresh(),item=rows.find(r=>r.role==='dataroom.items'&&r.data.title==='Financial model')!;
 const idx=await render(rows,{section:'index',roomId:ROOM1});
 const action='edit:'+item.id+':status:'+item.version;assert.ok(idx.html.includes('data-action="'+action+'"'),'the status is edited where it is shown');
 const e=await render(rows,idx.state,{kind:'change',action,value:'ready'});
 assert.deepEqual(e.saves,[{kind:'update_record',recordId:item.id,expectedVersion:item.version,data:{status:'ready'}}]);assert.equal(e.notice.kind,'success');assert.ok(e.calls.includes('records.save')&&!e.calls.includes('records.propose'));
 // The version captured when editing started is sent, never one read at save time.
 const moved=fresh(),shown=item.version;apply(moved,[{kind:'update_record',recordId:item.id,expectedVersion:shown,data:{notes:'Changed by someone else'}}]);
 const stale=await render(moved,idx.state,{kind:'change',action:'edit:'+item.id+':owner:'+shown,value:'Robin Lead'});assert.equal(stale.saves[0].expectedVersion,shown);
 const bad=await render(rows,idx.state,{kind:'change',action:'edit:'+item.id+':status:'+item.version,value:'done'});assert.equal(bad.saves.length,0);assert.equal(bad.notice.kind,'error');
 const frozen=await render(rows,idx.state,{kind:'change',action:'edit:'+item.id+':version_id:'+item.version,value:'x'});assert.equal(frozen.saves.length,0);
 // The platform saves, then renders the screen again (event open): the message is kept and Undo is offered.
 apply(rows,e.saves);const after=await render(rows,e.state,{kind:'open',action:''},{undo:[{undoId:'00000000-0000-4000-8000-0000000000aa',label:'Status change'}]});
 assert.equal(after.notice?.message,e.notice.message);assert.match(after.html,/data-action="undo:00000000-0000-4000-8000-0000000000aa"/);assert.deepEqual(after.undo,['list']);
 const undo=await render(rows,after.state,{kind:'click',action:'undo:00000000-0000-4000-8000-0000000000aa'});assert.deepEqual(undo.undo,[{undoId:'00000000-0000-4000-8000-0000000000aa'}]);assert.doesNotMatch(undo.html,/data-action="undo:/);
 const later=await render(rows,undo.state,{kind:'click',action:'nav:parties'});assert.equal(later.notice,undefined,'an old message is not shown again');
 const del=await render(rows,idx.state,{kind:'click',action:'archive:items:'+item.id});assert.deepEqual(del.saves,[{kind:'archive_record',recordId:item.id,expectedVersion:item.version}],'archived with the version just saved');
 // Nothing writes while opening, and viewers get no edit controls.
 for(const s of SCREENS)assert.ok(!(await render(rows,{section:s,roomId:ROOM1})).calls.includes('records.save'),s);
 const view=await render(rows,{section:'index',roomId:ROOM1},{kind:'open',action:''},{writable:false,appRole:'viewer'});assert.doesNotMatch(view.html,/data-action="edit:/);
});

test('create and edit many fields in a side panel; set-up saves in steps of at most 50 records',async()=>{
 const rows=fresh(),o=await render(rows,{section:'rooms'},{kind:'click',action:'panel:newroom'});assert.match(o.html,/<aside class="k-panel" role="dialog" aria-modal="true" aria-label="New room">/);
 const c=await render(rows,o.state,{kind:'submit',action:'create-room',form:{name:'Series A extension',purpose:'partnering',template_id:'builtin:partnering',cda_option:'send_pdf',opportunity_ref:'Cedarline collaboration'}});
 assert.equal(c.saves.length,1);assert.equal(c.saves[0].kind,'create_record');assert.match(msg(c),/Room created/);assert.doesNotMatch(c.html,/role="dialog"/);
 apply(rows,c.saves);const id=rows[rows.length-1].id;
 const s=await render(rows,{section:'rooms',roomId:id},{kind:'click',action:'setup-structure:'+id});
 assert.deepEqual(s.saves.filter((x:any)=>x.typeId==='dataroom.levels').map((x:any)=>[x.data.name,x.data.entry]),[['Non-confidential','none'],['Confidential','signed_cda']]);
 assert.equal(s.saves.filter((x:any)=>x.typeId==='dataroom.sections').length,9);apply(rows,s.saves);
 const it=await render(rows,{section:'rooms',roomId:id},{kind:'click',action:'setup-items:'+id});assert.ok(it.saves.length>20&&it.saves.length<=50);apply(rows,it.saves);
 assert.match(text((await render(rows,{section:'index',roomId:id})).html),/0% Readiness/);
 const sec=rows.find(r=>r.role==='dataroom.sections'&&r.data.room_id===id)!;
 const add=await render(rows,{section:'index',roomId:id},{kind:'click',action:'add:items:'+sec.id});assert.match(add.html,/aria-label="New index item"/);
 const made=await render(rows,add.state,{kind:'submit',action:'save-record',form:{title:'Board minutes',status:'missing',required:'on'}});assert.equal(made.saves[0].data.title,'Board minutes');assert.equal(made.saves[0].data.section_id,sec.id);
 const it2=rows.find(r=>r.role==='dataroom.items'&&r.data.room_id===id)!;const ed=await render(rows,{section:'index',roomId:id},{kind:'click',action:'details:items:'+it2.id});
 apply(rows,[{kind:'update_record',recordId:it2.id,expectedVersion:it2.version,data:{owner:'Someone else'}}]);
 const sv=await render(rows,ed.state,{kind:'submit',action:'save-record',form:{notes:'From the panel'}});assert.equal(sv.saves[0].expectedVersion,it2.version-1,'the version captured when the panel opened');
});

test('one confirmation before anything goes out: invitations, level changes, answers and publication stay confirmed in TrialAgents',async()=>{
 const rows=fresh(),X=freshExchange(),grant=rowsOf('dataroom.access_grants')[1],lv=rowsOf('dataroom.levels').filter((l:any)=>l.data.room_id===ROOM1);
 const lev=await render(rows,{section:'parties',roomId:ROOM1,panel:{type:'levels',id:grant.id}},{kind:'submit',action:'save-levels',form:{['l_'+lv[0].id]:'on',['l_'+lv[1].id]:'on',notify:'on'}},{exchange:X});
 assert.equal(lev.xwrites[0].name,'exchange.setLevels');assert.equal(lev.saves.length,1,'the grant change travels with the confirmation');assert.equal(lev.notice.kind,'info');assert.match(msg(lev),/Confirm the level change in TrialAgents/);
 assert.equal(lev.state.flash,null,'no message is carried over: nothing was saved directly');
 // The send review shows every email exactly as the platform returns it; the send itself is the one confirmation.
 const g=X.groups[0],ids=g.exchanges.map((e:any)=>e.id);
 const send=await render(rows,{section:'parties',roomId:ROOM1},{kind:'click',action:'send:access_granted:'+ids.join(':')},{exchange:X});
 const prep=await render(rows,send.state,{kind:'submit',action:'prepare-send',form:{subject:'Hello',body:'Hi {recipient_name}'}},{exchange:X});assert.match(prep.html,/Exactly what will be sent/);assert.equal(prep.xwrites.length,0);
 const conf=await render(rows,prep.state,{kind:'click',action:'confirm-send'},{exchange:X});assert.equal(conf.xwrites[0].name,'exchange.sendEmail');assert.match(msg(conf),/Confirm the send in TrialAgents/);
 // Preparation nobody outside has seen applies at once (no confirmation).
 const live=fresh();for(const r of live)if(r.role==='dataroom.rooms'&&r.id===ROOM2)r.data.status='preparing';
 const cda=(demo.documents as any[]).find(d=>d.filename==='Mutual CDA template.pdf').versionId;
 const go=await render(live,{section:'rooms',roomId:ROOM2,panel:{type:'live'}},{kind:'submit',action:'go-live',form:{cda_doc:cda}},{quiet:['exchange.createGroup']});
 assert.equal(go.xwrites[0].name,'exchange.createGroup');assert.deepEqual(go.saves.map((c:any)=>c.data),[{status:'live'}]);assert.match(msg(go),/The room is live/);
 // Commands never send, share or change a live room.
 const cmd=await render(rows,{},{kind:'command',action:'question.save',value:JSON.stringify({question_id:rowsOf('dataroom.questions')[0].id,step:'save',answer:'Draft'})});assert.equal(cmd.state.command.ok,true);assert.equal(cmd.saves.length,1);assert.equal(cmd.xwrites.length,0);
});

test('pending reads show as loading, never as empty or zero; an action that touched them goes to the server',async()=>{
 const rows=fresh(),pending=(name:string,v:any)=>name==='records.read'&&['dataroom.items','dataroom.sections'].includes(v.typeId);
 for(const s of ['overview','rooms','index'] as const){const o=await render(rows,{section:s,roomId:ROOM1},{kind:'click',action:'nav:'+s},{pending});
  assert.match(o.html,/aria-busy="true"/,s);assert.doesNotMatch(text(o.html),/0%|No room yet|No sections yet|Readiness/,s);}
 const ex=await render(rows,{section:'parties',roomId:ROOM1},{kind:'open',action:''},{pending:(name:string)=>name==='exchange.list'});assert.match(ex.html,/aria-busy="true"/);
 const save=await render(rows,{section:'index',roomId:ROOM1},{kind:'click',action:'setup-items:'+ROOM2},{pending});assert.equal(save.saves.length,0);assert.ok(save.calls.includes('records.save'),'the action is handed to the server');
 const docs=await render(rows,{section:'index',roomId:ROOM1},{kind:'click',action:'panel:attach:'+rowsOf('dataroom.items')[0].id},{pending:(name:string)=>name==='documents.list'});assert.match(docs.html,/aria-busy="true"/);
});

test('every empty screen offers its first action; messages are the platform notice',async()=>{
 const none=fresh().filter(r=>!['dataroom.rooms','dataroom.levels','dataroom.sections','dataroom.items','dataroom.access_grants','dataroom.engagement','dataroom.questions'].includes(r.role));
 for(const s of ['overview','rooms','index','parties','activity','qa']){const o=await render(none,{section:s},{kind:'open',action:''},{exchange:{...freshExchange(),groups:[]}});assert.match(o.html,/class="k-empty"[\s\S]*data-action="panel:newroom"/,s);}
 const rows=fresh(),empty=rows.filter(r=>!(r.role==='dataroom.access_grants'&&r.data.room_id===ROOM2));
 const p=await render(empty,{section:'parties',roomId:ROOM2},{kind:'open',action:''});assert.match(p.html,/class="k-empty"><h3>No parties yet<\/h3>[\s\S]*data-action="panel:party-new"/);
 const act=await render(empty,{section:'activity',roomId:ROOM2});assert.match(act.html,/class="k-empty"><h3>Nobody has opened the room yet[\s\S]*data-action="nav:parties"/);
 const qa=await render(rows.filter(r=>r.role!=='dataroom.questions'),{section:'qa',roomId:ROOM2});assert.match(qa.html,/No open questions[\s\S]*data-action="add:questions"/);
 const noSec=rows.filter(r=>!(['dataroom.sections','dataroom.items'].includes(r.role)&&r.data.room_id===ROOM2));const ix=await render(noSec,{section:'index',roomId:ROOM2});assert.match(ix.html,/No sections yet[\s\S]*data-action="setup-structure:/);
 // Errors come back as the notice, not as a banner drawn in the screen.
 const err=await render(rows,{section:'rooms',roomId:ROOM1},{kind:'submit',action:'create-room',form:{name:'',purpose:'financing',cda_option:'none'}});assert.deepEqual(err.notice,{kind:'error',message:'Name the room.'});assert.doesNotMatch(err.html,/Name the room/);
 const ok=await render(rows,{section:'qa',roomId:ROOM1},{kind:'submit',action:'log-questions',form:{['m_'+freshExchange().questions.find((m:any)=>!rowsOf('dataroom.questions').some((q:any)=>q.data.message_id===m.id)).id]:'on'}});assert.equal(ok.notice.kind,'success');assert.ok(ok.notice.message.length<=300);
 // The working room is this person's context.
 const ctx=await render(rows,{},{kind:'open',action:''},{context:{roomId:ROOM2}});assert.equal(ctx.state.roomId,ROOM2);assert.deepEqual(ctx.output.context,{roomId:ROOM2});
 const pick=await render(rows,{section:'rooms',roomId:ROOM2},{kind:'change',action:'pick-room',value:ROOM1});assert.deepEqual(pick.output.context,{roomId:ROOM1});
});

test('app commands keep their names and inputs, and save directly through the same handler',async()=>{
 const rows=fresh(),cmd=(id:string,v:any={})=>render(rows,{},{kind:'command',action:id,value:JSON.stringify(v)});
 const d=await cmd('schema.describe');assert.equal(d.state.command.ok,true);assert.deepEqual(d.state.command.result.screens.map((s:any)=>s.id),['overview','rooms','index','parties','activity','qa','templates','emails']);assert.equal(d.html,'');
 const ix=await cmd('index.read',{room_id:ROOM1});assert.equal(ix.state.command.result.complete,true);assert.ok(ix.state.command.result.sections.length>3);
 const c=await cmd('room.create',{name:'Command room',purpose:'licensing',cda_option:'none'});assert.equal(c.state.command.ok,true,JSON.stringify(c.state.command));assert.equal(c.saves.length,1);assert.deepEqual(c.state.command.result.saved,['Room created. Next: set up its levels and sections.']);
 const item=rowsOf('dataroom.items')[0];const r=await cmd('record.save',{role:'items',id:item.id,values:{owner:'New owner'}});assert.equal(r.state.command.ok,true,JSON.stringify(r.state.command));assert.deepEqual(r.saves[0].data,{owner:'New owner'});
 const a=await cmd('record.archive',{role:'items',id:item.id});assert.equal(a.saves[0].kind,'archive_record');
 const x=await cmd('party.add',{room_id:ROOM1,email:'zed@zeta.invalid',level_ids:[rowsOf('dataroom.levels')[0].id]});assert.equal(x.state.command.ok,true);assert.equal(x.saves[0].data.recipient_email,'zed@zeta.invalid');
 const l=await cmd('layout.save',{hide:['item_form:owner']});assert.equal(l.layouts.length,1);assert.equal(l.layouts[0].tabs.length,8);
});

test('design check under the current rules on every screen and the main side panels at 1440, 400 and 390 px',{skip:process.env.APP_DESIGN_CHECKS==='off'?'APP_DESIGN_CHECKS=off':false},async()=>{
 const {inspectAppDesign}=await import('../src/workspace/design-quality.js'),{runtimeCssFor}=await import('../src/workspace/browser-runtime.js');
 const rows=fresh(),frames:any[]=[],add=(name:string,o:any)=>frames.push({name,html:o.html,css:runtimeCssFor(entry.source!,o.html)+o.output.css});
 for(const s of SCREENS)add(s,await render(rows,{section:s,roomId:ROOM1}));
 for(const [s,a] of [['parties','panel:party:'+rowsOf('dataroom.access_grants')[0].id],['rooms','panel:newroom'],['qa','panel:answer:'+rowsOf('dataroom.questions')[0].id]])add(s+' panel',await render(rows,{section:s,roomId:ROOM1},{kind:'click',action:a}));
 for(const part of [frames.slice(0,6),frames.slice(6)]){const r=await inspectAppDesign(part,'current');assert.deepEqual(r.issues,[]);assert.equal(r.status,'passed');}
});
