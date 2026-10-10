import {createCipheriv,createDecipheriv,hkdfSync,randomBytes,randomUUID,createHash} from 'node:crypto';
import {generateSecret,verify} from 'otplib';
import type {Connection} from '../db/database.js';
import {fail} from '../shared/schema.js';
export const recoveryHash=(v:string)=>createHash('sha256').update(v.trim().toLowerCase()).digest('hex');
export function mfaCrypto(master:string){
 const key=Buffer.from(hkdfSync('sha256',master,'trialy','mfa-secret-v1',32));
 return {
  seal(secret:string,userId:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(userId));return Buffer.concat([iv,cipher.update(secret,'utf8'),cipher.final(),cipher.getAuthTag()]).toString('base64');},
  open(encoded:string,userId:string){const b=Buffer.from(encoded,'base64'),cipher=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));cipher.setAAD(Buffer.from(userId));cipher.setAuthTag(b.subarray(-16));return Buffer.concat([cipher.update(b.subarray(12,-16)),cipher.final()]).toString('utf8');}
 };
}
export async function consumeMfa(tx:Connection,account:any,code:string,crypto:ReturnType<typeof mfaCrypto>){
 if(!account.mfa_secret)return;
 if(/^[a-f0-9]{24}$/i.test(code.trim())){const digest=recoveryHash(code);if(!account.recovery_hashes.includes(digest))fail(401,'invalid_mfa','Authenticator or recovery code is invalid');await tx.query('UPDATE local_accounts SET recovery_hashes=$2 WHERE user_id=$1',[account.user_id,JSON.stringify(account.recovery_hashes.filter((h:string)=>h!==digest))]);await tx.query('INSERT INTO account_security_events(id,user_id,action) VALUES($1,$2,$3)',[randomUUID(),account.user_id,'recovery_code_used']);return;}
 if(!/^\d{6}$/.test(code))fail(401,'invalid_mfa','Enter an authenticator or recovery code');
 const result=await verify({secret:crypto.open(account.mfa_secret,account.user_id),token:code,epochTolerance:30,afterTimeStep:Number(account.mfa_last_step)});
 if(!result.valid||!('timeStep' in result))fail(401,'invalid_mfa','Authenticator code is invalid or already used; use a fresh code');
 await tx.query('UPDATE local_accounts SET mfa_last_step=$2 WHERE user_id=$1',[account.user_id,result.timeStep]);
}
export {generateSecret,verify};
