import React,{useEffect,useState} from 'react';
export const destinations=[['projects','Projects'],['trackers','Trackers'],['forms','Forms'],['visuals','Visualizations'],['database','Database'],['code','Automations'],['changes','Changes & permissions'],['documents','Documents']] as const;
export function WorkspaceNavigation({selected,onSelect,onSettings}:{selected:string;onSelect:(key:string)=>void;onSettings:()=>void}){
 return <nav className="trialy-navigation" aria-label="Workspace navigation">{destinations.map(([key,label])=><button type="button" key={key} aria-current={selected===key?'page':undefined} onClick={()=>onSelect(key)}>{label}</button>)}<button type="button" className="trialy-settings" onClick={onSettings}>Settings</button></nav>;
}
export function ProjectFilter({workspaceId,value,onChange,call}:{workspaceId:string;value:string;onChange:(id:string)=>void;call:(name:string,args:any)=>Promise<any>}){
 const [projects,setProjects]=useState<any[]>([]),[error,setError]=useState('');
 useEffect(()=>{let live=true;setProjects([]);setError('');if(workspaceId)void call('list_workspace_projects',{workspaceId}).then(r=>{if(live)setProjects(r.nodes.filter((n:any)=>n.kind==='project'&&!n.effective_archived));}).catch(e=>{if(live)setError((e as Error).message);});return()=>{live=false;};},[workspaceId]);
 return <label className="trialy-project-filter">Project<select value={value} onChange={e=>onChange(e.target.value)}><option value="">All projects</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>{error&&<small role="status">Project list unavailable: {error}</small>}</label>;
}
