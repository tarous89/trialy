/** Account initialization must survive a failed or stale tracker request. */
export async function loadTrackerDisplay(data:any,call:(name:string,args?:any)=>Promise<any>,onAccount:(account:any)=>void){
 const account=call('initialize_account').then(value=>{const account={types:[],templates:[],workspaces:[],...value};onAccount(account);return account;});
 // Even a recently prepared result may have been saved in another surface.
 const resource=data.screen==='tracker-preview'?call('resolve_tracker_preview',{workspaceId:data.workspaceId,previewId:data.preview.id}):Promise.resolve(data);
 const [identity,firstResolved]=await Promise.all([account,resource]);
 let resolved={...firstResolved,...(data.route?{route:data.route}:{})};
 if(resolved.screen==='tracker-unavailable')return {account:identity,resolved,output:null};
 const rootRoute=!data.route||(data.route.path==='/'&&!data.route.recordId&&data.route.page===undefined);
 const render=()=>resolved.initialOutput&&rootRoute?Promise.resolve(resolved.initialOutput):call('run_component_frontend',{workspaceId:resolved.workspaceId,request:{...(resolved.component?{componentId:resolved.component.id,expectedVersion:resolved.component.version}:{previewId:resolved.preview.id}),...(data.route?{route:data.route}:{}),event:{kind:'open'}}});
 let output;try{output=await render();}catch(error){
  // Saving in another surface can consume the preview between resolve and render.
  // Reconcile its receipt once; never create another preview or retry a write.
  if([401,403,404].includes((error as any)?.status)||(error as any)?.code==='component_archived')throw error;
  const latest=resolved.preview?await call('resolve_tracker_preview',{workspaceId:resolved.workspaceId,previewId:resolved.preview.id}):{...await call('read_project_component',{workspaceId:resolved.workspaceId,componentId:resolved.component.id,includeOutput:true}),screen:'tracker'};
  resolved={...latest,...(data.route?{route:data.route}:{})};
  if(resolved.screen==='tracker-unavailable')return {account:identity,resolved,output:null};
  output=await render();
 }
 // Sidebar metadata is not a prerequisite for showing an authorized app.
 const types=await call('list_tables',{workspaceId:resolved.workspaceId}).catch(()=>identity.types??[]);
 return {account:{...identity,workspaceId:resolved.workspaceId,types,templates:[]},resolved,output};
}
