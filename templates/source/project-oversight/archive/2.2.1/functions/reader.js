// Read-only: records.read on Programs' own roles. Archived rows are passed through and ignored by the core.
const MAX_PAGES=8;
function readAll(role){const typeId=appRoles[role];if(!typeId)return {rows:[],complete:false};let rows=[],total=0;
 for(let page=0;page<MAX_PAGES;page++){const r=tools.call('records.read',{typeId,limit:100,offset:page*100});const got=r&&Array.isArray(r.rows)?r.rows:[];
  rows=rows.concat(got);total=Number(r&&r.total)||rows.length;if(!got.length||rows.length>=total)break;}
 return {rows:rows.map(x=>Object.assign({},x.data||{},{id:x.id})),complete:rows.length>=total};}
const R={programs:readAll('programs'),items:readAll('programs.plan_items'),slips:readAll('programs.slips'),decisions:readAll('programs.decisions'),raid:readAll('programs.raid'),updates:readAll('programs.updates'),settings:readAll('programs.settings')};
const digest=digestCore({today:new Date().toISOString().slice(0,10),programs:R.programs.rows,items:R.items.rows,slips:R.slips.rows,decisions:R.decisions.rows,raid:R.raid.rows,updates:R.updates.rows,settings:R.settings.rows[0]||{},complete:Object.values(R).every(x=>x.complete)});
