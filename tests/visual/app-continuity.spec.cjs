const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
async function call(page,name,args){const r=await (await page.request.post(base+'/fixture/tool',{data:{name,arguments:args}})).json();expect(r.isError,JSON.stringify(r)).not.toBe(true);return r.structuredContent.result;}
async function archive(page,id){const r=await call(page,'read_project_component',{componentId:id});const p=await call(page,'prepare_workspace_change',{operation:{kind:'archive_component',componentId:id,expectedVersion:r.component.version,archived:true}});await call(page,'confirm_workspace_change',{previewId:p.id,digest:p.digest});}
for(const embedded of [false,true])test(`Move an app between projects and Home in ${embedded?'extension':'platform'}`,async({page})=>{
 const f=await (await page.request.get(base+'/fixture/apps')).json();
 const save=async operation=>{const p=await call(page,'prepare_workspace_change',{operation});return call(page,'confirm_workspace_change',{previewId:p.id,digest:p.digest});};
 const first=await save({kind:'create_node',nodeKind:'project',name:'Move destination A '+embedded}),second=await save({kind:'create_node',nodeKind:'project',name:'Move destination B '+embedded});
 const app=await save({kind:'save_component',content:{name:'Movable app '+embedded,format:'frontend-js',source:'return {html:"<h1>Movable app</h1>"};'}});
 await page.goto(base+(embedded?'/?apps=1':'/app-home'));
 if(embedded){await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),{screen:'home',workspaceId:f.workspaceId,viewerId:'fixture',workspaces:[],types:[]});}
 const root=embedded?page.frameLocator('#app'):page;
 const card=root.locator('.ty-resource').filter({has:root.getByRole('heading',{name:'Movable app '+embedded,exact:true})});
 for(const [id,label] of [[first.id,'Move destination A '+embedded],[second.id,'Move destination B '+embedded],[null,'Apps (outside projects)']]){
  await card.getByRole('button',{name:'Actions for Movable app '+embedded,exact:true}).click();
  await root.getByRole('menuitem',{name:'Move to',exact:true}).click();
  await root.getByRole('menuitem',{name:label,exact:true}).click();
  await expect(card.locator('.ty-tool-project')).toHaveText(id?label:'No project');
  const home=await call(page,'read_account_home',{});expect(home.resources.find(r=>r.id===app.id).projectIds).toEqual(id?[id]:[]);
 }
 await archive(page,app.id);for(const project of [first,second])await save({kind:'archive_node',nodeId:project.id,expectedVersion:0,archived:true,reason:'Fixture cleanup'});
});

for(const embedded of [false,true])test(`Saved app revisions have no first-save footer in ${embedded?'extension':'standalone'}`,async({page})=>{
 const f=await (await page.request.get(base+'/fixture/apps')).json();
 const source=title=>`return {html:'<h1>${title}</h1><label>Notes<input aria-label="Notes"></label>'};`;
 const content={name:'Revision review '+embedded,format:'frontend-js',source:source('Saved app')};
 const p=await call(page,'prepare_workspace_change',{operation:{kind:'save_component',content}}),saved=await call(page,'confirm_workspace_change',{previewId:p.id,digest:p.digest});
 const revision=await call(page,'prepare_workspace_change',{operation:{kind:'save_component',componentId:saved.id,expectedVersion:0,content:{...content,source:source('Reviewed revision')}}});
 await page.goto(base+(embedded?'/?apps=1':`/apps/${revision.id}?workspaceId=${f.workspaceId}&source=preview`));
 if(embedded){await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),{screen:'tracker-preview',workspaceId:f.workspaceId,preview:revision});}
 const root=embedded?page.frameLocator('#app'):page;
 await expect(root.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:'Reviewed revision',exact:true})).toBeVisible();
 await expect(root.locator('.ty-tracker-preview>.ty-action-footer')).toHaveCount(0);
 if(embedded){await page.setViewportSize({width:390,height:900});await page.screenshot({path:'/tmp/trialy-revision-review-mobile.png'});}
 await expect(root.getByText('Save it to keep it.',{exact:false})).toHaveCount(0);
 await root.getByRole('button',{name:'Save changes',exact:true}).click();
 if(embedded){
  await expect(root.getByRole('heading',{name:'Home',exact:true})).toBeVisible();
  // Replayed host output still resolves the receipt even when the bundle is fresh.
  await page.evaluate(r=>window.deliver(r),{screen:'tracker-preview',workspaceId:f.workspaceId,preview:revision,preparedAt:new Date().toISOString(),initialOutput:{html:'stale draft'}});
 }
 await expect(root.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:'Reviewed revision',exact:true})).toBeVisible();
 await expect(root.locator('.ty-tracker-preview>.ty-action-footer')).toHaveCount(0);
 await expect(root.getByRole('alert')).toHaveCount(0);await archive(page,saved.id);
});

for(const fromHome of [false,true])test(`Failed extension replacement keeps the app opened ${fromHome?'from Home':'by ChatGPT'} without recovery messages`,async({page})=>{
 const f=await (await page.request.get(base+'/fixture/apps')).json();
 await page.goto(base+'/?apps=1');await page.waitForFunction(()=>window.hostReady);
 const root=page.frameLocator('#app'),frame=root.frameLocator('iframe[title="Saved frontend code"]');let homeApp;
 if(fromHome){
  const p=await call(page,'prepare_workspace_change',{operation:{kind:'save_component',content:{name:'Home continuity fixture',format:'frontend-js',source:`return {html:'<h1>Calculator</h1><label>Draft note<input aria-label="Draft note"></label>'};`}}});homeApp=await call(page,'confirm_workspace_change',{previewId:p.id,digest:p.digest});
  await page.evaluate(r=>window.deliver(r),{screen:'home',workspaceId:f.workspaceId,viewerId:'fixture',workspaces:[],types:[]});
  await root.getByRole('button',{name:'Actions for Home continuity fixture',exact:true}).click();await root.getByRole('menuitem',{name:'Manage',exact:true}).click();
 }else await page.evaluate(r=>window.deliver(r),await (await page.request.get(base+'/fixture/app-display?appId='+f.appId+'&path=/calculator')).json());
 await expect(frame.getByRole('heading',{name:'Calculator',exact:true})).toBeVisible();await frame.getByLabel('Draft note').fill('Keep this input');
 const draft=await (await page.request.get(base+'/fixture/app-draft')).json();
 await page.route('**/fixture/tool',route=>route.request().postDataJSON().name==='resolve_tracker_preview'?route.fulfill({json:{isError:true,structuredContent:{error:{status:503,code:'temporary'}},content:[{type:'text',text:'Failed to load sentinel'}]}}):route.continue());
 await page.evaluate(r=>window.deliver(r),draft);
 await expect.poll(async()=>{const calls=await (await page.request.get(base+'/fixture/calls')).json();return calls.includes('run_component_frontend');}).toBe(true);
 await expect(frame.getByLabel('Draft note')).toHaveValue('Keep this input');
 await page.evaluate(r=>window.deliver(r),{screen:'tracker-unavailable',workspaceId:f.workspaceId,message:'Failed to load sentinel'});
 await expect(frame.getByRole('heading',{name:'Calculator',exact:true})).toBeVisible();await expect(root.getByRole('alert')).toHaveCount(0);
 await expect(root.getByText('Failed to load sentinel')).toHaveCount(0);await expect(root.getByRole('button',{name:/retry|open saved apps|create new preview|return to home/i})).toHaveCount(0);await call(page,'discard_workspace_preview',{previewId:draft.preview.id});if(homeApp)await archive(page,homeApp.id);
});

for(const embedded of [false,true])test(`No usable app offers only local Home after loading failure in ${embedded?'extension':'standalone'}`,async({page})=>{
 const f=await (await page.request.get(base+'/fixture/apps')).json();
 if(embedded){
  await page.goto(base+'/?apps=1');await page.waitForFunction(()=>window.hostReady);
  await page.evaluate(r=>window.deliver(r),{screen:'home',workspaceId:f.workspaceId,viewerId:'fixture',workspaces:[],types:[]});await expect(page.frameLocator('#app').getByRole('heading',{name:'Home',exact:true})).toBeVisible();
  await page.route('**/fixture/tool',route=>route.request().postDataJSON().name==='open_app'?route.fulfill({json:{isError:true,structuredContent:{error:{status:503,code:'temporary'}},content:[{type:'text',text:'Failed to load sentinel'}]}}):route.continue());
  await page.evaluate(r=>window.deliver(r),{screen:'app-link',workspaceId:f.workspaceId,appId:f.appId,source:'component'});
 }else{
  await page.route('**/api/apps/resolve',route=>route.fulfill({status:503,json:{error:'temporary',message:'Failed to load sentinel'}}));
  await page.goto(base+f.url);
 }
 const root=embedded?page.frameLocator('#app'):page;
 await expect(root.getByRole('heading',{name:'No app is available',exact:true})).toBeVisible();await expect(root.getByRole('alert')).toHaveCount(0);await expect(root.getByText('Failed to load sentinel')).toHaveCount(0);
 if(!embedded)await page.route(base+'/?tab=home',route=>route.fulfill({contentType:'text/html',body:'<h1>Home</h1>'}));
 await root.getByRole('button',{name:'Return to Home',exact:true}).click();
 if(embedded){await expect(root.getByRole('heading',{name:'Home',exact:true})).toBeVisible();expect(await page.evaluate(()=>window.lastOpenedUrl)).toBeUndefined();}
 else{await expect(page).toHaveURL(base+'/?tab=home');await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible();}
});

