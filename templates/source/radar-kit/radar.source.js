/* TrialAgents Bio Radars kit 1.0.0 (BIO_RADAR.md §2) | frontend-js function body. No DOM, network or browser storage.
 * The generator puts the radar's templateLayoutSchema on line 1, then `const RADAR=…` (radar.json at run time) and brief-core.js, then this file.
 * Returns {html,css,state}. Reads are bounded server-side pages (search, filters, sort, paging), so 5,000 events and 2,000 tracked items stay
 * responsive. Every change a person makes is one records.propose batch approved in the TrialAgents review. Research writes come from the
 * platform automation (scan + digest) under the grants approved at install; the app creates, schedules and runs no automation itself. */

const cfg=typeof templateConfiguration==='object'&&templateConfiguration?templateConfiguration:{};
const bindings=Array.isArray(templateBindings)?templateBindings:[];
const inp=input||{};
const event=inp.event||{kind:'open',action:'',value:null,form:{}};
const action=String(event.action||'');
const form=event.form&&typeof event.form==='object'?event.form:{};
const isAct=event.kind==='click'||event.kind==='submit';

const esc=v=>String(v===null||v===undefined?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const has=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
const num=(v,d=null)=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v))?Number(v):d;
const bool=v=>v===true||v==='true'||v==='on'||v==='1';
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const validDate=briefDate;
const dayNo=d=>Math.round(Date.UTC(Number(d.slice(0,4)),Number(d.slice(5,7))-1,Number(d.slice(8,10)))/86400000);
const addDays=(d,n)=>d?new Date((dayNo(d)+Math.round(n))*86400000).toISOString().slice(0,10):'';
const dateLabel=d=>d?Number(d.slice(8,10))+' '+MONTHS[Number(d.slice(5,7))-1]+' '+d.slice(0,4):'—';
const monthLabel=m=>MONTHS[Number(m.slice(5,7))-1]+' '+m.slice(0,4);
const monthAdd=(m,n)=>{const d=new Date(Date.UTC(Number(m.slice(0,4)),Number(m.slice(5,7))-1+n,1));return d.toISOString().slice(0,7);};
const label=v=>String(v===null||v===undefined||v===''?'—':v).replace(/_/g,' ');
const cap=s=>{if(s!==null&&s!==undefined&&RADAR.optionLabels&&RADAR.optionLabels[s])return RADAR.optionLabels[s];s=label(s);return s.charAt(0).toUpperCase()+s.slice(1);};
const pj=briefJSON;
const textOf=(v,max)=>String(v===null||v===undefined?'':v).trim().slice(0,max||300);
const lines=v=>String(v||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const httpUrl=v=>/^https?:\/\/[^\s"'<>]+$/i.test(String(v||''))?String(v):'';
const plural=(n,w)=>n+' '+w+(Math.abs(n)===1?'':'s');
const AS_OF=validDate(cfg.asOfOverride)||new Date().toISOString().slice(0,10);
const PAGE_SIZE=Math.min(50,Math.max(10,num(cfg.pageSize,25)));
const R=RADAR,P=R.name;

/* Roles: logical key → role key → installed table. Custom tracker fields are bound fields the definition does not know. */
const ROLE_KEY={settings:R.roles.settings,scopes:R.roles.scopes,tracker:R.roles.tracker,events:R.roles.events,runs:R.roles.runs,organizations:'organizations',programs:'programs'};
const ROLE_LABEL={settings:'settings',scopes:'scope',tracker:R.itemLabel,events:'event',runs:'run',organizations:'organization',programs:'program'};
let mapping={};try{mapping=JSON.parse(cfg.tableMap||'{}');}catch(e){mapping={};}
const roleMap={};
for(const role of Object.keys(ROLE_KEY)){
 const m=mapping[ROLE_KEY[role]],b=m&&bindings.find(x=>x.typeId===m.typeId);if(!m||!b)continue;
 const fields={};for(const [k,v] of Object.entries(m.fields||{}))if(typeof v==='string'&&(b.fields||[]).includes(v))fields[k]=v;
 if(role==='tracker')for(const real of b.fields||[])if(!Object.values(fields).includes(real)&&/^[a-z][a-z0-9_]{0,63}$/.test(real))fields[real]=real;
 roleMap[role]={typeId:m.typeId,fields,writable:(Array.isArray(m.writableFields)?m.writableFields:[]).filter(x=>fields[x]).concat(role==='tracker'?Object.keys(fields).filter(k=>!has(m.fields||{},k)):[])};
}
for(const role of ['programs'])if(roleMap[role])roleMap[role].writable=[];
const KNOWN_TRACKER=new Set(R.trackerFields.map(f=>f.key).concat(BRIEF_SYSTEM_FIELDS));
const CUSTOM_KEYS=roleMap.tracker?Object.keys(roleMap.tracker.fields).filter(k=>!KNOWN_TRACKER.has(k)):[];

let callsLeft=60;const problems=[];
/** One bounded server-side page. Filters, sort and search apply to the whole table before paging. */
function read(role,o){
 o=o||{};const m=roleMap[role];
 if(!m)return {rows:[],total:0,ok:false,unbound:true};
 if(callsLeft<=0){problems.push('Read budget used up for '+ROLE_LABEL[role]+'.');return {rows:[],total:null,ok:false};}callsLeft--;
 const filters={};for(const [k,v] of Object.entries(o.filters||{}))if(m.fields[k]&&v!==''&&v!==null&&v!==undefined)filters[m.fields[k]]=String(v);
 const q={typeId:m.typeId,limit:o.limit===undefined?100:o.limit,offset:o.offset||0,filters};
 if(o.sort&&m.fields[o.sort.field])q.sort={field:m.fields[o.sort.field],direction:o.sort.dir==='asc'?'asc':'desc'};
 if(o.q)q.q=String(o.q).slice(0,200);
 let p;try{p=tools.call('records.read',q);}catch(e){problems.push('The '+ROLE_LABEL[role]+' table could not be read.');return {rows:[],total:null,ok:false};}
 if(!p||p.unavailable){problems.push('The '+ROLE_LABEL[role]+' table is not available to you.');return {rows:[],total:null,ok:false};}
 const rows=(Array.isArray(p.rows)?p.rows:[]).map(r=>{const data={};for(const [k,real] of Object.entries(m.fields))if(has(r.data,real)){const v=r.data[real];data[k]=v!==null&&typeof v==='object'?JSON.stringify(v):v;}return {id:String(r.id),version:r.version,data};});
 const total=p.total===null||p.total===undefined?null:Number(p.total);
 return {rows,total,ok:total!==null};
}
function readMany(role,max,o){let rows=[],offset=0,total=null,ok=true;while(rows.length<max){const p=read(role,{...o,limit:100,offset});if(!p.ok&&!p.unbound){ok=false;break;}if(p.unbound)return {rows:[],total:0,ok:false,unbound:true};rows=rows.concat(p.rows);total=p.total;offset+=p.rows.length;if(!p.rows.length||offset>=total)break;}return {rows,total,ok:ok&&total!==null&&rows.length>=total};}
const canWrite=role=>!!inp.saved&&!!inp.writable&&cfg.readOnly!==true&&!!roleMap[role]&&roleMap[role].writable.length>0;

/* State and layout (native gear: screens, tracker and events columns). */
const SCREENS=templateLayoutSchema.screens;
const st=JSON.parse(JSON.stringify(inp.state||{}));
{
 let profile={};try{profile=JSON.parse(cfg.layoutProfile||'{}');}catch(e){profile={};}
 const groups=templateLayoutSchema.groups,tabs=Array.isArray(profile.tabs)?profile.tabs.filter(id=>SCREENS.some(s=>s.id===id)):[];
 const cols={};for(const g of Object.keys(groups)){const ids=groups[g].map(x=>x.id),saved=profile.cols&&Array.isArray(profile.cols[g])?profile.cols[g].filter(k=>ids.includes(k)):[];cols[g]=[...new Set(saved.concat(ids))];}
 st.layout={tabs:[...new Set(tabs.concat(SCREENS.map(s=>s.id)))],cols,visible:profile.visible&&typeof profile.visible==='object'?profile.visible:{},heading:String(profile.heading||cfg.heading||P).slice(0,100)};
}
st.section=String(st.section||'overview');st.page=Math.max(0,Number(st.page)||0);st.epage=Math.max(0,Number(st.epage)||0);
st.q=String(st.q||'');st.eq=String(st.eq||'');st.f=st.f&&typeof st.f==='object'?st.f:{};st.flt=st.flt&&typeof st.flt==='object'?st.flt:{};st.eflt=st.eflt&&typeof st.eflt==='object'?st.eflt:{};
st.sort=st.sort&&typeof st.sort==='object'?st.sort:{field:'last_verified_on',dir:'desc'};st.esub=['new','feed','calendar'].includes(st.esub)?st.esub:'new';st.ssub=['scopes','template','fields','automations'].includes(st.ssub)?st.ssub:'scopes';
st.month=/^\d{4}-\d{2}$/.test(String(st.month||''))?st.month:AS_OF.slice(0,7);st.group=['none','scope','phase','status'].includes(st.group)?st.group:'none';
const note=v=>{st.notice=String(v||'').slice(0,600);};
const sections=st.layout.tabs.map(id=>SCREENS.find(s=>s.id===id)).filter(s=>s&&st.layout.visible[s.id]!==false);
if(!sections.some(s=>s.id===st.section))st.section=(sections[0]||SCREENS[0]).id;
const colVisible=(g,id)=>st.layout.visible[g+'.'+id]!==false;
const draftOf=k=>st.f[k]&&typeof st.f[k]==='object'?st.f[k]:{};

/* Shared reads for every screen: settings, scopes, latest runs (bounded). */
const S0=read('settings',{limit:5});const SETTINGS=(S0.rows[0]||{data:{}});const SET=SETTINGS.data;
const SC=readMany('scopes',300,{});const SCOPES=SC.rows.filter(s=>s.data.archived!==true);const SCOPE={};for(const s of SC.rows)SCOPE[s.id]=s;
const RUNS=read('runs',{limit:30,sort:{field:'run_on',dir:'desc'}});
/* Several runs can share a date (Build now and the scan); the platform breaks ties oldest first, so put the newest first within a date. */
RUNS.rows=RUNS.rows.map((r,i)=>({r,i})).sort((a,b)=>String(b.r.data.run_on||'').localeCompare(String(a.r.data.run_on||''))||b.i-a.i).map(x=>x.r);const LAST_RUN=RUNS.rows[0]||null;
const PROGRAMS=roleMap.programs?read('programs',{limit:100}).rows:[];const PROGRAM={};for(const p of PROGRAMS)PROGRAM[p.id]=p;
const LABELS=pj(SET.field_labels,{})||{};const HIDDEN=new Set((pj(SET.hidden_fields,[])||[]).map(String));
const fieldLabel=k=>{if(LABELS[k])return String(LABELS[k]).slice(0,60);const d=R.trackerFields.find(f=>f.key===k);return d?d.name:k==='natural_key'?'Key':cap(k);};
const KIND_LABEL=Object.fromEntries(R.eventKinds.map(k=>[k.key,k.label]));
/* The field that names an item (kit 1.1.0): title by default, or the radar's itemNameField (for example a company name). */
const itemTitle=d=>String((R.itemNameField&&d[R.itemNameField])||d.title||d.name||d.natural_key||R.itemLabel);
const scopeName=id=>SCOPE[id]?String(SCOPE[id].data.name||'Scope'):'—';
const sourcesOf=v=>{const xs=pj(v,[]);return (Array.isArray(xs)?xs:[]).filter(s=>s&&(s.url||s.title)).map(s=>({title:textOf(s.title||s.url,160),url:httpUrl(s.url),date:validDate(s.date)}));};
const estimated=(row)=>R.dateField&&bool(row.data[R.dateField.estimated]);
const TPL=briefTemplate(SET);

/* Source report: a named source not reachable in its last 3 consecutive runs shows a hint (§2.6). */
function sourceHints(){const per={};
 /* Per run, a source counts as not reachable only when no scope reached it in that run. */
 for(const run of RUNS.rows.slice().reverse()){const rep=pj(run.data.sources_report,[]),inRun={};for(const s of Array.isArray(rep)?rep:[])for(const x of Array.isArray(s&&s.sources)?s.sources:[]){const k=String(x.name||'');if(!k)continue;inRun[k]=inRun[k]===false?false:x.status==='not_reachable'?(inRun[k]===undefined?true:inRun[k]):false;}
  for(const [k,unreachable] of Object.entries(inRun)){per[k]=per[k]||[];per[k].push(unreachable);}}
 return Object.entries(per).filter(([,xs])=>xs.length>=3&&xs.slice(-3).every(Boolean)).map(([k])=>k);}

/* Writes: one exact records.propose (≤ 50 changes) approved by a person in TrialAgents. */
function toReal(role,data){const m=roleMap[role];if(!m)throw Error('The '+ROLE_LABEL[role]+' table is not connected.');const out={};for(const [k,v] of Object.entries(data)){if(v===undefined||!m.fields[k])continue;if(!m.writable.includes(k))throw Error('You cannot edit '+k.replace(/_/g,' ')+' in the '+ROLE_LABEL[role]+' table.');out[m.fields[k]]=v;}return out;}
const crt=(role,data)=>{if(!canWrite(role))throw Error('You cannot add a '+ROLE_LABEL[role]+' here.');return {kind:'create_record',typeId:roleMap[role].typeId,data:toReal(role,data)};};
const upd=(role,row,data,version)=>{if(!row)throw Error('That '+ROLE_LABEL[role]+' is no longer available. Reopen it and try again.');if(!canWrite(role))throw Error('You cannot change this '+ROLE_LABEL[role]+'.');return {kind:'update_record',recordId:row.id,expectedVersion:version===undefined||version===null?row.version:version,data:toReal(role,data)};};
function propose(changes,message){changes=changes.filter(Boolean);if(!changes.length)throw Error('There is nothing to save.');if(changes.length>50)throw Error('This needs '+changes.length+' changes; one review holds 50.');tools.call('records.propose',changes);note(message||'Prepared for TrialAgents review. Nothing changes until a person approves it.');}
function saveSettings(data,message){propose([SETTINGS.id?upd('settings',SETTINGS,data):crt('settings',data)],message);}
const requireSources=list=>{if(!list.some(s=>s.url||s.title))throw Error('Add at least one source (title or URL). Unsourced rows cannot be saved.');return JSON.stringify(list.slice(0,20));};
const sourcesFromForm=d=>lines(d.sources).map(l=>{const url=(l.match(/https?:\/\/\S+/)||[''])[0];return {title:textOf(l.replace(url,'').replace(/[·|-]\s*$/,'').trim()||url,160),url:httpUrl(url),date:AS_OF};});

/* Row lookups: rows shown on screen are remembered as id → natural key (st.keys), so a panel re-reads its row with an exact filter
 * on the key (search only matches field values, never IDs). Scopes are all loaded. A panel keeps the version it opened with. */
const prevKeys=st.keys&&typeof st.keys==='object'?st.keys:{};const nextKeys={};
const remember=(role,row)=>{if(row&&row.id&&row.data&&row.data.natural_key)nextKeys[row.id]=[role,String(row.data.natural_key)];return row;};
function findRow(role,id,key){
 if(!id)return null;if(role==='scopes')return SCOPE[id]||null;
 const k=key||(prevKeys[id]&&prevKeys[id][0]===role?prevKeys[id][1]:nextKeys[id]&&nextKeys[id][0]===role?nextKeys[id][1]:'');if(!k)return null;
 const row=read(role,{filters:{natural_key:k},limit:20}).rows.find(r=>r.id===id)||null;return remember(role,row);}

/* Actions */
let failed=false;
try{
 if(action==='clear-notice')st.notice='';
 else if(action.startsWith('nav:')){st.section=action.slice(4);st.panel=null;}
 else if(action.startsWith('esub:')){st.esub=action.slice(5);st.epage=0;}
 else if(action.startsWith('ssub:')){st.ssub=action.slice(5);st.panel=null;}
 else if(action==='close'){st.panel=null;}
 else if(action==='q'&&event.kind==='change'){st.q=textOf(event.value,200);st.page=0;}
 else if(action==='eq'&&event.kind==='change'){st.eq=textOf(event.value,200);st.epage=0;}
 else if(action.startsWith('flt:')&&event.kind==='change'){st.flt[action.slice(4)]=String(event.value||'');st.page=0;}
 else if(action.startsWith('eflt:')&&event.kind==='change'){st.eflt[action.slice(5)]=String(event.value||'');st.epage=0;}
 else if(action==='group'&&event.kind==='change'){st.group=String(event.value||'none');}
 else if(action.startsWith('sort:')){const f=action.slice(5);st.sort={field:f,dir:st.sort.field===f&&st.sort.dir==='desc'?'asc':'desc'};st.page=0;}
 else if(action==='prev-page')st.page=Math.max(0,st.page-1);else if(action==='next-page')st.page++;
 else if(action==='eprev-page')st.epage=Math.max(0,st.epage-1);else if(action==='enext-page')st.epage++;
 else if(action==='month-prev')st.month=monthAdd(st.month,-1);else if(action==='month-next')st.month=monthAdd(st.month,1);else if(action==='month-today')st.month=AS_OF.slice(0,7);
 else if(action.startsWith('f:')&&event.kind==='change'){const [,k,name]=action.split(':');st.f[k]={...draftOf(k),[name]:event.value};}
 else if(action.startsWith('open:')){const [,type,id,...rest]=action.split(':');const role=type==='item'?'tracker':type==='event'?'events':'scopes';const row=findRow(role,id,rest.join(':')||undefined);if(!row)throw Error('That '+ROLE_LABEL[role]+' is no longer available.');st.panel={type,id,version:row.version};st.f[type]={};}
 else if(action==='new:scope'){st.panel={type:'scope',id:null,version:null};st.f.scope={};}
 else if(action==='new:item'){st.panel={type:'newitem',id:null};st.f.newitem={};}
 else if(action.startsWith('edit:')){const [,type]=action.split(':');if(st.panel)st.panel.mode='edit';st.f[type]=st.f[type]||{};}
 else if(action.startsWith('dismiss-form:')){if(st.panel)st.panel.mode='dismiss';}
 /* Tracker: watch, seen, dismiss, edit, add (people only; research never writes these fields). */
 else if(action.startsWith('watch:')||action.startsWith('unwatch:')){const id=action.split(':')[1],row=findRow('tracker',id);propose([upd('tracker',row,{watched:action.startsWith('watch:')})],action.startsWith('watch:')?'Watch prepared for review.':'Unwatch prepared for review.');}
 else if(action.startsWith('seen:')){const id=action.split(':')[1],row=findRow('tracker',id);if(!row||!row.data.last_changed_run_id)throw Error('Nothing changed on this '+R.itemLabel+' yet.');propose([upd('tracker',row,{seen_run_id:row.data.last_changed_run_id},st.panel&&st.panel.id===id?st.panel.version:undefined)],'Marked seen, prepared for review.');}
 else if(action==='seen-page'){const rows=read('tracker',{filters:{last_changed_run_id:LAST_RUN?LAST_RUN.data.run_id:''},limit:50}).rows.filter(r=>r.data.seen_run_id!==r.data.last_changed_run_id);if(!rows.length)throw Error('Everything from the last run is already seen.');propose(rows.map(r=>upd('tracker',r,{seen_run_id:r.data.last_changed_run_id})),plural(rows.length,R.itemLabel)+' marked seen, prepared for review.');}
 else if(action.startsWith('dismiss-item:')||action.startsWith('restore-item:')){const id=action.split(':')[1],row=findRow('tracker',id);propose([upd('tracker',row,{dismissed:action.startsWith('dismiss-item:')},st.panel&&st.panel.id===id?st.panel.version:undefined)],action.startsWith('dismiss-item:')?'Dismissal prepared for review. A dismissed '+R.itemLabel+' is not recreated by research.':'Restore prepared for review.');st.panel=null;}
 else if(action==='save-item'&&event.kind==='submit'){const p=st.panel,row=p&&findRow('tracker',p.id);if(!row)throw Error('That '+R.itemLabel+' is no longer available.');const d={...draftOf('item'),...form},data={};
  for(const f of R.trackerFields.concat(CUSTOM_KEYS.map(k=>({key:k,kind:'text'}))))if(has(d,f.key)&&roleMap.tracker.writable.includes(f.key))data[f.key]=f.kind==='number'?num(d[f.key]):f.kind==='boolean'?bool(d[f.key]):f.kind==='date'?(validDate(d[f.key])||null):textOf(d[f.key],2000)||null;
  if(has(d,'user_notes'))data.user_notes=textOf(d.user_notes,4000)||null;
  if(has(d,'sources'))data.sources=requireSources(sourcesFromForm(d));
  propose([upd('tracker',row,data,p.version)],'Changes to '+itemTitle(row.data)+' prepared for review.');st.panel.mode='';st.f.item={};}
 else if(action==='add-item'&&event.kind==='submit'){const d={...draftOf('newitem'),...form},key=textOf(d.natural_key,120).toUpperCase().replace(/\s+/g,''),title=textOf(d.title,300);
  if(!key)throw Error('Enter the '+R.naturalKey.label+'.');if(!title)throw Error('Enter a title.');if(!SCOPE[d.scope_id])throw Error('Choose a scope.');
  const dup=read('tracker',{filters:{natural_key:key},limit:1});if(dup.total)throw Error('A '+R.itemLabel+' with '+key+' is already tracked.');
  propose([crt('tracker',{natural_key:key,title,scope_id:d.scope_id,sources:requireSources(sourcesFromForm(d)),last_verified_on:AS_OF,changed_fields:'["new"]'})],R.itemLabel+' '+key+' prepared for review.');st.panel=null;st.f.newitem={};}
 /* Events: mark reviewed, dismiss with a reason, bulk review. */
 else if(action.startsWith('review-event:')){const id=action.split(':')[1],row=findRow('events',id);propose([upd('events',row,{status:'reviewed'})],'Marked reviewed, prepared for review.');st.panel=null;}
 else if(action==='dismiss-event'&&event.kind==='submit'){const p=st.panel,row=p&&findRow('events',p.id);const reason=textOf({...draftOf('event'),...form}.dismiss_reason,300);if(!reason)throw Error('Give a reason for dismissing this event.');propose([upd('events',row,{status:'dismissed',dismiss_reason:reason},p.version)],'Dismissal prepared for review.');st.panel=null;st.f.event={};}
 else if(action==='review-page'){const rows=read('events',{filters:{status:'new',...eventFilters()},sort:{field:'occurred_on',dir:'desc'},limit:50,offset:0}).rows;if(!rows.length)throw Error('No new events to mark.');propose(rows.map(r=>upd('events',r,{status:'reviewed'})),plural(rows.length,'event')+' marked reviewed, prepared for review.');}
 /* Scopes */
 else if(action==='save-scope'&&event.kind==='submit'){const p=st.panel,d={...draftOf('scope'),...form},name=textOf(d.name,120);if(!name)throw Error('Name the scope.');
  const def={};for(const f of R.scopeFields){const v=textOf(d['def_'+f.key],f.multiline?6000:500);if(f.required&&!v)throw Error('Enter '+f.name.toLowerCase()+'.');if(v)def[f.key]=v;}
  const srcs=[];for(let i=0;i<12;i++){const n=textOf(d['src_name_'+i],120);if(!n)continue;srcs.push({name:n,covers:textOf(d['src_covers_'+i],300),priority:num(d['src_priority_'+i],i+1),notes:textOf(d['src_notes_'+i],400)});}
  if(!srcs.length)throw Error('Keep at least one named source. The web is always the default route.');
  const data={name,program_id:PROGRAM[d.program_id]?d.program_id:null,definition:JSON.stringify(def),sources:JSON.stringify(srcs.sort((a,b)=>a.priority-b.priority)),watchlist:JSON.stringify(lines(d.watchlist).slice(0,100)),include_notes:textOf(d.include_notes,1000)||null,exclude_notes:textOf(d.exclude_notes,1000)||null,status:d.status==='paused'?'paused':'active'};
  if(p&&p.id){const row=findRow('scopes',p.id);propose([upd('scopes',row,data,p.version)],'Scope "'+name+'" prepared for review.');}else propose([crt('scopes',data)],'Scope "'+name+'" prepared for review. The next scan uses it.');st.panel=null;st.f.scope={};}
 else if(action.startsWith('scope-status:')){const [,id,to]=action.split(':');const row=findRow('scopes',id);propose([upd('scopes',row,{status:to==='paused'?'paused':'active'})],'Scope '+(to==='paused'?'pause':'activation')+' prepared for review.');}
 /* Research template: versions, restore default; required rules are not editable. */
 else if(action==='save-template'&&event.kind==='submit'){const d={...draftOf('tpl'),...form},instruction=textOf(d.instruction,6000);if(!instruction)throw Error('The instruction cannot be empty. Use Restore default instead.');
  const rules=lines(d.rules).map(x=>textOf(x,400)).filter(x=>!R.requiredRules.includes(x)).slice(0,30);saveTemplate({instruction,rules},textOf(d.note,200)||'Edited');st.f.tpl={};}
 else if(action==='restore-template'){saveTemplate(defaultTpl(),'Restored default');st.f.tpl={};}
 else if(action.startsWith('restore-version:')){const v=Number(action.split(':')[1]),h=(pj(SET.research_template_history,[])||[]).find(x=>Number(x.version)===v);if(!h||!h.template)throw Error('That version is not in the history.');saveTemplate(h.template,'Restored version '+v);}
 /* Field labels (display rename). Hiding uses the layout gear; adding a field is a reviewed schema change. */
 else if(action==='save-labels'&&event.kind==='submit'){const d={...draftOf('labels'),...form},out={},hidden=[];for(const k of Object.keys(roleMap.tracker?roleMap.tracker.fields:{})){const v=textOf(d['label_'+k],60);const std=(R.trackerFields.find(f=>f.key===k)||{}).name;if(v&&v!==std&&v!==cap(k))out[k]=v;if((has(d,'show_'+k)?d['show_'+k]:HIDDEN.has(k)?'hidden':'shown')==='hidden')hidden.push(k);}
  saveSettings({field_labels:JSON.stringify(out),hidden_fields:JSON.stringify(hidden)},'Field labels and visibility prepared for review. Hidden fields stay in the research.');st.f.labels={};}
 else if(isAct&&action&&action!=='tracker:layout')throw Error('That action is not available here.');
}catch(e){failed=true;note(String(e&&e.message||e).slice(0,600));}
function defaultTpl(){return {instruction:R.instruction,rules:[]};}
function saveTemplate(t,why){const hist=(pj(SET.research_template_history,[])||[]).filter(x=>x&&x.version);const v=TPL.version;
 if(!SETTINGS.id||!hist.some(x=>Number(x.version)===v))hist.push({version:v,saved_on:AS_OF,note:TPL.isDefault?'Default':'Before change',template:{instruction:TPL.instruction,rules:TPL.rules}});
 const next=v+1;hist.push({version:next,saved_on:AS_OF,note:why,template:t});
 saveSettings({research_template:JSON.stringify(t),research_template_version:next,research_template_history:JSON.stringify(hist.slice(-20))},'Research template version '+next+' prepared for review. The next run uses it.');}
function eventFilters(){const f={};for(const k of ['scope_id','kind','impact'])if(st.eflt[k])f[k]=st.eflt[k];return f;}

/* After an approved review the host re-renders with "open": an untouched panel adopts the record's current version. */
if(event.kind==='open'&&st.panel&&st.panel.id){const role=st.panel.type==='item'?'tracker':st.panel.type==='event'?'events':'scopes',row=findRow(role,st.panel.id);if(!row)st.panel=null;else if(!Object.keys(draftOf(st.panel.type)).length)st.panel.version=row.version;}

/* UI helpers */
const glyph={overview:'<rect x="3" y="3" width="7" height="8" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/>',tracker:'<path d="M4 6h16M4 12h16M4 18h10"/>',events:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',setup:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',close:'<path d="M6 6l12 12M18 6L6 18"/>',lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'};
const icon=(n,s=18)=>'<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(glyph[n]||glyph.overview)+'</svg>';
const btn=(text,a,cls,disabled,extra)=>'<button type="button" class="'+(cls===undefined?'rd-btn':cls)+'" data-action="'+esc(a)+'"'+(disabled?' disabled':'')+(extra?' '+extra:'')+'>'+text+'</button>';
const bS=(t,a,d,x)=>btn(t,a,'rd-btn small',d,x),bP=(t,a,d,x)=>btn(t,a,'rd-btn small rd-btn-primary',d,x),bL=(t,a,x)=>btn(t,a,'rd-link',false,x);
const submit=(text,ok)=>'<button type="submit" class="rd-btn rd-btn-primary"'+(ok===false?' disabled':'')+'>'+esc(text)+'</button>';
const pill=(text,type)=>'<span class="rd-pill '+esc(type||'')+'">'+esc(text)+'</span>';
const est='<span class="rd-est" title="Estimate">est.</span>';
const impactPill=v=>pill(cap(v||'none'),v==='high'?'red':v==='medium'?'amber':v==='low'?'blue':'');
const kv=(k,v,raw)=>'<div class="rd-kv"><span>'+esc(k)+'</span><strong>'+(raw?v:esc(v===null||v===undefined||v===''?'—':v))+'</strong></div>';
const kpi=(t,v,foot,tone)=>'<div class="rd-kpi '+(tone||'')+'"><div class="rd-kpi-label">'+esc(t)+'</div><div class="rd-kpi-value">'+esc(v)+'</div><div class="rd-kpi-foot">'+esc(foot||'')+'</div></div>';
const panel=(title,sub,body,right)=>'<section class="rd-panel"><div class="rd-pad"><div class="rd-panel-head"><div><h2>'+esc(title)+'</h2>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div>'+(right?'<div class="rd-row">'+right+'</div>':'')+'</div>'+body+'</div></section>';
const tbl=(lab,heads,rows,none)=>'<div class="rd-scroll" role="region" aria-label="'+esc(lab)+'" tabindex="0"><table class="rd-table compact"><thead><tr>'+heads.join('')+'</tr></thead><tbody>'+(rows.join('')||'<tr><td colspan="'+heads.length+'" class="rd-none">'+esc(none||'Nothing yet.')+'</td></tr>')+'</tbody></table></div>';
const th=(t,num)=>'<th scope="col"'+(num?' class="num"':'')+'>'+esc(t)+'</th>';
const sortTh=(t,f)=>{const on=st.sort.field===f;return '<th scope="col" aria-sort="'+(on?(st.sort.dir==='asc'?'ascending':'descending'):'none')+'">'+btn(esc(t)+(on?(st.sort.dir==='asc'?' ↑':' ↓'):''),'sort:'+f,'rd-link')+'</th>';};
const ul=(items,none)=>items.length?'<ul class="rd-list">'+items.join('')+'</ul>':'<p class="rd-muted">'+esc(none||'Nothing yet.')+'</p>';
function pager(total,page,per,prefix){const max=Math.max(0,Math.ceil((total||0)/per)-1);if(!total||max===0)return total?'<div class="rd-footer"><span>'+plural(total,'row')+'</span></div>':'';return '<div class="rd-footer"><span>Showing '+(page*per+1)+'–'+Math.min(total,(page+1)*per)+' of '+total+'</span><span class="rd-pager">'+bS('Previous',prefix+'prev-page',page===0)+'<span>Page '+(page+1)+' of '+(max+1)+'</span>'+bS('Next',prefix+'next-page',page>=max)+'</span></div>';}
function inputOf(fn,name,value,o){o=o||{};const id='rd-'+fn+'-'+name,common=' id="'+esc(id)+'" name="'+esc(name)+'" data-ui-state="true" data-action="'+esc('f:'+fn+':'+name)+'"'+(o.disabled?' disabled':'')+(o.required?' required':'');const d=has(draftOf(fn),name)?draftOf(fn)[name]:value;
 if(o.type==='select')return '<select'+common+'>'+(o.blank===undefined?'':'<option value="">'+esc(o.blank)+'</option>')+o.options.map(x=>'<option value="'+esc(x[0])+'"'+(String(d===null||d===undefined?'':d)===String(x[0])?' selected':'')+'>'+esc(x[1])+'</option>').join('')+'</select>';
 if(o.type==='textarea')return '<textarea class="rd-input rd-textarea"'+common+(o.placeholder?' placeholder="'+esc(o.placeholder)+'"':'')+'>'+esc(d===null||d===undefined?'':d)+'</textarea>';
 return '<input class="rd-input" type="'+(o.type||'text')+'"'+common+(o.placeholder?' placeholder="'+esc(o.placeholder)+'"':'')+' value="'+esc(d===null||d===undefined?'':d)+'">';}
const field=(fn,name,lab,value,o)=>'<label class="rd-field'+(o&&o.wide?' wide':'')+'" for="rd-'+fn+'-'+name+'">'+esc(lab)+(o&&o.required?' *':'')+inputOf(fn,name,value,o)+(o&&o.hint?'<small class="rd-muted">'+esc(o.hint)+'</small>':'')+'</label>';
function drawer(title,eyebrow,body,foot,formAction){return '<div class="rd-overlay"><section class="rd-drawer" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="rd-drawer-head"><div><div class="rd-eyebrow">'+esc(eyebrow)+'</div><h2>'+esc(title)+'</h2></div>'+btn(icon('close',18),'close','rd-icon-btn',false,'aria-label="Close"')+'</div>'+(formAction?'<form class="rd-drawer-form" data-action="'+esc(formAction)+'">':'<div class="rd-drawer-form">')+'<div class="rd-drawer-body">'+body+'</div>'+(foot===null?'':'<div class="rd-drawer-foot">'+(foot||btn('Close','close'))+'</div>')+(formAction?'</form>':'</div>')+'</section></div>';}
const reviewNote='<div class="rd-banner">Saving prepares a TrialAgents review. Nothing changes until a person approves it.</div>';
const scopeOpts=()=>SCOPES.map(s=>[s.id,String(s.data.name||'Scope')]);
const srcLinks=v=>{const xs=sourcesOf(v);return xs.length?xs.slice(0,3).map(s=>s.url?'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title||s.url)+'</a>':esc(s.title)).join(', '):'<span class="rd-muted">No source</span>';};
const dateCell=(d,isEst)=>d?esc(dateLabel(d))+(isEst?est:''):'—';
const changedSet=row=>row.data.last_changed_run_id&&row.data.last_changed_run_id!==row.data.seen_run_id?new Set(pj(row.data.changed_fields,[])||[]):new Set();

const current=SCREENS.find(s=>s.id===st.section)||SCREENS[0];
const DESC={overview:'High-impact items, coming dates, what changed since the last run and the latest source report.',tracker:'Every tracked '+R.itemLabel+' with sources, what the last run changed, and your watchlist.',events:'New events since the last run, the feed and the calendar of dated events.',setup:'Scopes and named sources, the research template, '+R.trackerLabel.toLowerCase()+' fields, and links to Automations and Access.'};
const exact=()=>!problems.length;
function heading(){return '<header class="rd-top"><div><div class="rd-eyebrow">'+esc(P)+' / '+esc(current.label)+'</div><h1 class="rd-title">'+esc(st.layout.heading)+'</h1><p class="rd-subtitle">'+esc(DESC[current.id])+'</p></div><div class="rd-top-right">'+pill('As of '+dateLabel(AS_OF),'blue')+btn(icon('gear',18),'tracker:layout','rd-icon-btn',!inp.saved,'aria-label="App layout settings" title="Layout settings"')+'</div></header>';}

/* 1 Overview */
function overview(){
 const highQ=read('events',{filters:{impact:'high',status:'new'},sort:{field:'occurred_on',dir:'desc'},limit:5});
 const items=read('tracker',{limit:0}),watched=read('tracker',{filters:{watched:'true'},limit:0}),newEv=read('events',{filters:{status:'new'},limit:0});
 /* Coming dates: one read of the latest-dated events (newest first), kept to the next 90 days. If more than 100 events are dated after
  * today + 90 days, the list says it may be incomplete rather than reading month by month. */
 const end=addDays(AS_OF,90),latest=read('events',{sort:{field:'occurred_on',dir:'desc'},limit:100});
 const coming=latest.rows.filter(e=>{const d=validDate(e.data.occurred_on);return d&&d>=AS_OF&&d<=end&&e.data.status!=='dismissed';}).sort((a,b)=>String(a.data.occurred_on).localeCompare(String(b.data.occurred_on)));
 const comingPartial=(latest.total||0)>100&&latest.rows.length>0&&validDate(latest.rows[latest.rows.length-1].data.occurred_on)>end;
 const runId=LAST_RUN?LAST_RUN.data.run_id:'';const runEv=runId?read('events',{filters:{run_id:runId},sort:{field:'impact',dir:'asc'},limit:6}):{rows:[],total:0},runItems=runId?read('tracker',{filters:{last_changed_run_id:runId},limit:6}):{rows:[],total:0};
 const hints=sourceHints();
 const k='<div class="rd-kpis">'+kpi(R.trackerLabel+' tracked',items.total===null?'—':items.total,(watched.total||0)+' watched')+kpi('New events',newEv.total===null?'—':newEv.total,'to review',newEv.total?'':'')+kpi('High impact, new',highQ.total===null?'—':highQ.total,'high-impact events to review',highQ.total?'bad':'')+'</div>';
 for(const e of highQ.rows)remember('events',e);const hi=highQ.rows.map(e=>'<li><span>'+bL(esc(e.data.title||'Event'),'open:event:'+e.id+':'+String(e.data.natural_key||''))+'<span class="rd-sub">'+esc(KIND_LABEL[e.data.kind]||label(e.data.kind))+' · '+esc(scopeName(e.data.scope_id))+(e.data.so_what?' · '+esc(textOf(e.data.so_what,140)):'')+'</span></span><span>'+dateCell(validDate(e.data.occurred_on),bool(e.data.expected))+'</span></li>');
 const co=coming.slice(0,8).map(e=>'<li><span>'+bL(esc(e.data.title||'Event'),'open:event:'+e.id+':'+String(e.data.natural_key||''))+'<span class="rd-sub">'+esc(KIND_LABEL[e.data.kind]||label(e.data.kind))+'</span></span><span>'+dateCell(validDate(e.data.occurred_on),bool(e.data.expected))+'</span></li>');
 for(const r of runItems.rows)remember('tracker',r);for(const e of runEv.rows.concat(coming))remember('events',e);const ch=runItems.rows.map(r=>'<li><span>'+bL(esc(itemTitle(r.data)),'open:item:'+r.id+':'+String(r.data.natural_key||''))+'<span class="rd-sub">'+esc((pj(r.data.changed_fields,[])||[]).map(x=>x==='new'?'New':fieldLabel(x)).join(', ')||'Updated')+'</span></span>'+(r.data.seen_run_id===runId?pill('Seen',''):pill('Changed','amber'))+'</li>').concat(runEv.rows.map(e=>'<li><span>'+bL(esc(e.data.title||'Event'),'open:event:'+e.id+':'+String(e.data.natural_key||''))+'<span class="rd-sub">'+esc(KIND_LABEL[e.data.kind]||'')+'</span></span>'+impactPill(e.data.impact)+'</li>'));
 const rep=LAST_RUN?pj(LAST_RUN.data.sources_report,[]):[];const repRows=[];for(const s of Array.isArray(rep)?rep:[])for(const x of Array.isArray(s&&s.sources)?s.sources:[])repRows.push('<tr><td>'+esc(scopeName(s.scope_id))+'</td><td>'+esc(x.name)+'</td><td>'+pill(x.status==='used'?'Used':x.status==='not_reachable'?'Not reachable':'Not relevant',x.status==='used'?'green':x.status==='not_reachable'?'red':'')+'</td><td>'+esc(textOf(x.note,200))+'</td></tr>');
 const last=LAST_RUN?panel('Last run',dateLabel(validDate(LAST_RUN.data.run_on))+' · '+cap(LAST_RUN.data.kind)+' · '+cap(LAST_RUN.data.status)+(LAST_RUN.data.assistant?' · '+cap(LAST_RUN.data.assistant):'')+(LAST_RUN.data.research_template_version?' · template v'+LAST_RUN.data.research_template_version:''),(LAST_RUN.data.summary?'<p>'+esc(textOf(LAST_RUN.data.summary,600))+'</p>':'')+tbl('Source report',[th('Scope'),th('Source'),th('Result'),th('Note')],repRows,'No source report.')):panel('Last run','No run yet.','<div class="rd-empty"><strong>No run yet</strong>Add a scope in Setup, then ask Claude or ChatGPT to "Build '+esc(P)+' now", or wait for the scheduled scan.</div>');
 return k+hints.map(h=>'<div class="rd-hint" role="status"><strong>'+esc(h)+'</strong> was not reachable in the last 3 runs. Check the source in Setup, or connect it in Claude or ChatGPT; the runs continue on the web.</div>').join('')+'<div class="rd-grid2">'+panel('High impact to review','New high-impact events.',ul(hi,'No new high-impact events.'))+panel('Coming up (90 days)',comingPartial?'More than 100 events are dated after the next 90 days; open Events → Calendar for each month.':'Dated events; estimates are marked est.',ul(co,comingPartial?'See Events → Calendar.':'No dated events in the next 90 days.'))+'</div>'+
  panel('What changed since the last run',LAST_RUN?plural((runItems.total||0),R.itemLabel)+' and '+plural(runEv.total||0,'event')+' from the '+dateLabel(validDate(LAST_RUN.data.run_on))+' run.':'Nothing yet.',ul(ch,'Nothing changed in the last run.'),LAST_RUN&&runItems.total?bS('Mark all seen','seen-page',!canWrite('tracker')):'')+last;
}

/* 2 Tracker */
function trackerScreen(){
 const filters={};if(st.flt.scope)filters.scope_id=st.flt.scope;if(st.flt.watched==='1')filters.watched='true';
 const selectable=R.trackerFields.filter(f=>f.kind==='select');for(const f of selectable)if(st.flt[f.key])filters[f.key]=st.flt[f.key];
 const sortField=roleMap.tracker&&roleMap.tracker.fields[st.sort.field]?st.sort.field:'last_verified_on';
 const page=read('tracker',{q:st.q,filters,sort:{field:sortField,dir:st.sort.dir},limit:PAGE_SIZE,offset:st.page*PAGE_SIZE});
 if(page.total!==null&&st.page>0&&st.page*PAGE_SIZE>=page.total)st.page=Math.max(0,Math.ceil(page.total/PAGE_SIZE)-1);
 const groups=templateLayoutSchema.groups.tracker,cols=st.layout.cols.tracker.filter(id=>colVisible('tracker',id)&&!HIDDEN.has(id));
 const customCols=CUSTOM_KEYS.filter(k=>!HIDDEN.has(k));
 const head=cols.map(id=>{const g=groups.find(x=>x.id===id);const lab=id==='natural_key'?'Key':id==='sponsor'?'Sponsor':id==='changed'||id==='watched'?g.label:fieldLabel(id);return id==='changed'||id==='watched'||id==='sponsor'?th(lab):sortTh(lab,id);}).concat(customCols.map(k=>th(fieldLabel(k)))).concat(['<th scope="col" class="rd-actions">Actions</th>']);
 const cell=(r,id)=>{const ch=changedSet(r),hl=ch.has(id)||ch.has('new');const v=r.data[id],f=R.trackerFields.find(x=>x.key===id);let h;
  if(id==='natural_key')h='<span class="rd-key">'+bL(esc(v||'—'),'open:item:'+r.id+':'+String(r.data.natural_key||''))+'</span>';else if(id==='sponsor')h=esc(r.data.sponsor_name||'—');else if(id==='changed')h=ch.size?pill(ch.has('new')?'New':'Changed','amber'):'';else if(id==='watched')h=bool(r.data.watched)?pill('Watched','blue'):'';
  else if(f&&f.kind==='date')h=dateCell(validDate(v),R.dateField&&id===R.dateField.key&&estimated(r));else if(f&&f.kind==='select')h=esc(cap(v));else if(f&&f.kind==='number')h=esc(v===null||v===undefined?'—':v);else h=esc(textOf(v,140)||'—');
  return '<td class="'+(hl?'rd-changed':'')+(f&&f.kind==='number'?' num':'')+(id==='title'?' rd-wide':'')+'">'+h+'</td>';};
 const rowHtml=r=>(remember('tracker',r),'<tr')+(bool(r.data.dismissed)?' class="rd-muted"':'')+'>'+cols.map(id=>cell(r,id)).join('')+customCols.map(k=>'<td class="'+(changedSet(r).has(k)?'rd-changed':'')+'">'+esc(textOf(r.data[k],140)||'—')+'</td>').join('')+'<td class="rd-actions">'+bS('Open','open:item:'+r.id+':'+String(r.data.natural_key||''))+(bool(r.data.dismissed)?' '+pill('Dismissed',''):'')+'</td></tr>';
 let body;const gkey=st.group==='scope'?'scope_id':st.group;
 if(st.group!=='none'&&page.rows.length){const g={};for(const r of page.rows){const k=String(r.data[gkey]||'');(g[k]=g[k]||[]).push(r);}body=Object.entries(g).map(([k,rs])=>'<tr><th scope="rowgroup" colspan="'+head.length+'">'+esc(st.group==='scope'?scopeName(k):cap(k||'Not set'))+' · '+rs.length+'</th></tr>'+rs.map(rowHtml).join(''));}else body=page.rows.map(rowHtml);
 const opts=(xs,lab)=>'<option value="">'+esc(lab)+'</option>'+xs.map(x=>'<option value="'+esc(x[0])+'"'+(String(st.flt[x[2]]||'')===String(x[0])?' selected':'')+'>'+esc(x[1])+'</option>').join('');
 const filterRow='<div class="rd-filter-row"><label>Scope<select name="scope" data-ui-state="true" data-action="flt:scope">'+opts(SCOPES.map(s=>[s.id,s.data.name,'scope']),'All scopes')+'</select></label>'+selectable.map(f=>'<label>'+esc(fieldLabel(f.key))+'<select name="'+esc(f.key)+'" data-ui-state="true" data-action="flt:'+esc(f.key)+'">'+opts(f.options.map(o=>[o,cap(o),f.key]),'Any')+'</select></label>').join('')+'<label>Watchlist<select name="watched" data-ui-state="true" data-action="flt:watched">'+opts([['1','Watched only','watched']],'All')+'</select></label><label>Group this page<select name="group" data-ui-state="true" data-action="group">'+[['none','No grouping'],['scope','Scope'],...selectable.slice(0,2).map(f=>[f.key,fieldLabel(f.key)])].map(x=>'<option value="'+esc(x[0])+'"'+(st.group===x[0]?' selected':'')+'>'+esc(x[1])+'</option>').join('')+'</select></label></div>';
 const toolbar='<div class="rd-toolbar"><input class="rd-search" type="search" name="q" aria-label="Search '+esc(R.trackerLabel.toLowerCase())+'" placeholder="Search all '+esc(R.itemsLabel)+'" data-ui-state="true" data-action="q" value="'+esc(st.q)+'">'+bP('Add '+R.itemLabel,'new:item',!canWrite('tracker')||!SCOPES.length)+'</div>';
 const csv=page.rows.length?'<details class="rd-banner"><summary>Export this page (CSV)</summary><pre class="rd-pre">'+esc([cols.filter(c=>!['changed','watched'].includes(c)).join(',')].concat(page.rows.map(r=>cols.filter(c=>!['changed','watched'].includes(c)).map(c=>'"'+String(c==='sponsor'?r.data.sponsor_name||'':r.data[c]===null||r.data[c]===undefined?'':r.data[c]).replace(/"/g,'""')+'"').join(','))).join('\n'))+'</pre><p class="rd-muted">The whole table exports from Database in TrialAgents.</p></details>':'';
 return panel(R.trackerLabel,(page.total===null?'Partial data':plural(page.total,R.itemLabel))+(st.q?' matching "'+st.q+'"':'')+'. Search, filters and sort apply to the whole table; grouping applies to this page.',toolbar+filterRow+'<div style="height:14px"></div>'+tbl(R.trackerLabel,head,body,SCOPES.length?'No '+R.itemsLabel+' yet. Run the scan or Build now in chat.':'Add a scope in Setup first.')+pager(page.total,st.page,PAGE_SIZE,'')+csv);
}

/* 3 Events */
function eventsScreen(){
 const tabs='<div class="rd-seg" role="tablist" aria-label="Events views">'+[['new','New'],['feed','Feed'],['calendar','Calendar']].map(([k,l])=>btn(l,'esub:'+k,'rd-seg-btn',false,'role="tab" aria-selected="'+(st.esub===k)+'"')).join('')+'</div>';
 const opts=(xs,lab,key)=>'<option value="">'+esc(lab)+'</option>'+xs.map(x=>'<option value="'+esc(x[0])+'"'+(String(st.eflt[key]||'')===String(x[0])?' selected':'')+'>'+esc(x[1])+'</option>').join('');
 const filterRow='<div class="rd-filter-row"><label>Scope<select name="scope_id" data-ui-state="true" data-action="eflt:scope_id">'+opts(SCOPES.map(s=>[s.id,s.data.name]),'All scopes','scope_id')+'</select></label><label>Kind<select name="kind" data-ui-state="true" data-action="eflt:kind">'+opts(R.eventKinds.map(k=>[k.key,k.label]),'All kinds','kind')+'</select></label><label>Impact<select name="impact" data-ui-state="true" data-action="eflt:impact">'+opts(['high','medium','low','none'].map(x=>[x,cap(x)]),'Any impact','impact')+'</select></label>'+(st.esub==='feed'?'<label>Status<select name="status" data-ui-state="true" data-action="eflt:status">'+opts([['new','New'],['reviewed','Reviewed'],['dismissed','Dismissed']],'Any status','status')+'</select></label>':'')+'</div>';
 if(st.esub==='calendar'){
  const evs=read('events',{filters:{occurred_month:st.month,...eventFilters()},sort:{field:'occurred_on',dir:'asc'},limit:100});
  const first=st.month+'-01',startDow=(new Date(first+'T00:00:00Z').getUTCDay()+6)%7,days=Math.round((Date.UTC(Number(st.month.slice(0,4)),Number(st.month.slice(5,7)),1)-Date.UTC(Number(st.month.slice(0,4)),Number(st.month.slice(5,7))-1,1))/86400000);
  const byDay={};for(const e of evs.rows){remember('events',e);if(e.data.status==='dismissed')continue;const d=validDate(e.data.occurred_on);if(d)(byDay[d]=byDay[d]||[]).push(e);}
  const cells=[];for(let i=0;i<startDow;i++)cells.push('<div class="rd-day out" aria-hidden="true"></div>');
  for(let d=1;d<=days;d++){const ds=st.month+'-'+String(d).padStart(2,'0'),xs=byDay[ds]||[];cells.push('<div class="rd-day'+(ds===AS_OF?' today':'')+'"><span class="rd-day-num">'+esc(dateLabel(ds))+'</span>'+xs.slice(0,4).map(e=>btn(esc(textOf(e.data.title,60))+(bool(e.data.expected)?' est.':''),'open:event:'+e.id+':'+String(e.data.natural_key||''),'rd-day-ev'+(e.data.impact==='high'?' high':''))).join('')+(xs.length>4?'<span class="rd-muted">+'+(xs.length-4)+' more</span>':'')+'</div>');}
  const nav='<div class="rd-row">'+bS('Previous month','month-prev')+'<strong>'+esc(monthLabel(st.month))+'</strong>'+bS('Next month','month-next')+bS('This month','month-today')+'</div>';
  return tabs+panel('Calendar',(evs.total||0)>100?'Showing the first 100 of '+evs.total+' events this month.':'Dated events; estimates are marked est.',nav+filterRow+'<div style="height:12px"></div><div class="rd-cal" role="grid" aria-label="'+esc(monthLabel(st.month))+'">'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>'<div class="rd-cal-head" role="columnheader">'+d+'</div>').join('')+cells.join('')+'</div>');
 }
 const filters={...eventFilters()};if(st.esub==='new')filters.status='new';else if(st.eflt.status)filters.status=st.eflt.status;
 const page=read('events',{q:st.eq,filters,sort:{field:'occurred_on',dir:'desc'},limit:PAGE_SIZE,offset:st.epage*PAGE_SIZE});
 /* Duplicates (same key) on this page are merged into one row with their sources combined. */
 const merged=[],byKey={};for(const e of page.rows){const k=String(e.data.natural_key||e.id);if(byKey[k]){byKey[k].dups.push(e);continue;}byKey[k]={e,dups:[]};merged.push(byKey[k]);}
 const cols=st.layout.cols.events.filter(id=>colVisible('events',id)),G=templateLayoutSchema.groups.events;
 const head=cols.map(id=>th((G.find(x=>x.id===id)||{label:id}).label)).concat(['<th scope="col" class="rd-actions">Actions</th>']);
 const rows=merged.map(({e,dups})=>{remember('events',e);const d=e.data,srcs=[d.sources].concat(dups.map(x=>x.data.sources));const c={date:dateCell(validDate(d.occurred_on),bool(d.expected)),kind:esc(KIND_LABEL[d.kind]||label(d.kind)),item:esc(textOf(String(d.natural_key||'').split('|')[0],60)||'—'),title:bL(esc(d.title||'Event'),'open:event:'+e.id+':'+String(e.data.natural_key||''))+(d.so_what?'<span class="rd-sub">'+esc(textOf(d.so_what,160))+'</span>':'')+(dups.length?'<span class="rd-dup">Merged with '+plural(dups.length,'duplicate')+'</span>':''),impact:impactPill(d.impact),direction:esc(cap(d.direction)),status:pill(cap(d.status||'new'),d.status==='new'?'amber':d.status==='reviewed'?'green':''),source:srcs.map(srcLinks).join(', ')};
  return '<tr>'+cols.map(id=>'<td>'+(c[id]||'')+'</td>').join('')+'<td class="rd-actions">'+(d.status==='new'?bS('Reviewed','review-event:'+e.id,!canWrite('events')):'')+bS('Open','open:event:'+e.id+':'+String(e.data.natural_key||''))+'</td></tr>';});
 const toolbar='<div class="rd-toolbar"><input class="rd-search" type="search" name="eq" aria-label="Search events" placeholder="Search all events" data-ui-state="true" data-action="eq" value="'+esc(st.eq)+'">'+(st.esub==='new'?bP('Mark page reviewed','review-page',!canWrite('events')||!page.rows.length):'')+'</div>';
 return tabs+panel(st.esub==='new'?'New events to review':'Event feed',(page.total===null?'Partial data':plural(page.total,'event'))+'. Search, filters and sort apply to all events; duplicates on a page are merged.',toolbar+filterRow+'<div style="height:14px"></div>'+tbl('Events',head,rows,st.esub==='new'?'Nothing new to review.':'No events yet.')+pager(page.total,st.epage,PAGE_SIZE,'e'));
}

/* 4 Setup */
function setupScreen(){
 const tabs='<div class="rd-seg" role="tablist" aria-label="Setup sections">'+[['scopes','Scopes'],['template','Research template'],['fields',R.trackerLabel+' fields'],['automations','Automations and access']].map(([k,l])=>btn(l,'ssub:'+k,'rd-seg-btn',false,'role="tab" aria-selected="'+(st.ssub===k)+'"')).join('')+'</div>';
 if(st.ssub==='template'){
  const hist=(pj(SET.research_template_history,[])||[]).filter(x=>x&&x.version).slice().reverse();
  const locked=R.requiredRules.map(r=>'<div class="rd-lock">'+icon('lock',15)+'<span>'+esc(r)+'</span></div>').join('');
  const formHtml='<form data-action="save-template">'+field('tpl','instruction','Instruction',TPL.instruction,{type:'textarea',wide:true,required:true})+'<h3 class="rd-h3">Required rules (always included, cannot be removed)</h3>'+locked+field('tpl','rules','Your own rules (one per line)',TPL.rules.join('\n'),{type:'textarea',wide:true,hint:'Added after the required rules.'})+field('tpl','note','What changed (for the version history)','',{})+'<div class="rd-row">'+submit('Save as version '+(TPL.version+1),canWrite('settings'))+bS('Restore default','restore-template',!canWrite('settings')||TPL.isDefault)+'</div></form>';
  const hrows=hist.map(h=>'<tr><td>v'+esc(h.version)+'</td><td>'+esc(dateLabel(validDate(h.saved_on)))+'</td><td>'+esc(textOf(h.note,120))+'</td><td class="rd-actions">'+(Number(h.version)===TPL.version?pill('Current','green'):bS('Restore','restore-version:'+h.version,!canWrite('settings')))+'</td></tr>');
  return tabs+panel('Research template','Version '+TPL.version+(TPL.isDefault?' (default)':'')+'. Each run records the version it used. Claude or ChatGPT can propose edits; you approve them.',reviewNote+formHtml)+panel('Version history','Restoring a version saves it as a new version.',tbl('Template versions',[th('Version'),th('Saved'),th('Note'),'<th scope="col" class="rd-actions">Actions</th>'],hrows,'Only the default so far.'));
 }
 if(st.ssub==='fields'){
  const keys=Object.keys(roleMap.tracker?roleMap.tracker.fields:{}).filter(k=>!BRIEF_SYSTEM_FIELDS.includes(k)||k==='natural_key');
  const rows=keys.map(k=>'<tr><td><code>'+esc(k)+'</code></td><td>'+inputOf('labels','label_'+k,fieldLabel(k),{})+'</td><td>'+inputOf('labels','show_'+k,HIDDEN.has(k)?'hidden':'shown',{type:'select',options:[['shown','Shown'],['hidden','Hidden']]})+'</td><td>'+(CUSTOM_KEYS.includes(k)?pill('Custom','blue'):pill('Standard',''))+'</td></tr>');
  const fmt=briefReturnFormat(keys.map(k=>{const d=R.trackerFields.find(f=>f.key===k);return {key:k,name:fieldLabel(k),kind:d?d.kind:'text',options:d&&d.options,custom:CUSTOM_KEYS.includes(k)};}))[R.roles.tracker];
  return tabs+panel(R.trackerLabel+' fields','Rename or hide a field here (hidden fields stay in the research). Reorder columns with the layout gear. To add a field, ask Claude or ChatGPT (or use Database): it is a reviewed change, and new fields appear here and in the research template\'s return format automatically.','<form data-action="save-labels">'+tbl('Fields',[th('Key'),th('Label'),th('In the table'),th('Type')],rows)+'<div class="rd-row">'+submit('Save labels',canWrite('settings'))+btn(icon('gear',16)+' Layout','tracker:layout','rd-btn small',!inp.saved)+'</div></form>')+panel('Return format the research uses','Built from the current fields, including custom ones.','<pre class="rd-pre">'+esc(JSON.stringify(fmt,null,1))+'</pre>');
 }
 if(st.ssub==='automations'){
  const preview=composeBrief({settings:SET,scopes:SC.rows,runs:RUNS.rows,fields:Object.keys(roleMap.tracker?roleMap.tracker.fields:{}).map(k=>{const d=R.trackerFields.find(f=>f.key===k);return {key:k,name:fieldLabel(k),kind:d?d.kind:'text',options:d&&d.options,custom:CUSTOM_KEYS.includes(k)};}),today:AS_OF,existing:{trackerKeys:[],trackerComplete:false}});
  return tabs+panel('Automations','Created from the install dialog in TrialAgents Automations, linked to this app. The app never schedules or sends anything itself.','<ul class="rd-list"><li><span><strong>'+esc(P)+' scan + digest</strong><span class="rd-sub">'+esc(cap(R.cadence))+' at 07:00, Claude or ChatGPT research that updates the '+esc(R.trackerLabel.toLowerCase())+' and events, then a digest email to workspace members (only when something changed).</span></span></li><li><span><strong>'+esc(P)+' high-impact alert</strong><span class="rd-sub">After the scan; one email per run, only for high-impact events on watched '+esc(R.itemsLabel)+'.</span></span></li><li><span>Schedule, recipients, email text, pause or set up again.</span><a href="https://platform.trialagents.com/automations">Open Automations</a></li><li><span>Who can view or edit '+esc(P)+', and what Claude and ChatGPT may read or write.</span><a href="https://platform.trialagents.com/access">Open Access</a></li></ul>')+
   panel('Build now or refresh now','On request in chat, outside the schedule.','<p>Ask Claude or ChatGPT: <strong>"Build '+esc(P)+' now"</strong> (first run for a new scope) or <strong>"Refresh '+esc(P)+' now"</strong>. It reads the same brief as the scan and writes the same rows.</p><pre class="rd-pre">'+esc(JSON.stringify({research_template:preview.research_template,active_scopes:preview.active_scopes.map(s=>({name:s.name,since:s.since,run_kind:s.run_kind,sources:s.sources.named.map(x=>x.name)}))},null,1).slice(0,4000))+'</pre>');
 }
 const rows=SCOPES.map(s=>{const def=pj(s.data.definition,{})||{},srcs=briefSources(s.data).named;const lastOn=briefLastRuns(RUNS.rows)[s.id];return '<tr><td>'+bL(esc(s.data.name||'Scope'),'open:scope:'+s.id)+'<span class="rd-sub">'+esc(R.scopeFields.map(f=>def[f.key]).filter(Boolean).join(' · ').slice(0,160))+'</span></td><td>'+esc(srcs.map(x=>x.name).join(', '))+'</td><td>'+esc(lastOn?dateLabel(lastOn):'Not yet')+'</td><td>'+pill(cap(s.data.status||'active'),s.data.status==='paused'?'':'green')+'</td><td class="rd-actions">'+bS(s.data.status==='paused'?'Activate':'Pause','scope-status:'+s.id+':'+(s.data.status==='paused'?'active':'paused'),!canWrite('scopes'))+'</td></tr>';});
 return tabs+panel('Scopes','One or more per radar (for example one per program). Each has its definition, named sources in priority order and a watchlist. The web is always the default route.',tbl('Scopes',[th('Scope'),th('Named sources'),th('Last run'),th('Status'),'<th scope="col" class="rd-actions">Actions</th>'],rows,'No scope yet. Add one to start.'),bP('Add scope','new:scope',!canWrite('scopes')));
}

/* Panels */
function scopePanel(){
 const p=st.panel,row=p.id?SCOPE[p.id]:null,d=row?row.data:{},def=pj(d.definition,{})||{},srcs=row?briefSources(d).named:R.sources.map(s=>({...s}));
 const srcRows=[];for(let i=0;i<Math.max(srcs.length+1,R.sources.length);i++){const s=srcs[i]||{};srcRows.push('<div class="rd-source-row">'+field('scope','src_name_'+i,'Source '+(i+1),s.name||'',{})+field('scope','src_covers_'+i,'Covers',s.covers||'',{})+field('scope','src_priority_'+i,'Priority',s.priority||i+1,{type:'number'})+field('scope','src_notes_'+i,'Notes',s.notes||'',{})+'</div>');}
 const body=reviewNote+field('scope','name','Name',d.name||'',{required:true,wide:true})+(PROGRAMS.length?field('scope','program_id','Program',d.program_id||'',{type:'select',blank:'No program',options:PROGRAMS.map(x=>[x.id,String(x.data.name||'Program')])}):'')+R.scopeFields.map(f=>field('scope','def_'+f.key,f.name,def[f.key]||'',{required:f.required,placeholder:f.placeholder,type:f.multiline?'textarea':undefined,wide:!!f.multiline})).join('')+
  '<h3 class="rd-h3">Named sources (priority order)</h3><p class="rd-muted">Prefilled with the standard sources. The assistant reaches each one however it can (a connector if available, otherwise the web) and reports any it cannot reach.</p>'+srcRows.join('')+field('scope','watchlist','Watchlist (one per line)',(pj(d.watchlist,[])||[]).join('\n'),{type:'textarea'})+field('scope','include_notes','Include',d.include_notes||'',{type:'textarea'})+field('scope','exclude_notes','Exclude',d.exclude_notes||'',{type:'textarea'})+field('scope','status','Status',d.status||'active',{type:'select',options:[['active','Active'],['paused','Paused']]});
 return drawer(row?'Edit scope':'New scope',P+' / Scope',body,btn('Cancel','close')+submit('Save scope',canWrite('scopes')),'save-scope');
}
function itemPanel(){
 const p=st.panel,row=findRow('tracker',p.id);if(!row){st.panel=null;return '';}
 const d=row.data,ch=changedSet(row),evs=read('events',{filters:{item_id:row.id},sort:{field:'occurred_on',dir:'desc'},limit:10});
 const flds=R.trackerFields.map(f=>f.key).concat(CUSTOM_KEYS);
 if(p.mode==='edit'){const body=reviewNote+flds.filter(k=>roleMap.tracker.writable.includes(k)).map(k=>{const f=R.trackerFields.find(x=>x.key===k)||{key:k,kind:'text'};return field('item',k,fieldLabel(k),f.kind==='boolean'?(bool(d[k])?'true':''):d[k]===null||d[k]===undefined?'':d[k],f.kind==='select'?{type:'select',blank:'Not set',options:f.options.map(o=>[o,cap(o)])}:f.kind==='boolean'?{type:'select',blank:'No',options:[['true','Yes']]}:{type:f.kind==='number'?'number':f.kind==='date'?'date':'text'});}).join('')+field('item','sources','Sources (one per line: title and URL)',sourcesOf(d.sources).map(s=>(s.title||'')+(s.url?' '+s.url:'')).join('\n'),{type:'textarea',required:true})+field('item','user_notes','Notes',d.user_notes||'',{type:'textarea'});
  return drawer('Edit '+(d.natural_key||R.itemLabel),P+' / '+R.trackerLabel,body,btn('Cancel','close')+submit('Save changes',canWrite('tracker')),'save-item');}
 const facts=flds.filter(k=>k!=='sponsor_id'||d.sponsor_id).map(k=>{const f=R.trackerFields.find(x=>x.key===k)||{kind:'text'};const v=f.kind==='date'?dateCell(validDate(d[k]),R.dateField&&k===R.dateField.key&&estimated(row)):esc(f.kind==='boolean'?(bool(d[k])?'Yes':'No'):f.kind==='select'?cap(d[k]):textOf(d[k],400)||'—');return '<div class="rd-kv'+(ch.has(k)?' rd-changed':'')+'"><span>'+esc(fieldLabel(k))+(ch.has(k)?' (changed)':'')+'</span><strong>'+v+'</strong></div>';}).join('');
 const hist=evs.rows.map(e=>'<li><span>'+esc(e.data.title||'Event')+'<span class="rd-sub">'+esc(KIND_LABEL[e.data.kind]||'')+' · '+srcLinks(e.data.sources)+'</span></span><span>'+dateCell(validDate(e.data.occurred_on),bool(e.data.expected))+'</span></li>');
 const body=(ch.size?'<div class="rd-hint">'+(ch.has('new')?'Added':'Changed')+' by the run of '+esc(textOf(d.last_changed_run_id,12))+'… Highlighted until you mark it seen.</div>':'')+kv('Key',d.natural_key)+kv('Scope',scopeName(d.scope_id))+facts+kv('Sources',srcLinks(d.sources),true)+kv('Last verified',dateLabel(validDate(d.last_verified_on)))+(d.user_notes?kv('Notes',d.user_notes):'')+'<h3 class="rd-h3">History</h3>'+ul(hist,'No events for this '+R.itemLabel+' yet.')+'<p class="rd-muted">Every field change is also in the record history in Database.</p>';
 const foot=(ch.size?bS('Mark seen','seen:'+row.id,!canWrite('tracker')):'')+bS(bool(d.watched)?'Unwatch':'Watch',(bool(d.watched)?'unwatch:':'watch:')+row.id,!canWrite('tracker'))+bS('Edit','edit:item',!canWrite('tracker'))+bS(bool(d.dismissed)?'Restore':'Dismiss',(bool(d.dismissed)?'restore-item:':'dismiss-item:')+row.id,!canWrite('tracker'))+btn('Close','close');
 return drawer(String(itemTitle(d)||R.itemLabel),P+' / '+R.trackerLabel,'<div class="rd-row">'+foot+'</div>'+body,null);
}
function eventPanel(){
 const p=st.panel,row=findRow('events',p.id);if(!row){st.panel=null;return '';}const d=row.data;
 if(p.mode==='dismiss')return drawer('Dismiss event',P+' / Events','<p>'+esc(d.title)+'</p>'+field('event','dismiss_reason','Reason',d.dismiss_reason||'',{type:'textarea',required:true}),btn('Cancel','close')+submit('Dismiss',canWrite('events')),'dismiss-event');
 const body=kv('Kind',KIND_LABEL[d.kind]||label(d.kind))+kv('Date',dateCell(validDate(d.occurred_on),bool(d.expected))+(d.expected_window?' · '+esc(d.expected_window):''),true)+kv('Impact',impactPill(d.impact),true)+kv('Direction',cap(d.direction))+kv('Scope',scopeName(d.scope_id))+(d.summary?'<p>'+esc(d.summary)+'</p>':'')+(d.so_what?'<div class="rd-banner"><strong>So what:</strong> '+esc(d.so_what)+'</div>':'')+kv('Sources',srcLinks(d.sources),true)+kv('Status',cap(d.status||'new'))+(d.dismiss_reason?kv('Dismiss reason',d.dismiss_reason):'')+(d.item_id&&String(d.natural_key||'').includes('|')?'<p>'+bL('Open the '+esc(R.itemLabel),'open:item:'+d.item_id+':'+String(d.natural_key).split('|')[0])+'</p>':'');
 return drawer(String(d.title||'Event'),P+' / Events','<div class="rd-row">'+(d.status==='new'?bS('Mark reviewed','review-event:'+row.id,!canWrite('events')):'')+(d.status!=='dismissed'?bS('Dismiss…','dismiss-form:'+row.id,!canWrite('events')):'')+btn('Close','close','rd-btn small')+'</div>'+body,null);
}
function newItemPanel(){
 const body=reviewNote+field('newitem','natural_key',cap(R.naturalKey.label),'',{required:true,hint:R.naturalKey.rule})+field('newitem','title','Title','',{required:true})+field('newitem','scope_id','Scope','',{type:'select',blank:'Choose…',options:scopeOpts(),required:true})+field('newitem','sources','Sources (one per line: title and URL)','',{type:'textarea',required:true,hint:'At least one source. Unsourced rows cannot be saved.'});
 return drawer('Add '+R.itemLabel,P+' / '+R.trackerLabel,body,btn('Cancel','close')+submit('Add '+R.itemLabel,canWrite('tracker')),'add-item');
}

/* Render */
let main='',overlay='';
try{main=current.id==='tracker'?trackerScreen():current.id==='events'?eventsScreen():current.id==='setup'?setupScreen():overview();}catch(e){main='<div class="rd-banner bad" role="alert">This screen could not be shown: '+esc(String(e&&e.message||e).slice(0,300))+'</div>';}
try{if(st.panel){overlay=st.panel.type==='scope'?scopePanel():st.panel.type==='item'?itemPanel():st.panel.type==='event'?eventPanel():st.panel.type==='newitem'?newItemPanel():'';}}catch(e){note(String(e&&e.message||e));st.panel=null;overlay='';}
const partial=exact()?'':'<div class="rd-banner bad" role="alert"><strong>Partial data.</strong> '+problems.slice(0,4).map(esc).join(' ')+'</div>';
const unbound=['settings','scopes','tracker','events','runs'].filter(r=>!roleMap[r]);
const setupNote=unbound.length?'<div class="rd-banner warn">Not connected: '+esc(unbound.map(r=>ROLE_LABEL[r]).join(', '))+'. Install the app from the catalog so its tables are created.</div>':'';
const notice=st.notice?'<div class="rd-banner rd-notice'+(failed?' bad':'')+'" role="status"><span>'+esc(st.notice)+'</span>'+btn('Dismiss','clear-notice','rd-btn small')+'</div>':'';
const rail='<aside class="rd-rail"><div class="rd-brand"><strong>'+esc(P)+'</strong><span>Bio Radars</span></div><nav class="rd-nav" aria-label="'+esc(P)+' screens">'+sections.map(s=>btn('<span class="rd-ico">'+icon(s.id)+'</span><span class="rd-nav-label">'+esc(s.label)+'</span>','nav:'+s.id,'',false,'aria-current="'+(st.section===s.id?'page':'false')+'" aria-label="'+esc(s.label)+'"')).join('')+'</nav><div class="rd-rail-foot">'+esc(cfg.demoLabel?'Fictional demo data':'Authorized records only')+'<br>Every change you make is reviewed.</div></aside>';
const html='<div class="rd-shell"'+(overlay?' inert':'')+'>'+rail+'<main class="rd-main">'+heading()+setupNote+partial+notice+main+'<p class="rd-foot rd-muted">'+(cfg.demoLabel?'Fictional records for demonstration only. ':'')+(R.disclaimer?'<strong>'+esc(R.disclaimer)+'</strong> ':'')+'Sources are named, not connected: Claude or ChatGPT reaches them and reports any it cannot reach. No legal, investment or medical advice.'+'</p></main></div>'+overlay;
if(st.panel&&st.panel.id&&prevKeys[st.panel.id]&&!nextKeys[st.panel.id])nextKeys[st.panel.id]=prevKeys[st.panel.id];st.keys=nextKeys;
return {html,css:RADAR_CSS,state:st};
