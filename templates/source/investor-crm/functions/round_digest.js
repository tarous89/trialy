// Weekly round digest (email.summaryBinding). Read-only: records.read on Fundraise's own roles only.
// Same rules as the app: only signed counts as raised; verbal and soft are separate; another currency is flagged
// and excluded; stale = active stage with no activity for more than stale_days; due = next step or open
// follow-up due within 7 days. Partial reads withhold totals. No active round sends nothing (nonEmpty:false).
const MAX_PAGES=8;
function readAll(role){const typeId=appRoles[role];if(!typeId)return {rows:[],complete:false};let rows=[],total=0;
 for(let page=0;page<MAX_PAGES;page++){const r=tools.call('records.read',{typeId,limit:100,offset:page*100});const got=r&&Array.isArray(r.rows)?r.rows:[];
  rows=rows.concat(got);total=Number(r&&r.total)||rows.length;if(!got.length||rows.length>=total)break;}
 return {rows:rows.map(x=>Object.assign({},x.data||{},{id:x.id})),complete:rows.length>=total};}
const num=v=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v))?Number(v):null;
const live=r=>r.archived!==true&&r.archived!=='true';
const today=new Date().toISOString().slice(0,10);
const addDays=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const diffDays=(a,b)=>Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000);
const fmt=(v,c)=>c+' '+String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g,',');
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const day=d=>Number(d.slice(8,10))+' '+MON[Number(d.slice(5,7))-1];
const ACTIVE=['contacted','first_meeting','partner_meeting','due_diligence','term_sheet'];
const LABEL={target:'Target',contacted:'Contacted',first_meeting:'First meeting',partner_meeting:'Partner meeting',due_diligence:'Due diligence',term_sheet:'Term sheet',committed:'Committed',closed:'Closed',passed:'Passed'};

const rounds=readAll('fundraise.rounds'),active=rounds.rows.filter(r=>live(r)&&r.status==='active').sort((a,b)=>String(a.opened_on||'').localeCompare(String(b.opened_on||'')));
if(!active.length)return {nonEmpty:false,text:'No active round.'};
const opps=readAll('fundraise.opportunities'),acts=readAll('fundraise.activities'),orgs=readAll('organizations'),profiles=readAll('fundraise.investor_profiles'),settingsRows=readAll('fundraise.settings');
const complete=[rounds,opps,acts,orgs,profiles,settingsRows].every(x=>x.complete);
const settings=settingsRows.rows[0]||{},staleDays=Math.min(180,Math.max(1,Math.round(num(settings.stale_days)||14)));
const ORG={};for(const o of orgs.rows)ORG[o.id]=o;const STATUS={};for(const p of profiles.rows)if(live(p))STATUS[p.organization_id]=p.profile_status;
const name=id=>ORG[id]&&ORG[id].name?String(ORG[id].name):'Unnamed investor';
const inPipeline=o=>live(o)&&!['proposed','rejected'].includes(STATUS[o.organization_id]);
const week=addDays(today,6);const lines=['Fundraise · week of '+day(today)];

for(const round of active.slice(0,3)){
 const os=opps.rows.filter(o=>o.round_id===round.id&&inPipeline(o)),t={raised:0,verbal:0,soft:0},flagged=[],missing=[];
 for(const o of os){if(!['soft','verbal','signed'].includes(o.interest))continue;const a=o.interest==='signed'?num(o.amount_committed):num(o.amount_committed)??num(o.amount_indicated);
  if(a===null){if(o.interest==='signed')missing.push(o);continue;}if(o.currency!==round.currency){flagged.push(o);continue;}t[o.interest==='signed'?'raised':o.interest]+=a;}
 const target=num(round.target_amount),c=round.currency||'';lines.push('');
 if(complete){lines.push(String(round.name||'Round')+': raised '+fmt(t.raised,c)+(target?' of '+fmt(target,c)+' ('+Math.round(t.raised/target*1000)/10+'%)':' (no target set)'));
  lines.push('Verbal '+fmt(t.verbal,c)+' · Soft '+fmt(t.soft,c)+' (not counted as raised)');}
 else lines.push(String(round.name||'Round')+': totals withheld, not every record could be read. Open Fundraise for details.');
 const lead=os.find(o=>o.is_lead===true||o.is_lead==='true');lines.push(lead?'Lead: '+name(lead.organization_id)+' · '+(lead.offer_status?'term sheet '+String(lead.offer_status).replace(/_/g,' '):LABEL[lead.stage]||lead.stage):'Lead: not yet chosen');
 const due=[],stale=[],closed=o=>['closed','passed'].includes(o.stage);
 for(const o of os){if(ACTIVE.includes(o.stage)&&(!o.last_activity_on||diffDays(o.last_activity_on,today)>staleDays))stale.push(name(o.organization_id)+' ('+(LABEL[o.stage]||o.stage)+(o.last_activity_on?', '+diffDays(o.last_activity_on,today)+' days':', no activity logged')+')');
  if(!closed(o)&&o.next_due&&o.next_due<=week)due.push({d:o.next_due,t:name(o.organization_id)+': '+String(o.next_step||'follow up').slice(0,80)});}
 const byOpp={};for(const o of os)byOpp[o.id]=o;
 for(const a of acts.rows){const o=byOpp[a.opportunity_id];if(!o||closed(o)||!a.follow_up_due||a.follow_up_due>week)continue;
  if(acts.rows.some(b=>b.id!==a.id&&b.opportunity_id===a.opportunity_id&&b.activity_on&&a.activity_on&&b.activity_on>a.activity_on))continue;
  due.push({d:a.follow_up_due,t:name(o.organization_id)+': follow up on '+String(a.summary||'').slice(0,60)});}
 due.sort((a,b)=>a.d.localeCompare(b.d));const overdue=due.filter(x=>x.d<today).length;
 if(due.length){lines.push('Due this week ('+due.length+(overdue?', '+overdue+' overdue':'')+'):');for(const x of due.slice(0,5))lines.push('· '+(x.d<today?'Overdue ':'')+day(x.d)+' '+x.t);if(due.length>5)lines.push('· '+(due.length-5)+' more');}
 if(stale.length){lines.push('Stale, no activity for more than '+staleDays+' days ('+stale.length+'):');for(const s of stale.slice(0,5))lines.push('· '+s);if(stale.length>5)lines.push('· '+(stale.length-5)+' more');}
 if(flagged.length)lines.push(flagged.length+' amount'+(flagged.length>1?'s':'')+' in another currency than '+c+' excluded from totals.');
 if(missing.length)lines.push(missing.length+' signed commitment'+(missing.length>1?'s have':' has')+' no amount yet.');
 const proposed=profiles.rows.filter(p=>live(p)&&p.profile_status==='proposed').length;if(proposed&&round===active[0])lines.push(proposed+' proposed investor'+(proposed>1?'s':'')+' waiting for review in Investors.');
}
if(active.length>3)lines.push('','· '+(active.length-3)+' more active rounds');
lines.push('','Open Fundraise →');
return {nonEmpty:true,subject:'Fundraise · week of '+day(today),text:lines.join('\n').slice(0,20000)};
