/* Radar kit brief builder (BIO_RADAR.md §2.3). Pure code shared by the `brief` app function and the app's Setup preview, so the brief
 * an automation reads and the one a person sees are built the same way. Needs a global RADAR (the radar definition at run time). */
const BRIEF_SYSTEM_FIELDS=['natural_key','scope_id','program_id','sources','last_verified_on','last_changed_run_id','changed_fields','seen_run_id','watched','dismissed','user_notes','archived'];
function briefJSON(v,d){if(v&&typeof v==='object')return v;try{const x=JSON.parse(String(v||''));return x===null||x===undefined?d:x;}catch(e){return d;}}
function briefDate(v){const t=String(v||'').slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(t)?t:'';}
function briefMinusDays(d,n){const t=Date.UTC(Number(d.slice(0,4)),Number(d.slice(5,7))-1,Number(d.slice(8,10)))-n*86400000;return new Date(t).toISOString().slice(0,10);}
/** The editable template ({instruction, rules}) with the radar's default when missing. Required rules are never part of it. */
function briefTemplate(settings){
 const t=briefJSON(settings&&settings.research_template,null),ok=t&&typeof t==='object'&&typeof t.instruction==='string'&&t.instruction.trim();
 const rules=ok&&Array.isArray(t.rules)?t.rules.map(x=>String(x).trim()).filter(Boolean).filter(x=>!RADAR.requiredRules.includes(x)).slice(0,30):[];
 return {instruction:ok?t.instruction.trim().slice(0,6000):RADAR.instruction,rules,version:Number(settings&&settings.research_template_version)>0?Number(settings.research_template_version):1,isDefault:!ok};
}
/** The rules the research follows: the locked required rules first, then the user's own. */
function briefRules(tpl){return RADAR.requiredRules.concat(tpl.rules);}
/** Sources in priority order; the web is always the default route. */
function briefSources(scope){
 const xs=briefJSON(scope.sources,[]);const list=(Array.isArray(xs)?xs:[]).filter(s=>s&&s.name).map(s=>({name:String(s.name).slice(0,120),covers:String(s.covers||'').slice(0,300),priority:Number(s.priority)||99,notes:String(s.notes||'').slice(0,400)})).sort((a,b)=>a.priority-b.priority);
 return {named:list,defaultRoute:'web'};
}
/** Last completed or partial run date per scope. */
function briefLastRuns(runs){
 const last={};for(const r of runs){const d=r.data||r;if(!['completed','partial'].includes(d.status))continue;const on=briefDate(d.run_on);if(!on)continue;for(const id of briefJSON(d.scope_ids,[]))if(!last[id]||last[id]<on)last[id]=on;}return last;
}
/** Return format from the CURRENT tracker fields (definition fields plus any custom ones the user added). */
function briefReturnFormat(fields){
 const shape=f=>f.kind+(f.options&&f.options.length?' ('+f.options.join(' | ')+')':'')+(f.custom?', custom field':'');
 const tracker={};for(const f of fields)if(!BRIEF_SYSTEM_FIELDS.includes(f.key))tracker[f.key]=shape(f);
 Object.assign(tracker,{natural_key:'text, required: '+RADAR.naturalKey.rule,scope_id:'record ID, required',sources:'JSON [{title, url, date}], required',last_verified_on:'date (today)',last_changed_run_id:'this run ID',changed_fields:'JSON array of changed keys, ["new"] for a new row'});
 return {
  [RADAR.roles.tracker]:tracker,
  [RADAR.roles.events]:{kind:RADAR.eventKinds.map(k=>k.key).join(' | '),title:'text, required',summary:'text',occurred_on:'date',occurred_month:'YYYY-MM',expected:'boolean: true for an estimated or anticipated date',expected_window:'text, e.g. "H1 2027"',impact:'high | medium | low | none',direction:'threat | opportunity | neutral',so_what:'one or two sentences: why it matters for the scope\'s program',sources:'JSON [{title, url, date}], required',item_id:'record ID of the '+RADAR.itemLabel,scope_id:'record ID',natural_key:'"item key|kind|date"',run_id:'this run ID',status:'new'},
  [RADAR.roles.runs]:{run_id:'this run ID',scope_ids:'JSON array',kind:'build (first run for a scope) | refresh',run_on:'date',assistant:'claude | chatgpt',research_template_version:'number from this brief',sources_report:'JSON [{scope_id, sources:[{name, status: used | not_reachable | not_relevant, note}]}]',items_added:'number',items_updated:'number',events_added:'number',summary:'starts with a one- or two-sentence bottom line',status:'completed | partial | failed'}
 };
}
/** Builds the brief. existing = {trackerKeys, trackerTotal, trackerComplete, dismissedItems, recentEventKeys}. */
function composeBrief(o){
 const tpl=briefTemplate(o.settings),lookback=Number(o.settings&&o.settings.lookback_days)>0?Math.min(3650,Number(o.settings.lookback_days)):90,last=briefLastRuns(o.runs||[]);
 const active=(o.scopes||[]).filter(s=>(s.data||s).status==='active'&&(s.data||s).archived!==true).map(s=>{const d=s.data||s,id=s.id||d.id,def=briefJSON(d.definition,{});
  return {scope_id:id,name:String(d.name||''),program_id:d.program_id||null,definition:def,sources:briefSources(d),watchlist:briefJSON(d.watchlist,[]),include:d.include_notes||'',exclude:d.exclude_notes||'',last_run_on:last[id]||null,since:last[id]||briefMinusDays(o.today,lookback),run_kind:last[id]?'refresh':'build'};});
 const ex=o.existing||{};
 return {
  radar:RADAR.name,radar_template:RADAR.id+'@'+RADAR.version,generated_on:o.today,
  research_template:{version:tpl.version,is_default:tpl.isDefault,instruction:tpl.instruction,rules:briefRules(tpl),required_rules_count:RADAR.requiredRules.length},
  active_scopes:active,
  nothing_to_do:active.length?null:'No active scope: save nothing and finish with no_update.',
  natural_key:RADAR.naturalKey,
  return_format:briefReturnFormat(o.fields||[]),
  current_fields:(o.fields||[]).filter(f=>!BRIEF_SYSTEM_FIELDS.includes(f.key)).map(f=>({key:f.key,name:f.name,kind:f.kind,options:f.options||null,custom:!!f.custom})),
  recorded:{[RADAR.itemsLabel]:ex.trackerKeys||[],[RADAR.itemsLabel+'_total']:ex.trackerTotal===undefined?null:ex.trackerTotal,[RADAR.itemsLabel+'_complete']:!!ex.trackerComplete,dismissed:ex.dismissedItems||[],recent_event_keys:ex.recentEventKeys||[],note:ex.trackerComplete?'Every recorded key is listed.':'Not every key fits in the brief; read the table through your read access before adding a row.'},
  user_owned_fields:RADAR.userOwned
 };
}
