import type { Field } from '../shared/schema.js';
const text=(key:string,name:string,required=false):Field=>({key,name,kind:'text',required,ai:true});
const status:Field={key:'status',name:'Status',kind:'select',options:['Planned','In progress','In review','Done'],required:false,ai:true};
const date:Field={key:'due_date',name:'Due date',kind:'date',required:false,ai:true};
const money:Field={key:'budget',name:'Budget',kind:'money',required:false,ai:false};
export type Template={id:string;name:string;description:string;version:number;tables:{name:string;fields:Field[]}[]};
const tracker=(name:string,extra:Field[]=[])=>({name,fields:[text('name','Name',true),status,date,text('owner','Owner'),...extra]});
export const templates:Template[]=[
 {id:'rfp-oversight',name:'RFP → CRO oversight',description:'Compare CROs and proposals, record selection, and carry commitments into study oversight.',version:1,tables:[
  {name:'CROs',fields:[text('name','Company',true),text('services','Services'),text('experience','Relevant experience'),text('contact','Contact')]},
  tracker('RFPs',[text('scope','Study scope'),text('requirements','Requirements')]),
  tracker('Proposals',[text('cro','CRO reference'),money,text('assumptions','Assumptions'),text('exclusions','Exclusions'),{key:'score',name:'Score',kind:'number',required:false,ai:true}]),
  tracker('Studies',[text('selected_cro','Selected CRO reference'),text('selected_proposal','Selected proposal reference'),money]),
  tracker('Commitments',[text('study','Study reference'),text('cro','CRO reference'),text('deliverable','Deliverable')]),
  tracker('Risks and decisions',[text('study','Study reference'),text('rationale','Rationale'),text('mitigation','Mitigation')])]},
 {id:'documents',name:'Document control',description:'Reviews, missing documents, requests and expiry dates.',version:1,tables:[tracker('Document register',[text('document','Document reference'),text('reviewer','Reviewer')])]},
 {id:'sites-pis',name:'Sites and investigators',description:'Site feasibility and investigator engagement.',version:1,tables:[tracker('Sites',[text('country','Country'),text('capabilities','Capabilities')]),tracker('Investigators',[text('site','Site reference'),text('email','Professional email')])]},
 {id:'sop-training',name:'SOPs and training',description:'SOP registers and version-specific training acknowledgements.',version:1,tables:[tracker('SOPs',[text('document_version','Document version')]),tracker('Training',[text('sop_version','SOP version'),text('trainee','Trainee'),text('acknowledgement','Acknowledgement')])]},
 {id:'kol-advisory',name:'Experts and advisory boards',description:'Expert profiles and advisory activity.',version:1,tables:[tracker('Experts',[text('expertise','Expertise'),text('email','Professional email')]),tracker('Advisory boards',[text('purpose','Purpose')])]},
 {id:'publications',name:'Congresses and publications',description:'Submissions, authorship and congress planning.',version:1,tables:[tracker('Publications',[text('journal','Journal'),text('authors','Authors')]),tracker('Congresses',[text('location','Location')])]},
 {id:'team-projects',name:'Team projects',description:'Tasks, owners, dates and project activity.',version:1,tables:[tracker('Projects'),tracker('Tasks',[text('project','Project reference')])]},
 {id:'vendor-contracts',name:'Vendors and contracts',description:'Vendor obligations, renewals and change orders.',version:1,tables:[tracker('Vendors',[text('services','Services')]),tracker('Contracts',[money,text('vendor','Vendor reference')]),tracker('Change orders',[money,text('contract','Contract reference')])]},
 {id:'budget-resources',name:'Budgets and resources',description:'Planned budgets and resource assignments.',version:1,tables:[tracker('Budgets',[money,text('currency','Currency')]),tracker('Resources',[text('allocation','Allocation')])]},
 {id:'communications',name:'Communications and follow-ups',description:'Communication register and follow-up tracking; sending requires a configured adapter.',version:1,tables:[tracker('Communications',[text('recipient','Recipient'),text('message','Message'),text('thread','Thread reference')])]},
 {id:'management-reports',name:'Management reports',description:'Report register, reporting periods and review.',version:1,tables:[tracker('Reports',[text('period','Reporting period'),text('summary','Summary')])]}
];

// Resolve references to concrete table IDs during installation, without duplicate CRO/proposal entities.
export const templateLinks:Record<string,Record<string,string>>={
 'Proposals':{cro:'CROs'},'Studies':{selected_cro:'CROs',selected_proposal:'Proposals'},
 'Commitments':{study:'Studies',cro:'CROs'},'Risks and decisions':{study:'Studies'},
 'Investigators':{site:'Sites'},'Tasks':{project:'Projects'},'Contracts':{vendor:'Vendors'},'Change orders':{contract:'Contracts'}
};
