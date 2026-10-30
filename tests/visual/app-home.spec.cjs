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
  for(const cover of await root.locator('.ty-app-cover').all()){await expect(cover).not.toHaveCSS('background-image','none');expect((await cover.boundingBox()).height).toBeGreaterThan(100);}
  const styles=await root.locator('.ty-resource--app').evaluateAll(els=>els.map(el=>el.getAttribute('style')));expect(new Set(styles).size).toBe(6);
  await expect(root.getByText(descriptions[0],{exact:true})).toBeVisible();
  await expect(page).toHaveScreenshot(`app-home-${embedded?'extension':'platform'}-${width}.png`);
  await root.getByRole('button',{name:'Detailed list',exact:true}).click();await expect(root.locator('.ty-tool-snapshot').first()).toBeHidden();
  await root.getByRole('button',{name:'Preview grid',exact:true}).click();expect(await root.locator('.ty-resource--app').evaluateAll(els=>els.map(el=>el.getAttribute('style')))).toEqual(styles);
 }
});
for(const width of [1440,390])test(`Preview footer keeps both labeled actions in view at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 for(const embedded of [false,true]){
  const draft=await (await page.request.get(base+'/fixture/app-draft')).json();
  await page.goto(base+(embedded?'/?apps=1':'/apps/'+draft.preview.id+'?workspaceId='+draft.workspaceId+'&source=preview'));
  if(embedded){await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),draft);}
  const root=embedded?page.frameLocator('#app'):page,footer=root.locator('.ty-tracker-preview>.ty-action-footer');
  const save=footer.getByRole('button',{name:'Save app',exact:true}),discard=footer.getByRole('button',{name:'Discard app',exact:true});
  await expect(save).toBeEnabled();await expect(discard).toHaveText('Discard app');
  const box=await footer.boundingBox();expect(box.x).toBe(0);expect(box.width).toBe(width);expect(box.y+box.height).toBe(1000);
  for(const button of [save,discard]){const b=await button.boundingBox();expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(width);expect(b.y+b.height).toBeLessThanOrEqual(1000);}
  await discard.click();if(embedded){await expect(footer).toHaveCount(0);await expect(root.getByRole('heading',{name:'Home',exact:true})).toBeVisible();}else await expect(page).toHaveURL(base+'/');
 }
});
test('Saving a preview opened from extension Home returns to the refreshed Home',async({page})=>{
 const draft=await (await page.request.get(base+'/fixture/app-draft')).json();await page.goto(base+'/?apps=1');await page.waitForFunction(()=>window.hostReady);
 await page.evaluate(r=>window.deliver(r),{screen:'home',workspaceId:draft.workspaceId,viewerId:'fixture',workspaces:[],types:[]});
 const root=page.frameLocator('#app'),card=root.locator('article').filter({has:root.locator(`a[href*="${draft.preview.id}"]`)});
 await card.getByRole('button',{name:'Actions for Embedded draft'}).click();await root.getByRole('menuitem',{name:'Manage',exact:true}).click();
 await expect(root.getByRole('button',{name:'Save app',exact:true})).toBeEnabled();await root.getByRole('button',{name:'Save app',exact:true}).click();await expect(root.getByRole('heading',{name:'Home',exact:true})).toBeVisible();await expect(root.locator('.ty-tracker-preview')).toHaveCount(0);
 const call=async(name,args)=>(await (await page.request.post(base+'/fixture/tool',{data:{name,arguments:args}})).json()).structuredContent.result;
 const resolved=await call('resolve_tracker_preview',{previewId:draft.preview.id});const archive=await call('prepare_workspace_change',{operation:{kind:'archive_component',componentId:resolved.component.id,expectedVersion:resolved.component.version,archived:true}});await call('confirm_workspace_change',{previewId:archive.id,digest:archive.digest});
});
