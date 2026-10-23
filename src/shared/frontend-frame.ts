import {trackerRenderer} from '../workspace/standard-tracker.js';
// Only the shipped renderer and this trusted bridge run in the frame. Custom code stays in QuickJS.
export const FRAME_SCRIPT=String.raw`(()=>{'use strict';
 const renderTracker=function(config,theme,input,tools){${trackerRenderer}};
 const host=window.parent,root=document.getElementById('surface'),sheet=document.getElementById('appearance');
 let channel=null,model=null,uiState=null,controls=[],connected=false,detailScroll=0;
 let pending=Object.create(null),original=Object.create(null);
 const post=(kind,value={})=>{if(channel)host.postMessage({kind,channel,...value},'*');};
 const tone=v=>/fail|blocked|overdue|high|reject/i.test(String(v))?'red':/done|complete|active|approved|yes|ready/i.test(String(v))?'green':/pending|progress|medium|review|contact/i.test(String(v))?'amber':'blue';
 function footer(){
  const n=Object.keys(pending).length;
  const layoutDirty=uiState?.settings&&model?.saved&&JSON.stringify(uiState.layoutDraft)!==JSON.stringify({name:model.config.name,description:model.config.description,tabs:model.config.tabs.map(t=>({typeId:t.typeId,name:t.name,visible:t.visible!==false,columns:t.columns.map(c=>({field:c.field,label:c.label,visible:c.visible}))}))});
  post('trialy.footer',{footer:n?{kind:'edits',count:n}:layoutDirty?{kind:'layout'}:null});post('trialy.state',{state:uiState});
 }
 const tags=new Set('div span p h1 h2 h3 h4 h5 h6 section article header footer main nav aside ul ol li dl dt dd table thead tbody tfoot tr th td caption colgroup col form label input textarea select option optgroup button fieldset legend output progress meter details summary br hr pre code blockquote strong em b i u s small sub sup a img svg g path rect circle ellipse line polyline polygon text tspan defs lineargradient radialgradient stop clippath title desc'.split(' '));
 const attrs=new Set('class id style title role tabindex name value placeholder disabled readonly required checked selected multiple min max step minlength maxlength rows cols colspan rowspan scope for width height alt viewbox d x y x1 y1 x2 y2 cx cy r rx ry points fill stroke stroke-width opacity transform xmlns offset stop-color stop-opacity preserveaspectratio data-action data-trialy-slot data-ui-state data-reorder draggable inert'.split(' '));
 const inputTypes=new Set('text number date datetime-local month week time email tel url checkbox radio range color hidden button submit reset'.split(' '));
 function clean(html){const template=document.createElement('template');template.innerHTML=html;
  function walk(parent){for(const node of Array.from(parent.childNodes)){
   if(node.nodeType===3)continue;if(node.nodeType!==1){node.remove();continue;}
   const tag=node.localName.toLowerCase();if(!tags.has(tag)){node.remove();continue;}
   for(const attr of Array.from(node.attributes)){const name=attr.name.toLowerCase();
    if(name==='type'&&tag==='input'){if(!inputTypes.has(attr.value.toLowerCase()))node.setAttribute('type','text');continue;}
    if(name==='type'&&tag==='button'){node.setAttribute('type',['button','submit','reset'].includes(attr.value)?attr.value:'button');continue;}
    if(name==='src'&&tag==='img'&&/^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(attr.value))continue;
    if(!attrs.has(name)&&!/^aria-[a-z-]+$/.test(name))node.removeAttribute(attr.name);
   }
   walk(node);
  }}walk(template.content);return template.content;
 }

 function paint(html,css){
  const focused=document.activeElement,focusAction=focused?.getAttribute('data-action'),focusGrip=focused?.hasAttribute('data-reorder')?focused.getAttribute('aria-label'):null,selection=focused?.selectionStart;
  root.replaceChildren(clean(html));sheet.textContent=css;
  if(connected){
   for(const el of root.querySelectorAll('input,select,textarea'))if(!el.hasAttribute('data-ui-state')){el.disabled=true;el.title='Use a connected data control';}
   for(const c of controls){
    if(!/^[a-z][a-z0-9_]{0,63}$/.test(c.slot))continue;
    for(const slot of root.querySelectorAll('[data-trialy-slot="'+c.slot+'"]')){
     if(c.editable&&c.multiple){
      const stored=c.action in pending?JSON.parse(pending[c.action]):c.value;
      const values=Array.isArray(stored)?stored:stored==null||stored===''?[]:[stored];
      original[c.action]=JSON.stringify(Array.isArray(c.value)?c.value:c.value==null||c.value===''?[]:[c.value]);
      const group=document.createElement('span');group.className='multi-value-editor';
      const render=()=>{group.replaceChildren();const rows=values.length?values:[''];
       rows.forEach((value,i)=>{const row=document.createElement('span');row.className='multi-value-row';const input=document.createElement(c.kind==='select'?'select':'input');
        if(c.kind==='select'){const blank=document.createElement('option');blank.value='';blank.textContent='Choose…';input.append(blank);for(const v of c.options){const o=document.createElement('option');o.value=v;o.textContent=v;input.append(o);}}else{input.type=['number','money'].includes(c.kind)?'number':'text';input.step='any';}
        input.value=String(value);input.setAttribute('aria-label',i?c.label+' '+(i+1):c.label);input.style.background=c.action in pending?'#e5f6e9':'';
        const stage=()=>{const raw=input.value;values[i]=raw===''?'':['number','money'].includes(c.kind)?Number(raw):raw;const wire=JSON.stringify(values.filter(v=>v!==''));if(wire===original[c.action])delete pending[c.action];else pending[c.action]=wire;input.style.background=c.action in pending?'#e5f6e9':'';footer();};
        input.addEventListener(c.kind==='select'?'change':'input',stage);row.append(input);
        if(rows.length>1){const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Remove '+c.label+' '+(i+1));remove.onclick=()=>{values.splice(i,1);const wire=JSON.stringify(values.filter(v=>v!==''));if(wire===original[c.action])delete pending[c.action];else pending[c.action]=wire;render();footer();};row.append(remove);}group.append(row);
       });
       const add=document.createElement('button');add.type='button';add.textContent='+ Add value';add.setAttribute('aria-label','Add '+c.label+' value');add.disabled=values.length>=100;add.onclick=()=>{if(!values.length)values.push('');values.push('');render();group.querySelectorAll('input,select')[values.length-1]?.focus();};group.append(add);
      };render();slot.replaceChildren(group);continue;
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
     if(['select','boolean','multi_select'].includes(c.kind)){el.className='pill '+tone(c.action in pending?pending[c.action]:c.value);if(!c.editable&&c.kind==='boolean')el.textContent=c.value===true?'Yes':c.value===false?'No':'—';}
     slot.replaceChildren(el);
    }
   }
  }
  if(focusAction){const el=Array.from(root.querySelectorAll('[data-action]')).find(x=>x.getAttribute('data-action')===focusAction);el?.focus({preventScroll:true});if(typeof selection==='number'&&el?.setSelectionRange)try{el.setSelectionRange(selection,selection);}catch{}}
  if(focusGrip)Array.from(root.querySelectorAll('[data-reorder]')).find(x=>x.getAttribute('aria-label')===focusGrip)?.focus({preventScroll:true});
  footer();
 }
 function local(event){
  if(!model||!/^((tab|details|tab-name|tab-visible|column-label|visibility|move-tab|move-column|reorder-tab|reorder-column):|query$|sort$|next$|previous$|settings$|discard-layout$|column-tab$|layout-name$|layout-description$|close-details$)/.test(event.action||''))return false;
  const old=uiState,next=structuredClone(uiState);
  try{
   const output=renderTracker(model.config,model.theme,{state:next,event,saved:model.saved,writable:model.writable},{call:(name,value)=>{
    if(name!=='records.read')throw Error('Server action');
    const p=model.pages.find(p=>p.request.typeId===value.typeId&&p.request.limit===value.limit&&p.request.offset===value.offset);if(!p)throw Error('Page needed');return p.result;
   }});
   uiState=output.state;paint(output.html,output.css);
   if(!old?.detail&&uiState.detail){detailScroll=scrollY;scrollTo(0,0);root.querySelector('[aria-label="Close details"]')?.focus({preventScroll:true});}
   else if(old?.detail&&!uiState.detail){scrollTo(0,detailScroll);root.querySelector('[data-action="details:'+old.detail+'"]')?.focus({preventScroll:true});}
   else if(event.action==='settings'||event.action==='discard-layout')scrollTo(0,0);
   return true;
  }catch{return false;}
 }
 function dispatch(event){
  if(local(event))return;
  if(Object.keys(pending).length&&!['bound-batch'].includes(event.action))return;
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
  if(v.kind==='trialy.action'){footerAction(v.action);return;}
  if(v.kind!=='trialy.render'||typeof v.html!=='string'||v.html.length>200000||typeof v.css!=='string'||v.css.length>50000)return;
  channel=v.channel;model=v.tracker||null;uiState=v.state;controls=Array.isArray(v.controls)?v.controls:[];connected=v.connected;
  pending=Object.create(null);original=Object.create(null);paint(v.html,v.css);post('trialy.rendered');
 });
 function send(kind,target){
  const trigger=target.closest('[data-action]');if(!trigger||!channel)return;const action=trigger.getAttribute('data-action');if(!action||action.length>200)return;
  if(action.startsWith('bound:')){
   if(!(action in original))return;
   const value=target.type==='checkbox'?target.checked:target.value;
   if(value===original[action])delete pending[action];else pending[action]=value;
   for(const el of root.querySelectorAll('[data-action]'))if(el.getAttribute('data-action')===action){if(el.type==='checkbox')el.checked=value;else el.value=value;el.style.background=action in pending?'#e5f6e9':'';if(el.tagName==='SELECT')el.className='pill '+tone(value);}
   footer();return;
  }
  const form=trigger.closest('form'),values=Object.create(null);if(form){let n=0;for(const [key,value] of new FormData(form)){if(++n>100||key.length>100||typeof value!=='string'||value.length>50000)return;values[key]=value;}}
  dispatch({kind,action,value:target.type==='checkbox'?target.checked:typeof target.value==='string'?target.value:null,form:values});
 }
 root.addEventListener('click',e=>{const target=e.target;if(!(target instanceof Element))return;
  if(target.closest('a'))e.preventDefault();const b=target.closest('button,input[type=submit]');if(b?.disabled)return;
  if(b&&b.type==='submit'&&b.form){e.preventDefault();send('submit',b);return;}
  if(target.closest('[data-action]')&&!target.matches('input,textarea,select,option')){e.preventDefault();send('click',target);}
 });
 root.addEventListener('input',e=>{if(e.target instanceof Element&&(e.target.matches('input[data-ui-state],textarea[data-ui-state]')||e.target.getAttribute('data-action')?.startsWith('bound:')))send('change',e.target);});
 root.addEventListener('change',e=>{if(e.target instanceof Element&&!e.target.matches('input[data-ui-state],textarea[data-ui-state]'))send('change',e.target);});
 root.addEventListener('submit',e=>{e.preventDefault();if(e.target instanceof Element)send('submit',e.target);});
 root.addEventListener('keydown',e=>{
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
 root.addEventListener('pointerdown',e=>{if(!e.target.matches('.drawer-resizer'))return;e.preventDefault();const move=ev=>document.documentElement.style.setProperty('--drawer-width',Math.max(365,Math.min(innerWidth,innerWidth-ev.clientX))+'px');const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);});
 new ResizeObserver(()=>{if(!model)post('trialy.resize',{height:Math.ceil(root.getBoundingClientRect().height)+32});}).observe(document.body);
 host.postMessage({kind:'trialy.ready'},'*');
})();`;
export async function frontendFrameDocument(){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(FRAME_SCRIPT));
 const hash=btoa(String.fromCharCode(...new Uint8Array(bytes)));
 return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:15px system-ui;margin:0;color:#183d32}*{box-sizing:border-box}table{border-collapse:collapse}th,td{padding:8px;border:1px solid #ddd}input,button,select,textarea{font:inherit}.multi-value-editor{display:grid;gap:5px;min-width:150px}.multi-value-row{display:flex;gap:4px;align-items:center}.multi-value-row input,.multi-value-row select{width:100%;min-width:0}.multi-value-editor>button{justify-self:start;width:auto}.multi-value-editor button{font-size:12px;padding:3px 6px;color:#128269;background:#eaf7ed;border:1px solid #cde4d9;border-radius:6px;text-align:left}</style><style id="appearance"></style></head><body><div id="surface"></div><script>${FRAME_SCRIPT}</script></body></html>`;
}
