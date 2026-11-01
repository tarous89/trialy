import React from 'react';
const weekdays=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const localDate=(zone:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function scheduleLabel(t:any){
 if(!t)return 'Not configured';
 if(t.kind==='calendar'){
  const f=t.frequency??(t.weekdays?.length===7?'daily':'weekly'),n=t.interval??1;
  const cadence=n===1?({daily:'Daily',weekly:'Weekly',monthly:'Monthly'} as any)[f]:`Every ${n} ${({daily:'days',weekly:'weeks',monthly:'months'} as any)[f]}`;
  const detail=f==='weekly'?(t.weekdays??[]).map((n:number)=>weekdays[n].slice(0,3)).join(', '):f==='monthly'?`Day ${t.monthDay??1}`:'';
  return [cadence,detail,t.time,t.timeZone].filter(Boolean).join(' · ');
 }
 if(t.kind==='database')return t.becomes?`When ${t.becomes.field} ${t.becomes.operator.replaceAll('_',' ')}${t.becomes.value===undefined?'':' '+String(t.becomes.value)}`:'When an entry is added';
 if(t.kind==='once')return 'Once · '+new Date(t.at).toLocaleString();
 if(t.kind==='record_date')return 'Date in an entry';
 if(t.kind==='after_success')return 'After processing';
 if(t.kind==='interval')return 'Recurring schedule — update required';
 return 'After processing';
}
export function AutomationScheduleEditor({value:t,onChange,executor,bindings=[]}:{value:any;onChange:(v:any)=>void;executor:string;bindings:any[]}){
 const zone=t.timeZone??Intl.DateTimeFormat().resolvedOptions().timeZone,day=localDate(zone),binding=bindings.find(b=>b.typeId===t.typeId);
 const fieldName=(b:any,key:string)=>b?.fieldLabels?.[key]??key;
 const fieldKind=binding?.fieldKinds?.[t.becomes?.field],initialValue=(key:string)=>binding?.fieldKinds?.[key]==='boolean'?false:['number','money'].includes(binding?.fieldKinds?.[key])?0:'';
 const calendar={kind:'calendar',frequency:'daily',time:'06:00',timeZone:zone,anchor:day,interval:1,weekdays:[new Date().getDay()],monthDay:Number(day.slice(-2)),monthEnd:'last_day'};
 const mode=['calendar','database'].includes(t.kind)?t.kind:'existing';
 const set=(key:string,value:any)=>onChange({...t,[key]:value});
 return <fieldset className="ty-automation-fields"><legend>When to run</legend>
 <label>Trigger<select aria-label="Trigger" value={mode} onChange={e=>onChange(e.target.value==='calendar'?calendar:{kind:'database',typeId:bindings[0]?.typeId??'',events:['created'],fields:[]})}><option value="calendar">On a schedule</option><option value="database">When app data changes</option>{mode==='existing'&&<option value="existing">{scheduleLabel(t)}</option>}</select></label>
 {mode==='existing'&&<p className="ty-automation-help">{t.kind==='manual'?'Runs after the linked processing finishes.':t.kind==='interval'?'Choose a daily or less frequent schedule before saving.':'This existing trigger is retained. Choose a schedule or app condition to change it.'}</p>}
 {t.kind==='calendar'&&<>
 <label>Frequency<select aria-label="Frequency" value={t.frequency??'weekly'} onChange={e=>onChange({...t,frequency:e.target.value,anchor:t.anchor??day,weekdays:t.weekdays??[new Date().getDay()]})}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
 <label>Every<input required type="number" min={1} max={52} value={t.interval??1} onChange={e=>set('interval',Number(e.target.value))}/><span>{t.frequency==='monthly'?'months':t.frequency==='weekly'?'weeks':'days'}</span></label>
 {(t.frequency??'weekly')==='weekly'&&t.weekdays?.length>1&&<p className="ty-automation-help">Current days: {t.weekdays.map((n:number)=>weekdays[n]).join(', ')}. Selecting a day replaces this selection.</p>}
 {(t.frequency??'weekly')==='weekly'&&<label>Day<select aria-label="Day" value={t.weekdays?.[0]??1} onChange={e=>set('weekdays',[Number(e.target.value)])}>{weekdays.map((d,i)=><option key={d} value={i}>{d}</option>)}</select></label>}
 {t.frequency==='monthly'&&<label>Day of month<input required type="number" min={1} max={31} value={t.monthDay??1} onChange={e=>set('monthDay',Number(e.target.value))}/></label>}
 <label>Time<input required type="time" value={t.time} onChange={e=>set('time',e.target.value)}/></label><p className="ty-automation-help">Times use {zone}.{executor==='trialagents'?' Scheduled emails run at most once a day.':''}</p>
 </>}
 {t.kind==='database'&&<>
 <label>Table<select aria-label="Table" required value={t.typeId} onChange={e=>onChange({...t,typeId:e.target.value,fields:[],becomes:undefined,events:['created']})}><option value="">Select a table</option>{bindings.map(b=><option key={b.typeId} value={b.typeId}>{b.name??'App table'}</option>)}</select></label>
 <label>When<select aria-label="When" value={t.becomes?'condition':'created'} onChange={e=>onChange({...t,events:e.target.value==='created'?['created']:['created','updated'],fields:[],becomes:e.target.value==='condition'?{field:binding?.fields[0]??'',operator:'equals',value:initialValue(binding?.fields[0])}:undefined})}><option value="created">An entry is added</option><option value="condition">A field meets a condition</option></select></label>
 {t.becomes&&<><label>Field<select aria-label="Field" required value={t.becomes.field} onChange={e=>set('becomes',{...t.becomes,field:e.target.value,value:initialValue(e.target.value)})}>{binding?.fields.map((key:string)=><option key={key} value={key}>{fieldName(binding,key)}</option>)}</select></label><label>Condition<select aria-label="Condition" value={t.becomes.operator} onChange={e=>set('becomes',{...t.becomes,operator:e.target.value})}><option value="equals">Equals</option><option value="not_equals">Does not equal</option><option value="not_empty">Has a value</option><option value="empty">Is empty</option></select></label>{['equals','not_equals'].includes(t.becomes.operator)&&<label>Value{fieldKind==='boolean'?<select value={String(t.becomes.value??false)} onChange={e=>set('becomes',{...t.becomes,value:e.target.value==='true'})}><option value="true">Yes</option><option value="false">No</option></select>:<input type={['number','money'].includes(fieldKind)?'number':fieldKind==='date'?'date':'text'} value={String(t.becomes.value??'')} onChange={e=>set('becomes',{...t.becomes,value:['number','money'].includes(fieldKind)&&e.target.value!==''?Number(e.target.value):e.target.value})}/>}</label>}</>}
 </>}
 </fieldset>;
}
