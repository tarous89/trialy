'use trialagents v2';
const appCommands=[{"id":"overview.read","label":"Read the Overview: programs, next milestones, decisions and items awaiting owner approval","mode":"read","input":{"type":"object","properties":{},"additionalProperties":false}},{"id":"plan.read","label":"Read the plan with forecast dates and budgets, dependencies and risk exposure","mode":"read","input":{"type":"object","properties":{"program_id":{"type":"string","format":"uuid"}},"additionalProperties":false}},{"id":"events.read","label":"Read deliverables, risks and changes with the plan items they affect","mode":"read","input":{"type":"object","properties":{"event_type":{"type":"string","enum":["Deliverable","Risk","Change"]}},"additionalProperties":false}},{"id":"digest.read","label":"Read the current weekly or monthly digest","mode":"read","input":{"type":"object","properties":{"kind":{"type":"string","enum":["Weekly","Monthly"]},"program_id":{"type":"string","format":"uuid"}},"additionalProperties":false}}];
/*
 * Pipeline 1.0.0 (life.pipeline): the platform version of the standalone Pipeline prototype (prototypes/pipeline).
 * A portfolio planner that connects programs, milestones, activities and decisions with their deliverables, risks
 * and changes. Same screens, workflows and rules as the prototype; what changes is where things live:
 *  - records are TrialAgents tables (pipeline.items, pipeline.events; organizations and people are the shared core
 *    tables), saved at once with records.save from a person's own click or form, not browser storage;
 *  - files are TrialAgents documents (platform upload), not browser data URLs;
 *  - completion approval uses the platform account: who pressed Approve is in the record history, so the app has no
 *    identity check, sign-in or user list of its own;
 *  - Settings holds only app settings (currency and date format), for the app's owners; the prototype's per-person
 *    email switches are gone (it never sent email);
 *  - the Digest is built from the records (this week or this month) and can be saved to the archive, instead of the
 *    prototype's prepared example reports.
 * The platform draws the header, messages and approval footer.
 */
const cfg=typeof templateConfiguration==='object'&&templateConfiguration?templateConfiguration:{};
const bindings=Array.isArray(templateBindings)?templateBindings:[];
const inp=input||{},event=inp.event||{},action=String(event.action||''),evKind=String(event.kind||'open');
const E=kit.esc,has=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
const str=v=>v==null?'':String(v);
const num=v=>v===''||v==null||!Number.isFinite(Number(v))?null:Number(v);
const validDate=v=>{const s=str(v).slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:'';};
const cmp=(a,b)=>str(a).localeCompare(str(b));
const split=v=>[...new Set(str(v).split(',').map(x=>x.trim()).filter(Boolean))];
const parseJSON=(v,d)=>{try{const x=JSON.parse(str(v));return x==null?d:x;}catch(e){return d;}};

/* ---------- vocabulary (the prototype's) ---------- */
const TYPES=['Program','Milestone','Activity','Decision'],EVENT_TYPES=['Deliverable','Risk','Change'];
const STATUSES=['Planned','In progress','Pending','On hold','Completed','Cancelled'];
const STAGES=['Discovery','Preclinical','Phase 1','Phase 2','Phase 3'];
const OUTCOMES=['Approved','Conditional','No-go'],LEVELS=['None','Low','Medium','High'];
const FORMATS=['Decision','Document','Information','Email','Other'];
const CURRENCIES=['EUR','USD','GBP','CHF','CAD','AUD','JPY'],DATE_FORMATS=['D MMM','DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD'];
const COLORS={Program:'#3354ac',Milestone:'#077862',Activity:'#7852b2',Decision:'#a27605'},GLYPH={Program:'▰',Milestone:'⚑',Activity:'▬',Decision:'◆'};
const point=t=>t==='Decision'||t==='Milestone';
const aux=r=>!!r&&EVENT_TYPES.includes(r.type);

/* ---------- roles and bindings (real keys come from tableMap) ---------- */
const S={
 items:['name','item_type','parent_id','parent_rule','parent_outcome','description','asset','disease','stage','start_date','end_date','earliest_date','latest_date','owner','status','decision_outcome','budget','spend','reserve','team','organization_ids','files','approved_on','approved_owner','client_ref','archived'],
 events:['name','event_type','item_ids','description','event_date','owner','team','organization_ids','signoff','format','severity','risk_status','place','forecasts','files','client_ref','archived'],
 organizations:['name','archived'],
 people:['name','organization_id','archived'],
 digests:['title','kind','period_start','period_end','program_id','contents','saved_on','archived'],
 settings:['currency','date_format']
};
const ROLE_KEY={items:'pipeline.items',events:'pipeline.events',organizations:'organizations',people:'people',digests:'pipeline.digests',settings:'pipeline.settings'};
let mapping={};try{mapping=JSON.parse(cfg.tableMap||'{}')||{};}catch(e){mapping={};}
const roleMap={};
for(const role of Object.keys(S)){
 const m=mapping[ROLE_KEY[role]],b=m&&bindings.find(x=>x.typeId===m.typeId);if(!m||!b)continue;
 const fields={};for(const k of S[role]){const real=m.fields&&typeof m.fields[k]==='string'?m.fields[k]:k;if((b.fields||[]).includes(real))fields[k]=real;}
 roleMap[role]={typeId:m.typeId,fields,writable:(Array.isArray(m.writableFields)?m.writableFields:[]).filter(k=>fields[k])};
}
const OWNER=inp.appRole===undefined||inp.appRole==='owner';
const canWrite=role=>!!inp.saved&&!!inp.writable&&cfg.readOnly!==true&&inp.appRole!=='viewer'&&!!roleMap[role]&&roleMap[role].writable.length>0;
const toReal=(role,data)=>{const m=roleMap[role],out={};for(const [k,v] of Object.entries(data))if(m.fields[k]&&m.writable.includes(k))out[m.fields[k]]=v;return out;};

/* ---------- state and working context ---------- */
const st=JSON.parse(JSON.stringify(inp.state||{}));
const SCREENS=[['overview','Overview'],['programs','Programs'],['timeline','Timeline'],['deliverables','Deliverables'],['risks','Risks'],['changes','Changes'],['digest','Digest'],['settings','Settings']];
const ctx=inp.context&&typeof inp.context==='object'?inp.context:{};
if(!st.screen)st.screen=SCREENS.some(s=>s[0]===ctx.screen)?ctx.screen:'overview';
if(!st.filters||typeof st.filters!=='object')st.filters=typeof ctx.program==='string'&&ctx.program?{program:ctx.program}:{};
if(!Array.isArray(st.collapsed))st.collapsed=[];
if(!st.digest||typeof st.digest!=='object')st.digest={mode:'All',program:'',pick:''};
let NOTICE=null;const note=(k,m)=>{NOTICE=kit.notice(k,str(m).slice(0,290));};
const REGISTER={deliverables:'Deliverable',risks:'Risk',changes:'Change'};
if(action.startsWith('nav:')&&evKind!=='command'){const id=action.slice(4);if(SCREENS.some(s=>s[0]===id)){
 const plan=['programs','timeline'];if(!(plan.includes(st.screen)&&plan.includes(id)))st.filters={};
 st.screen=id;st.panel=null;st.sel='';st.more=false;}}

/* ---------- reads: the whole plan, in batched pages ---------- */
const PAGE=100,MAX_PAGES=10;let callsLeft=80,batchReads=true;const R={};
function readBatch(reads){const out=[];
 for(let i=0;i<reads.length;i+=12){const part=reads.slice(i,i+12);let got=null;
  if(batchReads&&part.length>1){try{const r=tools.call('records.readMany',{reads:part});if(r&&Array.isArray(r.results)&&r.results.length===part.length)got=r.results;}catch(e){got=null;}if(!got)batchReads=false;}
  if(!got)got=part.map(q=>{try{return tools.call('records.read',q);}catch(e){return {unavailable:true};}});
  out.push(...got);}
 return out;}
const blank=why=>({rows:[],total:0,complete:why==='notRead',unavailable:false,unbound:why==='unbound',notRead:why==='notRead',pending:false});
function loadRoles(list){
 const todo=[...new Set(list)].filter(r=>!R[r]);for(const r of todo)if(!roleMap[r])R[r]=blank('unbound');
 const acc={};for(const r of todo.filter(r=>roleMap[r]))acc[r]={rows:[],next:0,total:null,pages:0,done:false,unavailable:false,pending:false,truncated:false};
 let open=Object.keys(acc);
 while(open.length){const reqs=[];
  for(const r of open){const a=acc[r],left=a.total===null?1:Math.min(Math.ceil((a.total-a.next)/PAGE),MAX_PAGES-a.pages);for(let k=0;k<left;k++)reqs.push({role:r,offset:a.next+k*PAGE});}
  if(reqs.length>callsLeft){for(const q of reqs.slice(callsLeft))acc[q.role].truncated=true;reqs.length=Math.max(0,callsLeft);}
  if(!reqs.length)break;callsLeft-=reqs.length;
  const res=readBatch(reqs.map(q=>({typeId:roleMap[q.role].typeId,limit:PAGE,offset:q.offset,filters:{}})));
  reqs.forEach((q,i)=>{const a=acc[q.role],p=res[i];if(a.done)return;
   if(p&&p.pending){a.pending=true;a.done=true;return;}
   if(!p||p.unavailable){a.unavailable=true;a.done=true;return;}
   const chunk=Array.isArray(p.rows)?p.rows:[],m=roleMap[q.role];a.total=num(p.total);a.pages++;
   for(const row of chunk){const data={};for(const [k,real] of Object.entries(m.fields))if(has(row.data,real)){const v=row.data[real];if(v!==null&&typeof v==='object')continue;data[k]=v;}a.rows.push({id:String(row.id),version:row.version,data});}
   a.next=q.offset+chunk.length;
   if(a.total!==null&&a.next>=a.total||chunk.length<PAGE)a.done=true;else if(a.pages>=MAX_PAGES){a.truncated=true;a.done=true;}});
  open=open.filter(r=>!acc[r].done&&!acc[r].truncated);
 }
 for(const [r,a] of Object.entries(acc))R[r]={rows:a.rows.filter(x=>x.data.archived!==true&&x.data.archived!=='true'),total:a.total===null?a.rows.length:a.total,complete:!a.pending&&!a.unavailable&&!a.truncated,unavailable:a.unavailable,unbound:false,notRead:false,pending:a.pending};
}
const wantPeople=evKind==='command'?false:!!st.panel||/^(?:rec|new|note|section|add|org)/.test(action)||action==='form:save';
loadRoles(['items','events','settings'].concat(wantPeople?['organizations','people']:[],st.screen==='digest'||/^digest/.test(action)||evKind==='command'?['digests']:[]));
for(const r of Object.keys(S))if(!R[r])R[r]=blank('notRead');
const PENDING=['items','events','settings','organizations','people','digests'].some(r=>R[r].pending);
const problems=[];
for(const [role,label] of [['items','plan item'],['events','event']]){const r=R[role];if(r.pending)continue;
 if(r.unbound)problems.push('The '+label+' table is not connected to this app.');
 else if(r.unavailable)problems.push('You cannot read the '+label+' table.');
 else if(!r.complete)problems.push('Only part of the '+label+' table could be read; counts, risk exposure and forecasts may be incomplete.');}

/* ---------- settings (app settings, owners only) ---------- */
const SET_ROW=R.settings.rows[0]||null,SET=SET_ROW?SET_ROW.data:{};
const CURRENCY=CURRENCIES.includes(SET.currency)?SET.currency:'EUR',DATE_FORMAT=DATE_FORMATS.includes(SET.date_format)?SET.date_format:'D MMM';
const SYMBOL={EUR:'€',USD:'US$',GBP:'£',CHF:'CHF ',CAD:'CA$',AUD:'A$',JPY:'JP¥'};
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],LONG_MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
// The prototype's Intl format (en-GB, 0–2 decimals), written out: the app engine has no Intl.
function money(v){if(v==null||v==='')return '—';const n=Number(v);if(!Number.isFinite(n))return '—';
 let s=Math.abs(n).toFixed(CURRENCY==='JPY'?0:2);if(s.includes('.'))s=s.replace(/0+$/,'').replace(/\.$/,'');
 const [i,f]=s.split('.');return (n<0?'-':'')+SYMBOL[CURRENCY]+i.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(f?'.'+f:'');}
function date(v){const d=validDate(v);if(!d)return '—';const [y,m,day]=d.split('-');
 if(DATE_FORMAT==='YYYY-MM-DD')return d;if(DATE_FORMAT==='DD/MM/YYYY')return [day,m,y].join('/');if(DATE_FORMAT==='MM/DD/YYYY')return [m,day,y].join('/');
 return Number(day)+' '+MONTHS[Number(m)-1];}
const CLOCK=(()=>{try{return validDate(new Date().toISOString());}catch(e){return '';}})();
const AS_OF=validDate(cfg.asOfOverride)||CLOCK;
const dayNo=d=>Math.round(Date.UTC(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8,10))/86400000);
const addDays=(d,n)=>new Date((dayNo(d)+n)*86400000).toISOString().slice(0,10);

/* ---------- the plan as the prototype's records ---------- */
const parseFiles=v=>{const l=parseJSON(v,[]);return Array.isArray(l)?l.filter(f=>f&&typeof f.v==='string').map(f=>({v:f.v,n:str(f.n||'Document')})).slice(0,50):[];};
const ITEMS=R.items.rows.map(row=>{const d=row.data,type=TYPES.includes(d.item_type)?d.item_type:'Activity',end=validDate(d.end_date);
 return {id:row.id,version:row.version,type,name:str(d.name),parents:d.parent_id&&type!=='Program'?[str(d.parent_id)]:[],parentRule:['start','finish'].includes(d.parent_rule)?d.parent_rule:'',parentOutcome:OUTCOMES.includes(d.parent_outcome)?d.parent_outcome:'Approved',
  description:str(d.description),asset:str(d.asset),disease:str(d.disease),stage:STAGES.includes(d.stage)?d.stage:'',start:point(type)?end:validDate(d.start_date),end,early:validDate(d.earliest_date),late:validDate(d.latest_date),
  owner:str(d.owner),status:STATUSES.includes(d.status)?d.status:'Planned',decisionResult:OUTCOMES.includes(d.decision_outcome)?d.decision_outcome:'',budget:num(d.budget),spend:num(d.spend),reserve:num(d.reserve),
  members:split(d.team),orgIds:split(d.organization_ids),files:parseFiles(d.files),approved:validDate(d.approved_on)?{by:str(d.approved_owner),date:validDate(d.approved_on)}:null,ref:str(d.client_ref)};});
const EVENTS=R.events.rows.map(row=>{const d=row.data,type=EVENT_TYPES.includes(d.event_type)?d.event_type:'Change',end=validDate(d.event_date),fc=parseJSON(d.forecasts,{});
 return {id:row.id,version:row.version,type,name:str(d.name),parents:split(d.item_ids),description:str(d.description),start:end,end,owner:str(d.owner),members:split(d.team),orgIds:split(d.organization_ids),
  signoff:str(d.signoff),format:FORMATS.includes(d.format)?d.format:'',severity:LEVELS.slice(1).includes(d.severity)?d.severity:'',status:type==='Risk'?(d.risk_status==='Closed'?'Closed':'Open'):'',place:str(d.place),
  forecasts:fc&&typeof fc==='object'&&!Array.isArray(fc)?fc:{},files:parseFiles(d.files),ref:str(d.client_ref)};});
let data=ITEMS.concat(EVENTS),IDX=new Map(data.map(x=>[x.id,x])),FC=new Map();
const get=id=>IDX.get(id);
function withData(list,fn){const p=[data,IDX,FC];data=list;IDX=new Map(list.map(x=>[x.id,x]));FC=new Map();try{return fn();}finally{[data,IDX,FC]=p;}}
const plans=()=>data.filter(x=>!aux(x));
function ancestry(r,seen=new Set()){if(!r||seen.has(r.id))return [];seen.add(r.id);return [r.id,...r.parents.flatMap(id=>ancestry(get(id),seen))];}
const programOf=r=>ancestry(r).map(get).filter(x=>x&&x.type==='Program');
const childrenOf=r=>r&&r.id?data.filter(x=>!aux(x)&&x.parents[0]===r.id):[];
/* A dependency is the child's rule on its parent: the child must complete before the parent can start or complete. */
const effective=r=>childrenOf(r).filter(x=>x.parentRule).map(x=>({id:x.id,to:x.parentRule,outcome:x.parentOutcome||'Approved'}));
function met(d){const p=get(d.id);return !!p&&p.status==='Completed'&&(p.type!=='Decision'||(p.decisionResult||'Approved')===(d.outcome||'Approved'));}
function onlyDecision(r){const missing=effective(r).filter(d=>!met(d));return missing.length?missing.every(d=>(get(d.id)||{}).type==='Decision'):r.type==='Decision';}
const evidence=r=>data.some(x=>x.type==='Deliverable'&&x.parents.includes(r.id));
const ready=r=>!aux(r)&&['In progress','Pending'].includes(r.status)&&evidence(r)&&effective(r).every(met);
function historyFor(r){return data.filter(x=>x.type==='Change'&&r.id&&x.parents.includes(r.id)).sort((a,b)=>cmp(b.end,a.end)||cmp(b.id,a.id));}
function forecast(r){if(r.id&&FC.has(r.id))return FC.get(r.id);const c={end:r.end,start:r.start,budget:r.budget};
 if(!aux(r)){for(const u of historyFor(r).reverse()){const f=u.forecasts&&u.forecasts[r.id];if(f&&validDate(f.end))c.end=validDate(f.end);if(f&&num(f.budget)!==null)c.budget=num(f.budget);}if(point(r.type))c.start=c.end;}
 if(r.id)FC.set(r.id,c);return c;}
function riskFootprint(risk){const affected=new Set(risk.parents),queue=[...affected];
 for(let i=0;i<queue.length;i++)for(const plan of plans()){if(affected.has(plan.id)||!effective(plan).some(d=>d.id===queue[i]))continue;affected.add(plan.id);queue.push(plan.id);}
 const fp=new Set();for(const id of affected)for(const a of ancestry(get(id)))fp.add(a);return fp;}
const FOOT=new Map();
function linkedRisks(r){if(!r.id)return [];return data.filter(x=>x.type==='Risk'&&x.status!=='Closed'&&(FOOT.get(x.id)||FOOT.set(x.id,riskFootprint(x)).get(x.id)).has(r.id));}
const riskOf=r=>{const l=linkedRisks(r);return LEVELS[Math.max(0,...l.map(x=>LEVELS.indexOf(x.severity)))];};
function eventsFor(r,t){return (t==='Risk'?linkedRisks(r):data.filter(x=>r.id&&x.type===t&&ancestry(x).includes(r.id))).sort((a,b)=>cmp(b.end,a.end));}
/* Statuses that follow from deliverable evidence (the prototype's progress()), applied when a person saves. */
function progressStatus(r){if(aux(r)||!evidence(r)||['Completed','Cancelled','On hold'].includes(r.status))return r.status;
 const missing=effective(r).filter(d=>!met(d));return missing.length&&onlyDecision(r)?'Pending':missing.some(d=>d.to==='start')?'Planned':'In progress';}

/* ---------- filters ---------- */
const F=st.filters;
function match(r){const f={...r,...forecast(r)},q=str(F.search).trim().toLowerCase();
 return (!q||[r.name,r.owner,r.description,(programOf(r)[0]||{}).name].join(' ').toLowerCase().includes(q))&&(!F.owner||r.owner===F.owner)&&(!F.program||ancestry(r).includes(F.program))&&(!F.type||r.type===F.type)&&(!F.status||r.status===F.status)&&(!F.risk||riskOf(r)===F.risk)
  &&(!F.budget||(f.budget!=null&&(F.budget==='under'?f.budget<50000:f.budget>=50000)))&&(!F.from||cmp(f.end,F.from)>=0)&&(!F.until||cmp(f.start,F.until)<=0);}
function outline(){const ps=plans(),rows=[],filtered=Object.entries(F).some(([k,v])=>k!=='program'&&v);
 const sort=(a,b)=>cmp(forecast(a).end||'9999',forecast(b).end||'9999')||cmp(a.name,b.name);
 function visit(r,depth,seen){if(seen.has(r.id))return;seen.add(r.id);const kids=ps.filter(x=>x.parents[0]===r.id).sort((a,b)=>Number(b.type==='Milestone')-Number(a.type==='Milestone')||sort(a,b));
  if(!match(r)&&!ps.some(x=>match(x)&&ancestry(x).includes(r.id)))return;
  const open=r.type==='Program'||!st.collapsed.includes(r.id)||filtered;rows.push({r,depth,open,kids:kids.length});if(open)for(const c of kids)visit(c,depth+1,seen);}
 const seen=new Set();ps.filter(x=>!x.parents[0]||!get(x.parents[0])).sort((a,b)=>Number(b.type==='Program')-Number(a.type==='Program')||cmp(a.name,b.name)).forEach(r=>visit(r,0,seen));return rows;}

/* ---------- the record editor (side panel) ---------- */
const rel=(id,to,outcome)=>({id:id||'',to:to||'',outcome:outcome||'Approved'});
// The draft keeps the version shown when editing started: it is the expectedVersion of the save.
function draftFor(r){const d=JSON.parse(JSON.stringify(r));
 if(!aux(d)){const kids=childrenOf(r).map(x=>rel(x.id,x.parentRule,x.parentOutcome));d.links={parents:[rel(r.parents[0],r.parentRule,r.parentOutcome)],children:kids.length?kids:[rel('')]};}return d;}
function newDraft(type,parent){const t=TYPES.concat(EVENT_TYPES).includes(type)?type:'Milestone',parents=parent?[parent]:!aux({type:t})&&t!=='Program'&&F.program?[F.program]:[];
 const d={id:'',type:t,name:'',parents,description:'',owner:'',start:'',end:'',status:t==='Risk'?'Open':aux({type:t})?'':'Planned',members:[],orgIds:[],files:[]};
 if(aux(d))Object.assign(d,{signoff:'',format:'',severity:'',place:'',forecasts:{}});
 else{Object.assign(d,{asset:'',disease:'',stage:'',early:'',late:'',decisionResult:'',budget:null,spend:null,reserve:null,approved:null,parentRule:'',parentOutcome:'Approved'});d.links={parents:[rel(parents[0])],children:[rel('')]};}
 return d;}
function openEditor(id,parent,type,ret){const r=get(id);const d=r?draftFor(r):newDraft(type,parent);st.panel={kind:'form',draft:d,base:JSON.stringify(d),error:'',confirm:'',section:'',ret:ret||null};}
const P=()=>st.panel&&st.panel.kind==='form'?st.panel:null;
/* Reads the form back into the draft: every control carries data-ui-state, so the draft is current on each keystroke. */
function capture(form){const p=P();if(!p||!form||form._f!=='record')return;const d=p.draft,g=k=>has(form,k)?str(form[k]):undefined;
 for(const k of ['name','description','owner','asset','stage','disease','start','end','early','late','status','decisionResult','signoff','format','severity','place']){const v=g(k);if(v!==undefined)d[k]=k==='name'||k==='description'||k==='owner'||k==='asset'||k==='disease'||k==='place'||k==='signoff'?v:v.trim();}
 for(const k of ['budget','spend','reserve']){const v=g(k);if(v!==undefined)d[k]=v.trim()===''?null:num(v);}
 if(d.links)for(const side of ['parents','children'])d.links[side].forEach((row,i)=>{const id=g('h_'+side+'_id_'+i),to=g('h_'+side+'_rule_'+i),out=g('h_'+side+'_out_'+i);if(id!==undefined)row.id=id;if(to!==undefined)row.to=to;if(out!==undefined)row.outcome=out;});
 if(d.type==='Change'){const fc={};for(const id of d.parents){const end=validDate(g('fd_'+id)),b=g('fb_'+id);const prev=d.forecasts[id]||{};const e2=g('fd_'+id)===undefined?prev.end:end,b2=b===undefined?prev.budget:(b.trim()===''?'':num(b));if(e2||(b2!==''&&b2!=null))fc[id]={end:e2||'',budget:b2==null?'':b2};}d.forecasts=fc;}
 if(point(d.type)||aux(d))d.start=d.end;
 const org=p.org;if(org){const n=g('org_name'),c=g('org_contacts');if(n!==undefined)org.name=n;if(c!==undefined)org.contacts=c;}
 if(g('member_name')!==undefined)p.member=g('member_name');if(g('member_pick')!==undefined)p.memberPick=g('member_pick');if(g('org_pick')!==undefined)p.orgPick=g('org_pick');p.error='';}
const dirty=()=>{const p=P();return !!p&&JSON.stringify(p.draft)!==p.base;};

/* ---------- saving ---------- */
let BUFFER=null,SAVED=false;
function save(changes,message){if(!changes.length)return;if(BUFFER){BUFFER.push(...changes);return;}tools.call('records.save',{changes:changes.slice(0,50)});SAVED=true;st.undoHint=true;note('success',message||'Saved');}
const token=()=>'c'+Date.now().toString(36)+Math.floor(Math.random()*1e9).toString(36);
function itemData(r){return {name:r.name.trim(),item_type:r.type,parent_id:r.type==='Program'?null:r.parents[0]||null,parent_rule:r.type==='Program'||!r.parents[0]?null:r.parentRule||null,parent_outcome:r.type==='Decision'&&r.parentRule?r.parentOutcome||'Approved':null,
 description:r.description||null,asset:r.type==='Program'?r.asset||null:null,disease:r.type==='Program'?r.disease||null:null,stage:r.type==='Program'?r.stage||null:null,start_date:(point(r.type)?r.end:r.start)||null,end_date:r.end||null,earliest_date:r.early||null,latest_date:r.late||null,
 owner:r.owner.trim()||null,status:r.status,decision_outcome:r.type==='Decision'?r.decisionResult||'Approved':null,budget:r.budget,spend:r.spend,reserve:r.reserve,team:r.members.join(', ')||null,organization_ids:r.orgIds.join(',')||null,
 files:r.files.length?JSON.stringify(r.files):null,approved_on:r.approved?r.approved.date:null,approved_owner:r.approved?r.approved.by:null};}
function eventData(r){return {name:r.name.trim(),event_type:r.type,item_ids:r.parents.join(',')||null,description:r.description||null,event_date:r.end||null,owner:r.owner.trim()||null,team:r.members.join(', ')||null,organization_ids:r.orgIds.join(',')||null,
 signoff:r.type==='Deliverable'?r.signoff||null:null,format:r.type==='Deliverable'?r.format||null:null,severity:r.type==='Risk'?r.severity||null:null,risk_status:r.type==='Risk'?r.status||'Open':null,place:r.type==='Change'?r.place||null:null,
 forecasts:r.type==='Change'&&Object.keys(r.forecasts).length?JSON.stringify(r.forecasts):null,files:r.files.length?JSON.stringify(r.files):null};}
function cycle(list,start){const m=new Map(list.map(x=>[x.id,x]));let cur=m.get(start),seen=new Set();while(cur&&cur.parents[0]){if(seen.has(cur.id))return true;seen.add(cur.id);cur=m.get(cur.parents[0]);if(cur&&cur.id===start)return true;}return false;}
/* The prototype's validateLinksWithPrevious, on the plan as it would be after the save. */
function validate(r,previous){const unmet=effective(r).filter(d=>!met(d));
 if(unmet.some(d=>r.status==='Completed'||(d.to==='start'&&r.status==='In progress')))return 'Resolve the mandatory dependency before changing this status.';
 if(!aux(r)&&r.status==='Completed'&&(!previous||previous.status!=='Completed')&&(!r.owner.trim()||!r.approved||r.approved.by!==r.owner))return 'Owner approval is required to complete this item.';
 if(!aux(r)&&r.status==='Pending'&&!onlyDecision(r))return 'Pending applies when only a decision remains.';
 return '';}
function saveRecord(){const p=P(),d=p.draft;
 const msg=!d.name.trim()?'Enter a name.':d.start&&d.end&&d.start>d.end?'End date must follow the start.':d.early&&d.late&&d.early>d.late?'Latest date must follow earliest date.':'';
 if(msg)return msg;
 if(aux(d)){if(!canWrite('events'))return 'You cannot change events in this app.';
  if(d.parents.some(id=>!get(id)))return 'An affected plan item no longer exists.';
  const r={...d,members:d.members||[],orgIds:d.orgIds||[]};
  const list=data.filter(x=>x.id!==r.id).concat([{...r,id:r.id||'__new'}]);
  const ups=withData(list,()=>statusUpdates());
  const changes=[];
  if(r.id){if(!get(r.id))return 'This record no longer exists.';changes.push({kind:'update_record',recordId:r.id,expectedVersion:r.version??get(r.id).version,data:toReal('events',eventData(r))});}
  else changes.push({kind:'create_record',typeId:roleMap.events.typeId,data:toReal('events',{...eventData(r),client_ref:token()})});
  if(ups.length&&!canWrite('items'))return 'You cannot update the plan statuses this event changes.';
  changes.push(...ups.map(statusChange));if(changes.length>50)return 'This change touches more than 50 records; save it in smaller steps.';
  save(changes,r.type+' saved');return '';}
 if(!canWrite('items'))return 'You cannot change plan items in this app.';
 const id=d.id||'__new',links=d.links,before=data;
 if(Object.values(links).flat().some(x=>!x.id&&x.to))return 'Choose an item for each dependency.';
 const parentRow=d.type==='Program'?rel(''):links.parents[0]||rel('');
 const r={...d,id,parents:parentRow.id?[parentRow.id]:[],parentRule:parentRow.id?parentRow.to:'',parentOutcome:parentRow.outcome||'Approved'};delete r.links;
 if(r.type==='Program')Object.assign(r,{parents:[],parentRule:''});
 const childIds=links.children.map(x=>x.id).filter(Boolean),touched=new Map();
 const list=before.filter(x=>x.id!==id).map(x=>{if(aux(x))return x;
  if(childIds.includes(x.id)){const row=links.children.find(v=>v.id===x.id),y={...x,parents:[id],parentRule:row.to||'',parentOutcome:row.outcome||'Approved'};if(x.parents[0]!==id||x.parentRule!==y.parentRule||(y.parentRule&&x.parentOutcome!==y.parentOutcome))touched.set(x.id,y);return y;}
  if(d.id&&x.parents[0]===id){const y={...x,parents:[],parentRule:''};touched.set(x.id,y);return y;}
  return x;}).concat([r]);
 if(r.status!=='Completed')r.approved=null;
 const err=withData(list,()=>{
  if(list.some(x=>!aux(x)&&cycle(list,x.id)))return 'This would create a parent–child cycle.';
  const e=validate(r,before.find(x=>x.id===id));if(e)return e;
  for(const y of touched.values()){const parent=get(y.parents[0]);if(parent&&parent.id!==id){const e2=validate(parent,before.find(x=>x.id===parent.id));if(e2)return e2;}}
  const old=before.find(x=>x.id===id),oldParent=old&&old.parents[0]?get(old.parents[0]):null;if(oldParent&&oldParent.id!==r.parents[0]){const e3=validate(oldParent,oldParent);if(e3)return e3;}
  if(r.parents[0]){const parent=get(r.parents[0]);if(parent){const e4=validate(parent,before.find(x=>x.id===parent.id));if(e4)return e4;}}
  return '';});
 if(err)return err;
 const ups=withData(list,()=>statusUpdates());const changes=[];
 const self=ups.find(u=>u.recordId===id);if(self){r.status=self.status;}
 if(d.id){if(!get(id))return 'This record no longer exists.';changes.push({kind:'update_record',recordId:id,expectedVersion:d.version??get(id).version,data:toReal('items',itemData(r))});}
 else{const ref=token();changes.push({kind:'create_record',typeId:roleMap.items.typeId,data:toReal('items',{...itemData(r),client_ref:ref})});st.reopen={ref,tries:0};}
 for(const y of touched.values()){const u=ups.find(x=>x.recordId===y.id);changes.push({kind:'update_record',recordId:y.id,expectedVersion:get(y.id).version,data:toReal('items',{parent_id:y.parents[0]||null,parent_rule:y.parents[0]&&y.parentRule?y.parentRule:null,parent_outcome:y.parentRule&&y.type==='Decision'?y.parentOutcome:null,...(u?{status:u.status}:{})})});}
 for(const u of ups)if(u.recordId!==id&&!touched.has(u.recordId))changes.push(statusChange(u));
 if(changes.length>50)return 'This change touches more than 50 records; save it in smaller steps.';
 save(changes,r.type+' saved');return '';}
/* The statuses deliverable evidence implies (the prototype's progress() after a save), for every existing plan item. */
function statusUpdates(){const out=[];for(const x of plans()){if(x.id==='__new')continue;const s=progressStatus(x);if(s!==x.status)out.push({recordId:x.id,status:s});}return out;}
const statusChange=u=>({kind:'update_record',recordId:u.recordId,expectedVersion:get(u.recordId).version,data:toReal('items',{status:u.status})});

/* ---------- events ---------- */
const evForm=event.form&&typeof event.form==='object'?event.form:null;
if(evKind!=='command'&&evForm)capture(evForm);
let RENDER_ONLY=false;
function handle(){const p=P();
 if(action.startsWith('undo:')&&evKind==='click'){tools.call('undo.run',{undoId:action.slice(5)});st.undo=null;note('success','Undone');return;}
 if(action.startsWith('filter:')){const k=action.slice(7);if(['search','program','owner','type','status','risk','budget','from','until'].includes(k)){F[k]=str(event.value);if(!F[k])delete F[k];}return;}
 if(action==='filters:reset'){st.filters={};return;}
 if(action==='filters:more'){st.more=!st.more;return;}
 if(action.startsWith('toggle:')){const id=action.slice(7);st.collapsed=st.collapsed.includes(id)?st.collapsed.filter(x=>x!==id):st.collapsed.concat([id]);return;}
 if(action.startsWith('open:')){const r=get(action.slice(5));if(!r)return;if(aux(r)){openEditor(r.id);return;}
  st.screen='programs';st.filters={program:(programOf(r)[0]||{}).id||''};if(!st.filters.program)st.filters={};st.collapsed=st.collapsed.filter(x=>!ancestry(r).includes(x));st.sel=r.id;st.panel=null;return;}
 if(action==='add'){st.panel={kind:'choose'};return;}
 if(action.startsWith('new:')){openEditor('','',action.slice(4));return;}
 if(action.startsWith('rec:')){openEditor(action.slice(4));return;}
 if(action.startsWith('section:')){const [,t,id]=action.split(':');openEditor(id);if(P())P().section=t;return;}
 if(action==='panel:close'){if(p&&p.ret){st.panel=p.ret;return;}st.panel=null;return;}
 if(!p)return;const d=p.draft;
 if(action==='draft'){if(evKind==='change'&&event.form&&has(event.form,'type')&&!p.draft.id&&event.form.type!==d.type){const t=str(event.form.type);if(TYPES.concat(EVENT_TYPES).includes(t)){const keep={name:d.name,description:d.description,owner:d.owner,end:d.end,start:d.start,members:d.members,orgIds:d.orgIds,files:d.files};const n=newDraft(t,'');Object.assign(n,keep);n.parents=aux(n)?d.parents.filter(id=>get(id)):[];if(!aux(n)&&n.type!=='Program'&&d.parents[0]&&(get(d.parents[0])||{}).type==='Program')n.links.parents=[rel(d.parents[0])];p.draft=n;}}return;}
 if(action.startsWith('pick:')){const id=str(event.value);if(id&&get(id)&&!d.parents.includes(id))d.parents=d.parents.concat([id]);return;}
 if(action.startsWith('unpick:')){const id=action.slice(7);d.parents=d.parents.filter(x=>x!==id);if(d.forecasts)delete d.forecasts[id];return;}
 if(action==='child:add'&&d.links){d.links.children.push(rel(''));return;}
 if(action.startsWith('child:rm:')&&d.links){d.links.children.splice(Number(action.slice(9)),1);if(!d.links.children.length)d.links.children.push(rel(''));return;}
 if(action==='member:add'){const n=str(p.member).trim()||str(p.memberPick).trim();if(n)d.members=[...new Set(d.members.concat([n]))];p.member='';p.memberPick='';return;}
 if(action.startsWith('member:rm:')){const n=action.slice(10);d.members=d.members.filter(x=>x!==n);return;}
 if(action==='org:add'){const id=str(p.orgPick);if(id&&!d.orgIds.includes(id))d.orgIds=d.orgIds.concat([id]);p.orgPick='';return;}
 if(action.startsWith('org:rm:')){const id=action.slice(7);d.orgIds=d.orgIds.filter(x=>x!==id);return;}
 if(action==='org:new'){p.org={id:'',name:'',contacts:''};return;}
 if(action.startsWith('org:edit:')){const o=R.organizations.rows.find(x=>x.id===action.slice(9));if(o)p.org={id:o.id,name:str(o.data.name),contacts:contactsOf(o.id).map(x=>x.name).join(', ')};return;}
 if(action==='org:cancel'){p.org=null;return;}
 if(action==='org:store'){storeOrg(p);return;}
 if(action.startsWith('document:uploaded:')&&evKind==='change'){const v=str(event.value);if(!v)return;let n='Document';try{const l=tools.call('documents.list',{limit:200});const hit=(l&&Array.isArray(l.documents)?l.documents:Array.isArray(l)?l:l&&Array.isArray(l.versions)?l.versions:[]).find(x=>x.versionId===v);if(hit)n=str(hit.filename||n);}catch(e){}d.files=d.files.concat([{v,n}]);return;}
 if(action.startsWith('file:rm:')){d.files.splice(Number(action.slice(8)),1);return;}
 if(action.startsWith('note:')){const rest=action.slice(5);if(!d.id){p.error='Save this item first, then add deliverables, risks and changes to it.';return;}
  const ret=JSON.parse(JSON.stringify(p));if(EVENT_TYPES.includes(rest))openEditor('',d.id,rest,ret);else openEditor(rest,'','',ret);return;}
 if(action.startsWith('disc:')){const k=action.slice(5),o=p.open||(p.open={});o[k]=!(has(o,k)?!!o[k]:DISC_DEFAULT(k));return;}
 if(action==='duplicate'){if(d.links)d.links.children=[];d.id='';d.approved=null;if(!aux(d))d.status='Planned';d.name+=' (copy)';d.files=[];p.base='';p.confirm='';return;}
 if(action==='delete'){p.confirm='delete';return;}
 if(action==='approve'){if(!d.owner.trim()){p.error='Assign an owner before approving completion.';return;}
  const r=get(d.id);if(!r||!effective(r).every(met)){p.error='Resolve the mandatory dependencies first.';return;}p.confirm='approve';return;}
 if(action==='confirm:cancel'){p.confirm='';return;}
 // Approval is recorded with the owner's name and the date; the platform's record history shows who pressed it.
 if(action==='approve:confirm'){d.approved={by:d.owner.trim(),date:AS_OF||CLOCK};d.status='Completed';p.confirm='';return;}
 if(action==='delete:confirm'){p.confirm='';const id=d.id,r=get(id);if(!r)return;
  if(data.some(x=>x.parents.includes(id))){p.error='Reassign or remove the child items and events before deleting this record.';return;}
  const role=aux(r)?'events':'items';if(!canWrite(role)){p.error='You cannot delete records in this app.';return;}
  save([{kind:'archive_record',recordId:id,expectedVersion:r.version}],r.type+' deleted');if(F.program===id)st.filters={};st.panel=p.ret||null;return;}
 if(action==='form:save'&&evKind==='submit'){const err=saveRecord();if(err){p.error=err;return;}st.panel=p.ret||null;return;}
}
function contactsOf(orgId){return R.people.rows.filter(x=>str(x.data.organization_id)===orgId).map(x=>({id:x.id,version:x.version,name:str(x.data.name)}));}
function storeOrg(p){const o=p.org,name=str(o.name).trim();if(!name){o.error='Enter an organization name.';return;}
 if(!canWrite('organizations')){o.error='You cannot change organizations in this app.';return;}
 const same=R.organizations.rows.find(x=>str(x.data.name).trim().toLowerCase()===name.toLowerCase());
 if(same&&same.id!==o.id){if(!o.id){if(!p.draft.orgIds.includes(same.id))p.draft.orgIds=p.draft.orgIds.concat([same.id]);p.org=null;return;}o.error='An organization already uses this name.';return;}
 const changes=[];
 if(o.id){const row=R.organizations.rows.find(x=>x.id===o.id);if(!row){o.error='This organization no longer exists.';return;}
  if(str(row.data.name)!==name)changes.push({kind:'update_record',recordId:o.id,expectedVersion:row.version,data:toReal('organizations',{name})});
  if(roleMap.people&&canWrite('people')){const want=split(o.contacts),have=contactsOf(o.id);
   for(const n of want)if(!have.some(h=>h.name.toLowerCase()===n.toLowerCase()))changes.push({kind:'create_record',typeId:roleMap.people.typeId,data:toReal('people',{name:n,organization_id:o.id})});
   for(const h of have)if(!want.some(n=>n.toLowerCase()===h.name.toLowerCase()))changes.push({kind:'archive_record',recordId:h.id,expectedVersion:h.version});}
  if(!p.draft.orgIds.includes(o.id))p.draft.orgIds=p.draft.orgIds.concat([o.id]);
  save(changes,'Organization saved');p.org=null;return;}
 changes.push({kind:'create_record',typeId:roleMap.organizations.typeId,data:toReal('organizations',{name})});
 save(changes,'Organization added');p.pendingOrg=name;p.org=null;}
if(evKind!=='command'&&evKind!=='open'&&evKind!=='refresh')handle();
// Digest screen controls and Settings.
if(action.startsWith('mode:')){st.digest.mode=['All','Weekly','Monthly'].includes(action.slice(5))?action.slice(5):'All';st.digest.pick='';}
if(action==='digest:program'){st.digest.program=str(event.value);st.digest.pick='';}
if(action.startsWith('report:')){st.digest.pick=action.slice(7);}
if(action==='settings:save'&&evKind==='submit'&&OWNER&&canWrite('settings')){const f=evForm||{},cur=CURRENCIES.includes(f.currency)?f.currency:CURRENCY,df=DATE_FORMATS.includes(f.date_format)?f.date_format:DATE_FORMAT;
 save([SET_ROW?{kind:'update_record',recordId:SET_ROW.id,expectedVersion:SET_ROW.version,data:toReal('settings',{currency:cur,date_format:df})}:{kind:'create_record',typeId:roleMap.settings.typeId,data:toReal('settings',{currency:cur,date_format:df})}],'Settings saved');}
// After a save: reopen a newly created plan item so its links, events and files can be added; attach a new organization.
if((evKind==='refresh'||evKind==='open')&&!PENDING){
 if(st.reopen){const hit=ITEMS.find(x=>x.ref===st.reopen.ref);if(hit){st.reopen=null;openEditor(hit.id);}else if(++st.reopen.tries>2)st.reopen=null;}
 // An open form whose record changed since (for example a status set by an event saved from it) follows the saved record while unedited.
 const q=P();if(q&&q.draft.id&&!dirty()){const r=get(q.draft.id);if(r&&r.version!==q.draft.version){const keep={section:q.section,ret:q.ret,org:q.org,pendingOrg:q.pendingOrg};openEditor(r.id,'','',keep.ret);Object.assign(P(),keep);}}
 const p=P();if(p&&p.pendingOrg&&!R.organizations.pending){const o=R.organizations.rows.find(x=>str(x.data.name).trim().toLowerCase()===p.pendingOrg.toLowerCase());if(o&&!p.draft.orgIds.includes(o.id)){p.draft.orgIds=p.draft.orgIds.concat([o.id]);}p.pendingOrg='';}
 if(inp.saved&&st.undoHint){st.undoHint=false;try{const u=tools.call('undo.list',{});const l=u&&Array.isArray(u.actions)?u.actions:u&&Array.isArray(u.entries)?u.entries:[];st.undo=l.slice(0,1).map(x=>({undoId:x.undoId,label:str(x.label||'last change')}));}catch(e){st.undo=null;}}
}
if(action.startsWith('nav:'))st.undo=null;

/* ---------- digest (built from the records) ---------- */
function digestFor(kindName,programId){const end=AS_OF,start=kindName==='Weekly'?addDays(end,-6):end.slice(0,8)+'01',ahead=addDays(end,kindName==='Weekly'?7:30);
 const inPeriod=d=>d&&d>=start&&d<=end,within=d=>d&&d>end&&d<=ahead;
 const programs=plans().filter(x=>x.type==='Program'&&(!programId||x.id===programId)).sort((a,b)=>cmp(a.name,b.name));
 const sections=programs.map(pg=>{const under=x=>ancestry(x).includes(pg.id),lines=[];
  for(const x of data.filter(x=>x.type==='Change'&&under(x)&&inPeriod(x.end)))lines.push('Change · '+x.name+' ('+date(x.end)+')'+(x.description?': '+x.description:''));
  for(const x of data.filter(x=>x.type==='Deliverable'&&under(x)&&inPeriod(x.end)))lines.push('Deliverable received · '+x.name+' ('+date(x.end)+')'+(x.owner?', '+x.owner:''));
  for(const x of data.filter(x=>x.type==='Risk'&&x.status!=='Closed'&&under(x)))lines.push('Open risk · '+x.name+(x.severity?' ('+x.severity+')':''));
  for(const x of plans().filter(x=>x.type==='Decision'&&under(x)&&!['Completed','Cancelled'].includes(x.status)&&within(forecast(x).end)))lines.push('Decision due '+date(forecast(x).end)+' · '+x.name+(x.owner?', '+x.owner:''));
  for(const x of plans().filter(x=>x.type==='Milestone'&&under(x)&&!['Completed','Cancelled'].includes(x.status)&&within(forecast(x).end)))lines.push('Milestone due '+date(forecast(x).end)+' · '+x.name);
  for(const x of plans().filter(x=>under(x)&&x.approved&&inPeriod(x.approved.date)))lines.push('Completed · '+x.name+' (approved '+date(x.approved.date)+')');
  return {h:pg.name,p:lines.length?lines:['No recorded activity in this period.']};});
 const notes=[];if(!programId){const queue=plans().filter(ready),late=plans().filter(x=>!['Completed','Cancelled'].includes(x.status)&&forecast(x).end&&forecast(x).end<end);
  notes.push({h:'Awaiting owner approval',p:queue.length?queue.map(x=>x.name+(x.owner?' · '+x.owner:'')):['Nothing is waiting for approval.']});
  notes.push({h:'Past the forecast deadline',p:late.length?late.map(x=>x.name+' · '+date(forecast(x).end)):['No open item is past its forecast deadline.']});}
 const d=new Date(dayNo(end)*86400000);
 return {kind:kindName,title:kindName==='Weekly'?'Week of '+date(start):LONG_MONTHS[d.getUTCMonth()]+' portfolio digest',start,end,program:programId||'',sections,notes};}
const savedDigests=()=>R.digests.rows.map(x=>({id:x.id,kind:x.data.kind==='Monthly'?'Monthly':'Weekly',title:str(x.data.title),start:validDate(x.data.period_start),end:validDate(x.data.period_end),program:str(x.data.program_id),contents:parseJSON(x.data.contents,{})})).sort((a,b)=>cmp(b.end,a.end));
// Saves the live digest on screen: the one picked, else the first one listed (Weekly, unless the screen shows Monthly only).
if(action==='digest:save'&&evKind==='click'&&canWrite('digests')&&AS_OF){const pick=str(st.digest.pick),k=pick.startsWith('live:')?(pick==='live:Monthly'?'Monthly':'Weekly'):st.digest.mode==='Monthly'?'Monthly':'Weekly',g=digestFor(k,st.digest.program);
 save([{kind:'create_record',typeId:roleMap.digests.typeId,data:toReal('digests',{title:g.title,kind:k,period_start:g.start,period_end:g.end,program_id:g.program||null,contents:JSON.stringify({sections:g.sections,notes:g.notes}),saved_on:AS_OF})}],'Digest saved to the archive');}

/* ---------- app commands (reads only) ---------- */
if(evKind==='command'){let res,err=null;const args=parseJSON(event.value,{})||{};
 const brief=r=>{const f=forecast(r);return {id:r.id,type:r.type,name:r.name,parent_id:r.parents[0]||null,program:(programOf(r)[0]||{}).name||null,owner:r.owner||null,status:r.status,baseline_start:r.start||null,baseline_end:r.end||null,forecast_start:f.start||null,forecast_end:f.end||null,baseline_budget:r.budget,forecast_budget:f.budget,spend:r.spend,risk:riskOf(r),dependency_on_parent:r.parentRule||null,awaiting_approval:ready(r),approved_on:r.approved?r.approved.date:null,events:{deliverables:eventsFor(r,'Deliverable').length,risks:eventsFor(r,'Risk').length,changes:eventsFor(r,'Change').length}};};
 if(PENDING)err='Data is still loading.';
 else if(action==='overview.read'){const ps=plans().filter(x=>x.type==='Program');res={as_of:AS_OF,currency:CURRENCY,complete:!problems.length,problems,programs:ps.map(pg=>{const next=plans().filter(x=>x.type==='Milestone'&&!['Completed','Cancelled'].includes(x.status)&&ancestry(x).includes(pg.id)).sort((a,b)=>cmp(forecast(a).end,forecast(b).end))[0];return {...brief(pg),asset:pg.asset||null,disease:pg.disease||null,stage:pg.stage||null,next_milestone:next?{id:next.id,name:next.name,forecast_end:forecast(next).end||null}:null};}),pending_decisions:plans().filter(x=>x.type==='Decision'&&x.status==='Pending').map(brief),upcoming_decisions:plans().filter(x=>x.type==='Decision'&&!['Completed','Cancelled'].includes(x.status)).map(brief),awaiting_owner_approval:plans().filter(ready).map(brief)};}
 else if(action==='plan.read'){res={as_of:AS_OF,currency:CURRENCY,complete:!problems.length,items:plans().filter(x=>!args.program_id||ancestry(x).includes(args.program_id)).map(brief)};}
 else if(action==='events.read'){res={complete:!problems.length,events:data.filter(x=>aux(x)&&(!args.event_type||x.type===args.event_type)).map(x=>({id:x.id,type:x.type,name:x.name,date:x.end||null,responsible:x.owner||null,affected:x.parents.map(id=>({id,name:(get(id)||{}).name||null})),description:x.description||null,...(x.type==='Risk'?{severity:x.severity||null,status:x.status}:{}),...(x.type==='Deliverable'?{signed_off_by:x.signoff||null,format:x.format||null}:{}),...(x.type==='Change'?{forecasts:x.forecasts}:{}),files:x.files.length}))};}
 else if(action==='digest.read'){if(!AS_OF)err='No date is available.';else res=digestFor(args.kind==='Monthly'?'Monthly':'Weekly',str(args.program_id));}
 else err='Unknown command.';
 return {html:'',state:{command:err?{ok:false,error:err}:{ok:true,result:res}}};}

/* ---------- view helpers (the prototype's) ---------- */
const PATHS={overview:'M3 4h7v16H3z M14 4h7v6h-7z M14 14h7v6h-7z',programs:'M4 21V3m0 1h15l-3 4 3 4H4',timeline:'M3 3v17h18 M6 6h7m-3 5h8m-4 5h6',deliverables:'M4 5h9l3 3h4v12H4z M8 13l3 3 5-6',risks:'M12 3L2 21h20z M12 9v5m0 3v1',changes:'M3 5h18v12H9l-5 4v-4H3z M7 9h10m-10 4h7',digest:'M5 3h14v18H5z M8 7h8m-8 4h8m-8 4h5',settings:'M4 6h7m4 0h5M4 12h2m4 0h10M4 18h10m4 0h2 M11 3v6M7 9v6m8 0v6',pencil:'M14 3h7v7m0-7-7 7M10 21H3v-7m0 7 7-7',decision:'M12 2l10 10-10 10L2 12z',activity:'M4 5h16v14H4z M8 12l3 3 5-6'};
const icon=k=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+PATHS[k]+'"/></svg>';
const ICON_OF={Program:'overview',Milestone:'programs',Activity:'activity',Decision:'decision',Deliverable:'deliverables',Risk:'risks',Change:'changes'};
const recordIcon=t=>'<span style="color:'+(COLORS[t]||'#375778')+'">'+icon(ICON_OF[t])+'</span>';
const itemName=r=>['Program','Milestone'].includes(r.type)?'<strong class="plan-name">'+E(r.name)+'</strong>':'<span>'+E(r.name)+'</span>';
const tag=s=>'<span class="tag '+(['High','At risk'].includes(s)?'risk':['Pending','Medium'].includes(s)?'warn':['Completed','Low'].includes(s)?'good':'')+'">'+E(s)+'</span>';
const link=r=>'<button type="button" class="link" data-action="open:'+E(r.id)+'">'+itemName(r)+'</button>';
const typeTag=t=>'<span class="type'+(t==='Decision'?' decision':'')+'" style="--c:'+(COLORS[t]||'#546275')+'">'+(GLYPH[t]||'•')+' '+E(t)+'</span>';
const editAction=r=>'<button type="button" class="edit-action" data-action="rec:'+E(r.id)+'" aria-label="Edit '+E(r.name)+'" title="Edit '+E(r.name)+'">'+icon('pencil')+'</button>';
function table(h,rows,sel){return '<div class="scroll"><table><thead><tr>'+h.map(x=>'<th scope="col">'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr'+(sel&&r._id===sel?' class="selected-record"':'')+'>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
const panel=(t,c)=>'<section class="panel">'+(t?'<h2>'+t+'</h2>':'')+c+'</section>';
const opts=(arr,v)=>arr.map(x=>'<option'+(str(x[0])===str(v)?' selected':'')+' value="'+E(x[0])+'">'+E(x[1])+'</option>').join('');
const pairs=a=>a.map(x=>[x,x]);
const selectFilter=(k,label,arr)=>'<label>'+label+'<select data-action="filter:'+k+'" data-ui-state>'+opts([['','All'],...arr],F[k])+'</select></label>';
function stageTrack(stage){const i=STAGES.indexOf(stage);return E(stage||'—')+(i<0?'':'<span class="stage-track" aria-hidden="true">'+STAGES.map((_,j)=>'<i class="'+(j===i?'current':j<i?'past':'')+'"></i>').join('')+'</span>');}
function deadline(r){const end=forecast(r).end;if(!end)return '—';if(!AS_OF)return date(end);const days=dayNo(end)-dayNo(AS_OF);return date(end)+'<small class="note">'+(days===0?'Due today':Math.abs(days)+' days '+(days<0?'overdue':'left'))+'</small>';}
function signals(r){return '<span class="signals">'+EVENT_TYPES.map(t=>{const n=eventsFor(r,t).length;return n?'<button type="button" data-action="section:'+t+':'+E(r.id)+'" class="sig '+t.toLowerCase()+'">'+n+' '+t.toLowerCase()+(n===1?'':'s')+'</button>':'';}).join('')+'</span>';}
const WRITE=canWrite('items')||canWrite('events');
function title(text,withAdd){return '<div class="title"><h2>'+E(text)+'</h2><div class="k-row">'+(st.undo&&st.undo.length?kit.undo(st.undo):'')+(withAdd&&WRITE?'<button type="button" class="primary" data-action="add">＋ Add record</button>':'')+'</div></div>';}
function toolbar(){const ps=plans(),owners=[...new Set(ps.map(r=>r.owner).filter(Boolean))].sort();
 const first='<label>Search<input type="search" data-action="filter:search" data-ui-state placeholder="Search plan items" value="'+E(F.search||'')+'"></label>'+selectFilter('program','Program',ps.filter(r=>r.type==='Program').map(r=>[r.id,r.name]))+selectFilter('owner','Owner',pairs(owners))+selectFilter('type','Record',pairs(TYPES))+selectFilter('status','Status',pairs(STATUSES));
 const extra=selectFilter('risk','Risk',pairs(['High','Medium','Low','None']))+selectFilter('budget','Budget',[['under','Under '+money(50000)],['over',money(50000)+' and over']])+'<label>From<input type="date" data-action="filter:from" data-ui-state value="'+E(F.from||'')+'"></label><label>Through<input type="date" data-action="filter:until" data-ui-state value="'+E(F.until||'')+'"></label>';
 return '<div class="filters">'+first+(st.more?extra:'')+'<button type="button" data-action="filters:more" aria-expanded="'+!!st.more+'">'+(st.more?'Fewer filters':'More filters')+'</button><button type="button" data-action="filters:reset">Reset</button></div>';}

/* ---------- screens ---------- */
function overview(){const ps=plans().filter(r=>r.type==='Program');
 const strip='<div class="strip">'+[[ps.length,'Active programs'],[plans().filter(r=>r.type==='Decision'&&r.status==='Pending').length,'Pending decisions'],[ps.filter(r=>['Medium','High'].includes(riskOf(r))).length,'Programs at risk']].map(([n,t],i)=>'<div class="card" style="--c:'+['#3354ac','#8538a4','#cd6835'][i]+'"><small>'+t+'</small><strong>'+(problems.length?'—':n)+'</strong></div>').join('')+'</div>';
 if(!ps.length&&!plans().length)return strip+kit.empty({title:'No programs yet',text:'Add the first program, then its milestones, activities and decisions.',action:WRITE?{label:'Add program',action:'new:Program'}:undefined});
 const progs=panel('Programs',ps.length?table(['Program','Assets','Disease','Stage','Next milestone','Time to deadline','Budget · spent / forecast','Health',''],ps.map(r=>{const next=plans().filter(x=>x.type==='Milestone'&&!['Completed','Cancelled'].includes(x.status)&&ancestry(x).includes(r.id)).sort((a,b)=>cmp(forecast(a).end||'9999',forecast(b).end||'9999'))[0];
  return [link(r),E(r.asset||'—'),E(r.disease||'—'),stageTrack(r.stage),next?itemName(next):'—',deadline(r),money(r.spend)+' / '+money(forecast(r).budget),tag(r.status)+signals(r),editAction(r)];})):'<p class="pad muted">No programs yet.</p>');
 const decisions=plans().filter(x=>x.type==='Decision'&&!['Completed','Cancelled'].includes(x.status));
 const dec=panel('Upcoming decisions',decisions.length?table(['Decision','Due','Approver',''],decisions.sort((a,b)=>cmp(forecast(a).end||'9999',forecast(b).end||'9999')).map(r=>[E(r.name),date(forecast(r).end),E(r.owner||'—'),signals(r)+editAction(r)])):'<p class="pad muted">No open decisions.</p>');
 const queue=plans().filter(ready);
 const rq=queue.length?panel('Awaiting owner approval',table(['Plan item','Owner',''],queue.map(r=>[itemName(r),E(r.owner||'Unassigned'),'<button type="button" data-action="rec:'+E(r.id)+'">Review completion</button>']))):'';
 return strip+progs+dec+rq;}
function treeName(row){const r=row.r,label=itemName(r);
 if(r.type==='Milestone'&&row.kids)return '<div class="tree-label"><button type="button" class="milestone-toggle" data-action="toggle:'+E(r.id)+'" aria-expanded="'+!!row.open+'"><span class="caret" aria-hidden="true">'+(row.open?'▾':'▸')+'</span>'+label+'</button></div>';
 return '<div class="tree-label">'+label+'</div>';}
function workRows(rows){return rows.length?table(['Plan item','Type','Deadline','Budget','Owner','Status','Health',''],rows.map(row=>{const r=row.r,f=forecast(r),cells=[treeName(row),typeTag(r.type),date(f.end),money(f.budget),E(r.owner||'—'),tag(r.status),signals(r),editAction(r)];cells._id=r.id;return cells;}),st.sel):'<p class="pad">No plan items.</p>';}
function timeRows(rows,program){if(program)rows=[{r:program,depth:0}].concat(rows);
 const dates=outline().flatMap(({r})=>{const f=forecast(r);return [f.start,f.end].filter(Boolean).map(dayNo);});
 if(!rows.length)return '<p class="pad">No plan items.</p>';
 const lo=dates.length?Math.min(...dates):0,hi=dates.length?Math.max(...dates):1,span=Math.max(1,hi-lo),pos=s=>2+94*(dayNo(s)-lo)/span;
 const ticks=dates.length?[0,.25,.5,.75,1].map(v=>'<span>'+date(new Date((lo+span*v)*86400000).toISOString().slice(0,10))+'</span>').join(''):'';
 return '<div class="scroll"><div class="chart"><div class="chartrow"><div>Plan item</div><div class="ticks">'+ticks+'</div><div></div></div>'+rows.map(row=>{const r=row.r,f=forecast(r),a=f.start||f.end,b=f.end||a;
  const mark=a?'<span title="'+E(date(a)+' – '+date(b))+'" class="'+(r.type==='Decision'?'diamond':r.type==='Milestone'?'flag':'bar')+'" style="--c:'+COLORS[r.type]+';left:'+pos(a).toFixed(2)+'%;'+(point(r.type)?'':'width:'+Math.max(1,pos(b)-pos(a)).toFixed(2)+'%;')+'">'+(r.type==='Milestone'?'⚑':'')+'</span>':'<small>Unscheduled</small>';
  return '<div class="chartrow'+(st.sel===r.id?' selected-record':'')+'">'+(r===program?'<div><small>Program duration</small></div>':treeName(row))+'<div class="track">'+mark+'</div>'+editAction(r)+'</div>';}).join('')+'</div></div>';}
function programCards(view){const groups=new Map();for(const row of outline()){const p=programOf(row.r)[0]||null;if(!groups.has(p))groups.set(p,[]);if(p!==row.r)groups.get(p).push(row);}
 if(!plans().length)return toolbar()+kit.empty({title:'No plan items yet',text:'Add a program, then its milestones, activities and decisions.',action:WRITE?{label:'Add program',action:'new:Program'}:undefined});
 return toolbar()+([...groups].map(([p,rows])=>'<section class="panel"><div class="program-head"><h2>'+E(p?p.name:'Unassigned items')+'</h2>'+(p?'<span><small>'+date(forecast(p).start)+' – '+date(forecast(p).end)+'</small>'+tag(p.status)+signals(p)+editAction(p)+'</span>':'')+'</div>'+view(rows,p)+'</section>').join('')||panel('','<p class="pad">No matching items.</p>'));}
const work=()=>programCards(workRows);
const timeline=()=>programCards(timeRows)+(outline().length?'<div class="legend" aria-label="Timeline legend">'+TYPES.map(typeTag).join('')+'</div>':'');
function register(t){const rows=data.filter(r=>r.type===t),owners=[...new Set(rows.map(r=>r.owner).filter(Boolean))].sort();
 const filt='<div class="filters">'+selectFilter('owner','Responsible person',pairs(owners))+'<button type="button" data-action="filters:reset">Reset</button></div>';
 const shown=rows.filter(r=>!F.owner||r.owner===F.owner).sort((a,b)=>cmp(b.end,a.end));
 if(!rows.length)return kit.empty({title:'No '+t.toLowerCase()+'s recorded',text:t==='Deliverable'?'Log the evidence you receive against the plan item it completes.':t==='Risk'?'Log a risk against the items it affects; it flags them and the work that depends on them.':'Log a change with the revised dates or budgets of the items it affects.',action:canWrite('events')&&plans().length?{label:'Add '+t.toLowerCase(),action:'new:'+t}:undefined});
 return filt+panel('',shown.length?table([t,'Affected items','Date','Responsible person',...(t==='Risk'?['Severity','Status']:t==='Deliverable'?['Signed off by']:[]),'Files',''],shown.map(r=>[link(r),r.parents.map(get).filter(Boolean).map(x=>t==='Change'?E(x.name):itemName(x)).join('<br>')||'—',date(r.end),E(r.owner||'—'),...(t==='Risk'?[r.severity?tag(r.severity):'—',tag(r.status)]:t==='Deliverable'?[E(r.signoff||'—')]:[]),String(r.files.length),editAction(r)])):'<p class="pad muted">No '+t.toLowerCase()+'s for this person.</p>');}
function renderDigest(g){const body=(g.sections||[]).map(s=>'<h3>'+E(s.h)+'</h3>'+(s.p||[]).map(x=>'<p>'+E(x)+'</p>').join('')).join('')+(g.notes||[]).map(s=>'<h3>'+E(s.h)+'</h3>'+(s.p||[]).map(x=>'<p>'+E(x)+'</p>').join('')).join('');
 return '<article class="bigreport"><small>'+E(g.kind)+' · '+date(g.start)+' – '+date(g.end)+(g.live?' · built from the records now':' · saved')+'</small><h2>'+E(g.title)+'</h2>'+(body||'<p>Nothing recorded.</p>')+'</article>';}
function digest(){const D=st.digest,ps=plans().filter(x=>x.type==='Program').map(x=>[x.id,x.name]);
 const controls='<div class="tabs">'+['All','Weekly','Monthly'].map(x=>'<button type="button" data-action="mode:'+x+'" aria-pressed="'+(D.mode===x)+'">'+x+'</button>').join('')+'<label>Program <select data-action="digest:program" data-ui-state>'+opts([['','All programs'],...ps],D.program)+'</select></label></div>';
 if(!AS_OF)return controls+panel('','<p class="pad">The digest needs today’s date, which is not available.</p>');
 const live=['Weekly','Monthly'].filter(k=>D.mode==='All'||D.mode===k).map(k=>({...digestFor(k,D.program),id:'live:'+k,live:true}));
 const saved=R.digests.unbound?[]:savedDigests().filter(x=>(D.mode==='All'||x.kind===D.mode)&&(!D.program||x.program===D.program)).map(x=>({...x,sections:x.contents.sections,notes:x.contents.notes}));
 const list=live.concat(saved),cur=list.find(x=>x.id===D.pick)||list[0];
 const already=cur&&cur.live&&saved.some(x=>x.kind===cur.kind&&x.end===cur.end&&x.program===cur.program);
 const saveBtn=cur&&cur.live&&canWrite('digests')?'<div class="k-row" style="justify-content:flex-end;margin:-6px 0 12px">'+(already?'<small>A digest for this period is already in the archive.</small>':'')+'<button type="button" data-action="digest:save">Save to archive</button></div>':'';
 const others=list.filter(x=>x!==cur);
 return controls+saveBtn+panel('',renderDigest(cur))+panel('Digest archive',(R.digests.pending?'<p class="pad muted">Loading…</p>':others.map(x=>'<div class="entry line"><button type="button" class="link" data-action="report:'+E(x.id)+'">'+E(x.title)+'</button><small>'+E(x.kind)+' · '+date(x.end)+(x.live?' · current':'')+'</small></div>').join('')||'<p class="pad muted">No earlier digests for this selection.</p>'));}
function settingsPage(){if(!OWNER)return panel('','<p class="pad">Only the app’s owners can change its settings.</p>');
 if(!roleMap.settings)return panel('','<p class="pad">The settings table is not connected to this app.</p>');
 return '<div class="gearform">'+kit.settings({action:'settings:save',fields:[{name:'currency',label:'Budget currency',options:CURRENCIES,value:CURRENCY},{name:'date_format',label:'Date format',options:DATE_FORMATS,value:DATE_FORMAT}]},inp)+'</div>';}

/* ---------- the record form ---------- */
const field=(label,inner)=>'<label class="field">'+label+inner+'</label>';
/* A section that opens and closes (the prototype's <details>): closed sections are not drawn; their values stay in the draft. */
const DISC_DEFAULT=k=>{const p=P();return k==='links'||k==='forecasts'&&p.draft.parents.length>0||k.startsWith('ev')&&(!p.section||'ev'+p.section===k);};
function disc(key,label,content){const p=P(),o=p.open||{},isOpen=has(o,key)?!!o[key]:DISC_DEFAULT(key);
 return '<section class="disc"><button type="button" class="disc-toggle" data-action="disc:'+key+'" aria-expanded="'+isOpen+'"><span aria-hidden="true">'+(isOpen?'▾':'▸')+'</span> '+E(label)+'</button>'+(isOpen?'<div class="disc-body">'+content+'</div>':'')+'</section>';}
const inputF=(name,val,type='text',more='')=>'<input name="'+name+'" type="'+type+'" value="'+E(val==null?'':val)+'" data-action="draft" data-ui-state '+more+'>';
const selectF=(name,arr,v,more='')=>'<select name="'+name+'" data-action="draft" data-ui-state '+more+'>'+opts(arr,v)+'</select>';
const textF=(name,v,rows=3)=>'<textarea name="'+name+'" rows="'+rows+'" data-action="draft" data-ui-state>'+E(v||'')+'</textarea>';
function hierarchy(d,side,choices){const parent=side==='parents',rows=d.links[side].length?d.links[side]:[rel('')];
 return '<section class="hier"><h3>'+(parent?'Parent items':'Child items')+'</h3><small>'+(parent?'This item must be complete before the selected parent can start or finish.':'The selected child must be complete before this item can start or finish.')+' Applies when a dependency is selected.</small>'+
 rows.map((row,i)=>{const pick=choices.filter(x=>!rows.some((v,j)=>i!==j&&v.id===x.id)),child=get(row.id),isDecision=(parent?d.type:(child||{}).type)==='Decision';
  return '<div class="hier-row">'+field(parent?'Belongs to':'Child item',selectF('h_'+side+'_id_'+i,[['',parent?'No parent':'Select an item'],...pick.map(x=>[x.id,x.type+' · '+x.name])],row.id))+field('Dependency',selectF('h_'+side+'_rule_'+i,[['','Optional'],['start','Required to start'],['finish','Required to complete']],row.to))+(parent?'':'<button type="button" data-action="child:rm:'+i+'" aria-label="Remove child item">Remove</button>')+
  (isDecision&&row.to?field('Required decision outcome',selectF('h_'+side+'_out_'+i,pairs(OUTCOMES),row.outcome)):'')+
  (!parent&&child&&child.parents[0]&&child.parents[0]!==d.id?'<small class="move-hint">Saving moves this child from '+E((get(child.parents[0])||{}).name||'its parent')+'.</small>':'')+'</div>';}).join('')+(parent?'':'<button type="button" data-action="child:add">＋ Add child item</button>')+'</section>';}
function eventHistory(d){if(!d.id)return '<p class="muted" style="margin-top:12px">Deliverables, risks and changes can be added once this item is saved.</p>';const p=P();
 return EVENT_TYPES.map(t=>{const list=eventsFor(d,t);return disc('ev'+t,t+'s · '+list.length,list.map(x=>'<button type="button" class="history-entry" data-action="note:'+E(x.id)+'"><strong>'+E(x.name)+'</strong><small>'+[x.end?date(x.end):'',E(x.owner)].filter(Boolean).join(' · ')+'</small></button>').join('')+(canWrite('events')?'<button type="button" data-action="note:'+t+'">＋ Add '+t.toLowerCase()+'</button>':''));}).join('');}
function approvalBox(d){const decision=d.type==='Decision'?field('Decision outcome',selectF('decisionResult',pairs(OUTCOMES),d.decisionResult||'Approved')):'';
 if(!d.id||['Cancelled','On hold','Completed'].includes(d.status))return decision+(d.approved&&d.status==='Completed'?'<section class="approval"><span>Completion approved for '+E(d.approved.by)+' · '+date(d.approved.date)+'</span></section>':'');
 const r=get(d.id),okDeps=r&&effective(r).every(met);if(!okDeps)return decision;
 return decision+'<section class="approval"><span>'+E(d.owner||'Unassigned owner')+(ready(r)?' · Deliverable received. Ready for completion review.':' · Completion review')+'</span>'+(canWrite('items')?'<button type="button" data-action="approve">Approve completion</button>':'')+'</section>';}
function orgSection(d){const orgs=R.organizations.rows,p=P(),o=p.org;
 if(R.organizations.unbound)return '';if(R.organizations.pending)return '<section class="participants"><h3>Organizations</h3><p class="muted">Loading…</p></section>';
 const chosen=d.orgIds.map(id=>orgs.find(x=>x.id===id)).filter(Boolean);
 let html='<section class="participants"><h3>Organizations</h3>'+chosen.map(x=>'<div class="org-row"><div><span>'+E(x.data.name)+'</span><small>'+E(contactsOf(x.id).map(c=>c.name).join(' · '))+'</small></div>'+(canWrite('organizations')?'<button type="button" class="edit-action" data-action="org:edit:'+E(x.id)+'" aria-label="Edit '+E(x.data.name)+'" title="Edit organization">'+icon('pencil')+'</button>':'')+'<button type="button" aria-label="Remove organization" data-action="org:rm:'+E(x.id)+'">×</button></div>').join('');
 const free=orgs.filter(x=>!d.orgIds.includes(x.id)).sort((a,b)=>cmp(a.data.name,b.data.name));
 html+='<div class="inline-field"><select name="org_pick" aria-label="Select organization" data-action="draft" data-ui-state>'+opts([['','Select an organization'],...free.map(x=>[x.id,str(x.data.name)])],p.orgPick||'')+'</select><button type="button" data-action="org:add">Add</button></div>';
 if(o)html+='<div class="risk-summary"><strong>'+(o.id?'Edit organization':'Add organization')+'</strong>'+field('Organization name','<input name="org_name" value="'+E(o.name)+'" data-action="draft" data-ui-state>')+(o.id&&roleMap.people?field('Contact persons','<input name="org_contacts" value="'+E(o.contacts)+'" placeholder="Names, separated by commas" data-action="draft" data-ui-state>'):'<small>'+(roleMap.people?'Contact persons can be added once the organization is saved.':'')+'</small>')+(o.error?'<p class="form-error" role="alert">'+E(o.error)+'</p>':'')+'<div class="k-row" style="margin-top:10px"><button type="button" data-action="org:cancel">Cancel</button><button type="button" class="primary" data-action="org:store">Use organization</button></div></div>';
 else if(canWrite('organizations'))html+='<p><button type="button" data-action="org:new" style="margin-top:8px">＋ Add organization</button></p>';
 return html+'</section>';}
function membersSection(d){const p=P(),names=[...new Set(plans().concat(data.filter(aux)).flatMap(x=>[x.owner,...x.members]).filter(Boolean))].sort();
 return '<section class="participants"><h3>Team members</h3>'+d.members.map(v=>'<button class="chip" type="button" data-action="member:rm:'+E(v)+'">'+E(v)+' ×</button>').join(' ')+'<div class="inline-field"><select name="member_pick" aria-label="Team member" data-action="draft" data-ui-state>'+opts([['','Find a person'],...names.filter(n=>!d.members.includes(n)).map(n=>[n,n])],p.memberPick||'')+'</select><input name="member_name" aria-label="Or add a new name" placeholder="Or add a name" value="'+E(p.member||'')+'" data-action="draft" data-ui-state><button type="button" data-action="member:add">Add</button></div></section>';}
function filesSection(d){const up=inp.saved&&(aux(d)?canWrite('events'):canWrite('items'));
 return '<section class="participants"><h3>Files</h3>'+d.files.map((f,i)=>'<div class="line"><span>'+E(f.n)+'</span><button type="button" data-action="file:rm:'+i+'">Remove</button></div>').join('')+(up?'<button type="button" data-trialy-document="upload draft">Upload a file</button>':'<small>'+(inp.saved?'You cannot add files here.':'Files can be added once the app is saved.')+'</small>')+(d.files.length?'<p><small>Files are kept in TrialAgents Documents.</small></p>':'')+'</section>';}
function footer(p,d){const confirm=p.confirm==='delete'?'<div class="confirm"><span>Delete this record? It is archived with its history.</span><button type="button" data-action="confirm:cancel">Keep</button><button type="button" class="primary" data-action="delete:confirm">Delete</button></div>':p.confirm==='approve'?'<div class="confirm"><span>Record completion approval by '+E(d.owner)+'?</span><button type="button" data-action="confirm:cancel">Cancel</button><button type="button" class="primary" data-action="approve:confirm">Approve</button></div>':'';
 const can=aux(d)?canWrite('events'):canWrite('items'),isDirty=dirty();
 return (p.error?'<p class="form-error" role="alert">'+E(p.error)+'</p>':'')+confirm+'<div class="save">'+(d.id&&can?'<button type="button" class="danger" data-action="delete">Delete</button><button type="button" data-action="duplicate">Duplicate</button>':'')+'<button type="button" data-action="panel:close">'+(isDirty?'Ignore changes':'Cancel')+'</button>'+(can&&isDirty?'<button class="primary" type="submit">Save</button>':'')+'</div>';}
function planForm(p,d){const t=d.type,allowed=t==='Program'?[]:t==='Milestone'?['Program']:['Program','Milestone'];
 const homes=plans().filter(x=>allowed.includes(x.type)&&x.id!==d.id),kids=plans().filter(x=>x.id!==d.id&&x.type!=='Program'&&(t==='Program'||t==='Milestone'&&x.type!=='Milestone'));
 const r=d.id?get(d.id):null,f=r?forecast(r):null;
 return field('Record type',selectF('type',TYPES.concat(EVENT_TYPES).map(v=>[v,v]),t,d.id?'disabled':''))+field('Name *',inputF('name',d.name,'text',(['Program','Milestone'].includes(t)?'class="plan-name" ':'')+'required'))+field('Description',textF('description',d.description))+
 (t==='Program'?'<div class="grid">'+field('Assets',inputF('asset',d.asset))+field('Stage',selectF('stage',[['','—'],...pairs(STAGES)],d.stage))+'</div>'+field('Disease',inputF('disease',d.disease)):'')+
 '<div class="grid">'+(point(t)?'':field('Start date',inputF('start',d.start,'date')))+field(point(t)?'Baseline target date':'Baseline end date',inputF('end',d.end,'date'))+'</div>'+
 disc('tolerance','Timeline tolerance','<div class="grid">'+field('Earliest date',inputF('early',d.early,'date'))+field('Latest date',inputF('late',d.late,'date'))+'</div>')+
 '<div class="grid">'+field('Owner',inputF('owner',d.owner))+field(t==='Decision'?'Decision status':'Status',selectF('status',pairs(STATUSES),d.status))+'</div>'+
 (r?'<div class="risk-summary"><strong>Current forecast</strong>　'+date(f.end)+' · '+money(f.budget)+'</div><section class="risk-summary"><strong>Risk exposure</strong> '+tag(riskOf(r))+(linkedRisks(r).length?'<p>'+linkedRisks(r).map(x=>E(x.name)).join(' · ')+'</p>':'')+'</section>':'')+
 approvalBox(d)+disc('links','Linked items',(t==='Program'?'':hierarchy(d,'parents',homes))+(['Program','Milestone'].includes(t)?(d.id?hierarchy(d,'children',kids):'<p class="muted">Child items can be added once this item is saved.</p>'):''))+eventHistory(d)+
 disc('budget','Budget','<div class="grid">'+field('Approved budget ('+CURRENCY+')',inputF('budget',d.budget,'number','min="0" step="any"'))+field('Spend to date ('+CURRENCY+')',inputF('spend',d.spend,'number','min="0" step="any"'))+field('Contingency ('+CURRENCY+')',inputF('reserve',d.reserve,'number','min="0" step="any"'))+'</div>')+
 orgSection(d)+membersSection(d)+filesSection(d);}
function eventForm(p,d){const isRisk=d.type==='Risk',deliver=d.type==='Deliverable',choices=plans().filter(x=>!d.parents.includes(x.id));
 return (d.id?'':field('Record type',selectF('type',TYPES.concat(EVENT_TYPES).map(v=>[v,v]),d.type)))+field('Name *',inputF('name',d.name,'text','required'))+
 '<div class="field">Affected plan items'+d.parents.map(id=>{const x=get(id);return x?'<button class="chip" type="button" data-action="unpick:'+E(id)+'" aria-label="Remove '+E(x.name)+'">'+typeTag(x.type)+' '+itemName(x)+' ×</button>':'';}).join('')+'<select data-action="pick:item" aria-label="Add an affected plan item" data-ui-state>'+opts([['','Add an item…'],...choices.map(x=>[x.id,x.type+' · '+x.name+((programOf(x)[0]&&programOf(x)[0]!==x)?' ('+programOf(x)[0].name+')':'')])],'')+'</select></div>'+
 field(isRisk?'Risk and mitigation':deliver?'Content':'What changed',textF('description',d.description,4))+
 '<div class="grid">'+field('Date',inputF('end',d.end,'date'))+field('Responsible person',inputF('owner',d.owner))+'</div>'+
 (deliver?'<div class="grid">'+field('Signed off by',inputF('signoff',d.signoff))+field('Format',selectF('format',pairs(['',...FORMATS]),d.format))+'</div>':'')+
 (isRisk?'<div class="grid">'+field('Severity',selectF('severity',pairs(['',...LEVELS.slice(1)]),d.severity))+field('Status',selectF('status',pairs(['Open','Closed']),d.status||'Open'))+'</div>':'')+
 (d.type==='Change'?field('Location or workstream',inputF('place',d.place))+disc('forecasts','Forecast changes by item',(d.parents.length?d.parents.map(id=>{const x=get(id);if(!x)return '';const f=d.forecasts[id]||{};return '<div class="entry">'+typeTag(x.type)+' '+itemName(x)+'<div class="grid">'+field('Revised date',inputF('fd_'+id,f.end,'date'))+field('Revised budget ('+CURRENCY+')',inputF('fb_'+id,f.budget,'number','min="0" step="any"'))+'</div></div>';}).join(''):'<p class="muted">Add the affected plan items first.</p>')):'')+
 orgSection(d)+membersSection(d)+filesSection(d);}
function editorPanel(){const p=st.panel;if(!p)return '';
 if(p.kind==='choose')return kit.panel({title:'Add record',close:'panel:close',body:[['Plan',['Program','Milestone','Decision','Activity'],canWrite('items')],['Events',EVENT_TYPES,canWrite('events')&&plans().length>0]].filter(g=>g[2]).map(([name,types])=>'<section class="choice-group"><h3>'+name+'</h3><div class="newchoices">'+types.map(t=>'<button type="button" data-action="new:'+t+'">'+recordIcon(t)+E(t)+'</button>').join('')+'</div></section>').join('')||'<p>You cannot add records in this app.</p>'});
 const d=p.draft;
 return kit.panel({title:(d.id?'Edit ':'Add ')+d.type.toLowerCase(),close:'panel:close',body:'<form class="pl-form" data-action="form:save"><input type="hidden" name="_f" value="record">'+(aux(d)?eventForm(p,d):planForm(p,d))+footer(p,d)+'</form>'});}

/* ---------- page ---------- */
const NAMES=Object.fromEntries(SCREENS);
const rail='<nav class="pl-rail" aria-label="Pipeline screens">'+SCREENS.filter(s=>s[0]!=='settings'||OWNER).map(([id,label])=>'<button type="button" data-action="nav:'+id+'"'+(st.screen===id?' aria-current="page"':'')+' aria-label="'+label+'" title="'+label+'">'+icon(id)+'<span>'+label+'</span></button>').join('')+'</nav>';
let body;
if(PENDING&&!plans().length)body='<p class="muted">Loading…</p>';
else{const s=st.screen;
 body=title(s==='overview'?'Pipeline Overview':NAMES[s]||'Overview',!['digest','settings'].includes(s))+(problems.length?'<div class="warnbox">'+problems.map(E).join(' ')+'</div>':'')+(PENDING?'<p class="muted">Loading…</p>':'')+
 (s==='programs'?work():s==='timeline'?timeline():REGISTER[s]?register(REGISTER[s]):s==='digest'?digest():s==='settings'?settingsPage():overview());}
// While the side panel is open the page behind it is inert, as behind a modal dialog.
const html='<div class="k-app pl"><div class="pl-layout"'+(st.panel?' inert':'')+'>'+rail+'<main class="pl-main">'+body+'</main></div>'+editorPanel()+'</div>';
return {html,css:PIPELINE_CSS,state:st,context:{screen:st.screen,program:F.program||''},...(NOTICE?{notice:NOTICE}:{})};
