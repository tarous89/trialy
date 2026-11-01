const {test,expect}=require('./test.cjs');
let server;test.beforeAll(async()=>{const{createServer}=await import('vite');server=await createServer({server:{host:'127.0.0.1',port:4180,strictPort:true}});await server.listen();});test.afterAll(async()=>{await server?.close();});
for(const embedded of [false,true])for(const width of [1440,390])test(`single scroll ownership ${embedded?'plugin':'app'} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:850});
 for(const view of ['tools','logs','database','documents','automation','access','records','settings','modal']){
  await page.goto(`http://127.0.0.1:4180/tests/visual/scroll-fixture.html?view=${view}${embedded?'&embedded':''}`);
  if(['tools','logs','database'].includes(view))await page.getByRole('navigation',{name:'Pagination'}).waitFor();
  await page.waitForTimeout(100);
  const audit=await page.evaluate(()=>{
   const scrolls=[...document.querySelectorAll('*')].filter(e=>e.getClientRects().length&&e.scrollHeight>e.clientHeight+2&&/^(auto|scroll)$/.test(getComputedStyle(e).overflowY));
   return{owners:scrolls.map(e=>e.id||e.className),nested:scrolls.filter(e=>scrolls.some(p=>p!==e&&p.contains(e))).map(e=>e.id||e.className),bodyScroll:document.documentElement.scrollHeight>innerHeight+2};
  });expect(audit.nested,view+JSON.stringify(audit)).toEqual([]);expect(audit.bodyScroll,view).toBe(false);
  if(['tools','logs','database'].includes(view)){
   const nav=page.getByRole('navigation',{name:'Pagination'});const owner=view==='database'?page.locator('.ty-db-grid'):page.locator('#ty-main');
   const before=await nav.boundingBox();await owner.evaluate(e=>{e.scrollTop=e.scrollHeight;});const after=await nav.boundingBox();expect(after.y,view).toBeLessThan(before.y);expect(after.y+after.height,view).toBeLessThanOrEqual(850);
  }
 }
});

test('Access resolves its default subject once and refetches on deliberate selection',async({page})=>{
 await page.goto('http://127.0.0.1:4180/tests/visual/scroll-fixture.html?view=access-performance');
 const subject=page.getByRole('combobox',{name:'Users and connections'});
 await expect(subject).toHaveValue('owner');
 const count=()=>page.evaluate(()=>window.pageCalls.filter(n=>n==='read_access_grid').length);
 expect(await count()).toBe(1);
 await subject.selectOption('member');await expect.poll(count).toBe(2);
 await subject.selectOption('owner');await expect.poll(count).toBe(3);
});
for(const inactive of [true,false])test(`Tools polling respects page visibility: ${inactive?'hidden':'visible'}`,async({page})=>{
 await page.clock.install();
 await page.goto('http://127.0.0.1:4180/tests/visual/scroll-fixture.html?view=tools'+(inactive?'&inactive':''));
 const count=()=>page.evaluate(()=>window.pageCalls.filter(n=>n==='read_account_home').length);
 await expect.poll(count).toBe(1);
 await page.clock.runFor(31000);
 await expect.poll(count).toBe(inactive?1:2);
});

test('Projects show apps by default and apps expand into optional parts',async({page})=>{
 await page.goto('http://127.0.0.1:4180/tests/visual/scroll-fixture.html?view=access-sections');
 await expect(page.getByText('Research project',{exact:true})).toBeVisible();
 await expect(page.getByText('Research tracker',{exact:true})).toBeVisible();
 await expect(page.getByText('Records tab',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Expand Research tracker',exact:true}).click();
 await expect(page.getByText('Records tab',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Collapse Research project',exact:true}).click();
 await expect(page.getByText('Research tracker',{exact:true})).toHaveCount(0);
});

for(const embedded of [false,true])for(const width of [1440,390])test(`Logs app filter and inline wrapping filters ${embedded?'plugin':'app'} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto(`http://127.0.0.1:4180/tests/visual/scroll-fixture.html?view=logs${embedded?'&embedded':''}`);
 await page.getByRole('combobox',{name:'App',exact:true}).selectOption('signals-app');
 await expect.poll(()=>page.evaluate(()=>window.pageArgs.filter(r=>r.name==='read_workspace_activity').at(-1)?.args.appId)).toBe('signals-app');
 await page.getByRole('button',{name:'More filters',exact:true}).click();await expect(page.getByLabel('Actor ID',{exact:true})).toBeVisible();await expect(page.getByLabel('Resource ID',{exact:true})).toBeVisible();
 const boxes=await page.locator('#ty-log-extra-filters>label').evaluateAll(labels=>labels.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,position:getComputedStyle(e).position};}));
 for(let i=0;i<boxes.length;i++){const a=boxes[i];expect(a.position).toBe('static');expect(a.x).toBeGreaterThanOrEqual(0);expect(a.x+a.w).toBeLessThanOrEqual(width);for(const b of boxes.slice(i+1))expect(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y).toBe(true);}
 if(width===1440)expect(new Set(boxes.map(b=>Math.round(b.y))).size).toBeLessThanOrEqual(2);
 for(const label of await page.locator('.ty-log-text-filter').all()){const field=await label.boundingBox(),input=await label.locator('input').boundingBox();expect(input.y).toBeGreaterThanOrEqual(field.y);expect(input.y+input.height).toBeLessThanOrEqual(field.y+field.height);}const list=await page.locator('.ty-log-list').boundingBox();expect(list.y).toBeGreaterThan(Math.max(...boxes.map(b=>b.y+b.h)));
 await page.getByLabel('From',{exact:true}).fill('2026-10-01');await page.getByRole('button',{name:'Fewer filters',exact:true}).click();await expect(page.getByLabel('Actor ID',{exact:true})).toBeHidden();await page.getByRole('button',{name:'More filters',exact:true}).click();await expect(page.getByLabel('From',{exact:true})).toHaveValue('2026-10-01');
 await expect(page.locator('body')).toHaveJSProperty('scrollWidth',width);await page.screenshot({path:`/tmp/trialy-logs-${embedded?'plugin':'app'}-${width}.png`,fullPage:true});
});
