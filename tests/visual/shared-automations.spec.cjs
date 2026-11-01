const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
for(const width of [1440,390])test(`Automation failure and setup never replace a running app at ${width}px`,async({page,context})=>{
 await page.setViewportSize({width,height:1000});const f=await(await page.request.get(base+'/fixture/apps')).json();
 const live=await context.newPage();await live.setViewportSize({width,height:1000});await live.goto(base+f.url);
 const frame=live.frameLocator('iframe[title="Saved frontend code"]');await frame.getByRole('link',{name:'Calculator',exact:true}).click();await frame.getByLabel('Draft note').fill('Keep my unsaved note');
 let setupRequests=0;await page.route('**/app-services/automations',route=>{setupRequests++;return route.fulfill({status:503,json:{message:'Synthetic scheduler failure'}});});
 await page.route('**/app-services/automations/definitions?*',route=>route.fulfill({status:503,json:{message:'Definitions unavailable'}}));
 await page.goto(base+`/app-home?tab=apps&workspaceId=${f.workspaceId}&serviceApp=${f.appId}`);
 await page.getByRole('button',{name:'Manage app automations'}).click();await expect(page.getByRole('status')).toContainText('Automations could not be loaded');
 await expect(frame.getByLabel('Draft note')).toHaveValue('Keep my unsaved note');await expect(live.getByRole('alert')).toHaveCount(0);await expect(live.getByText('Synthetic scheduler failure')).toHaveCount(0);
 await page.unroute('**/app-services/automations/definitions?*');await page.route('**/app-services/automations/definitions?*',route=>route.fulfill({json:{rows:[],nextOffset:null}}));await page.getByRole('button',{name:'Retry',exact:true}).click();
 await expect(page.getByText('No automations configured.')).toBeVisible();expect(setupRequests).toBe(0);await expect(page.getByRole('button',{name:'Review background setup'})).toHaveCount(0);
 await expect(page.locator('body')).toHaveJSProperty('scrollWidth',width);await page.screenshot({path:`/tmp/trialy-automation-empty-${width}.png`,fullPage:true});
 await frame.getByLabel('Quantity',{exact:true}).fill('7');await frame.getByLabel('Rate',{exact:true}).fill('3');await frame.getByRole('button',{name:'Calculate',exact:true}).click();await expect(frame.getByText('Total: 21',{exact:true})).toBeVisible();await live.close();
});

test('Quiet failed automation tool output does not replace the extension or its unsaved input',async({page})=>{
 const f=await(await page.request.get(base+'/fixture/apps')).json();await page.goto(base+'/?apps=1');await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),await(await page.request.get(base+'/fixture/app-display?appId='+f.appId+'&path=/calculator')).json());
 const root=page.frameLocator('#app'),frame=root.frameLocator('iframe[title="Saved frontend code"]');await frame.getByLabel('Draft note').fill('Still working');
 await page.evaluate(()=>document.getElementById('app').contentWindow.postMessage({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{isError:true,content:[{type:'text',text:'Synthetic automation failure'}],structuredContent:{error:{status:503,code:'automation_background_unavailable'}}}},'*'));
 await expect(frame.getByLabel('Draft note')).toHaveValue('Still working');await expect(root.getByText('Synthetic automation failure')).toHaveCount(0);await expect(root.getByRole('alert')).toHaveCount(0);
});
