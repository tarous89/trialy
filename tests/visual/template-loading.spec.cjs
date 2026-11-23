const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
// Loading speed session L3 (docs/scopes/LOADING_SPEED_2026-11-22.md): templates on the website and in the plugin widget.
const deferred=()=>{let release;const promise=new Promise(r=>release=r);return {promise,release};};
const bar=root=>root.getByRole('progressbar',{name:'Working',exact:true});
const toolName=request=>{try{return new URL(request.url()).pathname==='/fixture/tool'?request.postDataJSON().name:undefined;}catch{return undefined;}};
async function openEmbedded(page){
 const f=await(await page.request.get(base+'/fixture/apps')).json();
 await page.goto(base+'/?apps=1');await page.waitForFunction(()=>window.hostReady);
 await page.evaluate(workspaceId=>window.deliver({screen:'home',workspaceId,viewerId:'fixture',workspaces:[],types:[]}),f.workspaceId);
 return page.frameLocator('#app');
}

test('website: card images at card size; a hovered card prepares its preview, which then opens from the browser cache',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 const cdp=await page.context().newCDPSession(page);await cdp.send('Network.enable');
 const previews=[];cdp.on('Network.responseReceived',e=>{if(/\/api\/app-templates\/[^/]+\/[^/]+\/preview/.test(e.response.url))previews.push({url:e.response.url,cached:e.response.fromDiskCache||e.response.fromPrefetchCache||false,type:e.type});});
 cdp.on('Network.requestServedFromCache',e=>previews.push({id:e.requestId,cached:true}));
 await page.goto(base+'/app-home?tab=templates');
 const catalog=page.getByRole('region',{name:'App templates'});await expect(catalog.locator('article')).toHaveCount(16);
 const card=catalog.locator('article').filter({has:page.getByRole('heading',{name:'Runway',exact:true})});
 await card.scrollIntoViewIfNeeded();await page.mouse.move(0,0);await expect(card.locator('img')).toHaveJSProperty('naturalWidth',720);await expect(card.locator('img')).toHaveAttribute('src',/\/card\?d=[a-f0-9]{64}$/);
 await card.hover();await expect.poll(()=>previews.filter(p=>p.url&&!p.cached).length).toBe(1);
 await card.getByRole('button',{name:'Preview',exact:true}).click();
 await expect(page.frameLocator('iframe[title="Runway interactive preview"]').locator('body')).toContainText('Runway');
 // The preview frame did not go back to the server: it was served from the cache the hover filled.
 expect(previews.filter(p=>p.url&&!p.cached).length).toBe(1);
 expect(previews.some(p=>p.cached)).toBe(true);
});

test('plugin: card images the host does not load directly come in one batched request, quietly',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 const gate=deferred(),calls=[];
 // This host refuses images from the platform origin (as a host without resource domains would).
 await page.route(/\/template-cards\//,route=>route.abort('blockedbyclient'));
 await page.route('**/fixture/tool',async route=>{const name=toolName(route.request());calls.push({name,args:route.request().postDataJSON().arguments});if(name==='read_app_template_cards')await gate.promise;await route.continue();});
 const root=await openEmbedded(page);
 await root.getByRole('link',{name:'Browse app templates',exact:true}).click();
 const catalog=root.getByRole('region',{name:'App templates'});await expect(catalog.locator('article')).toHaveCount(16);
 // The fixture's platform origin does not serve images, so every card falls back to the batched read; the list is the main
 // content and the cards are shown while their images are still loading, without the loading bar (rule I).
 await expect.poll(()=>calls.filter(c=>c.name==='read_app_template_cards').length).toBeGreaterThan(0);
 await page.waitForTimeout(300);await expect(bar(root)).toHaveCount(0);
 const batches=calls.filter(c=>c.name==='read_app_template_cards'),cards=batches.reduce((n,c)=>n+c.args.items.length,0);
 expect(batches.length).toBeLessThanOrEqual(Math.ceil(cards/12));expect(cards).toBeLessThanOrEqual(16);
 expect(calls.filter(c=>c.name==='read_app_template_media'&&c.args.kind!=='preview')).toHaveLength(0);
 gate.release();
 const first=catalog.locator('article').first().locator('img');
 await expect(first).toHaveAttribute('src',/^data:image\/jpeg;base64,/);await expect(first).toHaveJSProperty('naturalWidth',720);
 await expect(bar(root)).toHaveCount(0);
 // Hover prepares the preview once; opening it then needs no further request.
 const card=catalog.locator('article').filter({has:root.getByRole('heading',{name:'Runway',exact:true})});
 await card.hover();await expect.poll(()=>calls.filter(c=>c.name==='read_app_template_media'&&c.args.kind==='preview'&&c.args.templateId==='life.cash-runway').length).toBe(1);
 await card.getByRole('button',{name:'Preview',exact:true}).click();
 await expect(root.frameLocator('iframe[title="Runway interactive preview"]').getByRole('heading',{name:'Runway',exact:true})).toBeVisible();
 expect(calls.filter(c=>c.name==='read_app_template_media'&&c.args.kind==='preview'&&c.args.templateId==='life.cash-runway')).toHaveLength(1);
 await root.getByRole('dialog',{name:'Runway preview'}).getByRole('button',{name:'Close preview'}).click();
 // L3.1: returning to the templates shows them at once and checks the catalog fingerprint quietly; nothing is re-sent.
 const lists=()=>calls.filter(c=>c.name==='list_app_templates');expect(lists()).toHaveLength(1);
 await root.getByRole('button',{name:'Apps',exact:true}).click();await root.getByRole('link',{name:'Browse app templates',exact:true}).click();
 await expect(catalog.locator('article')).toHaveCount(16);await expect.poll(()=>lists().length).toBe(2);
 expect(lists()[1].args.catalog).toMatch(/^[a-f0-9]{32}$/);await expect(bar(root)).toHaveCount(0);
});

test('plugin: where the host allows images from the platform origin, cards load directly with no tool request',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 const calls=[];page.on('request',r=>{const name=toolName(r);if(name)calls.push(name+':'+(r.postDataJSON().arguments?.kind??''));});
 // The widget's platform origin in this build is not the fixture's; serve its card addresses from the fixture.
 await page.route(/\/template-cards\//,async route=>{const url=new URL(route.request().url());if(url.origin===base)return route.continue();const response=await page.request.get(base+url.pathname);await route.fulfill({response});});
 const root=await openEmbedded(page);await root.getByRole('link',{name:'Browse app templates',exact:true}).click();
 const catalog=root.getByRole('region',{name:'App templates'});await expect(catalog.locator('article')).toHaveCount(16);
 const first=catalog.locator('article').first().locator('img');
 await expect(first).toHaveAttribute('src',/\/template-cards\/chatgpt\/[^/]+\/[^/]+\/[a-f0-9]{64}\.jpg$/);await expect(first).toHaveJSProperty('naturalWidth',720);
 expect(calls.filter(n=>n.startsWith('read_app_template_cards')||n==='read_app_template_media:card')).toHaveLength(0);
});
