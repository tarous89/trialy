import {AsyncLocalStorage} from 'node:async_hooks';
export type RequestMetrics={queryCount:number;databaseMs:number;poolWaitMs:number;metadataHits:number};
const requests=new AsyncLocalStorage<RequestMetrics>();
export const requestMetrics=()=>requests.getStore();
export const withRequestMetrics=<T>(metrics:RequestMetrics,fn:()=>T):T=>requests.run(metrics,fn);
