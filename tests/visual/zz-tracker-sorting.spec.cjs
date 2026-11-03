const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
async function open(page,surface){
 const initial=await(await page.request.get(base+'/fixture/wide-tracker')).json();
 if(surface==='plugin'){await page.goto(base);await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),initial);}
 else await page.goto(base+'/apps/'+initial.component.id+'?workspaceId='+initial.workspaceId+'&source=component');
 const host=surface==='plugin'?page.frameLocator('#app'):page;
 const tracker=host.frameLocator('iframe[title="Saved frontend code"]');
 await tracker.getByRole('button',{name:'Tab 0',exact:true}).click();
 await expect(tracker.locator('tbody tr')).toHaveCount(17);
 return {host,tracker};
}
function requestBody(request){
 if(request.url().endsWith('/fixture/tool')){const b=request.postDataJSON();return b.name==='run_component_frontend'?b.arguments.request:null;}
 return request.url().endsWith('/frontend/run')?request.postDataJSON():null;
}
async function rows(tracker){return tracker.locator('tbody tr').evaluateAll(rows=>rows.map(row=>({
 name:row.querySelector('td:first-child .cell-display').textContent,
 country:row.querySelector('td:nth-child(3) .cell-display').textContent,
 details:row.querySelector('[data-action^="details:"]').getAttribute('data-action'),
 nameEdit:row.querySelector('td:first-child input').getAttribute('data-action'),
 countryEdit:row.querySelector('td:nth-child(3) select').getAttribute('data-action'),
})));}
for(const surface of ['plugin','app']){
 test(`${surface}: repeated cached sorting keeps rows, details and edit bindings together`,async({page})=>{
  const {tracker}=await open(page,surface),sort=tracker.getByRole('button',{name:'Country',exact:true});
  await sort.click();await expect(tracker.locator('tbody tr:first-child td:nth-child(3) .cell-display')).toHaveText('DE');
  await expect(tracker.locator('th[aria-sort="ascending"] .sort-indicator')).toHaveText('↑');const ascending=await rows(tracker);
  await sort.click();await expect(tracker.locator('tbody tr:first-child td:nth-child(3) .cell-display')).toHaveText('US');
  await expect(tracker.locator('th[aria-sort="descending"] .sort-indicator')).toHaveText('↓');const descending=await rows(tracker);
  for(const row of [...ascending,...descending]){expect(row.nameEdit.split(':')[2]).toBe(row.details.split(':')[1]);expect(row.countryEdit.split(':')[2]).toBe(row.details.split(':')[1]);}
  await expect(tracker.locator('th[aria-sort="descending"] .sort-indicator')).toHaveText('↓');
  let reads=0;await page.route('**/*',async route=>{if(requestBody(route.request())?.event?.action==='sort-field:field_2')reads++;await route.continue();});
  for(let i=0;i<6;i++){
   await sort.click();await expect.poll(()=>rows(tracker)).toEqual(i%2?descending:ascending);
   await expect(tracker.locator('th[aria-sort="'+(i%2?'descending':'ascending')+'"] .sort-indicator')).toHaveText(i%2?'↓':'↑');
  }
  expect(reads).toBe(0);
  await tracker.getByRole('button',{name:'Open record details',exact:true}).first().click();
  await expect(tracker.getByRole('dialog',{name:'Record details'}).getByRole('heading')).toHaveText(descending[0].name);
  await tracker.getByRole('button',{name:'Close details',exact:true}).click();
  await tracker.getByRole('button',{name:'Next',exact:true}).click();
  await expect(tracker.locator('tbody tr')).toHaveCount(8);
  await expect(tracker.locator('tbody tr:first-child td:nth-child(3) .cell-display')).toHaveText('DE');
  await tracker.getByRole('button',{name:'Previous',exact:true}).click();
  await expect.poll(()=>rows(tracker)).toEqual(descending);
  // Expired cached sorts must request a fresh authorized page.
  await tracker.locator('body').evaluate(()=>{const now=Date.now;Date.now=()=>now()+121000;});
  await sort.click();await expect.poll(()=>reads).toBe(1);
  await expect.poll(()=>rows(tracker)).toEqual(ascending);
 });
 test(`${surface}: cached searches rebind records and sorting protects unsaved edits`,async({page})=>{
  const {host,tracker}=await open(page,surface),search=tracker.getByRole('textbox',{name:'Search table'});
  await search.fill('value 1');await expect(tracker.locator('tbody tr')).toHaveCount(11);const first=await rows(tracker);
  await search.fill('value 2');await expect(tracker.locator('tbody tr')).toHaveCount(6);const second=await rows(tracker);
  await search.fill('value 1');await expect.poll(()=>rows(tracker)).toEqual(first);
  await search.fill('value 2');await expect.poll(()=>rows(tracker)).toEqual(second);
  const sort=tracker.getByRole('button',{name:'Country',exact:true});
  await sort.click();await expect(tracker.locator('tbody tr:first-child td:nth-child(3) .cell-display')).toHaveText('DE');
  await sort.click();await expect(tracker.locator('tbody tr:first-child td:nth-child(3) .cell-display')).toHaveText('US');
  const before=await rows(tracker);
  await tracker.getByRole('button',{name:'Edit Name',exact:true}).first().click();
  await tracker.getByRole('textbox',{name:'Name',exact:true}).first().fill('Unsaved name');
  await sort.click();
  await expect(host.getByText('Save or ignore your current edits before this action.',{exact:true})).toBeVisible();
  expect((await rows(tracker)).map(r=>r.details)).toEqual(before.map(r=>r.details));
  await expect(tracker.locator('tbody tr:first-child input[aria-label="Name"]')).toHaveValue('Unsaved name');
  await host.getByRole('button',{name:'Ignore edits',exact:true}).click();
  await expect.poll(()=>rows(tracker)).toEqual(before);
  await tracker.getByRole('button',{name:'Add record',exact:true}).click();
  await sort.click();await expect(host.getByText('Save or cancel the new row before this action.',{exact:true})).toBeVisible();
  await expect(tracker.getByRole('textbox',{name:'New Name',exact:true})).toBeVisible();
 });
}
