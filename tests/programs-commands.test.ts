import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execute} from '../src/foundation/runtime.js';
import {appTemplates} from '../src/workspace/app-templates.js';
import {readAppCommands} from '../src/workspace/app-commands.js';
import {readCustomLayout,updateCustomLayout} from '../src/shared/custom-layout.js';
import {readRecipes,validateRecipeDeclarations} from '../src/automations/recipes-schema.js';
import {validateAppFunctions} from '../src/workspace/app-functions-schema.js';

/* Programs 2.2.0 (PROGRAMS.md §14): app commands with click parity, the program team and app-kept notification fields,
 * form customization, Edit in Runway, the weekly digest helpers and the install recommendations. Production QuickJS, fictional data. */
const entry=await appTemplates.read({templateId:'life.project-oversight',version:'2.2.0'});
const schema=JSON.parse(await readFile('templates/source/project-oversight/schema.example.json','utf8'));
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(r=>[r,{typeId:r,fields:schema[r].logicalFields,writableFields:r==='people'?[]:Object.keys(schema[r].logicalFields)}]));
const bindings=roles.map(r=>({typeId:r,fields:Object.values(schema[r].logicalFields)}));
const AS_OF='2026-11-16';
const cfgOf=(over:any={})=>({...entry.defaults,tableMap:JSON.stringify(map),asOfOverride:AS_OF,...over});
const source=(config:any=cfgOf(),b:any[]=bindings)=>`const templateConfiguration=${JSON.stringify(config)};\nconst templateBindings=${JSON.stringify(b)};\n${entry.source}`;
type Row={id:string,version:number,role:string,data:any};
async function render(rows:Row[],state:any={},event:any={kind:'open',action:''},opts:any={}){
 const changes:any[]=[],layouts:any[]=[];
 const output:any=await execute(source(opts.config,opts.bindings),{saved:opts.saved??true,writable:opts.writable??true,state,event},async(name,v:any)=>{
  if(name==='records.propose'){changes.push(...v);return {status:'proposed'};}
  if(name==='layout.propose'){layouts.push(v);return {status:'proposed'};}
  if(name==='integrations.list')return {integrations:opts.integrations??[]};
  assert.equal(name,'records.read');
  const all=rows.filter(r=>r.role===v.typeId).map(r=>({id:r.id,version:r.version,data:r.data}));
  return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};
 });return {output,changes,layouts,html:output.html as string,state:output.state};
}
const command=async(rows:Row[],id:string,input:any={},opts:any={})=>{const r=await render(rows,null,{kind:'command',action:id,value:JSON.stringify(input),form:{}},opts);return {...r.state.command,changes:r.changes,layouts:r.layouts};};
function approve(rows:Row[],changes:any[]){for(const c of changes){if(c.kind==='create_record')rows.push({id:randomUUID(),version:0,role:c.typeId,data:c.data});else{const r=rows.find(x=>x.id===c.recordId)!;if(r.version!==c.expectedVersion)throw Error('stale version');r.data={...r.data,...c.data};r.version++;}}}
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ');
// A person's submit posts every rendered field of the open form as text.
const posted=(html:string,draft:any)=>Object.fromEntries([...html.matchAll(/name="([a-z_]+)" data-ui-state="true" data-action="draft:/g)].map(m=>[m[1],String(draft[m[1]]??'')]));
const ANA='3f0b7c1e-2a4d-4c6e-9f10-0a1b2c3d4e5f',BEN='7d2e9a40-1b3c-4d5e-8f60-112233445566';

function dataset(){
 const rows:Row[]=[];const add=(role:string,data:any)=>{const id=randomUUID();rows.push({id,version:0,role,data});return id;};
 add('programs.settings',{functions:'cmc, nonclinical, clinical, regulatory, other',stages:'',due_soon_days:90,update_day:5,reminder_days:7});
 const p1=add('programs',{name:'PX-101 (fictional)',stage:'ind_enabling',status:'active',lead:'Ana Ruiz',health:'amber',health_rationale:'CMC tight',health_date:'2026-11-02',archived:false});
 const p2=add('programs',{name:'PX-202 (fictional)',stage:'preclinical',status:'active',health:'unassessed',archived:false});
 add('programs.team',{program_id:p1,name:'Ana Ruiz',member_id:ANA,role:'CMC lead',added_on:'2026-11-01',archived:false});
 add('programs.team',{program_id:p1,name:'Ben Ode',role:'Clinical lead',archived:false});
 const I=(o:any)=>add('programs.plan_items',{program_id:p1,item_type:'milestone',function:'cmc',status:'planned',is_key:false,archived:false,...o});
 const gmp=I({name:'GMP batch',owner:'Ana Ruiz',owner_member_id:ANA,start_date:'2026-10-01',end_date:'2027-01-31',baseline_start:'2026-10-01',baseline_end:'2027-01-31',remind_on:'2027-01-24',assigned_on:'2026-11-01'});
 const tox=I({name:'GLP tox report',function:'nonclinical',owner:'Ben Ode',start_date:'2027-02-01',end_date:'2027-02-28',baseline_start:'2027-02-01',baseline_end:'2027-02-28',predecessor_id:gmp});
 const ind=I({name:'IND submission',function:'regulatory',start_date:'2027-03-01',end_date:'2027-03-31',baseline_end:'2027-03-31',predecessor_id:tox,is_key:true});
 const late=I({name:'Stability protocol',item_type:'activity',owner:'Ana Ruiz',owner_member_id:ANA,end_date:'2026-11-10',status:'in_progress'});
 const soon=I({name:'Release spec',owner:'Ana Ruiz',owner_member_id:ANA,end_date:'2026-11-20',status:'planned',remind_on:'2026-11-16'});
 const gate=add('programs.decisions',{name:'IND go / no-go',program_id:p1,kind:'gate',target_date:'2026-12-01',criteria:'[met] Tox plan\n[open] GMP batch released',outcome:'pending',archived:false});
 const risk=add('programs.raid',{name:'CDMO capacity',program_id:p1,raid_type:'risk',likelihood:'high',impact:'high',owner:'Ana Ruiz',owner_member_id:ANA,next_review:'2026-11-12',status:'open',archived:false});
 const assum=add('programs.raid',{name:'Tox slot holds',program_id:p1,raid_type:'assumption',likelihood:'medium',impact:'high',owner:'Ben Ode',next_review:'2026-12-15',status:'open',archived:false});
 add('programs.slips',{plan_item_id:late,changed_on:'2026-11-13',old_end:'2026-11-03',new_end:'2026-11-10',days:7,reason:'manufacturing',detail:''});
 add('programs.updates',{program_id:p1,month:'2026-11-01',health:'amber',summary:'On track except CMC.'});
 return {rows,p1,p2,gmp,tox,ind,late,soon,gate,risk,assum};
}

test('the catalog declares every command as data; each read runs, answers and writes nothing',async()=>{
 assert.equal(entry.version,'2.2.0');
 const commands=readAppCommands(entry.source);assert.equal(commands.length,27);
 assert.deepEqual([...new Set(commands.map(c=>c.mode))].sort(),['layout','propose','read']);
 const d=dataset(),inputs:any={'item.drivers':{item_id:d.ind},'item.impact':{item_id:d.gmp,end_date:'2027-02-21'},'report.preview':{month:'2026-11'}};
 for(const c of commands.filter(c=>c.mode==='read')){const r=await command(d.rows,c.id,inputs[c.id]??{});assert.equal(r.ok,true,c.id+': '+r.error);assert.equal(r.changes.length,0,c.id+' writes nothing');}
 assert.equal((await command(d.rows,'nope')).ok,false);
 const desc=(await command(d.rows,'schema.describe')).result;
 assert.ok(desc.forms.items.fields.some((f:any)=>f.key==='owner'));assert.ok(!desc.forms.items.fields.some((f:any)=>['owner_member_id','remind_on','assigned_on'].includes(f.key)),'app-kept fields are not form fields');
 assert.deepEqual(desc.commands,commands.map(c=>c.id));assert.ok(desc.layout.groups.item_form.includes('notes'));
 // An unsaved preview renders but proposes nothing.
 const prev=await command(d.rows,'item.save',{id:d.tox,fields:{owner:'Ana Ruiz'}},{saved:false});assert.equal(prev.ok,false);assert.equal(prev.changes.length,0);
});

test('a date move by command proposes exactly what the click path proposes: the item, one slip, pushed successors',async()=>{
 const d=dataset();
 const impact=await command(d.rows,'item.impact',{item_id:d.gmp,end_date:'2027-02-21'});
 assert.equal(impact.result.slip_required,true);assert.deepEqual(impact.result.downstream.map((m:any)=>[m.name,m.to]),[['GLP tox report','2027-03-21'],['IND submission','2027-04-21']]);
 const input={id:d.gmp,fields:{end_date:'2027-02-21'},slip_reason:'cro_vendor',slip_detail:'CDMO line',accept_downstream:true};
 const cmd=await command(d.rows,'item.save',input);assert.equal(cmd.ok,true,cmd.error);
 const open=await render(d.rows,{section:'plan'},{kind:'click',action:'edit:items:'+d.gmp});
 const click=await render(d.rows,open.state,{kind:'submit',action:'save-record',form:{...posted(open.html,open.state.editor.draft),end_date:'2027-02-21',slip_reason:'cro_vendor',slip_detail:'CDMO line',accept_downstream:'true'}});
 assert.deepEqual(cmd.changes,click.changes,'byte-identical proposals');
 assert.equal(cmd.changes.filter((c:any)=>c.typeId==='programs.slips').length,3,'the moved item and its two baselined successors');
 // The owner's reminder follows the new end date (7 days before); owners without a member ID get none.
 const gmpWrite=cmd.changes.find((c:any)=>c.recordId===d.gmp);assert.equal(gmpWrite.data.remind_on,'2027-02-14');assert.equal(gmpWrite.data.owner_member_id,undefined,'owner unchanged');
 assert.equal(cmd.changes.find((c:any)=>c.recordId===d.tox).data.remind_on,undefined);
 // A later committed date without a reason is refused, and a failing command leaves no partial review.
 const bad=await command(d.rows,'item.save',{id:d.gmp,fields:{end_date:'2027-02-21'}});assert.equal(bad.ok,false);assert.match(bad.error,/slip reason/);assert.equal(bad.changes.length,0);
 assert.match((await command(d.rows,'item.save',{id:d.gmp,fields:{remind_on:'2027-01-01'}})).error,/kept by the app/);
 assert.match((await command(d.rows,'item.save',{id:d.gmp,fields:{colour:'red'}})).error,/Not a field/);
});

test('program team: owners get member links, assignment and reminder dates; finished work never reminds; team changes are caught up',async()=>{
 const d=dataset();
 // A new item owned by a team member with a member ID: linked, assigned today, reminded 7 days before.
 const add=await command(d.rows,'item.save',{fields:{name:'Drug product release',program_id:d.p1,item_type:'milestone',function:'cmc',owner:'Ana Ruiz',end_date:'2027-02-10',status:'planned'}});
 assert.equal(add.ok,true,add.error);assert.deepEqual([add.changes[0].data.owner_member_id,add.changes[0].data.assigned_on,add.changes[0].data.remind_on],[ANA,AS_OF,'2027-02-03']);
 // Lead time already passed: reminded today. Reassigning to a name without a member ID clears the link and the reminder.
 const tight=await command(d.rows,'item.save',{id:d.tox,fields:{owner:'Ana Ruiz',end_date:'2027-02-28'}});
 assert.deepEqual([tight.changes[0].data.owner_member_id,tight.changes[0].data.assigned_on,tight.changes[0].data.remind_on],[ANA,AS_OF,'2027-02-21']);
 const away=await command(d.rows,'item.save',{id:d.soon,fields:{owner:'Ben Ode'}});assert.deepEqual([away.changes[0].data.owner_member_id,away.changes[0].data.assigned_on,away.changes[0].data.remind_on],[null,null,null]);
 const near=await command(d.rows,'item.save',{id:d.soon,fields:{name:'Release spec v2'}});assert.equal(near.changes[0].data.remind_on,undefined,'an unchanged reminder date is kept');
 // Done or cancelled work, archived records and closed RAID entries have no reminder.
 const done=await command(d.rows,'item.save',{id:d.soon,fields:{status:'done'}});assert.equal(done.changes[0].data.remind_on,null);
 const arch=await command(d.rows,'record.archive',{role:'items',id:d.soon});assert.equal(arch.changes[0].data.archived,true);assert.equal(arch.changes[0].data.remind_on,null);
 const review=await command(d.rows,'record.save',{role:'raid',id:d.risk,fields:{next_review:'2026-12-01'}});assert.equal(review.changes[0].data.remind_on,'2026-12-01');
 const reviewed=structuredClone(d.rows);approve(reviewed,review.changes);
 const closed=await command(reviewed,'record.save',{role:'raid',id:d.risk,fields:{status:'closed'}});assert.equal(closed.changes[0].data.remind_on,null);
 // Adding a member ID to a team member: added_on is set (their welcome notice); then Update owners and reminders links their items.
 const ben=d.rows.find(r=>r.role==='programs.team'&&r.data.name==='Ben Ode')!;
 const link=await command(d.rows,'team.save',{id:ben.id,fields:{member_id:BEN}});assert.equal(link.ok,true,link.error);assert.equal(link.changes[0].data.added_on,AS_OF);
 assert.match((await command(d.rows,'team.save',{fields:{program_id:d.p1,name:'ana ruiz'}})).error,/already on this program team/);
 assert.match((await command(d.rows,'team.save',{id:ben.id,fields:{member_id:'ben@example.invalid'}})).error,/UUID/);
 approve(d.rows,link.changes);
 const waiting=(await command(d.rows,'team.read')).result;assert.equal(waiting.updates_waiting,2,'the tox report and the assumption are Ben\'s');
 const settingsView=text((await render(d.rows,{section:'settings'})).html);assert.match(settingsView,/2 items need the owner link or reminder date updated/);assert.match(settingsView,/Ben Ode Clinical lead On/);
 const ref=await command(d.rows,'reminders.refresh');assert.equal(ref.ok,true,ref.error);
 assert.deepEqual(ref.changes.map((c:any)=>[c.recordId,c.data.owner_member_id,c.data.assigned_on,c.data.remind_on]).sort(),[[d.tox,BEN,AS_OF,'2027-02-21'],[d.assum,BEN,AS_OF,'2026-12-15']].sort());
 approve(d.rows,ref.changes);assert.equal((await command(d.rows,'reminders.refresh')).ok,false,'nothing left to update');
 const det=text((await render(d.rows,{section:'plan',detail:{role:'items',id:d.tox}})).html);assert.match(det,/Notifications Ben Ode is notified; reminder on 21 Feb 2027/);
});

test('gates, baselines, promotion, reports and settings by command match their buttons',async()=>{
 const d=dataset();
 const g={gate_id:d.gate,outcome:'conditional',decided_on:'2026-12-01',approver:'Board',rationale:'Go once the batch is released',follow_ups:[{name:'Batch release confirmation',end_date:'2027-02-15',function:'cmc'}],cancel_item_ids:[d.soon]};
 const cmd=await command(d.rows,'gate.record',g);assert.equal(cmd.ok,true,cmd.error);
 let s=(await render(d.rows,{section:'decisions'},{kind:'click',action:'outcome:'+d.gate})).state;s=(await render(d.rows,s,{kind:'click',action:'gate-follow-add'})).state;
 const click=await render(d.rows,s,{kind:'submit',action:'gate-submit',form:{outcome:'conditional',decided_on:'2026-12-01',approver:'Board',rationale:'Go once the batch is released',follow_name_0:'Batch release confirmation',follow_date_0:'2027-02-15',follow_fn_0:'cmc',['cancel_'+d.soon]:'true'}});
 assert.deepEqual(cmd.changes,click.changes);assert.equal(cmd.changes.find((c:any)=>c.recordId===d.soon).data.remind_on,null,'a cancelled milestone stops reminding');
 assert.match((await command(d.rows,'gate.record',{...g,rationale:''})).error??'',/rationale|Missing/);
 const base=await command(d.rows,'baseline.set',{program_id:d.p1});assert.equal(base.ok,true,base.error);assert.equal(base.result.items,2,'the two unbaselined items');
 const reset=await command(d.rows,'baseline.reset',{item_id:d.gmp,reason:'Re-plan after CDMO change'});assert.match(reset.changes[0].data.notes,/Re-plan after CDMO change/);
 const promo=await command(d.rows,'raid.promote',{id:d.assum,to:'risk'});assert.equal(promo.changes.length,2);assert.equal(promo.changes[0].data.raid_type,'risk');
 const rep=await command(d.rows,'report.save',{month:'2026-11',title:'November report'});assert.equal(rep.ok,true,rep.error);assert.equal(JSON.parse(rep.changes[0].data.contents).month,'2026-11');
 const set=await command(d.rows,'settings.save',{fields:{reminder_days:14}});assert.equal(set.changes[0].data.reminder_days,14);
 assert.match((await command(d.rows,'settings.save',{fields:{reminder_days:90}})).error,/1 to 60/);
 // Health stays a dated human judgement, by command too.
 assert.match((await command(d.rows,'program.save',{id:d.p2,fields:{health:'green'}})).error,/rationale and the assessment date/);
});

test('read commands return the figures the screens show',async()=>{
 const d=dataset();
 const ov=(await command(d.rows,'overview.read')).result,screen=text((await render(d.rows,{section:'overview'})).html);
 assert.equal(ov.next_key_milestone.name,'IND submission');assert.ok(screen.includes('IND submission · PX-101 (fictional)'));
 assert.equal(ov.kpis.overdue_items,1);assert.match(screen,/Overdue items 1 /);
 for(const e of ov.exceptions)assert.ok(screen.includes(e.slice(0,40)),e);
 const tl=(await command(d.rows,'timeline.read',{program_id:d.p1})).result.programs[0];assert.deepEqual(tl.critical_path.items.map((x:any)=>x.name),['GMP batch','GLP tox report','IND submission']);
 const gates=(await command(d.rows,'gates.read')).result.items[0];assert.deepEqual([gates.met,gates.total,gates.days_to],[1,2,15]);
 const raid=(await command(d.rows,'raid.read')).result;assert.equal(raid.matrix_open['high×high'],1);assert.equal(raid.items.find((x:any)=>x.id===d.risk).past_review,true);
});

test('attention.read and both digest helpers agree; nothing important means no email',async()=>{
 const d=dataset();const att=(await command(d.rows,'attention.read')).result;
 assert.deepEqual(Object.fromEntries(Object.entries(att.attention).map(([k,v]:any)=>[k,v.map((x:any)=>x.name)])),{overdue:['Stability protocol'],due_soon:['Release spec'],slips:['Stability protocol'],gates:['IND go / no-go'],reviews:['CDMO capacity'],stale_health:['PX-202 (fictional)'],missing_update:['PX-202 (fictional)']});
 assert.equal(att.count,7);
 // Run the installed helpers the way the function runtime does: appRoles injected, read-only records.read, today from the clock.
 const raw=JSON.parse(await readFile('templates/apps/life.project-oversight-2.2.0.json','utf8')),fns=validateAppFunctions(raw,roles);assert.deepEqual(fns.map(f=>f.name),['digest_brief','digest_email']);
 const runFn=async(name:string,rows:Row[])=>{const f=fns.find(x=>x.name===name)!;const calls:string[]=[];
  const out=await execute(`const appRoles=${JSON.stringify(Object.fromEntries(roles.map(r=>[r,r])))};\n${f.source}`,null,async(n,v:any)=>{calls.push(n);assert.equal(n,'records.read');const all=rows.filter(r=>r.role===v.typeId).map(r=>({id:r.id,version:r.version,data:r.data}));return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length};});
  assert.ok(calls.every(c=>c==='records.read'),'helpers only read');return out as any;};
 // The helpers use the real clock; compare against the app pinned to the same date.
 const today=new Date().toISOString().slice(0,10),live=await command(d.rows,'attention.read',{},{config:cfgOf({asOfOverride:today})});
 const brief=JSON.parse((await runFn('digest_brief',d.rows)).context);assert.deepEqual(brief.digest,live.result,'one core, same answer');
 const mail=await runFn('digest_email',d.rows);assert.equal(mail.nonEmpty,live.result.count>0);if(mail.nonEmpty)assert.match(mail.text,/^Programs · week of /);
 // A quiet week: everything done, healthy and updated → no email and a brief that says to save nothing.
 const m=today.slice(0,7)+'-01';
 const quiet:Row[]=[{id:randomUUID(),version:0,role:'programs',data:{name:'Calm (fictional)',stage:'preclinical',status:'active',health:'green',health_date:today,archived:false}}];
 quiet.push({id:randomUUID(),version:0,role:'programs.updates',data:{program_id:quiet[0].id,month:m,health:'green'}},{id:randomUUID(),version:0,role:'programs.updates',data:{program_id:quiet[0].id,month:new Date(Date.parse(m)-86400000).toISOString().slice(0,7)+'-01',health:'green'}});
 const q=await runFn('digest_email',quiet);assert.equal(q.nonEmpty,false);assert.match(JSON.parse((await runFn('digest_brief',quiet)).context).instructions,/save nothing/);
});

test('install recommendations: the AI digest saves before it emails; five member notices; the digest without AI is a later feature',async()=>{
 const raw=JSON.parse(await readFile('templates/apps/life.project-oversight-2.2.0.json','utf8'));validateRecipeDeclarations(raw);validateAppFunctions(raw,roles);const {recipes,recommended,unavailable}=readRecipes(raw);assert.deepEqual(unavailable,[]);
 assert.deepEqual(recommended.map(r=>r.key),['weekly_digest','team_added','item_assigned','item_due','raid_assigned','raid_review']);
 const dig=recommended[0];assert.equal(dig.research!.briefBinding,'digest_brief');assert.equal(dig.email!.when,'meaningful','quiet weeks send nothing');
 assert.deepEqual(dig.research!.writeBindings!.map(b=>[b.role,b.allowCreate,b.allowUpdate]),[['programs.digests',true,false]],'research only creates a digest');
 assert.deepEqual([(dig.trigger as any).frequency,(dig.trigger as any).weekdays,(dig.trigger as any).time],['weekly',[1],'08:00']);
 for(const r of recommended.slice(1)){assert.equal(r.trigger.kind,'record_date');assert.ok(r.email!.memberField,'routed to the member');assert.ok(!r.research);
  for(const k of r.email!.fields)assert.ok(schema[(r.trigger as any).role].logicalFields[k],k);assert.ok(schema[(r.trigger as any).role].logicalFields[(r.trigger as any).field]);}
 assert.deepEqual(recipes.filter(r=>!recommended.includes(r)).map(r=>[r.key,r.email!.summaryBinding]),[['weekly_digest_plain','digest_email']]);
 // Settings stores no schedule, recipients or on/off: those live in Automations.
 assert.ok(!schema['programs.settings'].fields.some((f:any)=>/digest|recipient|cadence|schedule/.test(f.key)));
});

test('customization: form layout, labels, defaults and extra fields without a code change; Edit in Runway',async()=>{
 const d=dataset();
 const lay=await command(d.rows,'layout.save',{hide:['item_form:notes'],labels:{'item_form:name':'Milestone or activity'},defaults:{'item_form:function':'clinical'},order:{item_form:['end_date']}});
 assert.equal(lay.ok,true,lay.error);assert.match((await command(d.rows,'layout.save',{hide:['item_form:end_date']})).error,/required/);
 assert.match((await command(d.rows,'layout.save',{labels:{'items:name':'x'}})).error,/form fields/);
 const src=source(),layout=readCustomLayout(src)!;assert.ok(layout.schema.groups.item_form);
 const next=updateCustomLayout(src,lay.layouts[0]),cfg=JSON.parse(/^const templateConfiguration=(.+);\n/.exec(next)![1]);
 const f=await render(d.rows,{section:'plan'},{kind:'click',action:'add:items'},{config:cfgOf({layoutProfile:cfg.layoutProfile})});
 const t=text(f.html);assert.ok(t.includes('Milestone or activity *'));assert.ok(!/ Notes /.test(t.slice(t.indexOf('Add plan item'))));assert.equal(f.state.editor.draft.function,'clinical');
 assert.ok(t.indexOf('End date (milestone date) *')<t.indexOf('Milestone or activity *'),'end date moved first');
 // An extra field bound through the configuration appears in the form and in proposals; calculations ignore it.
 const extra={...map,'programs.plan_items':{...map['programs.plan_items'],extraFields:[{key:'cro',label:'CRO',kind:'text'}],writableExtra:['cro']}};
 const xb=bindings.map(b=>b.typeId==='programs.plan_items'?{...b,fields:[...b.fields,'cro']}:b);
 const xr=await command(d.rows,'item.save',{id:d.tox,fields:{cro:'Northwind CRO (fictional)'}},{config:cfgOf({tableMap:JSON.stringify(extra)}),bindings:xb});
 assert.equal(xr.ok,true,xr.error);assert.equal(xr.changes[0].data.cro,'Northwind CRO (fictional)');
 assert.ok((await command(d.rows,'schema.describe',{},{config:cfgOf({tableMap:JSON.stringify(extra)}),bindings:xb})).result.forms.items.fields.some((x:any)=>x.key==='cro'&&x.additional));
 // Linked to Runway: the cash forecast is read only, labelled with the writing app, with Edit in Runway when the user may open it.
 const snap=randomUUID();d.rows.push({id:snap,version:0,role:'runway.month_closes',data:{month:'2026-10-01',closed:true,currency:'EUR',metrics:JSON.stringify({v:2,asOf:'2026-10',currency:'EUR',months:[{m:'2027-03',c:900000}]})}});
 const integrations=[{role:'runway.month_closes',source:'linked',offer:null,writer:{appName:'Runway',canOpen:true}}];
 const html=(await render(d.rows,{section:'settings'},undefined,{integrations})).html;
 assert.match(text(html),/From Runway, snapshot of Oct 2026\. Read-only here; change it in Runway\./);assert.ok(html.includes(`data-trialy-open="runway.month_closes ${snap}">Edit in Runway</button>`));
 assert.match((await command(d.rows,'record.save',{role:'closes',fields:{month:'2026-12',closing_balance:1,currency:'EUR'}},{integrations})).error,/Change it in Runway/);
 const noOpen=(await render(d.rows,{section:'settings'},undefined,{integrations:[{...integrations[0],writer:{appName:'Runway',canOpen:false}}]})).html;assert.ok(!noOpen.includes('data-trialy-open'));
});

test('production design inspector accepts the 2.2.0 screens: team, digests, a team form and the slip dialog',async()=>{
 const {inspectAppDesign}=await import('../src/workspace/design-quality.js');const d=dataset();
 d.rows.push({id:randomUUID(),version:0,role:'programs.digests',data:{run_on:AS_OF,period:'week of 16 Nov',summary:'Programs · week of 16 Nov: 7 items need attention\n\nOverdue\n· Stability protocol',attention_count:7,written_by:'claude'}});
 const frames:any[]=[];
 for(const [name,state,event] of [['settings',{section:'settings'},undefined],['digests',{section:'updates',upTab:'digests'},undefined],['team-form',{section:'settings'},{kind:'click',action:'add:team'}],['item-form',{section:'plan'},{kind:'click',action:'edit:items:'+d.gmp}]] as any[]){
  let r=await render(d.rows,state,event);if(name==='item-form')r=await render(d.rows,r.state,{kind:'change',action:'draft:end_date',form:{end_date:'2027-02-21'}});frames.push({name,html:r.html,css:r.output.css});}
 assert.match(text(frames[1].html),/Weekly digests .*7 items needing attention · written by Claude/);
 const design=await inspectAppDesign(frames);assert.deepEqual(design.issues,[]);
});
