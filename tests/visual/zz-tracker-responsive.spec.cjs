const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
async function open(page,surface){
 const initial=await(await page.request.get(base+'/fixture/wide-tracker')).json();
 if(surface==='plugin'){await page.goto(base);await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),initial);}
 else await page.goto(base+'/apps/'+initial.component.id+'?workspaceId='+initial.workspaceId+'&source=component');
 const host=surface==='plugin'?page.frameLocator('#app'):page;
 return {host,tracker:host.frameLocator('iframe[title="Saved frontend code"]')};
}
function requestBody(request){
 if(request.url().endsWith('/fixture/tool')){const b=request.postDataJSON();return b.name==='run_component_frontend'?b.arguments.request:null;}
 return request.url().endsWith('/frontend/run')?request.postDataJSON():null;
}
for(const surface of ['plugin','app']){
 test(`${surface}: wide tracker toolbar stays on one line and filters survive resizing`,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const {tracker}=await open(page,surface);await tracker.getByRole('button',{name:'Tab 0',exact:true}).click();
  for(const width of [320,390,768,1100,1440]){
   await page.setViewportSize({width,height:1000});
   const search=tracker.getByRole('textbox',{name:'Search this page'}),add=tracker.getByRole('button',{name:'Add record',exact:true});
   await expect(add).toBeVisible();
   await expect.poll(async()=>{const a=await add.boundingBox(),b=await search.boundingBox();return Math.abs(a.y+a.height/2-b.y-b.height/2);}).toBeLessThan(2);
   expect(await tracker.locator('body').evaluate(el=>el.scrollWidth<=innerWidth)).toBe(true);
   const toggle=tracker.getByRole('button',{name:'Filter options',exact:true}),collapsed=await toggle.isVisible();
   if(collapsed){await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');}
   const panel=tracker.getByRole('group',{name:'Filters and sorting'});await expect(panel).toBeVisible();
   const box=await panel.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
   expect(await panel.evaluate(el=>Array.from(el.querySelectorAll('select')).every(select=>{const r=select.getBoundingClientRect();return el.contains(document.elementFromPoint(r.right-12,r.top+r.height/2));}))).toBe(true);
   await tracker.getByRole('combobox',{name:'Filter by Qualification 1',exact:true}).selectOption('Active');
   await expect(tracker.locator('tbody tr')).toHaveCount(13);
   await tracker.getByRole('combobox',{name:'Filter by Qualification 1',exact:true}).press('Escape');
   if(collapsed){await expect(toggle).toBeFocused();await expect(toggle).toHaveAttribute('aria-expanded','false');}
  }
  await page.setViewportSize({width:390,height:1000});await tracker.getByRole('button',{name:'Filter options',exact:true}).click();
  await expect(tracker.getByRole('combobox',{name:'Filter by Qualification 1',exact:true})).toHaveValue('Active');
  await page.screenshot({path:`test-results/responsive-${surface}.png`});
  await tracker.getByRole('heading',{name:'Responsive tracker'}).click();await expect(tracker.getByRole('button',{name:'Filter options',exact:true})).toHaveAttribute('aria-expanded','false');expect(errors).toEqual([]);
 });
 test(`${surface}: a click shares pending prefetch and layout save returns rendered output`,async({page})=>{
  let release,seen=0;const gate=new Promise(r=>release=r);
  await page.route('**/*',async route=>{const r=requestBody(route.request());if(r?.event?.action==='tab:0'){seen++;await gate;}await route.continue();});
  const {host,tracker}=await open(page,surface);
  await expect.poll(()=>seen).toBe(1);
  await tracker.getByRole('button',{name:'Tab 0',exact:true}).click();
  // Hold the server result while the foreground click is handled.
  await page.waitForTimeout(200);expect(seen).toBe(1);release();
  await expect(tracker.locator('tbody tr')).toHaveCount(17);
  await page.unroute('**/*');
  for(const i of [1,2,3]){await tracker.getByRole('button',{name:'Tab '+i,exact:true}).click();await expect(tracker.locator('tbody tr').first()).toContainText('Tab '+i+' value');}
  // All four pages are authorized and warm. A navigation read would now fail.
  let coldReads=0;await page.route('**/*',async route=>{const r=requestBody(route.request());if(/^tab:/.test(r?.event?.action??'')){coldReads++;await route.abort();}else await route.continue();});
  for(const i of [0,1,2,3]){await tracker.getByRole('button',{name:'Tab '+i,exact:true}).click();await expect(tracker.locator('tbody tr').first()).toContainText('Tab '+i+' value');}
  expect(coldReads).toBe(0);await page.unroute('**/*');
  await tracker.getByRole('button',{name:'App settings',exact:true}).click();
  await host.getByRole('button',{name:'Hide tab Tab 3',exact:true}).click();
  let opens=0,reads=0;const listener=r=>{const req=requestBody(r);if(req&&(!req.event||req.event.kind==='open'))opens++;
   if(r.url().endsWith('/fixture/tool')){const b=r.postDataJSON();if(b.name==='read_project_component'){expect(b.arguments.includeOutput).toBe(true);reads++;}}
   else if(/\/components\/[^/?]+\?includeOutput=true$/.test(r.url()))reads++;
  };page.on('request',listener);
  await host.getByRole('button',{name:'Save layout',exact:true}).click();
  await expect(tracker.getByRole('button',{name:'Tab 2',exact:true})).toBeVisible();await expect(tracker.getByRole('button',{name:'Tab 3',exact:true})).toHaveCount(0);
  expect(reads).toBe(1);expect(opens).toBe(0);page.off('request',listener);
  await tracker.getByRole('button',{name:'App settings',exact:true}).click();await host.getByRole('button',{name:'Show tab Tab 3',exact:true}).click();await host.getByRole('button',{name:'Save layout',exact:true}).click();await expect(tracker.getByRole('button',{name:'Tab 3',exact:true})).toBeVisible();
 });
}
