const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
for(const embedded of [false,true])test(`Published ${embedded?'extension':'standalone'} stays separate from drafts and loads only approved updates`,async({page,context})=>{
 const f=await (await page.request.get(base+'/fixture/apps')).json();
 const call=async(name,args)=>{const r=await (await page.request.post(base+'/fixture/tool',{data:{name,arguments:args}})).json();expect(r.isError,JSON.stringify(r)).not.toBe(true);return r.structuredContent.result;};
 const source=title=>`const p=input.route?.path||'/';return {html:'<h1>${title}</h1><p>'+p+'</p><a href="/details">Details</a><a href="/">Overview</a><label>My notes<input aria-label="My notes"></label>'};`;
 const content={name:'Publication fixture '+embedded,sourceAccess:'bindings',format:'frontend-js',source:source('Published version'),bindings:[]};
 const initial=await call('prepare_workspace_change',{operation:{kind:'save_component',content}}),saved=await call('confirm_workspace_change',{previewId:initial.id,digest:initial.digest});
 const url=`/apps/${saved.id}?workspaceId=${f.workspaceId}&source=component`;
 await page.goto(base+(embedded?'/?apps=1':url));if(embedded){await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),await (await page.request.get(base+'/fixture/app-display?appId='+saved.id)).json());}
 const root=embedded?page.frameLocator('#app'):page,frame=root.frameLocator('iframe[title="Saved frontend code"]');
 await expect(frame.getByRole('heading',{name:'Published version',exact:true})).toBeVisible();
 const prepare=title=>call('prepare_workspace_change',{operation:{kind:'save_component',componentId:saved.id,expectedVersion:0,content:{...content,source:source(title)}}});
 const draft=await prepare('Draft version');
 const author=await context.newPage();await author.goto(base+`/apps/${draft.id}?workspaceId=${f.workspaceId}&source=preview`);
 await expect(author.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:'Draft version',exact:true})).toBeVisible();await expect(author.locator('.ty-action-footer')).toHaveCount(0);await expect(author.getByRole('button',{name:'Save changes',exact:true})).toBeVisible();
 const focus=()=>root.locator('.ty-workspace').evaluate(()=>window.dispatchEvent(new Event('focus')));
 await focus();await expect(frame.getByRole('heading',{name:'Published version',exact:true})).toBeVisible();await expect(root.locator('.ty-action-footer')).toHaveCount(0);await expect(root.getByRole('alert')).toHaveCount(0);
 await frame.getByRole('link',{name:'Details',exact:true}).click();await expect(frame.getByText('/details',{exact:true})).toBeVisible();await expect(root.getByRole('alertdialog')).toHaveCount(0);
 // Publication offers an update but never replaces the open app, even without edits.
 await call('confirm_workspace_change',{previewId:draft.id,digest:draft.digest});await focus();await expect(root.getByRole('button',{name:'Refresh to latest version',exact:true})).toBeVisible();await expect(frame.getByRole('heading',{name:'Published version',exact:true})).toBeVisible();await frame.getByRole('link',{name:'Overview',exact:true}).click();await expect(frame.getByText('/',{exact:true})).toBeVisible();await frame.getByRole('link',{name:'Details',exact:true}).click();await expect(frame.getByText('/details',{exact:true})).toBeVisible();await expect(root.getByRole('alert')).toHaveCount(0);
 // A real edit belongs only to this viewer and is never silently overwritten.
 await frame.getByRole('textbox',{name:'My notes',exact:true}).fill('Keep my local draft');
 const next=await call('prepare_workspace_change',{operation:{kind:'save_component',componentId:saved.id,expectedVersion:1,content:{...content,source:source('Final version')}}});await call('confirm_workspace_change',{previewId:next.id,digest:next.digest});await focus();
 await expect(root.getByRole('button',{name:'Refresh to latest version',exact:true})).toBeVisible();await expect(frame.getByRole('textbox',{name:'My notes',exact:true})).toHaveValue('Keep my local draft');
 await root.getByRole('button',{name:'Refresh to latest version',exact:true}).click();await expect(root.getByRole('alertdialog',{name:'Load published update',exact:true})).toBeVisible();await root.getByRole('button',{name:'Discard edits and load update',exact:true}).click();await expect(frame.getByRole('heading',{name:'Final version',exact:true})).toBeVisible();await expect(frame.getByRole('textbox',{name:'My notes',exact:true})).toHaveValue('');
 await frame.getByRole('link',{name:'Overview',exact:true}).click();await expect(frame.getByText('/',{exact:true})).toBeVisible();await expect(root.getByRole('alertdialog')).toHaveCount(0);
 await author.close();const archived=await call('prepare_workspace_change',{operation:{kind:'archive_component',componentId:saved.id,expectedVersion:2,archived:true}});await call('confirm_workspace_change',{previewId:archived.id,digest:archived.digest});
 await focus();await expect(root.getByRole('heading',{name:'No app is available',exact:true})).toBeVisible();await expect(root.getByRole('alert')).toHaveCount(0);await expect(root.locator('iframe[title="Saved frontend code"]')).toHaveCount(0);
 // A revoked view is not an unsaved source-code edit.
 expect(await root.locator('.ty-workspace').evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});return !window.dispatchEvent(e);})).toBe(false);
});

for(const surface of ['standalone','extension','public'])test(`Open ${surface} app keeps working after publication and dismisses incompatible writes`,async({page})=>{
 await page.setViewportSize({width:surface==='standalone'?390:1100,height:900});
 const f=await (await page.request.post(base+'/fixture/publication')).json();expect(f.appId,JSON.stringify(f)).toBeTruthy();
 const call=async(name,args)=>{const r=await (await page.request.post(base+'/fixture/tool',{data:{name,arguments:args}})).json();expect(r.isError,JSON.stringify(r)).not.toBe(true);return r.structuredContent.result;};
 const embedded=surface==='extension';await page.goto(surface==='public'?f.shareUrl:base+(embedded?'/?apps=1':`/apps/${f.appId}?workspaceId=${f.workspaceId}&source=component`));
 if(embedded){await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),await (await page.request.get(base+'/fixture/app-display?appId='+f.appId)).json());}
 const root=embedded?page.frameLocator('#app'):page,frame=root.frameLocator('iframe[title="Saved frontend code"]');
 await expect(frame.getByRole('heading',{name:'Loaded version'})).toBeVisible();
 await frame.getByLabel('Value',{exact:true}).fill('Compatible update');
 const update=await call('prepare_workspace_change',{operation:{kind:'save_component',componentId:f.appId,expectedVersion:0,content:{...f.content,source:f.content.source.replace('Loaded version','Latest version')}}});await call('confirm_workspace_change',{previewId:update.id,digest:update.digest});
 const focus=()=>root.locator('.ty-workspace').evaluate(()=>window.dispatchEvent(new Event('focus')));await focus();
 await expect(root.getByRole('status')).toContainText('This app has been updated');await expect(frame.getByLabel('Value',{exact:true})).toHaveValue('Compatible update');
 const banner=await root.locator('.ty-app-update').boundingBox(),app=await root.locator('iframe[title="Saved frontend code"]').boundingBox();expect(banner.y+banner.height).toBeLessThanOrEqual(app.y);
 // If the save commits but its response is lost, retry the same receipt.
 const confirmEndpoint='**/organization/previews/*/confirm';let interrupted=false;
 if(surface==='standalone')await page.route(confirmEndpoint,async route=>{if(interrupted)return route.continue();interrupted=true;await route.fetch();return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'temporary',message:'The save response was interrupted.'})});});
 await frame.getByRole('button',{name:'Save value'}).click();await root.locator('.ty-action-footer').getByRole('button',{name:'Save changes',exact:true}).click();await root.getByRole('dialog',{name:'Review app changes'}).getByRole('button',{name:'Save changes',exact:true}).click();
 if(surface==='standalone'){await expect(root.getByRole('alert')).toContainText('interrupted');await expect(frame.getByRole('heading',{name:'Loaded version'})).toBeVisible();await root.getByRole('button',{name:'Retry save',exact:true}).click();await expect(root.getByRole('alert')).toHaveCount(0);await page.unroute(confirmEndpoint);const rows=await (await page.request.get(base+`/api/workspaces/${f.workspaceId}/types/${f.typeId}/records`)).json();expect(rows.rows[0].version).toBe(1);}

 await expect(root.getByRole('dialog')).toHaveCount(0);await expect(frame.getByRole('heading',{name:'Loaded version'})).toBeVisible();await expect(frame.getByLabel('Value',{exact:true})).toHaveValue('Compatible update');
 expect((await page.request.post(base+'/fixture/publication/'+f.appId+'/schema')).ok()).toBe(true);await focus();
 await frame.getByLabel('Value',{exact:true}).fill('Keep this unsaved value');await frame.getByRole('button',{name:'Save value'}).click();
 await expect(root.getByRole('alert')).toContainText('no longer compatible');await expect(frame.getByRole('heading',{name:'Loaded version'})).toBeVisible();await expect(frame.getByLabel('Value',{exact:true})).toHaveValue('Keep this unsaved value');await expect(root.getByRole('dialog')).toHaveCount(0);
 if(surface==='standalone')await page.screenshot({path:'/tmp/trialy-update-error-mobile.png'});
 await root.getByRole('button',{name:'Dismiss error'}).click();await expect(root.getByRole('alert')).toHaveCount(0);await expect(frame.getByRole('button',{name:'Save value'})).toBeEnabled();
 await root.getByRole('button',{name:'Refresh to latest version'}).click();await root.getByRole('button',{name:'Keep editing',exact:true}).click();await expect(frame.getByLabel('Value',{exact:true})).toHaveValue('Keep this unsaved value');
 // A failed refresh retains the app and inputs and closes the confirmation overlay.
 const endpoint=surface==='extension'?'**/fixture/tool':surface==='public'?'**/public-app/call':'**/organization/frontend/run';
 const failRefresh=async route=>{const body=route.request().postDataJSON(),request=body?.request??body?.args?.request??body?.arguments?.request??body;if(request?.expectedVersion===1){const error={status:503,code:'temporary'};return route.fulfill({status:surface==='extension'?200:503,contentType:'application/json',body:JSON.stringify(surface==='extension'?{isError:true,structuredContent:{error},content:[{type:'text',text:'Temporarily unavailable'}]}:{error:'temporary',message:'Temporarily unavailable'})});}return route.continue();};
 await page.route(endpoint,failRefresh);await root.getByRole('button',{name:'Refresh to latest version'}).click();await root.getByRole('button',{name:'Discard edits and load update'}).click();await expect(root.getByRole('alert')).toHaveCount(0);await expect(root.getByRole('alertdialog')).toHaveCount(0);await expect(frame.getByLabel('Value',{exact:true})).toHaveValue('Keep this unsaved value');await page.unroute(endpoint,failRefresh);
 await root.getByRole('button',{name:'Refresh to latest version'}).click();await root.getByRole('button',{name:'Discard edits and load update'}).click();await expect(frame.getByRole('heading',{name:'Latest version'})).toBeVisible();await expect(frame.getByLabel('Value',{exact:true})).toHaveValue('Compatible update');await expect(root.locator('.ty-app-update')).toHaveCount(0);
});

test('Standard tracker keeps inline edits and saves on the loaded version after publication',async({page})=>{
 await page.setViewportSize({width:390,height:900});const f=await (await page.request.post(base+'/fixture/publication',{data:{standard:true}})).json();expect(f.appId,JSON.stringify(f)).toBeTruthy();
 const call=async(name,args)=>{const r=await (await page.request.post(base+'/fixture/tool',{data:{name,arguments:args}})).json();expect(r.isError,JSON.stringify(r)).not.toBe(true);return r.structuredContent.result;};
 await page.goto(base+'/?apps=1');await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),await (await page.request.get(base+'/fixture/app-display?appId='+f.appId)).json());
 const root=page.frameLocator('#app'),frame=root.frameLocator('iframe[title="Saved frontend code"]');
 await frame.getByRole('button',{name:'Items',exact:true}).click();await frame.getByRole('button',{name:'Edit Name',exact:true}).first().click();await frame.getByRole('textbox',{name:'Name',exact:true}).fill('Inline value kept');await frame.getByRole('textbox',{name:'Name',exact:true}).press('Enter');
 const p=await call('prepare_workspace_change',{operation:{kind:'save_component',componentId:f.appId,expectedVersion:0,content:{...f.content,name:'Published tracker update'}}});await call('confirm_workspace_change',{previewId:p.id,digest:p.digest});await root.locator('.ty-workspace').evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(root.locator('.ty-app-update')).toBeVisible();const banner=await root.locator('.ty-app-update').boundingBox(),header=await root.locator('.ty-topbar').boundingBox();expect(banner.y+banner.height).toBeLessThanOrEqual(header.y);
 await expect(frame.getByText('Inline value kept',{exact:true})).toBeVisible();await root.getByRole('button',{name:'Save edits',exact:true}).click();await expect(root.locator('.ty-action-footer')).toHaveCount(0);await expect(frame.getByText('Inline value kept',{exact:true})).toBeVisible();await expect(root.locator('.ty-app-update')).toBeVisible();await expect(root.getByRole('alert')).toHaveCount(0);
 const rows=await (await page.request.get(base+`/api/workspaces/${f.workspaceId}/types/${f.typeId}/records`)).json();expect(rows.rows[0].data.name).toBe('Inline value kept');await page.screenshot({path:'/tmp/trialy-update-standard-mobile.png'});
});

for(const embedded of [false,true])test(`Acknowledged save stays saved if reload fails in ${embedded?'extension':'standalone'}`,async({page})=>{
 const f=await (await page.request.post(base+'/fixture/publication')).json();
 const call=async(name,args)=>{const r=await (await page.request.post(base+'/fixture/tool',{data:{name,arguments:args}})).json();expect(r.isError,JSON.stringify(r)).not.toBe(true);return r.structuredContent.result;};
 await page.goto(base+(embedded?'/?apps=1':`/apps/${f.appId}?workspaceId=${f.workspaceId}&source=component`));
 if(embedded){await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),await (await page.request.get(base+'/fixture/app-display?appId='+f.appId)).json());}
 const root=embedded?page.frameLocator('#app'):page,frame=root.frameLocator('iframe[title="Saved frontend code"]');
 await expect(frame.getByRole('heading',{name:'Loaded version'})).toBeVisible();
 let committed=false,reloadFailed=false;
 const fail=route=>{reloadFailed=true;return route.fulfill({status:embedded?200:503,json:embedded?{isError:true,structuredContent:{error:{status:503,code:'temporary'}},content:[{type:'text',text:'Reload sentinel'}]}:{error:'temporary',message:'Reload sentinel'}});};
 const confirm=async route=>{const response=await route.fetch();committed=true;await route.fulfill({response});};
 if(embedded)await page.route('**/fixture/tool',route=>{const body=route.request().postDataJSON();if(body.name==='confirm_workspace_change')return confirm(route);if(committed&&body.name==='run_component_frontend')return fail(route);return route.continue();});
 else{await page.route('**/organization/previews/*/confirm',confirm);await page.route('**/organization/frontend/run',route=>committed?fail(route):route.continue());}
 await frame.getByLabel('Value',{exact:true}).fill('Saved value survives failed refresh');await frame.getByRole('button',{name:'Save value'}).click();await root.locator('.ty-action-footer').getByRole('button',{name:'Save changes',exact:true}).click();await root.getByRole('dialog',{name:'Review app changes'}).getByRole('button',{name:'Save changes',exact:true}).click();
 await expect.poll(()=>reloadFailed).toBe(true);await expect(root.getByRole('dialog')).toHaveCount(0);await expect(root.locator('.ty-action-footer')).toHaveCount(0);await expect(root.getByRole('alert')).toHaveCount(0);await expect(root.getByRole('button',{name:/retry save|reload saved data/i})).toHaveCount(0);await expect(frame.getByLabel('Value',{exact:true})).toHaveValue('Saved value survives failed refresh');
 const rows=await (await page.request.get(base+`/api/workspaces/${f.workspaceId}/types/${f.typeId}/records`)).json();expect(rows.rows[0].version).toBe(1);
 await page.unrouteAll();const current=await call('read_project_component',{componentId:f.appId});const removal=await call('prepare_workspace_change',{operation:{kind:'archive_component',componentId:f.appId,expectedVersion:current.component.version,archived:true}});await call('confirm_workspace_change',{previewId:removal.id,digest:removal.digest});
});
