import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {isV2Source} from '../src/workspace/browser-runtime.js';
import {readCustomLayout} from '../src/shared/custom-layout.js';
import {appTemplates} from '../src/workspace/app-templates.js';
import {entry,fullMap,cfgFor,render,fresh,apply,text,source} from './fixtures/cro-selection-v2.js';

/* CRO Selection 3.0.0: the rebuild on the kit and the v2 contract (G2–G8, G11, P3–P5). Production QuickJS, the kit in front of the
 * source (effectiveSource), the fictional demo set (as of 13 Nov 2026) and a mocked platform exchange. */
const SCREENS=['overview','requests','vendors','messages','proposals','evaluation','decision','emails','settings'];
const REQUESTS=['req-p2','req-tox','req-bioa'];

test('3.0.0 entry: v2 marker first, same schema, commands and options as 2.1.1, upgradeFrom, no records.propose, under the size limit',async()=>{
 const old=await appTemplates.read({templateId:'life.cro-selection',version:'2.1.1'});
 assert.equal(entry.version,'3.0.0');assert.deepEqual((entry as any).upgradeFrom,['2.1.0','2.1.1']);
 assert.equal(entry.source!.split('\n')[0],"'use trialagents v2';");assert.ok(isV2Source(`const templateConfiguration={};\nconst templateBindings=[];\n${entry.source}`));
 assert.ok(entry.source!.length<240000,String(entry.source!.length));
 assert.doesNotMatch(entry.source!,/records\.propose/);assert.match(entry.source!,/records\.save/);assert.match(entry.source!,/records\.readMany/);
 // The kit and the platform styles come from the runtime: no copy of the kit's CSS in the app.
 assert.doesNotMatch(entry.source!,/@layer trialagents-kit|\.k-table\{border-collapse/);
 // App commands: the same ids, modes and inputs.
 const cmds=(s:string)=>JSON.parse(/^const appCommands=(.+);$/m.exec(s)![1]).map((c:any)=>({id:c.id,mode:c.mode,input:c.input}));
 assert.deepEqual(cmds(entry.source!),cmds(old.source!));
 // Options: tableMap and every option the installer writes stay; only display options of the old design are dropped.
 assert.deepEqual(Object.keys(entry.options).sort(),Object.keys(old.options).filter(k=>!['heading','demoLabel'].includes(k)).sort());
 const installers=JSON.parse(await readFile('templates/catalog-installers.json','utf8'));
 assert.equal(await readFile(installers['life.cro-selection@3.0.0'],'utf8'),await readFile('templates/source/cro-selection/archive/2.1.1/schema.example.json','utf8'),'installer schema byte for byte');
 // A draft: the owner approves versions (O4).
 const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8'));assert.equal(seed['life.cro-selection'].version,'2.1.1');
 const layout=readCustomLayout(`const templateConfiguration={};\nconst templateBindings=[];\n${entry.source}`)!;assert.deepEqual(layout.schema.screens.map(s=>s.id),SCREENS.filter(s=>s!=='emails'),'the layout screens of 2.x, so saved layout profiles stay valid');
 assert.doesNotMatch(entry.instructions,/prepared for review|reviewed\)/i);
});

test('every screen renders for each request: no own header, title, banner, link or review wording; inputs carry an action',async()=>{
 const rows=fresh();
 for(const s of SCREENS)for(const requestId of REQUESTS){
  const out=await render(rows,{section:s,requestId});const html=out.html,t=text(html);
  assert.doesNotMatch(html,/<header|<h1|cs-banner|role="alert"|role="status"|position:fixed|As of /,s);
  assert.doesNotMatch(t,/could not be shown|Partial data|prepared for review|\(reviewed\)|Nothing changes until|Every change is reviewed/i,s+' '+requestId);
  assert.doesNotMatch(html,/\/exchange#/,'no recipient link on '+s);
  for(const m of html.matchAll(/<(input|select|textarea)\b[^>]*>/g))if(!/type="(submit|hidden)"/.test(m[0]))assert.match(m[0],/data-action="/,m[0]);
  assert.match(html,/class="k-nav"/);assert.equal(out.notice,undefined,s);
  assert.deepEqual(out.output.context,{requestId},'the working context is returned');
 }
});

test('each screen reads only its own tables, in one batch; switching screens needs no other reads',async()=>{
 const rows=fresh(),typesOf=(r:any)=>r.reads.flat().map((x:any)=>x.typeId);
 const o=await render(rows,{section:'overview'});
 assert.equal(o.reads.length,1,'one records.readMany for the screen');assert.ok(!o.calls.includes('records.read'));
 assert.deepEqual(typesOf(o).sort(),['croselection.awards','croselection.checklist_items','croselection.invitations','croselection.requests','croselection.settings','organizations']);
 const e=await render(rows,{section:'emails'});assert.deepEqual(typesOf(e).sort(),['croselection.requests','croselection.settings']);
 const p=await render(rows,{section:'proposals',requestId:'req-p2'});assert.ok(!typesOf(p).includes('croselection.scores')&&!typesOf(p).includes('people'));
 // The same screen asks the same batch every time (so the frame answers a revisit from what it holds).
 assert.deepEqual((await render(rows,{section:'overview'})).reads,o.reads);
 // Commands read every table.
 const c=await render(rows,{},{kind:'command',action:'overview.read',value:'{}'});assert.equal(new Set(typesOf(c)).size,14);
});

test('reads still on their way show as loading, never as empty or zero',async()=>{
 for(const s of SCREENS){const out=await render(fresh(),{section:s,requestId:'req-p2'},{kind:'open',action:''},{pending:()=>true});const t=text(out.html);
  assert.match(t,/Loading…/,s);assert.doesNotMatch(t,/No request yet|Open requests|Nothing is waiting|No vendor yet/,s);}
 const x=await render(fresh(),{section:'messages',requestId:'req-p2'},{kind:'open',action:''},{pendingExchange:true});assert.match(text(x.html),/Loading…/);assert.doesNotMatch(text(x.html),/No round yet/);
});

test('every empty screen offers its first action',async()=>{
 const expect:Record<string,RegExp>={overview:/New quick quote/,requests:/New full selection/,vendors:/Add vendor/,messages:/New quick quote/,proposals:/New quick quote/,evaluation:/New quick quote/,decision:/New quick quote/};
 for(const [s,re] of Object.entries(expect)){const html=(await render([],{section:s})).html;assert.match(html,/class="k-empty"/,s);assert.match(html,/k-empty[\s\S]*<button[^>]*k-button--primary[^>]*data-action="[^"]+"/,s);assert.match(text(html),re,s);}
 // With requests but nothing yet in them: the first action of that screen.
 const rows=fresh().filter(r=>!['croselection.criteria','croselection.scores','croselection.awards'].includes(r.role));
 assert.match((await render(rows,{section:'evaluation',requestId:'req-p2'})).html,/data-action="apply-criteria"/);
 assert.match((await render(rows,{section:'decision',requestId:'req-p2'})).html,/k-empty[\s\S]*data-action="panel:decide:new"/);
 const noRound=await render(fresh(),{section:'messages',requestId:'req-p2'},{kind:'open',action:''},{exchange:{groups:[],submissions:[],messages:[],emails:[]}});assert.match(noRound.html,/k-empty[\s\S]*data-action="panel:round:rfp"/);
});

test('Settings: business choices for owners only; editors and viewers see neither the screen nor its navigation',async()=>{
 const owner=await render(fresh(),{section:'settings'});assert.match(text(owner.html),/Default currency.*Blind scoring/);assert.doesNotMatch(text(owner.html),/Opening screen|Name for "|Access and automations|Display/);
 for(const appRole of ['editor','viewer']){const out=await render(fresh(),{section:'settings'},{kind:'open',action:''},{appRole});
  assert.doesNotMatch(out.html,/data-action="nav:settings"/,appRole);assert.doesNotMatch(text(out.html),/Default currency/,appRole);assert.equal(out.state.section,'overview');}
 // Emails is a screen of its own, for everyone who may edit the texts.
 assert.match((await render(fresh(),{section:'emails'},{kind:'open',action:''},{appRole:'editor'})).html,/data-action="save-email"/);
});

test('a value edited where it is shown saves at once with the version shown; nothing is written while opening',async()=>{
 const rows=fresh(),r=rows.find(x=>x.id==='req-p2')!;
 const open=await render(rows,{section:'requests',requestId:'req-p2'});assert.ok(!open.calls.includes('records.save'));
 assert.match(open.html,new RegExp('data-action="edit:req-p2:owner:'+r.version+'"'));
 const out=await render(rows,open.state,{kind:'change',action:'edit:req-p2:owner:'+r.version,value:'D. Lead (fictional)'});
 assert.deepEqual(out.saves,[{kind:'update_record',recordId:'req-p2',expectedVersion:r.version,data:{owner:'D. Lead (fictional)'}}]);
 assert.deepEqual(out.notice,{kind:'success',message:'Saved.'});assert.ok(out.state.justSaved);assert.deepEqual(out.state.flash,{kind:'success',message:'Saved.'});
 // Checks as in the form: a question deadline after the response deadline is refused, with the value's error as the notice.
 const bad=await render(rows,open.state,{kind:'change',action:'edit:req-p2:question_deadline:'+r.version,value:'2027-01-01'});
 assert.equal(bad.saves.length,0);assert.equal(bad.notice.kind,'error');assert.match(bad.notice.message,/question deadline is after/);
 // A checklist status in Evaluation.
 const c=rows.find(x=>x.role==='croselection.checklist_items'&&x.data.request_id==='req-p2')!;
 const ev=await render(rows,{section:'evaluation',requestId:'req-p2'},{kind:'change',action:`edit:${c.id}:status:${c.version}`,value:'issue'});
 assert.deepEqual(ev.saves,[{kind:'update_record',recordId:c.id,expectedVersion:c.version,data:{status:'issue'}}]);
 // The render the platform makes from the saved data shows the message once and offers Undo.
 apply(rows,out.saves);const after=await render(rows,out.state,{kind:'open',action:''},{undo:[{undoId:'00000000-0000-4000-8000-000000000001',label:'Owner changed'}]});
 assert.deepEqual(after.notice,{kind:'success',message:'Saved.'});assert.ok(after.calls.includes('undo.list'));assert.match(after.html,/data-action="undo:00000000-0000-4000-8000-000000000001"/);
 const undo=await render(rows,after.state,{kind:'click',action:'undo:00000000-0000-4000-8000-000000000001'});
 assert.ok(undo.calls.includes('undo.run'));assert.equal(undo.calls.indexOf('undo.run'),0,'undo before the reads');assert.deepEqual(undo.notice,{kind:'success',message:'Undone.'});assert.doesNotMatch(undo.html,/data-action="undo:/);
 const again=await render(rows,undo.state,{kind:'open',action:''});assert.equal(again.notice,undefined,'shown once');
});

test('forms save directly with the version captured when the form opened; archive is archive_record',async()=>{
 const rows=fresh(),r=rows.find(x=>x.id==='req-tox')!;
 const opened=await render(rows,{section:'requests',requestId:'req-tox'},{kind:'click',action:'open-editor:requests:req-tox'});
 assert.match(opened.html,/class="k-panel"/);assert.doesNotMatch(text(opened.html),/review/i);
 r.version=7;// someone saved in between: the save still sends the version seen when the form opened
 const saved=await render(rows,opened.state,{kind:'submit',action:'save-record',form:{name:'28-day GLP tox quote (rats)'}});
 assert.deepEqual(saved.saves,[{kind:'update_record',recordId:'req-tox',expectedVersion:0,data:{name:'28-day GLP tox quote (rats)'}}]);assert.doesNotMatch(saved.html,/class="k-panel"/);
 const v=rows.find(x=>x.role==='organizations')!;
 const arch=await render(rows,{section:'vendors'},{kind:'click',action:'archive:organizations:'+v.id});
 assert.deepEqual(arch.saves,[{kind:'archive_record',recordId:v.id,expectedVersion:v.version}]);
 // A failed save keeps the form and its draft, and reports the error.
 const fail=await render(rows,opened.state,{kind:'submit',action:'save-record',form:{name:'x'}},{failSave:true});assert.equal(fail.notice.kind,'error');assert.match(fail.html,/class="k-panel"/);
});

test('drag and drop: a request moves stage on the Overview board, with the journey rules',async()=>{
 const rows=fresh();
 const o=await render(rows,{section:'overview'});assert.match(o.html,/class="k-board"/);assert.match(o.html,/data-drag="req-tox"/);
 const moved=await render(rows,o.state,{kind:'change',action:'move-stage',value:'req-tox>evaluation'});
 assert.deepEqual(moved.saves,[{kind:'update_record',recordId:'req-tox',expectedVersion:0,data:{stage:'evaluation'}}]);
 const menu=await render(rows,o.state,{kind:'change',action:'move-stage-menu:req-p2',value:'decision'});assert.equal(menu.saves[0].data.stage,'decision');
 const refused=await render(rows,o.state,{kind:'change',action:'move-stage',value:'req-tox>rfi'});assert.equal(refused.saves.length,0);assert.equal(refused.notice.kind,'error');assert.match(refused.notice.message,/Quick quote has no RFI/);
});

test('the one confirmation when something goes out stays: sends are exchange reviews and carry the record changes of the same click',async()=>{
 const rows=fresh();
 const prepared=await render(rows,{section:'vendors',requestId:'req-tox'},{kind:'submit',action:'prepare-email',form:{email_type:'invitation',name_kind:'organization','to_00000000-0000-4000-8000-0000000000e9':'on'}});
 assert.ok(prepared.state.batch);assert.equal(prepared.xwrites.length,0,'preparing shows the emails; nothing goes out');assert.match(prepared.html,/<pre>/);
 const sent=await render(rows,prepared.state,{kind:'click',action:'send-email'});
 assert.equal(sent.xwrites.length,1);assert.equal(sent.xwrites[0].name,'exchange.sendEmail');assert.equal(sent.notice.kind,'info');assert.match(sent.notice.message,/Confirm the send in the review/);
 assert.ok(!sent.state.flash,'an exchange review is not a direct save');
 // Commands can never reach suppliers.
 const cmd=await render(rows,{},{kind:'command',action:'request.read',value:JSON.stringify({request_id:'req-p2'})});assert.equal(cmd.state.command.ok,true);
 const accept=await render(rows,{section:'proposals',requestId:'req-p2',panel:{type:'accept',id:'sub-meridian-2'}},{kind:'submit',action:'accept-submit',form:{}});
 if(accept.xwrites.length){assert.equal(accept.xwrites[0].name,'exchange.acceptSubmission');assert.equal(accept.notice.kind,'info');}
});

test('app commands save directly with a request key; read commands return the app figures',async()=>{
 const rows=fresh();
 const saved=await render(rows,{},{kind:'command',action:'record.save',value:JSON.stringify({role:'requests',id:'req-tox',fields:{owner:'Q. Lead (fictional)'}})},{requestKey:true});
 assert.equal(saved.state.command.ok,true,JSON.stringify(saved.state.command));assert.deepEqual(saved.saves,[{kind:'update_record',recordId:'req-tox',expectedVersion:0,data:{owner:'Q. Lead (fictional)'}}]);
 assert.equal(saved.state.command.result.records,1);assert.doesNotMatch(JSON.stringify(saved.state.command),/review/i);
 const stage=await render(rows,{},{kind:'command',action:'request.stage',value:JSON.stringify({request_id:'req-tox',stage:'evaluation'})},{requestKey:true});assert.equal(stage.saves[0].data.stage,'evaluation');
 const overview=await render(rows,{},{kind:'command',action:'overview.read',value:'{}'});assert.equal(overview.state.command.ok,true);assert.equal(overview.saves.length,0);
 const ex=await render(rows,{},{kind:'command',action:'longlist.add',value:JSON.stringify({request_id:'req-tox',organization_id:'org-helix'})},{requestKey:true});
 assert.ok(ex.state.command.ok||/already|vendor/i.test(ex.state.command.error),JSON.stringify(ex.state.command));
 const layout=await render(rows,{},{kind:'command',action:'layout.save',value:JSON.stringify({hide:['vendors:country']})});assert.equal(layout.state.command.ok,true);assert.equal(layout.layout.visible['vendors:country'],false);
});

test('messages are the platform notice: errors as notices, no banners drawn by the app',async()=>{
 const out=await render(fresh(),{section:'requests',requestId:'req-p2'},{kind:'click',action:'stage:closed'});
 assert.equal(out.saves.length,0);assert.equal(out.notice.kind,'error');assert.match(out.notice.message,/no award/);assert.ok(out.notice.message.length<=300);
 assert.doesNotMatch(out.html,/role="alert"|cs-banner|class="[^"]*notice/);
 // Saved app only: a preview shows no supplier data and makes no exchange call.
 const preview=await render(fresh(),{section:'vendors',requestId:'req-p2'},{kind:'open',action:''},{saved:false});assert.ok(!preview.calls.some(c=>c.startsWith('exchange.')));
 // Viewers: every write control is disabled.
 const viewer=await render(fresh(),{section:'requests',requestId:'req-p2'},{kind:'open',action:''},{writable:false,appRole:'viewer'});assert.doesNotMatch(viewer.html,/class="k-cell"/);
 assert.match(viewer.html,/data-action="add:requests:full_selection" disabled/);
});

test('the working context comes back from input.context on the next visit',async()=>{
 const out=await render(fresh(),{},{kind:'open',action:''},{context:{requestId:'req-tox'}});assert.equal(out.state.requestId,'req-tox');assert.deepEqual(out.output.context,{requestId:'req-tox'});
 const picked=await render(fresh(),out.state,{kind:'change',action:'pick-request',value:'req-bioa'});assert.deepEqual(picked.output.context,{requestId:'req-bioa'});assert.equal(picked.saves.length,0);
 const unknown=await render(fresh(),{},{kind:'open',action:''},{context:{requestId:'gone'}});assert.equal(unknown.state.requestId,'req-p2');
 assert.ok(source(cfgFor(fullMap)).startsWith('const kit=(()=>'));
});

test('design check under the current rules at 1440, 400 and 390 px: every screen and the two largest panels',{skip:process.env.APP_DESIGN_CHECKS==='off'?'APP_DESIGN_CHECKS=off':false},async()=>{
 const {inspectAppDesign}=await import('../src/workspace/design-quality.js');const {kitCss}=await import('../src/shared/app-kit.js');
 const rows=fresh(),frames:any[]=[];
 for(const s of SCREENS){const r=await render(rows,{section:s,requestId:s==='decision'?'req-bioa':'req-p2'});frames.push({name:s,html:r.html,css:kitCss()+r.output.css});}
 for(const [name,st] of [['supplier panel',{section:'vendors',requestId:'req-p2',panel:{type:'supplier',id:'inv-helix'}}],['decision panel',{section:'decision',requestId:'req-p2',panel:{type:'decide',id:'new'}}]] as const){const r=await render(rows,st);frames.push({name,html:r.html,css:kitCss()+r.output.css});}
 const out=await inspectAppDesign(frames,'current');assert.equal(out.status,'passed',JSON.stringify(out.issues.slice(0,5)));
});
