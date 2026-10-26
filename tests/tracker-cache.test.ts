import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeTrackerSnapshot,SNAPSHOT_TTL} from '../src/shared/tracker-cache.js';
const output=(offset=0,accessVersion=1,status='Active')=>({accessVersion,controls:[{recordId:'r'+offset,fieldId:'name',value:offset}],tracker:{config:{name:'Tracker'},pages:[{request:{typeId:'t',limit:25,offset,filters:{status}},result:{rows:[{id:'r'+offset}]}}]}});
test('tracker cache expires, isolates permissions and config, keeps filter/page identity and bounds memory',()=>{
 const a=mergeTrackerSnapshot(null,output(),100);
 const b=mergeTrackerSnapshot(a,output(25),200);assert.equal(b.tracker.pages.length,2);assert.equal(Object.keys(b.tracker.cachedControls).length,2);
 const c=mergeTrackerSnapshot(b,output(25,1,'Done'),300);assert.equal(c.tracker.pages.length,3);
 assert.equal(mergeTrackerSnapshot(c,output(50),SNAPSHOT_TTL+301).tracker.pages.length,1);
 assert.equal(mergeTrackerSnapshot(c,output(50,2),400).tracker.pages.length,1);
 const changed=output(50);changed.tracker.config.name='Changed';assert.equal(mergeTrackerSnapshot(c,changed,400).tracker.pages.length,1);
 let many=a;for(let i=1;i<30;i++)many=mergeTrackerSnapshot(many,output(i*25),100+i);assert.equal(many.tracker.pages.length,16);assert.equal(Object.keys(many.tracker.cachedControls).length,16);
 const updated=output();updated.controls[0].value=99;assert.equal(mergeTrackerSnapshot(a,updated,200).tracker.cachedControls['name:r0'].value,99);
});
