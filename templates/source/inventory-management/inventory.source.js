/* Inventory Management v1.0.2 | TrialAgents frontend-js function body.
 * Use native host tracker:layout; data proposal requires platform confirmation.
 * No auth, browser APIs, timers, network, local record persistence or provider calls.
 */
const cfg=typeof templateConfiguration==='object'&&templateConfiguration?templateConfiguration:{};
const inp=input||{}, ev=inp.event||{}, act=String(ev.action||'');
const bindings=Array.isArray(templateBindings)?templateBindings:[];
const E=v=>String(v===undefined||v===null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const N=(v,fallback=null)=>!Array.isArray(v)&&typeof v!=='object'&&typeof v!=='boolean'&&v!==undefined&&v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):fallback;
const short=(v,len=200)=>String(v??'').slice(0,len);
const B=v=>v===true||v==='true'||v===1||v==='1';
const dec=(v,p=1)=>v===null||!Number.isFinite(Number(v))?'—':Number(v).toFixed(p).replace(/\.0$/,'');
const money=(v,c='EUR')=>v===null||!Number.isFinite(Number(v))?'—':c+' '+Number(v).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,',');
const dt=v=>{const q=String(v||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(q))return '';const d=new Date(q+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===q?q:'';};
const addDays=(s,n)=>{if(!dt(s))return '';const d=new Date(s+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const today=dt(cfg.asOfDate)||new Date().toISOString().slice(0,10);
const month=s=>String(s||'').slice(0,7);
const addMonth=(ym,n)=>{if(!/^\d{4}-\d{2}$/.test(ym))return '';const [y,m]=ym.split('-').map(Number);return new Date(Date.UTC(y,m-1+n,1)).toISOString().slice(0,7)};
const monthText=ym=>{if(!ym)return '—';const i=Number(ym.slice(5,7));return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i-1]+' '+ym.slice(2,4)};
const iconName={overview:'<path d="M3 3v18h18M7 15l4-5 3 2 5-7"/>',items:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M8 4v16"/>',movements:'<path d="M3 7h17m-5-5 5 5-5 5M21 17H4m5-5-5 5 5 5"/>',locations:'<path d="M5 21V7l7-4 7 4v14M5 12h14M10 21v-5h4v5"/>',requests:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',forecast:'<path d="M3 3v18h18m-15-4 5-5 3 2 6-8"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M4.9 4.9 7 7m10 10 2 2M2 12h3m14 0h3M5 19l2-2M17 7l2-2"/>',plus:'<path d="M12 5v14M5 12h14"/>',arrow:'<path d="m9 18 6-6-6-6"/>',close:'<path d="M5 5 19 19M19 5 5 19"/>',therm:'<path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>'};
const I=(name,size=18)=>'<svg aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(iconName[name]||iconName.items)+'</svg>';
const button=(label,action,cl='',disabled=false,extra='')=>'<button type="button" class="'+cl+'" data-action="'+E(action)+'" '+(disabled?'disabled':'')+' '+extra+'>'+label+'</button>';
const chip=(txt,tone='')=>'<span class="iv-tag '+tone+'">'+E(txt||'—')+'</span>';
const roles={
 items:[['name','Item name','text',1],['sku','Item / catalog no.','text',1],['category','Category','select',0,['Reagent','Consumable','Equipment','Chemical','Other']],['unit','Stock unit','text',1],['reorder_point','Reorder minimum','number',0],['target_level','Target stock','number',0],['supplier','Supplier','text',0],['lead_days','Lead time (days)','number',0],['owner','Responsible person','text',0],['notes','Notes','text',0],['archived','Archived','boolean',0]],
 lots:[['name','Lot label','text',1],['item_id','Inventory item','relation-items',1],['lot_code','Manufacturer lot','text',1],['expiry','Expiry date','date',0],['location_id','Default storage location','relation-locations',1],['received_date','Receipt date','date',0],['storage_note','Storage conditions','text',0],['stock_revision','Stock posting counter','number',0],['archived','Archived','boolean',0]],
 movements:[['name','Movement reference','text',1],['item_id','Inventory item','relation-items',1],['lot_id','Nonhuman lot','relation-lots',1],['kind','Movement type','select',1,['Receipt','Use','Transfer','Disposal','Correction In','Correction Out']],['quantity','Quantity','number',1],['unit','Unit','text',1],['from_location_id','From location','relation-locations',0],['to_location_id','To location','relation-locations',0],['date','Recorded date','date',1],['reason','Reason / evidence','text',0],['request_id','Related request','relation-requests',0],['reversal_of','Reverses movement ID','text',0]],
 locations:[['name','Location name','text',1],['parent_id','Parent location','relation-locations',0],['kind','Area type','select',0,['Room','Cabinet','Freezer','Shelf','Other']],['temperature','Storage conditions','text',0],['owner','Responsible person','text',0],['access_note','Access note','text',0],['archived','Archived','boolean',0]],
 requests:[['name','Request purpose','text',1],['item_id','Inventory item','relation-items',1],['quantity','Quantity needed','number',1],['unit','Unit','text',1],['status','Approval status','select',1,['Requested','Reviewed','Approved','Ordered','Received','Declined']],['needed_by','Needed by','date',1],['estimated_cost','Est. cost','number',0],['currency','Currency','text',0],['owner','Request owner','text',0],['notes','Notes','text',0],['archived','Archived','boolean',0]]
};
const screens=[{id:'overview',label:'Overview',desc:'Stock availability, expiries and next actions'},{id:'items',label:'Inventory',desc:'Every nonhuman reagent and consumable, linked to lots'},{id:'movements',label:'Stock movements',desc:'Receipts, usage, transfers and corrections'},{id:'locations',label:'Storage locations',desc:'Rooms, freezers and shelves'},{id:'requests',label:'Purchase requests',desc:'Simple internal replenishment approval'},{id:'forecast',label:'Stock forecast',desc:'Usage-based reorder planning'}];
const defaultCols={items:['name','category','usable','reorder_point','availability','supplier'],lots:['name','item_id','lot_code','expiry','location_id'],movements:['date','name','kind','item_id','lot_id','quantity','unit'],locations:['name','kind','temperature','owner'],requests:['name','item_id','quantity','status','needed_by','owner']};
let tm={};try{tm=JSON.parse(cfg.tableMap||'{}')||{}}catch(e){};
const mapped={};for(const role of Object.keys(roles)){
 const m=tm[role],b=m&&bindings.find(x=>x.typeId===m.typeId);if(!m||!b)continue;
 let allowed={};for(const f of roles[role]){const phys=m.fields&&m.fields[f[0]];if(typeof phys==='string'&&(b.fields||[]).includes(phys))allowed[f[0]]=phys;}
 if(allowed.name)mapped[role]={typeId:m.typeId,fields:allowed,writable:Array.isArray(m.writableFields)?m.writableFields:[]};
}
// A confirmed complete empty table is different from an unavailable, partial, or truncated read.
const requiredCoverage={
 items:['name','sku','unit','reorder_point','target_level','archived'],
 lots:['name','item_id','lot_code','location_id','expiry','archived','stock_revision'],
 movements:['name','item_id','lot_id','kind','quantity','unit','from_location_id','to_location_id','date','reversal_of'],
 locations:['name','parent_id','archived'],
 requests:['name','item_id','status','quantity','unit','needed_by','archived']
};
const data={};function read(role){
 if(data[role])return data[role];const m=mapped[role];
 if(!m)return data[role]={rows:[],complete:false,unbound:true,total:null,issue:'Missing authorized table binding'};
 const missing=requiredCoverage[role].filter(k=>!m.fields[k]);
 let rows=[],offset=0,total=null,complete=false,issue=missing.length?'Missing mapped fields: '+missing.join(', '):'';
 for(let i=0;i<8;i++){
  let r;try{r=tools.call('records.read',{typeId:m.typeId,offset,limit:100,filters:{}});}catch(e){issue='Authorized read failed';break;}
  if(!r||r.unavailable){issue='Authorized read unavailable';break;}
  if(!Array.isArray(r.rows)){issue='Read returned no verified row array';break;}
  if(!Number.isInteger(r.total)||r.total<0){issue='Unknown or invalid source total';break;}
  if(total!==null&&r.total!==total){issue='Source changed during paginated read';break;}
  total=r.total;
  const batch=r.rows;
  if(batch.length>100||offset+batch.length>total){issue='Inconsistent page bounds';break;}
  for(const record of batch){
   const raw=record.data||{},o={};
   for(const [logical,physical] of Object.entries(m.fields))if(Object.prototype.hasOwnProperty.call(raw,physical))o[logical]=raw[physical];
   if(!record.id||!Number.isInteger(record.version))issue='Record identity/version missing';if(role==='lots'&&o.expiry&&!dt(o.expiry))issue='Invalid lot expiry date';
   if(Object.values(o).some(v=>v!==null&&typeof v==='object'))issue='Expected scalar field values';
   if(role==='lots'&&(!Number.isSafeInteger(o.stock_revision)||o.stock_revision<0))issue='Missing or invalid stock posting counter';
   if(!B(o.archived)){
    for(const field of roles[role].filter(f=>f[3]).map(f=>f[0]))if(o[field]===undefined||o[field]===null||o[field]==='')issue='Required source field missing: '+field;
    rows.push({id:record.id,version:record.version,data:o});
   }
  }
  offset+=batch.length;
  if(offset===total){complete=true;break;}
  if(batch.length===0||batch.length<100){issue='Short page before source total';break;}
 }
 if(total!==null&&offset<total&&!issue)issue='Source exceeds 800-row read budget';
 if(issue)complete=false;
 return data[role]={rows,complete,unbound:false,total,issue};
}
function requireSources(names){for(const role of names){const v=read(role);if(!v.complete)throw Error('Complete authorized '+role+' records are required: '+(v.issue||'partial source'));}}
const items=read('items'),lots=read('lots'),movements=read('movements'),locations=read('locations'),requests=read('requests');
// Foreign-key checks are necessary because text record IDs are not SQL foreign keys.
const relationIssues=[];
for(const l of lots.rows){if(!items.rows.some(i=>i.id===l.data.item_id)||!locations.rows.some(x=>x.id===l.data.location_id))relationIssues.push('Lot has unresolved item or location: '+l.id);}
for(const r of requests.rows){if(!items.rows.some(i=>i.id===r.data.item_id))relationIssues.push('Request has unresolved item: '+r.id);}
for(const x of locations.rows){if(x.data.parent_id&&!locations.rows.some(l=>l.id===x.data.parent_id))relationIssues.push('Location parent missing: '+x.id);}
const logicalLotKeys=new Set(),logicalItemKeys=new Set();
for(const l of lots.rows){const k=String(l.data.item_id||'')+'|'+String(l.data.lot_code||'').trim().toLowerCase();if(logicalLotKeys.has(k))relationIssues.push('Duplicate item/lot identity: '+k);logicalLotKeys.add(k);}
for(const i of items.rows){const k=String(i.data.sku||'').trim().toLowerCase()+'|'+String(i.data.supplier||'').trim().toLowerCase();if(logicalItemKeys.has(k))relationIssues.push('Duplicate item/supplier catalog identity: '+k);logicalItemKeys.add(k);}
const allComplete=items.complete&&lots.complete&&movements.complete&&locations.complete&&requests.complete&&relationIssues.length===0;
const lookup=(role,id)=>read(role).rows.find(x=>x.id===id);
const label=(role,id)=>lookup(role,id)?.data.name||(!id?'—':'Unknown / restricted');
let layout={};try{layout=JSON.parse(cfg.layoutProfile||'{}')||{}}catch(e){};
let validTabs=Array.isArray(layout.tabs)?layout.tabs.filter(k=>screens.some(s=>s.id===k)):screens.map(s=>s.id);validTabs=[...new Set(validTabs.concat(screens.map(x=>x.id)))];const visible=layout.visible||{};
const activeTabs=validTabs.filter(x=>visible[x]!==false);
const configCols=(role)=>{const valid=roles[role].map(x=>x[0]).concat(role==='items'?['usable','availability']:[]);const c=Array.isArray(layout.cols?.[role])?layout.cols[role]:defaultCols[role];return [...new Set(c.filter(k=>valid.includes(k)).concat(defaultCols[role]))].filter(k=>visible[role+':'+k]!==false)};
let st=JSON.parse(JSON.stringify(inp.state||{}));st.route=activeTabs.includes(st.route)?st.route:(activeTabs[0]||'overview');st.query=short(st.query||'',120);st.filter=String(st.filter||'all');st.subFilter=String(st.subFilter||'all');st.page=Math.max(0,N(st.page,0));st.menu=String(st.menu||'');st.moveDraft=st.moveDraft||{};st.detail=st.detail||null;st.editor=st.editor||null;st.dialog=st.dialog||null;
const write=(role,keys)=>Boolean(inp.saved&&inp.writable&&cfg.readOnly!==true&&mapped[role]&&keys.every(k=>mapped[role].fields[k]&&mapped[role].writable.includes(k)));
const warn=(msg)=>st.notice=short(msg,330);
const propose=(changes,msg)=>{tools.call('records.propose',changes);warn(msg||'Changes prepared for TrialAgents review. No record is saved until confirmation.');};
const rowsFor=role=>read(role).rows;
const movementSort=(a,b)=>String(a.data.date||'').localeCompare(String(b.data.date||''));
function ledgerStock(){
 let map={},faults=[],completeness=allComplete&&!invalidAsOf;if(invalidAsOf)faults.push('Invalid configured as-of date');if(relationIssues.length)faults.push(...relationIssues);
 let day=null;const checkDay=()=>{for(const v of Object.values(map))if(v < -0.000001){faults.push('Negative end-of-day balance at '+day);completeness=false;}};
 for(const m of [...movements.rows].sort(movementSort)){
  if(day!==m.data.date){if(day)checkDay();day=m.data.date;}
  const d=m.data,q=N(d.quantity),it=lookup('items',d.item_id),lot=lookup('lots',d.lot_id);
  if(!it||!lot||!it.data.unit||lot.data.item_id!==m.data.item_id||q===null||q<=0||d.unit!==it.data.unit||!dt(d.date)||d.date>asOf){faults.push('Invalid or unlinked movement '+m.id);completeness=false;continue;}
  const from=d.from_location_id,to=d.to_location_id;
  let deltas=[];if(d.kind==='Receipt'||d.kind==='Correction In'){if(!lookup('locations',to)){faults.push('No destination in '+m.id);completeness=false;continue;}deltas=[[to,q]];}
  else if(d.kind==='Use'||d.kind==='Disposal'||d.kind==='Correction Out'){if(!lookup('locations',from)){faults.push('No source in '+m.id);completeness=false;continue;}deltas=[[from,-q]];}
  else if(d.kind==='Transfer'){if(from===to||!lookup('locations',from)||!lookup('locations',to)){faults.push('Invalid transfer '+m.id);completeness=false;continue;}deltas=[[from,-q],[to,q]];}
  else{faults.push('Unknown movement type '+m.id);completeness=false;continue;}
  for(const [loc,delta] of deltas){let key=d.lot_id+'|'+loc;map[key]=N(map[key],0)+delta;}
 }
 checkDay();
 for(const [k,v] of Object.entries(map))if(v < -0.000001){completeness=false;faults.push('Negative ledger balance for '+k)}
 return {map,complete:completeness,faults};
}
const invalidAsOf=Boolean(cfg.asOfDate)&&!dt(cfg.asOfDate);const asOf=dt(cfg.asOfDate)||today;
const stock=ledgerStock();
function itemStock(id,{usable=true,location=null}={}){
 let sum=0;for(const lot of lots.rows.filter(x=>x.data.item_id===id)){
  if(usable&&dt(lot.data.expiry)&&lot.data.expiry<asOf)continue;
  for(const [key,q] of Object.entries(stock.map))if(key.startsWith(lot.id+'|')&&(!location||key===lot.id+'|'+location))sum+=q;
 }
 return stock.complete?sum:null;
}
const lotQuantity=(lotId,location=null)=>{let sum=0;for(const [key,q] of Object.entries(stock.map))if(key.startsWith(lotId+'|')&&(!location||key===lotId+'|'+location))sum+=q;return stock.complete?sum:null};
const lotExpired=lot=>Boolean(dt(lot.data.expiry)&&lot.data.expiry<asOf);
function lowStockRows(){if(!stock.complete)return [];return items.rows.map(x=>({r:x,balance:itemStock(x.id),min:N(x.data.reorder_point)})).filter(x=>x.min!==null&&x.balance!==null&&x.balance<x.min).sort((a,b)=>((a.balance/a.min)||(0))-((b.balance/b.min)||(0)));}
const lows=lowStockRows();
const expiring=stock.complete?lots.rows.filter(l=>dt(l.data.expiry)&&l.data.expiry>=asOf&&l.data.expiry<=addDays(asOf,30)&&lotQuantity(l.id)>0):[];
const reqOpen=requests.complete?requests.rows.filter(x=>!['Received','Declined'].includes(x.data.status)):[];
// Editors intentionally expose all fields regardless of table column visibility; required inputs are always reachable.
const listColumns=role=>roles[role].reduce((obj,f)=>({...obj,[f[0]]:f[1]}),{});
const fmtAmount=(v,unit)=>v===null?'—':dec(v,2)+' '+E(unit||'');
function rowMenu(role,r){const id=role+':'+r.id,open=st.menu===id;let canArchive=role!=='movements'&&write(role,['archived']);return '<span class="iv-menu-anchor">'+button('•••','menu:'+id,'iv-dots',false,'aria-label="Actions for '+E(r.data.name)+'" aria-expanded="'+(open?'true':'false')+'"')+(open?'<span class="iv-menu">'+(role==='movements'?'':button('Edit','edit:'+id,'',!write(role,['name'])))+button('Duplicate','duplicate:'+id,'',!write(role,['name']))+button(role==='movements'?'Delete / reverse':'Delete / archive','delete:'+id,'danger',role==='movements'?!write(role,['name']):!canArchive)+'</span>':'')+'</span>'}
function fields(role){return roles[role].map(f=>({key:f[0],label:f[1],kind:f[2],required:!!f[3],choices:f[4]||[]}))}
function formFrom(role,form,kind){let mappedRole=mapped[role];const out={};for(const f of fields(role)){
  if(f.key==='stock_revision'){if(kind==='create')out.stock_revision=0;continue;}
  if(f.key==='archived'){if(kind==='create'&&mappedRole?.fields.archived&&mappedRole.writable.includes('archived'))out.archived=false;continue;}
  if(!Object.prototype.hasOwnProperty.call(form,f.key)||!mappedRole?.fields[f.key]||!mappedRole.writable.includes(f.key))continue;
  let val=form[f.key];if(val===''||val===null){if(f.required)throw Error('Required: '+f.label);out[f.key]=null;continue;}
  if(f.kind==='number'){val=N(val);if(val===null)throw Error('Invalid '+f.label);if(val<0)throw Error('Use a nonnegative '+f.label);}
  else if(f.kind==='boolean')val=B(val);else val=short(val, f.key==='notes'||f.key==='reason'?2300:400);
  if(f.kind==='date'&&val!==null&&!dt(val))throw Error('Invalid date for '+f.label);
  if(f.kind==='select'&&!f.choices.includes(val))throw Error('Unknown '+f.label);
  out[f.key]=val;
 }
 if(kind==='create')for(const f of fields(role).filter(x=>x.required))if(out[f.key]===undefined||out[f.key]===null)throw Error('Required: '+f.label);
 return out;
}
function movementValidation(d, originalId=null){
 if(!stock.complete)throw Error('Stock calculation is incomplete; movement writes are paused until the ledger is complete.');
 const it=lookup('items',d.item_id),lot=lookup('lots',d.lot_id),q=N(d.quantity);
 if(!it||!lot||lot.data.item_id!==d.item_id)throw Error('Select a valid item and corresponding nonhuman lot.');
 if(!it.data.unit||d.unit!==it.data.unit)throw Error('Stock unit must match the inventory item; no unit conversion is assumed.');
 if(!q||q<=0)throw Error('Quantity must be greater than zero.');
 if(!dt(d.date))throw Error('A valid movement date is required.');
 if(d.date>asOf)throw Error('Future-dated stock movements are not posted; use a request until receipt.');
 if(d.kind==='Receipt'||d.kind==='Correction In'){
  if(!lookup('locations',d.to_location_id))throw Error('Choose a valid destination location.');
 }else if(['Use','Disposal','Correction Out'].includes(d.kind)){
  if(!lookup('locations',d.from_location_id))throw Error('Choose a valid source location.');
  if((lotQuantity(d.lot_id,d.from_location_id)||0)<q)throw Error('Not enough stock in this lot/location.');
  if(d.kind==='Use'&&lotExpired(lot))throw Error('Expired lots cannot be used.');
 }else if(d.kind==='Transfer'){
  if(!lookup('locations',d.from_location_id)||!lookup('locations',d.to_location_id)||d.from_location_id===d.to_location_id)throw Error('Choose different valid source and destination locations.');
  if((lotQuantity(d.lot_id,d.from_location_id)||0)<q)throw Error('Not enough stock to transfer from this location.');
 }else throw Error('Select a supported stock movement type.');
 if(d.kind.startsWith('Correction')&&!String(d.reason||'').trim())throw Error('Corrections require a reason and reference.');
 if(d.reversal_of&&String(d.reason||'').trim().length<=('Reversal of '+d.reversal_of).length+5)throw Error('Explain the reversal reason before proposing a correction.');
 if(d.request_id){const r=lookup('requests',d.request_id);if(!r||r.data.item_id!==d.item_id||d.kind!=='Receipt')throw Error('Only valid receipt movements may link to matching requests.');}
 // Check historical availability after inserting this proposal at its effective date.
 const timeline=[...movements.rows.map(x=>x.data),d].sort((a,b)=>String(a.date).localeCompare(String(b.date)));let hist={},day=null;
 const checkDay=()=>{if(Object.values(hist).some(q=>q < -0.000001))throw Error('This date/quantity would cause negative end-of-day stock.');};
 for(const m of timeline){if(day!==m.date){if(day)checkDay();day=m.date;}const q=N(m.quantity,0),steps=m.kind==='Transfer'?[[m.from_location_id,-q],[m.to_location_id,q]]:m.kind==='Receipt'||m.kind==='Correction In'?[[m.to_location_id,q]]:[[m.from_location_id,-q]];
 for(const [loc,delta] of steps){const key=m.lot_id+'|'+loc;hist[key]=N(hist[key],0)+delta;}}checkDay();

 if(movements.rows.some(x=>String(x.data.name||'').trim().toLowerCase()===String(d.name||'').trim().toLowerCase()))throw Error('Movement reference already exists; use a new traceable reference.');
 if(originalId&&movements.rows.some(x=>x.data.reversal_of===originalId))throw Error('This movement has already been reversed.');
}
function reversalOf(r){const d=r.data;const kind=d.kind==='Transfer'?'Transfer':d.kind==='Receipt'||d.kind==='Correction In'?'Correction Out':'Correction In';const outgoing=d.kind==='Transfer'?d.to_location_id:(kind==='Correction Out'?d.to_location_id:null);const incoming=d.kind==='Transfer'?d.from_location_id:(kind==='Correction In'?d.from_location_id:null);
 return {name:'REV-'+d.name,kind,item_id:d.item_id,lot_id:d.lot_id,quantity:d.quantity,unit:d.unit,from_location_id:outgoing,to_location_id:incoming,date:asOf,reason:'Reversal of '+r.id+' — ',reversal_of:r.id,request_id:null};
}
function saveData(role,raw,mode,id){if(!write(role,['name']))throw Error('You do not have permission to write this role.');const merged={...(role==='movements'?st.moveDraft:st.editor?.draft||{}),...raw};const d=formFrom(role,merged,mode==='edit'?'update':'create');
 if(role==='movements'){
   if(['Receipt','Correction In'].includes(d.kind))d.from_location_id=null;
   if(['Use','Disposal','Correction Out'].includes(d.kind))d.to_location_id=null;
   if(mode==='edit')throw Error('Posted movements are immutable. Create a correcting movement instead.');
   movementValidation(d,d.reversal_of||null);
   if(!write('movements',['kind','quantity','unit','item_id','lot_id','date']))throw Error('Movement table is missing required writable fields.');
 }
 if(role==='lots'&&mode==='edit'&&d.item_id!==undefined&&d.item_id!==lookup('lots',id)?.data.item_id&&movements.rows.some(x=>x.data.lot_id===id))throw Error('A lot with movement history cannot change its inventory item; record a new lot instead.');
 if(role==='lots'&&mode==='edit'&&d.lot_code!==undefined&&d.lot_code!==lookup('lots',id)?.data.lot_code&&movements.rows.some(x=>x.data.lot_id===id))throw Error('Manufacturer lot code is historical movement evidence; create a new lot instead of changing it.');
 if(role==='items'&&mode==='edit'&&d.unit!==undefined&&d.unit!==lookup('items',id)?.data.unit&&movements.rows.some(x=>x.data.item_id===id))throw Error('Stock units cannot change after movement history exists; create a new item.');
 if(role==='items'&&mode==='edit'&&d.supplier!==undefined&&d.supplier!==lookup('items',id)?.data.supplier&&requests.rows.some(x=>x.data.item_id===id&&['Approved','Ordered','Received'].includes(x.data.status)))throw Error('Supplier change would invalidate an approved purchase request; create a reviewed replacement item and request.');
 if(['lots','items','locations','requests'].includes(role))requireSources(['items','lots','locations','movements','requests']);
 if(role==='lots'&&mode!=='edit'){
  if(!lookup('items',d.item_id)||!lookup('locations',d.location_id))throw Error('Lot requires a valid inventory item and storage location.');
 }else if(role==='locations'){
  if(d.parent_id){if(!lookup('locations',d.parent_id)||d.parent_id===id)throw Error('Choose a valid parent location.');let current=d.parent_id;const visited=new Set();while(current){if(current===id||visited.has(current))throw Error('Location hierarchy cannot contain a cycle.');visited.add(current);current=lookup('locations',current)?.data.parent_id||null;}}
 }else if(role==='requests'){
  const old=mode==='edit'?lookup('requests',id):null;
  if(old&&['Approved','Ordered','Received'].includes(old.data.status)&&((d.item_id!==undefined&&d.item_id!==old.data.item_id)||(d.quantity!==undefined&&Number(d.quantity)!==Number(old.data.quantity))||(d.unit!==undefined&&d.unit!==old.data.unit)||(d.estimated_cost!==undefined&&Number(d.estimated_cost)!==Number(old.data.estimated_cost))||(d.currency!==undefined&&d.currency!==old.data.currency)||(d.needed_by!==undefined&&d.needed_by!==old.data.needed_by)))throw Error('An approved or ordered request cannot silently change its approved item, quantity, cost, currency, due date or unit. Start a new reviewed request.');
  const it=lookup('items',d.item_id);if(!it||d.unit!==it.data.unit)throw Error('Request must reference an existing item and matching unit.');
  if(N(d.quantity)<=0)throw Error('Request quantity must be positive.');
  if(mode==='edit'&&d.status==='Received'){
   const sum=movements.rows.filter(x=>x.data.request_id===id&&x.data.kind==='Receipt'&&x.data.item_id===d.item_id).reduce((n,x)=>n+(N(x.data.quantity,0)),0);
   if(sum<(N(d.quantity,0)))throw Error('Record and approve a linked stock receipt first.');
  }
 }
 if(role==='items'&&items.rows.some(r=>r.id!==id&&String(r.data.sku||'').trim().toLowerCase()===String(d.sku||'').trim().toLowerCase()&&String(r.data.supplier||'').trim().toLowerCase()===String(d.supplier||'').trim().toLowerCase()))throw Error('This supplier and catalog number already identify an inventory item.');
 if(role==='lots'&&lots.rows.some(r=>r.id!==id&&r.data.item_id===d.item_id&&String(r.data.lot_code||'').trim().toLowerCase()===String(d.lot_code||'').trim().toLowerCase()))throw Error('This item already has the same nonhuman lot.');
 if(role==='requests'){if(mode==='create'&&d.status!=='Requested')throw Error('Create a request in Requested state; reviewed transitions are required before approval or receipt.');
 if(mode==='edit'&&d.status){const before=lookup('requests',id)?.data.status;const steps={Requested:['Reviewed','Declined'],Reviewed:['Approved','Declined'],Approved:['Ordered','Declined'],Ordered:['Received'],Received:[],Declined:[]};if(before!==d.status&&!(steps[before]||[]).includes(d.status))throw Error('Status must advance through review, approval, ordering and receipt.');}}
 if(role==='items'&&d.target_level!==undefined&&d.reorder_point!==undefined&&N(d.target_level,0)<N(d.reorder_point,0))throw Error('Target stock must be at least the reorder minimum.');
 const m=mapped[role],dataOut={};for(const [k,v] of Object.entries(d))if(m.fields[k])dataOut[m.fields[k]]=v;
 if(mode==='edit'){const r=lookup(role,id);if(!r)throw Error('Record was removed from this scope; reopen before editing.');const base=st.editor?.baseVersion;if(!Number.isInteger(base)||r.version!==base)throw Error('Concurrent update detected. Your draft was retained; reopen the record and reconcile changes.');propose([{kind:'update_record',recordId:r.id,expectedVersion:base,data:dataOut}]);}
 else if(role==='movements'){
  const lot=lookup('lots',d.lot_id),lm=mapped.lots;
  if(!write('lots',['stock_revision'])||!Number.isSafeInteger(lot.data.stock_revision)||lot.data.stock_revision>=Number.MAX_SAFE_INTEGER)throw Error('A writable, valid lot stock counter is required before posting.');
  propose([{kind:'update_record',recordId:lot.id,expectedVersion:lot.version,data:{[lm.fields.stock_revision]:lot.data.stock_revision+1}},{kind:'create_record',typeId:m.typeId,data:dataOut}]);
 }else propose([{kind:'create_record',typeId:m.typeId,data:dataOut}]);
 // Retain drafts through review cancellation, failure and stale confirmation.

}
function begin(role,mode,id){st.menu='';st.dialog=null;st.detail=null;let draft={};
 if(id){const r=lookup(role,id);if(!r)throw Error('Record not found.');draft={...r.data};}
 if(mode==='duplicate'){draft.name='Copy of '+String(draft.name||'record');if(role==='movements'){draft.date=asOf;draft.request_id=null;draft.reversal_of=null;draft.reason='Duplicate draft: verify quantities, lot and location before approving.';}if(role==='requests'){draft.status='Requested';draft.notes='New request copied for planning; review before approval. '+String(draft.notes||'');}if(role==='lots'){draft.lot_code='';draft.name='New lot draft';}if(role==='items')draft.sku='';}
 if(role==='items'&&mode==='create')draft={category:'Consumable',unit:'vials',reorder_point:2,target_level:6,lead_days:7};
 if(role==='requests'&&mode==='create')draft={status:'Requested',currency:'EUR'};
 st.editor={role,mode,id:mode==='edit'?id:null,baseVersion:mode==='edit'?lookup(role,id)?.version:null,draft};if(role==='movements'){st.route='movements';st.moveDraft=draft;st.editor=null;}
}
try{
 if(act.startsWith('nav:')){const route=act.slice(4);if(activeTabs.includes(route)){st.route=route;st.page=0;st.query='';st.filter='all';st.subFilter='all';st.editor=null;st.dialog=null;st.menu='';st.detail=null;}}
 else if(act==='query'&&ev.kind==='change'){st.query=short(ev.value,120);st.page=0;}
 else if(act==='filter'&&ev.kind==='change'){st.filter=String(ev.value||'all');st.page=0;}
 else if(act==='subfilter'&&ev.kind==='change'){st.subFilter=String(ev.value||'all');st.page=0;}
 else if(act==='toggle-filters')st.filtersOpen=!st.filtersOpen;
 else if(act==='next')st.page++;
 else if(act==='lot-next')st.lotPage=Math.max(0,N(st.lotPage,0))+1;
 else if(act==='lot-prev')st.lotPage=Math.max(0,N(st.lotPage,0)-1);
 else if(act==='prev')st.page=Math.max(0,st.page-1);
 else if(act.startsWith('menu:'))st.menu=st.menu===act.slice(5)?'':act.slice(5);
 else if(act.startsWith('add:'))begin(act.slice(4),'create',null);
 else if(act.startsWith('edit:')){const a=act.slice(5).split(':');begin(a[0],'edit',a.slice(1).join(':'));}
 else if(act.startsWith('duplicate:')){const a=act.slice(10).split(':');begin(a[0],'duplicate',a.slice(1).join(':'));}
 else if(act.startsWith('delete:')){const a=act.slice(7).split(':');st.menu='';const role=a[0],id=a.slice(1).join(':'),record=lookup(role,id);if(!record)throw Error('Record unavailable; cannot archive or reverse.');st.dialog={role,id,baseVersion:record.version};}
 else if(act==='close-dialog'){st.editor=null;st.dialog=null;st.detail=null;}
 else if(act==='confirm-delete'){
  const d=st.dialog,r=d&&lookup(d.role,d.id);if(!r||r.version!==d.baseVersion)throw Error('Concurrent update: this record changed after opening the confirmation. Close and reopen before continuing.');
  if(d.role==='movements'){requireSources(['items','lots','locations','movements','requests']);const correction=reversalOf(r);st.moveDraft=correction;st.editor=null;st.route='movements';st.dialog=null;warn('A reversal draft is ready. Check the lot balance and reason, then submit for approval.');}
  else{
   if(!write(d.role,['archived']))throw Error('Archive field is not writable.');
   requireSources(['items','lots','locations','movements','requests']);
   if(['items','lots','locations'].includes(d.role)&&!stock.complete)throw Error('Archiving stock entities requires a fully verified lot ledger.');
   if(d.role==='items'&&((itemStock(r.id)||0)>0||lots.rows.some(x=>x.data.item_id===r.id)||reqOpen.some(x=>x.data.item_id===r.id)))throw Error('Cannot archive an item with remaining stock, active lots or requests.');
   if(d.role==='lots'&&((lotQuantity(r.id)||0)>0||movements.rows.some(x=>x.data.lot_id===r.id)))throw Error('Cannot archive a lot with positive stock.');
   if(d.role==='locations'&&(Object.keys(stock.map).some(k=>k.endsWith('|'+r.id)&&stock.map[k]!==0)||locations.rows.some(x=>x.data.parent_id===r.id)||lots.rows.some(x=>x.data.location_id===r.id)||movements.rows.some(x=>x.data.from_location_id===r.id||x.data.to_location_id===r.id)))throw Error('Move stock and child locations before archiving this location.');
   if(d.role==='requests'&&(['Approved','Ordered','Received'].includes(r.data.status)||movements.rows.some(x=>x.data.request_id===r.id)))throw Error('Received or ordered requests are historical; mark declined only when appropriate.');
   const m=mapped[d.role];propose([{kind:'update_record',recordId:r.id,expectedVersion:d.baseVersion,data:{[m.fields.archived]:true}}],'Archive prepared for review. Source record and audit history are retained.');st.dialog=null;
  }
 }
 else if(act==='save-editor'&&ev.kind==='submit'){if(!st.editor)throw Error('No open editor.');st.editor.draft={...st.editor.draft,...(ev.form||{})};const {role,mode,id}=st.editor;saveData(role,st.editor.draft,mode,id);}
 else if(act==='save-movement'&&ev.kind==='submit'){st.moveDraft={...st.moveDraft,...(ev.form||{})};saveData('movements',st.moveDraft,'create',null);}
 else if(act.startsWith('editor:')&&ev.kind==='change'&&st.editor){st.editor.draft[act.slice(7)]=ev.value===null?'':String(ev.value??'');}
 else if(act.startsWith('draft:')&&ev.kind==='change'){const field=act.slice(6);st.moveDraft[field]=String(ev.value??'');if(field==='item_id'){const it=lookup('items',String(ev.value));if(it)st.moveDraft.unit=it.data.unit;st.moveDraft.lot_id='';}}
 else if(act.startsWith('move-kind:')){st.moveDraft.kind=act.slice(10);}
 else if(act==='reset-move')st.moveDraft={};
 else if(act.startsWith('detail:')){const a=act.slice(7).split(':');st.detail={role:a[0],id:a.slice(1).join(':')};}
 else if(act.startsWith('select-location:')){st.locationId=act.slice(16);st.lotPage=0;}
 else if(act.startsWith('select-item:'))st.selectedItem=act.slice(12);
 else if(act==='select-item'&&ev.kind==='change'){st.selectedItem=String(ev.value||'');st.page=0;}
 else if(act.startsWith('stage:')){st.reqStage=act.slice(6);st.page=0;}
 else if(act==='toggle-prompt')st.showPrompt=!st.showPrompt;
 else if(act==='dismiss')warn('');
}catch(e){warn('Action not completed: '+String(e.message||e));}
function header(title,description,primary=''){return '<header class="iv-head"><div><h1>'+E(title)+'</h1><p>'+E(description)+'</p></div><div class="iv-head-actions">'+(primary||'')+button(I('settings',18),'tracker:layout','iv-icon-btn',false,'title="Layout settings" aria-label="Open layout settings"')+'</div></header>';}
function quality(){const errors=[];if(!allComplete){errors.push('One or more authorized sources are unavailable, missing required fields, incomplete or exceed the 800-row limit; authoritative stock totals are withheld.');}if(stock.faults.length)errors.push(stock.faults.length+' movement integrity issue(s) need review.');return errors.length?'<div class="iv-alert" role="status">'+E(errors.join(' '))+'</div>':'';}
function filters(type){let opts=type==='items'?[['all','All categories'],...['Reagent','Consumable','Equipment','Chemical','Other'].map(x=>[x,x])]:type==='movements'?[['all','All movements'],...['Receipt','Use','Transfer','Disposal','Correction In','Correction Out'].map(x=>[x,x])]:[['all','All statuses'],...['Requested','Reviewed','Approved','Ordered','Received','Declined'].map(x=>[x,x])];return st.filtersOpen?'<div class="iv-filterbox" id="iv-filters"><label>Filter<select aria-label="Filter records" data-action="filter" data-ui-state="true">'+opts.map(o=>'<option value="'+E(o[0])+'" '+(st.filter===o[0]?'selected':'')+'>'+E(o[1])+'</option>').join('')+'</select></label><label>Only<select aria-label="Stock status" data-action="subfilter" data-ui-state="true"><option value="all">All stock</option><option value="low" '+(st.subFilter==='low'?'selected':'')+'>Below minimum</option><option value="expiry" '+(st.subFilter==='expiry'?'selected':'')+'>Expiring soon</option></select></label></div>':'';}
function toolbar(role,addLabel='Add item'){return '<div class="iv-toolbar"><input type="search" value="'+E(st.query)+'" class="iv-search" placeholder="Search '+E(role)+'" aria-label="Search '+E(role)+'" data-action="query" data-ui-state="true">'+button('Filters','toggle-filters','iv-ghost',false,'aria-expanded="'+Boolean(st.filtersOpen)+'" aria-controls="iv-filters"')+button(I('plus',15)+' <span class="iv-long">'+E(addLabel)+'</span>','add:'+role,'iv-primary',!write(role,['name']), 'aria-label="'+E(addLabel)+'"')+'</div>'+filters(role);}
function paginate(rows){let per=Math.min(50,Math.max(10,N(cfg.pageSize,25)));let max=Math.max(0,Math.ceil(rows.length/per)-1);st.page=Math.min(st.page,max);return {rows:rows.slice(st.page*per,(st.page+1)*per),count:rows.length,max,per};}
function foot(p){return '<footer class="iv-table-foot"><span>'+((p.count?st.page*p.per+1:0))+'–'+Math.min(p.count,(st.page+1)*p.per)+' of '+p.count+' · Page '+(st.page+1)+' of '+(p.max+1)+'</span><span class="iv-inline-actions">'+button('Prev','prev','',st.page===0)+button('Next','next','',st.page>=p.max)+'</span></footer>';}
function paginateScoped(rows,key){const per=Math.min(50,Math.max(10,N(cfg.pageSize,25))),max=Math.max(0,Math.ceil(rows.length/per)-1);st[key]=Math.min(Math.max(0,N(st[key],0)),max);return {rows:rows.slice(st[key]*per,(st[key]+1)*per),count:rows.length,max,per,page:st[key]};}
function footScoped(p){return '<footer class="iv-table-foot"><span>'+(p.count?p.page*p.per+1:0)+'–'+Math.min(p.count,(p.page+1)*p.per)+' of '+p.count+' · Page '+(p.page+1)+' of '+(p.max+1)+'</span><span class="iv-inline-actions">'+button('Prev','lot-prev','',p.page===0)+button('Next','lot-next','',p.page>=p.max)+'</span></footer>';}

function cell(role,key,r){let d=r.data,v=d[key];if(key==='name')return '<strong>'+E(v||'—')+'</strong>'+(role==='items'?'<small>'+E(d.sku||'No ID')+'</small>':'');if(key==='item_id'||key==='lot_id'||key==='location_id'||key==='parent_id')return E(label(key==='item_id'?'items':key==='lot_id'?'lots':'locations',v));if(key==='quantity')return '<span class="iv-units">'+E(dec(v,2))+'</span>';if(key==='status')return chip(v,['Declined'].includes(v)?'bad':['Received','Approved'].includes(v)?'good':'blue');if(key==='kind')return chip(v,/Correction/.test(v)?'warn':'blue');return E(v||v===0?v:'—');}
function tabular(role,records){const cols=configCols(role).filter(x=>roles[role].some(f=>f[0]===x));const p=paginate(records);return '<div class="iv-card"><div class="iv-table-wrap" aria-label="'+E(role)+' table" role="region"><table class="iv-table"><thead><tr>'+cols.map(k=>'<th>'+E(listColumns(role)[k]||k)+'</th>').join('')+'<th class="iv-actions">Actions</th></tr></thead><tbody>'+(p.rows.length?p.rows.map(r=>'<tr>'+cols.map(k=>'<td>'+cell(role,k,r)+'</td>').join('')+'<td class="iv-actions">'+rowMenu(role,r)+'</td></tr>').join(''):'<tr><td colspan="'+(cols.length+1)+'" class="iv-empty">No matching records. Add your first record or adjust filters.</td></tr>')+'</tbody></table></div>'+foot(p)+'</div>';}
function chart(){const recent=Array.from({length:6},(_,i)=>addMonth(month(asOf),i-5));const amounts=recent.map(m=>movements.rows.filter(r=>month(r.data.date)===m&&['Use','Disposal'].includes(r.data.kind)).length);const mx=Math.max(1,...amounts);const W=640,H=220,top=18,base=173;const bars=amounts.map((v,i)=>{const w=60,x=43+i*98,h=155*v/mx;return '<rect x="'+x+'" y="'+(base-h)+'" width="'+w+'" height="'+h+'" rx="5" fill="'+(i===5?'#175b94':'#a4cee6')+'"/><text x="'+(x+w/2)+'" y="'+(base+23)+'" font-size="12" text-anchor="middle" fill="#708492">'+E(monthText(recent[i]))+'</text><text x="'+(x+w/2)+'" y="'+Math.max(12,base-h-8)+'" font-size="11" text-anchor="middle" fill="#436479">'+E(dec(v,0))+'</text>'}).join('');return '<svg class="iv-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Historical monthly count of Use and Disposal transactions; no aggregation across incompatible units."><path d="M30 173H625" stroke="#d9e6ec"/>'+bars+'</svg>';}
function overview(){const locBreak=(stock.complete?locations.rows:[]).slice(0,4).map(l=>{const lotsIn=lots.rows.filter(x=>Object.keys(stock.map).some(k=>k.endsWith('|'+l.id)&&k.startsWith(x.id+'|')&&stock.map[k]>0));return {name:l.data.name,count:lotsIn.length};});const mx=Math.max(1,...locBreak.map(x=>x.count));
 return header(layout.heading||cfg.heading||'Lab inventory','Manage nonhuman supplies, available lots and what needs replenishing.')+quality()+'<div class="iv-grid iv-grid3" style="margin-bottom:16px"><section class="iv-card iv-metric dark"><h2>Below minimum stock</h2><strong>'+E(stock.complete?lows.length:'—')+'</strong><small>Items needing a decision</small></section><section class="iv-card iv-metric accent"><h2>Lots expiring in 30 days</h2><strong>'+E(stock.complete?expiring.length:'—')+'</strong><small>From '+E(asOf)+' · usable lots only</small></section><section class="iv-card iv-metric"><h2>Open requests</h2><strong>'+E(requests.complete?reqOpen.length:'—')+'</strong><small>Not received or declined</small></section></div><div class="iv-grid iv-grid2"><section class="iv-card iv-pad"><div class="iv-card-head"><div><h2>Replenishment priorities</h2><p>First seven items below minimum · full directory is searchable</p></div>'+chip('Action queue','blue')+'</div>'+(stock.complete?(lows.length?lows.slice(0,7).map(x=>'<div class="iv-priority"><div><strong>'+E(x.r.data.name)+'</strong><small>'+E(x.r.data.category||'Supply')+' · '+E(x.r.data.supplier||'Supplier not recorded')+'</small></div><div style="text-align:right"><span>'+E(dec(x.balance,1))+' / '+E(dec(x.min,1))+' '+E(x.r.data.unit||'')+'</span><br>'+button('Open item '+I('arrow',11),'detail:items:'+x.r.id,'iv-link')+'</div></div>').join(''):'<div class="iv-empty">No items below threshold in the complete authorized records.</div>'):'<div class="iv-empty">Complete, authorized item/lot/movement data is required.</div>')+'</section><section class="iv-card iv-pad"><div class="iv-card-head"><div><h2>Storage coverage</h2><p>Tracked nonhuman lots by area</p></div></div><div class="iv-bars">'+(locBreak.length?locBreak.map(x=>'<div><div class="iv-bar-head"><span>'+E(x.name)+'</span><strong>'+x.count+' lots</strong></div><div class="iv-hbar"><i style="width:'+Math.max(3,100*x.count/mx)+'%"></i></div></div>').join(''):'<div class="iv-empty">Create your first storage location.</div>')+'</div></section></div><div class="iv-grid iv-grid2-even" style="margin-top:16px"><section class="iv-card iv-pad"><div class="iv-card-head"><div><h2>Recent activity</h2><p>Use/disposal event counts · last six months</p></div></div>'+chart()+'<p class="iv-help">Each bar counts usage/disposal events, not summed physical quantities. For reorder decisions see the item-level forecast.</p></section><section class="iv-card iv-pad"><div class="iv-card-head"><div><h2>Upcoming expiry</h2><p>First six expiring lots · see directory for all items</p></div></div><ul class="iv-panel-list">'+(expiring.length?expiring.slice(0,6).map(l=>'<li><div><strong>'+E(label('items',l.data.item_id))+' · '+E(l.data.lot_code)+'</strong><small>'+E(l.data.expiry)+' · '+E(label('locations',l.data.location_id))+'</small></div>'+chip(E(dec(lotQuantity(l.id),1))+' '+E(lookup('items',l.data.item_id)?.data.unit||''),'warn')+'</li>').join(''):'<li><span class="iv-sub">'+(stock.complete?'No recorded expiries in the next 30 days.':'Expiry count unavailable until authorized source coverage is complete.')+'</span></li>')+'</ul></section></div>';
}
function itemDirectory(){let rec=items.rows;const q=st.query.toLowerCase();if(q)rec=rec.filter(r=>[r.data.name,r.data.sku,r.data.supplier,r.data.category].some(v=>String(v||'').toLowerCase().includes(q)));if(st.filter!=='all')rec=rec.filter(r=>r.data.category===st.filter);
 if(st.subFilter==='low')rec=rec.filter(r=>stock.complete&&itemStock(r.id)!==null&&N(r.data.reorder_point)!==null&&itemStock(r.id)<N(r.data.reorder_point));if(st.subFilter==='expiry')rec=rec.filter(r=>expiring.some(l=>l.data.item_id===r.id));
 const cols=configCols('items').filter(k=>['name','sku','category','unit','usable','reorder_point','availability','supplier','owner','lead_days'].includes(k));
 const colNames={name:'Item',sku:'Catalog no.',category:'Category',unit:'Unit',usable:'Usable stock',reorder_point:'Minimum',availability:'Status',supplier:'Supplier',owner:'Owner',lead_days:'Lead time'};
 const show=(key,r)=>{const q=itemStock(r.id),v=r.data[key],min=N(r.data.reorder_point),low=q!==null&&min!==null&&q<min;
  if(key==='name')return '<strong>'+E(r.data.name)+'</strong><small>'+E(r.data.sku||'No catalog ID')+'</small>';
  if(key==='category')return chip(v||'Other');
  if(key==='usable')return '<span class="iv-units">'+E(fmtAmount(q,r.data.unit))+'</span>';
  if(key==='reorder_point')return '<span class="iv-units">'+E(fmtAmount(min,r.data.unit))+'</span>';
  if(key==='availability')return chip(q===null?'Unknown':low?'Reorder':'In stock',q===null?'warn':low?'bad':'good');
  return E(v===undefined||v===null?'—':v);
 };
 const p=paginate(rec);
 const rows=p.rows.map(r=>'<tr>'+cols.map(k=>'<td>'+show(k,r)+'</td>').join('')+'<td>'+button('Details','detail:items:'+r.id,'iv-link')+'</td><td class="iv-actions">'+rowMenu('items',r)+'</td></tr>').join('');
 return header('Inventory directory','Find items by name, supplier or catalog number; stock is computed from posted lot movements.')+quality()+toolbar('items','Add item')+'<section class="iv-card"><div class="iv-table-wrap"><table class="iv-table"><thead><tr>'+cols.map(k=>'<th>'+E(colNames[k]||k)+'</th>').join('')+'<th></th><th class="iv-actions">Actions</th></tr></thead><tbody>'+(rows||'<tr><td colspan="'+(cols.length+2)+'" class="iv-empty">No inventory items match these filters.</td></tr>')+'</tbody></table></div>'+foot(p)+'</section><p class="iv-page-tail">Stock is by unique lot and location. Expired quantity is excluded from usable stock; corrections retain source history.</p>';
}
function moveForm(){const d=st.moveDraft;d.kind=d.kind||'Receipt';const kind=d.kind;const choice=['Receipt','Use','Transfer','Disposal','Correction In','Correction Out'];const field=(key,title,type,required=false,values=null)=>{let value=d[key]??'';let input=values?'<select name="'+key+'" data-ui-state="true" data-action="draft:'+key+'" class="iv-select" '+(required?'required':'')+'><option value="">Choose…</option>'+values.map(o=>'<option value="'+E(o[0])+'" '+(String(o[0])===String(value)?'selected':'')+'>'+E(o[1])+'</option>').join('')+'</select>':type==='long'?'<textarea name="'+key+'" class="iv-textarea" data-ui-state="true" data-action="draft:'+key+'">'+E(value)+'</textarea>':'<input name="'+key+'" class="iv-input" data-ui-state="true" data-action="draft:'+key+'" type="'+(type==='number'?'number':type==='date'?'date':'text')+'" value="'+E(value)+'" '+(type==='number'?'min="0.000001" step="any"':'')+' '+(required?'required':'')+'>';
 return '<label class="iv-field '+(type==='long'?'wide':'')+'">'+E(title)+(required?' *':'')+input+'</label>';};
 const itemOpts=items.rows.map(x=>[x.id,x.data.name+' · '+x.data.sku]);const lotOpts=lots.rows.filter(x=>!d.item_id||x.data.item_id===d.item_id).map(x=>[x.id,x.data.lot_code+' · '+label('items',x.data.item_id)]);const locOpts=locations.rows.map(x=>[x.id,x.data.name]);const reqOpts=requests.rows.filter(x=>!d.item_id||x.data.item_id===d.item_id).map(x=>[x.id,x.data.name]);
 let error='';let preview=null;try{if(d.item_id&&d.lot_id&&N(d.quantity)>0&&d.kind){let from=d.from_location_id,to=d.to_location_id,available=lotQuantity(d.lot_id,from||to);let change=kind==='Receipt'||kind==='Correction In'?N(d.quantity):kind==='Use'||kind==='Disposal'||kind==='Correction Out'?-N(d.quantity):0;preview={before:available,after:available===null?null:available+change,unit:d.unit||lookup('items',d.item_id)?.data.unit||''};if(change<0&&available!==null&&available+change<0)error='Insufficient stock in the chosen source location.';}}catch(e){error=String(e.message||e)}
 return '<section class="iv-card iv-pad"><div class="iv-card-head"><div><h2>Record a movement</h2><p>Unit-safe, lot-specific and reviewed before posting</p></div>'+chip('Audit trail','blue')+'</div><div class="iv-move-types">'+choice.map(x=>button(E(x),'move-kind:'+x,'iv-choice',false,'aria-pressed="'+(kind===x)+'"')).join('')+'</div><form data-action="save-movement"><div class="iv-input-grid">'+field('name','Movement reference','text',true)+field('date','Date','date',true)+field('item_id','Item','select',true,itemOpts)+field('lot_id','Lot','select',true,lotOpts)+field('quantity','Quantity','number',true)+field('unit','Unit','text',true)+(kind==='Transfer'||['Use','Disposal','Correction Out'].includes(kind)?field('from_location_id','From location','select',true,locOpts):'')+(kind==='Transfer'||['Receipt','Correction In'].includes(kind)?field('to_location_id','To location','select',true,locOpts):'')+(kind==='Receipt'?field('request_id','Linked request','select',false,reqOpts):'')+field('reason','Reason / note','long',kind.startsWith('Correction'))+'</div>'+(preview?'<div class="iv-preview-block '+(error?'warning':'')+'"><span class="iv-label">Estimated stock change · draft only</span><strong>'+E(fmtAmount(preview.before,preview.unit))+' → '+E(fmtAmount(preview.after,preview.unit))+'</strong><small>'+E(error||'Final availability is rechecked against the authorized ledger at proposal time.')+'</small></div>':'<div class="iv-preview-block"><span class="iv-label">Stock preview</span><strong>Choose an item, lot and quantity</strong><small>Approved movements, not draft requests, change stock balances.</small></div>')+'<div class="iv-form-foot">'+button('Clear','reset-move','iv-ghost')+'<button type="submit" class="iv-primary" '+(!write('movements',['name','kind','quantity','item_id','lot_id','unit','date'])?'disabled':'')+'>Review movement</button></div></form></section>';
}
function movementsScreen(){let rows=movements.rows.slice().sort((a,b)=>String(b.data.date||'').localeCompare(String(a.data.date||'')));let q=st.query.toLowerCase();if(q)rows=rows.filter(x=>[x.data.name,x.data.reason,label('items',x.data.item_id),label('lots',x.data.lot_id)].some(v=>String(v||'').toLowerCase().includes(q)));if(st.filter!=='all')rows=rows.filter(x=>x.data.kind===st.filter);
 return header('Stock movements','Post a receipt, withdrawal, transfer or reviewed correction without losing the audit trail.')+quality()+'<div class="iv-movement-grid"><div>'+moveForm()+'</div><div><div class="iv-card iv-pad"><div class="iv-card-head"><div><h2>Movement principles</h2><p>Posted transactions determine the stock total</p></div></div><ul class="iv-panel-list"><li><div><strong>Receipts add stock to a lot/location</strong><small>Purchase request status alone does not add stock.</small></div>'+chip('＋','good')+'</li><li><div><strong>Use, disposal and corrections reduce stock</strong><small>Every debit checks current lot and location availability.</small></div>'+chip('−','warn')+'</li><li><div><strong>Transfers conserve total stock</strong><small>One record shifts quantity between existing locations.</small></div>'+chip('↔','blue')+'</li><li><div><strong>Deletion is an explicit reversal</strong><small>Corrections are new immutable records linked to the original.</small></div>'+chip('History','')+'</li></ul></div></div></div><section style="margin-top:17px"><div class="iv-card-head"><div><h2>Movement history</h2><p>Read-only posted ledger · 25 per page</p></div></div><div class="iv-toolbar"><input class="iv-search" type="search" data-ui-state="true" data-action="query" aria-label="Search stock movements" value="'+E(st.query)+'" placeholder="Search movements"><select class="iv-select" style="flex:0 0 155px;width:155px" data-action="filter" data-ui-state="true" aria-label="Movement type"><option value="all">All types</option>'+['Receipt','Use','Transfer','Disposal','Correction In','Correction Out'].map(k=>'<option value="'+E(k)+'" '+(st.filter===k?'selected':'')+'>'+E(k)+'</option>').join('')+'</select></div>'+tabular('movements',rows)+'</section>';
}
function locationsScreen(){const chosen=lookup('locations',st.locationId)||locations.rows[0];if(chosen)st.locationId=chosen.id;const inLoc=chosen&&stock.complete?lots.rows.filter(l=>Object.keys(stock.map).some(k=>k===l.id+'|'+chosen.id&&stock.map[k]>0)):[];const locationPage=paginate(locations.rows);const lotsPage=paginateScoped(inLoc,'lotPage');
 return header('Storage locations','Navigate physical space, locate lots and move stock using audited transfers.',button(I('plus',15)+' Add location','add:locations','iv-primary',!write('locations',['name'])))+quality()+'<div class="iv-loc-grid"><section class="iv-card iv-pad"><div class="iv-card-head"><div><h2>Lab spaces</h2><p>Room / freezer / cabinet hierarchy</p></div></div><div class="iv-stack">'+(locations.rows.length?locationPage.rows.map(l=>'<div style="display:flex;align-items:center;gap:3px">'+button('<strong>'+E(l.data.name)+'</strong><small>'+E(l.data.kind||'Location')+' · '+E(l.data.temperature||'Condition not set')+'</small>','select-location:'+l.id,'iv-loc-row',false,'aria-current="'+(l.id===st.locationId)+'" style="margin-left:'+(l.data.parent_id?'14':'0')+'px"')+rowMenu('locations',l)+'</div>').join(''):'<div class="iv-empty"><strong>No locations yet</strong>Create a storage area to start mapping inventory.</div>')+'</div>'+foot(locationPage)+'</section><section class="iv-card iv-pad">'+(chosen?'<div class="iv-loc-head"><div class="iv-location-icon">'+I('locations',22)+'</div><div><strong>'+E(chosen.data.name)+'</strong><small>'+E(chosen.data.temperature||'No storage condition recorded')+' · '+E(chosen.data.owner||'Owner not assigned')+'</small></div></div><div class="iv-card-head"><div><h2>Lots in this location</h2><p>Quantities reflect approved transfers and receipts</p></div>'+chip(inLoc.length+' lots','blue')+'</div><ul class="iv-panel-list">'+(inLoc.length?lotsPage.rows.map(l=>'<li><div><strong>'+E(label('items',l.data.item_id))+'</strong><small>Lot '+E(l.data.lot_code)+' · '+E(l.data.expiry||'No expiry date')+'</small></div>'+chip(fmtAmount(lotQuantity(l.id,chosen.id),lookup('items',l.data.item_id)?.data.unit),lotExpired(l)?'bad':'good')+'</li>').join(''):'<li class="iv-sub">'+(stock.complete?'No positive lot balances recorded in this location.':'Lot balances unavailable until required records are complete.')+'</li>')+'</ul>'+footScoped(lotsPage)+'<div class="iv-preview-block"><span class="iv-label">Safe location changes</span><p class="iv-help">Use Stock movements → Transfer for any change that affects physical stock. Editing a location label does not move stock.</p>'+button('Open movements','nav:movements','iv-ghost')+'</div>':'<div class="iv-empty"><strong>No location selected</strong>Add your first room or storage cabinet.</div>')+'</section></div>';
}
function requestsScreen(){const stages=['Requested','Reviewed','Approved','Ordered','Received','Declined'],chosen=st.reqStage||'all';const q=st.query.toLowerCase();const matching=requests.rows.filter(x=>(chosen==='all'||x.data.status===chosen)&&(!q||[x.data.name,label('items',x.data.item_id),x.data.owner].some(v=>String(v||'').toLowerCase().includes(q))));let p=paginate(matching);const requestCols=configCols('requests').filter(k=>k!=='archived');const stagesRow='<div class="iv-stage-strip">'+[['all','All'],...stages.map(s=>[s,s])].map(([key,label])=>button('<strong>'+requests.rows.filter(r=>key==='all'||r.data.status===key).length+'</strong><small>'+E(label)+'</small>','stage:'+key,'iv-stage',false,'aria-current="'+(chosen===key)+'"')).join('')+'</div>';
 return header('Purchase requests','A small-team approval queue. No supplier connection or purchase is executed from this app.',button(I('plus',15)+' New request','add:requests','iv-primary',!write('requests',['name'])))+'<div class="iv-card iv-pad" style="margin-bottom:15px"><div class="iv-card-head"><div><h2>Request stages</h2><p>Requested → Reviewed → Approved → Ordered → Received / Declined</p></div></div>'+stagesRow+'</div><div class="iv-toolbar"><input type="search" class="iv-search" placeholder="Search requests or people" aria-label="Search requests" data-action="query" data-ui-state="true" value="'+E(st.query)+'"></div><section class="iv-card"><div class="iv-table-wrap"><table class="iv-table"><thead><tr>'+requestCols.map(k=>'<th>'+E(listColumns('requests')[k]||k)+'</th>').join('')+'<th class="iv-actions">Actions</th></tr></thead><tbody>'+(p.rows.length?p.rows.map(r=>'<tr>'+requestCols.map(k=>'<td>'+cell('requests',k,r)+'</td>').join('')+'<td class="iv-actions">'+rowMenu('requests',r)+'</td></tr>').join(''):'<tr><td colspan="'+(requestCols.length+1)+'" class="iv-empty">No matching requests. Add one or change the stage.</td></tr>')+'</tbody></table></div>'+foot(p)+'</section><div class="iv-alert info" style="margin-top:16px">Only approved Receipt movements change stock. Changing a request to Received requires linked approved receipts; this app does not place online orders.</div>';
}
function usageForItem(id){let out=[];const ms=Array.from({length:6},(_,i)=>addMonth(month(asOf),-5+i));for(const m of ms){let q=movements.rows.filter(r=>r.data.item_id===id&&month(r.data.date)===m&&['Use','Disposal'].includes(r.data.kind)).reduce((n,r)=>n+N(r.data.quantity,0),0);out.push({month:m,used:q});}return out;}
function forecastRows(){return items.rows.map(r=>{const current=itemStock(r.id),min=N(r.data.reorder_point),target=N(r.data.target_level),lead=N(r.data.lead_days),series=usageForItem(r.id),sum=series.reduce((n,x)=>n+x.used,0),months=6,perDay=sum/(months*30.44),days=current!==null&&perDay>0?current/perDay:null,risk=current!==null&&min!==null&&(current<min||(lead!==null&&perDay>0&&current<perDay*lead)),need=current!==null&&target!==null&&min!==null?(risk?Math.max(0,target-current):0):null;
 return {r,current,min,target,lead,days,need,perDay,series};}).filter(x=>x.min!==null).sort((a,b)=>(a.current===null?1:0)-(b.current===null?1:0)||((a.days??99999)-(b.days??99999)));}
function forecastScreen(){const forecast=forecastRows(),watchPage=paginate(forecast),chosen=lookup('items',st.selectedItem)||forecast[0]?.r||items.rows[0];if(chosen)st.selectedItem=chosen.id;const f=forecast.find(x=>x.r.id===st.selectedItem),series=f?.series||[],max=Math.max(1,...series.map(x=>x.used));
 const svg='<svg class="iv-chart" viewBox="0 0 670 260" role="img" aria-label="Item-specific monthly use in matching stock units"><path d="M40 203H642" stroke="#dce9f0"/>'+series.map((x,i)=>{const height=x.used/max*150,y=203-height;return '<rect x="'+(54+i*99)+'" y="'+y+'" width="56" height="'+height+'" rx="6" fill="'+(i===5?'#175b94':'#8dbfdb')+'"/><text x="'+(82+i*99)+'" y="226" font-size="12" text-anchor="middle" fill="#607e8e">'+E(monthText(x.month))+'</text><text x="'+(82+i*99)+'" y="'+Math.max(13,y-9)+'" font-size="11" text-anchor="middle" fill="#456779">'+E(dec(x.used,1))+'</text>'}).join('')+'</svg>';
 const prompt='Using the existing authorized Inventory Management app, read all authorized item, nonhuman lot, location, movement and request records with checked complete coverage and timestamps. Audit stock mismatches, unit consistency, expiry and reorder thresholds. For each item with adequate history estimate monthly usage and lead-time risk, explain missing/uncertain assumptions, and draft a concise stock-risk briefing with exact item and lot IDs. Do not use human samples, place supplier orders, change stock movements or activate an email. A record write requires separately reviewed scope and a verified receipt. No updates if data are unchanged; record no_update and keep the prior report. The owner may separately approve a TrialAgents email after a verified saved briefing.';
 return header('Stock forecast','Estimate reorder needs from approved usage and explicit supplier lead times.')+quality()+'<div class="iv-grid iv-grid2"><section class="iv-card iv-pad"><div class="iv-card-head"><div><h2>Item-level consumption</h2><p>Trailing six months · no mixing item units</p></div><select class="iv-select" style="max-width:210px" aria-label="Select item to forecast" data-action="select-item" data-ui-state="true">'+items.rows.map(r=>'<option value="'+E(r.id)+'" '+(st.selectedItem===r.id?'selected':'')+'>'+E(r.data.name)+'</option>').join('')+'</select></div>'+svg+'<div class="iv-grid iv-grid3" style="margin-top:12px">'+[['Usable now',fmtAmount(f?.current??null,chosen?.data.unit)],['Daily use',f&&f.perDay>0?dec(f.perDay,2)+' '+E(chosen?.data.unit):'No recorded use'],['Days of cover',f?.days!==null&&f?.days!==undefined?dec(f.days,0)+' days':'Not estimable']].map(x=>'<div style="background:#f2f7fa;border-radius:8px;padding:12px"><div class="iv-label">'+E(x[0])+'</div><strong style="display:block;margin-top:5px;font-size:15px">'+E(x[1])+'</strong></div>').join('')+'</div><p class="iv-help">Consumption is based on reviewed Use and Disposal movements only; no assumption that missing demand equals zero. An absent lead time prevents a lead-time recommendation.</p></section><section class="iv-card iv-pad"><div class="iv-card-head"><div><h2>Reorder watchlist</h2><p>Below minimum or at risk during recorded lead time</p></div>'+chip(forecast.filter(x=>x.need>0).length+' flagged','blue')+'</div><div class="iv-stack">'+watchPage.rows.map(x=>'<div class="iv-priority"><div><strong>'+E(x.r.data.name)+'</strong><small>'+E(fmtAmount(x.current,x.r.data.unit))+' current · Min '+E(dec(x.min,0))+' · '+E(x.lead===null?'Lead time missing':x.lead+'d lead')+'</small></div><span>'+chip(x.need===null?'Check inputs':x.need>0?'Add '+dec(x.need,1):!x.perDay?'Usage missing':'Covered',x.need===null||(!x.perDay&&x.need===0)?'warn':x.need>0?'warn':'good')+'</span></div>').join('')+'</div>'+foot(watchPage)+'</section></div><section class="iv-card iv-pad" style="margin-top:16px"><div class="iv-card-head"><div><h2>Stock risk briefing</h2><p>ChatGPT can summarize evidence; calculations stay deterministic in TrialAgents.</p></div>'+button(st.showPrompt?'Hide prompt':'View ChatGPT instructions','toggle-prompt','iv-ghost')+'</div>'+(st.showPrompt?'<div class="iv-blockquote">'+E(prompt)+'</div>':'<p class="iv-help">Optional recurring stock checks and any dependent email notifications are configured after app save on the platform Automations page—not in this app.</p>')+'</section>';
}
function fieldEditor(role,f,d){if(f.key==='archived'||f.key==='stock_revision')return '';const v=d[f.key]??'';let control='';if(f.kind==='select'||f.kind.startsWith('relation-')){let options=f.kind==='select'?f.choices.map(x=>[x,x]):rowsFor(f.kind.slice(9)).map(x=>[x.id,x.data.name]);if(role==='lots'&&f.key==='item_id')options=items.rows.map(x=>[x.id,x.data.name+' · '+x.data.sku]);control='<select class="iv-select" name="'+f.key+'" data-ui-state="true" data-action="editor:'+f.key+'" '+(f.required?'required':'')+'><option value="">Choose…</option>'+options.map(o=>'<option value="'+E(o[0])+'" '+(String(v)===String(o[0])?'selected':'')+'>'+E(o[1])+'</option>').join('')+'</select>';}
 else if(f.key==='notes'||f.key==='reason'||f.key==='access_note'||f.key==='storage_note')control='<textarea class="iv-textarea" name="'+f.key+'" data-ui-state="true" data-action="editor:'+f.key+'">'+E(v)+'</textarea>';
 else control='<input class="iv-input" name="'+f.key+'" data-ui-state="true" data-action="editor:'+f.key+'" type="'+(f.kind==='number'?'number':f.kind==='date'?'date':'text')+'" '+(f.kind==='number'?'step="any" min="0"':'')+' value="'+E(v)+'" '+(f.required?'required':'')+'>';
 return '<label class="iv-field '+(f.key==='notes'||f.key==='reason'?'wide':'')+'">'+E(f.label)+(f.required?' *':'')+control+'</label>';
}
function editor(){const x=st.editor;if(!x)return '';const title=(x.mode==='edit'?'Edit ':x.mode==='duplicate'?'Duplicate ':'New ')+({items:'inventory item',lots:'nonhuman lot',locations:'storage location',requests:'purchase request'}[x.role]||x.role);
 return '<div class="iv-overlay"><div class="iv-drawer" role="dialog" aria-modal="true" aria-label="'+E(title)+'"><div class="iv-drawer-top"><div><h2>'+E(title)+'</h2><p class="iv-sub">Create a reviewed database proposal</p></div>'+button(I('close',17),'close-dialog','iv-icon-btn',false,'aria-label="Close editor"')+'</div><form data-action="save-editor" style="display:contents"><div class="iv-drawer-body"><div class="iv-alert info">Changes are not saved until confirmed through TrialAgents review. No account or login is required inside this app.</div><div class="iv-field-row">'+fields(x.role).map(f=>fieldEditor(x.role,f,x.draft)).join('')+'</div></div><div class="iv-drawer-foot">'+button('Cancel','close-dialog','iv-ghost')+'<button type="submit" class="iv-primary">Prepare reviewed save</button></div></form></div></div>';
}
function details(){const a=st.detail;if(!a)return '';let row=lookup(a.role,a.id);if(!row)return '';const more=a.role==='items'?'<h3>Linked nonhuman lots</h3><ul class="iv-panel-list">'+lots.rows.filter(x=>x.data.item_id===row.id).map(l=>'<li><div><strong>'+E(l.data.lot_code)+'</strong><small>'+E(l.data.expiry||'No expiry')+' · '+E(label('locations',l.data.location_id))+'</small></div>'+chip(fmtAmount(lotQuantity(l.id),row.data.unit),lotExpired(l)?'bad':'good')+rowMenu('lots',l)+'</li>').join('')+'</ul>'+button('Add lot','add:lots','iv-primary',!write('lots',['name'])):'';
 return '<div class="iv-overlay"><div class="iv-drawer" role="dialog" aria-modal="true" aria-label="Record details"><div class="iv-drawer-top"><div><h2>'+E(row.data.name)+'</h2><p class="iv-sub">Version '+E(row.version)+' · Authorized record details</p></div>'+button(I('close',17),'close-dialog','iv-icon-btn',false,'aria-label="Close details"')+'</div><div class="iv-drawer-body"><div class="iv-field-row">'+fields(a.role).filter(f=>f.key!=='archived').map(f=>'<div style="padding-bottom:10px;border-bottom:1px solid #e9eff3"><div class="iv-label">'+E(f.label)+'</div><strong>'+E(f.key.endsWith('_id')?label(f.key==='item_id'?'items':f.key==='lot_id'?'lots':'locations',row.data[f.key]):row.data[f.key]??'—')+'</strong></div>').join('')+'</div><div style="margin-top:18px">'+more+'</div></div><div class="iv-drawer-foot">'+button('Close','close-dialog','iv-ghost')+button('Edit','edit:'+a.role+':'+row.id,'iv-primary',!write(a.role,['name']))+'</div></div></div>';
}
function dialog(){if(!st.dialog)return '';const d=st.dialog,r=lookup(d.role,d.id),movement=d.role==='movements';return '<div class="iv-overlay"><div class="iv-dialog" role="alertdialog" aria-modal="true" aria-label="Delete record"><h2>'+(movement?'Reverse this movement?':'Archive this record?')+'</h2><p><strong>'+E(r?.data.name||'Record')+'</strong> '+(movement?'is part of an immutable stock ledger. Delete creates a compensating correction draft with a link to the original; it does not remove history or automatically change stock.':'will be hidden from active lists only after a reviewed archive update. The original record, ID and audit history remain available in TrialAgents.')+'</p><div class="iv-dialog-actions">'+button('Cancel','close-dialog','iv-ghost')+button(movement?'Prepare reversal':'Review archive','confirm-delete','iv-danger')+'</div></div></div>';}
function nav(){return '<aside class="iv-sidebar"><div class="iv-product"><small>Lab operations</small><strong>Inventory</strong></div><span class="iv-nav-section">Workspace</span><nav class="iv-nav" aria-label="Inventory screens">'+validTabs.filter(x=>visible[x]!==false).map(id=>{const sc=screens.find(s=>s.id===id);return button('<i>'+I(id)+'</i><span class="iv-nav-label">'+E(sc.label)+'</span>','nav:'+id,'',false,'aria-label="'+E(sc.label)+'" aria-current="'+(st.route===id?'page':'false')+'"')}).join('')+'</nav><div class="iv-sidefoot"><b>Trusted inventory ledger</b>All changes require review. Official TrialAgents branding and Home link are supplied by the platform.</div></aside>';}
let body='';try{body=st.route==='overview'?overview():st.route==='items'?itemDirectory():st.route==='movements'?movementsScreen():st.route==='locations'?locationsScreen():st.route==='requests'?requestsScreen():forecastScreen()}catch(e){body=header('Inventory','Available records remain accessible.')+'<div class="iv-alert">Unable to calculate this view: '+E(e.message||e)+'</div>';}
const notice=st.notice?'<div class="iv-alert info" role="status">'+E(st.notice)+' '+button('Dismiss','dismiss','iv-link')+'</div>':'';
return {html:'<div class="iv-shell">'+nav()+'<main class="iv-main">'+notice+body+'<p class="iv-page-tail">Internal TrialAgents app · nonhuman laboratory materials only · record changes require host confirmation</p></main></div>'+editor()+details()+dialog(),css:typeof INVENTORY_CSS==='string'?INVENTORY_CSS:'',state:st};
