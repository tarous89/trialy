/* 5.3, 5.5: a small app written to the v2 contract with the kit. It is the example in the authoring guide's technical
 * reference and the fixture of the browser speed gate (an edit makes one request; changing screens and filtering make none). */
export const V2_EXAMPLE_SOURCE=String.raw`'use trialagents v2';
const s=input.state||{screen:'list',stage:''},e=input.event||{};
if(e.action&&e.action.startsWith('nav:'))s.screen=e.action.slice(4);
if(e.action==='filter:stage')s.stage=String(e.value||'');
const edit=kit.edit(e,{amount:'number'});
if(edit)tools.call('records.save',{changes:[{kind:'update_record',recordId:edit.recordId,expectedVersion:edit.version,data:{[edit.field]:edit.value}}]});
// One read for every screen: filtering the loaded rows needs no request.
const deals=tools.call('records.read',{typeId:'deals',limit:100});
const move=kit.move(e,'move'),moved=move&&deals.rows.find(r=>r.id===move.cardId);
if(moved)tools.call('records.save',{changes:[{kind:'update_record',recordId:moved.id,expectedVersion:moved.version,data:{stage:move.columnId}}]});
const shown=s.stage?deals.rows.filter(r=>r.data.stage===s.stage):deals.rows;
const stages=['Lead','Proposal','Won'];
const nav=kit.nav([{id:'list',label:'Deals'},{id:'board',label:'Board'}],s.screen);
const filter='<label class="k-picker"><span>Stage</span><select data-action="filter:stage"><option value="">All</option>'+stages.map(x=>'<option'+(x===s.stage?' selected':'')+'>'+x+'</option>').join('')+'</select></label>';
const body=s.screen==='board'
 ?kit.board({action:'move',columns:stages.map(st=>({id:st,label:st,cards:deals.rows.filter(r=>r.data.stage===st).map(r=>({id:r.id,label:r.data.name,html:'<b>'+kit.esc(r.data.name)+'</b>'}))}))})
 :filter+(deals.pending?'<p class="k-muted">Loading…</p>':kit.table({columns:[{key:'name',label:'Deal'},{key:'stage',label:'Stage'},{key:'amount',label:'Amount',edit:{kind:'number'}}],rows:shown,
   empty:kit.empty({title:'No deals yet',text:'Add the first deal to start the pipeline.',action:{label:'Add deal',action:'add'}})}));
return {html:kit.page(nav+body),state:s,...(edit?{notice:kit.notice('success','Saved')}:{})};`;
export const V2_EXAMPLE_ROWS=[{id:'d1',version:1,data:{name:'Acme',stage:'Lead',amount:100}},{id:'d2',version:4,data:{name:'Borealis',stage:'Proposal',amount:250}},{id:'d3',version:2,data:{name:'Cobalt',stage:'Won',amount:80}}];
export function v2ExampleAnswer(name:string,input:any){
 if(name!=='records.read'||input.typeId!=='deals')throw new Error('Capability unavailable');
 const rows=V2_EXAMPLE_ROWS;
 return {rows,total:rows.length,limit:input.limit??25,offset:input.offset??0};
}
