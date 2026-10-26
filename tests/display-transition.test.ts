import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DisplayTransition} from '../src/embed/display-transition.js';
function deferred<T>(){let resolve!:(v:T)=>void,reject!:(e:Error)=>void;const promise=new Promise<T>((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
test('keeps the visible workspace until successful loading and ignores duplicate results',async()=>{
 const gate=new DisplayTransition(),load=deferred<string>(),shown=['previous'];let reads=0;
 const display=()=>gate.show('saved:1:2',()=>{reads++;return load.promise;},v=>shown.push(v),()=>assert.fail('unexpected error'));
 const first=display();await display();assert.deepEqual(shown,['previous']);assert.equal(reads,1);
 load.resolve('updated');await first;await display();assert.deepEqual(shown,['previous','updated']);assert.equal(reads,1);
});
test('ignores superseded results and their failures; latest failure preserves current view and can retry',async()=>{
 const gate=new DisplayTransition(),old=deferred<string>(),next=deferred<string>(),shown=['previous'],errors:string[]=[];
 const fail=(e:unknown)=>errors.push((e as Error).message);
 const a=gate.show('old',()=>old.promise,v=>shown.push(v),fail);
 const b=gate.show('next',()=>next.promise,v=>shown.push(v),fail);
 old.reject(Error('stale'));await a;assert.deepEqual(errors,[]);
 next.reject(Error('failed'));await b;assert.deepEqual(shown,['previous']);assert.deepEqual(errors,['failed']);
 await gate.show('next',async()=>'ready',v=>shown.push(v),fail);assert.deepEqual(shown,['previous','ready']);
});
test('navigation cancels pending replacement; locally saved versions are not reopened by echoed results',async()=>{
 const gate=new DisplayTransition(),load=deferred<string>();let commits=0;
 const pending=gate.show('draft',()=>load.promise,()=>commits++,()=>assert.fail());gate.reset();load.resolve('old');await pending;assert.equal(commits,0);
 gate.adopt('saved:1:2');await gate.show('saved:1:2',async()=>{assert.fail('duplicate fetch');},()=>commits++,()=>assert.fail());assert.equal(commits,0);
});
