export type Schedule={kind:'daily';time:string;timeZone:string}|{kind:'records.changed'|'documents.saved'};
export function localDay(now:Date,timeZone:string){const p=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);return ['year','month','day'].map(k=>p.find(p=>p.type===k)!.value).join('-');}
export function nextDaily(schedule:{time:string;timeZone:string},after:Date){
 const [hour,minute]=schedule.time.split(':').map(Number),fmt=new Intl.DateTimeFormat('en-GB',{timeZone:schedule.timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 // Search instants, so DST gaps are skipped and ambiguous times run only once per local date.
 const today=localDay(after,schedule.timeZone),current=fmt.format(after),skipToday=current>=schedule.time;
 const start=Math.floor(after.getTime()/60000)*60000+60000;
 for(let i=0;i<3*24*60;i++){const date=new Date(start+i*60000),parts=fmt.formatToParts(date);if(Number(parts.find(p=>p.type==='hour')!.value)===hour&&Number(parts.find(p=>p.type==='minute')!.value)===minute&&(!skipToday||localDay(date,schedule.timeZone)!==today))return date;}
 throw Error('No scheduled occurrence in the next three days');
}
