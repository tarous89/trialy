/* Contracts 1.1.0 — "Contracts: actions needed" weekly email summary (read-only summary function, binding name `actions_summary`).
 * Deterministic: no AI. Lists agreement names that need action; returns {nonEmpty:false} when nothing does, so no email is sent.
 * Setup (once, after the app is saved): replace __TABLE_MAP__ with the saved app's `tableMap` configuration value (the same JSON the
 * app uses), prepare this function with scope.capabilities ['records.read'] and scope.typeIds = the typeIds of agreements,
 * organizations, contracts.settings, contracts.terms and contracts.obligations in that map, and bind it to the app as `actions_summary`.
 * Rules match the app (README "Calculation contract"): notice deadline = expiry − notice days (renewal automatic or option).
 */
const TABLE_MAP=__TABLE_MAP__;
const ROLE={agreements:'agreements',organizations:'organizations',settings:'contracts.settings',terms:'contracts.terms',obligations:'contracts.obligations'};
const PENDING={drafting:'Drafting',in_negotiation:'In negotiation',out_for_signature:'Out for signature'};
const STEP={monthly:1,quarterly:3,annual:12};
const validDate=v=>{const t=String(v||'').slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(t)&&Number.isFinite(new Date(t+'T00:00:00Z').getTime())?t:'';};
const dayNo=d=>Math.round(Date.UTC(Number(d.slice(0,4)),Number(d.slice(5,7))-1,Number(d.slice(8,10)))/86400000);
const addDays=(d,n)=>new Date((dayNo(d)+n)*86400000).toISOString().slice(0,10);
function addMonthsDate(d,n){const y=Number(d.slice(0,4)),m=Number(d.slice(5,7))-1+n,day=Number(d.slice(8,10)),yy=y+Math.floor(m/12),mm=((m%12)+12)%12,last=new Date(Date.UTC(yy,mm+1,0)).getUTCDate();return yy+'-'+String(mm+1).padStart(2,'0')+'-'+String(Math.min(day,last)).padStart(2,'0');}
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const label=d=>Number(d.slice(8,10))+' '+MONTHS[Number(d.slice(5,7))-1]+' '+d.slice(0,4);
const num=v=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v))?Number(v):null;
const bool=v=>v===true||v==='true';

let partial=false;
function read(role){const m=TABLE_MAP[ROLE[role]];if(!m||!m.typeId){partial=true;return [];}const rows=[];
 for(let offset=0,page=0;page<8;page++){let p;try{p=tools.call('records.read',{typeId:m.typeId,limit:100,offset});}catch(e){partial=true;break;}
  const chunk=p&&Array.isArray(p.rows)?p.rows:[];for(const r of chunk){const data={};for(const [k,real] of Object.entries(m.fields||{}))data[k]=r.data?r.data[real]:undefined;rows.push({id:String(r.id),data});}
  offset+=chunk.length;if(chunk.length<100||(num(p.total)!==null&&offset>=num(p.total)))break;if(page===7)partial=true;}
 return rows.filter(r=>!bool(r.data.archived));}

const today=validDate(input&&input.asOf)||new Date().toISOString().slice(0,10);
const ags=read('agreements'),orgs=read('organizations'),terms=read('terms'),obs=read('obligations'),settings=read('settings')[0];
const windowDays=(()=>{const l=String((settings&&settings.data.reminder_days)||'30').split(',').map(x=>Math.round(Number(x))).filter(n=>n>=1&&n<=365).sort((a,b)=>a-b);return l[0]||30;})();
const org=id=>{const o=orgs.find(x=>x.id===id);return o?String(o.data.name||''):'';};
const AG=Object.fromEntries(ags.map(a=>[a.id,a.data]));
const TERMS={};for(const t of terms.slice().sort((a,b)=>a.id.localeCompare(b.id))){const k=String(t.data.agreement_id||'');if(k&&!TERMS[k])TERMS[k]=t.data;}
const name=id=>{const a=AG[id];if(!a)return '';const n=String(a.name||'Unnamed agreement'),o=org(a.counterparty_id);return o&&!n.includes(o)?n+' ('+o+')':n;};
const soon=(d,days)=>!!d&&d>=today&&d<=addDays(today,days);

const pending=[],deadlines=[],check=[];
for(const a of ags){const d=a.data,t=TERMS[a.id]||{};
 if(PENDING[d.status]){const since=validDate(t.status_since);pending.push({sort:d.name,text:'- '+name(a.id)+': '+PENDING[d.status]+(since?', since '+label(since)+' ('+(dayNo(today)-dayNo(since))+' days)':'')});}
 if(d.status!=='active')continue;
 const expiry=validDate(d.expiry_date),n=num(t.notice_days);
 const notice=expiry&&n!==null&&['automatic','option'].includes(t.renewal)?addDays(expiry,-n):'';
 if(soon(notice,windowDays))deadlines.push({sort:notice,text:'- '+name(a.id)+': notice deadline '+label(notice)+(t.renewal==='automatic'?' (renews automatically'+(num(t.renewal_term_months)?' for '+num(t.renewal_term_months)+' months':'')+')':' (renewal option)')});
 else if((!t.renewal||t.renewal==='none')&&soon(expiry,30))deadlines.push({sort:expiry,text:'- '+name(a.id)+': expires '+label(expiry)});
 if(t.extraction_status==='proposed')check.push({sort:d.name,text:'- '+name(a.id)+': key terms not yet checked'});}
for(const o of obs){const d=o.data;if(!AG[d.agreement_id])continue;const due=validDate(d.due_date);
 if(!bool(d.verified))check.push({sort:String(AG[d.agreement_id].name||''),text:'- '+name(d.agreement_id)+': obligation “'+String(d.title||'')+'” not yet checked'});
 if(d.status!=='open'||!due)continue;let next=due;const step=STEP[d.recurrence];
 if(step&&due<today){let k=0;while(next<today&&k<400){k++;next=addMonthsDate(due,k*step);}}
 if(!step&&due<today)deadlines.push({sort:due,text:'- '+name(d.agreement_id)+': '+String(d.title||'Obligation')+' overdue since '+label(due)});
 else if(soon(next,7))deadlines.push({sort:next,text:'- '+name(d.agreement_id)+': '+String(d.title||'Obligation')+' due '+label(next)});}

const by=(a,b)=>String(a.sort).localeCompare(String(b.sort));
const parts=[];
if(deadlines.length)parts.push('Deadlines ('+deadlines.length+')\n'+deadlines.sort(by).slice(0,60).map(x=>x.text).join('\n'));
if(pending.length)parts.push('Waiting for signature ('+pending.length+')\n'+pending.sort(by).slice(0,60).map(x=>x.text).join('\n'));
if(check.length)parts.push('To check ('+check.length+')\n'+check.sort(by).slice(0,60).map(x=>x.text).join('\n'));
if(!parts.length)return {nonEmpty:false,text:''};
const total=deadlines.length+pending.length+check.length;
return {nonEmpty:true,subject:'Contracts: '+total+' action'+(total===1?'':'s')+' needed',text:'Contracts that need action, as of '+label(today)+'.\n\n'+parts.join('\n\n')+(partial?'\n\nNote: not every table could be read completely; this list may be incomplete.':'')+'\n\nOpen Contracts in TrialAgents for details.'};
