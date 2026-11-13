const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
for(const width of [1440,390])test(`tracker commits cell edits without injected Save controls at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.goto(base);await page.waitForFunction(()=>window.hostReady);
 await page.evaluate(result=>window.deliver(result),await(await page.request.get(base+'/fixture/initial')).json());
 const host=page.frameLocator('#app'),app=host.frameLocator('iframe[title="Saved frontend code"]');
 await app.getByRole('button',{name:'Companies',exact:true}).click();
 await expect(host.locator('.ty-action-footer,.ty-preview-approval')).toHaveCount(0);
 await expect(host.getByRole('button',{name:'Save edits',exact:true})).toHaveCount(0);
 let confirms=0;page.on('request',r=>{if(r.url().endsWith('/fixture/tool')&&r.postDataJSON()?.name==='confirm_workspace_change')confirms++;});
 const originalName=await app.getByRole('button',{name:'Edit Company',exact:true}).first().innerText();
 await app.getByRole('button',{name:'Edit Company',exact:true}).first().click();
 const name='Native save '+width+' '+Date.now();
 await app.getByRole('textbox',{name:'Company',exact:true}).fill(name);
 await app.getByRole('textbox',{name:'Company',exact:true}).press('Enter');
 await expect.poll(()=>confirms).toBe(1);
 await expect(app.getByRole('button',{name:'Edit Company',exact:true}).filter({hasText:name})).toBeVisible();
 await app.getByRole('button',{name:'Contacts',exact:true}).click();
 // This scenario verifies persistence after completed navigation. Superseding a
 // cold tab with a cached tab is a separate navigation-ordering regression (P09).
 await expect(app.getByRole('button',{name:'Contacts',exact:true})).toHaveClass(/active/);
 await app.getByRole('button',{name:'Companies',exact:true}).click();
 await expect(app.getByText(name,{exact:true})).toBeVisible();
 await page.screenshot({path:'/tmp/native-saving-'+width+'.png'});
 await app.getByRole('button',{name:'Edit Company',exact:true}).first().click();await app.getByRole('textbox',{name:'Company',exact:true}).fill(originalName);await app.getByRole('textbox',{name:'Company',exact:true}).press('Enter');await expect.poll(()=>confirms).toBe(2);await expect(app.getByText(originalName,{exact:true})).toBeVisible();
});
test('failed cell commit retains the draft and retries its exact proposal',async({page})=>{
 await page.goto(base);await page.waitForFunction(()=>window.hostReady);await page.evaluate(result=>window.deliver(result),await(await page.request.get(base+'/fixture/initial')).json());
 const host=page.frameLocator('#app'),app=host.frameLocator('iframe[title="Saved frontend code"]');
 await app.getByRole('button',{name:'Companies',exact:true}).click();
 let failed=false;const attempts=[];
 await page.route('**/fixture/tool',route=>{const b=route.request().postDataJSON();if(b.name==='confirm_workspace_change'){attempts.push(b.arguments);if(!failed){failed=true;return route.fulfill({json:{isError:true,content:[{type:'text',text:'Temporary save failure'}],structuredContent:{error:{status:503,code:'temporary'}}}});}}return route.continue();});
 const originalName=await app.getByRole('button',{name:'Edit Company',exact:true}).first().innerText();
 await app.getByRole('button',{name:'Edit Company',exact:true}).first().click();
 await app.getByRole('textbox',{name:'Company',exact:true}).fill('Retained failed edit');await app.getByRole('textbox',{name:'Company',exact:true}).press('Enter');
 await expect(host.getByRole('button',{name:'Retry save',exact:true})).toBeVisible();await expect(app.getByText('Retained failed edit',{exact:true})).toBeVisible();
 await host.getByRole('button',{name:'Retry save',exact:true}).click();await expect(host.getByRole('button',{name:'Retry save',exact:true})).toHaveCount(0);
 expect(attempts).toHaveLength(2);expect(attempts[1].previewId).toBe(attempts[0].previewId);expect(attempts[1].digest).toBe(attempts[0].digest);
 await app.getByRole('button',{name:'Edit Company',exact:true}).first().click();await app.getByRole('textbox',{name:'Company',exact:true}).fill(originalName);await app.getByRole('textbox',{name:'Company',exact:true}).press('Enter');await expect.poll(()=>attempts.length).toBe(3);await expect(app.getByText(originalName,{exact:true})).toBeVisible();
});

test('failed preparation keeps a visible retry without a Save footer',async({page})=>{
 await page.goto(base);await page.waitForFunction(()=>window.hostReady);await page.evaluate(result=>window.deliver(result),await(await page.request.get(base+'/fixture/initial')).json());
 const host=page.frameLocator('#app'),app=host.frameLocator('iframe[title="Saved frontend code"]');await app.getByRole('button',{name:'Companies',exact:true}).click();
 let fail=true,commits=0;await page.route('**/fixture/tool',route=>{const b=route.request().postDataJSON();if(b.name==='confirm_workspace_change')commits++;if(fail&&b.name==='run_component_frontend'&&b.arguments.request.event?.action==='bound-batch'){fail=false;return route.fulfill({json:{isError:true,content:[{type:'text',text:'Preparation unavailable'}],structuredContent:{error:{status:503,code:'temporary'}}}});}return route.continue();});
 const originalName=await app.getByRole('button',{name:'Edit Company',exact:true}).first().innerText();await app.getByRole('button',{name:'Edit Company',exact:true}).first().click();await app.getByRole('textbox',{name:'Company',exact:true}).fill('Retry prepared edit');await app.getByRole('textbox',{name:'Company',exact:true}).press('Enter');
 await expect(host.getByRole('button',{name:'Retry save',exact:true})).toBeVisible();await expect(app.getByText('Retry prepared edit',{exact:true})).toBeVisible();await host.getByRole('button',{name:'Retry save',exact:true}).click();await expect.poll(()=>commits).toBe(1);await expect(app.locator('#surface')).not.toHaveAttribute('inert');await expect(host.getByRole('button',{name:'Retry save',exact:true})).toHaveCount(0);
 await app.getByRole('button',{name:'Edit Company',exact:true}).first().click();await app.getByRole('textbox',{name:'Company',exact:true}).fill(originalName);await app.getByRole('textbox',{name:'Company',exact:true}).press('Enter');await expect.poll(()=>commits).toBe(2);
});
