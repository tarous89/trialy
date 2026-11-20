/**
 * U2: the platform shows one system message at a time, bottom right.
 * - A newer message replaces the one on screen.
 * - An error that has not been dismissed is replaced only by a newer error, never by an info or success message.
 * - Info and success messages close on their own after INFO_MS; errors stay until dismissed.
 * This module is the rule; SystemNotice and PlatformChrome.notify are its only users.
 */
export const INFO_MS=5000;
export type NoticeEntry={id:number;error:boolean;order:number;dismiss:()=>void};
export class NoticeSlot{
 private entries=new Map<number,NoticeEntry>();private order=0;private listeners=new Set<()=>void>();
 /** Register a message. Returns the entries it replaced; the caller dismisses them after the current render. */
 show(id:number,error:boolean,dismiss:()=>void):NoticeEntry[]{
  const replaced=[...this.entries.values()].filter(e=>e.id!==id&&(!e.error||error));
  for(const e of replaced)this.entries.delete(e.id);
  this.entries.set(id,{id,error,order:++this.order,dismiss});this.emit();return replaced;
 }
 hide(id:number){if(this.entries.delete(id))this.emit();}
 /** The single visible message: the newest error if one is waiting, otherwise the newest message. */
 visible():number|null{
  let best:NoticeEntry|undefined;
  for(const e of this.entries.values())if(!best||(e.error&&!best.error)||(e.error===best.error&&e.order>best.order))best=e;
  return best?.id??null;
 }
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 private emit(){for(const l of this.listeners)l();}
}
export const noticeSlot=new NoticeSlot();
let nextId=0;export const newNoticeId=()=>++nextId;
