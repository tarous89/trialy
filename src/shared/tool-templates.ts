export type TemplateKind='tracker'|'form'|'visualization'|'automation';
export type TemplateField={key:string;name:string;kind:string;options?:string[]};
export type ToolTemplate={id:string;name:string;kind:TemplateKind;description:string;tables:{name:string;fields:TemplateField[]}[]};
const field=(key:string,name:string,kind='text',options?:string[]):TemplateField=>({key,name,kind,...(options?{options}:{})});
const tasks=[field('name','Task'),field('status','Status','select',['Not started','In progress','Done']),field('due_date','Due date','date'),field('notes','Notes')];
const contacts=[field('name','Name'),field('company','Company'),field('email','Email','email'),field('status','Status','select',['New','Contacted','Engaged','Declined']),field('follow_up','Follow-up date','date')];
export const toolTemplates:ToolTemplate[]=[
{id:'outreach',kind:'tracker',name:'Outreach tracker',description:'Track contacts, responses and follow-ups.',tables:[{name:'Contacts',fields:contacts}]},
{id:'tasks',kind:'tracker',name:'Project tasks',description:'Keep tasks, deadlines and progress together.',tables:[{name:'Tasks',fields:tasks}]},
{id:'vendors',kind:'tracker',name:'Vendor selection',description:'Compare vendors, proposals and next steps.',tables:[{name:'Vendors',fields:[field('name','Vendor'),field('service','Service'),field('status','Stage','select',['Shortlist','RFP sent','Proposal received','Selected','Declined']),field('budget','Proposed budget','money'),field('next_step','Next step')]}]},
{id:'intake',kind:'form',name:'Request intake',description:'Enter a request directly into your selected table.',tables:[{name:'Requests',fields:[field('name','Request'),field('requester','Requester'),field('priority','Priority','select',['Low','Normal','High']),field('description','Description')]}]},
{id:'contact-form',kind:'form',name:'Contact form',description:'Add contact details to your working database.',tables:[{name:'Contacts',fields:contacts}]},
{id:'progress',kind:'visualization',name:'Progress dashboard',description:'View record totals and status breakdowns.',tables:[{name:'Tasks',fields:tasks}]},
{id:'pipeline',kind:'visualization',name:'Outreach dashboard',description:'Explore your contact pipeline and follow-ups.',tables:[{name:'Contacts',fields:contacts}]},
{id:'due-report',kind:'automation',name:'Follow-up report',description:'Create a repeatable report of upcoming work. Schedule it after saving.',tables:[{name:'Tasks',fields:tasks}]},
{id:'quality-report',kind:'automation',name:'Missing information report',description:'Find records with missing values. Schedule it after saving.',tables:[{name:'Contacts',fields:contacts}]}
];
export async function loadSourceTables(call:(name:string,args:any)=>Promise<any>){const tables:any[]=[];let offset:number|null=0;while(offset!==null){const page=await call('read_workspace_schema',{offset,limit:25});tables.push(...page.tables.filter((t:any)=>t.readable).map((t:any)=>({...t,fields:t.fields.filter((f:any)=>f.readable)})));offset=page.nextOffset;}return tables;}
