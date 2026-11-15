/* digest_summary (BIO_RADAR.md §2.5): the digest email for one completed run, written by app code from the rows that run saved.
 * About 200 words, empty sections left out, estimates marked "est.". Sends nothing (nonEmpty false) when the run changed nothing. */
const run=input&&input.run||null,runId=run&&run.id?String(run.id):'';
if(!runId)return {nonEmpty:false,text:''};
const events=rowsOfRun('events','run_id',runId).filter(r=>D(r).status!=='dismissed');
const changed=rowsOfRun('tracker','last_changed_run_id',runId);
if(!events.length&&!changed.length)return {nonEmpty:false,text:''};
const runRow=D(rowsOfRun('runs','run_id',runId)[0]);
const itemsById={};for(const r of changed)itemsById[r.id]=r;
const itemOf=e=>{const id=D(e).item_id;return id&&itemsById[id]?itemName(itemsById[id]):String(D(e).natural_key||'').split('|')[0]||RADAR.itemLabel;};
const est=e=>D(e).expected===true?' (est.)':'';
const newItems=changed.filter(r=>briefJSON(D(r).changed_fields,[]).includes('new')).length;
const high=events.filter(e=>D(e).impact==='high');
/* Coming dates: dated events and tracked dates from this run in the next 90 days (the Overview lists all of them). Three reads in total:
 * each read of a summary function is re-authorized by the platform, so the digest stays small. */
const end=addDaysTo(TODAY,90),inWindow=d=>d&&d>=TODAY&&d<=end;
const coming=events.filter(e=>inWindow(briefDate(D(e).occurred_on))).map(e=>({on:briefDate(D(e).occurred_on),title:String(D(e).title||''),est:D(e).expected===true}))
 .concat(RADAR.dateField?changed.filter(r=>inWindow(briefDate(D(r)[RADAR.dateField.key]))).map(r=>({on:briefDate(D(r)[RADAR.dateField.key]),title:itemName(r)+': '+RADAR.dateField.label.toLowerCase(),est:D(r)[RADAR.dateField.estimated]===true})):[])
 .sort((a,b)=>a.on.localeCompare(b.on));
const section=events.filter(e=>RADAR.digestSection.kinds.includes(D(e).kind)&&D(e).impact!=='high');
const report=briefJSON(runRow.sources_report,[]),used=new Set(),unreachable=new Set();
for(const s of Array.isArray(report)?report:[])for(const x of Array.isArray(s&&s.sources)?s.sources:[]){if(x.status==='used')used.add(String(x.name));if(x.status==='not_reachable')unreachable.add(String(x.name));}
const bottom=(String(runRow.summary||run.summary||'').match(/[^.!?]+[.!?]*/g)||[]).slice(0,2).join('').trim().slice(0,320);
const subject=`${RADAR.name} · ${dateText(TODAY)}: ${high.length} high-impact · ${newItems} new · ${coming.length} dates in 90 days`;
const L=[];
if(bottom)L.push('Bottom line: '+bottom,'');
if(high.length){L.push('High impact');for(const e of high.slice(0,3))L.push(`- ${itemOf(e)}: ${D(e).title}${est(e)}${D(e).so_what?' → for us: '+D(e).so_what:''}${firstUrl(D(e).sources)?' · '+firstUrl(D(e).sources):''}`);L.push('');}
if(section.length){L.push(RADAR.digestSection.title);for(const e of section.slice(0,3))L.push(`- ${itemOf(e)}: ${D(e).title}${D(e).occurred_on?' ('+dateText(D(e).occurred_on)+est(e)+')':''}`);L.push('');}
if(coming.length){L.push('Coming up (90 days)');for(const c of coming.slice(0,3))L.push(`- ${dateText(c.on)}${c.est?' (est.)':''}: ${c.title}`);L.push('');}
if(used.size||unreachable.size)L.push('Coverage: '+[...used].join(', ')+(unreachable.size?' · not reachable: '+[...unreachable].join(', '):''),'');
const open=events.length;
const tail=`Open ${open} new ${open===1?'item':'items'} in ${RADAR.name}: ${PLATFORM_URL}`;
const body=clip(L,190).concat([tail]).join('\n').replace(/\n{3,}/g,'\n\n').trim();
return {nonEmpty:true,subject:subject.slice(0,200),text:body};
