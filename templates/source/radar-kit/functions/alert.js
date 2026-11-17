/* alert_summary (BIO_RADAR.md §2.4–2.5): one email per run, only when the run recorded a high-impact event on a watched item.
 * Otherwise nonEmpty is false and nothing is sent. */
const run=input&&input.run||null,runId=run&&run.id?String(run.id):'';
if(!runId)return {nonEmpty:false,text:''};
const high=rowsOfRun('events','run_id',runId).filter(e=>D(e).impact==='high'&&D(e).status!=='dismissed'&&D(e).item_id&&String(D(e).natural_key||'').includes('|'));
const hits=[],seen={};
for(const e of high){
 if(hits.length>=5)break;const id=String(D(e).item_id);
 /* Search matches field values, not record IDs: find the item by its key (the event key's first part), then match the ID. */
 if(!(id in seen)){const rows=readAll('tracker',20,{q:String(D(e).natural_key).split('|')[0]}).rows;const row=rows.find(r=>String(r.id)===id)||null;seen[id]=row&&D(row).watched===true&&D(row).dismissed!==true?row:null;}
 if(seen[id])hits.push({e,item:seen[id]});
}
if(!hits.length)return {nonEmpty:false,text:''};
const first=hits[0],d=D(first.e);
const subject=`${RADAR.name} alert · ${itemName(first.item)}: ${String(d.title||'').slice(0,90)}${hits.length>1?' (+'+(hits.length-1)+' more)':''}`;
const L=[];
for(const h of hits.slice(0,3)){const x=D(h.e);
 L.push(`What happened: ${itemName(h.item)}: ${x.title}${x.occurred_on?' on '+dateText(x.occurred_on):''}${x.expected===true?' (est.)':''}.${firstUrl(x.sources)?' Source: '+firstUrl(x.sources):''}`);
 if(x.so_what)L.push('Why it matters: '+String(x.so_what).slice(0,400));
 L.push('Check next: confirm the change in the source and decide whether your plans for this '+RADAR.itemLabel+' change.','');}
if(hits.length>3)L.push(`${hits.length-3} more high-impact ${hits.length-3===1?'change':'changes'} on watched ${RADAR.itemsLabel}.`,'');
if(RADAR.disclaimer)L.push(RADAR.disclaimer);
L.push(`Open ${RADAR.name} in TrialAgents: ${PLATFORM_URL}`);
return {nonEmpty:true,subject:subject.slice(0,200),text:clip(L,190).join('\n').trim()};
