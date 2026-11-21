const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
const open=async page=>{await page.goto(base);await page.waitForFunction(()=>window.hostReady);await page.evaluate(result=>window.deliver(result),await(await page.request.get(base+'/fixture/initial')).json());const host=page.frameLocator('#app'),app=host.frameLocator('iframe[title="Saved frontend code"]');app.__page=page;await app.getByRole('button',{name:'Companies',exact:true}).click();return {host,app};};
const tool=r=>{try{return r.url().endsWith('/fixture/tool')?r.postDataJSON():null;}catch{return null;}};
// The new value shows at once; wait for the saved screen before the next edit, as a person would see it settle.
const edit=async(app,value,page=app.__page)=>{await app.getByRole('button',{name:'Edit Company',exact:true}).first().click();await app.getByRole('textbox',{name:'Company',exact:true}).fill(value);const settled=page?page.waitForResponse(r=>{const b=tool(r.request());return b?.name==='run_component_frontend'&&b.arguments?.request?.event?.action==='bound-batch';}).catch(()=>{}):Promise.resolve();await app.getByRole('textbox',{name:'Company',exact:true}).press('Enter');await settled;await app.getByRole('button',{name:'Edit Company',exact:true}).first().waitFor();};

// P5, B3 (4.4, 4.5): a cell edit is one request that saves and returns the saved screen; no review, no confirm, no Save control.
for(const width of [1440,390])test(`tracker saves cell edits in one request without Save controls at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const {host,app}=await open(page);
 await expect(host.locator('.ty-action-footer')).toHaveCount(0);
 await expect(host.locator('.ty-preview-approval').getByRole('button',{name:/^(Save|Publish|Approve)/})).toHaveCount(0);
 await expect(host.getByRole('button',{name:'Save edits',exact:true})).toHaveCount(0);
 let saves=0,confirms=0;page.on('request',r=>{const b=tool(r);if(!b)return;if(['confirm_workspace_change','approve_workspace_change'].includes(b.name))confirms++;if(b.name==='run_component_frontend'&&b.arguments?.request?.event?.action==='bound-batch')saves++;});
 const originalName=await app.getByRole('button',{name:'Edit Company',exact:true}).first().innerText();
 const name='Native save '+width+' '+Date.now();
 await edit(app,name);
 await expect.poll(()=>saves).toBe(1);
 await expect(app.getByRole('button',{name:'Edit Company',exact:true}).filter({hasText:name})).toBeVisible();
 await app.getByRole('button',{name:'Contacts',exact:true}).click();
 await expect(app.getByRole('button',{name:'Contacts',exact:true})).toHaveClass(/active/);
 await app.getByRole('button',{name:'Companies',exact:true}).click();
 await expect(app.getByText(name,{exact:true})).toBeVisible();
 await page.screenshot({path:'/tmp/native-saving-'+width+'.png'});
 await edit(app,originalName);await expect.poll(()=>saves).toBe(2);await expect(app.getByText(originalName,{exact:true})).toBeVisible();
 expect(confirms).toBe(0);
});

test('a failed cell save brings the earlier value back with one message; the next edit saves',async({page})=>{
 const {host,app}=await open(page);
 let failed=false,attempts=0;
 await page.route('**/fixture/tool',route=>{const b=route.request().postDataJSON();if(b.name==='run_component_frontend'&&b.arguments.request.event?.action==='bound-batch'){attempts++;if(!failed){failed=true;return route.fulfill({json:{isError:true,content:[{type:'text',text:'Temporary save failure'}],structuredContent:{error:{status:503,code:'temporary'}}}});}}return route.continue();});
 const originalName=await app.getByRole('button',{name:'Edit Company',exact:true}).first().innerText();
 await edit(app,'Failed edit');
 await expect(host.getByText('Temporary save failure')).toBeVisible();
 await expect(app.getByText(originalName,{exact:true}).first()).toBeVisible();await expect(app.getByText('Failed edit',{exact:true})).toHaveCount(0);
 await expect(host.getByRole('button',{name:'Retry save',exact:true})).toHaveCount(0);
 // U2: an error message stays until the person dismisses it.
 await host.getByRole('button',{name:'Dismiss error'}).click();
 const name='Saved after failure '+Date.now();await edit(app,name);await expect.poll(()=>attempts).toBe(2);await expect(app.getByText(name,{exact:true})).toBeVisible();
 await edit(app,originalName);await expect.poll(()=>attempts).toBe(3);await expect(app.getByText(originalName,{exact:true})).toBeVisible();
});

test('the app is never locked while a cell edit saves',async({page})=>{
 const {app}=await open(page);
 let release;const held=new Promise(r=>{release=r;});let saving=false;
 await page.route('**/fixture/tool',async route=>{const b=route.request().postDataJSON();if(b.name==='run_component_frontend'&&b.arguments.request.event?.action==='bound-batch'&&!saving){saving=true;await held;}return route.continue();});
 const originalName=await app.getByRole('button',{name:'Edit Company',exact:true}).first().innerText();
 const name='Unlocked '+Date.now();await app.getByRole('button',{name:'Edit Company',exact:true}).first().click();await app.getByRole('textbox',{name:'Company',exact:true}).fill(name);await app.getByRole('textbox',{name:'Company',exact:true}).press('Enter');
 await expect.poll(()=>saving).toBe(true);
 await expect(app.locator('#surface')).not.toHaveAttribute('inert');
 await expect(app.getByText(name,{exact:true})).toBeVisible();
 const done=page.waitForResponse(r=>{const b=tool(r.request());return b?.name==='run_component_frontend'&&b.arguments?.request?.event?.action==='bound-batch';});release();await done;await expect(app.getByRole('button',{name:'Edit Company',exact:true}).filter({hasText:name})).toBeVisible();
 await edit(app,originalName);await expect(app.getByText(originalName,{exact:true})).toBeVisible();
});
