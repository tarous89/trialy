import {AppError} from '../shared/schema.js';
import {requestMetrics} from '../db/metrics.js';

type Waiter={user:string;key:string;start:()=>void;cleanup:()=>void;timer:ReturnType<typeof setTimeout>};
export type FrontendAdmission=(()=>void)&{waited:boolean;detachUntil:(settled:Promise<void>)=>void};
/** Process-local admission only: no data/results, no transaction opened here.
 * Rotate users, preserve their FIFO order, and never overlap the same app/user key.
 * Separate instances keep draft work out of published capacity.
 */
export class FrontendQueue{
 private active=new Set<string>();
 private settling=new Set<string>();
 private waiting=new Map<string,Waiter[]>();
 private count=0;
 private lastUser?:string;
 constructor(private capacity:number,private maxPending=16,private perUser=2,private waitMs=1500){}
 async acquire(user:string,key:string,signal?:AbortSignal):Promise<FrontendAdmission>{
  signal?.throwIfAborted();
  const metrics=requestMetrics(),started=performance.now();
  const busy=()=>{if(metrics)metrics.runtimeBusy++;return new AppError(429,'runtime_busy','This interface is busy; try again shortly');};
  if(this.count===0&&this.active.size<this.capacity&&!this.active.has(key)&&!this.settling.has(key))return this.reserve(user,key,false);
  if(this.count>=this.maxPending||(this.waiting.get(user)?.length??0)>=this.perUser)throw busy();
  if(metrics)metrics.runtimeQueued++;
  try{return await new Promise<FrontendAdmission>((resolve,reject)=>{
   const cancel=()=>{this.remove(entry);reject(signal!.reason);this.drain();};
   const entry:Waiter={user,key,start:()=>resolve(this.reserve(user,key,true)),cleanup:()=>signal?.removeEventListener('abort',cancel),timer:setTimeout(()=>{this.remove(entry);reject(busy());this.drain();},this.waitMs)};
   signal?.addEventListener('abort',cancel,{once:true});
   const list=this.waiting.get(user)??[];list.push(entry);this.waiting.set(user,list);this.count++;this.drain();
  });}finally{if(metrics)metrics.runtimeQueueMs+=performance.now()-started;}
 }
 private reserve(user:string,key:string,waited:boolean):FrontendAdmission{
  this.active.add(key);this.lastUser=user;let released=false;
  const release=()=>{if(released)return;released=true;this.active.delete(key);this.drain();};
  return Object.assign(release,{waited,detachUntil:(settled:Promise<void>)=>{
   if(released)return;released=true;this.active.delete(key);this.settling.add(key);
   // A stopped guest no longer consumes capacity, but its still-running host
   // call must not overlap another execution for the same user/app.
   const clear=()=>{this.settling.delete(key);this.drain();};
   void settled.then(clear,clear);this.drain();
  }});
 }
 private remove(entry:Waiter){
  const list=this.waiting.get(entry.user),index=list?.indexOf(entry)??-1;if(index<0)return;
  list!.splice(index,1);if(!list!.length)this.waiting.delete(entry.user);this.count--;clearTimeout(entry.timer);entry.cleanup();
 }
 private drain(){
  while(this.active.size<this.capacity){
   const users=[...this.waiting.keys()],last=users.indexOf(this.lastUser??'');
   const ordered=last<0?users:[...users.slice(last+1),...users.slice(0,last+1)];
   // Keep the rotation even when the selected user's last waiter is removed.
   // Otherwise a busy user at the front can jump ahead after every empty turn.
   this.waiting=new Map(ordered.map(user=>[user,this.waiting.get(user)!]));
   const entry=ordered.map(user=>this.waiting.get(user)![0]).find(entry=>!this.active.has(entry.key)&&!this.settling.has(entry.key));
   if(!entry)return;
   this.remove(entry);entry.start();
  }
 }
}
