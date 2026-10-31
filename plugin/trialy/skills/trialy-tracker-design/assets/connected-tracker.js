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
const pageSizes=config.tabs.map(t=>Math.min(config.pageSize||25,Math.max(1,Math.floor(480/t.columns.length))));
state.filters=state.filters||{};
if(parts[0]==='filter'){state.filters[state.tab]={...(state.filters[state.tab]||{}),[parts[1]]:String(e.value||'')};state.offsets[state.tab]=0;}
const ui=(name,slots={},bindings={})=>vivid.render(name,slots,bindings),raw=vivid.raw;
const overviewIcon=(t,i)=>t.iconPath?'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" aria-hidden="true"><path d="'+esc(t.iconPath)+'"/></svg>':ui('icon.'+(t.icon||['people','document','checklist','contract'][i%4]));
const layout=()=>({name:config.name,description:config.description,tabs:config.tabs.map(t=>({typeId:t.typeId,name:t.name,visible:t.visible!==false,columns:t.columns.map(c=>({field:c.field,label:c.label,visible:c.visible}))}))});
if(parts[0]==='tab'){state.tab=Number(parts[1]);state.detail=null;}
if(action==='query')state.queries[state.tab]=String(e.value||'');
if(action==='sort'){state.sorts[state.tab]=String(e.value||'');state.sortDescending=false;}
if(parts[0]==='sort-field'){state.sortDescending=state.sorts[state.tab]===parts[1]?!state.sortDescending:false;state.sorts[state.tab]=parts[1];}
if(action==='overview-panel')state.overviewPanel=Number(e.value);
const overviewPanels=(config.overview?.nextSteps||[]).filter(p=>config.tabs[p.tabIndex]?.visible!==false);
const overviewPanel=overviewPanels[state.overviewPanel||0]||overviewPanels[0];
if(action==='overview-next'&&overviewPanel)state.offsets.overview=(state.offsets.overview||0)+pageSizes[overviewPanel.tabIndex];
if(action==='overview-previous'&&overviewPanel)state.offsets.overview=Math.max(0,(state.offsets.overview||0)-pageSizes[overviewPanel.tabIndex]);
if(action==='overview-panel')state.offsets.overview=0;
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
if(action==='tracker:add'&&input.writable&&config.tabs[state.tab]?.columns.some(c=>c.editable)){state.newRow={tab:state.tab,data:{}};state.detail=null;}
if(action==='discard-new')state.newRow=null;
if(parts[0]==='draft'&&state.newRow){const c=config.tabs[state.newRow.tab]?.columns.find(c=>c.field===parts[1]);if(c?.editable)state.newRow.data[c.field]=e.value;}

// Only declared tables are read. An empty tab gets one locally editable fictional example, never a write or real metric.
const pages=config.tabs.map((t,i)=>{
 const overview=state.tab===-1, full=state.tab===i||overview&&(overviewPanel?.tabIndex===i||config.resourceKind==='visualization');
 const needed=full||overview&&(config.overview?.showCounts!==false||config.showExample);
 if(!needed||t.visible===false)return {rows:[],total:0,limit:0,offset:0};
 return tools.call('records.read',{typeId:t.typeId,limit:full?pageSizes[i]:0,offset:state.tab===i?(state.offsets[i]||0):overview&&overviewPanel?.tabIndex===i?(state.offsets.overview||0):0,filters:Object.fromEntries(Object.entries(state.filters[i]||{}).filter(([,v])=>v!==''))});
});
const controls=[];
config.tabs.forEach((t,i)=>i===state.tab&&pages[i].rows.forEach((r,j)=>t.columns.forEach((c,k)=>controls.push({slot:'slot_'+i+'_'+j+'_'+k,fieldId:c.fieldId,recordId:r.id}))));
const tone=v=>/fail|blocked|overdue|high|reject/i.test(String(v))?'red':/done|complete|active|approved|yes|ready/i.test(String(v))?'green':/pending|progress|medium|review|contact/i.test(String(v))?'amber':'blue';
const display=(c,v)=>{
 const d=c.display||{};
 if(Array.isArray(v))return v.length?'<span class="value-list">'+v.map(x=>display(c,x)).join(d.kind==='badge'?'':', ')+'</span>':ui('empty');
 if(v==null||v==='')return ui('empty');
 const label=v===true?'Yes':v===false?'No':v;
 if(d.kind==='badge')return ui('pill',{class:'pill '+(d.valueTones?.[String(v)]||d.tone||'neutral'),label});
 if(d.kind==='link'&&/^https?:\/\//i.test(String(v)))return '<a href="'+esc(v)+'" target="_blank" rel="noopener noreferrer">'+esc(v)+'</a>';
 if(d.kind==='number'&&typeof v==='number')return esc((d.prefix||'')+v.toFixed(d.decimals??2)+(d.suffix||''));
 if(d.kind==='progress'&&typeof v==='number')return esc(v)+'<progress max="100" value="'+Math.max(0,Math.min(100,(v-(d.min??0))/((d.max??100)-(d.min??0)||1)*100))+'" aria-label="'+esc(c.label)+'"></progress>';
 return esc((d.prefix||'')+label+(d.suffix||''));
};
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
 if(r.draft){if(!c.editable)return display(c,null);const v=state.newRow.data[c.field]??'',attrs=' data-ui-state data-action="draft:'+c.field+'" aria-label="New '+esc(c.label)+'"';return c.multiple?'<textarea'+attrs+' placeholder="One value per line">'+esc(v)+'</textarea>':c.kind==='select'?'<select'+attrs+'><option value="">Choose…</option>'+c.options.map(o=>'<option '+(o===v?'selected':'')+'>'+esc(o)+'</option>').join('')+'</select>':c.kind==='boolean'?'<input type="checkbox"'+attrs+(v===true?' checked':'')+'>':'<input'+attrs+' type="'+(c.kind==='date'?'date':['number','money'].includes(c.kind)?'number':'text')+'" value="'+esc(v)+'">';}

 if(r.example){
  const value=Object.prototype.hasOwnProperty.call(state.examples,c.fieldId)?state.examples[c.fieldId]:r.data[c.field];
  const ci=config.tabs[ti].columns.findIndex(x=>x.field===c.field),a='example:'+ti+':'+ci;
  if(c.multiple)return '<span data-trialy-example="'+ti+':'+ci+'" data-trialy-value="'+esc(JSON.stringify(value??[]))+'">'+display(c,value)+'</span>';
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
const grip=(kind,i,j,label)=>'<button class="drag-grip" draggable="true" data-reorder="'+kind+':'+i+(j==null?'':':'+j)+'" aria-label="Reorder '+esc(label)+'" title="Drag to reorder; use Alt + Arrow keys" type="button">'+ui('gripIcon')+'</button>';
const icon=ui('icon.settings');
let html='<main>',detailHtml='';
if(state.settings){
 const mapping=t=>{const i=config.tabs.findIndex(x=>x.typeId===t.typeId);return (pages[i]?.tableName||config.tabs[i]?.tableName||t.typeId)+' · '+t.typeId;};
 const d=state.layoutDraft,ti=Math.min(state.columnTab||0,d.tabs.length-1),t=d.tabs[ti];
 html+='<section id="settingsPage" aria-label="App settings"><div class="settings-top">'+button('← Back to tracker','discard-layout','back-link')+'</div><h1>App settings</h1><p class="subtitle">Manage your tracker layout and access.</p><nav class="settings-tabs" aria-label="App settings tabs"><button class="active" aria-current="page">Layout</button>'+button('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 11h12v10H6Zm3 0V7a3 3 0 0 1 6 0v4"/></svg> Access','tracker:access','',input.saved?'':'disabled title="Available after saving the tracker"')+'</nav><div class="settings-content">';
 html+='<section class="settings-section"><h2>Tracker</h2><div class="settings-stack"><label class="settings-field">Name<input data-ui-state data-action="layout-name" value="'+esc(d.name)+'" '+(!input.saved?'disabled':'')+'></label><label class="settings-field">Description<textarea data-ui-state data-action="layout-description" '+(!input.saved?'disabled':'')+'>'+esc(d.description)+'</textarea></label></div></section>';
 html+='<section class="settings-section"><h2>Tabs</h2><div class="layout-head tab-layout-row"><span></span><span>Tab name</span><span>Visibility</span></div>';
 d.tabs.forEach((t,i)=>html+='<div class="layout-entry tab-layout-row '+(!t.visible?'is-hidden':'')+'">'+grip('tab',i,null,t.name)+'<label class="layout-binding"><input class="settings-inline-name" aria-label="Tab name" data-ui-state data-action="tab-name:'+i+'" value="'+esc(t.name)+'"><small>Database table: '+esc(mapping(t))+'</small></label>'+visibility(t.visible,'tab-visible:'+i,t.name+' visibility')+'</div>');
 html+='</section><section class="settings-section"><h2>Columns</h2><label class="settings-field">Tab<select data-ui-state data-action="column-tab">'+d.tabs.map((x,i)=>'<option value="'+i+'" '+(i===ti?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></label><div class="columns-list"><div class="layout-head column-layout-row"><span></span><span>Display name</span><span>Value type</span><span>Visibility</span></div>';
 t.columns.forEach((c,j)=>{const original=config.tabs.find(x=>x.typeId===t.typeId).columns.find(x=>x.field===c.field);html+='<div class="layout-entry column-layout-row '+(!c.visible?'is-hidden':'')+'">'+grip('column',ti,j,c.label)+'<label class="layout-binding"><input class="settings-inline-name" aria-label="Display name for '+esc(c.label)+'" data-ui-state data-action="column-label:'+ti+':'+j+'" value="'+esc(c.label)+'"><small>Database column: '+esc(mapping(t))+' / '+esc(c.field)+'</small></label><select aria-label="Value type for '+esc(c.label)+'" disabled><option>'+esc(original.kind.replace(/_/g,' '))+'</option></select>'+visibility(c.visible,'visibility:'+ti+':'+j,'Visibility for '+c.label)+'</div>';});
 html+='</div><p class="settings-help">Linked fields keep their database identity and type. Ask ChatGPT to add tabs or fields.</p></section></div></section>';
 if(!input.saved)html=html.replace(/data-ui-state data-action="(?!column-tab)[^"]+"/g,'disabled');
}else{
 html+='<section id="trackerView" '+(state.detail?'inert aria-hidden="true"':'')+'><h1>'+esc(config.name)+'</h1><p class="subtitle">'+esc(config.description)+'</p><div class="tabs-shell"><nav class="tabs" aria-label="Tracker tabs">'+button('Overview','tab:-1','tab '+(state.tab===-1?'active':''))+config.tabs.map((t,i)=>t.visible===false?'':button(esc(t.name),'tab:'+i,'tab '+(state.tab===i?'active':''))).join('')+'</nav>'+button(icon,input.saved?'tracker:layout':'settings','tab-settings','aria-label="App settings"')+'</div>';
 const tab=config.tabs[state.tab],page=pages[state.tab];
 if(!tab){
  if(config.overview?.showCounts!==false)html+='<div class="stats">'+config.tabs.map((t,i)=>t.visible===false?'':ui('stat',{value:pages[i].total??'—',icon:raw(overviewIcon(t,i)),label:t.name,hint:'Saved records'},{'data-action':'tab:'+i})).join('')+'</div>';
  if(overviewPanel){const panel=overviewPanel,t=config.tabs[panel.tabIndex],p=pages[panel.tabIndex],steps=p.rows.filter(r=>r.data[panel.textField]),offset=state.offsets.overview||0;
   html+='<div class="toolbar"><label>Next steps <select class="filter" data-ui-state data-action="overview-panel" aria-label="Next steps section">'+overviewPanels.map((x,i)=>'<option value="'+i+'" '+(x===panel?'selected':'')+'>'+esc(x.heading)+'</option>').join('')+'</select></label></div>';
   html+=ui('table',{label:panel.heading,table:raw('<table><thead><tr><th>'+esc(panel.heading)+'</th><th>'+esc(t.columns.find(c=>c.field===panel.textField).label)+'</th></tr></thead><tbody>'+steps.map(r=>'<tr><td>'+esc(r.data[panel.titleField])+'</td><td class="next">'+esc(r.data[panel.textField])+'</td></tr>').join('')+(!steps.length?'<tr><td colspan="2" class="blank">No next steps on this page.</td></tr>':'')+'</tbody></table>'),count:p.total?'Records '+(offset+1)+'–'+(offset+p.rows.length)+' of '+p.total:'No saved records',feedback:raw('<span class="pagination">'+(offset>0?button('Previous','overview-previous'):'')+(offset+p.rows.length<p.total?button('Next','overview-next'):'')+'</span>')});
  }
  if(config.resourceKind==='visualization')config.tabs.forEach((t,i)=>{const field=t.columns.find(c=>c.kind==='select'||c.kind==='boolean')||t.columns[0],counts={};pages[i].rows.forEach(r=>{const k=String(r.data[field.field]??'Not set');counts[k]=(counts[k]||0)+1;});const max=Math.max(1,...Object.values(counts));html+='<section class="settings-section"><h2>'+esc(t.name)+' by '+esc(field.label)+'</h2><p>Breakdown of '+pages[i].rows.length+' loaded records of '+pages[i].total+'. Open the table to browse more.</p>'+Object.entries(counts).map(([label,count],j)=>'<div style="display:grid;grid-template-columns:minmax(100px,1fr) 3fr 40px;gap:14px;align-items:center;margin:14px 0"><span>'+esc(label)+'</span><span style="height:16px;width:'+Math.max(2,count/max*100)+'%;background:'+['#4a8c80','#7898c4','#b18eae','#c49b61'][j%4]+';border-radius:3px"></span><strong>'+count+'</strong></div>').join('')+'</section>';});

 }else{
  let rows=page.rows.slice(),sample=!page.total&&config.showExample;
  if(sample)rows=[{id:'example',example:true,data:sampleFor(tab,state.tab)}];
  const allRows=rows.slice(),q=String(state.queries[state.tab]||'').toLowerCase();rows=rows.filter(r=>tab.columns.some(c=>String(r.data[c.field]||'').toLowerCase().includes(q)));
  const sort=state.sorts[state.tab];if(sort)rows.sort((a,b)=>String(a.data[sort]||'').localeCompare(String(b.data[sort]||''),undefined,{numeric:true})*(state.sortDescending?-1:1));
  const draft=state.newRow?.tab===state.tab?{id:'new',draft:true,data:state.newRow.data}:null;if(draft)rows.push(draft);
  const columns=tab.columns.filter(c=>c.visible||draft&&c.required);
  html+='<div class="toolbar tracker-toolbar options-overflow"><label class="search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input data-ui-state data-action="query" value="'+esc(state.queries[state.tab]||'')+'" placeholder="Search this page" aria-label="Search this page"></label><div class="tracker-options" id="tracker-options" role="group" aria-label="Filters and sorting">'+(tab.filters||[]).map(field=>{const c=tab.columns.find(c=>c.field===field);return '<select class="filter" data-ui-state data-action="filter:'+esc(field)+'" aria-label="Filter by '+esc(c.label)+'"><option value="">All '+esc(c.label)+'</option>'+(c.kind==='boolean'?['true','false']:c.options).map(v=>'<option value="'+esc(v)+'" '+(state.filters[state.tab]?.[field]===v?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select>';}).join('')+'<select class="sort" data-ui-state data-action="sort" aria-label="Sort this page"><option value="">Sort by</option>'+tab.columns.map(c=>'<option value="'+c.field+'" '+(sort===c.field?'selected':'')+'>'+esc(c.label)+'</option>').join('')+'</select></div>'+button('Filters'+(Object.values(state.filters[state.tab]||{}).filter(Boolean).length?' ('+Object.values(state.filters[state.tab]).filter(Boolean).length+')':''),'','secondary tracker-options-toggle','aria-label="Filter options" aria-expanded="false" aria-controls="tracker-options"')+button('+ Add record','tracker:add','primary','aria-label="Add record" '+(!(input.writable&&tab.columns.some(c=>c.editable))?'disabled':''))+'</div>';
  const widths=columns.map(c=>size(state.widths[c.fieldId],85,650,/source|note|description|next/i.test(c.field)?235:190)),total=widths.reduce((a,b)=>a+b,84);
  const tableStart=html.length;html+='<table id="trackerTable" style="width:100%;min-width:'+total+'px"><colgroup>'+widths.map(w=>'<col style="width:'+w+'px">').join('')+'<col style="width:84px"></colgroup><thead><tr>'+columns.map((c,i)=>'<th><button data-action="sort-field:'+c.field+'" aria-sort="'+(sort===c.field?(state.sortDescending?'descending':'ascending'):'none')+'">'+esc(c.label)+'</button><span class="resize-column" data-resize-column="'+c.fieldId+'" role="separator" tabindex="0" aria-orientation="vertical" aria-label="Resize '+esc(c.label)+' column" aria-valuemin="85" aria-valuemax="650" aria-valuenow="'+widths[i]+'"></span></th>').join('')+'<th class="action-col details-column" scope="col"><span class="details-col-label">Details</span></th></tr></thead><tbody>';
  html+=rows.map(r=>{const key=tab.typeId+':'+r.id,h=size(state.heights[key],38,180,54);return '<tr class="'+(r.draft?'draft-row':'')+'" style="height:'+h+'px">'+columns.map(c=>'<td><div class="cell-content" style="max-height:'+Math.max(22,h-16)+'px">'+cell(c,r,state.tab)+'</div></td>').join('')+'<td class="action-col details-column">'+(r.draft?button('Cancel','discard-new'):button('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M10 14 19 5M12 5h7v7M19 15v4H5V5h4"/></svg>','details:'+r.id,'expand-row expand-record','aria-label="Open record details"'))+'<span class="row-resize" data-resize-row="'+key+'" role="separator" tabindex="0" aria-orientation="horizontal" aria-label="Resize row height" aria-valuemin="38" aria-valuemax="180" aria-valuenow="'+h+'"></span></td></tr>';}).join('');
  if(!rows.length)html+='<tr><td class="blank" colspan="'+(columns.length+1)+'">'+(q?'No matches on this page.':'No saved records yet.')+'</td></tr>';
  html+='</tbody></table>';const tableContent=html.slice(tableStart);html=html.slice(0,tableStart)+ui('table',{label:'Current tracker table',table:raw(tableContent),count:page.total+' saved records'+(sample?' · fictional example, not saved':''),feedback:raw('<span class="pagination">'+((state.offsets[state.tab]||0)>0?button('Previous','previous'):'')+' '+((state.offsets[state.tab]||0)+pageSizes[state.tab]<page.total?button('Next','next'):'')+'</span>')});

  const r=allRows.find(r=>r.id===state.detail);
  if(draft)html+='<div class="inline-row-actions">'+button('Save changes','save-new','primary')+button('Cancel','discard-new')+'</div>';
  if(r)detailHtml='<div class="detail-page"><div class="detail-shade" data-action="close-details"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Record details"><div class="drawer-resizer" role="separator" tabindex="0" aria-label="Resize details" aria-orientation="vertical"></div><header class="drawer-head"><div><h2>'+esc(r.data[tab.columns[0].field]||'Record details')+'</h2>'+(r.example?'<small>Fictional example · not saved</small>':'')+'</div>'+button('×','close-details','iconbutton','aria-label="Close details"')+'</header><div class="drawer-main"><dl class="details">'+tab.columns.map(c=>ui('detail',{label:c.label,value:raw(cell(c,r,state.tab))})).join('')+'</dl></div><footer class="drawer-actions">'+button('Save changes','save-edits','primary',!input.writable||r.example||!tab.columns.some(c=>c.editable)?'disabled':'')+button('Duplicate','tracker:duplicate:'+r.id,'secondary',!input.writable||r.example||!tab.columns.some(c=>c.editable)?'disabled':'')+button('Delete','tracker:delete:'+r.id,'secondary',!input.writable||r.example||!tab.columns.some(c=>c.editable)?'disabled':'')+'</footer></aside></div>';
 }
 html+='</section>'+detailHtml;
}
html+='</main>';
return {html,css:theme,controls,state};
