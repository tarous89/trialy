const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
test('Extension opens disabled automations locally and saves the exact MCP review',async({page})=>{
 const f=await(await page.request.get(base+'/fixture/apps')).json();
 const id='31000000-0000-4000-8000-000000000009',reviewId='31000000-0000-4000-8000-000000000008',digest='a'.repeat(64),review='Exact reviewed email configuration';
 const config={name:'Completion email',appId:f.appId,appVersion:0,trigger:{kind:'manual'},steps:[{id:'notify',kind:'email',to:['owner@example.invalid'],subject:'Completed',text:'Saved summary'}],expiresAt:'2027-12-31T00:00:00Z',fields:[],conditions:[],users:[]};
 let saved,reads=0,enabled=false,preparedState;
 await page.route('**/fixture/tool',route=>{
  const {name,arguments:args}=route.request().postDataJSON();let result;
  if(name==='list_app_automations'){reads++;expect(args.workspaceId).toBe(f.workspaceId);result={rows:[{id,kind:'action',name:config.name,app_name:'Tracker',app_url:f.url,prompt:'Saved summary',version:0,enabled,trigger:config.trigger}],nextOffset:null};}
  else if(name==='read_app_automation')result={id,kind:'action',version:0,enabled,config,app:{name:'Tracker'}};
  else if(name==='read_automation_setup')result={state:'ready'};
  else if(name==='read_app_automation_options')result={owner:{name:'Owner',email:'owner@example.invalid'},members:[],tables:[],writeScopes:[]};
  else if(name==='prepare_app_action')result={id:reviewId,digest,review,confirmation:{operation:'confirm_app_service_review',workspaceId:f.workspaceId,reviewId,kind:'action',digest,review}};
  else if(name==='prepare_app_automation_control'){preparedState=args;result={id:reviewId,kind:'automation_control',digest,review};}
  else if(name==='confirm_app_service_review'){saved=args;if(args.kind==='automation_control')enabled=preparedState.enabled;result={saved:true};}
  else return route.continue();
  return route.fulfill({json:{structuredContent:{result}}});
 });
 await page.goto(base+'/?apps=1');await page.waitForFunction(()=>window.hostReady);
 await page.evaluate(workspaceId=>window.deliver({screen:'home',workspaceId,viewerId:'fixture',workspaces:[],types:[]}),f.workspaceId);
 const root=page.frameLocator('#app');await expect(root.getByRole('heading',{name:'Apps',exact:true})).toBeVisible();expect(reads).toBe(0);
 if(await root.getByRole('button',{name:'Expand navigation',exact:true}).count())await root.getByRole('button',{name:'Expand navigation',exact:true}).click();await root.getByRole('button',{name:'Automations',exact:true}).click();
 await expect(root.getByRole('heading',{name:'Automations',exact:true})).toBeVisible();await expect(root.getByLabel('Automation status: Disabled',{exact:true})).toBeVisible();expect(await page.evaluate(()=>window.lastOpenedUrl)).toBeUndefined();
 await root.getByRole('button',{name:'Enable',exact:true}).click();await expect(root.getByLabel('Automation status: Enabled',{exact:true})).toBeVisible();expect(preparedState).toEqual({workspaceId:f.workspaceId,kind:'action',automationId:id,expectedVersion:0,enabled:true});expect(saved).toEqual({workspaceId:f.workspaceId,reviewId,kind:'automation_control',digest,review,confirmed:true});
 await root.getByRole('button',{name:'Edit',exact:true}).click();await root.getByLabel('Message',{exact:true}).fill('Updated summary');await expect.poll(()=>page.evaluate(()=>window.modelContextUpdates?.at(-1)?.content[0].text)).toContain(id);expect(await page.evaluate(()=>window.modelContextUpdates.at(-1).content[0].text)).not.toContain('Updated summary');await expect(root.getByRole('button',{name:'Review changes',exact:true})).toHaveCount(0);await root.getByRole('button',{name:'Save changes',exact:true}).click();
 await expect(root.getByRole('heading',{name:'Automations',exact:true})).toBeVisible();expect(saved).toEqual({workspaceId:f.workspaceId,reviewId,kind:'action',digest,review,confirmed:true});
 await root.getByRole('button',{name:'Edit',exact:true}).click();if(await root.getByRole('button',{name:'Expand navigation',exact:true}).count())await root.getByRole('button',{name:'Expand navigation',exact:true}).click();await root.getByRole('button',{name:'Automations',exact:true}).click();await expect(root.getByRole('heading',{name:'Automations',exact:true})).toBeVisible();
});

 test('Automation confirmation opens and refreshes Automations without external navigation',async({page})=>{
 const f=await(await page.request.get(base+'/fixture/apps')).json();let reads=0;
 await page.route('**/fixture/tool',route=>{const {name}=route.request().postDataJSON();if(name!=='list_app_automations')return route.continue();reads++;return route.fulfill({json:{structuredContent:{result:{rows:[],nextOffset:null}}}});});
 await page.goto(base+'/?apps=1');await page.waitForFunction(()=>window.hostReady);
 await page.evaluate(workspaceId=>window.deliver({screen:'automations',workspaceId,saved:true,displayIntent:'navigate'}),f.workspaceId);
 const root=page.frameLocator('#app');await expect(root.getByRole('heading',{name:'Automations',exact:true})).toBeVisible();await expect.poll(()=>reads).toBeGreaterThan(0);
 const before=reads;await page.evaluate(workspaceId=>window.deliver({screen:'automations',workspaceId,saved:true,displayIntent:'navigate'}),f.workspaceId);await expect.poll(()=>reads).toBeGreaterThan(before);
 await page.evaluate(()=>window.deliver({displayIntent:'background',screen:'home'}));await expect(root.getByRole('heading',{name:'Automations',exact:true})).toBeVisible();expect(await page.evaluate(()=>window.lastOpenedUrl)).toBeUndefined();
 });
