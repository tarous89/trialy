const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
test.beforeEach(async({page})=>{await page.request.post(base+'/fixture/reset-starters');});
for(const width of [1440,390])test(`Platform shell and catalog at ${width}`,async({page,context})=>{
 await page.setViewportSize({width,height:1000});
 await page.goto(base+'/app-home');
 await expect(page.getByRole('heading',{name:'Apps',exact:true})).toBeVisible();
 await expect(page.locator('.ty-sidebar')).toBeVisible();
 await expect(page.getByRole('button',{name:'Templates',exact:true})).toHaveCount(0);
 for(const name of ['ChatGPT','Claude'])await expect(page.locator('.ty-platform-header').getByRole('link',{name:'Open '+name})).toBeVisible();
 await page.getByRole('button',{name:'Collapse navigation',exact:true}).click();
 const launch=page.getByRole('link',{name:'Open Simple app fixture',exact:true});
 await expect(launch).not.toHaveAttribute('target','_blank');
 await launch.click();await expect(page).toHaveURL(/\/apps\//);
 await expect(page.locator('.ty-sidebar')).toHaveCount(0);
 await expect(page.locator('.ty-platform-brand')).toBeVisible();
 const frame=page.frameLocator('iframe[title="Saved frontend code"]');
 await expect(frame.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
 await frame.getByRole('link',{name:'Linked calculator',exact:true}).click();
 await expect(frame.getByRole('heading',{name:'Linked calculator',exact:true})).toBeVisible();
 expect(context.pages()).toHaveLength(1);
 await page.getByRole('button',{name:'Expand navigation',exact:true}).click();
 await expect(page.getByRole('button',{name:'Apps',exact:true})).toBeVisible();
 await page.screenshot({path:`/tmp/platform-shell-${width}.png`});
});
for(const width of [1440,390])test(`template gallery, filters and fullscreen preview at ${width}`,async({page,context})=>{
 await page.setViewportSize({width,height:1000});await page.goto(base+'/app-home');
 if(width<760)await page.getByRole('button',{name:'Collapse navigation',exact:true}).click();
 await expect(page.getByRole('region',{name:'App templates'})).toHaveCount(0);
 await page.getByRole('link',{name:'Browse app templates',exact:true}).click();
 await expect(page).toHaveURL(/tab=templates/);
 if(width<760)await page.getByRole('button',{name:'Collapse navigation',exact:true}).click();
 const catalog=page.getByRole('region',{name:'App templates'});await expect(catalog.locator('article')).toHaveCount(23);
 await page.getByLabel('Team',{exact:true}).selectOption('Biotech');await page.getByLabel('Workflow',{exact:true}).selectOption('Finance');
 await expect(catalog.locator('article')).toHaveCount(1);
 const card=catalog.locator('article');await expect(card.getByRole('heading',{name:'Runway',exact:true})).toBeVisible();
 await expect(card.getByRole('button')).toHaveCount(2);await expect(card.getByRole('link')).toHaveCount(0);
 await expect(card.getByText('Customizable and usable in ChatGPT and Claude.')).toBeVisible();
 await expect(card.locator('img')).toHaveJSProperty('naturalWidth',1440);
 await page.getByRole('searchbox',{name:'Search templates'}).fill('no matching app');await expect(page.getByRole('heading',{name:'No templates match'})).toBeVisible();
 await page.getByRole('searchbox',{name:'Search templates'}).fill('Cash');
 await card.getByRole('button',{name:'Preview',exact:true}).click();
 const modal=page.getByRole('dialog',{name:'Runway preview'});await expect(modal).toBeVisible();
 await expect(modal.locator('.ty-preview-description')).toContainText('runway by program');
 const frame=page.frameLocator('iframe[title="Runway interactive preview"]');await expect(frame.locator('body')).toContainText('Runway');
 await expect(modal.locator('iframe')).toHaveAttribute('sandbox','allow-scripts');
 await modal.getByRole('button',{name:'Fullscreen preview'}).click();await expect(modal).toHaveClass(/is-expanded/);
 const box=await modal.boundingBox();expect(box.width).toBe(width);expect(box.height).toBe(1000);
 await page.screenshot({path:`/tmp/gallery-fullscreen-${width}.png`});
 await modal.getByRole('button',{name:'Close preview'}).click();await expect(modal).not.toBeVisible();
 await page.getByLabel('Team',{exact:true}).selectOption('');await page.getByLabel('Workflow',{exact:true}).selectOption('');await page.getByRole('searchbox',{name:'Search templates'}).fill('');
 await page.screenshot({path:`/tmp/gallery-page-${width}.png`});
 await expect(page.locator('body')).toHaveJSProperty('scrollWidth',width);
 const cash=catalog.locator('article').filter({has:page.getByRole('heading',{name:'Runway',exact:true})});await cash.getByRole('button',{name:'Use',exact:true}).click();
 // Use asks once: per existing table Connect (selected) or Create new, and who can use the app.
 const choice=page.getByRole('dialog',{name:/^(Use existing data\?|Add Runway)$/});await Promise.race([page.waitForURL(/\/apps\//),choice.waitFor()]);
 if(await choice.isVisible()){
  if(await choice.getByRole('radio',{name:'Connect'}).count())await expect(choice.getByRole('radio',{name:'Connect'}).first()).toHaveAttribute('aria-checked','true');
  await expect(choice.getByRole('combobox',{name:'Access for Claude'})).toHaveValue('propose');
  await page.screenshot({path:`/tmp/gallery-data-access-${width}.png`});
  expect(await choice.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await choice.getByRole('button',{name:'Add app',exact:true}).click();
 }
 await expect(page).toHaveURL(/\/apps\//);expect(context.pages()).toHaveLength(1);
 await expect(page.locator('.ty-app-assistants')).toHaveCount(0);
 await expect(page.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:'Runway',exact:true})).toBeVisible();
 for(const name of ['ChatGPT','Claude']){const link=page.locator('.ty-platform-header').getByRole('link',{name:'Open '+name});await expect(link).toBeVisible();expect(await link.locator('img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);}
 await page.screenshot({path:`/tmp/gallery-installed-${width}.png`});
});
test('every approved template renders an isolated interactive preview',async({page})=>{
 await page.goto(base+'/app-home?tab=templates');
 const cards=page.locator('.ty-gallery-card');await expect(cards).toHaveCount(23);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(let i=0;i<23;i++){
  await cards.nth(i).getByRole('button',{name:'Preview',exact:true}).click();
  const modal=page.getByRole('dialog'),frame=page.frameLocator('.ty-template-preview iframe');
  await expect(frame.locator('h1').first()).toBeVisible();
  await expect.poll(()=>frame.locator('body').innerText()).not.toMatch(/TypeError|ReferenceError|SyntaxError/);
  expect(await frame.locator('img').evaluateAll(images=>images.every(img=>img.complete&&img.naturalWidth>0))).toBe(true);
  await modal.getByRole('button',{name:'Close preview'}).click();
 }
 expect(errors).toEqual([]);
});
for(const width of [1440,390])test(`new users browse templates on their dedicated page at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.route('**/api/account/home',route=>route.fulfill({json:{projects:[],resources:[],total:0}}));await page.goto(base+'/app-home');
 if(width<760)await page.getByRole('button',{name:'Collapse navigation',exact:true}).click();
 await expect(page.getByRole('link',{name:'Browse app templates'})).toBeVisible();await expect(page.locator('.ty-template-catalog')).toHaveCount(0);
});
