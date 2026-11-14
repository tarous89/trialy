const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
for(const embedded of [false,true])test(`busy navigation retries without replaying actions in ${embedded?'extension':'platform'}`,async({page})=>{
 const f=await(await page.request.get(base+'/fixture/apps')).json();
 await page.goto(base+(embedded?'/?apps=1':f.url));
 if(embedded){await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),await(await page.request.get(base+'/fixture/app-display?appId='+f.appId)).json());}
 const root=embedded?page.frameLocator('#app'):page,frame=root.frameLocator('iframe[title="Saved frontend code"]');
 await expect(frame.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
 let navigation=0,actions=0;
 await page.route(embedded?'**/fixture/tool':'**/organization/frontend/run',route=>{
  const b=route.request().postDataJSON();if(embedded&&b.name!=='run_component_frontend')return route.continue();const request=embedded?b.arguments.request:b;
  if(request.event.kind==='open'){if(++navigation>2)return route.continue();}else actions++;
  return route.fulfill({status:embedded?200:429,json:embedded?{isError:true,structuredContent:{error:{status:429,code:'runtime_busy'}},content:[{type:'text',text:'This interface is busy; try again shortly'}]}:{error:'runtime_busy',message:'This interface is busy; try again shortly'}});
 });
 await frame.getByRole('link',{name:'Company',exact:true}).click();await expect(frame.getByRole('heading',{name:'Company',exact:true})).toBeVisible();expect(navigation).toBe(3);
 await frame.getByRole('button',{name:'Rename company',exact:true}).click();await expect(root.getByText('This interface is busy; try again shortly',{exact:true})).toBeVisible();expect(actions).toBe(1);
 await expect(frame.getByRole('heading',{name:'Company',exact:true})).toBeVisible();
});
