// Runs in Trialy's isolated frontend engine, never as browser JavaScript.
const esc=v=>String(v==null?'—':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state=input.state||{tab:-1,queries:{},offsets:{},hidden:{},sorts:{}};
const e=input.event||{},action=e.action||'',parts=action.split(':');
state.queries=state.queries||{};state.offsets=state.offsets||{};state.hidden=state.hidden||{};state.sorts=state.sorts||{};
if(parts[0]==='tab'){state.tab=Number(parts[1]);state.detail=null;}
if(action==='query')state.queries[state.tab]=String(e.value||'');
if(action==='sort')state.sorts[state.tab]=String(e.value||'');
if(action==='next')state.offsets[state.tab]=(state.offsets[state.tab]||0)+Math.min(10,Math.max(1,Math.floor(60/config.tabs[state.tab].columns.length)));
if(action==='previous')state.offsets[state.tab]=Math.max(0,(state.offsets[state.tab]||0)-Math.min(10,Math.max(1,Math.floor(60/config.tabs[state.tab].columns.length))));
if(action==='settings'){state.settings=true;state.layoutDraft={name:config.name,description:config.description,tabs:config.tabs.map(t=>({typeId:t.typeId,name:t.name,visible:t.visible!==false,columns:t.columns.map(c=>({field:c.field,label:c.label,visible:c.visible}))}))};}
if(action==='discard-layout'){state.settings=false;state.hiddenDraft=null;}
if(action==='save-layout'){tools.call('layout.propose',state.layoutDraft);state.settings=false;}
if(action==='layout-name')state.layoutDraft.name=String(e.value||'');
if(action==='layout-description')state.layoutDraft.description=String(e.value||'');
if(parts[0]==='tab-name')state.layoutDraft.tabs[Number(parts[1])].name=String(e.value||'');
if(parts[0]==='tab-visible')state.layoutDraft.tabs[Number(parts[1])].visible=e.value==='visible';
if(parts[0]==='column-label')state.layoutDraft.tabs[Number(parts[1])].columns[Number(parts[2])].label=String(e.value||'');
if(parts[0]==='move-tab'){const i=Number(parts[1]),j=i+Number(parts[2]);if(j>=0&&j<state.layoutDraft.tabs.length){const t=state.layoutDraft.tabs.splice(i,1)[0];state.layoutDraft.tabs.splice(j,0,t);}}
if(parts[0]==='move-column'){const cs=state.layoutDraft.tabs[Number(parts[1])].columns,i=Number(parts[2]),j=i+Number(parts[3]);if(j>=0&&j<cs.length){const c=cs.splice(i,1)[0];cs.splice(j,0,c);}}
if(parts[0]==='visibility'){state.layoutDraft.tabs[Number(parts[1])].columns[Number(parts[2])].visible=e.value==='visible';}
if(parts[0]==='details')state.detail=parts[1];
if(action==='close-details')state.detail=null;
// Only declared tables are read. Examples never enter records.propose or real totals.
const pageSizes=config.tabs.map(t=>Math.min(10,Math.max(1,Math.floor(60/t.columns.length))));
const pages=config.tabs.map((t,i)=>tools.call('records.read',{typeId:t.typeId,limit:pageSizes[i],offset:state.offsets[i]||0}));
const exampleTab=config.tabs.find(t=>t.typeId===config.exampleTypeId)||config.tabs[0];
const total=pages.reduce((n,p)=>n+p.total,0),tab=config.tabs[state.tab],page=pages[state.tab];
const controls=[];
const cell=(c,r)=>{if(r.example)return esc(r.data[c.field]);const slot='slot_'+controls.length;controls.push({slot,fieldId:c.fieldId,recordId:r.id});return '<span data-trialy-slot="'+slot+'"></span>';};
const button=(text,action,cls='secondary')=>'<button class="'+cls+'" data-action="'+esc(action)+'">'+text+'</button>';
const icon='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M4 17h16M8 4v6M16 14v6"/></svg>';
let html='<main><h1>'+esc(config.name)+'</h1><p class="subtitle">'+esc(config.description)+'</p>';
if(state.settings){
 html+=button('← Tracker','discard-layout')+'<nav class="tabs"><button class="tab active">Layout</button><button class="tab" data-action="tracker:access">Access control</button></nav><h2>Layout</h2><label class="field"><span>Name</span><input data-ui-state data-action="layout-name" value="'+esc(state.layoutDraft.name)+'"></label><label class="field"><span>Description</span><textarea data-ui-state data-action="layout-description">'+esc(state.layoutDraft.description)+'</textarea></label>';
 state.layoutDraft.tabs.forEach((t,i)=>{html+='<section class="layout-section"><div class="layout-column"><input aria-label="Tab name" data-ui-state data-action="tab-name:'+i+'" value="'+esc(t.name)+'"><select aria-label="Tab visibility" data-ui-state data-action="tab-visible:'+i+'"><option value="visible" '+(t.visible?'selected':'')+'>Visible</option><option value="hidden" '+(!t.visible?'selected':'')+'>Hidden</option></select>'+button('↑','move-tab:'+i+':-1')+button('↓','move-tab:'+i+':1')+'</div>';t.columns.forEach((c,j)=>{html+='<label class="layout-column"><input aria-label="Display label" data-ui-state data-action="column-label:'+i+':'+j+'" value="'+esc(c.label)+'"><select data-ui-state data-action="visibility:'+i+':'+j+'" aria-label="'+esc(c.label)+' visibility"><option value="visible" '+(c.visible?'selected':'')+'>Visible</option><option value="hidden" '+(!c.visible?'selected':'')+'>Hidden</option></select>'+button('↑','move-column:'+i+':'+j+':-1')+button('↓','move-column:'+i+':'+j+':1')+'</label>';});html+='</section>';});
 html+='<p>Adding tabs or columns can change database bindings. Ask ChatGPT to make those changes.</p>'+button('Review settings','save-layout','primary')+' '+button('Discard changes','discard-layout');
}else{
 html+='<div class="tabbar"><nav class="tabs" aria-label="Tracker tabs">'+button('Overview','tab:-1','tab '+(state.tab===-1?'active':''))+config.tabs.map((t,i)=>t.visible===false?'':button(esc(t.name),'tab:'+i,'tab '+(state.tab===i?'active':''))).join('')+'</nav><button class="tracker-settings" data-action="settings" aria-label="Tracker layout">'+icon+'</button></div>';
 if(!tab){
  html+='<div class="stats">'+config.tabs.map((t,i)=>'<button class="stat" data-action="tab:'+i+'"><div class="number">'+pages[i].total+'</div><div class="label">'+esc(t.name)+'</div><div class="hint">Saved records</div></button>').join('')+'</div>';
  html+='<section class="overview-next"><h2>Next steps</h2><p>'+(total?'Open a tab to review and update your records.':'Add your first record to start tracking. No outreach or other action has been performed.')+'</p></section>';
  if(!total&&config.showExample)html+='<section class="example-story"><h3>Example · not saved</h3><p>'+Object.entries(config.example).map(([k,v])=>esc((exampleTab.columns.find(c=>c.field===k)||{label:k}).label)+': '+esc(v)).join(' · ')+'</p><p class="small-note">One fictional example, excluded from saved records and counts.</p></section>';
 }else{
  let rows=page.rows.slice(),sample=!total&&config.showExample&&tab.typeId===exampleTab.typeId;
  if(sample)rows=[{id:'example',example:true,data:config.example}];
  const q=String(state.queries[state.tab]||'').toLowerCase();rows=rows.filter(r=>tab.columns.some(c=>String(r.data[c.field]||'').toLowerCase().includes(q)));
  const sort=state.sorts[state.tab];if(sort)rows.sort((a,b)=>String(a.data[sort]||'').localeCompare(String(b.data[sort]||'')));
  const columns=tab.columns.filter(c=>state.hidden[state.tab+':'+c.field]===undefined?c.visible:!state.hidden[state.tab+':'+c.field]);
  html+='<div class="toolbar"><label class="search"><input data-ui-state data-action="query" value="'+esc(state.queries[state.tab]||'')+'" placeholder="Search this page" aria-label="Search this page"></label><select class="sort" data-ui-state data-action="sort" aria-label="Sort this page"><option value="">Original order</option>'+tab.columns.map(c=>'<option value="'+c.field+'" '+(sort===c.field?'selected':'')+'>'+esc(c.label)+'</option>').join('')+'</select><span class="push"></span><button class="primary" data-action="tracker:add" '+(!(input.writable&&tab.columns.some(c=>c.editable))?'disabled':'')+'>Add record</button></div>';
  html+='<div class="card"><div class="scroll"><table><thead><tr>'+columns.map(c=>'<th>'+esc(c.label)+'</th>').join('')+'<th class="details-column">Details</th></tr></thead><tbody>';
  html+=rows.map(r=>'<tr>'+columns.map(c=>'<td>'+cell(c,r)+'</td>').join('')+'<td class="details-column"><button class="expand-record" aria-label="Open record details" data-action="details:'+r.id+'">↗</button></td></tr>').join('');
  if(!rows.length)html+='<tr><td class="blank" colspan="'+(columns.length+1)+'">'+(q?'No matches on this page.':'No saved records yet.')+'</td></tr>';
  html+='</tbody></table></div><footer class="tablefoot"><span>'+page.total+' saved records'+(sample?' · one fictional example, not saved':'')+'</span><span>'+((state.offsets[state.tab]||0)>0?button('Previous','previous'):'')+' '+((state.offsets[state.tab]||0)+Math.min(10,Math.max(1,Math.floor(60/config.tabs[state.tab].columns.length)))<page.total?button('Next','next'):'')+'</span></footer></div>';
  const r=rows.find(r=>r.id===state.detail);
  if(r)html+='<div class="backdrop open"><aside class="drawer" role="dialog" aria-label="Record details"><header class="drawer-head"><h2>'+esc(r.data[tab.columns[0].field]||'Record details')+'</h2>'+button('×','close-details','iconbutton')+'</header><div class="drawer-main">'+tab.columns.map(c=>'<label class="field"><span>'+esc(c.label)+'</span>'+cell(c,r)+'</label>').join('')+'</div><footer class="drawer-actions">'+button('Close','close-details')+'</footer></aside></div>';
 }
}
html+='</main>';
return {html,css:theme+'\nth,td{border-left:0;border-right:0;border-top:0}.tabbar{display:flex;align-items:end;gap:20px}.tabbar .tabs{flex:1}.tracker-settings{border:0;background:transparent;padding:12px;color:var(--ink)}.details-column{position:sticky;right:0;background:white;min-width:72px;width:72px;max-width:72px;text-align:center}.expand-record{border:0;background:transparent;font-size:24px;color:var(--ink);padding:8px}.overview-next,.example-story,.layout-section{margin-top:24px;padding:24px;border:1px solid var(--line);border-radius:12px;background:white}.overview-next h2{font-size:18px}.layout-column{display:flex;gap:20px;align-items:center;margin:14px 0}.layout-column span{flex:1}.layout-column select{padding:8px;border:1px solid var(--line);border-radius:8px}td input,td select{width:100%;min-width:120px;border:1px solid transparent;background:transparent;padding:7px;color:#253c40}td input:focus,td select:focus{border-color:#c0e8ca;background:#e5f6e9} .drawer{position:fixed}.drawer-main input,.drawer-main select{width:100%;padding:10px;border:1px solid var(--line);border-radius:8px}.scroll{overflow-y:visible}main{padding:24px 16px 40px}button:disabled{opacity:.5}@media(max-width:600px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.tabs{gap:18px}.layout-column{flex-wrap:wrap}}',controls,state};
