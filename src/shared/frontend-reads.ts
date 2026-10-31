/** Coalesce identical in-flight navigation reads in one mounted app only.
 * No completed result, mutation, or data from another app instance is cached.
 */
export class FrontendReads{
 private pending=new Map<string,Promise<any>>();
 run(request:any,call:(request:any)=>Promise<any>,standard:boolean){
  const event=request.event??{};
  if(!standard||event.kind!=='click'||!/^tab:-?\d+$|^next$|^previous$/.test(event.action??''))return call(request);
  const key=JSON.stringify([request.componentId,request.previewId,request.expectedVersion,request.viewId,request.route??null,request.state??null,event.action,event.value===''?null:event.value??null,event.form??{}]);
  const existing=this.pending.get(key);if(existing)return existing;
  const work=call(request).finally(()=>{if(this.pending.get(key)===work)this.pending.delete(key);});this.pending.set(key,work);return work;
 }
}
