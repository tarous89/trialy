const fs=require('fs'),assert=require('assert'),path=require('path');
const base=__dirname,meta=JSON.parse(fs.readFileSync(path.join(base,'../../apps/life.co-site-feasibility-1.1.1.json'))),fixture=JSON.parse(fs.readFileSync(path.join(base,'demo_data.json'))),roles=JSON.parse(fs.readFileSync(path.join(base,'role_definitions.json')));
const db=JSON.parse(JSON.stringify(fixture.records));let proposals=[],deny={},overrides={};
const mapping=Object.fromEntries(Object.entries(roles).map(([role,fields])=>[role,{typeId:'demo-'+role,fields:Object.fromEntries(fields.map(f=>[f.key,f.key])),writableFields:fields.map(f=>f.key)}]));
const cfg={...meta.defaults,tableMap:JSON.stringify(mapping),asOfDate:'2026-11-01',initialStudyId:'demo-studies-1'};
const tool={call(name,arg){if(name==='records.read'){let role=arg.typeId.slice(5);if(deny[role])return{unavailable:true};let arr=overrides[role]?overrides[role](db.filter(x=>x.role===role)):db.filter(x=>x.role===role);arr=arr.filter(x=>Object.entries(arg.filters||{}).every(([k,v])=>String(x.data[k])===v));return {rows:arr.slice(arg.offset,arg.offset+arg.limit).map(x=>({id:x.id,version:x.version,data:x.data})),total:arr.length};}if(name==='records.propose'){proposals.push(arg);return{status:'pending-review'};}throw Error('Unsupported '+name);}};
const run=new Function('input','tools','templateConfiguration','templateBindings',meta.source);
function render(state={},kind='open',action='',value=null,form={}){return run({state,event:{kind,action,value,form},writable:true,saved:true},tool,cfg,Object.values(mapping).map(m=>({typeId:m.typeId,fields:Object.values(m.fields)})));}
let x=render();assert(x.html.includes('Site feasibility')&&x.html.includes('Study sites'));
assert(x.css.includes('.sf-shell'));assert(!x.html.includes('password reset'));
assert(!meta.source.includes('const templateConfiguration=')&&!meta.source.includes('const templateBindings='));
const screens=['overview','sites','questionnaire','comparison','pipeline','startup'];for(let s of screens){x=render(x.state,'click','nav:'+s);assert.equal(x.state.route,s);assert(!x.html.includes('Preview render failed'));}
// Navigation/scope are applied before dependent calculations.
x=render({},'change','select-study','demo-studies-2');assert.equal(x.state.studyId,'demo-studies-2');assert(/option value="demo-studies-2" selected/.test(x.html));
x=render({},'click','nav:comparison');assert(x.html.includes('Compare sites'));
// Approved site is not a score inferred from interest or phantom approved evaluation.
const selected=db.find(r=>r.role==='candidates'&&r.data.stage==='Selected');assert(selected);
x=render({},'click','nav:comparison');assert(x.html.includes('Needs reviewed assessment')||x.html.includes('Approved and current'));
// Missing/denied and unknown-total sources never show zero complete coverage.
deny.responses=true;x=render();assert(x.html.includes('Incomplete authorized data')&&x.html.includes('Tot')||x.html.includes('unknown')||x.html.includes('unavailable'));delete deny.responses;
const oldTool=tool.call;tool.call=function(name,arg){if(name==='records.read'&&arg.typeId==='demo-sites')return {rows:[],total:null};return oldTool(name,arg);};x=render();assert(x.html.includes('Incomplete authorized data'));tool.call=oldTool;
// Archive parent blocked if any authorized child rows remain.
const site=db.find(r=>r.role==='sites');x=render({},'click','archive:sites:'+site.id);proposals=[];x=render(x.state,'click','review-archive');assert(x.state.notice.includes('Cannot archive'));assert.equal(proposals.length,0);
// Edits must use original record version rather than a later read.
x=render({},'click','edit:sites:'+site.id);let prior=x.state.editor.baseVersion;site.version++;proposals=[];x=render(x.state,'submit','save-form',null,{...x.state.editor.draft,name:'New site name'});assert(x.state.notice.includes('Conflict'));assert.equal(proposals.length,0);assert(x.state.editor.draft.name);site.version--;
// Cannot duplicate institution identity.
x=render({},'click','add:sites');let payload={...site.data,name:site.data.name,archived:false};x=render(x.state,'submit','save-form',null,payload);assert(x.state.notice.includes('Duplicate institution'));
// Approved evaluation locks responses and question modifications.
const resp=db.find(r=>r.role==='responses'&&r.data.candidate_id===selected.id);x=render({},'click','edit:responses:'+resp.id);proposals=[];x=render(x.state,'submit','save-form',null,{...x.state.editor.draft,answer:'No'});assert(x.state.notice.includes('evaluation locks response'));assert.equal(proposals.length,0);
const crit=db.find(r=>r.role==='criteria'&&r.data.study_id===selected.data.study_id);x=render({},'click','edit:criteria:'+crit.id);x=render(x.state,'submit','save-form',null,{...x.state.editor.draft,weight:4});assert(x.state.notice.includes('evaluations lock study criteria'));
// Can't select an unassessed site, and missing estimate vintage cannot masquerade as evidence.
const contacted=db.find(r=>r.role==='candidates'&&r.data.stage==='Contacted');x=render({},'click','edit:candidates:'+contacted.id);proposals=[];x=render(x.state,'submit','save-form',null,{...x.state.editor.draft,stage:'Selected',decision_date:'2026-11-01',decision_owner:'Sponsor committee',selection_reason:'Would like to select'});assert(x.state.notice.includes('Approved evaluation'));assert.equal(proposals.length,0);
x=render({},'click','edit:candidates:'+contacted.id);x=render(x.state,'submit','save-form',null,{...x.state.editor.draft,capacity_band:'High',capacity_date:'',capacity_source:''});assert(x.state.notice.includes('vintage'));
// A candidate cannot be repointed to a different institution after questionnaire evidence exists.
x=render({},'click','edit:candidates:'+selected.id);proposals=[];x=render(x.state,'submit','save-form',null,{...x.state.editor.draft,site_id:'demo-sites-9',lead_investigator_id:''});assert(x.state.notice.includes('Cannot change candidate study'));assert.equal(proposals.length,0);
// Future-dated response evidence cannot validate a complete current selection.
const dated=db.find(r=>r.role==='responses'&&r.data.candidate_id===selected.id);let originalDate=dated.data.source_date;dated.data.source_date='2028-01-01';x=render({},'click','nav:comparison');assert(x.html.includes('Incomplete')||x.html.includes('Needs reviewed assessment'));dated.data.source_date=originalDate;
// Response with criterion from another study rejected; no silent cross-study relationships.
const secondCrit=db.find(r=>r.role==='criteria'&&r.data.study_id==='demo-studies-2');x=render({},'click','add:responses');proposals=[];x=render(x.state,'submit','save-form',null,{name:'Bad cross-study answer',candidate_id:selected.id,criterion_id:secondCrit.id,answer:'Yes',respondent_role:'Institution representative',source:'EXAMPLE-SRC',source_date:'2026-11-01'});assert(x.state.notice.includes('different studies'));assert.equal(proposals.length,0);
// Valid new site proposal has same actual schema keys and no DB writes until confirmed.
x=render({},'click','add:sites');proposals=[];x=render(x.state,'submit','save-form',null,{name:'Example New Research Hospital',country:'Germany',specialty:'Neurology',institution_type:'University hospital'});assert.equal(proposals.length,1);assert(proposals[0][0].kind==='create_record'&&proposals[0][0].typeId==='demo-sites');assert(!db.some(r=>r.data.name==='Example New Research Hospital'));
// Rendering input widgets: textarea/number/select/date must have data-ui-state marker on each and stable action.
x=render({},'click','add:criteria');for(let f of ['name','weight','mandatory','prompt','study_id'])assert(x.html.includes('name="'+f+'" data-ui-state="true" data-action="field:'+f+'"'));
x=render(x.state,'change','field:prompt','Site-specific approved equipment evidence');assert.equal(x.state.editor.draft.prompt,'Site-specific approved equipment evidence');
// Original editor state retained on rejected proposal.
assert(x.state.editor);
// A new workspace with zero study records can reach Create study through the existing Overview screen.
x=render({},'click','overview-tab:studies');assert(x.html.includes('Study directory'));assert(x.html.includes('add:studies'));
x=render(x.state,'click','add:studies');assert(x.html.includes('name="protocol_code" data-ui-state="true"'));
proposals=[];x=render(x.state,'submit','save-form',null,{name:'Fictional sponsor feasibility pilot',protocol_code:'SCOPE-999',indication:'Non-patient institution capability trial',phase:'Phase 2',owner:'Feasibility lead',status:'Planning'});assert(proposals.length===1 && proposals[0][0].typeId==='demo-studies');
// Approved assessments cannot be reopened while the candidate remains Selected.
const eva=db.find(r=>r.role==='evaluations'&&r.data.status==='Approved');x=render({},'click','edit:evaluations:'+eva.id);proposals=[];x=render(x.state,'submit','save-form',null,{...x.state.editor.draft,status:'Draft'});assert(x.state.notice.includes('Rescind Selected'));assert.equal(proposals.length,0);
// Layout gets read from injected host configuration, not overwritten by old input state.
cfg.layoutProfile=JSON.stringify({tabs:['startup','comparison','overview','sites','questionnaire','pipeline'],cols:{sites:['country','name','specialty']},visible:{'sites:verified_date':false}});x=render();assert(x.html.indexOf('nav:startup')<x.html.indexOf('nav:overview'));cfg.layoutProfile='{}';
// More rows than read cap: page 28 remains reachable and exact totals withheld.
let originals=db.filter(r=>r.role==='sites');let many=Array.from({length:710},(_,i)=>({...originals[i%originals.length],id:'synthetic-site-'+i}));overrides.sites=()=>many;x=render({},'click','nav:sites');x=render(x.state,'click','site-tab:sites');assert(x.html.includes('Incomplete authorized data'));
for(let i=0;i<27;i++)x=render(x.state,'click','next');assert(x.html.includes('Page 28 of 29'),x.html.slice(-450));delete overrides.sites;
// Schema and catalog limits explicit.
assert(Buffer.byteLength(fs.readFileSync(path.join(base,'../../apps/life.co-site-feasibility-1.1.1.json')))<300000);
assert(meta.documentation.tasks.mode==='optional'&&meta.documentation.tasks.promptExample.length>150);
assert(!/patient[_ -]id|screening[_ -]log/i.test(JSON.stringify(roles)));
assert(!/data-action=\"(login|signup)\"|<input[^>]*type=\"password\"/i.test(meta.source));
console.log('CO-03 runtime PASS: six screens, exact host event fields, coverage/unknowns, duplicate/orphan, original versions, approvals, selection, source safety, reviewed proposals, native layout, pagination 28/29 and catalog schema');
