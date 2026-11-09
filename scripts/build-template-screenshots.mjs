// Capture repository-owned, synthetic demos. No account or production data is read.
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const installers=JSON.parse(await readFile('templates/catalog-installers.json','utf8'));
await mkdir('resources/template-gallery',{recursive:true});
const catalog={};for(const file of await readdir('templates/apps')){if(!file.endsWith('.json'))continue;const raw=await readFile('templates/apps/'+file,'utf8'),t=JSON.parse(raw);catalog[t.id+'@'+t.version]=createHash('sha256').update(raw).digest('hex');}
const manifest={};
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{for(const [key,schema] of Object.entries(installers)){
 const [id,version]=key.split('@');
 const dir=dirname(schema),files=(await readdir(dir)).filter(n=>n.endsWith('.preview.html')||n==='preview.html');
 if(files.length!==1)throw Error('Expected one preview for '+id);
 const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
 await page.route(/^https?:/,route=>route.request().url()==='https://platform.trialagents.com/trialagents-mark-white.png'?route.fulfill({path:'public/trialagents-mark-white.png',contentType:'image/png'}):route.abort());
 await page.goto(pathToFileURL(resolve(dir,files[0])).href);await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:`resources/template-gallery/${id}@${version}.jpg`,type:'jpeg',quality:80});
 manifest[id+'@'+version]={catalogDigest:catalog[id+'@'+version],previewSha256:createHash('sha256').update(await readFile(resolve(dir,files[0]))).digest('hex')};
 console.log(id);await page.close();
}}finally{await browser.close();}

await writeFile('resources/template-gallery/manifest.json',JSON.stringify(manifest,null,2)+'\n');
