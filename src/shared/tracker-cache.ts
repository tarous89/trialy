/** Component-instance memory only. Never persist authorized data in browser storage. */
export const SNAPSHOT_TTL=120000;
export function mergeTrackerSnapshot(previous:any,next:any,now=Date.now()){
 if(!next.tracker)return next;
 const compatible=previous?.tracker&&previous.accessVersion===next.accessVersion&&JSON.stringify(previous.tracker.config)===JSON.stringify(next.tracker.config);
 const key=(p:any)=>JSON.stringify([p.request.typeId,p.request.limit,p.request.offset,Object.entries(p.request.filters??{}).sort()]);
 const fresh=(next.tracker.pages??[]).map((p:any)=>({...p,receivedAt:now}));
 const keys=new Set(fresh.map(key));
 const pages=[...fresh,...(compatible?previous.tracker.pages:[]).filter((p:any)=>now-p.receivedAt<SNAPSHOT_TTL&&!keys.has(key(p)))].slice(0,16);
 const rowIds=new Set(pages.flatMap((p:any)=>p.result.rows.map((r:any)=>r.id)));
 const cachedControls={...(compatible?previous.tracker.cachedControls:{} )};
 for(const c of next.controls??[])if(c.recordId&&c.fieldId)cachedControls[c.fieldId+':'+c.recordId]=c;
 for(const [k,c] of Object.entries(cachedControls))if(!rowIds.has((c as any).recordId))delete cachedControls[k];
 return {...next,tracker:{...next.tracker,pages,cachedControls}};
}
