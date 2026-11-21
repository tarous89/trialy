/* brief: the research brief for a scan or a chat run (BIO_RADAR.md §2.3). Returns {context} within 64,000 characters. */
const settingsRow=D(readPage('settings',{limit:5}).rows[0]);
const scopes=readAll('scopes',300).rows;
const runs=readAll('runs',600).rows;
/* Current tracker fields, including custom ones the user added: from the table definition, not the radar definition. */
let fields=[];
try{const tables=tools.call('tables.list',{});const t=(Array.isArray(tables)?tables:[]).find(x=>x&&x.id===TBL.tracker);
 if(t&&Array.isArray(t.fields))fields=t.fields.map(f=>({key:f.key,name:f.name,kind:f.kind,options:Array.isArray(f.options)?f.options:null,custom:!RADAR.trackerFields.some(d=>d.key===f.key)&&!BRIEF_SYSTEM_FIELDS.includes(f.key)}));}catch(e){fields=[];}
if(!fields.length)fields=RADAR.trackerFields.map(f=>({key:f.key,name:f.name,kind:f.kind,options:f.options||null,custom:false}));
/* Keys already recorded, so the run updates instead of duplicating. */
const items=readAll('tracker',2000);
const trackerKeys=[],dismissed=[];for(const r of items.rows){const d=D(r);if(!d.natural_key)continue;trackerKeys.push(String(d.natural_key));if(d.dismissed===true)dismissed.push(String(d.natural_key));}
const head=readPage('events',{limit:1}),eventTotal=head.total||0;
const recent=eventTotal?readAll('events',400,{offset:Math.max(0,eventTotal-400)}).rows:[];
const recentEventKeys=[...new Set(recent.map(r=>String(D(r).natural_key||'')).filter(Boolean))];
const brief=o=>composeBrief({settings:settingsRow,scopes,runs,fields,today:TODAY,existing:o});
let keys=trackerKeys.slice(),complete=items.complete,ctx=brief({trackerKeys:keys,trackerTotal:items.total,trackerComplete:complete,dismissedItems:dismissed,recentEventKeys});
/* Keep within the brief limit: drop the oldest recorded keys first and say the list is partial. */
while(JSON.stringify(ctx).length>60000&&keys.length){keys=keys.slice(Math.ceil(keys.length/4));complete=false;ctx=brief({trackerKeys:keys,trackerTotal:items.total,trackerComplete:false,dismissedItems:dismissed.slice(0,300),recentEventKeys:recentEventKeys.slice(-150)});}
return {context:ctx};
