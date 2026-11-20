import {uxWidth,type UxSample} from './ux-timing-schema.js';
type Send=(samples:UxSample[])=>Promise<unknown>;
/**
 * Collects timing samples and hands them to the host in small batches (P10). Sending is best effort and silent:
 * measurement must never slow the app down or show an error.
 */
export class UxTimer{
 private queue:UxSample[]=[];private timer:ReturnType<typeof setTimeout>|undefined;
 constructor(private send:Send|undefined,private host:UxSample['host'],private mode:'server'|'browser'='server'){}
 record(metric:UxSample['metric'],ms:number){
  if(!this.send||!Number.isFinite(ms)||ms<0)return;
  this.queue.push({metric,ms:Math.min(600000,Math.round(ms)),host:this.host,width:uxWidth(window.innerWidth),mode:this.mode});
  if(this.queue.length>=20)this.flush();else this.timer??=setTimeout(()=>this.flush(),5000);
 }
 flush(){clearTimeout(this.timer);this.timer=undefined;const batch=this.queue.splice(0,50);if(batch.length&&this.send)void this.send(batch).catch(()=>{});}
}
