const base=require('@playwright/test');
const {createHash}=require('node:crypto');
// Model separate browser clients per scenario instead of exhausting one shared IP's real quota.
const test=base.test.extend({extraHTTPHeaders:async({},use,info)=>{
 const h=createHash('sha256').update(info.titlePath.join('/')).digest();
 await use({'X-Forwarded-For':`198.18.${h[0]}.${h[1]}`});
},
// A6: each test starts without pending app changes left by an earlier test (see /fixture/reset-pending).
// An automatic fixture, not a beforeEach in this module: a module runs once per worker, so a hook here would
// attach only to the first spec file that loads it.
resetPendingChanges:[async({request},use)=>{await request.post('http://127.0.0.1:4179/fixture/reset-pending').catch(()=>{});await use();},{auto:true}]});
async function openPlatform(page,url){await page.goto(url);if(page.viewportSize()?.width<760&&new URL(url).pathname==='/app-home'){await page.getByRole('button',{name:'Collapse navigation',exact:true}).click();}}
module.exports={...base,test,openPlatform};
