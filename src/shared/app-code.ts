/**
 * L2.2 (loading speed, architecture F): app code addressed by its fingerprint (the server's sourceDigest).
 * Code the host already holds is never sent again: the request names the fingerprints held here, and the server leaves
 * the code out of the response. Held in memory for this page (at most 8 apps, never written to the device). On the
 * website the code is also fetched by its fingerprint address, which the browser's cache keeps (see
 * src/server/apps.ts), so reopening an app after a reload downloads data, not code.
 */
const held=new Map<string,string>(),LIMIT=8;
export function holdCode(digest:string,code:string){if(!/^[0-9a-f]{32}$/.test(digest)||typeof code!=='string')return;held.delete(digest);held.set(digest,code);while(held.size>LIMIT)held.delete(held.keys().next().value!);}
export function heldCode(digest:string){const code=held.get(digest);if(code!==undefined){held.delete(digest);held.set(digest,code);}return code;}
export function heldDigests(){return [...held.keys()].reverse().slice(0,LIMIT);}
export function forgetCode(){held.clear();}
/** The website's fingerprint address of an app's code. */
export const appCodeUrl=(workspaceId:string,appId:string,digest:string)=>`/api/workspaces/${encodeURIComponent(workspaceId)}/apps/${encodeURIComponent(appId)}/code/${digest}`;
/** Website loader: one request per fingerprint and page, answered from the browser's cache after the first time. */
const loading=new Map<string,Promise<string|null>>();
export function fetchAppCode(workspaceId:string,appId:string,digest:string):Promise<string|null>{
 const code=heldCode(digest);if(code!==undefined)return Promise.resolve(code);
 let p=loading.get(digest);
 if(!p){p=fetch(appCodeUrl(workspaceId,appId,digest),{credentials:'same-origin'}).then(r=>r.ok?r.text():null).then(text=>{if(text!==null)holdCode(digest,text);return text;},()=>null).finally(()=>loading.delete(digest));loading.set(digest,p);}
 return p;
}
/** What the website's app open asks for with the first screen: the frame's reads, never the code inline. */
export const WEB_OPEN_BROWSER=JSON.stringify({source:false});
