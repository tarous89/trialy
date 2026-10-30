const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
test('Catalog starter apps render and respond inside the extension',async({page})=>{
 const fixture=await (await page.request.get(base+'/fixture/apps')).json();
 const post=async(path,data)=>{const response=await page.request.post(base+path,{data});expect(response.ok()).toBeTruthy();return response.json();};
 for(const templateId of ['simple.calculator','simple.checklist']){
  const template=await post('/api/app-templates/read',{templateId});
  const draft=await post('/api/workspaces/'+fixture.workspaceId+'/apps/from-template',{templateId,version:template.version,digest:template.digest,name:template.name});
  await page.goto(base+'/?apps=1');await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),draft);
  const root=page.frameLocator('#app'),app=root.frameLocator('iframe[title="Saved frontend code"]');
  await expect(app.getByRole('heading',{name:template.defaults.heading,exact:true})).toBeVisible();
  if(templateId==='simple.calculator'){
   await app.getByLabel('Quantity').fill('3');await app.getByLabel('Unit cost').fill('8');await app.getByRole('button',{name:'Calculate',exact:true}).click();await expect(app.getByRole('heading',{name:'EUR 24.00',exact:true})).toBeVisible();
  }else{
   await app.getByLabel('Define the objective').check();await app.getByRole('button',{name:'Update progress',exact:true}).click();await expect(app.getByRole('heading',{name:'1 / 3',exact:true})).toBeVisible();await expect(app.getByLabel('Define the objective')).toBeChecked();
  }
  await root.getByRole('button',{name:'Discard app',exact:true}).click();await expect(root.getByRole('heading',{name:'Home',exact:true})).toBeVisible();
 }
});
