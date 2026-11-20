import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NoticeSlot,INFO_MS} from '../src/shared/notice-slot.js';

// U2: one platform message at a time; errors stay until dismissed and yield only to a newer error.
test('the notice slot shows one message and applies the replacement rules',()=>{
 const slot=new NoticeSlot(),dismissed:number[]=[],show=(id:number,error=false)=>slot.show(id,error,()=>dismissed.push(id)).map(e=>e.id);
 assert.equal(INFO_MS,5000);assert.equal(slot.visible(),null);
 assert.deepEqual(show(1),[]);assert.equal(slot.visible(),1);
 // A newer info message replaces the one on screen.
 assert.deepEqual(show(2),[1]);assert.equal(slot.visible(),2);
 // An error replaces an info message.
 assert.deepEqual(show(3,true),[2]);assert.equal(slot.visible(),3);
 // An info message never replaces an undismissed error; it waits behind it.
 assert.deepEqual(show(4),[]);assert.equal(slot.visible(),3);
 // A newer error replaces the older error and the waiting info message.
 assert.deepEqual(show(5,true).sort(),[3,4]);assert.equal(slot.visible(),5);
 // Once the error is dismissed, a message that arrived meanwhile becomes visible.
 assert.deepEqual(show(6),[]);slot.hide(5);assert.equal(slot.visible(),6);
 slot.hide(6);assert.equal(slot.visible(),null);
 // Updating the same message keeps its place and replaces nothing of its own.
 assert.deepEqual(show(7),[]);assert.deepEqual(show(7),[]);assert.equal(slot.visible(),7);
 assert.deepEqual(dismissed,[]);
 let calls=0;const stop=slot.subscribe(()=>calls++);show(8);slot.hide(8);stop();show(9);assert.equal(calls,2);
});
