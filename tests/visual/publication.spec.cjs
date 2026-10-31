const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
for(const embedded of [false,true])test(`Published ${embedded?'extension':'standalone'} stays separate from drafts and loads only approved updates`,async({page,context})=>{
 const f=await (await page.request.get(base+'/fixture/apps')).json();
 const call=async(name,args)=>{const r=await (await page.request.post(base+'/fixture/tool',{data:{name,arguments:args}})).json();expect(r.isError,JSON.stringify(r)).not.toBe(true);return r.structuredContent.result;};
 const source=title=>`const p=input.route?.path||'/';return {html:'<h1>${title}</h1><p>'+p+'</p><a href="/details">Details</a><a href="/">Overview</a><label>My notes<input aria-label="My notes"></label>'};`;
 const content={name:'Publication fixture '+embedded,sourceAccess:'bindings',format:'frontend-js',source:source('Published version'),bindings:[]};
 const initial=await call('prepare_workspace_change',{operation:{kind:'save_component',content}}),saved=await call('confirm_workspace_change',{previewId:initial.id,digest:initial.digest});
 const url=`/apps/${saved.id}?workspaceId=${f.workspaceId}&source=component`;
 await page.goto(base+(embedded?'/?apps=1':url));if(embedded){await page.waitForFunction(()=>window.hostReady);await page.evaluate(r=>window.deliver(r),await (await page.request.get(base+'/fixture/app-display?appId='+saved.id)).json());}
 const root=embedded?page.frameLocator('#app'):page,frame=root.frameLocator('iframe[title="Saved frontend code"]');
 await expect(frame.getByRole('heading',{name:'Published version',exact:true})).toBeVisible();
 const prepare=title=>call('prepare_workspace_change',{operation:{kind:'save_component',componentId:saved.id,expectedVersion:0,content:{...content,source:source(title)}}});
 const draft=await prepare('Draft version');
 const author=await context.newPage();await author.goto(base+`/apps/${draft.id}?workspaceId=${f.workspaceId}&source=preview`);
 await expect(author.frameLocator('iframe[title="Saved frontend code"]').getByRole('heading',{name:'Draft version',exact:true})).toBeVisible();await expect(author.locator('.ty-action-footer')).toHaveCSS('background-color','rgb(13, 19, 17)');
 const focus=()=>root.locator('.ty-workspace').evaluate(()=>window.dispatchEvent(new Event('focus')));
 await focus();await expect(frame.getByRole('heading',{name:'Published version',exact:true})).toBeVisible();await expect(root.locator('.ty-action-footer')).toHaveCount(0);await expect(root.getByRole('alert')).toHaveCount(0);
 await frame.getByRole('link',{name:'Details',exact:true}).click();await expect(frame.getByText('/details',{exact:true})).toBeVisible();await expect(root.getByRole('alertdialog')).toHaveCount(0);
 // Publishing a final revision is the only event that changes the live view.
 await call('confirm_workspace_change',{previewId:draft.id,digest:draft.digest});await focus();await expect(frame.getByRole('heading',{name:'Draft version',exact:true})).toBeVisible();await expect(frame.getByText('/details',{exact:true})).toBeVisible();await expect(root.getByRole('alert')).toHaveCount(0);
 // A real edit belongs only to this viewer and is never silently overwritten.
 await frame.getByRole('textbox',{name:'My notes',exact:true}).fill('Keep my local draft');
 const next=await call('prepare_workspace_change',{operation:{kind:'save_component',componentId:saved.id,expectedVersion:1,content:{...content,source:source('Final version')}}});await call('confirm_workspace_change',{previewId:next.id,digest:next.digest});await focus();
 await expect(root.getByRole('button',{name:'Load published update',exact:true})).toBeVisible();await expect(frame.getByRole('textbox',{name:'My notes',exact:true})).toHaveValue('Keep my local draft');
 await root.getByRole('button',{name:'Load published update',exact:true}).click();await expect(root.getByRole('alertdialog',{name:'Load published update',exact:true})).toBeVisible();await root.getByRole('button',{name:'Discard edits and load update',exact:true}).click();await expect(frame.getByRole('heading',{name:'Final version',exact:true})).toBeVisible();await expect(frame.getByRole('textbox',{name:'My notes',exact:true})).toHaveValue('');
 await frame.getByRole('link',{name:'Overview',exact:true}).click();await expect(frame.getByText('/',{exact:true})).toBeVisible();await expect(root.getByRole('alertdialog')).toHaveCount(0);
 await author.close();const archived=await call('prepare_workspace_change',{operation:{kind:'archive_component',componentId:saved.id,expectedVersion:2,archived:true}});await call('confirm_workspace_change',{previewId:archived.id,digest:archived.digest});
 await focus();await expect(root.getByRole('alert')).toContainText('archived');await expect(root.locator('iframe[title="Saved frontend code"]')).toHaveCount(0);
 // A revoked view is not an unsaved source-code edit.
 expect(await root.locator('.ty-workspace').evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});return !window.dispatchEvent(e);})).toBe(false);
});
