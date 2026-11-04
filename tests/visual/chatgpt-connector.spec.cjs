const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
for(const width of [1440,390])test(`ChatGPT inline toggle lists dependencies and confirms interruption at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});const f=await(await page.request.get(base+'/fixture/apps')).json();
 const id='31000000-0000-4000-8000-000000000001';let enabled=true,version=0,readCount=0,controls=[];
 const automations=[{id:'research',kind:'research',name:'Friday research',appName:'Biotech tracker',enabled:true},{id:'email',kind:'action',name:'Research summary email',appName:'Biotech tracker',enabled:true},{id:'old',kind:'research',name:'Old research',appName:'Biotech tracker',enabled:false}];
 const status=()=>({id,version,enabled,state:enabled?'ready':'paused',automations,impactDigest:'impact-'+version});
 await page.route('**/app-services/automations/connector',route=>{readCount++;return route.fulfill({json:status()});});
 await page.route(`**/app-services/automations/${id}/control`,route=>{const body=route.request().postDataJSON();controls.push(body);enabled=body.enabled;version++;return route.fulfill({json:{id,enabled}});});
 await page.goto(base+`/app-home?tab=access&workspaceId=${f.workspaceId}`);expect(readCount).toBe(0);
 await page.goto(base+`/app-home?tab=connectors&workspaceId=${f.workspaceId}&connectionId=chatgpt`);
 const card=page.getByRole('region',{name:'ChatGPT connector'});
 await expect(page.getByRole('heading',{name:'Connectors',exact:true})).toBeVisible();await expect(card.getByRole('button')).toHaveCount(1);await expect(card.getByRole('button',{name:'Disable',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Open ChatGPT'})).toHaveCount(0);await expect(page.getByLabel('Daily check',{exact:true})).toHaveCount(0);await expect(page.getByLabel('Timezone',{exact:true})).toHaveCount(0);
 await expect(card.getByText('Friday research',{exact:true})).toBeVisible();await expect(card.getByText('Research summary email',{exact:true})).toBeVisible();await expect(card.getByText('Old research',{exact:true})).toBeVisible();
 await card.getByRole('button',{name:'Disable',exact:true}).click();const dialog=page.getByRole('alertdialog');await expect(dialog).toBeVisible();await expect(dialog.getByText('Friday research',{exact:true})).toBeVisible();await expect(dialog.getByText('Research summary email',{exact:true})).toBeVisible();await expect(dialog.getByText('Old research',{exact:true})).toHaveCount(0);expect(controls).toHaveLength(0);await page.screenshot({path:`/tmp/trialy-connector-confirm-${width}.png`,fullPage:true});
 await dialog.getByRole('button',{name:'Cancel'}).click();await expect(dialog).toHaveCount(0);expect(enabled).toBe(true);
 await card.getByRole('button',{name:'Disable',exact:true}).click();await dialog.getByRole('button',{name:'Disable ChatGPT',exact:true}).click();await expect(card.getByRole('button',{name:'Enable',exact:true})).toBeVisible();expect(controls[0]).toEqual({enabled:false,expectedVersion:0,confirmed:true,impactDigest:'impact-0'});
 await card.getByRole('button',{name:'Enable',exact:true}).click();await expect(card.getByRole('button',{name:'Disable',exact:true})).toBeVisible();expect(controls[1]).toEqual({enabled:true,expectedVersion:1});await expect(dialog).toHaveCount(0);
 await expect(page.locator('body')).toHaveJSProperty('scrollWidth',width);await expect(page.locator('html')).toHaveJSProperty('scrollWidth',width);await page.screenshot({path:`/tmp/trialy-chatgpt-connector-${width}.png`,fullPage:true});
 await page.getByLabel('Search connectors').fill('unmatched');await expect(card).toHaveCount(0);
});
test('Changed dependencies are redisplayed and require another explicit disable confirmation',async({page})=>{
 const f=await(await page.request.get(base+'/fixture/apps')).json(),id='31000000-0000-4000-8000-000000000001';let changed=false,enabled=true,calls=0;
 await page.route('**/app-services/automations/connector',route=>route.fulfill({json:{id,version:0,enabled,state:enabled?'ready':'paused',impactDigest:changed?'new':'old',automations:changed?[{id:'new',name:'New email follow-up',enabled:true,appName:'Tracker'}]:[]}}));
 await page.route(`**/app-services/automations/${id}/control`,route=>{calls++;if(calls===1){changed=true;return route.fulfill({status:409,json:{message:'Impact changed'}});}expect(route.request().postDataJSON().impactDigest).toBe('new');enabled=false;return route.fulfill({json:{enabled}});});
 await page.goto(base+`/app-home?tab=connectors&workspaceId=${f.workspaceId}`);await page.getByRole('region',{name:'ChatGPT connector'}).getByRole('button',{name:'Disable',exact:true}).click();
 const dialog=page.getByRole('alertdialog');await expect(dialog).toContainText('No enabled automations');await dialog.getByRole('button',{name:'Disable ChatGPT'}).click();await expect(dialog.getByRole('alert')).toContainText('Review the current list');await expect(dialog).toContainText('New email follow-up');expect(calls).toBe(1);expect(enabled).toBe(true);
 await page.screenshot({path:'/tmp/trialy-connector-impact.png',fullPage:true});await dialog.getByRole('button',{name:'Disable ChatGPT'}).click();await expect(dialog).toHaveCount(0);expect(calls).toBe(2);
});
test('First enable uses default connection settings without a schedule form or false ready claim',async({page})=>{
 const f=await(await page.request.get(base+'/fixture/apps')).json();let enabled=false;
 await page.route('**/app-services/automations/connector',route=>route.fulfill({json:{enabled,state:enabled?'awaiting_subscription':'not_enabled',automations:[],impactDigest:'empty'}}));
 await page.route('**/app-services/automations/prepare',route=>{const body=route.request().postDataJSON();expect(Object.keys(body.preferences)).toEqual(['timeZone']);return route.fulfill({json:{id:'setup',digest:'digest'}});});
 await page.route('**/app-services/reviews/setup/confirm',route=>{enabled=true;return route.fulfill({json:{saved:true}});});
 await page.goto(base+`/app-home?tab=connectors&workspaceId=${f.workspaceId}`);const card=page.getByRole('region',{name:'ChatGPT connector'});await card.getByRole('button',{name:'Enable',exact:true}).click();await expect(card.getByRole('button',{name:'Stop setup',exact:true})).toBeVisible();await expect(card).toContainText('Finish connecting in ChatGPT');await expect(card.locator('.ty-connector-card-heading .ty-automation-state')).toHaveText('Disabled');await expect(card.getByRole('button',{name:'Copy connection request'})).toBeVisible();await expect(card.locator('input')).toHaveCount(0);
});
