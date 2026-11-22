# TrialAgents example app

A complete small app on the v2 contract: two screens, a search and a filter that need no request, an inline edit, a side panel that creates a record, a drag-and-drop board, totals on the full data, loading and restricted states, Undo, a remembered working context and an owner-only choice. It is run by the platform's tests exactly as written here (`tests/app-example.test.ts`), so every call in it works.

Replace `DEALS` with the id of the table your app is bound to (`bindings:[{typeId, fields:['name','stage','amount','owner']}]`). Field keys are the table's own keys.

```js
'use trialagents v2';
const DEALS='00000000-0000-4000-8000-000000000001';
const STAGES=['Lead','Proposal','Won'];
const s=input.state||{screen:'list',stage:'',q:'',panel:null,justSaved:false,undo:null};
const e=input.event||{},a=e.action||'';
let notice;
// The working context a person chose is remembered for them (input.context) and returned as output.context.
let owner=input.context&&input.context.owner||'';

// 1. What the person did. Screen changes, search and filters only change state: they need no request.
if(a.startsWith('nav:')){s.screen=a.slice(4);s.panel=null;}
if(a==='filter:stage')s.stage=String(e.value||'');
if(a==='search')s.q=String(e.value||'');
if(a==='context')owner=String(e.value||'');
if(a==='add')s.panel='new';
if(a==='panel:close')s.panel=null;

// 2. Saves, from the person's own edit, form or click. The value shows at once; the platform saves it with its checks.
const save=changes=>{tools.call('records.save',{changes});s.justSaved=true;};
const edit=kit.edit(e,{amount:'number'});               // an inline cell: edit:<recordId>:<field>:<version>
if(edit){save([{kind:'update_record',recordId:edit.recordId,expectedVersion:edit.version,data:{[edit.field]:edit.value}}]);notice=kit.notice('success','Saved');}
if(a==='create'&&e.kind==='submit'){
 const f=e.form||{};
 if(!f.name)notice=kit.notice('error','Give the deal a name.');
 else{save([{kind:'create_record',typeId:DEALS,data:{name:f.name,stage:f.stage||STAGES[0],amount:f.amount?Number(f.amount):null,owner:owner||null}}]);s.panel=null;notice=kit.notice('success','Deal added');}
}
if(a.startsWith('archive:')){const p=a.split(':');save([{kind:'archive_record',recordId:p[1],expectedVersion:Number(p[2])}]);notice=kit.notice('success','Deal removed');}
if(a.startsWith('undo:')){tools.call('undo.run',{undoId:a.slice(5)});s.undo=null;notice=kit.notice('success','Undone');}

// 3. Reads: one batch for everything the screens show. In the browser a read that is still on its way is `pending`.
const deals=tools.call('records.readMany',{reads:[{typeId:DEALS,limit:100,sort:{field:'name',direction:'asc'}}]}).results[0];
// Totals come from all records, not from the loaded page.
const totals=tools.call('records.summarize',{typeId:DEALS,metric:'amount',groupBy:'stage'});

// A board move needs the card's current version, so it is handled after the read.
const move=kit.move(e,'move'),moved=move&&deals.rows.find(r=>r.id===move.cardId);
if(moved&&moved.data.stage!==move.columnId){save([{kind:'update_record',recordId:moved.id,expectedVersion:moved.version,data:{stage:move.columnId}}]);notice=kit.notice('success','Moved to '+move.columnId);}

// After a save the platform makes this screen again (event `open`, or `refresh`): offer Undo for the person's last action.
if(s.justSaved&&(e.kind==='open'||e.kind==='refresh')){s.justSaved=false;try{s.undo=(tools.call('undo.list').actions||[])[0]||null;}catch(x){s.undo=null;}}

// 4. The screen, from the data already loaded.
const q=s.q.trim().toLowerCase();
const shown=deals.rows.filter(r=>(!s.stage||r.data.stage===s.stage)&&(!owner||r.data.owner===owner)&&(!q||String(r.data.name||'').toLowerCase().includes(q)));
const owners=[...new Set(deals.rows.map(r=>r.data.owner).filter(Boolean))].sort();
const money=n=>n==null?'—':Number(n).toLocaleString('en-US',{maximumFractionDigits:0});
const tools_=
 '<div class="k-row">'
 +'<label class="k-picker"><span>Search</span><input type="text" data-action="search" data-ui-state value="'+kit.esc(s.q)+'" placeholder="Deal name"></label>'
 +'<label class="k-picker"><span>Stage</span><select data-action="filter:stage"><option value="">All</option>'+STAGES.map(x=>'<option'+(x===s.stage?' selected':'')+'>'+kit.esc(x)+'</option>').join('')+'</select></label>'
 +(owners.length?kit.picker({label:'Owner',action:'context',value:owner,options:[{value:'',label:'Everyone'},...owners.map(o=>({value:o,label:o}))]}):'')
 +'<span class="k-grow"></span>'+(s.undo?kit.undo([s.undo]):'')+(input.writable?kit.button('Add deal','add',{primary:true}):'')
 +'</div>';
const stats=totals.pending?'':'<div class="k-row">'+kit.stat('Deals',totals.totals.count)+kit.stat('Total amount',money(totals.totals.sum))+'</div>';
const first=kit.empty({title:'No deals yet',text:'Add the first deal to start the pipeline.',action:input.writable?{label:'Add deal',action:'add'}:undefined});
const list=()=>kit.table({rows:shown,empty:deals.total?kit.empty({title:'No deal matches',text:'Change the search or the filters.'}):first,columns:[
 {key:'name',label:'Deal'},
 {key:'stage',label:'Stage',edit:{kind:'select',options:STAGES,readOnly:!input.writable}},
 {key:'amount',label:'Amount',edit:{kind:'number',readOnly:!input.writable}},
 {key:'owner',label:'Owner'},
 {key:'id',label:'',render:r=>input.writable?kit.button('Remove','archive:'+r.id+':'+r.version,{ariaLabel:'Remove '+r.data.name}):''}]});
const board=()=>kit.board({action:'move',columns:STAGES.map(st=>({id:st,label:st,cards:shown.filter(r=>r.data.stage===st).map(r=>({id:r.id,label:r.data.name,html:'<b>'+kit.esc(r.data.name)+'</b><div class="k-muted k-small">'+money(r.data.amount)+'</div>'}))}))});
const body=deals.pending?'<p class="k-muted">Loading…</p>'
 :deals.unavailable?'<p class="k-muted">You do not have access to the deals table.</p>'
 :stats+tools_+(s.screen==='board'?board():list());
const panel=s.panel==='new'?kit.panel({title:'New deal',body:
 '<form data-action="create">'
 +'<label class="k-field"><span>Name</span><input name="name" required></label>'
 +'<label class="k-field"><span>Stage</span><select name="stage">'+STAGES.map(x=>'<option>'+kit.esc(x)+'</option>').join('')+'</select></label>'
 +'<label class="k-field"><span>Amount</span><input name="amount" type="number" step="any"></label>'
 +'<button type="submit" class="k-button k-button--primary">Add deal</button></form>'}):'';
const nav=kit.nav([{id:'list',label:'Deals'},{id:'board',label:'Board'}],s.screen);
return {html:kit.page(nav+body+panel),state:s,context:{owner},...(notice?{notice}:{})};
```

What to take from it:

- **State and screens.** `input.state` is what the app returned last time. A screen change, a search and a filter only change state and use data already loaded, so the frame makes the next screen without a request.
- **Search while typing.** An `input` or `textarea` with `data-ui-state` sends a change event on every keystroke; without it, the event comes when the field is left.
- **One batch of reads.** `records.readMany` for the tables the screens show, `records.summarize` for totals. Show `pending` as loading and `unavailable` as restricted, never as empty or zero.
- **Saves.** `records.save` with the version shown when the edit started (`kit.edit` and `kit.cell` carry it in the action; a row has `version`). After a save the platform makes the screen again with event `open`.
- **Undo.** Ask `undo.list` on that next screen, and run `undo.run` from the person's click.
- **Roles.** `input.writable` says whether this person may change records; `input.appRole` is `owner`, `editor` or `viewer`.
