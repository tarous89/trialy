import {useCallback,useEffect,useRef,useState} from 'react';
const empty:any[]=[];
/** Only legacy editors need these workspace-wide reads. Database uses its own paged catalog. */
export function useWorkspaceMetadata(workspaceId:string,viewerId:string|undefined,needed:boolean,viewsNeeded:boolean,load:(path:string)=>Promise<any>){
 const key=workspaceId&&viewerId&&needed?JSON.stringify([workspaceId,viewerId,viewsNeeded]):'';
 const current=useRef(key),request=useRef(0);current.current=key;
 const [state,setState]=useState<{key:string;types:any[];views:any[];ready:boolean;error:string}>();
 const reload=useCallback(async()=>{
  if(!key)return;const n=++request.current;
  setState({key,types:[],views:[],ready:false,error:''});
  try{
   const [types,views]=await Promise.all([load(`/api/workspaces/${workspaceId}/types`),viewsNeeded?load(`/api/workspaces/${workspaceId}/views`):Promise.resolve([])]);
   if(current.current===key&&request.current===n)setState({key,types,views,ready:true,error:''});
  }catch(e){if(current.current===key&&request.current===n)setState({key,types:[],views:[],ready:false,error:(e as Error).message||'Tables could not be loaded.'});}
 },[key,workspaceId,viewsNeeded,load]);
 useEffect(()=>{void reload();return()=>{request.current++;};},[reload]);
 const visible=state?.key===key?state:undefined;
 return {types:visible?.types??empty,views:visible?.views??empty,ready:!!visible?.ready,loading:!!key&&!visible?.ready&&!visible?.error,error:visible?.error??'',reload};
}
