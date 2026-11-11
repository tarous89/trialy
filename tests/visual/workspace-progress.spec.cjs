const {test,expect,openPlatform}=require('./test.cjs');
for(const width of [1920,900,390])test(`Loading stays inside the workspace at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 const f=await(await page.request.get('http://127.0.0.1:4179/fixture/apps')).json();
 let release;
 const wait=new Promise(resolve=>release=resolve);
 await page.route(/\/app-services\/automations\/definitions(?:\?.*)?$/,async route=>{await wait;await route.fulfill({json:{rows:[],nextOffset:null}});});
 await openPlatform(page,`http://127.0.0.1:4179/app-home?tab=automations&workspaceId=${f.workspaceId}`);
 const bar=page.getByRole('progressbar',{name:'Working'}),column=page.locator('.ty-main-column');
 await expect(bar).toBeVisible();
 for(let i=0;i<2;i++){
  const b=await bar.boundingBox(),m=await column.boundingBox();
  expect(b.x).toBe(m.x);expect(b.width).toBe(m.width);expect(b.y).toBe(60);
  await page.locator('.ty-shell-toggle').click();
 }
 await expect(bar).toHaveCSS('background-color','rgb(38, 75, 60)');
 release();await expect(bar).toHaveCount(0);
});
