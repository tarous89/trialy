const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
// WCAG relative luminance and contrast ratio, evaluated on computed colours in the page.
const contrastScript=()=>{
 const lum=([r,g,b])=>{const f=c=>{c/=255;return c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4;};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
 const parse=s=>{const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(Number);return {rgb:p.slice(0,3),a:p.length>3?p[3]:1};};
 const blend=(fg,bg)=>fg.rgb.map((c,i)=>Math.round(c*fg.a+bg[i]*(1-fg.a)));
 const background=el=>{let node=el;while(node&&node!==document.documentElement){const c=parse(getComputedStyle(node).backgroundColor);if(c&&c.a>0){if(c.a>=1)return c.rgb;const under=background(node.parentElement);return blend(c,under);}node=node.parentElement;}const root=parse(getComputedStyle(document.body).backgroundColor);return root&&root.a>0?root.rgb:[255,255,255];};
 const problems=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
 while((n=walker.nextNode())){const text=n.textContent.trim();if(!text)continue;const el=n.parentElement;if(!el||el.closest('[hidden],script,style'))continue;const rect=el.getBoundingClientRect();if(!rect.width||!rect.height)continue;const style=getComputedStyle(el);if(style.visibility==='hidden'||style.display==='none'||Number(style.opacity)===0)continue;
  const fg=parse(style.color);if(!fg)continue;const bg=background(el);const color=fg.a<1?blend(fg,bg):fg.rgb;const l1=lum(color),l2=lum(bg),ratio=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
  const size=parseFloat(style.fontSize),bold=Number(style.fontWeight)>=700,large=size>=24||(size>=18.66&&bold);const needed=large?3:4.5;
  if(ratio<needed)problems.push({text:text.slice(0,40),ratio:Math.round(ratio*100)/100,color:style.color,background:'rgb('+bg.join(',')+')',size});}
 return problems;
};
async function openPage(page,width){
 await page.setViewportSize({width,height:1000});
 const {token}=await (await page.request.get(base+'/fixture/exchange')).json();
 await page.goto(base+'/exchange#'+token);
 await expect(page.getByRole('heading',{level:1,name:'RFP: Phase II monitoring services'})).toBeVisible();
 await page.evaluate(()=>document.fonts.ready);
 return token;
}
for(const width of [1440,390])test(`Recipient page is usable, keyboard accessible and readable at ${width}px`,async({page})=>{
 await openPage(page,width);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 await expect(page.getByText('Powered by TrialAgents')).toBeVisible();
 await expect(page.getByText('Sent by Fixture')).toBeVisible();
 const tabs=page.getByRole('tab');await expect(tabs).toHaveCount(4);await expect(page.getByRole('tab',{name:/Brief/})).toHaveAttribute('aria-selected','true');
 // Keyboard: skip link, tab list with arrow keys, visible focus.
 await page.keyboard.press('Tab');await expect(page.locator('.xp-skip')).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.getByRole('tab',{name:/Brief/})).toBeFocused();
 await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:/Documents/})).toBeFocused();await expect(page.getByRole('tab',{name:/Documents/})).toHaveAttribute('aria-selected','true');
 await expect(page.getByRole('tabpanel')).toContainText('Confidentiality notice');
 await page.keyboard.press('End');await expect(page.getByRole('tab',{name:'Messages'})).toBeFocused();await expect(page.getByRole('tabpanel')).toContainText('Your messages are private');
 await page.keyboard.press('Home');await expect(page.getByRole('tab',{name:/Brief/})).toBeFocused();
 const outline=await page.getByRole('tab',{name:/Brief/}).evaluate(el=>getComputedStyle(el).outlineStyle);expect(outline).not.toBe('none');
 // Contrast ≥ 4.5:1 on every visible text node of each section.
 for(const name of [/Brief/,/Documents/,'Your response','Messages']){await page.getByRole('tab',{name}).click();const problems=await page.evaluate(contrastScript);expect(problems,JSON.stringify(problems)).toEqual([]);}
 // Acknowledgement unlocks downloads; the response form, requested document slot and message box are reachable.
 await page.getByRole('tab',{name:/Documents/}).click();await expect(page.getByText('Locked')).toBeVisible();
 await page.getByLabel('Your name').fill('Anna Example');await page.getByLabel('Your email').fill('anna@alpha.invalid');await page.getByRole('button',{name:'I accept'}).click();
 await expect(page.getByRole('button',{name:'Download RFP pack.pdf'})).toBeVisible();await expect(page.getByText('Locked')).toHaveCount(0);
 await page.getByRole('tab',{name:'Your response'}).click();await expect(page.getByLabel(/Name/)).toBeVisible();await expect(page.getByText('Signed CDA')).toBeVisible();await expect(page.getByText('Requested',{exact:true})).toBeVisible();
 await page.getByLabel(/Name/).fill('Alpha CRO');await page.getByRole('button',{name:'Save draft'}).click();await expect(page.getByRole('status').filter({hasText:'Draft saved'})).toBeVisible();
 await page.getByRole('button',{name:'Submit response'}).click();await page.getByRole('button',{name:'Confirm and submit'}).click();await expect(page.getByText('Submitted version 1. Thank you.')).toBeVisible();await expect(page.getByText(/Submitted version 1 on/)).toBeVisible();
 await page.getByRole('tab',{name:'Messages'}).click();await page.getByLabel(/Write to/).fill('Could you share the monitoring plan template?');await page.getByRole('button',{name:'Send message'}).click();await expect(page.getByText('Could you share the monitoring plan template?')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
