const templateLayoutSchema={"screens":[{"id":"overview","label":"Overview"},{"id":"pipeline","label":"Pipeline"},{"id":"partners","label":"Partners"},{"id":"conferences","label":"Conferences"},{"id":"activity","label":"Activity"},{"id":"research","label":"Research"},{"id":"settings","label":"Settings"}],"groups":{"pipeline":[{"id":"name","label":"Opportunity"},{"id":"partner","label":"Partner"},{"id":"asset","label":"Asset"},{"id":"direction","label":"Direction"},{"id":"stage","label":"Stage"},{"id":"owner","label":"Owner"},{"id":"next","label":"Next step"},{"id":"fit","label":"Fit"},{"id":"tags","label":"Tags"}],"partners":[{"id":"partner","label":"Partner"},{"id":"type","label":"Type"},{"id":"region","label":"Country or region"},{"id":"assets","label":"Assets"},{"id":"open","label":"Open"},{"id":"priority","label":"Priority"},{"id":"last","label":"Last contact"}]}};
/* TrialAgents Partnerships 2.0.0 (life.partnership-tracker) | frontend-js function body. No DOM, network or browser storage.
 * Returns {html,css,state}. Records come only from authorized bindings; every record write is one exact records.propose batch that a person
 * approves in the TrialAgents review (assistants only ever propose). The app never sends email or any message to partners: outreach stays
 * personal. Contracts (agreements, core fields, read-only) and Data Room (dataroom.v1 access and engagement, an in-app integration) are optional:
 * without them the CDA, data room, term sheet and agreement links stay manual references and nothing else changes.
 */

const cfg=typeof templateConfiguration==='object'&&templateConfiguration?templateConfiguration:{};
const bindings=Array.isArray(templateBindings)?templateBindings:[];
const inp=input||{};
const event=inp.event||{kind:'open',action:'',value:null,form:{}};
const action=String(event.action||'');
const form=event.form&&typeof event.form==='object'?event.form:{};
const isAct=event.kind==='click'||event.kind==='submit';

const esc=v=>String(v===null||v===undefined?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const has=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
const num=(v,otherwise=null)=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v))?Number(v):otherwise;
const bool=v=>v===true||v==='true'||v==='on'||v==='1';
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const validDate=v=>{const t=String(v||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(t))return '';const d=new Date(t+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===t?t:'';};
const dayNo=d=>Math.round(Date.UTC(Number(d.slice(0,4)),Number(d.slice(5,7))-1,Number(d.slice(8,10)))/86400000);
const addDays=(d,n)=>d?new Date((dayNo(d)+Math.round(n))*86400000).toISOString().slice(0,10):'';
const diffDays=(a,b)=>dayNo(b)-dayNo(a);
const weekday=d=>new Date(dayNo(d)*86400000).getUTCDay();
const dateLabel=d=>d?Number(d.slice(8,10))+' '+MONTHS[Number(d.slice(5,7))-1]+' '+d.slice(0,4):'—';
const shortDate=d=>d?Number(d.slice(8,10))+' '+MONTHS[Number(d.slice(5,7))-1]:'—';
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const plural=(n,w)=>n+' '+(w==='person'?(Math.abs(n)===1?'person':'people'):w==='opportunity'?(Math.abs(n)===1?'opportunity':'opportunities'):w+(Math.abs(n)===1?'':'s'));
const label=v=>String(v===null||v===undefined||v===''?'—':v).replace(/_/g,' ');
const cap=s=>{s=label(s);return s.charAt(0).toUpperCase()+s.slice(1);};
const parseJSON=v=>{if(v&&typeof v==='object')return v;try{const x=JSON.parse(String(v||''));return x&&typeof x==='object'?x:null;}catch(e){return null;}};
const list=v=>String(v||'').split(',').map(x=>x.trim()).filter(Boolean);
const lines=v=>String(v||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||''));
const pct=n=>n===null||n===undefined||!Number.isFinite(n)?'—':Math.round(n*100)+'%';
const norm=s=>String(s||'').toLowerCase().replace(/\(fictional\)/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\b(inc|ltd|gmbh|ag|sa|plc|llc|bv|the)\b/g,'').trim();
const textOf=(v,max)=>String(v===null||v===undefined?'':v).trim().slice(0,max||300);
const ver=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?'':' v'+Number(v);
const httpUrl=v=>/^https?:\/\/[^\s"'<>]+$/i.test(String(v||''))?String(v):'';
const words=t=>String(t||'').split(/\s+/).filter(w=>/[A-Za-z0-9]/.test(w)).length;

/* Standard stages (in order), directions and lists. */
const STAGES=['identified','contacted','non_confidential','cda','confidential_evaluation','term_sheet','exclusivity_diligence','signed','lost','on_hold'];
const PIPE=STAGES.slice(0,8),CLOSED=['signed','lost','on_hold'];
const STAGE_LABEL={identified:'Identified',contacted:'Contacted',non_confidential:'Non-confidential',cda:'CDA',confidential_evaluation:'Confidential evaluation',term_sheet:'Term sheet',exclusivity_diligence:'Exclusivity and diligence',signed:'Signed',lost:'Lost',on_hold:'On hold'};
const STAGE_SHORT={identified:'Identified',contacted:'Contacted',non_confidential:'Non-conf.',cda:'CDA',confidential_evaluation:'Evaluation',term_sheet:'Term sheet',exclusivity_diligence:'Diligence',signed:'Signed',lost:'Lost',on_hold:'On hold'};
const STAGE_HINT={identified:'A target with a fit rationale; nobody contacted yet.',contacted:'First outreach or a meeting request, sent by a person from their own mailbox.',non_confidential:'Non-confidential meeting or materials shared.',cda:'CDA being agreed or signed (Contracts).',confidential_evaluation:'Confidential data shared, often in a Data Room room.',term_sheet:'Term sheet in negotiation (filed in Contracts).',exclusivity_diligence:'Exclusivity agreed; full diligence.',signed:'Agreement signed: won.',lost:'Declined or stopped, with a reason.',on_hold:'Paused, with a reason.'};
const DIRS=['out_license','in_license','co_development','research_collaboration','academic','platform','other'];
const DIR_LABEL={out_license:'Out-licensing',in_license:'In-licensing',co_development:'Co-development',research_collaboration:'Research collaboration',academic:'Academic',platform:'Platform',other:'Other'};
const SOURCES=['research','conference','inbound','outbound','referral','other'];
const PRI=['high','medium','low'];
const ACT_KINDS=['meeting','call','email','conference_meeting','material_shared','note'];
const ACT_LABEL={meeting:'Meeting',call:'Call',email:'Email (sent personally)',conference_meeting:'Conference meeting',material_shared:'Material shared',note:'Note'};
const MEET=['requested','confirmed','held','declined','cancelled'];
const FU_STATUS=['open','done','cancelled'];
const CONF_STATUS=['planning','live','done'];const PLATFORMS=['partneringone','bio_one_on_one','other','none'];
const PLATFORM_LABEL={partneringone:'partneringONE',bio_one_on_one:'BIO One-on-One',other:'Other',none:'None'};
const SIG_KINDS=['deal','trial','pipeline','financing','people','news','target_suggestion'];
const SIG_LABEL={deal:'Deal',trial:'Trial result',pipeline:'Pipeline change',financing:'Financing',people:'People move',news:'News',target_suggestion:'Target suggestion'};
const SIG_STATUS=['new','reviewed','dismissed','accepted'];
const DEAL_TYPES=['license','co_development','option','research_collaboration','platform','acquisition','other'];
const PROFILE_STATUS=['active','paused','done'];
const LAYOUTS=['board','list','funnel'];
const CADENCE=['daily','weekly','monthly'];const WD=['mon','tue','wed','thu','fri','sat','sun'];const WD_NO={sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6};
const WD_LABEL={mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday',sun:'Sunday'};
const LOST_DEFAULT=['No strategic fit','No budget','Too early: more data needed','Terms not agreed','Chose a competing asset','Partner reorganisation','No response','Other'];
const STD_CATS=[{name:'Conference',multiple:true,values:[]},{name:'Channel',multiple:false,values:['Conference','Outbound','Inbound','Referral','Research']},{name:'Asset group',multiple:false,values:[]}];
const ORG_TYPES=['company','investor','cro','cdmo','site','funder','partner','agency','other'];
const MOD=['small_molecule','biologic','antibody','cell_therapy','gene_therapy','rna','vaccine','device','other'];
const PSTAGE=['discovery','preclinical','ind_enabling','phase_1','phase_2','phase_3','registration','approved'];const PSTATUS=['active','paused','stopped','partnered'];
const GS=['invited','active','revoked','expired'];const RP=['financing','licensing','partnering','m_and_a','other'];
const AG_STATUS={drafting:'Drafting',in_negotiation:'In negotiation',out_for_signature:'Out for signature',active:'Signed, active',expired:'Expired',terminated:'Terminated',superseded:'Superseded'};

const OPT={ORG:ORG_TYPES,MOD,PSTAGE,PSTATUS,DIR:DIRS,PRI,SRC:SOURCES,AK:ACT_KINDS,MS:MEET,FS:FU_STATUS,CS:CONF_STATUS,PLAT:PLATFORMS,PST:PROFILE_STATUS,CAD:CADENCE,WD,GS,RP};
const F=spec=>spec.split(';').map(x=>{const [k,kind,lab,o]=x.split('|'),required=k.endsWith('*'),key=required?k.slice(0,-1):k,f={key,label:lab||cap(key),kind:kind||'text'};if(required)f.required=true;if(OPT[o])f.options=OPT[o];if(f.kind[0]==='@'){f.ref=f.kind.slice(1);f.kind='ref';}return f;});
/* kind "frozen": written only by the app's own flows (stage moves, tags, links, review actions), never in the generic editor. */
const S={
 organizations:F('name*;org_type|select|Type|ORG;country||Country or region;website;archived|boolean'),
 people:F('name*;organization_id|@organizations|Partner;title||Role;email||Professional email;archived|boolean'),
 programs:F('name*;code;indication;modality|select||MOD;stage*|select|Development stage|PSTAGE;lead;status|select||PSTATUS;archived|boolean'),
 agreements:F('name;counterparty_id;agreement_type;status;effective_date|date;expiry_date|date;archived|boolean'),
 grants:F('room_id|frozen;room_name||Room;room_purpose|select|Purpose|RP;organization_id|@organizations|Partner;person_id|@people|Person;granted_on|date|Granted on;expires_on|date|Ends on;status|select|Access|GS;agreement_accepted_on|date|Agreement accepted on;source|frozen'),
 engagement:F('grant_id|frozen;organization_id|frozen;person_id|frozen;document_ref|frozen;document_title|frozen;first_viewed_on|frozen;last_viewed_on|frozen;view_count|frozen;seconds_viewed|frozen;downloads|frozen;source|frozen;as_of|frozen'),
 settings:F('digest_cadence*|select|Cadence|CAD;digest_day|select|Day|WD;digest_time||Time (HH:MM);time_zone||Time zone (IANA);digest_recipients||Digest recipients (workspace members);digest_text|longtext|Digest intro line;research_enabled|boolean|Partner research on;stalled_days|number|Stalled after (days);lost_reasons|frozen;team||Team (names, comma-separated)'),
 profiles:F('program_id*|@programs|Asset;directions|frozen;deal_types|frozen;territories;target_profile|longtext|Target profile;materials|frozen;research_focus|longtext|Research focus;research_exclusions|longtext|Research exclusions;research_sources|longtext|Preferred sources;status*|select||PST'),
 opps:F('name*;organization_id*|@organizations|Partner;program_id*|@programs|Asset;direction*|select||DIR;stage|frozen;stage_on|frozen;owner*;priority|select||PRI;fit|number|Fit (1–5);fit_rationale|longtext|Fit rationale;source|select||SRC;contact_ids|frozen;next_step||Next step;next_date|date|Next date;lost_reason|frozen;cda_agreement_id|frozen;dataroom_room_id|frozen;term_sheet_agreement_id|frozen;agreement_id|frozen;tags|frozen;archived|boolean'),
 history:F('opportunity_id|frozen;from_stage|frozen;to_stage|frozen;changed_on|frozen;changed_by|frozen;note|frozen'),
 acts:F('opportunity_id|frozen;organization_id|frozen;kind*|select||AK;occurred_on*|date|Date;person_ids|frozen;team||Our team;summary|longtext;materials|frozen;conference_id|frozen;logged_by|frozen;tags|frozen;outcome|longtext;status|select|Meeting status|MS'),
 fus:F('opportunity_id|frozen;activity_id|frozen;title*;owner*;due*|date;status*|select||FS;done_on|date|Done on'),
 confs:F('name*;starts_on*|date|Starts;ends_on|date|Ends;location;platform|select|Partnering platform|PLAT;deadlines|frozen;goals|longtext;team||Team;status*|select||CS;tag_value|frozen'),
 briefs:F('opportunity_id|frozen;conference_id|frozen;activity_id|frozen;meeting_on|date|Meeting on;content*|longtext|Brief;sources|frozen;written_by|frozen;written_on|frozen'),
 signals:F('organization_id|frozen;opportunity_id|frozen;program_id|frozen;kind|frozen;title|frozen;why|frozen;source_url|frozen;published_on|frozen;found_on|frozen;status|frozen;dismiss_reason|frozen;run_id|frozen'),
 cats:F('name*;values|frozen;multiple|boolean|Several values per opportunity;standard|frozen;archived|boolean'),
 views:F('name*;filters|frozen;layout|frozen;shared|boolean|Shared with the team;owner|frozen;archived|boolean')
};
const ROLE_LABEL={organizations:'partner',people:'contact',programs:'asset',agreements:'agreement',grants:'data room access entry',engagement:'engagement row',settings:'settings',profiles:'asset profile',opps:'opportunity',history:'stage change',acts:'activity',fus:'follow-up',confs:'conference',briefs:'brief',signals:'signal',cats:'tag category',views:'saved view'};
const ROLE_KEY={organizations:'organizations',people:'people',programs:'programs',agreements:'agreements',grants:'dataroom.access_grants',engagement:'dataroom.engagement',settings:'partnerships.settings',profiles:'partnerships.asset_profiles',opps:'partnerships.opportunities',history:'partnerships.stage_history',acts:'partnerships.activities',fus:'partnerships.follow_ups',confs:'partnerships.conferences',briefs:'partnerships.briefs',signals:'partnerships.signals',cats:'partnerships.tag_categories',views:'partnerships.views'};
const OPTIONAL=['agreements','grants','engagement'];

let mapping={};try{mapping=JSON.parse(cfg.tableMap||'{}');}catch(e){mapping={};}
const roleMap={};
for(const role of Object.keys(S)){
 const m=mapping[ROLE_KEY[role]],b=m&&bindings.find(x=>x.typeId===m.typeId);
 if(!m||!b)continue;
 const fields={};for(const f of S[role]){const k=m.fields&&m.fields[f.key]!==undefined?m.fields[f.key]:f.key;if(typeof k==='string'&&(b.fields||[]).includes(k))fields[f.key]=k;}
 roleMap[role]={typeId:m.typeId,fields,writable:(Array.isArray(m.writableFields)?m.writableFields:[]).filter(x=>fields[x])};
}
/* Agreements belong to Contracts and engagement to Data Room: never written here. */
for(const role of ['agreements','engagement'])if(roleMap[role])roleMap[role].writable=[];
const PAGE=100,MAX_PAGES=8;let callsLeft=110;const cache={};
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
 return cache[role]={rows:rows.filter(r=>!bool(r.data.archived)),allRows:rows,total:total===null?rows.length:total,complete,unavailable,unbound:false,truncated,invalid,unknownTotal:total===null};
}
const canWrite=role=>!!inp.saved&&!!inp.writable&&cfg.readOnly!==true&&!!roleMap[role]&&roleMap[role].writable.length>0;
const WR=!!inp.saved&&!!inp.writable&&cfg.readOnly!==true;

const SCREENS=templateLayoutSchema.screens;
const DESC={overview:'Funnel by asset and direction, what is due, stalled deals, upcoming meetings and new partner signals.',pipeline:'Every opportunity in every direction by stage: board, list or funnel, with tag filters and saved views.',partners:'Partner companies and contacts with the full history: who met whom, what was shared, any decline and why.',conferences:'Conference prep (goals, who to meet, requests, one-page briefs) and the next step after each meeting.',activity:'Meetings, calls, emails and notes; follow-ups; the materials log; and each person\'s week.',research:'Partner signals and target suggestions from the research worker, reviewed here; research settings per asset.',settings:'Stages and lost reasons, tag categories, and the digest and research schedule.'};
const st=JSON.parse(JSON.stringify(inp.state||{}));
{
 let profile={};try{profile=JSON.parse(cfg.layoutProfile||'{}');}catch(e){profile={};}
 const groups=templateLayoutSchema.groups;
 const tabs=Array.isArray(profile.tabs)?profile.tabs.filter(id=>SCREENS.some(s=>s.id===id)):[];
 const cols={};for(const g of Object.keys(groups)){const ids=groups[g].map(x=>x.id),saved=profile.cols&&Array.isArray(profile.cols[g])?profile.cols[g].filter(k=>ids.includes(k)):[];cols[g]=[...new Set(saved.concat(ids))];}
 st.layout={tabs:[...new Set(tabs.concat(SCREENS.map(s=>s.id)))],cols,visible:profile.visible&&typeof profile.visible==='object'?profile.visible:{},heading:String(profile.heading||cfg.heading||'Partnerships').slice(0,100)};
}
st.section=String(st.section||'overview');st.page=Math.max(0,Number(st.page)||0);st.page2=Math.max(0,Number(st.page2)||0);st.query=String(st.query||'');st.f=st.f&&typeof st.f==='object'?st.f:{};
st.flt=st.flt&&typeof st.flt==='object'?st.flt:{};for(const k of ['stage','program','direction','owner'])st.flt[k]=Array.isArray(st.flt[k])?st.flt[k].map(String):[];st.flt.tags=st.flt.tags&&typeof st.flt.tags==='object'?st.flt.tags:{};
st.mode=LAYOUTS.includes(st.mode)?st.mode:'board';st.me=String(st.me||'');st.sub=String(st.sub||'timeline');st.rsub=String(st.rsub||'signals');st.sigStatus=String(st.sigStatus||'new');
const note=v=>{st.notice=String(v||'').slice(0,600);};
if(event.kind==='open'&&/Prepared for TrialAgents review/i.test(String(st.notice||'')))st.notice='';
const sections=st.layout.tabs.map(id=>SCREENS.find(s=>s.id===id)).filter(s=>s&&st.layout.visible[s.id]!==false);
if(!sections.some(s=>s.id===st.section))st.section=(sections[0]||SCREENS[0]).id;
const colVisible=(g,id)=>st.layout.visible[g+'.'+id]!==false;
const cols=g=>st.layout.cols[g].filter(id=>colVisible(g,id));
const draftOf=name=>st.f[name]&&typeof st.f[name]==='object'?st.f[name]:(st.f[name]={});

const ROLES=Object.keys(S);const R={};for(const role of ROLES)R[role]=readRole(role);
const CORE=ROLES.filter(r=>!OPTIONAL.includes(r));
const readProblems=[];
for(const role of CORE){const r=R[role],n=cap(ROLE_LABEL[role]);
 if(r.unbound)readProblems.push(n+' table is not connected to this app.');else if(r.unavailable)readProblems.push(n+' records could not be read.');else if(r.truncated||!r.complete&&r.rows.length<r.total)readProblems.push('Only part of the '+ROLE_LABEL[role]+' records was read.');else if(r.unknownTotal)readProblems.push('The number of '+ROLE_LABEL[role]+' records is unknown, so totals may be incomplete.');
 if(r.invalid)readProblems.push(plural(r.invalid,'value')+' in '+ROLE_LABEL[role]+' records could not be read.');}
const exact=!readProblems.length;
const optState=role=>{const r=R[role];return r.unbound?'unbound':r.unavailable?'unavailable':r.truncated||r.unknownTotal||!r.complete&&r.rows.length<r.total?'partial':'ok';};
const rowsOf=role=>R[role].rows.map(r=>({id:r.id,version:r.version,...r.data}));
const allOf=role=>R[role].allRows.map(r=>({id:r.id,version:r.version,...r.data}));
const byId=xs=>Object.fromEntries(xs.map(x=>[x.id,x]));
const ORGS=rowsOf('organizations'),ORG=byId(allOf('organizations')),PEOPLE=rowsOf('people'),PERSON=byId(allOf('people')),PROGRAMS=rowsOf('programs'),PROGRAM=byId(allOf('programs'));
const AGREEMENTS=rowsOf('agreements'),AGREEMENT=byId(AGREEMENTS),GRANTS=rowsOf('grants'),ENG=rowsOf('engagement');
const OPPS_ALL=allOf('opps'),OPP=byId(OPPS_ALL),OPPS=OPPS_ALL.filter(o=>!bool(o.archived));
const HIST=rowsOf('history'),ACTS=rowsOf('acts'),ACT=byId(ACTS),FUS=rowsOf('fus'),FU=byId(FUS),CONFS=rowsOf('confs'),CONF=byId(CONFS),BRIEFS=rowsOf('briefs'),BRIEF=byId(BRIEFS),SIGS=rowsOf('signals'),SIG=byId(SIGS),PROFILES=rowsOf('profiles'),PROFILE=byId(PROFILES);
const CAT_ROWS=rowsOf('cats').map(c=>({...c,vals:(parseJSON(c.values)||[]).map(String).filter(Boolean)}));
const VIEWS=rowsOf('views').map(v=>({...v,flt:parseJSON(v.filters)||{}}));
const settingsRow=R.settings.rows[0]||null,SET=settingsRow?settingsRow.data:{};
const CAD=CADENCE.includes(SET.digest_cadence)?SET.digest_cadence:'weekly',DDAY=WD.includes(SET.digest_day)?SET.digest_day:'mon',DTIME=/^([01]\d|2[0-3]):[0-5]\d$/.test(String(SET.digest_time||''))?String(SET.digest_time):'07:00';
const TZ=/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(String(SET.time_zone||''))?String(SET.time_zone):'Europe/Berlin';
const STALLED=Math.max(1,Math.round(num(SET.stalled_days,21)));const RESEARCH_ON=settingsRow?SET.research_enabled!==false&&SET.research_enabled!=='false':true;
const LOST=(()=>{const x=parseJSON(SET.lost_reasons);return Array.isArray(x)&&x.length?x.map(v=>textOf(v,120)).filter(Boolean):LOST_DEFAULT;})();
const AS_OF=validDate(cfg.asOfOverride)||new Date().toISOString().slice(0,10);
const orgName=id=>ORG[id]?String(ORG[id].name||'Unnamed')+(bool(ORG[id].archived)?' (archived)':''):id?'Unavailable partner':'—';
const personName=id=>PERSON[id]?String(PERSON[id].name||'Unnamed'):id?'Unavailable contact':'';
const progName=id=>PROGRAM[id]?String(PROGRAM[id].code||PROGRAM[id].name||'Unnamed'):id?'Unavailable asset':'—';
const progLong=id=>PROGRAM[id]?String(PROGRAM[id].name||PROGRAM[id].code||'Unnamed'):'Unavailable asset';
const TEAM=[...new Set(list(SET.team).concat(OPPS.map(o=>String(o.owner||'')),FUS.map(f=>String(f.owner||''))).map(x=>x.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
if(st.me&&!TEAM.includes(st.me))st.me='';

/* Tags: categories (standard and custom) with their values, plus values already used on opportunities and conference tag values. */
const tagsOf=o=>{const t=parseJSON(o&&o.tags);const out={};if(t&&!Array.isArray(t))for(const [k,v] of Object.entries(t)){const vs=(Array.isArray(v)?v:[v]).map(x=>textOf(x,80)).filter(Boolean);if(vs.length)out[k]=vs;}return out;};
const CATS=(()=>{const out=CAT_ROWS.map(c=>({id:c.id,version:c.version,name:String(c.name||''),values:c.vals,multiple:bool(c.multiple),standard:bool(c.standard)}));
 for(const s of STD_CATS)if(!out.some(c=>c.name.toLowerCase()===s.name.toLowerCase()))out.push({id:'',name:s.name,values:s.values.slice(),multiple:s.multiple,standard:true,missing:true});
 for(const c of out){const seen=new Set(c.values);for(const o of OPPS)for(const v of tagsOf(o)[c.name]||[])if(!seen.has(v)){seen.add(v);c.values.push(v);}
  if(c.name==='Conference')for(const k of CONFS)if(k.tag_value&&!seen.has(k.tag_value)){seen.add(k.tag_value);c.values.push(String(k.tag_value));}}
 return out;})();
const catOf=name=>CATS.find(c=>c.name===name)||null;
const confTag=CATS.find(c=>c.name==='Conference');

/* Calculation rules (PARTNERSHIPS.md §8). */
const isOpen=o=>!CLOSED.includes(o.stage);
const histOf=id=>HIST.filter(h=>h.opportunity_id===id).sort((a,b)=>String(a.changed_on).localeCompare(String(b.changed_on)));
const actsOfOpp=id=>ACTS.filter(a=>a.opportunity_id===id).sort((a,b)=>String(b.occurred_on).localeCompare(String(a.occurred_on)));
const fusOfOpp=id=>FUS.filter(f=>f.opportunity_id===id).sort((a,b)=>String(a.due).localeCompare(String(b.due)));
/* Last touch: latest activity (up to today), stage change or completed follow-up; the stage date when there is none. */
function lastTouch(o){let d=validDate(o.stage_on)||'';
 for(const a of ACTS)if(a.opportunity_id===o.id){const x=validDate(a.occurred_on);if(x&&x<=AS_OF&&x>d)d=x;}
 for(const h of HIST)if(h.opportunity_id===o.id){const x=validDate(h.changed_on);if(x&&x>d)d=x;}
 for(const f of FUS)if(f.opportunity_id===o.id&&f.status==='done'){const x=validDate(f.done_on);if(x&&x>d)d=x;}
 return d;}
const quietDays=o=>{const d=lastTouch(o);return d?diffDays(d,AS_OF):null;};
const isStalled=o=>isOpen(o)&&quietDays(o)!==null&&quietDays(o)>=STALLED;
const isOverdue=f=>f.status==='open'&&validDate(f.due)&&f.due<AS_OF;
/* Funnel: an opportunity counts at every pipeline stage up to the furthest one it ever reached (stage history, plus its current stage). */
function reachedIdx(o){let i=PIPE.indexOf(o.stage);for(const h of HIST)if(h.opportunity_id===o.id){const k=PIPE.indexOf(h.to_stage);if(k>i)i=k;}return i;}
function funnelOf(xs){const counts=PIPE.map((s,i)=>xs.filter(o=>reachedIdx(o)>=i).length);return {counts,conv:counts.map((c,i)=>i===0||!counts[i-1]?null:c/counts[i-1]),signed:xs.filter(o=>o.stage==='signed').length,lost:xs.filter(o=>o.stage==='lost').length,hold:xs.filter(o=>o.stage==='on_hold').length,open:xs.filter(isOpen).length,
 reasons:Object.entries(xs.filter(o=>o.stage==='lost'||o.stage==='on_hold').reduce((m,o)=>{const k=textOf(o.lost_reason,120)||'No reason recorded';m[k]=(m[k]||0)+1;return m;},{})).sort((a,b)=>b[1]-a[1])};}
/* History check: every earlier opportunity with the organization (archived included), with stage and reason; declines first. */
function historyOf(orgId,exceptId){if(!orgId)return [];return OPPS_ALL.filter(o=>o.organization_id===orgId&&o.id!==exceptId).sort((a,b)=>(a.stage==='lost'?0:1)-(b.stage==='lost'?0:1)||String(b.stage_on).localeCompare(String(a.stage_on)));}
function historyWarning(orgId,exceptId){const h=historyOf(orgId,exceptId);if(!orgId)return '';const acts=ACTS.filter(a=>a.organization_id===orgId&&validDate(a.occurred_on)&&a.occurred_on<=AS_OF);
 if(!h.length&&!acts.length)return '<div class="pt-banner">No earlier opportunities or activities with '+esc(orgName(orgId))+'.</div>';
 const lost=h.filter(o=>o.stage==='lost'||o.stage==='on_hold');
 return '<div class="pt-banner'+(lost.length?' warn':'')+'" role="status"><strong>'+(lost.length?'Earlier decline: ':'We have spoken to them: ')+'</strong>'+esc(orgName(orgId))+' — '+h.slice(0,4).map(o=>esc(o.name)+' ('+esc(STAGE_LABEL[o.stage]||o.stage)+(o.lost_reason?': '+esc(o.lost_reason):'')+(o.stage_on?', '+esc(shortDate(o.stage_on)+' '+String(o.stage_on).slice(0,4)):'')+')').join('; ')+(h.length>4?'; '+(h.length-4)+' more':'')+(acts.length?'. Last contact '+esc(dateLabel(acts.map(a=>a.occurred_on).sort().slice(-1)[0]))+'.':'.')+'</div>';}
const contactsOf=o=>list(o.contact_ids).filter(id=>PERSON[id]);
const lastContactOfPerson=pid=>ACTS.filter(a=>list(a.person_ids).includes(pid)&&validDate(a.occurred_on)&&a.occurred_on<=AS_OF).map(a=>a.occurred_on).sort().slice(-1)[0]||'';
const lastContactOfOrg=oid=>ACTS.filter(a=>a.organization_id===oid&&validDate(a.occurred_on)&&a.occurred_on<=AS_OF).map(a=>a.occurred_on).sort().slice(-1)[0]||'';
const materialsOf=a=>{const m=parseJSON(a.materials);return Array.isArray(m)?m.filter(x=>x&&typeof x==='object'&&(x.title||x.version_id)):[];};
const inTeam=(team,me)=>!!me&&list(team).some(x=>x.toLowerCase()===me.toLowerCase());

/* Filters and saved views. */
function matches(o,flt,q){
 if(flt.stage.length&&!flt.stage.includes(o.stage))return false;if(flt.program.length&&!flt.program.includes(o.program_id))return false;
 if(flt.direction.length&&!flt.direction.includes(o.direction))return false;if(flt.owner.length&&!flt.owner.includes(String(o.owner||'')))return false;
 const t=tagsOf(o);for(const [c,vals] of Object.entries(flt.tags||{})){const vs=(Array.isArray(vals)?vals:[vals]).filter(Boolean);if(vs.length&&!vs.some(v=>(t[c]||[]).includes(v)))return false;}
 if(q){const s=(o.name+' '+orgName(o.organization_id)+' '+progLong(o.program_id)+' '+(o.next_step||'')).toLowerCase();if(!s.includes(q.toLowerCase()))return false;}
 return true;}
const cleanFlt=v=>{const x=v&&typeof v==='object'?v:{},out={tags:{}};for(const k of ['stage','program','direction','owner'])out[k]=(Array.isArray(x[k])?x[k]:x[k]?[x[k]]:[]).map(String).filter(Boolean);
 if(x.tags&&typeof x.tags==='object')for(const [c,vs] of Object.entries(x.tags)){const a=(Array.isArray(vs)?vs:[vs]).map(String).filter(Boolean);if(a.length)out.tags[c]=a;}return out;};
const fltCount=f=>['stage','program','direction','owner'].filter(k=>f[k].length).length+Object.values(f.tags||{}).filter(v=>(Array.isArray(v)?v:[v]).filter(Boolean).length).length;
/* Private views are listed only for their owner (the person chosen in "You are"); shared views for everyone with app access. */
const visibleViews=()=>VIEWS.filter(v=>bool(v.shared)||(st.me&&String(v.owner||'')===st.me)).sort((a,b)=>String(a.name).localeCompare(String(b.name)));

/* Data room (Data Room's dataroom.v1 outputs, or this app's own manual entries) and agreements (Contracts, read-only). */
let INTEG=[];if(inp.saved){try{const r=tools.call('integrations.list',{});INTEG=Array.isArray(r)?r:Array.isArray(r&&r.integrations)?r.integrations:[];}catch(e){INTEG=[];}}
const integ=role=>INTEG.find(x=>x&&x.role===ROLE_KEY[role])||null;
const roomsOf=orgId=>{const m={};for(const g of GRANTS)if(g.organization_id===orgId&&g.room_id){m[g.room_id]=m[g.room_id]||{id:String(g.room_id),name:String(g.room_name||'Data room'),purpose:g.room_purpose||'',grants:[]};m[g.room_id].grants.push(g);}return Object.values(m);};
function roomView(o){const r=String(o.dataroom_room_id||'');if(!r)return null;const gs=GRANTS.filter(g=>String(g.room_id)===r&&g.organization_id===o.organization_id);
 const ids=new Set(gs.map(g=>g.id)),eng=ENG.filter(e=>ids.has(e.grant_id)||(!e.grant_id&&e.organization_id===o.organization_id));
 return {id:r,name:gs[0]?String(gs[0].room_name||'Data room'):r,grants:gs,views:eng.reduce((n,e)=>n+num(e.view_count,0),0),seconds:eng.reduce((n,e)=>n+num(e.seconds_viewed,0),0),last:eng.map(e=>validDate(e.last_viewed_on)).filter(Boolean).sort().slice(-1)[0]||'',docs:eng.slice().sort((a,b)=>num(b.view_count,0)-num(a.view_count,0)).slice(0,4)};}
const agreementLabel=id=>{if(!id)return null;const a=AGREEMENT[id];if(a)return {linked:true,name:String(a.name||'Agreement'),status:AG_STATUS[a.status]||label(a.status),signed:a.status==='active',date:a.effective_date||''};return {linked:false,name:String(id),status:R.agreements.unbound?'Manual reference':'Not found in Contracts (or not visible to you)'};};

/* Writes: every record change is one exact records.propose (at most 50 per review), approved by a person in TrialAgents. */
function toReal(role,data){const m=roleMap[role];if(!m)throw Error('The '+ROLE_LABEL[role]+' table is not connected.');const out={};for(const [k,v] of Object.entries(data)){if(v===undefined)continue;if(!m.fields[k])continue;if(!m.writable.includes(k))throw Error('You cannot edit '+k.replace(/_/g,' ')+' in the '+ROLE_LABEL[role]+' table.');out[m.fields[k]]=v;}return out;}
const crt=(role,data)=>{if(!canWrite(role))throw Error('You cannot add a '+ROLE_LABEL[role]+' here.');return {kind:'create_record',typeId:roleMap[role].typeId,data:toReal(role,data)};};
const ROW=(role,id)=>R[role].allRows.find(r=>r.id===id)||null;
const upd=(role,id,data,version)=>{const row=ROW(role,id);if(!row)throw Error('That '+ROLE_LABEL[role]+' is no longer available. Reopen it and try again.');if(!canWrite(role))throw Error('You cannot change this '+ROLE_LABEL[role]+'.');return {kind:'update_record',recordId:row.id,expectedVersion:version===undefined||version===null?row.version:version,data:toReal(role,data)};};
function propose(changes,message){changes=changes.filter(Boolean);if(!changes.length)throw Error('There is nothing to save.');if(changes.length>50)throw Error('This needs '+changes.length+' record changes; one review holds 50. Save it in smaller parts.');tools.call('records.propose',changes);note(message||'Prepared for TrialAgents review. Nothing changes until a person approves it.');}
/* A stage move always writes stage history in the same review. */
function stageChanges(o,to,on,by,noteText,reason,version){if(!STAGES.includes(to))throw Error('Choose a stage.');if(to===o.stage)throw Error('The opportunity is already at '+STAGE_LABEL[to]+'.');const d=validDate(on)||AS_OF;
 if((to==='lost'||to==='on_hold')&&!textOf(reason,120))throw Error('Choose a reason for '+STAGE_LABEL[to].toLowerCase()+'.');
 return [upd('opps',o.id,{stage:to,stage_on:d,...(to==='lost'||to==='on_hold'?{lost_reason:textOf(reason,200)}:o.lost_reason?{lost_reason:null}:{})},version),crt('history',{opportunity_id:o.id,from_stage:o.stage||null,to_stage:to,changed_on:d,changed_by:textOf(by,80)||String(o.owner||'')||null,note:textOf(noteText,500)||null})];}

/* Schedule (research worker and digest): daily, weekly on a day, or monthly on the 1st, at a time in the settings time zone. */
function scheduleOf(cad,day,time,tz){const t={kind:'calendar',frequency:cad,interval:1,time,timeZone:tz};
 if(cad==='weekly'){t.weekdays=[WD_NO[day]];t.anchor='2026-11-02';}else if(cad==='monthly'){t.monthDay=1;t.monthEnd='last_day';t.anchor='2026-11-01';}else t.anchor='2026-11-01';return t;}
const SCHEDULE=scheduleOf(CAD,DDAY,DTIME,TZ);
const scheduleText=(cad,day,time,tz)=>(cad==='daily'?'Every day':cad==='weekly'?'Every '+WD_LABEL[day]:'Monthly on the 1st')+' at '+time+' ('+tz+')';
/* Digest (PARTNERSHIPS.md §6): at most 3 lines per section, about 150 words, empty sections left out, no deal terms. */
const PERIOD={daily:1,weekly:7,monthly:30};
function nextSend(){if(CAD==='weekly'){let d=AS_OF;for(let i=0;i<7&&weekday(d)!==WD_NO[DDAY];i++)d=addDays(d,1);return d;}if(CAD==='monthly')return AS_OF.slice(8)==='01'?AS_OF:addDays(AS_OF.slice(0,8)+'01',32).slice(0,8)+'01';return AS_OF;}
function digestOf(maxPer){maxPer=maxPer||3;const send=nextSend(),days=PERIOD[CAD],since=addDays(send,-days),until=addDays(send,days-1),sec=[];
 const more=(xs,n)=>xs.length>n?' · '+(xs.length-n)+' more':'';
 const moved=HIST.filter(h=>h.from_stage&&validDate(h.changed_on)&&h.changed_on>since&&h.changed_on<=send&&OPP[h.opportunity_id]&&!bool(OPP[h.opportunity_id].archived)).sort((a,b)=>String(b.changed_on).localeCompare(String(a.changed_on)));
 if(moved.length)sec.push(['Moved',moved.slice(0,maxPer).map(h=>{const o=OPP[h.opportunity_id];return orgName(o.organization_id)+' → '+(h.to_stage==='lost'?'Lost'+(o.lost_reason&&o.stage==='lost'?': '+textOf(o.lost_reason,40).toLowerCase():''):h.to_stage==='on_hold'?'On hold':STAGE_LABEL[h.to_stage]||h.to_stage)+' ('+progName(o.program_id)+')';}).join(' · ')+more(moved,maxPer),moved.length]);
 const due=FUS.filter(f=>f.status==='open'&&validDate(f.due)&&f.due<=until).sort((a,b)=>String(a.due).localeCompare(String(b.due))),over=due.filter(isOverdue);
 if(due.length)sec.push([CAD==='daily'?'Due today':CAD==='weekly'?'Due this week':'Due this month',plural(due.length,'follow-up')+(over.length?' ('+over.length+' overdue)':'')+': '+due.slice(0,maxPer).map(f=>{const o=OPP[f.opportunity_id];return (o?orgName(o.organization_id)+' ':'')+textOf(f.title,60).replace(/^./,c=>c.toLowerCase())+' ('+textOf(f.owner,30)+', '+(isOverdue(f)?'overdue':DAYS[weekday(f.due)])+')';}).join(' · ')+more(due,maxPer),due.length]);
 const stalled=OPPS.filter(isStalled).sort((a,b)=>quietDays(b)-quietDays(a));
 if(stalled.length)sec.push(['Stalled',stalled.slice(0,maxPer).map(o=>orgName(o.organization_id)+', no activity '+quietDays(o)+' days ('+STAGE_LABEL[o.stage]+')').join(' · ')+more(stalled,maxPer),stalled.length]);
 const confs=CONFS.filter(c=>validDate(c.starts_on)&&c.starts_on>=send&&c.starts_on<=until||validDate(c.starts_on)&&c.starts_on<=send&&(c.ends_on||c.starts_on)>=send);
 const meets=ACTS.filter(a=>['meeting','call','conference_meeting'].includes(a.kind)&&validDate(a.occurred_on)&&a.occurred_on>=send&&a.occurred_on<=until&&!['cancelled','declined'].includes(a.status)&&!(a.conference_id&&confs.some(c=>c.id===a.conference_id)));
 const up=confs.map(c=>{const ms=ACTS.filter(a=>a.conference_id===c.id&&!['cancelled','declined'].includes(a.status)),br=ms.filter(m=>BRIEFS.some(b=>b.activity_id===m.id)).length;return c.name+', '+shortDate(c.starts_on)+(c.ends_on&&c.ends_on!==c.starts_on?'–'+shortDate(c.ends_on):'')+': '+plural(ms.length,'meeting')+', '+br+' brief'+(br===1?'':'s')+' ready';}).concat(meets.length?[plural(meets.length,'other meeting')]:[]);
 if(up.length)sec.push(['Coming up',up.slice(0,maxPer).join(' · ')+more(up,maxPer),up.length]);
 const runIds=[...new Set(SIGS.filter(s=>validDate(s.found_on)).sort((a,b)=>String(b.found_on).localeCompare(String(a.found_on))).map(s=>String(s.run_id||s.found_on)))],latest=runIds[0];
 const fresh=SIGS.filter(s=>s.status==='new'&&String(s.run_id||s.found_on)===latest);
 const news=fresh.filter(s=>s.kind!=='target_suggestion'),targets=fresh.filter(s=>s.kind==='target_suggestion');
 if(news.length)sec.push(['New about your targets',news.slice(0,maxPer).map(s=>textOf(s.title,90)+' — '+textOf(s.why,90)).join(' · ')+more(news,maxPer),news.length]);
 if(targets.length){const by={};for(const s of targets){const k=progName(s.program_id);by[k]=(by[k]||0)+1;}sec.push(['Suggested targets',Object.entries(by).slice(0,maxPer).map(([k,n])=>n+' for '+k).join(' · ')+' (review)',targets.length]);}
 const period=CAD==='daily'?shortDate(send):CAD==='weekly'?'week of '+shortDate(send):MONTHS[Number(send.slice(5,7))-1]+' '+send.slice(0,4);
 const subject='Partnerships · '+period+': '+[moved.length+' moved',due.length+' due',news.length+' new signal'+(news.length===1?'':'s')].join(' · ');
 const intro=textOf(SET.digest_text,200);
 const body=(intro?intro+'\n\n':'')+(sec.length?sec.map(s=>s[0]+': '+s[1]).join('\n'):'Nothing moved, nothing is due and there are no new signals this '+(CAD==='daily'?'day':CAD==='weekly'?'week':'month')+'.')+'\n\nOpen Partnerships →';
 const out={subject,body,sections:sec.map(s=>s[0]),words:words(subject+' '+body)};
 return out.words>165&&maxPer>1?digestOf(maxPer-1):out;}

/* Generic editor for the plain fields of a record (app-managed fields are never editable here). */
const editable=role=>S[role].filter(f=>f.kind!=='frozen'&&f.key!=='archived'&&roleMap[role]&&roleMap[role].fields[f.key]);
function closeAll(){st.editor=null;st.panel=null;}
function openEditor(role,mode,id,preset){const keep=st.panel&&st.panel.type!=='editor-return'?st.panel:null;st.editor=null;let draft={...(preset||{})},version=null;
 if(mode!=='create'){const r=ROW(role,id);if(!r)throw Error('That record is no longer available.');draft={...r.data};version=r.version;}
 st.editor={role,mode,id:mode==='edit'?id:null,version,draft,fixed:mode==='create'&&preset?preset:{},back:keep};st.panel=null;}
function valuesFromForm(role,source){const out={};
 for(const f of editable(role)){if(!has(source,f.key)&&f.kind!=='boolean')continue;let v=source[f.key];
  if(f.kind==='boolean'){out[f.key]=bool(v);continue;}
  if(v===null||v===undefined||String(v).trim()===''){if(f.required)throw Error(f.label+' is required.');out[f.key]=null;continue;}
  if(typeof v==='object')throw Error(f.label+' must be a single value.');v=String(v).trim();
  if(f.kind==='number'){const n=num(v);if(n===null||n<0)throw Error(f.label+' must be a number of 0 or more.');if(f.key==='fit'&&(n<1||n>5))throw Error('Fit is 1 to 5.');out[f.key]=n;}
  else if(f.kind==='date'){if(!validDate(v))throw Error(f.label+' must be a date.');out[f.key]=v;}
  else if(f.kind==='select'){if(!f.options.includes(v))throw Error('Choose a valid '+f.label.toLowerCase()+'.');out[f.key]=v;}
  else if(f.kind==='ref'){if(!R[f.ref].rows.some(r=>r.id===v))throw Error('Choose an existing '+f.label.toLowerCase()+'.');out[f.key]=v;}
  else out[f.key]=v.slice(0,f.kind==='longtext'?20000:300);}
 return out;}
const docsCache={};
function docsList(){if(docsCache.v)return docsCache.v;if(!inp.saved)return docsCache.v={docs:[],state:'preview'};let r;try{r=tools.call('documents.list',{limit:200});}catch(e){return docsCache.v={docs:[],state:'unavailable'};}if(!r||r.unavailable)return docsCache.v={docs:[],state:'unavailable'};return docsCache.v={docs:(r.documents||[]).filter(d=>d&&d.versionId),state:'ready'};}
const docTitle=d=>String(d.filename||'Document').replace(/\.[a-z0-9]{2,5}$/i,'');
const materialsFrom=d=>docsList().docs.filter(x=>bool(d['doc_'+x.versionId])).map(x=>({document_id:x.documentId||null,version_id:x.versionId,title:docTitle(x),version:num(x.version,null)}));
const setTags=(base,d)=>{const t={...base};for(const c of CATS){const vals=c.multiple?c.values.filter(v=>bool(d['tag_'+c.name+'__'+v])):(d['tag_'+c.name]?[String(d['tag_'+c.name])]:[]);if(has(d,'tag_'+c.name)||c.multiple){if(vals.length)t[c.name]=vals;else delete t[c.name];}}return t;};

let failed=false;
try{
 const v=event.value;
 if(action.startsWith('f:')&&event.kind==='change'){const p=action.split(':');draftOf(p[1])[p.slice(2).join(':')]=typeof v==='boolean'?v:String(v===null||v===undefined?'':v).slice(0,20000);}
 else if(action.startsWith('draft:')&&event.kind==='change'&&st.editor){st.editor.draft[action.slice(6)]=typeof v==='boolean'?v:String(v===null||v===undefined?'':v);}
 else if(action.startsWith('nav:')){const id=action.slice(4);if(SCREENS.some(s=>s.id===id)){st.section=id;st.page=0;st.page2=0;st.query='';closeAll();note('');}}
 else if(action==='clear-notice')note('');
 else if(action==='close'){if(st.editor&&st.editor.back){st.panel=st.editor.back;st.editor=null;}else closeAll();}
 else if(action==='query'&&event.kind==='change'){st.query=String(v||'').slice(0,100);st.page=0;st.page2=0;}
 else if(action==='me'&&event.kind==='change'){st.me=TEAM.includes(String(v))?String(v):'';}
 else if(action.startsWith('flt:')&&event.kind==='change'){const k=action.slice(4),val=String(v||'');if(k.startsWith('tag:')){const c=k.slice(4);if(val)st.flt.tags[c]=[val];else delete st.flt.tags[c];}else if(['stage','program','direction','owner'].includes(k))st.flt[k]=val?[val]:[];st.page=0;st.viewId='';}
 else if(action==='clear-filters'){st.flt={stage:[],program:[],direction:[],owner:[],tags:{}};st.viewId='';st.page=0;}
 else if(action.startsWith('mode:')){const m=action.slice(5);if(LAYOUTS.includes(m))st.mode=m;st.page=0;}
 else if(action==='pick-view'&&event.kind==='change'){const vw=visibleViews().find(x=>x.id===String(v));if(vw){st.viewId=vw.id;st.flt=cleanFlt(vw.flt);if(LAYOUTS.includes(vw.layout))st.mode=vw.layout;st.page=0;}else{st.viewId='';}}
 else if(action.startsWith('sub:')){st.sub=action.slice(4);st.page=0;}
 else if(action.startsWith('rsub:')){st.rsub=action.slice(5);st.page=0;}
 else if(action==='sig-status'&&event.kind==='change'){st.sigStatus=String(v||'new');st.page=0;}
 else if(action==='sig-kind'&&event.kind==='change'){st.sigKind=String(v||'');st.page=0;}
 else if(action==='act-kind'&&event.kind==='change'){st.actKind=String(v||'');st.page=0;}
 else if(action==='fu-status'&&event.kind==='change'){st.fuStatus=String(v||'');st.page=0;}
 else if(action==='pick-conf'&&event.kind==='change'){if(CONF[v])st.confId=String(v);}
 else if(action==='next-page')st.page++;else if(action==='prev-page')st.page=Math.max(0,st.page-1);
 else if(action==='next-page2')st.page2++;else if(action==='prev-page2')st.page2=Math.max(0,st.page2-1);
 else if(action.startsWith('open:')){const [,type,id]=action.split(':');const map={opp:'opps',org:'organizations',person:'people',conf:'confs',signal:'signals',brief:'briefs',act:'acts',cat:'cats',profile:'profiles'};const role=map[type];const row=role&&ROW(role,id);if(!row)throw Error('That record is no longer available.');st.editor=null;st.panel={type,id,version:row.version};st.f[type]={};}
 else if(action.startsWith('panel:')){const [,type,id,extra]=action.split(':');st.editor=null;const back=st.panel&&!['log','accept','dismiss','outcome','meeting','fu','saveview','grant'].includes(st.panel.type)?st.panel:null;st.panel={type,id:id||'',extra:extra||'',back};st.f[type]={};
  const row=type==='outcome'?ROW('acts',id):type==='dismiss'||type==='accept'?ROW('signals',id):null;if(row)st.panel.version=row.version;}
 else if(action.startsWith('goto:')){const [,sec,sub]=action.split(':');if(SCREENS.some(s=>s.id===sec)){st.section=sec;if(sec==='activity'&&sub)st.sub=sub;if(sec==='research'&&sub)st.rsub=sub;st.page=0;closeAll();}}
 else if(action==='back'){st.panel=st.panel&&st.panel.back||null;}
 else if(action==='conf-view'){const c=CONF[st.confId];if(!c)throw Error('Choose a conference.');st.section='pipeline';st.flt={stage:[],program:[],direction:[],owner:[],tags:{Conference:[String(c.tag_value)]}};st.viewId='';st.mode='list';st.page=0;closeAll();}
 else if(isAct&&!exact)throw Error('Some records could not be read completely, so changes are disabled to avoid overwriting data. '+readProblems[0]);
 else if(action.startsWith('edit:')){const [,role,id]=action.split(':');openEditor(role,'edit',id);}
 else if(action.startsWith('add:')){const [,role,ctx]=action.split(':');const preset={};
  if(role==='opps'){Object.assign(preset,{stage:'identified',stage_on:AS_OF,tags:JSON.stringify({})});if(ORG[ctx])preset.organization_id=ctx;if(PROGRAM[ctx])preset.program_id=ctx;}
  if(role==='people'&&ORG[ctx])preset.organization_id=ctx;
  if(role==='fus'){const o=OPP[ctx];Object.assign(preset,{status:'open',...(o?{opportunity_id:o.id}:{})});}
  if(role==='briefs'){const a=ACT[ctx];if(!a)throw Error('Choose the meeting first.');Object.assign(preset,{activity_id:a.id,opportunity_id:a.opportunity_id||null,conference_id:a.conference_id||null,meeting_on:a.occurred_on,written_by:'user',written_on:AS_OF});}
  if(role==='confs')Object.assign(preset,{status:'planning'});
  if(role==='profiles'){if(!PROGRAM[ctx])throw Error('Choose an asset.');if(PROFILES.some(p=>p.program_id===ctx))throw Error('This asset already has a partnering profile.');Object.assign(preset,{program_id:ctx,status:'active',directions:'[]',deal_types:'[]',materials:'[]'});}
  if(role==='programs')Object.assign(preset,{status:'active'});
  openEditor(role,'create',null,preset);if(role==='opps'&&st.me)st.editor.draft.owner=st.me;if(role==='fus'&&OPP[ctx])st.editor.draft.owner=OPP[ctx].owner;}
 else if(action==='save-record'&&event.kind==='submit'){const x=st.editor;if(!x)throw Error('The form is no longer open.');x.draft={...x.draft,...form};const role=x.role;
  const values={...valuesFromForm(role,x.draft),...x.fixed};
  if(role==='opps'&&x.mode==='create'){values.tags=JSON.stringify(setTags({},x.draft));values.contact_ids=PEOPLE.filter(p=>p.organization_id===values.organization_id&&bool(x.draft['c_'+p.id])).map(p=>p.id).join(',')||null;}
  if(role==='confs'&&has(x.draft,'deadlines_text')){const dl=lines(x.draft.deadlines_text).map(l=>{const m=/^(.*?)\s*[|:–-]\s*(\d{4}-\d{2}-\d{2})$/.exec(l);return m&&validDate(m[2])?{label:textOf(m[1],80)||'Deadline',date:m[2]}:null;});if(dl.some(d=>!d))throw Error('Write each deadline as "Label | YYYY-MM-DD".');values.deadlines=JSON.stringify(dl);
}
  if(role==='confs'){if(values.ends_on&&values.starts_on&&values.ends_on<values.starts_on)throw Error('The conference cannot end before it starts.');if(x.mode==='create')values.tag_value=textOf(values.name,80);}
  if(role==='profiles'){values.directions=JSON.stringify(DIRS.filter(d=>bool(x.draft['dir_'+d])));values.deal_types=JSON.stringify(DEAL_TYPES.filter(d=>bool(x.draft['deal_'+d])));const mats=materialsFrom(x.draft);if(mats.length||docsList().state==='ready')values.materials=JSON.stringify(mats);}
  if(role==='people'&&x.mode==='create'&&PEOPLE.some(p=>norm(p.name)===norm(values.name)&&p.organization_id===values.organization_id))throw Error(values.name+' is already a contact at '+orgName(values.organization_id)+'.');
  if(role==='organizations'&&x.mode==='create'&&ORGS.some(o=>norm(o.name)===norm(values.name)))throw Error(values.name+' is already a partner. Open it from Partners instead of adding a second record.');
  const changes=[];
  if(x.mode==='create'){changes.push(crt(role,values));
   if(role==='confs'){const c=CATS.find(k=>k.name==='Conference');if(c&&c.id&&!c.values.includes(values.tag_value))changes.push(upd('cats',c.id,{values:JSON.stringify(CAT_ROWS.find(k=>k.id===c.id).vals.concat([values.tag_value]))},c.version));}
   propose(changes,'New '+ROLE_LABEL[role]+' prepared for TrialAgents review.');}
  else{const r=ROW(role,x.id);const ch={};for(const [k,val] of Object.entries(values))if(JSON.stringify(r.data[k]===undefined?null:r.data[k])!==JSON.stringify(val))ch[k]=val;if(!Object.keys(ch).length)throw Error('Nothing changed.');propose([upd(role,x.id,ch,x.version)],'Changes prepared for TrialAgents review.');}
  st.editor=null;st.panel=x.back||null;}
 else if(action.startsWith('archive:')){const [,role,id]=action.split(':');propose([upd(role,id,{archived:true},st.panel&&st.panel.id===id?st.panel.version:undefined)],'Archive prepared for review. The record stays in the database and in every partner history.');closeAll();}

 /* Pipeline: stage moves (with history), gates, tags, contacts. */
 else if(action==='move-stage'&&event.kind==='submit'){const p=st.panel,o=p&&OPP[p.id];if(!o)throw Error('The opportunity is no longer available.');const d={...draftOf('opp'),...form};
  propose(stageChanges(o,String(d.to||''),d.on,st.me||d.by,d.note,d.reason==='Other'?d.reason_other||'Other':d.reason,p.version),'Stage change to '+(STAGE_LABEL[d.to]||d.to)+' prepared for review, with its stage history entry.');st.f.opp={};}
 else if(action==='save-gates'&&event.kind==='submit'){const p=st.panel,o=p&&OPP[p.id];if(!o)throw Error('The opportunity is no longer available.');const d={...draftOf('gates'),...form},ch={};
  for(const k of ['cda_agreement_id','term_sheet_agreement_id','agreement_id','dataroom_room_id']){if(!has(d,k))continue;const val=textOf(d[k],200)||null;if(val&&uuid(val)&&k!=='dataroom_room_id'&&!R.agreements.unbound&&!AGREEMENT[val])throw Error('Choose an agreement that is in Contracts.');if((o[k]||null)!==val)ch[k]=val;}
  if(!Object.keys(ch).length)throw Error('Nothing changed.');propose([upd('opps',o.id,ch,p.version)],'Links prepared for review.');st.f.gates={};}
 else if(action==='save-tags'&&event.kind==='submit'){const p=st.panel,o=p&&OPP[p.id];if(!o)throw Error('The opportunity is no longer available.');const d={...draftOf('tags'),...form};const t=setTags(tagsOf(o),d);
  if(JSON.stringify(t)===JSON.stringify(tagsOf(o)))throw Error('Nothing changed.');propose([upd('opps',o.id,{tags:JSON.stringify(t)},p.version)],'Tags prepared for review.');st.f.tags={};}
 else if(action==='save-contacts'&&event.kind==='submit'){const p=st.panel,o=p&&OPP[p.id];if(!o)throw Error('The opportunity is no longer available.');const d={...draftOf('contacts'),...form};const ids=PEOPLE.filter(x=>bool(d['c_'+x.id])).map(x=>x.id).join(',')||null;
  if(ids===(o.contact_ids||null))throw Error('Nothing changed.');propose([upd('opps',o.id,{contact_ids:ids},p.version)],'Contacts prepared for review.');st.f.contacts={};}
 else if(action.startsWith('fu-done:')||action.startsWith('fu-cancel:')){const [k,id]=action.split(':'),f=FU[id];if(!f)throw Error('That follow-up is no longer available.');propose([upd('fus',id,k==='fu-done'?{status:'done',done_on:AS_OF}:{status:'cancelled'})],k==='fu-done'?'Follow-up marked done; prepared for review.':'Follow-up cancelled; prepared for review.');}
 else if(action==='add-grant'&&event.kind==='submit'){const p=st.panel,o=p&&OPP[p.id];if(!o)throw Error('The opportunity is no longer available.');const d={...draftOf('grant'),...form},room=textOf(d.room_name,160);if(!room)throw Error('Name the data room.');if(!GS.includes(d.status))throw Error('Choose the access status.');
  const rid='manual:'+norm(room).replace(/ /g,'-').slice(0,60);propose([crt('grants',{room_id:rid,room_name:room,room_purpose:'licensing',organization_id:o.organization_id,person_id:PERSON[d.person_id]?d.person_id:null,granted_on:validDate(d.granted_on)||null,status:d.status,source:'manual'}),...(o.dataroom_room_id?[]:[upd('opps',o.id,{dataroom_room_id:rid},p.version)])],'Manual data room access entry prepared for review.');st.f.grant={};}

 /* Saved views. */
 else if(action==='save-view'&&event.kind==='submit'){const d={...draftOf('saveview'),...form},name=textOf(d.name,100);if(!name)throw Error('Name the view.');if(!st.me)throw Error('Choose who you are (You are) before saving a view.');
  const flt=cleanFlt(st.flt);if(!fltCount(flt))throw Error('Choose at least one filter first.');if(visibleViews().some(x=>norm(x.name)===norm(name)&&(bool(x.shared)||x.owner===st.me)))throw Error('A view called '+name+' already exists.');
  propose([crt('views',{name,filters:JSON.stringify(flt),layout:st.mode,shared:bool(d.shared),owner:st.me})],(bool(d.shared)?'Shared':'Private')+' view "'+name+'" prepared for review.');st.panel=null;}
 else if(action==='update-view'){const vw=VIEWS.find(x=>x.id===st.viewId);if(!vw)throw Error('Choose a saved view.');if(vw.owner!==st.me)throw Error('Only '+vw.owner+' can change this view.');propose([upd('views',vw.id,{filters:JSON.stringify(cleanFlt(st.flt)),layout:st.mode})],'View update prepared for review.');}
 else if(action==='archive-view'){const vw=VIEWS.find(x=>x.id===st.viewId);if(!vw)throw Error('Choose a saved view.');if(vw.owner!==st.me)throw Error('Only '+vw.owner+' can remove this view.');propose([upd('views',vw.id,{archived:true})],'Removing the view is prepared for review (it is archived, not deleted).');st.viewId='';}

 /* Activities, follow-ups and after-meeting logs (one review: activity, stage change with history, follow-ups). */
 else if(action==='save-log'&&event.kind==='submit'){const d={...draftOf('log'),...form},org=ORG[d.organization_id]?d.organization_id:'';if(!org)throw Error('Choose the partner.');if(!ACT_KINDS.includes(d.kind))throw Error('Choose what happened.');const on=validDate(d.occurred_on);if(!on)throw Error('Choose the date.');
  const o=OPP[d.opportunity_id]&&OPP[d.opportunity_id].organization_id===org?OPP[d.opportunity_id]:null;
  const mats=materialsFrom(d),ppl=PEOPLE.filter(p=>p.organization_id===org&&bool(d['p_'+p.id])).map(p=>p.id);
  const ch=[crt('acts',{organization_id:org,opportunity_id:o?o.id:null,kind:d.kind,occurred_on:on,person_ids:ppl.join(',')||null,team:textOf(d.team,200)||null,summary:textOf(d.summary,20000)||null,materials:mats.length?JSON.stringify(mats):null,logged_by:'user',tags:o?JSON.stringify(tagsOf(o)):null,...(d.kind==='conference_meeting'?{status:'held'}:{})})];
  if(o&&d.to&&d.to!==o.stage)ch.push(...stageChanges(o,d.to,on,st.me||d.team,d.stage_note,d.reason,undefined));
  for(const i of [1,2]){const t=textOf(d['fu'+i+'_title'],200);if(!t)continue;const due=validDate(d['fu'+i+'_due']),own=textOf(d['fu'+i+'_owner'],80);if(!due||!own)throw Error('Follow-up '+i+' needs an owner and a due date.');ch.push(crt('fus',{opportunity_id:o?o.id:null,title:t,owner:own,due,status:'open'}));}
  propose(ch,'Activity'+(ch.length>1?' with '+plural(ch.length-1,'more change'):'')+' prepared for review.');st.panel=st.panel&&st.panel.back||null;st.f.log={};}
 else if(action==='save-fu'&&event.kind==='submit'){const d={...draftOf('fu'),...form},t=textOf(d.title,200),due=validDate(d.due),own=textOf(d.owner,80);if(!t||!due||!own)throw Error('A follow-up needs a title, an owner and a due date.');const o=OPP[st.panel&&st.panel.id];
  propose([crt('fus',{opportunity_id:o?o.id:null,title:t,owner:own,due,status:'open'})],'Follow-up prepared for review.');st.panel=st.panel&&st.panel.back||null;st.f.fu={};}

 /* Conferences: meetings (requests and slots) and the after-event outcome per meeting. */
 else if(action==='save-meeting'&&event.kind==='submit'){const c=CONF[st.confId];if(!c)throw Error('Choose a conference.');const d={...draftOf('meeting'),...form},org=ORG[d.organization_id]?d.organization_id:'';if(!org)throw Error('Choose the partner.');const on=validDate(d.occurred_on)||c.starts_on;
  if(on<c.starts_on||on>(c.ends_on||c.starts_on))throw Error('The meeting date must fall within the conference.');if(!MEET.includes(d.status))throw Error('Choose the meeting status.');
  const o=OPP[d.opportunity_id]&&OPP[d.opportunity_id].organization_id===org?OPP[d.opportunity_id]:null,ppl=PEOPLE.filter(p=>p.organization_id===org&&bool(d['p_'+p.id])).map(p=>p.id);
  const ch=[crt('acts',{organization_id:org,opportunity_id:o?o.id:null,kind:'conference_meeting',occurred_on:on,person_ids:ppl.join(',')||null,team:textOf(d.team,200)||textOf(c.team,200)||null,summary:textOf(d.summary,2000)||null,conference_id:c.id,logged_by:'user',status:d.status,tags:JSON.stringify({Conference:[String(c.tag_value)]})})];
  if(o&&!(tagsOf(o).Conference||[]).includes(c.tag_value)){const t=tagsOf(o);t.Conference=(t.Conference||[]).concat([String(c.tag_value)]);ch.push(upd('opps',o.id,{tags:JSON.stringify(t)}));}
  propose(ch,'Meeting with '+orgName(org)+' prepared for review.');st.panel=null;st.f.meeting={};}
 else if(action==='save-outcome'&&event.kind==='submit'){const p=st.panel,a=p&&ACT[p.id];if(!a)throw Error('The meeting is no longer available.');const d={...draftOf('outcome'),...form};if(!MEET.includes(d.status))throw Error('Choose what happened.');
  const o=OPP[a.opportunity_id],ch=[upd('acts',a.id,{status:d.status,outcome:textOf(d.outcome,20000)||null},p.version)];
  if(o&&(textOf(d.next_step,300)||validDate(d.next_date)))ch.push(upd('opps',o.id,{next_step:textOf(d.next_step,300)||o.next_step||null,next_date:validDate(d.next_date)||o.next_date||null}));
  const t=textOf(d.fu_title,200);if(t){const due=validDate(d.fu_due),own=textOf(d.fu_owner,80);if(!due||!own)throw Error('The follow-up needs an owner and a due date.');ch.push(crt('fus',{opportunity_id:o?o.id:null,activity_id:a.id,title:t,owner:own,due,status:'open'}));}
  propose(ch,'Meeting outcome'+(t?' and follow-up':'')+' prepared for review.');st.panel=null;st.f.outcome={};}

 /* Research: review signals and target suggestions (accepting creates an opportunity at Identified, source research). */
 else if(action.startsWith('sig-reviewed:')){const s=SIG[action.slice(13)];if(!s)throw Error('That signal is no longer available.');propose([upd('signals',s.id,{status:'reviewed'})],'Signal marked reviewed; prepared for review.');}
 else if(action==='dismiss-signal'&&event.kind==='submit'){const p=st.panel,s=p&&SIG[p.id];if(!s)throw Error('That signal is no longer available.');const d={...draftOf('dismiss'),...form},reason=textOf(d.reason,300);if(!reason)throw Error('Say why you dismiss it; the next research run uses the reason.');
  propose([upd('signals',s.id,{status:'dismissed',dismiss_reason:reason},p.version)],'Dismissal prepared for review.');st.panel=null;st.f.dismiss={};}
 else if(action==='add-suggested-org'){const p=st.panel,s=p&&SIG[p.id];if(!s)throw Error('That suggestion is no longer available.');const name=textOf(s.title,200);if(ORGS.some(o=>norm(o.name)===norm(name)))throw Error(name+' is already a partner; choose it below.');propose([crt('organizations',{name,org_type:'company'})],name+' as a new partner prepared for review. Then accept the suggestion.');}
 else if(action==='accept-signal'&&event.kind==='submit'){const p=st.panel,s=p&&SIG[p.id];if(!s)throw Error('That suggestion is no longer available.');if(s.status==='accepted')throw Error('Already accepted.');const d={...draftOf('accept'),...form};
  const org=ORG[d.organization_id]?d.organization_id:'',prog=PROGRAM[d.program_id]?d.program_id:'';if(!org)throw Error('Choose the partner (add it first if it is new).');if(!prog)throw Error('Choose the asset.');if(!DIRS.includes(d.direction))throw Error('Choose the direction.');const owner=textOf(d.owner,80);if(!owner)throw Error('Choose the owner.');
  const name=textOf(d.name,200)||orgName(org)+': '+progName(prog);
  propose([crt('opps',{name,organization_id:org,program_id:prog,direction:d.direction,stage:'identified',stage_on:AS_OF,owner,priority:PRI.includes(d.priority)?d.priority:null,fit:num(d.fit,null),fit_rationale:textOf(s.why,2000)||null,source:'research',tags:JSON.stringify({Channel:['Research']})}),upd('signals',s.id,{status:'accepted',organization_id:org},p.version)],'New opportunity '+name+' (Identified, source research) prepared for review.');st.panel=null;st.f.accept={};}

 /* Settings: lost reasons, tag categories, digest and research. */
 else if(action==='save-settings'&&event.kind==='submit'){const d={...draftOf('settings'),...form};if(!CADENCE.includes(d.digest_cadence))throw Error('Choose the cadence.');if(d.digest_day&&!WD.includes(d.digest_day))throw Error('Choose the day.');
  const time=textOf(d.digest_time,5)||'07:00';if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('Write the time as HH:MM.');const tz=textOf(d.time_zone,60)||'Europe/Berlin';if(!/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(tz))throw Error('Use an IANA time zone such as Europe/Berlin.');
  const sd=num(d.stalled_days,21);if(sd===null||sd<1||sd>365)throw Error('Stalled after is 1 to 365 days.');
  const vals={digest_cadence:d.digest_cadence,digest_day:d.digest_day||'mon',digest_time:time,time_zone:tz,digest_recipients:list(d.digest_recipients).join(', ')||null,digest_text:textOf(d.digest_text,200)||null,research_enabled:has(d,'research_enabled')?bool(d.research_enabled):RESEARCH_ON,stalled_days:Math.round(sd),team:list(d.team).join(', ')||null};
  if(settingsRow){const ch={};for(const [k,val] of Object.entries(vals))if(JSON.stringify(SET[k]===undefined?null:SET[k])!==JSON.stringify(val))ch[k]=val;if(!Object.keys(ch).length)throw Error('Nothing changed.');propose([upd('settings',settingsRow.id,ch)],'Settings prepared for review. If the cadence, day or time changed, update the research and digest schedule in Automations (your assistant can do it).');}
  else propose([crt('settings',vals)],'Settings prepared for review.');st.f.settings={};}
 else if(action==='save-lost'&&event.kind==='submit'){const d={...draftOf('lost'),...form},xs=[...new Set(lines(d.reasons).map(x=>textOf(x,120)))];if(!xs.length)throw Error('Keep at least one lost reason.');
  if(settingsRow)propose([upd('settings',settingsRow.id,{lost_reasons:JSON.stringify(xs)})],'Lost reasons prepared for review.');else propose([crt('settings',{digest_cadence:'weekly',digest_day:'mon',digest_time:'07:00',time_zone:'Europe/Berlin',research_enabled:true,stalled_days:21,lost_reasons:JSON.stringify(xs)})],'Lost reasons prepared for review.');st.f.lost={};}
 else if(action==='std-cats'){const miss=CATS.filter(c=>c.missing);if(!miss.length)throw Error('The standard categories are already there.');propose(miss.map(c=>crt('cats',{name:c.name,values:JSON.stringify(c.values),multiple:c.multiple,standard:true})),'Standard tag categories ('+miss.map(c=>c.name).join(', ')+') prepared for review.');}
 else if(action==='add-cat'&&event.kind==='submit'){const d={...draftOf('newcat'),...form},name=textOf(d.name,60);if(!name)throw Error('Name the category.');if(CATS.some(c=>c.name.toLowerCase()===name.toLowerCase()))throw Error('There is already a category called '+name+'.');
  propose([crt('cats',{name,values:JSON.stringify([...new Set(lines(d.values).map(x=>textOf(x,80)))]),multiple:bool(d.multiple),standard:false})],'Category "'+name+'" prepared for review.');st.f.newcat={};}
 else if(action==='save-cat'&&event.kind==='submit'){const p=st.panel,c=p&&CAT_ROWS.find(x=>x.id===p.id);if(!c)throw Error('That category is no longer available.');const d={...draftOf('cat'),...form};
  propose([upd('cats',c.id,{values:JSON.stringify([...new Set(lines(d.values).map(x=>textOf(x,80)))]),multiple:bool(d.multiple)},p.version)],'Category values prepared for review. Values already on opportunities stay there.');st.panel=null;st.f.cat={};}
 else if(isAct&&action&&!action.startsWith('document:')&&action!=='tracker:layout')throw Error('That action is not available here.');
}catch(e){failed=true;note(String(e&&e.message||e).slice(0,600));}

/* After an approved review the host re-renders with "open": an untouched panel adopts the record's current version. */
if(event.kind==='open'&&st.panel&&st.panel.id){const map={opp:'opps',org:'organizations',person:'people',conf:'confs',signal:'signals',brief:'briefs',cat:'cats',profile:'profiles',outcome:'acts',accept:'signals',dismiss:'signals'},role=map[st.panel.type],row=role&&ROW(role,st.panel.id);
 if(role&&!row)st.panel=null;else if(row&&!Object.keys(st.f[st.panel.type]||{}).length)st.panel.version=row.version;}
if(!CONF[st.confId])st.confId=(CONFS.filter(c=>c.status!=='done'&&(c.ends_on||c.starts_on)>=AS_OF).sort((a,b)=>String(a.starts_on).localeCompare(String(b.starts_on)))[0]||CONFS.slice().sort((a,b)=>String(b.starts_on).localeCompare(String(a.starts_on)))[0]||{}).id||'';

const glyph={overview:'<rect x="3" y="3" width="7" height="8" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/>',pipeline:'<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="7" rx="1"/>',partners:'<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 11a3 3 0 1 0 0-6M21 20c0-2.6-1.7-4.8-4-5.6"/>',conferences:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',activity:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',research:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',close:'<path d="M6 6l12 12M18 6L6 18"/>'};
const icon=(n,s=18)=>'<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(glyph[n]||glyph.overview)+'</svg>';
const btn=(text,a,cls,disabled,extra)=>'<button type="button" class="'+(cls===undefined?'pt-btn':cls)+'" data-action="'+esc(a)+'"'+(disabled?' disabled':'')+(extra?' '+extra:'')+'>'+text+'</button>';
const bS=(t,a,d,x)=>btn(t,a,'pt-btn small',d,x),bP=(t,a,d,x)=>btn(t,a,'pt-btn small pt-btn-primary',d,x),bL=(t,a,x)=>btn(t,a,'pt-link',false,x);
const submit=(text,ok,cls)=>'<button type="submit" class="'+(cls||'pt-btn pt-btn-primary')+'"'+(ok===false?' disabled':'')+'>'+esc(text)+'</button>';
const pill=(text,type)=>'<span class="pt-pill '+esc(type||'')+'">'+esc(text)+'</span>';
const stagePill=s=>pill(STAGE_LABEL[s]||label(s),s==='signed'?'green':s==='lost'?'red':s==='on_hold'?'amber':['term_sheet','exclusivity_diligence','confidential_evaluation'].includes(s)?'blue':'');
const kv=(k,v,raw)=>'<div class="pt-kv"><span>'+esc(k)+'</span><strong>'+(raw?v:esc(v===null||v===undefined||v===''?'—':v))+'</strong></div>';
function kpi(title,value,foot,tone){return '<div class="pt-kpi '+(tone||'')+'"><div class="pt-kpi-label">'+esc(title)+'</div><div class="pt-kpi-value">'+esc(value)+'</div><div class="pt-kpi-foot">'+esc(foot||'')+'</div></div>';}
const panel=(title,sub,body,right)=>'<section class="pt-panel"><div class="pt-pad"><div class="pt-panel-head"><div><h2>'+esc(title)+'</h2>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div>'+(right?'<div class="pt-row top0">'+right+'</div>':'')+'</div>'+body+'</div></section>';
const tbl=(lab,heads,rows,none)=>'<div class="pt-scroll" role="region" aria-label="'+esc(lab)+'" tabindex="0"><table class="pt-table"><thead><tr>'+heads.map(h=>h[0]==='#'?'<th scope="col" class="num">'+esc(h.slice(1))+'</th>':(h?'<th scope="col">'+esc(h):'<th scope="col" class="pt-actions">Actions')+'</th>').join('')+'</tr></thead><tbody>'+(rows.join('')||'<tr><td colspan="'+heads.length+'" class="pt-none">'+esc(none||'Nothing yet.')+'</td></tr>')+'</tbody></table></div>';
function paged(items,key,per){per=per||Math.min(50,Math.max(10,num(cfg.pageSize,25)||25));const k=key||'page',max=Math.max(0,Math.ceil(items.length/per)-1);st[k]=Math.min(st[k]||0,max);return {slice:items.slice(st[k]*per,(st[k]+1)*per),page:st[k],max,total:items.length,per,key:k};}
function pager(p){const s=p.key==='page2'?'2':'';return p.max===0?'':'<div class="pt-footer"><span>Showing '+(p.page*p.per+1)+'–'+Math.min(p.total,(p.page+1)*p.per)+' of '+p.total+'</span><span class="pt-pager">'+bS('Previous','prev-page'+s,p.page===0)+'<span>Page '+(p.page+1)+' of '+(p.max+1)+'</span>'+bS('Next','next-page'+s,p.page>=p.max)+'</span></div>';}
function inputOf(formName,name,value,o){o=o||{};const a='f:'+formName+':'+name,id='pt-'+formName+'-'+name.replace(/[^a-zA-Z0-9_-]/g,'_'),common=' id="'+esc(id)+'" name="'+esc(name)+'" data-ui-state="true" data-action="'+esc(a)+'"'+(o.disabled?' disabled':'')+(o.required?' required':'');
 const d=st.f[formName]&&has(st.f[formName],name)?st.f[formName][name]:value;
 if(o.type==='select')return '<select'+common+'>'+(o.blank===undefined?'':'<option value="">'+esc(o.blank)+'</option>')+o.options.map(x=>'<option value="'+esc(x[0])+'"'+(String(d===null||d===undefined?'':d)===String(x[0])?' selected':'')+'>'+esc(x[1])+'</option>').join('')+'</select>';
 if(o.type==='checkbox')return '<input type="checkbox"'+common+(bool(d)?' checked':'')+'>';
 if(o.type==='textarea')return '<textarea class="pt-textarea'+(o.cls?' '+o.cls:'')+'"'+common+(o.placeholder?' placeholder="'+esc(o.placeholder)+'"':'')+'>'+esc(d===null||d===undefined?'':d)+'</textarea>';
 return '<input class="pt-input" type="'+(o.type||'text')+'"'+common+(o.min!==undefined?' min="'+o.min+'"':'')+(o.max!==undefined?' max="'+o.max+'"':'')+(o.placeholder?' placeholder="'+esc(o.placeholder)+'"':'')+' value="'+esc(d===null||d===undefined?'':d)+'">';}
const fieldId=(formName,name)=>'pt-'+formName+'-'+name.replace(/[^a-zA-Z0-9_-]/g,'_');
const field=(formName,name,lab,value,o)=>o&&o.type==='checkbox'?'<label class="pt-check'+(o.wide?' wide':'')+'" for="'+fieldId(formName,name)+'">'+inputOf(formName,name,value,o)+'<span>'+esc(lab)+'</span></label>':'<label class="pt-field'+(o&&o.wide?' wide':'')+'" for="'+fieldId(formName,name)+'">'+esc(lab)+(o&&o.required?' *':'')+inputOf(formName,name,value,o)+(o&&o.hint?'<small class="pt-muted">'+esc(o.hint)+'</small>':'')+'</label>';
const opts=(xs,labels)=>xs.map(x=>[x,labels&&labels[x]?labels[x]:cap(x)]);
const orgOpts=()=>ORGS.slice().sort((a,b)=>String(a.name).localeCompare(String(b.name))).map(o=>[o.id,String(o.name||'Unnamed')]);
const progOpts=()=>PROGRAMS.map(p=>[p.id,progLong(p.id)]);
const teamOpts=()=>TEAM.map(n=>[n,n]);
function drawer(title,eyebrow,body,foot,formAction,wide){return '<div class="pt-overlay"><section class="pt-drawer'+(wide?' wide':'')+'" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="pt-drawer-head"><div><div class="pt-eyebrow">'+esc(eyebrow)+'</div><h2>'+esc(title)+'</h2></div>'+btn(icon('close',18),'close','pt-icon-btn',false,'aria-label="Close"')+'</div>'+(formAction?'<form class="pt-drawer-form" data-action="'+esc(formAction)+'">':'<div class="pt-drawer-form">')+'<div class="pt-drawer-body">'+body+'</div><div class="pt-drawer-foot">'+(foot||btn('Close','close'))+'</div>'+(formAction?'</form>':'</div>')+'</section></div>';}
const reviewNote='<div class="pt-banner">This is a proposal until a person approves the TrialAgents review. Nothing is sent to anyone.</div>';
const mini=(title,body)=>'<div class="pt-sec"><h3 class="pt-h3">'+esc(title)+'</h3>'+body+'</div>';
const ul=(items,none)=>items.length?'<ul class="pt-list">'+items.join('')+'</ul>':'<p class="pt-muted">'+esc(none||'Nothing yet.')+'</p>';
const tagChips=o=>{const t=tagsOf(o),xs=[];for(const [c,vs] of Object.entries(t))for(const v of vs)xs.push('<span class="pt-tag" title="'+esc(c)+'">'+esc(v)+'</span>');return xs.length?'<span class="pt-chips">'+xs.join('')+'</span>':'';};
const oppLink=o=>bL(esc(o.name||'Unnamed'),'open:opp:'+o.id);
const orgLink=id=>ORG[id]?bL(esc(orgName(id)),'open:org:'+id):esc(orgName(id));
const dueText=f=>isOverdue(f)?pill('Overdue '+diffDays(f.due,AS_OF)+' d','red'):f.due===AS_OF?pill('Today','amber'):esc(shortDate(f.due));

const current=SCREENS.find(s=>s.id===st.section)||SCREENS[0];
function heading(sub,right){return '<header class="pt-top"><div><div class="pt-eyebrow">Partnerships / '+esc(current.label)+'</div><h1 class="pt-title">'+esc(st.layout.heading)+'</h1><p class="pt-subtitle">'+esc(sub||DESC[current.id])+'</p></div><div class="pt-top-right">'+(right||'')+pill('As of '+dateLabel(AS_OF),'blue')+btn(icon('gear',18),'tracker:layout','pt-icon-btn',!inp.saved,'aria-label="App layout settings" title="Layout settings"')+'</div></header>';}
function checks(){return exact?'':'<div class="pt-banner bad" role="alert"><strong>Partial data: funnels, totals and "nothing due" answers may be incomplete, and changes are disabled.</strong> '+readProblems.slice(0,6).map(esc).join(' ')+'</div>';}
const meSelect=()=>'<label class="pt-field inline" for="pt-me">You are<select id="pt-me" name="me" data-ui-state="true" data-action="me"><option value="">Choose…</option>'+TEAM.map(n=>'<option value="'+esc(n)+'"'+(st.me===n?' selected':'')+'>'+esc(n)+'</option>').join('')+'</select></label>';
function integrationLine(){const offers=INTEG.filter(x=>x&&x.offer&&(x.role==='dataroom.access_grants'||x.role==='dataroom.engagement')).slice(0,1);
 const contracts=R.agreements.unbound?'Contracts is not connected, so CDA, term sheet and agreement links are manual references.':'Contracts shares agreements (read-only here; new CDAs and term sheets are proposed in Contracts).';
 const linked=integ('grants');const dr=linked&&linked.source==='linked'?'Data Room access and engagement are linked (read-only).':'Data room access is entered by hand here until Data Room is linked.';
 return '<p class="pt-muted pt-integ">'+esc(contracts+' '+dr+' Programs shares the assets; Fundraise shares partners and contacts.')+' '+offers.map(x=>'<button type="button" class="pt-link" data-trialy-integration="'+esc(x.offer+' '+x.role)+'">'+esc(x.offer==='install'?'Add Data Room':'Use Data Room\'s data')+'</button>').join('')+'</p>';}

/* 1 Overview */
function funnelTable(groups,labelOf,cap0){const rows=groups.map(([k,xs])=>{const f=funnelOf(xs);return '<tr><th scope="row">'+esc(labelOf(k))+'</th>'+f.counts.map(c=>'<td class="num">'+c+'</td>').join('')+'<td class="num">'+f.lost+'</td></tr>';});
 return tbl(cap0,[cap0].concat(PIPE.map(s=>'#'+STAGE_SHORT[s]),['#Lost']),rows,'No opportunities yet.');}
function funnelBars(xs){const f=funnelOf(xs),max=Math.max(1,f.counts[0]);
 return '<ol class="pt-funnel">'+PIPE.map((s,i)=>'<li><span class="pt-funnel-label">'+esc(STAGE_LABEL[s])+'</span><span class="pt-bar" aria-hidden="true"><span style="width:'+Math.round(f.counts[i]/max*100)+'%"></span></span><span class="pt-funnel-n"><strong>'+f.counts[i]+'</strong>'+(i&&f.conv[i]!==null?' <span class="pt-muted">'+pct(f.conv[i])+'</span>':'')+'</span></li>').join('')+'</ol>';}
function overview(){
 const open=OPPS.filter(isOpen),stalled=OPPS.filter(isStalled).sort((a,b)=>quietDays(b)-quietDays(a)),dueSoon=FUS.filter(f=>f.status==='open'&&validDate(f.due)&&f.due<=addDays(AS_OF,7)).sort((a,b)=>String(a.due).localeCompare(String(b.due))),over=dueSoon.filter(isOverdue);
 const newSig=SIGS.filter(s=>s.status==='new').sort((a,b)=>String(b.found_on).localeCompare(String(a.found_on)));
 const upcoming=ACTS.filter(a=>['meeting','call','conference_meeting'].includes(a.kind)&&validDate(a.occurred_on)&&a.occurred_on>=AS_OF&&a.occurred_on<=addDays(AS_OF,14)&&!['cancelled','declined'].includes(a.status)).sort((a,b)=>String(a.occurred_on).localeCompare(String(b.occurred_on)));
 const confs=CONFS.filter(c=>(c.ends_on||c.starts_on)>=AS_OF).sort((a,b)=>String(a.starts_on).localeCompare(String(b.starts_on)));
 const byAsset=PROGRAMS.map(p=>[p.id,OPPS.filter(o=>o.program_id===p.id)]).filter(x=>x[1].length),byDir=DIRS.map(d=>[d,OPPS.filter(o=>o.direction===d)]).filter(x=>x[1].length);
 return heading()+checks()+'<div class="pt-kpis">'+kpi('Open opportunities',exact?open.length:'—',plural(PROGRAMS.length,'asset')+', '+plural(new Set(open.map(o=>o.organization_id)).size,'partner'))+kpi('Follow-ups due (7 days)',exact?dueSoon.length:'—',over.length?over.length+' overdue':'none overdue',over.length?'bad':'')+kpi('Stalled',exact?stalled.length:'—','no activity for '+STALLED+'+ days',stalled.length?'bad':'')+kpi('New signals',newSig.length,'to review in Research')+'</div>'+
 panel('Funnel by asset','Opportunities that ever reached each stage (stage history).',funnelTable(byAsset,progName,'Asset'))+panel('Funnel by direction','Same rule, per direction.',funnelTable(byDir,d=>DIR_LABEL[d],'Direction'))+
 '<div class="pt-grid2">'+panel('Follow-ups due and overdue','Next 7 days and anything late.',ul(dueSoon.slice(0,8).map(f=>{const o=OPP[f.opportunity_id];return '<li><span>'+esc(f.title)+(o?' · '+orgLink(o.organization_id):'')+' <span class="pt-muted">('+esc(f.owner)+')</span></span><span class="pt-actions">'+dueText(f)+' '+bS('Done','fu-done:'+f.id,!canWrite('fus'),'aria-label="Mark '+esc(f.title)+' done"')+'</span></li>';}),'Nothing due in the next 7 days.'),dueSoon.length>8?bS('All follow-ups','goto:activity:followups')+'':'')+
 panel('Stalled opportunities','Open, with no activity, stage change or completed follow-up for '+STALLED+' days or more.',ul(stalled.slice(0,8).map(o=>'<li><span>No activity on '+oppLink(o)+' for '+quietDays(o)+' days, last stage '+esc(STAGE_LABEL[o.stage])+'</span>'+pill(o.owner||'—')+'</li>'),'No stalled opportunities.'))+'</div>'+
 '<div class="pt-grid2">'+panel('Upcoming meetings and conferences','Next 14 days.',ul(confs.slice(0,3).map(c=>'<li><span>'+bL(esc(c.name),'open:conf:'+c.id)+' · '+esc(shortDate(c.starts_on)+(c.ends_on&&c.ends_on!==c.starts_on?'–'+shortDate(c.ends_on):''))+' · '+esc(c.location||'')+'</span>'+pill(plural(ACTS.filter(a=>a.conference_id===c.id&&!['cancelled','declined'].includes(a.status)).length,'meeting'),'blue')+'</li>').concat(upcoming.slice(0,6).map(a=>'<li><span>'+esc(shortDate(a.occurred_on))+' · '+esc(ACT_LABEL[a.kind])+' with '+orgLink(a.organization_id)+(a.status==='requested'?' '+pill('Requested','amber'):'')+'</span>'+(BRIEFS.some(b=>b.activity_id===a.id)?pill('Brief ready','green'):a.opportunity_id?pill('No brief'):'')+'</li>')),'Nothing scheduled.'))+
 panel('New signals','Found by partner research and not yet reviewed.',ul(newSig.slice(0,6).map(s=>'<li><span>'+pill(SIG_LABEL[s.kind]||s.kind,s.kind==='target_suggestion'?'blue':'')+' '+esc(s.title)+' <span class="pt-muted">'+esc(s.why)+'</span></span>'+bS('Review','open:signal:'+s.id)+'</li>'),'No new signals.'))+'</div>'+integrationLine();}

/* 2 Pipeline */
function filterBar(){const f=st.flt,sel=(k,lab,options)=>'<label class="pt-field" for="pt-flt-'+esc(k.replace(/[^a-z0-9]/gi,'_'))+'">'+esc(lab)+'<select id="pt-flt-'+esc(k.replace(/[^a-z0-9]/gi,'_'))+'" name="flt_'+esc(k)+'" data-ui-state="true" data-action="flt:'+esc(k)+'"><option value="">All</option>'+options.map(x=>'<option value="'+esc(x[0])+'"'+((k.startsWith('tag:')?(f.tags[k.slice(4)]||[])[0]:f[k][0])===x[0]?' selected':'')+'>'+esc(x[1])+'</option>').join('')+'</select></label>';
 const n=fltCount(f);
 return '<div class="pt-filters" role="group" aria-label="Filters"><div class="pt-filters-head">Filters'+(n?' ('+n+' active)':'')+'</div><div class="pt-filter-row">'+sel('program','Asset',progOpts())+sel('direction','Direction',opts(DIRS,DIR_LABEL))+sel('owner','Owner',teamOpts())+sel('stage','Stage',opts(STAGES,STAGE_LABEL))+CATS.filter(c=>c.values.length).map(c=>sel('tag:'+c.name,c.name,c.values.map(v=>[v,v]))).join('')+(n?'<div class="pt-field"><span>&nbsp;</span>'+bS('Clear filters','clear-filters')+'</div>':'')+'</div></div>';}
function viewBar(){const vs=visibleViews(),cur=VIEWS.find(v=>v.id===st.viewId);
 const modes='<div class="pt-seg" role="group" aria-label="Layout">'+LAYOUTS.map(m=>btn(cap(m),'mode:'+m,'pt-seg-btn',false,'aria-pressed="'+(st.mode===m)+'"')).join('')+'</div>';
 return '<div class="pt-picker"><label class="pt-field" for="pt-view">Saved view<select id="pt-view" name="view" data-ui-state="true" data-action="pick-view"><option value="">All opportunities</option>'+vs.map(v=>'<option value="'+esc(v.id)+'"'+(v.id===st.viewId?' selected':'')+'>'+esc(v.name)+(bool(v.shared)?' · shared':' · private')+'</option>').join('')+'</select></label>'+meSelect()+
 '<div class="pt-row top0">'+modes+bS('Save as view','panel:saveview',!canWrite('views')||!fltCount(st.flt))+(cur&&cur.owner===st.me?bS('Update view','update-view',!canWrite('views'))+bS('Remove view','archive-view',!canWrite('views')):'')+'</div>'+(st.me?'':'<p class="pt-muted pt-wide">Choose who you are to see your private views. Private views are hidden from other people\'s pickers; they are a preference, not a permission (anyone with access to the app can read the records).</p>')+'</div>';}
function pipeline(){const xs=OPPS.filter(o=>matches(o,st.flt,st.query)).sort((a,b)=>STAGES.indexOf(a.stage)-STAGES.indexOf(b.stage)||String(a.next_date||'9').localeCompare(String(b.next_date||'9')));
 const toolbar='<div class="pt-toolbar"><input class="pt-search" type="search" name="query" aria-label="Search opportunities" placeholder="Search opportunities" data-ui-state="true" data-action="query" value="'+esc(st.query)+'">'+btn('<span class="pt-hide-xs">New opportunity</span><span class="pt-show-xs">+ New</span>','add:opps','pt-btn pt-btn-primary',!canWrite('opps'),'aria-label="New opportunity"')+'</div>';
 let body='';
 if(st.mode==='board'){body='<div class="pt-board" role="region" aria-label="Pipeline board" tabindex="0">'+STAGES.map(s=>{const cs=xs.filter(o=>o.stage===s);return '<section class="pt-col'+(CLOSED.includes(s)?' closed':'')+'" aria-label="'+esc(STAGE_LABEL[s])+'"><h3>'+esc(STAGE_LABEL[s])+' <span class="pt-count">'+cs.length+'</span></h3>'+cs.slice(0,40).map(o=>'<button type="button" class="pt-card" data-action="open:opp:'+esc(o.id)+'"><strong>'+esc(o.name)+'</strong><span>'+esc(orgName(o.organization_id))+' · '+esc(progName(o.program_id))+'</span><span class="pt-card-meta">'+esc(DIR_LABEL[o.direction]||'')+' · '+esc(o.owner||'')+(o.next_date?' · '+esc(shortDate(o.next_date)):'')+'</span>'+(isStalled(o)?'<span class="pt-flag">Stalled '+quietDays(o)+' d</span>':'')+(o.stage==='lost'&&o.lost_reason?'<span class="pt-flag">'+esc(o.lost_reason)+'</span>':'')+'</button>').join('')+(cs.length>40?'<p class="pt-muted">'+(cs.length-40)+' more in the list</p>':'')+'</section>';}).join('')+'</div>';}
 else if(st.mode==='list'){const p=paged(xs),c=cols('pipeline'),H={name:'Opportunity',partner:'Partner',asset:'Asset',direction:'Direction',stage:'Stage',owner:'Owner',next:'Next step',fit:'#Fit',tags:'Tags'};
  const cell={name:o=>'<th scope="row">'+oppLink(o)+(isStalled(o)?' <span class="pt-flag">Stalled</span>':'')+'</th>',partner:o=>'<td>'+orgLink(o.organization_id)+'</td>',asset:o=>'<td>'+esc(progName(o.program_id))+'</td>',direction:o=>'<td>'+esc(DIR_LABEL[o.direction]||'—')+'</td>',stage:o=>'<td>'+stagePill(o.stage)+'</td>',owner:o=>'<td>'+esc(o.owner||'—')+'</td>',next:o=>'<td>'+esc(o.next_step||'—')+(o.next_date?' <span class="pt-muted">'+esc(shortDate(o.next_date))+'</span>':'')+'</td>',fit:o=>'<td class="num">'+esc(o.fit||'—')+'</td>',tags:o=>'<td>'+tagChips(o)+'</td>'};
  body=tbl('Opportunities',c.map(k=>H[k]),p.slice.map(o=>'<tr>'+c.map(k=>cell[k](o)).join('')+'</tr>'),'No opportunities match.')+pager(p);}
 else{const f=funnelOf(xs),grp=(keyOf,labelOf)=>{const m={};for(const o of xs){const k=keyOf(o)||'—';(m[k]=m[k]||[]).push(o);}return Object.entries(m).map(([k,ys])=>{const g=funnelOf(ys);return '<tr><th scope="row">'+esc(labelOf(k))+'</th><td class="num">'+ys.length+'</td><td class="num">'+g.open+'</td><td class="num">'+g.signed+'</td><td class="num">'+g.lost+'</td><td class="num">'+g.hold+'</td><td class="num">'+pct(g.signed+g.lost?g.signed/(g.signed+g.lost):null)+'</td></tr>';});};
  const wl=(t,k,l)=>mini(t,tbl('Win/loss by '+t.toLowerCase(),[t,'#Total','#Open','#Signed','#Lost','#On hold','#Win rate'],grp(k,l)));
  body='<div class="pt-grid2"><div>'+mini('Funnel ('+plural(xs.length,'opportunity')+')',funnelBars(xs))+'<p class="pt-muted">Each opportunity counts at every stage up to the furthest stage it reached in its stage history; conversion is next stage ÷ stage.</p></div><div>'+mini('Win/loss',kv('Signed',f.signed)+kv('Lost',f.lost)+kv('On hold',f.hold)+kv('Win rate (signed ÷ signed + lost)',pct(f.signed+f.lost?f.signed/(f.signed+f.lost):null)))+mini('Loss and on-hold reasons',ul(f.reasons.map(([r,n])=>'<li><span>'+esc(r)+'</span>'+pill(String(n))+'</li>'),'No losses.'))+'</div></div>'+wl('Asset',o=>o.program_id,progName)+wl('Direction',o=>o.direction,d=>DIR_LABEL[d]||d)+wl('Source',o=>o.source,s=>cap(s));}
 return heading()+checks()+viewBar()+'<section class="pt-panel"><div class="pt-pad">'+toolbar+filterBar()+'</div>'+(st.mode==='list'?body:'<div class="pt-pad pt-pad-top0">'+body+'</div>')+'</section>';}

/* 3 Partners */
function partners(){const q=st.query.toLowerCase();const info=ORGS.map(o=>{const ops=OPPS_ALL.filter(x=>x.organization_id===o.id),openOps=ops.filter(x=>!bool(x.archived)&&isOpen(x));return {o,ops,openOps,pri:PRI.find(p=>openOps.some(x=>x.priority===p))||'',last:lastContactOfOrg(o.id),assets:[...new Set(ops.map(x=>progName(x.program_id)))]};})
  .filter(x=>!q||String(x.o.name).toLowerCase().includes(q)||String(x.o.country||'').toLowerCase().includes(q)).sort((a,b)=>b.openOps.length-a.openOps.length||String(a.o.name).localeCompare(String(b.o.name)));
 const p=paged(info),c=cols('partners'),H={partner:'Partner',type:'Type',region:'Country or region',assets:'Assets',open:'#Open',priority:'Priority',last:'Last contact'};
 const cell={partner:x=>'<th scope="row">'+orgLink(x.o.id)+(x.ops.some(o=>o.stage==='lost')?' <span class="pt-flag">Declined before</span>':'')+'</th>',type:x=>'<td>'+esc(cap(x.o.org_type))+'</td>',region:x=>'<td>'+esc(x.o.country||'—')+'</td>',assets:x=>'<td>'+esc(x.assets.join(', ')||'—')+'</td>',open:x=>'<td class="num">'+x.openOps.length+'</td>',priority:x=>'<td>'+(x.pri?pill(cap(x.pri),x.pri==='high'?'blue':''):'—')+'</td>',last:x=>'<td>'+esc(x.last?dateLabel(x.last):'—')+'</td>'};
 const ppl=PEOPLE.filter(x=>!q||String(x.name).toLowerCase().includes(q)||orgName(x.organization_id).toLowerCase().includes(q)).sort((a,b)=>String(a.name).localeCompare(String(b.name))),pp=paged(ppl,'page2');
 const toolbar='<div class="pt-toolbar"><input class="pt-search" type="search" name="query" aria-label="Search partners and contacts" placeholder="Search partners and contacts" data-ui-state="true" data-action="query" value="'+esc(st.query)+'">'+btn('<span class="pt-hide-xs">Add partner</span><span class="pt-show-xs">+ Partner</span>','add:organizations','pt-btn pt-btn-primary',!canWrite('organizations'),'aria-label="Add partner"')+btn('<span class="pt-hide-xs">Add contact</span><span class="pt-show-xs">+ Contact</span>','add:people','pt-btn',!canWrite('people'),'aria-label="Add contact"')+'</div>';
 return heading()+checks()+'<section class="pt-panel"><div class="pt-pad">'+toolbar+'<p class="pt-muted">Partners are the shared organizations; contacts the shared people. Open a partner for the full history before any meeting.</p></div>'+tbl('Partners',c.map(k=>H[k]),p.slice.map(x=>'<tr>'+c.map(k=>cell[k](x)).join('')+'</tr>'),'No partners yet.')+pager(p)+'</section>'+
 '<section class="pt-panel"><div class="pt-pad"><div class="pt-panel-head"><div><h2>Contacts</h2><p>Role and last contact, from activities.</p></div></div></div>'+tbl('Contacts',['Contact','Partner','Role','Last contact'],pp.slice.map(x=>{const l=lastContactOfPerson(x.id);return '<tr><th scope="row">'+bL(esc(x.name),'open:person:'+x.id)+'</th><td>'+orgLink(x.organization_id)+'</td><td>'+esc(x.title||'—')+'</td><td>'+esc(l?dateLabel(l):'—')+'</td></tr>';}),'No contacts yet.')+pager(pp)+'</section>';}

/* Partner history: opportunities (declines first), activities, materials, conferences, signals. */
function orgHistory(orgId,personId){const ops=historyOf(orgId),acts=ACTS.filter(a=>a.organization_id===orgId&&(!personId||list(a.person_ids).includes(personId))).sort((a,b)=>String(b.occurred_on).localeCompare(String(a.occurred_on)));
 const opsShown=personId?ops.filter(o=>list(o.contact_ids).includes(personId)):ops,mats=acts.flatMap(a=>materialsOf(a).map(m=>({a,m})));
 return mini('Have we spoken to them?',(opsShown.some(o=>o.stage==='lost'||o.stage==='on_hold')?'<div class="pt-banner warn">Declined or paused before: '+opsShown.filter(o=>o.stage==='lost'||o.stage==='on_hold').map(o=>esc(o.name)+' — '+esc(o.lost_reason||'no reason recorded')).join('; ')+'</div>':'')+
  ul(opsShown.map(o=>'<li><span>'+oppLink(o)+' · '+esc(progName(o.program_id))+' · '+esc(DIR_LABEL[o.direction]||'')+(bool(o.archived)?' '+pill('Archived'):'')+'</span>'+stagePill(o.stage)+'</li>'),'No opportunities with them.'))+
 mini('Activities ('+acts.length+')',ul(acts.slice(0,12).map(a=>'<li><span><span class="pt-muted">'+esc(dateLabel(a.occurred_on))+'</span> '+esc(ACT_LABEL[a.kind]||a.kind)+(a.team?' · '+esc(a.team):'')+(list(a.person_ids).length?' with '+esc(list(a.person_ids).map(personName).filter(Boolean).join(', ')):'')+(a.summary?' — '+esc(textOf(a.summary,160)):'')+(a.outcome?' <em>Outcome: '+esc(textOf(a.outcome,120))+'</em>':'')+'</span>'+(a.conference_id&&CONF[a.conference_id]?pill(CONF[a.conference_id].name,'blue'):'')+'</li>'),'No activities yet.'))+
 mini('Materials shared',ul(mats.slice(0,10).map(x=>'<li><span>'+esc(x.m.title||'Document')+esc(ver(x.m.version))+' → '+esc(list(x.a.person_ids).map(personName).filter(Boolean).join(', ')||orgName(x.a.organization_id))+'</span><span class="pt-muted">'+esc(dateLabel(x.a.occurred_on))+'</span></li>'),'Nothing shared yet.'));}
function orgPanel(p){const o=ORG[p.id];if(!o)return '';const ppl=PEOPLE.filter(x=>x.organization_id===o.id),sig=SIGS.filter(s=>s.organization_id===o.id).sort((a,b)=>String(b.found_on).localeCompare(String(a.found_on)));
 return drawer(String(o.name||'Partner'),'Partner',kv('Type',cap(o.org_type))+kv('Country or region',o.country)+kv('Website',o.website)+orgHistory(o.id)+
  mini('Contacts',ul(ppl.map(x=>'<li><span>'+bL(esc(x.name),'open:person:'+x.id)+' <span class="pt-muted">'+esc(x.title||'')+'</span></span><span class="pt-muted">'+esc(lastContactOfPerson(x.id)?'Last '+dateLabel(lastContactOfPerson(x.id)):'No contact yet')+'</span></li>'),'No contacts.'))+
  mini('Signals',ul(sig.slice(0,8).map(s=>'<li><span>'+pill(SIG_LABEL[s.kind]||s.kind)+' '+esc(s.title)+' <span class="pt-muted">'+esc(s.why)+'</span></span>'+pill(cap(s.status))+'</li>'),'No signals.'))+(roomsOf(o.id).length?mini('Data rooms',ul(roomsOf(o.id).map(r=>'<li><span>'+esc(r.name)+'</span>'+pill(plural(r.grants.length,'person'))+'</li>'))):''),
  btn('New opportunity','add:opps:'+o.id,'pt-btn',!canWrite('opps'))+btn('Add contact','add:people:'+o.id,'pt-btn',!canWrite('people'))+btn('Edit','edit:organizations:'+o.id,'pt-btn',!canWrite('organizations'))+btn('Close','close','pt-btn pt-btn-primary'),'',true);}
function personPanel(p){const x=PERSON[p.id];if(!x)return '';return drawer(String(x.name||'Contact'),'Contact at '+orgName(x.organization_id),kv('Partner',orgName(x.organization_id))+kv('Role',x.title)+kv('Professional email',x.email)+kv('Last contact',lastContactOfPerson(x.id)?dateLabel(lastContactOfPerson(x.id)):'—')+
  '<p class="pt-muted">The app never emails contacts. Write from your own mailbox and log it here.</p>'+orgHistory(x.organization_id,x.id),btn('Edit','edit:people:'+x.id,'pt-btn',!canWrite('people'))+(ORG[x.organization_id]?btn('Open partner','open:org:'+x.organization_id,'pt-btn'):'')+btn('Close','close','pt-btn pt-btn-primary'));}

/* Opportunity side panel: stage history, activities, follow-ups, materials, gates, tags, contacts, history check. */
function oppPanel(p){const o=OPP[p.id];if(!o)return '';const hs=histOf(o.id),acts=actsOfOpp(o.id),fus=fusOfOpp(o.id),W=canWrite('opps')&&!bool(o.archived),d=draftOf('opp');
 const move='<form class="pt-form" data-action="move-stage">'+field('opp','to','Move to',d.to||'',{type:'select',blank:'Choose a stage…',options:STAGES.filter(s=>s!==o.stage).map(s=>[s,STAGE_LABEL[s]])})+field('opp','on','Date',d.on||AS_OF,{type:'date'})+
  ((d.to==='lost'||d.to==='on_hold')?field('opp','reason','Reason',d.reason||'',{type:'select',blank:'Choose…',options:LOST.map(r=>[r,r])})+(d.reason==='Other'?field('opp','reason_other','Other reason',''):''):'')+field('opp','note','Note','',{wide:true})+'<div class="pt-row">'+submit('Move (reviewed)',W&&canWrite('history'))+'</div></form>';
 const ag=k=>{const a=agreementLabel(o[k]);return a?esc(a.name)+' '+pill(a.status,a.signed?'green':a.linked?'blue':''):'—';};
 const room=roomView(o),rooms=roomsOf(o.organization_id),g=draftOf('gates');
 const agSel=(k,lab,types)=>R.agreements.unbound?field('gates',k,lab+' (manual reference)',o[k]||'',{hint:'Contracts is not connected: e.g. "CDA signed 3 Oct, on file".'}):field('gates',k,lab,o[k]||'',{type:'select',blank:'None',options:AGREEMENTS.filter(a=>a.counterparty_id===o.organization_id||types.includes(a.agreement_type)||a.id===o[k]).sort((a,b)=>(a.counterparty_id===o.organization_id?0:1)-(b.counterparty_id===o.organization_id?0:1)).map(a=>[a.id,String(a.name||'Agreement')+' · '+(AG_STATUS[a.status]||label(a.status))]).concat(o[k]&&!AGREEMENT[o[k]]?[[o[k],'Manual: '+o[k]]]:[])});
 const gates=mini('Gates',kv('CDA',ag('cda_agreement_id'),true)+kv('Data room',room?esc(room.name)+' '+(room.grants.length?room.grants.map(x=>pill(cap(x.status||'invited'),x.status==='active'?'green':'')).join(' '):pill(GRANTS.length||optState('grants')==='ok'?'No access recorded':'Manual reference')):'—',true)+
  (room&&(room.views||room.grants.length)?'<p class="pt-muted">Engagement: '+plural(room.views,'view')+(room.seconds?', about '+Math.round(room.seconds/60)+' min':'')+(room.last?', last '+esc(dateLabel(room.last)):'')+(room.docs.length?'. Most viewed: '+room.docs.map(e=>esc(e.document_title||'Document')+' ('+num(e.view_count,0)+')').join(', '):'')+'.</p>':'')+
  kv('Term sheet',ag('term_sheet_agreement_id'),true)+kv('Signed agreement',ag('agreement_id'),true)+
  '<div class="pt-sub"><h4>Link CDA, data room, term sheet, agreement</h4><form class="pt-form" data-action="save-gates">'+agSel('cda_agreement_id','CDA',['cda_nda'])+
  (rooms.length?field('gates','dataroom_room_id','Data room',o.dataroom_room_id||'',{type:'select',blank:'None',options:rooms.map(r=>[r.id,r.name+(r.purpose?' · '+label(r.purpose):'')]).concat(o.dataroom_room_id&&!rooms.some(r=>r.id===o.dataroom_room_id)?[[o.dataroom_room_id,'Manual: '+o.dataroom_room_id]]:[])}):field('gates','dataroom_room_id','Data room (reference)',o.dataroom_room_id||'',{hint:'No data room access for this partner is recorded yet.'}))+
  agSel('term_sheet_agreement_id','Term sheet',['licence_out','licence_in','research_collaboration'])+agSel('agreement_id','Signed agreement',['licence_out','licence_in','research_collaboration','other'])+'<div class="pt-row">'+submit('Save links (reviewed)',W)+'</div></form>'+
  '<p class="pt-muted">New CDAs, term sheets and agreements are proposed in Contracts (your assistant prepares them there for review); confidential rooms are created in Data Room. Partnerships links them and never writes those apps\' tables.</p>'+
  (canWrite('grants')&&!(integ('grants')&&integ('grants').source==='linked')?'<div class="pt-sub"><h4>Record data room access by hand</h4><form class="pt-form" data-action="add-grant">'+field('grant','room_name','Room','')+field('grant','status','Access','invited',{type:'select',options:opts(GS)})+field('grant','person_id','Person','',{type:'select',blank:'Whole partner',options:PEOPLE.filter(x=>x.organization_id===o.organization_id).map(x=>[x.id,x.name])})+field('grant','granted_on','Granted on',AS_OF,{type:'date'})+'<div class="pt-row">'+submit('Save entry (reviewed)',W)+'</div></form></div>':'')+'</div>');
 const tagForm=mini('Tags','<form class="pt-form" data-action="save-tags">'+CATS.filter(c=>c.values.length).map(c=>{const cur=tagsOf(o)[c.name]||[];return c.multiple?'<fieldset class="pt-fieldset wide"><legend>'+esc(c.name)+'</legend>'+c.values.map(v=>field('tags','tag_'+c.name+'__'+v,v,cur.includes(v),{type:'checkbox'})).join('')+'</fieldset>':field('tags','tag_'+c.name,c.name,cur[0]||'',{type:'select',blank:'None',options:c.values.map(v=>[v,v])});}).join('')+'<div class="pt-row">'+submit('Save tags (reviewed)',W)+'</div></form>');
 const cs=PEOPLE.filter(x=>x.organization_id===o.organization_id),cur=contactsOf(o);
 const contacts=mini('Contacts',(cur.length?'<p>'+cur.map(id=>bL(esc(personName(id)),'open:person:'+id)).join(', ')+'</p>':'<p class="pt-muted">No contacts linked.</p>')+(cs.length?'<div class="pt-sub"><h4>Change contacts</h4><form class="pt-form" data-action="save-contacts">'+cs.map(x=>field('contacts','c_'+x.id,x.name+(x.title?' · '+x.title:''),cur.includes(x.id),{type:'checkbox'})).join('')+'<div class="pt-row">'+submit('Save contacts (reviewed)',W)+'</div></form></div>':''));
 const mats=acts.flatMap(a=>materialsOf(a).map(m=>({a,m})));
 return drawer(String(o.name||'Opportunity'),'Opportunity · '+orgName(o.organization_id),
  '<div class="pt-chips">'+stagePill(o.stage)+pill(DIR_LABEL[o.direction]||'—','blue')+pill(progName(o.program_id))+pill('Owner '+(o.owner||'—'))+(o.priority?pill(cap(o.priority)+' priority'):'')+(o.fit?pill('Fit '+o.fit+'/5'):'')+(o.source?pill('Source: '+o.source):'')+'</div>'+
  (isStalled(o)?'<div class="pt-banner warn">No activity on '+esc(orgName(o.organization_id))+' for '+quietDays(o)+' days, last stage '+esc(STAGE_LABEL[o.stage])+'.</div>':'')+(o.lost_reason&&!isOpen(o)?'<div class="pt-banner warn">'+esc(STAGE_LABEL[o.stage])+': '+esc(o.lost_reason)+'</div>':'')+
  kv('Next step',(o.next_step||'—')+(o.next_date?' · '+dateLabel(o.next_date):''))+kv('Fit rationale',o.fit_rationale)+tagChips(o)+
  mini('Stage',move+ul(hs.slice().reverse().map(h=>'<li><span><span class="pt-muted">'+esc(dateLabel(h.changed_on))+'</span> '+esc(h.from_stage?STAGE_LABEL[h.from_stage]||h.from_stage:'Start')+' → <strong>'+esc(STAGE_LABEL[h.to_stage]||h.to_stage)+'</strong>'+(h.note?' — '+esc(h.note):'')+'</span><span class="pt-muted">'+esc(h.changed_by||'')+'</span></li>'),'No stage changes recorded yet.'))+gates+
  mini('Activities ('+acts.length+')',ul(acts.slice(0,10).map(a=>'<li><span><span class="pt-muted">'+esc(dateLabel(a.occurred_on))+'</span> '+esc(ACT_LABEL[a.kind]||a.kind)+(a.summary?' — '+esc(textOf(a.summary,160)):'')+(a.outcome?' <em>Outcome: '+esc(textOf(a.outcome,120))+'</em>':'')+'</span>'+(a.status?pill(cap(a.status)):'')+'</li>'),'No activities yet.')+'<div class="pt-row">'+bS('Log activity','panel:log:'+o.id,!canWrite('acts'))+'</div>')+
  mini('Follow-ups',ul(fus.map(f=>'<li><span>'+esc(f.title)+' <span class="pt-muted">('+esc(f.owner)+')</span></span><span class="pt-actions">'+(f.status==='open'?dueText(f)+' '+bS('Done','fu-done:'+f.id,!canWrite('fus'),'aria-label="Mark '+esc(f.title)+' done"'):pill(cap(f.status),f.status==='done'?'green':''))+'</span></li>'),'No follow-ups.')+'<div class="pt-row">'+bS('Add follow-up','panel:fu:'+o.id,!canWrite('fus'))+'</div>')+
  mini('Materials shared',ul(mats.map(x=>'<li><span>'+esc(x.m.title||'Document')+esc(ver(x.m.version))+'</span><span class="pt-muted">'+esc(dateLabel(x.a.occurred_on))+'</span></li>'),'Nothing shared yet.'))+tagForm+contacts+
  mini('Partner history',historyWarning(o.organization_id,o.id)),
  btn('Edit','edit:opps:'+o.id,'pt-btn',!W)+btn('Archive','archive:opps:'+o.id,'pt-btn danger',!W)+btn('Close','close','pt-btn pt-btn-primary'),'',true);}

/* 4 Conferences */
function conferences(){if(!CONFS.length)return heading()+checks()+panel('No conference yet','Add a conference: its name becomes a value of the Conference tag, so its view is one click.',btn('New conference','add:confs','pt-btn pt-btn-primary',!canWrite('confs')));
 const c=CONF[st.confId]||CONFS[0],ms=ACTS.filter(a=>a.conference_id===c.id).sort((a,b)=>String(a.occurred_on).localeCompare(String(b.occurred_on))||String(a.summary||'').localeCompare(String(b.summary||''))),live=ms.filter(m=>!['cancelled','declined'].includes(m.status));
 const tagged=OPPS.filter(o=>(tagsOf(o).Conference||[]).includes(c.tag_value)),noMeet=tagged.filter(o=>!ms.some(m=>m.opportunity_id===o.id)&&isOpen(o));
 const dl=(parseJSON(c.deadlines)||[]).filter(x=>x&&validDate(x.date)).sort((a,b)=>a.date.localeCompare(b.date)),after=AS_OF>(c.ends_on||c.starts_on),briefFor=m=>BRIEFS.find(b=>b.activity_id===m.id);
 const picker='<div class="pt-picker"><label class="pt-field" for="pt-conf">Conference<select id="pt-conf" name="conf" data-ui-state="true" data-action="pick-conf">'+CONFS.slice().sort((a,b)=>String(b.starts_on).localeCompare(String(a.starts_on))).map(k=>'<option value="'+esc(k.id)+'"'+(k.id===c.id?' selected':'')+'>'+esc(k.name)+' · '+esc(shortDate(k.starts_on))+'</option>').join('')+'</select></label><div class="pt-row top0">'+bP('Open its pipeline view','conf-view')+bS('Edit','edit:confs:'+c.id,!canWrite('confs'))+bS('New conference','add:confs',!canWrite('confs'))+'</div></div>';
 const days=diffDays(AS_OF,c.starts_on);
 const prep=panel('Prep','Goals, team, deadlines, who to meet, requests and briefs.','<div class="pt-grid2"><div>'+kv('Dates',dateLabel(c.starts_on)+(c.ends_on&&c.ends_on!==c.starts_on?' – '+dateLabel(c.ends_on):''))+kv('Location',c.location)+kv('Partnering platform',PLATFORM_LABEL[c.platform]||'—')+kv('Team',c.team)+kv('Status',cap(c.status))+kv('Tag',c.tag_value)+'</div><div>'+mini('Goals','<p class="pt-pre">'+esc(c.goals||'No goals yet.')+'</p>')+mini('Deadlines',ul(dl.map(x=>'<li><span>'+esc(x.label)+'</span>'+(x.date<AS_OF?pill(dateLabel(x.date)+' · passed'):pill(dateLabel(x.date)+' · in '+diffDays(AS_OF,x.date)+' d',diffDays(AS_OF,x.date)<=3?'amber':'blue'))+'</li>'),'No deadlines.'))+'</div></div>'+
  mini('Meetings and requests ('+live.length+')',tbl('Conference meetings',['Date','Partner','Opportunity','Status','Brief',''],ms.map(m=>{const o=OPP[m.opportunity_id],b=briefFor(m),h=historyOf(m.organization_id,o&&o.id).filter(x=>x.stage==='lost');return '<tr><td>'+esc(shortDate(m.occurred_on))+(m.summary?'<br><span class="pt-muted">'+esc(textOf(m.summary,60))+'</span>':'')+'</td><td>'+orgLink(m.organization_id)+(h.length?' <span class="pt-flag">Declined before: '+esc(h[0].lost_reason||'')+'</span>':'')+'</td><td>'+(o?oppLink(o)+' '+stagePill(o.stage):'<span class="pt-muted">None yet</span>')+'</td><td>'+pill(cap(m.status||'requested'),m.status==='confirmed'||m.status==='held'?'green':m.status==='requested'?'amber':'')+'</td><td>'+(b?bL('Open brief','open:brief:'+b.id):m.opportunity_id?bL('Write brief','add:briefs:'+m.id):'—')+'</td><td class="pt-actions">'+bS(after||m.status==='held'?'Log outcome':'Update','panel:outcome:'+m.id,!canWrite('acts'))+'</td></tr>';}),'No meetings or requests yet.')+'<div class="pt-row">'+bS('Add meeting or request','panel:meeting',!canWrite('acts'))+'</div>')+
  mini('Who to meet ('+noMeet.length+')',ul(noMeet.map(o=>'<li><span>'+oppLink(o)+' · '+esc(progName(o.program_id))+'</span>'+stagePill(o.stage)+'</li>'),'Every tagged opportunity has a meeting or request.')));
 const out=panel('After the event','Outcome and next step per meeting, and the follow-ups created from it.',tbl('After the event',['Partner','Outcome','Next step','Follow-ups'],ms.filter(m=>m.status==='held'||m.outcome).map(m=>{const o=OPP[m.opportunity_id],fs=FUS.filter(f=>f.activity_id===m.id||(o&&f.opportunity_id===o.id&&validDate(f.due)&&f.due>=m.occurred_on));return '<tr><td>'+orgLink(m.organization_id)+'</td><td>'+esc(m.outcome||'—')+'</td><td>'+esc(o&&o.next_step||'—')+(o&&o.next_date?' · '+esc(shortDate(o.next_date)):'')+'</td><td>'+(fs.length?fs.map(f=>esc(f.title)+' ('+esc(f.owner)+')').join('<br>'):'—')+'</td></tr>';}),after?'No outcomes logged yet: use Log outcome on each meeting.':'Outcomes appear here after each meeting.'));
 return heading()+checks()+picker+'<div class="pt-kpis">'+kpi(days>0?'Starts in':'Started',days>0?days+' d':dateLabel(c.starts_on),dateLabel(c.starts_on))+kpi('Meetings',live.filter(m=>m.status==='confirmed'||m.status==='held').length,live.filter(m=>m.status==='requested').length+' requests pending')+kpi('Briefs ready',live.filter(briefFor).length+' / '+live.filter(m=>m.opportunity_id).length,'one page per meeting')+kpi('Who to meet',noMeet.length,'tagged, without a meeting')+'</div>'+(after?out+prep:prep+out);}

/* 5 Activity */
function activityScreen(){const subs=[['timeline','Timeline'],['followups','Follow-ups'],['materials','Materials log'],['week','My week']];if(!subs.some(s=>s[0]===st.sub))st.sub='timeline';
 const tabs='<div class="pt-seg" role="group" aria-label="Activity view">'+subs.map(s=>btn(s[1],'sub:'+s[0],'pt-seg-btn',false,'aria-pressed="'+(st.sub===s[0])+'"')).join('')+'</div>';let body='';
 if(st.sub==='timeline'){const xs=ACTS.filter(a=>(!st.actKind||a.kind===st.actKind)&&(!st.query||(orgName(a.organization_id)+' '+(a.summary||'')).toLowerCase().includes(st.query.toLowerCase()))).sort((a,b)=>String(b.occurred_on).localeCompare(String(a.occurred_on))),p=paged(xs);
  body='<div class="pt-pad"><div class="pt-toolbar"><input class="pt-search" type="search" name="query" aria-label="Search activities" placeholder="Search activities" data-ui-state="true" data-action="query" value="'+esc(st.query)+'"><select aria-label="Kind" name="act_kind" data-ui-state="true" data-action="act-kind" class="pt-select"><option value="">All kinds</option>'+ACT_KINDS.map(k=>'<option value="'+k+'"'+(st.actKind===k?' selected':'')+'>'+esc(ACT_LABEL[k])+'</option>').join('')+'</select>'+btn('<span class="pt-hide-xs">Log activity</span><span class="pt-show-xs">+ Log</span>','panel:log','pt-btn pt-btn-primary',!canWrite('acts'),'aria-label="Log activity"')+'</div></div>'+
  tbl('Activities',['Date','Kind','Partner','Opportunity','Summary','Logged by'],p.slice.map(a=>'<tr><td>'+esc(dateLabel(a.occurred_on))+'</td><td>'+esc(ACT_LABEL[a.kind]||a.kind)+(a.status?' '+pill(cap(a.status)):'')+'</td><td>'+orgLink(a.organization_id)+'</td><td>'+(OPP[a.opportunity_id]?oppLink(OPP[a.opportunity_id]):'—')+'</td><td>'+esc(textOf(a.summary,140)||'—')+(materialsOf(a).length?'<br><span class="pt-muted">Shared: '+esc(materialsOf(a).map(m=>m.title+ver(m.version)).join(', '))+'</span>':'')+'</td><td>'+esc(cap(a.logged_by||'user'))+'</td></tr>'),'No activities yet.')+pager(p);}
 else if(st.sub==='followups'){const s=st.fuStatus||'open',xs=FUS.filter(f=>s==='overdue'?isOverdue(f):s==='all'?true:f.status===s).sort((a,b)=>String(a.due).localeCompare(String(b.due))),p=paged(xs);
  body='<div class="pt-pad"><div class="pt-toolbar"><select aria-label="Status" name="fu_status" data-ui-state="true" data-action="fu-status" class="pt-select">'+[['open','Open'],['overdue','Overdue'],['done','Done'],['cancelled','Cancelled'],['all','All']].map(x=>'<option value="'+x[0]+'"'+(s===x[0]?' selected':'')+'>'+x[1]+'</option>').join('')+'</select>'+btn('Add follow-up','panel:fu','pt-btn pt-btn-primary',!canWrite('fus'))+'</div></div>'+
  tbl('Follow-ups',['Follow-up','Opportunity','Owner','Due','Status',''],p.slice.map(f=>'<tr><th scope="row">'+esc(f.title)+'</th><td>'+(OPP[f.opportunity_id]?oppLink(OPP[f.opportunity_id]):'—')+'</td><td>'+esc(f.owner)+'</td><td>'+(f.status==='open'?dueText(f):esc(shortDate(f.due)))+'</td><td>'+pill(cap(f.status),f.status==='done'?'green':isOverdue(f)?'red':'')+'</td><td class="pt-actions">'+(f.status==='open'?bS('Done','fu-done:'+f.id,!canWrite('fus'),'aria-label="Mark '+esc(f.title)+' done"')+bS('Cancel','fu-cancel:'+f.id,!canWrite('fus'),'aria-label="Cancel '+esc(f.title)+'"'):'')+'</td></tr>'),'No follow-ups.')+pager(p);}
 else if(st.sub==='materials'){const xs=ACTS.flatMap(a=>materialsOf(a).map(m=>({a,m}))).sort((x,y)=>String(y.a.occurred_on).localeCompare(String(x.a.occurred_on))),p=paged(xs);
  body='<div class="pt-pad"><p class="pt-muted">Which document and version went to whom, from activities. Documents stay in TrialAgents documents; nothing is sent from here.</p></div>'+tbl('Materials log',['Date','Document','Version','Partner','To','Opportunity'],p.slice.map(x=>'<tr><td>'+esc(dateLabel(x.a.occurred_on))+'</td><th scope="row">'+esc(x.m.title||'Document')+'</th><td>'+esc(ver(x.m.version).trim()||'—')+'</td><td>'+orgLink(x.a.organization_id)+'</td><td>'+esc(list(x.a.person_ids).map(personName).filter(Boolean).join(', ')||'—')+'</td><td>'+(OPP[x.a.opportunity_id]?oppLink(OPP[x.a.opportunity_id]):'—')+'</td></tr>'),'No materials logged yet.')+pager(p);}
 else{const me=st.me,end=addDays(AS_OF,7);
  if(!me)body='<div class="pt-pad">'+meSelect()+'<p class="pt-muted">Choose a person to see their week.</p></div>';
  else{const fs=FUS.filter(f=>f.status==='open'&&String(f.owner).toLowerCase()===me.toLowerCase()&&validDate(f.due)&&f.due<=end).sort((a,b)=>String(a.due).localeCompare(String(b.due)));
   const mt=ACTS.filter(a=>['meeting','call','conference_meeting'].includes(a.kind)&&validDate(a.occurred_on)&&a.occurred_on>=AS_OF&&a.occurred_on<=end&&inTeam(a.team,me)&&!['cancelled','declined'].includes(a.status)).sort((a,b)=>String(a.occurred_on).localeCompare(String(b.occurred_on)));
   const ns=OPPS.filter(o=>String(o.owner).toLowerCase()===me.toLowerCase()&&isOpen(o)&&(validDate(o.next_date)&&o.next_date<=end||isStalled(o)));
   body='<div class="pt-pad">'+meSelect()+'<div class="pt-grid2">'+mini('Follow-ups ('+fs.length+')',ul(fs.map(f=>'<li><span>'+esc(f.title)+(OPP[f.opportunity_id]?' · '+esc(orgName(OPP[f.opportunity_id].organization_id)):'')+'</span><span class="pt-actions">'+dueText(f)+' '+bS('Done','fu-done:'+f.id,!canWrite('fus'),'aria-label="Mark '+esc(f.title)+' done"')+'</span></li>'),'Nothing due this week.'))+
   mini('Meetings ('+mt.length+')',ul(mt.map(a=>'<li><span>'+esc(DAYS[weekday(a.occurred_on)]+' '+shortDate(a.occurred_on))+' · '+orgLink(a.organization_id)+'</span>'+(BRIEFS.some(b=>b.activity_id===a.id)?pill('Brief ready','green'):'')+'</li>'),'No meetings this week.'))+'</div>'+
   mini('My opportunities needing a step',ul(ns.map(o=>'<li><span>'+oppLink(o)+' — '+esc(o.next_step||'no next step')+'</span>'+(isStalled(o)?pill('Stalled '+quietDays(o)+' d','red'):pill(shortDate(o.next_date)))+'</li>'),'Nothing this week.'))+'</div>';}}
 return heading()+checks()+'<section class="pt-panel"><div class="pt-pad pt-pad-bottom0">'+tabs+'</div>'+body+'</section>';}

/* 6 Research */
function research(){const subs=[['signals','Signals'],['targets','Target suggestions'],['assets','Assets and research settings'],['runs','Runs']];if(!subs.some(s=>s[0]===st.rsub))st.rsub='signals';
 const tabs='<div class="pt-seg" role="group" aria-label="Research view">'+subs.map(s=>btn(s[1],'rsub:'+s[0],'pt-seg-btn',false,'aria-pressed="'+(st.rsub===s[0])+'"')).join('')+'</div>';let body='';
 const sigCard=s=>{const u=httpUrl(s.source_url);return '<li class="pt-signal"><div><div class="pt-chips">'+pill(SIG_LABEL[s.kind]||s.kind,s.kind==='target_suggestion'?'blue':'')+pill(cap(s.status),s.status==='new'?'amber':s.status==='accepted'?'green':'')+(s.program_id?pill(progName(s.program_id)):'')+'</div><strong>'+esc(s.title)+'</strong><p>'+esc(s.why)+'</p><p class="pt-muted">'+(s.organization_id?orgLink(s.organization_id)+' · ':'')+(OPP[s.opportunity_id]?oppLink(OPP[s.opportunity_id])+' · ':'')+'Published '+esc(dateLabel(s.published_on))+' · found '+esc(dateLabel(s.found_on))+(u?' · <a href="'+esc(u)+'">Source</a>':'')+(s.dismiss_reason?' · Dismissed: '+esc(s.dismiss_reason):'')+'</p></div><div class="pt-actions">'+(s.status==='new'?(s.kind==='target_suggestion'?bP('Accept','panel:accept:'+s.id,!canWrite('opps'),'aria-label="Accept '+esc(s.title)+'"'):bS('Reviewed','sig-reviewed:'+s.id,!canWrite('signals'),'aria-label="Mark '+esc(s.title)+' reviewed"'))+bS('Dismiss','panel:dismiss:'+s.id,!canWrite('signals'),'aria-label="Dismiss '+esc(s.title)+'"'):'')+'</div></li>';};
 if(st.rsub==='signals'){const xs=SIGS.filter(s=>s.kind!=='target_suggestion'&&(st.sigStatus==='all'||s.status===st.sigStatus)&&(!st.sigKind||s.kind===st.sigKind)).sort((a,b)=>String(b.found_on).localeCompare(String(a.found_on))),p=paged(xs);
  body='<div class="pt-pad"><div class="pt-toolbar"><select aria-label="Status" name="sig_status" data-ui-state="true" data-action="sig-status" class="pt-select">'+['new','reviewed','dismissed','all'].map(x=>'<option value="'+x+'"'+(st.sigStatus===x?' selected':'')+'>'+cap(x)+'</option>').join('')+'</select><select aria-label="Kind" name="sig_kind" data-ui-state="true" data-action="sig-kind" class="pt-select"><option value="">All kinds</option>'+SIG_KINDS.filter(k=>k!=='target_suggestion').map(k=>'<option value="'+k+'"'+(st.sigKind===k?' selected':'')+'>'+esc(SIG_LABEL[k])+'</option>').join('')+'</select></div>'+ul(p.slice.map(sigCard),'No signals here.')+'</div>'+pager(p);}
 else if(st.rsub==='targets'){const xs=SIGS.filter(s=>s.kind==='target_suggestion').sort((a,b)=>(a.status==='new'?0:1)-(b.status==='new'?0:1)||String(b.found_on).localeCompare(String(a.found_on)));
  body='<div class="pt-pad"><p class="pt-muted">Suggested by the research worker or the assistant, with a fit rationale and sources. Accepting creates an opportunity at Identified (source research) in one review; dismiss with a reason so the next run learns.</p>'+PROGRAMS.map(pg=>{const ys=xs.filter(s=>s.program_id===pg.id);return ys.length?mini(progLong(pg.id),ul(ys.map(sigCard))):'';}).join('')+(xs.some(s=>!PROGRAM[s.program_id])?mini('No asset',ul(xs.filter(s=>!PROGRAM[s.program_id]).map(sigCard))):'')+(xs.length?'':'<p class="pt-muted">No target suggestions yet.</p>')+'</div>';}
 else if(st.rsub==='assets'){body='<div class="pt-pad"><p class="pt-muted">The partnering profile per asset: directions, deal types, territories, target profile, current non-confidential materials, and what research should focus on, exclude and read.</p>'+PROGRAMS.map(pg=>{const pf=PROFILES.find(x=>x.program_id===pg.id);if(!pf)return '<div class="pt-supplier"><div class="pt-supplier-head"><h3>'+esc(progLong(pg.id))+'</h3>'+bS('Add partnering profile','add:profiles:'+pg.id,!canWrite('profiles'))+'</div><p class="pt-muted">No profile yet: research skips this asset.</p></div>';
  const dirs=(parseJSON(pf.directions)||[]).map(d=>DIR_LABEL[d]||d),deals=(parseJSON(pf.deal_types)||[]).map(cap),mats=(parseJSON(pf.materials)||[]).filter(m=>m&&m.title);
  return '<div class="pt-supplier"><div class="pt-supplier-head"><h3>'+esc(progLong(pg.id))+' '+pill(cap(pf.status),pf.status==='active'?'green':'')+'</h3>'+bS('Edit','edit:profiles:'+pf.id,!canWrite('profiles'))+'</div>'+kv('Directions',dirs.join(', '))+kv('Deal types',deals.join(', '))+kv('Territories',pf.territories)+kv('Target profile',pf.target_profile)+kv('Materials',mats.map(m=>m.title+ver(m.version)).join(', '))+kv('Research focus',pf.research_focus)+kv('Exclusions',pf.research_exclusions)+kv('Preferred sources',pf.research_sources)+'</div>';}).join('')+'<div class="pt-row">'+bS('Add asset','add:programs',!canWrite('programs'))+'</div></div>';}
 else{const runs={};for(const s of SIGS){const k=String(s.run_id||'manual');(runs[k]=runs[k]||[]).push(s);}const rows=Object.entries(runs).map(([k,xs])=>({k,xs,on:xs.map(s=>s.found_on).filter(Boolean).sort()[0]||''})).sort((a,b)=>String(b.on).localeCompare(String(a.on)));
  body='<div class="pt-pad"><p class="pt-muted">'+esc(RESEARCH_ON?'Research is on: '+scheduleText(CAD,DDAY,DTIME,TZ)+'. Run outcomes are in TrialAgents Logs; this list is what each run proposed.':'Research is off in Settings.')+'</p></div>'+tbl('Research runs',['Found','Run','#Signals','#Targets','#Accepted','#Dismissed'],rows.map(r=>'<tr><td>'+esc(dateLabel(r.on))+'</td><td>'+esc(r.k==='manual'?'Added by hand or in chat':'Run …'+r.k.slice(-6))+'</td><td class="num">'+r.xs.filter(s=>s.kind!=='target_suggestion').length+'</td><td class="num">'+r.xs.filter(s=>s.kind==='target_suggestion').length+'</td><td class="num">'+r.xs.filter(s=>s.status==='accepted').length+'</td><td class="num">'+r.xs.filter(s=>s.status==='dismissed').length+'</td></tr>'),'No runs yet.');}
 return heading()+checks()+'<section class="pt-panel"><div class="pt-pad pt-pad-bottom0">'+tabs+'</div>'+body+'</section>';}

/* 7 Settings */
function settingsScreen(){const d=draftOf('settings'),val=k=>has(d,k)?d[k]:SET[k],cadNow=CADENCE.includes(val('digest_cadence'))?val('digest_cadence'):CAD,dayNow=WD.includes(val('digest_day'))?val('digest_day'):DDAY,timeNow=String(val('digest_time')||DTIME),tzNow=String(val('time_zone')||TZ);
 const dg=digestOf(),sch=scheduleOf(cadNow,dayNow,/^([01]\d|2[0-3]):[0-5]\d$/.test(timeNow)?timeNow:'07:00',tzNow);
 const stages=panel('Stages and lost reasons','Standard stages for every direction. Lost and on-hold need a reason; stage changes always write stage history.',ul(STAGES.map(s=>'<li><span>'+stagePill(s)+' <span class="pt-muted">'+esc(STAGE_HINT[s])+'</span></span></li>'))+'<form class="pt-form" data-action="save-lost">'+field('lost','reasons','Lost and on-hold reasons (one per line)',LOST.join('\n'),{type:'textarea',wide:true})+'<div class="pt-row">'+submit('Save reasons (reviewed)',canWrite('settings'))+'</div></form>');
 const cats=panel('Tag categories','Conference, Channel and Asset group are standard; add your own (for example Region) with their values. Saved views can filter by any of them.',tbl('Tag categories',['Category','Values','Several values',''],CATS.map(c=>'<tr><th scope="row">'+esc(c.name)+(c.standard?' '+pill('Standard'):'')+(c.missing?' '+pill('Not added yet','amber'):'')+'</th><td>'+esc(c.values.join(', ')||'—')+'</td><td>'+(c.multiple?'Yes':'No')+'</td><td class="pt-actions">'+(c.id?bS('Edit values','open:cat:'+c.id,!canWrite('cats'),'aria-label="Edit '+esc(c.name)+' values"')+bS('Archive','archive:cats:'+c.id,!canWrite('cats')||c.standard,'aria-label="Archive '+esc(c.name)+'"'):'')+'</td></tr>'))+
  (CATS.some(c=>c.missing)?'<div class="pt-row">'+bP('Add the standard categories','std-cats',!canWrite('cats'))+'</div>':'')+
  mini('New category','<form class="pt-form" data-action="add-cat">'+field('newcat','name','Name','',{required:true})+field('newcat','multiple','Several values per opportunity',false,{type:'checkbox'})+field('newcat','values','Values (one per line)','',{type:'textarea',wide:true})+'<div class="pt-row">'+submit('Add category (reviewed)',canWrite('cats'))+'</div></form>'));
 const dig=panel('Digest and research','One research worker on your Claude or ChatGPT runner and one digest email to members, at this cadence. The app never sends email itself.','<form class="pt-form" data-action="save-settings">'+field('settings','digest_cadence','Cadence',cadNow,{type:'select',options:opts(CADENCE)})+(cadNow==='weekly'?field('settings','digest_day','Day',dayNow,{type:'select',options:WD.map(x=>[x,WD_LABEL[x]])}):'')+field('settings','digest_time','Time (HH:MM)',timeNow)+field('settings','time_zone','Time zone (workspace time)',tzNow)+
  field('settings','stalled_days','Stalled after (days)',val('stalled_days')===undefined||val('stalled_days')===null?21:val('stalled_days'),{type:'number',min:1,max:365})+field('settings','research_enabled','Partner research on',settingsRow?val('research_enabled')!==false&&val('research_enabled')!=='false':true,{type:'checkbox'})+
  field('settings','digest_recipients','Digest recipients (workspace members)',val('digest_recipients')||'',{wide:true,hint:'Names or registered emails of workspace members. TrialAgents sends only to registered members with access to this app; partners never receive it.'})+field('settings','team','Team (names)',val('team')||'',{wide:true,hint:'People who own opportunities and follow-ups.'})+field('settings','digest_text','Digest intro line (optional)',val('digest_text')||'',{wide:true})+'<div class="pt-row">'+submit('Save settings (reviewed)',canWrite('settings'))+'</div></form>'+
  mini('Schedule','<p><strong>'+esc(scheduleText(cadNow,dayNow,sch.time,tzNow))+'</strong>. Research runs then; the digest goes out when that run completes.</p><p class="pt-muted">Automation trigger (used by your assistant when it sets up or changes the automations):</p><pre class="pt-code" id="pt-schedule">'+esc(JSON.stringify(sch))+'</pre>')+
  mini('Digest preview','<div class="pt-mail"><div class="pt-mail-head"><span>To: '+esc(list(SET.digest_recipients).join(', ')||'the workspace owner')+'</span>'+pill(dg.words+' words',dg.words>150?'amber':'green')+'</div><div class="pt-mail-subject" id="pt-digest-subject">'+esc(dg.subject)+'</div><pre class="pt-mail-body" id="pt-digest">'+esc(dg.body)+'</pre></div><p class="pt-muted">At most 3 lines per section and about 150 words; empty sections are left out; no deal terms, briefs, notes or fit rationales.</p>'));
 const links=panel('Access and automations','Who can use the app is set in TrialAgents Access. The research worker, the digest, follow-up reminders and optional meeting briefs are TrialAgents Automations, linked to this app.','<ul class="pt-list"><li><span>Access: owners choose who can view or edit Partnerships, and what Claude and ChatGPT may read or propose.</span><a href="https://platform.trialagents.com/access">Open Access</a></li><li><span>Automations: research (weekly by default), digest, reminders and briefs. Ask your assistant: “Set up Partnerships research and the digest”.</span><a href="https://platform.trialagents.com/automations">Open Automations</a></li></ul>'+integrationLine());
 return heading()+checks()+stages+cats+dig+links;}

/* Panels and the record editor. */
function sidePanel(){const p=st.panel;if(!p)return '';
 if(p.type==='opp')return oppPanel(p);if(p.type==='org')return orgPanel(p);if(p.type==='person')return personPanel(p);
 if(p.type==='conf'){st.confId=p.id;st.section='conferences';st.panel=null;return '';}
 if(p.type==='brief'){const b=BRIEF[p.id];if(!b)return '';const o=OPP[b.opportunity_id],src=(parseJSON(b.sources)||[]).filter(x=>x&&httpUrl(x.url));
  return drawer('Brief: '+(o?orgName(o.organization_id):'meeting'),'One-page brief'+(b.meeting_on?' for '+dateLabel(b.meeting_on):''),(o?historyWarning(o.organization_id,o.id):'')+'<div class="pt-report">'+esc(b.content)+'</div>'+(src.length?mini('Sources',ul(src.map(x=>'<li><span>'+esc(x.title||x.url)+'</span><a href="'+esc(httpUrl(x.url))+'">Open</a></li>'))):'')+'<p class="pt-muted">Written by '+esc(cap(b.written_by||'user'))+' on '+esc(dateLabel(b.written_on))+'. Non-confidential only unless a CDA is in place.</p>',btn('Edit','edit:briefs:'+b.id,'pt-btn',!canWrite('briefs'))+btn('Close','close','pt-btn pt-btn-primary'),'',true);}
 if(p.type==='signal'){const s=SIG[p.id];if(!s)return '';st.section='research';st.rsub=s.kind==='target_suggestion'?'targets':'signals';st.sigStatus=s.status;st.panel=null;return '';}
 if(p.type==='cat'){const c=CAT_ROWS.find(x=>x.id===p.id);if(!c)return '';return drawer('Edit '+c.name,'Tag category','<form class="pt-form" data-action="save-cat" id="pt-catform">'+field('cat','values','Values (one per line)',c.vals.join('\n'),{type:'textarea',wide:true})+field('cat','multiple','Several values per opportunity',bool(c.multiple),{type:'checkbox'})+'<div class="pt-row">'+submit('Save (reviewed)',canWrite('cats'))+'</div></form>');}
 if(p.type==='dismiss'){const s=SIG[p.id];if(!s)return '';return drawer('Dismiss: '+s.title,SIG_LABEL[s.kind]||'Signal',reviewNote+field('dismiss','reason','Why (the next research run uses this)','',{type:'textarea',wide:true,required:true}),btn('Cancel','close')+submit('Dismiss (reviewed)',canWrite('signals')),'dismiss-signal');}
 if(p.type==='accept'){const s=SIG[p.id];if(!s)return '';const d=draftOf('accept'),match=ORGS.find(o=>norm(o.name)===norm(s.title))||ORG[s.organization_id],org=d.organization_id||(match?match.id:''),pf=PROFILES.find(x=>x.program_id===s.program_id),dir=(parseJSON(pf&&pf.directions)||[])[0]||'out_license';
  return drawer('Accept target: '+s.title,'Target suggestion · '+progName(s.program_id),reviewNote+'<p>'+esc(s.why)+'</p>'+(org?historyWarning(org):'<div class="pt-banner warn">'+esc(s.title)+' is not a partner yet. '+btn('Add '+esc(s.title)+' as a partner','add-suggested-org','pt-btn small',!canWrite('organizations'))+'</div>')+
   '<div class="pt-pair">'+field('accept','organization_id','Partner',org,{type:'select',blank:'Choose…',options:orgOpts()})+field('accept','program_id','Asset',d.program_id||s.program_id||'',{type:'select',blank:'Choose…',options:progOpts()})+field('accept','direction','Direction',d.direction||dir,{type:'select',options:opts(DIRS,DIR_LABEL)})+field('accept','owner','Owner',d.owner||st.me||'',{type:'select',blank:'Choose…',options:teamOpts()})+field('accept','priority','Priority',d.priority||'medium',{type:'select',options:opts(PRI)})+field('accept','fit','Fit (1–5)',d.fit||'',{type:'number',min:1,max:5})+field('accept','name','Opportunity name',d.name||'',{wide:true,placeholder:(match?match.name:s.title)+': '+progName(s.program_id)})+'</div>',
   btn('Cancel','close')+submit('Accept (reviewed)',canWrite('opps')&&canWrite('signals')),'accept-signal');}
 if(p.type==='fu'){const o=OPP[p.id];return drawer('Add follow-up',o?o.name:'Follow-up',reviewNote+'<div class="pt-pair">'+field('fu','title','Follow-up','',{wide:true,required:true})+field('fu','owner','Owner',o?o.owner:st.me,{type:'select',blank:'Choose…',options:teamOpts()})+field('fu','due','Due',addDays(AS_OF,7),{type:'date'})+'</div>',btn('Cancel','close')+submit('Add (reviewed)',canWrite('fus')),'save-fu');}
 if(p.type==='meeting'){const c=CONF[st.confId];if(!c)return '';const d=draftOf('meeting'),org=ORG[d.organization_id]?d.organization_id:'';
  return drawer('Add meeting or request',c.name,reviewNote+(org?historyWarning(org):'')+'<div class="pt-pair">'+field('meeting','organization_id','Partner',org,{type:'select',blank:'Choose…',options:orgOpts()})+field('meeting','opportunity_id','Opportunity','',{type:'select',blank:'None yet',options:OPPS.filter(o=>o.organization_id===org).map(o=>[o.id,o.name])})+field('meeting','occurred_on','Date',c.starts_on,{type:'date',min:c.starts_on,max:c.ends_on||c.starts_on})+field('meeting','status','Status','requested',{type:'select',options:opts(MEET)})+field('meeting','team','Our team',c.team||'')+field('meeting','summary','Slot and place','',{placeholder:'10:00, partnering table 12'})+'</div>'+
   (org?'<fieldset class="pt-fieldset"><legend>Their people</legend>'+PEOPLE.filter(x=>x.organization_id===org).map(x=>field('meeting','p_'+x.id,x.name+(x.title?' · '+x.title:''),false,{type:'checkbox'})).join('')+'</fieldset>':''),btn('Cancel','close')+submit('Add (reviewed)',canWrite('acts')),'save-meeting');}
 if(p.type==='outcome'){const a=ACT[p.id];if(!a)return '';const o=OPP[a.opportunity_id];
  return drawer('Outcome: '+orgName(a.organization_id),'Conference meeting · '+dateLabel(a.occurred_on),reviewNote+'<div class="pt-pair">'+field('outcome','status','What happened',a.status==='requested'||a.status==='confirmed'?'held':a.status||'held',{type:'select',options:opts(MEET)})+field('outcome','outcome','Outcome',a.outcome||'',{type:'textarea',wide:true})+(o?field('outcome','next_step','Next step',o.next_step||'')+field('outcome','next_date','Next date',o.next_date||'',{type:'date'}):'')+'</div>'+mini('Follow-up (optional)','<div class="pt-pair">'+field('outcome','fu_title','Follow-up','',{wide:true})+field('outcome','fu_owner','Owner',o?o.owner:'',{type:'select',blank:'Choose…',options:teamOpts()})+field('outcome','fu_due','Due',addDays(AS_OF,7),{type:'date'})+'</div>')+(o?'<p class="pt-muted">To move the stage, open '+oppLink(o)+' after saving.</p>':''),btn('Cancel','close')+submit('Save outcome (reviewed)',canWrite('acts')),'save-outcome');}
 if(p.type==='log'){const pre=OPP[p.id],d=draftOf('log'),org=ORG[d.organization_id]?d.organization_id:pre?pre.organization_id:'',o=OPP[d.opportunity_id]||pre,docs=docsList();
  return drawer('Log activity',pre?pre.name:'Meeting, call, email or note',reviewNote+'<p class="pt-muted">Log what happened after you met or wrote from your own mailbox. One review saves the activity, an optional stage change (with stage history) and up to two follow-ups.</p><div class="pt-pair">'+field('log','kind','What',d.kind||'meeting',{type:'select',options:opts(ACT_KINDS,ACT_LABEL)})+field('log','occurred_on','Date',AS_OF,{type:'date'})+field('log','organization_id','Partner',org,{type:'select',blank:'Choose…',options:orgOpts()})+field('log','opportunity_id','Opportunity',o&&o.organization_id===org?o.id:'',{type:'select',blank:'None',options:OPPS.filter(x=>x.organization_id===org).map(x=>[x.id,x.name])})+field('log','team','Our team',st.me||(o?o.owner:''))+field('log','summary','Summary','',{type:'textarea',wide:true})+'</div>'+
   (org?'<fieldset class="pt-fieldset"><legend>Their people</legend>'+(PEOPLE.filter(x=>x.organization_id===org).map(x=>field('log','p_'+x.id,x.name,false,{type:'checkbox'})).join('')||'<p class="pt-muted">No contacts at this partner yet.</p>')+'</fieldset>':'')+
   '<fieldset class="pt-fieldset"><legend>Materials shared (document and version)</legend>'+(docs.docs.length?docs.docs.slice(0,40).map(x=>field('log','doc_'+x.versionId,docTitle(x)+ver(x.version),false,{type:'checkbox'})).join(''):'<p class="pt-muted">'+(docs.state==='preview'?'Documents appear in the saved app.':docs.state==='unavailable'?'Documents are not available to you.':'No documents yet.')+'</p>')+'</fieldset>'+
   (o&&o.organization_id===org?mini('Stage change (optional)','<div class="pt-pair">'+field('log','to','Move to','',{type:'select',blank:'No change ('+(STAGE_LABEL[o.stage]||'')+')',options:STAGES.filter(s=>s!==o.stage).map(s=>[s,STAGE_LABEL[s]])})+(d.to==='lost'||d.to==='on_hold'?field('log','reason','Reason','',{type:'select',blank:'Choose…',options:LOST.map(r=>[r,r])}):'')+field('log','stage_note','Note','')+'</div>'):'')+
   mini('Follow-ups (optional)',[1,2].map(i=>'<div class="pt-pair">'+field('log','fu'+i+'_title','Follow-up '+i,'',{wide:true})+field('log','fu'+i+'_owner','Owner','',{type:'select',blank:'Choose…',options:teamOpts()})+field('log','fu'+i+'_due','Due',addDays(AS_OF,7),{type:'date'})+'</div>').join('')),btn('Cancel','close')+submit('Save (reviewed)',canWrite('acts')),'save-log',true);}
 return '';}
function editorPanel(){const x=st.editor;if(!x)return '';const role=x.role,d=x.draft;
 const ctl=f=>{const v=d[f.key]===null||d[f.key]===undefined?'':d[f.key],c=' id="pt-e-'+f.key+'" name="'+f.key+'" data-ui-state="true" data-action="draft:'+f.key+'"'+(f.required?' required':'');
  if(f.kind==='select')return '<select'+c+'><option value="">—</option>'+f.options.map(o=>'<option value="'+esc(o)+'"'+(String(v)===o?' selected':'')+'>'+esc(role==='opps'&&f.key==='direction'?DIR_LABEL[o]:cap(o))+'</option>').join('')+'</select>';
  if(f.kind==='ref')return '<select'+c+'><option value="">—</option>'+R[f.ref].rows.map(r=>({id:r.id,...r.data})).sort((a,b)=>String(a.name).localeCompare(String(b.name))).map(o=>'<option value="'+esc(o.id)+'"'+(String(v)===o.id?' selected':'')+'>'+esc(f.ref==='programs'?progLong(o.id):o.name||'Unnamed')+'</option>').join('')+'</select>';
  if(f.kind==='boolean')return '<input type="checkbox"'+c+(bool(v)?' checked':'')+'>';
  if(f.kind==='longtext')return '<textarea class="pt-textarea"'+c+'>'+esc(v)+'</textarea>';
  if(role==='opps'&&f.key==='owner'&&TEAM.length)return '<input class="pt-input" type="text" list="pt-team"'+c+' value="'+esc(v)+'"><datalist id="pt-team">'+TEAM.map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist>';
  return '<input class="pt-input" type="'+(f.kind==='number'?'number':f.kind==='date'?'date':'text')+'"'+(f.kind==='number'?' step="any" min="0"':'')+c+' value="'+esc(v)+'">';};
 const fs=editable(role).filter(f=>!(x.mode==='create'&&has(x.fixed,f.key)&&!['owner'].includes(f.key)));
 let extra='';
 if(role==='opps'){extra=historyWarning(d.organization_id,x.id);if(x.mode==='create'){extra+=CATS.filter(c=>c.values.length).map(c=>c.multiple?'<fieldset class="pt-fieldset wide"><legend>'+esc(c.name)+'</legend>'+c.values.map(v=>'<label class="pt-check" for="pt-e-t-'+esc(norm(c.name+' '+v).replace(/ /g,'_'))+'"><input type="checkbox" id="pt-e-t-'+esc(norm(c.name+' '+v).replace(/ /g,'_'))+'" name="tag_'+esc(c.name)+'__'+esc(v)+'" data-ui-state="true" data-action="draft:tag_'+esc(c.name)+'__'+esc(v)+'"'+(bool(d['tag_'+c.name+'__'+v])?' checked':'')+'><span>'+esc(v)+'</span></label>').join('')+'</fieldset>':'<label class="pt-field" for="pt-e-tag-'+esc(norm(c.name).replace(/ /g,'_'))+'">'+esc(c.name)+'<select id="pt-e-tag-'+esc(norm(c.name).replace(/ /g,'_'))+'" name="tag_'+esc(c.name)+'" data-ui-state="true" data-action="draft:tag_'+esc(c.name)+'"><option value="">None</option>'+c.values.map(v=>'<option value="'+esc(v)+'"'+(d['tag_'+c.name]===v?' selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label>').join('');
  const ppl=PEOPLE.filter(p=>p.organization_id===d.organization_id);if(ppl.length)extra+='<fieldset class="pt-fieldset wide"><legend>Contacts</legend>'+ppl.map(p=>'<label class="pt-check" for="pt-e-c-'+esc(p.id)+'"><input type="checkbox" id="pt-e-c-'+esc(p.id)+'" name="c_'+esc(p.id)+'" data-ui-state="true" data-action="draft:c_'+esc(p.id)+'"'+(bool(d['c_'+p.id])?' checked':'')+'><span>'+esc(p.name)+'</span></label>').join('')+'</fieldset>';}}
 if(role==='people')extra=historyWarning(d.organization_id);
 if(role==='confs')extra='<label class="pt-field wide" for="pt-e-deadlines_text">Deadlines (one per line: Label | YYYY-MM-DD)<textarea class="pt-textarea" id="pt-e-deadlines_text" name="deadlines_text" data-ui-state="true" data-action="draft:deadlines_text">'+esc(has(d,'deadlines_text')?d.deadlines_text:(parseJSON(d.deadlines)||[]).map(z=>z.label+' | '+z.date).join('\n'))+'</textarea></label>';
 if(role==='profiles'){const dirs=parseJSON(d.directions)||[],deals=parseJSON(d.deal_types)||[],mats=(parseJSON(d.materials)||[]).map(m=>m.version_id),docs=docsList();const ck=(k,lab,on)=>'<label class="pt-check" for="pt-e-'+esc(k)+'"><input type="checkbox" id="pt-e-'+esc(k)+'" name="'+esc(k)+'" data-ui-state="true" data-action="draft:'+esc(k)+'"'+((has(d,k)?bool(d[k]):on)?' checked':'')+'><span>'+esc(lab)+'</span></label>';
  extra='<fieldset class="pt-fieldset wide"><legend>Directions</legend>'+DIRS.map(k=>ck('dir_'+k,DIR_LABEL[k],dirs.includes(k))).join('')+'</fieldset><fieldset class="pt-fieldset wide"><legend>Deal types</legend>'+DEAL_TYPES.map(k=>ck('deal_'+k,cap(k),deals.includes(k))).join('')+'</fieldset><fieldset class="pt-fieldset wide"><legend>Non-confidential materials (current versions)</legend>'+(docs.docs.length?docs.docs.slice(0,40).map(z=>ck('doc_'+z.versionId,docTitle(z)+ver(z.version),mats.includes(z.versionId))).join(''):'<p class="pt-muted">'+(docs.state==='ready'?'No documents yet.':'Documents appear in the saved app; the current list is kept.')+'</p>')+'</fieldset>';
  if(x.mode==='edit')for(const k of DIRS)if(!has(d,'dir_'+k))d['dir_'+k]=dirs.includes(k);if(x.mode==='edit')for(const k of DEAL_TYPES)if(!has(d,'deal_'+k))d['deal_'+k]=deals.includes(k);if(x.mode==='edit'&&docs.state==='ready')for(const z of docs.docs)if(!has(d,'doc_'+z.versionId))d['doc_'+z.versionId]=mats.includes(z.versionId);}
 return drawer((x.mode==='create'?'New ':'Edit ')+ROLE_LABEL[role],'Reviewed data change',reviewNote+'<div class="pt-pair">'+fs.map(f=>f.kind==='boolean'?'<label class="pt-check" for="pt-e-'+f.key+'">'+ctl(f)+'<span>'+esc(f.label)+'</span></label>':'<label class="pt-field'+(f.kind==='longtext'?' wide':'')+'" for="pt-e-'+f.key+'">'+esc(f.label)+(f.required?' *':'')+ctl(f)+'</label>').join('')+'</div>'+extra,btn('Cancel','close')+submit('Save (reviewed)',canWrite(role)),'save-record',role==='opps');}

const rail='<aside class="pt-rail"><div class="pt-brand"><strong>Partnerships</strong><span>Licensing and collaboration deals</span></div><nav class="pt-nav" aria-label="Partnerships screens">'+sections.map(s=>btn('<span class="pt-ico">'+icon(s.id)+'</span><span class="pt-nav-label">'+esc(s.label)+'</span>','nav:'+s.id,'',false,'aria-current="'+(st.section===s.id?'page':'false')+'" aria-label="'+esc(s.label)+'"')).join('')+'</nav><div class="pt-rail-foot">'+esc(cfg.demoLabel?'Fictional demo data':'Authorized records only')+'<br>Every change is reviewed. Nothing is sent to partners.</div></aside>';
let overlays='';try{overlays=editorPanel()||sidePanel();}catch(e){overlays='';note('This panel could not be shown: '+String(e&&e.message||e).slice(0,300));}
let main='';try{main=({overview,pipeline,partners,conferences,activity:activityScreen,research,settings:settingsScreen})[st.section]();}catch(e){main=heading()+'<div class="pt-banner bad" role="alert">This screen could not be shown: '+esc(String(e&&e.message||e))+'</div>';}
if(st.panel&&st.panel.type==='saveview')overlays=drawer('Save as view','Pipeline','<form class="pt-form" data-action="save-view" id="pt-saveview">'+reviewNote+field('saveview','name','View name','',{required:true,wide:true,placeholder:'BIO-Europe 2026'})+field('saveview','shared','Share with the team',false,{type:'checkbox',wide:true})+'<p class="pt-muted pt-wide">'+fltCount(st.flt)+' filter'+(fltCount(st.flt)===1?'':'s')+', layout '+esc(cap(st.mode))+'. Owner: <strong>'+esc(st.me||'choose who you are first')+'</strong>. Private views are listed only for their owner.</p><div class="pt-row">'+btn('Cancel','close')+submit('Save view (reviewed)',canWrite('views')&&!!st.me)+'</div></form>');
const notice=st.notice?'<div class="pt-banner'+(failed?' bad':'')+' pt-notice" role="'+(failed?'alert':'status')+'"><span>'+esc(st.notice)+'</span>'+bS('Dismiss','clear-notice')+'</div>':'';
const previewNote=!inp.saved?'<div class="pt-banner">Preview: save the app to record deals. A preview never writes to your workspace and never contacts anyone.</div>':'';
const html='<div class="pt-shell"'+(overlays?' inert':'')+'>'+rail+'<main class="pt-main">'+previewNote+notice+main+'<p class="pt-foot">'+(cfg.demoLabel?'Fictional records. This preview creates no records and sends nothing.':'Outreach stays personal: the app tracks, reminds and structures, and never emails partners. No legal or valuation advice; confidential deal terms stay out of emails and signals.')+'</p></main></div>'+overlays;
const css=typeof PARTNERSHIPS_CSS==='string'?PARTNERSHIPS_CSS:'';
return {html,css,state:st};
