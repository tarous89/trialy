// Agenda and pre-read brief (research.briefBinding of meeting_before_draft, which fires lead days before a meeting date).
// Read-only. The run is for one meeting (input.recordId). Recipes cannot filter by status, so this brief marks meetings that are
// cancelled, held, already past or that already have a before part: research then saves nothing. Otherwise it gives the meeting,
// its invited categories with descriptions and levels, its plan's template (or the standard agenda template), the plan sources,
// the previous meeting of the same kind with its recap, next steps and questions, and the attached documents to cite.
const MAX_PAGES=8;
function readAll(role){const typeId=appRoles[role];if(!typeId)return {rows:[],complete:false};let rows=[],total=0;
 for(let page=0;page<MAX_PAGES;page++){const r=tools.call('records.read',{typeId,limit:100,offset:page*100});const got=r&&Array.isArray(r.rows)?r.rows:[];
  rows=rows.concat(got);total=Number(r&&r.total)||rows.length;if(!got.length||rows.length>=total)break;}
 return {rows:rows.map(x=>Object.assign({},x.data||{},{id:x.id})),complete:rows.length>=total};}
const live=r=>r.archived!==true&&r.archived!=='true';
const J=v=>{try{const x=typeof v==='string'?JSON.parse(v):v;return x&&typeof x==='object'?x:null;}catch(e){return null;}};
const L=v=>{const x=J(v);return Array.isArray(x)?x.map(String):[];};
const today=new Date().toISOString().slice(0,10);
const R={};for(const role of ['investorupdates.meetings','investorupdates.plans','investorupdates.templates','investorupdates.categories','investorupdates.updates','investorupdates.responses','investorupdates.settings'])R[role]=readAll(role);
const byId=role=>Object.fromEntries(R[role].rows.map(r=>[r.id,r]));
const MEET=byId('investorupdates.meetings'),PLAN=byId('investorupdates.plans'),TPL=byId('investorupdates.templates'),CAT=byId('investorupdates.categories');
const m=MEET[input&&input.recordId];
const ups=R['investorupdates.updates'].rows;
const before=m?ups.find(u=>u.meeting_id===m.id&&u.format==='meeting_before'&&u.status!=='cancelled'):null;
const skip=!m||!live(m)?'The meeting is not available or archived.':m.status==='cancelled'?'The meeting is cancelled.':m.status==='held'?'The meeting was already held.':String(m.meeting_date||'')<today?'The meeting date has passed.':before?'The meeting already has its before part ('+before.status+').':null;
if(skip)return {context:JSON.stringify({skip:true,reason:skip+' Save nothing and complete with no update.'})};
const plan=m.plan_id?PLAN[m.plan_id]:null;
const tpl=plan&&TPL[plan.template_id]||R['investorupdates.templates'].rows.find(t=>t.kind==='meeting_before'&&live(t))||null;
const prevMeeting=R['investorupdates.meetings'].rows.filter(x=>x.id!==m.id&&x.kind===m.kind&&live(x)&&String(x.meeting_date||'')<String(m.meeting_date)).sort((a,b)=>String(b.meeting_date).localeCompare(String(a.meeting_date)))[0]||null;
const prevParts=prevMeeting?ups.filter(u=>u.meeting_id===prevMeeting.id&&u.status==='sent'):[];
const qs=prevParts.length?R['investorupdates.responses'].rows.filter(r=>prevParts.some(u=>u.id===r.update_id)&&(r.ask_key==='question'||r.kind==='question')).map(r=>({question:String(r.message||'').slice(0,300),answered:!!r.answered_on})):[];
const settings=R['investorupdates.settings'].rows[0]||{};
const context={
 asOf:today,
 instruction:'Create one investorupdates.updates row: format meeting_before, meeting_id '+m.id+', kind one_off, status in_review, category_ids = the invited categories, document_ids = the platform documents you cite.',
 meeting:{id:m.id,title:m.title,kind:m.kind,date:m.meeting_date,start_time:m.start_time||null,timezone:m.timezone||null,location:m.location||null,plan:plan?{id:plan.id,name:plan.name,sources:J(plan.sources)||{}}:null},
 invited:L(m.category_ids).map(id=>CAT[id]).filter(Boolean).map(c=>({id:c.id,name:c.name,level:c.level,description:c.description||null,questions_on:c.questions_on!==false})),
 template:tpl?{id:tpl.id,name:tpl.name,sections:J(tpl.sections)||[],brief:tpl.brief||null}:null,
 previous_meeting:prevMeeting?{title:prevMeeting.title,date:prevMeeting.meeting_date,parts:prevParts.map(u=>({format:u.format,title:u.title,blocks:J(u.blocks)||[]})),questions:qs}:null,
 settings:{questions_enabled:settings.questions_enabled!==false,lead_days:settings.meeting_lead_days??7},
 rules:['Blocks: meeting (date, time, place as text), agenda (title, presenter, minutes, document_id of an attached platform document), text for the pre-read, each with a level: board, investors or everyone; decisions needed are board level.','Agenda from open decisions, milestones and the previous meeting\'s next steps; cite only platform documents you attach.','Every number references a fact with its source; never invent figures.','No legal advice; the meeting procedure (notices, votes, quorum) is out of scope.'],
 complete:Object.values(R).every(x=>x.complete)
};
let text=JSON.stringify(context);
while(text.length>60000&&context.previous_meeting&&context.previous_meeting.parts.length){context.previous_meeting.parts=context.previous_meeting.parts.slice(0,-1);context.truncated=true;text=JSON.stringify(context);}
return {context:text};
