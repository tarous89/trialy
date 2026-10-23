/** The migration hook uses the deployment's owner URL. Long-running processes
 * connect with a separately provisioned, audited login and discard bootstrap values. */
export function runtimeConnection(env:NodeJS.ProcessEnv,kind:'web'|'worker'){
 const base=env.DATABASE_URL;if(!base)throw Error('DATABASE_URL required');
 const password=env.TRIALY_RUNTIME_PASSWORD;if(!password)return base;
 if(!/^[A-Za-z0-9_-]{43,128}$/.test(password))throw Error('Invalid runtime database secret configuration');
 const url=new URL(base);url.username=kind==='web'?'trialy_web_login':'trialy_worker_login';url.password=password;
 env.DATABASE_URL=url.toString();delete env.TRIALY_RUNTIME_PASSWORD;delete env.MIGRATION_DATABASE_URL;
 env.REQUIRE_RESTRICTED_DATABASE_ROLE='true';return url.toString();
}
