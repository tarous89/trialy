const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
const burst=root=>root.locator('body').evaluate(()=>{window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));});
async function openHome(page,embedded=false){
 const f=await(await page.request.get(base+'/fixture/apps')).json();await page.goto(base+(embedded?'/?apps=1':'/app-home'));
 if(embedded){await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),{screen:'home',workspaceId:f.workspaceId,viewerId:'fixture',workspaces:[],types:[]});}
 const root=embedded?page.frameLocator('#app'):page;await expect(root.getByRole('heading',{name:'Apps',exact:true})).toBeVisible();return {root,f};
}
function counters(page){const c={home:0,revision:0,revisionDone:0,archive:0,me:0,run:0,access:0};page.on('requestfinished',r=>{if(new URL(r.url()).pathname==='/api/account/home/revision'||new URL(r.url()).pathname==='/fixture/tool'&&r.postDataJSON()?.name==='check_account_home')c.revisionDone++;});page.on('request',r=>{
 const p=new URL(r.url()).pathname;if(p==='/api/account/home')c.home++;if(p==='/api/account/home/revision')c.revision++;if(p.endsWith('/organization/archived'))c.archive++;if(p==='/api/me')c.me++;if(p.endsWith('/frontend/run'))c.run++;if(p.includes('/components/')&&p.endsWith('/access'))c.access++;
 if(p==='/fixture/tool'){const n=r.postDataJSON().name;const k={read_account_home:'home',check_account_home:'revision',list_archived_items:'archive',run_component_frontend:'run',check_component_access:'access'}[n];if(k)c[k]++;}
 });return c;}
const tick=async(page,ms=30100)=>{await page.clock.fastForward(ms);await page.clock.runFor(120);};

for(const embedded of [false,true])test(`Idle Home checks metadata without rebuilding content or archives (${embedded?'embedded':'web'})`,async({page})=>{
 await page.clock.install();const c=counters(page),{root}=await openHome(page,embedded);await expect.poll(()=>c.archive).toBeGreaterThan(0);
 const start={...c};await tick(page);await expect.poll(()=>c.revisionDone).toBe(start.revisionDone+1);await page.clock.runFor(20);await tick(page);await expect.poll(()=>c.revisionDone).toBe(start.revisionDone+2);
 expect(c.home).toBe(start.home);expect(c.archive).toBe(start.archive);
 await burst(root);await page.clock.runFor(1200);await expect.poll(()=>c.home).toBe(start.home+1);await expect(root.getByRole(embedded?'button':'link',{name:'Open Simple app fixture',exact:true})).toBeVisible();
 expect(c.archive).toBe(start.archive,'unchanged metadata does not reload archive inventory');
 if(!embedded)expect(c.me).toBe(start.me+3,'two periodic checks and one merged return event');
});

test('Hidden pages pause automatic reads and return checks merge while requests are in flight',async({page})=>{
 await page.clock.install();let hold=false,release;const gate=new Promise(r=>release=r);
 await page.route('**/api/account/home',async route=>{if(hold)await gate;await route.continue();});
 await page.route('**/api/me',async route=>{if(hold)await gate;await route.continue();});
 const c=counters(page),{root}=await openHome(page);await expect.poll(()=>c.archive).toBeGreaterThan(0);const start={...c};
 await page.evaluate(()=>Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'}));await burst(root);await tick(page,60100);expect(c.home).toBe(start.home);expect(c.revision).toBe(start.revision);expect(c.me).toBe(start.me);
 await page.evaluate(()=>Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'visible'}));hold=true;await burst(root);await page.clock.runFor(120);await expect.poll(()=>c.home).toBe(start.home+1);await expect.poll(()=>c.me).toBe(start.me+1);
 await page.clock.runFor(1100);await burst(root);await page.clock.runFor(1200);expect(c.home).toBe(start.home+1);expect(c.me).toBe(start.me+1);
 release();await expect(root.getByRole('link',{name:'Open Simple app fixture',exact:true})).toBeVisible();
});

for(const embedded of [false,true])test(`Superseded Home searches cannot replace the current result (${embedded?'embedded':'web'})`,async({page})=>{
 const f=await(await page.request.get(base+'/fixture/apps')).json();let release,slowStarted=false,aborted=false;const gate=new Promise(r=>release=r);
 const response=name=>({projects:[],resources:[{id:f.appId,workspaceId:f.workspaceId,name,kind:'generic',source:'component',projectIds:[],description:'Search fixture',updatedAt:'2026-11-13T00:00:00Z'}],total:1,revision:'search-revision'});
 page.on('requestfailed',r=>{if(new URL(r.url()).pathname==='/api/account/home'&&r.postDataJSON()?.query==='slow')aborted=true;});
 await page.route(embedded?'**/fixture/tool':'**/api/account/home',async route=>{
  const body=route.request().postDataJSON();if(embedded&&body.name!=='read_account_home')return route.continue();const args=embedded?body.arguments:body;
  if(args.query==='slow'){slowStarted=true;await gate;}const result=response(args.query==='slow'?'Old result':args.query==='current'?'Current result':'Initial result');
  await route.fulfill({json:embedded?{content:[],structuredContent:{result}}:result}).catch(()=>{});
 });
 const {root}=await openHome(page,embedded);const search=root.getByPlaceholder('Search by name or description…');await search.fill('slow');await expect.poll(()=>slowStarted).toBe(true);await search.fill('current');
 await expect(root.getByRole(embedded?'button':'link',{name:'Open Current result',exact:true})).toBeVisible();release();if(!embedded)await expect.poll(()=>aborted).toBe(true);
await expect(root.getByRole(embedded?'button':'link',{name:'Open Old result',exact:true})).toHaveCount(0);await expect(root.getByRole(embedded?'button':'link',{name:'Open Current result',exact:true})).toBeVisible();
});

test('Changed metadata clears old Home content before a failed reload; retry restores permitted results',async({page})=>{
 await page.clock.install();const f=await(await page.request.get(base+'/fixture/apps')).json();let revision='before',fail=false,reads=0;
 const home=()=>({projects:[],resources:[{id:f.appId,workspaceId:f.workspaceId,name:revision==='before'?'Previously shared app':'Permitted app',kind:'generic',source:'component',projectIds:[],description:'Fixture',updatedAt:'2026-11-13T00:00:00Z'}],total:1,revision});
 await page.route('**/api/account/home',route=>{reads++;return fail?route.fulfill({status:503,json:{message:'Temporary reload failure'}}):route.fulfill({json:home()});});
 await page.route('**/api/account/home/revision',route=>route.fulfill({json:{revision}}));
 const {root}=await openHome(page);await expect(root.getByRole('link',{name:'Open Previously shared app',exact:true})).toBeVisible();revision='after';fail=true;await tick(page);
 await expect(root.getByRole('button',{name:'Retry loading',exact:true})).toBeVisible();await expect(root.getByRole('link',{name:'Open Previously shared app',exact:true})).toHaveCount(0);
 fail=false;await root.getByRole('button',{name:'Retry loading',exact:true}).click();await expect(root.getByRole('link',{name:'Open Permitted app',exact:true})).toBeVisible();expect(reads).toBe(3);
});

test('Transient check failures preserve Home; actual revocation clears it',async({page})=>{
 await page.clock.install();let status=503;
 await page.route('**/api/account/home/revision',route=>route.fulfill({status,json:{message:'Check failed'}}));
 const c=counters(page),{root}=await openHome(page);const card=root.getByRole('link',{name:'Open Simple app fixture',exact:true});await expect(card).toBeVisible();await tick(page);await expect.poll(()=>c.revision).toBe(1);await expect(card).toBeVisible();
 status=403;await tick(page);await expect(root.getByRole('button',{name:'Retry loading',exact:true})).toBeVisible();await expect(card).toHaveCount(0);
});

test('Account recheck failures retain the mounted app and draft; revoked sessions leave it',async({page})=>{
 await page.clock.install();const f=await(await page.request.get(base+'/fixture/apps')).json();let status=0;
 await page.route('**/api/me',route=>status?route.fulfill({status,json:{message:'Account check failed'}}):route.continue());
 await page.goto(base+f.url.replace('?', '/calculator?'));const frame=page.frameLocator('iframe[title="Saved frontend code"]');await frame.getByLabel('Draft note').fill('Keep this note');
 status=503;await burst(page);await page.clock.runFor(1200);await expect(frame.getByLabel('Draft note')).toHaveValue('Keep this note');
 status=401;await burst(page);await page.clock.runFor(1200);await expect(page.locator('iframe[title="Saved frontend code"]')).toHaveCount(0);
});

test('Open apps keep periodic access checks without automatic execution; explicit Refresh still executes',async({page})=>{
 await page.clock.install();const c=counters(page),f=await(await page.request.get(base+'/fixture/apps')).json();await page.goto(base+f.url);const frame=page.frameLocator('iframe[title="Saved frontend code"]');await expect(frame.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
 const before={...c};await tick(page);await expect.poll(()=>c.access).toBe(before.access+1);expect(c.run).toBe(before.run);expect(c.home).toBe(0);expect(c.revision).toBe(0);
 await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect.poll(()=>c.run).toBeGreaterThan(before.run);await expect(frame.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
});

test('An embedded host with an older tool catalog falls back to authorized Home reads',async({page})=>{
 await page.clock.install();await page.route('**/fixture/tool',route=>route.request().postDataJSON().name==='check_account_home'?route.fulfill({json:{isError:true,structuredContent:{error:{code:-32601}},content:[{type:'text',text:'Unknown tool check_account_home'}]}}):route.continue());
 const c=counters(page),{root}=await openHome(page,true);await expect.poll(()=>c.archive).toBeGreaterThan(0);const start=c.home;await tick(page);await expect.poll(()=>c.home).toBe(start+1);await expect(root.getByRole('button',{name:'Open Simple app fixture',exact:true})).toBeVisible();
});

test('A mounted embedded app pauses checks while its platform panel is hidden',async({page})=>{
 const call=async(name,args)=>{const r=await(await page.request.post(base+'/fixture/tool',{data:{name,arguments:args}})).json();if(r.isError)throw Error(JSON.stringify(r));return r.structuredContent.result;};
 const draft=await call('prepare_workspace_change',{operation:{kind:'save_component',content:{name:'Panel check fixture',format:'frontend-js',source:'return {html:\'<h1>Panel check</h1><label>Draft note<input aria-label="Draft note"></label>\'};'}}});
 const saved=await call('confirm_workspace_change',{previewId:draft.id,digest:draft.digest});
 await page.route('**/fixture/tool',route=>route.request().postDataJSON().name==='read_account_schema'?route.fulfill({json:{content:[],structuredContent:{result:{tables:[],nextOffset:null}}}}):route.continue());
 await page.clock.install();const c=counters(page),{root}=await openHome(page,true);await root.getByRole('button',{name:'Open Panel check fixture',exact:true}).click();const frame=root.frameLocator('iframe[title="Saved frontend code"]');
 await frame.getByLabel('Draft note').fill('Retain while in Database');
 await root.getByRole('button',{name:'Expand navigation',exact:true}).click();await root.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('button',{name:'Database',exact:true}).click();
 const before={...c};await tick(page);expect(c.access).toBe(before.access);expect(c.home).toBe(before.home);expect(c.run).toBe(before.run);
 await expect(frame.getByLabel('Draft note')).toHaveValue('Retain while in Database');
 const current=await call('read_project_component',{componentId:saved.id});const cleanup=await call('prepare_workspace_change',{operation:{kind:'archive_component',componentId:saved.id,expectedVersion:current.component.version,archived:true}});await call('confirm_workspace_change',{previewId:cleanup.id,digest:cleanup.digest});
});


test('An embedded viewer change clears the previous app even in the same workspace',async({page})=>{
 const {root,f}=await openHome(page,true);await root.getByRole('button',{name:'Open Simple app fixture',exact:true}).click();
 await expect(root.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
 await page.evaluate(r=>window.deliver(r),{screen:'home',workspaceId:f.workspaceId,viewerId:'different-account',workspaces:[],types:[]});
 await expect(root.getByRole('heading',{name:'Apps',exact:true})).toBeVisible();await expect(root.locator('iframe[title="Saved frontend code"]')).toHaveCount(0);
});
