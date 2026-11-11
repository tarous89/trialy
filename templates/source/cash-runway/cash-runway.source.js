const templateLayoutSchema={"screens":[{"id":"overview","label":"Overview"},{"id":"cash_flow","label":"Cash flow"},{"id":"plan","label":"Plan"},{"id":"people","label":"People"},{"id":"scenarios","label":"Scenarios"},{"id":"actuals","label":"Actuals"},{"id":"settings","label":"Settings"}],"groups":{"lines":[{"id":"name","label":"Name"},{"id":"direction","label":"Direction"},{"id":"category","label":"Category"},{"id":"program_id","label":"Program"},{"id":"driver","label":"Driver"},{"id":"amount","label":"Amount"},{"id":"start_month","label":"Start"},{"id":"end_month","label":"End"},{"id":"status","label":"Status"}],"positions":[{"id":"title","label":"Title"},{"id":"program_id","label":"Program"},{"id":"start_month","label":"Start"},{"id":"end_month","label":"End"},{"id":"annual_salary","label":"Annual salary"},{"id":"status","label":"Status"}],"milestones":[{"id":"name","label":"Milestone"},{"id":"program_id","label":"Program"},{"id":"target_month","label":"Target month"}]}};
/* TrialAgents Runway 2.1.0 | frontend-js function body. No DOM, network, clock-based calculations or browser storage.
 * Returns {html,css,state}. All data comes from authorized bindings; every write is an exact records.propose reviewed by TrialAgents.
 * Results are calculated deterministically from authorized reads. Layout is edited in native TrialAgents settings (tracker:layout).
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
const grouped=(n,p=0)=>{const s=Math.abs(n).toFixed(p).split('.');return (n<0?'−':'')+s[0].replace(/\B(?=(\d{3})+(?!\d))/g,',')+(s[1]?'.'+s[1]:'');};
const round2=n=>Math.round(n*100)/100;
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const validDate=v=>{const t=String(v||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(t))return '';const d=new Date(t+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===t?t:'';};
const ym=v=>{const t=String(v||'');if(/^\d{4}-(0[1-9]|1[0-2])$/.test(t))return t;const d=validDate(t);return d?d.slice(0,7):'';};
const addMonths=(m,n)=>{if(!m)return '';const y=Number(m.slice(0,4)),k=Number(m.slice(5,7))-1+Math.round(n);const yy=y+Math.floor(k/12),mm=((k%12)+12)%12+1;return yy+'-'+String(mm).padStart(2,'0');};
const diffMonths=(a,b)=>(Number(b.slice(0,4))-Number(a.slice(0,4)))*12+Number(b.slice(5,7))-Number(a.slice(5,7));
const monthLabel=m=>m?MONTHS[Number(m.slice(5,7))-1]+' '+m.slice(0,4):'—';
const shortMonth=m=>m?MONTHS[Number(m.slice(5,7))-1]+' '+m.slice(2,4):'—';
const firstOf=m=>m?m+'-01':'';
const lastDay=m=>{const d=new Date(Date.UTC(Number(m.slice(0,4)),Number(m.slice(5,7)),0));return d.toISOString().slice(0,10);};
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return ('0000000'+(h>>>0).toString(16)).slice(-8);};
const plural=(n,w)=>n+' '+w+(Math.abs(n)===1?'':'s');
const signed=n=>(n>0?'+':n<0?'−':'±')+Math.abs(n);

const CURRENCIES=['USD','EUR','GBP','CHF','CAD','AUD','JPY','CNY','SEK','DKK','NOK','INR'];
const CATEGORIES=['Clinical','CMC','Research','People','G&A','Facilities','Other'];
const CAT_COLORS=['#175B94','#2E8B9A','#6E95C8','#8C6BB1','#B9873A','#5F8A4E','#8A94A6'];
const CASH_IN_TYPES=['equity','grant','partnership','tax_credit','other'];
const CHANGE_KINDS=['shift_program','scale_program','stop_program','add_position','remove_position','move_cash_in','resize_cash_in','fx_shift'];
const CHANGE_LABELS={shift_program:'Shift a program',scale_program:'Scale program spend',stop_program:'Stop a program',add_position:'Add a hire',remove_position:'Remove a position',move_cash_in:'Move a cash-in line',resize_cash_in:'Resize a cash-in line',fx_shift:'Exchange-rate shift'};
const HORIZON=60,SNAPSHOT_MONTHS=72,CHART_MONTHS=36;

/* ---------- logical schema (real keys come from tableMap) ---------- */
const ref=role=>({kind:'ref',ref:role});
const S={
 settings:[{key:'reporting_currency',label:'Reporting currency',kind:'select',options:CURRENCIES},{key:'enabled_currencies',label:'Enabled currencies (comma list)',kind:'text'},{key:'runway_target_months',label:'Runway target (months)',kind:'number'},{key:'trailing_window_months',label:'Trailing burn window (months)',kind:'number'},{key:'min_cash_reserve',label:'Minimum cash reserve',kind:'money'},{key:'loaded_cost_pct',label:'Loaded cost % on salaries',kind:'number'},{key:'opening_balance',label:'Opening bank balance',kind:'money'},{key:'opening_date',label:'Opening balance date (month end)',kind:'date'},{key:'categories',label:'Spend categories in order (comma list)',kind:'text'}],
 lines:[{key:'name',label:'Name',kind:'text',required:true},{key:'direction',label:'Direction',kind:'select',options:['spend','cash_in'],required:true},{key:'category',label:'Category',kind:'select',options:CATEGORIES,required:true},{key:'program_id',label:'Program',...ref('programs')},{key:'counterparty_id',label:'Vendor / counterparty',...ref('organizations')},{key:'agreement_id',label:'Agreement',...ref('agreements')},{key:'schedule_group',label:'Payment schedule group',kind:'text'},{key:'driver',label:'Driver',kind:'select',options:['monthly','one_off','spread'],required:true},{key:'amount',label:'Amount',kind:'money',required:true},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES,required:true},{key:'start_month',label:'Start month',kind:'month',required:true},{key:'end_month',label:'End month',kind:'month'},{key:'status',label:'Status',kind:'select',options:['committed','discretionary','contingent','received'],required:true},{key:'cash_in_type',label:'Cash-in type',kind:'select',options:CASH_IN_TYPES},{key:'notes',label:'Notes',kind:'longtext'},{key:'archived',label:'Archived',kind:'boolean'}],
 positions:[{key:'title',label:'Title',kind:'text',required:true},{key:'program_id',label:'Program',...ref('programs')},{key:'start_month',label:'Start month',kind:'month',required:true},{key:'end_month',label:'End month',kind:'month'},{key:'annual_salary',label:'Annual salary',kind:'money',required:true},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES,required:true},{key:'status',label:'Status',kind:'select',options:['current','planned'],required:true},{key:'person_id',label:'Person record ID',kind:'text'},{key:'archived',label:'Archived',kind:'boolean'}],
 milestones:[{key:'name',label:'Milestone',kind:'text',required:true},{key:'program_id',label:'Program',...ref('programs')},{key:'target_month',label:'Target month',kind:'month',required:true},{key:'source_milestone_id',label:'Programs app milestone ID',kind:'text'},{key:'archived',label:'Archived',kind:'boolean'}],
 actuals:[{key:'month',label:'Month',kind:'month',required:true},{key:'category',label:'Category',kind:'select',options:CATEGORIES,required:true},{key:'program_id',label:'Program',...ref('programs')},{key:'direction',label:'Direction',kind:'select',options:['spend','cash_in'],required:true},{key:'amount',label:'Amount',kind:'money',required:true},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES,required:true},{key:'cash_in_type',label:'Cash-in type',kind:'select',options:CASH_IN_TYPES},{key:'note',label:'Note',kind:'text'}],
 closes:[{key:'month',label:'Month',kind:'month',required:true},{key:'closing_balance',label:'Closing bank balance',kind:'money',required:true},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES,required:true},{key:'closed',label:'Closed',kind:'boolean'},{key:'commentary',label:'Commentary',kind:'longtext'},{key:'runway_months',label:'Runway (months)',kind:'number'},{key:'cash_out_month',label:'Cash-out month',kind:'date'},{key:'runway_status',label:'Runway status',kind:'select',options:['ok','below_target']},{key:'metrics',label:'Frozen metrics',kind:'frozen'},{key:'rates_used',label:'Rates used',kind:'frozen'},{key:'closed_at',label:'Closed on',kind:'date'}],
 budgets:[{key:'name',label:'Name',kind:'text',required:true},{key:'year',label:'Year',kind:'number',required:true},{key:'locked_on',label:'Locked on',kind:'date',required:true},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES,required:true},{key:'totals',label:'Frozen totals',kind:'frozen'},{key:'rates_used',label:'Rates used',kind:'frozen'},{key:'notes',label:'Notes',kind:'text'}],
 scenarios:[{key:'name',label:'Name',kind:'text',required:true},{key:'status',label:'Status',kind:'select',options:['saved','adopted','archived'],required:true},{key:'based_on_close',label:'Based on close',kind:'date'},{key:'based_on_version',label:'Forecast version',kind:'text'},{key:'created_on',label:'Created on',kind:'date'},{key:'summary',label:'Summary',kind:'longtext'}],
 changes:[{key:'scenario_id',label:'Scenario',kind:'text',required:true},{key:'kind',label:'Change',kind:'select',options:CHANGE_KINDS,required:true},{key:'target_id',label:'Target record',kind:'text'},{key:'months',label:'Months',kind:'number'},{key:'pct',label:'Percent',kind:'number'},{key:'amount',label:'Amount',kind:'money'},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES},{key:'from_month',label:'From month',kind:'month'},{key:'label',label:'Label',kind:'text'}],
 rates:[{key:'month',label:'Month',kind:'month',required:true},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES,required:true},{key:'rate_per_eur',label:'Units per 1 EUR (monthly average)',kind:'number',required:true},{key:'source',label:'Source',kind:'select',options:['ecb','manual'],required:true},{key:'source_ref',label:'Source reference',kind:'text'}],
 // Core data contract v1 (templates/core-contract/v1.json): shared workspace tables, one per role.
 programs:[{key:'name',label:'Program name',kind:'text',required:true},{key:'code',label:'Code',kind:'text'},{key:'indication',label:'Indication',kind:'text'},{key:'modality',label:'Modality',kind:'select',options:['small_molecule','biologic','antibody','cell_therapy','gene_therapy','rna','vaccine','device','other']},{key:'stage',label:'Stage',kind:'select',options:['discovery','preclinical','ind_enabling','phase_1','phase_2','phase_3','registration','approved'],required:true},{key:'lead',label:'Lead',kind:'text'},{key:'status',label:'Status',kind:'select',options:['active','paused','stopped','partnered']},{key:'archived',label:'Archived',kind:'boolean'}],
 organizations:[{key:'name',label:'Organization',kind:'text',required:true},{key:'org_type',label:'Type',kind:'select',options:['company','investor','cro','cdmo','site','funder','partner','agency','other']},{key:'country',label:'Country',kind:'text'},{key:'website',label:'Website',kind:'text'},{key:'archived',label:'Archived',kind:'boolean'}],
 agreements:[{key:'name',label:'Agreement',kind:'text',required:true},{key:'counterparty_id',label:'Counterparty',...ref('organizations')},{key:'agreement_type',label:'Agreement type',kind:'text'},{key:'status',label:'Status',kind:'text'},{key:'effective_date',label:'Effective date',kind:'date'},{key:'expiry_date',label:'Expiry date',kind:'date'},{key:'archived',label:'Archived',kind:'boolean'}],
 // Programs app output, read only: key milestones (plan_items.is_key). Runway never writes it.
 programItems:[{key:'name',label:'Milestone',kind:'text'},{key:'program_id',label:'Program',...ref('programs')},{key:'item_type',label:'Item type',kind:'select',options:['milestone','activity']},{key:'end_date',label:'Date',kind:'date'},{key:'status',label:'Status',kind:'select',options:['planned','in_progress','done','at_risk','cancelled']},{key:'is_key',label:'Key milestone',kind:'boolean'},{key:'archived',label:'Archived',kind:'boolean'}]
};
const ROLE_LABEL={programItems:'Programs milestone',settings:'settings',lines:'plan line',positions:'position',milestones:'milestone',actuals:'actual',closes:'month close',budgets:'budget',scenarios:'scenario',changes:'scenario change',rates:'exchange rate',programs:'program',organizations:'organization',agreements:'agreement'};
const CALC_FIELDS={settings:['reporting_currency','opening_balance','opening_date'],lines:['direction','category','driver','amount','currency','start_month','status'],positions:['start_month','annual_salary','currency','status'],milestones:['name','target_month'],actuals:['month','category','direction','amount','currency'],closes:['month','closing_balance','currency','closed'],rates:['month','currency','rate_per_eur']};

/* ---------- bindings ---------- */
/* Stable role keys (modular apps rule 5): core contract roles for shared tables, runway.* for this app's tables,
 * programs.plan_items for the Programs app output. The 2.0.0 short keys are still accepted in tableMap. */
const ROLE_KEY={settings:'runway.settings',lines:'runway.plan_lines',positions:'runway.positions',milestones:'runway.milestones',actuals:'runway.actuals',closes:'runway.month_closes',budgets:'runway.budgets',scenarios:'runway.scenarios',changes:'runway.scenario_changes',rates:'runway.fx_rates',programs:'programs',organizations:'organizations',agreements:'agreements',programItems:'programs.plan_items'};
let mapping={};try{mapping=JSON.parse(cfg.tableMap||'{}');}catch(e){mapping={};}
const roleMap={};
for(const role of Object.keys(S)){
 const m=mapping[ROLE_KEY[role]]||(role==='programItems'?null:mapping[role]),b=m&&bindings.find(x=>x.typeId===m.typeId);
 if(!m||!b)continue;
 const fields={};for(const f of S[role]){const k=m.fields&&m.fields[f.key]!==undefined?m.fields[f.key]:f.key;if(typeof k==='string'&&(b.fields||[]).includes(k))fields[f.key]=k;}
 roleMap[role]={typeId:m.typeId,fields,writable:(Array.isArray(m.writableFields)?m.writableFields:[]).filter(x=>fields[x])};
}
let callsLeft=88;const cache={};
function readRole(role){
 if(cache[role])return cache[role];const m=roleMap[role];
 if(!m)return cache[role]={rows:[],complete:false,unbound:true,unavailable:false,total:0,truncated:false};
 const rows=[];let offset=0,total=null,complete=false,unavailable=false,truncated=false;
 for(let page=0;page<8;page++){
  if(callsLeft<=0){truncated=true;break;}callsLeft--;
  const p=tools.call('records.read',{typeId:m.typeId,limit:100,offset,filters:{}});
  if(!p||p.unavailable){unavailable=true;break;}
  const chunk=Array.isArray(p.rows)?p.rows:[];total=p.total===null||p.total===undefined||!Number.isFinite(Number(p.total))?null:Number(p.total);
  for(const r of chunk){const data={};for(const [logical,real] of Object.entries(m.fields))if(has(r.data,real))data[logical]=r.data[real];rows.push({id:r.id,version:r.version,data});}
  offset+=chunk.length;
  if(total!==null&&offset>=total){complete=true;break;}
  if(chunk.length<100)break;
  if(page===7)truncated=true;
 }
 return cache[role]={rows:rows.filter(r=>!bool(r.data.archived)),allRows:rows,total:total===null?rows.length:total,complete,unavailable,unbound:false,truncated};
}
const missingCalcFields=role=>(CALC_FIELDS[role]||[]).filter(k=>!roleMap[role]||!roleMap[role].fields[k]);
const canWrite=role=>!!inp.saved&&!!inp.writable&&cfg.readOnly!==true&&!!roleMap[role]&&roleMap[role].writable.length>0;
const writableField=(role,key)=>canWrite(role)&&roleMap[role].writable.includes(key);
// The Programs app output is never written by Runway, whatever the manifest says.
if(roleMap.programItems)roleMap.programItems.writable=[];

/* ---------- state and layout ---------- */
const SCREENS=templateLayoutSchema.screens;
const DESC={overview:'How long the cash lasts, and whether it reaches the next milestone.',cash_flow:'Monthly cash in, spend by category, net burn and closing cash.',plan:'Spend and cash-in lines, payment schedules, milestones and the locked budget.',people:'Current roles, planned hires and their monthly cost.',scenarios:'What-if previews, saved scenarios and side-by-side comparison.',actuals:'Monthly close, variance against budget and frozen snapshots.',settings:'Currencies and rates, runway assumptions, categories and programs.'};
const st=JSON.parse(JSON.stringify(inp.state||{}));
{
 let profile={};try{profile=JSON.parse(cfg.layoutProfile||'{}');}catch(e){profile={};}
 const groups=templateLayoutSchema.groups;
 const tabs=Array.isArray(profile.tabs)?profile.tabs.filter(id=>SCREENS.some(s=>s.id===id)):[];
 const cols={};for(const g of Object.keys(groups)){const ids=groups[g].map(x=>x.id),saved=profile.cols&&Array.isArray(profile.cols[g])?profile.cols[g].filter(k=>ids.includes(k)):[];cols[g]=[...new Set(saved.concat(ids))];}
 // Saved configuration always wins over any stale layout carried in UI state.
 st.layout={tabs:[...new Set(tabs.concat(SCREENS.map(s=>s.id)))],cols,visible:profile.visible&&typeof profile.visible==='object'?profile.visible:{},heading:String(profile.heading||cfg.heading||'Runway').slice(0,100)};
}
st.section=String(st.section||'overview');st.page=Math.max(0,Number(st.page)||0);st.query=String(st.query||'').slice(0,100);
st.filters=st.filters&&typeof st.filters==='object'?st.filters:{};st.planTab=['lines','milestones','budgets'].includes(st.planTab)?st.planTab:'lines';
st.cf=st.cf&&typeof st.cf==='object'?st.cf:{source:'forecast',contingent:false,programs:false,page:0};
st.compare=Array.isArray(st.compare)?st.compare.slice(0,4):['forecast'];
const note=v=>{st.notice=String(v||'').slice(0,400);};
const sections=st.layout.tabs.map(id=>SCREENS.find(s=>s.id===id)).filter(s=>s&&st.layout.visible[s.id]!==false);
if(!sections.some(s=>s.id===st.section))st.section=(sections[0]||SCREENS[0]).id;

/* ---------- data ---------- */
const R={};for(const role of ['settings','lines','positions','milestones','actuals','closes','rates','budgets','scenarios','changes','programs','organizations','agreements','programItems'])R[role]=readRole(role);
const settingsRow=R.settings.rows[0]||null;const SET=settingsRow?settingsRow.data:{};
const C=CURRENCIES.includes(SET.reporting_currency)?SET.reporting_currency:'';
const target=num(SET.runway_target_months,18)>0?num(SET.runway_target_months,18):18;
const trailingN=[3,6].includes(num(SET.trailing_window_months,3))?num(SET.trailing_window_months,3):3;
const reserve=Math.max(0,num(SET.min_cash_reserve,0));
const loaded=num(SET.loaded_cost_pct,0);
const enabledCats=(()=>{const list=String(SET.categories||'').split(',').map(x=>x.trim()).filter(x=>CATEGORIES.includes(x));return list.length?[...new Set(list.concat(CATEGORIES))]:CATEGORIES.slice();})();
/* Rule 3: references to shared records never error. Missing, archived or unreadable records are labelled. */
const tableState=role=>{const r=R[role];return !r||r.unbound?'unbound':r.unavailable?'unavailable':!r.complete?'partial':'ok';};
const refName=(role,id,noun)=>{if(!id)return noun==='program'?'No program':'—';const st0=tableState(role),r=(R[role]&&R[role].allRows||[]).find(x=>x.id===id);
 if(r)return String(r.data.name||'Unnamed')+(bool(r.data.archived)?' (archived)':'');
 return st0==='unbound'?(noun||ROLE_LABEL[role])+' not connected':(noun?noun[0].toUpperCase()+noun.slice(1):'Record')+' unavailable';};
const progName=id=>refName('programs',id,'program');
const programsUsable=()=>tableState('programs')==='ok'||tableState('programs')==='partial';
const salaryBound=!!(roleMap.positions&&roleMap.positions.fields.annual_salary);
const salaryRestricted=!salaryBound||(R.positions.rows.length>0&&!R.positions.rows.some(r=>has(r.data,'annual_salary')));
const money=(v,cur)=>v===null||v===undefined||!Number.isFinite(Number(v))?'—':(cur||C||'')+' '+grouped(Math.round(Number(v)));
const compact=v=>{if(v===null||v===undefined||!Number.isFinite(v))return '—';const a=Math.abs(v);return a>=1e6?grouped(v/1e6,2)+'M':a>=1e4?grouped(v/1e3,0)+'k':grouped(v,0);};

/* ---------- calculation engine (deterministic; no clock) ---------- */
/* Milestones: Runway's own list, plus key milestones from the Programs app output when it is connected and fully readable.
 * A Runway milestone linked by source_milestone_id follows the Programs date; when that link is unavailable it keeps
 * its own date and says so. Nothing from Programs is ever written by Runway. */
const PROGRAMS_LINK=tableState('programItems');
function mergedMilestones(){
 const own=R.milestones.rows.map(r=>({id:r.id,version:r.version,...r.data,_source:'runway'}));
 if(PROGRAMS_LINK==='unbound')return own;
 const ok=PROGRAMS_LINK==='ok',items=ok?R.programItems.rows.filter(r=>r.data.item_type==='milestone'&&r.data.status!=='cancelled'&&validDate(r.data.end_date)):[];
 const byId={};for(const r of items)byId[r.id]=r;const linked=new Set();
 for(const m of own){if(!m.source_milestone_id)continue;const it=byId[m.source_milestone_id];
  if(it){linked.add(it.id);m._source='linked';m._ownMonth=m.target_month;m.target_month=firstOf(ym(it.data.end_date));}else m._source='link_unavailable';}
 for(const it of items)if(bool(it.data.is_key)&&!linked.has(it.id))own.push({id:'programs:'+it.id,name:String(it.data.name||'Programs milestone'),program_id:it.data.program_id||'',target_month:firstOf(ym(it.data.end_date)),_source:'programs'});
 return own;}
function dataset(over){return Object.assign({settings:SET,lines:R.lines.rows.map(r=>({id:r.id,version:r.version,...r.data})),positions:R.positions.rows.map(r=>({id:r.id,version:r.version,...r.data})),milestones:mergedMilestones(),actuals:R.actuals.rows.map(r=>({id:r.id,...r.data})),closes:R.closes.rows.map(r=>({id:r.id,version:r.version,...r.data})),rates:R.rates.rows.map(r=>({id:r.id,...r.data}))},over||{});}
function applyChanges(D,changes){
 const lines=D.lines.map(x=>({...x})),positions=D.positions.map(x=>({...x})),milestones=D.milestones.map(x=>({...x})),fx={},notes=[];
 const shift=(o,keys,n)=>{for(const k of keys){const m=ym(o[k]);if(m)o[k]=firstOf(addMonths(m,n));}};
 const stopAt=(o,from)=>{const s=ym(o.start_month),e=ym(o.end_month);if(!s)return;if(s>=from)o._drop=true;else if(!e||e>=from)o.end_month=firstOf(addMonths(from,-1));};
 (changes||[]).forEach((c,i)=>{
  const n=Math.round(num(c.months,0)),pct=num(c.pct,0),from=ym(c.from_month);
  if(c.kind==='shift_program'&&c.target_id){for(const l of lines)if(l.program_id===c.target_id)shift(l,['start_month','end_month'],n);for(const p of positions)if(p.program_id===c.target_id)shift(p,['start_month','end_month'],n);for(const m of milestones)if(m.program_id===c.target_id)shift(m,['target_month'],n);}
  else if(c.kind==='scale_program'&&c.target_id){for(const l of lines)if(l.program_id===c.target_id&&l.direction==='spend'&&num(l.amount)!==null)l.amount=round2(num(l.amount)*(1+pct/100));}
  else if(c.kind==='stop_program'&&c.target_id&&from){for(const l of lines)if(l.program_id===c.target_id&&l.direction==='spend')stopAt(l,from);for(const p of positions)if(p.program_id===c.target_id)stopAt(p,from);}
  else if(c.kind==='add_position'&&from&&num(c.amount)!==null){positions.push({id:'scenario-hire-'+i,title:String(c.label||'Planned hire'),program_id:c.target_id||'',start_month:firstOf(from),end_month:'',annual_salary:num(c.amount),currency:c.currency||D.settings.reporting_currency,status:'planned',_new:true});}
  else if(c.kind==='remove_position'&&c.target_id){for(const p of positions)if(p.id===c.target_id){if(from)stopAt(p,from);else p._drop=true;}}
  else if(c.kind==='move_cash_in'&&c.target_id){for(const l of lines)if(l.id===c.target_id&&l.direction==='cash_in')shift(l,['start_month','end_month'],n);}
  else if(c.kind==='resize_cash_in'&&c.target_id){for(const l of lines)if(l.id===c.target_id&&l.direction==='cash_in'){const a=num(c.amount);l.amount=a!==null?a:round2(num(l.amount,0)*(1+pct/100));}}
  else if(c.kind==='fx_shift'&&c.currency){fx[c.currency]=(fx[c.currency]||0)+pct;}
  else notes.push('Change '+(i+1)+' is incomplete and was not applied.');
 });
 return {...D,lines,positions,milestones,fx,changeNotes:notes};
}
function engine(D0,opt){
 opt=opt||{};const D=opt.changes&&opt.changes.length?applyChanges(D0,opt.changes):{...D0,fx:{},changeNotes:[]};
 const set=D.settings||{},cur=CURRENCIES.includes(set.reporting_currency)?set.reporting_currency:'';
 const blocks=[],warns=[],excluded=[];
 const O=ym(set.opening_date),open=num(set.opening_balance);
 if(!cur)blocks.push('Choose a reporting currency in Settings.');
 if(!O)blocks.push('Enter the opening bank balance date in Settings.');
 if(open===null)blocks.push('Enter the opening bank balance in Settings.');
 if(set.opening_date&&!validDate(set.opening_date))blocks.push('The opening balance date is not a valid date.');
 // Exchange rates: monthly averages, units of currency per 1 EUR.
 const rateMap={},latest={};
 for(const r of D.rates){const m=ym(r.month),v=num(r.rate_per_eur);if(!m||!CURRENCIES.includes(r.currency)||v===null||v<=0){warns.push('An exchange-rate row has an invalid month, currency or rate and is ignored.');continue;}(rateMap[r.currency]=rateMap[r.currency]||{})[m]=v;if(!latest[r.currency]||m>latest[r.currency])latest[r.currency]=m;}
 // History: opening balance, then each confirmed month close.
 const history=[];let A=O;
 if(O&&open!==null)history.push({m:O,cash:open,source:'opening'});
 const closes=D.closes.filter(c=>bool(c.closed)).map(c=>({...c,_m:ym(c.month)}));
 for(const c of D.closes)if(!ym(c.month))blocks.push('A month close has an invalid month.');
 const byMonth={};for(const c of closes){if(!c._m)continue;if(byMonth[c._m])warns.push('More than one close exists for '+monthLabel(c._m)+'; the later record is used.');byMonth[c._m]=c;}
 const rate=(cu,m)=>{if(cu==='EUR')return 1;const t=rateMap[cu]||{};if(t[m])return t[m];if(A&&m>A&&latest[cu])return t[latest[cu]];return null;};
 const conv=(x,cu,m,ctx)=>{if(!cur||x===null)return null;let v;if(cu===cur)v=x;else{const a=rate(cu,m),b=rate(cur,m);if(a===null||b===null){if(ctx)excluded.push({month:m,currency:cu,what:ctx});return null;}v=x/a*b;}if(cu!==cur&&D.fx[cu])v=v*(1+D.fx[cu]/100);return v;};
 const closedMonths=Object.keys(byMonth).sort();
 for(const m of closedMonths){const c=byMonth[m];if(O&&m<=O){warns.push('The close for '+monthLabel(m)+' is on or before the opening date and is ignored.');continue;}
  A=m;const bal=num(c.closing_balance);const cu=CURRENCIES.includes(c.currency)?c.currency:'';const v=bal===null||!cu?null:conv(bal,cu,m,'closing balance');
  if(v===null){blocks.push('The closing balance for '+monthLabel(m)+' is missing or cannot be converted.');continue;}history.push({m,cash:v,source:'close',id:c.id});}
 if(O)for(let m=addMonths(O,1);A&&m<A;m=addMonths(m,1))if(!byMonth[m])warns.push(monthLabel(m)+' is not closed.');
 const latestPoint=history[history.length-1];A=latestPoint?latestPoint.m:O;const start=latestPoint?latestPoint.cash:null;
 for(const a of D.actuals){const m=ym(a.month);if(m&&A&&m>A){warns.push('Actuals are recorded for '+monthLabel(m)+', but the month is not closed yet.');break;}}
 // Validate plan rows once.
 const lineOk=l=>{const s=ym(l.start_month),e=l.end_month?ym(l.end_month):'';if(!['spend','cash_in'].includes(l.direction)||!['monthly','one_off','spread'].includes(l.driver)||num(l.amount)===null||num(l.amount)<0||!CURRENCIES.includes(l.currency)||!s)return false;if(l.end_month&&!e)return false;if(e&&e<s)return false;if(l.driver==='spread'&&!e)return false;return true;};
 const lines=[],positions=[];
 for(const l of D.lines){if(l._drop)continue;if(lineOk(l))lines.push(l);else warns.push('Plan line “'+String(l.name||'Unnamed')+'” has an invalid driver, amount, currency or month and is excluded.');}
 for(const p of D.positions){if(p._drop)continue;const s=ym(p.start_month),e=p.end_month?ym(p.end_month):'';if(!has(p,'annual_salary')){continue;}if(!s||(p.end_month&&!e)||(e&&e<s)||num(p.annual_salary)===null||num(p.annual_salary)<0||!CURRENCIES.includes(p.currency))warns.push('Position “'+String(p.title||'Untitled')+'” has an invalid month, salary or currency and is excluded.');else positions.push(p);}
 const lineAmount=(l,m)=>{const s=ym(l.start_month),e=ym(l.end_month),a=num(l.amount);if(l.driver==='one_off')return m===s?a:0;if(m<s||(e&&m>e))return 0;if(l.driver==='monthly')return a;return a/(diffMonths(s,e)+1);};
 const posCost=(p,m)=>{const s=ym(p.start_month),e=ym(p.end_month);if(m<s||(e&&m>e))return 0;return num(p.annual_salary)/12*(1+num(set.loaded_cost_pct,0)/100);};
 // One month of plan, any month (used for forecast, budgets and variance).
 function planMonth(m){
  const o={m,spend:{},prog:{},linesSpend:0,people:0,cashBase:0,cashCont:0,opIn:0,cashByType:{},drill:{}};
  const add=(cat,pid,v,ref)=>{o.spend[cat]=(o.spend[cat]||0)+v;const pk=pid||'';(o.prog[pk]=o.prog[pk]||{})[cat]=(o.prog[pk][cat]||0)+v;(o.drill[cat]=o.drill[cat]||[]).push(ref);};
  for(const l of lines){const raw=lineAmount(l,m);if(!raw)continue;const v=conv(raw,l.currency,m,'line “'+String(l.name||'')+'”');if(v===null)continue;
   const ref={kind:'line',id:l.id,name:l.name,driver:l.driver,original:raw,currency:l.currency,converted:v,program:l.program_id||'',status:l.status};
   if(l.direction==='spend'){o.linesSpend+=v;add(CATEGORIES.includes(l.category)?l.category:'Other',l.program_id,v,ref);}
   else{if(l.status==='committed'||l.status==='received'){o.cashBase+=v;o.cashByType[l.cash_in_type||'other']=(o.cashByType[l.cash_in_type||'other']||0)+v;if(l.cash_in_type==='other')o.opIn+=v;(o.drill.cash_in=o.drill.cash_in||[]).push(ref);}else if(l.status==='contingent'){o.cashCont+=v;(o.drill.contingent=o.drill.contingent||[]).push(ref);}}}
  for(const p of positions){const raw=posCost(p,m);if(!raw)continue;const v=conv(raw,p.currency,m,'position “'+String(p.title||'')+'”');if(v===null)continue;o.people+=v;add('People',p.program_id,v,{kind:'position',id:p.id,name:p.title,original:raw,currency:p.currency,converted:v,program:p.program_id||''});}
  o.spendTotal=o.linesSpend+o.people;o.netBurn=o.spendTotal-o.opIn;return o;
 }
 const months=[];let cash=start,cashC=start,firstNeg=null,firstNegC=null,firstReserve=null;
 const ready=!blocks.length&&A&&start!==null;
 if(ready){for(let i=1;i<=(opt.horizon||HORIZON);i++){const m=addMonths(A,i),p=planMonth(m);cash+=p.cashBase-p.spendTotal;cashC+=p.cashBase+p.cashCont-p.spendTotal;p.close=cash;p.closeCont=cashC;months.push(p);
   if(firstNeg===null&&cash<0)firstNeg=i;if(firstNegC===null&&cashC<0)firstNegC=i;if(firstReserve===null&&cash<(reserveOf(set))&&reserveOf(set)>0)firstReserve=i;}}
 const H=opt.horizon||HORIZON;
 const runwayOf=fn=>fn===null?{months:H,beyond:true,lastsUntil:addMonths(A,H),cashOut:'',startRaise:''}:{months:fn-1,beyond:false,lastsUntil:addMonths(A,fn-1),cashOut:addMonths(A,fn),startRaise:addMonths(A,Math.max(0,fn-1-(num(set.runway_target_months,18)>0?num(set.runway_target_months,18):18)+1))};
 const runway=ready?runwayOf(firstNeg):null,runwayC=ready?runwayOf(firstNegC):null;
 // Milestones: cash at milestone and cushion to cash-out (or to the reserve when one is set).
 const ms=[];for(const x of D.milestones){if(x._drop)continue;const m=ym(x.target_month);if(!m){warns.push('Milestone “'+String(x.name||'')+'” has no valid target month.');continue;}
  const i=A?diffMonths(A,m):null,row=ready&&i>=1&&i<=months.length?months[i-1]:null,limit=reserveOf(set)>0?firstReserve:firstNeg;
  const cushion=!ready||i===null||i<1?null:limit===null?{months:H-i,beyond:true}:{months:limit-1-i,beyond:false};
  ms.push({id:x.id,name:x.name,program:x.program_id||'',m,passed:!!A&&m<=A,cash:row?row.close:null,cushion,source:x._source||'runway'});}
 ms.sort((a,b)=>a.m.localeCompare(b.m));
 // Trailing burn from actuals of the last N closed months.
 const actualMonth=m=>{const o={m,spend:{},prog:{},spendTotal:0,opIn:0,cashIn:0,count:0,drill:{}};for(const a of D.actuals){if(ym(a.month)!==m)continue;const raw=num(a.amount);if(raw===null||!CURRENCIES.includes(a.currency))continue;const v=conv(raw,a.currency,m,'actual '+String(a.category||''));if(v===null)continue;o.count++;
  if(a.direction==='spend'){const cat=CATEGORIES.includes(a.category)?a.category:'Other';o.spend[cat]=(o.spend[cat]||0)+v;const pk=a.program_id||'';(o.prog[pk]=o.prog[pk]||{})[cat]=(o.prog[pk][cat]||0)+v;o.spendTotal+=v;(o.drill[cat]=o.drill[cat]||[]).push({kind:'actual',id:a.id,name:(a.note||cat+' actual'),original:raw,currency:a.currency,converted:v,program:a.program_id||''});}
  else{o.cashIn+=v;if(a.cash_in_type==='other')o.opIn+=v;(o.drill.cash_in=o.drill.cash_in||[]).push({kind:'actual',id:a.id,name:a.note||'Cash in',original:raw,currency:a.currency,converted:v});}}
  o.netBurn=o.spendTotal-o.opIn;return o;};
 const closedAfterOpen=history.filter(h=>h.source==='close').map(h=>h.m);
 const recent=closedAfterOpen.slice(-trailingOf(set)).map(actualMonth);
 const trailing=recent.length===trailingOf(set)&&recent.every(x=>x.count>0)&&start!==null?(()=>{const avg=recent.reduce((n,x)=>n+x.netBurn,0)/recent.length;return {avg,months:avg>0?start/avg:null};})():null;
 return {cur,O,A,start,history,months,runway,runwayC,milestones:ms,blocks:[...new Set(blocks)],warns:[...new Set(warns.concat(D.changeNotes||[]))],excluded,ready:!!ready,planMonth,actualMonth,trailing,rate,latestRate:latest,rateMap};
}
function reserveOf(set){return Math.max(0,num(set&&set.min_cash_reserve,0));}
function trailingOf(set){const n=num(set&&set.trailing_window_months,3);return [3,6].includes(n)?n:3;}
function excludedText(list){const seen={};for(const x of list)seen[x.currency+' '+x.month]=x;const keys=Object.keys(seen);return keys.length?'Missing exchange rate: '+keys.slice(0,4).map(k=>{const x=seen[k];return x.currency+' for '+monthLabel(x.month);}).join(', ')+(keys.length>4?' and '+(keys.length-4)+' more':'')+'. Affected rows are excluded, never guessed.':'';}
function readIssues(){const out=[];for(const role of ['settings','lines','positions','milestones','actuals','closes','rates']){const r=R[role];const label=ROLE_LABEL[role];
  if(r.unbound)out.push('The '+label+' table is not bound to this app.');else if(r.unavailable)out.push('You do not have access to the '+label+' table.');else if(!r.complete)out.push('The '+label+' table could not be read completely ('+r.rows.length+' of '+(r.total||'unknown')+' rows); totals are withheld.');
  const miss=missingCalcFields(role).filter(k=>!(role==='positions'&&k==='annual_salary'));if(!r.unbound&&miss.length)out.push('The '+label+' table is missing required fields: '+miss.join(', ')+'.');}
 if(R.settings.rows.length>1)out.push('More than one settings row exists; the first is used. Archive or delete the extra rows in Database.');
 return out;}
const fingerprint=()=>hash(['settings','lines','positions','milestones','closes','rates'].concat(PROGRAMS_LINK==='unbound'?[]:['programItems']).map(role=>R[role].rows.map(r=>r.id+':'+r.version).sort().join(',')).join('|'));
const FP=fingerprint();
const BASE=dataset();
const model=engine(BASE);
const readProblems=readIssues();
const salaryBlock=salaryRestricted&&R.positions.rows.length>0;
const exact=model.ready&&!readProblems.length&&!salaryBlock;
const C2=model.cur||C;

/* ---------- snapshots, budgets, bridge ---------- */
const parseJSON=t=>{try{const v=JSON.parse(String(t||''));return v&&typeof v==='object'?v:null;}catch(e){return null;}};
const closesSorted=R.closes.rows.filter(r=>bool(r.data.closed)&&ym(r.data.month)).sort((a,b)=>ym(b.data.month).localeCompare(ym(a.data.month)));
const latestSnap=closesSorted.map(r=>({row:r,m:parseJSON(r.data.metrics)})).find(x=>x.m&&x.m.v===2)||null;
function seriesRunway(A,start,get){let c=start;for(let i=1;i<=HORIZON;i++){const m=addMonths(A,i),v=get(m);if(!v)return null;c+=v.c-v.l-v.p;if(c<0)return {months:i-1,beyond:false};}return {months:HORIZON,beyond:true};}
function bridge(){
 if(!latestSnap||!exact)return null;const s=latestSnap.m;if(s.currency!==C2||!s.months||!s.months.length)return null;
 const old={},now={};for(const x of s.months)old[x.m]=x;for(const x of model.months)now[x.m]={l:x.linesSpend,p:x.people,c:x.cashBase};
 const mix=(l,p,c)=>m=>{const a=l[m],b=p[m],d=c[m];return a&&b&&d?{l:a.l,p:b.p,c:d.c}:null;};
 const r0=s.runway&&Number.isFinite(s.runway.months)?{months:s.runway.months,beyond:!!s.runway.beyond}:null;
 const r1=seriesRunway(model.A,model.start,mix(old,old,old)),r2=seriesRunway(model.A,model.start,mix(now,old,old)),r3=seriesRunway(model.A,model.start,mix(now,now,old)),r4={months:model.runway.months,beyond:model.runway.beyond};
 if(!r0||!r1||!r2||!r3)return {unavailable:true,asOf:s.asOf};
 const parts=[{label:'Closed months and bank balance',v:r1.months-r0.months},{label:'Spend lines',v:r2.months-r1.months},{label:'People',v:r3.months-r2.months},{label:'Cash-in lines',v:r4.months-r3.months}].sort((a,b)=>Math.abs(b.v)-Math.abs(a.v));
 return {asOf:s.asOf,from:r0,to:r4,total:r4.months-r0.months,parts,capped:r0.beyond||r4.beyond};
}
function snapshotMetrics(m,budget){
 const am=m.actualMonth(m.A);const variance=budget?varianceFor(m,budget,m.A):null;
 return {v:2,asOf:m.A,currency:m.cur,start:round2(m.start),horizon:HORIZON,
  runway:{months:m.runway.months,beyond:m.runway.beyond,lastsUntil:m.runway.lastsUntil,cashOut:m.runway.cashOut,startRaise:m.runway.startRaise},
  runwayContingent:{months:m.runwayC.months,beyond:m.runwayC.beyond,cashOut:m.runwayC.cashOut},target:target,
  burn:{spend:Object.fromEntries(Object.entries(am.spend).map(([k,v])=>[k,round2(v)])),spendTotal:round2(am.spendTotal),opIn:round2(am.opIn),net:round2(am.netBurn)},
  trailing:m.trailing&&m.trailing.months!==null?{avgBurn:round2(m.trailing.avg),months:round2(m.trailing.months),window:trailingN}:null,
  variance:variance?{budget:variance.budgetName,rows:variance.rows.map(r=>({cat:r.cat,budget:r.budget===null?null:round2(r.budget),actual:round2(r.actual)}))}:null,
  milestones:m.milestones.filter(x=>!x.passed).slice(0,12).map(x=>({name:x.name,m:x.m,cash:x.cash===null?null:round2(x.cash),cushion:x.cushion?x.cushion.months:null,beyond:x.cushion?x.cushion.beyond:false})),
  months:m.months.slice(0,SNAPSHOT_MONTHS).map(x=>({m:x.m,l:round2(x.linesSpend),p:round2(x.people),c:round2(x.cashBase),k:round2(x.cashCont)})),
  warnings:m.warns.slice(0,10)};
}
function ratesUsed(m,months){const out={};for(const cu of CURRENCIES){if(cu===m.cur)continue;const used=months.map(x=>[x,m.rate(cu,x)]).filter(x=>x[1]!==null);if(used.length&&(m.rateMap[cu]||cu==='EUR'))out[cu]=Object.fromEntries(used.filter((x,i)=>i===0||x[1]!==used[i-1][1]).map(x=>[x[0],x[1]]));}return out;}
const budgetsAll=R.budgets.rows.map(r=>({row:r,t:parseJSON(r.data.totals)})).filter(x=>x.t&&x.t.months).sort((a,b)=>num(b.row.data.year,0)-num(a.row.data.year,0));
const budgetFor=m=>budgetsAll.find(b=>String(num(b.row.data.year,0))===m.slice(0,4)&&b.row.data.currency===C2)||null;
function varianceFor(m,b,month){const tm=b.t.months[month];if(!tm)return null;const am=m.actualMonth(month);const cats=[...new Set(enabledCats.concat(Object.keys(tm.spend||{}),Object.keys(am.spend)))];
 const rows=cats.map(cat=>{const bud=num((tm.spend||{})[cat],0),act=am.spend[cat]||0;return {cat,budget:bud,actual:act,diff:act-bud,pct:bud?((act-bud)/bud)*100:null};}).filter(r=>r.budget||r.actual);
 const progRows=[];for(const [pid,cats2] of Object.entries(am.prog)){if(!pid)continue;for(const [cat,act] of Object.entries(cats2)){const bud=num(((tm.prog||{})[pid]||{})[cat],0);progRows.push({pid,cat,budget:bud,actual:act,diff:act-bud,pct:bud?((act-bud)/bud)*100:null});}}
 return {budgetName:String(b.row.data.name||'Budget'),rows,progRows,totalBudget:rows.reduce((n,r)=>n+r.budget,0),totalActual:rows.reduce((n,r)=>n+r.actual,0),count:am.count};}
function budgetTotals(m,year){const months={};const used=[];let excludedBefore=m.excluded.length;
 for(let i=1;i<=12;i++){const mm=year+'-'+String(i).padStart(2,'0');used.push(mm);const p=m.planMonth(mm);
  months[mm]={spend:Object.fromEntries(Object.entries(p.spend).map(([k,v])=>[k,round2(v)])),prog:Object.fromEntries(Object.entries(p.prog).filter(([k])=>k).map(([k,v])=>[k,Object.fromEntries(Object.entries(v).map(([c,x])=>[c,round2(x)]))])),cashIn:round2(p.cashBase),contingent:round2(p.cashCont),opIn:round2(p.opIn)};}
 return {totals:{v:2,year,currency:m.cur,months},rates:ratesUsed(m,used),missing:m.excluded.length>excludedBefore?m.excluded.slice(excludedBefore):[]};}

/* ---------- scenarios ---------- */
const changesFor=sid=>R.changes.rows.filter(c=>c.data.scenario_id===sid).map(c=>({id:c.id,...c.data}));
const scenarioList=R.scenarios.rows.map(r=>({id:r.id,version:r.version,...r.data,changes:changesFor(r.id),outdated:r.data.status!=='archived'&&String(r.data.based_on_version||'')!==FP}));
function describe(c){const n=Math.round(num(c.months,0)),p=num(c.pct,0),pName=progName(c.target_id);
 if(c.kind==='shift_program')return 'Shift '+pName+' by '+signed(n)+' months';
 if(c.kind==='scale_program')return 'Scale '+pName+' spend by '+signed(p)+'%';
 if(c.kind==='stop_program')return 'Stop '+pName+' from '+monthLabel(ym(c.from_month));
 if(c.kind==='add_position')return 'Add hire “'+String(c.label||'Planned hire')+'”'+(c.target_id?' in '+pName:'')+' from '+monthLabel(ym(c.from_month));
 if(c.kind==='remove_position'){const p=R.positions.rows.find(x=>x.id===c.target_id);return 'Remove '+(p?'“'+String(p.data.title||'position')+'”':'a position')+(ym(c.from_month)?' from '+monthLabel(ym(c.from_month)):'');}
 if(c.kind==='move_cash_in'){const l=R.lines.rows.find(x=>x.id===c.target_id);return 'Move '+(l?'“'+String(l.data.name)+'”':'a cash-in line')+' by '+signed(n)+' months';}
 if(c.kind==='resize_cash_in'){const l=R.lines.rows.find(x=>x.id===c.target_id);return 'Resize '+(l?'“'+String(l.data.name)+'”':'a cash-in line')+(num(c.amount)!==null?' to '+money(num(c.amount),l?l.data.currency:C2):' by '+signed(p)+'%');}
 if(c.kind==='fx_shift')return String(c.currency||'Currency')+' '+signed(p)+'% against '+C2;
 return 'Unknown change';}
function adoptionPlan(sc){
 const D=applyChanges(BASE,sc.changes),out=[],skipped=[];const fieldsOf={lines:['start_month','end_month','amount'],positions:['start_month','end_month'],milestones:['target_month']};
 for(const role of ['lines','positions','milestones']){const m=roleMap[role];for(const x of D[role]){if(x._new)continue;if(role==='milestones'&&x._source&&x._source!=='runway'&&x._source!=='link_unavailable'){if(x.target_month!==(BASE.milestones.find(o=>o.id===x.id)||{}).target_month)skipped.push('“'+String(x.name||'Milestone')+'” is owned by the Programs app; change its date there.');continue;}const orig=BASE[role].find(o=>o.id===x.id);if(!orig)continue;const data={};
  if(x._drop){if(!m.fields.archived)throw Error('Adopting this scenario needs the archived field on '+ROLE_LABEL[role]+'s.');data[m.fields.archived]=true;}
  for(const k of fieldsOf[role]){if(String(x[k]??'')!==String(orig[k]??'')){if(!m.fields[k])throw Error('Field '+k+' is not bound.');data[m.fields[k]]=x[k]===''?null:x[k];}}
  if(Object.keys(data).length)out.push({kind:'update_record',recordId:x.id,expectedVersion:orig.version,data});}}
 for(const x of D.positions.filter(p=>p._new))out.push({kind:'create_record',typeId:roleMap.positions.typeId,data:toReal('positions',{title:x.title,program_id:x.program_id||null,start_month:x.start_month,annual_salary:x.annual_salary,currency:x.currency,status:'planned',archived:false})});
 for(const c of sc.changes)if(c.kind==='fx_shift')skipped.push(describe(c)+' is an assumption about rates and is not written to the forecast.');
 const s=R.scenarios.rows.find(r=>r.id===sc.id);if(s)out.push({kind:'update_record',recordId:s.id,expectedVersion:s.version,data:{[roleMap.scenarios.fields.status]:'adopted'}});
 if(out.length>50)throw Error('This scenario changes more than 50 records. Ask the assistant to adopt it in smaller reviewed parts.');
 return {changes:out,skipped};}

/* ---------- writes ---------- */
function toReal(role,data){const m=roleMap[role];if(!m)throw Error('The '+ROLE_LABEL[role]+' table is not bound.');const out={};for(const [k,v] of Object.entries(data)){if(v===undefined)continue;if(!m.fields[k])continue;if(!m.writable.includes(k))throw Error('You cannot edit '+k+' in the '+ROLE_LABEL[role]+' table.');out[m.fields[k]]=v;}return out;}
function valuesFromForm(role,source,mode){
 const out={};const m=roleMap[role];
 for(const f of S[role]){
  if(f.kind==='frozen'||f.key==='archived')continue;
  if(!m||!m.fields[f.key]||!m.writable.includes(f.key))continue;
  if(!has(source,f.key)){if(mode==='create'&&f.required)throw Error('Required field: '+f.label);continue;}
  let v=source[f.key];if(typeof v==='string')v=v.trim();
  if(v===''||v===null){if(f.required)throw Error('Required field: '+f.label);out[f.key]=null;continue;}
  if(f.kind==='number'||f.kind==='money'){const n=Number(v);if(!Number.isFinite(n))throw Error('Enter a number for '+f.label+'.');if(f.kind==='money'&&n<0&&!(role==='changes'))throw Error(f.label+' cannot be negative; direction comes from the line type.');out[f.key]=n;}
  else if(f.kind==='month'){const mm=ym(v);if(!mm)throw Error('Use a valid month for '+f.label+' (YYYY-MM).');out[f.key]=firstOf(mm);}
  else if(f.kind==='date'){const d=validDate(v);if(!d)throw Error('Use a valid date for '+f.label+' (YYYY-MM-DD).');out[f.key]=d;}
  else if(f.kind==='select'){if(!f.options.includes(String(v)))throw Error('Choose a valid '+f.label+'.');out[f.key]=String(v);}
  else if(f.kind==='boolean')out[f.key]=bool(v);
  else if(f.kind==='ref'){const kept=st.editor&&st.editor.refs&&st.editor.refs[f.key]===String(v);const ok=kept||(R[f.ref].rows||[]).some(r=>r.id===v);if(!ok)throw Error('Choose an existing '+f.label+'.');out[f.key]=String(v);}
  else out[f.key]=String(v).slice(0,f.kind==='longtext'?4000:500);
 }
 if(role==='lines'||role==='positions'){const s=ym(out.start_month??source.start_month),e=ym(out.end_month??source.end_month);if(s&&e&&e<s)throw Error('The end month is before the start month.');if(role==='lines'&&(out.driver??source.driver)==='spread'&&!e)throw Error('A spread line needs an end month.');}
 if(role==='lines'&&(out.direction??source.direction)==='cash_in'&&!(out.cash_in_type??source.cash_in_type))throw Error('Choose a cash-in type: equity, grant, partnership and tax credit are financing; other is operating cash in.');
 if(role==='settings'){const t=out.trailing_window_months;if(t!==undefined&&t!==null&&![3,6].includes(t))throw Error('The trailing window must be 3 or 6 months.');}
 if(role==='rates'&&out.rate_per_eur!==undefined&&!(out.rate_per_eur>0))throw Error('The rate must be greater than zero.');
 if(mode==='create'&&m&&m.fields.archived&&m.writable.includes('archived'))out.archived=false;
 return out;}
function propose(changes,message){if(!changes.length)throw Error('There is nothing to save.');tools.call('records.propose',changes);note(message||'Prepared for TrialAgents review. Nothing changes until you approve it.');}
const lookup=(role,id)=>R[role].allRows.find(r=>r.id===id)||null;
function openEditor(role,mode,id,preset){
 st.menu=null;st.confirm=null;st.detail=null;let draft={...(preset||{})},version=null;
 if(mode!=='create'){const r=lookup(role,id);if(!r)throw Error('That record is no longer available.');draft={...r.data};version=r.version;if(mode==='duplicate'){if(draft.name!==undefined)draft.name='Copy of '+String(draft.name||'');if(draft.title!==undefined)draft.title='Copy of '+String(draft.title||'');}}
 for(const f of S[role])if(f.kind==='frozen')delete draft[f.key];
 // Existing references stay valid even when the referenced record is archived or not readable here.
 const refs={};for(const f of S[role])if(f.kind==='ref'&&draft[f.key])refs[f.key]=String(draft[f.key]);
 st.editor={role,mode,id:mode==='edit'?id:null,version:mode==='edit'?version:null,draft,initial:JSON.stringify(draft),refs};
}

/* ---------- events ---------- */
try{
 if(action.startsWith('nav:')){const id=action.slice(4);if(SCREENS.some(s=>s.id===id)){st.section=id;st.page=0;st.query='';st.filters={};st.filtersOpen=false;st.menu=null;st.editor=null;st.confirm=null;st.detail=null;st.closeDraft=null;st.drill=null;st.exportOpen=false;note('');}}
 else if(action==='clear-notice')note('');
 else if(action==='query'&&event.kind==='change'){st.query=String(event.value||'').slice(0,100);st.page=0;}
 else if(action==='toggle-filters')st.filtersOpen=!st.filtersOpen;
 else if(action.startsWith('filter:')&&event.kind==='change'){st.filters[action.slice(7)]=String(event.value||'');st.page=0;}
 else if(action==='clear-filters'){st.filters={};st.page=0;}
 else if(action==='next-page')st.page++;else if(action==='prev-page')st.page=Math.max(0,st.page-1);
 else if(action.startsWith('plan-tab:')){st.planTab=action.slice(9);st.page=0;st.query='';st.filters={};}
 else if(action.startsWith('menu:'))st.menu=st.menu===action.slice(5)?null:action.slice(5);
 else if(action.startsWith('details:')){const [role,id]=action.slice(8).split(':');st.detail={role,id};st.menu=null;}
 else if(action==='close-details')st.detail=null;
 else if(action.startsWith('add:'))openEditor(action.slice(4),'create',null,action.slice(4)==='lines'?{direction:'spend',driver:'monthly',status:'committed',currency:C2}:action.slice(4)==='positions'?{status:'planned',currency:C2}:action.slice(4)==='rates'?{source:'manual'}:action.slice(4)==='actuals'?{direction:'spend',currency:C2}:{});
 else if(action.startsWith('edit:')){const [role,id]=action.slice(5).split(':');openEditor(role,'edit',id);}
 else if(action.startsWith('duplicate:')){const [role,id]=action.slice(10).split(':');openEditor(role,'duplicate',id);}
 else if(action==='edit-settings'){if(settingsRow)openEditor('settings','edit',settingsRow.id);else openEditor('settings','create',null,{reporting_currency:'EUR',runway_target_months:18,trailing_window_months:3,loaded_cost_pct:0,min_cash_reserve:0,categories:CATEGORIES.join(', '),enabled_currencies:'EUR, USD'});}
 else if(action.startsWith('draft:')&&st.editor){st.editor.draft={...st.editor.draft,...form};}
 else if(action==='cancel-modal'){st.editor=null;st.confirm=null;st.closeDraft=null;st.adopt=null;st.lock=null;}
 else if(action==='save-record'&&event.kind==='submit'){
  if(!st.editor)throw Error('Nothing to save.');const {role,mode,id}=st.editor;if(!canWrite(role))throw Error('You cannot change the '+ROLE_LABEL[role]+' table.');
  st.editor.draft={...st.editor.draft,...form};
  if(role==='closes'){const r=lookup('closes',id);if(!r)throw Error('That close is no longer available; reopen it.');const v=String(form.commentary||'').slice(0,4000);propose([{kind:'update_record',recordId:r.id,expectedVersion:st.editor.version,data:toReal('closes',{commentary:v})}],'Commentary prepared for review. The frozen snapshot is not changed.');st.editor=null;}
  else{const data=valuesFromForm(role,form,mode==='edit'?'update':'create');
   if(mode==='edit'){const r=lookup(role,id);if(!r)throw Error('This record changed or was removed; reopen it.');propose([{kind:'update_record',recordId:id,expectedVersion:st.editor.version,data:toReal(role,data)}],'Change prepared for review. Nothing changes until you approve it.');}
   else propose([{kind:'create_record',typeId:roleMap[role].typeId,data:toReal(role,data)}],'New '+ROLE_LABEL[role]+' prepared for review.');
   st.editor=null;}
 }
 else if(action.startsWith('archive:')){const [role,id]=action.slice(8).split(':');const r=lookup(role,id);if(!r)throw Error('That record is no longer available.');st.confirm={kind:'archive',role,id,version:r.version};st.menu=null;}
 else if(action==='confirm-archive'){const c=st.confirm;if(!c||c.kind!=='archive')throw Error('Nothing to archive.');const m=roleMap[c.role];if(!canWrite(c.role)||!m.fields.archived||!m.writable.includes('archived'))throw Error('Archiving needs an editable archived field.');
  propose([{kind:'update_record',recordId:c.id,expectedVersion:c.version,data:{[m.fields.archived]:true}}],'Archive prepared for review. The record and its history are kept.');st.confirm=null;}
 /* payment schedule helper: several one_off lines sharing a schedule group */
 else if(action==='add-schedule'){st.schedule={name:'',group:'',category:'Clinical',currency:C2,status:'committed',program_id:'',rows:[{},{},{}]};st.menu=null;}
 else if(action==='schedule-draft'&&st.schedule){st.schedule={...st.schedule,...pick(form,['name','group','category','currency','status','program_id'])};st.schedule.rows=st.schedule.rows.map((r,i)=>({month:form['month_'+i]??r.month,amount:form['amount_'+i]??r.amount}));}
 else if(action==='schedule-row'&&st.schedule&&st.schedule.rows.length<12)st.schedule.rows.push({});
 else if(action==='schedule-cancel')st.schedule=null;
 else if(action==='schedule-save'&&event.kind==='submit'){const s=st.schedule;if(!s)throw Error('No schedule draft.');st.schedule={...s,...pick(form,['name','group','category','currency','status','program_id'])};st.schedule.rows=s.rows.map((r,i)=>({month:form['month_'+i]??r.month,amount:form['amount_'+i]??r.amount}));
  const d=st.schedule,group=String(d.group||d.name||'').trim();if(!String(d.name||'').trim())throw Error('Name the payment schedule.');if(!canWrite('lines'))throw Error('You cannot add plan lines.');
  const rows=d.rows.filter(r=>String(r.month||'')!==''||String(r.amount||'')!=='');if(!rows.length)throw Error('Add at least one instalment.');
  const changes=rows.map((r,i)=>({kind:'create_record',typeId:roleMap.lines.typeId,data:toReal('lines',valuesFromForm('lines',{name:String(d.name).trim()+' · instalment '+(i+1),direction:'spend',category:d.category,program_id:d.program_id||'',schedule_group:group,driver:'one_off',amount:r.amount,currency:d.currency,start_month:r.month,status:d.status},'create'))}));
  propose(changes,'Payment schedule with '+plural(changes.length,'instalment')+' prepared for review.');st.schedule=null;}
 /* budget lock */
 else if(action==='lock-year'&&event.kind==='change')st.lockYear=String(event.value||'');
 else if(action==='lock-budget'){if(!exact)throw Error('Fix the data checks above before locking a budget.');const y=String(form.year||event.value||'');if(!/^\d{4}$/.test(y))throw Error('Choose a year.');if(budgetsAll.some(b=>String(num(b.row.data.year,0))===y&&b.row.data.currency===C2))throw Error('A budget for '+y+' is already locked and cannot be edited.');st.lock={year:y};}
 else if(action==='confirm-lock'){if(!st.lock)throw Error('Choose a year to lock.');if(!canWrite('budgets'))throw Error('You cannot create budgets.');const y=st.lock.year,b=budgetTotals(model,y);if(b.missing.length)throw Error(excludedText(b.missing)+' Add the rates before locking.');
  propose([{kind:'create_record',typeId:roleMap.budgets.typeId,data:toReal('budgets',{name:'Budget '+y,year:Number(y),locked_on:firstOf(model.A),currency:C2,totals:JSON.stringify(b.totals),rates_used:JSON.stringify(b.rates),notes:'Locked from the live forecast as of '+monthLabel(model.A)+'.'})}],'Budget '+y+' prepared for review. Once saved it is frozen.');st.lock=null;}
 /* monthly close */
 else if(action==='open-close'){if(!exact)throw Error('Fix the data checks before closing a month.');const m=ym(event.value)||addMonths(model.A,1);st.closeDraft={month:m,currency:C2};st.menu=null;}
 else if(action==='close-draft'&&st.closeDraft){st.closeDraft={...st.closeDraft,...form};}
 else if(action==='close-submit'&&event.kind==='submit'){const d={...(st.closeDraft||{}),...form};st.closeDraft=d;const m=ym(d.month);
  if(!m||m<=model.A)throw Error('Choose a month after '+monthLabel(model.A)+'.');if(m!==addMonths(model.A,1))throw Error('Close months in order: the next month to close is '+monthLabel(addMonths(model.A,1))+'.');
  if(!canWrite('closes')||!canWrite('actuals'))throw Error('You cannot close months.');
  const bal=num(d.closing_balance);if(bal===null)throw Error('Enter the closing bank balance.');const cur=CURRENCIES.includes(d.currency)?d.currency:C2;
  const newActuals=[],existing=BASE.actuals.filter(a=>ym(a.month)===m);
  for(const cat of enabledCats){const v=d['actual_'+cat];if(v===undefined||String(v).trim()==='')continue;if(existing.some(a=>a.direction==='spend'&&a.category===cat))continue;const n=Number(v);if(!Number.isFinite(n)||n<0)throw Error('Enter a non-negative amount for '+cat+'.');newActuals.push({month:firstOf(m),category:cat,direction:'spend',amount:n,currency:cur});}
  if(String(d.cash_in_amount||'').trim()!==''){const n=Number(d.cash_in_amount);if(!Number.isFinite(n)||n<0)throw Error('Enter a non-negative cash-in amount.');const t=CASH_IN_TYPES.includes(d.cash_in_type)?d.cash_in_type:'';if(!t)throw Error('Choose the cash-in type.');newActuals.push({month:firstOf(m),category:'Other',direction:'cash_in',amount:n,currency:cur,cash_in_type:t});}
  if(!existing.length&&!newActuals.length)throw Error('Enter at least one actual for '+monthLabel(m)+'.');
  const D=dataset({actuals:BASE.actuals.concat(newActuals.map((a,i)=>({id:'new-'+i,...a}))),closes:BASE.closes.concat([{id:'new-close',month:firstOf(m),closing_balance:bal,currency:cur,closed:true}])});
  const after=engine(D);if(!after.ready)throw Error('The close cannot be calculated: '+after.blocks.join(' '));if(after.excluded.some(x=>x.month===m))throw Error(excludedText(after.excluded.filter(x=>x.month===m))+' Add the rate before closing.');
  const b=budgetFor(m),metrics=snapshotMetrics(after,b),status=!after.runway.beyond&&after.runway.months<target?'below_target':'ok';
  const changes=newActuals.map(a=>({kind:'create_record',typeId:roleMap.actuals.typeId,data:toReal('actuals',a)}));
  changes.push({kind:'create_record',typeId:roleMap.closes.typeId,data:toReal('closes',{month:firstOf(m),closing_balance:bal,currency:cur,closed:true,commentary:String(d.commentary||'').slice(0,4000)||null,runway_months:after.runway.months,cash_out_month:after.runway.beyond?null:firstOf(after.runway.cashOut),runway_status:status,metrics:JSON.stringify(metrics),rates_used:JSON.stringify(ratesUsed(after,[m].concat(after.months.slice(0,1).map(x=>x.m)))),closed_at:lastDay(m)})});
  propose(changes,'Close of '+monthLabel(m)+' prepared for review: '+plural(newActuals.length,'actual')+' and one frozen snapshot.');st.closeDraft=null;st.varMonth=m;}
 else if(action==='var-month'&&event.kind==='change')st.varMonth=ym(event.value);
 else if(action.startsWith('snapshot:'))st.snapshot=action.slice(9);
 else if(action==='close-snapshot')st.snapshot=null;
 else if(action.startsWith('commentary:')){openEditor('closes','edit',action.slice(11));}
 /* cash flow */
 else if(action==='cf-source'&&event.kind==='change'){st.cf.source=String(event.value||'forecast');st.cf.page=0;st.drill=null;}
 else if(action==='cf-contingent'&&event.kind==='change'){st.cf.contingent=bool(event.value);}
 else if(action==='cf-programs')st.cf.programs=!st.cf.programs;
 else if(action==='cf-next')st.cf.page=(st.cf.page||0)+1;else if(action==='cf-prev')st.cf.page=Math.max(0,(st.cf.page||0)-1);
 else if(action.startsWith('drill:'))st.drill=st.drill===action.slice(6)?null:action.slice(6);
 else if(action==='close-drill')st.drill=null;
 else if(action==='toggle-export')st.exportOpen=!st.exportOpen;
 /* scenarios */
 else if(action==='preview-new'){st.preview={name:'What-if '+(scenarioList.length+1),changes:[]};st.changeDraft={kind:'shift_program'};}
 else if(action==='preview-name'&&st.preview){st.preview.name=String(form.preview_name||event.value||'').slice(0,100);}
 else if(action==='change-draft'){st.changeDraft={...(st.changeDraft||{}),...pick(form,['kind','target_id','months','pct','amount','currency','from_month','label'])};}
 else if(action==='change-add'){const d={...(st.changeDraft||{}),...pick(form,['kind','target_id','months','pct','amount','currency','from_month','label'])};st.changeDraft=d;const c=normalizeChange(d);if(!st.preview)st.preview={name:'What-if '+(scenarioList.length+1),changes:[]};if(st.preview.changes.length>=12)throw Error('A scenario can hold 12 changes.');st.preview.changes.push(c);st.changeDraft={kind:d.kind};note('Preview updated. Nothing is stored until you save the scenario.');}
 else if(action.startsWith('change-remove:')&&st.preview){st.preview.changes.splice(Number(action.slice(14)),1);}
 else if(action==='preview-discard'){st.preview=null;st.changeDraft=null;st.compare=st.compare.filter(x=>x!=='preview');}
 else if(action.startsWith('preview-from:')){const sc=scenarioList.find(s=>s.id===action.slice(13));if(!sc)throw Error('Scenario not found.');st.preview={name:'Copy of '+sc.name,changes:sc.changes.map(c=>pick(c,['kind','target_id','months','pct','amount','currency','from_month','label']))};st.changeDraft={kind:'shift_program'};}
 else if(action==='preview-save'){if(!st.preview||!st.preview.changes.length)throw Error('Add at least one change before saving.');if(!canWrite('scenarios')||!canWrite('changes'))throw Error('You cannot save scenarios.');const name=String(form.preview_name||st.preview.name||'').trim()||'What-if';st.preview.name=name;
  if(scenarioList.some(s=>s.name===name&&s.status!=='archived'))throw Error('A scenario named “'+name+'” already exists. Choose another name.');
  propose([{kind:'create_record',typeId:roleMap.scenarios.typeId,data:toReal('scenarios',{name,status:'saved',based_on_close:firstOf(model.A),based_on_version:FP,created_on:firstOf(model.A),summary:st.preview.changes.map(describe).join('; ').slice(0,4000)})}],'Step 1 of 2: scenario “'+name+'” prepared for review. After approval, save its changes in step 2.');st.pendingScenario=name;}
 else if(action.startsWith('save-changes:')){const sc=scenarioList.find(s=>s.id===action.slice(13));if(!sc)throw Error('Scenario not found.');if(!st.preview||!st.preview.changes.length)throw Error('There are no preview changes to save.');if(sc.changes.length)throw Error('This scenario already has saved changes.');
  propose(st.preview.changes.map(c=>({kind:'create_record',typeId:roleMap.changes.typeId,data:toReal('changes',{...c,scenario_id:sc.id})})),'Step 2 of 2: '+plural(st.preview.changes.length,'change')+' for “'+sc.name+'” prepared for review.');st.pendingScenario=null;}
 else if(action.startsWith('compare:')&&event.kind==='change'){const id=action.slice(8),on=bool(event.value);st.compare=st.compare.filter(x=>x!==id);if(on){if(st.compare.length>=4)throw Error('Compare up to four at a time.');st.compare.push(id);}}
 else if(action.startsWith('adopt:')){const sc=scenarioList.find(s=>s.id===action.slice(6));if(!sc)throw Error('Scenario not found.');if(sc.status!=='saved')throw Error('Only saved scenarios can be adopted.');if(sc.outdated)throw Error('The forecast changed after this scenario was saved. Copy it to a new preview and save it again before adopting.');if(!sc.changes.length)throw Error('This scenario has no saved changes.');
  const plan=adoptionPlan(sc);st.adopt={id:sc.id,changes:plan.changes,skipped:plan.skipped};}
 else if(action==='confirm-adopt'){if(!st.adopt)throw Error('Nothing to adopt.');if(!canWrite('lines')||!canWrite('scenarios'))throw Error('You cannot adopt scenarios.');propose(st.adopt.changes,'Adoption prepared for review: '+plural(st.adopt.changes.length,'record change')+'. Changes made since you opened it are rejected, not overwritten.');st.adopt=null;}
 else if(action.startsWith('scenario-archive:')){const sc=R.scenarios.rows.find(s=>s.id===action.slice(17));if(!sc)throw Error('Scenario not found.');st.confirm={kind:'scenario-archive',id:sc.id,version:sc.version};}
 else if(action==='confirm-scenario-archive'){const c=st.confirm;if(!c)throw Error('Nothing selected.');propose([{kind:'update_record',recordId:c.id,expectedVersion:c.version,data:toReal('scenarios',{status:'archived'})}],'Scenario archive prepared for review.');st.confirm=null;}
 else if(action==='toggle-archived-scenarios')st.showArchived=!st.showArchived;
}catch(e){note('Action not completed: '+String(e&&e.message||e).slice(0,300));}
function pick(o,keys){const r={};for(const k of keys)if(has(o,k))r[k]=o[k];return r;}
function normalizeChange(d){
 const kind=String(d.kind||'');if(!CHANGE_KINDS.includes(kind))throw Error('Choose a change type.');const c={kind};
 const needTarget=['shift_program','scale_program','stop_program','remove_position','move_cash_in','resize_cash_in'];
 if(needTarget.includes(kind)){if(!d.target_id)throw Error('Choose what the change applies to.');c.target_id=String(d.target_id);}
 if(kind==='add_position'&&d.target_id)c.target_id=String(d.target_id);
 if(['shift_program','move_cash_in'].includes(kind)){const n=Math.round(Number(d.months));if(!Number.isFinite(n)||n===0||Math.abs(n)>36)throw Error('Enter a shift between −36 and 36 months.');c.months=n;}
 if(['scale_program','fx_shift'].includes(kind)){const p=Number(d.pct);if(!Number.isFinite(p)||p<-100||p>500||p===0)throw Error('Enter a percentage between −100 and 500.');c.pct=p;}
 if(kind==='resize_cash_in'){const a=Number(d.amount);if(String(d.amount??'').trim()===''||!Number.isFinite(a)||a<0)throw Error('Enter the new amount.');c.amount=a;}
 if(['stop_program','add_position'].includes(kind)||(kind==='remove_position'&&String(d.from_month||'')!=='')){const m=ym(d.from_month);if(!m)throw Error('Choose a month.');c.from_month=firstOf(m);}
 if(kind==='add_position'){const a=Number(d.amount);if(String(d.amount??'').trim()===''||!Number.isFinite(a)||a<0)throw Error('Enter the annual salary.');c.amount=a;c.currency=CURRENCIES.includes(d.currency)?d.currency:C2;c.label=String(d.label||'Planned hire').slice(0,100);}
 if(kind==='fx_shift'){if(!CURRENCIES.includes(d.currency)||d.currency===C2)throw Error('Choose a currency other than '+C2+'.');c.currency=d.currency;}
 return c;}

/* ---------- presentation helpers ---------- */
const glyph={overview:'<path d="M3 3v18h18"/><path d="m7 14 4-5 4 3 5-7"/>',cash_flow:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16M15 4v16"/>',plan:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',people:'<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.8.4 5 2.8 5 5.8"/>',scenarios:'<path d="M4 21V4m0 8h16m-4-7 4 7-4 7"/>',actuals:'<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M4.9 4.9 7 7m10 10 2.1 2.1M2 12h3m14 0h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',plus:'<path d="M12 4v16M4 12h16"/>',close:'<path d="M5 5l14 14M19 5 5 19"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>'};
const icon=(n,s=18)=>'<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(glyph[n]||glyph.overview)+'</svg>';
const btn=(label,a,cls,disabled,extra)=>'<button type="button" class="'+(cls===undefined?'rw-btn':cls)+'" data-action="'+esc(a)+'"'+(disabled?' disabled':'')+(extra?' '+extra:'')+'>'+label+'</button>';
const pill=(label,type)=>'<span class="rw-pill '+esc(type||'')+'">'+esc(label)+'</span>';
const cushionTone=c=>!c?'':c.beyond||c.months>=6?'green':c.months>=3?'amber':'red';
const cushionText=c=>!c?'—':c.beyond?'≥ '+plural(c.months,'month'):plural(c.months,'month');
const runwayText=r=>!r?'—':r.beyond?'> '+r.months+' months':plural(r.months,'month');
const current=SCREENS.find(s=>s.id===st.section)||SCREENS[0];
function heading(sub){return '<header class="rw-top"><div><div class="rw-eyebrow">Runway / '+esc(current.label)+'</div><h1 class="rw-title">'+esc(st.layout.heading)+'</h1><p class="rw-subtitle">'+esc(sub||DESC[current.id])+'</p></div><div class="rw-top-right">'+pill((C2||'No currency')+' · as of '+(model.A?monthLabel(model.A):'—'),'blue')+btn(icon('gear',18),'tracker:layout','rw-icon-btn',!inp.saved,'aria-label="App layout settings" title="Layout settings"')+'</div></header>';}
function checks(){const block=readProblems.concat(model.blocks);if(salaryBlock)block.push('Salaries are restricted for you, so live people cost and live runway are not shown. Approved snapshots are shown instead.');
 const warn=model.warns.slice();const ex=excludedText(model.excluded);if(ex)warn.unshift(ex);if(programsTableNote())warn.push(programsTableNote());
 if(!block.length&&!warn.length)return '<div class="rw-banner ok" role="status">Data checks passed: complete reads, valid dates and rates for every included row.</div>';
 return (block.length?'<div class="rw-banner bad" role="alert"><strong>No exact runway claim.</strong> '+block.map(esc).join(' ')+'</div>':'')+(warn.length?'<details class="rw-banner warn"><summary>'+plural(warn.length,'data check')+' to review</summary><ul>'+warn.slice(0,20).map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul></details>':'');}
function tableFallback(caption,head,rows){return '<details class="rw-fallback"><summary>Show data table</summary><div class="rw-scroll" role="region" aria-label="'+esc(caption)+'" tabindex="0"><table class="rw-table compact"><caption>'+esc(caption)+'</caption><thead><tr>'+head.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map((c,i)=>i?'<td class="num">'+esc(c)+'</td>':'<th scope="row">'+esc(c)+'</th>').join('')+'</tr>').join('')+'</tbody></table></div></details>';}

/* ---------- charts ---------- */
function cashChart(series,opts){
 opts=opts||{};const hist=(opts.history||[]).slice(-6);const first=hist.length?hist[0].m:(series[0]&&series[0].points[0]?series[0].points[0].m:'');if(!first)return '<div class="rw-empty"><strong>No cash curve yet</strong><p>Enter the opening balance, reporting currency and plan lines.</p></div>';
 const last=addMonths(model.A||first,CHART_MONTHS),xs=[];for(let m=first;m<=last;m=addMonths(m,1))xs.push(m);
 const vals=[];for(const h of hist)vals.push(h.cash);for(const s of series)for(const p of s.points)if(p.m<=last&&Number.isFinite(p.cash))vals.push(p.cash);if(reserve)vals.push(reserve);if(!vals.length)return '<div class="rw-empty"><strong>No values to plot</strong></div>';
 let lo=Math.min(0,...vals),hi=Math.max(1,...vals);const step=Math.pow(10,Math.floor(Math.log10(Math.max(1,hi-lo))));lo=Math.floor(lo/step)*step;hi=Math.ceil(hi/step)*step;if(hi===lo)hi=lo+step;
 const w=900,h=300,l=70,r=24,t=18,b=46;const xx=m=>l+(xs.indexOf(m)/Math.max(1,xs.length-1))*(w-l-r),yy=v=>t+(hi-v)/(hi-lo)*(h-t-b);
 let out='';for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4;out+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+yy(v).toFixed(1)+'" y2="'+yy(v).toFixed(1)+'" stroke="#E3E9EF"/><text x="'+(l-8)+'" y="'+(yy(v)+4).toFixed(1)+'" text-anchor="end" fill="#5B6B7C" font-size="11">'+esc(compact(v))+'</text>';}
 if(lo<0)out+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+yy(0).toFixed(1)+'" y2="'+yy(0).toFixed(1)+'" stroke="#9AA7B4"/>';
 if(reserve)out+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+yy(reserve).toFixed(1)+'" y2="'+yy(reserve).toFixed(1)+'" stroke="#B3541E" stroke-dasharray="3 4"/><text x="'+(w-r-4)+'" y="'+(yy(reserve)-6).toFixed(1)+'" text-anchor="end" fill="#8F4318" font-size="11">Reserve '+esc(compact(reserve))+'</text>';
 if(model.A&&xs.includes(model.A))out+='<line x1="'+xx(model.A).toFixed(1)+'" x2="'+xx(model.A).toFixed(1)+'" y1="'+t+'" y2="'+(h-b)+'" stroke="#9AA7B4" stroke-dasharray="2 4"/><text x="'+(xx(model.A)+4).toFixed(1)+'" y="'+(t+10)+'" fill="#5B6B7C" font-size="10">As of</text>';
 const poly=(pts,color,width,dash)=>{const segs=[];let cur=[];for(const p of pts){if(!xs.includes(p.m)||!Number.isFinite(p.cash)){if(cur.length>1)segs.push(cur);cur=[];continue;}cur.push(xx(p.m).toFixed(1)+','+yy(p.cash).toFixed(1));}if(cur.length>1)segs.push(cur);return segs.map(s=>'<polyline points="'+s.join(' ')+'" fill="none" stroke="'+color+'" stroke-width="'+width+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+' stroke-linejoin="round" stroke-linecap="round"/>').join('');};
 if(hist.length>1)out+=poly(hist,'#0F3A61',3.2,'');
 for(const s of series){const pts=(hist.length&&s.anchor!==false?[hist[hist.length-1]]:[]).concat(s.points);out+=poly(pts,s.color,2.4,s.dash||'6 5');}
 for(const ms of (opts.milestones||[])){if(!xs.includes(ms.m))continue;const p=(series[0]?series[0].points:[]).find(x=>x.m===ms.m);if(!p||!Number.isFinite(p.cash))continue;const tone=cushionTone(ms.cushion),col=tone==='green'?'#1E7A4F':tone==='amber'?'#A86A12':'#B42335';out+='<circle cx="'+xx(ms.m).toFixed(1)+'" cy="'+yy(p.cash).toFixed(1)+'" r="6" fill="'+col+'" stroke="#fff" stroke-width="2"><title>'+esc(ms.name+' · '+monthLabel(ms.m)+' · cushion '+cushionText(ms.cushion))+'</title></circle>';}
 const every=Math.max(1,Math.ceil(xs.length/9));xs.forEach((m,i)=>{if(i%every===0||i===xs.length-1)out+='<text x="'+xx(m).toFixed(1)+'" y="'+(h-18)+'" text-anchor="middle" fill="#5B6B7C" font-size="11">'+esc(shortMonth(m))+'</text>';});
 out+='<text x="8" y="12" fill="#5B6B7C" font-size="11">'+esc(C2)+'</text>';
 return '<svg class="rw-chart" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+esc(opts.label||'Closing cash by month in '+C2+'. Actual cash is solid; forecasts are dotted.')+'">'+out+'</svg>';
}
function burnChart(cols){
 if(!cols.length)return '<div class="rw-empty"><strong>No burn to show</strong><p>Close a month or add plan lines.</p></div>';
 const cats=enabledCats.filter(c=>cols.some(x=>x.spend[c]));const tot=cols.map(x=>cats.reduce((n,c)=>n+(x.spend[c]||0),0)-(x.opIn||0));
 const hi=Math.max(1,...cols.map(x=>cats.reduce((n,c)=>n+(x.spend[c]||0),0)));const step=Math.pow(10,Math.floor(Math.log10(hi)));const top=Math.ceil(hi/step)*step;
 const w=900,h=260,l=70,r=16,t=16,b=44,bw=(w-l-r)/cols.length;const yy=v=>t+(top-v)/top*(h-t-b);let out='';
 for(let i=0;i<=4;i++){const v=top*i/4;out+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+yy(v).toFixed(1)+'" y2="'+yy(v).toFixed(1)+'" stroke="#E3E9EF"/><text x="'+(l-8)+'" y="'+(yy(v)+4).toFixed(1)+'" text-anchor="end" fill="#5B6B7C" font-size="11">'+esc(compact(v))+'</text>';}
 cols.forEach((x,i)=>{let y=0;const x0=l+i*bw+bw*0.18,ww=bw*0.64;for(const c of cats){const v=x.spend[c]||0;if(!v)continue;const y1=yy(y+v),y0=yy(y);out+='<rect x="'+x0.toFixed(1)+'" y="'+y1.toFixed(1)+'" width="'+ww.toFixed(1)+'" height="'+Math.max(0,y0-y1).toFixed(1)+'" fill="'+CAT_COLORS[CATEGORIES.indexOf(c)]+'"'+(x.forecast?' opacity="0.55"':'')+'><title>'+esc(c+' · '+monthLabel(x.m)+' · '+money(v)+(x.forecast?' (forecast)':' (actual)'))+'</title></rect>';y+=v;}
  if(x.forecast)out+='<rect x="'+x0.toFixed(1)+'" y="'+yy(y).toFixed(1)+'" width="'+ww.toFixed(1)+'" height="'+Math.max(0,yy(0)-yy(y)).toFixed(1)+'" fill="none" stroke="#5B6B7C" stroke-dasharray="3 3"/>';
  if(i%Math.max(1,Math.ceil(cols.length/9))===0)out+='<text x="'+(x0+ww/2).toFixed(1)+'" y="'+(h-18)+'" text-anchor="middle" fill="#5B6B7C" font-size="11">'+esc(shortMonth(x.m))+'</text>';});
 const split=cols.findIndex(x=>x.forecast);if(split>0)out+='<line x1="'+(l+split*bw).toFixed(1)+'" x2="'+(l+split*bw).toFixed(1)+'" y1="'+t+'" y2="'+(h-b)+'" stroke="#9AA7B4" stroke-dasharray="2 4"/><text x="'+(l+split*bw+4).toFixed(1)+'" y="'+(t+10)+'" fill="#5B6B7C" font-size="10">Forecast</text>';
 const legend='<div class="rw-legend">'+cats.map(c=>'<span><i style="background:'+CAT_COLORS[CATEGORIES.indexOf(c)]+'"></i>'+esc(c)+'</span>').join('')+'<span><i class="dash"></i>Forecast (lighter, dashed outline)</span></div>';
 return '<svg class="rw-chart" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Monthly spend by category in '+esc(C2)+': actual months solid, forecast months lighter with a dashed outline.">'+out+'</svg>'+legend+tableFallback('Monthly spend by category ('+C2+')',['Month','Type'].concat(cats).concat(['Net burn']),cols.map((x,i)=>[monthLabel(x.m),x.forecast?'Forecast':'Actual'].concat(cats.map(c=>grouped(Math.round(x.spend[c]||0)))).concat([grouped(Math.round(tot[i]))])));
}

/* ---------- screens ---------- */
function kpi(title,value,foot,tone){return '<div class="rw-kpi '+(tone||'')+'"><div class="rw-kpi-label">'+esc(title)+'</div><div class="rw-kpi-value">'+esc(value)+'</div><div class="rw-kpi-foot">'+esc(foot||'')+'</div></div>';}
function sentence(m){
 if(!m.runway)return '';const r=m.runway;
 if(r.beyond)return 'Cash lasts beyond '+monthLabel(r.lastsUntil)+', the end of the '+HORIZON+'-month forecast.';
 const reached=m.milestones.filter(x=>!x.passed&&x.m<=r.lastsUntil),next=m.milestones.find(x=>!x.passed&&x.m>r.lastsUntil);
 if(reached.length){const x=reached[reached.length-1],gap=diffMonths(x.m,r.lastsUntil);return 'Cash lasts until '+monthLabel(r.lastsUntil)+(gap?', '+plural(gap,'month')+' after '+x.name+'.':', the month of '+x.name+'.');}
 if(next)return 'Cash lasts until '+monthLabel(r.lastsUntil)+', '+plural(diffMonths(r.lastsUntil,next.m),'month')+' before '+next.name+'.';
 return 'Cash lasts until '+monthLabel(r.lastsUntil)+'.';}
function snapshotHero(){if(!latestSnap)return '<div class="rw-hero"><div class="rw-hero-over">Runway</div><div class="rw-hero-sentence">Live runway is not available to you, and no approved snapshot exists yet.</div></div>';const s=latestSnap.m;
 return '<div class="rw-hero"><div class="rw-hero-over">Approved snapshot · '+esc(monthLabel(s.asOf))+'</div><div class="rw-hero-sentence">'+esc(s.runway.beyond?'Cash lasted beyond the forecast horizon at the '+monthLabel(s.asOf)+' close.':'At the '+monthLabel(s.asOf)+' close, cash lasted until '+monthLabel(s.runway.lastsUntil)+' ('+plural(s.runway.months,'month')+').')+'</div><div class="rw-hero-foot"><span>Live people cost: <strong>restricted</strong></span><span>Cash-out <strong>'+esc(s.runway.cashOut?monthLabel(s.runway.cashOut):'beyond horizon')+'</strong></span><span>Start raise <strong>'+esc(s.runway.startRaise?monthLabel(s.runway.startRaise):'—')+'</strong></span></div></div>';}
function overview(){
 let body=heading()+checks();
 if(!exact&&salaryBlock){body+=snapshotHero()+snapshotsPanel(true);return body;}
 if(!model.ready){return body+'<section class="rw-panel rw-pad"><div class="rw-empty"><strong>Set up your first runway</strong><p>Enter the bank balance and date and the reporting currency in Settings, then add a few spend lines and one financing event in Plan.</p>'+btn('Open Settings','nav:settings','rw-btn rw-btn-primary')+'</div></section>';}
 const r=model.runway,rc=model.runwayC;
 body+='<div class="rw-hero"><div class="rw-hero-over">Runway · as of '+esc(monthLabel(model.A))+(exact?'':' · provisional')+'</div><div class="rw-hero-sentence">'+esc(sentence(model))+'</div><div class="rw-hero-foot"><span>Cash now <strong>'+esc(money(model.start))+'</strong></span><span>With contingent cash <strong>'+esc(runwayText(rc))+'</strong></span><span>Trailing runway <strong>'+esc(model.trailing&&model.trailing.months!==null?grouped(model.trailing.months,1)+' months':'needs '+trailingN+' closed months')+'</strong></span></div></div>';
 body+='<div class="rw-kpis">'+kpi('Runway',runwayText(r),'Target '+target+' months · committed and received cash only',!r.beyond&&r.months<target?'bad':'')+kpi('Cash-out month',r.beyond?'Beyond '+monthLabel(r.lastsUntil):monthLabel(r.cashOut),'First month forecast cash falls below zero')+kpi('Start raising by',r.beyond?'—':monthLabel(r.startRaise),'First month with less than '+target+' months of runway left')+'</div>';
 const base={label:'Forecast',color:'#175B94',points:model.months.map(x=>({m:x.m,cash:x.close}))},cont={label:'With contingent cash',color:'#2E8B9A',dash:'2 5',points:model.months.map(x=>({m:x.m,cash:x.closeCont}))};
 body+='<section class="rw-panel rw-pad"><div class="rw-panel-head"><div><h2>Cash curve</h2><p>Closing cash by month · '+esc(C2)+' · as of '+esc(monthLabel(model.A))+' · next '+CHART_MONTHS+' months</p></div></div>'+cashChart([base,cont],{history:model.history,milestones:model.milestones.filter(x=>!x.passed)})+'<div class="rw-legend"><span><i class="solid"></i>Actual cash</span><span><i class="dot"></i>Forecast (dotted)</span><span><i class="dot teal"></i>Including contingent cash</span>'+(reserve?'<span><i class="reserve"></i>Minimum reserve</span>':'')+'<span><i class="ms green"></i>Cushion ≥ 6 months</span><span><i class="ms amber"></i>3–6</span><span><i class="ms red"></i>&lt; 3</span></div>'+tableFallback('Closing cash ('+C2+')',['Month','Forecast','With contingent'],model.history.slice(-6).map(hh=>[monthLabel(hh.m)+' (actual)',grouped(Math.round(hh.cash)),'']).concat(model.months.slice(0,CHART_MONTHS).map(x=>[monthLabel(x.m),grouped(Math.round(x.close)),grouped(Math.round(x.closeCont))])))+'</section>';
 const past=model.history.filter(x=>x.source==='close').slice(-6).map(x=>({m:x.m,...model.actualMonth(x.m),forecast:false})),fut=model.months.slice(0,12).map(x=>({m:x.m,spend:x.spend,opIn:x.opIn,forecast:true}));
 body+='<section class="rw-panel rw-pad"><div class="rw-panel-head"><div><h2>Monthly burn by category</h2><p>Spend by category · '+esc(C2)+' · actual closed months, then the next 12 forecast months</p></div></div>'+burnChart(past.concat(fut))+'</section>';
 const br=bridge();const ms=model.milestones.filter(x=>!x.passed);
 body+='<div class="rw-grid2"><section class="rw-panel rw-pad"><div class="rw-panel-head"><div><h2>Why runway changed</h2><p>'+(br&&!br.unavailable?'Since the '+esc(monthLabel(br.asOf))+' snapshot':'Since the last snapshot')+'</p></div>'+(br&&!br.unavailable?pill(signed(br.total)+' months',br.total<0?'red':br.total>0?'green':''):'')+'</div>'+(br?br.unavailable?'<p class="rw-muted">The last snapshot is too old to compare month by month.</p>':'<ul class="rw-list">'+br.parts.map(p=>'<li><span>'+esc(p.label)+'</span><strong class="'+(p.v<0?'neg':p.v>0?'pos':'')+'">'+esc(signed(p.v))+' months</strong></li>').join('')+'<li class="total"><span>Runway '+esc(runwayText(br.from))+' → '+esc(runwayText(br.to))+'</span><strong>'+esc(signed(br.total))+' months</strong></li></ul>'+(br.capped?'<p class="rw-muted">At least one runway reaches the '+HORIZON+'-month horizon, so the change may be larger.</p>':''):'<p class="rw-muted">Close a month to freeze the first snapshot. The bridge then explains each change.</p>')+'</section>';
 const ex=exceptions();
 body+='<section class="rw-panel rw-pad"><div class="rw-panel-head"><div><h2>Exceptions</h2><p>Items that need attention before relying on the numbers</p></div>'+pill(ex.length?String(ex.length):'None',ex.length?'amber':'green')+'</div>'+(ex.length?'<ul class="rw-list">'+ex.map(e=>'<li><span>'+esc(e[0])+'</span>'+(e[1]?btn(esc(e[2]),e[1],'rw-link'):'')+'</li>').join('')+'</ul>':'<p class="rw-muted">No open exceptions.</p>')+'</section></div>';
 if(!ms.length&&PROGRAMS_LINK!=='ok')body+='<section class="rw-panel rw-pad"><h2>Cash at milestones</h2>'+programsLinkNote()+'</section>';
 if(ms.length)body+='<section class="rw-panel"><div class="rw-pad"><div class="rw-panel-head"><div><h2>Cash at milestones</h2><p>Forecast closing cash in the milestone month and cushion to '+(reserve?'the minimum reserve':'cash-out')+'</p></div></div></div><div class="rw-scroll" role="region" aria-label="Cash at milestones" tabindex="0"><table class="rw-table"><thead><tr><th scope="col">Milestone</th><th scope="col">Program</th><th scope="col">Month</th><th scope="col" class="num">Cash</th><th scope="col">Cushion</th><th scope="col">Source</th></tr></thead><tbody>'+ms.map(x=>'<tr><td><strong>'+esc(x.name)+'</strong></td><td>'+esc(progName(x.program))+'</td><td>'+esc(monthLabel(x.m))+'</td><td class="num">'+esc(money(x.cash))+'</td><td>'+pill(cushionText(x.cushion),cushionTone(x.cushion))+'</td><td>'+esc(SOURCE_LABEL[x.source]||'Runway')+'</td></tr>').join('')+'</tbody></table></div>'+(programsLinkNote()?'<div class="rw-pad rw-pad-top0">'+programsLinkNote()+'</div>':'')+'</section>';
 return body;}
function exceptions(){const ex=[];const next=addMonths(model.A,1);
 if(model.A&&BASE.actuals.some(a=>ym(a.month)===next))ex.push([monthLabel(next)+' has actuals but is not closed.','nav:actuals','Close month']);
 for(const w of model.warns.filter(w=>/is not closed\./.test(w)))ex.push([w,'nav:actuals','Actuals']);
 if(model.excluded.length)ex.push([excludedText(model.excluded),'nav:settings','Add rates']);
 if(st.preview&&st.preview.changes.length)ex.push(['Unsaved scenario preview “'+st.preview.name+'”.','nav:scenarios','Review']);
 const out=scenarioList.filter(s=>s.status==='saved'&&s.outdated);if(out.length)ex.push([plural(out.length,'saved scenario')+' outdated by forecast changes.','nav:scenarios','Review']);
 if(model.runway&&!model.runway.beyond&&model.runway.months<target)ex.push(['Runway is below the '+target+'-month target.','nav:scenarios','What-if']);
 return ex;}

/* registers */
function filtered(role,rows,fields){const q=st.query.toLowerCase().trim();let out=rows;
 if(q)out=out.filter(r=>fields.some(k=>String(k==='program_id'?progName(r.data[k]):r.data[k]??'').toLowerCase().includes(q)));
 for(const [k,v] of Object.entries(st.filters))if(v)out=out.filter(r=>String(r.data[k]??'')===v);return out;}
function paged(items,per){per=per||Math.min(50,Math.max(10,num(cfg.pageSize,25)||25));const max=Math.max(0,Math.ceil(items.length/per)-1);st.page=Math.min(st.page,max);return {slice:items.slice(st.page*per,(st.page+1)*per),page:st.page,max,total:items.length,per};}
function pager(p,scope){return '<div class="rw-footer"><span>'+(p.total?'Showing '+(p.page*p.per+1)+'–'+Math.min(p.total,(p.page+1)*p.per)+' of '+p.total:'No rows')+(scope?' · '+esc(scope):'')+'</span><span class="rw-pager">'+btn('Previous','prev-page','rw-btn small',p.page===0)+'<span>Page '+(p.page+1)+' of '+(p.max+1)+'</span>'+btn('Next','next-page','rw-btn small',p.page>=p.max)+'</span></div>';}
function toolbar(role,addLabel,filters){filters=filters.filter(f=>f.options.length);const active=Object.values(st.filters).filter(Boolean).length;
 return '<div class="rw-toolbar"><input type="search" class="rw-search" name="query" data-action="query" data-ui-state="true" value="'+esc(st.query)+'" placeholder="Search" aria-label="Search '+esc(ROLE_LABEL[role])+'s">'+btn('Filters'+(active?' ('+active+')':''),'toggle-filters','rw-btn rw-disclosure',false,'aria-expanded="'+(st.filtersOpen?'true':'false')+'" aria-controls="rw-filters"')+btn(icon('plus',15)+'<span class="rw-hide-xs">'+esc(addLabel)+'</span>','add:'+role,'rw-btn rw-btn-primary',!canWrite(role),'aria-label="'+esc(addLabel)+'"')+'</div>'+(st.filtersOpen?'<div class="rw-filter-row" id="rw-filters">'+filters.map(f=>'<label>'+esc(f.label)+'<select name="filter_'+f.key+'" data-ui-state="true" data-action="filter:'+f.key+'"><option value="">All</option>'+f.options.map(o=>'<option value="'+esc(o[0])+'"'+(st.filters[f.key]===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></label>').join('')+btn('Clear filters','clear-filters','rw-btn small',!active)+'</div>':'');}
const programOptions=()=>R.programs.rows.map(p=>[p.id,String(p.data.name||'Unnamed')]);
const SOURCE_LABEL={runway:'Runway',programs:'Programs app',linked:'Programs app (linked)',link_unavailable:'Runway date · Programs link unavailable'};
/* Short explanations when a partner table is missing (rule 3): never an error, never presented as complete. */
function programsLinkNote(){if(PROGRAMS_LINK==='ok')return '';
 if(PROGRAMS_LINK==='unbound')return '<p class="rw-muted rw-note">Only Runway milestones are shown. When the Programs app is used, connect its milestones (role programs.plan_items) to include its key milestones here.</p>';
 return '<p class="rw-muted rw-note">Programs app milestones are unavailable ('+(PROGRAMS_LINK==='unavailable'?'no access':'incomplete read')+'), so only Runway milestones are shown. Linked milestones keep their Runway date.</p>';}
function programsTableNote(){const t=tableState('programs');return t==='unbound'?'Programs are not connected to this app, so program breakdowns are hidden. Spend and runway totals are unaffected.':t==='unavailable'?'You do not have access to the programs table, so program names show as unavailable. Totals are unaffected.':'';}
function cell(role,key,r){const v=r.data[key];
 if(key==='program_id')return esc(progName(v));if(key==='counterparty_id')return esc(refName('organizations',v));
 if(key==='amount')return '<span class="num">'+esc(money(num(v),r.data.currency))+'</span>';
 if(key==='annual_salary')return has(r.data,'annual_salary')?'<span class="num">'+esc(money(num(v),r.data.currency))+'</span>':'<span class="rw-muted">Restricted</span>';
 if(/month/.test(key))return esc(ym(v)?monthLabel(ym(v)):'—');
 if(key==='status')return pill(String(v||'—').replace(/_/g,' '),v==='contingent'||v==='planned'?'amber':v==='committed'||v==='received'||v==='current'?'green':'');
 if(key==='direction')return pill(v==='cash_in'?'Cash in':'Spend',v==='cash_in'?'blue':'');
 if(key==='driver')return esc(String(v||'—').replace('_','-'));
 if(key==='name'||key==='title')return '<strong>'+esc(v||'—')+'</strong>'+(r.data.schedule_group?'<small class="rw-sub">Schedule: '+esc(r.data.schedule_group)+'</small>':'');
 return esc(v===null||v===undefined||v===''?'—':v);}
function rowMenu(role,r,extra){const key=role+':'+r.id,label=String(r.data.name||r.data.title||ROLE_LABEL[role]);const w=canWrite(role);
 return '<div class="rw-menu-wrap">'+btn('Details','details:'+key,'rw-btn small')+btn('•••','menu:'+key,'rw-more',false,'aria-label="More actions for '+esc(label)+'" aria-expanded="'+(st.menu===key?'true':'false')+'"')+(st.menu===key?'<div class="rw-menu" role="menu">'+btn('Edit','edit:'+key,'',!w)+btn('Duplicate','duplicate:'+key,'',!w)+(extra||'')+(roleMap[role]&&roleMap[role].fields.archived?btn('Archive','archive:'+key,'danger',!w||!roleMap[role].writable.includes('archived')):'')+'</div>':'')+'</div>';}
function register(role,group,rows,scope){const cols=st.layout.cols[group].filter(k=>st.layout.visible[group+':'+k]!==false&&(role!=='positions'||k!=='annual_salary'||salaryBound));const p=paged(rows);
 return (p.total?'<div class="rw-scroll" role="region" aria-label="'+esc(ROLE_LABEL[role])+' register" tabindex="0"><table class="rw-table"><thead><tr>'+cols.map(k=>'<th scope="col"'+(k==='amount'||k==='annual_salary'?' class="num"':'')+'>'+esc((templateLayoutSchema.groups[group].find(x=>x.id===k)||{}).label||k)+'</th>').join('')+'<th scope="col" class="rw-actions" aria-label="Actions"></th></tr></thead><tbody>'+p.slice.map(r=>'<tr>'+cols.map(k=>'<td>'+cell(role,k,r)+'</td>').join('')+'<td class="rw-actions">'+rowMenu(role,r)+'</td></tr>').join('')+'</tbody></table></div>':'<div class="rw-none">'+(rows.length===0&&!st.query&&!Object.values(st.filters).some(Boolean)?'Nothing here yet. Use the add button to create the first record.':'No rows match the search or filters.')+'</div>')+pager(p,scope);}
function partialLabel(role){const r=R[role];return r.unbound?'table not bound':r.unavailable?'no access':!r.complete?'partial: '+r.rows.length+' of '+(r.total||'unknown')+' rows read':'search covers all '+r.rows.length+' rows read';}
function plan(){
 let body=heading()+checks();
 body+='<div class="rw-seg" role="tablist" aria-label="Plan sections">'+[['lines','Spend and cash-in lines'],['milestones','Milestones'],['budgets','Budgets']].map(x=>btn(esc(x[1]),'plan-tab:'+x[0],'rw-seg-btn',false,'role="tab" aria-selected="'+(st.planTab===x[0])+'"')).join('')+'</div>';
 if(st.planTab==='lines'){const rows=filtered('lines',R.lines.rows.slice().sort((a,b)=>String(a.data.start_month||'').localeCompare(String(b.data.start_month||''))||String(a.data.name||'').localeCompare(String(b.data.name||''))),['name','category','program_id','status','notes','schedule_group']);
  body+='<section class="rw-panel"><div class="rw-pad"><div class="rw-panel-head"><div><h2>Plan lines</h2><p>One live forecast. Drivers: monthly, one-off or spread evenly. Payment schedules are one-off lines that share a schedule group.</p></div>'+btn('Add payment schedule','add-schedule','rw-btn',!canWrite('lines'))+'</div>'+toolbar('lines','Add line',[{key:'direction',label:'Direction',options:[['spend','Spend'],['cash_in','Cash in']]},{key:'status',label:'Status',options:['committed','discretionary','contingent','received'].map(x=>[x,x])},{key:'category',label:'Category',options:enabledCats.map(x=>[x,x])},{key:'program_id',label:'Program',options:programOptions()}])+'</div>'+register('lines','lines',rows,partialLabel('lines'))+'</section>';}
 else if(st.planTab==='milestones'){const rows=filtered('milestones',R.milestones.rows.slice().sort((a,b)=>String(a.data.target_month||'').localeCompare(String(b.data.target_month||''))),['name','program_id']);
  body+='<section class="rw-panel"><div class="rw-pad"><div class="rw-panel-head"><div><h2>Milestones</h2><p>The events the cash must reach. Cushion is shown on Overview.</p></div></div>'+toolbar('milestones','Add milestone',[{key:'program_id',label:'Program',options:programOptions()}])+'</div>'+register('milestones','milestones',rows,partialLabel('milestones'))+'</section>';
  const fromPrograms=model.milestones.filter(x=>x.source==='programs'||x.source==='linked');
  body+='<section class="rw-panel"><div class="rw-pad"><div class="rw-panel-head"><div><h2>Key milestones from the Programs app</h2><p>Read only. Programs owns these dates; Runway uses them for cash at milestone and never changes them.</p></div></div>'+(PROGRAMS_LINK==='ok'?(fromPrograms.length?'<ul class="rw-list">'+fromPrograms.map(x=>'<li><span><strong>'+esc(x.name)+'</strong> · '+esc(progName(x.program))+'</span><span>'+esc(monthLabel(x.m))+' · '+esc(SOURCE_LABEL[x.source])+'</span></li>').join('')+'</ul>':'<p class="rw-muted">No key milestones are marked in the Programs app.</p>'):programsLinkNote())+'</div></section>';}
 else{const years=[];if(model.A)for(let i=0;i<3;i++){const y=String(Number(addMonths(model.A,1).slice(0,4))+i);if(!years.includes(y))years.push(y);}
  body+='<section class="rw-panel rw-pad"><div class="rw-panel-head"><div><h2>Lock as budget</h2><p>Freezes the current forecast into one budget record: monthly totals by category and program, and the rates used. It cannot be edited; lock a new one for the next year.</p></div></div><form class="rw-inline-form" data-action="lock-budget"><label class="rw-field">Year<select name="year" data-ui-state="true" data-action="lock-year">'+years.map(y=>'<option value="'+y+'"'+(budgetsAll.some(b=>String(num(b.row.data.year,0))===y)?' disabled':'')+(st.lockYear===y?' selected':'')+'>'+y+(budgetsAll.some(b=>String(num(b.row.data.year,0))===y)?' (locked)':'')+'</option>').join('')+'</select></label><button type="submit" class="rw-btn rw-btn-primary"'+(!canWrite('budgets')||!exact?' disabled':'')+'>Lock as budget</button></form>'+(!exact?'<p class="rw-muted">Locking needs complete, valid data.</p>':'')+'</section>';
  body+='<section class="rw-panel"><div class="rw-pad"><h2>Locked budgets</h2></div>'+(budgetsAll.length?'<div class="rw-scroll" role="region" aria-label="Locked budgets" tabindex="0"><table class="rw-table"><thead><tr><th scope="col">Budget</th><th scope="col">Year</th><th scope="col">Locked on</th><th scope="col" class="num">Annual spend</th><th scope="col" class="num">Committed cash in</th></tr></thead><tbody>'+budgetsAll.map(b=>{const ms=Object.values(b.t.months);const sp=ms.reduce((n,x)=>n+Object.values(x.spend||{}).reduce((a,c)=>a+num(c,0),0),0),ci=ms.reduce((n,x)=>n+num(x.cashIn,0),0);return '<tr><td><strong>'+esc(b.row.data.name)+'</strong></td><td>'+esc(b.row.data.year)+'</td><td>'+esc(b.row.data.locked_on||'—')+'</td><td class="num">'+esc(money(sp,b.row.data.currency))+'</td><td class="num">'+esc(money(ci,b.row.data.currency))+'</td></tr>';}).join('')+'</tbody></table></div>':'<div class="rw-none">No budget is locked yet.</div>')+'</section>';}
 return body;}
function scheduleForm(){const s=st.schedule;if(!s)return '';const sel=(name,opts,val)=>'<select class="rw-input" name="'+name+'" data-ui-state="true" data-action="schedule-draft">'+opts.map(o=>'<option value="'+esc(o[0])+'"'+(String(val||'')===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select>';
 return '<div class="rw-overlay"><section class="rw-drawer" role="dialog" aria-modal="true" aria-label="Add payment schedule"><div class="rw-drawer-head"><div><div class="rw-eyebrow">Reviewed data change</div><h2>Add payment schedule</h2></div>'+btn(icon('close',17),'schedule-cancel','rw-icon-btn',false,'aria-label="Close"')+'</div><form data-action="schedule-save" class="rw-drawer-form"><div class="rw-drawer-body"><div class="rw-banner info">Creates one one-off spend line per instalment, sharing a schedule group. Nothing changes until you approve the review.</div><div class="rw-pair">'+
  '<label class="rw-field">Name *<input class="rw-input" name="name" data-ui-state="true" data-action="schedule-draft" value="'+esc(s.name)+'" required></label><label class="rw-field">Schedule group<input class="rw-input" name="group" data-ui-state="true" data-action="schedule-draft" value="'+esc(s.group)+'" placeholder="Defaults to the name"></label>'+
  '<label class="rw-field">Category'+sel('category',enabledCats.map(c=>[c,c]),s.category)+'</label><label class="rw-field">Currency'+sel('currency',CURRENCIES.map(c=>[c,c]),s.currency)+'</label><label class="rw-field">Status'+sel('status',[['committed','committed'],['discretionary','discretionary'],['contingent','contingent']],s.status)+'</label><label class="rw-field">Program'+sel('program_id',[['','No program']].concat(programOptions()),s.program_id)+'</label></div><h3 class="rw-h3">Instalments</h3><div class="rw-pair">'+
  s.rows.map((r,i)=>'<label class="rw-field">Month '+(i+1)+'<input class="rw-input" type="month" name="month_'+i+'" data-ui-state="true" data-action="schedule-draft" value="'+esc(ym(r.month)||r.month||'')+'"></label><label class="rw-field">Amount '+(i+1)+'<input class="rw-input" type="number" min="0" step="0.01" name="amount_'+i+'" data-ui-state="true" data-action="schedule-draft" value="'+esc(r.amount??'')+'"></label>').join('')+'</div>'+btn('Add instalment','schedule-row','rw-btn small',s.rows.length>=12)+'</div><div class="rw-drawer-foot">'+btn('Cancel','schedule-cancel')+'<button type="submit" class="rw-btn rw-btn-primary">Prepare reviewed save</button></div></form></section></div>';}
function people(){
 let body=heading()+checks();const rows=R.positions.rows;const cur=rows.filter(r=>r.data.status==='current'),planned=rows.filter(r=>r.data.status==='planned');
 const next=model.A?addMonths(model.A,1):'';const nextCost=model.ready&&!salaryRestricted?model.months[0].people:null;
 body+='<div class="rw-kpis">'+kpi('Current roles',String(cur.length),'Active positions recorded as current')+kpi('Planned hires',String(planned.length),'Not counted as current headcount')+kpi('People cost next month',salaryRestricted?'Restricted':nextCost===null?'—':money(nextCost),next?monthLabel(next)+' · salary ÷ 12 × (1 + '+loaded+'% loaded cost)':'Set the opening date first')+'</div>';
 const list=filtered('positions',rows.slice().sort((a,b)=>String(a.data.start_month||'').localeCompare(String(b.data.start_month||''))),['title','program_id','status']);
 body+='<section class="rw-panel"><div class="rw-pad"><div class="rw-panel-head"><div><h2>Roles and planned hires</h2><p>Adding, moving or removing a hire shows the runway effect before you save.</p></div></div>'+toolbar('positions','Add position',[{key:'status',label:'Status',options:[['current','Current'],['planned','Planned']]},{key:'program_id',label:'Program',options:programOptions()}])+'</div>'+register('positions','positions',list,partialLabel('positions'))+'</section>';
 if(model.A){const ms=Array.from({length:12},(_,i)=>addMonths(model.A,i+1));const progs=[...new Set(rows.map(r=>r.data.program_id||''))];
  const head='<tr><th scope="col">Program</th>'+ms.map(m=>'<th scope="col" class="num">'+esc(shortMonth(m))+'</th>').join('')+'</tr>';
  const hc=progs.map(pid=>'<tr><th scope="row">'+esc(progName(pid))+'</th>'+ms.map(m=>{const act=rows.filter(r=>(r.data.program_id||'')===pid&&ym(r.data.start_month)&&ym(r.data.start_month)<=m&&(!ym(r.data.end_month)||ym(r.data.end_month)>=m));const c=act.filter(r=>r.data.status==='current').length,p=act.length-c;return '<td class="num">'+c+(p?' <span class="rw-muted">+'+p+'</span>':'')+'</td>';}).join('')+'</tr>').join('');
  const cost=salaryRestricted?'':progs.map(pid=>'<tr><th scope="row">'+esc(progName(pid))+'</th>'+ms.map((m,i)=>{const p=model.ready?model.months[i]:null;const v=p&&p.prog[pid]?p.prog[pid].People||0:0;return '<td class="num">'+esc(p?compact(v):'—')+'</td>';}).join('')+'</tr>').join('');
  body+='<section class="rw-panel"><div class="rw-pad"><h2>Headcount by program</h2><p class="rw-muted">Current roles, with planned hires shown as +n · next 12 months</p></div><div class="rw-scroll" role="region" aria-label="Headcount by program" tabindex="0"><table class="rw-table compact"><thead>'+head+'</thead><tbody>'+(hc||'<tr><td colspan="13">No positions yet.</td></tr>')+'</tbody></table></div></section>';
  body+='<section class="rw-panel"><div class="rw-pad"><h2>People cost by program</h2><p class="rw-muted">'+(salaryRestricted?'Restricted: salaries are not visible to you.':'Loaded cost · '+esc(C2)+' · next 12 months')+'</p></div>'+(salaryRestricted?'':'<div class="rw-scroll" role="region" aria-label="People cost by program" tabindex="0"><table class="rw-table compact"><thead>'+head+'</thead><tbody>'+(cost||'<tr><td colspan="13">No positions yet.</td></tr>')+'</tbody></table></div>')+'</section>';}
 return body;}

/* cash flow */
function cfData(){
 const src=st.cf.source||'forecast';
 if(src.startsWith('budget:')){const b=budgetsAll.find(x=>x.row.id===src.slice(7));if(!b)return null;const ms=Object.keys(b.t.months).sort();return {kind:'budget',label:String(b.row.data.name),rows:ms.map(m=>{const x=b.t.months[m];const sp=Object.fromEntries(Object.entries(x.spend||{}).map(([k,v])=>[k,num(v,0)]));const total=Object.values(sp).reduce((n,v)=>n+v,0);return {m,cashIn:num(x.cashIn,0)+(st.cf.contingent?num(x.contingent,0):0),spend:sp,prog:x.prog||{},netBurn:total-num(x.opIn,0),open:null,close:null,drill:null};})};}
 let mm=model,label='Live forecast';if(src.startsWith('scenario:')){const sc=scenarioList.find(s=>s.id===src.slice(9));if(!sc)return null;mm=engine(BASE,{changes:sc.changes});label='Scenario: '+sc.name;}else if(src==='preview'&&st.preview){mm=engine(BASE,{changes:st.preview.changes});label='Preview: '+st.preview.name;}
 if(salaryBlock)return {kind:'forecast',label,rows:[],restricted:true};
 if(!mm.ready)return {kind:'forecast',label,rows:[]};let prev=mm.start;
 return {kind:'forecast',label,model:mm,rows:mm.months.map(x=>{const ci=x.cashBase+(st.cf.contingent?x.cashCont:0),close=st.cf.contingent?x.closeCont:x.close;const o={m:x.m,cashIn:ci,spend:x.spend,prog:x.prog,netBurn:x.netBurn,open:prev,close,drill:x.drill};prev=close;return o;})};}
function cashFlow(){
 let body=heading()+checks();const d=cfData();
 const opts=[['forecast','Live forecast']].concat(st.preview?[['preview','Preview: '+st.preview.name]]:[]).concat(scenarioList.filter(s=>s.status!=='archived').map(s=>['scenario:'+s.id,'Scenario: '+s.name+(s.outdated?' (outdated)':'')])).concat(budgetsAll.map(b=>['budget:'+b.row.id,String(b.row.data.name)]));
 body+='<section class="rw-panel"><div class="rw-pad"><div class="rw-controls"><label class="rw-field inline">Show<select name="cf_source" data-ui-state="true" data-action="cf-source">'+opts.map(o=>'<option value="'+esc(o[0])+'"'+(st.cf.source===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></label><label class="rw-check"><input type="checkbox" name="cf_contingent" data-ui-state="true" data-action="cf-contingent"'+(st.cf.contingent?' checked':'')+'> Include contingent cash</label>'+(programsUsable()?btn(st.cf.programs?'Collapse programs':'Expand to programs','cf-programs','rw-btn',false,'aria-pressed="'+(!!st.cf.programs)+'"'):'')+btn('Export CSV','toggle-export','rw-btn',!d||!d.rows.length,'aria-expanded="'+(!!st.exportOpen)+'"')+'</div></div>';
 if(!d){body+='<div class="rw-none">The selected source is no longer available.</div></section>';return body;}
 if(!d.rows.length){body+='<div class="rw-none">'+(d.restricted?'Live cash flow needs salary access. Choose a locked budget, or open a snapshot in Actuals.':'No months to show. Complete the setup in Settings first.')+'</div></section>';return body;}
 const cats=enabledCats.filter(c=>d.rows.some(r=>r.spend[c]));let cols=cats.map(c=>({key:c,label:c,get:r=>r.spend[c]||0}));
 if(st.cf.programs&&programsUsable()){cols=[];for(const c of cats){const pids=[...new Set(d.rows.flatMap(r=>Object.keys(r.prog).filter(p=>(r.prog[p]||{})[c])))];for(const p of pids)cols.push({key:c+'|'+p,label:c+' · '+progName(p),get:r=>(r.prog[p]||{})[c]||0,cat:c,prog:p});}}
 const per=12,maxPage=Math.max(0,Math.ceil(d.rows.length/per)-1);st.cf.page=Math.min(st.cf.page||0,maxPage);const slice=d.rows.slice(st.cf.page*per,(st.cf.page+1)*per);
 const drillBtn=(r,key,v)=>d.kind==='forecast'&&r.drill?btn(esc(compact(v)),'drill:'+r.m+'|'+key,'rw-cellbtn',false,'aria-label="Lines behind '+esc(key.replace('|',' · '))+' in '+esc(monthLabel(r.m))+'"'):esc(compact(v));
 body+='<div class="rw-scroll" role="region" aria-label="Monthly cash flow" tabindex="0"><table class="rw-table cf"><thead><tr><th scope="col">Month</th>'+(d.kind==='forecast'?'<th scope="col" class="num">Opening</th>':'')+'<th scope="col" class="num">Cash in</th>'+cols.map(c=>'<th scope="col" class="num">'+esc(c.label)+'</th>').join('')+'<th scope="col" class="num">Net burn</th>'+(d.kind==='forecast'?'<th scope="col" class="num">Closing</th>':'')+'</tr></thead><tbody>'+
  slice.map(r=>'<tr><th scope="row">'+esc(monthLabel(r.m))+'</th>'+(d.kind==='forecast'?'<td class="num">'+esc(compact(r.open))+'</td>':'')+'<td class="num">'+drillBtn(r,'cash_in',r.cashIn)+'</td>'+cols.map(c=>'<td class="num">'+drillBtn(r,c.key,c.get(r))+'</td>').join('')+'<td class="num">'+esc(compact(r.netBurn))+'</td>'+(d.kind==='forecast'?'<td class="num'+(r.close<0?' neg':'')+'">'+esc(compact(r.close))+'</td>':'')+'</tr>').join('')+'</tbody></table></div>';
 body+='<div class="rw-footer"><span>'+esc(d.label)+' · '+esc(C2)+' · '+(d.kind==='budget'?'frozen budget totals':st.cf.contingent?'includes contingent cash':'committed and received cash in only')+' · values in thousands (k) or millions (M)</span><span class="rw-pager">'+btn('Previous year','cf-prev','rw-btn small',st.cf.page===0)+'<span>'+esc(monthLabel(slice[0].m))+' – '+esc(monthLabel(slice[slice.length-1].m))+'</span>'+btn('Next year','cf-next','rw-btn small',st.cf.page>=maxPage)+'</span></div></section>';
 if(st.drill&&d.kind==='forecast'){const [m,key]=st.drill.split('|').length===3?[st.drill.split('|')[0],st.drill.split('|').slice(1).join('|')]:st.drill.split('|');const r=d.rows.find(x=>x.m===m);
  const [cat,prog]=key.split('|');let items=r&&r.drill?(cat==='cash_in'?(r.drill.cash_in||[]).concat(st.cf.contingent?(r.drill.contingent||[]):[]):(r.drill[cat]||[])):[];if(prog!==undefined)items=items.filter(i=>(i.program||'')===prog);
  body+='<section class="rw-panel"><div class="rw-pad"><div class="rw-panel-head"><div><h2>'+esc((cat==='cash_in'?'Cash in':cat)+(prog!==undefined?' · '+progName(prog):'')+' · '+monthLabel(m))+'</h2><p>The lines behind this value, with original amounts and conversion</p></div>'+btn(icon('close',15),'close-drill','rw-icon-btn',false,'aria-label="Close line detail"')+'</div></div>'+(items.length?'<div class="rw-scroll" role="region" aria-label="Lines behind the value" tabindex="0"><table class="rw-table"><thead><tr><th scope="col">Line</th><th scope="col">Type</th><th scope="col">Program</th><th scope="col" class="num">Original</th><th scope="col" class="num">Rate used</th><th scope="col" class="num">'+esc(C2)+'</th></tr></thead><tbody>'+items.map(i=>'<tr><td><strong>'+esc(i.name||'—')+'</strong>'+(i.status?'<small class="rw-sub">'+esc(i.status)+'</small>':'')+'</td><td>'+esc(i.kind==='position'?'Position':(i.driver||'line').replace('_','-'))+'</td><td>'+esc(progName(i.program))+'</td><td class="num">'+(i.kind==='position'&&salaryRestricted?'Restricted':esc(money(i.original,i.currency)))+'</td><td class="num">'+esc(i.currency===C2?'—':grouped(i.converted/i.original,4))+'</td><td class="num">'+esc(money(i.converted))+'</td></tr>').join('')+'</tbody></table></div>':'<div class="rw-none">No lines behind this value.</div>')+'</section>';}
 if(st.exportOpen){const head=['Month'].concat(d.kind==='forecast'?['Opening']:[]).concat(['Cash in']).concat(cols.map(c=>c.label)).concat(['Net burn']).concat(d.kind==='forecast'?['Closing']:[]);
  const q=v=>{const s=String(v);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};const csv=[head.map(q).join(',')].concat(d.rows.map(r=>[r.m].concat(d.kind==='forecast'?[round2(r.open)]:[]).concat([round2(r.cashIn)]).concat(cols.map(c=>round2(c.get(r)))).concat([round2(r.netBurn)]).concat(d.kind==='forecast'?[round2(r.close)]:[]).map(q).join(','))).join('\n');
  body+='<section class="rw-panel rw-pad"><div class="rw-panel-head"><div><h2>Export CSV</h2><p>'+esc(d.label)+' · '+esc(C2)+' · all '+d.rows.length+' months. Copy the text below into a .csv file; Excel opens it directly. Custom apps cannot start a file download yet.</p></div></div><textarea class="rw-textarea mono" name="csv_export" data-ui-state="true" readonly rows="10" aria-label="Cash flow CSV">'+esc(csv)+'</textarea></section>';}
 return body;}

/* scenarios */
function scenarios(){
 let body=heading()+checks();if(salaryBlock)return body+'<div class="rw-none">What-ifs need salary access because people cost drives the runway.</div>';if(!model.ready)return body+'<div class="rw-none">Complete the setup before running what-ifs.</div>';
 const p=st.preview,d=st.changeDraft||{kind:'shift_program'};
 const targetSel=(kind)=>{let opts=[];if(['shift_program','scale_program','stop_program','add_position'].includes(kind))opts=programOptions();else if(kind==='remove_position')opts=R.positions.rows.map(r=>[r.id,String(r.data.title||'Position')]);else if(['move_cash_in','resize_cash_in'].includes(kind))opts=R.lines.rows.filter(r=>r.data.direction==='cash_in').map(r=>[r.id,String(r.data.name||'Cash in')+' · '+monthLabel(ym(r.data.start_month))]);
  if(kind==='fx_shift')return '';return '<label class="rw-field">'+(kind==='add_position'?'Program (optional)':['remove_position'].includes(kind)?'Position':['move_cash_in','resize_cash_in'].includes(kind)?'Cash-in line':'Program')+'<select class="rw-input" name="target_id" data-ui-state="true" data-action="change-draft"><option value="">Choose…</option>'+opts.map(o=>'<option value="'+esc(o[0])+'"'+(d.target_id===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></label>';};
 const inputF=(name,label,type,extra)=>'<label class="rw-field">'+esc(label)+'<input class="rw-input" type="'+type+'" name="'+name+'" data-ui-state="true" data-action="change-draft" value="'+esc(d[name]??'')+'"'+(extra||'')+'></label>';
 const k=d.kind||'shift_program';let fields=targetSel(k);
 if(['shift_program','move_cash_in'].includes(k))fields+=inputF('months','Shift by months (negative = earlier)','number',' step="1"');
 if(['scale_program','fx_shift'].includes(k))fields+=inputF('pct',k==='fx_shift'?'Change in % (positive = costs more)':'Change in %','number',' step="0.1"');
 if(k==='fx_shift')fields+='<label class="rw-field">Currency<select class="rw-input" name="currency" data-ui-state="true" data-action="change-draft"><option value="">Choose…</option>'+CURRENCIES.filter(c=>c!==C2).map(c=>'<option'+(d.currency===c?' selected':'')+'>'+c+'</option>').join('')+'</select></label>';
 if(['stop_program','add_position','remove_position'].includes(k))fields+=inputF('from_month',k==='add_position'?'Start month':k==='remove_position'?'From month (blank = remove entirely)':'Stop from month','month','');
 if(k==='add_position')fields+=inputF('label','Title','text','')+inputF('amount','Annual salary','number',' min="0" step="1"')+'<label class="rw-field">Currency<select class="rw-input" name="currency" data-ui-state="true" data-action="change-draft">'+CURRENCIES.map(c=>'<option'+((d.currency||C2)===c?' selected':'')+'>'+c+'</option>').join('')+'</select></label>';
 if(k==='resize_cash_in')fields+=inputF('amount','New amount (line currency)','number',' min="0" step="1"');
 const pm=p?engine(BASE,{changes:p.changes}):null;
 const pending=st.pendingScenario?scenarioList.find(s=>s.name===st.pendingScenario&&!s.changes.length):null;
 body+='<div class="rw-grid2 wide-left"><section class="rw-panel rw-pad"><div class="rw-panel-head"><div><h2>What-if preview</h2><p>Changes are applied on read. Nothing is stored until you save.</p></div>'+(p?btn('Discard preview','preview-discard','rw-btn small'):btn(icon('plus',15)+' New preview','preview-new','rw-btn rw-btn-primary'))+'</div>'+
  (pending&&p?'<div class="rw-banner info">Scenario “'+esc(pending.name)+'” is saved without its changes. '+btn('Save its '+plural(p.changes.length,'change')+' (step 2 of 2)','save-changes:'+pending.id,'rw-btn rw-btn-primary small',!canWrite('changes'))+'</div>':'')+
  (p?'<form data-action="change-add" class="rw-change-form"><label class="rw-field">Preview name<input class="rw-input" name="preview_name" data-ui-state="true" data-action="preview-name" value="'+esc(p.name)+'"></label><label class="rw-field">Change<select class="rw-input" name="kind" data-ui-state="true" data-action="change-draft">'+CHANGE_KINDS.map(x=>'<option value="'+x+'"'+(k===x?' selected':'')+'>'+esc(CHANGE_LABELS[x])+'</option>').join('')+'</select></label>'+fields+'<div class="rw-row"><button type="submit" class="rw-btn">Add to preview</button>'+btn('Save scenario','preview-save','rw-btn rw-btn-primary',!p.changes.length||!canWrite('scenarios'))+'</div></form>'+
   (p.changes.length?'<ol class="rw-changes">'+p.changes.map((c,i)=>'<li><span>'+esc(describe(c))+'</span>'+btn('Remove','change-remove:'+i,'rw-link',false,'aria-label="Remove change '+(i+1)+'"')+'</li>').join('')+'</ol>':'<p class="rw-muted">Add a change to see its effect.</p>')+
   (pm&&pm.ready?'<div class="rw-compare-strip"><div><small>Runway</small><b>'+esc(runwayText(model.runway))+' → '+esc(runwayText(pm.runway))+'</b></div><div><small>Cash-out</small><b>'+esc(pm.runway.beyond?'Beyond horizon':monthLabel(pm.runway.cashOut))+'</b></div><div><small>Start raise</small><b>'+esc(pm.runway.beyond?'—':monthLabel(pm.runway.startRaise))+'</b></div></div>':''):'<p class="rw-muted">Start a preview, or ask Claude or ChatGPT: “What if the Series A closes four months later and we pause program B?”</p>')+'</section>';
 const shown=scenarioList.filter(s=>st.showArchived||s.status!=='archived');
 body+='<section class="rw-panel rw-pad"><div class="rw-panel-head"><div><h2>Saved scenarios</h2><p>Outdated means the forecast changed after the scenario was saved.</p></div>'+btn(st.showArchived?'Hide archived':'Show archived','toggle-archived-scenarios','rw-btn small')+'</div>'+(shown.length?'<ul class="rw-cards">'+shown.map(s=>'<li class="rw-scard"><div class="rw-scard-head"><strong>'+esc(s.name)+'</strong>'+pill(s.status,s.status==='adopted'?'green':s.status==='archived'?'':'blue')+(s.outdated&&s.status==='saved'?pill('Outdated','amber'):'')+'</div><p>'+esc(s.changes.length?s.changes.map(describe).join('; '):'No changes saved yet.')+'</p><div class="rw-row">'+btn('Copy to preview','preview-from:'+s.id,'rw-btn small')+btn('Adopt','adopt:'+s.id,'rw-btn small',s.status!=='saved'||!canWrite('lines'))+btn('Archive','scenario-archive:'+s.id,'rw-btn small danger',s.status==='archived'||!canWrite('scenarios'))+'</div></li>').join('')+'</ul>':'<p class="rw-muted">No saved scenarios.</p>')+'</section></div>';
 // Compare 2–4
 const cands=[['forecast','Live forecast',model]].concat(p?[['preview','Preview: '+p.name,pm]]:[]).concat(scenarioList.filter(s=>s.status!=='archived').map(s=>['scenario:'+s.id,s.name+(s.outdated?' (outdated)':''),null]));
 st.compare=st.compare.filter(id=>cands.some(c=>c[0]===id));
 const sel=cands.filter(c=>st.compare.includes(c[0])).map(c=>{let mm=c[2];if(!mm){const sc=scenarioList.find(s=>'scenario:'+s.id===c[0]);mm=engine(BASE,{changes:sc?sc.changes:[]});}return {id:c[0],label:c[1],m:mm};});
 const colors=['#175B94','#B9873A','#8C6BB1','#2E8B9A'];
 body+='<section class="rw-panel rw-pad"><div class="rw-panel-head"><div><h2>Compare</h2><p>Choose two to four · '+esc(C2)+' · as of '+esc(monthLabel(model.A))+'</p></div></div><div class="rw-checks">'+cands.map(c=>'<label class="rw-check"><input type="checkbox" name="cmp_'+esc(c[0])+'" data-ui-state="true" data-action="compare:'+esc(c[0])+'"'+(st.compare.includes(c[0])?' checked':'')+'> '+esc(c[1])+'</label>').join('')+'</div>';
 if(sel.length>=2){const allMs=[...new Set(sel.flatMap(s=>s.m.milestones.filter(x=>!x.passed).map(x=>x.name)))];
  body+='<div class="rw-scroll" role="region" aria-label="Scenario comparison" tabindex="0"><table class="rw-table"><thead><tr><th scope="col">Measure</th>'+sel.map((s,i)=>'<th scope="col"><span class="rw-swatch" style="background:'+colors[i]+'"></span>'+esc(s.label)+'</th>').join('')+'</tr></thead><tbody>'+
   '<tr><th scope="row">Runway</th>'+sel.map(s=>'<td>'+esc(s.m.ready?runwayText(s.m.runway):'—')+'</td>').join('')+'</tr><tr><th scope="row">Cash-out month</th>'+sel.map(s=>'<td>'+esc(!s.m.ready?'—':s.m.runway.beyond?'Beyond horizon':monthLabel(s.m.runway.cashOut))+'</td>').join('')+'</tr><tr><th scope="row">Start raise</th>'+sel.map(s=>'<td>'+esc(!s.m.ready||s.m.runway.beyond?'—':monthLabel(s.m.runway.startRaise))+'</td>').join('')+'</tr><tr><th scope="row">Net burn, next 24 months</th>'+sel.map(s=>'<td class="num">'+esc(s.m.ready?money(s.m.months.slice(0,24).reduce((n,x)=>n+x.netBurn,0)):'—')+'</td>').join('')+'</tr>'+
   allMs.map(n=>'<tr><th scope="row">Cash at '+esc(n)+'</th>'+sel.map(s=>{const x=s.m.milestones.find(y=>y.name===n);return '<td class="num">'+esc(x?money(x.cash)+' · '+monthLabel(x.m):'—')+'</td>';}).join('')+'</tr>').join('')+'</tbody></table></div>'+
   cashChart(sel.map((s,i)=>({label:s.label,color:colors[i],dash:i===0?'6 5':i===1?'2 4':'9 4 2 4',points:s.m.months.map(x=>({m:x.m,cash:x.close}))})),{history:model.history,label:'Closing cash overlay of the compared scenarios in '+C2})+'<div class="rw-legend">'+sel.map((s,i)=>'<span><i style="background:'+colors[i]+'"></i>'+esc(s.label)+'</span>').join('')+'</div>';}
 else body+='<p class="rw-muted">Select at least two to compare.</p>';
 return body+'</section>';}

/* actuals */
function snapshotsPanel(readOnlyView){const rows=closesSorted;return '<section class="rw-panel"><div class="rw-pad"><div class="rw-panel-head"><div><h2>Snapshots</h2><p>Frozen at each close; they never change</p></div></div></div>'+(rows.length?'<div class="rw-scroll" role="region" aria-label="Snapshots" tabindex="0"><table class="rw-table"><thead><tr><th scope="col">Month</th><th scope="col" class="num">Closing balance</th><th scope="col">Runway</th><th scope="col">Cash-out</th><th scope="col">Status</th><th scope="col" class="rw-actions" aria-label="Open"></th></tr></thead><tbody>'+rows.slice(0,24).map(r=>{const mt=parseJSON(r.data.metrics);return '<tr><td><strong>'+esc(monthLabel(ym(r.data.month)))+'</strong></td><td class="num">'+esc(money(num(r.data.closing_balance),r.data.currency))+'</td><td>'+esc(mt&&mt.runway?runwayText(mt.runway):num(r.data.runway_months)!==null?plural(num(r.data.runway_months),'month'):'—')+'</td><td>'+esc(ym(r.data.cash_out_month)?monthLabel(ym(r.data.cash_out_month)):'—')+'</td><td>'+pill(r.data.runway_status==='below_target'?'Below target':r.data.runway_status==='ok'?'OK':'—',r.data.runway_status==='below_target'?'red':'green')+'</td><td class="rw-actions">'+btn('Open','snapshot:'+r.id,'rw-btn small')+'</td></tr>';}).join('')+'</tbody></table></div>':'<div class="rw-none">No snapshots yet. Close a month to create one.</div>')+'</section>';}
function actuals(){
 let body=heading()+checks();
 const months=[];if(model.O){const lastActual=BASE.actuals.map(a=>ym(a.month)).filter(Boolean).sort().pop()||'';const end=[addMonths(model.A||model.O,1),lastActual].sort().pop();for(let m=addMonths(model.O,1);m<=end&&months.length<60;m=addMonths(m,1))months.push(m);}
 const closedSet={};for(const r of closesSorted)closedSet[ym(r.data.month)]=r;
 const nextOpen=model.A?addMonths(model.A,1):'';
 body+='<section class="rw-panel"><div class="rw-pad"><div class="rw-panel-head"><div><h2>Months</h2><p>Close each month in order: bank balance and actuals by category, about 15 minutes.</p></div>'+btn('Close '+(nextOpen?monthLabel(nextOpen):'month'),'open-close','rw-btn rw-btn-primary',!canWrite('closes')||!exact||!nextOpen,'value="'+esc(nextOpen)+'"')+'</div></div>'+(months.length?'<div class="rw-scroll" role="region" aria-label="Months" tabindex="0"><table class="rw-table"><thead><tr><th scope="col">Month</th><th scope="col">Status</th><th scope="col" class="num">Actual spend</th><th scope="col" class="num">Closing balance</th><th scope="col" class="rw-actions" aria-label="Actions"></th></tr></thead><tbody>'+months.slice().reverse().slice(0,24).map(m=>{const c=closedSet[m],am=model.actualMonth(m);return '<tr><td><strong>'+esc(monthLabel(m))+'</strong></td><td>'+pill(c?'Closed':'Open',c?'green':m===nextOpen?'amber':'')+'</td><td class="num">'+esc(am.count?money(am.spendTotal):'—')+'</td><td class="num">'+esc(c?money(num(c.data.closing_balance),c.data.currency):'—')+'</td><td class="rw-actions">'+(c?btn('Snapshot','snapshot:'+c.id,'rw-btn small')+btn('Commentary','commentary:'+c.id,'rw-btn small',!writableField('closes','commentary')):btn('Add actual','add:actuals','rw-btn small',!canWrite('actuals')))+'</td></tr>';}).join('')+'</tbody></table></div>':'<div class="rw-none">Enter the opening balance and date in Settings first.</div>')+'</section>';
 // variance
 const closedMonths=closesSorted.map(r=>ym(r.data.month));const vm=closedMonths.includes(st.varMonth)?st.varMonth:closedMonths[0];
 body+='<section class="rw-panel"><div class="rw-pad"><div class="rw-panel-head"><div><h2>Variance against budget</h2><p>Actual − budget by category, and by program where actuals are coded · '+esc(C2)+'</p></div>'+(closedMonths.length?'<label class="rw-field inline">Month<select name="var_month" data-ui-state="true" data-action="var-month">'+closedMonths.map(m=>'<option value="'+m+'"'+(m===vm?' selected':'')+'>'+esc(monthLabel(m))+'</option>').join('')+'</select></label>':'')+'</div></div>';
 if(!vm)body+='<div class="rw-none">Variance appears after the first close.</div>';
 else{const b=budgetFor(vm),v=b?varianceFor(model,b,vm):null;
  if(!b)body+='<div class="rw-none">No budget is locked for '+esc(vm.slice(0,4))+'. Lock one in Plan → Budgets.</div>';
  else if(!v)body+='<div class="rw-none">The locked budget has no values for '+esc(monthLabel(vm))+'.</div>';
  else{const row=(lab,bu,ac,df,pc)=>'<tr><th scope="row">'+lab+'</th><td class="num">'+esc(money(bu))+'</td><td class="num">'+esc(money(ac))+'</td><td class="num '+(df>0?'neg':df<0?'pos':'')+'">'+esc((df>0?'+':'')+money(df))+'</td><td class="num">'+esc(pc===null?'—':(pc>0?'+':'')+grouped(pc,1)+'%')+'</td></tr>';
   body+='<div class="rw-scroll" role="region" aria-label="Variance by category" tabindex="0"><table class="rw-table"><thead><tr><th scope="col">Category</th><th scope="col" class="num">Budget</th><th scope="col" class="num">Actual</th><th scope="col" class="num">Variance</th><th scope="col" class="num">%</th></tr></thead><tbody>'+v.rows.map(r=>row(esc(r.cat),r.budget,r.actual,r.diff,r.pct)).join('')+row('<strong>Total spend</strong>',v.totalBudget,v.totalActual,v.totalActual-v.totalBudget,v.totalBudget?(v.totalActual-v.totalBudget)/v.totalBudget*100:null)+'</tbody></table></div>'+
    (v.progRows.length?'<div class="rw-pad"><h3 class="rw-h3">By program (coded actuals)</h3></div><div class="rw-scroll" role="region" aria-label="Variance by program" tabindex="0"><table class="rw-table compact"><thead><tr><th scope="col">Program · category</th><th scope="col" class="num">Budget</th><th scope="col" class="num">Actual</th><th scope="col" class="num">Variance</th><th scope="col" class="num">%</th></tr></thead><tbody>'+v.progRows.map(r=>row(esc(progName(r.pid)+' · '+r.cat),r.budget,r.actual,r.diff,r.pct)).join('')+'</tbody></table></div>':'');
   const c=closedSet[vm];body+='<div class="rw-pad"><h3 class="rw-h3">Commentary</h3><p class="rw-commentary">'+esc(c&&c.data.commentary?c.data.commentary:'No commentary yet.')+'</p>'+(c?btn('Edit commentary','commentary:'+c.id,'rw-btn small',!writableField('closes','commentary')):'')+'</div>';}}
 body+='</section>'+snapshotsPanel(false);
 const am=R.actuals.rows.slice().sort((a,b)=>String(b.data.month||'').localeCompare(String(a.data.month||'')));const p=paged(am);
 body+='<section class="rw-panel"><div class="rw-pad"><div class="rw-panel-head"><div><h2>Actual records</h2><p>'+esc(partialLabel('actuals'))+'</p></div>'+btn(icon('plus',15)+' Add actual','add:actuals','rw-btn',!canWrite('actuals'))+'</div></div>'+(p.total?'<div class="rw-scroll" role="region" aria-label="Actual records" tabindex="0"><table class="rw-table compact"><thead><tr><th scope="col">Month</th><th scope="col">Category</th><th scope="col">Program</th><th scope="col">Direction</th><th scope="col" class="num">Amount</th><th scope="col">Note</th><th scope="col" class="rw-actions" aria-label="Actions"></th></tr></thead><tbody>'+p.slice.map(r=>'<tr><td>'+esc(monthLabel(ym(r.data.month)))+'</td><td>'+esc(r.data.category||'—')+'</td><td>'+esc(progName(r.data.program_id))+'</td><td>'+cell('actuals','direction',r)+'</td><td class="num">'+esc(money(num(r.data.amount),r.data.currency))+'</td><td>'+esc(r.data.note||'—')+'</td><td class="rw-actions">'+btn('Edit','edit:actuals:'+r.id,'rw-btn small',!canWrite('actuals')||!!closedSet[ym(r.data.month)],closedSet[ym(r.data.month)]?'title="Closed months are frozen"':'')+'</td></tr>').join('')+'</tbody></table></div>':'<div class="rw-none">No actuals yet.</div>')+pager(p,'')+'</section>';
 return body;}

/* settings */
function settingsScreen(){
 let body=heading()+checks();const s=settingsRow;
 const show=(k,v)=>'<div class="rw-kv"><span>'+esc((S.settings.find(f=>f.key===k)||{}).label||k)+'</span><strong>'+esc(v)+'</strong></div>';
 body+='<div class="rw-grid2"><section class="rw-panel rw-pad"><div class="rw-panel-head"><div><h2>Runway settings</h2><p>Business settings stored in the Runway settings table. Changes are reviewed.</p></div>'+btn(s?'Edit settings':'Create settings','edit-settings','rw-btn rw-btn-primary',!canWrite('settings'))+'</div>'+
  (s?show('reporting_currency',SET.reporting_currency||'—')+show('enabled_currencies',SET.enabled_currencies||'—')+show('runway_target_months',target+' months')+show('trailing_window_months',trailingN+' months')+show('min_cash_reserve',reserve?money(reserve):'None')+show('loaded_cost_pct',loaded+'%')+show('opening_balance',money(num(SET.opening_balance)))+show('opening_date',SET.opening_date||'—')+show('categories',enabledCats.join(', ')):'<div class="rw-empty"><strong>No settings yet</strong><p>Create settings with the bank balance and date to get the first runway.</p></div>')+'</section>';
 body+='<section class="rw-panel rw-pad"><h2>Access and automations</h2><p class="rw-muted">Runway has no settings store of its own for these. Use the platform pages.</p><ul class="rw-list plain"><li><span><strong>Access</strong>: TrialAgents sidebar → Access → Projects → this app. Restrict the <em>annual salary</em> column for viewers who should not see pay, and share with a write restriction for board members.</span></li><li><span><strong>Automations</strong>: TrialAgents sidebar → Automations. Optional: runway alert email when a close sets the runway status to below target, and a monthly exchange-rate update. The app never waits for them.</span></li><li><span><strong>Layout</strong>: the gear at the top reorders, renames or hides screens and columns through a reviewed app update.</span></li></ul></section></div>';
 const rates=R.rates.rows.slice().sort((a,b)=>String(b.data.month||'').localeCompare(String(a.data.month||''))||String(a.data.currency||'').localeCompare(String(b.data.currency||'')));const p=paged(rates);
 const used=[...new Set(BASE.lines.map(l=>l.currency).concat(BASE.positions.map(x=>x.currency)).concat(BASE.actuals.map(a=>a.currency)).filter(c=>c&&c!==C2))];
 body+='<section class="rw-panel"><div class="rw-pad"><div class="rw-panel-head"><div><h2>Monthly exchange rates</h2><p>Monthly average units per 1 EUR (ECB convention). Closed months use their own month; future months use the latest available rate. A missing rate excludes the row; it is never guessed.'+(used.length?' Currencies in use: '+esc(used.join(', '))+'.':'')+'</p></div>'+btn(icon('plus',15)+' Add rate','add:rates','rw-btn',!canWrite('rates'))+'</div></div>'+(p.total?'<div class="rw-scroll" role="region" aria-label="Exchange rates" tabindex="0"><table class="rw-table compact"><thead><tr><th scope="col">Month</th><th scope="col">Currency</th><th scope="col" class="num">Per 1 EUR</th><th scope="col">Source</th><th scope="col">Reference</th><th scope="col" class="rw-actions" aria-label="Actions"></th></tr></thead><tbody>'+p.slice.map(r=>'<tr><td>'+esc(monthLabel(ym(r.data.month)))+'</td><td>'+esc(r.data.currency)+'</td><td class="num">'+esc(num(r.data.rate_per_eur)===null?'—':String(num(r.data.rate_per_eur)))+'</td><td>'+esc(r.data.source||'—')+'</td><td>'+esc(r.data.source_ref||'—')+'</td><td class="rw-actions">'+btn('Edit','edit:rates:'+r.id,'rw-btn small',!canWrite('rates'))+'</td></tr>').join('')+'</tbody></table></div>':'<div class="rw-none">No rates yet. Add rates for every currency other than the reporting currency.</div>')+pager(p,partialLabel('rates'))+'</section>';
 body+='<div class="rw-grid2"><section class="rw-panel"><div class="rw-pad"><div class="rw-panel-head"><div><h2>Programs</h2><p>Shared workspace table (core role programs). Other apps such as Programs use the same records.</p></div>'+btn(icon('plus',15)+' Add program','add:programs','rw-btn',!canWrite('programs'))+'</div></div>'+(programsTableNote()?'<div class="rw-none">'+esc(programsTableNote())+'</div>':R.programs.rows.length?'<ul class="rw-list pad">'+R.programs.rows.map(r=>'<li><span><strong>'+esc(r.data.name||'Unnamed')+'</strong>'+(r.data.code?' · '+esc(r.data.code):'')+'</span>'+btn('Edit','edit:programs:'+r.id,'rw-btn small',!canWrite('programs'))+'</li>').join('')+'</ul>':'<div class="rw-none">No programs yet.</div>')+'</section>';
 body+='<section class="rw-panel"><div class="rw-pad"><div class="rw-panel-head"><div><h2>Organizations</h2><p>Vendors, investors and funders, linked from plan lines by record ID.</p></div>'+btn(icon('plus',15)+' Add organization','add:organizations','rw-btn',!canWrite('organizations'))+'</div></div>'+(tableState('organizations')==='unbound'?'<div class="rw-none">Organizations are not connected to this app; counterparties show as not connected.</div>':tableState('organizations')==='unavailable'?'<div class="rw-none">You do not have access to the organizations table.</div>':(R.organizations.rows.length?'<ul class="rw-list pad">'+R.organizations.rows.slice(0,25).map(r=>'<li><span><strong>'+esc(r.data.name||'Unnamed')+'</strong>'+(r.data.org_type?' · '+esc(r.data.org_type):'')+'</span>'+btn('Edit','edit:organizations:'+r.id,'rw-btn small',!canWrite('organizations'))+'</li>').join('')+'</ul>':'<div class="rw-none">No organizations yet.</div>'))+'</section></div>';
 return body;}

/* ---------- overlays ---------- */
function editorPanel(){const x=st.editor;if(!x)return '';const role=x.role,m=roleMap[role];
 const title=(x.mode==='edit'?'Edit ':x.mode==='duplicate'?'Duplicate ':'Add ')+ROLE_LABEL[role];
 let fields=S[role].filter(f=>f.kind!=='frozen'&&f.key!=='archived'&&m&&m.fields[f.key]);
 if(role==='closes')fields=fields.filter(f=>f.key==='commentary');
 if(role==='positions'&&salaryRestricted)fields=fields.filter(f=>f.key!=='annual_salary');
 if(role==='lines'&&x.draft.direction!=='cash_in')fields=fields.filter(f=>f.key!=='cash_in_type');
 const control=f=>{const v=x.draft[f.key]??'',id='rw-f-'+f.key,dis=!writableField(role,f.key)?' disabled':'';const common=' id="'+id+'" name="'+f.key+'" data-ui-state="true" data-action="draft:'+f.key+'"'+dis+(f.required?' required':'');
  if(f.kind==='select')return '<select class="rw-input"'+common+'><option value="">Choose…</option>'+f.options.map(o=>'<option value="'+esc(o)+'"'+(String(v)===o?' selected':'')+'>'+esc(o.replace(/_/g,' '))+'</option>').join('')+'</select>';
  if(f.kind==='ref'){const rows=(R[f.ref].rows||[]),cur=String(v||''),keep=cur&&!rows.some(r=>r.id===cur);return '<select class="rw-input"'+common+'><option value="">None</option>'+(keep?'<option value="'+esc(cur)+'" selected>'+esc(refName(f.ref,cur,f.ref==='programs'?'program':undefined))+'</option>':'')+rows.map(r=>'<option value="'+esc(r.id)+'"'+(cur===r.id?' selected':'')+'>'+esc(String(r.data.name||'Unnamed'))+'</option>').join('')+'</select>';}
  if(f.kind==='longtext')return '<textarea class="rw-textarea"'+common+'>'+esc(v)+'</textarea>';
  if(f.kind==='boolean')return '<select class="rw-input"'+common+'><option value="false"'+(!bool(v)?' selected':'')+'>No</option><option value="true"'+(bool(v)?' selected':'')+'>Yes</option></select>';
  const type=f.kind==='month'?'month':f.kind==='date'?'date':f.kind==='number'||f.kind==='money'?'number':'text';const val=f.kind==='month'?(ym(v)||String(v||'')):v;
  return '<input class="rw-input" type="'+type+'"'+common+(f.kind==='money'?' min="0" step="0.01"':f.kind==='number'?' step="any"':'')+' value="'+esc(val)+'">';};
 const changed=JSON.stringify(x.draft)!==x.initial;let effect='';
 if((role==='positions'||role==='lines')&&model.ready&&exact){try{const d=valuesFromForm(role,x.draft,x.mode==='edit'?'update':'create');const list=BASE[role].filter(r=>r.id!==x.id).concat([{...(x.mode==='edit'?BASE[role].find(r=>r.id===x.id):{}),...d,id:x.id||'draft'}]);const after=engine(dataset({[role]:list}));if(after.ready)effect='<div class="rw-effect"><span>Runway effect before saving</span><strong>'+esc(runwayText(model.runway))+' → '+esc(runwayText(after.runway))+'</strong></div>';}catch(e){effect='<div class="rw-effect muted"><span>Runway effect</span><strong>Complete the required fields to see it</strong></div>';}}
 return '<div class="rw-overlay"><section class="rw-drawer" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="rw-drawer-head"><div><div class="rw-eyebrow">Reviewed data change</div><h2>'+esc(title)+'</h2></div>'+btn(icon('close',17),'cancel-modal','rw-icon-btn',false,'aria-label="Close editor"')+'</div><form data-action="save-record" class="rw-drawer-form"><div class="rw-drawer-body"><div class="rw-banner info">Edits are proposals until you approve the TrialAgents review. Nothing changes by opening this form.</div>'+effect+'<div class="rw-pair">'+fields.map(f=>'<label class="rw-field'+(f.kind==='longtext'?' wide':'')+'" for="rw-f-'+f.key+'">'+esc(f.label)+(f.required?' *':'')+control(f)+'</label>').join('')+'</div>'+(role==='positions'&&salaryRestricted?'<p class="rw-muted">Salary is restricted for you and is not shown or changed.</p>':'')+'</div><div class="rw-drawer-foot"><span class="rw-muted">'+(changed?'Unsaved changes':'No changes yet')+'</span>'+btn('Cancel','cancel-modal')+'<button type="submit" class="rw-btn rw-btn-primary"'+(changed&&canWrite(role)?'':' disabled')+'>Prepare reviewed save</button></div></form></section></div>';}
function detailPanel(){const d=st.detail;if(!d||!R[d.role])return '';const r=lookup(d.role,d.id);if(!r)return '';
 const rows=S[d.role].filter(f=>f.kind!=='frozen'&&roleMap[d.role]&&roleMap[d.role].fields[f.key]).map(f=>{let v=r.data[f.key];if(f.kind==='ref')v=refName(f.ref,v);else if(f.kind==='month')v=ym(v)?monthLabel(ym(v)):v;else if(f.key==='annual_salary'&&!has(r.data,'annual_salary'))v='Restricted';else if(f.kind==='money')v=money(num(v),r.data.currency);else if(f.kind==='boolean')v=bool(v)?'Yes':'No';return '<div class="rw-kv"><span>'+esc(f.label)+'</span><strong>'+esc(v===null||v===undefined||v===''?'—':v)+'</strong></div>';}).join('');
 return '<div class="rw-overlay"><section class="rw-drawer" role="dialog" aria-modal="true" aria-label="Details"><div class="rw-drawer-head"><div><div class="rw-eyebrow">'+esc(ROLE_LABEL[d.role])+'</div><h2>'+esc(r.data.name||r.data.title||'Details')+'</h2></div>'+btn(icon('close',17),'close-details','rw-icon-btn',false,'aria-label="Close details"')+'</div><div class="rw-drawer-body">'+rows+'<p class="rw-muted">Record ID '+esc(r.id)+' · version '+esc(r.version)+'</p></div><div class="rw-drawer-foot">'+btn('Close','close-details')+btn('Edit','edit:'+d.role+':'+d.id,'rw-btn rw-btn-primary',!canWrite(d.role))+'</div></section></div>';}
function confirmPanel(){const c=st.confirm;if(!c)return '';
 if(c.kind==='archive'){const r=lookup(c.role,c.id);let effect='';if(c.role==='positions'&&model.ready&&exact){const after=engine(dataset({positions:BASE.positions.filter(p=>p.id!==c.id)}));if(after.ready)effect='<div class="rw-effect"><span>Runway effect</span><strong>'+esc(runwayText(model.runway))+' → '+esc(runwayText(after.runway))+'</strong></div>';}
  return '<div class="rw-overlay center"><section class="rw-modal" role="alertdialog" aria-modal="true" aria-label="Archive record"><h2>Archive this '+esc(ROLE_LABEL[c.role])+'?</h2><p><strong>'+esc(r?(r.data.name||r.data.title||''):'')+'</strong> stops counting in the forecast after you approve the review. Its history is kept.</p>'+effect+'<div class="rw-row end">'+btn('Cancel','cancel-modal')+btn('Review archive','confirm-archive','rw-btn rw-btn-danger')+'</div></section></div>';}
 if(c.kind==='scenario-archive')return '<div class="rw-overlay center"><section class="rw-modal" role="alertdialog" aria-modal="true" aria-label="Archive scenario"><h2>Archive this scenario?</h2><p>It stays readable under Show archived.</p><div class="rw-row end">'+btn('Cancel','cancel-modal')+btn('Review archive','confirm-scenario-archive','rw-btn rw-btn-danger')+'</div></section></div>';
 return '';}
function lockPanel(){if(!st.lock)return '';const b=budgetTotals(model,st.lock.year);const sp=Object.values(b.totals.months).reduce((n,x)=>n+Object.values(x.spend).reduce((a,v)=>a+v,0),0);
 return '<div class="rw-overlay center"><section class="rw-modal" role="alertdialog" aria-modal="true" aria-label="Lock budget"><h2>Lock budget '+esc(st.lock.year)+'?</h2><p>Creates one frozen record with monthly totals by category and program ('+esc(money(sp))+' spend in '+esc(st.lock.year)+'). Later edits to lines do not change it.</p>'+(b.missing.length?'<div class="rw-banner bad">'+esc(excludedText(b.missing))+'</div>':'')+'<div class="rw-row end">'+btn('Cancel','cancel-modal')+btn('Review lock','confirm-lock','rw-btn rw-btn-primary',!!b.missing.length||!canWrite('budgets'))+'</div></section></div>';}
function adoptPanel(){const a=st.adopt;if(!a)return '';const sc=scenarioList.find(s=>s.id===a.id);
 return '<div class="rw-overlay center"><section class="rw-modal" role="alertdialog" aria-modal="true" aria-label="Adopt scenario"><h2>Adopt “'+esc(sc?sc.name:'scenario')+'”?</h2><p>Writes '+plural(a.changes.length,'record change')+' to the live forecast after you approve the review. Versions were captured now; anything edited meanwhile is rejected, not overwritten.</p>'+(a.skipped.length?'<ul class="rw-list plain">'+a.skipped.map(s=>'<li><span>'+esc(s)+'</span></li>').join('')+'</ul>':'')+'<div class="rw-row end">'+btn('Cancel','cancel-modal')+btn('Review adoption','confirm-adopt','rw-btn rw-btn-primary')+'</div></section></div>';}
function closePanel(){const d=st.closeDraft;if(!d)return '';const m=ym(d.month)||addMonths(model.A,1);const existing=BASE.actuals.filter(a=>ym(a.month)===m);
 const catRow=c=>{const ex=existing.filter(a=>a.direction==='spend'&&a.category===c);if(ex.length){const s=ex.reduce((n,a)=>n+num(a.amount,0),0);return '<div class="rw-kv"><span>'+esc(c)+'</span><strong>'+esc(grouped(s))+' already recorded</strong></div>';}return '<label class="rw-field">'+esc(c)+'<input class="rw-input" type="number" min="0" step="0.01" name="actual_'+esc(c)+'" data-ui-state="true" data-action="close-draft" value="'+esc(d['actual_'+c]??'')+'"></label>';};
 return '<div class="rw-overlay"><section class="rw-drawer" role="dialog" aria-modal="true" aria-label="Close month"><div class="rw-drawer-head"><div><div class="rw-eyebrow">Monthly close</div><h2>Close '+esc(monthLabel(m))+'</h2></div>'+btn(icon('close',17),'cancel-modal','rw-icon-btn',false,'aria-label="Close"')+'</div><form data-action="close-submit" class="rw-drawer-form"><div class="rw-drawer-body"><div class="rw-banner info">Approving the review records the actuals and one frozen snapshot with the runway bridge. The forecast then rolls forward to '+esc(monthLabel(m))+'.</div><input type="hidden" name="month" data-ui-state="true" value="'+esc(m)+'"><div class="rw-pair"><label class="rw-field">Closing bank balance *<input class="rw-input" type="number" step="0.01" name="closing_balance" data-ui-state="true" data-action="close-draft" value="'+esc(d.closing_balance??'')+'" required></label><label class="rw-field">Currency<select class="rw-input" name="currency" data-ui-state="true" data-action="close-draft">'+CURRENCIES.map(c=>'<option'+((d.currency||C2)===c?' selected':'')+'>'+c+'</option>').join('')+'</select></label></div><h3 class="rw-h3">Spend actuals by category</h3><div class="rw-pair">'+enabledCats.map(catRow).join('')+'</div><h3 class="rw-h3">Cash received</h3><div class="rw-pair"><label class="rw-field">Amount<input class="rw-input" type="number" min="0" step="0.01" name="cash_in_amount" data-ui-state="true" data-action="close-draft" value="'+esc(d.cash_in_amount??'')+'"></label><label class="rw-field">Type<select class="rw-input" name="cash_in_type" data-ui-state="true" data-action="close-draft"><option value="">Choose…</option>'+CASH_IN_TYPES.map(t=>'<option value="'+t+'"'+(d.cash_in_type===t?' selected':'')+'>'+t.replace('_',' ')+'</option>').join('')+'</select></label></div><label class="rw-field wide">Commentary<textarea class="rw-textarea" name="commentary" data-ui-state="true" data-action="close-draft">'+esc(d.commentary??'')+'</textarea></label><p class="rw-muted">Amounts use the selected currency. Program-level actuals can be added as individual actual records before closing.</p></div><div class="rw-drawer-foot">'+btn('Cancel','cancel-modal')+'<button type="submit" class="rw-btn rw-btn-primary">Prepare reviewed close</button></div></form></section></div>';}
function snapshotPanel(){if(!st.snapshot)return '';const r=lookup('closes',st.snapshot);if(!r)return '';const s=parseJSON(r.data.metrics);
 let body='<div class="rw-kv"><span>Closing balance</span><strong>'+esc(money(num(r.data.closing_balance),r.data.currency))+'</strong></div>';
 if(s&&s.runway){body+='<div class="rw-kv"><span>Runway</span><strong>'+esc(runwayText(s.runway))+'</strong></div><div class="rw-kv"><span>Cash lasts until</span><strong>'+esc(monthLabel(s.runway.lastsUntil))+'</strong></div><div class="rw-kv"><span>Cash-out month</span><strong>'+esc(s.runway.cashOut?monthLabel(s.runway.cashOut):'Beyond horizon')+'</strong></div><div class="rw-kv"><span>Start raise</span><strong>'+esc(s.runway.startRaise?monthLabel(s.runway.startRaise):'—')+'</strong></div><div class="rw-kv"><span>With contingent cash</span><strong>'+esc(s.runwayContingent?runwayText(s.runwayContingent):'—')+'</strong></div>'+(s.trailing?'<div class="rw-kv"><span>Trailing runway ('+esc(s.trailing.window)+' months)</span><strong>'+esc(grouped(s.trailing.months,1))+' months</strong></div>':'');
  if(s.burn)body+='<h3 class="rw-h3">Burn in '+esc(monthLabel(s.asOf))+'</h3>'+Object.entries(s.burn.spend||{}).map(([k,v])=>'<div class="rw-kv"><span>'+esc(k)+'</span><strong>'+esc(money(v,s.currency))+'</strong></div>').join('')+'<div class="rw-kv"><span>Net burn</span><strong>'+esc(money(s.burn.net,s.currency))+'</strong></div>';
  if(s.variance)body+='<h3 class="rw-h3">Variance against '+esc(s.variance.budget)+'</h3>'+s.variance.rows.map(v=>'<div class="rw-kv"><span>'+esc(v.cat)+'</span><strong>'+esc(money(v.actual,s.currency))+' vs '+esc(money(v.budget,s.currency))+'</strong></div>').join('');
  if(s.milestones&&s.milestones.length)body+='<h3 class="rw-h3">Milestones</h3>'+s.milestones.map(x=>'<div class="rw-kv"><span>'+esc(x.name)+' · '+esc(monthLabel(x.m))+'</span><strong>'+esc(money(x.cash,s.currency))+' · cushion '+esc(x.cushion===null?'—':(x.beyond?'≥ ':'')+plural(x.cushion,'month'))+'</strong></div>').join('');}
 else body+='<p class="rw-muted">This close has no frozen metrics.</p>';
 body+='<h3 class="rw-h3">Commentary</h3><p class="rw-commentary">'+esc(r.data.commentary||'No commentary.')+'</p>';
 return '<div class="rw-overlay"><section class="rw-drawer" role="dialog" aria-modal="true" aria-label="Snapshot"><div class="rw-drawer-head"><div><div class="rw-eyebrow">Frozen snapshot · read-only</div><h2>'+esc(monthLabel(ym(r.data.month)))+'</h2></div>'+btn(icon('close',17),'close-snapshot','rw-icon-btn',false,'aria-label="Close snapshot"')+'</div><div class="rw-drawer-body">'+body+'</div><div class="rw-drawer-foot">'+btn('Close','close-snapshot')+'</div></section></div>';}

/* ---------- page ---------- */
const rail='<aside class="rw-rail"><div class="rw-brand"><strong>Runway</strong><span>Cash and burn</span></div><nav class="rw-nav" aria-label="Runway screens">'+sections.map(s=>btn('<span class="rw-ico">'+icon(s.id)+'</span><span class="rw-nav-label">'+esc(s.label)+'</span>','nav:'+s.id,'',false,'aria-current="'+(st.section===s.id?'page':'false')+'" aria-label="'+esc(s.label)+'"')).join('')+'</nav><div class="rw-rail-foot">'+esc(cfg.demoLabel?'Fictional demo data':'Authorized records only')+'<br>Every change is reviewed.</div></aside>';
let main='';try{main=st.section==='overview'?overview():st.section==='cash_flow'?cashFlow():st.section==='plan'?plan():st.section==='people'?people():st.section==='scenarios'?scenarios():st.section==='actuals'?actuals():settingsScreen();}catch(e){main=heading()+'<div class="rw-banner bad" role="alert">This screen could not be calculated: '+esc(String(e&&e.message||e))+'</div>';}
const notice=st.notice?'<div class="rw-banner info rw-notice" role="status"><span>'+esc(st.notice)+'</span>'+btn('Dismiss','clear-notice','rw-btn small')+'</div>':'';
const preview=!inp.saved?'<div class="rw-banner info">Preview: save the app to record data. Fictional or unsaved previews never write to your workspace.</div>':'';
const overlays=editorPanel()+detailPanel()+confirmPanel()+lockPanel()+adoptPanel()+closePanel()+snapshotPanel()+scheduleForm();
// The page behind an open dialog is inert for keyboard and assistive technology.
const html='<div class="rw-shell"'+(overlays?' inert':'')+'>'+rail+'<main class="rw-main">'+preview+notice+main+'<p class="rw-foot">'+(cfg.demoLabel?'Fictional records for demonstration only. Opening this preview creates no records, emails or automations.':'Management planning, not accounting, tax or investment advice. Amounts are not bank reconciliations. All writes are reviewed in TrialAgents.')+'</p></main></div>'+overlays;
const css=typeof CASH_RUNWAY_CSS==='string'?CASH_RUNWAY_CSS:'';
return {html,css,state:st};
