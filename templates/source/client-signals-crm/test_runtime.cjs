const assert=require('node:assert/strict');const test=require('node:test');const fs=require('node:fs');const path=require('node:path');
const dir=__dirname;const cat=JSON.parse(fs.readFileSync(path.join(dir,'../../apps/life.client-signals-crm-1.0.1.json')));const demo=JSON.parse(fs.readFileSync(path.join(dir,'demo_data.json'))).records;const schemas=JSON.parse(fs.readFileSync(path.join(dir,'schema_mapping.example.json')));const roles=Object.keys(schemas);
const layouts=JSON.parse(cat.source.match(/^const templateLayoutSchema=(.+);/m)[1]);
const parse=(s)=>{const C=new Function('input','tools','templateConfiguration','templateBindings',cat.source);return C;};const runSource=parse(cat.source);
const fieldMap=Object.fromEntries(Object.entries(schemas).map(([role,m])=>[role,m.logicalFields]));
const BINDINGS=Object.entries(fieldMap).map(([typeId,fields])=>({typeId,fields:Object.values(fields)}));
const CFG={...cat.defaults,asOf:'2026-11-01',tableMap:JSON.stringify(Object.fromEntries(Object.entries(fieldMap).map(([role,fields])=>[role,{typeId:role,fields,writableFields:Object.keys(fields)}])))};
const click=action=>({kind:'click',action}),change=(action,value)=>({kind:'change',action,value}),submit=form=>({kind:'submit',action:'save-editor',form});
function run({records=demo,state={},event={kind:'open'},config=CFG,shortRole='',denyRole='',unknownRole='',missingField='',writable=true}={}){
 const calls=[];const tools={call(name,arg){if(name==='records.propose'){calls.push(...arg);return{status:'proposed'};}assert.equal(name,'records.read');if(denyRole===arg.typeId)return {unavailable:true,total:null,rows:[]};const all=records.filter(r=>r.role===arg.typeId);let slice=all.slice(arg.offset,arg.offset+arg.limit);if(shortRole===arg.typeId)slice=slice.slice(0,1);if(missingField&&arg.typeId==='companies')slice=slice.map(r=>({...r,data:Object.fromEntries(Object.entries(r.data).filter(([k])=>k!==missingField))}));return {total:unknownRole===arg.typeId?null:all.length,rows:slice.map(r=>({...r,data:Object.fromEntries(Object.entries(r.data).map(([k,v])=>[schemas[r.role].logicalFields[k]||k,v]))}))};}};
 const out=runSource({event,state,saved:true,writable},tools,config,BINDINGS);
 return {out,calls};
}
const open=(role,id)=>run({event:click('edit:'+role+':'+id)}).out.state.editor;
const start=(role)=>run({event:click('new:'+role)}).out.state.editor;
test('strict MCP catalog and native layout schema',()=>{
 assert.equal(cat.id,'life.client-signals-crm');assert.equal(cat.version,'1.0.1');assert.equal(cat.engine,'frontend-js');assert.ok(cat.source.length<180000);assert.ok(JSON.stringify(cat).length<300000);assert.doesNotMatch(cat.source,/\bconst templateConfiguration=/);assert.doesNotMatch(cat.source,/\bconst templateBindings=/);assert.equal(layouts.screens.length,7);assert.equal(Object.keys(layouts.groups).length,8);
 const allowed=['id','version','name','description','tags','whenToUse','whenNotToUse','instructions','documentation','engine','defaults','options','source','examples','deprecated'];assert.deepEqual(Object.keys(cat).sort(),allowed.sort());for(const p of ['quickStart','dataContract','interactionContract','lifecycle','limitations','examples','tasks'])assert.ok(cat.documentation[p]);assert.deepEqual(Object.keys(cat.documentation.tasks).sort(),['mode','whenUseful','readRequirements','outputContract','promptExample'].sort());
 for(let role of roles)for(let f of schemas[role].fields){assert.match(f.key,/^[a-z][a-z0-9_]{0,63}$/);assert.equal(f.multiple,false);assert.ok(['text','select','number','date','boolean'].includes(f.kind));}console.log('PASS strict catalog/layout/schema');
});
test('all seven screens render exactly one h1 with subline and no fake account or login',()=>{
 for(const tab of Object.keys({overview:1,companies:1,contacts:1,opportunities:1,signals:1,monitor:1,reports:1})){const {out}=run({state:{tab}});assert.equal((out.html.match(/<h1>/g)||[]).length,1,tab);assert.match(out.html,/ct-pagehead/);assert.match(out.html,/Client Signals &amp; CRM/);assert.doesNotMatch(out.html,/fictional data|login to|sign up|create an account/i);}console.log('PASS screens');
});
test('incomplete unavailable and unknown data never become authoritative zero',()=>{
 for(const x of [{denyRole:'signals'},{unknownRole:'signals'},{shortRole:'signals'},{missingField:'website'}]){let {out}=run(x);assert.match(out.html,/Limited evidence/);assert.match(out.html,/—/);}let zero=demo.filter(r=>r.role!=='signals');let ok=run({records:zero}).out;assert.doesNotMatch(ok.html,/Limited evidence/);assert.match(ok.html,/Reviewed signals · 30d/);
});
test('bound read limit withholds certainty when role exceeds budget',()=>{const extra=[];for(let i=0;i<410;i++){let a={...demo.find(x=>x.role==='companies'),id:'bulk-'+i,version:1,data:{...demo.find(x=>x.role==='companies').data,website:'https://example.org/different-'+i}};extra.push(a);}const out=run({records:[...demo.filter(x=>x.role!=='companies'),...extra]}).out;assert.match(out.html,/Limited evidence/);});
test('page controls navigate real loaded rows, filter changes same render',()=>{
 let a=run({state:{tab:'companies'}}),s=a.out.state;s.pages.companyIndex=1;let b=run({state:s,event:click('page:companyIndex:1')});assert.equal(b.out.state.pages.companyIndex,1);assert.match(b.out.html,/Eon Pathways|Bayfield Therapeutics|Helix Grove Pharma|Solstice RNA/);let c=run({state:{tab:'reports',company:'c01'},event:change('company-select','c02')});assert.equal(c.out.state.company,'c02');assert.match(c.out.html,/Novara Cellworks/);});
test('empty workspace can create first company without child tables',()=>{
 let ed=run({records:[],event:click('new:companies')}).out.state.editor;assert.ok(ed);
 let f={...ed.draft,name:'New CRO prospect',website:'https://example.org/another',focus:'Oncology',country:'Germany',verifiedAt:'2026-10-30',owner:'Alex'};
 let res=run({records:[],state:{editor:ed},event:submit(f)});assert.equal(res.calls.length,1);assert.equal(res.calls[0].kind,'create_record');assert.equal(res.calls[0].data.name,'New CRO prospect');
});
test('company domain identity and cross-role parent mismatch blocked',()=>{
 let ed=start('companies');let d={name:'Duplicate company',website:'https://example.org/asterlyn-biologics',focus:'Oncology',country:'DE',verifiedAt:'2026-10-30',owner:'Alex'};let x=run({state:{editor:ed},event:submit(d)});assert.equal(x.calls.length,0);assert.match(x.out.state.editor.error,/already exists/);
 let c=open('interactions','i01');let z=run({state:{editor:c},event:submit({...c.draft,companyId:'c09'})});assert.equal(z.calls.length,0);assert.match(z.out.state.editor.error,/historical|Linked/i);
});
test('duplicate reviewed signals reset evidence and approval; original duplicates rejected',()=>{
 let ed=run({event:click('duplicate:signals:s01')}).out.state.editor;assert.equal(ed.draft.status,'Candidate');assert.equal(ed.draft.reviewer,'');assert.equal(ed.draft.sourceUrl,'');let newEd=start('signals');let f={...demo.find(r=>r.id==='s01').data,name:'Duplicate notice'};let x=run({state:{editor:newEd},event:submit(f)});assert.equal(x.calls.length,0);assert.match(x.out.state.editor.error,/Duplicate announcement/);
});
test('reviewed signal needs URL, source date, reviewed source fact and author',()=>{
 let ed=start('signals');let f={name:'Verified announced clinical milestone',companyId:'c02',type:'Funding',sourceUrl:'https://example.org/new-signal-test',publishedAt:'2026-10-21',observedAt:'2026-10-22',fact:'Public announcement of a financing event.',interpretation:'BD hypothesis only',relevance:'Unknown',status:'Reviewed',reviewer:'',reviewedAt:''};let a=run({state:{editor:ed},event:submit(f)});assert.equal(a.calls.length,0);assert.match(a.out.state.editor.error,/Reviewed signals require/);f.relevance='High';f.reviewer='Nina';f.reviewedAt='2026-10-30';a=run({state:{editor:ed},event:submit(f)});assert.equal(a.calls.length,1);assert.equal(a.calls[0].kind,'create_record');
});
test('opportunity stage changes need fresh dated rationale and explicit qualification',()=>{
 let ed=open('opportunities','o01');let f={...ed.draft,stage:'RFP',qualification:'Pending',stageRationale:'New sponsor request',stageDecisionAt:'2026-11-01'};let bad=run({state:{editor:ed},event:submit(f)});assert.match(bad.out.state.editor.error,/requires documented human qualification/);f.qualification='Confirmed';let fresh=open('opportunities','o01');let same=run({state:{editor:fresh},event:submit({...f,stageRationale:fresh.draft.stageRationale,stageDecisionAt:fresh.draft.stageDecisionAt})});assert.equal(same.calls.length,0);assert.match(same.out.state.editor.error,/new dated stage-decision/);
 bad=run({state:{editor:open('opportunities','o01')},event:submit(f)});assert.equal(bad.calls.length,1);assert.equal(bad.calls[0].expectedVersion,1);
});
test('stale edit retains draft and expectedVersion is pinned',()=>{
 let ed=open('companies','c01');let changed=demo.map(x=>x.id==='c01'?{...x,version:2}:x);
 let x=run({records:changed,state:{editor:ed},event:submit({...ed.draft,name:'Proposed edit'})});assert.equal(x.calls.length,0);assert.match(x.out.state.editor.error,/changed or removed/);assert.equal(x.out.state.editor.draft.name,'Proposed edit');
 let good=run({state:{editor:ed},event:submit({...ed.draft,name:'New account label'})});assert.equal(good.calls.length,1);assert.equal(good.calls[0].expectedVersion,1);
});
test('archive blocked on incomplete linked children and stale archive pin',()=>{
 let s=run({event:click('archive:companies:c01')}).out.state;let x=run({state:s,event:click('confirm-archive')});assert.equal(x.calls.length,0);assert.match(x.out.state.notice,/Resolve linked active records/);
 x=run({state:s,event:click('confirm-archive'),denyRole:'contacts'});assert.equal(x.calls.length,0);assert.match(x.out.state.notice,/Cannot verify linked children/);
 let changed=demo.map(x=>x.id==='c01'?{...x,version:2}:x);x=run({records:changed,state:s,event:click('confirm-archive')});assert.equal(x.calls.length,0);assert.match(x.out.state.notice,/version changed/);
});
test('unlinked archive records pinned expectedVersion and soft delete only',()=>{
 let original={...demo.find(x=>x.id==='c01'),id:'orphan',version:3,data:{...demo.find(x=>x.id==='c01').data,name:'Unused biotech',website:'https://example.org/orphan'}};
 let list=[...demo,original],s=run({records:list,event:click('archive:companies:orphan')}).out.state;let x=run({records:list,state:s,event:click('confirm-archive')});assert.equal(x.calls.length,1);assert.equal(x.calls[0].expectedVersion,3);assert.equal(x.calls[0].data.archived,true);
});
test('opt-out persists and no outbound capabilities are invoked',()=>{let c=run({state:{tab:'contacts'}}).out;assert.match(c.html,/Do not contact/);let recipe=run({state:{tab:'monitor'},event:click('toggle-recipe')});assert.match(recipe.out.html,/No task is active/);assert.ok(!cat.source.includes('sendEmail('));});
test('briefing review needs current exact sourced signal version and human reviewer',()=>{
 let ed=open('reports','b01');let f={...ed.draft,status:'Reviewed',reviewer:'Nina',reviewedAt:'2026-11-01'};let ok=run({state:{editor:ed},event:submit(f)});assert.equal(ok.calls.length,1);assert.equal(ok.calls[0].expectedVersion,1);let bad=run({state:{editor:ed},event:submit({...f,evidenceRefs:'s01@4'})});assert.equal(bad.calls.length,0);assert.match(bad.out.state.editor.error,/outdated|incomplete/);let partial=run({state:{editor:ed},event:submit(f),unknownRole:'signals'});assert.equal(partial.calls.length,0);assert.match(partial.out.state.editor.error,/complete authorized/);
});
test('layout reorders native tabs and table column, editor keeps hidden required fields',()=>{
 let profile={heading:'Client Signals & CRM',tabs:['reports','overview','companies','contacts','opportunities','signals','monitor'],cols:Object.fromEntries(Object.entries(layouts.groups).map(([role,fs])=>[role,fs.map(f=>f.id)])),visible:{'companies:name':false}};
 profile.cols.companies=['country','name','focus','phase','sizeBand','verifiedAt'];let conf={...CFG,layoutProfile:JSON.stringify(profile)};
 let out=run({config:conf,state:{tab:'companies'}}).out;let headings=out.html.match(/<thead><tr>.+?<\/tr><\/thead>/)?.[0]||'';assert.match(headings,/Country/);assert.ok(headings.indexOf('Country')<headings.indexOf('Therapeutic focus'));assert.doesNotMatch(headings,/Company<\/th>/);
 let ed=run({config:conf,event:click('new:companies')}).out;assert.match(ed.html,/name="name"/);assert.ok(out.html.indexOf('nav:reports')<out.html.indexOf('nav:overview'));
});
test('no reporting cutoff withholds time-based counts',()=>{let out=run({config:{...CFG,asOf:''}}).out;assert.match(out.html,/Set a verified reporting cutoff/);assert.match(out.html,/30d/);});
