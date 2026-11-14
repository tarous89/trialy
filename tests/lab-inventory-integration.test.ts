import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {labSuite,text} from './fixtures/lab-inventory.js';
import {installCatalogApp} from '../src/workspace/template-catalog.js';
import {archivedItems} from '../src/workspace/archive.js';
import {AccessGrid} from '../src/domain/access-grid.js';

/* LAB_INVENTORY.md §12 through the real installer and Add app step, the app runtime, the workspace review and the assistants' MCP
 * endpoints, on disposable databases. Fictional data only. */
const T=(h:string)=>text(h);
const withMap=(source:string,map:any)=>source.replace(/^const templateConfiguration=(.+);\n/,(_:string,j:string)=>{const c=JSON.parse(j);c.tableMap=JSON.stringify(map);return 'const templateConfiguration='+JSON.stringify(c)+';\n';});

test('acceptance 9 and the data access step: alone (nine tables), after Programs and Contracts (shared suppliers, programs and agreements read only), partner archived, tab removed and re-added, app archived with automations paused, restore before reinstall',async()=>{
 const x=await labSuite();const {pg,f,s,actor,T:C}=x;
 try{
  // 1. Alone: organizations plus eight labinventory tables; programs and agreements are optional read-only roles and are not created.
  const w1=(await s.createWorkspace(actor,'Lab alone')).id;const a=await x.install(w1,C.lab,'Lab Inventory');assert.equal(await x.tables(w1),9);
  const id1=a.receipt.appId,c1=await x.comp(w1,id1),map1=x.mapOf(c1);
  assert.deepEqual(Object.keys(map1).sort(),['labinventory.categories','labinventory.items','labinventory.locations','labinventory.lots','labinventory.movements','labinventory.orders','labinventory.requests','labinventory.settings','organizations']);
  assert.deepEqual(c1.manifest.roles.map((r:any)=>[r.role,r.contract,!!r.optional,!!r.readOnly,!!r.typeId]).sort(),[['agreements','core.v1',true,true,false],['labinventory.categories','labinventory.v1',false,false,true],['labinventory.items','labinventory.v1',false,false,true],['labinventory.locations','labinventory.v1',false,false,true],['labinventory.lots','labinventory.v1',false,false,true],['labinventory.movements','labinventory.v1',false,false,true],['labinventory.orders','labinventory.v1',false,false,true],['labinventory.requests','labinventory.v1',false,false,true],['labinventory.settings','labinventory.v1',false,false,true],['organizations','core.v1',false,false,true],['programs','core.v1',true,true,false]].sort());
  const ui1=x.app(w1,id1);await ui1.open();assert.match(T(ui1.html),/Get started .*Set the approver/);assert.doesNotMatch(ui1.html,/li-banner bad|could not be shown/);
  await ui1.open({section:'settings'});assert.match(T(ui1.html),/Per-program approvers need a programs table/);

  // 2. Programs and Contracts first: the Use existing data? step offers organizations, programs and agreements; Connect all shares them.
  const w2=(await s.createWorkspace(actor,'Lab with partners')).id;const p=await x.install(w2,C.programs,'Programs'),c=await x.install(w2,C.contracts,'Contracts');
  const pmap=x.mapOf(await x.comp(w2,p.receipt.appId)),cmap=x.mapOf(await x.comp(w2,c.receipt.appId));
  const l=await x.install(w2,C.lab,'Lab Inventory');assert.equal(l.step.needed,true);
  assert.deepEqual(l.step.tables.map((t:any)=>t.role).sort(),['agreements','organizations','programs']);
  const id2=l.receipt.appId,map2=x.mapOf(await x.comp(w2,id2));
  assert.equal(map2.organizations.typeId,cmap.organizations.typeId,'one supplier table with Contracts');assert.equal(map2.programs.typeId,pmap.programs.typeId);assert.equal(map2.agreements.typeId,cmap.agreements.typeId);
  assert.deepEqual([map2.programs.writableFields,map2.agreements.writableFields],[[],[]]);assert.ok(map2.organizations.writableFields.includes('name'));
  // Program data and supplier agreements appear in Lab Inventory.
  const prog=await x.save(w2,pmap.programs.typeId,{name:'NWB-101 (fictional)',stage:'preclinical',status:'active',archived:false});
  const sup=await x.save(w2,cmap.organizations.typeId,{name:'Example Reagents GmbH',org_type:'other',archived:false});
  await x.save(w2,cmap.agreements.typeId,{name:'Supply framework — Example Reagents (fictional)',counterparty_id:sup,agreement_type:'supply',status:'active',archived:false});
  const ui2=x.app(w2,id2);await ui2.open({section:'settings'});assert.match(T(ui2.html),/Approver for NWB-101 \(fictional\)/);
  // Lab Inventory never writes programs: a direct proposal against the read-only binding is refused by the platform.
  const before=await x.rows(pmap.programs.typeId);
  // 3. Partner archived: Programs archived; Lab Inventory still opens (programs hidden, no error).
  const change=async(op:any)=>{const pv=await f.preview(actor,w2,op);return f.confirm(actor,w2,pv.id,pv.digest);};
  await change({kind:'archive_component',componentId:p.receipt.appId,expectedVersion:await x.version(p.receipt.appId),archived:true});
  await ui2.open({section:'overview'});assert.doesNotMatch(ui2.html,/li-banner bad|could not be shown/);
  assert.deepEqual(await x.rows(pmap.programs.typeId),before,'nothing changed in programs');
  // 4. Remove the programs and agreements tabs (unbind), then re-add them: the same tables reconnect; records stay.
  const cc=await x.comp(w2,id2),drop=[map2.programs.typeId,map2.agreements.typeId],lean={...map2};delete lean.programs;delete lean.agreements;
  const revise=async(m:any,b:any[],man:any[])=>{const k=await x.comp(w2,id2);return change({kind:'save_component',componentId:k.id,expectedVersion:k.version,projectId:k.project_id,content:{name:k.name,format:'frontend-js',source:withMap(k.source,m),sourceAccess:k.source_access??'workspace',bindings:b,manifest:{...k.manifest,fields:man}}});};
  await revise(lean,cc.bindings.filter((b:any)=>!drop.includes(b.typeId)),cc.manifest.fields.filter((m:any)=>!drop.includes(m.typeId)));
  await ui2.open({section:'settings'});assert.match(T(ui2.html),/Per-program approvers need a programs table/);assert.doesNotMatch(ui2.html,/li-banner bad/);
  await revise(map2,cc.bindings,cc.manifest.fields);assert.equal(x.mapOf(await x.comp(w2,id2)).programs.typeId,pmap.programs.typeId);await ui2.open({section:'settings'});assert.match(T(ui2.html),/Approver for NWB-101/);
  // 5. Archive first: archiving the app keeps every table and record and pauses its automations; restore brings them back switched off; reinstall offers restore.
  const action=randomUUID();await pg.query("INSERT INTO app_actions(id,workspace_id,user_id,app_id,config,approved_by) VALUES($1,$2,$3,$4,'{\"name\":\"Lab Inventory approval request\"}',$3)",[action,w2,actor.userId,id2]);
  const recordsBefore=(await pg.query<any>('SELECT count(*)::int n FROM records WHERE workspace_id=$1',[w2])).rows[0].n,fieldsBefore=(await pg.query<any>('SELECT id,fields FROM entity_types WHERE workspace_id=$1 ORDER BY id',[w2])).rows;
  await change({kind:'archive_component',componentId:id2,expectedVersion:await x.version(id2),archived:true});
  assert.equal((await pg.query<any>('SELECT paused FROM app_actions WHERE id=$1',[action])).rows[0].paused,true,'archiving pauses the automation');
  assert.deepEqual((await pg.query<any>('SELECT id,fields FROM entity_types WHERE workspace_id=$1 ORDER BY id',[w2])).rows,fieldsBefore);
  assert.ok((await archivedItems(f,actor,w2,{kind:'apps'})).items.some((i:any)=>i.id===id2));
  await assert.rejects(()=>installCatalogApp(f,actor,w2,{templateId:C.lab.id,version:C.lab.version,digest:C.lab.digest,name:'Lab Inventory',requestKey:randomUUID()}),/Restore your archived Lab Inventory app/);
  await change({kind:'archive_component',componentId:id2,expectedVersion:await x.version(id2),archived:false});
  const j=(await pg.query<any>('SELECT paused,deleted_at FROM app_actions WHERE id=$1',[action])).rows[0];assert.deepEqual([j.paused,j.deleted_at],[true,null],'restored switched off');
  assert.equal((await pg.query<any>('SELECT count(*)::int n FROM records WHERE workspace_id=$1',[w2])).rows[0].n,recordsBefore);
  await ui2.open({section:'overview'});assert.doesNotMatch(ui2.html,/li-banner bad/);
  // Reinstall a new copy on request: it reconnects the shared suppliers table by default.
  const again=await x.install(w2,C.lab,'Lab Inventory 2',{},{createNew:true});assert.equal(x.mapOf(await x.comp(w2,again.receipt.appId)).organizations.typeId,cmap.organizations.typeId);
 }finally{await x.pg.close();}
});

test('acceptance 1, 2, 4, 5, 7 end to end: set-up, request with stock check, threshold approvals, never self-approval, grouped order, partial receipt, movements, QR use, reorder',async()=>{
 const x=await labSuite();const {f,s,actor,T:C}=x;
 try{
  const w=(await s.createWorkspace(actor,'Lab end to end')).id;const {receipt}=await x.install(w,C.lab,'Lab Inventory');const id=receipt.appId,map=x.mapOf(await x.comp(w,id)),tid=(r:string)=>map[r].typeId;
  const ui=x.app(w,id);await ui.open({section:'settings',me:'Mia Novak'});
  await ui.submit('save-approvals',{approver:'Mia Novak',second_approver:'Sam Rivera',threshold_amount:'2000',currency:'EUR'});assert.equal((await x.rows(tid('labinventory.settings'))).length,0,'nothing written before approval');await ui.approve();
  await ui.click('setup-categories');await ui.approve();await ui.submit('add-category',{name:'Primers'});await ui.approve();
  assert.deepEqual((await x.rows(tid('labinventory.categories'))).map((r:any)=>r.data.name).sort(),['Antibody','Cell line','Chemical','Consumable','Plasmid','Primers','Reagent']);
  const link='https://platform.trialagents.com/apps/'+id+'?workspaceId='+w;await ui.submit('save-general',{units:'bottle, box, vial, tube',app_link:link});await ui.approve();
  // Locations: room → freezer → shelf.
  await ui.open({section:'locations'});await ui.click('add:locations');await ui.submit('save-record',{name:'Lab 2.14',kind:'room'});await ui.approve();
  const room=(await x.rows(tid('labinventory.locations')))[0].id;await ui.click('add:locations:'+room);await ui.submit('save-record',{name:'Freezer B',kind:'freezer',parent_id:room,temperature:'-20 °C'});await ui.approve();
  const freezer=(await x.rows(tid('labinventory.locations'))).find((r:any)=>r.data.name==='Freezer B').id;
  // Supplier and items (FBS EUR 410 per bottle; primers in the custom category).
  const sup=await x.save(w,tid('organizations'),{name:'Example Reagents GmbH',org_type:'other',archived:false});
  const cat=Object.fromEntries((await x.rows(tid('labinventory.categories'))).map((r:any)=>[r.data.name,r.id]));
  await ui.open({section:'inventory'});await ui.click('add:items');assert.match(ui.html,/>Primers<\/option>/,'custom category offered');
  await ui.submit('save-record',{name:'Fetal bovine serum (fictional)',category_id:cat.Reagent,supplier_id:sup,unit:'bottle',last_price:'410',currency:'EUR',reorder_point:'2',reorder_quantity:'2',lead_time_days:'21',default_location_id:freezer});await ui.approve();
  await ui.click('add:items');await ui.submit('save-record',{name:'qPCR primers NWB (fictional)',category_id:cat.Primers,supplier_id:sup,unit:'tube',last_price:'40',currency:'EUR',default_location_id:freezer});await ui.approve();
  const items=Object.fromEntries((await x.rows(tid('labinventory.items'))).map((r:any)=>[r.data.name,r.id]));const fbs=items['Fetal bovine serum (fictional)'],pr=items['qPCR primers NWB (fictional)'];
  await ui.change('filter:category',cat.Primers);assert.match(T(ui.html),/qPCR primers NWB \(fictional\)/);assert.doesNotMatch(T(ui.html),/Fetal bovine serum/);await ui.change('filter:category','');
  // Two lots of FBS (expiring March and June), then their received movements.
  for(const [n,e] of [['L-MAR','2027-03-31'],['L-JUN','2027-06-30']]){await ui.click('panel:lot:'+fbs);await ui.submit('save-lot',{quantity:'1',lot_number:n,expires_on:e,location_id:freezer,received_on:'2026-11-01'});await ui.approve();}
  await ui.open({section:'inventory'});assert.match(T(ui.html),/2 lots received without a movement yet/);await ui.click('record-receipts');await ui.approve();
  assert.deepEqual((await x.rows(tid('labinventory.movements'))).map((m:any)=>[m.data.kind,m.data.quantity_change]),[['received',1],['received',1]]);
  // Acceptance 1: the request shows the lots first.
  const ana=x.app(w,id);await ana.open({section:'requests',me:'Ana Silva'});await ana.click('panel:newrequest');await ana.change('f:request:item_id',fbs);
  assert.match(T(ana.html),/We already have it: 2 bottles in stock 1 bottle in Lab 2\.14 › Freezer B · lot L-MAR · expires 31 Mar 2027 1 bottle in Lab 2\.14 › Freezer B · lot L-JUN/);
  await ana.submit('save-request',{item_id:fbs,quantity:'2'});await ana.approve();
  await ana.click('panel:newrequest');await ana.submit('save-request',{item_id:pr,quantity:'3'});await ana.approve();
  await ana.click('panel:newrequest');await ana.submit('save-request',{item_id:fbs,quantity:'6',urgency:'urgent'});await ana.approve();
  const req=async()=>(await x.rows(tid('labinventory.requests'))).map((r:any)=>({id:r.id,...r.data}));let R=await req();
  assert.deepEqual(R.map((r:any)=>[r.quantity,r.estimated_amount,r.status,r.requested_by]),[[2,820,'requested','Ana Silva'],[3,120,'requested','Ana Silva'],[6,2460,'requested','Ana Silva']]);
  // The requester cannot approve; the approver approves below the threshold in one step; above it the second approver completes it.
  await ana.click('panel:request:'+R[0].id);await ana.submit('decide',{as:'Ana Silva'},'approve');assert.equal(ana.last.proposal,null);assert.match(ana.state().notice,/cannot approve or reject their own request/);
  const mia=x.app(w,id);await mia.open({section:'requests',me:'Mia Novak'});
  for(const r of R){await mia.click('panel:request:'+r.id);await mia.submit('decide',{as:'Mia Novak'},'approve');await mia.approve();}
  R=await req();assert.deepEqual(R.map((r:any)=>[r.status,r.approved_1_by,r.approved_2_by??null]),[['approved','Mia Novak',null],['approved','Mia Novak',null],['requested','Mia Novak',null]]);
  await mia.click('panel:request:'+R[2].id);await mia.submit('decide',{as:'Mia Novak'},'approve');assert.match(mia.state().notice,/second approval is for Sam Rivera/);
  const sam=x.app(w,id);await sam.open({section:'requests',me:'Sam Rivera'});await sam.click('panel:request:'+R[2].id);await sam.submit('decide',{as:'Sam Rivera'},'approve');await sam.approve();
  R=await req();assert.deepEqual([R[2].status,R[2].approved_2_by],['approved','Sam Rivera']);
  // Acceptance 2: two requests grouped into one order; partial receipt: one lot, the rest stays open.
  const jon=x.app(w,id);await jon.open({section:'orders',me:'Jon Petersen'});assert.match(T(jon.html),/To order, by supplier .*Example Reagents GmbH .*Fetal bovine serum/);
  await jon.click('panel:neworder:'+sup);await jon.submit('save-order',{supplier_id:sup,order_number:'ER-60001',ordered_on:'2026-11-14',expected_on:'2026-11-21',amount:'940',currency:'EUR',['r_'+R[0].id]:'on',['r_'+R[1].id]:'on'});await jon.approve();
  const ord=(await x.rows(tid('labinventory.orders')))[0];assert.deepEqual([ord.data.status,ord.data.request_ids,ord.data.ordered_by],['ordered',R[0].id+','+R[1].id,'Jon Petersen']);
  R=await req();assert.deepEqual(R.map((r:any)=>r.status),['ordered','ordered','approved']);
  await jon.click('panel:receive:'+ord.id);await jon.submit('receive',{['q_'+R[0].id]:'1',['n_'+R[0].id]:'L-NEW',['e_'+R[0].id]:'2027-09-30',['l_'+R[0].id]:freezer,['q_'+R[1].id]:'0'});await jon.approve();
  const lots=await x.rows(tid('labinventory.lots'));assert.equal(lots.filter((l:any)=>l.data.order_id===ord.id).length,1,'a partial receipt creates one lot');
  assert.equal((await x.rows(tid('labinventory.orders')))[0].data.status,'partially_received');R=await req();assert.deepEqual(R.map((r:any)=>r.status),['ordered','ordered','approved'],'1 of 2 bottles received: still open');
  await jon.click('record-receipts');await jon.approve();
  // The rest arrives: both lines complete the order.
  await jon.click('panel:receive:'+ord.id);await jon.submit('receive',{['q_'+R[0].id]:'1',['l_'+R[0].id]:freezer,['e_'+R[0].id]:'2027-09-30',['q_'+R[1].id]:'3',['n_'+R[1].id]:'P-0091',['l_'+R[1].id]:freezer});await jon.approve();await jon.click('record-receipts');await jon.approve();
  assert.equal((await x.rows(tid('labinventory.orders')))[0].data.status,'received');R=await req();assert.deepEqual(R.map((r:any)=>r.status),['received','received','approved']);
  // Acceptance 4: the QR item page (route /item) on a phone takes one unit from the earliest-expiring lot.
  const qr=x.app(w,id,actor,{path:'/item',recordId:fbs});await qr.open({me:'Ana Silva'});assert.match(T(qr.html),/Use next: lot L-MAR/);
  const mar=(await x.rows(tid('labinventory.lots'))).find((l:any)=>l.data.lot_number==='L-MAR');await qr.click('use-one:'+mar.id);await qr.approve();
  const marAfter=(await x.rows(tid('labinventory.lots'))).find((l:any)=>l.data.lot_number==='L-MAR').data;assert.deepEqual([marAfter.quantity,marAfter.status],[0,'used_up']);
  const used=(await x.rows(tid('labinventory.movements'))).filter((m:any)=>m.data.kind==='used');assert.deepEqual(used.map((m:any)=>[m.data.lot_id,m.data.quantity_change,m.data.via,m.data.by]),[[mar.id,-1,'qr','Ana Silva']]);
  // Quick count corrects and logs the difference.
  await qr.open();const jun=(await x.rows(tid('labinventory.lots'))).find((l:any)=>l.data.lot_number==='L-JUN');await qr.submit('save-count-quick',{quantity:'0'});await qr.approve();
  assert.deepEqual((await x.rows(tid('labinventory.movements'))).filter((m:any)=>m.data.kind==='count').map((m:any)=>[m.data.lot_id,m.data.quantity_change]),[[jun.id,-1]]);
  // Every lot quantity equals the sum of its movements.
  for(const l of await x.rows(tid('labinventory.lots'))){const sum=(await x.rows(tid('labinventory.movements'))).filter((m:any)=>m.data.lot_id===l.id).reduce((n:number,m:any)=>n+m.data.quantity_change,0);assert.equal(sum,l.data.quantity,l.data.lot_number);}
  // Acceptance 5: FBS is now at its reorder point (2 bottles from the order): one click makes a request for the usual quantity.
  await mia.open({section:'overview'});assert.match(T(mia.html),/Fetal bovine serum \(fictional\) 2 bottles 2 2 bottles usual order quantity/);
  await ana.open({section:'requests'});await ana.click('panel:request:'+R[2].id);await ana.submit('decide',{as:'Ana Silva'},'cancel');await ana.approve();
  await mia.open({section:'overview'});await mia.click('reorder:'+fbs);await mia.approve();R=await req();assert.deepEqual([R[3].quantity,R[3].estimated_amount,R[3].requested_by,R[3].status],[2,820,'Mia Novak','requested']);
  // Stale review: an edit opened at version N fails after another change; nothing is overwritten.
  const ed=x.app(w,id);await ed.open({section:'inventory'});await ed.click('edit:items:'+pr);
  const prRow=(await x.rows(tid('labinventory.items'))).find((r:any)=>r.id===pr);const p0=await s.preview(actor,w,{kind:'update_record',recordId:pr,expectedVersion:prRow.version,data:{owner:'Someone else'}});await s.commit(actor,p0.id,p0.digest);
  await assert.rejects(async()=>{const out=await ed.submit('save-record',{name:'qPCR primers NWB (fictional)',category_id:cat.Primers,unit:'tube',owner:'Me'});if(!out.proposal)throw Error(out.state.notice);await f.confirm(actor,w,out.proposal.id,out.proposal.digest);},/version|changed|stale|conflict/i);
  assert.equal((await x.rows(tid('labinventory.items'))).find((r:any)=>r.id===pr).data.owner,'Someone else');
 }finally{await x.pg.close();}
});

test('acceptance 3, 6, 8: assistants turn a pasted confirmation and chat into reviewed proposals, cannot confirm or approve; the digest is read by the runner from the app',async()=>{
 const x=await labSuite();const {pg,f,s,actor,T:C}=x;
 try{
  const w=(await s.createWorkspace(actor,'Lab assistants')).id;await pg.query('UPDATE workspaces SET ai_enabled=true,claude_enabled=true WHERE id=$1',[w]);
  const {receipt}=await x.install(w,C.lab,'Lab Inventory');const id=receipt.appId,map=x.mapOf(await x.comp(w,id)),tid=(r:string)=>map[r].typeId;
  const ui=x.app(w,id);await ui.open({section:'settings',me:'Mia Novak'});await ui.submit('save-approvals',{approver:'Mia Novak',second_approver:'Sam Rivera',threshold_amount:'2000'});await ui.approve();await ui.click('setup-categories');await ui.approve();
  const cat=Object.fromEntries((await x.rows(tid('labinventory.categories'))).map((r:any)=>[r.data.name,r.id]));
  const room=await x.save(w,tid('labinventory.locations'),{name:'Lab 2.14',kind:'room',archived:false}),fridge=await x.save(w,tid('labinventory.locations'),{name:'Fridge 1',kind:'fridge',parent_id:room,temperature:'4 °C',archived:false}),cab=await x.save(w,tid('labinventory.locations'),{name:'Cabinet C',kind:'cabinet',parent_id:room,archived:false});
  const sup=await x.save(w,tid('organizations'),{name:'Example Reagents GmbH',org_type:'other',archived:false}),lab=await x.save(w,tid('organizations'),{name:'Fictional Labware Co.',org_type:'other',archived:false});
  const dmem=await x.save(w,tid('labinventory.items'),{name:'DMEM high glucose (fictional)',category_id:cat.Reagent,supplier_id:sup,unit:'bottle',last_price:21,currency:'EUR',reorder_point:2,default_location_id:fridge,archived:false});
  const tips=await x.save(w,tid('labinventory.items'),{name:'Pipette tips 200 µL (fictional)',category_id:cat.Consumable,supplier_id:lab,unit:'box',last_price:6.5,currency:'EUR',reorder_point:4,reorder_quantity:10,default_location_id:cab,archived:false});
  const tipsOld=await x.save(w,tid('labinventory.lots'),{item_id:tips,lot_number:'T-1',quantity:5,received_on:'2026-08-01',location_id:cab,status:'in_stock'}),tipsNew=await x.save(w,tid('labinventory.lots'),{item_id:tips,lot_number:'T-2',quantity:10,received_on:'2026-10-01',expires_on:'2029-01-01',location_id:cab,status:'in_stock'});
  for(const [l,q] of [[tipsOld,5],[tipsNew,10]] as const)await x.save(w,tid('labinventory.movements'),{lot_id:l,kind:'received',quantity_change:q,occurred_on:'2026-10-01',via:'app'});
  const rq=await x.save(w,tid('labinventory.requests'),{item_id:dmem,item_name:'DMEM high glucose (fictional)',quantity:6,estimated_amount:126,requested_by:'Ana Silva',requested_on:'2026-11-10',status:'ordered',approved_1_by:'Mia Novak',decision_on:'2026-11-10'});
  const rq2=await x.save(w,tid('labinventory.requests'),{new_item_name:'Primer set NWB-202 qPCR',item_name:'Primer set NWB-202 qPCR',quantity:3,estimated_amount:120,requested_by:'Lena Ortiz',requested_on:'2026-11-10',status:'ordered',approved_1_by:'Mia Novak',decision_on:'2026-11-10'});
  const ord=await x.save(w,tid('labinventory.orders'),{supplier_id:sup,order_number:'ER-55990',ordered_by:'Jon Petersen',ordered_on:'2026-11-10',expected_on:'2026-11-14',amount:246,currency:'EUR',status:'ordered',request_ids:rq+','+rq2});
  const call=await x.assistants(),claude=call('/claude'),chatgpt=call('/mcp');
  const commit=async(p:any)=>(await s.commit({...actor,actionConfirmed:true} as any,p.id,p.digest)).objects;
  // Acceptance 3: "Order ER-55990 delivered: 6 × DMEM lot D8812 exp 05/2027; 3 × Primer set NWB-202 qPCR lot P-0091 exp 11/2027" (pasted confirmation).
  // Claude checks the catalog (the primer set is new), proposes the item first; a person confirms.
  const found=await claude('read_records',{workspaceId:w,typeId:tid('labinventory.items'),limit:50});assert.ok(JSON.stringify(found).includes('DMEM high glucose'));assert.ok(!JSON.stringify(found).includes('Primer set'));
  const itemProposal=await claude('prepare_change',{workspaceId:w,operation:{kind:'create_record',typeId:tid('labinventory.items'),data:{name:'Primer set NWB-202 qPCR',category_id:cat.Reagent,supplier_id:sup,catalog_number:'PS-202',unit:'tube',archived:false}}});
  // The assistant cannot confirm its own proposal.
  await assert.rejects(()=>s.commit({userId:actor.userId,origin:'ai',assistant:'claude'} as any,itemProposal.id,itemProposal.digest),/cannot approve|human/i);
  assert.equal((await x.rows(tid('labinventory.items'))).length,2,'nothing written before a person confirms');
  const [primer]=await commit(itemProposal);
  // Then the lots with the order status and request updates in one review, then their received movements in the next.
  const lotsP=await claude('prepare_change',{workspaceId:w,operation:{kind:'bulk_records',changes:[
   {kind:'create_record',typeId:tid('labinventory.lots'),data:{item_id:dmem,lot_number:'D8812',quantity:6,received_on:'2026-11-14',expires_on:'2027-05-31',location_id:fridge,status:'in_stock',order_id:ord}},
   {kind:'create_record',typeId:tid('labinventory.lots'),data:{item_id:primer.id,lot_number:'P-0091',quantity:3,received_on:'2026-11-14',expires_on:'2027-11-30',location_id:fridge,status:'in_stock',order_id:ord}},
   {kind:'update_record',recordId:ord,expectedVersion:0,data:{status:'received'}},
   {kind:'update_record',recordId:rq,expectedVersion:0,data:{status:'received',order_id:ord}},
   {kind:'update_record',recordId:rq2,expectedVersion:0,data:{status:'received',order_id:ord,item_id:primer.id}}]}});
  await commit(lotsP);const created=(await x.rows(tid('labinventory.lots'))).filter((l:any)=>l.data.order_id===ord);assert.deepEqual(created.map((l:any)=>[l.data.lot_number,l.data.quantity,l.data.expires_on]).sort(),[['D8812',6,'2027-05-31'],['P-0091',3,'2027-11-30']]);assert.equal(created.length,2);created.sort((a:any,b:any)=>a.data.lot_number.localeCompare(b.data.lot_number));
  await ui.open({section:'orders'});assert.match(T(ui.html),/2 lots received without a movement yet/);
  await commit(await claude('prepare_change',{workspaceId:w,operation:{kind:'bulk_records',changes:created.map((l:any,i:number)=>({kind:'create_record',typeId:tid('labinventory.movements'),data:{lot_id:l.id,kind:'received',quantity_change:l.data.quantity,occurred_on:'2026-11-14',by:'Claude (proposed)',via:'assistant'}}))}}));
  await ui.open({section:'orders'});assert.doesNotMatch(T(ui.html),/without a movement/);assert.match(T(ui.html),/Example Reagents GmbH ER-55990 .*Received/);
  // Acceptance 4 (chat): "we used 3 boxes of tips" → the same movement as the app would write, from the earliest-expiring lot (T-1 has no expiry, T-2 expires 2029: T-2 first).
  const usedP=await chatgpt('prepare_change',{workspaceId:w,operation:{kind:'bulk_records',changes:[{kind:'update_record',recordId:tipsNew,expectedVersion:0,data:{quantity:7}},{kind:'create_record',typeId:tid('labinventory.movements'),data:{lot_id:tipsNew,kind:'used',quantity_change:-3,occurred_on:'2026-11-14',by:'Ana Silva',via:'assistant'}}]}});
  await commit(usedP);
  // The app's own "Used one" on the same item proposes exactly that shape (lot update plus used movement), from the same lot.
  await ui.open({section:'inventory',me:'Ana Silva'});await ui.click('use-one:'+tips);const body=ui.last.proposal.body;
  const appCh=body.changes??body.operation?.changes??body.records?.changes??body;assert.match(JSON.stringify(appCh),new RegExp(tipsNew));assert.match(JSON.stringify(appCh),/"kind":"used"/);await f.discard(actor,w,ui.last.proposal.id).catch(()=>{});
  // Acceptance 8: assistants never approve. With the documented column rules, approval fields are closed to Claude and ChatGPT.
  const pend=await x.save(w,tid('labinventory.requests'),{item_id:dmem,item_name:'DMEM high glucose (fictional)',quantity:2,estimated_amount:42,requested_by:'Ana Silva',requested_on:'2026-11-14',status:'requested'});
  const grid=new AccessGrid(x.db),access=async()=>(await pg.query<any>('SELECT access_version FROM workspaces WHERE id=$1',[w])).rows[0]?.access_version;
  const v=(await grid.read(actor,w)).version??await access();
  await grid.save(actor,w,{expectedVersion:v,changes:['approved_1_by','approved_2_by','decision_on','reject_reason'].flatMap(field=>(['claude','chatgpt'] as const).map(subject=>({subject,kind:'column',resourceId:tid('labinventory.requests'),field,read:true,write:false})))});
  for(const ask of [claude,chatgpt]){const e=await ask('prepare_change',{workspaceId:w,operation:{kind:'update_record',recordId:pend,expectedVersion:0,data:{approved_1_by:'Mia Novak',status:'approved'}}}).then(()=>null,(err:any)=>err);assert.match(String(e?.message),/restricted/i);}
  // An assistant can still propose a request (no approval fields).
  const newReq=await claude('prepare_change',{workspaceId:w,operation:{kind:'create_record',typeId:tid('labinventory.requests'),data:{item_id:tips,item_name:'Pipette tips 200 µL (fictional)',quantity:10,estimated_amount:65,requested_by:'Ana Silva',requested_on:'2026-11-14',status:'requested'}}});assert.ok(newReq.id);
  // Running the app as the assistant principal yields proposals the assistant cannot confirm.
  const aiApp=x.app(w,id,{userId:actor.userId,origin:'ai',assistant:'claude'});await aiApp.open({section:'requests',me:'Sam Rivera'});await aiApp.click('panel:request:'+pend);await assert.rejects(()=>aiApp.submit('decide',{as:'Mia Novak'},'approve'),/restricted/i,'the platform refuses the approval fields for the assistant');
  // Without the column rules the assistant could prepare it, but never confirm it: a person reviews every proposal.
  const loose=await f.preview({userId:actor.userId,origin:'ai',assistant:'claude'} as any,w,{kind:'update_record',recordId:newReq.id?pend:pend,expectedVersion:0,data:{note:'Assistant note'}} as any).catch((e:any)=>e);
  if(loose&&loose.id)await assert.rejects(()=>f.confirm({userId:actor.userId,origin:'ai',assistant:'claude',actionConfirmed:true} as any,w,loose.id,loose.digest),/cannot approve|human/i);
  assert.equal((await x.rows(tid('labinventory.requests'))).find((r:any)=>r.id===pend).data.status,'requested');
  // Acceptance 6: the digest the research worker reads (run_component_frontend as the assistant) is the app's exact text.
  const run=await claude('run_component_frontend',{workspaceId:w,request:{componentId:id,expectedVersion:await x.version(id),state:{section:'settings'},event:{kind:'open',action:'',value:null,form:{}}}});
  const m=/<pre class="li-digest" data-digest="(\w+)"[^>]*>([\s\S]*?)<\/pre>/.exec(run.html);assert.ok(m,'digest block');assert.equal(m![1],'ready');
  const digest=m![2].replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&gt;/g,'>').replace(/&lt;/g,'<');
  assert.match(digest,/^Lab Inventory · approvals waiting: 1 \(week of 9 Nov 2026\)\n/);assert.match(digest,/Approvals waiting \(1\)\n- DMEM high glucose \(fictional\) × 2 for Ana Silva, waiting for Mia Novak\n/);assert.doesNotMatch(digest,/Low stock|Late orders|Expired/,'DMEM (6) and tips (12) are above their reorder points; empty sections are omitted');
  assert.equal(T((await ui.open({section:'settings'})).html).includes(T(m![2]).trim()),true,'the person sees the same text');
 }finally{await x.pg.close();}
});
