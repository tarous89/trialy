const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
for(const width of [1440,390])test(`ChatGPT connection belongs in Connectors and preserves connection controls at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});const f=await(await page.request.get(base+'/fixture/apps')).json();
 const id='31000000-0000-4000-8000-000000000001';let enabled=true,readCount=0;
 await page.route('**/app-services/automations',route=>{readCount++;return route.fulfill({json:{id,version:0,enabled,state:enabled?'ready':'paused',subscription:{id},preferences:{time:'06:00',timeZone:'Europe/Berlin',emptyChecks:true}}});});
 await page.route(`**/app-services/automations/${id}/control`,route=>{enabled=route.request().postDataJSON().enabled;return route.fulfill({json:{id,enabled}});});
 await page.goto(base+`/app-home?tab=access&workspaceId=${f.workspaceId}`);
 await expect(page.getByRole('region',{name:'ChatGPT connection'})).toHaveCount(0);await expect(page.getByText('Review background setup',{exact:true})).toHaveCount(0);expect(readCount).toBe(0);
 await page.goto(base+`/app-home?tab=connectors&workspaceId=${f.workspaceId}`);
 await expect(page.getByRole('heading',{name:'Connectors',exact:true})).toBeVisible();await expect(page.getByText('ChatGPT connection verified',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Open ChatGPT',exact:true}).click();await expect(page.getByRole('heading',{name:'ChatGPT',exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'ChatGPT connection'})).toBeVisible();await expect(page.getByLabel('Daily check',{exact:true})).toHaveValue('06:00');await expect(page.getByLabel('Timezone',{exact:true})).toHaveValue('Europe/Berlin');
 await page.getByRole('button',{name:'Pause ChatGPT work',exact:true}).click();await expect(page.getByText('ChatGPT connection paused',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Resume ChatGPT work',exact:true}).click();await expect(page.getByText('ChatGPT connection verified',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Disconnect ChatGPT work',exact:true})).toBeVisible();await expect(page.locator('body')).toHaveJSProperty('scrollWidth',width);
 await page.screenshot({path:`/tmp/trialy-chatgpt-connector-${width}.png`,fullPage:true});
 await page.getByRole('button',{name:'Close',exact:true}).click();await expect(page.getByRole('heading',{name:'Connectors',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Open ChatGPT',exact:true})).toBeVisible();
 await page.getByLabel('Search connectors').fill('unmatched');await expect(page.getByRole('button',{name:'Open ChatGPT',exact:true})).toHaveCount(0);
});
