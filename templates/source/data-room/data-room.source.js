'use trialagents v2';
const templateLayoutSchema={"screens":[{"id":"overview","label":"Overview"},{"id":"rooms","label":"Rooms"},{"id":"index","label":"Index"},{"id":"parties","label":"Parties"},{"id":"activity","label":"Activity"},{"id":"qa","label":"Q&A"},{"id":"templates","label":"Index templates"},{"id":"emails","label":"Email texts"}],"groups":{"parties":[{"id":"party","label":"Party"},{"id":"levels","label":"Levels"},{"id":"cda","label":"CDA"},{"id":"status","label":"Status"},{"id":"granted","label":"Granted"},{"id":"ends","label":"Ends"},{"id":"last_seen","label":"Last seen"}],"questions":[{"id":"party","label":"Party"},{"id":"about","label":"About"},{"id":"category","label":"Category"},{"id":"asked","label":"Asked"},{"id":"assignee","label":"Assignee"},{"id":"due","label":"Due"},{"id":"status","label":"Status"}],"room_form":[{"id":"name","label":"Room name"},{"id":"purpose","label":"Purpose"},{"id":"cda_option","label":"CDA option"},{"id":"round_id","label":"Fundraise round (reference)"},{"id":"opportunity_ref","label":"Partnerships opportunity (reference)"},{"id":"welcome_note","label":"Welcome note"},{"id":"contact_person_id","label":"Contact person"},{"id":"access_ending_reminder","label":"Access-ending reminder"},{"id":"owner","label":"Owner"}],"item_form":[{"id":"title","label":"Title"},{"id":"required","label":"Required"},{"id":"status","label":"Status"},{"id":"owner","label":"Owner"},{"id":"due","label":"Due"},{"id":"view_only","label":"View only"},{"id":"notes","label":"Notes"}],"question_form":[{"id":"question","label":"Question"},{"id":"category","label":"Category"},{"id":"assignee","label":"Assignee"},{"id":"due","label":"Due"},{"id":"answer","label":"Answer"}]}};
const appCommands=[{"id":"schema.describe","label":"Describe screens, forms, fields, options, custom fields and commands","mode":"read","input":{"type":"object","properties":{},"additionalProperties":false}},{"id":"rooms.read","label":"List rooms with purpose, status, readiness and parties","mode":"read","input":{"type":"object","properties":{},"additionalProperties":false}},{"id":"waiting.read","label":"What is waiting on us: questions to log, overdue and open answers, signed CDAs to accept, items due","mode":"read","input":{"type":"object","properties":{},"additionalProperties":false}},{"id":"index.read","label":"Read a room's index: sections, items, status, owner, due, document, level","mode":"read","input":{"type":"object","properties":{"room_id":{"type":"string","format":"uuid"}},"required":["room_id"],"additionalProperties":false}},{"id":"readiness.read","label":"Readiness of a room, per section, with the missing required items","mode":"read","input":{"type":"object","properties":{"room_id":{"type":"string","format":"uuid"}},"required":["room_id"],"additionalProperties":false}},{"id":"parties.read","label":"Parties of a room: levels (open or locked), CDA, status, granted, ends, last seen, hot or quiet","mode":"read","input":{"type":"object","properties":{"room_id":{"type":"string","format":"uuid"}},"required":["room_id"],"additionalProperties":false}},{"id":"activity.read","label":"Engagement of a room by party, section and document, with hot and quiet parties","mode":"read","input":{"type":"object","properties":{"room_id":{"type":"string","format":"uuid"}},"required":["room_id"],"additionalProperties":false}},{"id":"changes.read","label":"Documents changed since each party's last visit, at levels open to them","mode":"read","input":{"type":"object","properties":{"room_id":{"type":"string","format":"uuid"}},"required":["room_id"],"additionalProperties":false}},{"id":"brief.read","label":"Call brief for one party, as the Activity screen shows it","mode":"read","input":{"type":"object","properties":{"grant_id":{"type":"string","format":"uuid"}},"required":["grant_id"],"additionalProperties":false}},{"id":"questions.read","label":"Question log of a room and new questions not yet logged","mode":"read","input":{"type":"object","properties":{"room_id":{"type":"string","format":"uuid"},"status":{"type":"string","enum":["open","all","new","assigned","drafting","in_review","answered","published","declined"]}},"required":["room_id"],"additionalProperties":false}},{"id":"notify.read","label":"Documents parties can be told about, and who would receive each","mode":"read","input":{"type":"object","properties":{"room_id":{"type":"string","format":"uuid"}},"required":["room_id"],"additionalProperties":false}},{"id":"settings.read","label":"Settings, email texts in use per type and purpose, index templates and custom fields","mode":"read","input":{"type":"object","properties":{},"additionalProperties":false}},{"id":"room.create","label":"Create a room (purpose, CDA option, index template, links)","mode":"propose","input":{"type":"object","properties":{"name":{"type":"string","minLength":1,"maxLength":300},"purpose":{"type":"string","enum":["financing","licensing","partnering","m_and_a","other"]},"cda_option":{"type":"string","enum":["send_pdf","contracts","in_place","none"]},"template_id":{"type":"string","maxLength":100},"program_ids":{"type":"array","items":{"type":"string","format":"uuid"},"maxItems":30},"round_id":{"type":"string","maxLength":300},"opportunity_ref":{"type":"string","maxLength":300},"welcome_note":{"type":"string","maxLength":20000},"contact_person_id":{"type":"string","format":"uuid"},"owner":{"type":"string","maxLength":300},"access_ending_reminder":{"type":"boolean"}},"required":["name","purpose","cda_option"],"additionalProperties":false}},{"id":"room.setup_structure","label":"Set up a room's levels and sections from its template","mode":"propose","input":{"type":"object","properties":{"room_id":{"type":"string","format":"uuid"}},"required":["room_id"],"additionalProperties":false}},{"id":"room.setup_items","label":"Add the template's checklist items to a room","mode":"propose","input":{"type":"object","properties":{"room_id":{"type":"string","format":"uuid"}},"required":["room_id"],"additionalProperties":false}},{"id":"room.status","label":"Change a room's status (preparing, live, closed)","mode":"propose","input":{"type":"object","properties":{"room_id":{"type":"string","format":"uuid"},"status":{"type":"string","enum":["preparing","live","closed"]}},"required":["room_id","status"],"additionalProperties":false}},{"id":"record.save","label":"Create or edit a record through its form (room, level, section, item, question, party, person)","mode":"propose","input":{"type":"object","properties":{"role":{"type":"string","enum":["rooms","levels","sections","items","questions","grants","organizations","people"]},"id":{"type":"string","format":"uuid"},"room_id":{"type":"string","format":"uuid"},"section_id":{"type":"string","format":"uuid"},"organization_id":{"type":"string","format":"uuid"},"values":{"type":"object"}},"required":["role","values"],"additionalProperties":false}},{"id":"record.archive","label":"Archive a record (rooms that are live are archived in the app)","mode":"propose","input":{"type":"object","properties":{"role":{"type":"string","enum":["rooms","levels","sections","items","questions","organizations","people","templates"]},"id":{"type":"string","format":"uuid"}},"required":["role","id"],"additionalProperties":false}},{"id":"item.attach","label":"Attach a platform document version to an index item, with level and view-only","mode":"propose","input":{"type":"object","properties":{"item_id":{"type":"string","format":"uuid"},"version_id":{"type":"string","format":"uuid"},"level_id":{"type":"string","format":"uuid"},"view_only":{"type":"boolean"},"ready":{"type":"boolean"}},"required":["item_id","version_id","level_id"],"additionalProperties":false}},{"id":"item.use_version","label":"Point an index item at the newest version of its document","mode":"propose","input":{"type":"object","properties":{"item_id":{"type":"string","format":"uuid"}},"required":["item_id"],"additionalProperties":false}},{"id":"party.add","label":"Add a party (one person) to a room with levels and access length","mode":"propose","input":{"type":"object","properties":{"room_id":{"type":"string","format":"uuid"},"email":{"type":"string","maxLength":200},"person_id":{"type":"string","format":"uuid"},"organization_id":{"type":"string","format":"uuid"},"level_ids":{"type":"array","items":{"type":"string","format":"uuid"},"minItems":1,"maxItems":10},"days":{"type":["integer","null"],"minimum":1,"maximum":730}},"required":["room_id","level_ids"],"additionalProperties":false}},{"id":"party.levels","label":"Change the levels of a party who has no link yet","mode":"propose","input":{"type":"object","properties":{"grant_id":{"type":"string","format":"uuid"},"level_ids":{"type":"array","items":{"type":"string","format":"uuid"},"minItems":1,"maxItems":10},"cda_mode":{"type":"string","enum":["upload","in_place","contracts"]},"cda_date":{"type":"string","format":"date"},"agreement_id":{"type":"string","format":"uuid"}},"required":["grant_id","level_ids"],"additionalProperties":false}},{"id":"questions.log","label":"Add new questions from the room to the question log","mode":"propose","input":{"type":"object","properties":{"room_id":{"type":"string","format":"uuid"},"message_ids":{"type":"array","items":{"type":"string","format":"uuid"},"minItems":1,"maxItems":50}},"required":["room_id","message_ids"],"additionalProperties":false}},{"id":"question.save","label":"Save, approve or decline an answer (a person sends or publishes it in the app)","mode":"propose","input":{"type":"object","properties":{"question_id":{"type":"string","format":"uuid"},"step":{"type":"string","enum":["save","approve","decline"]},"answer":{"type":"string","maxLength":20000},"assignee":{"type":"string","maxLength":300},"due":{"type":"string","format":"date"},"category":{"type":"string","enum":["corporate","financial","legal_ip","clinical","regulatory","cmc","commercial","other"]},"approver":{"type":"string","maxLength":300},"reused_from":{"type":"string","format":"uuid"}},"required":["question_id"],"additionalProperties":false}},{"id":"settings.save","label":"Save room defaults","mode":"propose","input":{"type":"object","properties":{"default_access_days":{"type":["integer","null"],"minimum":1,"maximum":730},"quiet_days":{"type":"integer","minimum":1,"maximum":365},"view_only_default":{"type":"boolean"},"qa_approval_required":{"type":"boolean"},"entry_text":{"type":"string","maxLength":5000},"sender_display":{"type":"string","enum":["organization","first_name"]}},"additionalProperties":false}},{"id":"email_text.save","label":"Save the default email text for a type and room purpose","mode":"propose","input":{"type":"object","properties":{"type":{"type":"string","enum":["access_granted","access_changed","documents_updated","question_answered","answer_published","access_ending","access_revoked"]},"purpose":{"type":"string","enum":["all","financing","licensing","partnering","m_and_a","other"]},"subject":{"type":"string","minLength":1,"maxLength":200},"body":{"type":"string","minLength":1,"maxLength":10000}},"required":["type","purpose","subject","body"],"additionalProperties":false}},{"id":"email_text.reset","label":"Go back to the built-in email text for a type and purpose","mode":"propose","input":{"type":"object","properties":{"type":{"type":"string","enum":["access_granted","access_changed","documents_updated","question_answered","answer_published","access_ending","access_revoked"]},"purpose":{"type":"string","enum":["all","financing","licensing","partnering","m_and_a","other"]}},"required":["type","purpose"],"additionalProperties":false}},{"id":"template.copy","label":"Copy an index template into an editable one","mode":"propose","input":{"type":"object","properties":{"template_id":{"type":"string","minLength":1,"maxLength":100}},"required":["template_id"],"additionalProperties":false}},{"id":"template.save","label":"Change an editable index template (sections and items as text, one per line)","mode":"propose","input":{"type":"object","properties":{"template_id":{"type":"string","format":"uuid"},"name":{"type":"string","maxLength":300},"purpose":{"type":"string","enum":["financing","licensing","partnering","m_and_a","other"]},"content":{"type":"string","minLength":1,"maxLength":20000}},"required":["template_id","content"],"additionalProperties":false}},{"id":"custom_field.save","label":"Add or change a custom field on rooms, index items, parties or questions","mode":"propose","input":{"type":"object","properties":{"role":{"type":"string","enum":["rooms","items","grants","questions"]},"key":{"type":"string","pattern":"^[a-z][a-z0-9_]{0,39}$"},"label":{"type":"string","minLength":1,"maxLength":60},"kind":{"type":"string","enum":["text","longtext","number","date","select","boolean"]},"options":{"type":"array","items":{"type":"string","pattern":"^[a-z0-9][a-z0-9_]{0,39}$"},"maxItems":30}},"required":["role","key","label","kind"],"additionalProperties":false}},{"id":"custom_field.remove","label":"Stop showing a custom field (its values stay in the table)","mode":"propose","input":{"type":"object","properties":{"role":{"type":"string","enum":["rooms","items","grants","questions"]},"key":{"type":"string","pattern":"^[a-z][a-z0-9_]{0,39}$"}},"required":["role","key"],"additionalProperties":false}},{"id":"layout.save","label":"Change screens, columns and forms: order, hide or show, labels and form defaults","mode":"layout","input":{"type":"object","properties":{"heading":{"type":"string","maxLength":100},"screens":{"type":"array","items":{"type":"string"},"maxItems":7},"order":{"type":"object"},"hide":{"type":"array","items":{"type":"string"},"maxItems":100},"show":{"type":"array","items":{"type":"string"},"maxItems":100},"labels":{"type":"object"},"defaults":{"type":"object"}},"additionalProperties":false}}];
/* TrialAgents Data Room 2.0.0 (life.data-room) | frontend-js function body, v2 app contract, built on the kit. No DOM, network or
 * browser storage. Returns {html,css,state,notice,context}.
 * Records come only from authorized bindings. Record edits save directly (records.save) from a person's own click, change or
 * submit, with the version captured when editing started; values are edited where they are shown (kit.cell) and in a side panel
 * only to create a record or change many fields. Delete is an archive (Undo brings it back).
 * Sharing uses only the platform exchange in room mode (tools.call('exchange.*')): one room group per room (appRef "room:<room id>"),
 * one exchange per person bound to its access_grants record. Every exchange write comes from one click or submit. Preparing what nobody
 * outside has seen applies at once; anything that reaches people outside (emails, access, level changes, answers, publication,
 * acceptance, revocation) keeps its one confirmation in TrialAgents, and record changes of the same action travel with it.
 * Recipient links are never read, stored or rendered by this app, except inside the send review, which is shown exactly as the
 * platform returns it. Grant status, last seen and engagement rows are kept by TrialAgents (source "tracked") and are read-only here.
 * Each screen reads only its own tables (one records.readMany); reads still on their way are shown as loading.
 * Every click is also an app command (appCommands, line 3) that runs through the same handler. Commands never send, share, grant
 * or change a live room. Custom fields (settings.custom_fields) and form layouts (room_form, item_form, question_form) need no code change.
 */
const cfg=typeof templateConfiguration==='object'&&templateConfiguration?templateConfiguration:{};
const bindings=Array.isArray(templateBindings)?templateBindings:[];
const inp=input||{};
const event=inp.event||{kind:'open',action:'',value:null,form:{}};
const CMD=event.kind==='command';
const isAct=event.kind==='click'||event.kind==='submit';

const esc=v=>String(v===null||v===undefined?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const has=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
const num=(v,otherwise=null)=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v))?Number(v):otherwise;
const bool=v=>v===true||v==='true'||v==='on'||v==='1';
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const validDate=v=>{const t=String(v||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(t))return '';const d=new Date(t+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===t?t:'';};
const dayNo=d=>Math.round(Date.UTC(Number(d.slice(0,4)),Number(d.slice(5,7))-1,Number(d.slice(8,10)))/86400000);
const addDays=(d,n)=>d?new Date((dayNo(d)+Math.round(n))*86400000).toISOString().slice(0,10):'';
const diffDays=(a,b)=>dayNo(b)-dayNo(a);
const dateLabel=d=>d?Number(d.slice(8,10))+' '+MONTHS[Number(d.slice(5,7))-1]+' '+d.slice(0,4):'—';
const stamp=v=>{const t=String(v||'');const d=validDate(t);return d?dateLabel(d)+(t.length>=16?' '+t.slice(11,16):''):'—';};
const plural=(n,w)=>n+' '+(w==='person'?(Math.abs(n)===1?'person':'people'):w+(Math.abs(n)===1?'':'s'));
const label=v=>String(v===null||v===undefined||v===''?'—':v).replace(/_/g,' ');
const cap=s=>{s=label(s);return s.charAt(0).toUpperCase()+s.slice(1);};
const parseJSON=v=>{try{const x=JSON.parse(String(v||''));return x&&typeof x==='object'?x:null;}catch(e){return null;}};
const list=v=>String(v||'').split(',').map(x=>x.trim()).filter(Boolean);
const emailOk=e=>/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(e)&&e.length<=200;
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||''));
const pct=n=>n===null||n===undefined?'—':Math.round(n*100)+'%';
const mins=s=>{s=num(s,0);return s<60?(s?s+' s':'0'):s<3600?Math.round(s/60)+' min':(Math.round(s/360)/10)+' h';};
/* Natural order of section numbers ("2" < "2.1" < "10"). */
const secOrder=(a,b)=>{const x=String(a||'').split('.').map(Number),y=String(b||'').split('.').map(Number);for(let i=0;i<Math.max(x.length,y.length);i++){const d=(isNaN(x[i])?-1:x[i]===undefined?-1:x[i])-(isNaN(y[i])?-1:y[i]===undefined?-1:y[i]);if(d)return d;}return String(a).localeCompare(String(b));};
const words=t=>new Set(String(t||'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(w=>w.length>3));
const similar=(a,b)=>{const x=words(a),y=words(b);if(!x.size||!y.size)return 0;let n=0;for(const w of x)if(y.has(w))n++;return n/Math.min(x.size,y.size);};

const PURPOSES=['financing','licensing','partnering','m_and_a','other'];
const PURPOSE_LABEL={financing:'Financing',licensing:'Licensing',partnering:'Partnering',m_and_a:'M&A',other:'Other'};
const ROOM_STATUS=['preparing','live','closed'];const ROOM_STATUS_LABEL={preparing:'Preparing',live:'Live',closed:'Closed'};
const CDA_OPTIONS=['send_pdf','contracts','in_place','none'];
const CDA_LABEL={send_pdf:'Send PDF: the party uploads the signed CDA',contracts:'Use Contracts: the signed CDA is filed as an agreement',in_place:'In place elsewhere: record the date, then unlock',none:'None: click-through only'};
const CDA_SHORT={send_pdf:'Send PDF',contracts:'Contracts',in_place:'In place elsewhere',none:'Click-through'};
const LEVEL_KINDS=['non_confidential','confidential','custom'];const ENTRY=['none','click_through','signed_cda'];
const ENTRY_LABEL={none:'None',click_through:'Click-through',signed_cda:'Signed CDA'};
const ITEM_STATUS=['missing','in_progress','ready','not_applicable'];const ITEM_LABEL={missing:'Missing',in_progress:'In progress',ready:'Ready',not_applicable:'Not applicable'};
const GRANT_STATUS=['invited','active','revoked','expired'];
const CDA_STATUS=['not_needed','sent','signed','in_place_elsewhere'];const CDA_STATUS_LABEL={not_needed:'Not needed',sent:'Sent',signed:'Signed',in_place_elsewhere:'In place elsewhere'};
const Q_CATS=['corporate','financial','legal_ip','clinical','regulatory','cmc','commercial','other'];const Q_CAT_LABEL={legal_ip:'Legal & IP',cmc:'CMC'};
const Q_STATUS=['new','assigned','drafting','in_review','answered','published','declined'];
const Q_LABEL={new:'New',assigned:'Assigned',drafting:'Drafting',in_review:'Approved, ready to send',answered:'Answered privately',published:'Published',declined:'Declined'};
const VISIBILITY=['private','room','level'];
const ORG_TYPES=['company','investor','cro','cdmo','site','funder','partner','agency','other'];
const EMAIL_TYPES=['access_granted','access_changed','documents_updated','question_answered','answer_published','access_ending','access_revoked'];
const EMAIL_LABEL={access_granted:'Access granted (invitation)',access_changed:'Access changed',documents_updated:'Documents updated',question_answered:'Question answered',answer_published:'Answer published',access_ending:'Access ending',access_revoked:'Access revoked'};
const SENDER=['organization','first_name'];

/* Built-in index templates (fictional starting points): the standard 9-section biotech index, with required items weighted by purpose.
 * Letters: F financing, L licensing, P partnering, M M&A. Level: n = Non-confidential, c = Confidential. */
const BASE_INDEX=[
 ['1','Company and corporate',[['Company teaser or one-pager','FLPM','n',3],['Presentation deck','FLPM','n',3],['Management team and board','FM','n',2],['Articles and corporate documents','FM','c',1],['Organisation chart','M','c',1]]],
 ['2','Financial',[['Financial statements','FM','c',3],['Cash forecast and runway','FM','c',3],['Financial model','F','c',2],['Budget and use of proceeds','F','c',2],['Grants, loans and other funding','M','c',1]]],
 ['3','Capitalisation and legal',[['Cap table','FM','c',3],['Shareholder and investment agreements','FM','c',2],['List of material contracts','LPM','c',2],['Litigation and claims summary','M','c',1]]],
 ['4','Intellectual property',[['Patent schedule','FLPM','c',3],['Freedom-to-operate summary','LPM','c',2],['IP assignments and licences','FLM','c',2]]],
 ['5','Science and platform',[['Platform overview','FP','n',2],['Key data package','FLPM','c',3],['Publications and posters','','n',1]]],
 ['6','Clinical',[['Development plan','FLPM','c',3],['Clinical study reports or summaries','LM','c',3],['Investigator brochure','LM','c',2]]],
 ['7','Regulatory',[['Regulatory strategy and agency interactions','LPM','c',3],['Key agency correspondence','LM','c',2]]],
 ['8','CMC',[['CMC overview and supply chain','LPM','c',3],['Batch and stability data summary','LM','c',2],['Manufacturing agreements','M','c',2]]],
 ['9','Commercial and other',[['Market and competitive analysis','FLPM','n',2],['Pricing and reimbursement assumptions','LM','c',1],['Key employment terms','M','c',1],['Insurance','M','c',1]]]];
const LETTER={financing:'F',licensing:'L',partnering:'P',m_and_a:'M',other:''};
function builtinTemplate(purpose){const L=LETTER[purpose]||'';
 return {sections:BASE_INDEX.map(([number,name,items])=>({number,name,items:items.map(([title,req,lev,weight])=>({title,required:!!L&&req.includes(L),level:lev==='n'?'non_confidential':'confidential',weight:req.includes(L)?weight:1}))}))};}
const BUILTIN_TEMPLATES=PURPOSES.filter(p=>p!=='other').map(p=>({id:'builtin:'+p,name:PURPOSE_LABEL[p]+' room (standard 9-section index)',purpose:p,content:builtinTemplate(p),builtin:true}));

/* Built-in email texts per type and purpose ("all" applies when no purpose-specific text exists). The link, sender identity and footer are added by TrialAgents. */
const NOUN={financing:'our financing',licensing:'a potential licence',partnering:'a potential partnership',m_and_a:'a potential transaction',other:'our discussions'};
const BYE='\n\nKind regards,\n{sender_name}\n{sender_company}';
function builtinEmail(type,purpose){const hi='Dear {recipient_name},\n\n',noun=NOUN[purpose]||NOUN.other;
 if(type==='access_granted')return {subject:'{sender_company}: access to {title}',body:hi+'{sender_company} has given you access to our data room for '+noun+'.\n\nOpen it with your private link to read the index and documents and to ask questions:\n{link}\n\nThe link is personal to you; please do not forward it. Access: {deadline}.'+BYE};
 if(type==='access_changed')return {subject:'{title}: your access changed',body:hi+'Your access to "{title}" now covers: {levels}.\n\nNew documents are marked in the room:\n{link}'+BYE};
 if(type==='documents_updated')return {subject:'{title}: documents added or updated',body:hi+'These documents were added or updated in "{title}" since your last visit:\n\n{documents}\n\n{link}'+BYE};
 if(type==='question_answered')return {subject:'{title}: your question was answered',body:hi+'We answered your question:\n\n{message}\n\nThe answer is also in the room\'s Q&A:\n{link}'+BYE};
 if(type==='answer_published')return {subject:'{title}: a new answer for all parties',body:hi+'We published an answer that is relevant to you:\n\n{message}\n\nRead it in the room\'s Q&A:\n{link}'+BYE};
 if(type==='access_ending')return {subject:'{title}: access ends on {deadline}',body:hi+'Your access to "{title}" ends on {deadline}. If you need more time, reply to this email.\n\n{link}'+BYE};
 return {subject:'{title}: access ended',body:hi+'Your access to "{title}" has ended. Thank you for your interest. If you have questions, reply to this email.'+BYE};}
const DEFAULT_ENTRY='The documents at this level are confidential. By continuing you confirm that they are covered by the confidentiality terms agreed with us and that you will use them only to evaluate the opportunity.';

const OPT={PURPOSE:PURPOSES,RS:ROOM_STATUS,CDAO:CDA_OPTIONS,LK:LEVEL_KINDS,EN:ENTRY,IS:ITEM_STATUS,GS:GRANT_STATUS,CDAS:CDA_STATUS,QC:Q_CATS,QS:Q_STATUS,VIS:VISIBILITY,ORG:ORG_TYPES,SEND:SENDER};
const F=spec=>spec.split(';').map(x=>{const [k,kind,lab,o]=x.split('|'),required=k.endsWith('*'),key=required?k.slice(0,-1):k,f={key,label:lab||cap(key),kind:kind||'text'};if(required)f.required=true;if(OPT[o])f.options=OPT[o];if(f.kind[0]==='@'){f.ref=f.kind.slice(1);f.kind='ref';}return f;});
/* kind "tracked": kept by TrialAgents from the room; never written by this app. "frozen": written by the app's own flows only. */
const S={
 organizations:F('name*;org_type|select|Type|ORG;country||Country or region;website;archived|boolean'),
 people:F('name*;organization_id|@organizations|Organization;title;email;archived|boolean'),
 programs:F('name;stage;archived|boolean'),
 agreements:F('name;counterparty_id;agreement_type;status;effective_date|date;expiry_date|date;archived|boolean'),
 settings:F('default_access_days|number|Default access (days; blank = until revoked);view_only_default|boolean|View-only by default;quiet_days|number|Quiet after (days without an open);qa_approval_required|boolean|Answers need approval before sending;entry_text|longtext|Click-through text;sender_display|select|Sender display name|SEND;email_texts|frozen;custom_fields|frozen'),
 templates:F('name*;purpose*|select||PURPOSE;content|frozen;archived|boolean'),
 rooms:F('name*||Room name;purpose*|select||PURPOSE;status|frozen;program_ids|frozen;round_id||Fundraise round (reference);opportunity_ref||Partnerships opportunity (reference);template_id|frozen;cda_option*|select|CDA option|CDAO;welcome_note|longtext|Welcome note;contact_person_id|@people|Contact person;access_ending_reminder|boolean|Access-ending reminder;exchange_group_id|frozen;owner;archived|boolean'),
 levels:F('room_id|frozen;name*;kind|frozen;order|frozen;entry*|select|Entry step|EN'),
 sections:F('room_id|frozen;number*;name*;parent_id|frozen;order|frozen'),
 items:F('room_id|frozen;section_id|frozen;title*;required|boolean;status*|select||IS;owner;due|date;document_id|frozen;version_id|frozen;level_id|frozen;view_only|boolean|View only;updated_on|frozen;notes|longtext'),
 grants:F('room_id|frozen;room_name|frozen;room_purpose|frozen;organization_id|frozen;person_id|frozen;granted_on|frozen;expires_on|frozen;status|tracked;agreement_accepted_on|frozen;source|tracked;level_ids|frozen;recipient_email|frozen;exchange_id|frozen;cda_status|frozen;cda_agreement_id|frozen;last_seen_on|tracked'),
 engagement:F('grant_id|tracked;organization_id|tracked;person_id|tracked;document_ref|tracked;document_title|tracked;first_viewed_on|tracked;last_viewed_on|tracked;view_count|tracked;seconds_viewed|tracked;downloads|tracked;source|tracked;as_of|tracked;section_id|tracked'),
 questions:F('room_id|frozen;grant_id|frozen;organization_id|frozen;person_id|frozen;asked_on|frozen;category|select||QC;section_id|frozen;item_id|frozen;question*|longtext;status|frozen;assignee;due|date;answer|longtext;approved_by|frozen;answered_on|frozen;visibility|frozen;level_id|frozen;reused_from|frozen;document_ids|frozen;message_id|frozen')
};
const ROLE_LABEL={organizations:'organization',people:'person',programs:'program',agreements:'agreement',settings:'settings',templates:'index template',rooms:'room',levels:'level',sections:'section',items:'index item',grants:'access grant',engagement:'engagement row',questions:'question'};
const ROLE_KEY={organizations:'organizations',people:'people',programs:'programs',agreements:'agreements',settings:'dataroom.settings',templates:'dataroom.templates',rooms:'dataroom.rooms',levels:'dataroom.levels',sections:'dataroom.sections',items:'dataroom.items',grants:'dataroom.access_grants',engagement:'dataroom.engagement',questions:'dataroom.questions'};

let mapping={};try{mapping=JSON.parse(cfg.tableMap||'{}');}catch(e){mapping={};}
const roleMap={};
for(const role of Object.keys(S)){
 const m=mapping[ROLE_KEY[role]],b=m&&bindings.find(x=>x.typeId===m.typeId);
 if(!m||!b)continue;
 const fields={};for(const f of S[role]){const k=m.fields&&m.fields[f.key]!==undefined?m.fields[f.key]:f.key;if(typeof k==='string'&&(b.fields||[]).includes(k))fields[f.key]=k;}
 roleMap[role]={typeId:m.typeId,fields,writable:(Array.isArray(m.writableFields)?m.writableFields:[]).filter(x=>fields[x]&&!(S[role].find(f=>f.key===x)||{}).tracked)};
}
/* Tracked fields (grant status, last seen, agreement accepted, engagement) are written only by TrialAgents; the app never proposes them. */
for(const role of ['grants','engagement'])for(const f of S[role])if(f.kind==='tracked'&&roleMap[role])roleMap[role].writable=roleMap[role].writable.filter(k=>k!==f.key);
const canWrite=role=>!!inp.saved&&!!inp.writable&&cfg.readOnly!==true&&!!roleMap[role]&&roleMap[role].writable.length>0;
/* Reads (2.0.0, P3): each screen reads only its own tables. Their first pages come in one records.readMany (the same request
 * every time the screen opens, so the frame answers it from what it already has), the remaining pages of a long table in one
 * more. Any other table is read only when a screen or an action touches it. A read still on its way in the browser comes back
 * "pending": the screen shows it as loading, never as empty or zero, and an action that touched it goes to the server. */
const PAGE=100,MAX_PAGES=8;let callsLeft=90,PENDING=false,cache={},ahead={};
const ALL_ROLES=Object.keys(S);
const SCREEN_ROLES={
 overview:['settings','rooms','levels','sections','items','grants','engagement','questions','organizations','people','templates'],
 rooms:['settings','rooms','levels','sections','items','grants','engagement','organizations','people','programs','templates'],
 index:['settings','rooms','levels','sections','items','templates'],
 parties:['settings','rooms','levels','sections','items','grants','engagement','organizations','people','agreements','templates'],
 activity:['settings','rooms','levels','sections','items','grants','engagement','questions','organizations','people','templates'],
 qa:['settings','rooms','levels','sections','grants','questions','organizations','people','templates'],
 templates:['settings','templates'],emails:['settings'],fields:['settings'],settings:['settings']};
function readBatch(reads){
 try{const out=tools.call('records.readMany',{reads});if(out&&Array.isArray(out.results)&&out.results.length===reads.length)return out.results;}catch(e){}
 return null;
}
function preload(roles){
 const rest=roles.filter(r=>roleMap[r]&&!cache[r]&&!ahead[r]);if(rest.length<2)return;
 for(let i=0;i<rest.length;i+=12){
  const part=rest.slice(i,i+12);if(part.length>callsLeft)return;
  const pages=readBatch(part.map(r=>({typeId:roleMap[r].typeId,limit:PAGE,offset:0,filters:{}})));if(!pages)return;
  callsLeft-=part.length;part.forEach((r,k)=>{ahead[r]=[pages[k]];});
 }
}
function readRest(role,m,offset,total,page){
 const n=Math.min(Math.ceil((total-offset)/PAGE),MAX_PAGES-1-page,callsLeft);if(n<2)return;
 const pages=readBatch(Array.from({length:n},(_,k)=>({typeId:m.typeId,limit:PAGE,offset:offset+k*PAGE,filters:{}})));
 if(pages){callsLeft-=n;ahead[role]=pages;}
}
function readRole(role){
 if(cache[role])return cache[role];const m=roleMap[role];
 if(!m)return cache[role]={rows:[],allRows:[],complete:false,unbound:true,unavailable:false,pending:false,total:0,truncated:false,invalid:0};
 const rows=[];let offset=0,total=null,complete=false,unavailable=false,truncated=false,invalid=0,pending=false;
 for(let page=0;page<MAX_PAGES;page++){
  let p;const queued=ahead[role]&&ahead[role].length?ahead[role].shift():undefined;
  if(queued!==undefined)p=queued;
  else{if(callsLeft<=0){truncated=true;break;}callsLeft--;
   try{p=tools.call('records.read',{typeId:m.typeId,limit:PAGE,offset,filters:{}});}catch(e){unavailable=true;break;}
  }
  if(p&&p.pending){pending=true;PENDING=true;break;}
  if(!p||p.unavailable){unavailable=true;break;}
  const chunk=Array.isArray(p.rows)?p.rows:[];total=p.total===null||p.total===undefined||!Number.isFinite(Number(p.total))?null:Number(p.total);
  for(const r of chunk){const data={};for(const [logical,real] of Object.entries(m.fields))if(has(r.data,real)){const v=r.data[real];if(v!==null&&typeof v==='object'){invalid++;continue;}data[logical]=v;}rows.push({id:String(r.id),version:r.version,data});}
  offset+=chunk.length;
  if(total!==null&&offset>=total){complete=true;break;}
  if(chunk.length<PAGE)break;
  if(page===MAX_PAGES-1)truncated=true;
  else if(total!==null&&!(ahead[role]&&ahead[role].length))readRest(role,m,offset,total,page);
 }
 return cache[role]={rows:rows.filter(r=>!bool(r.data.archived)),allRows:rows,total:total===null?rows.length:total,complete,unavailable,unbound:false,pending,truncated,invalid};
}
const customOf=role=>S[role].filter(f=>f.custom&&roleMap[role]&&roleMap[role].fields[f.key]);
const customValues=(role,row)=>Object.fromEntries(customOf(role).map(f=>[f.real,row[f.key]===undefined?null:row[f.key]]));
const SCREENS=templateLayoutSchema.screens;
const st=JSON.parse(JSON.stringify(inp.state||{}));
{
 let profile={};try{profile=JSON.parse(cfg.layoutProfile||'{}');}catch(e){profile={};}
 const groups=templateLayoutSchema.groups;
 const tabs=Array.isArray(profile.tabs)?profile.tabs.filter(id=>SCREENS.some(s=>s.id===id)):[];
 const cols={};for(const g of Object.keys(groups)){const ids=groups[g].map(x=>x.id),saved=profile.cols&&Array.isArray(profile.cols[g])?profile.cols[g].filter(k=>ids.includes(k)):[];cols[g]=[...new Set(saved.concat(ids))];}
 st.layout={tabs:[...new Set(tabs.concat(SCREENS.map(s=>s.id)))],cols,visible:profile.visible&&typeof profile.visible==='object'?profile.visible:{},heading:String(profile.heading||cfg.heading||'Data Room').slice(0,100)};
}
st.section=String(st.section||'overview');st.page=Math.max(0,Number(st.page)||0);st.query=String(st.query||'');st.filters=st.filters&&typeof st.filters==='object'?st.filters:{};st.f=st.f&&typeof st.f==='object'?st.f:{};
/* Screens: the declared ones in the person's layout order, then Custom fields (only when the team added some) and Settings
 * (business choices, owners only, G6). The working room is this person's context (G4), kept across screens and visits. */
const EXTRA=[{id:'fields',label:'Custom fields'},{id:'settings',label:'Settings'}];
const ALL_SCREENS=SCREENS.map(s=>s.id).concat(EXTRA.map(s=>s.id));
const OWNER=inp.appRole==='owner',PHONE=!!(inp.viewport&&inp.viewport.width==='phone');
if(!ALL_SCREENS.includes(st.section))st.section='overview';
if(!st.roomId&&inp.context&&typeof inp.context==='object'&&typeof inp.context.roomId==='string')st.roomId=inp.context.roomId;
st.roomId=String(st.roomId||'');
/* One message at a time, through the platform (U2). A message about a direct save is kept for the render that follows it. */
let FLASH=null;const say=(kind,message)=>{FLASH={kind,message:String(message||'').replace(/\s+/g,' ').trim().slice(0,300)};};
const carried=st.flash&&typeof st.flash==='object'?st.flash:null;st.flash=null;
const colVisible=(g,id)=>st.layout.visible[g+':'+id]!==false&&st.layout.visible[g+'.'+id]!==false;
let LP={labels:{},defaults:{}};try{const x=JSON.parse(cfg.layoutProfile||'{}');LP={labels:x.labels&&typeof x.labels==='object'?x.labels:{},defaults:x.defaults&&typeof x.defaults==='object'?x.defaults:{}};}catch(e){}
const FORM_GROUP={rooms:'room_form',items:'item_form',questions:'question_form'};
const fieldLabel=(role,f)=>FORM_GROUP[role]&&LP.labels[FORM_GROUP[role]+':'+f.key]||f.label;
const cols=g=>st.layout.cols[g].filter(id=>colVisible(g,id));
const draftOf=name=>st.f[name]&&typeof st.f[name]==='object'?st.f[name]:(st.f[name]={});
/* Data, read on first use: R.<role> is the table's read, $.<NAME> the rows and settings derived from it. */
const R={},$={};
const byId=xs=>Object.fromEntries(xs.map(x=>[x.id,x]));
const rowsOf=role=>R[role].rows.map(r=>({id:r.id,version:r.version,...r.data}));
function lazy(o,k,f){Object.defineProperty(o,k,{configurable:true,enumerable:true,get(){const v=f();Object.defineProperty(o,k,{value:v,configurable:true,enumerable:true,writable:true});return v;}});}
/* Custom fields (1.1.0): a field added to a table by a reviewed schema change and to this app's binding, registered in settings.custom_fields
 * [{role,key,label,kind,options}]. The app shows it in that table's form and details, and in command results; never in calculations. */
const CF_ROLES=['rooms','items','grants','questions'],CF_KINDS=['text','longtext','number','date','select','boolean'];
function initCustom(){const row=R.settings.rows[0],v=row?parseJSON(row.data.custom_fields):null,out=[];
 if(Array.isArray(v))for(const c of v.slice(0,60)){if(!c||!CF_ROLES.includes(c.role)||!/^[a-z][a-z0-9_]{0,39}$/.test(String(c.key))||!CF_KINDS.includes(c.kind))continue;if(S[c.role].some(f=>!f.custom&&f.key===c.key))continue;
  const label=String(c.label||c.key).slice(0,60),options=c.kind==='select'&&Array.isArray(c.options)?c.options.map(String).filter(o=>/^[a-z0-9][a-z0-9_]{0,39}$/.test(o)).slice(0,30):undefined;
  out.push({role:c.role,key:'cf_'+c.key,real:c.key,label,kind:c.kind,options});}
 for(const c of out){const m=roleMap[c.role],b=m&&bindings.find(x=>x.typeId===m.typeId);if(!S[c.role].some(f=>f.key===c.key))S[c.role].push({key:c.key,label:c.label,kind:c.kind,custom:true,real:c.real,...(c.options?{options:c.options}:{})});
  if(m&&b&&(b.fields||[]).includes(c.real)){m.fields[c.key]=c.real;if(m.writable.length&&!m.writable.includes(c.key))m.writable.push(c.key);}}
 return out;}
function defineData(){
 for(const role of ALL_ROLES)lazy(R,role,()=>readRole(role));
 const rows=(k,role)=>lazy($,k,()=>rowsOf(role)),index=(k,from)=>lazy($,k,()=>byId($[from]));
 rows('ROOMS','rooms');index('ROOM','ROOMS');rows('LEVELS','levels');rows('SECS','sections');rows('ITEMS','items');rows('GRANTS','grants');index('GRANT','GRANTS');rows('QS','questions');index('QUESTION','QS');
 rows('ORGS','organizations');index('ORG','ORGS');rows('PEOPLE','people');index('PERSON','PEOPLE');rows('PROGRAMS','programs');index('PROGRAM','PROGRAMS');rows('AGREEMENTS','agreements');rows('ENG','engagement');
 lazy($,'TEMPLATE_ROWS',()=>rowsOf('templates').map(t=>({...t,content:parseJSON(t.content)})).filter(t=>t.content&&Array.isArray(t.content.sections)));
 lazy($,'TEMPLATES',()=>BUILTIN_TEMPLATES.concat($.TEMPLATE_ROWS));
 lazy($,'settingsRow',()=>R.settings.rows[0]||null);lazy($,'SETTING',()=>$.settingsRow?$.settingsRow.data:{});
 lazy($,'ACCESS_DAYS',()=>{const v=$.SETTING.default_access_days;return v===null||v===undefined||v===''?($.settingsRow?null:180):Math.min(730,Math.max(1,Math.round(num(v,180))));});
 lazy($,'VIEW_ONLY',()=>bool($.SETTING.view_only_default));lazy($,'QUIET',()=>Math.max(1,Math.round(num($.SETTING.quiet_days,10))));lazy($,'QA_APPROVAL',()=>$.settingsRow?bool($.SETTING.qa_approval_required):true);
 lazy($,'ENTRY_TEXT',()=>String($.SETTING.entry_text||'').trim()||DEFAULT_ENTRY);lazy($,'SENDER_KIND',()=>$.SETTING.sender_display==='first_name'?'person':'organization');
 lazy($,'EMAIL_TEXTS',()=>parseJSON($.SETTING.email_texts)||{});
 lazy($,'CUSTOM',initCustom);
}
defineData();
/* After a change that applied at once (an exchange step, Undo), the screen is made from fresh reads. */
function resetData(){cache={};ahead={};for(const k of Object.keys(docsCache))delete docsCache[k];for(const k of Object.keys(xc))delete xc[k];XS.error='';XS.partial=false;defineData();$.CUSTOM;}
/* Partial data is never shown as complete: readiness, totals and "nothing waiting" answers wait, and so do changes. */
const CORE=['rooms','levels','sections','items','grants','questions','organizations'];
function problems(){const out=[];
 for(const role of CORE.concat(['settings'])){const r=cache[role];if(!r||r.pending)continue;const n=cap(ROLE_LABEL[role]);
  if(r.unbound)out.push(n+' table is not connected to this app.');else if(r.unavailable)out.push(n+' records could not be read.');else if(r.truncated||!r.complete&&r.rows.length<r.total)out.push('Only part of the '+ROLE_LABEL[role]+' records was read.');
  if(r.invalid)out.push(plural(r.invalid,'value')+' in '+ROLE_LABEL[role]+' records could not be read.');}
 return out;}
const exact=()=>!problems().length;
const AS_OF=validDate(cfg.asOfOverride)||new Date().toISOString().slice(0,10);
function emailText(type,purpose){const t=$.EMAIL_TEXTS[type]||{},own=t[purpose]||t.all;if(own&&own.subject&&own.body)return {subject:String(own.subject),body:String(own.body),source:t[purpose]?'saved for '+PURPOSE_LABEL[purpose]:'saved for all purposes'};return {...builtinEmail(type,purpose),source:'built-in'};}
const orgName=id=>$.ORG[id]?String($.ORG[id].name||'Unnamed'):'—',personName=id=>$.PERSON[id]?String($.PERSON[id].name||'Unnamed'):'';
const levelsOf=roomId=>$.LEVELS.filter(l=>l.room_id===roomId).sort((a,b)=>num(a.order,0)-num(b.order,0));
const secsOf=roomId=>$.SECS.filter(s=>s.room_id===roomId).sort((a,b)=>secOrder(a.number,b.number)||num(a.order,0)-num(b.order,0));
/* Items keep the order of the room's template (items have no order field), then alphabetical. */
const itemRank=(i)=>{const r=$.ROOM[i.room_id],t=r&&($.TEMPLATES.find(x=>x.id===r.template_id)||BUILTIN_TEMPLATES.find(x=>x.purpose===r.purpose));const all=t?t.content.sections.flatMap(s=>(s.items||[]).map(x=>String(x.title).toLowerCase())):[];const k=all.indexOf(String(i.title||'').toLowerCase());return k<0?9999:k;};
const itemsOf=roomId=>$.ITEMS.filter(i=>i.room_id===roomId).sort((a,b)=>itemRank(a)-itemRank(b)||String(a.title).localeCompare(String(b.title)));
const grantsOf=roomId=>$.GRANTS.filter(g=>g.room_id===roomId);
const questionsOf=roomId=>$.QS.filter(q=>q.room_id===roomId);
const levelKey=l=>'l'+String(l.id).replace(/-/g,'').toLowerCase().slice(0,32);
const levelByKey=(roomId,key)=>levelsOf(roomId).find(l=>levelKey(l)===key)||null;
const levelName=id=>{const l=$.LEVELS.find(x=>x.id===id);return l?String(l.name||'Level'):'—';};
const partyName=g=>personName(g.person_id)||String(g.recipient_email||'Unnamed');
const partyOrg=g=>g.organization_id?orgName(g.organization_id):'';

const cur=()=>$.ROOM[st.roomId]||null;let room=null;
function readiness(items){const req=items.filter(i=>bool(i.required)&&i.status!=='not_applicable'),ready=req.filter(i=>i.status==='ready').length;return {ready,total:req.length,pct:req.length?ready/req.length:null,missing:req.filter(i=>i.status==='missing').sort((a,b)=>secOrder(($.SECS.find(x=>x.id===a.section_id)||{}).number,($.SECS.find(x=>x.id===b.section_id)||{}).number)||itemRank(a)-itemRank(b)),inProgress:req.filter(i=>i.status==='in_progress').length};}
const sectionReady=(sec,items)=>!items.some(i=>i.section_id===sec.id&&bool(i.required)&&i.status==='missing');

/* Platform documents (the one document set every room reuses). */
const docsCache={};
function docsList(){if(docsCache.v)return docsCache.v;if(!inp.saved)return docsCache.v={docs:[],state:'preview'};let r;try{r=tools.call('documents.list',{limit:200});}catch(e){return docsCache.v={docs:[],state:'unavailable'};}if(r&&r.pending){PENDING=true;return docsCache.v={docs:[],state:'pending'};}if(!r||r.unavailable)return docsCache.v={docs:[],state:'unavailable'};return docsCache.v={docs:r.documents||[],state:'ready'};}
const docOf=v=>docsList().docs.find(d=>d.versionId===v)||null;
const latestOf=documentId=>docsList().docs.filter(d=>d.documentId===documentId).sort((a,b)=>num(b.version,0)-num(a.version,0))[0]||null;
const docName=(item)=>{const d=docOf(item.version_id);return d?d.filename:item.version_id?(docsList().state==='ready'?'Document not available to you':'Attached document'):'—';};
const hasNewVersion=item=>{if(!item.document_id||!item.version_id)return null;const l=latestOf(item.document_id);return l&&l.versionId!==item.version_id?l:null;};

/* Exchange: one room group per room, found by its app reference; nothing about links is stored in records. */
const XS={left:40,error:'',partial:false};const xc={};
function xcall(name,v){if(!inp.saved){XS.error='preview';return null;}if(XS.left<=0){XS.partial=true;return null;}XS.left--;
 try{const r=tools.call(name,v);if(r&&r.pending){XS.pending=true;PENDING=true;return null;}if(!r||r.unavailable){XS.error=String(r&&r.message||'Room data is not available.');return null;}return r;}catch(e){XS.error=String(e&&e.message||e).slice(0,300);return null;}}
function xAll(){if(xc.all)return xc.all;const map={},order=[];let complete=false,offset=0;
 for(let i=0;i<2;i++){const p=xcall('exchange.list',{offset});if(!p)break;for(const g of p.groups||[]){map[g.id]=g;order.push(g.id);}if(p.nextOffset===null||p.nextOffset===undefined){complete=true;break;}offset=p.nextOffset;}
 return xc.all={map,order,complete};}
const refOf=r=>'room:'+r.id;
function groupOf(r){if(!r)return null;const all=xAll(),ref=refOf(r);for(const id of all.order)if(all.map[id].appRef===ref)return all.map[id];if(r.exchange_group_id&&all.map[r.exchange_group_id])return all.map[r.exchange_group_id];if(all.complete)return null;const k='r:'+ref;if(has(xc,k))return xc[k];const p=xcall('exchange.list',{appRef:ref});return xc[k]=p&&p.groups&&p.groups[0]||null;}
function exchangeOf(g,grant){if(!g||!grant)return null;const xs=(g.exchanges||[]).filter(e=>e.recordId===grant.id);return xs.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))[0]||null;}
/* Room questions and answers (exchange.listQuestions), in one list: questions, private answers per person, and published answers. */
function messagesOf(g){const Q=questionsOfGroup(g),rows=[];
 for(const q of Q.rows){rows.push({kind:'question',id:q.id,exchangeId:q.exchangeId,recipientName:q.recipientName,body:q.body,createdAt:q.askedAt,reference:{section:q.section?{number:q.section}:null,document:q.documentId?{documentId:q.documentId,title:q.documentTitle||'Document'}:null}});
  for(const a of q.answers||[])if(a.visibility==='private')rows.push({kind:'answer',id:a.id,exchangeId:q.exchangeId,body:a.body,createdAt:a.createdAt});}
 for(const a of Q.published||[])rows.push({kind:'published',id:a.id,level:a.visibility==='level'?a.level:null,question:a.question,body:a.body,createdAt:a.createdAt});
 return {rows,ok:Q.ok};}
function emailsOf(g){if(!g)return [];const k='e:'+g.id;if(xc[k])return xc[k];const p=xcall('exchange.listEmails',{groupId:g.id});return xc[k]=p?p.emails||[]:[];}
const xOk=()=>inp.saved&&!XS.error&&!XS.partial;
/* Party state: from the live exchange when there is one, else the tracked grant row. */
function partyOf(grant){const r=$.ROOM[grant.room_id],g=groupOf(r),e=exchangeOf(g,grant),s=e&&e.status||null,rm=s&&s.kind==='room'?s:null;
 const docs=rm?(rm.documents||[]).filter(d=>num(d.views,0)||num(d.downloads,0)).map(d=>({...d,section:d.section?{number:d.section,title:''}:null,lastViewed:d.lastSeen,firstViewed:null,versions:Object.fromEntries((d.versions||[]).filter(v=>v.views||v.downloads).map(v=>[v.versionId,v]))})):null;
 const seen=rm?[rm.lastOpened,...(rm.documents||[]).map(d=>d.lastSeen)].filter(Boolean).sort().slice(-1)[0]||null:null;
 return {grant,exchange:e,status:rm?(rm.state==='ended'?'expired':rm.state):String(grant.status||'invited'),linked:!!e,levels:rm?rm.levels:list(grant.level_ids).map(id=>{const l=$.LEVELS.find(x=>x.id===id);return l?levelKey(l):'';}).filter(Boolean),open:rm?rm.openLevels:[],
  documents:docs?docs:$.ENG.filter(x=>x.grant_id===grant.id).map(x=>({documentId:x.document_ref,title:x.document_title,views:num(x.view_count,0),seconds:num(x.seconds_viewed,0),downloads:num(x.downloads,0),lastViewed:x.last_viewed_on,firstViewed:x.first_viewed_on,section:null,versions:{}})),
  lastSeen:rm?seen:grant.last_seen_on||null,history:rm?rm.history||[]:[],expiresAt:e?e.expiresAt:grant.expires_on||null,slots:s?s.documentsBack||[]:[],questions:rm?rm.questions:0};}
function questionsOfGroup(g){if(!g)return {rows:[],published:[],ok:false};const k='q:'+g.id;if(xc[k])return xc[k];const rows=[];let published=[],ok=true,offset=0;for(let i=0;i<4;i++){const p=xcall('exchange.listQuestions',{groupId:g.id,offset});if(!p){ok=false;break;}rows.push(...(p.questions||[]));if(i===0)published=p.published||[];if(p.nextOffset===null||p.nextOffset===undefined)break;offset=p.nextOffset;if(i===3)ok=false;}return xc[k]={rows,published,ok};}
const isLevelConfidential=(roomId,key)=>{const l=levelByKey(roomId,key);return !!l&&l.kind!=='non_confidential';};
/* Quiet: live access, nothing opened for the quiet days. Hot: 5+ opens this week, or Confidential documents opened 3+ times. */
function signals(p){const recent=p.documents.filter(d=>d.lastViewed&&diffDays(String(d.lastViewed).slice(0,10),AS_OF)<=7),opens=recent.reduce((n,d)=>n+num(d.views,0),0);
 const confOpens=p.documents.filter(d=>d.level&&isLevelConfidential(p.grant.room_id,d.level)).reduce((n,d)=>n+num(d.views,0),0);
 const since=p.lastSeen?diffDays(String(p.lastSeen).slice(0,10),AS_OF):p.grant.granted_on?diffDays(String(p.grant.granted_on).slice(0,10),AS_OF):null;
 return {hot:p.status==='active'&&(opens>=5||confOpens>=3),quiet:['invited','active'].includes(p.status)&&since!==null&&since>=$.QUIET,since,opens};}

/* Writes (P5, G5): record changes save directly with records.save (at most 50 per action) from the person's own click, change or
 * submit, with the version captured when editing started. Delete is an archive. Record changes that travel with an exchange change
 * that reaches people outside join its one confirmation. Commands buffer their changes and save once at the end, so a failing
 * step saves nothing. */
function toReal(role,data){const m=roleMap[role];if(!m)throw Error('The '+ROLE_LABEL[role]+' table is not connected.');const out={};for(const [k,v] of Object.entries(data)){if(v===undefined)continue;if(!m.fields[k])continue;if(!m.writable.includes(k))throw Error('You cannot edit '+k.replace(/_/g,' ')+' in the '+ROLE_LABEL[role]+' table.');out[m.fields[k]]=v;}return out;}
const crt=(role,data)=>{if(!canWrite(role))throw Error('You cannot add a '+ROLE_LABEL[role]+' here.');return {kind:'create_record',typeId:roleMap[role].typeId,data:toReal(role,data)};};
const upd=(role,row,data,version)=>{if(!row)throw Error('That '+ROLE_LABEL[role]+' is no longer available.');if(!canWrite(role))throw Error('You cannot change this '+ROLE_LABEL[role]+'.');return {kind:'update_record',recordId:row.id,expectedVersion:version===undefined||version===null?row.version:version,data:toReal(role,data)};};
const arch=(role,row)=>{if(!row)throw Error('That '+ROLE_LABEL[role]+' is no longer available.');if(!canWrite(role))throw Error('You cannot delete this '+ROLE_LABEL[role]+'.');return {kind:'archive_record',recordId:row.id,expectedVersion:row.version};};
let BUFFER=[];const PREPARED=[];let SAVED=false,REVIEW=false,FRESH=false;
function joinRecords(changes){changes=changes.filter(Boolean);if(!changes.length)return 0;if(changes.length>50)throw Error('Too many record changes for one action.');if(CMD){BUFFER.push(...changes);return changes.length;}tools.call('records.save',{changes});SAVED=true;return changes.length;}
function save(changes,message){changes=changes.filter(Boolean);if(!changes.length)throw Error('There is nothing to save.');if(changes.length>50)throw Error('This change needs '+changes.length+' record writes; one action saves at most 50. Save it in smaller parts.');if(CMD){BUFFER.push(...changes);PREPARED.push(message||'Saved.');return;}tools.call('records.save',{changes});SAVED=true;say('success',message||'Saved.');}
/* One exchange change per click. Preparing what nobody outside has seen applies at once; what reaches people outside is shown for
 * the person's one confirmation in TrialAgents, and nothing goes out before it. */
function xwrite(name,payload,message,saved){if(CMD)throw Error('This shares, sends or changes the live room, so a person does it with a click in Data Room. Commands save records only.');if(!inp.saved)throw Error('Save the app to share rooms.');if(!inp.writable||cfg.readOnly===true)throw Error('You cannot change rooms in this app.');if(!isAct)throw Error('Room changes need an explicit click.');
 const r=tools.call(name,payload);if(r&&r.status==='saved'){say('success',saved||'Done.');FRESH=true;return r;}if(!r||r.status!=='review_required')throw Error(String(r&&r.message||'The room change could not be prepared.'));REVIEW=true;say('info',message||'Confirm it in TrialAgents. Nothing goes out before that.');return r;}
/* In the browser, an action that touched data still on its way is sent to the server, which has it all. */
function needServer(){try{tools.call('records.save',{changes:[]});}catch(e){}}
const textOf=(v,max)=>String(v===null||v===undefined?'':v).trim().slice(0,max||300);

/* The room as the platform shows it: levels with entry steps, documents placed by section and level, room emails per purpose. */
const entryOf=(r,l)=>l.entry==='signed_cda'?'signed_document':l.entry==='click_through'?'click_through':'none';
/* A signed-CDA level is unlocked by the accepted upload in its own requested-document slot. */
const slotOf=l=>'signed_'+levelKey(l);
const levelPayload=(r,l)=>({key:levelKey(l),name:textOf(l.name,80)||'Level',entry:entryOf(r,l),...(l.entry==='click_through'?{text:$.ENTRY_TEXT}:{}),...(l.entry==='signed_cda'?{slot:slotOf(l)}:{})});
function placementOf(r){const secs=byId(secsOf(r.id)),lv=byId(levelsOf(r.id)),seen=new Set(),out=[];
 for(const i of itemsOf(r.id).filter(i=>i.version_id&&i.status!=='not_applicable').sort((a,b)=>secOrder((secs[a.section_id]||{}).number,(secs[b.section_id]||{}).number))){
  if(seen.has(i.version_id)||!lv[i.level_id])continue;seen.add(i.version_id);const s=secs[i.section_id]||{number:'',name:''};
  const sn=textOf(s.number,12),section=/^[0-9A-Za-z]{1,6}(\.[0-9A-Za-z]{1,6}){0,4}$/.test(sn)?{number:sn,title:textOf(s.name,160)||'Documents'}:undefined;
  out.push({versionId:String(i.version_id),title:textOf(i.title,200)||'Document',section,order:Math.max(0,Math.round(num(i.order,out.length))),level:levelKey(lv[i.level_id]),viewOnly:bool(i.view_only),itemId:i.id,documentId:i.document_id||''});}
 return out;}
function roomConfig(r,cdaDoc){const lv=levelsOf(r.id),place=placementOf(r).map(({itemId,documentId,...p})=>p).map(p=>p.section?p:(({section,...rest})=>rest)(p));
 if(cdaDoc&&!place.some(p=>p.versionId===cdaDoc)&&lv[0])place.push({versionId:cdaDoc,title:'CDA to sign',section:{number:'0',title:'Agreements'},order:0,level:levelKey(lv[0]),viewOnly:false,toSign:true});
 const emailDefaults={};for(const t of EMAIL_TYPES){const x=emailText(t,r.purpose);emailDefaults[t]={subject:x.subject,body:x.body};}
 return {kind:'room',appRef:refOf(r),title:textOf(r.name,160),summary:textOf(r.welcome_note,20000),verifyEmail:true,
  levels:lv.map(l=>levelPayload(r,l)),slots:lv.filter(l=>l.entry==='signed_cda').map(l=>({key:slotOf(l),label:textOf('Signed CDA for '+l.name,120),required:false})),
  documents:place,tracking:{...(roleMap.grants?{accessTypeId:roleMap.grants.typeId}:{}),...(roleMap.engagement?{engagementTypeId:roleMap.engagement.typeId}:{})},notifyEngagement:true,notifyAccessEnding:r.access_ending_reminder===null||r.access_ending_reminder===undefined||r.access_ending_reminder===''?true:bool(r.access_ending_reminder),quietDays:$.QUIET,emailDefaults};}
/* What the room shows now versus the index: documents to add, remove or move, and newer versions to show in place. */
function syncPlan(r,g){if(!g)return null;const want=placementOf(r),have=(g.documents||[]).filter(d=>!d.gate);
 const replace=[],add=[],remove=[],place=[];
 for(const p of want){const same=have.find(d=>d.versionId===p.versionId);if(same){if(same.level!==p.level||!!same.viewOnly!==p.viewOnly||(same.section||{}).number!==(p.section||{}).number||(same.section||{}).title!==(p.section||{}).title||(same.title||'')!==p.title)place.push(p);continue;}
  const older=p.documentId&&have.find(d=>d.documentId===p.documentId);if(older)replace.push({from:older,to:p});else{add.push(p);place.push(p);}}
 for(const d of have)if(!want.some(p=>p.versionId===d.versionId)&&!replace.some(x=>x.from.versionId===d.versionId))remove.push(d);
 return {replace,add,remove,place,changes:replace.length+add.length+remove.length+place.length};}
function closeAll(){st.editor=null;st.panel=null;}
const lookup=(role,id)=>R[role].allRows.find(r=>r.id===id)||null;
const DATE_KEYS=['due','granted_on','expires_on','asked_on','answered_on','updated_on'];
/* Generic editor for the plain fields of a record (tracked and app-managed fields are never shown as editable). */
const editable=role=>S[role].filter(f=>!['frozen','tracked'].includes(f.kind)&&f.key!=='archived'&&roleMap[role]&&roleMap[role].fields[f.key]);
function openEditor(role,mode,id,preset){closeAll();let draft={...(preset||{})},version=null;
 if(mode!=='create'){const r=lookup(role,id);if(!r)throw Error('That record is no longer available.');draft={...r.data};version=r.version;}
 if(mode==='create'&&FORM_GROUP[role])for(const f of editable(role)){const v=LP.defaults[FORM_GROUP[role]+':'+f.key];if(v!==undefined&&(draft[f.key]===undefined||draft[f.key]===''))draft[f.key]=f.kind==='boolean'?bool(v):v;}
 st.editor={role,mode,id:mode==='edit'?id:null,version,draft,fixed:mode==='create'&&preset?preset:{}};}
/* One value of a form or an inline cell, checked against its field. */
function fieldValue(f,v){if(f.kind==='boolean')return bool(v);
 if(v===null||v===undefined||String(v).trim()===''){if(f.required)throw Error(f.label+' is required.');return null;}
 v=String(v).trim();
 if(f.kind==='number'){const n=num(v);if(n===null||n<0)throw Error(f.label+' must be a number of 0 or more.');return n;}
 if(f.kind==='date'){if(!validDate(v))throw Error(f.label+' must be a date.');return v;}
 if(f.kind==='select'){if(!f.options.includes(v))throw Error('Choose a valid '+f.label.toLowerCase()+'.');return v;}
 if(f.kind==='ref'){if(!R[f.ref].allRows.some(r=>r.id===v))throw Error('Choose an existing '+f.label.toLowerCase()+'.');return v;}
 return v.slice(0,f.kind==='longtext'?20000:300);}
function valuesFromForm(role,source){const out={};for(const f of editable(role)){if(!has(source,f.key)&&f.kind!=='boolean')continue;out[f.key]=fieldValue(f,source[f.key]);}return out;}
/* Index structure: levels and sections first (one review), then the checklist items that point at them (a second review). */
function templateOf(r){return $.TEMPLATES.find(t=>t.id===r.template_id)||BUILTIN_TEMPLATES.find(t=>t.purpose===r.purpose)||BUILTIN_TEMPLATES[0];}
function structurePlan(r){const t=templateOf(r),out=[];
 if(!levelsOf(r.id).length){out.push(crt('levels',{room_id:r.id,name:'Non-confidential',kind:'non_confidential',order:1,entry:'none'}));
  out.push(crt('levels',{room_id:r.id,name:'Confidential',kind:'confidential',order:2,entry:r.cda_option==='send_pdf'||r.cda_option==='contracts'?'signed_cda':r.cda_option==='none'?'click_through':'none'}));}
 if(!secsOf(r.id).length)t.content.sections.forEach((s,i)=>out.push(crt('sections',{room_id:r.id,number:textOf(s.number,12),name:textOf(s.name,160),order:i+1})));
 return out;}
function itemsPlan(r){const t=templateOf(r),secs=secsOf(r.id),lv=levelsOf(r.id),out=[],have=itemsOf(r.id);
 const levelFor=kind=>(lv.find(l=>l.kind===kind)||lv[kind==='non_confidential'?0:lv.length-1]||{}).id;
 for(const s of t.content.sections){const sec=secs.find(x=>String(x.number)===String(s.number));if(!sec)continue;
  for(const it of s.items||[])if(!have.some(h=>h.section_id===sec.id&&String(h.title).toLowerCase()===String(it.title).toLowerCase()))out.push(crt('items',{room_id:r.id,section_id:sec.id,title:textOf(it.title,300),required:!!it.required,status:'missing',level_id:levelFor(it.level||'confidential'),view_only:$.VIEW_ONLY}));}
 return out;}
const roomGroupLevels=(r,g)=>{const want=levelsOf(r.id).map(l=>levelPayload(r,l)),pick=l=>({key:l.key,name:l.name,entry:l.entry}),have=(g&&g.levels||[]).map(pick);
 const missingSlots=levelsOf(r.id).filter(l=>l.entry==='signed_cda'&&!(g&&g.slots||[]).some(s=>s.key===slotOf(l)));return {want,differs:JSON.stringify(want.map(pick))!==JSON.stringify(have),missingSlots};};

/* Shared by screens and commands: what is waiting, call briefs, who can be told about which documents, custom field registration. */
function waitingData(){const live=$.ROOMS.filter(r=>r.status==='live'),parties=$.GRANTS.map(partyOf),logged=new Set($.QS.map(q=>q.message_id));
 const openQ=$.QS.filter(q=>!['answered','published','declined'].includes(q.status)),overdueQ=openQ.filter(q=>q.due&&q.due<AS_OF),cdas=parties.filter(p=>p.slots.some(s=>s.status==='received')),due=$.ITEMS.filter(i=>i.due&&i.status!=='ready'&&i.status!=='not_applicable'&&diffDays(AS_OF,i.due)<=7&&$.ROOM[i.room_id]);
 const unlogged=live.reduce((n,r)=>{const g=groupOf(r);if(!g)return n;return n+messagesOf(g).rows.filter(m=>m.kind==='question'&&!logged.has(m.id)).length;},0);
 return {live,parties,openQ,overdueQ,cdas,due,unlogged};}
function changedFor(r,p){return itemsOf(r.id).filter(i=>i.version_id&&i.updated_on&&(!p.lastSeen||i.updated_on>String(p.lastSeen).slice(0,10))&&p.open.some(k=>{const l=levelByKey(r.id,k);return l&&l.id===i.level_id;}));}
function briefText(grant){const rr=$.ROOM[grant.room_id],p=partyOf(grant),open=questionsOf(rr.id).filter(q=>q.grant_id===grant.id&&!['answered','published','declined'].includes(q.status)),ch=changedFor(rr,p);
 return [partyName(grant)+(partyOrg(grant)?', '+partyOrg(grant):'')+' — '+rr.name+' (as of '+dateLabel(AS_OF)+')','Status: '+cap(p.status)+'; levels: '+p.levels.map(k=>(levelByKey(rr.id,k)||{name:k}).name).join(', ')+'; last seen: '+(p.lastSeen?stamp(p.lastSeen):'never'),'','Opened:',...(p.documents.length?p.documents.slice().sort((a,b)=>num(b.views,0)-num(a.views,0)).map(d=>'- '+d.title+': '+plural(num(d.views,0),'open')+', '+mins(d.seconds)+(num(d.downloads,0)?', '+plural(num(d.downloads,0),'download'):'')):['- nothing yet']),'','Changed since their last visit:',...(ch.length?ch.map(i=>'- '+i.title):['- nothing']),'','Open questions:',...(open.length?open.map(q=>'- '+String(q.question).slice(0,200)):['- none'])].join('\n');}
/* Notify parties: documents in the live room (newest change first) and the people with a link who can open at least one of them. */
function notifyCandidates(r,g){const docs=(g&&g.documents||[]).filter(d=>!d.gate).map(d=>({versionId:d.versionId,documentId:d.documentId,title:d.title||d.filename||'Document',level:d.level,levelName:(levelByKey(r.id,d.level)||{name:'—'}).name,section:d.section&&d.section.number||'',changedAt:[d.addedAt,d.updatedAt].filter(Boolean).sort().slice(-1)[0]||'',updated:!!d.updatedAt}))
  .sort((a,b)=>String(b.changedAt).localeCompare(String(a.changedAt))).slice(0,40);
 const parties=grantsOf(r.id).map(partyOf).filter(p=>p.linked&&p.exchange&&['invited','active'].includes(p.status));
 return {docs,parties};}
const recentChange=d=>d.changedAt&&diffDays(String(d.changedAt).slice(0,10),AS_OF)<=14;
function customFieldsSave(role,key,spec){if(!CF_ROLES.includes(role))throw Error('Custom fields can be added to rooms, index items, parties or questions.');if(!/^[a-z][a-z0-9_]{0,39}$/.test(String(key)))throw Error('Use a lowercase key such as deal_code.');
 const cur=(()=>{const v=$.settingsRow?parseJSON($.SETTING.custom_fields):null;return Array.isArray(v)?v.filter(c=>c&&typeof c==='object'):[];})();const rest=cur.filter(c=>!(c.role===role&&c.key===key));
 if(!spec&&rest.length===cur.length)throw Error('There is no custom field '+key+' on '+ROLE_LABEL[role]+' records.');
 if(spec&&S[role].some(f=>!f.custom&&f.key===key))throw Error(key+' is a built-in field of '+ROLE_LABEL[role]+' records.');
 const next=spec?rest.concat([spec]):rest;if(next.length>60)throw Error('At most 60 custom fields.');const v={custom_fields:JSON.stringify(next)};
 save([$.settingsRow?upd('settings',$.settingsRow,v):crt('settings',{...v,qa_approval_required:true,quiet_days:10,default_access_days:180})],spec?'Custom field '+spec.label+' saved.':'Custom field '+key+' removed from the app; its values stay in the table.');}

/* App commands (appCommands, line 3): the same handler as the screens. Read commands return the app's own results; write commands
 * save the click path's exact records. Nothing is shared, sent, granted or changed in a live room by a command. */
const useRoom=id=>{if(!$.ROOM[id])throw Error('Room not found.');st.roomId=id;return $.ROOM[id];};
const need=(x,what)=>{if(!x)throw Error(what+' not found.');return x;};
const on=v=>v===true?'on':v===false?'':v;
const ROLE_FORMS=['rooms','levels','sections','items','questions','grants','organizations','people'];
function formFor(role,values){const out={},fs=editable(role);for(const [k,v] of Object.entries(values||{})){const f=fs.find(x=>x.key===k)||fs.find(x=>x.custom&&x.real===k)||(role==='items'&&k==='level_id'?{key:'level_id'}:null);if(!f)throw Error(k+' is not a field you can set on '+ROLE_LABEL[role]+' records. Use schema.describe for the fields.');out[f.key]=typeof v==='boolean'?on(v):v===null?'':v;}return out;}
const pr=p=>({grant_id:p.grant.id,name:partyName(p.grant),organization:partyOrg(p.grant)||null,email:p.grant.recipient_email||null,status:p.status,has_link:p.linked,levels:p.levels.map(k=>({name:(levelByKey(p.grant.room_id,k)||{name:k}).name,open:p.open.includes(k)})),cda_status:p.grant.cda_status||null,granted_on:p.grant.granted_on||null,access_ends:p.expiresAt?String(p.expiresAt).slice(0,10):null,last_seen:p.lastSeen||null,...(()=>{const s=signals(p);return {hot:s.hot,quiet:s.quiet,opens_this_week:s.opens};})(),custom:customValues('grants',p.grant)});
const COMMANDS={
 'schema.describe':()=>({screens:SCREENS.map(s=>({id:s.id,label:s.label,visible:st.layout.visible[s.id]!==false})),layout_groups:Object.fromEntries(Object.entries(templateLayoutSchema.groups).map(([g,fs])=>[g,fs.map(f=>f.id)])),
  forms:Object.fromEntries(ROLE_FORMS.filter(r=>roleMap[r]).map(r=>[r,{writable:canWrite(r),fields:editable(r).map(f=>({key:f.custom?f.real:f.key,label:fieldLabel(r,f),kind:f.kind,required:!!f.required,...(f.options?{options:f.options}:{}),...(f.ref?{ref:f.ref}:{}),...(f.custom?{custom:true}:{})}))}])),
  custom_fields:$.CUSTOM.map(c=>({role:c.role,key:c.real,label:c.label,kind:c.kind,options:c.options||null,bound:!!(roleMap[c.role]&&roleMap[c.role].fields[c.key])})),purposes:PURPOSES,cda_options:CDA_OPTIONS,item_status:ITEM_STATUS,question_status:Q_STATUS,email_types:EMAIL_TYPES,
  templates:$.TEMPLATES.map(t=>({id:t.id,name:t.name,purpose:t.purpose,builtin:!!t.builtin})),commands:appCommands.map(c=>({id:c.id,mode:c.mode})),
  not_by_command:'Making a room live, publishing index changes, showing a new version in a live room, giving access, sending email, changing a live party\'s levels, accepting a CDA, revoking, extending, answering, publishing and archiving a live room are a person\'s clicks in Data Room. Assistants can prepare the emails with prepare_exchange_email and the room changes with prepare_workspace_change for a person to confirm.'}),
 'rooms.read':()=>({complete:exact(),rooms:$.ROOMS.map(r=>{const rd=readiness(itemsOf(r.id)),ps=grantsOf(r.id).map(partyOf),g=groupOf(r);return {room_id:r.id,name:r.name,purpose:r.purpose,status:r.status,live:!!g,cda_option:r.cda_option,template:templateOf(r).name,readiness:exact()?{ready:rd.ready,required:rd.total,pct:rd.pct===null?null:Math.round(rd.pct*100)}:null,parties_with_link:ps.filter(p=>p.linked).length,parties_active:ps.filter(p=>p.status==='active').length,access_ending_reminder:r.access_ending_reminder===false||r.access_ending_reminder==='false'?false:true,custom:customValues('rooms',r)};})}),
 'waiting.read':()=>{const w=waitingData();return {complete:exact()&&xOk(),questions_to_log:w.unlogged,overdue_answers:w.overdueQ.map(q=>({question_id:q.id,question:String(q.question).slice(0,300),due:q.due})),open_questions:w.openQ.filter(q=>!w.overdueQ.includes(q)).map(q=>({question_id:q.id,question:String(q.question).slice(0,300),status:q.status})),signed_cdas_to_accept:w.cdas.map(p=>({grant_id:p.grant.id,party:partyName(p.grant)})),items_due:w.due.map(i=>({item_id:i.id,title:i.title,due:i.due,owner:i.owner||null,room:($.ROOM[i.room_id]||{}).name}))};},
 'index.read':v=>{const r=useRoom(v.room_id),its=itemsOf(r.id);return {complete:exact(),room:r.name,sections:secsOf(r.id).map(s=>({section_id:s.id,number:s.number,name:s.name,items:its.filter(i=>i.section_id===s.id).map(i=>{const nv=hasNewVersion(i);return {item_id:i.id,title:i.title,required:bool(i.required),status:i.status,owner:i.owner||null,due:i.due||null,document:i.version_id?docName(i):null,version_id:i.version_id||null,newer_version:nv?nv.version:null,level:levelName(i.level_id),level_id:i.level_id||null,view_only:bool(i.view_only),updated_on:i.updated_on||null,custom:customValues('items',i)};})})),levels:levelsOf(r.id).map(l=>({level_id:l.id,name:l.name,kind:l.kind,entry:l.entry}))};},
 'readiness.read':v=>{const r=useRoom(v.room_id),its=itemsOf(r.id),rd=readiness(its);if(!exact())return {complete:false,message:problems()[0]};return {complete:true,ready:rd.ready,required:rd.total,pct:rd.pct===null?null:Math.round(rd.pct*100),in_progress:rd.inProgress,missing:rd.missing.map(i=>({item_id:i.id,title:i.title,owner:i.owner||null,due:i.due||null})),sections:secsOf(r.id).map(s=>{const x=readiness(its.filter(i=>i.section_id===s.id));return {number:s.number,name:s.name,ready:x.ready,required:x.total,complete:sectionReady(s,its)};})};},
 'parties.read':v=>{const r=useRoom(v.room_id);return {complete:exact()&&xOk(),live:!!groupOf(r),parties:grantsOf(r.id).map(partyOf).map(pr)};},
 'activity.read':v=>{const r=useRoom(v.room_id),secs=secsOf(r.id),its=itemsOf(r.id),ps=grantsOf(r.id).map(partyOf).filter(p=>p.linked||p.documents.length);
  const secOf=d=>d.section&&d.section.number?d.section.number:(()=>{const i=its.find(x=>x.document_id===d.documentId);const s=i&&secs.find(x=>x.id===i.section_id);return s?s.number:'';})();
  return {complete:xOk(),note:'Opens of a version within 30 minutes count once; time is approximate visible time.',parties:ps.map(p=>({party:partyName(p.grant),grant_id:p.grant.id,last_seen:p.lastSeen||null,downloads:p.documents.reduce((n,d)=>n+num(d.downloads,0),0),opens_by_section:Object.fromEntries(secs.map(s=>[s.number,p.documents.filter(d=>secOf(d)===s.number).reduce((n,d)=>n+num(d.views,0),0)])),documents:p.documents.map(d=>({title:d.title,opens:num(d.views,0),seconds:num(d.seconds,0),downloads:num(d.downloads,0),last:d.lastSeen||d.lastViewed||null})),...(()=>{const s=signals(p);return {hot:s.hot,quiet:s.quiet};})()}))};},
 'changes.read':v=>{const r=useRoom(v.room_id);return {parties:grantsOf(r.id).map(partyOf).filter(p=>p.linked||p.documents.length).map(p=>({party:partyName(p.grant),grant_id:p.grant.id,last_seen:p.lastSeen||null,changed:changedFor(r,p).map(i=>i.title)}))};},
 'brief.read':v=>({text:briefText(need($.GRANT[v.grant_id],'Party'))}),
 'questions.read':v=>{const r=useRoom(v.room_id),g=groupOf(r),M=g?messagesOf(g):{rows:[],ok:false},logged=new Set($.QS.map(q=>q.message_id)),f=v.status||'open';
  return {complete:exact()&&(!g||M.ok),approval_required:$.QA_APPROVAL,new_from_room:M.rows.filter(m=>m.kind==='question'&&!logged.has(m.id)).map(m=>({message_id:m.id,question:String(m.body).slice(0,2000),asked:m.createdAt,section:m.reference&&m.reference.section?m.reference.section.number:null})),
   log:questionsOf(r.id).filter(q=>f==='all'||(f==='open'?!['answered','published','declined'].includes(q.status):q.status===f)).map(q=>({question_id:q.id,party:$.GRANT[q.grant_id]?partyName($.GRANT[q.grant_id]):null,question:q.question,category:q.category||null,status:q.status,assignee:q.assignee||null,due:q.due||null,answer:q.answer||null,approved_by:q.approved_by||null,visibility:q.visibility||null,custom:customValues('questions',q)}))};},
 'notify.read':v=>{const r=useRoom(v.room_id),g=groupOf(r);if(!g)return {live:false,documents:[],message:'The room is not live yet.'};const c=notifyCandidates(r,g);
  return {live:true,documents:c.docs.map(d=>({version_id:d.versionId,title:d.title,level:d.levelName,section:d.section||null,changed:d.changedAt||null,kind:d.updated?'updated':'new',recent:!!recentChange(d),can_open:c.parties.filter(p=>p.open.includes(d.level)).map(p=>partyName(p.grant))})),how:'A person sends it from Rooms → Notify parties (one confirmed send; each person gets only the chosen documents they can open). Assistants can prepare the same batch with prepare_exchange_email (emailType documents_updated, versionIds).'};},
 'settings.read':()=>({settings:{default_access_days:$.ACCESS_DAYS,view_only_default:$.VIEW_ONLY,quiet_days:$.QUIET,qa_approval_required:$.QA_APPROVAL,entry_text:$.ENTRY_TEXT,sender_display:$.SENDER_KIND==='person'?'first_name':'organization'},email_texts:Object.fromEntries(EMAIL_TYPES.map(t=>[t,Object.fromEntries(['all'].concat(PURPOSES).map(p=>{const x=emailText(t,p==='all'?'other':p);return [p,{subject:x.subject,body:x.body,source:x.source}];}))])),templates:$.TEMPLATES.map(t=>({id:t.id,name:t.name,purpose:t.purpose,builtin:!!t.builtin,content:t.content})),custom_fields:$.CUSTOM.map(c=>({role:c.role,key:c.real,label:c.label,kind:c.kind,options:c.options||null}))}),
 'room.create':v=>{const f={name:v.name,purpose:v.purpose,cda_option:v.cda_option,template_id:v.template_id||'',round_id:v.round_id||'',opportunity_ref:v.opportunity_ref||'',welcome_note:v.welcome_note||'',contact_person_id:v.contact_person_id||'',owner:v.owner||''};
  if(has(v,'access_ending_reminder'))f.access_ending_reminder=on(v.access_ending_reminder);for(const id of v.program_ids||[]){if(!$.PROGRAM[id])throw Error('Program '+id+' not found.');f['p_'+id]='on';}handle({kind:'submit',action:'create-room',form:f});return {};},
 'room.setup_structure':v=>{useRoom(v.room_id);handle({kind:'click',action:'setup-structure:'+v.room_id});return {};},
 'room.setup_items':v=>{useRoom(v.room_id);handle({kind:'click',action:'setup-items:'+v.room_id});return {};},
 'room.status':v=>{useRoom(v.room_id);handle({kind:'click',action:'room-status:'+v.room_id+':'+v.status});return {};},
 'record.save':v=>{const role=v.role;if(v.id){if(!lookup(role,v.id))throw Error('That '+ROLE_LABEL[role]+' is not available.');handle({kind:'click',action:'details:'+role+':'+v.id});}
  else{if(role==='grants')throw Error('Add a party with party.add.');if(['levels','sections','questions'].includes(role))useRoom(v.room_id);const ctx=role==='items'?v.section_id||'':role==='people'?v.organization_id||'':'';handle({kind:'click',action:'add:'+role+(ctx?':'+ctx:'')});}
  if(!st.editor)throw Error(FLASH&&FLASH.message||'The form could not be opened.');handle({kind:'submit',action:'save-record',form:formFor(role,v.values)});return {};},
 'record.archive':v=>{need(lookup(v.role,v.id),cap(ROLE_LABEL[v.role]));handle({kind:'click',action:'archive:'+v.role+':'+v.id});return {};},
 'item.attach':v=>{need($.ITEMS.find(i=>i.id===v.item_id),'Index item');st.panel={type:'attach',id:v.item_id};handle({kind:'submit',action:'save-attach',form:{version_id:v.version_id,level_id:v.level_id,view_only:on(!!v.view_only),ready:on(!!v.ready)}});return {};},
 'item.use_version':v=>{need($.ITEMS.find(i=>i.id===v.item_id),'Index item');handle({kind:'click',action:'use-version:'+v.item_id});return {};},
 'party.add':v=>{const r=useRoom(v.room_id),f={email:v.email||'',person_id:v.person_id||'',organization_id:v.organization_id||''};if(has(v,'days'))f.days=v.days===null?'':String(v.days);
  for(const id of v.level_ids){if(!levelsOf(r.id).some(l=>l.id===id))throw Error('Level '+id+' is not a level of this room.');f['l_'+id]='on';}handle({kind:'submit',action:'save-party',form:f});return {};},
 'party.levels':v=>{const grant=need($.GRANT[v.grant_id],'Party'),f={};for(const id of v.level_ids)f['l_'+id]='on';if(v.cda_mode)f.cda_mode=v.cda_mode;if(v.cda_date)f.cda_date=v.cda_date;if(v.agreement_id)f.agreement_id=v.agreement_id;
  st.roomId=grant.room_id;st.panel={type:'levels',id:grant.id};handle({kind:'submit',action:'save-levels',form:f});return {};},
 'questions.log':v=>{useRoom(v.room_id);const f={};for(const id of v.message_ids)f['m_'+id]='on';handle({kind:'submit',action:'log-questions',form:f});return {};},
 'question.save':v=>{const q=need($.QUESTION[v.question_id],'Question');st.roomId=q.room_id;st.panel={type:'answer',id:q.id};
  const f={answer:has(v,'answer')?v.answer:q.answer||'',assignee:has(v,'assignee')?v.assignee:q.assignee||'',due:has(v,'due')?v.due:q.due||'',category:has(v,'category')?v.category:q.category||'',approver:v.approver||'',...(v.reused_from?{reused_from:v.reused_from}:{})};
  handle({kind:'submit',action:'save-answer',value:v.step||'save',form:f});return {};},
 'settings.save':v=>{const f={default_access_days:has(v,'default_access_days')?(v.default_access_days===null?'':String(v.default_access_days)):($.ACCESS_DAYS===null?'':String($.ACCESS_DAYS)),quiet_days:String(has(v,'quiet_days')?v.quiet_days:$.QUIET),view_only_default:on(has(v,'view_only_default')?v.view_only_default:$.VIEW_ONLY),qa_approval_required:on(has(v,'qa_approval_required')?v.qa_approval_required:$.QA_APPROVAL),entry_text:has(v,'entry_text')?v.entry_text:String($.SETTING.entry_text||''),sender_display:v.sender_display||($.SENDER_KIND==='person'?'first_name':'organization')};
  handle({kind:'submit',action:'save-settings',form:f});return {};},
 'email_text.save':v=>{handle({kind:'submit',action:'save-email',form:{type:v.type,purpose:v.purpose,subject:v.subject,body:v.body}});return {};},
 'email_text.reset':v=>{Object.assign(draftOf('email'),{type:v.type,purpose:v.purpose});handle({kind:'click',action:'reset-email'});return {};},
 'template.copy':v=>{handle({kind:'click',action:'copy-template:'+v.template_id});return {};},
 'template.save':v=>{st.panel={type:'template',id:v.template_id};const t=need($.TEMPLATE_ROWS.find(x=>x.id===v.template_id),'Editable template');handle({kind:'submit',action:'save-template',form:{name:v.name||t.name,purpose:v.purpose||t.purpose,content:v.content}});return {};},
 'custom_field.save':v=>{if(v.kind==='select'&&!(v.options||[]).length)throw Error('A select field needs options.');const spec={role:v.role,key:v.key,label:String(v.label).trim(),kind:v.kind,...(v.kind==='select'?{options:v.options}:{})};customFieldsSave(v.role,v.key,spec);
  const m=roleMap[v.role],bound=!!(m&&bindings.some(b=>b.typeId===m.typeId&&(b.fields||[]).includes(v.key)));
  return bound?{schema_change:{required:false}}:{schema_change:{required:true,message:'Then add the field '+v.key+' ('+v.kind+(v.kind==='select'?', options '+v.options.join(', '):'')+') to the '+ROLE_LABEL[v.role]+' table with a reviewed schema change (prepare_change update_type), and add it to this app\'s binding for that table with an app revision that changes only the binding (begin_app_update; the app code stays the same).',role:ROLE_KEY[v.role],typeId:m?m.typeId:null,field:{key:v.key,kind:v.kind==='longtext'?'text':v.kind,...(v.kind==='select'?{options:v.options}:{})}}};},
 'custom_field.remove':v=>{customFieldsSave(v.role,v.key,null);return {};},
 'layout.save':v=>{const prof=(()=>{try{return JSON.parse(cfg.layoutProfile||'{}');}catch(e){return {};}})(),L=st.layout;
  const out={heading:String(v.heading||L.heading).slice(0,100),tabs:L.tabs.slice(),cols:JSON.parse(JSON.stringify(L.cols)),visible:{...L.visible},labels:{...(prof.labels||{})},defaults:{...(prof.defaults||{})}};
  for(const k of Object.keys(out.visible))if(k.includes('.')&&!k.includes(':')){out.visible[k.replace('.',':')]=out.visible[k];delete out.visible[k];}
  if(v.screens){const want=v.screens.filter(x=>out.tabs.includes(x));out.tabs=[...new Set(want.concat(out.tabs))];}
  for(const [g,ids] of Object.entries(v.order||{})){if(!out.cols[g]||!Array.isArray(ids))throw Error('Unknown field group: '+g);out.cols[g]=[...new Set(ids.filter(x=>out.cols[g].includes(x)).concat(out.cols[g]))];}
  const key=k=>{if(SCREENS.some(x=>x.id===k))return k;const [g,f]=String(k).split(':');if(!out.cols[g]||!out.cols[g].includes(f))throw Error('Unknown screen or field: '+k+' (use a screen id, or group:field).');return k;};
  for(const k of v.hide||[])out.visible[key(k)]=false;for(const k of v.show||[])delete out.visible[key(k)];
  for(const [k,x] of Object.entries(v.labels||{})){key(k);if(x===null||x==='')delete out.labels[k];else out.labels[k]=String(x).slice(0,100);}
  for(const [k,x] of Object.entries(v.defaults||{})){key(k);if(x===null)delete out.defaults[k];else out.defaults[k]=String(x).slice(0,200);}
  if(!out.tabs.some(id=>out.visible[id]!==false))throw Error('Keep at least one screen visible.');
  for(const [g,role] of Object.entries({room_form:'rooms',item_form:'items',question_form:'questions'}))for(const f of S[role])if(f.required&&out.visible[g+':'+f.key]===false)throw Error(f.label+' is required and cannot be hidden.');
  if(!Object.keys(out.labels).length)delete out.labels;if(!Object.keys(out.defaults).length)delete out.defaults;
  tools.call('layout.propose',out);return {layout:'proposed'};}
};
function runCommand(id,raw){let v={};try{v=JSON.parse(raw||'{}')||{};}catch(e){return {ok:false,error:'The command input is not valid JSON.'};}
 const fn=COMMANDS[id];if(!fn)return {ok:false,error:'Data Room has no command '+id+'.'};BUFFER=[];PREPARED.length=0;FLASH=null;
 try{const result=fn(v)||{};const decl=appCommands.find(c=>c.id===id);
  if(decl&&decl.mode==='propose'){if(!BUFFER.length)throw Error(FLASH&&FLASH.message||'Nothing to save.');if(BUFFER.length>50)throw Error('This change has more than 50 records. Split it into smaller commands.');tools.call('records.save',{changes:BUFFER});return {ok:true,result:{...result,saved:PREPARED.slice()}};}
  if(BUFFER.length)throw Error('A read command cannot propose changes.');return {ok:true,result};}
 catch(e){return {ok:false,error:String(e&&e.message||e).slice(0,600)};}}

function handle(event){const action=String(event.action||''),form=event.form&&typeof event.form==='object'?event.form:{},act=event.kind==='click'||event.kind==='submit',room=navLike(action)?null:cur();
 if(action.startsWith('f:')&&event.kind==='change'){const p=action.split(':');draftOf(p[1])[p.slice(2).join(':')]=typeof event.value==='boolean'?event.value:String(event.value===null||event.value===undefined?'':event.value).slice(0,20000);}
 else if(action.startsWith('draft:')&&event.kind==='change'&&st.editor){st.editor.draft[action.slice(6)]=typeof event.value==='boolean'?event.value:String(event.value===null||event.value===undefined?'':event.value);}
 else if(action.startsWith('document:uploaded:')&&event.kind==='change'){const ctx=action.slice(18),v=String(event.value||'');if(uuid(v)){st.uploaded=[v].concat(st.uploaded||[]).slice(0,20);const [k,id]=ctx.split(':');if(k==='item'){st.panel={type:'attach',id};draftOf('attach').version_id=v;}else if(k==='cda')draftOf('live').cda_doc=v;say('success','Uploaded. Choose it below and save to attach it.');}}
 else if(action.startsWith('nav:')){const id=action.slice(4);if(ALL_SCREENS.includes(id)){st.section=id;st.page=0;st.query='';st.filters={};closeAll();}}
 else if(action.startsWith('undo:')){if(!act)return;const res=tools.call('undo.run',{undoId:action.slice(5)});st.undo=null;FRESH=true;say('success',res&&res.message||'Undone.');}
 else if(action==='close')closeAll();
 else if(action==='query'&&event.kind==='change'){st.query=String(event.value||'').slice(0,100);st.page=0;}
 else if(action.startsWith('filter:')&&event.kind==='change'){st.filters[action.slice(7)]=String(event.value||'');st.page=0;}
 else if(action.startsWith('page:')){const per=Math.min(50,Math.max(10,num(cfg.pageSize,25)||25));st.page=Math.max(0,Math.floor(num(action.slice(5),0)/per));}
 else if(action==='pick-room'&&event.kind==='change'){if($.ROOM[event.value]){st.roomId=String(event.value);st.panel=null;st.batch=null;st.page=0;}}
 else if(action.startsWith('open-room:')){const [,id,to]=action.split(':');if($.ROOM[id]){st.roomId=id;if(SCREENS.some(s=>s.id===to))st.section=to;st.page=0;closeAll();}}
 else if(action.startsWith('panel:')){const [,type,id]=action.split(':');closeAll();st.panel={type,id:id||''};st.f[type]={};}
 else if((act||event.kind==='change'&&action.startsWith('edit:'))&&!exact()&&action!=='close'&&!action.startsWith('panel:')&&!action.startsWith('nav:'))throw Error('Some records could not be read completely, so changes are disabled to avoid overwriting data. '+problems()[0]);
 else if(action.startsWith('edit:')&&event.kind==='change')inlineEdit(event);
 else if(action.startsWith('details:')){const [,role,id]=action.split(':');openEditor(role,'edit',id);}
 else if(action.startsWith('add:')){const [,role,ctx]=action.split(':');const preset={};
  if(role==='items'){const sec=$.SECS.find(s=>s.id===ctx);if(!sec)throw Error('Choose a section first.');Object.assign(preset,{room_id:sec.room_id,section_id:sec.id,status:'missing',level_id:(levelsOf(sec.room_id)[0]||{}).id,view_only:$.VIEW_ONLY});}
  if(role==='sections'){if(!room)throw Error('Choose a room first.');const secs=secsOf(room.id);Object.assign(preset,{room_id:room.id,order:secs.length+1});}
  if(role==='levels'){if(!room)throw Error('Choose a room first.');Object.assign(preset,{room_id:room.id,kind:'custom',order:levelsOf(room.id).length+1});}
  if(role==='questions'){if(!room)throw Error('Choose a room first.');Object.assign(preset,{room_id:room.id,status:'new',asked_on:AS_OF});}
  if(role==='people'&&$.ORG[ctx])preset.organization_id=ctx;
  openEditor(role,'create',null,preset);}
 else if(action==='save-record'&&event.kind==='submit'){const x=st.editor;if(!x)throw Error('The form is no longer open.');x.draft={...x.draft,...form};const role=x.role;
  const values={...valuesFromForm(role,x.draft),...x.fixed};
  if(role==='items'&&has(x.draft,'level_id')){if(!$.LEVELS.some(l=>l.id===x.draft.level_id&&l.room_id===(x.draft.room_id||x.fixed.room_id)))throw Error('Choose a level of this room.');values.level_id=x.draft.level_id;}
  if(x.mode==='create')save([crt(role,values)],cap(ROLE_LABEL[role])+' added.');
  else{const r=lookup(role,x.id);const ch={};for(const [k,v] of Object.entries(values))if(JSON.stringify(r.data[k]===undefined?null:r.data[k])!==JSON.stringify(v))ch[k]=v;if(!Object.keys(ch).length)say('info','Nothing changed.');else save([upd(role,r,ch,x.version)],'Saved.');}
  closeAll();}
 else if(action.startsWith('archive:')){const [,role,id]=action.split(':'),r=lookup(role,id),g=role==='rooms'?groupOf($.ROOM[id]):null;
  if(g&&!g.archived){joinRecords([arch(role,r)]);xwrite('exchange.archiveGroup',{groupId:g.id,archived:true},'Confirm deleting the room in TrialAgents: every link stops at once; the disclosure record stays.');}
  else{save([arch(role,r)],cap(ROLE_LABEL[role])+' deleted. You can undo it.');closeAll();}}

 /* Rooms */
 else if(action==='create-room'&&event.kind==='submit'){const d={...draftOf('newroom'),...form},name=textOf(d.name,300);if(!name)throw Error('Name the room.');if(!PURPOSES.includes(d.purpose))throw Error('Choose the purpose.');if(!CDA_OPTIONS.includes(d.cda_option))throw Error('Choose the CDA option.');
  const programs=$.PROGRAMS.filter(p=>bool(d['p_'+p.id])).map(p=>p.id),tpl=$.TEMPLATES.find(t=>t.id===d.template_id)||BUILTIN_TEMPLATES.find(t=>t.purpose===d.purpose)||BUILTIN_TEMPLATES[0];
  save([crt('rooms',{name,purpose:d.purpose,status:'preparing',program_ids:programs.join(',')||null,round_id:textOf(d.round_id)||null,opportunity_ref:textOf(d.opportunity_ref)||null,template_id:tpl.id,cda_option:d.cda_option,welcome_note:textOf(d.welcome_note,20000)||null,contact_person_id:$.PERSON[d.contact_person_id]?d.contact_person_id:null,access_ending_reminder:has(d,'access_ending_reminder')?bool(d.access_ending_reminder):true,owner:textOf(d.owner)||null})],'Room created. Next: set up its levels and sections.');closeAll();}
 else if(action.startsWith('setup-structure:')){const r=$.ROOM[action.slice(16)];if(!r)throw Error('Room not found.');const ch=structurePlan(r);if(!ch.length)throw Error('Levels and sections are already set up.');save(ch,'Levels and '+plural(ch.filter(c=>c.typeId===(roleMap.sections||{}).typeId).length,'section')+' added. Next: add the checklist items.');}
 else if(action.startsWith('setup-items:')){const r=$.ROOM[action.slice(12)];if(!r)throw Error('Room not found.');if(!secsOf(r.id).length||!levelsOf(r.id).length)throw Error('Set up the levels and sections first.');const ch=itemsPlan(r);if(!ch.length)throw Error('Every template item is already in the index.');save(ch,plural(ch.length,'checklist item')+' added from the '+templateOf(r).name+'.');}
 else if(action==='go-live'&&event.kind==='submit'){const r=room;if(!r)throw Error('Choose a room.');if(groupOf(r))throw Error('This room is already live.');const lv=levelsOf(r.id);if(!lv.length)throw Error('Set up the levels first.');
  const d={...draftOf('live'),...form},needsCda=lv.some(l=>l.entry==='signed_cda');if(needsCda&&!uuid(d.cda_doc))throw Error('Choose the CDA document parties sign.');
  const conf=roomConfig(r,needsCda?d.cda_doc:null);joinRecords([upd('rooms',ROOM_ROW(r),{status:'live'})]);xwrite('exchange.createGroup',conf,'Confirm making the room live in TrialAgents. Nothing is shared until you invite people and confirm the send.','The room is live. Invite parties next; nothing has been sent.');closeAll();}
 else if(action==='sync-room'){const r=room,g=groupOf(r);if(!g)throw Error('The room is not live yet.');const plan=syncPlan(r,g);if(!plan.changes)throw Error('The room already shows the index.');if(plan.replace.length)throw Error('Show the new versions first, one at a time, from the list above.');
  const clean=({itemId,documentId,...p})=>p.section?p:(({section,...rest})=>rest)(p);
  xwrite('exchange.shareDocuments',{groupId:g.id,expectedVersion:g.version,add:plan.add.map(clean),update:plan.place.filter(p=>!plan.add.includes(p)).map(clean),remove:plan.remove.map(d=>d.versionId)},'Confirm the room documents in TrialAgents. Parties see only documents at their open levels.','The room now shows the index.');}
 else if(action.startsWith('replace-doc:')){const r=room,g=groupOf(r),i=$.ITEMS.find(x=>x.id===action.slice(12));if(!g||!i)throw Error('The room or item is unavailable.');const old=(g.documents||[]).find(d=>d.documentId===i.document_id&&d.versionId!==i.version_id);if(!old)throw Error('The room already shows this version.');
  xwrite('exchange.replaceDocument',{groupId:g.id,expectedVersion:g.version,versionId:old.versionId,newVersionId:i.version_id},'Confirm the new version in TrialAgents. It keeps its place; parties with access see it as Updated.','Shown in place of the earlier version.');}
 else if(action.startsWith('use-version:')){const i=$.ITEMS.find(x=>x.id===action.slice(12)),n=i&&hasNewVersion(i);if(!n)throw Error('There is no newer version.');const r=$.ROOM[i.room_id],g=groupOf(r),old=g&&(g.documents||[]).find(d=>d.versionId===i.version_id);
  if(old){joinRecords([upd('items',ROW('items',i),{version_id:n.versionId,updated_on:AS_OF})]);xwrite('exchange.replaceDocument',{groupId:g.id,expectedVersion:g.version,versionId:old.versionId,newVersionId:n.versionId},'Confirm version '+n.version+' of '+n.filename+' in TrialAgents. It keeps its place in the room.');}
  else save([upd('items',ROW('items',i),{version_id:n.versionId,updated_on:AS_OF})],'The index item now points at version '+n.version+'.');}
 else if(action==='save-attach'&&event.kind==='submit'){const x=st.panel,i=x&&$.ITEMS.find(y=>y.id===x.id);if(!i)throw Error('The item is no longer available.');const d={...draftOf('attach'),...form},doc=docOf(d.version_id);if(!doc)throw Error('Choose a document.');if(!$.LEVELS.some(l=>l.id===d.level_id&&l.room_id===i.room_id))throw Error('Choose a level of this room.');
  save([upd('items',ROW('items',i),{document_id:doc.documentId,version_id:doc.versionId,level_id:d.level_id,view_only:bool(d.view_only),status:bool(d.ready)?'ready':i.status==='missing'?'in_progress':i.status,updated_on:AS_OF})],doc.filename+' attached. Publish the index changes to the room when it is live.');closeAll();}
 else if(action==='define-levels'){const r=room,g=groupOf(r);if(!g)throw Error('The room is not live yet.');const lv=roomGroupLevels(r,g);if(!lv.differs)throw Error('The room already has these levels.');
  if(lv.missingSlots.length){const l=lv.missingSlots[0];xwrite('exchange.requestDocument',{groupId:g.id,expectedVersion:g.version,slot:{key:slotOf(l),label:textOf('Signed CDA for '+l.name,120),required:false}},'Confirm the signed-CDA upload for '+l.name+' in TrialAgents, then update the room\'s levels.','The signed-CDA upload for '+l.name+' is added. Now update the room\'s levels.');}
  else xwrite('exchange.defineLevels',{groupId:g.id,expectedVersion:g.version,levels:lv.want},'Confirm the room levels in TrialAgents. Nobody gets a new level until you change their access.','The room levels are updated. Nobody has a new level yet.');}
 else if(action.startsWith('room-status:')){const [,id,to]=action.split(':'),r=$.ROOM[id];if(!r||!ROOM_STATUS.includes(to))throw Error('Room not found.');save([upd('rooms',ROOM_ROW(r),{status:to})],to==='closed'?'Room closed. Revoke the remaining access on Parties; the disclosure record stays.':'Room status changed.');}
 else if(action.startsWith('access-reminder:')){const [,id,to]=action.split(':'),r=$.ROOM[id];if(!r)throw Error('Room not found.');const on=to==='on',g=groupOf(r);
  if(g&&g.notifyAccessEnding!==undefined&&g.notifyAccessEnding!==on){joinRecords([upd('rooms',ROOM_ROW(r),{access_ending_reminder:on})]);xwrite('exchange.setRoomNotices',{groupId:g.id,expectedVersion:g.version,notifyAccessEnding:on},on?'Confirm access-ending reminders in TrialAgents: you are reminded 7 days before a party\'s access ends.':'Confirm turning access-ending reminders off in TrialAgents.');}
  else save([upd('rooms',ROOM_ROW(r),{access_ending_reminder:on})],on?'Access-ending reminders on.':'Access-ending reminders off.');}
 else if(action==='notify-prepare'&&event.kind==='submit'){const r=room,g=groupOf(r);if(!g)throw Error('The room is not live yet.');const d={...draftOf('notify'),...form},cand=notifyCandidates(r,g);
  const docs=cand.docs.filter(x=>bool(d['d_'+x.versionId]));if(!docs.length)throw Error('Choose at least one document to tell parties about.');
  const who=d.who==='selected'?cand.parties.filter(p=>bool(d['p_'+p.grant.id])):cand.parties;const reach=who.filter(p=>docs.some(x=>p.open.includes(x.level)));
  if(!reach.length)throw Error(d.who==='selected'?'None of the chosen parties can open these documents.':'No party with a link can open these documents yet.');
  st.panel={type:'send',emailType:'documents_updated',ids:reach.map(p=>p.exchange.id),versionIds:docs.map(x=>x.versionId)};st.f.send={};st.batch=null;say('info','Check the email; each person gets only the chosen documents they can open.');}

 /* Parties */
 else if(action==='save-party'&&event.kind==='submit'){const r=room;if(!r)throw Error('Choose a room.');const d={...draftOf('party'),...form},p=$.PERSON[d.person_id];const email=textOf(d.email||(p&&p.email),200).toLowerCase();if(!emailOk(email))throw Error('Enter the person\'s email address.');
  if(grantsOf(r.id).some(g=>String(g.recipient_email).toLowerCase()===email&&!['revoked','expired'].includes(partyOf(g).status)))throw Error('This person already has access to the room.');
  const lv=levelsOf(r.id).filter(l=>bool(d['l_'+l.id]));if(!lv.length)throw Error('Choose at least one level.');const days=d.days===undefined?$.ACCESS_DAYS:String(d.days).trim()===''?null:num(d.days);if(days!==null&&(days<1||days>730))throw Error('Access lasts 1 to 730 days, or leave it blank for until revoked.');
  const org=$.ORG[d.organization_id]?d.organization_id:p&&$.ORG[p.organization_id]?p.organization_id:null;
  save([crt('grants',{room_id:r.id,room_name:textOf(r.name),room_purpose:r.purpose,organization_id:org,person_id:p?p.id:null,granted_on:AS_OF,expires_on:days?addDays(AS_OF,days):null,level_ids:lv.map(l=>l.id).join(','),recipient_email:email,cda_status:r.cda_option==='none'?'not_needed':'sent'})],'Party added. Then give access and send the invitation in one confirmed send.');closeAll();}
 else if(action==='grant-access'&&event.kind==='submit'){const r=room,g=groupOf(r);if(!g)throw Error('Make the room live first.');const d={...draftOf('grant'),...form};
  const pick=grantsOf(r.id).filter(x=>bool(d['g_'+x.id])&&!exchangeOf(g,x));if(!pick.length)throw Error('Choose people who do not have a link yet.');
  const days=d.days===undefined?$.ACCESS_DAYS:String(d.days).trim()===''?null:num(d.days);if(days!==null&&(days<1||days>730))throw Error('Access lasts 1 to 730 days, or leave it blank for until revoked.');
  const keysOf=x=>levelsOf(r.id).filter(l=>list(x.level_ids).includes(l.id)).map(levelKey),first=JSON.stringify(keysOf(pick[0]));
  if(pick.some(x=>JSON.stringify(keysOf(x))!==first))throw Error('Give access to people with the same levels together; you can change levels per person afterwards.');
  const res=xwrite('exchange.invite',{groupId:g.id,recipients:pick.map(x=>({emails:[String(x.recipient_email).toLowerCase()],name:textOf(personName(x.person_id),120),company:textOf(partyOrg(x),160),recordId:x.id})),levels:keysOf(pick[0]),...(days?{days}:{})},'Confirm access for '+plural(pick.length,'person')+' in TrialAgents, then send the invitations.','Private links created for '+plural(pick.length,'person')+'. Nothing has been sent: review the invitation email below.');
  if(res&&res.status==='saved'){st.panel={type:'send',emailType:'access_granted',ids:(res.exchanges||[]).map(e=>e.id)};st.f.send={};}}
 else if(action.startsWith('send:')){const [,type,...ids]=action.split(':');if(!EMAIL_TYPES.includes(type))throw Error('Unknown email.');st.panel={type:'send',emailType:type,ids:ids.filter(uuid)};st.f.send={};st.batch=null;}
 else if(action==='prepare-send'&&event.kind==='submit'){const x=st.panel,g=groupOf(room);if(!x||!g)throw Error('The room is unavailable.');const d={...draftOf('send'),...form},overrides={};
  for(const id of x.ids){const b=textOf(d['o_'+id],10000);if(b)overrides[id]={body:b};}
  const b=xcall('exchange.prepareEmail',{groupId:g.id,emailType:x.emailType,exchangeIds:x.ids,subject:textOf(d.subject,200)||undefined,body:textOf(d.body,10000)||undefined,overrides,nameKind:d.name_kind==='person'?'person':d.name_kind==='organization'?'organization':$.SENDER_KIND,...(x.emailType==='access_ending'&&validDate(d.schedule)?{scheduleAt:d.schedule+'T08:00:00.000Z'}:{}),...(x.emailType==='documents_updated'&&Array.isArray(x.versionIds)&&x.versionIds.length?{versionIds:x.versionIds.filter(uuid)}:{})});
  if(!b)throw Error(XS.error||'The email could not be prepared.');st.batch={id:b.batchId,digest:b.digest,from:b.from,replyTo:b.replyTo,scheduledAt:b.scheduledAt,emailType:b.emailType,recipients:(b.recipients||[]).map(e=>({to:e.to,subject:e.subject,text:e.text,personalised:e.personalised}))};say('info','Check every email below; it is sent exactly as shown.');}
 else if(action==='confirm-send'){if(!st.batch)throw Error('Prepare the email first.');xwrite('exchange.sendEmail',{batchId:st.batch.id,digest:st.batch.digest},'Confirm the send in TrialAgents. Nothing is sent before that.');st.batch=null;closeAll();}
 else if(action==='save-levels'&&event.kind==='submit'){const x=st.panel,grant=x&&$.GRANT[x.id];if(!grant)throw Error('The party is no longer available.');const r=$.ROOM[grant.room_id],g=groupOf(r),e=exchangeOf(g,grant),d={...draftOf('levels'),...form},lv=levelsOf(r.id).filter(l=>bool(d['l_'+l.id]));if(!lv.length)throw Error('Keep at least one level.');
  const p=e?partyOf(grant):null,entered=[],rec={level_ids:lv.map(l=>l.id).join(',')};let enteredNote;
  for(const l of lv.filter(l=>l.entry==='signed_cda'&&!(p&&p.open.includes(levelKey(l))))){
   if(r.cda_option==='in_place'||d.cda_mode==='in_place'){if(!validDate(d.cda_date))throw Error('Enter the date the CDA was signed elsewhere.');entered.push(levelKey(l));enteredNote='CDA in place elsewhere, signed '+d.cda_date;rec.cda_status='in_place_elsewhere';rec.agreement_accepted_on=d.cda_date;}
   else if(d.cda_mode==='contracts'){const a=$.AGREEMENTS.find(z=>z.id===d.agreement_id);if(!a)throw Error('Choose the signed CDA from Contracts.');entered.push(levelKey(l));enteredNote='Signed CDA on file: '+textOf(a.name,200);rec.cda_status='signed';rec.cda_agreement_id=a.id;}
   else throw Error(l.name+' opens when the signed CDA is accepted. Accept the uploaded CDA, or record a CDA in place elsewhere or on file in Contracts.');}
  if(!e){save([upd('grants',ROW('grants',grant),rec)],'Levels saved. They apply when you give access.');closeAll();}
  else{joinRecords([upd('grants',ROW('grants',grant),rec)]);xwrite('exchange.setLevels',{exchangeId:e.id,levels:lv.map(levelKey),entered,...(enteredNote?{enteredNote}:{}),notify:bool(has(d,'notify')?d.notify:true)},'Confirm the level change in TrialAgents'+(bool(has(d,'notify')?d.notify:true)?', with the email to '+partyName(grant):'')+'. Lowering a level hides those documents at once.');closeAll();}}
 else if(action.startsWith('accept-cda:')){const [,gid,fid]=action.split(':'),grant=$.GRANT[gid];if(!grant||!uuid(fid))throw Error('The CDA is unavailable.');const r=$.ROOM[grant.room_id];
  const ch=[upd('grants',ROW('grants',grant),{cda_status:'signed',agreement_accepted_on:AS_OF})];
  if(r.cda_option==='contracts'&&canWrite('agreements'))ch.push(crt('agreements',{name:textOf('CDA: '+(partyOrg(grant)||partyName(grant))+' ('+r.name+')',300),counterparty_id:grant.organization_id||null,agreement_type:'cda_nda',status:'active',effective_date:AS_OF}));
  joinRecords(ch);xwrite('exchange.acceptFile',{fileId:fid,notify:true},'Confirm accepting the signed CDA in TrialAgents'+(r.cda_option==='contracts'?', with the agreement for Contracts':'')+'. It opens only the level it protects, and '+partyName(grant)+' gets an email.');}
 else if(action==='revoke'&&event.kind==='submit'){const x=st.panel,grant=x&&$.GRANT[x.id],e=grant&&exchangeOf(groupOf($.ROOM[grant.room_id]),grant);if(!e)throw Error('This person has no link.');const d={...draftOf('revoke'),...form};if(!textOf(d.reason))throw Error('Give a reason; it is kept in the record.');
  xwrite('exchange.revoke',{exchangeId:e.id,reason:textOf(d.reason,1000),notify:bool(d.notify)},'Confirm revoking access in TrialAgents. The disclosure record stays.');closeAll();}
 else if(action==='extend'&&event.kind==='submit'){const x=st.panel,grant=x&&$.GRANT[x.id],e=grant&&exchangeOf(groupOf($.ROOM[grant.room_id]),grant);if(!e)throw Error('This person has no link.');const d={...draftOf('extend'),...form},days=num(d.days);if(!days||days<1||days>730)throw Error('Extend by 1 to 730 days.');
  const base=e.expiresAt&&String(e.expiresAt).slice(0,10)>AS_OF?String(e.expiresAt).slice(0,10):AS_OF;joinRecords([upd('grants',ROW('grants',grant),{expires_on:addDays(base,days)})]);
  xwrite('exchange.extend',{exchangeId:e.id,days,notify:false},'Confirm extending access in TrialAgents.','Access extended to '+dateLabel(addDays(base,days))+'.');closeAll();}

 /* Q&A */
 else if(action==='log-questions'&&event.kind==='submit'){const r=room,g=groupOf(r);if(!g)throw Error('The room is not live.');const d={...draftOf('log'),...form},M=messagesOf(g).rows,logged=new Set($.QS.map(q=>q.message_id));
  const pick=M.filter(m=>m.kind==='question'&&!logged.has(m.id)&&bool(d['m_'+m.id]));if(!pick.length)throw Error('Choose questions to add to the log.');
  save(pick.slice(0,50).map(m=>{const e=(g.exchanges||[]).find(x=>x.id===m.exchangeId),grant=e&&$.GRANT[e.recordId],ref=m.reference||{},sec=ref.section&&secsOf(r.id).find(s=>String(s.number)===String(ref.section.number));
   return crt('questions',{room_id:r.id,grant_id:grant?grant.id:null,organization_id:grant?grant.organization_id||null:null,person_id:grant?grant.person_id||null:null,asked_on:String(m.createdAt||AS_OF).slice(0,10),question:textOf(m.body,20000),status:'new',message_id:m.id,section_id:sec?sec.id:null,document_ids:ref.document?ref.document.documentId:null});}),plural(pick.length,'question')+' added to the log.');}
 else if(action==='save-answer'&&event.kind==='submit'){const x=st.panel,q=x&&$.QUESTION[x.id];if(!q)throw Error('The question is no longer available.');const d={...draftOf('answer'),...form},step=['save','approve','private','publish','decline'].includes(String(event.value))?String(event.value):'save';
  const answer=textOf(d.answer,20000),base={assignee:textOf(d.assignee)||null,due:validDate(d.due)||null,category:Q_CATS.includes(d.category)?d.category:null,answer:answer||null};if(has(d,'reused_from')&&$.QUESTION[d.reused_from])base.reused_from=d.reused_from;
  const grant=$.GRANT[q.grant_id],r=$.ROOM[q.room_id],g=groupOf(r);
  if(step==='save'){save([upd('questions',ROW('questions',q),{...base,status:answer?'drafting':base.assignee?'assigned':q.status==='new'?'new':q.status})],'Answer saved.');closeAll();}
  else if(step==='approve'){if(!answer)throw Error('Write the answer first.');const by=textOf(d.approver);if(!by)throw Error('Name the approver.');save([upd('questions',ROW('questions',q),{...base,status:'in_review',approved_by:by})],'Approved. Now answer privately or publish.');closeAll();}
  else if(step==='decline'){save([upd('questions',ROW('questions',q),{...base,status:'declined'})],'Declined. Nothing is sent.');closeAll();}
  else{if(!answer)throw Error('Write the answer first.');if($.QA_APPROVAL&&!(q.approved_by&&q.status==='in_review'&&String(q.answer||'')===answer))throw Error('Answers need approval in this workspace. Approve this exact text first.');if(!g)throw Error('The room is not live.');
   if(step==='private'){if(!q.message_id)throw Error('This question was not asked in the room; answer it directly.');joinRecords([upd('questions',ROW('questions',q),{...base,status:'answered',visibility:'private',answered_on:AS_OF})]);
    xwrite('exchange.answer',{questionId:q.message_id,body:answer,notify:true},'Confirm the private answer in TrialAgents, with the email to '+(grant?partyName(grant):'the party')+'. Answers cannot be edited after sending.');closeAll();}
   else if(step==='publish'){const lv=String(d.publish_to||'room'),level=lv==='room'?null:$.LEVELS.find(l=>l.id===lv&&l.room_id===r.id);if(lv!=='room'&&!level)throw Error('Choose who sees it.');const asked=textOf(d.public_question,5000);if(!asked)throw Error('Write the question as parties will see it, without names.');
    joinRecords([upd('questions',ROW('questions',q),{...base,status:'published',visibility:level?'level':'room',level_id:level?level.id:null,answered_on:AS_OF})]);
    xwrite('exchange.publishAnswer',{groupId:g.id,question:asked,body:answer,scope:level?'level':'room',...(level?{level:levelKey(level)}:{}),...(q.message_id?{questionId:q.message_id}:{}),notify:true},'Confirm publishing in TrialAgents: '+(level?'parties with '+level.name:'everyone in the room')+' see it without the asker\'s name, and get an email.');closeAll();}}}

 /* Settings */
 else if(action==='save-settings'&&event.kind==='submit'){if(!OWNER)throw Error('Only the app\'s owners change its settings.');const d={...draftOf('settings'),...form},days=d.default_access_days===''?null:num(d.default_access_days),quiet=num(d.quiet_days);if(days!==null&&(days<1||days>730))throw Error('Default access is 1 to 730 days, or blank for until revoked.');if(!quiet||quiet<1||quiet>365)throw Error('Quiet days are 1 to 365.');
  const v={default_access_days:days,view_only_default:bool(d.view_only_default),quiet_days:Math.round(quiet),qa_approval_required:bool(d.qa_approval_required),entry_text:textOf(d.entry_text,5000)||null,sender_display:SENDER.includes(d.sender_display)?d.sender_display:'organization'};
  save([$.settingsRow?upd('settings',$.settingsRow,v):crt('settings',v)],'Settings saved.');}
 else if(action==='save-email'&&event.kind==='submit'){const d={...draftOf('email'),...form},type=EMAIL_TYPES.includes(d.type)?d.type:'access_granted',purpose=PURPOSES.includes(d.purpose)?d.purpose:'all',subject=textOf(d.subject,200),body=textOf(d.body,10000);if(!subject||!body)throw Error('Write a subject and text.');
  const all=JSON.parse(JSON.stringify($.EMAIL_TEXTS));all[type]=all[type]||{};all[type][purpose]={subject,body};const v={email_texts:JSON.stringify(all)};
  save([$.settingsRow?upd('settings',$.settingsRow,v):crt('settings',{...v,qa_approval_required:true,quiet_days:10,default_access_days:180})],'The '+EMAIL_LABEL[type].toLowerCase()+' text for '+(purpose==='all'?'all rooms':PURPOSE_LABEL[purpose]+' rooms')+' is saved. Rooms made live after this use it.');}
 else if(action==='reset-email'){const d=draftOf('email'),type=EMAIL_TYPES.includes(d.type)?d.type:'access_granted',purpose=PURPOSES.includes(d.purpose)?d.purpose:'all';if(!$.settingsRow||!($.EMAIL_TEXTS[type]||{})[purpose])throw Error('This text is already the built-in one.');const all=JSON.parse(JSON.stringify($.EMAIL_TEXTS));delete all[type][purpose];save([upd('settings',$.settingsRow,{email_texts:JSON.stringify(all)})],'Back to the built-in text.');d.loaded='';}
 else if(action.startsWith('copy-template:')){const t=$.TEMPLATES.find(x=>x.id===action.slice(14));if(!t)throw Error('Template not found.');save([crt('templates',{name:textOf('Copy of '+t.name,300),purpose:t.purpose,content:JSON.stringify(t.content)})],'A copy you can edit was added.');}
 else if(action==='save-template'&&event.kind==='submit'){const x=st.panel,t=x&&$.TEMPLATE_ROWS.find(y=>y.id===x.id);if(!t)throw Error('Only saved copies can be edited; copy a built-in template first.');const d={...draftOf('template'),...form};
  const lines=String(d.content||'').split('\n').map(s=>s.replace(/\s+$/,'')).filter(s=>s.trim());const sections=[];
  for(const l of lines){const m=l.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);if(m&&!/^\s/.test(l)){sections.push({number:m[1],name:m[2].trim().slice(0,160),items:[]});continue;}const it=l.trim().replace(/^[-*]\s*/,''),req=/\(required\)\s*$/i.test(it),conf=/\[confidential\]/i.test(it);if(!sections.length)throw Error('Start with a numbered section, for example "1 Company and corporate".');sections[sections.length-1].items.push({title:it.replace(/\(required\)\s*$/i,'').replace(/\[(confidential|non-confidential)\]/ig,'').trim().slice(0,300),required:req,level:conf?'confidential':'non_confidential',weight:req?2:1});}
  if(!sections.length)throw Error('Add at least one section.');if(sections.reduce((n,s)=>n+s.items.length,0)>50)throw Error('A template holds at most 50 items, so it fits one review.');
  save([upd('templates',ROW('templates',t),{name:textOf(d.name,300)||t.name,purpose:PURPOSES.includes(d.purpose)?d.purpose:t.purpose,content:JSON.stringify({sections})})],'Template saved.');closeAll();}
 else if(action.startsWith('custom-remove:')){const [,role,key]=action.split(':');customFieldsSave(role,key,null);}
}
function ROW(role,x){return R[role].allRows.find(r=>r.id===x.id)||null;}
function ROOM_ROW(r){return ROW('rooms',r);}
/* Inline edits (G5): a value changed where it is shown saves at once, with the record version it was shown with. */
function roleOfRecord(id){for(const role of ALL_ROLES){if(!cache[role]&&!ahead[role])continue;const r=R[role];if(r&&r.allRows&&r.allRows.some(x=>x.id===id))return role;}return null;}
function inlineEdit(e){const x=kit.edit(e,{});if(!x)return;const role=roleOfRecord(x.recordId),row=role&&lookup(role,x.recordId);if(!row)throw Error('That record is no longer available.');
 const f=S[role].find(y=>y.key===x.field);let v;
 if(role==='items'&&x.field==='level_id'){v=String(e.value||'');if(!$.LEVELS.some(l=>l.id===v&&l.room_id===row.data.room_id))throw Error('Choose a level of this room.');}
 else{if(!f||['frozen','tracked'].includes(f.kind)||f.key==='archived')throw Error('This value cannot be changed here.');v=fieldValue(f,e.value);}
 const was=row.data[x.field]===undefined?null:row.data[x.field];if(JSON.stringify(was)===JSON.stringify(v))return;
 save([upd(role,row,{[x.field]:v},x.version)],(f?fieldLabel(role,f):'Level')+' saved.');}

/* Building blocks on the kit's styles (k-*). App-specific styles are in data-room.css, written against the kit tokens. */
const WR=!!inp.saved&&!!inp.writable&&cfg.readOnly!==true;
const TONE={green:'good',amber:'warn',red:'bad',blue:'info'};
const pill=(text,type)=>'<span class="k-pill'+(TONE[type]?' dr-'+TONE[type]:'')+'">'+esc(text)+'</span>';
const btn=(text,a,cls,disabled,extra)=>'<button type="button" class="k-button'+(cls&&/primary/.test(cls)?' k-button--primary':'')+'" data-action="'+esc(a)+'"'+(disabled?' disabled':'')+(extra?' '+extra:'')+'>'+esc(text)+'</button>';
const bS=(t,a,d,x)=>btn(t,a,'',d,x),bP=(t,a,d,x)=>btn(t,a,'primary',d,x);
const link=(text,action,aria)=>'<button type="button" class="dr-link" data-action="'+esc(action)+'"'+(aria?' aria-label="'+esc(aria)+'"':'')+'>'+esc(text)+'</button>';
const submit=(text,ok)=>'<button type="submit" class="k-button k-button--primary"'+(ok===false?' disabled':'')+'>'+esc(text)+'</button>';
const uploadBtn=(ctx,text,ok)=>'<button type="button" class="k-button" data-trialy-document="upload '+esc(ctx)+'"'+(inp.saved&&WR&&ok!==false?'':' disabled')+'>'+esc(text)+'</button>';
const kv=(k,v)=>'<div class="dr-kv"><span>'+esc(k)+'</span><strong>'+esc(v===null||v===undefined||v===''?'—':v)+'</strong></div>';
const kvh=(k,html)=>'<div class="dr-kv"><span>'+esc(k)+'</span><div>'+html+'</div></div>';
const card=(title,body,right)=>'<section class="k-card dr-card"><div class="dr-head"><h2>'+esc(title)+'</h2>'+(right?'<div class="k-row">'+right+'</div>':'')+'</div>'+body+'</section>';
const muted=t=>'<p class="k-muted">'+esc(t)+'</p>';
const customShown=v=>v===true||v==='true'?'Yes':v===false||v==='false'?'No':v;
const customKv=(role,row)=>customOf(role).map(f=>kv(f.label,f.kind==='date'?(row[f.key]?dateLabel(String(row[f.key]).slice(0,10)):''):f.kind==='select'?label(row[f.key]):customShown(row[f.key]))).join('');
const customLine=(role,row)=>{const xs=customOf(role).filter(f=>row[f.key]!==null&&row[f.key]!==undefined&&row[f.key]!=='').map(f=>f.label+': '+customShown(row[f.key]));return xs.length?'<span class="dr-sub">'+esc(xs.join(' · '))+'</span>':'';};
/* A plain table for panels (screens use kit.table, which becomes cards on narrow screens). */
const tbl=(lab,heads,rows,none)=>rows.length?'<div class="k-table-wrap" role="region" aria-label="'+esc(lab)+'" tabindex="0"><table class="k-table"><thead><tr>'+heads.map(h=>'<th scope="col">'+esc(h[0]==='#'?h.slice(1):h)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>':muted(none||'Nothing yet.');
function paged(items,per){per=per||Math.min(50,Math.max(10,num(cfg.pageSize,25)||25));const max=Math.max(0,Math.ceil(items.length/per)-1);st.page=Math.min(st.page,max);return {slice:items.slice(st.page*per,(st.page+1)*per),offset:st.page*per,per,total:items.length,max};}
const pager=p=>p.max===0?'':kit.pager({offset:p.offset,limit:p.per,total:p.total,action:'page'});
function inputOf(formName,name,value,o){o=o||{};const a='f:'+formName+':'+name,id='dr-'+formName+'-'+name,common=' id="'+esc(id)+'" name="'+esc(name)+'" data-action="'+esc(a)+'"'+(o.disabled?' disabled':'')+(o.required?' required':'');
 const d=st.f[formName]&&has(st.f[formName],name)?st.f[formName][name]:value;
 if(o.type==='select')return '<select'+common+'>'+(o.blank===undefined?'':'<option value="">'+esc(o.blank)+'</option>')+o.options.map(x=>'<option value="'+esc(x[0])+'"'+(String(d===null||d===undefined?'':d)===String(x[0])?' selected':'')+'>'+esc(x[1])+'</option>').join('')+'</select>';
 if(o.type==='checkbox')return '<input type="checkbox"'+common+(bool(d)?' checked':'')+'>';
 if(o.type==='textarea')return '<textarea class="'+(o.cls==='tall'?'dr-tall':'dr-text')+'"'+common+(o.readonly?' readonly':'')+'>'+esc(d===null||d===undefined?'':d)+'</textarea>';
 return '<input type="'+(o.type||'text')+'"'+common+(o.min!==undefined?' min="'+o.min+'"':'')+(o.max!==undefined?' max="'+o.max+'"':'')+' value="'+esc(d===null||d===undefined?'':d)+'">';}
const field=(formName,name,lab,value,o)=>o&&o.type==='checkbox'?'<label class="dr-check" for="dr-'+formName+'-'+name+'">'+inputOf(formName,name,value,o)+'<span>'+esc(lab)+'</span></label>':'<label class="k-field" for="dr-'+formName+'-'+name+'"><span>'+esc(lab)+(o&&o.required?' *':'')+'</span>'+inputOf(formName,name,value,o)+(o&&o.hint?'<small class="k-muted">'+esc(o.hint)+'</small>':'')+'</label>';
const opts=(xs,labels)=>xs.map(x=>[x,labels&&labels[x]?labels[x]:cap(x)]);
/* A side panel (kit.panel) for creating a record or editing many fields; full screen on phones. */
function drawer(title,sub,body,foot,formAction){const inner=(sub?'<p class="k-muted dr-intro">'+esc(sub)+'</p>':'')+body+'<div class="k-row dr-foot">'+(foot||btn('Close','close'))+'</div>';
 return kit.panel({title,body:formAction?'<form data-action="'+esc(formAction)+'">'+inner+'</form>':inner,close:'close'});}
/* Editable cells: the change event is edit:<record>:<field>:<version> (kit.edit reads it back). */
const cellOk=(role,key)=>canWrite(role)&&!!roleMap[role].fields[key]&&roleMap[role].writable.includes(key);
const cellAction=(row,key)=>'edit:'+row.id+':'+key+':'+row.version;
const valueOf=(row,key)=>row[key]===undefined||row[key]===null?'':row[key];
function cText(role,row,key,lab,kind){const v=valueOf(row,key);if(!cellOk(role,key))return esc(kind==='date'?(v?dateLabel(String(v).slice(0,10)):'—'):v===''?'—':v);return kit.cell({recordId:row.id,version:row.version,field:key,label:lab,kind:kind||'text',value:kind==='date'&&v?String(v).slice(0,10):v});}
function cSel(role,row,key,lab,options,blank){const v=String(valueOf(row,key)),pairs=options.map(o=>Array.isArray(o)?o:[o,cap(o)]);if(!cellOk(role,key)){const p=pairs.find(x=>String(x[0])===v);return esc(p?p[1]:v||'—');}
 return '<select class="k-cell" data-action="'+esc(cellAction(row,key))+'" aria-label="'+esc(lab)+'">'+(blank===false?'':'<option value="">—</option>')+pairs.map(([val,txt])=>'<option value="'+esc(val)+'"'+(String(val)===v?' selected':'')+'>'+esc(txt)+'</option>').join('')+'</select>';}
function cBool(role,row,key,lab){const v=bool(row[key]);if(!cellOk(role,key))return v?esc(lab):'';return '<label class="dr-check"><input type="checkbox" data-action="'+esc(cellAction(row,key))+'"'+(v?' checked':'')+' aria-label="'+esc(lab)+'"><span>'+esc(lab)+'</span></label>';}
function cLong(role,row,key,lab){const v=valueOf(row,key);if(!cellOk(role,key))return '<p class="dr-pre">'+esc(v||'—')+'</p>';return '<textarea class="k-cell dr-text" data-action="'+esc(cellAction(row,key))+'" aria-label="'+esc(lab)+'">'+esc(v)+'</textarea>';}
/* A custom field shown as an editable cell of its kind. */
function cCustom(role,row,f){if(f.kind==='boolean')return cBool(role,row,f.key,f.label);if(f.kind==='select')return cSel(role,row,f.key,f.label,f.options||[]);if(f.kind==='longtext')return cLong(role,row,f.key,f.label);return cText(role,row,f.key,f.label,f.kind==='number'?'number':f.kind==='date'?'date':'text');}
/* ---------- Screens ---------- */
const partialNote=()=>{const p=problems();return p.length?'<p class="dr-note" role="note">'+esc('Some records could not be read completely, so readiness, totals and changes wait. '+p.slice(0,3).join(' '))+'</p>':'';};
const xNote=()=>!inp.saved?'<p class="dr-note" role="note">Parties, links, views and questions appear in the saved app. A preview never contacts anyone.</p>':XS.error||XS.partial?'<p class="dr-note" role="note">'+esc('Room activity could not be read completely'+(XS.error&&XS.error!=='preview'?': '+XS.error:'')+'. Counts may be incomplete.')+'</p>':'';
const noRoom=()=>kit.empty({title:'No room yet',text:'Create a room for a financing, licensing, partnering or M&A process. It starts from a standard 9-section biotech index you can edit.',action:canWrite('rooms')?{label:'New room',action:'panel:newroom'}:null});
function roomBar(extra){return '<div class="k-row dr-bar">'+kit.picker({label:'Room',options:$.ROOMS.map(r=>({value:r.id,label:String(r.name||'Unnamed')+' · '+(PURPOSE_LABEL[r.purpose]||'Room')})),value:st.roomId,action:'pick-room'})+(room?pill(ROOM_STATUS_LABEL[room.status]||'Preparing',room.status==='live'?'green':'')+pill('CDA: '+(CDA_SHORT[room.cda_option]||'—')):'')+'<span class="k-grow"></span>'+(extra||'')+'</div>';}
const list_=xs=>'<ul class="dr-list">'+xs.join('')+'</ul>';

function overview(){if(!$.ROOMS.length)return noRoom();
 const W=waitingData(),live=W.live,parties=W.parties,act=parties.filter(p=>p.status==='active'),sig=parties.map(p=>({p,s:signals(p)})),ok=exact();
 const opensWeek=parties.reduce((n,p)=>n+p.documents.filter(d=>d.lastViewed&&diffDays(String(d.lastViewed).slice(0,10),AS_OF)<=7).reduce((m,d)=>m+num(d.views,0),0),0);
 const {openQ,overdueQ,cdas,due,unlogged}=W;
 const waiting=[...(unlogged?['<li>'+link(plural(unlogged,'new question')+' from parties to log','nav:qa')+'</li>']:[]),...overdueQ.slice(0,5).map(q=>'<li>'+pill('Overdue','red')+' '+esc(String(q.question).slice(0,90))+' (due '+esc(dateLabel(q.due))+')</li>'),...openQ.filter(q=>!overdueQ.includes(q)).slice(0,3).map(q=>'<li>Open question: '+esc(String(q.question).slice(0,90))+'</li>'),...cdas.map(p=>'<li>Signed CDA to accept from '+esc(partyName(p.grant))+'</li>'),...due.slice(0,5).map(i=>'<li>'+esc(i.title)+' due '+esc(dateLabel(i.due))+(i.owner?' ('+esc(i.owner)+')':'')+'</li>')];
 const recent=[...$.ITEMS.filter(i=>i.updated_on&&diffDays(i.updated_on,AS_OF)<=7).map(i=>({at:i.updated_on,t:'Updated in '+String(($.ROOM[i.room_id]||{}).name||'')+': '+i.title})),...parties.flatMap(p=>p.history.filter(h=>h.kind==='email_sent').map(h=>({at:String(h.at).slice(0,10),t:cap(EMAIL_LABEL[h.emailType]||'Email')+' sent to '+partyName(p.grant)})))].sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,8);
 const hotQuiet=sig.filter(x=>x.s.hot).map(x=>'<li>'+pill('Hot','green')+' '+esc(partyName(x.p.grant))+(partyOrg(x.p.grant)?', '+esc(partyOrg(x.p.grant)):'')+': '+plural(x.s.opens,'open')+' this week</li>').concat(sig.filter(x=>x.s.quiet).map(x=>'<li>'+pill('Quiet','amber')+' '+esc(partyName(x.p.grant))+': nothing opened for '+plural(x.s.since,'day')+'</li>'));
 return partialNote()+xNote()+
  '<div class="k-grid dr-stats">'+kit.stat('Live rooms',live.length)+kit.stat('Active parties',act.length)+kit.stat('Opens this week',xOk()?opensWeek:'—')+kit.stat('Open questions',ok?openQ.length:'—')+'</div>'+
  card('Rooms',kit.table({columns:[{key:'name',label:'Room',render:r=>link(r.name||'Unnamed','open-room:'+r.id+':rooms')},{key:'purpose',label:'Purpose',render:r=>esc(PURPOSE_LABEL[r.purpose]||'—')},{key:'status',label:'Status',render:r=>pill(ROOM_STATUS_LABEL[r.status]||'Preparing',r.status==='live'?'green':'')},{key:'ready',label:'Ready',render:r=>ok?pct(readiness(itemsOf(r.id)).pct):'—'},{key:'parties',label:'Invited / active',render:r=>{const ps=grantsOf(r.id).map(partyOf);return ps.filter(p=>p.linked).length+' / '+ps.filter(p=>p.status==='active').length;}}],rows:$.ROOMS}),bS('New room','panel:newroom',!canWrite('rooms')))+
  '<div class="dr-cols">'+card('Waiting on us',waiting.length?list_(waiting):muted(ok&&xOk()?'Nothing is waiting on you.':'Some data could not be read, so this list may be incomplete.'))+
  card('Hot and quiet parties',hotQuiet.length?list_(hotQuiet):muted('No hot or quiet parties.'))+'</div>'+
  card('Recent changes',recent.length?list_(recent.map(x=>'<li><span class="k-muted">'+esc(dateLabel(String(x.at).slice(0,10)))+'</span> '+esc(x.t)+'</li>')):muted('No documents updated or emails sent in the last 7 days.'));}

function roomsScreen(){if(!room)return noRoom();const r=room,lv=levelsOf(r.id),secs=secsOf(r.id),its=itemsOf(r.id),g=groupOf(r),rd=readiness(its),progs=list(r.program_ids).map(id=>$.PROGRAM[id]).filter(Boolean),t=templateOf(r),ok=exact();
 const steps=[['Room created',true],['Levels and sections',lv.length>0&&secs.length>0],['Checklist items',its.length>0],['Documents attached',its.some(i=>i.version_id)],['Live',!!g]];
 const next=!lv.length||!secs.length?bP('Set up levels and sections','setup-structure:'+r.id,!canWrite('levels')||!canWrite('sections')):!its.length?bP('Add the checklist items','setup-items:'+r.id,!canWrite('items')):!g&&r.status!=='closed'?bP('Make the room live','panel:live',!WR):'';
 const people=$.PEOPLE.slice(0,200).map(p=>[p.id,String(p.name||'Unnamed')]);
 const reminder=!(r.access_ending_reminder===false||r.access_ending_reminder==='false');
 const glv=g?roomGroupLevels(r,g):null;
 const details='<div class="dr-details">'+kvh('Room name',cText('rooms',r,'name','Room name'))+kvh('Purpose',cSel('rooms',r,'purpose','Purpose',opts(PURPOSES,PURPOSE_LABEL),false))+kvh('CDA option',cSel('rooms',r,'cda_option','CDA option',opts(CDA_OPTIONS,CDA_LABEL),false))+
  kvh('Fundraise round',cText('rooms',r,'round_id','Fundraise round'))+kvh('Partnerships opportunity',cText('rooms',r,'opportunity_ref','Partnerships opportunity'))+(R.people.unbound?'':kvh('Contact person',cSel('rooms',r,'contact_person_id','Contact person',people)))+kvh('Owner',cText('rooms',r,'owner','Owner'))+
  kv('Programs',progs.map(p=>p.name).join(', ')||(R.programs.unbound?'Programs not connected':'None linked'))+kv('Index template',t.name)+kv('Readiness',ok?pct(rd.pct)+' ('+rd.ready+' of '+rd.total+' required items ready)':'—')+
  customOf('rooms').map(f=>kvh(f.label,cCustom('rooms',r,f))).join('')+'</div>'+kvh('Welcome note',cLong('rooms',r,'welcome_note','Welcome note'));
 const levelsTable=kit.table({columns:[{key:'name',label:'Level',render:l=>cText('levels',l,'name','Level name')},{key:'kind',label:'Kind',render:l=>esc(cap(l.kind))},{key:'entry',label:'Entry step',render:l=>cSel('levels',l,'entry','Entry step of '+l.name,opts(ENTRY,ENTRY_LABEL),false)},{key:'docs',label:'Documents',render:l=>String(its.filter(i=>i.level_id===l.id&&i.version_id).length)}],rows:lv,
  empty:kit.empty({title:'No levels yet',text:'Set up the room\'s levels and sections from its index template.',action:canWrite('levels')&&canWrite('sections')?{label:'Set up levels and sections',action:'setup-structure:'+r.id}:null})});
 const notify=g?(()=>{const c=notifyCandidates(r,g),recent=c.docs.filter(recentChange);return muted(c.docs.length?plural(recent.length,'document')+' added or updated in the last 14 days; '+plural(c.parties.length,'person')+' with a link.':'No documents in the room yet.')+bP('Notify parties','panel:notify',!WR||!c.docs.length||!c.parties.length);})():muted('Available when the room is live.');
 return partialNote()+xNote()+roomBar(bS('New room','panel:newroom',!canWrite('rooms')))+
  card('Set-up','<ol class="dr-steps">'+steps.map(([s,done])=>'<li'+(done?' class="dr-done"':'')+'>'+esc(s)+(done?' ✓':'')+'</li>').join('')+'</ol><div class="k-row">'+next+(its.length?bS('Add missing template items','setup-items:'+r.id,!canWrite('items')):'')+'</div>')+
  card('Room',details,(r.status!=='closed'&&g?bS('Close room','room-status:'+r.id+':closed',!canWrite('rooms')):'')+(r.status==='closed'?bS('Reopen','room-status:'+r.id+':live',!canWrite('rooms')):'')+bS('Delete room','archive:rooms:'+r.id,!canWrite('rooms')))+
  card('Levels and entry steps',muted('Parties see only documents at levels they hold and have opened. A signed CDA opens only its own level.')+levelsTable+'<div class="k-row dr-foot">'+bS('Add a custom level','add:levels',!canWrite('levels')||!lv.length)+(glv&&glv.differs?bP('Update the live room\'s levels','define-levels',!WR):'')+'</div>')+
  '<div class="dr-cols">'+card('Notify parties',muted('Tell all or chosen parties about new or updated documents. You see every email before it is sent.')+notify)+
  card('Access-ending reminder',muted('You are reminded 7 days before a party\'s access ends.')+'<div class="k-row">'+pill(reminder?'On':'Off',reminder?'green':'')+bS(reminder?'Turn off':'Turn on','access-reminder:'+r.id+':'+(reminder?'off':'on'),!canWrite('rooms')||(!!g&&!WR))+'</div>')+'</div>';}

function indexScreen(){if(!room)return noRoom();const r=room,secs=secsOf(r.id),its=itemsOf(r.id),lv=levelsOf(r.id),g=groupOf(r),rd=readiness(its),plan=g?syncPlan(r,g):null,q=st.query.toLowerCase(),ok=exact();
 const docsState=docsList().state,preview=st.filters.preview||'',levelOpts=lv.map(l=>[l.id,l.name]);
 const docCell=i=>{const nv=hasNewVersion(i),shown=g&&(g.documents||[]).find(d=>d.versionId===i.version_id),stale=g&&i.version_id&&!shown&&(g.documents||[]).some(d=>d.documentId===i.document_id);
  return (i.version_id?esc(docName(i))+(bool(i.view_only)?' <span class="dr-sub">View only</span>':'')+(i.updated_on&&diffDays(i.updated_on,AS_OF)<=14?' '+pill('Updated '+dateLabel(i.updated_on)):''):'<span class="k-muted">None</span>')+
   '<div class="k-row dr-mini">'+bS(i.version_id?'Change':'Attach','panel:attach:'+i.id,!canWrite('items'),'aria-label="Attach a document to '+esc(i.title)+'"')+(nv?bS('Use version '+nv.version,'use-version:'+i.id,!canWrite('items')):'')+(stale?bS('Show this version in the room','replace-doc:'+i.id,!WR):'')+'</div>';};
 const sectionBlock=s=>{const rows=its.filter(i=>i.section_id===s.id&&(!q||String(i.title).toLowerCase().includes(q))),sr=readiness(its.filter(i=>i.section_id===s.id));if(q&&!rows.length)return '';
  return '<section class="dr-sec" aria-label="Section '+esc(s.number)+' '+esc(s.name)+'"><div class="dr-sec-head"><span class="dr-num">'+cText('sections',s,'number','Section number')+'</span><span class="k-grow">'+cText('sections',s,'name','Section name')+'</span>'+(sr.total?pill(sectionReady(s,its)?'Ready':plural(sr.missing.length,'required item')+' missing',sectionReady(s,its)?'green':'amber'):'')+bS('Add item','add:items:'+s.id,!canWrite('items'),'aria-label="Add item to section '+esc(s.number)+'"')+bS('Delete section','archive:sections:'+s.id,!canWrite('sections'),'aria-label="Delete section '+esc(s.number)+'"')+'</div>'+
   kit.table({columns:[{key:'title',label:'Item',render:i=>cText('items',i,'title','Item title')+cBool('items',i,'required','Required')+customLine('items',i)},{key:'status',label:'Status',render:i=>cSel('items',i,'status','Status of '+i.title,opts(ITEM_STATUS,ITEM_LABEL),false)},{key:'owner',label:'Owner',render:i=>cText('items',i,'owner','Owner of '+i.title)},
    {key:'due',label:'Due',render:i=>cText('items',i,'due','Due date of '+i.title,'date')+(i.due&&i.due<AS_OF&&i.status!=='ready'?pill('Overdue','red'):'')},{key:'document',label:'Document',render:docCell},{key:'level_id',label:'Level',render:i=>cSel('items',i,'level_id','Level of '+i.title,levelOpts,false)},
    {key:'actions',label:'More',render:i=>'<div class="k-row dr-mini">'+bS('Details','details:items:'+i.id,!canWrite('items'),'aria-label="Details of '+esc(i.title)+'"')+bS('Delete','archive:items:'+i.id,!canWrite('items'),'aria-label="Delete '+esc(i.title)+'"')+'</div>'}],rows,
    empty:kit.empty({title:'No items in this section',text:'Add the documents this section needs.',action:canWrite('items')?{label:'Add item',action:'add:items:'+s.id}:null})})+'</section>';};
 const previewLv=lv.findIndex(l=>l.id===preview),visible=previewLv<0?[]:its.filter(i=>i.version_id&&i.status!=='not_applicable'&&lv.slice(0,previewLv+1).some(l=>l.id===i.level_id));
 const pending=plan&&plan.changes?[plan.add.length?plural(plan.add.length,'document')+' to add':'',plan.remove.length?plural(plan.remove.length,'document')+' to remove':'',plan.place.filter(p=>!plan.add.includes(p)).length?plural(plan.place.filter(p=>!plan.add.includes(p)).length,'document')+' moved or changed':'',plan.replace.length?plural(plan.replace.length,'new version')+' to show (one at a time, from the item)':''].filter(Boolean).join(', '):'';
 return partialNote()+xNote()+roomBar(bS('Add section','add:sections',!canWrite('sections')))+
  '<div class="k-grid dr-stats">'+kit.stat('Readiness',ok?pct(rd.pct):'—')+kit.stat('Required items missing',ok?rd.missing.length:'—')+kit.stat('In progress',ok?rd.inProgress:'—')+kit.stat('Documents in the room',g?(g.documents||[]).filter(d=>!d.gate).length:'Not live')+'</div>'+
  (pending?card('The room does not show the index yet','<p>'+esc(pending)+'.</p>'+bP('Publish index changes to the room','sync-room',!WR||!!plan.replace.length)):'')+
  (docsState==='unavailable'?'<p class="dr-note" role="note">Documents could not be listed. Attaching is unavailable until they can.</p>':'')+
  (ok&&rd.missing.length?muted('Missing required items: '+rd.missing.slice(0,6).map(i=>i.title).join('; ')+(rd.missing.length>6?'…':'')):'')+
  '<label class="k-field dr-search" for="dr-q"><span>Search items</span><input id="dr-q" type="search" data-action="query" value="'+esc(st.query)+'"></label>'+
  (secs.length?secs.map(sectionBlock).join(''):kit.empty({title:'No sections yet',text:'Set up the room\'s levels and sections from its index template, then add the checklist items.',action:canWrite('levels')&&canWrite('sections')?{label:'Set up levels and sections',action:'setup-structure:'+r.id}:null}))+
  card('Preview as a party','<label class="k-field" for="dr-prev"><span>Party level</span><select id="dr-prev" data-action="filter:preview"><option value="">Choose a level</option>'+lv.map(l=>'<option value="'+esc(l.id)+'"'+(l.id===preview?' selected':'')+'>'+esc(l.name)+'</option>').join('')+'</select></label>'+(previewLv<0?muted('What a party sees at a level (and the levels below it), once the room shows the index.'):visible.length?'<ol class="dr-list">'+secs.filter(s=>visible.some(i=>i.section_id===s.id)).map(s=>'<li><strong>'+esc(s.number+' '+s.name)+'</strong><ul>'+visible.filter(i=>i.section_id===s.id).map(i=>'<li>'+esc(i.title)+(bool(i.view_only)?' <span class="dr-sub">View only</span>':'')+'</li>').join('')+'</ul></li>').join('')+'</ol>':muted('No documents at this level yet.')));}

function partiesScreen(){if(!room)return noRoom();const r=room,g=groupOf(r),ps=grantsOf(r.id).map(partyOf),c=cols('parties'),notLinked=ps.filter(p=>!p.linked&&!['revoked','expired'].includes(p.status));
 const col={party:{label:'Party',render:p=>link(partyName(p.grant),'panel:party:'+p.grant.id,'Disclosure record of '+partyName(p.grant))+'<span class="dr-sub">'+esc([partyOrg(p.grant),p.grant.recipient_email].filter(Boolean).join(' · '))+'</span>'},
  levels:{label:'Levels',render:p=>p.levels.map(k=>{const l=levelByKey(r.id,k);return l?pill(l.name+(p.linked&&!p.open.includes(k)?' (locked)':''),p.open.includes(k)?'green':''):'';}).join(' ')},
  cda:{label:'CDA',render:p=>esc(CDA_STATUS_LABEL[p.grant.cda_status]||'—')+(p.slots.some(s=>s.status==='received')?'<div>'+bP('Accept signed CDA','accept-cda:'+p.grant.id+':'+(p.slots.find(s=>s.status==='received')||{}).fileId,!WR)+'</div>':'')},
  status:{label:'Status',render:p=>pill(cap(p.status),p.status==='active'?'green':p.status==='revoked'||p.status==='expired'?'red':'')+(p.linked?'':' <span class="dr-sub">No link yet</span>')},
  granted:{label:'Granted',render:p=>esc(dateLabel(p.grant.granted_on))},ends:{label:'Ends',render:p=>p.expiresAt?esc(dateLabel(String(p.expiresAt).slice(0,10))):'Until revoked'},last_seen:{label:'Last seen',render:p=>p.lastSeen?esc(stamp(p.lastSeen)):'Never'}};
 const label_=id=>(templateLayoutSchema.groups.parties.find(x=>x.id===id)||{}).label;
 const rows=paged(ps.filter(p=>!st.query||(partyName(p.grant)+' '+partyOrg(p.grant)+' '+p.grant.recipient_email).toLowerCase().includes(st.query.toLowerCase())));
 const orgs=[...new Set(ps.map(p=>p.grant.organization_id).filter(Boolean))],cdas=$.AGREEMENTS.filter(a=>/cda|nda/i.test(String(a.agreement_type||''))&&orgs.includes(a.counterparty_id));
 return partialNote()+xNote()+roomBar(bP('Add party','panel:party-new',!canWrite('grants'))+bS('Give access and invite','panel:grant',!g||!notLinked.length||!WR))+
  (!g?muted('The room is not live yet. You can add parties now; links are created when the room is live.'):'')+
  (ps.length?'<label class="k-field dr-search" for="dr-pq"><span>Search parties</span><input id="dr-pq" type="search" data-action="query" value="'+esc(st.query)+'"></label>':'')+
  kit.table({columns:c.map(id=>({key:id,label:LP.labels['parties:'+id]||label_(id),render:p=>col[id].render(p)})).concat([{key:'actions',label:'Actions',render:p=>'<div class="k-row dr-mini">'+bS('Levels','panel:levels:'+p.grant.id,!canWrite('grants')||['revoked','expired'].includes(p.status),'aria-label="Change levels of '+esc(partyName(p.grant))+'"')+(p.linked&&p.status!=='revoked'?bS('Extend','panel:extend:'+p.grant.id,!WR,'aria-label="Extend access of '+esc(partyName(p.grant))+'"')+bS('Revoke','panel:revoke:'+p.grant.id,!WR,'aria-label="Revoke access of '+esc(partyName(p.grant))+'"'):'')+'</div>'}]),rows:rows.slice.map(p=>({id:p.grant.id,...p})),
   empty:kit.empty({title:ps.length?'No party matches':'No parties yet',text:ps.length?'Change the search.':'Add investors, partners or acquirers with their email address. Each person gets one private link.',action:!ps.length&&canWrite('grants')?{label:'Add party',action:'panel:party-new'}:null})})+pager(rows)+
  card('Signed CDAs on file',R.agreements.unbound?muted('Agreements are not connected to this app.'):cdas.length?list_(cdas.map(a=>'<li>'+esc(orgName(a.counterparty_id))+': '+esc(a.name)+' · '+esc(cap(a.status))+(a.expiry_date?' · until '+esc(dateLabel(a.expiry_date)):'')+'</li>')):muted('No CDA on file for these parties.'));}

function activityScreen(){if(!room)return noRoom();const r=room,secs=secsOf(r.id),ps=grantsOf(r.id).map(partyOf).filter(p=>p.linked||p.documents.length),its=itemsOf(r.id);
 if(!ps.length)return xNote()+roomBar()+kit.empty({title:'Nobody has opened the room yet',text:'Views, downloads and time per document appear here once parties open their links.',action:{label:'Go to parties',action:'nav:parties'}});
 const secOf=d=>d.section&&d.section.number?d.section.number:(()=>{const i=its.find(x=>x.document_id===d.documentId);const s=i&&secs.find(x=>x.id===i.section_id);return s?s.number:'';})();
 const opensIn=(p,s)=>p.documents.filter(d=>secOf(d)===s.number).reduce((n,d)=>n+num(d.views,0),0);
 const grid=kit.table({columns:[{key:'party',label:'Party',render:p=>'<strong>'+esc(partyName(p.grant))+'</strong><span class="dr-sub">'+esc(partyOrg(p.grant))+'</span>'}].concat(PHONE?[{key:'opens',label:'Opens',render:p=>String(p.documents.reduce((n,d)=>n+num(d.views,0),0))}]:secs.map(s=>({key:'s'+s.id,label:s.number+' '+s.name,render:p=>{const v=opensIn(p,s);return v?'<span class="dr-heat">'+v+'</span>':'·';}}))).concat([{key:'downloads',label:'Downloads',render:p=>String(p.documents.reduce((n,d)=>n+num(d.downloads,0),0))},{key:'seen',label:'Last seen',render:p=>p.lastSeen?esc(stamp(p.lastSeen)):'Never'}]),rows:ps.map(p=>({id:p.grant.id,...p}))});
 const docs=[];for(const p of ps)for(const d of p.documents){let x=docs.find(y=>y.documentId===d.documentId);if(!x)docs.push(x={documentId:d.documentId,title:d.title,rows:[]});x.rows.push({p,d});}
 const pick=docs.find(x=>x.documentId===st.filters.doc)||docs[0];
 const sig=ps.map(p=>({p,s:signals(p)}));
 return xNote()+roomBar()+card('Engagement by section',muted('Opens per party and section. Repeat opens of a version within 30 minutes count once; time is approximate visible time. Screenshots cannot be prevented.')+grid)+
  '<div class="dr-cols">'+card('Per document',docs.length?'<label class="k-field" for="dr-doc"><span>Document</span><select id="dr-doc" data-action="filter:doc">'+docs.map(x=>'<option value="'+esc(x.documentId)+'"'+(pick&&x.documentId===pick.documentId?' selected':'')+'>'+esc(x.title)+'</option>').join('')+'</select></label>'+
   kit.table({columns:[{key:'party',label:'Party',render:x=>esc(partyName(x.p.grant))},{key:'opens',label:'Opens',render:x=>String(num(x.d.views,0))},{key:'time',label:'Time',render:x=>esc(mins(x.d.seconds))},{key:'downloads',label:'Downloads',render:x=>String(num(x.d.downloads,0))},{key:'versions',label:'Versions opened',render:x=>String(Object.keys(x.d.versions||{}).length)},{key:'last',label:'Last',render:x=>esc(stamp(x.d.lastSeen||x.d.lastViewed))}],rows:pick.rows.map((x,k)=>({id:String(k),...x}))}):muted('No document has been opened yet.'))+
  card('Quiet and hot parties',muted('Quiet: nothing opened for '+plural($.QUIET,'day')+'. Hot: 5 or more opens this week, or Confidential documents opened 3 or more times.')+list_(sig.filter(x=>x.s.hot||x.s.quiet).map(x=>'<li>'+pill(x.s.hot?'Hot':'Quiet',x.s.hot?'green':'amber')+' '+esc(partyName(x.p.grant))+(x.s.hot?': '+plural(x.s.opens,'open')+' this week':': '+(x.p.lastSeen?'last opened '+plural(x.s.since,'day')+' ago':'never opened, invited '+plural(x.s.since,'day')+' ago'))+'</li>').concat(sig.some(x=>x.s.hot||x.s.quiet)?[]:['<li class="k-muted">No quiet or hot parties.</li>'])))+'</div>'+
  card('What changed since each party\'s last visit',kit.table({columns:[{key:'party',label:'Party',render:p=>esc(partyName(p.grant))},{key:'seen',label:'Last seen',render:p=>p.lastSeen?esc(stamp(p.lastSeen)):'Never'},{key:'changed',label:'Changed documents',render:p=>{const ch=changedFor(r,p);return ch.length?esc(ch.map(i=>i.title).join('; ')):'<span class="k-muted">Nothing new</span>';}},{key:'brief',label:'Call brief',render:p=>bS('Call brief','panel:brief:'+p.grant.id,false,'aria-label="Call brief for '+esc(partyName(p.grant))+'"')}],rows:ps.map(p=>({id:p.grant.id,...p}))}));}

function qaScreen(){if(!room)return noRoom();const r=room,g=groupOf(r),M=g?messagesOf(g):{rows:[],ok:false},logged=new Set($.QS.map(q=>q.message_id)),fresh=M.rows.filter(m=>m.kind==='question'&&!logged.has(m.id)),qs=questionsOf(r.id),c=cols('questions'),f=st.filters.qstatus||'open';
 const shown=qs.filter(q=>f==='all'||(f==='open'?!['answered','published','declined'].includes(q.status):q.status===f)).sort((a,b)=>String(b.asked_on||'').localeCompare(String(a.asked_on||'')));
 const about=q=>{const s=$.SECS.find(x=>x.id===q.section_id);return s?s.number+' '+s.name:q.document_ids?'Document':'Room';},open=q=>!['answered','published','declined'].includes(q.status);
 const col={party:{label:'Party',render:q=>link($.GRANT[q.grant_id]?partyName($.GRANT[q.grant_id]):'Team entry','panel:answer:'+q.id,'Open the question')+'<span class="dr-sub">'+esc(String(q.question).slice(0,120))+'</span>'},about:{label:'About',render:q=>esc(about(q))},
  category:{label:'Category',render:q=>cSel('questions',q,'category','Category',opts(Q_CATS,Q_CAT_LABEL))},asked:{label:'Asked',render:q=>esc(dateLabel(q.asked_on))},assignee:{label:'Assignee',render:q=>open(q)?cText('questions',q,'assignee','Assignee'):esc(q.assignee||'—')},
  due:{label:'Due',render:q=>(open(q)?cText('questions',q,'due','Due date','date'):esc(q.due?dateLabel(q.due):'—'))+(q.due&&q.due<AS_OF&&open(q)?pill('Overdue','red'):'')},status:{label:'Status',render:q=>pill(Q_LABEL[q.status]||'New',q.status==='published'||q.status==='answered'?'green':q.status==='in_review'?'blue':'')}};
 const label_=id=>LP.labels['questions:'+id]||(templateLayoutSchema.groups.questions.find(x=>x.id===id)||{}).label;
 const rows=paged(shown),lib=qs.filter(q=>['answered','published'].includes(q.status)&&q.answer);
 return xNote()+roomBar(bS('Log a question asked elsewhere','add:questions',!canWrite('questions')))+
  (fresh.length?card('New questions from the room','<form data-action="log-questions">'+muted('Add them to the log to assign, draft, approve and answer.')+tbl('New questions',['Add','Question','About','Asked'],fresh.map(m=>{const e=(g.exchanges||[]).find(x=>x.id===m.exchangeId),gr=e&&$.GRANT[e.recordId];return '<tr><td><input type="checkbox" id="dr-m-'+esc(m.id)+'" name="m_'+esc(m.id)+'" data-action="f:log:m_'+esc(m.id)+'" checked aria-label="Add this question"></td><td><strong>'+esc(gr?partyName(gr):m.recipientName||'A party')+'</strong><br>'+esc(m.body)+'</td><td>'+esc(m.reference&&m.reference.document?m.reference.document.title:m.reference&&m.reference.section?'Section '+m.reference.section.number:'Room')+'</td><td>'+esc(stamp(m.createdAt))+'</td></tr>';}))+'<div class="k-row dr-foot">'+submit('Add to the log',canWrite('questions'))+'</div></form>'):'')+
  card('Question log','<div class="k-row">'+muted($.QA_APPROVAL?'Answers need approval before they are sent or published.':'Answers can be sent without a separate approval.')+'<span class="k-grow"></span><label class="k-picker" for="dr-qf"><span>Show</span><select id="dr-qf" data-action="filter:qstatus">'+[['open','Open'],['all','All']].concat(Q_STATUS.map(s=>[s,Q_LABEL[s]])).map(x=>'<option value="'+x[0]+'"'+(x[0]===f?' selected':'')+'>'+esc(x[1])+'</option>').join('')+'</select></label></div>'+
   kit.table({columns:c.map(id=>({key:id,label:label_(id),render:q=>col[id].render(q)})),rows:rows.slice,empty:kit.empty({title:f==='open'?'No open questions':'No questions',text:g?'Questions parties ask in the room appear above, ready to add to the log.':'Questions from parties arrive once the room is live. You can log one asked by email or on a call.',action:canWrite('questions')?{label:'Log a question',action:'add:questions'}:null})})+pager(rows))+
  card('Approved answers',lib.length?list_(lib.slice(0,12).map(q=>'<li><strong>'+esc(String(q.question).slice(0,140))+'</strong><br><span class="k-muted">'+esc(String(q.answer).slice(0,240))+'</span> '+pill(q.status==='published'?'Published':'Private',q.status==='published'?'green':'')+'</li>')):muted('Answers sent or published in this room appear here and are suggested again for repeated questions.'));}

/* Index templates and email texts are data lists on their own screens (G6); the built-in ones are always there. */
function templatesScreen(){const ed=t=>!t.builtin&&canWrite('templates');
 return kit.table({columns:[{key:'name',label:'Template',render:t=>(ed(t)?cText('templates',t,'name','Template name'):esc(t.name))+(t.builtin?'<span class="dr-sub">Built in</span>':'')},{key:'purpose',label:'Purpose',render:t=>ed(t)?cSel('templates',t,'purpose','Purpose of '+t.name,opts(PURPOSES,PURPOSE_LABEL),false):esc(PURPOSE_LABEL[t.purpose]||'—')},
  {key:'items',label:'Items',render:t=>String(t.content.sections.reduce((n,s)=>n+(s.items||[]).length,0))},{key:'required',label:'Required',render:t=>String(t.content.sections.reduce((n,s)=>n+(s.items||[]).filter(i=>i.required).length,0))},
  {key:'actions',label:'Actions',render:t=>'<div class="k-row dr-mini">'+bS(t.builtin?'Copy to edit':'Copy','copy-template:'+t.id,!canWrite('templates'),'aria-label="Copy '+esc(t.name)+'"')+(t.builtin?'':bS('Edit sections and items','panel:template:'+t.id,!canWrite('templates'),'aria-label="Edit '+esc(t.name)+'"')+bS('Delete','archive:templates:'+t.id,!canWrite('templates'),'aria-label="Delete '+esc(t.name)+'"'))+'</div>'}],rows:$.TEMPLATES})+
  muted('A new room starts from the template you choose. Copy a built-in index to change its sections, items and required flags.');}
function emailsScreen(){const T=$.EMAIL_TEXTS;
 return kit.table({columns:[{key:'type',label:'Email',render:x=>'<strong>'+esc(EMAIL_LABEL[x.id])+'</strong>'},{key:'texts',label:'Texts in use',render:x=>{const own=Object.keys(T[x.id]||{}).filter(p=>p==='all'||PURPOSES.includes(p));return own.length?own.map(p=>pill(p==='all'?'All rooms':PURPOSE_LABEL[p],'blue')).join(' '):'<span class="k-muted">Built-in</span>';}},
  {key:'edit',label:'Edit',render:x=>bS('Edit text','panel:email:'+x.id,!canWrite('settings'),'aria-label="Edit '+esc(EMAIL_LABEL[x.id])+'"')}],rows:EMAIL_TYPES.map(id=>({id}))})+
  muted('Default texts per email type and room purpose. You can change every email again in the send review; the link, sender and footer are added by TrialAgents.');}
function fieldsScreen(){return kit.table({columns:[{key:'label',label:'Field',render:c=>'<strong>'+esc(c.label)+'</strong>'+(roleMap[c.role]&&roleMap[c.role].fields[c.key]?'':'<span class="dr-sub">Not in this app yet</span>')},{key:'role',label:'On',render:c=>esc(cap(ROLE_LABEL[c.role]))},{key:'kind',label:'Kind',render:c=>esc(cap(c.kind)+(c.options?' ('+c.options.join(', ')+')':''))},
  {key:'remove',label:'Remove',render:c=>bS('Remove','custom-remove:'+c.role+':'+c.real,!canWrite('settings'),'aria-label="Remove '+esc(c.label)+'"')}],rows:$.CUSTOM.map(c=>({...c,id:c.role+'.'+c.real}))})+muted('Removing a field stops showing it; its values stay in the table.');}
function settingsScreen(){if(!OWNER)return muted('Only the app\'s owners change these settings.');
 return '<form class="k-card dr-card" data-action="save-settings"><div class="dr-details">'+field('settings','default_access_days','Default access (days; blank = until revoked)',$.ACCESS_DAYS===null?'':$.ACCESS_DAYS,{type:'number',min:1,max:730})+field('settings','quiet_days','Quiet after (days without an open)',$.QUIET,{type:'number',min:1,max:365})+
  field('settings','sender_display','Sender display name',$.SETTING.sender_display||'organization',{type:'select',options:[['organization','<Organization> at TrialAgents'],['first_name','<First name> at TrialAgents']]})+'</div>'+
  field('settings','view_only_default','New documents are view-only (no download)',$.VIEW_ONLY,{type:'checkbox'})+field('settings','qa_approval_required','Answers need approval before sending or publishing',$.QA_APPROVAL,{type:'checkbox'})+
  field('settings','entry_text','Click-through text',$.ENTRY_TEXT,{type:'textarea'})+'<div class="k-row dr-foot">'+submit('Save settings',canWrite('settings'))+'</div></form>';}
const SCREEN_FN={overview,rooms:roomsScreen,index:indexScreen,parties:partiesScreen,activity:activityScreen,qa:qaScreen,templates:templatesScreen,emails:emailsScreen,fields:fieldsScreen,settings:settingsScreen};
const docOptions=(extra)=>{const L=docsList(),mine=st.uploaded||[];return L.docs.filter(d=>d.latest!==false).sort((a,b)=>(mine.includes(b.versionId)?1:0)-(mine.includes(a.versionId)?1:0)).slice(0,60).map(d=>[d.versionId,d.filename+' (v'+num(d.version,0)+')']).concat(extra||[]);};
function levelChecks(formName,r,selected,disabledKeys){return '<fieldset class="dr-fieldset"><legend>Levels</legend>'+levelsOf(r.id).map(l=>field(formName,'l_'+l.id,l.name+' · entry: '+(ENTRY_LABEL[l.entry]||'none'),selected.includes(l.id),{type:'checkbox'})).join('')+'</fieldset>';}
function sidePanel(){const x=st.panel;if(!x)return '';const r=room;if(x.type==='email')return emailPanel(x);
 if(x.type==='newroom'){const d=draftOf('newroom'),purpose=PURPOSES.includes(d.purpose)?d.purpose:'financing';
  return drawer('New room','Purpose, links and index template','<div class="dr-details">'+field('newroom','name','Room name','',{required:true})+field('newroom','purpose','Purpose',purpose,{type:'select',options:opts(PURPOSES,PURPOSE_LABEL)})+field('newroom','template_id','Index template',($.TEMPLATES.find(t=>t.purpose===purpose)||BUILTIN_TEMPLATES[0]).id,{type:'select',options:$.TEMPLATES.map(t=>[t.id,t.name])})+field('newroom','cda_option','CDA option',purpose==='financing'?'none':'send_pdf',{type:'select',options:opts(CDA_OPTIONS,CDA_LABEL)})+field('newroom','round_id','Fundraise round (optional)','',{hint:'The round this room supports; Fundraise reads the room\'s access and views.'})+field('newroom','opportunity_ref','Partnerships opportunity (optional)','',{hint:'For licensing and partnering rooms; Partnerships reads the same data.'})+(R.people.unbound?'':field('newroom','contact_person_id','Contact person (optional)','',{type:'select',blank:'None',options:$.PEOPLE.slice(0,200).map(p=>[p.id,String(p.name||'Unnamed')])}))+field('newroom','owner','Owner','')+'</div>'+
   ($.PROGRAMS.length?'<fieldset class="dr-fieldset"><legend>Programs the room covers</legend>'+$.PROGRAMS.slice(0,30).map(p=>field('newroom','p_'+p.id,String(p.name||'Unnamed'),false,{type:'checkbox'})).join('')+'</fieldset>':'')+field('newroom','welcome_note','Welcome note (shown on the room page)','',{type:'textarea',wide:true})+field('newroom','access_ending_reminder','Remind me 7 days before a party\'s access ends',true,{type:'checkbox',wide:true}),btn('Cancel','close')+submit('Create the room',canWrite('rooms')),'create-room');}
 if(x.type==='live'&&r){const lv=levelsOf(r.id),needs=lv.some(l=>l.entry==='signed_cda'),place=placementOf(r);
  return drawer('Make "'+r.name+'" live','Creates the room page; nothing is sent',kv('Levels',lv.map(l=>l.name+' ('+(ENTRY_LABEL[l.entry]||'none')+')').join(', '))+kv('Documents to share',plural(place.length,'document')+' from the index')+kv('Access and views','Kept in this app\'s access and engagement tables by TrialAgents')+(needs?field('live','cda_doc','CDA document parties sign','',{type:'select',blank:'Choose the CDA',required:true,options:docOptions(),hint:'Shared at '+(lv[0]?lv[0].name:'the first level')+' and marked "To sign"; the signed copy opens the CDA-protected level.'})+'<div class="k-row">'+uploadBtn('cda','Upload the CDA')+'</div>':'')+'<p class="k-muted">After this, add parties and give them access; the invitation is sent only when you confirm the email.</p>',btn('Cancel','close')+submit('Make the room live',WR),'go-live');}
 if(x.type==='attach'){const i=$.ITEMS.find(y=>y.id===x.id);if(!i)return '';const d=draftOf('attach');if(!has(d,'level_id'))d.level_id=i.level_id;if(!has(d,'view_only'))d.view_only=bool(i.view_only);
  return drawer('Attach a document','Index item: '+i.title,(docsList().state==='pending'?'<p class="k-muted" role="status">Loading documents…</p>':docsList().state==='ready'?field('attach','version_id','Document',i.version_id||'',{type:'select',blank:'Choose a document',options:docOptions()}):'<p class="k-muted">Documents are available in the saved app.</p>')+'<div class="k-row">'+uploadBtn('item:'+i.id,'Upload a new document')+'</div><div class="dr-details">'+field('attach','level_id','Level',d.level_id,{type:'select',options:levelsOf(i.room_id).map(l=>[l.id,l.name])})+'<span></span>'+field('attach','view_only','View only (no download; screenshots cannot be prevented)',d.view_only,{type:'checkbox',wide:true})+field('attach','ready','Mark the item ready',i.status==='ready',{type:'checkbox',wide:true})+'</div><p class="k-muted">One document set serves every room: a new version of the same document is offered here and keeps its place in the room.</p>',btn('Cancel','close')+submit('Attach',canWrite('items')),'save-attach');}
 if(x.type==='notify'&&r){const g=groupOf(r);if(!g)return '';const c=notifyCandidates(r,g),d=draftOf('notify'),who=d.who==='selected'?'selected':'all';
  const docRows=c.docs.map(x=>'<tr><td><input type="checkbox" id="dr-nd-'+esc(x.versionId)+'" name="d_'+esc(x.versionId)+'" data-action="f:notify:d_'+esc(x.versionId)+'"'+((has(d,'d_'+x.versionId)?bool(d['d_'+x.versionId]):recentChange(x))?' checked':'')+' aria-label="Include '+esc(x.title)+'"></td><th scope="row">'+esc((x.section?x.section+' ':'')+x.title)+'</th><td>'+pill(x.updated?'Updated':'New')+'</td><td>'+esc(x.levelName)+'</td><td>'+(x.changedAt?esc(stamp(x.changedAt)):'—')+'</td><td class="num">'+c.parties.filter(p=>p.open.includes(x.level)).length+'</td></tr>');
  const partyRows=c.parties.map(p=>'<tr><td><input type="checkbox" id="dr-np-'+esc(p.grant.id)+'" name="p_'+esc(p.grant.id)+'" data-action="f:notify:p_'+esc(p.grant.id)+'"'+(bool(d['p_'+p.grant.id])?' checked':'')+' aria-label="Notify '+esc(partyName(p.grant))+'"></td><th scope="row">'+esc(partyName(p.grant))+'<span class="dr-sub">'+esc(partyOrg(p.grant))+'</span></th><td>'+esc(p.open.map(k=>(levelByKey(r.id,k)||{name:k}).name).join(', ')||'—')+'</td><td>'+(p.lastSeen?esc(stamp(p.lastSeen)):'Never')+'</td></tr>');
  return drawer('Notify parties','Choose the documents and who hears about them; you check every email next','<p class="k-muted">Recently added or updated documents are ticked. Each person is told only about the ticked documents they can open; people who cannot open any of them get no email.</p>'+tbl('Documents to tell parties about',['','Document','Change','Level','Changed','#Can open'],docRows,'No documents in the room.',true)+
   field('notify','who','Send to',who,{type:'select',options:[['all','Everyone with a link who can open them'],['selected','Only the people I tick below']]})+(who==='selected'?tbl('People',['','Person','Open levels','Last seen'],partyRows,'Nobody has a link yet.',true):''),btn('Cancel','close')+submit('Next: check the emails',WR),'notify-prepare');}
 if(x.type==='party-new'&&r){const d=draftOf('party'),p=$.PERSON[d.person_id];
  return drawer('Add a party to '+r.name,'One person, one private link','<div class="dr-details">'+(R.organizations.unbound?'':field('party','organization_id','Organization',p&&p.organization_id||'',{type:'select',blank:'Choose',options:$.ORGS.slice(0,300).map(o=>[o.id,String(o.name||'Unnamed')])}))+(R.people.unbound?'':field('party','person_id','Person (optional)','',{type:'select',blank:'Not in People',options:$.PEOPLE.filter(q=>!d.organization_id||q.organization_id===d.organization_id).slice(0,300).map(q=>[q.id,String(q.name||'Unnamed')+(q.email?' · '+q.email:'')])}))+field('party','email','Email address',p&&p.email||'',{type:'email',required:true})+field('party','days','Access (days; blank = until revoked)',$.ACCESS_DAYS===null?'':$.ACCESS_DAYS,{type:'number',min:1,max:730})+'</div>'+levelChecks('party',r,levelsOf(r.id).filter((l,i)=>i===0||l.entry==='signed_cda').map(l=>l.id))+(levelsOf(r.id).some(l=>l.entry==='signed_cda')?'<p class="k-muted">CDA-protected levels stay locked until the party\'s signed CDA is accepted; they upload it on their page.</p>':'')+'<div class="k-row">'+bS('New organization','add:organizations',!canWrite('organizations'))+bS('New person','add:people:'+(d.organization_id||''),!canWrite('people'))+'</div>',btn('Cancel','close')+submit('Add the party',canWrite('grants')),'save-party');}
 if(x.type==='grant'&&r){const g=groupOf(r),ps=grantsOf(r.id).filter(y=>!exchangeOf(g,y)&&!['revoked','expired'].includes(String(y.status||'')));
  return drawer('Give access','Creates one private link per person; nothing is sent yet','<p class="k-muted">Links are created now'+(g&&!(g.exchanges||[]).some(e=>e.status&&e.status.room&&e.status.room.history&&e.status.room.history.some(h=>h.kind==='email_sent'))?' (nobody has been contacted yet)':', with a review')+'. Then you check the invitation email and confirm one send.</p>'+tbl('People without a link',['','Person','Levels'],ps.map(y=>'<tr><td><input type="checkbox" id="dr-g-'+esc(y.id)+'" name="g_'+esc(y.id)+'" data-action="f:grant:g_'+esc(y.id)+'"'+(has(draftOf('grant'),'g_'+y.id)?bool(draftOf('grant')['g_'+y.id])?' checked':'':' checked')+' aria-label="Give access to '+esc(partyName(y))+'"></td><td>'+esc(partyName(y))+'<span class="dr-sub">'+esc([partyOrg(y),y.recipient_email].filter(Boolean).join(' · '))+'</span></td><td>'+esc(list(y.level_ids).map(levelName).join(', '))+'</td></tr>'),'Everyone already has a link.',true)+field('grant','days','Access (days; blank = until revoked)',$.ACCESS_DAYS===null?'':$.ACCESS_DAYS,{type:'number',min:1,max:730}),btn('Cancel','close')+submit('Give access',WR),'grant-access');}
 if(x.type==='send'&&r){const g=groupOf(r),b=st.batch,xs=(g&&g.exchanges||[]).filter(e=>x.ids.includes(e.id)),t=emailText(x.emailType,r.purpose);
  if(b)return drawer('Send '+EMAIL_LABEL[b.emailType].toLowerCase(),'Exactly what will be sent. You confirm the send once in TrialAgents.','<p class="k-muted">From '+esc(b.from)+' · Replies to '+esc(b.replyTo)+(b.scheduledAt?' · Sent automatically on '+esc(stamp(b.scheduledAt)):'')+'</p>'+b.recipients.map(e=>'<article class="dr-mail"><div class="k-row"><strong>To '+esc(e.to)+'</strong>'+(e.personalised?pill('Personalised','blue'):'')+'</div><div class="dr-mail-subject">'+esc(e.subject)+'</div><pre class="dr-mail-body">'+esc(e.text)+'</pre></article>').join(''),btn('Edit','send:'+b.emailType+':'+x.ids.join(':'))+btn('Send '+plural(b.recipients.length,'email'),'confirm-send','primary',!WR),null);
  return drawer(EMAIL_LABEL[x.emailType],'To '+plural(xs.length,'person')+'; you see every email before it is sent',field('send','subject','Subject',t.subject)+field('send','body','Text for everyone',t.body,{type:'textarea',cls:'tall',hint:'The private link, sender and footer are added by TrialAgents for each person.'})+field('send','name_kind','Sender name',$.SENDER_KIND,{type:'select',options:[['organization','Organization at TrialAgents'],['person','First name at TrialAgents']]})+(x.emailType==='access_ending'?field('send','schedule','Send automatically on (optional; you approve the text now)','',{type:'date'}):'')+'<h3>Personalise (optional)</h3>'+xs.map(e=>field('send','o_'+e.id,'Text for '+(e.recipientName||e.recipientEmails[0]),'',{type:'textarea'})).join(''),btn('Cancel','close')+submit('Prepare the emails',WR),'prepare-send');}
 if(x.type==='levels'){const grant=$.GRANT[x.id];if(!grant)return '';const rr=$.ROOM[grant.room_id],p=partyOf(grant),d=draftOf('levels'),cur=p.levels.map(k=>(levelByKey(rr.id,k)||{}).id).filter(Boolean);const conf=levelsOf(rr.id).filter(l=>l.entry==='signed_cda');
  const orgCdas=$.AGREEMENTS.filter(a=>/cda|nda/i.test(String(a.agreement_type||''))&&(!grant.organization_id||a.counterparty_id===grant.organization_id));
  return drawer('Levels for '+partyName(grant),p.linked?'You confirm the change once in TrialAgents; lowering a level hides those documents at once.':'The levels apply when you give access.',levelChecks('levels',rr,cur.length?cur:list(grant.level_ids))+(conf.length?'<fieldset class="dr-fieldset"><legend>CDA-protected levels ('+esc(conf.map(l=>l.name).join(', '))+')</legend><p class="k-muted">'+(p.slots.some(s=>s.status==='accepted')?'The signed CDA is accepted.':'Opens when the signed CDA is accepted, or when you record a CDA already in place.')+'</p>'+field('levels','cda_mode','How the CDA is in place',rr.cda_option==='in_place'?'in_place':rr.cda_option==='contracts'&&orgCdas.length?'contracts':'upload',{type:'select',options:[['upload','Signed copy uploaded by the party'],['in_place','In place elsewhere'],['contracts','On file in Contracts']]})+field('levels','cda_date','CDA signed on (in place elsewhere)','',{type:'date'})+(R.agreements.unbound?'':field('levels','agreement_id','Signed CDA in Contracts','',{type:'select',blank:orgCdas.length?'Choose':'None on file for this organization',options:orgCdas.map(a=>[a.id,String(a.name||'CDA')])}))+'</fieldset>':'')+(p.linked?field('levels','notify','Email '+partyName(grant)+' that their access changed',true,{type:'checkbox',wide:true}):''),btn('Cancel','close')+submit(p.linked?'Change levels':'Save levels',canWrite('grants')),'save-levels');}
 if(x.type==='revoke'){const grant=$.GRANT[x.id];if(!grant)return '';return drawer('Revoke access of '+partyName(grant),'The link stops at once; the disclosure record stays',field('revoke','reason','Reason (kept in the record)','',{type:'textarea',required:true})+field('revoke','notify','Email them that access ended',false,{type:'checkbox',wide:true}),btn('Cancel','close')+submit('Revoke access',WR),'revoke');}
 if(x.type==='extend'){const grant=$.GRANT[x.id];if(!grant)return '';return drawer('Extend access of '+partyName(grant),'Up to 730 days',field('extend','days','Extend by (days)',30,{type:'number',min:1,max:730}),btn('Cancel','close')+submit('Extend',WR),'extend');}
 if(x.type==='party'){const grant=$.GRANT[x.id];if(!grant)return '';const rr=$.ROOM[grant.room_id],p=partyOf(grant),g=groupOf(rr),M=g?messagesOf(g).rows:[],lvName=k=>(levelByKey(rr.id,k)||{name:k}).name;
  const hist=p.history.map(h=>'<li><span class="k-muted">'+esc(stamp(h.at))+'</span> '+esc(h.kind==='invited'?'Access given: '+(h.levels||[]).map(lvName).join(', '):h.kind==='levels_changed'?'Levels changed to '+(h.to||[]).map(lvName).join(', '):h.kind==='entry_recorded'?'Entry step recorded for '+lvName(h.level)+(h.note?' ('+h.note+')':''):h.kind==='acknowledged'?'Accepted the confidentiality notice'+(h.level?' for '+lvName(h.level):''):h.kind==='file_accepted'?'Signed CDA accepted':h.kind==='email_sent'?cap(EMAIL_LABEL[h.emailType]||'Email')+' sent':h.kind==='extended'?'Access extended to '+dateLabel(String(h.to||'').slice(0,10)):h.kind==='revoked'?'Access revoked':h.kind==='answered'?'Private answer sent':cap(h.kind))+'</li>').join('');
  const visibleDocs=itemsOf(rr.id).filter(i=>i.version_id&&p.open.some(k=>(levelByKey(rr.id,k)||{}).id===i.level_id));
  const answers=M.filter(m=>(m.kind==='answer'&&m.exchangeId===(p.exchange||{}).id)||(m.kind==='published'&&(!m.level||p.open.includes(m.level))));
  return drawer(partyName(grant),'Disclosure record'+(partyOrg(grant)?' · '+partyOrg(grant):''),kv('Email',grant.recipient_email)+kv('Status',cap(p.status))+kv('Levels',p.levels.map(k=>lvName(k)+(p.open.includes(k)?'':' (locked)')).join(', '))+kv('CDA',CDA_STATUS_LABEL[grant.cda_status]||'—')+kv('Access ends',p.expiresAt?dateLabel(String(p.expiresAt).slice(0,10)):'Until revoked')+kv('Last seen',p.lastSeen?stamp(p.lastSeen):'Never')+(customOf('grants').length?customKv('grants',grant)+'<div class="k-row">'+bS('Edit details','details:grants:'+grant.id,!canWrite('grants'))+'</div>':'')+
   '<h3>Access history</h3>'+(hist?'<ul class="dr-list">'+hist+'</ul>':'<p class="k-muted">No access yet.</p>')+
   '<h3>Documents visible now ('+visibleDocs.length+')</h3>'+(visibleDocs.length?'<ul class="dr-list">'+visibleDocs.map(i=>'<li>'+esc(i.title)+' · '+esc(levelName(i.level_id))+'</li>').join('')+'</ul>':'<p class="k-muted">None.</p>')+
   '<h3>Opened or downloaded</h3>'+tbl('Documents opened by '+partyName(grant),['Document','#Opens','#Time','#Downloads','Versions','Last'],p.documents.map(d=>'<tr><th scope="row">'+esc(d.title)+'</th><td class="num">'+num(d.views,0)+'</td><td class="num">'+esc(mins(d.seconds))+'</td><td class="num">'+num(d.downloads,0)+'</td><td>'+esc(Object.entries(d.versions||{}).map(([v,s])=>'v…'+v.slice(-4)+': '+num(s.views,0)+' opens, '+num(s.downloads,0)+' downloads').join('; ')||'—')+'</td><td>'+esc(stamp(d.lastSeen||d.lastViewed))+'</td></tr>'),'Nothing opened yet.')+
   '<h3>Answers received</h3>'+(answers.length?'<ul class="dr-list">'+answers.map(m=>'<li><span class="k-muted">'+esc(stamp(m.createdAt))+(m.kind==='published'?' · published':' · private')+'</span><br>'+esc(String(m.body).slice(0,300))+'</li>').join('')+'</ul>':'<p class="k-muted">None.</p>'),btn('Close','close'),null);}
 if(x.type==='brief'){const grant=$.GRANT[x.id];if(!grant)return '';const txt=briefText(grant);
  return drawer('Call brief: '+partyName(grant),'Copy for a deal call',field('brief','text','Summary',txt,{type:'textarea',cls:'tall',readonly:true}),btn('Close','close'),null);}
 if(x.type==='answer'){const q=$.QUESTION[x.id];if(!q)return '';const d=draftOf('answer'),rr=$.ROOM[q.room_id],similar_=questionsOf(rr.id).concat($.QS.filter(z=>z.room_id!==rr.id)).filter(z=>z.id!==q.id&&['answered','published'].includes(z.status)&&z.answer&&similar(z.question,q.question)>=0.5).slice(0,3);
  if(!has(d,'answer'))d.answer=q.answer||'';if(!has(d,'public_question'))d.public_question=String(q.question||'');const sent=['answered','published','declined'].includes(q.status);
  return drawer('Question'+($.GRANT[q.grant_id]?' from '+partyName($.GRANT[q.grant_id]):''),Q_LABEL[q.status]||'New','<blockquote class="dr-quote">'+esc(q.question)+'</blockquote>'+(customOf('questions').length?customKv('questions',q)+'<div class="k-row">'+bS('Edit details','details:questions:'+q.id,!canWrite('questions'))+'</div>':'')+(sent?kv('Answer',q.answer)+kv('Answered on',dateLabel(q.answered_on))+kv('Visibility',cap(q.visibility)):
   (similar_.length?'<div class="k-card dr-similar"><strong>Similar questions were answered before</strong>'+similar_.map(z=>'<p>'+esc(String(z.question).slice(0,140))+'<br><span class="k-muted">'+esc(String(z.answer).slice(0,240))+'</span></p>').join('')+'</div>':'')+
   '<div class="dr-details">'+field('answer','assignee','Assignee',q.assignee||'')+field('answer','due','Due',q.due||addDays(AS_OF,5),{type:'date'})+field('answer','category','Category',q.category||'',{type:'select',blank:'Choose',options:opts(Q_CATS,Q_CAT_LABEL)})+(similar_.length?field('answer','reused_from','Reuses the answer to','',{type:'select',blank:'None',options:similar_.map(z=>[z.id,String(z.question).slice(0,60)])}):'<span></span>')+'</div>'+
   field('answer','answer','Answer',d.answer,{type:'textarea',cls:'tall',hint:'Your assistant can draft this from approved documents, with references; you decide.'})+
   (q.status==='in_review'?'<p class="k-muted">Approved by '+esc(q.approved_by)+'. Changing the text needs a new approval.</p>':'')+field('answer','approver','Approver (your name)','')+
   '<h3>Publish to parties (optional)</h3>'+field('answer','public_question','Question as parties will see it (no names)',d.public_question,{type:'textarea'})+field('answer','publish_to','Publish to','room',{type:'select',options:[['room','Everyone in the room']].concat(levelsOf(rr.id).map(l=>[l.id,'Parties with '+l.name]))})),
   sent?btn('Close','close'):'<div class="k-row">'+[['save','Save draft'],['approve','Approve'],['private','Answer privately'],['publish','Publish'],['decline','Decline']].map(([k,t])=>'<button type="submit" name="step" value="'+k+'" class="k-button'+(k==='private'||k==='publish'?' k-button--primary':'')+'"'+(canWrite('questions')&&(['save','approve','decline'].includes(k)||WR)?'':' disabled')+'>'+esc(t)+'</button>').join('')+'</div>','save-answer');}
 if(x.type==='template'){const t=$.TEMPLATE_ROWS.find(y=>y.id===x.id);if(!t)return '';const text=t.content.sections.map(s=>s.number+' '+s.name+'\n'+(s.items||[]).map(i=>'  - '+i.title+(i.level==='confidential'?' [confidential]':'')+(i.required?' (required)':'')).join('\n')).join('\n');
  return drawer('Edit '+t.name,'Index template','<div class="dr-details">'+field('template','name','Name',t.name,{required:true})+field('template','purpose','Purpose',t.purpose,{type:'select',options:opts(PURPOSES,PURPOSE_LABEL)})+'</div>'+field('template','content','Sections and items',text,{type:'textarea',cls:'tall',hint:'One numbered section per line ("4 Intellectual property"), then its items indented with "-". Add [confidential] and (required) after an item.'}),btn('Cancel','close')+submit('Save template',canWrite('templates')),'save-template');}
 return '';}
function editorPanel(){const x=st.editor;if(!x)return '';const role=x.role,d=x.draft;
 const ctl=f=>{const a='draft:'+f.key,id='dr-e-'+f.key,c=' id="'+id+'" name="'+f.key+'" data-action="'+a+'"',v=d[f.key]===null||d[f.key]===undefined?'':d[f.key];
  if(f.kind==='select')return '<select'+c+'>'+(f.required?'':'<option value="">—</option>')+f.options.map(o=>'<option value="'+esc(o)+'"'+(String(v)===o?' selected':'')+'>'+esc(({purpose:PURPOSE_LABEL,cda_option:CDA_LABEL,entry:ENTRY_LABEL,status:role==='items'?ITEM_LABEL:{},category:Q_CAT_LABEL})[f.key]&&({purpose:PURPOSE_LABEL,cda_option:CDA_LABEL,entry:ENTRY_LABEL,status:role==='items'?ITEM_LABEL:{},category:Q_CAT_LABEL})[f.key][o]||cap(o))+'</option>').join('')+'</select>';
  if(f.kind==='ref'){const rows=R[f.ref].rows;return '<select'+c+'><option value="">—</option>'+rows.map(r=>'<option value="'+esc(r.id)+'"'+(v===r.id?' selected':'')+'>'+esc(r.data.name||'Unnamed')+'</option>').join('')+'</select>';}
  if(f.kind==='boolean')return '<input type="checkbox"'+c+(bool(v)?' checked':'')+'>';
  if(f.kind==='longtext')return '<textarea class="dr-text"'+c+'>'+esc(v)+'</textarea>';
  return '<input  type="'+(f.kind==='number'?'number':f.kind==='date'?'date':'text')+'"'+(f.kind==='number'?' step="any" min="0"':'')+c+' value="'+esc(v)+'">';};
 let fs=editable(role).filter(f=>!(x.mode==='create'&&has(x.fixed,f.key)));const fg=FORM_GROUP[role];
 if(fg&&st.layout.cols[fg]){const order=st.layout.cols[fg],at=k=>{const i=order.indexOf(k);return i<0?99:i;};fs=fs.filter(f=>f.required||f.custom||colVisible(fg,f.key)).sort((a,b)=>at(a.key)-at(b.key));}
 const extra=role==='items'&&roleMap.items&&roleMap.items.fields.level_id?'<label class="k-field" for="dr-e-level_id"><span>Level</span><select id="dr-e-level_id" name="level_id" data-action="draft:level_id">'+levelsOf(d.room_id||(x.fixed||{}).room_id).map(l=>'<option value="'+esc(l.id)+'"'+(d.level_id===l.id?' selected':'')+'>'+esc(l.name)+'</option>').join('')+'</select></label>':'';
 return drawer((x.mode==='create'?'New ':'Edit ')+ROLE_LABEL[role],'','<div class="dr-details">'+fs.map(f=>f.kind==='boolean'?'<label class="dr-check" for="dr-e-'+f.key+'">'+ctl(f)+'<span>'+esc(fieldLabel(role,f))+'</span></label>':'<label class="k-field" for="dr-e-'+f.key+'"><span>'+esc(fieldLabel(role,f))+(f.required?' *':'')+'</span>'+ctl(f)+'</label>').join('')+extra+'</div>',btn('Cancel','close')+submit(x.mode==='create'?'Add':'Save',canWrite(role)),'save-record');}
function emailPanel(x){const type=EMAIL_TYPES.includes(x.id)?x.id:'access_granted',d=draftOf('email');d.type=type;const purpose=PURPOSES.includes(d.purpose)?d.purpose:'all',cur=emailText(type,purpose==='all'?'other':purpose),own=($.EMAIL_TEXTS[type]||{})[purpose];
 if(d.loaded!==type+'/'+purpose){d.subject=own?own.subject:cur.subject;d.body=own?own.body:cur.body;d.loaded=type+'/'+purpose;}
 return drawer(EMAIL_LABEL[type],own?'Saved text for '+(purpose==='all'?'all rooms':PURPOSE_LABEL[purpose]+' rooms'):'Built-in text',field('email','purpose','Rooms',purpose,{type:'select',options:[['all','All purposes']].concat(opts(PURPOSES,PURPOSE_LABEL))})+field('email','subject','Subject',d.subject)+
  field('email','body','Text',d.body,{type:'textarea',cls:'tall',hint:'Placeholders: {recipient_name} {recipient_company} {sender_name} {sender_company} {title} {deadline} (access end) {link} {levels} {documents} (new and updated documents) {message} (the answer).'}),
  btn('Cancel','close')+btn('Use the built-in text','reset-email','',!canWrite('settings')||!own)+submit('Save text',canWrite('settings')),'save-email');}

/* ---------- Run: read the screen's tables, handle the event, make the screen ---------- */
const navLike=a=>/^(nav:|f:|draft:|query$|filter:|page:|close$|pick-room$|open-room:|panel:)/.test(a);
const action0=String(event.action||'');
const target=action0.startsWith('nav:')?action0.slice(4):action0.startsWith('open-room:')?action0.split(':')[2]:st.section;
if(CMD)preload(ALL_ROLES);else preload(SCREEN_ROLES[ALL_SCREENS.includes(target)?target:st.section]||SCREEN_ROLES.overview);
$.CUSTOM;
/* Undo (G8): after a direct save, the person's last action can be undone from the screen. */
if(event.kind==='open'&&st.undoHint&&inp.saved){try{const u=tools.call('undo.list',{}),a=u&&Array.isArray(u.actions)?u.actions[0]:null;st.undo=a?{undoId:a.undoId,label:a.label||'last change'}:null;}catch(e){st.undo=null;}}
st.undoHint=false;
try{if(CMD)st.command=runCommand(action0,event.value);else handle(event);}catch(e){say('error',String(e&&e.message||e));}
if(PENDING&&!CMD&&event.kind!=='open'&&event.kind!=='refresh'&&!navLike(action0))needServer();
if(SAVED&&!REVIEW)st.undoHint=true;
if(FRESH)resetData();
if(CMD)return {html:'',state:st};
if(!ALL_SCREENS.includes(st.section)||st.section==='settings'&&!OWNER||st.section==='fields'&&!$.CUSTOM.length)st.section='overview';
preload(SCREEN_ROLES[st.section]);
if(!R.rooms.pending&&!$.ROOM[st.roomId])st.roomId=($.ROOMS.find(r=>r.status==='live')||$.ROOMS[0]||{}).id||'';
room=$.ROOM[st.roomId]||null;
const items=st.layout.tabs.map(id=>SCREENS.find(s=>s.id===id)).filter(s=>s&&st.layout.visible[s.id]!==false).concat($.CUSTOM.length?[EXTRA[0]]:[]).concat(OWNER?[EXTRA[1]]:[]);
if(!items.some(s=>s.id===st.section))st.section=(items[0]||SCREENS[0]).id;
let main='';try{main=SCREEN_FN[st.section]();}catch(e){main=kit.empty({title:'This screen could not be shown',text:String(e&&e.message||e).slice(0,300),action:{label:'Go to Overview',action:'nav:overview'}});}
let overlays='';try{overlays=st.editor?editorPanel():st.panel&&st.panel.type==='email'?emailPanel(st.panel):sidePanel();}catch(e){overlays='';st.editor=null;st.panel=null;say('error','This panel could not be shown: '+String(e&&e.message||e));}
if(PENDING){main='<div class="k-card dr-loading" role="status" aria-busy="true"><p class="k-muted">Loading…</p></div>';overlays='';}
const top=st.undo&&WR?'<div class="k-row dr-undo">'+kit.undo([st.undo])+'</div>':'';
/* While a side panel is open, the screen behind it is inert (the panel is modal). */
const page=kit.page(kit.layout(kit.nav(items,st.section,{side:true,label:'Data Room screens'}),top+main,{side:true}));
const html=(overlays?page.replace(/^<div class="k-app"/,'<div class="k-app" inert'):page)+overlays;
if(!FLASH&&event.kind==='open'&&carried)FLASH=carried;
if(SAVED&&!REVIEW&&FLASH)st.flash=FLASH;
const css=typeof DATAROOM_CSS==='string'?DATAROOM_CSS:'';
return {html,css,state:st,...(FLASH?{notice:kit.notice(FLASH.kind,FLASH.message)}:{}),...(inp.saved&&st.roomId?{context:{roomId:st.roomId}}:{})};
