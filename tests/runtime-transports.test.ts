import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {request} from 'node:http';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {addWorkspaceApi,addWorkspaceMcp} from '../src/server/workspace-foundation.js';
import {addMcp} from '../src/server/mcp.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {Service} from '../src/domain/service.js';
import type {Database} from '../src/db/database.js';

const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(r=>{resolve=r;});return {promise,resolve};};
for(const host of ['web','chatgpt','claude'] as const)test(`${host} forwards cancellation but normal body completion does not cancel`,{timeout:10000},async t=>{
 const actor={userId:randomUUID(),origin:'human' as const},workspaceId=randomUUID(),componentId=randomUUID();
 const app=express();app.use(express.json());app.use((req,_res,next)=>{req.actor=actor;next();});
 const db={} as Database,foundation=new WorkspaceFoundation(db);
 let entered=deferred(),finish=deferred(),cancelled=deferred(),signal:AbortSignal|undefined;
 t.mock.method(WorkspaceFoundation.prototype,'runFrontend',async(_a:any,_w:any,_input:any,current?:AbortSignal)=>{
  signal=current;current?.addEventListener('abort',()=>cancelled.resolve(),{once:true});entered.resolve();await finish.promise;return {html:'ready'};
 });
 if(host==='web')addWorkspaceApi(app,foundation);else addMcp(app,new Service(db),(req,_res,next)=>{req.actor={...actor,origin:'ai',assistant:host};next();},{host,path:host==='claude'?'/claude/mcp':'/mcp'});
 const server=app.listen(0);await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});
 const port=(server.address() as any).port,path=host==='web'?`/api/workspaces/${workspaceId}/organization/frontend/run`:host==='claude'?'/claude/mcp':'/mcp';
 const body=host==='web'?{componentId,event:{kind:'open'}}:{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'run_component_frontend',arguments:{workspaceId,request:{componentId,event:{kind:'open'}}}}};
 const send=()=>{const req=request({host:'127.0.0.1',port,path,method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream',authorization:'Bearer fixture'}},res=>{res.resume();});req.on('error',()=>{});req.end(JSON.stringify(body));return req;};
 const normal=fetch(`http://127.0.0.1:${port}${path}`,{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream',authorization:'Bearer fixture'},body:JSON.stringify(body)});
 await entered.promise;assert.ok(signal);assert.equal(signal.aborted,false);
 finish.resolve();const res=await normal;await res.json();assert.equal(res.status,200);
 // Each HTTP MCP request owns its SDK signal. After a finished response the
 // transport may close; the next request must receive a fresh live signal.
 const priorSignal=signal;entered=deferred();finish=deferred();cancelled=deferred();
 const abandoned=send();await entered.promise;assert.ok(signal);assert.notEqual(signal,priorSignal);assert.equal(signal.aborted,false);abandoned.destroy();
 await cancelled.promise;assert.equal(signal.aborted,true);finish.resolve();
});

for(const name of ['read_account_home','read_workspace_home'])test(`${name} stops at the next read boundary on MCP cancellation`,async()=>{
 const controller=new AbortController(),entered=deferred(),finish=deferred(),handlers=new Map<string,any>();let queries=0;
 const db:Database={query:async()=>{queries++;entered.resolve();await finish.promise;return {rows:[],rowCount:0};},transaction:async fn=>fn(db),close:async()=>{}};
 addWorkspaceMcp({registerTool:(name:string,_config:any,handler:any)=>handlers.set(name,handler)} as any,new WorkspaceFoundation(db),{userId:randomUUID(),origin:'ai'},(fn:any)=>fn,{});
 const work=assert.rejects(handlers.get(name)({workspaceId:randomUUID()},{signal:controller.signal}),{name:'AbortError'});
 await entered.promise;controller.abort();finish.resolve();await work;assert.equal(queries,1);
});
