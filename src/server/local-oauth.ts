import {randomBytes,randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import type {Database,Connection} from '../db/database.js';
import type {OAuthServerProvider} from '@modelcontextprotocol/sdk/server/auth/provider.js';
import {InvalidGrantError,InvalidRequestError,InvalidTokenError} from '@modelcontextprotocol/sdk/server/auth/errors.js';
import type {Assistant} from '../shared/schema.js';
export const token=()=>randomBytes(32).toString('base64url');
export const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
/** Path of the Claude-only MCP endpoint. ChatGPT keeps /mcp unchanged. */
export const CLAUDE_MCP_PATH='/claude/mcp';
export const REFRESH_GRACE_MS=30000;
// Claude Code signs in through a loopback callback on an ephemeral port (RFC 8252).
const loopback=(u:URL)=>u.protocol==='http:'&&(u.hostname==='localhost'||u.hostname==='127.0.0.1')&&!u.username&&!u.password&&!u.hash;
export function localOAuth(db:Database,base:string,legacyResource?:string):OAuthServerProvider{
 const resource=base+'/mcp',claudeResource=base+CLAUDE_MCP_PATH;
 // Only an explicitly configured previous URL for this same service is accepted.
 // It is never advertised or used as a redirect destination.
 const resources=new Set([resource,claudeResource]);
 if(legacyResource){const old=new URL(legacyResource);if(old.protocol!=='https:'||old.username||old.password||old.pathname!=='/mcp'||old.search||old.hash)throw Error('LEGACY_MCP_RESOURCE_URL must be an HTTPS MCP resource URL');resources.add(old.href);}
 const checkResource=(r?:URL)=>{if(r&&!resources.has(r.href))throw new InvalidRequestError('Wrong resource');};
 // The endpoint a token was issued for decides which assistant principal it is.
 // Requests without a resource keep the original ChatGPT behaviour.
 const assistantFor=(r?:string|null):Assistant=>r===claudeResource?'claude':'chatgpt';
 const get=async(id:string,kind:string)=>{const row=(await db.query('SELECT data FROM oauth_data WHERE id=$1 AND kind=$2 AND (expires_at IS NULL OR expires_at>$3)',[id,kind,Date.now()])).rows[0];if(!row)throw new InvalidGrantError('Invalid or expired authorization');return row.data;};
 const issue=async(tx:Connection,userId:string,clientId:string,family=randomUUID(),assistant:Assistant='chatgpt')=>{const access=token(),refresh=token(),bound=assistant==='claude'?claudeResource:null;for(const [value,kind,ttl] of [[access,'access',3600000],[refresh,'refresh',30*86400000]] as const)await tx.query('INSERT INTO oauth_tokens(hash,user_id,client_id,kind,family,expires_at,resource,assistant) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[hash(value),userId,clientId,kind,family,Date.now()+ttl,bound,assistant]);return {access_token:access,refresh_token:refresh,token_type:'Bearer',expires_in:3600,scope:'trialy'};};
 return {
 clientsStore:{getClient:async id=>{try{return await get(id,'client');}catch{return undefined;}},registerClient:async client=>{
  if(client.redirect_uris.length>10||client.redirect_uris.some(v=>{try{const u=new URL(v);return (u.protocol!=='https:'&&!loopback(u))||!!u.hash||!!u.username||!!u.password;}catch{return true;}}))throw new InvalidRequestError('Exact HTTPS or loopback callback URLs required');
  // Discovery advertises 'none' and 'client_secret_post'. ChatGPT registers public clients ('none'); other hosts such as
  // Claude may register with a secret, which the SDK issues and verifies at /token. PKCE stays mandatory for everyone.
  // Basic auth is not supported by the token endpoint, so it is rejected here instead of failing later.
  const method=client.token_endpoint_auth_method??(client.client_secret?'client_secret_post':'none');
  if(method!=='none'&&method!=='client_secret_post')throw new InvalidRequestError('Use token_endpoint_auth_method none or client_secret_post');
  if(method==='client_secret_post'&&!client.client_secret)throw new InvalidRequestError('Confidential registration requires an issued client secret');
  const data={...client,token_endpoint_auth_method:method,client_id:randomUUID(),client_id_issued_at:Math.floor(Date.now()/1000)};await db.query('INSERT INTO oauth_data VALUES($1,$2,NULL,$3)',[data.client_id,'client',JSON.stringify(data)]);return data;
 }},
 authorize:async(client,p,res)=>{checkResource(p.resource);if(!p.state||p.state.length>2048||!p.scopes?.includes('trialy')||p.scopes.some(s=>s!=='trialy')||!client.redirect_uris.includes(p.redirectUri)||!/^[A-Za-z0-9_-]{43}$/.test(p.codeChallenge))throw new InvalidRequestError('Invalid scope, state, callback or PKCE');const assistant=assistantFor(p.resource?.href);const ticket=token();await db.query('INSERT INTO oauth_data VALUES($1,$2,$3,$4)',[hash(ticket),'pending',Date.now()+600000,JSON.stringify({...p,resource:assistant==='claude'?claudeResource:resource,assistant,clientId:client.client_id,clientName:client.client_name??'Connected app'})]);res.redirect(base+'/auth/login?connect='+ticket);},
 challengeForAuthorizationCode:async(client,code)=>{const d=await get(hash(code),'code');if(d.clientId!==client.client_id)throw new InvalidGrantError('Wrong client');return d.codeChallenge;},
 exchangeAuthorizationCode:async(client,code,verifier,redirect,requested)=>db.transaction(async tx=>{checkResource(requested);const candidate=(await tx.query("SELECT data FROM oauth_data WHERE id=$1 AND kind='code'",[hash(code)])).rows[0]?.data;if(!candidate)throw new InvalidGrantError('Invalid code');await tx.query('SELECT user_id FROM local_accounts WHERE user_id=$1 FOR UPDATE',[candidate.userId]);const row=(await tx.query('DELETE FROM oauth_data WHERE id=$1 AND kind=$2 AND expires_at>$3 RETURNING data',[hash(code),'code',Date.now()])).rows[0];const d=row?.data;if(!d||d.clientId!==client.client_id||d.redirectUri!==redirect)throw new InvalidGrantError('Invalid code');const assistant:Assistant=d.assistant==='claude'?'claude':'chatgpt';if(requested&&assistantFor(requested.href)!==assistant)throw new InvalidGrantError('Code was issued for a different resource');if(verifier){const got=createHash('sha256').update(verifier).digest('base64url');if(got.length!==d.codeChallenge.length||!timingSafeEqual(Buffer.from(got),Buffer.from(d.codeChallenge)))throw new InvalidGrantError('Invalid verifier');}return issue(tx,d.userId,client.client_id,undefined,assistant);}),
 exchangeRefreshToken:async(client,value,scopes,requested)=>{checkResource(requested);if(scopes?.some(s=>s!=='trialy'))throw new InvalidGrantError('Invalid scope');const result=await db.transaction(async tx=>{const candidate=(await tx.query('SELECT user_id FROM oauth_tokens WHERE hash=$1',[hash(value)])).rows[0];if(!candidate)return null;await tx.query('SELECT user_id FROM local_accounts WHERE user_id=$1 FOR UPDATE',[candidate.user_id]);const r=(await tx.query("SELECT * FROM oauth_tokens WHERE hash=$1 AND client_id=$2 AND kind='refresh' FOR UPDATE",[hash(value),client.client_id])).rows[0];if(!r)return null;const assistant:Assistant=r.assistant==='claude'?'claude':'chatgpt';if(requested&&assistantFor(requested.href)!==assistant)return null;
  if(r.used_at){
   // Claude refreshes proactively and may send the same refresh token twice in parallel.
   // Within a short window the duplicate gets a fresh pair instead of revoking the connection.
   // ChatGPT tokens keep the original strict replay detection.
   if(assistant==='claude'&&Date.now()-Number(r.used_at)<REFRESH_GRACE_MS&&Number(r.expires_at)>Date.now()&&(await tx.query('SELECT 1 FROM oauth_tokens WHERE family=$1 LIMIT 1',[r.family])).rows.length)return issue(tx,r.user_id,client.client_id,r.family,assistant);
   await tx.query('DELETE FROM oauth_tokens WHERE family=$1',[r.family]);return null;
  }
  if(Number(r.expires_at)<=Date.now())return null;await tx.query('UPDATE oauth_tokens SET used_at=$1 WHERE hash=$2',[Date.now(),hash(value)]);return issue(tx,r.user_id,client.client_id,r.family,assistant);});if(!result)throw new InvalidGrantError('Reconnect your account');return result;},
 verifyAccessToken:async value=>{const r=(await db.query("SELECT * FROM oauth_tokens WHERE hash=$1 AND kind='access' AND expires_at>$2",[hash(value),Date.now()])).rows[0];if(!r)throw new InvalidTokenError('Reconnect your account');const assistant:Assistant=r.assistant==='claude'?'claude':'chatgpt';return {token:value,clientId:r.client_id,scopes:['trialy'],expiresAt:Math.floor(Number(r.expires_at)/1000),resource:new URL(assistant==='claude'?claudeResource:resource),extra:{userId:r.user_id,connectionFamily:r.family,assistant}};},
 revokeToken:async(client,p)=>{await db.query('DELETE FROM oauth_tokens WHERE family IN (SELECT family FROM oauth_tokens WHERE hash=$1 AND client_id=$2)',[hash(p.token),client.client_id]);}
 };
}
