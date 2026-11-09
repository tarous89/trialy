const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
const names=['Biotech outreach','Site activation','Partner pipeline','Study milestones','Investigator network','Evidence library'];
const descriptions=['Build relationships with biotech teams, from first contact to next conversation.','Keep study sites moving from feasibility through activation.','Follow potential collaborators and the next steps that matter.','Plan study deliverables and see what is coming next.','Organize investigator relationships and areas of expertise.','Keep useful publications and research notes in one place.'];
const cards=names.map((name,i)=>({id:`20000000-0000-4000-8000-00000000000${i+1}`,workspaceId:'20000000-0000-4000-8000-000000000010',name,description:descriptions[i],kind:'tracker',source:'component',projectIds:[],updatedAt:'2026-10-30T10:00:00Z',...(i<4?{snapshot:{kind:'table',tabs:[['Companies','Contacts'],['Sites','Milestones'],['Partners','Conversations'],['Schedule','Deliverables']][i],columns:[['Company','Stage','Next step'],['Site','Status','Owner'],['Partner','Focus','Next step'],['Milestone','Due','Owner']][i],rows:[['Example entry','Planned','Review'],['Sample entry','Active','Follow up']]}}:{})}));
for(const width of [1440,390])test(`Individual app covers in platform and extension at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 const home={projects:[],resources:cards,total:cards.length};
 await page.route('**/api/account/home',route=>route.fulfill({json:home}));
 await page.route('**/fixture/tool',route=>route.request().postDataJSON().name==='read_account_home'?route.fulfill({json:{content:[],structuredContent:{result:home}}}):route.continue());
 for(const embedded of [false,true]){
  await page.goto(base+(embedded?'/?apps=1':'/app-home'));
  if(embedded){await page.waitForFunction(()=>window.hostReady);const f=await (await page.request.get(base+'/fixture/apps')).json();await page.evaluate(r=>window.deliver(r),{screen:'home',workspaceId:f.workspaceId,viewerId:'fixture',workspaces:[],types:[]});}
  const root=embedded?page.frameLocator('#app'):page;
  await expect(root.locator('.ty-app-cover')).toHaveCount(6);
  const mark=root.locator(embedded?'.ty-mobile-brand .ty-brand-mark':'.ty-platform-brand .ty-brand-mark');

  await expect(mark).toBeVisible();if(!embedded&&width<760)await root.getByRole('button',{name:'Collapse navigation',exact:true}).click();await expect.poll(()=>mark.evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);

  for(const cover of await root.locator('.ty-app-cover').all()){await expect(cover).not.toHaveCSS('background-image','none');expect((await cover.boundingBox()).height).toBeGreaterThan(100);}
  const styles=await root.locator('.ty-resource--app').evaluateAll(els=>els.map(el=>el.getAttribute('style')));expect(new Set(styles).size).toBe(6);
  await expect(root.getByText(descriptions[0],{exact:true})).toBeVisible();
  await expect(page).toHaveScreenshot(`app-home-${embedded?'extension':'platform'}-${width}.png`);
  await root.getByRole('button',{name:'Detailed list',exact:true}).click();await expect(root.locator('.ty-tool-snapshot').first()).toBeHidden();
  await root.getByRole('button',{name:'Preview grid',exact:true}).click();expect(await root.locator('.ty-resource--app').evaluateAll(els=>els.map(el=>el.getAttribute('style')))).toEqual(styles);
 }
});
for(const width of [1440,390])test(`Preview floating footer keeps both labeled actions in view at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 for(const embedded of [false,true]){
  const draft=await (await page.request.get(base+'/fixture/app-draft')).json();
  await page.goto(base+(embedded?'/?apps=1':'/apps/'+draft.preview.id+'?workspaceId='+draft.workspaceId+'&source=preview'));
  if(embedded){await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),draft);}
  const root=embedded?page.frameLocator('#app'):page,footer=root.locator('.ty-tracker-preview>.ty-preview-approval');
  const save=footer.getByRole('button',{name:'Save app',exact:true}),discard=footer.getByRole('button',{name:'Discard app',exact:true});
  await expect(save).toBeEnabled();await expect(save).toHaveCSS('background-color','rgb(162, 237, 181)');await expect(discard).toHaveCSS('color','rgb(244, 248, 245)');await expect(discard).toHaveText('Discard app');if(embedded)await expect(root.locator('.ty-topbar')).toHaveCSS('background-color','rgb(13, 19, 17)');
  const box=await footer.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.width).toBeLessThanOrEqual(width);expect(box.y).toBeGreaterThan(700);await expect(footer).toHaveCSS('position','fixed');await expect(footer).toHaveCSS('background-color','rgb(13, 19, 17)');
  if(!embedded)expect((await root.locator('.ty-platform-header').boundingBox()).height).toBeLessThan(box.y);
  for(const button of [save,discard]){const b=await button.boundingBox();expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(width);expect(b.y+b.height).toBeLessThanOrEqual(1000);}
  await page.screenshot({path:`/tmp/approval-footer-${embedded?'extension':'platform'}-${width}.png`});await discard.click();if(embedded){await expect(footer).toHaveCount(0);await expect(root.getByRole('heading',{name:'Apps',exact:true})).toBeVisible();}else await expect(page).toHaveURL(base+'/?tab=home');
 }
});
for(const entry of ['card','menu'])test(`A preview opened from extension Home stays inside the extension (${entry})`,async({page})=>{
 const draft=await (await page.request.get(base+'/fixture/app-draft')).json();await page.goto(base+'/?apps=1');await page.waitForFunction(()=>window.hostReady);
 await page.evaluate(r=>window.deliver(r),{screen:'home',workspaceId:draft.workspaceId,viewerId:'fixture',workspaces:[],types:[]});
 const root=page.frameLocator('#app'),card=root.locator('article').filter({has:root.getByRole('button',{name:'Open Embedded draft',exact:true})});
 if(entry==='menu'){await card.getByRole('button',{name:'Actions for Embedded draft'}).click();await root.getByRole('menuitem',{name:'Open',exact:true}).click();}
 else await card.getByRole('button',{name:'Open Embedded draft',exact:true}).click();
 await expect(root.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:'Embedded draft',exact:true})).toBeVisible();
 await expect(root.locator('.ty-preview-approval').getByRole('button',{name:'Save app',exact:true})).toBeEnabled();
 expect(await page.evaluate(()=>window.lastOpenedUrl)).toBeFalsy();
 await root.getByRole('button',{name:'Discard app',exact:true}).click();
 await expect(root.getByRole('heading',{name:'Apps',exact:true})).toBeVisible();
});

for(const width of [1440,390])test(`App cards keep equal dimensions with preview tags and variable text at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 const resources=cards.map((card,i)=>({...card,name:i===0?'An exceptionally long dashboard title that should stay contained within its card':card.name,description:i===1?'':i===2?descriptions[i].repeat(8):card.description,...(i===0?{status:'Preview',source:'preview'}:{})}));
 const home={projects:[],resources,total:resources.length};
 await page.route('**/api/account/home',route=>route.fulfill({json:home}));
 await page.route('**/fixture/tool',route=>route.request().postDataJSON().name==='read_account_home'?route.fulfill({json:{content:[],structuredContent:{result:home}}}):route.continue());
 for(const embedded of [false,true]){
  await page.goto(base+(embedded?'/?apps=1':'/app-home'));
  if(embedded){await page.waitForFunction(()=>window.hostReady);const f=await(await page.request.get(base+'/fixture/apps')).json();await page.evaluate(r=>window.deliver(r),{screen:'home',workspaceId:f.workspaceId,viewerId:'fixture',workspaces:[],types:[]});}
  const root=embedded?page.frameLocator('#app'):page;
  await expect(root.locator('.ty-resource')).toHaveCount(6);
  const boxes=await root.locator('.ty-resource').evaluateAll(els=>els.map(el=>{const b=el.getBoundingClientRect();return {width:b.width,height:b.height};}));
  for(const b of boxes){expect(Math.abs(b.width-boxes[0].width)).toBeLessThan(1);expect(b.height).toBe(boxes[0].height);}
  await expect(root.locator('.ty-preview-badge')).toHaveCount(1);
  await page.screenshot({path:`/tmp/preview-cards-${embedded?'extension':'platform'}-${width}.png`,fullPage:true});
 }
});

for(const width of [1440,390])test(`Finalized new app replaces Home with approval and keeps table controls clear at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 const initial=await(await page.request.get(base+'/fixture/initial')).json();
 const call=async(name,args)=>{const r=await(await page.request.post(base+'/fixture/tool',{data:{name,arguments:args}})).json();expect(r.isError,JSON.stringify(r)).not.toBe(true);return r.structuredContent.result;};
 const draft=await call('prepare_ai_revision',{operation:{kind:'save_component',content:{name:'New app approval',format:'frontend-js',source:initial.component.source,bindings:initial.component.bindings,manifest:initial.component.manifest,sourceAccess:'bindings'}}});
 await page.goto(base+'/?apps=1');await page.waitForFunction(()=>window.hostReady);
 await page.evaluate(r=>window.deliver(r),{screen:'home',workspaceId:initial.workspaceId,viewerId:'fixture',workspaces:[],types:[]});
 const root=page.frameLocator('#app');await expect(root.getByRole('heading',{name:'Apps',exact:true})).toBeVisible();
 await page.evaluate(r=>window.deliver(r),{...draft,displayIntent:'background'});
 await expect(root.getByRole('heading',{name:'Apps',exact:true})).toBeVisible();await expect(root.locator('.ty-preview-approval')).toHaveCount(0);
 const finalized=await call('finalize_app_preview',{workspaceId:initial.workspaceId,previewId:draft.preview.id,digest:draft.preview.digest});
 await page.evaluate(r=>window.deliver(r),finalized);
 const footer=root.locator('.ty-preview-approval');await expect(footer.getByRole('button',{name:'Save app',exact:true})).toBeEnabled();
 await expect(root.getByRole('heading',{name:'Apps',exact:true})).toHaveCount(0);
 const frame=root.frameLocator('iframe[title="Saved frontend code"]');await frame.getByRole('button',{name:'Companies',exact:true}).click();
 await expect.poll(async()=>{const f=await root.locator('iframe[title="Saved frontend code"]').boundingBox(),b=await footer.boundingBox();return f.y+f.height-b.y;}).toBeLessThanOrEqual(1);
 await footer.getByRole('button',{name:'Save app',exact:true}).click();
 await expect(root.getByRole('heading',{name:'Apps',exact:true})).toBeVisible();await expect(footer).toHaveCount(0);
});
