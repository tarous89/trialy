import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readAppCommands,validateAppCommands,checkInput} from '../src/workspace/app-commands.js';
import {entry,fresh,render,approve,session,command,id,cfgFor,type Row} from './fixtures/investor-updates.js';

/* INVESTOR_UPDATES.md §10a: app commands in production QuickJS. Read commands return the app's own calculations; propose commands replay the
 * screens' handler (identical review); proposals are buffered into one review; nothing approves, sends, answers, unsubscribes or shows links. */
const cmds=readAppCommands(entry.source);
const T=(r:string)=>'investorupdates.'+r;
const strip=(cs:any[])=>JSON.parse(JSON.stringify(cs));
const CAT=(n:string)=>id(T('categories'),d=>d.name===n),PERSON=(n:string)=>id('people',d=>d.name===n),RECIP=(n:string)=>id(T('recipients'),d=>d.person_id===PERSON(n));
const UPD=(re:RegExp)=>id(T('updates'),d=>re.test(d.title)),PLAN=(n:string)=>id(T('plans'),d=>d.name===n),CLASS=(n:string)=>id(T('share_classes'),d=>d.name===n);
const MEET=(k:string)=>id(T('meetings'),d=>d.kind===k);
const READ=['overview.read','updates.list','update.read','meetings.list','meeting.read','investors.list','investor.read','categories.list','share_classes.list','plans.list','templates.list','responses.list','engagement.read','settings.read','schema.describe','integrations.read'];
const PROPOSE=['update.create_draft','update.save_blocks','update.set_levels','update.submit_for_review','meeting.create','meeting.update','investor.create','investor.update','investor.set_categories','investor.set_share_classes','category.save','share_class.save','template.save','template.save_from_update','plan.save','response.draft_answer','response.set_status','settings.save','preferences.save','labels.save','custom_field.register','record.archive'];

test('declaration: one valid single-line appCommands array with exactly the §10a families; every command answered',async()=>{
 assert.doesNotThrow(()=>validateAppCommands(entry.source));assert.match(entry.source!,/^const appCommands=\[.*\];$/m,'kept verbatim by the build');
 assert.deepEqual(cmds.filter(c=>c.mode==='read').map(c=>c.id).sort(),READ.slice().sort());assert.deepEqual(cmds.filter(c=>c.mode==='propose').map(c=>c.id).sort(),PROPOSE.slice().sort());
 assert.deepEqual(cmds.filter(c=>c.mode==='layout').map(c=>c.id),['layout.save']);assert.equal(cmds.length,39);
 for(const c of cmds){assert.doesNotMatch(c.id,/approve|\.send|unsubscribe|link|reply/,'no command to approve, send, answer, unsubscribe or show links: '+c.id);const r=await command(fresh(),c.id,{});assert.doesNotMatch(String(r.error??''),/has no command/,c.id);}
 assert.throws(()=>checkInput(cmds.find(c=>c.id==='update.read')!.input,{update_id:'x'}),/record ID|uuid/i);
 assert.equal((await command(fresh(),'update.approve',{})).ok,false);assert.equal((await command(fresh(),'update.send',{})).ok,false);
});

test('read commands return the app\'s own calculations, write nothing, never touch the exchange beyond reads, and stay within the result limit',async()=>{
 const rows=fresh();const inputs:Record<string,any>={'update.read':{update_id:UPD(/October 2026/)},'meeting.read':{meeting_id:MEET('board')},'investor.read':{recipient_id:RECIP('Mara Okafor')},'engagement.read':{update_id:UPD(/Q3 2026/)}};
 for(const id of READ){const r=await command(rows,id,inputs[id]??{});assert.equal(r.ok,true,id+': '+r.error);assert.equal(r.changes.length,0,id);assert.ok(JSON.stringify(r.result).length<64000,id+' size');
  assert.ok(!r.calls.some((c:string)=>/^exchange\.(createGroup|invite|sendEmail|reply|replyAll|prepareEmail|publishClarification)/.test(c)),id+' never prepares or changes the exchange');}
 const d=(await command(rows,'schema.describe')).result;assert.deepEqual(d.levels.map((l:any)=>[l.key,l.order]),[['everyone',0],['investors',1],['board',2]]);assert.ok(d.tables.deliveries.fields.some((f:any)=>f.key==='read_count'&&f.kind==='recorded_by_trialagents'));
 assert.deepEqual(Object.keys(d.column_groups),['investors','updates']);assert.ok(d.never_through_commands.includes('send'));
 const u=(await command(rows,'update.read',{update_id:UPD(/October 2026/)})).result;assert.equal(u.approval.steps,2);assert.equal(u.approval.next,'approver 2 approves');assert.equal(u.facts.find((f:any)=>f.id==='f3').check,'changed');
 assert.equal(u.next_draft_context.open_asks,2);assert.equal((await command(rows,'update.read',{update_id:'00000000-0000-4000-8000-000000009999'})).ok,false);
 const ov=(await command(rows,'overview.read')).result;assert.equal(ov.complete,true);assert.ok(ov.drafts.some((x:any)=>x.status==='in_review'));
});

/** The same handler: a command's proposal equals the click path's proposal for the same input. */
async function parity(cid:string,input:any,click:(s:any)=>Promise<void>,prep?:(rows:Row[])=>void){const a=fresh(),b=fresh();prep?.(a);prep?.(b);
 const viaCommand=await command(a,cid,input);assert.equal(viaCommand.ok,true,cid+': '+viaCommand.error);const s=session(b);await s.open({});await click(s);
 assert.ok(viaCommand.changes.length>0||viaCommand.layouts.length>0,cid+' proposes');assert.deepEqual(strip(viaCommand.changes),strip(s.changes),cid+' parity');return viaCommand;}
test('parity: each propose family gives exactly the click path\'s review',async()=>{
 const oct=UPD(/October 2026/),board=CAT('Board'),inv=CAT('Investors'),sa=CLASS('Series A preferred'),meet=MEET('investor_call');
 await parity('update.create_draft',{format:'email',title:'Flash: Phase 1',category_ids:[board,inv],kind:'flash'},async s=>{await s.click('add-update:email');await s.submit('save-new-update',{format:'email',title:'Flash: Phase 1',kind:'flash',['cat_'+board]:'true',['cat_'+inv]:'true'});});
 await parity('update.create_draft',{meeting_id:meet,format:'meeting_before'},async s=>{await s.click('meeting-part:'+meet+':before');});
 await parity('update.set_levels',{update_id:oct,levels:{b5:'investors'}},async s=>{await s.click('open:update:'+oct);await s.submit('save-levels',{lv_b5:'investors'});});
 await parity('update.submit_for_review',{update_id:oct},async s=>{await s.click('submit-review:'+oct);},rows=>{rows.find(r=>r.id===oct)!.data.status='drafting';});
 await parity('meeting.create',{title:'Annual shareholder meeting',kind:'shareholders',meeting_date:'2027-03-15',category_ids:[CAT('Shareholders')]},async s=>{await s.click('add:meetings');await s.submit('save-meeting',{title:'Annual shareholder meeting',kind:'shareholders',meeting_date:'2027-03-15',start_time:'',timezone:'',location:'',plan_id:'',status:'planned',notes:'',mode_cat:'1',['cat_'+CAT('Shareholders')]:true});});
 await parity('meeting.update',{meeting_id:meet,status:'cancelled'},async s=>{const m=fresh().find(r=>r.id===meet)!.data;await s.click('edit:meetings:'+meet);await s.submit('save-meeting',{title:m.title,kind:m.kind,meeting_date:m.meeting_date,start_time:m.start_time,timezone:m.timezone,location:m.location,plan_id:'',status:'cancelled',notes:'',mode_cat:'1',...Object.fromEntries(JSON.parse(m.category_ids).map((c:string)=>['cat_'+c,true]))});});
 await parity('investor.set_categories',{recipient_id:RECIP('Kenji Mori'),category_ids:[inv]},async s=>{await s.click('open:recipient:'+RECIP('Kenji Mori'));await s.submit('save-memberships',{mode_cat:'1',['cat_'+inv]:true});});
 await parity('investor.set_share_classes',{recipient_id:RECIP('Sofia Brandt'),share_class_ids:[sa]},async s=>{await s.click('open:recipient:'+RECIP('Sofia Brandt'));await s.submit('save-memberships',{mode_sc:'1',['sc_'+sa]:true});});
 await parity('investor.update',{recipient_id:RECIP('Omar Haddad'),status:'paused'},async s=>{const p=fresh().find(r=>r.id===PERSON('Omar Haddad'))!.data;await s.click('edit:recipients:'+RECIP('Omar Haddad'));await s.submit('save-investor',{status:'paused',notes:'',p_email:p.email,p_title:p.title});});
 await parity('investor.create',{person_id:PERSON('Dr. Ines Carvalho'),category_ids:[CAT('Scientific advisory board')],status:'receives',source:'manual'},async s=>{await s.click('add:recipients');await s.submit('save-investor',{person_id:PERSON('Dr. Ines Carvalho'),name:'',email:'',title:'',organization_id:'',firm:'',status:'receives',notes:'',source:'manual',mode_cat:'1',mode_sc:'1',['cat_'+CAT('Scientific advisory board')]:true});},rows=>{const i=rows.findIndex(r=>r.role===T('recipients')&&r.data.person_id===PERSON('Dr. Ines Carvalho'));rows.splice(i,1);});
 await parity('category.save',{name:'Major investors',level:'investors',description:'Holders with major-investor rights.',share_class_ids:[sa]},async s=>{await s.click('add:categories');await s.submit('save-record',{name:'Major investors',level:'investors',description:'Holders with major-investor rights.',default_template_id:'',help_on:true,questions_on:true,['sc_'+sa]:true});});
 await parity('share_class.save',{name:'Series B preferred',kind:'preferred',notes:'Pro-rata rights.'},async s=>{await s.click('add:classes');await s.submit('save-record',{name:'Series B preferred',kind:'preferred',notes:'Pro-rata rights.',sort_order:''});});
 await parity('template.save',{name:'Annual letter',format:'email',sections:[{name:'Year in review',level:'everyone',purpose:'Highlights'}],brief:'One page.'},async s=>{await s.click('add:templates');await s.submit('save-template',{name:'Annual letter',format:'email',brief:'One page.',sections_text:'Year in review | everyone | Highlights',source:'assistant'});});
 await parity('template.save_from_update',{update_id:oct,name:'Board v2'},async s=>{await s.click('tpl-from:'+oct,{name:'Board v2',brief:''});});
 await parity('plan.save',{name:'Series A – quarterly',format:'email',template_id:id(T('templates'),d=>d.kind==='investor_quarterly'),category_ids:[CAT('Series A holders')],cadence:'quarterly',approver_2:'Anna',sources:{apps:['runway'],document_ids:[],notes:'',exclusions:''}},async s=>{await s.click('add:plans');await s.submit('save-plan',{name:'Series A – quarterly',format:'email',template_id:id(T('templates'),d=>d.kind==='investor_quarterly'),after_template_id:'',cadence:'quarterly',send_by_day:'',timezone:'',approver_1:'',approver_2:'Anna',status:'active',mode_cat:'1',['cat_'+CAT('Series A holders')]:true,mode_src:'1',src_runway:true,src_notes:'',src_exclusions:''});});
 const q=id(T('responses'),d=>d.ask_key==='question'&&!d.answered_on),help=id(T('responses'),d=>d.ask_key==='cmo_intro'&&d.status==='new');
 await parity('response.draft_answer',{response_id:q,answer:'Three agencies.'},async s=>{await s.click('open:response:'+q);await s.submit('save-answer-draft',{answer:'Three agencies.'});});
 await parity('response.set_status',{response_id:help,status:'done'},async s=>{await s.click('open:response:'+help);await s.submit('save-response',{status:'done',owner:'',follow_up_due:''});});
 await parity('settings.save',{help_enabled:false},async s=>{await s.open({section:'settings'});await s.submit('save-settings',{sender_display:'organization',approval_steps:'two',help_enabled:false,questions_enabled:true,meeting_lead_days:'7',confidentiality_footer:'Confidential — prepared for {recipient_name}. Please do not forward.'});});
 await parity('preferences.save',{opening_screen:'updates'},async s=>{await s.submit('save-prefs',{opening_screen:'updates',page_size:'',ov_due:true,ov_drafts:true,ov_engagement:true,ov_responses:true});});
 await parity('labels.save',{labels:{board:'Supervisory board'}},async s=>{await s.submit('save-labels',{l_board:'Supervisory board'});});
 await parity('record.archive',{table:'share_classes',record_id:CLASS('Common')},async s=>{await s.click('archive:classes:'+CLASS('Common'));});
 const blocks=[{id:'b1',type:'text',level:'everyone',text:'Hello'}];
 await parity('update.save_blocks',{update_id:oct,blocks},async s=>{await s.click('open:update:'+oct);await s.click('block:b1');await s.submit('save-block',{level:'everyone'});},rows=>{rows.find(r=>r.id===oct)!.data.blocks=JSON.stringify(blocks);});
});

test('update.create_draft with blocks and facts (the assistant\'s draft): created in review; one-off and from chat produce the same records as the automation',async()=>{
 const rows=fresh();const r=await command(rows,'update.create_draft',{plan_id:PLAN('Investors and shareholders – quarterly update'),format:'email',period:'2026-Q4',blocks:[{id:'b1',type:'metrics',level:'investors',items:[{label:'Cash',value:'17.0',unit:'EUR m',fact:'f1'}]}],facts:[{id:'f1',claim:'Cash',value:17,unit:'EUR m',source:{kind:'chat',date:'2026-11-15'}}],drafted_by:'claude',submit:true});
 assert.equal(r.ok,true,r.error);const c=r.changes[0];assert.deepEqual([c.data.status,c.data.kind,c.data.period,c.data.drafted_by],['in_review','scheduled','2026-Q4','claude']);
 // Dedup by plan + period: a second draft for the same period is refused.
 approve(rows,r.changes);assert.match((await command(rows,'update.create_draft',{plan_id:PLAN('Investors and shareholders – quarterly update'),format:'email',period:'2026-Q4'})).error,/already an update for Q4 2026/);
 assert.match((await command(rows,'update.create_draft',{format:'email',category_ids:[CAT('Board')],blocks:[{type:'text',html:'<b>x</b>'}]})).error,/no HTML/);
});

test('buffering: one review per command; a failing step leaves no partial review; more than 50 changes are refused',async()=>{
 const rows=fresh();const r=await command(rows,'settings.save',{help_enabled:false});assert.equal(r.ok,true);assert.equal(r.calls.filter((c:string)=>c==='records.propose').length,1,'one review');
 const bad=await command(rows,'investor.set_categories',{recipient_id:RECIP('Mara Okafor'),category_ids:['00000000-0000-4000-8000-000000009999']});assert.equal(bad.ok,false);assert.equal(bad.changes.length,0);assert.ok(!bad.calls.includes('records.propose'));
 const empty:Row[]=[];const std=await command(empty,'settings.save',{});assert.equal(std.ok,true);assert.equal(std.changes.length,9,'settings + 3 categories + 5 templates in one review');
});

test('refusals: approve, send, links and answers are never reachable from a command; read-only, partial data and stale versions refuse writes',async()=>{
 const rows=fresh(),oct=UPD(/October 2026/);
 // Commands that would replay a send path are refused before anything is proposed.
 const viaClick=await render(rows,null,{kind:'command',action:'update.read',value:JSON.stringify({update_id:oct})});assert.ok(!viaClick.calls.includes('exchange.sendEmail'));
 assert.equal((await command(rows,'record.archive',{table:'responses',record_id:id(T('responses'),()=>true)})).ok,false);
 assert.equal((await command(rows,'record.archive',{table:'people',record_id:PERSON('Mara Okafor')})).ok,false,'another table\'s records are not archived here');
 const ro=await command(rows,'labels.save',{labels:{board:'X'}},{config:cfgFor(undefined,{readOnly:true})});assert.equal(ro.ok,false);assert.match(ro.error,/not change it/);
 const pv=await command(rows,'labels.save',{labels:{board:'X'}},{saved:false});assert.equal(pv.ok,false);
 const partial=await command(rows,'labels.save',{labels:{board:'X'}},{read:(v:any,rs:Row[])=>v.typeId===T('updates')?{rows:[],total:null,unavailable:true}:{rows:rs.filter(r=>r.role===v.typeId),total:rs.filter(r=>r.role===v.typeId).length}});assert.equal(partial.ok,false);assert.match(partial.error,/could not be read completely/);
 // A sent update is locked for every command.
 assert.match((await command(rows,'update.save_blocks',{update_id:UPD(/September 2026/),blocks:[]})).error,/locked/);
 // Stale version: save_blocks with an old expected_version carries it, and the review is refused at confirmation.
 const st=await command(rows,'update.save_blocks',{update_id:oct,blocks:[{id:'b1',type:'text',level:'everyone',text:'x'}],expected_version:0});assert.equal(st.changes[0].expectedVersion,0);
 // A tracked field is never writable, even if a client sends it.
 const r=await command(rows,'response.set_status',{response_id:id(T('responses'),d=>d.ask_key==='cmo_intro'),status:'done'});assert.ok(r.ok);assert.deepEqual(Object.keys(r.changes[0].data),['status']);
 // custom_field.register returns the schema change still needed when the field is not bound.
 const cf=await command(rows,'custom_field.register',{table:'meetings',key:'room_number',kind:'text',label:'Room'});assert.equal(cf.ok,true);assert.equal(cf.result.bound,false);assert.equal(cf.result.schema_change.required,true);
 assert.match((await command(rows,'custom_field.register',{table:'meetings',key:'title'})).error,/core field/);
});

test('layout.save proposes a presentation-only profile with group:column keys',async()=>{
 const r=await command(fresh(),'layout.save',{screens:['updates','overview'],hide:['investors:email','updates:read'],show:['investors.email']});assert.equal(r.ok,true,r.error);
 const l=r.layouts[0];assert.deepEqual(l.tabs.slice(0,2),['updates','overview']);assert.equal(l.visible['updates:read'],false);assert.equal(l.visible['investors:email'],true);
 assert.equal((await command(fresh(),'layout.save',{hide:['overview','updates','investors','plans','settings']})).ok,false);
 assert.match((await command(fresh(),'layout.save',{hide:['investors:nope']})).error,/Unknown screen or column/);
});
