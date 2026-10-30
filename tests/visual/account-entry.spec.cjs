const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
async function checkBrand(page,width){
 await expect(page.locator('.ty-entry-brand')).toHaveText('TrialAgents');
 await expect(page.locator('.ty-entry-mark')).toBeVisible();
 expect(await page.locator('.ty-entry-mark').evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
 await page.evaluate(()=>document.fonts.ready);
}
for(const width of [1440,390])test(`Signed-out entry matches Intel auth styling at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 await page.route('**/api/me',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'unauthenticated'})}));
 await page.goto(base+'/app-home');
 await expect(page.getByRole('heading',{name:'Your projects. Your tools.'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Sign in to TrialAgents →',exact:true})).toHaveAttribute('href','/auth/login');
 await expect(page.getByRole('button',{name:'Open local demo',exact:true})).toHaveCount(0);
 await expect(page.locator('.brandmark')).toHaveCount(0);
 await expect(page.locator('.ty-entry-mark')).toHaveAttribute('src','/trialagents-mark-black.png');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
 await expect(page).toHaveScreenshot(`account-entry-${width}.png`);
});
for(const width of [1440,390])test(`Login and account creation use the shared auth design at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 await page.goto(base+'/auth/login');
 await checkBrand(page,width);
 await expect(page.getByRole('heading',{name:'Sign in to TrialAgents'})).toBeVisible();
 await expect(page.getByLabel('Password',{exact:true})).toHaveAttribute('autocomplete','current-password');
 await expect(page).toHaveScreenshot(`auth-login-${width}.png`);
 await page.getByRole('link',{name:'Create an account',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Create your TrialAgents account'})).toBeVisible();
 await expect(page.getByLabel('Password',{exact:true})).toHaveAttribute('autocomplete','new-password');
 await expect(page.getByRole('checkbox')).toHaveAttribute('required','');
 await checkBrand(page,width);
 await expect(page).toHaveScreenshot(`auth-signup-${width}.png`);
 await page.getByRole('link',{name:'Already registered? Sign in'}).click();
 await expect(page.getByRole('heading',{name:'Sign in to TrialAgents'})).toBeVisible();
});
test('Invalid sign-in keeps the shared design and retry flow',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/auth/login');
 await page.getByLabel('Email',{exact:true}).fill('missing-auth-test@example.invalid');
 await page.getByLabel('Password',{exact:true}).fill('synthetic-invalid-password');
 const response=page.waitForResponse(r=>r.url()===base+'/auth/login'&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 expect((await response).status()).toBe(401);
 await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.');
 await checkBrand(page,390);
 await expect(page).toHaveScreenshot('auth-error-390.png');
 await page.getByRole('link',{name:'Try again'}).click();
 await expect(page.getByRole('heading',{name:'Sign in to TrialAgents'})).toBeVisible();
});
test('Create account preserves app return after switching auth modes',async({page,request})=>{
 const fixture=await (await request.get(base+'/fixture/apps')).json();
 const destination=fixture.url;
 await page.goto(base+'/auth/login?returnTo='+encodeURIComponent(destination));
 await page.getByRole('link',{name:'Create an account',exact:true}).click();
 await page.getByLabel('Email',{exact:true}).fill('auth-app-return@example.invalid');
 await page.getByLabel('Password',{exact:true}).fill('synthetic-test-password');
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Create account',exact:true}).click();
 await expect(page).toHaveURL(base+destination);
 await expect(page.locator('.ty-app-watermark')).toBeVisible();
});
test('ChatGPT consent uses shared branding without weakening script or frame policy',async({page,request})=>{
 const {createHash}=require('node:crypto');
 const client=await (await request.post(base+'/register',{data:{client_name:'Synthetic ChatGPT',redirect_uris:['https://chatgpt.com/connector/oauth/synthetic'],token_endpoint_auth_method:'none',grant_types:['authorization_code','refresh_token'],response_types:['code']}})).json();
 const query=new URLSearchParams({response_type:'code',client_id:client.client_id,redirect_uri:'https://chatgpt.com/connector/oauth/synthetic',scope:'trialy',resource:base+'/mcp',state:'visual-consent-state',code_challenge:createHash('sha256').update('a'.repeat(43)).digest('base64url'),code_challenge_method:'S256'});
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/authorize?'+query);
 await page.getByRole('link',{name:'Create an account',exact:true}).click();
 await expect(page.getByText('After connecting, you will return to ChatGPT.')).toBeVisible();
 await page.getByLabel('Email',{exact:true}).fill('auth-consent@example.invalid');
 await page.getByLabel('Password',{exact:true}).fill('synthetic-consent-password');
 await page.getByRole('checkbox').check();
 const consent=page.waitForResponse(r=>r.url()===base+'/auth/consent'&&r.request().method()==='GET');
 await page.getByRole('button',{name:'Create account',exact:true}).click();
 const policy=(await consent).headers()['content-security-policy'];
 expect(policy).toContain("default-src 'none'");expect(policy).toContain("frame-ancestors 'none'");expect(policy).toContain("img-src 'self'");expect(policy).toContain("font-src 'self'");expect(policy).not.toContain('script-src');
 await expect(page.getByRole('heading',{name:'Connect TrialAgents'})).toBeVisible();
 await checkBrand(page,390);
 await expect(page).toHaveScreenshot('auth-consent-390.png');
 const callback='https://chatgpt.com/connector/oauth/synthetic?state=visual-consent-state&error=access_denied';
 // The fixture owns no external ChatGPT destination. Verify the real form POST's
 // callback response and stop at that boundary, without making an external request.
 await page.route('https://chatgpt.com/**',route=>route.abort());
 const decision=page.waitForResponse(r=>r.url()===base+'/auth/consent'&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 const result=await decision;expect(result.status()).toBe(303);expect(result.headers().location).toBe(callback);
});
