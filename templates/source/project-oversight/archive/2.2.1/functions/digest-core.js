// Programs 2.2.0 digest core. One source, inlined by the build into the app (attention.read, Overview) and into both
// digest helpers (digest_brief for the AI digest, digest_email for the digest without AI), so all three always agree.
// Input: logical records with id (archived rows may be included; they are ignored), today (YYYY-MM-DD).
// "Needs attention" uses the app's own rules: overdue = not done/cancelled and end date before today; due soon = the next
// 14 days (items and pending gates/decisions); slips = recorded this week; gates not ready = pending gates in the next
// 30 days without criteria or with criteria not all met; reviews = open RAID entries past their review date; stale health
// = not assessed, undated or older than 45 days; missing update = active programs without this month's update after the
// update day (Settings, default 5).
function digestCore(d){
 const today=d.today,DAY=86400000;
 const vd=v=>{const t=String(v||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(t))return '';const n=Date.parse(t+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===t?t:'';};
 const add=(x,n)=>new Date(Date.parse(x+'T00:00:00Z')+n*DAY).toISOString().slice(0,10);
 const days=(a,b)=>Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/DAY);
 const live=r=>r&&r.archived!==true&&r.archived!=='true';
 const s=v=>String(v===null||v===undefined?'':v);
 const progs=(d.programs||[]).filter(live).sort((a,b)=>s(a.name).localeCompare(s(b.name)));
 const PN={};for(const p of d.programs||[])PN[p.id]=s(p.name)||'Unnamed program';
 const pn=id=>id?PN[id]||'Program unavailable':'No program';
 const allItems=d.items||[],items=allItems.filter(live),IN={};for(const x of allItems)IN[x.id]=s(x.name)||'Unnamed item';
 const open=x=>!['done','cancelled'].includes(x.status);
 const kindOf=x=>x.item_type==='milestone'?(x.is_key===true||x.is_key==='true'?'Key milestone':'Milestone'):'Activity';
 const soon=add(today,14),gateWindow=add(today,30),weekAgo=add(today,-6);
 const byDate=(a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name);
 const overdue=items.filter(x=>open(x)&&vd(x.end_date)&&vd(x.end_date)<today).map(x=>({id:x.id,name:s(x.name),program:pn(x.program_id),kind:kindOf(x),date:vd(x.end_date),days:days(vd(x.end_date),today),owner:s(x.owner)})).sort(byDate);
 const decisions=(d.decisions||[]).filter(live),pending=x=>!x.outcome||x.outcome==='pending';
 const due_soon=items.filter(x=>open(x)&&vd(x.end_date)&&vd(x.end_date)>=today&&vd(x.end_date)<=soon).map(x=>({id:x.id,name:s(x.name),program:pn(x.program_id),kind:kindOf(x),date:vd(x.end_date),owner:s(x.owner)}))
  .concat(decisions.filter(x=>pending(x)&&vd(x.target_date)&&vd(x.target_date)>=today&&vd(x.target_date)<=soon).map(x=>({id:x.id,name:s(x.name),program:pn(x.program_id),kind:x.kind==='gate'?'Gate':'Decision',date:vd(x.target_date),owner:s(x.approver)}))).sort(byDate);
 const slips=(d.slips||[]).filter(x=>vd(x.changed_on)&&vd(x.changed_on)>=weekAgo&&vd(x.changed_on)<=today).map(x=>({id:x.id,name:IN[x.plan_item_id]||'Item unavailable',old_end:vd(x.old_end),new_end:vd(x.new_end),days:Number(x.days)||0,reason:s(x.reason),date:vd(x.changed_on)})).sort(byDate);
 const crit=t=>s(t).split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{const m=/^\[(met|not met|open)\]/i.exec(l);return m?m[1].toLowerCase():'open';});
 const gates=decisions.filter(x=>x.kind==='gate'&&pending(x)&&vd(x.target_date)&&vd(x.target_date)>=today&&vd(x.target_date)<=gateWindow).map(x=>{const c=crit(x.criteria);return {id:x.id,name:s(x.name),program:pn(x.program_id),date:vd(x.target_date),met:c.filter(v=>v==='met').length,total:c.length};}).filter(g=>!g.total||g.met<g.total).sort(byDate);
 const reviews=(d.raid||[]).filter(x=>live(x)&&x.status!=='closed'&&vd(x.next_review)&&vd(x.next_review)<today).map(x=>({id:x.id,name:s(x.name),program:pn(x.program_id),kind:s(x.raid_type),date:vd(x.next_review),owner:s(x.owner)})).sort(byDate);
 const stale_health=progs.map(p=>{const h=['green','amber','red'].includes(p.health)?p.health:'unassessed',dt=vd(p.health_date);return {id:p.id,name:s(p.name),health:h,date:dt,age:dt?days(dt,today):null};}).filter(p=>p.health==='unassessed'||!p.date||p.age>45);
 const ud=Math.min(28,Math.max(1,Math.round(Number((d.settings||{}).update_day)||5)));
 const dueMonth=Number(today.slice(8,10))>=ud?today.slice(0,7):(()=>{const y=Number(today.slice(0,4)),m=Number(today.slice(5,7));return m===1?(y-1)+'-12':y+'-'+String(m-1).padStart(2,'0');})();
 const missing_update=progs.filter(p=>(p.status||'active')==='active'&&!(d.updates||[]).some(u=>u.program_id===p.id&&s(u.month).slice(0,7)===dueMonth)).map(p=>({id:p.id,name:s(p.name),month:dueMonth}));
 const programs=progs.map(p=>{const nk=items.filter(x=>x.program_id===p.id&&x.item_type==='milestone'&&(x.is_key===true||x.is_key==='true')&&open(x)&&vd(x.end_date)&&vd(x.end_date)>=today).sort((a,b)=>vd(a.end_date).localeCompare(vd(b.end_date)))[0];
  return {id:p.id,name:s(p.name),stage:s(p.stage),status:s(p.status||'active'),health:['green','amber','red'].includes(p.health)?p.health:'unassessed',health_date:vd(p.health_date)||null,next_key_milestone:nk?{name:s(nk.name),date:vd(nk.end_date)}:null};});
 const attention={overdue,due_soon,slips,gates,reviews,stale_health,missing_update};
 const count=Object.values(attention).reduce((n,l)=>n+l.length,0);
 return {as_of:today,due_soon_days:14,gate_window_days:30,complete:d.complete!==false,programs,attention,count};}
// Plain-text digest (the email without AI, and the AI digest's fallback wording). At most five lines per section.
function digestText(a){const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],dl=x=>x?Number(x.slice(8,10))+' '+M[Number(x.slice(5,7))-1]:'—';
 const L=['Programs · week of '+dl(a.as_of)+': '+a.count+(a.count===1?' item needs':' items need')+' attention'];
 if(!a.complete)L.push('Some Programs data could not be read completely; the lists may be incomplete.');
 const sec=(title,list,line)=>{if(!list.length)return;L.push('',title);for(const x of list.slice(0,5))L.push('· '+line(x));if(list.length>5)L.push('· and '+(list.length-5)+' more');};
 const own=x=>x.owner?', '+x.owner:'';
 sec('Overdue',a.attention.overdue,x=>x.name+' ('+x.program+'), due '+dl(x.date)+', '+x.days+(x.days===1?' day':' days')+' late'+own(x));
 sec('Due in the next 14 days',a.attention.due_soon,x=>x.kind+': '+x.name+' ('+x.program+'), '+dl(x.date)+own(x));
 sec('Slipped this week',a.attention.slips,x=>x.name+': '+dl(x.old_end)+' → '+dl(x.new_end)+' (+'+x.days+' days, '+x.reason.replace(/_/g,' ')+')');
 sec('Gates not ready',a.attention.gates,x=>x.name+' ('+x.program+'), '+dl(x.date)+': '+(x.total?x.met+' of '+x.total+' criteria met':'no criteria yet'));
 sec('Risks and issues past review',a.attention.reviews,x=>x.name+' ('+x.program+'), review was due '+dl(x.date)+own(x));
 sec('Health to assess',a.attention.stale_health,x=>x.name+': '+(x.health==='unassessed'||!x.date?'not assessed':x.health+' since '+dl(x.date)));
 sec('Missing monthly update',a.attention.missing_update,x=>x.name);
 if(a.programs.length){L.push('','Programs');for(const p of a.programs.slice(0,10))L.push('· '+p.name+': '+p.health+(p.next_key_milestone?', next key milestone '+p.next_key_milestone.name+' on '+dl(p.next_key_milestone.date):''));}
 L.push('','Open Programs →');return L.join('\n');}
