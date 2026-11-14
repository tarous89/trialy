const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
const deferred=()=>{let release;const promise=new Promise(r=>release=r);return {promise,release};};
const status=root=>root.locator('[data-save-status]');
function operation(request){
 const path=new URL(request.url()).pathname,b=request.method()==='POST'?request.postDataJSON():{};
 if(path==='/fixture/tool')return {name:b.name,args:b.arguments};
 if(path==='/public-app/call')return b;
 if(path.endsWith('/frontend/run'))return {name:'run_component_frontend',args:{request:b}};
 if(/\/previews\/[^/]+\/confirm$/.test(path))return {name:'confirm_workspace_change',args:b};
 if(/\/organization\/components\/[^/]+$/.test(path))return {name:'read_project_component',args:{}};
 return {};
}
async function fail(route,statusCode=503,code='temporary'){
 const embedded=new URL(route.request().url()).pathname==='/fixture/tool';
 await route.fulfill({status:embedded?200:statusCode,json:embedded?{isError:true,content:[{type:'text',text:'Refresh failed'}],structuredContent:{error:{status:statusCode,code}}}:{error:code,message:'Refresh failed'}});
}
async function intercept(page,handler){await page.route('**/*',async route=>{if(await handler(route,operation(route.request()))!==true)await route.continue();});}
async function call(page,name,args){const r=await(await page.request.post(base+'/fixture/tool',{data:{name,arguments:args}})).json();expect(r.isError,JSON.stringify(r)).not.toBe(true);return r.structuredContent.result;}
async function open(page,host,f){
 await page.goto(host==='embedded'?base+'/?apps=1':host==='public'?f.shareUrl:base+`/apps/${f.appId}?workspaceId=${f.workspaceId}&source=component`);
 if(host==='embedded'){await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),await(await page.request.get(base+'/fixture/app-display?appId='+f.appId)).json());}
 const root=host==='embedded'?page.frameLocator('#app'):page;return {root,frame:root.frameLocator('iframe[title="Saved frontend code"]')};
}
async function saveValue(root,frame,value){await frame.getByLabel('Value',{exact:true}).fill(value);await frame.getByRole('button',{name:'Save value',exact:true}).click();await root.getByRole('dialog',{name:'Review app changes'}).getByRole('button',{name:'Save changes',exact:true}).click();}

for(const host of ['web','embedded','public']){
 test(`Confirmed save is visible during reload and read-only retry never resaves (${host})`,async({page})=>{
  const f=await(await page.request.post(base+'/fixture/publication')).json(),{root,frame}=await open(page,host,f),gate=deferred(),ack=deferred();let saves=0,reads=0,broken=true,recovering=true;
  await intercept(page,async(route,op)=>{
   if(op.name==='confirm_workspace_change'){saves++;if(saves===1)await ack.promise;}
   if(saves&&recovering&&op.name==='run_component_frontend'){expect(op.args.request.event.kind).toBe('open');reads++;if(reads===1)await gate.promise;if(broken){await fail(route);return true;}}
  });
  await saveValue(root,frame,'P12 retained input');await expect.poll(()=>saves).toBe(1);await expect(status(root)).toHaveCount(0);await expect(root.getByRole('dialog',{name:'Review app changes'})).toBeVisible();ack.release();await expect(status(root)).toHaveAttribute('data-save-status','refreshing');await expect(root.getByRole('dialog')).toHaveCount(0);await expect(frame.getByLabel('Value',{exact:true})).toHaveValue('P12 retained input');await expect(root.locator('iframe[title="Saved frontend code"]')).toHaveAttribute('inert','');
  gate.release();await expect(status(root)).toHaveAttribute('data-save-status','failed');await page.waitForTimeout(3200);await expect(status(root)).toBeVisible();
  await root.getByRole('button',{name:'Reload saved data',exact:true}).click();await expect.poll(()=>reads).toBe(2);await expect(status(root)).toHaveAttribute('data-save-status','failed');expect(saves).toBe(1);
  broken=false;await root.getByRole('button',{name:'Reload saved data',exact:true}).click();await expect(status(root)).toHaveCount(0);await expect(root.locator('iframe[title="Saved frontend code"]')).not.toHaveAttribute('inert');await expect(frame.getByLabel('Value',{exact:true})).toHaveValue('P12 retained input');expect(saves).toBe(1);
  const rows=await(await page.request.get(base+`/api/workspaces/${f.workspaceId}/types/${f.typeId}/records`)).json();expect(rows.rows[0].version).toBe(1);
  recovering=false;await saveValue(root,frame,'A distinct second edit');await expect(status(root)).toHaveCount(0);await expect(frame.getByLabel('Value',{exact:true})).toHaveValue('A distinct second edit');expect(saves).toBe(2);
 });
 test(`Revocation after acknowledgement removes the view but keeps the saved receipt (${host})`,async({page})=>{
  const f=await(await page.request.post(base+'/fixture/publication')).json(),{root,frame}=await open(page,host,f);let saves=0;
  await intercept(page,async(route,op)=>{if(op.name==='confirm_workspace_change')saves++;if(saves&&op.name==='run_component_frontend'){await fail(route,403,'forbidden');return true;}});
  await saveValue(root,frame,'Saved before revocation');await expect(status(root)).toHaveAttribute('data-save-status','unavailable');await expect(root.getByRole('heading',{name:'No app is available',exact:true})).toBeVisible();await expect(root.locator('iframe[title="Saved frontend code"]')).toHaveCount(0);await expect(root.getByRole('button',{name:'Reload saved data',exact:true})).toHaveCount(0);expect(saves).toBe(1);await root.locator('.ty-workspace').evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(350);await expect(status(root)).toHaveAttribute('data-save-status','unavailable');
 });
}

for(const host of ['web','embedded']){
 test(`Native cell save retains its value and refreshes without a second commit (${host})`,async({page})=>{
  await page.setViewportSize({width:390,height:900});const f=await(await page.request.post(base+'/fixture/publication',{data:{standard:true}})).json(),{root,frame}=await open(page,host,f);await frame.getByRole('button',{name:'Items',exact:true}).click();let saves=0,broken=true;
  await intercept(page,async(route,op)=>{if(op.name==='confirm_workspace_change')saves++;if(saves&&broken&&op.name==='run_component_frontend'&&op.args.request.event?.kind==='open'){await fail(route);return true;}});
  await frame.getByRole('button',{name:'Edit Name',exact:true}).click();await frame.getByRole('textbox',{name:'Name',exact:true}).fill('Native retained input');await frame.getByRole('textbox',{name:'Name',exact:true}).press('Enter');await expect(status(root)).toHaveAttribute('data-save-status','failed');await expect(frame.getByText('Native retained input',{exact:true})).toBeVisible();
  const notice=await status(root).boundingBox();expect(notice.x).toBeGreaterThanOrEqual(0);expect(notice.x+notice.width).toBeLessThanOrEqual(390);await page.screenshot({path:`test-results/save-refresh-native-${host}.png`});
  broken=false;await root.getByRole('button',{name:'Reload saved data',exact:true}).click();await expect(status(root)).toHaveCount(0);await expect(frame.getByRole('button',{name:'Edit Name',exact:true})).toHaveText('Native retained input');expect(saves).toBe(1);
 });
 test(`Saved draft retries metadata and rendering without saving the app twice (${host})`,async({page})=>{
  const draft=await(await page.request.get(base+'/fixture/app-draft')).json();await page.goto(host==='embedded'?base+'/?apps=1':base+`/apps/${draft.preview.id}?workspaceId=${draft.workspaceId}&source=preview`);
  if(host==='embedded'){await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),draft);}
  const root=host==='embedded'?page.frameLocator('#app'):page;await expect(root.getByRole('button',{name:'Save app',exact:true})).toBeEnabled();let saves=0,stage='metadata';
  await intercept(page,async(route,op)=>{if(op.name==='confirm_workspace_change')saves++;if(saves&&(stage==='metadata'&&op.name==='read_project_component'||stage==='render'&&op.name==='run_component_frontend')){await fail(route);return true;}});
  await root.getByRole('button',{name:'Save app',exact:true}).click();await expect(status(root)).toHaveAttribute('data-save-status','failed');await expect(root.getByRole('button',{name:'Save app',exact:true})).toHaveCount(0);await expect(root.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:'Embedded draft',exact:true})).toBeVisible();
  if(host==='web'){stage='render';await root.getByRole('button',{name:'Reload saved app',exact:true}).click();await expect(status(root)).toHaveAttribute('data-save-status','failed');expect(saves).toBe(1);}
  stage='ok';await root.getByRole('button',{name:'Reload saved app',exact:true}).click();await expect(status(root)).toHaveCount(0);expect(saves).toBe(1);
  if(host==='embedded')await expect(root.getByRole('button',{name:/Open Embedded draft/}).first()).toBeVisible();else await expect(root.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:'Embedded draft',exact:true})).toBeVisible();
 });
 for(const custom of [false,true])test(`Saved ${custom?'custom':'standard'} layout only retries reading the app (${host})`,async({page})=>{
  let f;
  if(custom){const account=await(await page.request.get(base+'/fixture/apps')).json();const source='const templateConfiguration={"heading":"P12 custom layout"};\nconst templateLayoutSchema={"screens":[{"id":"overview","label":"Overview"}],"groups":{"items":[{"id":"name","label":"Name"}]}};\nreturn {html:"<h1>"+templateConfiguration.heading+"</h1>"};';const p=await call(page,'prepare_workspace_change',{operation:{kind:'save_component',content:{name:'P12 custom layout',format:'frontend-js',source,bindings:[]}}});const c=await call(page,'confirm_workspace_change',{previewId:p.id,digest:p.digest});f={appId:c.id,workspaceId:account.workspaceId};}
  else {const c=await(await page.request.post(base+'/fixture/generic-layout')).json();f={appId:c.id,workspaceId:c.workspaceId};}
  const {root,frame}=await open(page,host,f);
  if(custom){await root.locator('.ty-tracker-navigation summary').click();await root.getByRole('button',{name:'Layout',exact:true}).click();await root.getByLabel('App title',{exact:true}).fill('P12 updated layout');}
  else {await frame.getByRole('button',{name:'App settings',exact:true}).click();await root.getByLabel('Name',{exact:true}).fill('P12 updated layout');}
  let saves=0,broken=true;await intercept(page,async(route,op)=>{if(op.name==='confirm_workspace_change')saves++;if(saves&&broken&&op.name==='read_project_component'){await fail(route);return true;}});
  if(custom){await root.getByRole('button',{name:'Review layout',exact:true}).click();await root.getByRole('button',{name:'Confirm layout',exact:true}).click();}else await root.getByRole('button',{name:'Save layout',exact:true}).click();
  await expect(status(root)).toHaveAttribute('data-save-status','failed');await expect(root.getByLabel(custom?'App title':'Name',{exact:true})).toHaveValue('P12 updated layout');await root.getByRole('button',{name:'Reload saved app',exact:true}).click();await expect(status(root)).toHaveAttribute('data-save-status','failed');expect(saves).toBe(1);
  broken=false;await root.getByRole('button',{name:'Reload saved app',exact:true}).click();await expect(status(root)).toHaveCount(0);await expect(frame.getByRole('heading',{name:'P12 updated layout',exact:true})).toBeVisible();expect(saves).toBe(1);
 });
}

test('Saved data retry renews an expired view without replaying its write',async({page})=>{
 const f=await(await page.request.post(base+'/fixture/publication')).json(),{root,frame}=await open(page,'web',f);let saves=0,reads=0;const reloads=[];
 await intercept(page,async(route,op)=>{
  if(op.name==='confirm_workspace_change')saves++;
  if(saves&&op.name==='run_component_frontend'){
   const request=op.args.request;reloads.push(request);reads++;
   if(reads===1){await fail(route);return true;}
   if(request.viewId){await fail(route,409,'app_view_expired');return true;}
  }
 });
 await saveValue(root,frame,'Retained through expiry');await expect(status(root)).toHaveAttribute('data-save-status','failed');
 await root.getByRole('button',{name:'Reload saved data',exact:true}).click();await expect(status(root)).toHaveCount(0);await expect(frame.getByLabel('Value',{exact:true})).toHaveValue('Retained through expiry');expect(saves).toBe(1);expect(reloads).toHaveLength(3);expect(reloads[0].viewId).toBeTruthy();expect(reloads[1]).toEqual(reloads[0]);const {viewId,...renewed}=reloads[0];expect(reloads[2]).toEqual(renewed);expect(renewed.event).toEqual({kind:'open'});
});

test('A late saved-draft reload cannot replace a newly opened app',async({page})=>{
 const other=await(await page.request.post(base+'/fixture/publication')).json(),draft=await(await page.request.get(base+'/fixture/app-draft')).json();await page.goto(base+'/?apps=1');await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),draft);const root=page.frameLocator('#app'),gate=deferred();let saves=0,finished=false;await expect(root.getByRole('button',{name:'Save app',exact:true})).toBeEnabled();
 await intercept(page,async(route,op)=>{if(op.name==='confirm_workspace_change')saves++;if(saves&&op.name==='read_project_component'&&op.args.componentId!==other.appId){const result=await route.fetch();await gate.promise;await route.fulfill({response:result});finished=true;return true;}});
 await root.getByRole('button',{name:'Save app',exact:true}).click();await expect(status(root)).toHaveAttribute('data-save-status','refreshing');await page.evaluate(r=>window.deliver(r),await(await page.request.get(base+'/fixture/app-display?appId='+other.appId)).json());await expect(root.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:'Loaded version',exact:true})).toBeVisible();gate.release();await expect.poll(()=>finished).toBe(true);await page.waitForTimeout(200);await expect(root.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:'Loaded version',exact:true})).toBeVisible();expect(saves).toBe(1);
});


test('Explicit latest-version refresh can recover an acknowledged save',async({page})=>{
 const f=await(await page.request.post(base+'/fixture/publication')).json(),{root,frame}=await open(page,'web',f);let saves=0,broken=true;
 await intercept(page,async(route,op)=>{if(op.name==='confirm_workspace_change')saves++;if(saves&&broken&&op.name==='run_component_frontend'){await fail(route);return true;}});
 await saveValue(root,frame,'Saved on original version');await expect(status(root)).toHaveAttribute('data-save-status','failed');
 const p=await call(page,'prepare_workspace_change',{operation:{kind:'save_component',componentId:f.appId,expectedVersion:0,content:{...f.content,source:f.content.source.replace('Loaded version','Explicit latest version')}}});await call(page,'confirm_workspace_change',{previewId:p.id,digest:p.digest});
 await root.locator('.ty-workspace').evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(root.getByRole('button',{name:'Refresh to latest version',exact:true})).toBeVisible();broken=false;await root.getByRole('button',{name:'Refresh to latest version',exact:true}).click();await expect(status(root)).toHaveCount(0);await expect(frame.getByRole('heading',{name:'Explicit latest version',exact:true})).toBeVisible();await expect(frame.getByLabel('Value',{exact:true})).toHaveValue('Saved on original version');expect(saves).toBe(1);
});
