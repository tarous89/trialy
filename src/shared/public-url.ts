// Browser links can move independently of the established MCP/OAuth issuer.
// Keep the fallback argument for legacy callers' existing development defaults.
export function appPublicUrl(env:NodeJS.ProcessEnv=process.env,fallback='http://localhost:3000'){
 if(env.APP_PUBLIC_URL){
  const url=new URL(env.APP_PUBLIC_URL);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash||(env.NODE_ENV==='production'&&url.protocol!=='https:'))throw Error('APP_PUBLIC_URL must be a browser origin (HTTPS in production)');
  return url.origin;
 }
 return (env.PUBLIC_URL||env.RENDER_EXTERNAL_URL||fallback).replace(/\/$/,'');
}
