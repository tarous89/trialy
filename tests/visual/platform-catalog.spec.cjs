const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
for(const width of [1440,390])test(`Platform shell and catalog at ${width}`,async({page,context})=>{
 await page.setViewportSize({width,height:1000});
 await page.goto(base+'/app-home');
 await expect(page.getByRole('heading',{name:'Apps',exact:true})).toBeVisible();
 await expect(page.locator('.ty-sidebar')).toBeVisible();
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
test('approved catalog can install a ready-to-use app in this tab',async({page})=>{
 await page.goto(base+'/app-home');
 await expect(page.getByRole('link',{name:'Open Simple app fixture',exact:true})).toBeVisible();
 if(!await page.locator('.ty-template-browser').evaluate(el=>el.open))await page.getByText('Browse app templates',{exact:true}).click();
 const catalog=page.getByRole('region',{name:'App templates'});
 await page.screenshot({path:'/tmp/template-catalog.png'});
 await expect(catalog.getByRole('button',{name:'Use app'})).toHaveCount((await (await page.request.post(base+'/api/app-templates/list',{data:{limit:50}})).json()).total);
 const card=catalog.locator('article').filter({has:page.getByRole('heading',{name:/Cash Runway/i})});
 await expect(card.getByRole('link',{name:'ChatGPT',exact:true})).toBeVisible();
 await expect(card.getByRole('link',{name:'Claude',exact:true})).toBeVisible();
 await card.getByRole('button',{name:'Use app'}).click();
 await expect(page).toHaveURL(/\/apps\//);
 await expect(page.frameLocator('iframe[title="Saved frontend code"]').locator('body')).toContainText(/Cash|Runway/i);
});

for(const width of [1440,390])test(`new users see the approved templates at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 await page.route('**/api/account/home',route=>route.fulfill({json:{projects:[],resources:[],total:0}}));
 await page.goto(base+'/app-home');
 await expect(page.getByRole('heading',{name:'Apps',exact:true})).toBeVisible();
 if(width<760)await page.getByRole('button',{name:'Collapse navigation',exact:true}).click();
 await expect(page.locator('.ty-template-browser')).toHaveAttribute('open','');
 await expect(page.getByRole('region',{name:'App templates'}).getByRole('button',{name:'Use app'}).first()).toBeVisible();
 await expect(page.locator('body')).toHaveJSProperty('scrollWidth',width);
 await page.screenshot({path:`/tmp/new-user-templates-${width}.png`});
});
