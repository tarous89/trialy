import {addAppsFixture} from './apps-fixture.js';
import session from 'express-session';
import {addLocalAuth} from '../../src/server/auth.js';
import {schemaCatalog} from '../../src/workspace/catalog.js';
import {AccessGrid} from '../../src/domain/access-grid.js';
import {prepareToolLayout} from '../../src/workspace/tool-layout.js';
import express from 'express';import {PGlite} from '@electric-sql/pglite';import {readFile,readdir,mkdir} from 'node:fs/promises';import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';
import {baseApp} from '../../src/server/app.js';import {Service} from '../../src/domain/service.js';import {WorkspaceFoundation} from '../../src/workspace/service.js';import {trackerOperation} from '../../src/workspace/tracker-template.js';import {workspaceHome} from '../../src/workspace/home.js';import type {Database,Connection} from '../../src/db/database.js';

export async function fixture(){
 const pg=new PGlite();const db:Database={query:(q,v)=>pg.query(q,v) as any,transaction:fn=>pg.transaction(tx=>fn(tx as Connection)),close:()=>pg.close()};
 const app=baseApp();app.set('trust proxy','loopback');const server=app.listen(Number(process.env.VISUAL_TEST_PORT||4179),'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base='http://127.0.0.1:'+(server.address() as any).port;process.env.PUBLIC_URL=base;
 for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+file,'utf8'));
 const actor={userId:randomUUID(),origin:'human' as const};await db.query('INSERT INTO users(id,subject,email,name) VALUES($1,$2,$3,$4)',[actor.userId,actor.userId,'fixture@example.invalid','Fixture']);const s=new Service(db),f=new WorkspaceFoundation(db),w=await s.createWorkspace(actor,'Test account');
 const save=async(op:any)=>{const p=await s.preview(actor,w.id,op);return s.commit(actor,p.id,p.digest);};
 const table=async(name:string)=>(await save({kind:'create_type',name,fields:[{key:'name',name:'Name',kind:'text',ai:true},{key:'status',name:'Status',kind:'select',multiple:true,options:['Planned','Active','Blocked'],ai:true},{key:'channel',name:'Channel',kind:'select',options:['Email','LinkedIn'],ai:true},{key:'next_step',name:'Next step',kind:'text',ai:true},{key:'source',name:'Source',kind:'text',ai:true}]})).objects[0].id;
 const pi=await table('PI Engagement Tracker');await save({kind:'create_record',typeId:pi,data:{name:'University fixture'}});const companies=await table('Companies'),contacts=await table('Contacts');
 const op=await trackerOperation(f,actor,w.id,{name:'Biotech outreach',description:'Track companies and contacts for email and LinkedIn outreach.',overview:{showCounts:true,nextSteps:[{tabIndex:0,titleField:'name',textField:'next_step',heading:'Company next steps'},{tabIndex:1,titleField:'name',textField:'next_step',heading:'Contact follow-ups'}]},tabs:[{name:'Companies',typeId:companies,columns:[{field:'name',label:'Company'},{field:'status'},{field:'channel'},{field:'next_step'},{field:'source'}]},{name:'Contacts',typeId:contacts,columns:[{field:'name',label:'Contact'},{field:'status'},{field:'channel'},{field:'next_step'},{field:'source'}]}],example:{name:'Example biotech',source:null}});const preview=await f.preview(actor,w.id,op);
 const receipt=await f.confirm(actor,w.id,preview.id,preview.digest);const component=(await f.readComponent(actor,w.id,receipt.id)).component;
 for(let i=0;i<26;i++)await save({kind:'create_record',typeId:companies,data:{name:'Biotech '+String(i+1).padStart(2,'0'),status:i%3===0?['Active','Planned']:i%3===1?['Blocked']:['Planned'],channel:i%2?'Email':'LinkedIn',next_step:'Review development plans and arrange a conversation.',source:'User supplied'}});
 const calls:string[]=[];
 const tools=async(name:string,v:any):Promise<any>=>{calls.push(name);
  if(name==='open_workspace')return {screen:'home',uiBuild:'acceptance',viewerId:actor.userId,workspaces:[w],workspaceId:w.id,types:await s.types(actor,w.id)};
  if(name==='read_connected_account')return {connected:true};
  if(name==='read_account_home')return {projects:[],resources:[{id:preview.id,workspaceId:w.id,name:'Saved preview card',kind:'tracker',source:'preview',projectIds:[],status:'Preview',updatedAt:new Date().toISOString()}],total:1};
  if(name==='resolve_tracker_preview')return f.resolveTrackerPreview(actor,w.id,v.previewId);
  if(name==='initialize_account')return {viewerId:actor.userId,workspaceId:w.id,workspaces:[w],types:await s.types(actor,w.id)};
  if(name==='list_project_sharing_members')return [];
  if(name==='list_workspace_projects')return f.nodes(actor,w.id);
  if(name==='list_views')return [];
  if(name==='read_access_grid')return new AccessGrid(db).read(actor,w.id,v.subject);
  if(name==='prepare_tool_layout'){const {workspaceId,...request}=v;return prepareToolLayout(f,actor,w.id,request);}
  if(name==='read_workspace_schema'){const {workspaceId,...request}=v;return schemaCatalog(db,actor,w.id,request);}
  if(name==='list_tables')return s.types(actor,w.id);
  if(name==='list_workspace_previews')return f.pending(actor,w.id);
  if(name==='read_workspace_home')return workspaceHome(db,actor,w.id,v);
  if(name==='read_project_component')return f.readComponent(actor,w.id,v.componentId);
  if(name==='run_component_frontend')return f.runFrontend(actor,w.id,v.request);
  if(name==='check_component_access')return f.checkComponentAccess(actor,w.id,v.componentId);
  if(name==='prepare_workspace_change')return f.preview(actor,w.id,v.operation);
  if(name==='confirm_workspace_change')return f.confirm(actor,w.id,v.previewId,v.digest);
  if(name==='discard_workspace_preview')return f.discard(actor,w.id,v.previewId);
  throw Error('Unexpected tool '+name);
 };
 app.post('/fixture/tool',async(req,res)=>{try{const result=await tools(req.body.name,req.body.arguments);res.json({content:[],structuredContent:{result}});}catch(e){console.error(req.body.name,(e as Error).message);res.json({isError:true,content:[{type:'text',text:(e as Error).message}]});}});
 app.get('/embed',async(_req,res)=>{res.removeHeader('Content-Security-Policy');res.type('html').send(await readFile('dist/embed.html','utf8'));});
 app.get('/',(_req,res)=>{res.removeHeader('Content-Security-Policy');res.type('html').send(`<html><body style="margin:0"><iframe id="app" src="/embed" style="width:100%;height:100vh;border:0"></iframe><script>window.addEventListener('message',async e=>{const m=e.data;if(e.source!==document.getElementById('app').contentWindow)return;if(m.method==='ui/initialize')e.source.postMessage({jsonrpc:'2.0',id:m.id,result:{protocolVersion:m.params.protocolVersion,hostInfo:{name:'Acceptance host',version:'1'},hostCapabilities:{serverTools:{},openLinks:{}},hostContext:{theme:'light',displayMode:'fullscreen'}}},'*');else if(m.method==='ui/notifications/initialized'){window.hostReady=true;}else if(m.method==='ui/open-link'){window.lastOpenedUrl=m.params.url;e.source.postMessage({jsonrpc:'2.0',id:m.id,result:{}},'*');}else if(m.method==='tools/call'){const result=await (await fetch('/fixture/tool',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(m.params)})).json();e.source.postMessage({jsonrpc:'2.0',id:m.id,result},'*');}else if(m.id)e.source.postMessage({jsonrpc:'2.0',id:m.id,result:{}},'*');});window.deliver=result=>document.getElementById('app').contentWindow.postMessage({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{content:[],structuredContent:{result}}},'*');</script></body></html>`);});

 app.get('/fixture/calls',(_req,res)=>res.json(calls));
 app.get('/fixture/initial',async(_req,res)=>{const current=(await f.readComponent(actor,w.id,component.id)).component;res.json({screen:'tracker',workspaceId:w.id,component:current,initialOutput:await f.runFrontend(actor,w.id,{componentId:current.id,expectedVersion:current.version})});});
 app.get('/vivid-catalog',async(_req,res)=>{res.removeHeader('Content-Security-Policy');res.type('html').send(await readFile('plugin/trialy/skills/trialy-tracker-design/assets/vivid-template/catalog.html','utf8'));});
 app.get('/reference',async(_req,res)=>{res.removeHeader('Content-Security-Policy');res.type('html').send(await readFile('plugin/trialy/skills/trialy-tracker-design/assets/approved-theme2-reference.html','utf8'));});
 app.use(session({secret:'synthetic-visual-auth-session-secret-only',resave:false,saveUninitialized:false}));
 addLocalAuth(app,db,base);
 await addAppsFixture(app,db,actor,w);
 return {base,component,w,f,actor,close:async()=>{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await db.close();}};
}

