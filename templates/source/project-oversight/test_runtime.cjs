const fs=require('fs'),assert=require('assert'),path=require('path');
const base=__dirname,catalog=JSON.parse(fs.readFileSync(path.join(base,'../../apps/life.project-oversight-1.0.1.json'),'utf8')),
 demo=JSON.parse(fs.readFileSync(path.join(base,'demo_data.json'),'utf8'));
const db=demo.records.map(x=>JSON.parse(JSON.stringify(x)));
let proposals=[],denials={},modifiers={},counts={};
let maps=Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(path.join(base,'schema.example.json')))).map(([role,v])=>[role,{typeId:'demo-'+role,fields:Object.fromEntries(v.fields.map(f=>[f.key,f.key])),writableFields:v.fields.map(f=>f.key)}]));
const config={...catalog.defaults,tableMap:JSON.stringify(maps),asOfDate:'2026-11-01'};
const exec=new Function('input','tools','templateConfiguration','templateBindings',catalog.source);
const tools={call(name,args){if(name==='records.propose'){proposals.push(args);return {status:'previewed'}};if(name==='records.read'){const role=args.typeId.slice(5);if(denials[role])return {unavailable:true};let arr=db.filter(x=>x.role===role&&Object.entries(args.filters||{}).every(([k,v])=>String(x.data[k])===v));if(modifiers[role])arr=modifiers[role](arr);let rows=arr.slice(args.offset,args.offset+args.limit);counts[role]=(counts[role]||0)+1;return {rows:rows.map(x=>({id:x.id,version:x.version,data:x.data})),total:arr.length};}throw new Error('Unsupported '+name)}};
const render=(state={},kind='open',action='',value=null,form={})=>exec({state,event:{kind,action,value,form},writable:true,saved:true},tools,config,Object.values(maps).map(m=>({typeId:m.typeId,fields:Object.values(m.fields)})));
let r=render();assert(r.html.includes('Portfolio overview'));assert(!r.html.includes('login')&&!r.html.includes('TrialAgents</strong>'));assert(r.css.includes('.po-hero'));
const routes=['overview','projects','timeline','deliverables','risks','reports'];for(const route of routes){r=render(r.state,'click','nav:'+route);assert.equal(r.state.route,route);assert(!r.html.includes('Preview render failed'));}
// Real output and data completeness rules.
r=render({},'open');assert(r.html.includes('Owner-set health')&&r.html.includes('Overdue milestones'));
denials['projects']=true;r=render();assert(r.html.includes('Source coverage incomplete'));assert(r.html.includes('Exact totals')||r.html.includes('—'));delete denials.projects;
denials['updates']=true;r=render();assert(r.html.includes('Source coverage incomplete'));assert(r.html.includes('—'));delete denials.updates;
// Stale record updates carry the original base version; draft survives conflict.
const project=db.find(x=>x.role==='projects');r=render({},'click','edit:projects:'+project.id);let oldstate=r.state;assert.equal(oldstate.editor.baseVersion,project.version);project.version++;proposals=[];r=render(oldstate,'submit','save-form',null,{...oldstate.editor.draft,name:project.data.name});assert(r.state.notice.includes('Conflict'));assert.equal(proposals.length,0);assert(r.state.editor.draft);project.version--;
// Baseline immutability on milestone edit.
const mile=db.find(x=>x.role==='milestones');r=render({},'click','edit:milestones:'+mile.id);let vals={...r.state.editor.draft,baseline_date:'2024-01-01'};proposals=[];r=render(r.state,'submit','save-form',null,vals);assert(r.state.notice.includes('immutable'));assert.equal(proposals.length,0);
// A changed target needs a reason.
r=render({},'click','edit:milestones:'+mile.id);vals={...r.state.editor.draft,current_date:'2028-01-01',change_reason:''};r=render(r.state,'submit','save-form',null,vals);assert(r.state.notice.includes('explanation'));
// A complete valid target edit only PROPOSES and does not modify DB.
r=render({},'click','edit:milestones:'+mile.id);vals={...r.state.editor.draft,current_date:'2028-01-01',change_reason:'Owner approved rebaseline discussion; current date only'};proposals=[];r=render(r.state,'submit','save-form',null,vals);assert(proposals.length===1&&proposals[0][0].kind==='update_record');assert.equal(proposals[0][0].expectedVersion,mile.version);assert.equal(mile.data.current_date!==vals.current_date,true);
// Parent archive blocked while linked workstreams/milestones exist.
r=render({},'click','delete:projects:'+project.id);proposals=[];r=render(r.state,'click','review-delete');assert(r.state.notice.includes('Cannot archive'));assert.equal(proposals.length,0);
// Source truncation after 600 rows with paginated register still allows advancing past cap.
let old=db.filter(x=>x.role==='deliverables');let many=[];for(let i=0;i<750;i++)many.push({...old[i%old.length],id:'synthetic-deliv-extra-'+i});modifiers.deliverables=()=>many;
r=render({},'click','nav:deliverables');assert(r.html.includes('Source coverage incomplete'));
for(let i=0;i<27;i++)r=render(r.state,'click','next');assert(r.html.includes('Page 28 of 30'),r.html.slice(-400));delete modifiers.deliverables;
// No phantom project health: marked green must be dated/rationalized, not based on missing updates.
r=render({},'click','edit:projects:'+project.id);vals={...r.state.editor.draft,health:'Green',health_rationale:'',status_date:''};proposals=[];r=render(r.state,'submit','save-form',null,vals);assert(r.state.notice.includes('rationale'));
// Denied/missing source: orphan values cannot be created without parent coverage.
denials.projects=true;r=render({},'click','add:milestones');vals={name:'Orphan target',project_id:'nonexistent',baseline_date:'2026-11-01',current_date:'2026-11-02',status:'Planned'};proposals=[];r=render(r.state,'submit','save-form',null,vals);assert(r.state.notice.includes('projects'));assert.equal(proposals.length,0);delete denials.projects;
// Approved report needs sources and reviewer; without either, no proposed approval.
r=render({},'click','add:reports');vals={name:'November report',period:'2026-11-01',cutoff:'2026-11-01',status:'Approved',narrative:'Results',reviewer:'',sources:''};r=render(r.state,'submit','save-form',null,vals);assert(r.state.notice.includes('reviewer'));
// Form markup uses every required named field and state marker.
r=render({},'click','add:projects');assert(r.html.includes('name="health" data-ui-state="true" data-action="field:health"'));assert(r.html.includes('name="objective" data-ui-state="true" data-action="field:objective"'));assert(r.html.includes('name="status_date" data-ui-state="true" data-action="field:status_date"'));
// Layout schema declared at source start, sourced from host configuration on each render.
let reversed=['reports','risks','deliverables','timeline','projects','overview'];config.layoutProfile=JSON.stringify({tabs:reversed,cols:{projects:['owner','name','health']},visible:{}});r=render();assert(r.html.indexOf('nav:reports')<r.html.indexOf('nav:overview'));config.layoutProfile='{}';
// Catalog limits / exact role setup docs, not just a bare code screenshot.
assert(Object.keys(catalog.documentation).sort().join(',')==='dataContract,examples,interactionContract,lifecycle,limitations,quickStart,tasks');assert(catalog.documentation.tasks.promptExample.length>50);assert(Buffer.byteLength(fs.readFileSync(path.join(base,'../../apps/life.project-oversight-1.0.1.json')))<300000);
assert(!catalog.source.includes('const templateConfiguration=')&&!catalog.source.includes('const templateBindings='));
console.log('BT-06 runtime regression PASS: routes, missing/denied/over-budget, stale edit, immutable baseline, reviewed writes, parent archive, pages 28/30, approvals, native layout, forms and catalog limits');
