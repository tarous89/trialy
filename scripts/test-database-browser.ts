/** Production application component with synthetic transport; real permission/transaction tests in database-viewer.test.ts. */
import {createServer} from 'vite';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_IMPORT!),server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();const base=server.resolvedUrls!.local[0];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(15000);const errors:string[]=[];page.on('pageerror',(e:Error)=>errors.push(e.message));
 const fields=[{key:'name',name:'Company',kind:'text',readable:true,writable:true},{key:'status',name:'Status',kind:'select',options:['Active','Pending'],readable:true,writable:true},{key:'source',name:'Source',kind:'text',readable:true,writable:true}];
 let rows=[{id:'r1',version:0,data:{name:'Example biotech',status:'Active',source:'Long evidence paragraph. '.repeat(100)}},{id:'r2',version:0,data:{name:'Second company',status:'Pending',source:'User supplied'}}];let proposal:any,prepared=0,saved=0,canEdit=true;const requests:string[]=[];
 await page.route('**/api/**',async(route:any)=>{const path=new URL(route.request().url()).pathname;requests.push(path);let body:any=[];
  if(path==='/api/me')body={csrf:'fixture',user:{id:'u1',name:'Example user'},workspaces:[{id:'private',name:'Private'},{id:'shared',name:'Connected account'}]};
  else if(path==='/api/config')body={brand:'TrialAgents'};
  else if(path.endsWith('/home'))body={projects:[],resources:[],total:0,nextOffset:null};
  else if(path.endsWith('/organization'))body={nodes:[]};
  else if(path.endsWith('/schema'))body={tables:[{id:'table',name:'Companies',fields,readable:true}],nextOffset:null};
  else if(path.endsWith('/database'))body={table:{id:'table',name:'Companies',fields},canEdit,rows,total:rows.length,nextOffset:null,schemaOnly:false};
  else if(path.endsWith('/previews')&&route.request().method()==='POST'){proposal=route.request().postDataJSON();prepared++;body={id:'preview',digest:'a'.repeat(64)};}
  else if(path.endsWith('/commit')){saved++;for(const u of proposal.updates){const row=rows.find(r=>r.id===u.recordId)!;assert.equal(row.version,u.expectedVersion);row.data={...row.data,...u.data};row.version++;}rows=rows.filter(r=>!proposal.deletions.some((d:any)=>d.recordId===r.id));body={status:'saved'};}
  await route.fulfill({json:body});
 });
 await page.goto(base+'?workspaceId=shared&tab=database');await page.getByRole('heading',{name:'Companies',exact:true}).waitFor();assert.ok(requests.some(p=>p.includes('/workspaces/shared/')));assert.ok(!requests.some(p=>p.includes('/workspaces/private/')));
 assert.equal(await page.getByRole('switch',{name:'Allow edits'}).isChecked(),false);assert.equal(await page.getByRole('button',{name:'Edit Company in row r1'}).count(),0);
 assert.equal(await page.locator('.ty-db-tree').getByRole('button',{name:/Access/}).count(),0);
 assert.equal(await page.locator('.ty-db-toolbar').getByRole('button',{name:'Access · Companies',exact:true}).count(),1);
 assert.equal(await page.locator('.ty-db-grid thead').getByRole('button',{name:/Access/}).count(),0);
 const cell=page.getByRole('button',{name:'Expand Source in row r1'});assert.ok((await cell.boundingBox())!.height<=42);
 const rowBox=await cell.locator('xpath=..').boundingBox();assert.ok(rowBox!.height<80);
 await cell.click();const expanded=page.getByRole('button',{name:'Collapse Source in row r1'});assert.ok((await expanded.boundingBox())!.height>42);await expanded.press('Escape');await cell.waitFor();
 await cell.focus();await cell.press('Enter');await expanded.waitFor();await expanded.click();
 await page.getByRole('switch',{name:'Allow edits'}).check();await page.getByRole('button',{name:'Edit Company in row r1'}).click();await page.getByRole('textbox',{name:'Company',exact:true}).fill('Edited biotech');await page.getByRole('button',{name:'Done',exact:true}).click();assert.equal(prepared,0);assert.equal(saved,0);assert.equal(rows[0].data.name,'Example biotech');assert.equal(await page.locator('.ty-db-changed').evaluate((el:any)=>getComputedStyle(el).backgroundColor),'rgb(220, 243, 227)');
 await page.getByRole('button',{name:'Ignore changes'}).click();await page.getByRole('button',{name:'Edit Company in row r1'}).waitFor();assert.equal(await page.getByRole('button',{name:'Edit Company in row r1'}).innerText(),'Example biotech');
 await page.getByRole('button',{name:'Edit Company in row r1'}).click();await page.getByRole('textbox',{name:'Company',exact:true}).fill('Edited biotech');await page.getByRole('button',{name:'Done',exact:true}).click();await page.getByRole('checkbox',{name:'Select row r2',exact:true}).check();await page.getByRole('button',{name:'Delete selected'}).click();await page.getByText('Will be deleted',{exact:true}).waitFor();assert.equal(saved,0);
 await mkdir('/tmp/trialy017-qa',{recursive:true});await page.screenshot({path:'/tmp/trialy017-qa/database-edit.png',fullPage:true});
 await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByText('Changes saved to the shared database.',{exact:true}).waitFor();assert.equal(saved,1);assert.equal(prepared,1);assert.equal(rows.length,1);assert.equal(rows[0].data.name,'Edited biotech');assert.equal(await page.getByRole('switch',{name:'Allow edits'}).isChecked(),false);
 const colors=await page.getByRole('row').filter({hasText:'Edited biotech'}).locator('td').evaluateAll((els:any[])=>els.map(el=>getComputedStyle(el).color));assert.equal(new Set(colors).size,1,'Database content stays neutral');await page.screenshot({path:'/tmp/trialy017-qa/database.png',fullPage:true});
 canEdit=false;await page.getByRole('button',{name:'Refresh database'}).click();await page.waitForFunction(()=>document.querySelector<HTMLInputElement>('[role="switch"][aria-label="Allow edits"]')?.disabled);assert.equal(await page.getByRole('switch',{name:'Allow edits'}).isDisabled(),true);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const headingBox=await page.locator('.ty-db-heading').boundingBox(),noticeBox=await page.getByRole('status').filter({hasText:'Changes saved'}).boundingBox();assert.ok(headingBox&&noticeBox&&headingBox.y+headingBox.height<=noticeBox.y,'Mobile heading must not overlap status');await page.screenshot({path:'/tmp/trialy017-qa/database-mobile.png',fullPage:true});
 await page.goto(base+'?workspaceId=unavailable');await page.getByRole('alert').filter({hasText:'This account cannot access'}).waitFor();assert.equal(await page.getByRole('heading',{name:'Companies',exact:true}).count(),0);
 assert.deepEqual(errors,[]);console.log('Database: context handoff, read-only default, owner toggle, staged edits/deletions, discard/save, neutral content, revocation and mobile passed.');
}finally{await browser.close();await server.close();}

