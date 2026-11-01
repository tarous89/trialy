const templateLayoutSchema=__LAYOUT_JSON__;
/* TrialAgents CO-06 v1.1.1. Host injects templateConfiguration and templateBindings ONCE before this source.
   Operational monitoring and PV AGREEMENT OBLIGATIONS only. No patient AE/SAE/ICSR or clinical conclusions. */
const R=__ROLE_JSON__;
const OV_CSS=__CSS_JSON__;
const cfg=typeof templateConfiguration==='object'&&templateConfiguration?templateConfiguration:{};
const inp=input||{},ev=inp.event||{},action=String(ev.action||'');
const screens=[['overview','Overview'],['visits','Monitoring events'],['agreements','PV agreements'],['calendar','PV activity calendar'],['summary','Briefings']];
const defaultCols=__COLS_JSON__;
const esc=x=>String(x===null||x===undefined?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
// Bound display text after HTML escaping; full values remain in record details and editors.
function shortText(value,max=120){let out='',size=0;for(const ch of String(value??'')){const encoded=esc(ch);if(size+encoded.length>max-1)return out+'…';out+=encoded;size+=encoded.length;}return out;}
const bool=x=>x===true||x==='true'||x===1||x==='1';
const num=x=>(x===null||x===undefined||x===''||!Number.isFinite(Number(x)))?null:Number(x);
const iso=x=>{let s=String(x||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return '';let d=new Date(s+'T00:00:00Z');return Number.isNaN(+d)||d.toISOString().slice(0,10)!==s?'':s;};
const now=iso(cfg.asOfDate)||new Date().toISOString().slice(0,10);
let mappings={},layout={};try{mappings=JSON.parse(cfg.tableMap||'{}')||{}}catch(e){}try{layout=JSON.parse(cfg.layoutProfile||'{}')||{}}catch(e){}
const mp={};for(let role of Object.keys(R)){let m=mappings[role]||{};mp[role]={typeId:String(m.typeId||''),fields:m.fields||{},writable:m.writableFields||[],valid:!!m.typeId};}
const requiredFields={};for(let role of Object.keys(R))requiredFields[role]=R[role].filter(f=>true).map(f=>f.key);
let st=Object.assign({route:'overview',studyId:String(cfg.initialStudyId||''),asOf:now,month:now.slice(0,7),query:'',filter:'all',filters:false,pageByRole:{},studyTab:'studies',monitorTab:'visits',agreementTab:'agreements',calendarPage:0,editor:null,detail:null,del:null,briefPrompt:false,notice:''},inp.state||{});
if(!st.pageByRole||typeof st.pageByRole!=='object')st.pageByRole={};
const per=Math.min(50,Math.max(10,num(cfg.pageSize)||25)),cache={},pageCache={};
function norm(role,row){let data={};for(let f of R[role]){let k=mp[role].fields[f.key];if(k&&row.data&&Object.prototype.hasOwnProperty.call(row.data,k))data[f.key]=row.data[k];}return{id:row.id,version:row.version,data};}
function scalar(f,v){if(v===null)return !f.required&&f.kind!=='boolean';if(f.kind==='boolean')return typeof v==='boolean';if(f.kind==='number')return typeof v==='number'&&Number.isFinite(v);if(typeof v!=='string'||(f.required&&!v.trim()))return false;if(f.kind==='date')return !!iso(v);if(f.kind==='select')return f.options.includes(v);return true;}
function read(role,offset,limit){const key=role+':'+offset+':'+limit;if(pageCache[key])return pageCache[key];return pageCache[key]=readPage(role,offset,limit);}
function readPage(role,offset,limit){let m=mp[role];if(!m.valid)return{rows:[],total:null,raw:0,issue:'No authorized '+role+' table'};let binding=Array.isArray(templateBindings)?templateBindings.find(b=>b.typeId===m.typeId):null;let miss=requiredFields[role].filter(k=>!m.fields[k]||!binding?.fields?.includes(m.fields[k]));if(miss.length)return{rows:[],total:null,raw:0,issue:'Missing approved bindings: '+miss.join(', ')};
 try{let r=tools.call('records.read',{typeId:m.typeId,offset,limit,filters:{}});if(!r||r.unavailable||!Array.isArray(r.rows)||!Number.isInteger(r.total)||r.total<0)return{rows:[],total:null,raw:0,issue:'Source unavailable or total unknown'};if(JSON.stringify(r.rows).length>100000)return{rows:[],total:r.total,raw:0,issue:'Source page exceeds safe data budget'};let n=Math.min(limit,Math.max(0,r.total-offset));if(r.rows.length!==n)return{rows:[],total:r.total,raw:0,issue:'Incomplete / short page'};
 if(r.rows.some(x=>!x||typeof x.id!=='string'||!x.id||!Number.isInteger(x.version)||x.version<0||!x.data||typeof x.data!=='object'||R[role].some(f=>!Object.prototype.hasOwnProperty.call(x.data,m.fields[f.key])||!scalar(f,x.data[m.fields[f.key]]))))return{rows:[],total:r.total,raw:0,issue:'Missing or invalid fields, denied data or invalid envelope'};return{rows:r.rows.map(x=>norm(role,x)).filter(x=>!x.data.archived),ids:r.rows.map(x=>x.id),total:r.total,raw:r.rows.length,issue:''};}
 catch(e){return{rows:[],total:null,raw:0,issue:'Read unavailable: '+String(e.message||e).slice(0,100)}}}
function all(role){if(cache[role])return cache[role];let rows=[],total=null,offset=0,issue='',seen=new Set();for(let i=0;i<6;i++){let r=read(role,offset,100);if(r.issue){issue=r.issue;break;}if(total!==null&&total!==r.total){issue='Source changed during read';break;}if(r.ids.some(id=>seen.has(id))||new Set(r.ids).size!==r.ids.length){issue='Duplicate source records';break;}r.ids.forEach(id=>seen.add(id));total=r.total;rows.push(...r.rows);offset+=r.raw;if(offset===total)break;if(r.raw!==100){issue='Short page';break;}if(i===5&&offset<total)issue='Over 600 records: aggregate incomplete';}return cache[role]={rows,total,complete:!issue&&total!==null&&offset===total,issue};}
function currentPage(role){return Math.max(0,Math.floor(num(st.pageByRole[role])||0));}
function page(role,p=currentPage(role)){return read(role,p*per,per);}
function complete(...roles){for(let role of roles){let r=all(role);if(!r.complete)throw Error('Incomplete '+role+' source: '+r.issue);}}
function hasCoverage(...roles){return roles.every(role=>all(role).complete);}
function warning(...roles){let bad=roles.filter(role=>!all(role).complete);return bad.length?'<div class="ov-warning" role="status"><b>Coverage incomplete.</b> '+esc(bad.map(x=>x+': '+all(x).issue).join(' · '))+'. Counts, on-time performance and closure readiness are not authoritative.</div>':'';}
function get(role,id){if(!id)return null;let source=all(role).rows.find(x=>x.id===id);return source||(!all(role).complete?page(role).rows.find(x=>x.id===id):null)||null;}
function label(role,id){if(!id)return '—';return get(role,id)?.data.name||'Not accessible / missing '+role.replace(/s$/,'');}
function can(role,keys=['name']){let m=mp[role];return inp.saved===true&&inp.writable===true&&cfg.readOnly!==true&&m.valid&&keys.every(k=>!!m.fields[k]&&m.writable.includes(k));}
function rels(role){return R[role].filter(x=>x.kind.indexOf('relation-')===0)}
function scope(role,rows){if(!st.studyId)return rows;return rows.filter(x=>role==='studies'?x.id===st.studyId:(x.data.study_id===st.studyId));}
function validRelation(role,d,id){for(let f of rels(role)){let pid=d[f.key];if(!pid){if(f.required)throw Error('Missing relation: '+f.label);continue;}let target=f.kind.slice(9);complete(target);let p=get(target,pid);if(!p)throw Error('Missing or inaccessible '+target+' parent');if(f.key==='site_id'&&d.study_id&&p.data.study_id!==d.study_id)throw Error('Institution belongs to a different study');if(f.key==='visit_id'&&d.study_id&&p.data.study_id!==d.study_id)throw Error('Visit belongs to a different study');if(f.key==='agreement_id'&&d.study_id&&p.data.study_id!==d.study_id)throw Error('PV agreement belongs to a different study');if(f.key==='obligation_id'&&d.study_id&&p.data.study_id!==d.study_id)throw Error('PV obligation belongs to a different study');}}
function consistency(){let bad=[];for(let role of Object.keys(R)){let v=all(role);if(!v.complete)continue;for(let row of v.rows){for(let f of rels(role)){let target=f.kind.slice(9),id=row.data[f.key];if(!id)continue;if(!all(target).complete||!get(target,id))bad.push('Missing or unreadable parent for '+role+' '+row.id);else if(row.data.study_id&&target!=='studies'&&get(target,id)?.data.study_id&&get(target,id).data.study_id!==row.data.study_id)bad.push('Cross-study '+role+' '+row.id);}}}return bad;}
function specialValidated(role,d,prev,id,mode){validRelation(role,d,id);if(prev&&role!=='studies'&&prev.study_id!==d.study_id)throw Error('Existing records cannot move between studies');
 if(role==='studies'){complete('studies');if(all('studies').rows.some(x=>x.id!==id&&x.data.protocol_code===d.protocol_code))throw Error('Study code already exists');}
 if(role==='sites'){complete('sites');if(all('sites').rows.some(x=>x.id!==id&&x.data.study_id===d.study_id&&x.data.site_code===d.site_code))throw Error('Duplicate site code for study');}
 if(role==='visits'){
  if(prev?.report_status==='Final'&&JSON.stringify(prev)!==JSON.stringify(d))throw Error('Final report evidence is immutable; create a new monitoring event');
  complete('visits');if(all('visits').rows.some(x=>x.id!==id&&x.data.study_id===d.study_id&&x.data.name===d.name))throw Error('Duplicate monitoring event reference');
  if(prev&&prev.baseline_date!==d.baseline_date)throw Error('Original planned date is immutable');
  if(prev&&prev.planned_date!==d.planned_date&&!String(d.reschedule_reason||'').trim())throw Error('Rescheduling requires a reason');
  if(d.status==='Completed'&&!iso(d.actual_date))throw Error('Conducted event requires actual date');
  if(d.report_status==='Final'&&(!iso(d.report_date)||!iso(d.actual_date)||!String(d.source_ref||'').trim()))throw Error('Final trip report requires date, conducted event and source reference');
  if(d.status==='Cancelled'&&!String(d.reschedule_reason||'').trim())throw Error('Cancelled visit requires a reason');
 }
 if(role==='findings'){
  let visit=get('visits',d.visit_id);if(!visit||visit.data.study_id!==d.study_id)throw Error('Follow-up must link to a monitoring event in the same study');
  if(prev&&prev.status==='Verified closed'&&JSON.stringify(prev)!==JSON.stringify(d))throw Error('Verified closure is immutable; create a new follow-up');
  if(d.status==='Closure proposed'&&(!iso(d.closure_proposed_at)||!String(d.closure_evidence||'').trim()))throw Error('Proposed closure requires dated evidence');
  if(d.status==='Verified closed'){
   if(!prev||prev.status!=='Closure proposed')throw Error('Verification requires prior reviewed Closure proposed state');
   if(!iso(d.closure_proposed_at)||!iso(d.closure_verified_at)||!d.closure_evidence||!String(d.verified_by||'').trim())throw Error('Verification requires dated evidence and verifier');
   if(d.verified_by.trim().toLowerCase()===String(d.owner||'').trim().toLowerCase())throw Error('Independent verifier must differ from action owner');
   if(d.closure_verified_at<d.closure_proposed_at)throw Error('Verification date before proposed closure');
  }
 }
 if(role==='agreements'){
  complete('agreements');if(!Number.isInteger(num(d.version))||num(d.version)<1)throw Error('Agreement version must be positive integer');
  if(d.end_date&&d.end_date<d.effective_date)throw Error('Agreement expiry before effective date');
  if(d.status==='Active'&&(!String(d.document_ref||'').trim()||!iso(d.approved_date)))throw Error('Active agreement requires approved document reference and date');
  if(prev&&(prev.version!==d.version||prev.study_id!==d.study_id||prev.document_ref!==d.document_ref||['name','partner','scope','effective_date','approved_date'].some(k=>prev[k]!==d[k])||prev.status==='Active'&&d.status!=='Active')){
   complete('obligations','activities');if(all('obligations').rows.some(x=>x.data.agreement_id===id))throw Error('Linked definitions pin the approved agreement version. Create a new agreement version, do not rewrite this one');
  }
 }
 if(role==='obligations'){
  complete('obligations');let ag=get('agreements',d.agreement_id);
  if(!ag||ag.data.study_id!==d.study_id)throw Error('Obligation needs a same-study PV agreement');
  if(mode==='create'&&d.agreement_version!==ag.data.version)throw Error('Obligation must pin current agreement version');
  if(prev&&(prev.agreement_id!==d.agreement_id||prev.agreement_version!==d.agreement_version))throw Error('Obligation agreement/version is immutable');
  if(d.status==='Active'&&(ag.data.status!=='Active'||d.agreement_version!==ag.data.version))throw Error('Active obligation requires active approved agreement version');
  if(all('obligations').rows.some(x=>x.id!==id&&x.data.agreement_id===d.agreement_id&&x.data.name.toLowerCase()===d.name.toLowerCase()))throw Error('Duplicate obligation definition within agreement');
  if(prev&&prev.status==='Active'&&d.status==='Superseded'){complete('activities');if(all('activities').rows.some(x=>x.data.obligation_id===id&&!['Completed','Cancelled'].includes(x.data.status)))throw Error('Open dated activities must be resolved before superseding definition');}
  if(prev&&(prev.name!==d.name||prev.frequency!==d.frequency||prev.source_ref!==d.source_ref||prev.source_date!==d.source_date||prev.jurisdiction!==d.jurisdiction)){
   complete('activities');if(all('activities').rows.some(x=>x.data.obligation_id===id&&x.data.status==='Completed'))throw Error('Historical completed activities pin obligation definition; create a revised definition');
  }
 }
 if(role==='activities'){
  complete('activities');let o=get('obligations',d.obligation_id),ag=o?get('agreements',o.data.agreement_id):null;
  if(!o||o.data.study_id!==d.study_id||!ag)throw Error('Dated activity needs a same-study defined obligation and agreement');
  if(o.data.status!=='Active'||ag.data.status!=='Active'||o.data.agreement_version!==ag.data.version)throw Error('Dated activity requires active, version-matched agreement and obligation');
  if(all('activities').rows.some(x=>x.id!==id&&x.data.obligation_id===d.obligation_id&&x.data.period_label.toLowerCase()===d.period_label.toLowerCase()))throw Error('Duplicate activity period under obligation');
  if(prev&&prev.obligation_id!==d.obligation_id)throw Error('Dated activity obligation cannot be changed');
  if(prev&&prev.original_due_date!==d.original_due_date)throw Error('Original activity due date is immutable');
  if(prev&&prev.due_date!==d.due_date&&!String(d.change_reason||'').trim())throw Error('Revised deadline requires a reason');
  if(prev&&prev.status==='Completed'&&JSON.stringify(prev)!==JSON.stringify(d))throw Error('Completed activity is locked; create a new occurrence');
  if(d.status==='Cancelled'&&!String(d.change_reason||'').trim())throw Error('Cancellation requires reason');
  if(d.status==='Ready for review'&&(!iso(d.actual_completion_date)||!String(d.evidence_ref||'').trim()))throw Error('Review-ready activity needs completion date and evidence');
  if(d.status==='Completed'){
   if(!prev||prev.status!=='Ready for review')throw Error('Completion requires prior Ready for review approval');
   if(!iso(d.actual_completion_date)||!iso(d.reviewed_at)||!String(d.evidence_ref||'').trim()||!String(d.reviewer||'').trim())throw Error('Completed activity requires date, evidence and independent reviewer');
   if(d.reviewed_at<d.actual_completion_date)throw Error('Review predates completion');
   if(d.reviewer.trim().toLowerCase()===String(d.owner||'').trim().toLowerCase())throw Error('Reviewer must differ from activity owner');
  }
 }
 if(role==='snapshots'){
  if(d.period_end<d.period_start||d.cutoff<d.period_start)throw Error('Invalid reporting period');
  if(prev&&prev.status==='Reviewed')throw Error('Reviewed briefing cannot be rewritten');
  if(d.status==='Reviewed'){
   if(!iso(d.reviewed_at)||!String(d.reviewer||'').trim())throw Error('Reviewed briefing needs reviewer and date');
   complete('studies','sites','visits','findings','agreements','obligations','activities');
   if(consistency().length)throw Error('Missing linked evidence prevents reviewed briefing');
   d.source_snapshot=signature(d.study_id,d.cutoff);
  }else d.source_snapshot=null;
 }
}
// Full SHA-256 over canonical UTF-8 evidence; never truncate the source set.
function sha256(text){
 const bytes=[];for(const ch of text){const n=ch.codePointAt(0);if(n<128)bytes.push(n);else if(n<2048)bytes.push(192|(n>>6),128|(n&63));else if(n<65536)bytes.push(224|(n>>12),128|((n>>6)&63),128|(n&63));else bytes.push(240|(n>>18),128|((n>>12)&63),128|((n>>6)&63),128|(n&63));}
 const bitlen=bytes.length*8;bytes.push(128);while(bytes.length%64!==56)bytes.push(0);for(let i=7;i>=0;i--)bytes.push(Math.floor(bitlen/2**(8*i))&255);
 const k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
 const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],rot=(v,n)=>(v>>>n)|(v<<(32-n));
 for(let o=0;o<bytes.length;o+=64){const w=[];for(let i=0;i<16;i++)w[i]=(bytes[o+4*i]<<24)|(bytes[o+4*i+1]<<16)|(bytes[o+4*i+2]<<8)|bytes[o+4*i+3];for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=(w[i-16]+(rot(a,7)^rot(a,18)^(a>>>3))+w[i-7]+(rot(b,17)^rot(b,19)^(b>>>10)))|0;}let [a,b,c,d,e,f,g,j]=h;for(let i=0;i<64;i++){const t=(j+(rot(e,6)^rot(e,11)^rot(e,25))+((e&f)^(~e&g))+k[i]+w[i])|0,u=((rot(a,2)^rot(a,13)^rot(a,22))+((a&b)^(a&c)^(b&c)))|0;j=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+u)|0;}[a,b,c,d,e,f,g,j].forEach((v,i)=>h[i]=(h[i]+v)|0);}
 return h.map(v=>(v>>>0).toString(16).padStart(8,'0')).join('');
}
function signature(study,cutoff){const evidence=['studies','sites','visits','findings','agreements','obligations','activities'].map(role=>[role,all(role).rows.filter(x=>role==='studies'?x.id===study:x.data.study_id===study).sort((a,b)=>a.id.localeCompare(b.id)).map(x=>role==='studies'?[x.id,R[role].map(f=>[f.key,x.data[f.key]])]:[x.id,x.version])]);return 'sha256:'+sha256(JSON.stringify([study,cutoff,evidence]));}
function studyVersions(){return Object.fromEntries(all('studies').rows.map(x=>[x.id,x.version]));}
function guardStudy(ed,study){complete(...Object.keys(R));if(!study||!can('studies',['name']))throw Error('Approved study write binding required for evidence consistency');const row=get('studies',study);if(!row||row.version!==ed.studyVersions?.[study])throw Error('Study changed after opening; reopen before reviewing. Draft retained.');return {kind:'update_record',recordId:study,expectedVersion:row.version,data:{[mp.studies.fields.name]:row.data.name}};}
function archiveGuard(role,id){const row=get(role,id);if((role==='activities'&&row?.data.status==='Completed')||(role==='findings'&&row?.data.status==='Verified closed')||(role==='snapshots'&&row?.data.status==='Reviewed')||(role==='visits'&&row?.data.report_status==='Final'))throw Error('Reviewed historical evidence cannot be archived');
 let deps={studies:[['sites','study_id'],['visits','study_id'],['findings','study_id'],['agreements','study_id'],['obligations','study_id'],['activities','study_id'],['snapshots','study_id']],sites:[['visits','site_id']],visits:[['findings','visit_id']],agreements:[['obligations','agreement_id']],obligations:[['activities','obligation_id']]};
 let children=deps[role]||[];complete(role,...children.map(x=>x[0]));
 if(children.length&&consistency().length)throw Error('Unverifiable relationships prevent archive');
 for(let [child,k] of children)if(all(child).rows.some(x=>x.data[k]===id))throw Error('Linked '+child+' must be resolved before archive');
 if(['findings','agreements','obligations','activities','visits'].includes(role)){complete('snapshots');if(all('snapshots').rows.some(x=>x.data.status==='Reviewed'&&x.data.study_id===get(role,id)?.data.study_id))throw Error('Reviewed snapshot references study evidence; preserve historical records');}
}
function clean(role,values,mode,prev){let patch=mode==='create'?Object.fromEntries(R[role].map(f=>[f.key,f.kind==='boolean'?false:null])):{},d={...(prev||{})};
 for(let f of R[role]){
  let k=f.key;
  if(['baseline_date','original_due_date','source_snapshot','agreement_version','archived'].includes(k)){
   if(mode==='edit'&&Object.prototype.hasOwnProperty.call(values,k)&&String(values[k]||'')!==String(prev?.[k]||''))throw Error('Managed evidence field is immutable: '+k);
   if(mode==='create'&&k==='archived')patch.archived=false;
   continue;
  }
  if(!Object.prototype.hasOwnProperty.call(values,k))continue;if(!mp[role].writable.includes(k)){if((values[k]??'')!==(prev?.[k]??''))throw Error('Field is not writable: '+f.label);continue;}
  let v=values[k];if(v===null||v===undefined||typeof v==='string'&&!v.trim()){if(f.required)throw Error('Required: '+f.label);patch[k]=null;continue;}if(!['string','number','boolean'].includes(typeof v))throw Error('Invalid scalar: '+f.label);
  if(f.kind==='number'){let n=num(v);if(n===null)throw Error('Invalid number: '+f.label);patch[k]=n;}
  else if(f.kind==='date'){if(!iso(v))throw Error('Invalid date: '+f.label);patch[k]=v;}
  else if(f.kind==='boolean'){if(![true,false,'true','false'].includes(v))throw Error('Invalid boolean: '+f.label);patch[k]=bool(v);}
  else if(f.kind==='select'){if(!f.options.includes(v))throw Error('Unsupported selection: '+f.label);patch[k]=v;}
  else{if(typeof v!=='string'||v.length>(f.kind==='longtext'?4000:850))throw Error('Invalid or overlong text: '+f.label);patch[k]=v;}
 }
 Object.assign(d,patch);
 if(mode==='create'&&role==='visits'){d.baseline_date=d.planned_date;patch.baseline_date=d.planned_date;}
 if(mode==='create'&&role==='activities'){d.original_due_date=d.due_date;patch.original_due_date=d.due_date;}
 if(mode==='create'&&role==='obligations'){complete('agreements');let ag=get('agreements',d.agreement_id);if(ag){d.agreement_version=ag.data.version;patch.agreement_version=ag.data.version;}}
 for(let f of R[role])if(f.required&&(d[f.key]===null||d[f.key]===undefined||d[f.key]===''))throw Error('Required: '+f.label);
 specialValidated(role,d,prev,st.editor?.id||null,mode);
 if(role==='snapshots')patch.source_snapshot=d.source_snapshot||null;
 for(let k of Object.keys(patch))if(!mp[role].fields[k]||!mp[role].writable.includes(k))throw Error('Missing approved managed-field write binding: '+k);
 return patch;
}
function propose(changes){tools.call('records.propose',changes);st.notice='Proposal prepared for TrialAgents review. No data is saved until confirmed in the host.';}
function createProposal(ed){if(!can(ed.role))throw Error('No approved write binding / read-only app');let current=ed.mode==='edit'?get(ed.role,ed.id):null;if(ed.mode==='edit'&&(!current||current.version!==ed.baseVersion))throw Error('Conflict: the opened version is stale or the record is inaccessible. Draft retained.');let patch=clean(ed.role,ed.draft,ed.mode,current?.data);let mapped={};for(let [k,v] of Object.entries(patch)){if(mp[ed.role].fields[k]&&mp[ed.role].writable.includes(k))mapped[mp[ed.role].fields[k]]=v;}if(ed.mode==='edit')return{kind:'update_record',recordId:ed.id,expectedVersion:ed.baseVersion,data:mapped};return{kind:'create_record',typeId:mp[ed.role].typeId,data:mapped};}
function prefill(role,field,id){let d={};for(let f of R[role])if(f.kind==='select'&&f.required)d[f.key]=f.options[0];
 if(st.studyId&&role!=='studies')d.study_id=st.studyId;
 if(role==='studies')d.status='Planning';if(role==='visits'){d.status='Planned';d.report_status='Not started';d.visit_type='Routine';}
 if(role==='findings'){d.status='Open';d.priority='Medium';}
 if(role==='agreements'){d.status='Draft';d.version=1;}
 if(role==='obligations')d.status='Draft';
 if(role==='activities')d.status='Open';
 if(role==='snapshots'){d.status='Draft';d.period_start=st.asOf.slice(0,7)+'-01';d.period_end=st.asOf;d.cutoff=st.asOf;}
 if(field){d[field]=id;if(field==='visit_id'){let v=get('visits',id);if(v)d.study_id=v.data.study_id;}
 if(field==='agreement_id'){let a=get('agreements',id);if(a)d.study_id=a.data.study_id;}
 if(field==='obligation_id'){let o=get('obligations',id);if(o)d.study_id=o.data.study_id;}}
 return d;
}
function clone(role,data){let d={...data};delete d.archived;d.name=String(d.name||'Entry')+' copy';
 for(let k of ['actual_date','report_date','closure_evidence','closure_proposed_at','closure_verified_at','verified_by','actual_completion_date','reviewed_at','reviewer','evidence_ref','source_snapshot','approved_date'])if(Object.prototype.hasOwnProperty.call(d,k))d[k]=null;
 if(role==='visits'){d.status='Planned';d.report_status='Not started';d.baseline_date=null;d.reschedule_reason=null;}
 if(role==='findings')d.status='Open';
 if(role==='agreements'){d.status='Draft';d.document_ref=null;d.version=1;}
 if(role==='obligations'){d.status='Draft';d.agreement_version=null;}
 if(role==='activities'){d.status='Open';d.original_due_date=null;d.period_label=String(d.period_label||'')+' - new';d.change_reason=null;}
 if(role==='snapshots')d.status='Draft';
 return d;
}
// Domain state change events are applied before any derived numbers or table calculations.
if(ev.kind==='change'){
 if(action.startsWith('field:')&&st.editor)st.editor.draft[action.slice(6)]=ev.value;
 else if(action==='scope-study'){st.studyId=String(ev.value||'');st.pageByRole={};st.filter='all';}
 else if(action==='scope-cutoff'&&iso(ev.value))st.asOf=ev.value;
 else if(action==='scope-month'&&/^\d{4}-\d{2}$/.test(ev.value)){st.month=ev.value;st.calendarPage=0;}
 else if(action==='search'){st.query=String(ev.value||'').slice(0,200);st.pageByRole={};}
 else if(action==='filter'){st.filter=String(ev.value||'all');st.pageByRole={};}
}
if(ev.kind==='click'){
 if(action.startsWith('nav:')){st.route=action.slice(4);st.query='';st.filter='all';st.filters=false;st.notice='';st.pageByRole={};}
 else if(action.startsWith('filter:')){st.filter=action.slice(7);st.pageByRole={};}
 else if(action.startsWith('tab:')){let [,k,v]=action.split(':');st[k]=v;st.query='';st.pageByRole={};}
 else if(action==='toggle-filters')st.filters=!st.filters;
 else if(action.startsWith('page:')){let [,role,p]=action.split(':');st.pageByRole[role]=Math.max(0,Number(p)||0);}
 else if(action==='next-calendar')st.calendarPage++;
 else if(action==='prev-calendar')st.calendarPage=Math.max(0,st.calendarPage-1);
 else if(action==='show-brief-prompt')st.briefPrompt=!st.briefPrompt;
 else if(action==='toggle-editor-fields'&&st.editor)st.editor.showAll=!st.editor.showAll;
 else if(action==='dismiss')st.notice='';
 else if(action.startsWith('add:')){let role=action.slice(4);if(R[role]){st.notice='';st.editor={role,id:null,mode:'create',baseVersion:null,showAll:false,studyVersions:studyVersions(),draft:prefill(role)};st.detail=null;}}
 else if(action.startsWith('prefill:')){let [,role,k,id]=action.split(':');if(R[role]){st.notice='';st.editor={role,id:null,mode:'create',baseVersion:null,showAll:false,studyVersions:studyVersions(),draft:prefill(role,k,id)};st.detail=null;}}
 else if(action.startsWith('edit:')){let [,role,id]=action.split(':');let row=get(role,id);if(row){st.notice='';st.editor={role,id,mode:'edit',baseVersion:row.version,showAll:false,studyVersions:studyVersions(),draft:{...row.data}};st.detail=null;}else st.notice='This record is not accessible; refresh current permissions.';}
 else if(action.startsWith('duplicate:')){let [,role,id]=action.split(':');let row=get(role,id);if(row){st.notice='';st.editor={role,id:null,mode:'create',baseVersion:null,showAll:false,studyVersions:studyVersions(),draft:clone(role,row.data)};st.detail=null;}}
 else if(action.startsWith('detail:')){let [,role,id]=action.split(':');st.detail={role,id};}
 else if(action.startsWith('archive:')){let [,role,id]=action.split(':');let row=get(role,id);if(row)st.del={role,id,baseVersion:row.version,studyVersions:studyVersions(),name:row.data.name};}
 else if(action==='ignore'){st.editor=null;st.notice='Draft ignored; no data saved';}
 else if(action==='close-detail')st.detail=null;
 else if(action==='cancel-archive')st.del=null;
 else if(action==='review-archive'){try{let d=st.del;if(!d)throw Error('No selected archive');let row=get(d.role,d.id);if(!row||row.version!==d.baseVersion)throw Error('Conflict: archive version changed');if(!can(d.role,['archived']))throw Error('Archive permission denied');archiveGuard(d.role,d.id);const changes=[{kind:'update_record',recordId:d.id,expectedVersion:d.baseVersion,data:{[mp[d.role].fields.archived]:true}}];if(d.role!=='studies')changes.push(guardStudy(d,row.data.study_id));propose(changes);}catch(e){st.notice=String(e.message||e);}}
}
if(ev.kind==='submit'&&action==='save-form'&&st.editor){try{Object.assign(st.editor.draft,ev.form||{});propose(st.editor.role==='studies'?[createProposal(st.editor)]:[createProposal(st.editor),guardStudy(st.editor,st.editor.draft.study_id)]);}catch(e){st.notice=String(e.message||e);}}
let order=Array.isArray(layout.tabs)?layout.tabs.filter(x=>screens.some(a=>a[0]===x)):screens.map(x=>x[0]);for(let s of screens)if(!order.includes(s[0]))order.push(s[0]);order=order.filter(x=>layout.visible?.[x]!==false);if(!order.length)order=['overview'];if(!order.includes(st.route))st.route=order[0];
const ico=(name,size=18)=>{let d={overview:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',visits:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 15h4"/>',findings:'<path d="M12 3l9 16H3zM12 9v4m0 3h.01"/>',agreements:'<path d="M6 2h9l4 4v15H6zM15 2v5h5M9 12h7m-7 4h7"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M8 14h3m-3 4h8"/>',obligations:'<path d="M12 2l8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6zM8 12l3 3 5-6"/>',summary:'<path d="M5 3h14v18H5zM9 8h6m-6 4h6m-6 4h4"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',close:'<path d="M4 4l16 16M20 4L4 20"/>'};return'<svg aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none">'+(d[name]||d.overview)+'</svg>';};
function btn(text,a,cls='',disabled=false,attrs=''){return'<button type="button" class="ov-btn '+cls+'" data-action="'+esc(a)+'" '+(disabled?'disabled ':'')+attrs+'>'+text+'</button>';}
function tag(x){let s=String(x||'Unknown'),cls=['Completed','Verified closed','Final','Reviewed','Approved','Active','Confirmed'].includes(s)?'green':['Overdue','Blocked','Expired','Cancelled'].includes(s)?'red':['In progress','Closure proposed','In review','Ready for review','Draft','High'].includes(s)?'amber':'neutral';return '<span class="ov-tag '+cls+'">'+esc(s)+'</span>';}
function stat(labelN,value,sub,dark=false,kind=''){return'<div class="ov-stat '+(dark?'dark':'')+' '+esc(kind)+'"><span>'+esc(labelN)+'</span><strong>'+esc(value)+'</strong><small>'+esc(sub)+'</small></div>';}
function title(name,sub='',extra=''){return'<div class="ov-heading"><div><h1>'+esc(name)+'</h1>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div><div class="ov-heading-actions">'+extra+'</div></div>';}
function card(titleN,body,side=''){return'<section class="ov-card"><div class="ov-card-head"><h2>'+esc(titleN)+'</h2>'+side+'</div>'+body+'</section>';}
function scopeStudy(){let x=all('studies');return'<label class="ov-scope">Study<select data-ui-state="true" data-action="scope-study" name="studyId" aria-label="Select study"><option value="">All authorized studies</option>'+x.rows.map(s=>'<option value="'+esc(s.id)+'" '+(s.id===st.studyId?'selected':'')+'>'+shortText(s.data.protocol_code||s.data.name,60)+'</option>').join('')+'</select></label>';}
function cutoff(){return'<label class="ov-scope">As of <input data-ui-state="true" data-action="scope-cutoff" name="asOf" type="date" value="'+esc(st.asOf)+'" aria-label="Reporting cutoff"></label>';}
function filterBar(values){return'<div class="ov-filter-bar" role="group" aria-label="Filter by status">'+values.map(x=>btn(esc(x),'filter:'+x,'ov-filter '+(st.filter===x?'active':''))).join('')+'</div>';}
function actions(role,row){return'<div class="ov-row-actions">'+btn('Details','detail:'+role+':'+row.id,'ov-link')+btn('Edit','edit:'+role+':'+row.id,'ov-link',!can(role))+btn('Copy','duplicate:'+role+':'+row.id,'ov-link',!can(role))+btn('Archive','archive:'+role+':'+row.id,'ov-link warn',!can(role,['archived']))+'</div>';}
function pretty(role,key,value){let f=R[role].find(x=>x.key===key);if(f?.kind?.startsWith('relation-'))return label(f.kind.slice(9),value);if(f?.kind==='boolean')return bool(value)?'Yes':'No';if(value===null||value===undefined||value==='')return '—';return String(value);}
function cols(role){let base=Array.isArray(layout.cols?.[role])?layout.cols[role].filter(k=>R[role].some(f=>f.key===k)):defaultCols[role];for(let k of defaultCols[role])if(!base.includes(k))base.push(k);let visible=base.filter(k=>layout.visible?.[role+':'+k]!==false);return visible.length?visible:[base[0]];}
function table(role,opts={}){let full=all(role),complete=full.complete,raw=page(role),p=currentPage(role),list=complete?scope(role,full.rows):scope(role,raw.rows);
 if(st.query){let q=st.query.toLowerCase();list=list.filter(x=>Object.values(x.data).some(v=>String(v||'').toLowerCase().includes(q)));}
 if(st.filter!=='all'){list=list.filter(x=>[x.data.status,x.data.report_status,x.data.priority,x.data.category,x.data.visit_type].includes(st.filter));}
 if(opts.only)list=list.filter(opts.only);if(opts.sort)list=[...list].sort(opts.sort);
 let max=complete?Math.max(0,Math.ceil(list.length/per)-1):raw.total===null?0:Math.max(0,Math.ceil(raw.total/per)-1);if(p>max){p=max;st.pageByRole[role]=p;}
 let display=complete?list.slice(p*per,p*per+per):list,fields=cols(role);
 let toolbar='<div class="ov-toolbar"><input type="search" class="ov-search" name="query" data-ui-state="true" data-action="search" value="'+esc(st.query)+'" aria-label="Search current '+esc(role)+'" placeholder="Search '+esc(role)+'…"><div class="ov-toolbar-right">'+btn('Filters'+(st.filter!=='all'?' · 1':''),'toggle-filters','ov-secondary')+btn('<span class="ov-plus">＋</span><span class="ov-add">Add '+esc(role.replace(/s$/,''))+'</span>','add:'+role,'ov-primary',!can(role),'aria-label="Add '+esc(role.replace(/s$/,''))+'"')+'</div></div>';
 let fs=R[role].filter(f=>f.kind==='select'&&['status','report_status','priority','category','visit_type'].includes(f.key));let options=[...new Set(fs.flatMap(f=>f.options))];let filters=st.filters?'<div class="ov-filter-pane" id="filters-'+esc(role)+'"><label>Status / type<select name="filter" data-ui-state="true" data-action="filter" aria-label="Filter '+esc(role)+'"><option value="all">All</option>'+options.map(x=>'<option '+(x===st.filter?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label><span>Applies to '+(complete?'all currently authorized, bounded rows':'this page only')+'.</span></div>':'';
 let rows=display.map(row=>'<tr>'+fields.map(k=>'<td>'+(['status','report_status','priority'].includes(k)?tag(row.data[k]):k==='name'?'<strong>'+shortText(pretty(role,k,row.data[k]),160)+'</strong>':shortText(pretty(role,k,row.data[k]),160))+'</td>').join('')+'<td>'+actions(role,row)+'</td></tr>').join('');
 let pages='<div class="ov-paging"><span>Page '+(p+1)+' of '+(max+1)+' '+(complete?'· '+list.length+' filtered records':'· page-local filter / total may be incomplete')+'</span><div>'+btn('Previous','page:'+role+':'+(p-1),'ov-secondary',p===0)+btn('Next','page:'+role+':'+(p+1),'ov-secondary',p>=max)+'</div></div>';
 return toolbar+filters+(raw.issue?'<p class="ov-warning">'+esc(raw.issue)+'</p>':'')+'<div class="ov-table-wrap" role="region" aria-label="'+esc(role)+' table with horizontal scrolling"><table><thead><tr>'+fields.map(k=>'<th>'+esc(R[role].find(f=>f.key===k)?.label||k)+'</th>').join('')+'<th>Actions</th></tr></thead><tbody>'+(rows.length?rows:'<tr><td class="ov-empty" colspan="'+(fields.length+1)+'">No records in this view. Use Add to create the first authorized record.</td></tr>')+'</tbody></table></div>'+pages+'<p class="ov-table-note">'+(complete?'Search and filters cover this authorized bounded dataset.':'Partial dataset: search and filters apply to this page; counts and absence cannot be verified.')+'</p>';
}
function metrics(){let roles=['studies','sites','visits','findings','agreements','obligations','activities'];
 if(!hasCoverage(...roles)||consistency().length)return null;
 let cut=st.asOf,v=scope('visits',all('visits').rows),f=scope('findings',all('findings').rows),a=scope('activities',all('activities').rows),ag=scope('agreements',all('agreements').rows);
 let dueVisits=v.filter(x=>x.data.planned_date<=cut&&x.data.status!=='Cancelled'),completeVisits=dueVisits.filter(x=>x.data.status==='Completed'&&iso(x.data.actual_date)&&x.data.actual_date<=cut);
 let cancelled=v.filter(x=>x.data.status==='Cancelled'),openFindings=f.filter(x=>x.data.status!=='Verified closed'||!iso(x.data.closure_verified_at)||x.data.closure_verified_at>cut),overdueFindings=openFindings.filter(x=>x.data.due_date<cut);
 let dueActivities=a.filter(x=>x.data.due_date<=cut&&x.data.status!=='Cancelled'),done=dueActivities.filter(x=>x.data.status==='Completed'&&iso(x.data.actual_completion_date)&&x.data.actual_completion_date<=cut&&iso(x.data.reviewed_at)&&x.data.reviewed_at<=cut&&x.data.reviewer&&x.data.evidence_ref&&x.data.reviewed_at>=x.data.actual_completion_date&&x.data.reviewer.trim().toLowerCase()!==x.data.owner.trim().toLowerCase()),onTime=done.filter(x=>x.data.actual_completion_date<=x.data.due_date);
 let lateOpen=dueActivities.filter(x=>x.data.status!=='Completed'),nextActivities=a.filter(x=>x.data.status!=='Completed'&&x.data.status!=='Cancelled'&&x.data.due_date>=cut).sort((x,y)=>x.data.due_date.localeCompare(y.data.due_date));
 let unverified=a.filter(x=>x.data.status==='Completed'&&(!iso(x.data.actual_completion_date)||!iso(x.data.reviewed_at)||!x.data.evidence_ref||!x.data.reviewer||x.data.reviewed_at<x.data.actual_completion_date||x.data.reviewer.trim().toLowerCase()===x.data.owner.trim().toLowerCase()));
 return {v,f,a,ag,dueVisits,completeVisits,cancelled,openFindings,overdueFindings,dueActivities,done,onTime,lateOpen,nextActivities,unverified,visitRate:dueVisits.length?Math.round(100*completeVisits.length/dueVisits.length):null,onTimeRate:dueActivities.length&&!unverified.length?Math.round(100*onTime.length/dueActivities.length):null};
}
function dateRows(list,role,dateField,limit=6){return list.slice(0,limit).map(row=>'<div class="ov-agenda-row"><span class="ov-date-box">'+esc(row.data[dateField]||'—')+'</span><div class="ov-agenda-desc"><b>'+shortText(row.data.name)+'</b><small>'+shortText(role==='visits'?label('sites',row.data.site_id):role==='activities'?label('obligations',row.data.obligation_id):row.data.owner||'')+'</small></div>'+tag(row.data.status)+btn('Open','detail:'+role+':'+row.id,'ov-link')+'</div>').join('')||'<p class="ov-empty">Nothing recorded in the selected view.</p>';}
function stageBars(name,entries){let max=Math.max(1,...entries.map(x=>x[1]));return '<div class="ov-bars">'+entries.map(([k,v])=>'<div class="ov-bar"><span>'+esc(k)+'</span><div class="ov-bar-track"><i style="width:'+Math.round(100*v/max)+'%"></i></div><b>'+v+'</b></div>').join('')+'</div>';}
function overview(){let m=metrics(),ok=!!m,cut=st.asOf;
 let priorities=[];if(m){for(let x of m.lateOpen)priorities.push({kind:'PV activity',date:x.data.due_date,owner:x.data.owner,role:'activities',row:x});for(let x of m.overdueFindings)priorities.push({kind:'Monitoring follow-up',date:x.data.due_date,owner:x.data.owner,role:'findings',row:x});priorities.sort((a,b)=>a.date.localeCompare(b.date));}
 let monitorBars=m?[['Visits scheduled to cutoff',m.dueVisits.length],['Visits conducted',m.completeVisits.length],['Open follow-ups',m.openFindings.length]]:[];
 let pvBars=m?[['Due activities',m.dueActivities.length],['Verified completed',m.done.length],['Late open',m.lateOpen.length]]:[];
 return title('Operational overview','Monitoring visits and partner PV commitments',cutoff())+warning('studies','sites','visits','findings','agreements','obligations','activities')+
 '<div class="ov-stats">'+stat('Monitoring visits',ok&&m.visitRate!==null?m.visitRate+'%':'—',ok?m.completeVisits.length+' of '+m.dueVisits.length+' due by cutoff':'Evidence incomplete',true)+stat('Open follow-ups',ok?m.openFindings.length:'—',ok?m.overdueFindings.length+' overdue':'Unknown')+stat('PV activities due',ok?m.dueActivities.length:'—',ok?m.lateOpen.length+' still open':'Unknown',false,'pv')+stat('Completed on time',ok&&m.onTimeRate!==null?m.onTimeRate+'%':'—',ok?m.onTime.length+' evidence-reviewed':'Unknown',false,'pv')+'</div>'+
 '<div class="ov-two-lane">'+card('Monitoring',ok?stageBars('',monitorBars)+btn('Open monitoring events','nav:visits','ov-link'):emptyCoverage())+card('PV obligations & activities',ok?stageBars('',pvBars)+btn('Open PV schedule','nav:calendar','ov-link'):emptyCoverage())+'</div>'+
 card('Decisions and overdue actions',ok?'<div class="ov-agenda">'+priorities.slice(0,6).map(x=>'<div class="ov-agenda-row"><span class="ov-date-box overdue">'+esc(x.date)+'</span><div class="ov-agenda-desc"><b>'+shortText(x.row.data.name)+'</b><small>'+esc(x.kind+' · '+x.owner)+'</small></div>'+btn('Review','detail:'+x.role+':'+x.row.id,'ov-link')+'</div>').join('')+(priorities.length?'':'<p class="ov-empty">No overdue items in the fully authorized recorded dataset; this does not establish regulatory compliance.</p>')+'</div>':emptyCoverage(),'<span class="ov-muted">As of '+esc(cut)+'</span>')+
 card('Start here','<div class="ov-brief-actions">'+btn('Add study','add:studies','ov-secondary',!can('studies'))+btn('Add institution','add:sites','ov-secondary',!can('sites'))+btn('Plan visit','add:visits','ov-secondary',!can('visits'))+btn('New PV agreement','add:agreements','ov-secondary',!can('agreements'))+'</div><p class="ov-copy">Use a monitoring event to manage follow-ups. Use an approved PV agreement to define an obligation, then create a separate dated activity for each due occurrence.</p>')+
 card('Study setup',tabs([['Studies','studyTab','studies'],['Institutions','studyTab','sites']],st.studyTab)+table(st.studyTab==='sites'?'sites':'studies'))+'<p class="ov-disclaimer">Operational oversight only. No patient records, adverse-event case processing, clinical safety conclusions, or statutory submission automation.</p>';
}
function emptyCoverage(){return'<p class="ov-empty">Complete authorized source data is needed for verified totals.</p>';}
function tabs(items,selected){return'<div class="ov-tabs" role="tablist" aria-label="Record section">'+items.map(([label,k,v])=>btn(esc(label),'tab:'+k+':'+v,'ov-tab '+(selected===v?'active':''),false,'role="tab" aria-selected="'+(selected===v)+'"')).join('')+'</div>';}
function visits(){let m=metrics(),sc=scope('visits',all('visits').rows),up=sc.filter(x=>x.data.status!=='Cancelled'&&x.data.status!=='Completed'&&iso(x.data.planned_date)).sort((a,b)=>a.data.planned_date.localeCompare(b.data.planned_date));
 let t=tabs([['Events','monitorTab','visits'],['Follow-up actions','monitorTab','findings']],st.monitorTab),role=st.monitorTab==='findings'?'findings':'visits';
 return title('Monitoring events','Visit plans, reports and linked operational follow-ups',cutoff())+warning('studies','sites','visits','findings')+
 card('Pending monitoring events',hasCoverage('visits','sites')?'<div class="ov-agenda">'+dateRows(up,'visits','planned_date',4)+'</div>':emptyCoverage(),'<span class="ov-muted">Original date retained after rescheduling</span>')+
 card(role==='visits'?'Visit worklist':'Follow-up worklist',t+table(role))+
 '<p class="ov-disclaimer">Open a monitoring event to review its report status and linked follow-ups. Do not enter patient, adverse-event, or protocol-deviation case narratives.</p>';
}
function agreements(){let list=scope('agreements',all('agreements').rows),due=list.filter(x=>x.data.status==='Active'&&iso(x.data.review_date)&&x.data.review_date<=st.asOf).sort((a,b)=>a.data.review_date.localeCompare(b.data.review_date));
 let t=tabs([['Agreements','agreementTab','agreements'],['Defined obligations','agreementTab','obligations']],st.agreementTab),role=st.agreementTab==='obligations'?'obligations':'agreements';
 let reviewCard=due.length?card('Agreement reviews due','<div class="ov-agenda">'+dateRows(due,'agreements','review_date',4)+'</div>','<span class="ov-muted">Approval and signature happen outside this app</span>'):'';
 return title('PV agreements','Partner versions, approved source references and defined obligations',cutoff())+warning('agreements','obligations')+
 reviewCard+card(role==='agreements'?'Partner agreements':'Obligations defined by agreement',t+table(role))+
 '<p class="ov-disclaimer">Agreement versions and obligation definitions remain distinct. Recurring dates are NOT automatically inferred from jurisdiction or frequency.</p>';
}
function calendar(){let eligible=scope('activities',all('activities').rows),parts=st.month.split('-').map(Number),yr=parts[0],mo=parts[1];if(!yr||mo<1||mo>12){yr=Number(st.asOf.slice(0,4));mo=Number(st.asOf.slice(5,7));}
 let rows=[];let days=new Date(Date.UTC(yr,mo,0)).getUTCDate();for(let d=1;d<=days;d++){let date=st.month+'-'+String(d).padStart(2,'0');let day=eligible.filter(x=>x.data.due_date===date);if(day.length)rows.push({date,day});}
 const monthCount=rows.reduce((n,x)=>n+x.day.length,0);st.calendarPage=Math.min(st.calendarPage,Math.max(0,Math.ceil(monthCount/25)-1));let skip=st.calendarPage*25,left=25;const visibleRows=rows.map(x=>{const begin=Math.min(skip,x.day.length);skip-=begin;const day=x.day.slice(begin,begin+left);left-=day.length;return {...x,day};}).filter(x=>x.day.length);let ok=hasCoverage('activities','obligations','agreements');let monthly=ok?visibleRows.map(({date,day})=>'<div class="ov-calendar-row"><div class="ov-calendar-day">'+esc(date)+'</div><div class="ov-calendar-items">'+day.map(x=>'<div class="ov-calendar-item"><span class="ov-pv-dot"></span><span><b>'+shortText(x.data.name)+'</b><small>'+shortText(label('obligations',x.data.obligation_id)+' · '+x.data.owner)+'</small></span>'+tag(x.data.status)+btn('Open','detail:activities:'+x.id,'ov-link')+'</div>').join('')+'</div></div>').join(''):'<p class="ov-empty">Not enough authorized data for a complete calendar.</p>';
 return title('PV activity calendar','Individual due-date occurrences linked to approved obligations','<label class="ov-scope">Month<input type="month" data-ui-state="true" name="month" data-action="scope-month" value="'+esc(st.month)+'" aria-label="Select activity month"></label>')+warning('agreements','obligations','activities')+
 card('Dated partner activities','<div class="ov-month-strip"><b>'+esc(['January','February','March','April','May','June','July','August','September','October','November','December'][mo-1]+' '+yr)+'</b><span>'+(ok?rows.reduce((n,x)=>n+x.day.length,0)+' recorded activities':'Coverage incomplete')+'</span></div>'+(monthly||'<p class="ov-empty">No due activities recorded this month. Check agreement sources before concluding no activities are needed.</p>'),btn('Previous','prev-calendar','ov-secondary',st.calendarPage===0)+btn('Next','next-calendar','ov-secondary',(st.calendarPage+1)*25>=monthCount)+btn('Add dated activity','add:activities','ov-secondary',!can('activities')))+
 card('Activity register',table('activities'))+'<p class="ov-disclaimer">Manual dated occurrences only. TrialAgents does not calculate legal deadlines, submit safety reports, or create recurring activities until separately configured and approved.</p>';
}
function summary(){let m=metrics();let prompt='Prepare a concise INTERNAL study oversight briefing using only authorized TrialAgents operational data. Study: '+(st.studyId||'[select study]')+'. Cutoff '+st.asOf+'. Separate monitoring event completion, trip report status and unresolved follow-ups from PV agreement commitments and dated activity receipts. Cite the source record IDs, approved agreement versions, evidence dates and missing coverage. Never infer adverse-event or patient information, medical conclusions, legal due dates or statutory submission compliance. Return a DRAFT for review; do not save, email or schedule anything without explicit approval.';
 return title('Management briefings','Optional, reviewed internal summaries of monitoring and PV activities',cutoff())+warning('visits','findings','agreements','obligations','activities','snapshots')+
 '<div class="ov-two-lane">'+card('Monitoring',m?'<div class="ov-summary-line"><strong>'+m.completeVisits.length+' / '+m.dueVisits.length+'</strong><span>Visits conducted by cutoff</span></div><div class="ov-summary-line"><strong>'+m.openFindings.length+'</strong><span>Open operational actions</span></div>':emptyCoverage())+
 card('PV operations',m?'<div class="ov-summary-line"><strong>'+m.done.length+' / '+m.dueActivities.length+'</strong><span>Verified dated activities by cutoff</span></div><div class="ov-summary-line"><strong>'+m.lateOpen.length+'</strong><span>Unresolved overdue activities</span></div>':emptyCoverage())+'</div>'+
 card('ChatGPT briefing','<p class="ov-copy">Copy the review prompt into a connected ChatGPT conversation only when an owner requests the briefing. No standing schedule, sending, or report generation is required to use this app.</p><div class="ov-brief-actions">'+btn(st.briefPrompt?'Hide brief instructions':'Show ChatGPT instructions','show-brief-prompt','ov-primary')+btn('Add briefing record','add:snapshots','ov-secondary',!can('snapshots'))+'</div>'+(st.briefPrompt?'<div class="ov-prompt"><b>Approved-use draft prompt</b><textarea readonly aria-label="ChatGPT operational briefing prompt">'+esc(prompt)+'</textarea></div>':'') )+
 card('Saved internal briefings',table('snapshots'))+'<p class="ov-disclaimer">Not a validated safety report, pharmacovigilance database, or regulatory compliance certification.</p>';
}
function field(role,f,d){if(f.key==='archived'||['source_snapshot','baseline_date','original_due_date','agreement_version'].includes(f.key))return '';let val=d[f.key]??'',options=f.kind.startsWith('relation-')?all(f.kind.slice(9)).rows.map(x=>[x.id,x.data.name]):f.kind==='select'?f.options.map(x=>[x,x]):null;let readonly=false;let attrs='name="'+esc(f.key)+'" data-ui-state="true" data-action="field:'+esc(f.key)+'" aria-label="'+esc(f.label)+'" '+(f.required&&!readonly?'required ':'')+(readonly?'readonly disabled ':'');
 let input=options?'<select '+attrs+'><option value="">Choose...</option>'+options.map(([id,text])=>'<option value="'+esc(id)+'" '+(String(val)===String(id)?'selected':'')+'>'+shortText(text,60)+'</option>').join('')+'</select>':f.kind==='longtext'?'<textarea rows="3" '+attrs+'>'+esc(val)+'</textarea>':f.kind==='boolean'?'<select '+attrs+'><option value="false" '+(!bool(val)?'selected':'')+'>No</option><option value="true" '+(bool(val)?'selected':'')+'>Yes</option></select>':'<input '+attrs+' type="'+(f.kind==='date'?'date':f.kind==='number'?'number':'text')+'" '+(f.kind==='number'?'step="any" ':'')+'value="'+esc(val)+'"/>';
 return'<label class="ov-field '+(f.kind==='longtext'?'wide':'')+'"><span>'+esc(f.label)+(f.required?' *':'')+'</span>'+input+(readonly?'<small>Managed baseline; change the current deadline with reason.</small>':'')+'</label>';}
const essentialFields={
 studies:['name','protocol_code','phase','sponsor_owner','status'],
 sites:['name','study_id','country','site_code'],
 visits:['name','study_id','site_id','visit_type','monitor','planned_date','status','report_status'],
 findings:['name','study_id','visit_id','priority','owner','due_date','status','corrective_action','source_ref'],
 agreements:['name','study_id','partner','scope','version','effective_date','review_date','owner','status'],
 obligations:['name','study_id','agreement_id','jurisdiction','frequency','owner','status','source_ref','source_date'],
 activities:['name','study_id','obligation_id','period_label','due_date','owner','status'],
 snapshots:['name','study_id','period_start','period_end','cutoff','monitoring_summary','pv_summary','status']
};
function editor(){let ed=st.editor;if(!ed)return '';
 let must=[...(essentialFields[ed.role]||[])];let d=ed.draft;
 if(ed.role==='visits'&&(d.status==='Completed'||d.report_status==='Final'))must.push('actual_date');
 if(ed.role==='visits'&&d.report_status==='Final')must.push('report_date','source_ref');
 if(ed.role==='visits'&&ed.mode==='edit')must.push('reschedule_reason');
 if(ed.role==='findings'&&['Closure proposed','Verified closed'].includes(d.status))must.push('closure_evidence','closure_proposed_at');
 if(ed.role==='findings'&&d.status==='Verified closed')must.push('closure_verified_at','verified_by');
 if(ed.role==='agreements'&&d.status==='Active')must.push('document_ref','approved_date');
 if(ed.role==='activities'&&['Ready for review','Completed'].includes(d.status))must.push('actual_completion_date','evidence_ref');
 if(ed.role==='activities'&&d.status==='Completed')must.push('reviewer','reviewed_at');
 if(ed.role==='activities'&&ed.mode==='edit')must.push('change_reason');
 if(ed.role==='snapshots'&&d.status==='Reviewed')must.push('reviewer','reviewed_at');
 let fields=R[ed.role].filter(f=>!['archived','baseline_date','original_due_date','agreement_version','source_snapshot'].includes(f.key));
 const native=cols(ed.role);fields.sort((a,b)=>{const ai=native.indexOf(a.key),bi=native.indexOf(b.key);return (ai<0?999:ai)-(bi<0?999:bi);});let shown=fields.filter(f=>ed.showAll||must.includes(f.key)),extra=fields.length-shown.length;
 return'<div class="ov-overlay"><div class="ov-drawer" role="dialog" aria-modal="true" aria-label="'+(ed.mode==='edit'?'Edit ':'Add ')+esc(ed.role)+'"><header class="ov-drawer-head"><div><h2>'+(ed.mode==='edit'?'Edit ':'Add ')+esc(ed.role.replace(/s$/,''))+'</h2><p>Key fields first. Review proposals before anything is saved.</p></div>'+btn(ico('close'),'ignore','ov-secondary',false,'aria-label="Close editor"')+'</header><form data-action="save-form"><div class="ov-drawer-body">'+shown.map(f=>field(ed.role,f,ed.draft)).join('')+
 (st.notice?'<p class="ov-warning wide" role="alert">'+esc(st.notice)+'</p>':'')+'<div class="ov-extra-fields">'+btn((ed.showAll?'Hide additional fields':'Additional fields'+(extra?' ('+extra+')':'')),'toggle-editor-fields','ov-secondary')+'</div></div><div class="ov-drawer-foot">'+btn('Ignore','ignore','ov-secondary')+'<button type="submit" class="ov-btn ov-primary">Review changes</button></div></form></div></div>';
}
function detail(){let x=st.detail;if(!x)return '';let row=get(x.role,x.id);if(!row)return '';
 let target=x.role==='visits'?'findings':x.role==='agreements'?'obligations':x.role==='obligations'?'activities':null;
 let key=x.role==='visits'?'visit_id':x.role==='agreements'?'agreement_id':x.role==='obligations'?'obligation_id':null;
 let linked=target&&hasCoverage(target)?all(target).rows.filter(y=>y.data[key]===x.id):[];
 let related=target?'<section class="ov-related-section"><h3>'+esc(target==='findings'?'Follow-up actions':target==='obligations'?'Defined obligations':'Dated activity occurrences')+'</h3>'+
  (hasCoverage(target)?'<div class="ov-linked-list">'+linked.slice(0,15).map(y=>'<div class="ov-linked-row"><div><b>'+shortText(y.data.name)+'</b><small>'+esc(y.data.due_date||y.data.period_label||y.data.frequency||'')+'</small></div>'+tag(y.data.status)+btn('Open','detail:'+target+':'+y.id,'ov-link')+'</div>').join('')+(linked.length>15?'<p class="ov-copy">Showing 15 of '+linked.length+'. Open the corresponding register to see every linked record.</p>':'')+(linked.length?'':'<p class="ov-empty">No linked records yet.</p>')+'</div>':emptyCoverage())+
  btn('Add '+(target==='findings'?'follow-up':target==='obligations'?'obligation definition':'dated activity'),'prefill:'+target+':'+key+':'+row.id,'ov-primary',!can(target))+'</section>':'';
 const sourceNote=x.role==='snapshots'&&row.data.status==='Reviewed'?'<p class="ov-warning">'+(!hasCoverage('studies','sites','visits','findings','agreements','obligations','activities')?'Current evidence cannot be verified.':row.data.source_snapshot===signature(row.data.study_id,row.data.cutoff)?'Reviewed evidence matches the current source.':'Source evidence changed or uses a legacy signature; this briefing is historical. Create a new briefing for current evidence.')+'</p>':'';let parent=x.role==='findings'?'<div class="ov-rel-context">Monitoring event: '+esc(label('visits',row.data.visit_id))+'</div>':x.role==='activities'?'<div class="ov-rel-context">Source obligation: '+esc(label('obligations',row.data.obligation_id))+'</div>':'';
 return'<div class="ov-overlay"><div class="ov-drawer" role="dialog" aria-modal="true" aria-label="Record details"><header class="ov-drawer-head"><div><h2>'+shortText(row.data.name)+'</h2><p>Authorized record · revision '+row.version+'</p></div>'+btn(ico('close'),'close-detail','ov-secondary',false,'aria-label="Close details"')+'</header><div class="ov-detail">'+sourceNote+parent+R[x.role].filter(f=>f.key!=='archived').map(f=>'<div><span>'+esc(f.label)+'</span><strong>'+esc(pretty(x.role,f.key,row.data[f.key]))+'</strong></div>').join('')+related+'</div><footer class="ov-drawer-foot">'+btn('Close','close-detail','ov-secondary')+btn('Edit','edit:'+x.role+':'+row.id,'ov-primary',!can(x.role))+'</footer></div></div>';
}
function archive(){let x=st.del;if(!x)return '';return'<div class="ov-overlay"><div class="ov-confirm" role="alertdialog"><h2>Archive '+esc(x.name)+'?</h2><p>Archived records are retained as evidence. Dependent active records must first be resolved. The host reviews the exact record/version before writing.</p>'+(st.notice?'<p class="ov-warning" role="alert">'+esc(st.notice)+'</p>':'')+'<div>'+btn('Cancel','cancel-archive','ov-secondary')+btn('Review archive','review-archive','ov-primary')+'</div></div></div>';}
const view={overview,visits,agreements,calendar,summary};
const nav=order.map(id=>{let s=screens.find(x=>x[0]===id);return btn(ico(id)+'<span>'+esc(s[1])+'</span>','nav:'+id,'ov-nav '+(st.route===id?'active':''),false,'aria-label="Open '+esc(s[1])+'" aria-current="'+(st.route===id?'page':'false')+'"');}).join('');
const html='<div class="ov-shell"><aside class="ov-sidebar"><div class="ov-app-name"><strong>'+esc(String(layout.heading||cfg.heading||'Trial Oversight').slice(0,80))+'</strong><small>Monitoring & PV operations</small></div><nav aria-label="App sections">'+nav+'</nav><div class="ov-sidebar-foot">Internal sponsor workspace<small>Access via TrialAgents</small></div></aside><main class="ov-main"><header class="ov-topbar"><div class="ov-study-top">'+(st.editor||st.detail||st.del?'<span>Record review</span>':scopeStudy())+'</div><div class="ov-top-actions"><span>Operational oversight only</span>'+btn(ico('settings'),'tracker:layout','ov-settings',false,'aria-label="Layout settings"')+'</div></header><div class="ov-content">'+(st.notice?'<div class="ov-notice" role="status">'+esc(st.notice)+btn('Dismiss','dismiss','ov-link')+'</div>':'')+(st.editor||st.detail||st.del?title(screens.find(x=>x[0]===st.route)?.[1]||'Trial oversight','Close the record drawer to return to this screen.'):(view[st.route]||overview)())+'</div><footer class="ov-footer">Non-patient monitoring and PV obligation metadata · reviewed writes · no statutory reporting</footer></main></div>'+editor()+detail()+archive();
return {html,css:OV_CSS,state:st};
