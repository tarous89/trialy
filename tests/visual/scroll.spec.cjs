const {test,expect}=require('@playwright/test');
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
