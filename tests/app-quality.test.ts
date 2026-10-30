import {z} from 'zod';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {addWorkspaceMcp} from '../src/server/workspace-foundation.js';
import {prepareRenderedApp} from '../src/workspace/apps.js';
import {appTemplates} from '../src/workspace/app-templates.js';
import {inspectAppDesign} from '../src/workspace/design-quality.js';
import {appDesignCss,designPalettes,contrast,readable} from '../src/shared/app-design.js';
import {standardTracker} from '../src/workspace/standard-tracker.js';

async function fixture(){const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};const a={userId:randomUUID(),origin:'human' as const};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[a.userId,a.userId,'quality@example.invalid','Quality']);const s=new Service(db),f=new WorkspaceFoundation(db),w=await s.createWorkspace(a,'Quality');const handlers=new Map<string,any>();addWorkspaceMcp({registerTool:(n:string,_m:any,run:any)=>handlers.set(n,(input:any)=>run(z.object(_m.inputSchema).parse(input)))} as any,f,a,(run:any)=>run,{});return {db,a,s,f,w,prepare:(input:any)=>handlers.get('prepare_tracker')({workspaceId:w.id,...input})};}
const field=(key:string,extra:any={})=>({key,name:key,kind:'text',ai:true,multiple:false,...extra});
const setup=()=>{const co=randomUUID(),ct=randomUUID();return {name:'Outreach',description:'Linked company and contact outreach',showExample:true,newTables:[{id:co,name:'Companies',fields:[field('name'),field('contacts',{kind:'relationship',targetTypeId:ct,multiple:true})]},{id:ct,name:'Contacts',fields:[field('name'),field('company',{kind:'relationship',targetTypeId:co}),field('email'),field('company_name',{lookup:{reference:'company',field:'name',aggregate:'first'}})]}],tabs:[{name:'Companies',typeId:co,columns:[{field:'name'},{field:'contacts'}]},{name:'Contacts',typeId:ct,columns:[{field:'name'},{field:'company'}]}]};};

test('one creation request survives retries, revisions, atomic linked saves and discard',async()=>{
 process.env.APP_DESIGN_CHECKS='off';const {db,a,s,f,w,prepare}=await fixture();try{
 const requestKey=randomUUID(),input=setup(),draft=await prepare({...input,requestKey});
 assert.equal((await s.types(a,w.id)).length,0);assert.equal((await prepare({...input,requestKey})).preview.id,draft.preview.id);
 assert.equal((await prepare({...setup(),requestKey})).preview.id,draft.preview.id,'new temporary IDs do not duplicate an identical request');
 const contacts=standardTracker(draft.preview.body.content.source)!.config.tabs[1];assert.equal(contacts.columns.find((c:any)=>c.field==='email')?.visible,false);
 await assert.rejects(prepare({...input,requestKey,name:'Changed'}),{code:'request_conflict'});
 const updatedInput={...input,requestKey,name:'Reviewed outreach',replacesPreviewId:draft.preview.id,expectedDigest:draft.preview.digest};
 const updated=await prepare(updatedInput);assert.equal(updated.preview.id,draft.preview.id);assert.notEqual(updated.preview.digest,draft.preview.digest);
 await assert.rejects(prepare(updatedInput),{code:'preview_changed'});
 await assert.rejects(f.confirm(a,w.id,draft.preview.id,draft.preview.digest),{code:'preview_expired'});
 const receipt=await f.confirm(a,w.id,updated.preview.id,updated.preview.digest),types=await s.types(a,w.id);
 assert.equal(types.length,2);const co=types.find(t=>t.name==='Companies')!,ct=types.find(t=>t.name==='Contacts')!;
 assert.equal(co.fields.find((v:any)=>v.key==='contacts').targetTypeId,ct.id);assert.equal(ct.fields.find((v:any)=>v.key==='company').targetTypeId,co.id);
 const saved=(await f.readComponent(a,w.id,receipt.id)).component;assert.ok(saved.bindings.find((b:any)=>b.typeId===ct.id).fields.includes('email'));assert.equal(standardTracker(saved.source)!.config.tabs[1].columns.find((c:any)=>c.field==='email')?.visible,false);
 const replay=await prepare({...input,requestKey,name:'Reviewed outreach'});assert.equal(replay.screen,'tracker');assert.equal(replay.component.id,receipt.id);
 assert.equal((await db.query('SELECT id FROM workspace_previews')).rows.length,0);assert.equal((await db.query('SELECT id FROM records')).rows.length,0);
 const nextKey=randomUUID(),nextInput=setup(),next=await prepare({...nextInput,requestKey:nextKey});await f.discard(a,w.id,next.preview.id);await assert.rejects(prepare({...nextInput,requestKey:nextKey}),{code:'request_discarded'});
 const parallelKey=randomUUID(),parallelInput=setup();parallelInput.newTables.forEach(t=>t.name='Parallel '+t.name);const parallel=await Promise.all([prepare({...parallelInput,requestKey:parallelKey}),prepare({...parallelInput,requestKey:parallelKey})]);assert.equal(parallel[0].preview.id,parallel[1].preview.id);
 const invalid=setup();invalid.newTables[1].fields[1].targetTypeId=randomUUID();await assert.rejects(prepare(invalid));assert.equal((await s.types(a,w.id)).length,2);
 const cycle=setup();cycle.newTables[0].fields.push(field('cycle',{lookup:{reference:'contacts',field:'company_name',aggregate:'first'}}));cycle.newTables[1].fields[3].lookup.field='cycle';await assert.rejects(prepare(cycle),/Circular/);
 // A failed app save rolls back all new tables and retains the exact draft.
 const count=types.length;const original=Service.prototype.createTypeBundle;Service.prototype.createTypeBundle=async function(...args:any[]){await (original as any).apply(this,args);throw Error('Simulated transaction failure');};
 try{await assert.rejects(f.confirm(a,w.id,parallel[0].preview.id,parallel[0].preview.digest),/Simulated transaction failure/);}finally{Service.prototype.createTypeBundle=original;}
 assert.equal((await s.types(a,w.id)).length,count);assert.ok((await f.resolveTrackerPreview(a,w.id,parallel[0].preview.id)).preview);
 }finally{await db.close();}
});

test('real browser checks reject unreadable or overlapping custom content and preserve a previous draft',async()=>{
 const {db,a,f,w,prepare}=await fixture();process.env.APP_DESIGN_CHECKS='on';try{
 const requestKey=randomUUID(),input={requestKey,content:{name:'Quality app',source:'return {html:"<main><h1>Good app</h1><p>Clear copy with comfortable spacing.</p><button>Continue</button></main>",css:""};',bindings:[]}};
 const good=await prepareRenderedApp(f,a,w.id,input);assert.equal(good.designQuality.status,'passed');
 const bad={...input,replacesPreviewId:good.preview.id,expectedDigest:good.preview.digest,content:{...input.content,source:'return {html:"<main><p>Unreadable text</p></main>",css:"p{color:#eeeeee;background:#ffffff}"};'}};
 await assert.rejects(prepareRenderedApp(f,a,w.id,bad),{code:'app_design_quality'});assert.equal((await f.resolveTrackerPreview(a,w.id,good.preview.id)).preview.digest,good.preview.digest);
 assert.equal((await db.query('SELECT id FROM workspace_previews')).rows.length,1);
 for(const templateId of ['simple.calculator','simple.checklist']){const t=await appTemplates.read({templateId});const draft=await f.prepareRenderedTracker(a,w.id,await appTemplates.operation(f,a,w.id,{templateId,version:t.version,digest:t.digest,name:'Catalog '+templateId}));assert.equal(draft.designQuality.status,'passed');await f.discard(a,w.id,draft.preview.id);}
 const defaultDraft=await prepare(setup());assert.equal(defaultDraft.designQuality.status,'passed');await f.discard(a,w.id,defaultDraft.preview.id);
 for(const [name,theme] of Object.entries(designPalettes)){const draft=await prepare({...setup(),name:'Palette '+name,theme});assert.equal(draft.designQuality.status,'passed');await f.discard(a,w.id,draft.preview.id);}
 const checks=await inspectAppDesign([{name:'Bad controls',html:'<main><p style="font-size:9px">Tiny text</p><button>A</button><button>B</button></main>',css:appDesignCss+'button{position:absolute;top:40px;left:30px}'}]);assert.ok(checks.issues.some(x=>x.code==='small_text'));assert.ok(checks.issues.some(x=>x.code==='overlapping_controls'));
 }finally{process.env.APP_DESIGN_CHECKS='off';await db.close();}
});

test('palette correction enforces readable foreground pairs',()=>{for(const palette of Object.values(designPalettes))for(const bg of [palette.background,palette.surface])for(const fg of [palette.text,palette.muted,palette.accent,'#888888'])assert.ok(contrast(readable(fg,bg),bg)>=4.5);});
