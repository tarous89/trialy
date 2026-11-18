// Runs last: it adds apps to the shared fixture workspace, which earlier specs photograph.
const {test,expect,openPlatform}=require('./test.cjs');
const base='http://127.0.0.1:4179';
async function call(page,name,args){const r=await (await page.request.post(base+'/fixture/tool',{data:{name,arguments:args}})).json();expect(r.isError,JSON.stringify(r)).not.toBe(true);return r.structuredContent.result;}
test('An installed app offers its newer version in Settings and updates after one confirmation',async({page})=>{
 const f=await (await page.request.get(base+'/fixture/apps')).json();
 const p=await call(page,'prepare_workspace_change',{operation:{kind:'save_component',content:{name:'Updatable app',format:'frontend-js',source:'return {html:"<h1>Updatable app</h1>"};'}}});
 const app=await call(page,'confirm_workspace_change',{previewId:p.id,digest:p.digest});
 const offer={available:true,canUpdate:true,componentId:app.id,expectedVersion:0,templateId:'life.example',name:'Updatable app',fromVersion:'1.0.0',toVersion:'1.0.1',toDigest:'a'.repeat(64)};
 const seen={offer:0,prepare:0,confirm:0};let prepared;
 await page.route(`**/api/workspaces/${f.workspaceId}/apps/${app.id}/update`,async route=>{
  if(route.request().method()==='GET'){seen.offer++;return route.fulfill({json:offer});}
  seen.prepare++;prepared=route.request().postDataJSON();return route.fulfill({json:{preview:{id:'00000000-0000-4000-8000-0000000000aa',digest:'b'.repeat(64)},update:{name:offer.name,fromVersion:offer.fromVersion,toVersion:offer.toVersion}}});
 });
 await page.route('**/previews/00000000-0000-4000-8000-0000000000aa/confirm',route=>{seen.confirm++;return route.fulfill({json:{id:app.id}});});
 await openPlatform(page,base+`/apps/${app.id}?workspaceId=${f.workspaceId}&source=component`);
 await expect(page.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:'Updatable app'})).toBeVisible();
 // The offer never covers the app: it is one entry in the app's Settings menu.
 await expect(page.getByRole('dialog',{name:'Update app'})).toHaveCount(0);
 await page.getByText('Settings •').click();
 await page.getByRole('button',{name:'Update to version 1.0.1'}).click();
 const dialog=page.getByRole('dialog',{name:'Update app'});
 await expect(dialog.getByRole('heading',{name:'Update Updatable app to version 1.0.1?'})).toBeVisible();
 await expect(dialog).toContainText('Your records, tables, layout, settings, access and automations stay as they are.');
 expect(seen.confirm).toBe(0);
 await dialog.getByRole('button',{name:'Update app',exact:true}).click();
 await expect(page.getByText('Updatable app updated to version 1.0.1.')).toBeVisible();
 expect(prepared).toEqual({expectedVersion:0,toVersion:'1.0.1',toDigest:'a'.repeat(64)});
 expect(seen.prepare).toBe(1);expect(seen.confirm).toBe(1);
 // The app is shown again after the update.
 await expect(page.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:'Updatable app'})).toBeVisible();
});
test('An app without an update shows no offer',async({page})=>{
 const f=await (await page.request.get(base+'/fixture/apps')).json();
 const p=await call(page,'prepare_workspace_change',{operation:{kind:'save_component',content:{name:'Current app',format:'frontend-js',source:'return {html:"<h1>Current app</h1>"};'}}});
 const app=await call(page,'confirm_workspace_change',{previewId:p.id,digest:p.digest});
 // The real server: custom code is never offered an update.
 await openPlatform(page,base+`/apps/${app.id}?workspaceId=${f.workspaceId}&source=component`);
 await expect(page.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:'Current app'})).toBeVisible();
 await page.getByText('Settings',{exact:true}).click();
 await expect(page.getByRole('button',{name:/Update to version/})).toHaveCount(0);
});
