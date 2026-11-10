import {fail,assistantOf,ASSISTANT_NAMES,type Actor,type Assistant} from '../shared/schema.js';

export type ServiceReviewKind='automation_setup'|'monitoring'|'action'|'automation_control';
const canonical=(value:any):any=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;

// Stable across JSONB's key ordering; includes the exact scope and destination.
export function serviceReview(w:string,id:string,kind:ServiceReviewKind,digest:string,body:unknown){
 return JSON.stringify(canonical({workspaceId:w,reviewId:id,kind,digest,body}),null,2);
}
export function chatServiceReview(w:string,id:string,kind:ServiceReviewKind,digest:string,body:unknown){
 return {review:serviceReview(w,id,kind,digest,body),confirmation:{operation:'confirm_app_service_review',workspaceId:w,reviewId:id,kind,digest}};
}
export function checkServiceReview(a:Actor,w:string,r:any,review?:string){
 if(a.origin==='ai'&&review!==serviceReview(w,r.id,r.kind,r.digest,r.body))fail(409,'review_changed','Pass the exact review returned by preparation or read_app_service_review. Review any changed configuration before confirming.');
 // A review prepared in one assistant can be confirmed there or on the web, never in the other assistant.
 if(a.origin==='ai'&&r.assistant&&r.assistant!==assistantOf(a))fail(403,'other_assistant_review',`This review was prepared in ${ASSISTANT_NAMES[r.assistant as Assistant]}. Confirm it there or on the TrialAgents website.`);
}
