const {test,expect}=require('@playwright/test');
for(const width of [1440,390])test(`Extracted components match original HTML at ${width}px`,async({page,context})=>{
 await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:4179/vivid-catalog');
 const ref=await context.newPage();await ref.setViewportSize({width,height:1000});await ref.goto('http://127.0.0.1:4179/reference');
 const props=['fontFamily','fontSize','fontWeight','color','backgroundColor','paddingTop','paddingBottom','paddingLeft','paddingRight','borderRadius','borderColor','gap','gridTemplateColumns','strokeWidth'];
 const read=(el,ps)=>Object.fromEntries(ps.map(p=>[p,getComputedStyle(el)[p]]));
 for(const selector of ['body','h1','.subtitle','.tabs-shell','.tab','.stat','.stat svg','.stat .number','.stat .label','.search','.filter','.pill.green','.tag','.expand-row']){
  // Some value variants are inside a different reference tab.
  if(await ref.locator(selector).count()===0)await ref.getByRole('tab',{name:'Vendors',exact:true}).click();
  expect(await page.locator(selector).first().evaluate(read,props),selector).toEqual(await ref.locator(selector).first().evaluate(read,props));
 }
 // Compare actual icon geometry, not merely presence or color.
 const geometry=el=>Array.from(el.children).map(n=>[n.tagName,...Array.from(n.attributes).map(a=>[a.name,a.value]).filter(a=>a[0]!=='aria-hidden')]);
 for(let i=0;i<4;i++)expect(await page.locator('.stat svg').nth(i).evaluate(geometry)).toEqual(await ref.locator('.stat svg').nth(i).evaluate(geometry));
 await ref.getByRole('button',{name:'Tracker settings',exact:true}).click();
 for(const selector of ['.settings-section','.settings-section h2','.settings-field input','.layout-entry.tab-layout-row','.layout-entry.column-layout-row','.drag-grip svg','.settings-tabs']){
  expect(await page.locator(selector).first().evaluate(read,props),selector).toEqual(await ref.locator(selector).first().evaluate(read,props));
 }
 await ref.getByRole('tab',{name:'Access control',exact:true}).click();
 for(const selector of ['.avatar.role-owner','.role-select.role-owner','.permission-select.can-edit'])expect(await page.locator(selector).first().evaluate(read,props),selector).toEqual(await ref.locator(selector).first().evaluate(read,props));
 await page.screenshot({path:`test-results/vivid-catalog-${width}.png`,fullPage:true});await ref.close();
});
