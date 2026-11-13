const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
// Room mode (docs/product/EXTERNAL_EXCHANGE.md §5): Room · Q&A, numbered index, level entry step, view-only, questions.
const contrastScript=()=>{
 const lum=([r,g,b])=>{const f=c=>{c/=255;return c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4;};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
 const parse=s=>{const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(Number);return {rgb:p.slice(0,3),a:p.length>3?p[3]:1};};
 const blend=(fg,bg)=>fg.rgb.map((c,i)=>Math.round(c*fg.a+bg[i]*(1-fg.a)));
 const background=el=>{let node=el;while(node&&node!==document.documentElement){const c=parse(getComputedStyle(node).backgroundColor);if(c&&c.a>0){if(c.a>=1)return c.rgb;return blend(c,background(node.parentElement));}node=node.parentElement;}return [255,255,255];};
 const problems=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
 while((n=walker.nextNode())){const text=n.textContent.trim();if(!text)continue;const el=n.parentElement;if(!el||el.closest('[hidden],script,style'))continue;const rect=el.getBoundingClientRect();if(!rect.width||!rect.height)continue;const style=getComputedStyle(el);if(style.visibility==='hidden'||style.display==='none'||Number(style.opacity)===0)continue;
  const fg=parse(style.color);if(!fg)continue;const bg=background(el);const color=fg.a<1?blend(fg,bg):fg.rgb;const l1=lum(color),l2=lum(bg),ratio=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
  const size=parseFloat(style.fontSize),bold=Number(style.fontWeight)>=700,needed=size>=24||(size>=18.66&&bold)?3:4.5;if(ratio<needed)problems.push({text:text.slice(0,40),ratio:Math.round(ratio*100)/100});}
 return problems;
};
for(const width of [1440,390])test(`Room page: index, levels, view-only and Q&A at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 const {token}=await (await page.request.get(base+'/fixture/room')).json();
 await page.goto(base+'/exchange#'+token);
 await expect(page.getByRole('heading',{level:1,name:'Project Atlas data room'})).toBeVisible();await page.evaluate(()=>document.fonts.ready);
 await expect(page.getByText('Access until revoked')).toBeVisible();await expect(page.getByRole('tab')).toHaveCount(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 await expect(page.getByRole('heading',{name:/Overview/})).toBeVisible();const room=page.locator('#panel-room');await expect(room.getByText('Atlas teaser.pdf')).toBeVisible();
 await expect(page.getByRole('button',{name:'Download Process letter'})).toHaveCount(0);await expect(page.getByRole('button',{name:'View Process letter'})).toBeVisible();
 await expect(page.getByText('Board summary.pdf')).toHaveCount(0,{timeout:1000});await expect(page.getByText('Board materials: 1 more documents')).toBeVisible();
 expect(await page.evaluate(contrastScript)).toEqual([]);
 await page.keyboard.press('Tab');await expect(page.locator('.xp-skip')).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('tab',{name:/Room/})).toBeFocused();
 await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'Q&A'})).toHaveAttribute('aria-selected','true');await page.keyboard.press('ArrowLeft');
 await page.getByLabel('Your name').fill('Pia Example');await page.getByLabel('Your email').fill('pia@pharma.invalid');await page.getByRole('button',{name:'I accept'}).click();
 await expect(room.getByText('Board summary.pdf')).toBeVisible();
 await page.getByLabel('Search the room').fill('board');await page.getByRole('button',{name:'Search',exact:true}).click();await expect(page.getByRole('heading',{name:'Results'})).toBeVisible();
 await page.getByRole('button',{name:'View Process letter'}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('tab',{name:'Q&A'}).click();await page.getByLabel('Your question').fill('Is the process letter final?');await page.getByLabel('About (optional)').selectOption({label:'Process letter'});await page.getByRole('button',{name:'Ask'}).click();
 await expect(page.getByText('Is the process letter final?')).toBeVisible();await expect(page.getByText('Waiting for an answer.')).toBeVisible();
 expect(await page.evaluate(contrastScript)).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
