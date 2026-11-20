import type {Connection} from '../db/database.js';
import {AppError,fail,type Actor} from '../shared/schema.js';
import {toolPolicy,type AppRole} from './effective-access.js';
export type {AppRole};
/** R3–R5. Roles in rising order; "none" means no access. */
export const APP_ROLES=['none','viewer','editor','owner'] as const;
export type AppRoleOrNone=typeof APP_ROLES[number];
export const roleRank=(r:AppRoleOrNone|null|undefined)=>Math.max(0,APP_ROLES.indexOf((r??'none') as AppRoleOrNone));
/**
 * The role the acting person holds on one app, or null when they cannot open it.
 * An organization owner owns every app (D4). An assistant acts with the role of the person it works for;
 * what an assistant may do with that role is decided separately.
 */
export async function appRole(db:Connection,a:Actor,p:any,appId:string):Promise<AppRole|null>{
 try{return (await toolPolicy(db,a,p,appId)).role;}
 catch(e){if(e instanceof AppError&&(e.status===403||e.status===404))return null;throw e;}
}
/** Gate for everything only an owner of the app may do: code, settings, sharing, roles, archive. */
export async function requireAppOwner(db:Connection,a:Actor,p:any,appId:string,message='Only an owner of this app can do this'){
 if(p.role==='owner')return;
 if(await appRole(db,a,p,appId)!=='owner')fail(403,'app_owner_required',message);
}
