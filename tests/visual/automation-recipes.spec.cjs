const {test,expect,openPlatform}=require('./test.cjs');
const base='http://127.0.0.1:4179';
for(const width of [1440,900,390])test(`Concise recipe install approval preserves opt-out and cancel at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});const f=await(await page.request.get(base+'/fixture/apps')).json();let confirmed=null;
 const trigger={kind:'calendar',frequency:'weekly',anchor:'2026-11-01',time:'09:00',timeZone:'Europe/Berlin',interval:1,weekdays:[1],monthDay:1};
 const recipes=[{key:'research',name:'Research updates',description:'Find meaningful changes.',trigger,research:{instructions:'Use primary sources.'}},{key:'email',name:'Email findings',description:'Only meaningful findings are sent.',trigger:{kind:'after',recipe:'research',when:'meaningful'},email:{subject:'Update',text:'Review the update.'}}];
 await page.route('**/data-access/read',r=>r.fulfill({json:{app:'Runway',needed:true,tables:[],access:{people:[],assistants:[]},automations:recipes,automationRecipient:'owner@example.invalid',automationRunners:[],digest:'a'.repeat(64)}}));
 await page.route('**/data-access/confirm',r=>{confirmed=r.request().postDataJSON();return r.fulfill({json:{appId:f.appId,workspaceId:f.workspaceId,url:f.url,automationStatus:'pending'}});});
 await openPlatform(page,base+`/app-home?tab=templates&workspaceId=${f.workspaceId}`);
 const card=page.getByRole('region',{name:'App templates'}).locator('article').filter({has:page.getByRole('heading',{name:'Runway',exact:true})});
 await card.getByRole('button',{name:'Use',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Add Runway'});
 await expect(dialog.getByRole('checkbox',{name:/Research updates/})).toBeChecked();await expect(dialog.getByRole('checkbox',{name:/Email findings/})).toBeChecked();
 await page.screenshot({path:`/tmp/trialy-recipes-install-default-${width}.png`,fullPage:true});
 await expect(dialog.getByText('Use primary sources.')).toHaveCount(0);await dialog.getByRole('button',{name:'Edit',exact:true}).first().click();await dialog.getByLabel('Time',{exact:true}).fill('10:30');
 await dialog.getByRole('button',{name:'Cancel',exact:true}).click();expect(confirmed).toBeNull();
 await card.getByRole('button',{name:'Use',exact:true}).click();await dialog.getByRole('button',{name:'Edit',exact:true}).first().click();await expect(dialog.getByLabel('Time',{exact:true})).toHaveValue('09:00');
 await dialog.getByRole('checkbox',{name:/Email findings/}).uncheck();await dialog.getByLabel('Time',{exact:true}).fill('10:30');
 await expect(page.locator('body')).toHaveJSProperty('scrollWidth',width);expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await page.screenshot({path:`/tmp/trialy-recipes-install-${width}.png`,fullPage:true});
 await dialog.getByRole('button',{name:'Add app',exact:true}).click();await expect(page).toHaveURL(/\/apps\//);
 expect(confirmed.automations.find(x=>x.key==='email').enabled).toBe(false);expect(confirmed.automations.find(x=>x.key==='research').settings.trigger.time).toBe('10:30');
});

for(const width of [1440,900,390])test(`App features use a selected entry and the shared approval at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});const f=await(await page.request.get(base+'/fixture/apps')).json(),recordId='31000000-0000-4000-8000-000000000001';let prepared,approved;
 const recipe={key:'draft_update',name:'Scheduled draft',description:'Prepare this entry’s draft.',contextRole:'schedules',trigger:{kind:'record_date',role:'schedules',field:'due',offsetMinutes:0,time:'09:00',timeZone:'Europe/Berlin'},research:{objective:'Prepare a draft',instructions:'Use current app data.'}};
 await page.route('**/app-services/automations/features?*',r=>r.fulfill({json:{appId:f.appId,enabled:true,recipes:[recipe],runners:[],recipient:'owner@example.invalid',setups:[]}}));
 await page.route('**/app-services/automations/features/contexts?*',r=>r.fulfill({json:{rows:[{id:recordId,label:'December investor update'}],nextOffset:null}}));
 await page.route('**/app-services/automations/features/prepare',r=>{prepared=r.request().postDataJSON();return r.fulfill({json:{id:'feature-review',kind:'automation_recipe',digest:'b'.repeat(64),review:'exact review'}});});
 await page.route('**/app-services/reviews/feature-review/confirm',r=>{approved=r.request().postDataJSON();return r.fulfill({json:{status:'pending'}});});
 await openPlatform(page,base+`/app-home?tab=automations&workspaceId=${f.workspaceId}`);await page.getByRole('button',{name:'Add automation',exact:true}).click();await page.getByRole('button',{name:'From app features',exact:true}).click();
 await page.getByLabel('App',{exact:true}).selectOption(f.appId);await page.getByLabel('Feature',{exact:true}).selectOption('draft_update');await expect(page.getByRole('button',{name:'Set up automation'})).toBeDisabled();
 await page.getByLabel('App entry',{exact:true}).selectOption(recordId);await expect(page.locator('body')).toHaveJSProperty('scrollWidth',width);await page.screenshot({path:`/tmp/trialy-recipes-feature-${width}.png`,fullPage:true});
 const approval=page.waitForResponse(r=>r.url().endsWith('/app-services/reviews/feature-review/confirm')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Set up automation'}).click();await approval;await expect(page.getByRole('heading',{name:'From app features',exact:true})).toHaveCount(0);expect(prepared.contextRecordId).toBe(recordId);expect(approved).toEqual({digest:'b'.repeat(64),confirmed:true});
});
