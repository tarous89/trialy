import {AsyncLocalStorage} from 'node:async_hooks';
export const createRequestMetrics=()=>({
 queryCount:0,databaseMs:0,poolWaitMs:0,metadataHits:0,
 databaseRoundTrips:0,postgresMs:0,transactions:0,contextSets:0,sessionQueries:0,sessionMs:0,
 sessionTouchesCoalesced:0,sessionTouchWrites:0,sessionTouchNoops:0,
 sandboxRuns:0,sandboxStartupMs:0,sandboxMs:0,capabilityCalls:0,capabilityMs:0,capabilityBytes:0,runtimeBusy:0,
});
export type RequestMetrics=ReturnType<typeof createRequestMetrics>;
const requests=new AsyncLocalStorage<RequestMetrics>();
export const requestMetrics=()=>requests.getStore();
export const withRequestMetrics=<T>(metrics:RequestMetrics,fn:()=>T):T=>requests.run(metrics,fn);
/** Count driver query calls, including transaction/context/session overhead. Never retain SQL or parameters. */
export async function measureDatabaseQuery<T>(metrics:RequestMetrics|undefined,query:()=>Promise<T>,session=false):Promise<T>{
 if(!metrics)return query();
 const started=performance.now();metrics.databaseRoundTrips++;if(session)metrics.sessionQueries++;
 try{return await query();}finally{const elapsed=performance.now()-started;metrics.postgresMs+=elapsed;if(session)metrics.sessionMs+=elapsed;}
}
export const metricSummary=(metrics:RequestMetrics)=>Object.fromEntries(Object.entries(metrics).map(([key,value])=>[key,key.endsWith('Ms')?Math.round(value):value]));
