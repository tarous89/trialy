const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
// Loading speed L1.5 (docs/scopes/LOADING_SPEED_2026-11-22.md, choice C): the website's other pages are one chunk loaded
// quietly after the first screen. The download is held open here; the loading bar must stay hidden while it runs.
const deferred=()=>{let release;const promise=new Promise(r=>release=r);return {promise,release};};
const bar=page=>page.getByRole('progressbar',{name:'Working',exact:true});

test('website: the other pages are one quiet download after the Apps page; a page opened early shows its frame',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 const gate=deferred(),chunks=[],routes=[];
 page.on('request',r=>{const p=new URL(r.url()).pathname;if(/\/assets\/route-pages-/.test(p))routes.push(p);});
 await page.route(/\/assets\/late-pages-[^/]+\.js$/,async route=>{chunks.push(route.request().url());await gate.promise;await route.continue();});
 await page.goto(base+'/app-home');
 // Apps home's cards are shown (any card: earlier tests in the suite rename and archive fixture apps).
 await expect(page.getByRole('heading',{name:'Apps',exact:true})).toBeVisible();await expect(page.getByLabel('Loading your work',{exact:true})).toHaveCount(0);
 await expect(page.locator('a[aria-label^="Open "]').first()).toBeVisible();
 // Started right after the first screen without being asked for, and quietly.
 await expect.poll(()=>chunks.length).toBe(1);await page.waitForTimeout(300);await expect(bar(page)).toHaveCount(0);
 await page.getByRole('button',{name:'Logs',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Logs',exact:true})).toBeVisible();
 await expect(page.getByLabel('Loading Logs',{exact:true})).toBeVisible();
 await page.waitForTimeout(300);await expect(bar(page)).toHaveCount(0);expect(chunks).toHaveLength(1);
 gate.release();
 await expect(page.getByLabel('Loading Logs',{exact:true})).toHaveCount(0);
 await expect(page.locator('.ty-log-screen')).toBeVisible();
 expect(chunks).toHaveLength(1);expect(routes).toHaveLength(0);
});

test('website: when the second chunk fails, its page offers Retry, and Retry loads it',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 let allow=false;
 await page.route(/\/assets\/late-pages-[^/]+\.js$/,route=>allow?route.continue():route.abort('failed'));
 await page.goto(base+'/app-home?tab=logs');
 await expect(page.getByRole('heading',{name:'Logs',exact:true})).toBeVisible();
 await expect(page.getByText('This page could not be loaded.',{exact:true})).toBeVisible();await expect(bar(page)).toHaveCount(0);
 allow=true;await page.getByRole('button',{name:'Retry',exact:true}).click();
 await expect(page.locator('.ty-log-screen')).toBeVisible();
});
