import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readTrackerDesign} from '../src/server/tracker-design.js';
test('design reader reconstructs full reference without truncation',async()=>{
 let offset=0,text='',sha='';
 for(;;){const page=await readTrackerDesign({resource:'html',offset});text+=page.text;sha ||= page.sha256;assert.equal(page.sha256,sha);if(page.nextOffset===null)break;assert.ok(page.nextOffset>offset);offset=page.nextOffset;}
 assert.equal(text,await readFile(new URL('../plugin/trialy/skills/trialy-tracker-design/assets/approved-theme2-reference.html',import.meta.url),'utf8'));
});
test('design reader rejects arbitrary paths and invalid offsets',async()=>{
 await assert.rejects(readTrackerDesign({resource:'../../.env'}));
 await assert.rejects(readTrackerDesign({resource:'skill',offset:-1}));
 await assert.rejects(readTrackerDesign({resource:'skill',offset:99999999}));
});
