/**
 * D16 (4.4): record edits in apps save directly. A test that drives an app action uses settle() for "the action takes
 * effect": a direct save is already done (its receipt is returned); a change that still needs a person's review (layout,
 * an exchange that sends something out, changes made while opening) is confirmed as before.
 */
export async function settle(f:{confirm:(a:any,w:string,id:string,digest:string,installation?:unknown)=>Promise<any>},a:any,w:string,out:any){
 if(out?.saved&&!out.proposal)return out.saved;
 if(!out?.proposal)throw Error('The action neither saved nor prepared a review'+(out?.state?.notice?': '+out.state.notice:''));
 return f.confirm(a,w,out.proposal.id,out.proposal.digest);
}
/** The action took effect directly or prepared a review. */
export const tookEffect=(out:any)=>!!(out?.saved||out?.proposal);
/** The same for run_app_command results, whose review is { previewId, digest }. */
export async function settleCommand(f:{confirm:(a:any,w:string,id:string,digest:string)=>Promise<any>},a:any,w:string,out:any){
 if(out?.saved&&!out.proposal)return out.saved;
 if(!out?.proposal)throw Error('The command neither saved nor prepared a review'+(out?.error?': '+out.error:''));
 return f.confirm(a,w,out.proposal.previewId,out.proposal.digest);
}
