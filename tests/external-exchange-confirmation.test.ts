import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {AsyncLocalStorage} from 'node:async_hooks';
import {PGlite} from '@electric-sql/pglite';
import {withActor,setDatabaseContext} from '../src/db/context.js';
import type {Database,Connection} from '../src/db/database.js';
import {Service} from '../src/domain/service.js';
import {WorkspaceFoundation} from '../src/workspace/service.js';
import {listExchanges} from '../src/domain/external-exchange.js';
import type {Actor} from '../src/shared/schema.js';

/* One confirmation when something goes out (template guidance 1.3.23): preparing what nobody outside has seen is applied on a person's
 * click and logged; sends, replies, clarifications, acceptances and revocations are reviewed, and may carry the app's own record changes,
 * which commit in the same transaction. Runtime role and row security as in the platform exchange test. */
test('External exchange from apps: preparation on click, one reviewed send that also updates the bound record, notify-all, assistants always reviewed',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());for(const n of (await readdir('migrations')).filter(x=>x.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+n,'utf8'));await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 const storage=new AsyncLocalStorage<Connection>();
 const db:Database={query:async(q,v)=>storage.getStore()?.query(q,v)??db.transaction(tx=>tx.query(q,v)),transaction:async fn=>{const current=storage.getStore();if(current)return fn(current);return pg.transaction(async raw=>{await raw.exec('SET LOCAL ROLE trialy_runtime');const tx:Connection={query:async(q,v)=>{await setDatabaseContext(raw as any);return raw.query(q,v) as any;}};return storage.run(tx,()=>fn(tx));});},close:async()=>{}};
 const owner:Actor={userId:randomUUID(),origin:'human'},ai:Actor={...owner,origin:'ai'};
 await pg.query('INSERT INTO users(id,subject,email,name) VALUES($1::uuid,$1::text,$2,$3)',[owner.userId,'owner@sponsor.invalid','Alex Owner']);
 const s=new Service(db),f=new WorkspaceFoundation(db),run=<T>(a:Actor,fn:()=>Promise<T>)=>withActor(a,fn);
 const w=await run(owner,()=>s.createWorkspace(owner,'Clinical ops'));
 const save=(op:any)=>run(owner,async()=>{const p=await s.preview(owner,w.id,op);return s.commit(owner,p.id,p.digest);});
 const bids=(await save({kind:'create_type',name:'Bids',fields:[{key:'name',name:'Supplier',kind:'text',required:true,ai:true},{key:'status',name:'Status',kind:'text',ai:true},{key:'price',name:'Price',kind:'number',ai:true}]})).objects[0].id as string;
 const recA=(await save({kind:'create_record',typeId:bids,data:{name:'Alpha CRO',status:'longlist'}})).objects[0],recB=(await save({kind:'create_record',typeId:bids,data:{name:'Beta CRO',status:'longlist'}})).objects[0];
 const pack=await run(owner,async()=>{const p=await s.previewFile(owner,w.id,{filename:'Pack.pdf',mime:'application/pdf',bytes:Buffer.from('%PDF-1.4 pack'),ai:false});return (await s.commit(owner,p.id,p.digest)).objects[0].versionId as string;});
 const project=randomUUID();await pg.query("INSERT INTO workspace_nodes(id,workspace_id,name,kind) VALUES($1,$2,'Apps','project')",[project,w.id]);
 // A small app: each click performs exactly one exchange call; "send" also proposes the invited status for every recipient.
 const source=`const e=input.event||{},v=e.form||{},s=input.state||{};let note='';
 const ids=()=>s.ids||{};
 if(e.action==='group'){const r=tools.call('exchange.createGroup',{title:'RFP',appRef:'request:1:rfp',typeId:'${bids}',fields:['name','price']});note=r.status;}
 if(e.action==='invite'){const g=tools.call('exchange.list',{appRef:'request:1:rfp'}).groups[0];const r=tools.call('exchange.invite',{groupId:g.id,days:20,recipients:[{emails:['anna@alpha.invalid'],recordId:'${recA.id}'},{emails:['ben@beta.invalid'],recordId:'${recB.id}'}]});note=r.status;}
 if(e.action==='share'){const g=tools.call('exchange.list',{appRef:'request:1:rfp'}).groups[0];note=tools.call('exchange.shareDocuments',{groupId:g.id,expectedVersion:g.version,add:['${pack}']}).status;}
 if(e.action==='prepare'){const g=tools.call('exchange.list',{appRef:'request:1:rfp'}).groups[0];const b=tools.call('exchange.prepareEmail',{groupId:g.id,emailType:'invitation'});s.batch={batchId:b.batchId,digest:b.digest};}
 if(e.action==='send'){note=tools.call('exchange.sendEmail',s.batch).status;tools.call('records.propose',[{kind:'update_record',recordId:'${recA.id}',expectedVersion:Number(v.va),data:{status:'invited'}},{kind:'update_record',recordId:'${recB.id}',expectedVersion:Number(v.vb),data:{status:'invited'}}]);}
 if(e.action==='notify'){const g=tools.call('exchange.list',{appRef:'request:1:rfp'}).groups[0];note=tools.call('exchange.replyAll',{replies:g.exchanges.map(x=>({exchangeId:x.id,body:'Decision for '+x.recordId})),notify:true}).status;}
 return {html:'<p>'+note+'</p>',state:s};`;
 const appId=randomUUID();await pg.query("INSERT INTO workspace_components(id,workspace_id,project_id,name,format,source,bindings,source_access,created_by) VALUES($1,$2,$3,'Bids','frontend-js',$4,$5,'bindings',$6)",[appId,w.id,project,source,JSON.stringify([{typeId:bids,fields:['name','status','price']}]),owner.userId]);
 let state:any={};const click=async(who:Actor,action:string,form:any={})=>{const out:any=await run(who,()=>f.runFrontend(who,w.id,{componentId:appId,expectedVersion:0,state,event:{kind:'click',action,value:null,form}}));state=out.state;return out;};
 const emails=async()=>Number((await pg.query<any>('SELECT count(*)::int n FROM exchange_emails WHERE workspace_id=$1',[w.id])).rows[0].n);
 const rec=async(id:string)=>(await pg.query<any>('SELECT version,data FROM records WHERE id=$1',[id])).rows[0];
 // 1. Preparation is applied on the person's click, logged, and found again through the app's own reference.
 assert.equal((await click(owner,'group')).html,'<p>saved</p>');
 const [group]=(await run(owner,()=>listExchanges(db,owner,w.id,{appRef:'request:1:rfp'}))).groups;assert.equal(group.appRef,'request:1:rfp');
 assert.equal((await click(owner,'invite')).html,'<p>saved</p>');assert.equal((await click(owner,'share')).html,'<p>saved</p>','documents before anyone outside has seen the round');
 assert.ok((await pg.query<any>("SELECT 1 FROM audit_events WHERE workspace_id=$1 AND action IN ('exchange.group_created','exchange.invited','exchange.documents_shared')",[w.id])).rows.length>=3,'preparation is audited');
 assert.equal(await emails(),0,'nothing went out');
 // An assistant running the same app never applies anything: it gets a review a person must confirm.
 const aiOut=await click(ai,'share');assert.match(aiOut.html,/review_required|stale|saved/);assert.ok(aiOut.proposal||!/saved/.test(aiOut.html),'assistants are always reviewed');if(aiOut.proposal)await run(owner,()=>f.discard(owner,w.id,aiOut.proposal.id));
 // 2. One review: the emails exactly as sent and both suppliers' status. Stale record → nothing is sent and nothing is saved.
 await click(owner,'prepare');
 const stale=await click(owner,'send',{va:String((await rec(recA.id)).version),vb:String((await rec(recB.id)).version)});assert.equal(stale.proposal?.body?.kind,'send_exchange_email');assert.equal(stale.proposal.body.records.changes.length,2);
 // Someone edits Alpha's record before the send is confirmed.
 await run(owner,async()=>{const r=await rec(recA.id);const p=await s.preview(owner,w.id,{kind:'update_record',recordId:recA.id,expectedVersion:r.version,data:{price:100}});return s.commit(owner,p.id,p.digest);});
 assert.ok(stale.proposal.exchangeReview.plan.documents.includes('Pack.pdf'));assert.equal(stale.proposal.exchangeReview.plan.recipients.length,2);
 await assert.rejects(()=>run(owner,()=>f.confirm(owner,w.id,stale.proposal.id,stale.proposal.digest)));assert.equal(await emails(),0);assert.equal((await rec(recA.id)).data.status,'longlist');
 await click(owner,'prepare');const ok=await click(owner,'send',{va:String((await rec(recA.id)).version),vb:String((await rec(recB.id)).version)});
 await assert.rejects(()=>run(ai,()=>f.confirm({...ai,actionConfirmed:true},w.id,ok.proposal.id,ok.proposal.digest)),/cannot approve/);
 const sent=await run(owner,()=>f.confirm(owner,w.id,ok.proposal.id,ok.proposal.digest));assert.ok(sent.records);
 assert.equal(await emails(),2);assert.equal((await rec(recA.id)).data.status,'invited');assert.equal((await rec(recB.id)).data.status,'invited');
 // 3. Once suppliers were emailed, changing what they see is reviewed again.
 const after=await click(owner,'share');assert.equal(after.proposal?.body?.kind,'share_exchange_documents');await run(owner,()=>f.discard(owner,w.id,after.proposal.id));
 // 4. Notify all: one review, one private message and email per recipient; only a person confirms.
 const n=await click(owner,'notify');assert.equal(n.proposal.body.kind,'reply_exchanges');assert.equal(n.proposal.exchangeReview.replies.length,2);
 await assert.rejects(()=>run(ai,()=>f.confirm({...ai,actionConfirmed:true},w.id,n.proposal.id,n.proposal.digest)),/cannot approve/);
 await run(owner,()=>f.confirm(owner,w.id,n.proposal.id,n.proposal.digest));
 assert.equal(Number((await pg.query<any>("SELECT count(*)::int n FROM exchange_messages WHERE workspace_id=$1 AND kind='private' AND author='workspace'",[w.id])).rows[0].n),2);assert.equal(await emails(),4);
});
