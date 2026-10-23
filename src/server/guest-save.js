// Bearer capability travels in the fragment, never a query or referrer.
const status=document.getElementById('status'),content=document.getElementById('content'),actions=document.getElementById('actions');
let handle,review;
function element(tag,text,parent=content){const e=document.createElement(tag);e.textContent=text;parent.append(e);return e;}
function button(label,fn){const b=element('button',label,actions);b.onclick=fn;return b;}
async function api(path,body,csrf){const r=await fetch('/guest/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(csrf?{'x-csrf-token':csrf}:{})},body:JSON.stringify(body),cache:'no-store'});const out=await r.json();if(!r.ok){const e=Error(out.message||'The save did not complete. Your preview is preserved.');e.status=r.status;throw e;}return out;}
function completed(receipt){status.textContent='Saved to Trialy. Your tracker remains available after the temporary preview expires.';actions.replaceChildren();const a=element('a','Open saved workspace',actions);a.href='/?workspaceId='+encodeURIComponent(receipt.workspaceId)+'&tab=projects';}
async function inspect(){
 review=await api('inspect',{handle});content.replaceChildren();actions.replaceChildren();
 if(review.status==='saved'){completed(review.receipt);return;}
 const b=review.bundle;element('h2',b.name);element('p','Temporary preview expires '+new Date(review.expiresAt).toLocaleString()+'. Choose where to save below; review shared table reuse before saving.');
 for(const t of b.tables){element('h3',t.name+' · '+t.rows.length+' records');const scroll=element('div','');scroll.className='scroll';const table=element('table','',scroll),head=element('tr','',table);for(const f of t.fields)element('th',f.name,head);for(const r of t.rows){const row=element('tr','',table);for(const f of t.fields)element('td',String(r.data[f.key]??''),row);}}
 for(const c of b.components){element('h3',c.name);const details=element('details','');element('summary','Review '+c.format+' source',details);element('pre',c.source,details);}
 if(!review.account){status.textContent='Connect your account to keep this exact tracker. Signing in returns you here.';const a=element('a','Connect account',actions);a.href='/auth/login';return;}
 const destinationLabel=element('label','Destination workspace '),select=element('select','',destinationLabel),mappingBox=element('div','');let destination;
 for(const w of review.destinations??[]){const o=element('option',w.name,select);o.value=w.id;}
 const fresh=element('option','Create a separate workspace',select);fresh.value='';
 function choose(){mappingBox.replaceChildren();const w=review.destinations?.find(w=>w.id===select.value);destination=w?{workspaceId:w.id,tables:[]}:undefined;if(!w)return;
  element('p','Confirm that these fields represent the same facts. Draft rows become new records; existing records are never overwritten.',mappingBox);
  for(const t of b.tables){const candidates=w.tables.find(x=>x.draftTypeId===t.id)?.candidates??[];const label=element('label',t.name+' → ',mappingBox),choice=element('select','',label);for(const c of candidates){const o=element('option',c.name+' (reuse compatible fields)',choice);o.value=c.id;}const other=element('option','New table — explain why reuse is unsuitable',choice);other.value='';const reason=element('input','',mappingBox);reason.placeholder='Reason a new table is needed';const binding={draftTypeId:t.id};destination.tables.push(binding);function update(){const c=candidates.find(c=>c.id===choice.value);delete binding.typeId;delete binding.expectedVersion;delete binding.reason;if(c){binding.typeId=c.id;binding.expectedVersion=c.version;}else binding.reason=reason.value;reason.hidden=!!c;}choice.onchange=update;reason.oninput=update;update();}
 }select.onchange=choose;choose();
 status.textContent='Save to '+review.account.email;button('Use another account',async()=>{try{const r=await fetch('/auth/logout',{method:'POST',headers:{'x-csrf-token':review.csrf}});if(!r.ok)throw Error('Could not sign out. Please retry.');location.reload();}catch(e){status.textContent=e.message;}});const label=element('label','');const checkbox=document.createElement('input');checkbox.type='checkbox';label.prepend(checkbox);label.append(document.createTextNode(' Allow ChatGPT to use the selected destination. Future database changes still require Save/Apply unless separately authorized.'));
 const save=button('Save to this account',async()=>{
  if(!checkbox.checked){status.textContent='Confirm ChatGPT access to the selected destination before saving.';return;}
  save.disabled=true;status.textContent='Saving your tracker to '+review.account.email+'…';
  try{
   let receipt;for(let attempt=0;attempt<3;attempt++){try{receipt=await api('save',{handle,digest:review.digest,accountId:review.account.userId,confirmed:true,allowAi:true,...(destination?{destination}:{})},review.csrf);break;}catch(e){if(attempt===2||(e.status&&e.status<500))throw e;}}
   completed(receipt);
  }catch(e){status.textContent=e.message;save.disabled=false;}
 });
}
(async()=>{try{
 const hash=new URLSearchParams(location.hash.slice(1)),raw=hash.get('preview');
 if(raw){handle=JSON.parse(raw);if(!handle.id||!handle.token)throw Error('Invalid tracker reference');const flow=crypto.randomUUID();sessionStorage.setItem('trialy-draft-'+flow,JSON.stringify(handle));history.replaceState(null,'','/save-preview?flow='+flow);}
 else{const flow=new URLSearchParams(location.search).get('flow')||sessionStorage.getItem('trialy-current-draft');handle=JSON.parse(sessionStorage.getItem('trialy-draft-'+flow)||'null');if(flow)history.replaceState(null,'','/save-preview?flow='+flow);}
 const flow=new URLSearchParams(location.search).get('flow');if(flow)sessionStorage.setItem('trialy-current-draft',flow);
 if(!handle)throw Error('Open Save to your account from the temporary tracker in ChatGPT.');await inspect();
 }catch(e){status.textContent=e.message;button('Retry',()=>inspect().catch(e=>{status.textContent=e.message;}));}})();
