const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
for(const width of [1440,390])test(`App menu and explicit automation-copy choice at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});const f=await(await page.request.get(base+'/fixture/apps')).json();let prepared=[],confirmed=0,failOnce=false;
 await page.route('**/organization/previews',route=>{const body=route.request().postDataJSON();if(body.kind!=='copy_component')return route.continue();prepared.push(body);return route.fulfill({json:{id:'copy-review',digest:'copy-digest'}});});
 await page.route('**/organization/previews/copy-review/confirm',route=>{confirmed++;if(failOnce){failOnce=false;return route.fulfill({status:503,json:{message:'Temporary response failure'}});}return route.fulfill({json:{id:'copied-app'}});});
 await page.goto(base+'/app-home');const card=page.locator('article.ty-resource').filter({has:page.locator(`a.ty-resource-open[href*="${f.appId}"]`)});
 const menu=page.getByRole('menu');await card.getByRole('button',{name:/Actions for/}).click();await expect(menu.getByRole('menuitem',{name:'Manage',exact:true})).toHaveCount(0);
 const open=menu.getByRole('menuitem',{name:'Open',exact:true}),duplicate=menu.getByRole('menuitem',{name:'Duplicate',exact:true});await expect(open).toHaveCount(1);await expect(open).toHaveAttribute('href',new RegExp(f.appId));
 const font=el=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight];};expect(await open.evaluate(font)).toEqual(await duplicate.evaluate(font));await page.screenshot({path:`/tmp/trialy-app-menu-${width}.png`,fullPage:true});
 await duplicate.click();const dialog=page.getByRole('dialog');await expect(dialog.getByRole('checkbox',{name:'Include automations'})).not.toBeChecked();expect(prepared).toHaveLength(0);await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Cancel'}).click();expect(prepared).toHaveLength(0);expect(confirmed).toBe(0);
 const launch=async()=>{await card.getByRole('button',{name:/Actions for/}).click();await menu.getByRole('menuitem',{name:'Duplicate',exact:true}).click();};
 await launch();await dialog.getByRole('button',{name:'Duplicate app',exact:true}).click();await expect(dialog).toHaveCount(0);expect(prepared[0].copyAutomations).toBe(false);
 await launch();await dialog.getByRole('checkbox').check();await expect(dialog).toContainText('Copied automations start disabled');await page.screenshot({path:`/tmp/trialy-copy-options-${width}.png`,fullPage:true});failOnce=true;
 await dialog.getByRole('button',{name:'Duplicate app',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('Temporary response failure');await expect(dialog.getByRole('checkbox')).toBeChecked();await expect(dialog.getByRole('checkbox')).toBeDisabled();expect(prepared).toHaveLength(2);expect(prepared[1].copyAutomations).toBe(true);
 await dialog.getByRole('button',{name:'Duplicate app',exact:true}).click();await expect(dialog).toHaveCount(0);expect(prepared).toHaveLength(2);expect(confirmed).toBe(3);await expect(page.locator('html')).toHaveJSProperty('scrollWidth',width);
});
for(const width of [1440,390])test(`Generic app layout saves without a legacy type at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});const f=await(await page.request.post(base+'/fixture/generic-layout')).json();
 await page.goto(base+f.url);const tracker=page.frameLocator('iframe[title="Saved frontend code"]');await tracker.getByRole('button',{name:'App settings',exact:true}).click();
 await expect(page.getByRole('heading',{name:'App settings',exact:true})).toBeVisible();await expect(page.getByLabel('Resource type')).toHaveCount(0);await page.getByLabel('Name',{exact:true}).fill('Revised generic app');await page.getByRole('button',{name:'Save layout',exact:true}).click();
 await expect(tracker.getByRole('heading',{name:'Revised generic app',exact:true})).toBeVisible();await expect(page.getByText(/resourceKind: Invalid option/)).toHaveCount(0);await page.reload();await expect(tracker.getByRole('heading',{name:'Revised generic app',exact:true})).toBeVisible();await page.screenshot({path:`/tmp/trialy-generic-layout-${width}.png`,fullPage:true});
 const call=async(name,args)=>(await(await page.request.post(base+'/fixture/tool',{data:{name,arguments:args}})).json()).structuredContent.result;
 const current=await call('read_project_component',{componentId:f.id});expect(current.component.resource_kind).toBe('generic');const p=await call('prepare_workspace_change',{operation:{kind:'archive_component',componentId:f.id,expectedVersion:current.component.version,archived:true}});await call('confirm_workspace_change',{previewId:p.id,digest:p.digest});
});
