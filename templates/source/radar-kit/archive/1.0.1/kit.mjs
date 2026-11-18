/* Bio Radars kit (BIO_RADAR.md §2). Pure functions that turn one radar definition (templates/source/radars/<slug>/radar.json) into its
 * installer schema, research template, recommended automations, read-only app functions and layout schema. The generator
 * (scripts/build-radar-templates.mjs) combines them with the shared app source, CSS and function sources into the immutable catalog entry.
 * Nothing here is radar-specific: a new radar is a definition, its sources, template, demo data and tests. */

export const KIT_VERSION='1.0.1';

/* §2.3: every default template carries these rules. Users may add rules but not remove these: they are kept apart from the editable part. */
export const REQUIRED_RULES=[
 'Every fact needs a source URL or reference and a date.',
 'Mark estimates as estimates (expected dates, anticipated completion, projected values).',
 'Summarise paid content; do not copy it.',
 'Do not guess missing values: leave them empty.',
 'Respect the exclusions of each scope.',
 'Give no legal, investment or medical advice.',
 'Reach each named source however you can (a connector if available, otherwise the web); report sources you cannot reach and continue.',
 'Return a source report: for each scope and named source, used, not reachable or not relevant.'
];
export const IMPACT=['high','medium','low','none'];
export const DIRECTION=['threat','opportunity','neutral'];
export const EVENT_STATUS=['new','reviewed','dismissed'];
export const SOURCE_STATUS=['used','not_reachable','not_relevant'];
/* User-owned tracker fields: never in the research write grant (E6 exceptFields). */
export const USER_OWNED_TRACKER=['watched','seen_run_id','dismissed','user_notes','archived'];
/* Events are create-only for research; these stay with people. */
export const USER_OWNED_EVENTS=['dismiss_reason','reviewed_by','archived'];

const field=(key,name,kind,o={})=>({key,name,kind,required:!!o.required,multiple:false,ai:true,...(o.options?{options:o.options}:{}),...(o.description?{description:o.description}:{})});
const fromDef=d=>field(d.key,d.name,d.kind,{required:d.required,options:d.options,description:d.description});
const logical=fields=>Object.fromEntries(fields.map(f=>[f.key,f.key]));

export function roles(radar){const p=radar.prefix;return {settings:p+'.settings',scopes:p+'.scopes',tracker:p+'.'+radar.trackerTable,events:p+'.events',runs:p+'.runs'};}

export function settingsFields(){return [
 field('lookback_days','Lookback (days)','number',{description:'First-run lookback when a scope has no completed run yet. Default 90.'}),
 field('impact_scale','Impact scale','text',{description:'JSON object: {high, medium, low, none} → one line on what each level means for you. Blank uses the standard scale.'}),
 field('research_template','Research template','text',{description:'JSON {instruction, rules:[...]}: the editable part of the research template. The required rules are added by the app and cannot be removed.'}),
 field('research_template_version','Research template version','number'),
 field('research_template_history','Research template history','text',{description:'JSON array of earlier versions {version, saved_on, note, template}. The newest 20 are kept.'}),
 field('field_labels','Field labels','text',{description:'JSON object: tracker field key → label shown in the app (renaming a field for display).'}),
 field('hidden_fields','Hidden fields','text',{description:'JSON array of tracker field keys hidden in the table. Hidden fields stay in the research and the brief.'}),
 field('language','Language','text',{description:'Language for summaries and emails. Default English.'})
];}
export function scopeFields(){return [
 field('name','Name','text',{required:true}),
 field('program_id','Program','text',{description:'Record ID of a programs record (optional).'}),
 field('definition','Definition','text',{required:true,description:'JSON object with this radar\'s scope fields.'}),
 field('sources','Named sources','text',{required:true,description:'JSON array [{name, covers, priority, notes}], in priority order. The web is always the default route.'}),
 field('watchlist','Watchlist','text',{description:'JSON array of names or identifiers to watch closely.'}),
 field('include_notes','Include','text'),
 field('exclude_notes','Exclude','text'),
 field('status','Status','select',{required:true,options:['active','paused']}),
 field('archived','Archived','boolean')
];}
export function trackerFields(radar){return [
 ...radar.trackerFields.map(fromDef),
 field('natural_key','Key','text',{required:true,description:radar.naturalKey.rule}),
 field('scope_id','Scope','text',{required:true,description:'Record ID of a scopes record.'}),
 field('program_id','Program','text',{description:'Record ID of a programs record.'}),
 field('sources','Sources','text',{required:true,description:'JSON array [{title, url, date}]. A row without a source cannot be saved.'}),
 field('last_verified_on','Last verified','date'),
 field('last_changed_run_id','Changed in run','text',{description:'Run ID of the latest run that changed this row.'}),
 field('changed_fields','Changed fields','text',{description:'JSON array of field keys the latest run changed; ["new"] for a row the run added.'}),
 field('seen_run_id','Seen run','text',{description:'Set by a person: the run whose changes they have seen.'}),
 field('watched','Watched','boolean',{description:'Set by a person.'}),
 field('dismissed','Dismissed','boolean',{description:'Set by a person. A dismissed item is not recreated.'}),
 field('user_notes','Notes','text',{description:'Written by people only.'}),
 field('archived','Archived','boolean')
];}
export function eventFields(radar){return [
 field('scope_id','Scope','text',{required:true,description:'Record ID of a scopes record.'}),
 field('program_id','Program','text',{description:'Record ID of a programs record.'}),
 field('organization_id','Organization','text',{description:'Record ID of an organizations record.'}),
 field('item_id','Item','text',{description:'Record ID of the '+radar.itemLabel+' in the '+radar.trackerLabel+' table.'}),
 field('natural_key','Key','text',{required:true,description:'The item key plus kind and date, so the same event is merged.'}),
 field('kind','Kind','select',{required:true,options:radar.eventKinds.map(k=>k.key)}),
 field('title','Title','text',{required:true}),
 field('summary','Summary','text'),
 field('occurred_on','Date','date'),
 field('occurred_month','Month','text',{description:'YYYY-MM of the date, for the calendar.'}),
 field('expected','Expected (estimate)','boolean'),
 field('expected_window','Expected window','text'),
 field('impact','Impact','select',{required:true,options:IMPACT}),
 field('direction','Direction','select',{options:DIRECTION}),
 field('so_what','So what','text'),
 field('sources','Sources','text',{required:true,description:'JSON array [{title, url, date}].'}),
 field('run_id','Run','text'),
 field('status','Status','select',{required:true,options:EVENT_STATUS,description:'Research writes new; people mark reviewed or dismissed.'}),
 field('dismiss_reason','Dismiss reason','text'),
 field('reviewed_by','Reviewed by','text'),
 field('archived','Archived','boolean')
];}
export function runFields(){return [
 field('run_id','Run','text',{required:true}),
 field('scope_ids','Scopes','text',{required:true,description:'JSON array of scope record IDs.'}),
 field('kind','Kind','select',{required:true,options:['build','refresh']}),
 field('run_on','Run on','date',{required:true}),
 field('assistant','Assistant','select',{options:['claude','chatgpt']}),
 field('automation_id','Automation','text'),
 field('research_template_version','Template version','number'),
 field('sources_report','Source report','text',{required:true,description:'JSON array [{scope_id, sources:[{name, status: used|not_reachable|not_relevant, note}]}].'}),
 field('items_added','Items added','number'),
 field('items_updated','Items updated','number'),
 field('events_added','Events added','number'),
 field('summary','Summary','text'),
 field('status','Status','select',{required:true,options:['completed','partial','failed']})
];}

const CORE_ORGS=[field('name','Name','text',{required:true}),field('org_type','Type','select',{options:['company','investor','cro','cdmo','site','funder','partner','agency','other']}),field('country','Country','text'),field('website','Website','text'),field('archived','Archived','boolean')];
const CORE_PROGRAMS=[field('name','Name','text',{required:true}),field('code','Code','text'),field('indication','Indication','text'),field('stage','Stage','select',{required:true,options:['discovery','preclinical','ind_enabling','phase_1','phase_2','phase_3','registration','approved']}),field('archived','Archived','boolean')];

/** Installer schema (templates/catalog-installers.json points to the generated file). */
export function installerSchema(radar){
 const r=roles(radar),c=radar.prefix+'.v1',t=(name,contract,fields,extra={})=>({name,contract,...extra,fields,logicalFields:logical(fields)});
 return {
  organizations:t('Organizations','core.v1',CORE_ORGS),
  programs:t('Programs','core.v1',CORE_PROGRAMS,{optional:true,readOnly:true,description:'Programs (core.v1), read when shared. Scopes and events can link a program; without it the link stays empty.'}),
  [r.settings]:t(radar.name+' settings',c,settingsFields()),
  [r.scopes]:t(radar.name+' scopes',c,scopeFields()),
  [r.tracker]:t(radar.trackerLabel,c,trackerFields(radar)),
  [r.events]:t(radar.name+' events','radar.v1',eventFields(radar)),
  [r.runs]:t(radar.name+' runs',c,runFields())
 };
}

/** The output contract entry for templates/contracts/outputs.json (radar.v1). */
export function outputContract(radar){
 return {name:radar.name+' events',kind:'output',writer:radar.id,description:'Events from '+radar.name+' (radar.v1): '+radar.eventKinds.map(k=>k.label.toLowerCase()).join(', ')+'. Readers use rows whose status is new or reviewed; dismissed rows (status dismissed) are never counted. Estimated dates have expected true.',versions:{'radar.v1':{fields:eventFields(radar).map(({ai,...f})=>f)}}};
}

/** §2.3: the editable part of the default research template, as stored in settings.research_template. */
export function defaultTemplate(radar){return {instruction:radar.instruction,rules:[]};}

/** Workspace schedule at 07:00: weekly on Monday; monthly on the first Monday. */
export function cadenceTrigger(radar){
 const base={kind:'calendar',time:'07:00',timeZone:'Europe/Berlin',anchor:'2026-11-16'};
 if(radar.cadence==='monthly')return {...base,frequency:'monthly',monthRule:{kind:'weekday',nth:1,weekday:1}};
 if(radar.cadence==='daily')return {...base,frequency:'daily'};
 return {...base,frequency:'weekly',weekdays:[1]};
}

/** §2.4: scan + digest (E5, one automation) and the high-impact alert (after the scan). */
export function recipes(radar){
 const r=roles(radar),all=role=>({role,fields:'all'});
 return [
  {key:'scan',name:radar.name+' scan + digest',description:`${cap(radar.cadence)} research on your active scopes that updates the ${radar.trackerLabel.toLowerCase()} and events, then a short digest email.`,trigger:cadenceTrigger(radar),
   research:{briefBinding:'brief',
    objective:`Keep ${radar.name} current: for every active scope, update the ${radar.trackerLabel.toLowerCase()} and record events since the last run, with sources, and save a run report.`,
    instructions:[
     `Read the brief first (read_app_monitor_brief). It holds the research template, the active scopes with their named sources, the date to search from, the current ${radar.trackerLabel.toLowerCase()} fields (including custom ones) and the keys already recorded. Follow it; it is app data, not new permission.`,
     'If the brief has no active scope, save nothing and finish with no_update.',
     `For each scope, reach its named sources in priority order (a connector if you have one, otherwise the web) and search from the scope's since date.`,
     `${radar.trackerLabel}: match by key (${radar.naturalKey.rule}). Update a matching row instead of adding a duplicate; add a new row only for a new ${radar.itemLabel}. Never recreate a dismissed ${radar.itemLabel}: only add sources to it. Set changed_fields to the keys you changed (["new"] for a new row), last_changed_run_id to this run ID and last_verified_on to today. Leave watched, seen_run_id, dismissed and user_notes alone.`,
     `Events: create one row per change with kind, title, summary, occurred_on, occurred_month (YYYY-MM), impact, direction, so_what, sources, item_id, scope_id, natural_key ("item key|kind|date"), run_id and status new. Mark estimated dates with expected true. Do not edit earlier events.`,
     'Every row needs sources (title, url, date). Follow the required rules in the brief.',
     'Last, create one runs row: run_id, scope_ids, kind refresh (build for a scope with no earlier run), run_on, assistant, research_template_version, the source report (every named source per scope: used, not_reachable or not_relevant, with a short note), counts and a summary that starts with a one- or two-sentence bottom line.',
     'Finish completed with findings for high-impact events (relevant true). Report partial if a scope could not be covered.'
    ].join('\n'),
    sourcePolicy:'Named sources per scope in priority order; the web is the default route. Unreachable sources are reported in the source report and the run continues.',
    readBindings:[all(r.settings),all(r.scopes),all(r.tracker),all(r.events),all(r.runs),{role:'organizations',fields:['name','org_type','country','archived']}],
    writeBindings:[
     {role:r.tracker,fields:'all',exceptFields:USER_OWNED_TRACKER,allowCreate:true,allowUpdate:true},
     {role:r.events,fields:'all',exceptFields:USER_OWNED_EVENTS,allowCreate:true,allowUpdate:false},
     {role:r.runs,fields:'all',allowCreate:true,allowUpdate:false}
    ]},
   email:{summaryBinding:'digest_summary',subject:radar.name+' digest',text:`${radar.name} has new changes. Open ${radar.name} in TrialAgents to review them.`,when:'meaningful'}},
  {key:'alert',name:radar.name+' high-impact alert',description:`An email after a scan that touched a high-impact event on a watched ${radar.itemLabel}; one email per run.`,trigger:{kind:'after',recipe:'scan',when:'meaningful'},
   email:{summaryBinding:'alert_summary',subject:radar.name+' alert',text:`${radar.name} found a high-impact change on a watched ${radar.itemLabel}. Open ${radar.name} in TrialAgents.`}}
 ];
}
const cap=s=>String(s).charAt(0).toUpperCase()+String(s).slice(1);

/** E7: three read-only app functions. Sources live in templates/source/radar-kit/functions/. */
export function functionDecls(radar,sources){
 const r=roles(radar),compact=JSON.stringify(radarRuntime(radar));
 const decl=(name,purpose,body,roleList,out)=>({name,purpose,source:`const RADAR=${compact};\n${sources.common}\n${body}`,inputContract:{type:'object'},outputContract:{type:'object',required:out},scope:{capabilities:['records.read','tables.list'],roles:roleList,documents:false}});
 return [
  decl('brief','Prepares the research brief: template with locked rules, active scopes, since dates, current fields and recorded keys.',sources.brief,[r.settings,r.scopes,r.tracker,r.events,r.runs],['context']),
  decl('digest_summary','Writes the digest email from the run\'s saved rows; sends nothing when the run changed nothing.',sources.digest,[r.settings,r.tracker,r.events,r.runs],['nonEmpty','text']),
  decl('alert_summary','Writes the alert only when the run touched a high-impact event on a watched item.',sources.alert,[r.tracker,r.events],['nonEmpty','text'])
 ];
}

/** The part of the definition the app and functions need at run time. */
export function radarRuntime(radar){
 return {id:radar.id,version:radar.version,name:radar.name,roles:roles(radar),trackerLabel:radar.trackerLabel,itemLabel:radar.itemLabel,itemsLabel:radar.itemsLabel,cadence:radar.cadence,
  scopeFields:radar.scopeFields,trackerFields:radar.trackerFields,naturalKey:radar.naturalKey,dateField:radar.dateField,eventKinds:radar.eventKinds,digestSection:radar.digestSection,
  listColumns:radar.listColumns,optionLabels:radar.optionLabels||{},sources:radar.sources,instruction:radar.instruction,requiredRules:REQUIRED_RULES,userOwned:USER_OWNED_TRACKER};
}

/** Line 1 of the app source: screens and column groups for the native layout gear. */
export function layoutSchema(radar){
 const tracker=radar.listColumns.map(k=>({id:k,label:k==='natural_key'?'Key':k==='sponsor'?'Sponsor':(radar.trackerFields.find(f=>f.key===k)||{name:k}).name})).concat([{id:'changed',label:'Changed'},{id:'watched',label:'Watched'}]);
 return {screens:[{id:'overview',label:'Overview'},{id:'tracker',label:radar.trackerLabel},{id:'events',label:'Events'},{id:'setup',label:'Setup'}],
  groups:{tracker,events:[{id:'date',label:'Date'},{id:'kind',label:'Kind'},{id:'item',label:radar.trackerLabel.replace(/s$/,'')},{id:'title',label:'Event'},{id:'impact',label:'Impact'},{id:'direction',label:'Direction'},{id:'status',label:'Status'},{id:'source',label:'Source'}]}};
}

/** Catalog instructions and documentation (MCP-returned), generated per radar so every radar documents the same contract. */
export function catalogText(radar){
 const r=roles(radar),N=radar.name,T=radar.trackerLabel,t=T.toLowerCase(),src=radar.sources.map(s=>s.name).join(', ');
 const instructions=`${N} ${radar.version} (${radar.id}) is a Bio Radars app (kit ${KIT_VERSION}, BIO_RADAR.md), custom frontend-js on the Vivid kit, theme graphite. It watches ${radar.itemsLabel} for one or more scopes and keeps a ${t} table and an events feed current, using research by Claude or ChatGPT. Read read_app_template_guidance (usage, authoring, contracts; follow every nextOffset) before installing or editing. Install through the catalog: the Use existing data? dialog connects organizations (core.v1) and programs (core.v1, optional, read-only) and creates the app tables ${[r.settings,r.scopes,r.tracker,r.events,r.runs].join(', ')}. ${r.events} is an output (contract radar.v1, one writer): other apps read it read-only and ignore dismissed rows. The install dialog offers two automations, both selected: "${N} scan + digest" (research then email, one automation) and "${N} high-impact alert" (after the scan). The owner may opt out there or set them up later in Automations → From app features. Research writes directly to ${t}, events and runs under the grants approved with Add app (create and update ${t} except watched, seen_run_id, dismissed, user_notes and archived; create events; create runs); people review, watch, dismiss and edit. Sources are named, not connected: ${src}; the assistant reaches each one however it can, the web by default, and reports unreachable ones in the run's source report. On request in chat, "Build ${N} now" (first run for a new scope) or "Refresh ${N} now": call the app function brief (invoke_component_function, binding brief) for the same brief the scan reads, then write the same rows through reviewed changes. Every change a person makes in the app is one records.propose batch. Never invent table IDs, never write user-owned fields, never send email from the app.`;
 const documentation={
  quickStart:[
   `Pin ${radar.id} ${radar.version} and its digest; offer to restore an archived ${N} first (list_archived_items with kind apps and this templateId).`,
   'Use installs it. Keep both automations selected unless the owner opts out; choose the Claude or ChatGPT runner. Without a ready runner the scan shows Needs setup and the alert waits.',
   `Open Setup → Scopes and add a scope: name, ${radar.scopeFields.map(f=>f.name.toLowerCase()).join(', ')}. The standard named sources are prefilled (${src}).`,
   `Ask Claude or ChatGPT to "Build ${N} now", or wait for the ${radar.cadence} scan (07:00, Monday for weekly, first Monday for monthly).`,
   `Review new events on Events → New, watch the ${radar.itemsLabel} that matter, and edit the research template in Setup when needed.`
  ],
  dataContract:`Tables (roles): ${r.settings} (one row: lookback_days, impact_scale, research_template JSON {instruction, rules}, research_template_version, research_template_history, field_labels, hidden_fields, language); ${r.scopes} (name*, program_id, definition* JSON {${radar.scopeFields.map(f=>f.key).join(', ')}}, sources* JSON [{name, covers, priority, notes}], watchlist, include_notes, exclude_notes, status* active|paused, archived); ${r.tracker} (${radar.trackerFields.map(f=>f.key+(f.kind==='select'?' select':f.kind==='text'?'':' '+f.kind)).join(', ')}, natural_key* (${radar.naturalKey.rule}), scope_id*, program_id, sources* JSON [{title,url,date}], last_verified_on, last_changed_run_id, changed_fields JSON, seen_run_id, watched, dismissed, user_notes, archived); ${r.events} (radar.v1: scope_id*, program_id, organization_id, item_id, natural_key* "item key|kind|date", kind* ${radar.eventKinds.map(k=>k.key).join('|')}, title*, summary, occurred_on, occurred_month YYYY-MM, expected, expected_window, impact* high|medium|low|none, direction threat|opportunity|neutral, so_what, sources*, run_id, status* new|reviewed|dismissed, dismiss_reason, reviewed_by, archived); ${r.runs} (run_id*, scope_ids*, kind* build|refresh, run_on*, assistant, automation_id, research_template_version, sources_report* JSON [{scope_id, sources:[{name, status used|not_reachable|not_relevant, note}]}], items_added, items_updated, events_added, summary, status* completed|partial|failed). All fields are scalar. Custom ${t} fields: add the field to the ${r.tracker} table (a reviewed schema change by the owner), then one reviewed app save that adds it to the app's binding for that table and to the source's templateBindings header (tableMap needs no change; prepare_workspace_change save_component with the current source, manifest field and execution kept). The field then appears as a column, in the brief's return format and in the research grant automatically (fields:"all"); no automation re-approval is needed. last_run_on per scope is derived from runs. App functions (read-only, installed with the app): brief, digest_summary, alert_summary.`,
  interactionContract:`Screens: Overview (high-impact events to review, coming dates in 90 days with est. for estimates, what changed since the last run, last run and its source report; a hint when a named source was not reachable in 3 consecutive runs), ${T} (server-side search, filters, sort and paging; grouping within the page; detail drawer with fields, sources, history and changed-since-seen highlights; watch, mark seen, edit, dismiss/restore, add), Events (New review queue, Feed, Calendar by month; mark reviewed, dismiss with a reason, mark a page reviewed; duplicates with the same key are merged on the page), Setup (scopes with named sources and watchlist; research template editor with versions, restore default and locked required rules; ${t} field labels and the return format; links to Automations and Access; Build now / Refresh now prompt). The layout gear (tracker:layout) reorders and hides screens and ${t}/events columns. Every write is a records.propose batch (≤ 50) a person approves; editors keep the version they opened with.`,
  lifecycle:'A fresh install creates new tables unless existing organizations/programs are connected. Saved app revisions keep the app ID, functions and automations. Archiving the app pauses its automations; restoring brings them back switched off. Copies keep the read-only functions and copy automations switched off. Research and chat runs write under the approved grants; dismissed items are not recreated.',
  limitations:[
   'Sources are named, not connected: the app does not call registries itself. Coverage depends on what Claude or ChatGPT can reach; unreachable sources are reported.',
   'Search, filters and sort are server-side; grouping and duplicate merging apply to the displayed page. Exact-match filters only (no date ranges); the calendar reads a month at a time (first 100 events).',
   'No legal, investment or medical advice. Estimates are marked est. and may change.',
   'The brief lists up to 2,000 recorded keys; beyond that the research checks the table directly.'
  ],
  examples:radar.examplePrompts.slice(0,5),
  tasks:{mode:'optional',
   whenUseful:`The ${radar.cadence} scan keeps ${t} and events current without anyone asking; the alert flags high-impact changes on watched ${radar.itemsLabel}. Both are platform automations created from the install dialog; the app works fully without them (Build now in chat).`,
   readRequirements:`Read the brief (read_app_monitor_brief in a scheduled run, or the brief function in chat): research template with required rules, active scopes with named sources and since dates, current ${t} fields, recorded keys. Read ${t}, events and runs through the approved read bindings before writing.`,
   outputContract:`Update or add ${t} rows by natural key (changed_fields, last_changed_run_id, last_verified_on, sources); create events (status new, run_id, sources, expected for estimates); create one runs row with the source report. Finish completed with findings for high-impact events, partial if a scope could not be covered, no_update when there is no active scope. The digest and alert are written by the app's summary functions and sent only when there is something to report.`,
   promptExample:`Refresh ${N} now: read the brief, search ${src} (the web by default) from each scope's since date, update the ${t} and record events with sources, then save the run with its source report.`}
 };
 return {instructions,documentation};
}
