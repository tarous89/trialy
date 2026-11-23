const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
const deferred=()=>{let release;const promise=new Promise(r=>release=r);return {promise,release};};
const bar=root=>root.getByRole('progressbar',{name:'Working',exact:true});
const burst=root=>root.locator('body').evaluate(()=>{window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));});
const tick=async page=>{await page.clock.fastForward(30100);await page.clock.runFor(250);};
function operation(request){const p=new URL(request.url()).pathname;if(p==='/fixture/tool'){const b=request.postDataJSON();return {name:b.name,args:b.arguments??{}};}return {name:p==='/api/me'?'account':p==='/api/account/home'?'home':p==='/api/account/home/revision'?'revision':p==='/api/account/home/snapshots'?'snapshots':p.endsWith('/organization/archived')?'archive':p.endsWith('/access')&&p.includes('/components/')?'access':p.endsWith('/frontend/run')?'run':'',args:request.method()==='POST'?request.postDataJSON():Object.fromEntries(new URL(request.url()).searchParams)};}
const names={home:['home','read_account_home'],revision:['revision','check_account_home'],archive:['archive','list_archived_items'],access:['access','check_component_access'],run:['run','run_component_frontend'],snapshots:['snapshots','read_home_snapshots']};
const is=(op,name)=>names[name]?.includes(op.name);
async function open(page,embedded,app=false){
 const f=await(await page.request.get(base+'/fixture/apps')).json();
 await page.goto(base+(embedded?'/?apps=1':app?f.url:'/app-home'));
 if(embedded){await page.waitForFunction(()=>window.hostReady);const display=app?await(await page.request.get(base+'/fixture/app-display?appId='+f.appId)).json():{screen:'home',workspaceId:f.workspaceId,viewerId:'fixture',workspaces:[],types:[]};await page.evaluate(r=>window.deliver(r),display);}
 const root=embedded?page.frameLocator('#app'):page;
 if(app)await expect(root.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
 else await expect(root.getByRole(embedded?'button':'link',{name:'Open Simple app fixture',exact:true})).toBeVisible();
 await expect(bar(root)).toHaveCount(0);return {root,f};
}
async function intercept(page,fn){await page.route('**/*',async route=>{const op=operation(route.request());if(await fn(route,op)!==true)await route.continue().catch(()=>{});});}
function fail(route,embedded,status){return route.fulfill(embedded?{json:{isError:true,content:[{type:'text',text:'Permission check failed'}],structuredContent:{error:{status}}}}:{status,json:{message:'Permission check failed'}});}

for(const embedded of [false,true]){
 const host=embedded?'embedded':'web';
 test(`Background Home checks cannot start or prolong foreground progress (${host})`,async({page})=>{
  await page.clock.install();const {root}=await open(page,embedded),background=deferred(),foreground=deferred();let checks=0,reads=0;
  await intercept(page,async(route,op)=>{if(is(op,'revision')||op.name==='account'){checks++;await background.promise;}else if(is(op,'home')){reads++;await foreground.promise;}});
  await tick(page);await expect.poll(()=>checks).toBeGreaterThan(0);await page.clock.runFor(250);await expect(bar(root)).toHaveCount(0);
  await root.getByPlaceholder('Search by name or description…').fill('Simple');await page.clock.runFor(400);await expect.poll(()=>reads).toBe(1);await expect(bar(root)).toBeVisible();
  foreground.release();await expect(root.getByRole(embedded?'button':'link',{name:'Open Simple app fixture',exact:true})).toBeVisible();await expect(bar(root)).toHaveCount(0);
  background.release();
 });
 test(`Return-to-tab Home refresh stays quiet; failures still offer a foreground retry (${host})`,async({page})=>{
  await page.clock.install();const {root}=await open(page,embedded),gate=deferred();let reads=0,deny=true;
  await intercept(page,async(route,op)=>{if(is(op,'home')){reads++;await gate.promise;if(deny){await fail(route,embedded,403);return true;}}});
  await burst(root);await page.clock.runFor(400);await expect.poll(()=>reads).toBe(1);await expect(bar(root)).toHaveCount(0);
  gate.release();await expect(root.getByRole('button',{name:'Retry loading',exact:true})).toBeVisible();await expect(root.getByRole(embedded?'button':'link',{name:'Open Simple app fixture',exact:true})).toHaveCount(0);
  deny=false;const retry=deferred();await page.unroute('**/*');await intercept(page,async(_route,op)=>{if(is(op,'home'))await retry.promise;});
  await root.getByRole('button',{name:'Retry loading',exact:true}).click();await page.clock.runFor(250);await expect(bar(root)).toBeVisible();retry.release();await expect(root.getByRole(embedded?'button':'link',{name:'Open Simple app fixture',exact:true})).toBeVisible();await expect(bar(root)).toHaveCount(0);
 });
 test(`Collapsed archive count arrives with Home; expansion shows local and global loading (${host})`,async({page})=>{
  // L1.4: the count comes with the Home read itself, so there is no separate summary request.
  await page.clock.install();const detail=deferred();let summaries=0,details=0;
  await intercept(page,async(route,op)=>{
   if(is(op,'home')){const response=await route.fetch().catch(()=>null);if(!response)return true;const json=await response.json(),home=embedded?json.structuredContent.result:json;home.archivedApps=typeof home.archivedApps==='number'?1:Object.fromEntries(Object.keys(home.archivedApps??{}).map(k=>[k,1]));await route.fulfill({response,json});return true;}
   if(!is(op,'archive'))return;const collapsed=op.args.summaryOnly===true||op.args.summaryOnly==='true';if(collapsed)summaries++;else{details++;await detail.promise;}await route.fulfill({json:embedded?{content:[],structuredContent:{result:{count:1,items:[]}}}:{count:1,items:[]}});return true;});
  const {root}=await open(page,embedded);await expect(root.getByRole('button',{name:'Show archived apps (1)',exact:true})).toBeVisible();expect(summaries).toBe(0);
  await root.getByRole('button',{name:'Show archived apps (1)',exact:true}).click();await page.clock.runFor(250);await expect.poll(()=>details).toBe(1);await expect(root.getByRole('status').filter({hasText:'Loading archived apps'})).toBeVisible();await expect(bar(root)).toBeVisible();detail.release();await expect(bar(root)).toHaveCount(0);
 });
 test(`App cards draw their fixed cover at once and ask for no miniatures (${host})`,async({page})=>{
  // App cards are a colorful cover with the app's name, drawn from the Home read: nothing is fetched or swapped in later.
  await page.clock.install();let reads=0;
  await intercept(page,async(_route,op)=>{if(is(op,'snapshots'))reads++;});
  const {root}=await open(page,embedded);await expect(root.locator('.ty-app-cover-wordmark').first()).toBeVisible();
  await page.clock.runFor(1000);expect(reads).toBe(0);await expect(root.locator('.ty-app-cover-window')).toHaveCount(0);await expect(bar(root)).toHaveCount(0);
 });
 test(`App access checks stay quiet while explicit Refresh stays visible (${host})`,async({page})=>{
  await page.clock.install();const {root}=await open(page,embedded,true),access=deferred(),refresh=deferred();let checks=0,runs=0;
  await intercept(page,async(_route,op)=>{if(is(op,'access')){checks++;await access.promise;}else if(is(op,'run')){runs++;await refresh.promise;}});
  await tick(page);await expect.poll(()=>checks).toBe(1);await page.clock.runFor(250);await expect(bar(root)).toHaveCount(0);
  await root.getByRole('button',{name:'Refresh',exact:true}).click();await page.clock.runFor(250);await expect.poll(()=>runs).toBe(1);await expect(bar(root)).toBeVisible();refresh.release();await expect(bar(root)).toHaveCount(0);access.release();
 });
 test(`Quiet checks still remove revoked apps (${host})`,async({page})=>{
  await page.clock.install();const {root}=await open(page,embedded,true),gate=deferred();let checks=0;
  await intercept(page,async(route,op)=>{if(is(op,'access')){checks++;await gate.promise;await fail(route,embedded,403);return true;}});
  await tick(page);await expect.poll(()=>checks).toBe(1);await page.clock.runFor(250);await expect(bar(root)).toHaveCount(0);gate.release();
  /* U3: on the web a person whose access was removed sees the no-access page; inside an assistant the app is simply gone. */await expect(root.getByRole('heading',{name:embedded?'No app is available':"You don't have access to this app.",exact:true})).toBeVisible();await expect(root.locator('iframe[title="Saved frontend code"]')).toHaveCount(0);
 });
}

for(const embedded of [false,true])test(`Return-to-tab pending-change read is merged and quiet (${embedded?'embedded':'web'})`,async({page})=>{
 await page.clock.install();const {root}=await open(page,embedded),gate=deferred();let reads=0;
 await intercept(page,async(route,op)=>{if(op.name==='list_pending_app_changes'||new URL(route.request().url()).pathname.endsWith('/pending-app-changes')){reads++;await gate.promise;}});
 await burst(root);await page.clock.runFor(400);await expect.poll(()=>reads).toBe(1);await page.clock.runFor(400);await expect(bar(root)).toHaveCount(0);expect(reads).toBe(1);gate.release();
});

test('A quiet failed account check surfaces its error without a global loading bar',async({page})=>{
 await page.clock.install();const {root}=await open(page,false),gate=deferred();let checks=0;
 await intercept(page,async(route,op)=>{if(op.name==='account'){checks++;await gate.promise;await fail(route,false,503);return true;}});
 await burst(root);await page.clock.runFor(400);await expect.poll(()=>checks).toBe(1);await expect(bar(root)).toHaveCount(0);gate.release();
 await expect(root.getByRole('alert').filter({hasText:'Permission check failed'})).toBeVisible();await expect(root.getByRole('link',{name:'Open Simple app fixture',exact:true})).toBeVisible();
});

for(const embedded of [false,true])test(`Failed saves release progress and keep the preview for retry (${embedded?'embedded':'web'})`,async({page})=>{
 await page.clock.install();const draft=await(await page.request.get(base+'/fixture/app-draft')).json();await page.goto(base+(embedded?'/?apps=1':'/apps/'+draft.preview.id+'?workspaceId='+draft.workspaceId+'&source=preview'));
 if(embedded){await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),draft);}
 const root=embedded?page.frameLocator('#app'):page;await expect(root.getByRole('button',{name:'Save app',exact:true})).toBeEnabled();await expect(bar(root)).toHaveCount(0);
 const gate=deferred();let saves=0;
 await intercept(page,async(route,op)=>{if(['confirm_workspace_change','approve_workspace_change'].includes(op.name)||new URL(route.request().url()).pathname.match(/\/organization\/previews\/[^/]+\/confirm$/)){saves++;await gate.promise;await fail(route,embedded,503);return true;}});
 await root.getByRole('button',{name:'Save app',exact:true}).click();await root.getByRole('dialog').getByRole('button',{name:'Install',exact:true}).click();await page.clock.runFor(250);await expect.poll(()=>saves).toBe(1);await expect(bar(root)).toBeVisible();gate.release();await expect(bar(root)).toHaveCount(0);
 await expect(root.getByRole('alert').filter({hasText:'Permission check failed'})).toBeVisible();await expect(root.getByRole('button',{name:'Save app',exact:true})).toBeEnabled();await expect(root.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:'Embedded draft',exact:true})).toBeVisible();expect(saves).toBe(1);
});
