// Weekly Investor Updates digest (email.summaryBinding of weekly_digest, Mondays 08:00). Read-only: records.read on the app's own
// roles. Same rules as the app: an email plan's last ended period is due until its update is sent, send-by = period end +
// send_by_day, overdue after that; a meeting's before part is due meeting_lead_days ahead. Sections: email updates due or
// overdue, meetings in the next 21 days with their before status, meetings held without an after part, drafts waiting for
// approval, unanswered questions, open offers of help. Nothing to report sends nothing (nonEmpty:false). Partial reads say so.
const MAX_PAGES=8;
function readAll(role){const typeId=appRoles[role];if(!typeId)return {rows:[],complete:false};let rows=[],total=0;
 for(let page=0;page<MAX_PAGES;page++){const r=tools.call('records.read',{typeId,limit:100,offset:page*100});const got=r&&Array.isArray(r.rows)?r.rows:[];
  rows=rows.concat(got);total=Number(r&&r.total)||rows.length;if(!got.length||rows.length>=total)break;}
 return {rows:rows.map(x=>Object.assign({},x.data||{},{id:x.id})),complete:rows.length>=total};}
const live=r=>r.archived!==true&&r.archived!=='true';
const today=new Date().toISOString().slice(0,10);
const monthEnd=(y,m)=>new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
const addDays=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const day=d=>Number(d.slice(8,10))+' '+MON[Number(d.slice(5,7))-1];
function periodOf(cad,d){const y=Number(d.slice(0,4)),m=Number(d.slice(5,7));
 if(cad==='quarterly'){const q=Math.ceil(m/3);return {key:y+'-Q'+q,label:'Q'+q+' '+y,start:y+'-'+String(q*3-2).padStart(2,'0')+'-01',end:monthEnd(y,q*3)};}
 if(cad==='half_yearly'){const h=m<=6?1:2;return {key:y+'-H'+h,label:'H'+h+' '+y,start:y+'-'+(h===1?'01':'07')+'-01',end:monthEnd(y,h*6)};}
 if(cad==='yearly')return {key:String(y),label:String(y),start:y+'-01-01',end:y+'-12-31'};
 return {key:y+'-'+String(m).padStart(2,'0'),label:MON[m-1]+' '+y,start:y+'-'+String(m).padStart(2,'0')+'-01',end:monthEnd(y,m)};}
const R={};for(const role of ['investorupdates.plans','investorupdates.meetings','investorupdates.updates','investorupdates.responses','investorupdates.settings'])R[role]=readAll(role);
const settings=R['investorupdates.settings'].rows[0]||{},lead=Number.isFinite(Number(settings.meeting_lead_days))&&settings.meeting_lead_days!==null&&settings.meeting_lead_days!==''?Number(settings.meeting_lead_days):7;
const ups=R['investorupdates.updates'].rows,sec=[],more=(xs,n)=>xs.length>n?' · '+(xs.length-n)+' more':'';
const due=[];for(const p of R['investorupdates.plans'].rows.filter(p=>live(p)&&p.status==='active'&&p.format==='email')){const d=periodOf(p.cadence||'monthly',addDays(periodOf(p.cadence||'monthly',today).start,-1));
 const u=ups.filter(x=>x.plan_id===p.id&&x.period===d.key&&x.status!=='cancelled');if(u.some(x=>x.status==='sent'))continue;const sendBy=addDays(d.end,Number.isFinite(Number(p.send_by_day))&&p.send_by_day!==null?Number(p.send_by_day):7);
 const draft=u[0];due.push({text:p.name+', '+d.label+': '+(today>sendBy?'overdue since '+day(sendBy):'send by '+day(sendBy))+(draft?' ('+String(draft.status).replace('_',' ')+')':' (no draft yet)'),overdue:today>sendBy});}
if(due.length)sec.push('Email updates due ('+due.length+(due.some(d=>d.overdue)?', '+due.filter(d=>d.overdue).length+' overdue':'')+'):\n'+due.slice(0,5).map(d=>'· '+d.text).join('\n')+more(due,5));
const meets=R['investorupdates.meetings'].rows.filter(m=>live(m)&&m.status!=='cancelled');
const soon=meets.filter(m=>m.meeting_date>=today&&m.meeting_date<=addDays(today,21)).sort((a,b)=>String(a.meeting_date).localeCompare(String(b.meeting_date)));
if(soon.length)sec.push('Meetings in the next 21 days ('+soon.length+'):\n'+soon.slice(0,5).map(m=>{const b=ups.find(u=>u.meeting_id===m.id&&u.format==='meeting_before'&&u.status!=='cancelled');const dueOn=addDays(m.meeting_date,-lead);return '· '+day(m.meeting_date)+' '+m.title+': agenda '+(b?String(b.status).replace('_',' '):today>dueOn?'late (due '+day(dueOn)+')':'due '+day(dueOn));}).join('\n')+more(soon,5));
const noRecap=meets.filter(m=>m.meeting_date<today&&m.meeting_date>=addDays(today,-60)&&!ups.some(u=>u.meeting_id===m.id&&u.format==='meeting_after'&&u.status==='sent'));
if(noRecap.length)sec.push('Meetings held without a recap ('+noRecap.length+'):\n'+noRecap.slice(0,5).map(m=>'· '+day(m.meeting_date)+' '+m.title).join('\n')+more(noRecap,5));
const waiting=ups.filter(u=>['in_review','approved'].includes(u.status));
if(waiting.length)sec.push('Drafts waiting ('+waiting.length+'):\n'+waiting.slice(0,5).map(u=>'· '+u.title+' ('+(u.status==='approved'?'approved, ready to send':'in review')+')').join('\n')+more(waiting,5));
const rs=R['investorupdates.responses'].rows,isQ=r=>r.ask_key==='question'||r.kind==='question';
const qs=rs.filter(r=>isQ(r)&&!r.answered_on&&r.status!=='done');
if(qs.length)sec.push('Unanswered questions ('+qs.length+'):\n'+qs.slice(0,5).map(r=>'· '+String(r.message||'(no text)').slice(0,120)).join('\n')+more(qs,5));
const help=rs.filter(r=>!isQ(r)&&(!r.status||['new','following_up'].includes(r.status)));
if(help.length)sec.push('Open offers of help ('+help.length+'):\n'+help.slice(0,5).map(r=>'· '+String(r.ask_text||r.ask_key||'Ask').slice(0,80)+(r.message?': '+String(r.message).slice(0,80):'')+(r.owner?' ('+r.owner+')':'')).join('\n')+more(help,5));
const complete=Object.values(R).every(x=>x.complete);
if(!sec.length)return {nonEmpty:false,text:'',subject:'Investor Updates'};
const text='Investor Updates · week of '+day(today)+'\n\n'+sec.join('\n\n')+(complete?'':'\n\nSome records could not be read; this digest may be incomplete.')+'\n\nOpen Investor Updates →';
return {nonEmpty:true,subject:'Investor Updates · week of '+day(today),text:text.slice(0,19000)};
