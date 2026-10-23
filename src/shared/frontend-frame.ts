// Only this trusted script runs in the frame. Generated JavaScript runs in QuickJS.
export const FRAME_SCRIPT=String.raw`(()=>{'use strict';
 const host=window.parent,root=document.getElementById('surface'),sheet=document.getElementById('appearance');let channel=null;let pending=Object.create(null),original=Object.create(null);
 const editbar=document.createElement('div');editbar.setAttribute('aria-live','polite');root.before(editbar);
 function editStatus(){editbar.replaceChildren();const n=Object.keys(pending).length;if(!n)return;editbar.style.cssText="padding:12px 16px;background:#e5f6e9;border:1px solid #c0e8ca;display:flex;gap:12px;align-items:center";const label=document.createElement("span");label.textContent=n+" unsaved field edit"+(n===1?"":"s");editbar.append(label);for(const [name,action] of [["Save edits","save"],["Ignore edits","discard"]]){const b=document.createElement("button");b.textContent=name;b.onclick=()=>{if(action==="save"){host.postMessage({kind:"trialy.event",channel,event:{kind:"submit",action:"bound-batch",value:null,form:pending}},"*");}else{for(const el of root.querySelectorAll("[data-action]")){const k=el.getAttribute("data-action");if(k in original){if(el.type==="checkbox")el.checked=original[k];else el.value=original[k];el.style.background="";}}pending=Object.create(null);editStatus();}};editbar.append(b);}}
 const tags=new Set('div span p h1 h2 h3 h4 h5 h6 section article header footer main nav aside ul ol li dl dt dd table thead tbody tfoot tr th td caption colgroup col form label input textarea select option optgroup button fieldset legend output progress meter details summary br hr pre code blockquote strong em b i u s small sub sup a img svg g path rect circle ellipse line polyline polygon text tspan defs lineargradient radialgradient stop clippath title desc'.split(' '));
 const attrs=new Set('class id style title role tabindex name value placeholder disabled readonly required checked selected multiple min max step minlength maxlength rows cols colspan rowspan scope for width height alt viewbox d x y x1 y1 x2 y2 cx cy r rx ry points fill stroke stroke-width opacity transform xmlns offset stop-color stop-opacity preserveaspectratio data-action data-trialy-slot data-ui-state'.split(' '));
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
 window.addEventListener('message',event=>{if(event.source!==host||event.data?.kind!=='trialy.render'||typeof event.data.channel!=='string')return;
  const v=event.data;if(typeof v.html!=='string'||v.html.length>200000||typeof v.css!=='string'||v.css.length>50000)return;
  if(channel!==null&&v.channel!==channel)return;channel=v.channel;pending=Object.create(null);original=Object.create(null);editStatus();root.replaceChildren(clean(v.html));sheet.textContent=v.css;
  if(v.connected){
   for(const element of root.querySelectorAll('input,select,textarea')){if(!element.hasAttribute('data-ui-state')){element.disabled=true;element.title='Use a connected data control';}}
   for(const control of Array.isArray(v.controls)?v.controls:[]){
    if(!/^[a-z][a-z0-9_]{0,63}$/.test(control.slot))continue;
    for(const slot of root.querySelectorAll('[data-trialy-slot="'+control.slot+'"]')){
     let element=document.createElement(control.editable?(control.kind==='select'?'select':'input'):'span');
     if(control.editable){
      if(control.kind==='select'){const blank=document.createElement('option');blank.value='';blank.textContent='Choose…';element.append(blank);for(const option of control.options){const o=document.createElement('option');o.value=option;o.textContent=option;element.append(o);}}
      else element.type=control.kind==='boolean'?'checkbox':['number','money'].includes(control.kind)?'number':control.kind==='date'?'date':'text';
      if(control.kind==='boolean')element.checked=control.value===true;else element.value=control.value===null?'':String(control.value);
      element.setAttribute('data-action',control.action);original[control.action]=control.kind==='boolean'?element.checked:element.value;element.setAttribute('aria-label',control.label);
     }else element.textContent=control.value===null?'—':Array.isArray(control.value)?control.value.join(', '):String(control.value);
     slot.replaceChildren(element);
    }
   }
  }
 });
 function send(kind,target){const trigger=target.closest('[data-action]');if(!trigger||!channel)return;const action=trigger.getAttribute('data-action');if(!action||action.length>200)return;
  if(action.startsWith('bound:')){const value=target.type==='checkbox'?target.checked:target.value;if(value===original[action])delete pending[action];else pending[action]=value;target.style.background=action in pending?'#e5f6e9':'';editStatus();return;}
  if(Object.keys(pending).length){editbar.scrollIntoView({block:'nearest'});return;}
  const form=trigger.closest('form'),values=Object.create(null);if(form){let n=0;for(const [key,value] of new FormData(form)){if(++n>100||key.length>100||typeof value!=='string'||value.length>50000)return;values[key]=value;}}
  const value=target.type==='checkbox'?target.checked:typeof target.value==='string'?target.value:null;
  host.postMessage({kind:'trialy.event',channel,event:{kind,action,value,form:values}},'*');
 }
 root.addEventListener('click',e=>{const target=e.target;if(!(target instanceof Element))return;
  if(target.closest('a'))e.preventDefault();const button=target.closest('button,input[type=submit]');if(button&&button.type==='submit'&&button.form){e.preventDefault();send('submit',button);return;}
  if(target.closest('[data-action]')&&!target.matches('input,textarea,select,option')){e.preventDefault();send('click',target);}
 });
 root.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target instanceof HTMLInputElement&&e.target.form&&!['checkbox','radio','range','button','reset'].includes(e.target.type)){e.preventDefault();send('submit',e.target.form);}});
 root.addEventListener('change',e=>{if(e.target instanceof Element)send('change',e.target);});
 root.addEventListener('submit',e=>{e.preventDefault();if(e.target instanceof Element)send('submit',e.target);});
 new ResizeObserver(()=>{if(channel)host.postMessage({kind:'trialy.resize',channel,height:Math.ceil(root.getBoundingClientRect().height+editbar.getBoundingClientRect().height)+32},'*');}).observe(document.body);
 host.postMessage({kind:'trialy.ready'},'*');
})();`;
export async function frontendFrameDocument(){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(FRAME_SCRIPT));
 const hash=btoa(String.fromCharCode(...new Uint8Array(bytes)));
 return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:15px system-ui;margin:16px;color:#183d32}*{box-sizing:border-box}table{border-collapse:collapse}th,td{padding:8px;border:1px solid #ddd}input,button,select,textarea{font:inherit}</style><style id="appearance"></style></head><body><div id="surface"></div><script>${FRAME_SCRIPT}</script></body></html>`;
}
