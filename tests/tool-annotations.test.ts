import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import type {Database} from '../src/db/database.js';
import {addMcp} from '../src/server/mcp.js';
import {Service} from '../src/domain/service.js';
import {PREVIEW_ONLY_TOOLS,NON_DESTRUCTIVE_WRITE_TOOLS,CLOSED_WORLD_TOOLS} from '../src/server/tool-annotations.js';

// Permission prompts: Claude and ChatGPT ask before every tool not marked read-only. Previews and views must not ask.
test('preview-only tools are read-only and saves keep their prompt',async()=>{
 const db={query:async()=>{throw new Error('Unexpected account access');}} as unknown as Database;
 const app=express();app.use(express.json());
 addMcp(app,new Service(db),(_req,_res,next)=>next());
 const tools:any[]=(await request(app).post('/mcp').set('Accept','application/json, text/event-stream').send({jsonrpc:'2.0',id:1,method:'tools/list',params:{}})).body.result.tools;
 const byName=new Map(tools.map(t=>[t.name,t.annotations]));
 for(const name of [...PREVIEW_ONLY_TOOLS,...NON_DESTRUCTIVE_WRITE_TOOLS].filter(n=>n!=='connect_claude_runner'))assert.ok(byName.has(name),'Policy names a tool that no longer exists: '+name);
 for(const name of PREVIEW_ONLY_TOOLS)assert.deepEqual([byName.get(name).readOnlyHint,byName.get(name).destructiveHint,byName.get(name).openWorldHint],[true,false,false],name);
 for(const name of NON_DESTRUCTIVE_WRITE_TOOLS)assert.equal(byName.get(name).destructiveHint,false,name);
 for(const name of CLOSED_WORLD_TOOLS)if(byName.has(name))assert.equal(byName.get(name).openWorldHint,false,name);
 // Anything that saves, sends or deletes still asks the host.
 for(const name of ['commit_change','confirm_workspace_change','confirm_execution_control','confirm_function','confirm_app_service_review','maintain_workspace_records','run_code','invoke_function','revoke_execution_grant'])assert.equal(byName.get(name).readOnlyHint,false,name);
 for(const name of ['revoke_execution_grant','revoke_maintenance_scope','commit_change'])assert.equal(byName.get(name).destructiveHint,true,name);
});
