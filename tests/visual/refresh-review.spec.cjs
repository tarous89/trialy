const {test,expect,openPlatform}=require('./test.cjs');
const base='http://127.0.0.1:4179';
const gate=()=>{let release;const promise=new Promise(r=>release=r);return {promise,release};};
for(const denied of [false,true])test(`Access save retains its editor during schema refresh; ${denied?'revocation clears it':'temporary failure keeps the receipt'}`,async({page})=>{
 const held=gate();let schemas=0,writes=0;
 await page.route(/\/api\/workspaces\/[^/]+\/members$/,route=>{if(route.request().method()==='POST'){writes++;return route.fulfill({json:{ok:true}});}return route.fulfill({json:[{user_id:'30000000-0000-4000-8000-000000000099',name:'Review colleague',email:'review@example.invalid',role:'editor',hidden_fields:[],allowed_types:null,ai_enabled:false}]});});
 await page.route(/\/api\/workspaces\/[^/]+\/types$/,async route=>{if(++schemas!==2)return route.continue();await held.promise;await route.fulfill({status:denied?403:503,json:{message:denied?'Access revoked':'Temporary failure'}});});
 await openPlatform(page,base+'/app-home?access=1');
 const panel=page.getByRole('region',{name:'Database access',exact:true});await panel.getByRole('button',{name:'Edit access',exact:true}).click();await panel.getByRole('combobox').first().selectOption('viewer');
 await panel.evaluate(el=>window.reviewAccessPanel=el);
 await panel.getByRole('button',{name:'Save access',exact:true}).click();await expect.poll(()=>schemas).toBe(2);
 await expect(panel.getByRole('combobox').first()).toHaveValue('viewer');expect(await panel.evaluate(el=>el===window.reviewAccessPanel)).toBe(true);
 held.release();
 if(denied){await expect(panel).toHaveCount(0);await expect(page.getByRole('button',{name:'Retry loading tables',exact:true})).toBeVisible();}
 else{await expect(panel.getByRole('status')).toHaveText('Access updated.');await expect(page.getByRole('alert')).toContainText('Tables could not be refreshed. The previous view is still shown.');expect(await panel.evaluate(el=>el===window.reviewAccessPanel)).toBe(true);await page.getByRole('button',{name:'Retry loading tables',exact:true}).click();await expect.poll(()=>schemas).toBe(3);await expect(panel.getByRole('status')).toHaveText('Access updated.');}
 expect(writes).toBe(1);
});

// Exercise the actual shared hook with controlled transport completion order.
// No fixture write endpoints, production-only test switches or template changes.
let bundle;
async function homeHarness(page){
 bundle??=require('esbuild').buildSync({stdin:{contents:`
 import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
 import {useHomeData} from './src/shared/useHomeData.ts';
 import {withWorkspaceActivity,WorkspaceProgress} from './src/shared/WorkspaceActivity.tsx';
 window.reads=[];window.checks=[];
 const load=(_args,options)=>withWorkspaceActivity(()=>new Promise((resolve,reject)=>window.reads.push({resolve,reject,signal:options.signal,background:options.background})),options);
 const check=()=>new Promise((resolve,reject)=>window.checks.push({resolve,reject}));
 function App(){const [refresh,setRefresh]=useState(0),[active,setActive]=useState(true);const home=useHomeData('fixture',{query:''},refresh,active,load,check);return <><WorkspaceProgress/><button onClick={()=>setRefresh(n=>n+1)}>Finish mutation</button><button onClick={()=>setActive(v=>!v)}>Toggle Home</button><div data-testid="content">{home.data.resources.map(r=>r.name).join(',')}</div><div data-testid="loading">{String(home.loading)}</div></>;}createRoot(document.getElementById('root')).render(<App/>);
 `,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;
 await page.route('**/review-hook.js',r=>r.fulfill({contentType:'text/javascript',body:bundle}));
 await page.route('**/review-hook',r=>r.fulfill({contentType:'text/html',body:'<style>.ty-workspace-progress{height:3px}</style><div id="root"></div><script src="/review-hook.js"></script>'}));
 await page.clock.install();await page.goto(base+'/review-hook');await expect.poll(()=>page.evaluate(()=>window.reads.length)).toBe(1);
 await page.evaluate(()=>window.reads[0].resolve({resources:[{name:'Initial card'}],revision:'initial'}));await expect(page.getByTestId('content')).toHaveText('Initial card');
}
for(const completed of [false,true])for(const failure of [false,true])test(`An old idle check cannot supersede a mutation reload (completed=${completed}, failure=${failure})`,async({page})=>{
 await homeHarness(page);await page.clock.fastForward(30100);await expect.poll(()=>page.evaluate(()=>window.checks.length)).toBe(1);
 await page.getByRole('button',{name:'Finish mutation',exact:true}).click();await page.clock.runFor(250);await expect.poll(()=>page.evaluate(()=>window.reads.length)).toBe(2);
 const finish=async()=>{await page.evaluate(()=>window.reads[1].resolve({resources:[{name:'Updated card'}],revision:'new'}));await expect(page.getByTestId('content')).toHaveText('Updated card');};
 if(completed)await finish();else await expect(page.getByRole('progressbar')).toBeVisible();
 await page.evaluate(fail=>fail?window.checks[0].reject({status:403}):window.checks[0].resolve({revision:'old-check-change'}),failure);await page.clock.runFor(1200);
 expect(await page.evaluate(()=>window.reads.length)).toBe(2);expect(await page.evaluate(()=>window.reads[1].signal.aborted)).toBe(false);
 await expect(page.getByTestId('content')).toHaveText(completed?'Updated card':'Initial card');
 if(!completed){await expect(page.getByRole('progressbar')).toBeVisible();await finish();}
 await expect(page.getByRole('progressbar')).toHaveCount(0);
});
test('Re-enabling Home performs one full read even if it finishes before the return debounce',async({page})=>{
 await homeHarness(page);await page.getByRole('button',{name:'Toggle Home',exact:true}).click();await page.getByRole('button',{name:'Toggle Home',exact:true}).click();await page.clock.runFor(20);await expect.poll(()=>page.evaluate(()=>window.reads.length)).toBe(2);
 await page.evaluate(()=>window.reads[1].resolve({resources:[{name:'Returned card'}],revision:'initial'}));await expect(page.getByTestId('content')).toHaveText('Returned card');await page.clock.runFor(1200);expect(await page.evaluate(()=>window.reads.length)).toBe(2);
});
