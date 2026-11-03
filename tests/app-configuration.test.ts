import {test} from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFile,readdir} from 'node:fs/promises';import {randomUUID,randomBytes} from 'node:crypto';
import {AutomationEvents} from '../src/automations/events.js';
import type {Database,Connection} from '../src/db/database.js';import type {Actor} from '../src/shared/schema.js';
import {Service} from '../src/domain/service.js';import {WorkspaceFoundation} from '../src/workspace/service.js';import {trackerOperation} from '../src/workspace/tracker-template.js';import {readStandardConfig,standardSource} from '../src/shared/standard-tool.js';import {AccessGrid} from '../src/domain/access-grid.js';import {AccessManagement} from '../src/domain/access-management.js';
import {activityPage} from '../src/workspace/activity.js';
import {AutomationManagement} from '../src/automations/management.js';import {AutomationService} from '../src/automations/service.js';import {AppMonitoring} from '../src/app-services/monitoring.js';import {AppActions,nextAction} from '../src/app-services/service.js';import {actionConfig} from '../src/app-services/schema.js';
async function fixture(t:any){const pg=new PGlite();t.after(()=>pg.close());for(const n of (await readdir('migrations')).filter(n=>n.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+n,'utf8'));const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};const a:Actor={userId:randomUUID(),origin:'human'},b:Actor={userId:randomUUID(),origin:'human'};for(const user of [a,b])await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[user.userId,user.userId,user.userId+'@example.invalid','Fixture']);const s=new Service(db),f=new WorkspaceFoundation(db),w=await s.createWorkspace(a,'App configuration');await s.setAi(a,w.id,true);const save=async(op:any)=>{const p=await s.preview(a,w.id,op);return s.commit(a,p.id,p.digest);},change=async(op:any)=>{const p=await f.preview(a,w.id,op);return f.confirm(a,w.id,p.id,p.digest);};return {pg,db,a,b,s,f,w:w.id,save,change};}
test('optional sections inherit app access and protect source, data, writes, revisions and cache identity',async t=>{
 const {db,a,b,s,f,w,save,change}=await fixture(t),grid=new AccessGrid(db),am=new AccessManagement(db);
 const make=async(name:string)=>(await save({kind:'create_type',name,fields:[{key:'name',name:'Name',kind:'text',ai:true}]})).objects[0].id;
 const publicType=await make('Public records'),secretType=await make('Private records');await save({kind:'create_record',typeId:publicType,data:{name:'Visible record'}});await save({kind:'create_record',typeId:secretType,data:{name:'Confidential value'}});
 const setup={name:'Section tracker',description:'Access test',tabs:[{accessId:'records',name:'Records',typeId:publicType,columns:[{field:'name'}]},{accessId:'budget',name:'Private budget label',typeId:secretType,columns:[{field:'name'}],example:{name:'Private example'}}]},op=await trackerOperation(f,a,w,setup),app=await change(op);
 await s.share(a,w,b.userId,'editor',[],null,true);const before=await f.runFrontend(b,w,{componentId:app.id,expectedVersion:0});
 const v=await grid.read(a,w,b.userId);assert.equal(v.rows.filter(r=>r.kind==='app_section').length,2);assert.ok(v.rows.filter(r=>r.kind==='app_section').every(r=>r.read));
 await grid.save(a,w,{expectedVersion:v.version,changes:[{subject:b.userId,kind:'app_section',resourceId:app.id,field:'budget',read:false,write:false}]});
 const opened=await f.readComponent(b,w,app.id,true);assert.doesNotMatch(JSON.stringify(opened),/Private budget label|Private example|Confidential value/);assert.equal(readStandardConfig(opened.component.source).tabs.length,1);assert.notEqual(before.accessStamp,opened.initialOutput.accessStamp);
 assert.equal((await f.toolTables(b,w,app.id)).length,1);await assert.rejects(f.preview(b,w,{kind:'apply_component_records',componentId:app.id,expectedVersion:0,changes:[{kind:'create_record',typeId:secretType,data:{name:'Forbidden'}}]}));
 // Independent Database permission remains intact, as disclosed by the access review.
 assert.equal((await s.records(b,w,secretType,{limit:10,offset:0})).rows.length,1);
 const config=readStandardConfig(op.content.source);config.tabs.reverse();config.tabs[0].name='Renamed private budget';await change({...op,componentId:app.id,expectedVersion:0,content:{...op.content,source:standardSource(config)}});
 assert.doesNotMatch(JSON.stringify(await f.componentHistory(b,w,app.id)),/Private budget label|Private example|Renamed private budget/);
 const replacement=structuredClone(config);delete replacement.tabs[0].accessId;await assert.rejects(f.preview(a,w,{...op,componentId:app.id,expectedVersion:1,content:{...op.content,source:standardSource(replacement)}}),/restricted section/);
 const escape=structuredClone(config);escape.tabs.push({...escape.tabs[0],accessId:'budget_copy'});await assert.rejects(f.preview(a,w,{...op,componentId:app.id,expectedVersion:1,content:{...op.content,source:standardSource(escape)}}),/restricted data/);
 const current=await grid.read(a,w,b.userId);await grid.save(a,w,{expectedVersion:current.version,changes:[{subject:b.userId,kind:'app_section',resourceId:app.id,field:'records',read:true,write:false}]});await assert.rejects(f.preview(b,w,{kind:'apply_component_records',componentId:app.id,expectedVersion:1,changes:[{kind:'create_record',typeId:publicType,data:{name:'Read only'}}]}));
 const readOnly=await f.runFrontend(b,w,{componentId:app.id,expectedVersion:1,state:{tab:0}});assert.match(readOnly.html,/aria-label="Add record" disabled/);assert.ok(readOnly.tracker.config.tabs.every((tab:any)=>tab.columns.every((c:any)=>!c.editable)));
 await assert.rejects(am.update(a,w,{expectedVersion:(await am.overview(a,w)).version,subject:b.userId,rule:{kind:'app_section',resourceId:app.id,field:'budget',read:'allow',write:'inherit'}}),/inherit/);
 const legacyOp=await trackerOperation(f,a,w,{...setup,tabs:setup.tabs.map(({accessId,...tab})=>tab)}),legacy=await change(legacyOp);assert.equal((await grid.read(a,w,b.userId)).rows.filter(r=>r.kind==='app_section'&&r.resourceId===legacy.id).length,0);assert.ok((await f.readComponent(b,w,legacy.id,true)).initialOutput.tracker);
});
test('unified management preserves disabled definitions, isolates owners, and archives without resuming',async t=>{
 const {db,a,b,s,f,w,change}=await fixture(t),manage=new AutomationManagement(db),runners=new AutomationService(db),research=new AppMonitoring(db),actions=new AppActions(db),app=await change({kind:'save_component',content:{name:'Stable app',format:'frontend-js',sourceAccess:'bindings',bindings:[],source:'return {html:"<p>Stable app</p>"};'}}),expiry=new Date(Date.now()+86400000*30).toISOString();
 const prep=await runners.prepare(a,w,{preferences:{timeZone:'UTC'}}),runner=await runners.confirm(a,w,prep.id,prep.digest);assert.equal((await runners.setup(a,w)).executionPreference.reasoning,'high');assert.equal((await runners.setup(a,w)).hostExecutionSettings,'unverified');
 const config={name:'Research',appId:app.id,objective:'Review public updates',instructions:'Collect sources and summarize material updates.',sourcePolicy:'Primary public sources.',schedule:{description:'Daily',timeZone:'UTC'},expiresAt:expiry,automation:{runnerId:runner.id,trigger:{kind:'calendar',frequency:'daily',time:'06:00',timeZone:'UTC',anchor:'2026-01-01'}}};
 const mp=await research.prepare(a,w,{config});
 // Management starts from a verified connection, just like the production activation gate.
 await assert.rejects(research.confirm(a,w,mp.id,mp.digest),(e:any)=>e.code==='runner_not_ready');
 const ai:Actor={...a,origin:'ai',connectionFamily:randomUUID(),clientId:randomUUID()},oldKey=process.env.CONNECTOR_ENCRYPTION_KEY;
 process.env.CONNECTOR_ENCRYPTION_KEY=randomBytes(32).toString('base64');t.after(()=>{if(oldKey===undefined)delete process.env.CONNECTOR_ENCRYPTION_KEY;else process.env.CONNECTOR_ENCRYPTION_KEY=oldKey;});
 await db.query("INSERT INTO oauth_tokens(hash,user_id,client_id,kind,family,expires_at) VALUES($1,$2,$3,'refresh',$4,$5)",[randomUUID(),a.userId,ai.clientId,ai.connectionFamily,Date.now()+86400000]);
 const events=new AutomationEvents(db,async req=>{const body=JSON.stringify({challenge:JSON.parse(req.body!).challenge});return {status:200,body,bytes:body.length,durationMs:1};});
 await events.subscribe(ai,{name:'automation.ready',arguments:{workspaceId:w,runnerId:runner.id},delivery:{mode:'webhook',url:'https://callbacks.example.org/events',secret:'whsec_'+randomBytes(32).toString('base64')}});
 const occurrence=(await runners.agenda(ai,w,runner.id)).rows.find((r:any)=>r.reason==='verification')!;
 const claimed:any=await runners.claim(ai,w,{runnerId:runner.id,occurrenceId:occurrence.id,requestKey:randomUUID()});await runners.finish(ai,w,{occurrenceId:occurrence.id,claimToken:claimed.claimToken});
 assert.equal((await runners.setup(a,w)).canActivate,true);
 const monitor=await research.confirm(a,w,mp.id,mp.digest);const ac={name:'Email',authoringKey:'email_summary',appId:app.id,appVersion:0,expiresAt:expiry,trigger:{kind:'manual'},steps:[{id:'notify',kind:'email',to:[a.userId+'@example.invalid'],subject:'Update',text:'Saved update'}]};const ap=await actions.prepare(a,w,{config:ac}),action=await actions.confirm(a,w,ap.id,ap.digest);
 const list=await manage.list(a,w,{});assert.equal(list.rows.length,2);assert.ok(list.rows.every(r=>!('config'in r)&&!('last_status'in r)));assert.equal(list.rows.find(r=>r.kind==='research').connectionState,'ready');assert.match(list.rows.find(r=>r.kind==='research').prompt,/Collect sources/);assert.match(list.rows.find(r=>r.kind==='action').prompt,/Email: Update\nSaved update/);assert.ok(list.rows.every(r=>r.app_url.includes(app.id)));assert.equal((await manage.list(a,w,{executor:'trialagents'})).rows.length,1);assert.equal((await manage.list(a,w,{query:'absent'})).rows.length,0);
 await s.share(a,w,b.userId,'editor',[],null,true);await assert.rejects(manage.list(b,w,{}),/owner/);await assert.rejects(manage.control({...a,origin:'ai'},w,'research',monitor.id,0,false),/signed-in|approve/);
 await manage.control(a,w,'research',monitor.id,0,false);await manage.control(a,w,'action',action.id,0,false);
 const edited=await research.prepare(a,w,{monitorId:monitor.id,expectedVersion:0,config:{...config,objective:'Revised research'}});await research.confirm(a,w,edited.id,edited.digest);const editedAction=await actions.prepare(a,w,{actionId:action.id,expectedVersion:0,config:{...ac,name:'Revised email'}});await actions.confirm(a,w,editedAction.id,editedAction.digest);
 assert.equal((await manage.read({...a,origin:'ai'},w,'research',monitor.id)).enabled,false);assert.equal((await manage.read(a,w,'action',action.id)).enabled,false);await assert.rejects(manage.control(a,w,'action',action.id,0,true),/current/);await assert.rejects(actions.prepare(a,w,{config:ac}),/authoring key/);
 await manage.control(a,w,'research',monitor.id,1,true);await manage.control(a,w,'action',action.id,1,true);await change({kind:'archive_component',componentId:app.id,expectedVersion:0,archived:true});await change({kind:'archive_component',componentId:app.id,expectedVersion:1,archived:false});assert.equal((await manage.read(a,w,'research',monitor.id)).enabled,false);assert.equal((await manage.read(a,w,'action',action.id)).enabled,false);assert.match((await f.readComponent(a,w,app.id)).component.source,/Stable app/);
 const monthly=actionConfig.parse({...ac,trigger:{kind:'calendar',frequency:'monthly',anchor:'2026-01-01',time:'06:00',timeZone:'UTC',monthDay:31}});assert.equal(nextAction(monthly,new Date('2026-02-01T00:00Z'))?.toISOString(),'2026-02-28T06:00:00.000Z');assert.equal((await manage.history(a,w,'research',monitor.id)).rows.length,0);
 await runners.control(a,w,runner.id,false,0);const rp=await runners.prepare(a,w,{expectedVersion:1,preferences:{time:'07:00',timeZone:'UTC'}});await runners.confirm(a,w,rp.id,rp.digest);assert.equal((await runners.setup(a,w)).state,'paused');
});

test('Logs attribute app writes and automation runs, filter before pagination, and enforce current app access',async t=>{
 const {db,a,b,s,f,w,save,change}=await fixture(t);
 const type=(await save({kind:'create_type',name:'Signals',fields:[{key:'name',name:'Name',kind:'text',ai:true}]})).objects[0].id;
 const project=await change({kind:'create_node',nodeKind:'project',name:'Research'});
 const op=await trackerOperation(f,a,w,{name:'Signals tracker',description:'Signal collection',tabs:[{name:'Signals',typeId:type,columns:[{field:'name'}]}]});
 const app=await change({...op,projectId:project.id});
 const another=await change({...op,content:{...op.content,name:'Other tracker'}});
 await change({kind:'apply_component_records',componentId:app.id,expectedVersion:0,changes:[{kind:'create_record',typeId:type,data:{name:'Private record sentinel'}}]});
 const monitor=randomUUID(),action=randomUUID(),monitorRun=randomUUID(),actionRun=randomUUID();
 await db.query('INSERT INTO app_monitors(id,workspace_id,user_id,app_id,config,scope_stamp) VALUES($1,$2,$3,$4,$5,$6)',[monitor,w,a.userId,app.id,JSON.stringify({name:'Research signals'}),'fixture']);
 await db.query("INSERT INTO app_monitor_runs(id,workspace_id,user_id,monitor_id,monitor_version,occurrence_key,status,config_snapshot,result) VALUES($1,$2,$3,$4,0,'daily','no_update',$5,$6)",[monitorRun,w,a.userId,monitor,JSON.stringify({instructions:'Private prompt sentinel'}),JSON.stringify({summary:'Private result sentinel'})]);
 await db.query('INSERT INTO app_actions(id,workspace_id,user_id,app_id,config,approved_by) VALUES($1,$2,$3,$4,$5,$3)',[action,w,a.userId,app.id,JSON.stringify({name:'Notify team'})]);
 await db.query("INSERT INTO app_action_runs(id,workspace_id,user_id,action_id,action_version,occurrence,status,results,diagnostic) VALUES($1,$2,$3,$4,0,'daily','failed',$5,$6)",[actionRun,w,a.userId,action,JSON.stringify({message:'Private email sentinel'}),'Private error sentinel']);
 const activity=await activityPage(db,a,w,{appId:app.id,limit:200});
 assert.ok(activity.rows.some(r=>r.action==='record.created'&&r.app_id===app.id));
 assert.ok(activity.rows.some(r=>r.id==='monitor:'+monitorRun&&r.outcome==='no_update'));
 assert.ok(activity.rows.some(r=>r.id==='action:'+actionRun&&r.outcome==='failed'));
 assert.ok(activity.rows.every(r=>r.app_id===app.id&&r.app_name==='Signals tracker'));
 assert.doesNotMatch(JSON.stringify(activity),/Private .* sentinel/);
 assert.deepEqual(activity.apps.map(c=>c.id).sort(),[app.id,another.id].sort());
 const first=await activityPage(db,a,w,{appId:app.id,category:'automation',limit:1});assert.equal(first.total,2);assert.equal(first.nextOffset,1);
 const second=await activityPage(db,a,w,{appId:app.id,category:'automation',limit:1,offset:1,before:first.before});assert.notEqual(first.rows[0].id,second.rows[0].id);assert.equal(second.nextOffset,null);
 assert.equal((await activityPage(db,a,w,{appId:app.id,outcome:'no_update'})).rows.length,1);
 assert.equal((await activityPage(db,a,w,{appId:another.id,category:'automation'})).rows.length,0);
 await s.share(a,w,b.userId,'editor',[],null,true);assert.equal((await activityPage(db,b,w,{appId:app.id,category:'automation'})).rows.length,0);
 await change({kind:'set_project_access',nodeId:project.id,expectedVersion:0,allowedUsers:[a.userId],ai:false});
 const denied=await activityPage(db,{...a,origin:'ai'},w,{appId:app.id});assert.equal(denied.rows.length,0);assert.ok(!denied.apps.some(c=>c.id===app.id));
 const otherSpace=await s.createWorkspace(a,'Other account');assert.equal((await activityPage(db,a,otherSpace.id,{appId:app.id})).rows.length,0);
});

test('automation options inherit app bindings and only expose authorized team members',async t=>{
 const {db,a,b,s,w,save,change}=await fixture(t),manage=new AutomationManagement(db);
 const type=(await save({kind:'create_type',name:'Signals',fields:[{key:'name',name:'Name',kind:'text',ai:true},{key:'secret',name:'Secret',kind:'text',ai:true}]})).objects[0].id;
 const app=await change({kind:'save_component',content:{name:'Signals app',format:'frontend-js',sourceAccess:'bindings',bindings:[{typeId:type,fields:['name']}],source:'return {html:"<p>Signals</p>"};'}});
 const before=await manage.options(a,w,app.id);assert.equal(before.owner.id,a.userId);assert.deepEqual(before.tables[0].fields.map((f:any)=>f.key),['name']);assert.equal(before.members.length,0);assert.deepEqual(before.writeScopes,[]);
 await s.share(a,w,b.userId,'editor',[],null,true);assert.equal((await manage.options(a,w,app.id)).members[0].id,b.userId);await assert.rejects(manage.options(b,w,app.id),/owner/);
 const research=new AppMonitoring(db),config={name:'Bound research',appId:app.id,inheritAppAccess:true,objective:'Review signals',instructions:'Review signals',sourcePolicy:'Primary sources',schedule:{description:'Daily',timeZone:'UTC'},expiresAt:new Date(Date.now()+86400000).toISOString(),readBindings:[{typeId:type,fields:['secret']}]};
 await assert.rejects(research.prepare(a,w,{config}),/linked app access/);await research.prepare(a,w,{config:{...config,readBindings:[{typeId:type,fields:['name']}]}});
});


test('connector impact includes all research and follow-ups, requires fresh confirmation and lists actual services',async t=>{
 const {db,a,b,s,w,change}=await fixture(t),manage=new AutomationManagement(db),runners=new AutomationService(db);
 const app=await change({kind:'save_component',content:{name:'Dependency tracker',format:'frontend-js',sourceAccess:'bindings',bindings:[],source:'return {html:"<p>Tracker</p>"};'}});
 const prep=await runners.prepare(a,w,{preferences:{timeZone:'UTC'}}),runner=await runners.confirm(a,w,prep.id,prep.digest),monitor=randomUUID(),followup=randomUUID(),standalone=randomUUID(),connection=randomUUID();
 await db.query("INSERT INTO connectors(id,workspace_id,tenant_id,config) SELECT $1,id,tenant_id,$3 FROM workspaces WHERE id=$2",[connection,w,JSON.stringify({name:'CRM',secret:'never disclose'})]);
 const monitorConfig={name:'Weekly research',automation:{runnerId:runner.id},instructions:'PRIVATE PROMPT'};
 await db.query('INSERT INTO app_monitors(id,workspace_id,user_id,app_id,config,scope_stamp) VALUES($1,$2,$3,$4,$5,$6)',[monitor,w,a.userId,app.id,JSON.stringify(monitorConfig),'fixture']);
 const steps=[{kind:'email',to:['PRIVATE RECIPIENT'],subject:'Summary',text:'PRIVATE BODY'},{kind:'connector',connectionId:connection,operation:'update'},{kind:'email'}];
 for(const [id,name,trigger] of [[followup,'Research email',{kind:'database',source:'automation_runs',automationId:monitor}],[standalone,'Independent email',{kind:'manual'}]] as const)await db.query('INSERT INTO app_actions(id,workspace_id,user_id,app_id,config,approved_by) VALUES($1,$2,$3,$4,$5,$3)',[id,w,a.userId,app.id,JSON.stringify({name,trigger,steps})]);
 const initial=await manage.connector(a,w);assert.equal(initial.automations.length,2);assert.deepEqual(initial.automations.find(d=>d.id===followup)?.services.map(x=>x.name),['ChatGPT Work','Email','CRM']);assert.doesNotMatch(JSON.stringify(initial.automations),/PRIVATE|secret|instructions|runnerIds/);
 const list=await manage.list(a,w,{});assert.deepEqual(list.rows.find(d=>d.id===standalone).services.map((x:any)=>x.name),['Email','CRM']);assert.deepEqual(list.rows.find(d=>d.id===monitor).services.map((x:any)=>x.name),['ChatGPT Work']);
 await assert.rejects(manage.controlConnector(a,w,runner.id,false,0),(e:any)=>e.code==='connector_impact_changed');
 await assert.rejects(manage.controlConnector({...a,origin:'ai'},w,runner.id,false,0,{confirmed:true,impactDigest:initial.impactDigest}),/authenticated TrialAgents app/);
 // Dependencies are not truncated to the 20-row Automations page, and an added one invalidates an open warning.
 for(let i=0;i<21;i++)await db.query('INSERT INTO app_monitors(id,workspace_id,user_id,app_id,config,scope_stamp) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),w,a.userId,app.id,JSON.stringify({...monitorConfig,name:'Additional '+i}),'fixture']);
 await assert.rejects(manage.controlConnector(a,w,runner.id,false,0,{confirmed:true,impactDigest:initial.impactDigest}),(e:any)=>e.code==='connector_impact_changed');assert.equal((await runners.setup(a,w)).enabled,true);
 const current=await manage.connector(a,w);assert.equal(current.automations.length,23);
 await db.query('UPDATE app_actions SET paused=true WHERE id=$1',[followup]);await assert.rejects(manage.controlConnector(a,w,runner.id,false,0,{confirmed:true,impactDigest:current.impactDigest}),(e:any)=>e.code==='connector_impact_changed');
 const updated=await manage.connector(a,w);await manage.controlConnector(a,w,runner.id,false,0,{confirmed:true,impactDigest:updated.impactDigest});assert.equal((await runners.setup(a,w)).enabled,false);assert.equal((await manage.read(a,w,'research',monitor)).enabled,true);assert.equal((await manage.read(a,w,'action',standalone)).enabled,true);
 await manage.controlConnector(a,w,runner.id,true,1);assert.equal((await runners.setup(a,w)).enabled,true);assert.equal((await manage.read(a,w,'action',followup)).enabled,false);
 await s.share(a,w,b.userId,'editor',[],null,true);await assert.rejects(manage.connector(b,w),/owner/);const other=await s.createWorkspace(a,'Other');assert.equal((await manage.connector(a,other.id)).automations.length,0);
});

test('app duplication optionally copies disabled definitions, remaps follow-ups, and never copies execution state',async t=>{
 const {db,a,b,s,w,change}=await fixture(t),runners=new AutomationService(db),actions=new AppActions(db);
 const app=await change({kind:'save_component',content:{name:'Copy source',format:'frontend-js',sourceAccess:'bindings',bindings:[],source:'return {html:"<p>Source</p>"};'}});
 const setup=await runners.prepare(a,w,{preferences:{timeZone:'UTC'}}),runner=await runners.confirm(a,w,setup.id,setup.digest),monitor=randomUUID(),completion=randomUUID(),followup=randomUUID(),expiry=new Date(Date.now()+86400000*30).toISOString();
 const {monitoringConfig}=await import('../src/app-services/monitoring-schema.js');
 const research=monitoringConfig.parse({name:'Weekly research',authoringKey:'weekly',appId:app.id,objective:'Review updates',instructions:'Review public sources',sourcePolicy:'Primary sources',schedule:{description:'Weekly',timeZone:'UTC'},expiresAt:expiry,automation:{runnerId:runner.id,trigger:{kind:'calendar',frequency:'weekly',time:'06:00',timeZone:'UTC',anchor:'2026-01-01'},completionActionId:completion,completionActionVersion:4}});
 await db.query('INSERT INTO app_monitors(id,workspace_id,user_id,app_id,version,config,scope_stamp,task,coverage_through) VALUES($1,$2,$3,$4,3,$5,$6,$7,now())',[monitor,w,a.userId,app.id,JSON.stringify(research),'fixture',JSON.stringify({id:'external-task-do-not-copy'})]);
 const email={name:'Email report',authoringKey:'email',appId:app.id,appVersion:app.version,expiresAt:expiry,trigger:{kind:'manual'},steps:[{id:'notify',kind:'email',to:[a.userId+'@example.invalid'],subject:'Update',text:'Saved update'}]};
 const p=await actions.prepare(a,w,{config:email}),manual=await actions.confirm(a,w,p.id,p.digest);
 for(const [id,trigger] of [[completion,{kind:'manual'}],[followup,{kind:'database',source:'automation_runs',automationId:monitor,automationVersion:3,events:['updated'],fields:['status'],becomes:{field:'status',operator:'equals',value:'completed'}}]] as const){const config=actionConfig.parse({...email,authoringKey:id===completion?'completion':'followup',trigger});await db.query('INSERT INTO app_actions(id,workspace_id,user_id,app_id,version,config,scope_stamp,approved_by) VALUES($1,$2,$3,$4,4,$5,$6,$3)',[id,w,a.userId,app.id,JSON.stringify(config),'fixture']);}
 const op={kind:'copy_component',sourceComponentId:app.id,expectedVersion:app.version,projectId:null,name:'Plain copy'};
 const plain=await change(op);assert.equal((await db.query('SELECT id FROM app_monitors WHERE app_id=$1',[plain.id])).rows.length,0);assert.equal((await db.query('SELECT id FROM app_actions WHERE app_id=$1',[plain.id])).rows.length,0);
 const f=new WorkspaceFoundation(db),draft=await f.preview(a,w,{...op,copyAutomations:true,name:'Workflow copy'});
 await db.query('UPDATE app_actions SET paused=true WHERE id=$1',[completion]);await assert.rejects(f.confirm(a,w,draft.id,draft.digest),/Copy contents changed/);
 const refreshed=await f.preview(a,w,{...op,copyAutomations:true,name:'Workflow copy'}),copied=await f.confirm(a,w,refreshed.id,refreshed.digest);assert.deepEqual(await f.confirm(a,w,refreshed.id,refreshed.digest),copied);
 const copies=(await db.query('SELECT * FROM app_monitors WHERE app_id=$1',[copied.id])).rows,actionCopies=(await db.query('SELECT * FROM app_actions WHERE app_id=$1',[copied.id])).rows;assert.equal(copies.length,1);assert.equal(actionCopies.length,3);
 const m=copies[0];assert.notEqual(m.id,monitor);assert.equal(m.version,0);assert.equal(m.enabled,false);assert.equal(m.task,null);assert.equal(m.coverage_through,null);assert.equal(m.config.appId,copied.id);assert.equal(m.config.automation.runnerId,runner.id);
 assert.ok(actionCopies.every(r=>r.paused&&r.version===0&&r.config.appId===copied.id&&r.config.appVersion===0));
 assert.equal(m.config.automation.completionActionId,actionCopies.find(r=>r.config.authoringKey==='completion').id);assert.equal(m.config.automation.completionActionVersion,0);
 const linked=actionCopies.find(r=>r.config.authoringKey==='followup');assert.equal(linked.config.trigger.automationId,m.id);assert.equal(linked.config.trigger.automationVersion,0);
 assert.equal((await db.query('SELECT monitor_id FROM automation_dispatch WHERE monitor_id=$1',[m.id])).rows.length,1);
 assert.equal((await db.query('SELECT id FROM automation_occurrences WHERE monitor_id=$1',[m.id])).rows.length,0);
 assert.equal((await db.query('SELECT enabled FROM app_monitors WHERE id=$1',[monitor])).rows[0].enabled,true);
 // Enabling a valid copied email still runs the existing permission and recipient checks.
 const emailCopy=actionCopies.find(r=>r.config.authoringKey==='email');await actions.control(a,w,emailCopy.id,false);assert.equal((await actions.row(a,w,manual.id)).paused,false);
 await s.share(a,w,b.userId,'editor',[],null,true);await assert.rejects(f.preview(b,w,{...op,copyAutomations:true}),/Only the owner/);
});

test('generic apps save layout changes without requiring a legacy type or changing data permissions',async t=>{
 const {db,a,w,save,change}=await fixture(t),f=new WorkspaceFoundation(db);
 const type=(await save({kind:'create_type',name:'Generic app records',fields:[{key:'name',name:'Name',kind:'text',ai:true}]})).objects[0].id;
 const row=(await save({kind:'create_record',typeId:type,data:{name:'Retained record'}})).objects[0].id;
 const operation=await trackerOperation(f,a,w,{name:'Generic app',description:'App layout',tabs:[{name:'Records',typeId:type,columns:[{field:'name'}]}]});
 const app=await change({...operation,content:{...operation.content,resourceKind:'generic'}}),before=(await f.readComponent(a,w,app.id)).component,config=readStandardConfig(before.source);
 const {prepareToolLayout}=await import('../src/workspace/tool-layout.js');
 const preview=await prepareToolLayout(f,a,w,{componentId:app.id,expectedVersion:0,name:'Revised generic app',description:'Updated description',tabs:config.tabs.map((tab:any,i:number)=>({originalIndex:i,typeId:tab.typeId,name:'Renamed records',visible:true,columns:tab.columns.map((c:any)=>({fieldId:c.fieldId,field:c.field,label:'Updated label',visible:true}))}))});
 await f.confirm(a,w,preview.id,preview.digest);const after=(await f.readComponent(a,w,app.id)).component;
 assert.equal(after.resource_kind,'generic');assert.equal(readStandardConfig(after.source).resourceKind,'generic');assert.equal(after.name,'Revised generic app');assert.deepEqual(after.bindings,before.bindings);assert.equal(after.manifest.fields[0].mode,before.manifest.fields[0].mode);assert.equal((await f.record(db,a,w,row)).data.name,'Retained record');
 const output=await f.runFrontend(a,w,{componentId:app.id,expectedVersion:1});assert.ok(output.tracker);assert.match(output.html,/Revised generic app/);
});
