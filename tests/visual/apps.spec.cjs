const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
for(const width of [1440,390])test(`Simple apps: launch, navigation, draft guard and corner watermark at ${width}px`,async({page,context})=>{
 await page.setViewportSize({width,height:1000});const fixture=await (await page.request.get(base+'/fixture/apps')).json();
 await page.goto(base+'/app-home');
 await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible();
 await expect(page.getByRole('group',{name:'Resource type'})).toHaveCount(0);
 const launch=page.getByRole('link',{name:'Open Simple app fixture',exact:true});await expect(launch).toHaveAttribute('target','_blank');
 const [app]=await Promise.all([context.waitForEvent('page'),launch.click()]);await app.waitForLoadState();await app.setViewportSize({width,height:1000});
 const frame=app.frameLocator('iframe[title="Saved frontend code"]');await expect(frame.getByRole('heading',{name:'Overview'})).toBeVisible();
 await expect(frame.locator('a').filter({hasText:'Unsafe'})).not.toHaveAttribute('href');
 const [linked]=await Promise.all([context.waitForEvent('page'),frame.getByRole('link',{name:'Linked calculator',exact:true}).click()]);await expect(linked.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:'Linked calculator',exact:true})).toBeVisible();await linked.close();
 await expect(app.locator('.ty-sidebar')).toHaveCount(0);await expect(app.getByRole('link',{name:'Built with TrialAgents'})).toBeVisible();
 await frame.getByRole('link',{name:'Company',exact:true}).click();await expect(frame.getByRole('heading',{name:'Company',exact:true})).toBeVisible();await expect(app).toHaveURL(/\/company\?/);
 await app.reload();await expect(frame.getByRole('heading',{name:'Company',exact:true})).toBeVisible();
 await frame.getByRole('link',{name:'Calculator',exact:true}).click();await expect(frame.getByRole('heading',{name:'Calculator'})).toBeVisible();await frame.getByLabel('Quantity').fill('7');await frame.getByLabel('Rate',{exact:true}).fill('9');await frame.getByRole('button',{name:'Calculate'}).click();await expect(frame.getByText('Total: 63')).toBeVisible();
 await app.goBack();await expect(frame.getByRole('heading',{name:'Company',exact:true})).toBeVisible();await app.goForward();await expect(frame.getByText('Total: 63')).toBeVisible();
 await frame.getByLabel('Draft note').fill('Unfinished');await app.getByRole('link',{name:'Built with TrialAgents'}).click();await expect(app.getByRole('alertdialog',{name:'Unsaved changes'})).toBeVisible();await app.getByRole('button',{name:'Keep editing'}).click();await expect(frame.getByLabel('Draft note')).toHaveValue('Unfinished');await frame.getByRole('link',{name:'Overview',exact:true}).click();await expect(app.getByRole('alertdialog',{name:'Unsaved changes'})).toBeVisible();await app.getByRole('button',{name:'Keep editing'}).click();await expect(frame.getByLabel('Draft note')).toHaveValue('Unfinished');
 await frame.getByRole('link',{name:'Overview',exact:true}).click();await app.getByRole('button',{name:'Discard edits and continue'}).click();await expect(frame.getByRole('heading',{name:'Overview'})).toBeVisible();
 const mark=await app.getByRole('link',{name:'Built with TrialAgents'}).boundingBox(),main=await app.locator('#ty-main').boundingBox();expect(mark.width).toBeLessThan(220);expect(mark.height).toBeLessThanOrEqual(40);expect(mark.x+mark.width).toBe(width-12);expect(mark.y+mark.height).toBe(988);expect(main.height).toBe(1000);await expect(app.locator('.ty-app-brand-footer')).toHaveCount(0);
 await expect(app).toHaveScreenshot(`simple-app-${width}.png`);await app.close();
});
test('Connectors match existing controls and approve an external request once',async({page})=>{
 const fixture=await (await page.request.get(base+'/fixture/apps')).json();await page.goto(base+fixture.url.replace('?',`/company?recordId=${fixture.recordId}&`));const frame=page.frameLocator('iframe[title="Saved frontend code"]');
 await frame.getByRole('button',{name:'Verify with connector'}).click();await expect(page.getByRole('dialog',{name:'Review connector action'})).toBeVisible();
 const before=await (await page.request.get(base+'/fixture/apps')).json();await page.getByRole('button',{name:'Approve and send once'}).click();await expect(frame.getByText('Verified',{exact:true})).toBeVisible();const after=await (await page.request.get(base+'/fixture/apps')).json();expect(after.sends).toBe(before.sends+1);
 await frame.getByRole('button',{name:'Verify with connector'}).click();await expect(frame.getByText('Verified',{exact:true})).toBeVisible();expect((await (await page.request.get(base+'/fixture/apps')).json()).sends).toBe(after.sends);
 await page.goto(base+'/app-home?tab=connectors&workspaceId='+fixture.workspaceId);await expect(page.getByRole('heading',{name:'Connectors',exact:true})).toBeVisible();await page.getByRole('button',{name:'Open Fixture connection',exact:true}).click();await page.getByRole('tab',{name:'Access',exact:true}).click();await expect(page.getByRole('table',{name:'Connector access'})).toBeVisible();
 await expect(page).toHaveScreenshot('connector-access.png');await page.getByRole('tab',{name:'Details',exact:true}).click();await page.getByRole('button',{name:'Disable',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('checkbox',{name:'Enabled',exact:true})).not.toBeChecked();
});

test('Connector configuration, credential replacement and removal use trusted controls',async({page})=>{
 const f=await (await page.request.get(base+'/fixture/apps')).json();await page.goto(base+'/app-home?tab=connectors&workspaceId='+f.workspaceId);
 await page.getByRole('button',{name:'Add connector',exact:true}).click();await page.getByLabel('Name',{exact:true}).fill('Discard this connector');await expect(page.getByRole('button',{name:'← Connectors',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Ignore changes',exact:true}).click();await expect(page.getByRole('heading',{name:'Connectors',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Open Discard this connector',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Add connector',exact:true}).click();await page.getByLabel('Name',{exact:true}).fill('Second service');await page.getByLabel('Service address',{exact:true}).fill('https://example.invalid');await page.getByLabel('Authentication',{exact:true}).selectOption('bearer');
 await page.getByRole('tab',{name:'Access',exact:true}).click();await page.getByRole('checkbox',{name:'use Fixture',exact:true}).click();await page.getByLabel('Simple app fixture',{exact:true}).check();
 await page.getByRole('tab',{name:'Data',exact:true}).click();await page.getByRole('button',{name:'Add input',exact:true}).click();await page.getByLabel('Input name',{exact:true}).fill('query');await page.getByRole('button',{name:'Save changes',exact:true}).click();
 const review=page.getByRole('dialog',{name:'Review connector action'});await expect(review).toContainText('Second service');await review.getByRole('button',{name:'Save configuration',exact:true}).click();await expect(review).toHaveCount(0);
 await page.getByRole('tab',{name:'Details',exact:true}).click();await page.getByRole('button',{name:'Replace credential',exact:true}).click();await page.getByLabel('New credential',{exact:true}).fill('synthetic-fixture-secret');await page.getByRole('button',{name:'Save credential',exact:true}).click();await expect(page.getByText(/^Configured/)).toBeVisible();await expect(page.getByLabel('New credential',{exact:true})).toHaveCount(0);await expect(page.locator('body')).not.toContainText('synthetic-fixture-secret');
 await page.getByRole('button',{name:'Remove',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('heading',{name:'Connectors',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Open Second service',exact:true})).toHaveCount(0);
});
for(const width of [1440,390])test(`App changes stay proposals without covering the watermark at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 const f=await (await page.request.get(base+'/fixture/apps')).json();await page.goto(base+f.url.replace('?',`/company?recordId=${f.recordId}&`));const frame=page.frameLocator('iframe[title="Saved frontend code"]');
 await frame.getByRole('button',{name:'Rename company',exact:true}).click();const mark=await page.getByRole('link',{name:'Built with TrialAgents'}).boundingBox();const actions=await page.locator('.ty-action-footer').boundingBox();expect(actions.y+actions.height).toBeLessThan(mark.y);await page.getByRole('button',{name:'Save changes',exact:true}).click();const review=page.getByRole('dialog',{name:'Review app changes'});await expect(review).toContainText('Updated company');const box=await review.boundingBox();expect(box.y+box.height).toBeLessThan(mark.y);await review.getByRole('button',{name:'Save changes',exact:true}).click();await expect(frame.getByText('Updated company',{exact:true})).toBeVisible();await page.reload();await expect(frame.getByText('Updated company',{exact:true})).toBeVisible();
});

test('Embedded app launch uses the host open-link bridge',async({page})=>{
 const f=await (await page.request.get(base+'/fixture/apps')).json();await page.goto(base);await page.waitForFunction(()=>window.hostReady);
 await page.evaluate(r=>window.deliver(r),{screen:'app-link',name:'Simple app fixture',workspaceId:f.workspaceId,appId:f.appId,url:base+f.url});
 const embed=page.frameLocator('#app');await expect(embed.getByRole('heading',{name:'Simple app fixture',exact:true})).toBeVisible();await embed.getByRole('link',{name:'Open app ↗',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.lastOpenedUrl)).toBe(base+f.url);
});

for(const width of [1440,390])test(`Connector editor actions stay at the top right at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});const f=await (await page.request.get(base+'/fixture/apps')).json();await page.goto(base+'/app-home?tab=connectors&workspaceId='+f.workspaceId);await page.getByRole('button',{name:'Add connector',exact:true}).click();
 const heading=page.locator('.ty-connector-heading'),save=heading.getByRole('button',{name:'Save changes',exact:true}),ignore=heading.getByRole('button',{name:'Ignore changes',exact:true});await expect(save).toBeVisible();await expect(ignore).toBeVisible();
 const box=await heading.boundingBox(),actions=await heading.locator('.ty-actions').boundingBox(),tabs=await page.getByRole('tablist',{name:'Connector settings'}).boundingBox();expect(Math.abs(box.x+box.width-actions.x-actions.width)).toBeLessThan(2);expect(actions.y+actions.height).toBeLessThan(tabs.y);expect(actions.x).toBeGreaterThanOrEqual(box.x);
 await expect(page).toHaveScreenshot(`connector-new-${width}.png`);await ignore.click();await expect(page.getByRole('heading',{name:'Connectors',exact:true})).toBeVisible();
});
