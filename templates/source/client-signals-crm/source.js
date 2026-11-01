const templateLayoutSchema=__LAYOUT__;
const CLIENT_CSS=__CSS__;
/* CR06 Client Signals & CRM: TrialAgents supplies the account, access, review, layout and task runner. */
const SCHEMA=__FIELDS__;
const cfg=(typeof templateConfiguration==='object'&&templateConfiguration)||{};
const e=(input&&input.event)||{kind:'open',action:'',value:null,form:{}};
const act=String(e.action||'');
const txt=x=>String(x==null?'':x).trim();
const esc=x=>String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const trim=(x,n=130)=>txt(x).slice(0,n);
const validDate=v=>{let t=txt(v);if(!/^\d{4}-\d{2}-\d{2}$/.test(t))return false;let d=new Date(t+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===t;};
const showDate=x=>validDate(x)?new Date(x+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'Not recorded';
const validUrl=v=>/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(?:[:/?#][^\s]*)?$/i.test(txt(v));
const asOf=validDate(cfg.asOf)?cfg.asOf:'';
const minusDays=(d,n)=>{if(!validDate(d))return '';let a=new Date(d+'T00:00:00Z');a.setUTCDate(a.getUTCDate()-n);return a.toISOString().slice(0,10);};
const roles=Object.keys(SCHEMA);
const TABLE=Object.fromEntries(roles.map(r=>[r,Object.fromEntries(SCHEMA[r].map(f=>[f.key,f]))]));
const links={contacts:{companyId:'companies'},opportunities:{companyId:'companies'},interactions:{companyId:'companies',contactId:'contacts',opportunityId:'opportunities'},signals:{companyId:'companies'},followups:{companyId:'companies',contactId:'contacts',opportunityId:'opportunities'},reports:{companyId:'companies'}};
const dependents={companies:[['contacts','companyId'],['opportunities','companyId'],['interactions','companyId'],['signals','companyId'],['followups','companyId'],['reports','companyId']],contacts:[['interactions','contactId'],['followups','contactId']],opportunities:[['interactions','opportunityId'],['followups','opportunityId']]};
const roleLabels={companies:'Companies',contacts:'Contacts',opportunities:'Deals',interactions:'Interactions',signals:'Client signals',followups:'Follow-ups',runs:'Research runs',reports:'Account briefs'};
const roleSingular={companies:'Company',contacts:'Contact',opportunities:'Opportunity',interactions:'Interaction',signals:'Signal',followups:'Follow-up',runs:'Research run',reports:'Account brief'};
let parsedMap={};try{parsedMap=JSON.parse(cfg.tableMap||'{}')}catch{}
const bindings=Array.isArray(templateBindings)?templateBindings:[];
const mapping={},DATA={},backendCache={};
for(const role of roles){
 const empty={rows:[],total:null,complete:false,reason:'No authorized binding'};DATA[role]=empty;
 const m=parsedMap[role];if(!m||!txt(m.typeId)||!m.fields)continue;
 const b=bindings.find(x=>txt(x.typeId)===txt(m.typeId));if(!b||!Array.isArray(b.fields)){empty.reason='Binding is not authorized';continue;}
 const allowed=new Set(b.fields),map={};for(const f of SCHEMA[role])if(typeof m.fields[f.key]==='string'&&allowed.has(m.fields[f.key]))map[f.key]=m.fields[f.key];
 const missing=SCHEMA[role].filter(f=>!map[f.key]);if(missing.length){empty.reason='Required mappings missing: '+missing.map(x=>x.key).join(', ');continue;}
 mapping[role]={typeId:m.typeId,fields:map,writable:new Set(Array.isArray(m.writableFields)?m.writableFields:[])};
 const known=new Set();let off=0;let limit=40;for(let n=0;n<10;n++){
  let out;try{out=tools.call('records.read',{typeId:m.typeId,offset:off,limit});}catch{empty.reason='Read denied';break;}
  if(!out||out.unavailable||!Array.isArray(out.rows)||!Number.isInteger(out.total)||out.total<0){empty.reason='Read incomplete or total unknown';break;}
  if(out.rows.length!==Math.min(limit,Math.max(0,out.total-off))){empty.reason='Short or invalid page';break;}if(empty.total!==null&&empty.total!==out.total){empty.reason='Source changed during read';break;}empty.total=out.total;let bad='';
  for(const row of out.rows){
   if(!row||!txt(row.id)||!Number.isInteger(row.version)||!row.data||typeof row.data!=='object'||known.has(row.id)){bad='Record ID/version missing or duplicate';break;}
   const val={};for(const f of SCHEMA[role])if(map[f.key]&&Object.hasOwn(row.data,map[f.key]))val[f.key]=row.data[map[f.key]];
   if(SCHEMA[role].some(f=>f.required&&(val[f.key]===undefined||val[f.key]===null||txt(val[f.key])===''||Array.isArray(val[f.key])))){bad='Required mapped field is absent or multi-valued';break;}
   if(Object.entries(val).some(([k,v])=>(v!==null&&typeof v==='object')||((TABLE[role][k].kind==='ref')&&v!==null&&v!==undefined&&typeof v!=='string'))){bad='Unsupported multi-value or linked object';break;}
   known.add(row.id);empty.rows.push({id:row.id,version:row.version,data:val});
  }
  if(bad){empty.reason=bad;break;}off+=out.rows.length;
  if(off>=out.total){empty.complete=true;empty.reason='';break;}
  if(out.rows.length<limit){empty.reason='Short page before source total';break;}
 }
 if(!empty.complete&&!empty.reason)empty.reason='Read budget exhausted';
 if(!empty.complete&&empty.reason==='No authorized binding')empty.reason='Read budget exhausted';
}
const rows=(role,archived=false)=>(DATA[role]?.rows||[]).filter(r=>archived||r.data.archived!==true&&r.data.archived!=='true');
const complete=roles_=>roles_.every(r=>!!DATA[r]?.complete);
const missingRoles=roles_=>roles_.filter(r=>!DATA[r]?.complete);
const get=(r,id)=>!id?undefined:rows(r).find(x=>x.id===id)||backendRead(r).rows.find(x=>x.id===id);
const label=(r,id)=>get(r,id)?.data.name||'Unlinked / unavailable';
const sourceScope=rs=>complete(rs)?'Complete authorized records':'Partial records: '+missingRoles(rs).map(r=>roleLabels[r]).join(', ');
const cleanTime=v=>txt(v).replace(/T.*/, '');
const noOutreach=r=>!!r&&(['true',true].includes(r.data.optOut)||r.data.channel==='Do not contact'||r.data.status==='Declined');
const safeHref=v=>validUrl(v)?'<a href="'+esc(v)+'" target="_blank" rel="noopener noreferrer" class="ct-external">View source ↗</a>':'<span class="ct-muted">Source unverified</span>';
const iconShape={spark:'<path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2z"/>',home:'<path d="M4 10.5 12 4l8 6.5V21H4V10.5Z"/>',companies:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 5V3h8v2M7 10h3m4 0h3M7 14h3m4 0h3"/>',contacts:'<circle cx="10" cy="8" r="4"/><path d="M3 21v-2c0-4 3-6 7-6s7 2 7 6v2M18 8h4m-4 4h4"/>',opportunities:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 13h18"/>',signals:'<circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4M5 5l3 3m8 8 3 3m0-14-3 3M8 16l-3 3"/>',monitor:'<circle cx="12" cy="12" r="8"/><path d="M12 12 17 7M5 17l2-2"/>',reports:'<path d="M5 3h10l4 4v14H5V3Z M15 3v5h4M8 13h8M8 17h8"/>',plus:'<path d="M12 5v14M5 12h14"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="m10 2-.5 2-2 1-2-1-2 3 1 2-1 2-2 1v3l2 1 1 2-1 2 3 2 2-1 2 1 .5 2h3l.5-2 2-1 2 1 2-3-1-2 1-2 2-1v-3l-2-1-1-2 1-2-2-3-2 1-2-1-.5-2z"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',close:'<path d="M5 5l14 14M19 5 5 19"/>',check:'<path d="M5 12l4 4L19 6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',link:'<path d="M9 15l6-6M8 10l-2 2a4 4 0 0 0 6 6l2-2M16 14l2-2a4 4 0 0 0-6-6l-2 2"/>',search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>'};
const ico=(s,size=18)=>'<svg viewBox="0 0 24 24" width="'+size+'" height="'+size+'" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(iconShape[s]||iconShape.spark)+'</svg>';
const btn=(html,action,cl='',disabled=false,label_='')=>'<button type="button" data-action="'+esc(action)+'" class="ct-btn '+cl+'" '+(disabled?'disabled':'')+(label_?' aria-label="'+esc(label_)+'"':'')+'>'+html+'</button>';
const badge=(x,variant='')=>'<span class="ct-pill '+esc(variant)+'">'+esc(x||'Unknown')+'</span>';
const displayVal=(f,v)=>f.kind==='boolean'?(v===true||v==='true'?'Yes':'No'):f.kind==='date'?showDate(v):trim(v,70)||'—';
const stageSteps=['Identified','Qualified','Meeting','RFP','Negotiation','Won','Lost'];
const navNames={overview:'Sales overview',companies:'Company directory',contacts:'Decision makers',opportunities:'Deal pipeline',signals:'Client signals',monitor:'Signal monitoring',reports:'Account briefings'};
const navShort={overview:'Overview',companies:'Companies',contacts:'People',opportunities:'Deals',signals:'Signals',monitor:'Monitor',reports:'Briefings'};
const tabIds=Object.keys(navNames);
const layout=(()=>{let v={};try{v=JSON.parse(cfg.layoutProfile||'{}')}catch{}let tabs=(Array.isArray(v.tabs)?v.tabs:tabIds).filter(x=>tabIds.includes(x));for(const x of tabIds)if(!tabs.includes(x))tabs.push(x);
const cols={};for(const role of roles){const all=templateLayoutSchema.groups[role].map(x=>x.id);const prior=Array.isArray(v.cols?.[role])?v.cols[role]:[];cols[role]=[...new Set([...prior.filter(x=>all.includes(x)),...all])];}
return {heading:txt(v.heading||cfg.heading||'Client Signals & CRM'),tabs:[...new Set(tabs)],visible:typeof v.visible==='object'&&v.visible||{},cols};})();
const visible=(key)=>layout.visible[key]!==false;
const nav=layout.tabs.filter(visible);
const ST={tab:'overview',company:'',contact:'',opp:'',search:'',country:'All',phase:'All',signalType:'All',dealStage:'All',pages:{},editor:null,archive:null,notice:'',showRecipe:false,watchRegion:'EU / UK',watchTopics:'Funding, Trial start, Regulatory, Hiring, Partnership',watchCompanies:'',watchSince:'',watchCadence:'Weekly (proposed; not activated)',showFilters:false,registers:false,...(input?.state||{})};
if(!nav.includes(ST.tab))ST.tab=nav[0]||'overview';
const editable=input?.saved!==false&&input?.writable!==false&&!cfg.readOnly;
const page=(key,data_,size=9)=>{const max=Math.max(0,Math.ceil(data_.length/size)-1);const at=Math.max(0,Math.min(max,Number(ST.pages[key])||0));ST.pages[key]=at;return {data:data_.slice(at*size,(at+1)*size),at,max,total:data_.length};};
const pagination=(key,p)=>'<div class="ct-page"><span>'+(p.total?('Page '+(p.at+1)+' of '+(p.max+1)):'0')+' of '+p.total+' loaded</span><div>'+btn('Previous','page:'+key+':-1','ct-ghost',p.at===0)+btn('Next','page:'+key+':1','ct-ghost',p.at>=p.max)+'</div></div>';
const searchMatch=r=>!txt(ST.search)||JSON.stringify(r.data).toLowerCase().includes(txt(ST.search).toLowerCase());
const filteredCompanies=()=>rows('companies').filter(r=>searchMatch(r)&&(ST.country==='All'||r.data.country===ST.country)&&(ST.phase==='All'||r.data.phase===ST.phase));
if(!get('companies',ST.company))ST.company=filteredCompanies()[0]?.id||rows('companies')[0]?.id||'';
if(!get('contacts',ST.contact))ST.contact=rows('contacts')[0]?.id||'';
if(!get('opportunities',ST.opp))ST.opp=rows('opportunities')[0]?.id||'';
const ofCompany=(r,id)=>rows(r).filter(x=>x.data.companyId===id);
const warning=(rs)=>!complete(rs)?'<div class="ct-coverage" role="status"><strong>Limited evidence</strong><span>Some linked records are inaccessible, missing, or exceed the read budget. Figures and approvals that depend on them are withheld.</span><small>'+esc(sourceScope(rs))+'</small></div>':'';
const sourceNote=rs=>'<span class="ct-source-note">'+esc(sourceScope(rs))+'</span>';
const fullDate=(x)=>validDate(x)?showDate(x):'Date not recorded';
const verifiedSignal=r=>r.data.status==='Reviewed'&&validUrl(r.data.sourceUrl)&&validDate(r.data.publishedAt)&&validDate(r.data.reviewedAt)&&txt(r.data.reviewer)!==''&&txt(r.data.fact)!==''&&get('companies',r.data.companyId);
const dedupedReviewed=()=>{let seen=new Set();return rows('signals').filter(r=>{if(!verifiedSignal(r))return false;const key=[r.data.companyId,r.data.type,txt(r.data.sourceUrl).replace(/\/$/,'').toLowerCase(),r.data.publishedAt].join('|');if(seen.has(key))return false;seen.add(key);return true;});};
const allVisibleSource=rs=>complete(rs)&&!!rs.length;
function validateDraft(role,d,old){
 for(const f of SCHEMA[role]){
  let v=d[f.key];if(f.required&&(v===undefined||v===null||txt(v)===''))return f.label+' is required';
  if(v!==null&&typeof v==='object')return 'Structured scalar fields are not supported here';
  if(old&&txt(v)!==txt(old.data[f.key])&&(!mapping[role]?.fields[f.key]||!mapping[role]?.writable.has(f.key)))return 'Field is read only: '+f.label;
  if(f.kind==='date'&&txt(v)&&!validDate(v))return 'Invalid date: '+f.label;
  if(f.kind==='number'&&txt(v)&&!Number.isFinite(Number(v)))return f.label+' must be numeric';
  if(f.kind==='select'&&txt(v)&&!f.options.includes(v))return 'Invalid selection: '+f.label;
  if(f.kind==='ref'&&txt(v)&&!get(f.parent,v))return 'Missing authorized linked '+roleLabels[f.parent]+' record';
 }
 if(!complete([role]))return 'This source is not fully available; the edit cannot safely be reviewed';
 for(const parent of Object.values(links[role]||{}))if(!complete([parent]))return 'Linked parent source is not complete';
 for(const f of SCHEMA[role])if((f.key.toLowerCase().includes('url')||f.key==='website'||f.key==='sizeSource')&&txt(d[f.key])&&!validUrl(d[f.key]))return f.label+' must contain an HTTPS URL';
 if(old){
  const locked={opportunities:['companyId'],contacts:['companyId'],interactions:['companyId','contactId','opportunityId','occurredAt'],signals:['companyId','type','sourceUrl','publishedAt'],followups:['companyId','contactId','opportunityId'],reports:['companyId','periodStart','periodEnd'],runs:['windowStart','windowEnd']};
  if((locked[role]||[]).some(k=>txt(d[k])!==txt(old.data[k])))return 'Historical identity/source link cannot be reassigned. Create a new reviewed record.';
 }
 if(role==='companies'){
  let url=txt(d.website).toLowerCase().replace(/\/$/,'');if(!validUrl(url))return 'Company website must be a valid HTTPS URL';
  if(rows('companies').some(x=>x.id!==old?.id&&txt(x.data.website).toLowerCase().replace(/\/$/,'')===url))return 'A company with this verified website already exists';
 }
 if(role==='contacts'){
  if(rows('contacts').some(x=>x.id!==old?.id&&x.data.companyId===d.companyId&&txt(x.data.name).toLowerCase()===txt(d.name).toLowerCase()&&txt(x.data.title).toLowerCase()===txt(d.title).toLowerCase()))return 'Potential duplicate professional contact: review identity';
  if(txt(d.email)&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(txt(d.email)))return 'Invalid professional email format';
 }
 if(role==='opportunities'){
  if(txt(d.probability)&&(!Number.isInteger(Number(d.probability))||Number(d.probability)<0||Number(d.probability)>100))return 'Probability must be between 0 and 100';
  if(txt(d.estimatedValue)&&Number(d.estimatedValue)<0)return 'Estimated value cannot be negative';
  if(txt(d.estimatedValue)&&!txt(d.currency))return 'Provide currency for any estimated value';
  if(old&&txt(old.data.stage)!==txt(d.stage)&&(!validDate(d.stageDecisionAt)||!txt(d.stageRationale)))return 'Stage changes need a dated decision and rationale';
  if(old&&txt(old.data.stage)!==txt(d.stage)&&txt(old.data.stageRationale)===txt(d.stageRationale)&&txt(old.data.stageDecisionAt)===txt(d.stageDecisionAt))return 'Record a new dated stage-decision note; prior evidence cannot silently justify a new stage';
  if(['Qualified','Meeting','RFP','Negotiation','Won'].includes(d.stage)&&d.qualification!=='Confirmed')return 'A progressed deal requires documented human qualification';
  if(d.stage==='Won'&&!txt(d.stageRationale))return 'Won deals require human decision evidence';
 }
 if(role==='signals'){
  if(old){
   if(!complete(['reports']))return 'Cannot revise signal evidence without complete linked briefing access';
   if(rows('reports').some(x=>x.data.status==='Reviewed'&&txt(x.data.evidenceRefs).split(',').some(y=>txt(y).startsWith(old.id+'@'))))return 'Return linked reviewed briefings to Draft before changing this signal';
  }
  if(!validUrl(d.sourceUrl))return 'A public HTTPS source URL is required';
  if(validDate(d.publishedAt)&&validDate(d.observedAt)&&d.observedAt<d.publishedAt)return 'Observed date cannot precede publication date';
  if(rows('signals').some(x=>x.id!==old?.id&&x.data.companyId===d.companyId&&x.data.type===d.type&&txt(x.data.sourceUrl).replace(/\/$/,'').toLowerCase()===txt(d.sourceUrl).replace(/\/$/,'').toLowerCase()&&x.data.publishedAt===d.publishedAt))return 'Duplicate announcement: link to the existing signal';
  if(d.status==='Reviewed'&&(!txt(d.reviewer)||!validDate(d.reviewedAt)||!txt(d.fact)||d.relevance==='Unknown'))return 'Reviewed signals require reviewer, date, sourced fact and relevance';
  if(old&&old.data.status==='Reviewed'&&['companyId','sourceUrl','publishedAt','fact','relevance','interpretation'].some(k=>txt(old.data[k])!==txt(d[k]))){
   if(!complete(['reports']))return 'Cannot revise reviewed evidence without complete linked briefing access';
   const impacted=rows('reports').some(x=>x.data.status==='Reviewed'&&txt(x.data.evidenceRefs).split(',').map(y=>txt(y)).includes(old.id+'@'+old.version));
   if(impacted)return 'Reviewed account briefing references this evidence version; create a replacement signal and re-review the report';
   if(d.status==='Reviewed')return 'Evidence has changed; return to Candidate for renewed review';
  }
 }
 if(role==='interactions'){
  const c=get('contacts',d.contactId);if(c&&c.data.companyId!==d.companyId)return 'Contact is linked to another organization';
  const o=get('opportunities',d.opportunityId);if(o&&o.data.companyId!==d.companyId)return 'Opportunity belongs to another organization';
 }
 if(role==='followups'){
  const c=get('contacts',d.contactId);if(c&&c.data.companyId!==d.companyId)return 'Follow-up contact has another company';
  const o=get('opportunities',d.opportunityId);if(o&&o.data.companyId!==d.companyId)return 'Follow-up opportunity has another company';
  if(d.status==='Done'&&!validDate(d.completedAt))return 'Done requires an actual completion date';
 }
 if(role==='runs'){
  if(d.windowEnd<d.windowStart)return 'Research period end cannot precede start';
  if(d.status==='Completed'&&(!txt(d.runReceipt)||!validDate(d.completedAt)))return 'Completed requires a verified host run receipt and completion date';
  if(old&&old.data.status==='Completed'&&['runReceipt','windowStart','windowEnd','scope','coverage'].some(k=>txt(old.data[k])!==txt(d[k])))return 'Completed run provenance is historical; save a new run instead';
 }
 if(role==='reports'){
  if(d.periodEnd<d.periodStart)return 'Period end cannot precede start';
  if(d.status==='Reviewed'){
   if(!complete(['signals','companies'])||!txt(d.reviewer)||!validDate(d.reviewedAt))return 'Reviewed brief requires complete authorized source records, reviewer and date';
   let ids=txt(d.evidenceRefs).split(',').map(x=>txt(x)).filter(Boolean);if(!ids.length)return 'Reviewed brief requires at least one sourced signal ID@version';
   let seen=new Set();for(const x of ids){if(seen.has(x))return 'Duplicate briefing source';seen.add(x);const m=/^(.+)@(\d+)$/.exec(x);if(!m)return 'Evidence references must use exact id@version';const s=get('signals',m[1]);if(!s||s.version!==Number(m[2])||s.data.companyId!==d.companyId||!verifiedSignal(s))return 'Evidence is incomplete, mismatched, outdated, or not reviewed';}
  }
  if(old?.data.status==='Reviewed'&&['evidenceRefs','facts','interpretation'].some(k=>txt(old.data[k])!==txt(d[k]))&&d.status==='Reviewed')return 'Changing a reviewed brief requires returning it to Draft';
 }
 return '';
}
const pinnedArchive=(role,id)=>{if(role==='signals'){if(!complete(['reports']))return 'Cannot verify linked briefings';if(rows('reports').some(r=>txt(r.data.evidenceRefs).split(',').some(x=>txt(x).startsWith(id+'@'))))return 'Resolve linked briefings before archiving evidence';}for(const [child,f] of dependents[role]||[]){if(!complete([child]))return 'Cannot verify linked children: '+roleLabels[child]+' incomplete';if(rows(child).some(x=>x.data[f]===id))return 'Resolve linked active records before archiving '+roleSingular[role];}return '';};
const toHost=(role,d)=>{const m=mapping[role];if(!m)return null;let data={};for(const [key,v] of Object.entries(d)){if(!m.fields[key]||!m.writable.has(key))continue;let f=TABLE[role][key];if(f.kind==='boolean')data[m.fields[key]]=v===true||v==='true';else if(f.kind==='number')data[m.fields[key]]=txt(v)?Number(v):null;else data[m.fields[key]]=txt(v)||null;}return data;};
const propose=changes=>{tools.call('records.propose',changes);ST.notice='Changes proposed for workspace review. No record has been saved yet.';};
const openEditor=(role,record=null,duplicate=false,pref={})=>{
 let draft=record?{...record.data}:{archived:false};if(duplicate){draft.name=(draft.name||'Copy')+' (copy)';delete draft.archived;
  if(role==='companies')Object.assign(draft,{website:'',sizeSource:'',verifiedAt:''});
  if(role==='contacts')Object.assign(draft,{name:'',contactUrl:'',email:'',sourceUrl:'',verifiedAt:'',status:'Identified',optOut:false});
  if(role==='signals')Object.assign(draft,{status:'Candidate',reviewer:'',reviewedAt:'',relevance:'Unknown',sourceUrl:'',publishedAt:'',observedAt:'',fact:''});
  if(role==='reports')Object.assign(draft,{status:'Draft',reviewer:'',reviewedAt:'',evidenceRefs:''});
  if(role==='runs')Object.assign(draft,{status:'Planned',runReceipt:'',completedAt:''});
  if(role==='opportunities')Object.assign(draft,{stage:'Identified',qualification:'Pending',probability:'',estimatedValue:'',stageRationale:'',stageDecisionAt:''});
  if(role==='followups')Object.assign(draft,{status:'Open',completedAt:''});
 }
 if(!record)for(const x of Object.keys(pref))if(TABLE[role][x])draft[x]=pref[x];
 if(!record){if(role==='signals')Object.assign(draft,{type:'Funding',relevance:'Unknown',status:'Candidate',...draft});if(role==='opportunities')Object.assign(draft,{stage:'Identified',qualification:'Pending',...draft});if(role==='contacts')draft.status=draft.status||'Identified';if(role==='followups')draft.status=draft.status||'Open';if(role==='runs')draft.status=draft.status||'Planned';if(role==='reports')draft.status=draft.status||'Draft';}
 ST.editor={role,mode:record&&!duplicate?'edit':duplicate?'copy':'new',id:record&&!duplicate?record.id:'',version:record&&!duplicate?record.version:null,draft,error:''};
};
const handleEvent=()=>{
 if(e.kind==='change'){
  if(act.startsWith('field:')&&ST.editor){ST.editor.draft[act.slice(6)]=e.value;ST.editor.error='';return;}
  if(act.startsWith('watch:')){ST[act.slice(6)]=e.value;return;}
  if(act.startsWith('filter:')){ST[act.slice(7)]=e.value;ST.pages={};return;}
  if(act==='company-select'){ST.company=txt(e.value);return;}
  if(act==='search'){ST.search=String(e.value||'');ST.pages={};return;}
 }
 if(e.kind==='submit'&&act==='save-editor'&&ST.editor){
  const ed=ST.editor;ed.draft={...ed.draft,...(e.form||{})};
  let current=ed.id?get(ed.role,ed.id):null;if(ed.mode==='edit'&&(!current||current.version!==ed.version)){ed.error='Record changed or removed since editing began. Draft preserved; reopen after reviewing latest version.';return;}
  ed.error=validateDraft(ed.role,ed.draft,current);if(ed.error)return;
  const m=mapping[ed.role],vals=toHost(ed.role,ed.draft);if(!editable||!m||!Object.keys(vals||{}).length){ed.error='No authorized writable fields';return;}
  const op=ed.mode==='edit'?{kind:'update_record',recordId:ed.id,expectedVersion:ed.version,data:vals}:{kind:'create_record',typeId:m.typeId,data:vals};
  try{propose([op]);}catch{ed.error='Review proposal failed; draft retained';}
  return;
 }
 if(e.kind!=='click')return;
 if(act.startsWith('nav:')){ST.tab=act.slice(4);ST.notice='';return;}
 if(act.startsWith('company:')){ST.company=act.slice(8);ST.tab='companies';return;}
 if(act.startsWith('contact:')){ST.contact=act.slice(8);ST.tab='contacts';return;}
 if(act.startsWith('opp:')){ST.opp=act.slice(4);ST.tab='opportunities';return;}
 if(act.startsWith('page:')){const p=act.split(':');ST.pages[p[1]]=Math.max(0,(Number(ST.pages[p[1]])||0)+Number(p[2]));return;}
 if(act.startsWith('filterchip:')){ST.signalType=act.slice(11);ST.pages.signalFeed=0;return;}
 if(act==='toggle-registers'){ST.registers=!ST.registers;return;}
 if(act==='toggle-filters'){ST.showFilters=!ST.showFilters;return;}
 if(act==='toggle-recipe'){ST.showRecipe=!ST.showRecipe;return;}
 if(act==='close-notice'){ST.notice='';return;}
 if(act==='tracker:layout'){ST.notice='Use Settings > Layout to review, drag, save, or ignore the native template layout.';return;}
 if(act==='cancel-editor'){ST.editor=null;return;}
 if(act==='cancel-archive'){ST.archive=null;return;}
 if(act.startsWith('new:')){const p=act.split(':');let role=p[1],pref={};if(!SCHEMA[role])return;if(p[2]&&TABLE[role].companyId)pref.companyId=p[2];openEditor(role,null,false,pref);return;}
 if(act.startsWith('edit:')||act.startsWith('duplicate:')){let [kind,role,id]=act.split(':');const record=get(role,id);if(!record){ST.notice='Record unavailable or archived';return;}openEditor(role,record,kind==='duplicate');return;}
 if(act.startsWith('archive:')){let [_,role,id]=act.split(':');const record=get(role,id);if(!record)return;ST.archive={role,id,version:record.version};return;}
 if(act==='confirm-archive'&&ST.archive){let {role,id,version}=ST.archive;const record=get(role,id);if(!record||record.version!==version){ST.notice='Record version changed; archive is blocked.';return;}let reason=pinnedArchive(role,id);if(reason){ST.notice=reason;return;}let m=mapping[role];if(!editable||!m||!m.writable.has('archived')){ST.notice='Archive field not writable';return;}try{propose([{kind:'update_record',recordId:id,expectedVersion:version,data:{[m.fields.archived]:true}}]);}catch{ST.notice='Archive proposal failed; original version is retained.';}return;}
};
handleEvent();
function header(title,description,actions=''){
 return '<header class="ct-pagehead"><div><h1>'+esc(title)+'</h1><p>'+esc(description)+'</p></div><div class="ct-pageactions">'+actions+'</div></header>';
}
function empty(text){return '<div class="ct-empty">'+esc(text)+'</div>';}
function fine(role,r){return '<span class="ct-meta">'+esc(roleSingular[role])+' · v'+esc(r.version)+'</span>';}
function initial(x){return txt(x).split(/\s+/).slice(0,2).map(t=>t[0]||'').join('').toUpperCase();}
function avatar(name,cl=''){return '<span class="ct-avatar '+cl+'">'+esc(initial(name))+'</span>';}
function actions(role,r){return '<div class="ct-rowactions">'+btn('Edit','edit:'+role+':'+r.id,'ct-mini',!editable)+btn('Copy','duplicate:'+role+':'+r.id,'ct-mini',!editable)+btn('Archive','archive:'+role+':'+r.id,'ct-mini danger',!editable)+'</div>';}
function reportStatus(r){
 if(r.data.status!=='Reviewed')return r.data.status||'Draft';
 const refs=txt(r.data.evidenceRefs).split(',').map(txt).filter(Boolean);
 const valid=complete(['signals','companies'])&&get('companies',r.data.companyId)&&validDate(r.data.reviewedAt)&&txt(r.data.reviewer)&&refs.length&&new Set(refs).size===refs.length&&refs.every(ref=>{const m=/^(.+)@(\d+)$/.exec(ref);const signal=m&&get('signals',m[1]);return signal&&signal.version===Number(m[2])&&signal.data.companyId===r.data.companyId&&verifiedSignal(signal);});
 return valid?'Reviewed':'Needs evidence review';
}
function fieldShown(role,key,r){if(role==='reports'&&key==='status')return esc(reportStatus(r));const f=TABLE[role][key];const v=r.data[key];if(f?.kind==='ref')return esc(label(f.parent,v));return esc(displayVal(f||{kind:'text'},v));}
function table(role,records,key,limit=9){
 const cols=layout.cols[role].filter(col=>visible(role+':'+col)).slice(0,6);
 const p=page(key,records,limit);
 const header='<thead><tr>'+cols.map(k=>'<th>'+esc(TABLE[role][k].label)+'</th>').join('')+'<th>Actions</th></tr></thead>';
 const body=p.data.map(r=>'<tr>'+cols.map(k=>'<td>'+fieldShown(role,k,r)+'</td>').join('')+'<td>'+actions(role,r)+'</td></tr>').join('');
 return '<div class="ct-table-wrap" role="region" aria-label="'+esc(roleLabels[role])+' register, horizontal scroll if required"><table>'+header+'<tbody>'+body+'</tbody></table></div>'+(p.data.length?'':empty('No records in the current loaded view.'))+pagination(key,p);
}
function filterBar(includeOwner=false){
 const options=(vals,chosen,first)=>'<option value="All">'+first+'</option>'+vals.map(x=>'<option value="'+esc(x)+'" '+(x===chosen?'selected':'')+'>'+esc(x)+'</option>').join('');
 const countries=[...new Set(rows('companies').map(x=>txt(x.data.country)).filter(Boolean))].sort();
 const phases=[...new Set(rows('companies').map(x=>txt(x.data.phase)).filter(Boolean))].sort();
 return '<div class="ct-toolbar"><label class="ct-search">'+ico('search',16)+'<input type="search" name="search" data-ui-state="true" data-action="search" placeholder="Search loaded records" value="'+esc(ST.search)+'"></label>'+btn('Filters '+(ST.showFilters?'−':'+'),'toggle-filters','ct-outline')+'</div>'+(ST.showFilters?'<div class="ct-filterpanel"><label>Country<select name="country" data-action="filter:country" data-ui-state="true">'+options(countries,ST.country,'All countries')+'</select></label><label>Phase<select name="phase" data-action="filter:phase" data-ui-state="true">'+options(phases,ST.phase,'All phases')+'</select></label></div>':'');
}
function count(v,rs){return complete(rs)?String(v):'—';}
function overview(){
 const required=['companies','opportunities','signals','followups'];const good=complete(required);
 const active=rows('opportunities').filter(r=>!['Won','Lost'].includes(r.data.stage));
 const qualified=active.filter(r=>r.data.qualification==='Confirmed'&&['Qualified','Meeting','RFP','Negotiation'].includes(r.data.stage));
 const reviewed=dedupedReviewed().sort((a,b)=>txt(b.data.publishedAt).localeCompare(txt(a.data.publishedAt)));
 const fresh=asOf?reviewed.filter(x=>x.data.publishedAt<=asOf&&x.data.publishedAt>=minusDays(asOf,30)):[];
 const overdue=asOf?rows('followups').filter(x=>x.data.dueAt<asOf&&!['Done','Cancelled'].includes(x.data.status)):[];
 const followups=rows('followups').filter(x=>!['Done','Cancelled'].includes(x.data.status)).sort((a,b)=>txt(a.data.dueAt).localeCompare(txt(b.data.dueAt)));
 const signal=reviewed[0];
 const stageList=stageSteps.slice(0,5).map(stage=>{const n=active.filter(x=>x.data.stage===stage).length;return '<button type="button" class="ct-pipeline-tick" data-action="nav:opportunities"><span class="ct-tick-head">'+esc(stage)+'</span><strong>'+esc(count(n,['opportunities']))+'</strong><span class="ct-tick-bar"><span style="width:'+Math.min(100,Math.round(n/Math.max(1,active.length)*100))+'%"></span></span></button>';}).join('');
 return header('Sales overview','Put verified biotech activity, opportunities and next actions in one view.',btn(ico('plus')+' Add opportunity','new:opportunities','ct-primary',!editable))+warning(required)
 +'<div class="ct-hero"><div class="ct-hero-lead"><div class="ct-hero-kicker"><span class="ct-pulse-dot"></span> CRO BUSINESS INTELLIGENCE</div><div class="ct-hero-stats"><div><strong>'+esc(count(qualified.length,['opportunities']))+'</strong><span>Qualified leads</span></div><div><strong>'+esc(count(active.length,['opportunities']))+'</strong><span>Open opportunities</span></div><div><strong>'+esc(asOf?count(fresh.length,['signals','companies']):'—')+'</strong><span>Reviewed signals · 30d</span></div></div><p>'+(!asOf?'Set a verified reporting cutoff to calculate recent and overdue activity.':'New activity is a research lead, not evidence of outsourcing budget.')+'</p></div><div class="ct-hero-spotlight"><span class="ct-overline">LATEST REVIEWED SIGNAL</span>'+(signal?'<b>'+esc(signal.data.name)+'</b><p>'+esc(trim(signal.data.fact,150))+'</p><div class="ct-hero-foot"><span>'+esc(label('companies',signal.data.companyId))+' · '+esc(fullDate(signal.data.publishedAt))+'</span>'+btn('Review source '+ico('arrow',14),'nav:signals','ct-on-ink')+'</div>':'<b>No reviewed announcement yet</b><p>Review public sources to populate the insight queue.</p>')+'</div></div>'
 +'<div class="ct-two-columns"><section class="ct-panel ct-follow"><div class="ct-section-title"><h2>Next BD actions</h2>'+btn('Add follow-up','new:followups','ct-link',!editable)+'</div>'+followups.slice(0,6).map(r=>'<button type="button" class="ct-action-item" data-action="company:'+esc(r.data.companyId)+'"><span class="ct-date-square">'+esc(validDate(r.data.dueAt)?r.data.dueAt.slice(8):'—')+'<small>'+esc(validDate(r.data.dueAt)?showDate(r.data.dueAt).split(' ')[1]:'DATE')+'</small></span><span><b>'+esc(r.data.name)+'</b><small>'+esc(label('companies',r.data.companyId))+' · '+esc(r.data.owner)+'</small></span>'+badge(asOf&&r.data.dueAt<asOf?'Overdue':r.data.priority||'Open',asOf&&r.data.dueAt<asOf?'warn':'')+'</button>').join('')+(followups.length?'':empty('Add your first BD follow-up.'))+'<div class="ct-section-foot">'+esc(asOf?count(overdue.length,['followups']):'—')+' overdue · '+esc(sourceScope(['followups']))+'</div></section>'
 +'<section class="ct-panel ct-stage-panel"><div class="ct-section-title"><h2>Deal journey</h2><span class="ct-muted">Stage counts, not forecast</span></div><div class="ct-stage-list">'+stageList+'</div><div class="ct-stage-footer">'+btn('Open the deal board '+ico('arrow',16),'nav:opportunities','ct-outline')+'</div></section></div>'
 +'<section class="ct-panel ct-account-strip"><div class="ct-section-title"><h2>Accounts to watch</h2>'+btn('All companies '+ico('arrow',15),'nav:companies','ct-link')+'</div><div class="ct-company-tiles">'+rows('companies').filter(r=>r.data.priority==='High').slice(0,5).map(r=>'<button type="button" class="ct-account-tile" data-action="company:'+esc(r.id)+'"><span class="ct-company-mark">'+esc(initial(r.data.name))+'</span><strong>'+esc(r.data.name)+'</strong><small>'+esc(r.data.focus)+' · '+esc(r.data.phase||'Phase unknown')+'</small></button>').join('')+'</div></section>';
}
function companies(){
 const list=filteredCompanies(),p=page('companyIndex',list,8),selected=get('companies',ST.company)||p.data[0];
 const companySignals=selected?ofCompany('signals',selected.id).filter(verifiedSignal).sort((a,b)=>txt(b.data.publishedAt).localeCompare(txt(a.data.publishedAt))):[];
 const companyOpps=selected?ofCompany('opportunities',selected.id):[],companyContacts=selected?ofCompany('contacts',selected.id):[];
 return header('Company directory','A single identity for each biotech, with linked people, signals and deals.',btn(ico('plus')+' Add company','new:companies','ct-primary',!editable))+warning(['companies','contacts','signals','opportunities'])+filterBar()
 +'<div class="ct-directory"><aside class="ct-directory-index"><div class="ct-section-title"><h2>Biotech accounts</h2><span class="ct-muted">'+list.length+' loaded</span></div>'+p.data.map(r=>'<button type="button" class="ct-company-choice '+(selected?.id===r.id?'active':'')+'" data-action="company:'+esc(r.id)+'"><span class="ct-company-mark small">'+esc(initial(r.data.name))+'</span><span class="ct-company-choice-text"><b>'+esc(r.data.name)+'</b><small>'+esc(r.data.focus)+' · '+esc(r.data.country)+'</small></span>'+ico('arrow',15)+'</button>').join('')+(p.total?'':empty('No accounts yet; add a company.'))+pagination('companyIndex',p)+'</aside>'
 +'<section class="ct-company-profile">'+(selected?'<div class="ct-profile-cover"><span class="ct-overline">COMPANY INTELLIGENCE</span><div class="ct-profile-heading"><span class="ct-company-mark big">'+esc(initial(selected.data.name))+'</span><div><h2>'+esc(selected.data.name)+'</h2><p>'+esc(selected.data.focus)+' · '+esc(selected.data.country)+'</p></div></div><div class="ct-profile-pills">'+badge(selected.data.priority+' priority','accent')+badge(selected.data.phase||'Phase unverified')+badge(selected.data.sizeBand||'Size unverified')+'</div></div><div class="ct-profile-metrics"><div><b>'+esc(count(companyContacts.length,['contacts']))+'</b><span>People</span></div><div><b>'+esc(count(companyOpps.length,['opportunities']))+'</b><span>Deals</span></div><div><b>'+esc(count(companySignals.length,['signals']))+'</b><span>Reviewed signals</span></div></div><div class="ct-profile-actions">'+btn('Edit account','edit:companies:'+selected.id,'ct-primary',!editable)+btn('Add deal','new:opportunities:'+selected.id,'ct-outline',!editable)+btn('Copy','duplicate:companies:'+selected.id,'ct-ghost',!editable)+btn('Archive','archive:companies:'+selected.id,'ct-ghost danger',!editable)+'</div><div class="ct-dossier-chunks"><div><h3>Linked decision makers</h3>'+companyContacts.slice(0,5).map(r=>'<button type="button" class="ct-people-inline" data-action="contact:'+esc(r.id)+'">'+avatar(r.data.name)+'<span><b>'+esc(r.data.name)+'</b><small>'+esc(r.data.title)+'</small></span>'+ico('arrow',15)+'</button>').join('')+(companyContacts.length?'':empty('No linked contacts.'))+btn('Add contact','new:contacts:'+selected.id,'ct-link',!editable)+'</div><div><h3>Recent evidence</h3>'+companySignals.slice(0,4).map(r=>'<div class="ct-evidence-inline"><small>'+esc(fullDate(r.data.publishedAt))+' · '+esc(r.data.type)+'</small><b>'+esc(r.data.name)+'</b>'+safeHref(r.data.sourceUrl)+'</div>').join('')+(companySignals.length?'':empty('No verified signals.'))+'</div></div><div class="ct-profile-source">Company source verified '+esc(fullDate(selected.data.verifiedAt))+' · '+safeHref(selected.data.website)+'<br>Headcount is an estimate only when a dated source is recorded.</div>':'<div class="ct-empty">No companies available. Create the first account.</div>')+'</section></div>'
 +'<section class="ct-panel ct-register"><div class="ct-section-title"><h2>Complete account register</h2><span class="ct-muted">Local loaded rows · editable columns</span></div>'+table('companies',list,'companiesTable')+'</section>';
}
function contacts(){
 const list=rows('contacts').filter(searchMatch),p=page('contactIndex',list,8),who=get('contacts',ST.contact)||p.data[0],personFollowups=who?rows('followups').filter(r=>r.data.contactId===who.id):[];
 return header('Decision makers','Track professional contacts, opt-out preferences and relationship history.',btn(ico('plus')+' New contact','new:contacts','ct-primary',!editable))+warning(['contacts','companies','followups','interactions'])+filterBar()
 +'<div class="ct-contacts"><section class="ct-panel ct-contact-list"><div class="ct-section-title"><h2>People</h2><span class="ct-muted">'+list.length+' loaded</span></div>'+p.data.map(r=>'<button type="button" class="ct-contact-item '+(who?.id===r.id?'active':'')+'" data-action="contact:'+esc(r.id)+'">'+avatar(r.data.name)+'<span><strong>'+esc(r.data.name)+'</strong><small>'+esc(label('companies',r.data.companyId))+' · '+esc(r.data.title)+'</small></span>'+badge(noOutreach(r)?'No contact':r.data.status,noOutreach(r)?'warn':'')+'</button>').join('')+(p.total?'':empty('No professional contacts yet.'))+pagination('contactIndex',p)+'</section>'
 +'<section class="ct-panel ct-contact-profile">'+(who?'<div class="ct-contact-cover">'+avatar(who.data.name,'big')+'<div><span class="ct-overline">PROFESSIONAL CONTACT</span><h2>'+esc(who.data.name)+'</h2><p>'+esc(who.data.title)+' · '+esc(label('companies',who.data.companyId))+'</p></div></div><div class="ct-contact-flags">'+badge(who.data.status)+badge(noOutreach(who)?'Do not contact':'Preference not consent',noOutreach(who)?'warn':'')+'</div><dl class="ct-details"><dt>Relationship owner</dt><dd>'+esc(who.data.owner)+'</dd><dt>Contact channel</dt><dd>'+esc(who.data.channel||'Not specified')+'</dd><dt>Verified</dt><dd>'+esc(fullDate(who.data.verifiedAt))+'</dd><dt>Professional source</dt><dd>'+safeHref(who.data.sourceUrl)+'</dd><dt>Public email</dt><dd>'+esc(who.data.email||'Not recorded')+'</dd></dl><div class="ct-section-title"><h3>Follow-ups</h3>'+btn('Create reminder','new:followups:'+who.data.companyId,'ct-link',!editable)+'</div>'+personFollowups.slice(0,4).map(r=>'<div class="ct-follow-small"><b>'+esc(r.data.name)+'</b><small>'+esc(fullDate(r.data.dueAt))+' · '+esc(r.data.status)+'</small></div>').join('')+(personFollowups.length?'':empty('No follow-ups for this contact.'))+'<div class="ct-profile-actions">'+btn('Edit','edit:contacts:'+who.id,'ct-primary',!editable)+btn('Duplicate','duplicate:contacts:'+who.id,'ct-ghost',!editable)+btn('Archive','archive:contacts:'+who.id,'ct-ghost danger',!editable)+'</div>':'<div class="ct-empty">Add a contact to begin.</div>')+'</section></div>'
 +'<section class="ct-panel ct-register"><div class="ct-section-title"><h2>Contact register</h2><span class="ct-muted">Professional-only records</span></div>'+table('contacts',list,'contactsTable')+'</section>';
}
function opportunities(){
 const active=rows('opportunities').filter(r=>searchMatch(r)&&(ST.dealStage==='All'||r.data.stage===ST.dealStage));
 const grouped=stageSteps.map(stage=>[stage,active.filter(r=>r.data.stage===stage)]);
 const mini=active.filter(x=>!['Won','Lost'].includes(x.data.stage)&&!txt(x.data.nextStep));
 const select='<label class="ct-choose">Stage <select name="dealStage" data-ui-state="true" data-action="filter:dealStage"><option value="All">All stages</option>'+stageSteps.map(x=>'<option value="'+esc(x)+'" '+(ST.dealStage===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label>';
 return header('Deal pipeline','Track qualified CRO service needs from prospect to documented outcome.',btn(ico('plus')+' New deal','new:opportunities','ct-primary',!editable))+warning(['opportunities','companies'])+'<div class="ct-deal-toolbar"><span>Stage movements require a human-entered dated rationale.</span>'+select+'</div>'
 +'<section class="ct-board-wrap" aria-label="Horizontally scrollable deal pipeline"><div class="ct-board">'+grouped.map(([stage,list])=>'<div class="ct-lane"><header><span class="ct-stage-dot"></span><strong>'+esc(stage)+'</strong><small>'+esc(count(list.length,['opportunities']))+'</small></header>'+list.slice(0,4).map(r=>'<button type="button" class="ct-deal-card" data-action="opp:'+esc(r.id)+'"><span class="ct-deal-owner">'+esc(label('companies',r.data.companyId))+'</span><b>'+esc(trim(r.data.name,62))+'</b><span class="ct-deal-need">'+esc(r.data.serviceNeed)+'</span><span class="ct-deal-bottom">'+badge(r.data.qualification==='Confirmed'?'Qualified':'Needs qualification',r.data.qualification==='Confirmed'?'':'warn')+'<small>'+esc(r.data.owner)+'</small></span></button>').join('')+(list.length?'':empty('No deals at this stage'))+(list.length>4?'<div class="ct-lane-more">Showing first 4; all deals in register below</div>':'')+'</div>').join('')+'</div></section>'
 +'<div class="ct-deal-bottom-grid"><section class="ct-panel"><div class="ct-section-title"><h2>Opportunity detail</h2><span class="ct-muted">Select a card to inspect</span></div>'+(get('opportunities',ST.opp)?(()=>{let d=get('opportunities',ST.opp);return '<h3>'+esc(d.data.name)+'</h3><p class="ct-text">'+esc(label('companies',d.data.companyId))+' · '+esc(d.data.serviceNeed)+'</p><div class="ct-brief-chips">'+badge(d.data.stage)+badge(d.data.qualification)+'</div><p class="ct-text">Next: '+esc(d.data.nextStep||'Not set')+' · '+esc(fullDate(d.data.nextDue))+'</p><div class="ct-profile-actions">'+btn('Edit stage / next step','edit:opportunities:'+d.id,'ct-primary',!editable)+btn('Duplicate','duplicate:opportunities:'+d.id,'ct-outline',!editable)+btn('Archive','archive:opportunities:'+d.id,'ct-ghost danger',!editable)+'</div>';})():'<div class="ct-empty">Select a deal.</div>')+'</section><section class="ct-panel"><div class="ct-section-title"><h2>Pipeline discipline</h2></div><div class="ct-guidance"><span>01</span><div><b>Qualify explicitly</b><p>Funding or trial news alone is not a CRO outsourcing mandate.</p></div></div><div class="ct-guidance"><span>02</span><div><b>Record stage evidence</b><p>Move a deal only with dated rationale and a reviewed proposal.</p></div></div><div class="ct-guidance"><span>03</span><div><b>Separate currencies</b><p>Estimated amounts are never summed across currencies.</p></div></div></section></div>'
 +'<section class="ct-panel ct-register"><div class="ct-section-title"><h2>Full deal register</h2><span class="ct-muted">Paged loaded records · includes all board stages</span></div>'+table('opportunities',active,'opportunitiesTable')+'</section>';
}
function signals(){
 const list=rows('signals').filter(r=>searchMatch(r)&&(ST.signalType==='All'||r.data.type===ST.signalType)).sort((a,b)=>txt(b.data.publishedAt).localeCompare(txt(a.data.publishedAt)));
 const p=page('signalFeed',list,9);const types_=['Funding','Trial start','Regulatory','Hiring','Partnership','Other'];
 const tabs='<div class="ct-signal-filters">'+['All',...types_].map(k=>btn(k,'filterchip:'+k,'ct-chip '+(ST.signalType===k?'selected':''))).join('')+'</div>';
 return header('Client signals','Validate announcements before turning them into prospective CRO work.',btn(ico('plus')+' Add signal','new:signals','ct-primary',!editable))+warning(['signals','companies'])+tabs
 +'<div class="ct-signal-grid"><section class="ct-signal-feed">'+p.data.map(r=>'<article class="ct-signal-card"><div class="ct-signal-time"><span>'+esc(fullDate(r.data.publishedAt))+'</span><span class="ct-signal-line"></span></div><div class="ct-signal-content"><div class="ct-signal-tags">'+badge(r.data.type,'accent')+badge(r.data.status,r.data.status==='Reviewed'?'positive':'warn')+'<span>'+esc(label('companies',r.data.companyId))+'</span></div><h2>'+esc(r.data.name)+'</h2><p class="ct-fact"><strong>FACT</strong> '+esc(trim(r.data.fact,280))+'</p><p class="ct-interpret"><strong>INTERPRETATION</strong> '+esc(trim(r.data.interpretation||'Not assessed; no automatic outsourcing inference.',260))+'</p><div class="ct-signal-actions"><span>'+esc(r.data.reviewer?'Reviewed by '+r.data.reviewer:'Pending human review')+'</span>'+safeHref(r.data.sourceUrl)+btn('Edit','edit:signals:'+r.id,'ct-outline',!editable)+btn('Consider deal','new:opportunities:'+r.data.companyId,'ct-outline',!editable)+'</div></div></article>').join('')+(p.total?'':empty('No signals in this loaded filter.'))+pagination('signalFeed',p)+'</section>'
 +'<aside class="ct-signal-rail"><div class="ct-rail-dark"><span class="ct-overline">SOURCE DISCIPLINE</span><h2>Facts first. Fit second.</h2><p>Record the announcement and source as evidence. Assess CRO relevance separately and review before converting it into a deal.</p><div class="ct-rail-number">'+esc(count(dedupedReviewed().length,['signals','companies']))+'<span>unique reviewed events</span></div></div><div class="ct-panel ct-rail-panel"><h3>Signal handling</h3><div class="ct-guidance"><span>01</span><div><b>Collect</b><p>Company, original URL and published date.</p></div></div><div class="ct-guidance"><span>02</span><div><b>Verify</b><p>Identify one event even when many outlets repeat it.</p></div></div><div class="ct-guidance"><span>03</span><div><b>Qualify</b><p>Discuss potential outsourcing needs with the account owner.</p></div></div></div></aside></div>'
 +'<section class="ct-panel ct-register"><div class="ct-section-title"><h2>Signal ledger</h2><span class="ct-muted">All loaded entries, including candidates and rejected items</span></div>'+table('signals',list,'signalsTable')+'</section>';
}
function monitoring(){
 const actual=rows('runs').sort((a,b)=>txt(b.data.windowEnd).localeCompare(txt(a.data.windowEnd)));
 const verifiedComplete=actual.filter(r=>r.data.status==='Completed'&&txt(r.data.runReceipt)&&validDate(r.data.completedAt));
 const recipe='For CR06 Client Signals & CRM, inspect only authorized current company, signal and opportunity records for the chosen '+txt(ST.watchRegion)+' region, watchlist '+(txt(ST.watchCompanies)||'(authorized current list)')+', event topics '+txt(ST.watchTopics)+' and source cutoff '+(validDate(ST.watchSince)?ST.watchSince:'approved by owner at execution')+'. Search publicly verifiable company releases and official trial registries, preserving source URLs, original publication date, observation date and separate CRO-relevance interpretation. Deduplicate by company, event type, source URL and publication date; never infer CRO budget, sponsor procurement intent or contact consent. List fresh candidate findings with identity/confidence caveats for human review; never contact companies or update approved records without explicit authorized proposal. If evidence or table reads are partial, say coverage is partial and never output no_update as if absence were complete. Stop after user-defined expiry; activity must be verified from platform run receipts and logs.';
 return header('Signal monitoring','Define the research scope; enable recurring work only through the platform Automations page.',btn('Show research instructions','toggle-recipe','ct-outline'))+warning(['companies','signals','runs'])
 +'<div class="ct-monitor-grid"><section class="ct-panel ct-monitor-setup"><div class="ct-section-title"><h2>Research brief</h2><span class="ct-muted">Draft only · not a scheduled task</span></div><div class="ct-watch-form"><label>Market / geography<input name="watchRegion" data-ui-state="true" data-action="watch:watchRegion" value="'+esc(ST.watchRegion)+'"></label><label>Events to watch<textarea rows="2" name="watchTopics" data-ui-state="true" data-action="watch:watchTopics">'+esc(ST.watchTopics)+'</textarea></label><label>Priority companies / exclusions<textarea rows="2" name="watchCompanies" data-ui-state="true" data-action="watch:watchCompanies" placeholder="Optional named companies or excluded domains">'+esc(ST.watchCompanies)+'</textarea></label><label>Earliest publication date<input type="date" name="watchSince" data-ui-state="true" data-action="watch:watchSince" value="'+esc(ST.watchSince)+'"></label></div><div class="ct-watch-actions">'+btn('Show ChatGPT research recipe '+ico('arrow',16),'toggle-recipe','ct-primary')+'<span>Activation is managed by the host after app save and user approval.</span></div>'+(ST.showRecipe?'<div class="ct-recipe" role="region" aria-label="Research recipe"><h3>Proposed research instructions</h3><p>'+esc(recipe)+'</p><small>Copy these into an explicitly approved platform ChatGPT monitoring definition. No task is active merely because this text is displayed.</small></div>':'')+'</section>'
 +'<aside class="ct-monitor-rail"><div class="ct-monitor-night"><div class="ct-beam"></div><span class="ct-overline">RESEARCH CONTROL</span><h2>No scheduler is activated by this template.</h2><p>Use the platform Automations page to create a reviewed recurring ChatGPT research rule after confirming access, cadence and expiry.</p><div class="ct-monitor-proof"><strong>'+esc(count(verifiedComplete.length,['runs']))+'</strong><span>recorded completed batches with receipt</span></div></div><section class="ct-panel ct-monitor-caveats"><h3>Before enabling</h3><p>Confirm sources, recipient permissions, deduplication window, expiry date and the handling of partial results. Email notifications, if requested, run separately through the platform.</p></section></aside></div>'
 +'<section class="ct-panel ct-register"><div class="ct-section-title"><h2>Observed research history</h2>'+btn(ico('plus')+' Record run','new:runs','ct-outline',!editable)+'</div>'+table('runs',actual,'runsTable')+'</section>';
}
function reports(){
 const all=rows('companies'),sel=get('companies',ST.company)||all[0],ref=sel?dedupedReviewed().filter(r=>r.data.companyId===sel.id).sort((a,b)=>txt(b.data.publishedAt).localeCompare(txt(a.data.publishedAt))):[];
 const saved=sel?rows('reports').filter(r=>r.data.companyId===sel.id):[];
 const selector='<label class="ct-choose">Company <select name="company-select" data-ui-state="true" data-action="company-select">'+all.map(x=>'<option value="'+esc(x.id)+'" '+(sel?.id===x.id?'selected':'')+'>'+esc(x.data.name)+'</option>').join('')+'</select></label>';
 return header('Account briefings','Build source-cited CRO account intelligence with a distinct fact-versus-hypothesis review.',btn(ico('plus')+' New brief','new:reports:'+esc(sel?.id||''),'ct-primary',!editable))+warning(['companies','signals','opportunities','reports'])
 +'<div class="ct-account-toolbar">'+selector+'<span>Report cutoff from saved source records, not a live API.</span></div>'
 +'<div class="ct-brief-layout"><section class="ct-brief-paper">'+(sel?'<div class="ct-brief-top"><span class="ct-overline">CRO / ACCOUNT DOSSIER</span><span>'+esc(asOf?'As of '+showDate(asOf):'Reporting cutoff not set')+'</span></div><div class="ct-brief-title"><span class="ct-company-mark big">'+esc(initial(sel.data.name))+'</span><div><h2>'+esc(sel.data.name)+'</h2><p>'+esc(sel.data.focus)+' · '+esc(sel.data.phase||'Phase unknown')+' · '+esc(sel.data.country)+'</p></div></div><div class="ct-brief-divider"></div><div class="ct-brief-split"><div><span class="ct-overline">VERIFIED ANNOUNCEMENTS</span><strong>'+esc(count(ref.length,['signals','companies']))+'</strong><p>Distinct reviewed source events linked to this company.</p></div><div><span class="ct-overline">ACTIVE OPPORTUNITIES</span><strong>'+esc(count(ofCompany('opportunities',sel.id).filter(r=>!['Won','Lost'].includes(r.data.stage)).length,['opportunities']))+'</strong><p>Recorded CRO work, not inferred from the signal feed.</p></div></div><h3>Evidence timeline</h3>'+ref.slice(0,6).map(r=>'<div class="ct-brief-evidence"><span>'+esc(fullDate(r.data.publishedAt))+'</span><div><b>'+esc(r.data.name)+'</b><p>'+esc(trim(r.data.fact,120))+'</p>'+safeHref(r.data.sourceUrl)+'<small>Signal '+esc(r.id)+'@'+esc(r.version)+'</small></div></div>').join('')+(ref.length?'':empty('No verified signals. The brief remains a draft until evidence is reviewed.'))+'<div class="ct-brief-rule"><strong>Commercial hypothesis</strong><p>Discuss whether the announced development creates outsourcing demand. Funding, hiring, or a clinical milestone alone does not confirm a CRO budget.</p></div>':'<div class="ct-empty">Add a company to begin an account dossier.</div>')+'</section>'
 +'<aside class="ct-brief-side"><section class="ct-panel"><div class="ct-section-title"><h2>Saved account briefings</h2>'+btn('Add','new:reports:'+esc(sel?.id||''),'ct-link',!editable)+'</div>'+saved.map(r=>'<div class="ct-report-card"><div>'+badge(reportStatus(r),reportStatus(r)==='Reviewed'?'positive':'warn')+'<span>'+esc(r.data.periodStart)+' – '+esc(r.data.periodEnd)+'</span></div><h3>'+esc(r.data.name)+'</h3><p>'+esc(trim(r.data.facts,110))+'</p>'+actions('reports',r)+'</div>').join('')+(saved.length?'':empty('No saved briefings. Create a draft and cite exact signal IDs@versions.'))+'</section><section class="ct-panel"><h3>ChatGPT handoff</h3><p>Summarize the authorized company record, verified source timeline and separately documented CRO service-fit hypothesis. Include each URL, publication date, review state and source record version.</p><p class="ct-muted">A reviewed briefing needs complete source coverage and reviewer approval. No automatic outbound contact.</p></section></aside></div>'
 +'<section class="ct-panel ct-register"><div class="ct-section-title"><h2>Briefing archive</h2><span class="ct-muted">Version-aware, human-reviewed narratives</span></div>'+table('reports',rows('reports'),'reportsTable')+'</section>';
}
function inputField(role,f,d){
 let val=d[f.key];if(val==null)val='';const locked=!editable||!mapping[role]?.fields[f.key]||!mapping[role]?.writable.has(f.key);const common=(locked?' disabled ':'')+' name="'+esc(f.key)+'" data-ui-state="true" data-action="field:'+esc(f.key)+'" ';
 let control='';if(f.kind==='long')control='<textarea rows="3"'+common+'>'+esc(val)+'</textarea>';
 else if(f.kind==='select')control='<select'+common+'><option value="">Choose</option>'+f.options.map(x=>'<option value="'+esc(x)+'" '+(x===val?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select>';
 else if(f.kind==='ref'){const opts=rows(f.parent);control='<select'+common+'><option value="">Select '+esc(f.parent)+'</option>'+opts.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===val?'selected':'')+'>'+esc(trim(x.data.name,55))+'</option>').join('')+'</select>';}
 else if(f.kind==='boolean')control='<select'+common+'><option value="false" '+([false,'false',''].includes(val)?'selected':'')+'>No</option><option value="true" '+([true,'true'].includes(val)?'selected':'')+'>Yes</option></select>';
 else control='<input type="'+(f.kind==='date'?'date':f.kind==='number'?'number':'text')+'" '+common+'value="'+esc(val)+'"'+(f.kind==='number'?' step="any"':'')+'>';
 return '<label class="ct-field"><span>'+esc(f.label)+(locked?' (read only)':'')+(f.required?' <em>*</em>':'')+'</span>'+control+'</label>';
}
function editor(){const ed=ST.editor;if(!ed)return '';return '<div class="ct-overlay"><aside class="ct-drawer" role="dialog" aria-modal="true" aria-label="Reviewed record editor"><div class="ct-drawer-head"><div><span class="ct-overline">REVIEWED DATA CHANGE</span><h2>'+esc(ed.mode==='edit'?'Edit '+roleSingular[ed.role]:ed.mode==='copy'?'Copy '+roleSingular[ed.role]:'New '+roleSingular[ed.role])+'</h2><p>Proposals are reviewed by the workspace. This drawer does not save records directly.</p></div>'+btn(ico('close'),'cancel-editor','ct-icon',false,'Close editor')+'</div><form class="ct-form" data-editor="true" data-action="save-editor"><div class="ct-fields">'+SCHEMA[ed.role].filter(f=>f.key!=='archived').map(f=>inputField(ed.role,f,ed.draft)).join('')+'</div>'+(ed.error?'<p class="ct-error" role="alert">'+esc(ed.error)+'</p>':'')+'<div class="ct-drawer-footer"><button type="submit" class="ct-btn ct-primary" '+(!editable?'disabled':'')+'>Propose for review</button>'+btn('Cancel','cancel-editor','ct-outline')+'</div></form></aside></div>';}
function archiveDialog(){if(!ST.archive)return '';const {role,id}=ST.archive;return '<div class="ct-overlay ct-confirm-overlay"><section class="ct-confirm" role="alertdialog" aria-modal="true"><span class="ct-overline">REVIEWED ARCHIVE</span><h2>Archive this record?</h2><p>'+esc(label(role,id))+' will only be proposed for soft archive. Existing linked children and permission limits must be checked before submission.</p><div>'+btn('Cancel','cancel-archive','ct-outline')+btn('Propose archive','confirm-archive','ct-danger',!editable)+'</div></section></div>';}

function backendRead(role){
 const key='backend-'+role,limit=Math.max(10,Math.min(50,Number(cfg.pageSize)||20));let at=Math.max(0,Number(ST.pages[key])||0);const cacheKey=role+':'+at;if(backendCache[cacheKey])return backendCache[cacheKey];let result={rows:[],total:null,at,max:0};
 const m=mapping[role];if(!m||SCHEMA[role].some(f=>!m.fields[f.key]))return backendCache[cacheKey]=result;
 try{let out=tools.call('records.read',{typeId:m.typeId,offset:at*limit,limit});if(!out||out.unavailable||!Number.isInteger(out.total)||out.total<0||!Array.isArray(out.rows))return backendCache[cacheKey]=result;
 const max=Math.max(0,Math.ceil(out.total/limit)-1);if(at>max){at=max;ST.pages[key]=at;out=tools.call('records.read',{typeId:m.typeId,offset:at*limit,limit});}
 if(!out||out.unavailable||!Array.isArray(out.rows)||!Number.isInteger(out.total)||out.rows.length!==Math.min(limit,Math.max(0,out.total-at*limit)))return backendCache[cacheKey]=result;
 const normalized=out.rows.map(r=>{if(!r.id||!Number.isInteger(r.version)||!r.data)throw Error('Invalid record');const data={};for(const f of SCHEMA[role]){const v=r.data[m.fields[f.key]];if(v!==null&&typeof v==='object'||f.required&&(v===undefined||v===null||v===''))throw Error('Invalid field');data[f.key]=v;}return {...r,data};});
 result={rows:normalized.filter(r=>r.data.archived!==true&&r.data.archived!=='true'),total:out.total,at,max};
 }catch{}return backendCache[cacheKey]=result;
}
function backendRegisters(){const byTab={overview:['followups','interactions'],companies:['companies'],contacts:['contacts'],opportunities:['opportunities'],signals:['signals'],monitor:['runs'],reports:['reports']};const selected=byTab[ST.tab]||[];const show=ST.registers||selected.some(r=>!complete([r]));return '<section class="ct-panel ct-register">'+btn(show?'Hide full registers':'Browse full registers','toggle-registers','ct-outline')+(show?warning(selected)+'<p>Backend pages include all source records; archived rows are hidden. These registers are unfiltered. Analytical views and protected edits require complete source coverage.</p>'+selected.map(role=>{const p=backendRead(role),cols=layout.cols[role].filter(k=>visible(role+':'+k));return '<h2>'+esc(roleLabels[role])+'</h2><div class="ct-table-wrap" role="region" aria-label="'+esc(role)+' backend register"><table><thead><tr>'+cols.map(k=>'<th>'+esc(TABLE[role][k].label)+'</th>').join('')+'<th>Actions</th></tr></thead><tbody>'+p.rows.map(r=>'<tr>'+cols.map(k=>'<td>'+fieldShown(role,k,r)+'</td>').join('')+'<td>'+actions(role,r)+'</td></tr>').join('')+'</tbody></table></div>'+(p.total===null?'<p>Source unavailable; total unknown.</p>':'<div class="ct-page"><span>Page '+(p.at+1)+' of '+(p.max+1)+' · '+p.total+' source records</span><div>'+btn('Previous','page:backend-'+role+':-1','ct-ghost',p.at===0)+btn('Next','page:backend-'+role+':1','ct-ghost',p.at>=p.max)+'</div></div>');}).join(''):'')+'</section>';}

const currentTitle=navNames[ST.tab]||'Sales overview';
const navIcons={overview:'home',companies:'companies',contacts:'contacts',opportunities:'opportunities',signals:'signals',monitor:'monitor',reports:'reports'};
const sidebar='<aside class="ct-side"><div class="ct-brand-title">'+esc(layout.heading)+'</div><div class="ct-side-label">WORKSPACE</div><nav class="ct-nav" aria-label="Client Signals CRM screens">'+nav.map(tab=>btn('<span class="ct-nav-ico">'+ico(navIcons[tab],18)+'</span><span class="ct-nav-label">'+esc(navNames[tab])+'</span><span class="ct-nav-mobile">'+esc(navShort[tab])+'</span>','nav:'+tab,'ct-nav-item '+(ST.tab===tab?'active':''))).join('')+'</nav><div class="ct-side-bottom">'+btn(ico('gear',16)+'<span> Layout</span>','tracker:layout','ct-layout')+'</div></aside>';
let screens={overview,companies,contacts,opportunities,signals,monitoring,reports};
const renderFn=ST.tab==='monitor'?monitoring:screens[ST.tab]||overview;
const html='<div class="ct-app">'+sidebar+'<main class="ct-main">'+(ST.notice?'<div class="ct-notice" role="status">'+esc(ST.notice)+btn(ico('close'),'close-notice','ct-icon',false,'Dismiss')+'</div>':'')+renderFn()+backendRegisters()+'</main></div>'+editor()+archiveDialog();
return {html,css:CLIENT_CSS,state:ST};
