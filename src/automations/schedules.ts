import type {AutomationSchedule} from './schema.js';
import {localDay} from '../shared/schedules.js';
const formatters=new Map<string,Intl.DateTimeFormat>();
function parts(date:Date,zone:string){let f=formatters.get(zone);if(!f){f=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});if(formatters.size>100)formatters.clear();formatters.set(zone,f);}return Object.fromEntries(f.formatToParts(date).map(p=>[p.type,p.value]));}
// Resolve calendar time using candidate UTC offsets. Gaps move forward; folds run once.
export function localInstant(day:string,time:string,zone:string):Date{
 const target=Date.parse(day+'T'+time+':00Z');
 const offsets=new Set<number>();for(const delta of [-36,0,36]){const t=target+delta*3600000,p=parts(new Date(t),zone);offsets.add(Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`)-t);}
 for(let minutes=0;minutes<=180;minutes++){
  const wanted=new Date(target+minutes*60000).toISOString().slice(0,16),matches:number[]=[];
  for(const offset of offsets){const candidate=target+minutes*60000-offset,p=parts(new Date(candidate),zone);if(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`===wanted)matches.push(candidate);}
  if(matches.length)return new Date(Math.min(...matches));
 }
 throw Error('Calendar time could not be resolved');
}
export function nextCalendar(s:Extract<AutomationSchedule,{kind:'calendar'}>,after:Date):Date{
 const first=Date.parse(localDay(after,s.timeZone)+'T00:00:00Z'),anchor=new Date(s.anchor+'T00:00:00Z');
 for(let n=0;n<3700;n++){
  const d=new Date(first+n*86400000),day=d.toISOString().slice(0,10);if(day<s.anchor)continue;
  const elapsed=Math.round((d.getTime()-anchor.getTime())/86400000),weekStart=anchor.getTime()-((anchor.getUTCDay()+6)%7)*86400000;
  const months=(d.getUTCFullYear()-anchor.getUTCFullYear())*12+d.getUTCMonth()-anchor.getUTCMonth();
  const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
  const eligible=s.frequency==='daily'?elapsed%s.interval===0:s.frequency==='weekly'?Math.floor((d.getTime()-weekStart)/604800000)%s.interval===0&&s.weekdays.includes(d.getUTCDay()):months%s.interval===0&&d.getUTCDate()===(s.monthEnd==='last_day'?Math.min(last,s.monthDay):s.monthDay);
  if(eligible){const at=localInstant(day,s.time,s.timeZone);if(at>after)return at;}
 }
 throw Error('Schedule exceeds supported horizon');
}
export function initialDue(s:AutomationSchedule,now:Date):Date|null{
 if(s.kind==='calendar')return nextCalendar(s,new Date(now.getTime()-1));
 if(s.kind==='once')return new Date(s.at);
 return now;
}
export function dailyDue(time:string,zone:string,after:Date){return nextCalendar({kind:'calendar',frequency:'daily',time,timeZone:zone,anchor:localDay(after,zone),interval:1,weekdays:[1],monthDay:1,monthEnd:'last_day'},after);}
