/** Presentation metadata only; availability and installation always use the approved DB catalog. */
export const templateGallery:Record<string,{team:string;workflow:string;summary:string}>={
 'life.cash-runway':{team:'Biotech',workflow:'Finance',summary:'Plan spending, explore scenarios, and understand your cash runway.'},
 'life.hiring-resource-management':{team:'Biotech',workflow:'People',summary:'Plan hiring and balance team capacity across your biotech.'},
 'life.inventory-management':{team:'Research',workflow:'Operations',summary:'Track lab supplies, stock movements, and replenishment requests.'},
 'life.project-oversight':{team:'Biotech',workflow:'Operations',summary:'Milestones, dependencies, risks and decisions across all programs.'},
 'life.pi-network-management':{team:'CRO',workflow:'Relationships',summary:'Build your investigator network and match expertise to studies.'},
 'life.grant-pipeline':{team:'Research',workflow:'Finance',summary:'Find funding opportunities and manage applications and deadlines.'},
 'life.co-site-feasibility':{team:'Clinical operations',workflow:'Study delivery',summary:'Compare sites and coordinate feasibility and study startup.'},
 'life.experiment-notebook':{team:'Research',workflow:'Research',summary:'Connect protocols, bench observations, and reviewed findings.'},
 'life.sponsor-rfp-management':{team:'Clinical operations',workflow:'Procurement',summary:'Organize CRO requirements, proposals, and selection decisions.'},
 'life.partnership-tracker':{team:'Biotech',workflow:'Relationships',summary:'Manage partnering opportunities, meetings, and deal milestones.'},
 'life.client-signals-crm':{team:'CRO',workflow:'Relationships',summary:'Track biotech prospects, activity signals, and sales opportunities.'},
 'life.trial-regulatory-submission':{team:'Clinical operations',workflow:'Study delivery',summary:'Coordinate submission documents, reviews, and authority questions.'},
 'life.literature-radar':{team:'Research',workflow:'Research',summary:'Monitor publications and turn reading into reviewed evidence.'},
 'life.cro-oversight':{team:'Clinical operations',workflow:'Study delivery',summary:'Track CRO deliverables, performance, and follow-up actions.'},
 'life.publication-management':{team:'Research',workflow:'Research',summary:'Coordinate manuscripts, author reviews, and submission milestones.'},
 'life.cro-resource-planning':{team:'CRO',workflow:'People',summary:'Schedule specialists and see capacity gaps across sponsor projects.'},
 'life.investor-crm':{team:'Biotech',workflow:'Relationships',summary:'Organize investors, fundraising opportunities, and follow-ups.'},
 'life.cro-rfp-management':{team:'CRO',workflow:'Procurement',summary:'Manage sponsor RFPs, reusable answers, and proposal reviews.'},
 'life.cro-site-feasibility':{team:'CRO',workflow:'Study delivery',summary:'Qualify sites and coordinate study-specific feasibility work.'},
 'life.investigator-crm':{team:'Clinical operations',workflow:'Relationships',summary:'Keep investigator profiles, engagement history, and next steps together.'},
 'life.cro-selection':{team:'Biotech',workflow:'Procurement',summary:'Compare CRO bids and document an evidence-based selection.'},
 'life.cro-sponsor-updates':{team:'CRO',workflow:'Study delivery',summary:'Collect team updates and prepare reviewed sponsor reports.'},
 'life.co-trial-monitoring-pv':{team:'Clinical operations',workflow:'Study delivery',summary:'Coordinate monitoring actions and partner PV obligations.'}
};
export function templateMediaUrl(id:string,version:string,kind:'screenshot'|'preview'){return `/api/app-templates/${encodeURIComponent(id)}/${encodeURIComponent(version)}/${kind}`;}
