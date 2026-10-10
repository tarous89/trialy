import type { Express, Request, RequestHandler } from 'express';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import * as oidc from 'openid-client';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { randomBytes } from 'node:crypto';
import type { Postgres } from '../db/database.js';
import type { Actor } from '../shared/schema.js';
import { fail } from '../shared/schema.js';
declare module 'express-session' {interface SessionData {userId:string;csrf:string;oidc?:{verifier:string;state:string;nonce:string}}}
declare global {namespace Express {interface Request {actor?:Actor}}}
import { upsertIdentity } from './identity.js';
export function configureAuth(app:Express,db:Postgres,env:NodeJS.ProcessEnv) {
 const url=new URL(env.PUBLIC_URL??'http://localhost:3000');const production=env.NODE_ENV==='production';
 const demo=env.LOCAL_DEMO==='true';
 if(demo&&(production||!['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('LOCAL_DEMO requires a loopback development origin');
 if(!env.SESSION_SECRET||env.SESSION_SECRET.length<32)throw new Error('SESSION_SECRET must have at least 32 characters');
 if(production&&url.protocol!=='https:')throw new Error('Production PUBLIC_URL must use HTTPS');
 if(env.OIDC_ISSUER&&env.MCP_ISSUER&&env.OIDC_ISSUER!==env.MCP_ISSUER)throw new Error('OIDC_ISSUER and MCP_ISSUER must use the same exact issuer');
 if(production)app.set('trust proxy',1);
 const PgStore=connectPg(session);
 app.use(session({name:'trialy_session',secret:env.SESSION_SECRET,store:new PgStore({pool:db.pool,tableName:'session',createTableIfMissing:false}),resave:false,saveUninitialized:false,cookie:{httpOnly:true,secure:production,sameSite:'lax',maxAge:8*3600000}}));
 let configPromise:Promise<oidc.Configuration>|undefined;
 const config=()=>{if(!env.OIDC_ISSUER||!env.OIDC_CLIENT_ID)fail(503,'auth_unconfigured','Sign-in provider is not configured');return configPromise??=oidc.discovery(new URL(env.OIDC_ISSUER),env.OIDC_CLIENT_ID,env.OIDC_CLIENT_SECRET);};
 app.get('/auth/login',async(req,res)=>{
  const c=await config(), verifier=oidc.randomPKCECodeVerifier(),state=oidc.randomState(),nonce=oidc.randomNonce();req.session.oidc={verifier,state,nonce};
  const destination=oidc.buildAuthorizationUrl(c,{redirect_uri:new URL('/auth/callback',url).href,scope:'openid profile email',code_challenge:await oidc.calculatePKCECodeChallenge(verifier),code_challenge_method:'S256',state,nonce});
  req.session.save(e=>{if(e){res.status(503).send('Sign-in unavailable');return;}res.redirect(destination.href);});
 });
 app.get('/auth/callback',async(req,res)=>{
  const pending=req.session.oidc;if(!pending)fail(400,'login_expired','Please restart sign-in');delete req.session.oidc;
  const tokens=await oidc.authorizationCodeGrant(await config(),new URL(req.originalUrl,url),{pkceCodeVerifier:pending.verifier,expectedState:pending.state,expectedNonce:pending.nonce,idTokenExpected:true});
  const claims=tokens.claims();if(!claims)fail(401,'invalid_identity','Identity could not be verified');
  const uid=await upsertIdentity(db,env.OIDC_ISSUER!,claims.sub,String(claims.email??''),String(claims.name??'User'));
  await new Promise<void>((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));req.session.userId=uid;req.session.csrf=randomBytes(32).toString('hex');req.session.save(e=>{if(e){res.status(503).send('Sign-in unavailable');return;}res.redirect('/');});
 });
 app.post('/auth/logout',(req,res)=>{if(!req.session.csrf||req.get('x-csrf-token')!==req.session.csrf)fail(403,'csrf','Refresh and retry');req.session.destroy(()=>{res.clearCookie('trialy_session');res.json({ok:true});});});
 if(demo)app.post('/auth/demo',async(req,res)=>{
  if(req.get('origin')!==url.origin||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress??''))fail(403,'local_only','Local demo only');
  const uid=await upsertIdentity(db,'local','demo','demo@example.invalid','Demo user');await new Promise<void>((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));req.session.userId=uid;req.session.csrf=randomBytes(32).toString('hex');req.session.save(e=>{if(e){res.status(503).end();return;}res.json({ok:true});});
 });
 const human:RequestHandler=(req,_res,next)=>{if(!req.session.userId)fail(401,'unauthenticated','Sign in to Trialy');if(!['GET','HEAD','OPTIONS'].includes(req.method)&&(!req.session.csrf||req.get('x-csrf-token')!==req.session.csrf))fail(403,'csrf','Refresh and retry');req.actor={userId:req.session.userId,origin:'human'};next();};
 const jwks=env.MCP_JWKS_URL?createRemoteJWKSet(new URL(env.MCP_JWKS_URL)):undefined;
 const ai:RequestHandler=async(req,res,next)=>{
  if(!jwks||!env.MCP_ISSUER||!env.MCP_AUDIENCE)fail(503,'mcp_auth_unconfigured','MCP authentication is not configured');
  res.set('Cache-Control','no-store');
  const challenge=`Bearer resource_metadata="${url.origin}/.well-known/oauth-protected-resource"`;
  const token=req.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token){res.set('WWW-Authenticate',`Bearer resource_metadata="${url.origin}/.well-known/oauth-protected-resource"`);fail(401,'unauthenticated','Connect your Trialy account');}
  let claims;try{claims=(await jwtVerify(token,jwks,{issuer:env.MCP_ISSUER,audience:env.MCP_AUDIENCE,algorithms:['RS256','ES256'],requiredClaims:['sub','exp','iat']})).payload;}catch{res.set('WWW-Authenticate',challenge);fail(401,'invalid_token','Connect your Trialy account again');}
  if(!claims.sub||!String(claims.scope??'').split(' ').includes(env.MCP_SCOPE??'trialy'))fail(403,'insufficient_scope','Required scope is missing');
  if(claims.gty==='client-credentials'||claims.sub.endsWith('@clients'))fail(403,'user_required','Connect with a personal Trialy identity');
  // First connection creates the same account used by standalone sign-in. No web detour.
  const uid=await upsertIdentity(db,env.MCP_ISSUER,claims.sub);
  req.actor={userId:uid,origin:'ai'};next();
 };
 app.get('/.well-known/oauth-protected-resource',(_req,res)=>res.json({resource:env.MCP_AUDIENCE??`${url.origin}/mcp`,authorization_servers:env.MCP_ISSUER?[env.MCP_ISSUER]:[],scopes_supported:[env.MCP_SCOPE??'trialy']}));
 return {human,ai};
}
