const templateLayoutSchema={"screens":[{"id":"overview","label":"Financial overview"},{"id":"ledger","label":"Expense tracker"},{"id":"budget","label":"Budget planner"},{"id":"scenario","label":"Scenario builder"},{"id":"forecast","label":"Cash forecast"},{"id":"briefing","label":"Financial briefings"}],"groups":{"ledger":[{"id":"name","label":"Name"},{"id":"period","label":"Period"},{"id":"kind","label":"Kind"},{"id":"program","label":"Program"},{"id":"category","label":"Category"},{"id":"amount","label":"Amount"},{"id":"commitment","label":"Commitment"}],"scenarios":[{"id":"name","label":"Name"},{"id":"clinicalMultiplier","label":"Clinical multiplier"},{"id":"peopleDelta","label":"People delta"},{"id":"fundingDelay","label":"Funding delay"},{"id":"reserve","label":"Reserve"}],"briefings":[{"id":"name","label":"Name"},{"id":"period","label":"Period"},{"id":"status","label":"Status"},{"id":"author","label":"Author"}]}};
/* TrialAgents Cash Runway v1.2.2 | frontend-js function body, no DOM/network access.
 * The returned {html,css,state} uses approved HTML/forms/SVG only.
 * All records come from authorized bindings; every write is a reviewed proposal.
 * Layout is edited and reviewed in the native TrialAgents settings host.
 */
const cfg=typeof templateConfiguration==='object'&&templateConfiguration?templateConfiguration:{};
const bindings=Array.isArray(templateBindings)?templateBindings:[];
const inp=input||{};
const event=inp.event||{kind:'open',action:'',value:null,form:{}};
const action=String(event.action||'');
const esc=(v)=>String(v===null||v===undefined?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const grouped=(n,places=0)=>Number(n).toFixed(places).replace(/\B(?=(\d{3})+(?!\d))/g,',');
const money=(v,curr)=>Number.isFinite(Number(v))&&v!==null&&v!==''?(curr||'EUR')+' '+grouped(v,0):'—';
const compact=(v,curr)=>!Number.isFinite(Number(v))||v===null?'—':(Math.abs(Number(v))>=1e6?grouped(Number(v)/1e6,1)+'M':Math.abs(Number(v))>=1e3?grouped(Number(v)/1e3,0)+'k':grouped(Number(v),0))+(curr?' '+curr:'');
const fmt=(v)=>Number.isFinite(Number(v))&&v!==null?grouped(v,0):'—';
const num=(v,otherwise=null)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):otherwise;
const ym=(v)=>/^\d{4}-\d{2}/.test(String(v||''))?String(v).slice(0,7):'';
const addMonths=(v,n)=>{const [y,m]=String(v).split('-').map(Number);if(!y||!m)return '';const d=new Date(Date.UTC(y,m-1+n,1));return d.toISOString().slice(0,7);};
const monthLabel=(v)=>{if(!v)return '—';const [y,m]=v.split('-').map(Number);return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]+' '+String(y).slice(-2);};
const bool=(v)=>v===true||v==='true'||v==='on'||v==='1';
const safeHttp=(v)=>/^https:\/\/[^\s<>"']+$/i.test(String(v||''))?String(v):'';
const sv=(v)=>esc(v).replace(/`/g,'&#96;');
const glyph={overview:'<path d="M3 3v18h18"/><path d="m7 14 4-5 4 3 5-7"/>',ledger:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',budget:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16M15 4v16"/>',scenario:'<path d="M4 21V4m0 8h16m-4-7 4 7-4 7"/><circle cx="8" cy="7" r="2"/><circle cx="13" cy="17" r="2"/>',forecast:'<path d="M3 3v18h18M5 16l5-5 3 2 7-8"/>',briefing:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6m-6 4h6m-6 4h3"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M4.9 4.9 7 7m10 10 2.1 2.1M2 12h3m14 0h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',plus:'<path d="M12 4v16M4 12h16"/>',arrow:'<path d="m9 18 6-6-6-6"/>',trend:'<path d="M3 18h18M3 3v15m4-7 5-5 4 3 5-5"/>',shield:'<path d="M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5Z"/>',dots:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',close:'<path d="M5 5l14 14M19 5 5 19"/>',copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M5 16H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1"/>'};
const icon=(name,size=18)=>'<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(glyph[name]||glyph.overview)+'</svg>';
const btn=(label,a,cls='',disabled=false,extra='')=>'<button type="button" class="'+cls+'" data-action="'+esc(a)+'"'+(disabled?' disabled':'')+' '+extra+'>'+label+'</button>';
const pill=(label,type)=>'<span class="cr-pill '+esc(type||'')+'">'+esc(label||'—')+'</span>';
const screens=[{id:'overview',label:'Financial overview',desc:'Decision-ready liquidity and runway'},{id:'ledger',label:'Expense tracker',desc:'Recorded actuals, planned spend and funding'},{id:'budget',label:'Budget planner',desc:'Variance and the monthly spending plan'},{id:'scenario',label:'Scenario builder',desc:'Driver-based what-if decisions'},{id:'forecast',label:'Cash forecast',desc:'The next 18 to 36 months'},{id:'briefing',label:'Financial briefings',desc:'Approved narratives and reporting history'}];
const schema={
 ledger:[{key:'name',label:'Line item',kind:'text',required:true},{key:'kind',label:'Entry type',kind:'select',options:['opening','actual_out','actual_in','budget_out','budget_in','funding_in'],required:true},{key:'period',label:'Period (YYYY-MM-DD)',kind:'date',required:true},{key:'amount',label:'Amount',kind:'money',required:true},{key:'currency',label:'Currency',kind:'text',required:true},{key:'program',label:'Program',kind:'text'},{key:'category',label:'Category',kind:'text'},{key:'commitment',label:'Commitment',kind:'select',options:['Committed','Discretionary','Contingent']},{key:'vendor',label:'Vendor / source party',kind:'text'},{key:'source',label:'Finance reference URL',kind:'url'},{key:'notes',label:'Assumptions / evidence',kind:'longtext'},{key:'archived',label:'Archived',kind:'boolean'}],
 scenarios:[{key:'name',label:'Scenario name',kind:'text',required:true},{key:'clinicalMultiplier',label:'Clinical spend multiplier',kind:'number'},{key:'peopleDelta',label:'Added monthly personnel cost',kind:'money'},{key:'contractorDelta',label:'Added monthly contractor cost',kind:'money'},{key:'fundingDelay',label:'Funding delay (months)',kind:'number'},{key:'trialShift',label:'Clinical spend shift (months)',kind:'number'},{key:'reserve',label:'Minimum cash reserve',kind:'money'},{key:'cutoff',label:'Actuals cutoff',kind:'date'},{key:'notes',label:'Rationale and assumptions',kind:'longtext'},{key:'archived',label:'Archived',kind:'boolean'}],
 briefings:[{key:'name',label:'Report title',kind:'text',required:true},{key:'period',label:'Report period',kind:'date'},{key:'cutoff',label:'Actuals cutoff',kind:'date'},{key:'status',label:'Review status',kind:'select',options:['Draft','In review','Approved']},{key:'author',label:'Author / reviewer',kind:'text'},{key:'body',label:'Narrative',kind:'longtext'},{key:'sources',label:'Data and evidence IDs',kind:'longtext'},{key:'archived',label:'Archived',kind:'boolean'}]
};
const baseCols={ledger:['name','period','kind','program','category','amount','commitment'],scenarios:['name','clinicalMultiplier','peopleDelta','fundingDelay','reserve'],briefings:['name','period','status','author']};
let mapping={};try{mapping=JSON.parse(cfg.tableMap||'{}');}catch(e){mapping={};}
const roleMap={};
for(const role of Object.keys(schema)){
 const m=mapping[role],b=m&&bindings.find(x=>x.typeId===m.typeId);
 if(!m||!b)continue;
 const fields={};for(const f of schema[role]){const k=m.fields&&m.fields[f.key]!==undefined?m.fields[f.key]:f.key;if(typeof k==='string'&&(b.fields||[]).includes(k))fields[f.key]=k;}
 if(fields.name)roleMap[role]={typeId:m.typeId,fields,writable:(m.writableFields||[]).filter(x=>fields[x])};
}
const readCache={};
function readRole(role){
 if(readCache[role])return readCache[role];const m=roleMap[role];if(!m)return readCache[role]={rows:[],total:0,complete:false,unbound:true};
 let rows=[],total=0,complete=false,offset=0;
 for(let i=0;i<8;i++){
  const p=tools.call('records.read',{typeId:m.typeId,limit:100,offset,filters:{}});
  if(p.unavailable)throw Error('Data for '+role+' is not authorized.');
  const chunk=p.rows||[];total=Number(p.total||0);
  for(const r of chunk){const data={};for(const [logical,real]of Object.entries(m.fields)){if(Object.prototype.hasOwnProperty.call(r.data||{},real))data[logical]=r.data[real];}if(!bool(data.archived))rows.push({id:r.id,version:r.version,data});}
  offset+=chunk.length;if(offset>=total||chunk.length<100){complete=true;break;}if(offset>=800)break;
 }
 return readCache[role]={rows,total,complete,unbound:false};
}
function lookup(role,id){return readRole(role).rows.find(x=>x.id===id)||null;}
const st=JSON.parse(JSON.stringify(inp.state||{}));
{
 let profile={};try{profile=JSON.parse(cfg.layoutProfile||'{}');}catch(e){}
 st.layout={tabs:Array.isArray(profile.tabs)?profile.tabs:screens.map(x=>x.id),cols:profile.cols||{},visible:profile.visible||{},heading:profile.heading||String(cfg.heading||'Cash Runway')};
}
st.layout.tabs=[...new Set(st.layout.tabs.filter(id=>screens.some(x=>x.id===id)).concat(screens.map(x=>x.id)))];
st.layout.cols=st.layout.cols||{};for(const role of Object.keys(schema)){
 const keys=new Set(schema[role].map(x=>x.key));const existing=Array.isArray(st.layout.cols[role])?st.layout.cols[role]:baseCols[role];
 st.layout.cols[role]=[...new Set(existing.filter(k=>keys.has(k)).concat(baseCols[role]))];
}
st.layout.visible=st.layout.visible||{};
st.page=Math.max(0,Number(st.page)||0);st.query=String(st.query||'').slice(0,100);st.filter=String(st.filter||'all');st.section=String(st.section||'overview');st.reserve=num(st.reserve,num(cfg.reserveThreshold,0));st.months=[18,24,36].includes(Number(st.months))?Number(st.months):Number(cfg.forecastMonths)||24;
if(!screens.some(x=>x.id===st.section))st.section='overview';
const canWrite=(role)=>!!inp.saved&&!!inp.writable&&cfg.readOnly!==true&&!!roleMap[role]&&roleMap[role].writable.includes('name');
const note=(v)=>st.notice=String(v||'').slice(0,350);
function propose(changes,success){tools.call('records.propose',changes);note(success||'Prepared for TrialAgents review. The database has not been changed until approved.');}
function valuesFromForm(role,form,mode){const out={};const m=roleMap[role];for(const f of schema[role]){
 if(f.key==='archived'){if(mode==='create'&&m&&m.fields.archived&&m.writable.includes('archived'))out.archived=false;continue;}
 if(!m||!Object.prototype.hasOwnProperty.call(m.fields,f.key)||!m.writable.includes(f.key))continue;
 if(!Object.prototype.hasOwnProperty.call(form,f.key))continue;let v=form[f.key];
 if(v===''){if(!f.required)out[f.key]=null;continue;}
 if(f.kind==='number'||f.kind==='money'){const n=Number(v);if(!Number.isFinite(n))throw Error('Check the numeric value of '+f.label);if(f.kind==='money'&&n<0&&!(role==='scenarios'&&(f.key==='peopleDelta'||f.key==='contractorDelta')))throw Error('Use nonnegative amounts; direction comes from entry type.');out[f.key]=n;}
 else if(f.kind==='boolean')out[f.key]=bool(v);else out[f.key]=String(v).slice(0,f.kind==='longtext'?4000:500);
 }
 for(const f of schema[role].filter(x=>x.required)){if(mode==='create'&&(out[f.key]===undefined||out[f.key]===''))throw Error('Required field: '+f.label);}
 if(role==='ledger'&&out.period&&!/^\d{4}-\d{2}-\d{2}$/.test(out.period))throw Error('Use a full ISO date for period.');
 return Object.fromEntries(Object.entries(out).map(([k,v])=>[m.fields[k],v]));
}
function modeStart(role,mode,id){st.menu=null;st.confirm=null;let draft={};if(mode==='edit'||mode==='duplicate'){
 const r=lookup(role,id);if(!r)throw Error('The selected record is not available.');draft={...r.data};if(mode==='duplicate'){
  draft.name='Copy of '+String(draft.name||'record');
  if(role==='ledger'&&['actual_out','actual_in','funding_in','opening'].includes(draft.kind)){draft.kind='budget_out';draft.commitment='Discretionary';draft.notes='Duplicated as a proposed planning line; verify before committing. '+String(draft.notes||'').slice(0,300);}
  if(role==='briefings')draft.status='Draft';
 }
 }
 st.editor={role,mode,id:mode==='edit'?id:null,version:mode==='edit'?lookup(role,id)?.version:null,draft};
}
const payload=event.form||{};
try{
 if(action.startsWith('draft:')&&st.editor){st.editor.draft={...st.editor.draft,...payload};}
 else if(action.startsWith('driver:')){st.scenarioDraft={...payload};}
 else if(action.startsWith('nav:')){st.section=action.slice(4);st.page=0;st.query='';st.filter='all';st.menu=null;st.editor=null;st.confirm=null;st.settings=false;note('');}
 else if(action==='open-filters')st.filtersOpen=!st.filtersOpen;
 else if(action==='query'&&event.kind==='change'){st.query=String(event.value||'').slice(0,100);st.page=0;}
 else if(action==='filter'&&event.kind==='change'){st.filter=String(event.value||'all');st.page=0;}
 else if(action==='next-page')st.page++;
 else if(action==='prev-page')st.page=Math.max(0,st.page-1);
 else if(action.startsWith('menu:'))st.menu=st.menu===action.slice(5)?null:action.slice(5);
 else if(action.startsWith('edit:')){const [role,id]=action.slice(5).split(':');modeStart(role,'edit',id);}
 else if(action.startsWith('add:')){modeStart(action.slice(4),'create',null);}
 else if(action.startsWith('duplicate:')){const [role,id]=action.slice(10).split(':');modeStart(role,'duplicate',id);}
 else if(action.startsWith('delete:')){const [role,id]=action.slice(7).split(':');st.confirm={role,id};st.menu=null;}
 else if(action==='cancel-modal'){st.editor=null;st.confirm=null;}
 else if(action==='confirm-delete'){
  if(!st.confirm)throw Error('No record selected');const {role,id}=st.confirm,r=lookup(role,id),m=roleMap[role];
  if(!r||!m||!m.fields.archived||!m.writable.includes('archived')||!canWrite(role))throw Error('Deletion requires an authorized archive field and a reviewed write.');
  propose([{kind:'update_record',recordId:r.id,expectedVersion:r.version,data:{[m.fields.archived]:true}}],'Archive/delete prepared for review. The original record and its history are retained.');st.confirm=null;
 }
 else if(action==='save-record'&&event.kind==='submit'){
  if(!st.editor)throw Error('Nothing to save');const {role,mode,id}=st.editor,m=roleMap[role];if(!canWrite(role))throw Error('Editing this table is not allowed.');
  const data=valuesFromForm(role,payload,mode==='edit'?'update':'create');
  if(mode==='edit'){const r=lookup(role,id);if(!r)throw Error('Record changed; reopen it.');propose([{kind:'update_record',recordId:r.id,expectedVersion:st.editor.version,data}],'Change prepared for review.');}
  else propose([{kind:'create_record',typeId:m.typeId,data}],'New record prepared for review.');
  st.editor=null;
 }
 else if(action.startsWith('scenario-select:')){st.scenario=action.slice(16);delete st.assumptions;delete st.scenarioDraft;}
 else if(action.startsWith('briefing-select:'))st.briefing=action.slice(16);
 else if(action.startsWith('forecast-months:'))st.months=Number(action.slice(16));
 else if(action==='assumption-preview'&&event.kind==='submit'){st.assumptions={clinicalMultiplier:num(payload.clinicalMultiplier,1),peopleDelta:num(payload.peopleDelta,0),contractorDelta:num(payload.contractorDelta,0),trialShift:num(payload.trialShift,0),fundingDelay:num(payload.fundingDelay,0),reserve:num(payload.reserve,st.reserve)};note('Scenario recalculated locally. Save a scenario record to preserve the assumptions.');}
 else if(action==='scenario-save'){const d=st.scenarioDraft||st.assumptions||{},name='Decision scenario '+String(new Date().getUTCFullYear());modeStart('scenarios','create',null);st.editor.draft={...d,name,cutoff:String(cfg.cutoff||'')};}
 else if(action==='show-chatgpt-prompt')st.prompt=!st.prompt;
 else if(action==='clear-notice')note('');
}catch(e){note('Action not completed: '+String(e&&e.message||e).slice(0,260));}
const ledger=readRole('ledger'),scenarioRecords=readRole('scenarios'),briefings=st.section==='briefing'?readRole('briefings'):{rows:[],total:0,complete:true};
const currency=String(cfg.currency||'EUR');
const ledgerRows=ledger.rows.filter(r=>String(r.data.currency||currency)===currency);
const differentCurrencies=ledger.rows.filter(r=>r.data.currency&&r.data.currency!==currency).length;
const validDate=(v)=>{const t=String(v||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(t))return '';const d=new Date(t+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===t?t:'';};
const dates=ledgerRows.filter(r=>['actual_out','actual_in','opening'].includes(r.data.kind)).map(r=>validDate(r.data.period)).filter(Boolean).sort();
const actualDates=ledgerRows.filter(r=>['actual_out','actual_in'].includes(r.data.kind)).map(r=>validDate(r.data.period)).filter(Boolean).sort();
const cutoffDate=cfg.cutoff?validDate(cfg.cutoff):actualDates[actualDates.length-1]||dates[dates.length-1]||'';
const cutoff=ym(cutoffDate);
const openingRows=ledgerRows.filter(r=>r.data.kind==='opening'&&validDate(r.data.period)&&r.data.period<=cutoffDate).sort((a,b)=>String(a.data.period).localeCompare(String(b.data.period)));
const latestOpening=openingRows[openingRows.length-1];
const openingDate=latestOpening?.data.period||'';
const openingMonth=ym(openingDate);
const openingCash=latestOpening?num(latestOpening.data.amount):null;
const invalidFinanceDates=ledgerRows.some(r=>!validDate(r.data.period));
const actualRows=ledgerRows.filter(r=>(r.data.kind==='actual_out'||r.data.kind==='actual_in')&&validDate(r.data.period)&&r.data.period>=openingDate&&r.data.period<=cutoffDate);
const actualMonths=actualRows.map(r=>ym(r.data.period)).sort();
const monthEnd=cutoff?new Date(Date.UTC(Number(cutoff.slice(0,4)),Number(cutoff.slice(5)),0)).toISOString().slice(0,10):'';
const partialCutoff=!!cutoffDate&&cutoffDate!==monthEnd;
function monthFlow(month){let actualIn=0,actualOut=0,planIn=0,planOut=0,committedIn=0,hasBudget=false;
 for(const r of ledgerRows){const d=r.data;if(ym(d.period)!==month)continue;const n=num(d.amount);if(n===null)continue;
  if(d.kind==='actual_in'){if(d.period>=openingDate&&d.period<=cutoffDate)actualIn+=n;}else if(d.kind==='actual_out'){if(d.period>=openingDate&&d.period<=cutoffDate)actualOut+=n;}
  else if(d.kind==='budget_out'){planOut+=n;hasBudget=true;}
  else if(d.kind==='budget_in'){planIn+=n;hasBudget=true;}
  else if(d.kind==='funding_in'&&d.commitment==='Committed')committedIn+=n;
 }
 return {actualIn,actualOut,planIn,planOut,committedIn,hasBudget};
}
let cashAtCutoff=openingCash===null?null:actualRows.reduce((cash,r)=>cash+(r.data.kind==='actual_in'?1:-1)*num(r.data.amount,0),openingCash);
if(!ledger.complete||invalidFinanceDates||!cutoffDate)cashAtCutoff=null;
function projection(assumptions={},months=24){
 const a={clinicalMultiplier:num(assumptions.clinicalMultiplier,1),peopleDelta:num(assumptions.peopleDelta,0),contractorDelta:num(assumptions.contractorDelta,0),trialShift:num(assumptions.trialShift,0),fundingDelay:num(assumptions.fundingDelay,0),reserve:num(assumptions.reserve,num(cfg.reserveThreshold,0))};
 let cash=partialCutoff?null:cashAtCutoff,values=[],missing=[],crossing=null;
 for(let i=1;i<=months;i++){
  const month=addMonths(cutoff,i);let out=0,inc=0,anyBudget=false,hasPlan=false;
  for(const r of ledgerRows){const d=r.data,kind=d.kind,amount=num(d.amount);if(amount===null)continue;const base=ym(d.period);if(!base)continue;
   if(kind==='budget_out'||kind==='budget_in'){
    const isClinical=/clinical|cro|trial|study/i.test(String(d.category||'')+' '+String(d.program||''));const target=kind==='budget_out'&&isClinical?addMonths(base,Math.round(a.trialShift)):base;
    if(target===month){hasPlan=true;anyBudget=true;if(kind==='budget_in')inc+=amount;else out+=amount*(isClinical?a.clinicalMultiplier:1);}
   } else if(kind==='funding_in'&&d.commitment==='Committed'&&addMonths(base,Math.round(a.fundingDelay))===month)inc+=amount;
  }
  if(hasPlan){out+=a.peopleDelta+a.contractorDelta;}
  if(!anyBudget){missing.push(month);cash=null;}
  else if(cash!==null){cash+=inc-out;}
  if(cash!==null&&crossing===null&&cash<a.reserve)crossing=month;
  values.push({month,cash,out,inc,anyBudget});
 }
 return {values,crossing,missing,unavailable:cashAtCutoff===null||partialCutoff,assumptions:a};
}
const baseline=projection({},st.months);
const scenarioRow=scenarioRecords.rows.find(r=>r.id===st.scenario)||scenarioRecords.rows[0];
if(!st.scenario&&scenarioRow)st.scenario=scenarioRow.id;
const compare=projection(st.assumptions||(scenarioRow?.data||{}),st.months);
const isReady=ledger.complete&&openingCash!==null&&cashAtCutoff!==null&&!!cutoff&&differentCurrencies===0;
const historical=(()=>{if(!ledger.complete||!openingMonth||openingCash===null||!cutoff)return [];let c=openingCash;const firstFlow=monthFlow(openingMonth);c+=firstFlow.actualIn-firstFlow.actualOut;const series=[{month:openingMonth,cash:c}];for(let m=addMonths(openingMonth,1);m<=cutoff;m=addMonths(m,1)){
 const f=monthFlow(m);c+=f.actualIn-f.actualOut;series.push({month:m,cash:c});if(series.length>42||m===cutoff)break;
 }return series;})();
const lastActualMonth=actualMonths.filter(m=>m<=cutoff).slice(-1)[0];
const recentBurn=ledger.complete&&lastActualMonth?monthFlow(lastActualMonth).actualOut-monthFlow(lastActualMonth).actualIn:null;
const rangeLabel=cutoffDate+' actuals cutoff';
function chart(lines,reserve,includeActual=true){
 const first=baseline.values.slice(0,st.months),xlabels=(includeActual?historical.slice(-5).map(x=>x.month):[]).concat(first.map(x=>x.month));
 if(!xlabels.length)return '<div class="cr-empty"><strong>No forecast to plot</strong><p>Enter an opening balance and approved plan lines before displaying projections.</p></div>';
 const seq=[];for(const line of lines){const points=includeActual&&line.id==='baseline'?historical.slice(-5).concat(line.values):line.values;seq.push({...line,points});}
 const vals=seq.flatMap(l=>l.points.map(x=>x.cash).filter(x=>x!==null&&Number.isFinite(x)));
 if(Number.isFinite(reserve))vals.push(reserve);if(!vals.length)return '<div class="cr-empty"><strong>Missing financial inputs</strong><p>The chart is unavailable until actuals and projected month values are complete.</p></div>';
 const mn=Math.min(...vals,0),mx=Math.max(...vals,1);const lo=Math.floor(mn/500000)*500000,hi=Math.ceil(mx/500000)*500000||1;const w=850,h=275,l=73,r=28,t=22,b=45;const xx=(m)=>l+(xlabels.indexOf(m)/(Math.max(1,xlabels.length-1)))*(w-l-r),yy=v=>t+(hi-v)/(hi-lo)*(h-t-b);
 const grids=Array.from({length:5},(_,i)=>{const v=lo+(hi-lo)*i/4;return '<line x1="'+l+'" y1="'+yy(v)+'" x2="'+(w-r)+'" y2="'+yy(v)+'" stroke="#e8ebf1"/><text x="'+(l-9)+'" y="'+(yy(v)+4)+'" text-anchor="end" fill="#8490a2" font-size="11">'+esc((v/1000000).toFixed(1))+'M</text>';}).join('');
 const cutoffIndex=includeActual?historical.slice(-5).length-1:-1;let linesHtml='';
 const pointsFor=(part)=>{const groups=[];let prev=[];for(const p of part){if(p.cash===null||!xlabels.includes(p.month)){if(prev.length>1)groups.push(prev);prev=[];continue;}prev.push(xx(p.month).toFixed(1)+','+yy(p.cash).toFixed(1));}if(prev.length>1)groups.push(prev);return groups;};
 for(const line of seq){if(line.id==='baseline'&&includeActual&&historical.length>1){for(const pts of pointsFor(historical.slice(-5))){linesHtml+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="#233b5c" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>';}}
  const projectionPoints=line.id==='baseline'&&includeActual?[...historical.slice(-1),...line.values]:line.values;
  for(const pts of pointsFor(projectionPoints)){linesHtml+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+line.color+'" stroke-width="2.4" stroke-dasharray="7 6" stroke-linejoin="round" stroke-linecap="round"/>';}
 }
 const threshold=Number.isFinite(reserve)?'<line x1="'+l+'" y1="'+yy(reserve)+'" x2="'+(w-r)+'" y2="'+yy(reserve)+'" stroke="#c18c75" stroke-dasharray="4 5"/><text x="'+(w-r-4)+'" y="'+(yy(reserve)-7)+'" text-anchor="end" fill="#ab7261" font-size="10">Reserve</text>':'';
 const tick=xlabels.filter((_,i)=>i===0||i===cutoffIndex||i===xlabels.length-1||i%Math.max(1,Math.round(xlabels.length/7))===0).map(m=>'<text x="'+xx(m)+'" y="'+(h-12)+'" fill="#8490a2" font-size="11" text-anchor="middle">'+esc(monthLabel(m))+'</text>').join('');
 const boundary=cutoffIndex>=0?'<line x1="'+xx(xlabels[cutoffIndex])+'" y1="'+t+'" x2="'+xx(xlabels[cutoffIndex])+'" y2="'+(h-b)+'" stroke="#98a6b6" stroke-dasharray="3 5"/>':'';
 return '<svg class="cr-chart" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Cash forecast in '+esc(currency)+'. Solid line is approved historical cash; projected scenarios are shown with distinct colors and dashed lines. Projected reserve threshold is annotated.">'+grids+boundary+threshold+linesHtml+tick+'<text x="11" y="13" fill="#8490a2" font-size="11">'+esc(currency)+'</text></svg>';
}
const sections=st.layout.tabs.map(id=>screens.find(x=>x.id===id)).filter(x=>x&&st.layout.visible[x.id]!==false);
if(!sections.some(x=>x.id===st.section))st.section=sections[0]?.id||'overview';
const current=sections.find(x=>x.id===st.section)||screens[0];
function heading(sub){return '<div class="cr-top"><div><div class="cr-eyebrow">FINANCIAL PLANNING / '+esc(current.label)+'</div><h1 class="cr-title">'+esc(st.layout.heading||'Cash Runway')+'</h1><p class="cr-subtitle">'+esc(sub||current.desc)+'</p></div><div class="cr-top-right">'+pill(currency+' · '+(cutoff?monthLabel(cutoff):'no actuals'),'plum')+btn(icon('settings',18),'tracker:layout','cr-icon-btn',!inp.saved,'aria-label="App layout settings" title="Layout settings"')+'</div></div>';}
function cards(items){return '<div class="cr-kpis">'+items.map(c=>'<div class="cr-kpi"><div class="cr-kpi-label">'+esc(c.title)+'</div><div class="cr-kpi-number cr-mono">'+esc(c.value)+'</div><div class="cr-kpi-foot">'+esc(c.hint)+'</div>'+ (c.nav?btn('View details '+icon('arrow',13),'nav:'+c.nav,'cr-kpi-link'):'')+'</div>').join('')+'</div>';}
function graphPanel(title,sub,lines){return '<section class="cr-panel cr-panel-pad"><div class="cr-panel-head"><div><h2 class="cr-panel-title">'+esc(title)+'</h2><p class="cr-panel-sub">'+esc(sub)+'</p></div>'+pill('EUR'===currency?'EUR':currency,'')+'</div>'+chart(lines,num(st.assumptions?.reserve,num(scenarioRow?.data?.reserve,num(cfg.reserveThreshold,0))))+'<div class="cr-chart-caption"><span class="cr-chart-legend"><i class="cr-swatch actual"></i>Actual cash</span><span class="cr-chart-legend"><i class="cr-swatch"></i>Baseline projection</span><span class="cr-chart-legend"><i class="cr-swatch dashed"></i>Scenario</span><span class="cr-chart-legend"><i class="cr-swatch reserve"></i>Minimum reserve</span></div></section>';}
function quality(){const problems=[];if(partialCutoff)problems.push('Cash uses the exact cutoff date. Monthly forecast requires a reviewed month-end cutoff; no remaining-month spend is assumed.');if(invalidFinanceDates)problems.push('Correct invalid financial dates before calculating cash');if(!latestOpening)problems.push('Opening cash is not recorded');if(!cutoff)problems.push('Actuals cutoff is unknown');if(!ledger.complete)problems.push('Finance rows exceed the 800-record bounded calculation window');if(differentCurrencies)problems.push(differentCurrencies+' rows have a different currency and are excluded');if(baseline.missing.length)problems.push(baseline.missing.length+' forecast months have no approved plan entries');if(!problems.length)problems.push('Coverage is complete for the current planning horizon');return problems;}
function statusBanner(){const problems=quality();return '<div class="cr-banner '+(problems.length===1&&problems[0].startsWith('Coverage')?'success':'')+'">'+esc(problems.join(' · '))+'</div>';}
function overview(){const forecastEnd=baseline.values[baseline.values.length-1]?.cash;const recent=recentBurn===null?'—':money(recentBurn,currency);const runway=baseline.crossing?monthLabel(baseline.crossing):(baseline.unavailable||baseline.missing.length)?'Uncertain':'Beyond '+st.months+' months';
 const budgetRows=ledgerRows.filter(x=>x.data.kind==='budget_out').sort((a,b)=>Number(b.data.amount||0)-Number(a.data.amount||0)).slice(0,5);
 return heading('A clear view of financial resilience, operating burn and near-term decisions.')+statusBanner()+'<div class="cr-grid cr-grid-2" style="margin-bottom:17px"><div class="cr-panel cr-hero"><div class="cr-hero-overline">Cash at approved actuals cutoff</div><div class="cr-hero-value cr-mono">'+(cashAtCutoff===null?'Not available':money(cashAtCutoff,currency))+'</div><div>'+pill(isReady?'Based on recorded actuals':'Input validation needed','dark')+'</div><div class="cr-hero-foot"><span>Opening <strong>'+money(openingCash,currency)+'</strong></span><span>Actuals to <strong>'+esc(rangeLabel)+'</strong></span></div></div><div class="cr-panel cr-panel-pad"><div class="cr-panel-head"><div><h2 class="cr-panel-title">Planning signals</h2><p class="cr-panel-sub">Avoid late financing decisions</p></div>'+icon('trend',18)+'</div><ul class="cr-small-list"><li><div><strong>Reserve threshold</strong><small>Explicit financial planning assumption</small></div>'+pill(money(st.reserve,currency),'plum')+'</li><li><div><strong>First reserve shortfall</strong><small>Baseline only, if complete</small></div>'+pill(runway,baseline.crossing?'red':'')+'</li><li><div><strong>Forecast horizon</strong><small>Monthly, from latest actuals</small></div>'+pill(st.months+' months','')+'</li></ul></div></div>'+cards([{title:'Latest net burn',value:recent,hint:'Latest actual month; inflows offset expenses',nav:'ledger'},{title:'Forecast end cash',value:baseline.missing.length?'Incomplete':money(forecastEnd,currency),hint:'Excludes contingent funding',nav:'forecast'},{title:'Budget lines',value:String(ledgerRows.filter(x=>x.data.kind==='budget_out').length),hint:'Approved planning entries in the selected currency',nav:'budget'}])+'<div class="cr-grid cr-grid-2">'+graphPanel('Liquidity trajectory','Historical cash and the next '+st.months+' planned months',[{id:'baseline',values:baseline.values,color:'#6d4e92'},{id:'scenario',values:compare.values,color:'#ad85bf'}])+'<section class="cr-panel cr-panel-pad"><div class="cr-panel-head"><div><h2 class="cr-panel-title">Largest planned cost lines</h2><p class="cr-panel-sub">Trace to the underlying plan</p></div></div><ul class="cr-small-list">'+(budgetRows.length?budgetRows.map(x=>'<li><div><strong>'+esc(x.data.name)+'</strong><small>'+esc(x.data.program||x.data.category||'Uncategorized')+' · '+esc(monthLabel(ym(x.data.period)))+'</small></div><span class="cr-mono">'+esc(money(x.data.amount,currency))+'</span></li>').join(''):'<li>No budget lines recorded yet.</li>')+'</ul>'+btn('Open budget planner '+icon('arrow',13),'nav:budget','cr-btn')+'</section></div>';
}
function rowMenu(role,row){const key=role+':'+row.id;return '<div class="cr-actions-wrap">'+btn('•••','menu:'+key,'cr-more',false,'aria-label="Record actions for '+esc(row.data.name)+'" aria-expanded="'+(st.menu===key?'true':'false')+'"')+(st.menu===key?'<div class="cr-menu">'+btn('Edit','edit:'+role+':'+row.id,'',!canWrite(role))+btn('Duplicate','duplicate:'+role+':'+row.id,'',!canWrite(role))+btn('Delete','delete:'+role+':'+row.id,'danger',!canWrite(role)||!roleMap[role]?.fields.archived)+'</div>':'')+'</div>';}
function table(role,rows,fields){let cols=st.layout.cols[role].filter(k=>fields.includes(k)&&st.layout.visible[role+':'+k]!==false);
 if(!cols.length)cols=fields.slice(0,1);
 return '<div class="cr-scroll"><table class="cr-table"><thead><tr>'+cols.map(k=>'<th>'+esc(schema[role].find(x=>x.key===k)?.label||k)+'</th>').join('')+'<th class="cr-row-actions">Actions</th></tr></thead><tbody>'+rows.map(r=>'<tr>'+cols.map(k=>'<td>'+tableValue(role,k,r.data[k])+'</td>').join('')+'<td class="cr-row-actions">'+rowMenu(role,r)+'</td></tr>').join('')+'</tbody></table></div>';
}
function tableValue(role,key,v){if(key==='amount'||['peopleDelta','contractorDelta','reserve'].includes(key))return '<span class="cr-mono">'+esc(money(v,currency))+'</span>';if(key==='kind')return pill(String(v||'').replace(/_/g,' '),/actual/.test(v)?'green':/funding/.test(v)?'plum':'');if(key==='commitment'||key==='status')return pill(v,/contingent|draft/i.test(String(v))?'amber':/committed|approved/i.test(String(v))?'green':'');if(key==='clinicalMultiplier')return esc(v===null||v===undefined?'—':String(Math.round(Number(v)*100))+'%');if(key==='archived')return esc(v?'Yes':'No');if(key==='name')return '<strong>'+esc(v||'—')+'</strong>';return esc(v||'—');}
function filtered(role,rows){let r=rows;const query=st.query.toLowerCase().trim();if(query)r=r.filter(x=>Object.values(x.data).some(v=>String(v??'').toLowerCase().includes(query)));
 if(st.filter!=='all')r=r.filter(x=>role==='ledger'?x.data.kind===st.filter:role==='briefings'?x.data.status===st.filter:true);
 return r.sort((a,b)=>role==='ledger'?String(b.data.period||'').localeCompare(String(a.data.period||'')):String(a.data.name||'').localeCompare(String(b.data.name||'')));
}
function toolbar(role){const items=role==='ledger'?[['all','All types'],['actual_out','Actual outflow'],['actual_in','Actual inflow'],['budget_out','Budget outflow'],['budget_in','Budget inflow'],['funding_in','Funding']]:[['all','All statuses'],['Draft','Draft'],['In review','In review'],['Approved','Approved']];
 return '<div class="cr-toolbar"><input type="search" class="cr-search" data-action="query" data-ui-state="true" value="'+esc(st.query)+'" placeholder="Search records" aria-label="Search '+esc(role)+' records">'+btn('Filters','open-filters','cr-btn cr-disclosure')+btn(icon('plus',15)+' Add record','add:'+role,'cr-btn cr-btn-primary',!canWrite(role))+'</div>'+(st.filtersOpen?'<div class="cr-filter-row"><label>Record type<select data-ui-state="true" data-action="filter" aria-label="Filter records">'+items.map(x=>'<option value="'+esc(x[0])+'"'+(st.filter===x[0]?' selected':'')+'>'+esc(x[1])+'</option>').join('')+'</select></label></div>':'');}
function paged(role,items){const per=Math.min(50,Math.max(10,Number(cfg.pageSize)||25)),maxPage=Math.max(0,Math.ceil(items.length/per)-1);st.page=Math.min(st.page,maxPage);return {slice:items.slice(st.page*per,(st.page+1)*per),page:st.page,maxPage,total:items.length,per};}
function pagination(p){return '<div class="cr-footer"><span>Showing '+(p.total?1+p.page*p.per:0)+'–'+Math.min(p.total,(p.page+1)*p.per)+' of '+p.total+'</span><span>Page '+(p.page+1)+' of '+(p.maxPage+1)+'&nbsp; '+btn('Previous','prev-page','',p.page===0)+btn('Next','next-page','',p.page>=p.maxPage)+'</span></div>';}
function ledgerScreen(){const r=filtered('ledger',ledger.rows),p=paged('ledger',r);return heading('An auditable register for spend, receipts, planned lines and funding.')+statusBanner()+'<div class="cr-panel"><div class="cr-panel-pad">'+toolbar('ledger')+'<p class="cr-panel-note">Manual entries. Duplicating an actual or funding entry creates a discretionary planning draft instead of a second actual.</p></div>'+(p.total?table('ledger',p.slice,baseCols.ledger):'<div class="cr-no-records">No matching entries. Add an opening balance, actual expense or planned budget line.</div>')+pagination(p)+'</div>';
}
function budgetScreen(){const start=addMonths(cutoff,-2),periods=Array.from({length:9},(_,i)=>addMonths(start,i));const types=['Clinical & CRO','Personnel','Contractors','Laboratory','G&A','Other'];const categorise=r=>{const cat=String(r.data.category||'').toLowerCase();if(/clinical|cro|trial|study/.test(cat))return types[0];if(/person|payroll|headcount|staff/.test(cat))return types[1];if(/contract|consult/.test(cat))return types[2];if(/lab|assay|material/.test(cat))return types[3];if(/admin|general|office|g&a/.test(cat))return types[4];return types[5];};
 const rows=types.map(cat=>({cat,values:periods.map(m=>{const list=ledgerRows.filter(x=>ym(x.data.period)===m&&categorise(x)===cat);const budget=list.filter(x=>x.data.kind==='budget_out');const actual=list.filter(x=>x.data.kind==='actual_out'&&x.data.period>=openingDate&&x.data.period<=cutoffDate);return {budget:budget.reduce((n,x)=>n+Number(x.data.amount||0),0),actual:actual.reduce((n,x)=>n+Number(x.data.amount||0),0),hasBudget:budget.length>0,hasActual:actual.length>0};})}));
 const rowsHtml=rows.map(row=>'<tr><td>'+esc(row.cat)+'</td>'+row.values.map((v,i)=>'<td title="'+esc((v.hasBudget?'Budget '+money(v.budget,currency):'No budget value')+' | '+(v.hasActual?'Actual '+money(v.actual,currency):'No actual value'))+'">'+(periods[i]<=cutoff?(v.hasActual?'<strong>'+esc(compact(v.actual))+'</strong>':'—'):(v.hasBudget?esc(compact(v.budget)):'—'))+'</td>').join('')+'</tr>').join('');
 const totals=periods.map((m,i)=>({total:rows.reduce((n,r)=>n+(m<=cutoff?r.values[i].actual:r.values[i].budget),0),has:rows.some(r=>m<=cutoff?r.values[i].hasActual:r.values[i].hasBudget)}));
 const currentBudget=ledgerRows.filter(x=>x.data.kind==='budget_out'),currentActual=actualRows.filter(x=>x.data.kind==='actual_out');
 return heading('A compact rolling plan, anchored in actuals, with explicit gaps.')+statusBanner()+cards([{title:'Planned expenses',value:money(currentBudget.reduce((n,x)=>n+Number(x.data.amount||0),0),currency),hint:'Sum of all budget-out records'},{title:'Actual outflows',value:money(currentActual.reduce((n,x)=>n+Number(x.data.amount||0),0),currency),hint:'From recorded actual entries'},{title:'Unplanned months',value:String(baseline.missing.length),hint:'Months with no plan entry in horizon'}])+'<section class="cr-panel"><div class="cr-panel-pad"><div class="cr-panel-head"><div><h2 class="cr-panel-title">Rolling 9-month spending matrix</h2><p class="cr-panel-sub">Monthly amount by cost family · actuals through cutoff; planned afterward</p></div>'+btn(icon('plus',15)+' Add budget line','add:ledger','cr-btn cr-btn-primary',!canWrite('ledger'))+'</div></div><div class="cr-scroll"><table class="cr-matrix"><thead><tr><th>Cost family</th>'+periods.map(m=>'<th>'+esc(monthLabel(m))+'</th>').join('')+'</tr></thead><tbody>'+rowsHtml+'<tr><td>Total outflows</td>'+totals.map(v=>'<td><strong>'+esc(v.has?compact(v.total):'—')+'</strong></td>').join('')+'</tr></tbody></table></div><div class="cr-footer"><span>Hover a value for planned and actual breakdown. Missing values are not silently treated as approved budgets.</span>'+btn('View itemized register','nav:ledger','cr-btn')+'</div></section><div class="cr-grid cr-grid-equal" style="margin-top:16px"><section class="cr-panel cr-panel-pad"><h2 class="cr-panel-title">Planning policy</h2><p class="cr-panel-sub">Conservative financial assumptions</p><ul class="cr-small-list"><li><div><strong>Actuals supersede planning</strong><small>Period end at/before cutoff</small></div>'+pill('Active','green')+'</li><li><div><strong>Contingent funding</strong><small>Excluded from baseline cash forecast</small></div>'+pill('Excluded','amber')+'</li><li><div><strong>Currency conversion</strong><small>Not automatic; all values in '+esc(currency)+'</small></div>'+pill('Manual','')+'</li></ul></section><section class="cr-panel cr-panel-pad"><h2 class="cr-panel-title">What finance should review</h2><ul class="cr-small-list"><li><strong>Gaps in future expense coverage</strong><small>Fill missing months before relying on runway.</small></li><li><strong>Commitment status</strong><small>Separate committed versus discretionary plans.</small></li><li><strong>Supporting sources</strong><small>Link records to approved finance references.</small></li></ul></section></div>';
}
function scenarioScreen(){const d=st.scenarioDraft||st.assumptions||scenarioRow?.data||{clinicalMultiplier:1,peopleDelta:0,contractorDelta:0,fundingDelay:0,trialShift:0,reserve:st.reserve};const a=compare.assumptions;const selects=scenarioRecords.rows.map(x=>'<span class="cr-scenario-choice">'+btn(esc(x.data.name||'Scenario'),'scenario-select:'+x.id,'cr-btn'+(x.id===st.scenario?' cr-btn-primary':''))+rowMenu('scenarios',x)+'</span>').join(' ');
 const fields=[['clinicalMultiplier','Clinical spend multiplier','number','0.05'],['peopleDelta','Extra monthly personnel cost','number','1000'],['contractorDelta','Extra monthly contractor cost','number','1000'],['trialShift','Move clinical spend (months)','number','1'],['fundingDelay','Funding delay (months)','number','1'],['reserve','Cash reserve threshold','number','50000']];
 return heading('Evaluate hiring, clinical and financing decisions against the same financial base.')+statusBanner()+'<div class="cr-drivers"><div class="cr-panel cr-panel-pad"><div class="cr-panel-head"><div><h2 class="cr-panel-title">Assumption workspace</h2><p class="cr-panel-sub">No changes to recorded actuals</p></div></div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">'+(selects||pill('Baseline only · no saved scenarios'))+'</div><form data-action="assumption-preview"><div class="cr-driver-fields">'+fields.map(f=>'<label class="cr-field">'+esc(f[1])+'<input data-ui-state="true" data-action="driver:'+f[0]+'" class="cr-input" name="'+f[0]+'" type="'+f[2]+'" step="'+f[3]+'" value="'+esc(num(d[f[0]],f[0]==='clinicalMultiplier'?1:0))+'" required></label>').join('')+'</div><div class="cr-driver-actions"><button type="submit" class="cr-btn cr-btn-primary">Recalculate comparison</button>'+btn('Save as scenario','scenario-save','cr-btn',!canWrite('scenarios'))+'</div></form><div class="cr-highlight" style="margin-top:17px"><strong>Forecast logic</strong><p>Clinical expense × multiplier; fixed personnel/contractor adjustment added only to months with budget; clinical and committed funding dates shift by the entered number of months. No arbitrary missing-month fill.</p></div></div><div>'+graphPanel('Decision impact','Comparisons use one currency, one cutoff and identical monthly periods',[{id:'baseline',values:baseline.values,color:'#6d4e92'},{id:'scenario',values:compare.values,color:'#ad85bf'}])+'<div class="cr-compare" style="margin-top:15px"><div class="cr-compare-item"><small>Baseline reserve crossing</small><b>'+esc(baseline.crossing?monthLabel(baseline.crossing):(baseline.unavailable||baseline.missing.length)?'Uncertain':'Beyond horizon')+'</b></div><div class="cr-compare-item"><small>Selected scenario crossing</small><b>'+esc(compare.crossing?monthLabel(compare.crossing):(compare.unavailable||compare.missing.length)?'Uncertain':'Beyond horizon')+'</b></div><div class="cr-compare-item"><small>Last modeled cash</small><b>'+esc(money(compare.values[compare.values.length-1]?.cash,currency))+'</b></div></div></div></div>';
}
function forecastScreen(){const reserve=num(st.assumptions?.reserve,num(scenarioRow?.data?.reserve,num(cfg.reserveThreshold,0)));const h=baseline.values;const pre=baseline.missing.length;
 return heading('An explicit month-by-month cash bridge, with no invisible assumptions.')+statusBanner()+'<section class="cr-panel cr-panel-pad"><div class="cr-panel-head"><div><h2 class="cr-panel-title">Forecast horizon</h2><p class="cr-panel-sub">Projected month-end cash · baseline versus selected decision case</p></div><div style="display:flex;gap:5px">'+[18,24,36].map(n=>btn(n+'m','forecast-months:'+n,'cr-btn'+(st.months===n?' cr-btn-primary':''))).join('')+'</div></div>'+chart([{id:'baseline',values:h,color:'#6d4e92'},{id:'scenario',values:compare.values,color:'#ad85bf'}],reserve)+'<div class="cr-chart-caption"><span class="cr-chart-legend"><i class="cr-swatch actual"></i>Actuals</span><span class="cr-chart-legend"><i class="cr-swatch"></i>Baseline</span><span class="cr-chart-legend"><i class="cr-swatch dashed"></i>Decision scenario</span></div></section><div class="cr-panel" style="margin-top:16px"><div class="cr-panel-pad"><div class="cr-panel-head"><div><h2 class="cr-panel-title">Forecast bridge</h2><p class="cr-panel-sub">Opening + committed inflows − planned outflows; missing periods are flagged</p></div>'+pill(pre?pre+' gaps':'Fully planned',pre?'amber':'green')+'</div></div><div class="cr-scroll"><table class="cr-table"><thead><tr><th>Month</th><th>Planned outflow</th><th>Included funding/inflows</th><th>Baseline cash</th><th>Scenario cash</th><th>Coverage</th></tr></thead><tbody>'+h.map((x,i)=>'<tr><td><strong>'+esc(monthLabel(x.month))+'</strong></td><td>'+esc(money(x.out,currency))+'</td><td>'+esc(money(x.inc,currency))+'</td><td>'+esc(money(x.cash,currency))+'</td><td>'+esc(money(compare.values[i]?.cash,currency))+'</td><td>'+pill(x.anyBudget?'Planned':'Missing',x.anyBudget?'green':'amber')+'</td></tr>').join('')+'</tbody></table></div><div class="cr-footer">'+esc(st.months)+' months · no currency conversion or contingent funding included</div></div>';
}
function briefingScreen(){const rows=briefings.rows.sort((a,b)=>String(b.data.period||'').localeCompare(String(a.data.period||'')));const selected=rows.find(r=>r.id===st.briefing)||rows[0];if(!st.briefing&&selected)st.briefing=selected.id;
 const prompt='Analyze the approved Cash Runway app for '+currency+' and cutoff '+cutoffDate+'. Read all authorized ledger, scenario and report records using complete bounded pagination. Recalculate opening cash, actual net burn, forecast cash, missing months and reserve crossings deterministically, using only saved records and clearly stated assumptions. Compare current versus prior approved reporting cutoff and identify meaningful variances and decisions. Cite exact record IDs, input dates and source references. Do not invent ledger amounts or assume missing budgets are zero. Prepare a draft Financial Briefing record, require human review before committing, and never send email or modify actuals without approval.';
 return heading('An approved management narrative with a traceable financial source.')+'<div class="cr-toolbar">'+btn(icon('plus',15)+' New briefing','add:briefings','cr-btn cr-btn-primary',!canWrite('briefings'))+btn('Prepare with ChatGPT','show-chatgpt-prompt','cr-btn')+'</div>'+(st.prompt?'<div class="cr-banner info"><strong>ChatGPT drafting instructions (no task activated)</strong><p style="white-space:pre-wrap">'+esc(prompt)+'</p><p>Run from ChatGPT after reviewing access; approve any report save. Optional scheduling is configured separately in TrialAgents Automations.</p></div>':'')+'<div class="cr-report"><div class="cr-report-list">'+(rows.length?rows.map(r=>'<div>'+btn('<strong>'+esc(r.data.name)+'</strong><small>'+esc(r.data.period||'No date')+'</small>','briefing-select:'+r.id,'cr-report-item',false,'aria-current="'+(r.id===st.briefing)+'"')+rowMenu('briefings',r)+'</div>').join(''):'<div class="cr-empty"><strong>No saved briefings</strong><p>A report must be reviewed and saved before it appears here.</p></div>')+'</div><section class="cr-report-sheet">'+(selected?'<div class="cr-report-kicker">'+esc(selected.data.status||'Draft')+' · '+esc(selected.data.period||'undated')+'</div><h2>'+esc(selected.data.name)+'</h2><div class="cr-panel-note">'+esc(selected.data.author||'No author')+' · Financial cutoff '+esc(selected.data.cutoff||'not set')+'</div><div class="cr-separator"></div><p>'+esc(selected.data.body||'No report narrative recorded yet.')+'</p><div class="cr-separator"></div><h3 class="cr-panel-title">Referenced records / source IDs</h3><p class="cr-panel-note">'+esc(selected.data.sources||'No evidence references recorded.')+'</p>':'<div class="cr-empty"><strong>The board-ready story starts with verified data</strong><p>Add a financial briefing or prepare an evidence-linked draft in ChatGPT for review.</p></div>')+'</section></div>';
}
function editor(){const x=st.editor;if(!x)return '';const role=x.role,m=roleMap[role];const title=(x.mode==='edit'?'Edit ':x.mode==='duplicate'?'Duplicate ':'Add ')+(role==='ledger'?'financial entry':role==='scenarios'?'scenario':'briefing');
 const fields=schema[role].filter(f=>f.key!=='archived'&&(!m||m.fields[f.key]));
 const field=(f)=>{const v=x.draft?.[f.key]??'',id='cr-field-'+role+'-'+f.key;let control='';if(f.kind==='select')control='<select class="cr-select" id="'+id+'" name="'+f.key+'"'+(f.required?' required':'')+'><option value="">Choose…</option>'+f.options.map(o=>'<option value="'+esc(o)+'"'+(v===o?' selected':'')+'>'+esc(o.replace(/_/g,' '))+'</option>').join('')+'</select>';
 else if(f.kind==='longtext')control='<textarea class="cr-textarea" id="'+id+'" name="'+f.key+'">'+esc(v)+'</textarea>';
 else if(f.kind==='boolean')control='<select class="cr-select" id="'+id+'" name="'+f.key+'"><option value="false"'+(!bool(v)?' selected':'')+'>No</option><option value="true"'+(bool(v)?' selected':'')+'>Yes</option></select>';
 else control='<input class="cr-input" id="'+id+'" name="'+f.key+'" type="'+(f.kind==='date'?'date':f.kind==='number'||f.kind==='money'?'number':'text')+'"'+(f.kind==='money'?((role==='scenarios'&&(f.key==='peopleDelta'||f.key==='contractorDelta'))?' step="0.01"':' min="0" step="0.01"'):f.kind==='number'?' step="0.01"':'')+' value="'+esc(v)+'"'+(f.required?' required':'')+'>';
 control=control.replace(/<(input|select|textarea) /,'<$1 data-ui-state="true" data-action="draft:'+f.key+'" '+(!m?.writable.includes(f.key)?'disabled ':''));
 return '<label class="cr-field" for="'+id+'">'+esc(f.label)+(f.required?' *':'')+control+'</label>';};
 return '<div class="cr-overlay"><section class="cr-drawer" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="cr-drawer-head"><div><div class="cr-eyebrow">Reviewed data change</div><h2>'+esc(title)+'</h2></div>'+btn(icon('close',17),'cancel-modal','cr-icon-btn',false,'aria-label="Close editor"')+'</div><form data-action="save-record" style="display:contents"><div class="cr-drawer-body"><div class="cr-banner info">Changes are proposals until the trusted TrialAgents review is approved. No data is changed by opening this form.</div><div class="cr-pair">'+fields.map(field).join('')+'</div></div><div class="cr-drawer-foot">'+btn('Cancel','cancel-modal','cr-btn')+'<button type="submit" class="cr-btn cr-btn-primary">Prepare reviewed save</button></div></form></section></div>';
}
function confirmDelete(){if(!st.confirm)return '';const row=lookup(st.confirm.role,st.confirm.id);return '<div class="cr-overlay"><section class="cr-modal-card" role="alertdialog" aria-modal="true" aria-label="Delete record"><h2>Delete this record?</h2><p><strong>'+esc(row?.data.name||'Selected record')+'</strong> will be archived and removed from this app after the reviewed database change is approved. Its record ID, versions and audit history remain recoverable in TrialAgents. This does not permanently erase shared data.</p><div style="display:flex;justify-content:flex-end;gap:8px">'+btn('Cancel','cancel-modal','cr-btn')+btn('Review deletion','confirm-delete','cr-btn cr-btn-danger')+'</div></section></div>';}
// Internal apps use the TrialAgents host's official linked watermark. Do not redraw the mark.
// The standalone review HTML shows the official remotely hosted white PNG, with its canonical link.
const brand=cfg.demoLabel
 ? '<a class="cr-brand cr-brand-link" href="https://platform.trialagents.com" aria-label="TrialAgents"><img src="https://platform.trialagents.com/trialagents-mark-white.png" alt="" width="34" height="34"><span class="cr-brandwords"><span class="cr-brandname">TrialAgents</span><span class="cr-brandsub">Cash Runway preview</span></span></a>'
 : '<div class="cr-brand cr-product-heading"><strong>Cash Runway</strong><span class="cr-brandsub">Finance workspace</span></div>';
const rail='<aside class="cr-rail">'+brand+'<div class="cr-rail-title">Cash planning</div><nav class="cr-nav" aria-label="Cash Runway screens">'+sections.map(s=>btn('<span class="cr-icon">'+icon(s.id)+'</span><span class="cr-nav-label">'+esc(s.label)+'</span>','nav:'+s.id,'',false,'aria-current="'+(st.section===s.id?'page':'false')+'" aria-label="'+esc(s.label)+'"')).join('')+'</nav><div class="cr-rail-bottom"><strong>Planning integrity</strong>Actuals and scenarios are kept separate. All changes require review.<div class="cr-rail-pill">'+esc(cfg.demoLabel?'Fictional demo · local preview':'Authorized records only')+'</div></div></aside>';
let body='';try{if(st.section==='overview')body=overview();else if(st.section==='ledger')body=ledgerScreen();else if(st.section==='budget')body=budgetScreen();else if(st.section==='scenario')body=scenarioScreen();else if(st.section==='forecast')body=forecastScreen();else if(st.section==='briefing')body=briefingScreen();}catch(e){body=heading('A financial planning view')+'<div class="cr-banner">Unable to calculate this screen: '+esc(String(e?.message||e))+'</div>';}
let notices=st.notice?'<div class="cr-banner info" role="status">'+esc(st.notice)+' '+btn('Dismiss','clear-notice','cr-btn')+'</div>':'';
const html='<div class="cr-shell">'+rail+'<main class="cr-content">'+notices+body+'<p class="cr-footnote">'+(cfg.demoLabel?'Fictional records are for demonstration only. No TrialAgents records, emails or automations are created by opening this preview.':'Internal management planning · amounts are not bank reconciliations · all writes reviewed by TrialAgents.')+'</p></main></div>'+editor()+confirmDelete();
const css=typeof CASH_RUNWAY_CSS==='string'?CASH_RUNWAY_CSS:'';
return {html,css,state:st};
