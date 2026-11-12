const templateLayoutSchema={"screens":[{"id":"overview","label":"Overview"},{"id":"register","label":"Register"},{"id":"families","label":"Families"},{"id":"obligations","label":"Obligations"},{"id":"cdas","label":"CDAs"},{"id":"pipeline","label":"Pipeline"},{"id":"settings","label":"Settings"}],"groups":{"agreements":[{"id":"name","label":"Agreement"},{"id":"agreement_type","label":"Type"},{"id":"counterparty_id","label":"Counterparty"},{"id":"program_id","label":"Program"},{"id":"status","label":"Status"},{"id":"effective_date","label":"Effective"},{"id":"expiry_date","label":"Expiry"},{"id":"total_value","label":"Value"}],"obligations":[{"id":"title","label":"Obligation"},{"id":"agreement_id","label":"Agreement"},{"id":"direction","label":"Direction"},{"id":"kind","label":"Kind"},{"id":"due","label":"Next due"},{"id":"amount","label":"Amount"},{"id":"owner","label":"Owner"},{"id":"status","label":"Status"},{"id":"verified","label":"Verified"}]}};
/* TrialAgents Contracts 1.0.0 (life.contracts) | frontend-js function body. No DOM, network or browser storage.
 * Returns {html,css,state}. Data comes only from authorized bindings; every write is an exact records.propose reviewed by TrialAgents.
 * Signed originals are TrialAgents documents (documents.list/search/quote, upload through the platform review). Extraction is done by
 * the user's connected assistant (Claude or ChatGPT) as unverified proposals; only a person verifies them, here in the app.
 * The as-of date is today's date from the app runtime (a pinned asOfOverride only in previews and tests).
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
const ym=v=>{const t=String(v||'');if(/^\d{4}-(0[1-9]|1[0-2])$/.test(t))return t;const d=validDate(t);return d?d.slice(0,7):'';};
const addMonths=(m,n)=>addMonthsDate(m+'-01',n).slice(0,7);
const monthLabel=m=>m?MONTHS[Number(m.slice(5,7))-1]+' '+m.slice(0,4):'—';
const dateLabel=d=>d?Number(d.slice(8,10))+' '+MONTHS[Number(d.slice(5,7))-1]+' '+d.slice(0,4):'—';
const plural=(n,w)=>n+' '+w+(Math.abs(n)===1?'':'s');
const label=v=>String(v===null||v===undefined||v===''?'—':v).replace(/_/g,' ');
const cap=s=>{s=label(s);return s.charAt(0).toUpperCase()+s.slice(1);};
const parseJSON=v=>{try{const x=JSON.parse(String(v||''));return x&&typeof x==='object'?x:null;}catch(e){return null;}};
const norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();

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

/* ---------- logical schema (real keys come from tableMap) ---------- */
const ref=role=>({kind:'ref',ref:role});
const S={
 agreements:[{key:'name',label:'Name',kind:'text',required:true},{key:'agreement_type',label:'Type',kind:'select',options:TYPES,required:true},{key:'counterparty_id',label:'Counterparty',...ref('organizations')},{key:'status',label:'Status',kind:'select',options:STATUSES,required:true},{key:'parent_id',label:'Parent agreement',...ref('agreements')},{key:'program_id',label:'Program',...ref('programs')},{key:'study_id',label:'Study',...ref('studies')},{key:'effective_date',label:'Effective date',kind:'date'},{key:'expiry_date',label:'Expiry date',kind:'date'},{key:'signed_on',label:'Signed on',kind:'date'},{key:'total_value',label:'Total value',kind:'number'},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES},{key:'owner',label:'Owner',kind:'person'},{key:'archived',label:'Archived',kind:'boolean'}],
 organizations:[{key:'name',label:'Name',kind:'text',required:true},{key:'org_type',label:'Type',kind:'select',options:['company','investor','cro','cdmo','site','funder','partner','agency','other']},{key:'country',label:'Country',kind:'text'},{key:'website',label:'Website',kind:'text'},{key:'archived',label:'Archived',kind:'boolean'}],
 people:[{key:'name',label:'Name',kind:'text',required:true},{key:'organization_id',label:'Organization',...ref('organizations')},{key:'title',label:'Title',kind:'text'},{key:'email',label:'Email',kind:'text'},{key:'archived',label:'Archived',kind:'boolean'}],
 programs:[{key:'name',label:'Name',kind:'text',required:true},{key:'code',label:'Code',kind:'text'},{key:'stage',label:'Stage',kind:'frozen'},{key:'archived',label:'Archived',kind:'boolean'}],
 studies:[{key:'name',label:'Name',kind:'text',required:true},{key:'program_id',label:'Program',kind:'frozen'},{key:'archived',label:'Archived',kind:'boolean'}],
 milestones:[{key:'name',label:'Milestone',kind:'text',required:true},{key:'program_id',label:'Program',...ref('programs'),required:true},{key:'item_type',label:'Item type',kind:'select',options:['milestone','activity'],required:true},{key:'end_date',label:'Date',kind:'date',required:true},{key:'status',label:'Status',kind:'select',options:['planned','in_progress','done','at_risk','cancelled'],required:true},{key:'is_key',label:'Key milestone',kind:'boolean'}],
 settings:[{key:'default_currency',label:'Default currency',kind:'select',options:CURRENCIES},{key:'reminder_days',label:'Reminder windows (days, comma list)',kind:'text'},{key:'digest_day',label:'Digest day (1 = Monday … 7 = Sunday)',kind:'number'},{key:'agreement_types',label:'Agreement types (comma list, in order)',kind:'text'},{key:'obligation_kinds',label:'Obligation kinds (comma list, in order)',kind:'text'}],
 terms:[{key:'agreement_id',label:'Agreement',kind:'frozen'},{key:'renewal',label:'Renewal',kind:'select',options:RENEWAL},{key:'renewal_term_months',label:'Renewal term (months)',kind:'number'},{key:'notice_days',label:'Notice period (days)',kind:'number'},{key:'notice_deadline',label:'Notice deadline',kind:'computed'},{key:'confidentiality_years',label:'Confidentiality (years)',kind:'number'},{key:'confidentiality_end',label:'Confidentiality end',kind:'computed'},{key:'cda_direction',label:'CDA direction',kind:'select',options:CDA_DIR},{key:'purpose',label:'Purpose',kind:'text'},{key:'governing_law',label:'Governing law',kind:'text'},{key:'document_id',label:'Signed original',kind:'frozen'},{key:'document_version_id',label:'Signed original version',kind:'frozen'},{key:'document_link',label:'External link (URL)',kind:'text'},{key:'extraction_status',label:'Extraction',kind:'frozen'},{key:'source_quotes',label:'Source quotes',kind:'frozen'},{key:'verified_by',label:'Verified by',kind:'frozen'},{key:'verified_on',label:'Verified on',kind:'frozen'},{key:'status_since',label:'Status since',kind:'frozen'},{key:'notes',label:'Notes',kind:'longtext'}],
 obligations:[{key:'agreement_id',label:'Agreement',...ref('agreements'),required:true},{key:'title',label:'Title',kind:'text',required:true},{key:'kind',label:'Kind',kind:'select',options:KINDS,required:true},{key:'direction',label:'Direction',kind:'select',options:DIRECTIONS,required:true},{key:'due_date',label:'Due date (first or only)',kind:'date'},{key:'recurrence',label:'Recurrence',kind:'select',options:RECURRENCE},{key:'trigger',label:'Trigger (when there is no date)',kind:'text'},{key:'milestone_id',label:'Milestone',...ref('milestones')},{key:'amount',label:'Amount',kind:'number'},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES},{key:'owner',label:'Owner',kind:'person'},{key:'status',label:'Status',kind:'select',options:OB_STATUS,required:true},{key:'verified',label:'Verified',kind:'frozen'},{key:'source_quote',label:'Source quote',kind:'longtext'},{key:'source_page',label:'Source page',kind:'number'},{key:'source_document_version_id',label:'Source document version',kind:'frozen'},{key:'archived',label:'Archived',kind:'boolean'}]
};
const ROLE_LABEL={agreements:'agreement',organizations:'organization',people:'contact',programs:'program',studies:'study',milestones:'milestone',settings:'settings',terms:'key terms',obligations:'obligation'};
/* Stable role keys (modular apps rule 5): core contract v1 for shared tables, contracts.* for this app; programs.plan_items is an
 * integration: Programs' plan items (read only) once linked inside the app, otherwise this app's own milestone entries. */
const ROLE_KEY={agreements:'agreements',organizations:'organizations',people:'people',programs:'programs',studies:'studies',milestones:'programs.plan_items',settings:'contracts.settings',terms:'contracts.terms',obligations:'contracts.obligations'};

/* ---------- bindings and bounded reads ---------- */
let mapping={};try{mapping=JSON.parse(cfg.tableMap||'{}');}catch(e){mapping={};}
const roleMap={};
for(const role of Object.keys(S)){
 const m=mapping[ROLE_KEY[role]],b=m&&bindings.find(x=>x.typeId===m.typeId);
 if(!m||!b)continue;
 const fields={};for(const f of S[role]){const k=m.fields&&m.fields[f.key]!==undefined?m.fields[f.key]:f.key;if(typeof k==='string'&&(b.fields||[]).includes(k))fields[f.key]=k;}
 roleMap[role]={typeId:m.typeId,fields,writable:(Array.isArray(m.writableFields)?m.writableFields:[]).filter(x=>fields[x])};
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
const DESC={overview:'What needs attention: deadlines, obligations, unverified extractions and agreements in flight.',register:'Every agreement with its counterparty, program, status, dates and value. Search, filter, add or upload.',families:'Master agreements with their SOWs, change orders, sublicences and amendments, and the value of each family.',obligations:'What we owe and what we are owed: payments, reports, diligence milestones and notices.',cdas:'Confidentiality agreements by organization: have we signed one, in which direction, and until when is it binding?',pipeline:'Agreements before signature: drafting, in negotiation and out for signature.',settings:'Agreement types, obligation kinds, reminder windows, digest day, currency, milestones and counterparties.'};
const st=JSON.parse(JSON.stringify(inp.state||{}));
{
 let profile={};try{profile=JSON.parse(cfg.layoutProfile||'{}');}catch(e){profile={};}
 const groups=templateLayoutSchema.groups;
 const tabs=Array.isArray(profile.tabs)?profile.tabs.filter(id=>SCREENS.some(s=>s.id===id)):[];
 const cols={};for(const g of Object.keys(groups)){const ids=groups[g].map(x=>x.id),saved=profile.cols&&Array.isArray(profile.cols[g])?profile.cols[g].filter(k=>ids.includes(k)):[];cols[g]=[...new Set(saved.concat(ids))];}
 // Saved configuration always wins over any stale layout carried in UI state.
 st.layout={tabs:[...new Set(tabs.concat(SCREENS.map(s=>s.id)))],cols,visible:profile.visible&&typeof profile.visible==='object'?profile.visible:{},heading:String(profile.heading||cfg.heading||'Contracts').slice(0,100)};
}
st.section=String(st.section||'overview');st.page=Math.max(0,Number(st.page)||0);st.query=String(st.query||'').slice(0,100);
st.filters=st.filters&&typeof st.filters==='object'?st.filters:{};
st.pending=Array.isArray(st.pending)?st.pending.slice(0,5):[];
st.cdaQuery=String(st.cdaQuery||'').slice(0,100);
const note=v=>{st.notice=String(v||'').slice(0,500);};
const sections=st.layout.tabs.map(id=>SCREENS.find(s=>s.id===id)).filter(s=>s&&st.layout.visible[s.id]!==false);
if(!sections.some(s=>s.id===st.section))st.section=(sections[0]||SCREENS[0]).id;

/* ---------- data ---------- */
const R={};for(const role of ['agreements','terms','obligations','organizations','settings','milestones','programs','studies','people'])R[role]=readRole(role);
const CORE=['agreements','terms','obligations','organizations'];
const readProblems=[];
for(const role of CORE.concat(['settings'])){const r=R[role],n=cap(ROLE_LABEL[role]);
 if(r.unbound)readProblems.push(n+' table is not connected to this app.');
 else if(r.unavailable)readProblems.push('You cannot read the '+ROLE_LABEL[role]+' table.');
 else if(!r.complete)readProblems.push(n+': partial read ('+r.allRows.length+' of '+(r.total>r.allRows.length?r.total:'more than '+r.allRows.length)+' rows).');
 if(r.invalid)readProblems.push(n+': '+plural(r.invalid,'value')+' with an invalid (non-scalar) shape ignored.');}
const exact=readProblems.length===0;
const settingsRow=R.settings.rows[0]||null;const SET=settingsRow?settingsRow.data:{};
const listSetting=(v,allowed)=>{const l=String(v||'').split(',').map(x=>x.trim().toLowerCase()).filter(x=>allowed.includes(x));return l.length?[...new Set(l)]:allowed.slice();};
const TYPE_ORDER=listSetting(SET.agreement_types,TYPES),KIND_ORDER=listSetting(SET.obligation_kinds,KINDS);
const REMIND=(()=>{const l=String(SET.reminder_days||'30,60,90').split(',').map(x=>Math.round(Number(x))).filter(n=>Number.isFinite(n)&&n>=1&&n<=365);return l.length?[...new Set(l)].sort((a,b)=>a-b).slice(0,6):[30,60,90];})();
const WINDOW=REMIND[REMIND.length-1];
const DIGEST_DAY=Math.min(7,Math.max(1,Math.round(num(SET.digest_day,1)||1)));
const CURRENCY=CURRENCIES.includes(SET.default_currency)?SET.default_currency:'EUR';
const WEEKDAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const CLOCK=(()=>{try{return validDate(new Date().toISOString());}catch(e){return '';}})();
const AS_OF_SOURCE=validDate(cfg.asOfOverride)?'pinned':CLOCK?'today':validDate(st.asOf)?'control':'none';
const AS_OF=AS_OF_SOURCE==='pinned'?validDate(cfg.asOfOverride):AS_OF_SOURCE==='today'?CLOCK:AS_OF_SOURCE==='control'?validDate(st.asOf):'';

const orgRow=id=>R.organizations.allRows.find(r=>r.id===id)||null;
function orgName(id){if(!id)return 'No counterparty';if(R.organizations.unbound)return 'Organizations not connected';if(R.organizations.unavailable)return 'Organization unavailable';const o=orgRow(id);if(!o)return 'Organization unavailable';return String(o.data.name||'Unnamed')+(bool(o.data.archived)?' (archived)':'');}
const ORGS=R.organizations.rows.slice().sort((a,b)=>String(a.data.name||'').localeCompare(String(b.data.name||'')));
function refName(role,id){if(!id)return '—';const r=R[role];if(r.unbound)return cap(ROLE_LABEL[role])+' not connected';const x=r.allRows.find(y=>y.id===id);if(!x)return cap(ROLE_LABEL[role])+' unavailable';return String(x.data.name||x.data.title||'Unnamed')+(bool(x.data.archived)?' (archived)':'');}
const progName=id=>id?refName('programs',id):'—';

/* Key terms: one record per agreement (the earliest when several exist). */
const TERMS={};for(const r of R.terms.rows.slice().sort((a,b)=>a.id.localeCompare(b.id))){const k=String(r.data.agreement_id||'');if(k&&!TERMS[k])TERMS[k]={id:r.id,version:r.version,...r.data};}
const AGS=R.agreements.rows.map(r=>({id:r.id,version:r.version,...r.data,effective_date:validDate(r.data.effective_date),expiry_date:validDate(r.data.expiry_date),signed_on:validDate(r.data.signed_on),total_value:num(r.data.total_value),currency:CURRENCIES.includes(r.data.currency)?r.data.currency:''}));
const AG=Object.fromEntries(AGS.map(a=>[a.id,a]));
const agRow=id=>R.agreements.allRows.find(r=>r.id===id)||null;
function agName(id){if(!id)return '—';const r=agRow(id);if(!r)return 'Agreement unavailable';return String(r.data.name||'Unnamed agreement')+(bool(r.data.archived)?' (archived)':'');}
const termsOf=id=>TERMS[id]||null;

/* ---------- calculations ---------- */
// Notice deadline = expiry_date − notice_days, when renewal is automatic or an option. Stored on save.
function noticeDeadline(expiry,noticeDays,renewal){const e=validDate(expiry),n=num(noticeDays);return e&&n!==null&&n>=0&&['automatic','option'].includes(renewal)?addDays(e,-n):'';}
// Confidentiality end = expiry_date (or the effective date when there is no expiry) + confidentiality_years (× 12 calendar months). Stored on save.
function confidentialityEnd(expiry,effective,years){const base=validDate(expiry)||validDate(effective),y=num(years);return base&&y!==null&&y>0?addMonthsDate(base,Math.round(y*12)):'';}
const storedOrComputed=(t,a)=>({notice:validDate(t&&t.notice_deadline)||noticeDeadline(a.expiry_date,t&&t.notice_days,t&&t.renewal),conf:validDate(t&&t.confidentiality_end)||confidentialityEnd(a.expiry_date,a.effective_date,t&&t.confidentiality_years)});
const inWindow=(d,days)=>!!d&&!!AS_OF&&d>=AS_OF&&d<=addDays(AS_OF,days===undefined?WINDOW:days);
const bucket=d=>{if(!d||!AS_OF)return null;const n=diffDays(AS_OF,d);for(const w of REMIND)if(n<=w)return w;return null;};
const isActive=a=>a.status==='active';

// Families: masters are agreements without a (readable) parent; children are listed under their parent, recursively.
const CHILDREN={};for(const a of AGS)if(a.parent_id&&AG[a.parent_id]&&a.parent_id!==a.id)(CHILDREN[a.parent_id]=CHILDREN[a.parent_id]||[]).push(a.id);
function rootOf(id){const seen=new Set();let cur=AG[id];while(cur&&cur.parent_id&&AG[cur.parent_id]&&!seen.has(cur.id)){seen.add(cur.id);cur=AG[cur.parent_id];}return cur?cur.id:id;}
function familyMembers(rootId){const out=[],seen=new Set(),walk=(id,depth)=>{if(seen.has(id)||!AG[id])return;seen.add(id);out.push({a:AG[id],depth});for(const c of (CHILDREN[id]||[]).slice().sort((x,y)=>String(AG[x].name||'').localeCompare(String(AG[y].name||''))))walk(c,depth+1);};walk(rootId,0);return out;}
// Family value = master total_value + Σ children, per currency; members in another currency are listed separately, never converted.
function familyValue(rootId){const ms=familyMembers(rootId),master=AG[rootId];
 const primary=master.currency||((ms.find(m=>m.a.currency)||{}).a||{}).currency||CURRENCY;const by={},co={},missing=[];
 for(const m of ms){const a=m.a;if(['terminated','superseded'].includes(a.status)&&m.depth>0)continue;if(a.total_value===null){if(m.depth>0||a.agreement_type!=='msa')missing.push(a.id);continue;}const c=a.currency||primary;by[c]=(by[c]||0)+a.total_value;if(a.agreement_type==='change_order')co[c]=(co[c]||0)+a.total_value;}
 const total=by[primary]||0;return {primary,total,by,co,share:total>0?(co[primary]||0)/total:null,others:Object.keys(by).filter(c=>c!==primary).sort(),missing,members:ms};}
function familyDates(ms){const act=ms.filter(m=>isActive(m.a));const exp=act.map(m=>m.a.expiry_date).filter(Boolean).sort()[0]||'';
 const notices=act.map(m=>storedOrComputed(termsOf(m.a.id),m.a).notice).filter(d=>d&&(!AS_OF||d>=AS_OF)).sort();return {earliestExpiry:exp,nextNotice:notices[0]||''};}
const ROOTS=[...new Set(AGS.map(a=>rootOf(a.id)))].filter(id=>AG[id]);
const FAMILIES=ROOTS.filter(id=>(CHILDREN[id]||[]).length).sort((a,b)=>String(AG[a].name||'').localeCompare(String(AG[b].name||'')));

/* Obligations. Next due of a recurring obligation = the first occurrence on or after the as-of date. */
const OBS=R.obligations.rows.map(r=>({id:r.id,version:r.version,...r.data,due_date:validDate(r.data.due_date),amount:num(r.data.amount),currency:CURRENCIES.includes(r.data.currency)?r.data.currency:'',verified:bool(r.data.verified),source_page:num(r.data.source_page)}));
function nextDue(o){if(!o.due_date)return '';const step=STEP[o.recurrence];if(!step||!AS_OF||o.due_date>=AS_OF)return o.due_date;
 const months=(Number(AS_OF.slice(0,4))-Number(o.due_date.slice(0,4)))*12+Number(AS_OF.slice(5,7))-Number(o.due_date.slice(5,7));let k=Math.max(0,Math.floor(months/step));let d=addMonthsDate(o.due_date,k*step);while(d<AS_OF){k++;d=addMonthsDate(o.due_date,k*step);}return d;}
function occurrences(o,from,to){const out=[];if(!o.due_date)return out;const step=STEP[o.recurrence];if(!step){if(o.due_date>=from&&o.due_date<=to)out.push(o.due_date);return out;}
 for(let k=0;k<400;k++){const d=addMonthsDate(o.due_date,k*step);if(d>to)break;if(d>=from)out.push(d);}return out;}
const overdueOb=o=>o.status==='open'&&!STEP[o.recurrence]&&!!o.due_date&&!!AS_OF&&o.due_date<AS_OF;
const UNVERIFIED_OBS=OBS.filter(o=>!o.verified);
const PROPOSED_TERMS=Object.values(TERMS).filter(t=>t.extraction_status==='proposed'&&AG[t.agreement_id]);

/* Milestones: Contracts' own entries, or Programs' plan items once linked (read only). */
const MS=R.milestones.rows.map(r=>({id:r.id,...r.data,end_date:validDate(r.data.end_date)}));
const msName=id=>{if(!id)return '—';const r=R.milestones.allRows.find(x=>x.id===id);return r?String(r.data.name||'Milestone')+(r.data.end_date?' ('+dateLabel(validDate(r.data.end_date))+')':''):'Milestone unavailable';};
// Expires before milestone: an active agreement linked to a program whose key milestone ends after the agreement's expiry.
function expiresBefore(a){if(!isActive(a)||!a.program_id||!a.expiry_date)return [];return MS.filter(m=>m.program_id===a.program_id&&m.item_type==='milestone'&&bool(m.is_key)&&!['done','cancelled'].includes(m.status)&&m.end_date&&m.end_date>a.expiry_date).sort((x,y)=>x.end_date.localeCompare(y.end_date));}
const EXPIRES_BEFORE=AGS.map(a=>({a,ms:expiresBefore(a)})).filter(x=>x.ms.length);

/* In-app integration (modular apps §7): Programs can provide milestones. */
let INTEG=null;if(inp.saved){try{callsLeft--;const r=tools.call('integrations.list',{});INTEG=(r&&Array.isArray(r.integrations)?r.integrations:[]).find(x=>x.role==='programs.plan_items')||null;}catch(e){INTEG=null;}}
const MS_LINKED=!!(INTEG&&INTEG.source==='linked')||(!!roleMap.milestones&&!roleMap.milestones.writable.length);
function integrationHint(){if(!INTEG||!INTEG.offer)return '';
 return '<span class="ct-integration">'+(INTEG.offer==='install'?'Works with Programs. ':'Programs is in your workspace. ')+'<button type="button" class="ct-linkbtn" data-trialy-integration="'+esc(INTEG.offer)+' programs.plan_items">'+(INTEG.offer==='install'?'Add Programs':'Use its milestones')+'</button></span>';}

/* Platform documents: the signed-in user's own document permissions; saved apps only. */
let DOCS=null;
function docs(){if(DOCS)return DOCS;if(!inp.saved)return DOCS={state:'preview',list:[]};
 try{callsLeft--;const r=tools.call('documents.list',{limit:200});if(!r||r.unavailable)return DOCS={state:'unavailable',list:[],message:r&&r.message};return DOCS={state:r.complete===false?'partial':'ok',list:Array.isArray(r.documents)?r.documents:[]};}catch(e){return DOCS={state:'unavailable',list:[]};}}
const docOf=t=>{if(!t||!t.document_version_id)return null;const d=docs();return d.list.find(x=>x.versionId===t.document_version_id)||{missing:true,versionId:t.document_version_id,state:d.state};};

/* ---------- writes ---------- */
function toReal(role,data){const m=roleMap[role];if(!m)throw Error('The '+ROLE_LABEL[role]+' table is not connected.');const out={};for(const [k,v] of Object.entries(data)){if(v===undefined)continue;if(!m.fields[k])continue;if(!m.writable.includes(k))throw Error('You cannot edit '+k.replace(/_/g,' ')+' in the '+ROLE_LABEL[role]+' table.');out[m.fields[k]]=v;}return out;}
function valuesFromForm(role,source,mode){
 const out={};const m=roleMap[role];
 for(const f of S[role]){
  if(['frozen','computed'].includes(f.kind)||f.key==='archived')continue;
  if(!m||!m.fields[f.key]||!m.writable.includes(f.key))continue;
  if(!has(source,f.key)){if(mode==='create'&&f.required)throw Error('Required field: '+f.label+'.');continue;}
  let v=source[f.key];if(typeof v==='string')v=v.trim();
  if(v===''||v===null){if(f.required)throw Error('Required field: '+f.label+'.');out[f.key]=null;continue;}
  if(f.kind==='number'){const n=Number(v);if(!Number.isFinite(n))throw Error('Enter a number for '+f.label+'.');if(n<0)throw Error(f.label+' cannot be negative.');out[f.key]=n;}
  else if(f.kind==='date'){const d=validDate(v);if(!d)throw Error('Use a valid date for '+f.label+' (YYYY-MM-DD).');out[f.key]=d;}
  else if(f.kind==='select'){if(!f.options.includes(String(v)))throw Error('Choose a valid '+f.label.toLowerCase()+'.');out[f.key]=String(v);}
  else if(f.kind==='boolean')out[f.key]=bool(v);
  else if(f.kind==='ref'){const kept=st.editor&&st.editor.refs&&st.editor.refs[f.key]===String(v);if(!kept&&!R[f.ref].rows.some(r=>r.id===v))throw Error('Choose an existing '+f.label.toLowerCase()+'.');out[f.key]=String(v);}
  else out[f.key]=String(v).slice(0,f.kind==='longtext'?4000:300);
 }
 if(role==='agreements'){const e=has(out,'effective_date')?out.effective_date:source.effective_date,x=has(out,'expiry_date')?out.expiry_date:source.expiry_date;if(validDate(e)&&validDate(x)&&validDate(x)<validDate(e))throw Error('The expiry date is before the effective date.');
  if(out.total_value!==undefined&&out.total_value!==null&&!out.currency&&!source.currency)throw Error('Choose the currency of the total value.');}
 if(role==='obligations'){if(out.amount!==undefined&&out.amount!==null&&!out.currency&&!source.currency)throw Error('Choose the currency of the amount.');
  if(out.recurrence&&out.recurrence!=='none'&&!validDate(has(out,'due_date')?out.due_date:source.due_date))throw Error('A recurring obligation needs its first due date.');}
 if(role==='settings'){for(const [k,allowed] of [['agreement_types',TYPES],['obligation_kinds',KINDS]]){if(out[k]){const bad=String(out[k]).split(',').map(x=>x.trim().toLowerCase()).filter(x=>x&&!allowed.includes(x));if(bad.length)throw Error('Unknown '+k.replace('_',' ')+': '+bad.join(', ')+'. Use: '+allowed.join(', ')+'.');}}
  if(out.reminder_days){const l=String(out.reminder_days).split(',').map(x=>x.trim()).filter(Boolean);if(!l.length||l.some(x=>!/^\d+$/.test(x)||Number(x)<1||Number(x)>365))throw Error('Reminder windows are whole numbers of days from 1 to 365, separated by commas.');}
  if(out.digest_day!==undefined&&out.digest_day!==null&&!(Number.isInteger(out.digest_day)&&out.digest_day>=1&&out.digest_day<=7))throw Error('The digest day is a whole number from 1 (Monday) to 7 (Sunday).');}
 if(mode==='create'&&m&&m.fields.archived&&m.writable.includes('archived'))out.archived=false;
 return out;}
function propose(changes,message){if(!changes.length)throw Error('There is nothing to save.');if(changes.length>50)throw Error('This change needs '+changes.length+' record writes; one review holds 50. Save it in smaller parts.');tools.call('records.propose',changes);note(message||'Prepared for TrialAgents review. Nothing changes until you approve it.');}
const lookup=(role,id)=>(R[role].allRows||[]).find(r=>r.id===id)||null;
/* Key terms with the stored dates recomputed: the computed fields are written in the same review as the terms or the agreement dates. */
function termsData(t,a,extra){const merged={...(t||{}),...(extra||{})};const out={...(extra||{})};
 const nd=noticeDeadline(a.expiry_date,merged.notice_days,merged.renewal)||null,ce=confidentialityEnd(a.expiry_date,a.effective_date,merged.confidentiality_years)||null;
 if(roleMap.terms&&roleMap.terms.fields.notice_deadline&&(validDate(t&&t.notice_deadline)||null)!==nd)out.notice_deadline=nd;
 if(roleMap.terms&&roleMap.terms.fields.confidentiality_end&&(validDate(t&&t.confidentiality_end)||null)!==ce)out.confidentiality_end=ce;
 return out;}
function termsChange(a,extra,versions){const t=termsOf(a.id),data=termsData(t,a,extra);if(!Object.keys(data).length)return null;if(!canWrite('terms'))throw Error('You cannot change key terms.');
 if(t)return {kind:'update_record',recordId:t.id,expectedVersion:versions&&has(versions,t.id)?versions[t.id]:t.version,data:toReal('terms',data)};
 return {kind:'create_record',typeId:roleMap.terms.typeId,data:toReal('terms',{agreement_id:a.id,extraction_status:'none',...data})};}
function openEditor(role,mode,id,preset){
 st.menu=null;st.confirm=null;st.detail=null;let draft={...(preset||{})},version=null;
 if(mode!=='create'){const r=lookup(role,id);if(!r)throw Error('That record is no longer available.');draft={...r.data};version=r.version;if(mode==='duplicate'){if(draft.name!==undefined)draft.name='Copy of '+String(draft.name||'');if(draft.title!==undefined)draft.title='Copy of '+String(draft.title||'');if(role==='obligations')draft.verified=false;}}
 for(const f of S[role])if(f.kind==='frozen'||f.kind==='computed')delete draft[f.key];
 if(role==='obligations'&&mode!=='edit')delete draft.source_document_version_id;
 const refs={};for(const f of S[role])if(f.kind==='ref'&&draft[f.key])refs[f.key]=String(draft[f.key]);
 // The version is captured now: a record edited meanwhile is rejected by the server, never overwritten.
 st.editor={role,mode,id:mode==='edit'?id:null,version:mode==='edit'?version:null,draft,initial:JSON.stringify(draft),refs,termsVersion:role==='agreements'&&mode==='edit'&&termsOf(id)?termsOf(id).version:null};
}
function openTermsEditor(agId){const a=AG[agId];if(!a)throw Error('That agreement is no longer available.');const t=termsOf(agId);
 st.menu=null;st.confirm=null;st.detail=null;const draft={};for(const f of S.terms)if(!['frozen','computed'].includes(f.kind)&&t&&t[f.key]!==undefined&&t[f.key]!==null)draft[f.key]=t[f.key];
 if(!t&&a.agreement_type==='cda_nda'){draft.cda_direction='mutual';}
 st.terms={agreementId:agId,id:t?t.id:null,version:t?t.version:null,draft,initial:JSON.stringify(draft)};}
function termsValues(source){const out={};const m=roleMap.terms;for(const f of S.terms){if(['frozen','computed'].includes(f.kind))continue;if(!m||!m.fields[f.key]||!m.writable.includes(f.key)||!has(source,f.key))continue;let v=source[f.key];if(typeof v==='string')v=v.trim();
 if(v===''||v===null){out[f.key]=null;continue;}
 if(f.kind==='number'){const n=Number(v);if(!Number.isFinite(n)||n<0)throw Error('Enter a positive number for '+f.label+'.');out[f.key]=n;}
 else if(f.kind==='select'){if(!f.options.includes(String(v)))throw Error('Choose a valid '+f.label.toLowerCase()+'.');out[f.key]=String(v);}
 else if(f.key==='document_link'){if(!/^https?:\/\/\S+$/i.test(String(v)))throw Error('The external link must start with https:// or http://.');out[f.key]=String(v).slice(0,1000);}
 else out[f.key]=String(v).slice(0,f.kind==='longtext'?4000:300);}
 if(out.renewal&&out.renewal!=='none'&&(out.notice_days===null||out.notice_days===undefined)&&!(source.notice_days>=0))throw Error('A renewing agreement needs its notice period in days.');
 return out;}
function ddList(f){const types=f.types&&f.types.length?f.types:TYPE_ORDER,statuses=f.statuses&&f.statuses.length?f.statuses:['active'],min=num(f.min,0)||0;
 const rows=AGS.filter(a=>types.includes(a.agreement_type)&&statuses.includes(a.status)&&(min<=0||(a.total_value!==null&&a.total_value>=min))).sort((a,b)=>(TYPE_ORDER.indexOf(a.agreement_type)-TYPE_ORDER.indexOf(b.agreement_type))||String(a.name||'').localeCompare(String(b.name||'')));
 const L=['# Key agreements'+(AS_OF?' (as of '+dateLabel(AS_OF)+')':''),''];
 if(!exact)L.push('Note: the register was not read completely; this list may be incomplete.','');
 for(const a of rows){const t=termsOf(a.id),d=storedOrComputed(t,a);
  L.push('- **'+String(a.name||'')+'** — '+(TYPE_LABEL[a.agreement_type]||cap(a.agreement_type))+' with '+orgName(a.counterparty_id)+'; '+(STATUS_LABEL[a.status]||cap(a.status))+'; signed '+dateLabel(a.signed_on)+'; effective '+dateLabel(a.effective_date)+'; expires '+dateLabel(a.expiry_date)+(a.total_value!==null?'; value '+money(a.total_value,a.currency):'')+(t&&t.renewal&&t.renewal!=='none'?'; renewal '+t.renewal+(d.notice?', notice by '+dateLabel(d.notice):''):'')+(d.conf?'; confidential until '+dateLabel(d.conf):'')+(a.parent_id?'; under '+agName(a.parent_id):'')+(t&&t.governing_law?'; '+t.governing_law+' law':'')+(t&&t.extraction_status==='proposed'?' (terms not yet verified)':''));}
 if(!rows.length)L.push('No agreements match these filters.');
 return {rows,text:L.join('\n')};}
const money=(v,cur)=>(cur?cur+' ':'')+grouped(v);
const short=(v,cur)=>(cur?cur+' ':'')+(Math.abs(v)>=1e6?(v/1e6).toFixed(Math.abs(v)>=1e7?0:2).replace(/\.?0+$/,'')+'M':Math.abs(v)>=1e3?Math.round(v/1e3)+'k':grouped(v));

/* ---------- events ---------- */
const AGREEMENT_FILTERS=['agreement_type','counterparty_id','program_id','status','verified','from','to'];
try{
 if(action.startsWith('nav:')){const id=action.slice(4);if(SCREENS.some(s=>s.id===id)){st.section=id;st.page=0;st.query='';st.filters={};st.filtersOpen=false;st.menu=null;st.editor=null;st.terms=null;st.confirm=null;st.detail=null;st.review=null;st.sign=null;st.renewal=null;st.dd=null;st.attach=null;note('');}}
 else if(action==='clear-notice')note('');
 else if(action==='as-of'&&event.kind==='change'){const d=validDate(event.value);if(!d)throw Error('Use a valid as-of date.');st.asOf=d;}
 else if(action==='query'&&event.kind==='change'){st.query=String(event.value||'').slice(0,100);st.page=0;}
 else if(action==='doc-search'&&event.kind==='change'){st.docSearch=bool(event.value);}
 else if(action==='toggle-filters')st.filtersOpen=!st.filtersOpen;
 else if(action.startsWith('filter:')&&event.kind==='change'){st.filters[action.slice(7)]=String(event.value||'');st.page=0;}
 else if(action==='clear-filters'){st.filters={};st.page=0;}
 else if(action==='next-page')st.page++;else if(action==='prev-page')st.page=Math.max(0,st.page-1);
 else if(action.startsWith('menu:'))st.menu=st.menu===action.slice(5)?null:action.slice(5);
 else if(action.startsWith('details:')){const [role,id]=action.slice(8).split(':');st.detail={role,id};st.menu=null;}
 else if(action==='close-details')st.detail=null;
 else if(action.startsWith('add:')){const role=action.slice(4),agId=st.detail&&st.detail.role==='agreements'?st.detail.id:'';
  openEditor(role,'create',null,role==='agreements'?{agreement_type:TYPE_ORDER[0]==='cda_nda'&&TYPE_ORDER.length>1?'msa':TYPE_ORDER[0],status:'drafting',currency:CURRENCY}:role==='obligations'?{agreement_id:agId,kind:KIND_ORDER[0],direction:'we_owe',status:'open',recurrence:'none',currency:CURRENCY}:role==='milestones'?{item_type:'milestone',status:'planned',is_key:true}:role==='people'?{organization_id:agId&&AG[agId]?AG[agId].counterparty_id||'':''}:role==='organizations'?{org_type:'company'}:{});}
 else if(action.startsWith('add-child:')){const p=AG[action.slice(10)];if(!p)throw Error('That agreement is no longer available.');openEditor('agreements','create',null,{parent_id:p.id,counterparty_id:p.counterparty_id||'',program_id:p.program_id||'',study_id:p.study_id||'',agreement_type:p.agreement_type==='msa'?'sow_work_order':p.agreement_type==='sow_work_order'?'change_order':p.agreement_type==='licence_in'||p.agreement_type==='licence_out'?p.agreement_type:'change_order',status:'drafting',currency:p.currency||CURRENCY,owner:p.owner||''});}
 else if(action.startsWith('edit:')){const [role,id]=action.slice(5).split(':');openEditor(role,'edit',id);}
 else if(action.startsWith('duplicate:')){const [role,id]=action.slice(10).split(':');openEditor(role,'duplicate',id);}
 else if(action==='edit-settings'){if(settingsRow)openEditor('settings','edit',settingsRow.id);else openEditor('settings','create',null,{default_currency:'EUR',reminder_days:'30, 60, 90',digest_day:1,agreement_types:TYPES.join(', '),obligation_kinds:KINDS.join(', ')});}
 else if(action.startsWith('draft:')&&st.editor){st.editor.draft={...st.editor.draft,...form};}
 else if(action.startsWith('pick:')&&st.editor){st.editor.draft={...st.editor.draft,...form};const k=action.slice(5);if(event.value)st.editor.draft[k]=String(event.value).slice(0,300);}
 else if(action==='cancel-modal'){st.editor=null;st.terms=null;st.confirm=null;st.review=null;st.sign=null;st.renewal=null;st.dd=null;st.attach=null;}
 else if(action==='save-record'&&event.kind==='submit'){
  const ed=st.editor;if(!ed)throw Error('Nothing to save.');const {role,mode,id}=ed;if(!canWrite(role))throw Error('You cannot change the '+ROLE_LABEL[role]+' table.');
  ed.draft={...ed.draft,...form};
  const data=valuesFromForm(role,ed.draft,mode==='edit'?'update':'create');
  if(role==='agreements'&&data.parent_id&&mode==='edit'){let cur=data.parent_id;const seen=new Set();while(cur&&!seen.has(cur)){if(cur===id)throw Error('Rejected: an agreement cannot sit under itself or its own children.');seen.add(cur);cur=AG[cur]?AG[cur].parent_id:'';}}
  if(role==='obligations'&&mode!=='edit'&&roleMap.obligations.fields.verified)data.verified=true;// entered by a person in the app: confirmed by them
  if(mode==='edit'){const orig=lookup(role,id);if(orig){const same=(x,y)=>(x===undefined||x===''?null:x)===(y===undefined||y===''?null:y)||String(x)===String(y)&&x!==null&&y!==null;for(const k of Object.keys(data))if(same(data[k],orig.data[k]))delete data[k];}}
  if(mode==='edit'&&!Object.keys(data).length)throw Error('Nothing changed.');
  if(mode==='edit'){const orig=lookup(role,id);if(!orig)throw Error('This record changed or was removed; reopen it.');const changes=[{kind:'update_record',recordId:id,expectedVersion:ed.version,data:toReal(role,data)}];
   // Changed agreement dates recompute the stored notice deadline and confidentiality end in the same review.
   if(role==='agreements'&&(has(data,'expiry_date')||has(data,'effective_date'))&&termsOf(id)){const a={...AG[id],...data};const c=termsChange(a,{},ed.termsVersion!==null?{[termsOf(id).id]:ed.termsVersion}:null);if(c)changes.push(c);}
   propose(changes,'Change prepared for review'+(changes.length>1?', with the key-term dates recomputed':'')+'. Nothing changes until you approve it.');}
  else{propose([{kind:'create_record',typeId:roleMap[role].typeId,data:toReal(role,data)}],'New '+ROLE_LABEL[role]+' prepared for review.');
   if(role==='agreements'&&canWrite('terms'))st.pending=[{name:String(data.name||''),counterparty_id:data.counterparty_id||'',terms:{status_since:AS_OF||null}}].concat(st.pending).slice(0,5);}
  st.editor=null;}
 /* key terms */
 else if(action.startsWith('terms:')){openTermsEditor(action.slice(6));}
 else if(action==='terms-draft'&&st.terms){st.terms.draft={...st.terms.draft,...form};}
 else if(action==='save-terms'&&event.kind==='submit'){const t=st.terms;if(!t)throw Error('Nothing to save.');t.draft={...t.draft,...form};const a=AG[t.agreementId];if(!a)throw Error('That agreement is no longer available.');
  if(!canWrite('terms'))throw Error('You cannot change key terms.');const values=termsValues(t.draft);const cur=termsOf(a.id);
  if(cur)for(const k of Object.keys(values))if((values[k]??null)===(cur[k]??null)||String(values[k])===String(cur[k])&&values[k]!==null)delete values[k];
  if(cur&&t.version!==cur.version)throw Error('These key terms changed since you opened them. Reopen them.');
  const c=termsChange(a,values,cur?{[cur.id]:t.version}:null);if(!c)throw Error('Nothing changed.');
  propose([c],'Key terms prepared for review. The notice deadline and confidentiality end are recomputed and stored with them.');st.terms=null;}
 /* pending key terms after a new agreement is approved */
 else if(action.startsWith('pending-save:')){const i=Number(action.slice(13)),p=st.pending[i];if(!p)throw Error('Nothing pending.');
  const a=AGS.filter(x=>String(x.name||'')===p.name&&(x.counterparty_id||'')===(p.counterparty_id||'')&&!termsOf(x.id)).pop();if(!a)throw Error('The new agreement is not in the register yet. Approve its review first.');
  const c=termsChange(a,p.terms);if(!c)throw Error('Nothing to save.');propose([c],'Key terms for '+String(a.name||'')+' prepared for review.');st.pending.splice(i,1);}
 else if(action.startsWith('pending-drop:')){st.pending.splice(Number(action.slice(13)),1);}
 /* archive */
 else if(action.startsWith('archive:')){const [role,id]=action.slice(8).split(':');const r=lookup(role,id);if(!r)throw Error('That record is no longer available.');st.confirm={kind:'archive',role,id,version:r.version};st.menu=null;}
 else if(action==='confirm-archive'){const c=st.confirm;if(!c||c.kind!=='archive')throw Error('Nothing to archive.');const m=roleMap[c.role];if(!canWrite(c.role)||!m.fields.archived||!m.writable.includes('archived'))throw Error('Archiving needs an editable archived field.');
  if(c.role==='agreements'&&(CHILDREN[c.id]||[]).length)throw Error('Other agreements sit under this one. Move or archive them first.');
  propose([{kind:'update_record',recordId:c.id,expectedVersion:c.version,data:{[m.fields.archived]:true}}],'Archive prepared for review. The record and its history are kept.');st.confirm=null;}
 /* obligations */
 else if(action.startsWith('ob-status:')){const [id,to]=action.slice(10).split(':');const o=OBS.find(x=>x.id===id);if(!o)throw Error('That obligation is no longer available.');if(!OB_STATUS.includes(to))throw Error('Choose done, waived, missed or open.');st.confirm={kind:'ob-status',id,version:o.version,to};st.menu=null;}
 else if(action==='confirm-ob-status'){const c=st.confirm;if(!c||c.kind!=='ob-status')throw Error('Nothing to change.');if(!writableField('obligations','status'))throw Error('You cannot change obligations.');
  propose([{kind:'update_record',recordId:c.id,expectedVersion:c.version,data:toReal('obligations',{status:c.to})}],'Obligation marked '+c.to+' for review.');st.confirm=null;}
 /* extraction review: a person verifies assistant proposals */
 else if(action.startsWith('review:')){const a=AG[action.slice(7)];if(!a)throw Error('That agreement is no longer available.');const t=termsOf(a.id);
  const obs=UNVERIFIED_OBS.filter(o=>o.agreement_id===a.id);if(!(t&&t.extraction_status==='proposed')&&!obs.length)throw Error('Nothing from this agreement is waiting for verification.');
  st.review={agreementId:a.id,termsId:t&&t.extraction_status==='proposed'?t.id:null,termsVersion:t?t.version:null,obs:obs.map(o=>({id:o.id,version:o.version})),draft:{verified_by:'',terms:t&&t.extraction_status==='proposed'?'verify':''},decisions:Object.fromEntries(obs.map(o=>[o.id,'verify']))};st.detail=null;st.menu=null;}
 else if(action==='review-draft'&&st.review){const r=st.review;if(has(form,'verified_by'))r.draft.verified_by=String(form.verified_by).slice(0,200);if(has(form,'terms_decision'))r.draft.terms=String(form.terms_decision);for(const k of Object.keys(form))if(k.startsWith('ob_'))r.decisions[k.slice(3)]=String(form[k]);}
 else if(action==='review-submit'&&event.kind==='submit'){const r=st.review;if(!r)throw Error('Nothing to verify.');
  if(has(form,'verified_by'))r.draft.verified_by=String(form.verified_by).slice(0,200);if(has(form,'terms_decision'))r.draft.terms=String(form.terms_decision);for(const k of Object.keys(form))if(k.startsWith('ob_'))r.decisions[k.slice(3)]=String(form[k]);
  const who=String(r.draft.verified_by||'').trim();if(!who)throw Error('Enter your name: verification is recorded with the person who checked the source.');if(!AS_OF)throw Error('Set the as-of date first.');
  const a=AG[r.agreementId];if(!a)throw Error('That agreement changed or was removed; reopen the review.');const changes=[];
  if(r.termsId&&r.draft.terms==='verify'){if(!writableField('terms','extraction_status'))throw Error('You cannot verify key terms.');const t=termsOf(a.id);if(!t||t.id!==r.termsId)throw Error('The key terms changed; reopen the review.');
   changes.push({kind:'update_record',recordId:t.id,expectedVersion:r.termsVersion,data:toReal('terms',{extraction_status:'verified',verified_by:who.slice(0,300),verified_on:AS_OF,...termsData(t,a,{})})});}
  for(const o of r.obs){const d=r.decisions[o.id]||'skip';if(d==='verify'){if(!writableField('obligations','verified'))throw Error('You cannot verify obligations.');changes.push({kind:'update_record',recordId:o.id,expectedVersion:o.version,data:toReal('obligations',{verified:true})});}
   else if(d==='reject'){if(!writableField('obligations','archived'))throw Error('You cannot archive obligations.');changes.push({kind:'update_record',recordId:o.id,expectedVersion:o.version,data:toReal('obligations',{archived:true})});}}
  if(!changes.length)throw Error('Choose at least one item to verify or reject.');
  propose(changes,'Verification by '+who+' prepared for review: '+plural(changes.length,'record')+'. Only verified items count as confirmed.');st.review=null;}
 /* pipeline */
 else if(action.startsWith('move:')){const [id,to]=action.slice(5).split(':');const a=AG[id];if(!a)throw Error('That agreement is no longer available.');if(!IN_FLIGHT.includes(to))throw Error('Move between drafting, in negotiation and out for signature; use Mark signed to activate.');
  st.confirm={kind:'move',id,version:a.version,to,termsVersion:termsOf(id)?termsOf(id).version:null};st.menu=null;}
 else if(action==='confirm-move'){const c=st.confirm;if(!c||c.kind!=='move')throw Error('Nothing to move.');const a=AG[c.id];if(!a)throw Error('That agreement changed or was removed.');if(!writableField('agreements','status'))throw Error('You cannot change agreement status.');
  const changes=[{kind:'update_record',recordId:a.id,expectedVersion:c.version,data:toReal('agreements',{status:c.to})}];if(canWrite('terms')){const t=termsChange(a,{status_since:AS_OF||null},termsOf(a.id)&&c.termsVersion!==null?{[termsOf(a.id).id]:c.termsVersion}:null);if(t)changes.push(t);}
  propose(changes,String(a.name||'Agreement')+' → '+STATUS_LABEL[c.to]+' prepared for review.');st.confirm=null;}
 else if(action.startsWith('sign:')){const a=AG[action.slice(5)];if(!a)throw Error('That agreement is no longer available.');const t=termsOf(a.id);
  st.sign={id:a.id,version:a.version,termsVersion:t?t.version:null,draft:{signed_on:a.signed_on||AS_OF||'',effective_date:a.effective_date||a.signed_on||AS_OF||'',expiry_date:a.expiry_date||'',confidentiality_years:t&&t.confidentiality_years!=null?String(t.confidentiality_years):'',cda_direction:t&&t.cda_direction||(a.agreement_type==='cda_nda'?'mutual':'')}};st.menu=null;}
 else if(action==='sign-draft'&&st.sign){st.sign.draft={...st.sign.draft,...form};}
 else if(action==='sign-submit'&&event.kind==='submit'){const s=st.sign;if(!s)throw Error('Nothing to sign.');s.draft={...s.draft,...form};const a=AG[s.id];if(!a)throw Error('That agreement changed or was removed.');
  const signed=validDate(s.draft.signed_on),eff=validDate(s.draft.effective_date),exp=s.draft.expiry_date?validDate(s.draft.expiry_date):'';if(!signed)throw Error('Enter the signature date.');if(s.draft.expiry_date&&!exp)throw Error('Use a valid expiry date.');if(eff&&exp&&exp<eff)throw Error('The expiry date is before the effective date.');
  if(!writableField('agreements','status'))throw Error('You cannot change agreement status.');
  const upd={status:'active',signed_on:signed,effective_date:eff||null,expiry_date:exp||null};const changes=[{kind:'update_record',recordId:a.id,expectedVersion:s.version,data:toReal('agreements',upd)}];
  if(canWrite('terms')){const extra={status_since:signed};const y=String(s.draft.confidentiality_years||'').trim();if(y){const n=Number(y);if(!Number.isFinite(n)||n<0)throw Error('Confidentiality years must be a positive number.');extra.confidentiality_years=n;}
   if(s.draft.cda_direction){if(!CDA_DIR.includes(s.draft.cda_direction))throw Error('Choose the CDA direction.');extra.cda_direction=s.draft.cda_direction;}
   const t=termsChange({...a,...upd,expiry_date:exp,effective_date:eff},extra,termsOf(a.id)&&s.termsVersion!==null?{[termsOf(a.id).id]:s.termsVersion}:null);if(t)changes.push(t);}
  propose(changes,String(a.name||'Agreement')+' marked signed for review. Next: add the signed original (Upload the signed original in its details).');st.sign=null;st.signed=a.id;}
 /* documents */
 else if(action.startsWith('document:uploaded:')&&event.kind==='change'){const ctx=action.slice(18),agId=ctx.startsWith('attach:')?ctx.slice(7):'';const v=String(event.value||'');
  if(!AG[agId])note('Signed original saved in Documents'+(v?'':'')+'. Ask Claude or ChatGPT to read it and propose the agreement, key terms and obligations with quotes and pages, or add the agreement and attach the original from its details.');else{st.attach={agreementId:agId,versionId:v,termsVersion:termsOf(agId)?termsOf(agId).version:null};st.signed=null;}}
 else if(action.startsWith('attach:')){const a=AG[action.slice(7)];if(!a)throw Error('That agreement is no longer available.');st.attach={agreementId:a.id,versionId:'',termsVersion:termsOf(a.id)?termsOf(a.id).version:null};st.detail=null;}
 else if(action==='attach-pick'&&event.kind==='change'&&st.attach){st.attach.versionId=String(event.value||'');}
 else if(action==='confirm-attach'){const c=st.attach;if(!c)throw Error('Nothing to attach.');const a=AG[c.agreementId];if(!a)throw Error('That agreement changed or was removed.');const d=docs().list.find(x=>x.versionId===c.versionId);if(!d)throw Error('Choose a saved original you can open.');
  const t=termsOf(a.id),extra={document_id:d.documentId,document_version_id:d.versionId};if(!t||t.document_version_id!==d.versionId)extra.extraction_status='none';
  const ch=termsChange(a,extra,t&&c.termsVersion!==null?{[t.id]:c.termsVersion}:null);if(!ch)throw Error('This original is already attached.');
  propose([ch],'Signed original '+d.filename+' attached for review.'+(d.aiReadable?' Ask Claude or ChatGPT to extract its key terms; their proposals stay unverified until you verify them here.':' This document is not AI-readable, so assistants cannot extract from it.'));st.attach=null;}
 /* CDAs */
 else if(action==='cda-query'&&event.kind==='change'){st.cdaQuery=String(event.value||'').slice(0,100);}
 else if(action==='cda-draft'){st.cdaDraft={...(st.cdaDraft||{}),...Object.fromEntries(['counterparty_id','purpose'].filter(k=>has(form,k)).map(k=>[k,String(form[k]).slice(0,300)]))};}
 else if(action==='cda-submit'&&event.kind==='submit'){st.cdaDraft={...(st.cdaDraft||{}),...Object.fromEntries(['counterparty_id','purpose'].filter(k=>has(form,k)).map(k=>[k,String(form[k]).slice(0,300)]))};const d=st.cdaDraft;
  const o=ORGS.find(x=>x.id===d.counterparty_id);if(!o)throw Error('Choose the counterparty organization (add it in Settings if it is new).');const purpose=String(d.purpose||'').trim();if(!purpose)throw Error('Enter the purpose of the CDA.');
  if(!canWrite('agreements'))throw Error('You cannot add agreements.');const name=('CDA — '+String(o.data.name||'')).slice(0,300);
  propose([{kind:'create_record',typeId:roleMap.agreements.typeId,data:toReal('agreements',{name,agreement_type:'cda_nda',counterparty_id:o.id,status:'drafting',...(roleMap.agreements.fields.archived?{archived:false}:{})})}],'New CDA request with '+String(o.data.name||'')+' prepared for review (status drafting).');
  if(canWrite('terms'))st.pending=[{name,counterparty_id:o.id,terms:{purpose,cda_direction:'mutual',status_since:AS_OF||null}}].concat(st.pending).slice(0,5);st.cdaDraft=null;}
 /* renewal decision */
 else if(action.startsWith('renewal:')){const a=AG[action.slice(8)];if(!a)throw Error('That agreement is no longer available.');st.renewal={id:a.id,version:a.version,termsVersion:termsOf(a.id)?termsOf(a.id).version:null,draft:{decision:'',note:''}};st.detail=null;}
 else if(action==='renewal-draft'&&st.renewal){st.renewal.draft={...st.renewal.draft,...Object.fromEntries(['decision','note'].filter(k=>has(form,k)).map(k=>[k,String(form[k]).slice(0,2000)]))};}
 else if(action==='renewal-submit'&&event.kind==='submit'){const r=st.renewal;if(!r)throw Error('Nothing to record.');r.draft={...r.draft,...Object.fromEntries(['decision','note'].filter(k=>has(form,k)).map(k=>[k,String(form[k]).slice(0,2000)]))};
  if(!DECISIONS.includes(r.draft.decision))throw Error('Choose renew, renegotiate or terminate.');const a=AG[r.id];if(!a)throw Error('That agreement changed or was removed.');const t=termsOf(a.id);
  const line='Renewal decision on '+(AS_OF||'—')+': '+r.draft.decision+(String(r.draft.note||'').trim()?' — '+String(r.draft.note).trim():'')+'.';
  const changes=[];const tc=termsChange(a,{notes:((t&&t.notes?String(t.notes)+'\n':'')+line).slice(-4000),...(r.draft.decision==='renegotiate'?{status_since:AS_OF||null}:{})},t&&r.termsVersion!==null?{[t.id]:r.termsVersion}:null);if(tc)changes.push(tc);
  if(r.draft.decision==='renegotiate'){if(!writableField('agreements','status'))throw Error('You cannot change agreement status.');changes.push({kind:'update_record',recordId:a.id,expectedVersion:r.version,data:toReal('agreements',{status:'in_negotiation'})});}
  propose(changes,'Renewal decision ('+r.draft.decision+') prepared for review; it is kept in the key-term notes.');st.renewal=null;}
 /* due-diligence list */
 else if(action==='dd-open'){st.dd={types:[],statuses:['active'],min:''};st.detail=null;}
 else if(action==='dd-draft'&&st.dd){st.dd={types:TYPES.filter(t=>bool(form['type_'+t])),statuses:STATUSES.filter(s=>bool(form['status_'+s])),min:String(form.min??st.dd.min??'').slice(0,20)};}
}catch(e){note('Action not completed: '+String(e&&e.message||e).slice(0,400));}

/* ---------- rendering helpers ---------- */
const glyph={overview:'<rect x="3" y="3" width="7" height="8" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="15" width="7" height="6" rx="1.5"/>',register:'<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7M9 7h3"/>',families:'<circle cx="12" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M12 7v5M12 12l-6 5M12 12l6 5"/>',obligations:'<path d="M9 11l2 2 4-4"/><rect x="4" y="4" width="16" height="16" rx="2"/>',cdas:'<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',pipeline:'<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="7" rx="1"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',plus:'<path d="M12 5v14M5 12h14"/>',close:'<path d="M6 6l12 12M18 6L6 18"/>',upload:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/>'};
const icon=(n,s=18)=>'<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(glyph[n]||glyph.overview)+'</svg>';
const btn=(text,a,cls,disabled,extra)=>'<button type="button" class="'+(cls===undefined?'ct-btn':cls)+'" data-action="'+esc(a)+'"'+(disabled?' disabled':'')+(extra?' '+extra:'')+'>'+text+'</button>';
const uploadBtn=(agId,text,cls)=>'<button type="button" class="'+(cls||'ct-btn')+'" data-trialy-document="upload attach:'+esc(agId)+'"'+(inp.saved&&canWrite('terms')?'':' disabled')+'>'+icon('upload',15)+' '+esc(text||'Upload the signed original')+'</button>';
const pill=(text,type)=>'<span class="ct-pill '+esc(type||'')+'">'+esc(text)+'</span>';
const statusTone=s=>s==='active'?'green':IN_FLIGHT.includes(s)?'blue':s==='expired'||s==='terminated'?'':s==='superseded'?'':'';
const obTone=s=>s==='done'?'green':s==='missed'?'red':s==='waived'?'':'blue';
const verifiedPill=v=>v?pill('Verified','green'):pill('Unverified','amber');
const current=SCREENS.find(s=>s.id===st.section)||SCREENS[0];
const asOfText=()=>AS_OF?'As of '+dateLabel(AS_OF)+(AS_OF_SOURCE==='today'?' (today)':AS_OF_SOURCE==='pinned'?' (fixed)':''):'No as-of date';
function heading(sub){return '<header class="ct-top"><div><div class="ct-eyebrow">Contracts / '+esc(current.label)+'</div><h1 class="ct-title">'+esc(st.layout.heading)+'</h1><p class="ct-subtitle">'+esc(sub||DESC[current.id])+'</p></div><div class="ct-top-right">'+pill(asOfText(),'blue')+btn(icon('gear',18),'tracker:layout','ct-icon-btn',!inp.saved,'aria-label="App layout settings" title="Layout settings"')+'</div></header>'+asOfControl()+pendingBanner();}
function asOfControl(){if(AS_OF_SOURCE==='today'||AS_OF_SOURCE==='pinned')return '';return '<div class="ct-banner warn ct-asof"><label class="ct-field inline" for="ct-asof">As-of date<input class="ct-input" type="date" id="ct-asof" name="as_of" data-ui-state="true" data-action="as-of" value="'+esc(AS_OF)+'"></label><span>This app view could not read today\'s date. Deadlines and due dates use this date.</span></div>';}
function pendingBanner(){if(!st.pending.length)return '';return st.pending.map((p,i)=>{const ready=AGS.some(x=>String(x.name||'')===p.name&&(x.counterparty_id||'')===(p.counterparty_id||'')&&!termsOf(x.id));
 return '<div class="ct-banner info" role="status"><span>'+(ready?'<strong>'+esc(p.name)+'</strong> is in the register. Save its starting key terms'+(p.terms.purpose?' (purpose: '+esc(p.terms.purpose)+')':'')+' to track the days in status.':'Waiting for your approval of <strong>'+esc(p.name)+'</strong>. Its key terms can be saved once it is in the register.')+'</span><span class="ct-row" style="margin-top:0">'+btn('Save key terms','pending-save:'+i,'ct-btn small ct-btn-primary',!ready||!canWrite('terms'))+btn('Dismiss','pending-drop:'+i,'ct-btn small')+'</span></div>';}).join('');}
function checks(){if(exact)return '';
 return '<div class="ct-banner bad" role="alert"><strong>Partial data: totals, family values and "none found" answers are disabled.</strong> '+readProblems.slice(0,8).map(esc).join(' ')+' Rows that were read are still shown and labelled.</div>';}
const tot=n=>exact?String(n):'—';
function paged(items,per){per=per||Math.min(50,Math.max(10,num(cfg.pageSize,25)||25));const max=Math.max(0,Math.ceil(items.length/per)-1);st.page=Math.min(st.page,max);return {slice:items.slice(st.page*per,(st.page+1)*per),page:st.page,max,total:items.length,per};}
function pager(p,scope){return '<div class="ct-footer"><span>'+(p.total?'Showing '+(p.page*p.per+1)+'–'+Math.min(p.total,(p.page+1)*p.per)+' of '+p.total:'No rows')+(scope?' · '+esc(scope):'')+'</span><span class="ct-pager">'+btn('Previous','prev-page','ct-btn small',p.page===0)+'<span>Page '+(p.page+1)+' of '+(p.max+1)+'</span>'+btn('Next','next-page','ct-btn small',p.page>=p.max)+'</span></div>';}
function partialLabel(role){const r=R[role];return r.unbound?'table not connected':r.unavailable?'no access':!r.complete?'partial: '+r.rows.length+' rows read':'search covers all '+r.rows.length+' rows';}
function toolbar(role,addLabel,filters,extra,addAction){filters=filters.filter(f=>f.options===null||f.options.length);const active=Object.entries(st.filters).filter(([,v])=>v).length;
 return '<div class="ct-toolbar"><input type="search" class="ct-search" name="query" data-action="query" data-ui-state="true" value="'+esc(st.query)+'" placeholder="Search" aria-label="Search '+esc(ROLE_LABEL[role])+'s">'+btn('Filters'+(active?' ('+active+')':''),'toggle-filters','ct-btn ct-disclosure',false,'aria-expanded="'+(st.filtersOpen?'true':'false')+'" aria-controls="ct-filters"')+(addLabel?btn(icon('plus',15)+'<span class="ct-hide-xs">'+esc(addLabel)+'</span>',addAction||'add:'+role,'ct-btn ct-btn-primary',!canWrite(role),'aria-label="'+esc(addLabel)+'"'):'')+'</div>'+
 (st.filtersOpen?'<div class="ct-filter-row" id="ct-filters">'+filters.map(f=>f.options===null?'<label>'+esc(f.label)+'<input type="date" class="ct-input" name="filter_'+f.key+'" data-ui-state="true" data-action="filter:'+f.key+'" value="'+esc(st.filters[f.key]||'')+'"></label>':'<label>'+esc(f.label)+'<select name="filter_'+f.key+'" data-ui-state="true" data-action="filter:'+f.key+'"><option value="">All</option>'+f.options.map(o=>'<option value="'+esc(o[0])+'"'+(st.filters[f.key]===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></label>').join('')+btn('Clear filters','clear-filters','ct-btn small',!active)+(extra||'')+'</div>':'');}
const typeOpts=()=>TYPE_ORDER.map(x=>[x,TYPE_LABEL[x]]);
const orgOpts=()=>ORGS.map(o=>[o.id,String(o.data.name||'Unnamed')]);
const progOpts=()=>R.programs.rows.map(p=>[p.id,String(p.data.name||'Unnamed')]);
function rowMenu(role,id,name,extra){const key=role+':'+id;const w=canWrite(role);
 return '<div class="ct-menu-wrap">'+btn('Details','details:'+key,'ct-btn small',false,'aria-label="Details of '+esc(name)+'"')+btn('•••','menu:'+key,'ct-more',false,'aria-label="More actions for '+esc(name)+'" aria-expanded="'+(st.menu===key?'true':'false')+'"')+(st.menu===key?'<div class="ct-menu" role="menu">'+btn('Edit','edit:'+key,'',!w)+btn('Duplicate','duplicate:'+key,'',!w)+(extra||'')+(roleMap[role]&&roleMap[role].fields.archived?btn('Archive','archive:'+key,'danger',!w||!roleMap[role].writable.includes('archived')):'')+'</div>':'')+'</div>';}
const empty=(title,text)=>'<div class="ct-empty"><strong>'+esc(title)+'</strong><p>'+esc(text)+'</p></div>';
function kpi(title,value,foot,tone){return '<div class="ct-kpi '+(tone||'')+'"><div class="ct-kpi-label">'+esc(title)+'</div><div class="ct-kpi-value">'+esc(value)+'</div><div class="ct-kpi-foot">'+esc(foot||'')+'</div></div>';}
const daysTo=d=>AS_OF&&d?diffDays(AS_OF,d):null;
const inDays=d=>{const n=daysTo(d);return n===null?'':n===0?'today':n>0?'in '+plural(n,'day'):plural(-n,'day')+' ago';};

/* ---------- Overview ---------- */
function upcoming(){const out=[];
 for(const a of AGS){if(!isActive(a))continue;const t=termsOf(a.id),d=storedOrComputed(t,a);
  if(inWindow(d.notice))out.push({date:d.notice,kind:'Notice deadline',text:'Cancel by '+dateLabel(d.notice)+' or it renews'+(t&&num(t.renewal_term_months)?' for '+plural(num(t.renewal_term_months),'month'):''),a,tone:'amber'});
  if(inWindow(a.expiry_date))out.push({date:a.expiry_date,kind:'Expiry',text:'Expires '+dateLabel(a.expiry_date),a,tone:''});
  if(a.agreement_type==='cda_nda'&&inWindow(d.conf))out.push({date:d.conf,kind:'Confidentiality ends',text:'Confidentiality ends '+dateLabel(d.conf),a,tone:''});}
 for(const o of OBS){if(o.status!=='open'||!o.verified)continue;const nd=nextDue(o);if(inWindow(nd))out.push({date:nd,kind:DIR_LABEL[o.direction]||'Obligation',text:String(o.title||'')+(o.amount!==null?' · '+money(o.amount,o.currency):''),a:AG[o.agreement_id]||null,tone:o.direction==='we_owe'?'blue':'green',ob:o});}
 return out.sort((x,y)=>x.date.localeCompare(y.date)||x.kind.localeCompare(y.kind));}
function overview(){
 let body=heading()+checks();
 if(!AGS.length&&!R.agreements.unbound)return body+empty('No agreements yet','Add your first agreement in Register, upload a signed original, or ask Claude or ChatGPT to read the originals you uploaded and propose the register. Every change is reviewed.')+(canWrite('agreements')?'<div class="ct-row">'+btn(icon('plus',15)+' Add agreement','add:agreements','ct-btn ct-btn-primary')+btn('New CDA','nav:cdas','ct-btn')+'</div>':'');
 const up=upcoming(),notices=up.filter(x=>x.kind==='Notice deadline');
 const next=notices[0]||up[0];
 const od=OBS.filter(o=>o.verified&&overdueOb(o)),inFlight=AGS.filter(a=>IN_FLIGHT.includes(a.status)),active=AGS.filter(isActive);
 body+='<section class="ct-hero"><div class="ct-hero-over">'+(next?esc(next.kind):'Next deadline')+'</div><div class="ct-hero-sentence">'+(next?(next.kind==='Notice deadline'?'Cancel '+esc(next.a.name||'')+' by '+esc(dateLabel(next.date))+' or it renews'+(termsOf(next.a.id)&&num(termsOf(next.a.id).renewal_term_months)?' for '+esc(plural(num(termsOf(next.a.id).renewal_term_months),'month')):''):esc((next.a?String(next.a.name||'')+': ':'')+next.text))+' ('+esc(inDays(next.date))+')':'Nothing due in the next '+WINDOW+' days')+'</div><div class="ct-hero-foot"><span><strong>'+tot(active.length)+'</strong> active agreements</span><span><strong>'+tot(od.length)+'</strong> overdue obligations</span><span><strong>'+tot(PROPOSED_TERMS.length+UNVERIFIED_OBS.length)+'</strong> unverified extractions</span><span><strong>'+tot(inFlight.length)+'</strong> in flight</span></div></section>';
 const counts=w=>up.filter(x=>daysTo(x.date)<=w).length;
 body+='<div class="ct-kpis">'+REMIND.slice(0,3).map(w=>kpi('Next '+w+' days',tot(counts(w)),'Notice deadlines, expiries, verified obligations and confidentiality ends')).join('')+'</div>';
 body+='<div class="ct-grid2"><section class="ct-panel"><div class="ct-pad"><div class="ct-panel-head"><div><h2>Next '+WINDOW+' days</h2><p>Expiries, notice deadlines, verified obligations due and CDA confidentiality ends, from '+esc(dateLabel(AS_OF))+'</p></div></div>'+(up.length?'<ul class="ct-list">'+up.slice(0,15).map(x=>'<li><span><strong>'+esc(x.a?x.a.name||'':'')+'</strong><small class="ct-sub">'+esc(x.kind)+' · '+esc(x.text)+'</small></span><span>'+pill(dateLabel(x.date)+' · '+bucketLabel(x.date),x.tone)+' '+(x.a?btn('Open','details:agreements:'+x.a.id,'ct-btn small',false,'aria-label="Open '+esc(x.a.name||'agreement')+'"'):'')+'</span></li>').join('')+'</ul>'+(up.length>15?'<p class="ct-muted">And '+(up.length-15)+' more in Register and Obligations.</p>':''):'<p class="ct-muted">Nothing is due in this window.</p>')+'</div></section>';
 const unv=PROPOSED_TERMS.map(t=>({a:AG[t.agreement_id],what:'Proposed key terms'})).concat(Object.entries(UNVERIFIED_OBS.reduce((m,o)=>{(m[o.agreement_id]=m[o.agreement_id]||[]).push(o);return m;},{})).filter(([id])=>AG[id]).map(([id,l])=>({a:AG[id],what:plural(l.length,'proposed obligation')})));
 body+='<section class="ct-panel"><div class="ct-pad"><div class="ct-panel-head"><div><h2>Needs attention</h2><p>Overdue obligations, unverified extractions and agreements that end before a key milestone</p></div></div><ul class="ct-list">'+
  od.slice(0,8).map(o=>'<li><span><strong>'+esc(o.title||'')+'</strong><small class="ct-sub">Overdue since '+esc(dateLabel(o.due_date))+' · '+esc(DIR_LABEL[o.direction]||'')+' · '+esc(agName(o.agreement_id))+'</small></span>'+btn('Mark done','ob-status:'+o.id+':done','ct-btn small',!writableField('obligations','status'),'aria-label="Mark '+esc(o.title||'obligation')+' done"')+'</li>').join('')+
  unv.slice(0,8).map(x=>'<li><span><strong>'+esc(x.a.name||'')+'</strong><small class="ct-sub">'+esc(x.what)+' from the assistant · unverified, not counted</small></span>'+btn('Verify','review:'+x.a.id,'ct-btn small ct-btn-primary',!canWrite('obligations')&&!canWrite('terms'),'aria-label="Verify '+esc(x.a.name||'')+'"')+'</li>').join('')+
  EXPIRES_BEFORE.slice(0,6).map(x=>'<li><span><strong>'+esc(x.a.name||'')+'</strong><small class="ct-sub">Expires '+esc(dateLabel(x.a.expiry_date))+', before '+esc(x.ms[0].name||'key milestone')+' ('+esc(dateLabel(x.ms[0].end_date))+')</small></span>'+btn('Open','details:agreements:'+x.a.id,'ct-btn small')+'</li>').join('')+
  (!od.length&&!unv.length&&!EXPIRES_BEFORE.length?'<li><span class="ct-muted">Nothing needs attention.</span></li>':'')+'</ul></div></section></div>';
 const byType={};for(const a of AGS){const k=a.agreement_type||'other';byType[k]=byType[k]||{};byType[k][a.status||'—']=(byType[k][a.status||'—']||0)+1;}
 const statusCols=STATUSES.filter(s=>AGS.some(a=>a.status===s));
 body+='<div class="ct-grid2"><section class="ct-panel"><div class="ct-pad"><div class="ct-panel-head"><div><h2>Agreements by type and status</h2><p>'+(exact?'All agreements in the register':'Rows read so far (partial)')+'</p></div></div></div>'+(Object.keys(byType).length?'<div class="ct-scroll" role="region" aria-label="Agreements by type and status" tabindex="0"><table class="ct-table compact"><thead><tr><th scope="col">Type</th>'+statusCols.map(s=>'<th scope="col">'+esc(STATUS_LABEL[s])+'</th>').join('')+'<th scope="col">Total</th></tr></thead><tbody>'+TYPES.filter(t=>byType[t]).map(t=>'<tr><th scope="row">'+esc(TYPE_LABEL[t])+'</th>'+statusCols.map(s=>'<td>'+(byType[t][s]||'·')+'</td>').join('')+'<td><strong>'+Object.values(byType[t]).reduce((n,v)=>n+v,0)+'</strong></td></tr>').join('')+'</tbody></table></div>':'<div class="ct-none">No agreements.</div>')+'</section>';
 body+='<section class="ct-panel"><div class="ct-pad"><div class="ct-panel-head"><div><h2>In flight</h2><p>Drafting, in negotiation and out for signature, with days in the current status</p></div>'+btn('Pipeline','nav:pipeline','ct-btn small')+'</div>'+(inFlight.length?'<ul class="ct-list">'+inFlight.sort((a,b)=>IN_FLIGHT.indexOf(b.status)-IN_FLIGHT.indexOf(a.status)).slice(0,10).map(a=>'<li><span><strong>'+esc(a.name||'')+'</strong><small class="ct-sub">'+esc(orgName(a.counterparty_id))+' · '+esc(STATUS_LABEL[a.status])+'</small></span><span>'+esc(ageText(a))+'</span></li>').join('')+'</ul>':'<p class="ct-muted">No agreements before signature.</p>')+'</div></section></div>';
 return body;}
const bucketLabel=d=>{const b=bucket(d);return b?'≤ '+b+' days':'';};
function ageText(a){const t=termsOf(a.id),s=validDate(t&&t.status_since);return s&&AS_OF?plural(Math.max(0,diffDays(s,AS_OF)),'day')+' in status':'days in status unknown';}

/* ---------- Register ---------- */
function agCell(k,a){const v=a[k];
 if(k==='name'){const t=termsOf(a.id);return '<strong>'+esc(v||'—')+'</strong><small class="ct-sub">'+esc([a.parent_id?'Under '+agName(a.parent_id):'',t&&t.extraction_status==='proposed'?'terms unverified':'',t&&t.document_version_id?'signed original attached':t&&t.document_link?'external link':''].filter(Boolean).join(' · '))+'</small>';}
 if(k==='agreement_type')return esc(TYPE_LABEL[v]||label(v));if(k==='counterparty_id')return esc(orgName(v));if(k==='program_id')return R.programs.unbound?'<span class="ct-muted">—</span>':esc(progName(v));
 if(k==='status')return pill(STATUS_LABEL[v]||cap(v),statusTone(v));
 if(k==='effective_date')return esc(dateLabel(v));
 if(k==='expiry_date'){const eb=expiresBefore(a).length;return esc(dateLabel(v))+(isActive(a)&&inWindow(v)?' '+pill(inDays(v),'amber'):'')+(eb?' '+pill('Before milestone','red'):'');}
 if(k==='total_value')return a.total_value===null?'<span class="ct-muted">—</span>':esc(money(a.total_value,a.currency));
 return esc(v===null||v===undefined||v===''?'—':v);}
function agreementRows(){const q=st.query.toLowerCase().trim(),f=st.filters;let rows=AGS.slice();
 if(q)rows=rows.filter(a=>[a.name,orgName(a.counterparty_id),TYPE_LABEL[a.agreement_type],a.owner,termsOf(a.id)&&termsOf(a.id).purpose].some(x=>String(x||'').toLowerCase().includes(q)));
 for(const k of ['agreement_type','counterparty_id','program_id','status'])if(f[k])rows=rows.filter(a=>String(a[k]||'')===f[k]);
 if(f.verified==='verified')rows=rows.filter(a=>{const t=termsOf(a.id);return t&&t.extraction_status==='verified';});
 if(f.verified==='unverified')rows=rows.filter(a=>{const t=termsOf(a.id);return (t&&t.extraction_status==='proposed')||UNVERIFIED_OBS.some(o=>o.agreement_id===a.id);});
 if(f.from)rows=rows.filter(a=>a.expiry_date&&a.expiry_date>=f.from);if(f.to)rows=rows.filter(a=>a.expiry_date&&a.expiry_date<=f.to);
 return rows.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));}
function docSearchPanel(){if(!st.docSearch||!st.query.trim())return '';if(!inp.saved)return '<p class="ct-muted ct-note">Document search works in the saved app.</p>';
 let r;try{callsLeft--;r=tools.call('documents.search',{query:st.query.trim()});}catch(e){r={unavailable:true};}
 if(!r||r.unavailable)return '<p class="ct-muted ct-note">Signed originals could not be searched for you.</p>';
 const hits=Array.isArray(r.hits)?r.hits:[],cov=r.coverage||{};const byDoc=id=>Object.values(TERMS).find(t=>t.document_id===id);
 return '<section class="ct-docsearch" aria-label="Matches in signed originals"><h3 class="ct-h3">In signed originals</h3>'+(hits.length?'<ul class="ct-list">'+hits.slice(0,10).map(h=>{const t=byDoc(h.documentId),a=t&&AG[t.agreement_id];return '<li><span><strong>'+esc(a?a.name:h.filename)+'</strong><small class="ct-sub">'+esc(h.filename)+(h.pages&&h.pages.length?' · page '+h.pages.slice(0,3).join(', '):'')+'</small><span class="ct-quote">'+esc(h.passage||'')+'</span></span>'+(a?btn('Open','details:agreements:'+a.id,'ct-btn small'):'<span class="ct-muted">Not attached to an agreement</span>')+'</li>';}).join('')+'</ul>':'<p class="ct-muted">No match in the searchable originals.</p>')+((cov.pending||cov.unavailable||cov.partial)?'<p class="ct-muted">Coverage: '+esc([cov.pending?cov.pending+' still being read':'',cov.unavailable?cov.unavailable+' without readable text':'',cov.partial?cov.partial+' read partially':''].filter(Boolean).join(', '))+'. A missing match is not proof that the text is absent.</p>':'')+'</section>';}
function register(){
 let body=heading()+checks();const rows=agreementRows(),cols=st.layout.cols.agreements.filter(k=>st.layout.visible['agreements:'+k]!==false&&!(k==='program_id'&&R.programs.unbound)),p=paged(rows);
 body+='<section class="ct-panel"><div class="ct-pad"><div class="ct-panel-head"><div><h2>Agreements</h2><p>Shared workspace register (core role agreements). Values in other currencies are never converted.</p></div><div class="ct-row" style="margin-top:0">'+btn('Due-diligence list','dd-open','ct-btn',!AGS.length)+uploadBtn('new','Upload and extract')+'</div></div>'+
  toolbar('agreements','Add agreement',[{key:'agreement_type',label:'Type',options:typeOpts()},{key:'counterparty_id',label:'Counterparty',options:orgOpts()},...(R.programs.unbound?[]:[{key:'program_id',label:'Program',options:progOpts()}]),{key:'status',label:'Status',options:STATUSES.map(s=>[s,STATUS_LABEL[s]])},{key:'verified',label:'Verification',options:[['verified','Terms verified'],['unverified','Has unverified proposals']]},{key:'from',label:'Expires on or after',options:null},{key:'to',label:'Expires on or before',options:null}],'<label class="ct-check"><input type="checkbox" name="doc_search" value="true" data-ui-state="true" data-action="doc-search"'+(st.docSearch?' checked':'')+'> Also search signed originals</label>')+docSearchPanel()+'</div>'+
  (p.total?'<div class="ct-scroll" role="region" aria-label="Agreements" tabindex="0"><table class="ct-table"><thead><tr>'+cols.map(k=>'<th scope="col">'+esc((templateLayoutSchema.groups.agreements.find(c=>c.id===k)||{}).label||k)+'</th>').join('')+'<th scope="col" class="ct-actions" aria-label="Actions"></th></tr></thead><tbody>'+p.slice.map(a=>'<tr>'+cols.map(k=>'<td>'+agCell(k,a)+'</td>').join('')+'<td class="ct-actions">'+rowMenu('agreements',a.id,String(a.name||'agreement'),btn('Key terms','terms:'+a.id,'',!canWrite('terms'))+btn('Add child agreement','add-child:'+a.id,'',!canWrite('agreements')))+'</td></tr>').join('')+'</tbody></table></div>':'<div class="ct-none">'+(AGS.length?'No agreements match the search or filters.':'No agreements yet. Add the first one, upload a signed original, or ask the assistant to propose the register from originals you uploaded.')+'</div>')+pager(p,partialLabel('agreements'))+'</section>';
 body+='<p class="ct-muted ct-note">Upload and extract: the signed original is stored in TrialAgents Documents. Then ask Claude or ChatGPT: “Read the new original and propose the agreement, key terms and obligations for Contracts, with quotes and pages.” Their proposals arrive unverified and you verify them here.</p>';
 return body;}

/* ---------- Families ---------- */
function familyCard(rootId){const f=familyValue(rootId),dts=familyDates(f.members),master=AG[rootId];
 const tree=f.members.map(m=>{const a=m.a;return '<li class="ct-tree-item" style="--depth:'+Math.min(m.depth,5)+'"><span><strong>'+esc(a.name||'')+'</strong><small class="ct-sub">'+esc(TYPE_LABEL[a.agreement_type]||label(a.agreement_type))+' · '+esc(STATUS_LABEL[a.status]||cap(a.status))+(a.expiry_date?' · expires '+dateLabel(a.expiry_date):'')+'</small></span><span>'+(a.total_value===null?'<span class="ct-muted">No value</span>':esc(money(a.total_value,a.currency||f.primary)))+' '+btn('Details','details:agreements:'+a.id,'ct-btn small',false,'aria-label="Details of '+esc(a.name||'agreement')+'"')+'</span></li>';}).join('');
 return '<article class="ct-family"><details open><summary><span><strong>'+esc(master.name||'')+'</strong><small class="ct-sub">'+esc(orgName(master.counterparty_id))+' · '+plural(f.members.length-1,'child agreement')+'</small></span><span class="ct-family-total">'+(exact?esc(money(f.total,f.primary)):'—')+'</span></summary>'+
 '<div class="ct-kvs"><div class="ct-kv"><span>Family value ('+esc(f.primary)+')</span><strong>'+(exact?esc(money(f.total,f.primary)):'Withheld: partial read')+'</strong></div>'+f.others.map(c=>'<div class="ct-kv"><span>Also in '+esc(c)+' (not converted)</span><strong>'+(exact?esc(money(f.by[c],c)):'—')+'</strong></div>').join('')+
 '<div class="ct-kv"><span>Added by change orders</span><strong>'+(exact&&f.share!==null?esc(money(f.co[f.primary]||0,f.primary))+' · '+(Math.round(f.share*1000)/10)+'%':'—')+'</strong></div><div class="ct-kv"><span>Earliest expiry (active)</span><strong>'+esc(dateLabel(dts.earliestExpiry))+'</strong></div><div class="ct-kv"><span>Next notice deadline</span><strong>'+esc(dateLabel(dts.nextNotice))+(dts.nextNotice?' ('+esc(inDays(dts.nextNotice))+')':'')+'</strong></div></div>'+
 (f.missing.length?'<p class="ct-muted">'+plural(f.missing.length,'member')+' without a value '+(f.missing.length===1?'is':'are')+' not in the total.</p>':'')+'<ul class="ct-tree">'+tree+'</ul><div class="ct-row">'+btn(icon('plus',15)+' Add child agreement','add-child:'+rootId,'ct-btn small',!canWrite('agreements'),'aria-label="Add child agreement to '+esc(master.name||'family')+'"')+'</div></details></article>';}
function families(){
 let body=heading()+checks();
 const q=st.query.toLowerCase().trim(),list=FAMILIES.filter(id=>!q||familyMembers(id).some(m=>String(m.a.name||'').toLowerCase().includes(q)||orgName(m.a.counterparty_id).toLowerCase().includes(q)));
 const p=paged(list,10);
 body+='<section class="ct-panel"><div class="ct-pad"><div class="ct-panel-head"><div><h2>Contract families</h2><p>MSA → SOW → change order; licence → sublicence or amendment. Totals per currency; other currencies are listed separately, never converted.</p></div></div><div class="ct-toolbar"><input type="search" class="ct-search" name="query" data-action="query" data-ui-state="true" value="'+esc(st.query)+'" placeholder="Search families" aria-label="Search families">'+btn(icon('plus',15)+'<span class="ct-hide-xs">Add agreement</span>','add:agreements','ct-btn ct-btn-primary',!canWrite('agreements'),'aria-label="Add agreement"')+'</div></div>'+
 (p.total?'<div class="ct-families">'+p.slice.map(familyCard).join('')+'</div>':'<div class="ct-none">'+(FAMILIES.length?'No family matches.':'No families yet. Use Add child agreement on an MSA or licence to start one.')+'</div>')+pager(p,exact?'all families':'partial read')+'</section>';
 const single=ROOTS.filter(id=>!(CHILDREN[id]||[]).length&&['msa','licence_in','licence_out','research_collaboration'].includes(AG[id].agreement_type));
 if(single.length)body+='<section class="ct-panel ct-pad"><h2>Masters without children yet</h2><ul class="ct-list">'+single.slice(0,10).map(id=>'<li><span><strong>'+esc(AG[id].name||'')+'</strong><small class="ct-sub">'+esc(TYPE_LABEL[AG[id].agreement_type])+' · '+esc(orgName(AG[id].counterparty_id))+'</small></span>'+btn('Add child agreement','add-child:'+id,'ct-btn small',!canWrite('agreements'),'aria-label="Add child agreement to '+esc(AG[id].name||'')+'"')+'</li>').join('')+'</ul></section>';
 return body;}

/* ---------- Obligations ---------- */
function obCell(k,o){
 if(k==='title')return '<strong>'+esc(o.title||'—')+'</strong><small class="ct-sub">'+esc([o.trigger?'Trigger: '+o.trigger:'',o.milestone_id?'Milestone: '+msName(o.milestone_id):'',o.recurrence&&o.recurrence!=='none'?cap(o.recurrence):''].filter(Boolean).join(' · '))+'</small>';
 if(k==='agreement_id')return esc(agName(o.agreement_id));if(k==='direction')return pill(DIR_LABEL[o.direction]||cap(o.direction),o.direction==='we_owe'?'blue':'green');if(k==='kind')return esc(KIND_LABEL[o.kind]||cap(o.kind));
 if(k==='due'){const d=nextDue(o);return d?esc(dateLabel(d))+(overdueOb(o)?' '+pill('Overdue','red'):o.status==='open'&&inWindow(d)?' '+pill(inDays(d),'amber'):''):'<span class="ct-muted">'+esc(o.trigger?'On trigger':'No date')+'</span>';}
 if(k==='amount')return o.amount===null?'<span class="ct-muted">—</span>':esc(money(o.amount,o.currency));
 if(k==='status')return pill(cap(o.status),obTone(o.status));if(k==='verified')return verifiedPill(o.verified);
 return esc(o[k]===null||o[k]===undefined||o[k]===''?'—':o[k]);}
function obligations(){
 let body=heading()+checks();
 const q=st.query.toLowerCase().trim(),f=st.filters;let rows=OBS.slice();
 if(q)rows=rows.filter(o=>[o.title,agName(o.agreement_id),o.owner,o.trigger,o.source_quote].some(x=>String(x||'').toLowerCase().includes(q)));
 for(const k of ['direction','kind','status','agreement_id'])if(f[k])rows=rows.filter(o=>String(o[k]||'')===f[k]);
 if(f.verified)rows=rows.filter(o=>(f.verified==='verified')===o.verified);
 rows.sort((a,b)=>(nextDue(a)||'9999').localeCompare(nextDue(b)||'9999')||String(a.title||'').localeCompare(String(b.title||'')));
 const cols=st.layout.cols.obligations.filter(k=>st.layout.visible['obligations:'+k]!==false),p=paged(rows);
 const statusMenu=o=>['done','waived','missed','open'].filter(s=>s!==o.status).map(s=>btn('Mark '+s,'ob-status:'+o.id+':'+s,'',!writableField('obligations','status'))).join('')+(!o.verified?btn('Verify','review:'+o.agreement_id,'',!writableField('obligations','verified')):'');
 body+='<section class="ct-panel"><div class="ct-pad"><div class="ct-panel-head"><div><h2>Obligations</h2><p>Owed by and to the company. Unverified rows are assistant proposals: shown here, never counted as confirmed.</p></div></div>'+
  toolbar('obligations','Add obligation',[{key:'direction',label:'Direction',options:DIRECTIONS.map(d=>[d,DIR_LABEL[d]])},{key:'kind',label:'Kind',options:KIND_ORDER.map(k=>[k,KIND_LABEL[k]])},{key:'status',label:'Status',options:OB_STATUS.map(s=>[s,cap(s)])},{key:'verified',label:'Verification',options:[['verified','Verified'],['unverified','Unverified']]},{key:'agreement_id',label:'Agreement',options:AGS.map(a=>[a.id,String(a.name||'')])}])+'</div>'+
  (p.total?'<div class="ct-scroll" role="region" aria-label="Obligations" tabindex="0"><table class="ct-table"><thead><tr>'+cols.map(k=>'<th scope="col">'+esc((templateLayoutSchema.groups.obligations.find(c=>c.id===k)||{}).label||k)+'</th>').join('')+'<th scope="col" class="ct-actions" aria-label="Actions"></th></tr></thead><tbody>'+p.slice.map(o=>'<tr'+(o.verified?'':' class="ct-unverified"')+'>'+cols.map(k=>'<td>'+obCell(k,o)+'</td>').join('')+'<td class="ct-actions">'+rowMenu('obligations',o.id,String(o.title||'obligation'),statusMenu(o))+'</td></tr>').join('')+'</tbody></table></div>':'<div class="ct-none">'+(OBS.length?'No obligations match.':'No obligations yet. Add them here or verify the ones your assistant proposes from a signed original.')+'</div>')+pager(p,partialLabel('obligations'))+'</section>';
 // Calendar by month and payments by month and currency: verified open obligations, next 12 months.
 if(AS_OF){const from=AS_OF,to=addDays(addMonthsDate(AS_OF,12),-1),months=Array.from({length:12},(_,i)=>addMonths(AS_OF.slice(0,7),i));const cal={},pay={},unv={};
  for(const o of OBS){if(o.status!=='open')continue;for(const d of occurrences(o,from,to)){const m=d.slice(0,7);if(!o.verified){unv[m]=(unv[m]||0)+1;continue;}(cal[m]=cal[m]||[]).push({o,d});if(o.kind==='payment'&&o.amount!==null){const c=o.currency||'—';pay[m]=pay[m]||{};pay[m][c]=pay[m][c]||{we_owe:0,they_owe:0};pay[m][c][o.direction]+=o.amount;}}}
  body+='<div class="ct-grid2"><section class="ct-panel ct-pad"><div class="ct-panel-head"><div><h2>Calendar</h2><p>Verified open obligations by month, next 12 months; recurring ones on each occurrence</p></div></div>'+(Object.keys(cal).length?months.filter(m=>cal[m]||unv[m]).map(m=>'<h3 class="ct-h3">'+esc(monthLabel(m))+(unv[m]?' '+pill(plural(unv[m],'unverified'),'amber'):'')+'</h3><ul class="ct-list plain">'+(cal[m]||[]).sort((a,b)=>a.d.localeCompare(b.d)).map(x=>'<li><span>'+esc(dateLabel(x.d))+' · <strong>'+esc(x.o.title||'')+'</strong> <small class="ct-sub">'+esc(agName(x.o.agreement_id))+'</small></span><span>'+esc(DIR_LABEL[x.o.direction]||'')+(x.o.amount!==null?' · '+esc(money(x.o.amount,x.o.currency)):'')+'</span></li>').join('')+'</ul>').join(''):'<p class="ct-muted">No dated verified obligations in the next 12 months.</p>')+'</section>';
  const curs=[...new Set(Object.values(pay).flatMap(x=>Object.keys(x)))].sort();
  body+='<section class="ct-panel ct-pad"><div class="ct-panel-head"><div><h2>Payments by month</h2><p>Verified payment obligations per currency, never converted'+(exact?'':' · partial read')+'</p></div></div>'+(curs.length?'<div class="ct-scroll" role="region" aria-label="Payments by month" tabindex="0"><table class="ct-table compact"><thead><tr><th scope="col">Month</th>'+curs.map(c=>'<th scope="col">'+esc(c)+' we pay</th><th scope="col">'+esc(c)+' we receive</th>').join('')+'</tr></thead><tbody>'+months.filter(m=>pay[m]).map(m=>'<tr><th scope="row">'+esc(monthLabel(m))+'</th>'+curs.map(c=>{const v=pay[m][c];return '<td>'+(v&&v.we_owe?esc(grouped(v.we_owe)):'·')+'</td><td>'+(v&&v.they_owe?esc(grouped(v.they_owe)):'·')+'</td>';}).join('')+'</tr>').join('')+'</tbody></table></div>':'<p class="ct-muted">No verified payments due in the next 12 months.</p>')+'<p class="ct-muted ct-note">Runway can use these contracted payments in a future version through an in-app integration.</p></section></div>';}
 return body;}

/* ---------- CDAs ---------- */
function cdaInfo(a){const t=termsOf(a.id),d=storedOrComputed(t,a);return {t,conf:d.conf,binding:!!d.conf&&!!AS_OF&&d.conf>=AS_OF,direction:t&&t.cda_direction};}
function cdas(){
 let body=heading()+checks();const list=AGS.filter(a=>a.agreement_type==='cda_nda');
 const q=norm(st.cdaQuery);let answer='';
 if(q){const orgs=ORGS.filter(o=>norm(o.data.name).includes(q));const hits=list.filter(a=>orgs.some(o=>o.id===a.counterparty_id)||norm(a.name).includes(q));
  const signed=hits.filter(a=>['active','expired','terminated','superseded'].includes(a.status)&&a.signed_on),live=signed.filter(a=>a.status==='active');
  answer='<div class="ct-answer '+(live.length?'yes':signed.length?'old':'no')+'" role="status"><strong>'+(live.length?'Yes — '+plural(live.length,'active CDA')+' with '+esc(orgs.map(o=>o.data.name).join(', ')||st.cdaQuery):signed.length?'Only expired or ended CDAs with '+esc(st.cdaQuery):!exact?'Not sure: the register was not read completely.':orgs.length?'No signed CDA with '+esc(orgs.map(o=>o.data.name).join(', ')):'No organization matches “'+esc(st.cdaQuery)+'”.')+'</strong>'+
   (hits.length?'<ul class="ct-list plain">'+hits.map(a=>{const c=cdaInfo(a);return '<li><span><strong>'+esc(a.name||'')+'</strong><small class="ct-sub">'+esc([STATUS_LABEL[a.status],c.direction?CDA_DIR_LABEL[c.direction]:'direction not recorded',a.signed_on?'signed '+dateLabel(a.signed_on):'not signed',a.expiry_date?'term to '+dateLabel(a.expiry_date):'',c.conf?'confidential until '+dateLabel(c.conf):''].filter(Boolean).join(' · '))+'</small></span>'+btn('Open','details:agreements:'+a.id,'ct-btn small')+'</li>';}).join('')+'</ul>':'')+'</div>';}
 body+='<div class="ct-grid2 wide-left"><section class="ct-panel ct-pad"><h2>Have we signed a CDA with…?</h2><label class="ct-field" for="ct-cdaq">Organization<input class="ct-input" type="search" id="ct-cdaq" name="cda_query" data-ui-state="true" data-action="cda-query" value="'+esc(st.cdaQuery)+'" placeholder="Type a company, university or investor"></label>'+answer+'</section>';
 const d=st.cdaDraft||{};
 body+='<section class="ct-panel ct-pad"><h2>New CDA request</h2><form data-action="cda-submit" class="ct-drawer-form"><label class="ct-field" for="ct-cda-org">Counterparty *<select class="ct-input" id="ct-cda-org" name="counterparty_id" data-ui-state="true" data-action="cda-draft"><option value="">Choose…</option>'+orgOpts().map(o=>'<option value="'+esc(o[0])+'"'+(d.counterparty_id===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></label><label class="ct-field" for="ct-cda-p">Purpose *<input class="ct-input" id="ct-cda-p" name="purpose" data-ui-state="true" data-action="cda-draft" value="'+esc(d.purpose||'')+'" placeholder="e.g. Evaluate a licensing opportunity"></label><div class="ct-row end"><button type="submit" class="ct-btn ct-btn-primary"'+(canWrite('agreements')?'':' disabled')+'>Prepare reviewed request</button></div><p class="ct-muted">Starts as drafting. A new organization is added in Settings → Counterparties.</p></form></section></div>';
 const rows=list.slice().sort((a,b)=>orgName(a.counterparty_id).localeCompare(orgName(b.counterparty_id))||String(b.signed_on||'').localeCompare(String(a.signed_on||'')));const p=paged(rows);
 body+='<section class="ct-panel"><div class="ct-pad"><div class="ct-panel-head"><div><h2>CDAs by organization</h2><p>Direction, purpose, signature, term and the date confidentiality ends</p></div></div></div>'+(p.total?'<div class="ct-scroll" role="region" aria-label="CDAs" tabindex="0"><table class="ct-table"><thead><tr><th scope="col">Organization</th><th scope="col">Direction</th><th scope="col">Purpose</th><th scope="col">Status</th><th scope="col">Signed</th><th scope="col">Term</th><th scope="col">Confidentiality ends</th><th scope="col" class="ct-actions" aria-label="Actions"></th></tr></thead><tbody>'+p.slice.map(a=>{const c=cdaInfo(a);return '<tr><td><strong>'+esc(orgName(a.counterparty_id))+'</strong><small class="ct-sub">'+esc(a.name||'')+'</small></td><td>'+esc(c.direction?CDA_DIR_LABEL[c.direction]:'—')+'</td><td>'+esc(c.t&&c.t.purpose||'—')+'</td><td>'+pill(STATUS_LABEL[a.status]||cap(a.status),statusTone(a.status))+'</td><td>'+esc(dateLabel(a.signed_on))+'</td><td>'+esc(a.effective_date?dateLabel(a.effective_date)+' – '+dateLabel(a.expiry_date):'—')+'</td><td>'+esc(dateLabel(c.conf))+(c.conf&&inWindow(c.conf)?' '+pill(inDays(c.conf),'amber'):'')+'</td><td class="ct-actions">'+rowMenu('agreements',a.id,String(a.name||'CDA'),btn('Key terms','terms:'+a.id,'',!canWrite('terms')))+'</td></tr>';}).join('')+'</tbody></table></div>':'<div class="ct-none">No CDAs yet.</div>')+pager(p,partialLabel('agreements'))+'</section>';
 const ending=list.map(a=>({a,c:cdaInfo(a)})).filter(x=>x.c.conf&&inWindow(x.c.conf,365)).sort((x,y)=>x.c.conf.localeCompare(y.c.conf));
 body+='<section class="ct-panel ct-pad"><h2>Confidentiality ending within a year</h2>'+(ending.length?'<ul class="ct-list">'+ending.map(x=>'<li><span><strong>'+esc(orgName(x.a.counterparty_id))+'</strong><small class="ct-sub">'+esc(x.a.name||'')+'</small></span><span>'+esc(dateLabel(x.c.conf))+' ('+esc(inDays(x.c.conf))+')</span></li>').join('')+'</ul>':'<p class="ct-muted">None.</p>')+'</section>';
 return body;}

/* ---------- Pipeline ---------- */
function pipeline(){
 let body=heading()+checks();const can=writableField('agreements','status');
 body+='<div class="ct-board" role="list" aria-label="Pipeline by status">'+IN_FLIGHT.map((s,i)=>{const items=AGS.filter(a=>a.status===s).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
  return '<section class="ct-col" role="listitem" aria-label="'+esc(STATUS_LABEL[s])+'"><h2>'+esc(STATUS_LABEL[s])+' <span class="ct-count">'+items.length+'</span></h2>'+(items.length?items.map(a=>'<article class="ct-card"><strong>'+esc(a.name||'')+'</strong><small class="ct-sub">'+esc(orgName(a.counterparty_id))+' · '+esc(TYPE_LABEL[a.agreement_type]||'')+'</small><small class="ct-sub">'+esc(a.owner?'Owner: '+a.owner:'No owner')+' · '+esc(ageText(a))+'</small><div class="ct-row">'+(i>0?btn('← '+STATUS_LABEL[IN_FLIGHT[i-1]],'move:'+a.id+':'+IN_FLIGHT[i-1],'ct-btn small',!can,'aria-label="Move '+esc(a.name||'')+' back to '+esc(STATUS_LABEL[IN_FLIGHT[i-1]])+'"'):'')+(i<IN_FLIGHT.length-1?btn(STATUS_LABEL[IN_FLIGHT[i+1]]+' →','move:'+a.id+':'+IN_FLIGHT[i+1],'ct-btn small',!can,'aria-label="Move '+esc(a.name||'')+' to '+esc(STATUS_LABEL[IN_FLIGHT[i+1]])+'"'):btn('Mark signed','sign:'+a.id,'ct-btn small ct-btn-primary',!can,'aria-label="Mark '+esc(a.name||'')+' signed"'))+'</div></article>').join(''):'<p class="ct-muted">None.</p>')+'</section>';}).join('')+'</div>';
 const recent=st.signed&&AG[st.signed];
 if(recent)body+='<div class="ct-banner info"><span>After you approve the signature of <strong>'+esc(recent.name||'')+'</strong>, add its signed original so the terms can be extracted and checked.</span>'+uploadBtn(recent.id)+'</div>';
 body+='<p class="ct-muted ct-note">Status moves are reviewed. Marking signed makes the agreement active, records the signature date and prompts for the signed original. Redlining, approvals and e-signature stay in your legal tools.</p>';
 return body;}

/* ---------- Settings ---------- */
function settingsScreen(){
 let body=heading()+checks();const s=settingsRow;const show=(k,v)=>'<div class="ct-kv"><span>'+esc(k)+'</span><strong>'+esc(v)+'</strong></div>';
 body+='<div class="ct-grid2"><section class="ct-panel ct-pad"><div class="ct-panel-head"><div><h2>Contract settings</h2><p>Stored in the Contracts settings table; changes are reviewed.</p></div>'+btn(s?'Edit settings':'Create settings','edit-settings','ct-btn ct-btn-primary',!canWrite('settings'))+'</div>'+
  show('Agreement types',TYPE_ORDER.map(t=>TYPE_LABEL[t]).join(', '))+show('Obligation kinds',KIND_ORDER.map(k=>KIND_LABEL[k]).join(', '))+show('Reminder windows',REMIND.map(n=>n+' days').join(', '))+show('Weekly digest day',WEEKDAYS[DIGEST_DAY-1])+show('Default currency',CURRENCY)+(!s?'<p class="ct-muted">No settings saved yet; defaults are shown.</p>':'')+'</section>';
 const ms=MS.slice().sort((a,b)=>String(a.end_date||'').localeCompare(String(b.end_date||'')));
 body+='<section class="ct-panel ct-pad"><div class="ct-panel-head"><div><h2>Milestones</h2><p>'+(MS_LINKED?'From Programs, read only here. Used for milestone-triggered obligations and “expires before milestone”.':'Key program milestones used for milestone-triggered obligations and “expires before milestone”.')+'</p></div>'+(MS_LINKED?'':btn(icon('plus',15)+' Add milestone','add:milestones','ct-btn',!canWrite('milestones')||R.programs.unbound))+'</div>'+
  (R.milestones.unbound?'<p class="ct-muted">This app has no milestones table, so milestone links are hidden.</p>':R.milestones.unavailable?'<p class="ct-muted">Milestones are not readable for you; “expires before milestone” is hidden.</p>':ms.length?'<ul class="ct-list plain">'+ms.slice(0,20).map(m=>'<li><span><strong>'+esc(m.name||'')+'</strong><small class="ct-sub">'+esc(progName(m.program_id))+(bool(m.is_key)?' · key':'')+' · '+esc(cap(m.status))+'</small></span><span>'+esc(dateLabel(m.end_date))+(MS_LINKED?'':' '+btn('Edit','edit:milestones:'+m.id,'ct-btn small',!canWrite('milestones'),'aria-label="Edit '+esc(m.name||'milestone')+'"'))+'</span></li>').join('')+'</ul>'+(ms.length>20?'<p class="ct-muted">And '+(ms.length-20)+' more.</p>':''):'<p class="ct-muted">'+(R.programs.unbound?'Connect a programs table to enter milestones.':'No milestones yet.')+'</p>')+(integrationHint()?'<p class="ct-muted ct-note">'+integrationHint()+'</p>':'')+'</section></div>';
 const orgs=ORGS;
 body+='<section class="ct-panel"><div class="ct-pad"><div class="ct-panel-head"><div><h2>Counterparties</h2><p>Shared organizations table (core role organizations), also used by Runway, Fundraise and other apps.</p></div>'+btn(icon('plus',15)+' Add organization','add:organizations','ct-btn',!canWrite('organizations'))+'</div></div>'+(R.organizations.unbound?'<div class="ct-none">The organizations table is not connected.</div>':orgs.length?'<div class="ct-scroll" role="region" aria-label="Counterparties" tabindex="0"><table class="ct-table compact"><thead><tr><th scope="col">Organization</th><th scope="col">Type</th><th scope="col">Country</th><th scope="col">Agreements</th><th scope="col" class="ct-actions" aria-label="Actions"></th></tr></thead><tbody>'+orgs.slice(0,50).map(o=>'<tr><td><strong>'+esc(o.data.name||'')+'</strong></td><td>'+esc(cap(o.data.org_type))+'</td><td>'+esc(o.data.country||'—')+'</td><td>'+AGS.filter(a=>a.counterparty_id===o.id).length+'</td><td class="ct-actions">'+btn('Edit','edit:organizations:'+o.id,'ct-btn small',!canWrite('organizations'),'aria-label="Edit '+esc(o.data.name||'organization')+'"')+'</td></tr>').join('')+'</tbody></table></div>'+(orgs.length>50?'<p class="ct-muted ct-pad">Showing 50 of '+orgs.length+'; edit others in Database.</p>':''):'<div class="ct-none">No organizations yet.</div>')+'</section>';
 body+='<section class="ct-panel ct-pad"><h2>Access, assistants and automations</h2><ul class="ct-list plain"><li><span><strong>Access</strong>: TrialAgents sidebar → Access → Projects → this app. Contract values and terms are confidential: share read-only where appropriate. Database column rules can hide <em>total value</em> and <em>amount</em> from some members.</span></li><li><span><strong>Assistants</strong>: your Claude and ChatGPT connections are separate access rows (read, propose). They read only originals you made AI-readable and propose terms and obligations with quotes; they never verify. To enforce it, add Database column rules that deny Claude and ChatGPT writes to <em>verified</em>, <em>extraction status</em>, <em>verified by</em> and <em>verified on</em>.</span></li><li><span><strong>Automations</strong>: TrialAgents sidebar → Automations. Optional: weekly contract digest email on '+esc(WEEKDAYS[DIGEST_DAY-1])+' at 08:00 Europe/Berlin, and daily extraction of new originals on your Claude or ChatGPT runner (unverified proposals only). The app never waits for them.</span></li><li><span><strong>Layout</strong>: the gear reorders, renames or hides screens and columns through a reviewed app update.</span></li></ul></section>';
 return body;}

/* ---------- overlays ---------- */
const PEOPLE=R.people.rows.map(r=>String(r.data.name||'')).filter(Boolean).sort();
const selectLabel=(f,o)=>f.key==='agreement_type'?TYPE_LABEL[o]:f.key==='status'&&f.options===STATUSES?STATUS_LABEL[o]:f.key==='kind'?KIND_LABEL[o]:f.key==='direction'?DIR_LABEL[o]:f.key==='cda_direction'?CDA_DIR_LABEL[o]:CURRENCIES.includes(o)?o:cap(o);
function refRows(f,selfId){if(f.ref==='agreements')return AGS.filter(a=>a.id!==selfId).map(a=>({id:a.id,name:String(a.name||'')+' · '+(TYPE_LABEL[a.agreement_type]||'')}));if(f.ref==='milestones')return MS.map(m=>({id:m.id,name:String(m.name||'')+(m.end_date?' · '+dateLabel(m.end_date):'')+' · '+progName(m.program_id)}));return R[f.ref].rows.map(r=>({id:r.id,name:String(r.data.name||'Unnamed')}));}
function control(role,f,v,prefix,dataAction,selfId){const id=prefix+f.key,dis=!writableField(role,f.key)?' disabled':'';const common=' id="'+id+'" name="'+f.key+'" data-ui-state="true" data-action="'+dataAction+'"'+dis+(f.required?' required':'');v=v===null||v===undefined?'':v;
 if(f.kind==='select')return '<select class="ct-input"'+common+'><option value="">Choose…</option>'+(role==='agreements'&&f.key==='agreement_type'?TYPE_ORDER.concat(TYPES.filter(t=>!TYPE_ORDER.includes(t)&&t===v)):role==='obligations'&&f.key==='kind'?KIND_ORDER.concat(KINDS.filter(k=>!KIND_ORDER.includes(k)&&k===v)):f.options).map(o=>'<option value="'+esc(o)+'"'+(String(v)===o?' selected':'')+'>'+esc(selectLabel(f,o))+'</option>').join('')+'</select>';
 if(f.kind==='ref'){const cur=String(v||''),rows=refRows(f,selfId),keep=cur&&!rows.some(r=>r.id===cur);
  return '<select class="ct-input"'+common+'><option value="">'+(f.required?'Choose…':'None')+'</option>'+(keep?'<option value="'+esc(cur)+'" selected>'+esc(f.ref==='agreements'?agName(cur):f.ref==='milestones'?msName(cur):refName(f.ref,cur))+'</option>':'')+rows.map(r=>'<option value="'+esc(r.id)+'"'+(cur===r.id?' selected':'')+'>'+esc(r.name)+'</option>').join('')+'</select>';}
 if(f.kind==='longtext')return '<textarea class="ct-textarea"'+common+'>'+esc(v)+'</textarea>';
 if(f.kind==='boolean')return '<select class="ct-input"'+common+'><option value="false"'+(!bool(v)?' selected':'')+'>No</option><option value="true"'+(bool(v)?' selected':'')+'>Yes</option></select>';
 if(f.kind==='person'){const input='<input class="ct-input" type="text"'+common+' value="'+esc(v)+'" placeholder="Name">';if(!PEOPLE.length||dis)return input;
  return input+'<select class="ct-input" name="pick_'+f.key+'" data-ui-state="true" data-action="pick:'+f.key+'" aria-label="Pick '+esc(f.label.toLowerCase())+' from People"><option value="">Pick from People…</option>'+PEOPLE.map(n=>'<option value="'+esc(n)+'">'+esc(n)+'</option>').join('')+'</select>';}
 const type=f.kind==='date'?'date':f.kind==='number'?'number':'text';const val=f.kind==='date'?(validDate(v)||String(v)):v;
 return '<input class="ct-input" type="'+type+'"'+common+(f.kind==='number'?' step="any" min="0"':'')+' value="'+esc(val)+'">';}
const drawer=(title,eyebrow,bodyHtml,foot,formAction)=>'<div class="ct-overlay"><section class="ct-drawer" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="ct-drawer-head"><div><div class="ct-eyebrow">'+esc(eyebrow)+'</div><h2>'+esc(title)+'</h2></div>'+btn(icon('close',17),formAction==='close-details'?'close-details':'cancel-modal','ct-icon-btn',false,'aria-label="Close"')+'</div>'+(formAction&&formAction!=='close-details'?'<form data-action="'+esc(formAction)+'" class="ct-drawer-form"><div class="ct-drawer-body">'+bodyHtml+'</div><div class="ct-drawer-foot">'+foot+'</div></form>':'<div class="ct-drawer-body">'+bodyHtml+'</div><div class="ct-drawer-foot">'+foot+'</div>')+'</section></div>';
const submit=(text,ok)=>'<button type="submit" class="ct-btn ct-btn-primary"'+(ok?'':' disabled')+'>'+esc(text)+'</button>';
function editorPanel(){const x=st.editor;if(!x)return '';const role=x.role,m=roleMap[role];
 const title=(x.mode==='edit'?'Edit ':x.mode==='duplicate'?'Duplicate ':'Add ')+ROLE_LABEL[role];
 const fields=S[role].filter(f=>!['frozen','computed'].includes(f.kind)&&f.key!=='archived'&&m&&m.fields[f.key]&&!(f.kind==='ref'&&R[f.ref]&&R[f.ref].unbound));
 const changed=JSON.stringify(x.draft)!==x.initial;
 const lead=role==='obligations'?'<div class="ct-banner info">An obligation you add or edit here is your own entry and counts as verified. Assistant proposals arrive unverified and are verified in the review.</div>':role==='agreements'&&x.draft.parent_id?'<div class="ct-banner info">Child of '+esc(agName(x.draft.parent_id))+'. Its value counts in that family per currency.</div>':'';
 return drawer(title,'Reviewed data change','<div class="ct-banner info">Edits are proposals until you approve the TrialAgents review. Opening this form changes nothing.</div>'+lead+'<div class="ct-pair">'+fields.map(f=>'<label class="ct-field'+(f.kind==='longtext'?' wide':'')+'" for="ct-f-'+f.key+'">'+esc(f.label)+(f.required?' *':'')+control(role,f,x.draft[f.key],'ct-f-','draft:'+f.key,x.id)+'</label>').join('')+'</div>',
  '<span class="ct-muted">'+(changed?'Unsaved changes':'No changes yet')+'</span>'+btn('Cancel','cancel-modal')+submit('Prepare reviewed save',canWrite(role)),'save-record');}
function termsPanel(){const x=st.terms;if(!x)return '';const a=AG[x.agreementId];if(!a)return '';const t=termsOf(a.id),m=roleMap.terms;
 const fields=S.terms.filter(f=>!['frozen','computed'].includes(f.kind)&&m&&m.fields[f.key]&&(f.key!=='cda_direction'||a.agreement_type==='cda_nda'||x.draft.cda_direction));
 const d=x.draft,nd=noticeDeadline(a.expiry_date,d.notice_days,d.renewal),ce=confidentialityEnd(a.expiry_date,a.effective_date,d.confidentiality_years);
 const quotes=parseJSON(t&&t.source_quotes)||{};
 return drawer('Key terms: '+String(a.name||''),'Reviewed data change','<div class="ct-banner info">The notice deadline and confidentiality end are calculated from the agreement dates and stored when you save.'+(t&&t.extraction_status==='proposed'?' These terms were proposed by an assistant and are unverified; editing them does not verify them.':'')+'</div><div class="ct-pair">'+fields.map(f=>'<label class="ct-field'+(f.kind==='longtext'?' wide':'')+'" for="ct-t-'+f.key+'">'+esc(f.label)+control('terms',f,d[f.key],'ct-t-','terms-draft',null)+(quotes[f.key]&&quotes[f.key].quote?'<small class="ct-quote">“'+esc(quotes[f.key].quote)+'”'+(quotes[f.key].page?' (p. '+esc(quotes[f.key].page)+')':'')+'</small>':'')+'</label>').join('')+'</div>'+
  '<div class="ct-kvs"><div class="ct-kv"><span>Notice deadline</span><strong>'+esc(nd?dateLabel(nd):'— (needs expiry, notice days and automatic or option renewal)')+'</strong></div><div class="ct-kv"><span>Confidentiality end</span><strong>'+esc(ce?dateLabel(ce):'— (needs confidentiality years)')+'</strong></div></div>',
  btn('Cancel','cancel-modal')+submit('Prepare reviewed save',canWrite('terms')),'save-terms');}
function documentBlock(a){const t=termsOf(a.id);const d=docOf(t);let html='<h3 class="ct-h3">Signed original</h3>';
 if(d&&!d.missing)html+='<div class="ct-kv"><span>Document</span><strong>'+esc(d.filename)+' · v'+esc(d.version)+(d.latest?'':' (a newer version exists)')+'</strong></div><div class="ct-kv"><span>AI-readable</span><strong>'+(d.aiReadable?'Yes':'No — assistants cannot extract from it')+'</strong></div><div class="ct-kv"><span>Text extraction</span><strong>'+esc(cap(d.extraction))+'</strong></div>';
 else if(d&&d.missing)html+='<p class="ct-muted">'+(d.state==='preview'?'Documents show in the saved app.':d.state==='unavailable'?'Documents are not available for you here.':'The attached original is not visible to you (restricted, or not AI-readable for this assistant).')+'</p>';
 else html+='<p class="ct-muted">No signed original attached.</p>';
 if(t&&t.document_link)html+='<div class="ct-kv"><span>External link</span><strong>'+esc(t.document_link)+'</strong></div>';
 html+='<div class="ct-kv"><span>Extraction</span><strong>'+esc(t?cap(t.extraction_status||'none'):'None')+(t&&t.extraction_status==='verified'&&t.verified_by?' by '+esc(t.verified_by)+' on '+esc(dateLabel(validDate(t.verified_on))):'')+'</strong></div>';
 html+='<div class="ct-row">'+uploadBtn(a.id,d&&!d.missing?'Upload a new original':'Upload the signed original','ct-btn small')+btn('Attach a saved original','attach:'+a.id,'ct-btn small',!canWrite('terms')||!inp.saved)+'</div>';
 return html;}
function agreementDetail(a){const t=termsOf(a.id),dts=storedOrComputed(t,a),obs=OBS.filter(o=>o.agreement_id===a.id),kids=(CHILDREN[a.id]||[]).map(id=>AG[id]),root=rootOf(a.id),eb=expiresBefore(a);
 const kv=(k,v)=>'<div class="ct-kv"><span>'+esc(k)+'</span><strong>'+esc(v===null||v===undefined||v===''?'—':v)+'</strong></div>';
 let html=kv('Type',TYPE_LABEL[a.agreement_type]||label(a.agreement_type))+kv('Counterparty',orgName(a.counterparty_id))+kv('Status',STATUS_LABEL[a.status]||cap(a.status))+(R.programs.unbound?'':kv('Program',progName(a.program_id)))+(R.studies.unbound?'':kv('Study',a.study_id?refName('studies',a.study_id):'—'))+kv('Effective',dateLabel(a.effective_date))+kv('Expiry',dateLabel(a.expiry_date))+kv('Signed on',dateLabel(a.signed_on))+kv('Total value',a.total_value===null?'—':money(a.total_value,a.currency))+kv('Owner',a.owner);
 if(eb.length)html+='<div class="ct-banner bad">Expires before the key milestone <strong>'+esc(eb[0].name||'')+'</strong> ('+esc(dateLabel(eb[0].end_date))+'). Plan a renewal or extension.</div>';
 html+='<h3 class="ct-h3">Key terms</h3>'+(t?kv('Renewal',t.renewal?cap(t.renewal)+(num(t.renewal_term_months)?' · '+plural(num(t.renewal_term_months),'month'):''):'—')+kv('Notice period',num(t.notice_days)!==null?plural(num(t.notice_days),'day'):'—')+kv('Notice deadline',dts.notice?dateLabel(dts.notice)+' ('+inDays(dts.notice)+')':'—')+(a.agreement_type==='cda_nda'||t.confidentiality_years?kv('Confidentiality',num(t.confidentiality_years)!==null?plural(num(t.confidentiality_years),'year'):'—')+kv('Confidentiality ends',dateLabel(dts.conf)):'')+(t.cda_direction?kv('CDA direction',CDA_DIR_LABEL[t.cda_direction]):'')+kv('Purpose',t.purpose)+kv('Governing law',t.governing_law)+(t.notes?'<p class="ct-commentary">'+esc(t.notes)+'</p>':''):'<p class="ct-muted">No key terms recorded yet.</p>')+
  '<div class="ct-row">'+btn(t?'Edit key terms':'Add key terms','terms:'+a.id,'ct-btn small',!canWrite('terms'))+(dts.notice||a.expiry_date?btn('Record renewal decision','renewal:'+a.id,'ct-btn small',!canWrite('terms')):'')+((t&&t.extraction_status==='proposed')||obs.some(o=>!o.verified)?btn('Verify proposals','review:'+a.id,'ct-btn small ct-btn-primary',!canWrite('terms')&&!canWrite('obligations')):'')+'</div>';
 html+=documentBlock(a);
 html+='<h3 class="ct-h3">Family</h3>'+(a.parent_id?kv('Under',agName(a.parent_id)):'')+(kids.length?'<ul class="ct-list plain">'+kids.map(k=>'<li><span>'+esc(k.name||'')+' <small class="ct-sub">'+esc(TYPE_LABEL[k.agreement_type]||'')+'</small></span><span>'+(k.total_value===null?'—':esc(money(k.total_value,k.currency)))+'</span></li>').join('')+'</ul>':'')+((CHILDREN[root]||[]).length?(()=>{const f=familyValue(root);return kv('Family value',exact?money(f.total,f.primary)+(f.others.length?' + '+f.others.map(c=>money(f.by[c],c)).join(' + '):''):'Withheld: partial read');})():'<p class="ct-muted">Not part of a family.</p>')+'<div class="ct-row">'+btn('Add child agreement','add-child:'+a.id,'ct-btn small',!canWrite('agreements'))+'</div>';
 html+='<h3 class="ct-h3">Obligations</h3>'+(obs.length?'<ul class="ct-list plain">'+obs.map(o=>'<li><span><strong>'+esc(o.title||'')+'</strong> <small class="ct-sub">'+esc(DIR_LABEL[o.direction]||'')+' · '+esc(KIND_LABEL[o.kind]||'')+(nextDue(o)?' · '+dateLabel(nextDue(o)):o.trigger?' · '+o.trigger:'')+'</small>'+(o.source_quote?'<small class="ct-quote">“'+esc(String(o.source_quote).slice(0,300))+'”'+(o.source_page?' (p. '+esc(o.source_page)+')':'')+'</small>':'')+'</span><span>'+verifiedPill(o.verified)+' '+pill(cap(o.status),obTone(o.status))+'</span></li>').join('')+'</ul>':'<p class="ct-muted">No obligations.</p>')+'<div class="ct-row">'+btn(icon('plus',15)+' Add obligation','add:obligations','ct-btn small',!canWrite('obligations'))+'</div>';
 if(!R.people.unbound&&a.counterparty_id){const ppl=R.people.rows.filter(p=>p.data.organization_id===a.counterparty_id);html+='<h3 class="ct-h3">Contacts at '+esc(orgName(a.counterparty_id))+'</h3>'+(ppl.length?'<ul class="ct-list plain">'+ppl.map(p=>'<li><span>'+esc(p.data.name||'')+' <small class="ct-sub">'+esc(p.data.title||'')+'</small></span><span>'+esc(p.data.email||'')+'</span></li>').join('')+'</ul>':'<p class="ct-muted">No contacts.</p>')+'<div class="ct-row">'+btn('Add contact','add:people','ct-btn small',!canWrite('people'))+'</div>';}
 html+='<h3 class="ct-h3">History</h3><p class="ct-muted">Record '+esc(a.id)+' · version '+esc(a.version)+(t?' · key terms version '+esc(t.version):'')+'. Every reviewed change and who approved it is in Database → record history.</p>';
 return html;}
function detailPanel(){const d=st.detail;if(!d||!R[d.role])return '';const r=lookup(d.role,d.id);if(!r)return '';
 if(d.role==='agreements'&&AG[d.id]){const a=AG[d.id];return drawer(String(a.name||'Agreement'),'Agreement · '+(STATUS_LABEL[a.status]||''),agreementDetail(a),btn('Close','close-details')+btn('Edit','edit:agreements:'+a.id,'ct-btn ct-btn-primary',!canWrite('agreements')),'close-details');}
 const rows=S[d.role].filter(f=>roleMap[d.role]&&roleMap[d.role].fields[f.key]).map(f=>{let v=r.data[f.key];if(f.kind==='ref')v=f.ref==='agreements'?agName(v):f.ref==='milestones'?msName(v):refName(f.ref,v);else if(f.kind==='date')v=validDate(v)?dateLabel(validDate(v)):v;else if(f.kind==='boolean'||f.key==='verified')v=bool(v)?'Yes':'No';else if(f.kind==='select')v=selectLabel(f,v);return '<div class="ct-kv"><span>'+esc(f.label.replace(/ \(.*\)$/,''))+'</span><strong>'+esc(v===null||v===undefined||v===''?'—':v)+'</strong></div>';}).join('');
 return drawer(String(r.data.name||r.data.title||'Details'),cap(ROLE_LABEL[d.role]),rows+'<p class="ct-muted">Record ID '+esc(r.id)+' · version '+esc(r.version)+'</p>',btn('Close','close-details')+btn('Edit','edit:'+d.role+':'+d.id,'ct-btn ct-btn-primary',!canWrite(d.role)),'close-details');}
function confirmPanel(){const c=st.confirm;if(!c)return '';const box=(lbl,h,body,actions)=>'<div class="ct-overlay center"><section class="ct-modal" role="alertdialog" aria-modal="true" aria-label="'+esc(lbl)+'"><h2>'+esc(h)+'</h2>'+body+'<div class="ct-row end">'+btn('Cancel','cancel-modal')+actions+'</div></section></div>';
 if(c.kind==='archive'){const r=lookup(c.role,c.id);return box('Archive record','Archive this '+ROLE_LABEL[c.role]+'?','<p><strong>'+esc(r?(r.data.name||r.data.title||''):'')+'</strong> is hidden from the register, totals and digests after you approve the review. Its history is kept.</p>',btn('Review archive','confirm-archive','ct-btn ct-btn-danger'));}
 if(c.kind==='ob-status'){const o=OBS.find(x=>x.id===c.id);return box('Change obligation status','Mark this obligation '+c.to+'?','<p><strong>'+esc(o?o.title:'')+'</strong>'+(o&&!o.verified?' is still unverified; changing its status does not verify it.':'')+'</p>',btn('Review change','confirm-ob-status','ct-btn ct-btn-primary'));}
 if(c.kind==='move'){const a=AG[c.id];return box('Move agreement',String(a?a.name:'Agreement')+' → '+STATUS_LABEL[c.to]+'?','<p>The status change and its date are saved after you approve the review. Days in status restart today.</p>',btn('Review move','confirm-move','ct-btn ct-btn-primary'));}
 return '';}
function quoteCheck(versionId,quote,page){if(!inp.saved||!versionId||!quote||String(quote).trim().length<8||callsLeft<=2)return null;try{callsLeft--;return tools.call('documents.quote',{versionId,quote:String(quote).slice(0,2000),page:page||null});}catch(e){return {error:true};}}
function quoteState(q){if(!q)return '<span class="ct-muted">Quote not checked</span>';if(q.error)return pill('Document not readable for you','amber');if(q.found===null)return pill('Text not extracted yet ('+(q.status||'pending')+')','amber');if(!q.found)return pill('Quote not found in the original','red');return q.onPage===false?pill('Found, but on page '+q.pages.join(', '),'amber'):pill('Quote found'+(q.page?' on page '+q.page:''),'green');}
function reviewPanel(){const r=st.review;if(!r)return '';const a=AG[r.agreementId];if(!a)return '';const t=r.termsId?termsOf(a.id):null,quotes=parseJSON(t&&t.source_quotes)||{},ver=t&&t.document_version_id||'';
 let checked=0;const check=(vid,q,p)=>checked++<15?quoteCheck(vid,q,p):null;
 let html='<div class="ct-banner info">Proposed by your connected assistant from the signed original. Check each value against its quote. Only what you verify here counts as confirmed; rejected obligations are archived.</div>';
 if(t){const fields=S.terms.filter(f=>['select','number','text','longtext'].includes(f.kind)&&f.key!=='notes'&&t[f.key]!==undefined&&t[f.key]!==null&&t[f.key]!=='');
  html+='<h3 class="ct-h3">Key terms</h3><div class="ct-scroll" role="region" aria-label="Proposed key terms" tabindex="0"><table class="ct-table compact"><thead><tr><th scope="col">Term</th><th scope="col">Proposed value</th><th scope="col">Source</th></tr></thead><tbody>'+fields.map(f=>{const q=quotes[f.key];return '<tr><th scope="row">'+esc(f.label)+'</th><td>'+esc(f.kind==='select'?selectLabel(f,t[f.key]):t[f.key])+'</td><td>'+(q&&q.quote?'<span class="ct-quote">“'+esc(q.quote)+'”'+(q.page?' (p. '+esc(q.page)+')':'')+'</span> '+quoteState(check(ver,q.quote,num(q.page))):pill('No quote','amber'))+'</td></tr>';}).join('')+'</tbody></table></div>'+
   '<div class="ct-kv"><span>Agreement dates used</span><strong>effective '+esc(dateLabel(a.effective_date))+' · expiry '+esc(dateLabel(a.expiry_date))+'</strong></div><label class="ct-field" for="ct-r-terms">Key terms<select class="ct-input" id="ct-r-terms" name="terms_decision" data-ui-state="true" data-action="review-draft"><option value="verify"'+(r.draft.terms==='verify'?' selected':'')+'>Verify these terms</option><option value=""'+(r.draft.terms!=='verify'?' selected':'')+'>Leave unverified for now</option></select></label>';}
 const obs=r.obs.map(x=>OBS.find(o=>o.id===x.id)).filter(Boolean);
 if(obs.length)html+='<h3 class="ct-h3">Proposed obligations</h3><ul class="ct-list">'+obs.map(o=>'<li class="ct-review-item"><span><strong>'+esc(o.title||'')+'</strong><small class="ct-sub">'+esc([DIR_LABEL[o.direction],KIND_LABEL[o.kind],o.due_date?dateLabel(o.due_date):o.trigger,o.recurrence&&o.recurrence!=='none'?cap(o.recurrence):'',o.amount!==null?money(o.amount,o.currency):''].filter(Boolean).join(' · '))+'</small>'+(o.source_quote?'<span class="ct-quote">“'+esc(o.source_quote)+'”'+(o.source_page?' (p. '+esc(o.source_page)+')':'')+'</span> '+quoteState(check(o.source_document_version_id||ver,o.source_quote,o.source_page)):pill('No quote','amber'))+'</span><label class="ct-field inline" for="ct-r-'+esc(o.id)+'">Decision<select class="ct-input" id="ct-r-'+esc(o.id)+'" name="ob_'+esc(o.id)+'" data-ui-state="true" data-action="review-draft">'+[['verify','Verify'],['skip','Leave unverified'],['reject','Reject (archive)']].map(x=>'<option value="'+x[0]+'"'+((r.decisions[o.id]||'verify')===x[0]?' selected':'')+'>'+x[1]+'</option>').join('')+'</select></label></li>').join('')+'</ul>';
 html+='<label class="ct-field" for="ct-r-who">Verified by (your name) *<input class="ct-input" id="ct-r-who" name="verified_by" data-ui-state="true" data-action="review-draft" value="'+esc(r.draft.verified_by||'')+'" placeholder="Your name"></label>';
 return drawer('Verify: '+String(a.name||''),'Human verification · reviewed',html,btn('Cancel','cancel-modal')+submit('Prepare reviewed verification',canWrite('terms')||canWrite('obligations')),'review-submit');}
function signPanel(){const s=st.sign;if(!s)return '';const a=AG[s.id];if(!a)return '';const d=s.draft,inpf=(n,l,type,v)=>'<label class="ct-field" for="ct-s-'+n+'">'+esc(l)+'<input class="ct-input" type="'+type+'" id="ct-s-'+n+'" name="'+n+'" data-ui-state="true" data-action="sign-draft" value="'+esc(v||'')+'"'+(type==='number'?' min="0" step="any"':'')+'></label>';
 const ce=confidentialityEnd(validDate(d.expiry_date),validDate(d.effective_date),d.confidentiality_years);
 return drawer('Mark signed: '+String(a.name||''),'Reviewed status change','<div class="ct-banner info">The agreement becomes active with these dates. After you approve, add the signed original so its terms can be extracted and verified.</div><div class="ct-pair">'+inpf('signed_on','Signed on *','date',d.signed_on)+inpf('effective_date','Effective date','date',d.effective_date)+inpf('expiry_date','Expiry date','date',d.expiry_date)+(a.agreement_type==='cda_nda'?inpf('confidentiality_years','Confidentiality (years)','number',d.confidentiality_years)+'<label class="ct-field" for="ct-s-dir">CDA direction<select class="ct-input" id="ct-s-dir" name="cda_direction" data-ui-state="true" data-action="sign-draft">'+CDA_DIR.map(x=>'<option value="'+x+'"'+(d.cda_direction===x?' selected':'')+'>'+esc(CDA_DIR_LABEL[x])+'</option>').join('')+'</select></label>':'')+'</div>'+(a.agreement_type==='cda_nda'?'<div class="ct-kv"><span>Confidentiality end</span><strong>'+esc(ce?dateLabel(ce):'—')+'</strong></div>':''),
  btn('Cancel','cancel-modal')+submit('Prepare reviewed signature',writableField('agreements','status')),'sign-submit');}
function attachPanel(){const c=st.attach;if(!c)return '';const a=AG[c.agreementId];if(!a)return '';const d=docs();const chosen=d.list.find(x=>x.versionId===c.versionId);
 const body=d.state==='preview'?'<p class="ct-muted">Documents are available in the saved app.</p>':d.state==='unavailable'?'<p class="ct-muted">Documents are not available for you here.</p>':'<label class="ct-field" for="ct-attach">Saved original<select class="ct-input" id="ct-attach" name="version_id" data-ui-state="true" data-action="attach-pick"><option value="">Choose…</option>'+d.list.filter(x=>x.latest||x.versionId===c.versionId).map(x=>'<option value="'+esc(x.versionId)+'"'+(x.versionId===c.versionId?' selected':'')+'>'+esc(x.filename+' · v'+x.version+' · '+x.uploadedOn+(x.aiReadable?'':' · not AI-readable'))+'</option>').join('')+'</select></label>'+(chosen?'<div class="ct-kv"><span>AI-readable</span><strong>'+(chosen.aiReadable?'Yes: your assistant can propose its terms':'No: assistants cannot extract from it')+'</strong></div><div class="ct-kv"><span>Text extraction</span><strong>'+esc(cap(chosen.extraction))+'</strong></div>':'')+(d.state==='partial'?'<p class="ct-muted">Only the 200 newest versions are listed.</p>':'');
 return '<div class="ct-overlay center"><section class="ct-modal" role="dialog" aria-modal="true" aria-label="Attach signed original"><h2>Attach the signed original to '+esc(a.name||'')+'</h2>'+body+'<div class="ct-row end">'+btn('Cancel','cancel-modal')+uploadBtn(a.id,'Upload instead','ct-btn')+btn('Review attachment','confirm-attach','ct-btn ct-btn-primary',!chosen||!canWrite('terms'))+'</div></section></div>';}
function renewalPanel(){const r=st.renewal;if(!r)return '';const a=AG[r.id];if(!a)return '';const t=termsOf(a.id),dts=storedOrComputed(t,a);
 return drawer('Renewal decision: '+String(a.name||''),'Reviewed note','<div class="ct-banner info">'+(dts.notice?'Notice deadline '+esc(dateLabel(dts.notice))+' ('+esc(inDays(dts.notice))+'). ':'')+'Expiry '+esc(dateLabel(a.expiry_date))+'. The decision is added to the key-term notes; renegotiate also moves the agreement to In negotiation. Give any notice through your usual channel.</div><label class="ct-field" for="ct-rn-d">Decision *<select class="ct-input" id="ct-rn-d" name="decision" data-ui-state="true" data-action="renewal-draft"><option value="">Choose…</option>'+DECISIONS.map(x=>'<option value="'+x+'"'+(r.draft.decision===x?' selected':'')+'>'+esc(cap(x))+'</option>').join('')+'</select></label><label class="ct-field wide" for="ct-rn-n">Note<textarea class="ct-textarea" id="ct-rn-n" name="note" data-ui-state="true" data-action="renewal-draft">'+esc(r.draft.note||'')+'</textarea></label>',
  btn('Cancel','cancel-modal')+submit('Prepare reviewed decision',canWrite('terms')),'renewal-submit');}
function ddPanel(){const f=st.dd;if(!f)return '';const r=ddList(f);
 return drawer('Due-diligence list','Copy for a data room or questionnaire','<form data-action="dd-draft"><fieldset class="ct-fieldset"><legend>Types (none = all enabled)</legend>'+TYPE_ORDER.map(t=>'<label class="ct-check"><input type="checkbox" name="type_'+t+'" value="true" data-ui-state="true" data-action="dd-draft"'+(f.types.includes(t)?' checked':'')+'> '+esc(TYPE_LABEL[t])+'</label>').join('')+'</fieldset><fieldset class="ct-fieldset"><legend>Statuses</legend>'+STATUSES.map(s=>'<label class="ct-check"><input type="checkbox" name="status_'+s+'" value="true" data-ui-state="true" data-action="dd-draft"'+(f.statuses.includes(s)?' checked':'')+'> '+esc(STATUS_LABEL[s])+'</label>').join('')+'</fieldset><label class="ct-field" for="ct-dd-min">Materiality: minimum total value (any currency)<input class="ct-input" type="number" min="0" step="any" id="ct-dd-min" name="min" data-ui-state="true" data-action="dd-draft" value="'+esc(f.min||'')+'"></label></form><p class="ct-muted">'+plural(r.rows.length,'agreement')+'. Copy this text (Markdown) into the data room index or questionnaire.</p><label class="ct-field wide" for="ct-dd-text">Due-diligence list<textarea class="ct-textarea mono" id="ct-dd-text" readonly data-ui-state="true" rows="14">'+esc(r.text)+'</textarea></label>',btn('Close','cancel-modal'),null);}

/* ---------- page ---------- */
const rail='<aside class="ct-rail"><div class="ct-brand"><strong>Contracts</strong><span>Agreements, dates and obligations</span></div><nav class="ct-nav" aria-label="Contracts screens">'+sections.map(s=>btn('<span class="ct-ico">'+icon(s.id)+'</span><span class="ct-nav-label">'+esc(s.label)+'</span>','nav:'+s.id,'',false,'aria-current="'+(st.section===s.id?'page':'false')+'" aria-label="'+esc(s.label)+'"')).join('')+'</nav><div class="ct-rail-foot">'+esc(cfg.demoLabel?'Fictional demo data':'Authorized records only')+'<br>Every change is reviewed.</div></aside>';
let main='';try{main=st.section==='overview'?overview():st.section==='register'?register():st.section==='families'?families():st.section==='obligations'?obligations():st.section==='cdas'?cdas():st.section==='pipeline'?pipeline():settingsScreen();}catch(e){main=heading()+'<div class="ct-banner bad" role="alert">This screen could not be shown: '+esc(String(e&&e.message||e))+'</div>';}
const notice=st.notice?'<div class="ct-banner info ct-notice" role="status"><span>'+esc(st.notice)+'</span>'+btn('Dismiss','clear-notice','ct-btn small')+'</div>':'';
const previewNote=!inp.saved?'<div class="ct-banner info">Preview: save the app to record data and use documents. Fictional or unsaved previews never write to your workspace.</div>':'';
let overlays='';try{overlays=editorPanel()+termsPanel()+detailPanel()+confirmPanel()+reviewPanel()+signPanel()+attachPanel()+renewalPanel()+ddPanel();}catch(e){overlays='';note('This panel could not be shown: '+String(e&&e.message||e).slice(0,300));}
// The page behind an open dialog is inert for keyboard and assistive technology.
const html='<div class="ct-shell"'+(overlays?' inert':'')+'>'+rail+'<main class="ct-main">'+previewNote+notice+main+'<p class="ct-foot">'+(cfg.demoLabel?'Fictional records for demonstration only. Opening this preview creates no records, emails or automations.':'A register of agreements, not legal advice. Assistant proposals stay unverified until a person verifies them. All writes are reviewed in TrialAgents.')+'</p></main></div>'+overlays;
const css=typeof CONTRACTS_CSS==='string'?CONTRACTS_CSS:'';
return {html,css,state:st};
