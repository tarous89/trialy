const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
// Update rooms (docs/product/EXTERNAL_EXCHANGE.md §6): the update page (content, "I can help", earlier updates) and the update email
// rendered under the constraints of Gmail, Outlook and Apple Mail. Fixtures are readable text (tests/fixtures/exchange-update.ts) and
// AI-readable platform documents; checks are on layout, images, links and contrast rather than pixel snapshots.
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
const layout=()=>{const vw=document.documentElement.clientWidth;const images=[...document.images].map(i=>({alt:i.alt,complete:i.complete,natural:i.naturalWidth,width:i.getBoundingClientRect().width,overflow:i.getBoundingClientRect().right>vw+1}));
 const wide=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>vw+1&&!e.closest('[style*="display:none"]');}).map(e=>e.tagName+':'+Math.round(e.getBoundingClientRect().right)).slice(0,5);
 return {scroll:document.documentElement.scrollWidth,vw,images,wide};};

for(const width of [1440,390])test(`Update page: content, "I can help" and earlier updates at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 const fixture=await (await page.request.get(base+'/fixture/update')).json();
 await page.goto(base+'/exchange#'+fixture.token);
 await expect(page.getByRole('heading',{level:1,name:'Acme Bio — October 2026 board update'})).toBeVisible();await page.evaluate(()=>document.fonts.ready);
 await expect(page.getByRole('tab')).toHaveCount(2);await expect(page.getByRole('tab',{name:'Update',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.getByRole('tab',{name:'Q&A'})).toHaveCount(0);
 const update=page.locator('#panel-update');await expect(update.getByRole('heading',{name:'Cash and runway'})).toBeVisible();await expect(update.getByRole('cell',{name:'14.2 months'})).toBeVisible();
 await expect(update.getByText('document.title')).toHaveCount(0);await expect(update.locator('iframe,script')).toHaveCount(0);
 const chart=update.getByRole('img',{name:'Cash balance, May to October 2026'});await expect(chart).toBeVisible();await expect.poll(()=>chart.evaluate(i=>i.naturalWidth)).toBeGreaterThan(0);
 let l=await page.evaluate(layout);expect(l.scroll).toBeLessThanOrEqual(width);expect(l.images.every(i=>!i.overflow)).toBe(true);
 expect(await page.evaluate(contrastScript)).toEqual([]);
 await page.keyboard.press('Tab');await expect(page.locator('.xp-skip')).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('tab',{name:'Update',exact:true})).toBeFocused();
 await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'Earlier updates'})).toHaveAttribute('aria-selected','true');
 await expect(page.getByRole('link',{name:'Acme Bio — September 2026 board update'})).toBeVisible();await page.keyboard.press('ArrowLeft');
 // "I can help" with a note: the marked ask in place, the other after the content.
 const asks=update.locator('.xp-ask');await expect(asks).toHaveCount(2);await expect(asks.nth(0)).toContainText('experienced CMO');await expect(asks.nth(1)).toContainText('BD teams in Japan');
 await asks.nth(0).getByRole('button',{name:'I can help'}).click();await asks.nth(0).getByLabel(/Note for .* \(optional\)/).fill('Happy to introduce two CMOs.');await asks.nth(0).getByRole('button',{name:'Send'}).click();
 await expect(asks.nth(0).getByRole('status')).toContainText('has been told you can help');await expect(asks.nth(0).getByRole('button',{name:'Send another note'})).toBeVisible();
 expect(await page.evaluate(contrastScript)).toEqual([]);
 // The email's "I can help" link opens the page at that ask, ready for a note; nothing is recorded until the person sends.
 await page.goto(base+'/exchange?ask=bd_partner#'+fixture.token);await page.reload();
 const japan=page.locator('#ask-bd_partner');await expect(japan.getByLabel(/Note for .* \(optional\)/)).toBeFocused();await expect(japan.getByRole('status')).toHaveCount(0);
 l=await page.evaluate(layout);expect(l.scroll).toBeLessThanOrEqual(width);
});

/** What each client does to an email, as far as it matters for layout: Gmail drops head styles (the app for non-Google accounts) and
 * wraps the body; Outlook for Windows uses its Word renderer, which applies [if mso] blocks and ignores max-width, border-radius and
 * fluid image styles; Apple Mail renders the email as sent, on an iPhone and in dark mode. */
const clients=[
 {name:'Gmail web',width:1024,dark:false,transform:h=>h.replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<body([^>]*)>([\s\S]*)<\/body>/i,'<body$1><div class="gmail-wrap">$2</div></body>')},
 {name:'Gmail app',width:390,dark:false,transform:h=>h.replace(/<head>[\s\S]*?<\/head>/i,'<head><meta name="viewport" content="width=device-width,initial-scale=1"></head>').replace(/<body([^>]*)>([\s\S]*)<\/body>/i,'<body$1><div class="gmail-wrap">$2</div></body>')},
 {name:'Outlook for Windows',width:1024,dark:false,outlook:true,transform:h=>h.replace(/<!--\[if mso\]>/g,'').replace(/<!\[endif\]-->/g,'').replace(/style="([^"]*)"/g,(m,s)=>'style="'+s.split(';').filter(d=>!/^\s*(max-width|border-radius|box-shadow|background-image|display\s*:\s*(flex|grid))/i.test(d)).join(';').replace(/height:auto;?/,'')+'"')},
 {name:'Apple Mail on iPhone (dark mode)',width:390,dark:true,transform:h=>h},
 {name:'Apple Mail on Mac',width:1440,dark:false,transform:h=>h}
];
test('Update email: the same content passes Gmail, Outlook and Apple Mail rendering checks and has a plain-text part',async({page})=>{
 const fixture=await (await page.request.get(base+'/fixture/update')).json(),email=fixture.email;
 expect(email.clientChecks).toEqual({gmail:[],outlook:[],appleMail:[],text:[]});
 // Images and links point at the platform; here the fixture server stands in for it.
 const html=email.html.split(fixture.origin).join(base);
 expect(email.text.split('\n').every(l=>l.length<=998)).toBe(true);expect(email.text).toContain('View online: ');expect(email.text).toMatch(/Unsubscribe from Acme Bio board updates: /);expect(email.text).toContain('Runway | 14.2 months | −1.0');expect(email.text).not.toMatch(/<[a-z]/i);
 for(const client of clients){
  await page.setViewportSize({width:client.width,height:1000});await page.emulateMedia({colorScheme:client.dark?'dark':'light'});
  await page.setContent(client.transform(html),{waitUntil:'load'});
  await expect(page.getByText('Cash and runway',{exact:true}),client.name).toBeVisible();await expect(page.getByRole('link',{name:'View online'}),client.name).toHaveAttribute('href',new RegExp('#'+fixture.token+'$'));
  await expect(page.getByRole('link',{name:'I can help'}),client.name).toHaveCount(2);await expect(page.getByRole('link',{name:/Unsubscribe from/}),client.name).toBeVisible();
  const l=await page.evaluate(layout);
  expect(l.scroll,client.name+' has no horizontal scroll').toBeLessThanOrEqual(client.width);expect(l.wide,client.name).toEqual([]);
  expect(l.images.length,client.name).toBe(1);expect(l.images[0].complete&&l.images[0].natural>0,client.name+' loads the chart').toBe(true);
  if(client.outlook){const card=await page.evaluate(()=>[...document.querySelectorAll('table[width="600"]')].map(t=>Math.round(t.getBoundingClientRect().width)));expect(card,'Outlook keeps the 600 px column').toEqual([600]);
   const img=await page.evaluate(()=>Math.round(document.images[0].getBoundingClientRect().width));expect(img,'Outlook sizes the chart from its width attribute').toBe(552);}
  expect(await page.evaluate(contrastScript),client.name).toEqual([]);
 }
});
