const templateLayoutSchema={"screens":[{"id":"overview","label":"Overview"},{"id":"pipeline","label":"Pipeline"},{"id":"investors","label":"Investors"},{"id":"round","label":"Round"},{"id":"activity","label":"Activity"},{"id":"engagement","label":"Engagement"},{"id":"settings","label":"Settings"}],"groups":{"investors":[{"id":"name","label":"Investor"},{"id":"investor_type","label":"Type"},{"id":"tier","label":"Tier"},{"id":"fit","label":"Fit"},{"id":"cheque","label":"Cheque range"},{"id":"leads_rounds","label":"Leads"},{"id":"fund_vintage_year","label":"Vintage"},{"id":"intro_path","label":"Intro path"},{"id":"in_round","label":"This round"}],"activity":[{"id":"activity_on","label":"Date"},{"id":"investor","label":"Investor"},{"id":"kind","label":"Kind"},{"id":"summary","label":"Summary"},{"id":"outcome","label":"Outcome"},{"id":"follow_up_due","label":"Follow-up"}]}};
/* TrialAgents Fundraise 2.0.0 (life.investor-crm) | frontend-js function body. No DOM, network or browser storage.
 * Returns {html,css,state}. Data comes only from authorized bindings; every write is an exact records.propose reviewed by TrialAgents.
 * Only signed commitments count as raised. Amounts in another currency than the round are flagged and excluded, never converted.
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
const dateLabel=d=>d?Number(d.slice(8,10))+' '+MONTHS[Number(d.slice(5,7))-1]+' '+d.slice(0,4):'—';
const plural=(n,w)=>n+' '+w+(Math.abs(n)===1?'':'s');
const label=v=>String(v===null||v===undefined||v===''?'—':v).replace(/_/g,' ');
const cap=s=>{s=label(s);return s.charAt(0).toUpperCase()+s.slice(1);};
const listOf=v=>String(v||'').split(',').map(x=>x.trim()).filter(Boolean);
const pct=(a,b)=>b?Math.round(a/b*1000)/10:null;

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
const ROOM_PURPOSE=['financing','licensing','m_and_a','other'];
const VIEW_SOURCES=['manual','docsend','sharevault','tracked'];
const MILE_STATUS=['planned','in_progress','done','at_risk','cancelled'];
const ORG_TYPES=['company','investor','cro','cdmo','site','funder','partner','agency','other'];

/* ---------- logical schema (real keys come from tableMap) ---------- */
const ref=role=>({kind:'ref',ref:role});
const S={
 orgs:[{key:'name',label:'Name',kind:'text',required:true},{key:'org_type',label:'Type',kind:'select',options:ORG_TYPES},{key:'country',label:'Country',kind:'text'},{key:'website',label:'Website',kind:'text'},{key:'archived',label:'Archived',kind:'boolean'}],
 people:[{key:'name',label:'Name',kind:'text',required:true},{key:'organization_id',label:'Organization',...ref('orgs')},{key:'title',label:'Title',kind:'text'},{key:'email',label:'Email',kind:'text'},{key:'archived',label:'Archived',kind:'boolean'}],
 settings:[{key:'default_currency',label:'Default currency',kind:'select',options:CURRENCIES},{key:'stale_days',label:'Stale after (days)',kind:'number'},{key:'stages',label:'Stages (comma list, in order)',kind:'text'},{key:'pass_reasons',label:'Pass reasons (comma list)',kind:'text'},{key:'modalities',label:'Modalities (comma list)',kind:'text'},{key:'therapeutic_areas',label:'Therapeutic areas (comma list)',kind:'text'},{key:'dev_stages',label:'Development stages (comma list)',kind:'text'}],
 profiles:[{key:'organization_id',label:'Investor organization',...ref('orgs'),required:true},{key:'investor_type',label:'Investor type',kind:'select',options:INVESTOR_TYPES,required:true},{key:'tier',label:'Tier',kind:'select',options:TIERS},{key:'profile_status',label:'Profile status',kind:'select',options:PROFILE_STATUS,required:true},{key:'modalities',label:'Modalities',kind:'text'},{key:'therapeutic_areas',label:'Therapeutic areas',kind:'text'},{key:'dev_stages',label:'Development stages',kind:'text'},{key:'check_min',label:'Cheque min',kind:'money'},{key:'check_max',label:'Cheque max',kind:'money'},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES},{key:'leads_rounds',label:'Leads rounds',kind:'select',options:['yes','no','sometimes']},{key:'fund_vintage_year',label:'Fund vintage year',kind:'number'},{key:'intro_path',label:'Intro path',kind:'text'},{key:'source',label:'Source',kind:'text'},{key:'source_date',label:'Source date',kind:'date'},{key:'notes',label:'Notes',kind:'longtext'},{key:'archived',label:'Archived',kind:'boolean'}],
 rounds:[{key:'name',label:'Name',kind:'text',required:true},{key:'round_type',label:'Round type',kind:'select',options:ROUND_TYPES,required:true},{key:'target_amount',label:'Target',kind:'money'},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES,required:true},{key:'status',label:'Status',kind:'select',options:ROUND_STATUS,required:true},{key:'opened_on',label:'Opened on',kind:'date'},{key:'target_close',label:'Target close',kind:'date'},{key:'closed_on',label:'Closed on',kind:'date'},{key:'lead_org_id',label:'Lead investor',...ref('orgs')},{key:'notes',label:'Notes',kind:'longtext'},{key:'archived',label:'Archived',kind:'boolean'}],
 opps:[{key:'round_id',label:'Round',...ref('rounds'),required:true,g:'Opportunity'},{key:'organization_id',label:'Investor',...ref('orgs'),required:true,g:'Opportunity'},{key:'primary_contact_id',label:'Primary contact',...ref('people'),g:'Opportunity'},{key:'stage',label:'Stage',kind:'select',options:STAGES,required:true,g:'Opportunity'},{key:'interest',label:'Interest',kind:'select',options:INTEREST,required:true,g:'Opportunity'},{key:'amount_indicated',label:'Amount indicated',kind:'money',g:'Opportunity'},{key:'amount_committed',label:'Amount committed',kind:'money',g:'Opportunity'},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES,required:true,g:'Opportunity'},{key:'is_lead',label:'Lead investor',kind:'auto',g:'Opportunity'},{key:'owner',label:'Owner',kind:'text',g:'Opportunity'},{key:'next_step',label:'Next step',kind:'text',g:'Opportunity'},{key:'next_due',label:'Next step due',kind:'date',g:'Opportunity'},{key:'last_activity_on',label:'Last activity on',kind:'auto',g:'Opportunity'},
  {key:'offer_received_on',label:'Offer received on',kind:'date',g:'Offer'},{key:'offer_amount',label:'Offer amount',kind:'money',g:'Offer'},{key:'offer_pre_money',label:'Pre-money valuation',kind:'money',g:'Offer'},{key:'offer_instrument',label:'Instrument',kind:'select',options:INSTRUMENTS,g:'Offer'},{key:'offer_board_seat',label:'Board seat',kind:'boolean',g:'Offer'},{key:'offer_expires_on',label:'Offer expires on',kind:'date',g:'Offer'},{key:'offer_status',label:'Offer status',kind:'select',options:OFFER_STATUS,g:'Offer'},{key:'offer_notes',label:'Offer notes',kind:'longtext',g:'Offer'},
  {key:'pass_reason',label:'Pass reason',kind:'select',options:PASS_REASONS,g:'Pass and CDA'},{key:'pass_detail',label:'Pass detail',kind:'text',g:'Pass and CDA'},{key:'cda_status',label:'CDA/NDA status',kind:'select',options:['none','sent','signed'],g:'Pass and CDA'},{key:'cda_signed_on',label:'CDA signed on',kind:'date',g:'Pass and CDA'},{key:'archived',label:'Archived',kind:'boolean'}],
 acts:[{key:'opportunity_id',label:'Opportunity',...ref('opps'),required:true},{key:'contact_id',label:'Contact',...ref('people')},{key:'activity_on',label:'Date',kind:'date',required:true},{key:'kind',label:'Kind',kind:'select',options:ACT_KINDS,required:true},{key:'summary',label:'Summary',kind:'text',required:true},{key:'outcome',label:'Outcome',kind:'text'},{key:'follow_up_due',label:'Follow-up due',kind:'date'},{key:'source',label:'Source',kind:'auto'}],
 tranches:[{key:'round_id',label:'Round',...ref('rounds'),required:true},{key:'tranche_no',label:'Tranche number',kind:'number',required:true},{key:'amount',label:'Amount',kind:'money',required:true},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES,required:true},{key:'condition',label:'Condition',kind:'text',required:true},{key:'milestone_id',label:'Milestone',...ref('miles')},{key:'expected_on',label:'Expected on',kind:'date'},{key:'status',label:'Status',kind:'select',options:TRANCHE_STATUS,required:true}],
 grants:[{key:'organization_id',label:'Investor',...ref('orgs')},{key:'person_id',label:'Person',...ref('people')},{key:'room_name',label:'Room name',kind:'text'},{key:'room_id',label:'Room reference',kind:'text'},{key:'room_purpose',label:'Room purpose',kind:'select',options:ROOM_PURPOSE},{key:'granted_on',label:'Granted on',kind:'date'},{key:'expires_on',label:'Expires on',kind:'date'},{key:'status',label:'Status',kind:'select',options:GRANT_STATUS},{key:'agreement_accepted_on',label:'Agreement accepted on',kind:'date'},{key:'source',label:'Source',kind:'auto'}],
 views:[{key:'grant_id',label:'Access grant',...ref('grants')},{key:'organization_id',label:'Investor',...ref('orgs')},{key:'person_id',label:'Person',...ref('people')},{key:'document_title',label:'Document title',kind:'text'},{key:'document_ref',label:'Document reference',kind:'text'},{key:'first_viewed_on',label:'First viewed on',kind:'date'},{key:'last_viewed_on',label:'Last viewed on',kind:'date'},{key:'view_count',label:'Views',kind:'number'},{key:'seconds_viewed',label:'Seconds viewed',kind:'number'},{key:'downloads',label:'Downloads',kind:'number'},{key:'source',label:'Source',kind:'select',options:VIEW_SOURCES},{key:'as_of',label:'As of',kind:'date'}],
 miles:[{key:'name',label:'Milestone',kind:'text',required:true},{key:'program_id',label:'Program (name or code)',kind:'text',required:true},{key:'item_type',label:'Item type',kind:'auto'},{key:'end_date',label:'Milestone date',kind:'date',required:true},{key:'status',label:'Status',kind:'select',options:MILE_STATUS,required:true},{key:'is_key',label:'Key milestone',kind:'boolean'}]
};
const ROLE_LABEL={orgs:'organization',people:'contact',settings:'settings',profiles:'investor profile',rounds:'round',opps:'opportunity',acts:'activity',tranches:'tranche',grants:'data-room access',views:'data-room view',miles:'milestone'};
/* Stable role keys (modular apps rule 5): core contract v1 for shared tables, fundraise.* for this app (fundraise.tranches is its published output),
 * dataroom.* and programs.plan_items are integrations: Fundraise's own tables for manual entry, the provider's tables (read-only) once linked. */
const ROLE_KEY={orgs:'organizations',people:'people',settings:'fundraise.settings',profiles:'fundraise.investor_profiles',rounds:'fundraise.rounds',opps:'fundraise.opportunities',acts:'fundraise.activities',tranches:'fundraise.tranches',grants:'dataroom.access_grants',views:'dataroom.engagement',miles:'programs.plan_items'};
const INTEGRATION_ROLES=['grants','views','miles'];

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
const DESC={overview:'The active round at a glance: raised against target, the lead, the funnel, and who needs a follow-up.',pipeline:'Every investor conversation in the round, by stage. Moving a card opens a reviewed edit.',investors:'Your ranked target list, with fit, cheque size, lead behaviour and intro paths, and history across rounds.',round:'Round settings, the syndicate, offer comparison and tranches tied to milestones.',activity:'Emails, calls, meetings and intros, follow-ups due, and why investors passed.',engagement:'Data-room access and views by investor, and the signals worth a follow-up.',settings:'Stages, pass reasons, fit vocabularies, the stale threshold and where each kind of data comes from.'};
const st=JSON.parse(JSON.stringify(inp.state||{}));
{
 let profile={};try{profile=JSON.parse(cfg.layoutProfile||'{}');}catch(e){profile={};}
 const groups=templateLayoutSchema.groups;
 const tabs=Array.isArray(profile.tabs)?profile.tabs.filter(id=>SCREENS.some(s=>s.id===id)):[];
 const cols={};for(const g of Object.keys(groups)){const ids=groups[g].map(x=>x.id),saved=profile.cols&&Array.isArray(profile.cols[g])?profile.cols[g].filter(k=>ids.includes(k)):[];cols[g]=[...new Set(saved.concat(ids))];}
 // Saved configuration always wins over any stale layout carried in UI state.
 st.layout={tabs:[...new Set(tabs.concat(SCREENS.map(s=>s.id)))],cols,visible:profile.visible&&typeof profile.visible==='object'?profile.visible:{},heading:String(profile.heading||cfg.heading||'Fundraise').slice(0,100)};
}
st.section=String(st.section||'overview');st.page=Math.max(0,Number(st.page)||0);st.query=String(st.query||'').slice(0,100);
st.filters=st.filters&&typeof st.filters==='object'?st.filters:{};
st.invTab=['targets','proposed','rejected'].includes(st.invTab)?st.invTab:'targets';
st.cmp=Array.isArray(st.cmp)?st.cmp.map(String).slice(0,3):null;
const note=v=>{st.notice=String(v||'').slice(0,500);};
const sections=st.layout.tabs.map(id=>SCREENS.find(s=>s.id===id)).filter(s=>s&&st.layout.visible[s.id]!==false);
if(!sections.some(s=>s.id===st.section))st.section=(sections[0]||SCREENS[0]).id;

/* ---------- data ---------- */
const R={};for(const role of ['settings','orgs','people','profiles','rounds','opps','acts','tranches','grants','views','miles'])R[role]=readRole(role);
const CORE=['orgs','profiles','rounds','opps','acts','tranches'];
const readProblems=[];
const PLURAL={orgs:'Organizations',people:'Contacts',settings:'Settings',profiles:'Investor profiles',rounds:'Rounds',opps:'Opportunities',acts:'Activities',tranches:'Tranches'};
for(const role of CORE.concat(['settings','people'])){const r=R[role],n=PLURAL[role];
 if(r.unbound)readProblems.push(n+' table is not connected to this app.');
 else if(r.unavailable)readProblems.push('You cannot read the '+ROLE_LABEL[role]+' table.');
 else if(!r.complete)readProblems.push(n+': partial read ('+r.allRows.length+' of '+(r.total>r.allRows.length?r.total:'more than '+r.allRows.length)+' rows).');
 if(r.invalid)readProblems.push(n+': '+plural(r.invalid,'value')+' with an invalid (non-scalar) shape ignored.');}
const exact=readProblems.length===0;
const settingsRow=R.settings.rows[0]||null;const SET=settingsRow?settingsRow.data:{};
const subset=(v,allowed)=>{const l=listOf(v).map(x=>x.toLowerCase()).filter(x=>allowed.includes(x));return l.length?[...new Set(l)]:allowed.slice();};
const STAGE_ORDER=subset(SET.stages,STAGES);
const PASS_ORDER=subset(SET.pass_reasons,PASS_REASONS);
const STALE_DAYS=Math.min(180,Math.max(1,Math.round(num(SET.stale_days,14)||14)));
const DEFAULT_CURRENCY=CURRENCIES.includes(SET.default_currency)?SET.default_currency:'EUR';
const VOCAB={modalities:listOf(SET.modalities),therapeutic_areas:listOf(SET.therapeutic_areas),dev_stages:listOf(SET.dev_stages)};

/* As-of date: the runtime clock when it gives a valid date; a pinned override in previews/tests; otherwise the user's control.
 * It only filters the view (stale, due, signals); nothing stored is derived from it. */
const CLOCK=(()=>{try{return validDate(new Date().toISOString());}catch(e){return '';}})();
const latestActivity=R.acts.rows.map(r=>validDate(r.data.activity_on)).filter(Boolean).sort().pop()||'';
const AS_OF_SOURCE=validDate(cfg.asOfOverride)?'pinned':CLOCK?'today':validDate(st.asOf)?'control':'default';
const AS_OF=AS_OF_SOURCE==='pinned'?validDate(cfg.asOfOverride):AS_OF_SOURCE==='today'?CLOCK:AS_OF_SOURCE==='control'?validDate(st.asOf):latestActivity;

/* ---------- entities ---------- */
const lookup=(role,id)=>(R[role].allRows||[]).find(r=>r.id===id)||null;
function orgName(id){if(!id)return '—';if(R.orgs.unbound)return 'Organizations not connected';if(R.orgs.unavailable)return 'Organization unavailable';const o=lookup('orgs',id);if(!o)return 'Organization unavailable';return String(o.data.name||'Unnamed')+(bool(o.data.archived)?' (archived)':'');}
function personName(id){if(!id)return '—';const p=lookup('people',id);if(!p)return R.people.unavailable?'Contact unavailable':'Contact unavailable';return String(p.data.name||'Unnamed')+(bool(p.data.archived)?' (archived)':'');}
const ROUNDS=R.rounds.rows.map(r=>({id:r.id,version:r.version,...r.data,opened_on:validDate(r.data.opened_on),target_close:validDate(r.data.target_close),closed_on:validDate(r.data.closed_on)})).sort((a,b)=>(a.status==='active'?0:1)-(b.status==='active'?0:1)||String(b.opened_on||'').localeCompare(String(a.opened_on||''))||String(a.name||'').localeCompare(String(b.name||'')));
const ROUND=Object.fromEntries(ROUNDS.map(x=>[x.id,x]));
function roundName(id){if(!id)return '—';const r=lookup('rounds',id);if(!r)return 'Round unavailable';return String(r.data.name||'Unnamed round')+(bool(r.data.archived)?' (archived)':'');}
const PROFILES=R.profiles.rows.map(r=>({id:r.id,version:r.version,...r.data}));
// One profile per investor organization; an accepted one wins over a proposed or rejected duplicate.
const PROFILE={};for(const p of PROFILES){const cur=PROFILE[p.organization_id];const rank=x=>x.profile_status==='accepted'?0:x.profile_status==='proposed'?1:2;if(!cur||rank(p)<rank(cur))PROFILE[p.organization_id]=p;}
const statusOf=orgId=>PROFILE[orgId]?PROFILE[orgId].profile_status:'none';
// Proposed (assistant-researched) and rejected investors never appear in the pipeline.
const inPipeline=orgId=>!['proposed','rejected'].includes(statusOf(orgId));
const OPPS=R.opps.rows.map(r=>({id:r.id,version:r.version,...r.data,next_due:validDate(r.data.next_due),last_activity_on:validDate(r.data.last_activity_on),offer_received_on:validDate(r.data.offer_received_on),offer_expires_on:validDate(r.data.offer_expires_on)}));
const OPP=Object.fromEntries(OPPS.map(x=>[x.id,x]));
const ACTS=R.acts.rows.map(r=>({id:r.id,version:r.version,...r.data,activity_on:validDate(r.data.activity_on),follow_up_due:validDate(r.data.follow_up_due)}));
const TRANCHES=R.tranches.rows.map(r=>({id:r.id,version:r.version,...r.data,expected_on:validDate(r.data.expected_on),tranche_no:num(r.data.tranche_no,0)}));
const PEOPLE=R.people.rows.map(r=>({id:r.id,...r.data}));
const INVESTOR_ORGS=R.orgs.rows.filter(o=>o.data.org_type==='investor'||PROFILE[o.id]);
function oppTitle(o){return o?orgName(o.organization_id)+' · '+roundName(o.round_id):'Opportunity unavailable';}
const amountOf=o=>o.interest==='signed'?num(o.amount_committed):num(o.amount_committed,num(o.amount_indicated));

/* ---------- integrations (modular apps §7): own entries until linked, then the provider's data read-only ---------- */
let INTEG=[];if(inp.saved){try{callsLeft--;const r=tools.call('integrations.list',{});INTEG=r&&Array.isArray(r.integrations)?r.integrations:[];}catch(e){INTEG=[];}}
const integ=role=>INTEG.find(x=>x.role===ROLE_KEY[role])||null;
const linked=role=>{const i=integ(role);return !!(i&&i.source==='linked');};
function integrationLine(role){const i=integ(role);if(!i||!i.offer)return '';const room=role!=='miles';
 const app=room?'Data Room':'Programs',use=room?(role==='views'&&!integ('grants')?.offer?'Use its view data':'Use its data'):'Use its milestones';
 return '<p class="fr-integration">'+(i.offer==='install'?'Works with '+app+'. ':app+' is in your workspace. ')+'<button type="button" class="fr-linkbtn" data-trialy-integration="'+esc(i.offer)+' '+esc(ROLE_KEY[role])+'">'+(i.offer==='install'?'Add '+app:use)+'</button></p>';}
// Data Room: one line for both roles; access first, then views.
const roomLine=()=>integrationLine(integ('grants')&&integ('grants').offer?'grants':'views');
const ROOM_LINKED=linked('grants')||linked('views');

/* ---------- calculations ---------- */
function roundTotals(round){
 const out={raised:0,verbal:0,soft:0,flagged:[],signedMissing:[],opps:[],complete:exact,target:num(round&&round.target_amount),currency:round?round.currency:''};
 if(!round)return out;
 out.opps=OPPS.filter(o=>o.round_id===round.id&&inPipeline(o.organization_id));
 for(const o of out.opps){if(!['soft','verbal','signed'].includes(o.interest))continue;const a=amountOf(o);
  if(a===null){if(o.interest==='signed')out.signedMissing.push(o);continue;}
  // Never converted or relabelled: another currency is flagged and excluded.
  if(o.currency!==round.currency){out.flagged.push(o);continue;}
  out[o.interest==='signed'?'raised':o.interest]+=a;}
 out.progress=out.target?out.raised/out.target:null;
 return out;}
const leadOf=round=>round?OPPS.find(o=>o.round_id===round.id&&bool(o.is_lead)&&inPipeline(o.organization_id))||null:null;
function leadBadge(round){const l=leadOf(round);if(!l)return 'Lead: not yet chosen';
 return 'Lead: '+orgName(l.organization_id)+' · '+(l.offer_status==='received'?'term sheet received':l.offer_status?('term sheet '+label(l.offer_status)):STAGE_LABEL[l.stage]||label(l.stage));}
const isStale=o=>ACTIVE_STAGES.includes(o.stage)&&!!AS_OF&&(!o.last_activity_on||diffDays(o.last_activity_on,AS_OF)>STALE_DAYS);
// A follow-up on an activity is open until a later activity is logged on the same opportunity.
const openFollowUp=a=>!!a.follow_up_due&&!ACTS.some(b=>b.id!==a.id&&b.opportunity_id===a.opportunity_id&&b.activity_on&&a.activity_on&&b.activity_on>a.activity_on);
const closedStage=o=>['closed','passed'].includes(o.stage);
function staleAndDue(round){const out=[];if(!round||!AS_OF)return out;const week=addDays(AS_OF,6);
 for(const o of OPPS.filter(o=>o.round_id===round.id&&inPipeline(o.organization_id))){
  if(isStale(o))out.push({kind:'stale',date:o.last_activity_on||'',name:orgName(o.organization_id),text:o.last_activity_on?'No activity for '+plural(diffDays(o.last_activity_on,AS_OF),'day')+' ('+STAGE_LABEL[o.stage]+')':'No activity logged ('+STAGE_LABEL[o.stage]+')',act:'details:opps:'+o.id});
  if(!closedStage(o)&&o.next_due&&o.next_due<=week)out.push({kind:o.next_due<AS_OF?'overdue':'due',date:o.next_due,name:orgName(o.organization_id),text:'Next step: '+String(o.next_step||'follow up'),act:'details:opps:'+o.id});}
 for(const a of ACTS.filter(a=>openFollowUp(a)&&a.follow_up_due<=week)){const o=OPP[a.opportunity_id];if(!o||o.round_id!==round.id||closedStage(o)||!inPipeline(o.organization_id))continue;
  out.push({kind:a.follow_up_due<AS_OF?'overdue':'due',date:a.follow_up_due,name:orgName(o.organization_id),text:'Follow up: '+String(a.summary||'').slice(0,80),act:'details:opps:'+o.id});}
 const order={overdue:0,due:1,stale:2};return out.sort((a,b)=>order[a.kind]-order[b.kind]||String(a.date).localeCompare(String(b.date))||a.name.localeCompare(b.name));}
function passPatterns(roundId){const list=OPPS.filter(o=>o.stage==='passed'&&(!roundId||o.round_id===roundId));const c={};for(const o of list){const k=o.pass_reason||'unspecified';c[k]=(c[k]||0)+1;}
 return {total:list.length,counts:Object.entries(c).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))};}

/* Engagement signals, from own entries or the linked provider, whichever is the source. */
const GRANTS=R.grants.rows.map(r=>({id:r.id,version:r.version,...r.data,granted_on:validDate(r.data.granted_on),expires_on:validDate(r.data.expires_on)}));
const VIEWS=R.views.rows.map(r=>({id:r.id,version:r.version,...r.data,first_viewed_on:validDate(r.data.first_viewed_on),last_viewed_on:validDate(r.data.last_viewed_on),view_count:num(r.data.view_count,0)}));
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
const MILES=R.miles.rows.map(r=>({id:r.id,version:r.version,...r.data,end_date:validDate(r.data.end_date)})).filter(m=>!m.item_type||m.item_type==='milestone');
function trancheTrack(t){if(!t.milestone_id)return {tone:'',text:'No milestone'};
 if(R.miles.unbound)return {tone:'',text:'Milestones not connected'};if(R.miles.unavailable)return {tone:'amber',text:'Milestone not readable'};
 const m=R.miles.allRows.find(x=>x.id===t.milestone_id);if(!m)return {tone:'amber',text:'Milestone unavailable'};
 const s=m.data.status,end=validDate(m.data.end_date);
 if(s==='done')return {tone:'green',text:'Milestone done: met candidate'};
 if(s==='at_risk')return {tone:'red',text:'Milestone at risk'};
 if(s==='cancelled')return {tone:'red',text:'Milestone cancelled'};
 if(end&&t.expected_on&&end>t.expected_on)return {tone:'amber',text:'Milestone '+dateLabel(end)+', after the expected date'};
 return {tone:'blue',text:'On track ('+label(s||'planned')+(end?', '+dateLabel(end):'')+')'};}
const mileName=id=>{if(!id)return '—';const m=R.miles.allRows.find(x=>x.id===id);return m?String(m.data.name||'Unnamed milestone'):'Milestone unavailable';};

const money=(v,cur)=>v===null||v===undefined?'—':(cur?cur+' ':'')+(Math.abs(v)>=1e6?(v/1e6).toFixed(1)+'M':Math.abs(v)>=1e3?Math.round(v/1e3)+'k':grouped(v));
const exactMoney=(v,cur)=>v===null||v===undefined?'—':(cur?cur+' ':'')+grouped(v);

/* ---------- selected round (applied before any dependent calculation is rendered) ---------- */
function pickRound(){if(st.round&&ROUND[st.round])return st.round;const a=ROUNDS.find(r=>r.status==='active')||ROUNDS[0];return a?a.id:'';}
st.round=pickRound();

/* ---------- writes ---------- */
function toReal(role,data){const m=roleMap[role];if(!m)throw Error('The '+ROLE_LABEL[role]+' table is not connected.');const out={};for(const [k,v] of Object.entries(data)){if(v===undefined)continue;if(!m.fields[k])continue;if(!m.writable.includes(k))throw Error('You cannot edit '+k.replace(/_/g,' ')+' in the '+ROLE_LABEL[role]+' table.');out[m.fields[k]]=v;}return out;}
function valuesFromForm(role,source,mode){
 const out={};const m=roleMap[role];
 for(const f of S[role]){
  if(['auto','frozen'].includes(f.kind)||f.key==='archived')continue;
  if(!m||!m.fields[f.key]||!m.writable.includes(f.key))continue;
  if(!has(source,f.key)){if(mode==='create'&&f.required)throw Error('Required field: '+f.label+'.');continue;}
  let v=source[f.key];if(typeof v==='string')v=v.trim();
  if(v===''||v===null){if(f.required)throw Error('Required field: '+f.label+'.');out[f.key]=null;continue;}
  if(f.kind==='number'||f.kind==='money'){const n=Number(v);if(!Number.isFinite(n))throw Error('Enter a number for '+f.label+'.');if(f.kind==='money'&&n<0)throw Error(f.label+' cannot be negative.');out[f.key]=n;}
  else if(f.kind==='date'){const d=validDate(v);if(!d)throw Error('Use a valid date for '+f.label+' (YYYY-MM-DD).');out[f.key]=d;}
  else if(f.kind==='select'){if(!f.options.includes(String(v)))throw Error('Choose a valid '+f.label.toLowerCase()+'.');out[f.key]=String(v);}
  else if(f.kind==='boolean')out[f.key]=bool(v);
  else if(f.kind==='ref'){const kept=st.editor&&st.editor.refs&&st.editor.refs[f.key]===String(v);if(!kept&&!R[f.ref].rows.some(r=>r.id===v))throw Error('Choose an existing '+f.label.toLowerCase()+'.');out[f.key]=String(v);}
  else out[f.key]=String(v).slice(0,f.kind==='longtext'?4000:300);
 }
 if(role==='profiles'){const lo=has(out,'check_min')?out.check_min:num(source.check_min),hi=has(out,'check_max')?out.check_max:num(source.check_max);if(lo!==null&&hi!==null&&lo>hi)throw Error('Cheque min is above cheque max.');}
 if(role==='opps'){const stage=has(out,'stage')?out.stage:source.stage;if(stage==='passed'&&!(has(out,'pass_reason')?out.pass_reason:source.pass_reason))throw Error('Record why the investor passed: choose a pass reason.');}
 if(role==='settings'){for(const [k,allowed] of [['stages',STAGES],['pass_reasons',PASS_REASONS]]){if(out[k]){const bad=listOf(out[k]).map(x=>x.toLowerCase()).filter(x=>!allowed.includes(x));if(bad.length)throw Error('Unknown '+k.replace('_',' ')+': '+bad.join(', ')+'. Use: '+allowed.join(', ')+'.');}}
  if(out.stale_days!==undefined&&out.stale_days!==null&&!(Number.isInteger(out.stale_days)&&out.stale_days>=1&&out.stale_days<=180))throw Error('The stale threshold must be a whole number of days from 1 to 180.');}
 if(role==='tranches'&&out.tranche_no!==undefined&&out.tranche_no!==null&&!(Number.isInteger(out.tranche_no)&&out.tranche_no>=1))throw Error('The tranche number is a whole number from 1.');
 if(role==='views'&&out.view_count!==undefined&&out.view_count!==null&&out.view_count<0)throw Error('Views cannot be negative.');
 if(mode==='create'&&m&&m.fields.archived&&m.writable.includes('archived'))out.archived=false;
 if(mode==='create'&&m&&m.fields.source&&m.writable.includes('source')&&!has(out,'source')){if(role==='acts')out.source='manual';else if(role==='grants')out.source='manual';}
 if(mode==='create'&&role==='miles'&&m&&m.fields.item_type&&m.writable.includes('item_type'))out.item_type='milestone';
 return out;}
function propose(changes,message){if(!changes.length)throw Error('There is nothing to save.');if(changes.length>50)throw Error('This change needs '+changes.length+' record writes; one review holds 50. Save it in smaller parts.');tools.call('records.propose',changes);note(message||'Prepared for TrialAgents review. Nothing changes until you approve it.');}
function openEditor(role,mode,id,preset){
 st.menu=null;st.confirm=null;st.move=null;let draft={...(preset||{})},version=null;
 if(mode!=='create'){const r=lookup(role,id);if(!r)throw Error('That record is no longer available.');draft={...r.data};version=r.version;}
 const refs={};for(const f of S[role])if(f.kind==='ref'&&draft[f.key])refs[f.key]=String(draft[f.key]);
 // Versions are captured now: an opportunity edited meanwhile is rejected by the server, never overwritten.
 const versions=role==='acts'?Object.fromEntries(OPPS.map(x=>[x.id,x.version])):null;
 st.editor={role,mode,id:mode==='edit'?id:null,version:mode==='edit'?version:null,draft,initial:JSON.stringify(draft),refs,versions};
}
function activitySave(ed,data){
 // Saving an activity also moves the opportunity's last_activity_on forward, in the same reviewed save.
 const oppId=has(data,'opportunity_id')?data.opportunity_id:ed.draft.opportunity_id,o=OPP[oppId];if(!o)throw Error('Choose an existing opportunity.');
 const when=has(data,'activity_on')?data.activity_on:validDate(ed.draft.activity_on);
 const changes=[ed.mode==='edit'?{kind:'update_record',recordId:ed.id,expectedVersion:ed.version,data:toReal('acts',data)}:{kind:'create_record',typeId:roleMap.acts.typeId,data:toReal('acts',data)}];
 if(when&&(!o.last_activity_on||when>o.last_activity_on)){if(!writableField('opps','last_activity_on'))throw Error('You cannot update the opportunity, so this activity cannot be saved.');
  changes.push({kind:'update_record',recordId:o.id,expectedVersion:ed.versions&&has(ed.versions,o.id)?ed.versions[o.id]:o.version,data:toReal('opps',{last_activity_on:when})});}
 return changes;}

/* ---------- events ---------- */
try{
 if(action.startsWith('nav:')){const id=action.slice(4);if(SCREENS.some(s=>s.id===id)){st.section=id;st.page=0;st.query='';st.filters={};st.filtersOpen=false;st.menu=null;st.editor=null;st.confirm=null;st.detail=null;st.move=null;note('');}}
 else if(action==='clear-notice')note('');
 else if(action==='as-of'&&event.kind==='change'){const d=validDate(event.value);if(!d)throw Error('Use a valid as-of date.');st.asOf=d;}
 else if(action==='round'&&event.kind==='change'){const v=String(event.value||'');if(!ROUND[v])throw Error('Choose an existing round.');st.round=v;st.page=0;st.cmp=null;st.detail=null;}
 else if(action==='query'&&event.kind==='change'){st.query=String(event.value||'').slice(0,100);st.page=0;}
 else if(action==='toggle-filters')st.filtersOpen=!st.filtersOpen;
 else if(action.startsWith('filter:')&&event.kind==='change'){st.filters[action.slice(7)]=String(event.value||'');st.page=0;}
 else if(action==='clear-filters'){st.filters={};st.page=0;}
 else if(action==='next-page')st.page++;else if(action==='prev-page')st.page=Math.max(0,st.page-1);
 else if(action.startsWith('menu:'))st.menu=st.menu===action.slice(5)?null:action.slice(5);
 else if(action.startsWith('details:')){const [role,id]=action.slice(8).split(':');st.detail={role,id};st.menu=null;}
 else if(action==='close-details')st.detail=null;
 else if(action.startsWith('inv-tab:')){st.invTab=action.slice(8);st.page=0;}
 else if(action.startsWith('add:')){const [role,arg]=action.slice(4).split(':');const rd=ROUND[st.round];
  const presets={rounds:{round_type:'seed',currency:DEFAULT_CURRENCY,status:'planning'},
   opps:{round_id:st.round,organization_id:arg||'',stage:'target',interest:'none',currency:rd?rd.currency:DEFAULT_CURRENCY},
   acts:{opportunity_id:arg||'',activity_on:AS_OF,kind:'email'},
   tranches:{round_id:st.round,tranche_no:TRANCHES.filter(t=>t.round_id===st.round).reduce((n,t)=>Math.max(n,t.tranche_no),0)+1,currency:rd?rd.currency:DEFAULT_CURRENCY,status:'expected'},
   orgs:{org_type:'investor'},
   profiles:{organization_id:arg||'',investor_type:'specialist_ls_vc',profile_status:'accepted'},
   people:{organization_id:arg||''},
   grants:{organization_id:arg||'',status:'active',room_purpose:'financing',granted_on:AS_OF},
   views:{organization_id:arg||'',source:'manual',view_count:1,last_viewed_on:AS_OF,as_of:AS_OF},
   miles:{status:'planned',is_key:true}};
  if(role==='opps'&&arg&&!inPipeline(arg))throw Error('Accept this investor before adding it to a round.');
  if(role==='opps'&&!ROUNDS.length)throw Error('Create a round first.');
  openEditor(role,'create',null,presets[role]||{});}
 else if(action.startsWith('edit:')){const [role,id]=action.slice(5).split(':');openEditor(role,'edit',id);}
 else if(action==='edit-settings'){if(settingsRow)openEditor('settings','edit',settingsRow.id);else openEditor('settings','create',null,{default_currency:'EUR',stale_days:14,stages:STAGES.join(', '),pass_reasons:PASS_REASONS.join(', ')});}
 else if(action.startsWith('draft:')&&st.editor){st.editor.draft={...st.editor.draft,...form};}
 else if(action==='cancel-modal'){st.editor=null;st.confirm=null;st.move=null;}
 else if(action==='save-record'&&event.kind==='submit'){
  const ed=st.editor;if(!ed)throw Error('Nothing to save.');const {role,mode,id}=ed;if(!canWrite(role))throw Error('You cannot change the '+ROLE_LABEL[role]+' table.');
  ed.draft={...ed.draft,...form};
  const data=valuesFromForm(role,ed.draft,mode==='edit'?'update':'create');
  if(mode==='edit'){const orig=lookup(role,id);if(!orig)throw Error('This record changed or was removed; reopen it.');const same=(x,y)=>(x===undefined||x===''?null:x)===(y===undefined||y===''?null:y)||String(x)===String(y)&&x!==null&&y!==null;for(const k of Object.keys(data))if(same(data[k],orig.data[k]))delete data[k];if(!Object.keys(data).length)throw Error('Nothing changed.');}
  if(role==='opps'&&mode==='create'){if(!inPipeline(data.organization_id))throw Error('Accept this investor before adding it to a round.');if(OPPS.some(o=>o.round_id===data.round_id&&o.organization_id===data.organization_id))throw Error(orgName(data.organization_id)+' is already in '+roundName(data.round_id)+'. Open that opportunity instead.');}
  if(role==='profiles'&&mode==='create'&&PROFILE[data.organization_id])throw Error(orgName(data.organization_id)+' already has an investor profile. Edit it instead.');
  if(role==='tranches'){const rid=has(data,'round_id')?data.round_id:ed.draft.round_id,no=has(data,'tranche_no')?data.tranche_no:num(ed.draft.tranche_no);if(TRANCHES.some(t=>t.id!==id&&t.round_id===rid&&t.tranche_no===no))throw Error('Tranche '+no+' already exists in this round.');}
  if(role==='settings'&&mode==='create'&&R.settings.rows.length)throw Error('Settings already exist; edit them instead.');
  if(role==='acts')propose(activitySave(ed,data),'Activity prepared for review, with the opportunity\'s last activity date in the same save. Nothing changes until you approve it.');
  else if(mode==='edit')propose([{kind:'update_record',recordId:id,expectedVersion:ed.version,data:toReal(role,data)}],'Change prepared for review. Nothing changes until you approve it.');
  else propose([{kind:'create_record',typeId:roleMap[role].typeId,data:toReal(role,data)}],'New '+ROLE_LABEL[role]+' prepared for review.');
  st.editor=null;}
 else if(action.startsWith('archive:')){const [role,id]=action.slice(8).split(':');const r=lookup(role,id);if(!r)throw Error('That record is no longer available.');st.confirm={kind:'archive',role,id,version:r.version};st.menu=null;}
 else if(action==='confirm-archive'){const c=st.confirm;if(!c||c.kind!=='archive')throw Error('Nothing to archive.');const m=roleMap[c.role];if(!canWrite(c.role)||!m.fields.archived||!m.writable.includes('archived'))throw Error('Archiving needs an editable archived field.');
  if(c.role==='rounds'){if(!R.opps.complete)throw Error('Opportunities were not read completely, so the round cannot be archived safely.');if(OPPS.some(o=>o.round_id===c.id))throw Error('This round still has opportunities. Archive them first; investors keep their history.');}
  propose([{kind:'update_record',recordId:c.id,expectedVersion:c.version,data:{[m.fields.archived]:true}}],'Archive prepared for review. The record and its history are kept.');st.confirm=null;}
 /* pipeline: move a card (opens a reviewed edit; nothing saves without review) */
 else if(action.startsWith('move:')){const o=OPP[action.slice(5)];if(!o)throw Error('That opportunity is no longer available.');st.move={id:o.id,version:o.version,draft:{stage:o.stage,interest:o.interest,pass_reason:o.pass_reason||'',pass_detail:String(o.pass_detail||'')}};st.menu=null;}
 else if(action==='move-draft'&&st.move){st.move.draft={...st.move.draft,...form};}
 else if(action==='move-submit'&&event.kind==='submit'){const mv=st.move;if(!mv)throw Error('Nothing to move.');mv.draft={...mv.draft,...form};const o=OPP[mv.id];if(!o)throw Error('That opportunity changed or was removed; reopen it.');
  if(!STAGES.includes(mv.draft.stage))throw Error('Choose a stage.');if(!INTEREST.includes(mv.draft.interest))throw Error('Choose the interest level.');
  if(mv.draft.stage==='passed'&&!PASS_REASONS.includes(mv.draft.pass_reason))throw Error('Record why the investor passed: choose a pass reason.');
  const data={};if(mv.draft.stage!==o.stage)data.stage=mv.draft.stage;if(mv.draft.interest!==o.interest)data.interest=mv.draft.interest;
  if(mv.draft.stage==='passed'){if(mv.draft.pass_reason!==o.pass_reason)data.pass_reason=mv.draft.pass_reason;const d=String(mv.draft.pass_detail||'').trim().slice(0,300);if(d!==String(o.pass_detail||''))data.pass_detail=d||null;}
  if(!Object.keys(data).length)throw Error('Nothing changed.');if(!canWrite('opps'))throw Error('You cannot change opportunities.');
  propose([{kind:'update_record',recordId:o.id,expectedVersion:mv.version,data:toReal('opps',data)}],'Move prepared for review'+(data.stage?': '+STAGE_LABEL[o.stage]+' → '+STAGE_LABEL[data.stage]:'')+'. Nothing changes until you approve it.');st.move=null;}
 /* lead */
 else if(action.startsWith('lead:')){const o=OPP[action.slice(5)];if(!o)throw Error('That opportunity is no longer available.');const others=OPPS.filter(x=>x.round_id===o.round_id&&x.id!==o.id&&bool(x.is_lead));const rd=ROUND[o.round_id];
  st.confirm={kind:'lead',id:o.id,version:o.version,others:others.map(x=>({id:x.id,version:x.version})),round:rd?{id:rd.id,version:rd.version}:null};st.detail=null;st.menu=null;}
 else if(action==='confirm-lead'){const c=st.confirm;if(!c||c.kind!=='lead')throw Error('Nothing to confirm.');const o=OPP[c.id];if(!o)throw Error('That opportunity changed; reopen it.');if(!writableField('opps','is_lead'))throw Error('You cannot mark the lead.');
  const changes=[{kind:'update_record',recordId:o.id,expectedVersion:c.version,data:toReal('opps',{is_lead:true})}];
  for(const x of c.others)changes.push({kind:'update_record',recordId:x.id,expectedVersion:x.version,data:toReal('opps',{is_lead:false})});
  if(c.round&&writableField('rounds','lead_org_id')&&ROUND[c.round.id]&&ROUND[c.round.id].lead_org_id!==o.organization_id)changes.push({kind:'update_record',recordId:c.round.id,expectedVersion:c.round.version,data:toReal('rounds',{lead_org_id:o.organization_id})});
  propose(changes,orgName(o.organization_id)+' as lead prepared for review'+(c.others.length?'; the previous lead is unmarked in the same save':'')+'.');st.confirm=null;}
 /* investor proposals: accept or reject (assistant-proposed investors stay proposed until the user decides) */
 else if(action.startsWith('decide:')){const [id,to]=action.slice(7).split(':');const p=PROFILES.find(x=>x.id===id);if(!p)throw Error('That profile is no longer available.');if(!['accepted','rejected'].includes(to))throw Error('Accept or reject the investor.');st.confirm={kind:'decide',id,version:p.version,to};st.menu=null;}
 else if(action==='confirm-decide'){const c=st.confirm;if(!c||c.kind!=='decide')throw Error('Nothing to decide.');if(!writableField('profiles','profile_status'))throw Error('You cannot change investor profiles.');
  propose([{kind:'update_record',recordId:c.id,expectedVersion:c.version,data:toReal('profiles',{profile_status:c.to})}],c.to==='accepted'?'Accepting the investor prepared for review. Once approved it can be added to a round.':'Rejecting the investor prepared for review. Rejected investors never appear in the pipeline.');st.confirm=null;}
 /* offer comparison */
 else if(action.startsWith('cmp:')&&event.kind==='change'){const id=action.slice(4);const cur=st.cmp||defaultCompare();const on=bool(event.value);let next=cur.filter(x=>x!==id);if(on)next.push(id);if(next.length>3)throw Error('Compare up to three offers at a time.');st.cmp=next;}
}catch(e){note('Action not completed: '+String(e&&e.message||e).slice(0,400));}
function defaultCompare(){return OPPS.filter(o=>o.round_id===st.round&&inPipeline(o.organization_id)&&(num(o.offer_amount)!==null||o.offer_received_on)).sort((a,b)=>String(b.offer_received_on||'').localeCompare(String(a.offer_received_on||''))).slice(0,3).map(o=>o.id);}

/* ---------- rendering helpers ---------- */
const glyph={overview:'<rect x="3" y="3" width="7" height="8" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="15" width="7" height="6" rx="1.5"/>',pipeline:'<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',investors:'<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .6 3 2.6 3 6"/>',round:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v10M9.5 9.5c0-1.2 1.1-2 2.5-2s2.5.8 2.5 2-1.1 1.7-2.5 2-2.5.9-2.5 2.1 1.1 2 2.5 2 2.5-.8 2.5-2"/>',activity:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',engagement:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',plus:'<path d="M12 5v14M5 12h14"/>',close:'<path d="M6 6l12 12M18 6L6 18"/>'};
const icon=(n,s=18)=>'<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(glyph[n]||glyph.overview)+'</svg>';
const btn=(text,a,cls,disabled,extra)=>'<button type="button" class="'+(cls===undefined?'fr-btn':cls)+'" data-action="'+esc(a)+'"'+(disabled?' disabled':'')+(extra?' '+extra:'')+'>'+text+'</button>';
const pill=(text,type)=>'<span class="fr-pill '+esc(type||'')+'">'+esc(text)+'</span>';
const interestTone=i=>i==='signed'?'green':i==='verbal'?'blue':i==='soft'?'amber':'';
const current=SCREENS.find(s=>s.id===st.section)||SCREENS[0];
const asOfText=()=>AS_OF?'As of '+dateLabel(AS_OF)+(AS_OF_SOURCE==='today'?' (today)':AS_OF_SOURCE==='pinned'?' (fixed)':''):'No as-of date';
function roundPicker(){if(!ROUNDS.length)return '';return '<label class="fr-field inline" for="fr-round">Round<select class="fr-input" id="fr-round" name="round" data-ui-state="true" data-action="round">'+ROUNDS.map(r=>'<option value="'+esc(r.id)+'"'+(r.id===st.round?' selected':'')+'>'+esc(String(r.name||'Unnamed')+' · '+cap(r.status))+'</option>').join('')+'</select></label>';}
function heading(sub,withRound){return '<header class="fr-top"><div><div class="fr-eyebrow">Fundraise / '+esc(current.label)+'</div><h1 class="fr-title">'+esc(st.layout.heading)+'</h1><p class="fr-subtitle">'+esc(sub||DESC[current.id])+'</p></div><div class="fr-top-right">'+(withRound?roundPicker():'')+pill(asOfText(),'teal')+btn(icon('gear',18),'tracker:layout','fr-icon-btn',!inp.saved,'aria-label="App layout settings" title="Layout settings"')+'</div></header>'+asOfControl();}
function asOfControl(){if(AS_OF_SOURCE==='today'||AS_OF_SOURCE==='pinned')return '';return '<div class="fr-banner warn"><label class="fr-field inline" for="fr-asof">As-of date<input class="fr-input" type="date" id="fr-asof" name="as_of" data-ui-state="true" data-action="as-of" value="'+esc(AS_OF)+'"></label><span>This app view could not read today\'s date, so stale and due items use this date'+(AS_OF_SOURCE==='default'?' (the latest logged activity)':'')+'.</span></div>';}
function checks(){if(exact)return '';
 return '<div class="fr-banner bad" role="alert"><strong>Partial data: totals are disabled.</strong> '+readProblems.slice(0,8).map(esc).join(' ')+' Rows that were read are still shown and labelled.</div>';}
function paged(items,per){per=per||Math.min(50,Math.max(10,num(cfg.pageSize,25)||25));const max=Math.max(0,Math.ceil(items.length/per)-1);st.page=Math.min(st.page,max);return {slice:items.slice(st.page*per,(st.page+1)*per),page:st.page,max,total:items.length,per};}
function pager(p,scope){return '<div class="fr-footer"><span>'+(p.total?'Showing '+(p.page*p.per+1)+'–'+Math.min(p.total,(p.page+1)*p.per)+' of '+p.total:'No rows')+(scope?' · '+esc(scope):'')+'</span><span class="fr-pager">'+btn('Previous','prev-page','fr-btn small',p.page===0)+'<span>Page '+(p.page+1)+' of '+(p.max+1)+'</span>'+btn('Next','next-page','fr-btn small',p.page>=p.max)+'</span></div>';}
function partialLabel(role){const r=R[role];return r.unbound?'table not connected':r.unavailable?'no access':!r.complete?'partial: '+r.rows.length+' rows read':'search covers all '+r.rows.length+' rows';}
function filterRow(filters){const active=Object.entries(st.filters).filter(([,v])=>v).length;
 return btn('Filters'+(active?' ('+active+')':''),'toggle-filters','fr-btn fr-disclosure',false,'aria-expanded="'+(st.filtersOpen?'true':'false')+'" aria-controls="fr-filters"')+'</div>'+
 (st.filtersOpen?'<div class="fr-filter-row" id="fr-filters">'+filters.filter(f=>f.options.length).map(f=>'<label>'+esc(f.label)+'<select name="filter_'+f.key+'" data-ui-state="true" data-action="filter:'+f.key+'"><option value="">All</option>'+f.options.map(o=>'<option value="'+esc(o[0])+'"'+(st.filters[f.key]===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></label>').join('')+btn('Clear filters','clear-filters','fr-btn small',!active)+'</div>':'');}
function toolbar(role,addLabel,filters,addAction){return '<div class="fr-toolbar"><input type="search" class="fr-search" name="query" data-action="query" data-ui-state="true" value="'+esc(st.query)+'" placeholder="Search" aria-label="Search">'+(addLabel?btn(icon('plus',15)+'<span>'+esc(addLabel)+'</span>',addAction||'add:'+role,'fr-btn fr-btn-primary',!canWrite(role),'aria-label="'+esc(addLabel)+'"'):'')+filterRow(filters);}
const opt=(list,labels)=>list.map(x=>[x,labels&&labels[x]?labels[x]:cap(x)]);
const empty=(title,text,actions)=>'<div class="fr-empty"><strong>'+esc(title)+'</strong><p>'+esc(text)+'</p>'+(actions||'')+'</div>';
const kv=(k,v)=>'<div class="fr-kv"><span>'+esc(k)+'</span><strong>'+esc(v===null||v===undefined||v===''?'—':v)+'</strong></div>';
function kpi(title,value,foot,tone){return '<div class="fr-kpi '+(tone||'')+'"><div class="fr-kpi-label">'+esc(title)+'</div><div class="fr-kpi-value">'+esc(value)+'</div><div class="fr-kpi-foot">'+esc(foot||'')+'</div></div>';}
const visibleCols=g=>st.layout.cols[g].filter(k=>st.layout.visible[g+':'+k]!==false);
const colLabel=(g,k)=>(templateLayoutSchema.groups[g].find(x=>x.id===k)||{label:k}).label;
function noRound(){return empty('No round yet','Start a round with its type, target and currency. Claude or ChatGPT can then help build the target list from your own list and research; you accept or reject each investor.',canWrite('rounds')?'<div class="fr-row">'+btn(icon('plus',15)+' Start a round','add:rounds','fr-btn fr-btn-primary')+'</div>':'');}

/* ---------- Overview ---------- */
function thermometer(round,t){const target=t.target||0,total=t.raised+t.verbal+t.soft,scale=Math.max(target,total)||1;const w=v=>(v/scale*100).toFixed(2)+'%';
 return '<div class="fr-thermo" role="img" aria-label="'+esc('Signed '+exactMoney(t.raised,round.currency)+', verbal '+exactMoney(t.verbal,round.currency)+', soft '+exactMoney(t.soft,round.currency)+(target?' of target '+exactMoney(target,round.currency):''))+'"><i class="signed" style="width:'+w(t.raised)+'"></i><i class="verbal" style="width:'+w(t.verbal)+'"></i><i class="soft" style="width:'+w(t.soft)+'"></i>'+(target?'<b class="target" style="left:'+w(target)+'"></b>':'')+'</div>'+
 '<div class="fr-thermo-legend"><span><i class="signed"></i>Signed (raised) '+esc(money(t.raised,round.currency))+'</span><span><i class="verbal"></i>Verbal '+esc(money(t.verbal,round.currency))+'</span><span><i class="soft"></i>Soft '+esc(money(t.soft,round.currency))+'</span>'+(target?'<span><i class="target"></i>Target '+esc(money(target,round.currency))+'</span>':'')+'</div>';}
function currencyFlags(t,round){const parts=[];
 if(t.flagged.length)parts.push('<div class="fr-banner warn" role="status"><strong>'+plural(t.flagged.length,'amount')+' in another currency excluded.</strong> '+t.flagged.map(o=>esc(orgName(o.organization_id)+' ('+o.currency+' '+grouped(amountOf(o))+', '+o.interest+')')).join('; ')+'. Totals use '+esc(round.currency)+' only; amounts are never converted.</div>');
 if(t.signedMissing.length)parts.push('<div class="fr-banner warn" role="status">'+plural(t.signedMissing.length,'signed commitment')+' without a committed amount: '+t.signedMissing.map(o=>esc(orgName(o.organization_id))).join(', ')+'. Enter the amount to count it.</div>');
 return parts.join('');}
function funnel(round){const list=OPPS.filter(o=>o.round_id===round.id&&inPipeline(o.organization_id));const max=Math.max(1,...STAGE_ORDER.map(s=>list.filter(o=>o.stage===s).length));
 return '<ul class="fr-funnel">'+STAGE_ORDER.map(s=>{const l=list.filter(o=>o.stage===s),days=l.filter(o=>o.last_activity_on&&AS_OF).map(o=>diffDays(o.last_activity_on,AS_OF));const avg=days.length?Math.round(days.reduce((a,b)=>a+b,0)/days.length):null;
  return '<li><span class="fr-funnel-label">'+esc(STAGE_LABEL[s])+'</span><span class="fr-funnel-bar"><i style="width:'+(l.length/max*100).toFixed(1)+'%"></i></span><strong>'+l.length+'</strong><small>'+(avg===null?'—':avg+' d')+'</small></li>';}).join('')+'</ul><p class="fr-muted">Days: average since the last logged activity (record history is not available to the app).</p>';}
function overview(){
 let body=heading(null,true)+checks();const round=ROUND[st.round];
 if(!round)return body+noRound();
 const t=roundTotals(round),tot=v=>exact?money(v,round.currency):'—';
 body+='<section class="fr-hero"><div class="fr-hero-over">'+esc(String(round.name||'Round')+' · '+(ROUND_LABEL[round.round_type]||cap(round.round_type))+' · '+cap(round.status))+'</div><div class="fr-hero-sentence">'+(exact?'Raised '+esc(exactMoney(t.raised,round.currency))+(t.target?' of '+esc(exactMoney(t.target,round.currency))+' ('+pct(t.raised,t.target)+'%)':''):'Totals withheld: the data was not read completely')+'</div>'+(exact?thermometer(round,t):'')+'<div class="fr-hero-foot">'+pill(leadBadge(round),'lead')+(round.target_close?'<span>Target close <strong>'+esc(dateLabel(round.target_close))+'</strong></span>':'')+'</div></section>';
 body+=currencyFlags(t,round);
 const active=t.opps.filter(o=>!closedStage(o)).length;
 body+='<div class="fr-kpis">'+kpi('Raised (signed)',tot(t.raised),'Only signed commitments count','good')+kpi('Verbal',tot(t.verbal),'Not added to raised')+kpi('Soft',tot(t.soft),'Not added to raised')+kpi('Progress',exact&&t.target?pct(t.raised,t.target)+'%':'—',t.target?'Raised ÷ target':'No target set')+kpi('Active conversations',exact?String(active):'—',plural(t.opps.length,'investor')+' in this round')+'</div>';
 const sd=staleAndDue(round);
 body+='<div class="fr-grid2"><section class="fr-panel fr-pad"><div class="fr-panel-head"><div><h2>Funnel</h2><p>Opportunities by stage in this round</p></div></div>'+funnel(round)+'</section>'+
  '<section class="fr-panel fr-pad"><div class="fr-panel-head"><div><h2>Stale and due</h2><p>No activity for more than '+STALE_DAYS+' days, and follow-ups due by '+esc(dateLabel(addDays(AS_OF,6)))+'</p></div></div>'+(sd.length?'<ul class="fr-list">'+sd.slice(0,14).map(x=>'<li><span>'+pill(x.kind==='stale'?'Stale':x.kind==='overdue'?'Overdue':'Due',x.kind==='overdue'?'red':x.kind==='due'?'amber':'')+' <strong>'+esc(x.name)+'</strong><small class="fr-sub">'+esc(x.text)+(x.kind!=='stale'&&x.date?' · '+dateLabel(x.date):'')+'</small></span>'+btn('Open',x.act,'fr-btn small',false,'aria-label="Open '+esc(x.name)+'"')+'</li>').join('')+'</ul>'+(sd.length>14?'<p class="fr-muted">And '+(sd.length-14)+' more on the Activity screen.</p>':''):'<p class="fr-muted">Nothing stale or due.</p>')+'</section></div>';
 body+='<section class="fr-panel fr-pad"><div class="fr-panel-head"><div><h2>Engagement highlights</h2><p>'+esc(ROOM_LINKED?'From the linked Data Room, read-only':'From your own data-room entries')+'</p></div>'+btn('Engagement','nav:engagement','fr-btn small')+'</div>'+(ROOM_STATE==='restricted'?'<p class="fr-muted">'+(ROOM_LINKED?'Data Room data is unavailable.':'Restricted: you cannot read the data-room tables.')+'</p>':SIGNALS.length?'<ul class="fr-list">'+SIGNALS.slice(0,6).map(s=>'<li><span>'+pill(s.kind==='hot'?'Hot':s.kind==='reopened'?'Re-opened':'Never opened',s.kind==='never'?'amber':'green')+' <strong>'+esc(orgName(s.org))+'</strong><small class="fr-sub">'+esc(s.text)+'</small></span></li>').join('')+'</ul>':'<p class="fr-muted">No engagement signals yet.</p>')+'</section>';
 return body;}

/* ---------- Pipeline ---------- */
function pipeline(){
 let body=heading(null,true)+checks();const round=ROUND[st.round];if(!round)return body+noRound();
 const owners=[...new Set(OPPS.filter(o=>o.round_id===round.id).map(o=>String(o.owner||'')).filter(Boolean))].sort();
 const q=st.query.toLowerCase().trim(),f=st.filters;
 const hidden=OPPS.filter(o=>o.round_id===round.id&&!inPipeline(o.organization_id)).length;
 let list=OPPS.filter(o=>o.round_id===round.id&&inPipeline(o.organization_id));
 if(q)list=list.filter(o=>[orgName(o.organization_id),o.owner,o.next_step].some(v=>String(v||'').toLowerCase().includes(q)));
 if(f.tier)list=list.filter(o=>(PROFILE[o.organization_id]||{}).tier===f.tier);
 if(f.investor_type)list=list.filter(o=>(PROFILE[o.organization_id]||{}).investor_type===f.investor_type);
 if(f.owner)list=list.filter(o=>String(o.owner||'')===f.owner);
 if(f.interest)list=list.filter(o=>o.interest===f.interest);
 body+='<section class="fr-panel"><div class="fr-pad"><div class="fr-panel-head"><div><h2>'+esc(String(round.name||'Round'))+' pipeline</h2><p>'+plural(list.length,'opportunity').replace('opportunitys','opportunities')+' · Move opens a reviewed edit; nothing is saved without your approval.'+(hidden?' '+plural(hidden,'opportunity').replace('opportunitys','opportunities')+' with a proposed or rejected investor not shown.':'')+'</p></div></div>'+
  toolbar('opps','Add opportunity',[{key:'tier',label:'Tier',options:opt(TIERS,{a:'A',b:'B',c:'C'})},{key:'investor_type',label:'Investor type',options:opt(INVESTOR_TYPES,TYPE_LABEL)},{key:'owner',label:'Owner',options:owners.map(o=>[o,o])},{key:'interest',label:'Interest',options:opt(INTEREST)}])+'</div>'+
  '<div class="fr-board-wrap" role="region" aria-label="Pipeline board" tabindex="0"><div class="fr-board" style="grid-template-columns:repeat('+STAGE_ORDER.length+',minmax(240px,1fr))">'+STAGE_ORDER.map(s=>{const l=list.filter(o=>o.stage===s).sort((a,b)=>(num(b.amount_indicated,0)-num(a.amount_indicated,0))||orgName(a.organization_id).localeCompare(orgName(b.organization_id)));
   return '<section class="fr-col" aria-label="'+esc(STAGE_LABEL[s])+'"><h3>'+esc(STAGE_LABEL[s])+' <span>'+l.length+'</span></h3>'+(l.length?l.map(card).join(''):'<p class="fr-muted small">None</p>')+'</section>';}).join('')+'</div></div>'+partialNote('opps')+'</section>';
 return body;}
function partialNote(role){return '<div class="fr-footer"><span>'+esc(partialLabel(role))+'</span></div>';}
function card(o){const p=PROFILE[o.organization_id]||{},dot=engagementDot(o.organization_id),a=amountOf(o);
 return '<article class="fr-card"><div class="fr-card-head"><strong>'+esc(orgName(o.organization_id))+'</strong>'+(dot?'<span class="fr-dot '+dot+'" role="img" aria-label="'+esc(dot==='hot'?'Data room: active this week':dot==='opened'?'Data room: opened':'Data room: access, never opened')+'" title="'+esc(dot==='hot'?'Data room: active this week':dot==='opened'?'Data room: opened':'Data room: access, never opened')+'"></span>':'')+'</div>'+
 '<div class="fr-card-tags">'+(p.tier?pill('Tier '+p.tier.toUpperCase(),'teal'):'')+pill(cap(o.interest),interestTone(o.interest))+(bool(o.is_lead)?pill('Lead','lead'):'')+'</div>'+
 '<div class="fr-card-amt">'+esc(a===null?'No amount':exactMoney(a,o.currency))+'</div>'+(o.next_step||o.next_due?'<div class="fr-card-next">'+esc(String(o.next_step||'Next step')+(o.next_due?' · '+dateLabel(o.next_due):''))+'</div>':'')+
 '<div class="fr-card-actions">'+btn('Details','details:opps:'+o.id,'fr-btn small',false,'aria-label="Details for '+esc(orgName(o.organization_id))+'"')+btn('Move','move:'+o.id,'fr-btn small',!canWrite('opps'),'aria-label="Move '+esc(orgName(o.organization_id))+'"')+'</div></article>';}

/* ---------- Investors ---------- */
const TIER_RANK={a:0,b:1,c:2};const LEAD_RANK={yes:0,sometimes:1,no:2};
function investorRows(){return INVESTOR_ORGS.map(o=>({org:o,p:PROFILE[o.id]||null})).sort((x,y)=>(TIER_RANK[x.p&&x.p.tier]??3)-(TIER_RANK[y.p&&y.p.tier]??3)||(LEAD_RANK[x.p&&x.p.leads_rounds]??3)-(LEAD_RANK[y.p&&y.p.leads_rounds]??3)||String(x.org.data.name||'').localeCompare(String(y.org.data.name||'')));}
function investors(){
 let body=heading(null,true)+checks();const all=investorRows();
 const counts={targets:all.filter(x=>inPipeline(x.org.id)).length,proposed:all.filter(x=>statusOf(x.org.id)==='proposed').length,rejected:all.filter(x=>statusOf(x.org.id)==='rejected').length};
 body+='<div class="fr-seg" role="tablist" aria-label="Investor lists">'+[['targets','Target list'],['proposed','Proposed ('+counts.proposed+')'],['rejected','Rejected ('+counts.rejected+')']].map(x=>btn(esc(x[1]),'inv-tab:'+x[0],'fr-seg-btn',false,'role="tab" aria-selected="'+(st.invTab===x[0])+'"')).join('')+'</div>';
 let rows=all.filter(x=>st.invTab==='targets'?inPipeline(x.org.id):statusOf(x.org.id)===(st.invTab==='proposed'?'proposed':'rejected'));
 const q=st.query.toLowerCase().trim(),f=st.filters;
 if(q)rows=rows.filter(x=>[x.org.data.name,x.p&&x.p.intro_path,x.p&&x.p.notes,x.org.data.country].some(v=>String(v||'').toLowerCase().includes(q)));
 if(f.tier)rows=rows.filter(x=>x.p&&x.p.tier===f.tier);if(f.investor_type)rows=rows.filter(x=>x.p&&x.p.investor_type===f.investor_type);if(f.leads_rounds)rows=rows.filter(x=>x.p&&x.p.leads_rounds===f.leads_rounds);
 for(const k of ['modalities','therapeutic_areas','dev_stages'])if(f[k])rows=rows.filter(x=>x.p&&listOf(x.p[k]).map(v=>v.toLowerCase()).includes(f[k].toLowerCase()));
 const p=paged(rows),cols=visibleCols('investors');
 const intro=st.invTab==='proposed'?'Researched by Claude or ChatGPT with sources and dates. They stay proposed until you accept them; rejected investors never appear in the pipeline.':st.invTab==='rejected'?'Rejected proposals are kept for reference and never appear in the pipeline.':'Ranked by tier, then whether they lead rounds. Investors are shared organizations; their profiles belong to Fundraise.';
 const cell=(k,x)=>{const pr=x.p||{},o=OPPS.find(op=>op.organization_id===x.org.id&&op.round_id===st.round);
  if(k==='name')return '<td><strong>'+esc(x.org.data.name||'Unnamed')+'</strong><small class="fr-sub">'+esc([x.org.data.country,!x.p?'No profile yet':''].filter(Boolean).join(' · '))+'</small></td>';
  if(k==='investor_type')return '<td>'+esc(TYPE_LABEL[pr.investor_type]||'—')+'</td>';
  if(k==='tier')return '<td>'+(pr.tier?pill(pr.tier.toUpperCase(),'teal'):'—')+'</td>';
  if(k==='fit')return '<td><small>'+esc([pr.modalities,pr.therapeutic_areas,pr.dev_stages].filter(Boolean).join(' · ')||'—')+'</small></td>';
  if(k==='cheque')return '<td>'+esc(num(pr.check_min)!==null||num(pr.check_max)!==null?money(num(pr.check_min),pr.currency)+' – '+money(num(pr.check_max),''):'—')+'</td>';
  if(k==='leads_rounds')return '<td>'+esc(cap(pr.leads_rounds||'—'))+'</td>';
  if(k==='fund_vintage_year')return '<td>'+esc(pr.fund_vintage_year||'—')+'</td>';
  if(k==='intro_path')return '<td><small>'+esc(pr.intro_path||'—')+'</small></td>';
  if(k==='in_round')return '<td>'+(o?pill(STAGE_LABEL[o.stage]||o.stage,o.stage==='passed'?'':'blue'):'—')+'</td>';
  return '<td></td>';};
 const actions=x=>{const id=x.org.id,pr=x.p;if(st.invTab==='proposed')return btn('Accept','decide:'+pr.id+':accepted','fr-btn small',!writableField('profiles','profile_status'))+btn('Reject','decide:'+pr.id+':rejected','fr-btn small danger',!writableField('profiles','profile_status'))+btn('History','details:investor:'+id,'fr-btn small');
  if(st.invTab==='rejected')return btn('Accept','decide:'+pr.id+':accepted','fr-btn small',!writableField('profiles','profile_status'))+btn('History','details:investor:'+id,'fr-btn small');
  const inRound=OPPS.some(op=>op.organization_id===id&&op.round_id===st.round);
  return btn('History','details:investor:'+id,'fr-btn small')+(pr?btn('Edit profile','edit:profiles:'+pr.id,'fr-btn small',!canWrite('profiles')):btn('Add profile','add:profiles:'+id,'fr-btn small',!canWrite('profiles')))+(inRound||!ROUND[st.round]?'':btn('Add to round','add:opps:'+id,'fr-btn small',!canWrite('opps')));};
 body+='<section class="fr-panel"><div class="fr-pad"><div class="fr-panel-head"><div><h2>'+esc(st.invTab==='targets'?'Target list':st.invTab==='proposed'?'Proposed investors':'Rejected investors')+'</h2><p>'+esc(intro)+'</p></div></div>'+
  toolbar('orgs',st.invTab==='targets'?'Add investor':'',[{key:'tier',label:'Tier',options:opt(TIERS,{a:'A',b:'B',c:'C'})},{key:'investor_type',label:'Investor type',options:opt(INVESTOR_TYPES,TYPE_LABEL)},{key:'leads_rounds',label:'Leads rounds',options:opt(['yes','sometimes','no'])},{key:'modalities',label:'Modality',options:VOCAB.modalities.map(v=>[v,cap(v)])},{key:'therapeutic_areas',label:'Therapeutic area',options:VOCAB.therapeutic_areas.map(v=>[v,cap(v)])},{key:'dev_stages',label:'Development stage',options:VOCAB.dev_stages.map(v=>[v,cap(v)])}])+'</div>'+
  (p.total?'<div class="fr-scroll" role="region" aria-label="Investors" tabindex="0"><table class="fr-table"><thead><tr>'+cols.map(k=>'<th scope="col">'+esc(colLabel('investors',k))+'</th>').join('')+'<th scope="col" class="fr-actions">Actions</th></tr></thead><tbody>'+p.slice.map(x=>'<tr>'+cols.map(k=>cell(k,x)).join('')+'<td class="fr-actions">'+actions(x)+'</td></tr>').join('')+'</tbody></table></div>':'<div class="fr-none">'+(st.invTab==='targets'?(INVESTOR_ORGS.length?'No investors match.':'No investors yet. Add your own list, or ask Claude or ChatGPT to research and propose investors with sources.'):'None.')+'</div>')+pager(p,partialLabel('profiles'))+'</section>';
 return body;}

/* ---------- Round ---------- */
function round(){
 let body=heading(null,true)+checks();const rd=ROUND[st.round];
 const head='<div class="fr-row">'+btn(icon('plus',15)+' New round','add:rounds','fr-btn',!canWrite('rounds'))+(rd?btn('Edit round','edit:rounds:'+rd.id,'fr-btn fr-btn-primary',!canWrite('rounds')):'')+'</div>';
 if(!rd)return body+noRound();
 const t=roundTotals(rd),lead=leadOf(rd);
 body+='<div class="fr-grid2"><section class="fr-panel fr-pad"><div class="fr-panel-head"><div><h2>Round settings</h2><p>Type, target, currency, dates and the lead</p></div></div>'+kv('Name',rd.name)+kv('Type',ROUND_LABEL[rd.round_type]||cap(rd.round_type))+kv('Status',cap(rd.status))+kv('Target',rd.target_amount!==null&&rd.target_amount!==undefined?exactMoney(num(rd.target_amount),rd.currency):'No target')+kv('Currency',rd.currency)+kv('Opened',dateLabel(rd.opened_on))+kv('Target close',dateLabel(rd.target_close))+(rd.closed_on?kv('Closed',dateLabel(rd.closed_on)):'')+kv('Lead investor',rd.lead_org_id?orgName(rd.lead_org_id):lead?orgName(lead.organization_id):'Not yet chosen')+head+'</section>';
 const synd=t.opps.filter(o=>['signed','verbal'].includes(o.interest)).sort((a,b)=>(a.interest==='signed'?0:1)-(b.interest==='signed'?0:1)||(amountOf(b)||0)-(amountOf(a)||0));const base=t.target||t.raised;
 body+='<section class="fr-panel"><div class="fr-pad"><h2>Syndicate</h2><p class="fr-muted">Signed and verbal commitments; % of '+(t.target?'the round target':'signed total')+'. Only signed counts as raised.</p></div>'+(synd.length?'<div class="fr-scroll" role="region" aria-label="Syndicate" tabindex="0"><table class="fr-table"><thead><tr><th scope="col">Investor</th><th scope="col">Interest</th><th scope="col">Amount</th><th scope="col">% of round</th><th scope="col" class="fr-actions">Actions</th></tr></thead><tbody>'+synd.map(o=>{const a=amountOf(o),other=o.currency!==rd.currency;return '<tr><td><strong>'+esc(orgName(o.organization_id))+'</strong>'+(bool(o.is_lead)?' '+pill('Lead','lead'):'')+'</td><td>'+pill(cap(o.interest),interestTone(o.interest))+'</td><td>'+esc(exactMoney(a,o.currency))+(other?' '+pill('Other currency: excluded','amber'):'')+'</td><td>'+esc(!other&&a!==null&&base?pct(a,base)+'%':'—')+'</td><td class="fr-actions">'+btn('Details','details:opps:'+o.id,'fr-btn small')+(bool(o.is_lead)?'':btn('Mark lead','lead:'+o.id,'fr-btn small',!writableField('opps','is_lead')))+'</td></tr>';}).join('')+'</tbody><tfoot><tr><th scope="row">Raised (signed)</th><td></td><td><strong>'+esc(exact?exactMoney(t.raised,rd.currency):'—')+'</strong></td><td>'+esc(exact&&t.target?pct(t.raised,t.target)+'%':'—')+'</td><td></td></tr></tfoot></table></div>':'<div class="fr-none">No verbal or signed commitments yet.</div>')+'</section></div>';
 body+=currencyFlags(t,rd);
 // Offer comparison: 2–3 term sheets side by side.
 const offers=t.opps.filter(o=>num(o.offer_amount)!==null||o.offer_received_on);const sel=(st.cmp||defaultCompare()).filter(id=>offers.some(o=>o.id===id));const cmp=sel.map(id=>OPP[id]);
 const line=(lbl,fn)=>'<tr><th scope="row">'+esc(lbl)+'</th>'+cmp.map(o=>'<td>'+fn(o)+'</td>').join('')+'</tr>';
 body+='<section class="fr-panel"><div class="fr-pad"><div class="fr-panel-head"><div><h2>Offer comparison</h2><p>Choose up to three offers. Light term-sheet fields only; legal terms stay in the documents.</p></div></div>'+(offers.length?'<div class="fr-checks">'+offers.map(o=>'<label class="fr-check"><input type="checkbox" name="cmp_'+esc(o.id)+'" value="true" data-ui-state="true" data-action="cmp:'+esc(o.id)+'"'+(sel.includes(o.id)?' checked':'')+'> '+esc(orgName(o.organization_id))+'</label>').join('')+'</div>':'')+'</div>'+
  (cmp.length?'<div class="fr-scroll" role="region" aria-label="Offer comparison" tabindex="0"><table class="fr-table fr-compare"><thead><tr><th scope="col">Term</th>'+cmp.map(o=>'<th scope="col">'+esc(orgName(o.organization_id))+'</th>').join('')+'</tr></thead><tbody>'+
   line('Amount',o=>esc(exactMoney(num(o.offer_amount),o.currency)))+line('Pre-money',o=>esc(exactMoney(num(o.offer_pre_money),o.currency)))+line('Post-money',o=>esc(num(o.offer_amount)!==null&&num(o.offer_pre_money)!==null?exactMoney(num(o.offer_amount)+num(o.offer_pre_money),o.currency):'—'))+line('Instrument',o=>esc(cap(o.offer_instrument||'—')))+line('Tranches',o=>esc(String(o.offer_notes||'').match(/tranch/i)?String(o.offer_notes).slice(0,120):'See round tranches'))+line('Board seat',o=>esc(o.offer_board_seat===undefined||o.offer_board_seat===null?'—':bool(o.offer_board_seat)?'Yes':'No'))+line('Expires',o=>esc(dateLabel(o.offer_expires_on))+(o.offer_expires_on&&AS_OF&&o.offer_expires_on<AS_OF?' '+pill('Expired','red'):''))+line('Status',o=>o.offer_status?pill(cap(o.offer_status),o.offer_status==='accepted'?'green':o.offer_status==='declined'||o.offer_status==='expired'?'':'blue'):'—')+line('Lead',o=>bool(o.is_lead)?pill('Lead','lead'):btn('Mark lead','lead:'+o.id,'fr-btn small',!writableField('opps','is_lead'),'aria-label="Mark '+esc(orgName(o.organization_id))+' as lead"'))+
   '</tbody></table></div>':'<div class="fr-none">'+(offers.length?'Choose offers to compare.':'No offers recorded in this round yet. Record an offer on the opportunity (Edit → Offer).')+'</div>')+'</section>';
 // Tranches tied to milestones.
 const tr=TRANCHES.filter(x=>x.round_id===rd.id).sort((a,b)=>a.tranche_no-b.tranche_no);const trTotal=tr.filter(x=>x.currency===rd.currency).reduce((n,x)=>n+num(x.amount,0),0);
 body+='<section class="fr-panel"><div class="fr-pad"><div class="fr-panel-head"><div><h2>Tranches</h2><p>Conditions and milestones for each tranche. Published read-only for Runway and Investor Updates.</p></div>'+btn(icon('plus',15)+' Add tranche','add:tranches','fr-btn',!canWrite('tranches'))+'</div></div>'+
  (tr.length?'<div class="fr-scroll" role="region" aria-label="Tranches" tabindex="0"><table class="fr-table"><thead><tr><th scope="col">No.</th><th scope="col">Amount</th><th scope="col">Condition</th><th scope="col">Milestone</th><th scope="col">Expected</th><th scope="col">Status</th><th scope="col">On track</th><th scope="col" class="fr-actions">Actions</th></tr></thead><tbody>'+tr.map(x=>{const k=trancheTrack(x);return '<tr><td>'+esc(x.tranche_no)+'</td><td>'+esc(exactMoney(num(x.amount),x.currency))+(x.currency!==rd.currency?' '+pill('Other currency','amber'):'')+'</td><td>'+esc(x.condition||'—')+'</td><td>'+esc(mileName(x.milestone_id))+'</td><td>'+esc(dateLabel(x.expected_on))+'</td><td>'+pill(cap(x.status),x.status==='met'||x.status==='released'?'green':x.status==='missed'?'red':'')+'</td><td>'+pill(k.text,k.tone)+'</td><td class="fr-actions">'+btn('Edit','edit:tranches:'+x.id,'fr-btn small',!canWrite('tranches'),'aria-label="Edit tranche '+esc(x.tranche_no)+'"')+'</td></tr>';}).join('')+'</tbody><tfoot><tr><th scope="row">Total</th><td><strong>'+esc(exactMoney(trTotal,rd.currency))+'</strong></td><td colspan="6">'+(t.target?esc(pct(trTotal,t.target)+'% of target'):'')+'</td></tr></tfoot></table></div>':'<div class="fr-none">No tranches. Add them when the lead proposes milestone-based tranches.</div>')+'</section>';
 body+=milestonesPanel();
 return body;}
function milestonesPanel(){const own=!linked('miles'),list=MILES.slice().sort((a,b)=>(bool(b.is_key)?1:0)-(bool(a.is_key)?1:0)||String(a.end_date).localeCompare(String(b.end_date)));
 const src=R.miles.unbound?'<p class="fr-muted">This app has no milestones table, so tranches show "no milestone".</p>':R.miles.unavailable?'<p class="fr-muted">Milestones are not readable for you; tranche status shows "Milestone not readable".</p>':'';
 return '<section class="fr-panel fr-pad"><div class="fr-panel-head"><div><h2>Milestones for tranche conditions</h2><p>'+esc(own?'Your own milestone entries (program, milestone, date, status).':'From Programs (plan items), read-only here. Key milestones first.')+'</p></div>'+(own?btn(icon('plus',15)+' Add milestone','add:miles','fr-btn',!canWrite('miles')):'')+'</div>'+src+
 (list.length?'<ul class="fr-list">'+list.slice(0,30).map(m=>'<li><span><strong>'+esc(m.name||'Unnamed')+'</strong>'+(bool(m.is_key)?' '+pill('Key','teal'):'')+'<small class="fr-sub">'+esc((own?String(m.program_id||''):'Programs')+' · '+dateLabel(m.end_date))+'</small></span><span>'+pill(cap(m.status||'planned'),m.status==='done'?'green':m.status==='at_risk'?'red':'')+(own?' '+btn('Edit','edit:miles:'+m.id,'fr-btn small',!canWrite('miles'),'aria-label="Edit '+esc(m.name||'milestone')+'"'):'')+'</span></li>').join('')+'</ul>':R.miles.unbound||R.miles.unavailable?'':'<p class="fr-muted">No milestones yet.</p>')+integrationLine('miles')+'</section>';}

/* ---------- Activity ---------- */
function activity(){
 let body=heading(null,true)+checks();const rd=ROUND[st.round];
 const q=st.query.toLowerCase().trim(),f=st.filters;
 // Scoped to the selected round unless "All rounds" is chosen.
 let rows=rd&&f.scope!=='all'?ACTS.filter(a=>{const o=OPP[a.opportunity_id];return !!o&&o.round_id===rd.id;}):ACTS.slice();
 if(q)rows=rows.filter(a=>[a.summary,a.outcome,orgName((OPP[a.opportunity_id]||{}).organization_id)].some(v=>String(v||'').toLowerCase().includes(q)));
 if(f.kind)rows=rows.filter(a=>a.kind===f.kind);
 rows=rows.sort((a,b)=>String(b.activity_on).localeCompare(String(a.activity_on)));
 const p=paged(rows),cols=visibleCols('activity');
 const cell=(k,a)=>{const o=OPP[a.opportunity_id];
  if(k==='activity_on')return '<td>'+esc(dateLabel(a.activity_on))+'</td>';if(k==='investor')return '<td><strong>'+esc(o?orgName(o.organization_id):'Opportunity unavailable')+'</strong><small class="fr-sub">'+esc(a.contact_id?personName(a.contact_id):'')+'</small></td>';
  if(k==='kind')return '<td>'+esc(cap(a.kind))+(a.source==='assistant'?' '+pill('Assistant','teal'):'')+'</td>';if(k==='summary')return '<td>'+esc(String(a.summary||'').slice(0,160))+'</td>';if(k==='outcome')return '<td>'+esc(String(a.outcome||'—').slice(0,120))+'</td>';
  if(k==='follow_up_due')return '<td>'+(a.follow_up_due?esc(dateLabel(a.follow_up_due))+(openFollowUp(a)?'':' '+pill('Done','green')):'—')+'</td>';return '<td></td>';};
 body+='<section class="fr-panel"><div class="fr-pad"><div class="fr-panel-head"><div><h2>Activity log</h2><p>'+esc(rd&&f.scope!=='all'?'Activities in '+String(rd.name||'this round'):'Activities across all rounds')+'. Claude or ChatGPT can propose entries from your connected mail or calendar; you review each one.</p></div></div>'+
  toolbar('acts','Log activity',[{key:'kind',label:'Kind',options:opt(ACT_KINDS)},{key:'scope',label:'Rounds',options:[['all','All rounds']]}])+'</div>'+
  (p.total?'<div class="fr-scroll" role="region" aria-label="Activity log" tabindex="0"><table class="fr-table"><thead><tr>'+cols.map(k=>'<th scope="col">'+esc(colLabel('activity',k))+'</th>').join('')+'<th scope="col" class="fr-actions">Actions</th></tr></thead><tbody>'+p.slice.map(a=>'<tr>'+cols.map(k=>cell(k,a)).join('')+'<td class="fr-actions">'+btn('Edit','edit:acts:'+a.id,'fr-btn small',!canWrite('acts'),'aria-label="Edit activity of '+esc(dateLabel(a.activity_on))+'"')+'</td></tr>').join('')+'</tbody></table></div>':'<div class="fr-none">'+(ACTS.length?'No activities match.':'No activities logged yet.')+'</div>')+pager(p,partialLabel('acts'))+'</section>';
 const due=rd?staleAndDue(rd).filter(x=>x.kind!=='stale'):[];
 const pp=passPatterns(rd&&rd.id),pa=passPatterns(null);
 const patternText=pt=>pt.total?pt.counts.map(([k,n])=>n+' of '+pt.total+' passes: '+label(k)).join('; '):'No passes recorded.';
 body+='<div class="fr-grid2"><section class="fr-panel fr-pad"><div class="fr-panel-head"><div><h2>Follow-ups due</h2><p>Next steps and activity follow-ups due by '+esc(dateLabel(addDays(AS_OF,6)))+', overdue first</p></div></div>'+(due.length?'<ul class="fr-list">'+due.map(x=>'<li><span>'+pill(x.kind==='overdue'?'Overdue':'Due',x.kind==='overdue'?'red':'amber')+' <strong>'+esc(x.name)+'</strong><small class="fr-sub">'+esc(x.text+' · '+dateLabel(x.date))+'</small></span>'+btn('Open',x.act,'fr-btn small',false,'aria-label="Open '+esc(x.name)+'"')+'</li>').join('')+'</ul>':'<p class="fr-muted">No follow-ups due.</p>')+'</section>'+
  '<section class="fr-panel fr-pad"><div class="fr-panel-head"><div><h2>Pass reasons</h2><p>What to fix before the next wave</p></div></div><h3 class="fr-h3">This round</h3><p class="fr-commentary">'+esc(patternText(pp))+'</p><h3 class="fr-h3">All rounds</h3><p class="fr-commentary">'+esc(patternText(pa))+'</p>'+(pp.total?'<ul class="fr-list plain">'+OPPS.filter(o=>o.stage==='passed'&&rd&&o.round_id===rd.id).slice(0,10).map(o=>'<li><span><strong>'+esc(orgName(o.organization_id))+'</strong><small class="fr-sub">'+esc(label(o.pass_reason||'unspecified')+(o.pass_detail?': '+o.pass_detail:''))+'</small></span></li>').join('')+'</ul>':'')+'</section></div>';
 return body;}

/* ---------- Engagement ---------- */
function engagement(){
 let body=heading()+checks();
 const own=!ROOM_LINKED,src=own?'Your own entries: typed in, or proposed by the assistant from DocSend or ShareVault reports.':'From the linked Data Room, read-only. Give or revoke access in the Data Room app.';
 if(ROOM_STATE==='restricted')return body+(ROOM_LINKED?'<section class="fr-panel fr-pad"><h2>Data Room data is unavailable</h2><p class="fr-muted">The linked Data Room tables cannot be read (deleted, or restricted for you), so engagement is not shown. Fundraise keeps working; your earlier own entries stay in Database.</p></section>':'<section class="fr-panel fr-pad"><h2>Restricted</h2><p class="fr-muted">You cannot read the data-room tables, so engagement is not shown. Ask the owner for access.</p></section>');
 const gp=GRANTS.slice().sort((a,b)=>orgName(a.organization_id).localeCompare(orgName(b.organization_id)));
 body+='<section class="fr-panel"><div class="fr-pad"><div class="fr-panel-head"><div><h2>Access by investor</h2><p>'+esc(src)+'</p></div>'+(own?btn(icon('plus',15)+' Record access','add:grants','fr-btn',!canWrite('grants')):'')+'</div>'+roomLine()+'</div>'+
  (R.grants.unbound?'<div class="fr-none">This app has no data-room access table.</div>':gp.length?'<div class="fr-scroll" role="region" aria-label="Data-room access" tabindex="0"><table class="fr-table"><thead><tr><th scope="col">Investor</th><th scope="col">Person</th><th scope="col">Room</th><th scope="col">Status</th><th scope="col">Granted</th><th scope="col">Expires</th><th scope="col">Agreement</th>'+(own?'<th scope="col" class="fr-actions">Actions</th>':'')+'</tr></thead><tbody>'+gp.map(g=>'<tr><td><strong>'+esc(orgName(g.organization_id))+'</strong></td><td>'+esc(personName(g.person_id))+'</td><td>'+esc(g.room_name||g.room_id||'—')+'<small class="fr-sub">'+esc(cap(g.room_purpose||''))+'</small></td><td>'+pill(cap(g.status||'—'),g.status==='active'?'green':g.status==='invited'?'blue':'')+'</td><td>'+esc(dateLabel(g.granted_on))+'</td><td>'+esc(dateLabel(g.expires_on))+'</td><td>'+esc(validDate(g.agreement_accepted_on)?'Accepted '+dateLabel(validDate(g.agreement_accepted_on)):'—')+'</td>'+(own?'<td class="fr-actions">'+btn('Edit','edit:grants:'+g.id,'fr-btn small',!canWrite('grants'),'aria-label="Edit access of '+esc(orgName(g.organization_id))+'"')+'</td>':'')+'</tr>').join('')+'</tbody></table></div>':'<div class="fr-none">No data-room access recorded yet.</div>')+partialNote('grants')+'</section>';
 const vp=paged(VIEWS.slice().sort((a,b)=>String(b.last_viewed_on||'').localeCompare(String(a.last_viewed_on||''))));
 body+='<section class="fr-panel"><div class="fr-pad"><div class="fr-panel-head"><div><h2>Views by investor and document</h2><p>First and last view, view count and time where available</p></div>'+(own?btn(icon('plus',15)+' Record views','add:views','fr-btn',!canWrite('views')):'')+'</div></div>'+
  (R.views.unbound?'<div class="fr-none">This app has no data-room views table.</div>':vp.total?'<div class="fr-scroll" role="region" aria-label="Data-room views" tabindex="0"><table class="fr-table"><thead><tr><th scope="col">Investor</th><th scope="col">Document</th><th scope="col">First view</th><th scope="col">Last view</th><th scope="col">Views</th><th scope="col">Time</th><th scope="col">Source</th>'+(own?'<th scope="col" class="fr-actions">Actions</th>':'')+'</tr></thead><tbody>'+vp.slice.map(v=>'<tr><td><strong>'+esc(orgName(v.organization_id))+'</strong><small class="fr-sub">'+esc(v.person_id?personName(v.person_id):'')+'</small></td><td>'+esc(v.document_title||v.document_ref||'—')+'</td><td>'+esc(dateLabel(v.first_viewed_on))+'</td><td>'+esc(dateLabel(v.last_viewed_on))+'</td><td>'+esc(v.view_count)+'</td><td>'+esc(num(v.seconds_viewed)!==null?Math.round(num(v.seconds_viewed)/60)+' min':'—')+'</td><td>'+esc(cap(v.source||'—'))+'</td>'+(own?'<td class="fr-actions">'+btn('Edit','edit:views:'+v.id,'fr-btn small',!canWrite('views'),'aria-label="Edit views of '+esc(orgName(v.organization_id))+'"')+'</td>':'')+'</tr>').join('')+'</tbody></table></div>':'<div class="fr-none">No views recorded yet.</div>')+pager(vp,partialLabel('views'))+'</section>';
 body+='<section class="fr-panel fr-pad"><div class="fr-panel-head"><div><h2>Signals</h2><p>Hot: 3 or more views in the last 7 days. Never opened: active access without views. Re-opened: a view after 14 days or more without one.</p></div></div>'+(SIGNALS.length?'<ul class="fr-list">'+SIGNALS.map(s=>{const o=OPPS.find(x=>x.organization_id===s.org&&x.round_id===st.round);return '<li><span>'+pill(s.kind==='hot'?'Hot':s.kind==='reopened'?'Re-opened':'Never opened',s.kind==='never'?'amber':'green')+' <strong>'+esc(orgName(s.org))+'</strong><small class="fr-sub">'+esc(s.text)+'</small></span>'+(o?btn('Log follow-up','add:acts:'+o.id,'fr-btn small',!canWrite('acts'),'aria-label="Log follow-up with '+esc(orgName(s.org))+'"'):'')+'</li>';}).join('')+'</ul>':'<p class="fr-muted">No signals yet.</p>')+
  '<h3 class="fr-h3">Diligence depth</h3>'+(ENG_ORGS.length?'<ul class="fr-list plain">'+ENG_ORGS.map(o=>{const d=signalsFor(o).find(s=>s.kind==='depth');return '<li><span>'+esc(orgName(o))+'</span><span>'+esc(d?d.text:'No documents viewed')+'</span></li>';}).join('')+'</ul><p class="fr-muted">Documents viewed per investor. The share of documents shared is not in the dataroom.v1 contract, so it is not computed.</p>':'<p class="fr-muted">No access or views yet.</p>')+'</section>';
 return body;}

/* ---------- Settings ---------- */
function settingsScreen(){
 let body=heading()+checks();const s=settingsRow;
 body+='<div class="fr-grid2"><section class="fr-panel fr-pad"><div class="fr-panel-head"><div><h2>Fundraise settings</h2><p>Stored in the Fundraise settings table; changes are reviewed.</p></div>'+btn(s?'Edit settings':'Create settings','edit-settings','fr-btn fr-btn-primary',!canWrite('settings'))+'</div>'+
  kv('Stages',STAGE_ORDER.map(x=>STAGE_LABEL[x]).join(', '))+kv('Pass reasons',PASS_ORDER.map(label).join(', '))+kv('Stale after',plural(STALE_DAYS,'day'))+kv('Default currency',DEFAULT_CURRENCY)+kv('Modalities',VOCAB.modalities.join(', ')||'Not set')+kv('Therapeutic areas',VOCAB.therapeutic_areas.join(', ')||'Not set')+kv('Development stages',VOCAB.dev_stages.join(', ')||'Not set')+(!s?'<p class="fr-muted">No settings saved yet; defaults are shown.</p>':'')+'</section>';
 const srcLine=(role,name)=>{const i=integ(role),r=R[role];return '<li><span><strong>'+esc(name)+'</strong><small class="fr-sub">'+esc(r.unbound?'Not connected':r.unavailable?'Restricted: not readable for you':linked(role)?'From '+(i&&i.provider?i.provider:'the providing app')+', read-only':'Your own entries in Fundraise'+(i&&i.chosen?' (chosen)':''))+'</small></span></li>';};
 body+='<section class="fr-panel fr-pad"><h2>Where data comes from</h2><ul class="fr-list plain">'+srcLine('grants','Data-room access')+srcLine('views','Data-room views')+srcLine('miles','Milestones for tranches')+'<li><span><strong>Investors and contacts</strong><small class="fr-sub">Shared organizations and people tables, also used by other apps</small></span></li><li><span><strong>Tranches</strong><small class="fr-sub">Published read-only for Runway (cash-in) and Investor Updates</small></span></li></ul>'+roomLine()+integrationLine('miles')+'</section></div>';
 body+='<section class="fr-panel fr-pad"><h2>Access, automations and links</h2><ul class="fr-list plain"><li><span><strong>Access</strong>: TrialAgents sidebar → Access → Projects → this app. Investor data and amounts are confidential: share with co-founders and the board explicitly, read-only where appropriate.</span></li><li><span><strong>Automations</strong>: TrialAgents sidebar → Automations. Optional: weekly round digest, signed commitment notice, investor research. The app never waits for them.</span></li><li><span><strong>Layout</strong>: the gear reorders, renames or hides screens and columns through a reviewed app update.</span></li><li><span><strong>As-of date</strong>: '+esc(AS_OF_SOURCE==='today'?'today\'s date from the app runtime.':AS_OF_SOURCE==='pinned'?'fixed for this preview ('+dateLabel(AS_OF)+').':'set with the as-of control.')+'</span></li></ul></section>';
 return body;}

/* ---------- overlays ---------- */
function refOptions(f,x){const cur=String(x.draft[f.key]||'');let rows;
 if(f.ref==='orgs')rows=(x.role==='profiles'||x.role==='opps'||x.role==='rounds'?INVESTOR_ORGS.filter(o=>x.role!=='opps'||inPipeline(o.id)):R.orgs.rows).map(o=>({id:o.id,name:String(o.data.name||'Unnamed')}));
 else if(f.ref==='people'){const org=x.draft.organization_id||(x.role==='acts'&&OPP[x.draft.opportunity_id]?OPP[x.draft.opportunity_id].organization_id:'');rows=PEOPLE.filter(p=>!org||p.organization_id===org).map(p=>({id:p.id,name:String(p.name||'Unnamed')+(p.title?' · '+p.title:'')}));}
 else if(f.ref==='rounds')rows=ROUNDS.map(r=>({id:r.id,name:String(r.name||'Unnamed')}));
 else if(f.ref==='opps')rows=OPPS.filter(o=>inPipeline(o.organization_id)).map(o=>({id:o.id,name:oppTitle(o)})).sort((a,b)=>a.name.localeCompare(b.name));
 else if(f.ref==='grants')rows=GRANTS.map(g=>({id:g.id,name:orgName(g.organization_id)+(g.room_name?' · '+g.room_name:'')}));
 else if(f.ref==='miles')rows=MILES.map(m=>({id:m.id,name:String(m.name||'Unnamed')+(m.end_date?' · '+dateLabel(m.end_date):'')+(bool(m.is_key)?' · key':'')}));
 else rows=[];
 const keep=cur&&!rows.some(r=>r.id===cur);
 return '<option value="">'+(f.required?'Choose…':'None')+'</option>'+(keep?'<option value="'+esc(cur)+'" selected>'+esc(f.ref==='orgs'?orgName(cur):f.ref==='people'?personName(cur):f.ref==='rounds'?roundName(cur):f.ref==='opps'?oppTitle(OPP[cur]):f.ref==='miles'?mileName(cur):'Current value')+'</option>':'')+rows.map(r=>'<option value="'+esc(r.id)+'"'+(cur===r.id?' selected':'')+'>'+esc(r.name)+'</option>').join('');}
function editorPanel(){const x=st.editor;if(!x)return '';const role=x.role,m=roleMap[role];
 const title=(x.mode==='edit'?'Edit ':'Add ')+ROLE_LABEL[role];
 const fields=S[role].filter(f=>!['auto','frozen'].includes(f.kind)&&f.key!=='archived'&&m&&m.fields[f.key]);
 const control=f=>{const v=x.draft[f.key]??'',id='fr-f-'+f.key,dis=!writableField(role,f.key)?' disabled':'';const common=' id="'+id+'" name="'+f.key+'" data-ui-state="true" data-action="draft:'+f.key+'"'+dis+(f.required?' required':'');
  if(f.kind==='select')return '<select class="fr-input"'+common+'><option value="">Choose…</option>'+f.options.filter(o=>f.key!=='pass_reason'||PASS_ORDER.includes(o)||o===v).filter(o=>f.key!=='stage'||STAGE_ORDER.includes(o)||o===v).map(o=>'<option value="'+esc(o)+'"'+(String(v)===o?' selected':'')+'>'+esc(f.key==='stage'?STAGE_LABEL[o]:f.key==='investor_type'?TYPE_LABEL[o]:f.key==='round_type'?ROUND_LABEL[o]:f.key==='tier'?o.toUpperCase():cap(o))+'</option>').join('')+'</select>';
  if(f.kind==='ref')return '<select class="fr-input"'+common+'>'+refOptions(f,x)+'</select>';
  if(f.kind==='longtext')return '<textarea class="fr-textarea"'+common+'>'+esc(v)+'</textarea>';
  if(f.kind==='boolean')return '<select class="fr-input"'+common+'><option value="false"'+(!bool(v)?' selected':'')+'>No</option><option value="true"'+(bool(v)?' selected':'')+'>Yes</option></select>';
  const type=f.kind==='date'?'date':f.kind==='number'||f.kind==='money'?'number':'text';const val=f.kind==='date'?(validDate(v)||String(v||'')):v;
  return '<input class="fr-input" type="'+type+'"'+common+(f.kind==='number'?' step="1"':f.kind==='money'?' step="any" min="0"':'')+' value="'+esc(val)+'">';};
 const changed=JSON.stringify(x.draft)!==x.initial||x.mode==='create';
 let lead='';
 if(role==='opps')lead='<div class="fr-banner info">Only signed commitments count as raised. Mark the lead from the Round screen. Amounts in another currency than the round are flagged and excluded, never converted.</div>';
 if(role==='acts')lead='<div class="fr-banner info">Saving also sets the opportunity\'s last activity date in the same review.</div>';
 if(role==='orgs')lead='<div class="fr-banner info">Adds an organization to the shared organizations table as an investor. Add its investor profile next.</div>';
 if(role==='profiles'&&x.mode==='create')lead='<div class="fr-banner info">Profiles you add are accepted. Profiles researched by an assistant arrive as proposed for you to accept or reject.</div>';
 let rows='',group='';for(const f of fields){if(f.g&&f.g!==group){group=f.g;rows+='<h3 class="fr-h3 wide">'+esc(group)+'</h3>';}rows+='<label class="fr-field'+(f.kind==='longtext'?' wide':'')+'" for="fr-f-'+f.key+'">'+esc(f.label)+(f.required?' *':'')+control(f)+'</label>';}
 return '<div class="fr-overlay"><section class="fr-drawer" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="fr-drawer-head"><div><div class="fr-eyebrow">Reviewed data change</div><h2>'+esc(cap(title))+'</h2></div>'+btn(icon('close',17),'cancel-modal','fr-icon-btn',false,'aria-label="Close editor"')+'</div><form data-action="save-record" class="fr-drawer-form"><div class="fr-drawer-body"><div class="fr-banner info">Edits are proposals until you approve the TrialAgents review. Opening this form changes nothing.</div>'+lead+'<div class="fr-pair">'+rows+'</div></div><div class="fr-drawer-foot"><span class="fr-muted">'+(JSON.stringify(x.draft)!==x.initial?'Unsaved changes':'No changes yet')+'</span>'+btn('Cancel','cancel-modal')+'<button type="submit" class="fr-btn fr-btn-primary"'+(changed&&canWrite(role)?'':' disabled')+'>Prepare reviewed save</button></div></form></section></div>';}
function detailPanel(){const d=st.detail;if(!d)return '';
 if(d.role==='investor'){const o=lookup('orgs',d.id);if(!o)return '';const pr=PROFILE[d.id],ops=OPPS.filter(x=>x.organization_id===d.id),ppl=PEOPLE.filter(p=>p.organization_id===d.id);
  return drawer('Investor history',String(o.data.name||'Investor'),(pr?kv('Profile',cap(pr.profile_status))+kv('Type',TYPE_LABEL[pr.investor_type]||'—')+kv('Tier',pr.tier?pr.tier.toUpperCase():'—')+kv('Cheque',money(num(pr.check_min),pr.currency)+' – '+money(num(pr.check_max),''))+kv('Leads rounds',cap(pr.leads_rounds||'—'))+kv('Intro path',pr.intro_path)+(pr.source?kv('Source',pr.source+(pr.source_date?' ('+dateLabel(validDate(pr.source_date))+')':'')):''):'<p class="fr-muted">No investor profile yet.</p>')+
   '<h3 class="fr-h3">Rounds</h3>'+(ops.length?'<ul class="fr-list">'+ops.map(x=>'<li><span><strong>'+esc(roundName(x.round_id))+'</strong><small class="fr-sub">'+esc(STAGE_LABEL[x.stage]+' · '+cap(x.interest)+(x.stage==='passed'?' · '+label(x.pass_reason||'unspecified'):''))+'</small></span><span>'+esc(exactMoney(amountOf(x),x.currency))+'</span></li>').join('')+'</ul>':'<p class="fr-muted">Not in any round yet.</p>')+
   '<h3 class="fr-h3">Contacts</h3>'+(ppl.length?'<ul class="fr-list plain">'+ppl.map(p=>'<li><span>'+esc(p.name||'')+'<small class="fr-sub">'+esc([p.title,p.email].filter(Boolean).join(' · '))+'</small></span></li>').join('')+'</ul>':'<p class="fr-muted">No contacts yet.</p>'),
   btn('Add contact','add:people:'+d.id,'fr-btn',!canWrite('people')));}
 if(d.role!=='opps')return '';const o=OPP[d.id];if(!o)return '';
 const acts=ACTS.filter(a=>a.opportunity_id===o.id).sort((a,b)=>String(b.activity_on).localeCompare(String(a.activity_on)));const ppl=PEOPLE.filter(p=>p.organization_id===o.organization_id);
 const gs=GRANTS.filter(g=>g.organization_id===o.organization_id),vs=VIEWS.filter(v=>v.organization_id===o.organization_id),sig=signalsFor(o.organization_id);
 const dd=o.stage==='due_diligence'&&!gs.length&&ROOM_STATE==='ok'?'<div class="fr-banner warn">This investor is in due diligence without data-room access. '+(ROOM_LINKED?'Give access in the Data Room app.':btn('Record access','add:grants:'+o.organization_id,'fr-btn small',!canWrite('grants')))+'</div>':'';
 const body=kv('Round',roundName(o.round_id))+kv('Stage',STAGE_LABEL[o.stage]||o.stage)+kv('Interest',cap(o.interest))+kv('Amount indicated',exactMoney(num(o.amount_indicated),o.currency))+kv('Amount committed',exactMoney(num(o.amount_committed),o.currency))+kv('Lead',bool(o.is_lead)?'Yes':'No')+kv('Owner',o.owner)+kv('Next step',String(o.next_step||'—')+(o.next_due?' · '+dateLabel(o.next_due):''))+kv('Last activity',dateLabel(o.last_activity_on))+kv('CDA/NDA',cap(o.cda_status||'none')+(validDate(o.cda_signed_on)?' · '+dateLabel(validDate(o.cda_signed_on)):''))+(o.stage==='passed'?kv('Pass reason',label(o.pass_reason||'unspecified')+(o.pass_detail?': '+o.pass_detail:'')):'')+dd+
  '<h3 class="fr-h3">Contacts</h3>'+(ppl.length?'<ul class="fr-list plain">'+ppl.map(p=>'<li><span>'+esc(p.name||'')+(p.id===o.primary_contact_id?' '+pill('Primary','teal'):'')+'<small class="fr-sub">'+esc([p.title,p.email].filter(Boolean).join(' · '))+'</small></span></li>').join('')+'</ul>':'<p class="fr-muted">No contacts yet.</p>')+btn('Add contact','add:people:'+o.organization_id,'fr-btn small',!canWrite('people'))+
  '<h3 class="fr-h3">Activity</h3>'+(acts.length?'<ul class="fr-list">'+acts.slice(0,8).map(a=>'<li><span><strong>'+esc(cap(a.kind))+'</strong> · '+esc(dateLabel(a.activity_on))+'<small class="fr-sub">'+esc(String(a.summary||'').slice(0,140)+(a.outcome?' → '+a.outcome:''))+'</small></span></li>').join('')+'</ul>':'<p class="fr-muted">No activity yet.</p>')+btn('Log activity','add:acts:'+o.id,'fr-btn small',!canWrite('acts'))+
  '<h3 class="fr-h3">Offer</h3>'+(num(o.offer_amount)!==null||o.offer_received_on?kv('Amount',exactMoney(num(o.offer_amount),o.currency))+kv('Pre-money',exactMoney(num(o.offer_pre_money),o.currency))+kv('Instrument',cap(o.offer_instrument||'—'))+kv('Board seat',o.offer_board_seat===undefined||o.offer_board_seat===null?'—':bool(o.offer_board_seat)?'Yes':'No')+kv('Expires',dateLabel(o.offer_expires_on))+kv('Status',cap(o.offer_status||'—')):'<p class="fr-muted">No offer recorded.</p>')+
  '<h3 class="fr-h3">Data room</h3>'+(ROOM_STATE==='restricted'?'<p class="fr-muted">Restricted.</p>':(gs.length?gs.map(g=>kv('Access',cap(g.status||'—')+(g.room_name?' · '+g.room_name:''))).join(''):'<p class="fr-muted">No access recorded.</p>')+(vs.length?kv('Views',String(vs.reduce((n,v)=>n+v.view_count,0))+' across '+plural(new Set(vs.map(v=>v.document_ref||v.document_title)).size,'document')):'')+(sig.filter(s=>s.kind!=='depth').map(s=>'<p class="fr-commentary">'+esc(s.text)+'</p>').join('')));
 return drawer('Opportunity',orgName(o.organization_id),body,btn('Move','move:'+o.id,'fr-btn',!canWrite('opps'))+(bool(o.is_lead)?'':btn('Mark lead','lead:'+o.id,'fr-btn',!writableField('opps','is_lead')))+btn('Edit','edit:opps:'+o.id,'fr-btn fr-btn-primary',!canWrite('opps')));}
function drawer(eyebrow,title,body,actions){return '<div class="fr-overlay"><section class="fr-drawer" role="dialog" aria-modal="true" aria-label="'+esc(eyebrow)+'"><div class="fr-drawer-head"><div><div class="fr-eyebrow">'+esc(eyebrow)+'</div><h2>'+esc(title)+'</h2></div>'+btn(icon('close',17),'close-details','fr-icon-btn',false,'aria-label="Close details"')+'</div><div class="fr-drawer-body">'+body+'</div><div class="fr-drawer-foot">'+btn('Close','close-details')+(actions||'')+'</div></section></div>';}
function movePanel(){const mv=st.move;if(!mv)return '';const o=OPP[mv.id];if(!o)return '';const sel=(name,val,opts)=>'<select class="fr-input" id="fr-m-'+name+'" name="'+name+'" data-ui-state="true" data-action="move-draft">'+opts.map(x=>'<option value="'+esc(x[0])+'"'+(String(val||'')===x[0]?' selected':'')+'>'+esc(x[1])+'</option>').join('')+'</select>';
 return '<div class="fr-overlay center"><section class="fr-modal" role="dialog" aria-modal="true" aria-label="Move opportunity"><h2>Move '+esc(orgName(o.organization_id))+'</h2><p class="fr-muted">Currently '+esc(STAGE_LABEL[o.stage])+', interest '+esc(o.interest)+'. Nothing changes until you approve the review.</p><form data-action="move-submit"><div class="fr-pair"><label class="fr-field" for="fr-m-stage">Stage'+sel('stage',mv.draft.stage,STAGE_ORDER.concat(STAGES.filter(s=>!STAGE_ORDER.includes(s)&&s===o.stage)).map(s=>[s,STAGE_LABEL[s]]))+'</label><label class="fr-field" for="fr-m-interest">Interest'+sel('interest',mv.draft.interest,INTEREST.map(i=>[i,cap(i)]))+'</label>'+
  (mv.draft.stage==='passed'?'<label class="fr-field" for="fr-m-pass_reason">Pass reason *'+sel('pass_reason',mv.draft.pass_reason,[['','Choose…']].concat(PASS_ORDER.map(p=>[p,cap(p)])))+'</label><label class="fr-field" for="fr-m-pass_detail">Detail<input class="fr-input" id="fr-m-pass_detail" name="pass_detail" data-ui-state="true" data-action="move-draft" value="'+esc(mv.draft.pass_detail||'')+'"></label>':'')+'</div>'+
  (mv.draft.interest==='signed'&&o.interest!=='signed'?'<div class="fr-banner warn">Signed counts as raised. Enter the committed amount on the opportunity if it is missing.</div>':'')+'<div class="fr-row end">'+btn('Cancel','cancel-modal')+'<button type="submit" class="fr-btn fr-btn-primary"'+(canWrite('opps')?'':' disabled')+'>Prepare reviewed save</button></div></form></section></div>';}
function confirmPanel(){const c=st.confirm;if(!c)return '';const box=(lbl,h,body,actions)=>'<div class="fr-overlay center"><section class="fr-modal" role="alertdialog" aria-modal="true" aria-label="'+esc(lbl)+'"><h2>'+esc(h)+'</h2>'+body+'<div class="fr-row end">'+btn('Cancel','cancel-modal')+actions+'</div></section></div>';
 if(c.kind==='archive'){const r=lookup(c.role,c.id);return box('Archive record','Archive this '+ROLE_LABEL[c.role]+'?','<p><strong>'+esc(r?(r.data.name||(c.role==='opps'?oppTitle(OPP[c.id]):'')):'')+'</strong> is hidden from lists and totals after you approve the review. Its history is kept.</p>',btn('Review archive','confirm-archive','fr-btn fr-btn-danger'));}
 if(c.kind==='lead'){const o=OPP[c.id];return box('Mark lead','Mark '+(o?orgName(o.organization_id):'')+' as lead?','<p>'+(c.others.length?'The current lead is unmarked in the same review. ':'')+'The round\'s lead investor is updated too.</p>',btn('Review lead','confirm-lead','fr-btn fr-btn-primary'));}
 if(c.kind==='decide'){const p=PROFILES.find(x=>x.id===c.id);return box('Decide investor',(c.to==='accepted'?'Accept ':'Reject ')+(p?orgName(p.organization_id):'')+'?','<p>'+(c.to==='accepted'?'Accepted investors join the target list and can be added to a round.':'Rejected investors never appear in the pipeline. The profile and its source are kept.')+'</p>',btn(c.to==='accepted'?'Review accept':'Review reject','confirm-decide','fr-btn fr-btn-primary'));}
 return '';}

/* ---------- page ---------- */
const rail='<aside class="fr-rail"><div class="fr-brand"><strong>Fundraise</strong><span>Investor pipeline for a round</span></div><nav class="fr-nav" aria-label="Fundraise screens">'+sections.map(s=>btn('<span class="fr-ico">'+icon(s.id)+'</span><span class="fr-nav-label">'+esc(s.label)+'</span>','nav:'+s.id,'',false,'aria-current="'+(st.section===s.id?'page':'false')+'" aria-label="'+esc(s.label)+'"')).join('')+'</nav><div class="fr-rail-foot">'+esc(cfg.demoLabel?'Fictional demo data':'Authorized records only')+'<br>Every change is reviewed.</div></aside>';
let main='';try{main=st.section==='overview'?overview():st.section==='pipeline'?pipeline():st.section==='investors'?investors():st.section==='round'?round():st.section==='activity'?activity():st.section==='engagement'?engagement():settingsScreen();}catch(e){main=heading()+'<div class="fr-banner bad" role="alert">This screen could not be shown: '+esc(String(e&&e.message||e))+'</div>';}
const notice=st.notice?'<div class="fr-banner info fr-notice" role="status"><span>'+esc(st.notice)+'</span>'+btn('Dismiss','clear-notice','fr-btn small')+'</div>':'';
const preview=!inp.saved?'<div class="fr-banner info">Preview: save the app to record data. Fictional or unsaved previews never write to your workspace.</div>':'';
const overlays=editorPanel()+detailPanel()+movePanel()+confirmPanel();
// The page behind an open dialog is inert for keyboard and assistive technology.
const html='<div class="fr-shell"'+(overlays?' inert':'')+'>'+rail+'<main class="fr-main">'+preview+notice+main+'<p class="fr-foot">'+(cfg.demoLabel?'Fictional records for demonstration only. Opening this preview creates no records, emails or automations.':'Fundraising pipeline, not investment or legal advice. All writes are reviewed in TrialAgents.')+'</p></main></div>'+overlays;
const css=typeof FUNDRAISE_CSS==='string'?FUNDRAISE_CSS:'';
return {html,css,state:st};
