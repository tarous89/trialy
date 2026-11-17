import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readAppCommands,validateAppCommands,checkInput} from '../src/workspace/app-commands.js';
import {entry,fullMap,fullBindings,cfgFor,fresh,render,approve,text,session,command,without} from './fixtures/partnerships.js';

/* Partnerships 2.2.0 (PARTNERSHIPS.md §12b): app commands, the integration labels and Additional fields, in production QuickJS. */
const X=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const IRONVALE=X(508),OPP_IV=X(554),NWB101=X(501),KIRA=X(523),LIAM=X(524),BIO_EU=X(641),MEETING=X(643),FU=X(670),SIG_NEWS=X(682),SIG_TARGET=X(686),REGION=X(550),SHARED_VIEW=X(689);
const cmds=readAppCommands(entry.source);
const strip=(cs:any[])=>JSON.parse(JSON.stringify(cs));

test('declaration: one valid single-line appCommands array, every command answered, inputs checked by the host schema',async()=>{
 assert.doesNotThrow(()=>validateAppCommands(entry.source));assert.equal(cmds.length,50);
 assert.deepEqual([...new Set(cmds.map(c=>c.mode))].sort(),['layout','propose','read']);
 assert.equal(cmds.filter(c=>c.mode==='read').length,18);assert.equal(cmds.filter(c=>c.mode==='propose').length,31);
 assert.match(entry.source!,/^const appCommands=\[.*\];$/m,'kept verbatim by the build');
 for(const c of cmds){const r=await command(fresh(),c.id,{});assert.doesNotMatch(String(r.error??''),/has no command/,c.id);}
 assert.throws(()=>checkInput(cmds.find(c=>c.id==='opportunity.move_stage')!.input,{opportunity_id:'x',to:'cda'}),/record ID/);
 assert.equal((await command(fresh(),'nope.read')).ok,false);
});

test('read commands return the app\'s own calculations, write nothing and stay within the result limit',async()=>{
 const rows=fresh();
 const inputs:Record<string,any>={'opportunity.read':{opportunity_id:OPP_IV},'partner.read':{partner_id:IRONVALE},'conference.read':{conference_id:BIO_EU},'views.list':{as:'Anna'}};
 for(const c of cmds.filter(x=>x.mode==='read')){const r=await command(rows,c.id,inputs[c.id]??{});assert.equal(r.ok,true,c.id+': '+r.error);assert.equal(r.changes.length,0,c.id);assert.ok(JSON.stringify(r.result).length<64000,c.id+' size');}
 const d=(await command(rows,'schema.describe')).result;
 assert.deepEqual(d.stages.slice(0,3).map((s:any)=>s.key),['identified','contacted','non_confidential']);assert.ok(d.tables.opportunity.fields.some((f:any)=>f.key==='stage'&&f.kind==='app_managed'));
 assert.deepEqual(Object.keys(d.column_groups),['pipeline','partners','contacts','activity','followups','meetings']);assert.ok(d.tag_categories.some((c:any)=>c.name==='Region'));
 const o=(await command(rows,'opportunity.read',{opportunity_id:OPP_IV})).result;
 assert.equal(o.partner,'Ironvale Pharma');assert.equal(o.stage,'non_confidential');assert.deepEqual(o.tags.Conference,['BIO-Europe 2026']);assert.ok(Array.isArray(o.stage_history)&&Array.isArray(o.earlier_with_partner));
 // The overview funnel equals the Pipeline funnel the screen shows; filters work like the screen's.
 const ov=(await command(rows,'overview.read')).result;assert.equal(ov.complete,true);assert.ok(ov.funnel.reached.identified>=ov.funnel.reached.contacted);
 const list=(await command(rows,'opportunities.list',{asset_id:NWB101,direction:'out_license'})).result;assert.ok(list.items.length>0&&list.items.every((x:any)=>x.program_id===NWB101&&x.direction==='out_license'));
 const tagged=(await command(rows,'opportunities.list',{tags:{Conference:['BIO-Europe 2026']}})).result;assert.ok(tagged.items.some((x:any)=>x.id===OPP_IV));
 const view=(await command(rows,'opportunities.list',{view_id:SHARED_VIEW})).result;assert.ok(view.total>0);
 assert.match((await command(rows,'digest.read')).result.subject,/^Partnerships · week of 16 Nov:/);
 assert.equal((await command(rows,'opportunity.read',{opportunity_id:X(999)})).ok,false);
});

test('parity: propose commands create exactly the review the click path creates',async()=>{
 // Stage move (with its stage history row).
 const click=await render(fresh(),{panel:{type:'opp',id:OPP_IV,version:0}},{kind:'submit',action:'move-stage',form:{to:'cda',on:'2026-11-14',note:'CDA sent'}});
 const cmd=await command(fresh(),'opportunity.move_stage',{opportunity_id:OPP_IV,to:'cda',on:'2026-11-14',note:'CDA sent'});
 assert.equal(cmd.ok,true,cmd.error);assert.deepEqual(strip(cmd.changes),strip(click.changes));assert.equal(cmd.changes.length,2);assert.match(cmd.result.prepared[0],/Stage change to CDA/);
 // After-meeting log: activity, stage move, two follow-ups in one review.
 const form={organization_id:IRONVALE,opportunity_id:OPP_IV,kind:'meeting',occurred_on:'2026-11-14',team:'Marc',summary:'Liked deck v3',to:'cda',['p_'+KIRA]:true,fu1_title:'Send CMC summary',fu1_due:'2026-11-18',fu1_owner:'Anna',fu2_title:'Book call',fu2_due:'2026-11-20',fu2_owner:'Marc'};
 const c2=await render(fresh(),{},{kind:'submit',action:'save-log',form});
 const m2=await command(fresh(),'activity.log',{partner_id:IRONVALE,opportunity_id:OPP_IV,kind:'meeting',occurred_on:'2026-11-14',team:'Marc',summary:'Liked deck v3',move_to:'cda',contact_ids:[KIRA],follow_ups:[{title:'Send CMC summary',due:'2026-11-18',owner:'Anna'},{title:'Book call',due:'2026-11-20',owner:'Marc'}]});
 assert.equal(m2.ok,true,m2.error);assert.deepEqual(strip(m2.changes),strip(c2.changes));assert.equal(m2.changes.length,5);
 // New opportunity from the partner, with tags.
 const s=session(fresh());await s.open();await s.click('add:opps:'+IRONVALE);
 await s.submit('save-record',{name:'Ironvale: NWB-202',program_id:X(502),direction:'co_development',owner:'Anna','tag_Conference__BIO-Europe 2026':true,tag_Channel:'Conference'});
 const m3=await command(fresh(),'record.create',{table:'opportunity',context_id:IRONVALE,values:{name:'Ironvale: NWB-202',program_id:X(502),direction:'co_development',owner:'Anna',tags:{Conference:['BIO-Europe 2026'],Channel:['Conference']}}});
 assert.equal(m3.ok,true,m3.error);assert.deepEqual(strip(m3.changes),strip(s.changes));
 // Follow-up done, signal dismissal, target acceptance.
 assert.deepEqual(strip((await command(fresh(),'follow_up.complete',{follow_up_id:FU})).changes),strip((await render(fresh(),{},{kind:'click',action:'fu-done:'+FU})).changes));
 assert.deepEqual(strip((await command(fresh(),'signal.dismiss',{signal_id:SIG_NEWS,reason:'Not relevant'})).changes),strip((await render(fresh(),{panel:{type:'dismiss',id:SIG_NEWS,version:0}},{kind:'submit',action:'dismiss-signal',form:{reason:'Not relevant'}})).changes));
 const acc={organization_id:X(506),program_id:NWB101,direction:'out_license',owner:'Anna',name:'',priority:'',fit:''};
 assert.deepEqual(strip((await command(fresh(),'signal.accept',{signal_id:SIG_TARGET,partner_id:X(506),asset_id:NWB101,direction:'out_license',owner:'Anna'})).changes),strip((await render(fresh(),{panel:{type:'accept',id:SIG_TARGET,version:0}},{kind:'submit',action:'accept-signal',form:acc})).changes));
 // Tags: categories left out keep their values.
 const t=await command(fresh(),'opportunity.set_tags',{opportunity_id:OPP_IV,tags:{Region:[]}});assert.equal(t.ok,true,t.error);
 const tags=JSON.parse(t.changes[0].data.tags);assert.deepEqual(tags,{Conference:['BIO-Europe 2026'],Channel:['Conference'],'Asset group':['Fibrosis']});
 // Contacts, links, meeting outcome.
 assert.equal(JSON.stringify((await command(fresh(),'opportunity.set_contacts',{opportunity_id:OPP_IV,contact_ids:[LIAM]})).changes[0].data),JSON.stringify({contact_ids:LIAM}));
 const out=await command(fresh(),'meeting.record_outcome',{meeting_id:MEETING,status:'held',outcome:'Good',follow_up:{title:'Send deck',due:'2026-11-20',owner:'Anna'}});assert.equal(out.ok,true,out.error);assert.equal(out.changes.filter((c:any)=>c.kind==='create_record').length,1);
});

test('one review per command; a failing step leaves no partial review; viewers and partial data propose nothing',async()=>{
 const bad=await command(fresh(),'activity.log',{partner_id:IRONVALE,opportunity_id:OPP_IV,kind:'meeting',occurred_on:'2026-11-14',move_to:'lost',follow_ups:[{title:'x',due:'2026-11-18',owner:'Anna'}]});
 assert.equal(bad.ok,false);assert.match(bad.error,/reason/);assert.equal(bad.changes.length,0);
 assert.match((await command(fresh(),'activity.log',{partner_id:X(509),opportunity_id:OPP_IV,kind:'meeting',occurred_on:'2026-11-14'})).error,/does not belong/);
 assert.match((await command(fresh(),'activity.log',{partner_id:IRONVALE,kind:'meeting',occurred_on:'2026-11-14',contact_ids:[X(525)]})).error,/not a contact at Ironvale/);
 const ro=await command(fresh(),'opportunity.move_stage',{opportunity_id:OPP_IV,to:'cda'},{writable:false});assert.equal(ro.ok,false);assert.equal(ro.changes.length,0);
 const part=await command(fresh(),'follow_up.complete',{follow_up_id:FU},{read:(v:any,rows:any[])=>{const all=rows.filter(r=>r.role===v.typeId);return {rows:all.slice(v.offset,v.offset+v.limit),total:all.length+5};}});
 assert.equal(part.ok,false);assert.match(part.error,/could not be read completely/);assert.equal(part.changes.length,0);
 assert.match((await command(fresh(),'record.update',{table:'opportunity',record_id:OPP_IV,values:{stage:'cda'}})).error,/use opportunity\.move_stage/);
 const up=await command(fresh(),'record.update',{table:'opportunity',record_id:OPP_IV,values:{next_step:'Send CDA'}});assert.equal(up.ok,true,up.error);assert.deepEqual(up.changes.map((c:any)=>[c.kind,c.recordId,c.expectedVersion,c.data]),[['update_record',OPP_IV,0,{next_step:'Send CDA'}]]);
});

test('customization commands: views, settings, stages, lists, preferences, categories, custom fields and layout',async()=>{
 const v=await command(fresh(),'view.save',{name:'Japan deals',owner:'Marc',shared:true,filters:{direction:['out_license'],tags:{Region:['Asia-Pacific']}},layout:'list',columns:['name','partner','stage'],sort:{field:'stage',dir:'desc'}});
 assert.equal(v.ok,true,v.error);const d=v.changes[0].data;assert.deepEqual([d.name,d.shared,d.owner,d.layout,JSON.parse(d.columns),JSON.parse(d.sort)],['Japan deals',true,'Marc','list',['name','partner','stage'],{field:'stage',dir:'desc'}]);
 assert.match((await command(fresh(),'view.save',{name:'x',owner:'Nobody',filters:{stage:['cda']}})).error,/Choose the owner from the team/);
 assert.match((await command(fresh(),'view.save',{name:'x',owner:'Anna',filters:{stage:['cda']},columns:['nope']})).error,/Unknown pipeline column/);
 // settings.save changes only what it is given.
 const st=await command(fresh(),'settings.save',{stalled_days:30});assert.equal(st.ok,true,st.error);assert.deepEqual(Object.keys(st.changes[0].data),['stalled_days']);assert.equal(st.changes[0].data.stalled_days,30);
 // Stage labels replay the Settings form; a custom stage returns the table change still needed.
 const lab=await command(fresh(),'stages.save',{labels:{cda:'NDA'}});assert.equal(lab.ok,true,lab.error);
 const cfg=JSON.parse(lab.changes[0].data.stage_config);assert.deepEqual(cfg.labels,{cda:'NDA'});
 const cus=await command(fresh(),'stages.save',{custom:[{key:'option_exercise',label:'Option exercise',after:'term_sheet'}]});assert.equal(cus.ok,true,cus.error);
 assert.deepEqual(JSON.parse(cus.changes[0].data.stage_config).custom,[{key:'option_exercise',label:'Option exercise',after:'term_sheet'}]);assert.equal(cus.result.schema_change.tables[0].add_options[0],'option_exercise');
 assert.match((await command(fresh(),'stages.save',{custom:[{key:'x_stage',after:'signed'}]})).error,/after a standard pipeline stage/);
 // Lists: renaming replays the form; a new activity kind is registered and returns the table change.
 const ren=await command(fresh(),'lists.save',{activity_kinds:{call:{label:'Phone call'}}});assert.equal(ren.ok,true,ren.error);assert.equal(JSON.parse(ren.changes[0].data.option_lists).activity_kinds.call,'Phone call');
 const nk=await command(fresh(),'lists.save',{activity_kinds:{site_visit:{label:'Site visit'}}});assert.equal(nk.ok,true,nk.error);assert.equal(JSON.parse(nk.changes[0].data.option_lists).activity_kinds.site_visit,'Site visit');assert.deepEqual(nk.result.schema_change.tables[0].add_options,['site_visit']);
 const pr=await command(fresh(),'preferences.save',{pipeline_layout:'list',page_size:40});assert.equal(pr.ok,true,pr.error);const pp=JSON.parse(pr.changes[0].data.preferences);assert.deepEqual([pp.pipeline_layout,pp.page_size],['list',40]);
 const cat=await command(fresh(),'category.update',{category_id:REGION,values:['Europe','Asia-Pacific','North America','LatAm']});assert.equal(cat.ok,true,cat.error);assert.ok(JSON.parse(cat.changes[0].data.values).includes('LatAm'));
 // A custom field: registered in settings; when the table does not bind it yet, the result says what is still needed.
 const cf=await command(fresh(),'custom_field.register',{table:'opportunities',key:'milestone_value',label:'Milestone value (USD m)',kind:'number',filter:false});
 assert.equal(cf.ok,true,cf.error);assert.equal(cf.result.bound,false);assert.equal(cf.result.schema_change.tables[0].add_field.key,'milestone_value');
 assert.deepEqual(JSON.parse(cf.changes[0].data.custom_fields).at(-1),{table:'opportunities',key:'milestone_value',label:'Milestone value (USD m)',kind:'number',column:true,filter:false});
 assert.match((await command(fresh(),'custom_field.register',{table:'opportunities',key:'stage'})).error,/core field/);
 // Layout: a presentation-only proposal like the gear; unknown ids are refused.
 const lay=await command(fresh(),'layout.save',{screens:['pipeline','overview'],order:{pipeline:['stage','name']},hide:['research','pipeline:fit'],show:['pipeline.priority']});
 assert.equal(lay.ok,true,lay.error);assert.equal(lay.changes.length,0);const L=lay.layouts[0];assert.deepEqual(L.tabs.slice(0,2),['pipeline','overview']);assert.deepEqual(L.cols.pipeline.slice(0,2),['stage','name']);assert.equal(L.visible.research,false);assert.equal(L.visible['pipeline:fit'],false);assert.equal(L.visible['pipeline:priority'],true);assert.ok(!Object.keys(L.visible).some(k=>k.includes('.')),'native group:column keys only');
 // The profile the command proposes is one the host accepts, and the app applies it (columns hidden and shown by the gear's keys).
 const {customLayoutProfile,validateCustomLayout,customLayoutSchema}=await import('../src/shared/custom-layout.js');const schemaJson=JSON.parse(/^const templateLayoutSchema=(.+);$/m.exec(entry.source!)![1]);
 assert.doesNotThrow(()=>validateCustomLayout(customLayoutSchema.parse(schemaJson),customLayoutProfile.parse(L)));
 const shown=await render(fresh(),{section:'pipeline',mode:'list'},undefined,{config:cfgFor(fullMap,{layoutProfile:JSON.stringify(L)})});assert.match(shown.html,/>Priority</);assert.doesNotMatch(shown.html,/<th[^>]*>Fit</);
 const legacy=await command(fresh(),'layout.save',{hide:['partners:website']},{config:cfgFor(fullMap,{layoutProfile:JSON.stringify({visible:{'pipeline.fit':false}})})});assert.deepEqual(legacy.layouts[0].visible,{'pipeline:fit':false,'partners:website':false});
 assert.match((await command(fresh(),'layout.save',{hide:['pipeline.nope']})).error,/Unknown screen or column/);
 assert.match((await command(fresh(),'layout.save',{hide:['overview','pipeline','partners','conferences','activity','research','settings']})).error,/at least one screen/);
});

test('integrations: values from Contracts and Data Room are labelled From <App> with Edit in <App>; their data is never written here',async()=>{
 const rows=fresh();const ag=rows.find(r=>r.role==='agreements')!;const o=rows.find(r=>r.id===OPP_IV)!;o.data.cda_agreement_id=ag.id;
 const roles=[{role:'agreements',readOnly:true,writer:{appName:'Contracts',canOpen:true}}];
 const panel=await render(rows,{panel:{type:'opp',id:OPP_IV,version:0}},{kind:'open',action:''},{roles});
 assert.match(panel.html,/<span class="pt-from">From Contracts<\/span>/);assert.match(panel.html,new RegExp('data-trialy-open="agreements '+ag.id+'">Edit in Contracts</button>'));
 assert.equal((await command(rows,'opportunity.read',{opportunity_id:OPP_IV},{roles})).result.cda.from,'Contracts');
 // Without a writer (or without Contracts) nothing is labelled and nothing breaks.
 assert.doesNotMatch((await render(rows,{panel:{type:'opp',id:OPP_IV,version:0}})).html,/pt-from|data-trialy-open/);
 assert.doesNotMatch((await render(rows,{panel:{type:'opp',id:OPP_IV,version:0}},{kind:'open',action:''},{config:cfgFor(without('agreements')),roles})).html,/data-trialy-open/);
 // Data Room linked: access is labelled and read only; hand-entered access is refused by the control and the command alike.
 const g=rows.find(r=>r.role==='dataroom.access_grants'&&r.data.organization_id===IRONVALE);
 const integrations=[{role:'dataroom.access_grants',source:'linked',provider:'Data Room',writer:{appName:'Data Room',canOpen:true}},{role:'dataroom.engagement',source:'linked',provider:'Data Room',writer:{appName:'Data Room',canOpen:true}}];
 if(g){o.data.dataroom_room_id=g.data.room_id;const p2=await render(rows,{panel:{type:'opp',id:OPP_IV,version:0}},{kind:'open',action:''},{integrations});assert.match(p2.html,/From Data Room/);assert.match(p2.html,/data-trialy-open="dataroom\.access_grants /);}
 const refused=await command(rows,'data_room_access.add',{opportunity_id:OPP_IV,room_name:'Room',status:'invited'},{integrations});assert.equal(refused.ok,false);assert.match(refused.error,/comes from Data Room and is read only here/);assert.equal(refused.changes.length,0);
 const click=await render(rows,{panel:{type:'opp',id:OPP_IV,version:0}},{kind:'submit',action:'add-grant',form:{room_name:'Room',status:'invited'}},{integrations});assert.equal(click.changes.length,0);assert.match(click.state.notice,/Make this change in Data Room/);
 // Own manual table (not linked): the command records access by hand exactly like the form.
 const own=await command(fresh(),'data_room_access.add',{opportunity_id:OPP_IV,room_name:'Ironvale room',status:'invited',granted_on:'2026-11-14'});assert.equal(own.ok,true,own.error);
 assert.deepEqual(strip(own.changes),strip((await render(fresh(),{panel:{type:'opp',id:OPP_IV,version:0}},{kind:'submit',action:'add-grant',form:{room_name:'Ironvale room',status:'invited',person_id:'',granted_on:'2026-11-14'}})).changes));
});

test('Additional fields: bound fields this version does not know are shown read only and returned by read commands',async()=>{
 const rows=fresh();rows.find(r=>r.id===OPP_IV)!.data.region_code='APAC-7';
 const bindings=fullBindings.map((b:any)=>b.typeId==='partnerships.opportunities'?{...b,fields:[...b.fields,'region_code']}:b);
 const p=await render(rows,{panel:{type:'opp',id:OPP_IV,version:0}},{kind:'open',action:''},{bindings});
 assert.match(text(p.html),/Additional fields Region code APAC-7/);
 assert.deepEqual((await command(rows,'opportunity.read',{opportunity_id:OPP_IV},{bindings})).result.additional_fields,{region_code:'APAC-7'});
 assert.deepEqual((await command(rows,'schema.describe',{},{bindings})).result.tables.opportunity.additional_fields,['region_code']);
 assert.doesNotMatch((await render(rows,{panel:{type:'opp',id:OPP_IV,version:0}})).html,/Additional fields/);
 // Once registered (and mapped), it is a custom field, not an additional one.
 const set=rows.find(r=>r.role==='partnerships.settings')!;set.data.custom_fields=JSON.stringify([{table:'opportunities',key:'region_code',label:'Region code',kind:'text'}]);
 const map={...fullMap,'partnerships.opportunities':{...fullMap['partnerships.opportunities'],fields:{...fullMap['partnerships.opportunities'].fields,region_code:'region_code'}}};
 const p2=await render(rows,{panel:{type:'opp',id:OPP_IV,version:0}},{kind:'open',action:''},{bindings,config:cfgFor(map)});assert.doesNotMatch(p2.html,/Additional fields/);assert.match(text(p2.html),/Region code APAC-7/);
});
