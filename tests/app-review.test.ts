import {test} from 'node:test';
import assert from 'node:assert/strict';
import {appRevisionReview} from '../src/workspace/app-review.js';
import {standardSource} from '../src/shared/standard-tool.js';
test('app reviews explain field access with labels and distinguish app saves from automation setup',()=>{
 const config={name:'Outreach',description:'Research',tabs:[{typeId:'companies',name:'Companies',columns:[{field:'name',label:'Company'},{field:'trigger_categories',label:'Trigger categories'},{field:'geographic_priority',label:'Geographic priority'}]}]};
 const before={name:'Outreach',source:standardSource(config as any),bindings:[{typeId:'companies',fields:['name']}]};
 const review=appRevisionReview(before,{content:{name:'Outreach',source:before.source,bindings:[{typeId:'companies',fields:['name','trigger_categories','geographic_priority']}]}});
 assert.deepEqual(review.changes,['Add app access to: Companies · Trigger categories, Companies · Geographic priority.']);assert.match(review.note,/existing app/);assert.match(review.note,/Automation setup is saved separately/);
 assert.doesNotMatch(JSON.stringify(review),/trigger_categories|geographic_priority|source|records/);
});
