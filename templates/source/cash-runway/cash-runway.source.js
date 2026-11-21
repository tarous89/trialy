'use trialagents v2';
const templateLayoutSchema={"screens":[{"id":"overview","label":"Overview"},{"id":"cash_flow","label":"Cash flow"},{"id":"plan","label":"Plan"},{"id":"people","label":"People"},{"id":"scenarios","label":"Scenarios"},{"id":"actuals","label":"Monthly close"},{"id":"settings","label":"Settings"}],"groups":{"lines":[{"id":"name","label":"Name"},{"id":"direction","label":"Direction"},{"id":"category","label":"Category"},{"id":"program_id","label":"Program"},{"id":"driver","label":"Driver"},{"id":"amount","label":"Amount"},{"id":"start_month","label":"Start"},{"id":"end_month","label":"End"},{"id":"status","label":"Status"}],"positions":[{"id":"title","label":"Title"},{"id":"program_id","label":"Program"},{"id":"start_month","label":"Start"},{"id":"end_month","label":"End"},{"id":"annual_salary","label":"Annual salary"},{"id":"status","label":"Status"}],"milestones":[{"id":"name","label":"Milestone"},{"id":"program_id","label":"Program"},{"id":"target_month","label":"Target month"}],"line_form":[{"id":"name","label":"Name"},{"id":"direction","label":"Direction"},{"id":"category","label":"Category"},{"id":"program_id","label":"Program"},{"id":"counterparty_id","label":"Vendor / counterparty"},{"id":"agreement_id","label":"Agreement"},{"id":"schedule_group","label":"Payment schedule group"},{"id":"driver","label":"Driver"},{"id":"amount","label":"Amount"},{"id":"currency","label":"Currency"},{"id":"start_month","label":"Start month"},{"id":"end_month","label":"End month"},{"id":"status","label":"Status"},{"id":"cash_in_type","label":"Cash-in type"},{"id":"notes","label":"Notes"}],"position_form":[{"id":"title","label":"Title"},{"id":"program_id","label":"Program"},{"id":"start_month","label":"Start month"},{"id":"end_month","label":"End month"},{"id":"annual_salary","label":"Annual salary"},{"id":"currency","label":"Currency"},{"id":"status","label":"Status"},{"id":"person_id","label":"Person record ID"}],"milestone_form":[{"id":"name","label":"Milestone"},{"id":"program_id","label":"Program"},{"id":"target_month","label":"Target month"},{"id":"end_date","label":"Target month (milestone list)"},{"id":"status","label":"Status"},{"id":"is_key","label":"Key milestone"},{"id":"source_milestone_id","label":"Programs app milestone ID"}],"actual_form":[{"id":"month","label":"Month"},{"id":"category","label":"Category"},{"id":"program_id","label":"Program"},{"id":"direction","label":"Direction"},{"id":"amount","label":"Amount"},{"id":"currency","label":"Currency"},{"id":"cash_in_type","label":"Cash-in type"},{"id":"note","label":"Note"}],"settings_form":[{"id":"reporting_currency","label":"Reporting currency"},{"id":"enabled_currencies","label":"Enabled currencies"},{"id":"runway_target_months","label":"Runway target"},{"id":"trailing_window_months","label":"Trailing burn window"},{"id":"min_cash_reserve","label":"Minimum cash reserve"},{"id":"loaded_cost_pct","label":"Loaded cost %"},{"id":"opening_balance","label":"Opening bank balance"},{"id":"opening_date","label":"Opening balance date"},{"id":"categories","label":"Spend categories"}]}};
const appCommands=[{"id":"schema.describe","label":"Describe forms, fields, categories and scenario change kinds","mode":"read","input":{"type":"object","properties":{},"additionalProperties":false}},{"id":"summary.read","label":"Read the runway summary","mode":"read","input":{"type":"object","properties":{"include_contingent":{"type":"boolean"}},"additionalProperties":false}},{"id":"cashflow.read","label":"Read the monthly cash flow","mode":"read","input":{"type":"object","properties":{"source":{"type":"string","maxLength":200},"from":{"type":"string","format":"month"},"to":{"type":"string","format":"month"},"include_contingent":{"type":"boolean"},"changes":{"type":"array","maxItems":50,"items":{"type":"object"}}},"additionalProperties":false}},{"id":"cashflow.drill","label":"Read the lines behind a cash-flow cell","mode":"read","input":{"type":"object","properties":{"month":{"type":"string","format":"month"},"category":{"type":"string","maxLength":200},"source":{"type":"string","maxLength":200}},"required":["month","category"],"additionalProperties":false}},{"id":"export.csv","label":"Export the cash flow as CSV text","mode":"read","input":{"type":"object","properties":{"source":{"type":"string","maxLength":200},"include_contingent":{"type":"boolean"}},"additionalProperties":false}},{"id":"bridge.read","label":"Explain why runway changed since the last snapshot","mode":"read","input":{"type":"object","properties":{},"additionalProperties":false}},{"id":"variance.read","label":"Read actual against budget","mode":"read","input":{"type":"object","properties":{"month":{"type":"string","format":"month"}},"additionalProperties":false}},{"id":"scenario.evaluate","label":"Evaluate what-if changes without saving","mode":"read","input":{"type":"object","properties":{"changes":{"type":"array","maxItems":50,"items":{"type":"object"}},"scenario_id":{"type":"string","format":"uuid"}},"additionalProperties":false}},{"id":"scenario.compare","label":"Compare the forecast and up to four scenarios","mode":"read","input":{"type":"object","properties":{"ids":{"type":"array","maxItems":4,"items":{"type":"string","maxLength":200}},"changes":{"type":"array","maxItems":50,"items":{"type":"object"}}},"additionalProperties":false}},{"id":"sources.read","label":"Read commitments, contract payments and tranches that can be added to the plan","mode":"read","input":{"type":"object","properties":{},"additionalProperties":false}},{"id":"record.save","label":"Add or edit a record through its form","mode":"propose","input":{"type":"object","properties":{"role":{"type":"string","enum":["settings","lines","positions","milestones","actuals","rates","programs","organizations","agreements","awards","obligations","tranches"]},"id":{"type":"string","format":"uuid"},"fields":{"type":"object"}},"required":["role","fields"],"additionalProperties":false}},{"id":"record.duplicate","label":"Duplicate a record","mode":"propose","input":{"type":"object","properties":{"role":{"type":"string","enum":["settings","lines","positions","milestones","actuals","rates","programs","organizations","agreements","awards","obligations","tranches"]},"id":{"type":"string","format":"uuid"},"fields":{"type":"object"}},"required":["role","id"],"additionalProperties":false}},{"id":"record.archive","label":"Archive a record","mode":"propose","input":{"type":"object","properties":{"role":{"type":"string","enum":["settings","lines","positions","milestones","actuals","rates","programs","organizations","agreements","awards","obligations","tranches"]},"id":{"type":"string","format":"uuid"}},"required":["role","id"],"additionalProperties":false}},{"id":"settings.save","label":"Create or edit Runway settings","mode":"propose","input":{"type":"object","properties":{"fields":{"type":"object"}},"required":["fields"],"additionalProperties":false}},{"id":"line.save","label":"Add or edit a spend or cash-in line","mode":"propose","input":{"type":"object","properties":{"id":{"type":"string","format":"uuid"},"fields":{"type":"object"}},"additionalProperties":false}},{"id":"line.archive","label":"Archive a plan line","mode":"propose","input":{"type":"object","properties":{"id":{"type":"string","format":"uuid"}},"required":["id"],"additionalProperties":false}},{"id":"position.save","label":"Add, move or edit a role or planned hire, with its runway effect","mode":"propose","input":{"type":"object","properties":{"id":{"type":"string","format":"uuid"},"fields":{"type":"object"}},"additionalProperties":false}},{"id":"position.archive","label":"Remove a role or hire","mode":"propose","input":{"type":"object","properties":{"id":{"type":"string","format":"uuid"}},"required":["id"],"additionalProperties":false}},{"id":"milestone.save","label":"Add or edit a milestone","mode":"propose","input":{"type":"object","properties":{"id":{"type":"string","format":"uuid"},"fields":{"type":"object"}},"additionalProperties":false}},{"id":"milestone.archive","label":"Archive a milestone","mode":"propose","input":{"type":"object","properties":{"id":{"type":"string","format":"uuid"}},"required":["id"],"additionalProperties":false}},{"id":"actuals.save","label":"Record actuals","mode":"propose","input":{"type":"object","properties":{"rows":{"type":"array","minItems":1,"maxItems":40,"items":{"type":"object"}}},"required":["rows"],"additionalProperties":false}},{"id":"schedule.create","label":"Add a payment schedule","mode":"propose","input":{"type":"object","properties":{"name":{"type":"string","maxLength":200},"group":{"type":"string","maxLength":200},"category":{"type":"string","maxLength":200},"currency":{"type":"string","maxLength":200},"status":{"type":"string","maxLength":200},"program_id":{"type":"string"},"instalments":{"type":"array","minItems":1,"maxItems":12,"items":{"type":"object"}}},"required":["name","instalments"],"additionalProperties":false}},{"id":"month.close","label":"Close the next month and freeze its snapshot","mode":"propose","input":{"type":"object","properties":{"month":{"type":"string","format":"month"},"closing_balance":{"type":"number"},"currency":{"type":"string","maxLength":200},"actuals":{"type":"object"},"cash_in_amount":{"type":"number"},"cash_in_type":{"type":"string","maxLength":200},"commentary":{"type":"string","maxLength":4000}},"required":["month","closing_balance"],"additionalProperties":false}},{"id":"commentary.save","label":"Edit a closed month's commentary","mode":"propose","input":{"type":"object","properties":{"month":{"type":"string","format":"month"},"commentary":{"type":"string","maxLength":4000}},"required":["month","commentary"],"additionalProperties":false}},{"id":"budget.lock","label":"Lock a year's budget from the forecast","mode":"propose","input":{"type":"object","properties":{"year":{"type":"string","pattern":"^\\d{4}$"}},"required":["year"],"additionalProperties":false}},{"id":"scenario.save","label":"Save a scenario (saved, or draft for the user to open)","mode":"propose","input":{"type":"object","properties":{"name":{"type":"string","minLength":1,"maxLength":100},"changes":{"type":"array","maxItems":50,"items":{"type":"object"}},"status":{"type":"string","enum":["saved","draft"]},"draft_id":{"type":"string","format":"uuid"}},"required":["name","changes"],"additionalProperties":false}},{"id":"scenario.copy","label":"Copy a scenario as a draft","mode":"propose","input":{"type":"object","properties":{"scenario_id":{"type":"string","format":"uuid"},"name":{"type":"string","maxLength":200}},"required":["scenario_id"],"additionalProperties":false}},{"id":"scenario.adopt","label":"Adopt a saved scenario into the forecast","mode":"propose","input":{"type":"object","properties":{"scenario_id":{"type":"string","format":"uuid"}},"required":["scenario_id"],"additionalProperties":false}},{"id":"scenario.archive","label":"Archive a scenario","mode":"propose","input":{"type":"object","properties":{"scenario_id":{"type":"string","format":"uuid"}},"required":["scenario_id"],"additionalProperties":false}},{"id":"fx.save","label":"Add or edit a monthly exchange rate","mode":"propose","input":{"type":"object","properties":{"id":{"type":"string","format":"uuid"},"fields":{"type":"object"}},"additionalProperties":false}},{"id":"program.save","label":"Add or edit a program","mode":"propose","input":{"type":"object","properties":{"id":{"type":"string","format":"uuid"},"fields":{"type":"object"}},"additionalProperties":false}},{"id":"organization.save","label":"Add or edit an organization","mode":"propose","input":{"type":"object","properties":{"id":{"type":"string","format":"uuid"},"fields":{"type":"object"}},"additionalProperties":false}},{"id":"category.add","label":"Show a spend category (custom ones need a schema option)","mode":"propose","input":{"type":"object","properties":{"name":{"type":"string","minLength":1,"maxLength":40}},"required":["name"],"additionalProperties":false}},{"id":"category.hide","label":"Hide a spend category from forms","mode":"propose","input":{"type":"object","properties":{"name":{"type":"string","minLength":1,"maxLength":40}},"required":["name"],"additionalProperties":false}},{"id":"source.add_to_plan","label":"Add a commitment, contract payment or tranche to the plan","mode":"propose","input":{"type":"object","properties":{"role":{"type":"string","enum":["awards","obligations","tranches"]},"record_id":{"type":"string","format":"uuid"}},"required":["role","record_id"],"additionalProperties":false}},{"id":"source.update_line","label":"Update a plan line from its changed source","mode":"propose","input":{"type":"object","properties":{"line_id":{"type":"string","format":"uuid"}},"required":["line_id"],"additionalProperties":false}},{"id":"layout.save","label":"Change screens, columns, form fields, labels and defaults","mode":"layout","input":{"type":"object","properties":{"heading":{"type":"string","minLength":1,"maxLength":100},"screens":{"type":"array","items":{"type":"string","maxLength":200}},"hide":{"type":"array","items":{"type":"string","maxLength":200}},"show":{"type":"array","items":{"type":"string","maxLength":200}},"order":{"type":"object"},"labels":{"type":"object"},"defaults":{"type":"object"}},"additionalProperties":false}}];
/* TrialAgents Runway 3.0.0 | a v2 app body (G2–G8, G11, P3–P5, P9). The kit (kit.*) and the platform styles come from the runtime.
 * Each screen reads only what it shows (records.readMany per screen, all pages of the tables the forecast needs). Edits save
 * directly with records.save from a person's own click, change or submit, with the version captured when editing started.
 * Messages go through output.notice. The calculation engine is the 2.2.1 engine, unchanged and deterministic (no clock).
 * Every action is also an app command (appCommands) that runs the same functions, so Claude and ChatGPT can do anything a click can.
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
const CHANGE_KINDS=['shift_program','scale_program','stop_program','add_position','remove_position','move_cash_in','resize_cash_in','fx_shift','add_line','stop_line','shift_line','scale_line','scale_category','shift_position','change_salary'];
const CHANGE_LABELS={shift_program:'Shift a program',scale_program:'Scale program spend',stop_program:'Stop a program',add_position:'Add a hire',remove_position:'Remove a position',move_cash_in:'Move a cash-in line',resize_cash_in:'Resize a cash-in line',fx_shift:'Exchange-rate shift',add_line:'Add a spend or cash-in line',stop_line:'Stop a line',shift_line:'Shift a line',scale_line:'Scale a line',scale_category:'Scale a category',shift_position:'Shift a hire',change_salary:'Change a salary'};
const HORIZON=60,SNAPSHOT_MONTHS=72,CHART_MONTHS=36;
const CHANGE_KEYS=['kind','target_id','months','pct','amount','currency','from_month','label','category','to_month','line_direction','line_category','line_driver','line_status','line_cash_in_type'];

/* ---------- logical schema (real keys come from tableMap) ---------- */
const ref=role=>({kind:'ref',ref:role});
const S={
 settings:[{key:'reporting_currency',label:'Reporting currency',kind:'select',options:CURRENCIES},{key:'enabled_currencies',label:'Enabled currencies (comma list)',kind:'text'},{key:'runway_target_months',label:'Runway target (months)',kind:'number'},{key:'trailing_window_months',label:'Trailing burn window (months)',kind:'number'},{key:'min_cash_reserve',label:'Minimum cash reserve',kind:'money'},{key:'loaded_cost_pct',label:'Loaded cost % on salaries',kind:'number'},{key:'opening_balance',label:'Opening bank balance',kind:'money'},{key:'opening_date',label:'Opening balance date (month end)',kind:'date'},{key:'categories',label:'Spend categories in order (comma list)',kind:'text'}],
 lines:[{key:'name',label:'Name',kind:'text',required:true},{key:'direction',label:'Direction',kind:'select',options:['spend','cash_in'],required:true},{key:'category',label:'Category',kind:'select',options:CATEGORIES,required:true},{key:'program_id',label:'Program',...ref('programs')},{key:'counterparty_id',label:'Vendor / counterparty',...ref('organizations')},{key:'agreement_id',label:'Agreement',...ref('agreements')},{key:'schedule_group',label:'Payment schedule group',kind:'text'},{key:'driver',label:'Driver',kind:'select',options:['monthly','one_off','spread'],required:true},{key:'amount',label:'Amount',kind:'money',required:true},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES,required:true},{key:'start_month',label:'Start month',kind:'month',required:true},{key:'end_month',label:'End month',kind:'month'},{key:'status',label:'Status',kind:'select',options:['committed','discretionary','contingent','received'],required:true},{key:'cash_in_type',label:'Cash-in type',kind:'select',options:CASH_IN_TYPES},{key:'notes',label:'Notes',kind:'longtext'},{key:'source_role',label:'Source',kind:'text',system:true},{key:'source_record_id',label:'Source record',kind:'text',system:true},{key:'source_version',label:'Source version',kind:'text',system:true},{key:'archived',label:'Archived',kind:'boolean'}],
 positions:[{key:'title',label:'Title',kind:'text',required:true},{key:'program_id',label:'Program',...ref('programs')},{key:'start_month',label:'Start month',kind:'month',required:true},{key:'end_month',label:'End month',kind:'month'},{key:'annual_salary',label:'Annual salary',kind:'money',required:true},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES,required:true},{key:'status',label:'Status',kind:'select',options:['current','planned'],required:true},{key:'person_id',label:'Person record ID',kind:'text'},{key:'archived',label:'Archived',kind:'boolean'}],
 milestones:[{key:'name',label:'Milestone',kind:'text',required:true},{key:'program_id',label:'Program',...ref('programs')},{key:'target_month',label:'Target month',kind:'month',required:true},{key:'source_milestone_id',label:'Programs app milestone ID',kind:'text'},{key:'archived',label:'Archived',kind:'boolean'}],
 actuals:[{key:'month',label:'Month',kind:'month',required:true},{key:'category',label:'Category',kind:'select',options:CATEGORIES,required:true},{key:'program_id',label:'Program',...ref('programs')},{key:'direction',label:'Direction',kind:'select',options:['spend','cash_in'],required:true},{key:'amount',label:'Amount',kind:'money',required:true},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES,required:true},{key:'cash_in_type',label:'Cash-in type',kind:'select',options:CASH_IN_TYPES},{key:'note',label:'Note',kind:'text'}],
 closes:[{key:'month',label:'Month',kind:'month',required:true},{key:'closing_balance',label:'Closing bank balance',kind:'money',required:true},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES,required:true},{key:'closed',label:'Closed',kind:'boolean'},{key:'commentary',label:'Commentary',kind:'longtext'},{key:'runway_months',label:'Runway (months)',kind:'number'},{key:'cash_out_month',label:'Cash-out month',kind:'date'},{key:'runway_status',label:'Runway status',kind:'select',options:['ok','below_target']},{key:'metrics',label:'Frozen metrics',kind:'frozen'},{key:'rates_used',label:'Rates used',kind:'frozen'},{key:'closed_at',label:'Closed on',kind:'date'}],
 budgets:[{key:'name',label:'Name',kind:'text',required:true},{key:'year',label:'Year',kind:'number',required:true},{key:'locked_on',label:'Locked on',kind:'date',required:true},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES,required:true},{key:'totals',label:'Frozen totals',kind:'frozen'},{key:'rates_used',label:'Rates used',kind:'frozen'},{key:'notes',label:'Notes',kind:'text'}],
 scenarios:[{key:'name',label:'Name',kind:'text',required:true},{key:'status',label:'Status',kind:'select',options:['draft','saved','adopted','archived'],required:true},{key:'changes_json',label:'Changes',kind:'frozen'},{key:'based_on_close',label:'Based on close',kind:'date'},{key:'based_on_version',label:'Forecast version',kind:'text'},{key:'created_on',label:'Created on',kind:'date'},{key:'summary',label:'Summary',kind:'longtext'}],
 changes:[{key:'scenario_id',label:'Scenario',kind:'text',required:true},{key:'kind',label:'Change',kind:'select',options:CHANGE_KINDS,required:true},{key:'target_id',label:'Target record',kind:'text'},{key:'months',label:'Months',kind:'number'},{key:'pct',label:'Percent',kind:'number'},{key:'amount',label:'Amount',kind:'money'},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES},{key:'from_month',label:'From month',kind:'month'},{key:'label',label:'Label',kind:'text'}],
 rates:[{key:'month',label:'Month',kind:'month',required:true},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES,required:true},{key:'rate_per_eur',label:'Units per 1 EUR (monthly average)',kind:'number',required:true},{key:'source',label:'Source',kind:'select',options:['ecb','manual'],required:true},{key:'source_ref',label:'Source reference',kind:'text'}],
 // Core data contract v1 (templates/core-contract/v1.json): shared workspace tables, one per role.
 programs:[{key:'name',label:'Program name',kind:'text',required:true},{key:'code',label:'Code',kind:'text'},{key:'indication',label:'Indication',kind:'text'},{key:'modality',label:'Modality',kind:'select',options:['small_molecule','biologic','antibody','cell_therapy','gene_therapy','rna','vaccine','device','other']},{key:'stage',label:'Stage',kind:'select',options:['discovery','preclinical','ind_enabling','phase_1','phase_2','phase_3','registration','approved'],required:true},{key:'lead',label:'Lead',kind:'text'},{key:'status',label:'Status',kind:'select',options:['active','paused','stopped','partnered']},{key:'archived',label:'Archived',kind:'boolean'}],
 organizations:[{key:'name',label:'Organization',kind:'text',required:true},{key:'org_type',label:'Type',kind:'select',options:['company','investor','cro','cdmo','site','funder','partner','agency','other']},{key:'country',label:'Country',kind:'text'},{key:'website',label:'Website',kind:'text'},{key:'archived',label:'Archived',kind:'boolean'}],
 agreements:[{key:'name',label:'Agreement',kind:'text',required:true},{key:'counterparty_id',label:'Counterparty',...ref('organizations')},{key:'agreement_type',label:'Agreement type',kind:'text'},{key:'status',label:'Status',kind:'text'},{key:'effective_date',label:'Effective date',kind:'date'},{key:'expiry_date',label:'Expiry date',kind:'date'},{key:'archived',label:'Archived',kind:'boolean'}],
 // Integration programs.plan_items (2.2.0): Runway's own milestone list, or the Programs app's key milestones (read only) once linked.
 programItems:[{key:'name',label:'Milestone',kind:'text',required:true},{key:'program_id',label:'Program',...ref('programs')},{key:'item_type',label:'Item type',kind:'select',options:['milestone','activity'],system:true},{key:'end_date',label:'Target month',kind:'month',required:true},{key:'status',label:'Status',kind:'select',options:['planned','in_progress','done','at_risk','cancelled']},{key:'is_key',label:'Key milestone',kind:'boolean'},{key:'archived',label:'Archived',kind:'boolean'}],
 // Integrations (2.2.0): Runway's own entries, or the providing app's records (read only) once linked. Amounts reach the plan only through Add to plan.
 awards:[{key:'organization_id',label:'Supplier',...ref('organizations')},{key:'service_type',label:'Service',kind:'select',options:['clinical_study','preclinical_study','cmc','bioanalytical','other'],required:true},{key:'program_id',label:'Program',...ref('programs')},{key:'total',label:'Awarded total',kind:'money',required:true},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES,required:true},{key:'start_date',label:'Start',kind:'date'},{key:'duration_months',label:'Duration (months)',kind:'number'},{key:'decided_on',label:'Decided on',kind:'date',required:true},{key:'agreement_id',label:'Agreement',...ref('agreements')}],
 obligations:[{key:'title',label:'Payment',kind:'text',required:true},{key:'agreement_id',label:'Agreement',...ref('agreements')},{key:'kind',label:'Kind',kind:'select',options:['payment','report','diligence_milestone','notice','delivery','publication_review','audit','insurance','royalty','other'],required:true},{key:'direction',label:'Direction',kind:'select',options:['we_owe','they_owe'],required:true},{key:'due_date',label:'Due',kind:'date'},{key:'recurrence',label:'Recurrence',kind:'select',options:['none','monthly','quarterly','annual']},{key:'amount',label:'Amount',kind:'money'},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES},{key:'status',label:'Status',kind:'select',options:['open','done','waived','missed'],required:true},{key:'verified',label:'Verified',kind:'boolean'},{key:'archived',label:'Archived',kind:'boolean'}],
 tranches:[{key:'tranche_no',label:'Tranche',kind:'number',required:true},{key:'amount',label:'Amount',kind:'money',required:true},{key:'currency',label:'Currency',kind:'select',options:CURRENCIES,required:true},{key:'condition',label:'Condition',kind:'text',required:true},{key:'expected_on',label:'Expected',kind:'date'},{key:'status',label:'Status',kind:'select',options:['expected','met','released','waived','missed'],required:true}]
};
const ROLE_LABEL={programItems:'milestone',awards:'CRO or vendor commitment',obligations:'contract payment',tranches:'financing tranche',settings:'settings',lines:'plan line',positions:'position',milestones:'milestone',actuals:'actual',closes:'month close',budgets:'budget',scenarios:'scenario',changes:'scenario change',rates:'exchange rate',programs:'program',organizations:'organization',agreements:'agreement'};
const CALC_FIELDS={settings:['reporting_currency','opening_balance','opening_date'],lines:['direction','category','driver','amount','currency','start_month','status'],positions:['start_month','annual_salary','currency','status'],milestones:['name','target_month'],actuals:['month','category','direction','amount','currency'],closes:['month','closing_balance','currency','closed'],rates:['month','currency','rate_per_eur']};

/* ---------- bindings ---------- */
/* Stable role keys (modular apps rule 5): core contract roles for shared tables, runway.* for this app's tables,
 * programs.plan_items for the Programs app output. The 2.0.0 short keys are still accepted in tableMap. */
const ROLE_KEY={settings:'runway.settings',lines:'runway.plan_lines',positions:'runway.positions',milestones:'runway.milestones',actuals:'runway.actuals',closes:'runway.month_closes',budgets:'runway.budgets',scenarios:'runway.scenarios',changes:'runway.scenario_changes',rates:'runway.fx_rates',programs:'programs',organizations:'organizations',agreements:'agreements',programItems:'programs.plan_items',awards:'croselection.awards',obligations:'contracts.obligations',tranches:'fundraise.tranches'};
let mapping={};try{mapping=JSON.parse(cfg.tableMap||'{}');}catch(e){mapping={};}
const roleMap={};
for(const role of Object.keys(S)){
 const m=mapping[ROLE_KEY[role]]||(role==='programItems'?null:mapping[role]),b=m&&bindings.find(x=>x.typeId===m.typeId);
 if(!m||!b)continue;
 const fields={};for(const f of S[role]){const k=m.fields&&m.fields[f.key]!==undefined?m.fields[f.key]:f.key;if(typeof k==='string'&&(b.fields||[]).includes(k))fields[f.key]=k;}
 const extra=(Array.isArray(m.extraFields)?m.extraFields:[]).filter(x=>x&&/^[a-z][a-z0-9_]{0,63}$/.test(x.key||'')&&(b.fields||[]).includes(x.key)&&!S[role].some(f=>f.key===x.key)).slice(0,20).map(x=>({key:x.key,label:String(x.label||x.key).slice(0,80),kind:['text','longtext','number','money','date','month','select','boolean'].includes(x.kind)?x.kind:'text',options:Array.isArray(x.options)?x.options.map(String).slice(0,50):undefined,extra:true}));
 for(const x of extra)fields[x.key]=x.key;
 roleMap[role]={typeId:m.typeId,fields,extra,writable:(Array.isArray(m.writableFields)?m.writableFields:[]).filter(x=>fields[x]).concat(extra.filter(x=>(m.writableExtra||[]).includes(x.key)).map(x=>x.key))};
}
const fieldsOf=role=>S[role].concat(roleMap[role]?roleMap[role].extra:[]);
const FORM_GROUP={lines:'line_form',positions:'position_form',milestones:'milestone_form',programItems:'milestone_form',actuals:'actual_form',settings:'settings_form'};
const LP=(()=>{try{const v=JSON.parse(cfg.layoutProfile||'{}');return {labels:v.labels||{},defaults:v.defaults||{}};}catch(e){return {labels:{},defaults:{}};}})();
const fieldLabel=(role,f)=>FORM_GROUP[role]&&LP.labels[FORM_GROUP[role]+':'+f.key]||f.label;
let callsLeft=90;
const missingCalcFields=role=>(CALC_FIELDS[role]||[]).filter(k=>!roleMap[role]||!roleMap[role].fields[k]);
const canWrite=role=>!!inp.saved&&!!inp.writable&&cfg.readOnly!==true&&!!roleMap[role]&&roleMap[role].writable.length>0;
const writableField=(role,key)=>canWrite(role)&&roleMap[role].writable.includes(key);
/* Integrations (2.2.0): where each integration's data comes from. A linked role is the other app's table and is never written. */
let INTEG=[];if(inp.saved){try{callsLeft--;const r=tools.call('integrations.list',{});INTEG=r&&Array.isArray(r.integrations)?r.integrations:[];}catch(e){INTEG=[];}}
const integ=role=>INTEG.find(x=>x.role===ROLE_KEY[role])||null;
const linked=role=>{const x=integ(role);return !!x&&x.source==='linked';};
for(const role of ['programItems','awards','obligations','tranches'])if(roleMap[role]&&linked(role))roleMap[role].writable=[];
// 2.0/2.1 tableMaps bind programs.plan_items as the Programs output: read only, never written.
if(roleMap.programItems&&roleMap.milestones)roleMap.programItems.writable=[];

/* ---------- state, layout and screens ---------- */
const st=JSON.parse(JSON.stringify(inp.state||{}));
/* G6: business choices belong to the app's owners. Editors keep every data action. */
const OWNER=inp.appRole==='owner';
const ctx=inp.context&&typeof inp.context==='object'&&!Array.isArray(inp.context)?inp.context:{};
const PER=Math.min(50,Math.max(10,num(cfg.pageSize,25)||25));
/* The declared layout (templateLayoutSchema, layoutProfile): screen order and visibility, column and form-field order,
 * hidden optional fields, labels and defaults. An assistant changes it with layout.save; a person approves it. */
const LAYOUT=(()=>{let p={};try{p=JSON.parse(cfg.layoutProfile||'{}')||{};}catch(e){p={};}
 const groups=templateLayoutSchema.groups,ids=templateLayoutSchema.screens.map(s=>s.id),cols={};
 for(const g of Object.keys(groups)){const all=groups[g].map(x=>x.id),saved=p.cols&&Array.isArray(p.cols[g])?p.cols[g].filter(k=>all.includes(k)):[];cols[g]=[...new Set(saved.concat(all))];}
 const tabs=Array.isArray(p.tabs)?p.tabs.filter(x=>ids.includes(x)):[];
 return {heading:String(p.heading||cfg.heading||'Runway').slice(0,100),tabs:[...new Set(tabs.concat(ids))],cols,visible:p.visible&&typeof p.visible==='object'?p.visible:{}};})();
const LAYOUT_SCREENS=templateLayoutSchema.screens;
const SCREEN_LABEL={overview:'Overview',cash_flow:'Cash flow',plan:'Plan',people:'People',scenarios:'Scenarios',actuals:'Monthly close',rates:'Exchange rates',programs:'Programs',organizations:'Organizations',settings:'Settings'};
/* Data lists have their own screens (G6): exchange rates, programs and organizations. Settings is for owners only. */
const DATA_SCREENS=['rates','programs','organizations'].filter(id=>roleMap[id]);
const SCREENS=(()=>{const tabs=LAYOUT.tabs.filter(id=>LAYOUT.visible[id]!==false);const main=tabs.filter(id=>id!=='settings');
 return (main.length?main:['overview']).concat(DATA_SCREENS).concat(OWNER&&tabs.includes('settings')?['settings']:[]);})();
st.screen=SCREENS.includes(st.screen)?st.screen:SCREENS[0];
st.planTab=['lines','milestones','budgets'].includes(st.planTab)?st.planTab:'lines';
st.page=Math.max(0,Math.floor(Number(st.page)||0));st.offset=Math.max(0,Math.floor(Number(st.offset)||0));st.query=String(st.query||'').slice(0,100);
st.filters=st.filters&&typeof st.filters==='object'?st.filters:{};st.view=st.view==='board'?'board':'list';
st.cf=st.cf&&typeof st.cf==='object'?st.cf:{source:'forecast',contingent:false,programs:false,page:0};
st.compare=Array.isArray(st.compare)?st.compare.slice(0,4):['forecast'];
/* G4: the program a person works on is kept across screens and visits (output.context). */
if(typeof st.program!=='string')st.program=typeof ctx.program==='string'?ctx.program.slice(0,64):'';
let NOTICE=null;
const notify=(kind,message)=>{NOTICE=kit.notice(kind,String(message||'').slice(0,300));};
const errText=e=>String(e&&e.message||e).slice(0,300);

/* ---------- events that need no data (phase A) ---------- */
function before(){const a=action,k=event.kind;
 if(a.startsWith('nav:')){const id=a.slice(4);if(SCREENS.includes(id)){st.screen=id;st.page=0;st.offset=0;st.query='';st.filters={};st.panel=null;st.drill=null;st.undo=null;st.exportOpen=false;}return true;}
 if(a.startsWith('plan:')){const t=a.slice(5);if(['lines','milestones','budgets'].includes(t)){st.planTab=t;st.page=0;st.query='';st.filters={};st.panel=null;}return true;}
 if(a==='query'&&k==='change'){st.query=String(event.value||'').slice(0,100);st.page=0;st.offset=0;return true;}
 if(a.startsWith('filter:')&&k==='change'){st.filters[a.slice(7)]=String(event.value||'');st.page=0;return true;}
 if(a==='clear-filters'){st.filters={};st.query='';st.page=0;st.offset=0;return true;}
 if(a.startsWith('page:')){st.page=Math.max(0,Math.floor((Number(a.slice(5))||0)/PER));return true;}
 if(a.startsWith('offset:')){st.offset=Math.max(0,Math.floor(Number(a.slice(7))||0));return true;}
 if(a==='context'&&k==='change'){st.program=String(event.value||'').slice(0,64);st.page=0;return true;}
 if(a==='panel:close'){st.panel=null;return true;}
 if(a.startsWith('view:')){st.view=a.slice(5)==='board'?'board':'list';return true;}
 if(a==='cf-source'&&k==='change'){st.cf.source=String(event.value||'forecast');st.cf.page=0;st.drill=null;return true;}
 if(a==='cf-contingent'&&k==='change'){st.cf.contingent=bool(event.value);return true;}
 if(a==='cf-reset'){st.cf.source='forecast';st.cf.page=0;st.drill=null;return true;}
 if(a==='cf-programs'){st.cf.programs=!st.cf.programs;return true;}
 if(a==='cf-next'){st.cf.page=(Number(st.cf.page)||0)+1;return true;}
 if(a==='cf-prev'){st.cf.page=Math.max(0,(Number(st.cf.page)||0)-1);return true;}
 if(a.startsWith('drill:')){st.drill=st.drill===a.slice(6)?null:a.slice(6);return true;}
 if(a==='close-drill'){st.drill=null;return true;}
 if(a==='toggle-export'){st.exportOpen=!st.exportOpen;return true;}
 if(a.startsWith('compare:')&&k==='change'){const id=a.slice(8),on=bool(event.value);st.compare=st.compare.filter(x=>x!==id);if(on){if(st.compare.length>=4){notify('error','Compare up to four at a time.');return true;}st.compare.push(id);}return true;}
 if(a==='toggle-archived-scenarios'){st.showArchived=!st.showArchived;return true;}
 if(a==='var-month'&&k==='change'){st.varMonth=ym(event.value);return true;}
 if(a==='lock-year'&&k==='change'){st.lockYear=String(event.value||'');return true;}
 if(a.startsWith('snapshot:')){st.panel={kind:'snapshot',id:a.slice(9)};return true;}
 if(a.startsWith('change-remove:')&&st.preview){st.preview.changes.splice(Number(a.slice(14)),1);return true;}
 if(a==='preview-discard'){st.preview=null;st.changeDraft=null;st.compare=st.compare.filter(x=>x!=='preview');return true;}
 if(a==='preview-name'&&st.preview){st.preview.name=String(form.preview_name||event.value||'').slice(0,100);return true;}
 if(a==='change-draft'){st.changeDraft={...(st.changeDraft||{}),...pick(form,CHANGE_KEYS)};return true;}
 if(a.startsWith('draft:')&&st.panel&&st.panel.kind==='edit'){st.panel.draft={...st.panel.draft,...form};return true;}
 if(a==='schedule-draft'&&st.panel&&st.panel.kind==='schedule'){scheduleDraft(form);return true;}
 if(a==='schedule-row'&&st.panel&&st.panel.kind==='schedule'){scheduleDraft(form);if(st.panel.rows.length<12)st.panel.rows.push({});return true;}
 if(a==='close-draft'&&st.panel&&st.panel.kind==='close'){st.panel={...st.panel,...form,kind:'close'};return true;}
 // G8: Undo the person's own last action. The platform checks that the records are still as the action left them.
 if(a.startsWith('undo:')){try{tools.call('undo.run',{undoId:a.slice(5)});notify('success','Undone.');}catch(e){notify('error','Could not undo: '+errText(e));}st.undo=null;return true;}
 return false;}
function scheduleDraft(f){const s=st.panel;Object.assign(s,pick(f,['name','group','category','currency','status','program_id']));s.rows=s.rows.map((r,i)=>({month:f['month_'+i]??r.month,amount:f['amount_'+i]??r.amount}));}
const HANDLED=event.kind!=='command'&&event.kind!=='open'&&event.kind!=='refresh'?before():false;

/* ---------- data: each screen reads what it shows (P3, P4) ---------- */
const ENGINE=['settings','lines','positions','milestones','programItems','actuals','closes','rates'];
const ALL_ROLES=['settings','lines','positions','milestones','actuals','closes','rates','budgets','scenarios','changes','programs','organizations','agreements','programItems','awards','obligations','tranches'];
function needed(){
 if(event.kind==='command')return ALL_ROLES;
 const s=st.screen,p=st.panel;let n=['settings'];
 if(s==='overview')n=ENGINE.concat(['programs','scenarios','changes']);
 else if(s==='cash_flow')n=ENGINE.concat(['programs','scenarios','changes','budgets']);
 else if(s==='plan')n=st.planTab==='lines'?['settings','lines','programs','organizations','agreements','awards','obligations','tranches']:st.planTab==='milestones'?['settings','milestones','programItems','programs']:ENGINE.concat(['budgets','programs']);
 else if(s==='people')n=ENGINE.concat(['programs']);
 else if(s==='scenarios')n=ENGINE.concat(['programs','scenarios','changes']);
 else if(s==='actuals')n=ENGINE.concat(['budgets','programs']);
 if(p&&p.kind==='edit'&&S[p.role]){n=n.concat([p.role]);for(const f of S[p.role])if(f.kind==='ref')n.push(f.ref);if(p.role==='lines'||p.role==='positions')n=n.concat(ENGINE);}
 if(p&&p.kind==='schedule')n=n.concat(['programs','lines']);
 return [...new Set(n)];}
const blank=role=>({rows:[],allRows:[],total:0,complete:false,unbound:!roleMap[role],unavailable:false,truncated:false,pending:false,unread:!!roleMap[role]});
const toLogical=(m,r)=>{const data={};for(const [logical,real] of Object.entries(m.fields))if(r.data&&has(r.data,real))data[logical]=r.data[real];return {id:r.id,version:r.version,data};};
/* One call for many reads; where the batch capability fails, one call each. Pending reads stay pending (shown as loading). */
function readMany(reads){if(!reads.length)return [];callsLeft-=reads.length;
 try{const out=tools.call('records.readMany',{reads});if(out&&Array.isArray(out.results)&&out.results.length===reads.length)return out.results;}catch(e){}
 return reads.map(r=>{try{return tools.call('records.read',r);}catch(e){return {unavailable:true,rows:[],total:null};}});}
const firstPage=role=>({typeId:roleMap[role].typeId,limit:100,offset:0,filters:{}});
function shape(role,pages,total){
 if(pages.some(p=>p&&p.pending))return {...blank(role),unread:false,pending:true};
 if(pages.some(p=>!p||p.unavailable))return {...blank(role),unread:false,unavailable:true};
 const m=roleMap[role],rows=[];for(const p of pages)for(const r of (Array.isArray(p.rows)?p.rows:[]))rows.push(toLogical(m,r));
 const complete=total!==null?rows.length>=total:(pages[pages.length-1].rows||[]).length<100;
 return {rows:rows.filter(r=>!bool(r.data.archived)),allRows:rows,total:total===null?rows.length:total,complete,unbound:false,unavailable:false,truncated:total!==null&&rows.length<total,pending:false,unread:false};}
/* The forecast needs every row: the first pages of a screen's tables in one or two batches (the forecast tables, then the
 * rest), then the remaining pages of a long table, up to 800 rows. A table that cannot be read completely withholds totals. */
function readRoles(list){
 const bound=ALL_ROLES.filter(r=>list.includes(r)&&roleMap[r]),first={};
 for(const group of [bound.filter(r=>ENGINE.includes(r)),bound.filter(r=>!ENGINE.includes(r))])for(let i=0;i<group.length;i+=12){const part=group.slice(i,i+12);readMany(part.map(firstPage)).forEach((p,k)=>{first[part[k]]=p;});}
 for(const role of bound){const p=first[role],pages=[p];const total=p&&!p.pending&&!p.unavailable&&p.total!==null&&p.total!==undefined&&Number.isFinite(Number(p.total))?Number(p.total):null;
  const got=p&&Array.isArray(p.rows)?p.rows.length:0;
  if(total!==null&&total>got&&got===100&&callsLeft>8){const n=Math.min(Math.ceil((total-100)/100),7);pages.push(...readMany(Array.from({length:n},(_,k)=>({typeId:roleMap[role].typeId,limit:100,offset:100*(k+1),filters:{}}))));}
  R[role]=shape(role,pages,total);}
 for(const r of ALL_ROLES)if(!R[r])R[r]=blank(r);}
/* Data lists read one sorted, searchable page at a time; the total comes from the read itself (the full table). */
function readPage(role,sort,dir){const m=roleMap[role];if(!m)return {unbound:true,rows:[],total:0};const sf=sort&&m.fields[sort];callsLeft--;
 let p;try{p=tools.call('records.read',{typeId:m.typeId,limit:PER,offset:st.offset,filters:{},...(sf?{sort:{field:sf,direction:dir||'asc'}}:{}),...(st.query?{q:st.query}:{})});}catch(e){p={unavailable:true};}
 if(p&&p.pending)return {pending:true,rows:[],total:null};if(!p||p.unavailable)return {unavailable:true,rows:[],total:null};
 const rows=(Array.isArray(p.rows)?p.rows:[]).map(r=>toLogical(m,r)),total=p.total===null||p.total===undefined?null:Number(p.total);
 R[role]={...blank(role),unread:false,rows,allRows:rows,total:total===null?rows.length:total,paged:true};return {rows,total};}
/* P3: counts over the full table, never one loaded page. */
function summarize(role,groupBy){const m=roleMap[role];if(!m||!inp.saved)return null;const g=groupBy&&m.fields[groupBy];if(groupBy&&!g)return null;
 try{const r=tools.call('records.summarize',{typeId:m.typeId,...(g?{groupBy:g}:{})});return r&&typeof r==='object'?r:null;}catch(e){return null;}}
const R={};readRoles(needed());
const PAGE=st.screen==='rates'?readPage('rates','month','desc'):st.screen==='programs'?readPage('programs','name','asc'):st.screen==='organizations'?readPage('organizations','name','asc'):null;
const PENDING=ALL_ROLES.some(r=>R[r].pending)||!!(PAGE&&PAGE.pending);
/* After a save the screen is made again from the saved data; that is when the person's last action can be offered for Undo. */
/* The server makes the saved screen again with event open; the save's message is carried over in state and shown then. */
if((event.kind==='open'||event.kind==='refresh')&&st.flash){NOTICE=kit.notice(st.flash.kind==='error'?'error':'success',String(st.flash.message||'Saved.').slice(0,300));st.flash=null;}
if((event.kind==='open'||event.kind==='refresh')&&st.justSaved&&inp.saved){st.justSaved=false;try{const u=tools.call('undo.list',{}),list=u&&(u.actions||u.entries);st.undo=Array.isArray(list)&&list[0]?{undoId:list[0].undoId,label:String(list[0].label||'last change').slice(0,80)}:null;}catch(e){st.undo=null;}}
const settingsRow=R.settings.rows[0]||null;const SET=settingsRow?settingsRow.data:{};
const C=CURRENCIES.includes(SET.reporting_currency)?SET.reporting_currency:'';
const target=num(SET.runway_target_months,18)>0?num(SET.runway_target_months,18):18;
const trailingN=[3,6].includes(num(SET.trailing_window_months,3))?num(SET.trailing_window_months,3):3;
const reserve=Math.max(0,num(SET.min_cash_reserve,0));
const loaded=num(SET.loaded_cost_pct,0);
/* Categories (2.2.0): settings.categories lists the categories shown, in order; names beyond the base list are custom categories
 * (their select option is added by a reviewed schema change). People and Other always exist. Hidden categories still count. */
const catList=String(SET.categories||'').split(',').map(x=>x.trim().slice(0,40)).filter(Boolean);
const ALLCATS=[...new Set(CATEGORIES.concat(catList))];
const enabledCats=catList.length?[...new Set(catList.concat(['People','Other']))]:CATEGORIES.slice();
for(const role of ['lines','actuals'])S[role].find(f=>f.key==='category').options=ALLCATS;
const catKey=c=>ALLCATS.includes(c)?c:'Other';
const ORDERCATS=[...new Set(enabledCats.concat(ALLCATS))];
const catColor=c=>{const i=ALLCATS.indexOf(c);return CAT_COLORS[i<0?6:i%CAT_COLORS.length];};
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

/* ---------- direct saves (P5) ---------- */
/* A person's click, change or submit saves at once (records.save, at most 50 changes); an app command buffers its changes
 * and saves them in one call, so a failing step saves nothing. Updates and deletes carry the version captured when
 * editing started. The changed value shows at once (applied to the loaded rows); the server then sends the saved screen. */
const SAVED=[];let BUFFER=null;
function save(changes,message){if(!changes.length)throw Error('There is nothing to save.');if(!inp.saved)throw Error('Save the app first; previews never write to your workspace.');
 if(BUFFER)BUFFER.push(...changes);else{if(changes.length>50)throw Error('This change touches more than 50 records. Make it in smaller steps.');tools.call('records.save',{changes});st.justSaved=true;}
 SAVED.push(message||'Saved.');notify('success',message||'Saved.');if(!BUFFER)st.flash={kind:'success',message:String(message||'Saved.').slice(0,300)};}
const propose=save;
const findRow=(role,id)=>R[role]&&R[role].allRows.find(x=>x.id===id)||null;
const lookup=findRow;
const roleOfRecord=id=>ALL_ROLES.find(r=>R[r]&&R[r].allRows.some(x=>x.id===id))||'';
function applyLocal(role,id,data){const r=findRow(role,id);if(!r)return;Object.assign(r.data,data);r.version=Number(r.version)+1;R[role].rows=R[role].allRows.filter(x=>!bool(x.data.archived));}
function dropLocal(role,id){const r=R[role];if(!r)return;const n=r.allRows.length;r.allRows=r.allRows.filter(x=>x.id!==id);r.rows=r.rows.filter(x=>x.id!==id);if(r.allRows.length<n&&Number.isFinite(r.total))r.total=Math.max(0,r.total-1);}
const nameOf=(role,r)=>String(r&&r.data&&(r.data.name||r.data.title||r.data.currency&&r.data.month&&r.data.currency+' '+monthLabel(ym(r.data.month)))||ROLE_LABEL[role]);
/* Settings hold the business choices (owners only); the opening balance and its date are data that editors keep current. */
const SETTINGS_BUSINESS=['reporting_currency','enabled_currencies','runway_target_months','trailing_window_months','min_cash_reserve','loaded_cost_pct','categories'];
function ownerCheck(role,keys){if(role==='settings'&&settingsRow&&!OWNER&&keys.some(k=>SETTINGS_BUSINESS.includes(k)))throw Error('Only an owner of this app can change the runway settings.');}
const closedMonth=m=>!!m&&R.closes.rows.some(c=>bool(c.data.closed)&&ym(c.data.month)===m);
function openEditor(role,mode,id,preset){
 if(!S[role]||!roleMap[role])throw Error('That table is not connected to this app.');
 let draft={...(preset||{})},version=null;
 if(mode!=='create'){const r=findRow(role,id);if(!r)throw Error('That record is no longer available.');draft={...r.data};version=r.version;if(mode==='duplicate'){if(draft.name!==undefined)draft.name='Copy of '+String(draft.name||'');if(draft.title!==undefined)draft.title='Copy of '+String(draft.title||'');}}
 for(const f of S[role])if(f.kind==='frozen')delete draft[f.key];
 // Existing references stay valid even when the referenced record is archived or not readable here.
 const refs={};for(const f of S[role])if(f.kind==='ref'&&draft[f.key])refs[f.key]=String(draft[f.key]);
 if(mode==='create'&&FORM_GROUP[role])for(const f of fieldsOf(role)){const v=LP.defaults[FORM_GROUP[role]+':'+f.key];if(v!==undefined&&(draft[f.key]===undefined||draft[f.key]===''))draft[f.key]=v;}
 st.panel={kind:'edit',role,mode,id:mode==='edit'?id:null,version:mode==='edit'?version:null,draft,initial:JSON.stringify(draft),refs};}
const PRESETS={lines:()=>({direction:'spend',driver:'monthly',status:'committed',currency:C,...(st.program?{program_id:st.program}:{})}),positions:()=>({status:'planned',currency:C,...(st.program?{program_id:st.program}:{})}),rates:()=>({source:'manual'}),actuals:()=>({direction:'spend',currency:C}),milestones:()=>(st.program?{program_id:st.program}:{}),programItems:()=>(st.program?{program_id:st.program}:{})};
const same=(a,b)=>JSON.stringify(a===undefined||a===''?null:a)===JSON.stringify(b===undefined||b===''?null:b);
function saveEditor(f){const x=st.panel;if(!x||x.kind!=='edit')throw Error('Nothing to save.');const {role,mode,id}=x;if(!canWrite(role))throw Error('You cannot change the '+ROLE_LABEL[role]+' table.');
 x.draft={...x.draft,...f};
 if(role==='closes'){const r=findRow('closes',id);if(!r)throw Error('That close is no longer available.');const v=String(f.commentary||'').slice(0,4000)||null;
  save([{kind:'update_record',recordId:r.id,expectedVersion:x.version,data:toReal('closes',{commentary:v})}],'Commentary saved. The frozen snapshot is unchanged.');applyLocal('closes',r.id,{commentary:v});st.panel=null;return;}
 let data=valuesFromForm(role,f,mode==='edit'?'update':'create');
 if(mode==='edit'){const r=findRow(role,id);if(!r)throw Error('This record changed or was removed. Open it again.');
  // Only the values the person changed are sent, so a concurrent edit of another field is kept.
  data=Object.fromEntries(Object.entries(data).filter(([k,v])=>!same(v,r.data[k])));if(!Object.keys(data).length){st.panel=null;notify('info','No changes to save.');return;}
  ownerCheck(role,Object.keys(data));if(role==='actuals'&&closedMonth(ym(r.data.month)))throw Error('Closed months are frozen.');
  save([{kind:'update_record',recordId:id,expectedVersion:x.version,data:toReal(role,data)}],'Saved “'+nameOf(role,r)+'”.');applyLocal(role,id,data);}
 else{if(role==='settings'&&settingsRow)throw Error('Runway settings already exist.');if(role==='actuals'&&closedMonth(ym(data.month)))throw Error('That month is closed; its actuals are frozen.');
  save([{kind:'create_record',typeId:roleMap[role].typeId,data:toReal(role,data)}],'Added '+ROLE_LABEL[role]+(data.name||data.title?' “'+String(data.name||data.title)+'”':'')+'.');}
 st.panel=null;}
function settingsSave(f){if(!OWNER)throw Error('Only an owner of this app can change the runway settings.');if(!settingsRow)throw Error('Set up the runway first.');
 const keys=Object.keys(f).filter(k=>SETTINGS_BUSINESS.includes(k)),src=pick(f,keys);
 let data=valuesFromForm('settings',src,'update');data=Object.fromEntries(Object.entries(data).filter(([k,v])=>!same(v,SET[k])));
 if(!Object.keys(data).length){notify('info','No changes to save.');return;}
 save([{kind:'update_record',recordId:settingsRow.id,expectedVersion:settingsRow.version,data:toReal('settings',data)}],'Settings saved.');applyLocal('settings',settingsRow.id,data);}
/* G5: a value edited where it is shown (kit.cell) saves at once. */
function cellEdit(){const ed=kit.edit(event,{});if(!ed)return false;
 const role=roleOfRecord(ed.recordId),r=role&&findRow(role,ed.recordId);if(!r)throw Error('That record is no longer available.');
 if(!writableField(role,ed.field))throw Error('You cannot change this value.');ownerCheck(role,[ed.field]);
 if(role==='actuals'&&closedMonth(ym(r.data.month)))throw Error('Closed months are frozen.');
 const data=valuesFromForm(role,{[ed.field]:ed.value===null||ed.value===undefined?'':ed.value},'update');if(!has(data,ed.field))throw Error('You cannot change this value.');
 if((role==='lines'||role==='positions')&&['start_month','end_month'].includes(ed.field)){const s=ym(ed.field==='start_month'?data.start_month:r.data.start_month),e=ym(ed.field==='end_month'?data.end_month:r.data.end_month);if(s&&e&&e<s)throw Error('The end month is before the start month.');if(role==='lines'&&r.data.driver==='spread'&&!e)throw Error('A spread line needs an end month.');}
 if(same(data[ed.field],r.data[ed.field]))return true;
 save([{kind:'update_record',recordId:r.id,expectedVersion:ed.version===null?r.version:ed.version,data:toReal(role,data)}],'Saved.');applyLocal(role,r.id,data);return true;}
/* Drag and drop (kit.board): a planned hire moves to current, or back. */
function boardMove(){const mv=kit.move(event,'move-position');if(!mv)return false;const r=findRow('positions',mv.cardId);if(!r)throw Error('That position is no longer available.');
 if(!['current','planned'].includes(mv.columnId))throw Error('Choose current or planned.');if(r.data.status===mv.columnId)return true;if(!writableField('positions','status'))throw Error('You cannot change positions.');
 save([{kind:'update_record',recordId:r.id,expectedVersion:r.version,data:toReal('positions',{status:mv.columnId})}],'“'+String(r.data.title||'Position')+'” is now '+mv.columnId+'.');applyLocal('positions',r.id,{status:mv.columnId});return true;}
/* Delete is an archive the person can undo (D19): nothing is removed. */
function removeRecord(role,id,version){const r=findRow(role,id);if(!r)throw Error('That record is no longer available.');if(!canWrite(role))throw Error('You cannot delete '+ROLE_LABEL[role]+'s.');
 if(role==='actuals'&&closedMonth(ym(r.data.month)))throw Error('Closed months are frozen.');
 save([{kind:'archive_record',recordId:id,expectedVersion:version===undefined||version===null||!Number.isFinite(Number(version))?r.version:Number(version)}],'Deleted “'+nameOf(role,r)+'”. It no longer counts in the forecast.');dropLocal(role,id);}
function scheduleSave(d){const group=String(d.group||d.name||'').trim();if(!String(d.name||'').trim())throw Error('Name the payment schedule.');if(!canWrite('lines'))throw Error('You cannot add plan lines.');
 const rows=(d.rows||[]).filter(r=>String(r.month??'')!==''||String(r.amount??'')!=='');if(!rows.length)throw Error('Add at least one instalment.');
 const changes=rows.map((r,i)=>({kind:'create_record',typeId:roleMap.lines.typeId,data:toReal('lines',valuesFromForm('lines',{name:String(d.name).trim()+' · instalment '+(i+1),direction:'spend',category:d.category,program_id:d.program_id||'',schedule_group:group,driver:'one_off',amount:r.amount,currency:d.currency,start_month:r.month,status:d.status},'create'))}));
 save(changes,'Payment schedule “'+String(d.name).trim()+'” added: '+plural(changes.length,'instalment')+'.');}
function dataEvents(){const a=action,k=event.kind;
 if(a.startsWith('edit:')&&k==='change')return cellEdit();
 if(boardMove())return true;
 if(a.startsWith('add:')){const role=a.slice(4);openEditor(role,'create',null,PRESETS[role]?PRESETS[role]():{});return true;}
 if(a.startsWith('open-edit:')){const [role,id]=a.slice(10).split(':');openEditor(role,'edit',id);return true;}
 if(a.startsWith('duplicate:')){const [role,id]=a.slice(10).split(':');openEditor(role,'duplicate',id);return true;}
 if(a.startsWith('delete:')){const [role,id,v]=a.slice(7).split(':');removeRecord(role,id,v);return true;}
 if(a==='setup'){if(settingsRow)openEditor('settings','edit',settingsRow.id);else openEditor('settings','create',null,{reporting_currency:'EUR',runway_target_months:18,trailing_window_months:3,loaded_cost_pct:0,min_cash_reserve:0,categories:CATEGORIES.join(', '),enabled_currencies:'EUR, USD'});return true;}
 if(a==='panel:save'&&k==='submit'){saveEditor(form);return true;}
 if(a==='settings:save'&&k==='submit'){settingsSave(form);return true;}
 if(a==='add-schedule'){st.panel={kind:'schedule',name:'',group:'',category:'Clinical',currency:C,status:'committed',program_id:st.program||'',rows:[{},{},{}]};return true;}
 if(a==='schedule-save'&&k==='submit'&&st.panel&&st.panel.kind==='schedule'){scheduleDraft(form);scheduleSave(st.panel);st.panel=null;return true;}
 return false;}
let DONE=HANDLED;
if(!DONE&&!PENDING&&event.kind!=='command'&&event.kind!=='open'&&event.kind!=='refresh'){try{DONE=dataEvents();}catch(e){notify('error',errText(e));DONE=true;}}
/* ---------- calculation engine (deterministic; no clock) ---------- */
/* Milestones: Runway's own list, plus key milestones from the Programs app output when it is connected and fully readable.
 * A Runway milestone linked by source_milestone_id follows the Programs date; when that link is unavailable it keeps
 * its own date and says so. Nothing from Programs is ever written by Runway. */
const OWN_ITEMS=!!roleMap.programItems&&!roleMap.milestones&&!linked('programItems');
const MS_ROLE=roleMap.milestones?'milestones':'programItems';
const PROGRAMS_LINK=OWN_ITEMS?'own':tableState('programItems');
const ownItems=()=>R.programItems.rows.filter(r=>(r.data.item_type||'milestone')==='milestone'&&r.data.status!=='cancelled').map(r=>({id:r.id,version:r.version,name:r.data.name,program_id:r.data.program_id||'',target_month:firstOf(ym(r.data.end_date)),_source:'runway',_role:'programItems'}));
function mergedMilestones(){
 if(OWN_ITEMS)return ownItems();
 const own=R.milestones.rows.map(r=>({id:r.id,version:r.version,...r.data,_source:'runway',_role:'milestones'}));
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
  else if(c.kind==='add_line'&&c.line&&typeof c.line==='object'){lines.push({...c.line,id:'scenario-line-'+i,_new:true});}
  else if(c.kind==='stop_line'&&c.target_id&&from){for(const l of lines)if(l.id===c.target_id)stopAt(l,from);}
  else if(c.kind==='shift_line'&&c.target_id){for(const l of lines)if(l.id===c.target_id)shift(l,['start_month','end_month'],n);}
  else if(c.kind==='scale_line'&&c.target_id){for(const l of lines)if(l.id===c.target_id&&num(l.amount)!==null)l.amount=round2(num(l.amount)*(1+pct/100));}
  else if(c.kind==='scale_category'&&c.category){for(const l of lines.slice()){if(l.direction!=='spend'||catKey(l.category)!==c.category||(c.target_id&&l.program_id!==c.target_id)||num(l.amount)===null||l._drop)continue;const s0=ym(l.start_month),e0=ym(l.end_month);
    if(!from||s0>=from){l.amount=round2(num(l.amount)*(1+pct/100));continue;}
    if(e0&&e0<from)continue;
    // A monthly line running across the start month is split: the original ends, a scaled copy continues.
    if(l.driver==='monthly'){lines.push({...l,id:'scenario-split-'+i+'-'+l.id,start_month:firstOf(from),amount:round2(num(l.amount)*(1+pct/100)),_new:true,_from:l.id});l.end_month=firstOf(addMonths(from,-1));}
    else notes.push('“'+String(l.name||'A line')+'” started before '+monthLabel(from)+' and is not monthly, so it was not scaled.');}}
  else if(c.kind==='shift_position'&&c.target_id){for(const p of positions)if(p.id===c.target_id)shift(p,['start_month','end_month'],n);}
  else if(c.kind==='change_salary'&&c.target_id){for(const p of positions)if(p.id===c.target_id&&has(p,'annual_salary')){const a=num(c.amount);p.annual_salary=a!==null?a:round2(num(p.annual_salary,0)*(1+pct/100));}}
  else notes.push('Change '+(i+1)+' is incomplete and was not applied.');
 });
 return {...D,lines,positions,milestones,fx,changeNotes:notes};
}
function engine(D0,opt){
 opt=opt||{};const D=opt.changes&&opt.changes.length?applyChanges(D0,opt.changes):{...D0,fx:{},changeNotes:[]};
 const set=D.settings||{},cur=CURRENCIES.includes(set.reporting_currency)?set.reporting_currency:'';
 const blocks=[],warns=[],excluded=[];
 const O=ym(set.opening_date),open=num(set.opening_balance);
 if(!cur)blocks.push('Choose the reporting currency of the runway.');
 if(!O)blocks.push('Enter the month-end date of the opening bank balance.');
 if(open===null)blocks.push('Enter the opening bank balance.');
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
   if(l.direction==='spend'){o.linesSpend+=v;add(catKey(l.category),l.program_id,v,ref);}
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
  if(a.direction==='spend'){const cat=catKey(a.category);o.spend[cat]=(o.spend[cat]||0)+v;const pk=a.program_id||'';(o.prog[pk]=o.prog[pk]||{})[cat]=(o.prog[pk][cat]||0)+v;o.spendTotal+=v;(o.drill[cat]=o.drill[cat]||[]).push({kind:'actual',id:a.id,name:(a.note||cat+' actual'),original:raw,currency:a.currency,converted:v,program:a.program_id||''});}
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
function readIssues(){const out=[];for(const role of ['settings','lines','positions',roleMap.milestones?'milestones':OWN_ITEMS?'programItems':'','actuals','closes','rates'].filter(Boolean)){const r=R[role];const label=ROLE_LABEL[role];
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
const jsonChanges=r=>{const v=parseJSON(r.data.changes_json);return Array.isArray(v)?v.filter(c=>c&&typeof c==='object'&&CHANGE_KINDS.includes(c.kind)).slice(0,50):null;};
const scenarioList=R.scenarios.rows.map(r=>({id:r.id,version:r.version,...r.data,changes:jsonChanges(r)||changesFor(r.id),outdated:r.data.status==='saved'&&String(r.data.based_on_version||'')!==FP}));
function describe(c){const n=Math.round(num(c.months,0)),p=num(c.pct,0),pName=progName(c.target_id);
 if(c.kind==='shift_program')return 'Shift '+pName+' by '+signed(n)+' months';
 if(c.kind==='scale_program')return 'Scale '+pName+' spend by '+signed(p)+'%';
 if(c.kind==='stop_program')return 'Stop '+pName+' from '+monthLabel(ym(c.from_month));
 if(c.kind==='add_position')return 'Add hire “'+String(c.label||'Planned hire')+'”'+(c.target_id?' in '+pName:'')+' from '+monthLabel(ym(c.from_month));
 if(c.kind==='remove_position'){const p=R.positions.rows.find(x=>x.id===c.target_id);return 'Remove '+(p?'“'+String(p.data.title||'position')+'”':'a position')+(ym(c.from_month)?' from '+monthLabel(ym(c.from_month)):'');}
 if(c.kind==='move_cash_in'){const l=R.lines.rows.find(x=>x.id===c.target_id);return 'Move '+(l?'“'+String(l.data.name)+'”':'a cash-in line')+' by '+signed(n)+' months';}
 if(c.kind==='resize_cash_in'){const l=R.lines.rows.find(x=>x.id===c.target_id);return 'Resize '+(l?'“'+String(l.data.name)+'”':'a cash-in line')+(num(c.amount)!==null?' to '+money(num(c.amount),l?l.data.currency:C2):' by '+signed(p)+'%');}
 if(c.kind==='fx_shift')return String(c.currency||'Currency')+' '+signed(p)+'% against '+C2;
 const L=()=>{const l=R.lines.rows.find(x=>x.id===c.target_id);return l?'“'+String(l.data.name)+'”':'a line';},P=()=>{const x=R.positions.rows.find(y=>y.id===c.target_id);return x?'“'+String(x.data.title||'position')+'”':'a position';};
 if(c.kind==='add_line'){const l=c.line||{};return 'Add '+(l.direction==='cash_in'?'cash in':'spend')+' “'+String(l.name||'line')+'” '+money(num(l.amount),l.currency)+' '+String(l.driver||'').replace('_','-')+' from '+monthLabel(ym(l.start_month));}
 if(c.kind==='stop_line')return 'Stop '+L()+' from '+monthLabel(ym(c.from_month));
 if(c.kind==='shift_line')return 'Shift '+L()+' by '+signed(n)+' months';
 if(c.kind==='scale_line')return 'Scale '+L()+' by '+signed(p)+'%';
 if(c.kind==='scale_category')return 'Scale '+String(c.category)+' spend'+(c.target_id?' in '+pName:'')+' by '+signed(p)+'%'+(ym(c.from_month)?' from '+monthLabel(ym(c.from_month)):'');
 if(c.kind==='shift_position')return 'Shift '+P()+' by '+signed(n)+' months';
 if(c.kind==='change_salary')return 'Change the salary of '+P()+(num(c.amount)!==null?' to '+money(num(c.amount),(R.positions.rows.find(y=>y.id===c.target_id)||{data:{}}).data.currency):' by '+signed(p)+'%');
 return 'Unknown change';}
function adoptionPlan(sc){
 const D=applyChanges(BASE,sc.changes),out=[],skipped=[];const keysOf={lines:['start_month','end_month','amount'],positions:['start_month','end_month','annual_salary'],milestones:['target_month']};
 for(const role of ['lines','positions','milestones']){for(const x of D[role]){if(x._new)continue;const tr=role==='milestones'?x._role||'milestones':role,m=roleMap[tr],realKey=k=>tr==='programItems'&&k==='target_month'?'end_date':k;if(!m)continue;if(role==='milestones'&&x._source&&x._source!=='runway'&&x._source!=='link_unavailable'){if(x.target_month!==(BASE.milestones.find(o=>o.id===x.id)||{}).target_month)skipped.push('“'+String(x.name||'Milestone')+'” is owned by the Programs app; change its date there.');continue;}const orig=BASE[role].find(o=>o.id===x.id);if(!orig)continue;const data={};
  if(x._drop){if(!m.fields.archived)throw Error('Adopting this scenario needs the archived field on '+ROLE_LABEL[tr]+'s.');data[m.fields.archived]=true;}
  for(const k of keysOf[role]){if(String(x[k]??'')!==String(orig[k]??'')){if(!m.fields[realKey(k)])throw Error('Field '+k+' is not bound.');data[m.fields[realKey(k)]]=x[k]===''?null:x[k];}}
  if(Object.keys(data).length)out.push({kind:'update_record',recordId:x.id,expectedVersion:orig.version,data});}}
 for(const x of D.lines.filter(l=>l._new))out.push({kind:'create_record',typeId:roleMap.lines.typeId,data:toReal('lines',pick(x,['name','direction','category','program_id','counterparty_id','agreement_id','driver','amount','currency','start_month','end_month','status','cash_in_type','notes']))});
 for(const x of D.positions.filter(p=>p._new))out.push({kind:'create_record',typeId:roleMap.positions.typeId,data:toReal('positions',{title:x.title,program_id:x.program_id||null,start_month:x.start_month,annual_salary:x.annual_salary,currency:x.currency,status:'planned',archived:false})});
 for(const c of sc.changes)if(c.kind==='fx_shift')skipped.push(describe(c)+' is an assumption about rates and is not written to the forecast.');
 const s=R.scenarios.rows.find(r=>r.id===sc.id);if(s)out.push({kind:'update_record',recordId:s.id,expectedVersion:s.version,data:{[roleMap.scenarios.fields.status]:'adopted'}});
 if(out.length>50)throw Error('This scenario changes more than 50 records. Ask the assistant to adopt it in smaller reviewed parts.');
 return {changes:out,skipped};}

/* ---------- other sources (2.2.0 integrations) ---------- */
/* Commitments, contract payments and financing tranches: Runway's own entries, or the providing app's records once linked.
 * Amounts reach the forecast only through Add to plan, which copies the values into a Runway plan line with its source. */
const SRC_ROLES=['awards','obligations','tranches'];
const SRC_NAME={awards:'CRO and vendor commitments',obligations:'Contract payments',tranches:'Expected financing'};
const roleOfKey=k=>Object.keys(ROLE_KEY).find(r=>ROLE_KEY[r]===k)||'';
function sourceItem(role,x){const d=x.data,base={role,id:x.id,version:x.version};
 if(role==='awards'){const svc=String(d.service_type||'other'),name=(refName('organizations',d.organization_id,'supplier')+' · '+svc.replace(/_/g,' ')).slice(0,200),start=ym(d.start_date)||ym(d.decided_on),dur=Math.max(1,Math.round(num(d.duration_months,1)));
  if(num(d.total)===null||!start||!CURRENCIES.includes(d.currency))return {...base,name,invalid:'Needs a total, a currency and a start or decision date.'};
  return {...base,name,line:{name,direction:'spend',category:{clinical_study:'Clinical',preclinical_study:'Research',cmc:'CMC',bioanalytical:'Research'}[svc]||'Other',program_id:d.program_id||'',counterparty_id:d.organization_id||'',agreement_id:d.agreement_id||'',driver:dur>1?'spread':'one_off',amount:num(d.total),currency:d.currency,start_month:start,end_month:dur>1?addMonths(start,dur-1):'',status:'committed'}};}
 if(role==='obligations'){if(d.kind!=='payment'||d.status!=='open'||bool(d.archived)||(linked(role)&&!bool(d.verified)))return null;const name=String(d.title||'Contract payment').slice(0,200),due=ym(d.due_date),inflow=d.direction==='they_owe';
  if(num(d.amount)===null||!due||!CURRENCIES.includes(d.currency))return {...base,name,invalid:'Needs an amount, a currency and a due date.'};
  return {...base,name,line:{name,direction:inflow?'cash_in':'spend',category:'Other',agreement_id:d.agreement_id||'',driver:d.recurrence==='monthly'?'monthly':'one_off',amount:num(d.amount),currency:d.currency,start_month:due,end_month:'',status:'committed',...(inflow?{cash_in_type:'partnership'}:{})}};}
 if(['waived','missed'].includes(d.status))return null;const name=('Tranche '+(num(d.tranche_no)??'')+(d.condition?' · '+d.condition:'')).slice(0,200),m=ym(d.expected_on);
 if(num(d.amount)===null||!m||!CURRENCIES.includes(d.currency))return {...base,name,invalid:'Needs an amount, a currency and an expected date.'};
 return {...base,name,line:{name,direction:'cash_in',category:'Other',driver:'one_off',amount:num(d.amount),currency:d.currency,start_month:m,end_month:'',status:d.status==='released'?'received':d.status==='met'?'committed':'contingent',cash_in_type:'equity'}};}
const planLineFor=(role,id)=>R.lines.rows.find(l=>l.data.source_role===ROLE_KEY[role]&&l.data.source_record_id===id)||null;
function sourceList(role){if(!roleMap[role])return [];return R[role].rows.map(x=>sourceItem(role,x)).filter(Boolean).map(it=>{const l=planLineFor(role,it.id);return {...it,lineId:l?l.id:null,state:it.invalid?'incomplete':!l?'available':String(l.data.source_version??'')!==String(it.version)?'changed':'in_plan'};});}
function lineSource(r){const role=roleOfKey(r.data.source_role);if(!role||!r.data.source_record_id)return '';const x=R[role]&&R[role].allRows.find(y=>y.id===r.data.source_record_id);return !x||bool(x.data.archived)?'unavailable':String(r.data.source_version??'')!==String(x.version)?'changed':'ok';}
function addToPlan(role,id){if(!SRC_ROLES.includes(role))throw Error('Choose commitments, contract payments or tranches.');if(!canWrite('lines'))throw Error('You cannot add plan lines.');
 const it=sourceList(role).find(x=>x.id===id);if(!it)throw Error('That entry is not available.');if(it.invalid)throw Error(it.invalid);if(it.lineId)throw Error('“'+it.name+'” is already in the plan.');
 const data=valuesFromForm('lines',{...it.line,end_month:it.line.end_month||''},'create');data.source_role=ROLE_KEY[role];data.source_record_id=id;data.source_version=String(it.version);
 propose([{kind:'create_record',typeId:roleMap.lines.typeId,data:toReal('lines',data)}],'“'+it.name+'” added to the plan.');}
function updateFromSource(lineId){const l=R.lines.rows.find(x=>x.id===lineId);if(!l)throw Error('Plan line not found.');const role=roleOfKey(l.data.source_role),it=role&&sourceList(role).find(x=>x.id===l.data.source_record_id);
 if(!it)throw Error('The source of this line is no longer available. The line keeps its values.');if(it.invalid)throw Error(it.invalid);if(it.state!=='changed')throw Error('The line already matches its source.');
 const v=valuesFromForm('lines',{...it.line,end_month:it.line.end_month||''},'create'),data={};for(const k of ['direction','driver','amount','currency','start_month','end_month','status','cash_in_type'])if(String(v[k]??'')!==String(l.data[k]??''))data[k]=v[k]??null;data.source_version=String(it.version);
 propose([{kind:'update_record',recordId:l.id,expectedVersion:l.version,data:toReal('lines',data)}],'“'+String(l.data.name)+'” updated from its source.');}
function sourcesResult(){return {roles:SRC_ROLES.filter(r=>roleMap[r]).map(r=>{const x=integ(r);return {role:ROLE_KEY[r],name:SRC_NAME[r],source:x?x.source:'own',from:x&&x.writer?x.writer.appName:null,items:sourceList(r).map(it=>({id:it.id,name:it.name,state:it.state,line_id:it.lineId,...(it.invalid?{problem:it.invalid}:{amount:it.line.amount,currency:it.line.currency,month:it.line.start_month,direction:it.line.direction})}))};})};}
/* ---------- writes ---------- */
function toReal(role,data){const m=roleMap[role];if(!m)throw Error('The '+ROLE_LABEL[role]+' table is not bound.');const out={};for(const [k,v] of Object.entries(data)){if(v===undefined)continue;if(!m.fields[k])continue;if(!m.writable.includes(k))throw Error('You cannot edit '+k+' in the '+ROLE_LABEL[role]+' table.');out[m.fields[k]]=v;}return out;}
function valuesFromForm(role,source,mode){
 const out={};const m=roleMap[role];
 for(const f of fieldsOf(role)){
  if(f.kind==='frozen'||f.key==='archived')continue;
  if(!m||!m.fields[f.key]||!m.writable.includes(f.key))continue;
  if(!has(source,f.key)){if(mode==='create'&&f.required)throw Error('Required field: '+f.label);continue;}
  let v=source[f.key];if(typeof v==='string')v=v.trim();
  if(v===''||v===null){if(f.required)throw Error('Required field: '+f.label);out[f.key]=null;continue;}
  if(f.kind==='number'||f.kind==='money'){const n=Number(v);if(!Number.isFinite(n))throw Error('Enter a number for '+f.label+'.');if(f.kind==='money'&&n<0&&!(role==='changes'))throw Error(f.label+' cannot be negative; direction comes from the line type.');out[f.key]=n;}
  else if(f.kind==='month'){const mm=ym(v);if(!mm)throw Error('Use a valid month for '+f.label+' (YYYY-MM).');out[f.key]=firstOf(mm);}
  else if(f.kind==='date'){const d=validDate(v);if(!d)throw Error('Use a valid date for '+f.label+' (YYYY-MM-DD).');out[f.key]=d;}
  else if(f.kind==='select'){if(f.options&&!f.options.includes(String(v)))throw Error('Choose a valid '+f.label+'.');out[f.key]=String(v);}
  else if(f.kind==='boolean')out[f.key]=bool(v);
  else if(f.kind==='ref'){const kept=st.panel&&st.panel.refs&&st.panel.refs[f.key]===String(v);const ok=kept||(R[f.ref].rows||[]).some(r=>r.id===v);if(!ok)throw Error('Choose an existing '+f.label+'.');out[f.key]=String(v);}
  else out[f.key]=String(v).slice(0,f.kind==='longtext'?4000:500);
 }
 if(role==='lines'||role==='positions'){const s=ym(out.start_month??source.start_month),e=ym(out.end_month??source.end_month);if(s&&e&&e<s)throw Error('The end month is before the start month.');if(role==='lines'&&(out.driver??source.driver)==='spread'&&!e)throw Error('A spread line needs an end month.');}
 if(role==='lines'&&(out.direction??source.direction)==='cash_in'&&!(out.cash_in_type??source.cash_in_type))throw Error('Choose a cash-in type: equity, grant, partnership and tax credit are financing; other is operating cash in.');
 if(role==='settings'){const t=out.trailing_window_months;if(t!==undefined&&t!==null&&![3,6].includes(t))throw Error('The trailing window must be 3 or 6 months.');}
 if(role==='rates'&&out.rate_per_eur!==undefined&&!(out.rate_per_eur>0))throw Error('The rate must be greater than zero.');
 if(mode==='create'&&m&&m.fields.archived&&m.writable.includes('archived'))out.archived=false;
 if(role==='programItems'&&mode==='create'&&m&&m.writable.includes('item_type'))out.item_type='milestone';
 return out;}
/* One scenario record (2.2.0): its changes are stored with it. Saved scenarios carry the forecast fingerprint; drafts do not. */
function saveScenario(name,changes,status,draft){if(!changes.length)throw Error('Add at least one change before saving.');if(changes.length>50)throw Error('A scenario can hold 50 changes.');if(!canWrite('scenarios')||!writableField('scenarios','changes_json'))throw Error('You cannot save scenarios.');
 if(scenarioList.some(x=>x.name===name&&x.status!=='archived'&&(!draft||x.id!==draft.id)))throw Error('A scenario named “'+name+'” already exists. Choose another name.');
 const saved=status==='saved',data={name,status,changes_json:JSON.stringify(changes),summary:changes.map(describe).join('; ').slice(0,4000),created_on:firstOf(model.A),based_on_close:saved?firstOf(model.A):null,based_on_version:saved?FP:null};
 if(draft)propose([{kind:'update_record',recordId:draft.id,expectedVersion:draft.version,data:toReal('scenarios',data)}],'Scenario “'+name+'” saved'+(saved?'; it can now be adopted.':' as a draft.'));
 else propose([{kind:'create_record',typeId:roleMap.scenarios.typeId,data:toReal('scenarios',data)}],(saved?'Scenario':'Draft scenario')+' “'+name+'” saved with '+plural(changes.length,'change')+'.');}

/* ---------- actions that need the forecast (phase C) ---------- */
/* Lock a year as budget: one frozen record with monthly totals by category and program, and the rates used. */
function lockBudget(y){if(!exact)throw Error('Locking needs complete, valid data. Fix the items under Needs attention on Overview first.');if(!/^\d{4}$/.test(String(y||'')))throw Error('Choose a year.');
 if(budgetsAll.some(b=>String(num(b.row.data.year,0))===y&&b.row.data.currency===C2))throw Error('A budget for '+y+' is already locked and cannot be edited.');if(!canWrite('budgets'))throw Error('You cannot create budgets.');
 const b=budgetTotals(model,y);if(b.missing.length)throw Error(excludedText(b.missing)+' Add the rates before locking.');
 save([{kind:'create_record',typeId:roleMap.budgets.typeId,data:toReal('budgets',{name:'Budget '+y,year:Number(y),locked_on:firstOf(model.A),currency:C2,totals:JSON.stringify(b.totals),rates_used:JSON.stringify(b.rates),notes:'Locked from the live forecast as of '+monthLabel(model.A)+'.'})}],'Budget '+y+' locked. It stays frozen; later edits to lines do not change it.');st.lockYear='';}
/* Monthly close: the actuals of the month and one frozen snapshot, in one save. Months close in order. */
function closeMonth(d){const m=ym(d.month);
 if(!exact)throw Error('Fix the items under Needs attention on Overview before closing a month.');
 if(!m||m<=model.A)throw Error('Choose a month after '+monthLabel(model.A)+'.');if(m!==addMonths(model.A,1))throw Error('Close months in order: the next month to close is '+monthLabel(addMonths(model.A,1))+'.');
 if(!canWrite('closes')||!canWrite('actuals'))throw Error('You cannot close months.');
 const bal=num(d.closing_balance);if(bal===null)throw Error('Enter the closing bank balance.');const cur=CURRENCIES.includes(d.currency)?d.currency:C2;
 const newActuals=[],existing=BASE.actuals.filter(a=>ym(a.month)===m);
 for(const cat of enabledCats){const v=d['actual_'+cat];if(v===undefined||String(v).trim()==='')continue;if(existing.some(a=>a.direction==='spend'&&a.category===cat))continue;const n=Number(v);if(!Number.isFinite(n)||n<0)throw Error('Enter a non-negative amount for '+cat+'.');newActuals.push({month:firstOf(m),category:cat,direction:'spend',amount:n,currency:cur});}
 if(String(d.cash_in_amount??'').trim()!==''){const n=Number(d.cash_in_amount);if(!Number.isFinite(n)||n<0)throw Error('Enter a non-negative cash-in amount.');const t=CASH_IN_TYPES.includes(d.cash_in_type)?d.cash_in_type:'';if(!t)throw Error('Choose the cash-in type.');newActuals.push({month:firstOf(m),category:'Other',direction:'cash_in',amount:n,currency:cur,cash_in_type:t});}
 if(!existing.length&&!newActuals.length)throw Error('Enter at least one actual for '+monthLabel(m)+'.');
 const D=dataset({actuals:BASE.actuals.concat(newActuals.map((a,i)=>({id:'new-'+i,...a}))),closes:BASE.closes.concat([{id:'new-close',month:firstOf(m),closing_balance:bal,currency:cur,closed:true}])});
 const after=engine(D);if(!after.ready)throw Error('The close cannot be calculated: '+after.blocks.join(' '));if(after.excluded.some(x=>x.month===m))throw Error(excludedText(after.excluded.filter(x=>x.month===m))+' Add the rate before closing.');
 const b=budgetFor(m),metrics=snapshotMetrics(after,b),status=!after.runway.beyond&&after.runway.months<target?'below_target':'ok';
 const changes=newActuals.map(a=>({kind:'create_record',typeId:roleMap.actuals.typeId,data:toReal('actuals',a)}));
 changes.push({kind:'create_record',typeId:roleMap.closes.typeId,data:toReal('closes',{month:firstOf(m),closing_balance:bal,currency:cur,closed:true,commentary:String(d.commentary||'').slice(0,4000)||null,runway_months:after.runway.months,cash_out_month:after.runway.beyond?null:firstOf(after.runway.cashOut),runway_status:status,metrics:JSON.stringify(metrics),rates_used:JSON.stringify(ratesUsed(after,[m].concat(after.months.slice(0,1).map(x=>x.m)))),closed_at:lastDay(m)})});
 save(changes,monthLabel(m)+' closed: '+plural(newActuals.length,'actual')+' and a frozen snapshot. Runway '+runwayText(after.runway)+'.');st.varMonth=m;}
function adoptScenario(id){const sc=scenarioList.find(s=>s.id===id);if(!sc)throw Error('Scenario not found.');if(sc.status!=='saved')throw Error('Only saved scenarios can be adopted.');
 if(sc.outdated)throw Error('The forecast changed after this scenario was saved. Copy it to a new what-if and save it again before adopting.');if(!sc.changes.length)throw Error('This scenario has no saved changes.');
 if(!canWrite('lines')||!canWrite('scenarios'))throw Error('You cannot adopt scenarios.');
 const plan=adoptionPlan(sc);save(plan.changes,'“'+sc.name+'” adopted: '+plural(plan.changes.length,'record')+' changed in the live forecast.');return plan.skipped;}
function archiveScenario(id){const sc=R.scenarios.rows.find(s=>s.id===id);if(!sc)throw Error('Scenario not found.');if(!writableField('scenarios','status'))throw Error('You cannot change scenarios.');
 save([{kind:'update_record',recordId:sc.id,expectedVersion:sc.version,data:toReal('scenarios',{status:'archived'})}],'Scenario “'+String(sc.data.name||'')+'” archived. It stays readable under Show archived.');}
function forecastEvents(){const a=action,k=event.kind;
 if(a==='open-close'){if(!exact)throw Error('Fix the items under Needs attention on Overview before closing a month.');if(!canWrite('closes'))throw Error('You cannot close months.');st.panel={kind:'close',month:addMonths(model.A,1),currency:C2};return true;}
 if(a==='close-submit'&&k==='submit'){const d={...(st.panel&&st.panel.kind==='close'?st.panel:{}),...form};st.panel={...d,kind:'close'};closeMonth(d);st.panel=null;return true;}
 if(a.startsWith('commentary:')){openEditor('closes','edit',a.slice(11));return true;}
 if(a==='lock-budget'){lockBudget(String(form.year||st.lockYear||event.value||''));return true;}
 if(a==='preview-new'){st.preview={name:'What-if '+(scenarioList.length+1),changes:[]};st.changeDraft={kind:'shift_program'};return true;}
 if(a.startsWith('preview-from:')){const sc=scenarioList.find(s=>s.id===a.slice(13));if(!sc)throw Error('Scenario not found.');st.preview={name:sc.status==='draft'?sc.name:'Copy of '+sc.name,changes:sc.changes.map(c=>pick(c,['kind','target_id','months','pct','amount','currency','from_month','label','category','line'])),...(sc.status==='draft'?{fromDraft:sc.id}:{})};st.changeDraft={kind:'shift_program'};return true;}
 if(a==='change-add'){const d={...(st.changeDraft||{}),...pick(form,CHANGE_KEYS)};st.changeDraft=d;if(form.preview_name!==undefined&&st.preview)st.preview.name=String(form.preview_name).slice(0,100);const c=normalizeChange(d);if(!st.preview)st.preview={name:'What-if '+(scenarioList.length+1),changes:[]};if(st.preview.changes.length>=12)throw Error('A what-if holds up to 12 changes.');st.preview.changes.push(c);st.changeDraft={kind:d.kind};return true;}
 if(a==='preview-save'){if(!st.preview||!st.preview.changes.length)throw Error('Add at least one change before saving.');const name=String(form.preview_name||st.preview.name||'').trim().slice(0,100)||'What-if';st.preview.name=name;
  saveScenario(name,st.preview.changes,'saved',st.preview.fromDraft?scenarioList.find(x=>x.id===st.preview.fromDraft&&x.status==='draft')||null:null);st.preview=null;st.changeDraft=null;return true;}
 if(a.startsWith('adopt:')){adoptScenario(a.slice(6));return true;}
 if(a.startsWith('scenario-archive:')){archiveScenario(a.slice(17));return true;}
 if(a.startsWith('source-add:')){const [role,id]=a.slice(11).split(':');addToPlan(role,id);return true;}
 if(a.startsWith('source-update:')){updateFromSource(a.slice(14));return true;}
 return false;}
if(!DONE&&!PENDING&&event.kind!=='command'&&event.kind!=='open'&&event.kind!=='refresh'){try{forecastEvents();}catch(e){notify('error',errText(e));}}
function pick(o,keys){const r={};for(const k of keys)if(has(o,k))r[k]=o[k];return r;}
function normalizeChange(d){
 const kind=String(d.kind||'');if(!CHANGE_KINDS.includes(kind))throw Error('Choose a change type.');const c={kind};
 const needTarget=['shift_program','scale_program','stop_program','remove_position','move_cash_in','resize_cash_in','stop_line','shift_line','scale_line','shift_position','change_salary'];
 if(needTarget.includes(kind)){if(!d.target_id)throw Error('Choose what the change applies to.');c.target_id=String(d.target_id);}
 if(kind==='add_position'&&d.target_id)c.target_id=String(d.target_id);
 if(['stop_line','shift_line','scale_line'].includes(kind)&&!R.lines.rows.some(r=>r.id===c.target_id))throw Error('Choose an existing plan line.');
 if(['shift_position','change_salary'].includes(kind)&&!R.positions.rows.some(r=>r.id===c.target_id))throw Error('Choose an existing position.');
 if(['shift_program','move_cash_in','shift_line','shift_position'].includes(kind)){const n=Math.round(Number(d.months));if(!Number.isFinite(n)||n===0||Math.abs(n)>36)throw Error('Enter a shift between −36 and 36 months.');c.months=n;}
 if(['scale_program','fx_shift','scale_line','scale_category'].includes(kind)||(kind==='change_salary'&&String(d.amount??'').trim()==='')){const p=Number(d.pct);if(!Number.isFinite(p)||p<-100||p>500||p===0)throw Error('Enter a percentage between −100 and 500.');c.pct=p;}
 if(kind==='resize_cash_in'){const a=Number(d.amount);if(String(d.amount??'').trim()===''||!Number.isFinite(a)||a<0)throw Error('Enter the new amount.');c.amount=a;}
 if(kind==='change_salary'&&String(d.amount??'').trim()!==''){if(salaryRestricted)throw Error('Salaries are restricted for you.');const a=Number(d.amount);if(!Number.isFinite(a)||a<0)throw Error('Enter the new annual salary.');c.amount=a;}
 if(kind==='scale_category'){const cat=String(d.category||'');if(!ALLCATS.includes(cat)||cat==='People')throw Error('Choose a spend category (people cost is changed through positions).');c.category=cat;if(d.target_id)c.target_id=String(d.target_id);}
 if(kind==='add_line'){const src=d.line&&typeof d.line==='object'?d.line:{name:d.label,direction:d.line_direction||'spend',category:d.line_category||'Other',program_id:d.target_id||'',driver:d.line_driver||'monthly',amount:d.amount,currency:d.currency||C2,start_month:d.from_month,end_month:d.to_month||'',status:d.line_status||'committed',cash_in_type:d.line_cash_in_type||''};const v=valuesFromForm('lines',{...src,end_month:src.end_month||''},'create');delete v.archived;for(const k of ['source_role','source_record_id','source_version'])delete v[k];c.line=v;}
 if(['stop_program','add_position','stop_line'].includes(kind)||(['remove_position','scale_category'].includes(kind)&&String(d.from_month||'')!=='')){const m=ym(d.from_month);if(!m)throw Error('Choose a month.');c.from_month=firstOf(m);}
 if(kind==='add_position'){const a=Number(d.amount);if(String(d.amount??'').trim()===''||!Number.isFinite(a)||a<0)throw Error('Enter the annual salary.');c.amount=a;c.currency=CURRENCIES.includes(d.currency)?d.currency:C2;c.label=String(d.label||'Planned hire').slice(0,100);}
 if(kind==='fx_shift'){if(!CURRENCIES.includes(d.currency)||d.currency===C2)throw Error('Choose a currency other than '+C2+'.');c.currency=d.currency;}
 return c;}

/* ---------- presentation (the kit and a few chart styles of the app's own) ---------- */
const btn=(label,a,o)=>kit.button(label,a,o||{});
function pill(label,tone){return '<span class="k-pill'+(tone?' rw-'+tone:'')+'">'+esc(label)+'</span>';}
function cushionTone(c){return !c?'':c.beyond||c.months>=6?'green':c.months>=3?'amber':'red';}
function cushionText(c){return !c?'—':c.beyond?'≥ '+plural(c.months,'month'):plural(c.months,'month');}
function runwayText(r){return !r?'—':r.beyond?'> '+r.months+' months':plural(r.months,'month');}
const fmtMonth=v=>ym(v)?monthLabel(ym(v)):'—';
const card=(title,body,o)=>{o=o||{};return '<section class="k-card rw-card"'+(o.label?' aria-label="'+esc(o.label)+'"':'')+'>'+(title?'<div class="rw-head"><div class="k-grow"><h2>'+esc(title)+'</h2>'+(o.sub?'<p class="k-muted k-small">'+esc(o.sub)+'</p>':'')+'</div>'+(o.actions?'<div class="k-row">'+o.actions+'</div>':'')+'</div>':'')+body+'</section>';};
const loading=what=>'<section class="k-card rw-card" aria-busy="true"><p class="k-muted">Loading '+esc(what)+'…</p></section>';
const muted=t=>'<p class="k-muted k-small">'+esc(t)+'</p>';
const simpleTable=(head,rows,o)=>'<div class="k-table-wrap"'+(o&&o.label?' role="region" tabindex="0" aria-label="'+esc(o.label)+'"':'')+'><table class="k-table'+(o&&o.compact?' rw-compact':'')+'"><thead><tr>'+head.map(h=>'<th scope="col"'+(h.num?' class="num"':'')+'>'+esc(h.label)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map((c,i)=>'<td data-label="'+esc(head[i].label)+'"'+(head[i].num?' class="num"':'')+'>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
function tableFallback(caption,head,rows){return '<details class="rw-fallback"><summary>Show the values as a table</summary>'+simpleTable(head.map((h,i)=>({label:h,num:i>0})),rows.map(r=>r.map(c=>esc(c))),{label:caption,compact:true})+'</details>';}

/* ---------- charts ---------- */
function cashChart(series,opts){
 opts=opts||{};const hist=(opts.history||[]).slice(-6);const first=hist.length?hist[0].m:(series[0]&&series[0].points[0]?series[0].points[0].m:'');if(!first)return muted('No cash curve yet: enter the opening balance, the reporting currency and plan lines.');
 const last=addMonths(model.A||first,CHART_MONTHS),xs=[];for(let m=first;m<=last;m=addMonths(m,1))xs.push(m);
 const vals=[];for(const h of hist)vals.push(h.cash);for(const s of series)for(const p of s.points)if(p.m<=last&&Number.isFinite(p.cash))vals.push(p.cash);if(reserve)vals.push(reserve);if(!vals.length)return muted('No values to plot.');
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
 if(!cols.length)return muted('No burn to show yet: close a month or add plan lines.');
 const cats=ORDERCATS.filter(c=>cols.some(x=>x.spend[c]));const tot=cols.map(x=>cats.reduce((n,c)=>n+(x.spend[c]||0),0)-(x.opIn||0));
 const hi=Math.max(1,...cols.map(x=>cats.reduce((n,c)=>n+(x.spend[c]||0),0)));const step=Math.pow(10,Math.floor(Math.log10(hi)));const top=Math.ceil(hi/step)*step;
 const w=900,h=260,l=70,r=16,t=16,b=44,bw=(w-l-r)/cols.length;const yy=v=>t+(top-v)/top*(h-t-b);let out='';
 for(let i=0;i<=4;i++){const v=top*i/4;out+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+yy(v).toFixed(1)+'" y2="'+yy(v).toFixed(1)+'" stroke="#E3E9EF"/><text x="'+(l-8)+'" y="'+(yy(v)+4).toFixed(1)+'" text-anchor="end" fill="#5B6B7C" font-size="11">'+esc(compact(v))+'</text>';}
 cols.forEach((x,i)=>{let y=0;const x0=l+i*bw+bw*0.18,ww=bw*0.64;for(const c of cats){const v=x.spend[c]||0;if(!v)continue;const y1=yy(y+v),y0=yy(y);out+='<rect x="'+x0.toFixed(1)+'" y="'+y1.toFixed(1)+'" width="'+ww.toFixed(1)+'" height="'+Math.max(0,y0-y1).toFixed(1)+'" fill="'+catColor(c)+'"'+(x.forecast?' opacity="0.55"':'')+'><title>'+esc(c+' · '+monthLabel(x.m)+' · '+money(v)+(x.forecast?' (forecast)':' (actual)'))+'</title></rect>';y+=v;}
  if(x.forecast)out+='<rect x="'+x0.toFixed(1)+'" y="'+yy(y).toFixed(1)+'" width="'+ww.toFixed(1)+'" height="'+Math.max(0,yy(0)-yy(y)).toFixed(1)+'" fill="none" stroke="#5B6B7C" stroke-dasharray="3 3"/>';
  if(i%Math.max(1,Math.ceil(cols.length/9))===0)out+='<text x="'+(x0+ww/2).toFixed(1)+'" y="'+(h-18)+'" text-anchor="middle" fill="#5B6B7C" font-size="11">'+esc(shortMonth(x.m))+'</text>';});
 const split=cols.findIndex(x=>x.forecast);if(split>0)out+='<line x1="'+(l+split*bw).toFixed(1)+'" x2="'+(l+split*bw).toFixed(1)+'" y1="'+t+'" y2="'+(h-b)+'" stroke="#9AA7B4" stroke-dasharray="2 4"/><text x="'+(l+split*bw+4).toFixed(1)+'" y="'+(t+10)+'" fill="#5B6B7C" font-size="10">Forecast</text>';
 const legend='<div class="rw-legend">'+cats.map(c=>'<span><i style="background:'+catColor(c)+'"></i>'+esc(c)+'</span>').join('')+'<span><i class="dash"></i>Forecast (lighter, dashed outline)</span></div>';
 return '<svg class="rw-chart" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Monthly spend by category in '+esc(C2)+': actual months solid, forecast months lighter with a dashed outline.">'+out+'</svg>'+legend+tableFallback('Monthly spend by category ('+C2+')',['Month','Type'].concat(cats).concat(['Net burn']),cols.map((x,i)=>[monthLabel(x.m),x.forecast?'Forecast':'Actual'].concat(cats.map(c=>grouped(Math.round(x.spend[c]||0)))).concat([grouped(Math.round(tot[i]))])));
}

function sentence(m){
 if(!m.runway)return '';const r=m.runway;
 if(r.beyond)return 'Cash lasts beyond '+monthLabel(r.lastsUntil)+', the end of the '+HORIZON+'-month forecast.';
 const reached=m.milestones.filter(x=>!x.passed&&x.m<=r.lastsUntil),next=m.milestones.find(x=>!x.passed&&x.m>r.lastsUntil);
 if(reached.length){const x=reached[reached.length-1],gap=diffMonths(x.m,r.lastsUntil);return 'Cash lasts until '+monthLabel(r.lastsUntil)+(gap?', '+plural(gap,'month')+' after '+x.name+'.':', the month of '+x.name+'.');}
 if(next)return 'Cash lasts until '+monthLabel(r.lastsUntil)+', '+plural(diffMonths(r.lastsUntil,next.m),'month')+' before '+next.name+'.';
 return 'Cash lasts until '+monthLabel(r.lastsUntil)+'.';}
function exceptions(){const ex=[];const next=addMonths(model.A,1);
 if(model.A&&BASE.actuals.some(a=>ym(a.month)===next))ex.push([monthLabel(next)+' has actuals but is not closed.','nav:actuals','Close month']);
 for(const w of model.warns.filter(w=>/is not closed\./.test(w)))ex.push([w,'nav:actuals','Actuals']);
 if(model.excluded.length)ex.push([excludedText(model.excluded),'nav:rates','Add rates']);
 if(st.preview&&st.preview.changes.length)ex.push(['Unsaved scenario preview “'+st.preview.name+'”.','nav:scenarios','Review']);
 const out=scenarioList.filter(s=>s.status==='saved'&&s.outdated);if(out.length)ex.push([plural(out.length,'saved scenario')+' outdated by forecast changes.','nav:scenarios','Review']);
 if(model.runway&&!model.runway.beyond&&model.runway.months<target)ex.push(['Runway is below the '+target+'-month target.','nav:scenarios','What-if']);
 return ex;}

/* Short explanations when a partner table is missing (rule 3): never an error, never presented as complete. */
function programsLinkNote(){if(PROGRAMS_LINK==='ok')return '';
 if(PROGRAMS_LINK==='unbound')return '<p class="rw-muted rw-note">Only Runway milestones are shown. When the Programs app is used, connect its milestones (role programs.plan_items) to include its key milestones here.</p>';
 return '<p class="rw-muted rw-note">Programs app milestones are unavailable ('+(PROGRAMS_LINK==='unavailable'?'no access':'incomplete read')+'), so only Runway milestones are shown. Linked milestones keep their Runway date.</p>';}
function programsTableNote(){const t=tableState('programs');return t==='unbound'?'Programs are not connected to this app, so program breakdowns are hidden. Spend and runway totals are unaffected.':t==='unavailable'?'You do not have access to the programs table, so program names show as unavailable. Totals are unaffected.':'';}
function cfData(){
 const src=st.cf.source||'forecast';
 if(src.startsWith('budget:')){const b=budgetsAll.find(x=>x.row.id===src.slice(7));if(!b)return null;const ms=Object.keys(b.t.months).sort();return {kind:'budget',label:String(b.row.data.name),rows:ms.map(m=>{const x=b.t.months[m];const sp=Object.fromEntries(Object.entries(x.spend||{}).map(([k,v])=>[k,num(v,0)]));const total=Object.values(sp).reduce((n,v)=>n+v,0);return {m,cashIn:num(x.cashIn,0)+(st.cf.contingent?num(x.contingent,0):0),spend:sp,prog:x.prog||{},netBurn:total-num(x.opIn,0),open:null,close:null,drill:null};})};}
 let mm=model,label='Live forecast';if(src.startsWith('scenario:')){const sc=scenarioList.find(s=>s.id===src.slice(9));if(!sc)return null;mm=engine(BASE,{changes:sc.changes});label='Scenario: '+sc.name;}else if(src==='preview'&&st.preview){mm=engine(BASE,{changes:st.preview.changes});label='Preview: '+st.preview.name;}
 if(salaryBlock)return {kind:'forecast',label,rows:[],restricted:true};
 if(!mm.ready)return {kind:'forecast',label,rows:[]};let prev=mm.start;
 return {kind:'forecast',label,model:mm,rows:mm.months.map(x=>{const ci=x.cashBase+(st.cf.contingent?x.cashCont:0),close=st.cf.contingent?x.closeCont:x.close;const o={m:x.m,cashIn:ci,spend:x.spend,prog:x.prog,netBurn:x.netBurn,open:prev,close,drill:x.drill};prev=close;return o;})};}
function editorFields(x){const role=x.role,m=roleMap[role],g=FORM_GROUP[role];
 let fields=fieldsOf(role).filter(f=>f.kind!=='frozen'&&!f.system&&f.key!=='archived'&&m&&m.fields[f.key]);
 if(role==='closes')fields=fields.filter(f=>f.key==='commentary');
 if(role==='settings'&&x.mode!=='create'&&!OWNER)fields=fields.filter(f=>!SETTINGS_BUSINESS.includes(f.key));
 if(role==='positions'&&salaryRestricted)fields=fields.filter(f=>f.key!=='annual_salary');
 if(role==='lines'&&x.draft.direction!=='cash_in')fields=fields.filter(f=>f.key!=='cash_in_type');
 // Form layout (layout profile): declared order, and hidden optional fields. Required fields always stay.
 if(g&&LAYOUT.cols[g]){const order=LAYOUT.cols[g];fields=fields.filter(f=>f.required||f.extra||LAYOUT.visible[g+':'+f.key]!==false).sort((a,b)=>(order.indexOf(a.key)<0?99:order.indexOf(a.key))-(order.indexOf(b.key)<0?99:order.indexOf(b.key)));}
 return fields;}
/* What a click posts: every rendered field as text. Commands build the same form, so both paths propose the same change. */
const formValue=v=>v===null||v===undefined?'':typeof v==='boolean'?String(v):typeof v==='object'?JSON.stringify(v):String(v);
function formOf(x,over){const d={...x.draft,...(over||{})};return Object.fromEntries(editorFields({...x,draft:d}).map(f=>[f.key,f.kind==='month'?(ym(d[f.key])||formValue(d[f.key])):formValue(d[f.key])]));}
function effectOf(role,draft,id,mode){if(!(role==='positions'||role==='lines')||!model.ready||!exact)return null;const d=valuesFromForm(role,draft,mode);const list=BASE[role].filter(r=>r.id!==id).concat([{...(mode==='update'?BASE[role].find(r=>r.id===id):{}),...d,id:id||'draft'}]);const after=engine(dataset({[role]:list}));return after.ready?{before:runwayResult(model.runway),after:runwayResult(after.runway)}:null;}

/* ---------- shared screen parts ---------- */
/* The person's last action can be undone from the screen where it was made (G8). */
function topRow(left,right){const u=st.undo&&st.undo.undoId?kit.undo([st.undo]):'';return left||right||u?'<div class="k-row rw-top">'+(left||'')+'<span class="k-grow"></span>'+u+(right||'')+'</div>':'';}
/* Honest data (G1.4, G11): what is missing or excluded is said where the numbers are, never shown as complete. */
function attention(){const out=[];
 const fix=t=>!settingsRow?{action:canWrite('settings')?'setup':'',label:'Set up runway'}:/opening/i.test(t)?{action:'nav:actuals',label:'Starting point'}:/reporting currency/i.test(t)&&OWNER?{action:'nav:settings',label:'Settings'}:/close/i.test(t)?{action:'nav:actuals',label:'Monthly close'}:{};
 for(const b of readProblems.concat(model.blocks))out.push({tone:'red',text:b,...fix(b)});
 if(salaryBlock)out.push({tone:'red',text:'Salaries are restricted for you, so live people cost and live runway are not shown. The latest approved snapshot is shown instead.'});
 const ex=excludedText(model.excluded);if(ex)out.push({tone:'amber',text:ex,action:roleMap.rates?'nav:rates':'',label:'Add rates'});
 for(const w of model.warns)if(!/is not closed\./.test(w))out.push({tone:'amber',text:w});
 const pn=programsTableNote();if(pn)out.push({tone:'',text:pn});
 if(model.ready)for(const e of exceptions())if(!/Missing exchange rate/.test(e[0]))out.push({tone:'amber',text:e[0],action:e[1],label:e[2]});
 return out;}
function attentionCard(items){if(!items.length)return '';return card('Needs attention','<ul class="rw-list">'+items.slice(0,20).map(i=>'<li>'+(i.tone?pill(i.tone==='red'?'Missing':'Check',i.tone):'')+'<span class="k-grow">'+esc(i.text)+'</span>'+(i.action?btn(i.label||'Open',i.action):'')+'</li>').join('')+'</ul>',{sub:'Until these are resolved the figures are provisional or withheld.'});}
function provisional(){return model.ready&&!exact?'<p class="k-small k-muted rw-prov">These figures are provisional: some data is missing or excluded. '+btn('See what needs attention','nav:overview')+'</p>':'';}
const programOptions=()=>R.programs.rows.map(p=>[p.id,String(p.data.name||'Unnamed')]);
function programPicker(){if(!roleMap.programs||!R.programs.rows.length)return '';return kit.picker({label:'Program',action:'context',value:st.program,options:[{value:'',label:'All programs'}].concat(programOptions().map(([value,label])=>({value,label})))});}
const byProgram=rows=>st.program?rows.filter(r=>(r.data.program_id||'')===st.program):rows;
function searchBox(label){return '<label class="k-field rw-search"><span>Search</span><input type="search" name="query" data-action="query" data-ui-state="true" value="'+esc(st.query)+'" aria-label="'+esc(label)+'"></label>';}
function filterSelect(key,label,options){if(!options.length)return '';return '<label class="k-picker"><span>'+esc(label)+'</span><select name="filter_'+esc(key)+'" data-action="filter:'+esc(key)+'" data-ui-state="true"><option value="">All</option>'+options.map(o=>'<option value="'+esc(o[0])+'"'+(st.filters[key]===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></label>';}
function searched(rows,fields){const q=st.query.toLowerCase().trim();let out=rows;
 if(q)out=out.filter(r=>fields.some(k=>String(k==='program_id'?progName(r.data[k]):r.data[k]??'').toLowerCase().includes(q)));
 for(const [k,v] of Object.entries(st.filters))if(v)out=out.filter(r=>String(r.data[k]??'')===v);return out;}
function pageOf(items){const max=Math.max(0,Math.ceil(items.length/PER)-1);st.page=Math.min(st.page,max);return {slice:items.slice(st.page*PER,(st.page+1)*PER),pager:items.length>PER?kit.pager({offset:st.page*PER,limit:PER,total:items.length,action:'page'}):''};}
/* One value where it is shown: an inline cell when the person may change it, plain text otherwise. */
function valueCell(role,key,r,o){o=o||{};const f=fieldsOf(role).find(x=>x.key===key)||{key,label:key,kind:'text'},v=r.data[key];
 const w=!o.readOnly&&writableField(role,key)&&!(role==='actuals'&&closedMonth(ym(r.data.month)))&&!(role==='settings'&&SETTINGS_BUSINESS.includes(key)&&!OWNER);
 const label=fieldLabel(role,f)+' · '+nameOf(role,r);
 if(f.kind==='month'||f.kind==='date'){const d=f.kind==='month'?(ym(v)?firstOf(ym(v)):''):validDate(v);return w?kit.cell({recordId:r.id,version:r.version,field:key,value:d,kind:'date',label}):esc(f.kind==='month'?fmtMonth(v):d||'—');}
 if(f.kind==='money'||f.kind==='number'){if(key==='annual_salary'&&!has(r.data,'annual_salary'))return '<span class="k-muted">Restricted</span>';const cur=f.kind==='money'?(r.data.currency||C):'';
  return w?'<span class="rw-money">'+kit.cell({recordId:r.id,version:r.version,field:key,value:num(v),kind:'number',label})+(cur?'<span class="k-muted k-small">'+esc(cur)+'</span>':'')+'</span>':'<span class="num">'+esc(f.kind==='money'?money(num(v),cur):num(v)===null?'—':String(num(v)))+'</span>';}
 if(f.kind==='select')return w?kit.cell({recordId:r.id,version:r.version,field:key,value:v===null||v===undefined?'':String(v),kind:'select',options:f.options||[],label}):esc(String(v??'—').replace(/_/g,' '));
 if(f.kind==='boolean')return w?kit.cell({recordId:r.id,version:r.version,field:key,value:bool(v),kind:'boolean',label}):(bool(v)?'Yes':'No');
 if(f.kind==='ref')return esc(refName(f.ref,v,f.ref==='programs'?'program':undefined));
 return w?kit.cell({recordId:r.id,version:r.version,field:key,value:v??'',kind:'text',label}):(o.strong?'<strong>'+esc(v||'—')+'</strong>':esc(v===null||v===undefined||v===''?'—':v));}
function rowActions(role,r,o){o=o||{};const w=canWrite(role),parts=[];
 if(o.extra)parts.push(o.extra);
 if(w&&!o.noEdit)parts.push(btn('Edit','open-edit:'+role+':'+r.id));
 if(w&&o.duplicate)parts.push(btn('Duplicate','duplicate:'+role+':'+r.id));
 if(w&&!o.noDelete)parts.push(kit.button('Delete','delete:'+role+':'+r.id+':'+r.version,{ariaLabel:'Delete '+nameOf(role,r)}));
 return '<div class="k-row rw-actions">'+parts.join('')+'</div>';}
const LAYOUT_LABEL=(g,k)=>(templateLayoutSchema.groups[g].find(x=>x.id===k)||{}).label||k;
const columnsOf=(g,skip)=>LAYOUT.cols[g].filter(k=>LAYOUT.visible[g+':'+k]!==false&&!(skip||[]).includes(k));
function readNote(role){const r=R[role];return r.unavailable?'You do not have access to the '+ROLE_LABEL[role]+' table.':r.truncated?'Only '+r.rows.length+' of '+r.total+' '+ROLE_LABEL[role]+'s could be read; totals are withheld.':'';}

/* ---------- Overview ---------- */
function snapshotHero(){if(!latestSnap)return card('','<p class="rw-sentence">Live runway is not available to you, and no approved snapshot exists yet.</p>');const s=latestSnap.m;
 return card('','<p class="k-muted k-small">Approved snapshot · '+esc(monthLabel(s.asOf))+'</p><p class="rw-sentence">'+esc(s.runway.beyond?'Cash lasted beyond the forecast horizon at the '+monthLabel(s.asOf)+' close.':'At the '+monthLabel(s.asOf)+' close, cash lasted until '+monthLabel(s.runway.lastsUntil)+' ('+plural(s.runway.months,'month')+').')+'</p><div class="k-grid">'+kit.stat('Cash-out month',s.runway.cashOut?monthLabel(s.runway.cashOut):'Beyond horizon')+kit.stat('Start raising by',s.runway.startRaise?monthLabel(s.runway.startRaise):'—')+kit.stat('Live people cost','Restricted')+'</div>');}
function overview(){
 if(PENDING)return topRow()+loading('the forecast');
 if(R.settings.unbound||R.settings.unavailable)return topRow()+attentionCard(attention());
 if(!settingsRow)return topRow()+kit.empty({title:'Set up your first runway',text:'Enter the bank balance, its month-end date and the reporting currency. Then add the main spend lines in Plan and the people in People.',...(canWrite('settings')?{action:{label:'Set up runway',action:'setup'}}:{})});
 const att=attention();let body=topRow();
 if(salaryBlock)return body+attentionCard(att)+snapshotHero()+snapshotsCard();
 if(!model.ready)return body+attentionCard(att);
 const r=model.runway,rc=model.runwayC,below=!r.beyond&&r.months<target;
 body+=card('','<p class="rw-sentence">'+esc(sentence(model))+'</p><p class="k-muted k-small">As of '+esc(monthLabel(model.A))+' · '+esc(C2)+(exact?'':' · provisional')+(below?' · '+pill('Below the '+target+'-month target','red'):'')+'</p><div class="k-grid">'+
  kit.stat('Runway',runwayText(r))+kit.stat('Cash-out month',r.beyond?'Beyond '+monthLabel(r.lastsUntil):monthLabel(r.cashOut))+kit.stat('Start raising by',r.beyond?'—':monthLabel(r.startRaise))+kit.stat('Cash now',money(model.start))+kit.stat('With contingent cash',runwayText(rc))+kit.stat('Trailing runway',model.trailing&&model.trailing.months!==null?grouped(model.trailing.months,1)+' months':'Needs '+trailingN+' closed months')+'</div>',{label:'Runway'});
 body+=attentionCard(att);
 const base={label:'Forecast',color:'#175B94',points:model.months.map(x=>({m:x.m,cash:x.close}))},cont={label:'With contingent cash',color:'#2E8B9A',dash:'2 5',points:model.months.map(x=>({m:x.m,cash:x.closeCont}))};
 body+=card('Cash curve',cashChart([base,cont],{history:model.history,milestones:model.milestones.filter(x=>!x.passed)})+'<div class="rw-legend"><span><i class="solid"></i>Actual cash</span><span><i class="dot"></i>Forecast</span><span><i class="dot teal"></i>With contingent cash</span>'+(reserve?'<span><i class="reserve"></i>Minimum reserve</span>':'')+'<span><i class="ms green"></i>Cushion ≥ 6 months</span><span><i class="ms amber"></i>3–6</span><span><i class="ms red"></i>&lt; 3</span></div>'+tableFallback('Closing cash ('+C2+')',['Month','Forecast','With contingent'],model.history.slice(-6).map(hh=>[monthLabel(hh.m)+' (actual)',grouped(Math.round(hh.cash)),'']).concat(model.months.slice(0,CHART_MONTHS).map(x=>[monthLabel(x.m),grouped(Math.round(x.close)),grouped(Math.round(x.closeCont))]))),{sub:'Closing cash by month · '+C2+' · next '+CHART_MONTHS+' months'});
 const past=model.history.filter(x=>x.source==='close').slice(-6).map(x=>({m:x.m,...model.actualMonth(x.m),forecast:false})),fut=model.months.slice(0,12).map(x=>({m:x.m,spend:x.spend,opIn:x.opIn,forecast:true}));
 body+=card('Monthly burn by category',burnChart(past.concat(fut)),{sub:'Spend by category · '+C2+' · closed months, then the next 12 forecast months'});
 const br=bridge(),ms=model.milestones.filter(x=>!x.passed);
 const bridgeBody=br?br.unavailable?muted('The last snapshot is too old to compare month by month.'):'<ul class="rw-list">'+br.parts.map(p=>'<li><span class="k-grow">'+esc(p.label)+'</span><strong class="'+(p.v<0?'rw-neg':p.v>0?'rw-pos':'')+'">'+esc(signed(p.v))+' months</strong></li>').join('')+'<li class="rw-total"><span class="k-grow">Runway '+esc(runwayText(br.from))+' → '+esc(runwayText(br.to))+'</span><strong>'+esc(signed(br.total))+' months</strong></li></ul>'+(br.capped?muted('At least one runway reaches the '+HORIZON+'-month horizon, so the change may be larger.'):''):muted('Close a month to freeze the first snapshot; this then explains each change.');
 body+='<div class="rw-grid2">'+card('Why runway changed',bridgeBody,{sub:br&&!br.unavailable?'Since the '+monthLabel(br.asOf)+' snapshot':'Since the last snapshot'})+
  card('Cash at milestones',ms.length?simpleTable([{label:'Milestone'},{label:'Month'},{label:'Cash',num:true},{label:'Cushion'}],ms.map(x=>['<strong>'+esc(x.name)+'</strong><br><span class="k-muted k-small">'+esc(progName(x.program))+' · '+esc(SOURCE_LABEL[x.source]||'Runway')+'</span>',esc(monthLabel(x.m)),esc(money(x.cash)),pill(cushionText(x.cushion),cushionTone(x.cushion))]),{label:'Cash at milestones'})+programsLinkNote():kit.empty({title:'No milestones yet',text:'Add the events the cash must reach, such as a first patient or a readout.',...(canWrite(MS_ROLE)&&MS_ROLE!=='programItems'||OWN_ITEMS&&canWrite('programItems')?{action:{label:'Add milestone',action:'add:'+MS_ROLE}}:{})})+programsLinkNote(),{sub:'Forecast cash in the milestone month and the cushion to '+(reserve?'the minimum reserve':'cash-out')})+'</div>';
 return body;}
const SOURCE_LABEL={runway:'Runway',programs:'Programs app',linked:'Programs app (linked)',link_unavailable:'Runway date · Programs link unavailable'};

/* ---------- Cash flow ---------- */
function cashFlow(){
 if(PENDING)return topRow()+loading('the cash flow');
 const d=cfData(),opts=[['forecast','Live forecast']].concat(st.preview?[['preview','What-if: '+st.preview.name]]:[]).concat(scenarioList.filter(s=>s.status!=='archived').map(s=>['scenario:'+s.id,'Scenario: '+s.name+(s.outdated?' (outdated)':'')])).concat(budgetsAll.map(b=>['budget:'+b.row.id,String(b.row.data.name)]));
 const controls='<label class="k-picker"><span>Show</span><select name="cf_source" data-ui-state="true" data-action="cf-source">'+opts.map(o=>'<option value="'+esc(o[0])+'"'+(st.cf.source===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></label><label class="k-picker"><input type="checkbox" name="cf_contingent" data-ui-state="true" data-action="cf-contingent"'+(st.cf.contingent?' checked':'')+'><span>Include contingent cash</span></label>'+(programsUsable()?btn(st.cf.programs?'By category':'By program','cf-programs'):'');
 let body=topRow(controls,d&&d.rows.length?btn(st.exportOpen?'Hide CSV':'Export CSV','toggle-export'):'')+provisional();
 if(!d)return body+kit.empty({title:'That source is no longer available',text:'Choose the live forecast or another scenario.',action:{label:'Show the live forecast',action:'cf-reset'}});
 if(!d.rows.length)return body+(d.restricted?kit.empty({title:'Live cash flow needs salary access',text:'Choose a locked budget, or open a snapshot in Monthly close.'}):settingsRow?attentionCard(attention()):kit.empty({title:'No months to show yet',text:'Set up the runway with the bank balance and its date.',...(canWrite('settings')?{action:{label:'Set up runway',action:'setup'}}:{})}));
 const cats=ORDERCATS.filter(c=>d.rows.some(r=>r.spend[c]));let cols=cats.map(c=>({key:c,label:c,get:r=>r.spend[c]||0}));
 if(st.cf.programs&&programsUsable()){cols=[];for(const c of cats){const pids=[...new Set(d.rows.flatMap(r=>Object.keys(r.prog).filter(p=>(r.prog[p]||{})[c])))];for(const p of pids)cols.push({key:c+'|'+p,label:c+' · '+progName(p),get:r=>(r.prog[p]||{})[c]||0});}}
 const per=12,maxPage=Math.max(0,Math.ceil(d.rows.length/per)-1);st.cf.page=Math.min(Number(st.cf.page)||0,maxPage);const slice=d.rows.slice(st.cf.page*per,(st.cf.page+1)*per);
 const drill=(r,key,v)=>d.kind==='forecast'&&r.drill&&v?kit.button(compact(v),'drill:'+r.m+'|'+key,{ariaLabel:'Lines behind '+key.replace('|',' · ')+' in '+monthLabel(r.m)}):esc(compact(v));
 const columns=[{label:'Month',render:r=>'<strong>'+esc(monthLabel(r.m))+'</strong>'}].concat(d.kind==='forecast'?[{label:'Opening',render:r=>esc(compact(r.open))}]:[]).concat([{label:'Cash in',render:r=>drill(r,'cash_in',r.cashIn)}]).concat(cols.map(c=>({label:c.label,render:r=>drill(r,c.key,c.get(r))}))).concat([{label:'Net burn',render:r=>esc(compact(r.netBurn))}]).concat(d.kind==='forecast'?[{label:'Closing',render:r=>'<span class="'+(r.close<0?'rw-neg':'')+'">'+esc(compact(r.close))+'</span>'}]:[]);
 body+=card(d.label,kit.table({columns,rows:slice})+'<div class="k-pager"><span>'+esc(monthLabel(slice[0].m))+' – '+esc(monthLabel(slice[slice.length-1].m))+'</span>'+btn('Previous year','cf-prev',{disabled:st.cf.page===0})+btn('Next year','cf-next',{disabled:st.cf.page>=maxPage})+'</div>',{sub:C2+' · '+(d.kind==='budget'?'frozen budget totals':st.cf.contingent?'includes contingent cash':'committed and received cash in only')+' · thousands (k) or millions (M)',label:'Monthly cash flow'});
 if(st.drill&&d.kind==='forecast'){const parts=st.drill.split('|'),m=parts[0],cat=parts[1],prog=parts.length>2?parts.slice(2).join('|'):undefined,r=d.rows.find(x=>x.m===m);
  let items=r&&r.drill?(cat==='cash_in'?(r.drill.cash_in||[]).concat(st.cf.contingent?(r.drill.contingent||[]):[]):(r.drill[cat]||[])):[];if(prog!==undefined)items=items.filter(i=>(i.program||'')===prog);
  body+=card((cat==='cash_in'?'Cash in':cat)+(prog!==undefined?' · '+progName(prog):'')+' · '+monthLabel(m),items.length?simpleTable([{label:'Line'},{label:'Type'},{label:'Program'},{label:'Original',num:true},{label:'Rate used',num:true},{label:C2,num:true}],items.map(i=>['<strong>'+esc(i.name||'—')+'</strong>'+(i.status?' '+pill(i.status,''):''),esc(i.kind==='position'?'Position':String(i.driver||'line').replace('_','-')),esc(progName(i.program)),i.kind==='position'&&salaryRestricted?'Restricted':esc(money(i.original,i.currency)),esc(i.currency===C2?'—':grouped(i.converted/i.original,4)),esc(money(i.converted))]),{label:'Lines behind the value'}):muted('No lines behind this value.'),{sub:'The lines behind this value, with original amounts and conversion',actions:btn('Close','close-drill')});}
 if(st.exportOpen){const head=['Month'].concat(d.kind==='forecast'?['Opening']:[]).concat(['Cash in']).concat(cols.map(c=>c.label)).concat(['Net burn']).concat(d.kind==='forecast'?['Closing']:[]);
  const q=v=>{const s=String(v);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};const csv=[head.map(q).join(',')].concat(d.rows.map(r=>[r.m].concat(d.kind==='forecast'?[round2(r.open)]:[]).concat([round2(r.cashIn)]).concat(cols.map(c=>round2(c.get(r)))).concat([round2(r.netBurn)]).concat(d.kind==='forecast'?[round2(r.close)]:[]).map(q).join(','))).join('\n');
  body+=card('Export CSV','<label class="k-field"><span>Copy this text into a .csv file</span><textarea name="csv_export" data-ui-state="true" readonly rows="8">'+esc(csv)+'</textarea></label>',{sub:d.label+' · '+C2+' · all '+d.rows.length+' months'});}
 return body;}

/* ---------- Plan ---------- */
function planScreen(){
 const tabs=kit.nav([{id:'lines',label:'Spend and cash in'},{id:'milestones',label:'Milestones'},{id:'budgets',label:'Budgets'}],st.planTab,{prefix:'plan:',label:'Plan sections'});
 if(PENDING)return tabs+topRow()+loading('the plan');
 if(st.planTab==='milestones')return tabs+milestonesTab();
 if(st.planTab==='budgets')return tabs+budgetsTab();
 if(!roleMap.lines)return tabs+card('Plan lines',muted('Plan lines are not connected to this app.'));
 if(R.lines.unavailable)return tabs+card('Plan lines',muted(readNote('lines')));
 const w=canWrite('lines'),all=R.lines.rows.slice().sort((a,b)=>String(a.data.start_month||'').localeCompare(String(b.data.start_month||''))||String(a.data.name||'').localeCompare(String(b.data.name||'')));
 const actions=(w?btn('Add payment schedule','add-schedule'):'')+(w?btn('Add line','add:lines',{primary:true}):'');
 let body=tabs+topRow(programPicker(),actions);
 if(!all.length)return body+kit.empty({title:'No plan lines yet',text:'Add the main spend lines and the expected cash in: rent, CRO contracts, grants and financing. People costs come from People.',...(w?{action:{label:'Add line',action:'add:lines'}}:{})})+sourcesCard();
 const rows=searched(byProgram(all),['name','category','program_id','status','notes','schedule_group']),p=pageOf(rows);
 const toolbar='<div class="k-row rw-tools">'+searchBox('Search plan lines')+filterSelect('direction','Direction',[['spend','Spend'],['cash_in','Cash in']])+filterSelect('status','Status',['committed','discretionary','contingent','received'].map(x=>[x,x]))+filterSelect('category','Category',enabledCats.map(x=>[x,x]))+(st.query||Object.values(st.filters).some(Boolean)?btn('Clear','clear-filters'):'')+'</div>';
 const keys=columnsOf('lines');
 const columns=keys.map(k=>({label:LAYOUT_LABEL('lines',k),render:r=>k==='name'?valueCell('lines','name',r,{strong:true})+lineBadges(r):k==='direction'?pill(r.data.direction==='cash_in'?'Cash in':'Spend',r.data.direction==='cash_in'?'blue':''):k==='program_id'?esc(progName(r.data.program_id)):valueCell('lines',k,r)})).concat([{label:'Actions',render:r=>rowActions('lines',r,{duplicate:true,extra:lineSource(r)==='changed'&&w?btn('Update from source','source-update:'+r.id):''})}]);
 body+=card('Plan lines',toolbar+(rows.length?kit.table({columns,rows:p.slice}):kit.empty({title:'No lines match',text:'Change the search or filters.',action:{label:'Clear filters',action:'clear-filters'}}))+p.pager,{sub:plural(rows.length,'line')+(rows.length!==all.length?' of '+all.length:'')+' · monthly, one-off or spread evenly; payment schedules are one-off lines that share a group',label:'Plan lines'});
 return body+sourcesCard();}
function lineBadges(r){const src=lineSource(r);return (r.data.schedule_group?'<br><span class="k-muted k-small">Schedule: '+esc(r.data.schedule_group)+'</span>':'')+(src==='changed'?' '+pill('Source changed','amber'):src==='unavailable'?' '+pill('Source unavailable',''):'');}
/* "From App" label, Edit in App and the integration hint are platform controls (data-trialy-*); Runway builds no dialog of its own. */
function integHint(role){const x=integ(role);if(!x||!inp.saved)return '';const w=x.writer;
 if(x.source==='linked')return muted('From '+(w?w.appName:x.provider)+'. Read only here; '+(w&&w.canOpen?'make changes in '+w.appName+'.':'changes are made where the data is kept.'));
 if(!x.offer)return '';return '<p class="k-muted k-small">'+(x.offer==='install'?'Works with '+esc(x.provider)+'. ':esc(x.provider)+' is in your workspace. ')+'<button type="button" class="k-button" data-trialy-integration="'+esc(x.offer+' '+x.role)+'">'+(x.offer==='install'?'Add '+esc(x.provider):'Use its data')+'</button></p>';}
const openBtn=(role,id)=>{const x=integ(role);return x&&x.source==='linked'&&x.writer&&x.writer.canOpen?'<button type="button" class="k-button" data-trialy-open="'+esc(ROLE_KEY[role]+' '+id)+'">Edit in '+esc(x.writer.appName)+'</button>':'';};
function sourcesCard(){const roles=SRC_ROLES.filter(r=>roleMap[r]);if(!roles.length)return '';const w=canWrite('lines');
 return card('From other sources',roles.map(r=>{const items=sourceList(r),own=!linked(r);
  return '<h3 class="rw-h3">'+esc(SRC_NAME[r])+'</h3>'+integHint(r)+(items.length?'<ul class="rw-list">'+items.map(it=>'<li><span class="k-grow"><strong>'+esc(it.name)+'</strong>'+(it.invalid?' · <span class="k-muted">'+esc(it.invalid)+'</span>':' · '+esc(money(it.line.amount,it.line.currency))+' · '+esc(monthLabel(ym(it.line.start_month))))+'</span>'+(it.state==='in_plan'?pill('In plan','green'):it.state==='changed'?pill('Source changed','amber')+(w?btn('Update line','source-update:'+it.lineId):''):it.state==='available'&&w?btn('Add to plan','source-add:'+r+':'+it.id):'')+(own?(canWrite(r)?btn('Edit','open-edit:'+r+':'+it.id):''):openBtn(r,it.id))+'</li>').join('')+'</ul>':muted('None recorded.'))+(own&&canWrite(r)?btn('Add '+ROLE_LABEL[r],'add:'+r):'');}).join(''),{sub:'Commitments, contract payments and expected financing. Add to plan copies the amount into a plan line; a later change to the source is flagged, never applied on its own.'});}
function milestonesTab(){const role=MS_ROLE,own=role==='milestones'||OWN_ITEMS,w=own&&canWrite(role);let body=topRow(programPicker(),w?btn('Add milestone','add:'+role,{primary:true}):'');
 if(own){if(R[role].unavailable)return body+card('Milestones',muted(readNote(role)));
  const dateKey=role==='programItems'?'end_date':'target_month';const all=R[role].rows.filter(r=>role!=='programItems'||(r.data.item_type||'milestone')==='milestone').sort((a,b)=>String(a.data[dateKey]||'').localeCompare(String(b.data[dateKey]||'')));
  const rows=byProgram(all);
  body+=card('Milestones',integHint(role)+(rows.length?kit.table({columns:[{label:'Milestone',render:r=>valueCell(role,'name',r,{strong:true})},{label:'Program',render:r=>esc(progName(r.data.program_id))},{label:'Target month',render:r=>valueCell(role,dateKey,r)},{label:'Actions',render:r=>rowActions(role,r)}],rows}):kit.empty({title:all.length?'No milestones for this program':'No milestones yet',text:'Add the events the cash must reach. Overview shows the cash and cushion at each one.',...(w?{action:{label:'Add milestone',action:'add:'+role}}:{})})),{sub:'The events the cash must reach',label:'Milestones'});}
 if(!OWN_ITEMS){const from=model.milestones.filter(x=>x.source==='programs'||x.source==='linked');
  body+=card('Key milestones from the Programs app',integHint('programItems')+(PROGRAMS_LINK==='ok'?(from.length?'<ul class="rw-list">'+from.map(x=>{const id=String(x.id).replace(/^programs:/,'');return '<li><span class="k-grow"><strong>'+esc(x.name)+'</strong> · '+esc(progName(x.program))+'</span><span>'+esc(monthLabel(x.m))+'</span>'+openBtn('programItems',id)+'</li>';}).join('')+'</ul>':muted('No key milestones are marked in the Programs app.')):programsLinkNote()),{sub:'Read only. Programs owns these dates; Runway uses them for cash at milestone.'});}
 return body;}
function budgetsTab(){let body=topRow()+provisional();
 const years=[];if(model.A)for(let i=0;i<3;i++){const y=String(Number(addMonths(model.A,1).slice(0,4))+i);if(!years.includes(y))years.push(y);}
 const locked=y=>budgetsAll.some(b=>String(num(b.row.data.year,0))===y);const free=years.filter(y=>!locked(y)),y=free.includes(st.lockYear)?st.lockYear:free[0]||'';
 let preview='';if(y&&exact){const b=budgetTotals(model,y),sp=Object.values(b.totals.months).reduce((n,x)=>n+Object.values(x.spend).reduce((a,v)=>a+v,0),0);preview=b.missing.length?'<p class="rw-neg k-small">'+esc(excludedText(b.missing))+'</p>':muted('Locks '+money(sp)+' of planned spend in '+y+' with monthly totals by category and program and the rates used. It cannot be edited later.');}
 body+=card('Lock as budget',!model.ready?muted('Set up the runway first.'):!free.length?muted('Budgets for the next years are locked.'):'<form class="k-row" data-action="lock-budget"><label class="k-picker"><span>Year</span><select name="year" data-ui-state="true" data-action="lock-year">'+free.map(x=>'<option value="'+x+'"'+(x===y?' selected':'')+'>'+x+'</option>').join('')+'</select></label><button type="submit" class="k-button k-button--primary"'+(!canWrite('budgets')||!exact?' disabled':'')+'>Lock '+esc(y)+' as budget</button></form>'+preview+(!exact?muted('Locking needs complete, valid data.'):''),{sub:'Freezes the current forecast into one budget record'});
 body+=card('Locked budgets',budgetsAll.length?simpleTable([{label:'Budget'},{label:'Year'},{label:'Locked on'},{label:'Annual spend',num:true},{label:'Committed cash in',num:true}],budgetsAll.map(b=>{const ms=Object.values(b.t.months);const sp=ms.reduce((n,x)=>n+Object.values(x.spend||{}).reduce((a,c)=>a+num(c,0),0),0),ci=ms.reduce((n,x)=>n+num(x.cashIn,0),0);return ['<strong>'+esc(b.row.data.name)+'</strong>',esc(b.row.data.year),esc(b.row.data.locked_on||'—'),esc(money(sp,b.row.data.currency)),esc(money(ci,b.row.data.currency))];}),{label:'Locked budgets'}):muted('No budget is locked yet. Lock one above; variance in Monthly close compares against it.'));
 return body;}

/* ---------- People ---------- */
function people(){
 if(PENDING)return topRow()+loading('people');
 if(!roleMap.positions)return card('People',muted('Positions are not connected to this app.'));
 if(R.positions.unavailable)return card('People',muted(readNote('positions')));
 const w=canWrite('positions'),all=R.positions.rows,rows=byProgram(all).slice().sort((a,b)=>String(a.data.start_month||'').localeCompare(String(b.data.start_month||'')));
 const views=st.view==='board'?btn('List','view:list'):btn('Board','view:board');
 let body=topRow(programPicker()+(all.length?views:''),w?btn('Add position','add:positions',{primary:true}):'')+provisional();
 if(!all.length)return body+kit.empty({title:'No roles or planned hires yet',text:'Add current roles and planned hires with their start month and salary. Their cost flows into the forecast.',...(w?{action:{label:'Add position',action:'add:positions'}}:{})});
 const complete=R.positions.complete,cur=rows.filter(r=>r.data.status==='current'),planned=rows.filter(r=>r.data.status==='planned');
 const next=model.A?addMonths(model.A,1):'',nextCost=model.ready&&!salaryRestricted&&model.months[0]?model.months[0].people:null;
 body+='<div class="k-grid rw-stats">'+kit.stat('Current roles',complete?String(cur.length):'—')+kit.stat('Planned hires',complete?String(planned.length):'—')+kit.stat('People cost '+(next?monthLabel(next):'next month'),salaryRestricted?'Restricted':nextCost===null?'—':money(nextCost))+'</div>'+(complete?'':muted(readNote('positions')));
 if(st.view==='board'){const cardOf=r=>({id:r.id,label:String(r.data.title||'Position'),html:'<strong>'+esc(r.data.title||'Position')+'</strong><br><span class="k-muted k-small">'+esc(progName(r.data.program_id))+' · from '+esc(fmtMonth(r.data.start_month))+'</span>'});
  body+=card('Roles and planned hires',(w?'':muted('You can view positions but not move them.'))+kit.board({action:'move-position',columns:[{id:'planned',label:'Planned hires',cards:planned.map(cardOf)},{id:'current',label:'Current roles',cards:cur.map(cardOf)}]}),{sub:'Move a planned hire to current when they start, by dragging or with the menu on its card.'});}
 else{const keys=columnsOf('positions',salaryBound?[]:['annual_salary']),p=pageOf(rows);
  body+=card('Roles and planned hires',kit.table({columns:keys.map(k=>({label:LAYOUT_LABEL('positions',k),render:r=>k==='title'?valueCell('positions','title',r,{strong:true}):k==='program_id'?esc(progName(r.data.program_id)):valueCell('positions',k,r)})).concat([{label:'Actions',render:r=>rowActions('positions',r,{duplicate:true})}]),rows:p.slice,empty:kit.empty({title:'No positions for this program',text:'Choose All programs, or add a position.',...(w?{action:{label:'Add position',action:'add:positions'}}:{})})})+p.pager,{sub:'Salary ÷ 12 × (1 + '+loaded+'% loaded cost) in each active month',label:'Roles and planned hires'});}
 if(model.A){const ms=Array.from({length:12},(_,i)=>addMonths(model.A,i+1)),progs=[...new Set(rows.map(r=>r.data.program_id||''))];const head=[{label:'Program'}].concat(ms.map(m=>({label:shortMonth(m),num:true})));
  body+=card('Headcount by program',simpleTable(head,progs.map(pid=>[esc(progName(pid))].concat(ms.map(m=>{const act=rows.filter(r=>(r.data.program_id||'')===pid&&ym(r.data.start_month)&&ym(r.data.start_month)<=m&&(!ym(r.data.end_month)||ym(r.data.end_month)>=m));const c=act.filter(r=>r.data.status==='current').length,pl=act.length-c;return c+(pl?' <span class="k-muted">+'+pl+'</span>':'');}))),{label:'Headcount by program',compact:true}),{sub:'Current roles, with planned hires as +n · next 12 months'});
  if(!salaryRestricted)body+=card('People cost by program',model.ready?simpleTable(head,progs.map(pid=>[esc(progName(pid))].concat(ms.map((m,i)=>{const pm=model.months[i];const v=pm&&pm.prog[pid]?pm.prog[pid].People||0:0;return esc(pm?compact(v):'—');}))),{label:'People cost by program',compact:true}):muted('Shown once the forecast can be calculated.'),{sub:'Loaded cost · '+C2+' · next 12 months'});}
 return body;}

/* ---------- Scenarios ---------- */
function scenariosScreen(){
 if(PENDING)return topRow()+loading('scenarios');
 if(salaryBlock)return topRow()+card('Scenarios',muted('What-ifs need salary access because people cost drives the runway.'));
 if(!model.ready)return topRow()+(settingsRow?attentionCard(attention()):kit.empty({title:'Set up the runway first',text:'What-ifs start from the live forecast.',...(canWrite('settings')?{action:{label:'Set up runway',action:'setup'}}:{})}));
 const {p,k,fields}=whatIfFields(),pm=p?engine(BASE,{changes:p.changes}):null,ws=canWrite('scenarios');
 let body=topRow('',p?btn('Discard what-if','preview-discard'):btn('New what-if','preview-new',{primary:true}))+provisional();
 const builder=p?'<form data-action="change-add" class="rw-form">'+'<label class="k-field"><span>Name</span><input name="preview_name" data-ui-state="true" data-action="preview-name" value="'+esc(p.name)+'"></label><label class="k-field"><span>Change</span><select name="kind" data-ui-state="true" data-action="change-draft">'+CHANGE_KINDS.map(x=>'<option value="'+x+'"'+(k===x?' selected':'')+'>'+esc(CHANGE_LABELS[x])+'</option>').join('')+'</select></label>'+fields+'<div class="k-row"><button type="submit" class="k-button">Add to what-if</button>'+btn('Save scenario','preview-save',{primary:true,disabled:!p.changes.length||!ws})+'</div></form>'+
  (p.fromDraft?muted('Draft scenario: saving it stamps it with the current forecast so it can be adopted.'):'')+
  (p.changes.length?'<ol class="rw-list">'+p.changes.map((c,i)=>'<li><span class="k-grow">'+esc(describe(c))+'</span>'+kit.button('Remove','change-remove:'+i,{ariaLabel:'Remove change '+(i+1)})+'</li>').join('')+'</ol>':muted('Add a change to see its effect. Nothing is stored until you save the scenario.'))+
  (pm&&pm.ready?'<div class="k-grid">'+kit.stat('Runway',runwayText(model.runway)+' → '+runwayText(pm.runway))+kit.stat('Cash-out',pm.runway.beyond?'Beyond horizon':monthLabel(pm.runway.cashOut))+kit.stat('Start raise',pm.runway.beyond?'—':monthLabel(pm.runway.startRaise))+'</div>':''):'';
 const shown=scenarioList.filter(s=>st.showArchived||s.status!=='archived');
 body+=p?card('What-if',builder,{sub:'Changes are applied on read; the forecast itself does not change.'}):'';
 const sc=s=>{let adopt='';if(s.status==='saved'&&!s.outdated&&s.changes.length){try{const plan=adoptionPlan(s);adopt=muted('Adopting changes '+plural(plan.changes.length,'record')+' in the live forecast.'+(plan.skipped.length?' '+plan.skipped.join(' '):''));}catch(e){adopt=muted(errText(e));}}
  return '<li class="rw-scard"><div class="k-row"><strong class="k-grow">'+esc(s.name)+'</strong>'+pill(s.status,s.status==='adopted'?'green':s.status==='draft'?'amber':s.status==='saved'?'blue':'')+(s.outdated&&s.status==='saved'?pill('Outdated','amber'):'')+'</div><p class="k-small">'+esc(s.changes.length?s.changes.map(describe).join('; '):'No changes saved yet.')+'</p>'+adopt+'<div class="k-row">'+btn(s.status==='draft'?'Open draft':'Copy to what-if','preview-from:'+s.id)+(s.status==='saved'&&canWrite('lines')&&ws?btn('Adopt','adopt:'+s.id,{disabled:s.outdated}):'')+(s.status!=='archived'&&ws?btn('Archive','scenario-archive:'+s.id):'')+'</div></li>';};
 body+=card('Saved scenarios',shown.length?'<ul class="rw-cards">'+shown.map(sc).join('')+'</ul>':p?muted('No saved scenarios yet.'):kit.empty({title:'No scenarios yet',text:'Try a what-if: delay a program, add a hire or move a financing event, and see the runway before saving it.',action:{label:'New what-if',action:'preview-new'}}),{sub:'Outdated means the forecast changed after the scenario was saved.',actions:scenarioList.some(s=>s.status==='archived')?btn(st.showArchived?'Hide archived':'Show archived','toggle-archived-scenarios'):''});
 const cands=[['forecast','Live forecast',model]].concat(p?[['preview','What-if: '+p.name,pm]]:[]).concat(scenarioList.filter(s=>s.status!=='archived').map(s=>['scenario:'+s.id,s.name+(s.outdated?' (outdated)':''),null]));
 if(cands.length<2)return body;
 st.compare=st.compare.filter(id=>cands.some(c=>c[0]===id));
 const sel=cands.filter(c=>st.compare.includes(c[0])).map(c=>{let mm=c[2];if(!mm){const s0=scenarioList.find(s=>'scenario:'+s.id===c[0]);mm=engine(BASE,{changes:s0?s0.changes:[]});}return {id:c[0],label:c[1],m:mm};});
 const colors=['#175B94','#B9873A','#8C6BB1','#2E8B9A'];
 let cmp='<div class="k-row rw-checks">'+cands.map(c=>'<label class="k-picker"><input type="checkbox" name="cmp_'+esc(c[0])+'" data-ui-state="true" data-action="compare:'+esc(c[0])+'"'+(st.compare.includes(c[0])?' checked':'')+'><span>'+esc(c[1])+'</span></label>').join('')+'</div>';
 if(sel.length>=2){const allMs=[...new Set(sel.flatMap(s=>s.m.milestones.filter(x=>!x.passed).map(x=>x.name)))];
  const head=[{label:'Measure'}].concat(sel.map(s=>({label:s.label})));
  cmp+=simpleTable(head,[['Runway'].concat(sel.map(s=>esc(s.m.ready?runwayText(s.m.runway):'—'))),['Cash-out month'].concat(sel.map(s=>esc(!s.m.ready?'—':s.m.runway.beyond?'Beyond horizon':monthLabel(s.m.runway.cashOut)))),['Start raise'].concat(sel.map(s=>esc(!s.m.ready||s.m.runway.beyond?'—':monthLabel(s.m.runway.startRaise)))),['Net burn, next 24 months'].concat(sel.map(s=>esc(s.m.ready?money(s.m.months.slice(0,24).reduce((n,x)=>n+x.netBurn,0)):'—')))].concat(allMs.map(n=>['Cash at '+esc(n)].concat(sel.map(s=>{const x=s.m.milestones.find(y=>y.name===n);return esc(x?money(x.cash)+' · '+monthLabel(x.m):'—');})))),{label:'Scenario comparison'})+
   cashChart(sel.map((s,i)=>({label:s.label,color:colors[i],dash:i===0?'6 5':i===1?'2 4':'9 4 2 4',points:s.m.months.map(x=>({m:x.m,cash:x.close}))})),{history:model.history,label:'Closing cash of the compared scenarios in '+C2})+'<div class="rw-legend">'+sel.map((s,i)=>'<span><i style="background:'+colors[i]+'"></i>'+esc(s.label)+'</span>').join('')+'</div>';}
 else cmp+=muted('Select at least two to compare.');
 return body+card('Compare',cmp,{sub:'Two to four · '+C2+' · as of '+monthLabel(model.A)});}
function whatIfFields(){
 const p=st.preview,d=st.changeDraft||{kind:'shift_program'};
 const targetSel=(kind)=>{let opts=[];if(['shift_program','scale_program','stop_program','add_position'].includes(kind))opts=programOptions();else if(kind==='remove_position')opts=R.positions.rows.map(r=>[r.id,String(r.data.title||'Position')]);else if(['move_cash_in','resize_cash_in'].includes(kind))opts=R.lines.rows.filter(r=>r.data.direction==='cash_in').map(r=>[r.id,String(r.data.name||'Cash in')+' · '+monthLabel(ym(r.data.start_month))]);
  else if(['stop_line','shift_line','scale_line'].includes(kind))opts=R.lines.rows.map(r=>[r.id,String(r.data.name||'Line')+' · '+monthLabel(ym(r.data.start_month))]);else if(['shift_position','change_salary'].includes(kind))opts=R.positions.rows.map(r=>[r.id,String(r.data.title||'Position')]);else if(['add_line','scale_category'].includes(kind))opts=programOptions();
  if(kind==='fx_shift')return '';return '<label class="k-field"><span>'+(['add_position','add_line','scale_category'].includes(kind)?'Program (optional)':['remove_position','shift_position','change_salary'].includes(kind)?'Position':['move_cash_in','resize_cash_in'].includes(kind)?'Cash-in line':['stop_line','shift_line','scale_line'].includes(kind)?'Plan line':'Program')+'</span><select name="target_id" data-ui-state="true" data-action="change-draft"><option value="">Choose…</option>'+opts.map(o=>'<option value="'+esc(o[0])+'"'+(d.target_id===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></label>';};
 const inputF=(name,label,type,extra)=>'<label class="k-field"><span>'+esc(label)+'</span><input type="'+type+'" name="'+name+'" data-ui-state="true" data-action="change-draft" value="'+esc(d[name]??'')+'"'+(extra||'')+'></label>';
 const k=d.kind||'shift_program';let fields=targetSel(k);
 const selF=(name,label,opts,val)=>'<label class="k-field"><span>'+esc(label)+'</span><select name="'+name+'" data-ui-state="true" data-action="change-draft">'+opts.map(o=>'<option value="'+esc(o)+'"'+(String(val??'')===o?' selected':'')+'>'+esc(o.replace(/_/g,' '))+'</option>').join('')+'</select></label>';
 if(['shift_program','move_cash_in','shift_line','shift_position'].includes(k))fields+=inputF('months','Shift by months (negative = earlier)','number',' step="1"');
 if(['scale_line','scale_category'].includes(k)||(k==='change_salary'&&String(d.amount??'')===''))fields+=inputF('pct','Change in %','number',' step="0.1"');
 if(k==='scale_category')fields+=selF('category','Category',ORDERCATS.filter(c=>c!=='People'),d.category)+inputF('from_month','From month (optional)','month','');
 if(k==='stop_line')fields+=inputF('from_month','Stop from month','month','');
 if(k==='change_salary')fields+=inputF('amount','Or new annual salary','number',' min="0" step="1"');
 if(k==='add_line')fields+=inputF('label','Name','text','')+selF('line_direction','Direction',['spend','cash_in'],d.line_direction||'spend')+selF('line_category','Category',ORDERCATS,d.line_category||'Other')+selF('line_driver','Driver',['monthly','one_off','spread'],d.line_driver||'monthly')+inputF('amount','Amount','number',' min="0" step="1"')+selF('currency','Currency',CURRENCIES,d.currency||C2)+inputF('from_month','Start month','month','')+inputF('to_month','End month (optional)','month','')+selF('line_status','Status',['committed','discretionary','contingent'],d.line_status||'committed')+((d.line_direction||'spend')==='cash_in'?selF('line_cash_in_type','Cash-in type',CASH_IN_TYPES,d.line_cash_in_type||'equity'):'');
 if(['scale_program','fx_shift'].includes(k))fields+=inputF('pct',k==='fx_shift'?'Change in % (positive = costs more)':'Change in %','number',' step="0.1"');
 if(k==='fx_shift')fields+='<label class="k-field"><span>Currency</span><select name="currency" data-ui-state="true" data-action="change-draft"><option value="">Choose…</option>'+CURRENCIES.filter(c=>c!==C2).map(c=>'<option'+(d.currency===c?' selected':'')+'>'+c+'</option>').join('')+'</select></label>';
 if(['stop_program','add_position','remove_position'].includes(k))fields+=inputF('from_month',k==='add_position'?'Start month':k==='remove_position'?'From month (blank = remove entirely)':'Stop from month','month','');
 if(k==='add_position')fields+=inputF('label','Title','text','')+inputF('amount','Annual salary','number',' min="0" step="1"')+'<label class="k-field"><span>Currency</span><select name="currency" data-ui-state="true" data-action="change-draft">'+CURRENCIES.map(c=>'<option'+((d.currency||C2)===c?' selected':'')+'>'+c+'</option>').join('')+'</select></label>';
 return {p,d,k,fields};}

/* ---------- Monthly close ---------- */
function snapshotsCard(){const rows=closesSorted;return card('Snapshots',rows.length?simpleTable([{label:'Month'},{label:'Closing balance',num:true},{label:'Runway'},{label:'Cash-out'},{label:'Status'},{label:''}],rows.slice(0,24).map(r=>{const mt=parseJSON(r.data.metrics);return ['<strong>'+esc(fmtMonth(r.data.month))+'</strong>',esc(money(num(r.data.closing_balance),r.data.currency)),esc(mt&&mt.runway?runwayText(mt.runway):num(r.data.runway_months)!==null?plural(num(r.data.runway_months),'month'):'—'),esc(fmtMonth(r.data.cash_out_month)),pill(r.data.runway_status==='below_target'?'Below target':r.data.runway_status==='ok'?'OK':'—',r.data.runway_status==='below_target'?'red':'green'),btn('Open','snapshot:'+r.id)];}),{label:'Snapshots'}):muted('No snapshots yet. Each close freezes one.'),{sub:'Frozen at each close; they never change'});}
function actualsScreen(){
 if(PENDING)return topRow()+loading('the monthly close');
 if(!settingsRow)return topRow()+kit.empty({title:'Set up the runway first',text:'Months are closed from the opening bank balance onwards.',...(canWrite('settings')?{action:{label:'Set up runway',action:'setup'}}:{})});
 const nextOpen=model.A?addMonths(model.A,1):'',canClose=canWrite('closes')&&exact&&!!nextOpen;
 let body=topRow('',canWrite('closes')&&nextOpen?btn('Close '+monthLabel(nextOpen),'open-close',{primary:true,disabled:!canClose}):'')+provisional();
 body+=card('Starting point','<div class="rw-kv"><span>Opening bank balance'+(C?' ('+esc(C)+')':'')+'</span>'+valueCell('settings','opening_balance',settingsRow)+'</div><div class="rw-kv"><span>Month-end date of that balance</span>'+valueCell('settings','opening_date',settingsRow)+'</div>',{sub:'The forecast starts here, then rolls forward with each closed month.'});
 const months=[];if(model.O){const last=BASE.actuals.map(a=>ym(a.month)).filter(Boolean).sort().pop()||'';const end=[addMonths(model.A||model.O,1),last].sort().pop();for(let m=addMonths(model.O,1);m<=end&&months.length<60;m=addMonths(m,1))months.push(m);}
 const closedSet={};for(const r of closesSorted)closedSet[ym(r.data.month)]=r;
 // P3: how many actual records each month holds, counted over the whole table.
 const sum=summarize('actuals','month'),perMonth={};if(sum&&!sum.pending)for(const g of sum.groups||[])perMonth[ym(g.label)]=(perMonth[ym(g.label)]||0)+Number(g.count||0);
 body+=card('Months',months.length?simpleTable([{label:'Month'},{label:'Status'},{label:'Actual spend',num:true},{label:'Records',num:true},{label:'Closing balance',num:true},{label:''}],months.slice().reverse().slice(0,24).map(m=>{const c=closedSet[m],am=model.actualMonth(m);
  return ['<strong>'+esc(monthLabel(m))+'</strong>',pill(c?'Closed':m===nextOpen?'Next to close':'Open',c?'green':m===nextOpen?'amber':''),esc(am.count?money(am.spendTotal):'No actuals'),esc(sum?sum.pending?'…':String(perMonth[m]||0):'—'),esc(c?money(num(c.data.closing_balance),c.data.currency):'—'),'<div class="k-row rw-actions">'+(c?btn('Snapshot','snapshot:'+c.id)+(writableField('closes','commentary')?btn('Commentary','commentary:'+c.id):''):canWrite('actuals')?btn('Add actual','add:actuals'):'')+'</div>'];}),{label:'Months'}):kit.empty({title:'No month to close yet',text:'The first month after the opening date can be closed with its bank balance and actuals.',...(canClose?{action:{label:'Close '+monthLabel(nextOpen),action:'open-close'}}:{})}),{sub:'Close each month in order with the bank balance and the actuals by category'});
 const closedMonths=closesSorted.map(r=>ym(r.data.month)),vm=closedMonths.includes(st.varMonth)?st.varMonth:closedMonths[0];
 let vb='';
 if(!vm)vb=muted('Variance appears after the first close.');
 else{const b=budgetFor(vm),v=b?varianceFor(model,b,vm):null;
  if(!b)vb=muted('No budget is locked for '+vm.slice(0,4)+'. Lock one in Plan → Budgets.');
  else if(!v)vb=muted('The locked budget has no values for '+monthLabel(vm)+'.');
  else if(!v.count)vb=muted('No actuals are recorded for '+monthLabel(vm)+', so there is no variance to show.');
  else{const row=(lab,bu,ac,df,pc)=>[lab,esc(money(bu)),esc(money(ac)),'<span class="'+(df>0?'rw-neg':df<0?'rw-pos':'')+'">'+esc((df>0?'+':'')+money(df))+'</span>',esc(pc===null?'—':(pc>0?'+':'')+grouped(pc,1)+'%')];const head=[{label:'Category'},{label:'Budget',num:true},{label:'Actual',num:true},{label:'Variance',num:true},{label:'%',num:true}];
   vb=simpleTable(head,v.rows.map(r=>row(esc(r.cat),r.budget,r.actual,r.diff,r.pct)).concat([row('<strong>Total spend</strong>',v.totalBudget,v.totalActual,v.totalActual-v.totalBudget,v.totalBudget?(v.totalActual-v.totalBudget)/v.totalBudget*100:null)]),{label:'Variance by category'})+
    (v.progRows.length?'<h3 class="rw-h3">By program (coded actuals)</h3>'+simpleTable([{label:'Program · category'}].concat(head.slice(1)),v.progRows.map(r=>row(esc(progName(r.pid)+' · '+r.cat),r.budget,r.actual,r.diff,r.pct)),{label:'Variance by program',compact:true}):'');
   const c=closedSet[vm];vb+='<h3 class="rw-h3">Commentary</h3><p class="rw-commentary">'+esc(c&&c.data.commentary?c.data.commentary:'No commentary yet.')+'</p>'+(c&&writableField('closes','commentary')?btn('Edit commentary','commentary:'+c.id):'');}}
 body+=card('Variance against budget',vb,{sub:'Actual − budget by category, and by program where actuals are coded · '+C2,actions:closedMonths.length?'<label class="k-picker"><span>Month</span><select name="var_month" data-ui-state="true" data-action="var-month">'+closedMonths.map(m=>'<option value="'+m+'"'+(m===vm?' selected':'')+'>'+esc(monthLabel(m))+'</option>').join('')+'</select></label>':''});
 body+=snapshotsCard();
 const am=R.actuals.rows.slice().sort((a,b)=>String(b.data.month||'').localeCompare(String(a.data.month||''))),p=pageOf(am);
 body+=card('Actual records',am.length?kit.table({columns:[{label:'Month',render:r=>esc(fmtMonth(r.data.month))},{label:'Category',render:r=>valueCell('actuals','category',r)},{label:'Program',render:r=>esc(progName(r.data.program_id))},{label:'Direction',render:r=>pill(r.data.direction==='cash_in'?'Cash in':'Spend',r.data.direction==='cash_in'?'blue':'')},{label:'Amount',render:r=>valueCell('actuals','amount',r)},{label:'Note',render:r=>valueCell('actuals','note',r)},{label:'Actions',render:r=>closedMonth(ym(r.data.month))?'<span class="k-muted k-small">Closed</span>':rowActions('actuals',r)}],rows:p.slice})+p.pager:kit.empty({title:'No actuals yet',text:'Record what was spent and received each month, or enter it while closing the month.',...(canWrite('actuals')?{action:{label:'Add actual',action:'add:actuals'}}:{})}),{sub:'Closed months are frozen'+(R.actuals.truncated?' · '+readNote('actuals'):''),actions:am.length&&canWrite('actuals')?btn('Add actual','add:actuals'):'',label:'Actual records'});
 return body;}

/* ---------- Data lists: exchange rates, programs, organizations ---------- */
function listScreen(role,o){const w=canWrite(role);let body=topRow(searchBox('Search '+o.plural),w?btn(o.add,'add:'+role,{primary:true}):'');
 if(!PAGE||PAGE.pending)return body+(o.before||'')+loading(o.plural);
 if(PAGE.unavailable)return body+card(o.title,muted('You do not have access to the '+ROLE_LABEL[role]+' table.'));
 const rows=PAGE.rows,total=PAGE.total;
 if(!rows.length)return body+(o.before||'')+(st.query?kit.empty({title:'Nothing matches “'+st.query+'”',text:'Change the search.',action:{label:'Clear search',action:'clear-filters'}}):kit.empty({title:o.empty,text:o.emptyText,...(w?{action:{label:o.add,action:'add:'+role}}:{})}));
 return body+(o.before||'')+card(o.title,kit.table({columns:o.columns.concat([{label:'Actions',render:r=>rowActions(role,r,{noEdit:!o.edit})}]),rows})+(total===null||total>PER||st.offset?kit.pager({offset:st.offset,limit:PER,total,action:'offset'}):''),{sub:o.sub(total),label:o.title});}
function ratesScreen(){const used=summarize('rates','currency');
 const before=used?used.pending?loading('exchange-rate totals'):card('',('<div class="k-grid rw-stats">'+((used.groups||[]).filter(g=>g.label).slice(0,12).map(g=>kit.stat(g.label+' · months on file',String(g.count))).join('')||kit.stat('Rates on file','0'))+'</div>')+muted('Monthly average units per 1 EUR (ECB convention). Closed months use their own month; future months use the latest available rate. A missing rate excludes the row and is never guessed.'+(C?' Reporting currency: '+C+'.':''))):'';
 return listScreen('rates',{title:'Monthly exchange rates',plural:'exchange rates',add:'Add rate',empty:'No exchange rates yet',emptyText:'Add a monthly rate for every currency other than the reporting currency. The optional monthly exchange-rate automation can add them for you.',edit:true,before,
  sub:t=>(t===null?'':plural(t,'rate'))+' · newest first',columns:[{label:'Month',render:r=>esc(fmtMonth(r.data.month))},{label:'Currency',render:r=>esc(r.data.currency||'—')},{label:'Per 1 EUR',render:r=>valueCell('rates','rate_per_eur',r)},{label:'Source',render:r=>valueCell('rates','source',r)},{label:'Reference',render:r=>valueCell('rates','source_ref',r)}]});}
function programsScreen(){return listScreen('programs',{title:'Programs',plural:'programs',add:'Add program',empty:'No programs yet',emptyText:'Add the programs that spend is planned against. Other apps such as Programs use the same records.',edit:true,
 sub:t=>(t===null?'':plural(t,'program'))+' · shared with other apps in this workspace',columns:[{label:'Program',render:r=>valueCell('programs','name',r,{strong:true})+(bool(r.data.archived)?' '+pill('Archived',''):'')},{label:'Code',render:r=>valueCell('programs','code',r)},{label:'Stage',render:r=>valueCell('programs','stage',r)},{label:'Status',render:r=>valueCell('programs','status',r)},{label:'Lead',render:r=>valueCell('programs','lead',r)}]});}
function organizationsScreen(){return listScreen('organizations',{title:'Organizations',plural:'organizations',add:'Add organization',empty:'No organizations yet',emptyText:'Add the vendors, investors and funders that plan lines refer to.',edit:true,
 sub:t=>(t===null?'':plural(t,'organization'))+' · shared with other apps in this workspace',columns:[{label:'Organization',render:r=>valueCell('organizations','name',r,{strong:true})+(bool(r.data.archived)?' '+pill('Archived',''):'')},{label:'Type',render:r=>valueCell('organizations','org_type',r)},{label:'Country',render:r=>valueCell('organizations','country',r)},{label:'Website',render:r=>valueCell('organizations','website',r)}]});}

/* ---------- Settings (owners only, G6) ---------- */
function settingsScreen(){
 if(PENDING)return loading('settings');
 if(!settingsRow)return kit.empty({title:'Set up the runway first',text:'Settings hold the reporting currency, runway target and cost assumptions.',...(canWrite('settings')?{action:{label:'Set up runway',action:'setup'}}:{})});
 const v=k=>SET[k]===null||SET[k]===undefined?'':String(SET[k]);
 const fields=[{name:'reporting_currency',label:'Reporting currency',options:CURRENCIES,value:v('reporting_currency')},{name:'enabled_currencies',label:'Currencies in use (comma list)',value:v('enabled_currencies')},{name:'runway_target_months',label:'Runway target (months)',value:String(target)},{name:'trailing_window_months',label:'Trailing burn window (months)',options:['3','6'],value:String(trailingN)},{name:'min_cash_reserve',label:'Minimum cash reserve',value:v('min_cash_reserve')},{name:'loaded_cost_pct',label:'Loaded cost % on salaries',value:v('loaded_cost_pct')},{name:'categories',label:'Spend categories in order (comma list)',value:v('categories')||CATEGORIES.join(', ')}].filter(f=>writableField('settings',f.name));
 return topRow()+card('Runway settings',(fields.length?kit.settings({fields,action:'settings:save'},inp):muted('You cannot change these settings.'))+'<p class="k-muted k-small">Who may see salaries is set under <a href="platform:access">Access</a>. Optional alerts, the month-close reminder and the monthly exchange-rate update are under <a href="platform:automations">Automations</a>.</p>',{sub:'Business choices that change how the forecast is calculated. Only owners of this app see them.'});}

/* ---------- side panels: create a record or edit many fields (kit.panel) ---------- */
function fieldControl(role,f,x){const v=x.draft[f.key]??'',dis=!writableField(role,f.key)?' disabled':'',common=' name="'+esc(f.key)+'" data-ui-state="true" data-action="draft:'+esc(f.key)+'"'+dis+(f.required?' required':'');
 if(f.kind==='select')return '<select'+common+'><option value="">Choose…</option>'+(f.options||[]).map(o=>'<option value="'+esc(o)+'"'+(String(v)===o?' selected':'')+'>'+esc(o.replace(/_/g,' '))+'</option>').join('')+'</select>';
 if(f.kind==='ref'){const rows=R[f.ref].rows||[],cur=String(v||''),keep=cur&&!rows.some(r=>r.id===cur);return '<select'+common+'><option value="">None</option>'+(keep?'<option value="'+esc(cur)+'" selected>'+esc(refName(f.ref,cur,f.ref==='programs'?'program':undefined))+'</option>':'')+rows.map(r=>'<option value="'+esc(r.id)+'"'+(cur===r.id?' selected':'')+'>'+esc(String(r.data.name||'Unnamed'))+'</option>').join('')+'</select>';}
 if(f.kind==='longtext')return '<textarea'+common+' rows="4">'+esc(v)+'</textarea>';
 if(f.kind==='boolean')return '<select'+common+'><option value="false"'+(!bool(v)?' selected':'')+'>No</option><option value="true"'+(bool(v)?' selected':'')+'>Yes</option></select>';
 const type=f.kind==='month'?'month':f.kind==='date'?'date':f.kind==='number'||f.kind==='money'?'number':'text',val=f.kind==='month'?(ym(v)||String(v||'')):v;
 return '<input type="'+type+'"'+common+(f.kind==='money'?' min="0" step="0.01"':f.kind==='number'?' step="any"':'')+' value="'+esc(val)+'">';}
function editPanel(){const x=st.panel,role=x.role;if(!roleMap[role])return '';
 const title=(x.mode==='edit'?'Edit ':x.mode==='duplicate'?'Duplicate ':'Add ')+(role==='settings'?'runway setup':role==='closes'?'commentary':ROLE_LABEL[role]);
 const fields=editorFields(x);let effect='';
 if((role==='positions'||role==='lines')&&!PENDING&&model.ready&&exact){try{const e=effectOf(role,x.draft,x.id,x.mode==='edit'?'update':'create');if(e)effect='<div class="rw-effect"><span>Runway effect</span><strong>'+esc(runwayText(model.runway))+' → '+esc(runwayText(e.after?{months:e.after.months,beyond:e.after.beyond}:null))+'</strong></div>';}catch(e){effect='<div class="rw-effect"><span>Runway effect</span><span class="k-muted">Complete the required fields to see it</span></div>';}}
 const body='<form data-action="panel:save">'+effect+fields.map(f=>'<label class="k-field"><span>'+esc(fieldLabel(role,f))+(f.required?' *':'')+(f.extra?' (additional)':'')+'</span>'+fieldControl(role,f,x)+'</label>').join('')+(role==='positions'&&salaryRestricted?muted('Salary is restricted for you and is not shown or changed.'):'')+(role==='settings'&&x.mode==='create'?muted('The opening balance is the bank balance at the end of that month, in the reporting currency.'):'')+'<div class="k-row">'+btn('Cancel','panel:close')+'<button type="submit" class="k-button k-button--primary"'+(canWrite(role)?'':' disabled')+'>'+(x.mode==='edit'?'Save':'Add')+'</button></div></form>';
 return kit.panel({title,body,close:'panel:close'});}
function schedulePanel(){const s=st.panel,sel=(name,opts,val)=>'<select name="'+name+'" data-ui-state="true" data-action="schedule-draft">'+opts.map(o=>'<option value="'+esc(o[0])+'"'+(String(val||'')===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select>';
 const f=(label,control)=>'<label class="k-field"><span>'+esc(label)+'</span>'+control+'</label>';
 const body='<form data-action="schedule-save">'+muted('Creates one one-off spend line per instalment, sharing a schedule group.')+f('Name *','<input name="name" data-ui-state="true" data-action="schedule-draft" value="'+esc(s.name)+'" required>')+f('Schedule group','<input name="group" data-ui-state="true" data-action="schedule-draft" value="'+esc(s.group)+'" placeholder="Defaults to the name">')+
  f('Category',sel('category',enabledCats.map(c=>[c,c]),s.category))+f('Currency',sel('currency',CURRENCIES.map(c=>[c,c]),s.currency))+f('Status',sel('status',[['committed','committed'],['discretionary','discretionary'],['contingent','contingent']],s.status))+(roleMap.programs?f('Program',sel('program_id',[['','No program']].concat(programOptions()),s.program_id)):'')+
  '<h3 class="rw-h3">Instalments</h3>'+s.rows.map((r,i)=>'<div class="k-row">'+f('Month '+(i+1),'<input type="month" name="month_'+i+'" data-ui-state="true" data-action="schedule-draft" value="'+esc(ym(r.month)||r.month||'')+'">')+f('Amount '+(i+1),'<input type="number" min="0" step="0.01" name="amount_'+i+'" data-ui-state="true" data-action="schedule-draft" value="'+esc(r.amount??'')+'">')+'</div>').join('')+
  '<div class="k-row">'+btn('Add instalment','schedule-row',{disabled:s.rows.length>=12})+'<span class="k-grow"></span>'+btn('Cancel','panel:close')+'<button type="submit" class="k-button k-button--primary">Add schedule</button></div></form>';
 return kit.panel({title:'Add payment schedule',body,close:'panel:close'});}
function closePanel(){const d=st.panel,m=ym(d.month)||addMonths(model.A,1),existing=BASE.actuals.filter(a=>ym(a.month)===m);
 const catRow=c=>{const ex=existing.filter(a=>a.direction==='spend'&&a.category===c);if(ex.length){const s=ex.reduce((n,a)=>n+num(a.amount,0),0);return '<div class="rw-kv"><span>'+esc(c)+'</span><strong>'+esc(grouped(s))+' already recorded</strong></div>';}return '<label class="k-field"><span>'+esc(c)+'</span><input type="number" min="0" step="0.01" name="actual_'+esc(c)+'" data-ui-state="true" data-action="close-draft" value="'+esc(d['actual_'+c]??'')+'"></label>';};
 const body='<form data-action="close-submit">'+muted('Saves the actuals and one frozen snapshot of the runway; the forecast then rolls forward to '+monthLabel(m)+'.')+'<input type="hidden" name="month" data-ui-state="true" value="'+esc(m)+'">'+
  '<label class="k-field"><span>Closing bank balance *</span><input type="number" step="0.01" name="closing_balance" data-ui-state="true" data-action="close-draft" value="'+esc(d.closing_balance??'')+'" required></label><label class="k-field"><span>Currency</span><select name="currency" data-ui-state="true" data-action="close-draft">'+CURRENCIES.map(c=>'<option'+((d.currency||C2)===c?' selected':'')+'>'+c+'</option>').join('')+'</select></label>'+
  '<h3 class="rw-h3">Spend by category</h3>'+enabledCats.map(catRow).join('')+'<h3 class="rw-h3">Cash received</h3><label class="k-field"><span>Amount</span><input type="number" min="0" step="0.01" name="cash_in_amount" data-ui-state="true" data-action="close-draft" value="'+esc(d.cash_in_amount??'')+'"></label><label class="k-field"><span>Type</span><select name="cash_in_type" data-ui-state="true" data-action="close-draft"><option value="">Choose…</option>'+CASH_IN_TYPES.map(t=>'<option value="'+t+'"'+(d.cash_in_type===t?' selected':'')+'>'+t.replace('_',' ')+'</option>').join('')+'</select></label>'+
  '<label class="k-field"><span>Commentary</span><textarea name="commentary" rows="4" data-ui-state="true" data-action="close-draft">'+esc(d.commentary??'')+'</textarea></label>'+muted('Amounts use the selected currency. Program-level actuals can be added as actual records before closing.')+'<div class="k-row">'+btn('Cancel','panel:close')+'<button type="submit" class="k-button k-button--primary">Close '+esc(monthLabel(m))+'</button></div></form>';
 return kit.panel({title:'Close '+monthLabel(m),body,close:'panel:close'});}
function snapshotPanel(){const r=findRow('closes',st.panel.id);if(!r)return '';const s=parseJSON(r.data.metrics),kv=(k,v)=>'<div class="rw-kv"><span>'+esc(k)+'</span><strong>'+esc(v)+'</strong></div>';
 let body=kv('Closing balance',money(num(r.data.closing_balance),r.data.currency));
 if(s&&s.runway){body+=kv('Runway',runwayText(s.runway))+kv('Cash lasts until',monthLabel(s.runway.lastsUntil))+kv('Cash-out month',s.runway.cashOut?monthLabel(s.runway.cashOut):'Beyond horizon')+kv('Start raise',s.runway.startRaise?monthLabel(s.runway.startRaise):'—')+kv('With contingent cash',s.runwayContingent?runwayText(s.runwayContingent):'—')+(s.trailing?kv('Trailing runway ('+s.trailing.window+' months)',grouped(s.trailing.months,1)+' months'):'');
  if(s.burn)body+='<h3 class="rw-h3">Burn in '+esc(monthLabel(s.asOf))+'</h3>'+Object.entries(s.burn.spend||{}).map(([k,v])=>kv(k,money(v,s.currency))).join('')+kv('Net burn',money(s.burn.net,s.currency));
  if(s.variance)body+='<h3 class="rw-h3">Variance against '+esc(s.variance.budget)+'</h3>'+s.variance.rows.map(v=>kv(v.cat,money(v.actual,s.currency)+' vs '+money(v.budget,s.currency))).join('');
  if(s.milestones&&s.milestones.length)body+='<h3 class="rw-h3">Milestones</h3>'+s.milestones.map(x=>kv(x.name+' · '+monthLabel(x.m),money(x.cash,s.currency)+' · cushion '+(x.cushion===null?'—':(x.beyond?'≥ ':'')+plural(x.cushion,'month')))).join('');}
 else body+=muted('This close has no frozen metrics.');
 body+='<h3 class="rw-h3">Commentary</h3><p class="rw-commentary">'+esc(r.data.commentary||'No commentary.')+'</p>'+(writableField('closes','commentary')?btn('Edit commentary','commentary:'+r.id):'');
 return kit.panel({title:'Snapshot · '+fmtMonth(r.data.month),body,close:'panel:close'});}
function panelHtml(){const p=st.panel;if(!p||PENDING)return '';try{
 if(p.kind==='edit')return editPanel();if(p.kind==='schedule')return schedulePanel();if(p.kind==='close'&&model.ready)return closePanel();if(p.kind==='snapshot')return snapshotPanel();}catch(e){notify('error',errText(e));}return '';}
/* ---------- app commands (2.2.0) ---------- */
/* Every command replays the same events a person's clicks would send, or calls the same function the click calls,
 * so the proposal is identical. Results come only from this engine; assistants never compute them. */
function runwayResult(r){return r?{months:r.months,beyond:!!r.beyond,lasts_until:r.lastsUntil||null,cash_out:r.beyond?null:r.cashOut||null,start_raise:r.beyond?null:r.startRaise||null}:null;}
function modelResult(m){if(salaryBlock)return {restricted:true,message:'Salaries are restricted for you, so live people cost and runway are not available. Read the latest snapshot instead.'};
 return {as_of:m.A||null,currency:m.cur||null,exact:!!(m.ready&&!readProblems.length),blocks:m.blocks.concat(readProblems),warnings:m.warns.slice(0,10),excluded_rates:excludedText(m.excluded)||null,
  runway:m.ready?runwayResult(m.runway):null,runway_with_contingent:m.ready?runwayResult(m.runwayC):null,target_months:target,
  milestones:m.milestones.filter(x=>!x.passed).slice(0,20).map(x=>({name:x.name,month:x.m,cash:x.cash===null?null:round2(x.cash),cushion_months:x.cushion?x.cushion.months:null,cushion_beyond:x.cushion?!!x.cushion.beyond:false,source:x.source}))};}
function snapshotResult(){if(!latestSnap)return null;const s=latestSnap.m;return {month:latestSnap.row.data.month,currency:s.currency,runway:s.runway?runwayResult(s.runway):null,burn:s.burn||null,milestones:s.milestones||[],commentary:latestSnap.row.data.commentary||null};}
function changesInput(list){return (Array.isArray(list)?list:[]).map(c=>normalizeChange(c&&typeof c==='object'?c:{}));}
function modelFor(v){if(v.scenario_id){const sc=scenarioList.find(x=>x.id===v.scenario_id);if(!sc)throw Error('Scenario not found.');return {m:engine(BASE,{changes:sc.changes}),label:'Scenario: '+sc.name};}
 if(Array.isArray(v.changes)&&v.changes.length){const ch=changesInput(v.changes);return {m:engine(BASE,{changes:ch}),label:'What-if',changes:ch};}return {m:model,label:'Live forecast'};}
function cashRows(m,inc){if(salaryBlock)throw Error('Salaries are restricted for you, so live cash flow is not available.');if(!m.ready)throw Error('The forecast cannot be calculated: '+m.blocks.concat(readProblems).join(' '));let prev=m.start;
 return m.months.map(x=>{const close=inc?x.closeCont:x.close,o={month:x.m,opening:round2(prev),cash_in:round2(x.cashBase+(inc?x.cashCont:0)),spend:Object.fromEntries(Object.entries(x.spend).map(([k,v])=>[k,round2(v)])),spend_total:round2(x.spendTotal),people:round2(x.people),net_burn:round2(x.netBurn),closing:round2(close)};prev=close;return o;});}
function sourceModel(src){src=String(src||'forecast');if(src.startsWith('scenario:'))return modelFor({scenario_id:src.slice(9)});if(src!=='forecast')throw Error('Use source forecast or scenario:<id>, or pass changes.');return {m:model,label:'Live forecast'};}
const need=(v,k)=>{if(v[k]===undefined||v[k]===null||v[k]==='')throw Error('Missing input: '+k);return v[k];};
const EDIT_ROLES=['settings','lines','positions','milestones','programItems','actuals','rates','programs','organizations','agreements','awards','obligations','tranches'];
/* record.save and the *.save commands fill the same side panel a person uses and save it the same way. */
function recordSave(role,v,dup){if(role==='milestones')role=MS_ROLE;if(!EDIT_ROLES.includes(role)||!roleMap[role])throw Error('Runway has no '+role+' form.');
 if(role==='settings'){if(settingsRow)openEditor('settings','edit',settingsRow.id);else openEditor('settings','create',null,{reporting_currency:'EUR',runway_target_months:18,trailing_window_months:3,loaded_cost_pct:0,min_cash_reserve:0,categories:CATEGORIES.join(', '),enabled_currencies:'EUR, USD'});}
 else if(dup)openEditor(role,'duplicate',need(v,'id'));else if(v.id)openEditor(role,'edit',v.id);else openEditor(role,'create',null,PRESETS[role]?PRESETS[role]():{});
 const x=st.panel,f=v.fields&&typeof v.fields==='object'?v.fields:{};
 const known=fieldsOf(role).map(y=>y.key),bad=Object.keys(f).filter(k=>!known.includes(k));if(bad.length)throw Error('Unknown field'+(bad.length>1?'s':'')+' for '+ROLE_LABEL[role]+': '+bad.join(', ')+'. Use schema.describe.');
 const hidden=Object.keys(f).filter(k=>!editorFields({...x,draft:{...x.draft,...f}}).some(y=>y.key===k));if(hidden.length)throw Error('Not editable in this form: '+hidden.join(', ')+(role==='settings'&&!OWNER?' (runway settings are for owners of this app)':'')+'.');
 const effect=(()=>{try{return effectOf(role,{...x.draft,...f},x.id,x.mode==='edit'?'update':'create');}catch(e){return null;}})();
 saveEditor(formOf(x,f));st.panel=null;return effect?{runway_effect:effect}:{};}
function archive(role,id){if(role==='milestones')role=MS_ROLE;removeRecord(role,id);return {};}
function categoriesSave(list){const v={fields:{categories:list.join(', ')}};if(!settingsRow)throw Error('Create settings first.');return recordSave('settings',v);}
const COMMANDS={
 'schema.describe':()=>({currency:C2||null,categories:{shown:enabledCats,all:ALLCATS,custom:ALLCATS.filter(c=>!CATEGORIES.includes(c))},
  forms:Object.fromEntries(EDIT_ROLES.filter(r=>roleMap[r]&&(r!=='milestones'||MS_ROLE==='milestones')).map(r=>[r,{label:ROLE_LABEL[r],writable:canWrite(r),fields:fieldsOf(r).filter(f=>f.kind!=='frozen'&&!f.system&&roleMap[r].fields[f.key]).map(f=>({key:f.key,label:fieldLabel(r,f),kind:f.kind==='ref'?'record_id':f.kind,required:!!f.required,...(f.options?{options:f.options}:{}),...(f.ref?{references:f.ref}:{}),...(f.extra?{additional:true}:{}),writable:writableField(r,f.key)}))}])),
  scenario_change_kinds:CHANGE_KINDS.map(k=>({kind:k,label:CHANGE_LABELS[k]})),change_parameters:'target_id (program, line or position record ID), months, pct, amount, currency, from_month (YYYY-MM), label, category; add_line takes line:{name,direction,category,program_id,driver,amount,currency,start_month,end_month,status,cash_in_type}.',
  milestones:MS_ROLE==='programItems'?(OWN_ITEMS?'Runway milestone list (programs.plan_items, own entries)':'Programs app key milestones (read only; change them in Programs)'):'Runway milestones',
  layout:{screens:LAYOUT_SCREENS.map(x=>x.id),groups:Object.keys(templateLayoutSchema.groups)},programs:R.programs.rows.map(r=>({id:r.id,name:r.data.name}))}),
 'summary.read':v=>{const r=modelResult(model);if(r.restricted)return {...r,snapshot:snapshotResult()};const b=bridge();return {...r,sentence:sentence(model)||null,trailing:model.trailing&&model.trailing.months!==null?{avg_burn:round2(model.trailing.avg),months:round2(model.trailing.months),window:trailingN}:null,since_last_snapshot:b&&!b.unavailable?{total:b.total,parts:b.parts}:null,latest_snapshot:snapshotResult(),include_contingent:!!v.include_contingent};},
 'cashflow.read':v=>{const {m,label}=v.changes&&v.changes.length?modelFor(v):sourceModel(v.source);let rows=cashRows(m,!!v.include_contingent);if(v.from)rows=rows.filter(r=>r.month>=ym(v.from));if(v.to)rows=rows.filter(r=>r.month<=ym(v.to));return {label,currency:C2,rows};},
 'cashflow.drill':v=>{if(salaryBlock)throw Error('Salaries are restricted for you.');const {m}=sourceModel(v.source),mm=ym(v.month);if(!m.ready||!mm)throw Error('Choose a forecast month.');const p=m.planMonth(mm);return {month:mm,category:v.category,currency:C2,items:(p.drill[v.category]||[]).map(x=>({kind:x.kind,id:x.id,name:x.name,original:round2(x.original),currency:x.currency,converted:round2(x.converted),program_id:x.program||null}))};},
 'export.csv':v=>{const {m,label}=sourceModel(v.source),rows=cashRows(m,!!v.include_contingent),cats=ORDERCATS.filter(c=>rows.some(r=>r.spend[c]));const q=x=>{const t=String(x);return /[",\n]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t;};
  return {label,currency:C2,csv:[['Month','Opening','Cash in'].concat(cats,['Net burn','Closing']).map(q).join(',')].concat(rows.map(r=>[r.month,r.opening,r.cash_in].concat(cats.map(c=>r.spend[c]||0),[r.net_burn,r.closing]).map(q).join(','))).join('\n')};},
 'bridge.read':()=>{if(salaryBlock)throw Error('Salaries are restricted for you.');const b=bridge();return b?b.unavailable?{unavailable:true,as_of:b.asOf}:{since:b.asOf,from:runwayResult(b.from),to:runwayResult(b.to),total:b.total,parts:b.parts,capped:b.capped}:{unavailable:true,message:'There is no snapshot to compare with yet, or the data checks failed.'};},
 'variance.read':v=>{const mm=ym(v.month)||model.A,b=mm?budgetFor(mm):null;if(!b)return {month:mm,budget:null,message:'No locked budget covers this month.'};const x=varianceFor(model,b,mm);return x?{month:mm,budget:x.budgetName,currency:C2,rows:x.rows.map(r=>({category:r.cat,budget:round2(r.budget),actual:round2(r.actual),variance:round2(r.diff),pct:r.pct===null?null:round2(r.pct)})),by_program:x.progRows.map(r=>({program_id:r.pid,category:r.cat,budget:round2(r.budget),actual:round2(r.actual),variance:round2(r.diff)}))}:{month:mm,message:'No budget month or actuals for this month.'};},
 'scenario.evaluate':v=>{const {m,label,changes}=modelFor(v);const r=modelResult(m);if(r.restricted)return r;return {label,changes:(changes||[]).map(c=>({...c,description:describe(c)})),result:r,base:{runway:runwayResult(model.runway),runway_with_contingent:runwayResult(model.runwayC)},difference_months:model.ready&&m.ready?m.runway.months-model.runway.months:null,notes:m.warns.filter(w=>/Change \d|not scaled/.test(w))};},
 'scenario.compare':v=>{const out=[{id:'forecast',label:'Live forecast',...modelResult(model)}];for(const id of (v.ids||[]).filter(x=>x!=='forecast').slice(0,4)){const sc=scenarioList.find(x=>x.id===id||'scenario:'+x.id===id);if(!sc)throw Error('Scenario not found: '+id);out.push({id:sc.id,label:sc.name,outdated:sc.outdated,status:sc.status,...modelResult(engine(BASE,{changes:sc.changes}))});}if(v.changes&&v.changes.length)out.push({id:'what-if',label:'What-if',...modelResult(engine(BASE,{changes:changesInput(v.changes)}))});return {currency:C2,compared:out};},
 'sources.read':()=>sourcesResult(),
 'record.save':v=>recordSave(String(v.role),v),
 'record.duplicate':v=>recordSave(String(v.role),v,true),
 'record.archive':v=>archive(String(v.role),need(v,'id')),
 'settings.save':v=>recordSave('settings',v),
 'line.save':v=>recordSave('lines',v),'line.archive':v=>archive('lines',v.id),
 'position.save':v=>recordSave('positions',v),'position.archive':v=>archive('positions',v.id),
 'milestone.save':v=>recordSave('milestones',v),'milestone.archive':v=>archive('milestones',v.id),
 'fx.save':v=>recordSave('rates',v),'program.save':v=>recordSave('programs',v),'organization.save':v=>recordSave('organizations',v),
 'actuals.save':v=>{for(const row of v.rows)recordSave('actuals',{fields:row});return {rows:v.rows.length};},
 'schedule.create':v=>{const d={name:v.name,group:v.group||'',category:v.category||'Clinical',currency:v.currency||C2,status:v.status||'committed',program_id:v.program_id||'',rows:v.instalments.map(x=>({month:formValue(ym(x.month)||x.month),amount:formValue(x.amount)}))};scheduleSave(d);return {instalments:v.instalments.length};},
 'month.close':v=>{const mm=ym(v.month);const d={month:mm,closing_balance:formValue(v.closing_balance),currency:v.currency||C2,cash_in_amount:formValue(v.cash_in_amount),cash_in_type:v.cash_in_type||'',commentary:v.commentary||''};for(const [k,x] of Object.entries(v.actuals||{})){if(!ALLCATS.includes(k))throw Error('Unknown category: '+k);d['actual_'+k]=formValue(x);}closeMonth(d);return {month:mm};},
 'commentary.save':v=>{const c=closesSorted.find(r=>ym(r.data.month)===ym(v.month));if(!c)throw Error('That month is not closed.');openEditor('closes','edit',c.id);saveEditor({commentary:String(v.commentary)});return {month:ym(v.month)};},
 'budget.lock':v=>{lockBudget(String(v.year));return {year:String(v.year)};},
 'scenario.save':v=>{const ch=changesInput(v.changes),draft=v.draft_id?scenarioList.find(x=>x.id===v.draft_id&&x.status==='draft'):null;if(v.draft_id&&!draft)throw Error('That draft scenario is not available.');saveScenario(String(v.name).trim(),ch,v.status==='draft'?'draft':'saved',draft);return {changes:ch.map(describe)};},
 'scenario.copy':v=>{const sc=scenarioList.find(x=>x.id===v.scenario_id);if(!sc)throw Error('Scenario not found.');saveScenario(String(v.name||'Copy of '+sc.name).slice(0,100),sc.changes,'draft',null);return {};},
 'scenario.adopt':v=>({skipped:adoptScenario(v.scenario_id)}),
 'scenario.archive':v=>{archiveScenario(v.scenario_id);return {};},
 'category.add':v=>{const name=String(v.name).trim();if(name.includes(','))throw Error('Category names cannot contain commas.');const list=[...new Set((catList.length?catList:CATEGORIES).concat([name]))];const out=categoriesSave(list);const custom=!CATEGORIES.includes(name);
  return {...out,...(custom?{schema_change:{required:true,message:'Before lines or actuals can use “'+name+'”, add it as an option of the category field in both tables with a reviewed schema change (prepare_change update_type; workspace owner).',tables:['lines','actuals'].filter(r=>roleMap[r]).map(r=>({role:ROLE_KEY[r],typeId:roleMap[r].typeId,field:roleMap[r].fields.category,add_option:name}))}}:{})};},
 'category.hide':v=>{const name=String(v.name).trim();if(['People','Other'].includes(name))throw Error(name+' cannot be hidden: Runway uses it for people cost and unassigned amounts.');const list=(catList.length?catList:CATEGORIES).filter(c=>c!==name);return categoriesSave(list);},
 'source.add_to_plan':v=>{addToPlan(v.role,v.record_id);return {};},
 'source.update_line':v=>{updateFromSource(v.line_id);return {};},
 'layout.save':v=>{const prof=(()=>{try{return JSON.parse(cfg.layoutProfile||'{}');}catch(e){return {};}})(),L=LAYOUT;
  const out={heading:String(v.heading||L.heading).slice(0,100),tabs:L.tabs.slice(),cols:JSON.parse(JSON.stringify(L.cols)),visible:{...L.visible},labels:{...(prof.labels||{})},defaults:{...(prof.defaults||{})}};
  if(v.screens){const want=v.screens.filter(x=>out.tabs.includes(x));out.tabs=[...new Set(want.concat(out.tabs))];}
  for(const [g,ids] of Object.entries(v.order||{})){if(!out.cols[g])throw Error('Unknown field group: '+g);out.cols[g]=[...new Set(ids.filter(x=>out.cols[g].includes(x)).concat(out.cols[g]))];}
  const key=k=>{if(LAYOUT_SCREENS.some(x=>x.id===k))return k;const [g,f]=String(k).split(':');if(!out.cols[g]||!out.cols[g].includes(f))throw Error('Unknown screen or field: '+k+' (use a screen id, or group:field).');return k;};
  for(const k of v.hide||[])out.visible[key(k)]=false;for(const k of v.show||[])delete out.visible[key(k)];
  for(const [k,x] of Object.entries(v.labels||{})){key(k);if(x===null||x==='')delete out.labels[k];else out.labels[k]=String(x).slice(0,100);}
  for(const [k,x] of Object.entries(v.defaults||{})){key(k);if(x===null)delete out.defaults[k];else out.defaults[k]=String(x).slice(0,200);}
  if(!out.tabs.some(id=>out.visible[id]!==false))throw Error('Keep at least one screen visible.');
  for(const [g,role] of [['line_form','lines'],['position_form','positions'],['actual_form','actuals'],['settings_form','settings']])for(const f of S[role])if(f.required&&out.visible[g+':'+f.key]===false)throw Error(f.label+' is required and cannot be hidden.');
  if(!Object.keys(out.labels).length)delete out.labels;if(!Object.keys(out.defaults).length)delete out.defaults;
  tools.call('layout.propose',out);return {layout:'proposed'};}
};
function runCommand(id,raw){let v={};try{v=JSON.parse(raw||'{}')||{};}catch(e){return {ok:false,error:'The command input is not valid JSON.'};}
 const fn=COMMANDS[id];if(!fn)return {ok:false,error:'Runway has no command '+id+'.'};
 BUFFER=[];const before=SAVED.length;
 try{const result=fn(v)||{};
  if(BUFFER.length){if(BUFFER.length>50)throw Error('This change has more than 50 records. Split it into smaller commands.');const changes=BUFFER;BUFFER=null;tools.call('records.save',{changes});}
  return {ok:true,result:SAVED.length>before?{...result,saved:SAVED.slice(before)}:result};}
 catch(e){return {ok:false,error:String(e&&e.message||e).slice(0,600)};}
 finally{BUFFER=null;}}

/* ---------- page ---------- */
if(event.kind==='command')return {html:'',css:'',state:{command:runCommand(action,event.value)}};
let main='';
try{main=st.screen==='overview'?overview():st.screen==='cash_flow'?cashFlow():st.screen==='plan'?planScreen():st.screen==='people'?people():st.screen==='scenarios'?scenariosScreen():st.screen==='actuals'?actualsScreen():st.screen==='rates'?ratesScreen():st.screen==='programs'?programsScreen():st.screen==='organizations'?organizationsScreen():settingsScreen();}
catch(e){notify('error','This screen could not be shown: '+errText(e));main=kit.empty({title:'This screen could not be shown',text:'The data may have changed. Open Overview and try again.',action:{label:'Open Overview',action:'nav:overview'}});}
const navHtml=kit.nav(SCREENS.map(id=>({id,label:SCREEN_LABEL[id]})),st.screen,{side:true,label:'Runway screens'});
const html=kit.page(kit.layout(navHtml,'<div class="rw-screen">'+main+'</div>',{side:true})+panelHtml());
return {html,css:typeof CASH_RUNWAY_CSS==='string'?CASH_RUNWAY_CSS:'',state:st,context:{program:st.program||''},...(NOTICE?{notice:NOTICE}:{})};
