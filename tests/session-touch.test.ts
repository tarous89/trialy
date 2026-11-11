import {test} from 'node:test';
import assert from 'node:assert/strict';
import session from 'express-session';
import {throttleTouch,SESSION_TOUCH_INTERVAL_MS} from '../src/server/auth.js';
function store(){
 const s=new session.MemoryStore() as session.Store&{touches:string[];destroyed:string[]};s.touches=[];s.destroyed=[];
 s.touch=(sid:string,_sess:any,cb?:(err?:any)=>void)=>{s.touches.push(sid);cb?.();};
 const destroy=s.destroy.bind(s);s.destroy=(sid:string,cb?:(err?:any)=>void)=>{s.destroyed.push(sid);destroy(sid,cb);};
 return s;
}
const touch=(s:session.Store,sid:string)=>new Promise<void>((resolve,reject)=>s.touch!(sid,{cookie:{}} as any,(err?:any)=>err?reject(err):resolve()));
test('rolling session expiry is written at most once per interval per session',async()=>{
 let now=1_000_000;const base=store(),s=throttleTouch(base,SESSION_TOUCH_INTERVAL_MS,()=>now);
 await touch(s,'a');await touch(s,'a');await touch(s,'b');
 now+=SESSION_TOUCH_INTERVAL_MS-1;await touch(s,'a');
 assert.deepEqual(base.touches,['a','b']);
 now+=1;await touch(s,'a');assert.deepEqual(base.touches,['a','b','a']);
});
test('destroying or failing a touch never suppresses the next expiry write',async()=>{
 let now=0,failing=true;const base=store(),s=throttleTouch(base,60000,()=>now);
 const touchOnce=base.touch!;base.touch=(sid:string,sess:any,cb?:(err?:any)=>void)=>{if(failing){failing=false;cb?.(new Error('database unavailable'));return;}touchOnce(sid,sess,cb);};
 await assert.rejects(touch(s,'a'),/database unavailable/);await touch(s,'a');assert.deepEqual(base.touches,['a']);
 await new Promise<void>(r=>s.destroy('a',()=>r()));assert.deepEqual(base.destroyed,['a']);
 await touch(s,'a');assert.deepEqual(base.touches,['a','a']);
});
