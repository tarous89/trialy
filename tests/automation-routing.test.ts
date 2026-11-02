import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import express from 'express';
import request from 'supertest';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {addTrackerDesignMcp} from '../src/server/tracker-design.js';
import {addAppMonitoringMcp,prepareAppMonitoringFromMcp} from '../src/server/app-monitoring.js';
import {addAutomationMcp} from '../src/server/automations.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import type {Database} from '../src/db/database.js';
import type {Actor} from '../src/shared/schema.js';
const actor:Actor={userId:randomUUID(),origin:'ai'},workspaceId=randomUUID();
const config={name:'Update my tracker every Friday',appId:randomUUID(),objective:'Find new eligible companies',instructions:'Read primary sources and deduplicate against existing records.',sourcePolicy:'Public primary sources.',schedule:{description:'Every Friday',timeZone:'Europe/Berlin'},expiresAt:'2099-01-01T00:00:00Z'};
const automation={runnerId:randomUUID(),trigger:{kind:'calendar',frequency:'weekly',weekdays:[5],time:'09:00',timeZone:'Europe/Berlin',anchor:'2026-11-02'}};

test('MCP routes older clients to the shared guide and rejects unscheduled new research before writing',async()=>{
 let calls=0;
 const db={query:async()=>{calls++;throw Error('Unexpected database call');}} as unknown as Database;
 const app=express();app.use(express.json());
 app.post('/mcp',async(req,res)=>{
  const server=new McpServer({name:'routing-test',version:'1'});
  const safe=(fn:any)=>async(v:any)=>{try{return {content:[{type:'text',text:JSON.stringify(await fn(v))}]};}catch(e:any){return {isError:true,content:[{type:'text',text:e.message}],structuredContent:{code:e.code}};}};
  addTrackerDesignMcp(server);addAutomationMcp(server,db,actor,safe,{});addAppMonitoringMcp(server,new WorkspaceFoundation(db),actor,safe,{});
  const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
  res.on('close',()=>{void transport.close();void server.close();});await server.connect(transport);await transport.handleRequest(req,res,req.body);
 });
 const rpc=(method:string,params:any={})=>request(app).post('/mcp').set('Accept','application/json, text/event-stream').send({jsonrpc:'2.0',id:1,method,params});
 const tools=(await rpc('tools/list')).body.result.tools;
 for(const name of ['prepare_app_monitoring','list_app_automations','read_app_automation_guide'])assert.match(tools.find((t:any)=>t.name===name).description,/TrialAgents Automations|TrialAgents automations/);
 const read=async(mode?:string,offset=0)=>JSON.parse((await rpc('tools/call',{name:'read_app_monitoring_guide',arguments:{offset,...(mode?{mode}:{})}})).body.result.content[0].text);
 let page=await read(),guide=page.text;
 assert.equal(page.resource,'monitoring');assert.match(guide,/update my tracker weekly/);assert.match(guide,/Never silently fall back/);
 while(page.nextOffset!==null){page=await read(undefined,page.nextOffset);guide+=page.text;}
 assert.match(guide,/claim_automation_work/);assert.match(guide,/read_app_monitor_records/);
 const legacy=await read('legacy');assert.equal(legacy.resource,'legacy-monitoring');assert.match(legacy.text,/Do not use this document to create a new per-app ChatGPT task/);assert.match(legacy.text,/start_app_monitor_run/);
 for(const name of ['Update my tracker weekly','Run this every Friday']){
  const r=await rpc('tools/call',{name:'prepare_app_monitoring',arguments:{workspaceId,config:{...config,name}}});
  assert.equal(r.body.result.isError,true);assert.equal(r.body.result.structuredContent.code,'automation_setup_required');assert.match(r.body.result.content[0].text,/read_automation_setup/);
 }
 assert.equal(calls,0,'routing rejection must not create a monitor, approval or task');
});

test('MCP preserves existing legacy edits and delegates shared work to normal authorization',async()=>{
 const monitorId=randomUUID();let prepared:any,stored:any={config:{}};
 const service={row:async()=>stored,prepare:async(_a:Actor,_w:string,v:any):Promise<any>=>{prepared=v;return {status:'review_required'};}};
 assert.deepEqual(await prepareAppMonitoringFromMcp(service,actor,workspaceId,{config,monitorId,expectedVersion:2}),{status:'review_required'});
 assert.equal(prepared.monitorId,monitorId);assert.equal(prepared.expectedVersion,2);
 stored={config:{automation}};
 await assert.rejects(prepareAppMonitoringFromMcp(service,actor,workspaceId,{config,monitorId,expectedVersion:2}),(e:any)=>e.code==='automation_schedule_required');
 assert.deepEqual(await prepareAppMonitoringFromMcp(service,actor,workspaceId,{config:{...config,automation}}),{status:'review_required'});
 assert.equal(prepared.config.automation.runnerId,automation.runnerId);
 const blocked={...service,prepare:async()=>{throw Error('Runner awaiting owner approval');}};
 await assert.rejects(prepareAppMonitoringFromMcp(blocked,actor,workspaceId,{config:{...config,automation}}),/awaiting owner approval/);
 const denied={...service,row:async()=>{throw Error('Monitoring unavailable');}};
 await assert.rejects(prepareAppMonitoringFromMcp(denied,actor,workspaceId,{config,monitorId,expectedVersion:2}),/Monitoring unavailable/);
});
