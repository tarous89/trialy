// Spike 1.9: the frame-local store stub. Pure JavaScript with no imports, so the same text runs in Node (sanity check)
// and is bundled into the frame script by build.mjs.
/**
 * The in-memory store that answers tools.call synchronously. It is written as one self-contained function so the same
 * text runs in Node and inside the frame.
 * records.read / records.readMany follow tests/batched-read-apps.test.ts (filters, search and sort apply before paging);
 * the exchange reads follow tests/fixtures/cro-selection.ts; everything with an outside effect is refused, as the plan
 * forwards those events to the server.
 */
export function createStore(data){
 const rows=data.records,X=data.exchange,documents=data.documents??[];
 const one=input=>{
  let selected=rows.filter(r=>r.role===input.typeId&&Object.entries(input.filters??{}).every(([k,x])=>String(r.data[k])===x)&&(!input.q||Object.values(r.data).some(x=>String(x).toLowerCase().includes(String(input.q).toLowerCase()))));
  if(input.sort){const f=input.sort.field,d=input.sort.direction==='desc'?-1:1;selected=selected.slice().sort((a,b)=>{const x=a.data[f],y=b.data[f];if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return (typeof x==='number'?x-y:String(x).localeCompare(String(y)))*d;});}
  return {rows:selected.slice(input.offset,input.offset+input.limit).map(({id,version,data})=>({id,version,data})),total:selected.length,limit:input.limit,offset:input.offset};
 };
 return function call(name,input){
  if(name==='records.read')return one(input);
  if(name==='records.readMany')return {results:input.reads.map(one)};
  if(name==='integrations.list')return {integrations:[]};
  if(name==='roles.list')return {roles:[]};
  if(name==='documents.list')return {documents,total:documents.length,complete:true};
  if(name==='exchange.list'&&X)return {groups:X.groups.filter(g=>(!input.groupId||g.id===input.groupId)&&(!input.appRef||g.appRef===input.appRef)),nextOffset:null};
  if(name==='exchange.status'&&X){for(const g of X.groups)for(const e of g.exchanges)if(e.id===input.exchangeId)return {exchangeId:e.id,recordId:e.recordId,status:e.status};throw new Error('not found');}
  if(name==='exchange.listSubmissions'&&X)return {submissions:X.submissions.filter(s=>s.groupId===input.groupId||s.exchangeId===input.exchangeId),nextOffset:null};
  if(name==='exchange.listMessages'&&X)return {messages:X.messages.filter(m=>!input.groupId||m.groupId===input.groupId).slice().reverse(),nextOffset:null};
  if(name==='exchange.listEmails'&&X)return {emails:X.emails.filter(m=>m.groupId===input.groupId),nextOffset:null};
  if(name==='exchange.defaultEmail'&&X)return {emailType:input.emailType,subject:'Platform subject',body:'Platform body {link}',source:'app'};
  if(name==='exchange.notifications'&&X)return {notifications:[]};
  throw new Error('Server action: '+name);
 };
}

export const inputFor=(state,event)=>({saved:true,writable:true,state,event:{value:null,form:{},...event}});
