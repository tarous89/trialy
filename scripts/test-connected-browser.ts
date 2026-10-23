import {setDatabaseContext} from '../src/db/context.js';
/** Isolated acceptance: real login/CSRF/routes, synthetic data, no production writes.
 * npm run build; PLAYWRIGHT_IMPORT=/absolute/path/to/playwright/index.mjs CHROMIUM_PATH=/path/to/chromium node --import tsx scripts/test-connected-browser.ts
 */
import express from 'express';import session from 'express-session';import {PGlite} from '@electric-sql/pglite';import {readFile,readdir} from 'node:fs/promises';import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';
import {baseApp,addApi,errors} from '../src/server/app.js';import {addLocalAuth} from '../src/server/auth.js';import {Service} from '../src/domain/service.js';import {WorkspaceFoundation} from '../src/workspace/service.js';import type {Database,Connection} from '../src/db/database.js';
if(!process.env.PLAYWRIGHT_IMPORT)throw Error('Set PLAYWRIGHT_IMPORT to an installed Playwright module');const {chromium}=await import(process.env.PLAYWRIGHT_IMPORT);
process.env.NODE_ENV='test';const pg=new PGlite();const db:Database={query:(s,v)=>pg.query(s,v) as any,transaction:f=>pg.transaction(tx=>f(tx as Connection)),close:()=>pg.close()};
const app=baseApp();app.use(session({secret:randomUUID()+randomUUID(),resave:false,saveUninitialized:false}));
const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base='http://127.0.0.1:'+(server.address() as any).port;process.env.PUBLIC_URL=base;
const requestDb:Database={query:(s,v)=>requestDb.transaction(tx=>tx.query(s,v)),transaction:f=>pg.transaction(async tx=>{await tx.exec('SET LOCAL ROLE trialy_runtime');await setDatabaseContext(tx as Connection);return f(tx as Connection);}),close:async()=>{}};
const auth=addLocalAuth(app,requestDb,base);const service=new Service(db);addApi(app,new Service(requestDb),auth.human);app.use(express.static('dist/web'));app.get('/{*path}',(_req,res)=>res.sendFile('index.html',{root:'dist/web'}));app.use(errors);
let browser:any;
try{
 for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await pg.exec(await readFile('migrations/'+f,'utf8'));
 await pg.exec(await readFile('ops/runtime-role.sql','utf8'));
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'],headless:true});
 const page=await browser.newPage(),exceptions:string[]=[];page.on('pageerror',(e:Error)=>exceptions.push(e.message));
 await page.goto(base+'/auth/login?mode=signup');await page.getByLabel('Email',{exact:true}).fill('browser@example.invalid');await page.getByLabel('Password',{exact:true}).fill('synthetic-browser-password-123');await page.locator('input[name=intendedUse]').check();await page.getByRole('button',{name:'Create account',exact:true}).click();await page.waitForURL(base+'/');
 const account=(await db.query('SELECT user_id FROM local_accounts')).rows[0],actor={userId:account.user_id,origin:'human' as const},w=await service.createWorkspace(actor,'Acceptance workspace');await service.setAi(actor,w.id,true);
 const change=async(op:any)=>{const p=await service.preview(actor,w.id,op);return service.commit(actor,p.id,p.digest);};
 const table=(await change({kind:'create_type',name:'Shared vendors',fields:[{key:'name',name:'Vendor name',kind:'text',ai:true}]})).objects[0].id;
 const row=(await change({kind:'create_record',typeId:table,data:{name:'Synthetic vendor'}})).objects[0].id;
 const foundation=new WorkspaceFoundation(db),org=async(op:any)=>{const p=await foundation.preview(actor,w.id,op);return foundation.confirm(actor,w.id,p.id,p.digest);};
 const project=await org({kind:'create_node',nodeKind:'project',name:'Project A'});await org({kind:'link_project_records',projectId:project.id,expectedProjectVersion:0,records:[{recordId:row,expectedVersion:0}],reason:'Acceptance fixture'});
 const tracker=await org({kind:'save_component',projectId:project.id,content:{name:'Connected tracker',format:'frontend-js',resourceKind:'tracker',sourceAccess:'bindings',bindings:[{typeId:table,fields:['name']}],manifest:{version:1,scope:'project',fields:[{id:'vendor',typeId:table,field:'name',schemaVersion:0,kind:'text',mode:'read'}]},source:`return {html:'<span data-trialy-slot="vendor"></span>',controls:[{slot:'vendor',fieldId:'vendor',recordId:'${row}'}]};`}});
 const timings:any[]=[];page.on('response',async(r:any)=>{if(r.url().endsWith('/organization/database')){const bytes=(await r.body()).length;timings.push({status:r.status(),bytes,requestMs:r.request().timing().responseEnd});}});
 await page.goto(base+'/?workspaceId='+w.id);await page.getByRole('button',{name:'Database',exact:true}).click();await page.locator('select').filter({has:page.locator('option[value="'+table+'"]')}).selectOption(table);await page.getByText('Synthetic vendor',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Trackers',exact:true}).click();await page.getByRole('button',{name:'Connected tracker',exact:true}).click();await page.frameLocator('iframe[title="Saved frontend code"]').getByText('Synthetic vendor',{exact:true}).waitFor();
 // A second real browser account loses field access while its tracker is open.
 const memberContext=await browser.newContext(),memberPage=await memberContext.newPage();await memberPage.goto(base+'/auth/login?mode=signup');await memberPage.getByLabel('Email',{exact:true}).fill('member@example.invalid');await memberPage.getByLabel('Password',{exact:true}).fill('synthetic-member-password-123');await memberPage.locator('input[name=intendedUse]').check();await memberPage.getByRole('button',{name:'Create account',exact:true}).click();await memberPage.waitForURL(base+'/');
 const member=(await db.query("SELECT user_id FROM local_accounts WHERE email='member@example.invalid'")).rows[0];await service.share(actor,w.id,member.user_id,'editor',[],null,true);
 await memberPage.goto(base+'/?workspaceId='+w.id+'&tab=trackers');await memberPage.getByRole('button',{name:'Connected tracker',exact:true}).click();await memberPage.frameLocator('iframe[title="Saved frontend code"]').getByText('Synthetic vendor',{exact:true}).waitFor();
 await service.share(actor,w.id,member.user_id,'editor',['name'],null,true);await memberPage.evaluate(()=>window.dispatchEvent(new Event('focus')));await memberPage.locator('iframe[title="Saved frontend code"]').waitFor({state:'detached'});assert.equal(await memberPage.getByRole('button',{name:'Edit configuration / history',exact:true}).count(),0);await memberContext.close();
 // A resource revision becomes stale while its generated frame remains open.
 await db.query('UPDATE workspace_components SET version=version+1 WHERE id=$1',[tracker.id]);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByText('Interface changed; reopen it to review the current revision',{exact:true}).waitFor();assert.equal(await page.locator('iframe[title="Saved frontend code"]').count(),0);
 for(const name of ['Forms','Visualizations','Automations','Projects']){await page.getByRole('button',{name,exact:true}).click();}
 // Revoke the authenticated session while the browser still has a populated cache.
 await db.query('UPDATE local_accounts SET session_version=session_version+1 WHERE user_id=$1',[actor.userId]);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole('link',{name:/sign in/i}).first().waitFor();assert.equal(await page.getByRole('button',{name:'Database',exact:true}).count(),0);
 assert.deepEqual(exceptions,[]);console.log(JSON.stringify({passed:true,checks:['restricted SQL role and RLS on all app requests','real signup and cookie session','CSRF-backed routes','connected frame displays stored value','field revocation clears frame and source editor','revision recheck clears stale frame','resource navigation','session revocation clears app'],databaseRequests:timings},null,2));
}finally{await browser?.close();await new Promise<void>(r=>server.close(()=>r()));await pg.close();}
