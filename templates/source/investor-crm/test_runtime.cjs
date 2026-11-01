const fs=require('fs'),assert=require('assert'),P=__dirname;
const pkg=JSON.parse(fs.readFileSync(P+'/../../apps/life.investor-crm-1.0.1.json'));
const seeded=JSON.parse(fs.readFileSync(P+'/demo_data.json')).records;
const schema=JSON.parse(fs.readFileSync(P+'/schema.example.json'));
const clean=x=>JSON.parse(JSON.stringify(x));
const map=Object.fromEntries(Object.entries(schema).map(([role,item])=>[role,{typeId:'demo-type-'+role,fields:Object.fromEntries(item.fields.map(f=>[f.key,f.key])),writableFields:item.fields.map(f=>f.key)}]));
const bindings=Object.keys(map).map(role=>({typeId:'demo-type-'+role,fields:Object.keys(map[role].fields)}));
const config={...pkg.defaults,tableMap:JSON.stringify(map),asOfDate:'2026-11-01'};
const run=new Function('input','tools','templateConfiguration','templateBindings',pkg.source);
function render({rows=seeded,c={},state={},event={kind:'open',action:'',value:null,form:{}},readOverride=null,writable=true,saved=true}={}){
 let proposals=[],reads=[];
 let tools={call:(name,args)=>{
  if(name==='records.read'){
   let role=args.typeId.slice('demo-type-'.length),data=rows.filter(r=>r.role===role&&Object.entries(args.filters||{}).every(([k,v])=>String(r.data[k])===v)).map(r=>({id:r.id,version:r.version,data:r.data}));reads.push({role,offset:args.offset,limit:args.limit});
   const override=readOverride?.({role,records:data,offset:args.offset,limit:args.limit});if(override!==undefined)return override;
   return {rows:data.slice(args.offset,args.offset+args.limit),total:data.length};
  }
  if(name==='records.propose'){proposals.push(...args);return {status:'prepared'}}
  throw Error('Unexpected tool '+name);
 }};
 return {result:run({state,event,saved,writable},tools,{...config,...c},bindings),proposals,reads};
}
function ev(kind,action,value=null,form={}){return {kind,action,value,form}}
const routes=['overview','investors','pipeline','interactions','followups','research'];
for(const route of routes){const r=render({state:{route}});assert(r.result.html.includes('<h1>')&&r.result.html.includes('ic-shell'),route);assert(r.result.css.includes('.ic-rail'));}
assert(pkg.id==='life.investor-crm'&&pkg.version==='1.0.1');assert(pkg.source.length<180000);assert(Buffer.byteLength(JSON.stringify(pkg),'utf8')<300000);
assert(pkg.source.split('\n')[0].startsWith('const templateLayoutSchema='));
assert(!/(?:const|let|var)\s+template(?:Configuration|Bindings)\s*=/.test(pkg.source));
assert(!/(login|sign up|register account|new workspace|password reset|billing plan)/i.test(pkg.source));
assert(pkg.documentation.tasks.promptExample.includes('No automation:'));
const first=render();assert(first.result.html.includes('EUR 4,430,000')&&first.result.html.includes('24.6% signed'),'verified commitments');
assert(first.result.html.includes('EUR 30,475,000'),'indicative separate');
const rSwitch=render({state:first.result.state,event:ev('change','round-select','demo-rounds-003')});assert(rSwitch.result.state.roundId==='demo-rounds-003');assert(rSwitch.result.html.includes('Target not set'));assert(rSwitch.result.html.includes('Progress unavailable'));
// 1 investor with two contacts must remain 1 investor opportunity.
const contacts=seeded.filter(x=>x.role==='contacts');assert(contacts.filter(x=>x.data.investor_id==='demo-investors-001').length===2);
const verbal=clean(seeded);for(const p of verbal.filter(x=>x.role==='opportunities'&&x.data.commitment_status==='Signed')){p.data.commitment_status='Verbal';p.data.committed_amount=null;p.data.commitment_date=null;p.data.evidence_ref=null;}const fv=render({rows:verbal});assert(fv.result.html.includes('EUR 0'),'verbal counted as signed');
// Incomplete reads cannot produce false verified totals.
const cases=[['unavailable',({role})=>role==='opportunities'?{unavailable:true}:undefined],['missing-total',({role,records,offset,limit})=>role==='opportunities'?{rows:records.slice(offset,offset+limit)}:undefined],['short-page',({role,records,offset})=>role==='investors'?{rows:records.slice(offset,offset+1),total:records.length+10}:undefined]];
for(const [name,readOverride]of cases){const r=render({readOverride});assert(r.result.html.includes('Incomplete authorized source'),name+' no incomplete alert');assert(!r.result.html.includes('EUR 4,430,000'),name+' exposed exact amount');}
const over=clean(seeded),baseOpp=over.find(x=>x.role==='opportunities');for(let i=0;i<805;i++)over.push({...clean(baseOpp),id:'over-opp-'+i,data:{...clean(baseOpp.data),name:'Extra round opportunity '+i,investor_id:'demo-investors-'+String(i%24+1).padStart(3,'0'),round_id:'demo-rounds-002',commitment_status:'None',committed_amount:null,stage:'Identified'}});
const ov=render({rows:over});assert(ov.result.html.includes('Over 800')&&ov.result.html.includes('Unavailable'),'over budget presented authoritative');
const overPage=render({rows:over,state:{route:'pipeline',display:'list',page:32,roundId:'demo-rounds-002'}});assert(overPage.reads.some(x=>x.role==='opportunities'&&x.offset===800),'cannot browse beyond the 800 analytics limit');assert(overPage.result.html.includes('Page 33 of'),'overbudget pager misleading');
const investor=seeded.find(x=>x.role==='investors');
const block=render({state:{route:'investors',deleteConfirm:{role:'investors',id:investor.id,baseVersion:investor.version,name:investor.data.name}},event:ev('click','confirm-delete')});assert(block.proposals.length===0&&block.result.html.includes('Cannot archive'),'linked contacts not protected');
const op=seeded.find(x=>x.role==='opportunities'&&x.data.commitment_status==='Signed');let opened=render({state:{route:'pipeline'},event:ev('click','edit:opportunities:'+op.id)});assert(opened.result.state.editor.baseVersion===op.version,'no original version captured');
const changed=render({state:opened.result.state,event:ev('change','editor:notes','notes retained')});assert(changed.result.state.editor.draft.notes==='notes retained');
const staleseed=clean(seeded);staleseed.find(x=>x.id===op.id).version=op.version+1;let stale=render({rows:staleseed,state:changed.result.state,event:ev('submit','save-editor',null,{notes:'last input'})});assert(stale.proposals.length===0&&stale.result.html.includes('Concurrent')&&stale.result.state.editor.draft.notes==='last input');
let staleArchive=render({rows:staleseed,state:{route:'pipeline',deleteConfirm:{role:'opportunities',id:op.id,baseVersion:op.version,name:op.data.name}},event:ev('click','confirm-delete')});assert(staleArchive.proposals.length===0&&staleArchive.result.html.includes('Concurrent update'));
// Signed evidence changes must be re-reviewed, not overwritten under current Signed.
let signedChange=render({state:opened.result.state,event:ev('submit','save-editor',null,{committed_amount:String(op.data.committed_amount+1000)})});assert(signedChange.proposals.length===0&&signedChange.result.html.includes('Signed evidence is protected'));
// Cloned signed opportunity resets commitment evidence, stage and date.
const cloned=render({state:{route:'pipeline'},event:ev('click','duplicate:opportunities:'+op.id)});assert(cloned.result.state.editor.draft.commitment_status==='None');assert(cloned.result.state.editor.draft.stage==='Identified');assert(!cloned.result.state.editor.draft.committed_amount);
// Duplicate fund/round records are blocked by app, including from duplicate button.
const duplicateFund=render({state:{route:'investors'},event:ev('click','duplicate:investors:'+investor.id)});const dupSubmit=render({state:duplicateFund.result.state,event:ev('submit','save-editor',null,{})});assert(dupSubmit.proposals.length===0&&dupSubmit.result.html.includes('already exist'));
const blank=[...clean(seeded)].filter(x=>x.role!=='investors'&&x.role!=='contacts'&&x.role!=='opportunities'&&x.role!=='interactions'&&x.role!=='tasks'&&x.role!=='findings');const empty=render({rows:blank,state:{route:'investors'},event:ev('click','add:investors')});assert(empty.result.state.editor,'cannot create first investor from empty');
// Parent reference identity checks and incorrect contact linkage.
const inter=seeded.find(x=>x.role==='interactions');let edInt=render({state:{route:'interactions'},event:ev('click','edit:interactions:'+inter.id)});const wrongContact=seeded.find(x=>x.role==='contacts'&&x.data.investor_id!==seeded.find(x=>x.id===inter.data.opportunity_id).data.investor_id);let mismatch=render({state:edInt.result.state,event:ev('submit','save-interaction-plus',null,{contact_id:wrongContact.id})});assert(mismatch.proposals.length===0&&mismatch.result.html.includes('Contact must belong'));
// Valid linked interaction and task are prepared in ONE proposal.
const original=seeded.find(x=>x.role==='interactions');let openedInt=render({state:{route:'interactions'},event:ev('click','edit:interactions:'+original.id)});let two=render({state:openedInt.result.state,event:ev('submit','save-interaction-plus',null,{followup_title:'Send approved preclinical summary',followup_due:'2026-11-12'})});assert(two.proposals.length===2,'interaction + follow-up not atomic proposal');
const denied=render({writable:false,state:{route:'investors'},event:ev('click','add:investors')});assert(denied.result.html.includes('disabled'));
const layout={tabs:['research','overview','investors','pipeline','interactions','followups'],cols:{investors:['name','focus','kind','geography','ticket_max','owner']},visible:{'investors:kind':false}};
const lay=render({state:{route:'investors'},c:{layoutProfile:JSON.stringify(layout)}});const html=lay.result.html;assert(html.indexOf('data-action="nav:research"')<html.indexOf('data-action="nav:overview"'));
assert(!html.includes('<th>Investor type</th>'),'layout hide ignored');
const hid=render({state:{route:'investors'},c:{layoutProfile:JSON.stringify(layout)},event:ev('click','add:investors')});assert(hid.result.html.includes('name="kind"'),'hidden field editor disappeared');
// Invalid signed values never propose.
let fresh=render({state:{route:'pipeline'},event:ev('click','add:opportunities')});let form={name:'Investor x Series A',investor_id:investor.id,round_id:'demo-rounds-001',stage:'Committed',commitment_status:'Signed',committed_amount:'1200000',currency:'EUR',evidence_ref:'',commitment_date:''};let seedNoOpportunity=seeded.filter(r=>!(r.role==='opportunities'&&r.data.investor_id===investor.id&&r.data.round_id==='demo-rounds-001'));let unsign=render({rows:seedNoOpportunity,state:fresh.result.state,event:ev('submit','save-editor',null,form)});assert(unsign.proposals.length===0&&unsign.result.html.includes('Signed commitment requires'));
const unknown=render({rows:seeded,state:{route:'overview'},c:{asOfDate:'2026-02-30'}});assert(unknown.result.html.includes('Invalid reporting date')&&!unknown.result.html.includes('EUR 4,430,000'));
const mixed=clean(seeded);mixed.find(x=>x.role==='opportunities').data.currency='USD';const mixedOverview=render({rows:mixed});assert(mixedOverview.result.html.includes('Unavailable')&&!mixedOverview.result.html.includes('EUR 4,430,000'),'mixed currency should withhold totals');
console.log('NODE TESTS PASS:',routes.length,'screen bodies, signed/indicative separation, round selection, incomplete/overbudget, beyond-limit paging, stale edit/archive, signed evidence, copied approval, identity linking, input draft, two-change review, layout and no-auth.');
console.log('APP',pkg.id,pkg.version,'characters',pkg.source.length,'records',seeded.length);
