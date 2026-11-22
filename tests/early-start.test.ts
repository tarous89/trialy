import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// L1.5: public/start.js begins the first website reads before the main script; early-reads adopts them.
test('the start script begins the reads main.tsx takes, under the same keys',async()=>{
 const fetched:string[]=[];
 const window:any={};
 const context={window,location:{pathname:'/',search:''},URLSearchParams,Date,fetch:async(url:string)=>{fetched.push(url);return {ok:true,json:async()=>({url})};}};
 vm.runInNewContext(await readFile('public/start.js','utf8'),context);
 assert.deepEqual(fetched,['/api/me','/api/account/home']);
 (globalThis as any).window=window;
 try{
  const {earlyReadKey,takeEarlyRead,EARLY_HOME}=await import('../src/shared/early-reads.js');
  assert.equal(window.__trialyEarly,undefined,'adopted once, at load');
  const fallback=async()=>({url:'fallback'});
  assert.deepEqual(await takeEarlyRead(earlyReadKey('me',{}),fallback),{url:'/api/me'});
  assert.deepEqual(await takeEarlyRead(earlyReadKey('home',EARLY_HOME),fallback),{url:'/api/account/home'});
  assert.deepEqual(await takeEarlyRead(earlyReadKey('home',EARLY_HOME),fallback),{url:'fallback'},'each result is used once');
 }finally{delete (globalThis as any).window;}
 // Pages that do not open Apps home start nothing, or only the account check.
 for(const [pathname,search,expected] of [['/apps/x','',[]],['/shared-app','',[]],['/','?tab=database',['/api/me']]] as const){
  const seen:string[]=[];vm.runInNewContext(await readFile('public/start.js','utf8'),{...context,window:{},location:{pathname,search},fetch:async(url:string)=>{seen.push(url);return {ok:true,json:async()=>({})};}});
  assert.deepEqual(seen,expected,pathname+search);
 }
});
