const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
// Loading speed session L4 (docs/scopes/LOADING_SPEED_2026-11-22.md): the widget's second part (L4.5) and last known
// basics (L4.1). Background downloads and checks are held open here; the loading bar must stay hidden while they run.
const deferred=()=>{let release;const promise=new Promise(r=>release=r);return {promise,release};};
const bar=root=>root.getByRole('progressbar',{name:'Working',exact:true});
const toolName=request=>{try{return new URL(request.url()).pathname==='/fixture/tool'?request.postDataJSON().name:undefined;}catch{return undefined;}};
const partState=root=>root.locator('body').evaluate(()=>window.__trialyLatePart);
async function openEmbedded(page){
 const f=await(await page.request.get(base+'/fixture/apps')).json();
 await page.goto(base+'/?apps=1');await page.waitForFunction(()=>window.hostReady);
 await page.evaluate(workspaceId=>window.deliver({screen:'home',workspaceId,viewerId:'fixture',workspaces:[],types:[]}),f.workspaceId);
 const root=page.frameLocator('#app');
 await expect(root.getByRole('button',{name:'Open Simple app fixture',exact:true})).toBeVisible();
 return root;
}
// The widget's platform origin in this build is not the fixture's; its second part is served from the fixture.
const fromFixture=page=>async route=>{const url=new URL(route.request().url());const response=await page.request.get(base+url.pathname);await route.fulfill({response});};

test('widget: the second part is one quiet download from the platform origin; a page opened before it shows its frame',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 const gate=deferred(),tools=[];let downloads=0;
 page.on('request',r=>{const name=toolName(r);if(name)tools.push(name);});
 await page.route(/\/widget-parts\//,async route=>{downloads++;await gate.promise;await fromFixture(page)(route);});
 const root=await openEmbedded(page);
 // Started right after the first screen, without being asked for and without the loading bar.
 await expect.poll(()=>downloads).toBe(1);await page.waitForTimeout(300);await expect(bar(root)).toHaveCount(0);
 await root.getByRole('link',{name:'Browse app templates',exact:true}).click();
 // The page's frame at once; it fills in when the download arrives, which is not started again.
 await expect(root.getByRole('heading',{name:'App templates',exact:true})).toBeVisible();
 await expect(root.getByLabel('Loading App templates',{exact:true})).toBeVisible();
 await page.waitForTimeout(300);await expect(bar(root)).toHaveCount(0);expect(downloads).toBe(1);
 gate.release();
 await expect(root.getByRole('region',{name:'App templates'}).locator('article')).toHaveCount(16);
 expect(await partState(root)).toBe('ready:origin');
 expect(downloads).toBe(1);expect(tools.filter(n=>n==='read_widget_part')).toHaveLength(0);
});

test('widget: where the host refuses the platform origin, the second part comes through the assistant, quietly',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 const gate=deferred();let reads=0;
 await page.route(/\/widget-parts\//,route=>route.abort('blockedbyclient'));
 await page.route('**/fixture/tool',async route=>{if(toolName(route.request())==='read_widget_part'){reads++;await gate.promise;}await route.continue();});
 const root=await openEmbedded(page);
 await expect.poll(()=>reads).toBe(1);await page.waitForTimeout(300);await expect(bar(root)).toHaveCount(0);
 await root.getByRole('link',{name:'Browse app templates',exact:true}).click();
 await expect(root.getByRole('heading',{name:'App templates',exact:true})).toBeVisible();
 await page.waitForTimeout(300);await expect(bar(root)).toHaveCount(0);
 gate.release();
 await expect(root.getByRole('region',{name:'App templates'}).locator('article')).toHaveCount(16);
 expect(await partState(root)).toBe('ready:assistant');expect(reads).toBe(1);
});

test('widget: when both ways fail, a page of the second part offers Retry, and Retry loads it',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 let allow=false;
 await page.route(/\/widget-parts\//,route=>allow?fromFixture(page)(route):route.abort('blockedbyclient'));
 await page.route('**/fixture/tool',async route=>{if(toolName(route.request())==='read_widget_part'&&!allow)return route.fulfill({json:{isError:true,content:[{type:'text',text:'Unavailable'}]}});await route.continue();});
 const root=await openEmbedded(page);
 await expect.poll(()=>partState(root)).toBe('failed');await expect(bar(root)).toHaveCount(0);
 // The first screen is unaffected.
 await expect(root.getByRole('button',{name:'Open Simple app fixture',exact:true})).toBeVisible();
 await root.getByRole('link',{name:'Browse app templates',exact:true}).click();
 await expect(root.getByRole('heading',{name:'App templates',exact:true})).toBeVisible();
 await expect(root.getByText('This page could not be loaded.',{exact:true})).toBeVisible();
 allow=true;await root.getByRole('button',{name:'Retry',exact:true}).click();
 await expect(root.getByRole('region',{name:'App templates'}).locator('article')).toHaveCount(16);
 expect(await partState(root)).toBe('ready:origin');
});

test('website: a return visit shows the last known Apps home at once and checks it quietly',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(base+'/app-home');
 const card=page.getByRole('link',{name:'Open Simple app fixture',exact:true});
 await expect(card).toBeVisible();await expect(bar(page)).toHaveCount(0);
 const stored=await page.evaluate(()=>localStorage.getItem('trialy-last-known:v1'));
 expect(stored).toContain('Simple app fixture');expect(stored).not.toContain('snapshot');
 const gate=deferred();let reads=0;
 await page.route('**/api/account/home*',async route=>{if(new URL(route.request().url()).pathname==='/api/account/home'){reads++;await gate.promise;}await route.continue();});
 await page.reload();
 // The cards (and the archived count with them) are shown from the last known basics while the read is held open.
 await expect(card).toBeVisible();await expect(page.getByRole('status').filter({hasText:'Checking for changes…'})).toBeVisible();
 await expect.poll(()=>reads).toBeGreaterThan(0);await page.waitForTimeout(300);await expect(bar(page)).toHaveCount(0);
 if(process.env.L4_SHOT)await page.screenshot({path:process.env.L4_SHOT});
 gate.release();
 await expect(page.getByText('Checking for changes…',{exact:true})).toHaveCount(0);await expect(card).toBeVisible();await expect(bar(page)).toHaveCount(0);
});

test('website: a return visit to an app shows its last known name at once while it opens',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 const f=await(await page.request.get(base+'/fixture/apps')).json();
 await page.goto(base+f.url);
 await expect(page.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
 const gate=deferred();
 await page.route('**/api/apps/resolve*',async route=>{await gate.promise;await route.continue();});
 await page.reload();
 await expect(page.getByRole('heading',{name:'Simple app fixture',exact:true})).toBeVisible();
 await expect(page.getByLabel('Loading app',{exact:true})).toBeVisible();
 gate.release();
 await expect(page.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
});
