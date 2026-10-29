import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readTrackerDesign} from '../src/server/tracker-design.js';
import {trackerSetup} from '../src/workspace/tracker-template.js';
const base=new URL('../plugin/trialy/skills/trialy-tracker-design/assets/',import.meta.url);
const read=(name:string)=>readFile(new URL(name,base),'utf8');
test('reusable theme preserves the uploaded HTML and its complete CSS cascade',async()=>{
 const [reference,css,manifest]=await Promise.all([read('approved-theme2-reference.html'),read('vivid-template/theme.css'),read('vivid-template/manifest.json').then(JSON.parse)]);
 // Approved 29 October naming-only update; the complete CSS cascade remains unchanged.
 assert.equal(createHash('sha256').update(reference).digest('hex'),'83b6b5d1b29bea60a27b225c04f37b9c4c23a7cd5e3a78f13e8b255b2e9f11e4');
 assert.equal(css,[...reference.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n'));
 assert.equal(createHash('sha256').update(css).digest('hex'),manifest.stylesheetSha256);
});
test('fixed components escape content and retain exact overview icon geometry',async()=>{
 const runtime=await read('vivid-template/runtime.js'),vivid=new Function(runtime+';return vivid;')();
 const html=vivid.render('stat',{value:4,label:'<img src=x onerror=alert(1)>',hint:'Any domain',icon:vivid.raw(vivid.render('icon.people'))});
 assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img/);assert.match(html,/M4 20v-2a7 7 0 0 1 14 0v2/);
 assert.throws(()=>vivid.render('constructor'));
 assert.doesNotMatch(runtime,/NorthStar|Apex|vendorId|nextFollowup|localStorage/);
});
test('template contract and components are exposed without loading example business logic',async()=>{
 const page=await readTrackerDesign({resource:'template'});assert.equal(page.nextOffset,null);assert.match(page.text,/contents are examples/);
 for(const name of ['components','manifest','styles','catalog'])assert.ok(page.resources.includes(name));
});
test('non-sample domain uses the same strict template with a closed icon catalog',()=>{
 const input={name:'Equipment maintenance',description:'Service schedule',showExample:false,tabs:[{name:'Equipment',typeId:'11111111-1111-4111-8111-111111111111',icon:'checklist',columns:[{field:'name'},{field:'status',display:{kind:'badge',valueTones:{Operational:'green','Needs service':'amber',Retired:'red'}}}]}]};
 const valid=trackerSetup.parse(input);assert.equal(valid.templateId,'trialy.standard.v1');assert.equal(valid.tabs[0].icon,'checklist');
 assert.equal(trackerSetup.safeParse({...input,tabs:[{...input.tabs[0],icon:'<svg/>'}]}).success,false);
});
