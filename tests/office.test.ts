import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {officeText} from '../src/worker/office.js';
const exec=promisify(execFile);
const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
async function zip(parts:Record<string,string>){const {stdout}=await exec('python3',['-c',"import io,zipfile,json,sys,base64\nb=io.BytesIO()\nwith zipfile.ZipFile(b,'w') as z:\n for k,v in json.loads(sys.argv[1]).items(): z.writestr(k,v)\nprint(base64.b64encode(b.getvalue()).decode())",JSON.stringify(parts)]);return Buffer.from(stdout.trim(),'base64');}
test('Office extraction preserves slide order and sparse cells; rejects unsafe XML',async()=>{
 const ppt={ 'ppt/presentation.xml':`<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="${R}"><p:sldIdLst><p:sldId r:id="second"/><p:sldId r:id="first"/></p:sldIdLst></p:presentation>`, 'ppt/_rels/presentation.xml.rels':'<Relationships><Relationship Id="second" Target="slides/slide2.xml"/><Relationship Id="first" Target="slides/slide1.xml"/></Relationships>', 'ppt/slides/slide1.xml':'<a:root xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:t>Last</a:t></a:root>', 'ppt/slides/slide2.xml':'<a:root xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:t>First</a:t></a:root>'};
 const slides=await officeText(await zip(ppt),'pptx');assert.deepEqual(slides.sections,[{page:1,text:'First'},{page:2,text:'Last'}]);assert.equal(slides.partial,true);
 const xlsx={'xl/workbook.xml':`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${R}"><sheets><sheet name="Budget" r:id="sheet"/></sheets></workbook>`,'xl/_rels/workbook.xml.rels':'<Relationships><Relationship Id="sheet" Target="worksheets/sheet1.xml"/></Relationships>','xl/worksheets/sheet1.xml':'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Name</t></is></c><c r="C1"><v>42</v></c></row></sheetData></worksheet>'};
 const sheet=await officeText(await zip(xlsx),'xlsx');assert.deepEqual(sheet.tables?.[0]?.rows,[['Name','','42']]);assert.match(sheet.text,/Budget/);assert.equal(sheet.tableStatus,'partial');
 await assert.rejects(officeText(await zip({...xlsx,'xl/workbook.xml':'<!DOCTYPE x [<!ENTITY unsafe "value">]><x/>'}),'xlsx'));
});
