const base=require('@playwright/test');
const {createHash}=require('node:crypto');
// Model separate browser clients per scenario instead of exhausting one shared IP's real quota.
const test=base.test.extend({extraHTTPHeaders:async({},use,info)=>{
 const h=createHash('sha256').update(info.titlePath.join('/')).digest();
 await use({'X-Forwarded-For':`198.18.${h[0]}.${h[1]}`});
}});
module.exports={...base,test};
