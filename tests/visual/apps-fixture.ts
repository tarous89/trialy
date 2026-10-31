import {addAppServicesApi} from '../../src/server/app-services.js';
import type {Express} from 'express';
import type {Database} from '../../src/db/database.js';
import type {Actor} from '../../src/shared/schema.js';
import {WorkspaceFoundation} from '../../src/workspace/service.js';
import {Service} from '../../src/domain/service.js';
import {addApi,errors} from '../../src/server/app.js';
import {addAppApi} from '../../src/server/apps.js';
import {addConnectorApi} from '../../src/server/connectors.js';
import {Connectors} from '../../src/connectors/service.js';
import {connectorVault} from '../../src/connectors/secrets.js';
import {randomBytes} from 'node:crypto';
import {appUrl} from '../../src/shared/app-route.js';
import express from 'express';
import path from 'node:path';
export async function addAppsFixture(app:Express,db:Database,actor:Actor,w:any){
 const f=new WorkspaceFoundation(db),s=new Service(db);const schema=await s.preview(actor,w.id,{kind:'create_type',name:'App companies',fields:[{key:'name',name:'Name',kind:'text',ai:true}]});const companyTable=(await s.commit(actor,schema.id,schema.digest)).objects[0].id;const row=await s.preview(actor,w.id,{kind:'create_record',typeId:companyTable,data:{name:'App company'}});const record={id:(await s.commit(actor,row.id,row.digest)).objects[0].id};
 const preview=await f.preview(actor,w.id,{kind:'save_component',content:{name:'Simple app fixture',format:'frontend-js',sourceAccess:'bindings',bindings:[{typeId:companyTable,fields:['name']}],source:"return {html:'<p>Preparing app</p>'};"}}),saved=await f.confirm(actor,w.id,preview.id,preview.digest);
 const otherPreview=await f.preview(actor,w.id,{kind:'save_component',content:{name:'Linked calculator',format:'frontend-js',bindings:[],source:"return {html:'<h1>Linked calculator</h1>'};"}}),other=await f.confirm(actor,w.id,otherPreview.id,otherPreview.digest);
 let sends=0;const connector=new Connectors(db,(tx,a,workspace,id)=>f.component(tx,a,workspace,id),{vault:connectorVault(randomBytes(32).toString('base64')),transport:async()=>{sends++;return {status:200,body:'{"value":"Verified"}',bytes:20,durationMs:1};}});
 const proposal=await connector.prepare(actor,w.id,{config:{name:'Fixture connection',baseUrl:'https://example.invalid',auth:{kind:'none'},operations:[{id:'verify',name:'Verify company',method:'POST',path:'/verify',effect:'write',parameters:[],response:{fields:['value']},users:[actor.userId],apps:[saved.id],destinations:[{typeId:companyTable,fields:['name']}]}]}}),connection=await connector.confirmConfig(actor,w.id,proposal.reviewId,proposal.digest);
 const source=`const state=input.state||{};const path=input.route?.path||'/';let body='';
 const nav='<nav><a href="/">Overview</a> · <a href="/company?recordId=${record.id}">Company</a> · <a href="/calculator">Calculator</a> · <a href="${appUrl({appId:saved.id,workspaceId:w.id,source:'component',route:{path:'/company',recordId:record.id}})}">Company bookmark</a> · <a href="${appUrl({appId:other.id,workspaceId:w.id})}">Linked calculator</a> · <a href="javascript:alert(1)">Unsafe</a></nav>';
 if(path==='/')body='<h1>Overview</h1><p>A simple app with shared records.</p>';
 else if(path==='/company'){const r=tools.call('records.get',{recordId:input.route.recordId});body='<h1>Company</h1><p>'+r.data.name+'</p><button data-action="rename">Rename company</button><button data-action="verify">Verify with connector</button>';
 if(input.event.action==='rename')tools.call('records.propose',[{kind:'update_record',recordId:r.id,expectedVersion:r.version,data:{name:'Updated company'}}]);
 if(input.event.action==='verify'){state.key=state.key||'20000000-0000-4000-8000-000000000001';state.connection=tools.call('connectors.call',{connectionId:'${connection.id}',operation:'verify',requestKey:state.key});}
 if(input.event.action==='connector:completed')state.connection=JSON.parse(input.event.form.result);
 if(state.connection?.result)body+='<p>'+state.connection.result.value+'</p>';}
 else if(path==='/calculator'){if(input.event.action==='calculate')state.total=Number(input.event.form.a)*Number(input.event.form.b);body='<h1>Calculator</h1><form data-action="calculate"><label>Quantity<input name="a" type="number"></label><label>Rate<input name="b" type="number"></label><button type="submit">Calculate</button></form><p>Total: '+(state.total||0)+'</p><label>Draft note<input aria-label="Draft note"></label>';}
 else body='<h1>Page not found</h1>';return {html:nav+body,css:'body{font:14px system-ui;color:#263c32;padding:24px}nav{margin-bottom:24px}button,input{font:inherit;margin:8px;padding:8px}',state};`;
 const revision=await f.preview(actor,w.id,{kind:'save_component',componentId:saved.id,expectedVersion:0,content:{name:'Simple app fixture',format:'frontend-js',sourceAccess:'bindings',source,bindings:[{typeId:companyTable,fields:['name']}]}});await f.confirm(actor,w.id,revision.id,revision.digest);
 app.get('/api/me',(_req,res)=>res.json({user:{id:actor.userId,name:'Fixture',email:'fixture@example.invalid'},csrf:'fixture',workspaces:[w]}));
 process.env.SIMPLE_APPS_ENABLED='false';addApi(app,s,(req,_res,next)=>{req.actor=actor;next();});process.env.SIMPLE_APPS_ENABLED='true';
 addAppServicesApi(app,f);addAppApi(app,f);addConnectorApi(app,f,{service:connector});
 app.get('/fixture/apps',(_req,res)=>res.json({workspaceId:w.id,appId:saved.id,recordId:record.id,connectionId:connection.id,url:appUrl({appId:saved.id,workspaceId:w.id}),sends}));
 app.use('/assets',express.static('dist/web/assets'));app.use('/fonts',express.static('public/fonts'));
 for(const name of ['trialagents-mark-black.png','trialagents-mark-white.png'])app.get('/'+name,(_req,res)=>res.sendFile(path.resolve('public',name)));
 for(const route of ['/app-home','/shared-app','/join-app','/apps/{*path}'])app.get(route,(_req,res)=>res.sendFile(path.resolve('dist/web/index.html')));
 app.use(errors);
}
