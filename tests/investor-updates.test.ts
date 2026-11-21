import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {appTemplateEntry} from '../src/workspace/app-templates.js';
import {readRecipes,validateRecipeDeclarations} from '../src/automations/recipes-schema.js';
import {validateAppFunctions} from '../src/workspace/app-functions-schema.js';
import {sanitise} from '../src/domain/exchange-update-content.js';
import {inspectAppDesign} from '../src/workspace/design-quality.js';
import {entry,schema,demo,fullMap,fullBindings,cfgFor,fresh,render,approve,text,session,id,without,root,fakeExchange,type Row} from './fixtures/investor-updates.js';

/* INVESTOR_UPDATES.md §14: package checklist and app behaviour on the fictional demo set (production QuickJS, platform response shapes). */
const SCREENS=['overview','updates','investors','plans','settings'];
const T=(r:string)=>'investorupdates.'+r;
const of=(rows:Row[],role:string)=>rows.filter(r=>r.role===role);
const CAT=(name:string)=>id(T('categories'),d=>d.name===name),PERSON=(name:string)=>id('people',d=>d.name===name),RECIP=(name:string)=>id(T('recipients'),d=>d.person_id===PERSON(name));
const UPD=(title:RegExp)=>id(T('updates'),d=>title.test(d.title)),PLAN=(name:string)=>id(T('plans'),d=>d.name===name),CLASS=(name:string)=>id(T('share_classes'),d=>d.name===name);
const J=(v:any)=>JSON.stringify(v);
const cmd=async(rows:Row[],c:string,input:any={})=>{const r=await render(rows,null,{kind:'command',action:c,value:J(input)});return r.state.command;};

test('package: catalog entry, five screens, limits, build --check, installer, published (seeded), helpers and recipes valid',async()=>{
 assert.equal(entry.id,'life.investor-updates');assert.equal(entry.version,'1.0.1');assert.equal(entry.name,'Investor Updates');
 const raw=await readFile('templates/apps/life.investor-updates-1.0.1.json','utf8'),file=JSON.parse(raw);
 assert.ok(appTemplateEntry.safeParse(file).success);assert.ok(Buffer.byteLength(raw)<=300000,'catalog file budget');assert.ok(file.source.length<=240000);
 const layout=JSON.parse(/^const templateLayoutSchema=(.+);$/m.exec(await readFile(root+'investor-updates.source.js','utf8'))![1]);
 assert.deepEqual(layout.screens.map((s:any)=>s.id),SCREENS);assert.deepEqual(Object.keys(layout.groups),['investors','updates']);
 assert.doesNotMatch(entry.source!,/const templateConfiguration|const templateBindings/,'the host prepends configuration and bindings');
 assert.match(execFileSync('node',['scripts/build-investor-updates-template.mjs','--check'],{encoding:'utf8'}),/verified/);
 assert.match(JSON.parse(await readFile('package.json','utf8')).scripts.build,/build-investor-updates-template\.mjs --check/);
 assert.equal(JSON.parse(await readFile('templates/catalog-installers.json','utf8'))['life.investor-updates@1.0.1'],root+'schema.example.json');
 assert.deepEqual(JSON.parse(await readFile('templates/catalog-seed.json','utf8'))['life.investor-updates'],{schema:root+'schema.example.json',version:'1.0.1'},'owner approval (17 Nov 2026): the seed names 1.0.0, so the catalog sync imports it approved');
 validateRecipeDeclarations(file);const fns=validateAppFunctions(file,Object.keys(schema));assert.deepEqual(fns.map(f=>f.name),['plan_brief','meeting_brief','updates_digest']);
 for(const f of fns){assert.deepEqual(f.scope.capabilities,['records.read'],'helpers only read');assert.equal(f.scope.documents,false);}
 const m=JSON.parse(await readFile(root+'catalog.metadata.json','utf8'));assert.equal(m.documentation.tasks.mode,'optional');
 assert.match(m.whenNotToUse,/Fundraise[\s\S]*Board/);for(const k of ['README.md','QA.md','AUTOMATION_RECIPES.md','investor-updates.preview.html'])assert.ok((await readFile(root+k,'utf8')).length>500,k);
});

test('roles as in §8: shared people and organizations, programs optional and read only, investorupdates.* tables with contract-driven tracked fields',async()=>{
 const core=JSON.parse(await readFile('templates/core-contract/v1.json','utf8')).roles;
 for(const r of ['organizations','people']){assert.equal(schema[r].contract,'core.v1');assert.ok(!schema[r].optional);for(const f of core[r].fields.filter((x:any)=>!x.owner)){const mine=schema[r].fields.find((x:any)=>x.key===f.key);assert.ok(mine,r+'.'+f.key);assert.equal(mine.kind,f.kind);}}
 assert.deepEqual([schema.programs.contract,schema.programs.optional],['core.v1',true]);
 const own=Object.keys(schema).filter(r=>r.startsWith('investorupdates.'));
 assert.deepEqual(own.sort(),['categories','deliveries','meetings','plans','recipients','responses','settings','share_classes','templates','updates'].map(T).sort());
 for(const r of own)assert.equal(schema[r].contract,'investorupdates.v1');
 const F=(r:string)=>Object.fromEntries(schema[T(r)].fields.map((f:any)=>[f.key,f]));
 const spec:Record<string,string>={settings:'sender_display:select,approval_steps:select,help_enabled:boolean,questions_enabled:boolean,meeting_lead_days:number,confidentiality_footer:text,custom_fields:text,labels:text,preferences:text',
  categories:'name:text*,kind:select*,level:select*,description:text,share_class_ids:text,default_template_id:text,help_on:boolean,questions_on:boolean,archived:boolean',
  share_classes:'name:text*,kind:select*,notes:text,sort_order:number,archived:boolean',recipients:'person_id:text*,organization_id:text,category_ids:text,share_class_ids:text,status:select*,unsubscribed_on:date,notes:text,source:select,archived:boolean',
  templates:'name:text*,kind:select*,format:select*,sections:text*,brief:text,design:text,source:select,archived:boolean',
  plans:'name:text*,format:select*,template_id:text*,after_template_id:text,category_ids:text*,sources:text*,cadence:select*,send_by_day:number,timezone:text,approver_1:text,approver_2:text*,status:select*,archived:boolean',
  meetings:'title:text*,kind:select*,meeting_date:date*,start_time:text,timezone:text,location:text,plan_id:text,category_ids:text*,status:select*,notes:text,archived:boolean',
  updates:'format:select*,plan_id:text,meeting_id:text,kind:select*,period:text,title:text*,category_ids:text*,status:select*,blocks:text*,facts:text*,asks:text,document_ids:text,drafted_by:select,drafted_on:date,approved_1_by:text,approved_2_by:text,approved_on:date,sent_on:date,exchange_group_id:text,pdf_document_id:text,correction_of:text,sent_settings:text',
  deliveries:'update_id:text*,recipient_id:text*,category_id:text*,level:select*,email:text*,exchange_id:text,sent_on:date,status:select,first_read_on:date,last_read_on:date,read_count:number',
  responses:'update_id:text*,recipient_id:text,kind:select,ask_key:text,message:text,responded_on:date*,answer:text,answered_on:date,answer_scope:select,status:select*,owner:text,follow_up_due:date'};
 for(const [r,s] of Object.entries(spec))for(const x of s.split(',')){const [k,kind]=x.split(':'),f=F(r)[k];assert.ok(f,r+'.'+k);assert.equal(f.kind,kind.replace('*',''),r+'.'+k);assert.equal(f.required,kind.endsWith('*'),r+'.'+k+' required');assert.equal(f.multiple,false);}
 assert.deepEqual(F('categories').level.options,['board','investors','everyone']);assert.deepEqual(F('deliveries').status.options,['queued','sent','bounced','read','revoked']);assert.deepEqual(F('responses').status.options,['new','answered','following_up','done']);
 assert.deepEqual(F('templates').kind.options,['board_monthly','investor_quarterly','milestone_flash','meeting_before','meeting_after','custom']);assert.deepEqual(F('plans').cadence.options,['monthly','quarterly','half_yearly','yearly']);
 // Platform contract (§6 tracked tables): delivery fields TrialAgents fills cannot be required; responses get the delivery context copied.
 for(const k of ['status','sent_on','first_read_on','last_read_on','read_count','exchange_id'])assert.equal(F('deliveries')[k].required,false,k);
 for(const k of ['person_id','organization_id'])assert.ok(F('deliveries')[k]&&F('responses')[k],k+' is copied to responses');for(const k of ['ask_text','delivery_id','exchange_id'])assert.ok(F('responses')[k],k);
 for(const k of ['schedule','cadence','recipients','draft_time','reminder','automation_id'])assert.equal(F('settings')[k],undefined,'the app stores no automation schedules or switches: '+k);
 for(const [r,d] of Object.entries(schema) as any)for(const f of d.fields)assert.match(f.key,/^[a-z][a-z0-9_]{0,63}$/,r+'.'+f.key);
});

test('fictional demo data as §14: 4 firms, 10 people (5 board, one independent), 3 classes, 3 + 2 categories, 3 plans, 2 meetings, 3 sent updates and 1 draft',()=>{
 const rows=fresh();assert.equal(of(rows,'organizations').length,4);assert.equal(of(rows,'people').length,10);assert.equal(of(rows,T('share_classes')).length,3);
 const cats=of(rows,T('categories'));assert.equal(cats.filter(c=>c.data.kind!=='custom').length,3);assert.equal(cats.filter(c=>c.data.kind==='custom').length,2);assert.ok(cats.some(c=>JSON.parse(c.data.share_class_ids).length),'one category is defined by a share class');
 const board=of(rows,T('recipients')).filter(r=>JSON.parse(r.data.category_ids).includes(CAT('Board')));assert.equal(board.length,5);assert.ok(board.some(r=>!r.data.organization_id&&JSON.parse(r.data.share_class_ids).length===0),'an independent director without shares');
 assert.equal(of(rows,T('plans')).length,3);const meets=of(rows,T('meetings'));assert.equal(meets.length,2);
 const ups=of(rows,T('updates')),emails=ups.filter(u=>u.data.format==='email');assert.equal(emails.filter(u=>u.data.status==='sent').length,3);assert.equal(emails.filter(u=>u.data.status!=='sent').length,1);
 const bm=meets.find(m=>m.data.kind==='board')!;assert.deepEqual(ups.filter(u=>u.data.meeting_id===bm.id).map(u=>u.data.format).sort(),['meeting_after','meeting_before']);assert.ok(of(rows,T('responses')).some(r=>r.data.ask_key==='question'));
 assert.equal(meets.find(m=>m.data.kind==='investor_call')!.data.status,'planned');
 assert.doesNotMatch(J(demo),/@(?![a-z]+\.example\.invalid)/,'emails are fictional');
});

test('every screen and drawer renders on the demo data with no errors, and on empty tables',async()=>{
 const rows=fresh();
 for(const section of SCREENS){const o=await render(rows,{section});assert.doesNotMatch(text(o.html),/could not be shown|Partial data/,section);assert.equal(o.state.section,section);}
 for(const sub of ['people','categories','classes'])assert.doesNotMatch(text((await render(rows,{section:'investors',sub})).html),/could not be shown/,sub);
 assert.doesNotMatch(text((await render(rows,{section:'plans',sub:'templates'})).html),/could not be shown/);
 const s=session(rows);await s.open({section:'updates'});
 const panels:[string,string][]=[['update',UPD(/October 2026/)],['update',UPD(/Q3 2026/)],['recipient',RECIP('Mara Okafor')],['meeting',id(T('meetings'),d=>d.kind==='board')],['plan',PLAN('Board – monthly update')],['template',id(T('templates'),d=>d.kind==='board_monthly')],['category',CAT('Series A holders')],['class',CLASS('Series A preferred')],['response',id(T('responses'),d=>d.ask_key==='question'&&!d.answered_on)]];
 for(const [type,rid] of panels){await s.click('open:'+type+':'+rid);assert.match(s.html,/role="dialog"/,type);assert.doesNotMatch(text(s.html),/could not be shown/,type);assert.equal(s.state.notice??'','',type);}
 await s.click('open:update:'+UPD(/Q3 2026/));await s.click('ptab:engagement');assert.match(text(s.html),/Delivered 7 7 people in the send Read 57%/);
 for(const a of ['add:recipients','add:plans','add:meetings','add:templates','add:categories','add:classes','add-update:email']){await s.click(a);assert.match(s.html,/role="dialog"/,a);assert.doesNotMatch(text(s.html),/could not be shown/,a);}
 const blank=await render([],{section:'overview'});assert.match(text(blank.html),/Start with the standard setup/);
 for(const section of SCREENS)assert.doesNotMatch(text((await render([],{section})).html),/could not be shown/,section);
});

test('standard setup at first use: three categories and five templates as editable records in one review; share classes empty',async()=>{
 const rows:Row[]=[];const s=session(rows);await s.open({section:'overview'});await s.click('setup-standard');
 const cats=s.changes.filter((c:any)=>c.typeId===T('categories')),tpls=s.changes.filter((c:any)=>c.typeId===T('templates'));
 assert.deepEqual(cats.map((c:any)=>[c.data.kind,c.data.level]),[['board','board'],['investors','investors'],['shareholders','everyone']]);
 assert.deepEqual(tpls.map((c:any)=>c.data.kind),['board_monthly','investor_quarterly','milestone_flash','meeting_before','meeting_after']);
 assert.ok(s.changes.some((c:any)=>c.typeId===T('settings')));assert.equal(s.changes.filter((c:any)=>c.typeId===T('share_classes')).length,0);
 await s.approve();assert.doesNotMatch(text(s.html),/Start with the standard setup/);
 // Renaming or archiving a standard category keeps its kind; a second setup adds nothing.
 const board=rows.find(r=>r.role===T('categories')&&r.data.kind==='board')!;await s.click('edit:categories:'+board.id);await s.submit('save-record',{name:'Supervisory board',level:'board',description:'x'});
 assert.deepEqual(s.changes[0].data.kind,undefined,'kind never changes');await s.approve();await s.click('setup-standard');assert.match(s.state.notice,/Nothing changed/);
});

test('§9 periods, due and overdue: monthly, quarterly, half-yearly and yearly; send-by = period end + send_by_day; meetings due lead days ahead',async()=>{
 const rows=fresh();const ov=(await cmd(rows,'overview.read')).result;
 const board=ov.due.find((d:any)=>d.plan==='Board – monthly update');assert.deepEqual([board.period,board.send_by,board.state,board.overdue],['2026-10','2026-11-07','overdue',true],'October draft in review, send-by 7 Nov passed on 15 Nov');
 const q=ov.due.find((d:any)=>/quarterly/.test(d.plan));assert.deepEqual([q.state,q.period,q.send_by],['next','2026-Q4','2027-01-07'],'Q3 sent, so Q4 is next');
 const call=ov.meetings.find((m:any)=>m.title==='Q4 investor call');assert.deepEqual([call.date,call.before_due,call.before,call.before_late],['2026-11-26','2026-11-19','none',false]);
 // Boundaries: other cadences and as-of dates, through the plans.list command.
 const P=rows.find(r=>r.id===PLAN('Board – monthly update'))!;
 for(const [cadence,asOf,period,sendBy] of [['quarterly','2026-07-01','2026-Q2','2026-07-07'],['half_yearly','2026-11-15','2026-H1','2026-07-07'],['yearly','2027-01-03','2026','2027-01-07'],['monthly','2026-03-01','2026-02','2026-03-07']] as const){
  P.data.cadence=cadence;const r=await render(rows,null,{kind:'command',action:'plans.list',value:'{}'},{config:cfgFor(undefined,{asOfOverride:asOf})});const p=r.state.command.result.items.find((x:any)=>x.id===P.id);assert.deepEqual([p.period,p.send_by],[period,sendBy],cadence+' '+asOf);}
 // A meeting whose lead date passed without a before part is late.
 const late=fresh();late.find(r=>r.role===T('meetings')&&r.data.kind==='investor_call')!.data.meeting_date='2026-11-18';assert.equal((await cmd(late,'overview.read')).result.meetings.find((m:any)=>m.title==='Q4 investor call').before_late,true);
});

test('§9 membership by category and share class, paused and unsubscribed excluded; one email per person at their highest level',async()=>{
 const rows=fresh();
 const sa=(await cmd(rows,'categories.list')).result.categories.find((c:any)=>c.name==='Series A holders');
 // Series A preferred holders: Mara, Jonas, Tomás, Lena, Kenji (none added directly).
 assert.equal(sa.members,5);
 const inv=(await cmd(rows,'investors.list',{category_id:CAT('Series A holders')})).result.items.map((x:any)=>x.name).sort();assert.deepEqual(inv,['Jonas Weber','Kenji Mori','Lena Hoffmann','Mara Okafor','Tomás Ruiz']);
 // Added directly too: Sofia (common) joins Series A holders directly.
 const sofia=rows.find(r=>r.id===RECIP('Sofia Brandt'))!;sofia.data.category_ids=J([CAT('Shareholders'),CAT('Series A holders')]);
 assert.equal((await cmd(rows,'categories.list')).result.categories.find((c:any)=>c.name==='Series A holders').members,6);
 // A draft to Board, Investors and Shareholders: Mara is in Board and Investors and gets the board version once.
 const s=session(rows);await s.open({section:'updates'});await s.click('add-update:email');await s.submit('save-new-update',{title:'Milestone flash: Phase 1 start',cat_0:'',['cat_'+CAT('Board')]:'true',['cat_'+CAT('Investors')]:'true',['cat_'+CAT('Shareholders')]:'true',kind:'flash'});
 const draft=s.changes[0];assert.equal(draft.data.status,'drafting');approve(rows,s.changes);const u=rows[rows.length-1];
 rows.find(r=>r.id===RECIP('Elena Rossi'))!.data.status='paused';
 const r=(await cmd(rows,'update.read',{update_id:u.id})).result;
 assert.deepEqual(r.versions.map((v:any)=>v.level),['board','investors','everyone']);
 assert.equal(r.recipients.people,new Set([...['Mara Okafor','Jonas Weber','Priya Natarajan','Tomás Ruiz'],...['Lena Hoffmann'],...['Omar Haddad','Sofia Brandt']]).size,'each person once');
 assert.ok(r.recipients.excluded.some((x:any)=>x.name==='Elena Rossi'&&x.reason==='paused'));
 const fx=fakeExchange();fx.unsubscribes['updates:one_off']=['omar@dune.example.invalid'];
 const r2=(await render(rows,null,{kind:'command',action:'update.read',value:J({update_id:u.id})},{exchange:fx})).state.command.result;
 assert.ok(r2.recipients.excluded.some((x:any)=>x.name==='Omar Haddad'&&/unsubscribed/.test(x.reason)),'unsubscribed from the series');assert.equal(r2.recipients.people,r.recipients.people-1);
});

test('§6/§9 versions: one draft with board, investor and everyone blocks yields three previews that differ only by those blocks',async()=>{
 const rows=fresh();const s=session(rows);await s.open({section:'updates'});
 await s.click('add-update:email');await s.submit('save-new-update',{title:'Levels test',['cat_'+CAT('Board')]:'true',['cat_'+CAT('Investors')]:'true',['cat_'+CAT('Shareholders')]:'true'});approve(rows,s.changes);const u=rows[rows.length-1];
 u.data.blocks=J([{id:'b1',type:'text',level:'everyone',text:'EVERYONE-BLOCK'},{id:'b2',type:'text',level:'investors',text:'INVESTOR-BLOCK'},{id:'b3',type:'text',level:'board',text:'BOARD-BLOCK'}]);
 const r=(await cmd(rows,'update.read',{update_id:u.id})).result;
 assert.deepEqual(r.versions.map((v:any)=>[v.level,v.block_ids,v.hidden_block_ids]),[['board',['b1','b2','b3'],[]],['investors',['b1','b2'],['b3']],['everyone',['b1'],['b2','b3']]]);
 await s.click('open:update:'+u.id);const previews:string[]=[];for(const v of r.versions){await s.click('ver:'+v.key);const h=s.html;const at=h.indexOf('iu-mail-body');previews.push(text(h.slice(at,h.indexOf('<p class="iu-muted">',at))));}
 assert.match(previews[0],/BOARD-BLOCK/);assert.doesNotMatch(previews[1],/BOARD-BLOCK/);assert.match(previews[1],/INVESTOR-BLOCK/);assert.doesNotMatch(previews[2],/INVESTOR-BLOCK|BOARD-BLOCK/);
 for(const p of previews)assert.match(p,/EVERYONE-BLOCK/);
 const strip=(p:string)=>p.replace(/BOARD-BLOCK|INVESTOR-BLOCK/g,'').replace(/\s+/g,' ').trim();assert.equal(strip(previews[0]),strip(previews[2]),'they differ only by the removed blocks');assert.equal(strip(previews[1]),strip(previews[2]));
});

test('§6 renderer: email-safe HTML that the platform allowlist keeps unchanged; asks by marker only when "I can help" is on; questions as the reserved ask',async()=>{
 const rows=fresh();const fx=fakeExchange();const u=UPD(/October 2026/);const R=rows.find(r=>r.id===u)!;R.data.status='approved';R.data.approved_2_by='Anna (CEO)';
 const s=session(rows,{exchange:fx});await s.open({section:'updates'});await s.click('send-open:'+u);await s.click('prepare-recipients');approve(rows,s.changes);s.changes=[];await s.click('create-links');
 assert.equal(fx.groups.length,1,'one version: the board');const c=fx.groups[0].config.content;
 const clean=sanitise(c.html,c.asks.map((a:any)=>a.key));assert.deepEqual(clean.removed,[],'nothing is removed by the platform allowlist');assert.deepEqual(clean.asks,['cmo_intro','question']);
 assert.doesNotMatch(c.html,/display:\s*flex|grid|position|rgba|background-image|<svg|<script|class=/);assert.ok(c.html.length<80000);
 assert.deepEqual(c.asks.map((a:any)=>a.key),['cmo_intro','question']);assert.equal(c.confidentiality,'Confidential — prepared for {recipient_name}. Please do not forward.');
 // "I can help" off: the asks block renders as text, no markers, no declared asks.
 const off=fresh();off.find(r=>r.role===T('settings'))!.data.help_enabled=false;off.find(r=>r.role===T('settings'))!.data.questions_enabled=false;const O=off.find(r=>r.id===u)!;O.data.status='approved';O.data.approved_2_by='Anna';
 const fx2=fakeExchange(),s2=session(off,{exchange:fx2});await s2.open({});await s2.click('send-open:'+u);await s2.click('prepare-recipients');approve(off,s2.changes);s2.changes=[];await s2.click('create-links');
 const c2=fx2.groups[0].config.content;assert.deepEqual(c2.asks,[]);assert.doesNotMatch(c2.html,/data-ask/);assert.match(c2.html,/Introductions to an experienced oncology CMO/);
 // An update without an asks section declares no "I can help" ask even with the setting on.
 const noAsk=fresh(),N=noAsk.find(r=>r.id===u)!;N.data.blocks=J(JSON.parse(N.data.blocks).filter((b:any)=>b.type!=='asks'));N.data.status='approved';N.data.approved_2_by='Anna';
 const fx3=fakeExchange(),s3=session(noAsk,{exchange:fx3});await s3.open({});await s3.click('send-open:'+u);await s3.click('prepare-recipients');approve(noAsk,s3.changes);s3.changes=[];await s3.click('create-links');assert.deepEqual(fx3.groups[0].config.content.asks.map((a:any)=>a.key),['question']);
});

test('§9 fact panel: a changed record number is flagged with both values; a number without a fact blocks approval; unverified facts need the tick',async()=>{
 const rows=fresh(),u=UPD(/October 2026/);
 const r=(await cmd(rows,'update.read',{update_id:u})).result;
 const stage=r.facts.find((f:any)=>f.id==='f3');assert.deepEqual([stage.check,stage.value,stage.current_value],['changed','preclinical','phase_1'],'Programs record re-read');
 assert.equal(r.facts.find((f:any)=>f.id==='f4').check,'unverified','user-stated in chat');assert.equal(r.facts.find((f:any)=>f.id==='f2').check,'unverified','another app\'s record cannot be re-read by this app');
 // Fixing the fact (the record now matches): verified.
 const U=rows.find(x=>x.id===u)!;const facts=JSON.parse(U.data.facts);facts[2].value='phase_1';U.data.facts=J(facts);assert.equal((await cmd(rows,'update.read',{update_id:u})).result.facts.find((f:any)=>f.id==='f3').check,'verified');
 // A document fact: exists → verified; missing → changed.
 facts.push({id:'f9',claim:'Budget',value:'0.4',source:{kind:'document',version_id:'00000000-0000-4000-8000-000000000999',page:2}});U.data.facts=J(facts);
 const withDoc=await render(rows,null,{kind:'command',action:'update.read',value:J({update_id:u})},{docs:[{documentId:'00000000-0000-4000-8000-000000000998',versionId:'00000000-0000-4000-8000-000000000999',filename:'IND budget.pdf'}]});assert.equal(withDoc.state.command.result.facts.find((f:any)=>f.id==='f9').check,'verified');
 assert.equal((await cmd(rows,'update.read',{update_id:u})).result.facts.find((f:any)=>f.id==='f9').check,'changed');
 // A metric without a fact blocks approval; then the tick is required for unverified facts.
 const blocks=JSON.parse(U.data.blocks);blocks[2].items[0].fact='';U.data.blocks=J(blocks);
 const s=session(rows);await s.open({});await s.click('open:update:'+u);await s.submit('approve:'+u+':2',{approver:'Anna (CEO)',confirm_unverified:'true'});assert.match(s.state.notice,/Approval is blocked: 1 number without a fact: Cash/);assert.equal(s.changes.length,0);
 blocks[2].items[0].fact='f1';U.data.blocks=J(blocks);await s.submit('approve:'+u+':2',{approver:'Anna (CEO)'});assert.match(s.state.notice,/Tick "I confirm these"/);assert.equal(s.changes.length,0);
 await s.submit('approve:'+u+':2',{approver:'Anna (CEO)',confirm_unverified:'true'});assert.deepEqual([s.changes[0].data.status,s.changes[0].data.approved_2_by],['approved','Anna (CEO)']);
});

test('two-step approval: approver 1 first, then approver 2; an edit after approval resets it',async()=>{
 const rows=fresh(),U=rows.find(r=>r.id===UPD(/October 2026/))!;U.data.approved_1_by=null;const s=session(rows);await s.open({});await s.click('open:update:'+U.id);
 assert.match(text(s.html),/Step 1: approver 1 checks the numbers/);await s.submit('approve:'+U.id+':2',{approver:'Anna',confirm_unverified:'true'});assert.match(s.state.notice,/Approver 1 checks the numbers first/);
 await s.submit('approve:'+U.id+':1',{approver:'Felix (CFO)',confirm_unverified:'true'});assert.deepEqual(s.changes[0].data,{approved_1_by:'Felix (CFO)'});await s.approve();
 await s.click('open:update:'+U.id);await s.submit('approve:'+U.id+':2',{approver:'Anna (CEO)',confirm_unverified:'true'});await s.approve();assert.equal(U.data.status,'approved');
 await s.click('open:update:'+U.id);await s.submit('save-levels',{lv_b5:'investors'});assert.deepEqual([s.changes[0].data.status,s.changes[0].data.approved_1_by,s.changes[0].data.approved_2_by],['in_review',null,null]);assert.match(s.state.notice,/approval is reset/);
 // One-step setting: approver 2 approves directly.
 rows.find(r=>r.role===T('settings'))!.data.approval_steps='one';U.data.approved_1_by=null;U.data.approved_2_by=null;U.data.status='in_review';const s2=session(rows);await s2.open({});await s2.click('open:update:'+U.id);await s2.submit('approve:'+U.id+':2',{approver:'Anna',confirm_unverified:'true'});assert.equal(s2.changes[0].data.status,'approved');
});

test('§9 promise tracker: a moved milestone date from the previous update is flagged; an explanation resolves it',async()=>{
 const rows=fresh(),u=UPD(/October 2026/);const p=(await cmd(rows,'update.read',{update_id:u})).result.promise_tracker;
 assert.equal(p.previous_update_id,UPD(/September 2026/));assert.deepEqual(p.flags.map((f:any)=>[f.kind,f.title,f.before,f.now,f.explained]),[['changed','IND filing for NWB-202','2027-Q1','2027-Q2',false]]);
 const s=session(rows);await s.open({});await s.click('open:update:'+u);assert.match(text(s.html),/In September 2026 you said "IND filing for NWB-202" by 2027-Q1; this draft says 2027-Q2\. Add an explanation\?/);
 await s.submit('explain',{title:'IND filing for NWB-202',explanation:'The GLP tox extension adds one quarter.'});await s.approve();
 assert.equal((await cmd(rows,'update.read',{update_id:u})).result.promise_tracker.flags[0].explained,true);
 // A dated statement left out is flagged as missing.
 const U=rows.find(r=>r.id===u)!,b=JSON.parse(U.data.blocks);b[3].items=b[3].items.filter((m:any)=>!/IND/.test(m.title));U.data.blocks=J(b);assert.equal((await cmd(rows,'update.read',{update_id:u})).result.promise_tracker.flags[0].kind,'missing');
});

test('§9 read rate per update and per category; engagement summary for the next draft',async()=>{
 const rows=fresh();const e=(await cmd(rows,'engagement.read',{update_id:UPD(/Q3 2026/)})).result.engagement;
 assert.deepEqual([e.delivered,e.read],[7,4]);assert.equal(Math.round(e.rate*100),57);
 assert.deepEqual(e.by_category.map((c:any)=>[c.category,c.read,c.delivered]).sort(),[['Investors',2,2],['Series A holders',1,3],['Shareholders',1,2]]);
 const sum=(await cmd(rows,'engagement.read',{plan_id:PLAN('Board – monthly update')})).result.summary;assert.deepEqual(sum.not_read.sort(),['Jonas Weber','Tomás Ruiz']);assert.equal(sum.open_asks,2);
 const ov=(await render(rows,{section:'overview'})).html;assert.match(text(ov),/Series A holders Quarterly investor update · Q3 2026 1 of 3 \(33%\) Jonas Weber, Tomás Ruiz/);
});

test('send: recipients (reviewed), links on a click, one confirmed send per version shown exactly as prepared; the first send locks the update and advances the plan',async()=>{
 const rows=fresh(),fx=fakeExchange(),u=UPD(/October 2026/),U=rows.find(r=>r.id===u)!;U.data.status='approved';U.data.approved_2_by='Anna (CEO)';
 const s=session(rows,{exchange:fx});await s.open({});await s.click('send-open:'+u);
 await s.click('create-links');assert.match(s.state.notice,/Prepare the recipients first/);assert.equal(fx.groups.length,0);
 await s.click('prepare-recipients');assert.equal(s.changes.length,5);assert.ok(s.changes.every((c:any)=>c.typeId===T('deliveries')&&c.data.level==='board'&&c.data.status===undefined),'tracked fields stay blank');
 approve(rows,s.changes);s.changes=[];await s.click('create-links');
 const g=fx.groups[0];assert.equal(g.config.appRef,'update:'+u+':board_h_q');assert.equal(g.config.series,'plan:'+PLAN('Board – monthly update'));assert.deepEqual(g.config.tracking,{deliveryTypeId:T('deliveries'),responsesTypeId:T('responses')});assert.equal(g.config.kind,'room');
 assert.equal(g.exchanges.length,5);assert.ok(g.exchanges.every((e:any)=>rows.some(r=>r.id===e.recordId&&r.role===T('deliveries'))),'one link per person, bound to the delivery record');assert.equal(s.changes.length,0,'links create no record review');
 await s.submit('prepare-email',{version:'board_h_q',subject:'October board update',body:'Dear {recipient_name},\n\nHere is October.'});assert.equal(s.state.batch.recipients.length,5);assert.match(s.html,/Gmail, Outlook, Apple Mail ✓/);
 const out=await s.click('confirm-send');assert.ok(out.calls.indexOf('exchange.sendEmail')<out.calls.lastIndexOf('records.propose'),'the send is requested before the record lock joins it');
 const lock=s.changes.find((c:any)=>c.recordId===u);assert.deepEqual([lock.data.status,lock.data.sent_on],['sent','2026-11-15']);assert.deepEqual(JSON.parse(lock.data.exchange_group_id),{board_h_q:g.id});
 assert.deepEqual(s.changes.find((c:any)=>c.recordId===PLAN('Board – monthly update')).data,{next_period_end:'2026-11-30'});
 const sends=fx.calls.filter((c:any)=>c.name==='exchange.sendEmail');assert.equal(sends.length,1);assert.equal(sends[0].v.digest,'d'.repeat(64),'the prepared batch digest');
 // A failing send proposes no record change on its own.
 const rows2=fresh(),U2=rows2.find(r=>r.id===u)!;U2.data.status='approved';U2.data.approved_2_by='Anna';const fx2=fakeExchange();const s2=session(rows2,{exchange:fx2});await s2.open({});await s2.click('send-open:'+u);await s2.click('prepare-recipients');approve(rows2,s2.changes);s2.changes=[];await s2.click('create-links');await s2.submit('prepare-email',{version:'board_h_q'});
 const h=fx2.handle;fx2.handle=(n:string,v:any)=>{if(n==='exchange.sendEmail')throw Error('Digest changed');return h(n,v);};await s2.click('confirm-send');assert.equal(s2.changes.length,0,'no record review without the send');assert.ok(s2.state.notice,'the failure is shown');
 // Sent updates are locked; a correction notice is a new update.
 U.data.status='sent';const s3=session(rows);await s3.open({});await s3.click('edit:updates:'+u);assert.match(s3.state.notice,/locked/);await s3.click('correct:'+u);const corr=s3.changes[0];assert.deepEqual([corr.data.correction_of,corr.data.status,corr.data.title],[u,'drafting','Correction: Board – monthly update · October 2026']);
});

test('not-read reminder (confirmed, only non-readers), questions answered privately or to everyone (asker not named), response follow-up fields',async()=>{
 const rows=fresh(),fx=fakeExchange(),q3=UPD(/Q3 2026/);const s=session(rows,{exchange:fx});
 // Simulate the sent Q3 groups: one investors-level group with links bound to the delivery records.
 const ds=rows.filter(r=>r.role===T('deliveries')&&r.data.update_id===q3);for(const key of ['investors_h_q','everyone_h_q']){const lvl=key.split('_')[0];fx.groups.push({id:crypto.randomUUID(),appRef:'update:'+q3+':'+key,config:{series:'plan:x',content:{html:'<p>x</p>'}},exchanges:ds.filter(d=>d.data.level===lvl).map(d=>({id:d.data.exchange_id,recordId:d.id,emails:[d.data.email]}))});}
 await s.open({});await s.click('remind:'+q3);await s.submit('prepare-email',{version:'investors_h_q'});
 const prep=fx.calls.filter((c:any)=>c.name==='exchange.prepareEmail').pop().v;assert.equal(prep.emailType,'update');assert.equal(prep.subject,'Reminder: {title}');
 const nonReaders=ds.filter(d=>d.data.level==='investors'&&d.data.status!=='read').map(d=>d.data.exchange_id).sort();assert.deepEqual(prep.exchangeIds.slice().sort(),nonReaders,'only those who have not read it');
 await s.click('confirm-send');assert.equal(s.changes.length,0,'a reminder changes no record');assert.match(s.state.notice,/reminder to 2 people who have not read it/);
 // A question answered privately: exchange.reply to the asker's exchange, record answered in the same review.
 const before=id(T('updates'),d=>d.format==='meeting_before'),q=rows.find(r=>r.role===T('responses')&&r.data.ask_key==='question'&&!r.data.answered_on)!;
 await s.click('open:response:'+q.id);assert.match(text(s.html),/Question from Mara Okafor/);await s.submit('send-answer',{answer:'Yes, the shortlist is in your pre-read.',scope:'private'});
 const reply=fx.calls.filter((c:any)=>c.name==='exchange.reply').pop().v;assert.deepEqual([reply.exchangeId,reply.notify],[q.data.exchange_id,true]);assert.deepEqual([s.changes[0].data.answer_scope,s.changes[0].data.status,s.changes[0].data.answered_on],['private','answered','2026-11-15']);
 // To everyone invited: one message per live link of the part, the asker not named.
 await s.click('open:response:'+q.id);await s.submit('send-answer',{answer:'The shortlist has three agencies.',scope:'group'});
 const all=fx.calls.filter((c:any)=>c.name==='exchange.replyAll').pop().v;assert.equal(all.replies.length,rows.filter(r=>r.role===T('deliveries')&&r.data.update_id===before).length);assert.ok(all.replies.every((x:any)=>/A question was asked/.test(x.body)&&!/Mara/.test(x.body)));
 // Follow-up fields stay editable; tracked fields are never offered.
 const help=rows.find(r=>r.role===T('responses')&&r.data.ask_key==='cmo_intro'&&r.data.status==='new')!;await s.click('open:response:'+help.id);assert.doesNotMatch(s.html,/name="message"/);await s.submit('save-response',{status:'following_up',owner:'Anna',follow_up_due:'2026-11-20'});assert.deepEqual(s.changes[0].data,{status:'following_up',owner:'Anna',follow_up_due:'2026-11-20'});
});

test('both workflows: a one-off update without a template, saved as a template and used by a new plan; meetings before and after',async()=>{
 const rows=fresh();const s=session(rows);await s.open({section:'updates'});
 await s.click('add-update:email');await s.submit('save-new-update',{title:'Phase 1 start',['cat_'+CAT('Shareholders')]:'true',kind:'flash'});assert.equal(s.changes[0].data.kind,'flash');approve(rows,s.changes);const u=rows[rows.length-1];
 u.data.blocks=J([{id:'b1',type:'heading',level:'everyone',text:'The news'},{id:'b2',type:'text',level:'everyone',text:'First patient dosed.'},{id:'b3',type:'heading',level:'investors',text:'Cash'},{id:'b4',type:'text',level:'investors',text:'Unchanged.'}]);
 await s.click('panel-tplfrom:'+u.id);await s.click('tpl-from:'+u.id,{name:'Flash with cash',brief:''});const t=s.changes[0];assert.deepEqual(JSON.parse(t.data.sections).map((x:any)=>[x.name,x.level]),[['The news','everyone'],['Cash','investors']]);approve(rows,s.changes);
 const tpl=rows[rows.length-1];await s.click('add:plans');await s.submit('save-plan',{name:'Shareholders – flash',format:'email',template_id:tpl.id,cadence:'quarterly',approver_2:'Anna',['cat_'+CAT('Shareholders')]:'true',mode_cat:'1',mode_src:'1'});
 assert.deepEqual([s.changes[0].data.template_id,s.changes[0].data.next_period_end],[tpl.id,'2026-09-30']);
 // Meeting: before part from the meeting, recap after it in the same series.
 const m=id(T('meetings'),d=>d.kind==='investor_call');await s.click('meeting-part:'+m+':before');const b=s.changes[0];assert.deepEqual([b.data.format,b.data.meeting_id,b.data.title],['meeting_before',m,'Agenda and pre-read: Q4 investor call']);
 assert.ok(JSON.parse(b.data.blocks).some((x:any)=>x.type==='heading'&&x.text==='Agenda'));
 const held=id(T('meetings'),d=>d.kind==='board');await s.click('meeting-part:'+held+':after');assert.match(s.state.notice,/already has its after part/);
});

test('settings and customization: toggles, email texts, labels, preferences; changes apply to the next draft only',async()=>{
 const rows=fresh();const s=session(rows);await s.open({section:'settings'});
 await s.submit('save-settings',{sender_display:'first_name',approval_steps:'two',meeting_lead_days:'10',confidentiality_footer:'Confidential.',questions_enabled:'true'});const c=s.changes[0].data;assert.deepEqual([c.sender_display,c.meeting_lead_days,c.help_enabled],['first_name',10,false]);assert.match(s.state.notice,/update the "Agenda and pre-read draft" automation/);
 await s.submit('save-labels',{l_board:'Supervisory board'});assert.deepEqual(JSON.parse(s.changes[0].data.labels),{board:'Supervisory board'});approve(rows,s.changes);await s.open({section:'investors',sub:'categories'});assert.match(text(s.html),/Supervisory board/);
 await s.open({section:'settings'});await s.submit('save-prefs',{opening_screen:'updates',page_size:'20',ov_due:'true',ov_drafts:'true',ov_engagement:'false',ov_responses:'true'});approve(rows,s.changes);
 const fresh2=await render(rows,{});assert.equal(fresh2.state.section,'updates','opening screen');assert.doesNotMatch(text((await render(rows,{section:'overview'})).html),/Read rate of the last update per category/);
 await s.open({section:'settings'});await s.submit('save-texts',{reminder_subject:'Still unread: {title}',reminder_body:'Hello {recipient_name}, a short reminder.'});assert.deepEqual(JSON.parse(s.changes[0].data.email_texts),{reminder:{subject:'Still unread: {title}',body:'Hello {recipient_name}, a short reminder.'}});
 // Sent updates keep what they were sent with: sent_settings stores the toggles as sent.
 const q3=rows.find(r=>r.id===UPD(/Q3 2026/))!;assert.equal(q3.data.status,'sent');
});

test('partial or denied reads disable writes and are named; read-only and preview apps propose nothing',async()=>{
 const rows=fresh();const part=await render(rows,{section:'overview'},{kind:'click',action:'setup-standard'},{read:(v:any,rs:Row[])=>v.typeId===T('recipients')?{unavailable:true}:{rows:rs.filter(r=>r.role===v.typeId).slice(v.offset,v.offset+v.limit),total:rs.filter(r=>r.role===v.typeId).length}});
 assert.match(text(part.html),/Partial data: Recipient records could not be read/);assert.equal(part.changes.length,0);
 const ro=await render(rows,{section:'plans'},{kind:'click',action:'draft-now:'+PLAN('Board – monthly update')},{config:cfgFor(undefined,{readOnly:true})});assert.equal(ro.changes.length,0);assert.match(ro.state.notice,/not change it/);
 const pre=await render(rows,{section:'plans'},{kind:'click',action:'draft-now:'+PLAN('Board – monthly update')},{saved:false});assert.equal(pre.changes.length,0);assert.match(pre.state.notice,/Save the app first/);
 const noProg=await render(rows,{section:'overview'},undefined,{config:cfgFor(without('programs')),bindings:fullBindings.filter(b=>b.typeId!=='programs')});assert.doesNotMatch(text(noProg.html),/Partial data/,'programs is optional');
});

test('design gate at 1440 and 390 px for every screen and the review drawer',async()=>{
 const rows=fresh(),frames:any[]=[];for(const section of SCREENS){const o=await render(rows,{section});frames.push({name:section,html:o.html,css:o.output.css});}
 const s=session(rows);await s.open({section:'updates'});const o=await s.click('open:update:'+UPD(/October 2026/));frames.push({name:'review',html:o.html,css:o.output.css});
 const r=await inspectAppDesign(frames);assert.deepEqual(r.issues,[],JSON.stringify(r.issues.slice(0,5)));assert.deepEqual(r.viewports,[1440,390]);
});
