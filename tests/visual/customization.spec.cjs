const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
async function open(page){await page.goto(base);await page.waitForFunction(()=>window.hostReady);const initial=await(await page.request.get(base+'/fixture/initial')).json();await page.evaluate(r=>window.deliver(r),initial);const embed=page.frameLocator('#app');return {embed,tracker:embed.frameLocator('iframe[title="Saved frontend code"]')};}

test('overview and data pagination replace rows; multiple values support keyboard add/remove',async({page})=>{
 const {embed,tracker}=await open(page);
 await expect(tracker.locator('table')).toHaveCount(1);
 await expect(tracker.locator('tbody tr')).toHaveCount(25);
 await tracker.getByRole('button',{name:'Next',exact:true}).click();
 await expect(tracker.locator('tbody tr')).toHaveCount(1);
 await tracker.getByRole('button',{name:'Previous',exact:true}).click();
 await expect(tracker.locator('tbody tr')).toHaveCount(25);
 await tracker.getByRole('combobox',{name:'Next steps section'}).selectOption('1');
 await expect(tracker.locator('table')).toHaveCount(1);await expect(tracker.getByText('No next steps on this page.')).toBeVisible();
 await tracker.getByRole('button',{name:'Companies',exact:true}).click();
 const first=tracker.locator('tbody tr').first();await first.getByRole('button',{name:'Edit Status',exact:true}).click();
 const add=first.getByRole('button',{name:'Add Status value',exact:true});await add.focus();await add.press('Enter');
 await expect(first.locator('.multi-value-row select')).toHaveCount(3);
 await first.getByRole('combobox',{name:'Status 3',exact:true}).selectOption('Blocked');
 await first.getByRole('button',{name:'Remove Status 2',exact:true}).click();
 await expect(first.locator('.multi-value-row select')).toHaveCount(2);
 await expect(first.locator('.cell-input:not([hidden])')).toBeVisible();
 await tracker.getByRole('heading',{name:'Biotech outreach'}).click();
 await expect(first.locator('.cell-display .pill')).toHaveCount(2);
 await embed.getByRole('button',{name:'Ignore edits',exact:true}).click();
 await tracker.getByRole('button',{name:'Next',exact:true}).click();await expect(tracker.locator('tbody tr')).toHaveCount(1);
 await tracker.getByRole('button',{name:'Contacts',exact:true}).click();
 await tracker.getByRole('button',{name:'Edit Status',exact:true}).click();
 await tracker.getByRole('button',{name:'Add Status value',exact:true}).click();
 await expect(tracker.locator('.multi-value-row select')).toHaveCount(2);
 await tracker.getByRole('combobox',{name:'Status 2',exact:true}).selectOption('Blocked');
 await tracker.getByRole('heading',{name:'Biotech outreach'}).click();
 await expect(tracker.locator('tbody .cell-display .pill')).toHaveCount(2);
 await expect(embed.getByRole('button',{name:'Save changes',exact:true})).toHaveCount(0);
});

test('Settings adds a field and tab with reviewed schema changes, themes and removes the views',async({page})=>{
 const {embed,tracker}=await open(page);
 await tracker.getByRole('button',{name:'Tool settings',exact:true}).click();
 await expect(embed.getByText('Loading data sources…')).toHaveCount(0);
 await embed.getByRole('button',{name:'Add column',exact:true}).click();
 const addColumn=embed.locator('.settings-section').filter({has:embed.getByRole('heading',{name:'Add column',exact:true})});
 await addColumn.getByRole('textbox',{name:'Name',exact:true}).fill('Research notes');
 await addColumn.getByRole('button',{name:'Add to layout',exact:true}).click();
 await embed.getByRole('button',{name:'Add tab',exact:true}).click();
 const addTab=embed.locator('.settings-section').filter({has:embed.getByRole('heading',{name:'Add tab',exact:true})});
 await addTab.getByRole('textbox',{name:'Name',exact:true}).fill('New activities');await addTab.getByRole('button',{name:'Add to layout',exact:true}).click();
 await embed.getByRole('tab',{name:'Style',exact:true}).click();
 await embed.getByRole('textbox',{name:'primary color',exact:true}).fill('#003B71');await embed.getByRole('textbox',{name:'accent color',exact:true}).fill('#00A3E0');
 await embed.getByRole('button',{name:'Save layout',exact:true}).click();
 await expect(embed.getByRole('heading',{name:'Review changes',exact:true})).toBeVisible();
 await embed.getByRole('button',{name:'Confirm changes',exact:true}).click();
 await expect(tracker.getByRole('button',{name:'New activities',exact:true})).toBeVisible();
 await expect(tracker.locator('h1')).toHaveCSS('color','rgb(0, 59, 113)');
 await tracker.getByRole('button',{name:'Tool settings',exact:true}).click();
 await embed.getByRole('button',{name:'Delete tab New activities',exact:true}).click();
 await embed.getByRole('button',{name:'Delete column Research notes',exact:true}).click();
 await embed.getByRole('tab',{name:'Style',exact:true}).click();await embed.getByRole('button',{name:'Reset to Vivid defaults',exact:true}).click();
 await embed.getByRole('button',{name:'Save layout',exact:true}).click();
 await expect(tracker.getByRole('button',{name:'New activities',exact:true})).toHaveCount(0);
 await tracker.getByRole('button',{name:'Companies',exact:true}).click();await expect(tracker.locator('tbody tr')).toHaveCount(25);
});

test('cached tabs remain local beyond the former fifteen-second expiry',async({page})=>{
 const {tracker}=await open(page);
 await tracker.getByRole('button',{name:'Companies',exact:true}).click();
 await tracker.getByRole('button',{name:'Contacts',exact:true}).click();
 await tracker.getByRole('button',{name:'Companies',exact:true}).click();
 // Wait for the next-page prefetch, then count any subsequent navigation requests.
 await expect.poll(async()=>{const calls=await(await page.request.get(base+'/fixture/calls')).json();return calls.filter(x=>x==='run_component_frontend').length;}).toBeGreaterThan(3);
 const frame=page.frames().find(f=>f.url().includes('/frontend/frame'));
 await frame.evaluate(()=>{const now=Date.now;Date.now=()=>now()+20000;});
 let navigations=0;page.on('request',r=>{if(r.url().endsWith('/fixture/tool')){const body=r.postDataJSON();if(body.name==='run_component_frontend'&&/^tab:/.test(body.arguments.request.event.action||''))navigations++;}});
 await tracker.getByRole('button',{name:'Contacts',exact:true}).click();await expect(tracker.locator('tbody tr')).toHaveCount(1);
 await tracker.getByRole('button',{name:'Companies',exact:true}).click();await expect(tracker.locator('tbody tr')).toHaveCount(25);
 expect(navigations).toBe(0);
});
