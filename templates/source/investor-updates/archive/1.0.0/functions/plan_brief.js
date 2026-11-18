// Scheduled email update brief (research.briefBinding of the scheduled_draft feature). Read-only: records.read on Investor Updates'
// own roles and the shared people and organizations. The run is for one plan (input.recordId): its template (sections, default
// levels, brief, design), its categories with their descriptions, levels and share-class rules, the share classes (information
// rights in words), the plan's sources and exclusions, the period to draft (the app's period rules), the previous sent update of
// the plan with its blocks, facts and dated statements, and that update's engagement (who did not read, open asks, unanswered
// questions). It marks when the period already has an update, so research saves nothing (dedup by plan + period).
const MAX_PAGES=8;
function readAll(role){const typeId=appRoles[role];if(!typeId)return {rows:[],complete:false};let rows=[],total=0;
 for(let page=0;page<MAX_PAGES;page++){const r=tools.call('records.read',{typeId,limit:100,offset:page*100});const got=r&&Array.isArray(r.rows)?r.rows:[];
  rows=rows.concat(got);total=Number(r&&r.total)||rows.length;if(!got.length||rows.length>=total)break;}
 return {rows:rows.map(x=>Object.assign({},x.data||{},{id:x.id})),complete:rows.length>=total};}
const live=r=>r.archived!==true&&r.archived!=='true';
const J=v=>{try{const x=typeof v==='string'?JSON.parse(v):v;return x&&typeof x==='object'?x:null;}catch(e){return null;}};
const L=v=>{const x=J(v);return Array.isArray(x)?x.map(String):[];};
const today=new Date().toISOString().slice(0,10);
const monthEnd=(y,m)=>new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
const addDays=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
function periodOf(cad,d){const y=Number(d.slice(0,4)),m=Number(d.slice(5,7));
 if(cad==='quarterly'){const q=Math.ceil(m/3);return {key:y+'-Q'+q,start:y+'-'+String(q*3-2).padStart(2,'0')+'-01',end:monthEnd(y,q*3)};}
 if(cad==='half_yearly'){const h=m<=6?1:2;return {key:y+'-H'+h,start:y+'-'+(h===1?'01':'07')+'-01',end:monthEnd(y,h*6)};}
 if(cad==='yearly')return {key:String(y),start:y+'-01-01',end:y+'-12-31'};
 return {key:y+'-'+String(m).padStart(2,'0'),start:y+'-'+String(m).padStart(2,'0')+'-01',end:monthEnd(y,m)};}
const R={};for(const role of ['investorupdates.plans','investorupdates.templates','investorupdates.categories','investorupdates.share_classes','investorupdates.updates','investorupdates.deliveries','investorupdates.responses','investorupdates.recipients','investorupdates.settings','people','organizations'])R[role]=readAll(role);
const byId=role=>Object.fromEntries(R[role].rows.map(r=>[r.id,r]));
const PLAN=byId('investorupdates.plans'),TPL=byId('investorupdates.templates'),CAT=byId('investorupdates.categories'),CLS=byId('investorupdates.share_classes'),REC=byId('investorupdates.recipients'),PEOPLE=byId('people'),ORG=byId('organizations');
const plan=PLAN[input&&input.recordId];
if(!plan||!live(plan))return {context:JSON.stringify({skip:true,reason:'The plan is not available or archived: save nothing.'})};
const settings=R['investorupdates.settings'].rows[0]||{};
const cadence=plan.cadence||'monthly';
// The period to draft: the last period that has ended (the app shows it as due until an update for it is sent).
const due=periodOf(cadence,addDays(periodOf(cadence,today).start,-1));
const ups=R['investorupdates.updates'].rows.filter(u=>u.plan_id===plan.id);
const existing=ups.find(u=>u.period===due.key&&u.status!=='cancelled');
const prev=ups.filter(u=>u.status==='sent').sort((a,b)=>String(b.sent_on||'').localeCompare(String(a.sent_on||'')))[0]||null;
const tpl=TPL[plan.template_id]||null;
const cats=L(plan.category_ids).map(id=>CAT[id]).filter(c=>c&&live(c));
const classIds=[...new Set(cats.flatMap(c=>L(c.share_class_ids)))];
let engagement=null;
if(prev){const ds=R['investorupdates.deliveries'].rows.filter(d=>d.update_id===prev.id),delivered=ds.filter(d=>['sent','read'].includes(d.status)||Number(d.read_count)>0),read=delivered.filter(d=>d.status==='read'||Number(d.read_count)>0);
 const rs=R['investorupdates.responses'].rows.filter(r=>ups.some(u=>u.id===r.update_id));
 const nameOf=id=>{const r=REC[id];return r&&PEOPLE[r.person_id]?PEOPLE[r.person_id].name:null;};
 engagement={update:prev.title,sent_on:prev.sent_on||null,delivered:delivered.length,read:read.length,not_read:delivered.filter(d=>!(d.status==='read'||Number(d.read_count)>0)).map(d=>nameOf(d.recipient_id)).filter(Boolean).slice(0,30),
  open_asks:rs.filter(r=>r.ask_key!=='question'&&r.kind!=='question'&&['new','following_up',undefined,null,''].includes(r.status)).map(r=>({ask:r.ask_text||r.ask_key,note:r.message||null})).slice(0,20),
  unanswered_questions:rs.filter(r=>(r.ask_key==='question'||r.kind==='question')&&!r.answered_on).map(r=>String(r.message||'').slice(0,300)).slice(0,20)};}
const dated=prev?(J(prev.blocks)||[]).filter(b=>b&&b.type==='milestones').flatMap(b=>(b.items||[]).map(m=>({title:m.title,date:m.date,status:m.status}))).slice(0,30):[];
const context={
 asOf:today,
 instruction:existing?'This period already has an update ('+existing.status+'): save nothing and complete with no update.':'Create one investorupdates.updates row for this period, status in_review.',
 plan:{id:plan.id,name:plan.name,format:plan.format,cadence,period:due.key,period_start:due.start,period_end:due.end,send_by_day:plan.send_by_day??7,approvers:[plan.approver_1||null,plan.approver_2||null],sources:J(plan.sources)||{},status:plan.status},
 existing_update:existing?{id:existing.id,status:existing.status}:null,
 template:tpl?{id:tpl.id,name:tpl.name,format:tpl.format,sections:J(tpl.sections)||[],brief:tpl.brief||null,design:J(tpl.design)||{}}:null,
 categories:cats.map(c=>({id:c.id,name:c.name,kind:c.kind,level:c.level,description:c.description||null,share_class_rule:L(c.share_class_ids).map(id=>CLS[id]?CLS[id].name:null).filter(Boolean),help_on:c.help_on!==false,questions_on:c.questions_on!==false})),
 share_classes:classIds.map(id=>CLS[id]).filter(Boolean).map(c=>({name:c.name,kind:c.kind,notes:c.notes||null})),
 settings:{help_enabled:settings.help_enabled!==false,questions_enabled:settings.questions_enabled!==false},
 previous_update:prev?{id:prev.id,title:prev.title,period:prev.period,sent_on:prev.sent_on||null,blocks:J(prev.blocks)||[],facts:J(prev.facts)||[],dated_statements:dated}:null,
 engagement,
 rules:['Write blocks only (types heading, text, metrics, table, chart, milestones, asks, callout, divider, image), each with a level: board, investors or everyone; follow the template sections and their default levels; never raise a level the user lowered.','Every number in metrics, charts and numeric tables references a fact {id, claim, value, unit, source, as_of}; record sources name app, role, record_id and field; never invent figures; say "not available" when a source is missing.','Lead with cash, runway to the next milestone and program progress; give honest lowlights; make asks specific.','Compare dated statements with previous_update.dated_statements and explain moved dates in the milestone explanation.','Never state ownership percentages or holdings; never mention plan.sources.exclusions; no legal or securities advice.'],
 complete:Object.values(R).every(x=>x.complete)
};
let text=JSON.stringify(context);
while(text.length>60000&&context.previous_update&&context.previous_update.blocks.length){context.previous_update.blocks=context.previous_update.blocks.slice(0,Math.floor(context.previous_update.blocks.length*0.7));context.truncated=true;text=JSON.stringify(context);}
return {context:text};
