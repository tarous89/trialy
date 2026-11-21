'use trialagents v2';
const templateLayoutSchema={"screens":[{"id":"overview","label":"Overview"},{"id":"timeline","label":"Timeline"},{"id":"plan","label":"Plan"},{"id":"decisions","label":"Gates & decisions"},{"id":"raid","label":"RAID"},{"id":"updates","label":"Updates"},{"id":"programs","label":"Programs"},{"id":"team","label":"Team"}],"groups":{"items":[{"id":"name","label":"Item"},{"id":"program_id","label":"Program"},{"id":"function","label":"Function"},{"id":"owner","label":"Owner"},{"id":"start_date","label":"Start"},{"id":"end_date","label":"End"},{"id":"baseline_end","label":"Baseline end"},{"id":"slip","label":"Slip"},{"id":"status","label":"Status"},{"id":"predecessor_id","label":"Predecessor"}],"raid":[{"id":"name","label":"Entry"},{"id":"program_id","label":"Program"},{"id":"raid_type","label":"Type"},{"id":"score","label":"Likelihood × impact"},{"id":"owner","label":"Owner"},{"id":"next_review","label":"Next review"},{"id":"status","label":"Status"}],"decisions":[{"id":"name","label":"Decision"},{"id":"program_id","label":"Program"},{"id":"kind","label":"Kind"},{"id":"target_date","label":"Target"},{"id":"outcome","label":"Outcome"},{"id":"decided_on","label":"Decided on"}],"item_form":[{"id":"name","label":"Name"},{"id":"program_id","label":"Program"},{"id":"item_type","label":"Item type"},{"id":"function","label":"Function"},{"id":"owner","label":"Owner"},{"id":"start_date","label":"Start date"},{"id":"end_date","label":"End date"},{"id":"baseline_start","label":"Baseline start"},{"id":"baseline_end","label":"Baseline end"},{"id":"status","label":"Status"},{"id":"predecessor_id","label":"Predecessor"},{"id":"is_key","label":"Key milestone"},{"id":"notes","label":"Notes"}],"decision_form":[{"id":"name","label":"Name"},{"id":"program_id","label":"Program"},{"id":"kind","label":"Kind"},{"id":"target_date","label":"Target date"},{"id":"criteria","label":"Criteria"},{"id":"outcome","label":"Outcome"},{"id":"decided_on","label":"Decided on"},{"id":"approver","label":"Approver"},{"id":"options","label":"Options considered"},{"id":"rationale","label":"Rationale"},{"id":"linked_item_id","label":"Affects"}],"raid_form":[{"id":"name","label":"Name"},{"id":"program_id","label":"Program"},{"id":"raid_type","label":"Type"},{"id":"likelihood","label":"Likelihood"},{"id":"impact","label":"Impact"},{"id":"owner","label":"Owner"},{"id":"mitigation","label":"Mitigation"},{"id":"next_review","label":"Next review"},{"id":"status","label":"Status"},{"id":"linked_item_id","label":"Linked item"}],"program_form":[{"id":"name","label":"Name"},{"id":"code","label":"Code"},{"id":"indication","label":"Indication"},{"id":"modality","label":"Modality"},{"id":"stage","label":"Stage"},{"id":"lead","label":"Lead"},{"id":"status","label":"Status"},{"id":"health","label":"Health"},{"id":"health_rationale","label":"Health rationale"},{"id":"health_date","label":"Health assessed on"}],"update_form":[{"id":"program_id","label":"Program"},{"id":"month","label":"Month"},{"id":"health","label":"Health"},{"id":"rationale","label":"Rationale"},{"id":"summary","label":"Summary"},{"id":"next_steps","label":"Next steps"},{"id":"author","label":"Author"}],"team_form":[{"id":"program_id","label":"Program"},{"id":"name","label":"Name"},{"id":"member_id","label":"Member ID"},{"id":"role","label":"Role"}]}};
const appCommands=[{"id":"schema.describe","label":"Describe forms, fields, options, rules and commands","mode":"read","input":{"type":"object","properties":{},"additionalProperties":false}},{"id":"overview.read","label":"Read the Overview: next key milestone, KPIs, program cards, due soon and exceptions","mode":"read","input":{"type":"object","properties":{},"additionalProperties":false}},{"id":"attention.read","label":"Read what needs attention this week (the weekly digest's content)","mode":"read","input":{"type":"object","properties":{},"additionalProperties":false}},{"id":"timeline.read","label":"Read the timeline: items, baselines, slips, critical path and cash at key milestones","mode":"read","input":{"type":"object","properties":{"program_id":{"type":"string","format":"uuid"},"function":{"type":"string"}},"additionalProperties":false}},{"id":"item.drivers","label":"Read what drives an item's date (its predecessor chain)","mode":"read","input":{"type":"object","properties":{"item_id":{"type":"string","format":"uuid"}},"required":["item_id"],"additionalProperties":false}},{"id":"item.impact","label":"Preview a date move: slip needed and successors pushed","mode":"read","input":{"type":"object","properties":{"item_id":{"type":"string","format":"uuid"},"end_date":{"type":"string","format":"date"}},"required":["item_id","end_date"],"additionalProperties":false}},{"id":"gates.read","label":"Read gates and decisions with criteria readiness","mode":"read","input":{"type":"object","properties":{"program_id":{"type":"string","format":"uuid"}},"additionalProperties":false}},{"id":"raid.read","label":"Read the RAID register with likelihood × impact","mode":"read","input":{"type":"object","properties":{"program_id":{"type":"string","format":"uuid"},"status":{"type":"string","enum":["open","monitoring","closed"]}},"additionalProperties":false}},{"id":"updates.read","label":"Read monthly updates and which programs still need one","mode":"read","input":{"type":"object","properties":{"month":{"type":"string","format":"month"}},"additionalProperties":false}},{"id":"report.preview","label":"Preview the leadership report for a month","mode":"read","input":{"type":"object","properties":{"month":{"type":"string","format":"month"}},"required":["month"],"additionalProperties":false}},{"id":"reports.read","label":"Read saved (frozen) leadership reports","mode":"read","input":{"type":"object","properties":{"report_id":{"type":"string","format":"uuid"}},"additionalProperties":false}},{"id":"digests.read","label":"Read saved weekly digests","mode":"read","input":{"type":"object","properties":{"limit":{"type":"integer","minimum":1,"maximum":26}},"additionalProperties":false}},{"id":"team.read","label":"Read the program team and the owner and reminder updates waiting","mode":"read","input":{"type":"object","properties":{},"additionalProperties":false}},{"id":"record.save","label":"Add or edit a record in any form (a later committed date needs slip_reason)","mode":"propose","input":{"type":"object","properties":{"role":{"type":"string","enum":["programs","items","decisions","raid","updates","team","closes","settings","programs.plan_items","programs.decisions","programs.raid","programs.updates","programs.team","runway.month_closes","programs.settings"]},"id":{"type":"string","format":"uuid"},"fields":{"type":"object","description":"Field values by key, as listed by schema.describe"},"slip_reason":{"type":"string","enum":["scientific","cro_vendor","regulatory","manufacturing","funding","other"]},"slip_detail":{"type":"string","maxLength":4000},"accept_downstream":{"type":"boolean"}},"required":["role"],"additionalProperties":false}},{"id":"record.duplicate","label":"Duplicate a record, optionally changing fields","mode":"propose","input":{"type":"object","properties":{"role":{"type":"string","enum":["programs","items","decisions","raid","updates","team","closes","settings","programs.plan_items","programs.decisions","programs.raid","programs.updates","programs.team","runway.month_closes","programs.settings"]},"id":{"type":"string","format":"uuid"},"fields":{"type":"object","description":"Field values by key, as listed by schema.describe"}},"required":["role","id"],"additionalProperties":false}},{"id":"record.archive","label":"Archive a record (kept with its history)","mode":"propose","input":{"type":"object","properties":{"role":{"type":"string","enum":["programs","items","decisions","raid","updates","team","closes","settings","programs.plan_items","programs.decisions","programs.raid","programs.updates","programs.team","runway.month_closes","programs.settings"]},"id":{"type":"string","format":"uuid"}},"required":["role","id"],"additionalProperties":false}},{"id":"program.save","label":"Add or edit a program (health needs a rationale and date)","mode":"propose","input":{"type":"object","properties":{"id":{"type":"string","format":"uuid"},"fields":{"type":"object","description":"Field values by key, as listed by schema.describe"}},"additionalProperties":false}},{"id":"item.save","label":"Add or edit a milestone or activity, with slip reason and downstream moves","mode":"propose","input":{"type":"object","properties":{"id":{"type":"string","format":"uuid"},"fields":{"type":"object","description":"Field values by key, as listed by schema.describe"},"slip_reason":{"type":"string","enum":["scientific","cro_vendor","regulatory","manufacturing","funding","other"]},"slip_detail":{"type":"string","maxLength":4000},"accept_downstream":{"type":"boolean"}},"additionalProperties":false}},{"id":"team.save","label":"Add or edit a program team member","mode":"propose","input":{"type":"object","properties":{"id":{"type":"string","format":"uuid"},"fields":{"type":"object","description":"Field values by key, as listed by schema.describe"}},"additionalProperties":false}},{"id":"settings.save","label":"Change Programs settings","mode":"propose","input":{"type":"object","properties":{"fields":{"type":"object","description":"Field values by key, as listed by schema.describe"}},"required":["fields"],"additionalProperties":false}},{"id":"baseline.set","label":"Set the baseline for a program's unbaselined items","mode":"propose","input":{"type":"object","properties":{"program_id":{"type":"string","format":"uuid"}},"required":["program_id"],"additionalProperties":false}},{"id":"baseline.reset","label":"Reset an item's baseline to its current dates, with a reason","mode":"propose","input":{"type":"object","properties":{"item_id":{"type":"string","format":"uuid"},"reason":{"type":"string","minLength":1,"maxLength":1000}},"required":["item_id","reason"],"additionalProperties":false}},{"id":"gate.record","label":"Record a gate outcome, with follow-up milestones and cancellations","mode":"propose","input":{"type":"object","properties":{"gate_id":{"type":"string","format":"uuid"},"outcome":{"type":"string","enum":["go","no_go","conditional","decided"]},"decided_on":{"type":"string","format":"date"},"approver":{"type":"string","maxLength":300},"rationale":{"type":"string","minLength":1,"maxLength":4000},"follow_ups":{"type":"array","maxItems":10,"items":{"type":"object","properties":{"name":{"type":"string","minLength":1,"maxLength":300},"end_date":{"type":"string","format":"date"},"function":{"type":"string","enum":["cmc","nonclinical","clinical","regulatory","other"]}},"required":["name","end_date"],"additionalProperties":false}},"cancel_item_ids":{"type":"array","maxItems":40,"items":{"type":"string","format":"uuid"}}},"required":["gate_id","outcome","decided_on","rationale"],"additionalProperties":false}},{"id":"raid.promote","label":"Promote an assumption to a risk, or a risk to an issue","mode":"propose","input":{"type":"object","properties":{"id":{"type":"string","format":"uuid"},"to":{"type":"string","enum":["risk","issue"]}},"required":["id","to"],"additionalProperties":false}},{"id":"report.save","label":"Save the month's leadership report (frozen)","mode":"propose","input":{"type":"object","properties":{"month":{"type":"string","format":"month"},"title":{"type":"string","maxLength":300},"narrative":{"type":"string","maxLength":4000}},"required":["month"],"additionalProperties":false}},{"id":"reminders.refresh","label":"Bring owner links and reminder dates up to date","mode":"propose","input":{"type":"object","properties":{},"additionalProperties":false}},{"id":"layout.save","label":"Change screens, columns and forms: order, hide, labels and defaults","mode":"layout","input":{"type":"object","properties":{"heading":{"type":"string","maxLength":100},"screens":{"type":"array","items":{"type":"string"},"maxItems":20},"order":{"type":"object"},"hide":{"type":"array","items":{"type":"string"},"maxItems":100},"show":{"type":"array","items":{"type":"string"},"maxItems":100},"labels":{"type":"object"},"defaults":{"type":"object"}},"additionalProperties":false}}];
/* TrialAgents Programs 3.0.0 (life.project-oversight) | v2 app contract, built on the TrialAgents kit. No DOM, network or browser storage.
 * 3.0.0 (G2–G8, G11, G14, P3–P5): no own header, banners or footer; messages go through output.notice; values are edited where they are
 * shown and saved at once with records.save (expectedVersion = the version shown when editing started); stages move by drag and drop; the
 * selected program is the working context (output.context); Programs, Program team and Cash forecast have their own screens; Settings
 * holds only business choices and is shown to the app's owners; each screen reads only its own tables in one batched read.
 * The installer schema, helper functions, automations and app commands are those of 2.2.x, so installed copies can be upgraded. */
const cfg=typeof templateConfiguration==='object'&&templateConfiguration?templateConfiguration:{};
const bindings=Array.isArray(templateBindings)?templateBindings:[];
const inp=input||{};
const event=inp.event||{kind:'open',action:'',value:null,form:{}};
const action=String(event.action||'');
const OWNER=inp.appRole===undefined||inp.appRole==='owner';

/* ---------- helpers ---------- */
const esc=kit.esc;
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
const norm=v=>String(v||'').trim().toLowerCase();

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
const RAID_STATUS=['open','monitoring','closed'];
const LMH=['low','medium','high'];
const STALE_HEALTH_DAYS=45;
const optionLabel=(key,o)=>key==='function'?FN_LABEL[o]||cap(o):key==='stage'?STAGE_LABEL[o]||cap(o):key==='outcome'?OUTCOME_LABEL[o]||cap(o):key==='reason'?REASON_LABEL[o]||cap(o):cap(o);

/* ---------- logical schema (real keys come from tableMap) ---------- */
const ref=role=>({kind:'ref',ref:role});
const S={
 programs:[{key:'name',label:'Name',kind:'text',required:true},{key:'code',label:'Code',kind:'text'},{key:'indication',label:'Indication',kind:'text'},{key:'modality',label:'Modality',kind:'select',options:MODALITIES},{key:'stage',label:'Stage',kind:'select',options:STAGES,required:true},{key:'lead',label:'Lead',kind:'person'},{key:'status',label:'Status',kind:'select',options:['active','paused','stopped','partnered']},{key:'health',label:'Health',kind:'select',options:HEALTH},{key:'health_rationale',label:'Health rationale',kind:'longtext'},{key:'health_date',label:'Health assessed on',kind:'date'},{key:'archived',label:'Archived',kind:'boolean'}],
 people:[{key:'name',label:'Name',kind:'text',required:true},{key:'title',label:'Title',kind:'text'},{key:'archived',label:'Archived',kind:'boolean'}],
 items:[{key:'name',label:'Name',kind:'text',required:true},{key:'program_id',label:'Program',...ref('programs'),required:true},{key:'item_type',label:'Item type',kind:'select',options:['milestone','activity'],required:true},{key:'function',label:'Function',kind:'select',options:FUNCTIONS,required:true},{key:'owner',label:'Owner',kind:'person'},{key:'start_date',label:'Start date',kind:'date'},{key:'end_date',label:'End date (milestone date)',kind:'date',required:true},{key:'baseline_start',label:'Baseline start',kind:'baseline'},{key:'baseline_end',label:'Baseline end',kind:'baseline'},{key:'status',label:'Status',kind:'select',options:ITEM_STATUS,required:true},{key:'predecessor_id',label:'Predecessor (finish-to-start)',...ref('items')},{key:'is_key',label:'Key milestone',kind:'boolean'},{key:'notes',label:'Notes',kind:'longtext'},{key:'owner_member_id',label:'Owner member ID',kind:'system'},{key:'assigned_on',label:'Assigned on',kind:'system'},{key:'remind_on',label:'Reminder date',kind:'system'},{key:'archived',label:'Archived',kind:'boolean'}],
 slips:[{key:'plan_item_id',label:'Plan item',kind:'text',required:true},{key:'changed_on',label:'Changed on',kind:'date',required:true},{key:'old_end',label:'Old end',kind:'date',required:true},{key:'new_end',label:'New end',kind:'date',required:true},{key:'days',label:'Days',kind:'number',required:true},{key:'reason',label:'Reason',kind:'select',options:REASONS,required:true},{key:'detail',label:'Detail',kind:'longtext'}],
 decisions:[{key:'name',label:'Name',kind:'text',required:true},{key:'program_id',label:'Program',...ref('programs'),required:true},{key:'kind',label:'Kind',kind:'select',options:['gate','decision'],required:true},{key:'target_date',label:'Target date',kind:'date'},{key:'criteria',label:'Criteria (one per line: [met], [not met] or [open] then the criterion)',kind:'longtext'},{key:'outcome',label:'Outcome',kind:'select',options:OUTCOMES},{key:'decided_on',label:'Decided on',kind:'date'},{key:'approver',label:'Approver',kind:'person'},{key:'options',label:'Options considered',kind:'longtext'},{key:'rationale',label:'Rationale',kind:'longtext'},{key:'linked_item_id',label:'Affects',kind:'link'},{key:'archived',label:'Archived',kind:'boolean'}],
 raid:[{key:'name',label:'Name',kind:'text',required:true},{key:'program_id',label:'Program',...ref('programs')},{key:'raid_type',label:'Type',kind:'select',options:RAID_TYPES,required:true},{key:'likelihood',label:'Likelihood',kind:'select',options:LMH},{key:'impact',label:'Impact',kind:'select',options:LMH},{key:'owner',label:'Owner',kind:'person'},{key:'mitigation',label:'Mitigation',kind:'longtext'},{key:'next_review',label:'Next review',kind:'date'},{key:'status',label:'Status',kind:'select',options:RAID_STATUS,required:true},{key:'linked_item_id',label:'Linked item',kind:'link'},{key:'owner_member_id',label:'Owner member ID',kind:'system'},{key:'assigned_on',label:'Assigned on',kind:'system'},{key:'remind_on',label:'Reminder date',kind:'system'},{key:'archived',label:'Archived',kind:'boolean'}],
 updates:[{key:'program_id',label:'Program',...ref('programs'),required:true},{key:'month',label:'Month',kind:'month',required:true},{key:'health',label:'Health',kind:'select',options:HEALTH,required:true},{key:'rationale',label:'Rationale',kind:'longtext'},{key:'summary',label:'Summary',kind:'longtext'},{key:'next_steps',label:'Next steps',kind:'longtext'},{key:'author',label:'Author',kind:'person'}],
 reports:[{key:'month',label:'Month',kind:'month',required:true},{key:'title',label:'Title',kind:'text',required:true},{key:'narrative',label:'Narrative',kind:'longtext'},{key:'contents',label:'Contents',kind:'frozen'},{key:'saved_on',label:'Saved on',kind:'frozen'}],
 settings:[{key:'functions',label:'Function lanes (comma list, in order)',kind:'text'},{key:'stages',label:'Stages (comma list, in order)',kind:'text'},{key:'health_definitions',label:'Health definitions',kind:'longtext'},{key:'due_soon_days',label:'Due-soon window (days)',kind:'number'},{key:'update_day',label:'Monthly update day (1–28)',kind:'number'},{key:'reminder_days',label:'Reminder lead time (days, 1–60)',kind:'number'}],
 // The member ID routes notifications; it is set by Claude or ChatGPT (team.save) and never shown on screen (G7).
 team:[{key:'program_id',label:'Program',...ref('programs'),required:true},{key:'name',label:'Name',kind:'text',required:true},{key:'member_id',label:'Workspace member ID (for notifications)',kind:'member',offScreen:true},{key:'role',label:'Role',kind:'text'},{key:'added_on',label:'Added on',kind:'system'},{key:'archived',label:'Archived',kind:'boolean'}],
 digests:[{key:'run_on',label:'Run on',kind:'date'},{key:'period',label:'Period',kind:'text'},{key:'summary',label:'Summary',kind:'longtext'},{key:'attention_count',label:'Items needing attention',kind:'number'},{key:'run_id',label:'Run ID',kind:'text'},{key:'written_by',label:'Written by',kind:'text'}],
 /* Cash forecast: Runway's month closes when linked (read-only), otherwise monthly closing cash entered here. */
 closes:[{key:'month',label:'Month',kind:'month',required:true},{key:'closing_balance',label:'Closing cash',kind:'number',required:true},{key:'currency',label:'Currency',kind:'select',options:['USD','EUR','GBP','CHF','CAD','AUD','JPY','CNY','SEK','DKK','NOK','INR'],required:true},{key:'closed',label:'Closed',kind:'frozen'},{key:'metrics',label:'Metrics',kind:'frozen'}]
};
const ROLE_LABEL={programs:'program',people:'person',items:'plan item',slips:'slip',decisions:'decision',raid:'RAID entry',updates:'monthly update',reports:'leadership report',settings:'settings',closes:'cash forecast month',team:'team member',digests:'weekly digest'};
/* Stable role keys: core contract v1 for shared tables, programs.* for this app; runway.month_closes is an integration. */
const ROLE_KEY={programs:'programs',people:'people',items:'programs.plan_items',slips:'programs.slips',decisions:'programs.decisions',raid:'programs.raid',updates:'programs.updates',reports:'programs.reports',settings:'programs.settings',closes:'runway.month_closes',team:'programs.team',digests:'programs.digests'};
const READ_ONLY_ROLES=['people','digests'];

/* ---------- bindings ---------- */
let mapping={};try{mapping=JSON.parse(cfg.tableMap||'{}');}catch(e){mapping={};}
const roleMap={};
for(const role of Object.keys(S)){
 const m=mapping[ROLE_KEY[role]],b=m&&bindings.find(x=>x.typeId===m.typeId);
 if(!m||!b)continue;
 const fields={};for(const f of S[role]){const k=m.fields&&m.fields[f.key]!==undefined?m.fields[f.key]:f.key;if(typeof k==='string'&&(b.fields||[]).includes(k))fields[f.key]=k;}
 // Fields added on request: the assistant adds the field to the table and lists it here in one reviewed change, so it appears in the forms at once.
 const extra=(Array.isArray(m.extraFields)?m.extraFields:[]).filter(x=>x&&/^[a-z][a-z0-9_]{0,63}$/.test(x.key||'')&&(b.fields||[]).includes(x.key)&&!S[role].some(f=>f.key===x.key)).slice(0,20).map(x=>({key:x.key,label:String(x.label||x.key).slice(0,80),kind:['text','longtext','number','date','month','select','boolean'].includes(x.kind)?x.kind:'text',options:Array.isArray(x.options)?x.options.map(String).slice(0,50):undefined,extra:true}));
 for(const x of extra)fields[x.key]=x.key;
 roleMap[role]={typeId:m.typeId,fields,extra,writable:READ_ONLY_ROLES.includes(role)?[]:(Array.isArray(m.writableFields)?m.writableFields:[]).filter(x=>fields[x]&&!extra.some(e=>e.key===x)).concat(extra.filter(x=>(m.writableExtra||[]).includes(x.key)).map(x=>x.key))};
}
const fieldsOf=role=>S[role].concat(roleMap[role]?roleMap[role].extra:[]);
const canWrite=role=>!!inp.saved&&!!inp.writable&&cfg.readOnly!==true&&inp.appRole!=='viewer'&&!!roleMap[role]&&roleMap[role].writable.length>0;
const writableField=(role,key)=>canWrite(role)&&roleMap[role].writable.includes(key);

/* ---------- layout profile (presentation only; layout.save) ---------- */
const SCREENS=templateLayoutSchema.screens;
const FORM_GROUP={items:'item_form',decisions:'decision_form',raid:'raid_form',programs:'program_form',updates:'update_form',team:'team_form'};
const LAYOUT=(()=>{let p={};try{p=JSON.parse(cfg.layoutProfile||'{}')||{};}catch(e){p={};}const groups=templateLayoutSchema.groups;
 const tabs=Array.isArray(p.tabs)?p.tabs.filter(id=>SCREENS.some(s=>s.id===id)):[];
 const cols={};for(const g of Object.keys(groups)){const ids=groups[g].map(x=>x.id),saved=p.cols&&Array.isArray(p.cols[g])?p.cols[g].filter(x=>ids.includes(x)):[];cols[g]=[...new Set(saved.concat(ids))];}
 return {heading:String(p.heading||cfg.heading||'Programs').slice(0,100),tabs:[...new Set(tabs.concat(SCREENS.map(s=>s.id)))],cols,visible:p.visible&&typeof p.visible==='object'?p.visible:{},labels:p.labels&&typeof p.labels==='object'?p.labels:{},defaults:p.defaults&&typeof p.defaults==='object'?p.defaults:{}};})();
const fieldLabel=(role,f)=>FORM_GROUP[role]&&typeof LAYOUT.labels[FORM_GROUP[role]+':'+f.key]==='string'?LAYOUT.labels[FORM_GROUP[role]+':'+f.key]:f.label;
const colShown=(g,k)=>LAYOUT.visible[g+':'+k]!==false;

/* ---------- state and working context ---------- */
const st=JSON.parse(JSON.stringify(inp.state||{}));
const EXTRA_SCREENS=[{id:'cash',label:'Cash forecast'},{id:'settings',label:'Settings'}];
const allScreens=()=>LAYOUT.tabs.map(id=>SCREENS.find(s=>s.id===id)).filter(s=>s&&LAYOUT.visible[s.id]!==false).concat(roleMap.closes?[EXTRA_SCREENS[0]]:[]).concat(OWNER&&roleMap.settings&&canWrite('settings')?[EXTRA_SCREENS[1]]:[]);
// G4: the selected program is the working context, kept for this person across screens and visits ('' = all programs).
if(st.prog===undefined)st.prog=inp.context&&typeof inp.context==='object'&&typeof inp.context.program==='string'?inp.context.program:'';
st.screen=String(st.screen||'overview');
for(const k of ['plan','raid','dec','up','tl','team'])st[k]=st[k]&&typeof st[k]==='object'?st[k]:{};
let NOTICE=null;
const note=(kind,message)=>{NOTICE=kit.notice(kind,String(message||'').slice(0,290));};
// Screen changes are applied before reading, so the next screen reads only its own tables.
if(action.startsWith('nav:')&&event.kind!=='command'){const id=action.slice(4);if(SCREENS.some(s=>s.id===id)||EXTRA_SCREENS.some(s=>s.id===id)){st.screen=id;st.panel=null;st.sel=null;st.undo=null;}}
if(action==='context'&&event.kind==='change'){st.prog=String(event.value||'');st.sel=null;for(const k of ['plan','raid','dec','up','team'])st[k].offset=0;}

/* ---------- reads: each screen reads its own tables, in one batched request ---------- */
const NEEDS={overview:['items','slips','decisions','raid','updates','closes'],timeline:['items','slips','closes'],plan:['items','slips','team','people'],decisions:['items','decisions','raid','team','people'],raid:['items','raid','team','people'],updates:['items','slips','decisions','raid','updates','reports','digests','team','people'],programs:['team','people'],team:['team','items','raid'],cash:['closes'],settings:[]};
const DEPS={programs:['team','people'],items:['items','slips','team','people'],decisions:['items','decisions','raid','team','people'],raid:['items','raid','team','people'],updates:['updates','team','people'],team:['team'],closes:['closes'],rebaseline:['items'],gate:['items','decisions']};
const ALL_ROLES=Object.keys(S);
const openRole=()=>{const m=/^(?:open|add|duplicate):([a-z]+)/.exec(action);return m?m[1]:'';};
const wanted=event.kind==='command'?ALL_ROLES:['programs','settings'].concat(NEEDS[st.screen]||[],DEPS[st.panel&&st.panel.role]||[],DEPS[openRole()]||[],/^(?:rebaseline|baseline|archive:items)/.test(action)?['items']:[],/^(?:outcome|gate)/.test(action)?DEPS.gate:[],/^(?:promote|archive:raid)/.test(action)?['raid']:[],/^reminders/.test(action)?['items','raid','team']:[],/^archive:/.test(action)?DEPS[action.split(':')[1]]||[]:[]);
const PAGE=100,MAX_PAGES=8;let callsLeft=80,batchReads=true;const R={};
function readBatch(reads){const out=[];
 for(let i=0;i<reads.length;i+=12){const part=reads.slice(i,i+12);let got=null;
  if(batchReads&&part.length>1){try{const r=tools.call('records.readMany',{reads:part});if(r&&Array.isArray(r.results)&&r.results.length===part.length)got=r.results;}catch(e){got=null;}if(!got)batchReads=false;}
  if(!got)got=part.map(q=>{try{return tools.call('records.read',q);}catch(e){return {unavailable:true};}});
  out.push(...got);}
 return out;}
const blank=why=>({rows:[],allRows:[],total:0,complete:false,unavailable:false,unbound:why==='unbound',notRead:why==='notRead',pending:false,truncated:false,invalid:0});
function loadRoles(list){
 const todo=[...new Set(list)].filter(r=>!R[r]);for(const r of todo)if(!roleMap[r])R[r]=blank('unbound');
 const acc={};for(const r of todo.filter(r=>roleMap[r]))acc[r]={rows:[],next:0,total:null,pages:0,done:false,unavailable:false,pending:false,truncated:false,invalid:0};
 let open=Object.keys(acc);
 while(open.length){const reqs=[];
  for(const r of open){const a=acc[r];const left=a.total===null?1:Math.min(Math.ceil((a.total-a.next)/PAGE),MAX_PAGES-a.pages);for(let k=0;k<left;k++)reqs.push({role:r,offset:a.next+k*PAGE});}
  if(reqs.length>callsLeft){for(const q of reqs.slice(callsLeft))acc[q.role].truncated=true;reqs.length=Math.max(0,callsLeft);}
  if(!reqs.length)break;callsLeft-=reqs.length;
  const res=readBatch(reqs.map(q=>({typeId:roleMap[q.role].typeId,limit:PAGE,offset:q.offset,filters:{}})));
  reqs.forEach((q,i)=>{const a=acc[q.role],p=res[i];if(a.done)return;
   if(p&&p.pending){a.pending=true;a.done=true;return;}
   if(!p||p.unavailable){a.unavailable=true;a.done=true;return;}
   const chunk=Array.isArray(p.rows)?p.rows:[],m=roleMap[q.role];a.total=p.total===null||p.total===undefined||!Number.isFinite(Number(p.total))?null:Number(p.total);a.pages++;
   for(const r of chunk){const data={};for(const [logical,real] of Object.entries(m.fields))if(has(r.data,real)){const v=r.data[real];if(v!==null&&typeof v==='object'){a.invalid++;continue;}data[logical]=v;}a.rows.push({id:String(r.id),version:r.version,data});}
   a.next=q.offset+chunk.length;
   if(a.total!==null&&a.next>=a.total||chunk.length<PAGE)a.done=true;else if(a.pages>=MAX_PAGES){a.truncated=true;a.done=true;}});
  open=open.filter(r=>!acc[r].done&&!acc[r].truncated);
 }
 for(const [r,a] of Object.entries(acc))R[r]={rows:a.rows.filter(x=>!bool(x.data.archived)),allRows:a.rows,total:a.total===null?a.rows.length:a.total,complete:!a.pending&&!a.unavailable&&!a.truncated&&(a.total===null?a.done:a.rows.length>=a.total),unavailable:a.unavailable,unbound:false,notRead:false,pending:a.pending,truncated:a.truncated,invalid:a.invalid};
}
loadRoles(wanted);for(const r of ALL_ROLES)if(!R[r])R[r]=blank('notRead');
const PENDING=Object.values(R).some(r=>r.pending);
const CORE=['programs','items','slips','decisions','raid','updates'];
const readProblems=[];
for(const role of CORE.concat(['reports','settings'])){const r=R[role],n=cap(ROLE_LABEL[role])+'s';if(r.notRead||r.pending)continue;
 if(r.unbound)readProblems.push(n+' table is not connected to this app.');
 else if(r.unavailable)readProblems.push('You cannot read the '+ROLE_LABEL[role]+' table.');
 else if(!r.complete)readProblems.push(n+': partial read ('+r.allRows.length+' of '+(r.total>r.allRows.length?r.total:'more than '+r.allRows.length)+' rows).');
 if(r.invalid)readProblems.push(n+': '+plural(r.invalid,'value')+' with an invalid shape ignored.');}
const exact=readProblems.length===0&&!PENDING;
const itemsExact=!R.items.unbound&&!R.items.unavailable&&!R.items.notRead&&R.items.complete;
const settingsRow=R.settings.rows[0]||null;const SET=settingsRow?settingsRow.data:{};
const listSetting=(v,allowed)=>{const l=String(v||'').split(',').map(x=>x.trim().toLowerCase()).filter(x=>allowed.includes(x));return l.length?[...new Set(l)]:allowed.slice();};
const FN_ORDER=listSetting(SET.functions,FUNCTIONS),STAGE_ORDER=listSetting(SET.stages,STAGES);
const DUE_SOON=Math.min(365,Math.max(7,Math.round(num(SET.due_soon_days,90)||90)));
const UPDATE_DAY=Math.min(28,Math.max(1,Math.round(num(SET.update_day,5)||5)));
const REMIND_DAYS=Math.min(60,Math.max(1,Math.round(num(SET.reminder_days,7)||7)));

/* As-of date: the runtime clock (a pinned asOfOverride only in previews and tests). Nothing stored is derived from it. */
const CLOCK=(()=>{try{return validDate(new Date().toISOString());}catch(e){return '';}})();
const latestUpdateMonth=R.updates.rows.map(r=>ym(r.data.month)).filter(Boolean).sort().pop()||'';
const AS_OF=validDate(cfg.asOfOverride)||CLOCK||(latestUpdateMonth?lastDay(latestUpdateMonth):'');

const progRow=id=>R.programs.allRows.find(r=>r.id===id)||null;
function progName(id){if(!id)return 'No program';if(R.programs.unbound)return 'Program not connected';if(R.programs.unavailable)return 'Program unavailable';const p=progRow(id);if(!p)return 'Program unavailable';return String(p.data.name||'Unnamed program')+(bool(p.data.archived)?' (archived)':'');}
const PROGRAMS=R.programs.rows.slice().sort((a,b)=>String(a.data.name||'').localeCompare(String(b.data.name||'')));
if(st.prog&&!R.programs.pending&&!PROGRAMS.some(p=>p.id===st.prog))st.prog='';
const inProg=id=>!st.prog||id===st.prog;
const SHOWN=PROGRAMS.filter(p=>inProg(p.id));
const programOptions=()=>PROGRAMS.map(p=>[p.id,String(p.data.name||'Unnamed')]);
const itemRow=id=>R.items.allRows.find(r=>r.id===id)||null;
const ITEMS=R.items.rows.map(r=>({id:r.id,version:r.version,...r.data,start_date:validDate(r.data.start_date),end_date:validDate(r.data.end_date),baseline_start:validDate(r.data.baseline_start),baseline_end:validDate(r.data.baseline_end)}));
const ITEM=Object.fromEntries(ITEMS.map(x=>[x.id,x]));
function itemName(id){if(!id)return '—';const r=itemRow(id);if(!r)return 'Item unavailable';return String(r.data.name||'Unnamed item')+(bool(r.data.archived)?' (archived)':'');}
const isMilestone=x=>x.item_type==='milestone';
/* Program team: names used for owners; a workspace member ID (set by Claude or ChatGPT, never shown) routes notifications. */
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const TEAM=R.team.rows.map(r=>({id:r.id,version:r.version,...r.data})).sort((a,b)=>progName(a.program_id).localeCompare(progName(b.program_id))||String(a.name||'').localeCompare(String(b.name||'')));
const linked=t=>UUID.test(String(t.member_id||''));
function memberFor(name,pid){const n=norm(name);if(!n)return '';const ok=t=>norm(t.name)===n&&linked(t);const t=TEAM.find(t=>t.program_id===pid&&ok(t))||TEAM.find(ok);return t?String(t.member_id).toLowerCase():'';}
const sysWritable=(role,k)=>!!roleMap[role]&&!!roleMap[role].fields[k]&&roleMap[role].writable.includes(k);
/* Notification fields are kept by the app on every save, never typed: owner_member_id (from the team), assigned_on (when that member
 * changes; the assignment notice is sent that day) and remind_on (items: end date minus the reminder lead time while planned, in progress or
 * at risk; RAID: the next review while open; empty otherwise, so closed or finished work never reminds anyone). */
function sysFields(role,next,orig){const out={},o=orig||{};
 if(role==='items'||role==='raid'){if(R.team.notRead||R.team.pending)return out;const mid=memberFor(next.owner,next.program_id);
  if(sysWritable(role,'owner_member_id')&&String(o.owner_member_id||'').toLowerCase()!==mid){out.owner_member_id=mid||null;if(sysWritable(role,'assigned_on'))out.assigned_on=mid&&AS_OF?AS_OF:null;}
  let r=null;const was=validDate(o.remind_on)||null;
  if(mid&&AS_OF&&!bool(next.archived)){
   if(role==='items'){const e=validDate(next.end_date);if(COMMITTED.includes(next.status)&&e&&e>=AS_OF){const d=addDays(e,-REMIND_DAYS);r=d>=AS_OF?d:(was&&was>=d&&was<=e?was:AS_OF);}}
   else{const d=validDate(next.next_review);if(next.status!=='closed'&&d&&d>=AS_OF)r=d;}}
  if(sysWritable(role,'remind_on')&&was!==r)out.remind_on=r;}
 if(role==='team'){const m=UUID.test(String(next.member_id||''))?String(next.member_id).toLowerCase():'',w=UUID.test(String(o.member_id||''))?String(o.member_id).toLowerCase():'';
  if(sysWritable('team','added_on')&&m&&m!==w&&!bool(next.archived))out.added_on=AS_OF||null;}
 return out;}
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
 * Durations are kept. Done and cancelled successors are never moved. Shown first; applied only when accepted in the same save. */
function downstream(id,newEnd){const moves=[],ends={[id]:newEnd},queue=[id],seen=new Set([id]);
 while(queue.length){const pid=queue.shift();for(const sid of (SUCC[pid]||[])){const s=ITEM[sid];if(!s||seen.has(sid)||['done','cancelled'].includes(s.status))continue;
  const earliest=addDays(ends[pid],1),a=anchor(s);if(!a||!earliest||earliest<=a)continue;
  const shift=diffDays(a,earliest);seen.add(sid);const ne=addDays(s.end_date,shift);ends[sid]=ne;
  moves.push({id:sid,name:String(s.name||''),version:s.version,old_start:s.start_date,old_end:s.end_date,new_start:s.start_date?addDays(s.start_date,shift):'',new_end:ne,days:shift,slip:!!s.baseline_end&&COMMITTED.includes(s.status)});queue.push(sid);}}
 return moves;}
const needsSlip=(orig,newEnd)=>!!orig&&!!orig.baseline_end&&COMMITTED.includes(orig.status)&&!!orig.end_date&&!!newEnd&&newEnd>orig.end_date;

/* ---------- cash forecast: Runway's snapshot when linked (read-only), otherwise this app's own months ---------- */
function runwayLink(){const r=R.closes;if(r.notRead)return {state:'notRead'};if(r.pending)return {state:'pending'};if(r.unbound)return {state:'unbound'};if(r.unavailable)return {state:'unavailable'};
 const snaps=r.rows.map(x=>({row:x,m:parseJSON(x.data.metrics)})).filter(x=>x.m&&x.m.v===2&&Array.isArray(x.m.months)&&(x.row.data.closed===undefined||bool(x.row.data.closed))).sort((a,b)=>String(b.m.asOf||'').localeCompare(String(a.m.asOf||'')));
 if(snaps.length){const s=snaps[0].m;return {state:r.complete?'ok':'partial',source:'runway',rowId:snaps[0].row.id,asOf:String(s.asOf||''),currency:String(s.currency||''),months:s.months.filter(x=>x&&ym(x.m)&&Number.isFinite(Number(x.c)))};}
 const byMonth={};for(const x of r.rows){const m=ym(x.data.month),c=Number(x.data.closing_balance);if(!x.data.metrics&&m&&x.data.closing_balance!==null&&x.data.closing_balance!==undefined&&x.data.closing_balance!==''&&Number.isFinite(c))byMonth[m]={m,c,cur:String(x.data.currency||''),id:x.id,version:x.version};}
 const pts=Object.values(byMonth).sort((a,b)=>a.m.localeCompare(b.m));
 if(pts.length)return {state:r.complete?'ok':'partial',source:'manual',asOf:'',currency:pts[pts.length-1].cur,months:pts};
 return {state:r.complete?'none':'partial'};}
const RUNWAY=runwayLink();
const cushionTone=c=>!c?'':c.beyond||c.months>=6?'green':c.months>=3?'amber':'red';
const monthsBetween=(a,b)=>(Number(b.slice(0,4))-Number(a.slice(0,4)))*12+Number(b.slice(5,7))-Number(a.slice(5,7));
// Manual forecast: cash at the latest entered month on or before the milestone; cushion counts calendar months to the first negative month.
function manualCashAt(m){const ms=RUNWAY.months;let i=-1;for(let k=0;k<ms.length;k++)if(ms[k].m<=m)i=k;if(i<0)return null;const cash=ms[i].c;
 if(cash<0)return {cash,cushion:{months:0,beyond:false},neg:true};const j=ms.findIndex((p,k)=>k>i&&p.c<0);
 return {cash,cushion:j<0?{months:Math.max(0,monthsBetween(m,ms[ms.length-1].m)),beyond:true}:{months:Math.max(0,monthsBetween(m,ms[j].m)-1),beyond:false}};}
// Cash at a key milestone = Runway's frozen forecast closing cash in the milestone month; cushion = full months of cash after it, to cash-out.
function cashAt(x){if(RUNWAY.state!=='ok'||!isKey(x)||!x.end_date)return null;const m=ym(x.end_date);if(RUNWAY.source==='manual')return manualCashAt(m);if(m<=RUNWAY.asOf)return null;const ms=RUNWAY.months,i=ms.findIndex(p=>p.m===m);
 if(i<0)return {beyondHorizon:true};const cash=Number(ms[i].c);if(cash<0)return {cash,cushion:{months:0,beyond:false},neg:true};
 const j=ms.findIndex((p,k)=>k>i&&Number(p.c)<0);return {cash,cushion:j<0?{months:ms.length-1-i,beyond:true}:{months:j-1-i,beyond:false}};}
const money=(v,cur)=>(cur?cur+' ':'')+(Math.abs(v)>=1e6?(v/1e6).toFixed(1)+'M':Math.abs(v)>=1e3?Math.round(v/1e3)+'k':grouped(v));
/* In-app integration: a subtle offer to add Runway, or to choose Runway's data once it is in the workspace. Read only where cash shows. */
let INTEG=null;if(inp.saved&&!R.closes.notRead&&!R.closes.unbound){try{callsLeft--;const r=tools.call('integrations.list',{});INTEG=(r&&Array.isArray(r.integrations)?r.integrations:[]).find(x=>x.role==='runway.month_closes')||null;}catch(e){INTEG=null;}}
const CASH_LINKED=RUNWAY.source==='runway'||!!(INTEG&&INTEG.source==='linked');
const WRITER=INTEG&&INTEG.writer&&INTEG.writer.appName?{appName:String(INTEG.writer.appName).slice(0,60),canOpen:!!INTEG.writer.canOpen}:null;
const CASH_APP=WRITER?WRITER.appName:'Runway';
function integrationHint(){if(!INTEG||!INTEG.offer)return '';
 return '<p class="k-small k-muted">'+(INTEG.offer==='install'?'Works with Runway. ':'Runway is in your workspace. ')+'<button type="button" class="k-button" data-trialy-integration="'+esc(INTEG.offer)+' runway.month_closes">'+(INTEG.offer==='install'?'Add Runway':'Use its cash data')+'</button></p>';}
function runwayNote(){const s=RUNWAY.state;
 return s==='ok'||s==='notRead'||s==='pending'||s==='unbound'?'':s==='none'&&!CASH_LINKED?'Add monthly closing cash under Cash forecast to show cash at key milestones.':s==='unavailable'?'Cash markers are hidden: you cannot read the cash forecast.':s==='partial'?'Cash markers are hidden: the cash forecast could not be read completely.':'Runway has no closed month yet, so there is no cash snapshot to show.';}

/* ---------- writes ---------- */
function toReal(role,data){const m=roleMap[role];if(!m)throw Error('The '+ROLE_LABEL[role]+' table is not connected.');const out={};for(const [k,v] of Object.entries(data)){if(v===undefined)continue;if(!m.fields[k])continue;if(!m.writable.includes(k))throw Error('You cannot edit '+k.replace(/_/g,' ')+' in the '+ROLE_LABEL[role]+' table.');out[m.fields[k]]=v;}return out;}
/* Checks and converts the given values (only the keys in source); base holds the record's other values for cross-field rules. */
function valuesFromForm(role,source,mode,editingId,base){
 const out={};const m=roleMap[role];const cur=k=>has(out,k)?out[k]:has(source,k)?source[k]:base?base[k]:undefined;const refs=st.panel&&st.panel.refs||{};
 for(const f of fieldsOf(role)){
  if(['frozen','baseline','system'].includes(f.kind)||f.key==='archived')continue;
  if(!m||!m.fields[f.key]||!m.writable.includes(f.key))continue;
  if(!has(source,f.key)){if(mode==='create'&&f.required)throw Error('Required field: '+f.label+'.');continue;}
  let v=source[f.key];if(typeof v==='string')v=v.trim();
  if(v===''||v===null||v===undefined){if(f.required)throw Error('Required field: '+f.label.replace(/ \(.*\)$/,'')+'.');out[f.key]=null;continue;}
  if(f.kind==='number'){const n=Number(v);if(!Number.isFinite(n))throw Error('Enter a number for '+f.label+'.');out[f.key]=n;}
  else if(f.kind==='date'){const d=validDate(v);if(!d)throw Error('Use a valid date for '+f.label.replace(/ \(.*\)$/,'')+'.');out[f.key]=d;}
  else if(f.kind==='month'){const mm=ym(v);if(!mm)throw Error('Use a valid month for '+f.label+'.');out[f.key]=mm+'-01';}
  else if(f.kind==='select'){if(f.options&&!f.options.includes(String(v)))throw Error('Choose a valid '+f.label.toLowerCase()+'.');out[f.key]=String(v).slice(0,300);}
  else if(f.kind==='member'){if(!UUID.test(String(v)))throw Error('A workspace member ID is a UUID; leave it blank for a name only.');out[f.key]=String(v).toLowerCase();}
  else if(f.kind==='boolean')out[f.key]=bool(v);
  else if(f.kind==='ref'){const kept=refs[f.key]===String(v)||base&&base[f.key]===String(v);const ok=kept||(f.ref==='items'?ITEMS.some(x=>x.id===v):R[f.ref].rows.some(r=>r.id===v));if(!ok)throw Error('Choose an existing '+f.label.replace(/ \(.*\)$/,'').toLowerCase()+'.');out[f.key]=String(v);}
  else if(f.kind==='link'){const kept=refs[f.key]===String(v)||base&&base[f.key]===String(v);if(!kept&&!ITEMS.some(x=>x.id===v)&&!RAID.some(x=>x.id===v))throw Error('Choose an existing plan item or RAID entry.');out[f.key]=String(v);}
  else out[f.key]=String(v).slice(0,f.kind==='longtext'?4000:300);
 }
 if(role==='items'){const s=cur('start_date'),e=cur('end_date');if(validDate(s)&&validDate(e)&&validDate(e)<validDate(s))throw Error('The end date is before the start date.');
  const pred=has(out,'predecessor_id')?out.predecessor_id:null;
  if(pred&&editingId){if(pred===editingId)throw Error('An item cannot be its own predecessor.');
   // Reject cycles at save: walking up from the new predecessor must never reach this item.
   const path=[],seen=new Set();let c=pred;while(c&&!seen.has(c)){seen.add(c);path.push(c);if(c===editingId)throw Error('Rejected: this predecessor would create a cycle ('+path.map(itemName).join(' ← ')+').');const r=ITEM[c];c=r?r.predecessor_id:'';}}}
 if(role==='programs'){const h=has(out,'health')?out.health:null;if(h&&h!=='unassessed'){const r=cur('health_rationale'),d=cur('health_date');if(!String(r||'').trim()||!validDate(d))throw Error('Health is a dated judgement: enter the rationale and the assessment date.');}}
 if(role==='settings'){for(const [k,allowed] of [['functions',FUNCTIONS],['stages',STAGES]]){if(out[k]){const bad=String(out[k]).split(',').map(x=>x.trim().toLowerCase()).filter(x=>x&&!allowed.includes(x));if(bad.length)throw Error('Unknown '+k+': '+bad.join(', ')+'. Use: '+allowed.join(', ')+'.');}}
  if(out.due_soon_days!==undefined&&out.due_soon_days!==null&&!(out.due_soon_days>=7&&out.due_soon_days<=365))throw Error('The due-soon window must be 7–365 days.');
  if(out.update_day!==undefined&&out.update_day!==null&&!(Number.isInteger(out.update_day)&&out.update_day>=1&&out.update_day<=28))throw Error('The update day must be a whole number from 1 to 28.');
  if(out.reminder_days!==undefined&&out.reminder_days!==null&&!(Number.isInteger(out.reminder_days)&&out.reminder_days>=1&&out.reminder_days<=60))throw Error('The reminder lead time must be a whole number of days from 1 to 60.');}
 if(role==='team'){const n=cur('name'),p=cur('program_id');if(n&&p&&TEAM.some(t=>t.id!==editingId&&t.program_id===p&&norm(t.name)===norm(n)))throw Error(String(n)+' is already on this program team.');}
 if(mode==='create'&&m&&m.fields.archived&&m.writable.includes('archived'))out.archived=false;
 return out;}
/* P5: every record change from a person's click, change or submit saves at once (records.save, at most 50 changes). An app command
 * collects its changes and saves them once at the end. */
const SAVED=[];let BUFFER=null;
function save(changes,message){if(!changes.length)throw Error('There is nothing to save.');if(changes.length>50)throw Error('This change needs '+changes.length+' record writes; one save holds 50. Save it in smaller parts.');
 if(BUFFER)BUFFER.push(...changes);else tools.call('records.save',{changes});SAVED.push({count:changes.length,message:message||'Saved'});note('success',message||'Saved');st.undoHint=true;}
const lookup=(role,id)=>(R[role].allRows||[]).find(r=>r.id===id)||null;
const roleOfRecord=id=>['items','raid','decisions','updates','programs','team','closes','settings'].find(r=>!R[r].notRead&&R[r].allRows.some(x=>x.id===id))||'';
const PRESETS=pid=>({items:{program_id:pid,item_type:'milestone',function:FN_ORDER[0],status:'planned',is_key:false},programs:{stage:'preclinical',status:'active',health:'unassessed'},decisions:{program_id:pid,kind:'gate',outcome:'pending'},raid:{program_id:pid,raid_type:'risk',status:'open'},updates:{program_id:pid,month:AS_OF?AS_OF.slice(0,7):''},closes:{month:AS_OF?AS_OF.slice(0,7):'',currency:RUNWAY.currency||'EUR'},team:{program_id:pid}});
function openEditor(role,mode,id,preset){
 st.gate=null;let draft={...(preset||{})},version=null;
 if(mode!=='create'){const r=lookup(role,id);if(!r)throw Error('That record is no longer available.');draft={...r.data};version=r.version;if(mode==='duplicate'){if(draft.name!==undefined)draft.name='Copy of '+String(draft.name||'');if(role==='items'){delete draft.baseline_start;delete draft.baseline_end;}}}
 for(const f of S[role])if(f.kind==='frozen')delete draft[f.key];
 // Form defaults from the layout profile: the user's defaults replace the app's own presets, for new records only.
 if(mode==='create'&&FORM_GROUP[role])for(const f of fieldsOf(role)){const v=LAYOUT.defaults[FORM_GROUP[role]+':'+f.key];if(v!==undefined&&v!==null&&v!=='')draft[f.key]=v;}
 const refs={};for(const f of S[role])if((f.kind==='ref'||f.kind==='link')&&draft[f.key])refs[f.key]=String(draft[f.key]);
 // Versions are captured now: a record changed meanwhile is refused by the server, never overwritten.
 const versions=role==='items'?Object.fromEntries(ITEMS.map(x=>[x.id,x.version])):null;
 st.panel={role,mode,id:mode==='edit'?id:null,version:mode==='edit'?version:null,draft,initial:JSON.stringify(draft),refs,versions};
}
function itemChanges(ed,data){
 const orig=ed.mode==='edit'?ITEM[ed.id]:null;if(ed.mode==='edit'&&!orig)throw Error('This item changed or was removed; open it again.');
 const changes=[];const newEnd=has(data,'end_date')?data.end_date:orig&&orig.end_date;
 if(ed.mode!=='edit'){changes.push({kind:'create_record',typeId:roleMap.items.typeId,data:toReal('items',{...data,...sysFields('items',data,null)})});return {changes,msg:'Plan item added'};}
 changes.push({kind:'update_record',recordId:ed.id,expectedVersion:ed.version,data:toReal('items',{...data,...sysFields('items',{...orig,...data},orig)})});
 let slips=0;const reason=String(ed.draft.slip_reason||''),detail=String(ed.draft.slip_detail||'').trim().slice(0,4000);
 if(needsSlip(orig,newEnd)){
  if(!REASONS.includes(reason))throw Error('This committed date moves later: choose a slip reason.');
  if(!canWrite('slips'))throw Error('You cannot record slips, so this date change cannot be saved.');
  changes.push({kind:'create_record',typeId:roleMap.slips.typeId,data:toReal('slips',{plan_item_id:ed.id,changed_on:AS_OF,old_end:orig.end_date,new_end:newEnd,days:diffDays(orig.end_date,newEnd),reason,detail:detail||null})});slips++;}
 let moved=0;
 if(bool(ed.draft.accept_downstream)&&orig.end_date&&newEnd&&newEnd>orig.end_date){
  if(!itemsExact)throw Error('Plan items were not read completely, so successors cannot be moved safely.');
  for(const mv of downstream(ed.id,newEnd)){const v=ed.versions&&has(ed.versions,mv.id)?ed.versions[mv.id]:mv.version;
   const mvData={...(mv.new_start?{start_date:mv.new_start}:{}),end_date:mv.new_end};changes.push({kind:'update_record',recordId:mv.id,expectedVersion:v,data:toReal('items',{...mvData,...sysFields('items',{...ITEM[mv.id],...mvData},ITEM[mv.id])})});moved++;
   if(mv.slip){if(!REASONS.includes(reason))throw Error('Choose a slip reason for the successors that move.');changes.push({kind:'create_record',typeId:roleMap.slips.typeId,data:toReal('slips',{plan_item_id:mv.id,changed_on:AS_OF,old_end:mv.old_end,new_end:mv.new_end,days:mv.days,reason,detail:('Pushed by '+String(orig.name||'predecessor')+'. '+detail).trim().slice(0,4000)})});slips++;}}}
 return {changes,msg:'Saved'+(slips?': '+plural(slips,'slip')+' recorded'+(moved?', '+plural(moved,'successor')+' moved':''):moved?': '+plural(moved,'successor')+' moved':'')};}
function reminderDrift(){const out=[];if(R.team.notRead||R.team.pending)return out;for(const role of ['items','raid']){if(!canWrite(role)||R[role].notRead)continue;for(const x of role==='items'?ITEMS:RAID){const d=sysFields(role,x,x);if(Object.keys(d).length)out.push({role,id:x.id,version:x.version,data:d});}}return out;}
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
const KINDS={closing_balance:'number',due_soon_days:'number',update_day:'number',reminder_days:'number',is_key:'boolean'};
const same=(x,y)=>(x===undefined||x===''?null:x)===(y===undefined||y===''?null:y)||String(x)===String(y)&&x!==null&&y!==null&&x!==undefined&&y!==undefined;
/* An inline edit: one value, saved at once, with the version shown when editing started. */
function inlineEdit(ed){
 const role=roleOfRecord(ed.recordId);if(!role)throw Error('That record is no longer available.');
 if(role==='closes'&&CASH_LINKED)throw Error('The cash forecast comes from '+CASH_APP+'. Change it there.');
 if(!writableField(role,ed.field))throw Error('You cannot change this value.');
 const orig=lookup(role,ed.recordId),version=ed.version===null?orig.version:ed.version;
 let value=ed.value;
 if(role==='items'&&ed.field==='end_date'){const o=ITEM[ed.recordId],ne=validDate(value);
  // A committed, baselined date that moves later needs a reason and records a slip: the item opens with the new date.
  if(o&&ne&&needsSlip(o,ne)){openEditor('items','edit',o.id);st.panel.version=version;st.panel.draft.end_date=ne;note('info','This committed date moves later: choose a slip reason and save.');return;}}
 const data=valuesFromForm(role,{[ed.field]:value},'update',ed.recordId,orig.data);
 for(const k of Object.keys(data))if(same(data[k],orig.data[k]))delete data[k];
 if(!Object.keys(data).length)return;
 save([{kind:'update_record',recordId:ed.recordId,expectedVersion:version,data:toReal(role,{...data,...sysFields(role,{...orig.data,...data},orig.data)})}],'Saved');}
function panelSave(form){
 const ed=st.panel;if(!ed||!ed.role)throw Error('Nothing to save.');const {role,mode,id}=ed;if(!canWrite(role))throw Error('You cannot change the '+ROLE_LABEL[role]+' table.');
 if(role==='closes'&&CASH_LINKED)throw Error('The cash forecast comes from '+CASH_APP+'. Change it there.');
 ed.draft={...ed.draft,...form};
 const shown=editorFields(ed,true).map(f=>f.key),source=Object.fromEntries(Object.entries(ed.draft).filter(([k])=>shown.includes(k)));
 const orig=mode==='edit'?lookup(role,id):null;if(mode==='edit'&&!orig)throw Error('This record changed or was removed; open it again.');
 const data=valuesFromForm(role,source,mode==='edit'?'update':'create',mode==='edit'?id:null,orig?orig.data:null);
 if(role==='updates'&&mode!=='edit'&&UPDATES.some(u=>u.program_id===data.program_id&&u.month===ym(data.month)))throw Error('This program already has an update for '+monthLabel(ym(data.month))+'. Edit that update instead.');
 if(orig)for(const k of Object.keys(data))if(same(data[k],orig.data[k]))delete data[k];
 if(mode==='edit'&&!Object.keys(data).length&&!(role==='items'&&bool(ed.draft.accept_downstream)))throw Error('Nothing changed.');
 if(role==='items'){const r=itemChanges(ed,data);save(r.changes,mode==='edit'?r.msg:'Plan item added');}
 else if(mode==='edit')save([{kind:'update_record',recordId:id,expectedVersion:ed.version,data:toReal(role,{...data,...sysFields(role,{...orig.data,...data},orig.data)})}],'Saved');
 else save([{kind:'create_record',typeId:roleMap[role].typeId,data:toReal(role,{...data,...sysFields(role,data,null)})}],cap(ROLE_LABEL[role])+' added');
 st.panel=null;}
function archive(role,id){const r=lookup(role,id);if(!r)throw Error('That record is no longer available.');if(!canWrite(role))throw Error('You cannot change the '+ROLE_LABEL[role]+' table.');
 if(role==='items'&&(SUCC[id]||[]).length)throw Error('Other items use this as their predecessor. Change their predecessor first.');
 if(role==='closes'&&CASH_LINKED)throw Error('The cash forecast comes from '+CASH_APP+'. Change it there.');
 const v=st.panel&&st.panel.id===id&&st.panel.version!==null?st.panel.version:r.version;
 save([{kind:'archive_record',recordId:id,expectedVersion:v}],cap(ROLE_LABEL[role])+' archived');st.panel=null;}
function setBaseline(pid){if(!itemsExact)throw Error('Plan items were not read completely; set the baseline after a complete read.');if(!writableField('items','baseline_end'))throw Error('You cannot set baselines.');
 const list=ITEMS.filter(x=>x.program_id===pid&&!x.baseline_end&&x.end_date&&x.status!=='cancelled');if(!list.length)throw Error('Every item in this program already has a baseline.');
 const part=list.slice(0,50);save(part.map(x=>({kind:'update_record',recordId:x.id,expectedVersion:x.version,data:toReal('items',{baseline_start:x.start_date||null,baseline_end:x.end_date})})),'Baseline set for '+plural(part.length,'item')+(list.length>50?'; '+(list.length-50)+' more next time':''));return part.length;}
function promote(id,to){const x=RAID.find(r=>r.id===id);if(!x)throw Error('That entry is no longer available.');if(!canWrite('raid'))throw Error('You cannot change the RAID log.');
 if(!((x.raid_type==='assumption'&&to==='risk')||(x.raid_type==='risk'&&to==='issue')))throw Error('Promote an assumption to a risk, or a risk to an issue.');
 const copy={name:String(x.name||''),program_id:x.program_id||null,raid_type:to,likelihood:LMH.includes(x.likelihood)?x.likelihood:null,impact:LMH.includes(x.impact)?x.impact:null,owner:x.owner||null,mitigation:x.mitigation||null,next_review:x.next_review||null,status:'open',linked_item_id:x.id,archived:false};
 save([{kind:'create_record',typeId:roleMap.raid.typeId,data:toReal('raid',{...copy,...sysFields('raid',copy,null)})},{kind:'update_record',recordId:x.id,expectedVersion:x.version,data:toReal('raid',{status:'closed',...sysFields('raid',{...x,status:'closed'},x)})}],cap(x.raid_type)+' promoted to '+to+'; the original is closed');st.panel=null;}
function refreshReminders(){const d=reminderDrift();if(!d.length)throw Error('Owners and reminder dates are already up to date.');const part=d.slice(0,50);
 save(part.map(t=>({kind:'update_record',recordId:t.id,expectedVersion:t.version,data:toReal(t.role,t.data)})),'Owners and reminders updated for '+plural(part.length,'record')+(d.length>50?'; '+(d.length-50)+' more next time':''));return Math.max(0,d.length-50);}
const gateForm=(g,form)=>{g.draft={...g.draft,...Object.fromEntries(['outcome','decided_on','approver','rationale'].filter(k=>has(form,k)).map(k=>[k,form[k]]))};
 g.follow=g.follow.map((f,i)=>({name:form['follow_name_'+i]??f.name,end_date:form['follow_date_'+i]??f.end_date,function:form['follow_fn_'+i]??f.function}));
 if(Object.keys(form).some(k=>k.startsWith('cancel_')||k==='cancel_none'))g.cancel=Object.keys(form).filter(k=>k.startsWith('cancel_')&&k!=='cancel_none'&&bool(form[k])).map(k=>k.slice(7));};
function gateSave(form){const g=st.gate;if(!g)throw Error('No gate open.');gateForm(g,form);
 const d=DECISIONS.find(x=>x.id===g.id);if(!d)throw Error('That gate changed or was removed; open it again.');
 if(!['go','no_go','conditional','decided'].includes(g.draft.outcome))throw Error('Choose the outcome.');
 if(!validDate(g.draft.decided_on))throw Error('Enter the decision date.');
 if(!String(g.draft.rationale||'').trim())throw Error('Record the rationale for the outcome.');
 if(!canWrite('decisions'))throw Error('You cannot record gate outcomes.');
 const changes=[{kind:'update_record',recordId:g.id,expectedVersion:g.version,data:toReal('decisions',{outcome:g.draft.outcome,decided_on:validDate(g.draft.decided_on),approver:String(g.draft.approver||'').trim().slice(0,300)||null,rationale:String(g.draft.rationale).trim().slice(0,4000)})}];
 for(const f of g.follow){if(!String(f.name||'').trim()&&!f.end_date)continue;if(!String(f.name||'').trim())throw Error('Name each follow-up milestone.');const e=validDate(f.end_date);if(!e)throw Error('Give each follow-up milestone a valid date.');if(!FUNCTIONS.includes(f.function))throw Error('Choose a function for each follow-up milestone.');
  if(!canWrite('items'))throw Error('You cannot add plan items.');changes.push({kind:'create_record',typeId:roleMap.items.typeId,data:toReal('items',{name:String(f.name).trim().slice(0,300),program_id:d.program_id,item_type:'milestone',function:f.function,end_date:e,status:'planned',is_key:false,notes:'Follow-up of gate '+String(d.name||'')+'.',archived:false})});}
 for(const id of g.cancel){const x=ITEM[id];if(!x)throw Error('A milestone to cancel is no longer available.');changes.push({kind:'update_record',recordId:id,expectedVersion:has(g.versions,id)?g.versions[id]:x.version,data:toReal('items',{status:'cancelled',...sysFields('items',{...x,status:'cancelled'},x)})});}
 save(changes,'Gate outcome saved'+(changes.length>1?' with '+plural(changes.length-1,'follow-up change'):''));st.gate=null;}
function reportSave(form){const m=ym(form.month||st.up.month)||(AS_OF?AS_OF.slice(0,7):'');if(!m)throw Error('Choose the report month.');
 st.up.draft={...(st.up.draft||{}),...Object.fromEntries(['title','narrative'].filter(k=>has(form,k)).map(k=>[k,String(form[k]).slice(0,4000)]))};
 if(!exact)throw Error('The report needs complete reads of every Programs table.');if(!canWrite('reports'))throw Error('You cannot save reports.');
 const title=String(st.up.draft.title||'').trim()||'Leadership report — '+monthLabel(m);
 save([{kind:'create_record',typeId:roleMap.reports.typeId,data:toReal('reports',{month:m+'-01',title:title.slice(0,300),narrative:String(st.up.draft.narrative||'').trim().slice(0,4000)||null,contents:JSON.stringify(reportContents(m)),saved_on:AS_OF})}],'Report for '+monthLabel(m)+' saved; it never changes');st.up.draft=null;}
function settingsSave(form){if(!OWNER)throw Error('Only the app’s owners change Settings.');if(!canWrite('settings'))throw Error('You cannot change the settings table.');
 const src={};for(const f of S.settings)if(has(form,f.key))src[f.key]=form[f.key];
 const data=valuesFromForm('settings',src,settingsRow?'update':'create',settingsRow?settingsRow.id:null,SET);
 if(settingsRow){for(const k of Object.keys(data))if(same(data[k],SET[k]))delete data[k];if(!Object.keys(data).length)throw Error('Nothing changed.');save([{kind:'update_record',recordId:settingsRow.id,expectedVersion:settingsRow.version,data:toReal('settings',data)}],'Settings saved');}
 else save([{kind:'create_record',typeId:roleMap.settings.typeId,data:toReal('settings',data)}],'Settings saved');}
/* One handler for clicks, changes, form submits and app commands: a command replays the same events, so it saves the same changes. */
function handle(event){const action=String(event.action||''),form=event.form&&typeof event.form==='object'?event.form:{},value=event.value;
 const ed=event.kind==='change'?kit.edit(event,KINDS):null;if(ed){inlineEdit(ed);return;}
 const mv=kit.move(event,'move');if(mv){const x=ITEM[mv.cardId];if(!x)throw Error('That item is no longer available.');if(!ITEM_STATUS.includes(mv.columnId))throw Error('Choose a valid status.');if(x.status===mv.columnId)return;inlineEdit({recordId:x.id,field:'status',version:x.version,value:mv.columnId});return;}
 if(action.startsWith('undo:')){tools.call('undo.run',{undoId:action.slice(5)});st.undo=null;st.undoHint=false;note('success','Undone');return;}
 if(action.startsWith('filter:')){const [,scope,key]=action.split(':');if(st[scope]){st[scope][key]=String(value??'').slice(0,100);st[scope].offset=0;}return;}
 if(action.startsWith('page:')){const [,scope,o]=action.split(':');if(st[scope])st[scope].offset=Math.max(0,Number(o)||0);return;}
 if(action.startsWith('view:')){const [,scope,v]=action.split(':');if(st[scope])st[scope].view=v;return;}
 if(action==='panel:close'){st.panel=null;st.gate=null;return;}
 if(action.startsWith('add:')){const [,role,pid]=action.split(':');if(!S[role]||!roleMap[role])throw Error('That table is not connected to this app.');openEditor(role,'create',null,PRESETS(pid&&PROGRAMS.some(p=>p.id===pid)?pid:st.prog||(PROGRAMS[0]?PROGRAMS[0].id:''))[role]||{});return;}
 if(action.startsWith('open:')){const [,role,id]=action.split(':');openEditor(role,'edit',id);return;}
 if(action.startsWith('duplicate:')){const [,role,id]=action.split(':');openEditor(role,'duplicate',id);return;}
 if(action.startsWith('draft:')&&st.panel){if(event.kind==='change'||event.kind==='click'){const k=action.slice(6);st.panel.draft={...st.panel.draft,...form,...(value!==undefined&&value!==null?{[k]:typeof value==='boolean'?String(value):String(value).slice(0,4000)}:{})};}return;}
 if(action.startsWith('pick:')&&st.panel){const k=action.slice(5);if(value)st.panel.draft[k]=String(value).slice(0,300);return;}
 if(action==='panel:save'&&event.kind==='submit'){panelSave(form);return;}
 if(action.startsWith('archive:')){const [,role,id]=action.split(':');archive(role,id);return;}
 if(action.startsWith('select:')){const id=action.slice(7);st.sel=st.sel===id?null:id;return;}
 if(action==='filter-fn'&&event.kind==='change'){st.tl.fn=String(value||'');return;}
 if(action.startsWith('baseline:')){setBaseline(action.slice(9));return;}
 if(action.startsWith('rebaseline:')){const x=ITEM[action.slice(11)];if(!x)throw Error('That item is no longer available.');if(!x.baseline_end)throw Error('This item has no baseline yet; use Set baseline.');st.panel={role:'rebaseline',id:x.id,version:x.version,reason:''};return;}
 if(action==='rebaseline:save'&&event.kind==='submit'){const c=st.panel;if(!c||c.role!=='rebaseline')throw Error('Nothing to reset.');c.reason=String(form.reason??c.reason??'').trim().slice(0,1000);if(!c.reason)throw Error('Resetting a baseline needs a reason.');
  const x=ITEM[c.id];if(!x)throw Error('That item is no longer available.');if(!writableField('items','baseline_end'))throw Error('You cannot reset baselines.');
  const line='Baseline reset on '+AS_OF+' from '+(x.baseline_end||'—')+' to '+x.end_date+': '+c.reason;
  save([{kind:'update_record',recordId:c.id,expectedVersion:c.version,data:toReal('items',{baseline_start:x.start_date||null,baseline_end:x.end_date,notes:(String(x.notes||'')+(x.notes?'\n':'')+line).slice(-4000)})}],'Baseline reset; the reason is kept in the item notes');st.panel=null;return;}
 if(action.startsWith('outcome:')){const d=DECISIONS.find(x=>x.id===action.slice(8));if(!d)throw Error('That gate is no longer available.');st.panel=null;
  st.gate={id:d.id,version:d.version,draft:{outcome:d.outcome&&d.outcome!=='pending'?d.outcome:'',decided_on:d.decided_on||'',approver:String(d.approver||''),rationale:String(d.rationale||'')},follow:[],cancel:[],versions:Object.fromEntries(ITEMS.filter(x=>x.program_id===d.program_id).map(x=>[x.id,x.version]))};return;}
 if(action==='gate:draft'&&st.gate){gateForm(st.gate,form);return;}
 if(action==='gate:follow'&&st.gate){gateForm(st.gate,form);if(st.gate.follow.length>=10)throw Error('Add up to 10 follow-up milestones at a time.');st.gate.follow.push({name:'',end_date:'',function:FN_ORDER[0]});return;}
 if(action.startsWith('gate:unfollow:')&&st.gate){gateForm(st.gate,form);st.gate.follow.splice(Number(action.slice(14)),1);return;}
 if(action==='gate:save'&&event.kind==='submit'){gateSave(form);return;}
 if(action.startsWith('matrix:')){const k=action.slice(7);st.raid.matrix=st.raid.matrix===k?'':k;st.raid.offset=0;return;}
 if(action.startsWith('promote:')){const [,id,to]=action.split(':');promote(id,to);return;}
 if(action.startsWith('up:')){st.up.tab=action.slice(3);st.up.offset=0;st.up.reportView=null;return;}
 if(action==='report:month'&&event.kind==='change'){const m=ym(value);if(m)st.up.month=m;return;}
 if(action==='report:draft'){st.up.draft={...(st.up.draft||{}),...Object.fromEntries(['title','narrative'].filter(k=>has(form,k)).map(k=>[k,String(form[k]).slice(0,4000)]))};return;}
 if(action==='report:save'&&event.kind==='submit'){reportSave(form);return;}
 if(action.startsWith('report:open:')){st.up.reportView=action.slice(12);return;}
 if(action==='report:close'){st.up.reportView=null;return;}
 if(action.startsWith('digest:')){st.up.digestView=action.slice(7);return;}
 if(action==='reminders'){refreshReminders();return;}
 if(action==='settings:save'&&event.kind==='submit'){settingsSave(form);return;}
}
if(event.kind!=='command'&&!action.startsWith('nav:')&&action!=='context'){try{handle(event);}catch(e){note('error',String(e&&e.message||e).slice(0,280));}}
// G8: after a save, the next screen made by the server offers Undo for the person's own last action (undo.list answers {actions}).
if(event.kind!=='command'&&inp.saved&&st.undoHint&&(event.kind==='open'||event.kind==='refresh')){st.undoHint=false;try{const u=tools.call('undo.list',{});st.undo=(u&&Array.isArray(u.actions)?u.actions:u&&Array.isArray(u.entries)?u.entries:[]).slice(0,1).map(x=>({undoId:x.undoId,label:String(x.label||'last change').slice(0,60)}));}catch(e){st.undo=null;}}

/* ---------- rendering helpers ---------- */
const btn=(text,a,o)=>kit.button(text,a,o||{});
const TONE={green:'pg-green',amber:'pg-amber',red:'pg-red',blue:'pg-blue'};
const pill=(text,tone)=>'<span class="k-pill '+(TONE[tone]||'pg-grey')+'">'+esc(text)+'</span>';
const statusTone=s=>s==='done'?'green':s==='at_risk'?'amber':s==='in_progress'?'blue':'';
const healthBadge=h=>pill(cap(h),h==='green'?'green':h==='amber'?'amber':h==='red'?'red':'');
const empty=(title,text,act)=>kit.empty({title,text,...(act?{action:{label:act[0],action:act[1]}}:{})});
const loading=()=>'<div class="k-card k-muted" role="status">Loading…</div>';
const partial=()=>readProblems.length?'<p class="k-small pg-partial">Some data could not be read completely, so totals and the critical path are withheld: '+readProblems.slice(0,4).map(esc).join(' ')+'</p>':'';
const tot=n=>exact?String(n):'—';
const nameBtn=(role,id,text,sub)=>'<button type="button" class="pg-link" data-action="open:'+esc(role)+':'+esc(id)+'">'+esc(text||'Unnamed')+'</button>'+(sub?'<span class="pg-sub">'+esc(sub)+'</span>':'');
/* Inline cells (G3): the value is edited where it is shown and saved at once. Read-only where the person cannot change it. */
function cell(role,row,field,kind,text){if(!writableField(role,field))return text!==undefined?text:esc(row[field]===null||row[field]===undefined||row[field]===''?'—':row[field]);
 return kit.cell({recordId:row.id,version:row.version,field,value:kind==='date'?validDate(row[field]):row[field],kind,label:(fieldsOf(role).find(f=>f.key===field)||{label:field}).label.replace(/ \(.*\)$/,'')});}
function selCell(role,row,field,opts,text){if(!writableField(role,field))return text!==undefined?text:esc(optionLabel(field,row[field]||''));const v=String(row[field]||'');
 return '<select class="k-cell" data-action="edit:'+esc(row.id)+':'+field+':'+row.version+'" aria-label="'+esc((fieldsOf(role).find(f=>f.key===field)||{label:field}).label)+'">'+(opts.includes(v)?'':'<option value="">—</option>')+opts.map(o=>'<option value="'+esc(o)+'"'+(o===v?' selected':'')+'>'+esc(optionLabel(field,o))+'</option>').join('')+'</select>';}
const opts=(list,key)=>list.map(o=>[o,optionLabel(key,o)]);
const select=(name,action,value,options,lbl,all)=>'<label class="k-picker"><span>'+esc(lbl)+'</span><select name="'+esc(name)+'" data-ui-state="true" data-action="'+esc(action)+'">'+(all?'<option value="">'+esc(all)+'</option>':'')+options.map(o=>'<option value="'+esc(o[0])+'"'+(String(value||'')===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></label>';
const search=(scope,value)=>'<label class="k-picker"><span>Search</span><input type="search" name="q" data-ui-state="true" data-action="filter:'+scope+':q" value="'+esc(value||'')+'"></label>';
const picker=()=>PROGRAMS.length?kit.picker({label:'Program',action:'context',value:st.prog,options:[{value:'',label:'All programs'}].concat(programOptions().map(o=>({value:o[0],label:o[1]})))}):'';
const undoBtn=()=>st.undo&&st.undo.length?kit.undo(st.undo):'';
function head(title,actions,withPicker){return '<div class="k-row pg-head"><h2 class="k-grow">'+esc(title)+'</h2>'+(withPicker===false?'':picker())+undoBtn()+(actions||'')+'</div>';}
const PER=Math.min(50,Math.max(10,num(cfg.pageSize,25)||25));
function pageOf(scope,rows){const o=Math.min(Number(st[scope].offset)||0,Math.max(0,Math.floor(Math.max(0,rows.length-1)/PER)*PER));st[scope].offset=o;
 return {rows:rows.slice(o,o+PER),pager:rows.length>PER?kit.pager({offset:o,limit:PER,total:rows.length,action:'page:'+scope}):''};}
const textQ=(q,...parts)=>!q||parts.some(p=>String(p??'').toLowerCase().includes(q));
const card=(title,body,extra)=>'<section class="k-card pg-card">'+(title?'<div class="k-row pg-card-head"><h3 class="k-grow">'+esc(title)+'</h3>'+(extra||'')+'</div>':'')+body+'</section>';

/* ---------- Overview ---------- */
function dueSoonList(){const out=[];
 for(const x of ITEMS)if(inProg(x.program_id)&&!['done','cancelled'].includes(x.status)&&inWindow(x.end_date))out.push({date:x.end_date,kind:isMilestone(x)?(isKey(x)?'Key milestone':'Milestone'):'Activity ends',name:String(x.name||''),program:x.program_id,act:'open:items:'+x.id});
 for(const d of DECISIONS)if(inProg(d.program_id)&&(!d.outcome||d.outcome==='pending')&&inWindow(d.target_date))out.push({date:d.target_date,kind:d.kind==='gate'?'Gate':'Decision',name:String(d.name||''),program:d.program_id,act:'open:decisions:'+d.id});
 return out.sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name));}
function updateMonthDue(){if(!AS_OF)return '';const m=AS_OF.slice(0,7);return Number(AS_OF.slice(8,10))>=UPDATE_DAY?m:addMonths(m,-1);}
function exceptionsList(all){const ex=[];const due=updateMonthDue(),pick=id=>all||inProg(id);
 if(due)for(const p of PROGRAMS)if(pick(p.id)&&(p.data.status||'active')==='active'&&!UPDATES.some(u=>u.program_id===p.id&&u.month===due))ex.push(['No monthly update for '+monthLabel(due)+': '+String(p.data.name||''),'add:updates:'+p.id,'Add update']);
 for(const x of ITEMS.filter(x=>pick(x.program_id)&&isMilestone(x)&&overdue(x)).sort((a,b)=>a.end_date.localeCompare(b.end_date)))ex.push(['Overdue milestone: '+String(x.name||'')+' ('+progName(x.program_id)+'), due '+dateLabel(x.end_date),'open:items:'+x.id,'Open']);
 for(const d of DECISIONS.filter(d=>pick(d.program_id)&&d.kind==='gate'&&(!d.outcome||d.outcome==='pending')&&!readiness(d).total))ex.push(['Gate without criteria: '+String(d.name||'')+' ('+progName(d.program_id)+')','open:decisions:'+d.id,'Add criteria']);
 for(const x of RAID.filter(x=>pick(x.program_id)&&openRaid(x)&&x.next_review&&AS_OF&&x.next_review<AS_OF))ex.push(['Past review date: '+String(x.name||'')+' ('+dateLabel(x.next_review)+')','open:raid:'+x.id,'Review']);
 for(const p of PROGRAMS.filter(p=>pick(p.id))){const h=healthOf(p);if(h.stale)ex.push([(h.h==='unassessed'||!h.d?'Health not assessed: ':'Health older than '+STALE_HEALTH_DAYS+' days ('+dateLabel(h.d)+'): ')+String(p.data.name||''),'open:programs:'+p.id,'Assess']);}
 for(const [pid,c] of Object.entries(CRIT))if(pick(pid)&&c.state==='cycle')ex.push(['Predecessor cycle in '+progName(pid)+': '+c.cycle.map(itemName).join(', ')+'. Fix a predecessor to restore the critical path.','nav:plan','Plan']);
 const conf=ITEMS.filter(x=>pick(x.program_id)&&conflict(x));if(conf.length)ex.push([plural(conf.length,'item')+' starts on or before its predecessor ends (finish-to-start).','nav:plan','Plan']);
 return ex;}
function overview(){
 let body=head('Overview');
 if(R.programs.unbound)return body+empty('Programs are not connected','This app has no programs table. Reinstall the app or connect the table under Access.');
 if(!PROGRAMS.length)return body+empty('No programs yet','Add your first program to plan its milestones, gates and risks, or ask Claude or ChatGPT to set one up from a development plan you share.',canWrite('programs')?['Add program','add:programs']:null);
 body+=partial();
 const its=ITEMS.filter(x=>inProg(x.program_id)),risks=RAID.filter(x=>inProg(x.program_id));
 const next=its.filter(x=>isKey(x)&&!['done','cancelled'].includes(x.status)&&x.end_date&&AS_OF&&x.end_date>=AS_OF).sort((a,b)=>a.end_date.localeCompare(b.end_date))[0];
 const highRisks=risks.filter(x=>x.raid_type==='risk'&&openRaid(x)&&band(score(x))==='high');
 const od=its.filter(overdue),qSlips=Q?SLIPS.filter(s=>s.changed_on&&s.changed_on>=Q.start&&s.changed_on<=Q.end&&(!st.prog||ITEM[s.plan_item_id]&&inProg(ITEM[s.plan_item_id].program_id))):[];
 const doneQ=Q?its.filter(x=>isMilestone(x)&&x.status==='done'&&x.baseline_end&&x.end_date>=Q.start&&x.end_date<=Q.end):[],onTime=doneQ.filter(x=>x.end_date<=x.baseline_end).length;
 const c=next&&cashAt(next);
 body+='<section class="k-card pg-hero"><span class="k-small k-muted">Next key milestone</span><p class="pg-hero-text">'+(next?nameBtn('items',next.id,next.name)+' · '+esc(progName(next.program_id))+', '+esc(dateLabel(next.end_date))+' ('+plural(diffDays(AS_OF,next.end_date),'day')+')':'No upcoming key milestone')+'</p>'+(c&&c.cash!==undefined?'<span class="k-small">Cash at this milestone <b>'+esc(money(c.cash,RUNWAY.currency))+'</b>'+(RUNWAY.source==='runway'?' (Runway '+esc(monthLabel(RUNWAY.asOf))+')':'')+'</span>':'')+'</section>';
 body+='<div class="k-grid pg-stats">'+kit.stat('Overdue items',tot(od.length))+kit.stat('Open high risks',tot(highRisks.length))+kit.stat('Slips in '+(Q?Q.label:'this quarter'),exact?String(qSlips.length):'—')+kit.stat('On-time milestones in '+(Q?Q.label:'this quarter'),!exact?'—':doneQ.length?Math.round(onTime/doneQ.length*100)+'%':'None done')+'</div>';
 body+='<div class="k-grid pg-cards">'+SHOWN.map(programCard).join('')+'</div>';
 const due=dueSoonList(),ex=exceptionsList();
 body+='<div class="pg-two">'+card('Due in the next '+DUE_SOON+' days',due.length?'<ul class="pg-list">'+due.slice(0,15).map(d=>'<li><span class="k-grow"><b>'+esc(d.name)+'</b><span class="pg-sub">'+esc(d.kind)+' · '+esc(progName(d.program))+' · '+esc(dateLabel(d.date))+'</span></span>'+btn('Open',d.act,{ariaLabel:'Open '+d.name})+'</li>').join('')+'</ul>'+(due.length>15?'<p class="k-small k-muted">And '+(due.length-15)+' more on Plan and Gates.</p>':''):'<p class="k-muted">Nothing is due in this window.</p>')+
  card('Needs attention',ex.length?'<ul class="pg-list">'+ex.slice(0,14).map(e=>'<li><span class="k-grow">'+esc(e[0])+'</span>'+btn(e[2],e[1])+'</li>').join('')+'</ul>'+(ex.length>14?'<p class="k-small k-muted">And '+(ex.length-14)+' more.</p>':''):'<p class="k-muted">Nothing needs attention.</p>')+'</div>';
 const reasons={};for(const s of qSlips)reasons[s.reason]=(reasons[s.reason]||0)+1;
 if(exact&&qSlips.length)body+=card('Slips in '+(Q?Q.label:'this quarter'),'<p>'+plural(qSlips.length,'slip')+', '+plural(qSlips.reduce((n,s)=>n+num(s.days,0),0),'day')+' in total.</p><ul class="pg-list">'+Object.entries(reasons).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<li><span class="k-grow">'+esc(REASON_LABEL[k]||cap(k))+'</span><b>'+plural(v,'slip')+'</b></li>').join('')+'</ul>');
 return body;}
function programCard(p){const h=healthOf(p),items=ITEMS.filter(x=>x.program_id===p.id);
 const nx=items.filter(x=>isMilestone(x)&&!['done','cancelled'].includes(x.status)&&x.end_date&&AS_OF&&x.end_date>=AS_OF).sort((a,b)=>a.end_date.localeCompare(b.end_date))[0];
 const hr=RAID.filter(x=>x.program_id===p.id&&x.raid_type==='risk'&&openRaid(x)&&band(score(x))==='high').length;
 return '<article class="k-card pg-pcard"><div class="k-row"><h3 class="k-grow">'+esc(p.data.name||'Unnamed')+'</h3>'+healthBadge(h.h)+'</div><p class="pg-sub">'+esc([p.data.code,STAGE_LABEL[p.data.stage]||cap(p.data.stage),p.data.indication].filter(Boolean).join(' · '))+'</p><dl class="pg-dl"><dt>Health assessed</dt><dd>'+(h.d?esc(dateLabel(h.d))+(h.stale?' '+pill('Older than '+STALE_HEALTH_DAYS+' days','amber'):''):pill('Not assessed','amber'))+'</dd>'+(h.rationale?'<dt>Rationale</dt><dd>'+esc(h.rationale.slice(0,140))+'</dd>':'')+'<dt>Next milestone</dt><dd>'+(nx?esc(nx.name)+' · '+esc(dateLabel(nx.end_date)):'—')+'</dd><dt>Open high risks</dt><dd>'+tot(hr)+'</dd><dt>Lead</dt><dd>'+esc(p.data.lead||'—')+'</dd></dl>'+(canWrite('programs')?'<div class="k-row">'+btn('Assess health','open:programs:'+p.id,{ariaLabel:'Assess health of '+String(p.data.name||'program')})+'</div>':'')+'</article>';}

/* ---------- Timeline ---------- */
function ganttRows(fnFilter){const rows=[];
 for(const p of SHOWN){const its=ITEMS.filter(x=>x.program_id===p.id&&(!fnFilter||x.function===fnFilter)&&(x.end_date||x.start_date));if(!its.length)continue;
  rows.push({lane:'program',text:String(p.data.name||'Unnamed'),pid:p.id});
  for(const fn of FN_ORDER.concat(FUNCTIONS.filter(f=>!FN_ORDER.includes(f)))){const l=its.filter(x=>x.function===fn).sort((a,b)=>(anchor(a)||'').localeCompare(anchor(b)||'')||String(a.name||'').localeCompare(String(b.name||'')));if(!l.length)continue;rows.push({lane:'fn',text:FN_LABEL[fn]||fn});for(const x of l)rows.push({item:x});}}
 return rows;}
function gantt(rows){const dates=[];for(const r of rows)if(r.item){const x=r.item;for(const d of [x.start_date,x.end_date,x.baseline_start,x.baseline_end])if(d)dates.push(d);}
 if(AS_OF)dates.push(AS_OF);if(!dates.length)return '';dates.sort();
 const lw=inp.viewport&&inp.viewport.width==='phone'?140:inp.viewport&&inp.viewport.width==='panel'?170:230;
 const m0=dates[0].slice(0,7),m1=dates[dates.length-1].slice(0,7),months=diffMonths(m0,m1)+1,start=dayNo(m0+'-01'),end=dayNo(lastDay(m1))+1,span=end-start;
 const pct=d=>((dayNo(d)-start)/span*100).toFixed(3)+'%',w=(a,b)=>Math.max(0.4,(dayNo(b)-dayNo(a)+1)/span*100).toFixed(3)+'%';
 const width=Math.max(680,Math.min(3600,months*56))+lw;
 const drive=st.sel&&ITEM[st.sel]?new Set(chainOf(st.sel).chain):null;
 const step=months>36?3:1,ticks=[];for(let i=0;i<months;i+=step){const m=addMonths(m0,i);ticks.push('<span style="left:'+pct(m+'-01')+'">'+esc(MONTHS[Number(m.slice(5,7))-1]+(m.slice(5,7)==='01'||i===0?' '+m.slice(0,4):''))+'</span>');}
 const grid=ticks.map((t,i)=>'<i class="pg-g-grid" style="left:'+pct(addMonths(m0,i*step)+'-01')+'"></i>').join('');
 let html='<div class="pg-gantt-wrap" role="region" aria-label="Program timeline" tabindex="0"><div class="pg-gantt" style="min-width:'+width+'px;--lw:'+lw+'px">';
 html+='<div class="pg-g-head"><div class="pg-g-label">Item</div><div class="pg-g-axis">'+ticks.join('')+(AS_OF?'<i class="pg-today" style="left:'+pct(AS_OF)+'"></i>':'')+'</div></div>';
 for(const r of rows){
  if(r.lane){html+='<div class="pg-g-lane'+(r.lane==='program'?' program':'')+'"><div class="pg-g-label">'+esc(r.text)+'</div><div class="pg-g-track">'+grid+'</div></div>';continue;}
  const x=r.item,crit=CRIT_IDS.has(x.id),dr=drive&&drive.has(x.id),dim=drive&&!dr,ms=isMilestone(x),c=ms?cashAt(x):null;
  const title=String(x.name||'')+' · '+(ms?'milestone '+dateLabel(x.end_date):dateLabel(x.start_date||x.end_date)+' – '+dateLabel(x.end_date))+(x.baseline_end?' · baseline '+dateLabel(x.baseline_end):'')+' · '+label(x.status)+(crit?' · critical path':'');
  const sd=slipDays(x);let track=grid;
  if(x.baseline_end)track+='<i class="pg-ghost" style="left:'+pct(x.baseline_start||x.baseline_end)+';width:'+(x.baseline_start?w(x.baseline_start,x.baseline_end):'6px')+'"></i>';
  const cls=(crit?' crit':'')+(dr?' drive':'')+' '+esc(x.status||'');
  if(ms)track+='<button type="button" class="pg-diamond'+(isKey(x)?' key':'')+cls+'" style="left:'+pct(x.end_date)+'" data-action="select:'+esc(x.id)+'" aria-label="'+esc(title)+'" aria-pressed="'+(st.sel===x.id)+'"></button>';
  else if(x.end_date){const a=x.start_date||x.end_date;track+='<button type="button" class="pg-bar'+cls+'" style="left:'+pct(a)+';width:'+w(a,x.end_date)+'" data-action="select:'+esc(x.id)+'" aria-label="'+esc(title)+'" aria-pressed="'+(st.sel===x.id)+'"></button>';}
  if(AS_OF)track+='<i class="pg-today" style="left:'+pct(AS_OF)+'"></i>';
  const cash=c&&c.cash!==undefined?'<span class="k-pill '+(TONE[cushionTone(c.cushion)]||'pg-grey')+'">'+esc(money(c.cash,RUNWAY.currency))+' · '+esc((c.cushion.beyond?'≥ ':'')+plural(c.cushion.months,'month'))+'</span>':c&&c.beyondHorizon?'<span class="k-pill pg-grey">Beyond the cash forecast</span>':'';
  html+='<div class="pg-g-row'+(dim?' dim':'')+'"><div class="pg-g-label"><b>'+esc(x.name||'Unnamed')+'</b><span class="pg-sub">'+esc([x.owner,dateLabel(x.end_date),sd===null?'no baseline':sd>0?'+'+sd+' days':sd<0?sd+' days':'on baseline'].filter(Boolean).join(' · '))+'</span>'+cash+'</div><div class="pg-g-track">'+track+'</div></div>';}
 html+='</div></div><div class="pg-legend k-small"><span><i></i>Activity</span><span><i class="dia"></i>Key milestone</span><span><i class="crit"></i>Critical path</span><span><i class="ghost"></i>Baseline</span><span><i class="today"></i>Today</span>'+(drive?'<span><i class="drive"></i>Drives the selected date</span>':'')+(RUNWAY.state==='ok'?'<span>Cash at key milestones'+(RUNWAY.source==='runway'?' from Runway ('+esc(monthLabel(RUNWAY.asOf))+')':'')+': green 6+ months of cushion, amber 3–6, red under 3</span>':'')+'</div>';
 return html;}
function critPanel(pid){const c=CRIT[pid];if(!c)return '';const name=progName(pid);
 if(c.state==='partial')return '<p class="k-muted">'+esc(name)+': the critical path is withheld because plan items were not read completely.</p>';
 if(c.state==='cycle')return '<p class="k-muted">'+esc(name)+': critical path disabled, the predecessors form a cycle ('+esc(c.cycle.map(itemName).join(', '))+').</p>';
 if(c.state!=='ok')return '<p class="k-muted">'+esc(name)+': '+(c.state==='nokey'?'no key milestone is marked, so there is no critical path. Mark the decisive milestone as key.':'no milestones yet.')+'</p>';
 return '<h4 class="pg-h4">'+esc(name)+' → '+esc(c.target.name)+' ('+esc(dateLabel(c.target.end_date))+')</h4><ol class="pg-crit">'+c.ids.map(id=>{const x=ITEM[id];return '<li><span class="k-grow"><b>'+esc(x.name||'')+'</b> · '+esc(FN_LABEL[x.function]||x.function||'')+(conflict(x)?' '+pill('Starts before predecessor ends','amber'):'')+'</span><span>'+esc(x.start_date&&!isMilestone(x)?dateLabel(x.start_date)+' – ':'')+esc(dateLabel(x.end_date))+'</span></li>';}).join('')+'</ol>'+(c.broken?'<p class="k-small k-muted">The chain stops at an '+esc(c.broken)+'.</p>':'');}
function drivePanel(){const x=st.sel&&ITEM[st.sel];if(!x)return '';const c=chainOf(x.id);
 return card('What drives this date: '+String(x.name||''),'<p class="k-small k-muted">Its chain of predecessors (finish-to-start), earliest first. '+(CRIT_IDS.has(x.id)?'This item is on the critical path.':'This item is not on the critical path.')+'</p>'+(c.cycle?'<p class="k-muted">The predecessors form a cycle; fix one predecessor in Plan.</p>':'<ol class="pg-crit">'+c.chain.map(id=>{const y=ITEM[id];return '<li><span class="k-grow"><b>'+esc(y.name||'')+'</b> · '+esc(FN_LABEL[y.function]||'')+' · '+esc(progName(y.program_id))+'</span><span>'+esc(dateLabel(y.end_date))+'</span></li>';}).join('')+'</ol>'+(c.broken?'<p class="k-small k-muted">The chain stops at an '+esc(c.broken)+'.</p>':'')),btn('Open item','open:items:'+x.id)+btn('Clear','select:'+x.id));}
function timeline(){
 const fn=st.tl.fn||'';
 let body=head('Timeline',(canWrite('items')?btn('Add item','add:items',{primary:true}):''));
 if(!PROGRAMS.length)return body+empty('No programs yet','Add a program first; its milestones and activities then show here.',canWrite('programs')?['Add program','add:programs']:null);
 body+=partial();
 const rows=ganttRows(fn);
 body+='<div class="k-row pg-filters">'+select('function','filter-fn',fn,FN_ORDER.map(f=>[f,FN_LABEL[f]]),'Function','All functions')+'</div>';
 const rn=runwayNote();if(rn||integrationHint())body+='<p class="k-small k-muted">'+esc(rn)+'</p>'+integrationHint();
 if(!rows.some(r=>r.item))return body+(ITEMS.some(x=>inProg(x.program_id))?'<p class="k-muted">No dated items match this function.</p>':empty('No plan items yet','Add the first milestone or activity, or ask Claude or ChatGPT to build a first plan from a document you share.',canWrite('items')?['Add item','add:items']:null));
 body+='<section class="k-card pg-flush">'+gantt(rows.slice(0,400))+'</section>'+(rows.length>400?'<p class="k-small k-muted">The timeline shows the first 400 rows; choose one program or function to see the rest.</p>':'');
 body+=drivePanel();
 body+=card('Critical path','<p class="k-small k-muted">The finish-to-start chain through predecessors that ends at each program’s latest key milestone.</p>'+SHOWN.map(p=>critPanel(p.id)).join(''));
 if(st.prog){const keys=ITEMS.filter(x=>x.program_id===st.prog&&isKey(x)).sort((a,b)=>a.end_date.localeCompare(b.end_date));
  body+=card('Key milestones: baseline and current dates',kit.table({columns:[{key:'name',label:'Milestone',render:x=>nameBtn('items',x.id,x.name)},{key:'baseline_end',label:'Baseline',render:x=>esc(x.baseline_end?dateLabel(x.baseline_end):'No baseline')},{key:'end_date',label:'Current',render:x=>esc(dateLabel(x.end_date))},{key:'moves',label:'Moves and reasons',render:x=>esc(slipsOf(x.id).map(s=>'+'+s.days+' d ('+(REASON_LABEL[s.reason]||s.reason)+')').join('; ')||'—')}],rows:keys,empty:'<p class="k-muted">No key milestones in this program.</p>'}));}
 return body;}

/* ---------- Plan ---------- */
function itemCellHtml(k,x){
 if(k==='name')return nameBtn('items',x.id,x.name,(isMilestone(x)?(isKey(x)?'Key milestone':'Milestone'):'Activity')+(CRIT_IDS.has(x.id)?' · critical path':''));
 if(k==='program_id')return esc(progName(x.program_id));
 if(k==='function')return selCell('items',x,'function',FN_ORDER.concat(FUNCTIONS.filter(f=>!FN_ORDER.includes(f))));
 if(k==='owner')return cell('items',x,'owner','text');
 if(k==='start_date')return cell('items',x,'start_date','date',esc(dateLabel(x.start_date)));
 if(k==='end_date')return cell('items',x,'end_date','date',esc(dateLabel(x.end_date)))+(overdue(x)?' '+pill('Overdue','red'):'');
 if(k==='baseline_end')return x.baseline_end?esc(dateLabel(x.baseline_end)):'<span class="k-muted">No baseline</span>';
 if(k==='slip'){const d=slipDays(x);return d===null?'<span class="k-muted">No baseline</span>':d>0?pill('+'+d+' days','amber'):d<0?pill(d+' days','green'):'On baseline';}
 if(k==='status')return selCell('items',x,'status',ITEM_STATUS,pill(cap(x.status),statusTone(x.status)));
 if(k==='predecessor_id')return x.predecessor_id?esc(itemName(x.predecessor_id))+(conflict(x)?' '+pill('Overlap','amber'):''):'—';
 return esc(x[k]??'—');}
function plan(){
 const f=st.plan,q=String(f.q||'').toLowerCase().trim(),view=f.view==='board'?'board':'list';
 const needBase=SHOWN.filter(pr=>ITEMS.some(x=>x.program_id===pr.id&&!x.baseline_end&&x.end_date&&x.status!=='cancelled'));
 let body=head('Plan',(canWrite('items')?btn('Add item','add:items',{primary:true}):''));
 if(!PROGRAMS.length)return body+empty('No programs yet','Add a program first, then its milestones and activities.',canWrite('programs')?['Add program','add:programs']:null);
 if(R.items.unbound)return body+empty('Plan items are not connected','This app has no plan items table.');
 body+=partial();
 const all=ITEMS.filter(x=>inProg(x.program_id));
 if(!all.length)return body+empty('No plan items yet','Add the first milestone, or ask Claude or ChatGPT to propose a plan from a development plan you share.',canWrite('items')?['Add item','add:items']:null);
 const owners=[...new Set(all.map(x=>String(x.owner||'')).filter(Boolean))].sort();
 const rows=all.filter(x=>textQ(q,x.name,x.owner,x.notes,progName(x.program_id))&&(!f.fn||x.function===f.fn)&&(!f.status||x.status===f.status)&&(!f.owner||String(x.owner||'')===f.owner)).sort((a,b)=>(a.end_date||'').localeCompare(b.end_date||'')||String(a.name||'').localeCompare(String(b.name||'')));
 body+='<div class="k-row pg-filters">'+search('plan',f.q)+select('function','filter:plan:fn',f.fn,FN_ORDER.map(x=>[x,FN_LABEL[x]]),'Function','All')+(view==='list'?select('status','filter:plan:status',f.status,opts(ITEM_STATUS,'status'),'Status','All'):'')+(owners.length?select('owner','filter:plan:owner',f.owner,owners.map(o=>[o,o]),'Owner','All'):'')+'<span class="k-grow"></span>'+btn(view==='list'?'Board':'List',view==='list'?'view:plan:board':'view:plan:list',{ariaLabel:view==='list'?'Show as a board by status':'Show as a list'})+'</div>';
 if(needBase.length&&writableField('items','baseline_end'))body+='<div class="k-row pg-filters">'+needBase.slice(0,3).map(pr=>btn('Set baseline: '+String(pr.data.name||''),'baseline:'+pr.id,{disabled:!itemsExact})).join('')+'<span class="k-small k-muted">Records today’s planned dates as the plan of record.</span></div>';
 if(view==='board'){const shown=rows.slice(0,200);
  return body+(canWrite('items')?'<p class="k-small k-muted">Drag a card, or use its menu, to change its status.</p>':'')+kit.board({action:'move',columns:ITEM_STATUS.map(s=>({id:s,label:cap(s),cards:shown.filter(x=>x.status===s).map(x=>({id:x.id,label:String(x.name||''),html:nameBtn('items',x.id,x.name,progName(x.program_id)+' · '+dateLabel(x.end_date))}))}))})+(rows.length>200?'<p class="k-small k-muted">The board shows the first 200 items; filter to see the rest.</p>':'');}
 const cols=LAYOUT.cols.items.filter(k=>colShown('items',k)&&!(k==='program_id'&&st.prog)),p=pageOf('plan',rows);
 const lbl=k=>(templateLayoutSchema.groups.items.find(c=>c.id===k)||{}).label||k;
 return body+'<div class="pg-table">'+kit.table({columns:cols.map(k=>({key:k,label:lbl(k),render:x=>itemCellHtml(k,x)})).concat(writableField('items','baseline_end')?[{key:'actions',label:'',render:x=>x.baseline_end?btn('Reset baseline','rebaseline:'+x.id,{ariaLabel:'Reset baseline of '+String(x.name||'item')}):''}]:[]),rows:p.rows,empty:'<p class="k-muted">No items match the search or filters.</p>'})+'</div>'+p.pager;}

/* ---------- Gates and decisions ---------- */
function gateCard(d){const r=readiness(d),days=d.target_date&&AS_OF?diffDays(AS_OF,d.target_date):null;
 return '<article class="k-card pg-gate"><div class="k-row"><h3 class="k-grow">'+nameBtn('decisions',d.id,d.name)+'</h3>'+pill(OUTCOME_LABEL[d.outcome||'pending']||'Pending',d.outcome==='go'?'green':d.outcome==='no_go'?'red':d.outcome==='conditional'?'amber':'')+'</div><p class="pg-sub">'+esc(progName(d.program_id))+' · '+(d.target_date?esc(dateLabel(d.target_date))+(days!==null?' ('+(days>=0?plural(days,'day')+' to go':plural(-days,'day')+' ago')+')':''):'No target date')+'</p>'+
 (r.total?'<p>Readiness: <b>'+r.met+' of '+r.total+'</b> criteria met'+(r.notMet?', '+r.notMet+' not met':'')+(r.open?', '+r.open+' open':'')+'</p><ul class="pg-checks">'+r.list.map(c=>'<li>'+pill(c.state==='met'?'Met':c.state==='not met'?'Not met':'Open',c.state==='met'?'green':c.state==='not met'?'red':'')+' <span>'+esc(c.text)+'</span></li>').join('')+'</ul>':'<p>'+pill('No criteria','amber')+' Add criteria so readiness can be judged.</p>')+
 (canWrite('decisions')?'<div class="k-row">'+btn('Record outcome','outcome:'+d.id,{primary:true,ariaLabel:'Record outcome for '+String(d.name||'gate')})+btn('Edit criteria','open:decisions:'+d.id)+'</div>':'')+'</article>';}
function decisions(){
 const f=st.dec,q=String(f.q||'').toLowerCase().trim();
 let body=head('Gates & decisions',canWrite('decisions')?btn('Add gate or decision','add:decisions',{primary:true}):'');
 if(!PROGRAMS.length)return body+empty('No programs yet','Add a program first, then its stage gates.',canWrite('programs')?['Add program','add:programs']:null);
 body+=partial();
 const mine=DECISIONS.filter(d=>inProg(d.program_id));
 if(!mine.length)return body+empty('No gates or decisions yet','Add the next stage gate with its criteria, so readiness can be tracked.',canWrite('decisions')?['Add gate','add:decisions']:null);
 const gates=mine.filter(d=>d.kind==='gate'&&(!d.outcome||d.outcome==='pending')).sort((a,b)=>(a.target_date||'9').localeCompare(b.target_date||'9'));
 body+='<h3 class="pg-h3">Upcoming gates</h3>'+(gates.length?'<div class="k-grid pg-cards">'+gates.map(gateCard).join('')+'</div>':'<p class="k-muted">No pending gates.</p>');
 const log=mine.filter(d=>d.kind!=='gate'||(d.outcome&&d.outcome!=='pending')).filter(d=>textQ(q,d.name,d.rationale,d.options,progName(d.program_id))&&(!f.outcome||(d.outcome||'pending')===f.outcome)).sort((a,b)=>(b.decided_on||b.target_date||'').localeCompare(a.decided_on||a.target_date||''));
 const p=pageOf('dec',log),cols=LAYOUT.cols.decisions.filter(k=>colShown('decisions',k)&&!(k==='program_id'&&st.prog));
 const render={name:d=>nameBtn('decisions',d.id,d.name,String(d.rationale||'').slice(0,120)),program_id:d=>esc(progName(d.program_id)),kind:d=>esc(cap(d.kind)),target_date:d=>cell('decisions',d,'target_date','date',esc(dateLabel(d.target_date))),outcome:d=>pill(OUTCOME_LABEL[d.outcome||'pending']||'Pending',d.outcome==='go'?'green':d.outcome==='no_go'?'red':''),decided_on:d=>esc(dateLabel(d.decided_on))};
 body+='<h3 class="pg-h3">Decisions log</h3><div class="k-row pg-filters">'+search('dec',f.q)+select('outcome','filter:dec:outcome',f.outcome,OUTCOMES.map(o=>[o,OUTCOME_LABEL[o]]),'Outcome','All')+'</div><div class="pg-table">'+kit.table({columns:cols.map(k=>({key:k,label:(templateLayoutSchema.groups.decisions.find(c=>c.id===k)||{}).label||k,render:render[k]||(d=>esc(d[k]??'—'))})).concat([{key:'linked',label:'Affects',render:d=>esc(linkName(d.linked_item_id))}]),rows:p.rows,empty:'<p class="k-muted">No decisions recorded yet.</p>'})+'</div>'+p.pager;
 return body;}
function linkName(id){if(!id)return '—';const x=itemRow(id);if(x)return itemName(id);const r=R.raid.allRows.find(y=>y.id===id);return r?String(r.data.name||'RAID entry')+(bool(r.data.archived)?' (archived)':''):'Unavailable';}

/* ---------- RAID ---------- */
function raid(){
 const f=st.raid,q=String(f.q||'').toLowerCase().trim();
 let body=head('RAID',canWrite('raid')?btn('Add entry','add:raid',{primary:true}):'');
 body+=partial();
 const mine=RAID.filter(x=>inProg(x.program_id));
 if(R.raid.unbound)return body+empty('The RAID log is not connected','This app has no RAID table.');
 if(!mine.length)return body+empty('No RAID entries yet','Add the top risks, assumptions, issues and dependencies, with likelihood and impact.',canWrite('raid')?['Add entry','add:raid']:null);
 const live=mine.filter(openRaid),cnt={};for(const x of live){const k=x.likelihood+':'+x.impact;if(LV[x.likelihood]&&LV[x.impact])cnt[k]=(cnt[k]||0)+1;}
 const unscored=live.filter(x=>score(x)===null).length;
 body+='<div class="pg-two">'+card('Likelihood × impact','<p class="k-small k-muted">Open and monitored entries per cell. Choose a cell to filter the register.</p><div class="pg-matrix" role="group" aria-label="Risk matrix"><span></span>'+LMH.map(i=>'<span class="pg-ax">Impact '+i+'</span>').join('')+LMH.slice().reverse().map(l=>'<span class="pg-ax">Likelihood '+l+'</span>'+LMH.map(i=>{const k=l+':'+i,s=LV[l]*LV[i];return '<button type="button" class="pg-cellbtn s'+(s>=6?3:s>=3?2:1)+'" data-action="matrix:'+k+'" aria-pressed="'+(f.matrix===k)+'" aria-label="'+(cnt[k]||0)+' entries with '+l+' likelihood and '+i+' impact">'+(cnt[k]||0)+'</button>';}).join('')).join('')+'</div>'+(unscored?'<p class="k-small k-muted">'+plural(unscored,'open entry')+' without likelihood or impact are not in the grid.</p>':''))+
  '<div class="k-grid pg-stats">'+RAID_TYPES.map(t=>kit.stat(cap(t)+'s open',tot(live.filter(x=>x.raid_type===t).length))).join('')+kit.stat('Past review date',tot(live.filter(x=>x.next_review&&AS_OF&&x.next_review<AS_OF).length))+'</div></div>';
 let rows=mine.filter(x=>textQ(q,x.name,x.owner,x.mitigation,progName(x.program_id))&&(!f.type||x.raid_type===f.type)&&(!f.status||x.status===f.status)).sort((a,b)=>(score(b)||0)-(score(a)||0)||String(a.name||'').localeCompare(String(b.name||'')));
 if(f.matrix){const [l,i]=f.matrix.split(':');rows=rows.filter(x=>openRaid(x)&&x.likelihood===l&&x.impact===i);}
 const p=pageOf('raid',rows),cols=LAYOUT.cols.raid.filter(k=>colShown('raid',k)&&!(k==='program_id'&&st.prog));
 const render={name:x=>nameBtn('raid',x.id,x.name,String(x.mitigation||'').slice(0,120)),program_id:x=>esc(progName(x.program_id)),raid_type:x=>pill(cap(x.raid_type),x.raid_type==='issue'?'red':x.raid_type==='risk'?'amber':''),
  score:x=>writableField('raid','likelihood')?'<span class="pg-pair">'+selCell('raid',x,'likelihood',LMH)+selCell('raid',x,'impact',LMH)+'</span>':score(x)===null?'<span class="k-muted">Not scored</span>':pill(cap(x.likelihood)+' × '+cap(x.impact),band(score(x))==='high'?'red':band(score(x))==='medium'?'amber':''),
  owner:x=>cell('raid',x,'owner','text'),next_review:x=>cell('raid',x,'next_review','date',esc(dateLabel(x.next_review)))+(openRaid(x)&&x.next_review&&AS_OF&&x.next_review<AS_OF?' '+pill('Past review','amber'):''),status:x=>selCell('raid',x,'status',RAID_STATUS,pill(cap(x.status),x.status==='closed'?'green':''))};
 body+='<h3 class="pg-h3">Register'+(f.matrix?' · filtered by the matrix cell':'')+'</h3><div class="k-row pg-filters">'+search('raid',f.q)+select('type','filter:raid:type',f.type,opts(RAID_TYPES,'raid_type'),'Type','All')+select('status','filter:raid:status',f.status,opts(RAID_STATUS,'status'),'Status','All')+(f.matrix?btn('Clear matrix filter','matrix:'+f.matrix):'')+'</div>'+
  '<div class="pg-table">'+kit.table({columns:cols.map(k=>({key:k,label:k==='score'?'Likelihood × impact':(templateLayoutSchema.groups.raid.find(c=>c.id===k)||{}).label||k,render:render[k]||(x=>esc(x[k]??'—'))})).concat(canWrite('raid')?[{key:'promote',label:'',render:x=>x.raid_type==='assumption'&&openRaid(x)?btn('Promote to risk','promote:'+x.id+':risk'):x.raid_type==='risk'&&openRaid(x)?btn('Promote to issue','promote:'+x.id+':issue'):''}]:[]),rows:p.rows,empty:'<p class="k-muted">No entries match.</p>'})+'</div>'+p.pager;
 return body;}

/* ---------- Updates and reports ---------- */
function updates(){
 const u=st.up,tab=['updates','report','archive','digests'].includes(u.tab)?u.tab:'updates';
 let body=head('Updates',tab==='updates'&&canWrite('updates')?btn('Add update','add:updates',{primary:true}):'');
 body+=kit.nav([{id:'updates',label:'Monthly updates'},{id:'report',label:'Leadership report'},{id:'archive',label:'Report archive'},{id:'digests',label:'Weekly digests'}],tab,{prefix:'up:',label:'Updates sections'});
 body+=partial();
 if(tab==='updates'){
  if(!PROGRAMS.length)return body+empty('No programs yet','Add a program first; its monthly updates then show here.',canWrite('programs')?['Add program','add:programs']:null);
  const due=updateMonthDue(),missing=SHOWN.filter(p=>(p.data.status||'active')==='active'&&due&&!UPDATES.some(x=>x.program_id===p.id&&x.month===due));
  if(missing.length)body+='<p class="k-small">'+esc('Due on day '+UPDATE_DAY+': '+monthLabel(due)+' update missing for '+missing.map(p=>String(p.data.name||'')).join(', ')+'.')+'</p>';
  const rows=UPDATES.filter(x=>inProg(x.program_id)).sort((a,b)=>String(b.month).localeCompare(String(a.month))||progName(a.program_id).localeCompare(progName(b.program_id)));
  if(!rows.length)return body+empty('No monthly updates yet','Write the first update: health with its rationale, a summary and the next steps.',canWrite('updates')?['Add update','add:updates']:null);
  const p=pageOf('up',rows);
  return body+kit.table({columns:[{key:'month',label:'Month',render:x=>nameBtn('updates',x.id,monthLabel(x.month))},{key:'program_id',label:'Program',render:x=>esc(progName(x.program_id))},{key:'health',label:'Health',render:x=>healthBadge(HEALTH.includes(x.health)?x.health:'unassessed')+(x.rationale?'<span class="pg-sub">'+esc(String(x.rationale).slice(0,90))+'</span>':'')},{key:'summary',label:'Summary',render:x=>esc(String(x.summary||'—').slice(0,160))},{key:'author',label:'Author',render:x=>cell('updates',x,'author','text')}],rows:p.rows})+p.pager;}
 if(tab==='digests'){const ds=R.digests.rows.slice().sort((a,b)=>String(b.data.run_on||'').localeCompare(String(a.data.run_on||'')));const v=(u.digestView&&ds.find(x=>x.id===u.digestView))||ds[0]||null;
  if(R.digests.unbound||R.digests.unavailable)return body+'<p class="k-muted">'+(R.digests.unbound?'The weekly digests table is not connected to this app.':'You cannot read the weekly digests.')+'</p>';
  if(!v)return body+'<div class="k-empty"><h3>No weekly digest yet</h3><p class="k-muted">Each Monday Claude or ChatGPT writes a short digest when something needs attention. Weeks with nothing to report have none.</p><a class="k-button k-button--primary pg-a" href="platform:automations">Open Automations</a></div>';
  return body+'<div class="k-row pg-filters">'+ds.slice(0,12).map(x=>btn(String(x.data.period||dateLabel(validDate(x.data.run_on))),'digest:'+x.id,{primary:x.id===v.id})).join('')+'</div>'+card(String(v.data.period||'Weekly digest'),'<div class="pg-report">'+esc(String(v.data.summary||''))+'</div><p class="k-small k-muted">'+esc(dateLabel(validDate(v.data.run_on)))+(num(v.data.attention_count)!==null?' · '+plural(num(v.data.attention_count),'item')+' needing attention':'')+(v.data.written_by?' · written by '+(v.data.written_by==='claude'?'Claude':v.data.written_by==='chatgpt'?'ChatGPT':esc(v.data.written_by)):'')+'</p>');}
 if(tab==='report'){const months=[...new Set(UPDATES.map(x=>x.month).concat(AS_OF?[AS_OF.slice(0,7)]:[]))].filter(Boolean).sort().reverse();const m=ym(u.month)&&months.includes(ym(u.month))?ym(u.month):months[0]||'';u.month=m;
  if(!m)return body+empty('Nothing to report yet','Monthly updates feed the leadership report.',canWrite('updates')?['Add update','add:updates']:null);
  const c=reportContents(m),d=u.draft||{},title=String(d.title||('Leadership report — '+monthLabel(m)));
  return body+card('Assemble the leadership report','<p class="k-small k-muted">Built from the month’s updates, milestones, slips, gates and top risks. A saved report is frozen: later edits never change it.</p><form data-action="report:save"><div class="pg-form">'+
   '<label class="k-field"><span>Month</span><select name="month" data-ui-state="true" data-action="report:month">'+months.map(x=>'<option value="'+x+'"'+(x===m?' selected':'')+'>'+esc(monthLabel(x))+'</option>').join('')+'</select></label><label class="k-field"><span>Title</span><input name="title" data-ui-state="true" data-action="report:draft" value="'+esc(title)+'"></label><label class="k-field pg-wide"><span>Narrative (optional)</span><textarea name="narrative" rows="3" data-ui-state="true" data-action="report:draft">'+esc(d.narrative||'')+'</textarea></label></div>'+
   '<h4 class="pg-h4">Preview</h4><div class="pg-report">'+esc(reportText(title,String(d.narrative||''),c))+'</div>'+(canWrite('reports')?'<div class="k-row pg-end"><button type="submit" class="k-button k-button--primary"'+(!exact?' disabled':'')+'>Save report</button></div>':'')+'</form>');}
 const reps=R.reports.rows.slice().sort((a,b)=>String(b.data.month||'').localeCompare(String(a.data.month||''))||String(b.data.saved_on||'').localeCompare(String(a.data.saved_on||'')));
 const v=u.reportView&&lookup('reports',u.reportView);
 if(v){const c=parseJSON(v.data.contents);const text=c?reportText(String(v.data.title||''),String(v.data.narrative||''),c):'This report has no frozen contents.';
  return body+card(String(v.data.title||'Report'),'<p class="k-small k-muted">'+esc(monthLabel(ym(v.data.month)))+' · saved '+esc(dateLabel(validDate(v.data.saved_on)))+'. Shown exactly as saved; copy the text into Investor Updates, a board pack or a document.</p><label class="k-field"><span>Report text (Markdown)</span><textarea class="pg-mono" rows="14" readonly data-ui-state="true">'+esc(text)+'</textarea></label>',btn('Back to archive','report:close'));}
 if(!reps.length)return body+empty('No saved reports yet','Assemble the first leadership report from this month’s updates.',['Assemble report','up:report']);
 return body+kit.table({columns:[{key:'title',label:'Report',render:r=>'<button type="button" class="pg-link" data-action="report:open:'+esc(r.id)+'">'+esc(r.data.title||'Report')+'</button>'},{key:'month',label:'Month',render:r=>esc(monthLabel(ym(r.data.month)))},{key:'saved',label:'Saved',render:r=>esc(dateLabel(validDate(r.data.saved_on)))}],rows:reps});}

/* ---------- Programs (own screen, G6) ---------- */
function programsScreen(){
 let body=head('Programs',canWrite('programs')?btn('Add program','add:programs',{primary:true}):'',false);
 if(R.programs.unbound)return body+empty('Programs are not connected','This app has no programs table.');
 if(R.programs.unavailable)return body+'<p class="k-muted">You do not have access to the programs table.</p>';
 if(!PROGRAMS.length)return body+empty('No programs yet','Add your first program. The programs table is shared with Runway and other apps.',canWrite('programs')?['Add program','add:programs']:null);
 return body+'<p class="k-small k-muted">Shared with other TrialAgents apps. Health is a dated judgement made by people: use Assess to change it.</p>'+kit.table({columns:[{key:'name',label:'Program',render:p=>nameBtn('programs',p.id,p.data.name,[p.data.indication,p.data.modality&&cap(p.data.modality)].filter(Boolean).join(' · '))},{key:'code',label:'Code',render:p=>cell('programs',{id:p.id,version:p.version,...p.data},'code','text')},{key:'stage',label:'Stage',render:p=>selCell('programs',{id:p.id,version:p.version,...p.data},'stage',STAGE_ORDER.concat(STAGES.filter(s=>!STAGE_ORDER.includes(s))))},{key:'status',label:'Status',render:p=>selCell('programs',{id:p.id,version:p.version,...p.data},'status',['active','paused','stopped','partnered'],esc(cap(p.data.status||'active')))},{key:'health',label:'Health',render:p=>{const h=healthOf(p);return healthBadge(h.h)+'<span class="pg-sub">'+esc(h.d?dateLabel(h.d):'not assessed')+'</span>'+(canWrite('programs')?' '+btn('Assess','open:programs:'+p.id,{ariaLabel:'Assess health of '+String(p.data.name||'program')}):'');}},{key:'lead',label:'Lead',render:p=>cell('programs',{id:p.id,version:p.version,...p.data},'lead','text')}],rows:PROGRAMS});}

/* ---------- Program team (own screen, G6, G7: names, never member IDs) ---------- */
function teamScreen(){
 let body=head('Team',canWrite('team')?btn('Add team member','add:team',{primary:true}):'');
 if(R.team.unbound)return body+empty('The program team is not connected','This app has no program team table.');
 if(R.team.unavailable)return body+'<p class="k-muted">You do not have access to the program team.</p>';
 if(!PROGRAMS.length)return body+empty('No programs yet','Add a program first, then the people who work on it.',canWrite('programs')?['Add program','add:programs']:null);
 const rows=TEAM.filter(t=>inProg(t.program_id));
 const drift=inp.saved?reminderDrift():[];
 if(drift.length)body+='<div class="k-row pg-filters"><span class="k-small">'+plural(drift.length,'owner link or reminder date')+' to update after team or Settings changes.</span>'+btn('Update owners and reminders','reminders',{disabled:!canWrite('items')&&!canWrite('raid')})+'</div>';
 if(!rows.length)return body+empty('No team members yet','Add the people who own milestones, risks and updates. Owners are picked from the team.',canWrite('team')?['Add team member','add:team']:null);
 return body+'<p class="k-small k-muted">Team members whose TrialAgents account is linked are notified when added, when assigned an item or a review, and before it is due. Ask Claude or ChatGPT to link a person’s account.</p>'+kit.table({columns:[{key:'name',label:'Name',render:t=>nameBtn('team',t.id,t.name)}].concat(st.prog?[]:[{key:'program_id',label:'Program',render:t=>esc(progName(t.program_id))}]).concat([{key:'role',label:'Role',render:t=>cell('team',t,'role','text')},{key:'notify',label:'Notifications',render:t=>linked(t)?pill('Linked','green'):pill('Name only','')}]),rows});}

/* ---------- Cash forecast (own screen, G6) ---------- */
function cashScreen(){
 let body=head('Cash forecast',!CASH_LINKED&&canWrite('closes')?btn('Add month','add:closes',{primary:true}):'',false);
 if(R.closes.unavailable)return body+'<p class="k-muted">You cannot read the cash forecast.</p>';
 if(CASH_LINKED)return body+'<p>From '+esc(CASH_APP)+(RUNWAY.source==='runway'&&RUNWAY.asOf?', snapshot of '+esc(monthLabel(RUNWAY.asOf)):'')+'. Read-only here; change it in '+esc(CASH_APP)+'.</p>'+(WRITER&&WRITER.canOpen&&RUNWAY.rowId?'<div class="k-row"><button type="button" class="k-button" data-trialy-open="'+esc('runway.month_closes '+RUNWAY.rowId)+'">Edit in '+esc(CASH_APP)+'</button></div>':'')+
  (RUNWAY.state==='ok'&&RUNWAY.months.length?kit.table({columns:[{key:'m',label:'Month',render:x=>esc(monthLabel(ym(x.m)))},{key:'c',label:'Closing cash',render:x=>esc(money(Number(x.c),RUNWAY.currency))}],rows:RUNWAY.months.slice(0,36)}):'');
 const rows=R.closes.rows.filter(x=>!x.data.metrics).map(x=>({id:x.id,version:x.version,...x.data,month:ym(x.data.month)})).sort((a,b)=>String(b.month).localeCompare(String(a.month)));
 if(!rows.length)return body+empty('No cash forecast yet','Enter closing cash by month to show cash at key milestones on the timeline.',canWrite('closes')?['Add month','add:closes']:null)+integrationHint();
 return body+'<p class="k-small k-muted">Closing cash by month, used for cash at key milestones.</p>'+kit.table({columns:[{key:'month',label:'Month',render:x=>nameBtn('closes',x.id,monthLabel(x.month))},{key:'closing_balance',label:'Closing cash',render:x=>cell('closes',x,'closing_balance','number',esc(money(Number(x.closing_balance),x.currency)))},{key:'currency',label:'Currency',render:x=>selCell('closes',x,'currency',S.closes.find(f=>f.key==='currency').options,esc(x.currency||'—'))}],rows:rows.slice(0,60)})+integrationHint();}

/* ---------- Settings: business choices, owners only (G6) ---------- */
function settingsScreen(){
 let body=head('Settings','',false);
 if(!OWNER)return body+'<p class="k-muted">Only the app’s owners change Settings.</p>';
 return body+'<p class="k-small k-muted">These choices change how Programs works for everyone using this app.</p>'+kit.settings({action:'settings:save',fields:[{name:'functions',label:'Function lanes, in order (from: '+FUNCTIONS.join(', ')+')',value:FN_ORDER.join(', ')},{name:'stages',label:'Stages, in order (from: '+STAGES.join(', ')+')',value:STAGE_ORDER.join(', ')},{name:'due_soon_days',label:'Due-soon window (days, 7–365)',value:String(DUE_SOON)},{name:'update_day',label:'Monthly update due on day (1–28)',value:String(UPDATE_DAY)},{name:'reminder_days',label:'Reminder lead time (days, 1–60)',value:String(REMIND_DAYS)},{name:'health_definitions',label:'What green, amber and red mean',value:String(SET.health_definitions||'')}]},inp);}

/* ---------- panels ---------- */
const PEOPLE=R.people.rows.map(r=>String(r.data.name||'')).filter(Boolean).sort();
function editorFields(x,all){const role=x.role,m=roleMap[role],g=FORM_GROUP[role];
 let fields=fieldsOf(role).filter(f=>f.kind!=='frozen'&&f.kind!=='system'&&f.key!=='archived'&&m&&m.fields[f.key]&&(all||!f.offScreen));
 // Form layout (layout profile): declared order and hidden optional fields. Required fields always stay.
 if(g&&LAYOUT.cols[g]){const order=LAYOUT.cols[g];fields=fields.filter(f=>f.required||f.extra||f.offScreen||LAYOUT.visible[g+':'+f.key]!==false).sort((a,b)=>(order.indexOf(a.key)<0?99:order.indexOf(a.key))-(order.indexOf(b.key)<0?99:order.indexOf(b.key)));}
 return fields;}
function control(x,f){const role=x.role,v=x.draft[f.key]??'',dis=!writableField(role,f.key)?' disabled':'';const common=' name="'+f.key+'" data-ui-state="true" data-action="draft:'+f.key+'"'+dis+(f.required?' required':'');
 if(f.kind==='baseline')return '<input value="'+esc(validDate(v)?dateLabel(validDate(v)):'No baseline')+'" readonly aria-readonly="true" data-ui-state="true">';
 if(f.kind==='select')return '<select'+common+'><option value="">Choose…</option>'+f.options.map(o=>'<option value="'+esc(o)+'"'+(String(v)===o?' selected':'')+'>'+esc(optionLabel(f.key,o))+'</option>').join('')+'</select>';
 if(f.kind==='ref'){const cur=String(v||'');const rows=f.ref==='items'?ITEMS.filter(i=>i.id!==x.id&&(!x.draft.program_id||i.program_id===x.draft.program_id||i.id===cur)).map(i=>({id:i.id,name:String(i.name||'')+(i.end_date?' · '+dateLabel(i.end_date):'')})):R[f.ref].rows.map(r=>({id:r.id,name:String(r.data.name||'Unnamed')}));const keep=cur&&!rows.some(r=>r.id===cur);
  return '<select'+common+'><option value="">'+(f.required?'Choose…':'None')+'</option>'+(keep?'<option value="'+esc(cur)+'" selected>'+esc(f.ref==='items'?itemName(cur):progName(cur))+'</option>':'')+rows.map(r=>'<option value="'+esc(r.id)+'"'+(cur===r.id?' selected':'')+'>'+esc(r.name)+'</option>').join('')+'</select>';}
 if(f.kind==='link'){const cur=String(v||''),o=ITEMS.map(i=>[i.id,'Plan item: '+String(i.name||'')]).concat(RAID.filter(r=>r.id!==x.id).map(r=>[r.id,cap(r.raid_type)+': '+String(r.name||'')]));const keep=cur&&!o.some(y=>y[0]===cur);
  return '<select'+common+'><option value="">None</option>'+(keep?'<option value="'+esc(cur)+'" selected>'+esc(linkName(cur))+'</option>':'')+o.map(y=>'<option value="'+esc(y[0])+'"'+(cur===y[0]?' selected':'')+'>'+esc(y[1])+'</option>').join('')+'</select>';}
 if(f.kind==='longtext')return '<textarea rows="3"'+common+'>'+esc(v)+'</textarea>';
 if(f.kind==='boolean')return '<select'+common+'><option value="false"'+(!bool(v)?' selected':'')+'>No</option><option value="true"'+(bool(v)?' selected':'')+'>Yes</option></select>';
 if(f.kind==='person'){const inputHtml='<input type="text"'+common+' value="'+esc(v)+'" autocomplete="off">';const pid=String(x.draft.program_id||''),team=[...new Set(TEAM.filter(t=>!pid||t.program_id===pid).map(t=>String(t.name||'')).filter(Boolean))],people=PEOPLE.filter(n=>!team.includes(n));if((!team.length&&!people.length)||dis)return inputHtml;
  return inputHtml+'<select name="pick_'+f.key+'" data-ui-state="true" data-action="pick:'+f.key+'" aria-label="Pick '+esc(f.label.toLowerCase())+' from the program team"><option value="">Pick from the team…</option>'+(team.length?'<optgroup label="Program team">'+team.map(n=>'<option value="'+esc(n)+'">'+esc(n)+'</option>').join('')+'</optgroup>':'')+(people.length?'<optgroup label="People">'+people.map(n=>'<option value="'+esc(n)+'">'+esc(n)+'</option>').join('')+'</optgroup>':'')+'</select>';}
 const type=f.kind==='date'?'date':f.kind==='month'?'month':f.kind==='number'?'number':'text';const val=f.kind==='month'?(ym(v)||String(v||'')):f.kind==='date'?(validDate(v)||String(v||'')):v;
 return '<input type="'+type+'"'+common+(f.kind==='number'?' step="any"':'')+' value="'+esc(val)+'">';}
function editorPanel(){const x=st.panel;if(!x||!S[x.role])return '';const role=x.role,w=canWrite(role)&&!(role==='closes'&&CASH_LINKED);
 const title=(x.mode==='edit'?(w?'Edit ':'')+ROLE_LABEL[role]:x.mode==='duplicate'?'Duplicate '+ROLE_LABEL[role]:'Add '+ROLE_LABEL[role]);
 let extra='';
 if(role==='items'&&x.mode==='edit'){const orig=ITEM[x.id],ne=validDate(x.draft.end_date);
  if(orig&&ne&&orig.end_date&&ne!==orig.end_date){const later=ne>orig.end_date;
   if(needsSlip(orig,ne))extra+='<div class="pg-callout"><p><b>This committed date moves later by '+plural(diffDays(orig.end_date,ne),'day')+'.</b> Saving records one slip with your reason (baseline '+esc(dateLabel(orig.baseline_end))+').</p><label class="k-field"><span>Slip reason *</span><select name="slip_reason" data-ui-state="true" data-action="draft:slip_reason" required aria-invalid="'+(REASONS.includes(x.draft.slip_reason)?'false':'true')+'"><option value="">Choose…</option>'+REASONS.map(r=>'<option value="'+r+'"'+(x.draft.slip_reason===r?' selected':'')+'>'+esc(REASON_LABEL[r])+'</option>').join('')+'</select></label><label class="k-field"><span>Detail</span><input name="slip_detail" data-ui-state="true" data-action="draft:slip_detail" value="'+esc(x.draft.slip_detail||'')+'"></label></div>';
   if(later){const moves=itemsExact?downstream(x.id,ne):null;
    extra+='<h4 class="pg-h4">Downstream impact</h4>'+(moves===null?'<p class="k-small k-muted">Plan items were not read completely, so successors will not be moved.</p>':moves.length?'<p class="k-small k-muted">These successors would start later (predecessor end + 1 day). They move only if you tick the box.</p><ul class="pg-list">'+moves.map(mv=>'<li><span class="k-grow"><b>'+esc(mv.name)+'</b>'+(CRIT_IDS.has(mv.id)?' '+pill('Critical path','blue'):'')+'</span><span>'+esc(dateLabel(mv.old_end))+' → '+esc(dateLabel(mv.new_end))+' (+'+mv.days+' d)</span></li>').join('')+'</ul><label class="pg-check"><input type="checkbox" name="accept_downstream" value="true" data-ui-state="true" data-action="draft:accept_downstream"'+(bool(x.draft.accept_downstream)?' checked':'')+'> Also move these '+plural(moves.length,'successor')+'</label>':'<p class="k-small k-muted">No successor is pushed by this change.</p>');}}}
 let story='';
 if(x.mode==='edit'&&(role==='items'||role==='raid')){const r=lookup(role,x.id);const o=r?String(r.data.owner||''):'';if(roleMap[role].fields.owner_member_id&&o)story+='<p class="k-small k-muted">'+esc(r.data.owner_member_id?o+' is notified'+(validDate(r.data.remind_on)?'; reminder on '+dateLabel(validDate(r.data.remind_on)):''):o+' is not notified: their account is not linked on the program team.')+'</p>';}
 if(x.mode==='edit'&&role==='items'){const it=ITEM[x.id],sl=slipsOf(x.id);story+='<h4 class="pg-h4">Slip history</h4>'+(it&&it.baseline_end?'<p class="k-small">Baseline '+esc(dateLabel(it.baseline_end))+' · current '+esc(dateLabel(it.end_date))+(slipDays(it)?' ('+(slipDays(it)>0?'+':'')+slipDays(it)+' days)':'')+'</p>':'<p class="k-small k-muted">No baseline: slips are measured once the plan is baselined.</p>')+(sl.length?'<ul class="pg-list">'+sl.map(s=>'<li><span class="k-grow"><b>'+esc(REASON_LABEL[s.reason]||cap(s.reason))+'</b>'+(s.detail?'<span class="pg-sub">'+esc(s.detail)+'</span>':'')+'</span><span>'+esc(dateLabel(s.old_end))+' → '+esc(dateLabel(s.new_end))+' (+'+esc(s.days)+' d)</span></li>').join('')+'</ul>':'');}
 const hint=role==='programs'?'<p class="k-small k-muted">Health is your dated judgement: with green, amber or red, give the rationale and the assessment date. Health older than '+STALE_HEALTH_DAYS+' days is flagged; the app never changes it.</p>':role==='decisions'?'<p class="k-small k-muted">Write one criterion per line, starting with [met], [not met] or [open].</p>':'';
 const changed=JSON.stringify(x.draft)!==x.initial;
 const menu=x.mode==='edit'&&w?(role==='items'?btn('Duplicate','duplicate:items:'+x.id)+(ITEM[x.id]&&ITEM[x.id].baseline_end&&writableField('items','baseline_end')?btn('Reset baseline','rebaseline:'+x.id):''):'')+(role==='raid'&&RAID.find(r=>r.id===x.id)?(()=>{const r=RAID.find(y=>y.id===x.id);return r.raid_type==='assumption'&&openRaid(r)?btn('Promote to risk','promote:'+r.id+':risk'):r.raid_type==='risk'&&openRaid(r)?btn('Promote to issue','promote:'+r.id+':issue'):'';})():'')+(role==='decisions'&&canWrite('decisions')?btn('Record outcome','outcome:'+x.id):'')+btn('Archive','archive:'+role+':'+x.id,{ariaLabel:'Archive this '+ROLE_LABEL[role]}):'';
 const body='<form data-action="panel:save">'+hint+'<div class="pg-form">'+editorFields(x).map(f=>'<label class="k-field'+(f.kind==='longtext'?' pg-wide':'')+'"><span>'+esc(fieldLabel(role,f))+(f.required?' *':'')+'</span>'+control(x,f)+'</label>').join('')+'</div>'+extra+(w?'<div class="k-row pg-end">'+btn('Cancel','panel:close')+'<button type="submit" class="k-button k-button--primary"'+(changed||x.mode!=='edit'?'':' disabled')+'>'+(x.mode==='edit'?'Save':'Add')+'</button></div>':'')+'</form>'+(menu?'<div class="k-row pg-menu">'+menu+'</div>':'')+story;
 return kit.panel({title:cap(title),body,close:'panel:close'});}
function rebaselinePanel(){const c=st.panel;if(!c||c.role!=='rebaseline')return '';const x=ITEM[c.id];
 return kit.panel({title:'Reset the baseline',close:'panel:close',body:'<p><b>'+esc(x?x.name:'')+'</b>: baseline '+esc(x?dateLabel(x.baseline_end):'')+' becomes '+esc(x?dateLabel(x.end_date):'')+'. The reason is kept in the item notes.</p><form data-action="rebaseline:save"><label class="k-field"><span>Reason *</span><input name="reason" data-ui-state="true" value="'+esc(c.reason||'')+'" required></label><div class="k-row pg-end">'+btn('Cancel','panel:close')+'<button type="submit" class="k-button k-button--primary">Reset baseline</button></div></form>'});}
function gatePanel(){const g=st.gate;if(!g)return '';const d=DECISIONS.find(x=>x.id===g.id);if(!d)return '';const r=readiness(d);
 const planned=ITEMS.filter(x=>x.program_id===d.program_id&&isMilestone(x)&&['planned','at_risk'].includes(x.status)).sort((a,b)=>a.end_date.localeCompare(b.end_date));
 const sel=(name,val,o)=>'<select name="'+name+'" data-ui-state="true" data-action="gate:draft">'+o.map(y=>'<option value="'+esc(y[0])+'"'+(String(val||'')===y[0]?' selected':'')+'>'+esc(y[1])+'</option>').join('')+'</select>';
 return kit.panel({title:'Record outcome: '+String(d.name||'Gate'),close:'panel:close',body:'<form data-action="gate:save"><p class="k-small k-muted">'+esc(r.total?'Readiness: '+r.met+' of '+r.total+' criteria met.':'This gate has no criteria.')+' The outcome is your decision.</p><div class="pg-form">'+
 '<label class="k-field"><span>Outcome *</span>'+sel('outcome',g.draft.outcome,[['','Choose…'],['go','Go'],['no_go','No-go'],['conditional','Conditional'],['decided','Decided']])+'</label><label class="k-field"><span>Decided on *</span><input type="date" name="decided_on" data-ui-state="true" data-action="gate:draft" value="'+esc(g.draft.decided_on||'')+'"></label><label class="k-field"><span>Approver</span><input name="approver" data-ui-state="true" data-action="gate:draft" value="'+esc(g.draft.approver||'')+'"></label><label class="k-field pg-wide"><span>Rationale *</span><textarea rows="3" name="rationale" data-ui-state="true" data-action="gate:draft">'+esc(g.draft.rationale||'')+'</textarea></label></div>'+
 '<h4 class="pg-h4">Follow-up milestones to create</h4>'+g.follow.map((f,i)=>'<div class="pg-form"><label class="k-field"><span>Name</span><input name="follow_name_'+i+'" data-ui-state="true" data-action="gate:draft" value="'+esc(f.name||'')+'"></label><label class="k-field"><span>Date</span><input type="date" name="follow_date_'+i+'" data-ui-state="true" data-action="gate:draft" value="'+esc(f.end_date||'')+'"></label><label class="k-field"><span>Function</span>'+sel('follow_fn_'+i,f.function,FN_ORDER.map(x=>[x,FN_LABEL[x]]))+'</label><div class="k-row">'+btn('Remove','gate:unfollow:'+i)+'</div></div>').join('')+btn('Add follow-up milestone','gate:follow')+
 '<h4 class="pg-h4">Planned milestones to cancel</h4><input type="hidden" name="cancel_none" value="true">'+(planned.length?planned.map(x=>'<label class="pg-check"><input type="checkbox" name="cancel_'+esc(x.id)+'" value="true" data-ui-state="true" data-action="gate:draft"'+(g.cancel.includes(x.id)?' checked':'')+'> '+esc(x.name||'')+' · '+esc(dateLabel(x.end_date))+'</label>').join(''):'<p class="k-small k-muted">No planned milestones in this program.</p>')+
 '<div class="k-row pg-end">'+btn('Cancel','panel:close')+'<button type="submit" class="k-button k-button--primary">Save outcome</button></div></form>'});}

/* ---------- app commands: Claude and ChatGPT do what a click does, through the same handler ---------- */
/*@digest-core*/
const formValue=v=>v===null||v===undefined?'':typeof v==='boolean'?String(v):typeof v==='object'?JSON.stringify(v):String(v);
/* What a click posts: every field of the open form as text. Commands build the same form, so both paths save the same change. */
function formOf(x,over){const d={...x.draft,...(over||{})},out=Object.fromEntries(editorFields({...x,draft:d},true).filter(f=>f.kind!=='baseline').map(f=>[f.key,f.kind==='month'?(ym(d[f.key])||formValue(d[f.key])):formValue(d[f.key])]));
 for(const k of ['slip_reason','slip_detail','accept_downstream'])if(over&&has(over,k))out[k]=formValue(over[k]);return out;}
const need=(v,k)=>{if(v[k]===undefined||v[k]===null||v[k]==='')throw Error('Missing input: '+k);return v[k];};
const EDIT_ROLES=['programs','items','decisions','raid','updates','team','closes','settings'];
const ERR=()=>NOTICE&&NOTICE.kind==='error'?NOTICE.message:'';
function run(ev){NOTICE=null;try{handle(ev);}catch(e){note('error',String(e&&e.message||e));}const m=ERR();if(m)throw Error(m);}
function roleOf(r){r=String(r||'');const k=Object.keys(ROLE_KEY).find(x=>x===r||ROLE_KEY[x]===r);if(!k||!EDIT_ROLES.includes(k))throw Error('Programs has no '+r+' form. Use one of: '+EDIT_ROLES.join(', ')+'.');if(!roleMap[k])throw Error('The '+ROLE_LABEL[k]+' table is not connected to this app.');if(k==='closes'&&CASH_LINKED)throw Error('The cash forecast comes from '+CASH_APP+'. Change it in '+CASH_APP+'.');return k;}
function recordSave(role,v,dup){role=roleOf(role);const f=v.fields&&typeof v.fields==='object'?v.fields:{};
 if(role==='settings'){if(!OWNER)throw Error('Only the app’s owners change Settings.');const form={};for(const [k,x] of Object.entries(f)){if(!S.settings.some(y=>y.key===k))throw Error('Not a field of the settings form: '+k+'. Use schema.describe.');form[k]=formValue(x);}run({kind:'submit',action:'settings:save',form});return {};}
 if(dup)run({kind:'click',action:'duplicate:'+role+':'+need(v,'id')});else if(v.id)run({kind:'click',action:'open:'+role+':'+v.id});else run({kind:'click',action:'add:'+role});
 if(!st.panel)throw Error('The form could not be opened.');const x=st.panel;
 const shown=editorFields(x,true).map(y=>y.key),bad=Object.keys(f).filter(k=>!shown.includes(k));
 if(bad.length)throw Error((bad.some(k=>fieldsOf(role).some(y=>y.key===k&&y.kind==='system'))?'Owner member IDs and reminder dates are kept by the app; set the owner and the program team instead. ':'')+'Not a field of the '+ROLE_LABEL[role]+' form: '+bad.join(', ')+'. Use schema.describe.');
 const over={...f};if(role==='items'){if(v.slip_reason!==undefined)over.slip_reason=v.slip_reason;if(v.slip_detail!==undefined)over.slip_detail=v.slip_detail;if(v.accept_downstream)over.accept_downstream='true';}
 const impact=role==='items'&&x.mode==='edit'&&has(f,'end_date')?impactOf(x.id,validDate(f.end_date)):null;
 run({kind:'submit',action:'panel:save',form:formOf(x,over)});if(st.panel)throw Error('The change was not saved.');return impact?{impact}:{};}
function archiveRecord(role,id){role=roleOf(role);run({kind:'click',action:'archive:'+role+':'+id});return {};}
const itemOut=x=>({id:x.id,name:String(x.name||''),program_id:x.program_id||null,program:progName(x.program_id),item_type:x.item_type||null,function:x.function||null,owner:x.owner||null,start_date:x.start_date||null,end_date:x.end_date||null,baseline_start:x.baseline_start||null,baseline_end:x.baseline_end||null,slip_days:slipDays(x),status:x.status||null,predecessor_id:x.predecessor_id||null,is_key:isKey(x),critical:CRIT_IDS.has(x.id),overdue:overdue(x),finish_to_start_conflict:conflict(x),...(cashAt(x)&&cashAt(x).cash!==undefined?{cash_at_milestone:{cash:cashAt(x).cash,currency:RUNWAY.currency||null,cushion_months:cashAt(x).cushion.months,beyond_forecast:!!cashAt(x).cushion.beyond,from:RUNWAY.source==='runway'?CASH_APP+' snapshot '+RUNWAY.asOf:'Programs cash forecast'}}:{})});
function impactOf(id,newEnd){const x=ITEM[id];if(!x)throw Error('That item is no longer available.');if(!newEnd)throw Error('Give the new end date as YYYY-MM-DD.');
 return {item:String(x.name||''),from:x.end_date||null,to:newEnd,days:x.end_date?diffDays(x.end_date,newEnd):null,slip_required:needsSlip(x,newEnd),baseline_end:x.baseline_end||null,critical:CRIT_IDS.has(id),
  downstream:newEnd>(x.end_date||'')&&itemsExact?downstream(id,newEnd).map(m=>({id:m.id,name:m.name,from:m.old_end,to:m.new_end,days:m.days,slip:m.slip,critical:CRIT_IDS.has(m.id)})):[],downstream_complete:itemsExact,
  note:'Moves to successors apply only with accept_downstream in the same item.save. A later committed date needs slip_reason.'};}
function attention(){return digestCore({today:AS_OF,programs:R.programs.allRows.map(r=>({id:r.id,...r.data})),items:R.items.allRows.map(r=>({id:r.id,...r.data})),slips:R.slips.rows.map(r=>({id:r.id,...r.data})),decisions:R.decisions.allRows.map(r=>({id:r.id,...r.data})),raid:R.raid.allRows.map(r=>({id:r.id,...r.data})),updates:R.updates.rows.map(r=>({id:r.id,...r.data})),settings:SET,complete:exact});}
const describeField=(role,f)=>({key:f.key,label:fieldLabel(role,f),kind:f.kind==='ref'?'record_id':f.kind==='link'?'record_id (plan item or RAID entry)':f.kind==='person'?'text (a name; pick from the program team)':f.kind==='member'?'workspace member id (uuid; set by an assistant, never shown on screen)':f.kind,required:!!f.required,...(f.options?{options:f.options}:{}),...(f.ref?{references:f.ref}:{}),...(f.extra?{additional:true}:{}),writable:writableField(role,f.key),...(FORM_GROUP[role]&&LAYOUT.visible[FORM_GROUP[role]+':'+f.key]===false?{hidden_in_form:true}:{})});
const COMMANDS={
 'schema.describe':()=>({as_of:AS_OF||null,data_complete:exact,read_problems:readProblems,
  forms:Object.fromEntries(EDIT_ROLES.filter(r=>roleMap[r]).map(r=>[r,{label:ROLE_LABEL[r],table_role:ROLE_KEY[r],writable:canWrite(r)&&!(r==='closes'&&CASH_LINKED)&&(r!=='settings'||OWNER),form_group:FORM_GROUP[r]||null,fields:fieldsOf(r).filter(f=>!['frozen','system'].includes(f.kind)&&f.key!=='archived'&&roleMap[r].fields[f.key]).map(f=>describeField(r,f))}])),
  vocabulary:{functions:FN_ORDER,stages:STAGE_ORDER,item_status:ITEM_STATUS,slip_reasons:REASONS,outcomes:OUTCOMES,raid_types:RAID_TYPES,likelihood_impact:LMH,health:HEALTH},
  rules:['Record changes save directly, as when a person edits the value on screen; archive_record is reversible from the app’s Undo.','A later end date on a baselined planned, in-progress or at-risk item needs slip_reason and writes exactly one slip in the same save.','Successors move only with accept_downstream (predecessor end + 1 day, durations kept).','Health is a human judgement: set it only when the user says so, with a rationale and the assessment date.','Gate outcomes are recorded only when the user decides them (gate.record).','Owner member IDs, assignment and reminder dates are kept by the app from the program team; never write them directly. A team member’s member_id links their TrialAgents account for notifications.','Settings are business choices for the app’s owners.','Values from other apps (the cash forecast when linked to Runway) are read-only here: change them in that app.','Archive, never delete.'],
  settings:{due_soon_days:DUE_SOON,update_day:UPDATE_DAY,reminder_days:REMIND_DAYS},
  programs:PROGRAMS.map(p=>({id:p.id,name:String(p.data.name||'')})),team:TEAM.map(t=>({id:t.id,program_id:t.program_id,name:String(t.name||''),role:t.role||null,notifications:linked(t)})),
  working_context:{program_id:st.prog||null},
  cash_forecast:{source:CASH_LINKED?'linked':'own',from:CASH_LINKED?CASH_APP:'Programs',editable_here:!CASH_LINKED&&canWrite('closes')},
  layout:{screens:SCREENS.map(x=>x.id),groups:Object.fromEntries(Object.entries(templateLayoutSchema.groups).map(([g,l])=>[g,l.map(x=>x.id)]))},
  commands:appCommands.map(c=>c.id)}),
 'overview.read':()=>{const next=ITEMS.filter(x=>isKey(x)&&!['done','cancelled'].includes(x.status)&&x.end_date&&AS_OF&&x.end_date>=AS_OF).sort((a,b)=>a.end_date.localeCompare(b.end_date))[0];
  const od=ITEMS.filter(overdue),qSlips=Q?SLIPS.filter(s=>s.changed_on&&s.changed_on>=Q.start&&s.changed_on<=Q.end):[],doneQ=Q?ITEMS.filter(x=>isMilestone(x)&&x.status==='done'&&x.baseline_end&&x.end_date>=Q.start&&x.end_date<=Q.end):[],onTime=doneQ.filter(x=>x.end_date<=x.baseline_end).length;
  return {as_of:AS_OF||null,data_complete:exact,read_problems:readProblems,next_key_milestone:next?{...itemOut(next),days_to:diffDays(AS_OF,next.end_date)}:null,
   kpis:exact?{overdue_items:od.length,open_high_risks:RAID.filter(x=>x.raid_type==='risk'&&openRaid(x)&&band(score(x))==='high').length,slips_this_quarter:qSlips.length,slip_days_this_quarter:qSlips.reduce((n,s)=>n+num(s.days,0),0),on_time_milestones_pct:doneQ.length?Math.round(onTime/doneQ.length*100):null,quarter:Q?Q.label:null}:null,
   programs:PROGRAMS.map(p=>{const h=healthOf(p),nx=ITEMS.filter(x=>x.program_id===p.id&&isMilestone(x)&&!['done','cancelled'].includes(x.status)&&x.end_date&&AS_OF&&x.end_date>=AS_OF).sort((a,b)=>a.end_date.localeCompare(b.end_date))[0];return {id:p.id,name:String(p.data.name||''),code:p.data.code||null,stage:p.data.stage||null,status:p.data.status||'active',lead:p.data.lead||null,health:h.h,health_date:h.d||null,health_stale:h.stale,health_rationale:h.rationale||null,next_milestone:nx?{name:String(nx.name||''),date:nx.end_date}:null,open_high_risks:exact?RAID.filter(x=>x.program_id===p.id&&x.raid_type==='risk'&&openRaid(x)&&band(score(x))==='high').length:null,critical_path:CRIT[p.id]?CRIT[p.id].state:null};}),
   due_soon:{window_days:DUE_SOON,items:(()=>{const s=st.prog;st.prog='';const l=dueSoonList();st.prog=s;return l;})().map(d=>({date:d.date,kind:d.kind,name:d.name,program:progName(d.program),open:d.act}))},exceptions:exceptionsList(true).map(e=>e[0])};},
 'attention.read':()=>attention(),
 'timeline.read':v=>{const progs=PROGRAMS.filter(p=>!v.program_id||p.id===v.program_id);if(v.program_id&&!progs.length)throw Error('Program not found.');
  return {as_of:AS_OF||null,data_complete:itemsExact,cash:{state:RUNWAY.state,source:RUNWAY.source||null,from:RUNWAY.source==='runway'?CASH_APP:RUNWAY.source==='manual'?'Programs cash forecast':null,as_of:RUNWAY.asOf||null,currency:RUNWAY.currency||null,note:runwayNote()||null},
   programs:progs.map(p=>{const c=CRIT[p.id]||{};return {id:p.id,name:String(p.data.name||''),critical_path:{state:c.state||'none',target:c.target?String(c.target.name||''):null,items:(c.ids||[]).map(id=>({id,name:itemName(id),end_date:ITEM[id]?ITEM[id].end_date:null})),broken:c.broken||null,cycle:(c.cycle||[]).map(itemName)},items:ITEMS.filter(x=>x.program_id===p.id&&(!v.function||x.function===v.function)).sort((a,b)=>String(anchor(a)||'').localeCompare(String(anchor(b)||''))).map(itemOut)};})};},
 'item.drivers':v=>{const x=ITEM[need(v,'item_id')];if(!x)throw Error('That item is no longer available.');const c=chainOf(x.id);return {item:String(x.name||''),chain:c.chain.map(id=>({id,name:itemName(id),end_date:ITEM[id]?ITEM[id].end_date:null,critical:CRIT_IDS.has(id)})),cycle:c.cycle,broken:c.broken||null,slips:slipsOf(x.id).map(s=>({changed_on:s.changed_on,old_end:s.old_end,new_end:s.new_end,days:s.days,reason:s.reason,detail:s.detail||null}))};},
 'item.impact':v=>impactOf(need(v,'item_id'),validDate(v.end_date)),
 'gates.read':v=>({as_of:AS_OF||null,items:DECISIONS.filter(d=>!v.program_id||d.program_id===v.program_id).sort((a,b)=>String(a.target_date||'9999').localeCompare(String(b.target_date||'9999'))).map(d=>{const r=readiness(d);return {id:d.id,name:String(d.name||''),program:progName(d.program_id),program_id:d.program_id||null,kind:d.kind,target_date:d.target_date||null,days_to:d.target_date&&AS_OF?diffDays(AS_OF,d.target_date):null,outcome:d.outcome||'pending',decided_on:d.decided_on||null,approver:d.approver||null,rationale:d.rationale||null,criteria:r.list,met:r.met,not_met:r.notMet,open:r.open,total:r.total,linked_item_id:d.linked_item_id||null};})}),
 'raid.read':v=>{const list=RAID.filter(x=>(!v.program_id||x.program_id===v.program_id)&&(!v.status||x.status===v.status));const m={};for(const x of list.filter(openRaid))if(x.likelihood&&x.impact){const k=x.likelihood+'×'+x.impact;m[k]=(m[k]||0)+1;}
  return {as_of:AS_OF||null,matrix_open:m,items:list.map(x=>({id:x.id,name:String(x.name||''),program:progName(x.program_id),program_id:x.program_id||null,raid_type:x.raid_type,likelihood:x.likelihood||null,impact:x.impact||null,score:score(x),band:band(score(x))||null,owner:x.owner||null,mitigation:x.mitigation||null,next_review:x.next_review||null,past_review:!!(openRaid(x)&&x.next_review&&AS_OF&&x.next_review<AS_OF),status:x.status,linked:x.linked_item_id?linkName(x.linked_item_id):null}))};},
 'updates.read':v=>{const m=ym(v.month)||updateMonthDue();return {month:m||null,due_day:UPDATE_DAY,updates:UPDATES.filter(u=>!v.month||u.month===m).map(u=>({id:u.id,program:progName(u.program_id),program_id:u.program_id,month:u.month,health:u.health,rationale:u.rationale||null,summary:u.summary||null,next_steps:u.next_steps||null,author:u.author||null})),missing:PROGRAMS.filter(p=>(p.data.status||'active')==='active'&&!UPDATES.some(u=>u.program_id===p.id&&u.month===m)).map(p=>({program_id:p.id,program:String(p.data.name||'')}))};},
 'report.preview':v=>{const m=ym(need(v,'month'));if(!m)throw Error('Give the month as YYYY-MM.');const c=reportContents(m);return {month:m,data_complete:exact,can_save:exact&&canWrite('reports'),contents:c,text:reportText('Leadership report — '+monthLabel(m),'',c)};},
 'reports.read':v=>{const list=R.reports.rows.filter(r=>!v.report_id||r.id===v.report_id).sort((a,b)=>String(b.data.month||'').localeCompare(String(a.data.month||'')));if(v.report_id&&!list.length)throw Error('Report not found.');
  return {reports:list.map(r=>{const c=parseJSON(r.data.contents);return {id:r.id,month:ym(r.data.month),title:String(r.data.title||''),saved_on:validDate(r.data.saved_on)||null,...(v.report_id?{text:c?reportText(String(r.data.title||''),String(r.data.narrative||''),c):null,contents:c}:{})};})};},
 'digests.read':v=>({digests:R.digests.rows.slice().sort((a,b)=>String(b.data.run_on||'').localeCompare(String(a.data.run_on||''))).slice(0,Math.min(26,Math.max(1,num(v.limit,6)||6))).map(r=>({id:r.id,run_on:validDate(r.data.run_on)||null,period:r.data.period||null,attention_count:num(r.data.attention_count),summary:String(r.data.summary||''),written_by:r.data.written_by||null}))}),
 'team.read':()=>({team:TEAM.map(t=>({id:t.id,program_id:t.program_id,program:progName(t.program_id),name:String(t.name||''),role:t.role||null,notifications:linked(t),added_on:validDate(t.added_on)||null})),updates_waiting:reminderDrift().length,reminder_days:REMIND_DAYS}),
 'record.save':v=>recordSave(v.role,v),
 'record.duplicate':v=>recordSave(v.role,v,true),
 'record.archive':v=>archiveRecord(v.role,need(v,'id')),
 'program.save':v=>recordSave('programs',v),
 'item.save':v=>recordSave('items',v),
 'team.save':v=>recordSave('team',v),
 'settings.save':v=>recordSave('settings',v),
 'baseline.set':v=>{const pid=need(v,'program_id');const before=SAVED.length;run({kind:'click',action:'baseline:'+pid});return {items:SAVED.length>before?SAVED[SAVED.length-1].count:0};},
 'baseline.reset':v=>{run({kind:'click',action:'rebaseline:'+need(v,'item_id')});run({kind:'submit',action:'rebaseline:save',form:{reason:String(need(v,'reason'))}});return {};},
 'gate.record':v=>{run({kind:'click',action:'outcome:'+need(v,'gate_id')});if(!st.gate)throw Error('That gate is not available.');const fu=Array.isArray(v.follow_ups)?v.follow_ups:[];for(let i=0;i<fu.length;i++)run({kind:'click',action:'gate:follow',form:{}});
  const form={outcome:String(v.outcome||''),decided_on:String(v.decided_on||''),approver:String(v.approver||''),rationale:String(v.rationale||''),cancel_none:'true'};fu.forEach((f,i)=>{form['follow_name_'+i]=String(f.name||'');form['follow_date_'+i]=String(f.end_date||'');form['follow_fn_'+i]=String(f.function||FN_ORDER[0]);});for(const id of v.cancel_item_ids||[])form['cancel_'+id]='true';
  run({kind:'submit',action:'gate:save',form});if(st.gate)throw Error('The outcome was not saved.');return {};},
 'raid.promote':v=>{run({kind:'click',action:'promote:'+need(v,'id')+':'+need(v,'to')});return {};},
 'report.save':v=>{const m=ym(need(v,'month'));if(!m)throw Error('Give the month as YYYY-MM.');run({kind:'change',action:'report:month',value:m});run({kind:'submit',action:'report:save',form:{month:m,title:String(v.title||'Leadership report — '+monthLabel(m)),narrative:String(v.narrative||'')}});return {month:m};},
 'reminders.refresh':()=>{const more=Math.max(0,reminderDrift().length-50);run({kind:'click',action:'reminders'});return {more};},
 'layout.save':v=>{const prof=(()=>{try{return JSON.parse(cfg.layoutProfile||'{}');}catch(e){return {};}})(),L=LAYOUT;
  const out={heading:String(v.heading||L.heading).slice(0,100),tabs:L.tabs.slice(),cols:JSON.parse(JSON.stringify(L.cols)),visible:{...L.visible},labels:{...(prof.labels||{})},defaults:{...(prof.defaults||{})}};
  for(const k of Object.keys(out.visible))if(!SCREENS.some(x=>x.id===k)&&!(()=>{const [g,f]=k.split(':');return out.cols[g]&&out.cols[g].includes(f);})())delete out.visible[k];
  if(v.screens){const want=v.screens.filter(x=>out.tabs.includes(x));out.tabs=[...new Set(want.concat(out.tabs))];}
  for(const [g,ids] of Object.entries(v.order||{})){if(!out.cols[g])throw Error('Unknown group: '+g);if(!Array.isArray(ids))throw Error('order.'+g+' lists ids.');out.cols[g]=[...new Set(ids.filter(x=>out.cols[g].includes(x)).concat(out.cols[g]))];}
  const key=k=>{if(SCREENS.some(x=>x.id===k))return k;const [g,f]=String(k).split(':');if(!out.cols[g]||!out.cols[g].includes(f))throw Error('Unknown screen or field: '+k+' (use a screen id, or group:field).');return k;};
  const formKey=k=>{key(k);const g=String(k).split(':')[0];if(!g.endsWith('_form'))throw Error('Labels and defaults apply to form fields (group:field with a *_form group): '+k);return k;};
  for(const k of v.hide||[])out.visible[key(k)]=false;for(const k of v.show||[])delete out.visible[key(k)];
  for(const [k,x] of Object.entries(v.labels||{})){formKey(k);if(x===null||x==='')delete out.labels[k];else out.labels[k]=String(x).slice(0,100);}
  for(const [k,x] of Object.entries(v.defaults||{})){formKey(k);if(x===null)delete out.defaults[k];else out.defaults[k]=String(x).slice(0,200);}
  if(!out.tabs.some(id=>out.visible[id]!==false))throw Error('Keep at least one screen visible.');
  for(const [role,g] of Object.entries(FORM_GROUP))for(const f of S[role])if(f.required&&out.visible[g+':'+f.key]===false)throw Error(f.label+' is required and cannot be hidden.');
  if(!Object.keys(out.labels).length)delete out.labels;if(!Object.keys(out.defaults).length)delete out.defaults;
  tools.call('layout.propose',out);return {layout:'proposed'};}
};
function runCommand(id,raw){let v={};try{v=JSON.parse(raw||'{}')||{};}catch(e){return {ok:false,error:'The command input is not valid JSON.'};}
 const fn=COMMANDS[id];if(!fn)return {ok:false,error:'Programs has no command '+id+'.'};
 BUFFER=[];const before=SAVED.length;
 try{const result=fn(v)||{};if(BUFFER.length){if(BUFFER.length>50)throw Error('This change has more than 50 records. Split it into smaller commands.');tools.call('records.save',{changes:BUFFER});}
  return {ok:true,result:SAVED.length>before?{...result,saved:SAVED.slice(before).map(x=>x.message).filter(Boolean)}:result};}
 catch(e){return {ok:false,error:String(e&&e.message||e).slice(0,600)};}
 finally{BUFFER=null;}}

/* ---------- page ---------- */
if(event.kind==='command')return {html:'',css:'',state:{command:runCommand(action,event.value)}};
const screens=allScreens();
if(!screens.some(s=>s.id===st.screen))st.screen=(screens[0]||SCREENS[0]).id;
const nav=kit.nav(screens.map(s=>({id:s.id,label:s.label})),st.screen,{label:'Programs screens'});
let main='';
if(PENDING&&!(st.screen==='settings'))main=head((screens.find(s=>s.id===st.screen)||{label:'Programs'}).label,'',false)+loading();
else{try{main=st.screen==='overview'?overview():st.screen==='timeline'?timeline():st.screen==='plan'?plan():st.screen==='decisions'?decisions():st.screen==='raid'?raid():st.screen==='updates'?updates():st.screen==='programs'?programsScreen():st.screen==='team'?teamScreen():st.screen==='cash'?cashScreen():settingsScreen();}
 catch(e){main=head('Programs','',false)+'<p class="k-muted">This screen could not be shown: '+esc(String(e&&e.message||e).slice(0,200))+'</p>';}}
const overlay=PENDING?'':editorPanel()+rebaselinePanel()+gatePanel();
// The screen behind an open panel is inert for keyboard and assistive technology.
const html=kit.page((overlay?'<div inert>':'<div>')+kit.layout(nav,main,{side:true})+'</div>'+overlay);
const css=typeof PROGRAMS_CSS==='string'?PROGRAMS_CSS:'';
return {html,css,state:st,context:{program:st.prog||''},...(NOTICE?{notice:NOTICE}:{})};
