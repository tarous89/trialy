// Approved tracker renderer. Server reads are bounded; the trusted browser copy uses the same snapshot.
const esc=v=>String(v==null?'—':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state=input.state||{tab:-1,queries:{},offsets:{},sorts:{}};
const e=input.event||{},action=e.action||'',parts=action.split(':');
state.widths=state.widths||{};state.heights=state.heights||{};state.examples=state.examples||{};
const size=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
if(parts[0]==='resize-column')state.widths[parts[1]]=size(e.value,85,650,190);
if(parts[0]==='resize-row')state.heights[parts.slice(1).join(':')]=size(e.value,38,180,54);
if(parts[0]==='example'){const c=config.tabs[Number(parts[1])]?.columns[Number(parts[2])];if(c?.editable){state.examples[c.fieldId]=e.value;}}
state.queries=state.queries||{};state.offsets=state.offsets||{};state.sorts=state.sorts||{};
const pageSizes=config.tabs.map(t=>Math.min(20,Math.max(1,Math.floor(60/t.columns.length))));
const layout=()=>({name:config.name,description:config.description,tabs:config.tabs.map(t=>({typeId:t.typeId,name:t.name,visible:t.visible!==false,columns:t.columns.map(c=>({field:c.field,label:c.label,visible:c.visible}))}))});
if(parts[0]==='tab'){state.tab=Number(parts[1]);state.detail=null;}
if(action==='query')state.queries[state.tab]=String(e.value||'');
if(action==='sort')state.sorts[state.tab]=String(e.value||'');
if(action==='next')state.offsets[state.tab]=(state.offsets[state.tab]||0)+pageSizes[state.tab];
if(action==='previous')state.offsets[state.tab]=Math.max(0,(state.offsets[state.tab]||0)-pageSizes[state.tab]);
if(action==='settings'){state.settings=true;state.layoutDraft=layout();state.columnTab=0;}
if(action==='discard-layout'){state.settings=false;state.layoutDraft=null;}
if(action==='save-layout'){tools.call('layout.propose',state.layoutDraft);state.settings=false;}
if(action==='layout-name')state.layoutDraft.name=String(e.value||'');
if(action==='layout-description')state.layoutDraft.description=String(e.value||'');
if(action==='column-tab')state.columnTab=Number(e.value);
if(parts[0]==='tab-name')state.layoutDraft.tabs[Number(parts[1])].name=String(e.value||'');
if(parts[0]==='tab-visible')state.layoutDraft.tabs[Number(parts[1])].visible=e.value==='visible';
if(parts[0]==='column-label')state.layoutDraft.tabs[Number(parts[1])].columns[Number(parts[2])].label=String(e.value||'');
if(parts[0]==='move-tab'||parts[0]==='reorder-tab'){
 const i=Number(parts[1]),j=parts[0]==='move-tab'?i+Number(parts[2]):Number(parts[2]);
 if(j>=0&&j<state.layoutDraft.tabs.length){const t=state.layoutDraft.tabs.splice(i,1)[0];state.layoutDraft.tabs.splice(j,0,t);state.columnTab=j;}
}
if(parts[0]==='move-column'||parts[0]==='reorder-column'){
 const cs=state.layoutDraft.tabs[Number(parts[1])].columns,i=Number(parts[2]),j=parts[0]==='move-column'?i+Number(parts[3]):Number(parts[3]);
 if(j>=0&&j<cs.length){const c=cs.splice(i,1)[0];cs.splice(j,0,c);}
}
if(parts[0]==='visibility')state.layoutDraft.tabs[Number(parts[1])].columns[Number(parts[2])].visible=e.value==='visible';
if(parts[0]==='details')state.detail=parts[1];
if(action==='close-details')state.detail=null;
// Only declared tables are read. An empty tab gets one locally editable fictional example, never a write or real metric.
const pages=config.tabs.map((t,i)=>tools.call('records.read',{typeId:t.typeId,limit:pageSizes[i],offset:state.offsets[i]||0}));
const controls=[];
config.tabs.forEach((t,i)=>pages[i].rows.forEach((r,j)=>t.columns.forEach((c,k)=>controls.push({slot:'slot_'+i+'_'+j+'_'+k,fieldId:c.fieldId,recordId:r.id}))));
const tone=v=>/fail|blocked|overdue|high|reject/i.test(String(v))?'red':/done|complete|active|approved|yes|ready/i.test(String(v))?'green':/pending|progress|medium|review|contact/i.test(String(v))?'amber':'blue';
const display=(c,v)=>Array.isArray(v)?v.map(x=>display({...c,multiple:false},x)).join('<br>'):v==null||v===''?'<span class="empty-source">—</span>':['select','boolean','multi_select'].includes(c.kind)?'<span class="pill '+tone(v)+'">'+esc(v===true?'Yes':v===false?'No':v)+'</span>':esc(v);
const sampleFor=(t,i)=>{
 const given=t.example||(t.typeId===(config.exampleTypeId||config.tabs[0].typeId)?config.example:null)||{};
 return Object.fromEntries(t.columns.map((c,j)=>{
  let v=given[c.field];if(v===undefined){const key=(c.field+' '+c.label).toLowerCase();
   if(/source|provenance/.test(key))v=null;
   else if(c.kind==='select')v=c.options[0]||'Example';
   else if(c.kind==='boolean')v=true;
   else if(['number','money'].includes(c.kind))v=1;
   else if(c.kind==='date')v='2026-01-15';
   else if(/email/.test(key))v='alex@example.invalid';
   else if(/phone/.test(key))v='Example phone';
   else if(/contact|person|owner|assignee/.test(key)||j===0&&/contact|people|team/i.test(t.name))v='Alex Morgan (example)';
   else if(/company|organization|sponsor/.test(key))v='Example biotech';
   else if(/status|stage/.test(key))v='Planned';
   else if(/priority/.test(key))v='Medium';
   else if(/note|description|next/.test(key))v='Example: review and plan the next step';
   else v=j===0?'Example '+t.name.toLowerCase().replace(/s$/,''):'Example '+c.label.toLowerCase();
  }return [c.field,c.multiple&&v!=null&&!Array.isArray(v)?[v]:v];
 }));
};
const cell=(c,r,ti)=>{
 if(r.example){
  const value=Object.prototype.hasOwnProperty.call(state.examples,c.fieldId)?state.examples[c.fieldId]:r.data[c.field];
  const ci=config.tabs[ti].columns.findIndex(x=>x.field===c.field),a='example:'+ti+':'+ci;
  const shown=typeof value==='string'&&c.multiple?value.split('\n'):value;
  if(!c.editable)return display(c,shown);
  const attrs=' data-ui-state data-action="'+a+'" aria-label="Example '+esc(c.label)+'"';
  const editor=c.multiple?'<textarea'+attrs+' placeholder="One value per line">'+esc(Array.isArray(value)?value.join('\n'):value??'')+'</textarea>':c.kind==='select'?'<select'+attrs+'>'+c.options.map(v=>'<option '+(v===value?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select>':c.kind==='boolean'?'<input type="checkbox"'+attrs+(value?' checked':'')+'>':'<input type="'+(c.kind==='date'?'date':['number','money'].includes(c.kind)?'number':'text')+'"'+attrs+' value="'+esc(value??'')+'">';
  return '<span class="example-editor"><button class="cell-display" type="button" aria-label="Edit example '+esc(c.label)+'">'+display(c,shown)+'</button><span class="example-input" hidden>'+editor+'</span></span>';
 }
 const ri=pages[ti].rows.findIndex(x=>x.id===r.id),ci=config.tabs[ti].columns.findIndex(x=>x.field===c.field);
 return '<span data-trialy-slot="slot_'+ti+'_'+ri+'_'+ci+'"></span>';
};
const button=(text,action,cls='secondary',extra='')=>'<button class="'+cls+'" data-action="'+esc(action)+'" '+extra+'>'+text+'</button>';
const visibility=(value,action,label)=>'<select aria-label="'+esc(label)+'" data-ui-state data-action="'+action+'"><option value="visible" '+(value?'selected':'')+'>Shown</option><option value="hidden" '+(!value?'selected':'')+'>Hidden</option></select>';
const grip=(kind,i,j,label)=>'<button class="drag-grip" draggable="true" data-reorder="'+kind+':'+i+(j==null?'':':'+j)+'" aria-label="Reorder '+esc(label)+'" title="Drag to reorder; use Alt + Arrow keys" type="button">⠿</button>';
const icon='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m9 3-.6 2.2-2 .9-2-.6-2 3.5 1.5 1.6v2.8L2.4 15l2 3.5 2-.6 2 .9L9 21h4l.6-2.2 2-.9 2 .6 2-3.5-1.5-1.6v-2.8L19.6 9l-2-3.5-2 .6-2-.9L13 3Zm6 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0"/></svg>';
let html='<main>',detailHtml='';
if(state.settings){
 const mapping=t=>{const i=config.tabs.findIndex(x=>x.typeId===t.typeId);return (pages[i]?.tableName||config.tabs[i]?.tableName||t.typeId)+' · '+t.typeId;};
 const d=state.layoutDraft,ti=Math.min(state.columnTab||0,d.tabs.length-1),t=d.tabs[ti];
 html+='<section id="settingsPage" aria-label="Tracker settings"><div class="settings-top">'+button('← Back to tracker','discard-layout','back-link')+'</div><h1>Tracker settings</h1><p class="subtitle">Manage your tracker layout and access.</p><nav class="settings-tabs" aria-label="Tracker settings tabs"><button class="active" aria-current="page">Layout</button>'+button('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 11h12v10H6Zm3 0V7a3 3 0 0 1 6 0v4"/></svg> Access control','tracker:access','',input.saved?'':'disabled title="Available after saving the tracker"')+'</nav><div class="settings-content">';
 html+='<section class="settings-section"><h2>Tracker</h2><div class="settings-stack"><label class="settings-field">Name<input data-ui-state data-action="layout-name" value="'+esc(d.name)+'" '+(!input.saved?'disabled':'')+'></label><label class="settings-field">Description<textarea data-ui-state data-action="layout-description" '+(!input.saved?'disabled':'')+'>'+esc(d.description)+'</textarea></label></div></section>';
 html+='<section class="settings-section"><h2>Tabs</h2><div class="layout-head tab-layout-row"><span></span><span>Tab name</span><span>Visibility</span></div>';
 d.tabs.forEach((t,i)=>html+='<div class="layout-entry tab-layout-row '+(!t.visible?'is-hidden':'')+'">'+grip('tab',i,null,t.name)+'<label class="layout-binding"><input class="settings-inline-name" aria-label="Tab name" data-ui-state data-action="tab-name:'+i+'" value="'+esc(t.name)+'"><small>Database table: '+esc(mapping(t))+'</small></label>'+visibility(t.visible,'tab-visible:'+i,t.name+' visibility')+'</div>');
 html+='</section><section class="settings-section"><h2>Columns</h2><label class="settings-field">Tab<select data-ui-state data-action="column-tab">'+d.tabs.map((x,i)=>'<option value="'+i+'" '+(i===ti?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></label><div class="columns-list"><div class="layout-head column-layout-row"><span></span><span>Display name</span><span>Value type</span><span>Visibility</span></div>';
 t.columns.forEach((c,j)=>{const original=config.tabs.find(x=>x.typeId===t.typeId).columns.find(x=>x.field===c.field);html+='<div class="layout-entry column-layout-row '+(!c.visible?'is-hidden':'')+'">'+grip('column',ti,j,c.label)+'<label class="layout-binding"><input class="settings-inline-name" aria-label="Display name for '+esc(c.label)+'" data-ui-state data-action="column-label:'+ti+':'+j+'" value="'+esc(c.label)+'"><small>Database column: '+esc(mapping(t))+' / '+esc(c.field)+'</small></label><select aria-label="Value type for '+esc(c.label)+'" disabled><option>'+esc(original.kind.replace(/_/g,' '))+'</option></select>'+visibility(c.visible,'visibility:'+ti+':'+j,'Visibility for '+c.label)+'</div>';});
 html+='</div><p class="settings-help">Linked fields keep their database identity and type. Ask ChatGPT to add tabs or fields.</p></section></div></section>';
 if(!input.saved)html=html.replace(/data-ui-state data-action="(?!column-tab)[^"]+"/g,'disabled');
}else{
 html+='<section id="trackerView" '+(state.detail?'inert aria-hidden="true"':'')+'><h1>'+esc(config.name)+'</h1><p class="subtitle">'+esc(config.description)+'</p><div class="tabs-shell"><nav class="tabs" aria-label="Tracker tabs">'+button('Overview','tab:-1','tab '+(state.tab===-1?'active':''))+config.tabs.map((t,i)=>t.visible===false?'':button(esc(t.name),'tab:'+i,'tab '+(state.tab===i?'active':''))).join('')+'</nav>'+button(icon,'settings','tab-settings','aria-label="Tracker layout"')+'</div>';
 const tab=config.tabs[state.tab],page=pages[state.tab];
 if(!tab){
  html+='<div class="stats">'+config.tabs.map((t,i)=>t.visible===false?'':'<button class="stat" data-action="tab:'+i+'"><div class="number">'+pages[i].total+'</div><div class="label">'+esc(t.name)+'</div><div class="hint">Saved records</div></button>').join('')+'</div>';
  if(config.showExample&&pages.some(p=>!p.total))html+='<section class="overview-examples"><h2>Start with an example</h2><div class="example-grid">'+config.tabs.map((t,i)=>pages[i].total?'':'<button class="example-card" data-action="tab:'+i+'"><span class="pill blue">'+esc(t.name)+'</span><strong>'+esc(sampleFor(t,i)[t.columns[0].field])+'</strong><small>Fictional example · not saved</small><span class="example-arrow">↗</span></button>').join('')+'</div></section>';
 }else{
  let rows=page.rows.slice(),sample=!page.total&&config.showExample;
  if(sample)rows=[{id:'example',example:true,data:sampleFor(tab,state.tab)}];
  const allRows=rows.slice(),q=String(state.queries[state.tab]||'').toLowerCase();rows=rows.filter(r=>tab.columns.some(c=>String(r.data[c.field]||'').toLowerCase().includes(q)));
  const sort=state.sorts[state.tab];if(sort)rows.sort((a,b)=>String(a.data[sort]||'').localeCompare(String(b.data[sort]||'')));
  const columns=tab.columns.filter(c=>c.visible);
  html+='<div class="toolbar"><label class="search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input data-ui-state data-action="query" value="'+esc(state.queries[state.tab]||'')+'" placeholder="Search this page" aria-label="Search this page"></label><select class="sort" data-ui-state data-action="sort" aria-label="Sort this page"><option value="">Sort by</option>'+tab.columns.map(c=>'<option value="'+c.field+'" '+(sort===c.field?'selected':'')+'>'+esc(c.label)+'</option>').join('')+'</select><span class="push"></span>'+button('+ Add record','tracker:add','primary','aria-label="Add record" '+(!(input.writable&&tab.columns.some(c=>c.editable))?'disabled':''))+'</div>';
  const widths=columns.map(c=>size(state.widths[c.fieldId],85,650,/source|note|description|next/i.test(c.field)?235:190)),total=widths.reduce((a,b)=>a+b,84);
  html+='<div class="card"><div class="scroll"><table id="trackerTable" style="width:'+total+'px;min-width:'+total+'px"><colgroup>'+widths.map(w=>'<col style="width:'+w+'px">').join('')+'<col style="width:84px"></colgroup><thead><tr>'+columns.map((c,i)=>'<th>'+esc(c.label)+'<span class="resize-column" data-resize-column="'+c.fieldId+'" role="separator" tabindex="0" aria-orientation="vertical" aria-label="Resize '+esc(c.label)+' column" aria-valuemin="85" aria-valuemax="650" aria-valuenow="'+widths[i]+'"></span></th>').join('')+'<th class="details-column">Details</th></tr></thead><tbody>';
  html+=rows.map(r=>{const key=tab.typeId+':'+r.id,h=size(state.heights[key],38,180,54);return '<tr style="height:'+h+'px">'+columns.map(c=>'<td><div class="cell-content" style="max-height:'+Math.max(22,h-16)+'px">'+cell(c,r,state.tab)+'</div></td>').join('')+'<td class="details-column">'+button('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M10 14 19 5M12 5h7v7M19 15v4H5V5h4"/></svg>','details:'+r.id,'expand-record','aria-label="Open record details"')+'<span class="row-resize" data-resize-row="'+key+'" role="separator" tabindex="0" aria-orientation="horizontal" aria-label="Resize row height" aria-valuemin="38" aria-valuemax="180" aria-valuenow="'+h+'"></span></td></tr>';}).join('');
  if(!rows.length)html+='<tr><td class="blank" colspan="'+(columns.length+1)+'">'+(q?'No matches on this page.':'No saved records yet.')+'</td></tr>';
  html+='</tbody></table></div><footer class="tablefoot"><span>'+page.total+' saved records'+(sample?' · fictional example, not saved':'')+'</span><span>'+((state.offsets[state.tab]||0)>0?button('Previous','previous'):'')+' '+((state.offsets[state.tab]||0)+pageSizes[state.tab]<page.total?button('Next','next'):'')+'</span></footer></div>';
  const r=allRows.find(r=>r.id===state.detail);
  if(r)detailHtml='<div class="detail-page"><div class="detail-shade" data-action="close-details"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Record details"><div class="drawer-resizer" role="separator" tabindex="0" aria-label="Resize details" aria-orientation="vertical"></div><header class="drawer-head"><div><h2>'+esc(r.data[tab.columns[0].field]||'Record details')+'</h2>'+(r.example?'<small>Fictional example · not saved</small>':'')+'</div>'+button('×','close-details','iconbutton','aria-label="Close details"')+'</header><div class="drawer-main">'+tab.columns.map(c=>'<label class="field"><span>'+esc(c.label)+'</span>'+cell(c,r,state.tab)+'</label>').join('')+'</div></aside></div>';
 }
 html+='</section>'+detailHtml;
}
html+='</main>';
const css=theme+`
.layout-binding{display:grid;gap:5px;min-width:0}.layout-binding small{font-size:11px;font-weight:400;color:#52665d;overflow-wrap:anywhere}.settings-tabs svg{vertical-align:middle}

.cell-display{display:block;border:0;background:transparent;color:var(--ink);font:inherit;text-align:left;padding:0;width:100%;min-height:22px;overflow:hidden;text-overflow:ellipsis;cursor:text}.cell-display:focus-visible{outline:2px solid var(--accent)}#trackerTable tbody td{padding:8px 15px}.cell-content{overflow:hidden}.cell-content .pill{padding:1px 9px}.row-resize:focus-visible{opacity:1}.expand-record{height:22px;line-height:22px;width:40px;padding:0!important}.cell-content:focus-within{max-height:none!important}.example-input[hidden]{display:none}.example-input textarea{width:100%;min-height:54px;border:1px solid var(--line);color:var(--ink);background:white}.example-input input,.example-input select{color:var(--ink)}#trackerTable th{position:relative}#trackerTable td{position:relative}#trackerTable .details-column{width:84px;min-width:84px;max-width:84px}.resize-column{position:absolute;right:0;top:0;bottom:0;width:10px;cursor:col-resize;touch-action:none}.resize-column:hover,.resize-column:focus-visible{background:#dce5e1}.row-resize{position:absolute;bottom:0;left:0;right:0;height:8px;cursor:row-resize;touch-action:none}.row-resize:hover,.row-resize:focus-visible{background:#dce5e1}.source-link,.mini-link,.rank,td a,.drawer a{color:var(--ink)}
body{margin:0;background:#fff}main{padding:36px 28px 105px;min-height:100vh}th,td{border-left:0;border-right:0;border-top:0}.tab-settings{background:transparent;border:0}.tabs{overflow-x:auto;flex-wrap:nowrap}.tab{white-space:nowrap}.stats{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}.details-column{position:sticky!important;right:0;background:white!important;min-width:76px;width:76px;max-width:76px;text-align:center}.expand-record{border:0;background:transparent;font-size:26px;color:var(--ink);padding:4px}.overview-examples{margin:34px 0}.overview-examples h2{font-size:19px;margin-bottom:18px}.example-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}.example-card{position:relative;display:flex;flex-direction:column;gap:15px;text-align:left;background:white;border:1px solid var(--line);border-radius:12px;padding:24px}.example-card .pill{align-self:flex-start}.example-card strong{font-size:17px}.example-card small{font-size:12px;color:var(--muted)}.example-arrow{position:absolute;right:20px;bottom:20px;font-size:24px;color:var(--accent)}.back-link{border:0;background:none;padding:0;color:var(--accent)}.settings-section .tab-layout-row{grid-template-columns:34px minmax(120px,1fr) 132px!important}.settings-section .column-layout-row{grid-template-columns:34px minmax(140px,1.6fr) minmax(120px,.85fr) 123px!important}.is-hidden{opacity:.55}.drag-grip{border:0;background:transparent;font-size:24px;color:#859a91;cursor:grab}.layout-entry.drag-over{outline:2px solid #128269;border-radius:8px}.settings-help{margin-top:24px!important}.detail-page{position:absolute;inset:0;min-height:100vh;z-index:10;display:flex;justify-content:flex-end}.detail-shade{position:fixed;inset:0;background:rgba(20,40,36,.15)}.drawer{position:relative;top:auto;right:auto;height:auto;min-height:100vh;display:block;background:#fff;border-left:1px solid var(--line);box-shadow:none;padding-bottom:105px;transform:none;max-height:none}.drawer-head{position:sticky;top:0;background:#fff;z-index:2;display:flex;justify-content:space-between;align-items:flex-start}.drawer-head small{color:var(--muted);font-size:12px}.drawer-main{overflow:visible;flex:none}.drawer-main .field{margin-bottom:24px}.drawer-main .pill{display:inline-flex;width:max-content;max-width:100%}.drawer-main .field>span:first-child{font-size:13px}.drawer-main [data-trialy-slot]{display:block;font-size:15px}td input,td select{width:100%;min-width:0;border:1px solid transparent;background:transparent;padding:7px;color:#253c40}td input:hover,td input:focus{background:#ecf9ed;border-color:#c0e8ca;border-radius:7px}td select.pill{width:auto;max-width:100%;border:0}.scroll{overflow-x:auto;overflow-y:hidden;max-height:none;height:auto}.drawer-main input,.drawer-main select{width:100%;padding:10px;border:1px solid var(--line);border-radius:8px}button:disabled{opacity:.5;cursor:default}@media(max-width:680px){main{padding:28px 16px 120px}.settings-section{padding:20px 16px}.settings-section .column-layout-row{grid-template-columns:24px minmax(95px,1fr) 90px!important;gap:10px}.column-layout-row>*:nth-child(3){display:none}.settings-section .tab-layout-row{grid-template-columns:24px minmax(90px,1fr) 90px!important;gap:10px}.settings-section input,.settings-section select{font-size:13px;padding:8px}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.toolbar{flex-wrap:wrap}.search{flex-basis:100%}.drawer{width:100vw!important}.drawer-resizer{display:none}}

.detail-page{position:fixed;inset:0;height:100dvh;min-height:0;overflow-y:auto;overflow-x:hidden;align-items:flex-start}.detail-page .drawer{min-height:100dvh;height:auto;max-height:none;box-sizing:border-box;overflow:visible}.drawer-main .field,.drawer-main .cell-display,.drawer-main input,.drawer-main textarea,.drawer-main select,.drawer-main [data-trialy-slot],.drawer-main dd,.drawer-main .pill{font-weight:400}.drawer-main .field>span:first-child,.drawer-main dt{font-weight:650}.drawer-main .cell-display{white-space:pre-wrap;overflow-wrap:anywhere;text-overflow:clip}.drawer-main .field{min-width:0}.drawer-main textarea{max-width:100%;box-sizing:border-box}
`;
return {html,css,controls,state};
