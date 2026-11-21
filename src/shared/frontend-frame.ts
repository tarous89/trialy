import {frameLinkTarget} from './app-links.js';
import {SNAPSHOT_TTL} from './tracker-cache.js';
import {trackerRenderer} from '../workspace/standard-tracker.js';
import {FRAME_ENGINE_SCRIPT,frameEngineWasmBase64,sha256Base64} from './frame-engine.js';
// Only the shipped renderer and this trusted bridge run in the frame. Custom code stays in QuickJS.
export const FRAME_SCRIPT=String.raw`(()=>{'use strict';
 let navigationOnly=false,appLinks=false,appOrigin='',linkContext=null;
 const linkTarget=${frameLinkTarget.toString()};
 const renderTracker=function(config,theme,input,tools){${trackerRenderer}};
 const host=window.parent,root=document.getElementById('surface'),sheet=document.getElementById('appearance');
 let channel=null,model=null,uiState=null,controls=[],connected=false,detailScroll=0;
 let pending=Object.create(null),original=Object.create(null),savingCell=false,inflight=Object.create(null),failed=[],failedMessage='',held=[];
 document.documentElement.classList.add('trialy-responsive-toolbar');
 let optionsOpen=false,optionsTab=null,toolbarObserver=null;
 function setOptionsOpen(open,focus=false){
  optionsOpen=open;const bar=root.querySelector('.tracker-toolbar'),button=bar?.querySelector('.tracker-options-toggle');
  bar?.classList.toggle('options-open',open);button?.setAttribute('aria-expanded',String(open));if(focus)button?.focus({preventScroll:true});
 }
 function fitToolbar(){
  const bar=root.querySelector('.tracker-toolbar');if(!bar)return;
  const options=bar.querySelector('.tracker-options'),add=bar.querySelector(':scope>.primary');if(!options||!add)return;
  const compact=bar.clientWidth<420;bar.classList.toggle('toolbar-compact',compact);add.textContent=compact?'+ Add':'+ Add record';bar.classList.remove('options-overflow');
  const gap=parseFloat(getComputedStyle(bar).gap)||10;
  const overflow=160+options.getBoundingClientRect().width+add.getBoundingClientRect().width+gap*2>bar.clientWidth;
  bar.classList.toggle('options-overflow',overflow);setOptionsOpen(overflow&&optionsOpen);
 }
 const post=(kind,value={})=>{if(channel)host.postMessage({kind,channel,...value},'*');};
 const tone=v=>/fail|blocked|overdue|high|reject/i.test(String(v))?'red':/done|complete|active|approved|yes|ready/i.test(String(v))?'green':/pending|progress|medium|review|contact/i.test(String(v))?'amber':'blue';
 function footer(){
  const n=Object.keys(pending).length;
  const layoutDirty=uiState?.settings&&model?.saved&&JSON.stringify(uiState.layoutDraft)!==JSON.stringify({name:model.config.name,description:model.config.description,tabs:model.config.tabs.map(t=>({typeId:t.typeId,name:t.name,visible:t.visible!==false,columns:t.columns.map(c=>({field:c.field,label:c.label,visible:c.visible}))}))});
  for(const b of root.querySelectorAll('[data-action="save-edits"]'))b.disabled=!n;
  for(const b of root.querySelectorAll('[data-action="save-layout"]'))b.disabled=!layoutDirty;
  post('trialy.footer',{footer:n?{kind:'edits',count:n}:layoutDirty?{kind:'layout'}:null});post('trialy.state',{state:uiState});
 }
 function commitCell(){
  if(!model?.saved||!model?.writable||savingCell||!Object.keys(pending).length)return;
  // P5 (4.5): the new value stays on screen while it saves; the rest of the app stays usable.
  savingCell=true;inflight={...pending};post('trialy.approve',{action:'bound-batch'});footerAction('save-edits');
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
  editor.addEventListener('focusout',()=>{queueMicrotask(()=>{if(editor.contains(document.activeElement))return;editor.hidden=true;button.hidden=false;refresh();commitCell();});});
  slot.replaceChildren(button,editor);
 }
 const tags=new Set('div span p h1 h2 h3 h4 h5 h6 section article header footer main nav aside ul ol li dl dt dd table thead tbody tfoot tr th td caption colgroup col form label input textarea select option optgroup button fieldset legend output progress meter details summary br hr pre code blockquote strong em b i u s small sub sup a img svg g path rect circle ellipse line polyline polygon text tspan defs lineargradient radialgradient stop clippath title desc'.split(' '));
 const attrs=new Set('class id style title role tabindex name value placeholder disabled readonly required checked selected multiple min max step minlength maxlength rows cols colspan rowspan scope for width height alt viewbox d x y x1 y1 x2 y2 cx cy r rx ry points fill stroke stroke-width stroke-linecap stroke-linejoin opacity transform xmlns offset stop-color stop-opacity preserveaspectratio data-action data-trialy-integration data-trialy-open data-trialy-document data-trialy-example data-trialy-value data-trialy-slot data-ui-state data-drag data-drop data-drop-action data-label data-reorder data-resize-column data-resize-row draggable inert hidden'.split(' '));
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

 // P2, P5 (4.4): what a person typed into a form field survives a new screen, unless the server changed that field's own value.
 const typed=new Map();
 const fieldKey=el=>{const name=el.getAttribute('name');if(!name||el.matches('[data-ui-state],[data-action^="bound:"]'))return null;const owner=el.closest('[data-action]');return (owner?owner.getAttribute('data-action'):'')+'|'+name;};
 const isTextField=el=>el instanceof HTMLTextAreaElement||el instanceof HTMLSelectElement||(el instanceof HTMLInputElement&&!['checkbox','radio','file','submit','button','hidden'].includes(el.type));
 const defaultOf=el=>el instanceof HTMLSelectElement?([...el.options].find(o=>o.defaultSelected)??el.options[0])?.value??'':el.defaultValue;
 function rememberTyped(el){if(!isTextField(el))return;const key=fieldKey(el);if(key)typed.set(key,{value:el.value,base:defaultOf(el)});}
 function restoreTyped(){for(const [key,t] of typed){const [owner,name]=key.split('|');const scope=owner?[...root.querySelectorAll('[data-action]')].find(e=>e.getAttribute('data-action')===owner):root;const el=scope&&[...scope.querySelectorAll('[name]')].find(e=>e.getAttribute('name')===name&&isTextField(e));
  if(!el||defaultOf(el)!==t.base){typed.delete(key);continue;}if(el.value!==t.value)el.value=t.value;}}
 function paint(html,css){
  document.body.classList.toggle('standard',!!model);
  const horizontalScroll=root.querySelector('.scroll')?.scrollLeft||0;
  const focused=document.activeElement,focusAction=focused?.getAttribute('data-action'),focusGrip=focused?.hasAttribute('data-reorder')?focused.getAttribute('aria-label'):null,selection=focused?.selectionStart,editBefore=focused?.closest('.example-input')?._before;
  root.replaceChildren(clean(html));sheet.textContent=css;restoreTyped();
  if(optionsTab!==uiState?.tab){optionsOpen=false;optionsTab=uiState?.tab;}
  toolbarObserver?.disconnect();fitToolbar();const toolbar=root.querySelector('.tracker-toolbar');
  if(toolbar){toolbarObserver=new ResizeObserver(fitToolbar);toolbarObserver.observe(toolbar);}
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
  // Sorting/searching change the records assigned to slots just like paging.
  // Rebind signed controls, check freshness and guard pending edits on every such read.
  const navigation=/^(tab:|filter:|sort-field:|sort$|query$|next$|previous$|overview-next$|overview-previous$|overview-panel$)/.test(event.action||'');
  if(navigation&&(Object.keys(pending).length||uiState?.newRow))return false;
  if(!model||!/^((draft|resize-column|resize-row|example|tab|filter|sort-field|details|tab-name|tab-visible|column-label|visibility|move-tab|move-column|reorder-tab|reorder-column):|tracker:add$|discard-new$|discard-edits$|query$|sort$|next$|previous$|overview-next$|overview-previous$|overview-panel$|settings$|discard-layout$|column-tab$|layout-name$|layout-description$|close-details$)/.test(event.action||''))return false;
  const old=uiState,next=structuredClone(uiState);
  try{
   const output=renderTracker(model.config,model.theme,{state:next,event,saved:model.saved,writable:model.writable},{call:(name,value)=>{
    if(name!=='records.read')throw Error('Server action');
    const p=model.pages.find(p=>p.request.typeId===value.typeId&&(p.request.q||'')===(value.q||'')&&JSON.stringify(p.request.sort||null)===JSON.stringify(value.sort||null)&&(value.limit===0||p.request.limit===value.limit&&p.request.offset===value.offset)&&JSON.stringify(Object.entries(p.request.filters||{}).sort())===JSON.stringify(Object.entries(value.filters||{}).sort())&&(!navigation||Date.now()-p.receivedAt<${SNAPSHOT_TTL}));if(!p)throw Error('Page needed');return value.limit===0?{...p.result,rows:[],limit:0,offset:value.offset}:p.result;
   }});
   if(navigation){const nextControls=(output.controls||[]).map(c=>{const cached=model.cachedControls?.[c.fieldId+':'+c.recordId];if(!cached)throw Error('Controls needed');return {...cached,slot:c.slot};});controls=nextControls;}
   uiState=output.state;paint(output.html,output.css);
   if(!old?.detail&&uiState.detail){detailScroll=scrollY;scrollTo(0,0);root.querySelector('[aria-label="Close details"]')?.focus({preventScroll:true});}
   else if(old?.detail&&!uiState.detail){scrollTo(0,detailScroll);root.querySelector('[data-action="details:'+old.detail+'"]')?.focus({preventScroll:true});}
   else if(event.action==='settings'||event.action==='discard-layout')scrollTo(0,0);
   return true;
  }catch{return false;}
 }
 // P4, P2, P5 (5.1, 5.3): the app also runs here. The engine starts when the first screen of a browser-capable app
 // arrives; until it is ready, and for anything with an outside effect, events go to the server as before.
 const Engine=window.TrialyEngine;let engineState='off',engineReady=null,browserApp=null,store=null,styles=null,localInput={},serverBusy=false,localHeld=[],optimistic=null,readSeq=0,eventSeq=0,localOff=false;
 const pendingReads=new Map();let viewportClass='',coarse=false;
 function startEngine(){
  if(engineReady)return engineReady;const binary=document.getElementById('trialy-engine-binary');
  if(!Engine||!binary){engineState='missing';host.postMessage({kind:'trialy.engine',status:'unavailable',reason:'missing'},'*');return engineReady=Promise.resolve(null);}
  engineState='starting';
  return engineReady=Engine.start(binary.textContent).then(api=>{engineState='ready';binary.remove();return api;},e=>{engineState='unavailable';host.postMessage({kind:'trialy.engine',status:'unavailable',reason:String(e&&e.message||'failed').slice(0,40)},'*');return null;});
 }
 const runtimeCss=html=>styles?styles.base+(styles.shell&&/\bta-[a-z-]+/.test(html)?styles.shell:''):'';
 function applyBrowser(b,v){
  store??=Engine.createStore();store.seed(b.reads,!!b.reset);styles=b.styles||styles;
  for(const k of Object.keys(localInput))delete localInput[k];Object.assign(localInput,b.input||{});if(b.version==='v2'&&viewportClass)localInput.viewport={width:viewportClass,coarse};
  if(browserApp&&browserApp.digest!==b.digest&&!b.source){try{browserApp.app.dispose();}catch{}browserApp=null;}
  const verify=v.verify&&v.verify.event&&v.verify.event.kind==='open'?{state:v.verify.state,event:v.verify.event,html:v.html,state2:JSON.stringify(v.state??null)}:null;
  if(b.source&&(!browserApp||browserApp.digest!==b.digest)){const code=b.source,digest=b.digest,version=b.version;
   startEngine().then(api=>{if(!api)return;setTimeout(()=>{try{
    if(browserApp){try{browserApp.app.dispose();}catch{}}const app=api.load(code);browserApp={digest,version,app,run:Engine.createLocalApp({app,version,store,input:localInput})};localOff=false;
    // The first screen came from the server: made again here, it must be identical, or this view stays on server mode.
    if(verify){const r=browserApp.run.run(verify.state,verify.event);if(r.kind==='painted'&&(r.output.html!==verify.html||JSON.stringify(r.output.state)!==verify.state2)){localOff=true;host.postMessage({kind:'trialy.engine',status:'mismatch',digest},'*');return;}}
    host.postMessage({kind:'trialy.engine',status:'loaded',digest,version},'*');warm();
   }catch(e){browserApp=null;host.postMessage({kind:'trialy.engine',status:'unavailable',reason:'load'},'*');}},0);});
  }else if(browserApp)setTimeout(warm,0);
 }
 /** After a screen is shown, the screens it links to are made once in the background; reads they lack come in one request. */
 let warmed='';
 function warm(){
  if(!browserApp||localOff||serverBusy)return;const actions=[...new Set([...root.querySelectorAll('[data-action]')].map(el=>el.getAttribute('data-action')).filter(a=>/^(nav|tab|screen|view):[\w-]{1,60}$/.test(a||'')))].slice(0,8);
  const key=JSON.stringify([actions,uiState]);if(key===warmed)return;warmed=key;const from=uiState,seq=eventSeq,missing=[],seen=new Set();let i=0;
  const step=()=>{if(seq!==eventSeq||!browserApp||i>=actions.length){if(missing.length&&seq===eventSeq)requestReads(missing,{prefetch:true});return;}
   try{const r=browserApp.run.run(from,{kind:'click',action:actions[i++],value:null,form:{}});const reads=r.kind==='reads'?r.reads:r.kind==='painted'?r.misses:[];for(const x of reads){const k=Engine.readKey(x.name,x.input);if(!seen.has(k)&&missing.length<12){seen.add(k);missing.push(x);}}if(r.kind==='painted'&&r.rollback)store.restore(r.rollback);}catch{}
   (window.requestIdleCallback||setTimeout)(step);};
  (window.requestIdleCallback||setTimeout)(step);
 }
 function requestReads(reads,context){const id=++readSeq;pendingReads.set(id,{...context,seq:eventSeq});post('trialy.reads',{id,reads:reads.slice(0,12)});}
 function paintLocal(output,event,t0){
  controls=[];connected=false;uiState=output.state;paint(output.html,runtimeCss(output.html)+output.css);
  post('trialy.local',{ms:t0?performance.now()-t0:null,event:{kind:event.kind,action:event.action},state:uiState,html:output.html,css:runtimeCss(output.html)+output.css,...(output.notice?{notice:output.notice}:{}),...('context' in output?{context:output.context}:{})});post('trialy.rendered');
 }
 /** Returns true when the event was handled here (painted, or waiting for its reads). */
 function runLocal(event,from,round=0){
  if(!browserApp||localOff||model)return false;
  const t0=performance.now();let r;try{r=browserApp.run.run(from,event);}catch{return false;}
  if(r.kind==='painted'){
   const before={html:root.innerHTML,css:sheet.textContent,state:from};paintLocal(r.output,event,t0);
   if(r.saves.length){optimistic={rollback:r.rollback,before};serverBusy=true;post('trialy.event',{event,state:from,optimistic:true});}
   else if(r.misses.length)requestReads(r.misses,{event,from,v2:true});
   else setTimeout(warm,0);
   return true;
  }
  if(r.kind==='reads'&&round<3){requestReads(r.reads,{event,from,round});return true;}
  return false;
 }
 function receiveReads(v){
  const context=pendingReads.get(v.id);if(!context)return;pendingReads.delete(v.id);
  if(!v.failed&&Array.isArray(v.results))store.seed(v.results);
  if(context.prefetch||context.seq!==eventSeq)return;
  if(v.failed){serverBusy=true;post('trialy.event',{event:context.event,state:context.from});return;}
  if(!runLocal(context.event,context.from,(context.round||0)+1)){serverBusy=true;post('trialy.event',{event:context.event,state:context.from});}
 }
 function serverIdle(v){
  serverBusy=false;
  // A v2 save that did not go through: the earlier values and screen come back; the platform shows why.
  if(optimistic&&v.failed){store.restore(optimistic.rollback);root.innerHTML='';uiState=optimistic.before.state;paint(optimistic.before.html,optimistic.before.css);}
  optimistic=null;const waiting=localHeld;localHeld=[];for(const e of waiting)dispatch(e);
 }
 function reportViewport(){const w=document.documentElement.clientWidth,next=w<480?'phone':w<800?'panel':'wide',c=matchMedia('(pointer: coarse)').matches;if(next===viewportClass&&c===coarse)return;viewportClass=next;coarse=c;if(browserApp?.version==='v2')localInput.viewport={width:next,coarse:c};host.postMessage({kind:'trialy.viewport',width:next,coarse:c},'*');}
 function dispatch(event){
  // P5 (4.5): while a cell edit saves, other actions wait for the saved screen and then run; nothing is dropped.
  if(savingCell&&Object.keys(inflight).length&&event.action!=='bound-batch'){if(held.length<20)held.push(event);return;}
  if((Object.keys(pending).length||uiState?.newRow)&&['tracker:add','tracker:layout','settings'].includes(event.action)){post('trialy.notice',{message:'Save or cancel your current changes first.'});return;}
  if(local(event))return;
  if(Object.keys(pending).length&&!['bound-batch'].includes(event.action)){post('trialy.notice',{message:'Save or ignore your current edits before this action.'});return;}
  if(uiState?.newRow&&event.action!=='tracker:create'){post('trialy.notice',{message:'Save or cancel the new row before this action.'});return;}
  eventSeq++;
  // 5.1: a browser-capable app makes the screen here; while the server works on an earlier action, v1 apps wait for it.
  if(!model&&browserApp&&!localOff){if(serverBusy&&(browserApp.version!=='v2'||optimistic)){if(localHeld.length<20)localHeld.push(event);return;}if(runLocal(event,uiState))return;}
  if(!model&&browserApp)serverBusy=true;
  post('trialy.event',{event,state:uiState});
 }
 function footerAction(action){
  if(action==='save-edits')dispatch({kind:'submit',action:'bound-batch',value:null,form:{...pending}});
  else if(action==='discard-edits'){pending=Object.create(null);typed.clear();if(!local({kind:'change',action:'discard-edits'})){for(const el of root.querySelectorAll('[data-action]')){const k=el.getAttribute('data-action');if(k in original){if(el.type==='checkbox')el.checked=original[k];else el.value=original[k];el.style.background='';}}footer();}}
  else if(action==='save-layout'||action==='discard-layout')dispatch({kind:'click',action,value:null,form:{}});
 }
 window.addEventListener('message',event=>{
  if(event.source!==host||typeof event.data?.channel!=='string')return;
  const v=event.data;if(channel!==null&&v.channel!==channel)return;
  if(v.kind==='trialy.cache'){if(model&&v.tracker){model=v.tracker;}return;}
  if(v.kind==='trialy.save-start'){savingCell=true;if(!v.cells)root.inert=true;return;}
  // A cell save failed: its earlier value comes back with the next render and the cell is marked; edits made meanwhile are kept.
  if(v.kind==='trialy.save-failed'){
   // The frame redraws its current screen without the unsaved values (as Discard edits does) and marks the cells that did not save.
   const lost=Object.keys(inflight);for(const k of lost){if(pending[k]===inflight[k])delete pending[k];}inflight=Object.create(null);savingCell=false;root.inert=false;
   const message=String(v.message||'Not saved').slice(0,200),prefix=k=>k.split(':').slice(0,3).join(':'),marks=lost.map(prefix);
   if(!local({kind:'change',action:'discard-edits'})){for(const el of root.querySelectorAll('[data-action]')){const k=el.getAttribute('data-action');if(lost.includes(k)&&k in original){if(el.type==='checkbox')el.checked=original[k];else el.value=original[k];el.style.background='';}}footer();}
   for(const el of root.querySelectorAll('[data-action]')){const k=el.getAttribute('data-action');if(k&&marks.includes(prefix(k))){const holder=el.closest('td,.cell,label')||el;holder.style.background='#fdecea';holder.title=message;}}
   const waiting=held;held=[];for(const e of waiting)dispatch(e);
   return;}
  if(v.kind==='trialy.reads-result'){receiveReads(v);return;}
  if(v.kind==='trialy.server-idle'){serverIdle(v);return;}
  if(v.kind==='trialy.save-idle'){savingCell=false;root.inert=!!v.blocked;return;}
  if(v.kind==='trialy.action'){footerAction(v.action);return;}
  if(v.kind!=='trialy.render'||typeof v.html!=='string'||v.html.length>200000||typeof v.css!=='string'||v.css.length>50000)return;
  navigationOnly=!!v.navigationOnly;appLinks=!!v.appLinks;appOrigin=v.appOrigin||'';linkContext=v.linkContext||null;channel=v.channel;model=v.tracker||null;uiState=v.state;controls=Array.isArray(v.controls)?v.controls:[];connected=v.connected;
  if(v.fresh)typed.clear();
  const carried=Object.entries(pending).filter(([k,val])=>!(k in inflight)||inflight[k]!==val),marks=failed,markMessage=failedMessage;
  inflight=Object.create(null);failed=[];failedMessage='';
  savingCell=false;root.inert=false;pending=Object.create(null);original=Object.create(null);paint(v.html,v.css);
  const prefix=k=>k.split(':').slice(0,3).join(':'),cells=k=>[...root.querySelectorAll('[data-action]')].filter(el=>el.getAttribute('data-action')===k);
  for(const k of Object.keys(original))if(marks.includes(prefix(k)))for(const el of cells(k)){const holder=el.closest('td,.cell,label')||el;holder.style.background='#fdecea';holder.title=markMessage;}
  // P5 (4.5): edits made while the previous save ran are kept (their record may have a new version) and saved next.
  if(carried.length&&model?.saved){for(const [k,val] of carried){const now=Object.keys(original).find(x=>prefix(x)===prefix(k));if(!now)continue;pending[now]=val;for(const el of cells(now)){if(el.type==='checkbox')el.checked=val;else el.value=val;el.style.background='#e5f6e9';}}if(Object.keys(pending).length){footer();setTimeout(commitCell,0);}}
  if(!model)document.body.classList.toggle('trialy-fill',!!v.fill);
  if(!model&&v.browser&&v.browser.mode&&v.browser.mode!=='server'&&Engine)applyBrowser(v.browser,v);
  if(!model){serverBusy=false;optimistic=null;}
  post('trialy.rendered');
  const waiting=held;held=[];for(const e of waiting)dispatch(e);
  const later=localHeld;localHeld=[];for(const e of later)dispatch(e);
 });
 function send(kind,target){
  const trigger=target.closest('[data-action]');if(!trigger||!channel)return;const action=trigger.getAttribute('data-action');if(!action||action.length>200)return;
  if(!model)trigger.setAttribute('data-trialy-pressed','');
  if(action==='save-layout'&&model?.saved){post('trialy.approve',{action:'save-layout'});footerAction(action);return;}
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
  if(target.closest('.tracker-options-toggle')){e.preventDefault();setOptionsOpen(!optionsOpen);return;}
  const display=target.closest('.cell-display');if(display){e.preventDefault();activateCell(display);return;}const anchor=target.closest('a');if(anchor){if(appLinks&&anchor.dataset.appHref){if(anchor.dataset.external==='true')return;e.preventDefault();if(Object.keys(pending).length||uiState?.newRow){post('trialy.notice',{message:'Save or ignore your current edits before following this link.'});return;}post('trialy.link',{href:anchor.dataset.appHref});return;}e.preventDefault();}const integration=target.closest('[data-trialy-integration]');if(integration&&!integration.disabled){e.preventDefault();const [action,role]=String(integration.dataset.trialyIntegration).split(' ');if(['install','connect'].includes(action)&&role)post('trialy.integration',{action,role});return;}const opener=target.closest('[data-trialy-open]');if(opener&&!opener.disabled){e.preventDefault();const [role,recordId]=String(opener.dataset.trialyOpen).split(' ');if(role)post('trialy.open',{role,recordId:recordId||null});return;}const upload=target.closest('[data-trialy-document]');if(upload&&!upload.disabled){e.preventDefault();const [action,context]=String(upload.dataset.trialyDocument).split(' ');if(action==='upload')post('trialy.document',{action,context:String(context||'').slice(0,200)});return;}const b=target.closest('button,input[type=submit]');if(b?.disabled)return;
  if(b&&b.type==='submit'&&b.form){e.preventDefault();send('submit',b);return;}
  if(target.closest('[data-action]')&&!target.matches('input,textarea,select,option')){e.preventDefault();send('click',target);}
 });
 root.addEventListener('input',e=>{if(e.target instanceof Element)rememberTyped(e.target);if(appLinks&&!model)post('trialy.dirty',{dirty:true});if(e.target instanceof Element&&(e.target.matches('input[data-ui-state],textarea[data-ui-state]')||e.target.getAttribute('data-action')?.startsWith('bound:')))send('change',e.target);});
 root.addEventListener('change',e=>{if(e.target instanceof Element&&!e.target.matches('input[data-ui-state],textarea[data-ui-state]'))send('change',e.target);});
 root.addEventListener('focusout',e=>{const editor=e.target.closest('.example-input');if(editor)queueMicrotask(()=>{if(!editor.contains(document.activeElement)){editor.hidden=true;editor.previousElementSibling.hidden=false;}});});
 root.addEventListener('submit',e=>{e.preventDefault();if(e.target instanceof Element)send('submit',e.target);});
 root.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&optionsOpen){e.preventDefault();setOptionsOpen(false,true);return;}
  const editor=e.target.closest('.cell-input,.example-input');
  if(editor&&e.key==='Enter'&&e.target.matches('input,select')){e.preventDefault();e.target.blur();return;}
  if(editor&&e.key==='Escape'){e.preventDefault();if(editor._before){pending=Object.assign(Object.create(null),editor._before.pending);uiState.examples=editor._before.examples;}const key=e.target.getAttribute('data-action');if(key&&key in original){const value=key in pending?pending[key]:original[key];if(e.target.type==='checkbox')e.target.checked=value;else e.target.value=value;}e.target.blur();local({kind:'change',action:'discard-edits'});return;}
  const resize=e.target.closest('[data-resize-column],[data-resize-row]');
  if(resize&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const column=resize.hasAttribute('data-resize-column'),delta=['ArrowLeft','ArrowUp'].includes(e.key)?-10:10;dispatch({kind:'change',action:(column?'resize-column:':'resize-row:')+(column?resize.dataset.resizeColumn:resize.dataset.resizeRow),value:Number(resize.getAttribute('aria-valuenow'))+delta});const next=Array.from(root.querySelectorAll(column?'[data-resize-column]':'[data-resize-row]')).find(x=>(column?x.dataset.resizeColumn:x.dataset.resizeRow)===(column?resize.dataset.resizeColumn:resize.dataset.resizeRow));next?.focus({preventScroll:true});return;}
  const handle=e.target.closest('[data-reorder]');
  if(handle&&e.altKey&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();dispatch({kind:'click',action:'move-'+handle.dataset.reorder+':'+(e.key==='ArrowUp'?-1:1)});}
  if(e.key==='Escape'&&uiState?.detail){e.preventDefault();dispatch({kind:'click',action:'close-details'});}
  if(e.key==='Tab'&&uiState?.detail){const els=Array.from(root.querySelectorAll('.drawer button,.drawer input,.drawer select,.drawer textarea,.drawer [tabindex]')).filter(x=>!x.disabled);if(e.shiftKey&&e.target===els[0]){e.preventDefault();els.at(-1)?.focus();}else if(!e.shiftKey&&e.target===els.at(-1)){e.preventDefault();els[0]?.focus();}}
  if(e.target.matches('.drawer-resizer')&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();document.documentElement.style.setProperty('--drawer-width',Math.max(365,Math.min(innerWidth,root.querySelector('.drawer').offsetWidth+(e.key==='ArrowLeft'?20:-20)))+'px');}
 });
 let dragged=null;
 root.addEventListener('dragstart',e=>{const card=!model&&e.target.closest?.('[data-drag]');if(card){dragged='card:'+card.getAttribute('data-drag');e.dataTransfer.setData('text/plain',dragged);return;}const h=e.target.closest('[data-reorder]');if(h&&model?.saved){dragged=h.dataset.reorder;e.dataTransfer.setData('text/plain',dragged);}else e.preventDefault();});
 root.addEventListener('dragover',e=>{const zone=dragged?.startsWith('card:')&&e.target.closest('[data-drop]');if(zone){e.preventDefault();for(const z of root.querySelectorAll('[data-trialy-over]'))if(z!==zone)z.removeAttribute('data-trialy-over');zone.setAttribute('data-trialy-over','');return;}const row=e.target.closest('.layout-entry');if(dragged&&row){e.preventDefault();row.classList.add('drag-over');}});
 root.addEventListener('dragleave',e=>e.target.closest('.layout-entry')?.classList.remove('drag-over'));
 root.addEventListener('drop',e=>{e.preventDefault();const zone=dragged?.startsWith('card:')&&e.target.closest('[data-drop]');if(zone){const action=zone.getAttribute('data-drop-action'),value=dragged.slice(5)+'>'+zone.getAttribute('data-drop');dragged=null;zone.removeAttribute('data-trialy-over');if(action&&action.length<=200&&value.length<=200)dispatch({kind:'change',action,value,form:{}});return;}const target=e.target.closest('.layout-entry')?.querySelector('[data-reorder]')?.dataset.reorder;if(dragged&&target){const from=dragged.split(':'),to=target.split(':');if(from[0]===to[0]&&(from[0]==='tab'||from[1]===to[1]))dispatch({kind:'click',action:'reorder-'+dragged+':'+to.at(-1)});}dragged=null;});
 root.addEventListener('pointerdown',e=>{const handle=e.target.closest('[data-resize-column],[data-resize-row]');if(!handle||!model)return;e.preventDefault();const column=handle.hasAttribute('data-resize-column'),key=column?handle.dataset.resizeColumn:handle.dataset.resizeRow,start=column?e.clientX:e.clientY,initial=Number(handle.getAttribute('aria-valuenow'));let value=initial;
  const table=handle.closest('table'),row=handle.closest('tr'),col=column?table.querySelectorAll('col')[handle.closest('th').cellIndex]:null,total=table.offsetWidth;
  handle.setPointerCapture(e.pointerId);
  const move=ev=>{value=Math.max(column?85:38,Math.min(column?650:180,initial+(column?ev.clientX:ev.clientY)-start));if(column){col.style.width=value+'px';table.style.width=table.style.minWidth=(total+value-initial)+'px';}else{row.style.height=value+'px';for(const cell of row.querySelectorAll('.cell-content'))cell.style.maxHeight=Math.max(22,value-16)+'px';}};
  const finish=ev=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',finish);dispatch({kind:'change',action:(column?'resize-column:':'resize-row:')+key,value:ev.type==='pointercancel'?initial:value});};
  handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
 });
 root.addEventListener('pointerdown',e=>{if(!e.target.matches('.drawer-resizer'))return;e.preventDefault();const move=ev=>document.documentElement.style.setProperty('--drawer-width',Math.max(365,Math.min(innerWidth,innerWidth-ev.clientX))+'px');const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);});
 document.addEventListener('pointerdown',e=>{if(optionsOpen&&!e.target.closest('.tracker-toolbar'))setOptionsOpen(false);});
 new ResizeObserver(()=>{if(!model&&!document.body.classList.contains('trialy-fill'))post('trialy.resize',{height:Math.ceil(root.getBoundingClientRect().height)+32});}).observe(document.body);
 new ResizeObserver(reportViewport).observe(document.documentElement);
 host.postMessage({kind:'trialy.ready'},'*');reportViewport();
})();`;
/** The frame policy: two trusted scripts by hash, WebAssembly for the engine (5.1), no eval, no network, no forms. */
export function framePolicy(){
 return `default-src 'none'; script-src 'sha256-${sha256Base64(FRAME_ENGINE_SCRIPT)}' 'sha256-${sha256Base64(FRAME_SCRIPT)}' 'wasm-unsafe-eval'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
}
export async function frontendFrameDocument(fontCss=''){
 // 5.1: the engine binary travels as a data block (never executed as script); the engine script reads it once at start.
 return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${framePolicy()}"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>${fontCss}@layer trialagents-defaults{body{font:15px Inter,Arial,sans-serif;margin:0;color:#183d32}*{box-sizing:border-box}}input,button,select,textarea{font:inherit}.cell-input[hidden],.cell-display[hidden]{display:none!important}.multi-value-editor{display:grid;gap:5px;min-width:150px}.multi-value-row{display:flex;gap:4px;align-items:center}.multi-value-row input,.multi-value-row select{width:100%;min-width:0}.multi-value-editor>button{justify-self:start;width:auto}.multi-value-editor button{font-size:12px;padding:3px 6px;color:#253c40;background:#f8faf9;border:1px solid #dce5e1;border-radius:6px;text-align:left}[data-trialy-pressed]{opacity:.72;transition:opacity .08s}body.trialy-fill{height:100vh;overflow:hidden}body.trialy-fill #surface{height:100%;overflow:auto;padding-bottom:env(safe-area-inset-bottom)}</style><style id="appearance"></style></head><body><div id="surface"></div><script type="application/x-trialy-engine" id="trialy-engine-binary">${frameEngineWasmBase64()}</script><script>${FRAME_ENGINE_SCRIPT}</script><script>${FRAME_SCRIPT}</script></body></html>`;
}
