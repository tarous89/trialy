'use trialagents v2';
/* TrialAgents Contracts 2.0.0 (life.contracts) on the v2 app contract and the kit (7.3: G2-G8, G11, G14, P3-P5).
 * Returns {html,css,state,notice,context}. No DOM, network or browser storage. The platform draws the header, the message
 * and the approval footer; this code draws only the screens. Record edits save directly with records.save from a person's
 * own click, change or form, with the version captured when editing started; delete is archive_record; Undo is offered
 * after a save. Each screen reads only the tables it shows (one records.readMany per group of tables); a read that is
 * still on its way shows as loading. Signed originals are TrialAgents documents (documents.list/search/quote, upload
 * through the platform). Filling in a contract is done by the user's connected assistant on request; its entries stay
 * "not checked" until a person verifies them here (Verify proposals), or the assistant does on the user's request.
 * Every value the app shows is calculated from the fields (notice deadline, confidentiality end, family value, next due).
 */
const cfg=typeof templateConfiguration==='object'&&templateConfiguration?templateConfiguration:{};
const bindings=Array.isArray(templateBindings)?templateBindings:[];
const inp=input||{};
const event=inp.event||{kind:'open',action:'',value:null,form:{}};
const action=String(event.action||'');
const form=event.form&&typeof event.form==='object'?event.form:{};
const esc=kit.esc;

/* ---------- helpers ---------- */
const has=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
const num=(v,otherwise=null)=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v))?Number(v):otherwise;
const bool=v=>v===true||v==='true'||v==='on'||v==='1';
const memo=f=>{let done=false,v;return ()=>{if(!done){done=true;v=f();}return v;};};
const grouped=n=>{const r=Math.round(Math.abs(n)*100)/100,s=Math.floor(r).toString().replace(/\B(?=(\d{3})+(?!\d))/g,','),c=Math.round((r-Math.floor(r))*100);return (n<0?'−':'')+s+(c?'.'+String(c).padStart(2,'0'):'');};
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const validDate=v=>{const t=String(v||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(t))return '';const d=new Date(t+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===t?t:'';};
const dayNo=d=>Math.round(Date.UTC(Number(d.slice(0,4)),Number(d.slice(5,7))-1,Number(d.slice(8,10)))/86400000);
const fromDay=n=>new Date(n*86400000).toISOString().slice(0,10);
const addDays=(d,n)=>d?fromDay(dayNo(d)+Math.round(n)):'';
const diffDays=(a,b)=>dayNo(b)-dayNo(a);
const lastDayOf=(y,m)=>new Date(Date.UTC(y,m,0)).getUTCDate();
// Calendar months, the day clamped to the month end (31 Jan + 1 month = 28/29 Feb; 29 Feb + 12 months = 28 Feb).
function addMonthsDate(d,n){if(!d)return '';const y=Number(d.slice(0,4)),m=Number(d.slice(5,7))-1+n,day=Number(d.slice(8,10));const yy=y+Math.floor(m/12),mm=((m%12)+12)%12+1;return yy+'-'+String(mm).padStart(2,'0')+'-'+String(Math.min(day,lastDayOf(yy,mm))).padStart(2,'0');}
const addMonths=(m,n)=>addMonthsDate(m+'-01',n).slice(0,7);
const monthLabel=m=>m?MONTHS[Number(m.slice(5,7))-1]+' '+m.slice(0,4):'—';
const dateLabel=d=>d?Number(d.slice(8,10))+' '+MONTHS[Number(d.slice(5,7))-1]+' '+d.slice(0,4):'—';
const plural=(n,w)=>n+' '+w+(Math.abs(n)===1?'':'s');
const label=v=>String(v===null||v===undefined||v===''?'—':v).replace(/_/g,' ');
const cap=s=>{s=label(s);return s.charAt(0).toUpperCase()+s.slice(1);};
const parseJSON=v=>{try{const x=JSON.parse(String(v||''));return x&&typeof x==='object'?x:null;}catch(e){return null;}};
const norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
const money=(v,cur)=>(cur?cur+' ':'')+grouped(v);

/* ---------- vocabulary ---------- */
const TYPES=['cda_nda','msa','sow_work_order','change_order','mta','research_collaboration','licence_in','licence_out','cmo_supply','quality_agreement','consulting_advisory','clinical_trial_agreement','data_processing','lease_services','other'];
const TYPE_LABEL={cda_nda:'CDA / NDA',msa:'MSA',sow_work_order:'SOW / work order',change_order:'Change order',mta:'MTA',research_collaboration:'Research collaboration',licence_in:'Licence (in)',licence_out:'Licence (out)',cmo_supply:'CMO / supply',quality_agreement:'Quality agreement',consulting_advisory:'Consulting / advisory',clinical_trial_agreement:'Clinical trial agreement',data_processing:'Data processing',lease_services:'Lease / services',other:'Other'};
const STATUSES=['drafting','in_negotiation','out_for_signature','active','expired','terminated','superseded'];
const STATUS_LABEL={drafting:'Drafting',in_negotiation:'In negotiation',out_for_signature:'Out for signature',active:'Active',expired:'Expired',terminated:'Terminated',superseded:'Superseded'};
const IN_FLIGHT=['drafting','in_negotiation','out_for_signature'];
const KINDS=['payment','report','diligence_milestone','notice','delivery','publication_review','audit','insurance','royalty','other'];
const KIND_LABEL={payment:'Payment',report:'Report',diligence_milestone:'Diligence milestone',notice:'Notice',delivery:'Delivery',publication_review:'Publication review',audit:'Audit',insurance:'Insurance',royalty:'Royalty',other:'Other'};
const DIRECTIONS=['we_owe','they_owe'];const DIR_LABEL={we_owe:'We owe',they_owe:'They owe'};
const OB_STATUS=['open','done','waived','missed'];
const RECURRENCE=['none','monthly','quarterly','annual'];const STEP={monthly:1,quarterly:3,annual:12};
const RENEWAL=['none','automatic','option'];
const CDA_DIR=['mutual','incoming','outgoing'];const CDA_DIR_LABEL={mutual:'Mutual',incoming:'Incoming (we receive)',outgoing:'Outgoing (we disclose)'};
const CURRENCIES=['USD','EUR','GBP','CHF','CAD','AUD','JPY','CNY','SEK','DKK','NOK','INR'];
const DECISIONS=['renew','renegotiate','terminate'];
const ORG_TYPES=['company','investor','cro','cdmo','site','funder','partner','agency','other'];
const MS_STATUS=['planned','in_progress','done','at_risk','cancelled'];

/* ---------- logical schema (real keys come from tableMap) ---------- */
const ref=role=>({kind:'ref',ref:role});
const S={
 agreements:[{key:'name',label:'Name',kind:'text',required:true},{key:'agreement_type',label:'Type',kind:'select',options:TYPES,required:true},{key:'counterparty_id',label:'Counterparty',...ref('organizations')},{key:'status',label:'Status',kind:'select',options:STATUSES,required:true},{key:'parent_id',label:'Parent agreement',...ref('agreements')},{key:'program_id',label:'Program',...ref('programs')},{key:'study_id',label:'Study',...ref('studies')},{key:'effective_date',label:'Effective date',kind:'date'},{key:'expiry_date',label:'Expiry date',kind:'date'},{key:'signed_on',label:'Signed on',kind:'date'},{key:'total_value',label:'Total value',kind:'number'},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES},{key:'owner',label:'Owner',kind:'person'},{key:'archived',label:'Archived',kind:'boolean'}],
 organizations:[{key:'name',label:'Name',kind:'text',required:true},{key:'org_type',label:'Type',kind:'select',options:ORG_TYPES},{key:'country',label:'Country',kind:'text'},{key:'website',label:'Website',kind:'text'},{key:'archived',label:'Archived',kind:'boolean'}],
 people:[{key:'name',label:'Name',kind:'text',required:true},{key:'organization_id',label:'Organization',...ref('organizations')},{key:'title',label:'Title',kind:'text'},{key:'email',label:'Email',kind:'text'},{key:'archived',label:'Archived',kind:'boolean'}],
 programs:[{key:'name',label:'Name',kind:'text',required:true},{key:'code',label:'Code',kind:'text'},{key:'stage',label:'Stage',kind:'frozen'},{key:'archived',label:'Archived',kind:'boolean'}],
 studies:[{key:'name',label:'Name',kind:'text',required:true},{key:'program_id',label:'Program',kind:'frozen'},{key:'archived',label:'Archived',kind:'boolean'}],
 milestones:[{key:'name',label:'Milestone',kind:'text',required:true},{key:'program_id',label:'Program',...ref('programs'),required:true},{key:'item_type',label:'Item type',kind:'select',options:['milestone','activity'],required:true},{key:'end_date',label:'Date',kind:'date',required:true},{key:'status',label:'Status',kind:'select',options:MS_STATUS,required:true},{key:'is_key',label:'Key milestone',kind:'boolean'}],
 settings:[{key:'default_currency',label:'Default currency',kind:'select',options:CURRENCIES},{key:'reminder_days',label:'Reminder windows (days, comma list)',kind:'text'},{key:'agreement_types',label:'Agreement types (comma list, in order)',kind:'text'},{key:'obligation_kinds',label:'Obligation kinds (comma list, in order)',kind:'text'}],
 terms:[{key:'agreement_id',label:'Agreement',kind:'frozen'},{key:'renewal',label:'Renewal',kind:'select',options:RENEWAL},{key:'renewal_term_months',label:'Renewal term (months)',kind:'number'},{key:'notice_days',label:'Notice period (days)',kind:'number'},{key:'notice_deadline',label:'Notice deadline',kind:'computed'},{key:'confidentiality_years',label:'Confidentiality (years)',kind:'number'},{key:'confidentiality_end',label:'Confidentiality end',kind:'computed'},{key:'cda_direction',label:'CDA direction',kind:'select',options:CDA_DIR},{key:'purpose',label:'Purpose',kind:'text'},{key:'governing_law',label:'Governing law',kind:'text'},{key:'document_id',label:'Signed original',kind:'frozen'},{key:'document_version_id',label:'Signed original version',kind:'frozen'},{key:'document_link',label:'External link (URL)',kind:'text'},{key:'extraction_status',label:'Extraction',kind:'frozen'},{key:'source_quotes',label:'Source quotes',kind:'frozen'},{key:'verified_by',label:'Verified by',kind:'frozen'},{key:'verified_on',label:'Verified on',kind:'frozen'},{key:'status_since',label:'Status since',kind:'frozen'},{key:'notes',label:'Notes',kind:'longtext'}],
 obligations:[{key:'agreement_id',label:'Agreement',...ref('agreements'),required:true},{key:'counterparty_id',label:'Counterparty',...ref('organizations')},{key:'title',label:'Title',kind:'text',required:true},{key:'kind',label:'Kind',kind:'select',options:KINDS,required:true},{key:'direction',label:'Direction',kind:'select',options:DIRECTIONS,required:true},{key:'due_date',label:'Due date (first or only)',kind:'date'},{key:'recurrence',label:'Recurrence',kind:'select',options:RECURRENCE},{key:'trigger',label:'Trigger (when there is no date)',kind:'text'},{key:'milestone_id',label:'Milestone',...ref('milestones')},{key:'amount',label:'Amount',kind:'number'},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES},{key:'owner',label:'Owner',kind:'person'},{key:'status',label:'Status',kind:'select',options:OB_STATUS,required:true},{key:'verified',label:'Verified',kind:'frozen'},{key:'source_quote',label:'Source quote',kind:'longtext'},{key:'source_page',label:'Source page',kind:'number'},{key:'source_document_version_id',label:'Source document version',kind:'frozen'},{key:'archived',label:'Archived',kind:'boolean'}]
};
const ROLE_LABEL={agreements:'agreement',organizations:'organization',people:'contact',programs:'program',studies:'study',milestones:'milestone',settings:'settings',terms:'key terms',obligations:'obligation'};
/* Stable role keys (modular apps rule 5): core contract v1 for shared tables, contracts.* for this app; programs.plan_items is an
 * integration: Programs' plan items (read only) once linked inside the app, otherwise this app's own milestone entries. */
const ROLE_KEY={agreements:'agreements',organizations:'organizations',people:'people',programs:'programs',studies:'studies',milestones:'programs.plan_items',settings:'contracts.settings',terms:'contracts.terms',obligations:'contracts.obligations'};

/* ---------- bindings ---------- */
let mapping={};try{mapping=JSON.parse(cfg.tableMap||'{}');}catch(e){mapping={};}
const roleMap={};
for(const role of Object.keys(S)){
 const m=mapping[ROLE_KEY[role]],b=m&&bindings.find(x=>x.typeId===m.typeId);
 if(!m||!b)continue;
 const fields={};for(const f of S[role]){const k=m.fields&&m.fields[f.key]!==undefined?m.fields[f.key]:f.key;if(typeof k==='string'&&(b.fields||[]).includes(k))fields[f.key]=k;}
 const known=new Set(Object.values(fields).concat(Object.values(m.fields||{})));
 // Fields bound to this table that this version does not know are shown as "Additional fields" (read only here).
 const extra=(b.fields||[]).filter(k=>typeof k==='string'&&!known.has(k)).slice(0,30);
 roleMap[role]={typeId:m.typeId,fields,extra,writable:(Array.isArray(m.writableFields)?m.writableFields:[]).filter(x=>fields[x])};
}
const canWrite=role=>!!inp.saved&&!!inp.writable&&cfg.readOnly!==true&&inp.appRole!=='viewer'&&!!roleMap[role]&&roleMap[role].writable.length>0;
const writableField=(role,key)=>canWrite(role)&&roleMap[role].writable.includes(key);

/* ---------- reads: one records.readMany per group of tables, only for what the screen shows (P3, P5) ---------- */
const PAGE=100,MAX_PAGES=8;
const GROUPS={settings:['settings'],core:['agreements','terms','organizations'],obligations:['obligations'],plan:['milestones','programs'],people:['people','studies']};
const GROUP_OF={};for(const [g,list] of Object.entries(GROUPS))for(const r of list)GROUP_OF[r]=g;
const cache={},loaded={};
const blank=extra=>Object.assign({rows:[],allRows:[],total:0,read:0,complete:false,unbound:false,unavailable:false,truncated:false,invalid:0,pending:false},extra||{});
function absorb(acc,m,p){
 if(!p||p.unavailable){acc.unavailable=true;return;}
 if(p.pending){acc.pending=true;return;}
 const chunk=Array.isArray(p.rows)?p.rows:[];acc.total=p.total===null||p.total===undefined||!Number.isFinite(Number(p.total))?null:Number(p.total);
 for(const r of chunk){const data={};for(const [logical,real] of Object.entries(m.fields))if(has(r.data,real)){const v=r.data[real];if(v!==null&&typeof v==='object'){acc.invalid++;continue;}data[logical]=v;}
  const extra={};for(const k of m.extra||[])if(has(r.data,k)&&(r.data[k]===null||typeof r.data[k]!=='object'))extra[k]=r.data[k];acc.allRows.push({id:String(r.id),version:r.version,data,extra});}
 acc.read+=chunk.length;acc.last=chunk.length;
}
function batch(reads){
 const out=[];for(let i=0;i<reads.length;i+=12){let res=null;try{const r=tools.call('records.readMany',{reads:reads.slice(i,i+12)});res=r&&Array.isArray(r.results)?r.results:null;}catch(e){res=null;}
  for(let k=0;k<Math.min(12,reads.length-i);k++)out.push(res?res[k]:null);}
 return out;
}
function loadGroup(g){
 if(loaded[g])return;loaded[g]=true;
 const roles=GROUPS[g].filter(r=>roleMap[r]);for(const r of GROUPS[g])if(!roleMap[r])cache[r]=blank({unbound:true});
 if(!roles.length)return;
 const first=batch(roles.map(r=>({typeId:roleMap[r].typeId,limit:PAGE,offset:0})));
 const more=[];
 roles.forEach((r,i)=>{const acc=cache[r]=blank();absorb(acc,roleMap[r],first[i]);
  if(acc.unavailable||acc.pending||acc.total===null||acc.read>=acc.total||acc.last<PAGE)return;
  const n=Math.min(Math.ceil((acc.total-acc.read)/PAGE),MAX_PAGES-1);for(let k=0;k<n;k++)more.push({role:r,offset:acc.read+k*PAGE});});
 if(more.length){const pages=batch(more.map(x=>({typeId:roleMap[x.role].typeId,limit:PAGE,offset:x.offset})));more.forEach((x,i)=>{const acc=cache[x.role];if(!acc.unavailable&&!acc.pending)absorb(acc,roleMap[x.role],pages[i]);});}
 for(const r of roles){const acc=cache[r];acc.complete=!acc.unavailable&&!acc.pending&&acc.total!==null&&acc.read>=acc.total;acc.truncated=!acc.complete&&acc.total!==null&&acc.total>MAX_PAGES*PAGE;
  acc.rows=acc.allRows.filter(x=>!bool(x.data.archived));if(acc.total===null)acc.total=acc.allRows.length;}
}
const R=role=>{loadGroup(GROUP_OF[role]);return cache[role];};
const waiting=roles=>roles.some(r=>R(r).pending);
const exactFor=roles=>roles.every(r=>{const x=R(r);return x.unbound||x.complete&&!x.invalid;});
function readProblems(roles){const out=[];for(const role of roles){const r=R(role),n=cap(ROLE_LABEL[role]);
 if(r.unbound||r.pending)continue;if(r.unavailable)out.push('you cannot read the '+ROLE_LABEL[role]+' table');
 else if(!r.complete)out.push(n+': '+r.allRows.length+' of '+(r.total>r.allRows.length?r.total:'more than '+r.allRows.length)+' rows read');
 if(r.invalid)out.push(n+': '+plural(r.invalid,'value')+' with an invalid shape ignored');}return out;}

/* ---------- settings (business choices) ---------- */
const conf=memo(()=>{const row=R('settings').rows[0]||null,SET=row?row.data:{};
 const listSetting=(v,allowed)=>{const l=String(v||'').split(',').map(x=>x.trim().toLowerCase()).filter(x=>allowed.includes(x));return l.length?[...new Set(l)]:allowed.slice();};
 const remind=(()=>{const l=String(SET.reminder_days||'30,60,90').split(',').map(x=>Math.round(Number(x))).filter(n=>Number.isFinite(n)&&n>=1&&n<=365);return l.length?[...new Set(l)].sort((a,b)=>a-b).slice(0,6):[30,60,90];})();
 return {row,types:listSetting(SET.agreement_types,TYPES),kinds:listSetting(SET.obligation_kinds,KINDS),remind,window:remind[remind.length-1],currency:CURRENCIES.includes(SET.default_currency)?SET.default_currency:'EUR'};});

/* ---------- state ---------- */
const st=JSON.parse(JSON.stringify(inp.state||{}));
const ctx=inp.context&&typeof inp.context==='object'?inp.context:{};
const isOwner=inp.appRole==='owner';
const SCREENS=[{id:'overview',label:'Overview'},{id:'agreements',label:'Agreements'},{id:'families',label:'Families'},{id:'obligations',label:'Obligations'},{id:'cdas',label:'CDAs'},{id:'pipeline',label:'Pipeline'},{id:'counterparties',label:'Counterparties'},{id:'milestones',label:'Milestones'},{id:'settings',label:'Settings'}];
const shown=SCREENS.filter(s=>(s.id!=='settings'||isOwner&&!!roleMap.settings)&&(s.id!=='milestones'||!!roleMap.milestones));
st.screen=String(st.screen||ctx.screen||'overview');if(!shown.some(s=>s.id===st.screen))st.screen='overview';
st.offset=Math.max(0,Number(st.offset)||0);st.query=String(st.query||'').slice(0,100);st.cdaQuery=String(st.cdaQuery||'').slice(0,100);
st.filters=st.filters&&typeof st.filters==='object'?st.filters:{};
let notice=null;const say=(kind,message)=>{notice=kit.notice(kind,String(message).slice(0,300));};

const CLOCK=(()=>{try{return validDate(new Date().toISOString());}catch(e){return '';}})();
const AS_OF_SOURCE=validDate(cfg.asOfOverride)?'pinned':CLOCK?'today':validDate(st.asOf)?'control':'none';
const AS_OF=AS_OF_SOURCE==='pinned'?validDate(cfg.asOfOverride):AS_OF_SOURCE==='today'?CLOCK:AS_OF_SOURCE==='control'?validDate(st.asOf):'';

/* ---------- data views (computed once per run, only when a screen asks) ---------- */
const AGS=memo(()=>R('agreements').rows.map(r=>({id:r.id,version:r.version,...r.data,effective_date:validDate(r.data.effective_date),expiry_date:validDate(r.data.expiry_date),signed_on:validDate(r.data.signed_on),total_value:num(r.data.total_value),currency:CURRENCIES.includes(r.data.currency)?r.data.currency:''})));
const AGM=memo(()=>Object.fromEntries(AGS().map(a=>[a.id,a])));
const AG=id=>AGM()[id];
/* Key terms: one record per agreement (the earliest when several exist). */
const TERMS=memo(()=>{const out={};for(const r of R('terms').rows.slice().sort((a,b)=>a.id.localeCompare(b.id))){const k=String(r.data.agreement_id||'');if(k&&!out[k])out[k]={id:r.id,version:r.version,...r.data};}return out;});
const termsOf=id=>TERMS()[id]||null;
const ORGS=memo(()=>R('organizations').rows.slice().sort((a,b)=>String(a.data.name||'').localeCompare(String(b.data.name||''))));
function orgName(id){if(!id)return 'No counterparty';const r=R('organizations');if(r.unbound)return 'Organizations not connected';const o=r.allRows.find(x=>x.id===id);if(!o)return 'Organization unavailable';return String(o.data.name||'Unnamed')+(bool(o.data.archived)?' (archived)':'');}
function refName(role,id){if(!id)return '—';const r=R(role);if(r.unbound)return cap(ROLE_LABEL[role])+' not connected';const x=r.allRows.find(y=>y.id===id);if(!x)return cap(ROLE_LABEL[role])+' unavailable';return String(x.data.name||x.data.title||'Unnamed')+(bool(x.data.archived)?' (archived)':'');}
const progName=id=>id?refName('programs',id):'—';
function agName(id){if(!id)return '—';const r=R('agreements').allRows.find(x=>x.id===id);if(!r)return 'Agreement unavailable';return String(r.data.name||'Unnamed agreement')+(bool(r.data.archived)?' (archived)':'');}
const lookup=(role,id)=>(R(role).allRows||[]).find(r=>r.id===id)||null;

/* ---------- calculations ---------- */
// Notice deadline = expiry_date − notice_days, when renewal is automatic or an option. Stored on save.
function noticeDeadline(expiry,noticeDays,renewal){const e=validDate(expiry),n=num(noticeDays);return e&&n!==null&&n>=0&&['automatic','option'].includes(renewal)?addDays(e,-n):'';}
// Confidentiality end = expiry_date (or the effective date when there is no expiry) + confidentiality_years (× 12 calendar months). Stored on save.
function confidentialityEnd(expiry,effective,years){const base=validDate(expiry)||validDate(effective),y=num(years);return base&&y!==null&&y>0?addMonthsDate(base,Math.round(y*12)):'';}
// The app calculates what it shows from the underlying fields, whoever saved them. A stored copy is used only when the inputs are missing.
function storedOrComputed(t,a){const n=noticeDeadline(a.expiry_date,t&&t.notice_days,t&&t.renewal),c=confidentialityEnd(a.expiry_date,a.effective_date,t&&t.confidentiality_years);
 const noticeInputs=!!(t&&t.renewal)&&(t.renewal==='none'||num(t.notice_days)!==null&&!!a.expiry_date),confInputs=num(t&&t.confidentiality_years)!==null&&!!(a.expiry_date||a.effective_date);
 return {notice:n||(noticeInputs?'':validDate(t&&t.notice_deadline)),conf:c||(confInputs?'':validDate(t&&t.confidentiality_end))};}
const inWindow=(d,days)=>!!d&&!!AS_OF&&d>=AS_OF&&d<=addDays(AS_OF,days===undefined?conf().window:days);
const bucket=d=>{if(!d||!AS_OF)return null;const n=diffDays(AS_OF,d);for(const w of conf().remind)if(n<=w)return w;return null;};
const isActive=a=>a.status==='active';
const daysTo=d=>AS_OF&&d?diffDays(AS_OF,d):null;
const inDays=d=>{const n=daysTo(d);return n===null?'':n===0?'today':n>0?'in '+plural(n,'day'):plural(-n,'day')+' ago';};

// Families: masters are agreements without a (readable) parent; children are listed under their parent, recursively.
const CHILDREN=memo(()=>{const out={};for(const a of AGS())if(a.parent_id&&AG(a.parent_id)&&a.parent_id!==a.id)(out[a.parent_id]=out[a.parent_id]||[]).push(a.id);return out;});
const kidsOf=id=>CHILDREN()[id]||[];
function rootOf(id){const seen=new Set();let cur=AG(id);while(cur&&cur.parent_id&&AG(cur.parent_id)&&!seen.has(cur.id)){seen.add(cur.id);cur=AG(cur.parent_id);}return cur?cur.id:id;}
function familyMembers(rootId){const out=[],seen=new Set(),walk=(id,depth)=>{if(seen.has(id)||!AG(id))return;seen.add(id);out.push({a:AG(id),depth});for(const c of kidsOf(id).slice().sort((x,y)=>String(AG(x).name||'').localeCompare(String(AG(y).name||''))))walk(c,depth+1);};walk(rootId,0);return out;}
// Family value = master total_value + Σ children, per currency; members in another currency are listed separately, never converted.
function familyValue(rootId){const ms=familyMembers(rootId),master=AG(rootId);
 const primary=master.currency||((ms.find(m=>m.a.currency)||{}).a||{}).currency||conf().currency;const by={},co={},missing=[];
 for(const m of ms){const a=m.a;if(['terminated','superseded'].includes(a.status)&&m.depth>0)continue;if(a.total_value===null){if(m.depth>0||a.agreement_type!=='msa')missing.push(a.id);continue;}const c=a.currency||primary;by[c]=(by[c]||0)+a.total_value;if(a.agreement_type==='change_order')co[c]=(co[c]||0)+a.total_value;}
 const total=by[primary]||0;return {primary,total,by,co,share:total>0?(co[primary]||0)/total:null,others:Object.keys(by).filter(c=>c!==primary).sort(),missing,members:ms};}
function familyDates(ms){const act=ms.filter(m=>isActive(m.a));const exp=act.map(m=>m.a.expiry_date).filter(Boolean).sort()[0]||'';
 const notices=act.map(m=>storedOrComputed(termsOf(m.a.id),m.a).notice).filter(d=>d&&(!AS_OF||d>=AS_OF)).sort();return {earliestExpiry:exp,nextNotice:notices[0]||''};}
const ROOTS=memo(()=>[...new Set(AGS().map(a=>rootOf(a.id)))].filter(id=>AG(id)));
const FAMILIES=memo(()=>ROOTS().filter(id=>kidsOf(id).length).sort((a,b)=>String(AG(a).name||'').localeCompare(String(AG(b).name||''))));

/* Obligations. Next due of a recurring obligation = the first occurrence on or after the as-of date. */
const OBS=memo(()=>R('obligations').rows.map(r=>({id:r.id,version:r.version,...r.data,due_date:validDate(r.data.due_date),amount:num(r.data.amount),currency:CURRENCIES.includes(r.data.currency)?r.data.currency:'',verified:bool(r.data.verified),source_page:num(r.data.source_page)})));
function nextDue(o){if(!o.due_date)return '';const step=STEP[o.recurrence];if(!step||!AS_OF||o.due_date>=AS_OF)return o.due_date;
 const months=(Number(AS_OF.slice(0,4))-Number(o.due_date.slice(0,4)))*12+Number(AS_OF.slice(5,7))-Number(o.due_date.slice(5,7));let k=Math.max(0,Math.floor(months/step));let d=addMonthsDate(o.due_date,k*step);while(d<AS_OF){k++;d=addMonthsDate(o.due_date,k*step);}return d;}
function occurrences(o,from,to){const out=[];if(!o.due_date)return out;const step=STEP[o.recurrence];if(!step){if(o.due_date>=from&&o.due_date<=to)out.push(o.due_date);return out;}
 for(let k=0;k<400;k++){const d=addMonthsDate(o.due_date,k*step);if(d>to)break;if(d>=from)out.push(d);}return out;}
const overdueOb=o=>o.status==='open'&&!STEP[o.recurrence]&&!!o.due_date&&!!AS_OF&&o.due_date<AS_OF;
const UNVERIFIED_OBS=memo(()=>OBS().filter(o=>!o.verified));
const PROPOSED_TERMS=memo(()=>Object.values(TERMS()).filter(t=>t.extraction_status==='proposed'&&AG(t.agreement_id)));

/* Milestones: Contracts' own entries, or Programs' plan items once linked (read only). */
const MS=memo(()=>R('milestones').rows.map(r=>({id:r.id,version:r.version,...r.data,end_date:validDate(r.data.end_date)})));
const msName=id=>{if(!id)return '—';const r=R('milestones').allRows.find(x=>x.id===id);return r?String(r.data.name||'Milestone')+(r.data.end_date?' ('+dateLabel(validDate(r.data.end_date))+')':''):'Milestone unavailable';};
// Expires before milestone: an active agreement linked to a program whose key milestone ends after the agreement's expiry.
function expiresBefore(a){if(!isActive(a)||!a.program_id||!a.expiry_date)return [];return MS().filter(m=>m.program_id===a.program_id&&m.item_type==='milestone'&&bool(m.is_key)&&!['done','cancelled'].includes(m.status)&&m.end_date&&m.end_date>a.expiry_date).sort((x,y)=>x.end_date.localeCompare(y.end_date));}
const EXPIRES_BEFORE=memo(()=>AGS().map(a=>({a,ms:expiresBefore(a)})).filter(x=>x.ms.length));
const MS_LINKED=!!roleMap.milestones&&!roleMap.milestones.writable.length;

/* In-app integration (modular apps §7): Programs can provide milestones. Read on the Milestones screen only. */
const INTEGS=memo(()=>{if(!inp.saved)return [];try{const r=tools.call('integrations.list',{});return r&&Array.isArray(r.integrations)?r.integrations:[];}catch(e){return [];}});
const INTEG=()=>INTEGS().find(x=>x.role==='programs.plan_items')||null;
const linkedFrom=()=>{const x=INTEG();return x&&x.source==='linked'?String(x.provider||'Programs').slice(0,60):MS_LINKED?'Programs':'';};
function integrationHint(){const x=INTEG();if(!x||!x.offer)return '';
 return '<p class="k-muted k-small">'+(x.offer==='install'?'Works with Programs. ':'Programs is in your workspace. ')+'<button type="button" class="ct-link" data-trialy-integration="'+esc(x.offer)+' programs.plan_items">'+(x.offer==='install'?'Add Programs':'Use its milestones')+'</button></p>';}

/* Platform documents: the signed-in user's own document permissions; saved apps only. */
const DOCS=memo(()=>{if(!inp.saved)return {state:'preview',list:[]};
 try{const r=tools.call('documents.list',{limit:200});if(r&&r.pending)return {state:'pending',list:[]};if(!r||r.unavailable)return {state:'unavailable',list:[]};return {state:r.complete===false?'partial':'ok',list:Array.isArray(r.documents)?r.documents:[]};}catch(e){return {state:'unavailable',list:[]};}});
const docOf=t=>{if(!t||!t.document_version_id)return null;const d=DOCS();return d.list.find(x=>x.versionId===t.document_version_id)||{missing:true,versionId:t.document_version_id,state:d.state};};

/* ---------- writes (records.save, direct) ---------- */
function toReal(role,data){const m=roleMap[role];if(!m)throw Error('The '+ROLE_LABEL[role]+' table is not connected.');const out={};for(const [k,v] of Object.entries(data)){if(v===undefined)continue;if(!m.fields[k])continue;if(!m.writable.includes(k))throw Error('You cannot edit '+k.replace(/_/g,' ')+' in the '+ROLE_LABEL[role]+' table.');out[m.fields[k]]=v;}return out;}
function cleanValue(f,v){
 if(typeof v==='string')v=v.trim();
 if(v===''||v===null||v===undefined){if(f.required)throw Error('Required field: '+f.label+'.');return null;}
 if(f.kind==='number'){const n=Number(v);if(!Number.isFinite(n))throw Error('Enter a number for '+f.label+'.');if(n<0)throw Error(f.label+' cannot be negative.');return n;}
 if(f.kind==='date'){const d=validDate(v);if(!d)throw Error('Use a valid date for '+f.label+' (YYYY-MM-DD).');return d;}
 if(f.kind==='select'){if(!f.options.includes(String(v)))throw Error('Choose a valid '+f.label.toLowerCase()+'.');return String(v);}
 if(f.kind==='boolean')return bool(v);
 if(f.kind==='ref')return String(v);
 return String(v).slice(0,f.kind==='longtext'?4000:300);
}
function valuesFromForm(role,source,mode,refs){
 const out={};const m=roleMap[role];
 for(const f of S[role]){
  if(['frozen','computed'].includes(f.kind)||f.key==='archived')continue;
  if(!m||!m.fields[f.key]||!m.writable.includes(f.key))continue;
  if(!has(source,f.key)){if(mode==='create'&&f.required)throw Error('Required field: '+f.label+'.');continue;}
  const v=cleanValue(f,source[f.key]);
  if(f.kind==='ref'&&v!==null){const kept=refs&&refs[f.key]===v;if(!kept&&!R(f.ref).rows.some(r=>r.id===v))throw Error('Choose an existing '+f.label.toLowerCase()+'.');}
  out[f.key]=v;
 }
 if(role==='agreements'){const e=has(out,'effective_date')?out.effective_date:source.effective_date,x=has(out,'expiry_date')?out.expiry_date:source.expiry_date;if(validDate(e)&&validDate(x)&&validDate(x)<validDate(e))throw Error('The expiry date is before the effective date.');
  if(out.total_value!==undefined&&out.total_value!==null&&!out.currency&&!source.currency)throw Error('Choose the currency of the total value.');}
 if(role==='obligations'){if(out.amount!==undefined&&out.amount!==null&&!out.currency&&!source.currency)throw Error('Choose the currency of the amount.');
  if(out.recurrence&&out.recurrence!=='none'&&!validDate(has(out,'due_date')?out.due_date:source.due_date))throw Error('A recurring obligation needs its first due date.');}
 if(mode==='create'&&m&&m.fields.archived&&m.writable.includes('archived'))out.archived=false;
 return out;}
function settingsValues(source){const out={};const m=roleMap.settings;
 for(const f of S.settings){if(!m||!m.fields[f.key]||!m.writable.includes(f.key)||!has(source,f.key))continue;out[f.key]=cleanValue(f,source[f.key]);}
 for(const [k,allowed] of [['agreement_types',TYPES],['obligation_kinds',KINDS]]){if(out[k]){const bad=String(out[k]).split(',').map(x=>x.trim().toLowerCase()).filter(x=>x&&!allowed.includes(x));if(bad.length)throw Error('Unknown '+k.replace('_',' ')+': '+bad.join(', ')+'. Use: '+allowed.join(', ')+'.');}}
 if(out.reminder_days){const l=String(out.reminder_days).split(',').map(x=>x.trim()).filter(Boolean);if(!l.length||l.some(x=>!/^\d+$/.test(x)||Number(x)<1||Number(x)>365))throw Error('Reminder windows are whole numbers of days from 1 to 365, separated by commas.');}
 return out;}
let saved=false;
function save(changes,message){
 changes=changes.filter(Boolean);if(!changes.length)throw Error('Nothing changed.');
 if(changes.length>50)throw Error('This change needs '+changes.length+' record writes; one save holds 50. Save it in smaller parts.');
 tools.call('records.save',{changes});saved=true;st.undoNext=true;st.undo=null;say('success',message||'Saved');st.flash=notice;}
/* Key terms with the stored dates recomputed: the computed fields are written in the same save as the terms or the agreement dates. */
function termsData(t,a,extra){const merged={...(t||{}),...(extra||{})};const out={...(extra||{})};
 const nd=noticeDeadline(a.expiry_date,merged.notice_days,merged.renewal)||null,ce=confidentialityEnd(a.expiry_date,a.effective_date,merged.confidentiality_years)||null;
 if(roleMap.terms&&roleMap.terms.fields.notice_deadline&&(validDate(t&&t.notice_deadline)||null)!==nd)out.notice_deadline=nd;
 if(roleMap.terms&&roleMap.terms.fields.confidentiality_end&&(validDate(t&&t.confidentiality_end)||null)!==ce)out.confidentiality_end=ce;
 return out;}
function termsChange(a,extra,version){const t=termsOf(a.id),data=termsData(t,a,extra);if(!Object.keys(data).length)return null;if(!canWrite('terms'))throw Error('You cannot change key terms.');
 if(t)return {kind:'update_record',recordId:t.id,expectedVersion:version!==undefined&&version!==null?version:t.version,data:toReal('terms',data)};
 return {kind:'create_record',typeId:roleMap.terms.typeId,data:toReal('terms',{agreement_id:a.id,extraction_status:'none',...data})};}
function termsValues(source){const out={};const m=roleMap.terms;for(const f of S.terms){if(['frozen','computed'].includes(f.kind))continue;if(!m||!m.fields[f.key]||!m.writable.includes(f.key)||!has(source,f.key))continue;let v=source[f.key];if(typeof v==='string')v=v.trim();
 if(v===''||v===null){out[f.key]=null;continue;}
 if(f.kind==='number'){const n=Number(v);if(!Number.isFinite(n)||n<0)throw Error('Enter a positive number for '+f.label+'.');out[f.key]=n;}
 else if(f.kind==='select'){if(!f.options.includes(String(v)))throw Error('Choose a valid '+f.label.toLowerCase()+'.');out[f.key]=String(v);}
 else if(f.key==='document_link'){if(!/^https?:\/\/\S+$/i.test(String(v)))throw Error('The external link must start with https:// or http://.');out[f.key]=String(v).slice(0,1000);}
 else out[f.key]=String(v).slice(0,f.kind==='longtext'?4000:300);}
 if(out.renewal&&out.renewal!=='none'&&(out.notice_days===null||out.notice_days===undefined)&&!(num(source.notice_days)>=0))throw Error('A renewing agreement needs its notice period in days.');
 return out;}
const sameValue=(x,y)=>(x===undefined||x===''?null:x)===(y===undefined||y===''?null:y)||String(x)===String(y)&&x!==null&&y!==null&&x!==undefined&&y!==undefined;

/* ---------- panels: one at a time (create, many fields, verification) ---------- */
const ROLES_FOR_PANEL={detail:['agreements','terms','organizations','obligations','programs','studies','people','milestones'],terms:['agreements','terms'],review:['agreements','terms','obligations'],sign:['agreements','terms'],attach:['agreements','terms'],renewal:['agreements','terms'],dd:['agreements','terms','organizations'],editor:[]};
function openEditor(role,mode,id,preset,back){
 let draft={...(preset||{})},version=null;
 if(mode!=='create'){const r=lookup(role,id);if(!r)throw Error('That record is no longer available.');draft={...r.data};version=r.version;if(mode==='duplicate'){if(draft.name!==undefined)draft.name='Copy of '+String(draft.name||'');if(draft.title!==undefined)draft.title='Copy of '+String(draft.title||'');}}
 for(const f of S[role])if(f.kind==='frozen'||f.kind==='computed')delete draft[f.key];
 if(role==='obligations'&&mode!=='edit')delete draft.source_document_version_id;
 const refs={};for(const f of S[role])if(f.kind==='ref'&&draft[f.key])refs[f.key]=String(draft[f.key]);
 // The version is captured now: a record changed meanwhile is refused by the server, never overwritten.
 st.panel={kind:'editor',role,mode,id:mode==='edit'?id:null,version:mode==='edit'?version:null,draft,refs,termsVersion:role==='agreements'&&mode==='edit'&&termsOf(id)?termsOf(id).version:null,back:back||null};
}
function openTerms(agId,preset){const a=AG(agId);if(!a)throw Error('That agreement is no longer available.');const t=termsOf(agId);
 const draft={};for(const f of S.terms)if(!['frozen','computed'].includes(f.kind)&&t&&t[f.key]!==undefined&&t[f.key]!==null)draft[f.key]=t[f.key];
 if(!t&&a.agreement_type==='cda_nda')draft.cda_direction='mutual';
 const extra={};if(preset){for(const k of Object.keys(preset))if(k==='status_since')extra.status_since=preset[k];else draft[k]=preset[k];}
 st.panel={kind:'terms',agreementId:agId,version:t?t.version:null,draft,extra,fresh:!!preset};}
const detailBack=()=>st.panel&&st.panel.kind==='detail'?{role:st.panel.role,id:st.panel.id}:null;

/* ---------- events ---------- */
const AGREEMENT_FILTERS=['agreement_type','counterparty_id','program_id','status','verified','from','to'];
// The table of an inline cell: the screen's own table first, so an edit reads nothing the screen does not show.
const CELL_ROLES={agreements:['agreements'],overview:['agreements','obligations'],obligations:['obligations'],counterparties:['organizations'],milestones:['milestones','programs']};
function cellRole(id){const first=CELL_ROLES[st.screen]||[];for(const role of first.concat(['agreements','obligations','organizations','milestones','programs'].filter(r=>!first.includes(r))))if(roleMap[role]&&R(role).allRows.some(r=>r.id===id))return role;return null;}
const INLINE={agreements:['status','expiry_date','owner'],obligations:['status','owner'],organizations:['name','org_type','country'],milestones:['name','end_date','status','is_key'],programs:['name','code']};
function inlineEdit(e){
 const role=cellRole(e.recordId);if(!role||!(INLINE[role]||[]).includes(e.field))throw Error('That value cannot be edited here.');
 if(waiting(role==='agreements'?['agreements','terms']:[role]))return;
 if(!writableField(role,e.field))throw Error('You cannot change '+e.field.replace(/_/g,' ')+'.');
 const f=S[role].find(x=>x.key===e.field),r=lookup(role,e.recordId);if(!r)throw Error('That record is no longer available.');
 const value=cleanValue(f,e.value);if(sameValue(value,r.data[e.field]))return;
 const version=e.version!==null?e.version:r.version;const changes=[{kind:'update_record',recordId:r.id,expectedVersion:version,data:toReal(role,{[e.field]:value})}];
 if(role==='agreements'){const a={...AG(r.id),[e.field]:value};
  if(e.field==='expiry_date'){if(value&&a.effective_date&&value<a.effective_date)throw Error('The expiry date is before the effective date.');if(termsOf(r.id))changes.push(termsChange(a,{}));}
  if(e.field==='status'&&canWrite('terms'))changes.push(termsChange(a,{status_since:AS_OF||null}));}
 save(changes,cap(f.label)+' saved');}
try{
 const ed=kit.edit(event,{});const mv=kit.move(event,'move');
 if(action.startsWith('undo:')&&event.kind==='click'){const undoId=action.slice(5);try{tools.call('undo.run',{undoId});st.undo=null;say('success','Undone');}catch(e){st.undo=null;throw Error('This change cannot be undone any more: '+String(e&&e.message||e).slice(0,200));}}
 else if(action.startsWith('nav:')){const id=action.slice(4);if(shown.some(s=>s.id===id)){st.screen=id;st.offset=0;st.query='';st.filters={};st.filtersOpen=false;st.panel=null;st.undo=null;}}
 else if(action==='as-of'&&event.kind==='change'){const d=validDate(event.value);if(!d)throw Error('Use a valid as-of date.');st.asOf=d;}
 else if(action==='query'&&event.kind==='change'){st.query=String(event.value||'').slice(0,100);st.offset=0;}
 else if(action==='doc-search'&&event.kind==='change'){st.docSearch=bool(event.value);}
 else if(action==='filters:toggle')st.filtersOpen=!st.filtersOpen;
 else if(action.startsWith('filter:')&&event.kind==='change'){st.filters[action.slice(7)]=String(event.value||'');st.offset=0;}
 else if(action==='filters:clear'){st.filters={};st.offset=0;}
 else if(action.startsWith('page:')){st.offset=Math.max(0,Number(action.slice(5))||0);}
 else if(action==='panel:close'){const back=st.panel&&st.panel.back;st.panel=back?{kind:'detail',role:back.role,id:back.id}:null;}
 else if(action.startsWith('details:')){const [role,id]=action.slice(8).split(':');if(S[role])st.panel={kind:'detail',role,id};}
 else if(ed){inlineEdit(ed);}
 else if(mv){/* Pipeline: drag and drop, or the move menu on each card */
  const a=AG(mv.cardId);if(!a)throw Error('That agreement is no longer available.');if(!IN_FLIGHT.includes(mv.columnId))throw Error('Move between drafting, in negotiation and out for signature; use Mark signed to activate.');
  if(a.status!==mv.columnId&&!waiting(['agreements','terms'])){if(!writableField('agreements','status'))throw Error('You cannot change agreement status.');
   save([{kind:'update_record',recordId:a.id,expectedVersion:a.version,data:toReal('agreements',{status:mv.columnId})},canWrite('terms')?termsChange(a,{status_since:AS_OF||null}):null],String(a.name||'Agreement')+' moved to '+STATUS_LABEL[mv.columnId]);}}
 else if(action.startsWith('add:')){const role=action.slice(4),c=conf(),agId=st.panel&&st.panel.kind==='detail'&&st.panel.role==='agreements'?st.panel.id:'',ag=agId?AG(agId):null;
  if(!S[role]||!roleMap[role])throw Error('That table is not connected.');
  openEditor(role,'create',null,role==='agreements'?{agreement_type:c.types[0]==='cda_nda'&&c.types.length>1?'msa':c.types[0],status:'drafting',currency:c.currency}:role==='obligations'?{agreement_id:agId,counterparty_id:ag?ag.counterparty_id||'':'',kind:c.kinds[0],direction:'we_owe',status:'open',recurrence:'none',currency:c.currency}:role==='milestones'?{item_type:'milestone',status:'planned',is_key:true}:role==='people'?{organization_id:ag?ag.counterparty_id||'':''}:role==='organizations'?{org_type:'company'}:{},detailBack());}
 else if(action.startsWith('add-child:')){const p=AG(action.slice(10));if(!p)throw Error('That agreement is no longer available.');
  openEditor('agreements','create',null,{parent_id:p.id,counterparty_id:p.counterparty_id||'',program_id:p.program_id||'',study_id:p.study_id||'',agreement_type:p.agreement_type==='msa'?'sow_work_order':p.agreement_type==='sow_work_order'?'change_order':p.agreement_type==='licence_in'||p.agreement_type==='licence_out'?p.agreement_type:'change_order',status:'drafting',currency:p.currency||conf().currency,owner:p.owner||''},detailBack());}
 else if(action.startsWith('open-edit:')){const [role,id]=action.slice(10).split(':');openEditor(role,'edit',id,null,detailBack());}
 else if(action.startsWith('duplicate:')){const [role,id]=action.slice(10).split(':');openEditor(role,'duplicate',id,null,detailBack());}
 else if(action.startsWith('save:')&&event.kind==='change'&&st.panel){/* a choice inside an open form: keep it, nothing is saved */
  const d={...(st.panel.draft||{}),...form};for(const k of Object.keys(form))if(k.startsWith('pick_')&&form[k]){d[k.slice(5)]=String(form[k]).slice(0,300);delete d[k];}else if(k.startsWith('pick_'))delete d[k];st.panel.draft=d;}
 else if(action==='save:record'&&event.kind==='submit'){
  const p=st.panel;if(!p||p.kind!=='editor')throw Error('Nothing to save.');const {role,mode,id}=p;if(!canWrite(role))throw Error('You cannot change the '+ROLE_LABEL[role]+' table.');
  p.draft={...p.draft,...form};for(const k of Object.keys(p.draft))if(k.startsWith('pick_'))delete p.draft[k];
  const data=valuesFromForm(role,p.draft,mode==='edit'?'update':'create',p.refs);
  if(role==='agreements'&&data.parent_id&&mode==='edit'){let cur=data.parent_id;const seen=new Set();while(cur&&!seen.has(cur)){if(cur===id)throw Error('An agreement cannot sit under itself or its own children.');seen.add(cur);cur=AG(cur)?AG(cur).parent_id:'';}}
  // An obligation's counterparty defaults to its agreement's counterparty (it may differ, e.g. a payment to a third party).
  if(role==='obligations'&&mode!=='edit'&&!data.counterparty_id&&data.agreement_id&&AG(data.agreement_id)&&AG(data.agreement_id).counterparty_id&&writableField('obligations','counterparty_id'))data.counterparty_id=AG(data.agreement_id).counterparty_id;
  if(role==='obligations'&&mode!=='edit'&&roleMap.obligations.fields.verified&&writableField('obligations','verified'))data.verified=true;// entered by a person in the app: confirmed by them
  if(mode==='edit'){const orig=lookup(role,id);if(!orig)throw Error('This record changed or was removed; reopen it.');for(const k of Object.keys(data))if(sameValue(data[k],orig.data[k]))delete data[k];if(!Object.keys(data).length)throw Error('Nothing changed.');
   const changes=[{kind:'update_record',recordId:id,expectedVersion:p.version,data:toReal(role,data)}];
   // Changed agreement dates recompute the stored notice deadline and confidentiality end in the same save.
   if(role==='agreements'&&(has(data,'expiry_date')||has(data,'effective_date'))&&termsOf(id))changes.push(termsChange({...AG(id),...data},{},p.termsVersion));
   save(changes,cap(ROLE_LABEL[role])+' saved'+(changes.length>1?', with the key-term dates recalculated':''));st.panel=p.back?{kind:'detail',role:p.back.role,id:p.back.id}:null;}
  else{save([{kind:'create_record',typeId:roleMap[role].typeId,data:toReal(role,data)}],'New '+ROLE_LABEL[role]+' saved');st.panel=p.back?{kind:'detail',role:p.back.role,id:p.back.id}:null;
   // A save cannot reference a record it creates: the key terms follow once the agreement has its record ID.
   if(role==='agreements'&&canWrite('terms'))st.after={name:String(data.name||''),counterparty_id:data.counterparty_id||'',terms:{status_since:AS_OF||null},tries:0};}}
 /* key terms */
 else if(action.startsWith('terms:')){openTerms(action.slice(6));}
 else if(action==='save:terms'&&event.kind==='submit'){const p=st.panel;if(!p||p.kind!=='terms')throw Error('Nothing to save.');p.draft={...p.draft,...form};const a=AG(p.agreementId);if(!a)throw Error('That agreement is no longer available.');
  if(!canWrite('terms'))throw Error('You cannot change key terms.');const values=termsValues(p.draft),cur=termsOf(a.id);
  if(cur)for(const k of Object.keys(values))if(sameValue(values[k],cur[k]))delete values[k];
  const c=termsChange(a,{...values,...(p.extra||{})},cur?p.version:null);if(!c)throw Error('Nothing changed.');
  save([c],'Key terms saved');st.panel=null;}
 /* archive (nothing is removed; Undo is offered) */
 else if(action.startsWith('archive:')&&event.kind==='click'){const [role,id]=action.slice(8).split(':');const r=lookup(role,id);if(!r)throw Error('That record is no longer available.');if(!canWrite(role))throw Error('You cannot archive '+ROLE_LABEL[role]+'s.');
  if(role==='agreements'&&kidsOf(id).length)throw Error('Other agreements sit under this one. Move or archive them first.');
  save([{kind:'archive_record',recordId:r.id,expectedVersion:r.version}],cap(ROLE_LABEL[role])+' archived');st.panel=null;}
 /* obligations */
 else if(action.startsWith('ob-status:')&&event.kind==='click'){const [id,to,v]=action.slice(10).split(':');const o=OBS().find(x=>x.id===id);if(!o)throw Error('That obligation is no longer available.');if(!OB_STATUS.includes(to))throw Error('Choose done, waived, missed or open.');if(!writableField('obligations','status'))throw Error('You cannot change obligations.');
  save([{kind:'update_record',recordId:o.id,expectedVersion:v!==undefined&&v!==''?Number(v):o.version,data:toReal('obligations',{status:to})}],'Obligation marked '+to);}
 /* verification: a person checks assistant proposals */
 else if(action.startsWith('review:')){const a=AG(action.slice(7));if(!a)throw Error('That agreement is no longer available.');const t=termsOf(a.id);
  const obs=UNVERIFIED_OBS().filter(o=>o.agreement_id===a.id);if(!(t&&t.extraction_status==='proposed')&&!obs.length)throw Error('Nothing from this agreement is waiting for verification.');
  st.panel={kind:'review',agreementId:a.id,termsId:t&&t.extraction_status==='proposed'?t.id:null,termsVersion:t?t.version:null,obs:obs.map(o=>({id:o.id,version:o.version})),draft:{verified_by:'',terms_decision:t&&t.extraction_status==='proposed'?'verify':''}};}
 else if(action==='save:review'&&event.kind==='submit'){const p=st.panel;if(!p||p.kind!=='review')throw Error('Nothing to verify.');p.draft={...p.draft,...form};
  const who=String(p.draft.verified_by||'').trim();if(!who)throw Error('Enter your name: verification is recorded with the person who checked the source.');if(!AS_OF)throw Error('Set the as-of date first.');
  const a=AG(p.agreementId);if(!a)throw Error('That agreement changed or was removed; open the verification again.');const changes=[];
  if(p.termsId&&p.draft.terms_decision==='verify'){if(!writableField('terms','extraction_status'))throw Error('You cannot verify key terms.');const t=termsOf(a.id);if(!t||t.id!==p.termsId)throw Error('The key terms changed; open the verification again.');
   changes.push({kind:'update_record',recordId:t.id,expectedVersion:p.termsVersion,data:toReal('terms',{extraction_status:'verified',verified_by:who.slice(0,300),verified_on:AS_OF,...termsData(t,a,{})})});}
  for(const o of p.obs){const d=String(p.draft['ob_'+o.id]||'verify');if(d==='verify'){if(!writableField('obligations','verified'))throw Error('You cannot verify obligations.');changes.push({kind:'update_record',recordId:o.id,expectedVersion:o.version,data:toReal('obligations',{verified:true})});}
   else if(d==='reject'){if(!canWrite('obligations'))throw Error('You cannot archive obligations.');changes.push({kind:'archive_record',recordId:o.id,expectedVersion:o.version});}}
  if(!changes.length)throw Error('Choose at least one item to verify or reject.');
  save(changes,'Verified by '+who+': '+plural(changes.length,'record'));st.panel=null;}
 /* signature */
 else if(action.startsWith('sign:')){const a=AG(action.slice(5));if(!a)throw Error('That agreement is no longer available.');const t=termsOf(a.id);
  st.panel={kind:'sign',id:a.id,version:a.version,termsVersion:t?t.version:null,draft:{signed_on:a.signed_on||AS_OF||'',effective_date:a.effective_date||a.signed_on||AS_OF||'',expiry_date:a.expiry_date||'',confidentiality_years:t&&t.confidentiality_years!=null?String(t.confidentiality_years):'',cda_direction:t&&t.cda_direction||(a.agreement_type==='cda_nda'?'mutual':'')}};}
 else if(action==='save:sign'&&event.kind==='submit'){const p=st.panel;if(!p||p.kind!=='sign')throw Error('Nothing to sign.');p.draft={...p.draft,...form};const a=AG(p.id);if(!a)throw Error('That agreement changed or was removed.');
  const signed=validDate(p.draft.signed_on),eff=validDate(p.draft.effective_date),exp=p.draft.expiry_date?validDate(p.draft.expiry_date):'';if(!signed)throw Error('Enter the signature date.');if(p.draft.expiry_date&&!exp)throw Error('Use a valid expiry date.');if(eff&&exp&&exp<eff)throw Error('The expiry date is before the effective date.');
  if(!writableField('agreements','status'))throw Error('You cannot change agreement status.');
  const upd={status:'active',signed_on:signed,effective_date:eff||null,expiry_date:exp||null};const changes=[{kind:'update_record',recordId:a.id,expectedVersion:p.version,data:toReal('agreements',upd)}];
  if(canWrite('terms')){const extra={status_since:signed};const y=String(p.draft.confidentiality_years||'').trim();if(y){const n=Number(y);if(!Number.isFinite(n)||n<0)throw Error('Confidentiality years must be a positive number.');extra.confidentiality_years=n;}
   if(p.draft.cda_direction&&a.agreement_type==='cda_nda'){if(!CDA_DIR.includes(p.draft.cda_direction))throw Error('Choose the CDA direction.');extra.cda_direction=p.draft.cda_direction;}
   changes.push(termsChange({...a,...upd,expiry_date:exp,effective_date:eff},extra,p.termsVersion));}
  save(changes,String(a.name||'Agreement')+' is signed and active. Next: add the signed original.');st.panel={kind:'detail',role:'agreements',id:a.id};}
 /* signed originals */
 else if(action.startsWith('document:uploaded:')&&event.kind==='change'){const ctxv=action.slice(18),agId=ctxv.startsWith('attach:')?ctxv.slice(7):'',v=String(event.value||'');
  if(!AG(agId))say('success','Signed original saved in Documents. Ask Claude or ChatGPT to read it and fill in the agreement, key terms and obligations, or add the agreement and attach the original from its details.');
  else st.panel={kind:'attach',agreementId:agId,versionId:v,termsVersion:termsOf(agId)?termsOf(agId).version:null,fresh:true};}
 else if(action.startsWith('attach:')){const a=AG(action.slice(7));if(!a)throw Error('That agreement is no longer available.');st.panel={kind:'attach',agreementId:a.id,versionId:'',termsVersion:termsOf(a.id)?termsOf(a.id).version:null};}
 else if(action==='attach-pick'&&event.kind==='change'&&st.panel&&st.panel.kind==='attach'){st.panel.versionId=String(event.value||'');}
 else if(action==='save:attach'&&event.kind==='click'){const p=st.panel;if(!p||p.kind!=='attach')throw Error('Nothing to attach.');const a=AG(p.agreementId);if(!a)throw Error('That agreement changed or was removed.');
  const d=DOCS().list.find(x=>x.versionId===p.versionId);if(!d)throw Error('Choose a saved original you can open.');
  const t=termsOf(a.id),extra={document_id:d.documentId,document_version_id:d.versionId};if(!t||t.document_version_id!==d.versionId)extra.extraction_status='none';
  const ch=termsChange(a,extra,p.termsVersion);if(!ch)throw Error('This original is already attached.');
  save([ch],'Signed original '+d.filename+' attached.'+(d.aiReadable?' Ask Claude or ChatGPT to fill in its key terms.':' It is not AI-readable, so assistants cannot read it.'));st.panel={kind:'detail',role:'agreements',id:a.id};}
 /* CDAs */
 else if(action==='cda-query'&&event.kind==='change'){st.cdaQuery=String(event.value||'').slice(0,100);}
 else if(action==='cda-request'&&event.kind==='change'){st.cdaDraft={...(st.cdaDraft||{}),...Object.fromEntries(['counterparty_id','purpose'].filter(k=>has(form,k)).map(k=>[k,String(form[k]).slice(0,300)]))};}
 else if(action==='cda-request'&&event.kind==='submit'){st.cdaDraft={...(st.cdaDraft||{}),...Object.fromEntries(['counterparty_id','purpose'].filter(k=>has(form,k)).map(k=>[k,String(form[k]).slice(0,300)]))};const d=st.cdaDraft;
  const o=ORGS().find(x=>x.id===d.counterparty_id);if(!o)throw Error('Choose the counterparty organization (add it in Counterparties if it is new).');const purpose=String(d.purpose||'').trim();if(!purpose)throw Error('Enter the purpose of the CDA.');
  if(!canWrite('agreements'))throw Error('You cannot add agreements.');const name=('CDA — '+String(o.data.name||'')).slice(0,300);
  save([{kind:'create_record',typeId:roleMap.agreements.typeId,data:toReal('agreements',{name,agreement_type:'cda_nda',counterparty_id:o.id,status:'drafting',...(writableField('agreements','archived')?{archived:false}:{})})}],'CDA request with '+String(o.data.name||'')+' saved (drafting)');
  if(canWrite('terms'))st.after={name,counterparty_id:o.id,terms:{purpose,cda_direction:'mutual',status_since:AS_OF||null},tries:0};st.cdaDraft=null;}
 /* renewal decision */
 else if(action.startsWith('renewal:')){const a=AG(action.slice(8));if(!a)throw Error('That agreement is no longer available.');st.panel={kind:'renewal',id:a.id,version:a.version,termsVersion:termsOf(a.id)?termsOf(a.id).version:null,draft:{decision:'',note:''}};}
 else if(action==='save:renewal'&&event.kind==='submit'){const p=st.panel;if(!p||p.kind!=='renewal')throw Error('Nothing to record.');p.draft={...p.draft,...form};
  if(!DECISIONS.includes(p.draft.decision))throw Error('Choose renew, renegotiate or terminate.');const a=AG(p.id);if(!a)throw Error('That agreement changed or was removed.');const t=termsOf(a.id);
  const line='Renewal decision on '+(AS_OF||'—')+': '+p.draft.decision+(String(p.draft.note||'').trim()?' — '+String(p.draft.note).trim():'')+'.';
  const changes=[termsChange(a,{notes:((t&&t.notes?String(t.notes)+'\n':'')+line).slice(-4000),...(p.draft.decision==='renegotiate'?{status_since:AS_OF||null}:{})},p.termsVersion)];
  if(p.draft.decision==='renegotiate'){if(!writableField('agreements','status'))throw Error('You cannot change agreement status.');changes.push({kind:'update_record',recordId:a.id,expectedVersion:p.version,data:toReal('agreements',{status:'in_negotiation'})});}
  save(changes,'Renewal decision ('+p.draft.decision+') saved in the key-term notes');st.panel={kind:'detail',role:'agreements',id:a.id};}
 /* due-diligence list */
 else if(action==='dd:open'){st.panel={kind:'dd',draft:{min:''},types:[],statuses:['active']};}
 else if(action==='dd-filter'&&event.kind==='change'&&st.panel&&st.panel.kind==='dd'){st.panel.types=TYPES.filter(t=>bool(form['type_'+t]));st.panel.statuses=STATUSES.filter(s=>bool(form['status_'+s]));st.panel.draft={min:String(form.min??'').slice(0,20)};}
 /* settings (owners only) */
 else if(action==='settings:save'&&event.kind==='change'){st.settingsDraft={...(st.settingsDraft||{}),...form};}
 else if(action==='settings:save'&&event.kind==='submit'){if(!isOwner)throw Error('Only the app’s owners change its settings.');if(!canWrite('settings'))throw Error('You cannot change the settings table.');
  const values=settingsValues({...(st.settingsDraft||{}),...form}),row=conf().row;
  if(row){for(const k of Object.keys(values))if(sameValue(values[k],row.data[k]))delete values[k];if(!Object.keys(values).length)throw Error('Nothing changed.');save([{kind:'update_record',recordId:row.id,expectedVersion:row.version,data:toReal('settings',values)}],'Settings saved');}
  else save([{kind:'create_record',typeId:roleMap.settings.typeId,data:toReal('settings',values)}],'Settings saved');st.settingsDraft=null;}
}catch(e){say('error',String(e&&e.message||e).slice(0,300));}

/* After a new agreement is saved, its starting key terms open once it is in the register (a click saves them). */
if(st.after&&!saved&&!st.panel&&!waiting(['agreements','terms'])){const p=st.after,a=AGS().filter(x=>String(x.name||'')===p.name&&(x.counterparty_id||'')===(p.counterparty_id||'')&&!termsOf(x.id)).pop();
 if(a){st.after=null;try{openTerms(a.id,p.terms);}catch(e){}}else if(++p.tries>2)st.after=null;}
/* After a direct save the platform renders the app once more from the saved data (an open event): the save's message is
 * carried in state so that screen shows it too. */
if(st.flash&&!saved&&['open','refresh'].includes(event.kind)){if(!notice&&st.flash.message)notice=kit.notice(st.flash.kind==='error'?'error':'success',st.flash.message);st.flash=null;}
/* Undo (G8): after a save, the person's last action can be undone from the next screen. undo.list runs on the server. */
if(st.undoNext&&!saved&&inp.saved&&['open','refresh'].includes(event.kind)){st.undoNext=false;try{const u=tools.call('undo.list',{});const e=u&&Array.isArray(u.entries)?u.entries[0]:null;st.undo=e&&e.undoId?{undoId:String(e.undoId),label:String(e.label||'last change').slice(0,80)}:null;}catch(e){st.undo=null;}}

/* ---------- rendering helpers ---------- */
const btn=(text,a,o)=>kit.button(text,a,o||{});
const link=(text,a,aria)=>'<button type="button" class="ct-link" data-action="'+esc(a)+'"'+(aria?' aria-label="'+esc(aria)+'"':'')+'>'+esc(text)+'</button>';
const pill=(text,tone)=>'<span class="k-pill'+(tone?' ct-'+tone:'')+'">'+esc(text)+'</span>';
const statusTone=s=>s==='active'?'green':IN_FLIGHT.includes(s)?'blue':'';
const obTone=s=>s==='done'?'green':s==='missed'?'red':s==='waived'?'':'blue';
const verifiedPill=v=>v?pill('Verified','green'):pill('Not checked','amber');
const uploadBtn=(agId,text)=>'<button type="button" class="k-button" data-trialy-document="upload attach:'+esc(agId)+'"'+(inp.saved&&canWrite('terms')?'':' disabled')+'>'+esc(text||'Upload the signed original')+'</button>';
const sub=parts=>{const t=parts.filter(Boolean).join(' · ');return t?'<span class="ct-sub">'+esc(t)+'</span>':'';};
const kv=(k,v,html)=>'<div class="ct-kv"><span>'+esc(k)+'</span><strong>'+(html?v:esc(v===null||v===undefined||v===''?'—':v))+'</strong></div>';
const card=(title,body,actions,cls)=>'<section class="k-card ct-section'+(cls?' '+cls:'')+'">'+(title||actions?'<div class="ct-head">'+(title?'<h2>'+esc(title)+'</h2>':'<span></span>')+(actions?'<div class="k-row">'+actions+'</div>':'')+'</div>':'')+body+'</section>';
const loadingNote=what=>'<p class="k-muted ct-loading" role="status" aria-live="polite">Loading '+esc(what)+'…</p>';
const partialNote=roles=>{const p=readProblems(roles);return p.length?'<p class="k-muted k-small ct-partial">Partial data: '+esc(p.slice(0,4).join('; '))+'. Totals and “none found” answers are withheld.</p>':'';};
const tot=(n,roles)=>exactFor(roles)?String(n):'—';
const notConnected=role=>kit.empty({title:cap(ROLE_LABEL[role])+' table not connected',text:'Connect it from the app’s data access in TrialAgents to use this screen.'});
function selCell(r,field,value,options,labels,lbl,readOnly){
 if(readOnly)return esc(labels&&labels[value]||cap(value));
 return '<select class="k-cell" data-action="edit:'+esc(r.id)+':'+field+':'+esc(r.version)+'" aria-label="'+esc(lbl)+'">'+(options.includes(value)?'':'<option value="">—</option>')+options.map(o=>'<option value="'+esc(o)+'"'+(o===value?' selected':'')+'>'+esc(labels&&labels[o]||cap(o))+'</option>').join('')+'</select>';}
const cell=(r,field,value,kind,lbl,readOnly)=>kit.cell({recordId:r.id,version:r.version,field,value,kind,label:lbl,readOnly});
function paged(items,per){per=per||Math.min(50,Math.max(10,num(cfg.pageSize,25)||25));const max=Math.max(0,Math.ceil(items.length/per)-1)*per;const offset=Math.min(st.offset,max);st.offset=offset;return {slice:items.slice(offset,offset+per),offset,limit:per,total:items.length};}
const pager=p=>p.total>p.limit?kit.pager({offset:p.offset,limit:p.limit,total:p.total,action:'page'}):'';
const search=(value,placeholder,aria,a)=>'<input type="search" class="ct-search" name="query" data-ui-state="true" data-action="'+esc(a||'query')+'" value="'+esc(value)+'" placeholder="'+esc(placeholder)+'" aria-label="'+esc(aria)+'">';
function filterBar(filters,extra){filters=filters.filter(f=>f.options===null||f.options.length);const active=Object.entries(st.filters).filter(([,v])=>v).length;
 const toggle='<button type="button" class="k-button" data-action="filters:toggle" aria-expanded="'+(st.filtersOpen?'true':'false')+'">'+esc('Filters'+(active?' ('+active+')':''))+'</button>';
 const body=st.filtersOpen?'<div class="ct-filters">'+filters.map(f=>'<label class="k-field"><span>'+esc(f.label)+'</span>'+(f.options===null?'<input type="date" name="filter_'+f.key+'" data-action="filter:'+f.key+'" value="'+esc(st.filters[f.key]||'')+'">':'<select name="filter_'+f.key+'" data-action="filter:'+f.key+'"><option value="">All</option>'+f.options.map(o=>'<option value="'+esc(o[0])+'"'+(st.filters[f.key]===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select>')+'</label>').join('')+(extra||'')+'<div class="ct-filter-end">'+btn('Clear filters','filters:clear',{disabled:!active})+'</div></div>':'';
 return {toggle,body};}
const typeOpts=()=>conf().types.map(x=>[x,TYPE_LABEL[x]]);
const orgOpts=()=>ORGS().map(o=>[o.id,String(o.data.name||'Unnamed')]);
const progOpts=()=>R('programs').rows.map(p=>[p.id,String(p.data.name||'Unnamed')]);
function ageText(a){const t=termsOf(a.id),s=validDate(t&&t.status_since);return s&&AS_OF?plural(Math.max(0,diffDays(s,AS_OF)),'day')+' in status':'days in status unknown';}
const bucketLabel=d=>{const b=bucket(d);return b?'≤ '+b+' days':'';};

/* ---------- Overview: what needs attention now ---------- */
const OV_ROLES=['settings','agreements','terms','organizations','obligations','milestones'];
function upcoming(){const out=[];
 for(const a of AGS()){if(!isActive(a))continue;const t=termsOf(a.id),d=storedOrComputed(t,a);
  if(inWindow(d.notice))out.push({date:d.notice,kind:'Notice deadline',text:'Cancel by '+dateLabel(d.notice)+' or it renews'+(t&&num(t.renewal_term_months)?' for '+plural(num(t.renewal_term_months),'month'):''),a,tone:'amber'});
  if(inWindow(a.expiry_date))out.push({date:a.expiry_date,kind:'Expiry',text:'Expires '+dateLabel(a.expiry_date),a,tone:''});
  if(a.agreement_type==='cda_nda'&&inWindow(d.conf))out.push({date:d.conf,kind:'Confidentiality ends',text:'Confidentiality ends '+dateLabel(d.conf),a,tone:''});}
 for(const o of OBS()){if(o.status!=='open'||!o.verified)continue;const nd=nextDue(o);if(inWindow(nd))out.push({date:nd,kind:DIR_LABEL[o.direction]||'Obligation',text:String(o.title||'')+(o.amount!==null?' · '+money(o.amount,o.currency):''),a:AG(o.agreement_id)||null,tone:o.direction==='we_owe'?'blue':'green',ob:o});}
 return out.sort((x,y)=>x.date.localeCompare(y.date)||x.kind.localeCompare(y.kind));}
function overview(){
 if(R('agreements').unbound)return notConnected('agreements');
 if(waiting(OV_ROLES))return loadingNote('what needs attention');
 if(!AGS().length)return kit.empty({title:'No agreements yet',text:'Add your first agreement, or upload a signed original and ask Claude or ChatGPT to fill in its terms and obligations.',action:canWrite('agreements')?{label:'Add agreement',action:'add:agreements'}:null})+(canWrite('agreements')?'<div class="k-row ct-center">'+uploadBtn('new','Upload a signed original')+btn('New CDA request','nav:cdas')+'</div>':'');
 const W=conf().window,up=upcoming(),next=up.find(x=>x.kind==='Notice deadline')||up[0];
 const od=OBS().filter(o=>o.verified&&overdueOb(o)),inFlight=AGS().filter(a=>IN_FLIGHT.includes(a.status)),active=AGS().filter(isActive);
 const exactRoles=['agreements','terms','obligations'];
 let html=partialNote(OV_ROLES);
 const sentence=next?(next.kind==='Notice deadline'?'Cancel '+String(next.a.name||'')+' by '+dateLabel(next.date)+' or it renews'+(termsOf(next.a.id)&&num(termsOf(next.a.id).renewal_term_months)?' for '+plural(num(termsOf(next.a.id).renewal_term_months),'month'):''):(next.a?String(next.a.name||'')+': ':'')+next.text)+' ('+inDays(next.date)+')':'Nothing due in the next '+W+' days';
 html+='<section class="k-card ct-section ct-hero"><span class="ct-over">'+esc(next?next.kind:'Next deadline')+'</span><p class="ct-sentence">'+esc(sentence)+'</p>'+(next&&next.a?btn('Open '+String(next.a.name||'agreement'),'details:agreements:'+next.a.id):'')+'</section>';
 html+='<div class="k-grid ct-section">'+kit.stat('Active agreements',tot(active.length,exactRoles))+kit.stat('Overdue obligations',tot(od.length,exactRoles))+kit.stat('Waiting to be checked',tot(PROPOSED_TERMS().length+UNVERIFIED_OBS().length,exactRoles))+kit.stat('Before signature',tot(inFlight.length,exactRoles))+'</div>';
 const unv=PROPOSED_TERMS().map(t=>({a:AG(t.agreement_id),what:'Proposed key terms'})).concat(Object.entries(UNVERIFIED_OBS().reduce((m,o)=>{(m[o.agreement_id]=m[o.agreement_id]||[]).push(o);return m;},{})).filter(([id])=>AG(id)).map(([id,l])=>({a:AG(id),what:plural(l.length,'proposed obligation')})));
 const attention=od.slice(0,8).map(o=>'<li><span><strong>'+esc(o.title||'')+'</strong>'+sub(['Overdue since '+dateLabel(o.due_date),DIR_LABEL[o.direction],agName(o.agreement_id)])+'</span>'+btn('Mark done','ob-status:'+o.id+':done:'+o.version,{disabled:!writableField('obligations','status'),ariaLabel:'Mark '+String(o.title||'obligation')+' done'})+'</li>').join('')+
  unv.slice(0,8).map(x=>'<li><span><strong>'+esc(x.a.name||'')+'</strong>'+sub([x.what+' from the assistant','not checked, not counted'])+'</span>'+btn('Verify','review:'+x.a.id,{primary:true,disabled:!canWrite('obligations')&&!canWrite('terms'),ariaLabel:'Verify '+String(x.a.name||'')})+'</li>').join('')+
  EXPIRES_BEFORE().slice(0,6).map(x=>'<li><span><strong>'+esc(x.a.name||'')+'</strong>'+sub(['Expires '+dateLabel(x.a.expiry_date)+', before '+String(x.ms[0].name||'key milestone')+' ('+dateLabel(x.ms[0].end_date)+')'])+'</span>'+btn('Open','details:agreements:'+x.a.id,{ariaLabel:'Open '+String(x.a.name||'')})+'</li>').join('');
 html+='<div class="ct-two">'+card('Needs attention',attention?'<ul class="ct-list">'+attention+'</ul>':'<p class="k-muted">Nothing needs attention.</p>')+
  card('Next '+W+' days',up.length?'<ul class="ct-list">'+up.slice(0,12).map(x=>'<li><span><strong>'+esc(x.a?x.a.name||'':'')+'</strong>'+sub([x.kind,x.text])+'</span><span class="ct-end">'+pill(dateLabel(x.date)+(bucketLabel(x.date)?' · '+bucketLabel(x.date):''),x.tone)+(x.a?btn('Open','details:agreements:'+x.a.id,{ariaLabel:'Open '+String(x.a.name||'agreement')}):'')+'</span></li>').join('')+'</ul>'+(up.length>12?'<p class="k-muted k-small">And '+(up.length-12)+' more in Agreements and Obligations.</p>':''):'<p class="k-muted">Nothing is due in this window.</p>')+'</div>';
 html+=card('Before signature',inFlight.length?'<ul class="ct-list">'+inFlight.sort((a,b)=>IN_FLIGHT.indexOf(b.status)-IN_FLIGHT.indexOf(a.status)).slice(0,8).map(a=>'<li><span><strong>'+esc(a.name||'')+'</strong>'+sub([orgName(a.counterparty_id),STATUS_LABEL[a.status]])+'</span><span class="k-muted k-small">'+esc(ageText(a))+'</span></li>').join('')+'</ul>':'<p class="k-muted">No agreements before signature.</p>',btn('Pipeline','nav:pipeline'));
 return html;}

/* ---------- Agreements ---------- */
const AG_ROLES=['settings','agreements','terms','organizations','obligations','programs','milestones'];
function agreementRows(){const q=st.query.toLowerCase().trim(),f=st.filters;let rows=AGS().slice();
 if(q)rows=rows.filter(a=>[a.name,orgName(a.counterparty_id),TYPE_LABEL[a.agreement_type],a.owner,termsOf(a.id)&&termsOf(a.id).purpose].some(x=>String(x||'').toLowerCase().includes(q)));
 for(const k of ['agreement_type','counterparty_id','program_id','status'])if(f[k])rows=rows.filter(a=>String(a[k]||'')===f[k]);
 if(f.verified==='verified')rows=rows.filter(a=>{const t=termsOf(a.id);return t&&t.extraction_status==='verified';});
 if(f.verified==='unverified')rows=rows.filter(a=>{const t=termsOf(a.id);return (t&&t.extraction_status==='proposed')||UNVERIFIED_OBS().some(o=>o.agreement_id===a.id);});
 if(f.from)rows=rows.filter(a=>a.expiry_date&&a.expiry_date>=f.from);if(f.to)rows=rows.filter(a=>a.expiry_date&&a.expiry_date<=f.to);
 return rows.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));}
function docSearchPanel(){if(!st.docSearch||!st.query.trim())return '';if(!inp.saved)return '<p class="k-muted k-small">Searching signed originals works in the saved app.</p>';
 let r;try{r=tools.call('documents.search',{query:st.query.trim()});}catch(e){r={unavailable:true};}
 if(r&&r.pending)return loadingNote('matches in signed originals');
 if(!r||r.unavailable)return '<p class="k-muted k-small">Signed originals could not be searched for you.</p>';
 const hits=Array.isArray(r.hits)?r.hits:[],cov=r.coverage||{};const byDoc=id=>Object.values(TERMS()).find(t=>t.document_id===id);
 return card('In signed originals',(hits.length?'<ul class="ct-list">'+hits.slice(0,10).map(h=>{const t=byDoc(h.documentId),a=t&&AG(t.agreement_id);return '<li><span><strong>'+esc(a?a.name:h.filename)+'</strong>'+sub([h.filename,h.pages&&h.pages.length?'page '+h.pages.slice(0,3).join(', '):''])+'<span class="ct-quote">'+esc(h.passage||'')+'</span></span>'+(a?btn('Open','details:agreements:'+a.id):'<span class="k-muted k-small">Not attached to an agreement</span>')+'</li>';}).join('')+'</ul>':'<p class="k-muted">No match in the searchable originals.</p>')+((cov.pending||cov.unavailable||cov.partial)?'<p class="k-muted k-small">Coverage: '+esc([cov.pending?cov.pending+' still being read':'',cov.unavailable?cov.unavailable+' without readable text':'',cov.partial?cov.partial+' read partially':''].filter(Boolean).join(', '))+'. A missing match is not proof that the text is absent.</p>':''));}
function agreementsScreen(){
 if(R('agreements').unbound)return notConnected('agreements');
 const can=canWrite('agreements');
 const actions='<div class="k-row ct-section">'+btn('Add agreement','add:agreements',{primary:true,disabled:!can})+uploadBtn('new','Upload a signed original')+btn('Due-diligence list','dd:open',{disabled:!AGS().length})+'</div>';
 if(waiting(AG_ROLES))return actions+loadingNote('agreements');
 if(!AGS().length)return kit.empty({title:'No agreements yet',text:'Add the first agreement, or upload a signed original and ask Claude or ChatGPT to fill it in.',action:can?{label:'Add agreement',action:'add:agreements'}:null})+(can?'<div class="k-row ct-center">'+uploadBtn('new','Upload a signed original')+'</div>':'');
 const progs=!R('programs').unbound;
 const fb=filterBar([{key:'agreement_type',label:'Type',options:typeOpts()},{key:'counterparty_id',label:'Counterparty',options:orgOpts()},...(progs?[{key:'program_id',label:'Program',options:progOpts()}]:[]),{key:'status',label:'Status',options:STATUSES.map(s=>[s,STATUS_LABEL[s]])},{key:'verified',label:'Checking',options:[['verified','Terms verified'],['unverified','Waiting to be checked']]},{key:'from',label:'Expires on or after',options:null},{key:'to',label:'Expires on or before',options:null}],'<label class="ct-check"><input type="checkbox" name="doc_search" value="true" data-action="doc-search"'+(st.docSearch?' checked':'')+'> Also search signed originals</label>');
 const rows=agreementRows(),p=paged(rows);
 const cols=[
  {key:'name',label:'Agreement',render:a=>{const t=termsOf(a.id);return link(a.name||'Unnamed agreement','details:agreements:'+a.id,'Open '+String(a.name||'agreement'))+sub([a.parent_id?'Under '+agName(a.parent_id):'',t&&t.extraction_status==='proposed'?'terms not checked':'',t&&t.document_version_id?'signed original attached':t&&t.document_link?'external link':'']);}},
  {key:'agreement_type',label:'Type',render:a=>esc(TYPE_LABEL[a.agreement_type]||label(a.agreement_type))},
  {key:'counterparty_id',label:'Counterparty',render:a=>esc(orgName(a.counterparty_id))},
  {key:'status',label:'Status',render:a=>selCell(a,'status',a.status,STATUSES,STATUS_LABEL,'Status of '+String(a.name||'agreement'),!writableField('agreements','status'))},
  {key:'expiry_date',label:'Expiry',render:a=>{const eb=expiresBefore(a).length;return cell(a,'expiry_date',a.expiry_date,'date','Expiry of '+String(a.name||'agreement'),!writableField('agreements','expiry_date'))+(isActive(a)&&inWindow(a.expiry_date)?pill(inDays(a.expiry_date),'amber'):'')+(eb?pill('Before milestone','red'):'');}},
  {key:'total_value',label:'Value',render:a=>a.total_value===null?'<span class="k-muted">—</span>':esc(money(a.total_value,a.currency))},
  {key:'owner',label:'Owner',render:a=>cell(a,'owner',a.owner||'','text','Owner of '+String(a.name||'agreement'),!writableField('agreements','owner'))}];
 let html=actions+partialNote(['agreements','terms','organizations'])+'<div class="ct-toolbar">'+search(st.query,'Search agreements','Search agreements')+fb.toggle+'</div>'+fb.body+docSearchPanel();
 html+=kit.table({columns:cols,rows:p.slice,empty:kit.empty({title:'No agreement matches',text:'Change the search or filters.',action:{label:'Clear filters',action:'filters:clear'}})})+pager(p);
 return html;}

/* ---------- Families ---------- */
function familyCard(rootId){const f=familyValue(rootId),dts=familyDates(f.members),master=AG(rootId),exact=exactFor(['agreements']);
 const tree=f.members.map(m=>{const a=m.a;return '<li style="--depth:'+Math.min(m.depth,5)+'"><span>'+link(a.name||'Unnamed','details:agreements:'+a.id,'Open '+String(a.name||'agreement'))+sub([TYPE_LABEL[a.agreement_type]||label(a.agreement_type),STATUS_LABEL[a.status]||cap(a.status),a.expiry_date?'expires '+dateLabel(a.expiry_date):''])+'</span><span class="ct-end">'+(a.total_value===null?'<span class="k-muted">No value</span>':esc(money(a.total_value,a.currency||f.primary)))+'</span></li>';}).join('');
 return '<article class="k-card ct-section"><div class="ct-head"><div><h2>'+esc(master.name||'')+'</h2>'+sub([orgName(master.counterparty_id),plural(f.members.length-1,'child agreement')])+'</div><strong class="ct-total">'+(exact?esc(money(f.total,f.primary)):'—')+'</strong></div>'+
 kv('Family value ('+f.primary+')',exact?money(f.total,f.primary):'Withheld: partial read')+f.others.map(c=>kv('Also in '+c+' (not converted)',exact?money(f.by[c],c):'—')).join('')+
 kv('Added by change orders',exact&&f.share!==null?money(f.co[f.primary]||0,f.primary)+' · '+(Math.round(f.share*1000)/10)+'%':'—')+kv('Earliest expiry (active)',dateLabel(dts.earliestExpiry))+kv('Next notice deadline',dateLabel(dts.nextNotice)+(dts.nextNotice?' ('+inDays(dts.nextNotice)+')':''))+
 (f.missing.length?'<p class="k-muted k-small">'+plural(f.missing.length,'member')+' without a value '+(f.missing.length===1?'is':'are')+' not in the total.</p>':'')+'<ul class="ct-list ct-tree">'+tree+'</ul><div class="k-row">'+btn('Add child agreement','add-child:'+rootId,{disabled:!canWrite('agreements'),ariaLabel:'Add child agreement to '+String(master.name||'family')})+'</div></article>';}
function familiesScreen(){
 if(R('agreements').unbound)return notConnected('agreements');
 if(waiting(['settings','agreements','terms','organizations']))return loadingNote('families');
 const masters=ROOTS().filter(id=>!kidsOf(id).length&&['msa','licence_in','licence_out','research_collaboration'].includes(AG(id).agreement_type));
 if(!FAMILIES().length){const first=masters[0];
  return kit.empty({title:'No contract families yet',text:'A family is a master agreement (an MSA or a licence) with its SOWs, change orders or sublicences. '+(first?'Add a child agreement to '+String(AG(first).name||'a master')+' to start one.':'Add an MSA or a licence first.'),action:canWrite('agreements')?(first?{label:'Add child agreement',action:'add-child:'+first}:{label:'Add agreement',action:'add:agreements'}):null})+(masters.length>1?card('Masters without children yet','<ul class="ct-list">'+masters.slice(1,10).map(id=>'<li><span><strong>'+esc(AG(id).name||'')+'</strong>'+sub([TYPE_LABEL[AG(id).agreement_type],orgName(AG(id).counterparty_id)])+'</span>'+btn('Add child agreement','add-child:'+id,{disabled:!canWrite('agreements'),ariaLabel:'Add child agreement to '+String(AG(id).name||'')})+'</li>').join('')+'</ul>'):'');}
 const q=st.query.toLowerCase().trim(),list=FAMILIES().filter(id=>!q||familyMembers(id).some(m=>String(m.a.name||'').toLowerCase().includes(q)||orgName(m.a.counterparty_id).toLowerCase().includes(q)));
 const p=paged(list,10);
 let html=partialNote(['agreements'])+'<div class="ct-toolbar">'+search(st.query,'Search families','Search families')+btn('Add agreement','add:agreements',{primary:true,disabled:!canWrite('agreements')})+'</div>';
 html+=(p.total?p.slice.map(familyCard).join(''):kit.empty({title:'No family matches',text:'Change the search.'}))+pager(p);
 if(masters.length)html+=card('Masters without children yet','<ul class="ct-list">'+masters.slice(0,10).map(id=>'<li><span><strong>'+esc(AG(id).name||'')+'</strong>'+sub([TYPE_LABEL[AG(id).agreement_type],orgName(AG(id).counterparty_id)])+'</span>'+btn('Add child agreement','add-child:'+id,{disabled:!canWrite('agreements'),ariaLabel:'Add child agreement to '+String(AG(id).name||'')})+'</li>').join('')+'</ul>');
 return html;}

/* ---------- Obligations ---------- */
const OB_ROLES=['settings','obligations','agreements','terms','organizations','milestones'];
function obligationsScreen(){
 if(R('obligations').unbound)return notConnected('obligations');
 if(waiting(OB_ROLES))return loadingNote('obligations');
 const can=canWrite('obligations');
 if(!OBS().length)return kit.empty({title:'No obligations yet',text:'Add what you owe and what you are owed (payments, reports, diligence milestones, notices), or verify the ones your assistant proposes from a signed original.',action:can&&AGS().length?{label:'Add obligation',action:'add:obligations'}:can?{label:'Add an agreement first',action:'add:agreements'}:null});
 const q=st.query.toLowerCase().trim(),f=st.filters;let rows=OBS().slice();
 if(q)rows=rows.filter(o=>[o.title,agName(o.agreement_id),o.owner,o.trigger,o.source_quote].some(x=>String(x||'').toLowerCase().includes(q)));
 for(const k of ['direction','kind','status','agreement_id'])if(f[k])rows=rows.filter(o=>String(o[k]||'')===f[k]);
 if(f.verified)rows=rows.filter(o=>(f.verified==='verified')===o.verified);
 rows.sort((a,b)=>(nextDue(a)||'9999').localeCompare(nextDue(b)||'9999')||String(a.title||'').localeCompare(String(b.title||'')));
 const p=paged(rows),fb=filterBar([{key:'direction',label:'Direction',options:DIRECTIONS.map(d=>[d,DIR_LABEL[d]])},{key:'kind',label:'Kind',options:conf().kinds.map(k=>[k,KIND_LABEL[k]])},{key:'status',label:'Status',options:OB_STATUS.map(s=>[s,cap(s)])},{key:'verified',label:'Checking',options:[['verified','Verified'],['unverified','Not checked']]},{key:'agreement_id',label:'Agreement',options:AGS().map(a=>[a.id,String(a.name||'')])}]);
 const cols=[
  {key:'title',label:'Obligation',render:o=>link(o.title||'Untitled','details:obligations:'+o.id,'Open '+String(o.title||'obligation'))+sub([o.trigger?'Trigger: '+o.trigger:'',o.milestone_id?'Milestone: '+msName(o.milestone_id):'',o.recurrence&&o.recurrence!=='none'?cap(o.recurrence):''])},
  {key:'agreement_id',label:'Agreement',render:o=>esc(agName(o.agreement_id))},
  {key:'direction',label:'Direction',render:o=>pill(DIR_LABEL[o.direction]||cap(o.direction),o.direction==='we_owe'?'blue':'green')},
  {key:'due',label:'Next due',render:o=>{const d=nextDue(o);return d?esc(dateLabel(d))+(overdueOb(o)?' '+pill('Overdue','red'):o.status==='open'&&inWindow(d)?' '+pill(inDays(d),'amber'):''):'<span class="k-muted">'+esc(o.trigger?'On trigger':'No date')+'</span>';}},
  {key:'amount',label:'Amount',render:o=>o.amount===null?'<span class="k-muted">—</span>':esc(money(o.amount,o.currency))},
  {key:'status',label:'Status',render:o=>selCell(o,'status',o.status,OB_STATUS,null,'Status of '+String(o.title||'obligation'),!writableField('obligations','status'))},
  {key:'verified',label:'Checked',render:o=>o.verified?verifiedPill(true):btn('Verify','review:'+o.agreement_id,{disabled:!writableField('obligations','verified'),ariaLabel:'Verify '+String(o.title||'obligation')})}];
 let html='<div class="ct-toolbar">'+search(st.query,'Search obligations','Search obligations')+fb.toggle+btn('Add obligation','add:obligations',{primary:true,disabled:!can||!AGS().length})+'</div>'+fb.body+partialNote(['obligations','agreements']);
 html+=kit.table({columns:cols,rows:p.slice,empty:kit.empty({title:'No obligation matches',text:'Change the search or filters.',action:{label:'Clear filters',action:'filters:clear'}})})+pager(p);
 // Calendar and payments by month: verified open obligations, next 12 months; recurring ones on each occurrence.
 if(AS_OF){const from=AS_OF,to=addDays(addMonthsDate(AS_OF,12),-1),months=Array.from({length:12},(_,i)=>addMonths(AS_OF.slice(0,7),i));const cal={},pay={},unv={};
  for(const o of OBS()){if(o.status!=='open')continue;for(const d of occurrences(o,from,to)){const m=d.slice(0,7);if(!o.verified){unv[m]=(unv[m]||0)+1;continue;}(cal[m]=cal[m]||[]).push({o,d});if(o.kind==='payment'&&o.amount!==null){const c=o.currency||'—';pay[m]=pay[m]||{};pay[m][c]=pay[m][c]||{we_owe:0,they_owe:0};pay[m][c][o.direction]+=o.amount;}}}
  const calHtml=months.filter(m=>cal[m]||unv[m]).map(m=>'<h3>'+esc(monthLabel(m))+(unv[m]?' '+pill(plural(unv[m],'not checked'),'amber'):'')+'</h3><ul class="ct-list">'+(cal[m]||[]).sort((a,b)=>a.d.localeCompare(b.d)).map(x=>'<li><span>'+esc(dateLabel(x.d))+' · <strong>'+esc(x.o.title||'')+'</strong>'+sub([agName(x.o.agreement_id)])+'</span><span class="k-small">'+esc((DIR_LABEL[x.o.direction]||'')+(x.o.amount!==null?' · '+money(x.o.amount,x.o.currency):''))+'</span></li>').join('')+'</ul>').join('');
  const payHtml=months.filter(m=>pay[m]).map(m=>'<li><span><strong>'+esc(monthLabel(m))+'</strong></span><span class="ct-end k-small">'+Object.keys(pay[m]).sort().map(c=>esc(c+': we pay '+grouped(pay[m][c].we_owe)+' · we receive '+grouped(pay[m][c].they_owe))).join('<br>')+'</span></li>').join('');
  html+='<div class="ct-two">'+card('Calendar, next 12 months',calHtml||'<p class="k-muted">No dated verified obligations in the next 12 months.</p>')+card('Payments by month',(payHtml?'<ul class="ct-list">'+payHtml+'</ul>':'<p class="k-muted">No verified payments due in the next 12 months.</p>')+'<p class="k-muted k-small">Per currency, never converted'+(exactFor(['obligations'])?'':'; partial read')+'.</p>')+'</div>';}
 return html;}

/* ---------- CDAs ---------- */
function cdaInfo(a){const t=termsOf(a.id),d=storedOrComputed(t,a);return {t,conf:d.conf,direction:t&&t.cda_direction};}
function cdasScreen(){
 if(R('agreements').unbound)return notConnected('agreements');
 if(waiting(['settings','agreements','terms','organizations']))return loadingNote('CDAs');
 const list=AGS().filter(a=>a.agreement_type==='cda_nda'),exact=exactFor(['agreements','organizations']);
 const q=norm(st.cdaQuery);let answer='';
 if(q){const orgs=ORGS().filter(o=>norm(o.data.name).includes(q));const hits=list.filter(a=>orgs.some(o=>o.id===a.counterparty_id)||norm(a.name).includes(q));
  const signed=hits.filter(a=>['active','expired','terminated','superseded'].includes(a.status)&&a.signed_on),live=signed.filter(a=>a.status==='active');
  answer='<div class="ct-answer ct-'+(live.length?'yes':signed.length?'old':'no')+'" role="status"><strong>'+esc(live.length?'Yes — '+plural(live.length,'active CDA')+' with '+(orgs.map(o=>o.data.name).join(', ')||st.cdaQuery):signed.length?'Only expired or ended CDAs with '+st.cdaQuery:!exact?'Not sure: the register was not read completely.':orgs.length?'No signed CDA with '+orgs.map(o=>o.data.name).join(', '):'No organization matches “'+st.cdaQuery+'”.')+'</strong>'+
   (hits.length?'<ul class="ct-list">'+hits.map(a=>{const c=cdaInfo(a);return '<li><span><strong>'+esc(a.name||'')+'</strong>'+sub([STATUS_LABEL[a.status],c.direction?CDA_DIR_LABEL[c.direction]:'direction not recorded',a.signed_on?'signed '+dateLabel(a.signed_on):'not signed',a.expiry_date?'term to '+dateLabel(a.expiry_date):'',c.conf?'confidential until '+dateLabel(c.conf):''])+'</span>'+btn('Open','details:agreements:'+a.id,{ariaLabel:'Open '+String(a.name||'CDA')})+'</li>';}).join('')+'</ul>':'')+'</div>';}
 const d=st.cdaDraft||{},can=canWrite('agreements');
 const ask=card('Have we signed a CDA with…?','<label class="k-field"><span>Organization</span><input type="search" name="cda_query" data-ui-state="true" data-action="cda-query" value="'+esc(st.cdaQuery)+'" placeholder="Type a company, university or investor"></label>'+answer);
 const request=card('New CDA request',ORGS().length?'<form data-action="cda-request"><label class="k-field"><span>Counterparty *</span><select name="counterparty_id"><option value="">Choose…</option>'+orgOpts().map(o=>'<option value="'+esc(o[0])+'"'+(d.counterparty_id===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></label><label class="k-field"><span>Purpose *</span><input name="purpose" value="'+esc(d.purpose||'')+'" placeholder="e.g. Evaluate a licensing opportunity"></label><div class="k-row"><button type="submit" class="k-button k-button--primary"'+(can?'':' disabled')+'>Save request</button></div><p class="k-muted k-small">Starts as drafting; its key terms follow.</p></form>':kit.empty({title:'No counterparties yet',text:'Add the organization first.',action:canWrite('organizations')?{label:'Add organization',action:'add:organizations'}:null}));
 let html=partialNote(['agreements','organizations'])+'<div class="ct-two">'+ask+request+'</div>';
 if(!list.length)return html+kit.empty({title:'No CDAs yet',text:'Record a CDA request above, or add a signed CDA as an agreement of type CDA / NDA.',action:can?{label:'Add agreement',action:'add:agreements'}:null});
 const rows=list.slice().sort((a,b)=>orgName(a.counterparty_id).localeCompare(orgName(b.counterparty_id))||String(b.signed_on||'').localeCompare(String(a.signed_on||'')));const p=paged(rows);
 html+=kit.table({columns:[
  {key:'org',label:'Organization',render:a=>link(orgName(a.counterparty_id),'details:agreements:'+a.id,'Open '+String(a.name||'CDA'))+sub([a.name])},
  {key:'dir',label:'Direction',render:a=>{const c=cdaInfo(a);return esc(c.direction?CDA_DIR_LABEL[c.direction]:'—');}},
  {key:'purpose',label:'Purpose',render:a=>{const c=cdaInfo(a);return esc(c.t&&c.t.purpose||'—');}},
  {key:'status',label:'Status',render:a=>pill(STATUS_LABEL[a.status]||cap(a.status),statusTone(a.status))},
  {key:'signed',label:'Signed',render:a=>esc(dateLabel(a.signed_on))},
  {key:'conf',label:'Confidentiality ends',render:a=>{const c=cdaInfo(a);return esc(dateLabel(c.conf))+(c.conf&&inWindow(c.conf)?' '+pill(inDays(c.conf),'amber'):'');}}],rows:p.slice})+pager(p);
 const ending=list.map(a=>({a,c:cdaInfo(a)})).filter(x=>x.c.conf&&inWindow(x.c.conf,365)).sort((x,y)=>x.c.conf.localeCompare(y.c.conf));
 html+=card('Confidentiality ending within a year',ending.length?'<ul class="ct-list">'+ending.map(x=>'<li><span><strong>'+esc(orgName(x.a.counterparty_id))+'</strong>'+sub([x.a.name])+'</span><span class="k-small">'+esc(dateLabel(x.c.conf)+' ('+inDays(x.c.conf)+')')+'</span></li>').join('')+'</ul>':'<p class="k-muted">None.</p>');
 return html;}

/* ---------- Pipeline: drag and drop between stages ---------- */
function pipelineScreen(){
 if(R('agreements').unbound)return notConnected('agreements');
 if(waiting(['settings','agreements','terms','organizations']))return loadingNote('the pipeline');
 const items=AGS().filter(a=>IN_FLIGHT.includes(a.status)),can=writableField('agreements','status');
 if(!items.length)return kit.empty({title:'Nothing before signature',text:'Agreements in drafting, negotiation or out for signature show here, one column per stage.',action:canWrite('agreements')?{label:'Add agreement',action:'add:agreements'}:null});
 const board=kit.board({action:'move',columns:IN_FLIGHT.map(s=>({id:s,label:STATUS_LABEL[s],cards:items.filter(a=>a.status===s).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))).map(a=>({id:a.id,label:String(a.name||'agreement'),
  html:link(a.name||'Unnamed','details:agreements:'+a.id,'Open '+String(a.name||'agreement'))+sub([orgName(a.counterparty_id),TYPE_LABEL[a.agreement_type]])+sub([a.owner?'Owner: '+a.owner:'No owner',ageText(a)])+(s==='out_for_signature'?'<div class="k-row ct-card-actions">'+btn('Mark signed','sign:'+a.id,{primary:true,disabled:!can,ariaLabel:'Mark '+String(a.name||'')+' signed'})+'</div>':'')}))}))});
 return (can?'':'<p class="k-muted k-small">You can view the pipeline; moving agreements needs edit access.</p>')+board+'<p class="k-muted k-small ct-section">Drag a card, or use its menu, to change the stage; it saves at once. Mark signed makes the agreement active and asks for the signature dates.</p>';}

/* ---------- Counterparties (the shared organizations table) ---------- */
function counterpartiesScreen(){
 if(R('organizations').unbound)return notConnected('organizations');
 if(waiting(['organizations','agreements','people']))return loadingNote('counterparties');
 const can=canWrite('organizations');
 if(!ORGS().length)return kit.empty({title:'No counterparties yet',text:'Add the companies, universities, CROs and investors you sign agreements with. Other apps use the same organizations.',action:can?{label:'Add organization',action:'add:organizations'}:null});
 const q=st.query.toLowerCase().trim(),rows=ORGS().filter(o=>!q||[o.data.name,o.data.country,o.data.org_type].some(x=>String(x||'').toLowerCase().includes(q))).map(o=>({id:o.id,version:o.version,...o.data})),p=paged(rows);
 const count=id=>AGS().filter(a=>a.counterparty_id===id).length,contacts=id=>R('people').rows.filter(x=>x.data.organization_id===id).length;
 let html='<div class="ct-toolbar">'+search(st.query,'Search counterparties','Search counterparties')+btn('Add organization','add:organizations',{primary:true,disabled:!can})+'</div>'+partialNote(['organizations','agreements']);
 html+=kit.table({columns:[
  {key:'name',label:'Organization',render:o=>cell(o,'name',o.name||'','text','Name of '+String(o.name||'organization'),!writableField('organizations','name'))},
  {key:'org_type',label:'Type',render:o=>selCell(o,'org_type',o.org_type,ORG_TYPES,null,'Type of '+String(o.name||'organization'),!writableField('organizations','org_type'))},
  {key:'country',label:'Country',render:o=>cell(o,'country',o.country||'','text','Country of '+String(o.name||'organization'),!writableField('organizations','country'))},
  {key:'agreements',label:'Agreements',render:o=>esc(tot(count(o.id),['agreements']))},
  ...(R('people').unbound?[]:[{key:'people',label:'Contacts',render:o=>esc(String(contacts(o.id)))}]),
  {key:'more',label:'More',render:o=>btn('Details','details:organizations:'+o.id,{ariaLabel:'Details of '+String(o.name||'organization')})}],rows:p.slice,empty:kit.empty({title:'No counterparty matches',text:'Change the search.'})})+pager(p);
 return html;}

/* ---------- Milestones (own entries, or From Programs read only) ---------- */
function milestonesScreen(){
 if(R('milestones').unbound)return notConnected('milestones');
 if(waiting(['milestones','programs']))return loadingNote('milestones');
 const from=linkedFrom(),hint=integrationHint(),can=canWrite('milestones')&&!from;
 const intro='<p class="k-muted k-small">Key program milestones, used for milestone-triggered obligations and for agreements that expire before a key milestone.'+(from?' From '+esc(from)+', read only here: change them in '+esc(from)+'.':'')+'</p>'+hint;
 if(R('milestones').unavailable)return intro+kit.empty({title:'Milestones are not readable for you',text:'Ask the app’s owner for access.'});
 const ms=MS().slice().sort((a,b)=>String(a.end_date||'').localeCompare(String(b.end_date||'')));
 if(!ms.length){if(from)return intro+kit.empty({title:'No milestones in '+from+' yet',text:'Add them in '+from+'; they show here read only.'});
  if(!R('programs').unbound&&!R('programs').rows.length)return intro+kit.empty({title:'Add a program first',text:'Milestones belong to a program.',action:canWrite('programs')?{label:'Add program',action:'add:programs'}:null});
  return intro+kit.empty({title:'No milestones yet',text:'Add the key milestones of your programs.',action:can?{label:'Add milestone',action:'add:milestones'}:null});}
 const ro=k=>!can||!writableField('milestones',k);
 return '<div class="ct-toolbar">'+intro+'<div class="k-row">'+(can?btn('Add milestone','add:milestones',{primary:true})+btn('Add program','add:programs',{disabled:!canWrite('programs')}):'')+'</div></div>'+partialNote(['milestones'])+kit.table({columns:[
  {key:'name',label:'Milestone',render:m=>(ro('name')?'<strong>'+esc(m.name||'')+'</strong>'+(from?' '+pill('From '+from,''):''):cell(m,'name',m.name||'','text','Name of '+String(m.name||'milestone'),false))},
  {key:'program_id',label:'Program',render:m=>esc(progName(m.program_id))},
  {key:'end_date',label:'Date',render:m=>cell(m,'end_date',m.end_date,'date','Date of '+String(m.name||'milestone'),ro('end_date'))},
  {key:'status',label:'Status',render:m=>selCell(m,'status',m.status,MS_STATUS,null,'Status of '+String(m.name||'milestone'),ro('status'))},
  {key:'is_key',label:'Key',render:m=>ro('is_key')?esc(bool(m.is_key)?'Key':'—'):cell(m,'is_key',bool(m.is_key),'boolean','Key milestone: '+String(m.name||''),false)}],rows:ms});}

/* ---------- Settings: business choices, owners only (G6) ---------- */
function settingsScreen(){
 if(waiting(['settings']))return loadingNote('settings');
 const c=conf(),d=st.settingsDraft||{},v=(k,dflt)=>has(d,k)?d[k]:c.row&&c.row.data[k]!=null?c.row.data[k]:dflt;
 const fields=[{name:'default_currency',label:'Default currency',value:v('default_currency',c.currency),options:CURRENCIES},{name:'reminder_days',label:'Reminder windows (days, comma list)',value:v('reminder_days','30, 60, 90')},{name:'agreement_types',label:'Agreement types offered, in order (comma list)',value:v('agreement_types',TYPES.join(', '))},{name:'obligation_kinds',label:'Obligation kinds offered, in order (comma list)',value:v('obligation_kinds',KINDS.join(', '))}].filter(f=>roleMap.settings&&roleMap.settings.fields[f.name]);
 return '<p class="k-muted k-small">How Contracts works for everyone using this app. Types: '+esc(TYPES.join(', '))+'. Kinds: '+esc(KINDS.join(', '))+'.</p>'+kit.settings({fields,action:'settings:save'},inp);}

/* ---------- panels ---------- */
const selectLabel=(f,o)=>f.key==='agreement_type'?TYPE_LABEL[o]:f.key==='status'&&f.options===STATUSES?STATUS_LABEL[o]:f.key==='kind'?KIND_LABEL[o]:f.key==='direction'?DIR_LABEL[o]:f.key==='cda_direction'?CDA_DIR_LABEL[o]:CURRENCIES.includes(o)?o:cap(o);
function refRows(f,selfId){if(f.ref==='agreements')return AGS().filter(a=>a.id!==selfId).map(a=>({id:a.id,name:String(a.name||'')+' · '+(TYPE_LABEL[a.agreement_type]||'')}));if(f.ref==='milestones')return MS().map(m=>({id:m.id,name:String(m.name||'')+(m.end_date?' · '+dateLabel(m.end_date):'')+' · '+progName(m.program_id)}));return R(f.ref).rows.map(r=>({id:r.id,name:String(r.data.name||'Unnamed')}));}
function control(role,f,v,selfId){const name=' name="'+f.key+'"',dis=!writableField(role,f.key)?' disabled':'',req=f.required?' required':'';v=v===null||v===undefined?'':v;
 if(f.kind==='select'){const c=conf();const opts=role==='agreements'&&f.key==='agreement_type'?c.types.concat(TYPES.filter(t=>!c.types.includes(t)&&t===v)):role==='obligations'&&f.key==='kind'?c.kinds.concat(KINDS.filter(k=>!c.kinds.includes(k)&&k===v)):f.options;
  return '<select'+name+dis+req+'><option value="">Choose…</option>'+opts.map(o=>'<option value="'+esc(o)+'"'+(String(v)===o?' selected':'')+'>'+esc(selectLabel(f,o))+'</option>').join('')+'</select>';}
 if(f.kind==='ref'){const cur=String(v||''),rows=refRows(f,selfId),keep=cur&&!rows.some(r=>r.id===cur);
  return '<select'+name+dis+req+'><option value="">'+(f.required?'Choose…':'None')+'</option>'+(keep?'<option value="'+esc(cur)+'" selected>'+esc(f.ref==='agreements'?agName(cur):f.ref==='milestones'?msName(cur):refName(f.ref,cur))+'</option>':'')+rows.map(r=>'<option value="'+esc(r.id)+'"'+(cur===r.id?' selected':'')+'>'+esc(r.name)+'</option>').join('')+'</select>';}
 if(f.kind==='longtext')return '<textarea rows="4"'+name+dis+'>'+esc(v)+'</textarea>';
 if(f.kind==='boolean')return '<select'+name+dis+'><option value="false"'+(!bool(v)?' selected':'')+'>No</option><option value="true"'+(bool(v)?' selected':'')+'>Yes</option></select>';
 if(f.kind==='person'){const people=R('people').unbound?[]:R('people').rows.map(r=>String(r.data.name||'')).filter(Boolean).sort();const input='<input type="text"'+name+dis+' value="'+esc(v)+'" placeholder="Name">';if(!people.length||dis)return input;
  return input+'<select name="pick_'+f.key+'" aria-label="Pick '+esc(f.label.toLowerCase())+' from contacts"><option value="">Pick from contacts…</option>'+people.map(n=>'<option value="'+esc(n)+'">'+esc(n)+'</option>').join('')+'</select>';}
 const type=f.kind==='date'?'date':f.kind==='number'?'number':'text';const val=f.kind==='date'?(validDate(v)||String(v)):v;
 return '<input type="'+type+'"'+name+dis+req+(f.kind==='number'?' step="any" min="0"':'')+' value="'+esc(val)+'">';}
const field=(f,html)=>'<label class="k-field'+(f.kind==='longtext'?' ct-wide':'')+'"><span>'+esc(f.label)+(f.required?' *':'')+'</span>'+html+'</label>';
const formPanel=(title,formAction,body,submitText,ok)=>kit.panel({title,close:'panel:close',body:'<form data-action="'+esc(formAction)+'">'+body+'<div class="k-row ct-panel-actions">'+btn('Cancel','panel:close')+'<button type="submit" class="k-button k-button--primary"'+(ok?'':' disabled')+'>'+esc(submitText)+'</button></div></form>'});
function editorPanel(p){const role=p.role,m=roleMap[role];
 const title=(p.mode==='edit'?'Edit ':p.mode==='duplicate'?'Duplicate ':'Add ')+ROLE_LABEL[role];
 const fields=S[role].filter(f=>!['frozen','computed'].includes(f.kind)&&f.key!=='archived'&&m&&m.fields[f.key]&&!(f.kind==='ref'&&R(f.ref).unbound));
 const lead=role==='obligations'?'<p class="k-muted k-small">An obligation you add or edit here is your own entry and counts as verified. Assistant proposals arrive not checked.</p>':role==='agreements'&&p.draft.parent_id?'<p class="k-muted k-small">Child of '+esc(agName(p.draft.parent_id))+'. Its value counts in that family, per currency.</p>':'';
 return formPanel(title,'save:record',lead+'<div class="ct-form">'+fields.map(f=>field(f,control(role,f,p.draft[f.key],p.id))).join('')+'</div>','Save',canWrite(role));}
function termsPanel(p){const a=AG(p.agreementId);if(!a)return '';const t=termsOf(a.id),m=roleMap.terms;
 const fields=S.terms.filter(f=>!['frozen','computed'].includes(f.kind)&&m&&m.fields[f.key]&&(f.key!=='cda_direction'||a.agreement_type==='cda_nda'||p.draft.cda_direction));
 const d=p.draft,nd=noticeDeadline(a.expiry_date,d.notice_days,d.renewal),ce=confidentialityEnd(a.expiry_date,a.effective_date,d.confidentiality_years);
 const quotes=parseJSON(t&&t.source_quotes)||{};
 return formPanel('Key terms: '+String(a.name||''),'save:terms',(p.fresh?'<p class="k-muted k-small">'+esc(String(a.name||'The agreement'))+' is saved. Add its key terms now, or close this and add them later.</p>':'')+(t&&t.extraction_status==='proposed'?'<p class="k-muted k-small">Proposed by an assistant and not checked yet; editing does not verify them.</p>':'')+
  '<div class="ct-form">'+fields.map(f=>field(f,control('terms',f,d[f.key],null)+(quotes[f.key]&&quotes[f.key].quote?'<span class="ct-quote">“'+esc(quotes[f.key].quote)+'”'+(quotes[f.key].page?' (p. '+esc(quotes[f.key].page)+')':'')+'</span>':''))).join('')+'</div>'+
  kv('Notice deadline',nd?dateLabel(nd):'— (needs expiry, notice days and automatic or option renewal)')+kv('Confidentiality end',ce?dateLabel(ce):'— (needs confidentiality years)'),'Save key terms',canWrite('terms'));}
function documentBlock(a){const t=termsOf(a.id),d=docOf(t);let html='<h3>Signed original</h3>';
 if(d&&!d.missing)html+=kv('Document',d.filename+' · v'+d.version+(d.latest?'':' (a newer version exists)'))+kv('AI-readable',d.aiReadable?'Yes':'No — assistants cannot read it')+kv('Text extraction',cap(d.extraction));
 else if(d&&d.missing)html+='<p class="k-muted k-small">'+(d.state==='pending'?'Loading the original…':d.state==='preview'?'Documents show in the saved app.':d.state==='unavailable'?'Documents are not available for you here.':'The attached original is not visible to you (restricted, or not AI-readable for this assistant).')+'</p>';
 else html+='<p class="k-muted k-small">No signed original attached.</p>';
 if(t&&t.document_link)html+=kv('External link',t.document_link);
 html+=kv('Filled in',t?cap(t.extraction_status||'none').replace('Proposed','Proposed, not checked')+(t.extraction_status==='verified'&&t.verified_by?' by '+t.verified_by+' on '+dateLabel(validDate(t.verified_on)):''):'None');
 return html+'<div class="k-row">'+uploadBtn(a.id,d&&!d.missing?'Upload a new original':'Upload the signed original')+btn('Attach a saved original','attach:'+a.id,{disabled:!canWrite('terms')||!inp.saved})+'</div>';}
function additionalFields(r){const keys=Object.keys((r&&r.extra)||{});if(!keys.length)return '';
 return '<h3>Additional fields</h3>'+keys.map(k=>{const v=r.extra[k];return kv(cap(k),v===null||v===undefined||v===''?'—':typeof v==='boolean'?(v?'Yes':'No'):v);}).join('')+'<p class="k-muted k-small">Added to this table after install. Ask Claude or ChatGPT to add a field to the app’s forms.</p>';}
function agreementDetail(a){const t=termsOf(a.id),dts=storedOrComputed(t,a),obs=OBS().filter(o=>o.agreement_id===a.id),kids=kidsOf(a.id).map(id=>AG(id)),root=rootOf(a.id),eb=expiresBefore(a);
 let html=(eb.length?'<p class="ct-warn">Expires before the key milestone '+esc(eb[0].name||'')+' ('+esc(dateLabel(eb[0].end_date))+'). Plan a renewal or extension.</p>':'')+
  kv('Type',TYPE_LABEL[a.agreement_type]||label(a.agreement_type))+kv('Counterparty',orgName(a.counterparty_id))+kv('Status',STATUS_LABEL[a.status]||cap(a.status))+(R('programs').unbound?'':kv('Program',progName(a.program_id)))+(R('studies').unbound?'':kv('Study',a.study_id?refName('studies',a.study_id):'—'))+kv('Effective',dateLabel(a.effective_date))+kv('Expiry',dateLabel(a.expiry_date))+kv('Signed on',dateLabel(a.signed_on))+kv('Total value',a.total_value===null?'—':money(a.total_value,a.currency))+kv('Owner',a.owner);
 html+='<div class="k-row ct-panel-actions">'+btn('Edit details','open-edit:agreements:'+a.id,{primary:true,disabled:!canWrite('agreements')})+(a.status==='out_for_signature'||IN_FLIGHT.includes(a.status)?btn('Mark signed','sign:'+a.id,{disabled:!writableField('agreements','status')}):'')+'</div>';
 html+='<h3>Key terms</h3>'+(t?kv('Renewal',t.renewal?cap(t.renewal)+(num(t.renewal_term_months)?' · '+plural(num(t.renewal_term_months),'month'):''):'—')+kv('Notice period',num(t.notice_days)!==null?plural(num(t.notice_days),'day'):'—')+kv('Notice deadline',dts.notice?dateLabel(dts.notice)+' ('+inDays(dts.notice)+')':'—')+(a.agreement_type==='cda_nda'||t.confidentiality_years?kv('Confidentiality',num(t.confidentiality_years)!==null?plural(num(t.confidentiality_years),'year'):'—')+kv('Confidentiality ends',dateLabel(dts.conf)):'')+(t.cda_direction?kv('CDA direction',CDA_DIR_LABEL[t.cda_direction]):'')+kv('Purpose',t.purpose)+kv('Governing law',t.governing_law)+(t.notes?'<p class="ct-notes">'+esc(t.notes)+'</p>':''):'<p class="k-muted k-small">No key terms recorded yet.</p>')+
  '<div class="k-row">'+btn(t?'Edit key terms':'Add key terms','terms:'+a.id,{disabled:!canWrite('terms')})+(dts.notice||a.expiry_date?btn('Record renewal decision','renewal:'+a.id,{disabled:!canWrite('terms')}):'')+((t&&t.extraction_status==='proposed')||obs.some(o=>!o.verified)?btn('Verify proposals','review:'+a.id,{primary:true,disabled:!canWrite('terms')&&!canWrite('obligations')}):'')+'</div>';
 html+=documentBlock(a);
 html+='<h3>Family</h3>'+(a.parent_id?kv('Under',agName(a.parent_id)):'')+(kids.length?'<ul class="ct-list">'+kids.map(k=>'<li><span>'+link(k.name||'Unnamed','details:agreements:'+k.id,'Open '+String(k.name||''))+sub([TYPE_LABEL[k.agreement_type]])+'</span><span class="k-small">'+(k.total_value===null?'—':esc(money(k.total_value,k.currency)))+'</span></li>').join('')+'</ul>':'')+(kidsOf(root).length?(()=>{const f=familyValue(root);return kv('Family value',exactFor(['agreements'])?money(f.total,f.primary)+(f.others.length?' + '+f.others.map(c=>money(f.by[c],c)).join(' + '):''):'Withheld: partial read');})():'<p class="k-muted k-small">Not part of a family.</p>')+'<div class="k-row">'+btn('Add child agreement','add-child:'+a.id,{disabled:!canWrite('agreements')})+'</div>';
 if(!R('obligations').unbound)html+='<h3>Obligations</h3>'+(obs.length?'<ul class="ct-list">'+obs.map(o=>'<li><span><strong>'+esc(o.title||'')+'</strong>'+sub([DIR_LABEL[o.direction],KIND_LABEL[o.kind],nextDue(o)?dateLabel(nextDue(o)):o.trigger])+(o.source_quote?'<span class="ct-quote">“'+esc(String(o.source_quote).slice(0,300))+'”'+(o.source_page?' (p. '+esc(o.source_page)+')':'')+'</span>':'')+'</span><span class="ct-end">'+verifiedPill(o.verified)+pill(cap(o.status),obTone(o.status))+'</span></li>').join('')+'</ul>':'<p class="k-muted k-small">No obligations.</p>')+'<div class="k-row">'+btn('Add obligation','add:obligations',{disabled:!canWrite('obligations')})+'</div>';
 if(!R('people').unbound&&a.counterparty_id){const ppl=R('people').rows.filter(x=>x.data.organization_id===a.counterparty_id);html+='<h3>Contacts at '+esc(orgName(a.counterparty_id))+'</h3>'+(ppl.length?'<ul class="ct-list">'+ppl.map(x=>'<li><span>'+esc(x.data.name||'')+sub([x.data.title])+'</span><span class="k-small">'+esc(x.data.email||'')+'</span></li>').join('')+'</ul>':'<p class="k-muted k-small">No contacts.</p>')+'<div class="k-row">'+btn('Add contact','add:people',{disabled:!canWrite('people')})+'</div>';}
 html+=additionalFields(lookup('agreements',a.id));
 html+='<h3>More</h3><div class="k-row">'+btn('Duplicate','duplicate:agreements:'+a.id,{disabled:!canWrite('agreements')})+btn('Archive','archive:agreements:'+a.id,{disabled:!canWrite('agreements')||kidsOf(a.id).length>0})+'</div><p class="k-muted k-small">Every change and who made it: <a href="platform:logs">Logs</a>.'+(kidsOf(a.id).length?' Archive its child agreements first.':'')+'</p>';
 return html;}
function detailPanel(p){
 const need=ROLES_FOR_PANEL.detail;if(waiting(need))return kit.panel({title:'Details',close:'panel:close',body:loadingNote('details')});
 const r=lookup(p.role,p.id);if(!r)return kit.panel({title:'Not available',close:'panel:close',body:'<p class="k-muted">This record is no longer available. It may have been archived.</p>'});
 if(p.role==='agreements'&&AG(p.id)){const a=AG(p.id);return kit.panel({title:String(a.name||'Agreement'),close:'panel:close',body:agreementDetail(a)});}
 const from=p.role==='milestones'?linkedFrom():'';
 const rows=S[p.role].filter(f=>roleMap[p.role]&&roleMap[p.role].fields[f.key]&&!['source_document_version_id','archived'].includes(f.key)).map(f=>{let v=r.data[f.key];if(f.kind==='ref')v=f.ref==='agreements'?agName(v):f.ref==='milestones'?msName(v):refName(f.ref,v);else if(f.kind==='date')v=validDate(v)?dateLabel(validDate(v)):v;else if(f.kind==='boolean'||f.key==='verified')v=bool(v)?'Yes':'No';else if(f.kind==='select')v=v?selectLabel(f,v):v;return kv(f.label.replace(/ \(.*\)$/,''),v);}).join('')+additionalFields(r);
 const can=canWrite(p.role)&&!from;
 return kit.panel({title:String(r.data.name||r.data.title||'Details'),close:'panel:close',body:(from?'<p class="k-muted k-small">From '+esc(from)+', read only here.</p>':'')+rows+'<div class="k-row ct-panel-actions">'+btn('Edit','open-edit:'+p.role+':'+p.id,{primary:true,disabled:!can})+(p.role==='obligations'?btn('Duplicate','duplicate:obligations:'+p.id,{disabled:!can}):'')+(['obligations','organizations','milestones','people'].includes(p.role)?btn('Archive','archive:'+p.role+':'+p.id,{disabled:!can}):'')+'</div><p class="k-muted k-small">Every change and who made it: <a href="platform:logs">Logs</a>.</p>'});}
function quoteCheck(versionId,quote,page){if(!inp.saved||!versionId||!quote||String(quote).trim().length<8)return null;try{return tools.call('documents.quote',{versionId,quote:String(quote).slice(0,2000),page:page||null});}catch(e){return {error:true};}}
function quoteState(q){if(!q)return '<span class="k-muted k-small">Quote not checked</span>';if(q.pending)return '<span class="k-muted k-small">Checking the quote…</span>';if(q.error)return pill('Document not readable for you','amber');if(q.found===null||q.found===undefined)return pill('Text not extracted yet ('+(q.status||'pending')+')','amber');if(!q.found)return pill('Quote not found in the original','red');return q.onPage===false?pill('Found, but on page '+(q.pages||[]).join(', '),'amber'):pill('Quote found'+(q.page?' on page '+q.page:''),'green');}
function reviewPanel(p){const a=AG(p.agreementId);if(!a)return '';const t=p.termsId?termsOf(a.id):null,quotes=parseJSON(t&&t.source_quotes)||{},ver=t&&t.document_version_id||'';
 let checked=0;const check=(vid,q,pg)=>checked++<15?quoteCheck(vid,q,pg):null;
 let html='<p class="k-muted k-small">Proposed by your connected assistant from the signed original. Check each value against its quote. Only what you verify counts as confirmed; rejected obligations are archived.</p>';
 if(t){const fields=S.terms.filter(f=>['select','number','text','longtext'].includes(f.kind)&&f.key!=='notes'&&t[f.key]!==undefined&&t[f.key]!==null&&t[f.key]!=='');
  html+='<h3>Key terms</h3><ul class="ct-list ct-review">'+fields.map(f=>{const q=quotes[f.key];return '<li><div class="ct-review-item"><span class="ct-sub">'+esc(f.label)+'</span><strong>'+esc(f.kind==='select'?selectLabel(f,t[f.key]):t[f.key])+'</strong>'+(q&&q.quote?'<span class="ct-quote">“'+esc(q.quote)+'”'+(q.page?' (p. '+esc(q.page)+')':'')+'</span><span>'+quoteState(check(ver,q.quote,num(q.page)))+'</span>':'<span>'+pill('No quote','amber')+'</span>')+'</div></li>';}).join('')+'</ul>'+
   kv('Agreement dates used','effective '+dateLabel(a.effective_date)+' · expiry '+dateLabel(a.expiry_date))+'<label class="k-field"><span>Key terms</span><select name="terms_decision"><option value="verify"'+(p.draft.terms_decision==='verify'?' selected':'')+'>Verify these terms</option><option value=""'+(p.draft.terms_decision!=='verify'?' selected':'')+'>Leave not checked for now</option></select></label>';}
 const obs=p.obs.map(x=>OBS().find(o=>o.id===x.id)).filter(Boolean);
 if(obs.length)html+='<h3>Proposed obligations</h3><ul class="ct-list ct-review">'+obs.map(o=>{const dec=String(p.draft['ob_'+o.id]||'verify');return '<li><div class="ct-review-item"><strong>'+esc(o.title||'')+'</strong>'+sub([DIR_LABEL[o.direction],KIND_LABEL[o.kind],o.due_date?dateLabel(o.due_date):o.trigger,o.recurrence&&o.recurrence!=='none'?cap(o.recurrence):'',o.amount!==null?money(o.amount,o.currency):''])+(o.source_quote?'<span class="ct-quote">“'+esc(o.source_quote)+'”'+(o.source_page?' (p. '+esc(o.source_page)+')':'')+'</span><span>'+quoteState(check(o.source_document_version_id||ver,o.source_quote,o.source_page))+'</span>':'<span>'+pill('No quote','amber')+'</span>')+
  '<label class="k-field"><span>Decision on '+esc(o.title||'this obligation')+'</span><select name="ob_'+esc(o.id)+'">'+[['verify','Verify'],['skip','Leave not checked'],['reject','Reject (archive)']].map(x=>'<option value="'+x[0]+'"'+(dec===x[0]?' selected':'')+'>'+x[1]+'</option>').join('')+'</select></label></div></li>';}).join('')+'</ul>';
 html+='<label class="k-field"><span>Verified by (your name) *</span><input name="verified_by" value="'+esc(p.draft.verified_by||'')+'" placeholder="Your name" autocomplete="name"></label>';
 return formPanel('Verify: '+String(a.name||''),'save:review',html,'Save verification',canWrite('terms')||canWrite('obligations'));}
function signPanel(p){const a=AG(p.id);if(!a)return '';const d=p.draft,inpf=(n,l,type,v)=>'<label class="k-field"><span>'+esc(l)+'</span><input type="'+type+'" name="'+n+'" value="'+esc(v||'')+'"'+(type==='number'?' min="0" step="any"':'')+'></label>';
 const ce=confidentialityEnd(validDate(d.expiry_date),validDate(d.effective_date),d.confidentiality_years);
 return formPanel('Mark signed: '+String(a.name||''),'save:sign','<p class="k-muted k-small">The agreement becomes active with these dates. Then add the signed original so its terms can be filled in and checked.</p><div class="ct-form">'+inpf('signed_on','Signed on *','date',d.signed_on)+inpf('effective_date','Effective date','date',d.effective_date)+inpf('expiry_date','Expiry date','date',d.expiry_date)+(a.agreement_type==='cda_nda'?inpf('confidentiality_years','Confidentiality (years)','number',d.confidentiality_years)+'<label class="k-field"><span>CDA direction</span><select name="cda_direction">'+CDA_DIR.map(x=>'<option value="'+x+'"'+(d.cda_direction===x?' selected':'')+'>'+esc(CDA_DIR_LABEL[x])+'</option>').join('')+'</select></label>':'')+'</div>'+(a.agreement_type==='cda_nda'?kv('Confidentiality end',ce?dateLabel(ce):'—'):''),'Save signature',writableField('agreements','status'));}
function attachPanel(p){const a=AG(p.agreementId);if(!a)return '';const d=DOCS();let chosen=d.list.find(x=>x.versionId===p.versionId);
 // A just-uploaded original may not be in a list read before the upload: read it once more.
 if(p.versionId&&!chosen&&d.state!=='pending'&&inp.saved){try{const r=tools.call('documents.list',{limit:199});if(r&&Array.isArray(r.documents)){const x=r.documents.find(y=>y.versionId===p.versionId);if(x){d.list.push(x);chosen=x;}}}catch(e){}}
 const body=d.state==='pending'?loadingNote('your documents'):d.state==='preview'?'<p class="k-muted">Documents are available in the saved app.</p>':d.state==='unavailable'?'<p class="k-muted">Documents are not available for you here.</p>':'<label class="k-field"><span>Saved original</span><select name="version_id" data-action="attach-pick"><option value="">Choose…</option>'+d.list.filter(x=>x.latest||x.versionId===p.versionId).map(x=>'<option value="'+esc(x.versionId)+'"'+(x.versionId===p.versionId?' selected':'')+'>'+esc(x.filename+' · v'+x.version+' · '+x.uploadedOn+(x.aiReadable?'':' · not AI-readable'))+'</option>').join('')+'</select></label>'+(chosen?kv('AI-readable',chosen.aiReadable?'Yes: your assistant can fill in its terms':'No: assistants cannot read it')+kv('Text extraction',cap(chosen.extraction)):'')+(d.state==='partial'?'<p class="k-muted k-small">Only the 200 newest versions are listed.</p>':'');
 return kit.panel({title:'Attach the signed original',close:'panel:close',body:'<p class="k-muted k-small">'+esc(String(a.name||''))+'</p>'+body+'<div class="k-row ct-panel-actions">'+btn('Cancel','panel:close')+uploadBtn(a.id,'Upload instead')+btn('Attach','save:attach',{primary:true,disabled:!chosen||!canWrite('terms')})+'</div>'});}
function renewalPanel(p){const a=AG(p.id);if(!a)return '';const t=termsOf(a.id),dts=storedOrComputed(t,a);
 return formPanel('Renewal decision: '+String(a.name||''),'save:renewal','<p class="k-muted k-small">'+(dts.notice?'Notice deadline '+esc(dateLabel(dts.notice))+' ('+esc(inDays(dts.notice))+'). ':'')+'Expiry '+esc(dateLabel(a.expiry_date))+'. The decision is added to the key-term notes; renegotiate also moves the agreement to In negotiation. Give any notice through your usual channel.</p><label class="k-field"><span>Decision *</span><select name="decision"><option value="">Choose…</option>'+DECISIONS.map(x=>'<option value="'+x+'"'+(p.draft.decision===x?' selected':'')+'>'+esc(cap(x))+'</option>').join('')+'</select></label><label class="k-field"><span>Note</span><textarea name="note" rows="4">'+esc(p.draft.note||'')+'</textarea></label>','Save decision',canWrite('terms'));}
function ddList(p){const c=conf(),types=p.types&&p.types.length?p.types:c.types,statuses=p.statuses&&p.statuses.length?p.statuses:['active'],min=num(p.draft&&p.draft.min,0)||0;
 const rows=AGS().filter(a=>types.includes(a.agreement_type)&&statuses.includes(a.status)&&(min<=0||(a.total_value!==null&&a.total_value>=min))).sort((a,b)=>(c.types.indexOf(a.agreement_type)-c.types.indexOf(b.agreement_type))||String(a.name||'').localeCompare(String(b.name||'')));
 const L=['# Key agreements'+(AS_OF?' (as of '+dateLabel(AS_OF)+')':''),''];
 if(!exactFor(['agreements','terms']))L.push('Note: the register was not read completely; this list may be incomplete.','');
 for(const a of rows){const t=termsOf(a.id),d=storedOrComputed(t,a);
  L.push('- **'+String(a.name||'')+'** — '+(TYPE_LABEL[a.agreement_type]||cap(a.agreement_type))+' with '+orgName(a.counterparty_id)+'; '+(STATUS_LABEL[a.status]||cap(a.status))+'; signed '+dateLabel(a.signed_on)+'; effective '+dateLabel(a.effective_date)+'; expires '+dateLabel(a.expiry_date)+(a.total_value!==null?'; value '+money(a.total_value,a.currency):'')+(t&&t.renewal&&t.renewal!=='none'?'; renewal '+t.renewal+(d.notice?', notice by '+dateLabel(d.notice):''):'')+(d.conf?'; confidential until '+dateLabel(d.conf):'')+(a.parent_id?'; under '+agName(a.parent_id):'')+(t&&t.governing_law?'; '+t.governing_law+' law':'')+(t&&t.extraction_status==='proposed'?' (terms not yet verified)':''));}
 if(!rows.length)L.push('No agreements match these filters.');
 return {rows,text:L.join('\n')};}
function ddPanel(p){const r=ddList(p),c=conf();
 return kit.panel({title:'Due-diligence list',close:'panel:close',body:'<form data-action="dd-filter"><fieldset class="ct-fieldset"><legend>Types (none = all offered)</legend>'+c.types.map(t=>'<label class="ct-check"><input type="checkbox" name="type_'+t+'" value="true"'+(p.types.includes(t)?' checked':'')+'> '+esc(TYPE_LABEL[t])+'</label>').join('')+'</fieldset><fieldset class="ct-fieldset"><legend>Statuses</legend>'+STATUSES.map(s=>'<label class="ct-check"><input type="checkbox" name="status_'+s+'" value="true"'+(p.statuses.includes(s)?' checked':'')+'> '+esc(STATUS_LABEL[s])+'</label>').join('')+'</fieldset><label class="k-field"><span>Minimum total value (any currency)</span><input type="number" min="0" step="any" name="min" value="'+esc(p.draft&&p.draft.min||'')+'"></label></form><p class="k-muted k-small">'+plural(r.rows.length,'agreement')+'. Copy this text (Markdown) into a data room index or questionnaire.</p><label class="k-field"><span>Due-diligence list</span><textarea class="ct-mono" readonly rows="14">'+esc(r.text)+'</textarea></label>'});}
function panelHtml(){const p=st.panel;if(!p)return '';
 if(p.kind==='editor'){const refs=S[p.role].filter(f=>f.kind==='ref').map(f=>f.ref).concat(S[p.role].some(f=>f.kind==='person')?['people']:[]);if(waiting(refs.concat(['settings'])))return kit.panel({title:'Loading',close:'panel:close',body:loadingNote('the form')});return editorPanel(p);}
 if(p.kind==='detail')return detailPanel(p);
 const need=ROLES_FOR_PANEL[p.kind]||[];if(waiting(need.concat(['settings'])))return kit.panel({title:'Loading',close:'panel:close',body:loadingNote('the panel')});
 return p.kind==='terms'?termsPanel(p):p.kind==='review'?reviewPanel(p):p.kind==='sign'?signPanel(p):p.kind==='attach'?attachPanel(p):p.kind==='renewal'?renewalPanel(p):p.kind==='dd'?ddPanel(p):'';}

/* ---------- page ---------- */
const SCREEN_FN={overview,agreements:agreementsScreen,families:familiesScreen,obligations:obligationsScreen,cdas:cdasScreen,pipeline:pipelineScreen,counterparties:counterpartiesScreen,milestones:milestonesScreen,settings:settingsScreen};
let body='';try{body=SCREEN_FN[st.screen]();}catch(e){body=kit.empty({title:'This screen could not be shown',text:String(e&&e.message||e).slice(0,300),action:{label:'Back to Overview',action:'nav:overview'}});}
let panel='';try{panel=panelHtml();}catch(e){st.panel=null;say('error','This panel could not be shown: '+String(e&&e.message||e).slice(0,200));}
const asOf=AS_OF_SOURCE==='today'||AS_OF_SOURCE==='pinned'?'':'<label class="k-field ct-asof"><span>As-of date (today’s date is not available here)</span><input type="date" name="as_of" data-action="as-of" value="'+esc(AS_OF)+'"></label>';
const undo=st.undo?'<div class="k-row ct-undo">'+kit.undo([st.undo])+'</div>':'';
const viewport=inp.viewport&&typeof inp.viewport==='object'?inp.viewport.width:'';
const nav=kit.nav(shown,st.screen,{label:'Contracts screens'});
// The screen behind an open panel is inert for pointer, keyboard and assistive technology (the panel is modal).
const screen=kit.layout(nav,asOf+undo+body,{side:viewport!=='phone'&&viewport!=='panel'});
const html=kit.page((panel?'<div class="ct-behind" inert>'+screen+'</div>':screen)+panel);
const css=typeof CONTRACTS_CSS==='string'?CONTRACTS_CSS:'';
if(st.panel&&st.panel.fresh)st.panel.fresh=false;
return {html,css,state:st,context:{screen:st.screen},...(notice?{notice}:{})};
