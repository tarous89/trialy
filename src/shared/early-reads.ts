/** Reads the website starts at page load, alongside the account check, so a screen needs one
 * round of requests instead of a chain. Each result is used once, by the first matching read,
 * and only while fresh; anything else falls back to the normal request. */
const early=new Map<string,{started:number;result:Promise<{ok:true;value:any}|{ok:false}>}>();
const MAX_AGE_MS=15000;
const canonical=(value:any):any=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
export const earlyReadKey=(kind:string,args:unknown)=>kind+':'+JSON.stringify(canonical(args));
export function primeEarlyRead(key:string,start:()=>Promise<any>){
 early.set(key,{started:Date.now(),result:start().then(value=>({ok:true as const,value}),()=>({ok:false as const}))});
}
export async function takeEarlyRead<T>(key:string,fallback:()=>Promise<T>):Promise<T>{
 const entry=early.get(key);if(!entry)return fallback();
 early.delete(key);
 const result=await entry.result;
 // A failed or old early read is never shown; the normal request reports any error as before.
 return result.ok&&Date.now()-entry.started<=MAX_AGE_MS?result.value as T:fallback();
}
export function dropEarlyReads(){early.clear();}
