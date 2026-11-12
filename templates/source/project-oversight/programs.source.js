const templateLayoutSchema={"screens":[{"id":"overview","label":"Overview"},{"id":"timeline","label":"Timeline"},{"id":"plan","label":"Plan"},{"id":"decisions","label":"Gates & decisions"},{"id":"raid","label":"RAID"},{"id":"updates","label":"Updates"},{"id":"settings","label":"Settings"}],"groups":{"items":[{"id":"name","label":"Item"},{"id":"program_id","label":"Program"},{"id":"function","label":"Function"},{"id":"owner","label":"Owner"},{"id":"start_date","label":"Start"},{"id":"end_date","label":"End"},{"id":"baseline_end","label":"Baseline end"},{"id":"slip","label":"Slip"},{"id":"status","label":"Status"},{"id":"predecessor_id","label":"Predecessor"}],"raid":[{"id":"name","label":"Entry"},{"id":"program_id","label":"Program"},{"id":"raid_type","label":"Type"},{"id":"score","label":"Likelihood × impact"},{"id":"owner","label":"Owner"},{"id":"next_review","label":"Next review"},{"id":"status","label":"Status"}],"decisions":[{"id":"name","label":"Decision"},{"id":"program_id","label":"Program"},{"id":"kind","label":"Kind"},{"id":"target_date","label":"Target"},{"id":"outcome","label":"Outcome"},{"id":"decided_on","label":"Decided on"}]}};
/* TrialAgents Programs 2.0.0 (life.project-oversight) | frontend-js function body. No DOM, network or browser storage.
 * Returns {html,css,state}. Data comes only from authorized bindings; every write is an exact records.propose reviewed by TrialAgents.
 * The as-of date is today's date from the app runtime (a pinned asOfOverride only in previews and tests). Stored records never derive values from the clock.
 */
const cfg=typeof templateConfiguration==='object'&&templateConfiguration?templateConfiguration:{};
const bindings=Array.isArray(templateBindings)?templateBindings:[];
const inp=input||{};
const event=inp.event||{kind:'open',action:'',value:null,form:{}};
const action=String(event.action||'');
const form=event.form&&typeof event.form==='object'?event.form:{};

/* ---------- helpers ---------- */
const esc=v=>String(v===null||v===undefined?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const has=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
const num=(v,otherwise=null)=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v))?Number(v):otherwise;
const bool=v=>v===true||v==='true'||v==='on'||v==='1';
const grouped=n=>{const s=Math.abs(Math.round(n)).toString();return (n<0?'−':'')+s.replace(/\B(?=(\d{3})+(?!\d))/g,',');};
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const validDate=v=>{const t=String(v||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(t))return '';const d=new Date(t+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===t?t:'';};
const dayNo=d=>Math.round(Date.UTC(Number(d.slice(0,4)),Number(d.slice(5,7))-1,Number(d.slice(8,10)))/86400000);
const fromDay=n=>new Date(n*86400000).toISOString().slice(0,10);
const addDays=(d,n)=>d?fromDay(dayNo(d)+Math.round(n)):'';
const diffDays=(a,b)=>dayNo(b)-dayNo(a);
const ym=v=>{const t=String(v||'');if(/^\d{4}-(0[1-9]|1[0-2])$/.test(t))return t;const d=validDate(t);return d?d.slice(0,7):'';};
const addMonths=(m,n)=>{const y=Number(m.slice(0,4)),k=Number(m.slice(5,7))-1+n;const yy=y+Math.floor(k/12),mm=((k%12)+12)%12+1;return yy+'-'+String(mm).padStart(2,'0');};
const diffMonths=(a,b)=>(Number(b.slice(0,4))-Number(a.slice(0,4)))*12+Number(b.slice(5,7))-Number(a.slice(5,7));
const monthLabel=m=>m?MONTHS[Number(m.slice(5,7))-1]+' '+m.slice(0,4):'—';
const dateLabel=d=>d?Number(d.slice(8,10))+' '+MONTHS[Number(d.slice(5,7))-1]+' '+d.slice(0,4):'—';
const lastDay=m=>new Date(Date.UTC(Number(m.slice(0,4)),Number(m.slice(5,7)),0)).toISOString().slice(0,10);
const plural=(n,w)=>n+' '+w+(Math.abs(n)===1?'':'s');
const label=v=>String(v===null||v===undefined||v===''?'—':v).replace(/_/g,' ');
const cap=s=>{s=label(s);return s.charAt(0).toUpperCase()+s.slice(1);};
const parseJSON=v=>{try{const x=JSON.parse(String(v||''));return x&&typeof x==='object'?x:null;}catch(e){return null;}};

/* ---------- vocabulary ---------- */
const FUNCTIONS=['cmc','nonclinical','clinical','regulatory','other'];
const FN_LABEL={cmc:'CMC',nonclinical:'Nonclinical',clinical:'Clinical',regulatory:'Regulatory',other:'Other'};
const STAGES=['discovery','preclinical','ind_enabling','phase_1','phase_2','phase_3','registration','approved'];
const STAGE_LABEL={discovery:'Discovery',preclinical:'Preclinical',ind_enabling:'IND-enabling',phase_1:'Phase 1',phase_2:'Phase 2',phase_3:'Phase 3',registration:'Registration',approved:'Approved'};
const MODALITIES=['small_molecule','biologic','antibody','cell_therapy','gene_therapy','rna','vaccine','device','other'];
const HEALTH=['unassessed','green','amber','red'];
const ITEM_STATUS=['planned','in_progress','done','at_risk','cancelled'];
const COMMITTED=['planned','in_progress','at_risk'];
const REASONS=['scientific','cro_vendor','regulatory','manufacturing','funding','other'];
const REASON_LABEL={scientific:'Scientific',cro_vendor:'CRO or vendor',regulatory:'Regulatory',manufacturing:'Manufacturing',funding:'Funding',other:'Other'};
const OUTCOMES=['pending','go','no_go','conditional','decided'];
const OUTCOME_LABEL={pending:'Pending',go:'Go',no_go:'No-go',conditional:'Conditional',decided:'Decided'};
const RAID_TYPES=['risk','assumption','issue','dependency'];
const LMH=['low','medium','high'];
const STALE_HEALTH_DAYS=45;

/* ---------- logical schema (real keys come from tableMap) ---------- */
const ref=role=>({kind:'ref',ref:role});
const S={
 programs:[{key:'name',label:'Name',kind:'text',required:true},{key:'code',label:'Code',kind:'text'},{key:'indication',label:'Indication',kind:'text'},{key:'modality',label:'Modality',kind:'select',options:MODALITIES},{key:'stage',label:'Stage',kind:'select',options:STAGES,required:true},{key:'lead',label:'Lead',kind:'person'},{key:'status',label:'Status',kind:'select',options:['active','paused','stopped','partnered']},{key:'health',label:'Health',kind:'select',options:HEALTH},{key:'health_rationale',label:'Health rationale',kind:'longtext'},{key:'health_date',label:'Health assessed on',kind:'date'},{key:'archived',label:'Archived',kind:'boolean'}],
 people:[{key:'name',label:'Name',kind:'text',required:true},{key:'title',label:'Title',kind:'text'},{key:'archived',label:'Archived',kind:'boolean'}],
 items:[{key:'name',label:'Name',kind:'text',required:true},{key:'program_id',label:'Program',...ref('programs'),required:true},{key:'item_type',label:'Item type',kind:'select',options:['milestone','activity'],required:true},{key:'function',label:'Function',kind:'select',options:FUNCTIONS,required:true},{key:'owner',label:'Owner',kind:'person'},{key:'start_date',label:'Start date',kind:'date'},{key:'end_date',label:'End date (milestone date)',kind:'date',required:true},{key:'baseline_start',label:'Baseline start',kind:'baseline'},{key:'baseline_end',label:'Baseline end',kind:'baseline'},{key:'status',label:'Status',kind:'select',options:ITEM_STATUS,required:true},{key:'predecessor_id',label:'Predecessor (finish-to-start)',...ref('items')},{key:'is_key',label:'Key milestone',kind:'boolean'},{key:'notes',label:'Notes',kind:'longtext'},{key:'archived',label:'Archived',kind:'boolean'}],
 slips:[{key:'plan_item_id',label:'Plan item',kind:'text',required:true},{key:'changed_on',label:'Changed on',kind:'date',required:true},{key:'old_end',label:'Old end',kind:'date',required:true},{key:'new_end',label:'New end',kind:'date',required:true},{key:'days',label:'Days',kind:'number',required:true},{key:'reason',label:'Reason',kind:'select',options:REASONS,required:true},{key:'detail',label:'Detail',kind:'longtext'}],
 decisions:[{key:'name',label:'Name',kind:'text',required:true},{key:'program_id',label:'Program',...ref('programs'),required:true},{key:'kind',label:'Kind',kind:'select',options:['gate','decision'],required:true},{key:'target_date',label:'Target date',kind:'date'},{key:'criteria',label:'Criteria (one per line: [met], [not met] or [open] then the criterion)',kind:'longtext'},{key:'outcome',label:'Outcome',kind:'select',options:OUTCOMES},{key:'decided_on',label:'Decided on',kind:'date'},{key:'approver',label:'Approver',kind:'person'},{key:'options',label:'Options considered',kind:'longtext'},{key:'rationale',label:'Rationale',kind:'longtext'},{key:'linked_item_id',label:'Affects',kind:'link'},{key:'archived',label:'Archived',kind:'boolean'}],
 raid:[{key:'name',label:'Name',kind:'text',required:true},{key:'program_id',label:'Program',...ref('programs')},{key:'raid_type',label:'Type',kind:'select',options:RAID_TYPES,required:true},{key:'likelihood',label:'Likelihood',kind:'select',options:LMH},{key:'impact',label:'Impact',kind:'select',options:LMH},{key:'owner',label:'Owner',kind:'person'},{key:'mitigation',label:'Mitigation',kind:'longtext'},{key:'next_review',label:'Next review',kind:'date'},{key:'status',label:'Status',kind:'select',options:['open','monitoring','closed'],required:true},{key:'linked_item_id',label:'Linked item',kind:'link'},{key:'archived',label:'Archived',kind:'boolean'}],
 updates:[{key:'program_id',label:'Program',...ref('programs'),required:true},{key:'month',label:'Month',kind:'month',required:true},{key:'health',label:'Health',kind:'select',options:HEALTH,required:true},{key:'rationale',label:'Rationale',kind:'longtext'},{key:'summary',label:'Summary',kind:'longtext'},{key:'next_steps',label:'Next steps',kind:'longtext'},{key:'author',label:'Author',kind:'person'}],
 reports:[{key:'month',label:'Month',kind:'month',required:true},{key:'title',label:'Title',kind:'text',required:true},{key:'narrative',label:'Narrative',kind:'longtext'},{key:'contents',label:'Contents',kind:'frozen'},{key:'saved_on',label:'Saved on',kind:'frozen'}],
 settings:[{key:'functions',label:'Function lanes (comma list, in order)',kind:'text'},{key:'stages',label:'Stages (comma list, in order)',kind:'text'},{key:'health_definitions',label:'Health definitions',kind:'longtext'},{key:'due_soon_days',label:'Due-soon window (days)',kind:'number'},{key:'update_day',label:'Monthly update day (1–28)',kind:'number'}],
 /* Cash forecast: Runway's month closes when linked (read-only), otherwise monthly closing cash entered here. */
 closes:[{key:'month',label:'Month',kind:'month',required:true},{key:'closing_balance',label:'Closing cash',kind:'number',required:true},{key:'currency',label:'Currency',kind:'select',options:['USD','EUR','GBP','CHF','CAD','AUD','JPY','CNY','SEK','DKK','NOK','INR'],required:true},{key:'closed',label:'Closed',kind:'frozen'},{key:'metrics',label:'Metrics',kind:'frozen'}]
};
const ROLE_LABEL={programs:'program',people:'person',items:'plan item',slips:'slip',decisions:'decision',raid:'RAID entry',updates:'monthly update',reports:'leadership report',settings:'settings',closes:'cash forecast month'};
/* Stable role keys (modular apps rule 5): core contract v1 for shared tables, programs.* for this app; runway.month_closes is an integration: Runway's read-only output once linked, otherwise this app's own cash forecast. */
const ROLE_KEY={programs:'programs',people:'people',items:'programs.plan_items',slips:'programs.slips',decisions:'programs.decisions',raid:'programs.raid',updates:'programs.updates',reports:'programs.reports',settings:'programs.settings',closes:'runway.month_closes'};
const READ_ONLY_ROLES=['people'];

/* ---------- bindings and bounded reads ---------- */
let mapping={};try{mapping=JSON.parse(cfg.tableMap||'{}');}catch(e){mapping={};}
const roleMap={};
for(const role of Object.keys(S)){
 const m=mapping[ROLE_KEY[role]],b=m&&bindings.find(x=>x.typeId===m.typeId);
 if(!m||!b)continue;
 const fields={};for(const f of S[role]){const k=m.fields&&m.fields[f.key]!==undefined?m.fields[f.key]:f.key;if(typeof k==='string'&&(b.fields||[]).includes(k))fields[f.key]=k;}
 roleMap[role]={typeId:m.typeId,fields,writable:READ_ONLY_ROLES.includes(role)?[]:(Array.isArray(m.writableFields)?m.writableFields:[]).filter(x=>fields[x])};
}
const PAGE=100,MAX_PAGES=8;let callsLeft=80;const cache={};
function readRole(role){
 if(cache[role])return cache[role];const m=roleMap[role];
 if(!m)return cache[role]={rows:[],allRows:[],complete:false,unbound:true,unavailable:false,total:0,truncated:false,invalid:0};
 const rows=[];let offset=0,total=null,complete=false,unavailable=false,truncated=false,invalid=0;
 for(let page=0;page<MAX_PAGES;page++){
  if(callsLeft<=0){truncated=true;break;}callsLeft--;
  let p;try{p=tools.call('records.read',{typeId:m.typeId,limit:PAGE,offset,filters:{}});}catch(e){unavailable=true;break;}
  if(!p||p.unavailable){unavailable=true;break;}
  const chunk=Array.isArray(p.rows)?p.rows:[];total=p.total===null||p.total===undefined||!Number.isFinite(Number(p.total))?null:Number(p.total);
  for(const r of chunk){const data={};for(const [logical,real] of Object.entries(m.fields))if(has(r.data,real)){const v=r.data[real];if(v!==null&&typeof v==='object'){invalid++;continue;}data[logical]=v;}rows.push({id:String(r.id),version:r.version,data});}
  offset+=chunk.length;
  if(total!==null&&offset>=total){complete=true;break;}
  if(chunk.length<PAGE)break;
  if(page===MAX_PAGES-1)truncated=true;
 }
 return cache[role]={rows:rows.filter(r=>!bool(r.data.archived)),allRows:rows,total:total===null?rows.length:total,complete,unavailable,unbound:false,truncated,invalid};
}
const canWrite=role=>!!inp.saved&&!!inp.writable&&cfg.readOnly!==true&&!!roleMap[role]&&roleMap[role].writable.length>0;
const writableField=(role,key)=>canWrite(role)&&roleMap[role].writable.includes(key);

/* ---------- state and layout ---------- */
const SCREENS=templateLayoutSchema.screens;
const DESC={overview:'Every program at a glance: health, next milestones, slips and what needs attention.',timeline:'Integrated timeline by program and function, with baselines, the critical path and cash at key milestones.',plan:'Milestones and key activities with owners, dates, baselines and slip history.',decisions:'Stage gates with criteria and outcomes, and the decisions log.',raid:'Risks, assumptions, issues and dependencies, by likelihood and impact.',updates:'Monthly program updates and frozen leadership reports.',settings:'Function lanes, stages, health definitions and the due-soon window.'};
const st=JSON.parse(JSON.stringify(inp.state||{}));
{
 let profile={};try{profile=JSON.parse(cfg.layoutProfile||'{}');}catch(e){profile={};}
 const groups=templateLayoutSchema.groups;
 const tabs=Array.isArray(profile.tabs)?profile.tabs.filter(id=>SCREENS.some(s=>s.id===id)):[];
 const cols={};for(const g of Object.keys(groups)){const ids=groups[g].map(x=>x.id),saved=profile.cols&&Array.isArray(profile.cols[g])?profile.cols[g].filter(k=>ids.includes(k)):[];cols[g]=[...new Set(saved.concat(ids))];}
 // Saved configuration always wins over any stale layout carried in UI state.
 st.layout={tabs:[...new Set(tabs.concat(SCREENS.map(s=>s.id)))],cols,visible:profile.visible&&typeof profile.visible==='object'?profile.visible:{},heading:String(profile.heading||cfg.heading||'Programs').slice(0,100)};
}
st.section=String(st.section||'overview');st.page=Math.max(0,Number(st.page)||0);st.query=String(st.query||'').slice(0,100);
st.filters=st.filters&&typeof st.filters==='object'?st.filters:{};
st.tl=st.tl&&typeof st.tl==='object'?st.tl:{program:'',fn:'',page:0};
st.upTab=['updates','report','archive'].includes(st.upTab)?st.upTab:'updates';
const note=v=>{st.notice=String(v||'').slice(0,500);};
const sections=st.layout.tabs.map(id=>SCREENS.find(s=>s.id===id)).filter(s=>s&&st.layout.visible[s.id]!==false);
if(!sections.some(s=>s.id===st.section))st.section=(sections[0]||SCREENS[0]).id;

/* ---------- data ---------- */
const R={};for(const role of ['programs','items','slips','decisions','raid','updates','reports','settings','people','closes'])R[role]=readRole(role);
const CORE=['programs','items','slips','decisions','raid','updates'];
const readProblems=[];
for(const role of CORE.concat(['reports','settings'])){const r=R[role],n=cap(ROLE_LABEL[role])+'s';
 if(r.unbound)readProblems.push(n+' table is not connected to this app.');
 else if(r.unavailable)readProblems.push('You cannot read the '+ROLE_LABEL[role]+' table.');
 else if(!r.complete)readProblems.push(n+': partial read ('+r.allRows.length+' of '+(r.truncated||r.total>r.allRows.length?(r.total>r.allRows.length?r.total:'more than '+r.allRows.length):'an unknown number of')+' rows).');
 if(r.invalid)readProblems.push(n+': '+plural(r.invalid,'value')+' with an invalid (non-scalar) shape ignored.');}
const exact=readProblems.length===0;
const itemsExact=!R.items.unbound&&!R.items.unavailable&&R.items.complete;
const settingsRow=R.settings.rows[0]||null;const SET=settingsRow?settingsRow.data:{};
const listSetting=(v,allowed)=>{const l=String(v||'').split(',').map(x=>x.trim().toLowerCase()).filter(x=>allowed.includes(x));return l.length?[...new Set(l)]:allowed.slice();};
const FN_ORDER=listSetting(SET.functions,FUNCTIONS),STAGE_ORDER=listSetting(SET.stages,STAGES);
const DUE_SOON=Math.min(365,Math.max(7,Math.round(num(SET.due_soon_days,90)||90)));
const UPDATE_DAY=Math.min(28,Math.max(1,Math.round(num(SET.update_day,5)||5)));

/* As-of date: the runtime clock when it gives a valid date; a pinned override in previews/tests; otherwise the user's control,
 * defaulting to the end of the latest updated month. It only filters the view; nothing stored is derived from it. */
const CLOCK=(()=>{try{return validDate(new Date().toISOString());}catch(e){return '';}})();
const latestUpdateMonth=R.updates.rows.map(r=>ym(r.data.month)).filter(Boolean).sort().pop()||'';
const AS_OF_SOURCE=validDate(cfg.asOfOverride)?'pinned':CLOCK?'today':validDate(st.asOf)?'control':'default';
const AS_OF=AS_OF_SOURCE==='pinned'?validDate(cfg.asOfOverride):AS_OF_SOURCE==='today'?CLOCK:AS_OF_SOURCE==='control'?validDate(st.asOf):latestUpdateMonth?lastDay(latestUpdateMonth):'';

const progRow=id=>R.programs.allRows.find(r=>r.id===id)||null;
function progName(id){if(!id)return 'No program';if(R.programs.unbound)return 'Program not connected';if(R.programs.unavailable)return 'Program unavailable';const p=progRow(id);if(!p)return 'Program unavailable';return String(p.data.name||'Unnamed program')+(bool(p.data.archived)?' (archived)':'');}
const PROGRAMS=R.programs.rows.slice().sort((a,b)=>String(a.data.name||'').localeCompare(String(b.data.name||'')));
const programOptions=()=>PROGRAMS.map(p=>[p.id,String(p.data.name||'Unnamed')]);
const itemRow=id=>R.items.allRows.find(r=>r.id===id)||null;
const ITEMS=R.items.rows.map(r=>({id:r.id,version:r.version,...r.data,start_date:validDate(r.data.start_date),end_date:validDate(r.data.end_date),baseline_start:validDate(r.data.baseline_start),baseline_end:validDate(r.data.baseline_end)}));
const ITEM=Object.fromEntries(ITEMS.map(x=>[x.id,x]));
function itemName(id){if(!id)return '—';const r=itemRow(id);if(!r)return 'Item unavailable';return String(r.data.name||'Unnamed item')+(bool(r.data.archived)?' (archived)':'');}
const isMilestone=x=>x.item_type==='milestone';
const isKey=x=>isMilestone(x)&&bool(x.is_key)&&x.status!=='cancelled';
const anchor=x=>x.start_date||x.end_date;

/* ---------- calculations ---------- */
// Driving path: the item's chain of predecessors, root first. A cycle or a missing, archived or cancelled predecessor stops the walk.
function chainOf(id){const out=[],seen=new Set();let cur=ITEM[id],broken='';
 while(cur){if(seen.has(cur.id))return {chain:out.reverse(),cycle:true,broken:'cycle'};seen.add(cur.id);out.push(cur.id);
  const p=cur.predecessor_id;if(!p)break;const nx=ITEM[p];
  if(!nx){broken=itemRow(p)?'archived predecessor':'unavailable predecessor';break;}
  if(nx.status==='cancelled'){broken='cancelled predecessor';break;}cur=nx;}
 return {chain:out.reverse(),cycle:false,broken};}
const SUCC={};for(const x of ITEMS)if(x.predecessor_id){(SUCC[x.predecessor_id]=SUCC[x.predecessor_id]||[]).push(x.id);}
function cyclesIn(list){const bad=new Set();for(const x of list){const c=chainOf(x.id);if(c.cycle)for(const id of c.chain)bad.add(id);}return bad;}
// Critical path per program: the finish-to-start chain through predecessor_id that ends at the program's latest key milestone.
function criticalFor(pid){
 const list=ITEMS.filter(x=>x.program_id===pid);
 if(!itemsExact)return {state:'partial',ids:[],target:null};
 const cyc=cyclesIn(list);if(cyc.size)return {state:'cycle',ids:[],target:null,cycle:[...cyc]};
 const keys=list.filter(x=>isKey(x)&&x.end_date).sort((a,b)=>b.end_date.localeCompare(a.end_date));
 const fallback=list.filter(x=>isMilestone(x)&&x.status!=='cancelled'&&x.end_date).sort((a,b)=>b.end_date.localeCompare(a.end_date));
 const target=keys[0]||null;if(!target)return {state:fallback.length?'nokey':'none',ids:[],target:null};
 const c=chainOf(target.id);return {state:'ok',ids:c.chain,target,broken:c.broken};}
const CRIT={};for(const p of PROGRAMS)CRIT[p.id]=criticalFor(p.id);
const CRIT_IDS=new Set(Object.values(CRIT).flatMap(c=>c.ids));
// Finish-to-start conflicts: a successor that starts on or before its predecessor ends.
const conflict=x=>{const p=x.predecessor_id&&ITEM[x.predecessor_id];return !!(p&&p.end_date&&anchor(x)&&dayNo(anchor(x))<=dayNo(p.end_date)&&x.status!=='cancelled');};
const slipDays=x=>x.baseline_end&&x.end_date?diffDays(x.baseline_end,x.end_date):null;
const SLIPS=R.slips.rows.map(r=>({id:r.id,...r.data,changed_on:validDate(r.data.changed_on),old_end:validDate(r.data.old_end),new_end:validDate(r.data.new_end),days:num(r.data.days,0)}));
const slipsOf=id=>SLIPS.filter(s=>s.plan_item_id===id).sort((a,b)=>String(a.changed_on).localeCompare(String(b.changed_on)));
const overdue=x=>!['done','cancelled'].includes(x.status)&&!!x.end_date&&!!AS_OF&&x.end_date<AS_OF;
const inWindow=d=>!!d&&!!AS_OF&&d>=AS_OF&&d<=addDays(AS_OF,DUE_SOON);
const quarterOf=d=>{const q=Math.floor((Number(d.slice(5,7))-1)/3);return {start:d.slice(0,4)+'-'+String(q*3+1).padStart(2,'0')+'-01',end:lastDay(d.slice(0,4)+'-'+String(q*3+3).padStart(2,'0')),label:'Q'+(q+1)+' '+d.slice(0,4)};};
const Q=AS_OF?quarterOf(AS_OF):null;
const DECISIONS=R.decisions.rows.map(r=>({id:r.id,version:r.version,...r.data,target_date:validDate(r.data.target_date),decided_on:validDate(r.data.decided_on)}));
const RAID=R.raid.rows.map(r=>({id:r.id,version:r.version,...r.data,next_review:validDate(r.data.next_review)}));
const UPDATES=R.updates.rows.map(r=>({id:r.id,version:r.version,...r.data,month:ym(r.data.month)}));
const LV={low:1,medium:2,high:3};
const score=x=>LV[x.likelihood]&&LV[x.impact]?LV[x.likelihood]*LV[x.impact]:null;
const band=n=>n===null?'':n>=6?'high':n>=3?'medium':'low';
const openRaid=x=>x.status!=='closed';
function criteriaOf(text){return String(text||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{const m=/^\[(met|not met|open)\]\s*(.*)$/i.exec(l);return m?{state:m[1].toLowerCase(),text:m[2]||'(unnamed criterion)'}:{state:'open',text:l};});}
function readiness(d){const c=criteriaOf(d.criteria);return {total:c.length,met:c.filter(x=>x.state==='met').length,notMet:c.filter(x=>x.state==='not met').length,open:c.filter(x=>x.state==='open').length,list:c};}
function healthOf(p){const h=HEALTH.includes(p.data.health)?p.data.health:'unassessed',d=validDate(p.data.health_date);const age=d&&AS_OF?diffDays(d,AS_OF):null;return {h,d,age,stale:h==='unassessed'||!d||(age!==null&&age>STALE_HEALTH_DAYS),rationale:String(p.data.health_rationale||'')};}

/* Downstream impact: each successor's earliest start = its predecessor's new end + 1 day when that is later than its current start.
 * Durations are kept. Done and cancelled successors are never moved. Shown first; applied only when accepted in the same review. */
function downstream(id,newEnd){const moves=[],ends={[id]:newEnd},queue=[id],seen=new Set([id]);
 while(queue.length){const pid=queue.shift();for(const sid of (SUCC[pid]||[])){const s=ITEM[sid];if(!s||seen.has(sid)||['done','cancelled'].includes(s.status))continue;
  const earliest=addDays(ends[pid],1),a=anchor(s);if(!a||!earliest||earliest<=a)continue;
  const shift=diffDays(a,earliest);seen.add(sid);const ne=addDays(s.end_date,shift);ends[sid]=ne;
  moves.push({id:sid,name:String(s.name||''),version:s.version,old_start:s.start_date,old_end:s.end_date,new_start:s.start_date?addDays(s.start_date,shift):'',new_end:ne,days:shift,slip:!!s.baseline_end&&COMMITTED.includes(s.status)});queue.push(sid);}}
 return moves;}
const needsSlip=(orig,newEnd)=>!!orig&&!!orig.baseline_end&&COMMITTED.includes(orig.status)&&!!orig.end_date&&!!newEnd&&newEnd>orig.end_date;

/* ---------- Runway link (modular apps rule 3): optional, read only, never an error ---------- */
function runwayLink(){const r=R.closes;if(r.unbound)return {state:'unbound'};if(r.unavailable)return {state:'unavailable'};
 const snaps=r.rows.map(x=>({row:x,m:parseJSON(x.data.metrics)})).filter(x=>x.m&&x.m.v===2&&Array.isArray(x.m.months)&&(x.row.data.closed===undefined||bool(x.row.data.closed))).sort((a,b)=>String(b.m.asOf||'').localeCompare(String(a.m.asOf||'')));
 if(snaps.length){const s=snaps[0].m;return {state:r.complete?'ok':'partial',source:'runway',asOf:String(s.asOf||''),currency:String(s.currency||''),months:s.months.filter(x=>x&&ym(x.m)&&Number.isFinite(Number(x.c)))};}
 // Manual cash forecast: one closing cash figure per month, entered in Settings (the latest entry for a month wins).
 const byMonth={};for(const x of r.rows){const m=ym(x.data.month),c=Number(x.data.closing_balance);if(!x.data.metrics&&m&&x.data.closing_balance!==null&&x.data.closing_balance!==undefined&&x.data.closing_balance!==''&&Number.isFinite(c))byMonth[m]={m,c,cur:String(x.data.currency||''),id:x.id};}
 const pts=Object.values(byMonth).sort((a,b)=>a.m.localeCompare(b.m));
 if(pts.length)return {state:r.complete?'ok':'partial',source:'manual',asOf:'',currency:pts[pts.length-1].cur,months:pts};
 return {state:r.complete?'none':'partial'};}
const RUNWAY=runwayLink();
const cushionTone=c=>!c?'':c.beyond||c.months>=6?'green':c.months>=3?'amber':'red';
// Cash at a key milestone = Runway's frozen forecast closing cash in the milestone month; cushion = full months of cash after it, to cash-out.
const monthsBetween=(a,b)=>(Number(b.slice(0,4))-Number(a.slice(0,4)))*12+Number(b.slice(5,7))-Number(a.slice(5,7));
// Manual forecast: cash at the latest entered month on or before the milestone; cushion counts calendar months to the first negative month.
function manualCashAt(m){const ms=RUNWAY.months;let i=-1;for(let k=0;k<ms.length;k++)if(ms[k].m<=m)i=k;if(i<0)return null;const cash=ms[i].c;
 if(cash<0)return {cash,cushion:{months:0,beyond:false},neg:true};const j=ms.findIndex((p,k)=>k>i&&p.c<0);
 return {cash,cushion:j<0?{months:Math.max(0,monthsBetween(m,ms[ms.length-1].m)),beyond:true}:{months:Math.max(0,monthsBetween(m,ms[j].m)-1),beyond:false}};}
function cashAt(x){if(RUNWAY.state!=='ok'||!isKey(x)||!x.end_date)return null;const m=ym(x.end_date);if(RUNWAY.source==='manual')return manualCashAt(m);if(m<=RUNWAY.asOf)return null;const ms=RUNWAY.months,i=ms.findIndex(p=>p.m===m);
 if(i<0)return {beyondHorizon:true};const cash=Number(ms[i].c);if(cash<0)return {cash,cushion:{months:0,beyond:false},neg:true};
 const j=ms.findIndex((p,k)=>k>i&&Number(p.c)<0);return {cash,cushion:j<0?{months:ms.length-1-i,beyond:true}:{months:j-1-i,beyond:false}};}
const money=(v,cur)=>(cur?cur+' ':'')+(Math.abs(v)>=1e6?(v/1e6).toFixed(1)+'M':Math.abs(v)>=1e3?Math.round(v/1e3)+'k':grouped(v));
/* In-app integration (modular apps §7): a subtle offer to add Runway, or to choose Runway's data once it is in the workspace. */
let INTEG=null;if(inp.saved){try{callsLeft--;const r=tools.call('integrations.list',{});INTEG=(r&&Array.isArray(r.integrations)?r.integrations:[]).find(x=>x.role==='runway.month_closes')||null;}catch(e){INTEG=null;}}
const CASH_LINKED=RUNWAY.source==='runway'||!!(INTEG&&INTEG.source==='linked');
function integrationHint(){if(!INTEG||!INTEG.offer)return '';
 return '<span class="pg-integration">'+(INTEG.offer==='install'?'Works with Runway. ':'Runway is in your workspace. ')+'<button type="button" class="pg-linkbtn" data-trialy-integration="'+esc(INTEG.offer)+' runway.month_closes">'+(INTEG.offer==='install'?'Add Runway':'Use its cash data')+'</button></span>';}
function runwayNote(){const s=RUNWAY.state;
 return s==='ok'?'':s==='unbound'?'Cash markers are hidden: this app has no cash forecast table.':s==='none'&&!CASH_LINKED?'Add monthly cash in Settings to show cash at key milestones.':s==='unavailable'?'Runway snapshots are not readable for you, so cash markers are hidden. The timeline is unaffected.':s==='partial'?'Runway snapshots could not be read completely, so cash markers are hidden.':'Runway has no closed month yet, so there is no cash snapshot to show.';}

/* ---------- writes ---------- */
function toReal(role,data){const m=roleMap[role];if(!m)throw Error('The '+ROLE_LABEL[role]+' table is not connected.');const out={};for(const [k,v] of Object.entries(data)){if(v===undefined)continue;if(!m.fields[k])continue;if(!m.writable.includes(k))throw Error('You cannot edit '+k.replace(/_/g,' ')+' in the '+ROLE_LABEL[role]+' table.');out[m.fields[k]]=v;}return out;}
function valuesFromForm(role,source,mode,editingId){
 const out={};const m=roleMap[role];
 for(const f of S[role]){
  if(['frozen','baseline'].includes(f.kind)||f.key==='archived')continue;
  if(!m||!m.fields[f.key]||!m.writable.includes(f.key))continue;
  if(!has(source,f.key)){if(mode==='create'&&f.required)throw Error('Required field: '+f.label+'.');continue;}
  let v=source[f.key];if(typeof v==='string')v=v.trim();
  if(v===''||v===null){if(f.required)throw Error('Required field: '+f.label+'.');out[f.key]=null;continue;}
  if(f.kind==='number'){const n=Number(v);if(!Number.isFinite(n))throw Error('Enter a number for '+f.label+'.');out[f.key]=n;}
  else if(f.kind==='date'){const d=validDate(v);if(!d)throw Error('Use a valid date for '+f.label+' (YYYY-MM-DD).');out[f.key]=d;}
  else if(f.kind==='month'){const mm=ym(v);if(!mm)throw Error('Use a valid month for '+f.label+' (YYYY-MM).');out[f.key]=mm+'-01';}
  else if(f.kind==='select'){if(!f.options.includes(String(v)))throw Error('Choose a valid '+f.label+'.');out[f.key]=String(v);}
  else if(f.kind==='boolean')out[f.key]=bool(v);
  else if(f.kind==='ref'){const kept=st.editor&&st.editor.refs&&st.editor.refs[f.key]===String(v);const ok=kept||(f.ref==='items'?ITEMS.some(x=>x.id===v):R[f.ref].rows.some(r=>r.id===v));if(!ok)throw Error('Choose an existing '+f.label.replace(/ \(.*\)$/,'').toLowerCase()+'.');out[f.key]=String(v);}
  else if(f.kind==='link'){const kept=st.editor&&st.editor.refs&&st.editor.refs[f.key]===String(v);if(!kept&&!ITEMS.some(x=>x.id===v)&&!RAID.some(x=>x.id===v))throw Error('Choose an existing plan item or RAID entry.');out[f.key]=String(v);}
  else out[f.key]=String(v).slice(0,f.kind==='longtext'?4000:300);
 }
 if(role==='items'){const s=has(out,'start_date')?out.start_date:source.start_date,e=has(out,'end_date')?out.end_date:source.end_date;if(validDate(s)&&validDate(e)&&validDate(e)<validDate(s))throw Error('The end date is before the start date.');
  const pred=has(out,'predecessor_id')?out.predecessor_id:null;
  if(pred&&editingId){if(pred===editingId)throw Error('An item cannot be its own predecessor.');
   // Reject cycles at save: walking up from the new predecessor must never reach this item.
   const path=[],seen=new Set();let cur=pred;while(cur&&!seen.has(cur)){seen.add(cur);path.push(cur);if(cur===editingId)throw Error('Rejected: this predecessor would create a cycle ('+path.map(itemName).join(' ← ')+').');const r=ITEM[cur];cur=r?r.predecessor_id:'';}}}
 if(role==='programs'||role==='updates'){const h=has(out,'health')?out.health:null;if(h&&h!=='unassessed'&&role==='programs'){const r=has(out,'health_rationale')?out.health_rationale:source.health_rationale,d=has(out,'health_date')?out.health_date:source.health_date;if(!String(r||'').trim()||!validDate(d))throw Error('Health is a dated judgement: enter the rationale and the assessment date.');}}
 if(role==='settings'){for(const [k,allowed] of [['functions',FUNCTIONS],['stages',STAGES]]){if(out[k]){const bad=String(out[k]).split(',').map(x=>x.trim().toLowerCase()).filter(x=>x&&!allowed.includes(x));if(bad.length)throw Error('Unknown '+k+': '+bad.join(', ')+'. Use: '+allowed.join(', ')+'.');}}
  if(out.due_soon_days!==undefined&&out.due_soon_days!==null&&!(out.due_soon_days>=7&&out.due_soon_days<=365))throw Error('The due-soon window must be 7–365 days.');
  if(out.update_day!==undefined&&out.update_day!==null&&!(Number.isInteger(out.update_day)&&out.update_day>=1&&out.update_day<=28))throw Error('The update day must be a whole number from 1 to 28.');}
 if(mode==='create'&&m&&m.fields.archived&&m.writable.includes('archived'))out.archived=false;
 return out;}
function propose(changes,message){if(!changes.length)throw Error('There is nothing to save.');if(changes.length>50)throw Error('This change needs '+changes.length+' record writes; one review holds 50. Save it in smaller parts.');tools.call('records.propose',changes);note(message||'Prepared for TrialAgents review. Nothing changes until you approve it.');}
const lookup=(role,id)=>(R[role].allRows||[]).find(r=>r.id===id)||null;
function openEditor(role,mode,id,preset){
 st.menu=null;st.confirm=null;st.detail=null;let draft={...(preset||{})},version=null;
 if(mode!=='create'){const r=lookup(role,id);if(!r)throw Error('That record is no longer available.');draft={...r.data};version=r.version;if(mode==='duplicate'){if(draft.name!==undefined)draft.name='Copy of '+String(draft.name||'');if(role==='items'){delete draft.baseline_start;delete draft.baseline_end;}}}
 for(const f of S[role])if(f.kind==='frozen')delete draft[f.key];
 const refs={};for(const f of S[role])if((f.kind==='ref'||f.kind==='link')&&draft[f.key])refs[f.key]=String(draft[f.key]);
 // Versions are captured now: a successor edited meanwhile is rejected by the server, never overwritten.
 const versions=role==='items'?Object.fromEntries(ITEMS.map(x=>[x.id,x.version])):null;
 st.editor={role,mode,id:mode==='edit'?id:null,version:mode==='edit'?version:null,draft,initial:JSON.stringify(draft),refs,versions};
}
function itemSave(ed,data){
 const orig=ed.mode==='edit'?ITEM[ed.id]:null;if(ed.mode==='edit'&&!orig)throw Error('This item changed or was removed; reopen it.');
 const changes=[];const newEnd=has(data,'end_date')?data.end_date:orig&&orig.end_date;
 if(ed.mode!=='edit'){changes.push({kind:'create_record',typeId:roleMap.items.typeId,data:toReal('items',data)});return {changes,msg:'New plan item prepared for review.'};}
 changes.push({kind:'update_record',recordId:ed.id,expectedVersion:ed.version,data:toReal('items',data)});
 let slips=0;const reason=String(ed.draft.slip_reason||''),detail=String(ed.draft.slip_detail||'').trim().slice(0,4000);
 if(needsSlip(orig,newEnd)){
  if(!REASONS.includes(reason))throw Error('This committed date moves later: choose a slip reason.');
  if(!canWrite('slips'))throw Error('You cannot record slips, so this date change cannot be saved.');
  changes.push({kind:'create_record',typeId:roleMap.slips.typeId,data:toReal('slips',{plan_item_id:ed.id,changed_on:AS_OF,old_end:orig.end_date,new_end:newEnd,days:diffDays(orig.end_date,newEnd),reason,detail:detail||null})});slips++;}
 let moved=0;
 if(bool(ed.draft.accept_downstream)&&orig.end_date&&newEnd&&newEnd>orig.end_date){
  if(!itemsExact)throw Error('Plan items were not read completely, so successors cannot be moved safely.');
  for(const mv of downstream(ed.id,newEnd)){const v=ed.versions&&has(ed.versions,mv.id)?ed.versions[mv.id]:mv.version;
   changes.push({kind:'update_record',recordId:mv.id,expectedVersion:v,data:toReal('items',{...(mv.new_start?{start_date:mv.new_start}:{}),end_date:mv.new_end})});moved++;
   if(mv.slip){if(!REASONS.includes(reason))throw Error('Choose a slip reason for the successors that move.');changes.push({kind:'create_record',typeId:roleMap.slips.typeId,data:toReal('slips',{plan_item_id:mv.id,changed_on:AS_OF,old_end:mv.old_end,new_end:mv.new_end,days:mv.days,reason,detail:('Pushed by '+String(orig.name||'predecessor')+'. '+detail).trim().slice(0,4000)})});slips++;}}}
 return {changes,msg:'Change prepared for review'+(slips?': '+plural(slips,'slip record')+(moved?' and '+plural(moved,'successor')+' moved':''):moved?': '+plural(moved,'successor')+' moved':'')+'. Nothing changes until you approve it.'};}
function reportContents(month){
 const mStart=month+'-01',mEnd=lastDay(month),inMonth=d=>!!d&&d>=mStart&&d<=mEnd,future=addDays(mEnd,DUE_SOON);
 const progs=PROGRAMS.map(p=>{const u=UPDATES.filter(x=>x.program_id===p.id&&x.month===month)[0]||null;const h=healthOf(p);return {id:p.id,name:String(p.data.name||''),stage:String(p.data.stage||''),health:h.h,healthDate:h.d,update:u?{health:u.health,rationale:String(u.rationale||''),summary:String(u.summary||''),next_steps:String(u.next_steps||''),author:String(u.author||'')}:null};});
 const pick=x=>({id:x.id,name:String(x.name||''),program:progName(x.program_id),date:x.end_date,baseline:x.baseline_end||null,status:x.status,key:isKey(x)});
 return {v:1,month,programs:progs,
  milestones:{done:ITEMS.filter(x=>isMilestone(x)&&x.status==='done'&&inMonth(x.end_date)).map(pick),upcoming:ITEMS.filter(x=>isMilestone(x)&&!['done','cancelled'].includes(x.status)&&x.end_date>mEnd&&x.end_date<=future).sort((a,b)=>a.end_date.localeCompare(b.end_date)).slice(0,25).map(pick)},
  slips:SLIPS.filter(s=>inMonth(s.changed_on)).map(s=>({item:itemName(s.plan_item_id),old_end:s.old_end,new_end:s.new_end,days:s.days,reason:s.reason,detail:String(s.detail||'')})),
  gates:{decided:DECISIONS.filter(d=>inMonth(d.decided_on)).map(d=>({name:String(d.name||''),program:progName(d.program_id),kind:d.kind,outcome:d.outcome,rationale:String(d.rationale||'')})),upcoming:DECISIONS.filter(d=>d.kind==='gate'&&(!d.outcome||d.outcome==='pending')&&d.target_date>mEnd&&d.target_date<=future).map(d=>{const r=readiness(d);return {name:String(d.name||''),program:progName(d.program_id),target:d.target_date,met:r.met,total:r.total};})},
  risks:RAID.filter(x=>x.raid_type==='risk'&&openRaid(x)).sort((a,b)=>(score(b)||0)-(score(a)||0)).slice(0,10).map(x=>({name:String(x.name||''),program:progName(x.program_id),likelihood:x.likelihood||null,impact:x.impact||null,owner:String(x.owner||''),mitigation:String(x.mitigation||'')}))};}
function reportText(title,narrative,c){const L=[];L.push('# '+title,'');if(narrative)L.push(narrative,'');
 L.push('## Programs');for(const p of c.programs||[])L.push('- '+p.name+' ('+(STAGE_LABEL[p.stage]||label(p.stage))+'): '+cap(p.update?p.update.health:p.health)+(p.update?' — '+p.update.summary+(p.update.next_steps?' Next: '+p.update.next_steps:''):' — no update this month'));
 L.push('','## Milestones done');for(const x of (c.milestones&&c.milestones.done)||[])L.push('- '+x.name+' ('+x.program+'), '+dateLabel(x.date));
 L.push('','## Coming up');for(const x of (c.milestones&&c.milestones.upcoming)||[])L.push('- '+x.name+' ('+x.program+'), '+dateLabel(x.date));
 L.push('','## Slips');for(const s of c.slips||[])L.push('- '+s.item+': '+dateLabel(s.old_end)+' → '+dateLabel(s.new_end)+' (+'+s.days+' days, '+(REASON_LABEL[s.reason]||s.reason)+')');
 L.push('','## Gates and decisions');for(const g of (c.gates&&c.gates.decided)||[])L.push('- '+g.name+' ('+g.program+'): '+(OUTCOME_LABEL[g.outcome]||label(g.outcome)));for(const g of (c.gates&&c.gates.upcoming)||[])L.push('- Upcoming gate '+g.name+' ('+g.program+') on '+dateLabel(g.target)+', '+g.met+' of '+g.total+' criteria met');
 L.push('','## Top risks');for(const r of c.risks||[])L.push('- '+r.name+' ('+r.program+'), '+label(r.likelihood)+' likelihood × '+label(r.impact)+' impact');
 return L.join('\n');}

/* ---------- events ---------- */
try{
 if(action.startsWith('nav:')){const id=action.slice(4);if(SCREENS.some(s=>s.id===id)){st.section=id;st.page=0;st.query='';st.filters={};st.filtersOpen=false;st.menu=null;st.editor=null;st.confirm=null;st.detail=null;st.gate=null;st.matrix='';st.present=false;note('');}}
 else if(action==='clear-notice')note('');
 else if(action==='as-of'&&event.kind==='change'){const d=validDate(event.value);if(!d)throw Error('Use a valid as-of date.');st.asOf=d;}
 else if(action==='query'&&event.kind==='change'){st.query=String(event.value||'').slice(0,100);st.page=0;}
 else if(action==='toggle-filters')st.filtersOpen=!st.filtersOpen;
 else if(action.startsWith('filter:')&&event.kind==='change'){st.filters[action.slice(7)]=String(event.value||'');st.page=0;}
 else if(action==='clear-filters'){st.filters={};st.page=0;st.matrix='';}
 else if(action==='next-page')st.page++;else if(action==='prev-page')st.page=Math.max(0,st.page-1);
 else if(action.startsWith('menu:'))st.menu=st.menu===action.slice(5)?null:action.slice(5);
 else if(action.startsWith('details:')){const [role,id]=action.slice(8).split(':');st.detail={role,id};st.menu=null;}
 else if(action==='close-details')st.detail=null;
 else if(action.startsWith('add:')){const role=action.slice(4),pid=st.tl.program||st.filters.program_id||(PROGRAMS[0]?PROGRAMS[0].id:'');
  openEditor(role,'create',null,role==='items'?{program_id:pid,item_type:'milestone',function:FN_ORDER[0],status:'planned',is_key:false}:role==='programs'?{stage:'preclinical',status:'active',health:'unassessed'}:role==='decisions'?{program_id:pid,kind:'gate',outcome:'pending'}:role==='raid'?{program_id:pid,raid_type:'risk',status:'open'}:role==='updates'?{program_id:pid,month:AS_OF?AS_OF.slice(0,7):''}:role==='closes'?{month:AS_OF?AS_OF.slice(0,7):'',currency:RUNWAY.currency||'EUR'}:{});}
 else if(action.startsWith('edit:')){const [role,id]=action.slice(5).split(':');openEditor(role,'edit',id);}
 else if(action.startsWith('duplicate:')){const [role,id]=action.slice(10).split(':');openEditor(role,'duplicate',id);}
 else if(action==='edit-settings'){if(settingsRow)openEditor('settings','edit',settingsRow.id);else openEditor('settings','create',null,{functions:FUNCTIONS.join(', '),stages:STAGES.join(', '),due_soon_days:90,update_day:5});}
 else if(action.startsWith('draft:')&&st.editor){st.editor.draft={...st.editor.draft,...form};}
 else if(action.startsWith('pick:')&&st.editor){st.editor.draft={...st.editor.draft,...form};const k=action.slice(5);if(event.value)st.editor.draft[k]=String(event.value).slice(0,300);}
 else if(action==='cancel-modal'){st.editor=null;st.confirm=null;st.gate=null;}
 else if(action==='save-record'&&event.kind==='submit'){
  const ed=st.editor;if(!ed)throw Error('Nothing to save.');const {role,mode,id}=ed;if(!canWrite(role))throw Error('You cannot change the '+ROLE_LABEL[role]+' table.');
  ed.draft={...ed.draft,...form};
  const data=valuesFromForm(role,ed.draft,mode==='edit'?'update':'create',mode==='edit'?id:null);
  if(role==='updates'&&mode!=='edit'&&UPDATES.some(u=>u.program_id===data.program_id&&u.month===ym(data.month)))throw Error('This program already has an update for '+monthLabel(ym(data.month))+'. Edit that update instead.');
  if(mode==='edit'){const orig=lookup(role,id);if(orig){const same=(x,y)=>(x===undefined||x===''?null:x)===(y===undefined||y===''?null:y)||String(x)===String(y)&&x!==null&&y!==null;for(const k of Object.keys(data))if(same(data[k],orig.data[k]))delete data[k];}}
  if(mode==='edit'&&!Object.keys(data).length&&!(role==='items'&&bool(ed.draft.accept_downstream)))throw Error('Nothing changed.');
  if(role==='items'){const r=itemSave(ed,data);propose(r.changes,r.msg);}
  else if(mode==='edit'){if(!lookup(role,id))throw Error('This record changed or was removed; reopen it.');propose([{kind:'update_record',recordId:id,expectedVersion:ed.version,data:toReal(role,data)}],'Change prepared for review. Nothing changes until you approve it.');}
  else propose([{kind:'create_record',typeId:roleMap[role].typeId,data:toReal(role,data)}],'New '+ROLE_LABEL[role]+' prepared for review.');
  st.editor=null;}
 else if(action.startsWith('archive:')){const [role,id]=action.slice(8).split(':');const r=lookup(role,id);if(!r)throw Error('That record is no longer available.');st.confirm={kind:'archive',role,id,version:r.version};st.menu=null;}
 else if(action==='confirm-archive'){const c=st.confirm;if(!c||c.kind!=='archive')throw Error('Nothing to archive.');const m=roleMap[c.role];if(!canWrite(c.role)||!m.fields.archived||!m.writable.includes('archived'))throw Error('Archiving needs an editable archived field.');
  if(c.role==='items'&&(SUCC[c.id]||[]).length)throw Error('Other items use this as their predecessor. Change their predecessor first.');
  propose([{kind:'update_record',recordId:c.id,expectedVersion:c.version,data:{[m.fields.archived]:true}}],'Archive prepared for review. The record and its history are kept.');st.confirm=null;}
 /* timeline */
 else if(action==='tl-program'&&event.kind==='change'){st.tl.program=String(event.value||'');st.tl.page=0;st.sel=null;}
 else if(action==='tl-function'&&event.kind==='change'){st.tl.fn=String(event.value||'');st.tl.page=0;}
 else if(action==='tl-next')st.tl.page=(st.tl.page||0)+1;else if(action==='tl-prev')st.tl.page=Math.max(0,(st.tl.page||0)-1);
 else if(action.startsWith('select:')){const id=action.slice(7);st.sel=st.sel===id?null:id;}
 else if(action==='clear-select')st.sel=null;
 else if(action==='present-on'){st.present=true;if(!st.tl.program&&PROGRAMS[0])st.tl.program=PROGRAMS[0].id;}
 else if(action==='present-off')st.present=false;
 /* baselines */
 else if(action.startsWith('set-baseline:')){const pid=action.slice(13);if(!itemsExact)throw Error('Plan items were not read completely; set the baseline after a complete read.');
  const list=ITEMS.filter(x=>x.program_id===pid&&!x.baseline_end&&x.end_date&&x.status!=='cancelled');if(!list.length)throw Error('Every item in this program already has a baseline.');
  st.confirm={kind:'baseline',program:pid,items:list.slice(0,50).map(x=>({id:x.id,version:x.version}))};}
 else if(action==='confirm-baseline'){const c=st.confirm;if(!c||c.kind!=='baseline')throw Error('Nothing to baseline.');if(!writableField('items','baseline_end'))throw Error('You cannot set baselines.');
  propose(c.items.map(t=>{const x=ITEM[t.id];if(!x)throw Error('An item changed; reopen the baseline.');return {kind:'update_record',recordId:t.id,expectedVersion:t.version,data:toReal('items',{baseline_start:x.start_date||null,baseline_end:x.end_date})};}),'Baseline for '+plural(c.items.length,'item')+' prepared for review. It records today\'s planned dates as the plan of record.');st.confirm=null;}
 else if(action.startsWith('rebaseline:')){const x=ITEM[action.slice(11)];if(!x)throw Error('That item is no longer available.');if(!x.baseline_end)throw Error('This item has no baseline yet; use Set baseline.');st.confirm={kind:'rebaseline',id:x.id,version:x.version,reason:''};st.menu=null;}
 else if(action==='rebaseline-draft'&&st.confirm)st.confirm.reason=String(form.reason??st.confirm.reason??'').slice(0,1000);
 else if(action==='confirm-rebaseline'&&event.kind==='submit'){const c=st.confirm;if(!c||c.kind!=='rebaseline')throw Error('Nothing to reset.');c.reason=String(form.reason??c.reason??'').trim().slice(0,1000);if(!c.reason)throw Error('Resetting a baseline needs a reason.');
  const x=ITEM[c.id];if(!x)throw Error('That item is no longer available.');if(!writableField('items','baseline_end'))throw Error('You cannot reset baselines.');
  const line='Baseline reset on '+AS_OF+' from '+(x.baseline_end||'—')+' to '+x.end_date+': '+c.reason;
  propose([{kind:'update_record',recordId:c.id,expectedVersion:c.version,data:toReal('items',{baseline_start:x.start_date||null,baseline_end:x.end_date,notes:(String(x.notes||'')+(x.notes?'\n':'')+line).slice(-4000)})}],'Baseline reset prepared for review; the reason is kept in the item notes.');st.confirm=null;}
 /* gates */
 else if(action.startsWith('outcome:')){const d=DECISIONS.find(x=>x.id===action.slice(8));if(!d)throw Error('That gate is no longer available.');
  st.gate={id:d.id,version:d.version,draft:{outcome:d.outcome&&d.outcome!=='pending'?d.outcome:'',decided_on:d.decided_on||'',approver:String(d.approver||''),rationale:String(d.rationale||'')},follow:[],cancel:[],versions:Object.fromEntries(ITEMS.filter(x=>x.program_id===d.program_id).map(x=>[x.id,x.version]))};st.menu=null;}
 else if(action==='gate-draft'&&st.gate){const g=st.gate;g.draft={...g.draft,...Object.fromEntries(['outcome','decided_on','approver','rationale'].filter(k=>has(form,k)).map(k=>[k,form[k]]))};
  g.follow=g.follow.map((f,i)=>({name:form['follow_name_'+i]??f.name,end_date:form['follow_date_'+i]??f.end_date,function:form['follow_fn_'+i]??f.function}));
  g.cancel=Object.keys(form).filter(k=>k.startsWith('cancel_')&&bool(form[k])).map(k=>k.slice(7));}
 else if(action==='gate-follow-add'&&st.gate){if(st.gate.follow.length>=10)throw Error('Add up to 10 follow-up milestones at a time.');st.gate.follow.push({name:'',end_date:'',function:FN_ORDER[0]});}
 else if(action.startsWith('gate-follow-remove:')&&st.gate)st.gate.follow.splice(Number(action.slice(19)),1);
 else if(action==='gate-submit'&&event.kind==='submit'){const g=st.gate;if(!g)throw Error('No gate open.');
  g.draft={...g.draft,...Object.fromEntries(['outcome','decided_on','approver','rationale'].filter(k=>has(form,k)).map(k=>[k,form[k]]))};
  g.follow=g.follow.map((f,i)=>({name:form['follow_name_'+i]??f.name,end_date:form['follow_date_'+i]??f.end_date,function:form['follow_fn_'+i]??f.function}));
  g.cancel=Object.keys(form).filter(k=>k.startsWith('cancel_')&&bool(form[k])).map(k=>k.slice(7));
  const d=DECISIONS.find(x=>x.id===g.id);if(!d)throw Error('That gate changed or was removed; reopen it.');
  if(!['go','no_go','conditional','decided'].includes(g.draft.outcome))throw Error('Choose the outcome.');
  if(!validDate(g.draft.decided_on))throw Error('Enter the decision date.');
  if(!String(g.draft.rationale||'').trim())throw Error('Record the rationale for the outcome.');
  if(!canWrite('decisions'))throw Error('You cannot record gate outcomes.');
  const changes=[{kind:'update_record',recordId:g.id,expectedVersion:g.version,data:toReal('decisions',{outcome:g.draft.outcome,decided_on:validDate(g.draft.decided_on),approver:String(g.draft.approver||'').trim().slice(0,300)||null,rationale:String(g.draft.rationale).trim().slice(0,4000)})}];
  for(const f of g.follow){if(!String(f.name||'').trim()&&!f.end_date)continue;if(!String(f.name||'').trim())throw Error('Name each follow-up milestone.');const e=validDate(f.end_date);if(!e)throw Error('Give each follow-up milestone a valid date.');if(!FUNCTIONS.includes(f.function))throw Error('Choose a function for each follow-up milestone.');
   if(!canWrite('items'))throw Error('You cannot add plan items.');changes.push({kind:'create_record',typeId:roleMap.items.typeId,data:toReal('items',{name:String(f.name).trim().slice(0,300),program_id:d.program_id,item_type:'milestone',function:f.function,end_date:e,status:'planned',is_key:false,notes:'Follow-up of gate '+String(d.name||'')+'.',archived:false})});}
  for(const id of g.cancel){const x=ITEM[id];if(!x)throw Error('A milestone to cancel is no longer available.');changes.push({kind:'update_record',recordId:id,expectedVersion:has(g.versions,id)?g.versions[id]:x.version,data:toReal('items',{status:'cancelled'})});}
  propose(changes,'Gate outcome prepared for review'+(changes.length>1?' with '+plural(changes.length-1,'follow-up change'):'')+'. The app never sets an outcome on its own.');st.gate=null;}
 /* RAID */
 else if(action.startsWith('matrix:')){const k=action.slice(7);st.matrix=st.matrix===k?'':k;st.page=0;}
 else if(action.startsWith('promote:')){const [id,to]=action.slice(8).split(':');const x=RAID.find(r=>r.id===id);if(!x)throw Error('That entry is no longer available.');
  if(!((x.raid_type==='assumption'&&to==='risk')||(x.raid_type==='risk'&&to==='issue')))throw Error('Promote an assumption to a risk, or a risk to an issue.');st.confirm={kind:'promote',id,version:x.version,to};st.menu=null;}
 else if(action==='confirm-promote'){const c=st.confirm;if(!c||c.kind!=='promote')throw Error('Nothing to promote.');const x=RAID.find(r=>r.id===c.id);if(!x)throw Error('That entry changed; reopen it.');if(!canWrite('raid'))throw Error('You cannot change the RAID log.');
  const copy={name:String(x.name||''),program_id:x.program_id||null,raid_type:c.to,likelihood:LMH.includes(x.likelihood)?x.likelihood:null,impact:LMH.includes(x.impact)?x.impact:null,owner:x.owner||null,mitigation:x.mitigation||null,next_review:x.next_review||null,status:'open',linked_item_id:x.id,archived:false};
  propose([{kind:'create_record',typeId:roleMap.raid.typeId,data:toReal('raid',copy)},{kind:'update_record',recordId:x.id,expectedVersion:c.version,data:toReal('raid',{status:'closed'})}],cap(x.raid_type)+' promoted to '+c.to+' for review: a new linked entry is created and the original is closed, keeping its history.');st.confirm=null;}
 /* updates and reports */
 else if(action.startsWith('up-tab:')){st.upTab=action.slice(7);st.page=0;st.reportView=null;}
 else if(action==='report-month'&&event.kind==='change'){const m=ym(event.value);if(m)st.reportMonth=m;}
 else if(action==='report-draft'){st.reportDraft={...(st.reportDraft||{}),...Object.fromEntries(['title','narrative'].filter(k=>has(form,k)).map(k=>[k,String(form[k]).slice(0,4000)]))};}
 else if(action==='report-save'&&event.kind==='submit'){const m=ym(st.reportMonth||form.month)||(AS_OF?AS_OF.slice(0,7):'');if(!m)throw Error('Choose the report month.');
  st.reportDraft={...(st.reportDraft||{}),...Object.fromEntries(['title','narrative'].filter(k=>has(form,k)).map(k=>[k,String(form[k]).slice(0,4000)]))};
  if(!exact)throw Error('The report needs complete reads of every Programs table. Fix the data checks first.');if(!canWrite('reports'))throw Error('You cannot save reports.');
  const title=String(st.reportDraft.title||'').trim()||'Leadership report — '+monthLabel(m);
  propose([{kind:'create_record',typeId:roleMap.reports.typeId,data:toReal('reports',{month:m+'-01',title:title.slice(0,300),narrative:String(st.reportDraft.narrative||'').trim().slice(0,4000)||null,contents:JSON.stringify(reportContents(m)),saved_on:AS_OF})}],'Report for '+monthLabel(m)+' prepared for review. Once saved it is frozen and never changes.');st.reportDraft=null;}
 else if(action.startsWith('report-open:'))st.reportView=action.slice(12);
 else if(action==='report-close')st.reportView=null;
 else if(action==='toggle-export')st.exportOpen=!st.exportOpen;
}catch(e){note('Action not completed: '+String(e&&e.message||e).slice(0,400));}

/* ---------- rendering helpers ---------- */
const glyph={overview:'<rect x="3" y="3" width="7" height="8" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="15" width="7" height="6" rx="1.5"/>',timeline:'<path d="M4 6h9M7 12h11M5 18h7"/><path d="M3 3v18"/>',plan:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',decisions:'<path d="M12 3l9 9-9 9-9-9z"/><path d="M9 12l2 2 4-4"/>',raid:'<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',updates:'<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',plus:'<path d="M12 5v14M5 12h14"/>',close:'<path d="M6 6l12 12M18 6L6 18"/>'};
const icon=(n,s=18)=>'<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(glyph[n]||glyph.overview)+'</svg>';
const btn=(text,a,cls,disabled,extra)=>'<button type="button" class="'+(cls===undefined?'pg-btn':cls)+'" data-action="'+esc(a)+'"'+(disabled?' disabled':'')+(extra?' '+extra:'')+'>'+text+'</button>';
const pill=(text,type)=>'<span class="pg-pill '+esc(type||'')+'">'+esc(text)+'</span>';
const statusTone=s=>s==='done'?'green':s==='at_risk'?'amber':s==='cancelled'?'':s==='in_progress'?'blue':'';
const healthBadge=h=>'<span class="pg-health '+esc(h)+'"><i aria-hidden="true"></i>'+esc(cap(h))+'</span>';
const current=SCREENS.find(s=>s.id===st.section)||SCREENS[0];
const asOfText=()=>AS_OF?'As of '+dateLabel(AS_OF)+(AS_OF_SOURCE==='today'?' (today)':AS_OF_SOURCE==='pinned'?' (fixed)':''):'No as-of date';
function heading(sub){return '<header class="pg-top"><div><div class="pg-eyebrow">Programs / '+esc(current.label)+'</div><h1 class="pg-title">'+esc(st.layout.heading)+'</h1><p class="pg-subtitle">'+esc(sub||DESC[current.id])+'</p></div><div class="pg-top-right">'+pill(asOfText(),'blue')+btn(icon('gear',18),'tracker:layout','pg-icon-btn',!inp.saved,'aria-label="App layout settings" title="Layout settings"')+'</div></header>'+asOfControl();}
// Only when the runtime gives no date: an as-of control, defaulting to the end of the latest updated month.
function asOfControl(){if(AS_OF_SOURCE==='today'||AS_OF_SOURCE==='pinned')return '';return '<div class="pg-banner warn pg-asof"><label class="pg-field inline" for="pg-asof">As-of date<input class="pg-input" type="date" id="pg-asof" name="as_of" data-ui-state="true" data-action="as-of" value="'+esc(AS_OF)+'"></label><span>This app view could not read today\'s date, so due-soon and overdue use this date'+(AS_OF_SOURCE==='default'?' (end of the latest updated month)':'')+'.</span></div>';}
function checks(){if(exact)return '';
 return '<div class="pg-banner bad" role="alert"><strong>Partial data: critical path and totals are disabled.</strong> '+readProblems.slice(0,8).map(esc).join(' ')+' Rows that were read are still shown and labelled.</div>';}
const tot=n=>exact?String(n):'—';
function filtered(rows,fields,nameOf){const q=st.query.toLowerCase().trim();let out=rows;
 if(q)out=out.filter(r=>fields.some(k=>String(k==='program_id'?progName(r.program_id):r[k]??'').toLowerCase().includes(q)));
 for(const [k,v] of Object.entries(st.filters)){if(!v||k==='from'||k==='to')continue;out=out.filter(r=>String(r[k]??'')===v);}
 if(st.filters.from)out=out.filter(r=>(r.end_date||r.target_date||'')>=st.filters.from);if(st.filters.to)out=out.filter(r=>(anchor(r)||r.target_date||'')<=st.filters.to);
 return out;}
function paged(items,per){per=per||Math.min(50,Math.max(10,num(cfg.pageSize,25)||25));const max=Math.max(0,Math.ceil(items.length/per)-1);st.page=Math.min(st.page,max);return {slice:items.slice(st.page*per,(st.page+1)*per),page:st.page,max,total:items.length,per};}
function pager(p,scope){return '<div class="pg-footer"><span>'+(p.total?'Showing '+(p.page*p.per+1)+'–'+Math.min(p.total,(p.page+1)*p.per)+' of '+p.total:'No rows')+(scope?' · '+esc(scope):'')+'</span><span class="pg-pager">'+btn('Previous','prev-page','pg-btn small',p.page===0)+'<span>Page '+(p.page+1)+' of '+(p.max+1)+'</span>'+btn('Next','next-page','pg-btn small',p.page>=p.max)+'</span></div>';}
function partialLabel(role){const r=R[role];return r.unbound?'table not connected':r.unavailable?'no access':!r.complete?'partial: '+r.rows.length+' rows read':'search covers all '+r.rows.length+' rows';}
function toolbar(role,addLabel,filters,extra){filters=filters.filter(f=>f.options===null||f.options.length);const active=Object.entries(st.filters).filter(([,v])=>v).length+(st.matrix?1:0);
 return '<div class="pg-toolbar"><input type="search" class="pg-search" name="query" data-action="query" data-ui-state="true" value="'+esc(st.query)+'" placeholder="Search" aria-label="Search '+esc(ROLE_LABEL[role])+'s">'+btn('Filters'+(active?' ('+active+')':''),'toggle-filters','pg-btn pg-disclosure',false,'aria-expanded="'+(st.filtersOpen?'true':'false')+'" aria-controls="pg-filters"')+btn(icon('plus',15)+'<span class="pg-hide-xs">'+esc(addLabel)+'</span>','add:'+role,'pg-btn pg-btn-primary',!canWrite(role),'aria-label="'+esc(addLabel)+'"')+'</div>'+
 (st.filtersOpen?'<div class="pg-filter-row" id="pg-filters">'+filters.map(f=>f.options===null?'<label>'+esc(f.label)+'<input type="date" class="pg-input" name="filter_'+f.key+'" data-ui-state="true" data-action="filter:'+f.key+'" value="'+esc(st.filters[f.key]||'')+'"></label>':'<label>'+esc(f.label)+'<select name="filter_'+f.key+'" data-ui-state="true" data-action="filter:'+f.key+'"><option value="">All</option>'+f.options.map(o=>'<option value="'+esc(o[0])+'"'+(st.filters[f.key]===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></label>').join('')+btn('Clear filters','clear-filters','pg-btn small',!active)+(extra||'')+'</div>':'');}
const opt=list=>list.map(x=>[x,cap(x)]);
const fnOpts=()=>FN_ORDER.map(x=>[x,FN_LABEL[x]]);
function rowMenu(role,id,name,extra){const key=role+':'+id;const w=canWrite(role);
 return '<div class="pg-menu-wrap">'+btn('Details','details:'+key,'pg-btn small')+btn('•••','menu:'+key,'pg-more',false,'aria-label="More actions for '+esc(name)+'" aria-expanded="'+(st.menu===key?'true':'false')+'"')+(st.menu===key?'<div class="pg-menu" role="menu">'+btn('Edit','edit:'+key,'',!w)+btn('Duplicate','duplicate:'+key,'',!w)+(extra||'')+(roleMap[role]&&roleMap[role].fields.archived?btn('Archive','archive:'+key,'danger',!w||!roleMap[role].writable.includes('archived')):'')+'</div>':'')+'</div>';}
const empty=(title,text)=>'<div class="pg-empty"><strong>'+esc(title)+'</strong><p>'+esc(text)+'</p></div>';

/* ---------- Overview ---------- */
function dueSoonList(){const out=[];
 for(const x of ITEMS)if(!['done','cancelled'].includes(x.status)&&inWindow(x.end_date))out.push({date:x.end_date,kind:isMilestone(x)?(isKey(x)?'Key milestone':'Milestone'):'Activity ends',name:String(x.name||''),program:x.program_id,act:'details:items:'+x.id});
 for(const d of DECISIONS)if((!d.outcome||d.outcome==='pending')&&inWindow(d.target_date))out.push({date:d.target_date,kind:d.kind==='gate'?'Gate':'Decision',name:String(d.name||''),program:d.program_id,act:'details:decisions:'+d.id});
 return out.sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name));}
function updateMonthDue(){if(!AS_OF)return '';const m=AS_OF.slice(0,7);return Number(AS_OF.slice(8,10))>=UPDATE_DAY?m:addMonths(m,-1);}
function exceptionsList(){const ex=[];const due=updateMonthDue();
 if(due)for(const p of PROGRAMS)if((p.data.status||'active')==='active'&&!UPDATES.some(u=>u.program_id===p.id&&u.month===due))ex.push(['No monthly update for '+monthLabel(due)+': '+String(p.data.name||''),'nav:updates','Updates']);
 for(const x of ITEMS.filter(x=>isMilestone(x)&&overdue(x)).sort((a,b)=>a.end_date.localeCompare(b.end_date)))ex.push(['Overdue milestone: '+String(x.name||'')+' ('+progName(x.program_id)+'), due '+dateLabel(x.end_date),'details:items:'+x.id,'Open']);
 for(const d of DECISIONS.filter(d=>d.kind==='gate'&&(!d.outcome||d.outcome==='pending')&&!readiness(d).total))ex.push(['Gate without criteria: '+String(d.name||'')+' ('+progName(d.program_id)+')','edit:decisions:'+d.id,'Add criteria']);
 for(const x of RAID.filter(x=>openRaid(x)&&x.next_review&&AS_OF&&x.next_review<AS_OF))ex.push(['Past review date: '+String(x.name||'')+' ('+dateLabel(x.next_review)+')','edit:raid:'+x.id,'Review']);
 for(const p of PROGRAMS){const h=healthOf(p);if(h.stale)ex.push([(h.h==='unassessed'||!h.d?'Health not assessed: ':'Health older than '+STALE_HEALTH_DAYS+' days ('+dateLabel(h.d)+'): ')+String(p.data.name||''),'edit:programs:'+p.id,'Assess']);}
 for(const [pid,c] of Object.entries(CRIT))if(c.state==='cycle')ex.push(['Predecessor cycle in '+progName(pid)+': '+c.cycle.map(itemName).join(', ')+'. Fix a predecessor to restore the critical path.','nav:plan','Plan']);
 const conf=ITEMS.filter(conflict);if(conf.length)ex.push([plural(conf.length,'item')+' starts on or before its predecessor ends (finish-to-start).','nav:plan','Plan']);
 return ex;}
function overview(){
 let body=heading()+checks();
 if(!PROGRAMS.length&&!R.programs.unbound)return body+empty('No programs yet','Add your first program in Settings, or ask Claude or ChatGPT to set one up from a development plan you share. Every change is reviewed.')+(canWrite('programs')?'<div class="pg-row">'+btn(icon('plus',15)+' Add program','add:programs','pg-btn pg-btn-primary')+'</div>':'');
 const next=ITEMS.filter(x=>isKey(x)&&!['done','cancelled'].includes(x.status)&&x.end_date&&AS_OF&&x.end_date>=AS_OF).sort((a,b)=>a.end_date.localeCompare(b.end_date))[0];
 const highRisks=RAID.filter(x=>x.raid_type==='risk'&&openRaid(x)&&band(score(x))==='high');
 const od=ITEMS.filter(overdue),qSlips=Q?SLIPS.filter(s=>s.changed_on&&s.changed_on>=Q.start&&s.changed_on<=Q.end):[];
 const doneQ=Q?ITEMS.filter(x=>isMilestone(x)&&x.status==='done'&&x.baseline_end&&x.end_date>=Q.start&&x.end_date<=Q.end):[],onTime=doneQ.filter(x=>x.end_date<=x.baseline_end).length;
 body+='<section class="pg-hero"><div class="pg-hero-over">Next key milestone</div><div class="pg-hero-sentence">'+(next?esc(next.name)+' · '+esc(progName(next.program_id))+', '+esc(dateLabel(next.end_date))+' ('+plural(diffDays(AS_OF,next.end_date),'day')+')':'No upcoming key milestone')+'</div><div class="pg-hero-foot"><span><strong>'+PROGRAMS.length+'</strong> '+(PROGRAMS.length===1?'program':'programs')+'</span><span><strong>'+tot(highRisks.length)+'</strong> open high risks</span><span><strong>'+tot(od.length)+'</strong> overdue items</span>'+(next&&cashAt(next)&&cashAt(next).cash!==undefined?'<span>Cash at this milestone <strong>'+esc(money(cashAt(next).cash,RUNWAY.currency))+'</strong> (Runway '+esc(monthLabel(RUNWAY.asOf))+')</span>':'')+'</div></section>';
 body+='<div class="pg-kpis">'+kpi('Overdue items',tot(od.length),'Not done, end date before '+dateLabel(AS_OF),od.length&&exact?'bad':'')+kpi('Slips this quarter',exact?String(qSlips.length):'—',Q?(exact?plural(qSlips.reduce((n,s)=>n+num(s.days,0),0),'day')+' in total · '+Q.label:Q.label):'')+kpi('On-time milestones',!exact?'—':doneQ.length?Math.round(onTime/doneQ.length*100)+'%':'No data',Q?(doneQ.length?onTime+' of '+doneQ.length+' baselined milestones done in '+Q.label+' on or before baseline':'No baselined milestone done in '+Q.label):'')+'</div>';
 body+='<div class="pg-cards3">'+PROGRAMS.map(programCard).join('')+'</div>';
 const due=dueSoonList();
 body+='<div class="pg-grid2"><section class="pg-panel"><div class="pg-pad"><div class="pg-panel-head"><div><h2>Next '+DUE_SOON+' days</h2><p>Milestones, activities, gates and decisions due from '+esc(dateLabel(AS_OF))+' to '+esc(dateLabel(addDays(AS_OF,DUE_SOON)))+', across all programs</p></div></div>'+(due.length?'<ul class="pg-list">'+due.slice(0,15).map(d=>'<li><span><strong>'+esc(d.name)+'</strong><small class="pg-sub">'+esc(d.kind)+' · '+esc(progName(d.program))+'</small></span><span>'+esc(dateLabel(d.date))+' '+btn('Open',d.act,'pg-btn small',false,'aria-label="Open '+esc(d.name)+'"')+'</span></li>').join('')+'</ul>'+(due.length>15?'<p class="pg-muted">And '+(due.length-15)+' more in the Plan and Gates screens.</p>':''):'<p class="pg-muted">Nothing is due in this window.</p>')+'</div></section>';
 const ex=exceptionsList();
 body+='<section class="pg-panel"><div class="pg-pad"><div class="pg-panel-head"><div><h2>Exceptions</h2><p>Missing updates, overdue milestones, gates without criteria, risks past review and stale health</p></div></div>'+(ex.length?'<ul class="pg-list">'+ex.slice(0,14).map(e=>'<li><span>'+esc(e[0])+'</span>'+btn(esc(e[2]),e[1],'pg-btn small')+'</li>').join('')+'</ul>'+(ex.length>14?'<p class="pg-muted">And '+(ex.length-14)+' more.</p>':''):'<p class="pg-muted">No exceptions.</p>')+'</div></section></div>';
 const reasons={};for(const s of qSlips)reasons[s.reason]=(reasons[s.reason]||0)+1;
 body+='<section class="pg-panel pg-pad"><div class="pg-panel-head"><div><h2>Slips this quarter</h2><p>Committed dates moved later in '+esc(Q?Q.label:'—')+', with the reasons given</p></div></div>'+(!exact?'<p class="pg-muted">Withheld: the data was not read completely.</p>':qSlips.length?'<div class="pg-kv"><span>Slips</span><strong>'+qSlips.length+'</strong></div><div class="pg-kv"><span>Total days</span><strong>'+qSlips.reduce((n,s)=>n+num(s.days,0),0)+'</strong></div>'+Object.entries(reasons).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>'<div class="pg-kv"><span>'+esc(REASON_LABEL[k]||cap(k))+'</span><strong>'+plural(v,'slip')+'</strong></div>').join(''):'<p class="pg-muted">No slips recorded this quarter.</p>')+'</section>';
 return body;}
function kpi(title,value,foot,tone){return '<div class="pg-kpi '+(tone||'')+'"><div class="pg-kpi-label">'+esc(title)+'</div><div class="pg-kpi-value">'+esc(value)+'</div><div class="pg-kpi-foot">'+esc(foot||'')+'</div></div>';}
function programCard(p){const h=healthOf(p),items=ITEMS.filter(x=>x.program_id===p.id);
 const nx=items.filter(x=>isMilestone(x)&&!['done','cancelled'].includes(x.status)&&x.end_date&&AS_OF&&x.end_date>=AS_OF).sort((a,b)=>a.end_date.localeCompare(b.end_date))[0];
 const hr=RAID.filter(x=>x.program_id===p.id&&x.raid_type==='risk'&&openRaid(x)&&band(score(x))==='high').length;
 return '<article class="pg-pcard"><div class="pg-row" style="margin-top:0;justify-content:space-between"><h3>'+esc(p.data.name||'Unnamed')+'</h3>'+healthBadge(h.h)+'</div><div class="pg-sub">'+esc([p.data.code,STAGE_LABEL[p.data.stage]||cap(p.data.stage),p.data.indication].filter(Boolean).join(' · '))+'</div><dl><dt>Health assessed</dt><dd>'+(h.d?esc(dateLabel(h.d))+(h.stale?' '+pill('Older than '+STALE_HEALTH_DAYS+' days','amber'):''):pill('Not assessed','amber'))+'</dd>'+(h.rationale?'<dt>Rationale</dt><dd>'+esc(h.rationale.slice(0,140))+'</dd>':'')+'<dt>Next milestone</dt><dd>'+(nx?esc(nx.name)+' · '+esc(dateLabel(nx.end_date))+' ('+plural(diffDays(AS_OF,nx.end_date),'day')+')':'—')+'</dd><dt>Open high risks</dt><dd>'+tot(hr)+'</dd><dt>Lead</dt><dd>'+esc(p.data.lead||'—')+'</dd></dl><div class="pg-row">'+btn('Assess health','edit:programs:'+p.id,'pg-btn small',!canWrite('programs'),'aria-label="Assess health of '+esc(p.data.name||'program')+'"')+'</div></article>';}

/* ---------- Timeline ---------- */
function ganttRows(pidFilter,fnFilter){const rows=[];
 const progs=PROGRAMS.filter(p=>!pidFilter||p.id===pidFilter);
 for(const p of progs){const its=ITEMS.filter(x=>x.program_id===p.id&&(!fnFilter||x.function===fnFilter)&&(x.end_date||x.start_date));if(!its.length)continue;
  rows.push({lane:'program',text:String(p.data.name||'Unnamed'),pid:p.id});
  for(const fn of FN_ORDER.concat(FUNCTIONS.filter(f=>!FN_ORDER.includes(f)))){const l=its.filter(x=>x.function===fn).sort((a,b)=>(anchor(a)||'').localeCompare(anchor(b)||'')||String(a.name||'').localeCompare(String(b.name||'')));if(!l.length)continue;rows.push({lane:'fn',text:FN_LABEL[fn]||fn});for(const x of l)rows.push({item:x});}}
 return rows;}
function gantt(rows,opts){opts=opts||{};const dates=[];for(const r of rows)if(r.item){const x=r.item;for(const d of [x.start_date,x.end_date,x.baseline_start,x.baseline_end])if(d)dates.push(d);}
 if(AS_OF)dates.push(AS_OF);if(!dates.length)return '';dates.sort();
 const m0=dates[0].slice(0,7),m1=dates[dates.length-1].slice(0,7),months=diffMonths(m0,m1)+1,start=dayNo(m0+'-01'),end=dayNo(lastDay(m1))+1,span=end-start;
 const pct=d=>((dayNo(d)-start)/span*100).toFixed(3)+'%',w=(a,b)=>Math.max(0.4,(dayNo(b)-dayNo(a)+1)/span*100).toFixed(3)+'%';
 const width=Math.max(760,Math.min(3600,months*56))+(opts.labelWidth||240);
 const drive=st.sel&&ITEM[st.sel]?new Set(chainOf(st.sel).chain):null;
 const ticks=[];const step=months>36?3:1;for(let i=0;i<months;i+=step){const m=addMonths(m0,i);ticks.push('<span style="left:'+pct(m+'-01')+'">'+esc(MONTHS[Number(m.slice(5,7))-1]+(m.slice(5,7)==='01'||i===0?' '+m.slice(0,4):''))+'</span>');}
 const grid=ticks.map((t,i)=>'<i class="pg-g-grid" style="left:'+pct(addMonths(m0,i*step)+'-01')+'"></i>').join('');
 const todayLeft=AS_OF?'calc(var(--lw,240px) + (100% - var(--lw,240px)) * '+((dayNo(AS_OF)-start)/span).toFixed(5)+')':'';
 let html='<div class="pg-gantt-wrap" role="region" aria-label="'+esc(opts.label||'Program timeline')+'" tabindex="0"><div class="pg-gantt" style="min-width:'+width+'px;--lw:'+(opts.labelWidth||240)+'px">';
 html+='<div class="pg-g-head"><div class="pg-g-label">Item</div><div class="pg-g-axis">'+ticks.join('')+'</div></div>';
 for(const r of rows){
  if(r.lane){html+='<div class="pg-g-lane '+(r.lane==='program'?'program':'')+'"><div class="pg-g-label">'+esc(r.text)+'</div><div class="pg-g-track" style="min-height:'+(r.lane==='program'?30:26)+'px">'+grid+'</div></div>';continue;}
  const x=r.item,crit=CRIT_IDS.has(x.id),dr=drive&&drive.has(x.id),dim=drive&&!dr,ms=isMilestone(x),c=ms?cashAt(x):null;
  const title=String(x.name||'')+' · '+(ms?'milestone '+dateLabel(x.end_date):dateLabel(x.start_date||x.end_date)+' – '+dateLabel(x.end_date))+(x.baseline_end?' · baseline '+dateLabel(x.baseline_end):'')+' · '+label(x.status)+(crit?' · critical path':'');
  const sd=slipDays(x);
  let track=grid;
  if(x.baseline_end)track+='<i class="pg-ghost" style="left:'+pct(x.baseline_start||x.baseline_end)+';width:'+(x.baseline_start?w(x.baseline_start,x.baseline_end):'6px')+'"></i>';
  const cls=(crit?' crit':'')+(dr?' drive':'')+' '+esc(x.status||'');
  if(ms)track+=(opts.readOnly?'<span class="pg-diamond'+(isKey(x)?' key':'')+cls+'" style="left:'+pct(x.end_date)+'" role="img" aria-label="'+esc(title)+'"></span>':'<button type="button" class="pg-diamond'+(isKey(x)?' key':'')+cls+'" style="left:'+pct(x.end_date)+'" data-action="select:'+esc(x.id)+'" aria-label="'+esc(title)+'" aria-pressed="'+(st.sel===x.id)+'" title="'+esc(title)+'"></button>');
  else if(x.end_date){const a=x.start_date||x.end_date;track+=opts.readOnly?'<span class="pg-bar'+cls+'" style="left:'+pct(a)+';width:'+w(a,x.end_date)+'" role="img" aria-label="'+esc(title)+'"></span>':'<button type="button" class="pg-bar'+cls+'" style="left:'+pct(a)+';width:'+w(a,x.end_date)+'" data-action="select:'+esc(x.id)+'" aria-label="'+esc(title)+'" aria-pressed="'+(st.sel===x.id)+'" title="'+esc(title)+'"></button>';}
  const cash=c&&c.cash!==undefined?'<span class="pg-cash '+cushionTone(c.cushion)+'" title="'+esc(RUNWAY.source==='manual'?'Your cash forecast':'Runway snapshot '+monthLabel(RUNWAY.asOf))+'">'+esc(money(c.cash,RUNWAY.currency))+' · '+esc((c.cushion.beyond?'≥ ':'')+plural(c.cushion.months,'month'))+' cushion</span>':c&&c.beyondHorizon?'<span class="pg-cash">Beyond Runway forecast</span>':'';
  html+='<div class="pg-g-row'+(dim?' dim':'')+'"><div class="pg-g-label"><strong>'+esc(x.name||'Unnamed')+'</strong><small>'+esc([x.owner,ms?dateLabel(x.end_date):dateLabel(x.end_date),sd===null?'no baseline':sd>0?'+'+sd+' days':sd<0?sd+' days':'on baseline'].filter(Boolean).join(' · '))+'</small>'+cash+'</div><div class="pg-g-track">'+track+'</div></div>';}
 if(todayLeft)html+='<i class="pg-today" style="left:'+todayLeft+'" aria-hidden="true"></i>';
 html+='</div></div><div class="pg-legend"><span><i></i>Activity</span><span><i class="dia"></i>Key milestone</span><span><i class="crit"></i>Critical path</span><span><i class="ghost"></i>Baseline</span><span><i class="today"></i>'+esc(AS_OF_SOURCE==='today'?'Today':'As-of date')+'</span>'+(drive?'<span><i class="drive"></i>Drives the selected date</span>':'')+(RUNWAY.state==='ok'?'<span>Cash markers: Runway snapshot '+esc(monthLabel(RUNWAY.asOf))+' (green ≥ 6 months cushion, amber 3–6, red &lt; 3)</span>':'')+'</div>';
 return html;}
function ganttFallback(rows){const its=rows.filter(r=>r.item).map(r=>r.item);return '<details class="pg-fallback"><summary>Show timeline as a table</summary><div class="pg-scroll" role="region" aria-label="Timeline table" tabindex="0"><table class="pg-table compact"><caption>Timeline items, '+esc(asOfText())+'</caption><thead><tr><th scope="col">Item</th><th scope="col">Program</th><th scope="col">Function</th><th scope="col">Start</th><th scope="col">End</th><th scope="col">Baseline end</th><th scope="col">Critical path</th></tr></thead><tbody>'+its.map(x=>'<tr><th scope="row">'+esc(x.name||'')+'</th><td>'+esc(progName(x.program_id))+'</td><td>'+esc(FN_LABEL[x.function]||x.function||'—')+'</td><td>'+esc(dateLabel(x.start_date))+'</td><td>'+esc(dateLabel(x.end_date))+'</td><td>'+esc(x.baseline_end?dateLabel(x.baseline_end):'No baseline')+'</td><td>'+(CRIT_IDS.has(x.id)?'Yes':'No')+'</td></tr>').join('')+'</tbody></table></div></details>';}
function critPanel(pid){const c=CRIT[pid];if(!c)return '';const name=progName(pid);
 if(c.state==='partial')return '<p class="pg-muted">'+esc(name)+': critical path disabled because plan items were not read completely.</p>';
 if(c.state==='cycle')return '<p class="pg-muted">'+esc(name)+': critical path disabled, the predecessors form a cycle ('+esc(c.cycle.map(itemName).join(', '))+').</p>';
 if(c.state!=='ok')return '<p class="pg-muted">'+esc(name)+': '+(c.state==='nokey'?'no key milestone is marked, so there is no critical path. Mark the decisive milestone as key.':'no milestones yet.')+'</p>';
 return '<h3 class="pg-h3">'+esc(name)+' → '+esc(c.target.name)+' ('+esc(dateLabel(c.target.end_date))+')</h3><ol class="pg-crit">'+c.ids.map(id=>{const x=ITEM[id];return '<li><span><strong>'+esc(x.name||'')+'</strong> · '+esc(FN_LABEL[x.function]||x.function||'')+(conflict(x)?' '+pill('Starts before predecessor ends','amber'):'')+'</span><span>'+esc(x.start_date&&!isMilestone(x)?dateLabel(x.start_date)+' – ':'')+esc(dateLabel(x.end_date))+'</span></li>';}).join('')+'</ol>'+(c.broken?'<p class="pg-muted">The chain stops at an '+esc(c.broken)+'.</p>':'');}
function drivePanel(){const x=st.sel&&ITEM[st.sel];if(!x)return '';const c=chainOf(x.id);
 return '<section class="pg-panel pg-pad"><div class="pg-panel-head"><div><h2>What drives this date: '+esc(x.name||'')+'</h2><p>Its chain of predecessors (finish-to-start), earliest first. '+(CRIT_IDS.has(x.id)?'This item is on the critical path.':'This item is not on the critical path.')+'</p></div><div class="pg-row" style="margin-top:0">'+btn('Edit dates','edit:items:'+x.id,'pg-btn pg-btn-primary',!canWrite('items'))+btn('Clear','clear-select','pg-btn')+'</div></div>'+(c.cycle?'<p class="pg-muted">The predecessors form a cycle; fix one predecessor in Plan.</p>':'<ol class="pg-crit">'+c.chain.map(id=>{const y=ITEM[id];return '<li><span><strong>'+esc(y.name||'')+'</strong> · '+esc(FN_LABEL[y.function]||'')+' · '+esc(progName(y.program_id))+'</span><span>'+esc(dateLabel(y.end_date))+'</span></li>';}).join('')+'</ol>'+(c.broken?'<p class="pg-muted">The chain stops at an '+esc(c.broken)+'.</p>':''))+'</section>';}
function timeline(){
 if(st.present)return presentMode();
 let body=heading()+checks();
 const rows=ganttRows(st.tl.program,st.tl.fn);const per=60,itemsOnly=rows.filter(r=>r.item).length;
 // Page by items, keeping each page's lane headers.
 let pageRows=rows;const pages=Math.max(1,Math.ceil(itemsOnly/per));st.tl.page=Math.min(st.tl.page||0,pages-1);
 if(pages>1){let n=0;const lo=st.tl.page*per,hi=lo+per;pageRows=[];let lastP=null,lastF=null;for(const r of rows){if(r.lane==='program'){lastP=r;lastF=null;continue;}if(r.lane==='fn'){lastF=r;continue;}if(n>=lo&&n<hi){if(lastP){pageRows.push(lastP);lastP=null;}if(lastF){pageRows.push(lastF);lastF=null;}pageRows.push(r);}n++;}}
 body+='<section class="pg-panel"><div class="pg-pad"><div class="pg-panel-head"><div><h2>Integrated timeline</h2><p>Click a bar or milestone to see what drives its date. Dates change only through a reviewed edit; bars never move by drag.</p></div><div class="pg-row" style="margin-top:0">'+btn('Present mode','present-on','pg-btn',!PROGRAMS.length)+btn(icon('plus',15)+' Add item','add:items','pg-btn pg-btn-primary',!canWrite('items'))+'</div></div><div class="pg-controls"><label class="pg-field inline" for="pg-tl-p">Program<select id="pg-tl-p" name="tl_program" data-ui-state="true" data-action="tl-program"><option value="">All programs</option>'+programOptions().map(o=>'<option value="'+esc(o[0])+'"'+(st.tl.program===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></label><label class="pg-field inline" for="pg-tl-f">Function<select id="pg-tl-f" name="tl_function" data-ui-state="true" data-action="tl-function"><option value="">All functions</option>'+fnOpts().map(o=>'<option value="'+esc(o[0])+'"'+(st.tl.fn===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></label></div>'+(runwayNote()||integrationHint()?'<p class="pg-muted pg-note">'+esc(runwayNote())+(runwayNote()&&integrationHint()?' ':'')+integrationHint()+'</p>':'')+'</div>'+
  (pageRows.some(r=>r.item)?gantt(pageRows,{label:'Program timeline'})+'<div class="pg-pad pg-pad-top0">'+ganttFallback(pageRows)+'</div>':'<div class="pg-none">'+(ITEMS.length?'No dated items match these filters.':'No plan items yet. Add milestones and activities in Plan, or ask the assistant to build a first plan from a document you share.')+'</div>')+
  (pages>1?'<div class="pg-footer"><span>Items '+(st.tl.page*per+1)+'–'+Math.min(itemsOnly,(st.tl.page+1)*per)+' of '+itemsOnly+'</span><span class="pg-pager">'+btn('Previous','tl-prev','pg-btn small',st.tl.page===0)+'<span>Page '+(st.tl.page+1)+' of '+pages+'</span>'+btn('Next','tl-next','pg-btn small',st.tl.page>=pages-1)+'</span></div>':'')+'</section>';
 body+=drivePanel();
 const pids=PROGRAMS.filter(p=>!st.tl.program||p.id===st.tl.program).map(p=>p.id);
 body+='<section class="pg-panel pg-pad"><div class="pg-panel-head"><div><h2>Critical path</h2><p>The longest finish-to-start chain through predecessors that ends at each program\'s latest key milestone</p></div></div>'+(pids.length?pids.map(critPanel).join(''):'<p class="pg-muted">No programs.</p>')+'</section>';
 return body;}
function presentMode(){const p=progRow(st.tl.program)||PROGRAMS[0];if(!p)return heading()+empty('No program to present','Add a program first.');const h=healthOf(p),rows=ganttRows(p.id,'');
 const keys=ITEMS.filter(x=>x.program_id===p.id&&isKey(x)).sort((a,b)=>a.end_date.localeCompare(b.end_date));
 return '<div class="pg-row" style="margin-top:0;justify-content:space-between"><label class="pg-field inline" for="pg-pr-p">Program<select id="pg-pr-p" name="tl_program" data-ui-state="true" data-action="tl-program">'+programOptions().map(o=>'<option value="'+esc(o[0])+'"'+(p.id===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></label>'+btn('Exit present mode','present-off','pg-btn')+'</div>'+
 '<section class="pg-present" aria-label="Present mode"><h2>'+esc(p.data.name||'')+'</h2><p class="pg-muted">'+esc([STAGE_LABEL[p.data.stage],p.data.indication,p.data.modality&&cap(p.data.modality)].filter(Boolean).join(' · '))+' · '+healthBadge(h.h)+(h.d?' assessed '+esc(dateLabel(h.d)):'')+' · '+esc(asOfText())+'</p>'+(rows.length?gantt(rows,{readOnly:true,label:'Timeline for '+String(p.data.name||''),labelWidth:220}):'<p class="pg-muted">No dated items.</p>')+
 '<h3 class="pg-h3">Key milestones: original and current dates</h3>'+(keys.length?'<div class="pg-scroll" role="region" aria-label="Key milestones" tabindex="0"><table class="pg-table compact"><thead><tr><th scope="col">Milestone</th><th scope="col">Baseline</th><th scope="col">Current</th><th scope="col">Moves and reasons</th></tr></thead><tbody>'+keys.map(x=>'<tr><th scope="row">'+esc(x.name||'')+'</th><td>'+esc(x.baseline_end?dateLabel(x.baseline_end):'No baseline')+'</td><td>'+esc(dateLabel(x.end_date))+'</td><td>'+(slipsOf(x.id).map(s=>esc('+'+s.days+' d ('+(REASON_LABEL[s.reason]||s.reason)+')')).join('; ')||'—')+'</td></tr>').join('')+'</tbody></table></div>':'<p class="pg-muted">No key milestones.</p>')+
 '<p class="pg-muted">Read-only view for board or partner meetings. Image export is not available inside custom apps; use your device\'s screenshot or print to PDF.</p></section>';}

/* ---------- Plan ---------- */
function itemCell(k,x){const v=x[k];
 if(k==='name')return '<strong>'+esc(v||'—')+'</strong><small class="pg-sub">'+esc(isMilestone(x)?(isKey(x)?'Key milestone':'Milestone'):'Activity')+(CRIT_IDS.has(x.id)?' · critical path':'')+'</small>';
 if(k==='program_id')return esc(progName(v));if(k==='function')return esc(FN_LABEL[v]||label(v));
 if(k==='start_date'||k==='end_date')return esc(v?dateLabel(v):'—')+(k==='end_date'&&overdue(x)?' '+pill('Overdue','red'):'');
 if(k==='baseline_end')return v?esc(dateLabel(v)):'<span class="pg-muted">No baseline</span>';
 if(k==='slip'){const d=slipDays(x);return d===null?'<span class="pg-muted">No baseline</span>':d>0?pill('+'+d+' days','amber'):d<0?pill(d+' days','green'):'On baseline';}
 if(k==='status')return pill(cap(v),statusTone(v));
 if(k==='predecessor_id')return v?esc(itemName(v))+(conflict(x)?' '+pill('Overlap','amber'):''):'—';
 return esc(v===null||v===undefined||v===''?'—':v);}
function plan(){
 let body=heading()+checks();
 const owners=[...new Set(ITEMS.map(x=>String(x.owner||'')).filter(Boolean))].sort();
 const rows=filtered(ITEMS.slice().sort((a,b)=>(a.end_date||'').localeCompare(b.end_date||'')||String(a.name||'').localeCompare(String(b.name||''))),['name','program_id','owner','notes']);
 const cols=st.layout.cols.items.filter(k=>st.layout.visible['items:'+k]!==false),p=paged(rows);
 const needBase=PROGRAMS.filter(pr=>ITEMS.some(x=>x.program_id===pr.id&&!x.baseline_end&&x.end_date&&x.status!=='cancelled'));
 body+='<section class="pg-panel"><div class="pg-pad"><div class="pg-panel-head"><div><h2>Milestones and activities</h2><p>One predecessor per item (finish-to-start). Moving a committed, baselined date later needs a reason and records a slip in the same review.</p></div>'+(needBase.length?'<div class="pg-row" style="margin-top:0">'+needBase.slice(0,3).map(pr=>btn('Set baseline: '+esc(pr.data.name||''),'set-baseline:'+pr.id,'pg-btn',!writableField('items','baseline_end')||!itemsExact)).join('')+'</div>':'')+'</div>'+
  toolbar('items','Add item',[{key:'program_id',label:'Program',options:programOptions()},{key:'function',label:'Function',options:fnOpts()},{key:'status',label:'Status',options:opt(ITEM_STATUS)},{key:'owner',label:'Owner',options:owners.map(o=>[o,o])},{key:'from',label:'Ends on or after',options:null},{key:'to',label:'Starts on or before',options:null}])+'</div>'+
  (p.total?'<div class="pg-scroll" role="region" aria-label="Plan items" tabindex="0"><table class="pg-table"><thead><tr>'+cols.map(k=>'<th scope="col">'+esc((templateLayoutSchema.groups.items.find(c=>c.id===k)||{}).label||k)+'</th>').join('')+'<th scope="col" class="pg-actions" aria-label="Actions"></th></tr></thead><tbody>'+p.slice.map(x=>'<tr>'+cols.map(k=>'<td>'+itemCell(k,x)+'</td>').join('')+'<td class="pg-actions">'+rowMenu('items',x.id,String(x.name||'item'),x.baseline_end?btn('Reset baseline','rebaseline:'+x.id,'',!writableField('items','baseline_end')):'')+'</td></tr>').join('')+'</tbody></table></div>':'<div class="pg-none">'+(ITEMS.length?'No items match the search or filters.':'No plan items yet. Add the first milestone, or ask the assistant to propose a plan from a development plan you share.')+'</div>')+pager(p,partialLabel('items'))+'</section>';
 return body;}

/* ---------- Gates and decisions ---------- */
function gateCard(d){const r=readiness(d),days=d.target_date&&AS_OF?diffDays(AS_OF,d.target_date):null;
 return '<article class="pg-scard"><div class="pg-scard-head"><strong>'+esc(d.name||'')+'</strong>'+pill(OUTCOME_LABEL[d.outcome||'pending']||'Pending',d.outcome==='go'?'green':d.outcome==='no_go'?'red':d.outcome==='conditional'?'amber':'')+'<span class="pg-muted">'+esc(progName(d.program_id))+' · '+(d.target_date?esc(dateLabel(d.target_date))+(days!==null?' ('+(days>=0?plural(days,'day')+' to go':plural(-days,'day')+' ago')+')':''):'No target date')+'</span></div>'+
 (r.total?'<p>Readiness: <strong>'+r.met+' of '+r.total+'</strong> criteria met'+(r.notMet?', '+r.notMet+' not met':'')+(r.open?', '+r.open+' open':'')+'</p><ul class="pg-checklist">'+r.list.map(c=>'<li>'+pill(c.state==='met'?'Met':c.state==='not met'?'Not met':'Open',c.state==='met'?'green':c.state==='not met'?'red':'')+'<span>'+esc(c.text)+'</span></li>').join('')+'</ul>':'<p>'+pill('No criteria','amber')+' Add criteria so readiness can be judged.</p>')+
 (d.outcome&&d.outcome!=='pending'?'<p>Decided '+esc(dateLabel(d.decided_on))+(d.approver?' by '+esc(d.approver):'')+': '+esc(d.rationale||'')+'</p>':'')+
 '<div class="pg-row">'+btn('Record outcome','outcome:'+d.id,'pg-btn small pg-btn-primary',!canWrite('decisions'),'aria-label="Record outcome for '+esc(d.name||'gate')+'"')+btn('Edit criteria','edit:decisions:'+d.id,'pg-btn small',!canWrite('decisions'))+'</div></article>';}
function decisions(){
 let body=heading()+checks();
 const gates=DECISIONS.filter(d=>d.kind==='gate').sort((a,b)=>((!a.outcome||a.outcome==='pending')===(!b.outcome||b.outcome==='pending')?0:(!a.outcome||a.outcome==='pending')?-1:1)||(a.target_date||'9').localeCompare(b.target_date||'9'));
 const upcoming=gates.filter(d=>!d.outcome||d.outcome==='pending'),done=gates.filter(d=>d.outcome&&d.outcome!=='pending');
 body+='<section class="pg-panel pg-pad"><div class="pg-panel-head"><div><h2>Upcoming gates</h2><p>Criteria checklist, readiness and days to the gate. Outcomes are recorded by people; follow-up milestones are created or cancelled in the same review.</p></div>'+btn(icon('plus',15)+' Add gate','add:decisions','pg-btn pg-btn-primary',!canWrite('decisions'))+'</div>'+(upcoming.length?'<ul class="pg-cards">'+upcoming.map(d=>'<li>'+gateCard(d)+'</li>').join('')+'</ul>':'<p class="pg-muted">No pending gates.</p>')+'</section>';
 const rows=filtered(DECISIONS.filter(d=>d.kind!=='gate'||(d.outcome&&d.outcome!=='pending')).sort((a,b)=>(b.decided_on||b.target_date||'').localeCompare(a.decided_on||a.target_date||'')),['name','program_id','rationale','options']);
 const cols=st.layout.cols.decisions.filter(k=>st.layout.visible['decisions:'+k]!==false),p=paged(rows);
 body+='<section class="pg-panel"><div class="pg-pad"><div class="pg-panel-head"><div><h2>Decisions log</h2><p>Decided gates and other decisions with their options and rationale, linked to the milestones or risks they affect</p></div></div>'+toolbar('decisions','Add decision',[{key:'program_id',label:'Program',options:programOptions()},{key:'kind',label:'Kind',options:opt(['gate','decision'])},{key:'outcome',label:'Outcome',options:OUTCOMES.map(o=>[o,OUTCOME_LABEL[o]])}])+'</div>'+
  (p.total?'<div class="pg-scroll" role="region" aria-label="Decisions log" tabindex="0"><table class="pg-table"><thead><tr>'+cols.map(k=>'<th scope="col">'+esc((templateLayoutSchema.groups.decisions.find(c=>c.id===k)||{}).label||k)+'</th>').join('')+'<th scope="col">Affects</th><th scope="col" class="pg-actions" aria-label="Actions"></th></tr></thead><tbody>'+p.slice.map(d=>'<tr>'+cols.map(k=>'<td>'+(k==='name'?'<strong>'+esc(d.name||'')+'</strong>'+(d.rationale?'<small class="pg-sub">'+esc(String(d.rationale).slice(0,120))+'</small>':''):k==='program_id'?esc(progName(d.program_id)):k==='outcome'?pill(OUTCOME_LABEL[d.outcome||'pending']||'Pending',d.outcome==='go'?'green':d.outcome==='no_go'?'red':''):k==='target_date'||k==='decided_on'?esc(d[k]?dateLabel(d[k]):'—'):esc(cap(d[k])))+'</td>').join('')+'<td>'+esc(linkName(d.linked_item_id))+'</td><td class="pg-actions">'+rowMenu('decisions',d.id,String(d.name||'decision'))+'</td></tr>').join('')+'</tbody></table></div>':'<div class="pg-none">'+(done.length||DECISIONS.length?'No decisions match.':'No decisions recorded yet.')+'</div>')+pager(p,partialLabel('decisions'))+'</section>';
 return body;}
function linkName(id){if(!id)return '—';const x=itemRow(id);if(x)return itemName(id);const r=R.raid.allRows.find(y=>y.id===id);return r?String(r.data.name||'RAID entry')+(bool(r.data.archived)?' (archived)':''):'Unavailable';}

/* ---------- RAID ---------- */
function raid(){
 let body=heading()+checks();
 const live=RAID.filter(openRaid),cnt={};for(const x of live){const k=x.likelihood+':'+x.impact;if(LV[x.likelihood]&&LV[x.impact])cnt[k]=(cnt[k]||0)+1;}
 const unscored=live.filter(x=>score(x)===null).length;
 body+='<div class="pg-grid2 wide-left"><section class="pg-panel pg-pad"><div class="pg-panel-head"><div><h2>Likelihood × impact</h2><p>Open and monitored entries, counted per cell. Click a cell to filter the register.</p></div></div><div class="pg-matrix" role="group" aria-label="Risk heat matrix"><span class="ax"></span>'+LMH.map(i=>'<span class="ax">Impact '+i+'</span>').join('')+LMH.slice().reverse().map(l=>'<span class="ax">Likelihood '+l+'</span>'+LMH.map(i=>{const k=l+':'+i,s=LV[l]*LV[i];return btn(String(cnt[k]||0),'matrix:'+k,'pg-cellbtn s'+(s>=6?3:s>=3?2:1),false,'aria-pressed="'+(st.matrix===k)+'" aria-label="'+(cnt[k]||0)+' entries with '+l+' likelihood and '+i+' impact"');}).join('')).join('')+'</div>'+(unscored?'<p class="pg-muted">'+plural(unscored,'open entry')+' without likelihood or impact are not in the grid.</p>':'')+'</section>';
 body+='<section class="pg-panel pg-pad"><h2>Summary</h2>'+RAID_TYPES.map(t=>'<div class="pg-kv"><span>'+esc(cap(t))+'s open</span><strong>'+tot(live.filter(x=>x.raid_type===t).length)+'</strong></div>').join('')+'<div class="pg-kv"><span>Past review date</span><strong>'+tot(live.filter(x=>x.next_review&&AS_OF&&x.next_review<AS_OF).length)+'</strong></div></section></div>';
 let rows=filtered(RAID.slice().sort((a,b)=>(score(b)||0)-(score(a)||0)||String(a.name||'').localeCompare(String(b.name||''))),['name','owner','mitigation','program_id']);
 if(st.matrix){const [l,i]=st.matrix.split(':');rows=rows.filter(x=>openRaid(x)&&x.likelihood===l&&x.impact===i);}
 const cols=st.layout.cols.raid.filter(k=>st.layout.visible['raid:'+k]!==false),p=paged(rows);
 const cell=(k,x)=>k==='name'?'<strong>'+esc(x.name||'')+'</strong>'+(x.mitigation?'<small class="pg-sub">'+esc(String(x.mitigation).slice(0,120))+'</small>':''):k==='program_id'?esc(progName(x.program_id)):k==='raid_type'?pill(cap(x.raid_type),x.raid_type==='issue'?'red':x.raid_type==='risk'?'amber':''):k==='score'?(score(x)===null?'<span class="pg-muted">Not scored</span>':pill(cap(x.likelihood)+' × '+cap(x.impact),band(score(x))==='high'?'red':band(score(x))==='medium'?'amber':'')):k==='next_review'?esc(x.next_review?dateLabel(x.next_review):'—')+(openRaid(x)&&x.next_review&&AS_OF&&x.next_review<AS_OF?' '+pill('Past review','amber'):''):k==='status'?pill(cap(x.status),x.status==='closed'?'green':''):esc(x[k]||'—');
 body+='<section class="pg-panel"><div class="pg-pad"><div class="pg-panel-head"><div><h2>RAID register</h2><p>Risks, assumptions, issues and dependencies'+(st.matrix?' · filtered by the matrix cell':'')+'</p></div></div>'+toolbar('raid','Add entry',[{key:'program_id',label:'Program',options:programOptions()},{key:'raid_type',label:'Type',options:opt(RAID_TYPES)},{key:'status',label:'Status',options:opt(['open','monitoring','closed'])}])+'</div>'+
  (p.total?'<div class="pg-scroll" role="region" aria-label="RAID register" tabindex="0"><table class="pg-table"><thead><tr>'+cols.map(k=>'<th scope="col">'+esc((templateLayoutSchema.groups.raid.find(c=>c.id===k)||{}).label||k)+'</th>').join('')+'<th scope="col" class="pg-actions" aria-label="Actions"></th></tr></thead><tbody>'+p.slice.map(x=>'<tr>'+cols.map(k=>'<td>'+cell(k,x)+'</td>').join('')+'<td class="pg-actions">'+rowMenu('raid',x.id,String(x.name||'entry'),x.raid_type==='assumption'&&openRaid(x)?btn('Promote to risk','promote:'+x.id+':risk','',!canWrite('raid')):x.raid_type==='risk'&&openRaid(x)?btn('Promote to issue','promote:'+x.id+':issue','',!canWrite('raid')):'')+'</td></tr>').join('')+'</tbody></table></div>':'<div class="pg-none">'+(RAID.length?'No entries match.':'No RAID entries yet.')+'</div>')+pager(p,partialLabel('raid'))+'</section>';
 return body;}

/* ---------- Updates and reports ---------- */
function updates(){
 let body=heading()+checks();
 body+='<div class="pg-seg" role="tablist" aria-label="Updates sections">'+[['updates','Monthly updates'],['report','Leadership report'],['archive','Report archive']].map(x=>btn(esc(x[1]),'up-tab:'+x[0],'pg-seg-btn',false,'role="tab" aria-selected="'+(st.upTab===x[0])+'"')).join('')+'</div>';
 if(st.upTab==='updates'){const rows=filtered(UPDATES.slice().sort((a,b)=>String(b.month).localeCompare(String(a.month))||progName(a.program_id).localeCompare(progName(b.program_id))),['summary','next_steps','author','program_id']);const p=paged(rows);
  body+='<section class="pg-panel"><div class="pg-pad"><div class="pg-panel-head"><div><h2>Monthly program updates</h2><p>Health with rationale, summary and next steps, one per program and month. Due on day '+UPDATE_DAY+' of the month.</p></div></div>'+toolbar('updates','Add update',[{key:'program_id',label:'Program',options:programOptions()},{key:'health',label:'Health',options:opt(HEALTH)}])+'</div>'+
  (p.total?'<div class="pg-scroll" role="region" aria-label="Monthly updates" tabindex="0"><table class="pg-table"><thead><tr><th scope="col">Month</th><th scope="col">Program</th><th scope="col">Health</th><th scope="col">Summary</th><th scope="col">Author</th><th scope="col" class="pg-actions" aria-label="Actions"></th></tr></thead><tbody>'+p.slice.map(u=>'<tr><td>'+esc(monthLabel(u.month))+'</td><td>'+esc(progName(u.program_id))+'</td><td>'+healthBadge(HEALTH.includes(u.health)?u.health:'unassessed')+'<small class="pg-sub">'+esc(String(u.rationale||'').slice(0,90))+'</small></td><td>'+esc(String(u.summary||'—').slice(0,160))+'</td><td>'+esc(u.author||'—')+'</td><td class="pg-actions">'+btn('Details','details:updates:'+u.id,'pg-btn small')+btn('Edit','edit:updates:'+u.id,'pg-btn small',!canWrite('updates'))+'</td></tr>').join('')+'</tbody></table></div>':'<div class="pg-none">'+(UPDATES.length?'No updates match.':'No monthly updates yet.')+'</div>')+pager(p,partialLabel('updates'))+'</section>';}
 else if(st.upTab==='report'){const months=[...new Set(UPDATES.map(u=>u.month).concat(AS_OF?[AS_OF.slice(0,7)]:[]))].filter(Boolean).sort().reverse();const m=ym(st.reportMonth)&&months.includes(ym(st.reportMonth))?ym(st.reportMonth):months[0]||'';st.reportMonth=m;
  const c=m?reportContents(m):null,d=st.reportDraft||{};const title=String(d.title||('Leadership report — '+monthLabel(m)));
  body+='<section class="pg-panel pg-pad"><div class="pg-panel-head"><div><h2>Assemble the leadership report</h2><p>Built from the month\'s updates, milestones, slips, gates and top risks. Saving freezes it: later edits never change a saved report.</p></div></div>'+
  '<form data-action="report-save" class="pg-drawer-form"><div class="pg-pair"><label class="pg-field" for="pg-rm">Month<select class="pg-input" id="pg-rm" name="month" data-ui-state="true" data-action="report-month">'+months.map(x=>'<option value="'+x+'"'+(x===m?' selected':'')+'>'+esc(monthLabel(x))+'</option>').join('')+'</select></label><label class="pg-field" for="pg-rt">Title<input class="pg-input" id="pg-rt" name="title" data-ui-state="true" data-action="report-draft" value="'+esc(title)+'"></label><label class="pg-field wide" for="pg-rn">Narrative (optional)<textarea class="pg-textarea" id="pg-rn" name="narrative" data-ui-state="true" data-action="report-draft">'+esc(d.narrative||'')+'</textarea></label></div>'+
  (c?'<h3 class="pg-h3">Preview</h3><div class="pg-report">'+esc(reportText(title,String(d.narrative||''),c))+'</div>':'<p class="pg-muted">No month to report yet.</p>')+'<div class="pg-row end"><button type="submit" class="pg-btn pg-btn-primary"'+(!c||!canWrite('reports')||!exact?' disabled':'')+'>Prepare reviewed save</button></div>'+(!exact?'<p class="pg-muted">Saving needs complete reads of every Programs table.</p>':'')+'</form></section>';}
 else{const reps=R.reports.rows.slice().sort((a,b)=>String(b.data.month||'').localeCompare(String(a.data.month||''))||String(b.data.saved_on||'').localeCompare(String(a.data.saved_on||'')));
  const v=st.reportView&&lookup('reports',st.reportView);
  if(v){const c=parseJSON(v.data.contents);const text=c?reportText(String(v.data.title||''),String(v.data.narrative||''),c):'This report has no frozen contents.';
   body+='<section class="pg-panel pg-pad"><div class="pg-panel-head"><div><div class="pg-eyebrow">Frozen report · read-only</div><h2>'+esc(v.data.title||'Report')+'</h2><p>'+esc(monthLabel(ym(v.data.month)))+' · saved '+esc(dateLabel(validDate(v.data.saved_on)))+'. Shown exactly as saved.</p></div><div class="pg-row" style="margin-top:0">'+btn(st.exportOpen?'Hide export':'Export','toggle-export','pg-btn')+btn('Back to archive','report-close','pg-btn')+'</div></div>'+(st.exportOpen?'<label class="pg-field wide" for="pg-exp">Copy this text (Markdown) into Investor Updates, Board or a document<textarea class="pg-textarea mono" id="pg-exp" readonly data-ui-state="true">'+esc(text)+'</textarea></label>':'<div class="pg-report">'+esc(text)+'</div>')+'</section>';}
  else body+='<section class="pg-panel"><div class="pg-pad"><h2>Report archive</h2><p class="pg-muted">Saved reports never change.</p></div>'+(reps.length?'<ul class="pg-list pad">'+reps.map(r=>'<li><span><strong>'+esc(r.data.title||'Report')+'</strong><small class="pg-sub">'+esc(monthLabel(ym(r.data.month)))+' · saved '+esc(dateLabel(validDate(r.data.saved_on)))+'</small></span>'+btn('Open','report-open:'+r.id,'pg-btn small',false,'aria-label="Open '+esc(r.data.title||'report')+'"')+'</li>').join('')+'</ul>':'<div class="pg-none">No saved reports yet.</div>')+'</section>';}
 return body;}

/* ---------- Settings ---------- */
function cashPanel(){
 const rows=RUNWAY.source==='manual'?RUNWAY.months.slice().reverse():[];
 if(CASH_LINKED)return '<section class="pg-panel pg-pad"><h2>Cash forecast</h2><p class="pg-muted">From Runway'+(RUNWAY.source==='runway'&&RUNWAY.asOf?', snapshot of '+esc(monthLabel(RUNWAY.asOf)):'')+'. Read-only here.</p></section>';
 return '<section class="pg-panel pg-pad"><div class="pg-panel-head"><div><h2>Cash forecast</h2><p>Closing cash by month, used for cash at key milestones.</p></div>'+btn(icon('plus',15)+' Add month','add:closes','pg-btn',!canWrite('closes'))+'</div>'+
  (rows.length?'<ul class="pg-list plain">'+rows.slice(0,24).map(p=>'<li><span>'+esc(monthLabel(p.m))+'</span><span><strong>'+esc(money(p.c,p.cur))+'</strong> '+btn('Edit','edit:closes:'+p.id,'pg-btn small',!canWrite('closes'),'aria-label="Edit '+esc(monthLabel(p.m))+'"')+'</span></li>').join('')+'</ul>':'<p class="pg-muted">No months entered yet.</p>')+
  (integrationHint()?'<p class="pg-muted pg-note">'+integrationHint()+'</p>':'')+'</section>';}
function settingsScreen(){
 let body=heading()+checks();const s=settingsRow;const show=(k,v)=>'<div class="pg-kv"><span>'+esc(k)+'</span><strong>'+esc(v)+'</strong></div>';
 body+='<div class="pg-grid2"><section class="pg-panel pg-pad"><div class="pg-panel-head"><div><h2>Program settings</h2><p>Stored in the Programs settings table; changes are reviewed.</p></div>'+btn(s?'Edit settings':'Create settings','edit-settings','pg-btn pg-btn-primary',!canWrite('settings'))+'</div>'+
  show('Function lanes',FN_ORDER.map(f=>FN_LABEL[f]).join(', '))+show('Stages',STAGE_ORDER.map(x=>STAGE_LABEL[x]).join(', '))+show('Due-soon window',DUE_SOON+' days')+show('Monthly update day','Day '+UPDATE_DAY)+'<h3 class="pg-h3">Health definitions</h3><p class="pg-commentary">'+esc(SET.health_definitions||'Not defined yet. Write what green, amber and red mean for your programs.')+'</p>'+(!s?'<p class="pg-muted">No settings saved yet; defaults are shown.</p>':'')+'</section>';
 body+=cashPanel();
 body+='<section class="pg-panel pg-pad"><h2>Access, automations and links</h2><ul class="pg-list plain"><li><span><strong>Access</strong>: TrialAgents sidebar → Access → Projects → this app. Access is app-level; share with a write restriction for board members. Confidential programs belong in a separate Programs app with separate data in a restricted project — hiding a program here is not security.</span></li><li><span><strong>Automations</strong>: TrialAgents sidebar → Automations. Optional: monthly update reminder, slip notice for key milestones, monthly status draft. The app never waits for them.</span></li><li><span><strong>Layout</strong>: the gear reorders, renames or hides screens and columns through a reviewed app update.</span></li><li><span><strong>Cash at milestones</strong>: '+esc(RUNWAY.source==='runway'&&RUNWAY.state==='ok'?'from Runway, snapshot of '+monthLabel(RUNWAY.asOf)+'.':CASH_LINKED?'from Runway.':'from the cash forecast on this screen.')+'</span></li><li><span><strong>As-of date</strong>: '+esc(AS_OF_SOURCE==='today'?'today\'s date from the app runtime.':AS_OF_SOURCE==='pinned'?'fixed for this preview ('+dateLabel(AS_OF)+').':'set with the as-of control.')+'</span></li></ul></section></div>';
 body+='<section class="pg-panel"><div class="pg-pad"><div class="pg-panel-head"><div><h2>Programs</h2><p>Shared workspace table (core role programs), also used by Runway and other apps. Health is a dated human judgement; the app never sets it.</p></div>'+btn(icon('plus',15)+' Add program','add:programs','pg-btn',!canWrite('programs'))+'</div></div>'+
  (R.programs.unbound?'<div class="pg-none">The programs table is not connected to this app.</div>':R.programs.unavailable?'<div class="pg-none">You do not have access to the programs table.</div>':PROGRAMS.length?'<div class="pg-scroll" role="region" aria-label="Programs" tabindex="0"><table class="pg-table"><thead><tr><th scope="col">Program</th><th scope="col">Stage</th><th scope="col">Status</th><th scope="col">Health</th><th scope="col">Lead</th><th scope="col" class="pg-actions" aria-label="Actions"></th></tr></thead><tbody>'+PROGRAMS.map(p=>{const h=healthOf(p);return '<tr><td><strong>'+esc(p.data.name||'')+'</strong><small class="pg-sub">'+esc([p.data.code,p.data.indication,p.data.modality&&cap(p.data.modality)].filter(Boolean).join(' · '))+'</small></td><td>'+esc(STAGE_LABEL[p.data.stage]||cap(p.data.stage))+'</td><td>'+esc(cap(p.data.status||'active'))+'</td><td>'+healthBadge(h.h)+'<small class="pg-sub">'+esc(h.d?dateLabel(h.d):'not assessed')+'</small></td><td>'+esc(p.data.lead||'—')+'</td><td class="pg-actions">'+rowMenu('programs',p.id,String(p.data.name||'program'))+'</td></tr>';}).join('')+'</tbody></table></div>':'<div class="pg-none">No programs yet.</div>')+'</section>';
 return body;}

/* ---------- overlays ---------- */
const PEOPLE=R.people.rows.map(r=>String(r.data.name||'')).filter(Boolean).sort();
function editorPanel(){const x=st.editor;if(!x)return '';const role=x.role,m=roleMap[role];
 const title=(x.mode==='edit'?'Edit ':x.mode==='duplicate'?'Duplicate ':'Add ')+ROLE_LABEL[role];
 const fields=S[role].filter(f=>f.kind!=='frozen'&&f.key!=='archived'&&m&&m.fields[f.key]);
 const control=f=>{const v=x.draft[f.key]??'',id='pg-f-'+f.key,dis=!writableField(role,f.key)?' disabled':'';const common=' id="'+id+'" name="'+f.key+'" data-ui-state="true" data-action="draft:'+f.key+'"'+dis+(f.required?' required':'');
  if(f.kind==='baseline')return '<input class="pg-input" type="text" id="'+id+'" value="'+esc(validDate(v)?dateLabel(validDate(v)):'No baseline')+'" readonly aria-readonly="true" data-ui-state="true">';
  if(f.kind==='select')return '<select class="pg-input"'+common+'><option value="">Choose…</option>'+f.options.map(o=>'<option value="'+esc(o)+'"'+(String(v)===o?' selected':'')+'>'+esc(f.key==='function'?FN_LABEL[o]:f.key==='stage'?STAGE_LABEL[o]:f.key==='outcome'?OUTCOME_LABEL[o]:f.key==='reason'?REASON_LABEL[o]:cap(o))+'</option>').join('')+'</select>';
  if(f.kind==='ref'){const cur=String(v||'');let rows=f.ref==='items'?ITEMS.filter(i=>i.id!==x.id).map(i=>({id:i.id,name:String(i.name||'')+' · '+progName(i.program_id)+(i.end_date?' · '+dateLabel(i.end_date):'')})):R[f.ref].rows.map(r=>({id:r.id,name:String(r.data.name||'Unnamed')}));const keep=cur&&!rows.some(r=>r.id===cur);
   return '<select class="pg-input"'+common+'><option value="">'+(f.required?'Choose…':'None')+'</option>'+(keep?'<option value="'+esc(cur)+'" selected>'+esc(f.ref==='items'?itemName(cur):progName(cur))+'</option>':'')+rows.map(r=>'<option value="'+esc(r.id)+'"'+(cur===r.id?' selected':'')+'>'+esc(r.name)+'</option>').join('')+'</select>';}
  if(f.kind==='link'){const cur=String(v||''),opts=ITEMS.map(i=>[i.id,'Plan item: '+String(i.name||'')]).concat(RAID.filter(r=>r.id!==x.id).map(r=>[r.id,cap(r.raid_type)+': '+String(r.name||'')]));const keep=cur&&!opts.some(o=>o[0]===cur);
   return '<select class="pg-input"'+common+'><option value="">None</option>'+(keep?'<option value="'+esc(cur)+'" selected>'+esc(linkName(cur))+'</option>':'')+opts.map(o=>'<option value="'+esc(o[0])+'"'+(cur===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select>';}
  if(f.kind==='longtext')return '<textarea class="pg-textarea"'+common+'>'+esc(v)+'</textarea>';
  if(f.kind==='boolean')return '<select class="pg-input"'+common+'><option value="false"'+(!bool(v)?' selected':'')+'>No</option><option value="true"'+(bool(v)?' selected':'')+'>Yes</option></select>';
  if(f.kind==='person'){const input='<input class="pg-input" type="text"'+common+' value="'+esc(v)+'" placeholder="Name">';if(!PEOPLE.length||dis)return input;
   return input+'<select class="pg-input" name="pick_'+f.key+'" data-ui-state="true" data-action="pick:'+f.key+'" aria-label="Pick '+esc(f.label.toLowerCase())+' from People"><option value="">Pick from People…</option>'+PEOPLE.map(n=>'<option value="'+esc(n)+'">'+esc(n)+'</option>').join('')+'</select>';}
  const type=f.kind==='date'?'date':f.kind==='month'?'month':f.kind==='number'?'number':'text';const val=f.kind==='month'?(ym(v)||String(v||'')):f.kind==='date'?(validDate(v)||String(v||'')):v;
  return '<input class="pg-input" type="'+type+'"'+common+(f.kind==='number'?' step="1"':'')+' value="'+esc(val)+'">';};
 const changed=JSON.stringify(x.draft)!==x.initial;let extra='';
 if(role==='items'&&x.mode==='edit'){const orig=ITEM[x.id],ne=validDate(x.draft.end_date);
  if(orig&&ne&&orig.end_date&&ne!==orig.end_date){const later=ne>orig.end_date;
   if(needsSlip(orig,ne))extra+='<div class="pg-banner warn"><strong>Committed date moves later by '+plural(diffDays(orig.end_date,ne),'day')+'.</strong> Saving records one slip with your reason in the same review (baseline '+esc(dateLabel(orig.baseline_end))+').</div><div class="pg-pair"><label class="pg-field" for="pg-f-slip_reason">Slip reason *<select class="pg-input" id="pg-f-slip_reason" name="slip_reason" data-ui-state="true" data-action="draft:slip_reason" required><option value="">Choose…</option>'+REASONS.map(r=>'<option value="'+r+'"'+(x.draft.slip_reason===r?' selected':'')+'>'+esc(REASON_LABEL[r])+'</option>').join('')+'</select></label><label class="pg-field" for="pg-f-slip_detail">Detail<input class="pg-input" id="pg-f-slip_detail" name="slip_detail" data-ui-state="true" data-action="draft:slip_detail" value="'+esc(x.draft.slip_detail||'')+'"></label></div>';
   if(later){const moves=itemsExact?downstream(x.id,ne):null;
    extra+='<section class="pg-effect-block" aria-label="Downstream impact"><h3 class="pg-h3">Downstream impact</h3>'+(moves===null?'<p class="pg-muted">Plan items were not read completely, so the downstream impact cannot be shown and successors will not be moved.</p>':moves.length?'<p class="pg-muted">These successors would start later (predecessor end + 1 day). They change only if you accept them here, in the same review.</p><ul class="pg-list">'+moves.map(mv=>'<li><span><strong>'+esc(mv.name)+'</strong>'+(CRIT_IDS.has(mv.id)?' '+pill('Critical path','blue'):'')+'</span><span>'+esc(dateLabel(mv.old_end))+' → '+esc(dateLabel(mv.new_end))+' (+'+mv.days+' d)</span></li>').join('')+'</ul><label class="pg-check"><input type="checkbox" name="accept_downstream" value="true" data-ui-state="true" data-action="draft:accept_downstream"'+(bool(x.draft.accept_downstream)?' checked':'')+'> Also move these '+plural(moves.length,'successor')+'</label>':'<p class="pg-muted">No successor is pushed by this change.</p>')+'</section>';}}}
 const lead=role==='programs'?'<div class="pg-banner info">Health is your dated judgement: when you set green, amber or red, give the rationale and the assessment date. The app flags health older than '+STALE_HEALTH_DAYS+' days and never changes it.</div>':role==='decisions'?'<div class="pg-banner info">Write one criterion per line, starting with [met], [not met] or [open]. Record outcomes with Record outcome on the gate card.</div>':'';
 return '<div class="pg-overlay"><section class="pg-drawer" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="pg-drawer-head"><div><div class="pg-eyebrow">Reviewed data change</div><h2>'+esc(title)+'</h2></div>'+btn(icon('close',17),'cancel-modal','pg-icon-btn',false,'aria-label="Close editor"')+'</div><form data-action="save-record" class="pg-drawer-form"><div class="pg-drawer-body"><div class="pg-banner info">Edits are proposals until you approve the TrialAgents review. Opening this form changes nothing.</div>'+lead+'<div class="pg-pair">'+fields.map(f=>'<label class="pg-field'+(f.kind==='longtext'?' wide':'')+'" for="pg-f-'+f.key+'">'+esc(f.label)+(f.required?' *':'')+control(f)+'</label>').join('')+'</div>'+extra+'</div><div class="pg-drawer-foot"><span class="pg-muted">'+(changed?'Unsaved changes':'No changes yet')+'</span>'+btn('Cancel','cancel-modal')+'<button type="submit" class="pg-btn pg-btn-primary"'+(changed&&canWrite(role)?'':' disabled')+'>Prepare reviewed save</button></div></form></section></div>';}
function detailPanel(){const d=st.detail;if(!d||!R[d.role])return '';const r=lookup(d.role,d.id);if(!r)return '';
 const rows=S[d.role].filter(f=>f.kind!=='frozen'&&roleMap[d.role]&&roleMap[d.role].fields[f.key]).map(f=>{let v=r.data[f.key];if(f.kind==='ref')v=f.ref==='items'?itemName(v):progName(v);else if(f.kind==='link')v=linkName(v);else if(f.kind==='date'||f.kind==='baseline')v=validDate(v)?dateLabel(validDate(v)):(f.kind==='baseline'?'No baseline':v);else if(f.kind==='month')v=monthLabel(ym(v));else if(f.kind==='boolean')v=bool(v)?'Yes':'No';else if(f.kind==='select')v=f.key==='function'?FN_LABEL[v]:f.key==='stage'?STAGE_LABEL[v]:cap(v);return '<div class="pg-kv"><span>'+esc(f.label.replace(/ \(.*\)$/,''))+'</span><strong>'+esc(v===null||v===undefined||v===''?'—':v)+'</strong></div>';}).join('');
 let story='';if(d.role==='items'){const x=ITEM[d.id],sl=slipsOf(d.id);story='<h3 class="pg-h3">Slip story</h3>'+(x&&x.baseline_end?'<div class="pg-kv"><span>Original (baseline)</span><strong>'+esc(dateLabel(x.baseline_end))+'</strong></div><div class="pg-kv"><span>Current</span><strong>'+esc(dateLabel(x.end_date))+(slipDays(x)?' ('+(slipDays(x)>0?'+':'')+slipDays(x)+' days)':'')+'</strong></div>':'<p class="pg-muted">No baseline: slips are measured once the plan is baselined.</p>')+(sl.length?'<ul class="pg-list">'+sl.map(s=>'<li><span><strong>'+esc(REASON_LABEL[s.reason]||cap(s.reason))+'</strong>'+(s.detail?'<small class="pg-sub">'+esc(s.detail)+'</small>':'')+'</span><span>'+esc(dateLabel(s.old_end))+' → '+esc(dateLabel(s.new_end))+' (+'+esc(s.days)+' d) · '+esc(dateLabel(s.changed_on))+'</span></li>').join('')+'</ul><p class="pg-muted">Cumulative: +'+sl.reduce((n,s)=>n+num(s.days,0),0)+' days in '+plural(sl.length,'move')+'.</p>':'<p class="pg-muted">No recorded moves.</p>');}
 return '<div class="pg-overlay"><section class="pg-drawer" role="dialog" aria-modal="true" aria-label="Details"><div class="pg-drawer-head"><div><div class="pg-eyebrow">'+esc(cap(ROLE_LABEL[d.role]))+'</div><h2>'+esc(r.data.name||r.data.title||(d.role==='updates'?progName(r.data.program_id)+' · '+monthLabel(ym(r.data.month)):'Details'))+'</h2></div>'+btn(icon('close',17),'close-details','pg-icon-btn',false,'aria-label="Close details"')+'</div><div class="pg-drawer-body">'+rows+story+'<p class="pg-muted">Record ID '+esc(r.id)+' · version '+esc(r.version)+'</p></div><div class="pg-drawer-foot">'+btn('Close','close-details')+btn('Edit','edit:'+d.role+':'+d.id,'pg-btn pg-btn-primary',!canWrite(d.role))+'</div></section></div>';}
function confirmPanel(){const c=st.confirm;if(!c)return '';const box=(lbl,h,body,actions)=>'<div class="pg-overlay center"><section class="pg-modal" role="alertdialog" aria-modal="true" aria-label="'+esc(lbl)+'"><h2>'+esc(h)+'</h2>'+body+'<div class="pg-row end">'+btn('Cancel','cancel-modal')+actions+'</div></section></div>';
 if(c.kind==='archive'){const r=lookup(c.role,c.id);return box('Archive record','Archive this '+ROLE_LABEL[c.role]+'?','<p><strong>'+esc(r?(r.data.name||''):'')+'</strong> is hidden from the plan, timeline and totals after you approve the review. Its history is kept.</p>',btn('Review archive','confirm-archive','pg-btn pg-btn-danger'));}
 if(c.kind==='baseline')return box('Set baseline','Set the baseline for '+progName(c.program)+'?','<p>Records the current start and end dates of '+plural(c.items.length,'item')+' without a baseline as the plan of record. Later moves are measured against it.</p>',btn('Review baseline','confirm-baseline','pg-btn pg-btn-primary'));
 if(c.kind==='promote'){const x=RAID.find(r=>r.id===c.id);return box('Promote entry','Promote to '+c.to+'?','<p>Creates a new '+esc(c.to)+' linked to <strong>'+esc(x?x.name:'')+'</strong> and closes the original. Both keep their history.</p>',btn('Review promotion','confirm-promote','pg-btn pg-btn-primary'));}
 if(c.kind==='rebaseline'){const x=ITEM[c.id];return '<div class="pg-overlay center"><section class="pg-modal" role="alertdialog" aria-modal="true" aria-label="Reset baseline"><h2>Reset the baseline?</h2><p><strong>'+esc(x?x.name:'')+'</strong>: baseline '+esc(x?dateLabel(x.baseline_end):'')+' becomes '+esc(x?dateLabel(x.end_date):'')+'. The reason is kept in the item notes.</p><form data-action="confirm-rebaseline"><label class="pg-field" for="pg-rb">Reason *<input class="pg-input" id="pg-rb" name="reason" data-ui-state="true" data-action="rebaseline-draft" value="'+esc(c.reason||'')+'" required></label><div class="pg-row end">'+btn('Cancel','cancel-modal')+'<button type="submit" class="pg-btn pg-btn-primary">Review reset</button></div></form></section></div>';}
 return '';}
function gatePanel(){const g=st.gate;if(!g)return '';const d=DECISIONS.find(x=>x.id===g.id);if(!d)return '';const r=readiness(d);
 const planned=ITEMS.filter(x=>x.program_id===d.program_id&&isMilestone(x)&&['planned','at_risk'].includes(x.status)).sort((a,b)=>a.end_date.localeCompare(b.end_date));
 const sel=(name,val,opts)=>'<select class="pg-input" name="'+name+'" data-ui-state="true" data-action="gate-draft">'+opts.map(o=>'<option value="'+esc(o[0])+'"'+(String(val||'')===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select>';
 return '<div class="pg-overlay"><section class="pg-drawer" role="dialog" aria-modal="true" aria-label="Record gate outcome"><div class="pg-drawer-head"><div><div class="pg-eyebrow">Gate outcome · reviewed</div><h2>'+esc(d.name||'Gate')+'</h2></div>'+btn(icon('close',17),'cancel-modal','pg-icon-btn',false,'aria-label="Close"')+'</div><form data-action="gate-submit" class="pg-drawer-form"><div class="pg-drawer-body"><div class="pg-banner info">'+esc(r.total?'Readiness: '+r.met+' of '+r.total+' criteria met.':'This gate has no criteria.')+' The outcome is your decision; it is saved only after you approve the review.</div><div class="pg-pair">'+
 '<label class="pg-field">Outcome *'+sel('outcome',g.draft.outcome,[['','Choose…'],['go','Go'],['no_go','No-go'],['conditional','Conditional'],['decided','Decided']])+'</label><label class="pg-field">Decided on *<input class="pg-input" type="date" name="decided_on" data-ui-state="true" data-action="gate-draft" value="'+esc(g.draft.decided_on||'')+'"></label><label class="pg-field">Approver<input class="pg-input" name="approver" data-ui-state="true" data-action="gate-draft" value="'+esc(g.draft.approver||'')+'"></label><label class="pg-field wide">Rationale *<textarea class="pg-textarea" name="rationale" data-ui-state="true" data-action="gate-draft">'+esc(g.draft.rationale||'')+'</textarea></label></div>'+
 '<h3 class="pg-h3">Follow-up milestones to create</h3>'+g.follow.map((f,i)=>'<div class="pg-pair"><label class="pg-field">Name<input class="pg-input" name="follow_name_'+i+'" data-ui-state="true" data-action="gate-draft" value="'+esc(f.name||'')+'"></label><label class="pg-field">Date<input class="pg-input" type="date" name="follow_date_'+i+'" data-ui-state="true" data-action="gate-draft" value="'+esc(f.end_date||'')+'"></label><label class="pg-field">Function'+sel('follow_fn_'+i,f.function,fnOpts())+'</label><div class="pg-row">'+btn('Remove','gate-follow-remove:'+i,'pg-btn small')+'</div></div>').join('')+btn(icon('plus',15)+' Add follow-up milestone','gate-follow-add','pg-btn small')+
 '<h3 class="pg-h3">Planned milestones to cancel</h3>'+(planned.length?planned.map(x=>'<label class="pg-check"><input type="checkbox" name="cancel_'+esc(x.id)+'" value="true" data-ui-state="true" data-action="gate-draft"'+(g.cancel.includes(x.id)?' checked':'')+'> '+esc(x.name||'')+' · '+esc(dateLabel(x.end_date))+'</label>').join(''):'<p class="pg-muted">No planned milestones in this program.</p>')+
 '</div><div class="pg-drawer-foot">'+btn('Cancel','cancel-modal')+'<button type="submit" class="pg-btn pg-btn-primary"'+(canWrite('decisions')?'':' disabled')+'>Prepare reviewed save</button></div></form></section></div>';}

/* ---------- page ---------- */
const rail='<aside class="pg-rail"><div class="pg-brand"><strong>Programs</strong><span>Milestones, gates and risks</span></div><nav class="pg-nav" aria-label="Programs screens">'+sections.map(s=>btn('<span class="pg-ico">'+icon(s.id)+'</span><span class="pg-nav-label">'+esc(s.label)+'</span>','nav:'+s.id,'',false,'aria-current="'+(st.section===s.id?'page':'false')+'" aria-label="'+esc(s.label)+'"')).join('')+'</nav><div class="pg-rail-foot">'+esc(cfg.demoLabel?'Fictional demo data':'Authorized records only')+'<br>Every change is reviewed.</div></aside>';
let main='';try{main=st.section==='overview'?overview():st.section==='timeline'?timeline():st.section==='plan'?plan():st.section==='decisions'?decisions():st.section==='raid'?raid():st.section==='updates'?updates():settingsScreen();}catch(e){main=heading()+'<div class="pg-banner bad" role="alert">This screen could not be shown: '+esc(String(e&&e.message||e))+'</div>';}
const notice=st.notice?'<div class="pg-banner info pg-notice" role="status"><span>'+esc(st.notice)+'</span>'+btn('Dismiss','clear-notice','pg-btn small')+'</div>':'';
const preview=!inp.saved?'<div class="pg-banner info">Preview: save the app to record data. Fictional or unsaved previews never write to your workspace.</div>':'';
const overlays=editorPanel()+detailPanel()+confirmPanel()+gatePanel();
// The page behind an open dialog is inert for keyboard and assistive technology.
const html='<div class="pg-shell"'+(overlays?' inert':'')+'>'+rail+'<main class="pg-main">'+preview+notice+main+'<p class="pg-foot">'+(cfg.demoLabel?'Fictional records for demonstration only. Opening this preview creates no records, emails or automations.':'Program management planning, not a validated GxP record. All writes are reviewed in TrialAgents.')+'</p></main></div>'+overlays;
const css=typeof PROGRAMS_CSS==='string'?PROGRAMS_CSS:'';
return {html,css,state:st};
