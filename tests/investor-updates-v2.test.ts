import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {appTemplateEntry} from '../src/workspace/app-templates.js';
import {validateRecipeDeclarations} from '../src/automations/recipes-schema.js';
import {validateAppFunctions} from '../src/workspace/app-functions-schema.js';
import {inspectAppDesign} from '../src/workspace/design-quality.js';
import {kitCss} from '../src/shared/app-kit.js';
import {entry,rawSource,isV2Source,fresh,render,session,command,text,apply,id,T,fakeExchange,fullMap,cfgFor,type Row} from './fixtures/investor-updates-v2.js';

/* Investor Updates 2.0.0 (7.3, 7.4): the v2 contract on the kit, on the fictional demo set in production QuickJS with the kit placed
 * ahead of the code exactly as the runtime does. G2 no own header, G3 inline saves with the shown version, G4 working context, G5 one
 * message, G6 owner-only Settings, G7 a first action on every empty screen, G8 Undo, P3/P4 per-screen batched reads and pending reads,
 * and the single confirmation before an update goes out. The 1.0.1 package keeps its own tests (tests/investor-updates*.test.ts). */
const old=JSON.parse(await readFile('templates/apps/life.investor-updates-1.0.1.json','utf8'));
const UPD=(re:RegExp)=>id(T('updates'),d=>re.test(d.title)),PLAN=(n:string)=>id(T('plans'),d=>d.name===n),CAT=(n:string)=>id(T('categories'),d=>d.name===n);
const PERSON=(n:string)=>id('people',d=>d.name===n),RECIP=(n:string)=>id(T('recipients'),d=>d.person_id===PERSON(n));
const SCREENS:[string,string[]][]=[['overview',['today','responses']],['updates',['updates','meetings']],['investors',['people','categories','classes']],['plans',['plans','templates','texts']],['settings',['']]];
const noOwnChrome=(page:string,where:string)=>{const html=page.replace(/<aside class="k-panel"[^>]*><header><h2>.*?<\/h2><button[^>]*aria-label="Close">×<\/button><\/header>/g,'<aside>');// the kit's side panel has its own title row
 assert.doesNotMatch(html,/<header|<h1|<footer/i,where+': no own header, title or footer');assert.doesNotMatch(html,/position:\s*(fixed|sticky)/i,where);assert.doesNotMatch(text(html),/prepared for review|nothing changes until|\(reviewed\)/i,where+': no review wording');};
const empty=():Row[]=>[];

test('package: 2.0.0 is a draft major version on the v2 contract, with the 1.0.x schema, helpers, automations and commands unchanged',async()=>{
 const raw=await readFile('templates/apps/life.investor-updates-2.0.0.json','utf8'),file=JSON.parse(raw);
 assert.ok(appTemplateEntry.safeParse(file).success);assert.equal(file.version,'2.0.0');assert.deepEqual(file.upgradeFrom,['1.0.0','1.0.1']);
 assert.ok(file.source.length<240000&&Buffer.byteLength(raw)<=300000,'catalog limits');
 assert.ok(isV2Source(rawSource()),'the marker is within the first lines after the generated configuration');assert.equal(file.source.split('\n')[0],"'use trialagents v2';");
 assert.doesNotMatch(file.source,/records\.propose/,'v2 saves with records.save');
 assert.doesNotMatch(file.source,/\.k-(button|table|nav|panel)\{/,'no own copy of the kit CSS');
 // Same installer schema and helpers (installers: 1.0.1 archived, 2.0.0 from the folder; both byte-identical content).
 const installers=JSON.parse(await readFile('templates/catalog-installers.json','utf8'));
 assert.equal(installers['life.investor-updates@1.0.1'],'templates/source/investor-updates/archive/1.0.1/schema.example.json');assert.equal(installers['life.investor-updates@2.0.0'],'templates/source/investor-updates/schema.example.json');
 assert.equal(await readFile(installers['life.investor-updates@1.0.1'],'utf8'),await readFile(installers['life.investor-updates@2.0.0'],'utf8'));
 assert.deepEqual(file.functions,old.functions);assert.deepEqual(file.recommendedAutomations,old.recommendedAutomations);assert.deepEqual(file.automationFeatures,old.automationFeatures);
 validateRecipeDeclarations(file);validateAppFunctions(file,Object.keys(JSON.parse(await readFile(installers['life.investor-updates@2.0.0'],'utf8'))));
 const line=(s:string,re:RegExp)=>re.exec(s)![1];
 assert.equal(line(file.source,/^const appCommands=(.+);$/m),line(old.source,/^const appCommands=(.+);$/m),'the same app commands, names and inputs');
 assert.equal(line(file.source,/^const templateLayoutSchema=(.+);$/m),line(old.source,/^const templateLayoutSchema=(.+);$/m),'the same layout declaration');
 for(const k of Object.keys(file.options))assert.ok(k in old.options,k);for(const k of ['tableMap','pageSize','layoutProfile','heading','readOnly','asOfOverride','companyName'])assert.ok(k in file.options,k);
 assert.ok(!('demoLabel' in file.options),'demo labelling lives in the gallery preview only');
 const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8'));assert.equal(seed['life.investor-updates'].version,'1.0.1','2.0.0 waits for the owner (O4)');
 assert.match(execFileSync('node',['scripts/build-investor-updates-template.mjs','--check'],{encoding:'utf8'}),/1\.0\.1 .*2\.0\.0 .*verified/);
 assert.match(file.instructions,/save directly/);assert.doesNotMatch(file.instructions+JSON.stringify(file.documentation),/every write is one exact records\.propose/i);
 const preview=await readFile('templates/source/investor-updates/investor-updates.preview.html','utf8');assert.match(preview,/Fictional demo data/);
});

test('every screen and view renders on the demo data and on empty tables, without own chrome or banners, each from one batched read',async()=>{
 const rows=fresh();
 for(const [section,subs] of SCREENS)for(const sub of subs){
  const r=await render(rows,{section,sub});noOwnChrome(r.html,section+'/'+sub);assert.ok(!r.calls.includes('records.propose'));
  assert.doesNotMatch(r.html,/iu-banner|iu-notice|role="alert"/,'messages go to output.notice');
  const reads=r.calls.filter(c=>c.startsWith('records.read'));assert.equal(reads.length,1,section+'/'+sub+': one read request, got '+reads.join(','));
  assert.match(r.html,/class="k-app"/);
 }
 const ov=await render(rows,{section:'overview'});assert.match(text(ov.html),/What is due .* Board – monthly update October 2026 Overdue 7 Nov In review/);
 // Each screen reads only its tables: Settings reads the settings row, People do not read updates.
 const set=await render(rows,{section:'settings'});assert.deepEqual(set.calls,['records.read(settings)']);
 const inv=await render(rows,{section:'investors'});assert.ok(!inv.calls.some(c=>/updates|templates|plans/.test(c)),inv.calls.join());
 const s=session(rows);await s.open({section:'updates'});
 for(const action of ['open:update:'+UPD(/October 2026/),'ptab:review','close','open:update:'+UPD(/Q3 2026/),'ptab:engagement','close','sub:meetings','open:meeting:'+id(T('meetings'),d=>d.title==='Q4 board meeting'),'close','nav:investors','open:recipient:'+RECIP('Jonas Weber'),'close','sub:categories','open:category:'+CAT('Board'),'close','sub:classes','nav:plans','open:plan:'+PLAN('Board – monthly update'),'close','sub:templates','nav:overview','open:response:'+id(T('responses'),d=>/shortlist/.test(d.message)),'close','add:recipients','close','add:plans','close','add:meetings','close','add-update:email']){
  await s.click(action);noOwnChrome(s.html,action);assert.ok(!s.notice||s.notice.kind!=='error',action+': '+JSON.stringify(s.notice));}
 for(const [section,subs] of SCREENS)for(const sub of subs){const r=await render(empty(),{section,sub});noOwnChrome(r.html,'empty '+section);}
});

test('empty screens offer their first action; the standard setup saves directly',async()=>{
 const actions:Record<string,string>={'overview/today':'setup-standard','updates/updates':'add-update:email','updates/meetings':'add:meetings','investors/people':'add:recipients','investors/categories':'setup-standard','investors/classes':'add:classes','plans/plans':'add:plans','plans/templates':'setup-standard'};
 for(const [k,a] of Object.entries(actions)){const [section,sub]=k.split('/');const r=await render(empty(),{section,sub});assert.match(r.html,/class="k-empty"/,k);assert.match(r.html,new RegExp('class="k-empty".*data-action="'+a+'"'),k);}
 const rows=fresh().filter(r=>![T('categories'),T('templates')].includes(r.role));const out=await render(rows,{section:'overview'},{kind:'click',action:'setup-standard'});
 assert.equal(out.saves.filter((c:any)=>c.typeId===T('categories')).length,3);assert.equal(out.saves.filter((c:any)=>c.typeId===T('templates')).length,5);assert.equal(out.notice.kind,'success');
 assert.ok(!out.calls.includes('records.propose'));
});

test('inline edits save at once with the version shown; board moves, levels and archive use the captured version',async()=>{
 const rows=fresh(),r=rows.find(x=>x.id===RECIP('Jonas Weber'))!;r.version=3;
 const inv=await render(rows,{section:'investors'});const act='edit:'+r.id+':recipients__status:3';assert.ok(inv.html.includes('data-action="'+act+'"'),'the cell carries the record version');
 r.version=4;// someone saved in between: the app still sends the version that was shown
 const out=await render(rows,{section:'investors'},{kind:'change',action:act,value:'paused'});
 assert.deepEqual(out.saves,[{kind:'update_record',recordId:r.id,expectedVersion:3,data:{status:'paused'}}]);assert.equal(out.notice.kind,'success');
 // Required values and options are checked before anything is saved; the message is the platform's.
 const bad=await render(rows,{section:'investors'},{kind:'change',action:act,value:'gone'});assert.equal(bad.saves.length,0);assert.equal(bad.notice.kind,'error');
 // Questions and offers of help: drag a card (or use its menu) to change the status.
 const q=rows.find(x=>x.id===id(T('responses'),d=>/shortlist/.test(d.message)))!;
 const board=await render(rows,{section:'overview',sub:'responses'});assert.match(board.html,/class="k-board"/);
 const mv=await render(rows,{section:'overview',sub:'responses'},{kind:'change',action:'resp-move',value:q.id+'~'+q.version+'>following_up'});
 assert.deepEqual(mv.saves,[{kind:'update_record',recordId:q.id,expectedVersion:q.version,data:{status:'following_up'}}]);
 // A block level changes in place; the update's version comes from the screen.
 const u=rows.find(x=>x.id===UPD(/October 2026/))!;const s=session(rows,{manual:true});await s.open({section:'updates'});await s.click('open:update:'+u.id);
 const lv=/data-action="(lv:[^"]+)"/.exec(s.html)![1];const changed=await s.change(lv,'board');assert.equal(changed.saves.length,1);assert.equal(changed.saves[0].expectedVersion,u.version);assert.equal(changed.saves[0].recordId,u.id);
 // Archive is the platform's archive with the shown version; a draft update is cancelled instead.
 const tpl=rows.find(x=>x.role===T('templates'))!;const ar=await render(rows,{section:'plans',sub:'templates',panel:{type:'template',id:tpl.id}},{kind:'click',action:'archive:templates:'+tpl.id+':'+tpl.version});
 assert.deepEqual(ar.saves,[{kind:'archive_record',recordId:tpl.id,expectedVersion:tpl.version}]);
 const cancel=await render(rows,{section:'updates',panel:{type:'update',id:u.id}},{kind:'click',action:'archive:updates:'+u.id+':'+u.version});assert.deepEqual(cancel.saves[0].data,{status:'cancelled'});
 // Multi-field editors send the version captured when the panel opened.
 const p=rows.find(x=>x.id===PLAN('Board – monthly update'))!;const ed=session(rows,{manual:true});await ed.open({section:'plans'});await ed.click('form:plans:'+p.id);p.version=9;
 const form=Object.fromEntries([...ed.html.matchAll(/name="([^"]+)" type="[^"]*" value="([^"]*)"/g)].map(m=>[m[1],m[2]]));
 const sv=await ed.submit('save-plan',{...form,name:'Board – monthly',format:'email',template_id:p.data.template_id,cadence:'monthly',approver_2:'Anna',mode_cat:'1',['cat_'+CAT('Board')]:'true',mode_src:'1'});
 assert.equal(sv.saves[0].expectedVersion,0,'the version when editing started');
});

test('Settings are the owners\': hidden from editors and viewers, and refused for them',async()=>{
 const rows=fresh();
 const owner=await render(rows,{section:'settings'});assert.match(owner.html,/data-action="nav:settings"/);assert.match(owner.html,/data-action="save-settings"/);
 for(const appRole of ['editor','viewer']){const r=await render(rows,{section:'settings'},undefined,{appRole,writable:appRole==='editor'});assert.doesNotMatch(r.html,/nav:settings|save-settings/,appRole);
  const s=await render(rows,{section:'settings'},{kind:'submit',action:'save-settings',form:{approval_steps:'Two steps (numbers checked first)'}},{appRole});assert.equal(s.saves.length,0,appRole);}
 const saved=await render(rows,{section:'settings'},{kind:'submit',action:'save-settings',form:{sender_display:'First name',approval_steps:'Two steps (numbers checked first)',meeting_lead_days:'10',questions_enabled:'On',help_enabled:'Off',confidentiality_footer:'Confidential.'}});
 const before=rows.find(r=>r.role===T('settings'))!.data,c={...before,...saved.saves[0].data};assert.equal(saved.saves.length,1);assert.deepEqual([c.sender_display,c.approval_steps,c.meeting_lead_days,c.help_enabled,c.questions_enabled],['first_name','two',10,false,true]);
 // Viewers see no write controls at all.
 const view=await render(rows,{section:'investors'},undefined,{appRole:'viewer',writable:false});assert.doesNotMatch(view.html,/data-action="edit:/);assert.doesNotMatch(view.html,/k-button--primary"[^>]*data-action="add:recipients"(?![^>]*disabled)/);
});

test('pending reads show as loading, never as empty or zero; writes wait for the data',async()=>{
 const rows=fresh();
 for(const [section,pending] of [['overview',[T('updates')]],['updates',[T('updates')]],['investors',[T('recipients')]],['plans',[T('plans')]]] as const){
  const r=await render(rows,{section},undefined,{pending});assert.match(r.html,/aria-busy="true"/,section);assert.match(text(r.html),/Loading/,section);
  assert.doesNotMatch(r.html,/k-empty|k-stat/,section+': no empty state and no zero totals while loading');}
 const w=await render(rows,{section:'investors'},{kind:'change',action:'edit:'+RECIP('Jonas Weber')+':recipients__status:0',value:'paused'},{pending:[T('recipients')]});assert.equal(w.saves.length,0);
});

test('messages are the platform notice: success after a save, an error for a refused action, info for the send preparation',async()=>{
 const rows=fresh();
 const ok=await render(rows,{section:'plans'},{kind:'change',action:'edit:'+PLAN('Board – monthly update')+':plans__status:0',value:'paused'});assert.equal(ok.notice.kind,'success');assert.match(ok.notice.message,/Plan paused/);
 const err=await render(rows,{section:'updates'},{kind:'click',action:'submit-review:'+UPD(/Q3 2026/)+':0'});assert.equal(err.notice.kind,'error');assert.match(err.notice.message,/locked/);
 const pre=await render(rows,{section:'plans'},{kind:'click',action:'draft-now:'+PLAN('Board – monthly update')},{saved:false});assert.equal(pre.saves.length,0);assert.match(pre.notice.message,/Save the app first/);
 const part=await render(rows,{section:'investors'},undefined,{read:(v:any,rs:Row[])=>v.typeId===T('recipients')?{unavailable:true}:{rows:rs.filter(r=>r.role===v.typeId).slice(v.offset,v.offset+v.limit),total:rs.filter(r=>r.role===v.typeId).length}});
 assert.equal(part.notice.kind,'error');assert.match(part.notice.message,/Recipient records could not be read/);assert.doesNotMatch(part.html,/Partial data/);
});

test('Undo: after a save the person\'s last action is offered; clicking it runs undo.run',async()=>{
 const rows=fresh();const s=session(rows,{undo:[{undoId:'00000000-0000-4000-8000-00000000aaaa',label:'Status of Jonas Weber'}]});await s.open({section:'investors'});
 await s.change('edit:'+RECIP('Jonas Weber')+':recipients__status:0','paused');assert.ok(s.after.calls.includes('undo.list'),'the screen made from the saved data lists Undo');
 assert.match(s.html,/data-action="undo:00000000-0000-4000-8000-00000000aaaa"/);
 const u=await s.click('undo:00000000-0000-4000-8000-00000000aaaa');assert.ok(u.calls.includes('undo.run'));assert.match(u.notice.message,/Undone/);
});

test('working context: the open update is remembered and comes back on the next visit',async()=>{
 const rows=fresh(),u=UPD(/October 2026/);
 const r=await render(rows,{section:'updates'},{kind:'click',action:'open:update:'+u});assert.deepEqual(r.output.context,{update:u});
 const back=await render(rows,null,undefined,{context:{update:u}});assert.match(text(back.html),/Board – monthly update · October 2026/);assert.match(back.html,/data-action="close"/);
});

test('send keeps its single confirmation: recipients and links are saved on clicks, each email is shown, one confirmed send locks the update',async()=>{
 const rows=fresh(),fx=fakeExchange(),u=UPD(/October 2026/),U=rows.find(r=>r.id===u)!;U.data.status='approved';U.data.approved_2_by='Anna (CEO)';
 const s=session(rows,{exchange:fx});await s.open({section:'updates'});await s.click('open:update:'+u);await s.click('send-open:'+u);noOwnChrome(s.html,'send');
 await s.click('prepare-recipients');assert.equal(s.saves.length,5);assert.ok(s.saves.every((c:any)=>c.typeId===T('deliveries')));assert.ok(!s.calls.some((c:string)=>c.startsWith('exchange.send')),'nothing is sent');
 await s.click('create-links');assert.equal(fx.groups.length,1);assert.equal(fx.groups[0].exchanges.length,5);
 await s.submit('prepare-email',{version:'board_h_q',subject:'October board update',body:'Dear {recipient_name},\n\nHere is October.'});assert.equal(s.state.batch.recipients.length,5);assert.match(s.html,/Gmail, Outlook, Apple Mail ✓/);
 const out=await render(rows,s.state,{kind:'click',action:'confirm-send'},{exchange:fx});
 const sendAt=out.calls.indexOf('exchange.sendEmail'),saveAt=out.calls.indexOf('records.save');assert.ok(sendAt>=0&&saveAt>sendAt,'the send is requested first; the record lock joins its one confirmation');
 assert.equal(fx.calls.filter((c:any)=>c.name==='exchange.sendEmail').length,1);assert.equal(out.notice.kind,'info');assert.match(out.notice.message,/confirm it once in TrialAgents/);
 const lock=out.saves.find((c:any)=>c.recordId===u);assert.equal(lock.data.status,'sent');
 // Assistants cannot send: a command never reaches the exchange.
 const cmd=await command(rows,'update.read',{update_id:u});assert.equal(cmd.ok,true);assert.ok(!cmd.calls.some((c:string)=>c.startsWith('exchange.send')));
});

test('app commands keep their names and inputs; write commands save directly, read commands save nothing',async()=>{
 const rows=fresh();
 const ov=await command(rows,'overview.read');assert.equal(ov.ok,true);assert.equal(ov.saves.length,0);assert.ok(ov.result.due.length>=2);
 const desc=await command(rows,'schema.describe');assert.equal(desc.ok,true);assert.deepEqual(desc.result.screens.map((s:any)=>s.id),['overview','updates','investors','plans','settings']);
 const c=await command(rows,'meeting.create',{title:'December board',meeting_date:'2026-12-10',category_ids:[CAT('Board')]});assert.equal(c.ok,true,c.error);assert.equal(c.saves.length,1);assert.equal(c.saves[0].typeId,T('meetings'));assert.match(c.result.saved[0],/Meeting saved/);
 assert.ok(c.calls.includes('records.save')&&!c.calls.includes('records.propose'));
 const st=await command(rows,'investor.update',{recipient_id:RECIP('Jonas Weber'),status:'paused'});assert.equal(st.ok,true,st.error);assert.deepEqual(st.saves[0].data,{status:'paused'});
 const ar=await command(rows,'record.archive',{table:'share_classes',record_id:id(T('share_classes'),()=>true)});assert.equal(ar.ok,true,ar.error);assert.equal(ar.saves[0].kind,'archive_record');
 const lay=await command(rows,'layout.save',{hide:['investors:email']});assert.equal(lay.ok,true,lay.error);assert.equal(lay.layouts.length,1);
});

test('design check under current rules at 1440, 400 and 390 px for every screen and the update review',{skip:!process.env.APP_DESIGN_CHROMIUM&&'set APP_DESIGN_CHROMIUM to run the browser check'},async()=>{
 const rows=fresh(),frames:any[]=[];const css=(o:any)=>kitCss()+o.css;
 for(const [section,sub] of [['overview','today'],['overview','responses'],['updates','updates'],['investors','people'],['plans','plans'],['settings','']]){const o=await render(rows,{section,sub});frames.push({name:section+'-'+sub,html:o.html,css:css(o.output)});}
 const s=session(rows);await s.open({section:'updates'});await s.click('open:update:'+UPD(/October 2026/));frames.push({name:'review',html:s.html,css:css(s.out.output)});
 const p=await render(rows,{section:'investors',panel:{type:'recipient',id:RECIP('Jonas Weber')}});frames.push({name:'panel',html:p.html,css:css(p.output)});
 const r=await inspectAppDesign(frames,'current');assert.deepEqual(r.issues,[],JSON.stringify(r.issues.slice(0,6)));
});
