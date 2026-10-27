/** Account initialization must survive a failed or stale tracker request. */
export async function loadTrackerDisplay(data:any,call:(name:string,args?:any)=>Promise<any>,onAccount:(account:any)=>void){
 const account=call('initialize_account').then(value=>{const account={types:[],templates:[],workspaces:[],...value};onAccount(account);return account;});
 const resource=data.screen==='tracker-preview'&&(!data.initialOutput||!data.preparedAt||Date.now()-Date.parse(data.preparedAt)>15000)
  ?call('resolve_tracker_preview',{workspaceId:data.workspaceId,previewId:data.preview.id}):Promise.resolve(data);
 const [identity,resolved]=await Promise.all([account,resource]);
 if(resolved.screen==='tracker-unavailable')return {account:identity,resolved,output:null};
 const [types,output]=await Promise.all([call('list_tables',{workspaceId:resolved.workspaceId}),resolved.initialOutput?Promise.resolve(resolved.initialOutput):call('run_component_frontend',{workspaceId:resolved.workspaceId,request:{...(resolved.component?{componentId:resolved.component.id,expectedVersion:resolved.component.version}:{previewId:resolved.preview.id}),event:{kind:'open'}}})]);
 return {account:{...identity,workspaceId:resolved.workspaceId,types,templates:[]},resolved,output};
}
export function trackerLoadError(error:unknown){
 const text=error instanceof Error?error.message:String(error);
 if(/Code preview unavailable|Tracker preview unavailable|Preview unavailable|preview_expired/i.test(text))return 'This preview is no longer available. Open your saved tools or create a new preview.';
 return 'The tracker could not be opened. Your saved tools are still available. Please retry or open Tools.';
}
