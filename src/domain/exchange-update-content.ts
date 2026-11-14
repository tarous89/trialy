import {z} from 'zod';
import {fail} from '../shared/schema.js';

/**
 * Update extension of external exchanges (docs/product/EXTERNAL_EXCHANGE.md §6, U1–U3): the rendered
 * content an app's block renderer produces, made safe once and rendered three ways from the same tree:
 * the online page, the email-safe HTML body and the plain-text part. The app never supplies free HTML
 * to recipients: input is parsed into tokens, and output is rebuilt only from allowlisted tags,
 * attributes and CSS declarations, with every text and attribute value escaped. Anything else is
 * dropped (with its content for scripts, styles, frames, forms and embedded documents).
 *
 * Images are platform documents written as `<img src="doc:<versionId>">`. Asks are declared beside
 * the HTML ({key,text}) and placed with a top-level `<div data-ask="key"></div>`; TrialAgents renders
 * the "I can help" control there (a button online, a link in email). Declared asks without a marker
 * follow the content.
 */
export const askKey=z.string().regex(/^[a-z][a-z0-9_]{0,39}$/,'Use ask keys like cmo_intro');
export const askSchema=z.object({key:askKey,text:z.string().trim().min(1).max(1000)}).strict();
export const contentSchema=z.object({
 html:z.string().min(1).max(200000),
 text:z.string().trim().min(1).max(100000).optional(),
 asks:z.array(askSchema).max(20).default([]),
 confidentiality:z.string().trim().max(2000).optional(),
 preheader:z.string().trim().max(200).optional()
}).strict();
export type ContentInput=z.input<typeof contentSchema>;
export const MAX_CONTENT_HTML=80000;
/** Width of the email body column: 600 px less 24 px padding on each side. */
export const CONTENT_WIDTH=552;
export const DEFAULT_CONFIDENTIALITY='This update is confidential and intended only for {recipient_name}. Please do not forward it.';

type Attrs=Record<string,string>;
export type Node={tag:string;attrs:Attrs;children:Child[]};
export type Child=Node|string|{ask:string};
const isNode=(c:Child):c is Node=>typeof c==='object'&&'tag' in c;
const isAsk=(c:Child):c is {ask:string}=>typeof c==='object'&&'ask' in c;

const ALLOWED=new Set(['h1','h2','h3','h4','h5','h6','p','br','hr','strong','b','em','i','u','s','sub','sup','small','span','div','a','ul','ol','li','blockquote','table','thead','tbody','tfoot','tr','th','td','caption','img','figure','figcaption','code','pre']);
const VOID=new Set(['br','hr','img','input','meta','link','base','col','source','track','wbr','area','param','embed','keygen']);
/** Dropped with everything inside them. */
const DROP=new Set(['script','style','template','noscript','iframe','frame','frameset','object','embed','applet','svg','math','form','button','select','textarea','option','video','audio','canvas','head','title','meta','link','base','input','map','dialog','portal','xmp','noembed','noframes','plaintext']);
const BLOCKS=new Set(['p','div','h1','h2','h3','h4','h5','h6','ul','ol','table','blockquote','pre','figure','hr']);
const RAW=new Set(['script','style','template','noscript','iframe','textarea','title','xmp','noembed','noframes']);
const ATTRS:Record<string,string[]>={'*':['style'],a:['href','title'],img:['src','alt','width','height'],td:['colspan','rowspan','width','align','valign'],th:['colspan','rowspan','width','align','valign','scope'],table:['width','align'],ol:['start'],p:['align'],div:['align','data-ask'],h1:['align'],h2:['align'],h3:['align'],h4:['align']};
const CSS=new Set(['color','background-color','font-weight','font-style','font-size','font-family','line-height','letter-spacing','text-align','text-decoration','text-transform','vertical-align','white-space','padding','padding-top','padding-right','padding-bottom','padding-left','margin','margin-top','margin-right','margin-bottom','margin-left','border','border-top','border-right','border-bottom','border-left','border-color','border-width','border-style','border-collapse','border-spacing','width','height']);
const ENTITIES:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',copy:'©',reg:'®',trade:'™',hellip:'…',mdash:'—',ndash:'–',lsquo:'‘',rsquo:'’',ldquo:'“',rdquo:'”',bull:'•',middot:'·',euro:'€',pound:'£',yen:'¥',times:'×',divide:'÷',deg:'°',plusmn:'±',micro:'µ',para:'¶',sect:'§',laquo:'«',raquo:'»',rarr:'→',larr:'←',uarr:'↑',darr:'↓',check:'✓',le:'≤',ge:'≥',ne:'≠',asymp:'≈',alpha:'α',beta:'β',gamma:'γ',delta:'δ',mu:'μ'};
export const decode=(s:string)=>s.replace(/&(#x[0-9a-f]{1,6}|#[0-9]{1,7}|[a-z][a-z0-9]{1,31});?/gi,(m,e:string)=>{
 if(e[0]==='#'){const n=e[1]==='x'||e[1]==='X'?parseInt(e.slice(2),16):parseInt(e.slice(1),10);return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'�';}
 return ENTITIES[e.toLowerCase()]??m;});
export const escapeText=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
export const escapeAttr=(s:string)=>escapeText(s).replace(/"/g,'&quot;');
// eslint-disable-next-line no-control-regex
const controls=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

/** A safe inline style: allowlisted properties with plain values (no url(), expressions, imports, escapes or semi-transparent colours Outlook ignores). */
export function cleanStyle(style:string){
 const out:string[]=[];
 for(const decl of style.split(';')){const i=decl.indexOf(':');if(i<0)continue;const prop=decl.slice(0,i).trim().toLowerCase();let value=decl.slice(i+1).trim().replace(/\s*!important\s*$/i,'');
  if(!CSS.has(prop)||!value||value.length>200)continue;
  if(/url\s*\(|expression|javascript|vbscript|@|\\|\/\*|<|>|var\s*\(|calc\s*\(|attr\s*\(|rgba\s*\(|hsla?\s*\(|[{}]/i.test(value))continue;
  if(!(prop==='font-family'?/^[-a-zA-Z0-9 ,'"]+$/:/^[-#a-zA-Z0-9 .,%()]+$/).test(value))continue;
  // Nothing wider than the email column: fixed widths beyond it become fluid.
  if(prop==='width'){const px=value.match(/^(\d+(?:\.\d+)?)px$/);if(px&&Number(px[1])>CONTENT_WIDTH)value='100%';else if(!/^\d+(\.\d+)?(px|%)$|^auto$/.test(value))continue;}
  out.push(`${prop}:${value}`);}
 return out.join(';');
}
const safeHref=(href:string)=>{const h=href.trim().replace(controls,'');if(/^https:\/\/[^\s"'<>]+$/i.test(h)||/^mailto:[^\s"'<>]+$/i.test(h))return h;return null;};
const docSrc=(src:string)=>src.trim().match(/^doc:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)?.[1]?.toLowerCase()??null;

type Token={type:'text';value:string}|{type:'start';name:string;attrs:Attrs;self:boolean}|{type:'end';name:string};
/** Tokens of an HTML string; anything that is not a well-formed tag is text (and is escaped on output). */
function tokenize(html:string):Token[]{
 const tokens:Token[]=[],src=html.replace(controls,'').replace(/\r\n?/g,'\n');let i=0;
 const text=(v:string)=>{if(v)tokens.push({type:'text',value:decode(v)});};
 while(i<src.length){
  const lt=src.indexOf('<',i);if(lt<0){text(src.slice(i));break;}text(src.slice(i,lt));i=lt;
  if(src.startsWith('<!--',i)){const end=src.indexOf('-->',i+4);i=end<0?src.length:end+3;continue;}
  if(/^<[!?]/.test(src.slice(i,i+2))){const end=src.indexOf('>',i);i=end<0?src.length:end+1;continue;}
  const close=src.slice(i).match(/^<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>/);if(close){tokens.push({type:'end',name:close[1]!.toLowerCase()});i+=close[0].length;continue;}
  const open=src.slice(i).match(/^<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/);
  if(!open){text('<');i++;continue;}
  const name=open[1]!.toLowerCase(),attrs:Attrs={};
  for(const m of open[2]!.matchAll(/([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)){const k=m[1]!.toLowerCase();if(!(k in attrs))attrs[k]=decode(m[2]??m[3]??m[4]??'');}
  tokens.push({type:'start',name,attrs,self:!!open[3]});i+=open[0].length;
  // Raw-text elements: their content is never markup, and is dropped with them.
  if(RAW.has(name)&&!open[3]){const end=src.slice(i).search(new RegExp(`</${name}\\s*>`,'i'));i=end<0?src.length:i+end;}
 }
 return tokens;
}

export type Sanitised={nodes:Child[];images:string[];asks:string[];removed:string[]};
/** Parse and rebuild: allowlisted structure only. Throws for asks that are nested, duplicated or undeclared. */
export function sanitise(html:string,declared:string[]=[]):Sanitised{
 const root:Node={tag:'#root',attrs:{},children:[]},stack:Node[]=[root],images:string[]=[],asks:string[]=[],removed=new Set<string>();
 let skip:{name:string;depth:number}|null=null;
 for(const t of tokenize(html)){
  if(skip){if(t.type==='start'&&t.name===skip.name&&!t.self&&!VOID.has(t.name))skip.depth++;else if(t.type==='end'&&t.name===skip.name&&--skip.depth===0)skip=null;continue;}
  const top=stack[stack.length-1]!;
  if(t.type==='text'){if(t.value)top.children.push(t.value);continue;}
  if(t.type==='end'){const at=stack.map(n=>n.tag).lastIndexOf(t.name);if(at>0)stack.length=at;continue;}
  if(DROP.has(t.name)){removed.add(t.name);if(!t.self&&!VOID.has(t.name)&&!RAW.has(t.name))skip={name:t.name,depth:1};continue;}
  if(!ALLOWED.has(t.name)){if(!['html','body','main','article','section','header','footer','nav','aside','font','center','label','abbr','mark','cite','q','time','del','ins','dl','dt','dd','picture','tt','big','address','colgroup','col','source','wbr'].includes(t.name))removed.add(t.name);continue;}
  const attrs:Attrs={};
  for(const [k,v] of Object.entries(t.attrs)){if(!(ATTRS['*']!.includes(k)||ATTRS[t.name]?.includes(k)))continue;
   if(k==='style'){const s=cleanStyle(v);if(s)attrs.style=s;}
   else if(k==='href'){const h=safeHref(v);if(h)attrs.href=h;else removed.add('unsafe link');}
   else if(k==='src'){const d=docSrc(v);if(d)attrs.src='doc:'+d;}
   else if(['width','height','colspan','rowspan','start'].includes(k)){const n=v.trim().match(/^(\d{1,4})(%?)$/);if(n)attrs[k]=n[1]+(k==='width'?n[2]!:'');}
   else if(['align','valign'].includes(k)){const a=v.trim().toLowerCase();if(['left','right','center','top','middle','bottom','justify'].includes(a))attrs[k]=a;}
   else if(k==='scope'){if(['row','col'].includes(v.trim().toLowerCase()))attrs.scope=v.trim().toLowerCase();}
   else attrs[k]=v.replace(controls,'').slice(0,300);}
  if(t.name==='img'){if(!attrs.src){removed.add('image without a platform document');continue;}const v=attrs.src.slice(4);if(!images.includes(v))images.push(v);if(attrs.alt===undefined)attrs.alt='';top.children.push({tag:'img',attrs,children:[]});continue;}
  if(t.name==='div'&&attrs['data-ask']!==undefined){
   const key=attrs['data-ask'];
   if(stack.length!==1)fail(400,'ask_placement','Place each ask marker <div data-ask="…"> at the top level of the content');
   if(!declared.includes(key))fail(400,'ask_undeclared',`The ask "${key}" is not declared in asks`);
   if(asks.includes(key))fail(400,'ask_duplicate',`The ask "${key}" is placed twice`);
   asks.push(key);root.children.push({ask:key});if(!t.self)skip={name:'div',depth:1};continue;}
  delete attrs['data-ask'];
  // As browsers do: a block closes an open paragraph, and a list item closes the previous one, so the page parses the tree stored here.
  if(BLOCKS.has(t.name)){const at=stack.map(n=>n.tag).lastIndexOf('p');if(at>0)stack.length=at;}
  if(t.name==='li'){const at=stack.map(n=>n.tag).lastIndexOf('li');if(at>0&&!stack.slice(at).some(n=>n.tag==='ul'||n.tag==='ol'))stack.length=at;}
  const parent=stack[stack.length-1]!,node:Node={tag:t.name,attrs,children:[]};parent.children.push(node);
  if(!VOID.has(t.name)&&!t.self)stack.push(node);
 }
 return {nodes:root.children,images,asks,removed:[...removed]};
}

/** Canonical stored HTML: the sanitised tree with `doc:` image sources and ask markers. Sanitising it again yields the same string. */
export function serialise(nodes:Child[],o:{img?:(versionId:string,attrs:Attrs)=>Attrs;a?:(attrs:Attrs)=>Attrs;ask?:(key:string)=>string;style?:(tag:string,attrs:Attrs)=>string|undefined;extra?:(tag:string,attrs:Attrs)=>Attrs}={}):string{
 const attrs=(a:Attrs)=>Object.entries(a).filter(([,v])=>v!==undefined).map(([k,v])=>` ${k}="${escapeAttr(v)}"`).join('');
 const one=(c:Child):string=>{
  if(typeof c==='string')return escapeText(c);
  if(isAsk(c))return o.ask?o.ask(c.ask):`<div data-ask="${escapeAttr(c.ask)}"></div>`;
  let a={...c.attrs};
  if(c.tag==='img'&&o.img)a=o.img(a.src!.slice(4),a);
  if(c.tag==='a'&&o.a)a=o.a(a);
  if(o.extra)a={...o.extra(c.tag,a),...a};
  if(o.style){const s=o.style(c.tag,a);if(s!==undefined)a={...a,style:s};}
  return VOID.has(c.tag)?`<${c.tag}${attrs(a)}>`:`<${c.tag}${attrs(a)}>${c.children.map(one).join('')}</${c.tag}>`;
 };
 return nodes.map(one).join('');
}

/** Plain-text rendering of the same tree (the email's text part, and the page's reading of the content). */
export function toText(nodes:Child[],askLine:(key:string)=>string=()=>''):string{
 const BLOCK=new Set(['p','div','h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','table','tr','pre','figure','figcaption','caption','hr','thead','tbody','tfoot']);
 const walk=(list:Child[],ctx:{pre:boolean;quote:boolean}):string=>{let out='';
  for(const c of list){
   if(typeof c==='string'){out+=ctx.pre?c:c.replace(/\s+/g,' ');continue;}
   if(isAsk(c)){out+='\n\n'+askLine(c.ask)+'\n\n';continue;}
   const tag=c.tag;
   if(tag==='br'){out+='\n';continue;}
   if(tag==='hr'){out+='\n\n———\n\n';continue;}
   if(tag==='img'){if(c.attrs.alt)out+=`[${c.attrs.alt}]`;continue;}
   if(tag==='ol'||tag==='ul'){let n=Number(c.attrs.start??1);out+='\n'+c.children.filter(isNode).filter(li=>li.tag==='li').map(li=>(tag==='ol'?`${n++}. `:'- ')+walk(li.children,ctx).trim().replace(/\n+/g,'\n   ')).join('\n')+'\n\n';continue;}
   if(tag==='tr'){out+=c.children.filter(isNode).filter(x=>x.tag==='td'||x.tag==='th').map(x=>walk(x.children,ctx).trim().replace(/\s*\n\s*/g,' ')).join(' | ')+'\n';continue;}
   if(tag==='table'||tag==='thead'||tag==='tbody'||tag==='tfoot'){out+='\n'+walk(c.children,ctx)+'\n';continue;}
   let inner=walk(c.children,{pre:ctx.pre||tag==='pre',quote:ctx.quote||tag==='blockquote'});
   if(tag==='a'&&c.attrs.href){const href=c.attrs.href.replace(/^mailto:/i,'');inner=inner.trim()&&inner.trim()!==href?`${inner.trim()} (${href})`:href;}
   if(tag==='blockquote')inner=inner.trim().split('\n').map(l=>'> '+l).join('\n');
   if(/^h[1-6]$/.test(tag))inner=inner.trim();
   out+=BLOCK.has(tag)?`\n\n${inner}\n\n`:inner;}
  return out;};
 return walk(nodes,{pre:false,quote:false}).split('\n').map(l=>l.replace(/[ \t ]+$/,'').replace(/^ (?=\S)/,'')).join('\n').replace(/\n{3,}/g,'\n\n').trim();
}

/** Lines of the text part stay under the 998-character SMTP limit. */
export const wrapLong=(text:string)=>text.split('\n').flatMap(line=>{const out:string[]=[];let l=line;while(l.length>900){const at=l.lastIndexOf(' ',900);const cut=at>200?at:900;out.push(l.slice(0,cut));l=l.slice(cut).trimStart();}out.push(l);return out;}).join('\n');

export type StoredImage={versionId:string;documentId:string;mime:string;width:number|null;height:number|null};
export type StoredContent={html:string;text:string;appText:boolean;asks:{key:string;text:string}[];images:StoredImage[];confidentiality:string;preheader:string;updatedAt?:string};
/** Natural size of PNG, GIF and JPEG images, for the width attributes Outlook needs. */
export function imageSize(bytes:Buffer,mime:string):{width:number;height:number}|null{
 try{
  if(mime==='image/png'&&bytes.length>=24&&bytes.readUInt32BE(12)===0x49484452)return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
  if(mime==='image/gif'&&bytes.length>=10&&bytes.toString('ascii',0,3)==='GIF')return {width:bytes.readUInt16LE(6),height:bytes.readUInt16LE(8)};
  if(mime==='image/jpeg'&&bytes[0]===0xff&&bytes[1]===0xd8){let i=2;while(i+9<bytes.length){if(bytes[i]!==0xff){i++;continue;}const marker=bytes[i+1]!,len=bytes.readUInt16BE(i+2);if(marker>=0xc0&&marker<=0xcf&&![0xc4,0xc8,0xcc].includes(marker))return {width:bytes.readUInt16BE(i+7),height:bytes.readUInt16BE(i+5)};i+=2+len;}}
 }catch{}
 return null;
}
export const EMAIL_IMAGE_TYPES=['image/png','image/jpeg','image/gif'];
/** Display size inside the email column: the requested or natural width, never wider than the column, height kept in proportion. */
export function displaySize(img:StoredImage|undefined,attrs:Attrs){
 const want=attrs.width&&!attrs.width.endsWith('%')?Number(attrs.width):img?.width??CONTENT_WIDTH,width=Math.max(1,Math.min(CONTENT_WIDTH,want||CONTENT_WIDTH));
 const height=img?.width&&img?.height?Math.round(width*img.height/img.width):attrs.height&&!attrs.width?.endsWith('%')&&attrs.width?Math.round(Number(attrs.height)*width/Number(attrs.width)):null;
 return {width,height};
}

/**
 * Validate and store content: sanitise, check every image is a PNG/JPEG/GIF platform document the
 * author may use, check asks, derive the text part when the app gives none. `documents` resolves
 * versions under the author's own document permissions.
 */
export async function prepareContent(input:ContentInput,documents:(versionIds:string[])=>Promise<{versionId:string;documentId:string;mime:string;bytes?:Buffer}[]>):Promise<{content:StoredContent;removed:string[]}>{
 const c=contentSchema.parse(input);
 if(new Set(c.asks.map(a=>a.key)).size!==c.asks.length)fail(400,'ask_duplicate','Ask keys must be unique');
 const s=sanitise(c.html,c.asks.map(a=>a.key));
 const html=serialise(s.nodes);if(!html.replace(/<[^>]+>/g,'').trim()&&!s.images.length)fail(400,'content_empty','The content has nothing to show');
 if(html.length>MAX_CONTENT_HTML)fail(413,'content_size',`The rendered content is ${Math.round(html.length/1000)} KB; keep it under ${MAX_CONTENT_HTML/1000} KB so email clients show it in full`);
 if(s.images.length>30)fail(400,'content_images','Use at most 30 images');
 const rows=await documents(s.images),images:StoredImage[]=[];
 for(const v of s.images){const d=rows.find(r=>r.versionId===v);if(!d)fail(404,'not_found','Image document unavailable: '+v);if(!EMAIL_IMAGE_TYPES.includes(d.mime))fail(400,'image_format','Content images must be PNG, JPEG or GIF documents so every email client shows them');const size=d.bytes?imageSize(d.bytes,d.mime):null;images.push({versionId:v,documentId:d.documentId,mime:d.mime,width:size?.width??null,height:size?.height??null});}
 const text=wrapLong(c.text??toText(s.nodes,key=>askText(c.asks,key)));
 // Deterministic, so a review and its confirmation compare equal; the save stamps updatedAt.
 return {content:{html,text,appText:!!c.text,asks:c.asks,images,confidentiality:c.confidentiality??DEFAULT_CONFIDENTIALITY,preheader:c.preheader??''},removed:s.removed};
}
const askText=(asks:{key:string;text:string}[],key:string)=>`Ask: ${asks.find(a=>a.key===key)?.text??''}`;
/** Re-read stored content into its tree (stored HTML is already canonical). */
export const contentTree=(content:StoredContent)=>sanitise(content.html,content.asks.map(a=>a.key)).nodes;
/** Asks declared without a marker follow the content, in their declared order. */
export function withTrailingAsks(nodes:Child[],asks:{key:string}[]):Child[]{const placed=new Set(nodes.filter(isAsk).map(a=>a.ask));return [...nodes,...asks.filter(a=>!placed.has(a.key)).map(a=>({ask:a.key}))];}

/** The online page: top-level segments of HTML and ask slots, with images served from the update's image address. */
export function pageSegments(content:StoredContent,imageUrl:(versionId:string)=>string){
 const nodes=withTrailingAsks(contentTree(content),content.asks),segments:({html:string}|{ask:{key:string;text:string}})[]=[];let run:Child[]=[];
 const flush=()=>{if(run.length){segments.push({html:serialise(run,{img:(v,a)=>{const img=content.images.find(i=>i.versionId===v),size=displaySize(img,a);return {...a,src:imageUrl(v),width:String(size.width),...(size.height?{height:String(size.height)}:{}),loading:'lazy'};},a:a=>({...a,target:'_blank',rel:'noopener noreferrer'})})});run=[];}};
 for(const n of nodes){if(isAsk(n)){flush();const ask=content.asks.find(a=>a.key===n.ask);if(ask)segments.push({ask});}else run.push(n);}
 flush();return segments;
}

/** The plain-text content of one email: derived from the tree with each ask's own link, or the app's text followed by the asks. */
export function emailContentText(content:StoredContent,askUrl:((key:string)=>string)|null){
 const line=(key:string)=>{const ask=content.asks.find(a=>a.key===key);return ask&&askUrl?`${ask.text}\nI can help: ${askUrl(key)}`:'';};
 if(content.appText)return wrapLong(content.text+(askUrl&&content.asks.length?'\n\n'+content.asks.map(a=>line(a.key)).join('\n\n'):''));
 return wrapLong(toText(withTrailingAsks(contentTree(content),askUrl?content.asks:[]),line));
}
/* ---------- Email ---------- */
const FONT="font-family:Helvetica,Arial,sans-serif";
const TEXT_COLOR='#1f2937',MUTED='#4b5563',LINK='#0b57d0',BORDER='#e5e7eb',BUTTON='#0f5132';
const TAG_STYLE:Record<string,string>={
 p:`margin:0 0 16px;${FONT};font-size:16px;line-height:24px;color:${TEXT_COLOR}`,
 h1:`margin:0 0 16px;${FONT};font-size:26px;line-height:32px;font-weight:700;color:#111827`,
 h2:`margin:24px 0 12px;${FONT};font-size:20px;line-height:28px;font-weight:700;color:#111827`,
 h3:`margin:20px 0 8px;${FONT};font-size:17px;line-height:24px;font-weight:700;color:#111827`,
 h4:`margin:16px 0 8px;${FONT};font-size:15px;line-height:22px;font-weight:700;color:#111827`,h5:`margin:16px 0 8px;${FONT};font-size:15px;line-height:22px;font-weight:700;color:#111827`,h6:`margin:16px 0 8px;${FONT};font-size:15px;line-height:22px;font-weight:700;color:#111827`,
 ul:`margin:0 0 16px;padding:0 0 0 24px;${FONT};color:${TEXT_COLOR}`,ol:`margin:0 0 16px;padding:0 0 0 24px;${FONT};color:${TEXT_COLOR}`,
 li:`margin:0 0 6px;${FONT};font-size:16px;line-height:24px;color:${TEXT_COLOR}`,
 div:`${FONT};font-size:16px;line-height:24px;color:${TEXT_COLOR}`,
 blockquote:`margin:0 0 16px;padding:12px 16px;border-left:4px solid #d1d5db;background-color:#f9fafb;${FONT};color:${TEXT_COLOR}`,
 table:`width:100%;border-collapse:collapse;margin:0 0 16px`,
 th:`padding:6px 8px;border-bottom:1px solid #d1d5db;${FONT};font-size:14px;line-height:20px;font-weight:700;color:#111827;text-align:left;vertical-align:top`,
 td:`padding:6px 8px;border-bottom:1px solid ${BORDER};${FONT};font-size:14px;line-height:20px;color:${TEXT_COLOR};text-align:left;vertical-align:top`,
 caption:`${FONT};font-size:13px;line-height:20px;color:${MUTED};text-align:left;padding:0 0 6px`,
 figcaption:`${FONT};font-size:13px;line-height:20px;color:${MUTED};margin:6px 0 16px`,figure:'margin:0 0 16px',
 a:`color:${LINK};text-decoration:underline`,hr:`border:0;border-top:1px solid ${BORDER};margin:24px 0`,
 pre:`margin:0 0 16px;padding:12px;background-color:#f3f4f6;font-family:Menlo,Consolas,monospace;font-size:13px;line-height:20px;color:${TEXT_COLOR};white-space:pre-wrap`,
 code:'font-family:Menlo,Consolas,monospace;font-size:14px',
 img:'display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:100%'
};
const paragraphs=(text:string)=>text.trim().split(/\n{2,}/).filter(Boolean).map(p=>`<p style="${TAG_STYLE.p}">${linkify(p).replace(/\n/g,'<br>')}</p>`).join('');
/** Escape plain text and make its web addresses links (the intro and footer texts people edit). */
// Long addresses may break anywhere, so they never widen the email on a phone.
export const linkify=(text:string)=>escapeText(text).replace(/https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)]/g,u=>`<a href="${u.replace(/"/g,'&quot;')}" style="${TAG_STYLE.a};word-break:break-all">${u}</a>`);
export function button(href:string,label:string){return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 4px"><tr><td bgcolor="${BUTTON}" style="background-color:${BUTTON};border-radius:4px;padding:10px 18px"><a href="${escapeAttr(href)}" style="${FONT};font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none">${escapeText(label)}</a></td></tr></table>`;}
/** The content as email-safe HTML: inline styles per tag (the app's own declarations win), sized images from the update's image address, asks as "I can help" links. */
export function emailContentHtml(content:StoredContent,imageUrl:(versionId:string)=>string,askUrl:((key:string)=>string)|null){
 const nodes=withTrailingAsks(contentTree(content),askUrl?content.asks:[]);
 return serialise(nodes,{
  img:(v,a)=>{const img=content.images.find(i=>i.versionId===v),size=displaySize(img,a);return {...a,src:imageUrl(v),width:String(size.width),...(size.height?{height:String(size.height)}:{})};},
  style:(tag,a)=>{const base=TAG_STYLE[tag];if(!base&&!a.style)return undefined;return [base,a.style].filter(Boolean).join(';');},
  extra:(tag):Attrs=>tag==='table'?{cellpadding:'0',cellspacing:'0',border:'0',width:'100%'}:{},
  ask:key=>{const ask=content.asks.find(a=>a.key===key);if(!ask||!askUrl)return '';return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;border:1px solid #d1d5db;border-collapse:separate"><tr><td style="padding:16px;background-color:#f9fafb"><p style="${TAG_STYLE.p}">${escapeText(ask.text)}</p>${button(askUrl(key),'I can help')}</td></tr></table>`;}
 });
}
export type UpdateEmailParts={subject:string;preheader:string;intro:string;content:StoredContent;imageUrl:(versionId:string)=>string;askUrl:((key:string)=>string)|null;link:string;confidentiality:string;footer:string;unsubscribeUrl:string|null;seriesLabel:string};
/** The update email: one table layout 600 px wide (a fixed-width table for Outlook), inline styles only, light colour scheme declared. */
export function updateEmailHtml(p:UpdateEmailParts){
 const footer=p.footer.trim().split('\n').filter(l=>l&&l!=='—').map(l=>`<p style="margin:0 0 8px;${FONT};font-size:13px;line-height:20px;color:${MUTED}">${linkify(l)}</p>`).join('');
 const unsubscribe=p.unsubscribeUrl?`<p style="margin:0;${FONT};font-size:13px;line-height:20px;color:${MUTED}"><a href="${escapeAttr(p.unsubscribeUrl)}" style="color:${MUTED};text-decoration:underline">Unsubscribe from ${escapeText(p.seriesLabel)}</a></p>`:'';
 return `<!DOCTYPE html><html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>${escapeText(p.subject)}</title><!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]--></head>`
 +`<body style="margin:0;padding:0;background-color:#f3f4f6;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">`
 +(p.preheader?`<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escapeText(p.preheader)}</div>`:'')
 +`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6"><tr><td align="center" style="padding:24px 8px">`
 +`<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->`
 +`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff">`
 +`<tr><td style="padding:24px 24px 0">${paragraphs(p.intro)}</td></tr>`
 +`<tr><td style="padding:8px 24px 0"><!-- trialagents:content -->${emailContentHtml(p.content,p.imageUrl,p.askUrl)}<!-- /trialagents:content --></td></tr>`
 +`<tr><td style="padding:8px 24px 24px">${button(p.link,'View online')}<p style="margin:8px 0 0;${FONT};font-size:13px;line-height:20px;color:${MUTED}">Your personal page: <a href="${escapeAttr(p.link)}" style="color:${LINK};text-decoration:underline">${escapeText(p.link.replace(/#.*/,'#…'))}</a></p></td></tr>`
 +`<tr><td style="padding:16px 24px 20px;border-top:1px solid ${BORDER}"><p style="margin:0 0 12px;${FONT};font-size:13px;line-height:20px;color:${MUTED}">${linkify(p.confidentiality)}</p>${footer}${unsubscribe}</td></tr>`
 +`</table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`;
}

/* ---------- Common-client checks ---------- */
export type ClientChecks={gmail:string[];outlook:string[];appleMail:string[];text:string[]};
/**
 * Known limits of the three email clients most investors use, checked on every update email:
 * Gmail (clips messages over 102 KB, blocks data: images and scripts, ignores external styles,
 * position and background images), Outlook for Windows (Word renderer: no flex, grid, float,
 * position, max-width without a fixed-width fallback table, semi-transparent colours, SVG or WebP;
 * images need width attributes) and Apple Mail (declared colour scheme, no text auto-scaling, a
 * viewport for iPhone, fluid images). The text part must be present, carry the link and footer,
 * and keep lines under the SMTP limit.
 */
export function checkEmailClients(html:string,text:string,o:{link:string;unsubscribe?:boolean}):ClientChecks{
 const gmail:string[]=[],outlook:string[]=[],appleMail:string[]=[],textIssues:string[]=[];
 const all=(msg:string)=>{gmail.push(msg);outlook.push(msg);appleMail.push(msg);};
 if(/<(script|form|input|iframe|object|embed|video|audio|button)\b/i.test(html))all('Interactive or embedded elements are removed by email clients');
 if(/javascript:/i.test(html))all('javascript: links are blocked');
 if(/<link\b[^>]*stylesheet/i.test(html))all('External stylesheets are not loaded');
 const imgs=[...html.matchAll(/<img\b[^>]*>/gi)].map(m=>m[0]);
 for(const img of imgs){const src=img.match(/\ssrc="([^"]*)"/)?.[1]??'';
  if(!/^https?:\/\//.test(src))all('Images need an absolute web address');
  if(/^data:/i.test(src))gmail.push('Gmail blocks data: images');
  if(!/\salt="/.test(img))all('Images need alt text');
  if(!/\swidth="\d+"/.test(img))outlook.push('Outlook needs a width attribute on every image');
  if(/\.(svg|webp)(\?|$)/i.test(src)||/image\/(svg|webp)/i.test(src))outlook.push('Outlook cannot show SVG or WebP images');
  if(!/height:auto/.test(img))appleMail.push('Images should scale (height:auto) on iPhone');}
 for(const m of html.matchAll(/<a\b[^>]*href="([^"]*)"/gi))if(!/^(https?:\/\/|mailto:)/i.test(m[1]!))all('Links need an absolute web address');
 const size=Buffer.byteLength(html,'utf8');if(size>102*1024)gmail.push(`Gmail clips messages over 102 KB (this one is ${Math.round(size/1024)} KB)`);
 const styleBlocks=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]!);if(styleBlocks.some(s=>/@import/i.test(s)))gmail.push('Gmail ignores @import');
 const styles=[...html.matchAll(/\sstyle="([^"]*)"/gi)].map(m=>m[1]!).join(';')+';'+styleBlocks.join(';');
 if(/position\s*:/i.test(styles))gmail.push('Gmail removes position'),outlook.push('Outlook ignores position');
 if(/background-image|url\s*\(/i.test(styles))gmail.push('Gmail removes background images'),outlook.push('Outlook ignores background images');
 if(/display\s*:\s*(flex|grid|inline-flex)/i.test(styles))outlook.push('Outlook does not support flex or grid layout');
 if(/(^|;)\s*float\s*:/i.test(styles))outlook.push('Outlook does not support float');
 if(/rgba\s*\(|hsla?\s*\(/i.test(styles))outlook.push('Outlook ignores rgba() and hsl() colours');
 if(/max-width\s*:/i.test(styles)&&!/<!--\[if mso\]><table[^>]*width="\d+"/i.test(html))outlook.push('Outlook ignores max-width; add a fixed-width table for Outlook');
 if(!/<meta name="color-scheme"/i.test(html)||!/<meta name="supported-color-schemes"/i.test(html))appleMail.push('Declare the colour scheme so Apple Mail does not invert colours');
 if(!/-webkit-text-size-adjust:\s*100%/i.test(html))appleMail.push('Prevent text auto-scaling on iPhone (-webkit-text-size-adjust:100%)');
 if(!/<meta name="viewport"[^>]*width=device-width/i.test(html))appleMail.push('Add a viewport for iPhone');
 if(!html.includes(o.link))all('The personal link is missing');
 if(!text.trim())textIssues.push('The plain-text part is empty');
 if(text.split('\n').some(l=>l.length>998))textIssues.push('A text line exceeds 998 characters');
 if(!text.includes(o.link))textIssues.push('The personal link is missing from the text part');
 if(!/Report abuse/.test(text))textIssues.push('The footer is missing from the text part');
 if(o.unsubscribe&&!/Unsubscribe/i.test(text))textIssues.push('The unsubscribe link is missing from the text part');
 if(/<[a-z][^>]*>/i.test(text))textIssues.push('The text part contains markup');
 return {gmail,outlook,appleMail,text:textIssues};
}
export const checksPassed=(c:ClientChecks)=>Object.values(c).every(v=>v.length===0);
