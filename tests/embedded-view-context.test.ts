import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createViewContextPublisher,viewContextText} from '../src/embed/view-context.js';
import {appSignInReturn} from '../src/shared/app-route.js';
const parse=(text:string)=>JSON.parse(text.slice(text.indexOf('\n')+1));
test('view context allowlists and bounds metadata without record values or draft content',()=>{
 const result=parse(viewContextText({view:'database',workspaceId:'workspace',tableId:'table',field:'name',fields:Array.from({length:90},()=>({key:'name',name:'N'.repeat(300),value:'PRIVATE'})),selectedRecordIds:Array(30).fill('id'),scope:{kind:'column',resourceId:'table',field:'name',grant:'PRIVATE'},editing:true,password:'PRIVATE',records:[{name:'PRIVATE'}],draft:'PRIVATE'} as any));
 assert.equal(result.fields.length,80);assert.equal(result.fields[0].name.length,160);assert.equal(result.selectedRecordIds.length,25);
 assert.equal(JSON.stringify(result).includes('PRIVATE'),false);assert.deepEqual(result.scope,{kind:'column',resourceId:'table',field:'name'});assert.equal(result.field,'name');
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
