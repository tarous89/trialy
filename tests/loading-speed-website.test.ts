import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';

/* Loading speed L1.5 (docs/scopes/LOADING_SPEED_2026-11-22.md, choice C): the website's main script holds the Apps page
 * and an app's first screen; every other signed-in page is one second chunk loaded after the first screen, and pages
 * with their own address are a chunk of their own. zod's translations stay out (as in the widget, L3.6). */
const MAIN_BYTES=730_000,LATE_BYTES=320_000;
const built=existsSync('dist/web/index.html');
test('L1.5: the website main script holds the first screens only, within its budget',{skip:!built&&'dist not built (npm run build)'},async()=>{
 const assets=await readdir('dist/web/assets'),html=await readFile('dist/web/index.html','utf8');
 const entry=html.match(/<script type="module"[^>]*src="\/assets\/([^"]+\.js)"/)?.[1];assert.ok(entry,'index.html names its main script');
 const main=await readFile('dist/web/assets/'+entry,'utf8');
 const late=assets.find(f=>/^late-pages-.*\.js$/.test(f)),routes=assets.find(f=>/^route-pages-.*\.js$/.test(f));
 assert.ok(late&&routes,'the second chunk and the address pages chunk exist');
 assert.ok(Buffer.byteLength(main)<=MAIN_BYTES,`main script ${Buffer.byteLength(main)} bytes exceeds ${MAIN_BYTES}`);
 const lateText=await readFile('dist/web/assets/'+late,'utf8');
 assert.ok(Buffer.byteLength(lateText)<=LATE_BYTES,`second chunk ${Buffer.byteLength(lateText)} bytes exceeds ${LATE_BYTES}`);
 // Pages the Apps page never shows are not in the main script (their own text is a marker).
 for(const marker of ['Find your next app','No automations configured.','No matching records.','Confirm access changes','New project name'])
  assert.ok(!main.includes(marker),`${marker} is not in the main script`);
 // The first screens are.
 for(const marker of ['Loading your work','Checking for changes','Loading app'])assert.ok(main.includes(marker),`${marker} in the main script`);
 // The main script is not preloaded with the others: index.html names no second chunk.
 assert.ok(!html.includes('late-pages')&&!html.includes('route-pages'),'index.html does not preload the later chunks');
 // zod's translations stay out of every chunk (Hebrew and Cyrillic message tables are markers).
 for(const file of assets.filter(f=>f.endsWith('.js'))){const text=await readFile('dist/web/assets/'+file,'utf8');assert.ok(!text.includes('\\u05D0')&&!/[\u0590-\u05FF\u0400-\u04FF]/.test(text),`no zod translations in ${file}`);}
});
