import React,{useEffect,useId} from 'react';
/** Navigation metadata only. Never include record values, credentials or draft text. */
export type WorkspaceViewState={view:string;workspaceId?:string;appId?:string;appName?:string;appVersion?:number;route?:string;section?:string;tableId?:string;tableName?:string;fields?:{key:string;name:string}[];field?:string;selectedRecordIds?:string[];automationId?:string;automationKind?:string;subjectId?:string;scope?:{kind:string;resourceId:string;field?:string};expandedScopes?:string[];editing?:boolean;hasUnsavedChanges?:boolean;templateId?:string;templateVersion?:string};
export const WorkspaceView=React.createContext<((key:string,value:WorkspaceViewState|null)=>void)|null>(null);
export function useWorkspaceView(value:WorkspaceViewState,active=true){
 const publish=React.useContext(WorkspaceView),key=useId(),serialized=JSON.stringify(value);
 useEffect(()=>{if(!publish)return;publish(key,active?JSON.parse(serialized):null);return()=>publish(key,null);},[publish,key,serialized,active]);
}
