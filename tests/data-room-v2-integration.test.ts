import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {dataRoomSuite,text} from './fixtures/data-room.js';
import {AppTemplates} from '../src/workspace/app-templates.js';
import {runAppCommand} from '../src/workspace/app-commands.js';
import {isV2Source} from '../src/workspace/browser-runtime.js';

/* Data Room 2.0.0 through the real catalog, installer and app runtime (v2 contract): install, open, direct saves from the person's
 * clicks and edits (no review), a set-up step, an inline edit, the room made live on the click, and app commands that save
 * directly. Fictional data only; a disposable database. */
test('2.0.0: install, open, save directly from a click and an inline edit, go live, and run commands',async()=>{
 const x=await dataRoomSuite();const {f,actor,pg,db}=x;
 try{
  await pg.query("UPDATE app_template_catalog SET status='approved' WHERE template_id='life.data-room' AND version='2.0.0'");
  const t=await new AppTemplates(undefined,db).read({templateId:'life.data-room',version:'2.0.0'});assert.equal(t.version,'2.0.0');
  const w=(await x.s.createWorkspace(actor,'Northwind Bio')).id;const {receipt}=await x.install(w,t,'Data Room');const id=receipt.appId,c=await x.comp(w,id),map=x.mapOf(c),tid=(r:string)=>map[r].typeId;
  assert.equal(Object.keys(map).length,13);assert.ok(isV2Source(c.source),'the installed app runs the v2 contract');
  const ui=x.app(w,id);
  // Open: an empty app offers its first action; nothing is written while opening.
  const open=await ui.open();assert.equal(open.runtime,'trialy-frontend-js-v2');
  // The app carries a helper, so it has a manifest; a v2 app's own inputs must still stay usable on the first screen.
  assert.equal(open.connected,false);assert.match(open.html,/class="k-empty"[\s\S]*data-action="panel:newroom"/);assert.doesNotMatch(open.html,/<header|<h1/);assert.equal(open.proposal,null);
  // A click saves directly: no review, the screen is made again from the saved data, with the platform notice.
  await ui.click('panel:newroom');const made=await ui.submit('create-room',{name:'Series B data room',purpose:'financing',template_id:'builtin:financing',cda_option:'none'});
  assert.ok(made.saved,'saved directly');assert.equal(made.proposal,null);assert.equal(made.notice?.kind,'success');assert.match(made.notice.message,/Room created/);
  const room=(await x.rows(tid('dataroom.rooms'))).find((r:any)=>r.data.name==='Series B data room');assert.equal(room.data.status,'preparing');
  await ui.open({section:'rooms',roomId:room.id});const setup=await ui.click('setup-structure:'+room.id);assert.ok(setup.saved);
  const levels=(await x.rows(tid('dataroom.levels'))).filter((l:any)=>l.data.room_id===room.id).sort((a:any,b:any)=>a.data.order-b.data.order);
  assert.deepEqual(levels.map((l:any)=>[l.data.name,l.data.entry]),[['Non-confidential','none'],['Confidential','click_through']]);
  // An inline edit on the screen saves the value with the version it was shown with.
  const screen=await ui.open({section:'rooms',roomId:room.id});const action='edit:'+levels[1].id+':name:'+levels[1].version;assert.ok(screen.html.includes('data-action="'+action+'"'));
  const edited=await ui.change(action,'Confidential (CDA)');assert.ok(edited.saved);assert.equal((await x.rows(tid('dataroom.levels'))).find((l:any)=>l.id===levels[1].id).data.name,'Confidential (CDA)');
  await assert.rejects(()=>ui.change(action,'Stale name'),/changed this value first/,'a value shown with an older version is refused');
  // Items, then the room goes live on the person's click (nobody outside has seen it); the status saves with it.
  assert.ok((await ui.click('setup-items:'+room.id)).saved);await ui.open({section:'rooms',roomId:room.id});await ui.click('panel:live');
  const live=await ui.submit('go-live',{});assert.match(live.notice?.message??'',/The room is live/);assert.equal(live.proposal,null);
  assert.equal((await x.rows(tid('dataroom.rooms'))).find((r:any)=>r.id===room.id).data.status,'live');assert.equal((await x.room(w,'room:'+room.id)).kind,'room');
  // Commands: a read command returns the app's own result; a write command saves directly through the same handler.
  const cur=await x.comp(w,id);
  const read=await runAppCommand(f,actor,w,{appId:id,expectedVersion:cur.version,command:'rooms.read',input:{},requestKey:randomUUID()});assert.equal(read.ok,true);assert.equal((read.result as any).rooms[0].live,true);
  const cmd=await runAppCommand(f,actor,w,{appId:id,expectedVersion:cur.version,command:'room.create',input:{name:'Licensing room',purpose:'licensing',cda_option:'send_pdf'},requestKey:randomUUID()});
  assert.equal(cmd.ok,true,JSON.stringify(cmd));assert.ok((cmd as any).saved,'saved directly, no review');assert.ok((await x.rows(tid('dataroom.rooms'))).some((r:any)=>r.data.name==='Licensing room'));
  const shown=text((await ui.open({section:'overview'})).html);assert.match(shown,/Series B data room Financing Live/);assert.match(shown,/Licensing room Licensing Preparing/);
 }finally{await x.pg.close();}
});
