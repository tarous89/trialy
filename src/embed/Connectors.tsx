import React from 'react';
import {ConnectorsPanel} from '../shared/ConnectorsPanel.js';
type Call=(name:string,args:any)=>Promise<any>;
export function EmbeddedConnectors({workspaceId,call}:{workspaceId:string;call:Call}){
 const invoke=async(name:string,args:any={})=>{
  if(name==='control_automation_runner')args={...args,confirmed:true};
  if(name==='confirm_app_service_review'){const review=await call('read_app_service_review',{workspaceId,reviewId:args.reviewId});args={...args,kind:review.kind,review:review.review};}
  return call(name,{...args,workspaceId});
 };
 return <ConnectorsPanel key={workspaceId} workspaceId={workspaceId} call={invoke} embedded/>;
}
