import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execute} from '../src/foundation/runtime.js';
import {effectiveSource,isV2Source} from '../src/workspace/browser-runtime.js';
import {frontendOutputV2,componentRecordChanges,frontendRead} from '../src/workspace/frontend.js';
import {summarizeInput} from '../src/workspace/app-capabilities.js';
import {readTemplateGuidance} from '../src/workspace/app-templates.js';

/* G11, G12: the example app that assistants are given (read_app_template_guidance resource "example") runs as written,
 * in the real engine, and every call it makes has the shape the platform accepts. */
const guide=await readFile('templates/APP_EXAMPLE.md','utf8'),source=/```js\n([\s\S]*?)\n```/.exec(guide)![1],code=effectiveSource(source);
const DEALS='00000000-0000-4000-8000-000000000001';
const rows=()=>[{id:'11111111-1111-4111-8111-111111111111',version:1,data:{name:'Acme',stage:'Lead',amount:100,owner:'Ana'}},{id:'22222222-2222-4222-8222-222222222222',version:4,data:{name:'Borealis',stage:'Proposal',amount:250,owner:'Ben'}}];
type Options={rows?:any[];pending?:boolean;unavailable?:boolean;undo?:any[]};
async function run(event:any,state:any=null,input:any={},o:Options={}){
 const saved:any[]=[],calls:string[]=[],data=o.rows??rows();
 const out=frontendOutputV2.parse(await execute(code,{saved:true,writable:true,appRole:'owner',context:null,...input,state,event:{kind:'open',action:'',value:null,form:{},...event}},async(name,value:any)=>{
  calls.push(name);
  if(name==='records.readMany'){for(const r of value.reads)frontendRead.parse(r);return {results:value.reads.map(()=>o.pending?{pending:true,rows:[],total:null}:o.unavailable?{unavailable:true,message:'This table is restricted',rows:[],total:null,limit:100,offset:0}:{tableName:'Deals',rows:data,total:data.length,limit:100,offset:0})};}
  if(name==='records.summarize'){summarizeInput.parse(value);return o.pending?{pending:true,totals:null,groups:[]}:{totals:{count:data.length,sum:data.reduce((n,r)=>n+(r.data.amount??0),0),average:null,minimum:null,maximum:null,unavailable:0},groups:[],groupsTruncated:false,metric:'amount'};}
  if(name==='records.save'){saved.push(...componentRecordChanges.parse(value.changes));return {status:'saving',count:value.changes.length};}
  if(name==='undo.list')return {actions:o.undo??[]};
  if(name==='undo.run'){saved.push({undo:value.undoId});return {status:'undone'};}
  throw new Error('Capability unavailable: '+name);
 })) as any;
 return {...out,saved,calls};
}
test('the served example is the v2 example and is offered as a guidance resource',async()=>{
 assert.ok(isV2Source(source));
 const served=await readTemplateGuidance({resource:'example'});assert.equal(served.resource,'example');assert.ok(served.text.startsWith('# TrialAgents example app'));assert.ok(served.resources.includes('example'));
});
test('the example opens, shows loading and restricted data honestly, and has a first action when empty',async()=>{
 const open=await run({});assert.match(open.html,/class="k-app"/);assert.match(open.html,/Acme/);assert.match(open.html,/Borealis/);assert.match(open.html,/350/);assert.deepEqual(open.calls,['records.readMany','records.summarize']);assert.deepEqual(open.saved,[]);
 assert.doesNotMatch(open.html,/<header|<h1/);
 assert.match((await run({},null,{},{pending:true})).html,/Loading/);
 assert.match((await run({},null,{},{unavailable:true})).html,/do not have access/);
 const empty=await run({},null,{},{rows:[]});assert.match(empty.html,/class="k-empty"/);assert.match(empty.html,/data-action="add"/);
 // A viewer gets no edit, add or remove control.
 const viewer=await run({},null,{writable:false,appRole:'viewer'});assert.doesNotMatch(viewer.html,/data-action="(add|archive:|edit:)/);
});
test('the example filters and searches loaded data, changes screens and keeps the working context',async()=>{
 const open=await run({});
 const filtered=await run({kind:'change',action:'filter:stage',value:'Lead'},open.state);assert.match(filtered.html,/Acme/);assert.doesNotMatch(filtered.html,/Borealis/);assert.deepEqual(filtered.saved,[]);
 const searched=await run({kind:'change',action:'search',value:'bor'},open.state);assert.match(searched.html,/Borealis/);assert.doesNotMatch(searched.html,/>Acme</);
 const none=await run({kind:'change',action:'search',value:'zzz'},open.state);assert.match(none.html,/No deal matches/);
 const board=await run({kind:'click',action:'nav:board'},open.state);assert.match(board.html,/class="k-board"/);
 const mine=await run({kind:'change',action:'context',value:'Ana'},open.state);assert.deepEqual(mine.context,{owner:'Ana'});assert.doesNotMatch(mine.html,/Borealis/);
 assert.doesNotMatch((await run({},null,{context:{owner:'Ben'}})).html,/>Acme</);
});
test('the example saves an edit, a new record, a board move and a removal with the versions shown, and offers Undo',async()=>{
 const [a,b]=rows(),open=await run({});
 const edited=await run({kind:'change',action:`edit:${a.id}:amount:${a.version}`,value:'175'},open.state);
 assert.deepEqual(edited.saved,[{kind:'update_record',recordId:a.id,expectedVersion:1,data:{amount:175}}]);assert.deepEqual(edited.notice,{kind:'success',message:'Saved'});
 // The platform makes the screen again after the save: the example then asks for the Undo list.
 const after=await run({},edited.state,{},{undo:[{undoId:'33333333-3333-4333-8333-333333333333',label:'Amount changed'}]});
 assert.ok(after.calls.includes('undo.list'));assert.match(after.html,/data-action="undo:33333333-3333-4333-8333-333333333333"/);
 const undone=await run({kind:'click',action:'undo:33333333-3333-4333-8333-333333333333'},after.state);assert.deepEqual(undone.saved,[{undo:'33333333-3333-4333-8333-333333333333'}]);
 const panel=await run({kind:'click',action:'add'},open.state);assert.match(panel.html,/class="k-panel"/);assert.match(panel.html,/<form data-action="create"/);
 const missing=await run({kind:'submit',action:'create',form:{name:'',stage:'Lead',amount:''}},panel.state);assert.equal(missing.notice.kind,'error');assert.deepEqual(missing.saved,[]);assert.match(missing.html,/class="k-panel"/);
 const created=await run({kind:'submit',action:'create',form:{name:'Cobalt',stage:'Won',amount:'80'}},panel.state);
 assert.deepEqual(created.saved,[{kind:'create_record',typeId:DEALS,data:{name:'Cobalt',stage:'Won',amount:80,owner:null}}]);assert.doesNotMatch(created.html,/class="k-panel"/);
 const moved=await run({kind:'change',action:'move',value:b.id+'>Won'},open.state);assert.deepEqual(moved.saved,[{kind:'update_record',recordId:b.id,expectedVersion:4,data:{stage:'Won'}}]);
 const menu=await run({kind:'change',action:'move-menu:'+a.id,value:'Proposal'},open.state);assert.deepEqual(menu.saved,[{kind:'update_record',recordId:a.id,expectedVersion:1,data:{stage:'Proposal'}}]);
 const removed=await run({kind:'click',action:`archive:${b.id}:${b.version}`},open.state);assert.deepEqual(removed.saved,[{kind:'archive_record',recordId:b.id,expectedVersion:4}]);
});
