/* TrialAgents Bio Radars kit 2.0.0 (BIO_RADAR.md §2) | frontend-js function body, v2 app contract. No DOM, network or browser storage.
 * The generator writes 'use trialagents v2' on line 1, then the app styles (RADAR_CSS), `const RADAR=…` (radar.json at run time),
 * brief-core.js and this file. The runtime puts the platform kit (`kit`) and styles in front. The app draws no header, banner or footer:
 * the platform header shows the name and status, messages are returned as output.notice and automations, access and logs stay on
 * their platform pages. Each screen makes one batched read (records.readMany); filters, search, sort and paging work on what is loaded.
 * Every change is one records.save (≤ 50 changes) from a person's click, edit or form, with the record version shown when the edit
 * started; it saves directly and the person's last change can be undone. Research writes come from the platform automation. */

const cfg=typeof templateConfiguration==='object'&&templateConfiguration?templateConfiguration:{};
const bindings=Array.isArray(templateBindings)?templateBindings:[];
const inp=input||{};
const event=inp.event||{kind:'open',action:'',value:null,form:{}};
const action=String(event.action||'');
const form=event.form&&typeof event.form==='object'?event.form:{};
const kind=event.kind;
const isClick=kind==='click',isSubmit=kind==='submit',isChange=kind==='change';

const esc=kit.esc;
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
const plural=(n,w,many)=>n+' '+(Math.abs(n)===1?w:(many||w+'s'));
const AS_OF=validDate(cfg.asOfOverride)||new Date().toISOString().slice(0,10);
const PAGE_SIZE=Math.min(50,Math.max(10,num(cfg.pageSize,25)));
const R=RADAR,P=R.name;
const OWNER=inp.appRole==='owner';

/* Roles: logical key → role key → installed table. Custom tracker fields are bound fields the definition does not know. */
const ROLE_KEY={settings:R.roles.settings,scopes:R.roles.scopes,tracker:R.roles.tracker,events:R.roles.events,runs:R.roles.runs,organizations:'organizations',programs:'programs'};
const ROLE_LABEL={settings:'settings',scopes:'scopes',tracker:R.trackerLabel.toLowerCase(),events:'events',runs:'runs',organizations:'organizations',programs:'programs'};
let mapping={};try{mapping=JSON.parse(cfg.tableMap||'{}');}catch(e){mapping={};}
const roleMap={};
for(const role of Object.keys(ROLE_KEY)){
 const m=mapping[ROLE_KEY[role]],b=m&&bindings.find(x=>x.typeId===m.typeId);if(!m||!b)continue;
 const fields={};for(const [k,v] of Object.entries(m.fields||{}))if(typeof v==='string'&&(b.fields||[]).includes(v))fields[k]=v;
 if(role==='tracker')for(const real of b.fields||[])if(!Object.values(fields).includes(real)&&/^[a-z][a-z0-9_]{0,63}$/.test(real))fields[real]=real;
 roleMap[role]={typeId:m.typeId,fields,writable:role==='programs'?[]:(Array.isArray(m.writableFields)?m.writableFields:[]).filter(x=>fields[x]).concat(role==='tracker'?Object.keys(fields).filter(k=>!has(m.fields||{},k)):[])};
}
const KNOWN_TRACKER=new Set(R.trackerFields.map(f=>f.key).concat(BRIEF_SYSTEM_FIELDS));
const CUSTOM_KEYS=roleMap.tracker?Object.keys(roleMap.tracker.fields).filter(k=>!KNOWN_TRACKER.has(k)):[];
const canEdit=!!inp.saved&&!!inp.writable&&cfg.readOnly!==true&&inp.appRole!=='viewer';
const canWrite=role=>canEdit&&!!roleMap[role]&&roleMap[role].writable.length>0;

/* State. The working context (G4) is the chosen scope, kept per person by the platform (input.context / output.context). */
const st=JSON.parse(JSON.stringify(inp.state||{}));
const SCREENS=['overview','tracker','events','scopes'].concat(OWNER?['settings']:[]);
st.screen=SCREENS.includes(st.screen)?st.screen:'overview';
st.esub=['review','all','calendar'].includes(st.esub)?st.esub:'review';
st.q=String(st.q||'');st.eq=String(st.eq||'');st.flt=st.flt&&typeof st.flt==='object'?st.flt:{};st.eflt=st.eflt&&typeof st.eflt==='object'?st.eflt:{};
st.sort=st.sort&&typeof st.sort==='object'&&st.sort.field?st.sort:{field:'last_verified_on',dir:'desc'};
st.offset=Math.max(0,Number(st.offset)||0);st.eoffset=Math.max(0,Number(st.eoffset)||0);
st.month=/^\d{4}-\d{2}$/.test(String(st.month||''))?st.month:AS_OF.slice(0,7);
st.panel=st.panel&&typeof st.panel==='object'?st.panel:null;
let scopeCtx=inp.context&&typeof inp.context==='object'&&typeof inp.context.scope==='string'?inp.context.scope:'';
let notice=null;
const say=(k,m)=>{notice=kit.notice(k,String(m).slice(0,280));};

/* Reads: one batched call per screen (records.readMany, up to 12 reads). In the browser a read on its way is pending: shown as
 * loading, never as empty or zero, and the screen is made again when it arrives. */
let callsLeft=90;const problems=[];
function query(m,o){
 const filters={};for(const [k,v] of Object.entries(o.filters||{}))if(m.fields[k]&&v!==''&&v!==null&&v!==undefined)filters[m.fields[k]]=String(v);
 const q={typeId:m.typeId,limit:o.limit===undefined?100:o.limit,offset:o.offset||0,filters};
 if(o.sort&&m.fields[o.sort.field])q.sort={field:m.fields[o.sort.field],direction:o.sort.dir==='asc'?'asc':'desc'};
 return q;
}
function shape(role,m,p){
 if(p&&p.pending)return {rows:[],total:null,pending:true};
 if(!p||p.unavailable){problems.push(role);return {rows:[],total:null,unavailable:true};}
 const rows=(Array.isArray(p.rows)?p.rows:[]).map(r=>{const data={};for(const [k,real] of Object.entries(m.fields))if(has(r.data,real)){const v=r.data[real];data[k]=v!==null&&typeof v==='object'?JSON.stringify(v):v;}return {id:String(r.id),version:r.version,data};});
 return {rows,total:p.total===null||p.total===undefined?null:Number(p.total)};
}
/** Reads specs [[role, options], …] together and returns their results in order. */
function readAll(specs){
 const out=specs.map(()=>null),items=[];
 specs.forEach(([role,o],i)=>{const m=roleMap[role];if(!m){out[i]={rows:[],total:0,unbound:true};return;}items.push({i,role,m,q:query(m,o||{})});});
 for(let start=0;start<items.length;start+=12){
  const part=items.slice(start,start+12);let results=null;
  if(part.length>1&&callsLeft>=part.length){try{const r=tools.call('records.readMany',{reads:part.map(x=>x.q)});if(r&&Array.isArray(r.results)&&r.results.length===part.length)results=r.results;else if(r&&r.pending)results=part.map(()=>({pending:true}));}catch(e){results=null;}}
  if(results){callsLeft-=part.length;part.forEach((x,j)=>{out[x.i]=shape(x.role,x.m,results[j]);});continue;}
  for(const x of part){if(callsLeft<=0){problems.push(x.role);out[x.i]={rows:[],total:null,unavailable:true};continue;}callsLeft--;
   try{out[x.i]=shape(x.role,x.m,tools.call('records.read',x.q));}catch(e){problems.push(x.role);out[x.i]={rows:[],total:null,unavailable:true};}}
 }
 return out;
}

/* Writes: records.save from a person's own click, edit or form. */
function toReal(role,data){const m=roleMap[role];if(!m)throw Error('The '+ROLE_LABEL[role]+' table is not connected.');const out={};for(const [k,v] of Object.entries(data)){if(v===undefined||!m.fields[k])continue;if(!m.writable.includes(k))throw Error('You cannot change '+k.replace(/_/g,' ')+' here.');out[m.fields[k]]=v;}return out;}
const verOf=v=>{const n=Number(v);if(!Number.isInteger(n)||n<0)throw Error('Open it again and retry.');return n;};
const crt=(role,data)=>{if(!canWrite(role))throw Error('You cannot add '+ROLE_LABEL[role]+' here.');return {kind:'create_record',typeId:roleMap[role].typeId,data:toReal(role,data)};};
const upd=(role,id,version,data)=>{if(!canWrite(role))throw Error('You cannot change '+ROLE_LABEL[role]+' here.');if(!id)throw Error('That record is no longer available.');return {kind:'update_record',recordId:String(id),expectedVersion:verOf(version),data:toReal(role,data)};};
const arch=(role,id,version)=>{if(!canWrite(role))throw Error('You cannot remove '+ROLE_LABEL[role]+' here.');return {kind:'archive_record',recordId:String(id),expectedVersion:verOf(version)};};
function save(changes,message){changes=changes.filter(Boolean);if(!changes.length)throw Error('There is nothing to save.');if(changes.length>50)throw Error('That is '+changes.length+' changes; save at most 50 at a time.');
 tools.call('records.save',{changes});st.undoAsk=true;st.undo=null;say('success',message||'Saved');}
const requireSources=list=>{if(!list.some(s=>s.url||s.title))throw Error('Add at least one source (title or URL).');return JSON.stringify(list.slice(0,20));};
const sourcesFromForm=v=>lines(v).map(l=>{const url=(l.match(/https?:\/\/\S+/)||[''])[0];return {title:textOf(l.replace(url,'').replace(/[·|-]\s*$/,'').trim()||url,160),url:httpUrl(url),date:AS_OF};});
const sourcesOf=v=>{const xs=pj(v,[]);return (Array.isArray(xs)?xs:[]).filter(s=>s&&(s.url||s.title)).map(s=>({title:textOf(s.title||s.url,160),url:httpUrl(s.url),date:validDate(s.date)}));};
const NAME_FIELD=R.itemNameField&&R.trackerFields.some(f=>f.key===R.itemNameField)?R.itemNameField:R.trackerFields.some(f=>f.key==='title')?'title':'';
const itemTitle=d=>String((R.itemNameField&&d[R.itemNameField])||d.title||d.name||d.natural_key||R.itemLabel);
const KINDS={watched:'boolean'};for(const f of R.trackerFields)KINDS[f.key]=f.kind;for(const k of CUSTOM_KEYS)KINDS[k]='text';
const fieldValue=(f,v)=>f.kind==='number'?num(v):f.kind==='boolean'?bool(v):f.kind==='date'?(validDate(v)||null):f.kind==='select'?((f.options||[]).includes(v)?v:null):(textOf(v,2000)||null);

/* 1. Screen and view choices: no data needed, nothing is saved. */
const parts=action.split(':');
let failed=false;
try{
 if(action.startsWith('nav:')&&SCREENS.includes(action.slice(4))){st.screen=action.slice(4);st.panel=null;}
 else if(action.startsWith('esub:')){st.esub=action.slice(5);st.eoffset=0;st.panel=null;}
 else if(action==='context'&&isChange){scopeCtx=String(event.value||'');st.offset=0;st.eoffset=0;}
 else if(action==='panel:close'){st.panel=null;}
 else if(action==='q'&&isChange){st.q=textOf(event.value,200);st.offset=0;}
 else if(action==='eq'&&isChange){st.eq=textOf(event.value,200);st.eoffset=0;}
 else if(action.startsWith('flt:')&&isChange){st.flt[action.slice(4)]=String(event.value||'');st.offset=0;}
 else if(action.startsWith('eflt:')&&isChange){st.eflt[action.slice(5)]=String(event.value||'');st.eoffset=0;}
 else if(action==='sort'&&isChange){const [f,d]=String(event.value||'').split(':');if(f)st.sort={field:f,dir:d==='asc'?'asc':'desc'};st.offset=0;}
 else if(action.startsWith('page:'))st.offset=Math.max(0,Number(action.slice(5))||0);
 else if(action.startsWith('epage:'))st.eoffset=Math.max(0,Number(action.slice(6))||0);
 else if(action==='month-prev'){st.month=monthAdd(st.month,-1);}else if(action==='month-next'){st.month=monthAdd(st.month,1);}else if(action==='month-today'){st.month=AS_OF.slice(0,7);}
 else if(action.startsWith('open:')){const [,type,id,...key]=parts;st.panel={type,id,key:key.join(':'),version:null,mode:''};}
 else if(action==='new:scope'){st.panel={type:'scope',id:null,version:null,mode:'edit'};}
 else if(action==='new:item'){st.panel={type:'newitem',id:null};}
 else if(action==='mode:edit'&&st.panel){st.panel.mode='edit';}
 else if(action==='mode:dismiss'&&st.panel){st.panel.mode='dismiss';}
 else if(action==='mode:view'&&st.panel){st.panel.mode='';}
 /* Undo the person's own last change (G8). */
 else if(action.startsWith('undo:')&&isClick){const r=tools.call('undo.run',{undoId:action.slice(5)});st.undo=null;say('success',r&&r.label?'Undone: '+String(r.label).toLowerCase():'Undone');}
 /* 2. Changes that carry their record and version in the control: they save before the screen reads, so it shows the new value. */
 else if(action.startsWith('edit:')&&isChange){const e=kit.edit(event,KINDS);if(!e)throw Error('That value cannot be edited here.');
  const f=R.trackerFields.find(x=>x.key===e.field)||{key:e.field,kind:KINDS[e.field]||'text'};
  if(f.kind==='number'&&e.value!==null&&!Number.isFinite(e.value))throw Error('Enter a number for '+(f.name||e.field)+'.');
  if(f.kind==='date'&&e.value!==null&&!validDate(e.value))throw Error('Enter a date for '+(f.name||e.field)+'.');
  save([upd('tracker',e.recordId,e.version,{[e.field]:f.kind==='text'?(textOf(e.value,2000)||null):e.value})],e.field==='watched'?(e.value?'Watching':'No longer watched'):'Saved');}
 else if((action.startsWith('watch:')||action.startsWith('unwatch:'))&&isClick){save([upd('tracker',parts[1],parts[2],{watched:parts[0]==='watch'})],parts[0]==='watch'?'Watching':'No longer watched');}
 else if((action.startsWith('dismiss-item:')||action.startsWith('restore-item:'))&&isClick){const d=parts[0]==='dismiss-item';save([upd('tracker',parts[1],parts[2],{dismissed:d})],d?'Dismissed. Research will not add it again.':'Restored');st.panel=null;}
 else if(action.startsWith('review:')&&isClick){save([upd('events',parts[1],parts[2],{status:'reviewed'})],'Marked reviewed');if(st.panel&&st.panel.id===parts[1])st.panel=null;}
 else if(action.startsWith('scope-status:')&&isChange){const to=event.value==='paused'?'paused':'active';save([upd('scopes',parts[1],parts[2],{status:to})],to==='paused'?'Scope paused':'Scope active');}
 else if(action==='dismiss-event'&&isSubmit){const p=st.panel,reason=textOf(form.dismiss_reason,300);if(!p||!p.id)throw Error('Open the event again.');if(!reason)throw Error('Give a reason for dismissing this event.');
  save([upd('events',p.id,p.version,{status:'dismissed',dismiss_reason:reason})],'Event dismissed');st.panel=null;}
 else if(action==='save-item'&&isSubmit){const p=st.panel;if(!p||!p.id)throw Error('Open the '+R.itemLabel+' again.');const data={};
  for(const f of R.trackerFields.concat(CUSTOM_KEYS.map(k=>({key:k,kind:'text'}))))if(has(form,f.key)&&roleMap.tracker.writable.includes(f.key)){const v=fieldValue(f,form[f.key]);if(f.kind==='number'&&form[f.key]!==''&&v===null)throw Error('Enter a number for '+(f.name||f.key)+'.');data[f.key]=v;}
  for(const f of R.trackerFields.filter(f=>f.kind==='boolean'))if(roleMap.tracker.writable.includes(f.key)&&!has(form,f.key)&&has(form,'__booleans'))data[f.key]=false;
  if(has(form,'user_notes'))data.user_notes=textOf(form.user_notes,4000)||null;
  if(has(form,'sources'))data.sources=requireSources(sourcesFromForm(form.sources));
  save([upd('tracker',p.id,p.version,data)],'Saved');p.mode='';p.version=null;}
 else if(action==='save-scope'&&isSubmit){const p=st.panel,name=textOf(form.name,120);if(!name)throw Error('Name the scope.');
  const def={};for(const f of R.scopeFields){const v=textOf(form['def_'+f.key],f.multiline?6000:500);if(f.required&&!v)throw Error('Enter '+f.name.toLowerCase()+'.');if(v)def[f.key]=v;}
  const srcs=[];for(let i=0;i<12;i++){const n=textOf(form['src_name_'+i],120);if(!n)continue;srcs.push({name:n,covers:textOf(form['src_covers_'+i],300),priority:num(form['src_priority_'+i],i+1),notes:textOf(form['src_notes_'+i],400)});}
  if(!srcs.length)throw Error('Keep at least one named source. The web is always the default route.');
  const data={name,program_id:textOf(form.program_id,64)||null,definition:JSON.stringify(def),sources:JSON.stringify(srcs.sort((a,b)=>a.priority-b.priority)),watchlist:JSON.stringify(lines(form.watchlist).slice(0,100)),include_notes:textOf(form.include_notes,1000)||null,exclude_notes:textOf(form.exclude_notes,1000)||null,status:form.status==='paused'?'paused':'active'};
  if(!roleMap.programs)delete data.program_id;
  if(p&&p.id)save([upd('scopes',p.id,p.version,data)],'Scope saved');else save([crt('scopes',data)],'Scope added. The next scan uses it.');st.panel=null;}
 else if(action==='remove-scope'&&isClick){const p=st.panel;if(!p||!p.id)throw Error('Open the scope again.');save([arch('scopes',p.id,p.version)],'Scope removed');st.panel=null;}
}catch(e){failed=true;say('error',String(e&&e.message||e));}

/* After a save the platform renders the screen again from the saved data: offer Undo of that change there (server only). */
if(st.undoAsk&&kind==='open'){st.undoAsk=false;try{const l=tools.call('undo.list',{}),a=l&&Array.isArray(l.actions)?l.actions[0]:null;st.undo=a&&a.undoId?{undoId:String(a.undoId),label:String(a.label||'last change')}:null;}catch(e){st.undo=null;}}

/* 3. The screen's reads (and the open panel's), in one call. */
const runsQ=['runs',{limit:30,sort:{field:'run_on',dir:'desc'}}];
const specs=[['scopes',{limit:100}]],at={};
const want=(name,spec)=>{at[name]=specs.length;specs.push(spec);};
const scr=st.screen,pn=st.panel;
const ctxF=()=>scopeCtx?{scope_id:scopeCtx}:{};
if(scr==='overview'){want('runs',runsQ);want('high',['events',{filters:{impact:'high',status:'new',...ctxF()},sort:{field:'occurred_on',dir:'desc'},limit:5}]);want('items',['tracker',{filters:ctxF(),limit:0}]);want('watched',['tracker',{filters:{watched:'true',...ctxF()},limit:0}]);
 want('newEv',['events',{filters:{status:'new',...ctxF()},limit:0}]);want('latest',['events',{filters:ctxF(),sort:{field:'occurred_on',dir:'desc'},limit:100}]);}
else if(scr==='tracker'){want('settings',['settings',{limit:5}]);want('page0',['tracker',{sort:{field:'last_verified_on',dir:'desc'},limit:100}]);}
else if(scr==='events'){if(st.esub==='calendar')want('month',['events',{filters:{occurred_month:st.month},sort:{field:'occurred_on',dir:'asc'},limit:100}]);else want('page0',['events',{filters:st.esub==='review'?{status:'new'}:{},sort:{field:'occurred_on',dir:'desc'},limit:100}]);}
else if(scr==='scopes'){want('runs',runsQ);if(roleMap.programs)want('programs',['programs',{limit:100}]);}
else if(scr==='settings'){want('settings',['settings',{limit:5}]);}
if(pn&&pn.type==='item'&&pn.key){want('panelRow',['tracker',{filters:{natural_key:pn.key},limit:20}]);want('panelEvents',['events',{filters:{item_id:pn.id},sort:{field:'occurred_on',dir:'desc'},limit:10}]);}
if(pn&&pn.type==='event'&&pn.key)want('panelRow',['events',{filters:{natural_key:pn.key},limit:20}]);
if(pn&&pn.type==='scope'&&roleMap.programs&&at.programs===undefined)want('programs',['programs',{limit:100}]);
const got=readAll(specs),G=name=>at[name]===undefined?null:got[at[name]];
const SC=got[0],SCOPES=SC.rows.filter(s=>s.data.archived!==true),SCOPE={};for(const s of SC.rows)SCOPE[s.id]=s;
if(scopeCtx&&!SC.pending&&!SCOPE[scopeCtx])scopeCtx='';
const scopeName=id=>SCOPE[id]?String(SCOPE[id].data.name||'Scope'):SC.pending?'…':'—';
const sortRuns=rs=>rs.map((r,i)=>({r,i})).sort((a,b)=>String(b.r.data.run_on||'').localeCompare(String(a.r.data.run_on||''))||b.i-a.i).map(x=>x.r);
const RUNS=G('runs');if(RUNS)RUNS.rows=sortRuns(RUNS.rows);
const LAST_RUN=RUNS&&RUNS.rows[0]||null;
const SETR=G('settings'),SETTINGS=SETR&&SETR.rows[0]||{data:{}},SET=SETTINGS.data;
const LABELS=pj(SET.field_labels,{})||{},HIDDEN=new Set((pj(SET.hidden_fields,[])||[]).map(String));
const fieldLabel=k=>{if(LABELS[k])return String(LABELS[k]).slice(0,60);const d=R.trackerFields.find(f=>f.key===k);return d?d.name:k==='natural_key'?cap(R.naturalKey.label):cap(k);};
const KIND_LABEL=Object.fromEntries(R.eventKinds.map(k=>[k.key,k.label]));
const PROGRAMS=G('programs')?G('programs').rows:[];
/* Overview: the last run's changes (a second read: it needs the run). Tracker and event lists beyond the first 100 rows, up to 500 / 300. */
let runEv=null,runItems=null,more=null;
const runId=LAST_RUN?String(LAST_RUN.data.run_id||''):'';
if(scr==='overview'&&runId){const r=readAll([['events',{filters:{run_id:runId,...ctxF()},sort:{field:'impact',dir:'asc'},limit:6}],['tracker',{filters:{last_changed_run_id:runId,...ctxF()},limit:50}]]);runEv=r[0];runItems=r[1];}
const P0=G('page0');
if(P0&&!P0.pending&&P0.total>100){const cap0=scr==='tracker'?500:300,extra=[];for(let o=100;o<Math.min(P0.total,cap0);o+=100)extra.push([scr==='tracker'?'tracker':'events',{...(scr==='tracker'?{sort:{field:'last_verified_on',dir:'desc'}}:{filters:st.esub==='review'?{status:'new'}:{},sort:{field:'occurred_on',dir:'desc'}}),limit:100,offset:o}]);
 more=readAll(extra);}
const LOADED=P0?{rows:P0.rows.concat(...(more||[]).map(x=>x.rows)),total:P0.total,pending:!!P0.pending||(more||[]).some(x=>x.pending),unavailable:!!P0.unavailable,unbound:!!P0.unbound}:null;
const PANEL_ROW=G('panelRow')?G('panelRow').rows.find(r=>r.id===(pn&&pn.id))||null:null;
if(pn&&pn.id&&PANEL_ROW&&(pn.version===null||pn.version===undefined))pn.version=PANEL_ROW.version;
if(pn&&pn.type==='scope'&&pn.id&&SCOPE[pn.id]&&(pn.version===null||pn.version===undefined))pn.version=SCOPE[pn.id].version;

/* 4. Changes that need the screen's data (pending data: nothing yet; the same action runs again when it arrives). */
const TPL=briefTemplate(SET);
function saveSettings(data,message){save([SETTINGS.id?upd('settings',SETTINGS.id,SETTINGS.version,data):crt('settings',data)],message);}
function saveTemplate(t,why){const hist=(pj(SET.research_template_history,[])||[]).filter(x=>x&&x.version);const v=TPL.version;
 if(!SETTINGS.id||!hist.some(x=>Number(x.version)===v))hist.push({version:v,saved_on:AS_OF,note:TPL.isDefault?'Default':'Before change',template:{instruction:TPL.instruction,rules:TPL.rules}});
 const next=v+1;hist.push({version:next,saved_on:AS_OF,note:why,template:t});
 saveSettings({research_template:JSON.stringify(t),research_template_version:next,research_template_history:JSON.stringify(hist.slice(-20))},'Research template saved as version '+next+'. The next run uses it.');}
const shownEvents=()=>eventRows().slice(0,50);
try{
 if(action==='seen-all'&&isClick&&runItems&&!runItems.pending){const rows=runItems.rows.filter(r=>r.data.seen_run_id!==r.data.last_changed_run_id);if(!rows.length)throw Error('Everything from the last run is already seen.');save(rows.map(r=>upd('tracker',r.id,r.version,{seen_run_id:r.data.last_changed_run_id})),plural(rows.length,R.itemLabel,R.itemsLabel)+' marked seen');}
 else if(action.startsWith('seen:')&&isClick&&PANEL_ROW){if(!PANEL_ROW.data.last_changed_run_id)throw Error('Nothing changed on this '+R.itemLabel+' yet.');save([upd('tracker',PANEL_ROW.id,pn.version,{seen_run_id:PANEL_ROW.data.last_changed_run_id})],'Marked seen');pn.version=null;}
 else if(action==='review-shown'&&isClick&&LOADED&&!LOADED.pending){const rows=shownEvents().filter(e=>e.data.status==='new');if(!rows.length)throw Error('No new events to mark.');save(rows.map(r=>upd('events',r.id,r.version,{status:'reviewed'})),plural(rows.length,'event')+' marked reviewed');}
 else if(action==='add-item'&&isSubmit&&!SC.pending){const key=textOf(form.natural_key,120).replace(/\s+/g,' '),title=textOf(form.title,300);
  if(!key)throw Error('Enter the '+R.naturalKey.label+'.');if(NAME_FIELD&&!title)throw Error('Enter the '+fieldLabel(NAME_FIELD).toLowerCase()+'.');if(!SCOPE[form.scope_id])throw Error('Choose a scope.');
  /* Keys follow each radar's rule (registry IDs upper case, names lower case): any spelling of the same key is a duplicate. */
  const dups=readAll([...new Set([key,key.toLowerCase(),key.toUpperCase()])].map(k=>['tracker',{filters:{natural_key:k},limit:1}])),dup={pending:dups.some(d=>d.pending),total:dups.reduce((n,d)=>n+(d.total||0),0)};
  if(!dup.pending){if(dup.total)throw Error('A '+R.itemLabel+' with '+key+' is already tracked.');
   save([crt('tracker',{natural_key:key,...(NAME_FIELD?{[NAME_FIELD]:title}:{}),scope_id:form.scope_id,sources:requireSources(sourcesFromForm(form.sources)),last_verified_on:AS_OF,changed_fields:'["new"]'})],cap(R.itemLabel)+' '+key+' added');st.panel=null;}}
 else if(action==='save-template'&&isSubmit&&SETR&&!SETR.pending){if(!OWNER)throw Error('Only an owner of this app can change the research template.');const instruction=textOf(form.instruction,6000);if(!instruction)throw Error('The instruction cannot be empty. Use Restore default instead.');
  const rules=lines(form.rules).map(x=>textOf(x,400)).filter(x=>!R.requiredRules.includes(x)).slice(0,30);saveTemplate({instruction,rules},textOf(form.note,200)||'Edited');}
 else if(action==='restore-template'&&isClick&&SETR&&!SETR.pending){if(!OWNER)throw Error('Only an owner of this app can change the research template.');saveTemplate({instruction:R.instruction,rules:[]},'Restored default');}
 else if(action==='settings:save'&&isSubmit&&SETR&&!SETR.pending){if(!OWNER)throw Error('Only an owner of this app can change settings.');const days=num(form.lookback_days);if(form.lookback_days!==''&&(days===null||days<1||days>3650))throw Error('Lookback is a number of days from 1 to 3650.');
  saveSettings({lookback_days:days===null?null:Math.round(days),language:textOf(form.language,60)||null},'Settings saved');}
}catch(e){failed=true;say('error',String(e&&e.message||e));}

/* UI parts (platform kit and a few rd- styles on the --k- tokens). */
const btn=(t,a,o)=>kit.button(t,a,o||{});
const pill=(t,tone)=>'<span class="k-pill'+(tone?' rd-'+tone:'')+'">'+esc(t)+'</span>';
const est='<span class="rd-est">est.</span>';
const impactPill=v=>pill(cap(v||'none'),v==='high'?'high':v==='medium'?'medium':'');
const statusPill=v=>pill(cap(v||'new'),v==='new'?'medium':v==='reviewed'?'ok':'');
const dateCell=(d,isEst)=>d?esc(dateLabel(d))+(isEst?' '+est:''):'—';
const link=(t,a)=>'<button type="button" class="rd-link" data-action="'+esc(a)+'">'+esc(t)+'</button>';
const loading=(what)=>'<p class="k-muted" aria-busy="true">Loading '+esc(what)+'…</p>';
const unavailable=(what)=>'<p class="k-muted">The '+esc(what)+' could not be read. They may be restricted for you; try again later.</p>';
const section=(title,sub,body,right)=>'<section class="k-card rd-section"><div class="rd-head"><div><h2>'+esc(title)+'</h2>'+(sub?'<p class="k-muted k-small">'+sub+'</p>':'')+'</div>'+(right?'<div class="k-row">'+right+'</div>':'')+'</div>'+body+'</section>';
const ul=(items,none)=>items.length?'<ul class="rd-list">'+items.join('')+'</ul>':'<p class="k-muted">'+esc(none)+'</p>';
const kv=(k,v,raw)=>'<div class="rd-kv"><dt>'+esc(k)+'</dt><dd>'+(raw?v:esc(v===null||v===undefined||v===''?'—':v))+'</dd></div>';
const srcLinks=v=>{const xs=sourcesOf(v);return xs.length?xs.slice(0,5).map(s=>s.url?'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title||s.url)+'</a>':esc(s.title)).join(', '):'<span class="k-muted">No source</span>';};
const changedSet=row=>row.data.last_changed_run_id&&row.data.last_changed_run_id!==row.data.seen_run_id?new Set(pj(row.data.changed_fields,[])||[]):new Set();
const estimated=row=>!!R.dateField&&!!R.dateField.estimated&&bool(row.data[R.dateField.estimated]);
const selectHtml=(name,options,value,o)=>{o=o||{};return '<select'+(name?' name="'+esc(name)+'"':'')+(o.action?' data-action="'+esc(o.action)+'"':'')+(o.cls?' class="'+o.cls+'"':'')+(o.label?' aria-label="'+esc(o.label)+'"':'')+(o.disabled?' disabled':'')+'>'+options.map(x=>'<option value="'+esc(x[0])+'"'+(String(value===null||value===undefined?'':value)===String(x[0])?' selected':'')+'>'+esc(x[1])+'</option>').join('')+'</select>';};
const filterSel=(lab,act,options,value)=>'<label class="k-picker"><span>'+esc(lab)+'</span>'+selectHtml('',options,value,{action:act})+'</label>';
const fld=(lab,inner,o)=>'<label class="k-field'+(o&&o.wide?' rd-wide':'')+'"><span>'+esc(lab)+(o&&o.required?' *':'')+'</span>'+inner+(o&&o.hint?'<small class="k-muted">'+esc(o.hint)+'</small>':'')+'</label>';
const inputHtml=(name,value,o)=>{o=o||{};if(o.type==='textarea')return '<textarea name="'+esc(name)+'" rows="'+(o.rows||3)+'"'+(o.placeholder?' placeholder="'+esc(o.placeholder)+'"':'')+'>'+esc(value===null||value===undefined?'':value)+'</textarea>';
 return '<input name="'+esc(name)+'" type="'+(o.type||'text')+'"'+(o.type==='number'?' step="any"':'')+(o.placeholder?' placeholder="'+esc(o.placeholder)+'"':'')+(o.required?' required':'')+' value="'+esc(value===null||value===undefined?'':value)+'">';};
const submit=(t,ok)=>'<button type="submit" class="k-button k-button--primary"'+(ok===false?' disabled':'')+'>'+esc(t)+'</button>';
/** An editable tracker value where it is shown (kit.cell), with option labels for select fields. */
function itemCell(r,key){
 const f=R.trackerFields.find(x=>x.key===key)||{key,kind:key==='watched'?'boolean':'text'},v=r.data[key],lab=fieldLabel(key);
 /* Short values edit in place; text is edited in the side panel, where there is room for it. */
 const editable=canWrite('tracker')&&roleMap.tracker.writable.includes(key)&&key!=='natural_key'&&f.kind!=='text';
 if(!editable){if(f.kind==='date')return dateCell(validDate(v),R.dateField&&key===R.dateField.key&&estimated(r));if(f.kind==='boolean')return v===true?'Yes':'No';if(f.kind==='select')return esc(cap(v));return esc(textOf(v,140)||'—');}
 if(f.kind==='select')return selectHtml('',[['','—']].concat((f.options||[]).map(o=>[o,cap(o)])),v,{action:'edit:'+r.id+':'+key+':'+r.version,cls:'k-cell',label:lab});
 const c=kit.cell({recordId:r.id,version:r.version,field:key,value:f.kind==='date'?validDate(v):f.kind==='text'?textOf(v,2000):v,kind:f.kind==='money'?'number':f.kind,label:lab});
 return R.dateField&&key===R.dateField.key&&estimated(r)?'<span class="rd-inline">'+c+est+'</span>':c;
}

/* Screens */
function overview(){
 const high=G('high'),items=G('items'),watched=G('watched'),newEv=G('newEv'),latest=G('latest');
 const val=(x,f)=>x.pending?'…':x.unavailable||x.total===null?'—':f?f(x.total):x.total;
 const stats='<div class="k-grid rd-stats">'+kit.stat(R.trackerLabel+' tracked',val(items))+kit.stat('Watched',val(watched))+kit.stat('New events to review',val(newEv))+kit.stat('High impact, new',val(high))+'</div>';
 const evLine=e=>'<li><div>'+link(e.data.title||'Event','open:event:'+e.id+':'+String(e.data.natural_key||''))+'<span class="k-muted k-small">'+esc(KIND_LABEL[e.data.kind]||label(e.data.kind))+' · '+esc(scopeName(e.data.scope_id))+(e.data.so_what?' · '+esc(textOf(e.data.so_what,140)):'')+'</span></div><div class="rd-side">'+dateCell(validDate(e.data.occurred_on),bool(e.data.expected))+'</div></li>';
 const hiBody=high.pending?loading('events'):high.unavailable?unavailable('events'):ul(high.rows.map(e=>evLine(e).replace('</div></li>',(canWrite('events')?btn('Mark reviewed','review:'+e.id+':'+e.version):'')+'</div></li>')),'No new high-impact events.');
 const end=addDays(AS_OF,R.comingDays||90);
 const coming=latest.rows.filter(e=>{const d=validDate(e.data.occurred_on);return d&&d>=AS_OF&&d<=end&&e.data.status!=='dismissed';}).sort((a,b)=>String(a.data.occurred_on).localeCompare(String(b.data.occurred_on)));
 const partial=(latest.total||0)>100&&latest.rows.length>0&&validDate(latest.rows[latest.rows.length-1].data.occurred_on)>end;
 const coBody=latest.pending?loading('dates'):latest.unavailable?unavailable('events'):ul(coming.slice(0,8).map(e=>'<li><div>'+link(e.data.title||'Event','open:event:'+e.id+':'+String(e.data.natural_key||''))+'<span class="k-muted k-small">'+esc(KIND_LABEL[e.data.kind]||label(e.data.kind))+'</span></div><div class="rd-side">'+dateCell(validDate(e.data.occurred_on),bool(e.data.expected))+'</div></li>'),partial?'See the Calendar for each month.':'No dated events in the next '+(R.comingLabel||'90 days')+'.');
 const showComing=R.upcoming||coming.length>0;
 let changed;
 if(!RUNS||RUNS.pending)changed=section('What changed in the last run','',loading('the last run'));
 else if(!LAST_RUN)changed=section('No run yet','',kit.empty({title:'Nothing researched yet',text:SCOPES.length?'Ask Claude or ChatGPT to "Build '+P+' now", or let the scheduled scan run (set up in Automations).':'Add a scope with what to watch and its named sources. Then ask Claude or ChatGPT to "Build '+P+' now".',action:SCOPES.length||!canWrite('scopes')?null:{label:'Add the first scope',action:'new:scope'}})+'<p class="k-small"><a href="platform:automations">Automations</a></p>');
 else{
  const ri=runItems||{rows:[],total:0},re=runEv||{rows:[],total:0};
  const lis=ri.rows.slice(0,6).map(r=>'<li><div>'+link(itemTitle(r.data),'open:item:'+r.id+':'+String(r.data.natural_key||''))+'<span class="k-muted k-small">'+esc((pj(r.data.changed_fields,[])||[]).map(x=>x==='new'?'New':fieldLabel(x)).join(', ')||'Updated')+'</span></div><div class="rd-side">'+(r.data.seen_run_id===runId?pill('Seen',''):pill('Changed','medium'))+'</div></li>')
   .concat(re.rows.map(e=>'<li><div>'+link(e.data.title||'Event','open:event:'+e.id+':'+String(e.data.natural_key||''))+'<span class="k-muted k-small">'+esc(KIND_LABEL[e.data.kind]||'')+'</span></div><div class="rd-side">'+impactPill(e.data.impact)+'</div></li>'));
  const unseen=ri.rows.some(r=>r.data.seen_run_id!==r.data.last_changed_run_id);
  const d=LAST_RUN.data,hints=sourceHints();
  const rep=pj(d.sources_report,[]),repRows=[];for(const s of Array.isArray(rep)?rep:[])for(const x of Array.isArray(s&&s.sources)?s.sources:[])repRows.push('<li><div><strong>'+esc(x.name)+'</strong><span class="k-muted k-small">'+esc(scopeName(s.scope_id))+(x.note?' · '+esc(textOf(x.note,200)):'')+'</span></div><div class="rd-side">'+pill(x.status==='used'?'Used':x.status==='not_reachable'?'Not reachable':'Not relevant',x.status==='used'?'ok':x.status==='not_reachable'?'high':'')+'</div></li>');
  changed=section('What changed in the last run',ri.pending||re.pending?'':esc(plural(ri.total||0,R.itemLabel,R.itemsLabel)+' and '+plural(re.total||0,'event')+' from the '+dateLabel(validDate(d.run_on))+' run.'),ri.pending||re.pending?loading('changes'):ul(lis,'Nothing changed in the last run.'),unseen&&canWrite('tracker')?btn('Mark all seen','seen-all'):'')+
   section('Last run',esc(dateLabel(validDate(d.run_on))+' · '+cap(d.kind)+' · '+cap(d.status)+(d.assistant?' · '+cap(d.assistant):'')),(d.summary?'<p>'+esc(textOf(d.summary,600))+'</p>':'')+hints.map(h=>'<p class="k-small">'+esc(h)+' was not reachable in the last 3 runs. Check it in Scopes, or connect it in Claude or ChatGPT; the runs continue on the web.</p>').join('')+'<details class="rd-details"><summary>Source report</summary>'+ul(repRows,'No source report.')+'</details>');
 }
 return stats+'<div class="rd-two">'+section('High impact to review','New high-impact events.',hiBody)+(showComing?section('Coming up ('+(R.comingLabel||'90 days')+')',partial?'More than 100 events are dated later; the Calendar shows each month.':'Dated events; estimates are marked est.',coBody):'')+'</div>'+changed+(R.disclaimer?'<p class="k-muted k-small">'+esc(R.disclaimer)+'</p>':'');
}
/* Source report: a named source not reachable in its last 3 consecutive runs (no scope reached it in that run). */
function sourceHints(){const per={};
 for(const run of (RUNS?RUNS.rows:[]).slice().reverse()){const rep=pj(run.data.sources_report,[]),inRun={};for(const s of Array.isArray(rep)?rep:[])for(const x of Array.isArray(s&&s.sources)?s.sources:[]){const k=String(x.name||'');if(!k)continue;inRun[k]=inRun[k]===false?false:x.status==='not_reachable'?(inRun[k]===undefined?true:inRun[k]):false;}
  for(const [k,u] of Object.entries(inRun)){per[k]=per[k]||[];per[k].push(u);}}
 return Object.entries(per).filter(([,xs])=>xs.length>=3&&xs.slice(-3).every(Boolean)).map(([k])=>k);}

const SELECTS=R.trackerFields.filter(f=>f.kind==='select');
function trackerRows(){
 if(!LOADED)return [];const q=st.q.toLowerCase();
 let rows=LOADED.rows.filter(r=>{const d=r.data;if(scopeCtx&&d.scope_id!==scopeCtx)return false;const show=st.flt.show||'active';if(show==='active'&&bool(d.dismissed))return false;if(show==='dismissed'&&!bool(d.dismissed))return false;
  if(st.flt.watched==='1'&&!bool(d.watched))return false;if(st.flt.changed==='1'&&!changedSet(r).size)return false;for(const f of SELECTS)if(st.flt[f.key]&&d[f.key]!==st.flt[f.key])return false;
  return !q||Object.values(d).some(v=>v!==null&&v!==undefined&&String(v).toLowerCase().includes(q));});
 const f=st.sort.field,dir=st.sort.dir==='asc'?1:-1,def=R.trackerFields.find(x=>x.key===f),opts=def&&def.options;
 const val=r=>{const x=r.data[f];if(x===null||x===undefined||x==='')return null;if(opts)return opts.indexOf(x);if(def&&def.kind==='number')return Number(x);return String(x).toLowerCase();};
 return rows.map((r,i)=>({r,i})).sort((a,b)=>{const x=val(a.r),y=val(b.r);if(x===null&&y===null)return a.i-b.i;if(x===null)return 1;if(y===null)return -1;return (x<y?-1:x>y?1:0)*dir||a.i-b.i;}).map(x=>x.r);
}
function trackerScreen(){
 const add=canWrite('tracker')&&SCOPES.length?btn('Add '+R.itemLabel,'new:item',{primary:true}):'';
 if(LOADED.unavailable)return unavailable(R.trackerLabel.toLowerCase());
 if(LOADED.pending||SC.pending)return loading(R.trackerLabel.toLowerCase());
 if(!LOADED.total)return kit.empty(SCOPES.length?{title:'No '+R.itemsLabel+' yet',text:'Ask Claude or ChatGPT to "Build '+P+' now", wait for the scheduled scan, or add one yourself.',action:canWrite('tracker')?{label:'Add '+R.itemLabel,action:'new:item'}:null}
  :{title:'Start with a scope',text:'A scope says what '+P+' watches and where to look. Research fills the '+R.trackerLabel.toLowerCase()+' from it.',action:canWrite('scopes')?{label:'Add the first scope',action:'new:scope'}:null});
 const rows=trackerRows(),offset=Math.min(st.offset,Math.max(0,Math.floor(Math.max(0,rows.length-1)/PAGE_SIZE)*PAGE_SIZE)),page=rows.slice(offset,offset+PAGE_SIZE);
 const cols=R.listColumns.filter(k=>!HIDDEN.has(k)).map(k=>k==='sponsor'?'sponsor_name':k).filter(k=>k==='natural_key'||roleMap.tracker.fields[k]).concat(CUSTOM_KEYS.filter(k=>!HIDDEN.has(k)));
 const linkKey=R.listColumns.includes('natural_key')||!NAME_FIELD?'natural_key':NAME_FIELD;
 const columns=[{key:'_item',label:fieldLabel(linkKey),render:r=>link(linkKey==='natural_key'?String(r.data.natural_key||'—'):itemTitle(r.data),'open:item:'+r.id+':'+String(r.data.natural_key||''))+(bool(r.data.dismissed)?' '+pill('Dismissed',''):'')+(changedSet(r).size?' '+pill(changedSet(r).has('new')?'New':'Changed','medium'):'')}]
  .concat(cols.filter(k=>k!=='natural_key'&&k!==linkKey).map(k=>({key:k,label:fieldLabel(k),render:r=>'<div class="'+(changedSet(r).has(k)?'rd-changed':'')+'">'+itemCell(r,k)+'</div>'})))
  .concat([{key:'watched',label:'Watched',render:r=>itemCell(r,'watched')}]);
 const sortOpts=[['last_verified_on:desc','Last verified']].concat(cols.filter(k=>k!=='natural_key').flatMap(k=>{const f=R.trackerFields.find(x=>x.key===k);return f&&['date','number','select','text'].includes(f.kind)?[[k+':'+(f.kind==='date'||f.kind==='number'?'desc':'asc'),fieldLabel(k)]]:[];}));
 const filters='<div class="k-row rd-filters"><input type="search" class="rd-search" data-ui-state="true" data-action="q" aria-label="Search '+esc(R.itemsLabel)+'" placeholder="Search '+esc(R.itemsLabel)+'" value="'+esc(st.q)+'">'
  +SELECTS.map(f=>filterSel(fieldLabel(f.key),'flt:'+f.key,[['','Any']].concat(f.options.map(o=>[o,cap(o)])),st.flt[f.key]||'')).join('')
  +filterSel('Show','flt:show',[['active','Not dismissed'],['dismissed','Dismissed'],['all','All']],st.flt.show||'active')
  +filterSel('Watched','flt:watched',[['','All'],['1','Watched only']],st.flt.watched||'')
  +filterSel('Changed','flt:changed',[['','All'],['1','Changed since seen']],st.flt.changed||'')
  +filterSel('Sort','sort',sortOpts,st.sort.field+':'+st.sort.dir)+'</div>';
 const note=LOADED.total>LOADED.rows.length?'<p class="k-muted k-small">Showing the '+LOADED.rows.length+' most recently verified of '+LOADED.total+' '+esc(R.itemsLabel)+'; search and filters apply to these. The whole table is in Database.</p>':'';
 return '<div class="k-row rd-bar"><h2 class="rd-title k-grow">'+esc(R.trackerLabel)+' <span class="k-muted k-small">'+esc(plural(rows.length,R.itemLabel,R.itemsLabel))+'</span></h2>'+add+'</div>'+filters+note
  +kit.table({columns,rows:page,empty:kit.empty({title:'No '+R.itemsLabel+' match',text:'Change the search or filters to see more.'})})+(rows.length>PAGE_SIZE?kit.pager({offset,limit:PAGE_SIZE,total:rows.length,action:'page'}):'');
}

function eventRows(){
 if(!LOADED)return [];const q=st.eq.toLowerCase();
 const rows=LOADED.rows.filter(e=>{const d=e.data;if(scopeCtx&&d.scope_id!==scopeCtx)return false;for(const k of ['kind','impact'])if(st.eflt[k]&&d[k]!==st.eflt[k])return false;if(st.esub==='all'&&st.eflt.status&&d.status!==st.eflt.status)return false;
  return !q||Object.values(d).some(v=>v!==null&&v!==undefined&&String(v).toLowerCase().includes(q));});
 /* Duplicates (same key) are merged into one row; their sources are listed together in the panel. */
 const out=[],seen={};for(const e of rows){const k=String(e.data.natural_key||e.id);if(seen[k]){seen[k].dups++;continue;}seen[k]={e,dups:0};out.push(seen[k]);}
 return out.map(x=>Object.assign({},x.e,{dups:x.dups}));
}
function eventsScreen(){
 const sub=kit.nav([{id:'review',label:'To review'},{id:'all',label:'All events'},{id:'calendar',label:'Calendar'}],st.esub,{prefix:'esub:',label:'Events views'});
 const filters='<div class="k-row rd-filters">'+(st.esub==='calendar'?'':'<input type="search" class="rd-search" data-ui-state="true" data-action="eq" aria-label="Search events" placeholder="Search events" value="'+esc(st.eq)+'">')
  +filterSel('Kind','eflt:kind',[['','All kinds']].concat(R.eventKinds.map(k=>[k.key,k.label])),st.eflt.kind||'')+filterSel('Impact','eflt:impact',[['','Any impact']].concat(['high','medium','low','none'].map(x=>[x,cap(x)])),st.eflt.impact||'')
  +(st.esub==='all'?filterSel('Status','eflt:status',[['','Any status'],['new','New'],['reviewed','Reviewed'],['dismissed','Dismissed']],st.eflt.status||''):'')+'</div>';
 if(st.esub==='calendar'){
  const M=G('month'),monthNav='<div class="k-row">'+btn('Previous month','month-prev')+'<strong class="rd-month">'+esc(monthLabel(st.month))+'</strong>'+btn('Next month','month-next')+btn('This month','month-today')+'</div>';
  if(M.pending)return sub+monthNav+loading('this month');if(M.unavailable)return sub+monthNav+unavailable('events');
  const byDay={};for(const e of M.rows){const d=e.data;if(d.status==='dismissed'||scopeCtx&&d.scope_id!==scopeCtx)continue;if(st.eflt.kind&&d.kind!==st.eflt.kind||st.eflt.impact&&d.impact!==st.eflt.impact)continue;const day=validDate(d.occurred_on);if(day)(byDay[day]=byDay[day]||[]).push(e);}
  const days=Object.keys(byDay).sort();
  const body=days.length?'<ol class="rd-agenda">'+days.map(day=>'<li><div class="rd-day'+(day===AS_OF?' rd-today':'')+'">'+esc(dateLabel(day))+'</div><ul class="rd-list">'+byDay[day].map(e=>'<li><div>'+link(e.data.title||'Event','open:event:'+e.id+':'+String(e.data.natural_key||''))+'<span class="k-muted k-small">'+esc(KIND_LABEL[e.data.kind]||label(e.data.kind))+(bool(e.data.expected)?' · estimate':'')+'</span></div><div class="rd-side">'+impactPill(e.data.impact)+'</div></li>').join('')+'</ul></li>').join('')+'</ol>'
   :kit.empty({title:'No dated events in '+monthLabel(st.month),text:'Move to another month, or change the filters.',action:{label:'This month',action:'month-today'}});
  return sub+monthNav+filters+((M.total||0)>100?'<p class="k-muted k-small">Showing the first 100 of '+M.total+' events this month.</p>':'')+body;
 }
 if(LOADED.unavailable)return sub+unavailable('events');if(LOADED.pending||SC.pending)return sub+loading('events');
 if(!LOADED.total)return sub+(st.esub==='review'?kit.empty({title:'Nothing new to review',text:'New events from research appear here.',action:{label:'See all events',action:'esub:all'}})
  :kit.empty(SCOPES.length?{title:'No events yet',text:'Ask Claude or ChatGPT to "Build '+P+' now", or wait for the scheduled scan.'}:{title:'Start with a scope',text:'Events come from research on your scopes.',action:canWrite('scopes')?{label:'Add the first scope',action:'new:scope'}:null}));
 const rows=eventRows(),offset=Math.min(st.eoffset,Math.max(0,Math.floor(Math.max(0,rows.length-1)/PAGE_SIZE)*PAGE_SIZE)),page=rows.slice(offset,offset+PAGE_SIZE);
 const columns=[{key:'date',label:'Date',render:e=>dateCell(validDate(e.data.occurred_on),bool(e.data.expected))},{key:'kind',label:'Kind',render:e=>esc(KIND_LABEL[e.data.kind]||label(e.data.kind))},
  {key:'item',label:cap(R.itemLabel),render:e=>esc(textOf(String(e.data.natural_key||'').split('|')[0],60)||'—')},
  {key:'title',label:'Event',render:e=>link(e.data.title||'Event','open:event:'+e.id+':'+String(e.data.natural_key||''))+(e.data.so_what?'<span class="k-muted k-small rd-block">'+esc(textOf(e.data.so_what,160))+'</span>':'')+(e.dups?'<span class="k-muted k-small rd-block">Merged with '+plural(e.dups,'duplicate')+'</span>':'')},
  {key:'impact',label:'Impact',render:e=>impactPill(e.data.impact)},{key:'status',label:'Status',render:e=>e.data.status==='new'&&canWrite('events')?btn('Mark reviewed','review:'+e.id+':'+e.version):statusPill(e.data.status)}];
 const bulk=st.esub==='review'&&canWrite('events')&&rows.some(e=>e.data.status==='new')?btn(rows.length>50?'Mark first 50 reviewed':'Mark all shown reviewed','review-shown'):'';
 const note=LOADED.total>LOADED.rows.length?'<p class="k-muted k-small">Showing the latest '+LOADED.rows.length+' of '+LOADED.total+' events; search and filters apply to these.</p>':'';
 return sub+'<div class="k-row rd-bar"><h2 class="rd-title k-grow">'+(st.esub==='review'?'To review':'All events')+' <span class="k-muted k-small">'+esc(plural(rows.length,'event'))+'</span></h2>'+bulk+'</div>'+filters+note
  +kit.table({columns,rows:page,empty:kit.empty({title:'No events match',text:'Change the search or filters to see more.'})})+(rows.length>PAGE_SIZE?kit.pager({offset,limit:PAGE_SIZE,total:rows.length,action:'epage'}):'');
}

function scopesScreen(){
 const add=canWrite('scopes')?btn('Add scope','new:scope',{primary:true}):'';
 if(SC.pending)return loading('scopes');if(SC.unavailable)return unavailable('scopes');
 const lastOn=RUNS&&!RUNS.pending?briefLastRuns(RUNS.rows):{};
 const columns=[{key:'name',label:'Scope',render:s=>{const def=pj(s.data.definition,{})||{};return link(s.data.name||'Scope','open:scope:'+s.id)+'<span class="k-muted k-small rd-block">'+esc(R.scopeFields.map(f=>def[f.key]).filter(Boolean).join(' · ').slice(0,160))+'</span>';}},
  {key:'sources',label:'Named sources',render:s=>esc(briefSources(s.data).named.map(x=>x.name).join(', ')||'—')},
  {key:'last',label:'Last run',render:s=>RUNS&&RUNS.pending?'…':esc(lastOn[s.id]?dateLabel(lastOn[s.id]):'Not yet')},
  {key:'status',label:'Status',render:s=>canWrite('scopes')?selectHtml('',[['active','Active'],['paused','Paused']],s.data.status||'active',{action:'scope-status:'+s.id+':'+s.version,cls:'k-cell',label:'Status of '+String(s.data.name||'scope')}):esc(cap(s.data.status||'active'))}];
 return '<div class="k-row rd-bar"><h2 class="rd-title k-grow">Scopes</h2>'+add+'</div><p class="k-muted k-small">What '+esc(P)+' watches: each scope has its definition, named sources in priority order and a watchlist. The web is always the default route.</p>'
  +kit.table({columns,rows:SCOPES,empty:kit.empty({title:'No scope yet',text:'Add a scope with what to watch and where to look. The next scan, or "Build '+P+' now" in chat, researches it.',action:canWrite('scopes')?{label:'Add the first scope',action:'new:scope'}:null})});
}

function settingsScreen(){
 if(!OWNER)return '';
 if(!SETR||SETR.pending)return loading('settings');if(SETR.unavailable)return unavailable('settings');
 const ok=canWrite('settings');
 const tpl='<form class="k-card rd-section" data-action="save-template"><div class="rd-head"><div><h2>Research template</h2><p class="k-muted k-small">Version '+TPL.version+(TPL.isDefault?' (default)':'')+'. Every run follows it and records the version it used.</p></div></div>'
  +fld('Instruction',inputHtml('instruction',TPL.instruction,{type:'textarea',rows:7}),{required:true,wide:true})
  +'<h3 class="rd-h3">Required rules</h3><p class="k-muted k-small">Always part of the research; they cannot be removed.</p><ul class="rd-rules">'+R.requiredRules.map(r=>'<li>'+esc(r)+'</li>').join('')+'</ul>'
  +fld('Your own rules (one per line)',inputHtml('rules',TPL.rules.join('\n'),{type:'textarea',rows:4}),{wide:true,hint:'Added after the required rules.'})
  +fld('What changed (optional)',inputHtml('note','',{}),{})
  +'<div class="k-row">'+submit('Save template',ok)+btn('Restore default','restore-template',{disabled:!ok||TPL.isDefault})+'</div></form>';
 const lb=num(SET.lookback_days);
 return '<h2 class="rd-title">Settings</h2>'+tpl+'<section class="rd-section"><h2 class="rd-h3">Research</h2>'+kit.settings({action:'settings:save',fields:[{name:'lookback_days',label:'First-run lookback (days, default 90)',value:lb===null?'':String(lb)},{name:'language',label:'Language for summaries and emails (default English)',value:SET.language||''}]},inp)+'</section>';
}

/* Panels (side panel: create a record or see and edit many fields). */
function itemPanel(){
 const p=st.panel,G1=G('panelRow');if(!G1||G1.pending)return kit.panel({title:cap(R.itemLabel),body:loading(R.itemLabel)});
 const row=PANEL_ROW;if(!row){st.panel=null;return '';}
 const d=row.data,ch=changedSet(row),flds=R.trackerFields.map(f=>f.key).filter(k=>roleMap.tracker.fields[k]).concat(CUSTOM_KEYS),w=canWrite('tracker'),v=p.version;
 if(p.mode==='edit'&&w){
  const body='<form data-action="save-item"><input type="hidden" name="__booleans" value="1">'+flds.filter(k=>roleMap.tracker.writable.includes(k)).map(k=>{const f=R.trackerFields.find(x=>x.key===k)||{key:k,kind:'text'};const val=d[k];
   if(f.kind==='select')return fld(fieldLabel(k),selectHtml(k,[['','Not set']].concat((f.options||[]).map(o=>[o,cap(o)])),val));
   if(f.kind==='boolean')return '<label class="k-row rd-check"><input type="checkbox" name="'+esc(k)+'" value="true"'+(bool(val)?' checked':'')+'> '+esc(fieldLabel(k))+'</label>';
   return fld(fieldLabel(k),inputHtml(k,f.kind==='date'?validDate(val):val,{type:f.kind==='number'?'number':f.kind==='date'?'date':'text'}));}).join('')
   +fld('Sources (one per line: title and URL)',inputHtml('sources',sourcesOf(d.sources).map(s=>(s.title||'')+(s.url?' '+s.url:'')).join('\n'),{type:'textarea',rows:4}),{required:true})
   +(roleMap.tracker.writable.includes('user_notes')?fld('Notes',inputHtml('user_notes',d.user_notes||'',{type:'textarea'})):'')
   +'<div class="k-row">'+submit('Save')+btn('Cancel','mode:view')+'</div></form>';
  return kit.panel({title:'Edit '+itemTitle(d),body});
 }
 const evs=G('panelEvents');
 const facts=flds.filter(k=>d[k]!==null&&d[k]!==undefined&&d[k]!=='').map(k=>{const f=R.trackerFields.find(x=>x.key===k)||{kind:'text'};const val=f.kind==='date'?dateCell(validDate(d[k]),R.dateField&&k===R.dateField.key&&estimated(row)):esc(f.kind==='boolean'?(bool(d[k])?'Yes':'No'):f.kind==='select'?cap(d[k]):textOf(d[k],600));return '<div class="rd-kv'+(ch.has(k)?' rd-changed':'')+'"><dt>'+esc(fieldLabel(k))+(ch.has(k)?' (changed)':'')+'</dt><dd>'+val+'</dd></div>';}).join('');
 const hist=evs.pending?loading('history'):ul(evs.rows.map(e=>'<li><div>'+link(e.data.title||'Event','open:event:'+e.id+':'+String(e.data.natural_key||''))+'<span class="k-muted k-small">'+esc(KIND_LABEL[e.data.kind]||'')+'</span></div><div class="rd-side">'+dateCell(validDate(e.data.occurred_on),bool(e.data.expected))+'</div></li>'),'No events for this '+R.itemLabel+' yet.');
 const acts='<div class="k-row">'+(w?(ch.size?btn('Mark seen','seen:'+row.id,{primary:true}):'')+btn(bool(d.watched)?'Unwatch':'Watch',(bool(d.watched)?'unwatch:':'watch:')+row.id+':'+v)+btn('Edit','mode:edit')+btn(bool(d.dismissed)?'Restore':'Dismiss',(bool(d.dismissed)?'restore-item:':'dismiss-item:')+row.id+':'+v):'')+'</div>';
 const body=acts+(ch.size?'<p class="k-small">'+(ch.has('new')?'Added':'Changed')+' by the last run that touched it; highlighted until you mark it seen.</p>':'')+'<dl class="rd-facts">'+kv(fieldLabel('natural_key'),d.natural_key)+kv('Scope',scopeName(d.scope_id))+facts+kv('Sources',srcLinks(d.sources),true)+kv('Last verified',dateLabel(validDate(d.last_verified_on)))+(d.user_notes?kv('Notes',d.user_notes):'')+'</dl><h3 class="rd-h3">History</h3>'+hist;
 return kit.panel({title:itemTitle(d),body});
}
function eventPanel(){
 const p=st.panel,G1=G('panelRow');if(!G1||G1.pending)return kit.panel({title:'Event',body:loading('the event')});
 const row=PANEL_ROW;if(!row){st.panel=null;return '';}const d=row.data,w=canWrite('events'),v=p.version;
 const dups=G1.rows.filter(r=>r.id!==row.id&&r.data.natural_key===d.natural_key);
 if(p.mode==='dismiss'&&w)return kit.panel({title:'Dismiss event',body:'<p>'+esc(d.title)+'</p><form data-action="dismiss-event">'+fld('Reason',inputHtml('dismiss_reason',d.dismiss_reason||'',{type:'textarea'}),{required:true})+'<div class="k-row">'+submit('Dismiss')+btn('Cancel','mode:view')+'</div></form>'});
 const itemKey=String(d.natural_key||'').split('|')[0];
 const body='<div class="k-row">'+(w&&d.status==='new'?btn('Mark reviewed','review:'+row.id+':'+v,{primary:true}):'')+(w&&d.status!=='dismissed'?btn('Dismiss…','mode:dismiss'):'')+'</div><dl class="rd-facts">'+kv('Kind',KIND_LABEL[d.kind]||label(d.kind))+kv('Date',dateCell(validDate(d.occurred_on),bool(d.expected))+(d.expected_window?' · '+esc(d.expected_window):''),true)+kv('Impact',impactPill(d.impact),true)+kv('Direction',cap(d.direction))+kv('Scope',scopeName(d.scope_id))+kv('Status',cap(d.status||'new'))+(d.dismiss_reason?kv('Dismiss reason',d.dismiss_reason):'')+'</dl>'
  +(d.summary?'<p>'+esc(d.summary)+'</p>':'')+(d.so_what?'<p><strong>So what:</strong> '+esc(d.so_what)+'</p>':'')+kv('Sources',[d.sources].concat(dups.map(x=>x.data.sources)).map(srcLinks).join(', '),true)
  +(d.item_id&&itemKey?'<p>'+link('Open the '+R.itemLabel,'open:item:'+d.item_id+':'+itemKey)+'</p>':'');
 return kit.panel({title:String(d.title||'Event'),body});
}
function scopePanel(){
 const p=st.panel,row=p.id?SCOPE[p.id]:null;if(p.id&&!row){if(SC.pending)return kit.panel({title:'Scope',body:loading('the scope')});st.panel=null;return '';}
 const d=row?row.data:{},def=pj(d.definition,{})||{},srcs=row?briefSources(d).named:R.sources.map(s=>({...s}));
 const srcRows=[];for(let i=0;i<Math.max(srcs.length+1,R.sources.length);i++){const s=srcs[i]||{};srcRows.push('<fieldset class="rd-source"><legend>Source '+(i+1)+'</legend>'+fld('Name',inputHtml('src_name_'+i,s.name||''))+fld('Covers',inputHtml('src_covers_'+i,s.covers||''))+fld('Priority',inputHtml('src_priority_'+i,s.priority||i+1,{type:'number'}))+fld('Notes',inputHtml('src_notes_'+i,s.notes||''))+'</fieldset>');}
 const body='<form data-action="save-scope">'+fld('Name',inputHtml('name',d.name||'',{required:true}),{required:true})+(PROGRAMS.length?fld('Program',selectHtml('program_id',[['','No program']].concat(PROGRAMS.map(x=>[x.id,String(x.data.name||'Program')])),d.program_id||'')):'')
  +R.scopeFields.map(f=>fld(f.name,inputHtml('def_'+f.key,def[f.key]||'',{placeholder:f.placeholder,type:f.multiline?'textarea':undefined,rows:f.multiline?6:3}),{required:f.required})).join('')
  +'<h3 class="rd-h3">Named sources (priority order)</h3><p class="k-muted k-small">The assistant reaches each one however it can (a connector if available, otherwise the web) and reports any it cannot reach.</p>'+srcRows.join('')
  +fld('Watchlist (one per line)',inputHtml('watchlist',(pj(d.watchlist,[])||[]).join('\n'),{type:'textarea'}))+fld('Include',inputHtml('include_notes',d.include_notes||'',{type:'textarea'}))+fld('Exclude',inputHtml('exclude_notes',d.exclude_notes||'',{type:'textarea'}))
  +fld('Status',selectHtml('status',[['active','Active'],['paused','Paused']],d.status||'active'))
  +'<div class="k-row">'+submit(row?'Save scope':'Add scope',canWrite('scopes'))+btn('Cancel','panel:close')+(row&&canWrite('scopes')?btn('Remove scope','remove-scope'):'')+'</div></form>';
 return kit.panel({title:row?'Edit scope':'New scope',body});
}
function newItemPanel(){
 const body='<form data-action="add-item">'+fld(cap(R.naturalKey.label),inputHtml('natural_key','',{required:true}),{required:true,hint:R.naturalKey.rule})+(NAME_FIELD?fld(fieldLabel(NAME_FIELD),inputHtml('title',''),{required:true}):'')
  +fld('Scope',selectHtml('scope_id',[['','Choose…']].concat(SCOPES.map(s=>[s.id,String(s.data.name||'Scope')])),scopeCtx||''),{required:true})
  +fld('Sources (one per line: title and URL)',inputHtml('sources','',{type:'textarea'}),{required:true,hint:'At least one source.'})+'<div class="k-row">'+submit('Add '+R.itemLabel,canWrite('tracker'))+btn('Cancel','panel:close')+'</div></form>';
 return kit.panel({title:'Add '+R.itemLabel,body});
}

/* Render */
let main='',overlay='';
const unbound=['settings','scopes','tracker','events','runs'].filter(r=>!roleMap[r]);
if(unbound.length){st.panel=null;main=kit.empty({title:P+' is not connected to its tables',text:'Not connected: '+unbound.map(r=>ROLE_LABEL[r]).join(', ')+'. Install '+P+' from the catalog so its tables are created.'});}
else try{main=scr==='tracker'?trackerScreen():scr==='events'?eventsScreen():scr==='scopes'?scopesScreen():scr==='settings'?settingsScreen():overview();}
catch(e){main=kit.empty({title:'This screen could not be shown',text:String(e&&e.message||e).slice(0,200),action:{label:'Back to Overview',action:'nav:overview'}});}
try{if(st.panel&&!unbound.length)overlay=st.panel.type==='scope'?scopePanel():st.panel.type==='item'?itemPanel():st.panel.type==='event'?eventPanel():st.panel.type==='newitem'?newItemPanel():'';}catch(e){say('error',String(e&&e.message||e));st.panel=null;overlay='';}
if(problems.length&&!notice&&kind==='open')say('error','Some '+P+' data could not be read ('+[...new Set(problems.map(r=>ROLE_LABEL[r]))].join(', ')+'). It may be restricted for you.');
const nav=kit.nav([{id:'overview',label:'Overview'},{id:'tracker',label:R.trackerLabel},{id:'events',label:'Events'},{id:'scopes',label:'Scopes'}].concat(OWNER?[{id:'settings',label:'Settings'}]:[]),scr,{label:P+' screens'});
const picker=SCOPES.length>1||scopeCtx?kit.picker({label:'Scope',action:'context',value:scopeCtx,options:[{value:'',label:'All scopes'}].concat(SCOPES.map(s=>({value:s.id,label:String(s.data.name||'Scope')})))}):'';
const tools_=picker||st.undo?'<div class="k-row rd-context">'+picker+'<span class="k-grow"></span>'+(st.undo?kit.undo([st.undo]):'')+'</div>':'';
/* An open side panel is modal: the screen behind it is inert. */
const page=kit.page(nav+tools_+main),html=overlay?'<div inert>'+page+'</div>'+overlay:page;
return {html,css:RADAR_CSS,state:st,context:{scope:scopeCtx},...(notice?{notice}:{})};
