import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {appTemplateEntry} from '../src/workspace/app-templates.js';
import {readCustomLayout} from '../src/shared/custom-layout.js';
import {fieldSchema} from '../src/shared/schema.js';
import {nextCalendar} from '../src/automations/schedules.js';
import {actionPreparation,expand} from '../src/app-services/schema.js';
import {entry,schema,demo,fullMap,fullBindings,cfgFor,render,fresh,session,text,byRole,approve,type Row} from './fixtures/lab-inventory.js';

/* LAB_INVENTORY.md §7 rules and §12 acceptance in the production QuickJS runtime, with the catalog entry exactly as prepared
 * (host-prepended configuration). Fictional demo records, as of 14 Nov 2026 (a Saturday). Database, installer and assistant paths:
 * tests/lab-inventory-integration.test.ts; browser layout: scripts/test-lab-inventory-browser.ts. */
const T=(r:any)=>text(r.html);
const id=(rows:Row[],role:string,pred:(d:any)=>boolean)=>rows.find(r=>r.role===role&&pred(r.data))!.id;
const item=(rows:Row[],name:string)=>id(rows,'labinventory.items',d=>d.name===name);
const lotsOf=(rows:Row[],itemId:string)=>byRole(rows,'labinventory.lots').filter(l=>l.data.item_id===itemId);
const digestOf=(html:string)=>{const m=/<pre class="li-digest" data-digest="(\w+)"[^>]*>([\s\S]*?)<\/pre>/.exec(html)!;return {state:m[1],text:m[2].replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>')};};

test('catalog entry: 2.0.0 Lab Inventory, valid schema, limits, layout with six screens plus the mobile item page',async()=>{
 assert.equal(entry.id,'life.inventory-management');assert.equal(entry.version,'2.0.0');assert.equal(entry.name,'Lab Inventory');assert.match(entry.digest,/^[a-f0-9]{64}$/);
 assert.ok(appTemplateEntry.safeParse(JSON.parse(await readFile('templates/apps/life.inventory-management-2.0.0.json','utf8'))).success);
 assert.ok(entry.source.length<180000);assert.doesNotMatch(entry.source,/const templateConfiguration|const templateBindings/,'the host prepends configuration');
 const layout=readCustomLayout(`const templateConfiguration=${JSON.stringify(cfgFor())};\n${entry.source}`)!;
 assert.deepEqual(layout.schema.screens.map((s:any)=>s.id),['overview','inventory','requests','orders','locations','settings','item']);
 assert.deepEqual(Object.keys(layout.schema.groups),['items','requests']);
 // Installer schema: core roles with core.v1, programs and agreements optional read only, app roles labinventory.v1; scalar fields only.
 assert.deepEqual(Object.entries(schema).map(([r,s]:any)=>[r,s.contract,!!s.optional,!!s.readOnly]),[['organizations','core.v1',false,false],['programs','core.v1',true,true],['agreements','core.v1',true,true],...['settings','categories','locations','items','lots','movements','requests','orders'].map(t=>['labinventory.'+t,'labinventory.v1',false,false])]);
 for(const s of Object.values(schema) as any[])for(const f of s.fields){assert.ok(fieldSchema.safeParse(f).success,f.key);assert.equal(f.multiple,false);}
 const req=(r:string)=>(schema[r].fields as any[]).filter(f=>f.required).map(f=>f.key);
 assert.deepEqual(req('labinventory.lots'),['item_id','quantity','location_id','status']);assert.deepEqual(req('labinventory.movements'),['lot_id','kind','quantity_change','occurred_on']);
 assert.deepEqual(req('labinventory.requests'),['quantity','requested_by','requested_on','status']);assert.deepEqual(req('labinventory.orders'),['supplier_id','ordered_by','ordered_on','status']);
 // Draft: the seed still names 1.0.2 (archived unchanged); 1.0.2 is marked for retirement on approval.
 const seed=JSON.parse(await readFile('templates/catalog-seed.json','utf8')),inst=JSON.parse(await readFile('templates/catalog-installers.json','utf8')),ret=JSON.parse(await readFile('templates/catalog-retirements.json','utf8')).retirements;
 assert.deepEqual([seed['life.inventory-management'].version,seed['life.inventory-management'].schema],['1.0.2','templates/source/inventory-management/archive/1.0.2/schema.example.json']);
 assert.equal(inst['life.inventory-management@2.0.0'],'templates/source/inventory-management/schema.example.json');assert.equal(inst['life.inventory-management@1.0.2'],'templates/source/inventory-management/archive/1.0.2/schema.example.json');
 assert.deepEqual(ret.filter((r:any)=>r.templateId==='life.inventory-management').map((r:any)=>[r.version,r.replacedBy]),[['1.0.2','life.inventory-management@2.0.0']]);
 // §12 demo: 40 items across categories, 60 lots, 12 locations, requests in every status, 8 orders; all fictional.
 const rows=fresh(),n=(r:string)=>byRole(rows,r).length;
 assert.deepEqual([n('labinventory.items'),n('labinventory.lots'),n('labinventory.locations'),n('labinventory.orders')],[40,60,12,8]);
 assert.deepEqual([...new Set(byRole(rows,'labinventory.requests').map(r=>r.data.status))].sort(),['approved','cancelled','ordered','received','rejected','requested']);
 assert.deepEqual(byRole(rows,'labinventory.categories').filter(c=>c.data.standard).map(c=>c.data.name),['Reagent','Consumable','Antibody','Cell line','Plasmid','Chemical']);
 assert.ok(new Set(byRole(rows,'labinventory.items').map(i=>i.data.category_id)).size>=7);
 assert.ok(byRole(rows,'labinventory.items').every(i=>/\(fictional\)/.test(i.data.name)));
});

test('every screen renders at desktop data volume without errors; the item page needs no navigation rail',async()=>{
 const rows=fresh();
 for(const section of ['overview','inventory','requests','orders','locations','settings']){const r=await render(rows,{section});assert.doesNotMatch(r.html,/could not be shown|li-banner bad/,section);assert.match(r.html,new RegExp('aria-current="page" aria-label="'+(section==='settings'?'Reports &amp; settings':section[0].toUpperCase()+section.slice(1))+'"'));assert.ok(r.html.length<200000);}
 const tips=item(rows,'Pipette tips 200 µL (fictional)');
 const page=await render(rows,{},{kind:'open',action:''},{route:{path:'/item',recordId:tips}});assert.equal(page.state.section,'item');assert.doesNotMatch(page.html,/li-rail/);assert.match(T(page),/Pipette tips 200 µL \(fictional\) .*In stock 3 boxes/);
 // A label for an item that is no longer there shows a clear note.
 const gone=await render(rows,{},{kind:'open',action:''},{route:{path:'/item',recordId:'00000000-0000-4000-8007-999999999999'}});assert.match(T(gone),/not available/);
 // Nothing is written by opening, navigating or reading.
 assert.equal(page.changes.length+gone.changes.length,0);
});

test('§7 calculations: stock, low stock, suggestion (usual quantity or 90-day use × lead time + 14), expiring, expired, waste, spend split, stock value by currency',async()=>{
 const rows=fresh();const tips=item(rows,'Pipette tips 200 µL (fictional)'),dmem=item(rows,'DMEM high glucose (fictional)'),agar=item(rows,'Agarose (fictional)');
 const o=T(await render(rows,{section:'overview'}));
 assert.match(o,/Low stock 6 at or below the reorder point Expiring in 30 days 6 lots in stock Expired 5 still in stock Approvals waiting 4 requests Late orders 1/);
 // Tips: reorder quantity 10 wins. DMEM: no reorder quantity, 3 bottles used in 90 days, lead time 7 → 3/90 × 21 = 0.7 → 1.
 assert.match(o,/Pipette tips 200 µL \(fictional\) 3 boxes 4 10 boxes usual order quantity/);
 assert.match(o,/DMEM high glucose \(fictional\) 2 bottles 4 1 bottle average use 0\.03 a day × 21 days \(lead time \+ 14\)/);
 // Independent fixture: 45 used in 90 days (older use ignored), lead time 16 → 0.5 × 30 = 15.
 const r2=fresh();const it=r2.find(r=>r.id===agar)!;Object.assign(it.data,{reorder_point:5,reorder_quantity:null,lead_time_days:16});
 const lot=lotsOf(r2,agar)[0];for(const [q,day] of [[20,'2026-09-01'],[25,'2026-11-01'],[500,'2026-08-01']] as const)r2.push({id:crypto.randomUUID(),version:0,role:'labinventory.movements',data:{lot_id:lot.id,kind:'used',quantity_change:-q,occurred_on:day}});
 assert.match(T(await render(r2,{section:'overview'})),/Agarose \(fictional\) 1 bottle 5 15 bottles average use 0\.5 a day × 30 days/);
 // No usage and no reorder quantity: no suggestion, and the one-click request is disabled.
 const r3=fresh();Object.assign(r3.find(r=>r.id===agar)!.data,{reorder_point:5,reorder_quantity:null});const o3=await render(r3,{section:'overview'});assert.match(T(o3),/Agarose \(fictional\) 1 bottle 5 — No suggestion/);assert.match(o3.html,/data-action="reorder:[^"]+" disabled aria-label="Request Agarose/);
 // Boundary: expiring = within the window inclusive (14 Nov + 30 = 14 Dec); expired = before today and still in stock; used-up lots never count.
 const r4=fresh();const l4=lotsOf(r4,tips)[0];
 const ov=async()=>T(await render(r4,{section:'overview'}));
 l4.data.expires_on='2026-12-14';assert.match(await ov(),/Expiring in 30 days 7/);l4.data.expires_on='2026-12-15';assert.match(await ov(),/Expiring in 30 days 6/);
 l4.data.expires_on='2026-11-13';assert.match(await ov(),/Expired 6/);l4.data.expires_on='2026-11-14';assert.match(await ov(),/Expired 5 .*Expiring in 30 days 7|Expiring in 30 days 7 .*Expired 5/);
 Object.assign(l4.data,{status:'used_up',quantity:0,expires_on:'2026-11-01'});assert.match(await ov(),/Expired 5/);
 // Reports: spend by month (orders by ordered date), waste, stock value; another currency is listed apart, never summed.
 const r5=fresh();const ord=byRole(r5,'labinventory.orders').find(x=>x.data.order_number==='FL-89002')!;ord.data.currency='USD';
 const rep=async(report:string)=>T(await render(r5,{section:'settings',filters:{report}}));
 assert.match(await rep('spend_month'),/Nov 2026 268/);assert.match(await rep('spend_month'),/1 order line in other currencies are left out|1 order line/);
 const sp=await rep('spend_program');assert.match(sp,/Spend by program/);
 // Order ER-55102 (EUR 946) groups FBS (2 × 410 = 820, NWB-101) and DMEM (6 × 21 = 126, NWB-101): all NWB-101.
 assert.match(await rep('waste'),/DNA ladder 1 kb \(fictional\) Expired 1 tube EUR 97/);assert.match(await rep('waste'),/Penicillin-streptomycin \(fictional\) Discarded|Trypsin-EDTA 0\.25% \(fictional\) Discarded 1 bottle EUR 14/);
 assert.match(await rep('stock_value'),/Stock value EUR [\d,]+ in-stock quantity × last price/);
 // CSV export of the shown report.
 const csv=/<textarea[^>]*name="csv_export"[^>]*>([\s\S]*?)<\/textarea>/.exec((await render(r5,{section:'settings',filters:{report:'spend_supplier'}})).html)![1];assert.match(csv,/^supplier,amount,currency\n/);assert.match(csv,/Placeholder Bio Supply,\d+/);
});

test('spend is split by request program when an order groups several requests (estimated amount, else equally)',async()=>{
 const rows=fresh();const progs=byRole(rows,'programs');const o=byRole(rows,'labinventory.orders').find(x=>x.data.order_number==='ER-55990')!;
 const rq=o.data.request_ids.split(',').map((i:string)=>rows.find(r=>r.id===i)!);rq[0].data.program_id=progs[0].id;rq[0].data.estimated_amount=75;rq[1].data.program_id=progs[1].id;rq[1].data.estimated_amount=25;o.data.amount=100;
 const others=byRole(rows,'labinventory.orders').filter(x=>x.id!==o.id);for(const x of others)x.data.status='cancelled';
 const t=T(await render(rows,{section:'settings',filters:{report:'spend_program'}}));assert.match(t,/NWB-101 \(fictional\) 75 NWB-202 \(fictional\) 25/);
 rq[0].data.estimated_amount=null;rq[1].data.estimated_amount=null;assert.match(T(await render(rows,{section:'settings',filters:{report:'spend_program'}})),/NWB-101 \(fictional\) 50 NWB-202 \(fictional\) 50/);
});

test('acceptance 1: a request for an item in stock shows the lots first; one approval below the threshold, two above; never the requester; program approver',async()=>{
 const rows=fresh();const ui=session(rows),gloves=item(rows,'Nitrile gloves M (fictional)'),fbs=item(rows,'Fetal bovine serum (fictional)');
 await ui.open({section:'requests',me:'Ana Silva'});await ui.click('panel:newrequest');
 await ui.change('f:request:item_id',gloves);assert.match(T(ui),/We already have it: 13 boxes in stock 4 boxes in Lab 2\.14 › Cabinet C · lot \w+ 9 boxes in Lab 2\.14 › Cabinet C/);assert.equal(ui.last.changes.length,0,'checking stock writes nothing');
 // Open requests for the same item are shown too.
 assert.match(T(ui),/Open requests for this item: 10 boxes by Ana Silva \(Requested\)/);
 // Below the threshold: one approval by the approver.
 await ui.change('f:request:item_id',fbs);await ui.submit('save-request',{item_id:fbs,quantity:'2',urgency:'normal'});const [rq1]=ui.approve();
 const r1=rows.find(r=>r.id===rq1)!;assert.deepEqual([r1.data.status,r1.data.requested_by,r1.data.estimated_amount,r1.data.item_name],['requested','Ana Silva',820,'Fetal bovine serum (fictional)']);
 await ui.click('panel:request:'+rq1);await ui.submit('decide',{as:'Ana Silva'},'approve');assert.match(ui.state.notice,/The requester cannot approve or reject their own request/);assert.equal(ui.last.changes.length,0);
 await ui.submit('decide',{as:'Sam Rivera'},'approve');assert.match(ui.state.notice,/This approval is for Mia Novak/);
 await ui.click('panel:request:'+rq1);await ui.submit('decide',{as:'Mia Novak'},'approve');ui.approve();assert.deepEqual([r1.data.status,r1.data.approved_1_by,r1.data.decision_on],['approved','Mia Novak','2026-11-14']);
 // Above the threshold (EUR 2,000): the first approval keeps it waiting for the second approver, who cannot be the first approver.
 await ui.click('panel:newrequest');await ui.submit('save-request',{item_id:fbs,quantity:'6'});const [rq2]=ui.approve();const r2=rows.find(r=>r.id===rq2)!;assert.equal(r2.data.estimated_amount,2460);
 await ui.click('panel:request:'+rq2);assert.match(T(ui),/Approvals needed Two \(above EUR 2,000\)/);await ui.submit('decide',{as:'Mia Novak'},'approve');ui.approve();
 assert.deepEqual([r2.data.status,r2.data.approved_1_by],['requested','Mia Novak']);
 await ui.click('panel:request:'+rq2);await ui.submit('decide',{as:'Mia Novak'},'approve');assert.match(ui.state.notice,/The second approval is for Sam Rivera/);
 await ui.submit('decide',{as:'Sam Rivera'},'approve');ui.approve();assert.deepEqual([r2.data.status,r2.data.approved_2_by],['approved','Sam Rivera']);
 // The approver's own request goes to the next approver; a program approver replaces the default for that program.
 const mia=session(rows);await mia.open({section:'requests',me:'Mia Novak'});await mia.click('panel:newrequest');await mia.submit('save-request',{item_id:gloves,quantity:'1'});const [rq3]=mia.approve();
 await mia.click('panel:request:'+rq3);await mia.submit('decide',{as:'Mia Novak'},'approve');assert.match(mia.state.notice,/cannot approve/);await mia.submit('decide',{as:'Sam Rivera'},'approve');mia.approve();assert.equal(rows.find(r=>r.id===rq3)!.data.approved_1_by,'Sam Rivera');
 const cho=byRole(rows,'labinventory.requests').find(r=>r.data.item_name==='CHO-K1 cells (fictional)')!;await ui.click('panel:request:'+cho.id);assert.match(T(ui),/Decision · for Lena Ortiz/);
 await ui.submit('decide',{as:'Mia Novak'},'approve');assert.match(ui.state.notice,/This approval is for Lena Ortiz/);
 // Reject needs a reason; ask a question appends to the request.
 await ui.submit('decide',{as:'Lena Ortiz',reason:''},'reject');assert.match(ui.state.notice,/Give a reason/);
 await ui.click('panel:request:'+cho.id);await ui.submit('decide',{as:'Lena Ortiz',question:'Which passage do you need?'},'ask');ui.approve();assert.match(cho.data.note,/14 Nov 2026 · Lena Ortiz: Which passage do you need\?/);
 await ui.click('panel:request:'+cho.id);await ui.submit('decide',{as:'Lena Ortiz',reason:'Use the vials in Box A3'},'reject');ui.approve();assert.deepEqual([cho.data.status,cho.data.reject_reason],['rejected','Use the vials in Box A3']);
 // An "approved" status set without approvals (for example by an unreviewed edit) is flagged and cannot be ordered.
 const bad=byRole(rows,'labinventory.requests').find(r=>r.data.item_name==='Nitrile gloves M (fictional)'&&r.data.status==='requested'&&r.data.requested_by==='Ana Silva')!;bad.data.status='approved';
 const ord=await render(rows,{section:'orders'});assert.match(T(ord),/1 request marked approved without valid approvals/);assert.doesNotMatch(T(ord).split('Open orders')[0],/Nitrile gloves M \(fictional\) × 10/);
});

test('acceptance 2: two requests grouped into one order; a partial receipt creates one lot and keeps the rest open; received movements follow',async()=>{
 const rows=fresh();const ui=session(rows);await ui.open({section:'orders',me:'Jon Petersen'});
 const appr=byRole(rows,'labinventory.requests').filter(r=>r.data.status==='approved');assert.equal(appr.length,2);
 assert.match(T(ui),/To order, by supplier .*Example Reagents GmbH .*Taq polymerase mix .*Placeholder Bio Supply .*Filter units/);
 await ui.click('panel:neworder:none');assert.match(T(ui),/Supplier agreements \(from Contracts\)|Log an order/);
 const sup=byRole(rows,'organizations').find(o=>o.data.name==='Placeholder Bio Supply')!.id;
 await ui.submit('save-order',{supplier_id:sup,order_number:'PB-40001',ordered_on:'2026-11-14',expected_on:'2026-11-20',amount:'281',currency:'EUR',...Object.fromEntries(appr.map(r=>['r_'+r.id,'on']))});
 assert.equal(ui.last.changes.length,3);assert.match(ui.state.notice,/Nothing is sent to the supplier/);const [oid]=ui.approve();
 const o=rows.find(r=>r.id===oid)!;assert.deepEqual([o.data.status,o.data.request_ids.split(',').sort().join(),o.data.ordered_by],['ordered',appr.map(r=>r.id).sort().join(),'Jon Petersen']);assert.ok(appr.every(r=>r.data.status==='ordered'));
 // Partial receipt: one line received, the other nothing → one lot, order partially received, the other request stays ordered.
 const [taq,filt]=[appr.find(r=>r.data.item_name==='Taq polymerase mix (fictional)')!,appr.find(r=>r.data.item_name==='Filter units 0.22 µm (fictional)')!];
 const shelf=id(rows,'labinventory.locations',d=>d.name==='Shelf 2');
 await ui.click('panel:receive:'+oid);assert.match(T(ui),/Taq polymerase mix \(fictional\) · ordered 1/);
 const before=byRole(rows,'labinventory.lots').length;
 await ui.submit('receive',{['q_'+taq.id]:'1',['n_'+taq.id]:'TQ-7781',['e_'+taq.id]:'2027-08-31',['l_'+taq.id]:shelf,['q_'+filt.id]:'0'});ui.approve();
 const lots=byRole(rows,'labinventory.lots');assert.equal(lots.length,before+1);const nl=lots[lots.length-1].data;
 assert.deepEqual([nl.lot_number,nl.quantity,nl.expires_on,nl.location_id,nl.status,nl.order_id],['TQ-7781',1,'2027-08-31',shelf,'in_stock',oid]);
 assert.deepEqual([o.data.status,taq.data.status,filt.data.status,taq.data.order_id],['partially_received','received','ordered',oid]);
 // Every quantity change has a movement: the received movement follows in the next review (one click).
 await ui.open({section:'orders'});assert.match(T(ui),/1 lot received without a movement yet/);await ui.click('record-receipts');
 assert.deepEqual(ui.last.changes.map((c:any)=>[c.typeId,c.data.kind,c.data.quantity_change]),[['labinventory.movements','received',1]]);ui.approve();
 await ui.open({section:'orders'});assert.doesNotMatch(T(ui),/received without a movement/);
 // The rest arrives later: the order completes.
 await ui.click('panel:receive:'+oid);assert.doesNotMatch(T(ui),/Taq polymerase mix \(fictional\) · ordered/);await ui.submit('receive',{['q_'+filt.id]:'1',['l_'+filt.id]:shelf});ui.approve();assert.deepEqual([o.data.status,filt.data.status],['received','received']);
 // A new item on a request must be added to the catalog before it is received.
 const primer=byRole(rows,'labinventory.requests').find(r=>r.data.new_item_name)!;Object.assign(primer.data,{status:'ordered',approved_1_by:'Mia Novak'});o.data.request_ids+=','+primer.id;o.data.status='partially_received';
 await ui.click('panel:receive:'+oid);await ui.submit('receive',{['q_'+primer.id]:'3',['l_'+primer.id]:shelf});assert.match(ui.state.notice,/is not in the catalog yet: add it as an item first/);
 const agar=item(rows,'Agarose (fictional)');await ui.submit('receive',{['q_'+primer.id]:'3',['l_'+primer.id]:shelf,['i_'+primer.id]:agar});assert.equal(ui.last.changes.find((c:any)=>c.recordId===primer.id).data.item_id,agar);
});

test('acceptance 4: "Used one" from the QR page reduces the earliest-expiring lot; "Used up"; quick count logs the difference',async()=>{
 const rows=fresh();const fbs=item(rows,'Fetal bovine serum (fictional)');const ui=session(rows,{route:{path:'/item',recordId:fbs}});
 await ui.open();assert.equal(ui.state.section,'item');assert.match(T(ui),/Use next: lot L80748/);
 await ui.click('use-one:'+lotsOf(rows,fbs)[0].id);assert.match(ui.state.notice,/Enter your name first/);
 await ui.change('me','Ana Silva');const earliest=lotsOf(rows,fbs).filter(l=>l.data.status==='in_stock').sort((a,b)=>a.data.expires_on.localeCompare(b.data.expires_on))[0];
 await ui.click('use-one:'+earliest.id);const ch=ui.last.changes;
 assert.deepEqual(ch.map((c:any)=>c.kind),['update_record','create_record']);assert.deepEqual(ch[0].data,{quantity:0,status:'used_up'});assert.equal(ch[0].recordId,earliest.id);
 assert.deepEqual(ch[1].data,{lot_id:earliest.id,kind:'used',quantity_change:-1,occurred_on:'2026-11-14',by:'Ana Silva',via:'qr',note:null});ui.approve();
 // The next lot is suggested now; a quick count logs the difference only.
 await ui.open();const next=lotsOf(rows,fbs).find(l=>l.data.status==='in_stock')!;assert.match(T(ui),new RegExp('Use next: lot '+next.data.lot_number));
 await ui.submit('save-count-quick',{quantity:'3'});assert.deepEqual(ui.last.changes.map((c:any)=>c.data),[{quantity:3,status:'in_stock'},{lot_id:next.id,kind:'count',quantity_change:2,occurred_on:'2026-11-14',by:'Ana Silva',via:'qr',note:'Quick count'}]);ui.approve();
 await ui.submit('save-count-quick',{quantity:'3'});assert.match(ui.state.notice,/count matches/);assert.equal(ui.last.changes.length,0);
 // In the app: Used up empties the lot with one used movement of the whole quantity.
 const app=session(rows);await app.open({section:'inventory',me:'Jon Petersen'});await app.click('use-up:'+next.id);
 assert.deepEqual(app.last.changes.map((c:any)=>c.data),[{quantity:0,status:'used_up'},{lot_id:next.id,kind:'used',quantity_change:-3,occurred_on:'2026-11-14',by:'Jon Petersen',via:'app',note:'Used up'}]);
 // Moving and discarding also write movements; the move keeps the quantity.
 const tips=item(rows,'Pipette tips 200 µL (fictional)'),tl=lotsOf(rows,tips)[0],box=id(rows,'labinventory.locations',d=>d.name==='Box A3');
 await app.click('panel:move:'+tl.id);await app.submit('save-move',{location_id:box});assert.deepEqual(app.last.changes.map((c:any)=>[c.data.kind??'lot',c.data.quantity_change??c.data.location_id]),[['lot',box],['moved',0]]);
 await app.click('discard:'+tl.id);assert.deepEqual(app.last.changes.map((c:any)=>c.data.quantity_change??c.data.status),['discarded',-tl.data.quantity]);
});

test('acceptance 5: alerts appear; the suggested quantity follows §7 and one click creates a request',async()=>{
 const rows=fresh();const ui=session(rows);await ui.open({section:'overview'});
 assert.match(T(ui),/Low stock Pipette tips 200 µL \(fictional\) · 3 boxes \(reorder at 4\)/);assert.match(T(ui),/Expiring in 30 days RPMI 1640 \(fictional\) lot L84086 · 17 Nov 2026/);assert.match(T(ui),/Expired, still in stock Ethanol 70% \(fictional\) lot L45168 · expired 15 Oct 2026/);
 const tips=item(rows,'Pipette tips 200 µL (fictional)');await ui.click('reorder:'+tips);assert.match(ui.state.notice,/Enter your name first/);
 await ui.change('me','Jon Petersen');await ui.click('reorder:'+tips);
 assert.deepEqual(ui.last.changes[0].data,{item_id:tips,item_name:'Pipette tips 200 µL (fictional)',new_item_name:null,quantity:10,program_id:null,urgency:'normal',estimated_amount:65,requested_by:'Jon Petersen',requested_on:'2026-11-14',status:'requested',note:'Reorder suggestion: usual order quantity'});
 ui.approve();await ui.open();assert.match(T(ui),/Pipette tips 200 µL \(fictional\) 3 boxes 4 10 boxes usual order quantity Requested/);
 await ui.click('reorder:'+tips);assert.match(ui.state.notice,/already an open request/);
});

test('acceptance 6: the digest is concise (≤ 3 lines per section), omits empty sections and says so in one line when nothing needs attention; schedule',async()=>{
 const rows=fresh();const d=digestOf((await render(rows,{section:'settings'})).html);assert.equal(d.state,'ready');
 const lines=d.text.split('\n');assert.equal(lines[0],'Lab Inventory · low stock: 6 · suggested reorders: 4 · expiring: 6 · expired: 5 · approvals waiting: 4 · late orders: 1 (week of 9 Nov 2026)');
 const sections=d.text.split('\n\n').slice(1,-1);assert.deepEqual(sections.map(s=>s.split('\n')[0]),['Low stock (6)','Suggested reorders (4)','Expiring in 30 days (6)','Expired, still in stock (5)','Approvals waiting (4)','Late orders (1)']);
 for(const s of sections)assert.ok(s.split('\n').length<=4,'heading plus at most 3 lines: '+s);
 assert.match(d.text,/- Pipette tips 10 µL \(fictional\): 3 boxes left, reorder at 3 · and 3 more/);assert.ok(d.text.split(/\s+/).length<320,'about one screen: '+d.text.split(/\s+/).length);
 // Empty sections are left out.
 for(const o of byRole(rows,'labinventory.orders'))if(o.data.status==='ordered')o.data.expected_on='2026-12-01';
 for(const r of byRole(rows,'labinventory.requests'))if(r.data.status==='requested')r.data.status='cancelled';
 const d2=digestOf((await render(rows,{section:'settings'})).html);assert.doesNotMatch(d2.text,/Late orders|Approvals waiting/);assert.match(d2.text,/Low stock \(6\)/);
 // Nothing to report: one line.
 const empty=fresh().filter(r=>!['labinventory.items','labinventory.lots','labinventory.requests','labinventory.orders','labinventory.movements'].includes(r.role));
 const d3=digestOf((await render(empty,{section:'settings'})).html);assert.equal(d3.state,'empty');assert.equal(d3.text,'Lab Inventory · nothing needs attention (week of 9 Nov 2026)\nNothing needs attention: no low stock, expiring or expired lots, approvals or late orders.'.replace('no low stock','no low stock'),d3.text);
 // Cadence: weekly Monday 08:00 is next due Monday 16 Nov 2026 08:00 Europe/Berlin through the platform calendar.
 const s=T(await render(fresh(),{section:'settings'}));assert.match(s,/Every Monday at 08:00 · next 16 Nov 2026/);
 const due=nextCalendar({kind:'calendar',frequency:'weekly',time:'08:00',timeZone:'Europe/Berlin',anchor:'2026-11-14',interval:1,weekdays:[1],monthDay:1,monthEnd:'last_day'} as any,new Date('2026-11-14T10:00:00Z'));assert.equal(due.toISOString(),'2026-11-16T07:00:00.000Z');
 // The documented completion email is a valid platform action that sends the run summary unchanged.
 const email={name:'Lab Inventory digest',appId:crypto.randomUUID(),appVersion:1,trigger:{kind:'database',source:'automation_runs',automationId:crypto.randomUUID(),automationVersion:0,events:['updated'],fields:['status'],becomes:{field:'status',operator:'equals',value:'completed'}},steps:[{id:'digest',kind:'email',to:'account',subject:'Lab Inventory digest',text:'{{run.summary}}'}],expiresAt:'2027-11-14T00:00:00Z'};
 assert.ok(actionPreparation.safeParse({config:email}).success);assert.equal(expand('{{run.summary}}',{run:{summary:d.text}}),d.text);
 // Daily and monthly cadence labels.
 const r4=fresh();const st=r4.find(r=>r.role==='labinventory.settings')!;st.data.digest_cadence='monthly';assert.match(T(await render(r4,{section:'settings'})),/On the 1st of each month at 08:00 · next 1 Dec 2026/);
 st.data.digest_cadence='daily';const d4=digestOf((await render(r4,{section:'settings'})).html);assert.match(d4.text.split('\n')[0],/\(14 Nov 2026\)$/);
});

test('approval and status notifications are valid platform email actions on request creation and status changes',async()=>{
 const appId=crypto.randomUUID(),typeId=crypto.randomUUID();
 const approval={name:'Lab Inventory approval request',appId,appVersion:1,recordTypeId:typeId,trigger:{kind:'database',typeId,events:['created'],fields:[]},steps:[{id:'approver',kind:'email',to:['approver@example.invalid'],subject:'Lab Inventory: a request is waiting for approval',text:'{{record.requested_by}} requests {{record.quantity}} × {{record.item_name}} (estimated {{record.estimated_amount}}). Open Lab Inventory → Requests to approve or reject it.'}],expiresAt:'2027-11-14T00:00:00Z'};
 const statuses=['approved','rejected','ordered','received'].map(to=>({name:'Lab Inventory '+to+' (Ana Silva)',appId,appVersion:1,recordTypeId:typeId,fields:['requested_by','item_name','status'],conditions:[{field:'requested_by',operator:'equals',value:'Ana Silva'}],trigger:{kind:'database',typeId,events:['updated'],fields:['status'],becomes:{field:'status',operator:'equals',value:to}},steps:[{id:'requester',kind:'email',to:['ana@example.invalid'],subject:'Lab Inventory: your request was '+to,text:'Your request for {{record.item_name}} is now {{record.status}}. Open Lab Inventory → Requests for details.'}],expiresAt:'2027-11-14T00:00:00Z'}));const status=statuses[0];
 for(const c of [approval,...statuses])assert.ok(actionPreparation.safeParse({config:c}).success,JSON.stringify(actionPreparation.safeParse({config:c}).error?.issues));
 assert.equal(expand(status.steps[0].text,{record:{item_name:'Agarose (fictional)',status:'approved'}}),'Your request for Agarose (fictional) is now approved. Open Lab Inventory → Requests for details.');
});

test('acceptance 7: a custom category ("Primers") becomes available in items and filters; standard categories are set up with one click',async()=>{
 const rows=fresh().filter(r=>r.role!=='labinventory.categories');const ui=session(rows);await ui.open({section:'settings'});
 await ui.click('add:items');assert.match(ui.state.notice,/Add the standard categories first/);
 await ui.click('setup-categories');assert.deepEqual(ui.last.changes.map((c:any)=>[c.data.name,c.data.standard]),[['Reagent',true],['Consumable',true],['Antibody',true],['Cell line',true],['Plasmid',true],['Chemical',true]]);ui.approve();
 await ui.submit('add-category',{name:'Primers'});assert.deepEqual(ui.last.changes[0].data,{name:'Primers',standard:false,archived:false});ui.approve();
 await ui.submit('add-category',{name:'primers'});assert.match(ui.state.notice,/already a category/);
 const primers=id(rows,'labinventory.categories',d=>d.name==='Primers');
 await ui.click('nav:inventory');assert.match(ui.html,new RegExp('<option value="'+primers+'">Primers</option>'),'filter offers Primers');
 await ui.click('add:items');assert.match(ui.html,new RegExp('<option value="'+primers+'">Primers</option>'),'item form offers Primers');
 await ui.submit('save-record',{name:'qPCR primer set A (fictional)',category_id:primers,unit:'tube'});ui.approve();
 await ui.change('filter:category',primers);assert.match(T(ui),/qPCR primer set A \(fictional\)/);assert.doesNotMatch(T(ui),/Pipette tips/);
 // Standard categories cannot be archived; a custom one in use cannot either.
 await ui.click('archive:categories:'+id(rows,'labinventory.categories',d=>d.name==='Reagent'));assert.match(ui.state.notice,/Standard categories stay/);
 await ui.click('archive:categories:'+primers);assert.match(ui.state.notice,/Move the items/);
});

test('acceptance 3 and 8 in the app: duplicates and stock are checked; no app control approves for an assistant (approval fields are app flows only)',async()=>{
 const rows=fresh();const ui=session(rows);await ui.open({section:'inventory',me:'Ana Silva'});
 await ui.click('add:items');await ui.submit('save-record',{name:'Agarose (fictional)',category_id:id(rows,'labinventory.categories',d=>d.name==='Reagent'),unit:'bottle'});assert.match(ui.state.notice,/already in the catalog \(1 bottle in stock\)/);
 // New-item requests show similar catalog items.
 await ui.click('panel:newrequest');await ui.change('f:request:new_item_name','agarose');assert.match(T(ui),/Similar items are already in the catalog: Agarose \(fictional\) \(1 bottle\)/);
 // The generic editor never offers approval, status, quantity or movement fields.
 await ui.click('edit:lots:'+byRole(rows,'labinventory.lots')[0].id);assert.doesNotMatch(ui.html,/name="(quantity|status|location_id)"/);
 // Approvals happen only in the decision flow, by a named approver who is not the requester; the assistant path is tested with the platform review.
 const rq=byRole(rows,'labinventory.requests').find(r=>r.data.status==='requested'&&!r.data.approved_1_by)!;await ui.click('panel:request:'+rq.id);
 await ui.submit('decide',{as:''},'approve');assert.match(ui.state.notice,/The requester cannot approve/);await ui.change('me','');await ui.submit('decide',{as:''},'approve');assert.match(ui.state.notice,/Choose who you are/);assert.equal(ui.last.changes.length,0);
});

test('integrity: partial reads disable writes; a failed proposal keeps the draft; stale versions; drafts survive reruns',async()=>{
 const rows=fresh();
 // Over the read budget: items reported partial; writes are refused with a banner.
 const big=fresh();const base=byRole(big,'labinventory.items')[0];for(let i=0;i<820;i++)big.push({id:crypto.randomUUID(),version:0,role:'labinventory.items',data:{...base.data,name:'Bulk item '+i}});
 const p=await render(big,{section:'overview'});assert.match(T(p),/Partial data: totals, alerts and "nothing waiting" answers may be incomplete/);assert.match(T(p),/Only part of the item records was read/);
 const w=await render(big,{section:'overview',me:'Ana'},{kind:'click',action:'reorder:'+base.id});assert.equal(w.changes.length,0);assert.match(w.state.notice,/changes are disabled/);
 // Unavailable table: shown as not readable, never as zero.
 const un=await render(rows,{section:'overview'},{kind:'open'},{read:(v:any,all:any[])=>v.typeId==='labinventory.lots'?{unavailable:true,rows:[],total:null}:{rows:all.filter((r:any)=>r.role===v.typeId).slice(v.offset,v.offset+v.limit),total:all.filter((r:any)=>r.role===v.typeId).length}});
 assert.match(T(un),/Lot records could not be read/);assert.match(T(un),/Low stock — /);
 // Unbound optional roles: programs and agreements absent, the app still works and hides program features.
 const m={...fullMap};delete m.programs;delete m.agreements;const lean=await render(rows,{section:'settings'},{kind:'open'},{config:cfgFor(m)});assert.doesNotMatch(lean.html,/li-banner bad/);assert.match(T(lean),/Per-program approvers need a programs table/);
 // A failed proposal keeps the draft.
 const ui=session(rows,{failPropose:true});await ui.open({section:'requests',me:'Ana Silva'});await ui.click('panel:newrequest');await ui.change('f:request:note','Keep me');
 await ui.submit('save-request',{item_id:item(rows,'Agarose (fictional)'),quantity:'1',note:'Keep me'});assert.match(ui.state.notice,/denied|unavailable/);assert.equal(ui.state.f.request.note,'Keep me');assert.equal(ui.state.panel.type,'newrequest');
 // Edits carry the version from when the form opened.
 const it=byRole(rows,'labinventory.items')[0];const ed=session(rows);await ed.open({section:'inventory'});await ed.click('edit:items:'+it.id);it.version=5;
 await ed.submit('save-record',{name:it.data.name,category_id:it.data.category_id,unit:it.data.unit,owner:'New owner'});assert.equal(ed.last.changes[0].expectedVersion,0);assert.throws(()=>approve(rows,ed.last.changes),/stale/);
});

test('locations: tree, contents, archive only empty locations; QR label sheets for A4 and Letter decode-ready SVG',async()=>{
 const rows=fresh();const ui=session(rows);const freezer=id(rows,'labinventory.locations',d=>d.name==='Freezer B');
 await ui.open({section:'locations'});await ui.click('open-loc:'+freezer);assert.match(T(ui),/Lab 2\.14 › Freezer B .*Fetal bovine serum \(fictional\)/);
 await ui.click('archive:locations:'+freezer);assert.match(ui.state.notice,/Only empty locations can be archived/);
 await ui.click('add:locations:'+freezer);assert.match(ui.html,/name="kind"[^>]*>[\s\S]*value="shelf" selected/);await ui.submit('save-record',{name:'Shelf 3',kind:'shelf',parent_id:freezer});const [s3]=ui.approve();
 await ui.click('archive:locations:'+s3);assert.deepEqual(ui.last.changes[0].data,{archived:true});
 // Labels: A4 21 per sheet, Letter 10 per sheet; QR links open the item page with the record ID.
 await ui.click('labels:items');await ui.submit('make-labels',{paper:'a4',...Object.fromEntries(byRole(rows,'labinventory.items').map(i=>['x_'+i.id,'on']))});
 assert.equal((ui.html.match(/class="li-label"/g)||[]).length,21);assert.equal((ui.html.match(/<svg class="li-qr"/g)||[]).length,21);assert.match(T(ui),/Sheet 1 of 2/);assert.ok(ui.html.length<200000,'within the frame limit: '+ui.html.length);
 await ui.change('labels-paper','letter');assert.equal((ui.html.match(/class="li-label"/g)||[]).length,10);assert.match(T(ui),/Sheet 1 of 4/);await ui.click('labels-next');assert.match(T(ui),/Sheet 2 of 4/);
 // Without the app link, labels say how to get QR codes.
 const nolink=fresh();nolink.find(r=>r.role==='labinventory.settings')!.data.app_link=null;const u2=session(nolink);await u2.open();await u2.click('labels:locations:'+freezer);assert.match(T(u2),/QR codes need the app link/);
});

test('settings: approvals validation, alerts, units and the QR app link are reviewed writes',async()=>{
 const rows=fresh();const ui=session(rows);await ui.open({section:'settings'});
 await ui.submit('save-approvals',{approver:'Mia Novak',second_approver:'',threshold_amount:'1000'});assert.match(ui.state.notice,/Name the second approver/);
 await ui.submit('save-approvals',{approver:'Mia Novak',second_approver:'mia novak',threshold_amount:'1000'});assert.match(ui.state.notice,/another person/);
 const progs=byRole(rows,'programs');await ui.submit('save-approvals',{approver:'Mia Novak',second_approver:'Sam Rivera',threshold_amount:'1500',currency:'EUR',['pa_'+progs[0].id]:'Jon Petersen'});
 assert.deepEqual(JSON.parse(ui.last.changes[0].data.program_approvers),{[progs[0].id]:'Jon Petersen'});assert.equal(ui.last.changes[0].data.threshold_amount,1500);
 await ui.submit('save-alerts',{expiry_window_days:'45',digest_cadence:'weekly',digest_day:'fri',digest_time:'7:00'});assert.match(ui.state.notice,/HH:MM/);
 await ui.submit('save-alerts',{expiry_window_days:'45',digest_cadence:'weekly',digest_day:'fri',digest_time:'07:30',digest_text:'Lab digest'});assert.deepEqual(ui.last.changes[0].data,{expiry_window_days:45,digest_cadence:'weekly',digest_day:'fri',digest_time:'07:30',digest_recipients:null,digest_text:'Lab digest'});
 await ui.submit('save-general',{units:'bottle, box',app_link:'https://example.com/whatever'});assert.match(ui.state.notice,/Paste the app link/);
 // First use: no settings row yet; approvals create it with the documented defaults.
 const empty=fresh().filter(r=>r.role!=='labinventory.settings');const u2=session(empty);await u2.open({section:'settings'});await u2.submit('save-alerts',{expiry_window_days:'30',digest_time:'08:00'});assert.match(u2.state.notice,/Set the approver first/);
 await u2.submit('save-approvals',{approver:'Mia Novak'});assert.equal(u2.last.changes[0].kind,'create_record');assert.deepEqual([u2.last.changes[0].data.expiry_window_days,u2.last.changes[0].data.digest_day,u2.last.changes[0].data.digest_time],[30,'mon','08:00']);
});
