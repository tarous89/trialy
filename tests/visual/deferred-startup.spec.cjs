const {test,expect,openPlatform}=require('./test.cjs');
const base='http://127.0.0.1:4179';
const metadataPath=/\/api\/workspaces\/[^/]+\/(types|views)$/;
const archivePath='**/organization/archived?**';
const callsFor=page=>{const calls=[];page.on('request',r=>calls.push(new URL(r.url())));return calls;};
const metadataCalls=calls=>calls.filter(u=>metadataPath.test(u.pathname));

test('Home and Database use their own data without eager workspace schemas or views',async({page})=>{
 const calls=callsFor(page);await openPlatform(page,base+'/app-home');
 await expect(page.getByRole('link',{name:'Open Simple app fixture',exact:true})).toBeVisible();
 await expect.poll(()=>calls.filter(u=>u.pathname.endsWith('/organization/archived')).length).toBeGreaterThan(0);
 expect(metadataCalls(calls)).toHaveLength(0);
 expect(calls.filter(u=>u.pathname.endsWith('/organization/archived')).every(u=>u.searchParams.get('summaryOnly')==='true')).toBe(true);
 await page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('button',{name:'Database',exact:true}).click();
 await expect.poll(()=>calls.some(u=>u.pathname==='/api/account/schema')).toBe(true);
 await expect(page.getByRole('heading',{name:'App companies',exact:true})).toBeVisible();
 expect(metadataCalls(calls)).toHaveLength(0);
});

test('Direct saved app and draft links skip unrelated schema, view and archive reads',async({page})=>{
 const f=await(await page.request.get(base+'/fixture/apps')).json(),draft=await(await page.request.get(base+'/fixture/app-draft')).json();
 const calls=callsFor(page);
 for(const [url,title] of [[f.url,'Overview'],['/apps/'+draft.preview.id+'?workspaceId='+draft.workspaceId+'&source=preview','Embedded draft']]){
  await page.goto(base+url);await expect(page.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:title,exact:true})).toBeVisible();
 }
 expect(metadataCalls(calls)).toHaveLength(0);expect(calls.filter(u=>u.pathname.endsWith('/organization/archived'))).toHaveLength(0);
});

test('Legacy access loads only schemas, exposes retry, and stops reading after closing',async({page})=>{
 let attempts=0;const calls=callsFor(page);
 await page.route(/\/api\/workspaces\/[^/]+\/types$/,route=>++attempts===1?route.fulfill({status:503,json:{error:'Temporary schema failure'}}):route.continue());
 await openPlatform(page,base+'/app-home?access=1');
 await page.getByRole('button',{name:'Retry loading tables',exact:true}).click();
 await expect.poll(()=>attempts).toBe(2);await expect(page.getByRole('status').filter({hasText:'Loading tables'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Retry loading tables',exact:true})).toHaveCount(0);
 expect(metadataCalls(calls).filter(u=>u.pathname.endsWith('/views'))).toHaveLength(0);
 await page.getByRole('button',{name:'Close database access',exact:true}).click();
 await page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('button',{name:'Database',exact:true}).click();
 await expect(page.getByRole('heading',{name:'App companies',exact:true})).toBeVisible();expect(attempts).toBe(2);
});

test('Late schema errors from a closed screen are discarded; legacy automations still load views',async({page})=>{
 let finish;const pending=new Promise(r=>finish=r);let started=false;
 await page.route(/\/api\/workspaces\/[^/]+\/types$/,async route=>{started=true;await pending;await route.fulfill({status:503,json:{error:'Old screen failure'}});});
 await openPlatform(page,base+'/app-home?access=1');await expect.poll(()=>started).toBe(true);
 await page.getByRole('button',{name:'Close database access',exact:true}).click();
 const reply=page.waitForResponse(r=>r.url().endsWith('/types'));finish();await reply;
 await expect(page.getByRole('button',{name:'Retry loading tables',exact:true})).toHaveCount(0);
 await page.unroute(/\/api\/workspaces\/[^/]+\/types$/);
 await page.route('**/api/config',async route=>{const response=await route.fetch();await route.fulfill({json:{...await response.json(),simpleApps:false}});});
 const calls=callsFor(page);await openPlatform(page,base+'/app-home?tab=automations');
 await expect(page.getByRole('heading',{name:'Recent runs',exact:true})).toBeVisible();
 await expect.poll(()=>metadataCalls(calls).length).toBe(2);
 expect(metadataCalls(calls).map(u=>u.pathname.split('/').pop()).sort()).toEqual(['types','views']);
});

test('An account recheck invalidates pending schema results even in the same workspace',async({page})=>{
 let changed=false,attempts=0,finish;const pending=new Promise(r=>finish=r);
 await page.route('**/api/me',async route=>{const response=await route.fetch(),me=await response.json();if(changed)me.user={...me.user,id:'30000000-0000-4000-8000-000000000039',name:'Switched account'};await route.fulfill({json:me});});
 await page.route(/\/api\/workspaces\/[^/]+\/types$/,async route=>{if(++attempts!==1)return route.continue();await pending;await route.fulfill({status:503,json:{message:'Previous account failure'}});});
 await openPlatform(page,base+'/app-home?access=1');await expect.poll(()=>attempts).toBe(1);
 changed=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(()=>attempts).toBe(2);
 await expect(page.getByRole('heading',{name:'People and permissions',exact:true})).toBeVisible();
 const reply=page.waitForResponse(r=>r.url().endsWith('/types')&&r.status()===503);finish();await reply;
 await expect(page.getByRole('button',{name:'Retry loading tables',exact:true})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'People and permissions',exact:true})).toBeVisible();
});

test('Collapsed archives defer details, recover from failures and ignore late expansion replies',async({page})=>{
 let details=0,finish;const pending=new Promise(r=>finish=r);
 const item={kind:'app',id:'30000000-0000-4000-8000-000000000031',name:'Archived fixture',version:1,canRestore:true,canDelete:true,keeps:{tables:[],automations:0}};
 await page.route(archivePath,async route=>{
  const u=new URL(route.request().url());if(u.searchParams.get('summaryOnly')==='true')return route.fulfill({json:{kind:'apps',count:1,items:[],summaryOnly:true}});
  details++;if(details===1)return route.fulfill({status:503,json:{error:'Try again'}});
  if(details===2)await pending;
  await route.fulfill({json:{kind:'apps',count:1,items:[item]}});
 });
 await openPlatform(page,base+'/app-home');await page.getByRole('button',{name:'Show archived apps (1)',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'Archived apps could not be loaded.'})).toBeVisible();
 await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Loading archived apps'})).toBeVisible();
 await page.getByRole('button',{name:'Hide archived apps',exact:true}).click();
 const reply=page.waitForResponse(r=>r.url().includes('/organization/archived')&&!r.url().includes('summaryOnly'));finish();await reply;
 await expect(page.getByRole('button',{name:'Show archived apps (1)',exact:true})).toBeVisible();await expect(page.getByText('Archived fixture',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Show archived apps (1)',exact:true}).click();await expect(page.getByText('Archived fixture',{exact:true})).toBeVisible();expect(details).toBe(3);
 await page.reload();await expect(page.getByText('Archived fixture',{exact:true})).toBeVisible();expect(details).toBe(4);
});

test('Expanded archives retain real restore and permanent-delete workflows',async({page})=>{
 const f=await(await page.request.post(base+'/fixture/generic-layout')).json();
 const call=async(name,args)=>{const r=await(await page.request.post(base+'/fixture/tool',{data:{name,arguments:{workspaceId:f.workspaceId,...args}}})).json();expect(r.isError,JSON.stringify(r)).not.toBe(true);return r.structuredContent.result;};
 const archive=async()=>{const current=await call('read_project_component',{componentId:f.id});const p=await call('prepare_workspace_change',{operation:{kind:'archive_component',componentId:f.id,expectedVersion:current.component.version,archived:true}});await call('confirm_workspace_change',{previewId:p.id,digest:p.digest});};
 await archive();await openPlatform(page,base+'/app-home');await page.getByRole('button',{name:/^Show archived apps/}).click();
 const row=page.locator('.ty-archived-item').filter({hasText:'Generic layout fixture'});await row.getByRole('button',{name:'Restore',exact:true}).click();await expect(row).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Open Generic layout fixture',exact:true})).toBeVisible();
 await archive();await page.reload();await row.getByRole('button',{name:'Delete',exact:true}).click();
 const confirm=page.getByRole('alertdialog');await expect(confirm).toContainText('Deleting this app keeps its');await confirm.getByRole('button',{name:'Delete permanently',exact:true}).click();await expect(row).toHaveCount(0);
 const remaining=await call('list_archived_items',{kind:'apps'});expect(remaining.items.some(i=>i.id===f.id)).toBe(false);
});

test('Embedded Home requests a summary first and original details on expansion',async({page})=>{
 const f=await(await page.request.get(base+'/fixture/apps')).json(),reads=[];
 await page.route('**/fixture/tool',route=>{const v=route.request().postDataJSON();if(v.name!=='list_archived_items')return route.continue();reads.push(v.arguments);return route.fulfill({json:{content:[],structuredContent:{result:{kind:'apps',count:1,items:v.arguments.summaryOnly?[]:[{kind:'app',id:f.appId,name:'Embedded archived app',version:1,canRestore:true,canDelete:false}]}}}});});
 await page.goto(base+'/?apps=1');await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),{screen:'home',workspaceId:f.workspaceId,viewerId:'fixture',workspaces:[],types:[]});
 const root=page.frameLocator('#app');await root.getByRole('button',{name:'Show archived apps (1)',exact:true}).click();await expect(root.getByText('Embedded archived app',{exact:true})).toBeVisible();
 expect(reads.length).toBeGreaterThanOrEqual(2);expect(reads.slice(0,-1).every(r=>r.summaryOnly===true)).toBe(true);expect(reads.at(-1).summaryOnly).toBeUndefined();
});
