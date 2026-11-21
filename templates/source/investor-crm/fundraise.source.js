'use trialagents v2';
/* TrialAgents Fundraise 3.0.0 (life.investor-crm), written to the v2 app contract with the platform kit.
 * Record edits save directly (records.save) from a person's own click, change or submit; deletes are archives with Undo.
 * Messages go through output.notice. The platform draws the header, the message and the footer; this app draws none.
 * Only signed commitments count as raised. Amounts in another currency than the round are flagged and excluded, never converted.
 * The as-of date is today's date from the app runtime (a pinned asOfOverride only in previews and tests); it only filters the view.
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
const grouped=n=>{const s=Math.abs(Math.round(n)).toString();return (n<0?'−':'')+s.replace(/\B(?=(\d{3})+(?!\d))/g,',');};
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const validDate=v=>{const t=String(v||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(t))return '';const d=new Date(t+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===t?t:'';};
const dayNo=d=>Math.round(Date.UTC(Number(d.slice(0,4)),Number(d.slice(5,7))-1,Number(d.slice(8,10)))/86400000);
const fromDay=n=>new Date(n*86400000).toISOString().slice(0,10);
const addDays=(d,n)=>d?fromDay(dayNo(d)+Math.round(n)):'';
const diffDays=(a,b)=>dayNo(b)-dayNo(a);
const dateLabel=d=>d?Number(d.slice(8,10))+' '+MONTHS[Number(d.slice(5,7))-1]+' '+d.slice(0,4):'—';
const plural=(n,w,many)=>n+' '+(Math.abs(n)===1?w:many||w+'s');
const label=v=>String(v===null||v===undefined||v===''?'—':v).replace(/_/g,' ');
const cap=s=>{s=label(s);return s.charAt(0).toUpperCase()+s.slice(1);};
const listOf=v=>String(v||'').split(',').map(x=>x.trim()).filter(Boolean);
const pct=(a,b)=>b?Math.round(a/b*1000)/10:null;
const money=(v,cur)=>v===null||v===undefined?'—':(cur?cur+' ':'')+(Math.abs(v)>=1e6?(v/1e6).toFixed(1)+'M':Math.abs(v)>=1e3?Math.round(v/1e3)+'k':grouped(v));
const exactMoney=(v,cur)=>v===null||v===undefined?'—':(cur?cur+' ':'')+grouped(v);

/* ---------- vocabulary ---------- */
const CURRENCIES=['USD','EUR','GBP','CHF','CAD','AUD','JPY','CNY','SEK','DKK','NOK','INR'];
const STAGES=['target','contacted','first_meeting','partner_meeting','due_diligence','term_sheet','committed','closed','passed'];
const STAGE_LABEL={target:'Target',contacted:'Contacted',first_meeting:'First meeting',partner_meeting:'Partner meeting',due_diligence:'Due diligence',term_sheet:'Term sheet',committed:'Committed',closed:'Closed',passed:'Passed'};
const ACTIVE_STAGES=['contacted','first_meeting','partner_meeting','due_diligence','term_sheet'];
const INTEREST=['none','soft','verbal','signed'];
const INVESTOR_TYPES=['specialist_ls_vc','generalist_vc','pharma_cvc','strategic','family_office','angel','public_fund','other'];
const TYPE_LABEL={specialist_ls_vc:'Specialist life-science VC',generalist_vc:'Generalist VC',pharma_cvc:'Pharma corporate VC',strategic:'Strategic',family_office:'Family office',angel:'Angel',public_fund:'Public equity fund',other:'Other'};
const TIERS=['a','b','c'];
const PROFILE_STATUS=['proposed','accepted','rejected'];
const ROUND_TYPES=['pre_seed','seed','bridge','series_a','series_b','series_c','other'];
const ROUND_LABEL={pre_seed:'Pre-seed',seed:'Seed',bridge:'Bridge',series_a:'Series A',series_b:'Series B',series_c:'Series C',other:'Other'};
const ROUND_STATUS=['planning','active','closed','abandoned'];
const PASS_REASONS=['too_early','want_in_vivo_data','want_clinical_data','outside_mandate','cheque_size','valuation','team','competition','timing','other'];
const INSTRUMENTS=['priced','safe','convertible','other'];
const OFFER_STATUS=['received','negotiating','accepted','declined','expired'];
const ACT_KINDS=['email','call','meeting','intro','event','other'];
const TRANCHE_STATUS=['expected','met','released','waived','missed'];
const GRANT_STATUS=['invited','active','revoked','expired'];
const ROOM_PURPOSE=['financing','licensing','partnering','m_and_a','other'];
const VIEW_SOURCES=['manual','docsend','sharevault','tracked'];
const MILE_STATUS=['planned','in_progress','done','at_risk','cancelled'];
const ORG_TYPES=['company','investor','cro','cdmo','site','funder','partner','agency','other'];
const OPTION_LABEL={stage:STAGE_LABEL,investor_type:TYPE_LABEL,round_type:ROUND_LABEL,tier:{a:'A',b:'B',c:'C'}};

/* ---------- logical schema (real keys come from tableMap) ---------- */
const ref=role=>({kind:'ref',ref:role});
const S={
 orgs:[{key:'name',label:'Name',kind:'text',required:true},{key:'org_type',label:'Type',kind:'select',options:ORG_TYPES},{key:'country',label:'Country',kind:'text'},{key:'website',label:'Website',kind:'text'},{key:'archived',label:'Archived',kind:'boolean'}],
 people:[{key:'name',label:'Name',kind:'text',required:true},{key:'organization_id',label:'Organization',...ref('orgs')},{key:'title',label:'Title',kind:'text'},{key:'email',label:'Email',kind:'text'},{key:'archived',label:'Archived',kind:'boolean'}],
 settings:[{key:'default_currency',label:'Default currency',kind:'select',options:CURRENCIES},{key:'stale_days',label:'Stale after (days)',kind:'number'},{key:'stages',label:'Stages',kind:'text'},{key:'pass_reasons',label:'Pass reasons',kind:'text'},{key:'modalities',label:'Modalities',kind:'text'},{key:'therapeutic_areas',label:'Therapeutic areas',kind:'text'},{key:'dev_stages',label:'Development stages',kind:'text'},{key:'custom_fields',label:'Custom fields',kind:'frozen'},{key:'stage_labels',label:'Stage labels',kind:'frozen'},{key:'preferences',label:'Preferences',kind:'frozen'}],
 profiles:[{key:'organization_id',label:'Investor',...ref('orgs'),required:true},{key:'investor_type',label:'Investor type',kind:'select',options:INVESTOR_TYPES,required:true},{key:'tier',label:'Tier',kind:'select',options:TIERS},{key:'profile_status',label:'Profile status',kind:'auto',options:PROFILE_STATUS,required:true},{key:'modalities',label:'Modalities',kind:'text'},{key:'therapeutic_areas',label:'Therapeutic areas',kind:'text'},{key:'dev_stages',label:'Development stages',kind:'text'},{key:'check_min',label:'Cheque min',kind:'money'},{key:'check_max',label:'Cheque max',kind:'money'},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES},{key:'leads_rounds',label:'Leads rounds',kind:'select',options:['yes','no','sometimes']},{key:'fund_vintage_year',label:'Fund vintage year',kind:'number'},{key:'intro_path',label:'Intro path',kind:'text'},{key:'source',label:'Source',kind:'text'},{key:'source_date',label:'Source date',kind:'date'},{key:'notes',label:'Notes',kind:'longtext'},{key:'archived',label:'Archived',kind:'boolean'}],
 rounds:[{key:'name',label:'Name',kind:'text',required:true},{key:'round_type',label:'Round type',kind:'select',options:ROUND_TYPES,required:true},{key:'target_amount',label:'Target',kind:'money'},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES,required:true},{key:'status',label:'Status',kind:'select',options:ROUND_STATUS,required:true},{key:'opened_on',label:'Opened on',kind:'date'},{key:'target_close',label:'Target close',kind:'date'},{key:'closed_on',label:'Closed on',kind:'date'},{key:'lead_org_id',label:'Lead investor',kind:'auto'},{key:'notes',label:'Notes',kind:'longtext'},{key:'archived',label:'Archived',kind:'boolean'}],
 opps:[{key:'round_id',label:'Round',...ref('rounds'),required:true,g:'Opportunity'},{key:'organization_id',label:'Investor',...ref('orgs'),required:true,g:'Opportunity'},{key:'primary_contact_id',label:'Primary contact',...ref('people'),g:'Opportunity'},{key:'stage',label:'Stage',kind:'select',options:STAGES,required:true,g:'Opportunity'},{key:'interest',label:'Interest',kind:'select',options:INTEREST,required:true,g:'Opportunity'},{key:'amount_indicated',label:'Amount indicated',kind:'money',g:'Opportunity'},{key:'amount_committed',label:'Amount committed',kind:'money',g:'Opportunity'},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES,required:true,g:'Opportunity'},{key:'is_lead',label:'Lead investor',kind:'auto',g:'Opportunity'},{key:'owner',label:'Owner',kind:'text',g:'Opportunity'},{key:'next_step',label:'Next step',kind:'text',g:'Opportunity'},{key:'next_due',label:'Next step due',kind:'date',g:'Opportunity'},{key:'last_activity_on',label:'Last activity on',kind:'auto',g:'Opportunity'},
  {key:'offer_received_on',label:'Offer received on',kind:'date',g:'Offer'},{key:'offer_amount',label:'Offer amount',kind:'money',g:'Offer'},{key:'offer_pre_money',label:'Pre-money valuation',kind:'money',g:'Offer'},{key:'offer_instrument',label:'Instrument',kind:'select',options:INSTRUMENTS,g:'Offer'},{key:'offer_board_seat',label:'Board seat',kind:'boolean',g:'Offer'},{key:'offer_expires_on',label:'Offer expires on',kind:'date',g:'Offer'},{key:'offer_status',label:'Offer status',kind:'select',options:OFFER_STATUS,g:'Offer'},{key:'offer_notes',label:'Offer notes',kind:'longtext',g:'Offer'},
  {key:'pass_reason',label:'Pass reason',kind:'select',options:PASS_REASONS,g:'Pass and CDA'},{key:'pass_detail',label:'Pass detail',kind:'text',g:'Pass and CDA'},{key:'cda_status',label:'CDA/NDA status',kind:'select',options:['none','sent','signed'],g:'Pass and CDA'},{key:'cda_signed_on',label:'CDA signed on',kind:'date',g:'Pass and CDA'},{key:'archived',label:'Archived',kind:'boolean'}],
 acts:[{key:'opportunity_id',label:'Investor',...ref('opps'),required:true},{key:'contact_id',label:'Contact',...ref('people')},{key:'activity_on',label:'Date',kind:'date',required:true},{key:'kind',label:'Kind',kind:'select',options:ACT_KINDS,required:true},{key:'summary',label:'Summary',kind:'text',required:true},{key:'outcome',label:'Outcome',kind:'text'},{key:'follow_up_due',label:'Follow-up due',kind:'date'},{key:'source',label:'Source',kind:'auto'}],
 tranches:[{key:'round_id',label:'Round',...ref('rounds'),required:true},{key:'tranche_no',label:'Tranche number',kind:'number',required:true},{key:'amount',label:'Amount',kind:'money',required:true},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES,required:true},{key:'condition',label:'Condition',kind:'text',required:true},{key:'milestone_id',label:'Milestone',...ref('miles')},{key:'expected_on',label:'Expected on',kind:'date'},{key:'status',label:'Status',kind:'select',options:TRANCHE_STATUS,required:true}],
 grants:[{key:'organization_id',label:'Investor',...ref('orgs')},{key:'person_id',label:'Person',...ref('people')},{key:'room_name',label:'Room name',kind:'text'},{key:'room_id',label:'Room reference',kind:'text'},{key:'room_purpose',label:'Room purpose',kind:'select',options:ROOM_PURPOSE},{key:'granted_on',label:'Granted on',kind:'date'},{key:'expires_on',label:'Expires on',kind:'date'},{key:'status',label:'Status',kind:'select',options:GRANT_STATUS},{key:'agreement_accepted_on',label:'Agreement accepted on',kind:'date'},{key:'source',label:'Source',kind:'auto'}],
 views:[{key:'grant_id',label:'Access',...ref('grants')},{key:'organization_id',label:'Investor',...ref('orgs')},{key:'person_id',label:'Person',...ref('people')},{key:'document_title',label:'Document title',kind:'text'},{key:'document_ref',label:'Document reference',kind:'text'},{key:'first_viewed_on',label:'First viewed on',kind:'date'},{key:'last_viewed_on',label:'Last viewed on',kind:'date'},{key:'view_count',label:'Views',kind:'number'},{key:'seconds_viewed',label:'Seconds viewed',kind:'number'},{key:'downloads',label:'Downloads',kind:'number'},{key:'source',label:'Source',kind:'select',options:VIEW_SOURCES},{key:'as_of',label:'As of',kind:'date'}],
 reports:[{key:'run_on',label:'Run on',kind:'date',required:true},{key:'run_id',label:'Run',kind:'auto'},{key:'period',label:'Period',kind:'text'},{key:'summary',label:'Summary',kind:'longtext'},{key:'new_investors',label:'New investors',kind:'number'},{key:'sources',label:'Sources',kind:'auto'},{key:'written_by',label:'Written by',kind:'auto'}],
 miles:[{key:'name',label:'Milestone',kind:'text',required:true},{key:'program_id',label:'Program',kind:'text',required:true},{key:'item_type',label:'Item type',kind:'auto'},{key:'end_date',label:'Milestone date',kind:'date',required:true},{key:'status',label:'Status',kind:'select',options:MILE_STATUS,required:true},{key:'is_key',label:'Key milestone',kind:'boolean'}]
};
const ROLE_LABEL={orgs:'investor',people:'contact',settings:'settings',profiles:'investor profile',rounds:'round',opps:'opportunity',acts:'activity',tranches:'tranche',grants:'data-room access',views:'data-room views',miles:'milestone',reports:'research report'};
/* Stable role keys: core contract v1 for shared tables, fundraise.* for this app (fundraise.tranches is its published output),
 * dataroom.* and programs.plan_items are integrations: Fundraise's own tables for manual entry, the provider's tables (read-only) once linked. */
const ROLE_KEY={orgs:'organizations',people:'people',settings:'fundraise.settings',profiles:'fundraise.investor_profiles',rounds:'fundraise.rounds',opps:'fundraise.opportunities',acts:'fundraise.activities',tranches:'fundraise.tranches',grants:'dataroom.access_grants',views:'dataroom.engagement',miles:'programs.plan_items',reports:'fundraise.research_reports'};
const ORDER=['settings','rounds','orgs','profiles','opps','people','acts','tranches','miles','grants','views','reports'];

/* ---------- bindings ---------- */
let mapping={};try{mapping=JSON.parse(cfg.tableMap||'{}');}catch(e){mapping={};}
const roleMap={};
function mapRole(role){
 const m=mapping[ROLE_KEY[role]],b=m&&bindings.find(x=>x.typeId===m.typeId);
 if(!m||!b){delete roleMap[role];return;}
 const fields={};for(const f of S[role]){const k=m.fields&&m.fields[f.key]!==undefined?m.fields[f.key]:f.key;if(typeof k==='string'&&(b.fields||[]).includes(k))fields[f.key]=k;}
 roleMap[role]={typeId:m.typeId,fields,writable:(Array.isArray(m.writableFields)?m.writableFields:[]).filter(x=>fields[x])};
}
for(const role of Object.keys(S))mapRole(role);
const role0=inp.appRole||(inp.writable?'editor':'viewer');
const OWNER=role0==='owner';
const EDITS=!!inp.saved&&!!inp.writable&&cfg.readOnly!==true&&role0!=='viewer';
const canWrite=role=>EDITS&&!!roleMap[role]&&roleMap[role].writable.length>0;
const writableField=(role,key)=>canWrite(role)&&roleMap[role].writable.includes(key);

/* ---------- state, screen and working context ---------- */
const SCREENS=[{id:'overview',label:'Overview'},{id:'pipeline',label:'Pipeline'},{id:'investors',label:'Investors'},{id:'round',label:'Round'},{id:'activity',label:'Activity'},{id:'engagement',label:'Engagement'},{id:'settings',label:'Settings'}];
const shown=SCREENS.filter(s=>s.id!=='settings'||OWNER);
const st=JSON.parse(JSON.stringify(inp.state||{}));
const firstVisit=!inp.state||!inp.state.screen;
st.filters=st.filters&&typeof st.filters==='object'?st.filters:{};
st.query=String(st.query||'').slice(0,100);st.offset=Math.max(0,Number(st.offset)||0);
st.invTab=['targets','proposed','rejected'].includes(st.invTab)?st.invTab:'targets';
st.cmp=Array.isArray(st.cmp)?st.cmp.map(String).slice(0,3):null;
const ctx=inp.context&&typeof inp.context==='object'?inp.context:{};
if(!st.round&&typeof ctx.round==='string')st.round=ctx.round;
let notice=null;
const fail=m=>{throw Error(m);};
const say=(kind,message)=>{notice=kit.notice(kind,message);};

/* Undo (G8): run from the person's own click; the list is read on the server only (open and refresh), so screen changes in
 * the browser need no request. */
const UNDO_OK=EDITS&&!!inp.saved;
if(action.startsWith('undo:')&&UNDO_OK){try{tools.call('undo.run',{undoId:action.slice(5)});say('success','Undone');}catch(e){say('error',String(e&&e.message||e).slice(0,300));}st.undo=null;}
if(UNDO_OK&&(event.kind==='open'||event.kind==='refresh'||action.startsWith('undo:'))){try{const u=tools.call('undo.list',{});const list=u&&(u.actions||u.entries)||[];st.undo=list.length?[{undoId:String(list[0].undoId),label:String(list[0].label||'last change').slice(0,80)}]:null;}catch(e){st.undo=null;}}

/* Screen changes and panels that decide what this screen reads (they need no data). */
if(action.startsWith('nav:')){const id=action.slice(4);if(shown.some(s=>s.id===id)){st.screen=id;st.offset=0;st.query='';st.filters={};st.panel=null;}}
else if(action==='panel:close')st.panel=null;
else if(action.startsWith('details:')){const [kind,id]=action.slice(8).split(':');if(['opp','investor'].includes(kind)&&id)st.panel={kind,id};}
else if(action.startsWith('inv:')){const t=action.slice(4);if(['targets','proposed','rejected'].includes(t)){st.invTab=t;st.offset=0;}}
else if(action==='query'&&event.kind==='change'){st.query=String(event.value||'').slice(0,100);st.offset=0;}
else if(action.startsWith('filter:')&&event.kind==='change'){st.filters[action.slice(7)]=String(event.value||'');st.offset=0;}
else if(action==='filters:clear'){st.filters={};st.offset=0;}
else if(action.startsWith('page:')){st.offset=Math.max(0,Number(action.slice(5))||0);}

/* ---------- reads: each screen reads only its data, in one batched call; the rest of a long table in another ---------- */
const PAGE=100,MAX_PAGES=8;
const R={};
const emptyRole=extra=>({rows:[],allRows:[],total:0,complete:false,unbound:false,unavailable:false,pending:false,truncated:false,invalid:0,...extra});
function readBatch(reads){
 const out=[];
 for(let i=0;i<reads.length;i+=12){const part=reads.slice(i,i+12);let res=null;
  try{const r=tools.call('records.readMany',{reads:part});if(r&&Array.isArray(r.results)&&r.results.length===part.length)res=r.results;}catch(e){res=null;}
  for(let k=0;k<part.length;k++)out.push(res?res[k]:{unavailable:true});}
 return out;
}
function convert(role,pages){
 const m=roleMap[role];if(pages.some(p=>p&&p.pending))return emptyRole({pending:true});
 const rows=[];let total=null,unavailable=false,invalid=0,read=0,ended=false;
 for(const p of pages){if(!p||p.unavailable){unavailable=true;break;}
  const chunk=Array.isArray(p.rows)?p.rows:[];read+=chunk.length;total=p.total===null||p.total===undefined||!Number.isFinite(Number(p.total))?null:Number(p.total);
  for(const r of chunk){const data={};for(const [logical,real] of Object.entries(m.fields))if(has(r.data,real)){const v=r.data[real];if(v!==null&&typeof v==='object'){invalid++;continue;}data[logical]=v;}rows.push({id:String(r.id),version:r.version,data});}
  if(chunk.length<PAGE){ended=true;break;}}
 const complete=!unavailable&&(total!==null?read>=total:ended);
 return {rows:rows.filter(r=>!bool(r.data.archived)),allRows:rows,total:total===null?rows.length:total,complete,unavailable,unbound:false,pending:false,truncated:!unavailable&&total!==null&&read<total,invalid};
}
let customized=false;
function loadRoles(list){
 const want=ORDER.filter(r=>list.includes(r)&&(!R[r]||R[r].skipped));
 for(const r of want)if(!roleMap[r])R[r]=emptyRole({unbound:true});
 const bound=want.filter(r=>roleMap[r]);if(!bound.length)return;
 const first=readBatch(bound.map(r=>({typeId:roleMap[r].typeId,limit:PAGE,offset:0})));
 const pages={};bound.forEach((r,i)=>{pages[r]=[first[i]];});
 const more=[];
 for(const r of bound){const p=first[bound.indexOf(r)];if(!p||p.pending||p.unavailable)continue;const total=num(p.total);if(total!==null&&total>PAGE)for(let k=1;k<Math.min(MAX_PAGES,Math.ceil(total/PAGE));k++)more.push({role:r,read:{typeId:roleMap[r].typeId,limit:PAGE,offset:k*PAGE}});}
 if(more.length){const res=readBatch(more.map(x=>x.read));more.forEach((x,i)=>pages[x.role].push(res[i]));}
 if(pages.settings&&!customized){R.settings=convert('settings',pages.settings);customize();}
 for(const r of bound)if(!R[r]||R[r].skipped)R[r]=convert(r,pages[r]);
}

/* Customization through an assistant (one reviewed change each): settings.custom_fields [{table,key,label,kind,options}] adds a
 * bound field to editors, details and (select or yes/no on opportunities) Pipeline filters; settings.stage_labels renames stages
 * (keys never change); settings.preferences {default_screen,page_size,overview_hidden}. Invalid entries are ignored. */
const cfJSON=v=>{if(v&&typeof v==='object')return v;if(typeof v!=='string'||!v.trim())return null;try{return JSON.parse(v);}catch(e){return null;}};
const cfObj=v=>{const o=cfJSON(v);return o&&typeof o==='object'&&!Array.isArray(o)?o:{};};
const CF_TABLE={opportunities:'opps',investor_profiles:'profiles',rounds:'rounds',activities:'acts',organizations:'orgs',people:'people'};
const CF_KINDS=['text','longtext','number','money','date','select','boolean'];
const CFS=[];
let SET={},settingsRow=null;
function customize(){
 customized=true;settingsRow=R.settings.rows[0]||null;SET=settingsRow?settingsRow.data:{};
 const raw=Array.isArray(cfJSON(SET.custom_fields))?cfJSON(SET.custom_fields):[];
 for(const c of raw.slice(0,40)){
  const role=c&&CF_TABLE[c.table],key=c&&typeof c.key==='string'?c.key:'',kind=c&&CF_KINDS.includes(c.kind)?c.kind:'text';
  const options=kind==='select'&&Array.isArray(c.options)?[...new Set(c.options.filter(o=>typeof o==='string'&&o.trim()).map(o=>o.trim().slice(0,60)))].slice(0,30):[];
  if(!role||!/^[a-z][a-z0-9_]{0,63}$/.test(key)||S[role].some(f=>f.key===key)||(kind==='select'&&!options.length)||CFS.length>=30)continue;
  const f={key,label:String(c.label||key.replace(/_/g,' ')).trim().slice(0,60)||key,kind,options,g:'Custom fields',custom:true};
  S[role].push(f);CFS.push({...f,role});}
 for(const role of new Set(CFS.map(c=>c.role)))mapRole(role);
}
const cfBound=c=>!!(roleMap[c.role]&&roleMap[c.role].fields[c.key]);

/* What each screen reads. A side panel's extra reads are a separate call, so opening it never reloads the screen. */
const NEEDS={overview:['settings','rounds','orgs','profiles','opps','acts','grants','views'],
 pipeline:['settings','rounds','orgs','profiles','opps','grants','views'],
 investors:['settings','rounds','orgs','profiles','opps','reports'],
 round:['settings','rounds','orgs','profiles','opps','tranches','miles'],
 activity:['settings','rounds','orgs','profiles','opps','people','acts'],
 engagement:['settings','rounds','orgs','profiles','opps','people','grants','views'],
 settings:['settings']};
const PANEL_NEEDS={opp:['people','acts','grants','views'],investor:['people'],create:['people','miles','grants']};
st.screen=shown.some(s=>s.id===st.screen)?st.screen:'overview';
loadRoles(NEEDS[st.screen]);
if(!customized)customize();
const PREF=cfObj(SET.preferences);
if(firstVisit&&!action.startsWith('nav:')){const d=String(PREF.default_screen||'');if(d!==st.screen&&shown.some(x=>x.id===d)){st.screen=d;loadRoles(NEEDS[d]);}}
if(st.panel&&PANEL_NEEDS[st.panel.kind])loadRoles(PANEL_NEEDS[st.panel.kind]);
if(action.startsWith('add:'))loadRoles(PANEL_NEEDS.create);
const screenRoles=NEEDS[st.screen];
const PENDING=screenRoles.some(r=>R[r]&&R[r].pending);
for(const r of ORDER)if(!R[r])R[r]=emptyRole({skipped:true});

/* ---------- vocabulary from settings ---------- */
const subset=(v,allowed)=>{const l=listOf(v).map(x=>x.toLowerCase()).filter(x=>allowed.includes(x));return l.length?[...new Set(l)]:allowed.slice();};
const STAGE_ORDER=subset(SET.stages,STAGES);
const PASS_ORDER=subset(SET.pass_reasons,PASS_REASONS);
const STALE_DAYS=Math.min(180,Math.max(1,Math.round(num(SET.stale_days,14)||14)));
const DEFAULT_CURRENCY=CURRENCIES.includes(SET.default_currency)?SET.default_currency:'EUR';
const VOCAB={modalities:listOf(SET.modalities),therapeutic_areas:listOf(SET.therapeutic_areas),dev_stages:listOf(SET.dev_stages)};
{const l=cfObj(SET.stage_labels);for(const k of STAGES){const v=l[k];if(typeof v==='string'&&v.trim())STAGE_LABEL[k]=v.trim().slice(0,40);}}
const OV_HIDDEN=Array.isArray(PREF.overview_hidden)?PREF.overview_hidden.map(String):[];
const PER=Math.min(50,Math.max(10,num(PREF.page_size)!==null?num(PREF.page_size):num(cfg.pageSize,25)||25));

/* The as-of date only filters the view (stale, due, signals); nothing stored is derived from it. */
const CLOCK=(()=>{try{return validDate(new Date().toISOString());}catch(e){return '';}})();
const AS_OF=validDate(cfg.asOfOverride)||CLOCK||R.acts.rows.map(r=>validDate(r.data.activity_on)).filter(Boolean).sort().pop()||'';

/* ---------- entities ---------- */
const lookup=(role,id)=>(R[role].allRows||[]).find(r=>r.id===id)||null;
function orgName(id){if(!id)return '—';if(R.orgs.unavailable)return 'Investor unavailable';const o=lookup('orgs',id);if(!o)return R.orgs.unbound?'Investors not connected':'Investor unavailable';return String(o.data.name||'Unnamed')+(bool(o.data.archived)?' (archived)':'');}
function personName(id){if(!id)return '—';const p=lookup('people',id);return p?String(p.data.name||'Unnamed')+(bool(p.data.archived)?' (archived)':''):'Contact unavailable';}
const flat=(role,map)=>R[role].rows.map(r=>({id:r.id,version:r.version,...r.data,...(map?map(r.data):{})}));
const ROUNDS=flat('rounds',d=>({opened_on:validDate(d.opened_on),target_close:validDate(d.target_close),closed_on:validDate(d.closed_on)})).sort((a,b)=>(a.status==='active'?0:1)-(b.status==='active'?0:1)||String(b.opened_on||'').localeCompare(String(a.opened_on||''))||String(a.name||'').localeCompare(String(b.name||'')));
const ROUND=Object.fromEntries(ROUNDS.map(x=>[x.id,x]));
function roundName(id){if(!id)return '—';const r=lookup('rounds',id);return r?String(r.data.name||'Unnamed round'):'Round unavailable';}
const PROFILES=flat('profiles');
// One profile per investor organization; an accepted one wins over a proposed or rejected duplicate.
const PROFILE={};for(const p of PROFILES){const cur=PROFILE[p.organization_id];const rank=x=>x.profile_status==='accepted'?0:x.profile_status==='proposed'?1:2;if(!cur||rank(p)<rank(cur))PROFILE[p.organization_id]=p;}
const statusOf=orgId=>PROFILE[orgId]?PROFILE[orgId].profile_status:'none';
// Proposed (researched) and rejected investors never appear in the pipeline.
const inPipeline=orgId=>!['proposed','rejected'].includes(statusOf(orgId));
const OPPS=flat('opps',d=>({next_due:validDate(d.next_due),last_activity_on:validDate(d.last_activity_on),offer_received_on:validDate(d.offer_received_on),offer_expires_on:validDate(d.offer_expires_on)}));
const OPP=Object.fromEntries(OPPS.map(x=>[x.id,x]));
const ACTS=flat('acts',d=>({activity_on:validDate(d.activity_on),follow_up_due:validDate(d.follow_up_due)}));
const TRANCHES=flat('tranches',d=>({expected_on:validDate(d.expected_on),tranche_no:num(d.tranche_no,0)}));
const PEOPLE=flat('people');
const INVESTOR_ORGS=R.orgs.rows.filter(o=>o.data.org_type==='investor'||PROFILE[o.id]);
const oppTitle=o=>o?orgName(o.organization_id)+' · '+roundName(o.round_id):'Opportunity unavailable';
const amountOf=o=>o.interest==='signed'?num(o.amount_committed):num(o.amount_committed,num(o.amount_indicated));

/* Integrations: own entries until linked, then the provider's data read-only. Read only where a line is shown. */
let INTEG=[];if(inp.saved&&['round','engagement'].includes(st.screen)&&!PENDING){try{const r=tools.call('integrations.list',{});INTEG=r&&Array.isArray(r.integrations)?r.integrations:[];}catch(e){INTEG=[];}}
const integ=role=>INTEG.find(x=>x.role===ROLE_KEY[role])||null;
const linked=role=>{const i=integ(role);return !!(i&&i.source==='linked');};
function integrationLine(role){const i=integ(role);if(!i||!i.offer)return '';const room=role!=='miles';
 const app=room?'Data Room':'Programs',use=room?(role==='views'?'Use its view data':'Use its data'):'Use its milestones';
 return '<p class="k-muted k-small fr-integration">'+(i.offer==='install'?'Works with '+app+'. ':app+' is in your workspace. ')+'<button type="button" class="fr-link" data-trialy-integration="'+esc(i.offer)+' '+esc(ROLE_KEY[role])+'">'+(i.offer==='install'?'Add '+app:use)+'</button></p>';}
const roomLine=()=>integrationLine(integ('grants')&&integ('grants').offer?'grants':'views');
const ROOM_LINKED=linked('grants')||linked('views');

/* ---------- calculations ---------- */
const CORE=screenRoles.filter(r=>['orgs','profiles','rounds','opps','acts','tranches'].includes(r));
const readProblems=[];
const PLURAL={orgs:'Investors',profiles:'Investor profiles',rounds:'Rounds',opps:'Opportunities',acts:'Activities',tranches:'Tranches'};
for(const role of CORE){const r=R[role],n=PLURAL[role];if(r.pending)continue;
 if(r.unbound)readProblems.push(n+': table not connected.');
 else if(r.unavailable)readProblems.push(n+': you cannot read this table.');
 else if(!r.complete)readProblems.push(n+': '+r.allRows.length+' of '+r.total+' rows read.');}
const exact=readProblems.length===0;
function roundTotals(round){
 const out={raised:0,verbal:0,soft:0,flagged:[],signedMissing:[],opps:[],target:num(round&&round.target_amount)};
 if(!round)return out;
 out.opps=OPPS.filter(o=>o.round_id===round.id&&inPipeline(o.organization_id));
 for(const o of out.opps){if(!['soft','verbal','signed'].includes(o.interest))continue;const a=amountOf(o);
  if(a===null){if(o.interest==='signed')out.signedMissing.push(o);continue;}
  // Never converted or relabelled: another currency is flagged and excluded.
  if(o.currency!==round.currency){out.flagged.push(o);continue;}
  out[o.interest==='signed'?'raised':o.interest]+=a;}
 return out;}
const leadOf=round=>round?OPPS.find(o=>o.round_id===round.id&&bool(o.is_lead)&&inPipeline(o.organization_id))||null:null;
function leadText(round){const l=leadOf(round);if(!l)return 'Lead: not yet chosen';
 return 'Lead: '+orgName(l.organization_id)+' · '+(l.offer_status==='received'?'term sheet received':l.offer_status?('term sheet '+label(l.offer_status)):STAGE_LABEL[l.stage]||label(l.stage));}
const isStale=o=>ACTIVE_STAGES.includes(o.stage)&&!!AS_OF&&(!o.last_activity_on||diffDays(o.last_activity_on,AS_OF)>STALE_DAYS);
// A follow-up on an activity is open until a later activity is logged on the same opportunity.
const openFollowUp=a=>!!a.follow_up_due&&!ACTS.some(b=>b.id!==a.id&&b.opportunity_id===a.opportunity_id&&b.activity_on&&a.activity_on&&b.activity_on>a.activity_on);
const closedStage=o=>['closed','passed'].includes(o.stage);
function staleAndDue(round,withActs){const out=[];if(!round||!AS_OF)return out;const week=addDays(AS_OF,6);
 for(const o of OPPS.filter(o=>o.round_id===round.id&&inPipeline(o.organization_id))){
  if(isStale(o))out.push({kind:'stale',date:o.last_activity_on||'',name:orgName(o.organization_id),text:o.last_activity_on?'No activity for '+plural(diffDays(o.last_activity_on,AS_OF),'day')+' ('+STAGE_LABEL[o.stage]+')':'No activity logged ('+STAGE_LABEL[o.stage]+')',id:o.id});
  if(!closedStage(o)&&o.next_due&&o.next_due<=week)out.push({kind:o.next_due<AS_OF?'overdue':'due',date:o.next_due,name:orgName(o.organization_id),text:'Next step: '+String(o.next_step||'follow up'),id:o.id});}
 if(withActs)for(const a of ACTS.filter(a=>openFollowUp(a)&&a.follow_up_due<=week)){const o=OPP[a.opportunity_id];if(!o||o.round_id!==round.id||closedStage(o)||!inPipeline(o.organization_id))continue;
  out.push({kind:a.follow_up_due<AS_OF?'overdue':'due',date:a.follow_up_due,name:orgName(o.organization_id),text:'Follow up: '+String(a.summary||'').slice(0,80),id:o.id});}
 const order={overdue:0,due:1,stale:2};return out.sort((a,b)=>order[a.kind]-order[b.kind]||String(a.date).localeCompare(String(b.date))||a.name.localeCompare(b.name));}
function passPatterns(roundId){const list=OPPS.filter(o=>o.stage==='passed'&&(!roundId||o.round_id===roundId));const c={};for(const o of list){const k=o.pass_reason||'unspecified';c[k]=(c[k]||0)+1;}
 return {total:list.length,counts:Object.entries(c).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))};}

/* Engagement signals, from own entries or the linked provider, whichever is the source. */
const GRANTS=flat('grants',d=>({granted_on:validDate(d.granted_on),expires_on:validDate(d.expires_on)}));
const VIEWS=flat('views',d=>({first_viewed_on:validDate(d.first_viewed_on),last_viewed_on:validDate(d.last_viewed_on),view_count:num(d.view_count,0)}));
const ROOM_STATE=R.grants.unavailable||R.views.unavailable?'restricted':R.grants.unbound&&R.views.unbound?'unbound':'ok';
const viewsOfGrant=g=>VIEWS.filter(v=>v.grant_id===g.id||(!v.grant_id&&v.organization_id&&v.organization_id===g.organization_id));
function signalsFor(orgId){
 const vs=VIEWS.filter(v=>v.organization_id===orgId),gs=GRANTS.filter(g=>g.organization_id===orgId);const out=[];if(!AS_OF)return out;
 const week=vs.filter(v=>v.last_viewed_on&&v.last_viewed_on<=AS_OF&&diffDays(v.last_viewed_on,AS_OF)<=6).reduce((n,v)=>n+v.view_count,0);
 if(week>=3)out.push({kind:'hot',text:'Viewed '+week+' times this week'});
 for(const g of gs)if(g.status==='active'&&!viewsOfGrant(g).length)out.push({kind:'never',text:'Has access, never opened'+(g.room_name?' ('+g.room_name+')':'')});
 const dates=[...new Set(vs.flatMap(v=>[v.first_viewed_on,v.last_viewed_on]).filter(d=>d&&d<=AS_OF))].sort();
 if(dates.length>=2){const last=dates[dates.length-1],prev=dates[dates.length-2];if(diffDays(prev,last)>=14&&diffDays(last,AS_OF)<=14)out.push({kind:'reopened',text:'Re-opened the room on '+dateLabel(last)+' after '+diffDays(prev,last)+' days. Suggested: follow up this week.'});}
 const docs=new Set(vs.map(v=>String(v.document_ref||v.document_title||'')).filter(Boolean));if(docs.size)out.push({kind:'depth',text:plural(docs.size,'document')+' viewed'});
 return out;}
function engagementDot(orgId){const s=signalsFor(orgId);return s.some(x=>x.kind==='hot'||x.kind==='reopened')?'hot':VIEWS.some(v=>v.organization_id===orgId)?'opened':s.some(x=>x.kind==='never')?'never':'';}
const ENG_ORGS=[...new Set(GRANTS.map(g=>g.organization_id).concat(VIEWS.map(v=>v.organization_id)).filter(Boolean))];
const SIGNALS=ENG_ORGS.flatMap(o=>signalsFor(o).filter(s=>s.kind!=='depth').map(s=>({...s,org:o}))).sort((a,b)=>({reopened:0,hot:1,never:2}[a.kind]-{reopened:0,hot:1,never:2}[b.kind])||orgName(a.org).localeCompare(orgName(b.org)));

/* Tranche on track: the status of its milestone (own entry or Programs, whichever is the source). */
const MILES=flat('miles',d=>({end_date:validDate(d.end_date)})).filter(m=>!m.item_type||m.item_type==='milestone');
function trancheTrack(t){if(!t.milestone_id)return {tone:'',text:'No milestone'};
 if(R.miles.unbound)return {tone:'',text:'Milestones not connected'};if(R.miles.unavailable)return {tone:'amber',text:'Milestone not readable'};
 const m=R.miles.allRows.find(x=>x.id===t.milestone_id);if(!m)return {tone:'amber',text:'Milestone unavailable'};
 const s=m.data.status,end=validDate(m.data.end_date);
 if(s==='done')return {tone:'green',text:'Milestone done: met candidate'};
 if(s==='at_risk')return {tone:'red',text:'Milestone at risk'};
 if(s==='cancelled')return {tone:'red',text:'Milestone cancelled'};
 if(end&&t.expected_on&&end>t.expected_on)return {tone:'amber',text:'Milestone '+dateLabel(end)+', after the expected date'};
 return {tone:'blue',text:'On track ('+label(s||'planned')+(end?', '+dateLabel(end):'')+')'};}

/* ---------- selected round: the working context, kept across screens and visits ---------- */
if(action==='round'&&event.kind==='change'){const v=String(event.value||'');if(ROUND[v]){st.round=v;st.offset=0;st.cmp=null;st.panel=null;}}
if(!st.round||(!ROUND[st.round]&&R.rounds.complete&&!R.rounds.pending)){const a=ROUNDS.find(r=>r.status==='active')||ROUNDS[0];st.round=a?a.id:'';}
function defaultCompare(){return OPPS.filter(o=>o.round_id===st.round&&inPipeline(o.organization_id)&&(num(o.offer_amount)!==null||o.offer_received_on)).sort((a,b)=>String(b.offer_received_on||'').localeCompare(String(a.offer_received_on||''))).slice(0,3).map(o=>o.id);}

/* ---------- writes ---------- */
const fieldOf=(role,key)=>S[role].find(f=>f.key===key)||null;
function toReal(role,data){const m=roleMap[role];if(!m)fail('The '+ROLE_LABEL[role]+' table is not connected.');const out={};for(const [k,v] of Object.entries(data)){if(v===undefined||!m.fields[k])continue;if(!m.writable.includes(k))fail('You cannot edit '+k.replace(/_/g,' ')+' here.');out[m.fields[k]]=v;}return out;}
/* One value, checked as the platform checks it, so a mistake shows before anything is sent. */
function coerce(role,f,v,refsOk){
 if(typeof v==='string')v=v.trim();
 if(v===''||v===null||v===undefined){if(f.required)fail(f.label+' is required.');return null;}
 if(f.kind==='number'||f.kind==='money'){const n=Number(v);if(!Number.isFinite(n))fail('Enter a number for '+f.label.toLowerCase()+'.');if(f.kind==='money'&&n<0)fail(f.label+' cannot be negative.');return n;}
 if(f.kind==='date'){const d=validDate(v);if(!d)fail('Use a valid date for '+f.label.toLowerCase()+'.');return d;}
 if(f.kind==='select'){if(!f.options.includes(String(v)))fail('Choose a valid '+f.label.toLowerCase()+'.');return String(v);}
 if(f.kind==='boolean')return bool(v);
 if(f.kind==='ref'){if(!refsOk&&!R[f.ref].allRows.some(r=>r.id===v))fail('Choose an existing '+f.label.toLowerCase()+'.');return String(v);}
 return String(v).slice(0,f.kind==='longtext'?4000:300);}
function checkRecord(role,next,id){
 if(role==='profiles'){const lo=num(next.check_min),hi=num(next.check_max);if(lo!==null&&hi!==null&&lo>hi)fail('Cheque min is above cheque max.');}
 if(role==='tranches'){const no=num(next.tranche_no);if(no!==null&&!(Number.isInteger(no)&&no>=1))fail('The tranche number is a whole number from 1.');if(TRANCHES.some(t=>t.id!==id&&t.round_id===next.round_id&&t.tranche_no===no))fail('Tranche '+no+' already exists in this round.');}
 if(role==='views'&&num(next.view_count)!==null&&num(next.view_count)<0)fail('Views cannot be negative.');}
function save(changes,message){if(!changes.length)return;if(changes.length>50)fail('This change needs '+changes.length+' record writes; one save holds 50.');tools.call('records.save',{changes});say('success',message||'Saved');}
// Saving an activity dated after the opportunity's last activity also moves last_activity_on forward, in the same save.
function lastActivity(oppId,when,version){const o=OPP[oppId];if(!o||!when||(o.last_activity_on&&when<=o.last_activity_on))return [];
 if(!writableField('opps','last_activity_on'))fail('You cannot update the opportunity, so this activity cannot be saved.');
 return [{kind:'update_record',recordId:o.id,expectedVersion:version!=null?version:o.version,data:toReal('opps',{last_activity_on:when})}];}
const roleOf=id=>ORDER.find(r=>R[r].allRows.some(x=>x.id===id))||null;
const splitVer=v=>{const i=String(v).lastIndexOf('~');return i<0?{id:String(v),version:null}:{id:String(v).slice(0,i),version:Number(String(v).slice(i+1))};};
function presets(role,arg){const rd=ROUND[st.round];
 return {rounds:{round_type:'seed',currency:DEFAULT_CURRENCY,status:'planning'},
  opps:{round_id:st.round,organization_id:arg||'',stage:STAGE_ORDER[0]||'target',interest:'none',currency:rd?rd.currency:DEFAULT_CURRENCY},
  acts:{opportunity_id:arg||'',activity_on:AS_OF,kind:'email'},
  tranches:{round_id:st.round,tranche_no:TRANCHES.filter(t=>t.round_id===st.round).reduce((n,t)=>Math.max(n,t.tranche_no),0)+1,currency:rd?rd.currency:DEFAULT_CURRENCY,status:'expected'},
  orgs:{org_type:'investor'},
  profiles:{organization_id:arg||'',investor_type:'specialist_ls_vc'},
  people:{organization_id:arg||''},
  grants:{organization_id:arg||'',status:'active',room_purpose:'financing',granted_on:AS_OF},
  views:{organization_id:arg||'',source:'manual',view_count:1,last_viewed_on:AS_OF,as_of:AS_OF},
  miles:{status:'planned',is_key:true}}[role]||{};}
const formFields=role=>S[role].filter(f=>!['auto','frozen'].includes(f.kind)&&f.key!=='archived'&&roleMap[role]&&roleMap[role].fields[f.key]&&roleMap[role].writable.includes(f.key));

try{
 if(PENDING&&/^(edit:|move|create:|pass:|lead:|decide:|archive:|settings:|add:)/.test(action))fail('Still loading. Try again in a moment.');
 const ed=event.kind==='change'?kit.edit(event,{}):null;
 const mv=kit.move(event,'move');
 if(ed){
  // An inline edit: one field of one record, saved at once with the version shown when the value was drawn.
  const role=roleOf(ed.recordId);if(!role)fail('That record is no longer available.');if(role==='settings')fail('Change settings in Settings.');
  const f=fieldOf(role,ed.field);if(!f||['auto','frozen'].includes(f.kind)||!writableField(role,ed.field))fail('You cannot change '+String(f?f.label:ed.field).toLowerCase()+'.');
  const rec=lookup(role,ed.recordId),value=coerce(role,f,ed.value,f.kind==='ref'&&rec.data[ed.field]===ed.value);
  const version=ed.version!=null?ed.version:rec.version;
  if(value===(rec.data[ed.field]===undefined||rec.data[ed.field]===''?null:rec.data[ed.field])){}
  else if(role==='opps'&&ed.field==='stage'&&value==='passed'&&!rec.data.pass_reason){st.panel={kind:'pass',id:rec.id,version};}
  else{
   checkRecord(role,{...rec.data,[ed.field]:value},rec.id);
   const changes=[{kind:'update_record',recordId:rec.id,expectedVersion:version,data:toReal(role,{[ed.field]:value})}];
   if(role==='acts'&&ed.field==='activity_on')changes.push(...lastActivity(rec.data.opportunity_id,value));
   save(changes,f.label+' saved');}
 }
 else if(mv){
  // A board move (drag and drop, or the move menu on the card). Passing asks why first.
  const {id,version}=splitVer(mv.cardId),o=OPP[id];if(!o)fail('That opportunity is no longer available.');if(!writableField('opps','stage'))fail('You cannot move opportunities.');
  if(!STAGES.includes(mv.columnId))fail('Choose a stage.');
  if(mv.columnId!==o.stage){
   if(mv.columnId==='passed')st.panel={kind:'pass',id:o.id,version:version!=null?version:o.version};
   else save([{kind:'update_record',recordId:o.id,expectedVersion:version!=null?version:o.version,data:toReal('opps',{stage:mv.columnId})}],orgName(o.organization_id)+' moved to '+STAGE_LABEL[mv.columnId]);}
 }
 else if(action==='pass:submit'&&event.kind==='submit'){const p=st.panel;if(!p||p.kind!=='pass')fail('Nothing to save.');const o=OPP[p.id];if(!o)fail('That opportunity is no longer available.');
  const reason=String(form.pass_reason||'');if(!PASS_REASONS.includes(reason))fail('Choose why the investor passed.');
  const data={stage:'passed',pass_reason:reason};const d=String(form.pass_detail||'').trim().slice(0,300);if(d!==String(o.pass_detail||''))data.pass_detail=d||null;
  save([{kind:'update_record',recordId:o.id,expectedVersion:p.version,data:toReal('opps',data)}],orgName(o.organization_id)+' moved to '+STAGE_LABEL.passed);st.panel=null;}
 else if(action.startsWith('add:')){const [role,arg]=action.slice(4).split(':');if(!S[role]||role==='settings'||role==='reports')fail('Unknown record type.');if(!canWrite(role))fail('You cannot add '+ROLE_LABEL[role]+' records.');
  if(role==='opps'&&!ROUNDS.length)fail('Start a round first.');if(role==='opps'&&arg&&!inPipeline(arg))fail('Accept this investor before adding it to a round.');
  if(role==='acts'&&!OPPS.length)fail('Add an investor to a round first.');
  // Versions of the opportunities are captured now: the activity's last_activity_on update uses them.
  st.panel={kind:'create',role,draft:presets(role,arg),versions:role==='acts'?Object.fromEntries(OPPS.map(x=>[x.id,x.version])):null};}
 else if(action.startsWith('create:')&&event.kind==='submit'){const p=st.panel,role=action.slice(7);if(!p||p.kind!=='create'||p.role!==role)fail('Nothing to save.');if(!canWrite(role))fail('You cannot add '+ROLE_LABEL[role]+' records.');
  p.draft={...p.draft,...form};const data={};
  for(const f of formFields(role)){if(f.kind==='boolean'){data[f.key]=bool(p.draft[f.key]);continue;}const v=coerce(role,f,p.draft[f.key],false);if(v!==null)data[f.key]=v;}
  checkRecord(role,data,null);
  if(role==='opps'){if(!inPipeline(data.organization_id))fail('Accept this investor before adding it to a round.');if(OPPS.some(o=>o.round_id===data.round_id&&o.organization_id===data.organization_id))fail(orgName(data.organization_id)+' is already in '+roundName(data.round_id)+'.');}
  if(role==='profiles'){if(PROFILE[data.organization_id])fail(orgName(data.organization_id)+' already has an investor profile.');if(writableField('profiles','profile_status'))data.profile_status='accepted';}
  const m=roleMap[role];if(m.fields.archived&&m.writable.includes('archived'))data.archived=false;
  if(['acts','grants'].includes(role)&&m.fields.source&&m.writable.includes('source'))data.source='manual';
  if(role==='miles'&&m.fields.item_type&&m.writable.includes('item_type'))data.item_type='milestone';
  const changes=[{kind:'create_record',typeId:m.typeId,data:toReal(role,data)}];
  if(role==='acts')changes.push(...lastActivity(data.opportunity_id,data.activity_on,p.versions&&has(p.versions,data.opportunity_id)?p.versions[data.opportunity_id]:null));
  save(changes,cap(ROLE_LABEL[role])+' added');st.panel=null;}
 else if(action.startsWith('archive:')){const [role,rest]=[action.slice(8,action.indexOf(':',8)),action.slice(action.indexOf(':',8)+1)];const {id,version}=splitVer(rest),r=S[role]&&lookup(role,id);if(!r)fail('That record is no longer available.');if(!canWrite(role))fail('You cannot remove '+ROLE_LABEL[role]+' records.');
  if(role==='rounds'&&OPPS.some(o=>o.round_id===id))fail('This round still has investors. Remove them first.');
  save([{kind:'archive_record',recordId:id,expectedVersion:version!=null?version:r.version}],cap(ROLE_LABEL[role])+' removed');if(st.panel&&st.panel.id===id)st.panel=null;}
 else if(action.startsWith('lead:')){const {id,version}=splitVer(action.slice(5)),o=OPP[id];if(!o)fail('That opportunity is no longer available.');if(!writableField('opps','is_lead'))fail('You cannot mark the lead.');
  // Marking a lead unmarks the previous one and sets the round's lead, in one save.
  const changes=[{kind:'update_record',recordId:o.id,expectedVersion:version!=null?version:o.version,data:toReal('opps',{is_lead:true})}];
  for(const x of OPPS.filter(x=>x.round_id===o.round_id&&x.id!==o.id&&bool(x.is_lead)))changes.push({kind:'update_record',recordId:x.id,expectedVersion:x.version,data:toReal('opps',{is_lead:false})});
  const rd=ROUND[o.round_id];if(rd&&writableField('rounds','lead_org_id')&&rd.lead_org_id!==o.organization_id)changes.push({kind:'update_record',recordId:rd.id,expectedVersion:rd.version,data:toReal('rounds',{lead_org_id:o.organization_id})});
  save(changes,orgName(o.organization_id)+' is the lead');}
 else if(action.startsWith('decide:')){const [ref,to]=action.slice(7).split(':');const {id,version}=splitVer(ref),p=PROFILES.find(x=>x.id===id);if(!p)fail('That profile is no longer available.');if(!['accepted','rejected'].includes(to))fail('Accept or reject the investor.');if(!writableField('profiles','profile_status'))fail('You cannot change investor profiles.');
  save([{kind:'update_record',recordId:p.id,expectedVersion:version!=null?version:p.version,data:toReal('profiles',{profile_status:to})}],orgName(p.organization_id)+(to==='accepted'?' accepted':' rejected'));}
 else if(action.startsWith('settings:')&&event.kind==='submit'){if(!OWNER)fail('Only an owner of this app can change its settings.');if(!canWrite('settings'))fail('You cannot change the settings table.');
  const data={};for(const k of ['default_currency','stale_days','stages','pass_reasons','modalities','therapeutic_areas','dev_stages']){if(!has(form,k)||!writableField('settings',k))continue;data[k]=coerce('settings',fieldOf('settings',k),form[k],true);}
  for(const [k,allowed] of [['stages',STAGES],['pass_reasons',PASS_REASONS]])if(data[k]){const bad=listOf(data[k]).map(x=>x.toLowerCase()).filter(x=>!allowed.includes(x));if(bad.length)fail('Unknown '+k.replace('_',' ')+': '+bad.join(', ')+'. Use: '+allowed.join(', ')+'.');}
  if(data.stale_days!=null&&!(Number.isInteger(data.stale_days)&&data.stale_days>=1&&data.stale_days<=180))fail('Stale after is a whole number of days from 1 to 180.');
  const [,kind,ver]=action.split(':');
  if(kind==='save'&&settingsRow){for(const k of Object.keys(data))if(String(data[k]??'')===String(SET[k]??''))delete data[k];if(!Object.keys(data).length)fail('Nothing changed.');save([{kind:'update_record',recordId:settingsRow.id,expectedVersion:Number(ver),data:toReal('settings',data)}],'Settings saved');}
  else{if(R.settings.rows.length)fail('Settings already exist; reopen Settings.');save([{kind:'create_record',typeId:roleMap.settings.typeId,data:toReal('settings',data)}],'Settings saved');}}
 else if(action.startsWith('cmp:')&&event.kind==='change'){const id=action.slice(4);const cur=st.cmp||defaultCompare();let next=cur.filter(x=>x!==id);if(bool(event.value))next.push(id);if(next.length>3)fail('Compare up to three offers at a time.');st.cmp=next;}
}catch(e){say('error',String(e&&e.message||e).slice(0,300));if(st.panel&&st.panel.kind==='create'&&action.startsWith('create:'))st.panel.draft={...st.panel.draft,...form};}

/* ---------- rendering helpers ---------- */
const pill=(t,tone)=>'<span class="k-pill'+(tone?' fr-'+tone:'')+'">'+esc(t)+'</span>';
const btn=(t,a,o)=>kit.button(t,a,o||{});
const small=(t,a,o)=>'<button type="button" class="k-button fr-small"'+kit.attr('data-action',a)+kit.attr('aria-label',o&&o.label)+kit.attr('disabled',!!(o&&o.disabled))+'>'+esc(t)+'</button>';
const card=(title,sub,body,actions)=>'<section class="k-card fr-section"><div class="fr-head"><div><h2>'+esc(title)+'</h2>'+(sub?'<p class="k-muted k-small">'+esc(sub)+'</p>':'')+'</div>'+(actions?'<div class="k-row">'+actions+'</div>':'')+'</div>'+body+'</section>';
const optLabel=(key,o)=>OPTION_LABEL[key]&&OPTION_LABEL[key][o]?OPTION_LABEL[key][o]:cap(o);
const display=(f,v)=>{if(v===null||v===undefined||v==='')return '—';if(f.kind==='select')return optLabel(f.key,v);if(f.kind==='date')return dateLabel(validDate(v));if(f.kind==='boolean')return bool(v)?'Yes':'No';if(f.kind==='money'||f.kind==='number'){const n=num(v);return n===null?'—':grouped(n);}if(f.kind==='ref'){return f.ref==='orgs'?orgName(v):f.ref==='people'?personName(v):f.ref==='rounds'?roundName(v):f.ref==='opps'?oppTitle(OPP[v]):f.ref==='miles'?mileName(v):f.ref==='grants'?(()=>{const g=GRANTS.find(x=>x.id===v);return g?orgName(g.organization_id)+(g.room_name?' · '+g.room_name:''):'Access unavailable';})():String(v);}return String(v);};
function mileName(id){if(!id)return '—';const m=R.miles.allRows.find(x=>x.id===id);return m?String(m.data.name||'Unnamed milestone'):'Milestone unavailable';}
function refRows(f,ctxData){
 if(f.ref==='orgs')return INVESTOR_ORGS.map(o=>[o.id,String(o.data.name||'Unnamed')]).sort((a,b)=>a[1].localeCompare(b[1]));
 if(f.ref==='people'){const org=ctxData.organization_id||(OPP[ctxData.opportunity_id]||{}).organization_id||'';return PEOPLE.filter(p=>!org||p.organization_id===org).map(p=>[p.id,String(p.name||'Unnamed')+(p.title?' · '+p.title:'')]);}
 if(f.ref==='rounds')return ROUNDS.map(r=>[r.id,String(r.name||'Unnamed')]);
 if(f.ref==='opps')return OPPS.filter(o=>inPipeline(o.organization_id)).map(o=>[o.id,oppTitle(o)]).sort((a,b)=>a[1].localeCompare(b[1]));
 if(f.ref==='grants')return GRANTS.map(g=>[g.id,orgName(g.organization_id)+(g.room_name?' · '+g.room_name:'')]);
 if(f.ref==='miles')return MILES.map(m=>[m.id,String(m.name||'Unnamed')+(m.end_date?' · '+dateLabel(m.end_date):'')]);
 return [];}
function choices(f,cur,ctxData){
 if(f.kind==='ref'){const rows=refRows(f,ctxData||{});if(cur&&!rows.some(r=>r[0]===cur))rows.unshift([cur,display(f,cur)]);return rows;}
 let list=f.options;if(f.key==='stage')list=STAGE_ORDER.concat(cur&&!STAGE_ORDER.includes(cur)?[cur]:[]);if(f.key==='pass_reason')list=PASS_ORDER.concat(cur&&!PASS_ORDER.includes(cur)?[cur]:[]);
 return list.map(o=>[o,optLabel(f.key,o)]);}
const selectHtml=(attrs,cur,opts,blank)=>'<select'+attrs+'>'+(blank===false?'':'<option value="">'+esc(blank||'—')+'</option>')+opts.map(([v,l])=>'<option'+kit.attr('value',v)+kit.attr('selected',String(cur??'')===v)+'>'+esc(l)+'</option>').join('')+'</select>';
/* A value shown where it can be changed: saves at once on change (kit.cell); read-only where the person cannot edit it. */
function cell(role,rec,key,lbl){const f=fieldOf(role,key);if(!f)return '—';const v=rec[key];const name=lbl||f.label;
 if(['auto','frozen'].includes(f.kind)||!writableField(role,key)||linkedRole(role))return '<span>'+esc(display(f,v))+'</span>';
 const act='edit:'+rec.id+':'+key+':'+rec.version;
 if(f.kind==='select'||f.kind==='ref')return selectHtml(' class="k-cell"'+kit.attr('data-action',act)+kit.attr('aria-label',name),v,choices(f,v,rec),f.required?false:'—');
 if(f.kind==='boolean')return selectHtml(' class="k-cell"'+kit.attr('data-action',act)+kit.attr('aria-label',name),bool(v)?'true':'false',[['false','No'],['true','Yes']],false);
 return kit.cell({recordId:rec.id,version:rec.version,field:key,value:f.kind==='date'?validDate(v)||'':v,kind:f.kind==='longtext'?'text':f.kind,label:name});}
const linkedRole=role=>['grants','views','miles'].includes(role)&&linked(role);
const kv=(k,v)=>'<div class="fr-kv"><span class="k-muted">'+esc(k)+'</span><span>'+v+'</span></div>';
const kvText=(k,v)=>kv(k,esc(v===null||v===undefined||v===''?'—':v));
const fieldRow=(role,rec,key)=>{const f=fieldOf(role,key);return f&&roleMap[role]&&roleMap[role].fields[key]?kv(f.label,cell(role,rec,key)):'';};
const loadingHtml='<p class="k-muted fr-loading" aria-busy="true">Loading…</p>';
const interestTone=i=>i==='signed'?'green':i==='verbal'?'blue':i==='soft'?'amber':'';
function picker(){if(!ROUNDS.length)return '';return kit.picker({label:'Round',action:'round',value:st.round,options:ROUNDS.map(r=>({value:r.id,label:String(r.name||'Unnamed')+' · '+cap(r.status)}))});}
function toolbar(extra){const undo=st.undo?kit.undo(st.undo):'';return '<div class="k-row fr-toolbar">'+picker()+'<span class="k-grow"></span>'+(extra||'')+undo+'</div>';}
function partial(){return exact?'':'<p class="fr-note" role="note">Some data could not be read completely, so totals are withheld: '+esc(readProblems.slice(0,6).join(' '))+'</p>';}
function noRound(){return kit.empty({title:'No round yet',text:'Start a round with its type, target and currency, then add investors to it.',action:canWrite('rounds')?{label:'Start a round',action:'add:rounds'}:null});}
function filterBar(filters){const active=Object.values(st.filters).filter(Boolean).length;
 return '<div class="k-row fr-filters"><input type="search" class="fr-search" data-action="query" aria-label="Search"'+kit.attr('value',st.query)+' placeholder="Search">'+filters.filter(f=>f.options.length).map(f=>'<label class="fr-filter"><span class="k-small k-muted">'+esc(f.label)+'</span>'+selectHtml(kit.attr('data-action','filter:'+f.key)+kit.attr('aria-label',f.label),st.filters[f.key]||'',f.options,'All')+'</label>').join('')+(active?small('Clear filters','filters:clear'):'')+'</div>';}
const opt=(list,labels)=>list.map(x=>[x,labels&&labels[x]?labels[x]:cap(x)]);
function pageOf(items){const max=Math.max(0,Math.ceil(items.length/PER)-1)*PER;const offset=Math.min(st.offset,max);return {slice:items.slice(offset,offset+PER),pager:items.length>PER?kit.pager({offset,limit:PER,total:items.length,action:'page'}):''};}

/* ---------- Overview ---------- */
function thermometer(round,t){const target=t.target||0,total=t.raised+t.verbal+t.soft,scale=Math.max(target,total)||1;const w=v=>(v/scale*100).toFixed(2)+'%';
 return '<div class="fr-thermo" role="img" aria-label="'+esc('Signed '+exactMoney(t.raised,round.currency)+', verbal '+exactMoney(t.verbal,round.currency)+', soft '+exactMoney(t.soft,round.currency)+(target?' of target '+exactMoney(target,round.currency):''))+'"><i class="fr-signed" style="width:'+w(t.raised)+'"></i><i class="fr-verbal" style="width:'+w(t.verbal)+'"></i><i class="fr-soft" style="width:'+w(t.soft)+'"></i>'+(target?'<b class="fr-target" style="left:'+w(target)+'"></b>':'')+'</div>'+
 '<div class="fr-legend k-small"><span><i class="fr-signed"></i>Signed '+esc(money(t.raised,round.currency))+'</span><span><i class="fr-verbal"></i>Verbal '+esc(money(t.verbal,round.currency))+'</span><span><i class="fr-soft"></i>Soft '+esc(money(t.soft,round.currency))+'</span>'+(target?'<span><i class="fr-target"></i>Target '+esc(money(target,round.currency))+'</span>':'')+'</div>';}
function currencyNotes(t,round){const parts=[];
 if(t.flagged.length)parts.push(plural(t.flagged.length,'amount')+' in another currency excluded: '+t.flagged.map(o=>orgName(o.organization_id)+' ('+o.currency+' '+grouped(amountOf(o))+', '+o.interest+')').join('; ')+'. Totals use '+round.currency+' only; amounts are never converted.');
 if(t.signedMissing.length)parts.push(plural(t.signedMissing.length,'signed commitment')+' without a committed amount: '+t.signedMissing.map(o=>orgName(o.organization_id)).join(', ')+'. Enter the amount to count it.');
 return parts.map(p=>'<p class="fr-note">'+esc(p)+'</p>').join('');}
const dueList=(items,limit)=>items.length?'<ul class="fr-list">'+items.slice(0,limit).map(x=>'<li><span>'+pill(x.kind==='stale'?'Stale':x.kind==='overdue'?'Overdue':'Due',x.kind==='overdue'?'red':x.kind==='due'?'amber':'')+' <strong>'+esc(x.name)+'</strong><span class="fr-sub k-small k-muted">'+esc(x.text)+(x.kind!=='stale'&&x.date?' · '+dateLabel(x.date):'')+'</span></span>'+small('Open','details:opp:'+x.id,{label:'Open '+x.name})+'</li>').join('')+'</ul>'+(items.length>limit?'<p class="k-muted k-small">And '+(items.length-limit)+' more on the Activity screen.</p>':''):'';
function overview(){
 const round=ROUND[st.round];if(!round)return toolbar()+partial()+noRound();
 const t=roundTotals(round),tot=v=>exact?money(v,round.currency):'—';
 let body=toolbar()+partial();
 body+='<section class="k-card fr-hero"><p class="k-muted k-small">'+esc(String(round.name||'Round')+' · '+(ROUND_LABEL[round.round_type]||cap(round.round_type))+' · '+cap(round.status))+'</p><p class="fr-big">'+(exact?'Raised '+esc(exactMoney(t.raised,round.currency))+(t.target?' of '+esc(exactMoney(t.target,round.currency))+' ('+pct(t.raised,t.target)+'%)':''):'Totals withheld until all data is read')+'</p>'+(exact?thermometer(round,t):'')+'<div class="k-row k-small">'+pill(leadText(round),'lead')+(round.target_close?'<span>Target close <strong>'+esc(dateLabel(round.target_close))+'</strong></span>':'')+'</div></section>';
 const active=t.opps.filter(o=>!closedStage(o)).length;
 body+='<div class="k-grid fr-stats">'+kit.stat('Raised (signed)',tot(t.raised))+kit.stat('Verbal, not raised',tot(t.verbal))+kit.stat('Soft, not raised',tot(t.soft))+kit.stat('Progress',exact&&t.target?pct(t.raised,t.target)+'%':'—')+kit.stat('Active conversations',exact?String(active):'—')+'</div>'+currencyNotes(t,round);
 const sd=staleAndDue(round,true),list=OPPS.filter(o=>o.round_id===round.id&&inPipeline(o.organization_id));
 const parts=[];
 if(!OV_HIDDEN.includes('funnel')){const max=Math.max(1,...STAGE_ORDER.map(s=>list.filter(o=>o.stage===s).length));
  parts.push(card('Funnel','Investors by stage; days since the last logged activity','<ul class="fr-funnel">'+STAGE_ORDER.map(s=>{const l=list.filter(o=>o.stage===s),days=l.filter(o=>o.last_activity_on&&AS_OF).map(o=>diffDays(o.last_activity_on,AS_OF));const avg=days.length?Math.round(days.reduce((a,b)=>a+b,0)/days.length):null;
   return '<li><span>'+esc(STAGE_LABEL[s])+'</span><span class="fr-bar"><i style="width:'+(l.length/max*100).toFixed(1)+'%"></i></span><strong>'+l.length+'</strong><span class="k-muted k-small">'+(avg===null?'—':avg+' d')+'</span></li>';}).join('')+'</ul>'));}
 if(!OV_HIDDEN.includes('stale_due'))parts.push(card('Stale and due','No activity for more than '+STALE_DAYS+' days, and follow-ups due by '+dateLabel(addDays(AS_OF,6)),dueList(sd,12)||'<p class="k-muted">Nothing stale or due.</p>'));
 if(parts.length)body+='<div class="k-grid fr-two">'+parts.join('')+'</div>';
 if(!OV_HIDDEN.includes('engagement'))body+=card('Engagement highlights',ROOM_LINKED?'From the linked Data Room':'From your data-room entries',ROOM_STATE==='restricted'?'<p class="k-muted">You cannot read the data-room tables.</p>':SIGNALS.length?'<ul class="fr-list">'+SIGNALS.slice(0,6).map(s=>'<li><span>'+pill(s.kind==='hot'?'Hot':s.kind==='reopened'?'Re-opened':'Never opened',s.kind==='never'?'amber':'green')+' <strong>'+esc(orgName(s.org))+'</strong><span class="fr-sub k-small k-muted">'+esc(s.text)+'</span></span></li>').join('')+'</ul>':'<p class="k-muted">No engagement signals yet.</p>',small('Engagement','nav:engagement'));
 return body;}

/* ---------- Pipeline: a drag-and-drop board by stage, with a move menu on every card ---------- */
function pipeline(){
 const round=ROUND[st.round];if(!round)return toolbar()+partial()+noRound();
 const owners=[...new Set(OPPS.filter(o=>o.round_id===round.id).map(o=>String(o.owner||'')).filter(Boolean))].sort();
 const q=st.query.toLowerCase().trim(),f=st.filters;
 const all=OPPS.filter(o=>o.round_id===round.id&&inPipeline(o.organization_id)),hidden=OPPS.filter(o=>o.round_id===round.id&&!inPipeline(o.organization_id)).length;
 let list=all;
 if(q)list=list.filter(o=>[orgName(o.organization_id),o.owner,o.next_step].some(v=>String(v||'').toLowerCase().includes(q)));
 if(f.tier)list=list.filter(o=>(PROFILE[o.organization_id]||{}).tier===f.tier);
 if(f.investor_type)list=list.filter(o=>(PROFILE[o.organization_id]||{}).investor_type===f.investor_type);
 if(f.owner)list=list.filter(o=>String(o.owner||'')===f.owner);
 if(f.interest)list=list.filter(o=>o.interest===f.interest);
 const cfFilters=CFS.filter(c=>c.role==='opps'&&['select','boolean'].includes(c.kind)&&cfBound(c));
 for(const c of cfFilters){const v=f['cf_'+c.key];if(v)list=list.filter(o=>c.kind==='boolean'?String(bool(o[c.key]))===v:String(o[c.key]??'')===v);}
 const add=canWrite('opps')?btn('Add investor to round','add:opps',{primary:true}):'';
 let body=toolbar(add)+partial();
 if(!all.length)return body+kit.empty({title:'No investors in this round yet',text:'Add accepted investors from your target list, then move them through the stages.',action:canWrite('opps')?{label:'Add investor to round',action:'add:opps'}:null});
 body+=filterBar([{key:'tier',label:'Tier',options:opt(TIERS,{a:'A',b:'B',c:'C'})},{key:'investor_type',label:'Investor type',options:opt(INVESTOR_TYPES,TYPE_LABEL)},{key:'owner',label:'Owner',options:owners.map(o=>[o,o])},{key:'interest',label:'Interest',options:opt(INTEREST)}].concat(cfFilters.map(c=>({key:'cf_'+c.key,label:c.label,options:c.kind==='boolean'?[['true','Yes'],['false','No']]:c.options.map(o=>[o,o])}))));
 body+='<p class="k-muted k-small">'+plural(list.length,'investor')+' shown'+(hidden?' · '+plural(hidden,'investor')+' waiting for a decision in Investors not shown':'')+'. Drag a card or use its menu to change the stage.</p>';
 const stages=STAGE_ORDER.concat([...new Set(list.map(o=>o.stage).filter(s=>STAGES.includes(s)&&!STAGE_ORDER.includes(s)))]);
 const columns=stages.map(s=>({id:s,label:STAGE_LABEL[s],cards:list.filter(o=>o.stage===s).sort((a,b)=>(num(b.amount_indicated,0)-num(a.amount_indicated,0))||orgName(a.organization_id).localeCompare(orgName(b.organization_id))).map(o=>({id:o.id+'~'+o.version,label:orgName(o.organization_id),html:boardCard(o)}))}));
 if(canWrite('opps')&&writableField('opps','stage'))body+=kit.board({action:'move',columns});
 else body+='<div class="k-board">'+columns.map(c=>'<section class="k-column"><h3>'+esc(c.label)+' · '+c.cards.length+'</h3>'+c.cards.map(x=>'<article class="k-board-card">'+x.html+'</article>').join('')+'</section>').join('')+'</div>';
 return body;}
function boardCard(o){const p=PROFILE[o.organization_id]||{},dot=engagementDot(o.organization_id),a=amountOf(o);
 const dotText=dot==='hot'?'Data room: active this week':dot==='opened'?'Data room: opened':dot==='never'?'Data room: access, never opened':'';
 return '<div class="fr-card-head"><strong>'+esc(orgName(o.organization_id))+'</strong></div><div class="k-row fr-tags">'+(p.tier?pill('Tier '+p.tier.toUpperCase(),'teal'):'')+(bool(o.is_lead)?pill('Lead','lead'):'')+(dotText?pill(dotText,dot==='hot'?'green':dot==='never'?'amber':''):'')+'</div>'+
  '<div class="fr-amount">'+esc(a===null?'No amount':exactMoney(a,o.currency))+'</div>'+(o.next_step||o.next_due?'<div class="k-small k-muted">'+esc(String(o.next_step||'Next step')+(o.next_due?' · '+dateLabel(o.next_due):''))+'</div>':'')+
  '<div class="k-row fr-card-foot"><label class="fr-inline k-small"><span class="k-muted">Interest</span>'+cell('opps',o,'interest','Interest of '+orgName(o.organization_id))+'</label>'+small('Details','details:opp:'+o.id,{label:'Details for '+orgName(o.organization_id)})+'</div>';}

/* ---------- Investors ---------- */
const TIER_RANK={a:0,b:1,c:2},LEAD_RANK={yes:0,sometimes:1,no:2};
function investors(){
 const all=INVESTOR_ORGS.map(o=>({org:o,p:PROFILE[o.id]||null})).sort((x,y)=>(TIER_RANK[x.p&&x.p.tier]??3)-(TIER_RANK[y.p&&y.p.tier]??3)||(LEAD_RANK[x.p&&x.p.leads_rounds]??3)-(LEAD_RANK[y.p&&y.p.leads_rounds]??3)||String(x.org.data.name||'').localeCompare(String(y.org.data.name||'')));
 const counts={proposed:all.filter(x=>statusOf(x.org.id)==='proposed').length,rejected:all.filter(x=>statusOf(x.org.id)==='rejected').length};
 const add=canWrite('orgs')?btn('Add investor','add:orgs',{primary:true}):'';
 let body=toolbar(add)+partial()+kit.nav([{id:'targets',label:'Target list'},{id:'proposed',label:'Proposed ('+counts.proposed+')'},{id:'rejected',label:'Rejected ('+counts.rejected+')'}],st.invTab,{prefix:'inv:',label:'Investor lists'});
 let rows=all.filter(x=>st.invTab==='targets'?inPipeline(x.org.id):statusOf(x.org.id)===(st.invTab==='proposed'?'proposed':'rejected'));
 const q=st.query.toLowerCase().trim(),f=st.filters;
 if(q)rows=rows.filter(x=>[x.org.data.name,x.p&&x.p.intro_path,x.p&&x.p.notes,x.org.data.country].some(v=>String(v||'').toLowerCase().includes(q)));
 if(f.tier)rows=rows.filter(x=>x.p&&x.p.tier===f.tier);if(f.investor_type)rows=rows.filter(x=>x.p&&x.p.investor_type===f.investor_type);if(f.leads_rounds)rows=rows.filter(x=>x.p&&x.p.leads_rounds===f.leads_rounds);
 for(const k of ['modalities','therapeutic_areas','dev_stages'])if(f[k])rows=rows.filter(x=>x.p&&listOf(x.p[k]).map(v=>v.toLowerCase()).includes(f[k].toLowerCase()));
 if(!all.length&&st.invTab==='targets')return body+kit.empty({title:'No investors yet',text:'Add the investors you plan to approach, or ask your assistant to research investors that fit your round, with sources.',action:canWrite('orgs')?{label:'Add investor',action:'add:orgs'}:null});
 body+=filterBar([{key:'tier',label:'Tier',options:opt(TIERS,{a:'A',b:'B',c:'C'})},{key:'investor_type',label:'Investor type',options:opt(INVESTOR_TYPES,TYPE_LABEL)},{key:'leads_rounds',label:'Leads rounds',options:opt(['yes','sometimes','no'])},{key:'modalities',label:'Modality',options:VOCAB.modalities.map(v=>[v,cap(v)])},{key:'therapeutic_areas',label:'Therapeutic area',options:VOCAB.therapeutic_areas.map(v=>[v,cap(v)])},{key:'dev_stages',label:'Development stage',options:VOCAB.dev_stages.map(v=>[v,cap(v)])}]);
 if(st.invTab!=='targets')body+='<p class="k-muted k-small">'+(st.invTab==='proposed'?'Researched investors with their sources. They join the target list once you accept them.':'Rejected investors are kept for reference and never appear in the pipeline.')+'</p>';
 const pg=pageOf(rows),decide=writableField('profiles','profile_status');
 const pcell=(x,k,lbl)=>x.p?cell('profiles',x.p,k,lbl+' of '+String(x.org.data.name||'investor')):'—';
 const columns=[{label:'Investor',render:x=>'<strong>'+esc(x.org.data.name||'Unnamed')+'</strong><span class="fr-sub k-small k-muted">'+esc([x.org.data.country,!x.p?'No profile yet':'',st.invTab==='proposed'&&x.p&&x.p.source?'Source: '+x.p.source+(x.p.source_date?' ('+dateLabel(validDate(x.p.source_date))+')':''):''].filter(Boolean).join(' · '))+'</span>'},
  {label:'Type',render:x=>pcell(x,'investor_type','Type')},{label:'Tier',render:x=>pcell(x,'tier','Tier')},
  {label:'Fit',render:x=>'<span class="k-small">'+esc(x.p?[x.p.modalities,x.p.therapeutic_areas,x.p.dev_stages].filter(Boolean).join(' · ')||'—':'—')+'</span>'},
  {label:'Cheque range',render:x=>esc(x.p&&(num(x.p.check_min)!==null||num(x.p.check_max)!==null)?money(num(x.p.check_min),x.p.currency)+' – '+money(num(x.p.check_max),''):'—')},
  {label:'Leads',render:x=>pcell(x,'leads_rounds','Leads rounds')},{label:'Intro path',render:x=>pcell(x,'intro_path','Intro path')},
  {label:'This round',render:x=>{const o=OPPS.find(op=>op.organization_id===x.org.id&&op.round_id===st.round);return o?pill(STAGE_LABEL[o.stage]||o.stage,o.stage==='passed'?'':'blue'):'—';}},
  {label:'Actions',render:x=>{const id=x.org.id,pr=x.p,name=String(x.org.data.name||'investor');
   if(st.invTab!=='targets')return '<div class="k-row">'+small('Accept','decide:'+pr.id+'~'+pr.version+':accepted',{label:'Accept '+name,disabled:!decide})+(st.invTab==='proposed'?small('Reject','decide:'+pr.id+'~'+pr.version+':rejected',{label:'Reject '+name,disabled:!decide}):'')+small('History','details:investor:'+id,{label:'History of '+name})+'</div>';
   const inRound=OPPS.some(op=>op.organization_id===id&&op.round_id===st.round);
   return '<div class="k-row">'+small('History','details:investor:'+id,{label:'History of '+name})+(!pr&&canWrite('profiles')?small('Add profile','add:profiles:'+id,{label:'Add profile for '+name}):'')+(!inRound&&ROUND[st.round]&&canWrite('opps')?small('Add to round','add:opps:'+id,{label:'Add '+name+' to the round'}):'')+'</div>';}}];
 body+=kit.table({columns,rows:pg.slice,empty:kit.empty({title:st.invTab==='targets'?'No investors match':st.invTab==='proposed'?'No investors waiting for a decision':'No rejected investors',text:st.invTab==='targets'?'Change the search or filters, or add an investor.':'Researched investors appear here until you accept or reject them.',action:st.invTab==='targets'&&canWrite('orgs')?{label:'Add investor',action:'add:orgs'}:Object.values(st.filters).some(Boolean)||st.query?{label:'Clear filters',action:'filters:clear'}:null})})+pg.pager;
 if(st.invTab==='proposed')body+=researchRuns();
 return body;}
function researchRuns(){const r=R.reports;if(r.unbound||r.pending)return '';
 const list=r.rows.map(x=>({...x.data,run_on:validDate(x.data.run_on)})).filter(x=>x.run_on).sort((a,b)=>b.run_on.localeCompare(a.run_on));
 return card('Research runs','One report per weekly research run. Change or pause it in Automations.',r.unavailable?'<p class="k-muted">You cannot read research reports.</p>':list.length?'<ul class="fr-list">'+list.slice(0,6).map(x=>'<li><span><strong>'+esc(dateLabel(x.run_on)+(x.period?' · '+x.period:''))+'</strong><span class="fr-sub k-small k-muted">'+esc(plural(Math.max(0,Math.round(num(x.new_investors,0))),'new investor')+' proposed'+(x.written_by?' · by '+cap(x.written_by):''))+'</span>'+(x.summary?'<span class="fr-sub k-small">'+esc(String(x.summary).split('\n').slice(0,3).join(' · ').slice(0,300))+'</span>':'')+'</span></li>').join('')+'</ul>':'<p class="k-muted">No research report yet.</p>','<a class="k-button fr-small" href="platform:automations">Automations</a>');}

/* ---------- Round ---------- */
function round(){
 const rd=ROUND[st.round];const add=canWrite('rounds')?btn('New round','add:rounds'):'';
 if(!rd)return toolbar()+partial()+noRound();
 let body=toolbar(add)+partial();
 const t=roundTotals(rd),lead=leadOf(rd);
 body+=card('Round','Type, target, currency and dates. Change a value where it is shown.','<div class="fr-kvs">'+['name','round_type','status','target_amount','currency','opened_on','target_close','closed_on'].map(k=>fieldRow('rounds',rd,k)).join('')+kvText('Lead investor',rd.lead_org_id?orgName(rd.lead_org_id):lead?orgName(lead.organization_id):'Not yet chosen')+'</div>'+(canWrite('rounds')&&!t.opps.length?'<div class="k-row">'+small('Remove round','archive:rounds:'+rd.id+'~'+rd.version)+'</div>':''));
 const synd=t.opps.filter(o=>['signed','verbal'].includes(o.interest)).sort((a,b)=>(a.interest==='signed'?0:1)-(b.interest==='signed'?0:1)||(amountOf(b)||0)-(amountOf(a)||0));const base=t.target||t.raised;
 body+=card('Syndicate','Signed and verbal commitments; % of '+(t.target?'the round target':'the signed total')+'. Only signed counts as raised.',synd.length?kit.table({columns:[
  {label:'Investor',render:o=>'<strong>'+esc(orgName(o.organization_id))+'</strong>'+(bool(o.is_lead)?' '+pill('Lead','lead'):'')},
  {label:'Interest',render:o=>cell('opps',o,'interest','Interest of '+orgName(o.organization_id))},
  {label:'Amount',render:o=>esc(exactMoney(amountOf(o),o.currency))+(o.currency!==rd.currency?' '+pill('Other currency: excluded','amber'):'')},
  {label:'% of round',render:o=>{const a=amountOf(o);return esc(o.currency===rd.currency&&a!==null&&base?pct(a,base)+'%':'—');}},
  {label:'Actions',render:o=>'<div class="k-row">'+small('Details','details:opp:'+o.id,{label:'Details for '+orgName(o.organization_id)})+(bool(o.is_lead)||!writableField('opps','is_lead')?'':small('Mark lead','lead:'+o.id+'~'+o.version,{label:'Mark '+orgName(o.organization_id)+' as lead'}))+'</div>'}],rows:synd})+'<p class="fr-total">Raised (signed) <strong>'+esc(exact?exactMoney(t.raised,rd.currency):'—')+'</strong>'+(exact&&t.target?' · '+pct(t.raised,t.target)+'% of target':'')+'</p>':'<p class="k-muted">No verbal or signed commitments yet. Set an investor\'s interest on the Pipeline.</p>');
 body+=currencyNotes(t,rd);
 const offers=t.opps.filter(o=>num(o.offer_amount)!==null||o.offer_received_on);const sel=(st.cmp||defaultCompare()).filter(id=>offers.some(o=>o.id===id));const cmp=sel.map(id=>OPP[id]);
 const line=(lbl,fn)=>'<tr><th scope="row">'+esc(lbl)+'</th>'+cmp.map(o=>'<td>'+fn(o)+'</td>').join('')+'</tr>';
 body+=card('Offer comparison','Choose up to three offers. Light term-sheet fields only; legal terms stay in the documents.',offers.length?'<div class="k-row fr-checks">'+offers.map(o=>'<label class="fr-check"><input type="checkbox"'+kit.attr('data-action','cmp:'+o.id)+kit.attr('checked',sel.includes(o.id))+'> '+esc(orgName(o.organization_id))+'</label>').join('')+'</div>'+(cmp.length?'<div class="k-table-wrap fr-compare"><table class="fr-cmp"><thead><tr><th scope="col">Term</th>'+cmp.map(o=>'<th scope="col">'+esc(orgName(o.organization_id))+'</th>').join('')+'</tr></thead><tbody>'+
  line('Amount',o=>esc(exactMoney(num(o.offer_amount),o.currency)))+line('Pre-money',o=>esc(exactMoney(num(o.offer_pre_money),o.currency)))+line('Post-money',o=>esc(num(o.offer_amount)!==null&&num(o.offer_pre_money)!==null?exactMoney(num(o.offer_amount)+num(o.offer_pre_money),o.currency):'—'))+line('Instrument',o=>esc(cap(o.offer_instrument||'—')))+line('Board seat',o=>esc(o.offer_board_seat===undefined||o.offer_board_seat===null?'—':bool(o.offer_board_seat)?'Yes':'No'))+line('Expires',o=>esc(dateLabel(o.offer_expires_on))+(o.offer_expires_on&&AS_OF&&o.offer_expires_on<AS_OF?' '+pill('Expired','red'):''))+line('Status',o=>o.offer_status?pill(cap(o.offer_status),o.offer_status==='accepted'?'green':o.offer_status==='declined'||o.offer_status==='expired'?'':'blue'):'—')+line('Lead',o=>bool(o.is_lead)?pill('Lead','lead'):writableField('opps','is_lead')?small('Mark lead','lead:'+o.id+'~'+o.version,{label:'Mark '+orgName(o.organization_id)+' as lead'}):'—')+
  '</tbody></table></div>':'<p class="k-muted">Choose offers to compare.</p>'):'<p class="k-muted">No offers recorded in this round yet. Record an offer in the investor\'s details (Offer).</p>');
 const tr=TRANCHES.filter(x=>x.round_id===rd.id).sort((a,b)=>a.tranche_no-b.tranche_no);const trTotal=tr.filter(x=>x.currency===rd.currency).reduce((n,x)=>n+num(x.amount,0),0);
 const addT=canWrite('tranches')?small('Add tranche','add:tranches'):'';
 body+=card('Tranches','Conditions and milestones for each tranche. Runway and Investor Updates read them.',tr.length?kit.table({columns:[
  {label:'No.',render:x=>cell('tranches',x,'tranche_no','Tranche number')},{label:'Amount',render:x=>cell('tranches',x,'amount','Amount of tranche '+x.tranche_no)+(x.currency!==rd.currency?' '+pill('Other currency','amber'):'')},
  {label:'Condition',render:x=>cell('tranches',x,'condition','Condition of tranche '+x.tranche_no)},{label:'Milestone',render:x=>cell('tranches',x,'milestone_id','Milestone of tranche '+x.tranche_no)},
  {label:'Expected',render:x=>cell('tranches',x,'expected_on','Expected date of tranche '+x.tranche_no)},{label:'Status',render:x=>cell('tranches',x,'status','Status of tranche '+x.tranche_no)},
  {label:'On track',render:x=>{const k=trancheTrack(x);return pill(k.text,k.tone);}},
  {label:'',render:x=>canWrite('tranches')?small('Remove','archive:tranches:'+x.id+'~'+x.version,{label:'Remove tranche '+x.tranche_no}):''}],rows:tr})+'<p class="fr-total">Total <strong>'+esc(exactMoney(trTotal,rd.currency))+'</strong>'+(t.target?' · '+pct(trTotal,t.target)+'% of target':'')+'</p>':kit.empty({title:'No tranches yet',text:'Add them when the lead proposes milestone-based tranches.',action:canWrite('tranches')?{label:'Add tranche',action:'add:tranches'}:null}),tr.length?addT:'');
 body+=milestones();
 return body;}
function milestones(){const own=!linked('miles'),list=MILES.slice().sort((a,b)=>(bool(b.is_key)?1:0)-(bool(a.is_key)?1:0)||String(a.end_date).localeCompare(String(b.end_date)));
 const add=own&&canWrite('miles')?small('Add milestone','add:miles'):'';
 let inner=R.miles.unbound?'<p class="k-muted">No milestones table is connected, so tranches show "No milestone".</p>':R.miles.unavailable?'<p class="k-muted">You cannot read milestones.</p>':
  list.length?kit.table({columns:[{label:'Milestone',render:m=>cell('miles',m,'name','Milestone name')+(bool(m.is_key)?' '+pill('Key','teal'):'')},{label:'Program',render:m=>cell('miles',m,'program_id','Program of '+String(m.name||'milestone'))},{label:'Date',render:m=>cell('miles',m,'end_date','Date of '+String(m.name||'milestone'))},{label:'Status',render:m=>cell('miles',m,'status','Status of '+String(m.name||'milestone'))},{label:'',render:m=>own&&canWrite('miles')?small('Remove','archive:miles:'+m.id+'~'+m.version,{label:'Remove '+String(m.name||'milestone')}):''}],rows:list.slice(0,30)})
  :own?kit.empty({title:'No milestones yet',text:'Add the program milestones your tranches depend on.',action:canWrite('miles')?{label:'Add milestone',action:'add:miles'}:null}):'<p class="k-muted">No milestones in Programs yet.</p>';
 return card('Milestones for tranche conditions',own?'Your own milestone entries':'From Programs, read-only here',inner+integrationLine('miles'),list.length?add:'');}

/* ---------- Activity (business records, D42) ---------- */
function activity(){
 const rd=ROUND[st.round];const f=st.filters,q=st.query.toLowerCase().trim();
 const add=canWrite('acts')&&OPPS.length?btn('Log activity','add:acts',{primary:true}):'';
 let body=toolbar(add)+partial();
 let rows=rd&&f.scope!=='all'?ACTS.filter(a=>{const o=OPP[a.opportunity_id];return !!o&&o.round_id===rd.id;}):ACTS.slice();
 if(q)rows=rows.filter(a=>[a.summary,a.outcome,orgName((OPP[a.opportunity_id]||{}).organization_id)].some(v=>String(v||'').toLowerCase().includes(q)));
 if(f.kind)rows=rows.filter(a=>a.kind===f.kind);
 rows=rows.sort((a,b)=>String(b.activity_on).localeCompare(String(a.activity_on)));
 if(!ACTS.length)body+=kit.empty({title:'No activities logged yet',text:'Log emails, calls, meetings and intros with your investors, with a follow-up date.',action:canWrite('acts')?(OPPS.length?{label:'Log activity',action:'add:acts'}:{label:'Add investor to round',action:ROUNDS.length?'add:opps':'add:rounds'}):null});
 else{
  body+=filterBar([{key:'kind',label:'Kind',options:opt(ACT_KINDS)},{key:'scope',label:'Rounds',options:[['all','All rounds']]}]);
  const pg=pageOf(rows);
  body+=card('Activity log',rd&&f.scope!=='all'?'Activities in '+String(rd.name||'this round'):'Activities across all rounds',kit.table({columns:[
   {label:'Date',render:a=>cell('acts',a,'activity_on','Date')},
   {label:'Investor',render:a=>{const o=OPP[a.opportunity_id];return '<strong>'+esc(o?orgName(o.organization_id):'Opportunity unavailable')+'</strong>'+(a.contact_id?'<span class="fr-sub k-small k-muted">'+esc(personName(a.contact_id))+'</span>':'');}},
   {label:'Kind',render:a=>cell('acts',a,'kind','Kind')+(a.source==='assistant'?' '+pill('Assistant','teal'):'')},
   {label:'Summary',render:a=>cell('acts',a,'summary','Summary')},{label:'Outcome',render:a=>cell('acts',a,'outcome','Outcome')},
   {label:'Follow-up',render:a=>cell('acts',a,'follow_up_due','Follow-up due')+(a.follow_up_due&&!openFollowUp(a)?' '+pill('Done','green'):'')},
   {label:'',render:a=>canWrite('acts')?small('Remove','archive:acts:'+a.id+'~'+a.version,{label:'Remove activity of '+dateLabel(a.activity_on)}):''}],
   rows:pg.slice,empty:kit.empty({title:'No activities match',text:'Change the search or filters.',action:{label:'Clear filters',action:'filters:clear'}})})+pg.pager);}
 const due=rd?staleAndDue(rd,true).filter(x=>x.kind!=='stale'):[];
 const pp=passPatterns(rd&&rd.id),pa=passPatterns(null);
 const patternText=pt=>pt.total?pt.counts.map(([k,n])=>n+' of '+pt.total+' passes: '+label(k)).join('; '):'No passes recorded.';
 body+='<div class="k-grid fr-two">'+card('Follow-ups due','Next steps and activity follow-ups due by '+dateLabel(addDays(AS_OF,6))+', overdue first',dueList(due,40)||'<p class="k-muted">No follow-ups due.</p>')+
  card('Pass reasons','What to fix before the next wave','<h3 class="fr-h3">This round</h3><p>'+esc(patternText(pp))+'</p><h3 class="fr-h3">All rounds</h3><p>'+esc(patternText(pa))+'</p>'+(pp.total?'<ul class="fr-list">'+OPPS.filter(o=>o.stage==='passed'&&rd&&o.round_id===rd.id).slice(0,10).map(o=>'<li><span><strong>'+esc(orgName(o.organization_id))+'</strong><span class="fr-sub k-small k-muted">'+esc(label(o.pass_reason||'unspecified')+(o.pass_detail?': '+o.pass_detail:''))+'</span></span></li>').join('')+'</ul>':''))+'</div>';
 return body;}

/* ---------- Engagement (data-room access and views, D42) ---------- */
function engagement(){
 const own=!ROOM_LINKED;let body=toolbar()+partial();
 if(ROOM_STATE==='restricted')return body+card(ROOM_LINKED?'Data Room data is unavailable':'Restricted',null,'<p class="k-muted">'+(ROOM_LINKED?'The linked Data Room tables cannot be read, so engagement is not shown. Your earlier own entries stay in Database.':'You cannot read the data-room tables, so engagement is not shown.')+'</p>');
 const gp=GRANTS.slice().sort((a,b)=>orgName(a.organization_id).localeCompare(orgName(b.organization_id)));
 const addG=own&&canWrite('grants')?small('Record access','add:grants'):'';
 body+=card('Access by investor',own?'Your own entries, typed in or from DocSend or ShareVault reports':'From the linked Data Room, read-only. Give or revoke access in the Data Room app.',
  (R.grants.unbound?'<p class="k-muted">No data-room access table is connected.</p>':gp.length?kit.table({columns:[
   {label:'Investor',render:g=>'<strong>'+esc(orgName(g.organization_id))+'</strong>'},{label:'Person',render:g=>esc(personName(g.person_id))},
   {label:'Room',render:g=>cell('grants',g,'room_name','Room of '+orgName(g.organization_id))},{label:'Status',render:g=>cell('grants',g,'status','Access status of '+orgName(g.organization_id))},
   {label:'Granted',render:g=>cell('grants',g,'granted_on','Granted on')},{label:'Expires',render:g=>cell('grants',g,'expires_on','Expires on')},
   {label:'Agreement',render:g=>esc(validDate(g.agreement_accepted_on)?'Accepted '+dateLabel(validDate(g.agreement_accepted_on)):'—')},
   {label:'',render:g=>own&&canWrite('grants')?small('Remove','archive:grants:'+g.id+'~'+g.version,{label:'Remove access of '+orgName(g.organization_id)}):''}],rows:gp})
   :kit.empty({title:'No data-room access recorded yet',text:own?'Record who has access to your data room, or link a Data Room app.':'No access in the linked Data Room yet.',action:own&&canWrite('grants')?{label:'Record access',action:'add:grants'}:null}))+roomLine(),gp.length?addG:'');
 const vs=VIEWS.slice().sort((a,b)=>String(b.last_viewed_on||'').localeCompare(String(a.last_viewed_on||'')));const pg=pageOf(vs);
 const addV=own&&canWrite('views')?small('Record views','add:views'):'';
 body+=card('Views by investor and document','First and last view, view count and time where available',R.views.unbound?'<p class="k-muted">No data-room views table is connected.</p>':vs.length?kit.table({columns:[
   {label:'Investor',render:v=>'<strong>'+esc(orgName(v.organization_id))+'</strong>'+(v.person_id?'<span class="fr-sub k-small k-muted">'+esc(personName(v.person_id))+'</span>':'')},
   {label:'Document',render:v=>cell('views',v,'document_title','Document')},{label:'First view',render:v=>esc(dateLabel(v.first_viewed_on))},{label:'Last view',render:v=>cell('views',v,'last_viewed_on','Last view')},
   {label:'Views',render:v=>cell('views',v,'view_count','Views')},{label:'Time',render:v=>esc(num(v.seconds_viewed)!==null?Math.round(num(v.seconds_viewed)/60)+' min':'—')},{label:'Source',render:v=>esc(cap(v.source||'—'))},
   {label:'',render:v=>own&&canWrite('views')?small('Remove','archive:views:'+v.id+'~'+v.version,{label:'Remove views of '+orgName(v.organization_id)}):''}],rows:pg.slice})+pg.pager
  :kit.empty({title:'No views recorded yet',text:own?'Record document views from your data-room reports.':'No views in the linked Data Room yet.',action:own&&canWrite('views')?{label:'Record views',action:'add:views'}:null}),vs.length?addV:'');
 body+=card('Signals','Hot: 3 or more views in the last 7 days. Never opened: active access without views. Re-opened: a view after 14 days or more without one.',(SIGNALS.length?'<ul class="fr-list">'+SIGNALS.map(s=>{const o=OPPS.find(x=>x.organization_id===s.org&&x.round_id===st.round);return '<li><span>'+pill(s.kind==='hot'?'Hot':s.kind==='reopened'?'Re-opened':'Never opened',s.kind==='never'?'amber':'green')+' <strong>'+esc(orgName(s.org))+'</strong><span class="fr-sub k-small k-muted">'+esc(s.text)+'</span></span>'+(o&&canWrite('acts')?small('Log follow-up','add:acts:'+o.id,{label:'Log follow-up with '+orgName(s.org)}):'')+'</li>';}).join('')+'</ul>':'<p class="k-muted">No signals yet.</p>')+
  '<h3 class="fr-h3">Diligence depth</h3>'+(ENG_ORGS.length?'<ul class="fr-list">'+ENG_ORGS.map(o=>{const d=signalsFor(o).find(s=>s.kind==='depth');return '<li><span>'+esc(orgName(o))+'</span><span class="k-muted">'+esc(d?d.text:'No documents viewed')+'</span></li>';}).join('')+'</ul>':'<p class="k-muted">No access or views yet.</p>'));
 return body;}

/* ---------- Settings: business choices, for the app's owners only ---------- */
function settingsScreen(){
 if(!canWrite('settings'))return card('Settings',null,'<p class="k-muted">You cannot change the Fundraise settings table.</p>');
 const s=settingsRow;
 return card('Settings','Stages and pass reasons are ordered lists of the standard keys, separated by commas. Fit lists fill the investor filters.',kit.settings({action:s?'settings:save:'+s.version:'settings:create',fields:[
  {name:'default_currency',label:'Default currency for new rounds',value:DEFAULT_CURRENCY,options:CURRENCIES},
  {name:'stale_days',label:'Stale after (days without activity, 1–180)',value:String(STALE_DAYS)},
  {name:'stages',label:'Stages, in order ('+STAGES.join(', ')+')',value:STAGE_ORDER.join(', ')},
  {name:'pass_reasons',label:'Pass reasons ('+PASS_REASONS.join(', ')+')',value:PASS_ORDER.join(', ')},
  {name:'modalities',label:'Modalities',value:VOCAB.modalities.join(', ')},
  {name:'therapeutic_areas',label:'Therapeutic areas',value:VOCAB.therapeutic_areas.join(', ')},
  {name:'dev_stages',label:'Development stages',value:VOCAB.dev_stages.join(', ')}]},inp));}

/* ---------- side panels ---------- */
function formControl(role,f,draft){const v=draft[f.key]??'',id='fr-f-'+f.key,common=kit.attr('id',id)+kit.attr('name',f.key)+(f.required?' required':'');
 if(f.kind==='select'||f.kind==='ref')return selectHtml(common,String(v),choices(f,String(v),draft),f.required?'Choose…':'None');
 if(f.kind==='boolean')return selectHtml(common,bool(v)?'true':'false',[['false','No'],['true','Yes']],false);
 if(f.kind==='longtext')return '<textarea'+common+' rows="3">'+esc(v)+'</textarea>';
 const type=f.kind==='date'?'date':f.kind==='number'||f.kind==='money'?'number':'text';
 return '<input type="'+type+'"'+common+(type==='number'?' step="any"':'')+kit.attr('value',f.kind==='date'?validDate(v)||String(v||''):v)+'>';}
function createPanel(p){const role=p.role,fields=formFields(role);if(PANEL_NEEDS.create.some(r=>R[r].pending))return kit.panel({title:'Add '+ROLE_LABEL[role],body:loadingHtml});
 let rows='',group='';for(const f of fields){if(f.g&&f.g!==group&&fields.some(x=>x.g!==fields[0].g)){group=f.g;rows+='<h3 class="fr-h3">'+esc(group)+'</h3>';}rows+='<label class="k-field" for="fr-f-'+f.key+'"><span>'+esc(f.label)+(f.required?' *':'')+'</span>'+formControl(role,f,p.draft)+'</label>';}
 const hint=role==='acts'?'Saving also moves the investor\'s last activity date forward.':role==='orgs'?'Adds the investor to your shared organizations. Add its profile next.':role==='opps'?'Only accepted investors can join a round. Only signed commitments count as raised.':'';
 return kit.panel({title:'Add '+ROLE_LABEL[role],close:'panel:close',body:(hint?'<p class="k-muted k-small">'+esc(hint)+'</p>':'')+'<form'+kit.attr('data-action','create:'+role)+'>'+rows+'<div class="k-row">'+btn('Cancel','panel:close')+'<button type="submit" class="k-button k-button--primary">Add</button></div></form>'});}
function passPanel(p){const o=OPP[p.id];if(!o)return '';
 return kit.panel({title:'Why did '+orgName(o.organization_id)+' pass?',close:'panel:close',body:'<form data-action="pass:submit"><label class="k-field" for="fr-pass-reason"><span>Pass reason *</span>'+selectHtml(' id="fr-pass-reason" name="pass_reason" required',o.pass_reason||'',PASS_ORDER.map(x=>[x,cap(x)]),'Choose…')+'</label><label class="k-field" for="fr-pass-detail"><span>Detail</span><input id="fr-pass-detail" name="pass_detail"'+kit.attr('value',o.pass_detail||'')+'></label><div class="k-row">'+btn('Cancel','panel:close')+'<button type="submit" class="k-button k-button--primary">Move to '+esc(STAGE_LABEL.passed)+'</button></div></form>'});}
const listItems=(items,empty)=>items.length?'<ul class="fr-list">'+items.join('')+'</ul>':'<p class="k-muted">'+esc(empty)+'</p>';
function cfRows(role,rec){return CFS.filter(c=>c.role===role&&cfBound(c)).map(c=>fieldRow(role,rec,c.key)).join('');}
function oppPanel(o){const loadingP=PANEL_NEEDS.opp.some(r=>R[r].pending);
 const title=orgName(o.organization_id);if(loadingP)return kit.panel({title,body:loadingHtml});
 const groups={};for(const f of S.opps.filter(f=>f.key!=='archived'&&f.key!=='round_id'&&f.key!=='organization_id'&&!f.custom))(groups[f.g]=groups[f.g]||[]).push(f.key);
 const acts=ACTS.filter(a=>a.opportunity_id===o.id).sort((a,b)=>String(b.activity_on).localeCompare(String(a.activity_on)));const ppl=PEOPLE.filter(p=>p.organization_id===o.organization_id);
 const gs=GRANTS.filter(g=>g.organization_id===o.organization_id),vs=VIEWS.filter(v=>v.organization_id===o.organization_id),sig=signalsFor(o.organization_id);
 const dd=o.stage==='due_diligence'&&!gs.length&&ROOM_STATE==='ok'?'<p class="fr-note">In due diligence without data-room access. '+(ROOM_LINKED?'Give access in the Data Room app.':canWrite('grants')?small('Record access','add:grants:'+o.organization_id):'')+'</p>':'';
 let body='<p class="k-muted k-small">'+esc(roundName(o.round_id))+(bool(o.is_lead)?' · Lead investor':'')+'</p>'+dd;
 for(const [g,keys] of Object.entries(groups))body+='<h3 class="fr-h3">'+esc(g)+'</h3><div class="fr-kvs">'+keys.map(k=>k==='is_lead'?kvText('Lead investor',bool(o.is_lead)?'Yes':'No'):k==='last_activity_on'?kvText('Last activity',dateLabel(o.last_activity_on)):fieldRow('opps',o,k)).join('')+'</div>';
 const cf=cfRows('opps',o);if(cf)body+='<h3 class="fr-h3">Custom fields</h3><div class="fr-kvs">'+cf+'</div>';
 body+='<h3 class="fr-h3">Contacts</h3>'+listItems(ppl.map(p=>'<li><span>'+esc(p.name||'')+(p.id===o.primary_contact_id?' '+pill('Primary','teal'):'')+'<span class="fr-sub k-small k-muted">'+esc([p.title,p.email].filter(Boolean).join(' · '))+'</span></span></li>'),'No contacts yet.')+(canWrite('people')?small('Add contact','add:people:'+o.organization_id):'');
 body+='<h3 class="fr-h3">Activity</h3>'+listItems(acts.slice(0,8).map(a=>'<li><span><strong>'+esc(cap(a.kind))+'</strong> · '+esc(dateLabel(a.activity_on))+'<span class="fr-sub k-small k-muted">'+esc(String(a.summary||'').slice(0,140)+(a.outcome?' → '+a.outcome:''))+'</span></span></li>'),'No activity yet.')+(canWrite('acts')?small('Log activity','add:acts:'+o.id):'');
 body+='<h3 class="fr-h3">Data room</h3>'+(ROOM_STATE==='restricted'?'<p class="k-muted">Restricted.</p>':(gs.length?gs.map(g=>kvText('Access',cap(g.status||'—')+(g.room_name?' · '+g.room_name:''))).join(''):'<p class="k-muted">No access recorded.</p>')+(vs.length?kvText('Views',String(vs.reduce((n,v)=>n+v.view_count,0))+' across '+plural(new Set(vs.map(v=>v.document_ref||v.document_title)).size,'document')):'')+sig.filter(s=>s.kind!=='depth').map(s=>'<p class="k-small">'+esc(s.text)+'</p>').join(''));
 body+='<div class="k-row fr-panel-actions">'+(bool(o.is_lead)||!writableField('opps','is_lead')?'':btn('Mark lead','lead:'+o.id+'~'+o.version))+(canWrite('opps')?btn('Remove from round','archive:opps:'+o.id+'~'+o.version):'')+'</div>';
 return kit.panel({title,close:'panel:close',body});}
function investorPanel(id){const o=lookup('orgs',id);if(!o)return '';const name=String(o.data.name||'Investor');if(R.people.pending)return kit.panel({title:name,body:loadingHtml});
 const pr=PROFILE[id],org={id:o.id,version:o.version,...o.data},ops=OPPS.filter(x=>x.organization_id===id),ppl=PEOPLE.filter(p=>p.organization_id===id);
 let body='<div class="fr-kvs">'+['name','country','website'].map(k=>fieldRow('orgs',org,k)).join('')+cfRows('orgs',org)+'</div>';
 body+='<h3 class="fr-h3">Profile</h3>'+(pr?'<div class="fr-kvs">'+kvText('Status',cap(pr.profile_status))+['investor_type','tier','leads_rounds','check_min','check_max','currency','fund_vintage_year','modalities','therapeutic_areas','dev_stages','intro_path','notes'].map(k=>fieldRow('profiles',pr,k)).join('')+(pr.source?kvText('Source',pr.source+(pr.source_date?' ('+dateLabel(validDate(pr.source_date))+')':'')):'')+cfRows('profiles',pr)+'</div>':'<p class="k-muted">No investor profile yet.</p>'+(canWrite('profiles')?small('Add profile','add:profiles:'+id):''));
 body+='<h3 class="fr-h3">Rounds</h3>'+listItems(ops.map(x=>'<li><span><strong>'+esc(roundName(x.round_id))+'</strong><span class="fr-sub k-small k-muted">'+esc(STAGE_LABEL[x.stage]+' · '+cap(x.interest)+(x.stage==='passed'?' · '+label(x.pass_reason||'unspecified'):''))+'</span></span><span>'+esc(exactMoney(amountOf(x),x.currency))+'</span></li>'),'Not in any round yet.');
 body+='<h3 class="fr-h3">Contacts</h3>'+listItems(ppl.map(p=>'<li><span>'+esc(p.name||'')+'<span class="fr-sub k-small k-muted">'+esc([p.title,p.email].filter(Boolean).join(' · '))+'</span></span></li>'),'No contacts yet.')+(canWrite('people')?small('Add contact','add:people:'+id):'');
 return kit.panel({title:name,close:'panel:close',body});}
function panelHtml(){const p=st.panel;if(!p)return '';
 if(p.kind==='create')return S[p.role]?createPanel(p):'';
 if(p.kind==='pass')return passPanel(p);
 if(p.kind==='opp'){const o=OPP[p.id];return o?oppPanel(o):'';}
 if(p.kind==='investor')return investorPanel(p.id);
 return '';}

/* ---------- page ---------- */
const SCREEN={overview,pipeline,investors,round,activity,engagement,settings:settingsScreen};
let main='';
if(PENDING)main=toolbar()+loadingHtml;
else{try{main=SCREEN[st.screen]();}catch(e){main=toolbar();say('error','This screen could not be shown: '+String(e&&e.message||e).slice(0,200));}}
const wide=!inp.viewport||inp.viewport.width==='wide';
const nav=kit.nav(shown,st.screen,{label:'Fundraise screens',side:wide});
// The side panel is modal: the screen behind it is inert for keyboard and assistive technology until it closes.
const panel=panelHtml();
const html=kit.page((panel?'<div inert>':'<div>')+kit.layout(nav,'<div class="fr-screen">'+main+'</div>',{side:wide})+'</div>'+panel);
const css=typeof FUNDRAISE_CSS==='string'?FUNDRAISE_CSS:'';
st.panel=st.panel||null;
return {html,css,state:st,context:st.round?{round:st.round}:null,...(notice?{notice}:{})};
