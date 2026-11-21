/**
 * G10, G5, G8, D38 (5.5): the general style and shared building blocks.
 * One token set (built from the Vivid look of the standard tracker) and one set of component styles, added by the runtime
 * to every v2 app, so apps no longer carry their own CSS. The helpers in KIT_SOURCE run inside the app's own engine
 * (server and frame alike) and return HTML strings that use these styles. Responsiveness follows the app's own width
 * (container queries), so one app fits the browser, the assistant panel and a phone. Nothing depends on hover.
 */
export const KIT_VERSION='trialagents.kit.1';
/** Vivid's values, named once. The standard tracker reads the same names (src/workspace/standard-tracker.ts). */
export const kitTokens={
 ink:'#20383d',muted:'#71858b',accent:'#0a8065',accentInk:'#ffffff',accentStrong:'#086b55',line:'#e5ece9',light:'#f8faf9',paper:'#ffffff',soft:'#ecf6f2',
 danger:'#b3261e',dangerSoft:'#fdecea',warning:'#8a5a00',warningSoft:'#fff4dc',focus:'#30ae8b',
 radius:'10px',radiusSmall:'7px',space:'16px',font:'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif',
} as const;
const cssName=(k:string)=>'--k-'+k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
/** The standard tracker's names for the same values (the Vivid stylesheet's first rule is generated from this). */
export const vividTokenNames={ink:'ink',muted:'muted',accent:'accent',line:'line',light:'light',paper:'paper',soft:'soft'} as const;
export const vividRootCss=':root{'+Object.entries(kitTokens).map(([k,v])=>`${cssName(k)}:${v}`).join(';')+';'+Object.entries(vividTokenNames).map(([vivid,k])=>`--${vivid}:var(${cssName(k)})`).join(';')+'}';
export const kitTokensCss=':root{'+Object.entries(kitTokens).map(([k,v])=>`${cssName(k)}:${v}`).join(';')+'}';
const components=`
*{box-sizing:border-box}html,body{height:100%}body{margin:0;background:var(--k-light);color:var(--k-ink);font:15px/1.5 var(--k-font)}
button,input,select,textarea{font:inherit;color:inherit}a{color:var(--k-accent)}
:focus-visible{outline:2px solid var(--k-focus);outline-offset:2px}
.k-app{container-type:inline-size;min-height:100%;display:flex;flex-direction:column}
.k-main{flex:1;width:min(1240px,100%);margin:0 auto;padding:clamp(12px,3cqi,32px)}
.k-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.k-grow{flex:1}.k-muted{color:var(--k-muted)}.k-small{font-size:13px}
.k-card{background:var(--k-paper);border:1px solid var(--k-line);border-radius:var(--k-radius);padding:var(--k-space)}
.k-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))}
.k-stat{background:var(--k-paper);border:1px solid var(--k-line);border-radius:var(--k-radius);padding:14px 16px}.k-stat b{display:block;font-size:24px;line-height:1.2}.k-stat span{font-size:13px;color:var(--k-muted)}
.k-button{min-height:40px;padding:0 14px;border-radius:var(--k-radius-small);border:1px solid var(--k-line);background:var(--k-paper);cursor:pointer;font-weight:600;font-size:14px}
.k-button--primary{background:var(--k-accent);border-color:var(--k-accent);color:var(--k-accent-ink)}.k-button--primary:active{background:var(--k-accent-strong)}
.k-button:disabled{opacity:.55;cursor:default}
.k-nav{display:flex;gap:4px;border-bottom:1px solid var(--k-line);overflow-x:auto;scrollbar-width:thin;margin:0 0 16px}
.k-nav button{border:0;background:none;min-height:44px;padding:0 12px;white-space:nowrap;color:var(--k-muted);font-weight:650;border-bottom:3px solid transparent;cursor:pointer}
.k-nav button[aria-current=page]{color:var(--k-accent);border-bottom-color:var(--k-accent)}
.k-layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:20px}.k-layout>div{min-width:0}.k-layout>.k-nav{flex-direction:column;border:0;margin:0}.k-layout>.k-nav button{text-align:left;border-bottom:0;border-left:3px solid transparent}.k-layout>.k-nav button[aria-current=page]{border-left-color:var(--k-accent)}
.k-table-wrap{overflow-x:auto;background:var(--k-paper);border:1px solid var(--k-line);border-radius:var(--k-radius)}
.k-table{border-collapse:collapse;width:100%}.k-table th{font-size:12px;color:var(--k-muted);text-align:left;font-weight:650;padding:10px 12px;border-bottom:1px solid var(--k-line);background:#fbfcfb}
.k-table td{padding:10px 12px;border-bottom:1px solid var(--k-line);vertical-align:top;overflow-wrap:anywhere}.k-table tr:last-child td{border-bottom:0}
.k-cell{width:100%;min-width:90px;min-height:36px;border:1px solid transparent;border-radius:6px;background:transparent;padding:4px 6px}.k-cell:focus{border-color:var(--k-line);background:var(--k-paper)}
.k-cell[data-trialy-saving]{background:var(--k-soft)}.k-cell[aria-invalid=true]{background:var(--k-danger-soft);border-color:var(--k-danger)}
.k-pill{display:inline-block;padding:1px 9px;border-radius:999px;background:var(--k-soft);font-size:12px;font-weight:650}
.k-empty{text-align:center;padding:36px 16px;background:var(--k-paper);border:1px dashed var(--k-line);border-radius:var(--k-radius)}.k-empty h3{margin:0 0 6px}
.k-pager{display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:10px;font-size:13px;color:var(--k-muted)}
.k-panel{position:fixed;inset:0 0 0 auto;width:min(440px,100%);background:var(--k-paper);border-left:1px solid var(--k-line);box-shadow:-8px 0 24px rgba(20,46,41,.12);display:flex;flex-direction:column;z-index:5}
.k-panel header{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--k-line)}.k-panel header h2{flex:1;font-size:17px;margin:0}.k-panel .k-panel-body{overflow:auto;padding:16px;flex:1}
.k-board{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(240px,1fr);gap:12px;overflow-x:auto;padding-bottom:6px}
.k-column{background:#f1f5f3;border-radius:var(--k-radius);padding:10px;min-height:120px}.k-column h3{font-size:13px;margin:0 0 8px;color:var(--k-muted)}.k-column[data-trialy-over]{outline:2px dashed var(--k-accent)}
.k-board-card{background:var(--k-paper);border:1px solid var(--k-line);border-radius:8px;padding:10px;margin-bottom:8px;cursor:grab}.k-board-card select{margin-top:6px;width:100%;min-height:32px}
.k-field{display:grid;gap:4px;margin:0 0 12px}.k-field span{font-size:13px;font-weight:600}.k-field input,.k-field select,.k-field textarea{min-height:40px;border:1px solid var(--k-line);border-radius:var(--k-radius-small);padding:6px 10px;background:var(--k-paper)}
.k-picker{display:inline-flex;gap:8px;align-items:center}.k-picker select{min-height:40px;border:1px solid var(--k-line);border-radius:var(--k-radius-small);padding:0 10px;background:var(--k-paper)}
@container (max-width:720px){
 .k-layout{grid-template-columns:1fr}.k-layout>.k-nav{flex-direction:row;border-bottom:1px solid var(--k-line)}.k-layout>.k-nav button{border-left:0;border-bottom:3px solid transparent}.k-layout>.k-nav button[aria-current=page]{border-bottom-color:var(--k-accent)}
 .k-table-wrap{background:none;border:0;overflow:visible}.k-table thead{display:none}.k-table,.k-table tbody,.k-table tr,.k-table td{display:block;width:100%}
 .k-table tr{background:var(--k-paper);border:1px solid var(--k-line);border-radius:var(--k-radius);margin-bottom:10px;padding:6px 0}
 .k-table td{display:grid;grid-template-columns:minmax(90px,40%) 1fr;gap:8px;border:0;padding:6px 12px}.k-table td::before{content:attr(data-label);font-size:12px;color:var(--k-muted);font-weight:650}
 .k-panel{width:100%;border-left:0}
 .k-board{grid-auto-flow:row;grid-auto-columns:auto}
}`;
/** The kit's building blocks, as read_app_design lists them. */
export const KIT_COMPONENTS=[
 {id:'navigation',helper:'kit.nav / kit.layout',use:'Screens as tabs or side navigation; folds into a scrolling row on narrow screens.'},
 {id:'table',helper:'kit.table',use:'Rows that become cards on narrow screens; columns can be inline cells.'},
 {id:'inline-cell',helper:'kit.cell / kit.edit',use:'Edit a value where it is shown; it saves at once.'},
 {id:'side-panel',helper:'kit.panel',use:'Create a record or edit many fields; full screen on phones.'},
 {id:'board',helper:'kit.board / kit.move',use:'Drag and drop between stages, with a move menu on every card.'},
 {id:'empty-state',helper:'kit.empty',use:'An empty screen with its first action.'},
 {id:'pager',helper:'kit.pager',use:'Paging through long lists.'},
 {id:'context-picker',helper:'kit.picker',use:'The working context a person keeps across screens and visits.'},
 {id:'settings',helper:'kit.settings',use:'Business choices, for the app\u2019s owners only.'},
 {id:'undo',helper:'kit.undo',use:'Undo the person\u2019s own last action.'},
 {id:'notice',helper:'kit.notice',use:'The platform\u2019s one message (output.notice).'},
 {id:'stat',helper:'kit.stat',use:'One number that matters, with its label.'},
] as const;
export const kitComponentsCss=components.replace(/\n/g,'');
/** Everything the runtime adds in front of a v2 app's own styles. Inside a layer, so the app's own rules still win. */
export const kitCss=()=>`@layer trialagents-kit{${kitTokensCss}${kitComponentsCss}}`;

/**
 * The helpers, as source text placed ahead of a v2 app's code (src/workspace/browser-runtime.ts effectiveSource).
 * Pure functions returning HTML strings: no data access of their own, so they behave the same on the server and in
 * the frame. Actions follow the app's own data-action names; the kit only adds the shapes.
 */
export const KIT_SOURCE=String.raw`const kit=(()=>{'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
 const attr=(k,v)=>v==null||v===false?'':v===true?' '+k:' '+k+'="'+esc(v)+'"';
 const button=(label,action,o={})=>'<button type="button" class="k-button'+(o.primary?' k-button--primary':'')+'"'+attr('data-action',action)+attr('disabled',!!o.disabled)+attr('aria-label',o.ariaLabel)+'>'+esc(label)+'</button>';
 /** Screens: tabs on top, or a side list with side:true; both fold into a scrolling row on narrow screens. */
 const nav=(items,current,o={})=>'<nav class="k-nav" aria-label="'+esc(o.label||'Screens')+'">'+items.map(i=>'<button type="button"'+attr('data-action',(o.prefix||'nav:')+i.id)+(i.id===current?' aria-current="page"':'')+'>'+esc(i.label)+'</button>').join('')+'</nav>';
 const layout=(navHtml,body,o={})=>o.side?'<div class="k-layout">'+navHtml+'<div>'+body+'</div></div>':navHtml+body;
 const page=body=>'<div class="k-app"><main class="k-main">'+body+'</main></div>';
 /** One editable value. Saving is the app's: handle the change event whose action starts with "edit:". */
 const cell=(c)=>{const action='edit:'+c.recordId+':'+c.field+(c.version!=null?':'+c.version:''),label=c.label||c.field,v=c.value;
  if(c.readOnly)return '<span>'+esc(Array.isArray(v)?v.join(', '):v??'—')+'</span>';
  if(c.kind==='select')return '<select class="k-cell"'+attr('data-action',action)+attr('aria-label',label)+'><option value="">—</option>'+(c.options||[]).map(o=>'<option'+attr('selected',o===v)+'>'+esc(o)+'</option>').join('')+'</select>';
  if(c.kind==='boolean')return '<input type="checkbox" class="k-cell"'+attr('data-action',action)+attr('aria-label',label)+attr('checked',v===true)+'>';
  const type=c.kind==='number'||c.kind==='money'?'number':c.kind==='date'?'date':'text';
  return '<input class="k-cell" type="'+type+'"'+(type==='number'?' step="any"':'')+attr('value',v??'')+attr('data-action',action)+attr('aria-label',label)+'>';};
 /** Reads an "edit:" event back: the record, field, version and typed value. */
 const edit=(event,kinds={})=>{const m=/^edit:([^:]+):([a-z][a-z0-9_]*)(?::(\d+))?$/.exec(event&&event.action||'');if(!m)return null;let value=event.value;const kind=kinds[m[2]];
  if(kind==='number'||kind==='money')value=value===''||value==null?null:Number(value);if(kind==='boolean')value=value===true||value==='true';if(value==='')value=null;
  return {recordId:m[1],field:m[2],version:m[3]==null?null:Number(m[3]),value};};
 /** A table that becomes cards on narrow screens. Column render(row) returns HTML; edit:{kind,options} makes it an inline cell. */
 const table=(o)=>{if(!o.rows.length)return o.empty||empty({title:'Nothing here yet'});
  return '<div class="k-table-wrap"><table class="k-table"><thead><tr>'+o.columns.map(c=>'<th scope="col">'+esc(c.label)+'</th>').join('')+'</tr></thead><tbody>'+o.rows.map(r=>'<tr>'+o.columns.map(c=>'<td'+attr('data-label',c.label)+'>'+(c.render?c.render(r):c.edit?cell({recordId:r.id,version:r.version,field:c.key,label:c.label,value:r.data?r.data[c.key]:r[c.key],...c.edit}):esc((r.data?r.data[c.key]:r[c.key])??'—'))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';};
 const empty=(o)=>'<div class="k-empty"><h3>'+esc(o.title)+'</h3>'+(o.text?'<p class="k-muted">'+esc(o.text)+'</p>':'')+(o.action?button(o.action.label,o.action.action,{primary:true}):'')+'</div>';
 const pager=(o)=>{const from=o.total?o.offset+1:0,to=Math.min(o.offset+o.limit,o.total??o.offset+o.limit);return '<div class="k-pager"><span>'+from+'–'+to+(o.total!=null?' of '+o.total:'')+'</span>'+button('Previous',(o.action||'page')+':'+Math.max(0,o.offset-o.limit),{disabled:o.offset<=0})+button('Next',(o.action||'page')+':'+(o.offset+o.limit),{disabled:o.total!=null&&o.offset+o.limit>=o.total})+'</div>';};
 /** A side panel for creating a record or editing many fields; it fills the screen on phones. */
 const panel=(o)=>'<aside class="k-panel" role="dialog" aria-modal="true"'+attr('aria-label',o.title)+'><header><h2>'+esc(o.title)+'</h2>'+button('×',o.close||'panel:close',{ariaLabel:'Close'})+'</header><div class="k-panel-body">'+o.body+'</div></aside>';
 /** A drag-and-drop board. Dropping a card sends the change event o.action with value "cardId>columnId"; the menu on each card does the same without dragging. */
 const board=(o)=>'<div class="k-board">'+o.columns.map(col=>'<section class="k-column"'+attr('data-drop',col.id)+attr('data-drop-action',o.action)+'><h3>'+esc(col.label)+' · '+col.cards.length+'</h3>'+col.cards.map(card=>'<article class="k-board-card" draggable="true"'+attr('data-drag',card.id)+'>'+card.html+'<select'+attr('data-action',o.action+'-menu:'+card.id)+attr('aria-label','Move '+(card.label||'card'))+'>'+o.columns.map(c=>'<option'+attr('value',c.id)+attr('selected',c.id===col.id)+'>'+esc(c.label)+'</option>').join('')+'</select></article>').join('')+'</section>').join('')+'</div>';
 /** Reads a board move back (drop or menu): {cardId, columnId}. */
 const move=(event,action)=>{if(!event)return null;if(event.action===action&&typeof event.value==='string'){const [cardId,columnId]=event.value.split('>');return cardId&&columnId?{cardId,columnId}:null;}if((event.action||'').startsWith(action+'-menu:'))return {cardId:event.action.slice(action.length+6),columnId:event.value};return null;};
 /** The working context a person chose (G4), e.g. a program or a fund. */
 const picker=(o)=>'<label class="k-picker"><span>'+esc(o.label)+'</span><select'+attr('data-action',o.action||'context')+'>'+o.options.map(x=>'<option'+attr('value',x.value)+attr('selected',x.value===o.value)+'>'+esc(x.label)+'</option>').join('')+'</select></label>';
 /** Business choices for the app's owners (G6). Returns nothing for editors and viewers. */
 const settings=(o,input)=>input&&input.appRole!=='owner'?'':'<form class="k-card"'+attr('data-action',o.action||'settings:save')+'>'+o.fields.map(f=>'<label class="k-field"><span>'+esc(f.label)+'</span>'+(f.options?'<select'+attr('name',f.name)+'>'+f.options.map(x=>'<option'+attr('selected',x===f.value)+'>'+esc(x)+'</option>').join('')+'</select>':'<input'+attr('name',f.name)+attr('value',f.value??'')+'>')+'</label>').join('')+'<button type="submit" class="k-button k-button--primary">Save</button></form>';
 /** Undo for the person's own last actions in this open app (G8): pass tools.call('undo.list').entries. */
 const undo=(entries)=>entries&&entries.length?button('Undo '+String(entries[0].label||'last change').toLowerCase(),'undo:'+entries[0].undoId):'';
 /** The platform message (U2): return it as output.notice. */
 const notice=(kind,message)=>({kind,message:String(message)});
 const stat=(label,value)=>'<div class="k-stat"><b>'+esc(value)+'</b><span>'+esc(label)+'</span></div>';
 return Object.freeze({version:'trialagents.kit.1',esc,attr,button,nav,layout,page,cell,edit,table,empty,pager,panel,board,move,picker,settings,undo,notice,stat});
})();`;
