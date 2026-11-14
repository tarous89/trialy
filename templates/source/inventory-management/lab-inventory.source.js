const templateLayoutSchema={"screens":[{"id":"overview","label":"Overview"},{"id":"inventory","label":"Inventory"},{"id":"requests","label":"Requests"},{"id":"orders","label":"Orders"},{"id":"locations","label":"Locations"},{"id":"settings","label":"Reports & settings"},{"id":"item","label":"Item page (QR)"}],"groups":{"items":[{"id":"item","label":"Item"},{"id":"category","label":"Category"},{"id":"stock","label":"Stock"},{"id":"expiry","label":"Next expiry"},{"id":"location","label":"Location"},{"id":"supplier","label":"Supplier"},{"id":"status","label":"Status"}],"requests":[{"id":"item","label":"Item"},{"id":"quantity","label":"Quantity"},{"id":"requester","label":"Requested by"},{"id":"program","label":"Program"},{"id":"amount","label":"Amount"},{"id":"urgency","label":"Urgency"},{"id":"status","label":"Status"},{"id":"requested","label":"Requested"}]}};
/* TrialAgents Lab Inventory 2.0.0 (life.inventory-management) | frontend-js function body. No DOM, network or browser storage.
 * Returns {html,css,state}. Records come only from authorized bindings; every record write is an exact records.propose reviewed by TrialAgents.
 * Orders are tracked only: the app never contacts suppliers, sends purchase orders or connects to a shop. Every lot quantity change is
 * written together with a movement in the same review; a lot created by receiving gets its "received" movement in the next review
 * (the platform gives a record its ID only when it is created). Approvals: one approver (per program when set), a second approver above
 * the amount threshold, and never the requester. Assistants propose; a person confirms every review.
 */

const cfg=typeof templateConfiguration==='object'&&templateConfiguration?templateConfiguration:{};
const bindings=Array.isArray(templateBindings)?templateBindings:[];
const inp=input||{};
const event=inp.event||{kind:'open',action:'',value:null,form:{}};
const action=String(event.action||'');
const form=event.form&&typeof event.form==='object'?event.form:{};
const isAct=event.kind==='click'||event.kind==='submit';

const esc=v=>String(v===null||v===undefined?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const has=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
const num=(v,otherwise=null)=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v))?Number(v):otherwise;
const bool=v=>v===true||v==='true'||v==='on'||v==='1';
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYNAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const validDate=v=>{const t=String(v||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(t))return '';const d=new Date(t+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===t?t:'';};
const dayNo=d=>Math.round(Date.UTC(Number(d.slice(0,4)),Number(d.slice(5,7))-1,Number(d.slice(8,10)))/86400000);
const addDays=(d,n)=>d?new Date((dayNo(d)+Math.round(n))*86400000).toISOString().slice(0,10):'';
const diffDays=(a,b)=>dayNo(b)-dayNo(a);
const weekday=d=>new Date(dayNo(d)*86400000).getUTCDay();
const dateLabel=d=>d?Number(d.slice(8,10))+' '+MONTHS[Number(d.slice(5,7))-1]+' '+d.slice(0,4):'—';
const shortDate=d=>d?Number(d.slice(8,10))+' '+MONTHS[Number(d.slice(5,7))-1]:'—';
const monthLabel=m=>MONTHS[Number(m.slice(5,7))-1]+' '+m.slice(0,4);
const plural=(n,w)=>n+' '+(w==='box'?(Math.abs(n)===1?'box':'boxes'):w+(Math.abs(n)===1?'':'s'));
const label=v=>String(v===null||v===undefined||v===''?'—':v).replace(/_/g,' ');
const cap=s=>{s=label(s);return s.charAt(0).toUpperCase()+s.slice(1);};
const parseJSON=v=>{try{const x=JSON.parse(String(v||''));return x&&typeof x==='object'?x:null;}catch(e){return null;}};
const list=v=>String(v||'').split(',').map(x=>x.trim()).filter(Boolean);
const textOf=(v,max)=>String(v===null||v===undefined?'':v).trim().slice(0,max||300);
const same=(a,b)=>String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase()&&String(a||'').trim()!=='';
const round2=n=>Math.round(n*100)/100;
const qty=n=>{n=num(n,0);return Number.isInteger(n)?String(n):String(round2(n));};
const group=n=>{const r=Math.round(Math.abs(n)),t=String(r).replace(/\B(?=(\d{3})+(?!\d))/g,',');return (n<0&&r?'-':'')+t;};
const money=(n,c)=>n===null||n===undefined?'—':(c?c+' ':'')+group(n);

/* QR codes (ISO/IEC 18004, byte mode, error correction L, versions 1–15, mask 0) drawn as one SVG path of horizontal runs. */
const QR_ECW=[0,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22],QR_NB=[0,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6];
function qrMatrix(text){
 const bytes=[];for(const ch of String(text)){let c=ch.codePointAt(0);if(c<128)bytes.push(c);else if(c<2048)bytes.push(192|c>>6,128|c&63);else if(c<65536)bytes.push(224|c>>12,128|c>>6&63,128|c&63);else bytes.push(240|c>>18,128|c>>12&63,128|c>>6&63,128|c&63);}
 const raw=v=>{let r=(16*v+128)*v+64;if(v>=2){const n=Math.floor(v/7)+2;r-=(25*n-10)*n-55;if(v>=7)r-=36;}return r;};
 let ver=1,cap=0;for(;ver<=15;ver++){cap=Math.floor(raw(ver)/8)-QR_ECW[ver]*QR_NB[ver];if(4+(ver<10?8:16)+8*bytes.length<=cap*8)break;}
 if(ver>15)return null;
 const bb=[],put=(val,len)=>{for(let i=len-1;i>=0;i--)bb.push(val>>>i&1);};
 put(4,4);put(bytes.length,ver<10?8:16);for(const b of bytes)put(b,8);put(0,Math.min(4,cap*8-bb.length));put(0,(8-bb.length%8)%8);
 for(let p=0xEC;bb.length<cap*8;p^=0xEC^0x11)put(p,8);
 const data=[];for(let i=0;i<bb.length;i+=8){let b=0;for(let j=0;j<8;j++)b=b<<1|bb[i+j];data.push(b);}
 const mul=(x,y)=>{let z=0;for(let i=7;i>=0;i--){z=(z<<1)^((z>>>7)*0x11D);z^=(y>>>i&1)*x;}return z&255;};
 const deg=QR_ECW[ver],div=[];for(let i=0;i<deg;i++)div.push(0);div[deg-1]=1;let root=1;
 for(let i=0;i<deg;i++){for(let j=0;j<deg;j++){div[j]=mul(div[j],root);if(j+1<deg)div[j]^=div[j+1];}root=mul(root,2);}
 const rem=d=>{const r=div.map(()=>0);for(const b of d){const f=b^r.shift();r.push(0);for(let i=0;i<deg;i++)r[i]^=mul(div[i],f);}return r;};
 const nb=QR_NB[ver],rawCw=Math.floor(raw(ver)/8),nShort=nb-rawCw%nb,shortLen=Math.floor(rawCw/nb),blocks=[];
 for(let i=0,k=0;i<nb;i++){const d=data.slice(k,k+shortLen-deg+(i<nShort?0:1));k+=d.length;const e=rem(d);if(i<nShort)d.push(0);blocks.push(d.concat(e));}
 const cw=[];for(let i=0;i<blocks[0].length;i++)for(let j=0;j<nb;j++)if(i!==shortLen-deg||j>=nShort)cw.push(blocks[j][i]);
 const size=ver*4+17,m=[],fn=[];for(let y=0;y<size;y++){m.push([]);fn.push([]);for(let x=0;x<size;x++){m[y].push(false);fn[y].push(false);}}
 const setF=(x,y,d)=>{m[y][x]=d;fn[y][x]=true;};
 for(let i=0;i<size;i++){setF(6,i,i%2===0);setF(i,6,i%2===0);}
 for(const [cx,cy] of [[3,3],[size-4,3],[3,size-4]])for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=Math.max(Math.abs(dx),Math.abs(dy)),x=cx+dx,y=cy+dy;if(x>=0&&x<size&&y>=0&&y<size)setF(x,y,d!==2&&d!==4);}
 if(ver>1){const n=Math.floor(ver/7)+2,step=Math.ceil((ver*4+4)/(n*2-2))*2,pos=[6];for(let p=size-7;pos.length<n;p-=step)pos.splice(1,0,p);
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){if(i===0&&j===0||i===0&&j===n-1||i===n-1&&j===0)continue;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)setF(pos[i]+dx,pos[j]+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1);}}
 const format=mask=>{const d=1<<3|mask;let r=d;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);const bits=(d<<10|r)^0x5412,g=i=>(bits>>>i&1)===1;
  for(let i=0;i<=5;i++)setF(8,i,g(i));setF(8,7,g(6));setF(8,8,g(7));setF(7,8,g(8));for(let i=9;i<15;i++)setF(14-i,8,g(i));
  for(let i=0;i<8;i++)setF(size-1-i,8,g(i));for(let i=8;i<15;i++)setF(8,size-15+i,g(i));setF(8,size-8,true);};
 format(0);
 if(ver>=7){let r=ver;for(let i=0;i<12;i++)r=(r<<1)^((r>>>11)*0x1F25);const bits=ver<<12|r;for(let i=0;i<18;i++){const c=(bits>>>i&1)===1,a=size-11+i%3,b=Math.floor(i/3);setF(a,b,c);setF(b,a,c);}}
 let i=0;for(let right=size-1;right>=1;right-=2){if(right===6)right=5;for(let v=0;v<size;v++)for(let j=0;j<2;j++){const x=right-j,up=((right+1)&2)===0,y=up?size-1-v:v;if(!fn[y][x]&&i<cw.length*8){m[y][x]=(cw[i>>>3]>>>(7-(i&7))&1)===1;i++;}}}
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(!fn[y][x]&&(x+y)%2===0)m[y][x]=!m[y][x];
 return m;}
function qrSvg(text,labelText){const m=qrMatrix(text);if(!m)return '';const n=m.length,q=4;let d='';
 /* One subpath per row: each dark run is a 1-unit-wide stroke, with relative moves between runs (keeps a sheet within the frame limit). */
 for(let y=0;y<n;y++){let x=0,prev=-1;while(x<n){if(!m[y][x]){x++;continue;}let e=x;while(e<n&&m[y][e])e++;d+=(prev<0?'M'+(x+q)+' '+(y+q)+'.5':'m'+(x-prev)+' 0')+'h'+(e-x);prev=e;x=e;}}
 return '<svg class="li-qr" viewBox="0 0 '+(n+2*q)+' '+(n+2*q)+'" role="img" aria-label="'+esc(labelText||'QR code')+'"><rect width="'+(n+2*q)+'" height="'+(n+2*q)+'" fill="#fff"/><path fill="none" stroke="#000" stroke-width="1" d="'+d+'"/></svg>';}

const ORG_TYPES=['company','investor','cro','cdmo','site','funder','partner','agency','other'];
const CUR=['EUR','USD','GBP','CHF','DKK','SEK','NOK','JPY','CAD','AUD'];
const CAD=['daily','weekly','monthly'];const DAYS=['mon','tue','wed','thu','fri','sat','sun'];const DAY_LABEL={mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday',sun:'Sunday'};
const LOCK=['room','freezer','fridge','cabinet','shelf','box','other'];const UNIT_KINDS=['freezer','fridge','cabinet','other'];
const LOTS=['in_stock','used_up','expired','discarded'];const LOT_LABEL={in_stock:'In stock',used_up:'Used up',expired:'Expired',discarded:'Discarded'};
const MOVK=['received','used','count','moved','discarded'];const VIA=['app','qr','assistant'];
const URG=['normal','urgent'];
const RS=['requested','approved','rejected','ordered','received','cancelled'];const RS_LABEL={requested:'Requested',approved:'Approved',rejected:'Rejected',ordered:'Ordered',received:'Received',cancelled:'Cancelled'};
const OS=['ordered','partially_received','received','cancelled'];const OS_LABEL={ordered:'Ordered',partially_received:'Partially received',received:'Received',cancelled:'Cancelled'};
const STANDARD_CATEGORIES=['Reagent','Consumable','Antibody','Cell line','Plasmid','Chemical'];
const STANDARD_UNITS=['bottle','box','vial','pack','tube','kit','plate','flask','bag','each'];
const DEFAULT_DIGEST_TEXT='Here is what needs attention in the lab. Open Lab Inventory to act on it.';

const OPT={ORG:ORG_TYPES,CUR,CAD,DAY:DAYS,LOCK,LOTS,MOVK,VIA,URG,RS,OS};
const F=spec=>spec.split(';').map(x=>{const [k,kind,lab,o]=x.split('|'),required=k.endsWith('*'),key=required?k.slice(0,-1):k,f={key,label:lab||cap(key),kind:kind||'text'};if(required)f.required=true;if(OPT[o])f.options=OPT[o];if(f.kind[0]==='@'){f.ref=f.kind.slice(1);f.kind='ref';}return f;});
/* kind "frozen": written only by the app's own flows (never in the generic editor). */
const S={
 organizations:F('name*;org_type|select|Type|ORG;country||Country or region;website;archived|boolean'),
 programs:F('name;code;stage;status;archived|boolean'),
 agreements:F('name;counterparty_id;agreement_type;status;effective_date|date;expiry_date|date;archived|boolean'),
 settings:F('approver*;second_approver;threshold_amount|number;currency|select||CUR;program_approvers|frozen;expiry_window_days|number;digest_cadence|select||CAD;digest_day|select||DAY;digest_time;digest_recipients;digest_text|longtext;units;app_link'),
 categories:F('name*;standard|frozen;archived|boolean'),
 locations:F('name*;parent_id|@locations|Inside;kind*|select|Kind|LOCK;temperature;archived|boolean'),
 items:F('name*;category_id*|@categories|Category;supplier_id|@organizations|Supplier;catalog_number||Catalog number;unit*||Unit (bottle, box, vial…);unit_size||Unit size;last_price|number|Last price per unit;currency|select||CUR;reorder_point|number|Reorder point;reorder_quantity|number|Usual order quantity;lead_time_days|number|Lead time (days);default_location_id|@locations|Default location;program_id|@programs|Program;owner;notes|longtext;archived|boolean'),
 lots:F('item_id*|frozen;lot_number||Lot number;quantity*|frozen;received_on|date|Received on;expires_on|date|Expires on;location_id*|frozen;owner;status*|frozen;order_id|frozen'),
 movements:F('lot_id*|frozen;kind*|frozen;quantity_change*|frozen;occurred_on*|frozen;by|frozen;via|frozen;note|frozen'),
 requests:F('item_id|frozen;item_name|frozen;new_item_name|frozen;quantity*|number;program_id|frozen;urgency|select||URG;estimated_amount|number|Estimated amount;requested_by*|frozen;requested_on*|frozen;status*|frozen;approved_1_by|frozen;approved_2_by|frozen;decision_on|frozen;reject_reason|frozen;order_id|frozen;note|longtext'),
 orders:F('supplier_id*|frozen;order_number||Order number;ordered_by*|frozen;ordered_on*|frozen;expected_on|date|Expected on;amount|number;currency|select||CUR;status*|frozen;request_ids|frozen;notes|longtext')
};
const ROLE_LABEL={organizations:'supplier',programs:'program',agreements:'agreement',settings:'settings',categories:'category',locations:'location',items:'item',lots:'lot',movements:'movement',requests:'request',orders:'order'};
const ROLE_KEY={organizations:'organizations',programs:'programs',agreements:'agreements',settings:'labinventory.settings',categories:'labinventory.categories',locations:'labinventory.locations',items:'labinventory.items',lots:'labinventory.lots',movements:'labinventory.movements',requests:'labinventory.requests',orders:'labinventory.orders'};

let mapping={};try{mapping=JSON.parse(cfg.tableMap||'{}');}catch(e){mapping={};}
const roleMap={};
for(const role of Object.keys(S)){
 const m=mapping[ROLE_KEY[role]],b=m&&bindings.find(x=>x.typeId===m.typeId);
 if(!m||!b)continue;
 const fields={};for(const f of S[role]){const k=m.fields&&m.fields[f.key]!==undefined?m.fields[f.key]:f.key;if(typeof k==='string'&&(b.fields||[]).includes(k))fields[f.key]=k;}
 roleMap[role]={typeId:m.typeId,fields,writable:(Array.isArray(m.writableFields)?m.writableFields:[]).filter(x=>fields[x])};
}
/* Programs and agreements are read here (another app keeps them); this app never writes them. */
for(const role of ['programs','agreements'])if(roleMap[role])roleMap[role].writable=[];
const canWrite=role=>!!inp.saved&&!!inp.writable&&cfg.readOnly!==true&&!!roleMap[role]&&roleMap[role].writable.length>0;
const WR=!!inp.saved&&!!inp.writable&&cfg.readOnly!==true;

const PAGE=100,MAX_PAGES=8;let callsLeft=90;const cache={};
function readRole(role){
 if(cache[role])return cache[role];const m=roleMap[role];
 if(!m)return cache[role]={rows:[],allRows:[],complete:false,unbound:true,unavailable:false,total:0,truncated:false,invalid:0};
 const rows=[];let offset=0,total=null,complete=false,unavailable=false,truncated=false,invalid=0;
 /* Movements are read newest first: if a lab has more than the read budget, the oldest history is the part left out. */
 const sort=role==='movements'&&m.fields.occurred_on?{sort:{field:m.fields.occurred_on,direction:'desc'}}:{};
 for(let page=0;page<MAX_PAGES;page++){
  if(callsLeft<=0){truncated=true;break;}callsLeft--;
  let p;try{p=tools.call('records.read',{typeId:m.typeId,limit:PAGE,offset,filters:{},...sort});}catch(e){unavailable=true;break;}
  if(!p||p.unavailable){unavailable=true;break;}
  const chunk=Array.isArray(p.rows)?p.rows:[];total=p.total===null||p.total===undefined||!Number.isFinite(Number(p.total))?null:Number(p.total);
  for(const r of chunk){const data={};for(const [logical,real] of Object.entries(m.fields))if(has(r.data,real)){const v=r.data[real];if(v!==null&&typeof v==='object'){invalid++;continue;}data[logical]=v;}rows.push({id:String(r.id),version:r.version,data});}
  offset+=chunk.length;
  if(total!==null&&offset>=total){complete=true;break;}
  if(chunk.length<PAGE)break;
  if(page===MAX_PAGES-1)truncated=true;
 }
 return cache[role]={rows:rows.filter(r=>!bool(r.data.archived)),allRows:rows,total:total===null?rows.length:total,complete,unavailable,unbound:false,truncated,invalid};
}

const SCREENS=templateLayoutSchema.screens;
const NAV_IDS=['overview','inventory','requests','orders','locations','settings'];
const DESC={overview:'What needs attention: alerts, suggested reorders, your requests and this month\'s spend.',inventory:'Every item and lot with stock, expiry and location. Record use, count and move.',requests:'Ask for an item, see what is already in stock, approve or reject, and follow the status.',orders:'Approved requests to order by supplier, logged orders, receiving and late orders. Orders are placed with the supplier as usual.',locations:'Rooms, storage units and shelves or boxes, their contents and QR labels.',settings:'Spend, waste and stock value reports, categories and units, approvals, alerts and the digest.',item:'Scan, use, count or request more.'};
const st=JSON.parse(JSON.stringify(inp.state||{}));
{
 let profile={};try{profile=JSON.parse(cfg.layoutProfile||'{}');}catch(e){profile={};}
 const groups=templateLayoutSchema.groups;
 const tabs=Array.isArray(profile.tabs)?profile.tabs.filter(id=>SCREENS.some(s=>s.id===id)):[];
 const cols={};for(const g of Object.keys(groups)){const ids=groups[g].map(x=>x.id),saved=profile.cols&&Array.isArray(profile.cols[g])?profile.cols[g].filter(k=>ids.includes(k)):[];cols[g]=[...new Set(saved.concat(ids))];}
 st.layout={tabs:[...new Set(tabs.concat(SCREENS.map(s=>s.id)))],cols,visible:profile.visible&&typeof profile.visible==='object'?profile.visible:{},heading:String(profile.heading||cfg.heading||'Lab Inventory').slice(0,100)};
}
st.section=String(st.section||'overview');st.page=Math.max(0,Number(st.page)||0);st.query=String(st.query||'');st.filters=st.filters&&typeof st.filters==='object'?st.filters:{};st.f=st.f&&typeof st.f==='object'?st.f:{};st.me=textOf(st.me,120);
const note=v=>{st.notice=String(v||'').slice(0,600);};
if(event.kind==='open'&&/Prepared for TrialAgents review/i.test(String(st.notice||'')))st.notice='';
/* QR links open the item page (path /item) or a location (path /locations) with the record ID. */
const route=inp.route&&typeof inp.route==='object'?inp.route:null;
if(route&&event.kind==='open'&&!st.routed){st.routed=true;const p=String(route.path||'');if(p==='/item'&&route.recordId){st.section='item';st.itemId=String(route.recordId);st.via='qr';}else if(p==='/locations'&&route.recordId){st.section='locations';st.locId=String(route.recordId);}}
const screenLabel=id=>{const s=SCREENS.find(x=>x.id===id);return s?s.label:id;};
const sections=st.layout.tabs.filter(id=>NAV_IDS.includes(id)).map(id=>SCREENS.find(s=>s.id===id)).filter(s=>s&&st.layout.visible[s.id]!==false);
if(st.section!=='item'&&!sections.some(s=>s.id===st.section))st.section=(sections[0]||SCREENS[0]).id;
const colVisible=(g,id)=>st.layout.visible[g+'.'+id]!==false;
const cols=g=>st.layout.cols[g].filter(id=>colVisible(g,id));
const draftOf=name=>st.f[name]&&typeof st.f[name]==='object'?st.f[name]:(st.f[name]={});

const ROLES=Object.keys(S);const R={};for(const role of ROLES)R[role]=readRole(role);
/* Required for correct stock, approvals and orders; programs and agreements are optional (rule 3: features hide without them). */
const CORE=['settings','categories','locations','items','lots','requests','orders','organizations'];
const readProblems=[];
for(const role of CORE.concat(['movements'])){const r=R[role],n=cap(ROLE_LABEL[role]);
 if(r.unbound)readProblems.push(n+' table is not connected to this app.');else if(r.unavailable)readProblems.push(n+' records could not be read.');else if(r.truncated||!r.complete&&r.rows.length<r.total)readProblems.push('Only part of the '+ROLE_LABEL[role]+' records was read.');
 if(r.invalid)readProblems.push(plural(r.invalid,'value')+' in '+ROLE_LABEL[role]+' records could not be read.');}
/* Movement history beyond the read budget only shortens usage history; it never blocks writes (movements are append-only). */
const movementsPartial=R.movements.unbound||R.movements.unavailable||R.movements.truncated||!R.movements.complete&&R.movements.rows.length<R.movements.total;
const coreProblems=readProblems.filter(p=>!/movement/i.test(p));
const exact=!coreProblems.length;
const rowsOf=role=>R[role].rows.map(r=>({id:r.id,version:r.version,...r.data}));
const byId=xs=>Object.fromEntries(xs.map(x=>[x.id,x]));
const AS_OF=validDate(cfg.asOfOverride)||new Date().toISOString().slice(0,10);
const ORGS=rowsOf('organizations'),ORG=byId(ORGS),PROGRAMS=rowsOf('programs'),PROGRAM=byId(PROGRAMS),AGREEMENTS=rowsOf('agreements');
const CATS=rowsOf('categories'),CAT=byId(rowsOf('categories')),ALLCAT=byId(R.categories.allRows.map(r=>({id:r.id,...r.data})));
const LOCS=rowsOf('locations'),LOC=byId(LOCS),ALLLOC=byId(R.locations.allRows.map(r=>({id:r.id,...r.data})));
const ITEMS=rowsOf('items'),ITEM=byId(ITEMS),ALLITEM=byId(R.items.allRows.map(r=>({id:r.id,...r.data})));
const LOTSR=rowsOf('lots'),LOT=byId(LOTSR),MOVES=rowsOf('movements'),REQS=rowsOf('requests'),REQ=byId(REQS),ORDERS=rowsOf('orders'),ORDER=byId(ORDERS);
const settingsRow=R.settings.rows[0]||null;const SET=settingsRow?settingsRow.data:{};
const CURRENCY=CUR.includes(SET.currency)?SET.currency:'EUR';
const THRESHOLD=num(SET.threshold_amount);
const WINDOW=Math.max(1,Math.min(365,Math.round(num(SET.expiry_window_days,30))));
const APPROVER=textOf(SET.approver,120),SECOND=textOf(SET.second_approver,120);
const PROGRAM_APPROVERS=(()=>{const x=parseJSON(SET.program_approvers)||{};const o={};for(const [k,v] of Object.entries(x))if(textOf(v,120))o[k]=textOf(v,120);return o;})();
const CADENCE=CAD.includes(SET.digest_cadence)?SET.digest_cadence:'weekly',DDAY=DAYS.includes(SET.digest_day)?SET.digest_day:'mon',DTIME=/^([01]\d|2[0-3]):[0-5]\d$/.test(String(SET.digest_time||''))?SET.digest_time:'08:00';
const DTEXT=textOf(SET.digest_text,2000)||DEFAULT_DIGEST_TEXT;
const UNITS=[...new Set(list(SET.units).map(u=>u.slice(0,30)).concat(settingsRow&&list(SET.units).length?[]:STANDARD_UNITS))];
const APP_LINK=(()=>{const m=/^(https:\/\/[A-Za-z0-9.-]+(?::\d+)?)\/apps\/([0-9a-f-]{36})(?:\/[A-Za-z0-9_\/-]*)?\?(?:[^#]*&)?workspaceId=([0-9a-f-]{36})(?:&|#|$)/i.exec(String(SET.app_link||'').trim());return m?{origin:m[1],app:m[2],workspace:m[3]}:null;})();
const linkFor=(path,id)=>APP_LINK?APP_LINK.origin+'/apps/'+APP_LINK.app+path+'?workspaceId='+APP_LINK.workspace+'&recordId='+id:'';

const orgName=id=>ORG[id]?String(ORG[id].name||'Unnamed'):'';
const progName=id=>PROGRAM[id]?String(PROGRAM[id].name||PROGRAM[id].code||'Unnamed'):'';
const catName=id=>ALLCAT[id]?String(ALLCAT[id].name||'Unnamed'):'—';
function locPath(id){const out=[];let cur=ALLLOC[id],guard=0;while(cur&&guard++<8){out.unshift(String(cur.name||'Unnamed'));cur=cur.parent_id?ALLLOC[cur.parent_id]:null;}return out.join(' › ')||'—';}
const locName=id=>ALLLOC[id]?String(ALLLOC[id].name||'Unnamed'):'—';
const itemName=id=>ALLITEM[id]?String(ALLITEM[id].name||'Unnamed'):'';
const reqItemName=r=>itemName(r.item_id)||textOf(r.item_name)||textOf(r.new_item_name)||'Unnamed item';
const unitOf=it=>textOf(it&&it.unit,30)||'unit';
const units=(n,it)=>{const u=unitOf(it);n=num(n,0);return qty(n)+' '+(Math.abs(n)===1?u:(u==='box'?'boxes':/(s|each)$/.test(u)?u:u+'s'));};

/* Stock (§7): sum of in_stock lot quantities; earliest-expiring lot first (no expiry last), then oldest receipt. */
const lotsOf=itemId=>LOTSR.filter(l=>l.item_id===itemId);
const inStock=l=>l.status==='in_stock'&&num(l.quantity,0)>0;
const lotOrder=(a,b)=>(validDate(a.expires_on)||'9999')<(validDate(b.expires_on)||'9999')?-1:(validDate(a.expires_on)||'9999')>(validDate(b.expires_on)||'9999')?1:String(a.received_on||'').localeCompare(String(b.received_on||''));
const liveLots=itemId=>lotsOf(itemId).filter(inStock).sort(lotOrder);
const stockOf=itemId=>round2(lotsOf(itemId).filter(l=>l.status==='in_stock').reduce((n,l)=>n+Math.max(0,num(l.quantity,0)),0));
const isExpired=l=>l.status==='in_stock'&&num(l.quantity,0)>0&&!!validDate(l.expires_on)&&validDate(l.expires_on)<AS_OF;
const isExpiring=l=>l.status==='in_stock'&&num(l.quantity,0)>0&&!!validDate(l.expires_on)&&validDate(l.expires_on)>=AS_OF&&diffDays(AS_OF,validDate(l.expires_on))<=WINDOW;
const isLow=it=>num(it.reorder_point)!==null&&stockOf(it.id)<=num(it.reorder_point);
const suggestedLot=itemId=>liveLots(itemId).filter(l=>!isExpired(l))[0]||liveLots(itemId)[0]||null;
const lotMoves=lotId=>MOVES.filter(m=>m.lot_id===lotId);
const itemMoves=itemId=>{const ids=new Set(lotsOf(itemId).map(l=>l.id));return MOVES.filter(m=>ids.has(m.lot_id)).sort((a,b)=>String(b.occurred_on).localeCompare(String(a.occurred_on)));};
/* Lots without any movement: created by receiving or "Add lot"; their received movement follows in the next review. */
const unrecorded=LOTSR.filter(l=>!lotMoves(l.id).length&&num(l.quantity,0)>0);

/* Reorder (§7): reorder_quantity if set, else average daily use over the last 90 days × (lead time + 14 days), rounded up. */
function usedLast90(itemId){const from=addDays(AS_OF,-89);return itemMoves(itemId).filter(m=>m.kind==='used'&&validDate(m.occurred_on)&&m.occurred_on>=from&&m.occurred_on<=AS_OF).reduce((n,m)=>n+Math.abs(num(m.quantity_change,0)),0);}
function suggestion(it){
 if(num(it.reorder_quantity)!==null&&num(it.reorder_quantity)>0)return {qty:Math.ceil(num(it.reorder_quantity)),basis:'usual order quantity'};
 const used=usedLast90(it.id);if(!used)return null;
 const days=Math.max(0,num(it.lead_time_days,0))+14;return {qty:Math.max(1,Math.ceil(used/90*days-1e-9)),basis:'average use '+qty(round2(used/90))+' a day × '+days+' days (lead time + 14)'};}
const OPEN_REQ=['requested','approved','ordered'];
const openRequestsFor=itemId=>REQS.filter(r=>r.item_id===itemId&&OPEN_REQ.includes(r.status));
const reorders=ITEMS.filter(isLow).map(it=>({item:it,stock:stockOf(it.id),s:suggestion(it),open:openRequestsFor(it.id)})).sort((a,b)=>a.stock-num(a.item.reorder_point,0)-(b.stock-num(b.item.reorder_point,0))||String(a.item.name).localeCompare(String(b.item.name)));

/* Approvals (§7): program approver replaces the default approver; second approval above the threshold; never the requester. */
const needsSecond=r=>THRESHOLD!==null&&THRESHOLD>=0&&num(r.estimated_amount)!==null&&num(r.estimated_amount)>THRESHOLD;
function firstApprover(r){const c=[PROGRAM_APPROVERS[r.program_id],APPROVER,SECOND].filter(Boolean);return c.find(n=>!same(n,r.requested_by))||'';}
function secondApprover(r){const c=[SECOND,APPROVER,PROGRAM_APPROVERS[r.program_id]].filter(Boolean);return c.find(n=>!same(n,r.requested_by)&&!same(n,r.approved_1_by))||'';}
/* The step a request is waiting for: 1, 2 or none. An "approved" status without its approvals is invalid and cannot be ordered. */
function approvalState(r){
 if(r.status==='requested')return r.approved_1_by?{step:2,who:secondApprover(r)}:{step:1,who:firstApprover(r)};
 if(['approved','ordered','received'].includes(r.status)){const ok=!!r.approved_1_by&&!same(r.approved_1_by,r.requested_by)&&(!needsSecond(r)||!!r.approved_2_by&&!same(r.approved_2_by,r.requested_by)&&!same(r.approved_2_by,r.approved_1_by));return {step:0,valid:ok};}
 return {step:0,valid:true};}
const waiting=REQS.filter(r=>r.status==='requested');
const invalidApproved=REQS.filter(r=>['approved','ordered'].includes(r.status)&&!approvalState(r).valid);

/* Orders: requests linked through order.request_ids (the order is the source of truth). */
const orderOfReq=r=>ORDERS.find(o=>list(o.request_ids).includes(r.id))||ORDER[r.order_id]||null;
const reqsOfOrder=o=>list(o.request_ids).map(id=>REQ[id]).filter(Boolean);
const receivedFor=(o,itemId)=>LOTSR.filter(l=>l.order_id===o.id&&l.item_id===itemId).reduce((n,l)=>{const rec=lotMoves(l.id).filter(m=>m.kind==='received').reduce((s,m)=>s+num(m.quantity_change,0),0);return n+(rec||num(l.quantity,0)+lotMoves(l.id).filter(m=>m.kind!=='received').reduce((s,m)=>s-num(m.quantity_change,0),0));},0);
const lateOrders=ORDERS.filter(o=>['ordered','partially_received'].includes(o.status)&&validDate(o.expected_on)&&o.expected_on<AS_OF);
const toOrder=REQS.filter(r=>r.status==='approved'&&!orderOfReq(r)&&approvalState(r).valid);
const supplierOfReq=r=>{const it=ALLITEM[r.item_id];return it&&it.supplier_id&&ORG[it.supplier_id]?it.supplier_id:'';};

/* Spend (§7): order amounts by ordered month, supplier and program; an order grouping several requests is split by request
 * (estimated amount, else equally). Amounts in another currency than the settings currency are listed apart, never summed. */
function spendRows(){const out=[];for(const o of ORDERS.filter(o=>o.status!=='cancelled'&&num(o.amount)!==null&&validDate(o.ordered_on))){
 const rs=reqsOfOrder(o),w=rs.map(r=>num(r.estimated_amount,0)),tw=w.reduce((a,b)=>a+b,0),cur=CUR.includes(o.currency)?o.currency:CURRENCY;
 if(!rs.length)out.push({order:o,month:o.ordered_on.slice(0,7),supplier:o.supplier_id,program:'',amount:num(o.amount),currency:cur});
 else rs.forEach((r,i)=>out.push({order:o,month:o.ordered_on.slice(0,7),supplier:o.supplier_id,program:r.program_id||'',amount:num(o.amount)*(tw>0?w[i]/tw:1/rs.length),currency:cur}));}
 return out;}
const SPEND=spendRows();
const sumBy=(rows,key)=>{const m={};for(const r of rows){const k=r[key]||'';m[k]=(m[k]||0)+r.amount;}return Object.entries(m).sort((a,b)=>b[1]-a[1]);};
/* Waste (§7): discarded or expired quantity × last price, per month. */
function wasteRows(){const out=[];for(const m of MOVES.filter(m=>m.kind==='discarded'&&validDate(m.occurred_on))){const l=LOT[m.lot_id],it=l&&ALLITEM[l.item_id];if(!it)continue;out.push({month:m.occurred_on.slice(0,7),item:it,qty:Math.abs(num(m.quantity_change,0)),value:num(it.last_price)===null?null:Math.abs(num(m.quantity_change,0))*num(it.last_price),currency:CUR.includes(it.currency)?it.currency:CURRENCY,kind:'discarded'});}
 for(const l of LOTSR.filter(l=>isExpired(l)||l.status==='expired'&&num(l.quantity,0)>0)){const it=ALLITEM[l.item_id];if(!it)continue;out.push({month:validDate(l.expires_on)?l.expires_on.slice(0,7):AS_OF.slice(0,7),item:it,qty:num(l.quantity,0),value:num(it.last_price)===null?null:num(l.quantity,0)*num(it.last_price),currency:CUR.includes(it.currency)?it.currency:CURRENCY,kind:'expired'});}
 return out;}
/* Stock value (§7): in-stock quantity × last price, per currency. */
function stockValue(){const by={},missing=[];for(const it of ITEMS){const s=stockOf(it.id);if(!s)continue;if(num(it.last_price)===null){missing.push(it);continue;}const c=CUR.includes(it.currency)?it.currency:CURRENCY;by[c]=(by[c]||0)+s*num(it.last_price);}return {by,missing};}

const expiring=LOTSR.filter(isExpiring).sort(lotOrder),expired=LOTSR.filter(isExpired).sort(lotOrder);
const lowItems=ITEMS.filter(isLow);

/* Digest (§9): concise, at most 3 lines per section, empty sections omitted. The weekly automation sends exactly this text. */
function digest(){const S2=[],line=(xs,f)=>{const shown=xs.slice(0,3).map(f);if(xs.length>3)shown[2]+=' · and '+(xs.length-3)+' more';return shown;};
 if(lowItems.length)S2.push(['Low stock ('+lowItems.length+')',line(lowItems,it=>it.name+': '+units(stockOf(it.id),it)+' left, reorder at '+qty(it.reorder_point))]);
 const sugg=reorders.filter(x=>x.s&&!x.open.length);if(sugg.length)S2.push(['Suggested reorders ('+sugg.length+')',line(sugg,x=>x.item.name+': order '+units(x.s.qty,x.item))]);
 if(expiring.length)S2.push(['Expiring in '+WINDOW+' days ('+expiring.length+')',line(expiring,l=>itemName(l.item_id)+(l.lot_number?' lot '+l.lot_number:'')+', '+dateLabel(l.expires_on)+', '+locPath(l.location_id).split(' › ').slice(-2).join(' › '))]);
 if(expired.length)S2.push(['Expired, still in stock ('+expired.length+')',line(expired,l=>itemName(l.item_id)+(l.lot_number?' lot '+l.lot_number:'')+', expired '+dateLabel(l.expires_on))]);
 if(waiting.length)S2.push(['Approvals waiting ('+waiting.length+')',line(waiting,r=>reqItemName(r)+' × '+qty(r.quantity)+' for '+(r.requested_by||'—')+(approvalState(r).who?', waiting for '+approvalState(r).who:''))]);
 if(lateOrders.length)S2.push(['Late orders ('+lateOrders.length+')',line(lateOrders,o=>(orgName(o.supplier_id)||'Supplier')+(o.order_number?' '+o.order_number:'')+', expected '+dateLabel(o.expected_on))]);
 const period=CADENCE==='daily'?dateLabel(AS_OF):CADENCE==='monthly'?monthLabel(AS_OF):'week of '+dateLabel(addDays(AS_OF,-((weekday(AS_OF)+6)%7)));
 const subject='Lab Inventory · '+(S2.length?S2.map(s=>s[0].replace(/ \((\d+)\)$/,': $1').replace(/^Expiring in \d+ days/,'Expiring').replace(/^Expired, still in stock/,'Expired').toLowerCase()).join(' · '):'nothing needs attention');
 const text=S2.length?[subject+' ('+period+')',DTEXT,''].concat(S2.flatMap(([h,ls])=>[h].concat(ls.map(l=>'- '+l)).concat(['']))).concat(['Open Lab Inventory → Overview']).join('\n'):[subject+' ('+period+')','Nothing needs attention: no low stock, expiring or expired lots, approvals or late orders.'].join('\n');
 return {subject,text,sections:S2.length,empty:!S2.length};}
function nextDigest(){const dIdx=(DAYS.indexOf(DDAY)+1)%7;let d=AS_OF;
 if(CADENCE==='daily')return d;
 if(CADENCE==='weekly'){while(weekday(d)!==dIdx)d=addDays(d,1);return d;}
 const first=AS_OF.slice(0,8)+'01';return AS_OF===first?first:addDays(first.slice(0,7)+'-28',7).slice(0,8)+'01';}

/* Writes: every record change is one exact records.propose (at most 50 per review). */
function toReal(role,data){const m=roleMap[role];if(!m)throw Error('The '+ROLE_LABEL[role]+' table is not connected.');const out={};for(const [k,v] of Object.entries(data)){if(v===undefined)continue;if(!m.fields[k])continue;if(!m.writable.includes(k))throw Error('You cannot edit '+k.replace(/_/g,' ')+' in the '+ROLE_LABEL[role]+' table.');out[m.fields[k]]=v;}return out;}
const crt=(role,data)=>{if(!canWrite(role))throw Error('You cannot add a '+ROLE_LABEL[role]+' here.');return {kind:'create_record',typeId:roleMap[role].typeId,data:toReal(role,data)};};
const ROW=(role,x)=>x?R[role].allRows.find(r=>r.id===x.id)||null:null;
const upd=(role,x,data,version)=>{const row=ROW(role,x);if(!row)throw Error('That '+ROLE_LABEL[role]+' is no longer available.');if(!canWrite(role))throw Error('You cannot change this '+ROLE_LABEL[role]+'.');return {kind:'update_record',recordId:row.id,expectedVersion:version===undefined||version===null?row.version:version,data:toReal(role,data)};};
function propose(changes,message){changes=changes.filter(Boolean);if(!changes.length)throw Error('There is nothing to save.');if(changes.length>50)throw Error('This change needs '+changes.length+' record writes; one review holds 50. Save it in smaller parts.');tools.call('records.propose',changes);note(message||'Prepared for TrialAgents review. Nothing changes until you approve it.');}
function closeAll(){st.editor=null;st.panel=null;}
const lookup=(role,id)=>R[role].allRows.find(r=>r.id===id)||null;
const me=()=>{const n=textOf(st.me,120);if(!n)throw Error('Enter your name first (top of the screen). It is recorded on requests and use.');return n;};
const via=()=>st.section==='item'&&st.via==='qr'?'qr':'app';

/* Movements: one per quantity change, in the same review as the lot change. */
const mv=(lot,kind,change,noteText)=>crt('movements',{lot_id:lot.id,kind,quantity_change:round2(change),occurred_on:AS_OF,by:textOf(st.me,120)||null,via:via(),note:noteText?textOf(noteText,300):null});
function useLot(lot,amount,kind,noteText){if(!lot)throw Error('There is no lot in stock to use.');const q=num(lot.quantity,0);if(lot.status!=='in_stock'||q<=0)throw Error('This lot is not in stock.');
 const take=kind==='up'?q:Math.min(q,amount);const left=round2(q-take);
 return [upd('lots',lot,{quantity:left,status:left<=0?'used_up':'in_stock'}),mv(lot,'used',-take,kind==='up'?'Used up':null)];}

const editable=role=>S[role].filter(f=>f.kind!=='frozen'&&f.key!=='archived'&&roleMap[role]&&roleMap[role].fields[f.key]);
function openEditor(role,mode,id,preset){closeAll();let draft={...(preset||{})},version=null;
 if(mode!=='create'){const r=lookup(role,id);if(!r)throw Error('That record is no longer available.');draft={...r.data};version=r.version;}
 st.editor={role,mode,id:mode==='edit'?id:null,version,draft,fixed:mode==='create'&&preset&&preset.__fixed?preset.__fixed:{}};delete st.editor.draft.__fixed;}
function valuesFromForm(role,source){const out={};
 for(const f of editable(role)){if(!has(source,f.key)&&f.kind!=='boolean')continue;let v=source[f.key];
  if(f.kind==='boolean'){out[f.key]=bool(v);continue;}
  if(v===null||v===undefined||String(v).trim()===''){if(f.required)throw Error(f.label+' is required.');out[f.key]=null;continue;}
  v=String(v).trim();
  if(f.kind==='number'){const n=num(v);if(n===null||n<0)throw Error(f.label+' must be a number of 0 or more.');out[f.key]=n;}
  else if(f.kind==='date'){if(!validDate(v))throw Error(f.label+' must be a date.');out[f.key]=v;}
  else if(f.kind==='select'){if(!f.options.includes(v))throw Error('Choose a valid '+f.label.toLowerCase()+'.');out[f.key]=v;}
  else if(f.kind==='ref'){if(!R[f.ref].rows.some(r=>r.id===v))throw Error('Choose an existing '+f.label.toLowerCase()+'.');out[f.key]=v;}
  else out[f.key]=v.slice(0,f.kind==='longtext'?5000:300);}
 return out;}
const requestNumber=(r)=>{const n=num(r,null);if(n===null||n<=0)throw Error('Enter a quantity above 0.');return round2(n);};

let failed=false;
try{
 if(action.startsWith('nav:')){const to=action.slice(4);if(NAV_IDS.includes(to)||to==='item'){st.section=to;st.page=0;st.query='';closeAll();if(to!=='item')st.via='';}}
 else if(action==='clear-notice')note('');
 else if(action==='close'){closeAll();st.labels=null;}
 else if(action==='me'&&event.kind==='change')st.me=textOf(event.value,120);
 else if(action==='query'&&event.kind==='change'){st.query=String(event.value||'').slice(0,100);st.page=0;}
 else if(action.startsWith('filter:')&&event.kind==='change'){st.filters[action.slice(7)]=String(event.value||'');st.page=0;}
 else if(action.startsWith('f:')&&event.kind==='change'){const [,fname,field]=action.split(':');if(fname&&field){const d=draftOf(fname);d[field]=event.value;}}
 else if(action.startsWith('draft:')&&event.kind==='change'&&st.editor)st.editor.draft[action.slice(6)]=event.value;
 else if(action==='next-page')st.page++;else if(action==='prev-page')st.page=Math.max(0,st.page-1);
 else if(action.startsWith('open-item:')){const id=action.slice(10);if(ITEM[id]){st.section='item';st.itemId=id;st.via='';closeAll();}}
 else if(action.startsWith('open-loc:')){const id=action.slice(9);if(LOC[id]){st.section='locations';st.locId=id;closeAll();}}
 else if(action.startsWith('panel:')){const [,type,id]=action.split(':');closeAll();st.panel={type,id:id||''};st.f[type]={};}
 else if(action.startsWith('labels:')){const [,kind,id]=action.split(':');st.labels={kind:kind==='locations'?'locations':'items',ids:id?[id]:[],paper:st.labels&&st.labels.paper||'a4',sheet:0};closeAll();}
 else if(action==='labels-paper'&&event.kind==='change'){if(st.labels)st.labels.paper=event.value==='letter'?'letter':'a4';}
 else if(action==='labels-next'){if(st.labels)st.labels.sheet=(st.labels.sheet||0)+1;}else if(action==='labels-prev'){if(st.labels)st.labels.sheet=Math.max(0,(st.labels.sheet||0)-1);}
 else if(action==='make-labels'&&event.kind==='submit'){const d={...form},kind=st.labels&&st.labels.kind==='locations'?'locations':'items',pool=kind==='locations'?LOCS:ITEMS;st.labels={kind,ids:pool.filter(x=>bool(d['x_'+x.id])).map(x=>x.id).slice(0,63),paper:d.paper==='letter'?'letter':'a4',sheet:0};if(!st.labels.ids.length)throw Error('Choose at least one '+(kind==='locations'?'location':'item')+'.');}
 else if(isAct&&!exact)throw Error('Some records could not be read completely, so changes are disabled to avoid overwriting data. '+coreProblems[0]);
 else if(action.startsWith('edit:')){const [,role,id]=action.split(':');openEditor(role,'edit',id);}
 else if(action.startsWith('add:')){const [,role,ctx]=action.split(':');const preset={};
  if(role==='items'){if(!CATS.length)throw Error('Add the standard categories first (Reports & settings → Categories).');Object.assign(preset,{unit:UNITS[0]||'bottle',currency:CURRENCY});}
  if(role==='locations'){if(ctx&&LOC[ctx]){preset.parent_id=ctx;preset.kind=['room'].includes(LOC[ctx].kind)?'freezer':['freezer','fridge','cabinet','other'].includes(LOC[ctx].kind)?'shelf':'box';}else preset.kind='room';}
  if(role==='organizations')preset.org_type='other';
  openEditor(role,'create',null,preset);}
 else if(action==='save-record'&&event.kind==='submit'){const x=st.editor;if(!x)throw Error('The form is no longer open.');x.draft={...x.draft,...form};const role=x.role;
  const values={...valuesFromForm(role,x.draft),...x.fixed};
  if(role==='locations'&&values.parent_id&&x.id){let p=values.parent_id,g=0;while(p&&g++<10){if(p===x.id)throw Error('A location cannot be inside itself.');p=(ALLLOC[p]||{}).parent_id;}}
  if(role==='categories'&&CATS.some(c=>same(c.name,values.name)&&c.id!==x.id))throw Error('There is already a category with that name.');
  if(role==='items'&&x.mode==='create'){const dup=ITEMS.find(i=>same(i.name,values.name)&&(!values.catalog_number||same(i.catalog_number,values.catalog_number)));if(dup&&!bool(x.draft.confirm_duplicate))throw Error('"'+dup.name+'" is already in the catalog ('+units(stockOf(dup.id),dup)+' in stock). Tick "Add anyway" to add a second item.');}
  if(x.mode==='create')propose([crt(role,role==='categories'?{...values,standard:false,archived:false}:{...values,...(S[role].some(f=>f.key==='archived')?{archived:false}:{})})],'New '+ROLE_LABEL[role]+' prepared for TrialAgents review.');
  else{const r=lookup(role,x.id);const ch={};for(const [k,v] of Object.entries(values))if(JSON.stringify(r.data[k]===undefined?null:r.data[k])!==JSON.stringify(v))ch[k]=v;propose([upd(role,{id:r.id},ch,x.version)],'Changes prepared for TrialAgents review.');}
  closeAll();}
 else if(action.startsWith('archive:')){const [,role,id]=action.split(':'),r=lookup(role,id);if(!r)throw Error('That record is no longer available.');
  if(role==='locations'){const kids=LOCS.filter(l=>l.parent_id===id),lots=LOTSR.filter(l=>l.location_id===id&&inStock(l));if(kids.length||lots.length)throw Error('Only empty locations can be archived: '+(lots.length?plural(lots.length,'lot')+' in stock':'')+(kids.length&&lots.length?' and ':'')+(kids.length?plural(kids.length,'location')+' inside':'')+'.');}
  if(role==='categories'&&ALLCAT[id]&&bool(ALLCAT[id].standard))throw Error('Standard categories stay; archive only your own categories.');
  if(role==='categories'&&ITEMS.some(i=>i.category_id===id))throw Error('Move the items in this category first.');
  propose([upd(role,{id},{archived:true})],'Archive prepared for review. The record stays in the database.');}

 /* Usage: "Used one", "Used up", quick count, move, discard. */
 else if(action.startsWith('use-one:')||action.startsWith('use-up:')){const up=action.startsWith('use-up:'),id=action.slice(up?7:8);let lot=LOT[id];if(!lot&&ITEM[id])lot=suggestedLot(id);if(!lot)throw Error('There is no lot in stock to use.');me();const it=ALLITEM[lot.item_id];
  propose(useLot(lot,1,up?'up':'one'),(up?'"Used up"':'"Used one"')+' on '+(it?it.name:'the item')+(lot.lot_number?' lot '+lot.lot_number:'')+' prepared for review'+(up?'.':': '+units(Math.max(0,num(lot.quantity,0)-1),it)+' left in this lot.'));}
 else if(action==='save-count'&&event.kind==='submit'){const x=st.panel,lot=x&&LOT[x.id];if(!lot)throw Error('The lot is no longer available.');const d={...draftOf('count'),...form},n=num(d.quantity);if(n===null||n<0)throw Error('Enter the counted quantity (0 or more).');me();
  const diff=round2(n-num(lot.quantity,0));if(!diff&&lot.status==='in_stock')throw Error('The count matches the recorded quantity; nothing to change.');
  propose([upd('lots',lot,{quantity:round2(n),status:n>0?'in_stock':'used_up'}),mv(lot,'count',diff,textOf(d.note,300)||'Quick count')],'Count prepared for review: '+(diff>0?'+':'')+qty(diff)+' logged as the difference.');closeAll();}
 else if(action==='save-count-quick'&&event.kind==='submit'){const lot=suggestedLot(st.itemId);if(!lot)throw Error('There is no lot in stock to count.');const d={...draftOf('qcount'),...form},n=num(d.quantity);if(n===null||n<0)throw Error('Enter the counted quantity (0 or more).');me();const diff=round2(n-num(lot.quantity,0));if(!diff)throw Error('The count matches the recorded quantity; nothing to change.');
  propose([upd('lots',lot,{quantity:round2(n),status:n>0?'in_stock':'used_up'}),mv(lot,'count',diff,'Quick count')],'Count prepared for review: '+(diff>0?'+':'')+qty(diff)+' logged as the difference.');st.f.qcount={};}
 else if(action==='save-move'&&event.kind==='submit'){const x=st.panel,lot=x&&LOT[x.id];if(!lot)throw Error('The lot is no longer available.');const d={...draftOf('move'),...form};if(!LOC[d.location_id])throw Error('Choose the new location.');if(d.location_id===lot.location_id)throw Error('The lot is already there.');me();
  propose([upd('lots',lot,{location_id:d.location_id}),mv(lot,'moved',0,'From '+locPath(lot.location_id)+' to '+locPath(d.location_id))],'Move prepared for review.');closeAll();}
 else if(action.startsWith('discard:')){const lot=LOT[action.slice(8)];if(!lot)throw Error('The lot is no longer available.');me();const q=num(lot.quantity,0);
  propose([upd('lots',lot,{quantity:0,status:'discarded'}),mv(lot,'discarded',-q,isExpired(lot)?'Expired':'Discarded')],'Discarding prepared for review; '+qty(q)+' counted as waste.');}
 else if(action==='save-lot'&&event.kind==='submit'){const x=st.panel,it=x&&ITEM[x.id];if(!it)throw Error('The item is no longer available.');const d={...draftOf('lot'),...form},n=num(d.quantity);if(n===null||n<=0)throw Error('Enter the quantity received.');if(!LOC[d.location_id])throw Error('Choose a location.');if(d.expires_on&&!validDate(d.expires_on))throw Error('Expiry must be a date.');
  propose([crt('lots',{item_id:it.id,lot_number:textOf(d.lot_number,80)||null,quantity:round2(n),received_on:validDate(d.received_on)||AS_OF,expires_on:validDate(d.expires_on)||null,location_id:d.location_id,owner:textOf(d.owner,120)||null,status:'in_stock'})],'New lot prepared for review. Then record its received movement (one click).');closeAll();}
 else if(action==='record-receipts'){const ls=unrecorded.slice(0,50);if(!ls.length)throw Error('Every lot has its movements.');
  propose(ls.map(l=>crt('movements',{lot_id:l.id,kind:'received',quantity_change:round2(num(l.quantity,0)),occurred_on:validDate(l.received_on)||AS_OF,by:textOf(st.me,120)||null,via:'app',note:l.order_id&&ORDER[l.order_id]?'Order '+(ORDER[l.order_id].order_number||''):'Received'})),plural(ls.length,'received movement')+' prepared for review.');}

 /* Requests */
 else if(action==='save-request'&&event.kind==='submit'){const d={...draftOf('request'),...form},who=me(),q=requestNumber(d.quantity),it=ITEM[d.item_id];
  if(!it&&!textOf(d.new_item_name))throw Error('Choose an item, or describe a new one.');
  if(d.program_id&&!PROGRAM[d.program_id])throw Error('Choose an existing program.');
  const amount=d.estimated_amount!==undefined&&String(d.estimated_amount).trim()!==''?num(d.estimated_amount):it&&num(it.last_price)!==null?round2(num(it.last_price)*q):null;if(amount!==null&&(amount<0||!Number.isFinite(amount)))throw Error('The estimated amount must be 0 or more.');
  const prog=d.program_id||it&&it.program_id&&PROGRAM[it.program_id]&&it.program_id||null;
  propose([crt('requests',{item_id:it?it.id:null,item_name:it?textOf(it.name,200):textOf(d.new_item_name,200),new_item_name:it?null:textOf(d.new_item_name,200),quantity:q,program_id:prog,urgency:URG.includes(d.urgency)?d.urgency:'normal',estimated_amount:amount,requested_by:who,requested_on:AS_OF,status:'requested',note:textOf(d.note,2000)||null})],'Request prepared for review. After you approve it, '+(firstApprover({program_id:prog,requested_by:who})||'the approver')+' sees it in the queue'+(amount!==null&&THRESHOLD!==null&&amount>THRESHOLD?'; above '+money(THRESHOLD,CURRENCY)+' it also needs '+(SECOND||'a second approver'):'')+'.');closeAll();}
 else if(action.startsWith('reorder:')){const it=ITEM[action.slice(8)];if(!it)throw Error('Item not found.');const who=me(),s=suggestion(it);if(!s)throw Error('No suggestion: there is no usage history and no usual order quantity for this item.');if(openRequestsFor(it.id).length)throw Error('There is already an open request for '+it.name+'.');
  propose([crt('requests',{item_id:it.id,item_name:textOf(it.name,200),new_item_name:null,quantity:s.qty,program_id:it.program_id&&PROGRAM[it.program_id]?it.program_id:null,urgency:'normal',estimated_amount:num(it.last_price)!==null?round2(num(it.last_price)*s.qty):null,requested_by:who,requested_on:AS_OF,status:'requested',note:'Reorder suggestion: '+s.basis})],'Request for '+units(s.qty,it)+' of '+it.name+' prepared for review.');}
 else if(action==='decide'&&event.kind==='submit'){const x=st.panel,r=x&&REQ[x.id];if(!r)throw Error('The request is no longer available.');const d={...draftOf('decide'),...form},sv=String(event.value||d.step||''),step=['approve','reject','ask','cancel'].includes(sv)?sv:'approve',who=textOf(d.as||st.me,120);
  if(!who)throw Error('Choose who you are.');
  if(step==='cancel'){if(!same(who,r.requested_by))throw Error('Only the requester can cancel a request.');if(!['requested','approved'].includes(r.status))throw Error('Only open requests can be cancelled.');propose([upd('requests',r,{status:'cancelled',decision_on:AS_OF})],'Cancelling prepared for review.');closeAll();}
  else if(step==='ask'){const q=textOf(d.question,1000);if(!q)throw Error('Write the question.');propose([upd('requests',r,{note:((r.note?String(r.note)+'\n':'')+dateLabel(AS_OF)+' · '+who+': '+q).slice(-5000)})],'Question added to the request for review; the requester sees it on the request.');closeAll();}
  else{if(r.status!=='requested')throw Error('This request is not waiting for a decision.');if(same(who,r.requested_by))throw Error('The requester cannot approve or reject their own request.');const a=approvalState(r);
   if(!a.who)throw Error(a.step===2?'No second approver is set who is not the requester or the first approver. Set one in Reports & settings.':'No approver is set who is not the requester. Set the approver in Reports & settings.');
   if(!same(who,a.who))throw Error((a.step===2?'The second approval':'This approval')+' is for '+a.who+'.');
   if(step==='reject'){const why=textOf(d.reason,500);if(!why)throw Error('Give a reason for the rejection.');propose([upd('requests',r,{status:'rejected',reject_reason:why,decision_on:AS_OF})],'Rejection prepared for review; '+r.requested_by+' sees the reason.');}
   else if(a.step===1){const two=needsSecond(r);propose([upd('requests',r,two?{approved_1_by:who}:{approved_1_by:who,status:'approved',decision_on:AS_OF})],two?'First approval prepared for review. Above '+money(THRESHOLD,CURRENCY)+', '+(secondApprover({...r,approved_1_by:who})||'a second approver')+' approves next.':'Approval prepared for review.');}
   else propose([upd('requests',r,{approved_2_by:who,status:'approved',decision_on:AS_OF})],'Second approval prepared for review.');
   closeAll();}}

 /* Orders: log (several approved requests in one order) and receive (full or partial). */
 else if(action==='save-order'&&event.kind==='submit'){const d={...draftOf('order'),...form},who=me();const rs=toOrder.filter(r=>bool(d['r_'+r.id]));if(!rs.length)throw Error('Choose the approved requests in this order.');
  const sup=ORG[d.supplier_id]?d.supplier_id:'';if(!sup)throw Error('Choose the supplier (add it first if it is new).');if(!validDate(d.ordered_on||AS_OF))throw Error('Ordered on must be a date.');if(d.expected_on&&!validDate(d.expected_on))throw Error('Expected on must be a date.');
  const amount=String(d.amount===undefined?'':d.amount).trim()===''?null:num(d.amount);if(amount!==null&&amount<0)throw Error('The amount must be 0 or more.');
  propose([crt('orders',{supplier_id:sup,order_number:textOf(d.order_number,80)||null,ordered_by:who,ordered_on:validDate(d.ordered_on)||AS_OF,expected_on:validDate(d.expected_on)||null,amount,currency:CUR.includes(d.currency)?d.currency:CURRENCY,status:'ordered',request_ids:rs.map(r=>r.id).join(','),notes:textOf(d.notes,2000)||null})].concat(rs.map(r=>upd('requests',r,{status:'ordered'}))),'Order with '+plural(rs.length,'request')+' prepared for review. Nothing is sent to the supplier.');closeAll();}
 else if(action==='receive'&&event.kind==='submit'){const x=st.panel,o=x&&ORDER[x.id];if(!o)throw Error('The order is no longer available.');if(!['ordered','partially_received'].includes(o.status))throw Error('This order is '+label(o.status)+'.');const d={...draftOf('receive'),...form},rs=reqsOfOrder(o),ch=[],done={};let lots=0;
  for(const r of rs){const n=num(d['q_'+r.id]);if(n===null||n===0)continue;if(n<0)throw Error('Received quantities are 0 or more.');
   const itemId=r.item_id&&ITEM[r.item_id]?r.item_id:ITEM[d['i_'+r.id]]?d['i_'+r.id]:'';if(!itemId)throw Error('"'+reqItemName(r)+'" is not in the catalog yet: add it as an item first, then choose it here.');
   const loc=LOC[d['l_'+r.id]]?d['l_'+r.id]:ITEM[itemId].default_location_id&&LOC[ITEM[itemId].default_location_id]?ITEM[itemId].default_location_id:'';if(!loc)throw Error('Choose where "'+reqItemName(r)+'" is stored.');
   const exp=d['e_'+r.id];if(exp&&!validDate(exp))throw Error('Expiry must be a date.');
   ch.push(crt('lots',{item_id:itemId,lot_number:textOf(d['n_'+r.id],80)||null,quantity:round2(n),received_on:AS_OF,expires_on:validDate(exp)||null,location_id:loc,owner:textOf(st.me,120)||null,status:'in_stock',order_id:o.id}));lots++;
   const price=num(d['p_'+r.id]);if(price!==null&&price>=0)ch.push(upd('items',ITEM[itemId],{last_price:price,currency:CUR.includes(o.currency)?o.currency:CURRENCY}));
   const got=receivedFor(o,itemId)+n;done[r.id]=got>=num(r.quantity,0);ch.push(upd('requests',r,{...(done[r.id]?{status:'received'}:{}),order_id:o.id,...(r.item_id!==itemId?{item_id:itemId,item_name:textOf(ITEM[itemId].name,200)}:{})}));}
  if(!lots)throw Error('Enter a received quantity for at least one line.');
  const all=rs.every(r=>done[r.id]||r.status==='received');
  ch.push(upd('orders',o,{status:all?'received':'partially_received'}));
  propose(ch,'Receipt prepared for review: '+plural(lots,'lot')+(all?', order complete.':'; the rest of the order stays open.')+' Then record the received movements (one click).');closeAll();}
 else if(action.startsWith('cancel-order:')){const o=ORDER[action.slice(13)];if(!o||o.status!=='ordered')throw Error('Only orders with nothing received can be cancelled.');propose([upd('orders',o,{status:'cancelled'})].concat(reqsOfOrder(o).filter(r=>r.status==='ordered').map(r=>upd('requests',r,{status:'approved'}))),'Cancelling the order prepared for review; its requests go back to "to order".');}

 /* Settings */
 else if(action==='setup-categories'){const have=new Set(R.categories.allRows.map(c=>String(c.data.name||'').toLowerCase()));const add=STANDARD_CATEGORIES.filter(n=>!have.has(n.toLowerCase()));if(!add.length)throw Error('The standard categories are already there.');propose(add.map(name=>crt('categories',{name,standard:true,archived:false})),plural(add.length,'standard category').replace('categorys','categories')+' prepared for review.');}
 else if(action==='add-category'&&event.kind==='submit'){const d={...draftOf('category'),...form},name=textOf(d.name,80);if(!name)throw Error('Name the category.');if(R.categories.allRows.some(c=>same(c.data.name,name)&&!bool(c.data.archived)))throw Error('There is already a category "'+name+'".');propose([crt('categories',{name,standard:false,archived:false})],'Category "'+name+'" prepared for review. After approval it is available in items and filters.');st.f.category={};}
 else if(action==='save-approvals'&&event.kind==='submit'){const d={...draftOf('approvals'),...form},a=textOf(d.approver,120);if(!a)throw Error('Name the approver (usually the lab manager).');
  const t=String(d.threshold_amount===undefined?'':d.threshold_amount).trim()===''?null:num(d.threshold_amount);if(t!==null&&t<0)throw Error('The threshold must be 0 or more.');const s2=textOf(d.second_approver,120)||null;if(t!==null&&!s2)throw Error('Name the second approver for amounts above the threshold.');if(s2&&same(s2,a))throw Error('The second approver must be another person.');
  const pa={};for(const p of PROGRAMS){const v=textOf(d['pa_'+p.id],120);if(v)pa[p.id]=v;}
  const v={approver:a,second_approver:s2,threshold_amount:t,currency:CUR.includes(d.currency)?d.currency:CURRENCY,program_approvers:Object.keys(pa).length?JSON.stringify(pa):null};
  propose([settingsRow?upd('settings',settingsRow,v):crt('settings',{...v,expiry_window_days:30,digest_cadence:'weekly',digest_day:'mon',digest_time:'08:00',digest_text:DEFAULT_DIGEST_TEXT,units:STANDARD_UNITS.join(', ')})],'Approval settings prepared for review.');}
 else if(action==='save-alerts'&&event.kind==='submit'){if(!settingsRow)throw Error('Set the approver first (Approvals, above).');const d={...draftOf('alerts'),...form},w=num(d.expiry_window_days);if(!w||w<1||w>365)throw Error('The expiry window is 1 to 365 days.');if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(d.digest_time||'')))throw Error('Digest time is HH:MM, for example 08:00.');
  propose([upd('settings',settingsRow,{expiry_window_days:Math.round(w),digest_cadence:CAD.includes(d.digest_cadence)?d.digest_cadence:'weekly',digest_day:DAYS.includes(d.digest_day)?d.digest_day:'mon',digest_time:d.digest_time,digest_recipients:textOf(d.digest_recipients,500)||null,digest_text:textOf(d.digest_text,2000)||null})],'Alert and digest settings prepared for review. Update the digest automation in TrialAgents → Automations to match the new day and time.');}
 else if(action==='save-general'&&event.kind==='submit'){if(!settingsRow)throw Error('Set the approver first (Approvals, above).');const d={...draftOf('general'),...form},link=textOf(d.app_link,400);
  if(link&&!/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?\/apps\/[0-9a-f-]{36}(?:\/[A-Za-z0-9_\/-]*)?\?(?:[^#]*&)?workspaceId=[0-9a-f-]{36}(?:&|#|$)/i.test(link))throw Error('Paste the app link from your browser address bar while Lab Inventory is open (it contains /apps/ and workspaceId=).');
  const us=[...new Set(list(d.units).map(u=>u.toLowerCase().slice(0,30)))];if(!us.length)throw Error('Keep at least one unit.');
  propose([upd('settings',settingsRow,{units:us.join(', '),app_link:link||null})],'Units and QR link prepared for review.');}
}catch(e){failed=true;note(String(e&&e.message||e).slice(0,600));}

const glyph={overview:'<rect x="3" y="3" width="7" height="8" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/>',inventory:'<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M7.5 14h9"/>',requests:'<path d="M9 5h10M9 12h10M9 19h10"/><path d="M4 5l1 1 2-2M4 12l1 1 2-2M4 19l1 1 2-2"/>',orders:'<path d="M3 7h13v10H3zM16 10h3l2 3v4h-5"/><circle cx="7" cy="18" r="1.6"/><circle cx="18" cy="18" r="1.6"/>',locations:'<path d="M4 4h16v16H4zM4 10h16M4 16h16M12 4v6"/>',settings:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',item:'<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',close:'<path d="M6 6l12 12M18 6L6 18"/>',alert:'<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',qr:'<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2h-2zM18 18h2v2h-2z"/>'};
const icon=(n,s=18)=>'<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(glyph[n]||glyph.overview)+'</svg>';
const btn=(text,a,cls,disabled,extra)=>'<button type="button" class="'+(cls===undefined?'li-btn':cls)+'" data-action="'+esc(a)+'"'+(disabled?' disabled':'')+(extra?' '+extra:'')+'>'+text+'</button>';
const bS=(t,a,d,x)=>btn(t,a,'li-btn small',d,x),bP=(t,a,d,x)=>btn(t,a,'li-btn small li-btn-primary',d,x);
const submit=(text,ok,cls,extra)=>'<button type="submit" class="'+(cls||'li-btn li-btn-primary')+'"'+(ok===false?' disabled':'')+(extra?' '+extra:'')+'>'+esc(text)+'</button>';
const pill=(text,type)=>'<span class="li-pill '+esc(type||'')+'">'+esc(text)+'</span>';
const kv=(k,v)=>'<div class="li-kv"><span>'+esc(k)+'</span><strong>'+esc(v===null||v===undefined||v===''?'—':v)+'</strong></div>';
function kpi(title,value,foot,tone,a){return '<div class="li-kpi '+(tone||'')+'"><div class="li-kpi-label">'+esc(title)+'</div><div class="li-kpi-value">'+esc(value)+'</div><div class="li-kpi-foot">'+esc(foot||'')+'</div>'+(a?bS('Show',a,false,'aria-label="Show '+esc(title)+'"'):'')+'</div>';}
const panel=(title,sub,body,right,id)=>'<section class="li-panel"'+(id?' id="'+esc(id)+'"':'')+'><div class="li-pad"><div class="li-panel-head"><div><h2>'+esc(title)+'</h2>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div>'+(right?'<div class="li-row top0">'+right+'</div>':'')+'</div>'+body+'</div></section>';
const tbl=(lab,heads,rows,none)=>'<div class="li-scroll" role="region" aria-label="'+esc(lab)+'" tabindex="0"><table class="li-table"><thead><tr>'+heads.map(h=>h[0]==='#'?'<th scope="col" class="num">'+esc(h.slice(1))+'</th>':(h?'<th scope="col">'+esc(h):'<th scope="col" class="li-actions">Actions')+'</th>').join('')+'</tr></thead><tbody>'+(rows.join('')||'<tr><td colspan="'+heads.length+'" class="li-none">'+esc(none||'Nothing yet.')+'</td></tr>')+'</tbody></table></div>';
function paged(items,per){per=per||Math.min(50,Math.max(10,num(cfg.pageSize,25)||25));const max=Math.max(0,Math.ceil(items.length/per)-1);st.page=Math.min(st.page,max);return {slice:items.slice(st.page*per,(st.page+1)*per),page:st.page,max,total:items.length,per};}
function pager(p){return p.max===0?'':'<div class="li-footer"><span>Showing '+(p.page*p.per+1)+'–'+Math.min(p.total,(p.page+1)*p.per)+' of '+p.total+'</span><span class="li-pager">'+bS('Previous','prev-page',p.page===0)+'<span>Page '+(p.page+1)+' of '+(p.max+1)+'</span>'+bS('Next','next-page',p.page>=p.max)+'</span></div>';}
function inputOf(formName,name,value,o){o=o||{};const a='f:'+formName+':'+name,id='li-'+formName+'-'+name,common=' id="'+esc(id)+'" name="'+esc(name)+'" data-ui-state="true" data-action="'+esc(a)+'"'+(o.disabled?' disabled':'')+(o.required?' required':'');
 const d=st.f[formName]&&has(st.f[formName],name)?st.f[formName][name]:value;
 if(o.type==='select')return '<select'+common+'>'+(o.blank===undefined?'':'<option value="">'+esc(o.blank)+'</option>')+o.options.map(x=>'<option value="'+esc(x[0])+'"'+(String(d===null||d===undefined?'':d)===String(x[0])?' selected':'')+'>'+esc(x[1])+'</option>').join('')+'</select>';
 if(o.type==='checkbox')return '<input type="checkbox"'+common+(bool(d)?' checked':'')+'>';
 if(o.type==='textarea')return '<textarea class="li-textarea'+(o.cls?' '+o.cls:'')+'"'+common+(o.readonly?' readonly':'')+'>'+esc(d===null||d===undefined?'':d)+'</textarea>';
 return '<input class="li-input" type="'+(o.type||'text')+'"'+common+(o.type==='number'?' step="any"':'')+(o.min!==undefined?' min="'+o.min+'"':'')+(o.max!==undefined?' max="'+o.max+'"':'')+(o.placeholder?' placeholder="'+esc(o.placeholder)+'"':'')+' value="'+esc(d===null||d===undefined?'':d)+'">';}
const field=(formName,name,lab,value,o)=>o&&o.type==='checkbox'?'<label class="li-check'+(o.wide?' wide':'')+'" for="li-'+formName+'-'+name+'">'+inputOf(formName,name,value,o)+'<span>'+esc(lab)+'</span></label>':'<label class="li-field'+(o&&o.wide?' wide':'')+'" for="li-'+formName+'-'+name+'">'+esc(lab)+(o&&o.required?' *':'')+inputOf(formName,name,value,o)+(o&&o.hint?'<small class="li-muted">'+esc(o.hint)+'</small>':'')+'</label>';
const opts=(xs,labels)=>xs.map(x=>[x,labels&&labels[x]?labels[x]:cap(x)]);
function drawer(title,eyebrow,body,foot,formAction,wide){return '<div class="li-overlay"><section class="li-drawer'+(wide?' wide':'')+'" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="li-drawer-head"><div><div class="li-eyebrow">'+esc(eyebrow)+'</div><h2>'+esc(title)+'</h2></div>'+btn(icon('close',18),'close','li-icon-btn',false,'aria-label="Close"')+'</div>'+(formAction?'<form class="li-drawer-form" data-action="'+esc(formAction)+'">':'<div class="li-drawer-form">')+'<div class="li-drawer-body">'+body+'</div><div class="li-drawer-foot">'+(foot||btn('Close','close'))+'</div>'+(formAction?'</form>':'</div>')+'</section></div>';}
const reviewNote='<div class="li-banner">This is a proposal until you approve the TrialAgents review. Opening this form changes nothing.</div>';
const statusPill=s=>pill(RS_LABEL[s]||OS_LABEL[s]||LOT_LABEL[s]||cap(s),{requested:'amber',approved:'blue',ordered:'blue',partially_received:'amber',received:'green',rejected:'red',cancelled:'',in_stock:'green',used_up:'',expired:'red',discarded:''}[s]||'');
const itemOptions=()=>ITEMS.slice().sort((a,b)=>String(a.name).localeCompare(String(b.name))).map(i=>[i.id,i.name+(i.catalog_number?' ('+i.catalog_number+')':'')]);
const locOptions=()=>LOCS.slice().sort((a,b)=>locPath(a.id).localeCompare(locPath(b.id))).map(l=>[l.id,locPath(l.id)]);
const supplierOptions=()=>ORGS.filter(o=>['other','partner','company','cdmo','cro'].includes(o.org_type)||ITEMS.some(i=>i.supplier_id===o.id)||ORDERS.some(x=>x.supplier_id===o.id)||!o.org_type).sort((a,b)=>String(a.name).localeCompare(String(b.name))).map(o=>[o.id,String(o.name||'Unnamed')]);
const PEOPLE_NAMES=[...new Set([APPROVER,SECOND,...Object.values(PROGRAM_APPROVERS),...REQS.map(r=>textOf(r.requested_by,120)),...ITEMS.map(i=>textOf(i.owner,120))].filter(Boolean))].sort();
const peopleList='';

const current=st.section==='item'?{id:'item',label:screenLabel('item')}:SCREENS.find(s=>s.id===st.section)||SCREENS[0];
function heading(sub){return '<header class="li-top"><div><div class="li-eyebrow">Lab Inventory / '+esc(current.label)+'</div><h1 class="li-title">'+esc(st.layout.heading)+'</h1><p class="li-subtitle">'+esc(sub||DESC[current.id])+'</p></div><div class="li-top-right"><label class="li-me" for="li-me">You<input class="li-input" id="li-me" name="me" data-ui-state="true" data-action="me" placeholder="Your name" value="'+esc(st.me)+'"></label>'+pill('As of '+dateLabel(AS_OF),'blue')+btn(icon('gear',18),'tracker:layout','li-icon-btn',!inp.saved,'aria-label="App layout settings" title="Layout settings"')+'</div></header>'+peopleList;}
function checks(){let out='';
 if(!exact)out+='<div class="li-banner bad" role="alert"><strong>Partial data: totals, alerts and "nothing waiting" answers may be incomplete, and changes are disabled.</strong> '+coreProblems.slice(0,5).map(esc).join(' ')+'</div>';
 else if(movementsPartial)out+='<div class="li-banner" role="status">Only the most recent movements could be read, so usage history and averages may be short.</div>';
 if(unrecorded.length)out+='<div class="li-banner warn" role="status"><span><strong>'+plural(unrecorded.length,'lot')+' received without a movement yet.</strong> Every quantity change has a movement; record them in one review.</span> '+bP('Record received movements','record-receipts',!canWrite('movements'))+'</div>';
 if(invalidApproved.length)out+='<div class="li-banner bad" role="alert"><strong>'+plural(invalidApproved.length,'request')+' marked approved without valid approvals</strong> (missing approver, self-approval or missing second approval). They cannot be ordered: '+invalidApproved.slice(0,3).map(r=>esc(reqItemName(r))).join(', ')+'.</div>';
 return out;}
const itemRow=(it,c)=>{const ls=liveLots(it.id),s=stockOf(it.id),next=ls.find(l=>validDate(l.expires_on)),low=isLow(it),exp=ls.some(isExpired),soon=ls.some(isExpiring);
 const cell={item:'<th scope="row"><button type="button" class="li-link" data-action="panel:item:'+esc(it.id)+'">'+esc(it.name)+'</button><span class="li-sub">'+esc([it.catalog_number,it.unit_size].filter(Boolean).join(' · '))+'</span></th>',category:'<td>'+esc(catName(it.category_id))+'</td>',stock:'<td class="num">'+esc(units(s,it))+'<span class="li-sub">'+plural(ls.length,'lot')+'</span></td>',expiry:'<td>'+(next?esc(dateLabel(next.expires_on)):'—')+'</td>',location:'<td>'+esc(ls[0]?locPath(ls[0].location_id):it.default_location_id?locPath(it.default_location_id):'—')+'</td>',supplier:'<td>'+esc(orgName(it.supplier_id)||'—')+'</td>',status:'<td>'+(exp?pill('Expired lot','red'):'')+(low?pill('Low stock','amber'):'')+(soon?pill('Expiring','amber'):'')+(!exp&&!low&&!soon?pill('OK','green'):'')+'</td>'};
 return '<tr>'+c.map(k=>cell[k]).join('')+'<td class="li-actions">'+bS('Used one','use-one:'+it.id,!ls.length||!canWrite('lots'),'aria-label="Used one '+esc(it.name)+'"')+bS('Details','panel:item:'+it.id,false,'aria-label="Details '+esc(it.name)+'"')+'</td></tr>';};
const COLHEAD={items:{item:'Item',category:'Category',stock:'#Stock',expiry:'Next expiry',location:'Location',supplier:'Supplier',status:'Status'},requests:{item:'Item',quantity:'#Quantity',requester:'Requested by',program:'Program',amount:'#Amount',urgency:'Urgency',status:'Status',requested:'Requested'}};
const reqRow=(r,c)=>{const it=ALLITEM[r.item_id],a=approvalState(r),o=orderOfReq(r);
 const cell={item:'<th scope="row"><button type="button" class="li-link" data-action="panel:request:'+esc(r.id)+'">'+esc(reqItemName(r))+'</button>'+(r.new_item_name&&!r.item_id?'<span class="li-sub">New item</span>':'')+'</th>',quantity:'<td class="num">'+esc(it?units(r.quantity,it):qty(r.quantity))+'</td>',requester:'<td>'+esc(r.requested_by||'—')+'</td>',program:'<td>'+esc(progName(r.program_id)||'—')+'</td>',amount:'<td class="num">'+esc(num(r.estimated_amount)===null?'—':money(num(r.estimated_amount),CURRENCY))+(needsSecond(r)?'<span class="li-sub">2 approvals</span>':'')+'</td>',urgency:'<td>'+(r.urgency==='urgent'?pill('Urgent','red'):'Normal')+'</td>',status:'<td>'+statusPill(r.status)+(r.status==='requested'?'<span class="li-sub">'+esc((a.step===2?'Second approval: ':'Waiting for ')+(a.who||'an approver'))+'</span>':'')+(o&&r.status!=='requested'?'<span class="li-sub">'+esc((orgName(o.supplier_id)||'Order')+(o.order_number?' '+o.order_number:''))+'</span>':'')+(['approved','ordered'].includes(r.status)&&!a.valid?pill('Approval invalid','red'):'')+'</td>',requested:'<td>'+esc(dateLabel(r.requested_on))+'</td>'};
 return '<tr>'+c.map(k=>cell[k]).join('')+'<td class="li-actions">'+bS(r.status==='requested'?'Review':'Details','panel:request:'+r.id,false,'aria-label="'+(r.status==='requested'?'Review':'Details')+' request '+esc(reqItemName(r))+'"')+'</td></tr>';};
function stockCheck(itemId,name){const it=ITEM[itemId];let ls=[],sameName=[];if(it)ls=liveLots(it.id);else if(textOf(name).length>=3){const q=textOf(name).toLowerCase();sameName=ITEMS.filter(i=>String(i.name).toLowerCase().includes(q)||q.includes(String(i.name).toLowerCase())).slice(0,3);}
 const open=it?openRequestsFor(it.id):[];
 if(!it&&!sameName.length)return '';
 if(!it)return '<div class="li-banner warn" role="status"><strong>Similar items are already in the catalog:</strong> '+sameName.map(i=>esc(i.name)+' ('+esc(units(stockOf(i.id),i))+')').join('; ')+'. Choose one above if it is the same.</div>';
 return '<div class="li-stockcheck'+(ls.length?' have':'')+'" role="status"><strong>'+(ls.length?'We already have it: '+esc(units(stockOf(it.id),it))+' in stock':'Not in stock')+'</strong>'+(ls.length?'<ul class="li-list">'+ls.slice(0,4).map(l=>'<li>'+esc(units(l.quantity,it))+' in '+esc(locPath(l.location_id))+(l.lot_number?' · lot '+esc(l.lot_number):'')+(validDate(l.expires_on)?' · expires '+esc(dateLabel(l.expires_on)):'')+(isExpired(l)?' '+pill('Expired','red'):'')+'</li>').join('')+'</ul>':'')+(open.length?'<p>Open requests for this item: '+open.map(r=>esc(units(r.quantity,it)+' by '+(r.requested_by||'—')+' ('+(RS_LABEL[r.status]||r.status)+')')).join('; ')+'.</p>':'')+'</div>';}

function overview(){const mine=st.me?REQS.filter(r=>same(r.requested_by,st.me)).sort((a,b)=>String(b.requested_on).localeCompare(String(a.requested_on))):[];
 const month=AS_OF.slice(0,7),thisMonth=SPEND.filter(x=>x.month===month),main=thisMonth.filter(x=>x.currency===CURRENCY),other=thisMonth.filter(x=>x.currency!==CURRENCY);
 const setup=[!settingsRow?'Set the approver (Reports & settings → Approvals).':'',!CATS.length?'Add the standard categories (Reports & settings → Categories).':'',!LOCS.length?'Add your rooms, storage units and shelves (Locations).':'',!ITEMS.length?'Add items, or ask your assistant to add them from a list or order confirmation.':''].filter(Boolean);
 const alertList=(xs,f,none)=>xs.length?'<ul class="li-list">'+xs.slice(0,5).map(f).join('')+(xs.length>5?'<li class="li-muted">and '+(xs.length-5)+' more</li>':'')+'</ul>':'<p class="li-muted">'+esc(exact?none:'Not known: some records could not be read.')+'</p>';
 return heading()+checks()+(setup.length?panel('Get started','A few steps make the app useful from day one.','<ol class="li-steps">'+setup.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>'):'')+
  '<div class="li-kpis">'+kpi('Low stock',exact?lowItems.length:'—','at or below the reorder point',lowItems.length?'warn':'')+kpi('Expiring in '+WINDOW+' days',exact?expiring.length:'—','lots in stock',expiring.length?'warn':'')+kpi('Expired',exact?expired.length:'—','still in stock',expired.length?'bad':'')+kpi('Approvals waiting',exact?waiting.length:'—','requests',waiting.length?'warn':'')+kpi('Late orders',exact?lateOrders.length:'—','past the expected date',lateOrders.length?'bad':'')+'</div>'+
  '<div class="li-grid2">'+panel('Alerts','Low stock, expiry, approvals and late orders.',
   '<h3 class="li-h3">Low stock</h3>'+alertList(lowItems,it=>'<li><button type="button" class="li-link" data-action="panel:item:'+esc(it.id)+'">'+esc(it.name)+'</button> · '+esc(units(stockOf(it.id),it))+' (reorder at '+esc(qty(it.reorder_point))+')</li>','Nothing is low.')+
   '<h3 class="li-h3">Expiring in '+WINDOW+' days</h3>'+alertList(expiring,l=>'<li>'+esc(itemName(l.item_id))+(l.lot_number?' lot '+esc(l.lot_number):'')+' · '+esc(dateLabel(l.expires_on))+' · '+esc(locPath(l.location_id))+'</li>','Nothing expires soon.')+
   '<h3 class="li-h3">Expired, still in stock</h3>'+alertList(expired,l=>'<li>'+esc(itemName(l.item_id))+(l.lot_number?' lot '+esc(l.lot_number):'')+' · expired '+esc(dateLabel(l.expires_on))+' '+bS('Discard','discard:'+l.id,!canWrite('lots'),'aria-label="Discard '+esc(itemName(l.item_id))+' lot '+esc(l.lot_number||'')+'"')+'</li>','No expired lots.')+
   '<h3 class="li-h3">Approvals waiting</h3>'+alertList(waiting,r=>'<li><button type="button" class="li-link" data-action="panel:request:'+esc(r.id)+'">'+esc(reqItemName(r))+'</button> × '+esc(qty(r.quantity))+' for '+esc(r.requested_by||'—')+' · '+esc(approvalState(r).who?'waiting for '+approvalState(r).who:'no approver set')+'</li>','No approvals waiting.')+
   '<h3 class="li-h3">Late orders</h3>'+alertList(lateOrders,o=>'<li>'+esc(orgName(o.supplier_id)||'Supplier')+(o.order_number?' '+esc(o.order_number):'')+' · expected '+esc(dateLabel(o.expected_on))+'</li>','No late orders.'))+
  panel('Suggested reorders','Items at or below their reorder point, with a suggested quantity. One click makes a request.',reorderTable())+'</div>'+
  '<div class="li-grid2">'+panel('My requests',st.me?'Requests by '+st.me+'.':'Enter your name at the top to see your requests.',st.me?tbl('My requests',['Item','#Quantity','Status','Requested'],mine.slice(0,10).map(r=>'<tr><th scope="row"><button type="button" class="li-link" data-action="panel:request:'+esc(r.id)+'">'+esc(reqItemName(r))+'</button></th><td class="num">'+esc(qty(r.quantity))+'</td><td>'+statusPill(r.status)+(r.status==='rejected'&&r.reject_reason?'<span class="li-sub">'+esc(r.reject_reason)+'</span>':'')+'</td><td>'+esc(dateLabel(r.requested_on))+'</td></tr>'),'No requests yet.'):'')+
  panel('Spend this month by program',monthLabel(AS_OF)+' · orders by ordered date, '+CURRENCY+(R.programs.unbound?'. Connect Programs to split by program.':''),thisMonth.length?tbl('Spend this month by program',['Program','#Amount'],sumBy(main,'program').map(([p,v])=>'<tr><th scope="row">'+esc(progName(p)||'No program')+'</th><td class="num">'+esc(money(v,CURRENCY))+'</td></tr>'))+(other.length?'<p class="li-muted">Also '+other.length+' order line(s) in other currencies, not added: '+esc(Object.entries(other.reduce((m,x)=>(m[x.currency]=(m[x.currency]||0)+x.amount,m),{})).map(([c,v])=>money(v,c)).join(', '))+'.</p>':''):'<p class="li-muted">No orders logged this month.</p>')+'</div>';}
function reorderTable(){return tbl('Suggested reorders',['Item','#Stock','#Reorder at','#Suggested',''],reorders.map(x=>'<tr><th scope="row"><button type="button" class="li-link" data-action="panel:item:'+esc(x.item.id)+'">'+esc(x.item.name)+'</button></th><td class="num">'+esc(units(x.stock,x.item))+'</td><td class="num">'+esc(qty(x.item.reorder_point))+'</td><td class="num">'+(x.s?esc(units(x.s.qty,x.item)):'—')+'<span class="li-sub">'+esc(x.s?x.s.basis:'No suggestion: no usage history and no usual order quantity')+'</span></td><td class="li-actions">'+(x.open.length?pill('Requested','blue'):bP('Request','reorder:'+x.item.id,!x.s||!canWrite('requests'),'aria-label="Request '+esc(x.item.name)+'"'))+'</td></tr>'),exact?'Nothing to reorder.':'Not known: some records could not be read.');}

function inventoryScreen(){const fl=st.filters,q=st.query.toLowerCase();
 let xs=ITEMS.filter(it=>(!q||[it.name,it.catalog_number,it.notes,orgName(it.supplier_id)].some(v=>String(v||'').toLowerCase().includes(q)))&&(!fl.category||it.category_id===fl.category)&&(!fl.supplier||it.supplier_id===fl.supplier)&&(!fl.program||it.program_id===fl.program)&&(!fl.location||liveLots(it.id).some(l=>{let p=l.location_id,g=0;while(p&&g++<8){if(p===fl.location)return true;p=(ALLLOC[p]||{}).parent_id;}return false;}))&&(!fl.status||fl.status==='low'&&isLow(it)||fl.status==='expiring'&&liveLots(it.id).some(l=>isExpiring(l)||isExpired(l))||fl.status==='out'&&stockOf(it.id)<=0));
 xs.sort((a,b)=>String(a.name).localeCompare(String(b.name)));const p=paged(xs),c=cols('items');const active=['category','location','supplier','program','status'].filter(k=>fl[k]).length;
 const sel=(k,lab,options)=>'<label class="li-field" for="li-fl-'+k+'">'+esc(lab)+'<select id="li-fl-'+k+'" data-ui-state="true" data-action="filter:'+k+'"><option value="">All</option>'+options.map(o=>'<option value="'+esc(o[0])+'"'+(fl[k]===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></label>';
 return heading()+checks()+panel('Items','Search covers name, catalog number, notes and supplier across all '+ITEMS.length+' items.','<div class="li-toolbar"><label class="li-field grow" for="li-q">Search items<input class="li-input" id="li-q" type="search" data-ui-state="true" data-action="query" value="'+esc(st.query)+'"></label>'+bP('<span class="li-long">Add item</span><span class="li-short">Add</span>','add:items',!canWrite('items'),'aria-label="Add item"')+'</div>'+
  '<div class="li-filters" role="group" aria-label="Filters'+(active?' ('+active+' active)':'')+'">'+sel('category','Category',CATS.map(x=>[x.id,x.name]))+sel('location','Location',locOptions())+sel('supplier','Supplier',supplierOptions())+(R.programs.unbound?'':sel('program','Program',PROGRAMS.map(x=>[x.id,progName(x.id)])))+sel('status','Status',[['low','Low stock'],['expiring','Expiring or expired'],['out','Out of stock']])+'</div>'+
  tbl('Items',c.map(k=>COLHEAD.items[k]).concat(['']),p.slice.map(it=>itemRow(it,c)),ITEMS.length?'No items match.':'No items yet. Add one, or ask your assistant to add them from a list.')+pager(p),
  bS(icon('qr',15)+' Print QR labels','labels:items',false)+(canWrite('lots')?'':''));}

function itemPanel(it){const ls=lotsOf(it.id).sort((a,b)=>(a.status==='in_stock'?0:1)-(b.status==='in_stock'?0:1)||lotOrder(a,b)),sug=suggestedLot(it.id),moves=itemMoves(it.id).slice(0,12),reqs=REQS.filter(r=>r.item_id===it.id),ords=ORDERS.filter(o=>reqsOfOrder(o).some(r=>r.item_id===it.id)).sort((a,b)=>String(b.ordered_on).localeCompare(String(a.ordered_on))),s=suggestion(it);
 const lotRow=l=>'<tr'+(sug&&l.id===sug.id?' class="li-suggested"':'')+'><th scope="row">'+esc(l.lot_number||'No lot number')+(sug&&l.id===sug.id?'<span class="li-sub">Use first (expires first)</span>':'')+'</th><td class="num">'+esc(units(l.quantity,it))+'</td><td>'+esc(validDate(l.expires_on)?dateLabel(l.expires_on):'—')+(isExpired(l)?' '+pill('Expired','red'):isExpiring(l)?' '+pill('Soon','amber'):'')+'</td><td>'+esc(locPath(l.location_id))+'</td><td>'+esc(l.owner||'—')+'</td><td>'+statusPill(l.status)+'</td><td class="li-actions">'+(inStock(l)?bS('Used one','use-one:'+l.id,!canWrite('lots'),'aria-label="Used one from lot '+esc(l.lot_number||'')+'"')+bS('Used up','use-up:'+l.id,!canWrite('lots'),'aria-label="Used up lot '+esc(l.lot_number||'')+'"')+bS('Count','panel:count:'+l.id,!canWrite('lots'),'aria-label="Count lot '+esc(l.lot_number||'')+'"')+bS('Move','panel:move:'+l.id,!canWrite('lots'),'aria-label="Move lot '+esc(l.lot_number||'')+'"')+bS('Discard','discard:'+l.id,!canWrite('lots'),'aria-label="Discard lot '+esc(l.lot_number||'')+'"'):l.status==='used_up'?bS('Count','panel:count:'+l.id,!canWrite('lots'),'aria-label="Count lot '+esc(l.lot_number||'')+'"'):'')+'</td></tr>';
 return drawer(it.name,catName(it.category_id)+(it.catalog_number?' · '+it.catalog_number:''),
  '<div class="li-kvs">'+kv('In stock',units(stockOf(it.id),it))+kv('Reorder point',num(it.reorder_point)===null?'Not set':qty(it.reorder_point))+kv('Suggested order',s?units(s.qty,it)+' ('+s.basis+')':'—')+kv('Supplier',orgName(it.supplier_id)||'—')+kv('Last price',num(it.last_price)===null?'—':money(num(it.last_price),it.currency||CURRENCY)+' per '+unitOf(it))+kv('Lead time',num(it.lead_time_days)===null?'—':plural(num(it.lead_time_days),'day'))+kv('Default location',it.default_location_id?locPath(it.default_location_id):'—')+kv('Program',progName(it.program_id)||'—')+kv('Owner',it.owner||'—')+'</div>'+
  '<div class="li-row">'+bP('Used one'+(sug?' (lot '+esc(sug.lot_number||'—')+')':''),'use-one:'+it.id,!sug||!canWrite('lots'))+bS('Request more','panel:newrequest:'+it.id,!canWrite('requests'))+bS('Add lot','panel:lot:'+it.id,!canWrite('lots'))+bS('Edit item','edit:items:'+it.id,!canWrite('items'))+bS(icon('qr',15)+' QR label','labels:items:'+it.id)+bS('Item page','open-item:'+it.id)+'</div>'+
  '<h3 class="li-h3">Lots</h3>'+tbl('Lots of '+it.name,['Lot','#Quantity','Expires','Location','Owner','Status',''],ls.map(lotRow),'No lots yet.')+
  '<h3 class="li-h3">Usage history</h3>'+tbl('Usage history of '+it.name,['Date','What','#Change','By','Via'],moves.map(m=>'<tr><td>'+esc(dateLabel(m.occurred_on))+'</td><td>'+esc(cap(m.kind))+(m.note?'<span class="li-sub">'+esc(m.note)+'</span>':'')+'</td><td class="num">'+esc((num(m.quantity_change,0)>0?'+':'')+qty(m.quantity_change))+'</td><td>'+esc(m.by||'—')+'</td><td>'+esc(cap(m.via||'app'))+'</td></tr>'),'No use recorded.')+
  '<h3 class="li-h3">Past orders and prices</h3>'+tbl('Past orders of '+it.name,['Ordered','Supplier','Order','#Quantity','#Order amount','Status'],ords.slice(0,8).map(o=>{const rq=reqsOfOrder(o).filter(r=>r.item_id===it.id);return '<tr><td>'+esc(dateLabel(o.ordered_on))+'</td><td>'+esc(orgName(o.supplier_id)||'—')+'</td><td>'+esc(o.order_number||'—')+'</td><td class="num">'+esc(qty(rq.reduce((n,r)=>n+num(r.quantity,0),0)))+'</td><td class="num">'+esc(num(o.amount)===null?'—':money(num(o.amount),o.currency||CURRENCY))+'</td><td>'+statusPill(o.status)+'</td></tr>';}),reqs.length?'Not ordered yet.':'No orders yet.')+
  (it.notes?'<h3 class="li-h3">Notes</h3><p>'+esc(it.notes)+'</p>':''),btn('Close','close')+bS('Archive item','archive:items:'+it.id,!canWrite('items')||stockOf(it.id)>0,stockOf(it.id)>0?'title="Use or discard the stock first"':''),null,true);}

function itemPage(){const it=ITEM[st.itemId];if(!it)return heading('The item on this label is not available (archived, removed or not permitted).')+'<p>'+btn('Go to Inventory','nav:inventory','li-btn li-btn-primary')+'</p>';
 const sug=suggestedLot(it.id),ls=liveLots(it.id),open=openRequestsFor(it.id),d=draftOf('qcount');
 return '<div class="li-mobile"><div class="li-eyebrow">Lab Inventory · '+esc(catName(it.category_id))+'</div><h1 class="li-title">'+esc(it.name)+'</h1><p class="li-subtitle">'+esc([it.catalog_number,orgName(it.supplier_id)].filter(Boolean).join(' · '))+'</p>'+
  '<label class="li-me wide" for="li-me">You<input class="li-input" id="li-me" name="me" data-ui-state="true" data-action="me" placeholder="Your name" value="'+esc(st.me)+'"></label>'+peopleList+
  '<div class="li-big"><span>In stock</span><strong>'+esc(units(stockOf(it.id),it))+'</strong>'+(isLow(it)?pill('Low stock','amber'):'')+'</div>'+
  (sug?'<p class="li-use-next">Use next: <strong>lot '+esc(sug.lot_number||'—')+'</strong> · '+esc(units(sug.quantity,it))+' · '+esc(locPath(sug.location_id))+(validDate(sug.expires_on)?' · expires '+esc(dateLabel(sug.expires_on)):'')+'</p>':'<p class="li-muted">Nothing in stock.</p>')+
  '<div class="li-bigbtns">'+btn('Used one','use-one:'+(sug?sug.id:it.id),'li-btn li-btn-primary li-btn-big',!sug||!canWrite('lots'))+btn('Used up','use-up:'+(sug?sug.id:it.id),'li-btn li-btn-big',!sug||!canWrite('lots'))+btn(open.length?'Already requested':'Request more','panel:newrequest:'+it.id,'li-btn li-btn-big',!canWrite('requests')||open.length>0)+'</div>'+
  (sug?'<form class="li-qcount" data-action="save-count-quick"><label class="li-field" for="li-qcount-quantity">Quick count of lot '+esc(sug.lot_number||'—')+inputOf('qcount','quantity',has(d,'quantity')?d.quantity:'',{type:'number',min:0})+'</label>'+submit('Save count',canWrite('lots'),'li-btn')+'</form>':'')+
  (ls.length>1?'<h2 class="li-h3">All lots</h2><ul class="li-list">'+ls.map(l=>'<li>Lot '+esc(l.lot_number||'—')+' · '+esc(units(l.quantity,it))+' · '+esc(locPath(l.location_id))+(validDate(l.expires_on)?' · '+esc(dateLabel(l.expires_on)):'')+' '+bS('Used one','use-one:'+l.id,!canWrite('lots'),'aria-label="Used one from lot '+esc(l.lot_number||'')+'"')+'</li>').join('')+'</ul>':'')+
  (open.length?'<p class="li-muted">Open request: '+open.map(r=>esc(units(r.quantity,it)+' by '+(r.requested_by||'—')+', '+(RS_LABEL[r.status]||r.status))).join('; ')+'</p>':'')+
  '<p class="li-row">'+bS('Item details','panel:item:'+it.id)+bS('Inventory','nav:inventory')+'</p></div>';}

function requestsScreen(){const fl=st.filters,q=st.query.toLowerCase(),c=cols('requests');
 const counts=RS.map(s=>[s,REQS.filter(r=>r.status===s).length]);
 const queue=waiting.slice().sort((a,b)=>(b.urgency==='urgent')-(a.urgency==='urgent')||String(a.requested_on).localeCompare(String(b.requested_on)));
 let xs=REQS.filter(r=>(!fl.rstatus||r.status===fl.rstatus)&&(!q||[reqItemName(r),r.requested_by,r.note].some(v=>String(v||'').toLowerCase().includes(q)))).sort((a,b)=>String(b.requested_on).localeCompare(String(a.requested_on))||String(b.id).localeCompare(String(a.id)));const p=paged(xs);
 return heading()+checks()+
  '<div class="li-flow" role="list" aria-label="Request status">'+[['requested','Requested'],['approved','Approved'],['ordered','Ordered'],['received','Received']].map(([k,l])=>'<div class="li-flow-step" role="listitem"><strong>'+(counts.find(x=>x[0]===k)||[0,0])[1]+'</strong><span>'+l+'</span></div>').join('<span class="li-flow-arrow" aria-hidden="true">→</span>')+'</div>'+
  panel('Approval queue',(APPROVER?'Approver: '+APPROVER:'No approver set yet')+(THRESHOLD!==null?' · above '+money(THRESHOLD,CURRENCY)+' also '+(SECOND||'a second approver'):'')+(Object.keys(PROGRAM_APPROVERS).length?' · per-program approvers set':'')+'. Nobody approves their own request.',tbl('Approval queue',['Item','#Quantity','Requested by','#Amount','Urgency','Waiting for',''],queue.map(r=>{const a=approvalState(r);return '<tr><th scope="row"><button type="button" class="li-link" data-action="panel:request:'+esc(r.id)+'">'+esc(reqItemName(r))+'</button>'+(r.item_id&&stockOf(r.item_id)>0?'<span class="li-sub">'+esc(units(stockOf(r.item_id),ITEM[r.item_id]))+' already in stock</span>':'')+'</th><td class="num">'+esc(qty(r.quantity))+'</td><td>'+esc(r.requested_by||'—')+'</td><td class="num">'+esc(num(r.estimated_amount)===null?'—':money(num(r.estimated_amount),CURRENCY))+(needsSecond(r)?' '+pill(a.step===2?'Second approval':'Needs 2 approvals','amber'):'')+'</td><td>'+(r.urgency==='urgent'?pill('Urgent','red'):'Normal')+'</td><td>'+esc(a.who||'No approver available')+'</td><td class="li-actions">'+bP('Review','panel:request:'+r.id,false,'aria-label="Review request '+esc(reqItemName(r))+'"')+'</td></tr>';}),'No requests are waiting.'),bP('New request','panel:newrequest',!canWrite('requests')))+
  panel('All requests','Status for everyone: requested → approved → ordered → received.','<div class="li-toolbar"><label class="li-field grow" for="li-rq">Search requests<input class="li-input" id="li-rq" type="search" data-ui-state="true" data-action="query" value="'+esc(st.query)+'"></label><label class="li-field" for="li-rs">Status<select id="li-rs" data-ui-state="true" data-action="filter:rstatus"><option value="">All</option>'+RS.map(s=>'<option value="'+s+'"'+(fl.rstatus===s?' selected':'')+'>'+RS_LABEL[s]+'</option>').join('')+'</select></label></div>'+tbl('All requests',c.map(k=>COLHEAD.requests[k]).concat(['']),p.slice.map(r=>reqRow(r,c)),'No requests yet.')+pager(p));}

function ordersScreen(){const groups={};for(const r of toOrder){const k=supplierOfReq(r)||'none';(groups[k]=groups[k]||[]).push(r);}
 const open=ORDERS.filter(o=>['ordered','partially_received'].includes(o.status)).sort((a,b)=>String(a.expected_on||'9999').localeCompare(String(b.expected_on||'9999')));
 const done=ORDERS.filter(o=>!['ordered','partially_received'].includes(o.status)).sort((a,b)=>String(b.ordered_on).localeCompare(String(a.ordered_on)));const p=paged(done);
 const orow=o=>{const rs=reqsOfOrder(o),late=lateOrders.includes(o);return '<tr><th scope="row"><button type="button" class="li-link" data-action="panel:order:'+esc(o.id)+'">'+esc(orgName(o.supplier_id)||'Supplier')+'</button><span class="li-sub">'+esc(o.order_number||'No order number')+'</span></th><td>'+esc(rs.map(reqItemName).join(', ')||'—')+'</td><td>'+esc(dateLabel(o.ordered_on))+'</td><td>'+esc(dateLabel(o.expected_on))+(late?' '+pill('Late','red'):'')+'</td><td class="num">'+esc(num(o.amount)===null?'—':money(num(o.amount),o.currency||CURRENCY))+'</td><td>'+statusPill(o.status)+'</td><td class="li-actions">'+(['ordered','partially_received'].includes(o.status)?bP('Receive','panel:receive:'+o.id,!canWrite('lots'),'aria-label="Receive order '+esc(o.order_number||orgName(o.supplier_id))+'"'):bS('Details','panel:order:'+o.id,false,'aria-label="Details order '+esc(o.order_number||'')+'"'))+'</td></tr>';};
 return heading()+checks()+
  panel('To order, by supplier','Approved requests. Order on the supplier\'s site or by your usual route, then log the order here. Nothing is sent from this app.',Object.keys(groups).length?Object.entries(groups).map(([k,rs])=>'<div class="li-group"><div class="li-group-head"><h3>'+esc(k==='none'?'No supplier on the item':orgName(k))+'</h3>'+bP('Log order','panel:neworder:'+k,!canWrite('orders'),'aria-label="Log order for '+esc(k==='none'?'items without supplier':orgName(k))+'"')+'</div><ul class="li-list">'+rs.map(r=>'<li>'+esc(reqItemName(r))+' × '+esc(qty(r.quantity))+' · '+esc(r.requested_by||'—')+(num(r.estimated_amount)!==null?' · '+esc(money(num(r.estimated_amount),CURRENCY)):'')+(r.urgency==='urgent'?' '+pill('Urgent','red'):'')+'</li>').join('')+'</ul></div>').join(''):'<p class="li-muted">'+esc(exact?'Nothing to order.':'Not known: some records could not be read.')+'</p>')+
  panel('Open orders','Receive in full or in part; each receipt creates lots with expiry and location.',tbl('Open orders',['Supplier','Items','Ordered','Expected','#Amount','Status',''],open.map(orow),'No open orders.'))+
  (lateOrders.length?panel('Late orders','Past the expected date and not fully received.',tbl('Late orders',['Supplier','Items','Ordered','Expected','#Amount','Status',''],lateOrders.map(orow))):'')+
  panel('Order history','Received and cancelled orders.',tbl('Order history',['Supplier','Items','Ordered','Expected','#Amount','Status',''],p.slice.map(orow),'No orders yet.')+pager(p));}

function locationsScreen(){const kids=id=>LOCS.filter(l=>(l.parent_id||'')===(id||'')&&(id||!l.parent_id||!LOC[l.parent_id])).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
 const lotsIn=id=>LOTSR.filter(l=>l.location_id===id&&inStock(l));
 const subtree=id=>{const out=[id];for(let i=0;i<out.length;i++)for(const c of LOCS.filter(l=>l.parent_id===out[i]))if(!out.includes(c.id))out.push(c.id);return out;};
 const node=(l,depth)=>{const c=kids(l.id),n=subtree(l.id).reduce((s,id)=>s+lotsIn(id).length,0);return '<li><div class="li-node'+(st.locId===l.id?' on':'')+'" style="--d:'+Math.min(depth,4)+'"><button type="button" class="li-link" data-action="open-loc:'+esc(l.id)+'">'+esc(l.name)+'</button><span class="li-sub">'+esc(cap(l.kind)+(l.temperature?' · '+l.temperature:'')+' · '+plural(n,'lot'))+'</span></div>'+(c.length&&depth<6?'<ul class="li-tree">'+c.map(x=>node(x,depth+1)).join('')+'</ul>':'')+'</li>';};
 const sel=LOC[st.locId]||null,content=sel?subtree(sel.id).flatMap(lotsIn):[];
 return heading()+checks()+'<div class="li-grid2">'+panel('Locations','Room → storage unit (freezer, fridge, cabinet) → shelf or box.',LOCS.length?'<ul class="li-tree root">'+kids('').map(l=>node(l,0)).join('')+'</ul>':'<p class="li-muted">No locations yet. Start with a room.</p>',bP('Add room','add:locations',!canWrite('locations'))+bS(icon('qr',15)+' Labels','labels:locations'))+
  (sel?panel(locPath(sel.id),cap(sel.kind)+(sel.temperature?' · '+sel.temperature:'')+' · '+plural(content.length,'lot')+' in stock here and inside',tbl('Contents of '+sel.name,['Item','Lot','#Quantity','Expires','Where'],content.sort(lotOrder).map(l=>{const it=ALLITEM[l.item_id];return '<tr><th scope="row"><button type="button" class="li-link" data-action="panel:item:'+esc(l.item_id)+'">'+esc(itemName(l.item_id)||'Unavailable item')+'</button></th><td>'+esc(l.lot_number||'—')+'</td><td class="num">'+esc(units(l.quantity,it))+'</td><td>'+esc(dateLabel(validDate(l.expires_on)))+(isExpired(l)?' '+pill('Expired','red'):'')+'</td><td>'+esc(l.location_id===sel.id?'Here':locPath(l.location_id).split(' › ').slice(-1)[0])+'</td></tr>';}),'Empty.')+
   '<div class="li-row">'+bS('Add inside','add:locations:'+sel.id,!canWrite('locations'))+bS('Edit','edit:locations:'+sel.id,!canWrite('locations'))+bS(icon('qr',15)+' QR label','labels:locations:'+sel.id)+bS('Archive','archive:locations:'+sel.id,!canWrite('locations')||content.length>0||LOCS.some(l=>l.parent_id===sel.id),content.length||LOCS.some(l=>l.parent_id===sel.id)?'title="Only empty locations can be archived"':'')+'</div>'):panel('Contents','Choose a location to see what is stored there.','<p class="li-muted">Nothing selected.</p>'))+'</div>';}

function csvOf(rows){return rows.map(r=>r.map(v=>{const t=String(v===null||v===undefined?'':v);return /[",\n;]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t;}).join(',')).join('\n');}
function settingsScreen(){const rep=['spend_program','spend_supplier','spend_month','waste','stock_value'].includes(st.filters.report)?st.filters.report:'spend_month';
 const main=SPEND.filter(x=>x.currency===CURRENCY),otherCur=SPEND.filter(x=>x.currency!==CURRENCY);const months=[];for(let i=11;i>=0;i--)months.push(addDays(AS_OF.slice(0,8)+'15',-30.44*i).slice(0,7));
 const W=wasteRows(),SV=stockValue();let table='',csv='';
 if(rep==='spend_program'){const xs=sumBy(main,'program');table=tbl('Spend by program',['Program','#Spend ('+CURRENCY+')'],xs.map(([k,v])=>'<tr><th scope="row">'+esc(progName(k)||'No program')+'</th><td class="num">'+esc(money(v))+'</td></tr>'),'No orders with amounts.');csv=csvOf([['program','amount','currency']].concat(xs.map(([k,v])=>[progName(k)||'No program',round2(v),CURRENCY])));}
 else if(rep==='spend_supplier'){const xs=sumBy(main,'supplier');table=tbl('Spend by supplier',['Supplier','#Spend ('+CURRENCY+')'],xs.map(([k,v])=>'<tr><th scope="row">'+esc(orgName(k)||'Unknown supplier')+'</th><td class="num">'+esc(money(v))+'</td></tr>'),'No orders with amounts.');csv=csvOf([['supplier','amount','currency']].concat(xs.map(([k,v])=>[orgName(k)||'Unknown supplier',round2(v),CURRENCY])));}
 else if(rep==='spend_month'){const by=Object.fromEntries(sumBy(main,'month')),max=Math.max(1,...months.map(m=>by[m]||0));table='<div class="li-bars" role="img" aria-label="Spend by month, last 12 months">'+months.map(m=>'<div class="li-bar"><span class="li-bar-fill" style="height:'+Math.round((by[m]||0)/max*100)+'%"></span><span class="li-bar-label">'+esc(MONTHS[Number(m.slice(5,7))-1])+'</span></div>').join('')+'</div>'+tbl('Spend by month',['Month','#Spend ('+CURRENCY+')'],months.map(m=>'<tr><th scope="row">'+esc(monthLabel(m))+'</th><td class="num">'+esc(money(by[m]||0))+'</td></tr>'));csv=csvOf([['month','amount','currency']].concat(months.map(m=>[m,round2(by[m]||0),CURRENCY])));}
 else if(rep==='waste'){const xs=W.slice().sort((a,b)=>b.month.localeCompare(a.month));const by={};for(const w of xs.filter(w=>w.currency===CURRENCY&&w.value!==null))by[w.month]=(by[w.month]||0)+w.value;
  table=tbl('Expiry waste by month',['Month','#Waste ('+CURRENCY+')'],Object.entries(by).sort((a,b)=>b[0].localeCompare(a[0])).map(([m,v])=>'<tr><th scope="row">'+esc(monthLabel(m))+'</th><td class="num">'+esc(money(v))+'</td></tr>'),'No waste recorded.')+tbl('Waste lines',['Month','Item','What','#Quantity','#Value'],xs.slice(0,30).map(w=>'<tr><td>'+esc(monthLabel(w.month))+'</td><th scope="row">'+esc(w.item.name)+'</th><td>'+esc(cap(w.kind))+'</td><td class="num">'+esc(units(w.qty,w.item))+'</td><td class="num">'+esc(w.value===null?'No price':money(w.value,w.currency))+'</td></tr>'),'No waste recorded.');
  csv=csvOf([['month','item','kind','quantity','unit','value','currency']].concat(xs.map(w=>[w.month,w.item.name,w.kind,w.qty,unitOf(w.item),w.value===null?'':round2(w.value),w.currency])));}
 else{const cats={};for(const it of ITEMS){const s=stockOf(it.id);if(!s||num(it.last_price)===null)continue;const c=CUR.includes(it.currency)?it.currency:CURRENCY,k=catName(it.category_id)+'|'+c;cats[k]=(cats[k]||0)+s*num(it.last_price);}
  table='<div class="li-kpis small">'+(Object.keys(SV.by).length?Object.entries(SV.by).map(([c,v])=>kpi('Stock value',money(v,c),'in-stock quantity × last price')).join(''):kpi('Stock value','—','no priced stock'))+'</div>'+tbl('Stock value by category',['Category','Currency','#Value'],Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<tr><th scope="row">'+esc(k.split('|')[0])+'</th><td>'+esc(k.split('|')[1])+'</td><td class="num">'+esc(money(v))+'</td></tr>'),'No priced stock.')+(SV.missing.length?'<p class="li-muted">'+plural(SV.missing.length,'item')+' in stock without a price are not valued: '+esc(SV.missing.slice(0,5).map(i=>i.name).join(', '))+'.</p>':'');
  csv=csvOf([['item','category','stock','unit','last_price','currency','value']].concat(ITEMS.filter(i=>stockOf(i.id)>0).map(i=>[i.name,catName(i.category_id),stockOf(i.id),unitOf(i),num(i.last_price)===null?'':i.last_price,i.currency||CURRENCY,num(i.last_price)===null?'':round2(stockOf(i.id)*num(i.last_price))])));}
 const dA=draftOf('approvals'),dG=draftOf('alerts'),dg=digest(),next=nextDigest();
 return heading()+checks()+
  panel('Reports','Spend by program, supplier and month (orders by ordered date, '+CURRENCY+'), expiry waste and stock value.'+(otherCur.length?' '+plural(otherCur.length,'order line')+' in other currencies are left out of these totals.':''),'<div class="li-toolbar"><label class="li-field" for="li-rep">Report<select id="li-rep" data-ui-state="true" data-action="filter:report">'+[['spend_month','Spend by month'],['spend_program','Spend by program'],['spend_supplier','Spend by supplier'],['waste','Expiry waste'],['stock_value','Stock value']].map(([k,l])=>'<option value="'+k+'"'+(rep===k?' selected':'')+'>'+l+'</option>').join('')+'</select></label></div>'+table+'<label class="li-field wide" for="li-csv">CSV export (copy into a .csv file; custom apps cannot start a download)<textarea class="li-textarea mono" id="li-csv" name="csv_export" data-ui-state="true" data-action="csv" readonly rows="6">'+esc(csv)+'</textarea></label>')+
  '<div class="li-grid2">'+panel('Categories','Standard categories come with the app; add your own. Archived categories stay on their items.',(CATS.length?'<ul class="li-chips">'+CATS.slice().sort((a,b)=>(b.standard?1:0)-(a.standard?1:0)||String(a.name).localeCompare(String(b.name))).map(c=>'<li>'+esc(c.name)+(bool(c.standard)?' <span class="li-sub">Standard</span>':' '+bS('Archive','archive:categories:'+c.id,!canWrite('categories'),'aria-label="Archive category '+esc(c.name)+'"'))+'</li>').join('')+'</ul>':'<p class="li-muted">No categories yet.</p>')+
   (STANDARD_CATEGORIES.some(n=>!R.categories.allRows.some(c=>same(c.data.name,n)))?'<p>'+bP('Add the standard categories','setup-categories',!canWrite('categories'))+' <span class="li-muted">'+esc(STANDARD_CATEGORIES.join(', '))+'</span></p>':'')+
   '<form data-action="add-category" class="li-row">'+field('category','name','New category','',{placeholder:'For example Primers'})+submit('Add category',canWrite('categories'),'li-btn')+'</form>')+
  panel('Units and QR labels','Units offered for items, and the app link used in QR codes.','<form data-action="save-general"><div class="li-form">'+field('general','units','Units (comma-separated)',UNITS.join(', '),{wide:true})+field('general','app_link','App link for QR codes',SET.app_link||'',{wide:true,hint:'Open Lab Inventory in TrialAgents and copy the address from the browser. QR codes open the item page or the location with it.'})+'</div>'+submit('Save (reviewed)',!!settingsRow&&canWrite('settings'))+'</form>')+'</div>'+
  '<div class="li-grid2">'+panel('Approvals','One approver; above the threshold a second approver; a program approver replaces the default for that program. Nobody approves their own request.','<form data-action="save-approvals"><div class="li-form">'+field('approvals','approver','Approver (lab manager)',APPROVER,{required:true})+field('approvals','second_approver','Second approver above the threshold',SECOND,{list:'li-people'})+field('approvals','threshold_amount','Threshold amount',THRESHOLD===null?'':THRESHOLD,{type:'number',min:0,hint:'Blank: one approval for every amount.'})+field('approvals','currency','Currency',CURRENCY,{type:'select',options:CUR.map(c=>[c,c])})+
   (R.programs.unbound?'<p class="li-muted wide">Per-program approvers need a programs table (connect Programs at install).</p>':PROGRAMS.map(p=>field('approvals','pa_'+p.id,'Approver for '+progName(p.id),PROGRAM_APPROVERS[p.id]||'',{list:'li-people'})).join(''))+'</div>'+submit('Save (reviewed)',canWrite('settings'))+'</form>')+
  panel('Alerts and digest','Expiry window, and the digest email sent by TrialAgents Automations.','<form data-action="save-alerts"><div class="li-form">'+field('alerts','expiry_window_days','Expiry window (days)',WINDOW,{type:'number',min:1,max:365})+field('alerts','digest_cadence','Digest cadence',CADENCE,{type:'select',options:opts(CAD)})+field('alerts','digest_day','Day (weekly)',DDAY,{type:'select',options:opts(DAYS,DAY_LABEL)})+field('alerts','digest_time','Time',DTIME,{placeholder:'08:00'})+field('alerts','digest_recipients','Recipients (workspace members)',SET.digest_recipients||'',{wide:true,hint:'Names of members who get the digest; the automation lists them as recipients.'})+field('alerts','digest_text','Digest text',DTEXT,{type:'textarea',wide:true})+'</div>'+submit('Save (reviewed)',!!settingsRow&&canWrite('settings'))+'</form>'+
   '<h3 class="li-h3">Next digest</h3><p class="li-muted">'+esc(CADENCE==='daily'?'Every day at '+DTIME:CADENCE==='weekly'?'Every '+DAY_LABEL[DDAY]+' at '+DTIME+' · next '+dateLabel(next):'On the 1st of each month at '+DTIME+' · next '+dateLabel(next))+'. Empty sections are left out.</p><pre class="li-digest" data-digest="'+(dg.empty?'empty':'ready')+'" aria-label="Digest preview">'+esc(dg.text)+'</pre>')+'</div>'+
  panel('Access, assistants and automations','','<ul class="li-list plain"><li><strong>Access</strong>: TrialAgents → Access → this app. Everyone with access can request and record use; approvers are named above; settings are for the app owner and admins.</li><li><strong>Assistants</strong> (Claude or ChatGPT) turn chat, pasted order confirmations, label photos and lists into proposed items, lots, requests and movements, suggest reorders and summarise spend. Every write is a review a person confirms. They never approve and never contact suppliers.</li><li><strong>Automations</strong> (TrialAgents → Automations, all optional): the digest, approval requests to the approver and status updates to requesters. Archiving the app pauses them.</li></ul>');}

function sidePanel(){const x=st.panel;if(!x)return '';
 if(x.type==='item'){const it=ITEM[x.id];return it?itemPanel(it):'';}
 if(x.type==='lot'){const it=ITEM[x.id];if(!it)return '';return drawer('Add a lot of '+it.name,'Stock received outside an order',reviewNote+'<div class="li-pair">'+field('lot','quantity','Quantity ('+unitOf(it)+')','',{type:'number',min:0,required:true})+field('lot','lot_number','Lot number','')+field('lot','expires_on','Expires on','',{type:'date'})+field('lot','received_on','Received on',AS_OF,{type:'date'})+field('lot','location_id','Location',it.default_location_id||'',{type:'select',blank:'Choose',options:locOptions(),required:true})+field('lot','owner','Owner',st.me,{list:'li-people'})+'</div><p class="li-muted">The received movement follows in a second review, once the lot exists.</p>',btn('Cancel','close')+submit('Add lot (reviewed)',canWrite('lots')),'save-lot');}
 if(x.type==='count'){const l=LOT[x.id],it=l&&ALLITEM[l.item_id];if(!l)return '';return drawer('Quick count','Lot '+(l.lot_number||'—')+' of '+(it?it.name:'item'),reviewNote+kv('Recorded',units(l.quantity,it))+'<div class="li-pair">'+field('count','quantity','Counted quantity',num(l.quantity,0),{type:'number',min:0,required:true})+field('count','note','Note','')+'</div><p class="li-muted">The difference is logged as a count movement.</p>',btn('Cancel','close')+submit('Save count (reviewed)',canWrite('lots')),'save-count');}
 if(x.type==='move'){const l=LOT[x.id],it=l&&ALLITEM[l.item_id];if(!l)return '';return drawer('Move lot','Lot '+(l.lot_number||'—')+' of '+(it?it.name:'item'),reviewNote+kv('Now in',locPath(l.location_id))+field('move','location_id','New location','',{type:'select',blank:'Choose',options:locOptions().filter(o=>o[0]!==l.location_id)}),btn('Cancel','close')+submit('Move (reviewed)',canWrite('lots')),'save-move');}
 if(x.type==='newrequest'){const d=draftOf('newrequest');if(x.id&&!has(d,'item_id'))d.item_id=x.id;const r=draftOf('request');if(!has(r,'item_id')&&x.id)r.item_id=x.id;const it=ITEM[r.item_id],s=it?suggestion(it):null;
  return drawer('New request','Stock is checked before you submit',reviewNote+(st.me?'':'<div class="li-banner warn">Enter your name at the top first; it is recorded as the requester.</div>')+'<div class="li-pair">'+field('request','item_id','Item',r.item_id||'',{type:'select',blank:'New item (describe below)',options:itemOptions()})+(it?'':field('request','new_item_name','New item (name, supplier, catalog number)','',{}))+field('request','quantity','Quantity'+(it?' ('+unitOf(it)+')':''),has(r,'quantity')?r.quantity:s?s.qty:1,{type:'number',min:0,required:true})+(R.programs.unbound?'':field('request','program_id','Program',it&&it.program_id||'',{type:'select',blank:'None',options:PROGRAMS.map(p=>[p.id,progName(p.id)])}))+field('request','urgency','Urgency','normal',{type:'select',options:opts(URG)})+field('request','estimated_amount','Estimated amount ('+CURRENCY+')',it&&num(it.last_price)!==null?round2(num(it.last_price)*num(has(r,'quantity')?r.quantity:s?s.qty:1,1)):'',{type:'number',min:0,hint:it&&num(it.last_price)!==null?'From the last price; change it if you know better.':''})+field('request','note','Note','',{type:'textarea',wide:true})+'</div>'+stockCheck(r.item_id,r.new_item_name),btn('Cancel','close')+submit('Submit request (reviewed)',canWrite('requests')),'save-request');}
 if(x.type==='request'){const r=REQ[x.id];if(!r)return '';const it=ALLITEM[r.item_id],a=approvalState(r),o=orderOfReq(r),names=[...new Set([a.who,APPROVER,SECOND,...Object.values(PROGRAM_APPROVERS),r.requested_by,st.me].filter(Boolean))];
  const d=draftOf('decide');if(!has(d,'as'))d.as=st.me&&names.some(n=>same(n,st.me))?names.find(n=>same(n,st.me)):a.who||'';
  const steps=[['requested','Requested',r.requested_on],['approved','Approved',r.decision_on&&r.status!=='rejected'?r.decision_on:''],['ordered','Ordered',o?o.ordered_on:''],['received','Received','']],at=RS.indexOf(r.status);
  return drawer(reqItemName(r)+' × '+(it?units(r.quantity,it):qty(r.quantity)),'Request by '+(r.requested_by||'—')+' · '+dateLabel(r.requested_on),
   '<ol class="li-timeline">'+steps.map(([k,l,dt],i)=>'<li class="'+(r.status==='rejected'||r.status==='cancelled'?(i===0?'done':''):(['requested','approved','ordered','received'].indexOf(r.status)>=i?'done':''))+'">'+esc(l)+(dt?' · '+esc(shortDate(dt)):'')+'</li>').join('')+(r.status==='rejected'?'<li class="bad">Rejected: '+esc(r.reject_reason||'')+'</li>':r.status==='cancelled'?'<li class="bad">Cancelled</li>':'')+'</ol>'+
   '<div class="li-kvs">'+kv('Program',progName(r.program_id)||'—')+kv('Urgency',cap(r.urgency||'normal'))+kv('Estimated amount',num(r.estimated_amount)===null?'—':money(num(r.estimated_amount),CURRENCY))+kv('Approvals needed',needsSecond(r)?'Two (above '+money(THRESHOLD,CURRENCY)+')':'One')+kv('First approval',r.approved_1_by||'—')+kv('Second approval',needsSecond(r)?r.approved_2_by||'—':'Not needed')+kv('Order',o?(orgName(o.supplier_id)||'')+' '+(o.order_number||''):'—')+'</div>'+
   (['approved','ordered','received'].includes(r.status)&&!a.valid?'<div class="li-banner bad">This request is marked '+esc(r.status)+' without valid approvals.</div>':'')+
   stockCheck(r.item_id,r.new_item_name||r.item_name)+(r.note?'<h3 class="li-h3">Notes and questions</h3><pre class="li-note">'+esc(r.note)+'</pre>':'')+
   (r.status==='requested'||r.status==='approved'?'<h3 class="li-h3">'+(r.status==='requested'?(a.step===2?'Second approval':'Decision')+(a.who?' · for '+esc(a.who):''):'Requester')+'</h3><div class="li-pair">'+field('decide','as','Acting as',d.as,{type:'select',blank:'Choose',options:names.map(n=>[n,n+(same(n,r.requested_by)?' (requester)':'')])})+field('decide','reason','Reason (for a rejection)','')+field('decide','question','Question to the requester','',{wide:true})+'</div>':''),
   r.status==='requested'?'<div class="li-row">'+[['approve','Approve'],['reject','Reject'],['ask','Ask a question'],['cancel','Cancel request']].map(([k,t])=>'<button type="submit" name="step" value="'+k+'" class="li-btn'+(k==='approve'?' li-btn-primary':'')+'"'+(canWrite('requests')?'':' disabled')+'>'+esc(t)+'</button>').join('')+'</div>':r.status==='approved'?'<div class="li-row">'+btn('Close','close')+'<button type="submit" name="step" value="cancel" class="li-btn"'+(canWrite('requests')?'':' disabled')+'>Cancel request</button></div>':btn('Close','close'),r.status==='requested'||r.status==='approved'?'decide':null,true);}
 if(x.type==='neworder'){const pre=x.id;const d=draftOf('order');if(!has(d,'supplier_id'))d.supplier_id=pre&&pre!=='none'?pre:'';const ags=AGREEMENTS.filter(a=>a.counterparty_id===d.supplier_id);
  return drawer('Log an order','Track only: order with the supplier as usual, then record it here',reviewNote+'<fieldset class="li-fieldset"><legend>Approved requests in this order</legend>'+toOrder.map(r=>field('order','r_'+r.id,reqItemName(r)+' × '+qty(r.quantity)+' · '+(r.requested_by||'—')+(supplierOfReq(r)?' · '+orgName(supplierOfReq(r)):''),(supplierOfReq(r)||'none')===pre,{type:'checkbox',wide:true})).join('')+'</fieldset>'+
   '<div class="li-pair">'+field('order','supplier_id','Supplier',d.supplier_id,{type:'select',blank:'Choose',options:supplierOptions(),required:true})+field('order','order_number','Order number','')+field('order','ordered_on','Ordered on',AS_OF,{type:'date'})+field('order','expected_on','Expected on','',{type:'date'})+field('order','amount','Amount','',{type:'number',min:0})+field('order','currency','Currency',CURRENCY,{type:'select',options:CUR.map(c=>[c,c])})+field('order','notes','Notes','',{type:'textarea',wide:true})+'</div>'+
   '<p class="li-row">'+bS('Add a supplier','add:organizations',!canWrite('organizations'))+'</p>'+(ags.length?'<h3 class="li-h3">Supplier agreements (from Contracts)</h3><ul class="li-list">'+ags.map(a=>'<li>'+esc(a.name)+' · '+esc(label(a.agreement_type))+' · '+esc(label(a.status))+(a.expiry_date?' · until '+esc(dateLabel(validDate(a.expiry_date))):'')+'</li>').join('')+'</ul>':''),btn('Cancel','close')+submit('Log order (reviewed)',canWrite('orders')),'save-order',true);}
 if(x.type==='order'){const o=ORDER[x.id];if(!o)return '';const rs=reqsOfOrder(o),ags=AGREEMENTS.filter(a=>a.counterparty_id===o.supplier_id);
  return drawer((orgName(o.supplier_id)||'Order')+(o.order_number?' · '+o.order_number:''),OS_LABEL[o.status]||o.status,'<div class="li-kvs">'+kv('Ordered',dateLabel(o.ordered_on)+' by '+(o.ordered_by||'—'))+kv('Expected',dateLabel(o.expected_on))+kv('Amount',num(o.amount)===null?'—':money(num(o.amount),o.currency||CURRENCY))+'</div>'+tbl('Lines',['Item','#Ordered','#Received','Requested by'],rs.map(r=>'<tr><th scope="row">'+esc(reqItemName(r))+'</th><td class="num">'+esc(qty(r.quantity))+'</td><td class="num">'+esc(qty(r.item_id?receivedFor(o,r.item_id):0))+'</td><td>'+esc(r.requested_by||'—')+'</td></tr>'))+(ags.length?'<h3 class="li-h3">Supplier agreements</h3><ul class="li-list">'+ags.map(a=>'<li>'+esc(a.name)+' · '+esc(label(a.status))+'</li>').join('')+'</ul>':'')+(o.notes?'<p>'+esc(o.notes)+'</p>':''),btn('Close','close')+(o.status==='ordered'?bS('Cancel order','cancel-order:'+o.id,!canWrite('orders')):'')+(['ordered','partially_received'].includes(o.status)?bP('Receive','panel:receive:'+o.id,!canWrite('lots')):''),null,true);}
 if(x.type==='receive'){const o=ORDER[x.id];if(!o)return '';const rs=reqsOfOrder(o).filter(r=>r.status!=='received'&&r.status!=='cancelled');
  return drawer('Receive '+(orgName(o.supplier_id)||'order')+(o.order_number?' '+o.order_number:''),'Full or partial; each line with a quantity becomes a lot',reviewNote+rs.map(r=>{const it=ITEM[r.item_id],got=it?receivedFor(o,it.id):0,left=Math.max(0,round2(num(r.quantity,0)-got));
   return '<fieldset class="li-fieldset"><legend>'+esc(reqItemName(r))+' · ordered '+esc(qty(r.quantity))+(got?', received '+esc(qty(got)):'')+'</legend><div class="li-pair">'+(it?'':field('receive','i_'+r.id,'Catalog item (add it first if new)','',{type:'select',blank:'Choose',options:itemOptions()}))+field('receive','q_'+r.id,'Received now',left,{type:'number',min:0})+field('receive','n_'+r.id,'Lot number','')+field('receive','e_'+r.id,'Expires on','',{type:'date'})+field('receive','l_'+r.id,'Location',it&&it.default_location_id||'',{type:'select',blank:'Choose',options:locOptions()})+field('receive','p_'+r.id,'Unit price (optional)',it&&num(it.last_price)!==null?it.last_price:'',{type:'number',min:0})+'</div></fieldset>';}).join('')+(rs.some(r=>!ITEM[r.item_id])?'<p class="li-row">'+bS('Add a new item to the catalog','add:items',!canWrite('items'))+'</p>':'')+'<p class="li-muted">Your assistant can fill this from a pasted confirmation or a label photo; you review it.</p>',btn('Cancel','close')+submit('Receive (reviewed)',canWrite('lots')),'receive',true);}
 return '';}
function editorPanel(){const x=st.editor;if(!x)return '';const role=x.role,d=x.draft;
 const ctl=f=>{const a='draft:'+f.key,id='li-e-'+f.key,c=' id="'+id+'" name="'+f.key+'" data-ui-state="true" data-action="'+a+'"',v=d[f.key]===null||d[f.key]===undefined?'':d[f.key];
  if(f.key==='unit')return '<select'+c+'>'+[...new Set(UNITS.concat(v?[String(v)]:[]))].map(u=>'<option value="'+esc(u)+'"'+(String(v)===u?' selected':'')+'>'+esc(u)+'</option>').join('')+'</select>';
  if(f.kind==='select')return '<select'+c+'>'+(f.required?'':'<option value="">—</option>')+f.options.map(o=>'<option value="'+esc(o)+'"'+(String(v)===o?' selected':'')+'>'+esc(cap(o))+'</option>').join('')+'</select>';
  if(f.kind==='ref'){const rows=f.ref==='locations'?locOptions():f.ref==='organizations'?supplierOptions():R[f.ref].rows.map(r=>[r.id,String(r.data.name||'Unnamed')]);return '<select'+c+'><option value="">—</option>'+rows.filter(o=>!(role==='locations'&&o[0]===x.id)).map(o=>'<option value="'+esc(o[0])+'"'+(v===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select>';}
  if(f.kind==='boolean')return '<input type="checkbox"'+c+(bool(v)?' checked':'')+'>';
  if(f.kind==='longtext')return '<textarea class="li-textarea"'+c+'>'+esc(v)+'</textarea>';
  return '<input class="li-input" type="'+(f.kind==='number'?'number':f.kind==='date'?'date':'text')+'"'+(f.kind==='number'?' step="any" min="0"':'')+c+' value="'+esc(v)+'">';};
 const fs=editable(role).filter(f=>!(x.mode==='create'&&has(x.fixed,f.key))&&!(f.ref&&R[f.ref].unbound));
 const dup=role==='items'&&x.mode==='create'?'<label class="li-check" for="li-e-confirm_duplicate"><input type="checkbox" id="li-e-confirm_duplicate" name="confirm_duplicate" data-ui-state="true" data-action="draft:confirm_duplicate"'+(bool(d.confirm_duplicate)?' checked':'')+'><span>Add anyway if a similar item exists</span></label>':'';
 return drawer((x.mode==='create'?'New ':'Edit ')+ROLE_LABEL[role],'Reviewed data change',reviewNote+'<div class="li-pair">'+fs.map(f=>f.kind==='boolean'?'<label class="li-check" for="li-e-'+f.key+'">'+ctl(f)+'<span>'+esc(f.label)+'</span></label>':'<label class="li-field'+(f.kind==='longtext'?' wide':'')+'" for="li-e-'+f.key+'">'+esc(f.label)+(f.required?' *':'')+ctl(f)+'</label>').join('')+dup+'</div>',btn('Cancel','close')+submit('Save (reviewed)',canWrite(role)),'save-record');}

/* QR label sheets: A4 (3 × 7, 63.5 × 38.1 mm) and Letter (2 × 5, 4 × 2 in). One sheet per screen keeps the page within the frame limit. */
const PAPER={a4:{name:'A4 · 21 labels (63.5 × 38.1 mm, L7160 layout)',w:'210mm',h:'297mm',cols:3,rows:7,lw:'63.5mm',lh:'38.1mm',top:'15.15mm',left:'7.2mm',gx:'2.5mm',gy:'0mm'},letter:{name:'Letter · 10 labels (4 × 2 in, 5163 layout)',w:'8.5in',h:'11in',cols:2,rows:5,lw:'4in',lh:'2in',top:'0.5in',left:'0.156in',gx:'0.188in',gy:'0in'}};
function labelsView(){const L=st.labels,kind=L.kind,pool=kind==='locations'?LOCS:ITEMS,P=PAPER[L.paper]||PAPER.a4;
 if(!L.ids.length)return heading('Choose what to print, then the paper.')+panel('Print QR labels',kind==='locations'?'Shelves, boxes and storage units':'Items','<form data-action="make-labels"><div class="li-form">'+field('labels','paper','Paper','a4',{type:'select',options:[['a4',PAPER.a4.name],['letter',PAPER.letter.name]]})+'</div><fieldset class="li-fieldset"><legend>'+(kind==='locations'?'Locations':'Items')+' (up to 63)</legend><div class="li-checks">'+pool.slice().sort((a,b)=>(kind==='locations'?locPath(a.id).localeCompare(locPath(b.id)):String(a.name).localeCompare(String(b.name)))).slice(0,200).map(x=>field('labels','x_'+x.id,kind==='locations'?locPath(x.id):x.name,false,{type:'checkbox'})).join('')+'</div></fieldset><div class="li-row">'+btn('Cancel','close')+submit('Show label sheet',true)+'</div></form>');
 const per=P.cols*P.rows,sheets=Math.max(1,Math.ceil(L.ids.length/per)),sh=Math.min(L.sheet||0,sheets-1),ids=L.ids.slice(sh*per,(sh+1)*per);
 const cells=ids.map(id=>{const x=kind==='locations'?LOC[id]:ITEM[id];if(!x)return '<div class="li-label"></div>';const link=linkFor(kind==='locations'?'/locations':'/item',id);
  return '<div class="li-label">'+(link?qrSvg(link,'QR code for '+(x.name||'')):'<div class="li-qr li-qr-none">Add the app link in Settings for a QR code</div>')+'<div class="li-label-text"><strong>'+esc(kind==='locations'?x.name:x.name)+'</strong><span>'+esc(kind==='locations'?cap(x.kind)+(x.temperature?' · '+x.temperature:''):[catName(x.category_id),x.catalog_number].filter(x=>x&&x!=='—').join(' · '))+'</span><span>'+esc(kind==='locations'?locPath(id):x.default_location_id?locPath(x.default_location_id):'')+'</span></div></div>';}).join('');
 return '<div class="li-noprint">'+heading('Print with your browser (Ctrl+P or ⌘P), scale 100%, no margins. Only the sheet is printed.')+(APP_LINK?'':'<div class="li-banner warn">QR codes need the app link: Reports & settings → Units and QR labels.</div>')+'<div class="li-toolbar"><label class="li-field" for="li-paper">Paper<select id="li-paper" data-ui-state="true" data-action="labels-paper">'+[['a4',PAPER.a4.name],['letter',PAPER.letter.name]].map(([k,l])=>'<option value="'+k+'"'+(L.paper===k?' selected':'')+'>'+esc(l)+'</option>').join('')+'</select></label>'+bS('Previous sheet','labels-prev',sh===0)+'<span>Sheet '+(sh+1)+' of '+sheets+'</span>'+bS('Next sheet','labels-next',sh>=sheets-1)+btn('Done','close','li-btn li-btn-primary')+'</div></div>'+
  '<div class="li-sheet-scroll" role="region" aria-label="Label sheet preview" tabindex="0"><div class="li-sheet" data-paper="'+esc(L.paper)+'" style="width:'+P.w+';height:'+P.h+';padding:'+P.top+' 0 0 '+P.left+';grid-template-columns:repeat('+P.cols+','+P.lw+');grid-auto-rows:'+P.lh+';column-gap:'+P.gx+';row-gap:'+P.gy+'">'+cells+'</div></div>';}

const rail='<aside class="li-rail"><div class="li-brand"><strong>Lab Inventory</strong><span>Stock, requests and orders</span></div><nav class="li-nav" aria-label="Lab Inventory screens">'+sections.map(s=>btn('<span class="li-ico">'+icon(s.id)+'</span><span class="li-nav-label">'+esc(s.label)+'</span>','nav:'+s.id,'',false,'aria-current="'+(st.section===s.id&&!st.labels?'page':'false')+'" aria-label="'+esc(s.label)+'"')).join('')+'</nav><div class="li-rail-foot">'+esc(cfg.demoLabel?'Fictional demo data':'Authorized records only')+'<br>'+esc(plural(ITEMS.length,'item')+' · '+plural(LOTSR.filter(inStock).length,'lot')+' in stock')+'</div></aside>';
let main='';try{main=st.labels?labelsView():({overview,inventory:inventoryScreen,requests:requestsScreen,orders:ordersScreen,locations:locationsScreen,settings:settingsScreen,item:itemPage})[st.section]();}catch(e){main=heading()+'<div class="li-banner bad" role="alert">This screen could not be shown: '+esc(String(e&&e.message||e))+'</div>';}
let overlays='';try{overlays=editorPanel()||sidePanel();}catch(e){overlays='';note('This panel could not be shown: '+String(e&&e.message||e).slice(0,300));}
const notice=st.notice?'<div class="li-banner'+(failed?' bad':'')+' li-notice" role="'+(failed?'alert':'status')+'"><span>'+esc(st.notice)+'</span>'+bS('Dismiss','clear-notice')+'</div>':'';
const previewNote=!inp.saved?'<div class="li-banner">Preview: save the app to record stock, requests and orders. A preview never writes to your workspace.</div>':'';
const mobileItem=st.section==='item'&&!st.labels;
const html='<div class="li-shell'+(mobileItem?' li-shell-item':'')+'"'+(overlays?' inert':'')+'>'+(mobileItem?'':rail)+'<main class="li-main">'+previewNote+notice+main+'<p class="li-foot li-noprint">'+(cfg.demoLabel?'Fictional records. This preview creates nothing.':'Orders are tracked only: nothing is sent to suppliers. Every change is reviewed in TrialAgents before it is saved.')+'</p></main></div>'+overlays;
const css=typeof LABINVENTORY_CSS==='string'?LABINVENTORY_CSS:'';
return {html,css,state:st};
