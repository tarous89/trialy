/* Shared helpers for the radar's read-only app functions (E7). appRoles maps role keys to this installation's tables. */
const TBL={};for(const k of Object.keys(RADAR.roles))TBL[k]=appRoles[RADAR.roles[k]]||null;
const TODAY=new Date().toISOString().slice(0,10);
const PLATFORM_URL='https://platform.trialagents.com';
let callsLeft=85;
function readPage(t,opts){
 if(!TBL[t])return {rows:[],total:0,missing:true};
 if(callsLeft<=0)return {rows:[],total:null,budget:true};callsLeft--;
 const p=tools.call('records.read',Object.assign({typeId:TBL[t],limit:100},opts||{}));
 return {rows:Array.isArray(p&&p.rows)?p.rows:[],total:p&&p.total!==null&&p.total!==undefined?Number(p.total):null};
}
function readAll(t,max,opts){
 let rows=[],offset=Number(opts&&opts.offset)||0,total=null,stopped=false;
 while(rows.length<max){const p=readPage(t,Object.assign({},opts,{offset}));if(p.missing||p.budget){stopped=true;break;}rows=rows.concat(p.rows);total=p.total;offset+=p.rows.length;if(!p.rows.length||(total!==null&&offset>=total))break;}
 return {rows:rows.slice(0,max),total,complete:!stopped&&total!==null&&rows.length>=total-(Number(opts&&opts.offset)||0)};
}
const D=r=>(r&&r.data)||{};
/** Rows saved by one run: search for the run ID, then keep exact matches on the given field. */
function rowsOfRun(t,field,runId){if(!runId)return [];return readAll(t,500,{q:String(runId)}).rows.filter(r=>String(D(r)[field]||'')===String(runId));}
function kindLabel(k){const x=RADAR.eventKinds.find(e=>e.key===k);return x?x.label:String(k||'').replace(/_/g,' ');}
function firstUrl(v){const xs=briefJSON(v,[]);const s=(Array.isArray(xs)?xs:[]).find(x=>x&&/^https?:\/\//.test(String(x.url||'')));return s?String(s.url):'';}
function words(t){return String(t||'').split(/\s+/).filter(w=>/[A-Za-z0-9]/.test(w)).length;}
function dateText(d){const t=briefDate(d);if(!t)return '';const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return Number(t.slice(8))+' '+M[Number(t.slice(5,7))-1]+' '+t.slice(0,4);}
function addDaysTo(d,n){const t=Date.UTC(Number(d.slice(0,4)),Number(d.slice(5,7))-1,Number(d.slice(8,10)))+n*86400000;return new Date(t).toISOString().slice(0,10);}
function itemName(row){const d=D(row);return String(d.title||d.name||d.natural_key||RADAR.itemLabel).slice(0,90);}
/** Cut an email to about `limit` words, keeping whole lines. */
function clip(lines,limit){const out=[];let n=0;for(const l of lines){const w=words(l);if(n+w>limit&&out.length)break;out.push(l);n+=w;}return out;}
