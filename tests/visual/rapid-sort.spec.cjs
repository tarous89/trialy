const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
for(const embedded of [true,false])test(`Rapid sorting keeps both clicks while a read is pending in ${embedded?'extension':'platform'}`,async({page})=>{
 const f=await(await page.request.get(base+'/fixture/wide-tracker')).json();await page.goto(embedded?base:base+'/apps/'+f.component.id+'?workspaceId='+f.workspaceId+'&source=component');
 if(embedded){await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),f);}
 const root=embedded?page.frameLocator('#app'):page,tracker=root.frameLocator('iframe[title="Saved frontend code"]');
 await tracker.getByRole('button',{name:'Tab 0',exact:true}).click();await expect(tracker.locator('tbody tr')).toHaveCount(17);
 const host=root.locator('.ty-tracker-surface');await host.evaluate(()=>{window.sortEvents=0;window.addEventListener('message',e=>{if(e.data?.kind==='trialy.event'&&e.data.event?.action==='sort-field:field_2')window.sortEvents++;});});
 let release,requests=[];const held=new Promise(r=>release=r);
 await page.route(embedded?'**/fixture/tool':'**/organization/frontend/run',async route=>{const body=route.request().postDataJSON(),request=embedded?body.arguments?.request:body;if(request?.event?.action!=='sort-field:field_2')return route.continue();requests.push(request.state);const response=await route.fetch();if(requests.length===1)await held;return route.fulfill({response});});
 const sort=tracker.getByRole('button',{name:'Country',exact:true});await sort.click();await expect.poll(()=>requests.length).toBe(1);await sort.click();await expect.poll(()=>host.evaluate(()=>window.sortEvents)).toBe(2);release();
 await expect(tracker.locator('th[aria-sort="descending"] .sort-indicator')).toHaveText('↓');await expect(tracker.locator('tbody tr:first-child td:nth-child(3) .cell-display')).toHaveText('US');expect(requests).toHaveLength(2);
});
