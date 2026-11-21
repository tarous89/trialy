'use trialagents v2';
const templateLayoutSchema={"screens":[{"id":"overview","label":"Overview"},{"id":"requests","label":"Requests"},{"id":"vendors","label":"Vendors"},{"id":"messages","label":"Messages"},{"id":"proposals","label":"Proposals"},{"id":"evaluation","label":"Evaluation"},{"id":"decision","label":"Decision"},{"id":"settings","label":"Settings"}],"groups":{"requests":[{"id":"name","label":"Request"},{"id":"mode","label":"Mode"},{"id":"stage","label":"Stage"},{"id":"service_type","label":"Service"},{"id":"response_deadline","label":"Response deadline"},{"id":"responses","label":"Responses"},{"id":"owner","label":"Owner"}],"vendors":[{"id":"name","label":"Vendor"},{"id":"org_type","label":"Type"},{"id":"country","label":"Country"},{"id":"requests","label":"Requests"},{"id":"awards","label":"Awards"},{"id":"score","label":"Past score"}],"request_form":[{"id":"name","label":"Name"},{"id":"mode","label":"Mode"},{"id":"service_type","label":"Service type"},{"id":"program_id","label":"Program"},{"id":"study_id","label":"Study"},{"id":"scope","label":"Scope"},{"id":"assumptions","label":"Sponsor assumptions and baseline"},{"id":"budget_estimate","label":"Budget estimate"},{"id":"currency","label":"Currency"},{"id":"cda_option","label":"CDA"},{"id":"cda_gate","label":"CDA gate"},{"id":"question_deadline","label":"Question deadline"},{"id":"response_deadline","label":"Response deadline"},{"id":"decision_due","label":"Decision due"},{"id":"owner","label":"Owner"},{"id":"rfi_questions","label":"RFI questions (one per line)"},{"id":"questions","label":"Questions (one per line)"},{"id":"cost_categories","label":"Cost categories of the bid grid (one per line)"}],"vendor_form":[{"id":"name","label":"Name"},{"id":"org_type","label":"Type"},{"id":"country","label":"Country or region"},{"id":"website","label":"Website"}],"contact_form":[{"id":"name","label":"Name"},{"id":"organization_id","label":"Organization"},{"id":"title","label":"Title"},{"id":"email","label":"Email"}],"invitation_form":[{"id":"organization_id","label":"Supplier"},{"id":"recipient_emails","label":"Recipient emails (1 to 5, comma separated)"},{"id":"status","label":"Status"},{"id":"cda_status","label":"CDA status"},{"id":"cda_in_place_on","label":"CDA in place on"},{"id":"cda_agreement_id","label":"CDA agreement"},{"id":"notes","label":"Notes"}],"proposal_form":[{"id":"round","label":"Round"},{"id":"version","label":"Version"},{"id":"submitted_on","label":"Submitted on"},{"id":"total","label":"Total price"},{"id":"pass_through","label":"Pass-through costs (part of the total)"},{"id":"currency","label":"Currency"},{"id":"start_weeks","label":"Weeks to start"},{"id":"duration_months","label":"Duration (months)"},{"id":"answers","label":"Answers"},{"id":"assumptions_delta","label":"Deviations from the sponsor assumptions"},{"id":"notes","label":"Notes"}],"line_form":[{"id":"category","label":"Cost category"},{"id":"description","label":"Description"},{"id":"units","label":"Units"},{"id":"unit_cost","label":"Unit cost"},{"id":"amount","label":"Amount"},{"id":"currency","label":"Currency"},{"id":"deviation","label":"Deviation from the sponsor assumptions"}],"criterion_form":[{"id":"name","label":"Criterion"},{"id":"category","label":"Category"},{"id":"weight","label":"Weight (%)"},{"id":"mandatory","label":"Mandatory (a mean score below 3 fails)"}],"checklist_form":[{"id":"item","label":"Item"},{"id":"owner","label":"Owner"},{"id":"due","label":"Due"},{"id":"status","label":"Status"},{"id":"notes","label":"Notes"}]}};
const appCommands=[{"id":"schema.describe","label":"Describe forms, fields, options, stages, settings and layout","mode":"read","input":{"type":"object","properties":{},"additionalProperties":false}},{"id":"overview.read","label":"Read open requests, what is waiting on us, what is due and recent awards","mode":"read","input":{"type":"object","properties":{},"additionalProperties":false},"screen":"overview"},{"id":"request.read","label":"Read one request with its suppliers, live status, proposals, award and summary","mode":"read","input":{"type":"object","properties":{"request_id":{"type":"string","format":"uuid"}},"additionalProperties":false,"required":["request_id"]},"screen":"requests"},{"id":"grid.read","label":"Read the bid grid: baseline, totals, deviations per category, other currencies","mode":"read","input":{"type":"object","properties":{"request_id":{"type":"string","format":"uuid"}},"additionalProperties":false,"required":["request_id"]},"screen":"proposals"},{"id":"evaluation.read","label":"Read criteria, scores, weighted results, blind state, qualification and bid defence","mode":"read","input":{"type":"object","properties":{"request_id":{"type":"string","format":"uuid"}},"additionalProperties":false,"required":["request_id"]},"screen":"evaluation"},{"id":"decision.read","label":"Read the decision, award, notices, onboarding and handoff","mode":"read","input":{"type":"object","properties":{"request_id":{"type":"string","format":"uuid"}},"additionalProperties":false,"required":["request_id"]},"screen":"decision"},{"id":"record.save","label":"Add or edit a request, vendor, contact, invitation, proposal, line, criterion or checklist item","mode":"propose","input":{"type":"object","properties":{"role":{"type":"string","enum":["requests","organizations","vendors","people","contacts","invitations","proposals","lines","proposal_lines","criteria","checklist","checklist_items"]},"id":{"type":"string","format":"uuid"},"fields":{"type":"object","description":"Field key \u2192 value, as listed by schema.describe for the form.","additionalProperties":true},"context":{"type":"object","properties":{"request_id":{"type":"string","format":"uuid"},"invitation_id":{"type":"string","format":"uuid"},"proposal_id":{"type":"string","format":"uuid"},"organization_id":{"type":"string","format":"uuid"},"scope":{"type":"string","enum":["qualification","bid_defence","onboarding"]}},"additionalProperties":false}},"additionalProperties":false,"required":["role"]},"description":"Without id it adds a record (context names where); with id it edits. Same form checks as the app."},{"id":"record.archive","label":"Archive a record (it stays in the database)","mode":"propose","input":{"type":"object","properties":{"role":{"type":"string","enum":["requests","organizations","vendors","people","contacts","invitations","proposals","lines","proposal_lines","criteria","checklist","checklist_items"]},"id":{"type":"string","format":"uuid"}},"additionalProperties":false,"required":["role","id"]}},{"id":"request.stage","label":"Move a request to another stage of its journey","mode":"propose","input":{"type":"object","properties":{"request_id":{"type":"string","format":"uuid"},"stage":{"type":"string","enum":["need","longlist","rfi","rfp","questions","proposals","evaluation","bid_defence","decision","onboarding","closed"]},"close_without_award":{"type":"boolean"}},"additionalProperties":false,"required":["request_id","stage"]},"screen":"requests"},{"id":"longlist.add","label":"Add a vendor to the longlist of a request","mode":"propose","input":{"type":"object","properties":{"request_id":{"type":"string","format":"uuid"},"organization_id":{"type":"string","format":"uuid"},"recipient_emails":{"type":["string","array"],"items":{"type":"string","maxLength":200},"maxItems":5}},"additionalProperties":false,"required":["request_id","organization_id"]},"description":"Without recipient_emails, the vendor's contacts with an email are used.","screen":"vendors"},{"id":"invitation.status","label":"Shortlist, make finalist, mark declined or not selected","mode":"propose","input":{"type":"object","properties":{"invitation_id":{"type":"string","format":"uuid"},"status":{"type":"string","enum":["longlist","rfi_invited","shortlisted","rfp_invited","declined","submitted","finalist","not_selected"]}},"additionalProperties":false,"required":["invitation_id","status"]},"description":"Selected is set only by decision.record.","screen":"vendors"},{"id":"cda.record_elsewhere","label":"Record that a CDA is in place elsewhere","mode":"propose","input":{"type":"object","properties":{"invitation_id":{"type":"string","format":"uuid"},"in_place_on":{"type":"string","format":"date"}},"additionalProperties":false,"required":["invitation_id"]},"screen":"vendors"},{"id":"cda.file_agreement","label":"File the supplier's signed CDA as an agreement, or link it","mode":"propose","input":{"type":"object","properties":{"invitation_id":{"type":"string","format":"uuid"}},"additionalProperties":false,"required":["invitation_id"]},"screen":"vendors"},{"id":"lines.save","label":"Add or edit proposal lines in the bid grid (map an accepted bid)","mode":"propose","input":{"type":"object","properties":{"proposal_id":{"type":"string","format":"uuid"},"lines":{"type":"array","minItems":1,"maxItems":40,"items":{"type":"object","additionalProperties":true}}},"additionalProperties":false,"required":["proposal_id","lines"]},"description":"Each line: category, amount, currency, description, units, unit_cost, deviation; with id it edits that line.","screen":"proposals"},{"id":"criteria.apply_defaults","label":"Apply the built-in weighted criteria set to a request","mode":"propose","input":{"type":"object","properties":{"request_id":{"type":"string","format":"uuid"}},"additionalProperties":false,"required":["request_id"]},"screen":"evaluation"},{"id":"checklist.apply_defaults","label":"Apply the built-in qualification, bid defence or onboarding checklist","mode":"propose","input":{"type":"object","properties":{"request_id":{"type":"string","format":"uuid"},"scope":{"type":"string","enum":["qualification","bid_defence","onboarding"]},"invitation_id":{"type":"string","format":"uuid"}},"additionalProperties":false,"required":["request_id","scope"]},"screen":"evaluation"},{"id":"checklist.set_status","label":"Set a checklist item to open, done, not applicable or issue","mode":"propose","input":{"type":"object","properties":{"item_id":{"type":"string","format":"uuid"},"status":{"type":"string","enum":["open","done","not_applicable","issue"]}},"additionalProperties":false,"required":["item_id","status"]},"screen":"evaluation"},{"id":"scores.save","label":"Save a reviewer's scores (1 to 5, with evidence)","mode":"propose","input":{"type":"object","properties":{"request_id":{"type":"string","format":"uuid"},"reviewer":{"type":"string","maxLength":80},"scores":{"type":"array","minItems":1,"maxItems":50,"items":{"type":"object","properties":{"invitation_id":{"type":"string","format":"uuid"},"criterion_id":{"type":"string","format":"uuid"},"score":{"type":"integer","minimum":1,"maximum":5},"evidence":{"type":"string","maxLength":4000}},"additionalProperties":false,"required":["invitation_id","criterion_id","score"]}}},"additionalProperties":false,"required":["request_id","reviewer","scores"]},"description":"Scores are recorded under the reviewer's name; enter only scores that reviewer gave.","screen":"evaluation"},{"id":"decision.record","label":"Record the award decision the user has made","mode":"propose","input":{"type":"object","properties":{"request_id":{"type":"string","format":"uuid"},"invitation_id":{"type":"string","format":"uuid"},"rationale":{"type":"string","maxLength":6000},"approver":{"type":"string","maxLength":120},"decided_on":{"type":"string","format":"date"},"start_date":{"type":"string","format":"date"},"delivery_team":{"type":"string","maxLength":2000},"override_reason":{"type":"string","maxLength":1000}},"additionalProperties":false,"required":["request_id","invitation_id","rationale","approver","decided_on"]},"description":"Only when the user asks to award this supplier. Saves the award, selected and not selected; notices are sent by a person with Notify all.","screen":"decision"},{"id":"award.save","label":"Update the award's start date, delivery team or agreement","mode":"propose","input":{"type":"object","properties":{"request_id":{"type":"string","format":"uuid"},"start_date":{"type":"string","format":"date"},"delivery_team":{"type":"string","maxLength":2000},"agreement_id":{"type":"string","maxLength":40}},"additionalProperties":false,"required":["request_id"]},"screen":"decision"},{"id":"onboarding.update","label":"Start onboarding, or mark it complete when every item is done","mode":"propose","input":{"type":"object","properties":{"request_id":{"type":"string","format":"uuid"}},"additionalProperties":false,"required":["request_id"]},"screen":"decision"},{"id":"handoff.prepare","label":"Prepare the handoff: draft agreement for Contracts and Programs milestones on the award","mode":"propose","input":{"type":"object","properties":{"request_id":{"type":"string","format":"uuid"}},"additionalProperties":false,"required":["request_id"]},"screen":"decision"},{"id":"award.link_agreement","label":"Link the draft award agreement to the award","mode":"propose","input":{"type":"object","properties":{"request_id":{"type":"string","format":"uuid"}},"additionalProperties":false,"required":["request_id"]},"screen":"decision"},{"id":"settings.save","label":"Change settings: currency, blind scoring, deadlines, texts, opening screen, stage names","mode":"propose","input":{"type":"object","properties":{"fields":{"type":"object","description":"Field key \u2192 value, as listed by schema.describe for the form.","additionalProperties":true}},"additionalProperties":false,"required":["fields"]},"description":"Keys: default_currency, blind_scoring, question_deadline_days, confidentiality_text, decision_text_winner, decision_text_others, opening_screen, stage_labels {stage: name}.","screen":"settings"},{"id":"invitation_text.save","label":"Save the invitation email text of a request kind","mode":"propose","input":{"type":"object","properties":{"kind":{"type":"string","enum":["rfi","rfp","quick_quote"]},"subject":{"type":"string","maxLength":200},"body":{"type":"string","maxLength":10000}},"additionalProperties":false,"required":["kind","subject","body"]},"screen":"settings"},{"id":"invitation_text.reset","label":"Go back to the built-in invitation text of a request kind","mode":"propose","input":{"type":"object","properties":{"kind":{"type":"string","enum":["rfi","rfp","quick_quote"]}},"additionalProperties":false,"required":["kind"]},"screen":"settings"},{"id":"layout.save","label":"Change screens, columns and forms: order, hide, show, labels and defaults","mode":"layout","input":{"type":"object","properties":{"heading":{"type":"string","maxLength":100},"screens":{"type":"array","items":{"type":"string","maxLength":64},"maxItems":8},"order":{"type":"object","additionalProperties":true},"hide":{"type":"array","items":{"type":"string","maxLength":130},"maxItems":100},"show":{"type":"array","items":{"type":"string","maxLength":130},"maxItems":100},"labels":{"type":"object","additionalProperties":true},"defaults":{"type":"object","additionalProperties":true}},"additionalProperties":false},"description":"Keys are screen ids or group:field (schema.describe \u2192 layout). Required form fields cannot be hidden."}];
/* TrialAgents CRO Selection 3.0.0 (life.cro-selection), v2 app contract on the TrialAgents kit. No DOM, network or browser storage.
 * Returns {html,css,state,notice,context}. Records come only from authorized bindings; record edits save directly with records.save from a
 * person's own click, change or submit (or an app command with a request key), with the version captured when editing started.
 * Supplier communication uses only the platform exchange (tools.call('exchange.*')): one group per RFI/RFP round, one exchange per supplier
 * bound to its invitation record. Anything that goes out to suppliers (sends, replies, clarifications, acceptances, notices) keeps the one
 * confirmation the platform shows; record changes made by the same click travel with it. Recipient links are never read, stored or rendered.
 * Every record action is also an app command (appCommands, line 3) that replays the same events through one handler (handle).
 * Each screen reads only its own tables, in one records.readMany batch; reads still on their way show as loading.
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
const grouped=n=>{const r=Math.round(Math.abs(n)*100)/100,s=Math.floor(r).toString().replace(/\B(?=(\d{3})+(?!\d))/g,','),c=Math.round((r-Math.floor(r))*100);return (n<0?'−':'')+s+(c?'.'+String(c).padStart(2,'0'):'');};
const money=(v,cur)=>v===null||v===undefined?'—':(cur?cur+' ':'')+grouped(v);
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const validDate=v=>{const t=String(v||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(t))return '';const d=new Date(t+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===t?t:'';};
const dayNo=d=>Math.round(Date.UTC(Number(d.slice(0,4)),Number(d.slice(5,7))-1,Number(d.slice(8,10)))/86400000);
const addMonthsYM=(m,n)=>{const t=Number(m.slice(0,4))*12+Number(m.slice(5,7))-1+n;return Math.floor(t/12)+'-'+String(t%12+1).padStart(2,'0');};
const addDays=(d,n)=>d?new Date((dayNo(d)+Math.round(n))*86400000).toISOString().slice(0,10):'';
const diffDays=(a,b)=>dayNo(b)-dayNo(a);
const dateLabel=d=>d?Number(d.slice(8,10))+' '+MONTHS[Number(d.slice(5,7))-1]+' '+d.slice(0,4):'—';
const stamp=v=>{const t=String(v||'');const d=validDate(t);return d?dateLabel(d)+(t.length>=16?' '+t.slice(11,16):''):'—';};
const plural=(n,w)=>n+' '+w+(Math.abs(n)===1?'':'s');
const label=v=>String(v===null||v===undefined||v===''?'—':v).replace(/_/g,' ');
const cap=s=>{s=label(s);return s.charAt(0).toUpperCase()+s.slice(1);};
const parseJSON=v=>{try{const x=JSON.parse(String(v||''));return x&&typeof x==='object'?x:null;}catch(e){return null;}};
const list=v=>String(v||'').split(',').map(x=>x.trim()).filter(Boolean);
const lines=v=>String(v||'').split('\n').map(x=>x.trim()).filter(Boolean).slice(0,60);
const emailsOf=v=>[...new Set(list(v).map(x=>x.toLowerCase()))];
const emailOk=e=>/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(e)&&e.length<=200;
const round1=n=>Math.round(n*10)/10,round2=n=>Math.round(n*100)/100;
const sgn=n=>(n>0?'+':n<0?'−':'')+Math.abs(n);
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||''));

const CURRENCIES=['USD','EUR','GBP','CHF','CAD','AUD','JPY','CNY','SEK','DKK','NOK','INR'];
const SERVICES=['clinical_study','preclinical_study','cmc','bioanalytical','other'];
const SERVICE_LABEL={clinical_study:'Clinical study',preclinical_study:'Preclinical study',cmc:'CMC',bioanalytical:'Bioanalytical',other:'Other'};
const MODES=['quick_quote','full_selection'];const MODE_LABEL={quick_quote:'Quick quote',full_selection:'Full selection'};
const STAGES=['need','longlist','rfi','rfp','questions','proposals','evaluation','bid_defence','decision','onboarding','closed'];
const STAGE_LABEL={need:'Need',longlist:'Longlist',rfi:'RFI',rfp:'RFP / request',questions:'Questions',proposals:'Proposals',evaluation:'Evaluation',bid_defence:'Bid defence',decision:'Decision',onboarding:'Contract & onboarding',closed:'Closed'};
const stagesOf=mode=>mode==='quick_quote'?STAGES.filter(s=>s!=='rfi'&&s!=='bid_defence'):STAGES;
const CDA_OPTIONS=['send_pdf','contracts','skip','none'];const CDA_LABEL={send_pdf:'Send PDF, receive the signed PDF',contracts:'Use Contracts (file the signed CDA as an agreement)',skip:'Skip: CDA in place elsewhere',none:'No CDA'};
const INV_STATUS=['longlist','rfi_invited','shortlisted','rfp_invited','declined','submitted','finalist','not_selected','selected'];
const INV_LABEL={longlist:'Longlist',rfi_invited:'RFI invited',shortlisted:'Shortlisted',rfp_invited:'Invited',declined:'Declined',submitted:'Submitted',finalist:'Finalist',not_selected:'Not selected',selected:'Selected'};
const CDA_STATUS=['not_needed','sent','signed','in_place_elsewhere'];const CDA_STATUS_LABEL={not_needed:'Not needed',sent:'Sent',signed:'Signed',in_place_elsewhere:'In place elsewhere'};
const ROUNDS=['rfi','rfp','quote'];const ROUND_LABEL={rfi:'RFI',rfp:'RFP',quote:'Quote'};
const CRIT_CATS=['scientific','operational','quality','commercial','relationship'];
const CHECK_SCOPES=['qualification','bid_defence','onboarding'];const CHECK_STATUS=['open','done','not_applicable','issue'];
const ORG_TYPES=['company','investor','cro','cdmo','site','funder','partner','agency','other'];
const VENDOR_TYPES=['cro','cdmo','other'];
const EMAIL_TYPES=['invitation','reminder','clarification','message','extended','revoked'];
const KINDS=['rfi','rfp','quick_quote'];const KIND_LABEL={rfi:'RFI',rfp:'RFP',quick_quote:'Quick quote'};
const kindOf=(req,round)=>round==='rfi'?'rfi':req&&req.mode==='quick_quote'?'quick_quote':'rfp';

/* Built-in defaults (fictional starting points). Questions and cost categories are copied onto the request, where people edit them. */
const DT=(name,kind,service_type,content)=>({name,kind,service_type,content});
const DEFAULTS=[
 DT('Quick quote questions','question_set','other',{round:'quote',questions:['What does your price include, and what is excluded?','When can you start, and how long will the work take?','Which of our assumptions would you change, and why?','Who will lead the work, and what similar work have they done?']}),
 DT('RFI capability questionnaire','question_set','clinical_study',{round:'rfi',questions:['Describe your experience in this indication and phase in the last five years.','Where do you have your own staff, and where do you use partners?','Which systems do you use for EDC, eTMF and safety?','When was your last inspection or sponsor audit, and what was the outcome?','Who would lead the project, and what is their current workload?']}),
 DT('Clinical study RFP questions','question_set','clinical_study',{round:'rfp',questions:['Confirm that your price follows the bid grid and our assumptions. List every deviation.','Describe your site selection and start-up plan, with timelines per country.','Describe your monitoring strategy and its cost if enrolment is slower than assumed.','Name the proposed delivery team with roles and allocation.','List pass-through costs and how you control them.','Describe your change-order process and its most common causes.','Which activities are subcontracted, and to whom?','Give two sponsor references for comparable studies.']}),
 DT('Clinical study bid grid','bid_grid','clinical_study',{categories:['Study start-up','Project management','Monitoring','Data management','Biostatistics','Medical writing','Safety management','Regulatory and ethics','Pass-through costs']}),
 DT('Preclinical study bid grid','bid_grid','preclinical_study',{categories:['Study design and protocol','In-life phase','Bioanalysis','Histopathology','Reporting','Pass-through costs']}),
 DT('CMC bid grid','bid_grid','cmc',{categories:['Process development','Analytical development','Engineering batch','GMP manufacture','Release testing','Stability studies','Pass-through costs']}),
 DT('Standard selection criteria','criteria_set','other',{criteria:[['Relevant experience','scientific',25,true],['Delivery team','operational',20,false],['Operational plan and timelines','operational',20,false],['Quality system','quality',15,true],['Price and price realism','commercial',15,false],['Working relationship','relationship',5,false]].map(c=>({name:c[0],category:c[1],weight:c[2],mandatory:c[3]}))}),
 DT('Qualification checklist','checklist','other',{scope:'qualification',items:['Quality audit or questionnaire reviewed','Two references checked','Financial standing reviewed','Insurance certificate received','Data protection assessment completed']}),
 DT('Bid defence checklist','checklist','other',{scope:'bid_defence',items:['Agenda sent','Attendees confirmed','Proposed delivery team presented','Notes and open points recorded']}),
 DT('Onboarding checklist','checklist','other',{scope:'onboarding',items:['Contract signed','Quality agreement signed','Kick-off meeting held','Delivery team confirmed','Systems access set up']})];
const builtinQuestions=(round,service)=>{const want=round==='rfi'?'rfi':round;const q=DEFAULTS.find(x=>x.kind==='question_set'&&x.content.round===want&&x.service_type===service)||DEFAULTS.find(x=>x.kind==='question_set'&&x.content.round===want)||DEFAULTS.find(x=>x.kind==='question_set'&&x.content.round==='rfp');return q.content.questions;};
const builtinCategories=service=>(DEFAULTS.find(x=>x.kind==='bid_grid'&&x.service_type===service)||DEFAULTS.find(x=>x.kind==='bid_grid'&&x.service_type==='clinical_study')).content.categories;
const KIND_NOUN={rfi:'capability questionnaire',rfp:'request for proposal',quick_quote:'request for a quote'};
function builtinInvitation(kind){const hi='Dear {recipient_name},\n\n',bye='\n\nKind regards,\n{sender_name}\n{sender_company}';
 return kind==='rfi'?{subject:'{sender_company}: {title}, answers by {deadline}',body:hi+'{sender_company} is preparing to select a partner and would like to learn about {recipient_company}.\n\nPlease answer our short capability questionnaire by {deadline}. You can save a draft and return:\n{link}\n\nWe will invite a shortlist to a request for proposal.'+bye}
  :kind==='quick_quote'?{subject:'{sender_company}: {title}, reply by {deadline}',body:hi+'{sender_company} would like a quote from {recipient_company} for "{title}".\n\nYour page has the scope, our assumptions and a few questions. Please reply with your price, timeline and quote file by {deadline}:\n{link}'+bye}
  :{subject:'{sender_company}: {title}, proposals by {deadline}',body:hi+'{sender_company} invites {recipient_company} to submit a proposal for "{title}".\n\nYour page has the brief, the request pack and our questions. Please submit by {deadline}; you can save a draft and resubmit until then:\n{link}\n\nAsk questions on the same page. Answers that matter to all bidders are shared with everyone, without naming who asked.'+bye};}
const DEFAULT_DECISION={winner:'We are pleased to tell you that we have selected {supplier} for "{request}". Thank you for a strong proposal.\n\nNext steps: we will send the contract documents and propose dates for a kick-off meeting. Please confirm your delivery team.',others:'Thank you for your proposal for "{request}" and for the time your team invested. After a careful evaluation we have selected another supplier for this work.\n\nThis says nothing against {supplier}; we would be glad to invite you again.\n\nIf you would like a short debrief call on your proposal, reply here with a few dates and we will arrange it.'};
const DEFAULT_CONFIDENTIALITY='The documents and information on this page are confidential. By continuing you agree to use them only to prepare your response and not to share them outside your organization.';

const OPT={ORG:ORG_TYPES,CUR:CURRENCIES,SERVICE:SERVICES,MODES,CDAO:CDA_OPTIONS,INV:INV_STATUS,CDAS:CDA_STATUS,ROUNDS,CC:CRIT_CATS,CS:CHECK_STATUS};
const F=spec=>spec.split(';').map(x=>{const [k,kind,lab,o]=x.split('|'),required=k.endsWith('*'),key=required?k.slice(0,-1):k,f={key,label:lab||cap(key),kind:kind||'text'};if(required)f.required=true;if(OPT[o])f.options=OPT[o];if(f.kind[0]==='@'){f.ref=f.kind.slice(1);f.kind='ref';if(o)f.tkind=o;}return f;});
const S={
 organizations:F('name*;org_type|select|Type|ORG;country||Country or region;website;archived|boolean'),
 people:F('name*;organization_id|@organizations|Organization;title;email;archived|boolean'),
 programs:F('name;archived|boolean'),studies:F('name;program_id;archived|boolean'),
 agreements:F('name;counterparty_id;agreement_type;status;effective_date;expiry_date;archived|boolean'),
 settings:F('default_currency|select||CUR;blind_scoring|boolean;question_deadline_days|number;confidentiality_text|longtext;decision_texts|frozen;invitation_texts|frozen;preferences|frozen'),
 requests:F('name*;mode*|select||MODES;service_type*|select||SERVICE;program_id|@programs|Program;study_id|@studies|Study;scope*|longtext;assumptions|assumptions;budget_estimate|number;currency*|select||CUR;stage|frozen;cda_option*|select|CDA|CDAO;cda_gate|boolean|Lock the request pack until the signed CDA is accepted;question_deadline|date;response_deadline*|date;decision_due|date;owner;rfi_questions|lines|RFI questions (one per line);questions|lines|Questions (one per line);cost_categories|lines|Cost categories of the bid grid (one per line);archived|boolean'),
 invitations:F('request_id|frozen;organization_id*|@organizations|Supplier;contact_ids|frozen;recipient_emails*|emails|Recipient emails (1 to 5, comma separated);status*|select||INV;cda_status|select|CDA status|CDAS;cda_in_place_on|date|CDA in place on;cda_agreement_id|@agreements|CDA agreement;notes|longtext'),
 proposals:F('invitation_id|frozen;round*|select||ROUNDS;version*|number;submitted_on*|date;source|frozen;total|number|Total price;pass_through|number|Pass-through costs (part of the total);currency*|select||CUR;start_weeks|number|Weeks to start;duration_months|number|Duration (months);answers|longtext;assumptions_delta|longtext|Deviations from the sponsor assumptions;document_ids|frozen;accepted_on|frozen;notes|longtext'),
 lines:F('proposal_id|frozen;category*||Cost category;description;units|number;unit_cost|number;amount*|number;currency*|select||CUR;deviation||Deviation from the sponsor assumptions'),
 criteria:F('request_id|frozen;name*||Criterion;category|select||CC;weight*|number|Weight (%);mandatory|boolean|Mandatory (a mean score below 3 fails)'),
 scores:F('request_id;invitation_id;criterion_id;reviewer;score;evidence'),
 checklist:F('request_id|frozen;invitation_id|frozen;scope|frozen;item*;owner;due|date;status*|select||CS;evidence_document_id|frozen;notes|longtext'),
 awards:F('request_id;organization_id;service_type;program_id;study_id;total;currency;start_date;duration_months;rationale;approver;decided_on;delivery_team;agreement_id;onboarding_status;handoff_status')
};
const ROLE_LABEL={organizations:'vendor',people:'contact',programs:'program',studies:'study',agreements:'agreement',settings:'settings',requests:'request',invitations:'invitation',proposals:'proposal',lines:'proposal line',criteria:'criterion',scores:'score',checklist:'checklist item',awards:'award'};
const XKINDS=['text','longtext','number','money','date','select','boolean'];
const ROLE_KEY={organizations:'organizations',people:'people',programs:'programs',studies:'studies',agreements:'agreements',settings:'croselection.settings',requests:'croselection.requests',invitations:'croselection.invitations',proposals:'croselection.proposals',lines:'croselection.proposal_lines',criteria:'croselection.criteria',scores:'croselection.scores',checklist:'croselection.checklist_items',awards:'croselection.awards'};

let mapping={};try{mapping=JSON.parse(cfg.tableMap||'{}');}catch(e){mapping={};}
const roleMap={};
for(const role of Object.keys(S)){
 const m=mapping[ROLE_KEY[role]],b=m&&bindings.find(x=>x.typeId===m.typeId);
 if(!m||!b)continue;
 const fields={};for(const f of S[role]){const k=m.fields&&m.fields[f.key]!==undefined?m.fields[f.key]:f.key;if(typeof k==='string'&&(b.fields||[]).includes(k))fields[f.key]=k;}
 /* 2.1.0 additional fields: a field added to the table (reviewed schema change) and declared in the table map's extraFields
  * {key,label,kind,options} shows in forms and details straight away; writableExtra lists the editable ones. Other bound fields this
  * version does not know are kept and shown read-only. They are never used in calculations. */
 const used=new Set(Object.values(fields)),extra=[],bound=b.fields||[];
 for(const x of Array.isArray(m.extraFields)?m.extraFields:[]){if(!x||!/^[a-z][a-z0-9_]{0,63}$/.test(x.key||'')||['id','version'].includes(x.key)||!bound.includes(x.key)||used.has(x.key)||S[role].some(f=>f.key===x.key)||extra.length>=20)continue;
  const kind=XKINDS.includes(x.kind)?x.kind:'text',options=Array.isArray(x.options)?x.options.map(v=>String(v).slice(0,80)).slice(0,50):[];if(kind==='select'&&!options.length)continue;
  extra.push({key:x.key,label:String(x.label||cap(x.key)).slice(0,80),kind:kind==='money'?'number':kind,...(kind==='select'?{options}:{}),extra:true});used.add(x.key);}
 for(const k of bound)if(typeof k==='string'&&/^[a-z][a-z0-9_]{0,63}$/.test(k)&&!['id','version'].includes(k)&&!used.has(k)&&extra.length<30){extra.push({key:k,label:cap(k),kind:'readonly',extra:true});used.add(k);}
 for(const x of extra)fields[x.key]=x.key;
 const wx=Array.isArray(m.writableExtra)?m.writableExtra:[];
 roleMap[role]={typeId:m.typeId,fields,extra,writable:(Array.isArray(m.writableFields)?m.writableFields:[]).filter(x=>fields[x]&&!extra.some(e=>e.key===x)).concat(extra.filter(e=>e.kind!=='readonly'&&wx.includes(e.key)).map(e=>e.key))};
}
const fieldsOf=role=>S[role].concat(roleMap[role]?roleMap[role].extra:[]);
const PAGE=100,MAX_PAGES=8;let callsLeft=90;
/* P3, P4 (3.0.0): each screen reads only its own tables, in one records.readMany batch whose reads are always the same for that screen
 * (so the frame answers a revisit without a request). A table longer than one page reads its other pages in one more batch. App
 * commands read every table. A read still on its way (pending, in the frame) makes the screen show loading, never empty or zero. */
const ALL_ROLES=Object.keys(S);
const SCREEN_ROLES={
 overview:['settings','requests','organizations','invitations','awards','checklist'],
 requests:['settings','requests','organizations','invitations','awards','proposals','lines','criteria','scores','programs','studies'],
 vendors:['settings','requests','organizations','people','invitations','awards','criteria','scores','agreements'],
 messages:['settings','requests','organizations','invitations'],
 proposals:['settings','requests','organizations','invitations','proposals','lines'],
 evaluation:['settings','requests','organizations','invitations','proposals','lines','criteria','scores','checklist'],
 decision:['settings','requests','organizations','invitations','awards','proposals','lines','criteria','scores','checklist','agreements'],
 emails:['settings','requests'],
 settings:['settings','requests'],
 all:ALL_ROLES};
const R={};for(const role of ALL_ROLES)R[role]={rows:[],allRows:[],complete:true,unbound:!roleMap[role],unavailable:false,total:0,truncated:false,invalid:0,skipped:true};
let batchReads=true;const loadedSets=new Set();
function readBatch(reads){
 if(!batchReads||!reads.length)return null;
 try{const out=tools.call('records.readMany',{reads});if(out&&out.pending)return reads.map(()=>({pending:true,rows:[],total:null}));if(out&&Array.isArray(out.results)&&out.results.length===reads.length)return out.results;}catch(e){}
 batchReads=false;return null;
}
function readOne(m,offset){callsLeft--;try{return tools.call('records.read',{typeId:m.typeId,limit:PAGE,offset,filters:{}});}catch(e){return null;}}
function takePage(role,m,acc,p){
 if(!p||p.unavailable){acc.unavailable=true;return false;}
 if(p.pending){acc.pending=true;return false;}
 const chunk=Array.isArray(p.rows)?p.rows:[];acc.total=p.total===null||p.total===undefined||!Number.isFinite(Number(p.total))?null:Number(p.total);
 for(const r of chunk){const data={};for(const [logical,real] of Object.entries(m.fields))if(has(r.data,real)){const v=r.data[real];if(v!==null&&typeof v==='object'){acc.invalid++;continue;}data[logical]=v;}acc.rows.push({id:r.id,version:r.version,data});}
 acc.offset+=chunk.length;if(acc.total!==null&&acc.offset>=acc.total){acc.complete=true;return false;}if(chunk.length<PAGE)return false;return true;}
function finish(role,acc){R[role]={rows:acc.rows.filter(r=>!bool(r.data.archived)),allRows:acc.rows,total:acc.total===null?acc.rows.length:acc.total,complete:acc.complete,unbound:false,unavailable:acc.unavailable,pending:!!acc.pending,truncated:acc.truncated,invalid:acc.invalid};}
/** Reads the tables of one screen (or all of them for a command). */
function loadSet(key){
 if(loadedSets.has(key))return;loadedSets.add(key);
 const roles=(SCREEN_ROLES[key]||SCREEN_ROLES.overview).filter(r=>roleMap[r]);
 if(!roles.length)return;
 const accs={};for(const r of roles)accs[r]={rows:[],offset:0,total:null,complete:false,unavailable:false,pending:false,truncated:false,invalid:0};
 const more=[];
 for(let i=0;i<roles.length;i+=12){const part=roles.slice(i,i+12),pages=readBatch(part.map(r=>({typeId:roleMap[r].typeId,limit:PAGE,offset:0,filters:{}})));
  part.forEach((r,k)=>{const p=pages?pages[k]:readOne(roleMap[r],0);if(pages)callsLeft--;if(takePage(r,roleMap[r],accs[r],p))more.push(r);});}
 for(const r of more){const a=accs[r],m=roleMap[r],n=Math.min(a.total!==null?Math.ceil((a.total-a.offset)/PAGE):MAX_PAGES-1,MAX_PAGES-1,Math.max(0,callsLeft));
  if(n<=0){a.truncated=true;continue;}
  const pages=readBatch(Array.from({length:n},(_,k)=>({typeId:m.typeId,limit:PAGE,offset:a.offset+k*PAGE,filters:{}})));let go=true;
  for(let k=0;k<n&&go;k++){const p=pages?pages[k]:readOne(m,a.offset);if(pages)callsLeft--;go=takePage(r,m,a,p);}
  if(go)a.truncated=true;}
 for(const r of roles)finish(r,accs[r]);
}
const canWrite=role=>!!inp.saved&&!!inp.writable&&cfg.readOnly!==true&&!!roleMap[role]&&roleMap[role].writable.length>0;

/* The layout screens keep the ids of 2.x, so layout profiles saved earlier stay valid; Emails (3.0.0) follows Decision and is always shown. */
const SCREENS=templateLayoutSchema.screens.flatMap(s=>s.id==='decision'?[s,{id:'emails',label:'Emails'}]:[s]);
const st=JSON.parse(JSON.stringify(inp.state||{}));
const LP={labels:{},defaults:{}};
{
 let profile={};try{profile=JSON.parse(cfg.layoutProfile||'{}');}catch(e){profile={};}
 const groups=templateLayoutSchema.groups;
 const tabs=Array.isArray(profile.tabs)?profile.tabs.filter(id=>SCREENS.some(s=>s.id===id)):[];
 const cols={};for(const g of Object.keys(groups)){const ids=groups[g].map(x=>x.id),saved=profile.cols&&Array.isArray(profile.cols[g])?profile.cols[g].filter(k=>ids.includes(k)):[];cols[g]=[...new Set(saved.concat(ids))];}
 const base=[...new Set(tabs.filter(id=>id!=='emails').concat(templateLayoutSchema.screens.map(s=>s.id)))];
 st.layout={tabs:base.flatMap(id=>id==='decision'?[id,'emails']:[id]),cols,visible:profile.visible&&typeof profile.visible==='object'?profile.visible:{},heading:String(profile.heading||'CRO Selection').slice(0,100)};
 LP.labels=profile.labels&&typeof profile.labels==='object'?profile.labels:{};LP.defaults=profile.defaults&&typeof profile.defaults==='object'?profile.defaults:{};
}
st.section=String(st.section||'');st.page=Math.max(0,Number(st.page)||0);st.query=String(st.query||'').slice(0,100);
st.filters=st.filters&&typeof st.filters==='object'?st.filters:{};
st.f=st.f&&typeof st.f==='object'?st.f:{};
st.reveal=st.reveal&&typeof st.reveal==='object'?st.reveal:{};
st.round=st.round==='rfi'?'rfi':'rfp';
/* U2 (3.0.0): messages go to the platform as output.notice. A message that follows a save is kept for the render the platform makes
 * from the saved data right after it (st.flash), then dropped. */
let NOTICE=null;
if(st.flash&&event.kind==='open'){NOTICE=st.flash;}delete st.flash;
const note=(v,kind)=>{const m=String(v||'').trim();NOTICE=m?{kind:kind||'success',message:m.length>300?m.slice(0,297)+'…':m}:null;};
const OWNER=inp.appRole===undefined?!!inp.writable:inp.appRole==='owner';
/* Screens: Settings only for the app's owners (G6). Screens hidden in the layout profile stay hidden. */
const sections=st.layout.tabs.map(id=>SCREENS.find(s=>s.id===id)).filter(s=>s&&st.layout.visible[s.id]!==false&&(s.id!=='settings'||OWNER));
const fixSection=()=>{if(!sections.some(s=>s.id===st.section))st.section=(sections[0]||SCREENS[0]).id;};fixSection();
/* G4: the request a person works on is their working context, kept across screens and visits. */
if(!st.requestId&&inp.context&&typeof inp.context==='object'&&typeof inp.context.requestId==='string')st.requestId=inp.context.requestId;
/* The layout gear stores visibility as "group:field"; 2.0.0 profiles with "group.field" keys are still honoured. */
const colVisible=(g,id)=>st.layout.visible[g+':'+id]!==false&&st.layout.visible[g+'.'+id]!==false;
/* Form layout (2.1.0): order, hidden fields, labels and defaults per form from the layout profile; required fields always show. */
const FORM_GROUP={requests:'request_form',organizations:'vendor_form',people:'contact_form',invitations:'invitation_form',proposals:'proposal_form',lines:'line_form',criteria:'criterion_form',checklist:'checklist_form'};
const fieldLabel=(role,f)=>FORM_GROUP[role]&&LP.labels[FORM_GROUP[role]+':'+f.key]||f.label;
function formFields(role,list){const g=FORM_GROUP[role];if(!g||!st.layout.cols[g])return list;const order=st.layout.cols[g];
 return list.filter(f=>f.required||f.extra||colVisible(g,f.key)).map((f,i)=>({f,i,o:order.indexOf(f.key)})).sort((a,b)=>(a.o<0?1e3+a.i:a.o)-(b.o<0?1e3+b.i:b.o)).map(x=>x.f);}
const draftOf=name=>st.f[name]&&typeof st.f[name]==='object'?st.f[name]:(st.f[name]={});

const CLOCK=(()=>{try{return validDate(new Date().toISOString());}catch(e){return '';}})();
const AS_OF=validDate(cfg.asOfOverride)||CLOCK;
const flat=r=>({id:r.id,version:r.version,...r.data});
const lookup=(role,id)=>(R[role].allRows||[]).find(r=>r.id===id)||null;
function refName(role,id){if(!id)return '—';const r=R[role];if(r.unbound)return cap(ROLE_LABEL[role])+' not connected';const x=r.allRows.find(y=>y.id===id);if(!x)return r.pending?'Loading…':cap(ROLE_LABEL[role])+' unavailable';return String(x.data.name||'Unnamed')+(bool(x.data.archived)?' (archived)':'');}
const orgName=id=>id?refName('organizations',id):'No supplier';
/* Everything derived from the tables, made again whenever more tables are read (derive). */
let readProblems=[],exact=true,PENDING=false,settingsRow=null,SET={},CURRENCY='EUR',BLIND=false,QDAYS=7,DECISION_TEXT={...DEFAULT_DECISION},CONFIDENTIALITY=DEFAULT_CONFIDENTIALITY,INVITE_SAVED={},PREF={};
let ORGS=[],VENDORS=[],REQS=[],REQ={},OPEN_REQS=[],req=null,INVS=[],INV={},PROPS=[],PROP={},LINES=[],CRITS=[],SCORES=[],CHECKS=[],AWARDS=[];
const STAGE_BASE={...STAGE_LABEL};
const CORE=['requests','invitations','proposals','lines','criteria','scores','checklist','awards','organizations'];
function derive(){
 PENDING=ALL_ROLES.some(r=>R[r].pending);
 readProblems=[];
 for(const role of CORE.concat(['settings'])){const r=R[role],n=cap(ROLE_LABEL[role]);if(r.skipped&&!r.unbound)continue;
  if(r.unbound)readProblems.push(n+' table is not connected to this app.');
  else if(r.pending)continue;
  else if(r.unavailable)readProblems.push('You cannot read the '+ROLE_LABEL[role]+' table.');
  else if(!r.complete)readProblems.push(n+': partial read ('+r.allRows.length+' of '+(r.total>r.allRows.length?r.total:'more than '+r.allRows.length)+' rows).');
  if(r.invalid)readProblems.push(n+': '+plural(r.invalid,'value')+' with an invalid (non-scalar) shape ignored.');}
 exact=readProblems.length===0&&!PENDING;
 settingsRow=R.settings.rows[0]||null;SET=settingsRow?settingsRow.data:{};
 CURRENCY=CURRENCIES.includes(SET.default_currency)?SET.default_currency:'EUR';
 BLIND=bool(SET.blind_scoring);
 QDAYS=(()=>{const n=num(SET.question_deadline_days);return n!==null&&n>=0&&n<=60?Math.round(n):7;})();
 DECISION_TEXT={...DEFAULT_DECISION,...(parseJSON(SET.decision_texts)||{})};
 CONFIDENTIALITY=String(SET.confidentiality_text||'').trim()||DEFAULT_CONFIDENTIALITY;
 INVITE_SAVED=parseJSON(SET.invitation_texts)||{};
 /* Preferences (2.1.0): stage names set earlier stay in use (keys never change, so other apps and the stage logic keep working). */
 PREF=parseJSON(SET.preferences)||{};for(const k of STAGES){const v=PREF.stage_labels&&typeof PREF.stage_labels==='object'?String(PREF.stage_labels[k]||'').trim():'';STAGE_LABEL[k]=v?v.slice(0,40):STAGE_BASE[k];}
 ORGS=R.organizations.rows.slice().sort((a,b)=>String(a.data.name||'').localeCompare(String(b.data.name||'')));
 VENDORS=ORGS.filter(o=>VENDOR_TYPES.includes(o.data.org_type));
 REQS=R.requests.rows.map(r=>({...flat(r),question_deadline:validDate(r.data.question_deadline),response_deadline:validDate(r.data.response_deadline),decision_due:validDate(r.data.decision_due),budget_estimate:num(r.data.budget_estimate),currency:CURRENCIES.includes(r.data.currency)?r.data.currency:CURRENCY,stage:STAGES.includes(r.data.stage)?r.data.stage:'need',mode:MODES.includes(r.data.mode)?r.data.mode:'full_selection',assume:parseJSON(r.data.assumptions)||{}})).sort((a,b)=>(STAGES.indexOf(a.stage)===10?1:0)-(STAGES.indexOf(b.stage)===10?1:0)||String(a.response_deadline||'9').localeCompare(String(b.response_deadline||'9'))||String(a.name||'').localeCompare(String(b.name||'')));
 REQ=Object.fromEntries(REQS.map(r=>[r.id,r]));
 OPEN_REQS=REQS.filter(r=>r.stage!=='closed');
 if(!REQ[st.requestId]&&!R.requests.pending)st.requestId=(OPEN_REQS[0]||REQS[0]||{}).id||'';
 req=REQ[st.requestId]||null;
 if(req&&req.mode==='quick_quote')st.round='rfp';
 INVS=R.invitations.rows.map(r=>({...flat(r),status:INV_STATUS.includes(r.data.status)?r.data.status:'longlist',emails:emailsOf(r.data.recipient_emails)}));
 INV=Object.fromEntries(INVS.map(i=>[i.id,i]));
 PROPS=R.proposals.rows.map(r=>({...flat(r),version:num(r.data.version,0),total:num(r.data.total),pass_through:num(r.data.pass_through),start_weeks:num(r.data.start_weeks),duration_months:num(r.data.duration_months),submitted_on:validDate(r.data.submitted_on),accepted_on:validDate(r.data.accepted_on),currency:CURRENCIES.includes(r.data.currency)?r.data.currency:''}));
 PROP=Object.fromEntries(PROPS.map(p=>[p.id,p]));
 LINES=R.lines.rows.map(r=>({...flat(r),amount:num(r.data.amount),units:num(r.data.units),unit_cost:num(r.data.unit_cost),category:String(r.data.category||'').trim(),currency:CURRENCIES.includes(r.data.currency)?r.data.currency:''}));
 CRITS=R.criteria.rows.map(r=>({...flat(r),weight:num(r.data.weight,0),mandatory:bool(r.data.mandatory)}));
 SCORES=R.scores.rows.map(r=>({...flat(r),score:num(r.data.score),reviewer:String(r.data.reviewer||'').trim()})).filter(s=>s.score!==null&&s.score>=1&&s.score<=5&&s.reviewer);
 CHECKS=R.checklist.rows.map(r=>({...flat(r),due:validDate(r.data.due),status:CHECK_STATUS.includes(r.data.status)?r.data.status:'open'}));
 AWARDS=R.awards.rows.map(r=>({...flat(r),total:num(r.data.total),decided_on:validDate(r.data.decided_on),start_date:validDate(r.data.start_date),duration_months:num(r.data.duration_months),handoff:parseJSON(r.data.handoff_status)||null}));
}
const load=key=>{loadSet(key);derive();};
/* The invitation per request kind: the saved text when complete, else the built-in one. Other email types use the platform defaults. */
function inviteText(kind){const s=INVITE_SAVED[kind];return s&&String(s.subject||'').trim()&&String(s.body||'').trim()?{subject:String(s.subject).slice(0,200),body:String(s.body).slice(0,10000),source:'saved'}:{...builtinInvitation(kind),source:'built-in'};}
const emailDefaultsFor=kind=>{const x=inviteText(kind);return {invitation:{subject:x.subject,body:x.body}};};
/* Commands name the request they act on; clicks use the request picked on screen. */
function useRequest(id){if(!REQ[id])throw Error('That request is not available. Use overview.read for the request IDs.');st.requestId=id;req=REQ[id];if(req.mode==='quick_quote')st.round='rfp';return req;}
const invsOf=rid=>INVS.filter(i=>i.request_id===rid).sort((a,b)=>orgName(a.organization_id).localeCompare(orgName(b.organization_id)));
const invName=id=>INV[id]?orgName(INV[id].organization_id):'Supplier unavailable';
const linesOf=pid=>LINES.filter(l=>l.proposal_id===pid);
const critsOf=rid=>CRITS.filter(c=>c.request_id===rid);
const checksOf=(rid,scope,iid)=>CHECKS.filter(c=>c.request_id===rid&&c.scope===scope&&(iid===undefined||(c.invitation_id||'')===(iid||'')));
const awardOf=rid=>AWARDS.filter(a=>a.request_id===rid).sort((a,b)=>String(b.decided_on).localeCompare(String(a.decided_on))||b.id.localeCompare(a.id))[0]||null;

const roundOf=r=>r.mode==='quick_quote'?'quote':'rfp';
function latestProposal(invId,round){return PROPS.filter(p=>p.invitation_id===invId&&p.round===round&&p.accepted_on).sort((a,b)=>b.version-a.version||String(b.submitted_on).localeCompare(String(a.submitted_on))||b.id.localeCompare(a.id))[0]||null;}
function proposalTotals(p,reqCurrency){const ls=linesOf(p.id).filter(l=>l.amount!==null);const cur=p.currency||reqCurrency||'';
 if(!ls.length)return {currency:cur,total:p.total,fromLines:false,others:{},passThrough:p.pass_through,stated:p.total};
 const by={};for(const l of ls){const c=l.currency||cur;by[c]=round2((by[c]||0)+l.amount);}
 const others={};for(const c of Object.keys(by))if(c!==cur)others[c]=by[c];
 const pt=ls.filter(l=>(l.currency||cur)===cur&&/pass.?through/i.test(l.category)).reduce((s,l)=>s+l.amount,0);
 return {currency:cur,total:has(by,cur)?by[cur]:null,fromLines:true,others,passThrough:ls.some(l=>/pass.?through/i.test(l.category))?round2(pt):p.pass_through,stated:p.total};}
const catKey=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
const baselineOf=r=>(Array.isArray(r.assume.baseline)?r.assume.baseline:[]).map(b=>({category:String(b&&b.category||'').trim(),amount:num(b&&b.amount)})).filter(b=>b.category&&b.amount!==null);
function gridOf(r,props){const cats=[],seen={};const add=c=>{c=String(c||'').trim();const k=catKey(c);if(k&&!seen[k]){seen[k]=true;cats.push(c);}};
 (lines(r.cost_categories).length?lines(r.cost_categories):builtinCategories(r.service_type)).forEach(add);
 const base=baselineOf(r);base.forEach(b=>add(b.category));for(const p of props)linesOf(p.id).forEach(l=>add(l.category));
 const baseBy={};for(const b of base)baseBy[catKey(b.category)]=round2((baseBy[catKey(b.category)]||0)+b.amount);
 return {cats,baseBy,baseTotal:base.length?round2(base.reduce((s,b)=>s+b.amount,0)):null};}
function cellOf(p,cat,r,grid){const ls=linesOf(p.id).filter(l=>catKey(l.category)===catKey(cat)&&l.amount!==null);const cur=r.currency;
 const same=ls.filter(l=>(l.currency||p.currency||cur)===cur),other=ls.filter(l=>(l.currency||p.currency||cur)!==cur);
 const amount=same.length?round2(same.reduce((s,l)=>s+l.amount,0)):null,base=has(grid.baseBy,catKey(cat))?grid.baseBy[catKey(cat)]:null;
 const dev=amount!==null&&base!==null?round2(amount-base):null;
 return {amount,base,dev,pct:dev!==null&&base?round1(dev/base*100):null,flags:ls.map(l=>String(l.deviation||'').trim()).filter(Boolean),other:other.map(l=>money(l.amount,l.currency||p.currency)),lines:ls};}
const reviewersOf=rid=>[...new Set(SCORES.filter(s=>s.request_id===rid).map(s=>s.reviewer))].sort();
function scoredSet(r){const all=invsOf(r.id),fin=all.filter(i=>['finalist','selected','not_selected'].includes(i.status)&&latestProposal(i.id,roundOf(r)));if(all.some(i=>i.status==='finalist'))return all.filter(i=>i.status==='finalist');if(fin.length)return fin;return all.filter(i=>i.status!=='declined'&&latestProposal(i.id,roundOf(r)));}
function scoreOf(r,invId){const cs=critsOf(r.id).filter(c=>c.weight>0||c.mandatory);let sum=0,scored=0,fails=[];const per={};
 for(const c of cs){const v=SCORES.filter(s=>s.request_id===r.id&&s.invitation_id===invId&&s.criterion_id===c.id).map(s=>s.score);
  if(!v.length){per[c.id]={mean:null,spread:null,n:0};continue;}
  const mean=v.reduce((a,b)=>a+b,0)/v.length;per[c.id]={mean:round2(mean),spread:Math.max(...v)-Math.min(...v),n:v.length};scored++;sum+=mean*c.weight;if(c.mandatory&&mean<3)fails.push(c.name);}
 return {weighted:cs.length&&scored===cs.length?Math.round(sum+1e-9)/100:null,scored,of:cs.length,fails,per};}
const weightSum=rid=>round2(critsOf(rid).reduce((s,c)=>s+c.weight,0));
function blindState(r){const revs=reviewersOf(r.id),set=scoredSet(r),cs=critsOf(r.id).filter(c=>c.weight>0||c.mandatory);let missing=0;
 for(const rv of revs)for(const i of set)for(const c of cs)if(!SCORES.some(s=>s.request_id===r.id&&s.reviewer===rv&&s.invitation_id===i.id&&s.criterion_id===c.id))missing++;
 const complete=revs.length>0&&set.length>0&&cs.length>0&&missing===0;
 return {complete,missing,reviewers:revs,hidden:BLIND&&!complete&&!st.reveal[r.id]};}
function qualOf(r,invId){const items=checksOf(r.id,'qualification',invId);return {items,ready:items.length>0&&items.every(c=>c.status==='done'||c.status==='not_applicable'),issues:items.filter(c=>c.status==='issue')};}
const daysTo=d=>AS_OF&&d?diffDays(AS_OF,d):null;
const inDays=d=>{const n=daysTo(d);return n===null?'':n===0?'today':n>0?'in '+plural(n,'day'):plural(-n,'day')+' ago';};

const XS={left:14,error:'',partial:false,pending:false};const xc={};
function xcall(name,v){if(!inp.saved){XS.error='preview';return null;}if(XS.left<=0){XS.partial=true;return null;}XS.left--;
 try{const r=tools.call(name,v);if(r&&r.pending){XS.pending=true;return null;}if(!r||r.unavailable){XS.error=String(r&&r.message||'Exchange data is not available.');return null;}return r;}catch(e){XS.error=String(e&&e.message||e).slice(0,300);return null;}}
function xAll(){if(xc.all)return xc.all;const map={},order=[];let complete=false,offset=0;
 for(let i=0;i<2;i++){const p=xcall('exchange.list',{offset});if(!p)break;for(const g of p.groups||[]){map[g.id]=g;order.push(g.id);}if(p.nextOffset===null||p.nextOffset===undefined){complete=true;break;}offset=p.nextOffset;}
 return xc.all={map,order,complete};}
function xGroup(id){if(!id)return null;const all=xAll();if(all.map[id])return all.map[id];if(all.complete)return null;if(has(xc,'g:'+id))return xc['g:'+id];const p=xcall('exchange.list',{groupId:id});return xc['g:'+id]=p&&p.groups&&p.groups[0]||null;}
const refOf=(r,round)=>'request:'+r.id+':'+(round==='rfi'?'rfi':'rfp');
/* A round is the exchange group with this app's reference for the request; nothing is copied into records. */
function groupOf(r,round){if(!r)return null;const ref=refOf(r,round),all=xAll();for(const id of all.order)if(all.map[id].appRef===ref)return all.map[id];if(all.complete)return null;const k='r:'+ref;if(has(xc,k))return xc[k];const p=xcall('exchange.list',{appRef:ref});return xc[k]=p&&p.groups&&p.groups[0]||null;}
const groupIdOf=(r,round)=>(groupOf(r,round)||{}).id||'';
function exchangeOf(g,invId){if(!g)return null;const xs=(g.exchanges||[]).filter(e=>e.recordId===invId);return xs.filter(e=>!e.revokedAt).pop()||xs.pop()||null;}
function xPaged(name,key,groupId,extra){const k=name+':'+groupId;if(xc[k])return xc[k];const rows=[];let complete=false,offset=0;
 for(let i=0;i<3;i++){const p=xcall(name,{groupId,offset,...(extra||{})});if(!p)break;rows.push(...(p[key]||[]));if(p.nextOffset===null||p.nextOffset===undefined){complete=true;break;}offset=p.nextOffset;}
 return xc[k]={rows,complete};}
const xSubs=gid=>gid?xPaged('exchange.listSubmissions','submissions',gid):{rows:[],complete:true};
const xMsgs=gid=>gid?xPaged('exchange.listMessages','messages',gid,{markRead:false}):{rows:[],complete:true};
function statusChips(e){if(!e)return pill('No link yet','');const s=e.status||{},out=[];
 if(s.revokedAt)out.push(pill('Link stopped','red'));else if(s.closed)out.push(pill('Closed','amber'));
 out.push(pill(s.opened?'Opened':'Not opened',s.opened?'blue':''));
 if(s.verified)out.push(pill('Verified','blue'));if(s.acknowledged)out.push(pill('Confidentiality accepted','blue'));
 for(const d of s.documentsBack||[])out.push(pill(d.label+': '+d.status,d.status==='accepted'?'green':d.status==='received'?'amber':''));
 if((s.downloads||[]).length)out.push(pill(plural(s.downloads.length,'download'),'blue'));
 if(s.draftSavedAt&&!s.submitted)out.push(pill('Draft saved','amber'));
 if(s.submitted)out.push(pill('Submitted (v'+s.submitted.version+', '+stamp(s.submitted.at)+')'+(s.submitted.accepted?' · accepted':''),s.submitted.accepted?'green':'amber'));
 if(s.unreadMessages)out.push(pill(plural(s.unreadMessages,'unread message'),'red'));
 return '<span class="cs-chips">'+out.join('')+'</span>';}

function toReal(role,data){const m=roleMap[role];if(!m)throw Error('The '+ROLE_LABEL[role]+' table is not connected.');const out={};for(const [k,v] of Object.entries(data)){if(v===undefined)continue;if(!m.fields[k])continue;if(!m.writable.includes(k))throw Error('You cannot edit '+k.replace(/_/g,' ')+' in the '+ROLE_LABEL[role]+' table.');out[m.fields[k]]=v;}return out;}
const crt=(role,data)=>{if(!canWrite(role))throw Error('You cannot add a '+ROLE_LABEL[role]+' here.');return {kind:'create_record',typeId:roleMap[role].typeId,data:toReal(role,data)};};
const upd=(role,row,data,version)=>{if(!row)throw Error('That '+ROLE_LABEL[role]+' is no longer available.');if(!canWrite(role))throw Error('You cannot change this '+ROLE_LABEL[role]+'.');return {kind:'update_record',recordId:row.id,expectedVersion:version===undefined||version===null?row.version:version,data:toReal(role,data)};};
/* P5, G5 (3.0.0): record edits save directly (records.save, at most 50 changes per action) from a person's own click, change or submit,
 * or from an app command with a request key; the version captured when editing started is sent as expectedVersion. Record changes made
 * by the same click as an exchange operation that reaches suppliers travel with that operation's one confirmation. */
let PROPOSED=0,SAVED=0;
function joinRecords(changes){changes=changes.filter(Boolean);if(!changes.length)return 0;if(changes.length>50)throw Error('Too many record changes for one action.');tools.call('records.save',{changes});PROPOSED+=changes.length;return changes.length;}
function propose(changes,message){changes=changes.filter(Boolean);if(!changes.length)throw Error('There is nothing to save.');if(changes.length>50)throw Error('This change needs '+changes.length+' record writes; one action holds 50. Save it in smaller parts.');tools.call('records.save',{changes});PROPOSED+=changes.length;SAVED+=changes.length;note(message||'Saved.');}
function xwrite(name,payload,message,saved){if(event.kind==='command')throw Error('Supplier communication (rounds, links, documents, emails, replies, clarifications, acceptances, extensions and stopped links) is done by a person in the app. App commands cannot do it; open '+(ROUND_SCREEN[name]||'the app')+' instead.');if(!inp.saved)throw Error('Save the app to use external exchanges.');if(!inp.writable||cfg.readOnly===true)throw Error('You cannot change exchanges in this app.');if(!isAct)throw Error('Exchange changes need an explicit click.');
 const r=tools.call(name,payload);if(r&&r.status==='saved'){note(saved||'Saved.');return r;}if(!r||r.status!=='review_required')throw Error(String(r&&r.message||'The exchange change could not be prepared.'));note(message||'Confirm it in the TrialAgents review: nothing reaches suppliers before that.','info');return r;}
const ROUND_SCREEN={'exchange.replyAll':'Decision → Notify all','exchange.acceptSubmission':'Proposals','exchange.acceptFile':'Proposals or Vendors','exchange.reply':'Messages','exchange.publishClarification':'Messages','exchange.sendEmail':'Vendors → Email','exchange.invite':'Vendors','exchange.createGroup':'Requests or Vendors'};
const textOf=(v,max)=>String(v===null||v===undefined?'':v).trim().slice(0,max||300);
function valuesFromForm(role,source,mode){
 const out={};const m=roleMap[role];
 for(const f of fieldsOf(role)){
  if(f.kind==='frozen'||f.kind==='readonly'||f.key==='archived')continue;
  if(!m||!m.fields[f.key]||!m.writable.includes(f.key))continue;
  if(f.kind==='assumptions'){if(!has(source,'assume_notes')&&!has(source,'assume_baseline'))continue;out.assumptions=JSON.stringify({notes:textOf(source.assume_notes,6000),baseline:baselineFromText(source.assume_baseline)});continue;}
  if(!has(source,f.key)){if(mode==='create'&&f.required)throw Error('Required field: '+f.label+'.');continue;}
  let v=source[f.key];if(typeof v==='string')v=v.trim();
  if(v===''||v===null){if(f.required)throw Error('Required field: '+f.label+'.');out[f.key]=null;continue;}
  if(f.kind==='number'){const n=Number(v);if(!Number.isFinite(n))throw Error('Enter a number for '+f.label+'.');if(n<0&&!f.extra)throw Error(f.label+' cannot be negative.');out[f.key]=n;}
  else if(f.kind==='date'){const d=validDate(v);if(!d)throw Error('Use a valid date for '+f.label+' (YYYY-MM-DD).');out[f.key]=d;}
  else if(f.kind==='select'){if(!f.options.includes(String(v)))throw Error('Choose a valid '+f.label.toLowerCase()+'.');out[f.key]=String(v);}
  else if(f.kind==='boolean')out[f.key]=bool(v);
  else if(f.kind==='emails'){const l=emailsOf(v);if(!l.length||l.length>5||!l.every(emailOk))throw Error('Enter 1 to 5 valid email addresses, separated by commas.');out[f.key]=l.join(', ');}
  else if(f.kind==='ref'){const kept=st.editor&&st.editor.refs&&st.editor.refs[f.key]===String(v);if(!kept&&!R[f.ref].rows.some(r=>r.id===v))throw Error('Choose an existing '+f.label.toLowerCase()+'.');out[f.key]=String(v);}
  else if(f.kind==='lines')out[f.key]=lines(v).map(x=>x.slice(0,400)).join('\n')||null;
  else out[f.key]=String(v).slice(0,f.kind==='longtext'?20000:300);
 }
 if(role==='requests'&&mode==='create'){const svc=out.service_type||'other',md=out.mode||'full_selection';if(m.fields.questions&&!out.questions)out.questions=builtinQuestions(md==='quick_quote'?'quote':'rfp',svc).join('\n');if(m.fields.rfi_questions&&!out.rfi_questions&&md==='full_selection')out.rfi_questions=builtinQuestions('rfi',svc).join('\n');if(m.fields.cost_categories&&!out.cost_categories)out.cost_categories=builtinCategories(svc).join('\n');}
 if(role==='requests'){const rd=has(out,'response_deadline')?out.response_deadline:validDate(source.response_deadline),qd=has(out,'question_deadline')?out.question_deadline:validDate(source.question_deadline);
  if(mode==='create'&&rd&&!qd&&m.fields.question_deadline)out.question_deadline=addDays(rd,-QDAYS);
  if(rd&&qd&&qd>rd)throw Error('The question deadline is after the response deadline.');
  if((has(out,'cda_gate')?out.cda_gate:bool(source.cda_gate))&&(has(out,'cda_option')?out.cda_option:source.cda_option)!=='send_pdf')throw Error('The CDA gate needs the option "Send PDF, receive the signed PDF".');}
 if(role==='criteria'&&out.weight!==undefined&&out.weight!==null&&out.weight>100)throw Error('A weight is a percentage from 0 to 100.');
 if(role==='proposals'&&out.version!==undefined&&out.version!==null&&(!Number.isInteger(out.version)||out.version<1))throw Error('The version is a whole number from 1.');
 if(role==='settings'&&out.question_deadline_days!==undefined&&out.question_deadline_days!==null&&(!Number.isInteger(out.question_deadline_days)||out.question_deadline_days>60))throw Error('The question deadline default is a whole number of days from 0 to 60.');
 if(mode==='create'&&m&&m.fields.archived&&m.writable.includes('archived'))out.archived=false;
 return out;}
const linesFromText=v=>String(v||'').split('\n').map(x=>x.trim()).filter(Boolean).slice(0,60);
function baselineFromText(v){return linesFromText(v).map(l=>{const i=l.lastIndexOf('|');if(i<1)throw Error('Baseline lines read "Category | amount": '+l.slice(0,60));const a=Number(l.slice(i+1).replace(/[,\s]/g,''));if(!Number.isFinite(a)||a<0)throw Error('Enter a positive amount for '+l.slice(0,i).trim()+'.');return {category:l.slice(0,i).trim().slice(0,120),amount:a};});}
function openEditor(role,mode,id,preset){
 closeAll();let draft={...(preset||{})},version=null;
 if(mode!=='create'){const r=lookup(role,id);if(!r)throw Error('That record is no longer available.');draft={...r.data};version=r.version;}
 if(role==='requests'){const a=parseJSON(draft.assumptions)||{};draft.assume_notes=String(a.notes||'');draft.assume_baseline=(Array.isArray(a.baseline)?a.baseline:[]).map(b=>String(b.category||'')+' | '+String(b.amount===null||b.amount===undefined?'':b.amount)).join('\n');delete draft.assumptions;}
 for(const f of S[role])if(f.kind==='frozen'&&!(preset&&has(preset,f.key)))delete draft[f.key];
 for(const f of fieldsOf(role))if(f.kind==='readonly'&&mode==='create')delete draft[f.key];
 if(mode==='create'&&FORM_GROUP[role])for(const f of S[role]){const v=LP.defaults[FORM_GROUP[role]+':'+f.key];if(v!==undefined&&(draft[f.key]===undefined||draft[f.key]===''||draft[f.key]===null))draft[f.key]=f.kind==='boolean'?bool(v):String(v);}
 const refs={};for(const f of S[role])if(f.kind==='ref'&&draft[f.key])refs[f.key]=String(draft[f.key]);
 st.editor={role,mode,id:mode==='edit'?id:null,version,draft,initial:JSON.stringify(draft),refs,fixed:preset&&mode==='create'?Object.fromEntries(S[role].filter(f=>f.kind==='frozen'&&has(preset,f.key)).map(f=>[f.key,preset[f.key]])):{}};
}
function closeAll(){st.editor=null;st.panel=null;st.menu=null;}
function questionsFor(r,round){const own=lines(round==='rfi'?r.rfi_questions:r.questions);return own.length?own:builtinQuestions(round==='rfi'?'rfi':roundOf(r),r.service_type);}
function briefFor(r,round){const qs=questionsFor(r,round),a=r.assume,L=[String(r.scope||'').trim()];
 if(round!=='rfi'){if(a.notes)L.push('','Our assumptions','',String(a.notes).trim());const cats=gridOf(r,[]).cats;
  if(cats.length)L.push('','Bid grid','','Please price each cost category and list them in your proposal file: '+cats.join('; ')+'.');}
 if(qs.length)L.push('','Questions','',...qs.map((q,i)=>(i+1)+'. '+q),'','Please answer each question by its number in the Answers field.');
 return L.join('\n').slice(0,20000);}
const FORM_FIELDS={rfi:['answers','notes'],rfp:['total','pass_through','currency','start_weeks','duration_months','answers','assumptions_delta','notes'],quote:['total','currency','start_weeks','duration_months','answers','notes']};
const FORM_HELP={total:'Your total price for the scope, including pass-through costs.',pass_through:'The part of the total that is pass-through cost.',currency:'The currency of your prices.',start_weeks:'Weeks from award to the start of the work.',duration_months:'Duration of the work in months.',answers:'Answer each numbered question from the brief.',assumptions_delta:'List every point where your price departs from our assumptions.',notes:'Anything else we should know.'};
function roundConfig(r,round,d,docs){const fround=round==='rfi'?'rfi':roundOf(r),m=roleMap.proposals;if(!m)throw Error('The proposal table is not connected.');
 const fields=FORM_FIELDS[fround].filter(k=>m.fields[k]);const reqd=fround==='rfi'?['answers']:['total','currency'];
 const title=textOf(d.title,160);if(!title)throw Error('Give the round a title.');
 const cda=round!=='rfi'&&r.cda_option==='send_pdf',cdaDoc=cda?String(d.cda_document||''):'';
 if(cda&&bool(r.cda_gate)&&!uuid(cdaDoc))throw Error('Choose the CDA document to sign: the gate locks the request pack until the signed CDA is accepted.');
 const documents=[...new Set(docs.filter(uuid).concat(uuid(cdaDoc)?[cdaDoc]:[]))];
 const gate=cda&&bool(r.cda_gate)?'signed_document':documents.length||round!=='rfi'?'acknowledgement':'none';
 const dates=[];if(round!=='rfi'&&r.question_deadline)dates.push({label:'Questions by',date:r.question_deadline});if(r.decision_due&&round!=='rfi')dates.push({label:'Decision expected',date:r.decision_due});
 return {title,appRef:refOf(r,round),summary:textOf(d.summary,20000),dates,documents,...(uuid(cdaDoc)?{gateDocument:cdaDoc}:{}),typeId:m.typeId,fields:fields.map(k=>m.fields[k]),questions:fields.map(k=>({field:m.fields[k],required:reqd.includes(k),help:FORM_HELP[k]||''})),maxFiles:10,
  slots:cda?[{key:'signed_cda',label:'Signed CDA',required:true}]:[],gate,...(gate==='signed_document'?{gateSlot:'signed_cda'}:{}),...(gate==='none'?{}:{gateText:CONFIDENTIALITY.slice(0,5000)}),verifyEmail:d.verify_email===undefined?true:bool(d.verify_email),messagesAfterDeadline:true,emailDefaults:emailDefaultsFor(kindOf(r,round))};}
const daysUntil=d=>{const n=daysTo(d);return n===null?null:Math.min(90,Math.max(1,n+1));};
function acceptData(sub,inv,r,d){const m=roleMap.proposals,round=inv&&groupIdOf(r,'rfi')===sub.groupId&&r.mode!=='quick_quote'?'rfi':roundOf(r),out={};
 const n=(k,lab)=>{const v=d[k];if(v===''||v===null||v===undefined)return;const x=Number(String(v).replace(/[,\s]/g,''));if(!Number.isFinite(x)||x<0)throw Error('Enter a positive number for '+lab+'.');out[k]=x;};
 n('total','the total');n('pass_through','the pass-through costs');n('start_weeks','the weeks to start');n('duration_months','the duration');
 for(const k of ['answers','assumptions_delta','notes']){const v=textOf(d[k],20000);if(v)out[k]=v;}
 const cur=CURRENCIES.includes(d.currency)?d.currency:r.currency;if(round!=='rfi'&&out.total===undefined)throw Error('A proposal needs its total price.');
 if(out.pass_through!==undefined&&out.total!==undefined&&out.pass_through>out.total)throw Error('Pass-through costs are part of the total and cannot exceed it.');
 Object.assign(out,{invitation_id:inv.id,round,version:Number(sub.version)||1,submitted_on:validDate(sub.submittedAt)||AS_OF,source:'exchange',currency:cur,accepted_on:AS_OF||validDate(sub.submittedAt)});
 const real={};for(const [k,v] of Object.entries(out))if(m.fields[k])real[m.fields[k]]=v;return real;}
/* 2.1.0: Runway 2.2.0 reads croselection.awards itself (Plan → From other sources → Add to plan, with source tracking), so the handoff no
 * longer prepares Runway spend lines: a line proposed from here would bypass Runway's source tracking and could be counted twice. */
function handoffPlan(r,aw){const start=aw.start_date||'';
 const org=orgName(aw.organization_id),miles=[];
 const fn={clinical_study:'clinical',cmc:'cmc',preclinical_study:'nonclinical',bioanalytical:'nonclinical'}[r.service_type]||'other';
 if(start){miles.push({name:'Contract signed: '+org,date:addDays(start,-14),key:false,function:fn},{name:'Kick-off: '+String(r.name||''),date:start,key:true,function:fn});if(r.service_type==='clinical_study')miles.push({name:'First site initiated: '+String(r.name||''),date:addDays(start,90),key:true,function:fn});}
 return {miles};}

const need=()=>{if(!req)throw Error('Choose a request first.');return req;};
const groupNeed=round=>{if(!inp.saved)throw Error('Save the app to use external exchanges.');const g=groupOf(need(),round);if(!g)throw Error(XS.error&&XS.error!=='preview'?XS.error:'This round has no exchange group yet.');return g;};
const exNeed=id=>{const all=xAll();for(const gid of all.order){const e=(all.map[gid].exchanges||[]).find(x=>x.id===id);if(e)return {e,g:all.map[gid]};}for(const rd of ['rfp','rfi']){const g=groupOf(req,rd),e=g&&(g.exchanges||[]).find(x=>x.id===id);if(e)return {e,g};}throw Error('That supplier link is no longer available.');};
const selected=(prefix,src)=>Object.keys(src).filter(k=>k.startsWith(prefix)&&bool(src[k])).map(k=>k.slice(prefix.length));
/* G5 (3.0.0): a value edited where it is shown (kit.cell) saves at once, with the version shown when editing started and the same checks as
 * the form. Values that change a journey (stages, statuses set by a decision) keep their own actions. */
const INLINE={requests:['budget_estimate','question_deadline','response_deadline','decision_due','owner'],organizations:['name','org_type','country'],criteria:['weight','mandatory'],checklist:['status','owner','due'],lines:['amount'],awards:['start_date']};
function inlineEdit(a,value){const m=/^edit:([^:]+):([a-z][a-z0-9_]*):(\d+)$/.exec(a);if(!m)throw Error('That value cannot be edited here.');
 const id=m[1],key=m[2],version=Number(m[3]),role=Object.keys(INLINE).find(r=>lookup(r,id));if(!role||!INLINE[role].includes(key))throw Error('That value is edited in its form.');
 const row=lookup(role,id),f=fieldsOf(role).find(x=>x.key===key);if(f&&f.required&&(value===''||value===null||value===undefined))throw Error('Required field: '+f.label+'.');
 const out=valuesFromForm(role,{[key]:typeof value==='boolean'?value:value===null||value===undefined?'':String(value)},'edit');if(!has(out,key))throw Error('You cannot edit '+key.replace(/_/g,' ')+' here.');
 if(role==='requests'){const x={...REQ[id],[key]:out[key]};if(x.question_deadline&&x.response_deadline&&x.question_deadline>x.response_deadline)throw Error('The question deadline is after the response deadline.');}
 if(role==='criteria'&&key==='weight'&&out.weight!==null&&out.weight>100)throw Error('A weight is a percentage from 0 to 100.');
 if((row.data[key]===undefined?null:row.data[key])===out[key])return;
 propose([upd(role,row,{[key]:out[key]},version)],'Saved.');}
/* Drag and drop on Overview (kit.board): a request moves to another stage of its journey, with the same rules as the stage buttons. */
function moveStage(id,s){const r=REQ[id];if(!r)throw Error('That request is no longer available.');if(r.stage===s)return;if(!stagesOf(r.mode).includes(s))throw Error(MODE_LABEL[r.mode]+' has no '+STAGE_LABEL[s]+' stage.');
 propose([upd('requests',lookup('requests',r.id),{stage:s})],'"'+String(r.name||'Request')+'" moved to "'+STAGE_LABEL[s]+'".');}
/* One handler for clicks, form submits and app commands (2.1.0): a command replays the same events, so its proposal is identical. */
function handle(event){const action=String(event.action||''),form=event.form&&typeof event.form==='object'?event.form:{},isAct=event.kind==='click'||event.kind==='submit';
 if(action.startsWith('f:')&&event.kind==='change'){const p=action.split(':');draftOf(p[1])[p.slice(2).join(':')]=typeof event.value==='boolean'?event.value:String(event.value===null||event.value===undefined?'':event.value).slice(0,20000);}
 else if(action.startsWith('draft:')&&event.kind==='change'&&st.editor){st.editor.draft[action.slice(6)]=typeof event.value==='boolean'?event.value:String(event.value===null||event.value===undefined?'':event.value);}
 else if(action.startsWith('nav:')){const id=action.slice(4);if(SCREENS.some(s=>s.id===id)){st.section=id;st.page=0;st.query='';st.filters={};closeAll();note('');}}
 else if(action==='clear-notice')note('');
 else if(action==='close')closeAll();
 else if(action==='query'&&event.kind==='change'){st.query=String(event.value||'').slice(0,100);st.page=0;}
 else if(action.startsWith('filter:')&&event.kind==='change'){st.filters[action.slice(7)]=String(event.value||'');st.page=0;}
 else if(action==='next-page')st.page++;else if(action==='prev-page')st.page=Math.max(0,st.page-1);
 else if(action==='pick-request'&&event.kind==='change'){if(REQ[event.value]){st.requestId=String(event.value);st.thread='';st.batch=null;st.panel=null;st.page=0;}}
 else if(action.startsWith('open-request:')){const p=action.split(':');if(REQ[p[1]]){st.requestId=p[1];st.section=SCREENS.some(s=>s.id===p[2])?p[2]:'requests';st.thread='';st.batch=null;closeAll();st.page=0;}}
 else if(action.startsWith('round:')){st.round=action.slice(6)==='rfi'?'rfi':'rfp';st.thread='';st.batch=null;}
 else if(action.startsWith('panel:')){const p=action.split(':');closeAll();st.panel={type:p[1],id:p.slice(2).join(':')};
  if(p[1]==='decide'){const r=need();st.panel.versions=Object.fromEntries([[r.id,r.version]].concat(invsOf(r.id).map(i=>[i.id,i.version])));}
  if(p[1]==='card'){const r=need(),rv=textOf(draftOf('card').reviewer,80);if(!rv)throw Error('Enter the reviewer name first.');st.panel.reviewer=rv;st.panel.versions=Object.fromEntries(SCORES.filter(s=>s.request_id===r.id&&s.reviewer===rv).map(s=>[s.id,s.version]));st.f.scores={};}
  if(p[1]==='accept'){st.f.accept={};const r=need();st.panel.versions=Object.fromEntries([[r.id,r.version]].concat(invsOf(r.id).map(i=>[i.id,i.version])));}
  if(p[1]==='supplier'&&inp.saved){const i=INV[p[2]];for(const rd of ['rfp','rfi']){const e=i&&exchangeOf(groupOf(REQ[i.request_id],rd),i.id);if(e){const s=xcall('exchange.status',{exchangeId:e.id});if(s&&s.status)e.status=s.status;}}}}
  else if(action.startsWith('add:')){const p=action.split(':'),role=p[1],a=p[2]||'';
  openEditor(role,'create',null,role==='requests'?{mode:a==='quick_quote'?'quick_quote':'full_selection',service_type:'clinical_study',currency:CURRENCY,cda_option:'none',stage:'need'}:role==='organizations'?{org_type:'cro'}:role==='people'?{organization_id:a}:role==='criteria'?{request_id:need().id,category:'operational'}:role==='checklist'?{request_id:need().id,scope:CHECK_SCOPES.includes(a)?a:'qualification',invitation_id:p[3]||'',status:'open'}:role==='proposals'?{invitation_id:a,round:roundOf(need()),version:1,submitted_on:AS_OF,source:'manual',accepted_on:AS_OF,currency:need().currency}:role==='lines'?{proposal_id:a,currency:(PROP[a]&&PROP[a].currency)||need().currency,category:p.slice(3).join(':')}:{});}
 else if(action.startsWith('edit:')&&event.kind==='change')inlineEdit(action,event.value);
 else if(action.startsWith('open-editor:')){const [,role,id]=action.split(':');openEditor(role,'edit',id);}
 else if(event.kind==='change'&&(action==='move-stage'||action.startsWith('move-stage-menu:'))){const mv=kit.move(event,'move-stage');if(mv)moveStage(mv.cardId,mv.columnId);}
 else if(action.startsWith('page:')){st.page=Math.max(0,Math.floor((Number(action.slice(5))||0)/10));}
 else if(action.startsWith('archive:')){const [,role,id]=action.split(':');const r=lookup(role,id);if(role==='requests'&&r&&(groupIdOf(REQ[id],'rfi')||groupIdOf(REQ[id],'rfp')))throw Error('This request has supplier links. Close the request instead; archiving the app stops every link.');if(!r)throw Error('That '+ROLE_LABEL[role]+' is no longer available.');if(!canWrite(role))throw Error('You cannot archive this '+ROLE_LABEL[role]+'.');propose([{kind:'archive_record',recordId:r.id,expectedVersion:r.version}],'Archived. The record stays in the database.');closeAll();}
 else if(action==='save-record'&&event.kind==='submit'){const x=st.editor;if(!x)throw Error('The form is no longer open.');
  x.draft={...x.draft,...form};const role=x.role;
  const values={...valuesFromForm(role,x.draft,x.mode),...(x.mode==='create'?x.fixed:{})};
  if(role==='invitations'&&x.mode==='create'){if(invsOf(values.request_id).some(i=>i.organization_id===values.organization_id))throw Error('That supplier is already on the list of this request.');}
  if(role==='people'&&values.email&&!emailOk(String(values.email).toLowerCase()))throw Error('Enter a valid email address.');
  if(x.mode==='edit'){const before=JSON.parse(x.initial),data={};for(const [k,v] of Object.entries(values)){const b=k==='assumptions'?(parseJSON(lookup(role,x.id).data[k])?JSON.stringify(parseJSON(lookup(role,x.id).data[k])):lookup(role,x.id).data[k]):before[k];if((b===undefined||b===''?null:b)!==v&&String(b)!==String(v))data[k]=v;}
   if(!Object.keys(data).length)throw Error('Nothing changed.');propose([upd(role,lookup(role,x.id),data,x.version)]);}
  else propose([crt(role,values)]);st.editor=null;}
  else if(action.startsWith('stage:')){const r=need(),s=action.slice(6);if(!stagesOf(r.mode).includes(s))throw Error('That stage is not part of this request.');
  if(s==='closed'&&!awardOf(r.id)&&!bool(form.confirm_close)&&draftOf('close').confirm!==true)throw Error('This request has no award. Tick "Close without an award" to close it.');
  propose([upd('requests',lookup('requests',r.id),{stage:s})],'Moved to "'+STAGE_LABEL[s]+'".');}
  else if(action==='create-round'&&event.kind==='submit'){const r=need(),round=st.panel&&st.panel.id==='rfi'?'rfi':'rfp',d={...draftOf('round'),...form};
  if(groupIdOf(r,round))throw Error('This request already has that round.');if(round==='rfi'&&r.mode==='quick_quote')throw Error('A quick quote has no RFI round.');
  const conf=roundConfig(r,round,d,selected('doc_',d));xwrite('exchange.createGroup',conf,'Confirm the round in the review.','Round created. Nothing was sent. Next: create the supplier links.');
  st.panel=null;st.f.round={};}
 else if(action==='share-docs'&&event.kind==='submit'){const g=groupNeed(st.round),d={...draftOf('share'),...form},add=selected('doc_',d).filter(uuid).filter(v=>!(g.documents||[]).some(x=>x.versionId===v));if(!add.length)throw Error('Choose at least one document that is not shared yet.');
  xwrite('exchange.shareDocuments',{groupId:g.id,expectedVersion:g.version,add},'Confirm sharing '+plural(add.length,'document')+' with every supplier of this round in the review.','Shared with the round. Suppliers see it once they are invited.');st.f.share={};}
 else if(action.startsWith('unshare:')){const g=groupNeed(st.round);xwrite('exchange.shareDocuments',{groupId:g.id,expectedVersion:g.version,remove:[action.slice(8)]},'Confirm removing the document from this round in the review.');}
 else if(action==='request-cda'){const g=groupNeed('rfp');xwrite('exchange.requestDocument',{groupId:g.id,expectedVersion:g.version,slot:{key:'signed_cda',label:'Signed CDA',required:true}},'Confirm the request for a signed CDA from every supplier in the review.');}
 else if(action==='save-brief'&&event.kind==='submit'){const g=groupNeed(st.round),d={...draftOf('brief'),...form},title=textOf(d.title,160);if(!title)throw Error('The round needs a title.');
  xwrite('exchange.updateBrief',{groupId:g.id,expectedVersion:g.version,brief:{title,summary:textOf(d.summary,20000)}},'Brief updated for every supplier of this round.');st.f.brief={};st.panel=null;}
 else if(action.startsWith('document:uploaded:')&&event.kind==='change'){const ctx=action.slice(18),v=String(event.value||'');if(!uuid(v))throw Error('The upload did not return a document.');
  if(ctx.startsWith('rfp_pack')){const target=req&&groupIdOf(req,st.round)?'share':'round';draftOf(target)['doc_'+v]=true;st.uploaded=(st.uploaded||[]).concat([v]).slice(-20);note(target==='share'?'Uploaded. It is ticked below: share it with the round.':'Uploaded and ticked for the request pack.');}
  else if(ctx.startsWith('cda')){draftOf('round').cda_document=v;st.uploaded=(st.uploaded||[]).concat([v]).slice(-20);note('Uploaded and chosen as the CDA to sign.');}
  else if(ctx.startsWith('evidence:')){st.attach={checkId:ctx.slice(9),versionId:v};note('Uploaded. Attach it to the checklist item.');}}
 else if(action==='attach-evidence'){const a=st.attach;if(!a)throw Error('There is no uploaded document to attach.');propose([upd('checklist',lookup('checklist',a.checkId),{evidence_document_id:a.versionId})],'Evidence document attached.');st.attach=null;}
 else if(action==='drop-attach')st.attach=null;
  else if(action==='longlist-add'&&event.kind==='submit'){const r=need(),d={...draftOf('longlist'),...form},org=String(d.organization_id||'');if(!R.organizations.rows.some(o=>o.id===org))throw Error('Choose a vendor from the directory.');
  if(invsOf(r.id).some(i=>i.organization_id===org))throw Error('That vendor is already on the list of this request.');
  const contacts=R.people.rows.filter(p=>p.data.organization_id===org&&emailOk(String(p.data.email||'').toLowerCase()));const emails=emailsOf(d.recipient_emails).length?emailsOf(d.recipient_emails):contacts.map(p=>String(p.data.email).toLowerCase()).slice(0,5);
  if(!emails.length||emails.length>5||!emails.every(emailOk))throw Error('Enter 1 to 5 valid recipient emails, or add a contact with an email to this vendor.');
  const changes=[crt('invitations',{request_id:r.id,organization_id:org,contact_ids:contacts.filter(p=>emails.includes(String(p.data.email).toLowerCase())).map(p=>p.id).join(', ')||null,recipient_emails:emails.join(', '),status:'longlist',cda_status:r.cda_option==='none'?'not_needed':null})];
  if(r.stage==='need')changes.push(upd('requests',lookup('requests',r.id),{stage:'longlist'}));propose(changes,'Added to the list.');st.f.longlist={};}
 else if(action.startsWith('inv-status:')){const [,id,s]=action.split(':');if(!INV_STATUS.includes(s))throw Error('Unknown status.');if(s==='selected')throw Error('A supplier is selected by recording the decision.');propose([upd('invitations',lookup('invitations',id),{status:s})],'Status set to "'+INV_LABEL[s]+'".');}
 else if(action==='invite'&&event.kind==='submit'){const r=need(),g=groupNeed(st.round),d={...draftOf('invite'),...form},ids=selected('inv_',d);if(!ids.length)throw Error('Tick at least one supplier to invite.');
  const days=Math.round(num(d.days,daysUntil(r.response_deadline)||14));if(!(days>=1&&days<=90))throw Error('The deadline is 1 to 90 days away.');
  const recipients=ids.map(id=>{const i=INV[id];if(!i||i.request_id!==r.id)throw Error('That supplier is not on this request.');if(exchangeOf(g,i.id)&&!exchangeOf(g,i.id).revokedAt)throw Error(orgName(i.organization_id)+' already has a link in this round.');
   if(!i.emails.length||i.emails.length>5||!i.emails.every(emailOk))throw Error(orgName(i.organization_id)+' needs 1 to 5 valid recipient emails.');
   const c=list(i.contact_ids).map(pid=>lookup('people',pid)).find(Boolean);return {emails:i.emails,name:textOf(c&&c.data.name,120),company:textOf(orgName(i.organization_id),160),recordId:i.id};});
  xwrite('exchange.invite',{groupId:g.id,recipients,days},'Confirm the '+plural(recipients.length,'supplier link')+' in the review.',plural(recipients.length,'private link')+' created. Nothing was sent: prepare the invitation email next.');st.f.invite={};}
 else if(action==='prepare-email'&&event.kind==='submit'){const g=groupNeed(st.round),d={...draftOf('mail'),...form},type=EMAIL_TYPES.includes(d.email_type)?d.email_type:'invitation';
  const ids=selected('to_',d).filter(uuid);if(!ids.length)throw Error('Tick at least one supplier.');
  const overrides={};for(const id of ids){const b=textOf(d['pers_'+id],10000);if(b)overrides[id]={body:b};}
  const payload={groupId:g.id,emailType:type,exchangeIds:ids,overrides};const sub=textOf(d.subject,200),body=textOf(d.body,10000);if(sub)payload.subject=sub;if(body)payload.body=body;
  if(['organization','person','custom'].includes(d.name_kind))payload.nameKind=d.name_kind;if(d.name_kind==='custom'){const c=textOf(d.custom_name,80);if(!c)throw Error('Enter the display name.');payload.customName=c;}
  if(type==='reminder'&&validDate(d.schedule_on))payload.scheduleAt=validDate(d.schedule_on)+'T08:00:00.000Z';
  if(!inp.saved)throw Error('Save the app to prepare emails.');const b=tools.call('exchange.prepareEmail',payload);if(!b||!b.batchId)throw Error('The email could not be prepared.');
  const xs=(g.exchanges||[]).filter(e=>ids.includes(e.id)),vers={};for(const e of xs){const i=INV[e.recordId];if(i)vers[i.id]=i.version;}vers[need().id]=need().version;
  st.batch={versions:vers,round:st.round,batchId:b.batchId,digest:b.digest,groupId:g.id,from:b.from,replyTo:b.replyTo,emailType:b.emailType,scheduledAt:b.scheduledAt||null,defaultSource:b.defaultSource,recipients:(b.recipients||[]).map(x=>({exchangeId:x.exchangeId,to:x.to,recipientName:x.recipientName,subject:x.subject,text:x.text,personalised:!!x.personalised})),fixed:b.fixed||''};note('');}
 else if(action==='send-email'){const b=st.batch,r=need();if(!b)throw Error('Prepare the email first.');
  xwrite('exchange.sendEmail',{batchId:b.batchId,digest:b.digest},b.scheduledAt?'Confirm the reminder in the review. It is sent at the scheduled time with exactly this text.':'Confirm the send in the review: '+plural(b.recipients.length,'email')+', exactly as shown, with the suppliers\' status.');
  // The invited status (and the request's stage) change in the same review as the send.
  if(b.emailType==='invitation'&&!b.scheduledAt){const g=groupOf(r,b.round),ch=[];for(const [iid,ver] of Object.entries(b.versions||{})){const i=INV[iid];if(!i)continue;const data={};
    if(b.round==='rfi'&&i.status==='longlist')data.status='rfi_invited';if(b.round!=='rfi'&&['longlist','shortlisted','rfi_invited'].includes(i.status))data.status='rfp_invited';
    if(b.round!=='rfi'&&r.cda_option==='send_pdf'&&!i.cda_status&&g&&(g.slots||[]).length)data.cda_status='sent';if(Object.keys(data).length)ch.push(upd('invitations',lookup('invitations',iid),data,ver));}
   const want=b.round==='rfi'?'rfi':'rfp';if(STAGES.indexOf(r.stage)<STAGES.indexOf(want))ch.push(upd('requests',lookup('requests',r.id),{stage:want},has(b.versions||{},r.id)?b.versions[r.id]:r.version));joinRecords(ch);}
  st.batch={...b,requested:true};}
 else if(action==='discard-batch')st.batch=null;
 else if(action.startsWith('extend:')&&event.kind==='submit'){const {e}=exNeed(action.slice(7)),days=Math.round(num(form.days,7));if(!(days>=1&&days<=90))throw Error('Extend by 1 to 90 days.');xwrite('exchange.extend',{exchangeId:e.id,days,notify:bool(form.notify)},'Confirm the deadline extension in the review.');}
 else if(action.startsWith('revoke:')&&event.kind==='submit'){const {e}=exNeed(action.slice(7)),reason=textOf(form.reason,1000);if(!reason)throw Error('Give a reason for stopping the link.');xwrite('exchange.revoke',{exchangeId:e.id,reason,notify:bool(form.notify)},'Confirm stopping the link in the review. Everything already received is kept.');}
 else if(action.startsWith('accept-file:')){const [,fid,iid]=action.split(':');xwrite('exchange.acceptFile',{fileId:fid,ai:bool(form.ai)||draftOf('files')['ai_'+fid]===true},'Confirm accepting the file in the review. It then becomes a TrialAgents document.');
  if(iid&&INV[iid]&&INV[iid].cda_status!=='signed')joinRecords([upd('invitations',lookup('invitations',iid),{cda_status:'signed'})]);}
  else if(action.startsWith('cda-elsewhere:')&&event.kind==='submit'){const i=lookup('invitations',action.slice(14)),d=validDate(form.cda_in_place_on);propose([upd('invitations',i,{cda_status:'in_place_elsewhere',cda_in_place_on:d||null})],'CDA recorded as in place elsewhere.');}
 else if(action.startsWith('cda-file:')){const i=INV[action.slice(9)];if(!i)throw Error('That supplier is no longer on the list.');const r=REQ[i.request_id],name=cdaName(i,r);
  const existing=R.agreements.rows.find(a=>a.data.name===name&&a.data.counterparty_id===i.organization_id);
  if(existing)propose([upd('invitations',lookup('invitations',i.id),{cda_agreement_id:existing.id,cda_status:'signed'})],'CDA agreement linked to the supplier.');
  else propose([crt('agreements',{name,counterparty_id:i.organization_id,agreement_type:'cda_nda',status:'active',effective_date:AS_OF||null,archived:false})],'CDA agreement filed. Link it to the supplier next.');}
  else if(action.startsWith('thread:')){st.thread=action.slice(7);st.f.reply={};if(inp.saved&&isAct&&uuid(st.thread))xcall('exchange.listMessages',{exchangeId:st.thread});}
 else if(action==='reply'&&event.kind==='submit'){const {e}=exNeed(st.thread),d={...draftOf('reply'),...form},body=textOf(d.body,10000);if(!body)throw Error('Write the reply first.');xwrite('exchange.reply',{exchangeId:e.id,body,notify:d.notify===undefined?true:bool(d.notify)},'Confirm the private reply in the review. Only this supplier will see it.');st.f.reply={};}
 else if(action.startsWith('to-clarification:')){const m=xMsgs(groupIdOf(need(),st.round)).rows.find(x=>x.id===action.slice(17));if(!m)throw Error('That question is no longer available.');st.f.clar={question:String(m.body||'').slice(0,5000),source:m.id,body:''};st.panel={type:'clar',id:''};}
 else if(action==='publish'&&event.kind==='submit'){const g=groupNeed(st.round),d={...draftOf('clar'),...form},body=textOf(d.body,10000),question=textOf(d.question,5000);if(!body)throw Error('Write the answer or addendum first.');
  xwrite('exchange.publishClarification',{groupId:g.id,question,body,...(uuid(d.source)&&question?{sourceMessageId:d.source}:{}),notify:d.notify===undefined?true:bool(d.notify)},'Confirm the clarification in the review. Every supplier of this round will see it'+(question?', shown as "A recipient asked"':'')+'.');st.f.clar={};st.panel=null;}
 else if(action.startsWith('ask:')){const p=action.split(':'),i=INV[p[1]],r=need(),e=i&&exchangeOf(groupOf(r,'rfp'),i.id);if(!e)throw Error('This supplier has no link to write to.');st.section='messages';st.round='rfp';st.thread=e.id;st.f.reply={body:'Regarding "'+p.slice(2).join(':')+'" in your proposal: '};closeAll();}
  else if(action==='accept-submit'&&event.kind==='submit'){const r=need(),sid=st.panel&&st.panel.id,sub=['rfp','rfi'].map(rd=>xSubs(groupIdOf(r,rd)).rows).flat().find(x=>x.id===sid);if(!sub)throw Error('That submission is no longer available.');if(sub.accepted)throw Error('That submission was already accepted.');
  const inv=INV[sub.boundRecordId];if(!inv||inv.request_id!==r.id)throw Error('This submission is not bound to a supplier of this request.');
  const d={...(sub.data||{}),...Object.fromEntries(Object.entries(roleMap.proposals.fields).filter(([,real])=>sub.data&&has(sub.data,real)).map(([k,real])=>[k,sub.data[real]])),...draftOf('accept'),...form};
  const data=acceptData(sub,inv,r,d),vers=(st.panel&&st.panel.versions)||{};
  xwrite('exchange.acceptSubmission',{submissionId:sub.id,data,target:'new'},'Confirm the acceptance in the review. It creates the proposal of '+orgName(inv.organization_id)+' (version '+sub.version+')'+(data[roleMap.proposals.fields.round]!=='rfi'?' and marks it submitted':'')+'.');
  if(data[roleMap.proposals.fields.round]!=='rfi'){const ch=[];if(['rfp_invited','shortlisted','longlist','rfi_invited'].includes(inv.status))ch.push(upd('invitations',lookup('invitations',inv.id),{status:'submitted'},has(vers,inv.id)?vers[inv.id]:inv.version));
   if(STAGES.indexOf(r.stage)<STAGES.indexOf('proposals'))ch.push(upd('requests',lookup('requests',r.id),{stage:'proposals'},has(vers,r.id)?vers[r.id]:r.version));joinRecords(ch);}
  st.panel=null;st.f.accept={};}
  else if(action==='apply-criteria'){const r=need();if(critsOf(r.id).length)throw Error('This request already has criteria.');const t=DEFAULTS.find(x=>x.kind==='criteria_set');
  const cs=(t.content.criteria||[]).filter(c=>c&&c.name);if(!cs.length)throw Error('The criteria set is empty.');propose(cs.map(c=>crt('criteria',{request_id:r.id,name:String(c.name).slice(0,120),category:CRIT_CATS.includes(c.category)?c.category:'operational',weight:num(c.weight,0),mandatory:!!c.mandatory})),plural(cs.length,'criterion')+' added from "'+t.name+'".');}
 else if(action==='save-scores'&&event.kind==='submit'){const r=need(),x=st.panel;if(!x||x.type!=='card')throw Error('The scorecard is no longer open.');const d={...draftOf('scores'),...form},changes=[];
  for(const i of scoredSet(r))for(const c of critsOf(r.id)){const k=i.id+'_'+c.id;if(!has(d,'s_'+k)&&!has(d,'e_'+k))continue;const old=SCORES.find(s=>s.request_id===r.id&&s.reviewer===x.reviewer&&s.invitation_id===i.id&&s.criterion_id===c.id);
   const raw=has(d,'s_'+k)?String(d['s_'+k]):old?String(old.score):'',ev=has(d,'e_'+k)?textOf(d['e_'+k],4000):old?String(old.evidence||''):'';if(raw===''){if(old)throw Error('A saved score cannot be cleared; change it to 1–5.');continue;}
   const sc=Number(raw);if(![1,2,3,4,5].includes(sc))throw Error('Scores are whole numbers from 1 to 5.');
   if(old){const data={};if(old.score!==sc)data.score=sc;if(String(old.evidence||'')!==ev)data.evidence=ev||null;if(Object.keys(data).length)changes.push(upd('scores',lookup('scores',old.id),data,has(x.versions,old.id)?x.versions[old.id]:old.version));}
   else changes.push(crt('scores',{request_id:r.id,invitation_id:i.id,criterion_id:c.id,reviewer:x.reviewer,score:sc,evidence:ev||null}));}
  propose(changes,plural(changes.length,'score')+' by '+x.reviewer+' saved.');st.panel=null;st.f.scores={};}
 else if(action==='reveal'){const r=need();if(!inp.writable)throw Error('Only people who can edit this app reveal prices.');st.reveal[r.id]=true;note('Prices are shown in Evaluation for this session, before scoring is complete.');}
 else if(action==='hide-prices'){delete st.reveal[need().id];}
 else if(action.startsWith('apply-checklist:')){const [,scope,iid]=action.split(':'),r=need();if(!CHECK_SCOPES.includes(scope))throw Error('Unknown checklist.');if(checksOf(r.id,scope,iid||'').length)throw Error('This checklist already has items.');
  const t=DEFAULTS.find(x=>x.kind==='checklist'&&x.content.scope===scope);
  propose((t.content.items||[]).map(it=>crt('checklist',{request_id:r.id,invitation_id:iid||null,scope,item:String(it).slice(0,200),status:'open'})),'Checklist "'+t.name+'" added.');}
 else if(action.startsWith('check:')){const [,id,s]=action.split(':');if(!CHECK_STATUS.includes(s))throw Error('Unknown status.');propose([upd('checklist',lookup('checklist',id),{status:s})],'Checklist item set to "'+label(s)+'".');}
  else if(action==='decide'&&event.kind==='submit'){const r=need(),x=st.panel;if(!x||x.type!=='decide')throw Error('The decision form is no longer open.');const d={...draftOf('decide'),...form};
  if(awardOf(r.id))throw Error('This request already has a decision.');const win=INV[d.invitation_id];if(!win||win.request_id!==r.id||win.status==='declined')throw Error('Choose the selected supplier.');
  const rationale=textOf(d.rationale,6000),approver=textOf(d.approver,120),on=validDate(d.decided_on);if(!rationale)throw Error('Write the rationale for the decision.');if(!approver)throw Error('Name the approver.');if(!on)throw Error('Enter the decision date.');
  const q=qualOf(r,win.id),over=textOf(d.override_reason,1000);if(q.issues.length&&!over)throw Error('Qualification has an open issue for '+orgName(win.organization_id)+' ('+q.issues.map(c=>c.item).join('; ')+'). Resolve it, or give an override reason.');
  const p=latestProposal(win.id,roundOf(r)),t=p?proposalTotals(p,r.currency):null,start=validDate(d.start_date);
  const changes=[crt('awards',{request_id:r.id,organization_id:win.organization_id,service_type:r.service_type,program_id:r.program_id||null,study_id:r.study_id||null,total:t&&t.total!==null?t.total:null,currency:(t&&t.currency)||r.currency,start_date:start||null,duration_months:p&&p.duration_months!==null?p.duration_months:null,rationale:rationale+(q.issues.length?'\n\nQualification override: '+over:''),approver,decided_on:on,delivery_team:textOf(d.delivery_team,2000)||null,onboarding_status:'in_progress'})];
  for(const i of invsOf(r.id)){if(i.id===win.id)changes.push(upd('invitations',lookup('invitations',i.id),{status:'selected'},x.versions[i.id]));else if(!['declined','longlist','not_selected'].includes(i.status))changes.push(upd('invitations',lookup('invitations',i.id),{status:'not_selected'},x.versions[i.id]));}
  if(STAGES.indexOf(r.stage)<STAGES.indexOf('decision'))changes.push(upd('requests',lookup('requests',r.id),{stage:'decision'},x.versions[r.id]));
  const notify=d.notify===undefined?true:bool(d.notify),g=inp.saved&&notify?groupOf(r,'rfp'):null;
  if(g){const after=invsOf(r.id).map(i=>({...i,status:i.id===win.id?'selected':['declined','longlist','not_selected'].includes(i.status)?i.status:'not_selected'}));xwrite('exchange.replyAll',noticePayload(r,g,after,d),'');}
  joinRecords(changes);note(g?'Confirm the decision for '+orgName(win.organization_id)+' and the notices to every supplier in the review.':'Decision saved: '+orgName(win.organization_id)+', approved by '+approver+'. Suppliers are not notified yet.');st.panel=null;st.f.decide={};}
 else if(action==='notify-all'&&event.kind==='submit'){const r=need(),g=groupNeed('rfp');if(!awardOf(r.id))throw Error('Record the decision first.');
  xwrite('exchange.replyAll',noticePayload(r,g,invsOf(r.id),{...draftOf('notify'),...form}),'Confirm the notices in the review: one private message and email per supplier, exactly as shown.');}
 else if(action==='save-award'&&event.kind==='submit'){const r=need(),aw=awardOf(r.id);if(!aw)throw Error('There is no award yet.');const d={...draftOf('award'),...form},data={};
  const team=textOf(d.delivery_team,2000),start=validDate(d.start_date),ag=String(d.agreement_id||'');
  if(has(d,'delivery_team')&&team!==String(aw.delivery_team||''))data.delivery_team=team||null;if(has(d,'start_date')&&start!==aw.start_date)data.start_date=start||null;
  if(has(d,'agreement_id')&&ag!==String(aw.agreement_id||'')){if(ag&&!R.agreements.rows.some(a=>a.id===ag))throw Error('Choose an existing agreement.');data.agreement_id=ag||null;}
  if(!Object.keys(data).length)throw Error('Nothing changed.');propose([upd('awards',lookup('awards',aw.id),data,st.panel&&st.panel.version)],'Award saved.');st.panel=null;st.f.award={};}
 else if(action==='onboarding-status'){const r=need(),aw=awardOf(r.id),items=checksOf(r.id,'onboarding'),done=items.length>0&&items.every(c=>c.status==='done'||c.status==='not_applicable');if(!aw)throw Error('There is no award yet.');
  const changes=[];if((aw.onboarding_status||'in_progress')!==(done?'complete':'in_progress'))changes.push(upd('awards',lookup('awards',aw.id),{onboarding_status:done?'complete':'in_progress'}));
  if(STAGES.indexOf(r.stage)<STAGES.indexOf('onboarding'))changes.push(upd('requests',lookup('requests',r.id),{stage:'onboarding'}));propose(changes,'Onboarding status saved.');}
 else if(action==='prepare-handoff'){const r=need(),aw=awardOf(r.id);if(!aw)throw Error('There is no award yet.');const plan=handoffPlan(r,aw),changes=[],name=awardAgreementName(r,aw);
  const existing=aw.agreement_id?lookup('agreements',aw.agreement_id):R.agreements.rows.find(a=>a.data.name===name&&a.data.counterparty_id===aw.organization_id)||null;
  let agreement=existing?'existing':'not_connected';
  if(!existing&&canWrite('agreements')){changes.push(crt('agreements',{name,counterparty_id:aw.organization_id,agreement_type:r.service_type==='clinical_study'?'msa':'sow_work_order',status:'drafting',archived:false}));agreement='draft_prepared';}
  const data={handoff_status:JSON.stringify({prepared_on:AS_OF,agreement:{state:agreement,name},runway:{state:'read_by_runway',role:'croselection.awards'},programs:{state:plan.miles.length?'prepared':'needs_start_date',program_id:aw.program_id||null,milestones:plan.miles},oversight:{state:'published',role:'croselection.awards'}})};
  if(existing&&!aw.agreement_id)data.agreement_id=existing.id;changes.push(upd('awards',lookup('awards',aw.id),data));
  propose(changes,'Handoff saved: '+(agreement==='draft_prepared'?'a draft agreement for Contracts, ':'')+'milestones for Programs on the award. Runway reads the award itself (Add to plan).');}
 else if(action==='link-agreement'){const r=need(),aw=awardOf(r.id),name=aw&&awardAgreementName(r,aw),a=aw&&R.agreements.rows.find(x=>x.data.name===name&&x.data.counterparty_id===aw.organization_id);if(!a)throw Error('The draft agreement is not in the register yet.');propose([upd('awards',lookup('awards',aw.id),{agreement_id:a.id})],'Agreement linked to the award.');}
  else if(action==='save-settings'&&event.kind==='submit'){const d={...draftOf('settings'),...form},v=valuesFromForm('settings',d,'edit');
  if(has(d,'winner')||has(d,'others'))v.decision_texts=JSON.stringify({winner:textOf(has(d,'winner')?d.winner:DECISION_TEXT.winner,4000),others:textOf(has(d,'others')?d.others:DECISION_TEXT.others,4000)});
  if(has(d,'opening_screen')||STAGES.some(k=>has(d,'stage_'+k))){const pref={...PREF},sl={...(PREF.stage_labels&&typeof PREF.stage_labels==='object'?PREF.stage_labels:{})};
   if(has(d,'opening_screen')){if(!SCREENS.some(x=>x.id===d.opening_screen))throw Error('Choose one of the app screens to open on.');pref.opening_screen=String(d.opening_screen);}
   for(const k of STAGES)if(has(d,'stage_'+k)){const t=textOf(d['stage_'+k],40);if(t&&t!==STAGE_BASE[k])sl[k]=t;else delete sl[k];}
   if(Object.keys(sl).length)pref.stage_labels=sl;else delete pref.stage_labels;if(roleMap.settings&&roleMap.settings.fields.preferences)v.preferences=JSON.stringify(pref);}
  if(settingsRow){const data={};for(const [k,val] of Object.entries(v))if((settingsRow.data[k]===undefined?null:settingsRow.data[k])!==val)data[k]=val;if(!Object.keys(data).length)throw Error('Nothing changed.');propose([upd('settings',settingsRow,data,st.settingsVersion===undefined?settingsRow.version:st.settingsVersion)]);}
  else propose([crt('settings',{default_currency:CURRENCY,blind_scoring:false,question_deadline_days:7,...v})]);st.f.settings={};delete st.settingsVersion;}
 else if((action==='save-email'||action==='reset-email')&&isAct){const d={...draftOf('email'),...form},kind=KINDS.includes(d.kind)?d.kind:'rfp',all=JSON.parse(JSON.stringify(INVITE_SAVED));
  if(action==='reset-email'){if(!all[kind])throw Error('This invitation already uses the built-in text.');delete all[kind];}
  else{const subject=textOf(d.subject,200),body=textOf(d.body,10000);if(!subject||!body)throw Error('An invitation needs a subject and a text.');all[kind]={subject,body};}
  const data={invitation_texts:JSON.stringify(all)};propose([settingsRow?upd('settings',settingsRow,data):crt('settings',{default_currency:CURRENCY,blind_scoring:false,question_deadline_days:7,...data})],'Invitation text for '+KIND_LABEL[kind]+' saved. New rounds use it.');st.f.email={kind};}
 else if(action==='save-workspace-email'||action==='clear-workspace-email'){const d={...draftOf('email'),...form},kind=KINDS.includes(d.kind)?d.kind:'rfp',cur=inviteText(kind);
  const text=action==='clear-workspace-email'?null:{subject:textOf(has(d,'subject')?d.subject:cur.subject,200),body:textOf(has(d,'body')?d.body:cur.body,10000)};if(text&&(!text.subject||!text.body))throw Error('An invitation needs a subject and a text.');
  xwrite('exchange.saveDefaultEmail',{emailType:'invitation',text},text?'Confirm the workspace default invitation in the review. It replaces the app text for every request kind and app.':'Confirm removing the workspace default invitation in the review.');}
}
/* Flow (3.0.0): Undo first, so the screen shows its result; then the tables of the open screen, the person's action, and the tables of
 * the screen the action leads to. App commands read every table. Nothing is written while opening. */
const UNDO=event.kind==='click'&&/^undo:/.test(action);
if(UNDO){try{tools.call('undo.run',{undoId:action.slice(5)});st.undo=null;note('Undone.');}catch(e){st.undo=null;note(String(e&&e.message||e).slice(0,300),'error');}}
if(event.kind==='command')load('all');
else{load(st.section);
 if(!UNDO)try{handle(event);}catch(e){note(String(e&&e.message||e).slice(0,500),'error');}
 fixSection();load(st.section);}
/* G8: after a save, the render the platform makes from the saved data offers Undo for the person's last action. */
if(event.kind==='open'&&st.justSaved){delete st.justSaved;try{const u=tools.call('undo.list'),a=u&&(u.actions||u.entries)||[];st.undo=a[0]&&a[0].undoId?{undoId:a[0].undoId,label:String(a[0].label||'last change').slice(0,80)}:null;}catch(e){st.undo=null;}}
function cdaName(i,r){return 'CDA — '+orgName(i.organization_id)+' ('+String(r&&r.name||'request')+')';}
function awardAgreementName(r,aw){return (r.service_type==='clinical_study'?'MSA':'Work order')+' — '+orgName(aw.organization_id)+' ('+String(r.name||'')+')';}
function noticePayload(r,g,invs,d){const winner=textOf(has(d,'winner')?d.winner:DECISION_TEXT.winner,10000),others=textOf(has(d,'others')?d.others:DECISION_TEXT.others,10000);if(!winner||!others)throw Error('Write both notice texts.');
 const replies=[];for(const i of invs){if(!['selected','not_selected'].includes(i.status))continue;const e=exchangeOf(g,i.id);if(!e||e.revokedAt)continue;replies.push({exchangeId:e.id,body:fillNotice(i.status==='selected'?winner:others,r,i)});}
 if(!replies.length)throw Error('No supplier of this request has a link to write to.');return {replies,notify:true};}
function fillNotice(t,r,i){return String(t||'').replace(/\{supplier\}/g,orgName(i.organization_id)).replace(/\{request\}/g,String(r.name||''));}
function noticeText(r,i){const fill=t=>String(t||'').replace(/\{supplier\}/g,orgName(i.organization_id)).replace(/\{request\}/g,String(r.name||''));return i.status==='selected'?fill(DECISION_TEXT.winner):fill(DECISION_TEXT.others);}

/* ---------- screens (3.0.0): the kit's parts and the platform styles; app styles only for the grid, chips and messages ---------- */
const WR=!!inp.saved&&!!inp.writable&&cfg.readOnly!==true;
const btn=(text,a,o)=>{o=o||{};return '<button type="button" class="k-button'+(o.primary?' k-button--primary':'')+(o.small?' cs-sm':'')+(o.danger?' cs-danger':'')+(o.link?' cs-link':'')+'" data-action="'+esc(a)+'"'+(o.disabled?' disabled':'')+(o.aria?' aria-label="'+esc(o.aria)+'"':'')+(o.pressed!==undefined?' aria-pressed="'+!!o.pressed+'"':'')+'>'+esc(text)+'</button>';};
const bS=(t,a,d,aria)=>btn(t,a,{small:true,disabled:d,aria});
const bP=(t,a,d,aria)=>btn(t,a,{small:true,primary:true,disabled:d,aria});
const submit=(text,ok,o)=>'<button type="submit" class="k-button'+(o&&o.plain?'':' k-button--primary')+(o&&o.small?' cs-sm':'')+(o&&o.danger?' cs-danger':'')+'"'+(ok===false?' disabled':'')+'>'+esc(text)+'</button>';
const pill=(text,tone)=>'<span class="k-pill'+(tone?' cs-'+tone:'')+'">'+esc(text)+'</span>';
const uploadBtn=(ctx,text,ok)=>'<button type="button" class="k-button cs-sm" data-trialy-document="upload '+esc(ctx)+'"'+(inp.saved&&WR&&ok!==false?'':' disabled')+'>'+esc(text)+'</button>';
const sec=(title,sub,body,right)=>'<section class="k-card cs-sec"><div class="cs-head"><div><h2>'+esc(title)+'</h2>'+(sub?'<p class="k-muted k-small">'+esc(sub)+'</p>':'')+'</div>'+(right?'<div class="k-row">'+right+'</div>':'')+'</div>'+body+'</section>';
const kv=(k,v)=>'<div class="cs-kv"><span>'+esc(k)+'</span><b>'+esc(v===null||v===undefined||v===''?'—':v)+'</b></div>';
const muted=t=>'<p class="k-muted">'+esc(t)+'</p>';
const warnLine=t=>'<p class="cs-warn">'+esc(t)+'</p>';
const sub=t=>'<span class="cs-sub">'+esc(t)+'</span>';
const tot=n=>exact?String(n):'—';
const loading='<div class="k-card cs-loading" aria-busy="true"><p class="k-muted">Loading…</p></div>';
/* A table that becomes cards on narrow screens (kit). heads: "#Label" is a number column, "" the actions column. */
const tbl=(heads,rows,none)=>rows.length?'<div class="k-table-wrap"><table class="k-table"><thead><tr>'+heads.map(h=>'<th scope="col"'+(h[0]==='#'?' class="cs-num"':'')+'>'+esc(h[0]==='#'?h.slice(1):h||'Actions')+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr'+(r.total?' class="cs-total"':'')+'>'+r.cells.map((c,i)=>'<td data-label="'+esc(String(heads[i]||'Actions').replace(/^#/,''))+'"'+(String(heads[i]||'')[0]==='#'?' class="cs-num"':heads[i]===''?' class="cs-actions"':'')+'><div>'+c+'</div></td>').join('')+'</tr>').join('')+'</tbody></table></div>':muted(none||'Nothing yet.');
const row=(cells,total)=>({cells,total:!!total});
/* Inline values (kit.cell): the change event edit:<record>:<field>:<version> saves at once (inlineEdit). */
const cellFor=(role,r,field,kind,o)=>{o=o||{};const v=r[field];if(!canWrite(role)||!roleMap[role]||!roleMap[role].writable.includes(field))return esc(o.show?o.show(v):v===null||v===undefined||v===''?'—':kind==='date'?dateLabel(v):kind==='number'&&num(v)!==null?grouped(num(v)):v);
 if(o.options)return '<select class="k-cell" data-action="edit:'+esc(r.id)+':'+field+':'+r.version+'" aria-label="'+esc(o.label||field)+'">'+(o.blank?'<option value="">—</option>':'')+o.options.map(x=>'<option value="'+esc(x[0])+'"'+(String(v===null||v===undefined?'':v)===String(x[0])?' selected':'')+'>'+esc(x[1])+'</option>').join('')+'</select>';
 return kit.cell({recordId:r.id,version:r.version,field,value:kind==='date'?validDate(v):v,kind,label:o.label||field});};
const empty=(title,text,label,act,disabled)=>kit.empty({title,text,...(label&&!disabled?{action:{label,action:act}}:{})});
function inputOf(formName,name,value,o){o=o||{};const a='f:'+formName+':'+name,common=' name="'+esc(name)+'" data-action="'+esc(a)+'"'+(o.disabled?' disabled':'')+(o.required?' required':'');
 const d=st.f[formName]&&has(st.f[formName],name)?st.f[formName][name]:value;
 if(o.type==='select')return '<select'+common+'>'+(o.blank===undefined?'':'<option value="">'+esc(o.blank)+'</option>')+o.options.map(x=>'<option value="'+esc(x[0])+'"'+(String(d===null||d===undefined?'':d)===String(x[0])?' selected':'')+'>'+esc(x[1])+'</option>').join('')+'</select>';
 if(o.type==='checkbox')return '<input type="checkbox"'+common+(bool(d)?' checked':'')+'>';
 if(o.type==='textarea')return '<textarea'+common+(o.tall?' rows="9"':' rows="4"')+(o.placeholder?' placeholder="'+esc(o.placeholder)+'"':'')+'>'+esc(d===null||d===undefined?'':d)+'</textarea>';
 return '<input type="'+(o.type||'text')+'"'+common+' value="'+esc(d===null||d===undefined?'':d)+'"'+(o.min!==undefined?' min="'+o.min+'"':'')+(o.max!==undefined?' max="'+o.max+'"':'')+(o.step?' step="'+o.step+'"':'')+(o.placeholder?' placeholder="'+esc(o.placeholder)+'"':'')+'>';}
const field=(formName,name,lab,value,o)=>o&&o.type==='checkbox'?'<label class="cs-check">'+inputOf(formName,name,value,o)+'<span>'+esc(lab)+'</span></label>':'<label class="k-field'+(o&&o.wide?' cs-wide':'')+'"><span>'+esc(lab)+(o&&o.required?' *':'')+'</span>'+inputOf(formName,name,value,o)+(o&&o.hint?'<small class="k-muted">'+esc(o.hint)+'</small>':'')+'</label>';
const opts=(list,labels)=>list.map(x=>[x,labels&&labels[x]?labels[x]:cap(x)]);
/* A side panel (kit.panel) for creating a record or editing many fields; full screen on phones. */
const drawer=(title,body,foot,formAction)=>kit.panel({title,close:'close',body:(formAction?'<form data-action="'+esc(formAction)+'">':'<div>')+body+'<div class="cs-foot k-row">'+(foot||btn('Close','close'))+'</div>'+(formAction?'</form>':'</div>')});
const extraValue=(f,v)=>f.kind==='boolean'?(bool(v)?'Yes':'No'):f.kind==='date'?dateLabel(validDate(v)):f.kind==='number'&&num(v)!==null?grouped(num(v)):v;
function extraBlock(role,r){const xs=(roleMap[role]&&roleMap[role].extra||[]).filter(f=>r&&r[f.key]!==null&&r[f.key]!==undefined&&r[f.key]!=='');return xs.length?'<h3>Additional fields</h3>'+xs.map(f=>kv(fieldLabel(role,f),extraValue(f,r[f.key]))).join(''):'';}
function paged(items,per){per=per||Math.min(50,Math.max(10,num(cfg.pageSize,25)||25));const max=Math.max(0,Math.ceil(items.length/per)-1);st.page=Math.min(st.page,max);return {slice:items.slice(st.page*per,(st.page+1)*per),offset:st.page*per,per,total:items.length};}
const pager=p=>p.total>p.per?kit.pager({offset:p.offset,limit:p.per,total:p.total,action:'page'}):'';
function partialNote(){return exact?'':warnLine('Partial data: totals, scores and "nothing waiting" answers are not shown. '+readProblems.slice(0,4).join(' '));}
function xNote(){return !inp.saved?muted('Supplier links, messages and submissions appear in the saved app.'):XS.error&&XS.error!=='preview'?warnLine('Supplier status could not be read: '+XS.error):XS.partial?warnLine('Supplier status is partial on this screen; open the request to see all of it.'):'';}
function picker(withRound){if(!REQS.length)return '';const r=req;
 return '<div class="cs-picker k-row">'+kit.picker({label:'Request',action:'pick-request',value:st.requestId,options:REQS.map(x=>({value:x.id,label:String(x.name||'Unnamed')+' · '+STAGE_LABEL[x.stage]}))})+
  (r?pill(MODE_LABEL[r.mode],'blue')+pill('Responses by '+dateLabel(r.response_deadline)+(r.stage!=='closed'&&daysTo(r.response_deadline)!==null?' ('+inDays(r.response_deadline)+')':''),daysTo(r.response_deadline)!==null&&daysTo(r.response_deadline)<0?'amber':''):'')+
  (withRound&&r&&r.mode==='full_selection'?'<span class="k-row cs-seg">'+btn('RFI round','round:rfi',{small:true,primary:st.round==='rfi',pressed:st.round==='rfi'})+btn('RFP round','round:rfp',{small:true,primary:st.round==='rfp',pressed:st.round==='rfp'})+'</span>':'')+'</div>';}
const noRequest=()=>empty('No request yet','Start a quick quote or a full selection.','New quick quote','add:requests:quick_quote',!canWrite('requests'));
const invPill=i=>pill(INV_LABEL[i.status],i.status==='selected'?'green':i.status==='declined'||i.status==='not_selected'?'':i.status==='finalist'||i.status==='submitted'?'blue':'amber');
function statusChips(e){if(!e)return pill('No link yet','');const s=e.status||{},out=[];
 if(s.revokedAt)out.push(pill('Link stopped','red'));else if(s.closed)out.push(pill('Closed','amber'));
 out.push(pill(s.opened?'Opened':'Not opened',s.opened?'blue':''));
 if(s.verified)out.push(pill('Verified','blue'));if(s.acknowledged)out.push(pill('Confidentiality accepted','blue'));
 for(const d of s.documentsBack||[])out.push(pill(d.label+': '+d.status,d.status==='accepted'?'green':d.status==='received'?'amber':''));
 if((s.downloads||[]).length)out.push(pill(plural(s.downloads.length,'download'),'blue'));
 if(s.draftSavedAt&&!s.submitted)out.push(pill('Draft saved','amber'));
 if(s.submitted)out.push(pill('Submitted (v'+s.submitted.version+', '+stamp(s.submitted.at)+')'+(s.submitted.accepted?' · accepted':''),s.submitted.accepted?'green':'amber'));
 if(s.unreadMessages)out.push(pill(plural(s.unreadMessages,'unread message'),'red'));
 return '<span class="cs-chips">'+out.join('')+'</span>';}
function unanswered(msgs){return msgs.filter(m=>m.kind==='private'&&m.author==='recipient'&&!msgs.some(x=>x.kind==='private'&&x.author==='workspace'&&x.exchangeId===m.exchangeId&&String(x.createdAt)>String(m.createdAt))&&!msgs.some(x=>x.kind==='clarification'&&x.sourceMessageId===m.id));}
const responses=r=>{const g=groupOf(r,'rfp')||groupOf(r,'rfi');if(!g)return null;const xs=(g.exchanges||[]).filter(e=>!e.revokedAt);return {got:xs.filter(e=>e.status&&e.status.submitted).length,of:xs.length};};

function overviewData(){const waiting=[];let roundsChecked=0;const all=inp.saved?xAll():{map:{},order:[],complete:true};
 for(const r of OPEN_REQS)for(const rd of ['rfi','rfp']){const g=all.map[groupIdOf(r,rd)];if(!g)continue;
  for(const e of g.exchanges||[]){const s=e.status||{},who=e.recipientCompany||e.recipientName||'A supplier';
   if(s.submitted&&!s.submitted.accepted)waiting.push({r,text:'Submission v'+s.submitted.version+' from '+who+' to accept',to:'proposals',at:s.submitted.at});
   for(const d of s.documentsBack||[])if(d.status==='received')waiting.push({r,text:d.label+' from '+who+' to accept',to:'vendors',at:d.receivedAt});
   if(s.unreadMessages)waiting.push({r,text:plural(s.unreadMessages,'unread message')+' from '+who,to:'messages',at:''});}
  if(roundsChecked<4&&(g.exchanges||[]).length){roundsChecked++;const u=unanswered(xMsgs(g.id).rows);if(u.length)waiting.push({r,text:plural(u.length,'unanswered question')+' in the '+ROUND_LABEL[rd==='rfi'?'rfi':'rfp']+' round',to:'messages',at:''});}}
 const due=[];const soon=d=>d&&daysTo(d)!==null&&daysTo(d)<=14;
 for(const r of OPEN_REQS){if(soon(r.decision_due)&&!awardOf(r.id))due.push({r,d:r.decision_due,text:'Decision due',to:'decision'});if(soon(r.response_deadline)&&STAGES.indexOf(r.stage)<=STAGES.indexOf('proposals'))due.push({r,d:r.response_deadline,text:'Response deadline',to:'vendors'});
  for(const c of CHECKS.filter(c=>c.request_id===r.id&&c.status==='open'&&soon(c.due)))due.push({r,d:c.due,text:cap(c.scope)+': '+c.item,to:c.scope==='onboarding'?'decision':'evaluation'});}
 due.sort((a,b)=>a.d.localeCompare(b.d));
 let got=0,of=0;for(const r of OPEN_REQS){const x=responses(r);if(x){got+=x.got;of+=x.of;}}
 const xOk=inp.saved&&!(XS.error&&XS.error!=='preview')&&!XS.partial&&all.complete;
 return {waiting,due,got,of,xOk};}
const list2=items=>'<ul class="cs-list">'+items.join('')+'</ul>';
function overview(){if(!REQS.length)return partialNote()+empty('No request yet','A quick quote takes days; a full selection runs from the need to a signed award. Start with the one you need now.','New quick quote','add:requests:quick_quote',!canWrite('requests'))+(canWrite('requests')?'<div class="k-row cs-center">'+btn('New full selection','add:requests:full_selection')+'</div>':'');
 const {waiting,due,got,of,xOk}=overviewData();
 const sentence=!xOk?plural(OPEN_REQS.length,'open request')+'. Supplier status could not be read completely.':waiting.length?plural(waiting.length,'item')+' waiting on us across '+plural(OPEN_REQS.length,'open request')+'.':'Nothing is waiting on us across '+plural(OPEN_REQS.length,'open request')+'.';
 const stages=STAGES.filter(s=>s!=='closed');
 return partialNote()+xNote()+'<p class="cs-lead">'+esc(exact?sentence:'Partial data: open the requests to check what is waiting.')+'</p>'+
  '<div class="k-grid cs-stats">'+kit.stat('Open requests',tot(OPEN_REQS.length))+kit.stat('Responses received / invited',xOk?got+' / '+of:'—')+kit.stat('Waiting on us',xOk&&exact?String(waiting.length):'—')+kit.stat('Due in 14 days',tot(due.length))+'</div>'+
  '<div class="cs-two">'+sec('Waiting on us','Submissions and files to accept, messages to answer.',waiting.length?list2(waiting.slice(0,12).map(x=>'<li><span>'+esc(x.text)+sub((x.r.name||'')+(x.at?' · '+stamp(x.at):''))+'</span>'+bS('Open','open-request:'+x.r.id+':'+x.to,false,'Open: '+x.text)+'</li>')):muted(inp.saved?(exact&&xOk?'Nothing is waiting.':'Not all rounds could be checked.'):'Shown in the saved app.'))+
  sec('Decisions and onboarding due','Within 14 days or overdue.',due.length?list2(due.slice(0,12).map(x=>'<li><span>'+esc(x.text)+sub(x.r.name||'')+'</span><span class="k-row">'+pill(dateLabel(x.d)+' · '+inDays(x.d),daysTo(x.d)<0?'red':'amber')+bS('Open','open-request:'+x.r.id+':'+x.to,false,'Open: '+x.text)+'</span></li>')):muted(exact?'Nothing due.':'Partial data.'))+'</div>'+
  sec('Requests by stage','Drag a request to another stage, or use the menu on its card.',kit.board({action:'move-stage',columns:stages.map(s=>({id:s,label:STAGE_LABEL[s],cards:OPEN_REQS.filter(r=>r.stage===s).map(r=>({id:r.id,label:r.name||'Unnamed',html:btn(r.name||'Unnamed','open-request:'+r.id+':requests',{link:true})+sub(MODE_LABEL[r.mode]+' · '+(SERVICE_LABEL[r.service_type]||label(r.service_type)))}))}))}),canWrite('requests')?btn('New quick quote','add:requests:quick_quote',{small:true})+btn('New full selection','add:requests:full_selection',{small:true,primary:true}):'')+
  sec('Recent awards','',AWARDS.length?list2(AWARDS.slice().sort((a,b)=>String(b.decided_on).localeCompare(String(a.decided_on))).slice(0,6).map(a=>'<li><span><b>'+esc(orgName(a.organization_id))+'</b>'+sub((REQ[a.request_id]?REQ[a.request_id].name:refName('requests',a.request_id))+' · decided '+dateLabel(a.decided_on)+' · approved by '+(a.approver||'—'))+'</span><span class="cs-num">'+esc(money(a.total,a.currency))+'</span></li>')):muted('No award yet.'));}

function nextAction(r){const s=r.stage,o=stagesOf(r.mode),i=o.indexOf(s),nx=o[i+1],go=(t,to)=>bP(t,'nav:'+to);
 const text={need:['Pick the vendors to ask.',go('Build the longlist','vendors')],longlist:[r.mode==='quick_quote'?'Create the request round and invite 2 to 5 suppliers.':'Optionally run an RFI, then create the RFP round.',go('Open Vendors','vendors')],rfi:['Invite the longlist to the RFI and shortlist from the answers.',go('Open Vendors','vendors')],rfp:['Create links for the shortlist and send the invitation.',go('Open Vendors','vendors')],questions:['Answer supplier questions'+(r.question_deadline?' until '+dateLabel(r.question_deadline):'')+'.',go('Open Messages','messages')],proposals:['Accept submissions and map them into the grid.',go('Open Proposals','proposals')],evaluation:['Score capability before price, and complete qualification.',go('Open Evaluation','evaluation')],bid_defence:['Hold the bid defence with 2 to 3 finalists.',go('Open Evaluation','evaluation')],decision:['Record the decision and notify every supplier.',go('Open Decision','decision')],onboarding:['Complete onboarding and prepare the handoff.',go('Open Decision','decision')],closed:['This request is closed.','']}[s];
 return '<div class="cs-next"><span><b>Next:</b> '+esc(text[0])+'</span><span class="k-row">'+text[1]+(i>0&&s!=='closed'?bS('Back to '+STAGE_LABEL[o[i-1]],'stage:'+o[i-1],!canWrite('requests')):'')+(nx&&nx!=='closed'?bS('Move to '+STAGE_LABEL[nx],'stage:'+nx,!canWrite('requests')):'')+'</span></div>';}
function docsList(){if(xc.docs)return xc.docs;if(!inp.saved)return xc.docs={docs:[],state:'preview'};let r;try{r=tools.call('documents.list',{limit:200});}catch(e){return xc.docs={docs:[],state:'unavailable'};}if(r&&r.pending){XS.pending=true;return xc.docs={docs:[],state:'loading'};}if(!r||r.unavailable)return xc.docs={docs:[],state:'unavailable'};return xc.docs={docs:(r.documents||[]).filter(d=>d.latest!==false),state:'ready'};}
const docName=v=>{const d=docsList().docs.find(x=>x.versionId===v);return d?d.filename:'Document '+String(v).slice(0,8);};
function docChecks(formName,exclude){const L=docsList(),mine=(st.uploaded||[]);const ds=L.docs.filter(d=>!exclude.includes(d.versionId)).sort((a,b)=>(mine.includes(b.versionId)?1:0)-(mine.includes(a.versionId)?1:0)).slice(0,30);
 return L.state!=='ready'?muted(L.state==='preview'?'Documents are available in the saved app.':L.state==='loading'?'Loading documents…':'Documents are not available for you here.'):ds.length?'<div class="cs-checks">'+ds.map(d=>field(formName,'doc_'+d.versionId,d.filename+' · uploaded '+dateLabel(validDate(d.uploadedOn)),false,{type:'checkbox'})).join('')+'</div>':muted('No documents yet. Upload the request pack first.');}
function summaryText(r){const invs=invsOf(r.id),aw=awardOf(r.id),x=inp.saved?responses(r):null,rd=roundOf(r),L=['# '+String(r.name||'')+' ('+MODE_LABEL[r.mode]+', '+(SERVICE_LABEL[r.service_type]||label(r.service_type))+')',''];
 L.push('Stage: '+STAGE_LABEL[r.stage]+'. Response deadline: '+dateLabel(r.response_deadline)+(r.decision_due?'. Decision due: '+dateLabel(r.decision_due):'')+'.');
 if(r.budget_estimate!==null)L.push('Budget estimate: '+money(r.budget_estimate,r.currency)+'.');
 L.push('Suppliers: '+invs.length+' on the list'+(x?', '+x.of+' invited, '+x.got+' responded':'')+'.');
 const withP=invs.map(i=>({i,p:latestProposal(i.id,rd)})).filter(x=>x.p);
 if(withP.length){L.push('','Accepted proposals:');for(const {i,p} of withP){const t=proposalTotals(p,r.currency),sc=scoreOf(r,i.id);L.push('- '+orgName(i.organization_id)+': '+money(t.total,t.currency)+(p.duration_months!==null?', '+p.duration_months+' months':'')+(sc.weighted!==null?', weighted score '+sc.weighted.toFixed(2)+' / 5':'')+(sc.fails.length?' (fails mandatory: '+sc.fails.join(', ')+')':'')+' — '+INV_LABEL[i.status]);}}
 if(aw)L.push('','Decision: '+orgName(aw.organization_id)+', '+money(aw.total,aw.currency)+', decided '+dateLabel(aw.decided_on)+', approved by '+String(aw.approver||'')+'.','Rationale: '+String(aw.rationale||''));
 if(!exact)L.push('','Note: the data was not read completely.');return L.join('\n');}
function requestsScreen(){const w=canWrite('requests');
 const add='<div class="k-row cs-bar">'+btn('New quick quote','add:requests:quick_quote',{disabled:!w})+btn('New full selection','add:requests:full_selection',{primary:true,disabled:!w})+'</div>';
 if(!REQS.length)return partialNote()+empty('No request yet','A quick quote takes days; a full selection runs from the need to a signed award.','New full selection','add:requests:full_selection',!w)+(w?'<div class="k-row cs-center">'+btn('New quick quote','add:requests:quick_quote')+'</div>':'');
 const cols={name:r=>btn(r.name||'Unnamed','open-request:'+r.id+':requests',{link:true,pressed:r.id===st.requestId}),mode:r=>esc(MODE_LABEL[r.mode]),stage:r=>pill(STAGE_LABEL[r.stage],r.stage==='closed'?'':'blue'),service_type:r=>esc(SERVICE_LABEL[r.service_type]||label(r.service_type)),response_deadline:r=>esc(dateLabel(r.response_deadline))+(r.stage!=='closed'&&r.response_deadline?sub(inDays(r.response_deadline)):''),responses:r=>{const x=inp.saved?responses(r):null;return x?x.got+' / '+x.of:'—';},owner:r=>esc(r.owner||'—')};
 const shown=st.layout.cols.requests.filter(c=>cols[c]&&(c==='name'||colVisible('requests',c))),labels=Object.fromEntries(templateLayoutSchema.groups.requests.map(x=>[x.id,LP.labels['requests:'+x.id]||x.label]));
 const p=paged(REQS,10);
 let html=partialNote()+add+sec('All requests','',tbl(shown.map(c=>(c==='responses'?'#':'')+labels[c]),p.slice.map(r=>row(shown.map(c=>cols[c](r)))))+pager(p));
 const r=req;if(!r)return html;
 const o=stagesOf(r.mode),at=o.indexOf(r.stage),c=(f,k,l,x)=>'<div class="cs-kv"><span>'+esc(l)+'</span>'+cellFor('requests',r,f,k,{label:l,...(x||{})})+'</div>';
 html+=picker(true)+sec(String(r.name||'Unnamed'),MODE_LABEL[r.mode]+' · '+(SERVICE_LABEL[r.service_type]||label(r.service_type))+(r.program_id?' · '+refName('programs',r.program_id):'')+(r.study_id?' · '+refName('studies',r.study_id):''),
  '<ol class="cs-steps" aria-label="Journey">'+o.map((s,i)=>'<li class="'+(i<at?'done':i===at?'now':'')+'"'+(i===at?' aria-current="step"':'')+'>'+esc((i+1)+'. '+STAGE_LABEL[s])+'</li>').join('')+'</ol>'+nextAction(r)+
  '<div class="cs-two"><div>'+c('budget_estimate','number','Budget estimate ('+r.currency+')')+c('question_deadline','date','Question deadline')+c('response_deadline','date','Response deadline')+c('decision_due','date','Decision due')+c('owner','text','Owner')+'</div><div>'+kv('CDA',CDA_LABEL[r.cda_option]+(bool(r.cda_gate)?' (gate on)':''))+kv('Questions',plural(questionsFor(r,'rfp').length,'question')+(lines(r.questions).length?'':' (built-in)'))+kv('Cost categories',plural(gridOf(r,[]).cats.length,'category')+(lines(r.cost_categories).length?'':' (built-in)'))+kv('Rounds',inp.saved?[groupIdOf(r,'rfi')?'RFI created':'',groupIdOf(r,'rfp')?(r.mode==='quick_quote'?'Quote round created':'RFP created'):''].filter(Boolean).join(' · ')||'None yet':'In the saved app')+'</div></div>'+extraBlock('requests',r)+'<h3>Scope</h3><div class="cs-report">'+esc(r.scope||'')+(r.assume.notes?'\n\nAssumptions\n'+esc(r.assume.notes):'')+'</div>'+
  (r.stage!=='closed'?'<div class="k-row cs-bar">'+(awardOf(r.id)?'':field('close','confirm','Close without an award',false,{type:'checkbox'}))+bS('Close request','stage:closed',!w)+'</div>':''),bS('Edit request','open-editor:requests:'+r.id,!w)+bS('Archive','archive:requests:'+r.id,!w,'Archive '+(r.name||'this request')));
 const g=inp.saved?groupOf(r,st.round):null,rl=st.round==='rfi'?'RFI':r.mode==='quick_quote'?'quote':'RFP';
 let docs='';
 if(g){const shared=g.documents||[];docs=(shared.length?list2(shared.map(d=>'<li><span>'+esc(d.filename)+(d.gate?' '+pill('CDA to sign','amber'):'')+'</span>'+bS('Remove','unshare:'+d.versionId,!WR,'Remove '+d.filename)+'</li>')):muted('No document is shared in this round yet.'))+'<form data-action="share-docs"><h3>Add documents</h3>'+docChecks('share',shared.map(d=>d.versionId))+'<div class="k-row">'+uploadBtn('rfp_pack:'+r.id,'Upload a document')+submit('Share with the round',WR)+btn('Edit the brief','panel:brief:'+st.round,{disabled:!WR})+'</div></form>'+(r.cda_option==='send_pdf'&&st.round==='rfp'&&!(g.slots||[]).length?'<div class="k-row cs-bar">'+bS('Request the signed CDA from every supplier','request-cda',!WR)+'</div>':'');}
 else docs=inp.saved?empty('No '+rl+' round yet','The request pack is chosen when you create the round.','Create the '+rl+' round','panel:round:'+st.round,!WR||!roleMap.proposals):muted('Shown in the saved app.');
 html+=xNote()+'<div class="cs-two">'+sec('Documents out','The request pack, shared from TrialAgents documents. Each download is logged.',docs)+sec('Summary for leadership','Figures come from accepted proposals only.','<div class="cs-report">'+esc(summaryText(r))+'</div>')+'</div>';
 return html;}
function vendorsScreen(){const q=st.query.toLowerCase(),hist={},w=canWrite('organizations');
 for(const i of INVS){const h=hist[i.organization_id]||(hist[i.organization_id]={n:0,aw:0,sc:[]});h.n++;const r=REQ[i.request_id];if(r){const s=scoreOf(r,i.id);if(s.weighted!==null)h.sc.push(s.weighted);}}
 for(const a of AWARDS){const h=hist[a.organization_id]||(hist[a.organization_id]={n:0,aw:0,sc:[]});h.aw++;}
 const rows=VENDORS.filter(o=>(!q||String(o.data.name||'').toLowerCase().includes(q)||String(o.data.country||'').toLowerCase().includes(q))&&(!st.filters.org_type||o.data.org_type===st.filters.org_type)),p=paged(rows,10);
 const typeLabel=t=>t==='other'?'Lab / other':String(t||'').toUpperCase();
 const cols={name:o=>cellFor('organizations',flat(o),'name','text',{label:'Vendor name'})+sub(R.people.rows.filter(x=>x.data.organization_id===o.id).map(x=>x.data.name).slice(0,3).join(', ')||'No contact'),org_type:o=>cellFor('organizations',flat(o),'org_type','select',{label:'Type',options:VENDOR_TYPES.map(t=>[t,typeLabel(t)]),show:typeLabel}),country:o=>cellFor('organizations',flat(o),'country','text',{label:'Country'}),requests:o=>String((hist[o.id]||{}).n||0),awards:o=>String((hist[o.id]||{}).aw||0),score:o=>{const s=(hist[o.id]||{}).sc||[];return s.length?(s.reduce((a,b)=>a+b,0)/s.length).toFixed(2)+' / 5':'—';}};
 const shown=st.layout.cols.vendors.filter(c=>cols[c]&&(c==='name'||colVisible('vendors',c))),labels=Object.fromEntries(templateLayoutSchema.groups.vendors.map(x=>[x.id,LP.labels['vendors:'+x.id]||x.label]));
 const tools_='<div class="k-row cs-bar"><label class="k-picker"><span>Search</span><input type="search" data-action="query" value="'+esc(st.query)+'" aria-label="Search vendors"></label><label class="k-picker"><span>Type</span><select data-action="filter:org_type" aria-label="Vendor type"><option value="">All types</option>'+VENDOR_TYPES.map(t=>'<option value="'+t+'"'+(st.filters.org_type===t?' selected':'')+'>'+typeLabel(t)+'</option>').join('')+'</select></label><span class="k-grow"></span>'+btn('Add vendor','add:organizations',{primary:true,disabled:!w})+'</div>';
 let html=partialNote()+sec('Vendor directory','CROs, CDMOs and labs, with their history across requests. Edit a value where it is shown.',VENDORS.length?tools_+tbl(shown.map(c=>(['requests','awards','score'].includes(c)?'#':'')+labels[c]).concat(['']),p.slice.map(o=>row(shown.map(c=>cols[c](o)).concat([bS('Contact','add:people:'+o.id,!canWrite('people'),'Add a contact to '+o.data.name)+bS('Edit','open-editor:organizations:'+o.id,!w,'Edit '+o.data.name)]))),'No vendor matches.')+pager(p):empty('No vendor yet','Add the CROs, CDMOs and labs you work with, or ask your assistant to research and add some.','Add vendor','add:organizations',!w));
 const r=req;if(!r)return html+noRequest();
 const g=inp.saved?groupOf(r,st.round):null,invs=invsOf(r.id),rl=st.round==='rfi'?'RFI':r.mode==='quick_quote'?'quote':'RFP';
 const act=i=>{const b=(t,s)=>bS(t,'inv-status:'+i.id+':'+s,!canWrite('invitations'),t+' '+orgName(i.organization_id));
  return (['longlist','rfi_invited'].includes(i.status)?b('Shortlist','shortlisted'):'')+(['submitted','rfp_invited','shortlisted'].includes(i.status)&&r.mode==='full_selection'?b('Finalist','finalist'):'')+(i.status==='finalist'?b('Not a finalist','submitted'):'')+(!['declined','selected','not_selected'].includes(i.status)?b('Decline','declined'):'')+(i.status==='declined'?b('Restore','longlist'):'')+bS('Details','panel:supplier:'+i.id,false,'Details of '+orgName(i.organization_id));};
 const addForm='<form data-action="longlist-add" class="cs-form">'+field('longlist','organization_id','Add a vendor to the list','',{type:'select',blank:'Choose a vendor',options:VENDORS.filter(o=>!invs.some(i=>i.organization_id===o.id)).map(o=>[o.id,String(o.data.name||'Unnamed')])})+field('longlist','recipient_emails','Recipient emails','',{placeholder:'Empty = the vendor\'s contacts',hint:'1 to 5 addresses, comma separated. Only they can open the supplier page.'})+'<div class="k-row">'+submit('Add to the list',canWrite('invitations')&&VENDORS.length>0)+'</div></form>';
 html+=picker(true)+xNote()+sec('Longlist and shortlist',plural(invs.length,'supplier')+' on this request. Live status of the '+rl+' round.',(invs.length?tbl(['Supplier','Stage','CDA','Live status',''],invs.map(i=>{const e=exchangeOf(g,i.id);return row([esc(orgName(i.organization_id))+sub(i.emails.join(', ')||'No recipient'),invPill(i),esc(i.cda_status?CDA_STATUS_LABEL[i.cda_status]+(i.cda_in_place_on?' ('+dateLabel(validDate(i.cda_in_place_on))+')':''):'—'),inp.saved?statusChips(e)+(e&&e.status&&!e.status.closed?sub('Deadline '+stamp(e.expiresAt)):''):'<span class="k-muted">In the saved app</span>',act(i)]);})):muted('No supplier yet. Add 2 to 5 for a quick quote, 3 to 5 for a full selection.'))+addForm);
 let inv='';
 if(!g)inv=inp.saved?empty('No '+rl+' round yet','Create the round first: its brief, documents, questions and deadline.','Create the '+rl+' round','panel:round:'+st.round,!WR||!roleMap.proposals):muted('Shown in the saved app.');
 else{const without=invs.filter(i=>!['declined','not_selected'].includes(i.status)&&!(exchangeOf(g,i.id)&&!exchangeOf(g,i.id).revokedAt)&&(st.round==='rfi'||r.mode==='quick_quote'||!r.rfi_group_id||['shortlisted','rfp_invited','submitted','finalist'].includes(i.status))),live=invs.map(i=>({i,e:exchangeOf(g,i.id)})).filter(x=>x.e&&!x.e.revokedAt);
  inv+='<h3>1. Create a private link per supplier</h3>'+(without.length?'<form data-action="invite"><div class="cs-checks">'+without.map(i=>field('invite','inv_'+i.id,orgName(i.organization_id)+' — '+i.emails.join(', '),true,{type:'checkbox'})).join('')+'</div><div class="k-row">'+field('invite','days','Days until the deadline',daysUntil(r.response_deadline)||14,{type:'number',min:1,max:90})+submit('Create links',WR)+'</div></form>':muted('Every supplier in this round has a link.'+(st.round==='rfp'&&r.rfi_group_id&&r.mode!=='quick_quote'?' After an RFI, shortlist suppliers to invite them here.':'')));
  if(live.length){const d=draftOf('mail'),type=EMAIL_TYPES.includes(d.email_type)?d.email_type:'invitation',kind=kindOf(r,st.round);let def=xcall('exchange.defaultEmail',{groupId:g.id,emailType:type});if(!def)def=type==='invitation'?inviteText(kind):{subject:'',body:'',source:'platform'};
   inv+='<h3>2. Email</h3><form data-action="prepare-email"><div class="cs-form">'+field('mail','email_type','Email','invitation',{type:'select',options:[['invitation','Invitation'],['reminder','Reminder']]})+field('mail','name_kind','Sent as','organization',{type:'select',options:[['organization','<Organization> at TrialAgents'],['person','<Your first name> at TrialAgents'],['custom','Custom name at TrialAgents']]})+(d.name_kind==='custom'?field('mail','custom_name','Display name (" at TrialAgents" is added)','',{}):'')+(type==='reminder'?field('mail','schedule_on','Send on (empty = now)','',{type:'date',hint:'Approved now, sent that morning (08:00 UTC) to open links.'}):'')+
    field('mail','subject','Subject for everyone',def.subject,{wide:true})+field('mail','body','Text for everyone',def.body,{type:'textarea',tall:true,wide:true,hint:'Placeholders such as {recipient_name} and {link} are filled per supplier. Sent from no-reply@trialagents.com, Reply-To you.'})+'</div>'+
    '<h3>Recipients</h3>'+live.map(x=>'<div class="cs-two">'+field('mail','to_'+x.e.id,orgName(x.i.organization_id)+' — '+(x.e.recipientEmails||[]).join(', ')+(x.e.status&&x.e.status.submitted?' (submitted)':''),type==='invitation'?!(x.e.status&&x.e.status.opened):!(x.e.status&&x.e.status.submitted),{type:'checkbox'})+field('mail','pers_'+x.e.id,'Personal text for '+orgName(x.i.organization_id)+' (replaces the text above)','',{type:'textarea',placeholder:'Optional. You or your assistant can personalise this supplier\'s email.'})+'</div>').join('')+'<div class="k-row">'+submit('Preview the emails',WR)+'</div></form>';
   const b=st.batch&&st.batch.groupId===g.id?st.batch:null;
   if(b)inv+='<div class="cs-review"><h3>'+esc(b.requested?'Waiting for your confirmation':'Check the emails, then send')+'</h3><p class="k-muted k-small">'+esc((b.requested?'Confirm the send in the TrialAgents review: one confirmation sends these emails and marks the suppliers invited.':'Shown exactly as they will be sent. From '+b.from+' · Reply-To '+b.replyTo+'.')+(b.scheduledAt?' Scheduled '+stamp(b.scheduledAt)+' UTC.':''))+'</p>'+b.recipients.map(m=>'<div class="cs-mail"><div class="k-row k-small"><span><b>To</b> '+esc(m.to)+'</span><span><b>Subject</b> '+esc(m.subject)+'</span>'+(m.personalised?pill('Personalised','blue'):'')+'</div><pre>'+esc(m.text)+'</pre></div>').join('')+muted(b.fixed)+'<div class="k-row">'+btn(b.scheduledAt?'Approve the reminder':'Send '+plural(b.recipients.length,'email'),'send-email',{primary:true,disabled:!WR||b.requested})+btn('Discard','discard-batch')+'</div></div>';
   const log=xPaged('exchange.listEmails','emails',g.id).rows.filter(m=>m.emailType!=='workspace_notification').slice(0,8);
   if(log.length)inv+='<h3>Email log</h3>'+tbl(['To','Type','Subject','Status'],log.map(m=>row([esc(m.to),esc(cap(m.emailType)),esc(m.subject),pill(cap(m.status),m.status==='delivered'||m.status==='sent'?'green':['bounced','failed','complained','suppressed'].includes(m.status)?'red':'')+sub(stamp(m.sentAt||m.createdAt))])));}}
 return html+sec('Invite to the '+rl+' round','One private link per supplier. A person confirms every send.',inv);}
function messagesScreen(){const r=req;if(!r)return noRequest();let html=picker(true)+xNote();
 const g=inp.saved?groupOf(r,st.round):null;if(!g)return html+(inp.saved?empty('No round yet','Messages and clarifications start when the round exists and suppliers are invited.','Create the round','panel:round:'+st.round,!WR||!roleMap.proposals):muted('Shown in the saved app.'));
 const M=xMsgs(g.id),msgs=M.rows.slice().sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt))),un=unanswered(msgs),xs=(g.exchanges||[]),late=m=>r.question_deadline&&st.round==='rfp'&&String(m.createdAt).slice(0,10)>r.question_deadline;
 if(!xs.some(e=>e.id===st.thread))st.thread=(xs.find(e=>e.status&&e.status.unreadMessages)||xs.find(e=>un.some(m=>m.exchangeId===e.id))||xs[0]||{}).id||'';
 const e=xs.find(x=>x.id===st.thread),who=x=>x.recipientCompany||x.recipientName||(x.recipientEmails||[])[0]||'Supplier',thread=msgs.filter(m=>m.kind==='private'&&m.exchangeId===st.thread),clar=msgs.filter(m=>m.kind==='clarification');
 const bubble=m=>'<li class="cs-msg '+(m.kind==='clarification'?'clar':m.author==='recipient'?'them':'us')+'"><div class="k-row k-small"><b>'+esc(m.kind==='clarification'?(m.question?'Clarification':'Addendum'):m.author==='recipient'?(m.recipientName||'Supplier'):'You')+'</b><span class="k-muted">'+esc(stamp(m.createdAt))+'</span>'+(m.kind==='private'&&m.author==='recipient'&&late(m)?pill('After the question deadline','amber'):'')+(m.kind==='private'&&m.author==='recipient'&&un.includes(m)?pill('Unanswered','red')+bS('Publish as clarification','to-clarification:'+m.id,!WR):'')+'</div>'+(m.question?'<em>A recipient asked: '+esc(m.question)+'</em>\n':'')+esc(m.body)+'</li>';
 if(!xs.length)return html+empty('No supplier has a link yet','Create the supplier links on the Vendors screen; their questions arrive here.','Open Vendors','nav:vendors');
 html+='<div class="cs-two">'+sec('Private threads','Only you and that supplier see a thread.',tbl(['Supplier','Messages',''],xs.map(x=>{const n=msgs.filter(m=>m.kind==='private'&&m.exchangeId===x.id).length,u=un.filter(m=>m.exchangeId===x.id).length;return row([esc(who(x))+(x.id===st.thread?' '+pill('Open','blue'):''),n+(u?' '+pill(u+' unanswered','red'):'')+(x.status&&x.status.unreadMessages?' '+pill(x.status.unreadMessages+' unread','amber'):''),bS('Open','thread:'+x.id,false,'Open the thread with '+who(x))]);})))+
  sec('Question deadline',r.question_deadline&&st.round==='rfp'?dateLabel(r.question_deadline)+' ('+inDays(r.question_deadline)+'). Later questions are flagged, not blocked.':'No question deadline for this round.',un.length?list2(un.map(m=>'<li><span>'+esc(String(m.body).slice(0,140))+sub((m.recipientName||'Supplier')+' · '+stamp(m.createdAt)+(late(m)?' · after the deadline':''))+'</span>'+bS('Open','thread:'+m.exchangeId)+'</li>')):muted(M.complete?'No unanswered question.':'Messages were read in part.'))+'</div>';
 html+=sec(e?'Thread with '+who(e):'Thread','Reply privately, or publish a question and its answer to every supplier without naming who asked.',e?(thread.length?'<ul class="cs-thread">'+thread.map(bubble).join('')+'</ul>':muted('No message yet.'))+(e.revokedAt?muted('This link was stopped.'):'<form data-action="reply">'+field('reply','body','Private reply','',{type:'textarea',placeholder:'Your assistant can draft this; only you can send it.'})+'<div class="k-row">'+field('reply','notify','Email a notice with the link',true,{type:'checkbox'})+submit('Reply privately',WR)+'</div></form>'):muted('Choose a supplier.'));
 return html+sec('Clarifications and addenda','Visible to every supplier of this round. The asker is shown as "A recipient asked".',clar.length?'<ul class="cs-thread">'+clar.map(bubble).join('')+'</ul>':muted('Nothing published yet.'),bP('New clarification or addendum','panel:clar:new',!WR));}
function proposalsScreen(){const r=req;if(!r)return noRequest();let html=picker(false)+xNote()+partialNote();
 const rd=roundOf(r),invs=invsOf(r.id),cols=invs.map(i=>({i,p:latestProposal(i.id,rd)})).filter(x=>x.p).map(x=>({...x,t:proposalTotals(x.p,r.currency)})),grid=gridOf(r,cols.map(c=>c.p)),base=baselineOf(r);
 html+=sec('Sponsor baseline','Your own estimate by cost category, in '+r.currency+'. Bids are compared with it.',base.length?tbl(['Cost category','#Baseline'],base.map(b=>row([esc(b.category),esc(money(b.amount,r.currency))])).concat([row(['Total',esc(money(grid.baseTotal,r.currency))],true)])):muted('No baseline yet. Add your estimate per cost category to see deviations.'),bS('Edit assumptions','open-editor:requests:'+r.id,!canWrite('requests')));
 const dev=(d,pct)=>d===null?'':'<span class="cs-dev '+(d>0?'neg':d<0?'pos':'')+'">'+(d>0?'+':'')+esc(grouped(d))+(pct!==null&&pct!==undefined?' ('+sgn(pct)+'%)':'')+'</span>';
 const flag=t=>'<span class="cs-flag">'+esc(t)+'</span>';
 if(cols.length){const best=cols.filter(c=>c.t.total!==null&&c.t.currency===r.currency).sort((a,b)=>a.t.total-b.t.total)[0],rg=groupOf(r,'rfp');
  const rows=grid.cats.map(cat=>row([esc(cat),has(grid.baseBy,catKey(cat))?esc(grouped(grid.baseBy[catKey(cat)])):'—'].concat(cols.map(c=>{const x=cellOf(c.p,cat,r,grid);return (x.amount===null?(x.other.length?sub(x.other.join(', ')+' (not converted)'):'—'):esc(grouped(x.amount))+dev(x.dev,x.pct))+x.flags.map(flag).join('')+(x.amount!==null&&x.other.length?sub('+ '+x.other.join(', ')):'')+((x.amount!==null||x.flags.length)&&exchangeOf(rg,c.i.id)?' '+btn('Ask','ask:'+c.i.id+':'+cat,{link:true,disabled:!WR,aria:'Ask '+orgName(c.i.organization_id)+' about '+cat}):'');}))));
  rows.push(row(['Total ('+esc(r.currency)+')',grid.baseTotal===null?'—':esc(grouped(grid.baseTotal))].concat(cols.map(c=>{const same=c.t.currency===r.currency,d=same&&c.t.total!==null&&grid.baseTotal!==null?round2(c.t.total-grid.baseTotal):null;return (c.t.total===null?'—':esc(same?grouped(c.t.total):money(c.t.total,c.t.currency)))+dev(d,d!==null&&grid.baseTotal?round1(d/grid.baseTotal*100):null)+(!same?sub('Other currency: not converted, not compared'):'')+(c.t.fromLines&&c.t.stated!==null&&c.t.total!==null&&Math.abs(c.t.stated-c.t.total)>0.005?flag('Stated total '+grouped(c.t.stated)+' differs from the lines'):'')+(!c.t.fromLines?sub('Stated total, no lines yet'):'');})),true),
   row(['Other currencies','—'].concat(cols.map(c=>Object.keys(c.t.others).length?esc(Object.entries(c.t.others).map(([k,v])=>money(v,k)).join(', '))+sub('Listed, never converted'):'—'))),
   row(['Of which pass-through','—'].concat(cols.map(c=>c.t.passThrough===null||c.t.passThrough===undefined?'—':esc(grouped(c.t.passThrough))+(c.t.total?sub(round1(c.t.passThrough/c.t.total*100)+'% of the total'):'')))),
   row(['Timeline','—'].concat(cols.map(c=>esc(c.p.start_weeks!==null?'Start in '+plural(c.p.start_weeks,'week'):'Start —')+sub(c.p.duration_months!==null?plural(c.p.duration_months,'month'):'Duration —')))),
   row(['Stated deviations','—'].concat(cols.map(c=>c.p.assumptions_delta?flag(String(c.p.assumptions_delta).slice(0,300)):'—'))));
  html+=sec('Bid grid','The latest accepted version per supplier. Deviation = proposal − baseline. Other currencies are listed, never converted.',tbl(['Cost category','#Baseline'].concat(cols.map(c=>'#'+orgName(c.i.organization_id)+' (v'+c.p.version+')')),rows)+
   (best&&grid.baseTotal?'<p class="'+(best.t.total<grid.baseTotal*0.8?'cs-warn':'k-muted')+'"><b>Realism check.</b> Lowest bid: '+esc(orgName(best.i.organization_id))+' at '+esc(money(best.t.total,r.currency))+', '+esc(String(Math.abs(round1((best.t.total-grid.baseTotal)/grid.baseTotal*100))))+'% '+(best.t.total<grid.baseTotal?'below':'above')+' the baseline'+(best.t.passThrough!==null&&best.t.passThrough!==undefined&&best.t.total?'; pass-through '+round1(best.t.passThrough/best.t.total*100)+'%':'')+'; '+plural(grid.cats.reduce((n,cat)=>n+cellOf(best.p,cat,r,grid).flags.length,0),'flagged assumption change')+(best.p.assumptions_delta?' and stated deviations':'')+'. A low price with changed assumptions is a change-order risk.</p>':'')+'<div class="k-row">'+cols.map(c=>bS('Lines of '+orgName(c.i.organization_id),'panel:proposal:'+c.p.id)).join('')+'</div>');}
 const subs=['rfp','rfi'].map(k=>xSubs(groupIdOf(r,k)).rows).flat(),wait=subs.filter(s=>!s.accepted&&!subs.some(x=>x.exchangeId===s.exchangeId&&x.version>s.version)),files=subs.filter(s=>!subs.some(x=>x.exchangeId===s.exchangeId&&x.version>s.version)).flatMap(s=>(s.files||[]).map(f=>({f,s}))).filter(x=>!x.f.accepted);
 const other=invs.filter(i=>i.status!=='declined');
 /* Revisions: only the latest submission per supplier is shown and accepted; the platform keeps every version. */
 const intake=(wait.length?list2(wait.map(s=>'<li><span><b>'+esc(invName(s.boundRecordId))+'</b> · version '+s.version+(s.version>1?' '+pill('Latest of '+s.version+' versions','blue'):'')+sub('Submitted '+stamp(s.submittedAt)+' · '+plural((s.files||[]).length,'file'))+'</span>'+bP('Review and accept','panel:accept:'+s.id,!WR||!s.data)+'</li>')):muted(inp.saved?'No submission is waiting.':'Shown in the saved app.'))+
  (files.length?'<h3>Files</h3>'+list2(files.map(x=>'<li><span>'+esc(x.f.filename)+sub(invName(x.s.boundRecordId)+' · v'+x.s.version+' · '+Math.max(1,Math.round(x.f.byteSize/1024))+' KB')+'</span><span class="k-row">'+field('files','ai_'+x.f.id,'AI-readable',false,{type:'checkbox'})+bS('Accept file','accept-file:'+x.f.id,!WR)+'</span></li>'))+muted('Tick AI-readable to let your assistant map the bid into the grid.'):'')+
  '<h3>Received another way</h3>'+(other.length?'<div class="k-row">'+other.map(i=>bS('Add a proposal for '+orgName(i.organization_id),'add:proposals:'+i.id,!canWrite('proposals'))).join('')+'</div>':muted('Add suppliers to this request on the Vendors screen first.'));
 if(!cols.length&&!wait.length)return html+empty('No proposal yet','Accepted proposals appear here side by side. Accept a submission, or add a proposal you received another way.',other.length?'Add a proposal for '+orgName(other[0].organization_id):'Open Vendors',other.length?'add:proposals:'+other[0].id:'nav:vendors',other.length&&!canWrite('proposals'))+sec('Submissions and files to accept','Accepting a submission creates the proposal; accepting a file makes it a TrialAgents document.',intake);
 return html+sec('Submissions and files to accept','Accepting a submission creates the proposal; accepting a file makes it a TrialAgents document.',intake);}

const checkTone={open:'amber',done:'green',not_applicable:'',issue:'red'};
function checklistBlock(r,scope,iid,title){const items=checksOf(r.id,scope,iid||''),w=canWrite('checklist');
 return '<div class="cs-block"><div class="cs-head"><h3>'+esc(title)+'</h3><span class="k-row">'+(items.length?pill(items.filter(c=>c.status==='done'||c.status==='not_applicable').length+' / '+items.length+' done',items.some(c=>c.status==='issue')?'red':items.every(c=>c.status==='done'||c.status==='not_applicable')?'green':'amber'):bP('Apply the checklist','apply-checklist:'+scope+':'+(iid||''),!w))+bS('Add item','add:checklist:'+scope+':'+(iid||''),!w)+'</span></div>'+
  (items.length?tbl(['Item','Status','Owner','Due',''],items.map(c=>row([esc(c.item)+(c.evidence_document_id||c.notes?sub([c.evidence_document_id?'evidence: '+docName(c.evidence_document_id):'',c.notes].filter(Boolean).join(' · ')):''),cellFor('checklist',c,'status','select',{label:'Status of '+c.item,options:CHECK_STATUS.map(s=>[s,s==='not_applicable'?'N/A':cap(s)]),show:s=>cap(s)}),cellFor('checklist',c,'owner','text',{label:'Owner of '+c.item}),cellFor('checklist',c,'due','date',{label:'Due date of '+c.item}),bS('Edit','open-editor:checklist:'+c.id,!w,'Edit '+c.item)+(scope==='bid_defence'?'':uploadBtn('evidence:'+c.id,'Evidence',w))]))):muted('No items yet.'))+'</div>';}
const attachNote=()=>st.attach&&lookup('checklist',st.attach.checkId)?'<div class="cs-review k-row"><span>A document was uploaded for "'+esc(lookup('checklist',st.attach.checkId).data.item)+'".</span>'+bP('Attach it','attach-evidence',!canWrite('checklist'))+bS('Dismiss','drop-attach')+'</div>':'';
function evaluationScreen(){const r=req;if(!r)return noRequest();let html=picker(false)+partialNote()+attachNote();
 const cs=critsOf(r.id),sum=weightSum(r.id),set=scoredSet(r),bs=blindState(r),rd=roundOf(r),w=canWrite('criteria');
 html+=sec('Weighted criteria','Capability before price. Weights add up to 100; a mandatory criterion with a mean score below 3 fails.',cs.length?tbl(['Criterion','Category','#Weight (%)','Mandatory',''],cs.map(c=>row([esc(c.name),esc(cap(c.category)),cellFor('criteria',c,'weight','number',{label:'Weight of '+c.name}),cellFor('criteria',c,'mandatory','boolean',{label:c.name+' is mandatory',show:v=>bool(v)?'Mandatory':'—'}),bS('Edit','open-editor:criteria:'+c.id,!w,'Edit '+c.name)])).concat([row(['Total','',sum+'%','',''],true)]))+(sum!==100?warnLine('The weights add up to '+sum+'%, not 100%. Weighted scores are comparable only when they do.'):''):empty('No criteria yet','Apply the built-in weighted set, or add your own criteria.','Apply the criteria set','apply-criteria',!w),cs.length?bS('Add criterion','add:criteria',!w):bS('Add criterion','add:criteria',!w));
 const priceOf=i=>{const p=latestProposal(i.id,rd);if(!p)return '—';const t=proposalTotals(p,r.currency);return money(t.total,t.currency);};
 html+=sec('Reviewer scorecards','Scores 1 to 5 with evidence. '+(BLIND?'Blind scoring is on: prices stay hidden here until scoring is complete.':'Blind scoring is off.'),
  (bs.hidden?'<p class="k-row">'+esc('Prices are hidden: '+(bs.reviewers.length?plural(bs.missing,'score')+' missing from '+plural(bs.reviewers.length,'reviewer')+'.':'no reviewer has scored yet.'))+bS('Reveal prices now','reveal',!WR)+'</p>':BLIND&&st.reveal[r.id]&&!bs.complete?'<p class="cs-warn k-row">Prices were revealed before scoring was complete. '+bS('Hide again','hide-prices')+'</p>':BLIND&&bs.complete?muted('Scoring is complete: prices are shown.'):'')+
  '<div class="k-row cs-bar">'+field('card','reviewer','Reviewer','',{placeholder:'Your name'})+btn('Open my scorecard','panel:card:open',{primary:true,disabled:!canWrite('scores')||!cs.length||!set.length})+'</div>'+
  tbl(['Supplier','#Weighted score','Mandatory','#Largest spread','#Price','Qualification'],set.map(i=>{const s=scoreOf(r,i.id),q=qualOf(r,i.id),sp=Object.values(s.per).map(x=>x.spread).filter(x=>x!==null);return row([esc(orgName(i.organization_id))+' '+invPill(i),(s.weighted!==null&&exact?s.weighted.toFixed(2)+' / 5':'—')+sub(s.scored+' of '+s.of+' criteria scored'),s.fails.length?pill('Fails mandatory: '+s.fails.join(', '),'red'):s.scored?pill('Passes','green'):'—',sp.length?String(Math.max(...sp)):'—',bs.hidden?'<span class="k-muted">Hidden</span>':esc(priceOf(i)),q.issues.length?pill('Issue: '+q.issues.length,'red'):q.ready?pill('Ready','green'):q.items.length?pill('In progress','amber'):'—']);}),'No supplier to score yet: accept proposals first, or mark finalists.')+(bs.reviewers.length?muted('Reviewers: '+bs.reviewers.join(', ')+'. Weighted score = Σ(mean score × weight) ÷ 100.'):''));
 const quals=invsOf(r.id).filter(i=>i.status!=='declined');
 html+=sec('Qualification','For any supplier, at any stage, with evidence documents. An open issue blocks the decision unless overridden with a reason.',quals.map(i=>checklistBlock(r,'qualification',i.id,orgName(i.organization_id))).join('')||muted('No supplier to qualify yet.'));
 if(r.mode==='full_selection'){const fin=invsOf(r.id).filter(i=>i.status==='finalist'||i.status==='selected');
  html+=sec('Bid defence','Agenda, attendees, notes and the proposed delivery team for 2 to 3 finalists.',fin.map(i=>checklistBlock(r,'bid_defence',i.id,orgName(i.organization_id))).join('')||muted('Mark 2 to 3 suppliers as finalists on the Vendors screen.'));}
 return html;}
function decisionScreen(){const r=req;if(!r)return noRequest();let html=picker(false)+xNote()+partialNote()+attachNote();
 const aw=awardOf(r.id),invs=invsOf(r.id),g=inp.saved?groupOf(r,'rfp'):null,wa=canWrite('awards');
 if(!aw)html+=empty('No decision yet','You decide, here or by asking your assistant; the app never chooses.','Record the decision','panel:decide:new',!wa||!invs.some(i=>i.status!=='declined'));
 else html+=sec('Decision','',
  '<div class="cs-two"><div>'+kv('Selected supplier',orgName(aw.organization_id))+kv('Awarded total',money(aw.total,aw.currency))+kv('Decided on',dateLabel(aw.decided_on))+kv('Approver',aw.approver)+'</div><div><div class="cs-kv"><span>Start date</span>'+cellFor('awards',aw,'start_date','date',{label:'Start date'})+'</div>'+kv('Duration',aw.duration_months===null?'—':plural(aw.duration_months,'month'))+kv('Delivery team',aw.delivery_team)+kv('Onboarding',cap(aw.onboarding_status||'in_progress'))+'</div></div>'+extraBlock('awards',aw)+'<h3>Rationale</h3><div class="cs-report">'+esc(aw.rationale||'')+'</div>',bS('Edit award details','panel:award:'+aw.id,!wa));
 if(!aw)return html;
 const msgs=g?xMsgs(g.id).rows:[],noticed=i=>{const e=exchangeOf(g,i.id);return e&&msgs.find(m=>m.kind==='private'&&m.author==='workspace'&&m.exchangeId===e.id&&String(m.createdAt).slice(0,10)>=aw.decided_on);},told=invs.filter(i=>['selected','not_selected'].includes(i.status));
 html+=sec('Notify all suppliers','One confirmation sends a private message and email to each: the winner gets next steps, the others a thank-you with a debrief offer.',!g?muted(inp.saved?'This request has no round, so there is nobody to notify through the exchange.':'Shown in the saved app.'):
  list2(told.map(i=>{const n=noticed(i),e=exchangeOf(g,i.id);return '<li><span>'+esc(orgName(i.organization_id))+' '+invPill(i)+'</span>'+(n?pill('Notified '+stamp(n.createdAt),'green'):e?pill('Not notified','amber'):pill('No link',''))+'</li>';}))+
  '<form data-action="notify-all"><div class="cs-two">'+field('notify','winner','Text for the selected supplier',DECISION_TEXT.winner,{type:'textarea',hint:'{supplier} and {request} are filled in.'})+field('notify','others','Text for the others (with the debrief offer)',DECISION_TEXT.others,{type:'textarea'})+'</div><div class="k-row">'+submit(told.some(i=>noticed(i))?'Notify all again':'Notify all',WR&&told.some(i=>exchangeOf(g,i.id)),{plain:told.some(i=>noticed(i))})+'</div></form>');
 const ag=aw.agreement_id?lookup('agreements',aw.agreement_id):null,items=checksOf(r.id,'onboarding',''),done=items.length>0&&items.every(c=>c.status==='done'||c.status==='not_applicable');
 html+=sec('Onboarding','From the signed contract to the kick-off.',kv('Award contract',ag?String(ag.data.name||'')+' — '+cap(ag.data.status||'no status')+' (its status is kept in Contracts)':R.agreements.unbound?'Agreements are not connected':'Not linked yet')+(items.length&&(aw.onboarding_status||'in_progress')!==(done?'complete':'in_progress')||STAGES.indexOf(r.stage)<STAGES.indexOf('onboarding')?'<div class="k-row cs-bar">'+bP(done?'Mark onboarding complete':'Start onboarding','onboarding-status',!wa)+'</div>':'')+checklistBlock(r,'onboarding','','Onboarding checklist'));
 const h=aw.handoff,nameA=awardAgreementName(r,aw),draftAg=!aw.agreement_id?R.agreements.rows.find(a=>a.data.name===nameA&&a.data.counterparty_id===aw.organization_id):null;
 html+=sec('Award handoff','One action prepares the award for the apps you use.',(draftAg?'<div class="cs-review k-row"><span>The draft agreement is in the register.</span>'+bP('Link it to the award','link-agreement',!wa)+'</div>':'')+
  (h?'<ul class="cs-list cs-plain"><li><b>Contracts</b>: '+esc(ag?'agreement "'+ag.data.name+'" ('+cap(ag.data.status||'')+').':h.agreement&&h.agreement.state==='draft_prepared'?'draft agreement "'+h.agreement.name+'" in the shared agreements register; complete it in Contracts.':h.agreement&&h.agreement.state==='existing'?'an agreement already exists.':'the agreements register is not connected; the award stays here.')+'</li><li><b>Runway</b>: reads this award directly (Plan → From other sources → Add to plan).</li><li><b>Programs</b>: '+esc(h.programs&&h.programs.milestones&&h.programs.milestones.length?h.programs.milestones.map(m=>m.name+' ('+dateLabel(m.date)+')').join('; ')+'. Ask your assistant to add them in Programs.':'needs a start date.')+'</li><li><b>CRO Oversight and Trial Finance</b>: read this award as their baseline.</li></ul>'+muted('Prepared on '+dateLabel(validDate(h.prepared_on))+'.'):muted('Not prepared yet.'))+
  '<div class="k-row">'+btn(h?'Prepare again':'Prepare the handoff','prepare-handoff',{primary:!h,disabled:!wa})+(r.stage!=='closed'?btn('Close the request','stage:closed',{disabled:!canWrite('requests')}):'')+'</div>');
 return html;}
/* Emails (3.0.0, G6): the texts suppliers receive have their own screen; Settings keeps only business choices. */
function emailsScreen(){const d=draftOf('email'),kind=KINDS.includes(d.kind)?d.kind:'rfp',cur=inviteText(kind),w=canWrite('settings');
 if(d.loaded!==kind){d.subject=cur.subject;d.body=cur.body;d.loaded=kind;}
 const ws=inp.saved?xcall('exchange.defaultEmail',{emailType:'invitation'}):null;
 return partialNote()+sec('Invitation email','One invitation text per request kind. Reminders, clarifications, messages and deadline notices use the TrialAgents defaults. Every email can be personalised again before it is sent.','<form data-action="save-email"><div class="cs-form">'+field('email','kind','Request kind','rfp',{type:'select',options:opts(KINDS,KIND_LABEL)})+field('email','subject','Subject',cur.subject,{wide:true})+field('email','body','Text',cur.body,{type:'textarea',tall:true,wide:true,hint:'Placeholders: {recipient_name} {recipient_company} {sender_name} {sender_company} {title} {deadline} {link}. TrialAgents always adds the link, the sender and the footer.'})+'</div><div class="k-row">'+pill(cur.source==='saved'?'Saved text':'Built-in text',cur.source==='saved'?'blue':'')+(ws&&ws.source==='workspace'?pill('A workspace default replaces it','amber'):'')+submit('Save for '+KIND_LABEL[kind],w)+btn('Use the built-in text','reset-email',{disabled:!w||cur.source!=='saved'})+btn('Save as the workspace default','save-workspace-email',{disabled:!WR})+(ws&&ws.source==='workspace'?btn('Remove the workspace default','clear-workspace-email',{disabled:!WR}):'')+'</div></form>')+
  sec('Decision notices','Sent with Notify all on the Decision screen. {supplier} and {request} are filled in.','<form data-action="save-settings"><div class="cs-form">'+field('settings','winner','Selected supplier',DECISION_TEXT.winner,{type:'textarea',wide:true})+field('settings','others','The others, with the debrief offer',DECISION_TEXT.others,{type:'textarea',wide:true})+'</div><div class="k-row">'+submit('Save the notices',w)+'</div></form>');}
/* Settings (G6): business choices only, for the app's owners. */
function settingsScreen(){if(!OWNER)return muted('Only the app’s owners change its settings.');if(st.settingsVersion===undefined&&settingsRow)st.settingsVersion=settingsRow.version;
 return sec('Defaults','Questions and cost categories start from built-in defaults for each service type and are edited on each request.','<form data-action="save-settings"><div class="cs-form">'+field('settings','default_currency','Default currency',CURRENCY,{type:'select',options:opts(CURRENCIES,{})})+field('settings','question_deadline_days','Question deadline: days before the response deadline',QDAYS,{type:'number',min:0,max:60})+field('settings','confidentiality_text','Confidentiality text (suppliers accept it before they see documents)',CONFIDENTIALITY,{type:'textarea',wide:true})+field('settings','blind_scoring','Blind scoring: hide prices in Evaluation until every reviewer has scored',BLIND,{type:'checkbox'})+'</div><div class="k-row">'+submit('Save settings',canWrite('settings'))+'</div></form>');}

function editorPanel(){const x=st.editor;if(!x)return '';const role=x.role,m=roleMap[role],d=x.draft;
 const ctl=f=>{const c=' name="'+f.key+'" data-action="draft:'+f.key+'"',v=d[f.key]===null||d[f.key]===undefined?'':d[f.key];
  if(f.kind==='select')return '<select'+c+'>'+(f.required?'':'<option value="">—</option>')+f.options.map(o=>'<option value="'+esc(o)+'"'+(String(v)===o?' selected':'')+'>'+esc((f.key==='mode'?MODE_LABEL:f.key==='service_type'?SERVICE_LABEL:f.key==='cda_option'?CDA_LABEL:f.key==='status'&&role==='invitations'?INV_LABEL:{})[o]||cap(o))+'</option>').join('')+'</select>';
  if(f.kind==='ref'){const rows=R[f.ref].rows;return '<select'+c+'><option value="">—</option>'+(v&&!rows.some(r=>r.id===v)?'<option value="'+esc(v)+'" selected>'+esc(refName(f.ref,v))+'</option>':'')+rows.map(r=>'<option value="'+esc(r.id)+'"'+(v===r.id?' selected':'')+'>'+esc(r.data.name||'Unnamed')+'</option>').join('')+'</select>';}
  if(f.kind==='boolean')return '<input type="checkbox"'+c+(bool(v)?' checked':'')+'>';
  if(f.kind==='longtext'||f.kind==='lines')return '<textarea rows="5"'+c+(f.kind==='lines'?' placeholder="Empty: the built-in defaults for the service type"':'')+'>'+esc(v)+'</textarea>';
  return '<input type="'+(f.kind==='number'?'number':f.kind==='date'?'date':'text')+'"'+(f.kind==='number'?' step="any"'+(f.extra?'':' min="0"'):'')+c+' value="'+esc(v)+'">';};
 const ta=(key,lab,hint)=>'<label class="k-field"><span>'+esc(lab)+'</span><textarea rows="5" name="'+key+'" data-action="draft:'+key+'">'+esc(d[key]||'')+'</textarea><small class="k-muted">'+esc(hint)+'</small></label>';
 const fields=formFields(role,fieldsOf(role).filter(f=>f.kind!=='frozen'&&f.key!=='archived'&&m&&m.fields[f.key]&&!(f.kind==='ref'&&R[f.ref].unbound)&&!(role==='requests'&&f.key==='cda_gate'&&d.cda_option!=='send_pdf')&&!(f.kind==='readonly'&&x.mode==='create')));
 const body=fields.map((f,i)=>(f.extra&&!(i&&fields[i-1].extra)?'<h3>Additional fields</h3>':'')+(f.kind==='readonly'?kv(fieldLabel(role,f),d[f.key]):f.kind==='lines'&&role==='requests'&&f.key==='rfi_questions'&&d.mode==='quick_quote'?'':f.kind==='assumptions'?ta('assume_notes','Sponsor assumptions','The assumptions every supplier prices against: countries, sites, patients, visits, duration.')+ta('assume_baseline','Sponsor baseline by cost category','One line per category: Category | amount, in the request currency. Bids are compared with it.')
  :f.kind==='boolean'?'<label class="cs-check">'+ctl(f)+'<span>'+esc(fieldLabel(role,f))+'</span></label>':'<label class="k-field"><span>'+esc(fieldLabel(role,f))+(f.required?' *':'')+'</span>'+ctl(f)+'</label>')).join('');
 return drawer((x.mode==='edit'?'Edit ':'Add ')+ROLE_LABEL[role],body,btn('Cancel','close')+submit(x.mode==='edit'?'Save':'Add '+ROLE_LABEL[role],canWrite(role)),'save-record');}
function sidePanel(){const x=st.panel;if(!x)return '';const r=req;
 if(x.type==='round'&&r){const round=x.id==='rfi'?'rfi':'rfp',rl=round==='rfi'?'RFI':r.mode==='quick_quote'?'quote':'RFP',cda=round==='rfp'&&r.cda_option==='send_pdf',L=docsList();
  return drawer('Create the '+rl+' round',field('round','title','Title suppliers see',(round==='rfi'?'RFI: ':r.mode==='quick_quote'?'Quote request: ':'RFP: ')+String(r.name||''),{required:true})+field('round','summary','Brief',briefFor(r,round),{type:'textarea',tall:true,hint:'Built from the scope, your assumptions and the question set. Suppliers answer the numbered questions and '+(round==='rfi'?'add notes.':'enter price, currency, timeline and up to 10 files of 25 MB.')})+
   '<h3>Request pack</h3>'+docChecks('round',[])+'<div class="k-row">'+uploadBtn('rfp_pack:'+r.id,'Upload a document')+'</div>'+
   (cda?'<h3>CDA</h3>'+field('round','cda_document','CDA to sign (PDF)','',{type:'select',blank:'Choose the CDA document',options:L.docs.slice(0,60).map(v=>[v.versionId,v.filename])})+'<div class="k-row">'+uploadBtn('cda:'+r.id,'Upload the CDA')+'</div>'+muted('Suppliers download it and upload the signed PDF into the "Signed CDA" slot. '+(bool(r.cda_gate)?'Gate on: the request pack stays locked for a supplier until you accept its signed CDA.':'Gate off: suppliers accept the confidentiality text before they see documents.')):round==='rfp'&&r.cda_option==='contracts'?muted('CDA through Contracts: file each signed CDA as an agreement from the supplier details.'):'')+
   field('round','verify_email','Recipients confirm their email address with a one-time code',true,{type:'checkbox'})+muted('Nothing reaches suppliers when you create the round. Confidentiality text: '+CONFIDENTIALITY.slice(0,160)+(CONFIDENTIALITY.length>160?'…':'')),btn('Cancel','close')+submit('Create the round',WR),'create-round');}
 if(x.type==='brief'&&r){const g=groupOf(r,st.round);if(!g)return '';return drawer('Edit the brief',field('brief','title','Title',g.title,{required:true})+field('brief','summary','Brief',g.summary,{type:'textarea',tall:true}),btn('Cancel','close')+submit('Update the brief',WR),'save-brief');}
 if(x.type==='clar'&&r){return drawer('Clarification or addendum',field('clar','question','Question (optional; shown as "A recipient asked")','',{type:'textarea',hint:'Leave empty for an addendum. Remove anything that identifies the supplier who asked.'})+field('clar','body','Answer or addendum','',{type:'textarea',tall:true,required:true})+field('clar','notify','Email every supplier a notice with the link',true,{type:'checkbox'}),btn('Cancel','close')+submit('Publish to all',WR),'publish');}
 if(x.type==='supplier'){const i=INV[x.id];if(!i)return '';const rq=REQ[i.request_id],org=lookup('organizations',i.organization_id);let body=kv('Stage',INV_LABEL[i.status])+kv('Recipients',i.emails.join(', '))+kv('Country',org&&org.data.country)+kv('Notes',i.notes)+extraBlock('invitations',i)+(org?extraBlock('organizations',org.data):'');
  for(const rd of ['rfi','rfp']){const g=inp.saved?groupOf(rq,rd):null,e=exchangeOf(g,i.id);if(!e)continue;const s=e.status||{};
   body+='<h3>'+(rd==='rfi'?'RFI':rq.mode==='quick_quote'?'Quote':'RFP')+' round</h3>'+statusChips(e)+kv('Deadline',stamp(e.expiresAt))+kv('First opened',stamp(s.opened))+kv('Downloads',(s.downloads||[]).map(v=>v.filename).join(', '))+kv('Draft saved',stamp(s.draftSavedAt));
   for(const dbk of s.documentsBack||[])body+='<div class="cs-kv"><span>'+esc(dbk.label)+'</span><b>'+esc(cap(dbk.status))+(dbk.status==='received'?' '+bP('Accept the file','accept-file:'+dbk.fileId+(dbk.slot==='signed_cda'?':'+i.id:''),!WR):'')+'</b></div>';
   if(!e.revokedAt)body+='<form class="k-row cs-bar" data-action="extend:'+esc(e.id)+'"><label class="k-field"><span>Extend by days</span><input type="number" min="1" max="90" name="days" value="7" data-action="f:ext:days"></label><label class="cs-check"><input type="checkbox" name="notify" checked data-action="f:ext:notify"><span>Email the new deadline</span></label>'+submit('Extend',WR,{small:true,plain:true})+'</form><form class="k-row cs-bar" data-action="revoke:'+esc(e.id)+'"><label class="k-field"><span>Reason</span><input name="reason" data-action="f:rev:reason" value="'+esc(draftOf('rev').reason||'')+'"></label>'+submit('Stop the link',WR,{small:true,plain:true,danger:true})+'</form>';}
  body+='<h3>CDA</h3>'+kv('Request option',CDA_LABEL[rq.cda_option])+kv('Status',i.cda_status?CDA_STATUS_LABEL[i.cda_status]+(i.cda_in_place_on?' since '+dateLabel(validDate(i.cda_in_place_on)):''):'—')+(i.cda_agreement_id?kv('Agreement',refName('agreements',i.cda_agreement_id)):'')+
   (rq.cda_option==='contracts'?'<div class="k-row cs-bar">'+bP(R.agreements.rows.some(a=>a.data.name===cdaName(i,rq)&&a.data.counterparty_id===i.organization_id)?'Link the CDA agreement':'File the signed CDA as an agreement','cda-file:'+i.id,!canWrite('agreements')||!!i.cda_agreement_id)+'</div>'+muted('Creates a CDA / NDA agreement in the shared register that Contracts uses.'):'')+
   (rq.cda_option==='skip'||rq.cda_option==='none'?'<form class="k-row cs-bar" data-action="cda-elsewhere:'+esc(i.id)+'"><label class="k-field"><span>CDA in place elsewhere since</span><input type="date" name="cda_in_place_on" data-action="f:cda:on" value="'+esc(validDate(i.cda_in_place_on))+'"></label>'+submit('Record',canWrite('invitations'),{small:true,plain:true})+'</form>':'');
  return drawer(orgName(i.organization_id)+' · '+String(rq.name||''),body,btn('Edit invitation','open-editor:invitations:'+i.id,{disabled:!canWrite('invitations')})+btn('Close','close'));}
 if(x.type==='accept'&&r){const sub_=['rfp','rfi'].map(k=>xSubs(groupIdOf(r,k)).rows).flat().find(v=>v.id===x.id);if(!sub_||!sub_.data)return drawer('Submission',muted('This submission can no longer be accepted here.'));
  const m=roleMap.proposals,val=k=>sub_.data[m.fields[k]],inv=INV[sub_.boundRecordId],isRfi=groupIdOf(r,'rfi')===sub_.groupId&&r.mode!=='quick_quote',keys=FORM_FIELDS[isRfi?'rfi':roundOf(r)];
  return drawer('Accept version '+sub_.version+' from '+invName(sub_.boundRecordId),muted('A supplier statement until you accept it. Check the values; acceptance creates the proposal with them and keeps the original submission.')+'<div class="cs-two">'+keys.map(k=>k==='currency'?field('accept','currency','Currency',val(k)||r.currency,{type:'select',options:opts(CURRENCIES,{})}):['answers','assumptions_delta','notes'].includes(k)?field('accept',k,S.proposals.find(f=>f.key===k).label,val(k),{type:'textarea',wide:true,tall:k==='answers'}):field('accept',k,S.proposals.find(f=>f.key===k).label,val(k),{type:'number',min:0,step:'any'})).join('')+'</div>'+muted('Submitted '+stamp(sub_.submittedAt)+' by '+(inv?orgName(inv.organization_id):'this supplier')+'. '+plural((sub_.files||[]).length,'file')+' attached; accept files separately.'),btn('Cancel','close')+submit('Accept into proposals',WR),'accept-submit');}
 if(x.type==='card'&&r){const cs=critsOf(r.id),set=scoredSet(r),mine=SCORES.filter(s=>s.request_id===r.id&&s.reviewer===x.reviewer),d=draftOf('scores');
  return drawer('Scorecard of '+x.reviewer,(BLIND&&blindState(r).hidden?muted('Blind scoring: prices are hidden.'):'')+set.map(i=>'<div class="cs-block"><h3>'+esc(orgName(i.organization_id))+'</h3>'+cs.map(c=>{const k=i.id+'_'+c.id,old=mine.find(s=>s.invitation_id===i.id&&s.criterion_id===c.id),sv=has(d,'s_'+k)?d['s_'+k]:old?String(old.score):'';return '<div class="cs-two"><label class="k-field"><span>'+esc(c.name)+' ('+c.weight+'%'+(c.mandatory?', mandatory':'')+')</span><select name="s_'+k+'" data-action="f:scores:s_'+k+'"><option value="">Not scored</option>'+[1,2,3,4,5].map(n=>'<option value="'+n+'"'+(String(sv)===String(n)?' selected':'')+'>'+n+'</option>').join('')+'</select></label><label class="k-field"><span>Evidence</span><input name="e_'+k+'" data-action="f:scores:e_'+k+'" value="'+esc(has(d,'e_'+k)?d['e_'+k]:old?old.evidence||'':'')+'"></label></div>';}).join('')+'</div>').join(''),btn('Cancel','close')+submit('Save scores',canWrite('scores')),'save-scores');}
 if(x.type==='decide'&&r){const cands=invsOf(r.id).filter(i=>i.status!=='declined'),d=draftOf('decide'),pick=INV[d.invitation_id],q=pick?qualOf(r,pick.id):null,s=pick?scoreOf(r,pick.id):null,grp=inp.saved&&groupOf(r,'rfp');
  return drawer('Record the decision',field('decide','invitation_id','Selected supplier','',{type:'select',blank:'Choose the supplier',required:true,options:cands.map(i=>[i.id,orgName(i.organization_id)])})+(q&&q.issues.length?'<p class="cs-error">Qualification issue: '+esc(q.issues.map(c=>c.item).join('; '))+'. Resolve it, or give an override reason.</p>'+field('decide','override_reason','Override reason','',{type:'textarea'}):q&&!q.ready?warnLine('Qualification is not complete for this supplier.'):'')+(s&&s.fails.length?warnLine('Fails a mandatory criterion: '+s.fails.join(', ')+'.'):'')+field('decide','rationale','Rationale','',{type:'textarea',tall:true,required:true,hint:'Your assistant can draft this from the scores; you decide.'})+'<div class="cs-two">'+field('decide','approver','Approver','',{required:true})+field('decide','decided_on','Decision date',AS_OF,{type:'date',required:true})+field('decide','start_date','Planned start','',{type:'date'})+'</div>'+field('decide','delivery_team','Delivery team (as proposed)','',{type:'textarea'})+(grp?field('decide','notify','Notify all suppliers with the decision (one confirmation)',true,{type:'checkbox'})+'<div class="cs-two">'+field('decide','winner','Text for the selected supplier',DECISION_TEXT.winner,{type:'textarea'})+field('decide','others','Text for the others',DECISION_TEXT.others,{type:'textarea'})+'</div>':'')+muted('Saves the award, marks this supplier selected and the others not selected'+(grp?'. With the notices ticked, you confirm the decision and the notices together before anything is sent':'')+'.'),btn('Cancel','close')+submit('Save the decision',canWrite('awards')),'decide');}
 if(x.type==='award'&&r){const aw=awardOf(r.id);if(!aw)return '';if(x.version===undefined)x.version=aw.version;
  return drawer('Award details',field('award','start_date','Start date',aw.start_date,{type:'date'})+field('award','delivery_team','Delivery team (confirmed)',aw.delivery_team,{type:'textarea'})+(R.agreements.unbound?'':field('award','agreement_id','Award agreement',aw.agreement_id||'',{type:'select',blank:'Not linked',options:R.agreements.rows.filter(a=>!a.data.counterparty_id||a.data.counterparty_id===aw.organization_id).map(a=>[a.id,String(a.data.name||'Unnamed')])})),btn('Cancel','close')+submit('Save',canWrite('awards')),'save-award');}
 if(x.type==='proposal'){const p=PROP[x.id];if(!p)return '';const ls=linesOf(p.id),w=canWrite('lines');
  return drawer('Proposal of '+invName(p.invitation_id)+' · '+ROUND_LABEL[p.round]+' v'+p.version,kv('Stated total',money(p.total,p.currency))+kv('Submitted',dateLabel(p.submitted_on))+kv('Accepted',dateLabel(p.accepted_on))+kv('Documents',list(p.document_ids).map(docName).join(', '))+extraBlock('proposals',p)+(p.answers?'<h3>Answers</h3><div class="cs-report">'+esc(p.answers)+'</div>':'')+'<h3>Lines in the bid grid</h3>'+tbl(['Category','#Amount','Deviation',''],ls.map(l=>row([esc(l.category)+sub(l.description||''),cellFor('lines',l,'amount','number',{label:'Amount of '+l.category}),esc(l.deviation||'—'),bS('Edit','open-editor:lines:'+l.id,!w,'Edit '+l.category)])),'No lines yet. Add them here, or ask your assistant to add them from the accepted file.')+muted('Set a line’s amount to 0 to drop it from the total.'),btn('Add line','add:lines:'+p.id,{disabled:!w})+btn('Edit proposal','open-editor:proposals:'+p.id,{disabled:!canWrite('proposals')})+btn('Close','close'));}
 return '';}

/* ---------- app commands (2.1.0; in 3.0.0 their record changes save directly) ---------- */
/* Every propose command replays the events a person's clicks and form submits send, through the same handler (handle), so the
 * proposal is identical to the click path. Read commands return this app's own figures; assistants never compute them.
 * Supplier communication is never a command: xwrite refuses it, and the platform refuses exchange writes outside a person's click. */
const EDIT_ROLES=['requests','organizations','people','invitations','proposals','lines','criteria','checklist'];
const ROLE_ALIAS={vendors:'organizations',contacts:'people',proposal_lines:'lines',checklist_items:'checklist'};
const CREATE_HINT={requests:'record.save without id; fields.mode quick_quote or full_selection',organizations:'record.save (org_type cro, cdmo or other for labs)',people:'record.save with fields.organization_id',invitations:'longlist.add; edit with record.save and id',proposals:'record.save with context.invitation_id, for a proposal received another way (submissions are accepted by a person in Proposals)',lines:'lines.save',criteria:'record.save with context.request_id, or criteria.apply_defaults',checklist:'record.save with context.request_id and context.scope (and context.invitation_id), or checklist.apply_defaults'};
const roleOf=v=>{const r=ROLE_ALIAS[v]||v;if(!EDIT_ROLES.includes(r))throw Error('Unknown form: '+v+'. Use schema.describe.');return r;};
const cneed=(v,k)=>{if(v[k]===undefined||v[k]===null||v[k]==='')throw Error('Missing input: '+k+'.');return v[k];};
const formValue=x=>x===null||x===undefined?'':typeof x==='boolean'?x:typeof x==='object'?JSON.stringify(x):String(x);
const reqNeed=v=>useRequest(String(cneed(v,'request_id')));
function requestOf(role,row){if(!row)return null;const d=row.data||row;return role==='requests'?row.id:['invitations','criteria','checklist'].includes(role)?d.request_id:role==='proposals'?(INV[d.invitation_id]||{}).request_id:role==='lines'?(INV[(PROP[d.proposal_id]||{}).invitation_id]||{}).request_id:null;}
function invNeed(v){const i=INV[cneed(v,'invitation_id')];if(!i)throw Error('That supplier is not on a request.');if(REQ[i.request_id])useRequest(i.request_id);return i;}
const editable=role=>fieldsOf(role).filter(f=>f.kind!=='frozen'&&f.kind!=='readonly'&&f.key!=='archived'&&roleMap[role]&&roleMap[role].fields[f.key]);
const extraValues=(role,row)=>Object.fromEntries((roleMap[role]&&roleMap[role].extra||[]).filter(f=>row&&row[f.key]!==null&&row[f.key]!==undefined&&row[f.key]!=='').map(f=>[f.key,row[f.key]]));
function recordSave(v){const role=roleOf(String(cneed(v,'role')));if(!roleMap[role])throw Error('The '+ROLE_LABEL[role]+' table is not connected.');
 const c=v.context&&typeof v.context==='object'?v.context:{},f=v.fields&&typeof v.fields==='object'?v.fields:{};
 if(v.id){const row=lookup(role,String(v.id));if(!row)throw Error('That '+ROLE_LABEL[role]+' is not available.');const rid=requestOf(role,row);if(rid&&REQ[rid])useRequest(rid);handle({kind:'click',action:'open-editor:'+role+':'+row.id});}
 else{if(role==='invitations')throw Error('Add a supplier to a request with longlist.add.');
  const rid=c.request_id||(role==='proposals'&&INV[c.invitation_id]?INV[c.invitation_id].request_id:role==='lines'&&PROP[c.proposal_id]?requestOf('lines',{data:{proposal_id:c.proposal_id}}):null);
  if(['criteria','checklist'].includes(role)&&!rid)throw Error('Give context.request_id.');if(rid)useRequest(String(rid));
  if(role==='proposals'&&!INV[c.invitation_id])throw Error('Give context.invitation_id of a supplier on a request.');if(role==='lines'&&!PROP[c.proposal_id])throw Error('Give context.proposal_id of an existing proposal.');
  const arg=role==='requests'?(f.mode==='quick_quote'?'quick_quote':'full_selection'):role==='people'?String(f.organization_id||c.organization_id||''):role==='proposals'?String(c.invitation_id):role==='lines'?String(c.proposal_id)+':'+String(f.category||''):role==='checklist'?String(cneed(c,'scope'))+':'+String(c.invitation_id||''):'';
  handle({kind:'click',action:'add:'+role+(arg?':'+arg:'')});}
 if(!st.editor)throw Error(NOTICE&&NOTICE.message||'The form could not be opened.');
 const fields=editable(role),form={};
 for(const [k,val] of Object.entries(f)){
  if(role==='requests'&&k==='assumptions'){const a=val&&typeof val==='object'?val:{};if(has(a,'notes'))form.assume_notes=formValue(a.notes);if(has(a,'baseline'))form.assume_baseline=(Array.isArray(a.baseline)?a.baseline:[]).map(b=>String(b&&b.category||'')+' | '+String(b&&b.amount!==undefined&&b.amount!==null?b.amount:'')).join('\n');continue;}
  const fd=fields.find(y=>y.key===k);if(!fd)throw Error('Not an editable field of the '+ROLE_LABEL[role]+' form: '+k+'. Use schema.describe.');
  form[k]=fd.kind==='boolean'?val===true||val==='true':fd.kind==='lines'&&Array.isArray(val)?val.map(String).join('\n'):fd.kind==='emails'&&Array.isArray(val)?val.join(', '):formValue(val);}
 handle({kind:'submit',action:'save-record',form});return {};}
const click=a=>{handle({kind:'click',action:a});return {};};
function overviewResult(){const o=overviewData(),aw=AWARDS.slice().sort((a,b)=>String(b.decided_on).localeCompare(String(a.decided_on))).slice(0,6);
 return {as_of:AS_OF||null,exact,read_problems:readProblems,exchange_complete:o.xOk,
  requests:REQS.map(r=>{const a=awardOf(r.id);return {id:r.id,name:r.name||null,mode:r.mode,service_type:r.service_type,stage:r.stage,stage_label:STAGE_LABEL[r.stage],response_deadline:r.response_deadline||null,decision_due:r.decision_due||null,owner:r.owner||null,responses:inp.saved?responses(r):null,award:a?{organization_id:a.organization_id,supplier:orgName(a.organization_id)}:null};}),
  waiting_on_us:{complete:o.xOk&&exact,items:o.waiting.map(x=>({request_id:x.r.id,request:x.r.name||null,text:x.text,screen:x.to,at:x.at||null}))},
  due:o.due.map(x=>({request_id:x.r.id,request:x.r.name||null,what:x.text,date:x.d,in:inDays(x.d),screen:x.to})),
  recent_awards:aw.map(a=>({request_id:a.request_id,organization_id:a.organization_id,supplier:orgName(a.organization_id),total:a.total,currency:a.currency,decided_on:a.decided_on||null}))};}
function awardResult(a){return {id:a.id,organization_id:a.organization_id,supplier:orgName(a.organization_id),service_type:a.service_type,total:a.total,currency:a.currency,start_date:a.start_date||null,duration_months:a.duration_months,rationale:a.rationale||null,approver:a.approver||null,decided_on:a.decided_on||null,delivery_team:a.delivery_team||null,agreement_id:a.agreement_id||null,onboarding_status:a.onboarding_status||'in_progress',handoff:a.handoff,additional:extraValues('awards',a)};}
function requestResult(r){const rd=roundOf(r),a=awardOf(r.id);
 return {exact,request:{id:r.id,name:r.name||null,mode:r.mode,service_type:r.service_type,program_id:r.program_id||null,study_id:r.study_id||null,scope:r.scope||null,assumptions:{notes:r.assume.notes||'',baseline:baselineOf(r)},budget_estimate:r.budget_estimate,currency:r.currency,stage:r.stage,stage_label:STAGE_LABEL[r.stage],cda_option:r.cda_option||null,cda_gate:bool(r.cda_gate),question_deadline:r.question_deadline||null,response_deadline:r.response_deadline||null,decision_due:r.decision_due||null,owner:r.owner||null,questions:questionsFor(r,'rfp'),rfi_questions:r.mode==='full_selection'?questionsFor(r,'rfi'):[],cost_categories:gridOf(r,[]).cats,additional:extraValues('requests',r)},
  stages:stagesOf(r.mode),rounds:inp.saved?{rfi:!!groupIdOf(r,'rfi'),rfp:!!groupIdOf(r,'rfp')}:null,
  suppliers:invsOf(r.id).map(i=>{const p=latestProposal(i.id,rd),t=p?proposalTotals(p,r.currency):null,live={};
   if(inp.saved)for(const k of ['rfi','rfp']){const e=exchangeOf(groupOf(r,k),i.id);if(e){const s=e.status||{};live[k]={opened:!!s.opened,draft_saved:!!s.draftSavedAt,submitted_version:s.submitted?s.submitted.version:null,submission_accepted:!!(s.submitted&&s.submitted.accepted),unread_messages:s.unreadMessages||0,link_stopped:!!(s.revokedAt||e.revokedAt),deadline:e.expiresAt||null};}}
   return {invitation_id:i.id,organization_id:i.organization_id,supplier:orgName(i.organization_id),status:i.status,cda_status:i.cda_status||null,recipient_emails:i.emails,latest_proposal:p?{id:p.id,version:p.version,total:t.total,currency:t.currency,from_lines:t.fromLines}:null,exchange:inp.saved?live:null,additional:extraValues('invitations',i)};}),
  award:a?awardResult(a):null,summary_for_leadership:summaryText(r)};}
function gridResult(r){const rd=roundOf(r),cols=invsOf(r.id).map(i=>({i,p:latestProposal(i.id,rd)})).filter(x=>x.p).map(x=>({...x,t:proposalTotals(x.p,r.currency)})),grid=gridOf(r,cols.map(c=>c.p));
 const best=cols.filter(c=>c.t.total!==null&&c.t.currency===r.currency).sort((a,b)=>a.t.total-b.t.total)[0];
 return {request_id:r.id,currency:r.currency,exact,rule:'Latest accepted version per supplier. Deviation = proposal − baseline. Other currencies are listed, never converted or compared.',baseline:{by_category:baselineOf(r),total:grid.baseTotal},categories:grid.cats,
  suppliers:cols.map(c=>{const same=c.t.currency===r.currency,dev=same&&c.t.total!==null&&grid.baseTotal!==null?round2(c.t.total-grid.baseTotal):null;
   return {invitation_id:c.i.id,supplier:orgName(c.i.organization_id),proposal_id:c.p.id,version:c.p.version,currency:c.t.currency,compared_with_baseline:same,total:c.t.total,total_from_lines:c.t.fromLines,stated_total:c.t.stated,stated_total_differs:!!(c.t.fromLines&&c.t.stated!==null&&c.t.total!==null&&Math.abs(c.t.stated-c.t.total)>0.005),deviation:dev,deviation_pct:dev!==null&&grid.baseTotal?round1(dev/grid.baseTotal*100):null,other_currencies:c.t.others,pass_through:c.t.passThrough===undefined?null:c.t.passThrough,pass_through_pct:c.t.passThrough!==null&&c.t.passThrough!==undefined&&c.t.total?round1(c.t.passThrough/c.t.total*100):null,start_weeks:c.p.start_weeks,duration_months:c.p.duration_months,stated_deviations:c.p.assumptions_delta||null,
    cells:grid.cats.map(cat=>{const x=cellOf(c.p,cat,r,grid);return {category:cat,amount:x.amount,baseline:x.base,deviation:x.dev,deviation_pct:x.pct,flags:x.flags,other_currencies:x.other};})};}),
  lowest_bid:best&&grid.baseTotal?{supplier:orgName(best.i.organization_id),total:best.t.total,pct_vs_baseline:round1((best.t.total-grid.baseTotal)/grid.baseTotal*100),below_80_pct:best.t.total<grid.baseTotal*0.8}:null};}
function evaluationResult(r){const cs=critsOf(r.id),set=scoredSet(r),bs=blindState(r),rd=roundOf(r),qual=i=>{const q=qualOf(r,i.id);return {ready:q.ready,issues:q.issues.map(c=>({id:c.id,item:c.item})),items:q.items.map(c=>({id:c.id,item:c.item,status:c.status,owner:c.owner||null,due:c.due||null}))};};
 return {request_id:r.id,exact,rule:'Weighted score = Σ(mean reviewer score × weight) ÷ 100 on a 1 to 5 scale; a mandatory criterion with a mean below 3 fails; spread = max − min; no score is inferred.',criteria:cs.map(c=>({id:c.id,name:c.name,category:c.category||null,weight:c.weight,mandatory:c.mandatory})),weight_sum:weightSum(r.id),
  reviewers:bs.reviewers,blind_scoring:BLIND,prices_hidden:BLIND&&!bs.complete,missing_scores:bs.missing,
  suppliers:set.map(i=>{const s=scoreOf(r,i.id),p=latestProposal(i.id,rd),t=p?proposalTotals(p,r.currency):null;return {invitation_id:i.id,supplier:orgName(i.organization_id),status:i.status,weighted_score:exact?s.weighted:null,criteria_scored:s.scored,criteria_total:s.of,mandatory_fails:s.fails,per_criterion:s.per,price:BLIND&&!bs.complete?'hidden until scoring is complete':t?{total:t.total,currency:t.currency}:null,qualification:qual(i)};}),
  scores:SCORES.filter(x=>x.request_id===r.id).slice(0,300).map(x=>({id:x.id,reviewer:x.reviewer,invitation_id:x.invitation_id,criterion_id:x.criterion_id,score:x.score,evidence:x.evidence||null})),
  qualification:invsOf(r.id).filter(i=>i.status!=='declined').map(i=>({invitation_id:i.id,supplier:orgName(i.organization_id),...qual(i)})),
  bid_defence:r.mode==='full_selection'?invsOf(r.id).filter(i=>i.status==='finalist'||i.status==='selected').map(i=>({invitation_id:i.id,supplier:orgName(i.organization_id),items:checksOf(r.id,'bid_defence',i.id).map(c=>({id:c.id,item:c.item,status:c.status}))})):null};}
function decisionResult(r){const a=awardOf(r.id),g=inp.saved?groupOf(r,'rfp'):null,ag=a&&a.agreement_id?lookup('agreements',a.agreement_id):null;
 return {request_id:r.id,exact,award:a?{...awardResult(a),agreement:ag?{id:ag.id,name:ag.data.name||null,status:ag.data.status||null,from:'shared agreements register; its status is changed in Contracts'}:null}:null,
  candidates:invsOf(r.id).filter(i=>i.status!=='declined').map(i=>{const s=scoreOf(r,i.id);return {invitation_id:i.id,supplier:orgName(i.organization_id),status:i.status,weighted_score:exact?s.weighted:null,mandatory_fails:s.fails,qualification_issues:qualOf(r,i.id).issues.map(c=>c.item),needs_override_reason:qualOf(r,i.id).issues.length>0};}),
  notices:a?{sent_by:'a person, from Decision & onboarding → Notify all',has_round:!!g,suppliers:invsOf(r.id).filter(i=>['selected','not_selected'].includes(i.status)).map(i=>({supplier:orgName(i.organization_id),status:i.status,has_link:!!(g&&exchangeOf(g,i.id)),text:noticeText(r,i)}))}:null,
  onboarding:{status:a?a.onboarding_status||'in_progress':null,items:checksOf(r.id,'onboarding','').map(c=>({id:c.id,item:c.item,status:c.status,owner:c.owner||null,due:c.due||null}))}};}
function describeResult(){const settingKeys={default_currency:{kind:'select',options:CURRENCIES},blind_scoring:{kind:'boolean'},question_deadline_days:{kind:'number',min:0,max:60},confidentiality_text:{kind:'longtext'},decision_text_winner:{kind:'longtext',placeholders:['{supplier}','{request}']},decision_text_others:{kind:'longtext',placeholders:['{supplier}','{request}']},opening_screen:{kind:'select',options:SCREENS.map(x=>x.id)},stage_labels:{kind:'object {stage: name}',stages:STAGES}};
 return {app:'CRO Selection',template:'life.cro-selection 2.1.0',currency:CURRENCY,
  forms:Object.fromEntries(EDIT_ROLES.filter(r=>roleMap[r]).map(r=>[r,{label:ROLE_LABEL[r],role:ROLE_KEY[r],writable:canWrite(r),create:CREATE_HINT[r],layout_group:FORM_GROUP[r],
   fields:fieldsOf(r).filter(f=>f.kind!=='frozen'&&f.key!=='archived'&&roleMap[r].fields[f.key]).map(f=>({key:f.key,label:fieldLabel(r,f),kind:f.kind==='ref'?'record_id':f.kind==='lines'?'text, one item per line (or an array)':f.kind==='assumptions'?'object {notes, baseline:[{category, amount}]}':f.kind==='emails'?'1 to 5 emails, comma separated (or an array)':f.kind==='readonly'?'read only here':f.kind,required:!!f.required,...(f.options?{options:f.options}:{}),...(f.ref?{references:ROLE_KEY[f.ref]}:{}),...(f.extra?{additional:true}:{}),writable:f.kind!=='readonly'&&roleMap[r].writable.includes(f.key)}))}])),
  stages:{quick_quote:stagesOf('quick_quote'),full_selection:stagesOf('full_selection'),labels:{...STAGE_LABEL}},invitation_statuses:INV_STATUS,cda_statuses:CDA_STATUS,checklist_scopes:CHECK_SCOPES,checklist_statuses:CHECK_STATUS,criterion_categories:CRIT_CATS,service_types:SERVICES,request_kinds:KINDS,
  settings:{writable:canWrite('settings'),fields:settingKeys,current:{default_currency:CURRENCY,blind_scoring:BLIND,question_deadline_days:QDAYS,opening_screen:SCREENS.some(x=>x.id===PREF.opening_screen)?PREF.opening_screen:'overview',stage_labels:PREF.stage_labels||{}}},
  layout:{screens:SCREENS.map(x=>({id:x.id,label:x.label,visible:st.layout.visible[x.id]!==false})),groups:Object.fromEntries(Object.entries(templateLayoutSchema.groups).map(([g,v])=>[g,v.map(x=>x.id)])),keys:'Screen ids, or group:field. Form groups end in _form; requests and vendors are table columns.'},
  only_people:['Supplier communication: creating rounds and links, sharing documents, sending emails, replying, publishing clarifications, accepting submissions and files, extending or stopping links, and decision notices (Notify all).','Revealing prices before blind scoring is complete (a per-session view choice).','Access, data connections and app archive or restore.'],
  additional_fields:'Add the field to the table with a reviewed schema change, then declare it in this app\'s table map: extraFields [{key, label, kind (text, longtext, number, money, date, select, boolean), options}] and writableExtra [keys], with one reviewed app revision. It then shows in that form and in details, and record.save accepts it. Bound fields that are not declared show read-only.'};}
const COMMANDS={
 'schema.describe':()=>describeResult(),
 'overview.read':()=>overviewResult(),
 'request.read':v=>requestResult(reqNeed(v)),
 'grid.read':v=>gridResult(reqNeed(v)),
 'evaluation.read':v=>evaluationResult(reqNeed(v)),
 'decision.read':v=>decisionResult(reqNeed(v)),
 'record.save':v=>recordSave(v),
 'record.archive':v=>{const role=roleOf(String(cneed(v,'role'))),row=lookup(role,String(cneed(v,'id')));if(!row)throw Error('That '+ROLE_LABEL[role]+' is not available.');const rid=requestOf(role,row);if(rid&&REQ[rid])useRequest(rid);return click('archive:'+role+':'+row.id);},
 'request.stage':v=>{reqNeed(v);if(v.close_without_award===true)draftOf('close').confirm=true;return click('stage:'+cneed(v,'stage'));},
 'longlist.add':v=>{reqNeed(v);handle({kind:'submit',action:'longlist-add',form:{organization_id:String(cneed(v,'organization_id')),recipient_emails:Array.isArray(v.recipient_emails)?v.recipient_emails.join(', '):formValue(v.recipient_emails)}});return {};},
 'invitation.status':v=>{const i=invNeed(v);return click('inv-status:'+i.id+':'+cneed(v,'status'));},
 'cda.record_elsewhere':v=>{const i=invNeed(v);handle({kind:'submit',action:'cda-elsewhere:'+i.id,form:{cda_in_place_on:formValue(v.in_place_on)}});return {};},
 'cda.file_agreement':v=>{const i=invNeed(v);return click('cda-file:'+i.id);},
 'lines.save':v=>{const p=PROP[cneed(v,'proposal_id')];if(!p)throw Error('That proposal is not available.');const ls=Array.isArray(v.lines)?v.lines:[];
  for(const l of ls){const {id,...fields}=l&&typeof l==='object'?l:{};if(id){const x=lookup('lines',String(id));if(!x||x.data.proposal_id!==p.id)throw Error('Line '+id+' is not a line of this proposal.');recordSave({role:'lines',id,fields});}else recordSave({role:'lines',context:{proposal_id:p.id},fields});}
  return {lines:ls.length};},
 'criteria.apply_defaults':v=>{reqNeed(v);return click('apply-criteria');},
 'checklist.apply_defaults':v=>{const r=reqNeed(v),iid=v.invitation_id?String(v.invitation_id):'';if(iid&&(!INV[iid]||INV[iid].request_id!==r.id))throw Error('That supplier is not on this request.');return click('apply-checklist:'+cneed(v,'scope')+':'+iid);},
 'checklist.set_status':v=>{const c=lookup('checklist',String(cneed(v,'item_id')));if(!c)throw Error('That checklist item is not available.');if(REQ[c.data.request_id])useRequest(c.data.request_id);return click('check:'+c.id+':'+cneed(v,'status'));},
 'scores.save':v=>{const r=reqNeed(v),rv=textOf(cneed(v,'reviewer'),80);draftOf('card').reviewer=rv;handle({kind:'click',action:'panel:card:open'});const set=scoredSet(r),cs=critsOf(r.id),form={};
  for(const x of Array.isArray(v.scores)?v.scores:[]){if(!set.some(i=>i.id===x.invitation_id))throw Error('Not a supplier being scored on this request: '+x.invitation_id+'. Evaluation scores the finalists, or the suppliers with an accepted proposal.');if(!cs.some(c=>c.id===x.criterion_id))throw Error('Not a criterion of this request: '+x.criterion_id+'.');const k=x.invitation_id+'_'+x.criterion_id;form['s_'+k]=String(x.score);if(x.evidence!==undefined)form['e_'+k]=formValue(x.evidence);}
  handle({kind:'submit',action:'save-scores',form});return {reviewer:rv};},
 'decision.record':v=>{const r=reqNeed(v),i=INV[cneed(v,'invitation_id')];if(!i||i.request_id!==r.id)throw Error('Choose a supplier of this request.');
  handle({kind:'click',action:'panel:decide:new'});handle({kind:'submit',action:'decide',form:{invitation_id:i.id,rationale:formValue(v.rationale),approver:formValue(v.approver),decided_on:formValue(v.decided_on),start_date:formValue(v.start_date),delivery_team:formValue(v.delivery_team),override_reason:formValue(v.override_reason),notify:false}});
  const g=inp.saved?groupOf(r,'rfp'):null;return {notices:g?'Not sent by this command. Once the decision is approved, a person sends them in Decision & onboarding → Notify all.':'This request has no round, so nobody is notified through the exchange.'};},
 'award.save':v=>{const r=reqNeed(v),a=awardOf(r.id);if(!a)throw Error('There is no award yet.');handle({kind:'click',action:'panel:award:'+a.id});const form={};for(const k of ['start_date','delivery_team','agreement_id'])if(has(v,k))form[k]=formValue(v[k]);handle({kind:'submit',action:'save-award',form});return {};},
 'onboarding.update':v=>{reqNeed(v);return click('onboarding-status');},
 'handoff.prepare':v=>{reqNeed(v);return click('prepare-handoff');},
 'award.link_agreement':v=>{reqNeed(v);return click('link-agreement');},
 'settings.save':v=>{const f=v.fields&&typeof v.fields==='object'?v.fields:{},form={},map={default_currency:'default_currency',blind_scoring:'blind_scoring',question_deadline_days:'question_deadline_days',confidentiality_text:'confidentiality_text',decision_text_winner:'winner',decision_text_others:'others',opening_screen:'opening_screen'};
  for(const [k,val] of Object.entries(f)){if(k==='stage_labels'){for(const [sk,l] of Object.entries(val&&typeof val==='object'?val:{})){if(!STAGES.includes(sk))throw Error('Unknown stage: '+sk+'.');form['stage_'+sk]=formValue(l);}continue;}if(!map[k])throw Error('Not a setting: '+k+'. Use schema.describe.');form[map[k]]=k==='blind_scoring'?val===true||val==='true':formValue(val);}
  if(!Object.keys(form).length)throw Error('Give at least one setting.');handle({kind:'submit',action:'save-settings',form});return {};},
 'invitation_text.save':v=>{handle({kind:'submit',action:'save-email',form:{kind:String(cneed(v,'kind')),subject:formValue(v.subject),body:formValue(v.body)}});return {};},
 'invitation_text.reset':v=>{handle({kind:'click',action:'reset-email',form:{kind:String(cneed(v,'kind'))}});return {};},
 'layout.save':v=>{const L=st.layout,out={heading:String(v.heading||L.heading).slice(0,100),tabs:L.tabs.filter(id=>id!=='emails'),cols:JSON.parse(JSON.stringify(L.cols)),visible:{},labels:{...LP.labels},defaults:{...LP.defaults}};
  for(const [k,x] of Object.entries(L.visible))out.visible[templateLayoutSchema.screens.some(s=>s.id===k)?k:k.replace('.',':')]=x;
  if(Array.isArray(v.screens)){const want=v.screens.map(String).filter(x=>out.tabs.includes(x));out.tabs=[...new Set(want.concat(out.tabs))];}
  for(const [g,ids] of Object.entries(v.order&&typeof v.order==='object'?v.order:{})){if(!out.cols[g]||!Array.isArray(ids))throw Error('Unknown field group: '+g+'.');out.cols[g]=[...new Set(ids.map(String).filter(x=>out.cols[g].includes(x)).concat(out.cols[g]))];}
  const key=k=>{k=String(k);if(templateLayoutSchema.screens.some(x=>x.id===k))return k;const [g,f]=k.split(':');if(!out.cols[g]||!out.cols[g].includes(f))throw Error('Unknown screen or field: '+k+' (use a screen id, or group:field).');return k;};
  for(const k of Array.isArray(v.hide)?v.hide:[])out.visible[key(k)]=false;for(const k of Array.isArray(v.show)?v.show:[])delete out.visible[key(k)];
  for(const [k,x] of Object.entries(v.labels&&typeof v.labels==='object'?v.labels:{})){if(templateLayoutSchema.screens.some(s=>s.id===k))throw Error('Screens keep their names; set labels on fields (group:field).');key(k);if(x===null||x==='')delete out.labels[k];else out.labels[k]=String(x).trim().slice(0,100);}
  for(const [k,x] of Object.entries(v.defaults&&typeof v.defaults==='object'?v.defaults:{})){key(k);const [g,fk]=k.split(':'),role=Object.keys(FORM_GROUP).find(r=>FORM_GROUP[r]===g);if(!role)throw Error('Defaults apply to form fields (groups ending in _form).');
   if(x===null){delete out.defaults[k];continue;}const f=S[role].find(y=>y.key===fk),t=String(x).slice(0,200);if(f&&f.options&&!f.options.includes(t))throw Error('The default for '+k+' must be one of: '+f.options.join(', ')+'.');out.defaults[k]=t;}
  if(!out.tabs.some(id=>out.visible[id]!==false))throw Error('Keep at least one screen visible.');
  for(const [role,g] of Object.entries(FORM_GROUP))for(const f of S[role])if(f.required&&out.visible[g+':'+f.key]===false)throw Error(f.label+' is required and cannot be hidden.');
  for(const k of ['requests:name','vendors:name'])if(out.visible[k]===false)throw Error('The name column always shows.');
  if(!Object.keys(out.labels).length)delete out.labels;if(!Object.keys(out.defaults).length)delete out.defaults;
  tools.call('layout.propose',out);return {layout:'proposed'};}
};
function runCommand(id,raw){let v={};try{v=JSON.parse(raw||'{}')||{};}catch(e){return {ok:false,error:'The command input is not valid JSON.'};}
 const fn=COMMANDS[id];if(!fn)return {ok:false,error:'CRO Selection has no command '+id+'. Use list_app_commands.'};
 const before=PROPOSED;
 try{const result=fn(v)||{};return {ok:true,result:PROPOSED>before?{...result,saved:NOTICE&&NOTICE.message||'Saved.',records:PROPOSED-before}:result};}
 catch(e){return {ok:false,error:String(e&&e.message||e).slice(0,600)};}}
if(event.kind==='command')return {html:'',css:'',state:{command:runCommand(action,event.value)}};

if(SAVED){st.justSaved=true;if(NOTICE)st.flash=NOTICE;}
const SCREEN_FN={overview,requests:requestsScreen,vendors:vendorsScreen,messages:messagesScreen,proposals:proposalsScreen,evaluation:evaluationScreen,decision:decisionScreen,emails:emailsScreen,settings:settingsScreen};
let main='';try{main=(SCREEN_FN[st.section]||overview)();}catch(e){main=warnLine('This screen could not be shown: '+String(e&&e.message||e).slice(0,200));}
let overlay='';try{overlay=editorPanel()||sidePanel();}catch(e){overlay='';note('This panel could not be opened: '+String(e&&e.message||e).slice(0,200),'error');}
/* P2: data still on its way shows as loading, never as empty or zero. */
if(PENDING||XS.pending){main=loading;overlay='';}
const undoBar=st.undo&&!PENDING?'<div class="k-row cs-undo">'+kit.undo([st.undo])+'</div>':'';
const nav=kit.nav(sections.map(s=>({id:s.id,label:s.label})),st.section,{side:true,label:'CRO Selection screens'});
/* While a side panel is open the screen behind it is inert, so keyboard and touch stay in the panel. */
const html=kit.page((overlay?'<div inert>':'<div>')+kit.layout(nav,undoBar+main,{side:true})+'</div>'+overlay);
const css=typeof CROSELECTION_CSS==='string'?CROSELECTION_CSS:'';
return {html,css,state:st,...(NOTICE?{notice:kit.notice(NOTICE.kind,NOTICE.message)}:{}),...(st.requestId?{context:{requestId:st.requestId}}:{})};
