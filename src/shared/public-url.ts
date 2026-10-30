export const PLATFORM_ORIGIN='https://platform.trialagents.com';
// Explicit deployment configuration wins; the production fallback is our own domain.
export function oauthPublicUrl(env:NodeJS.ProcessEnv=process.env,fallback=env.NODE_ENV==='production'?PLATFORM_ORIGIN:'http://localhost:3000'){
 const url=new URL(env.PUBLIC_URL||env.RENDER_EXTERNAL_URL||fallback);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash||(env.NODE_ENV==='production'&&url.protocol!=='https:'))throw Error('PUBLIC_URL must be an origin (HTTPS in production)');
 return url.origin;
}
// Keep the browser override for deployments with intentionally separate frontends.
export function appPublicUrl(env:NodeJS.ProcessEnv=process.env,fallback=env.NODE_ENV==='production'?PLATFORM_ORIGIN:'http://localhost:3000'){
 if(env.APP_PUBLIC_URL){
  const url=new URL(env.APP_PUBLIC_URL);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash||(env.NODE_ENV==='production'&&url.protocol!=='https:'))throw Error('APP_PUBLIC_URL must be a browser origin (HTTPS in production)');
  return url.origin;
 }
 return oauthPublicUrl(env,fallback);
}
