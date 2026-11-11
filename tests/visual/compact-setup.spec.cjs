const {test,expect,openPlatform}=require('./test.cjs');
const base='http://127.0.0.1:4179';
const tables=[{id:'companies',name:'Companies',fields:[{key:'status',name:'Status',kind:'text'},{key:'budget',name:'Budget',kind:'money'}]},{id:'tasks',name:'Tasks',fields:[{key:'done',name:'Done',kind:'boolean'}]}];
for(const width of [1920,900,390])test(`Compact database trigger cascades, preserves types and fits at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});const f=await(await page.request.get(base+'/fixture/apps')).json();let submitted;
 await page.route(/\/app-services\/automations(?:\?.*)?$/,r=>r.fulfill({json:{id:'runner',state:'ready'}}));
 await page.route('**/app-services/automations/options?*',r=>r.fulfill({json:{owner:{email:'owner@example.invalid'},members:[],tables,writeScopes:[]}}));
 await page.route('**/app-services/monitoring/prepare',r=>{submitted=r.request().postDataJSON();return r.fulfill({status:503,json:{message:'Draft retained'}});});
 await openPlatform(page,base+`/app-home?tab=automations&automationMode=new&workspaceId=${f.workspaceId}`);
 await page.getByLabel('Linked app',{exact:true}).selectOption(f.appId);await page.getByLabel('Name',{exact:true}).fill('Watch budgets');await page.getByRole('button',{name:'Continue to trigger'}).click();
 await expect(page.getByRole('button',{name:'Back to automations'})).toHaveCount(0);
 const title=await page.getByRole('heading',{name:'New automation',exact:true}).boundingBox(),actions=await page.locator('.ty-page-actions').boundingBox();expect(actions.y-title.y).toBeLessThan(10);
 await page.getByLabel('Trigger',{exact:true}).selectOption('database');await expect(page.getByLabel('Column',{exact:true})).toBeDisabled();await expect(page.getByLabel('Change',{exact:true})).toBeDisabled();
 await page.getByLabel('Table',{exact:true}).selectOption('companies');await expect(page.getByLabel('Column',{exact:true})).toHaveValue('');await expect(page.getByLabel('Change',{exact:true})).toHaveValue('any');
 await finish(page);await page.getByRole('button',{name:'Review changes',exact:true}).click();await expect.poll(()=>submitted?.config.automation.trigger).toEqual({kind:'database',typeId:'companies',fields:[],events:['created','updated','deleted']});
 await page.locator('#automation-step-1>.ty-step-heading').click();await page.getByLabel('Column',{exact:true}).selectOption('budget');await page.getByLabel('Change',{exact:true}).selectOption('condition');await page.getByLabel('Value',{exact:true}).fill('12000');await finish(page);await page.getByRole('button',{name:'Review changes',exact:true}).click();await expect.poll(()=>submitted?.config.automation.trigger.becomes).toEqual({field:'budget',operator:'equals',value:12000});
 await page.locator('#automation-step-1>.ty-step-heading').click();if(width>=900){const boxes=await Promise.all(['Table','Column','Change'].map(label=>page.getByLabel(label,{exact:true}).boundingBox()));expect(Math.max(...boxes.map(b=>b.y))-Math.min(...boxes.map(b=>b.y))).toBeLessThan(2);}
 await page.getByLabel('Table',{exact:true}).selectOption('tasks');await expect(page.getByLabel('Column',{exact:true})).toHaveValue('');await expect(page.getByLabel('Value',{exact:true})).toHaveCount(0);await expect(page.getByLabel('Column',{exact:true}).locator('option')).toHaveText(['Any column','Done']);
 await page.getByLabel('Column',{exact:true}).selectOption('done');await page.getByLabel('Change',{exact:true}).selectOption('condition');await page.getByLabel('Value',{exact:true}).selectOption('true');await finish(page);await page.getByRole('button',{name:'Review changes',exact:true}).click();await expect.poll(()=>submitted?.config.automation.trigger.becomes.value).toBe(true);
 await expect(page.locator('body')).toHaveJSProperty('scrollWidth',width);await page.locator('#ty-main').evaluate(el=>el.scrollTop=0);await page.screenshot({path:`/tmp/compact-database-${width}.png`});
 await page.locator('#automation-step-1>.ty-step-heading').click();await page.getByLabel('Trigger',{exact:true}).selectOption('recurrent');await page.getByLabel('Frequency',{exact:true}).selectOption('weekly');await page.getByLabel('Monday',{exact:true}).check();await page.locator('#ty-main').evaluate(el=>el.scrollTop=0);await page.screenshot({path:`/tmp/compact-calendar-${width}.png`});
});

test('Both default connectors appear before setup and Claude hands off without modifying ChatGPT',async({page})=>{
 const f=await(await page.request.get(base+'/fixture/apps')).json();let prepared=0;
 await page.route('**/app-services/automations/connector?*',r=>r.fulfill({json:{state:'not_enabled',canConfigure:true,canPrepare:new URL(r.request().url()).searchParams.get('assistant')==='chatgpt',automations:[]}}));
 await page.route('**/app-services/automations/prepare',r=>{prepared++;return r.abort();});
 await openPlatform(page,base+`/app-home?tab=connectors&workspaceId=${f.workspaceId}`);
 for(const name of ['ChatGPT','Claude']){const card=page.getByRole('region',{name:name+' connector'});await expect(card.getByText('Not connected',{exact:true})).toBeVisible();await expect(card.getByRole('button',{name:'Connect',exact:true})).toBeEnabled();}
 await expect(page.getByRole('region',{name:'Email connector'})).toHaveCount(0);
 await page.context().route('https://claude.ai/**',r=>r.fulfill({body:'Claude connection handoff'}));const popup=page.waitForEvent('popup');await page.getByRole('region',{name:'Claude connector'}).getByRole('button',{name:'Connect',exact:true}).click();const child=await popup;await expect.poll(()=>child.url()).toContain('claude.ai');await child.close();expect(prepared).toBe(0);
 await page.screenshot({path:'/tmp/compact-connectors.png'});
 await page.getByRole('button',{name:'Add connector',exact:true}).click();await page.getByLabel('Name',{exact:true}).fill('Research API');await page.getByLabel('Service address',{exact:true}).fill('https://example.invalid');await page.screenshot({path:'/tmp/compact-connector-editor.png'});
});

for(const assistant of ['chatgpt','claude'])test(`Plugin shares connector editor and keeps ${assistant} setup separate`,async({page})=>{
 await page.setViewportSize({width:900,height:1000});const f=await(await page.request.get(base+'/fixture/apps')).json();let prepares=0;
 await page.route('**/fixture/tool',r=>{const {name,arguments:a}=r.request().postDataJSON();let result;
  if(name==='list_connectors')result={connections:[],total:0};
  else if(name==='read_automation_connector')result={assistant:a.assistant,state:'not_enabled',canConfigure:a.assistant===assistant,canPrepare:a.assistant===assistant,automations:[]};
  else if(name==='connector_directory')result={apps:[],tables:[],people:[],canCreate:true};
  else if(name==='prepare_connector'){prepares++;expect(a.config.name).toBe('Research API');result={reviewId:'review',reviewUrl:'https://platform.trialagents.com/?connectorReview=review'};}
  else return r.continue();return r.fulfill({json:{content:[],structuredContent:{result}}});
 });
 await page.goto(base+'/?apps=1');await page.waitForFunction(()=>window.hostReady);await page.evaluate(workspaceId=>window.deliver({screen:'home',workspaceId,viewerId:'fixture',workspaces:[],types:[]}),f.workspaceId);const root=page.frameLocator('#app');
 if(await root.getByRole('button',{name:'Expand navigation',exact:true}).count())await root.getByRole('button',{name:'Expand navigation',exact:true}).click();await root.getByRole('button',{name:'Connectors',exact:true}).click();await expect(root.getByRole('region',{name:'Claude connector'})).toBeVisible();await expect(root.getByRole('region',{name:'ChatGPT connector'})).toBeVisible();
 const other=assistant==='claude'?'ChatGPT':'Claude';await root.getByRole('region',{name:other+' connector'}).getByRole('button',{name:'Connect',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.lastOpenedUrl)).toContain(other==='Claude'?'claude.ai':'chatgpt.com');
 await page.evaluate(()=>delete window.lastOpenedUrl);await root.getByRole('button',{name:'Add connector',exact:true}).click();await root.getByLabel('Name',{exact:true}).fill('Research API');await root.getByLabel('Service address',{exact:true}).fill('https://example.invalid');await expect(root.getByLabel('Credential',{exact:true})).toHaveCount(0);await root.getByRole('button',{name:'Review changes',exact:true}).click();await expect(root.getByRole('link',{name:'Review in TrialAgents'})).toBeVisible();expect(prepares).toBe(1);expect(await page.evaluate(()=>window.lastOpenedUrl)).toBeUndefined();
 await page.screenshot({path:`/tmp/compact-plugin-connector-${assistant}.png`});
});

async function finish(page){await page.getByRole('button',{name:'Continue to worker'}).click();await page.getByRole('button',{name:'Continue to setup'}).click();await page.getByLabel('Prompt / instructions').fill('Review changed budgets');}
