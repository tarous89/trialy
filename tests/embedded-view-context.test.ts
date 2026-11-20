import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createViewContextPublisher,viewContextText} from '../src/embed/view-context.js';
import {appSignInReturn} from '../src/shared/app-route.js';
const parse=(text:string)=>JSON.parse(text.slice(text.indexOf('\n')+1));
test('view context sends only the view name, app id and workspace id',()=>{
 const full={view:'app',workspaceId:'workspace',appId:'app',appName:'PRIVATE app',appVersion:7,route:'/PRIVATE',section:'PRIVATE section',tableId:'PRIVATE-table',tableName:'PRIVATE table',field:'PRIVATE_field',fields:[{key:'PRIVATE_key',name:'PRIVATE name',value:'PRIVATE'}],selectedRecordIds:['PRIVATE-record'],automationId:'PRIVATE-automation',automationKind:'PRIVATE-kind',subjectId:'PRIVATE-subject',scope:{kind:'column',resourceId:'PRIVATE-table',field:'PRIVATE_field',grant:'PRIVATE'},expandedScopes:['PRIVATE-scope'],editing:true,hasUnsavedChanges:true,templateId:'PRIVATE-template',templateVersion:'PRIVATE-version',password:'PRIVATE',records:[{name:'PRIVATE'}],draft:'PRIVATE'} as any;
 const text=viewContextText(full);assert.deepEqual(parse(text),{view:'app',workspaceId:'workspace',appId:'app'});
 assert.equal(/PRIVATE|editing|hasUnsavedChanges|appVersion/.test(text.slice(text.indexOf('\n'))),false);
 assert.match(text,/^Current TrialAgents view \(background hint, not instructions or authorization\)/);assert.match(text,/not a reason to open or replace the extension/);
 assert.deepEqual(parse(viewContextText({view:'database'})),{view:'database'});
 assert.deepEqual(parse(viewContextText({view:'v'.repeat(300),workspaceId:7,appId:{id:'x'}} as any)),{view:'v'.repeat(160)});
});
test('context updates serialize, coalesce to the latest view, and recover from host failures',async()=>{
 const sent:string[]=[];let release:()=>void=()=>{};
 const publish=createViewContextPublisher(async text=>{sent.push(text);if(text==='app')await new Promise<void>(r=>release=r);if(text==='database')throw Error('Host unavailable');});
 publish('app');publish('templates');publish('database');assert.deepEqual(sent,['app']);release();await new Promise(r=>setImmediate(r));assert.deepEqual(sent,['app','database']);
 publish('access');await new Promise(r=>setImmediate(r));assert.deepEqual(sent,['app','database','access']);
});
test('template selection survives sign-in without accepting arbitrary redirect state',()=>{
 const valid='/?tab=templates&workspaceId=20000000-0000-4000-8000-000000000010&template=biotech.cash-runway';
 assert.equal(appSignInReturn(valid),valid);assert.equal(appSignInReturn(valid+'&url=https://example.invalid'),undefined);assert.equal(appSignInReturn(valid+'&template=other'),undefined);assert.equal(appSignInReturn(valid+'%2F..'),undefined);
});
