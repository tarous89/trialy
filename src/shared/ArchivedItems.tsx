import React,{useEffect,useId,useState} from 'react';
import {Button} from './ui/Controls.js';
import {useDataAccessStep} from './DataAccessStep.js';
type Call=(name:string,args:any)=>Promise<any>;
type Kind='apps'|'automations'|'tables'|'fields';
const LABEL:Record<Kind,string>={apps:'apps',automations:'automations',tables:'tables',fields:'fields'};
const date=(value?:string|null)=>value?new Date(value).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'';
const plural=(n:number,one:string,many=one+'s')=>`${n} ${n===1?one:many}`;
const remembered=(key:string)=>{try{return sessionStorage.getItem(key)==='1';}catch{return false;}};
const remember=(key:string,open:boolean)=>{try{sessionStorage.setItem(key,open?'1':'0');}catch{}};

/**
 * "Show archived (n)" for Apps, Automations and Database (MODULAR_APPS_AND_SHARED_DATA.md §6).
 * Rendered only when the server returns items, i.e. only for people who can restore them.
 * Muted rows keep text at the design system's muted ink (≥4.5:1) and label each item "Archived".
 */
/** layout follows the page's own list: Apps grid → muted cards in the same columns; the narrow Database table tree → compact. */
export function ArchivedItems({call,kind,typeId,refreshKey,onChanged,layout='list'}:{call:Call;kind:Kind;typeId?:string;refreshKey?:unknown;onChanged?:()=>void;layout?:'list'|'grid'|'compact'}){
 const storageKey='trialy-archived:'+kind,listId=useId();
 const [data,setData]=useState<any>(null),[open,setOpen]=useState(()=>remembered(storageKey)),[busy,setBusy]=useState(''),[error,setError]=useState(''),[confirming,setConfirming]=useState<{item:any;action:'restore'|'delete';review?:any}|null>(null),[reload,setReload]=useState(0);
 const dataAccess=useDataAccessStep(call);
 useEffect(()=>{let live=true;call('list_archived_items',{kind,...(typeId?{typeId}:{})}).then(r=>{if(live)setData(r);}).catch(()=>{if(live)setData(null);});return()=>{live=false;};},[kind,typeId,refreshKey,reload]);
 const items:any[]=data?.items??[];
 if(!items.length)return null;
 const label=LABEL[kind];
 function toggle(){const next=!open;setOpen(next);remember(storageKey,next);}
 const done=()=>{setConfirming(null);setReload(n=>n+1);onChanged?.();};
 async function restoreApp(appId:string,version:number,confirmed=false){
  const preview=await call('prepare_workspace_change',{operation:{kind:'archive_component',componentId:appId,expectedVersion:version,archived:false}});
  const review=preview.archiveReview;
  // Something it depends on was deleted permanently: say exactly what, and proceed only on confirmation.
  if(!confirmed&&review?.unavailable?.length){await call('discard_workspace_preview',{previewId:preview.id}).catch(()=>{});return {needsConfirmation:review};}
  // Restoring adds the app back: the data access step lists other apps that can use its data again.
  await dataAccess.gate({previewId:preview.id,digest:preview.digest},()=>call('confirm_workspace_change',{previewId:preview.id,digest:preview.digest,confirmed:true}));return null;
 }
 async function restore(item:any,confirmed=false){setBusy(item.key??item.id);setError('');try{
  if(item.kind==='app'||item.kind==='automation'){
   const app=item.kind==='app'?item:(await call('list_archived_items',{kind:'apps'})).items.find((a:any)=>a.id===item.restoreVia.id);
   if(!app)throw Error(`Restore ${item.restoreVia.name} from Show archived apps.`);
   if(item.kind==='automation'&&!confirmed){setConfirming({item,action:'restore'});return;}
   const pending=await restoreApp(app.id,app.version,confirmed&&!!confirming?.review);if(pending){setConfirming({item,action:'restore',review:pending});return;}
  }else{
   const operation={kind:'restore_archived_schema',typeId:item.typeId??item.id,expectedVersion:item.tableVersion??item.version,...(item.kind==='field'?{fields:[item.key]}:{})};
   const proposal=await call('prepare_change',{operation});await call('commit_change',{previewId:proposal.id,digest:proposal.digest,confirmed:true});
  }
  done();
 }catch(e){setError((e as Error).message);}finally{setBusy('');}}
 async function remove(item:any){setBusy(item.key??item.id);setError('');try{await call('delete_archived_item',{kind:item.kind,id:item.id,...(item.key?{key:item.key}:{}),confirmed:true});done();}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 const keeps=(item:any)=>{const tables=item.keeps?.tables??[],records=tables.reduce((n:number,t:any)=>n+Number(t.records??0),0);return `Deleting this app keeps its ${plural(tables.length,'table')} and ${plural(records,'record')} in Database.`;};
 const meta=(item:any)=>[item.archivedAt&&`Archived ${date(item.archivedAt)}`,item.kind==='app'&&item.keeps&&plural(item.keeps.tables.length,'table'),item.kind==='automation'&&`App: ${item.appName}`,item.kind==='table'&&`${plural(item.records??0,'record')} · ${plural(item.fields??0,'archived field')}`,item.kind==='field'&&item.fieldKind].filter(Boolean).join(' · ');
 return <section className={`ty-archived ty-archived--${layout}`} aria-label={`Archived ${label}`}>{dataAccess.element}
  <button type="button" className="ty-archived-toggle" aria-expanded={open} aria-controls={listId} onClick={toggle}>{open?`Hide archived ${label}`:`Show archived ${label} (${items.length})`}</button>
  {error&&<p role="alert" className="ty-archived-error">{error}</p>}
  {open&&<ul id={listId} className="ty-archived-list">{items.map(item=>{const key=item.key??item.id,reasonId=listId+'-'+key;return <li key={key} className="ty-archived-item">
   <div className="ty-archived-body"><strong className="ty-archived-name">{item.name}</strong> <span className="ty-archived-badge">Archived</span>
    <small className="ty-archived-meta">{meta(item)}</small>
    {item.purgeAt&&<small className="ty-archived-meta">Deletes automatically on {date(item.purgeAt)}</small>}
    {!item.canDelete&&item.deleteBlockedReason&&<small id={reasonId} className="ty-archived-meta">{item.deleteBlockedReason}</small>}</div>
   <div className="ty-archived-actions">
    <button type="button" className="ty-archive-text-action" disabled={!!busy} onClick={()=>void restore(item)}>{busy===key?'Restoring…':'Restore'}</button>
    <button type="button" className="ty-archive-text-action ty-archive-text-action--delete" disabled={!!busy||!item.canDelete} aria-describedby={!item.canDelete&&item.deleteBlockedReason?reasonId:undefined} onClick={()=>setConfirming({item,action:'delete'})}>Delete</button>
   </div></li>;})}</ul>}
  {confirming&&<div className="ty-content-overlay"><section role="alertdialog" aria-modal="true" aria-labelledby={listId+'-title'} className="ty-confirm-dialog">
   {confirming.action==='delete'?<><h2 id={listId+'-title'}>Delete {confirming.item.name} permanently?</h2>
    <p>{confirming.item.kind==='app'?keeps(confirming.item)+' Its archived automations are deleted with it.':confirming.item.kind==='table'?'This empty table is removed from Database. Its history stays in Logs.':'This empty field is removed from the table. Its history stays in Logs.'} This cannot be undone.</p></>
   :confirming.review?<><h2 id={listId+'-title'}>Restore {confirming.item.kind==='app'?confirming.item.name:confirming.item.restoreVia.name} without these items?</h2><p>They were deleted permanently and are unavailable:</p><ul>{confirming.review.unavailable.map((u:any)=><li key={u.typeId}>{u.table??'Deleted table'}{u.fields?.length?': '+u.fields.join(', '):''}</li>)}</ul></>
   :<><h2 id={listId+'-title'}>Restore app {confirming.item.restoreVia.name}?</h2><p>Automations archived with an app are restored by restoring the app. Its automations come back switched off for review.</p></>}
   {error&&<p role="alert">{error}</p>}
   <div className="ty-actions"><Button disabled={!!busy} onClick={()=>setConfirming(null)}>Cancel</Button><Button variant="primary" disabled={!!busy} onClick={()=>void(confirming.action==='delete'?remove(confirming.item):restore(confirming.item,true))}>{confirming.action==='delete'?'Delete permanently':'Restore'}</Button></div>
  </section></div>}
 </section>;
}
