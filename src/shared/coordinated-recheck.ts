export type RecheckReason='return'|'interval';
type Clock={now:()=>number;set:(fn:()=>void,ms:number)=>unknown;clear:(id:any)=>void};
const clock:Clock={now:()=>Date.now(),set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id)};
/** Merge a return-to-tab event burst and never overlap a subscription's read.
 * No completed response is cached. Explicit user actions do not use this scheduler.
 */
export function coordinatedRecheck(check:(reason:RecheckReason,signal:AbortSignal)=>void|Promise<void>,time:Clock=clock){
 let timer:unknown,reason:RecheckReason='interval',last=-Infinity,running:AbortController|undefined,disposed=false,returnPending=false;
 const scheduler={
  request(next:RecheckReason){
   if(disposed)return;
   if(running){if(next==='return')returnPending=true;return;}
   if(next==='return')reason=next;
   if(timer!==undefined)return;
   timer=time.set(()=>{
    timer=undefined;if(disposed)return;const controller=new AbortController(),why=reason;reason='interval';running=controller;last=time.now();
    Promise.resolve().then(()=>{if(!disposed)return check(why,controller.signal);}).catch(()=>{/* Consumers own error/revocation handling. */}).finally(()=>{if(running===controller)running=undefined;if(returnPending&&!disposed){returnPending=false;scheduler.request('return');}});
   },Math.max(next==='return'?100:0,last+1000-time.now()));
  },
  dispose(){disposed=true;returnPending=false;if(timer!==undefined)time.clear(timer);timer=undefined;running?.abort();}
 };
 return scheduler;
}
