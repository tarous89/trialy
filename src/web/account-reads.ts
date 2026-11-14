/** Coalesce pending reads, but a post-write read must supersede older snapshots. */
export function accountReads(){
 let generation=0,pending:Promise<void>|undefined;
 return {run(read:(isCurrent:()=>boolean)=>Promise<void>,fresh=false){
  if(pending&&!fresh)return pending;
  const current=++generation;
  const result=Promise.resolve().then(()=>read(()=>current===generation));
  const tracked=result.finally(()=>{if(pending===tracked)pending=undefined;});
  pending=tracked;return tracked;
 }};
}
