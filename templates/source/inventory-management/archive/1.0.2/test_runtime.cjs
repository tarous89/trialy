const fs=require('fs'),assert=require('assert'),P=__dirname;
const pkg=JSON.parse(fs.readFileSync(P+'/../../apps/life.inventory-management-1.0.2.json','utf8'));
const seed=JSON.parse(fs.readFileSync(P+'/demo_data.json','utf8')).records;
const schema=JSON.parse(fs.readFileSync(P+'/schema.example.json','utf8'));
const roles=Object.keys(schema);
const map=Object.fromEntries(roles.map(role=>[role,{typeId:'demo-type-'+role,fields:Object.fromEntries(Object.keys(schema[role].logicalFields).map(k=>[k,k])),writableFields:Object.keys(schema[role].logicalFields)}]));
const bindings=roles.map(role=>({typeId:'demo-type-'+role,fields:Object.keys(schema[role].logicalFields)}));
const cfg={...pkg.defaults,tableMap:JSON.stringify(map),asOfDate:'2026-11-01'};
const fn=new Function('input','tools','templateConfiguration','templateBindings',pkg.source);
function render({rows=seed,state={},event={kind:'open',action:'',value:null,form:{}},c={},saved=true,writable=true,readOverride=null}={}){
 const proposals=[];const tools={call:(name,v)=>{
 if(name==='records.read'){const role=v.typeId.replace('demo-type-','');let r=rows.filter(x=>x.role===role);if(readOverride){const special=readOverride({role,offset:v.offset,limit:v.limit,records:r});if(special!==undefined)return special;}return {rows:r.slice(v.offset,v.offset+v.limit),total:r.length};}
 if(name==='records.propose'){proposals.push(...v);return {status:'proposed'}};
 throw Error('Unknown call '+name);
 }};
 let result=fn({state,event,saved,writable},tools,{...cfg,...c},bindings);
 assert(result.html.length>500&&result.css.length>1000);
 assert(!result.html.includes('Unable to calculate this view:'), 'unexpected rendering error: '+result.html.slice(-1500));
 return {result,proposals};
}
const screens=['overview','items','movements','locations','requests','forecast'];
for(const s of screens){let x=render({state:{route:s}});assert(x.result.html.includes('iv-shell'));assert(x.result.html.includes('tracker:layout'));assert(x.result.html.includes('iv-card'));}
let overview=render();assert(overview.result.html.includes('Below minimum stock'));assert(overview.result.html.includes('Lots expiring in 30 days'));
let absence=render({rows:[]});assert(!absence.result.html.includes('Unable to calculate'));
let unbound=render({c:{tableMap:'{}'}});assert(unbound.result.html.includes('authoritative stock totals are withheld'));
let r=seed.find(x=>x.role==='items');let done=render({state:{route:'items'},event:{kind:'click',action:'detail:items:'+r.id}});assert(done.result.html.includes('Linked nonhuman lots'));
let x=render({state:{route:'movements',moveDraft:{kind:'Transfer',name:'TEST-TRANSFER',date:'2026-11-01',item_id:seed.find(x=>x.role==='items'&&x.data.sku==='TIP-020').id,lot_id:seed.find(x=>x.role==='lots'&&x.data.lot_code.startsWith('TIP')).id,quantity:'1',unit:'boxes',from_location_id:seed.find(x=>x.role==='locations'&&x.data.name==='Biology lab').id,to_location_id:seed.find(x=>x.role==='locations'&&x.data.name==='Stock shelf B3').id}}});
assert(x.result.html.includes('Review movement'));
const item=seed.find(x=>x.role==='items'&&x.data.sku==='TIP-020'),lot=seed.find(x=>x.role==='lots'&&x.data.item_id===item.id),from=seed.find(x=>x.role==='locations'&&x.data.name==='Biology lab'),to=seed.find(x=>x.role==='locations'&&x.data.name==='Stock shelf B3');
const valid={name:'Transfer test',item_id:item.id,lot_id:lot.id,kind:'Transfer',quantity:'1',unit:item.data.unit,from_location_id:from.id,to_location_id:to.id,date:'2026-11-01',reason:'Internal move'};
const proposed=render({state:{route:'movements'},event:{kind:'submit',action:'save-movement',form:valid}});
assert(proposed.proposals.length===2&&proposed.proposals[1].kind==='create_record');
const negative=render({state:{route:'movements'},event:{kind:'submit',action:'save-movement',form:{...valid,quantity:'5000'}}});assert(negative.proposals.length===0&&negative.result.html.includes('Not enough stock'));
const badunit=render({state:{route:'movements'},event:{kind:'submit',action:'save-movement',form:{...valid,unit:'tubes'}}});assert(badunit.proposals.length===0&&badunit.result.html.includes('Stock unit must match'));
const future=render({state:{route:'movements'},event:{kind:'submit',action:'save-movement',form:{...valid,date:'2026-12-01'}}});assert(future.proposals.length===0&&future.result.html.includes('Future-dated'));
const wrongLot=render({state:{route:'movements'},event:{kind:'submit',action:'save-movement',form:{...valid,lot_id:seed.find(x=>x.role==='lots'&&x.data.item_id!==item.id).id}}});assert(wrongLot.proposals.length===0);
const mov=seed.find(x=>x.role==='movements'&&x.data.kind==='Use');const reversal=render({state:{route:'movements',dialog:{role:'movements',id:mov.id,baseVersion:mov.version}},event:{kind:'click',action:'confirm-delete'}});assert(reversal.proposals.length===0&&reversal.result.state.moveDraft.reversal_of===mov.id&&reversal.result.state.moveDraft.kind==='Correction In');
const unsafeArchive=render({state:{route:'items',dialog:{role:'items',id:item.id,baseVersion:item.version}},event:{kind:'click',action:'confirm-delete'}});assert(unsafeArchive.proposals.length===0&&unsafeArchive.result.html.includes('Cannot archive'));
const duplicateReq=seed.find(x=>x.role==='requests'&&x.data.status==='Received');let dup=render({state:{route:'requests'},event:{kind:'click',action:'duplicate:requests:'+duplicateReq.id}});assert(dup.result.state.editor.draft.status==='Requested');
const receivedReq=render({state:{route:'requests',editor:{role:'requests',mode:'create',id:null,draft:{}}},event:{kind:'submit',action:'save-editor',form:{...duplicateReq.data,quantity:'3',status:'Received'}}});assert(receivedReq.proposals.length===0&&receivedReq.result.html.includes('Create a request'));
const ro=render({saved:false,writable:false,state:{route:'movements'},event:{kind:'submit',action:'save-movement',form:valid}});assert(ro.proposals.length===0&&ro.result.html.includes('permission'));
console.log('NODE PASS: 6 screens, layout schema, empty/unbound, details, transaction proposal, quantity/unit/date checks, reversal, archive guard, request flow, denied writes');
console.log('METADATA',pkg.id,pkg.version,'source length',pkg.source.length,'demo rows',seed.length);

// Architect v1.3.9 regressions: each defect is tested as an independent fixture.
const e=(kind,action,value=null,form={})=>({kind,action,value,form});
const cp=x=>JSON.parse(JSON.stringify(x));
const reqReviewed=seed.find(r=>r.role==='requests'&&r.data.status==='Reviewed')||seed.find(r=>r.role==='requests'&&r.data.status==='Requested');
const beginReq=render({state:{route:'requests'},event:e('click','edit:requests:'+reqReviewed.id)});
assert.strictEqual(beginReq.result.state.editor.baseVersion,reqReviewed.version,'editor did not capture original version');
const editSelect=render({state:beginReq.result.state,event:e('change','editor:status','Reviewed')});
assert.strictEqual(editSelect.result.state.editor.draft.status,'Reviewed','select changed without retaining draft');
const editNote=render({state:editSelect.result.state,event:e('change','editor:notes','saved text before submit')});
assert.strictEqual(editNote.result.state.editor.draft.notes,'saved text before submit','textarea draft lost');
assert(editNote.result.html.includes('data-action="editor:status" data-ui-state="true"')||editNote.result.html.includes('data-ui-state="true" data-action="editor:status"'),'select missing data-ui-state');
const staleReq=cp(seed);staleReq.find(x=>x.id===reqReviewed.id).version++;
const staleEdit=render({rows:staleReq,state:editNote.result.state,event:e('submit','save-editor',null,{notes:'new input'})});
assert.strictEqual(staleEdit.proposals.length,0,'stale edit proposed write');
assert(staleEdit.result.html.includes('Concurrent update detected'),'stale edit did not show conflict');
assert.strictEqual(staleEdit.result.state.editor.draft.notes,'new input','failed edit erased draft');
const staleArchive=render({rows:staleReq,state:{route:'requests',dialog:{role:'requests',id:reqReviewed.id,baseVersion:reqReviewed.version}},event:e('click','confirm-delete')});
assert.strictEqual(staleArchive.proposals.length,0,'stale archive proposed write');
assert(staleArchive.result.html.includes('Concurrent update'),'stale archive conflict not visible');
const cases=[
 ['unavailable',({role})=>role==='movements'?{unavailable:true}:undefined],
 ['unknown-total',({role,records,offset,limit})=>role==='movements'?{rows:records.slice(offset,offset+limit)}:undefined],
 ['short-page',({role,records,offset})=>role==='items'?{rows:records.slice(offset,offset+1),total:records.length+30}:undefined],
 ['empty-but-reported-more',({role,records,offset})=>role==='items'?{rows:[],total:records.length+3}:undefined]
];
for(const [label,readOverride] of cases){const a=render({readOverride});assert(a.result.html.includes('authoritative stock totals are withheld'),label+' gave false complete stock');assert(!a.result.html.includes('All items with a recorded threshold have sufficient usable stock'),label+' misreported ready');}
const overRows=cp(seed);const itemBase=overRows.find(x=>x.role==='items');
for(let i=0;i<803;i++)overRows.push({...cp(itemBase),id:'bigitem'+i,data:{...cp(itemBase.data),sku:'AB-'+i,supplier:'Supplier-'+i}});
const overBudget=render({rows:overRows});assert(overBudget.result.html.includes('authoritative stock totals are withheld'),'read budget overflow presented complete data');
const badFieldMap=cp(map);delete badFieldMap.items.fields.sku;const missingBinding=render({c:{tableMap:JSON.stringify(badFieldMap)}});assert(missingBinding.result.html.includes('authoritative stock totals are withheld'),'missing mapping masked');
const badExpiry=cp(seed);badExpiry.find(x=>x.role==='lots').data.expiry='2026-02-30';assert(render({rows:badExpiry}).result.html.includes('authoritative stock totals are withheld'),'invalid expiry presented usable');
const orphan=cp(seed);orphan.find(x=>x.role==='lots').data.item_id='nonexistent-parent';assert(render({rows:orphan}).result.html.includes('movement integrity issue'),'orphan lot ignored');
const duplicate=cp(seed);const i1=duplicate.find(x=>x.role==='items');duplicate.push({...cp(i1),id:'duplicate-item'});assert(render({rows:duplicate}).result.html.includes('movement integrity issue'),'duplicate logical catalog ignored');
const approved=seed.find(x=>x.role==='requests'&&['Approved','Ordered','Received'].includes(x.data.status));
if(approved){const opened=render({state:{route:'requests'},event:e('click','edit:requests:'+approved.id)});const bad=render({state:opened.result.state,event:e('submit','save-editor',null,{quantity:String(Number(approved.data.quantity)+1)})});assert.strictEqual(bad.proposals.length,0,'approved request quantity overwritten');assert(bad.result.html.includes('approved or ordered'),'approval evidence invalidation did not block');}
const items2=cp(seed);const first=items2.find(x=>x.role==='items');
for(let k=0;k<63;k++)items2.push({...cp(first),id:'newitem-'+k,data:{...cp(first.data),sku:'NEW-'+k,supplier:'Independent-'+k,name:'Invented SKU '+k}});
const last=render({rows:items2,state:{route:'items',page:2}});assert(last.result.html.includes('Page 3 of'),'item register cannot reach last bounded page');
const forecastLast=render({rows:items2,state:{route:'forecast',page:2}});assert(forecastLast.result.html.includes('Page 3 of'),'forecast comparison is truncated / no last page');
const loc2=cp(seed);const locBase=loc2.find(x=>x.role==='locations');for(let k=0;k<50;k++)loc2.push({...cp(locBase),id:'loc-new-'+k,data:{...cp(locBase.data),name:'Cold shelf '+k,parent_id:''}});
const locationsLast=render({rows:loc2,state:{route:'locations',page:2}});assert(locationsLast.result.html.includes('Page 3 of'),'location explorer is truncated');
const select=render({state:{route:'forecast',selectedItem:seed.find(x=>x.role==='items').id},event:e('change','select-item',item.id)});
assert.strictEqual(select.result.state.selectedItem,item.id,'changed forecast selector not applied immediately');
const order={tabs:['forecast','items','overview','movements','locations','requests'],cols:{items:['name','supplier','category','sku','unit']},visible:{'items:category':false}};
const arranged=render({state:{route:'items'},c:{layoutProfile:JSON.stringify(order)}});
assert(!arranged.result.html.includes('<th>Category</th>'),'host layout hide ignored');
const openHidden=render({state:{route:'items'},c:{layoutProfile:JSON.stringify({...order,visible:{'items:name':false}})},event:e('click','add:items')});
assert(openHidden.result.html.includes('name="name"'),'hidden required field missing from editor');
const dateFail=render({c:{asOfDate:'2026-02-30'}});assert(dateFail.result.html.includes('movement integrity issue'),'invalid as-of date silently replaced by today');
assert(!/(?:const|let|var)\s+template(?:Configuration|Bindings)\b/.test(pkg.source),'catalog source redeclares host injected config/bindings');
assert(pkg.source.split('\n')[0].startsWith('const templateLayoutSchema='),'missing native layout schema');
assert(pkg.documentation.tasks?.promptExample?.includes('No automation:'),'missing no-automation prompt in MCP metadata');
console.log('ARCHITECT REGRESSIONS PASS: draft select/textarea, stale writes, unavailable/short/unknown/overbudget reads, missing map, invalid expiry/date, orphan/duplicate links, approved evidence, item/forecast/location pages, host layout and hidden required editor');

// Production-style single injection smoke check (Node only, NOT QuickJS or the sanitizer).
const hostPrepared=new Function('input','tools','const templateConfiguration='+JSON.stringify(cfg)+';\nconst templateBindings='+JSON.stringify(bindings)+';\n'+pkg.source);
const hostPreparedView=hostPrepared({state:{route:'overview'},event:{kind:'open'},saved:false,writable:false},{call:(method,args)=>{
 if(method!=='records.read')throw Error('Unexpected record proposal in read-only host smoke');
 const role=args.typeId.replace('demo-type-','');const rows=seed.filter(x=>x.role===role);
 return {rows:rows.slice(args.offset,args.offset+args.limit),total:rows.length};
}});
assert(hostPreparedView.html.includes('Inventory'),'host injection smoke did not render');
console.log('HOST PREP SMOKE PASS (Node-injected configuration/bindings only; QuickJS/sanitizer not tested)');
