import {fail} from '../shared/schema.js';
export function automationTemplate(setup:any,report:string,content:any){
 if(setup.tabs.length!==1||setup.extendTables.length)fail(400,'template_scope','Automation templates use one table without schema extensions.');
 const tab=setup.tabs[0],fields=content.manifest.fields;
 const date=fields.find((f:any)=>f.kind==='date');
 if(report==='due'&&!date)fail(400,'date_required','The follow-up report needs a date field. Choose a compatible source field.');
 const source=`const tableId=${JSON.stringify(tab.typeId)},keys=${JSON.stringify(fields.map((f:any)=>f.field))},dateField=${JSON.stringify(date?.field??null)};const offset=Number(input?.offset||0);const page=tools.call('records.read',{typeId:tableId,offset,limit:100});const today=new Date().toISOString().slice(0,10);const rows=page.rows.filter(r=>${report==='due'?"r.data[dateField]&&String(r.data[dateField])<=today":"keys.some(k=>r.data[k]==null||r.data[k]==='')"}).map(r=>({id:r.id,data:Object.fromEntries(keys.map(k=>[k,r.data[k]??null]))}));return {rows,scanned:page.rows.length,total:page.total,offset,nextOffset:offset+page.rows.length<page.total?offset+page.rows.length:null,note:'Results cover this page. Use nextOffset for additional records.'};`;
 return {name:setup.name,source,scope:{capabilities:['records.read'],typeIds:[tab.typeId],documents:false},inputContract:{type:'object'},outputContract:{type:'object'}};
}
