/* Standalone reference harness only. The catalog source never contains this browser adapter. */
(()=>{
 'use strict';
 const root=document.getElementById('surface');
 document.documentElement.classList.add('trialy-responsive-toolbar');
 let records=JSON.parse(JSON.stringify(DEMO)),state=null,lastOutput=null,pending=[],review=null,optionsOpen=false,observer=null,localSequence=100,reads=0,previousFocus=null;
 const escape=V.escape;
 const roleFromType=type=>Object.keys(SPEC.schemas).find(r=>'demo-type-'+r===type);
 const allRows=()=>Object.values(records).flat();
 const tools={call(name,v){
  if(name==='records.read'){
   reads++;const role=roleFromType(v.typeId);if(!role)throw Error('Unknown fictional table.');
   const rows=(records[role]||[]).filter(r=>Object.entries(v.filters||{}).every(([k,val])=>String(r.data[k]??'')===val));
   return {tableName:SPEC.schemas[role].name,rows:JSON.parse(JSON.stringify(rows.slice(v.offset,v.offset+v.limit))),total:rows.length,limit:v.limit,offset:v.offset};
  }
  if(name==='records.get'){reads++;const role=Object.keys(records).find(k=>records[k].some(r=>r.id===v.recordId)),r=role&&records[role].find(r=>r.id===v.recordId);if(!r)throw Error('Fictional record not found.');return {id:r.id,typeId:'demo-type-'+role,version:r.version,data:JSON.parse(JSON.stringify(r.data))};}
  if(name==='records.propose'){for(const c of v){if(c.kind==='update_record'){const r=allRows().find(r=>r.id===c.recordId);if(!r||r.version!==c.expectedVersion)throw Error('The record changed. Reopen it before editing.');}else if(c.kind!=='create_record'||!roleFromType(c.typeId))throw Error('Unknown local operation.');}pending.push(...JSON.parse(JSON.stringify(v)));return {status:'proposed',count:v.length};}
  throw Error('Unsupported standalone capability: '+name);
 }};
 function setOptions(open,focus=false){optionsOpen=open;const bar=root.querySelector('.tracker-toolbar'),b=bar?.querySelector('.tracker-options-toggle');bar?.classList.toggle('options-open',open);b?.setAttribute('aria-expanded',String(open));if(focus)b?.focus({preventScroll:true});}
 function fit(){const bar=root.querySelector('.tracker-toolbar');if(!bar)return;const opt=bar.querySelector('.tracker-options'),add=bar.querySelector(':scope>.primary');if(!opt||!add)return;bar.classList.toggle('toolbar-compact',bar.clientWidth<420);add.innerHTML=bar.clientWidth<420?'+ Add':'+ Add record';bar.classList.remove('options-overflow');const gap=parseFloat(getComputedStyle(bar).gap)||10;const overflow=160+opt.getBoundingClientRect().width+add.getBoundingClientRect().width+gap*2>bar.clientWidth;bar.classList.toggle('options-overflow',overflow);setOptions(overflow&&optionsOpen);}
 function wirePaint(output,prev){
  const active=document.activeElement,activeAction=active?.getAttribute('data-action'),activeName=active?.getAttribute('name'),selStart=active?.selectionStart,selEnd=active?.selectionEnd;
  const scroll=window.scrollY,horizontal=[...root.querySelectorAll('.scroll,.ls-timeline-scroll')].map(x=>x.scrollLeft);
  root.innerHTML=output.html;state=output.state;lastOutput=output;
  observer?.disconnect();fit();const bar=root.querySelector('.tracker-toolbar');if(bar){observer=new ResizeObserver(fit);observer.observe(bar);}
  if(prev?.tab!==state.tab){optionsOpen=false;setOptions(false);window.scrollTo(0,0);root.querySelector('[aria-selected="true"]')?.focus({preventScroll:true});}
  else if(!prev?.detail&&state.detail){previousFocus=activeAction;root.querySelector('.drawer [aria-label="Close details"]')?.focus({preventScroll:true});}
  else if(prev?.detail&&!state.detail){[...root.querySelectorAll('[data-action]')].find(n=>n.getAttribute('data-action')===previousFocus)?.focus({preventScroll:true});}
  else if(activeAction||activeName){const next=[...root.querySelectorAll('input,textarea,select,button')].find(n=>activeAction?n.getAttribute('data-action')===activeAction:n.name===activeName);if(next){next.focus({preventScroll:true});if(typeof selStart==='number'&&next.setSelectionRange)try{next.setSelectionRange(selStart,selEnd);}catch{}}}
  if(prev?.tab===state.tab)window.scrollTo(0,scroll);
  [...root.querySelectorAll('.scroll,.ls-timeline-scroll')].forEach((x,i)=>x.scrollLeft=horizontal[i]||0);
 }
 function render(event={kind:'open',action:'',value:null,form:{}}){
  const prev=state;pending=[];
  try{const out=renderLifeScience(SPEC,CONFIG,BINDINGS,{state,event,saved:true,writable:true},tools,V,THEME,ICONS);wirePaint(out,prev);if(pending.length)showReview(pending);}
  catch(e){pending=[];console.error(e);const current=root.querySelector('.ls-record-form');if(current){let p=current.querySelector('.ls-field-error');if(!p){p=document.createElement('p');p.className='ls-field-error';p.setAttribute('role','alert');current.prepend(p);}p.textContent=e.message+' Your input has not been saved.';}else{window.__lastTemplateError=String(e);}}
 }
 function formValues(form){return Object.fromEntries([...new FormData(form)].map(([k,v])=>[k,String(v)]));}
 function dispatch(target,kind){const trigger=target.closest('[data-action]');if(!trigger||trigger.disabled)return;const action=trigger.getAttribute('data-action');if(action==='copy-prompt'){copyPrompt(trigger);return;}
  const form=trigger.closest('form'),values=form?formValues(form):{};if(kind==='submit'&&form&&!form.reportValidity())return;
  render({kind,action,value:target.type==='checkbox'?target.checked:typeof target.value==='string'?target.value:null,form:values});
 }
 function copyPrompt(b){const t=root.querySelector('.ls-prompt textarea');if(!t)return;t.focus();t.select();try{const ok=document.execCommand('copy');b.textContent=ok?'Copied':'Prompt selected';}catch{b.textContent='Prompt selected';}setTimeout(()=>{if(b.isConnected)b.textContent='Copy prompt';},1800);}
 function showReview(changes){
  const former=document.activeElement;review=document.createElement('dialog');review.className='ls-local-review';review.setAttribute('aria-labelledby','ls-review-title');
  const rows=changes.flatMap(c=>{const old=c.kind==='update_record'?allRows().find(r=>r.id===c.recordId)?.data||{}:{};return Object.entries(c.data).filter(([k,v])=>JSON.stringify(old[k])!==JSON.stringify(v)).map(([k,v])=>'<tr><th scope="row">'+escape(k)+'</th><td>'+escape(old[k]??'Not set')+'</td><td>'+escape(v??'Not set')+'</td></tr>');}).join('');
  review.innerHTML='<div class="ls-review-heading"><span class="ls-demo-tag">LOCAL DEMO</span><h2 id="ls-review-title">Review your changes</h2><p>This modifies fictional records in this browser only. It does not save an app or write to TrialAgents.</p></div><div class="ls-review-scroll"><table><thead><tr><th>Field</th><th>Before</th><th>Proposed</th></tr></thead><tbody>'+rows+'</tbody></table></div><div class="ls-form-actions"><button type="button" data-local="cancel">Cancel</button><button type="button" class="primary" data-local="apply">Apply to local demo</button></div>';
  document.body.append(review);review.showModal();review.querySelector('[data-local="cancel"]').focus();
  const close=()=>{const d=review;review=null;d?.close();d?.remove();former?.focus?.();};
  review.addEventListener('cancel',e=>{e.preventDefault();close();});
  review.querySelector('[data-local="cancel"]').onclick=close;
  review.querySelector('[data-local="apply"]').onclick=()=>{const next=JSON.parse(JSON.stringify(records));try{for(const c of changes){if(c.kind==='create_record'){const role=roleFromType(c.typeId);next[role].unshift({id:'demo-created-'+(++localSequence),version:0,data:c.data});}else{const r=Object.values(next).flat().find(r=>r.id===c.recordId);if(!r||r.version!==c.expectedVersion)throw Error('The example changed. Reopen its record.');r.data={...r.data,...c.data};r.version++;}}records=next;close();state.notice='Applied to fictional demo data only. Reload this file to reset.';delete state.detail;delete state.editor;delete state.draft;delete state.fieldError;delete state.proposed;render();}catch(e){const p=document.createElement('p');p.className='ls-field-error';p.textContent=e.message;review.prepend(p);}};
 }
 root.addEventListener('click',e=>{if(!(e.target instanceof Element))return;const toggle=e.target.closest('.tracker-options-toggle');if(toggle){e.preventDefault();setOptions(!optionsOpen);return;}const b=e.target.closest('button');if(!b||b.disabled)return;if(b.type==='submit'&&b.form)return;if(b.hasAttribute('data-action')){e.preventDefault();dispatch(b,'click');}});
 root.addEventListener('submit',e=>{e.preventDefault();dispatch(e.target,'submit');});
 root.addEventListener('input',e=>{if(e.target.matches('input[data-action],textarea[data-action]'))dispatch(e.target,'change');});
 root.addEventListener('change',e=>{if(e.target.matches('select[data-action],input[type=checkbox][data-action]'))dispatch(e.target,'change');});
 document.addEventListener('pointerdown',e=>{if(optionsOpen&&!e.target.closest('.tracker-toolbar'))setOptions(false);});
 document.addEventListener('keydown',e=>{
  if(review)return;
  if(e.key==='Escape'&&optionsOpen){e.preventDefault();setOptions(false,true);return;}
  if(e.key==='Escape'&&state?.detail){e.preventDefault();render({kind:'click',action:'close-details',value:null,form:{}});return;}
  if(e.key==='Tab'&&state?.detail){const nodes=[...root.querySelectorAll('.drawer button,.drawer input,.drawer textarea,.drawer select,.drawer a')].filter(x=>!x.disabled&&x.getClientRects().length);if(!nodes.length)return;if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0].focus();}}
  const tab=e.target.closest('[role="tab"]');if(tab&&['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?SPEC.screens.length-1:(state.tab+(e.key==='ArrowRight'?1:-1)+SPEC.screens.length)%SPEC.screens.length;render({kind:'click',action:'nav:'+n,value:null,form:{}});}
 });
 window.__templateQA={id:SPEC.id,screens:SPEC.screens.map(s=>({name:s.name,kind:s.kind,role:s.role})),get state(){return JSON.parse(JSON.stringify(state));},get readCount(){return reads;},get records(){return JSON.parse(JSON.stringify(records));},navigate(i){render({kind:'click',action:'nav:'+i,value:null,form:{}});}};
 render();
})();
