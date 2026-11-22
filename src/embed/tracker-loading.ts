/** Account initialization must survive a failed or stale tracker request.
 * L2.6 (loading speed): the app is shown as soon as its first screen is ready. The account and the table list (sidebar
 * metadata) load alongside and arrive afterwards through `details`; they never hold the app back. */
export async function loadTrackerDisplay(data:any,call:(name:string,args?:any)=>Promise<any>,onAccount:(account:any)=>void){
 const account=call('initialize_account').then(value=>{const account={types:[],templates:[],workspaces:[],...value};onAccount(account);return account;});
 account.catch(()=>{});
 // Even a recently prepared result may have been saved in another surface.
 const resource=data.screen==='tracker-preview'?call('resolve_tracker_preview',{workspaceId:data.workspaceId,previewId:data.preview.id}):Promise.resolve(data);
 let resolved={...await resource,...(data.route?{route:data.route}:{})};
 const withDetails=(output:any)=>({resolved,output,workspaceId:resolved.workspaceId,
  // Sidebar metadata is not a prerequisite for showing an authorized app.
  details:account.then(async identity=>({...identity,workspaceId:resolved.workspaceId,types:await call('list_tables',{workspaceId:resolved.workspaceId}).catch(()=>identity.types??[]),templates:[]}))});
 if(resolved.screen==='tracker-unavailable')return withDetails(null);
 const rootRoute=!data.route||(data.route.path==='/'&&!data.route.recordId&&data.route.page===undefined);
 // L2.6: the "open app" result carries the first screen (widget-only metadata); it is used as is for the app's start screen.
 const render=()=>resolved.initialOutput&&rootRoute?Promise.resolve(resolved.initialOutput):call('run_component_frontend',{workspaceId:resolved.workspaceId,request:{...(resolved.component?{componentId:resolved.component.id,expectedVersion:resolved.component.version}:{previewId:resolved.preview.id}),...(data.route?{route:data.route}:{}),event:{kind:'open'}}});
 let output;try{output=await render();}catch(error){
  // Saving in another surface can consume the preview between resolve and render.
  // Reconcile its receipt once; never create another preview or retry a write.
  if([401,403,404].includes((error as any)?.status)||(error as any)?.code==='component_archived')throw error;
  const latest=resolved.preview?await call('resolve_tracker_preview',{workspaceId:resolved.workspaceId,previewId:resolved.preview.id}):{...await call('read_project_component',{workspaceId:resolved.workspaceId,componentId:resolved.component.id,includeOutput:true}),screen:'tracker'};
  resolved={...latest,...(data.route?{route:data.route}:{})};
  if(resolved.screen==='tracker-unavailable')return withDetails(null);
  output=await render();
 }
 return withDetails(output);
}
