import {test} from 'node:test';import assert from 'node:assert/strict';
import {databaseCsv} from '../src/shared/download.js';
import {databaseRequest} from '../src/workspace/database-browser.js';import {activityQuery} from '../src/workspace/activity.js';import {homeQuery} from '../src/workspace/home.js';import {frontendRead} from '../src/workspace/frontend.js';
test('database export follows pages, preserves multi-values and omits restricted/hidden columns',async()=>{
 const offsets:number[]=[];const fields=[{key:'name',name:'Name',readable:true},{key:'tags',name:'Tags',readable:true},{key:'secret',name:'Secret',readable:false}];
 const csv=await databaseCsv(async offset=>{offsets.push(offset);return {table:{fields},rows:[{data:{name:offset?'Second':'=HYPERLINK("bad")',tags:['a','b'],secret:'private'}}],nextOffset:offset?null:25};},['name','tags']);
 assert.deepEqual(offsets,[0,25]);assert.equal(csv.split('\r\n').length,3);assert.match(csv,/'=HYPERLINK/);assert.match(csv,/\[""a"",""b""\]/);assert.doesNotMatch(csv,/private|Secret/);
});
test('database export fails instead of downloading partial data after access changes or broken paging',async()=>{
 await assert.rejects(databaseCsv(async()=>({table:{fields:[]},rows:[],nextOffset:null}),['name']),/access changed/);
 await assert.rejects(databaseCsv(async()=>({table:{fields:[]},rows:[],nextOffset:0}),[]),/did not advance/);
});
test('shared browsing defaults use 20 tools and 25 rows, with bounded export batches',()=>{
 const typeId='11111111-1111-4111-8111-111111111111';assert.equal(databaseRequest.parse({typeId}).limit,25);assert.equal(activityQuery.parse({}).limit,25);assert.equal(homeQuery.parse({}).limit,20);assert.equal(frontendRead.parse({typeId}).limit,25);assert.equal(databaseRequest.parse({typeId,limit:100}).limit,100);assert.throws(()=>databaseRequest.parse({typeId,limit:101}));
});
