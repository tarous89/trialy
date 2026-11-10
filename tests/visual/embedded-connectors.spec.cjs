const {test,expect}=require('./test.cjs');
for(const width of [1440,390])test(`Connectors stay in extension and toggle with impact review at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 const base='http://127.0.0.1:4179',f=await(await page.request.get(base+'/fixture/apps')).json();let enabled=true,version=0,controls=[];
 await page.route('**/fixture/tool',async route=>{const {name,arguments:a}=route.request().postDataJSON();let result;
  if(name==='read_automation_connector')result={id:'runner',enabled,version,state:enabled?'ready':'paused',impactDigest:'current',automations:[{id:'research',kind:'research',name:'Friday research',appName:'Outreach',enabled:true}]};
  else if(name==='list_connectors')result={connections:[{id:'service',name:'Research API',enabled:true}],total:1};
  else if(name==='read_connector')result={config:{name:'Research API',description:'Company research',enabled:true,operations:[{id:'search',name:'Find companies',method:'GET',path:'/companies',effect:'read'}]},credentialStatus:'configured'};
  else if(name==='control_automation_runner'){controls.push(a);enabled=a.enabled;version++;result={enabled};}
  else return route.continue();
  return route.fulfill({json:{content:[],structuredContent:{result}}});
 });
 await page.goto(base+'/?apps=1');await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),{screen:'home',workspaceId:f.workspaceId,viewerId:'fixture',workspaces:[],types:[]});
 const root=page.frameLocator('#app');if(await root.getByRole('button',{name:'Expand navigation',exact:true}).count())await root.getByRole('button',{name:'Expand navigation',exact:true}).click();await root.getByRole('button',{name:'Connectors',exact:true}).click();
 await expect(root.getByRole('heading',{name:'Connectors',exact:true})).toBeVisible();if(width<760)await root.getByRole('button',{name:'Collapse navigation',exact:true}).click();await root.getByRole('button',{name:'Disable',exact:true}).click();
 await expect(root.getByRole('alertdialog')).toContainText('Friday research');expect(controls).toHaveLength(0);
 await root.getByRole('alertdialog').getByRole('button',{name:'Disable ChatGPT',exact:true}).click();await expect(root.getByRole('button',{name:'Enable',exact:true})).toBeVisible();expect(controls[0]).toMatchObject({confirmed:true,impactDigest:'current',enabled:false});
 await root.getByRole('button',{name:'Enable',exact:true}).click();await expect(root.getByRole('button',{name:'Disable',exact:true})).toBeVisible();
 await root.getByRole('button',{name:'Open',exact:true}).click();await expect(root.getByRole('heading',{name:'Research API',exact:true})).toBeVisible();await expect(root.getByRole('heading',{name:'Find companies',exact:true})).toBeVisible();expect(await page.evaluate(()=>window.lastOpenedUrl)).toBeUndefined();
 await page.screenshot({path:`/tmp/trialy-embedded-connectors-${width}.png`});
});
