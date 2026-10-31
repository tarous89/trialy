const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
for(const width of [1440,390])test(`Automation failure and setup never replace a running app at ${width}px`,async({page,context})=>{
 await page.setViewportSize({width,height:1000});const f=await(await page.request.get(base+'/fixture/apps')).json();
 const live=await context.newPage();await live.setViewportSize({width,height:1000});await live.goto(base+f.url);
 const frame=live.frameLocator('iframe[title="Saved frontend code"]');await frame.getByRole('link',{name:'Calculator',exact:true}).click();await frame.getByLabel('Draft note').fill('Keep my unsaved note');
 let automationRequests=0;await page.route('**/app-services/automations',route=>{automationRequests++;return route.fulfill({status:503,json:{message:'Synthetic scheduler failure'}});});
 await page.goto(base+`/app-home?tab=apps&workspaceId=${f.workspaceId}&serviceApp=${f.appId}`);expect(automationRequests).toBe(0);
 await page.locator('summary').filter({hasText:'Automations',exact:true}).click();await expect(page.getByRole('status')).toContainText('Background settings are temporarily unavailable');
 await expect(frame.getByLabel('Draft note')).toHaveValue('Keep my unsaved note');await expect(live.getByRole('alert')).toHaveCount(0);await expect(live.getByText('Synthetic scheduler failure')).toHaveCount(0);
 await page.unroute('**/app-services/automations');await page.getByRole('button',{name:'Refresh automation status'}).click();
 await page.getByLabel('Timezone',{exact:true}).fill('Europe/Berlin');await page.getByLabel('Daily check',{exact:true}).fill('06:00');await page.getByRole('button',{name:'Review background setup'}).click();await page.getByRole('button',{name:'Approve background setup'}).click();
 await expect(page.getByRole('heading',{name:'Background preferences saved'})).toBeVisible();await expect(page.getByRole('status')).toContainText('Return to ChatGPT');await expect(frame.getByLabel('Draft note')).toHaveValue('Keep my unsaved note');
 await expect(page.locator('body')).toHaveJSProperty('scrollWidth',width);await page.screenshot({path:`/tmp/trialy-automation-setup-${width}.png`,fullPage:true});
 await page.getByRole('button',{name:'Back to automation settings'}).click();await expect(page.getByText('Finish connection in ChatGPT',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Pause ChatGPT work'}).click();await expect(page.getByText('Paused',{exact:true})).toBeVisible();
 await frame.getByLabel('Quantity',{exact:true}).fill('7');await frame.getByLabel('Rate',{exact:true}).fill('3');await frame.getByRole('button',{name:'Calculate',exact:true}).click();await expect(frame.getByText('Total: 21',{exact:true})).toBeVisible();await live.close();
});

test('Quiet failed automation tool output does not replace the extension or its unsaved input',async({page})=>{
 const f=await(await page.request.get(base+'/fixture/apps')).json();await page.goto(base+'/?apps=1');await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),await(await page.request.get(base+'/fixture/app-display?appId='+f.appId+'&path=/calculator')).json());
 const root=page.frameLocator('#app'),frame=root.frameLocator('iframe[title="Saved frontend code"]');await frame.getByLabel('Draft note').fill('Still working');
 await page.evaluate(()=>document.getElementById('app').contentWindow.postMessage({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{isError:true,content:[{type:'text',text:'Synthetic automation failure'}],structuredContent:{error:{status:503,code:'automation_background_unavailable'}}}},'*'));
 await expect(frame.getByLabel('Draft note')).toHaveValue('Still working');await expect(root.getByText('Synthetic automation failure')).toHaveCount(0);await expect(root.getByRole('alert')).toHaveCount(0);
});
