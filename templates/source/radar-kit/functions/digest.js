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
/* Coming dates: dated events and tracked dates from this run in the next comingDays, 90 by default (the Overview lists all of them). Three reads in total:
 * each read of a summary function is re-authorized by the platform, so the digest stays small. */
const WINDOW=RADAR.comingDays||90,WLABEL=RADAR.comingLabel||'90 days',end=addDaysTo(TODAY,WINDOW),inWindow=d=>d&&d>=TODAY&&d<=end;
const coming=events.filter(e=>inWindow(briefDate(D(e).occurred_on))).map(e=>({on:briefDate(D(e).occurred_on),title:String(D(e).title||''),est:D(e).expected===true}))
 .concat(RADAR.dateField&&RADAR.dateField.upcoming!==false?changed.filter(r=>inWindow(briefDate(D(r)[RADAR.dateField.key]))).map(r=>({on:briefDate(D(r)[RADAR.dateField.key]),title:itemName(r)+': '+RADAR.dateField.label.toLowerCase(),est:D(r)[RADAR.dateField.estimated]===true})):[])
 .sort((a,b)=>a.on.localeCompare(b.on));
const DS=RADAR.digestSection||{};
const section=DS.source==='items'?[]:events.filter(e=>(DS.kinds||[]).includes(D(e).kind)&&D(e).impact!=='high');
/* Item-based sections (kit 1.1.0): rows this run added or changed, optionally filtered; largest disclosed amounts with totals per currency,
 * or the most frequent values of a field (for example lead investors). */
const itemLines=[];
if(DS.source==='items'){
 let items=changed.filter(r=>D(r).dismissed!==true&&Object.entries(DS.filter||{}).every(([k,v])=>String(D(r)[k])===String(v)));
 if(DS.amountField){items=items.filter(r=>!DS.disclosedField||D(r)[DS.disclosedField]===true).filter(r=>Number.isFinite(Number(D(r)[DS.amountField])));items.sort((a,b)=>Number(D(b)[DS.amountField])-Number(D(a)[DS.amountField]));
  const money=r=>num(D(r)[DS.amountField])+(DS.currencyField&&D(r)[DS.currencyField]?' '+D(r)[DS.currencyField]:'');
  for(const r of items.slice(0,3))itemLines.push(`- ${itemName(r)}: ${money(r)}`);
  const totals={};for(const r of items){const c=DS.currencyField?String(D(r)[DS.currencyField]||''):'';totals[c]=(totals[c]||0)+Number(D(r)[DS.amountField]);}
  const parts=Object.entries(totals).map(([c,v])=>num(v)+(c?' '+c:''));if(parts.length)itemLines.push('- Total disclosed this period: '+parts.join(' · ')+' (currencies are not added together)');}
 else for(const r of items.slice(0,3))itemLines.push(`- ${itemName(r)}${DS.lineField&&D(r)[DS.lineField]?': '+String(D(r)[DS.lineField]).slice(0,200):''}`);
 if(DS.countField){const n={};for(const r of changed)for(const v of String(D(r)[DS.countField]||'').split(',').map(x=>x.trim()).filter(Boolean))n[v]=(n[v]||0)+1;const top=Object.entries(n).sort((a,b)=>b[1]-a[1]).slice(0,3);if(top.length)itemLines.push('- '+(DS.countLabel||'Most frequent')+': '+top.map(([v,c])=>v+' ('+c+')').join(', '));}
}
const report=briefJSON(runRow.sources_report,[]),used=new Set(),unreachable=new Set();
for(const s of Array.isArray(report)?report:[])for(const x of Array.isArray(s&&s.sources)?s.sources:[]){if(x.status==='used')used.add(String(x.name));if(x.status==='not_reachable')unreachable.add(String(x.name));}
const bottom=(String(runRow.summary||run.summary||'').match(/[^.!?]+[.!?]*/g)||[]).slice(0,2).join('').trim().slice(0,320);
const subject=`${RADAR.name} · ${dateText(TODAY)}: ${high.length} high-impact · ${newItems} new · ${coming.length} dates in ${WLABEL}`;
const L=[];
if(bottom)L.push('Bottom line: '+bottom,'');
if(high.length){L.push('High impact');for(const e of high.slice(0,3))L.push(`- ${itemOf(e)}: ${D(e).title}${est(e)}${D(e).so_what?' → for us: '+D(e).so_what:''}${firstUrl(D(e).sources)?' · '+firstUrl(D(e).sources):''}`);L.push('');}
if(section.length){L.push(DS.title);for(const e of section.slice(0,3))L.push(`- ${itemOf(e)}: ${D(e).title}${D(e).occurred_on?' ('+dateText(D(e).occurred_on)+est(e)+')':''}`);L.push('');}
if(itemLines.length){L.push(DS.title);L.push(...itemLines);L.push('');}
if(coming.length){L.push('Coming up ('+WLABEL+')');for(const c of coming.slice(0,3))L.push(`- ${dateText(c.on)}${c.est?' (est.)':''}: ${c.title}`);L.push('');}
if(used.size||unreachable.size)L.push('Coverage: '+[...used].join(', ')+(unreachable.size?' · not reachable: '+[...unreachable].join(', '):''),'');
const open=events.length;
const tail=`Open ${open} new ${open===1?'item':'items'} in ${RADAR.name}: ${PLATFORM_URL}`;
const body=clip(L,RADAR.disclaimer?180:190).concat(RADAR.disclaimer?[RADAR.disclaimer,tail]:[tail]).join('\n').replace(/\n{3,}/g,'\n\n').trim();
return {nonEmpty:true,subject:subject.slice(0,200),text:body};
