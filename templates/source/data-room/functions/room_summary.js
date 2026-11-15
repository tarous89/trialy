// Weekly room summary to the owner (email.summaryBinding; Mondays 08:00). Read-only: records.read on Data Room's own roles only.
// Same rules as the app: a party is active this week when they opened a document in the last 7 days; quiet when they have access
// (invited or active) and nothing was opened for the room's quiet days (Settings; default 10), counted from the grant when never seen.
// Open questions are those not answered, published or declined; overdue = due before today. Items due = not ready and not "not
// applicable", due within 7 days or overdue. Grant status, last seen and engagement are written by TrialAgents from the room.
// Nothing live sends nothing (nonEmpty:false). Partial reads say so instead of giving counts.
const MAX_PAGES=8;
function readAll(role){const typeId=appRoles[role];if(!typeId)return {rows:[],complete:false,missing:true};let rows=[],total=0;
 for(let page=0;page<MAX_PAGES;page++){const r=tools.call('records.read',{typeId,limit:100,offset:page*100});const got=r&&Array.isArray(r.rows)?r.rows:[];
  rows=rows.concat(got);total=Number(r&&r.total)||rows.length;if(!got.length||rows.length>=total)break;}
 return {rows:rows.map(x=>Object.assign({},x.data||{},{id:x.id})),complete:rows.length>=total};}
const num=v=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v))?Number(v):null;
const live=r=>r.archived!==true&&r.archived!=='true';
const today=new Date().toISOString().slice(0,10);
const d10=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}/.test(v)?v.slice(0,10):'';
const addDays=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const diffDays=(a,b)=>Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000);
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const day=d=>Number(d.slice(8,10))+' '+MON[Number(d.slice(5,7))-1];
const plural=(n,w)=>n+' '+w+(n===1?'':'s');
const DONE=['answered','published','declined'];

const rooms=readAll('dataroom.rooms'),open=rooms.rows.filter(r=>live(r)&&r.status==='live').sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
if(!open.length)return {nonEmpty:false,text:'No live room this week.'};
const grants=readAll('dataroom.access_grants'),eng=readAll('dataroom.engagement'),qs=readAll('dataroom.questions'),items=readAll('dataroom.items'),settingsRows=readAll('dataroom.settings'),people=readAll('people'),orgs=readAll('organizations');
const complete=[rooms,grants,eng,qs,items,settingsRows].every(x=>x.complete);
const settings=settingsRows.rows[0]||{},quietDays=Math.min(365,Math.max(1,Math.round(num(settings.quiet_days)||10)));
const P={},O={};for(const p of people.rows)P[p.id]=p;for(const o of orgs.rows)O[o.id]=o;
const who=g=>{const n=P[g.person_id]&&P[g.person_id].name?String(P[g.person_id].name):String(g.recipient_email||'Unnamed');const o=O[g.organization_id]&&O[g.organization_id].name?String(O[g.organization_id].name):'';return o?n+' ('+o+')':n;};
const weekAgo=addDays(today,-7),week=addDays(today,7);
const lines=['Data Room · week of '+day(today)];
if(!complete)lines.push('','Not every record could be read, so some counts may be missing. Open Data Room for the full picture.');
for(const room of open.slice(0,5)){
 const gs=grants.rows.filter(g=>g.room_id===room.id&&['invited','active'].includes(g.status)),ids=new Set(gs.map(g=>g.id));
 const rows=eng.rows.filter(e=>ids.has(e.grant_id));
 const first=id=>rows.filter(e=>e.grant_id===id).map(e=>d10(e.first_viewed_on)).filter(Boolean).sort()[0]||'';
 const lastOpen=id=>rows.filter(e=>e.grant_id===id).map(e=>d10(e.last_viewed_on)).filter(Boolean).sort().slice(-1)[0]||'';
 const newViewers=gs.filter(g=>{const f=first(g.id);return f&&f>weekAgo;});
 const active=gs.filter(g=>{const l=lastOpen(g.id);return l&&l>weekAgo;}).map(g=>({g,opens:rows.filter(e=>e.grant_id===g.id&&d10(e.last_viewed_on)>weekAgo).reduce((n,e)=>n+(num(e.view_count)||0),0)})).sort((a,b)=>b.opens-a.opens);
 const quiet=gs.filter(g=>{const seen=d10(g.last_seen_on)||lastOpen(g.id),from=seen||d10(g.granted_on);return from&&diffDays(from,today)>=quietDays;});
 const q=qs.rows.filter(x=>live(x)&&x.room_id===room.id&&!DONE.includes(x.status)),overdue=q.filter(x=>d10(x.due)&&d10(x.due)<today),fresh=qs.rows.filter(x=>live(x)&&x.room_id===room.id&&d10(x.asked_on)>weekAgo);
 const due=items.rows.filter(i=>live(i)&&i.room_id===room.id&&!['ready','not_applicable'].includes(i.status)&&d10(i.due)&&d10(i.due)<=week).sort((a,b)=>d10(a.due).localeCompare(d10(b.due)));
 lines.push('',String(room.name||'Room')+': '+gs.length+' '+(gs.length===1?'party':'parties')+' with access');
 lines.push('New viewers this week ('+newViewers.length+')'+(newViewers.length?': '+newViewers.slice(0,6).map(who).join(', ')+(newViewers.length>6?' and '+(newViewers.length-6)+' more':''):''));
 if(active.length){lines.push('Active this week ('+active.length+'):');for(const x of active.slice(0,5))lines.push('· '+who(x.g)+': '+plural(x.opens,'open'));if(active.length>5)lines.push('· '+(active.length-5)+' more');}
 else lines.push('Active this week: nobody opened a document.');
 if(quiet.length){lines.push('Quiet, nothing opened for '+quietDays+' days or more ('+quiet.length+'):');for(const g of quiet.slice(0,5))lines.push('· '+who(g)+((d10(g.last_seen_on)||lastOpen(g.id))?', last opened '+day(d10(g.last_seen_on)||lastOpen(g.id)):', never opened'));if(quiet.length>5)lines.push('· '+(quiet.length-5)+' more');}
 lines.push('Questions: '+q.length+' open'+(overdue.length?', '+overdue.length+' overdue':'')+(fresh.length?', '+fresh.length+' new this week':''));
 for(const x of overdue.slice(0,3))lines.push('· Overdue '+day(d10(x.due))+': '+String(x.question||'').slice(0,90));
 if(due.length){lines.push('Checklist items due ('+due.length+'):');for(const i of due.slice(0,5))lines.push('· '+(d10(i.due)<today?'Overdue ':'')+day(d10(i.due))+' '+String(i.title||'Item').slice(0,80)+(i.owner?' ('+String(i.owner).slice(0,40)+')':''));if(due.length>5)lines.push('· '+(due.length-5)+' more');}
}
if(open.length>5)lines.push('','· '+(open.length-5)+' more live rooms');
lines.push('','Questions asked in a room are emailed to you as they arrive. Open Data Room → Overview for details.');
return {nonEmpty:true,subject:'Data Room · week of '+day(today),text:lines.join('\n')};
