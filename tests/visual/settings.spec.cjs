const {test,expect}=require('@playwright/test');
for(const width of [1440,390])test(`Overview and actual tool settings at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:4179');await page.waitForFunction(()=>window.hostReady);
 const initial=await(await page.request.get('http://127.0.0.1:4179/fixture/initial')).json();await page.evaluate(r=>window.deliver(r),initial);
 const embed=page.frameLocator('#app'),tracker=embed.frameLocator('iframe[title="Saved frontend code"]');
 await expect(tracker.locator('.stat-head svg')).toHaveCount(2);
 const reference=await page.context().newPage();await reference.setViewportSize({width,height:1000});await reference.goto('http://127.0.0.1:4179/reference');
 for(const selector of ['.stat','.stat svg','.stat .number']){
 const props=['color','backgroundColor','fontSize','paddingTop','borderRadius'];const read=(el,ps)=>Object.fromEntries(ps.map(p=>[p,getComputedStyle(el)[p]]));
 expect(await tracker.locator(selector).first().evaluate(read,props)).toEqual(await reference.locator(selector).first().evaluate(read,props));
 }
 await tracker.getByRole('button',{name:'Tool settings',exact:true}).click();
 await expect(embed.getByRole('heading',{name:'Tool settings'})).toBeVisible();
 await expect(embed.getByRole('heading',{name:'Tabs',exact:true})).toBeVisible();
 await expect(embed.getByRole('heading',{name:'Columns',exact:true})).toBeVisible();
 await expect(embed.getByRole('combobox',{name:'Source table',exact:true})).toHaveCount(0);
 await reference.getByRole('button',{name:'Tracker settings',exact:true}).click();
 for(const selector of ['.settings-section','.settings-section h2','.settings-tabs button']){
 const props=['fontSize','color','backgroundColor','borderRadius','paddingTop','paddingBottom'];const read=(el,ps)=>Object.fromEntries(ps.map(p=>[p,getComputedStyle(el)[p]]));
 expect(await embed.locator('.ty-tool-settings '+selector).first().evaluate(read,props),selector).toEqual(await reference.locator(selector).first().evaluate(read,props));
 }
 await page.screenshot({path:`test-results/layout-${width}.png`,fullPage:true});
 await embed.getByRole('tab',{name:'Access control',exact:true}).click();
 await expect(embed.getByRole('heading',{name:'Owner & team access'})).toBeVisible();
 await expect(embed.getByRole('heading',{name:'Tab permissions',exact:true})).toBeVisible();
 await expect(embed.getByRole('combobox',{name:'Company permission',exact:true})).toBeVisible();
 await page.screenshot({path:`test-results/access-${width}.png`,fullPage:true});
 await embed.getByRole('tab',{name:'Layout',exact:true}).click();
 await embed.getByRole('button',{name:'Hide tab Contacts',exact:true}).click();
 await embed.getByRole('button',{name:'Save layout',exact:true}).click();
 await expect(tracker.getByRole('button',{name:'Companies',exact:true})).toBeVisible();
 await expect(tracker.getByRole('button',{name:'Contacts',exact:true})).toHaveCount(0);
 // Restore fixture for other tests, exercising save round trip again.
 await tracker.getByRole('button',{name:'Tool settings',exact:true}).click();
 await embed.getByRole('button',{name:'Show tab Contacts',exact:true}).click();
 await embed.getByRole('button',{name:'Save layout',exact:true}).click();
 await expect(tracker.getByRole('button',{name:'Contacts',exact:true})).toBeVisible();await reference.close();
});

test('a saved preview card reopens the saved tool instead of reporting expiry',async({page})=>{
 await page.goto('http://127.0.0.1:4179');await page.waitForFunction(()=>window.hostReady);
 const initial=await(await page.request.get('http://127.0.0.1:4179/fixture/initial')).json();
 await page.evaluate(r=>window.deliver({screen:'home',workspaceId:r.workspaceId,viewerId:'fixture',workspaces:[],types:[]}),initial);
 const embed=page.frameLocator('#app');await embed.getByRole('button',{name:'Open Saved preview card',exact:true}).click();
 await expect(embed.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:'Biotech outreach',exact:true})).toBeVisible();
 await expect(embed.getByRole('alert')).toHaveCount(0);
 await expect(embed.getByText('This preview was already saved. Your saved tracker is open.')).toHaveCount(0,{timeout:6000});
});
