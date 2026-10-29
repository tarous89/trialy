import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {prepareSimpleApp,readApp} from '../src/workspace/apps.js';
import {appUrl,parseAppUrl,appSignInReturn} from '../src/shared/app-route.js';
import {addAppMcp} from '../src/server/apps.js';
import {frameLinkTarget,resolveAppLink} from '../src/shared/app-links.js';
import {projectTheme} from '../src/shared/ui/project-theme.js';
import type {Actor} from '../src/shared/schema.js';
test('app links preserve only validated app identifiers and route state',()=>{
 const appId=randomUUID(),workspaceId=randomUUID(),recordId=randomUUID(),v={appId,workspaceId,route:{path:'/companies/detail',recordId,page:3}},url=appUrl(v);
 assert.deepEqual(parseAppUrl(url),{...v,source:'component'});assert.equal(appSignInReturn(url),url);
 for(const input of ['https://evil.example/apps/'+appId,'//evil.example/apps/'+appId,'/apps/'+appId+'/../auth/logout?workspaceId='+workspaceId,url+'&secret=token',url+'&page=4',url+'#private',url.replace('/companies/detail','/%2e%2e'),url.replace('/companies/detail','/a\\b')])assert.equal(appSignInReturn(input),undefined,input);
 assert.throws(()=>appUrl({...v,route:{path:'/a/../b'}}));assert.deepEqual(projectTheme(workspaceId),projectTheme(workspaceId));assert.notDeepEqual(projectTheme(workspaceId),projectTheme());
});
test('neutral apps retain existing save/permission contracts and receive page routes',async()=>{
 const pg=new PGlite();for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const db:Database={query:(s,v)=>pg.query(s,v) as any,transaction:f=>pg.transaction(tx=>f(tx as Connection)),close:()=>pg.close()};
 const before=process.env.SIMPLE_APPS_ENABLED;process.env.SIMPLE_APPS_ENABLED='true';
 try{
  const a:Actor={userId:randomUUID(),origin:'human'},stranger:Actor={userId:randomUUID(),origin:'human'},s=new Service(db),f=new WorkspaceFoundation(db);
  for(const actor of [a,stranger])await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'synthetic@example.invalid','Synthetic']);
  const w=await s.createWorkspace(a,'Simple apps');
  const draft=await prepareSimpleApp(f,a,w.id,{content:{name:'Calculator',source:"return {html:'<p>Calculator</p>',state:input.route??null};",bindings:[]}});
  assert.equal((await f.runFrontend(a,w.id,{previewId:draft.id,route:{path:'/calculator'}})).state.path,'/calculator');
  const saved=await f.confirm(a,w.id,draft.id,draft.digest),location={appId:saved.id,workspaceId:w.id,route:{path:'/calculator'}};
  const registered=new Map<string,any>();addAppMcp({registerTool:(name:string,metadata:any,run:any)=>registered.set(name,{metadata,run})} as any,f,a,(fn:any)=>fn,{ui:{resourceUri:'ui://trialy/test'}});const launched=await registered.get('open_app').run(location);assert.equal(launched.screen,'app-link');assert.equal(launched.url,new URL(appUrl(location),process.env.PUBLIC_URL??'https://trialy-web.onrender.com').href);assert.equal(registered.get('open_app').metadata._meta.ui?.resourceUri,undefined);assert.equal(registered.get('read_app').metadata._meta.ui?.resourceUri,undefined);
  const result=await readApp(f,a,location);assert.equal((result as any).component.resource_kind,'generic');assert.equal((result as any).component.id,saved.id);
  await assert.rejects(readApp(f,stranger,location));
  const output=await f.runFrontend(a,w.id,{componentId:saved.id,expectedVersion:0,route:{path:'/calculator',page:2}});assert.deepEqual(output.state,{path:'/calculator',page:2});
  const legacy=await f.runFrontend(a,w.id,{componentId:saved.id,expectedVersion:0});assert.equal(legacy.state,null);
  const save=async(op:any)=>{const p=await s.preview(a,w.id,op);return s.commit(a,p.id,p.digest);};
  const table=(await save({kind:'create_type',name:'Companies',fields:[{key:'name',name:'Name',kind:'text'},{key:'private',name:'Private',kind:'text'}]})).objects[0].id;
  const record=(await save({kind:'create_record',typeId:table,data:{name:'Acme',private:'Omit'}})).objects[0].id;
  const detailDraft=await prepareSimpleApp(f,a,w.id,{content:{name:'Details',sourceAccess:'bindings',source:"const record=tools.call('records.get',{recordId:input.route.recordId});return {html:'<p>Details</p>',state:record};",bindings:[{typeId:table,fields:['name']}]}}),detail=await f.confirm(a,w.id,detailDraft.id,detailDraft.digest);
  const request={componentId:detail.id,expectedVersion:0,route:{path:'/company',recordId:record}};
  const loaded=await f.runFrontend(a,w.id,request);assert.deepEqual(loaded.state.data,{name:'Acme'});
  await assert.rejects(f.runFrontend(a,w.id,{...request,route:{path:'/company',recordId:randomUUID()}}));
  await db.query("UPDATE records SET state='archived' WHERE id=$1",[record]);await assert.rejects(f.runFrontend(a,w.id,request));
  await db.query('UPDATE workspace_components SET archived=true WHERE id=$1',[saved.id]);await assert.rejects(readApp(f,a,location),/unavailable/);
 }finally{if(before===undefined)delete process.env.SIMPLE_APPS_ENABLED;else process.env.SIMPLE_APPS_ENABLED=before;await pg.close();}
});

test('frame links keep app pages local and cross-app links native without executable URLs',()=>{
 const current={appId:randomUUID(),workspaceId:randomUUID(),source:'component' as const,route:{path:'/companies'}},origin='https://trialy.example';
 assert.equal(resolveAppLink('detail',current,origin)?.kind,'internal');
 assert.equal(frameLinkTarget(appUrl(current),origin,current)?.external,false);
 const other=appUrl({...current,appId:randomUUID(),route:{path:'/calculator'}});
 assert.deepEqual(frameLinkTarget(other,origin,current),{href:origin+other,external:true});
 assert.equal(resolveAppLink(other,current,origin)?.kind,'app');
 assert.equal(frameLinkTarget('https://docs.example/apps/help',origin,current)?.external,true);
 for(const value of ['javascript:alert(1)','data:text/html,bad','//other.example','https://user:secret@example.com','/apps/bad?workspaceId=bad'])assert.equal(frameLinkTarget(value,origin,current),null);
 for(const value of ['/detail?private=value','/detail#secret','/detail?page=1&page=2'])assert.equal(resolveAppLink(value,current,origin),null);
 const setup='/?tab=connectors&workspaceId='+current.workspaceId+'&connectorReview='+randomUUID();assert.equal(appSignInReturn(setup),setup);
 for(const value of [setup+'&secret=value',setup+'&workspaceId='+randomUUID(),setup.replace('/?','//evil.example/?')])assert.equal(appSignInReturn(value),undefined);
});
