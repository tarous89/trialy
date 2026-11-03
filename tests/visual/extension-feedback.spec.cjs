const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
const workspaceId='20000000-0000-4000-8000-000000000010';
const card={id:'20000000-0000-4000-8000-000000000001',workspaceId,name:'Feedback test app',description:'A saved app',kind:'tracker',source:'component',projectIds:[],updatedAt:'2026-11-03T10:00:00Z',canMove:true,placementVersion:0};
const project={id:'20000000-0000-4000-8000-000000000020',workspaceId,name:'Research project'};
test('Extension never flashes legacy tabs while account metadata is slow or fails',async({page})=>{
 let release;const gate=new Promise(resolve=>release=resolve);
 await page.route('**/fixture/tool',async route=>{
  const {name}=route.request().postDataJSON();
  if(name==='read_connected_account'){await gate;return route.fulfill({json:{isError:true,content:[{type:'text',text:'Temporary account metadata failure'}]}});}
  if(name==='read_account_home')return route.fulfill({json:{structuredContent:{result:{projects:[],resources:[card],total:1}}}});
  return route.continue();
 });
 await page.goto(base+'/?apps=1');await page.waitForFunction(()=>window.hostReady);
 const frame=page.frames().find(f=>f.url().endsWith('/embed'));
 await frame.evaluate(()=>{window.sawLegacyTabs=false;new MutationObserver(()=>{if(document.querySelector('.ty-type-filters'))window.sawLegacyTabs=true;}).observe(document.body,{childList:true,subtree:true});});
 await page.evaluate(workspaceId=>window.deliver({screen:'home',workspaceId,viewerId:'fixture',workspaces:[],types:[]}),workspaceId);
 const root=page.frameLocator('#app');await expect(root.getByRole('heading',{name:'Home',exact:true})).toBeVisible();
 await expect(root.locator('.ty-app-cover')).toHaveCount(1);expect(await frame.evaluate(()=>window.sawLegacyTabs)).toBe(false);
 release();await expect(root.getByRole('heading',{name:'Home',exact:true})).toBeVisible();
 await root.getByRole('button',{name:'Open navigation',exact:true}).click();await root.getByRole('button',{name:'New',exact:true}).click();
 await expect(root.getByRole('menuitem',{name:'App',exact:true})).toBeVisible();await expect(root.getByRole('menuitem',{name:'Dashboard',exact:true})).toHaveCount(0);
 expect(await frame.evaluate(()=>window.sawLegacyTabs)).toBe(false);
});

for(const embedded of [true,false])test(`Move feedback floats without layout shift and expires within 3 seconds (${embedded?'extension':'platform'})`,async({page})=>{
 await page.setViewportSize({width:1100,height:850});await page.clock.install();
 let resource={...card};const home=()=>({projects:[project],resources:[resource],total:1});
 await page.route('**/api/account/home',route=>route.fulfill({json:home()}));
 await page.route('**/fixture/tool',route=>{
  const {name,arguments:args}=route.request().postDataJSON();
  if(name==='read_account_home')return route.fulfill({json:{structuredContent:{result:home()}}});
  if(name==='move_tool'){resource={...resource,projectIds:[args.projectId],placementVersion:1};return route.fulfill({json:{structuredContent:{result:{version:1}}}});}
  return route.continue();
 });
 await page.route('**/tools/move',route=>{resource={...resource,projectIds:[project.id],placementVersion:1};return route.fulfill({json:{version:1}});});
 await page.goto(base+(embedded?'/?apps=1':'/app-home'));
 if(embedded){await page.waitForFunction(()=>window.hostReady);await page.evaluate(workspaceId=>window.deliver({screen:'home',workspaceId,viewerId:'fixture',workspaces:[],types:[]}),workspaceId);}
 const root=embedded?page.frameLocator('#app'):page;
 await expect(root.locator('.ty-resource--app')).toHaveCount(1);
 const heading=root.getByRole('heading',{name:'Home',exact:true}),before=await heading.boundingBox();
 await root.getByRole('button',{name:'Actions for Feedback test app'}).click();await root.getByRole('menuitem',{name:'Move to',exact:true}).click();await root.getByRole('menuitem',{name:'Research project',exact:true}).click();
 const notice=root.getByRole('status').filter({hasText:'Moved to Research project'});await expect(notice).toBeVisible();
 expect((await heading.boundingBox()).y).toBe(before.y);await expect(root.locator('.ty-system-notices')).toHaveCSS('position','fixed');
 const box=await notice.boundingBox();expect(box.x).toBeGreaterThan(600);expect(box.y+box.height).toBeGreaterThan(800);
 await page.clock.fastForward(2800);await expect(notice).toBeVisible();await page.clock.fastForward(200);await expect(notice).toHaveCount(0);
 expect((await heading.boundingBox()).y).toBe(before.y);
 const app=root.locator('.ty-resource--app');await app.hover();
 await expect(app).toHaveScreenshot(`hover-border-${embedded?'extension':'platform'}.png`);
 await app.getByRole('button',{name:'Actions for Feedback test app'}).click();await expect(root.getByRole('menuitem',{name:'Open',exact:true})).toBeVisible();await expect(root.getByRole('menuitem',{name:'Manage',exact:true})).toHaveCount(0);
});
