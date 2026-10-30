import {frameLinkTarget} from './app-links.js';
import {SNAPSHOT_TTL} from './tracker-cache.js';
import {trackerRenderer} from '../workspace/standard-tracker.js';
// Only the shipped renderer and this trusted bridge run in the frame. Custom code stays in QuickJS.
export const FRAME_SCRIPT=String.raw`(()=>{'use strict';
 let navigationOnly=false,appLinks=false,appOrigin='',linkContext=null;
 const linkTarget=${frameLinkTarget.toString()};
 const renderTracker=function(config,theme,input,tools){${trackerRenderer}};
 const host=window.parent,root=document.getElementById('surface'),sheet=document.getElementById('appearance');
 let channel=null,model=null,uiState=null,controls=[],connected=false,detailScroll=0;
 let pending=Object.create(null),original=Object.create(null);
 const post=(kind,value={})=>{if(channel)host.postMessage({kind,channel,...value},'*');};
 const tone=v=>/fail|blocked|overdue|high|reject/i.test(String(v))?'red':/done|complete|active|approved|yes|ready/i.test(String(v))?'green':/pending|progress|medium|review|contact/i.test(String(v))?'amber':'blue';
 function footer(){
  const n=Object.keys(pending).length;
  const layoutDirty=uiState?.settings&&model?.saved&&JSON.stringify(uiState.layoutDraft)!==JSON.stringify({name:model.config.name,description:model.config.description,tabs:model.config.tabs.map(t=>({typeId:t.typeId,name:t.name,visible:t.visible!==false,columns:t.columns.map(c=>({field:c.field,label:c.label,visible:c.visible}))}))});
  for(const b of root.querySelectorAll('[data-action="save-edits"]'))b.disabled=!n;
  post('trialy.footer',{footer:n?{kind:'edits',count:n}:layoutDirty?{kind:'layout'}:null});post('trialy.state',{state:uiState});
 }
 function activateCell(button){const holder=button.parentElement,editor=holder.querySelector('.cell-input,.example-input');if(!editor)return;editor._before={pending:{...pending},examples:{...uiState?.examples}};button.hidden=true;editor.hidden=false;editor.querySelector('input,textarea,select')?.focus({preventScroll:true});}
 function showValue(el,c,value,edited){
  el.replaceChildren();
  const d=c.display||{},values=Array.isArray(value)?value:[value];
  for(const [i,v] of values.entries()){
   if(i&&!(d.kind==='badge'))el.append(document.createTextNode(', '));
   const text=v==null||v===''?'—':c.kind==='boolean'?(v===true||v==='true'?'Yes':'No'):String(v);
   if(v!=null&&v!==''&&(d.kind==='badge')){const pill=document.createElement('span');const color=d.valueTones?.[String(v)]||d.tone||'neutral';pill.className='pill '+(['green','blue','amber','red'].includes(color)?color:'');pill.textContent=text;el.append(pill);}
   else if(!c.editable&&d.kind==='link'&&/^https?:\/\//i.test(String(v))){const a=document.createElement('a');a.href=String(v);a.textContent=text;a.target='_blank';a.rel='noopener noreferrer';if(appLinks){try{const u=new URL(String(v));if(!u.username&&!u.password){a.dataset.appHref=u.href;a.dataset.external='true';}}catch{}}el.append(a);}
   else el.append(document.createTextNode(text));
  }
  if(!Array.isArray(value)&&value!=null){
   if(!edited&&c.rendered?.text!=null)el.textContent=String(c.rendered.text);
   else if(d.kind==='number'&&typeof value==='number')el.textContent=(d.prefix||'')+value.toFixed(d.decimals??2)+(d.suffix||'');
   else if(d.prefix||d.suffix)el.textContent=(d.prefix||'')+el.textContent+(d.suffix||'');
   if(d.kind==='progress'&&typeof value==='number'){const meter=document.createElement('progress');meter.max=100;meter.value=Math.max(0,Math.min(100,(value-(d.min??0))/((d.max??100)-(d.min??0)||1)*100));meter.setAttribute('aria-label',c.label);el.append(meter);}
  }
 }
 function collapsed(slot,c){
  if(!c.editable)return;
  const editor=document.createElement('span');editor.className='cell-input';editor.hidden=true;editor.append(...slot.childNodes);
  const button=document.createElement('button');button.type='button';button.className='cell-display';button.setAttribute('aria-label','Edit '+c.label);
  const refresh=()=>{const value=c.example?(uiState.examples[c.fieldId]??c.value):c.action in pending?(c.multiple?JSON.parse(pending[c.action]):pending[c.action]):c.value;showValue(button,c,value,c.action in pending);button.style.background=c.action in pending?'#e5f6e9':'';};refresh();
  editor.addEventListener('focusout',()=>{queueMicrotask(()=>{if(editor.contains(document.activeElement))return;editor.hidden=true;button.hidden=false;refresh();});});
  slot.replaceChildren(button,editor);
 }
 const tags=new Set('div span p h1 h2 h3 h4 h5 h6 section article header footer main nav aside ul ol li dl dt dd table thead tbody tfoot tr th td caption colgroup col form label input textarea select option optgroup button fieldset legend output progress meter details summary br hr pre code blockquote strong em b i u s small sub sup a img svg g path rect circle ellipse line polyline polygon text tspan defs lineargradient radialgradient stop clippath title desc'.split(' '));
 const attrs=new Set('class id style title role tabindex name value placeholder disabled readonly required checked selected multiple min max step minlength maxlength rows cols colspan rowspan scope for width height alt viewbox d x y x1 y1 x2 y2 cx cy r rx ry points fill stroke stroke-width stroke-linecap stroke-linejoin opacity transform xmlns offset stop-color stop-opacity preserveaspectratio data-action data-trialy-example data-trialy-value data-trialy-slot data-ui-state data-reorder data-resize-column data-resize-row draggable inert hidden'.split(' '));
 const inputTypes=new Set('text number date datetime-local month week time email tel url checkbox radio range color hidden button submit reset'.split(' '));
 function clean(html){const template=document.createElement('template');template.innerHTML=html;
  function walk(parent){for(const node of Array.from(parent.childNodes)){
   if(node.nodeType===3)continue;if(node.nodeType!==1){node.remove();continue;}
   const tag=node.localName.toLowerCase();if(!tags.has(tag)){node.remove();continue;}
   for(const attr of Array.from(node.attributes)){const name=attr.name.toLowerCase();
    if(name==='type'&&tag==='input'){if(!inputTypes.has(attr.value.toLowerCase()))node.setAttribute('type','text');continue;}
    if(name==='type'&&tag==='button'){node.setAttribute('type',['button','submit','reset'].includes(attr.value)?attr.value:'button');continue;}
    if(name==='src'&&tag==='img'&&/^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(attr.value))continue;
    if(name==='href'&&tag==='a'&&appLinks){const href=attr.value;if(href.length<=2000&&!/[\\\u0000-\u0020]/.test(href)&&!href.startsWith('//')&&(!/^[a-z][a-z0-9+.-]*:/i.test(href)||/^(https?:|mailto:|tel:)/i.test(href))){node.dataset.appHref=href;continue;}}
    if(!attrs.has(name)&&!/^aria-[a-z-]+$/.test(name))node.removeAttribute(attr.name);
   }
   if(tag==='a'&&node.dataset.appHref){const target=linkTarget(node.dataset.appHref,appOrigin,linkContext);if(!target){node.removeAttribute('href');delete node.dataset.appHref;}else if(target.external){node.href=target.href;node.target='_blank';node.rel='noopener noreferrer';node.dataset.external='true';}else node.setAttribute('href','#');}
   walk(node);
  }}walk(template.content);return template.content;
 }

 function paint(html,css){
  document.body.classList.toggle('standard',!!model);
  const horizontalScroll=root.querySelector('.scroll')?.scrollLeft||0;
  const focused=document.activeElement,focusAction=focused?.getAttribute('data-action'),focusGrip=focused?.hasAttribute('data-reorder')?focused.getAttribute('aria-label'):null,selection=focused?.selectionStart,editBefore=focused?.closest('.example-input')?._before;
  root.replaceChildren(clean(html));sheet.textContent=css;
  if(connected){
   for(const el of root.querySelectorAll('input,select,textarea'))if(!el.hasAttribute('data-ui-state')){el.disabled=true;el.title='Use a connected data control';}
   const examples=Array.from(root.querySelectorAll('[data-trialy-example]')).map(el=>{const [ti,ci]=el.getAttribute('data-trialy-example').split(':').map(Number),c=model?.config.tabs[ti]?.columns[ci];return c?{...c,example:true,selector:'[data-trialy-example="'+ti+':'+ci+'"]',slot:'example_'+ti+'_'+ci,action:'example-bound:'+c.fieldId,value:uiState.examples[c.fieldId]??JSON.parse(el.getAttribute('data-trialy-value')||'[]')}:null;}).filter(Boolean);
   for(const control of [...controls,...examples]){
    const c=uiState?.newRow?{...control,editable:false}:control;
    if(!/^[a-z][a-z0-9_]{0,63}$/.test(c.slot))continue;
    for(const slot of root.querySelectorAll(c.selector||'[data-trialy-slot="'+c.slot+'"]')){
     if(c.editable&&c.multiple){
      const stored=c.example?(uiState.examples[c.fieldId]??c.value):c.action in pending?JSON.parse(pending[c.action]):c.value;
      const values=Array.isArray(stored)?[...stored]:stored==null||stored===''?[]:[stored];
      original[c.action]=JSON.stringify(Array.isArray(c.value)?c.value:c.value==null||c.value===''?[]:[c.value]);
      const group=document.createElement('span');group.className='multi-value-editor';
      const stageValues=()=>{const filtered=values.filter(v=>v!=='');if(c.example){uiState.examples[c.fieldId]=filtered;post('trialy.state',{state:uiState});}else{const wire=JSON.stringify(filtered);if(wire===original[c.action])delete pending[c.action];else pending[c.action]=wire;}footer();};
      const render=()=>{group.replaceChildren();const rows=values.length?values:[''];
       rows.forEach((value,i)=>{const row=document.createElement('span');row.className='multi-value-row';const input=document.createElement(c.kind==='select'?'select':'input');
        if(c.kind==='select'){const blank=document.createElement('option');blank.value='';blank.textContent='Choose…';input.append(blank);for(const v of c.options){const o=document.createElement('option');o.value=v;o.textContent=v;input.append(o);}}else{input.type=['number','money'].includes(c.kind)?'number':'text';input.step='any';}
        input.value=String(value);input.setAttribute('aria-label',i?c.label+' '+(i+1):c.label);input.style.background=c.action in pending?'#e5f6e9':'';
        const stage=()=>{const raw=input.value;values[i]=raw===''?'':['number','money'].includes(c.kind)?Number(raw):raw;stageValues();input.style.background=c.action in pending?'#e5f6e9':'';footer();};
        input.addEventListener(c.kind==='select'?'change':'input',stage);row.append(input);
        if(rows.length>1){const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Remove '+c.label+' '+(i+1));remove.onmousedown=e=>e.preventDefault();remove.onclick=()=>{values.splice(i,1);stageValues();render();group.querySelector('input,select,button')?.focus();};row.append(remove);}group.append(row);
       });
       const add=document.createElement('button');add.type='button';add.textContent='+ Add value';add.setAttribute('aria-label','Add '+c.label+' value');add.disabled=values.length>=100;add.onmousedown=e=>e.preventDefault();add.onclick=()=>{if(!values.length)values.push('');values.push('');render();group.querySelectorAll('input,select')[values.length-1]?.focus();};group.append(add);
      };render();slot.replaceChildren(group);collapsed(slot,c);continue;
     }
     const el=document.createElement(c.editable?(c.kind==='select'?'select':'input'):'span');
     if(c.editable){
      if(c.kind==='select'){const blank=document.createElement('option');blank.value='';blank.textContent='Choose…';el.append(blank);for(const option of c.options){const o=document.createElement('option');o.value=option;o.textContent=option;el.append(o);}}
      else el.type=c.kind==='boolean'?'checkbox':['number','money'].includes(c.kind)?'number':c.kind==='date'?'date':'text';
      const value=c.action in pending?pending[c.action]:c.value;
      if(c.kind==='boolean')el.checked=value===true;else el.value=value==null?'':String(value);
      el.setAttribute('data-action',c.action);el.setAttribute('aria-label',c.label);
      original[c.action]=c.kind==='boolean'?c.value===true:c.value==null?'':String(c.value);
      if(c.action in pending)el.style.background='#e5f6e9';
     }else el.textContent=c.value==null?'—':Array.isArray(c.value)?c.value.join(', '):String(c.value);
     if(!c.editable)showValue(el,c,c.value,false);
     slot.replaceChildren(el);collapsed(slot,c);
    }
   }
  }
  const scroller=root.querySelector('.scroll');if(scroller)scroller.scrollLeft=horizontalScroll;
  if(focusAction){const el=Array.from(root.querySelectorAll('[data-action]')).find(x=>x.getAttribute('data-action')===focusAction);if(el){const editor=el.closest('.cell-input,.example-input');if(editor){editor._before=editBefore;editor.hidden=false;editor.previousElementSibling.hidden=true;}el.focus({preventScroll:true});}if(typeof selection==='number'&&el?.setSelectionRange)try{el.setSelectionRange(selection,selection);}catch{}}
  if(focusGrip)Array.from(root.querySelectorAll('[data-reorder]')).find(x=>x.getAttribute('aria-label')===focusGrip)?.focus({preventScroll:true});
  footer();
 }
 function local(event){
  const navigation=/^(tab:|filter:|next$|previous$|overview-next$|overview-previous$|overview-panel$)/.test(event.action||'');
  if(navigation&&(Object.keys(pending).length||uiState?.newRow))return false;
  if(!model||!/^((draft|resize-column|resize-row|example|tab|filter|sort-field|details|tab-name|tab-visible|column-label|visibility|move-tab|move-column|reorder-tab|reorder-column):|tracker:add$|discard-new$|query$|sort$|next$|previous$|overview-next$|overview-previous$|overview-panel$|settings$|discard-layout$|column-tab$|layout-name$|layout-description$|close-details$)/.test(event.action||''))return false;
  const old=uiState,next=structuredClone(uiState);
  try{
   const output=renderTracker(model.config,model.theme,{state:next,event,saved:model.saved,writable:model.writable},{call:(name,value)=>{
    if(name!=='records.read')throw Error('Server action');
    const p=model.pages.find(p=>p.request.typeId===value.typeId&&p.request.limit===value.limit&&p.request.offset===value.offset&&JSON.stringify(Object.entries(p.request.filters||{}).sort())===JSON.stringify(Object.entries(value.filters||{}).sort())&&(!navigation||Date.now()-p.receivedAt<${SNAPSHOT_TTL}));if(!p)throw Error('Page needed');return p.result;
   }});
   if(navigation){const nextControls=(output.controls||[]).map(c=>{const cached=model.cachedControls?.[c.fieldId+':'+c.recordId];if(!cached)throw Error('Controls needed');return {...cached,slot:c.slot};});controls=nextControls;}
   uiState=output.state;paint(output.html,output.css);
   if(!old?.detail&&uiState.detail){detailScroll=scrollY;scrollTo(0,0);root.querySelector('[aria-label="Close details"]')?.focus({preventScroll:true});}
   else if(old?.detail&&!uiState.detail){scrollTo(0,detailScroll);root.querySelector('[data-action="details:'+old.detail+'"]')?.focus({preventScroll:true});}
   else if(event.action==='settings'||event.action==='discard-layout')scrollTo(0,0);
   return true;
  }catch{return false;}
 }
 function dispatch(event){
  if((Object.keys(pending).length||uiState?.newRow)&&['tracker:add','tracker:layout','settings'].includes(event.action)){post('trialy.notice',{message:'Save or cancel your current changes first.'});return;}
  if(local(event))return;
  if(Object.keys(pending).length&&!['bound-batch'].includes(event.action)){post('trialy.notice',{message:'Save or ignore your current edits before this action.'});return;}
  if(uiState?.newRow&&event.action!=='tracker:create'){post('trialy.notice',{message:'Save or cancel the new row before this action.'});return;}
  post('trialy.event',{event,state:uiState});
 }
 function footerAction(action){
  if(action==='save-edits')dispatch({kind:'submit',action:'bound-batch',value:null,form:{...pending}});
  else if(action==='discard-edits'){pending=Object.create(null);if(!local({kind:'change',action:'sort',value:uiState?.sorts?.[uiState.tab]||''})){for(const el of root.querySelectorAll('[data-action]')){const k=el.getAttribute('data-action');if(k in original){if(el.type==='checkbox')el.checked=original[k];else el.value=original[k];el.style.background='';}}footer();}}
  else if(action==='save-layout'||action==='discard-layout')dispatch({kind:'click',action,value:null,form:{}});
 }
 window.addEventListener('message',event=>{
  if(event.source!==host||typeof event.data?.channel!=='string')return;
  const v=event.data;if(channel!==null&&v.channel!==channel)return;
  if(v.kind==='trialy.cache'){if(model&&v.tracker){model=v.tracker;}return;}
  if(v.kind==='trialy.action'){footerAction(v.action);return;}
  if(v.kind!=='trialy.render'||typeof v.html!=='string'||v.html.length>200000||typeof v.css!=='string'||v.css.length>50000)return;
  navigationOnly=!!v.navigationOnly;appLinks=!!v.appLinks;appOrigin=v.appOrigin||'';linkContext=v.linkContext||null;channel=v.channel;model=v.tracker||null;uiState=v.state;controls=Array.isArray(v.controls)?v.controls:[];connected=v.connected;
  pending=Object.create(null);original=Object.create(null);paint(v.html,v.css);post('trialy.rendered');
 });
 function send(kind,target){
  const trigger=target.closest('[data-action]');if(!trigger||!channel)return;const action=trigger.getAttribute('data-action');if(!action||action.length>200)return;
  if(action==='save-edits'){post('trialy.approve',{action:'bound-batch'});footerAction(action);return;}
  if(action==='save-new'){post('trialy.approve',{action:'tracker:create'});dispatch({kind:'submit',action:'tracker:create',form:{data:JSON.stringify(uiState.newRow?.data??{})}});return;}
  if(action.startsWith('bound:')){
   if(!(action in original))return;
   const value=target.type==='checkbox'?target.checked:target.value;
   if(value===original[action])delete pending[action];else pending[action]=value;
   for(const el of root.querySelectorAll('[data-action]'))if(el.getAttribute('data-action')===action){if(el.type==='checkbox')el.checked=value;else el.value=value;el.style.background=action in pending?'#e5f6e9':'';}
   footer();return;
  }
  const form=trigger.closest('form'),values=Object.create(null);if(form){let n=0;for(const [key,value] of new FormData(form)){if(++n>100||key.length>100||typeof value!=='string'||value.length>50000)return;values[key]=value;}}
  dispatch({kind,action,value:target.type==='checkbox'?target.checked:typeof target.value==='string'?target.value:null,form:values});
 }
 root.addEventListener('click',e=>{const target=e.target;if(!(target instanceof Element))return;
  const display=target.closest('.cell-display');if(display){e.preventDefault();activateCell(display);return;}const anchor=target.closest('a');if(anchor){if(appLinks&&anchor.dataset.appHref){if(anchor.dataset.external==='true')return;e.preventDefault();if(Object.keys(pending).length||uiState?.newRow){post('trialy.notice',{message:'Save or ignore your current edits before following this link.'});return;}post('trialy.link',{href:anchor.dataset.appHref});return;}e.preventDefault();}const b=target.closest('button,input[type=submit]');if(b?.disabled)return;
  if(b&&b.type==='submit'&&b.form){e.preventDefault();send('submit',b);return;}
  if(target.closest('[data-action]')&&!target.matches('input,textarea,select,option')){e.preventDefault();send('click',target);}
 });
 root.addEventListener('input',e=>{if(appLinks&&!model)post('trialy.dirty',{dirty:true});if(e.target instanceof Element&&(e.target.matches('input[data-ui-state],textarea[data-ui-state]')||e.target.getAttribute('data-action')?.startsWith('bound:')))send('change',e.target);});
 root.addEventListener('change',e=>{if(e.target instanceof Element&&!e.target.matches('input[data-ui-state],textarea[data-ui-state]'))send('change',e.target);});
 root.addEventListener('focusout',e=>{const editor=e.target.closest('.example-input');if(editor)queueMicrotask(()=>{if(!editor.contains(document.activeElement)){editor.hidden=true;editor.previousElementSibling.hidden=false;}});});
 root.addEventListener('submit',e=>{e.preventDefault();if(e.target instanceof Element)send('submit',e.target);});
 root.addEventListener('keydown',e=>{
  const editor=e.target.closest('.cell-input,.example-input');
  if(editor&&e.key==='Enter'&&e.target.matches('input,select')){e.preventDefault();e.target.blur();return;}
  if(editor&&e.key==='Escape'){e.preventDefault();if(editor._before){pending=Object.assign(Object.create(null),editor._before.pending);uiState.examples=editor._before.examples;}e.target.blur();local({kind:'change',action:'sort',value:uiState?.sorts?.[uiState.tab]||''});return;}
  const resize=e.target.closest('[data-resize-column],[data-resize-row]');
  if(resize&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const column=resize.hasAttribute('data-resize-column'),delta=['ArrowLeft','ArrowUp'].includes(e.key)?-10:10;dispatch({kind:'change',action:(column?'resize-column:':'resize-row:')+(column?resize.dataset.resizeColumn:resize.dataset.resizeRow),value:Number(resize.getAttribute('aria-valuenow'))+delta});const next=Array.from(root.querySelectorAll(column?'[data-resize-column]':'[data-resize-row]')).find(x=>(column?x.dataset.resizeColumn:x.dataset.resizeRow)===(column?resize.dataset.resizeColumn:resize.dataset.resizeRow));next?.focus({preventScroll:true});return;}
  const handle=e.target.closest('[data-reorder]');
  if(handle&&e.altKey&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();dispatch({kind:'click',action:'move-'+handle.dataset.reorder+':'+(e.key==='ArrowUp'?-1:1)});}
  if(e.key==='Escape'&&uiState?.detail){e.preventDefault();dispatch({kind:'click',action:'close-details'});}
  if(e.key==='Tab'&&uiState?.detail){const els=Array.from(root.querySelectorAll('.drawer button,.drawer input,.drawer select,.drawer textarea,.drawer [tabindex]')).filter(x=>!x.disabled);if(e.shiftKey&&e.target===els[0]){e.preventDefault();els.at(-1)?.focus();}else if(!e.shiftKey&&e.target===els.at(-1)){e.preventDefault();els[0]?.focus();}}
  if(e.target.matches('.drawer-resizer')&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();document.documentElement.style.setProperty('--drawer-width',Math.max(365,Math.min(innerWidth,root.querySelector('.drawer').offsetWidth+(e.key==='ArrowLeft'?20:-20)))+'px');}
 });
 let dragged=null;
 root.addEventListener('dragstart',e=>{const h=e.target.closest('[data-reorder]');if(h&&model?.saved){dragged=h.dataset.reorder;e.dataTransfer.setData('text/plain',dragged);}else e.preventDefault();});
 root.addEventListener('dragover',e=>{const row=e.target.closest('.layout-entry');if(dragged&&row){e.preventDefault();row.classList.add('drag-over');}});
 root.addEventListener('dragleave',e=>e.target.closest('.layout-entry')?.classList.remove('drag-over'));
 root.addEventListener('drop',e=>{e.preventDefault();const target=e.target.closest('.layout-entry')?.querySelector('[data-reorder]')?.dataset.reorder;if(dragged&&target){const from=dragged.split(':'),to=target.split(':');if(from[0]===to[0]&&(from[0]==='tab'||from[1]===to[1]))dispatch({kind:'click',action:'reorder-'+dragged+':'+to.at(-1)});}dragged=null;});
 root.addEventListener('pointerdown',e=>{const handle=e.target.closest('[data-resize-column],[data-resize-row]');if(!handle||!model)return;e.preventDefault();const column=handle.hasAttribute('data-resize-column'),key=column?handle.dataset.resizeColumn:handle.dataset.resizeRow,start=column?e.clientX:e.clientY,initial=Number(handle.getAttribute('aria-valuenow'));let value=initial;
  const table=handle.closest('table'),row=handle.closest('tr'),col=column?table.querySelectorAll('col')[handle.closest('th').cellIndex]:null,total=table.offsetWidth;
  handle.setPointerCapture(e.pointerId);
  const move=ev=>{value=Math.max(column?85:38,Math.min(column?650:180,initial+(column?ev.clientX:ev.clientY)-start));if(column){col.style.width=value+'px';table.style.width=table.style.minWidth=(total+value-initial)+'px';}else{row.style.height=value+'px';for(const cell of row.querySelectorAll('.cell-content'))cell.style.maxHeight=Math.max(22,value-16)+'px';}};
  const finish=ev=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',finish);dispatch({kind:'change',action:(column?'resize-column:':'resize-row:')+key,value:ev.type==='pointercancel'?initial:value});};
  handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
 });
 root.addEventListener('pointerdown',e=>{if(!e.target.matches('.drawer-resizer'))return;e.preventDefault();const move=ev=>document.documentElement.style.setProperty('--drawer-width',Math.max(365,Math.min(innerWidth,innerWidth-ev.clientX))+'px');const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);});
 new ResizeObserver(()=>{if(!model)post('trialy.resize',{height:Math.ceil(root.getBoundingClientRect().height)+32});}).observe(document.body);
 host.postMessage({kind:'trialy.ready'},'*');
})();`;
export async function frontendFrameDocument(fontCss=''){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(FRAME_SCRIPT));
 const hash=btoa(String.fromCharCode(...new Uint8Array(bytes)));
 return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fontCss}@layer trialagents-defaults{body{font:15px Inter,Arial,sans-serif;margin:0;color:#183d32}*{box-sizing:border-box}}input,button,select,textarea{font:inherit}.cell-input[hidden],.cell-display[hidden]{display:none!important}.multi-value-editor{display:grid;gap:5px;min-width:150px}.multi-value-row{display:flex;gap:4px;align-items:center}.multi-value-row input,.multi-value-row select{width:100%;min-width:0}.multi-value-editor>button{justify-self:start;width:auto}.multi-value-editor button{font-size:12px;padding:3px 6px;color:#253c40;background:#f8faf9;border:1px solid #dce5e1;border-radius:6px;text-align:left}</style><style id="appearance"></style></head><body><div id="surface"></div><script>${FRAME_SCRIPT}</script></body></html>`;
}

