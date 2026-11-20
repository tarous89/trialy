import {z} from 'zod';
import type {Connection,Database} from '../db/database.js';
import {fail,assistantOf,ASSISTANTS,ASSISTANT_NAMES,type Actor,type Assistant} from '../shared/schema.js';
import {assistantEnabled,rulesFor} from './effective-access.js';
import {access} from './permissions.js';
import {audit} from './evidence.js';

/**
 * A4: what an assistant may do, in two areas. Data is reading and changing records, tables and files.
 * Apps is app code and layout, table connections, automation definitions and new app tables.
 * The level that applies is the lower of the organization maximum and the person's own limit.
 * What the person themself may do, and the older switches and connection rules, are still decided by access().
 */
export const ASSISTANT_LEVELS=['blocked','view','edit'] as const;
export type AssistantLevel=typeof ASSISTANT_LEVELS[number];
export type AssistantAreas={data:AssistantLevel;apps:AssistantLevel};
export type AssistantLevels=AssistantAreas&{assistant:Assistant|null;userId:string;organization:AssistantAreas;personal:AssistantAreas};
export const LEVEL_NAMES:Record<AssistantLevel,string>={edit:'Edit',view:'View only',blocked:'Blocked'};
const rank=(l:AssistantLevel)=>ASSISTANT_LEVELS.indexOf(l);
export const lowestLevel=(...levels:AssistantLevel[]):AssistantLevel=>levels.reduce((low,l)=>rank(l)<rank(low)?l:low,'edit');
const level=(v:unknown):AssistantLevel=>(ASSISTANT_LEVELS as readonly unknown[]).includes(v)?v as AssistantLevel:'edit';
const FULL:AssistantAreas={data:'edit',apps:'edit'};
const maximumOf=(p:any,x:Assistant):AssistantAreas=>({data:level(p[`${x}_data_level`]),apps:level(p[`${x}_apps_level`])});
/** What the older switches and connection rules still allow: off or a read block is Blocked, a write block is View only. */
function legacyLevel(p:any,a:Actor):AssistantLevel{const rules=rulesFor(p,a).filter(r=>r.kind==='connection');return !assistantEnabled(p,a)||rules.some(r=>r.read==='deny')?'blocked':rules.some(r=>r.write==='deny')?'view':'edit';}

/** Levels for the acting assistant in workspace policy p (from access()). A person acting themself always gets Edit. */
export async function assistantLevels(db:Connection,a:Actor,p:any):Promise<AssistantLevels>{
 if(a.origin!=='ai')return {...FULL,assistant:null,userId:a.userId,organization:FULL,personal:FULL};
 const x=assistantOf(a),known=p.assistant_levels as AssistantLevels|undefined;if(known&&known.assistant===x&&known.userId===a.userId)return known;
 const organization=maximumOf(p,x),row=(await db.query('SELECT data_level,apps_level FROM assistant_limits WHERE workspace_id=$1 AND user_id=$2 AND assistant=$3',[p.id,a.userId,x])).rows[0];
 const personal:AssistantAreas={data:level(row?.data_level),apps:level(row?.apps_level)};
 return {data:lowestLevel(organization.data,personal.data),apps:lowestLevel(organization.apps,personal.apps),assistant:x,userId:a.userId,organization,personal};
}
/** access() keeps the levels on the policy it returns, so later checks need no further query. */
export function withAssistantLevels<T extends {document_scope:boolean}>(p:T,levels:AssistantLevels|null):T{return levels?{...p,assistant_levels:levels,document_scope:p.document_scope&&levels.data!=='blocked'}:p;}
const levelsOf=(p:any,a:Actor):AssistantLevels=>{const l=p?.assistant_levels as AssistantLevels|undefined;if(!l||l.assistant!==assistantOf(a)||l.userId!==a.userId)fail(500,'assistant_levels_missing','Assistant permissions were not loaded');return l;};
/** Where the person can change the setting that stopped the assistant. */
const whereToChange=(organization:boolean,personal:boolean)=>organization&&personal?'An organization owner can change this under Access, and you can change your own limit under Connections.':personal?'You can change your own limit under Connections.':'An organization owner can change this under Access.';
function refuse(a:Actor,l:AssistantLevels,area:keyof AssistantAreas,write:boolean):never{
 const blocked=l[area]==='blocked',short=(v:AssistantLevel)=>write?v!=='edit':v==='blocked';
 fail(403,`assistant_${area}_${blocked?'blocked':'view_only'}`,`${ASSISTANT_NAMES[assistantOf(a)]} is set to ${blocked?'Blocked':'View only'} for ${area}. ${whereToChange(short(l.organization[area]),short(l.personal[area]))}`);
}
/** Blocked for both areas leaves the assistant nothing in this workspace. */
export function requireAssistantAny(l:AssistantLevels,a:Actor){
 if(a.origin!=='ai'||l.data!=='blocked'||l.apps!=='blocked')return;
 const blocks=(x:AssistantAreas)=>x.data==='blocked'||x.apps==='blocked';
 fail(403,'assistant_blocked',`${ASSISTANT_NAMES[assistantOf(a)]} is set to Blocked for data and apps. ${whereToChange(blocks(l.organization),blocks(l.personal))}`);
}
/** Records, tables and files: View only reads, Blocked does neither. p is the policy access() returned for this actor. */
export function requireAssistantData(p:any,a:Actor,write:boolean){if(a.origin!=='ai')return;const l=levelsOf(p,a);if(l.data==='blocked'||write&&l.data!=='edit')refuse(a,l,'data',write);}
/** App code and layout, table connections, automations: View only reads, Blocked does neither. */
export function requireAssistantApps(p:any,a:Actor,write:boolean){if(a.origin!=='ai')return;const l=levelsOf(p,a);if(l.apps==='blocked'||write&&l.apps!=='edit')refuse(a,l,'apps',write);}
/** With Data or Apps Blocked an assistant still sees which apps exist, by name only. */
export function assistantNamesOnly(p:any,a:Actor){if(a.origin!=='ai')return false;const l=levelsOf(p,a);return l.data==='blocked'||l.apps==='blocked';}
/** Table connections cannot be checked for an assistant that sees no table; such an app is then listed by name alone. */
export function assistantDataBlocked(p:any,a:Actor){return a.origin==='ai'&&levelsOf(p,a).data==='blocked';}
export const appNameOnly=(c:any)=>({id:c.id,workspace_id:c.workspace_id,project_id:c.project_id,name:c.name,format:c.format,resource_kind:c.resource_kind,version:c.version,archived:c.archived,archived_at:c.archived_at,created_at:c.created_at,project_archived:c.project_archived,app_role:c.app_role});

const APP_CHANGES=new Set(['create_tracker','save_component','move_component','archive_component','copy_component','set_component_access','create_automation_template']);
// Organizing projects, and a new table, belong to building an app as much as to data: either Edit is enough.
const SHARED_CHANGES=new Set(['create_node','rename_node','archive_node','set_project_access','create_type']);
/** One gate for a change an assistant prepares or saves, by its kind: app changes need Apps = Edit, everything else Data = Edit. */
export function requireAssistantChange(p:any,a:Actor,kind:string){
 if(a.origin!=='ai')return;
 if(APP_CHANGES.has(kind))return requireAssistantApps(p,a,true);
 if(SHARED_CHANGES.has(kind)&&levelsOf(p,a).apps==='edit')return;
 requireAssistantData(p,a,true);
}

const assistantName=z.enum(['chatgpt','claude']),levelName=z.enum(ASSISTANT_LEVELS);
export const assistantLevelChange=z.object({assistant:assistantName,data:levelName,apps:levelName}).strict();
const adapter=(tx:Connection):Database=>({query:tx.query.bind(tx) as any,transaction:fn=>fn(tx),close:async()=>{}});

export class AssistantLevelSettings{
 constructor(private db:Database){}
 /** The organization maximum, the caller's own limit and what applies, per assistant. Organization owners also see everyone's limits. */
 async read(a:Actor,w:string){
  const p=await access(this.db,a,w),owner=p.role==='owner';
  const rows=(await this.db.query('SELECT user_id,assistant,data_level,apps_level,updated_at FROM assistant_limits WHERE workspace_id=$1 AND ($3 OR user_id=$2)',[w,a.userId,owner])).rows;
  const limit=(userId:string,x:Assistant):AssistantAreas=>{const r=rows.find(r=>r.user_id===userId&&r.assistant===x);return {data:level(r?.data_level),apps:level(r?.apps_level)};};
  // Inside an assistant only that assistant is shown, as on the Access page.
  const assistants=(a.origin==='ai'?[assistantOf(a)]:[...ASSISTANTS]).map(x=>{const maximum=maximumOf(p,x),mine=limit(a.userId,x),switches=legacyLevel(p,{userId:a.userId,origin:'ai',assistant:x});
   return {id:x,name:ASSISTANT_NAMES[x],maximum,mine,effective:{data:lowestLevel(maximum.data,mine.data,switches),apps:lowestLevel(maximum.apps,mine.apps,switches)}};});
  let people:any[]|undefined;
  if(owner){
   const members=(await this.db.query("SELECT u.id,u.name,u.email FROM memberships m JOIN users u ON u.id=m.user_id LEFT JOIN workspace_access wa ON wa.workspace_id=$1 AND wa.user_id=m.user_id WHERE m.tenant_id=$2 AND m.kind='member' AND (m.role='owner' OR wa.user_id IS NOT NULL) ORDER BY u.name,u.email,u.id",[w,p.tenant_id])).rows;
   people=members.map(m=>({id:m.id,name:m.name||m.email,limits:Object.fromEntries(ASSISTANTS.map(x=>[x,limit(m.id,x)]))}));
  }
  return {workspaceId:w,version:p.access_version,canSetMaximum:owner&&a.origin==='human',canSetMine:a.origin==='human',levels:[...ASSISTANT_LEVELS].reverse().map(id=>({id,name:LEVEL_NAMES[id]})),assistants,...(people?{people}:{})};
 }
 /** Organization owners set the most an assistant may do for anyone in the organization. */
 async setMaximum(a:Actor,w:string,input:unknown){
  const v=assistantLevelChange.parse(input);if(a.origin!=='human')fail(403,'human_required','Sign in to TrialAgents yourself to change what assistants may do');
  return this.db.transaction(async tx=>{
   await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await access(tx,a,w,true);
   if(p.role!=='owner')fail(403,'owner_required','Only an organization owner can change what assistants may do for everyone');
   const before=maximumOf(p,v.assistant),after={data:v.data,apps:v.apps};
   if(before.data!==after.data||before.apps!==after.apps){
    await tx.query(`UPDATE workspaces SET ${v.assistant}_data_level=$2,${v.assistant}_apps_level=$3,access_version=access_version+1 WHERE id=$1`,[w,v.data,v.apps]);
    await audit(tx,a,p,'assistant.maximum_changed',w,{assistant:v.assistant,...before},{assistant:v.assistant,...after});
   }
   return new AssistantLevelSettings(adapter(tx)).read(a,w);
  });
 }
 /** Anyone on the team tightens their own assistant. A limit above the organization maximum changes nothing. */
 async setMine(a:Actor,w:string,input:unknown){
  const v=assistantLevelChange.parse(input);if(a.origin!=='human')fail(403,'human_required','Sign in to TrialAgents yourself to change your assistant limit');
  return this.db.transaction(async tx=>{
   await tx.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[w]);const p=await access(tx,a,w);
   const old=(await tx.query('SELECT data_level,apps_level FROM assistant_limits WHERE workspace_id=$1 AND user_id=$2 AND assistant=$3',[w,a.userId,v.assistant])).rows[0];
   const before={data:level(old?.data_level),apps:level(old?.apps_level)},after={data:v.data,apps:v.apps};
   if(before.data!==after.data||before.apps!==after.apps){
    // The database raises the workspace access version with the limit (migration 085), so open apps check access again.
    if(old)await tx.query('UPDATE assistant_limits SET data_level=$4,apps_level=$5,updated_at=now() WHERE workspace_id=$1 AND user_id=$2 AND assistant=$3',[w,a.userId,v.assistant,v.data,v.apps]);
    else await tx.query('INSERT INTO assistant_limits(workspace_id,user_id,assistant,data_level,apps_level) VALUES($1,$2,$3,$4,$5)',[w,a.userId,v.assistant,v.data,v.apps]);
    await audit(tx,a,p,'assistant.limit_changed',a.userId,{assistant:v.assistant,...before},{assistant:v.assistant,...after});
   }
   return new AssistantLevelSettings(adapter(tx)).read(a,w);
  });
 }
}
