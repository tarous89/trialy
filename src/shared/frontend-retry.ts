/** Only pre-execution busy admission failures are retried. Never retry a save,
 * arbitrary custom action, transport error, timeout, or an executed capability.
 */
export function retryableNavigation(event:any){
 if(Object.keys(event?.form??{}).length)return false;
 if(event?.kind==='open')return !event.action;
 return ['click','change'].includes(event?.kind)&&/^(tab:[^\s]+|next|prev|previous|filter:[^\s]+|sort:[^\s]+|sort-field:[^\s]+|sort|search|query|overview-next|overview-previous|overview-panel)$/.test(event.action??'');
}
export async function retryFrontendBusy<T>(request:any,call:()=>Promise<T>,current:()=>boolean=()=>true,wait:(ms:number)=>Promise<void>=ms=>new Promise(resolve=>setTimeout(resolve,ms))):Promise<T>{
 for(let attempt=0;;attempt++){
  try{return await call();}catch(error){
   if((error as any)?.code!=='runtime_busy'||!retryableNavigation(request.event??{kind:'open'})||attempt>=2||!current())throw error;
   await wait([250,750][attempt]+Math.floor(Math.random()*100));
   if(!current())throw error;
  }
 }
}
