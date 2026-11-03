const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
for(const code of ['app_view_expired','app_view_incompatible'])for(const embedded of [false,true])test(`${code} navigation renews once and failed reads offer retry in ${embedded?'extension':'platform'}`,async({page})=>{
 const f=await(await page.request.get(base+'/fixture/apps')).json();
 await page.goto(base+(embedded?'/?apps=1':f.url));
 if(embedded){await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),await(await page.request.get(base+'/fixture/app-display?appId='+f.appId)).json());}
 const root=embedded?page.frameLocator('#app'):page,frame=root.frameLocator('iframe[title="Saved frontend code"]');
 await expect(frame.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
 let mode='expired',failed=0,renewed=0;
 await page.route(embedded?'**/fixture/tool':'**/organization/frontend/run',route=>{
  const b=route.request().postDataJSON();if(embedded&&b.name!=='run_component_frontend')return route.continue();const request=embedded?b.arguments.request:b;
  if(mode==='expired'&&!request.viewId){renewed++;return route.continue();}
  if(mode==='ok')return route.continue();failed++;const failureCode=mode==='expired'?code:'temporary',message=mode==='expired'?'This app session needs a refresh.':'Navigation temporarily unavailable';
  return route.fulfill({status:embedded?200:mode==='expired'?409:503,json:embedded?{isError:true,structuredContent:{error:{status:mode==='expired'?409:503,code:failureCode}},content:[{type:'text',text:message}]}:{error:failureCode,message}});
 });
 await frame.getByRole('link',{name:'Company',exact:true}).click();await expect(frame.getByRole('heading',{name:'Company',exact:true})).toBeVisible();expect(failed).toBe(1);expect(renewed).toBe(1);
 mode='temporary';await frame.getByRole('link',{name:'Overview',exact:true}).click();await expect(root.getByRole('button',{name:'Retry loading',exact:true})).toBeVisible();await expect(frame.getByRole('heading',{name:'Company',exact:true})).toBeVisible();
 mode='ok';await root.getByRole('button',{name:'Retry loading',exact:true}).click();await expect(frame.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();await expect(root.getByRole('button',{name:'Retry loading',exact:true})).toHaveCount(0);
});
