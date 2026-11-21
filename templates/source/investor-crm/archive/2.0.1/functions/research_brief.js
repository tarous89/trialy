// Investor research brief (research.briefBinding). Read-only. Gives the runner the round's fit criteria and the
// investors already known (including rejected ones) so it proposes only new, fitting investors with sources.
const MAX_PAGES=8;
function readAll(role){const typeId=appRoles[role];if(!typeId)return {rows:[],complete:false};let rows=[],total=0;
 for(let page=0;page<MAX_PAGES;page++){const r=tools.call('records.read',{typeId,limit:100,offset:page*100});const got=r&&Array.isArray(r.rows)?r.rows:[];
  rows=rows.concat(got);total=Number(r&&r.total)||rows.length;if(!got.length||rows.length>=total)break;}
 return {rows:rows.map(x=>Object.assign({},x.data||{},{id:x.id})),complete:rows.length>=total};}
const live=r=>r.archived!==true&&r.archived!=='true';
const list=v=>String(v||'').split(',').map(s=>s.trim()).filter(Boolean);
const settings=readAll('fundraise.settings'),rounds=readAll('fundraise.rounds'),profiles=readAll('fundraise.investor_profiles'),orgs=readAll('organizations');
const s=settings.rows[0]||{};
const ORG={};for(const o of orgs.rows)ORG[o.id]=o;
const known=profiles.rows.map(p=>({organization_id:p.organization_id,name:ORG[p.organization_id]?ORG[p.organization_id].name:null,website:ORG[p.organization_id]?ORG[p.organization_id].website||null:null,investor_type:p.investor_type||null,status:live(p)?p.profile_status:'archived'}));
// Investors in the shared organizations table without a Fundraise profile: research links to them instead of creating duplicates.
const profiled=new Set(profiles.rows.map(p=>p.organization_id));
const otherInvestors=orgs.rows.filter(o=>live(o)&&o.org_type==='investor'&&!profiled.has(o.id)).map(o=>({organization_id:o.id,name:o.name,website:o.website||null}));
const context={
 asOf:new Date().toISOString().slice(0,10),
 fit:{modalities:list(s.modalities),therapeuticAreas:list(s.therapeutic_areas),developmentStages:list(s.dev_stages),defaultCurrency:s.default_currency||null},
 rounds:rounds.rows.filter(r=>live(r)&&['planning','active'].includes(r.status)).map(r=>({name:r.name,round_type:r.round_type,target_amount:r.target_amount??null,currency:r.currency,status:r.status,target_close:r.target_close||null,notes:r.notes?String(r.notes).slice(0,500):null})),
 knownInvestors:known,
 investorOrganizationsWithoutProfile:otherInvestors,
 complete:[settings,rounds,profiles,orgs].every(x=>x.complete)
};
let text=JSON.stringify(context);
while(text.length>60000&&(context.knownInvestors.length||context.investorOrganizationsWithoutProfile.length)){
 if(context.investorOrganizationsWithoutProfile.length)context.investorOrganizationsWithoutProfile=context.investorOrganizationsWithoutProfile.slice(0,Math.floor(context.investorOrganizationsWithoutProfile.length*0.8));
 else context.knownInvestors=context.knownInvestors.slice(0,Math.floor(context.knownInvestors.length*0.8));
 context.truncated=true;text=JSON.stringify(context);}
return {context:text};
